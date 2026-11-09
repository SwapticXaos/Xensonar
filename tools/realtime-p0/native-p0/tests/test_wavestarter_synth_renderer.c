#include <math.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include "../src/p0_native_wavestarter_renderer.h"

static uint64_t fnv1a_u32(uint64_t h,uint32_t v){for(unsigned i=0;i<4u;++i){h^=(uint8_t)(v>>(i*8u));h*=1099511628211ull;}return h;}

int main(void){
  const uint32_t sr=48000u, block=128u;
  uint64_t hashes[P0N_WS_PRESET_COUNT];
  double rms[P0N_WS_PRESET_COUNT];
  float peaks[P0N_WS_PRESET_COUNT];
  int pass=1;
  for(uint32_t preset=0;preset<P0N_WS_PRESET_COUNT;++preset){
    P0NWaveStarterRenderer r;p0n_ws_renderer_init(&r,sr);
    P0NWaveStarterAttack a;
    if(!p0n_ws_build_attack(&r,&a,preset+1u,0u,0u,5000u,(int)preset,220.0f,0.08f))return 2;
    if(!p0n_ws_ring_push(&r.ring,&a))return 3;
    p0n_ws_apply_control(&r,0u);
    uint64_t h=1469598103934665603ull;double sumsq=0.0;float peak=0.0f;uint64_t samples=0u;
    for(uint64_t frame=0u;frame<sr;frame+=block){
      float out[block*2u];memset(out,0,sizeof(out));
      uint32_t n=(uint32_t)((sr-frame)<block?(sr-frame):block);
      p0n_ws_render(&r,frame,out,n);
      for(uint32_t i=0;i<n;++i){
        float x=out[i*2u];float ax=fabsf(x);if(ax>peak)peak=ax;sumsq+=(double)x*(double)x;++samples;
        int32_t q=(int32_t)lrintf(x*1000000.0f);h=fnv1a_u32(h,(uint32_t)q);
        if(fabsf(out[i*2u]-out[i*2u+1u])>1e-7f)pass=0;
      }
    }
    hashes[preset]=h;rms[preset]=sqrt(sumsq/(double)samples);peaks[preset]=peak;
    if(!(peak>0.001f)||!(rms[preset]>0.0001)||atomic_load(&r.attacks_started)!=1u||atomic_load(&r.attacks_rejected)!=0u)pass=0;
  }
  unsigned unique=0u;
  for(uint32_t i=0;i<P0N_WS_PRESET_COUNT;++i){int seen=0;for(uint32_t j=0;j<i;++j)if(hashes[i]==hashes[j])seen=1;if(!seen)++unique;}
  if(unique<P0N_WS_PRESET_COUNT)pass=0;

  P0NWaveStarterRenderer stale;p0n_ws_renderer_init(&stale,sr);P0NWaveStarterAttack sa;
  p0n_ws_build_attack(&stale,&sa,99u,0u,10u,100u,P0N_WS_PRESET_GLASS_PING,220.0f,0.08f);p0n_ws_ring_push(&stale.ring,&sa);p0n_ws_apply_control(&stale,1000u);
  if(atomic_load(&stale.attacks_stale)!=1u||atomic_load(&stale.attacks_started)!=0u)pass=0;

  P0NWaveStarterRenderer panicr;p0n_ws_renderer_init(&panicr,sr);P0NWaveStarterAttack pa;
  p0n_ws_build_attack(&panicr,&pa,100u,0u,0u,5000u,P0N_WS_PRESET_TAPE_HALO,220.0f,0.08f);p0n_ws_ring_push(&panicr.ring,&pa);p0n_ws_apply_control(&panicr,0u);p0n_ws_panic(&panicr);
  if(atomic_load(&panicr.observed_active_voices)!=0u||!atomic_load(&panicr.terminal))pass=0;
  p0n_ws_ring_push(&panicr.ring,&pa);p0n_ws_apply_control(&panicr,0u);if(atomic_load(&panicr.attacks_started)!=1u)pass=0;

  printf("{\"pass\":%s,\"manifestVersion\":\"%s\",\"presetCount\":%u,\"uniquePcmSignatures\":%u,\"glassPing\":{\"peak\":%.6f,\"rms\":%.6f},\"deepSub\":{\"peak\":%.6f,\"rms\":%.6f},\"reedSigh\":{\"peak\":%.6f,\"rms\":%.6f},\"sparkChime\":{\"peak\":%.6f,\"rms\":%.6f},\"tapeHalo\":{\"peak\":%.6f,\"rms\":%.6f},\"staleDropped\":%llu,\"panicTerminal\":%s}\n",
    pass?"true":"false",P0N_WS_PRESET_MANIFEST_VERSION,P0N_WS_PRESET_COUNT,unique,
    peaks[P0N_WS_PRESET_GLASS_PING],rms[P0N_WS_PRESET_GLASS_PING],peaks[P0N_WS_PRESET_DEEP_SUB],rms[P0N_WS_PRESET_DEEP_SUB],
    peaks[P0N_WS_PRESET_REED_SIGH],rms[P0N_WS_PRESET_REED_SIGH],peaks[P0N_WS_PRESET_SPARK_CHIME],rms[P0N_WS_PRESET_SPARK_CHIME],
    peaks[P0N_WS_PRESET_TAPE_HALO],rms[P0N_WS_PRESET_TAPE_HALO],(unsigned long long)atomic_load(&stale.attacks_stale),atomic_load(&panicr.terminal)?"true":"false");
  return pass?0:1;
}
