#ifndef P0_NATIVE_WAVESTARTER_RENDERER_H
#define P0_NATIVE_WAVESTARTER_RENDERER_H

#include <math.h>
#include <stdatomic.h>
#include <stdint.h>
#include <string.h>

#include "p0_native_wavestarter_presets.h"

#define P0N_WS_RING_CAPACITY 64u
#define P0N_WS_MAX_VOICES 48u
#define P0N_WS_SINE_TABLE 2048u
#define P0N_WS_PI2 6.28318530717958647692

typedef struct {
  uint64_t start_frame;
  uint64_t end_frame;
  float phase_inc;
  float gain;
  float attack_inc;
  float decay_mul;
  float b0,b1,b2,a1,a2;
  uint8_t waveform;
} P0NWaveStarterTonePlan;

typedef struct {
  uint64_t sequence;
  uint64_t source_frame;
  uint64_t intended_frame;
  uint64_t latest_admission_frame;
  uint8_t preset_index;
  uint8_t tone_count;
  P0NWaveStarterTonePlan tones[P0N_WS_MAX_PARTIALS];
} P0NWaveStarterAttack;

typedef struct {
  P0NWaveStarterAttack entries[P0N_WS_RING_CAPACITY];
  atomic_ullong write_count;
  atomic_ullong read_count;
  atomic_ullong rejected_full;
} P0NWaveStarterRing;

typedef struct {
  uint64_t start_frame;
  uint64_t end_frame;
  float phase;
  float phase_inc;
  float gain;
  float env;
  float attack_inc;
  float decay_mul;
  float b0,b1,b2,a1,a2;
  float z1,z2;
  uint8_t waveform;
  uint8_t stage; /* 0 waiting, 1 attack, 2 decay */
  uint8_t active;
} P0NWaveStarterToneVoice;

typedef struct {
  uint64_t sequence;
  uint8_t preset_index;
  uint8_t tone_count;
  uint8_t active;
  P0NWaveStarterToneVoice tones[P0N_WS_MAX_PARTIALS];
} P0NWaveStarterVoice;

typedef struct {
  uint32_t sample_rate;
  P0NWaveStarterRing ring;
  P0NWaveStarterVoice voices[P0N_WS_MAX_VOICES];
  float sine_table[P0N_WS_SINE_TABLE];
  uint32_t active_voice_count;
  atomic_ullong attacks_started;
  atomic_ullong attacks_rejected;
  atomic_ullong attacks_stale;
  atomic_ullong voices_exhausted;
  atomic_uint observed_active_voices;
  atomic_uint peak_max_micros;
  atomic_ullong nonzero_callbacks;
  atomic_uint terminal;
} P0NWaveStarterRenderer;

static inline void p0n_ws_ring_init(P0NWaveStarterRing* ring) {
  atomic_init(&ring->write_count,0u);
  atomic_init(&ring->read_count,0u);
  atomic_init(&ring->rejected_full,0u);
}

static inline int p0n_ws_ring_push(P0NWaveStarterRing* ring,const P0NWaveStarterAttack* item) {
  uint64_t w=atomic_load_explicit(&ring->write_count,memory_order_relaxed);
  uint64_t r=atomic_load_explicit(&ring->read_count,memory_order_acquire);
  if(w-r>=P0N_WS_RING_CAPACITY){atomic_fetch_add_explicit(&ring->rejected_full,1u,memory_order_relaxed);return 0;}
  ring->entries[w%P0N_WS_RING_CAPACITY]=*item;
  atomic_store_explicit(&ring->write_count,w+1u,memory_order_release);
  return 1;
}

static inline int p0n_ws_ring_pop(P0NWaveStarterRing* ring,P0NWaveStarterAttack* out) {
  uint64_t r=atomic_load_explicit(&ring->read_count,memory_order_relaxed);
  uint64_t w=atomic_load_explicit(&ring->write_count,memory_order_acquire);
  if(r==w)return 0;
  *out=ring->entries[r%P0N_WS_RING_CAPACITY];
  atomic_store_explicit(&ring->read_count,r+1u,memory_order_release);
  return 1;
}

static inline uint32_t p0n_ws_ring_depth(const P0NWaveStarterRing* ring) {
  uint64_t w=atomic_load_explicit(&ring->write_count,memory_order_acquire);
  uint64_t r=atomic_load_explicit(&ring->read_count,memory_order_acquire);
  uint64_t d=w>=r?w-r:0u;
  return d>P0N_WS_RING_CAPACITY?P0N_WS_RING_CAPACITY:(uint32_t)d;
}

static inline void p0n_ws_make_lowpass(float cutoff,float q,uint32_t sr,float* b0,float* b1,float* b2,float* a1,float* a2) {
  if(cutoff<40.0f)cutoff=40.0f;
  if(cutoff>(float)sr*0.45f)cutoff=(float)sr*0.45f;
  if(q<0.35f)q=0.35f;
  if(q>6.0f)q=6.0f;
  const double w=P0N_WS_PI2*(double)cutoff/(double)sr;
  const double c=cos(w),s=sin(w),alpha=s/(2.0*(double)q);
  const double a0=1.0+alpha;
  *b0=(float)(((1.0-c)*0.5)/a0);
  *b1=(float)((1.0-c)/a0);
  *b2=*b0;
  *a1=(float)((-2.0*c)/a0);
  *a2=(float)((1.0-alpha)/a0);
}

static inline void p0n_ws_renderer_init(P0NWaveStarterRenderer* r,uint32_t sample_rate) {
  memset(r,0,sizeof(*r));
  r->sample_rate=sample_rate;
  p0n_ws_ring_init(&r->ring);
  atomic_init(&r->attacks_started,0u);
  atomic_init(&r->attacks_rejected,0u);
  atomic_init(&r->attacks_stale,0u);
  atomic_init(&r->voices_exhausted,0u);
  atomic_init(&r->observed_active_voices,0u);
  atomic_init(&r->peak_max_micros,0u);
  atomic_init(&r->nonzero_callbacks,0u);
  atomic_init(&r->terminal,0u);
  for(uint32_t i=0;i<P0N_WS_SINE_TABLE;++i)r->sine_table[i]=(float)sin(P0N_WS_PI2*(double)i/(double)P0N_WS_SINE_TABLE);
}

static inline int p0n_ws_build_attack(
  P0NWaveStarterRenderer* r,
  P0NWaveStarterAttack* out,
  uint64_t sequence,
  uint64_t source_frame,
  uint64_t intended_frame,
  uint64_t latest_admission_frame,
  int preset_index,
  float base_frequency_hz,
  float peak
) {
  if(!r||!out||preset_index<0||preset_index>=(int)P0N_WS_PRESET_COUNT||!(base_frequency_hz>0.0f)||!(peak>0.0f))return 0;
  const P0NWaveStarterPreset* preset=&P0N_WS_PRESETS[preset_index];
  memset(out,0,sizeof(*out));
  out->sequence=sequence;
  out->source_frame=source_frame;
  out->intended_frame=intended_frame;
  out->latest_admission_frame=latest_admission_frame;
  out->preset_index=(uint8_t)preset_index;
  out->tone_count=preset->tone_count;
  for(uint32_t i=0;i<preset->tone_count;++i){
    const P0NWaveStarterPresetTone* spec=&preset->tones[i];
    P0NWaveStarterTonePlan* tone=&out->tones[i];
    const float frequency=base_frequency_hz*spec->freq_mul;
    uint64_t delay_frames=(uint64_t)llround((double)spec->delay_sec*(double)r->sample_rate);
    uint64_t duration_frames=(uint64_t)llround((double)spec->duration_sec*(double)r->sample_rate);
    if(duration_frames<32u)duration_frames=32u;
    uint64_t attack_frames=(uint64_t)llround(0.004*(double)r->sample_rate);
    if(attack_frames<1u)attack_frames=1u;
    if(attack_frames>duration_frames/3u)attack_frames=duration_frames/3u;
    if(attack_frames<1u)attack_frames=1u;
    uint64_t decay_frames=duration_frames>attack_frames?duration_frames-attack_frames:1u;
    tone->start_frame=intended_frame+delay_frames;
    tone->end_frame=tone->start_frame+duration_frames;
    tone->phase_inc=frequency/(float)r->sample_rate;
    tone->gain=peak*spec->gain_mul;
    tone->attack_inc=1.0f/(float)attack_frames;
    tone->decay_mul=(float)pow(0.001,1.0/(double)decay_frames);
    tone->waveform=spec->waveform;
    p0n_ws_make_lowpass(spec->cutoff_hz,spec->resonance,r->sample_rate,&tone->b0,&tone->b1,&tone->b2,&tone->a1,&tone->a2);
  }
  return 1;
}

static inline P0NWaveStarterVoice* p0n_ws_find_free_voice(P0NWaveStarterRenderer* r) {
  for(uint32_t i=0;i<P0N_WS_MAX_VOICES;++i)if(!r->voices[i].active)return &r->voices[i];
  return NULL;
}

static inline int p0n_ws_start_attack(P0NWaveStarterRenderer* r,const P0NWaveStarterAttack* attack) {
  P0NWaveStarterVoice* voice=p0n_ws_find_free_voice(r);
  if(!voice){atomic_fetch_add_explicit(&r->voices_exhausted,1u,memory_order_relaxed);return 0;}
  memset(voice,0,sizeof(*voice));
  voice->sequence=attack->sequence;
  voice->preset_index=attack->preset_index;
  voice->tone_count=attack->tone_count;
  voice->active=1u;
  for(uint32_t i=0;i<attack->tone_count;++i){
    const P0NWaveStarterTonePlan* plan=&attack->tones[i];
    P0NWaveStarterToneVoice* tone=&voice->tones[i];
    tone->start_frame=plan->start_frame;
    tone->end_frame=plan->end_frame;
    tone->phase=0.0f;
    tone->phase_inc=plan->phase_inc;
    tone->gain=plan->gain;
    tone->env=0.0f;
    tone->attack_inc=plan->attack_inc;
    tone->decay_mul=plan->decay_mul;
    tone->b0=plan->b0;tone->b1=plan->b1;tone->b2=plan->b2;tone->a1=plan->a1;tone->a2=plan->a2;
    tone->z1=0.0f;tone->z2=0.0f;
    tone->waveform=plan->waveform;
    tone->stage=0u;
    tone->active=1u;
  }
  r->active_voice_count+=1u;
  atomic_store_explicit(&r->observed_active_voices,r->active_voice_count,memory_order_relaxed);
  atomic_fetch_add_explicit(&r->attacks_started,1u,memory_order_relaxed);
  return 1;
}

static inline void p0n_ws_apply_control(P0NWaveStarterRenderer* r,uint64_t now_frame) {
  P0NWaveStarterAttack attack;
  if(atomic_load_explicit(&r->terminal,memory_order_acquire)){while(p0n_ws_ring_pop(&r->ring,&attack))atomic_fetch_add_explicit(&r->attacks_rejected,1u,memory_order_relaxed);return;}
  uint32_t processed=0u;
  while(processed<8u&&p0n_ws_ring_pop(&r->ring,&attack)){
    ++processed;
    if(attack.intended_frame<attack.source_frame||attack.latest_admission_frame<attack.intended_frame){
      atomic_fetch_add_explicit(&r->attacks_rejected,1u,memory_order_relaxed);continue;
    }
    if(now_frame>attack.latest_admission_frame){
      atomic_fetch_add_explicit(&r->attacks_stale,1u,memory_order_relaxed);
      atomic_fetch_add_explicit(&r->attacks_rejected,1u,memory_order_relaxed);continue;
    }
    if(!p0n_ws_start_attack(r,&attack))atomic_fetch_add_explicit(&r->attacks_rejected,1u,memory_order_relaxed);
  }
}

static inline float p0n_ws_wave_sample(const P0NWaveStarterRenderer* r,uint8_t waveform,float phase) {
  phase-=floorf(phase);
  switch(waveform){
    case P0N_WS_WAVE_TRIANGLE: return 1.0f-4.0f*fabsf(phase-0.5f);
    case P0N_WS_WAVE_SAWTOOTH: return phase*2.0f-1.0f;
    case P0N_WS_WAVE_SQUARE: return phase<0.5f?1.0f:-1.0f;
    default: {
      uint32_t idx=(uint32_t)(phase*(float)P0N_WS_SINE_TABLE)&(P0N_WS_SINE_TABLE-1u);
      return r->sine_table[idx];
    }
  }
}

static inline void p0n_ws_panic(P0NWaveStarterRenderer* r) {
  atomic_store_explicit(&r->terminal,1u,memory_order_release);
  for(uint32_t i=0;i<P0N_WS_MAX_VOICES;++i)r->voices[i].active=0u;
  r->active_voice_count=0u;
  atomic_store_explicit(&r->observed_active_voices,0u,memory_order_relaxed);
}

static inline float p0n_ws_render(P0NWaveStarterRenderer* r,uint64_t start_frame,float* stereo,uint32_t frames) {
  if(r->active_voice_count==0u)return 0.0f;
  float callback_peak=0.0f;
  for(uint32_t frame_offset=0;frame_offset<frames;++frame_offset){
    const uint64_t frame=start_frame+(uint64_t)frame_offset;
    float mix=0.0f;
    for(uint32_t vi=0;vi<P0N_WS_MAX_VOICES;++vi){
      P0NWaveStarterVoice* voice=&r->voices[vi];
      if(!voice->active)continue;
      uint32_t live_tones=0u;
      for(uint32_t ti=0;ti<voice->tone_count;++ti){
        P0NWaveStarterToneVoice* tone=&voice->tones[ti];
        if(!tone->active)continue;
        if(frame<tone->start_frame){++live_tones;continue;}
        if(frame>=tone->end_frame){tone->active=0u;continue;}
        ++live_tones;
        if(tone->stage==0u){tone->stage=1u;tone->env=0.0f;}
        if(tone->stage==1u){tone->env+=tone->attack_inc;if(tone->env>=1.0f){tone->env=1.0f;tone->stage=2u;}}
        else tone->env*=tone->decay_mul;
        float raw=p0n_ws_wave_sample(r,tone->waveform,tone->phase)*tone->gain*tone->env;
        tone->phase+=tone->phase_inc;if(tone->phase>=1.0f)tone->phase-=floorf(tone->phase);
        float filtered=tone->b0*raw+tone->z1;
        tone->z1=tone->b1*raw-tone->a1*filtered+tone->z2;
        tone->z2=tone->b2*raw-tone->a2*filtered;
        mix+=filtered;
      }
      if(live_tones==0u){voice->active=0u;if(r->active_voice_count>0u)--r->active_voice_count;}
    }
    if(mix>0.98f)mix=0.98f;else if(mix<-0.98f)mix=-0.98f;
    float left=stereo[frame_offset*2u]+mix;
    float right=stereo[frame_offset*2u+1u]+mix;
    if(left>0.98f)left=0.98f;else if(left<-0.98f)left=-0.98f;
    if(right>0.98f)right=0.98f;else if(right<-0.98f)right=-0.98f;
    stereo[frame_offset*2u]=left;stereo[frame_offset*2u+1u]=right;
    float magnitude=fabsf(mix);if(magnitude>callback_peak)callback_peak=magnitude;
  }
  atomic_store_explicit(&r->observed_active_voices,r->active_voice_count,memory_order_relaxed);
  if(callback_peak>0.000001f){
    atomic_fetch_add_explicit(&r->nonzero_callbacks,1u,memory_order_relaxed);
    uint32_t micros=(uint32_t)(callback_peak*1000000.0f);
    uint32_t old=atomic_load_explicit(&r->peak_max_micros,memory_order_relaxed);
    while(micros>old&&!atomic_compare_exchange_weak_explicit(&r->peak_max_micros,&old,micros,memory_order_relaxed,memory_order_relaxed)){}
  }
  return callback_peak;
}

#endif
