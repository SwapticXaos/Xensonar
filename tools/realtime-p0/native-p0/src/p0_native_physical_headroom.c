#define _POSIX_C_SOURCE 200809L
#include <errno.h>
#include <math.h>
#include <stdatomic.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#include "p0_native_audio_driver.h"
#include "p0_native_null_driver.h"
#ifdef P0N_HAVE_PIPEWIRE
#include "p0_native_pipewire_driver.h"
#endif

#define P0N_HR_SAMPLE_RATE 48000u
#define P0N_HR_REQUEST_BLOCK 128u
#define P0N_HR_CHANNELS 2u
#define P0N_HR_TABLE_SIZE 4096u
#define P0N_HR_MAX_BODIES 64u
#define P0N_HR_MAX_SAMPLES 8192u
#define P0N_HR_WARMUP_MS 500u
#define P0N_HR_PHYSICAL_MEASURE_MS 5000u
#define P0N_HR_NULL_MEASURE_MS 700u
#define P0N_HR_PI2 6.283185307179586476925286766559

typedef struct {
  double phase;
  double increment;
  float env;
  float b0,b1,b2,a1,a2;
  float z1,z2;
} P0NStressBody;

typedef struct {
  uint32_t sample_rate;
  unsigned body_count;
  P0NStressBody bodies[P0N_HR_MAX_BODIES];
  float table[P0N_HR_TABLE_SIZE];
  atomic_int measuring;
  atomic_uint sample_write;
  atomic_ullong callback_count;
  atomic_ullong measured_callbacks;
  atomic_ullong budget_misses;
  atomic_ullong nonzero_frames;
  uint64_t samples[P0N_HR_MAX_SAMPLES];
  double render_sum_ns;
  float peak;
  volatile float sink;
} P0NHeadroomContext;

static uint64_t p0n_hr_now_ns(void) {
  struct timespec ts;
  clock_gettime(CLOCK_MONOTONIC_RAW,&ts);
  return (uint64_t)ts.tv_sec*1000000000ull+(uint64_t)ts.tv_nsec;
}

static void p0n_hr_sleep_ms(unsigned ms) {
  struct timespec req={(time_t)(ms/1000u),(long)((ms%1000u)*1000000u)};
  while(nanosleep(&req,&req)!=0 && errno==EINTR) {}
}

static int p0n_hr_cmp_u64(const void* a,const void* b) {
  uint64_t x=*(const uint64_t*)a,y=*(const uint64_t*)b;
  return x<y?-1:x>y?1:0;
}

static void p0n_hr_lowpass(float* b0,float* b1,float* b2,float* a1,float* a2) {
  double w=P0N_HR_PI2*2400.0/(double)P0N_HR_SAMPLE_RATE;
  double cs=cos(w);
  double alpha=sin(w)/(2.0*pow(10.0,1.0/20.0));
  double z=1.0+alpha;
  *b0=(float)(((1.0-cs)/2.0)/z);
  *b1=(float)((1.0-cs)/z);
  *b2=*b0;
  *a1=(float)((-2.0*cs)/z);
  *a2=(float)((1.0-alpha)/z);
}

static void p0n_hr_init(P0NHeadroomContext* c,unsigned body_count) {
  memset(c,0,sizeof(*c));
  c->sample_rate=P0N_HR_SAMPLE_RATE;
  c->body_count=body_count;
  atomic_init(&c->measuring,0);
  atomic_init(&c->sample_write,0u);
  atomic_init(&c->callback_count,0u);
  atomic_init(&c->measured_callbacks,0u);
  atomic_init(&c->budget_misses,0u);
  atomic_init(&c->nonzero_frames,0u);
  for(unsigned i=0;i<P0N_HR_TABLE_SIZE;++i)
    c->table[i]=sinf((float)(P0N_HR_PI2*(double)i/(double)P0N_HR_TABLE_SIZE));
  float b0,b1,b2,a1,a2;
  p0n_hr_lowpass(&b0,&b1,&b2,&a1,&a2);
  for(unsigned i=0;i<body_count;++i) {
    P0NStressBody* v=&c->bodies[i];
    double hz=82.406889+(double)(i%24u)*11.731+(double)(i/24u)*3.17;
    v->increment=hz*(double)P0N_HR_TABLE_SIZE/(double)P0N_HR_SAMPLE_RATE;
    v->phase=(double)((i*197u)&(P0N_HR_TABLE_SIZE-1u));
    v->env=0.0010f+(float)(i%7u)*0.00008f;
    v->b0=b0;v->b1=b1;v->b2=b2;v->a1=a1;v->a2=a2;
  }
}

static inline float p0n_hr_wavetable(P0NHeadroomContext* c,double phase) {
  uint32_t i0=(uint32_t)phase;
  uint32_t i1=(i0+1u)&(P0N_HR_TABLE_SIZE-1u);
  float frac=(float)(phase-(double)i0);
  return c->table[i0]+(c->table[i1]-c->table[i0])*frac;
}

static void p0n_hr_render(float* output,uint32_t frames,void* userdata) {
  P0NHeadroomContext* c=(P0NHeadroomContext*)userdata;
  uint64_t begin=p0n_hr_now_ns();
  float peak=c->peak;
  uint64_t nonzero=0u;
  float checksum=0.0f;
  for(uint32_t f=0;f<frames;++f) {
    float mix=0.0f;
    for(unsigned i=0;i<c->body_count;++i) {
      P0NStressBody* v=&c->bodies[i];
      float x=p0n_hr_wavetable(c,v->phase);
      v->phase+=v->increment;
      if(v->phase>=(double)P0N_HR_TABLE_SIZE)v->phase-=(double)P0N_HR_TABLE_SIZE;
      float y=v->b0*x+v->z1;
      v->z1=v->b1*x-v->a1*y+v->z2;
      v->z2=v->b2*x-v->a2*y;
      mix+=y*v->env;
    }
    if(fabsf(mix)>1.0e-12f)++nonzero;
    float a=fabsf(mix);if(a>peak)peak=a;
    output[f*2u]=mix;
    output[f*2u+1u]=mix;
    checksum+=mix*0.000001f;
  }
  c->sink+=checksum;
  c->peak=peak;
  atomic_fetch_add_explicit(&c->callback_count,1u,memory_order_relaxed);
  if(atomic_load_explicit(&c->measuring,memory_order_acquire)) {
    uint64_t elapsed=p0n_hr_now_ns()-begin;
    uint64_t quantum=((uint64_t)frames*1000000000ull)/c->sample_rate;
    uint32_t at=atomic_fetch_add_explicit(&c->sample_write,1u,memory_order_relaxed);
    if(at<P0N_HR_MAX_SAMPLES)c->samples[at]=elapsed;
    atomic_fetch_add_explicit(&c->measured_callbacks,1u,memory_order_relaxed);
    atomic_fetch_add_explicit(&c->nonzero_frames,nonzero,memory_order_relaxed);
    if(elapsed>quantum)atomic_fetch_add_explicit(&c->budget_misses,1u,memory_order_relaxed);
    c->render_sum_ns+=(double)elapsed;
  }
}

static int p0n_hr_run_scenario(P0NAudioDriver driver,unsigned bodies,unsigned measure_ms,int physical_audio) {
  P0NHeadroomContext c;
  p0n_hr_init(&c,bodies);
  P0NAudioFormat requested={P0N_HR_SAMPLE_RATE,P0N_HR_CHANNELS,P0N_HR_REQUEST_BLOCK,driver.name};
  if(!driver.prepare(&driver,&requested,p0n_hr_render,&c)) {
    fprintf(stderr,"headroom driver prepare failed bodies=%u\n",bodies);
    if(driver.destroy)driver.destroy(&driver);
    return 2;
  }
  if(!driver.start(&driver)) {
    fprintf(stderr,"headroom driver start failed bodies=%u\n",bodies);
    if(driver.destroy)driver.destroy(&driver);
    return 3;
  }
  p0n_hr_sleep_ms(P0N_HR_WARMUP_MS);
  P0NAudioFormat actual={0};
  P0NCallbackObservation before={0},after={0};
  int have_format=driver.query_format&&driver.query_format(&driver,&actual);
  int have_before=driver.query_last_observation&&driver.query_last_observation(&driver,&before);
  atomic_store_explicit(&c.sample_write,0u,memory_order_release);
  atomic_store_explicit(&c.measured_callbacks,0u,memory_order_release);
  atomic_store_explicit(&c.budget_misses,0u,memory_order_release);
  atomic_store_explicit(&c.nonzero_frames,0u,memory_order_release);
  c.render_sum_ns=0.0;
  c.peak=0.0f;
  atomic_store_explicit(&c.measuring,1,memory_order_release);
  uint64_t wall_begin=p0n_hr_now_ns();
  p0n_hr_sleep_ms(measure_ms);
  uint64_t wall_end=p0n_hr_now_ns();
  atomic_store_explicit(&c.measuring,0,memory_order_release);
  p0n_hr_sleep_ms(20u);
  int have_after=driver.query_last_observation&&driver.query_last_observation(&driver,&after);
  if(driver.stop)driver.stop(&driver);

  uint32_t stored=atomic_load_explicit(&c.sample_write,memory_order_acquire);
  if(stored>P0N_HR_MAX_SAMPLES)stored=P0N_HR_MAX_SAMPLES;
  qsort(c.samples,stored,sizeof(c.samples[0]),p0n_hr_cmp_u64);
  uint64_t p50=stored?c.samples[stored/2u]:0u;
  uint64_t p95=stored?c.samples[(stored*95u)/100u]:0u;
  uint64_t p99=stored?c.samples[(stored*99u)/100u]:0u;
  uint64_t max=stored?c.samples[stored-1u]:0u;
  uint64_t callback_delta=(have_before&&have_after&&after.callback_index>=before.callback_index)?after.callback_index-before.callback_index:0u;
  uint64_t xrun_delta=(have_before&&have_after&&after.underrun_count>=before.underrun_count)?after.underrun_count-before.underrun_count:UINT64_MAX;
  uint64_t error_delta=(have_before&&have_after&&after.process_error_count>=before.process_error_count)?after.process_error_count-before.process_error_count:UINT64_MAX;
  uint64_t quantum_frames=have_format&&actual.block_frames?actual.block_frames:P0N_HR_REQUEST_BLOCK;
  uint64_t quantum_ns=(quantum_frames*1000000000ull)/P0N_HR_SAMPLE_RATE;
  uint64_t expected_frames=((uint64_t)P0N_HR_SAMPLE_RATE*measure_ms)/1000ull;
  uint64_t min_callbacks=quantum_frames?expected_frames/quantum_frames:1u;
  if(min_callbacks<1u)min_callbacks=1u;
  uint64_t measured=atomic_load_explicit(&c.measured_callbacks,memory_order_acquire);
  uint64_t budget_misses=atomic_load_explicit(&c.budget_misses,memory_order_acquire);
  uint64_t nonzero_frames=atomic_load_explicit(&c.nonzero_frames,memory_order_acquire);
  double wall_ns=(double)(wall_end-wall_begin);
  double busy_pct=wall_ns>0.0?c.render_sum_ns*100.0/wall_ns:0.0;
  int format_ok=have_format&&actual.sample_rate==P0N_HR_SAMPLE_RATE&&actual.channels==2u&&actual.block_frames>0u;
  int callbacks_seen=have_before&&have_after&&callback_delta>0u;
  int physical_cadence_ok=callback_delta>=min_callbacks;
  int evidence_ok=stored>0u&&measured>=stored&&nonzero_frames>0u;
  int physical_device_ok=xrun_delta==0u&&error_delta==0u&&budget_misses==0u;
  /* The null driver validates harness shape and signal generation only. Host
     scheduling is not a physical realtime oracle. Cadence/fault/budget
     counters remain observable but become hard gates only on real audio. */
  int pass=format_ok&&callbacks_seen&&evidence_ok&&(!physical_audio||(physical_cadence_ok&&physical_device_ok));

  printf("{\"type\":\"headroom-scenario\",\"backend\":\"%s\",\"physicalAudio\":%s,\"bodies\":%u,\"measureMs\":%u,\"sampleRate\":%u,\"channels\":%u,\"deviceQuantumFrames\":%u,\"deviceQuantumNs\":%llu,\"timingGate\":%s,\"callbackDelta\":%llu,\"minimumCallbacks\":%llu,\"measuredCallbacks\":%llu,\"storedSamples\":%u,\"xrunDelta\":%llu,\"processErrorDelta\":%llu,\"budgetMisses\":%llu,\"p50Ns\":%llu,\"p95Ns\":%llu,\"p99Ns\":%llu,\"maxNs\":%llu,\"p50QuantumPct\":%.6f,\"p95QuantumPct\":%.6f,\"p99QuantumPct\":%.6f,\"maxQuantumPct\":%.6f,\"renderBusyPct\":%.6f,\"nonzeroFrames\":%llu,\"peak\":%.9g,\"pass\":%s}\n",
    actual.backend_name?actual.backend_name:driver.name,physical_audio?"true":"false",bodies,measure_ms,
    actual.sample_rate,actual.channels,actual.block_frames,(unsigned long long)quantum_ns,physical_audio?"true":"false",
    (unsigned long long)callback_delta,(unsigned long long)min_callbacks,(unsigned long long)measured,stored,
    (unsigned long long)xrun_delta,(unsigned long long)error_delta,(unsigned long long)budget_misses,
    (unsigned long long)p50,(unsigned long long)p95,(unsigned long long)p99,(unsigned long long)max,
    quantum_ns?(double)p50*100.0/(double)quantum_ns:0.0,
    quantum_ns?(double)p95*100.0/(double)quantum_ns:0.0,
    quantum_ns?(double)p99*100.0/(double)quantum_ns:0.0,
    quantum_ns?(double)max*100.0/(double)quantum_ns:0.0,
    busy_pct,(unsigned long long)nonzero_frames,(double)c.peak,pass?"true":"false");
  if(driver.destroy)driver.destroy(&driver);
  return pass?0:4;
}

static int p0n_hr_run_all(int physical_audio) {
  const unsigned scenarios[]={8u,16u,32u,64u};
  unsigned measure_ms=physical_audio?P0N_HR_PHYSICAL_MEASURE_MS:P0N_HR_NULL_MEASURE_MS;
  int pass=1;
  printf("{\"type\":\"headroom-begin\",\"schema\":\"xensonar.p0n.physical-headroom.v1\",\"physicalAudio\":%s,\"bodyDefinition\":\"one wavetable interpolation + one TDF-II biquad + envelope multiply + stereo mix per sample; no ingress/program/lifecycle work\",\"warmupMs\":%u,\"measureMsPerScenario\":%u}\n",
    physical_audio?"true":"false",P0N_HR_WARMUP_MS,measure_ms);
  for(unsigned i=0;i<4u;++i) {
#ifdef P0N_HAVE_PIPEWIRE
    P0NAudioDriver d=physical_audio?p0n_create_pipewire_driver():p0n_create_null_driver();
#else
    if(physical_audio){fprintf(stderr,"physical headroom requires PipeWire build\n");return 3;}
    P0NAudioDriver d=p0n_create_null_driver();
#endif
    if(p0n_hr_run_scenario(d,scenarios[i],measure_ms,physical_audio)!=0)pass=0;
  }
  printf("{\"type\":\"headroom-end\",\"physicalAudio\":%s,\"scenarioCount\":4,\"pass\":%s,\"claim\":\"physical-device-callback-synthetic-headroom-profile\"}\n",
    physical_audio?"true":"false",pass?"true":"false");
  return pass?0:4;
}

int main(int argc,char** argv) {
  if(argc>1&&strcmp(argv[1],"--null-selftest")==0)return p0n_hr_run_all(0);
#ifdef P0N_HAVE_PIPEWIRE
  if(argc>1&&strcmp(argv[1],"--pipewire-headroom")==0)return p0n_hr_run_all(1);
#endif
  fprintf(stderr,"usage: %s --null-selftest | --pipewire-headroom\n",argv[0]);
  return 1;
}
