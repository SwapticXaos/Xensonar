#include <math.h>
#include <stdio.h>
#include <string.h>
#include "../src/p0_native_sample_renderer.h"
int main(void){
  P0NSampleRenderer r;p0n_sample_renderer_init(&r,48000u);
  static float pcm[4800];for(uint32_t i=0;i<4800u;++i)pcm[i]=(float)sin(6.283185307179586*(double)i/64.0)*0.5f;
  uint32_t idx=99u;int published=p0n_sample_bank_publish(&r.bank,0x1234u,pcm,4800u,1u,48000u,&idx);
  P0NSampleAttack a={0};a.sequence=1u;a.source_frame=1000u;a.intended_frame=1240u;a.latest_admission_frame=5560u;a.asset_index=idx;a.playback_rate=1.0f;a.level=0.5f;a.pan_left=1.0f;a.pan_right=1.0f;a.duration_frames=4800u;
  int queued=p0n_sample_ring_push(&r.ring,&a);p0n_sample_apply_control(&r,1100u);
  float out[512*2];memset(out,0,sizeof(out));float peak=p0n_sample_render(&r,1240u,out,512u);
  P0NSampleAttack stale=a;stale.sequence=2u;stale.source_frame=10u;stale.intended_frame=250u;stale.latest_admission_frame=500u;p0n_sample_ring_push(&r.ring,&stale);p0n_sample_apply_control(&r,10000u);
  p0n_sample_panic(&r);P0NSampleAttack post=a;post.sequence=3u;p0n_sample_ring_push(&r.ring,&post);p0n_sample_apply_control(&r,1200u);
  int pass=published&&queued&&idx==0u&&peak>0.0001f&&atomic_load(&r.attacks_started)==1u&&atomic_load(&r.attacks_stale)==1u&&atomic_load(&r.terminal)==1u;
  printf("{\"pass\":%s,\"assetIndex\":%u,\"peak\":%.6f,\"attacksStarted\":%llu,\"attacksStale\":%llu,\"nonzeroCallbacks\":%llu,\"panicTerminal\":%s}\n",pass?"true":"false",idx,peak,(unsigned long long)atomic_load(&r.attacks_started),(unsigned long long)atomic_load(&r.attacks_stale),(unsigned long long)atomic_load(&r.nonzero_callbacks),atomic_load(&r.terminal)?"true":"false");
  return pass?0:1;
}
