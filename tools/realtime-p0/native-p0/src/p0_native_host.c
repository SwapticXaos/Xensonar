#define _POSIX_C_SOURCE 200809L
#include <errno.h>
#include <arpa/inet.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <poll.h>
#include <sys/random.h>
#include <sys/socket.h>
#include <math.h>
#include <pthread.h>
#include <stdatomic.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <sys/time.h>
#include <time.h>
#include <unistd.h>

#include "p0_native_transport.h"
#include "p0_native_audio_driver.h"
#include "p0_native_control_policy.h"
#include "p0_native_control_protocol.h"
#include "p0_native_null_driver.h"
#include "p0_native_browser_lab_html.h"
#include "p0_native_control_protocol_js.h"
#include "p0_native_control_adapter_js.h"
#include "p0_native_wavestarter_renderer.h"
#include "p0_native_root_follow_material_renderer.h"
#include "p0_native_post_master_pcm.h"
#ifdef P0N_GENESIS_IMPLANT
#include "xen/xen_audio.h"
#include "xen/xen_xensonar.h"
#endif
#ifdef P0N_HAVE_PIPEWIRE
#include "p0_native_pipewire_driver.h"
#endif
#define memset p0_core_memset
#define memcpy p0_core_memcpy
#include "../../core/p0_core.c"
#undef memcpy
#undef memset

#define P0N_SAMPLE_RATE 48000u
#define P0N_BLOCK_FRAMES 128u
#define P0N_OWNER_EPOCH 1u
#define P0N_SERVICE_VERSION "0.385.7"

/* Variant-2 standalone HTML test mode. The host remains loopback-only.
   Standalone file:// clients use Origin: null and a fixed port so the HTML can
   discover the installed AudioRtHost without a side channel. */
static int p0n_standalone_file_cors = 0;
/* Chosen at process startup; never switched while voices are running. */
static int p0n_post_master_only = 0;
static uint16_t p0n_forced_sidecar_port = 0u;

typedef struct {
  P0NSpscAttackRing attacks;
  P0NWaveStarterRenderer wave_starter;
  P0NRflMaterialRenderer rfl_material;
  P0NPostMasterPcm post_master;
  P0NStateMailbox state;
  P0NSafetyMailbox safety;
  uint32_t applied_release[P0N_TOKEN_SLOTS];
  uint64_t applied_state_revision;
  uint64_t applied_owner_lease_revision;
  uint32_t sample_rate;
  uint32_t block_frames;
  uint32_t owner_epoch;
  float b0,b1,b2,a1,a2;
  atomic_ullong callback_count;
  atomic_ullong render_budget_misses;
  atomic_ullong render_ns_max;
  atomic_ullong observed_frame;
  atomic_ullong observed_program_starts;
  atomic_uint observed_owner_closed;
  atomic_uint transport_notes_started;
  atomic_uint transport_notes_rejected;
  atomic_uint transport_notes_stale;
  atomic_ullong observed_external_voices_started;
  atomic_uint observed_active_voices;
  atomic_uint render_peak_max_micros;
  atomic_ullong render_nonzero_callbacks;
#ifdef P0N_GENESIS_IMPLANT
  /* Genesis foreign implant: it shares the device callback but owns its own
     frame clock, voices, DSP and lifecycle. No Browser/WebAudio objects cross
     this boundary. WaveStarter is the first experimental graft only. */
  xen_engine* genesis;
  float genesis_left[256u];
  float genesis_right[256u];
#endif
} P0NEngine;

static uint64_t now_ns(void) {
  struct timespec ts;
  clock_gettime(CLOCK_MONOTONIC, &ts);
  return (uint64_t)ts.tv_sec * 1000000000ull + (uint64_t)ts.tv_nsec;
}

static void sleep_ms(unsigned ms) {
  struct timespec req = {(time_t)(ms / 1000u), (long)((ms % 1000u) * 1000000u)};
  while (nanosleep(&req, &req) != 0 && errno == EINTR) {}
}

static void make_lowpass(float cutoff, float q_db, uint32_t sr,
                         float* b0,float* b1,float* b2,float* a1,float* a2) {
  double w = P0_PI2 * (double)cutoff / (double)sr;
  double cs = cos(w);
  double alpha = sin(w) / (2.0 * pow(10.0, (double)q_db / 20.0));
  double a0 = 1.0 + alpha;
  *b0 = (float)(((1.0-cs)/2.0)/a0);
  *b1 = (float)((1.0-cs)/a0);
  *b2 = *b0;
  *a1 = (float)((-2.0*cs)/a0);
  *a2 = (float)((1.0-alpha)/a0);
}

static uint64_t frames_for_ms(const P0NEngine* e, uint32_t ms) {
  return ((uint64_t)e->sample_rate * (uint64_t)ms + 999u) / 1000u;
}

static uint64_t lease_frame(P0NEngine* e) {
  return p0_frame() + frames_for_ms(e, P0N_RT_OWNER_LEASE_MS);
}

static void stamp_attack_timing(const P0NEngine* e, P0NAttackGroup* group, uint64_t source_frame) {
  group->source_frame = source_frame;
  group->intended_frame = source_frame + frames_for_ms(e, P0N_ATTACK_LEAD_MS);
  group->latest_admission_frame = group->intended_frame + frames_for_ms(e, P0N_ATTACK_LATE_MS);
}

static int setup_program(P0NEngine* e) {
  float release_coef = (float)exp(-1.0 / (0.025704 * (double)e->sample_rate));
  if (p0_program_set_header(e->owner_epoch, 1u, 16u, 120000u,
      e->b0,e->b1,e->b2,e->a1,e->a2,
      (uint32_t)(0.032 * e->sample_rate),
      (uint32_t)(0.1044 * e->sample_rate),
      (uint32_t)(0.260 * e->sample_rate), release_coef) != P0_RESULT_OK) return 0;
  for (uint32_t i=0;i<16u;++i) {
    uint32_t count = (i % 4u == 0u) ? 3u : ((i % 2u == 0u) ? 1u : 0u);
    if (p0_program_set_step(e->owner_epoch, i, count,
      1.0f,0.018f, 1.5f,0.015f, 2.0f,0.012f) != P0_RESULT_OK) return 0;
  }
  return p0_program_start(e->owner_epoch, p0_frame() + e->block_frames * 2u) == P0_RESULT_OK;
}

static int engine_prepare(P0NEngine* e,int start_demo_program) {
  memset(e,0,sizeof(*e));
  e->sample_rate = P0N_SAMPLE_RATE;
  e->block_frames = P0N_BLOCK_FRAMES;
  e->owner_epoch = P0N_OWNER_EPOCH;
  p0n_ring_init(&e->attacks);
  p0n_ws_renderer_init(&e->wave_starter,e->sample_rate);
  p0n_rfl_material_init(&e->rfl_material,e->sample_rate);
  p0n_post_master_init(&e->post_master);
#ifdef P0N_GENESIS_IMPLANT
  xen_config genesis_cfg;
  xen_config_default(&genesis_cfg);
  genesis_cfg.sample_rate = e->sample_rate;
  /* First graft policy is conservative: late independent attacks are dropped,
     intentional simultaneity is preserved by identical intended frames. */
  genesis_cfg.lateness_policy = XEN_LATE_DROP;
  e->genesis = xen_engine_create(&genesis_cfg);
  if (!e->genesis) return 0;
#endif
  p0n_state_init(&e->state,220.0f,1.0f);
  if (!p0n_state_is_lock_free(&e->state)) return 0;
  p0n_safety_init(&e->safety);
  atomic_init(&e->callback_count,0u);
  atomic_init(&e->render_budget_misses,0u);
  atomic_init(&e->render_ns_max,0u);
  atomic_init(&e->observed_frame,0u);
  atomic_init(&e->observed_program_starts,0u);
  atomic_init(&e->observed_owner_closed,1u);
  atomic_init(&e->transport_notes_started,0u);
  atomic_init(&e->transport_notes_rejected,0u);
  atomic_init(&e->transport_notes_stale,0u);
  atomic_init(&e->observed_external_voices_started,0u);
  atomic_init(&e->observed_active_voices,0u);
  atomic_init(&e->render_peak_max_micros,0u);
  atomic_init(&e->render_nonzero_callbacks,0u);

  make_lowpass(2400.0f,1.0f,e->sample_rate,&e->b0,&e->b1,&e->b2,&e->a1,&e->a2);
  p0_init(e->sample_rate);
  float* table=(float*)p0_sine_table_ptr();
  for (uint32_t i=0;i<P0_SINE_TABLE;i++) table[i]=(float)sin(P0_PI2*(double)i/P0_SINE_TABLE);
  if (p0_arm(e->owner_epoch, ((uint64_t)e->sample_rate * P0N_RT_OWNER_LEASE_MS) / 1000ull) != P0_RESULT_OK) return 0;
  p0n_state_write(&e->state,1u,220.0f,1.0f);
  atomic_store(&e->safety.owner_lease_revision,1u);
  if (start_demo_program && !setup_program(e)) return 0;
  return 1;
}

static void engine_apply_safety(P0NEngine* e) {
  uint32_t panic_epoch = atomic_load_explicit(&e->safety.panic_epoch,memory_order_acquire);
  if (panic_epoch == e->owner_epoch) {
    if (!p0_owner_closed()) p0_panic(e->owner_epoch,(e->sample_rate*5u+999u)/1000u);
    p0n_ws_panic(&e->wave_starter);
    p0n_rfl_material_panic(&e->rfl_material);
  }
  for (uint32_t slot=0;slot<P0N_TOKEN_SLOTS;++slot) {
    uint32_t generation=atomic_load_explicit(&e->safety.release_generation[slot],memory_order_acquire);
    if (generation>e->applied_release[slot]) {
      p0_release(e->owner_epoch,slot,generation,(e->sample_rate*30u+999u)/1000u);
      e->applied_release[slot]=generation;
    }
  }
}

static void engine_apply_control(P0NEngine* e) {
  uint64_t hb=atomic_load_explicit(&e->safety.owner_lease_revision,memory_order_acquire);
  if (hb>e->applied_owner_lease_revision && !p0_owner_closed()) {
    p0_renew_lease(e->owner_epoch,lease_frame(e));
    e->applied_owner_lease_revision=hb;
  }
  uint64_t revision=0;float root=0,gain=0;
  if (p0n_state_read(&e->state,&revision,&root,&gain) && revision>e->applied_state_revision && !p0_owner_closed()) {
    if (p0_set_state(e->owner_epoch,revision,root,gain)==P0_RESULT_OK) e->applied_state_revision=revision;
  }

  P0NAttackGroup group;
  uint32_t groups=0,notes=0;
  while(groups<16u && notes<8u && p0n_ring_pop(&e->attacks,&group)) {
    ++groups;
    uint32_t group_notes = group.note_count <= P0N_MAX_GROUP_NOTES ? group.note_count : 0u;
    if (group.note_count<1u || group.note_count>P0N_MAX_GROUP_NOTES || notes+group.note_count>8u || p0_owner_closed()
        || group.intended_frame < group.source_frame || group.latest_admission_frame < group.intended_frame) {
      atomic_fetch_add(&e->transport_notes_rejected,group_notes); continue;
    }
    uint64_t now=p0_frame();
    if (now > group.latest_admission_frame) {
      atomic_fetch_add(&e->transport_notes_stale,group.note_count);
      atomic_fetch_add(&e->transport_notes_rejected,group.note_count);
      continue;
    }
    int32_t rc=p0_begin_attack_group(e->owner_epoch,group.sequence,group.note_count,group.intended_frame,group.latest_admission_frame);
    if(rc!=P0_RESULT_OK){atomic_fetch_add(&e->transport_notes_rejected,group.note_count);continue;}
    p0_group_input_sequence(group.sequence);
    int valid=1;
    float release_coef=(float)exp(-1.0/(0.025704*(double)e->sample_rate));
    for(uint32_t i=0;i<group.note_count;++i){
      P0NNote* n=&group.notes[i];
      if(p0_set_attack_note(i,n->slot,n->generation,P0_KIND_GATED,n->frequency_hz,n->peak,
          e->b0,e->b1,e->b2,e->a1,e->a2,
          (uint32_t)(0.032*e->sample_rate),0u,(uint32_t)(1.16*e->sample_rate),release_coef)!=P0_RESULT_OK){valid=0;break;}
    }
    if(valid && p0_commit_attack_group()==P0_RESULT_OK){notes+=group.note_count;atomic_fetch_add(&e->transport_notes_started,group.note_count);}
    else atomic_fetch_add(&e->transport_notes_rejected,group.note_count);
  }
  p0n_ws_apply_control(&e->wave_starter,p0_frame());
}

static void render_callback(float* output,uint32_t frames,void* userdata) {
  P0NEngine* e=(P0NEngine*)userdata;
  uint64_t begin=now_ns();
  float callback_peak=0.0f;

  /* 398 Post-Master ownership boundary: once armed, the physical callback no
     longer performs musical scheduling or synthesis. It only consumes the
     already-finished interleaved stereo master PCM. Before commit this branch
     deliberately renders silence so the browser monitor can remain the sole
     audible owner while the native reservoir is prefilled. */
  const int post_master_owns_callback=p0n_post_master_render(&e->post_master,output,frames);
  if(!post_master_owns_callback && p0n_post_master_only) {
    memset(output, 0, (size_t)frames * 2u * sizeof(float));
  } else if(!post_master_owns_callback){
    engine_apply_safety(e);
    engine_apply_control(e);

    /* A physical backend owns the negotiated callback quantum. The P0 core has a
       deliberately small fixed render block, so larger device quanta are rendered
       as contiguous core chunks instead of being truncated (or reading past the
       core output buffer). Control is applied once per device callback. */
    uint32_t rendered=0u;
    const uint32_t core_max=p0_max_block();
    while(rendered<frames) {
      uint32_t chunk=frames-rendered;
      if(chunk>core_max)chunk=core_max;
      const uint64_t chunk_start_frame=p0_frame();
      p0_render(chunk);
      float* src=(float*)p0_output_ptr();
      for(uint32_t i=0;i<chunk*2u;++i) output[rendered*2u+i]=src[i];
#ifdef P0N_GENESIS_IMPLANT
      /* OP1 amputation line: the old WaveStarter renderer is deliberately not
         called. The foreign C11 kernel renders the WaveStarter pilot directly
         into the same physical callback. Other legacy organs remain untouched. */
      xen_engine_render(e->genesis,e->genesis_left,e->genesis_right,chunk);
      for(uint32_t i=0;i<chunk;++i){
        output[(rendered+i)*2u] += e->genesis_left[i];
        output[(rendered+i)*2u+1u] += e->genesis_right[i];
      }
#else
      p0n_ws_render(&e->wave_starter,chunk_start_frame,output+rendered*2u,chunk);
#endif
      p0n_rfl_material_render(&e->rfl_material,chunk_start_frame,output+rendered*2u,chunk);
      rendered+=chunk;
    }
  }
  for(uint32_t i=0;i<frames*2u;++i) {
    const float sample=output[i];
    const float magnitude=sample<0.0f?-sample:sample;
    if(magnitude>callback_peak)callback_peak=magnitude;
  }
  uint64_t end=now_ns();
  uint64_t elapsed=end-begin;
  uint64_t quantum=((uint64_t)frames*1000000000ull)/e->sample_rate;
  atomic_fetch_add(&e->callback_count,1u);
  if(elapsed>quantum)atomic_fetch_add(&e->render_budget_misses,1u);
  uint64_t old=atomic_load(&e->render_ns_max);
  while(elapsed>old&&!atomic_compare_exchange_weak(&e->render_ns_max,&old,elapsed)){}
  atomic_store(&e->observed_frame,p0_frame());
  atomic_store(&e->observed_program_starts,p0_started_program());
  atomic_store(&e->observed_owner_closed,p0_owner_closed());
  atomic_store(&e->observed_external_voices_started,p0_started_external());
  atomic_store(&e->observed_active_voices,p0_active_voices());
  if(callback_peak>0.000001f) {
    atomic_fetch_add(&e->render_nonzero_callbacks,1u);
    uint32_t micros=(uint32_t)(callback_peak*1000000.0f);
    uint32_t old_peak=atomic_load(&e->render_peak_max_micros);
    while(micros>old_peak&&!atomic_compare_exchange_weak(&e->render_peak_max_micros,&old_peak,micros)){}
  }
}

static void request_owner_lease_renewal(P0NEngine* e) { atomic_fetch_add_explicit(&e->safety.owner_lease_revision,1u,memory_order_release); }

static void print_status(P0NEngine* e,const char* label) {
  printf("{\"type\":\"status\",\"label\":\"%s\",\"frame\":%llu,\"programStarts\":%llu,\"ownerClosed\":%u,\"callbacks\":%llu,\"renderBudgetMisses\":%llu,\"renderNsMax\":%llu,\"ringRejected\":%llu,\"transportStarted\":%u,\"transportRejected\":%u,\"transportStale\":%u}\n",
    label,
    (unsigned long long)atomic_load(&e->observed_frame),
    (unsigned long long)atomic_load(&e->observed_program_starts),
    atomic_load(&e->observed_owner_closed),
    (unsigned long long)atomic_load(&e->callback_count),
    (unsigned long long)atomic_load(&e->render_budget_misses),
    (unsigned long long)atomic_load(&e->render_ns_max),
    (unsigned long long)atomic_load(&e->attacks.rejected_full),
    atomic_load(&e->transport_notes_started),atomic_load(&e->transport_notes_rejected),atomic_load(&e->transport_notes_stale));
  fflush(stdout);
}

static void print_device_status(P0NAudioDriver* driver);

static int run_stall_selftest(P0NAudioDriver driver, int physical_audio, const char* claim) {
  P0NEngine e;
  if(!engine_prepare(&e,1)){fprintf(stderr,"prepare failed\n");return 2;}
  P0NAudioFormat fmt={e.sample_rate,2u,e.block_frames,driver.name};
  if(!driver.prepare(&driver,&fmt,render_callback,&e)||!driver.start(&driver)){
    fprintf(stderr,"driver failed\n");
    if(driver.destroy)driver.destroy(&driver);
    return 3;
  }
  sleep_ms(100);
  P0NAudioFormat actual={0};
  P0NCallbackObservation initial_obs={0};
  int have_format=driver.query_format && driver.query_format(&driver,&actual);
  int have_initial_obs=driver.query_last_observation && driver.query_last_observation(&driver,&initial_obs);
  const unsigned stalls[]={100u,250u,500u,1000u};
  int format_ok=have_format && actual.sample_rate==e.sample_rate && actual.channels==2u && actual.block_frames>0u;
  int callback_ok=have_initial_obs && initial_obs.callback_index>0u && initial_obs.frames>0u;
  int pass=format_ok && callback_ok;
  printf("{\"type\":\"selftest-begin\",\"backend\":\"%s\",\"sampleRate\":%u,\"actualSampleRate\":%u,\"channels\":%u,\"requestedBlockFrames\":%u,\"actualBlockFrames\":%u,\"leaseMs\":%u,\"formatPass\":%s,\"callbackSeen\":%s,\"physicalAudio\":%s}\n",
    actual.backend_name?actual.backend_name:driver.name,e.sample_rate,actual.sample_rate,actual.channels,e.block_frames,actual.block_frames,P0N_RT_OWNER_LEASE_MS,
    format_ok?"true":"false",callback_ok?"true":"false",physical_audio?"true":"false");
  for(unsigned i=0;i<4u;++i){
    request_owner_lease_renewal(&e); sleep_ms(30);
    uint64_t frame_before=atomic_load(&e.observed_frame);
    uint64_t starts_before=atomic_load(&e.observed_program_starts);
    uint64_t callbacks_before=atomic_load(&e.callback_count);
    uint64_t budget_misses_before=atomic_load(&e.render_budget_misses);
    uint32_t queue_before=p0n_ring_depth(&e.attacks);
    uint32_t transport_before=atomic_load(&e.transport_notes_started);
    P0NCallbackObservation obs_before={0},obs_after={0};
    int have_before=driver.query_last_observation && driver.query_last_observation(&driver,&obs_before);
    sleep_ms(stalls[i]); /* Control-plane stall: callback/graph thread must remain independent. */
    uint64_t frame_after=atomic_load(&e.observed_frame);
    uint64_t starts_after=atomic_load(&e.observed_program_starts);
    uint64_t callbacks_after=atomic_load(&e.callback_count);
    uint64_t budget_misses_after=atomic_load(&e.render_budget_misses);
    uint32_t queue_after=p0n_ring_depth(&e.attacks);
    uint32_t transport_after=atomic_load(&e.transport_notes_started);
    int have_after=driver.query_last_observation && driver.query_last_observation(&driver,&obs_after);
    uint32_t closed=atomic_load(&e.observed_owner_closed);
    uint64_t min_expected=((uint64_t)e.sample_rate*stalls[i])/1000ull;
    uint64_t frame_delta=frame_after-frame_before;
    uint64_t callback_delta=callbacks_after-callbacks_before;
    /* The control thread samples progress asynchronously to the physical callback.
       Therefore the measurement boundary is quantized by the negotiated device
       quantum, not by the smaller P0 core render chunk. Allow at most one device
       callback of boundary uncertainty while still requiring the callback cadence
       expected for the requested stall interval. */
    uint64_t device_quantum=actual.block_frames?actual.block_frames:e.block_frames;
    uint64_t min_callbacks=device_quantum?min_expected/device_quantum:1u;
    if(min_callbacks<1u)min_callbacks=1u;
    int observation_ok=have_before && have_after && obs_after.callback_index>obs_before.callback_index;
    int device_ok=!physical_audio || (observation_ok
      && obs_after.underrun_count==obs_before.underrun_count
      && obs_after.process_error_count==obs_before.process_error_count);
    int no_backlog=(queue_before==queue_after) && (transport_before==transport_after);
    int budget_ok=budget_misses_after==budget_misses_before;
    int cadence_ok=callback_delta>=min_callbacks;
    int frame_time_ok=frame_delta>0u && frame_delta+device_quantum>=min_expected;
    int ok=!closed && frame_time_ok && cadence_ok
      && starts_after>=starts_before && callbacks_after>callbacks_before && no_backlog && budget_ok && device_ok;
    if(!ok)pass=0;
    printf("{\"type\":\"stall\",\"ms\":%u,\"frameBefore\":%llu,\"frameAfter\":%llu,\"frameDelta\":%llu,\"expectedFrames\":%llu,\"deviceQuantumFrames\":%llu,\"callbackDelta\":%llu,\"minimumCallbacks\":%llu,\"programStartsBefore\":%llu,\"programStartsAfter\":%llu,\"callbacksBefore\":%llu,\"callbacksAfter\":%llu,\"queueDepthBefore\":%u,\"queueDepthAfter\":%u,\"transportStartsBefore\":%u,\"transportStartsAfter\":%u,\"renderBudgetMissesBefore\":%llu,\"renderBudgetMissesAfter\":%llu,\"ownerClosed\":%u,\"xrunBefore\":%llu,\"xrunAfter\":%llu,\"deviceErrorsBefore\":%llu,\"deviceErrorsAfter\":%llu,\"pass\":%s}\n",
      stalls[i],(unsigned long long)frame_before,(unsigned long long)frame_after,
      (unsigned long long)frame_delta,(unsigned long long)min_expected,(unsigned long long)device_quantum,
      (unsigned long long)callback_delta,(unsigned long long)min_callbacks,
      (unsigned long long)starts_before,(unsigned long long)starts_after,
      (unsigned long long)callbacks_before,(unsigned long long)callbacks_after,queue_before,queue_after,transport_before,transport_after,
      (unsigned long long)budget_misses_before,(unsigned long long)budget_misses_after,closed,
      (unsigned long long)obs_before.underrun_count,(unsigned long long)obs_after.underrun_count,
      (unsigned long long)obs_before.process_error_count,(unsigned long long)obs_after.process_error_count,ok?"true":"false");
  }
  request_owner_lease_renewal(&e); sleep_ms(50);
  print_status(&e,"final");
  print_device_status(&driver);
  driver.stop(&driver); driver.destroy(&driver);
  printf("{\"type\":\"selftest-end\",\"pass\":%s,\"physicalAudio\":%s,\"claim\":\"%s\"}\n",
    pass?"true":"false",physical_audio?"true":"false",claim);
  return pass?0:4;
}

static int run_selftest(void) {
  return run_stall_selftest(p0n_create_null_driver(),0,"control-thread-independence-only");
}
#ifdef P0N_HAVE_PIPEWIRE
static int run_pipewire_selftest(void) {
  return run_stall_selftest(p0n_create_pipewire_driver(),1,"physical-pipewire-n1-stall-test");
}
#endif


static int run_driver_lifecycle_selftest(P0NAudioDriver driver, int physical_audio, const char* claim) {
  P0NEngine e;
  if(!engine_prepare(&e,1)){fprintf(stderr,"prepare failed\n");return 2;}
  P0NAudioFormat fmt={e.sample_rate,2u,e.block_frames,driver.name};
  if(!driver.prepare(&driver,&fmt,render_callback,&e)){
    fprintf(stderr,"driver prepare failed\n");
    if(driver.destroy)driver.destroy(&driver);
    return 3;
  }
  int pass=1;
  if(!driver.start(&driver)) pass=0;
  sleep_ms(80);
  uint64_t first=atomic_load(&e.callback_count);
  P0NAudioFormat actual={0};
  int format_ok=driver.query_format && driver.query_format(&driver,&actual)
    && actual.sample_rate==e.sample_rate && actual.channels==2u && actual.block_frames>0u;
  if(first==0u || !format_ok) pass=0;

  int stop_ok=driver.stop && driver.stop(&driver);
  uint64_t stopped=atomic_load(&e.callback_count);
  sleep_ms(60);
  uint64_t stopped_after=atomic_load(&e.callback_count);
  int quiescent=stop_ok && stopped_after==stopped;
  if(!quiescent) pass=0;

  int restart_ok=driver.start && driver.start(&driver);
  sleep_ms(80);
  uint64_t restarted=atomic_load(&e.callback_count);
  P0NAudioFormat restarted_actual={0};
  int restart_format_ok=driver.query_format && driver.query_format(&driver,&restarted_actual)
    && restarted_actual.sample_rate==e.sample_rate && restarted_actual.channels==2u && restarted_actual.block_frames>0u;
  int resumed=restart_ok && restarted>stopped_after && restart_format_ok;
  if(!resumed) pass=0;

  if(driver.stop)driver.stop(&driver);
  if(driver.destroy)driver.destroy(&driver);
  printf("{\"type\":\"driver-lifecycle\",\"backend\":\"%s\",\"firstCallbacks\":%llu,\"stoppedCallbacks\":%llu,\"stoppedCallbacksAfterWait\":%llu,\"restartedCallbacks\":%llu,\"formatPass\":%s,\"restartFormatPass\":%s,\"stopQuiescent\":%s,\"restartPass\":%s,\"pass\":%s,\"physicalAudio\":%s,\"claim\":\"%s\"}\n",
    actual.backend_name?actual.backend_name:driver.name,(unsigned long long)first,(unsigned long long)stopped,
    (unsigned long long)stopped_after,(unsigned long long)restarted,format_ok?"true":"false",restart_format_ok?"true":"false",
    quiescent?"true":"false",resumed?"true":"false",pass?"true":"false",physical_audio?"true":"false",claim);
  return pass?0:4;
}

static int run_null_lifecycle_selftest(void) {
  return run_driver_lifecycle_selftest(p0n_create_null_driver(),0,"driver-start-stop-restart-contract");
}

static int run_driver_concurrency_selftest(P0NAudioDriver driver, const char* claim) {
  P0NEngine e;
  if(!engine_prepare(&e,1)){fprintf(stderr,"prepare failed\n");return 2;}
  P0NAudioFormat fmt={e.sample_rate,2u,e.block_frames,driver.name};
  if(!driver.prepare(&driver,&fmt,render_callback,&e)||!driver.start(&driver)){
    fprintf(stderr,"driver failed\n");
    if(driver.destroy)driver.destroy(&driver);
    return 3;
  }
  P0NAudioFormat actual={0};
  P0NCallbackObservation obs={0};
  uint64_t highest_callback=0u;
  int query_ok=1;
  for(unsigned i=0;i<20000u;++i) {
    P0NAudioFormat f={0};
    P0NCallbackObservation o={0};
    if(!driver.query_format || !driver.query_format(&driver,&f)) { query_ok=0; break; }
    if(!driver.query_last_observation || !driver.query_last_observation(&driver,&o)) continue;
    if(o.callback_index<highest_callback) { query_ok=0; break; }
    highest_callback=o.callback_index;
    actual=f;
    obs=o;
    if((i&255u)==0u) request_owner_lease_renewal(&e);
  }
  sleep_ms(50);
  if(driver.query_format)driver.query_format(&driver,&actual);
  if(driver.query_last_observation)driver.query_last_observation(&driver,&obs);
  uint64_t callbacks=atomic_load(&e.callback_count);
  int pass=query_ok && callbacks>0u && actual.sample_rate==e.sample_rate && actual.channels==2u
    && actual.block_frames>0u && obs.callback_index>0u && obs.process_error_count==0u;
  if(driver.stop)driver.stop(&driver);
  if(driver.destroy)driver.destroy(&driver);
  printf("{\"type\":\"driver-concurrency\",\"backend\":\"%s\",\"callbacks\":%llu,\"observedCallback\":%llu,\"formatPass\":%s,\"queryPass\":%s,\"pass\":%s,\"physicalAudio\":false,\"claim\":\"%s\"}\n",
    actual.backend_name?actual.backend_name:driver.name,(unsigned long long)callbacks,(unsigned long long)obs.callback_index,
    (actual.sample_rate==e.sample_rate && actual.channels==2u && actual.block_frames>0u)?"true":"false",
    query_ok?"true":"false",pass?"true":"false",claim);
  return pass?0:4;
}

static int run_null_concurrency_selftest(void) {
  return run_driver_concurrency_selftest(p0n_create_null_driver(),"driver-observation-concurrency-contract");
}
#ifdef P0N_HAVE_PIPEWIRE
static int run_pipewire_lifecycle_selftest(void) {
  return run_driver_lifecycle_selftest(p0n_create_pipewire_driver(),1,"physical-driver-start-stop-restart-contract");
}
#endif

static P0NAttackGroup make_test_group(P0NEngine* e, uint64_t sequence, uint64_t source_frame,
                                         uint16_t first_slot, uint32_t generation, uint8_t note_count) {
  P0NAttackGroup group={0};
  group.sequence=sequence;
  group.note_count=note_count;
  stamp_attack_timing(e,&group,source_frame);
  for(uint32_t i=0;i<note_count && i<P0N_MAX_GROUP_NOTES;++i) {
    group.notes[i]=(P0NNote){(uint16_t)(first_slot+i),generation,220.0f*(float)(i+1u),0.05f};
  }
  return group;
}

static int run_signal_truth_selftest(void) {
  P0NEngine e;
  if(!engine_prepare(&e,1)){fprintf(stderr,"prepare failed\n");return 2;}
  /* Remove the internal program before it renders so this fixture measures one
     known gated chord through the exact device-facing render_callback seam. */
  if(p0_program_stop(e.owner_epoch,0u)!=P0_RESULT_OK)return 3;

  P0NAttackGroup chord=make_test_group(&e,7001u,p0_frame(),70u,1u,3u);
  if(!p0n_ring_push(&e.attacks,&chord))return 3;

  enum { BLOCK=128u, BLOCKS=188u };
  float out[BLOCK*2u];
  uint64_t frame_before=p0_frame();
  uint64_t finite_samples=0u, stereo_equal_frames=0u, nonzero_frames=0u;
  uint64_t first_nonzero_frame=UINT64_MAX;
  double sum_sq=0.0;
  float peak=0.0f;
  int finite=1;
  for(uint32_t b=0;b<BLOCKS;++b) {
    render_callback(out,BLOCK,&e);
    for(uint32_t i=0;i<BLOCK;++i) {
      float l=out[i*2u], r=out[i*2u+1u];
      if(!isfinite(l)||!isfinite(r)){finite=0;continue;}
      finite_samples+=2u;
      if(l==r)++stereo_equal_frames;
      float a=fabsf(l); if(a>peak)peak=a;
      if(a>1.0e-9f) {
        ++nonzero_frames;
        if(first_nonzero_frame==UINT64_MAX)first_nonzero_frame=(uint64_t)b*BLOCK+i;
      }
      sum_sq+=(double)l*(double)l;
    }
  }
  uint64_t total_frames=(uint64_t)BLOCK*BLOCKS;
  double rms=sqrt(sum_sq/(double)total_frames);
  uint64_t frame_after=p0_frame();
  uint64_t started=p0_started_external();
  int chord_ok=finite && finite_samples==total_frames*2u && stereo_equal_frames==total_frames
    && started==3u && frame_after-frame_before==total_frames
    && first_nonzero_frame!=UINT64_MAX && first_nonzero_frame<1024u
    && nonzero_frames>total_frames*9u/10u && peak>1.0e-4f && rms>1.0e-5;

  /* Panic owns terminal safety. After the fixed 5 ms panic fade has elapsed,
     subsequent output must be silent and no voice may resurrect. */
  atomic_store_explicit(&e.safety.panic_epoch,e.owner_epoch,memory_order_release);
  float panic_out[512u*2u];
  render_callback(panic_out,512u,&e);
  int tail_silent=1;
  for(uint32_t i=(512u-128u)*2u;i<512u*2u;++i) {
    if(fabsf(panic_out[i])>1.0e-9f){tail_silent=0;break;}
  }
  int panic_ok=p0_owner_closed() && p0_active_voices()==0u && tail_silent && p0_started_external()==started;
  int pass=chord_ok && panic_ok;
  printf("{\"type\":\"signal-truth\",\"pass\":%s,\"physicalAudio\":false,\"routingPass\":false,\"claim\":\"device-facing-render-seam-signal-only\",\"frames\":%llu,\"startedExternal\":%llu,\"finite\":%s,\"stereoEqualFrames\":%llu,\"nonzeroFrames\":%llu,\"firstNonzeroFrame\":%llu,\"peak\":%.9g,\"rms\":%.9g,\"panicClosed\":%s,\"panicTailSilent\":%s,\"activeVoicesAfterPanic\":%u}\n",
    pass?"true":"false",(unsigned long long)total_frames,(unsigned long long)started,finite?"true":"false",
    (unsigned long long)stereo_equal_frames,(unsigned long long)nonzero_frames,
    (unsigned long long)(first_nonzero_frame==UINT64_MAX?0u:first_nonzero_frame),(double)peak,rms,
    p0_owner_closed()?"true":"false",tail_silent?"true":"false",p0_active_voices());
  return pass?0:4;
}

static void advance_core_without_transport(P0NEngine* e, uint64_t frames) {
  while(frames) {
    uint32_t block = frames > e->block_frames ? e->block_frames : (uint32_t)frames;
    p0_render(block);
    frames -= block;
  }
}

static int run_adversarial_selftest(void) {
  P0NEngine e;
  if(!engine_prepare(&e,1)){fprintf(stderr,"prepare failed\n");return 2;}
  int pass=1;
  uint64_t sequence=1000u;

  /* Device callback quanta are not allowed to inherit the core's 256-frame cap.
     A 512-frame host callback must advance/render the full callback exactly once. */
  {
    float output[512u*2u];
    uint64_t before=p0_frame();
    uint64_t callbacks_before=atomic_load(&e.callback_count);
    render_callback(output,512u,&e);
    uint64_t after=p0_frame();
    int finite=1;
    for(uint32_t i=0;i<512u*2u;++i) if(!isfinite(output[i])) { finite=0; break; }
    int ok=(after-before)==512u && atomic_load(&e.callback_count)==callbacks_before+1u && finite;
    if(!ok)pass=0;
    printf("{\"type\":\"callback-quantum-512\",\"pass\":%s,\"frameDelta\":%llu,\"finite\":%s}\n",
      ok?"true":"false",(unsigned long long)(after-before),finite?"true":"false");
  }

  /* A queued event keeps its original admission window. Advancing the engine by
     500 ms before dequeue must make it stale instead of re-aging it. */
  uint64_t source=p0_frame();
  P0NAttackGroup stale=make_test_group(&e,sequence++,source,40u,1u,1u);
  if(!p0n_ring_push(&e.attacks,&stale)) return 3;
  advance_core_without_transport(&e,frames_for_ms(&e,500u));
  uint64_t external_before=p0_started_external();
  engine_apply_control(&e);
  p0_render(e.block_frames);
  int stale_ok=p0_started_external()==external_before && atomic_load(&e.transport_notes_stale)==1u && p0_pending_groups()==0u;
  pass &= stale_ok;
  printf("{\"type\":\"stale-attack-500ms\",\"pass\":%s,\"sourceFrame\":%llu,\"deadlineFrame\":%llu,\"dequeueFrame\":%llu,\"externalStarts\":%llu,\"staleDropped\":%u}\n",
    stale_ok?"true":"false",(unsigned long long)stale.source_frame,(unsigned long long)stale.latest_admission_frame,
    (unsigned long long)p0_frame(),(unsigned long long)p0_started_external(),atomic_load(&e.transport_notes_stale));

  /* A new attack after the stale drop remains valid. */
  source=p0_frame();
  P0NAttackGroup fresh=make_test_group(&e,sequence++,source,41u,1u,1u);
  external_before=p0_started_external();
  int fresh_queued=p0n_ring_push(&e.attacks,&fresh);
  engine_apply_control(&e); p0_render(e.block_frames);
  int fresh_ok=fresh_queued && p0_started_external()==external_before+1u;
  pass &= fresh_ok;
  printf("{\"type\":\"fresh-after-stale\",\"pass\":%s,\"externalDelta\":%llu}\n",
    fresh_ok?"true":"false",(unsigned long long)(p0_started_external()-external_before));

  /* A three-note attack is one admission transaction: either the whole group is
     committed or none of it is audible. */
  source=p0_frame();
  P0NAttackGroup chord=make_test_group(&e,sequence++,source,50u,1u,3u);
  external_before=p0_started_external();
  uint32_t admitted_before=atomic_load(&e.transport_notes_started);
  int chord_queued=p0n_ring_push(&e.attacks,&chord);
  engine_apply_control(&e); p0_render(e.block_frames);
  uint64_t chord_delta=p0_started_external()-external_before;
  uint32_t admitted_delta=atomic_load(&e.transport_notes_started)-admitted_before;
  int chord_ok=chord_queued && chord_delta==3u && admitted_delta==3u;
  pass &= chord_ok;
  printf("{\"type\":\"chord3-atomic\",\"pass\":%s,\"externalDelta\":%llu,\"admittedDelta\":%u}\n",
    chord_ok?"true":"false",(unsigned long long)chord_delta,admitted_delta);

  /* A release high-water mark applied before admission closes that generation,
     so a delayed matching attack cannot resurrect it. */
  source=p0_frame();
  P0NAttackGroup released=make_test_group(&e,sequence++,source,60u,7u,1u);
  external_before=p0_started_external();
  p0n_ring_push(&e.attacks,&released);
  p0n_release_max(&e.safety,60u,7u);
  engine_apply_safety(&e); engine_apply_control(&e); p0_render(e.block_frames);
  int release_ok=p0_started_external()==external_before && p0_pending_groups()==0u;
  pass &= release_ok;
  printf("{\"type\":\"release-before-start\",\"pass\":%s,\"externalDelta\":%llu}\n",
    release_ok?"true":"false",(unsigned long long)(p0_started_external()-external_before));

  /* Panic is terminal for the owner epoch. Commands already in transport cannot
     start after the safety lane closes ownership. */
  source=p0_frame();
  P0NAttackGroup after_panic=make_test_group(&e,sequence++,source,61u,1u,1u);
  external_before=p0_started_external();
  p0n_ring_push(&e.attacks,&after_panic);
  atomic_store_explicit(&e.safety.panic_epoch,e.owner_epoch,memory_order_release);
  engine_apply_safety(&e); engine_apply_control(&e); p0_render(e.block_frames);
  int panic_ok=p0_owner_closed() && p0_started_external()==external_before && p0_pending_groups()==0u;
  pass &= panic_ok;
  printf("{\"type\":\"panic-no-resurrection\",\"pass\":%s,\"ownerClosed\":%u,\"externalDelta\":%llu}\n",
    panic_ok?"true":"false",p0_owner_closed(),(unsigned long long)(p0_started_external()-external_before));

  printf("{\"type\":\"adversarial-end\",\"pass\":%s,\"physicalAudio\":false,\"claim\":\"native-transport-causality-only\"}\n",pass?"true":"false");
  return pass?0:4;
}

static void print_device_status(P0NAudioDriver* driver) {
  P0NAudioFormat actual={0};
  P0NCallbackObservation obs={0};
  int have_format=driver->query_format && driver->query_format(driver,&actual);
  int have_obs=driver->query_last_observation && driver->query_last_observation(driver,&obs);
  printf("{\"type\":\"device-status\",\"backend\":\"%s\",\"sampleRate\":%u,\"channels\":%u,\"quantum\":%u,\"callback\":%llu,\"callbackFrames\":%u,\"xrunLast\":%d,\"xrunCount\":%llu,\"processErrors\":%llu}\n",
    have_format && actual.backend_name?actual.backend_name:driver->name,
    have_format?actual.sample_rate:0u,have_format?actual.channels:0u,have_format?actual.block_frames:0u,
    (unsigned long long)(have_obs?obs.callback_index:0u),have_obs?obs.frames:0u,
    have_obs?obs.underrun_reported:0,(unsigned long long)(have_obs?obs.underrun_count:0u),
    (unsigned long long)(have_obs?obs.process_error_count:0u));
}

static int run_interactive_with_driver(P0NAudioDriver driver, int physical_audio) {
  P0NEngine e;
  if(!engine_prepare(&e,1))return 2;
  P0NAudioFormat fmt={e.sample_rate,2u,e.block_frames,driver.name};
  if(!driver.prepare(&driver,&fmt,render_callback,&e)||!driver.start(&driver)){
    if(driver.destroy)driver.destroy(&driver);
    return 3;
  }
  P0NAudioFormat actual={0};
  if(driver.query_format)driver.query_format(&driver,&actual);
  printf("{\"type\":\"ready\",\"backend\":\"%s\",\"physicalAudio\":%s,\"sampleRate\":%u,\"quantum\":%u}\n",
    actual.backend_name?actual.backend_name:driver.name,physical_audio?"true":"false",actual.sample_rate,actual.block_frames);fflush(stdout);
  char line[1024];
  uint64_t seq=100u;
  while(fgets(line,sizeof(line),stdin)){
    if(strncmp(line,"HEARTBEAT",9)==0){request_owner_lease_renewal(&e);puts("{\"ok\":true,\"command\":\"heartbeat\"}");}
    else if(strncmp(line,"STATUS",6)==0){print_status(&e,"interactive");print_device_status(&driver);continue;}
    else if(strncmp(line,"STATE ",6)==0){unsigned long long rev;float hz,g;if(sscanf(line+6,"%llu %f %f",&rev,&hz,&g)==3){printf("{\"ok\":%s,\"command\":\"state\"}\n",p0n_state_write(&e.state,rev,hz,g)?"true":"false");}else puts("{\"ok\":false}");}
    else if(strncmp(line,"NOTE ",5)==0){unsigned slot,gen;float hz,g;if(sscanf(line+5,"%u %u %f %f",&slot,&gen,&hz,&g)==4){P0NAttackGroup a={0};a.sequence=seq++;a.note_count=1;stamp_attack_timing(&e,&a,atomic_load_explicit(&e.observed_frame,memory_order_acquire));a.notes[0]=(P0NNote){(uint16_t)slot,gen,hz,g};printf("{\"ok\":%s,\"command\":\"note\"}\n",p0n_ring_push(&e.attacks,&a)?"true":"false");}else puts("{\"ok\":false}");}
    else if(strncmp(line,"RELEASE ",8)==0){unsigned slot,gen;if(sscanf(line+8,"%u %u",&slot,&gen)==2){p0n_release_max(&e.safety,slot,gen);puts("{\"ok\":true,\"command\":\"release\"}");}else puts("{\"ok\":false}");}
    else if(strncmp(line,"PANIC",5)==0){atomic_store(&e.safety.panic_epoch,e.owner_epoch);puts("{\"ok\":true,\"command\":\"panic\"}");}
    else if(strncmp(line,"STALL ",6)==0){unsigned ms=0;if(sscanf(line+6,"%u",&ms)==1&&ms<=5000u){sleep_ms(ms);printf("{\"ok\":true,\"command\":\"stall\",\"ms\":%u}\n",ms);}else puts("{\"ok\":false}");}
    else if(strncmp(line,"QUIT",4)==0)break;
    else puts("{\"ok\":false,\"error\":\"unknown-command\"}");
    fflush(stdout);
  }
  driver.stop(&driver);driver.destroy(&driver);return 0;
}



typedef struct {
  P0NEngine* engine;
  P0NAudioDriver* driver;
  int listen_fd;
  pthread_mutex_t post_master_mutex; /* control/ingress only; never audio */
  atomic_uint post_master_stream_running;
  int post_master_stream_fd;
  uint16_t port;
  char token[33];
  char session_id[17];
  char origin[96];
  int physical_audio;
  atomic_int stop;
  atomic_ullong accepted_requests;
  atomic_ullong rejected_requests;
  atomic_ullong oversized_requests;
  atomic_uint browser_report_seen;
  atomic_uint browser_report_pass;
  atomic_uint browser_report_checks;
  atomic_uint browser_report_failed;
  atomic_uint browser_clock_rtt_us;
  atomic_uint browser_final_revision;
  atomic_uint browser_progress_stage;
  atomic_uint browser_progress_count;
  atomic_ullong browser_session_deadline_ns;
  atomic_ullong browser_heartbeat_count;
  atomic_ullong browser_control_renewal_count;
  atomic_ullong browser_session_expirations;
  atomic_ullong owner_lease_renewals;
  const char* app_html;
  size_t app_html_len;
  float* material_asset_memory[P0N_RFL_MATERIAL_MAX_ASSETS];
  uint64_t material_asset_hash[P0N_RFL_MATERIAL_MAX_ASSETS];
  uint32_t material_asset_frames[P0N_RFL_MATERIAL_MAX_ASSETS];
  uint32_t material_asset_channels[P0N_RFL_MATERIAL_MAX_ASSETS];
  uint32_t material_asset_sample_rate[P0N_RFL_MATERIAL_MAX_ASSETS];
  P0NRflMaterialWindowPlan prepared_material_window;
  uint64_t prepared_material_id;
  uint32_t prepared_material_valid;
  atomic_ullong material_assets_published;
  atomic_ullong material_prepare_accepted;
  atomic_ullong material_submits_accepted;
  atomic_ullong material_submits_rejected;
  atomic_ullong material_direct_transactions_accepted;
  atomic_ullong material_direct_transactions_rejected;
  atomic_ullong material_batches_accepted;
  atomic_ullong material_batches_rejected;
  atomic_ullong material_commits_accepted;
  atomic_ullong material_commits_rejected;
  atomic_ullong material_last_committed_id;
} P0NSidecar;

static int p0n_sidecar_make_hex(char* out,size_t byte_count) {
  unsigned char bytes[32];
  if(byte_count==0u||byte_count>sizeof(bytes)) return 0;
  ssize_t got=getrandom(bytes,byte_count,0);
  if(got!=(ssize_t)byte_count) return 0;
  static const char hex[]="0123456789abcdef";
  for(size_t i=0;i<byte_count;++i){out[i*2u]=hex[bytes[i]>>4];out[i*2u+1u]=hex[bytes[i]&15u];}
  out[byte_count*2u]='\0';
  return 1;
}

static int p0n_sidecar_make_token(char out[33]) { return p0n_sidecar_make_hex(out,16u); }
static int p0n_sidecar_make_session_id(char out[17]) { return p0n_sidecar_make_hex(out,8u); }

static uint64_t p0n_deadline_after_ms(uint32_t ms) {
  return now_ns() + (uint64_t)ms * 1000000ull;
}

static int p0n_sidecar_browser_session_active(P0NSidecar* sc) {
  uint64_t deadline=atomic_load_explicit(&sc->browser_session_deadline_ns,memory_order_acquire);
  if(deadline==0u) return 0;
  if(now_ns()<deadline) return 1;
  if(atomic_compare_exchange_strong_explicit(&sc->browser_session_deadline_ns,&deadline,0u,memory_order_acq_rel,memory_order_acquire))
    atomic_fetch_add_explicit(&sc->browser_session_expirations,1u,memory_order_relaxed);
  return 0;
}

static void p0n_sidecar_browser_session_touch(P0NSidecar* sc) {
  atomic_store_explicit(&sc->browser_session_deadline_ns,p0n_deadline_after_ms(P0N_BROWSER_SESSION_LEASE_MS),memory_order_release);
  atomic_fetch_add_explicit(&sc->browser_control_renewal_count,1u,memory_order_relaxed);
}

static int p0n_sidecar_browser_session_rotate(P0NSidecar* sc) {
  if(!p0n_sidecar_make_token(sc->token)||!p0n_sidecar_make_session_id(sc->session_id)) return 0;
  atomic_store_explicit(&sc->browser_session_deadline_ns,p0n_deadline_after_ms(P0N_BROWSER_SESSION_LEASE_MS),memory_order_release);
  return 1;
}

static int p0n_send_all(int fd,const void* data,size_t size) {
  const char* p=(const char*)data;size_t sent=0u;
  while(sent<size){ssize_t n=send(fd,p+sent,size-sent,MSG_NOSIGNAL);if(n<=0)return 0;sent+=(size_t)n;}
  return 1;
}

static int p0n_http_send_app_html(int fd,const char* body,size_t body_len) {
  char header[1536];
  int n=snprintf(header,sizeof(header),
    "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: %zu\r\nConnection: close\r\n"
    "Cache-Control: no-store\r\nReferrer-Policy: no-referrer\r\nCross-Origin-Resource-Policy: same-origin\r\n"
    "Cross-Origin-Opener-Policy: same-origin\r\nCross-Origin-Embedder-Policy: require-corp\r\n"
    "Content-Security-Policy: default-src 'self' data: blob:; connect-src 'self'; img-src 'self' data: blob:; media-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; worker-src 'self' blob:;\r\n\r\n",
    body_len);
  if(n<0||(size_t)n>=sizeof(header))return 0;
  return p0n_send_all(fd,header,(size_t)n)&&(!body_len||p0n_send_all(fd,body,body_len));
}

static int p0n_http_send(int fd,int code,const char* reason,const char* origin,const char* body) {
  char header[1024];
  size_t body_len=body?strlen(body):0u;
  const char* allow_origin=p0n_standalone_file_cors?"null":(origin?origin:"null");
  int n=snprintf(header,sizeof(header),
    "HTTP/1.1 %d %s\r\nContent-Type: application/json\r\nContent-Length: %zu\r\nConnection: close\r\n"
    "Cache-Control: no-store\r\nAccess-Control-Allow-Origin: %s\r\nAccess-Control-Allow-Private-Network: true\r\nVary: Origin\r\n\r\n",
    code,reason,body_len,allow_origin);
  if(n<0||(size_t)n>=sizeof(header))return 0;
  if(!p0n_send_all(fd,header,(size_t)n))return 0;
  if(body_len&&!p0n_send_all(fd,body,body_len))return 0;
  return 1;
}

static int p0n_http_send_preflight(int fd) {
  const char* response =
    "HTTP/1.1 204 No Content\r\n"
    "Content-Length: 0\r\nConnection: close\r\nCache-Control: no-store\r\n"
    "Access-Control-Allow-Origin: null\r\nAccess-Control-Allow-Private-Network: true\r\nVary: Origin\r\n"
    "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
    "Access-Control-Allow-Headers: Content-Type, X-Xensonar-Token, X-Xensonar-Session, X-Xensonar-Material-Hash, X-Xensonar-Material-Frames, X-Xensonar-Material-Channels, X-Xensonar-Material-Sample-Rate, X-Xensonar-PCM-Generation, X-Xensonar-PCM-Sequence, X-Xensonar-PCM-Start-Frame, X-Xensonar-PCM-Frames, X-Xensonar-PCM-Channels, X-Xensonar-PCM-Sample-Rate\r\n"
    "Access-Control-Max-Age: 600\r\n\r\n";
  return p0n_send_all(fd,response,strlen(response));
}

static int p0n_http_send_api_error(int fd,int code,const char* reason,const char* origin,const char* error_id) {
  char body[160];
  int n=snprintf(body,sizeof(body),"{\"ok\":false,\"error\":\"%s\"}",error_id?error_id:"");
  if(n<0||(size_t)n>=sizeof(body))return 0;
  return p0n_http_send(fd,code,reason,origin,body);
}

static int p0n_http_send_html(int fd,int code,const char* reason,const char* body) {
  char header[1024];size_t body_len=body?strlen(body):0u;
  int n=snprintf(header,sizeof(header),
    "HTTP/1.1 %d %s\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: %zu\r\nConnection: close\r\n"
    "Cache-Control: no-store\r\nReferrer-Policy: no-referrer\r\nCross-Origin-Resource-Policy: same-origin\r\n"
    "Content-Security-Policy: default-src 'self'; connect-src 'self'; style-src 'unsafe-inline'; script-src 'self' 'unsafe-inline'\r\n\r\n",
    code,reason,body_len);
  if(n<0||(size_t)n>=sizeof(header))return 0;
  if(!p0n_send_all(fd,header,(size_t)n))return 0;
  if(body_len&&!p0n_send_all(fd,body,body_len))return 0;
  return 1;
}

static int p0n_http_send_js(int fd,int code,const char* reason,const char* body) {
  char header[1280];size_t body_len=body?strlen(body):0u;
  const char* cors=p0n_standalone_file_cors?
    "Cross-Origin-Resource-Policy: cross-origin\r\nAccess-Control-Allow-Origin: null\r\nAccess-Control-Allow-Private-Network: true\r\nVary: Origin\r\n":
    "Cross-Origin-Resource-Policy: same-origin\r\n";
  int n=snprintf(header,sizeof(header),
    "HTTP/1.1 %d %s\r\nContent-Type: text/javascript; charset=utf-8\r\nContent-Length: %zu\r\nConnection: close\r\n"
    "Cache-Control: no-store\r\nReferrer-Policy: no-referrer\r\n%s\r\n",
    code,reason,body_len,cors);
  if(n<0||(size_t)n>=sizeof(header))return 0;
  if(!p0n_send_all(fd,header,(size_t)n))return 0;
  if(body_len&&!p0n_send_all(fd,body,body_len))return 0;
  return 1;
}

static int p0n_http_header_value(const char* req,const char* name,char* out,size_t out_cap) {
  size_t name_len=strlen(name);
  const char* p=req;
  while((p=strstr(p,"\r\n"))!=NULL){
    p+=2;
    if(*p=='\r'||*p=='\0')break;
    if(strncasecmp(p,name,name_len)==0&&p[name_len]==':'){
      p+=name_len+1u;while(*p==' '||*p=='\t')++p;
      const char* e=strstr(p,"\r\n");if(!e)return 0;
      size_t len=(size_t)(e-p);if(len+1u>out_cap)return 0;
      memcpy(out,p,len);out[len]='\0';return 1;
    }
  }
  return 0;
}

static int p0n_form_value(const char* body,const char* key,char* out,size_t out_cap) {
  size_t key_len=strlen(key);
  const char* p=body;
  while(p&&*p){
    if(strncmp(p,key,key_len)==0&&p[key_len]=='='){
      p+=key_len+1u;const char* e=strchr(p,'&');if(!e)e=p+strlen(p);
      size_t len=(size_t)(e-p);if(len+1u>out_cap)return 0;
      memcpy(out,p,len);out[len]='\0';return 1;
    }
    p=strchr(p,'&');if(p)++p;
  }
  return 0;
}

static int p0n_parse_u64(const char* body,const char* key,uint64_t* out){
  char tmp[64];if(!p0n_form_value(body,key,tmp,sizeof(tmp)))return 0;
  char* end=NULL;errno=0;unsigned long long v=strtoull(tmp,&end,10);
  if(errno||!end||*end!='\0') return 0;
  *out=(uint64_t)v;
  return 1;
}
static int p0n_parse_u32(const char* body,const char* key,uint32_t* out){
  uint64_t v=0;
  if(!p0n_parse_u64(body,key,&v)||v>UINT32_MAX) return 0;
  *out=(uint32_t)v;
  return 1;
}
static int p0n_parse_float(const char* body,const char* key,float* out){
  char tmp[64];if(!p0n_form_value(body,key,tmp,sizeof(tmp)))return 0;
  char* end=NULL;errno=0;float v=strtof(tmp,&end);
  if(errno||!end||*end!='\0'||!isfinite(v)) return 0;
  *out=v;
  return 1;
}


static uint32_t p0n_le_u32(const unsigned char* p){return (uint32_t)p[0]|((uint32_t)p[1]<<8)|((uint32_t)p[2]<<16)|((uint32_t)p[3]<<24);}
static uint64_t p0n_le_u64(const unsigned char* p){uint64_t v=0u;for(unsigned i=0;i<8u;++i)v|=(uint64_t)p[i]<<(8u*i);return v;}
static float p0n_le_f32(const unsigned char* p){uint32_t u=p0n_le_u32(p);float v;memcpy(&v,&u,sizeof(v));return v;}
static double p0n_le_f64(const unsigned char* p){uint64_t u=p0n_le_u64(p);double v;memcpy(&v,&u,sizeof(v));return v;}

static int p0n_parse_header_u32(const char* req,const char* name,uint32_t* out){char b[64];if(!p0n_http_header_value(req,name,b,sizeof(b)))return 0;char* e=NULL;errno=0;unsigned long v=strtoul(b,&e,10);if(errno||!e||*e!='\0'||v>UINT32_MAX)return 0;*out=(uint32_t)v;return 1;}
static int p0n_parse_header_u64(const char* req,const char* name,uint64_t* out){char b[64];if(!p0n_http_header_value(req,name,b,sizeof(b)))return 0;char* e=NULL;errno=0;unsigned long long v=strtoull(b,&e,10);if(errno||!e||*e!='\0')return 0;*out=(uint64_t)v;return 1;}
static int p0n_parse_header_u64_hex(const char* req,const char* name,uint64_t* out){char b[64];if(!p0n_http_header_value(req,name,b,sizeof(b)))return 0;char* e=NULL;errno=0;unsigned long long v=strtoull(b,&e,16);if(errno||!e||*e!='\0')return 0;*out=(uint64_t)v;return 1;}


/* 398 post-master persistent PCM stream -----------------------------------
   The HTTP control plane stays unchanged, but PCM blocks use one dedicated
   WebSocket. This removes one TCP connect/close cycle per ~21 ms audio block.
   The socket thread never touches musical state: it validates strict block
   identity and feeds the bounded native post-master ring only. */

#define P0N_POST_MASTER_WS_MAX_PAYLOAD (32u + (size_t)P0N_POST_MASTER_MAX_BLOCK_FRAMES * (size_t)P0N_POST_MASTER_CHANNELS * sizeof(float))
#define P0N_POST_MASTER_WS_TYPE_PCM 1u
#define P0N_POST_MASTER_WS_TYPE_COMMIT 2u
#define P0N_POST_MASTER_WS_TYPE_STOP 3u
#define P0N_POST_MASTER_WS_TYPE_BARRIER 4u

static uint32_t p0n_rotl32(uint32_t x,unsigned n){return (x<<n)|(x>>(32u-n));}

typedef struct {uint32_t h[5];uint64_t bit_len;unsigned char block[64];size_t used;} P0NSha1;
static void p0n_sha1_init(P0NSha1* c){c->h[0]=0x67452301u;c->h[1]=0xefcdab89u;c->h[2]=0x98badcfeu;c->h[3]=0x10325476u;c->h[4]=0xc3d2e1f0u;c->bit_len=0u;c->used=0u;}
static void p0n_sha1_block(P0NSha1* c,const unsigned char b[64]){
  uint32_t w[80];for(unsigned i=0;i<16u;++i)w[i]=((uint32_t)b[i*4u]<<24)|((uint32_t)b[i*4u+1u]<<16)|((uint32_t)b[i*4u+2u]<<8)|(uint32_t)b[i*4u+3u];
  for(unsigned i=16u;i<80u;++i)w[i]=p0n_rotl32(w[i-3u]^w[i-8u]^w[i-14u]^w[i-16u],1u);
  uint32_t a=c->h[0],d=c->h[3],e=c->h[4],bb=c->h[1],cc=c->h[2];
  for(unsigned i=0;i<80u;++i){uint32_t f,k;if(i<20u){f=(bb&cc)|((~bb)&d);k=0x5a827999u;}else if(i<40u){f=bb^cc^d;k=0x6ed9eba1u;}else if(i<60u){f=(bb&cc)|(bb&d)|(cc&d);k=0x8f1bbcdcu;}else{f=bb^cc^d;k=0xca62c1d6u;}uint32_t t=p0n_rotl32(a,5u)+f+e+k+w[i];e=d;d=cc;cc=p0n_rotl32(bb,30u);bb=a;a=t;}
  c->h[0]+=a;c->h[1]+=bb;c->h[2]+=cc;c->h[3]+=d;c->h[4]+=e;
}
static void p0n_sha1_update(P0NSha1* c,const void* data,size_t len){const unsigned char* p=(const unsigned char*)data;c->bit_len+=(uint64_t)len*8u;while(len){size_t n=64u-c->used;if(n>len)n=len;memcpy(c->block+c->used,p,n);c->used+=n;p+=n;len-=n;if(c->used==64u){p0n_sha1_block(c,c->block);c->used=0u;}}}
static void p0n_sha1_final(P0NSha1* c,unsigned char out[20]){c->block[c->used++]=0x80u;if(c->used>56u){while(c->used<64u)c->block[c->used++]=0u;p0n_sha1_block(c,c->block);c->used=0u;}while(c->used<56u)c->block[c->used++]=0u;for(unsigned i=0;i<8u;++i)c->block[63u-i]=(unsigned char)((c->bit_len>>(8u*i))&0xffu);p0n_sha1_block(c,c->block);for(unsigned i=0;i<5u;++i){out[i*4u]=(unsigned char)(c->h[i]>>24);out[i*4u+1u]=(unsigned char)(c->h[i]>>16);out[i*4u+2u]=(unsigned char)(c->h[i]>>8);out[i*4u+3u]=(unsigned char)c->h[i];}}

static int p0n_base64_encode(const unsigned char* in,size_t len,char* out,size_t cap){static const char t[]="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";size_t need=4u*((len+2u)/3u);if(cap<need+1u)return 0;size_t o=0u;for(size_t i=0u;i<len;i+=3u){uint32_t v=(uint32_t)in[i]<<16;if(i+1u<len)v|=(uint32_t)in[i+1u]<<8;if(i+2u<len)v|=in[i+2u];out[o++]=t[(v>>18)&63u];out[o++]=t[(v>>12)&63u];out[o++]=(i+1u<len)?t[(v>>6)&63u]:'=';out[o++]=(i+2u<len)?t[v&63u]:'=';}out[o]='\0';return 1;}

static int p0n_ws_accept_key(const char* client_key,char out[64]){if(!client_key||!*client_key)return 0;char combined[192];int n=snprintf(combined,sizeof(combined),"%s258EAFA5-E914-47DA-95CA-C5AB0DC85B11",client_key);if(n<0||(size_t)n>=sizeof(combined))return 0;P0NSha1 c;unsigned char digest[20];p0n_sha1_init(&c);p0n_sha1_update(&c,combined,(size_t)n);p0n_sha1_final(&c,digest);return p0n_base64_encode(digest,sizeof(digest),out,64u);}

static int p0n_ws_send_upgrade(int fd,const char* accept_key){char h[512];int n=snprintf(h,sizeof(h),"HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: %s\r\n\r\n",accept_key);return n>0&&(size_t)n<sizeof(h)&&p0n_send_all(fd,h,(size_t)n);}
static int p0n_ws_send_frame(int fd,unsigned opcode,const void* payload,size_t len){unsigned char h[10];size_t hn=0u;h[hn++]=(unsigned char)(0x80u|(opcode&0x0fu));if(len<126u){h[hn++]=(unsigned char)len;}else if(len<=65535u){h[hn++]=126u;h[hn++]=(unsigned char)(len>>8);h[hn++]=(unsigned char)len;}else{return 0;}return p0n_send_all(fd,h,hn)&&(!len||p0n_send_all(fd,payload,len));}
static int p0n_ws_send_text(int fd,const char* text){return p0n_ws_send_frame(fd,1u,text,strlen(text));}
static int p0n_recv_exact(int fd,void* dst,size_t len){unsigned char* p=(unsigned char*)dst;size_t got=0u;while(got<len){ssize_t n=recv(fd,p+got,len-got,0);if(n<=0)return 0;got+=(size_t)n;}return 1;}
static int p0n_ws_recv_frame(int fd,unsigned* opcode,unsigned char* payload,size_t cap,size_t* out_len){unsigned char h[2];if(!p0n_recv_exact(fd,h,2u))return 0;if((h[0]&0x80u)==0u)return -1;*opcode=h[0]&0x0fu;uint64_t len=h[1]&0x7fu;if(len==126u){unsigned char x[2];if(!p0n_recv_exact(fd,x,2u))return 0;len=((uint64_t)x[0]<<8)|x[1];}else if(len==127u){unsigned char x[8];if(!p0n_recv_exact(fd,x,8u))return 0;len=0u;for(unsigned i=0;i<8u;++i)len=(len<<8)|x[i];}if((h[1]&0x80u)==0u||len>cap)return -1;unsigned char mask[4];if(!p0n_recv_exact(fd,mask,4u))return 0;if(len&&!p0n_recv_exact(fd,payload,(size_t)len))return 0;for(size_t i=0u;i<(size_t)len;++i)payload[i]^=mask[i&3u];*out_len=(size_t)len;return 1;}
static int p0n_query_value(const char* query,const char* key,char* out,size_t cap){return p0n_form_value(query,key,out,cap);}
static int p0n_query_u32(const char* query,const char* key,uint32_t* out){uint64_t v=0u;char b[64];if(!p0n_query_value(query,key,b,sizeof(b)))return 0;char* e=NULL;errno=0;unsigned long long x=strtoull(b,&e,10);if(errno||!e||*e!='\0'||x>UINT32_MAX)return 0;v=x;*out=(uint32_t)v;return 1;}

/* Every producer is serialized outside the callback. Stop acknowledges a
   subsequent silent callback, not just a write to a control flag. */
static int p0n_post_master_stop_confirmed(P0NSidecar* sc, uint32_t generation) {
  pthread_mutex_lock(&sc->post_master_mutex);
  int requested = p0n_post_master_stop(&sc->engine->post_master, generation);
  pthread_mutex_unlock(&sc->post_master_mutex);
  if (!requested) return 0;
  const uint64_t deadline = now_ns() + 500000000ull;
  while (!p0n_post_master_stopped(&sc->engine->post_master, generation)) {
    if (now_ns() >= deadline) return 0;
    sleep_ms(1u);
  }
  return 1;
}
static int p0n_post_master_send_state(int fd, P0NSidecar* sc, uint32_t generation, const char* type, int confirmed) {
  P0NPostMasterPcm* p = &sc->engine->post_master;
  char msg[384];
  uint32_t minimum = atomic_load(&p->min_fill_frames);
  snprintf(msg, sizeof(msg), "{\"type\":\"%s\",\"generation\":%u,\"confirmed\":%s,\"fillFrames\":%u,\"minFillFrames\":%u,\"fault\":%s}",
    type, generation, confirmed ? "true" : "false", p0n_post_master_available_read(p),
    minimum == UINT32_MAX ? 0u : minimum, atomic_load(&p->fault_latched) ? "true" : "false");
  return p0n_ws_send_text(fd, msg);
}
static void p0n_post_master_stream_fault(int fd, uint32_t generation, const char* reason) {
  char msg[192];
  snprintf(msg, sizeof(msg), "{\"type\":\"FAULT\",\"generation\":%u,\"error\":\"%s\"}", generation, reason);
  p0n_ws_send_text(fd, msg);
}
typedef struct { P0NSidecar* sc; int fd; uint32_t generation; } P0NPostMasterWsClient;
static void* p0n_post_master_ws_thread(void* userdata) {
  P0NPostMasterWsClient* c = (P0NPostMasterWsClient*)userdata;
  P0NSidecar* sc = c->sc;
  int fd = c->fd;
  uint32_t generation = c->generation;
  free(c);
  /* Float payload alignment is explicit, rather than casting an arbitrary byte array. */
  union { float align; unsigned char bytes[P0N_POST_MASTER_WS_MAX_PAYLOAD]; } packet;
  unsigned char* payload = packet.bytes;
  unsigned accepted = 0u;
  while (!atomic_load(&sc->stop)) {
    unsigned opcode = 0u; size_t len = 0u;
    int rr = p0n_ws_recv_frame(fd, &opcode, payload, sizeof(packet.bytes), &len);
    if (rr <= 0 || opcode == 8u) break;
    if (opcode == 9u) { if (!p0n_ws_send_frame(fd, 10u, payload, len)) break; continue; }
    if (opcode != 2u || len < 8u) { p0n_post_master_stream_fault(fd, generation, "bad-frame"); break; }
    uint32_t type = p0n_le_u32(payload);
    if (p0n_le_u32(payload + 4u) != generation || generation != atomic_load(&sc->engine->post_master.generation)) {
      p0n_post_master_stream_fault(fd, generation, "generation-mismatch"); break;
    }
    p0n_sidecar_browser_session_touch(sc);
    if (type == P0N_POST_MASTER_WS_TYPE_PCM) {
      if (len < 32u) { p0n_post_master_stream_fault(fd, generation, "short-pcm"); break; }
      uint64_t sequence = p0n_le_u64(payload + 8u), start_frame = p0n_le_u64(payload + 16u);
      uint32_t frames = p0n_le_u32(payload + 24u), sample_rate = p0n_le_u32(payload + 28u);
      if (!frames || frames > P0N_POST_MASTER_MAX_BLOCK_FRAMES || sample_rate != sc->engine->sample_rate ||
          len != 32u + (size_t)frames * 2u * sizeof(float)) {
        p0n_post_master_stream_fault(fd, generation, "bad-pcm-shape"); break;
      }
      pthread_mutex_lock(&sc->post_master_mutex);
      int rc = p0n_post_master_push(&sc->engine->post_master, generation, sequence, start_frame, (const float*)(payload + 32u), frames);
      pthread_mutex_unlock(&sc->post_master_mutex);
      // Waiting on a full ring would hide a growing clock/latency fault.
      if (rc <= 0) { p0n_post_master_stream_fault(fd, generation, rc == 0 ? "native-pcm-backlog" : "pcm-rejected-or-underrun"); break; }
      if ((++accepted & 31u) == 0u && !p0n_post_master_send_state(fd, sc, generation, "PROGRESS", 0)) break;
    } else if (type == P0N_POST_MASTER_WS_TYPE_COMMIT) {
      pthread_mutex_lock(&sc->post_master_mutex);
      int committed = p0n_post_master_commit(&sc->engine->post_master, generation);
      pthread_mutex_unlock(&sc->post_master_mutex);
      if (!committed) { p0n_post_master_stream_fault(fd, generation, "not-prefilled"); break; }
      if (!p0n_post_master_send_state(fd, sc, generation, "COMMITTED", 0)) break;
    } else if (type == P0N_POST_MASTER_WS_TYPE_STOP) {
      int confirmed = p0n_post_master_stop_confirmed(sc, generation);
      p0n_post_master_send_state(fd, sc, generation, "STOPPED", confirmed);
      break;
    } else if (type == P0N_POST_MASTER_WS_TYPE_BARRIER) {
      if (!p0n_post_master_send_state(fd, sc, generation, "BARRIER", 0)) break;
    } else { p0n_post_master_stream_fault(fd, generation, "unknown-message"); break; }
  }
  p0n_post_master_stop_confirmed(sc, generation);
  pthread_mutex_lock(&sc->post_master_mutex);
  sc->post_master_stream_fd = -1;
  close(fd);
  pthread_mutex_unlock(&sc->post_master_mutex);
  atomic_store_explicit(&sc->post_master_stream_running, 0u, memory_order_release);
  return NULL;
}

static int p0n_rfl_material_ring_has_capacity(P0NRflMaterialRenderer* r){const uint32_t w=atomic_load_explicit(&r->write_index,memory_order_relaxed);const uint32_t rd=atomic_load_explicit(&r->read_index,memory_order_acquire);return ((w+1u)%P0N_RFL_MATERIAL_WINDOW_RING)!=rd;}
static int p0n_rfl_material_can_commit(P0NRflMaterialRenderer* r,const P0NRflMaterialWindowPlan* p){if(!r||!p||p->generation==0u||p->asset_slot>=P0N_RFL_MATERIAL_MAX_ASSETS||p->grain_count==0u||p->grain_count>P0N_RFL_MATERIAL_MAX_GRAINS_PER_WINDOW||!(p->output_gain>0.0f))return 0;if(atomic_load_explicit(&r->terminal,memory_order_acquire))return 0;if(!atomic_load_explicit(&r->assets[p->asset_slot].ready,memory_order_acquire))return 0;const uint32_t g=atomic_load_explicit(&r->active_generation,memory_order_acquire);if(g!=0u&&g!=p->generation)return 0;return p0n_rfl_material_ring_has_capacity(r);}

#ifdef P0N_GENESIS_IMPLANT
static int p0n_parse_wave_resolved_plan(const unsigned char* body,size_t len,uint64_t* sequence,uint64_t* source_frame,xen_tone_plan* out){
  if(!body||!sequence||!source_frame||!out||len<32u)return 0;
  if(p0n_le_u32(body)!=0x32535758u||p0n_le_u32(body+4)!=1u)return 0;
  const uint32_t count=p0n_le_u32(body+24),flags=p0n_le_u32(body+28);
  if(count==0u||count>XEN_TONE_PLAN_MAX||flags!=0u||len!=32u+(size_t)count*32u)return 0;
  *sequence=p0n_le_u64(body+8);*source_frame=p0n_le_u64(body+16);
  if(*sequence==0u)return 0;
  memset(out,0,sizeof(*out));out->tone_count=count;out->token=(uint32_t)(*sequence&0xffffffffu);if(out->token==0u)out->token=1u;
  const unsigned char* q=body+32u;
  for(uint32_t i=0u;i<count;++i,q+=32u){
    xen_tone_desc* t=&out->tones[i];
    t->frequency_hz=p0n_le_f32(q);t->gain=p0n_le_f32(q+4);t->cutoff_hz=p0n_le_f32(q+8);t->resonance=p0n_le_f32(q+12);
    t->delay_frames=p0n_le_u32(q+16);t->duration_frames=p0n_le_u32(q+20);t->waveform=p0n_le_u32(q+24);
    if(p0n_le_u32(q+28)!=0u||!isfinite(t->frequency_hz)||t->frequency_hz<20.0f||t->frequency_hz>24000.0f||!isfinite(t->gain)||t->gain<=0.0f||t->gain>1.0f||!isfinite(t->cutoff_hz)||t->cutoff_hz<=0.0f||!isfinite(t->resonance)||t->resonance<=0.0f||t->duration_frames<2u||t->waveform>XEN_OSC_SQUARE)return 0;
  }
  return 1;
}
#endif

static int p0n_parse_rfl_material_window(const unsigned char* body,size_t len,P0NRflMaterialWindowPlan* out,uint32_t* routing_flags){
  if(!body||!out||len<48u)return 0;
  const uint32_t magic=p0n_le_u32(body),version=p0n_le_u32(body+4);
  if(magic!=0x314c4652u||version!=1u)return 0;
  memset(out,0,sizeof(*out));out->sequence=p0n_le_u64(body+8);out->generation=p0n_le_u32(body+16);out->asset_slot=p0n_le_u32(body+20);out->deadline_frame=p0n_le_u64(body+24);out->output_gain=p0n_le_f32(body+32);const uint32_t count=p0n_le_u32(body+36);const uint32_t flags=p0n_le_u32(body+40);if(routing_flags)*routing_flags=flags;
  if(out->sequence==0u||out->generation==0u||out->asset_slot>=P0N_RFL_MATERIAL_MAX_ASSETS||count==0u||count>P0N_RFL_MATERIAL_MAX_GRAINS_PER_WINDOW||!isfinite(out->output_gain)||out->output_gain<=0.0f||out->output_gain>4.0f||len!=48u+(size_t)count*24u)return 0;
  out->grain_count=count;const unsigned char* p=body+48u;for(uint32_t i=0u;i<count;++i,p+=24u){out->grains[i].start_frame=p0n_le_u64(p);out->grains[i].source_start_frame=p0n_le_f64(p+8);out->grains[i].playback_rate=p0n_le_f32(p+16);out->grains[i].duration_frames=p0n_le_u32(p+20);if(!isfinite(out->grains[i].source_start_frame)||out->grains[i].source_start_frame<0.0||!isfinite(out->grains[i].playback_rate)||out->grains[i].playback_rate<=0.0f||out->grains[i].playback_rate>16.0f||out->grains[i].duration_frames<2u)return 0;}
  return (flags&1u)!=0u;
}

static int p0n_parse_rfl_material_batch(const unsigned char* body,size_t len,P0NRflMaterialWindowPlan* out,uint32_t* out_count){
  if(!body||!out||!out_count||len<16u)return 0;
  if(p0n_le_u32(body)!=0x324c4652u||p0n_le_u32(body+4)!=1u)return 0;
  const uint32_t count=p0n_le_u32(body+8);
  if(count==0u||count>P0N_RFL_MATERIAL_MAX_BATCH_WINDOWS||p0n_le_u32(body+12)!=0u)return 0;
  size_t off=16u;
  for(uint32_t i=0u;i<count;++i){
    if(off+48u>len)return 0;
    const uint32_t grains=p0n_le_u32(body+off+36u);
    if(grains==0u||grains>P0N_RFL_MATERIAL_MAX_GRAINS_PER_WINDOW)return 0;
    const size_t bytes=48u+(size_t)grains*24u;
    if(off+bytes>len)return 0;
    uint32_t flags=0u;
    if(!p0n_parse_rfl_material_window(body+off,bytes,&out[i],&flags)||flags!=3u)return 0;
    off+=bytes;
  }
  if(off!=len)return 0;
  *out_count=count;
  return 1;
}

static void p0n_sidecar_status(P0NSidecar* sc,char* out,size_t out_cap) {
  P0NEngine* e=sc->engine;P0NAudioFormat fmt={0};P0NCallbackObservation obs={0};
  int have_fmt=sc->driver->query_format&&sc->driver->query_format(sc->driver,&fmt);
  int have_obs=sc->driver->query_last_observation&&sc->driver->query_last_observation(sc->driver,&obs);
  uint64_t mailbox_revision=0u;float mailbox_root=0.0f,mailbox_gain=0.0f;
  p0n_state_read(&e->state,&mailbox_revision,&mailbox_root,&mailbox_gain);
  uint32_t ws_queue_depth=p0n_ws_ring_depth(&e->wave_starter.ring);
  uint64_t ws_attacks_started=atomic_load(&e->wave_starter.attacks_started);
  uint64_t ws_attacks_rejected=atomic_load(&e->wave_starter.attacks_rejected);
  uint64_t ws_attacks_stale=atomic_load(&e->wave_starter.attacks_stale);
  uint32_t ws_active_voices=atomic_load(&e->wave_starter.observed_active_voices);
  uint32_t ws_peak_micros=atomic_load(&e->wave_starter.peak_max_micros);
  uint64_t ws_nonzero_callbacks=atomic_load(&e->wave_starter.nonzero_callbacks);
  uint64_t ws_voices_exhausted=atomic_load(&e->wave_starter.voices_exhausted);
#ifdef P0N_GENESIS_IMPLANT
  xen_telemetry gt; xen_engine_telemetry(e->genesis,&gt);
  ws_queue_depth=gt.sched_occupancy;
  ws_attacks_started=gt.tone_plans_executed;
  ws_attacks_rejected=gt.dropped_stale+gt.dropped_epoch+gt.dropped_queue_full+gt.dropped_sched_full+gt.tone_plans_denied_no_voice;
  ws_attacks_stale=gt.dropped_stale;
  ws_active_voices=gt.voices_interactive;
  ws_peak_micros=(uint32_t)(fmaxf(fabsf(gt.peak_l),fabsf(gt.peak_r))*1000000.0f);
  ws_nonzero_callbacks=gt.frame>0u?1u:0u;
  ws_voices_exhausted=gt.attacks_denied_no_voice;
#endif
  snprintf(out,out_cap,
    "{\"ok\":true,\"sessionId\":\"%s\",\"ownerEpoch\":%u,\"frame\":%llu,\"callbacks\":%llu,\"programStarts\":%llu,\"mailboxRevision\":%llu,"
    "\"queueDepth\":%u,\"transportStarted\":%u,\"transportRejected\":%u,\"transportStale\":%u,\"ownerClosed\":%u,"
    "\"waveStarterQueueDepth\":%u,\"waveStarterAttacksStarted\":%llu,\"waveStarterAttacksRejected\":%llu,\"waveStarterAttacksStale\":%llu,"
    "\"waveStarterActiveVoices\":%u,\"waveStarterPeakMaxMicros\":%u,\"waveStarterNonzeroCallbacks\":%llu,\"waveStarterVoiceExhausted\":%llu,"
    "\"externalVoicesStarted\":%llu,\"activeVoices\":%u,\"renderPeakMaxMicros\":%u,\"renderNonzeroCallbacks\":%llu,"
    "\"sampleRate\":%u,\"channels\":%u,\"deviceQuantumFrames\":%u,\"xrunCount\":%llu,\"processErrors\":%llu,"
    "\"acceptedRequests\":%llu,\"rejectedRequests\":%llu,\"browserReportSeen\":%u,\"browserReportPass\":%u,"
    "\"browserReportChecks\":%u,\"browserReportFailed\":%u,\"browserClockRttUs\":%u,\"browserFinalRevision\":%u,"
    "\"browserProgressStage\":%u,\"browserProgressCount\":%u,\"browserSessionLeaseMs\":%u,\"browserSessionActive\":%s,"
    "\"browserHeartbeatCount\":%llu,\"browserControlRenewals\":%llu,\"browserSessionExpirations\":%llu,\"ownerLeaseRenewals\":%llu,"
    "\"rflMaterialAssetsPublished\":%llu,\"rflMaterialPrepareAccepted\":%llu,\"rflMaterialSubmitsAccepted\":%llu,\"rflMaterialSubmitsRejected\":%llu,\"rflMaterialDirectTransactionsAccepted\":%llu,\"rflMaterialDirectTransactionsRejected\":%llu,\"rflMaterialBatchesAccepted\":%llu,\"rflMaterialBatchesRejected\":%llu,\"rflMaterialCommitsAccepted\":%llu,\"rflMaterialCommitsRejected\":%llu,\"rflMaterialLastCommittedId\":%llu,"
    "\"rflMaterialWindowsAccepted\":%llu,\"rflMaterialWindowsStale\":%llu,\"rflMaterialGrainsStarted\":%llu,\"rflMaterialActiveVoices\":%u,\"rflMaterialNonzeroCallbacks\":%llu,\"rflMaterialGeneration\":%u,"
    "\"postMasterEnabled\":%s,\"postMasterCommitted\":%s,\"postMasterFault\":%s,\"postMasterGeneration\":%u,"
    "\"postMasterFillFrames\":%u,\"postMasterPrefillFrames\":%u,\"postMasterMinFillFrames\":%u,\"postMasterMaxFillFrames\":%u,"
    "\"postMasterIngressBlocks\":%llu,\"postMasterIngressFrames\":%llu,\"postMasterRenderedFrames\":%llu,"
    "\"postMasterUnderrunCallbacks\":%llu,\"postMasterUnderrunFrames\":%llu,\"postMasterOverflowRejects\":%llu,\"postMasterContinuityErrors\":%llu,\"postMasterDuplicateBlocks\":%llu}",
    sc->session_id,e->owner_epoch,
    (unsigned long long)atomic_load_explicit(&e->observed_frame,memory_order_acquire),
    (unsigned long long)atomic_load_explicit(&e->callback_count,memory_order_acquire),
    (unsigned long long)atomic_load_explicit(&e->observed_program_starts,memory_order_acquire),
    (unsigned long long)mailbox_revision,
    p0n_ring_depth(&e->attacks),atomic_load(&e->transport_notes_started),atomic_load(&e->transport_notes_rejected),
    atomic_load(&e->transport_notes_stale),atomic_load(&e->observed_owner_closed),
    ws_queue_depth,
    (unsigned long long)ws_attacks_started,(unsigned long long)ws_attacks_rejected,
    (unsigned long long)ws_attacks_stale,ws_active_voices,
    ws_peak_micros,(unsigned long long)ws_nonzero_callbacks,
    (unsigned long long)ws_voices_exhausted,
    (unsigned long long)atomic_load(&e->observed_external_voices_started),atomic_load(&e->observed_active_voices),
    atomic_load(&e->render_peak_max_micros),(unsigned long long)atomic_load(&e->render_nonzero_callbacks),
    have_fmt?fmt.sample_rate:0u,have_fmt?fmt.channels:0u,have_fmt?fmt.block_frames:0u,
    (unsigned long long)(have_obs?obs.underrun_count:0u),(unsigned long long)(have_obs?obs.process_error_count:0u),
    (unsigned long long)atomic_load(&sc->accepted_requests),(unsigned long long)atomic_load(&sc->rejected_requests),
    atomic_load(&sc->browser_report_seen),atomic_load(&sc->browser_report_pass),atomic_load(&sc->browser_report_checks),
    atomic_load(&sc->browser_report_failed),atomic_load(&sc->browser_clock_rtt_us),atomic_load(&sc->browser_final_revision),
    atomic_load(&sc->browser_progress_stage),atomic_load(&sc->browser_progress_count),P0N_BROWSER_SESSION_LEASE_MS,
    p0n_sidecar_browser_session_active(sc)?"true":"false",
    (unsigned long long)atomic_load(&sc->browser_heartbeat_count),(unsigned long long)atomic_load(&sc->browser_control_renewal_count),
    (unsigned long long)atomic_load(&sc->browser_session_expirations),(unsigned long long)atomic_load(&sc->owner_lease_renewals),
    (unsigned long long)atomic_load(&sc->material_assets_published),(unsigned long long)atomic_load(&sc->material_prepare_accepted),
    (unsigned long long)atomic_load(&sc->material_submits_accepted),(unsigned long long)atomic_load(&sc->material_submits_rejected),
    (unsigned long long)atomic_load(&sc->material_direct_transactions_accepted),(unsigned long long)atomic_load(&sc->material_direct_transactions_rejected),
    (unsigned long long)atomic_load(&sc->material_batches_accepted),(unsigned long long)atomic_load(&sc->material_batches_rejected),
    (unsigned long long)atomic_load(&sc->material_commits_accepted),(unsigned long long)atomic_load(&sc->material_commits_rejected),
    (unsigned long long)atomic_load(&sc->material_last_committed_id),
    (unsigned long long)atomic_load(&e->rfl_material.windows_accepted),(unsigned long long)atomic_load(&e->rfl_material.windows_stale),
    (unsigned long long)atomic_load(&e->rfl_material.grains_started),atomic_load(&e->rfl_material.observed_active_voices),
    (unsigned long long)atomic_load(&e->rfl_material.nonzero_callbacks),atomic_load(&e->rfl_material.active_generation),
    atomic_load_explicit(&e->post_master.enabled,memory_order_acquire)?"true":"false",
    atomic_load_explicit(&e->post_master.committed,memory_order_acquire)?"true":"false",
    atomic_load_explicit(&e->post_master.fault_latched,memory_order_acquire)?"true":"false",
    atomic_load_explicit(&e->post_master.generation,memory_order_acquire),
    p0n_post_master_available_read(&e->post_master),atomic_load(&e->post_master.prefill_frames),
    atomic_load(&e->post_master.min_fill_frames)==UINT32_MAX?0u:atomic_load(&e->post_master.min_fill_frames),atomic_load(&e->post_master.max_fill_frames),
    (unsigned long long)atomic_load(&e->post_master.ingress_blocks),(unsigned long long)atomic_load(&e->post_master.ingress_frames),
    (unsigned long long)atomic_load(&e->post_master.rendered_frames),(unsigned long long)atomic_load(&e->post_master.underrun_callbacks),
    (unsigned long long)atomic_load(&e->post_master.underrun_frames),(unsigned long long)atomic_load(&e->post_master.overflow_rejects),
    (unsigned long long)atomic_load(&e->post_master.continuity_errors),(unsigned long long)atomic_load(&e->post_master.duplicate_blocks));
}

static void p0n_sidecar_handle(P0NSidecar* sc,int fd) {
  char req[P0N_HTTP_MAX_REQUEST+1u];size_t used=0u;ssize_t n;size_t header_bytes=0u;size_t content_length=0u;
  while(used<P0N_HTTP_MAX_REQUEST){
    n=recv(fd,req+used,P0N_HTTP_MAX_REQUEST-used,0);if(n<=0)break;used+=(size_t)n;req[used]='\0';
    char* end_headers=strstr(req,"\r\n\r\n");if(end_headers){header_bytes=(size_t)(end_headers+4-req);break;}
  }
  req[used]='\0';
  if(header_bytes==0u){atomic_fetch_add(&sc->oversized_requests,1u);p0n_http_send_api_error(fd,P0N_HTTP_PAYLOAD_TOO_LARGE,"Payload Too Large",sc->origin,P0N_ERROR_REQUEST_TOO_LARGE);return;}
  char clbuf[32];if(p0n_http_header_value(req,"Content-Length",clbuf,sizeof(clbuf)))content_length=(size_t)strtoull(clbuf,NULL,10);
  char method[16]={0},path[128]={0};if(sscanf(req,"%15s %127s",method,path)!=2){p0n_http_send(fd,P0N_HTTP_BAD_REQUEST,"Bad Request",sc->origin,"{\"ok\":false}");return;}
  char query_string[384]={0};char* query=strchr(path,'?');if(query){snprintf(query_string,sizeof(query_string),"%s",query+1);*query='\0';}
  if(strcmp(method,"OPTIONS")==0&&p0n_standalone_file_cors){
    char cors_origin[128]={0};
    if(p0n_http_header_value(req,P0N_HEADER_ORIGIN,cors_origin,sizeof(cors_origin))&&strcmp(cors_origin,"null")==0){p0n_http_send_preflight(fd);return;}
    p0n_http_send(fd,P0N_HTTP_FORBIDDEN,"Forbidden",sc->origin,"{\"ok\":false,\"error\":\"forbidden-origin\"}");return;
  }
  const int material_asset_route=strcmp(method,"POST")==0&&strcmp(path,P0N_ROUTE_RFL_MATERIAL_ASSET)==0;
  const int material_prepare_route=strcmp(method,"POST")==0&&strcmp(path,P0N_ROUTE_RFL_MATERIAL_PREPARE)==0;
  const int material_submit_route=strcmp(method,"POST")==0&&strcmp(path,P0N_ROUTE_RFL_MATERIAL_SUBMIT)==0;
  const int material_batch_route=strcmp(method,"POST")==0&&strcmp(path,P0N_ROUTE_RFL_MATERIAL_BATCH)==0;
  const int post_master_pcm_route=strcmp(method,"POST")==0&&strcmp(path,P0N_ROUTE_POST_MASTER_PCM)==0;
  if(material_asset_route){struct timeval asset_tv={30,0};setsockopt(fd,SOL_SOCKET,SO_RCVTIMEO,&asset_tv,sizeof(asset_tv));}
  const size_t post_master_pcm_limit=(size_t)P0N_POST_MASTER_MAX_BLOCK_FRAMES*(size_t)P0N_POST_MASTER_CHANNELS*sizeof(float);
  const size_t route_body_limit=material_asset_route?(size_t)P0N_RFL_MATERIAL_MAX_ASSET_BYTES:(material_batch_route?(size_t)P0N_RFL_MATERIAL_MAX_BATCH_BYTES:(post_master_pcm_route?post_master_pcm_limit:((material_prepare_route||material_submit_route)?(size_t)P0N_RFL_MATERIAL_MAX_PLAN_BYTES:(size_t)P0N_HTTP_MAX_BODY)));
  if(content_length>route_body_limit){atomic_fetch_add(&sc->oversized_requests,1u);p0n_http_send_api_error(fd,P0N_HTTP_PAYLOAD_TOO_LARGE,"Payload Too Large",sc->origin,P0N_ERROR_BODY_TOO_LARGE);return;}
  unsigned char* owned_body=NULL;const unsigned char* raw_body=NULL;
  if(material_asset_route||material_prepare_route||material_submit_route||material_batch_route||post_master_pcm_route){
    if(content_length>0u){owned_body=(unsigned char*)malloc(content_length);if(!owned_body){p0n_http_send_api_error(fd,P0N_HTTP_INTERNAL_SERVER_ERROR,"Internal Server Error",sc->origin,post_master_pcm_route?P0N_ERROR_BAD_POST_MASTER_PCM:P0N_ERROR_BAD_RFL_MATERIAL_ASSET);return;}
      size_t already=used>header_bytes?used-header_bytes:0u;if(already>content_length)already=content_length;if(already>0u)memcpy(owned_body,req+header_bytes,already);size_t have=already;
      while(have<content_length){n=recv(fd,owned_body+have,content_length-have,0);if(n<=0)break;have+=(size_t)n;}
      if(have!=content_length){free(owned_body);p0n_http_send_api_error(fd,P0N_HTTP_BAD_REQUEST,"Bad Request",sc->origin,post_master_pcm_route?P0N_ERROR_BAD_POST_MASTER_PCM:(material_asset_route?P0N_ERROR_BAD_RFL_MATERIAL_ASSET:(material_batch_route?P0N_ERROR_RFL_MATERIAL_BATCH_REJECTED:P0N_ERROR_BAD_RFL_MATERIAL_WINDOW)));return;}
      raw_body=owned_body;
    }
  } else {
    if(header_bytes+content_length>P0N_HTTP_MAX_REQUEST){atomic_fetch_add(&sc->oversized_requests,1u);p0n_http_send_api_error(fd,P0N_HTTP_PAYLOAD_TOO_LARGE,"Payload Too Large",sc->origin,P0N_ERROR_REQUEST_TOO_LARGE);return;}
    while(used<header_bytes+content_length){n=recv(fd,req+used,P0N_HTTP_MAX_REQUEST-used,0);if(n<=0)break;used+=(size_t)n;}
    if(used<header_bytes+content_length){p0n_http_send(fd,P0N_HTTP_BAD_REQUEST,"Bad Request",sc->origin,"{\"ok\":false}");return;}
    req[used]='\0';raw_body=(const unsigned char*)(req+header_bytes);
  }
  if(strcmp(method,"GET")==0&&strcmp(path,"/")==0&&sc->app_html&&sc->app_html_len>0u){p0n_http_send_app_html(fd,sc->app_html,sc->app_html_len);return;}
  if(strcmp(method,"GET")==0&&strcmp(path,P0N_ROUTE_LAB)==0){p0n_http_send_html(fd,P0N_HTTP_OK,"OK",P0N_BROWSER_LAB_HTML);return;}
  if(strcmp(method,"GET")==0&&strcmp(path,P0N_ROUTE_PROTOCOL_JS)==0){p0n_http_send_js(fd,P0N_HTTP_OK,"OK",P0N_CONTROL_PROTOCOL_JS);return;}
  if(strcmp(method,"GET")==0&&strcmp(path,P0N_ROUTE_ADAPTER_JS)==0){p0n_http_send_js(fd,P0N_HTTP_OK,"OK",P0N_CONTROL_ADAPTER_JS);return;}
  if(strcmp(method,"GET")==0&&strcmp(path,P0N_ROUTE_SESSION)==0){
    char out[640];P0NAudioFormat fmt={0};P0NCallbackObservation obs={0};
    if(!p0n_sidecar_browser_session_active(sc) && !p0n_sidecar_browser_session_rotate(sc)){p0n_http_send_api_error(fd,P0N_HTTP_INTERNAL_SERVER_ERROR,"Internal Server Error",sc->origin,P0N_ERROR_SESSION_ROTATION_FAILED);return;}
    if(sc->driver->query_format)sc->driver->query_format(sc->driver,&fmt);
    if(sc->driver->query_last_observation)sc->driver->query_last_observation(sc->driver,&obs);
    snprintf(out,sizeof(out),"{\"token\":\"%s\",\"sessionId\":\"%s\",\"ownerEpoch\":%u,\"controlLeaseMs\":%u,\"serviceVersion\":\"%s\",\"physicalAudio\":%s,\"sampleRate\":%u,\"channels\":%u,\"deviceQuantumFrames\":%u,\"callbacks\":%llu,\"postMasterProtocol\":2,\"postMasterExclusive\":%s}",sc->token,sc->session_id,sc->engine->owner_epoch,P0N_BROWSER_SESSION_LEASE_MS,P0N_SERVICE_VERSION,sc->physical_audio?"true":"false",fmt.sample_rate,fmt.channels,fmt.block_frames,(unsigned long long)obs.callback_index,p0n_post_master_only?"true":"false");
    p0n_http_send(fd,P0N_HTTP_OK,"OK",sc->origin,out);return;
  }

  if(strcmp(method,"GET")==0&&strcmp(path,P0N_ROUTE_POST_MASTER_STREAM)==0){
    char origin[128]={0},client_key[128]={0},upgrade[64]={0},qtoken[64]={0},qsession[64]={0};uint32_t generation=0u;
    const int origin_present=p0n_http_header_value(req,P0N_HEADER_ORIGIN,origin,sizeof(origin));
    const int origin_ok=origin_present?strcmp(origin,sc->origin)==0:!sc->physical_audio; /* null-driver test clients may omit Origin; physical browser clients may not */
    const int key_ok=p0n_http_header_value(req,"Sec-WebSocket-Key",client_key,sizeof(client_key));
    const int upgrade_ok=p0n_http_header_value(req,"Upgrade",upgrade,sizeof(upgrade))&&strcasecmp(upgrade,"websocket")==0;
    const int query_ok=p0n_query_value(query_string,"token",qtoken,sizeof(qtoken))&&p0n_query_value(query_string,"session",qsession,sizeof(qsession))&&p0n_query_u32(query_string,"generation",&generation);
    const int session_active=p0n_sidecar_browser_session_active(sc);
    if(!origin_ok||!key_ok||!upgrade_ok||!query_ok||!session_active||strcmp(qtoken,sc->token)!=0||strcmp(qsession,sc->session_id)!=0||generation==0u||generation!=atomic_load_explicit(&sc->engine->post_master.generation,memory_order_acquire)){
      atomic_fetch_add(&sc->rejected_requests,1u);p0n_http_send_api_error(fd,P0N_HTTP_FORBIDDEN,"Forbidden",sc->origin,P0N_ERROR_FORBIDDEN_SESSION);return;
    }
    if (!p0n_post_master_only || !atomic_load(&sc->engine->post_master.enabled)) {
      p0n_http_send_api_error(fd, P0N_HTTP_CONFLICT, "Conflict", sc->origin, "exclusive-pcm-session-required"); return;
    }
    unsigned expected_stream = 0u;
    if (!atomic_compare_exchange_strong(&sc->post_master_stream_running, &expected_stream, 1u)) {
      p0n_http_send_api_error(fd, P0N_HTTP_CONFLICT, "Conflict", sc->origin, "pcm-stream-already-owned"); return;
    }
    char accept_key[64];
    int stream_fd = -1;
    P0NPostMasterWsClient* client = NULL;
    if (!p0n_ws_accept_key(client_key, accept_key) || (stream_fd = dup(fd)) < 0 ||
        !(client = (P0NPostMasterWsClient*)malloc(sizeof(*client)))) {
      if (stream_fd >= 0) close(stream_fd);
      atomic_store(&sc->post_master_stream_running, 0u);
      p0n_http_send_api_error(fd, P0N_HTTP_INTERNAL_SERVER_ERROR, "Internal Server Error", sc->origin, "pcm-stream-open-failed"); return;
    }
    int no_delay = 1;
    setsockopt(stream_fd, IPPROTO_TCP, TCP_NODELAY, &no_delay, sizeof(no_delay));
    struct timeval stream_timeout = {1, 200000};
    setsockopt(stream_fd, SOL_SOCKET, SO_RCVTIMEO, &stream_timeout, sizeof(stream_timeout));
    setsockopt(stream_fd, SOL_SOCKET, SO_SNDTIMEO, &stream_timeout, sizeof(stream_timeout));
    client->sc = sc; client->fd = stream_fd; client->generation = generation;
    pthread_mutex_lock(&sc->post_master_mutex);
    sc->post_master_stream_fd = stream_fd;
    pthread_mutex_unlock(&sc->post_master_mutex);
    pthread_t stream_thread;
    if (!p0n_ws_send_upgrade(fd, accept_key) || pthread_create(&stream_thread, NULL, p0n_post_master_ws_thread, client) != 0) {
      pthread_mutex_lock(&sc->post_master_mutex);
      sc->post_master_stream_fd = -1; close(stream_fd); free(client);
      pthread_mutex_unlock(&sc->post_master_mutex);
      atomic_store(&sc->post_master_stream_running, 0u); return;
    }
    pthread_detach(stream_thread);
    atomic_fetch_add(&sc->accepted_requests,1u);p0n_sidecar_browser_session_touch(sc);return;
  }
  char origin[128]={0},token[128]={0},session_id[64]={0};
  int origin_present=p0n_http_header_value(req,P0N_HEADER_ORIGIN,origin,sizeof(origin));
  int origin_ok=origin_present&&(strcmp(origin,sc->origin)==0||(p0n_standalone_file_cors&&strcmp(origin,"null")==0));
  char* body=(char*)(raw_body?raw_body:(const unsigned char*)"");
  if(strcmp(method,"POST")==0&&strcmp(path,P0N_ROUTE_BROWSER_PROGRESS)==0){
    uint32_t stage=0u;
    if(!origin_ok||!p0n_parse_u32(body,"stage",&stage)||stage==0u||stage>64u){
      atomic_fetch_add(&sc->rejected_requests,1u);p0n_http_send_api_error(fd,P0N_HTTP_FORBIDDEN,"Forbidden",sc->origin,P0N_ERROR_BAD_PROGRESS);return;
    }
    uint32_t cur=atomic_load(&sc->browser_progress_stage);
    while(stage>cur&&!atomic_compare_exchange_weak(&sc->browser_progress_stage,&cur,stage)){}
    atomic_fetch_add(&sc->browser_progress_count,1u);
    p0n_http_send(fd,P0N_HTTP_OK,"OK",sc->origin,"{\"ok\":true}");return;
  }
  int browser_session_active=p0n_sidecar_browser_session_active(sc);
  int token_ok=p0n_http_header_value(req,P0N_HEADER_TOKEN,token,sizeof(token))&&strcmp(token,sc->token)==0;
  int session_ok=p0n_http_header_value(req,P0N_HEADER_SESSION,session_id,sizeof(session_id))&&strcmp(session_id,sc->session_id)==0;
  if(!origin_ok||!browser_session_active||!token_ok||!session_ok){if(owned_body)free(owned_body);atomic_fetch_add(&sc->rejected_requests,1u);p0n_http_send_api_error(fd,P0N_HTTP_FORBIDDEN,"Forbidden",sc->origin,browser_session_active?P0N_ERROR_FORBIDDEN_SESSION:P0N_ERROR_CONTROL_SESSION_EXPIRED);return;}
  atomic_fetch_add(&sc->accepted_requests,1u);
  /* Browser-control lease is an idle lease: any successfully authenticated
     request proves liveness. Heartbeat is only the keepalive for true idle. */
  p0n_sidecar_browser_session_touch(sc);
  if (p0n_post_master_only && strncmp(path, "/v1/post-master/", 16u) != 0 &&
      strcmp(path, P0N_ROUTE_STATUS) != 0 && strcmp(path, P0N_ROUTE_HEARTBEAT) != 0 && strcmp(path, P0N_ROUTE_SHUTDOWN) != 0) {
    if (owned_body) free(owned_body);
    p0n_http_send_api_error(fd, P0N_HTTP_CONFLICT, "Conflict", sc->origin, "post-master-exclusive-output"); return;
  }
  if(strcmp(method,"POST")==0&&strcmp(path,P0N_ROUTE_POST_MASTER_BEGIN)==0){
    uint32_t sample_rate=0u,channels=0u,prefill_frames=0u;
    P0NAudioFormat fmt={0};if(sc->driver->query_format)sc->driver->query_format(sc->driver,&fmt);
    if(!p0n_parse_u32(body,"sampleRate",&sample_rate)||!p0n_parse_u32(body,"channels",&channels)||!p0n_parse_u32(body,"prefillFrames",&prefill_frames)||
       sample_rate!=sc->engine->sample_rate||channels!=P0N_POST_MASTER_CHANNELS||(fmt.sample_rate&&sample_rate!=fmt.sample_rate)||(fmt.channels&&channels!=fmt.channels)){
      p0n_http_send_api_error(fd,P0N_HTTP_BAD_REQUEST,"Bad Request",sc->origin,P0N_ERROR_BAD_POST_MASTER_BEGIN);return;
    }
    pthread_mutex_lock(&sc->post_master_mutex);
    uint32_t generation = p0n_post_master_only && !atomic_load(&sc->post_master_stream_running)
      ? p0n_post_master_begin(&sc->engine->post_master,sample_rate,channels,prefill_frames) : 0u;
    pthread_mutex_unlock(&sc->post_master_mutex);
    if(!generation){p0n_http_send_api_error(fd,P0N_HTTP_BAD_REQUEST,"Bad Request",sc->origin,P0N_ERROR_BAD_POST_MASTER_BEGIN);return;}
    char out[256];snprintf(out,sizeof(out),"{\"ok\":true,\"generation\":%u,\"capacityFrames\":%u,\"prefillFrames\":%u,\"lowWatermarkFrames\":%u,\"highWatermarkFrames\":%u}",generation,P0N_POST_MASTER_RING_FRAMES,prefill_frames,P0N_POST_MASTER_LOW_WATERMARK_FRAMES,P0N_POST_MASTER_HIGH_WATERMARK_FRAMES);
    p0n_http_send(fd,P0N_HTTP_ACCEPTED,"Accepted",sc->origin,out);return;
  }
  if(post_master_pcm_route){
    uint32_t generation=0u,frames=0u,channels=0u,sample_rate=0u;uint64_t sequence=0u,start_frame=0u;
    const int header_ok=p0n_parse_header_u32(req,P0N_HEADER_PCM_GENERATION,&generation)&&p0n_parse_header_u64(req,P0N_HEADER_PCM_SEQUENCE,&sequence)&&
      p0n_parse_header_u64(req,P0N_HEADER_PCM_START_FRAME,&start_frame)&&p0n_parse_header_u32(req,P0N_HEADER_PCM_FRAMES,&frames)&&
      p0n_parse_header_u32(req,P0N_HEADER_PCM_CHANNELS,&channels)&&p0n_parse_header_u32(req,P0N_HEADER_PCM_SAMPLE_RATE,&sample_rate);
    if(!header_ok||!owned_body||frames==0u||frames>P0N_POST_MASTER_MAX_BLOCK_FRAMES||channels!=P0N_POST_MASTER_CHANNELS||sample_rate!=sc->engine->sample_rate||
       content_length!=(size_t)frames*(size_t)channels*sizeof(float)){
      if(owned_body) free(owned_body);
      p0n_http_send_api_error(fd,P0N_HTTP_BAD_REQUEST,"Bad Request",sc->origin,P0N_ERROR_BAD_POST_MASTER_PCM);return;
    }
    pthread_mutex_lock(&sc->post_master_mutex);
    int rc = atomic_load(&sc->post_master_stream_running) ? -1 :
      p0n_post_master_push(&sc->engine->post_master,generation,sequence,start_frame,(const float*)owned_body,frames);
    pthread_mutex_unlock(&sc->post_master_mutex);
    free(owned_body);owned_body=NULL;
    if(rc==0){char out[192];snprintf(out,sizeof(out),"{\"ok\":false,\"error\":\"%s\",\"fillFrames\":%u}",P0N_ERROR_POST_MASTER_BACKPRESSURE,p0n_post_master_available_read(&sc->engine->post_master));p0n_http_send(fd,P0N_HTTP_TOO_MANY_REQUESTS,"Too Many Requests",sc->origin,out);return;}
    if(rc<0){p0n_http_send_api_error(fd,P0N_HTTP_CONFLICT,"Conflict",sc->origin,P0N_ERROR_POST_MASTER_CONTINUITY);return;}
    char out[224];snprintf(out,sizeof(out),"{\"ok\":true,\"duplicate\":%s,\"fillFrames\":%u,\"prefilled\":%s}",rc==2?"true":"false",p0n_post_master_available_read(&sc->engine->post_master),p0n_post_master_prefilled(&sc->engine->post_master)?"true":"false");
    p0n_http_send(fd,P0N_HTTP_ACCEPTED,"Accepted",sc->origin,out);return;
  }
  if(strcmp(method,"POST")==0&&strcmp(path,P0N_ROUTE_POST_MASTER_COMMIT)==0){
    uint32_t generation=0u;if(!p0n_parse_u32(body,"generation",&generation)){p0n_http_send_api_error(fd,P0N_HTTP_BAD_REQUEST,"Bad Request",sc->origin,P0N_ERROR_POST_MASTER_NOT_PREFILLED);return;}
    pthread_mutex_lock(&sc->post_master_mutex);
    int committed = !atomic_load(&sc->post_master_stream_running) && p0n_post_master_commit(&sc->engine->post_master,generation);
    pthread_mutex_unlock(&sc->post_master_mutex);
    if(!committed){char out[192];snprintf(out,sizeof(out),"{\"ok\":false,\"error\":\"%s\",\"fillFrames\":%u,\"prefillFrames\":%u}",P0N_ERROR_POST_MASTER_NOT_PREFILLED,p0n_post_master_available_read(&sc->engine->post_master),atomic_load(&sc->engine->post_master.prefill_frames));p0n_http_send(fd,P0N_HTTP_CONFLICT,"Conflict",sc->origin,out);return;}
    char out[160];snprintf(out,sizeof(out),"{\"ok\":true,\"generation\":%u,\"fillFrames\":%u,\"owner\":\"native-post-master\"}",generation,p0n_post_master_available_read(&sc->engine->post_master));p0n_http_send(fd,P0N_HTTP_OK,"OK",sc->origin,out);return;
  }
  if(strcmp(method,"POST")==0&&strcmp(path,P0N_ROUTE_POST_MASTER_STOP)==0){
    uint32_t generation=0u;if(!p0n_parse_u32(body,"generation",&generation)||!p0n_post_master_stop_confirmed(sc,generation)){p0n_http_send_api_error(fd,P0N_HTTP_BAD_REQUEST,"Bad Request",sc->origin,P0N_ERROR_BAD_POST_MASTER_STOP);return;}
    char out[128]; snprintf(out, sizeof(out), "{\"ok\":true,\"confirmed\":true,\"generation\":%u}", generation);
    p0n_http_send(fd,P0N_HTTP_OK,"OK",sc->origin,out);return;
  }
  if(material_asset_route){
    uint64_t hash=0u;uint32_t frames=0u,channels=0u,sample_rate=0u;
    if(!owned_body||content_length<sizeof(float)*2u||!p0n_parse_header_u64_hex(req,P0N_HEADER_MATERIAL_HASH,&hash)||hash==0u||!p0n_parse_header_u32(req,P0N_HEADER_MATERIAL_FRAMES,&frames)||!p0n_parse_header_u32(req,P0N_HEADER_MATERIAL_CHANNELS,&channels)||!p0n_parse_header_u32(req,P0N_HEADER_MATERIAL_SAMPLE_RATE,&sample_rate)||channels<1u||channels>2u||frames<2u||sample_rate<8000u||sample_rate>192000u||content_length!=(size_t)frames*(size_t)channels*sizeof(float)){
      free(owned_body);p0n_http_send_api_error(fd,P0N_HTTP_BAD_REQUEST,"Bad Request",sc->origin,P0N_ERROR_BAD_RFL_MATERIAL_ASSET);return;
    }
    for(uint32_t i=0u;i<P0N_RFL_MATERIAL_MAX_ASSETS;++i){if(sc->material_asset_memory[i]&&sc->material_asset_hash[i]==hash){const int same=sc->material_asset_frames[i]==frames&&sc->material_asset_channels[i]==channels&&sc->material_asset_sample_rate[i]==sample_rate;free(owned_body);if(!same){p0n_http_send_api_error(fd,P0N_HTTP_CONFLICT,"Conflict",sc->origin,P0N_ERROR_BAD_RFL_MATERIAL_ASSET);return;}char out[128];snprintf(out,sizeof(out),"{\"ok\":true,\"assetSlot\":%u,\"warm\":true,\"existing\":true}",i);p0n_http_send(fd,P0N_HTTP_OK,"OK",sc->origin,out);return;}}
    uint32_t slot=P0N_RFL_MATERIAL_MAX_ASSETS;for(uint32_t i=0u;i<P0N_RFL_MATERIAL_MAX_ASSETS;++i)if(!sc->material_asset_memory[i]){slot=i;break;}
    if(slot>=P0N_RFL_MATERIAL_MAX_ASSETS){free(owned_body);p0n_http_send_api_error(fd,P0N_HTTP_TOO_MANY_REQUESTS,"Too Many Requests",sc->origin,P0N_ERROR_RFL_MATERIAL_ASSET_BANK_FULL);return;}
    float* pcm=(float*)owned_body;const size_t samples=(size_t)frames*(size_t)channels;for(size_t i=0u;i<samples;++i)if(!isfinite(pcm[i]))pcm[i]=0.0f;
    sc->material_asset_memory[slot]=pcm;sc->material_asset_hash[slot]=hash;sc->material_asset_frames[slot]=frames;sc->material_asset_channels[slot]=channels;sc->material_asset_sample_rate[slot]=sample_rate;
    if(!p0n_rfl_material_publish_asset(&sc->engine->rfl_material,slot,pcm,frames,channels,sample_rate)){sc->material_asset_memory[slot]=NULL;free(pcm);p0n_http_send_api_error(fd,P0N_HTTP_CONFLICT,"Conflict",sc->origin,P0N_ERROR_RFL_MATERIAL_NOT_WARM);return;}
    atomic_fetch_add(&sc->material_assets_published,1u);char out[128];snprintf(out,sizeof(out),"{\"ok\":true,\"assetSlot\":%u,\"warm\":true,\"existing\":false}",slot);p0n_http_send(fd,P0N_HTTP_ACCEPTED,"Accepted",sc->origin,out);return;
  }
  if(material_prepare_route){
    P0NRflMaterialWindowPlan plan;uint32_t routing_flags=0u;
    const int ok=owned_body&&p0n_parse_rfl_material_window(owned_body,content_length,&plan,&routing_flags);free(owned_body);owned_body=NULL;
    if(!ok||routing_flags!=3u||!atomic_load_explicit(&sc->engine->rfl_material.assets[plan.asset_slot].ready,memory_order_acquire)){p0n_http_send_api_error(fd,P0N_HTTP_BAD_REQUEST,"Bad Request",sc->origin,ok?P0N_ERROR_RFL_MATERIAL_NOT_WARM:P0N_ERROR_BAD_RFL_MATERIAL_WINDOW);return;}
    if(atomic_load_explicit(&sc->engine->observed_frame,memory_order_acquire)>plan.deadline_frame){p0n_http_send_api_error(fd,P0N_HTTP_CONFLICT,"Conflict",sc->origin,P0N_ERROR_RFL_MATERIAL_COMMIT_REJECTED);return;}
    sc->prepared_material_window=plan;sc->prepared_material_id=plan.sequence;sc->prepared_material_valid=1u;atomic_fetch_add(&sc->material_prepare_accepted,1u);char out[160];snprintf(out,sizeof(out),"{\"ok\":true,\"preparedId\":%llu,\"warm\":true,\"routing\":\"rhythm+forge-browser-aux\"}",(unsigned long long)sc->prepared_material_id);p0n_http_send(fd,P0N_HTTP_ACCEPTED,"Accepted",sc->origin,out);return;
  }
  if(material_submit_route){
    P0NRflMaterialWindowPlan plan;uint32_t routing_flags=0u;
    const int ok=owned_body&&p0n_parse_rfl_material_window(owned_body,content_length,&plan,&routing_flags);free(owned_body);owned_body=NULL;
    if(!ok||routing_flags!=3u||atomic_load_explicit(&sc->engine->observed_frame,memory_order_acquire)>plan.deadline_frame||!p0n_rfl_material_submit_window(&sc->engine->rfl_material,&plan)){
      atomic_fetch_add(&sc->material_submits_rejected,1u);atomic_fetch_add(&sc->material_direct_transactions_rejected,1u);p0n_http_send_api_error(fd,P0N_HTTP_CONFLICT,"Conflict",sc->origin,P0N_ERROR_RFL_MATERIAL_SUBMIT_REJECTED);return;
    }
    atomic_store(&sc->material_last_committed_id,plan.sequence);atomic_fetch_add(&sc->material_submits_accepted,1u);atomic_fetch_add(&sc->material_direct_transactions_accepted,1u);
    char out[192];snprintf(out,sizeof(out),"{\"ok\":true,\"committedId\":%llu,\"owner\":\"native-rhythm\",\"transport\":\"direct-submit\"}",(unsigned long long)plan.sequence);p0n_http_send(fd,P0N_HTTP_ACCEPTED,"Accepted",sc->origin,out);return;
  }
  if(material_batch_route){
    P0NRflMaterialWindowPlan plans[P0N_RFL_MATERIAL_MAX_BATCH_WINDOWS];uint32_t count=0u;
    const int ok=owned_body&&p0n_parse_rfl_material_batch(owned_body,content_length,plans,&count);free(owned_body);owned_body=NULL;
    uint64_t committed_through=0u;int stale=0;
    if(ok){const uint64_t now_frame=atomic_load_explicit(&sc->engine->observed_frame,memory_order_acquire);for(uint32_t i=0u;i<count;++i){if(now_frame>plans[i].deadline_frame){stale=1;break;}}}
    if(!ok||stale||!p0n_rfl_material_submit_windows(&sc->engine->rfl_material,plans,count)){
      atomic_fetch_add(&sc->material_batches_rejected,1u);atomic_fetch_add(&sc->material_submits_rejected,count?count:1u);p0n_http_send_api_error(fd,P0N_HTTP_CONFLICT,"Conflict",sc->origin,P0N_ERROR_RFL_MATERIAL_BATCH_REJECTED);return;
    }
    committed_through=plans[count-1u].sequence;atomic_store(&sc->material_last_committed_id,committed_through);atomic_fetch_add(&sc->material_batches_accepted,1u);atomic_fetch_add(&sc->material_submits_accepted,count);
    char out[224];snprintf(out,sizeof(out),"{\"ok\":true,\"committedThrough\":%llu,\"count\":%u,\"owner\":\"native-rhythm\",\"transport\":\"plan-batch\"}",(unsigned long long)committed_through,count);p0n_http_send(fd,P0N_HTTP_ACCEPTED,"Accepted",sc->origin,out);return;
  }
  if((strcmp(method,"GET")==0||strcmp(method,"POST")==0)&&strcmp(path,P0N_ROUTE_STATUS)==0){char out[4096];p0n_sidecar_status(sc,out,sizeof(out));p0n_http_send(fd,P0N_HTTP_OK,"OK",sc->origin,out);return;}
  if(strcmp(method,"POST")==0&&strcmp(path,P0N_ROUTE_HEARTBEAT)==0){atomic_fetch_add_explicit(&sc->browser_heartbeat_count,1u,memory_order_relaxed);p0n_http_send(fd,P0N_HTTP_OK,"OK",sc->origin,"{\"ok\":true,\"scope\":\"browser-control-session\"}");return;}
  if(strcmp(method,"POST")==0&&strcmp(path,P0N_ROUTE_STATE)==0){uint64_t rev;float root,gain;if(!p0n_parse_u64(body,"revision",&rev)||!p0n_parse_float(body,"root",&root)||!p0n_parse_float(body,"gain",&gain)){p0n_http_send_api_error(fd,P0N_HTTP_BAD_REQUEST,"Bad Request",sc->origin,P0N_ERROR_BAD_STATE);return;}int ok=p0n_state_write(&sc->engine->state,rev,root,gain);ok?p0n_http_send(fd,P0N_HTTP_OK,"OK",sc->origin,"{\"ok\":true}"):p0n_http_send_api_error(fd,P0N_HTTP_CONFLICT,"Conflict",sc->origin,P0N_ERROR_STALE_REVISION);return;}
  if(strcmp(method,"POST")==0&&strcmp(path,P0N_ROUTE_ATTACK)==0){uint64_t seq,source;uint32_t slot,gen;float hz,peak;if(!p0n_parse_u64(body,"sequence",&seq)||!p0n_parse_u64(body,"sourceFrame",&source)||!p0n_parse_u32(body,"slot",&slot)||!p0n_parse_u32(body,"generation",&gen)||!p0n_parse_float(body,"frequency",&hz)||!p0n_parse_float(body,"peak",&peak)||slot>=P0N_TOKEN_SLOTS||gen==0u||hz<=0.0f||peak<=0.0f){p0n_http_send_api_error(fd,P0N_HTTP_BAD_REQUEST,"Bad Request",sc->origin,P0N_ERROR_BAD_ATTACK);return;}P0NAttackGroup a={0};a.sequence=seq;a.note_count=1;stamp_attack_timing(sc->engine,&a,source);a.notes[0]=(P0NNote){(uint16_t)slot,gen,hz,peak};int ok=p0n_ring_push(&sc->engine->attacks,&a);ok?p0n_http_send(fd,P0N_HTTP_ACCEPTED,"Accepted",sc->origin,"{\"ok\":true}"):p0n_http_send_api_error(fd,P0N_HTTP_TOO_MANY_REQUESTS,"Too Many Requests",sc->origin,P0N_ERROR_EVENT_RING_FULL);return;}
  if(strcmp(method,"POST")==0&&strcmp(path,P0N_ROUTE_WAVE_STARTER_RESOLVED_ATTACK)==0){
#ifdef P0N_GENESIS_IMPLANT
    uint64_t seq=0u,source=0u;xen_tone_plan plan;
    if(!p0n_parse_wave_resolved_plan(raw_body,content_length,&seq,&source,&plan)||atomic_load_explicit(&sc->engine->wave_starter.terminal,memory_order_acquire)){
      p0n_http_send_api_error(fd,P0N_HTTP_BAD_REQUEST,"Bad Request",sc->origin,P0N_ERROR_BAD_WAVE_STARTER_RESOLVED_ATTACK);return;
    }
    plan.frame=(xen_frame)(source+frames_for_ms(sc->engine,P0N_ATTACK_LEAD_MS));
    int rc=xen_tone_plan_submit(sc->engine->genesis,xen_engine_epoch(sc->engine->genesis),&plan);
    if(rc==XEN_OK){
      char out[192];snprintf(out,sizeof(out),"{\"ok\":true,\"renderer\":\"genesis-c11-resolved-tone-plan-op2\",\"parity\":\"parameter-plan-core-v1\",\"tones\":%u}",plan.tone_count);
      p0n_http_send(fd,P0N_HTTP_ACCEPTED,"Accepted",sc->origin,out);
    }else if(rc==XEN_ERR_STALE){
      p0n_http_send_api_error(fd,P0N_HTTP_CONFLICT,"Conflict",sc->origin,P0N_ERROR_BAD_WAVE_STARTER_RESOLVED_ATTACK);
    }else if(rc==XEN_ERR_ARG){
      p0n_http_send_api_error(fd,P0N_HTTP_BAD_REQUEST,"Bad Request",sc->origin,P0N_ERROR_BAD_WAVE_STARTER_RESOLVED_ATTACK);
    }else{
      p0n_http_send_api_error(fd,P0N_HTTP_TOO_MANY_REQUESTS,"Too Many Requests",sc->origin,P0N_ERROR_EVENT_RING_FULL);
    }
#else
    p0n_http_send_api_error(fd,P0N_HTTP_NOT_FOUND,"Not Found",sc->origin,P0N_ERROR_NOT_FOUND);
#endif
    return;
  }
  if(strcmp(method,"POST")==0&&strcmp(path,P0N_ROUTE_WAVE_STARTER_ATTACK)==0){
    uint64_t seq=0u,source=0u;float hz=0.0f,peak=0.0f;char preset_id[40]={0};
    int preset_index=-1;
    if(!p0n_parse_u64(body,"sequence",&seq)||!p0n_parse_u64(body,"sourceFrame",&source)||
       !p0n_form_value(body,"preset",preset_id,sizeof(preset_id))||!p0n_parse_float(body,"frequency",&hz)||
       !p0n_parse_float(body,"peak",&peak)||(preset_index=p0n_ws_find_preset(preset_id))<0||
       hz<20.0f||hz>20000.0f||peak<=0.0f||peak>0.2f||atomic_load_explicit(&sc->engine->wave_starter.terminal,memory_order_acquire)){
      p0n_http_send_api_error(fd,P0N_HTTP_BAD_REQUEST,"Bad Request",sc->origin,P0N_ERROR_BAD_WAVE_STARTER_ATTACK);return;
    }
#ifdef P0N_GENESIS_IMPLANT
    (void)preset_index; /* preset is validated for product compatibility but the
                           OP1 kernel sound body is explicitly PARITY_NOT_ESTABLISHED. */
    xen_gesture g={0};
    g.kind=XEN_G_ATTACK;
    g.token=(uint32_t)(seq ? (seq & 0xffffffffu) : 1u);
    g.frame=(xen_frame)(source+frames_for_ms(sc->engine,P0N_ATTACK_LEAD_MS));
    g.p0=hz; g.p1=peak; g.p2=0.0f; g.pitch_mode=XEN_PITCH_HZ;
    int rc=xen_gesture_submit(sc->engine->genesis,xen_engine_epoch(sc->engine->genesis),&g);
    if(rc==XEN_OK){
      p0n_http_send(fd,P0N_HTTP_ACCEPTED,"Accepted",sc->origin,"{\"ok\":true,\"renderer\":\"genesis-c11-wave-implant-op1\",\"parity\":\"not-established\"}");
    }else{
      p0n_http_send_api_error(fd,P0N_HTTP_TOO_MANY_REQUESTS,"Too Many Requests",sc->origin,P0N_ERROR_EVENT_RING_FULL);
    }
#else
    P0NWaveStarterAttack a={0};
    const uint64_t intended=source+frames_for_ms(sc->engine,P0N_ATTACK_LEAD_MS);
    const uint64_t latest=intended+frames_for_ms(sc->engine,P0N_ATTACK_LATE_MS);
    if(!p0n_ws_build_attack(&sc->engine->wave_starter,&a,seq,source,intended,latest,preset_index,hz,peak)){
      p0n_http_send_api_error(fd,P0N_HTTP_BAD_REQUEST,"Bad Request",sc->origin,P0N_ERROR_BAD_WAVE_STARTER_ATTACK);return;
    }
    int ok=p0n_ws_ring_push(&sc->engine->wave_starter.ring,&a);
    ok?p0n_http_send(fd,P0N_HTTP_ACCEPTED,"Accepted",sc->origin,"{\"ok\":true,\"renderer\":\"wavestarter-synth-v1\"}"):
       p0n_http_send_api_error(fd,P0N_HTTP_TOO_MANY_REQUESTS,"Too Many Requests",sc->origin,P0N_ERROR_EVENT_RING_FULL);
#endif
    return;
  }
  if(strcmp(method,"POST")==0&&strcmp(path,P0N_ROUTE_RFL_MATERIAL_COMMIT)==0){uint64_t prepared_id=0u;if(!p0n_parse_u64(body,"preparedId",&prepared_id)||!sc->prepared_material_valid||prepared_id!=sc->prepared_material_id||!p0n_rfl_material_can_commit(&sc->engine->rfl_material,&sc->prepared_material_window)||!p0n_rfl_material_submit_window(&sc->engine->rfl_material,&sc->prepared_material_window)){sc->prepared_material_valid=0u;atomic_fetch_add(&sc->material_commits_rejected,1u);p0n_http_send_api_error(fd,P0N_HTTP_CONFLICT,"Conflict",sc->origin,P0N_ERROR_RFL_MATERIAL_COMMIT_REJECTED);return;}sc->prepared_material_valid=0u;atomic_store(&sc->material_last_committed_id,prepared_id);atomic_fetch_add(&sc->material_commits_accepted,1u);char out[160];snprintf(out,sizeof(out),"{\"ok\":true,\"committedId\":%llu,\"owner\":\"native-rhythm\"}",(unsigned long long)prepared_id);p0n_http_send(fd,P0N_HTTP_ACCEPTED,"Accepted",sc->origin,out);return;}
  if(strcmp(method,"POST")==0&&strcmp(path,P0N_ROUTE_RFL_MATERIAL_STOP)==0){uint32_t generation=0u;if(!p0n_parse_u32(body,"generation",&generation)||generation==0u){p0n_http_send_api_error(fd,P0N_HTTP_BAD_REQUEST,"Bad Request",sc->origin,P0N_ERROR_BAD_RFL_MATERIAL_STOP);return;}if(sc->prepared_material_valid&&sc->prepared_material_window.generation==generation)sc->prepared_material_valid=0u;p0n_rfl_material_stop_generation(&sc->engine->rfl_material,generation);p0n_http_send(fd,P0N_HTTP_OK,"OK",sc->origin,"{\"ok\":true}");return;}
  if(strcmp(method,"POST")==0&&strcmp(path,P0N_ROUTE_RELEASE)==0){uint32_t slot,gen;if(!p0n_parse_u32(body,"slot",&slot)||!p0n_parse_u32(body,"generation",&gen)||slot>=P0N_TOKEN_SLOTS||gen==0u){p0n_http_send(fd,P0N_HTTP_BAD_REQUEST,"Bad Request",sc->origin,"{\"ok\":false}");return;}p0n_release_max(&sc->engine->safety,slot,gen);
#ifdef P0N_GENESIS_IMPLANT
    /* Existing browser release identity is slot+generation. Fold it into a
       stable nonzero token for the implant without giving the adapter audio authority. */
    uint32_t token=(slot*2654435761u)^gen; if(token==0u)token=1u; (void)xsn_key_up(sc->engine->genesis,token);
#endif
    p0n_http_send(fd,P0N_HTTP_OK,"OK",sc->origin,"{\"ok\":true}");return;}
  if(strcmp(method,"POST")==0&&strcmp(path,P0N_ROUTE_PANIC)==0){sc->prepared_material_valid=0u;atomic_store_explicit(&sc->engine->safety.panic_epoch,sc->engine->owner_epoch,memory_order_release);
#ifdef P0N_GENESIS_IMPLANT
    (void)xen_engine_panic(sc->engine->genesis);
#endif
    p0n_http_send(fd,P0N_HTTP_OK,"OK",sc->origin,"{\"ok\":true}");return;}
  if(strcmp(method,"POST")==0&&strcmp(path,P0N_ROUTE_BROWSER_REPORT)==0){uint32_t pass,checks,failed,rtt,final_rev;if(!p0n_parse_u32(body,"pass",&pass)||!p0n_parse_u32(body,"checks",&checks)||!p0n_parse_u32(body,"failed",&failed)||!p0n_parse_u32(body,"clockRttUs",&rtt)||!p0n_parse_u32(body,"finalRevision",&final_rev)||pass>1u||checks>128u||failed>checks){p0n_http_send_api_error(fd,P0N_HTTP_BAD_REQUEST,"Bad Request",sc->origin,P0N_ERROR_BAD_BROWSER_REPORT);return;}atomic_store(&sc->browser_report_seen,1u);atomic_store(&sc->browser_report_pass,pass);atomic_store(&sc->browser_report_checks,checks);atomic_store(&sc->browser_report_failed,failed);atomic_store(&sc->browser_clock_rtt_us,rtt);atomic_store(&sc->browser_final_revision,final_rev);p0n_http_send(fd,P0N_HTTP_OK,"OK",sc->origin,"{\"ok\":true}");return;}
  if(strcmp(method,"POST")==0&&strcmp(path,P0N_ROUTE_SHUTDOWN)==0){atomic_store(&sc->stop,1);p0n_http_send(fd,P0N_HTTP_OK,"OK",sc->origin,"{\"ok\":true}");return;}
  p0n_http_send_api_error(fd,P0N_HTTP_NOT_FOUND,"Not Found",sc->origin,P0N_ERROR_NOT_FOUND);
}

static void* p0n_sidecar_thread(void* userdata){
  P0NSidecar* sc=(P0NSidecar*)userdata;
  while(!atomic_load(&sc->stop)){
    struct pollfd pfd={sc->listen_fd,POLLIN,0};int pr=poll(&pfd,1,100);if(pr<=0)continue;
    int fd=accept(sc->listen_fd,NULL,NULL);if(fd<0)continue;
    struct timeval tv={2,0};setsockopt(fd,SOL_SOCKET,SO_RCVTIMEO,&tv,sizeof(tv));
    p0n_sidecar_handle(sc,fd);close(fd);
  }
  return NULL;
}

static int run_sidecar_with_driver(P0NAudioDriver driver,int physical_audio,const char* app_html,size_t app_html_len,int start_demo_program){
  P0NEngine e;if(!engine_prepare(&e,start_demo_program))return 2;
  P0NAudioFormat requested={e.sample_rate,2u,e.block_frames,driver.name};
  if(!driver.prepare(&driver,&requested,render_callback,&e)||!driver.start(&driver)){if(driver.destroy)driver.destroy(&driver);return 3;}
  P0NSidecar sc;memset(&sc,0,sizeof(sc));sc.engine=&e;sc.driver=&driver;sc.physical_audio=physical_audio;sc.app_html=app_html;sc.app_html_len=app_html_len;atomic_init(&sc.stop,0);atomic_init(&sc.accepted_requests,0u);atomic_init(&sc.rejected_requests,0u);atomic_init(&sc.oversized_requests,0u);atomic_init(&sc.browser_report_seen,0u);atomic_init(&sc.browser_report_pass,0u);atomic_init(&sc.browser_report_checks,0u);atomic_init(&sc.browser_report_failed,0u);atomic_init(&sc.browser_clock_rtt_us,0u);atomic_init(&sc.browser_final_revision,0u);atomic_init(&sc.browser_progress_stage,0u);atomic_init(&sc.browser_progress_count,0u);atomic_init(&sc.browser_session_deadline_ns,0u);atomic_init(&sc.browser_heartbeat_count,0u);atomic_init(&sc.browser_control_renewal_count,0u);atomic_init(&sc.browser_session_expirations,0u);atomic_init(&sc.owner_lease_renewals,0u);atomic_init(&sc.material_assets_published,0u);atomic_init(&sc.material_prepare_accepted,0u);atomic_init(&sc.material_submits_accepted,0u);atomic_init(&sc.material_submits_rejected,0u);atomic_init(&sc.material_direct_transactions_accepted,0u);atomic_init(&sc.material_direct_transactions_rejected,0u);atomic_init(&sc.material_batches_accepted,0u);atomic_init(&sc.material_batches_rejected,0u);atomic_init(&sc.material_commits_accepted,0u);atomic_init(&sc.material_commits_rejected,0u);atomic_init(&sc.material_last_committed_id,0u);
  pthread_mutex_init(&sc.post_master_mutex, NULL);
  atomic_init(&sc.post_master_stream_running, 0u); sc.post_master_stream_fd = -1;
  if(!p0n_sidecar_browser_session_rotate(&sc)){driver.stop(&driver);driver.destroy(&driver);return 4;}
  sc.listen_fd=socket(AF_INET,SOCK_STREAM,0);if(sc.listen_fd<0){driver.stop(&driver);driver.destroy(&driver);return 5;}
  int one=1;setsockopt(sc.listen_fd,SOL_SOCKET,SO_REUSEADDR,&one,sizeof(one));
  struct sockaddr_in addr;memset(&addr,0,sizeof(addr));addr.sin_family=AF_INET;addr.sin_addr.s_addr=htonl(INADDR_LOOPBACK);addr.sin_port=p0n_forced_sidecar_port?htons(p0n_forced_sidecar_port):0;
  if(bind(sc.listen_fd,(struct sockaddr*)&addr,sizeof(addr))!=0||listen(sc.listen_fd,8)!=0){close(sc.listen_fd);driver.stop(&driver);driver.destroy(&driver);return 6;}
  socklen_t alen=sizeof(addr);if(getsockname(sc.listen_fd,(struct sockaddr*)&addr,&alen)!=0){close(sc.listen_fd);driver.stop(&driver);driver.destroy(&driver);return 7;}
  sc.port=ntohs(addr.sin_port);snprintf(sc.origin,sizeof(sc.origin),"http://127.0.0.1:%u",sc.port);
  pthread_t thread;if(pthread_create(&thread,NULL,p0n_sidecar_thread,&sc)!=0){close(sc.listen_fd);driver.stop(&driver);driver.destroy(&driver);return 8;}
  P0NAudioFormat actual={0};P0NCallbackObservation ready_obs={0};
  if(driver.query_format)driver.query_format(&driver,&actual);
  if(physical_audio){
    for(unsigned ready_wait=0u;ready_wait<200u;ready_wait++){
      if(driver.query_format)driver.query_format(&driver,&actual);
      if(driver.query_last_observation)driver.query_last_observation(&driver,&ready_obs);
      if(actual.sample_rate>0u&&actual.channels>0u&&actual.block_frames>0u&&ready_obs.callback_index>0u)break;
      sleep_ms(5u);
    }
    if(actual.sample_rate==0u||actual.channels==0u||actual.block_frames==0u||ready_obs.callback_index==0u){
      printf("{\"type\":\"sidecar-error\",\"reason\":\"device-not-ready\",\"physicalAudio\":true,\"sampleRate\":%u,\"channels\":%u,\"deviceQuantumFrames\":%u,\"callbacks\":%llu}\n",actual.sample_rate,actual.channels,actual.block_frames,(unsigned long long)ready_obs.callback_index);fflush(stdout);
      atomic_store(&sc.stop,1);shutdown(sc.listen_fd,SHUT_RDWR);close(sc.listen_fd);pthread_join(thread,NULL);driver.stop(&driver);driver.destroy(&driver);return 9;
    }
  }
  printf("{\"type\":\"sidecar-ready\",\"bind\":\"127.0.0.1\",\"port\":%u,\"origin\":\"%s\",\"token\":\"%s\",\"sessionId\":\"%s\",\"ownerEpoch\":%u,\"controlLeaseMs\":%u,\"rtOwnerLeaseMs\":%u,\"physicalAudio\":%s,\"sampleRate\":%u,\"channels\":%u,\"deviceQuantumFrames\":%u,\"callbacks\":%llu}\n",sc.port,sc.origin,sc.token,sc.session_id,e.owner_epoch,P0N_BROWSER_SESSION_LEASE_MS,P0N_RT_OWNER_LEASE_MS,physical_audio?"true":"false",actual.sample_rate,actual.channels,actual.block_frames,(unsigned long long)ready_obs.callback_index);fflush(stdout);
  uint64_t next_owner_renew_ns=now_ns();
  while(!atomic_load(&sc.stop)){
    uint64_t now=now_ns();
    if(now>=next_owner_renew_ns){request_owner_lease_renewal(&e);atomic_fetch_add_explicit(&sc.owner_lease_renewals,1u,memory_order_relaxed);next_owner_renew_ns=now+(uint64_t)P0N_RT_OWNER_RENEW_MS*1000000ull;}
    sleep_ms(25u);
  }
  shutdown(sc.listen_fd,SHUT_RDWR);close(sc.listen_fd);pthread_join(thread,NULL);
  pthread_mutex_lock(&sc.post_master_mutex);
  if (sc.post_master_stream_fd >= 0) shutdown(sc.post_master_stream_fd, SHUT_RDWR);
  pthread_mutex_unlock(&sc.post_master_mutex);
  while (atomic_load_explicit(&sc.post_master_stream_running, memory_order_acquire)) sleep_ms(1u);
  pthread_mutex_destroy(&sc.post_master_mutex);
  char final[4096];p0n_sidecar_status(&sc,final,sizeof(final));printf("{\"type\":\"sidecar-final\",\"status\":%s,\"oversizedRequests\":%llu}\n",final,(unsigned long long)atomic_load(&sc.oversized_requests));fflush(stdout);
  driver.stop(&driver);driver.destroy(&driver);for(uint32_t i=0u;i<P0N_RFL_MATERIAL_MAX_ASSETS;++i){free(sc.material_asset_memory[i]);sc.material_asset_memory[i]=NULL;}
#ifdef P0N_GENESIS_IMPLANT
  xen_engine_destroy(e.genesis); e.genesis=NULL;
#endif
  return 0;
}

static int p0n_read_app_html(const char* path,char** out,size_t* out_len){
  if(!path||!out||!out_len)return 0;
  FILE* f=fopen(path,"rb");
  if(!f)return 0;
  if(fseek(f,0,SEEK_END)!=0){fclose(f);return 0;}
  long n=ftell(f);
  if(n<=0||n>32*1024*1024){fclose(f);return 0;}
  if(fseek(f,0,SEEK_SET)!=0){fclose(f);return 0;}
  char* data=(char*)malloc((size_t)n);
  if(!data){fclose(f);return 0;}
  size_t got=fread(data,1,(size_t)n,f);
  fclose(f);
  if(got!=(size_t)n){free(data);return 0;}
  *out=data;*out_len=(size_t)n;return 1;
}

static int run_sidecar_app(P0NAudioDriver driver,int physical_audio,const char* path){
  char* html=NULL;size_t len=0u;
  if(!p0n_read_app_html(path,&html,&len)){fprintf(stderr,"failed to read app html: %s\n",path?path:"(null)");if(driver.destroy)driver.destroy(&driver);return 10;}
  int rc=run_sidecar_with_driver(driver,physical_audio,html,len,0);free(html);return rc;
}

#ifdef P0N_GENESIS_IMPLANT
static int run_genesis_implant_selftest(void){
  P0NEngine e;if(!engine_prepare(&e,0))return 20;
  const uint64_t source=p0_frame();
  xen_tone_plan plan;memset(&plan,0,sizeof(plan));plan.token=0x389u;plan.frame=(xen_frame)(source+frames_for_ms(&e,P0N_ATTACK_LEAD_MS));plan.tone_count=2u;
  plan.tones[0]=(xen_tone_desc){220.0f,0.08f,4200.0f,0.9f,0u,(uint32_t)(0.28*e.sample_rate),XEN_OSC_SINE};
  plan.tones[1]=(xen_tone_desc){330.0f,0.035f,3200.0f,1.2f,(uint32_t)(0.018*e.sample_rate),(uint32_t)(0.22*e.sample_rate),XEN_OSC_TRIANGLE};
  if(xen_tone_plan_submit(e.genesis,xen_engine_epoch(e.genesis),&plan)!=XEN_OK){xen_engine_destroy(e.genesis);return 21;}
  float out[512u*2u];double energy=0.0;uint64_t nonzero=0u;
  for(unsigned b=0;b<32u;++b){memset(out,0,sizeof(out));render_callback(out,512u,&e);for(unsigned i=0;i<1024u;++i){double v=out[i];energy+=v*v;if(fabs(v)>1e-7)nonzero++;}}
  xen_telemetry tel; xen_engine_telemetry(e.genesis,&tel);
  int pass=nonzero>0u && tel.tone_plans_executed==1u && tel.nonfinite_blocks==0u;
  printf("{\"type\":\"genesis-implant-op2-resolved-tone-plan\",\"pass\":%s,\"nonzeroSamples\":%llu,\"energy\":%.9g,\"tonePlansExecuted\":%llu,\"nonfiniteBlocks\":%llu,\"parity\":\"parameter-plan-core-v1-only\"}\n",pass?"true":"false",(unsigned long long)nonzero,energy,(unsigned long long)tel.tone_plans_executed,(unsigned long long)tel.nonfinite_blocks);
  xen_engine_destroy(e.genesis);return pass?0:22;
}
#endif

static int run_null_sidecar(void){return run_sidecar_with_driver(p0n_create_null_driver(),0,NULL,0u,1);}
static int run_null_service(void){return run_sidecar_with_driver(p0n_create_null_driver(),0,NULL,0u,0);}
static int run_null_app(const char* path){return run_sidecar_app(p0n_create_null_driver(),0,path);}
#ifdef P0N_HAVE_PIPEWIRE
static int run_pipewire_sidecar(void){return run_sidecar_with_driver(p0n_create_pipewire_driver(),1,NULL,0u,1);}
static int run_pipewire_service(void){return run_sidecar_with_driver(p0n_create_pipewire_driver(),1,NULL,0u,0);}
static int run_pipewire_app(const char* path){return run_sidecar_app(p0n_create_pipewire_driver(),1,path);}
#endif

int main(int argc,char**argv){
  const char* fixed_port_env=getenv("XENSONAR_NATIVE_FIXED_PORT");
  if(fixed_port_env&&*fixed_port_env){unsigned long v=strtoul(fixed_port_env,NULL,10);if(v>1024ul&&v<65536ul)p0n_forced_sidecar_port=(uint16_t)v;}
  const char* standalone_env=getenv("XENSONAR_STANDALONE_FILE_CORS");
  p0n_standalone_file_cors=standalone_env&&strcmp(standalone_env,"1")==0;
#ifdef P0N_GENESIS_IMPLANT
  if(argc>1&&strcmp(argv[1],"--genesis-implant-selftest")==0)return run_genesis_implant_selftest();
#endif
  if(argc>1&&strcmp(argv[1],"--selftest")==0)return run_selftest();
  if(argc>1&&strcmp(argv[1],"--adversarial-selftest")==0)return run_adversarial_selftest();
  if(argc>1&&strcmp(argv[1],"--signal-truth-selftest")==0)return run_signal_truth_selftest();
  if(argc>1&&strcmp(argv[1],"--driver-lifecycle-selftest")==0)return run_null_lifecycle_selftest();
  if(argc>1&&strcmp(argv[1],"--driver-concurrency-selftest")==0)return run_null_concurrency_selftest();
  if(argc>1&&strcmp(argv[1],"--sidecar-null")==0)return run_null_sidecar();
  if(argc>1&&strcmp(argv[1],"--service-null")==0)return run_null_service();
  if(argc>1&&strcmp(argv[1],"--post-master-null")==0){p0n_post_master_only=1;return run_null_service();}
  if(argc>2&&strcmp(argv[1],"--post-master-null-app")==0){p0n_post_master_only=1;return run_null_app(argv[2]);}
  if(argc>2&&strcmp(argv[1],"--sidecar-app")==0)return run_null_app(argv[2]);
#ifdef P0N_HAVE_PIPEWIRE
  if(argc>2&&strcmp(argv[1],"--post-master-app")==0){p0n_post_master_only=1;return run_pipewire_app(argv[2]);}
  if(argc>1&&strcmp(argv[1],"--pipewire-sidecar")==0)return run_pipewire_sidecar();
  if(argc>1&&strcmp(argv[1],"--pipewire-service")==0)return run_pipewire_service();
  if(argc>2&&strcmp(argv[1],"--pipewire-app")==0)return run_pipewire_app(argv[2]);
  if(argc>1&&strcmp(argv[1],"--pipewire-selftest")==0)return run_pipewire_selftest();
  if(argc>1&&strcmp(argv[1],"--pipewire-lifecycle-selftest")==0)return run_pipewire_lifecycle_selftest();
  if(argc>1&&strcmp(argv[1],"--pipewire")==0)return run_interactive_with_driver(p0n_create_pipewire_driver(),1);
#endif
  return run_interactive_with_driver(p0n_create_null_driver(),0);
}
