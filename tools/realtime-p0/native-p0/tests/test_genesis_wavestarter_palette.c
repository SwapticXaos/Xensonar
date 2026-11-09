/* Cross-boundary OP2 proof.
 * Canonical Xensonar preset manifest -> generated P0 preset header -> resolved
 * execution plan -> generic Genesis C11 tone-plan primitive.
 *
 * This proves preservation of the CORE PARAMETER PLAN and audible palette
 * distinction only. It does NOT claim full legacy WaveStarter PCM parity.
 */
#include "p0_native_wavestarter_presets.h"
#include "xen/xen_audio.h"
#include <math.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static uint32_t hash_bytes(const void* ptr,size_t n){
  const unsigned char* b=(const unsigned char*)ptr;uint32_t h=2166136261u;
  for(size_t i=0;i<n;++i){h^=b[i];h*=16777619u;}return h;
}

static int render_preset(uint32_t pi,uint32_t* out_hash,double* out_rms){
  xen_engine* e=xen_engine_create(NULL);if(!e)return 0;
  const P0NWaveStarterPreset* p=&P0N_WS_PRESETS[pi];
  xen_tone_plan plan;memset(&plan,0,sizeof plan);plan.token=100u+pi;plan.frame=128;plan.tone_count=p->tone_count;
  const float base=329.63f,peak=0.08f; const double sr=48000.0;
  for(uint32_t i=0;i<p->tone_count;++i){
    const P0NWaveStarterPresetTone* s=&p->tones[i];xen_tone_desc* t=&plan.tones[i];
    t->frequency_hz=base*s->freq_mul;t->gain=peak*s->gain_mul;t->cutoff_hz=s->cutoff_hz;t->resonance=s->resonance;
    t->delay_frames=(uint32_t)llround((double)s->delay_sec*sr);
    t->duration_frames=(uint32_t)llround((double)s->duration_sec*sr);if(t->duration_frames<2u)t->duration_frames=2u;
    t->waveform=(uint32_t)s->waveform;
  }
  if(xen_tone_plan_submit(e,xen_engine_epoch(e),&plan)!=XEN_OK){xen_engine_destroy(e);return 0;}
  const uint32_t frames=48000u; float* pcm=(float*)calloc((size_t)frames*2u,sizeof(float)); if(!pcm){xen_engine_destroy(e);return 0;}
  float L[512],R[512];uint32_t pos=0;double ss=0.0;
  while(pos<frames){uint32_t q=frames-pos>512u?512u:frames-pos;xen_engine_render(e,L,R,q);for(uint32_t j=0;j<q;++j){pcm[(pos+j)*2u]=L[j];pcm[(pos+j)*2u+1u]=R[j];ss+=(double)L[j]*L[j]+(double)R[j]*R[j];}pos+=q;}
  xen_telemetry tel;xen_engine_telemetry(e,&tel);
  int ok=tel.tone_plans_executed==1u&&tel.nonfinite_blocks==0u&&tel.tone_plans_denied_no_voice==0u;
  for(uint32_t i=0;i<frames*2u;++i)if(!isfinite(pcm[i]))ok=0;
  *out_hash=hash_bytes(pcm,(size_t)frames*2u*sizeof(float));*out_rms=sqrt(ss/((double)frames*2.0));
  free(pcm);xen_engine_destroy(e);return ok&&*out_rms>1e-7;
}

int main(void){
  if(strcmp(P0N_WS_PRESET_MANIFEST_VERSION,"wave-starter-synth-preset-v1")!=0||P0N_WS_PRESET_COUNT!=15u){fprintf(stderr,"manifest contract mismatch\n");return 2;}
  uint32_t hashes[P0N_WS_PRESET_COUNT];double rms[P0N_WS_PRESET_COUNT];
  for(uint32_t i=0;i<P0N_WS_PRESET_COUNT;++i){
    if(!render_preset(i,&hashes[i],&rms[i])){fprintf(stderr,"preset %s failed native render\n",P0N_WS_PRESETS[i].id);return 3;}
    printf("%02u %-18s tones=%u hash=%08x rms=%.8f\n",i,P0N_WS_PRESETS[i].id,P0N_WS_PRESETS[i].tone_count,hashes[i],rms[i]);
  }
  uint32_t unique=0;
  for(uint32_t i=0;i<P0N_WS_PRESET_COUNT;++i){int first=1;for(uint32_t j=0;j<i;++j)if(hashes[j]==hashes[i])first=0;if(first)unique++;}
  if(unique!=P0N_WS_PRESET_COUNT){fprintf(stderr,"only %u/%u unique PCM signatures\n",unique,P0N_WS_PRESET_COUNT);return 4;}
  printf("{\"pass\":true,\"claim\":\"wavestarter-core-parameter-plan-native-palette\",\"manifest\":\"%s\",\"presetCount\":%u,\"uniquePcmSignatures\":%u,\"parity\":\"parameter-plan-core-v1-only\"}\n",P0N_WS_PRESET_MANIFEST_VERSION,P0N_WS_PRESET_COUNT,unique);
  return 0;
}
