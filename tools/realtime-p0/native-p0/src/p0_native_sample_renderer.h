#ifndef P0_NATIVE_SAMPLE_RENDERER_H
#define P0_NATIVE_SAMPLE_RENDERER_H

#include <math.h>
#include <stdatomic.h>
#include <stdint.h>
#include <string.h>

/* Control-thread published, append-only PCM bank. No RT allocation, file IO,
   decoding, mutation, or reclamation. A sidecar session may publish at most
   P0N_SAMPLE_MAX_ASSETS assets; a full bank fails closed. */
#define P0N_SAMPLE_MAX_ASSETS 8u
#define P0N_SAMPLE_MAX_FRAMES 96000u /* 2 s at 48 kHz */
#define P0N_SAMPLE_MAX_CHANNELS 2u
#define P0N_SAMPLE_RING_CAPACITY 64u
#define P0N_SAMPLE_MAX_VOICES 24u

typedef struct {
  uint64_t id_hash;
  uint32_t frames;
  uint32_t channels;
  uint32_t sample_rate;
  float pcm[P0N_SAMPLE_MAX_FRAMES * P0N_SAMPLE_MAX_CHANNELS];
  atomic_uint ready;
} P0NSampleAsset;

typedef struct {
  P0NSampleAsset assets[P0N_SAMPLE_MAX_ASSETS];
  atomic_uint count;
  atomic_ullong rejected_full;
  atomic_ullong rejected_invalid;
} P0NSampleAssetBank;

typedef struct {
  uint64_t sequence;
  uint64_t source_frame;
  uint64_t intended_frame;
  uint64_t latest_admission_frame;
  uint32_t asset_index;
  float playback_rate;
  float level;
  float pan_left;
  float pan_right;
  uint64_t duration_frames;
  uint8_t loop;
} P0NSampleAttack;

typedef struct {
  P0NSampleAttack entries[P0N_SAMPLE_RING_CAPACITY];
  atomic_ullong write_count;
  atomic_ullong read_count;
  atomic_ullong rejected_full;
} P0NSampleRing;

typedef struct {
  uint64_t sequence;
  uint64_t start_frame;
  uint64_t end_frame;
  double position;
  float playback_rate;
  float level;
  float pan_left;
  float pan_right;
  uint32_t asset_index;
  uint8_t loop;
  uint8_t active;
} P0NSampleVoice;

typedef struct {
  uint32_t output_sample_rate;
  P0NSampleAssetBank bank;
  P0NSampleRing ring;
  P0NSampleVoice voices[P0N_SAMPLE_MAX_VOICES];
  uint32_t active_voice_count;
  atomic_ullong attacks_started;
  atomic_ullong attacks_rejected;
  atomic_ullong attacks_stale;
  atomic_ullong voices_exhausted;
  atomic_ullong nonzero_callbacks;
  atomic_uint peak_max_micros;
  atomic_uint terminal;
} P0NSampleRenderer;

static inline void p0n_sample_bank_init(P0NSampleAssetBank* bank){
  memset(bank,0,sizeof(*bank));
  atomic_init(&bank->count,0u);atomic_init(&bank->rejected_full,0u);atomic_init(&bank->rejected_invalid,0u);
  for(uint32_t i=0;i<P0N_SAMPLE_MAX_ASSETS;++i)atomic_init(&bank->assets[i].ready,0u);
}

static inline int p0n_sample_bank_publish(P0NSampleAssetBank* bank,uint64_t id_hash,const float* pcm,uint32_t frames,uint32_t channels,uint32_t sample_rate,uint32_t* out_index){
  if(!bank||!pcm||id_hash==0u||frames<1u||frames>P0N_SAMPLE_MAX_FRAMES||channels<1u||channels>P0N_SAMPLE_MAX_CHANNELS||sample_rate<8000u||sample_rate>192000u){
    if(bank) atomic_fetch_add_explicit(&bank->rejected_invalid,1u,memory_order_relaxed);
    return 0;
  }
  uint32_t count=atomic_load_explicit(&bank->count,memory_order_acquire);
  /* Idempotent publish by immutable identity. */
  for(uint32_t i=0;i<count;++i){
    P0NSampleAsset* a=&bank->assets[i];
    if(atomic_load_explicit(&a->ready,memory_order_acquire)&&a->id_hash==id_hash){if(out_index)*out_index=i;return 1;}
  }
  if(count>=P0N_SAMPLE_MAX_ASSETS){atomic_fetch_add_explicit(&bank->rejected_full,1u,memory_order_relaxed);return 0;}
  P0NSampleAsset* a=&bank->assets[count];
  a->id_hash=id_hash;a->frames=frames;a->channels=channels;a->sample_rate=sample_rate;
  const uint32_t total=frames*channels;
  for(uint32_t i=0;i<total;++i){float v=pcm[i];if(!isfinite(v))v=0.0f;if(v>1.0f)v=1.0f;else if(v<-1.0f)v=-1.0f;a->pcm[i]=v;}
  atomic_store_explicit(&a->ready,1u,memory_order_release);
  atomic_store_explicit(&bank->count,count+1u,memory_order_release);
  if(out_index) *out_index=count;
  return 1;
}

static inline void p0n_sample_ring_init(P0NSampleRing* ring){memset(ring,0,sizeof(*ring));atomic_init(&ring->write_count,0u);atomic_init(&ring->read_count,0u);atomic_init(&ring->rejected_full,0u);}
static inline int p0n_sample_ring_push(P0NSampleRing* ring,const P0NSampleAttack* item){uint64_t w=atomic_load_explicit(&ring->write_count,memory_order_relaxed),r=atomic_load_explicit(&ring->read_count,memory_order_acquire);if(w-r>=P0N_SAMPLE_RING_CAPACITY){atomic_fetch_add_explicit(&ring->rejected_full,1u,memory_order_relaxed);return 0;}ring->entries[w%P0N_SAMPLE_RING_CAPACITY]=*item;atomic_store_explicit(&ring->write_count,w+1u,memory_order_release);return 1;}
static inline int p0n_sample_ring_pop(P0NSampleRing* ring,P0NSampleAttack* out){uint64_t r=atomic_load_explicit(&ring->read_count,memory_order_relaxed),w=atomic_load_explicit(&ring->write_count,memory_order_acquire);if(r==w)return 0;*out=ring->entries[r%P0N_SAMPLE_RING_CAPACITY];atomic_store_explicit(&ring->read_count,r+1u,memory_order_release);return 1;}

static inline void p0n_sample_renderer_init(P0NSampleRenderer* r,uint32_t output_sample_rate){memset(r,0,sizeof(*r));r->output_sample_rate=output_sample_rate;p0n_sample_bank_init(&r->bank);p0n_sample_ring_init(&r->ring);atomic_init(&r->attacks_started,0u);atomic_init(&r->attacks_rejected,0u);atomic_init(&r->attacks_stale,0u);atomic_init(&r->voices_exhausted,0u);atomic_init(&r->nonzero_callbacks,0u);atomic_init(&r->peak_max_micros,0u);atomic_init(&r->terminal,0u);}

static inline P0NSampleVoice* p0n_sample_find_free_voice(P0NSampleRenderer* r){for(uint32_t i=0;i<P0N_SAMPLE_MAX_VOICES;++i)if(!r->voices[i].active)return &r->voices[i];return NULL;}
static inline int p0n_sample_start_attack(P0NSampleRenderer* r,const P0NSampleAttack* a){uint32_t count=atomic_load_explicit(&r->bank.count,memory_order_acquire);if(a->asset_index>=count)return 0;P0NSampleAsset* asset=&r->bank.assets[a->asset_index];if(!atomic_load_explicit(&asset->ready,memory_order_acquire))return 0;P0NSampleVoice* v=p0n_sample_find_free_voice(r);if(!v){atomic_fetch_add_explicit(&r->voices_exhausted,1u,memory_order_relaxed);return 0;}memset(v,0,sizeof(*v));v->sequence=a->sequence;v->start_frame=a->intended_frame;v->end_frame=a->intended_frame+a->duration_frames;v->position=0.0;v->playback_rate=a->playback_rate*(float)asset->sample_rate/(float)r->output_sample_rate;v->level=a->level;v->pan_left=a->pan_left;v->pan_right=a->pan_right;v->asset_index=a->asset_index;v->loop=a->loop;v->active=1u;r->active_voice_count+=1u;atomic_fetch_add_explicit(&r->attacks_started,1u,memory_order_relaxed);return 1;}
static inline void p0n_sample_apply_control(P0NSampleRenderer* r,uint64_t now_frame){P0NSampleAttack a;if(atomic_load_explicit(&r->terminal,memory_order_acquire)){while(p0n_sample_ring_pop(&r->ring,&a))atomic_fetch_add_explicit(&r->attacks_rejected,1u,memory_order_relaxed);return;}uint32_t processed=0u;while(processed<8u&&p0n_sample_ring_pop(&r->ring,&a)){++processed;if(a.intended_frame<a.source_frame||a.latest_admission_frame<a.intended_frame||!(a.playback_rate>0.0f)||!(a.level>0.0f)||a.duration_frames<1u){atomic_fetch_add_explicit(&r->attacks_rejected,1u,memory_order_relaxed);continue;}if(now_frame>a.latest_admission_frame){atomic_fetch_add_explicit(&r->attacks_stale,1u,memory_order_relaxed);atomic_fetch_add_explicit(&r->attacks_rejected,1u,memory_order_relaxed);continue;}if(!p0n_sample_start_attack(r,&a))atomic_fetch_add_explicit(&r->attacks_rejected,1u,memory_order_relaxed);}}

static inline float p0n_sample_asset_read(const P0NSampleAsset* a,double pos,uint32_t channel){if(a->frames<1u)return 0.0f;if(pos<0.0)pos=0.0;uint32_t i0=(uint32_t)floor(pos);if(i0>=a->frames)i0=a->frames-1u;uint32_t i1=i0+1u<a->frames?i0+1u:i0;float frac=(float)(pos-(double)i0);uint32_t c=a->channels==1u?0u:(channel<a->channels?channel:a->channels-1u);float x0=a->pcm[i0*a->channels+c],x1=a->pcm[i1*a->channels+c];return x0+(x1-x0)*frac;}

static inline float p0n_sample_render(P0NSampleRenderer* r,uint64_t start_frame,float* stereo,uint32_t frames){if(r->active_voice_count==0u)return 0.0f;float peak=0.0f;for(uint32_t fo=0;fo<frames;++fo){uint64_t frame=start_frame+(uint64_t)fo;float lmix=0.0f,rmix=0.0f;for(uint32_t vi=0;vi<P0N_SAMPLE_MAX_VOICES;++vi){P0NSampleVoice* v=&r->voices[vi];if(!v->active)continue;if(frame<v->start_frame)continue;if(frame>=v->end_frame){v->active=0u;if(r->active_voice_count)--r->active_voice_count;continue;}P0NSampleAsset* a=&r->bank.assets[v->asset_index];if(!atomic_load_explicit(&a->ready,memory_order_acquire)){v->active=0u;if(r->active_voice_count)--r->active_voice_count;continue;}if(v->position>=(double)a->frames){if(v->loop&&a->frames>0u)v->position=fmod(v->position,(double)a->frames);else{v->active=0u;if(r->active_voice_count)--r->active_voice_count;continue;}}float sl=p0n_sample_asset_read(a,v->position,0u)*v->level*v->pan_left;float sr=p0n_sample_asset_read(a,v->position,1u)*v->level*v->pan_right;lmix+=sl;rmix+=sr;v->position+=(double)v->playback_rate;}float l=stereo[fo*2u]+lmix,rgt=stereo[fo*2u+1u]+rmix;if(l>0.98f)l=0.98f;else if(l<-0.98f)l=-0.98f;if(rgt>0.98f)rgt=0.98f;else if(rgt<-0.98f)rgt=-0.98f;stereo[fo*2u]=l;stereo[fo*2u+1u]=rgt;float m=fmaxf(fabsf(lmix),fabsf(rmix));if(m>peak)peak=m;}if(peak>0.000001f){atomic_fetch_add_explicit(&r->nonzero_callbacks,1u,memory_order_relaxed);uint32_t micros=(uint32_t)(peak*1000000.0f),old=atomic_load_explicit(&r->peak_max_micros,memory_order_relaxed);while(micros>old&&!atomic_compare_exchange_weak_explicit(&r->peak_max_micros,&old,micros,memory_order_relaxed,memory_order_relaxed)){}}return peak;}

static inline void p0n_sample_panic(P0NSampleRenderer* r){atomic_store_explicit(&r->terminal,1u,memory_order_release);for(uint32_t i=0;i<P0N_SAMPLE_MAX_VOICES;++i)r->voices[i].active=0u;r->active_voice_count=0u;}

#endif
