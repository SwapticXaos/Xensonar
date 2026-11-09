#ifndef P0_NATIVE_ROOT_FOLLOW_MATERIAL_RENDERER_H
#define P0_NATIVE_ROOT_FOLLOW_MATERIAL_RENDERER_H

#include <stdatomic.h>
#include <stdint.h>
#include <stddef.h>

#define P0N_RFL_MATERIAL_MAX_ASSETS 4u
#define P0N_RFL_MATERIAL_MAX_GRAINS_PER_WINDOW 64u
#define P0N_RFL_MATERIAL_WINDOW_RING 32u
#ifndef P0N_RFL_MATERIAL_MAX_BATCH_WINDOWS
#define P0N_RFL_MATERIAL_MAX_BATCH_WINDOWS 8u
#endif
#define P0N_RFL_MATERIAL_MAX_VOICES 96u
/* Scheduled windows are bounded RT state; only due grains may own voices. */
#define P0N_RFL_MATERIAL_ACTIVE_WINDOWS 64u
#define P0N_RFL_MATERIAL_HANN_POINTS 160u

typedef struct {
  uint64_t start_frame;
  double source_start_frame;
  float playback_rate;
  uint32_t duration_frames;
} P0NRflMaterialGrainPlan;

typedef struct {
  uint64_t sequence;
  uint32_t generation;
  uint32_t asset_slot;
  uint64_t deadline_frame;
  float output_gain;
  uint32_t grain_count;
  P0NRflMaterialGrainPlan grains[P0N_RFL_MATERIAL_MAX_GRAINS_PER_WINDOW];
} P0NRflMaterialWindowPlan;

typedef struct {
  const float* pcm;
  uint32_t frames;
  uint32_t channels;
  uint32_t sample_rate;
  _Atomic uint32_t ready;
} P0NRflMaterialAsset;

typedef struct {
  uint32_t active;
  uint32_t generation;
  uint32_t asset_slot;
  uint64_t start_frame;
  uint64_t stop_frame;
  double source_start_frame;
  double source_step;
  uint32_t duration_frames;
  float gain;
} P0NRflMaterialVoice;

/*
 * A control window is scheduling state, not voice ownership. The pending mask
 * lets the renderer preserve future grains from a late window while discarding
 * only grains whose original start has already elapsed.
 */
typedef struct {
  uint32_t active;
  uint64_t pending_grain_mask;
  P0NRflMaterialWindowPlan plan;
} P0NRflMaterialPendingWindow;

typedef struct {
  uint32_t sample_rate;
  P0NRflMaterialAsset assets[P0N_RFL_MATERIAL_MAX_ASSETS];
  P0NRflMaterialWindowPlan windows[P0N_RFL_MATERIAL_WINDOW_RING];
  _Atomic uint32_t write_index;
  _Atomic uint32_t read_index;
  P0NRflMaterialVoice voices[P0N_RFL_MATERIAL_MAX_VOICES];
  P0NRflMaterialPendingWindow pending_windows[P0N_RFL_MATERIAL_ACTIVE_WINDOWS];
  _Atomic uint32_t terminal;
  _Atomic uint32_t active_generation;
  _Atomic uint32_t observed_active_voices;
  _Atomic uint32_t observed_pending_windows;
  _Atomic uint64_t windows_accepted;
  _Atomic uint64_t windows_stale;
  _Atomic uint64_t grains_started;
  _Atomic uint64_t grains_dropped_voice_pressure;
  _Atomic uint64_t grains_dropped_stale;
  _Atomic uint64_t submissions_rejected_terminal;
  _Atomic uint64_t nonzero_callbacks;
} P0NRflMaterialRenderer;

static const float P0N_RFL_MATERIAL_HANN[P0N_RFL_MATERIAL_HANN_POINTS] = {
  0.0f, 0.000390345323f, 0.00156077181f, 0.00350945199f, 0.00623334323f, 0.00972819248f, 0.013988543f, 0.0190077426f,
  0.0247779546f, 0.0312901694f, 0.038534219f, 0.0464987926f, 0.0551714545f, 0.0645386634f, 0.0745857934f, 0.0852971573f,
  0.0966560304f, 0.108644677f, 0.121244379f, 0.134435463f, 0.148197332f, 0.162508499f, 0.17734662f, 0.192688525f,
  0.20851026f, 0.224787123f, 0.241493697f, 0.258603899f, 0.276091011f, 0.293927731f, 0.312086209f, 0.330538091f,
  0.349254569f, 0.368206417f, 0.387364045f, 0.406697541f, 0.426176718f, 0.445771161f, 0.465450276f, 0.485183336f,
  0.504939531f, 0.524688013f, 0.544397948f, 0.56403856f, 0.583579184f, 0.602989309f, 0.622238629f, 0.641297087f,
  0.660134927f, 0.678722735f, 0.697031489f, 0.715032601f, 0.732697966f, 0.75f, 0.766911689f, 0.783406627f,
  0.799459059f, 0.815043922f, 0.830136881f, 0.84471437f, 0.858753629f, 0.872232736f, 0.885130646f, 0.897427221f,
  0.90910326f, 0.920140533f, 0.930521806f, 0.94023087f, 0.949252567f, 0.957572809f, 0.965178605f, 0.97205808f,
  0.978200492f, 0.983596251f, 0.988236932f, 0.992115289f, 0.995225266f, 0.997562008f, 0.999121866f, 0.999902404f,
  0.999902404f, 0.999121866f, 0.997562008f, 0.995225266f, 0.992115289f, 0.988236932f, 0.983596251f, 0.978200492f,
  0.97205808f, 0.965178605f, 0.957572809f, 0.949252567f, 0.94023087f, 0.930521806f, 0.920140533f, 0.90910326f,
  0.897427221f, 0.885130646f, 0.872232736f, 0.858753629f, 0.84471437f, 0.830136881f, 0.815043922f, 0.799459059f,
  0.783406627f, 0.766911689f, 0.75f, 0.732697966f, 0.715032601f, 0.697031489f, 0.678722735f, 0.660134927f,
  0.641297087f, 0.622238629f, 0.602989309f, 0.583579184f, 0.56403856f, 0.544397948f, 0.524688013f, 0.504939531f,
  0.485183336f, 0.465450276f, 0.445771161f, 0.426176718f, 0.406697541f, 0.387364045f, 0.368206417f, 0.349254569f,
  0.330538091f, 0.312086209f, 0.293927731f, 0.276091011f, 0.258603899f, 0.241493697f, 0.224787123f, 0.20851026f,
  0.192688525f, 0.17734662f, 0.162508499f, 0.148197332f, 0.134435463f, 0.121244379f, 0.108644677f, 0.0966560304f,
  0.0852971573f, 0.0745857934f, 0.0645386634f, 0.0551714545f, 0.0464987926f, 0.038534219f, 0.0312901694f, 0.0247779546f,
  0.0190077426f, 0.013988543f, 0.00972819248f, 0.00623334323f, 0.00350945199f, 0.00156077181f, 0.000390345323f, 0.0f
};

static inline void p0n_rfl_material_init(P0NRflMaterialRenderer* r, uint32_t sample_rate) {
  if (!r) return;
  r->sample_rate = sample_rate > 0u ? sample_rate : 48000u;
  atomic_store_explicit(&r->write_index, 0u, memory_order_relaxed);
  atomic_store_explicit(&r->read_index, 0u, memory_order_relaxed);
  atomic_store_explicit(&r->terminal, 0u, memory_order_relaxed);
  atomic_store_explicit(&r->active_generation, 0u, memory_order_relaxed);
  atomic_store_explicit(&r->observed_active_voices, 0u, memory_order_relaxed);
  atomic_store_explicit(&r->observed_pending_windows, 0u, memory_order_relaxed);
  atomic_store_explicit(&r->windows_accepted, 0u, memory_order_relaxed);
  atomic_store_explicit(&r->windows_stale, 0u, memory_order_relaxed);
  atomic_store_explicit(&r->grains_started, 0u, memory_order_relaxed);
  atomic_store_explicit(&r->grains_dropped_voice_pressure, 0u, memory_order_relaxed);
  atomic_store_explicit(&r->grains_dropped_stale, 0u, memory_order_relaxed);
  atomic_store_explicit(&r->submissions_rejected_terminal, 0u, memory_order_relaxed);
  atomic_store_explicit(&r->nonzero_callbacks, 0u, memory_order_relaxed);
  for (uint32_t i = 0u; i < P0N_RFL_MATERIAL_MAX_ASSETS; ++i) {
    r->assets[i].pcm = NULL;
    r->assets[i].frames = 0u;
    r->assets[i].channels = 0u;
    r->assets[i].sample_rate = 0u;
    atomic_store_explicit(&r->assets[i].ready, 0u, memory_order_relaxed);
  }
  for (uint32_t i = 0u; i < P0N_RFL_MATERIAL_MAX_VOICES; ++i) r->voices[i].active = 0u;
  for (uint32_t i = 0u; i < P0N_RFL_MATERIAL_ACTIVE_WINDOWS; ++i) r->pending_windows[i].active = 0u;
}

static inline int p0n_rfl_material_publish_asset(
  P0NRflMaterialRenderer* r,
  uint32_t slot,
  const float* pcm,
  uint32_t frames,
  uint32_t channels,
  uint32_t sample_rate
) {
  if (!r || slot >= P0N_RFL_MATERIAL_MAX_ASSETS || !pcm || frames < 2u || channels < 1u || channels > 2u || sample_rate < 8000u) return 0;
  if (atomic_load_explicit(&r->terminal, memory_order_acquire) != 0u) return 0;
  P0NRflMaterialAsset* a = &r->assets[slot];
  atomic_store_explicit(&a->ready, 0u, memory_order_release);
  a->pcm = pcm;
  a->frames = frames;
  a->channels = channels;
  a->sample_rate = sample_rate;
  atomic_store_explicit(&a->ready, 1u, memory_order_release);
  return 1;
}

static inline int p0n_rfl_material_submit_window(P0NRflMaterialRenderer* r, const P0NRflMaterialWindowPlan* plan) {
  if (!r || !plan || plan->generation == 0u || !(plan->output_gain > 0.0f) || plan->grain_count == 0u || plan->grain_count > P0N_RFL_MATERIAL_MAX_GRAINS_PER_WINDOW || plan->asset_slot >= P0N_RFL_MATERIAL_MAX_ASSETS) return 0;
  if (atomic_load_explicit(&r->terminal, memory_order_acquire) != 0u) {
    atomic_fetch_add_explicit(&r->submissions_rejected_terminal, 1u, memory_order_relaxed);
    return 0;
  }
  if (atomic_load_explicit(&r->assets[plan->asset_slot].ready, memory_order_acquire) == 0u) return 0;
  const uint32_t active_generation = atomic_load_explicit(&r->active_generation, memory_order_acquire);
  if (active_generation == 0u) atomic_store_explicit(&r->active_generation, plan->generation, memory_order_release);
  else if (active_generation != plan->generation) return 0;
  const uint32_t w = atomic_load_explicit(&r->write_index, memory_order_relaxed);
  const uint32_t rd = atomic_load_explicit(&r->read_index, memory_order_acquire);
  const uint32_t next = (w + 1u) % P0N_RFL_MATERIAL_WINDOW_RING;
  if (next == rd) return 0;
  r->windows[w] = *plan;
  atomic_store_explicit(&r->write_index, next, memory_order_release);
  return 1;
}

static inline uint32_t p0n_rfl_material_ring_depth(P0NRflMaterialRenderer* r) {
  if (!r) return 0u;
  const uint32_t w = atomic_load_explicit(&r->write_index, memory_order_acquire);
  const uint32_t rd = atomic_load_explicit(&r->read_index, memory_order_acquire);
  return w >= rd ? (w - rd) : (P0N_RFL_MATERIAL_WINDOW_RING - (rd - w));
}

static inline uint32_t p0n_rfl_material_ring_free_slots(P0NRflMaterialRenderer* r) {
  if (!r) return 0u;
  return (P0N_RFL_MATERIAL_WINDOW_RING - 1u) - p0n_rfl_material_ring_depth(r);
}

static inline int p0n_rfl_material_submit_windows(P0NRflMaterialRenderer* r, const P0NRflMaterialWindowPlan* plans, uint32_t count) {
  if (!r || !plans || count == 0u || count > P0N_RFL_MATERIAL_MAX_BATCH_WINDOWS) return 0;
  if (atomic_load_explicit(&r->terminal, memory_order_acquire) != 0u) { atomic_fetch_add_explicit(&r->submissions_rejected_terminal, count, memory_order_relaxed); return 0; }
  if (p0n_rfl_material_ring_free_slots(r) < count) return 0;
  const uint32_t active_generation = atomic_load_explicit(&r->active_generation, memory_order_acquire);
  const uint32_t generation = plans[0].generation;
  if (generation == 0u || (active_generation != 0u && active_generation != generation)) return 0;
  for (uint32_t i = 0u; i < count; ++i) {
    const P0NRflMaterialWindowPlan* plan = &plans[i];
    if (plan->generation != generation || plan->asset_slot >= P0N_RFL_MATERIAL_MAX_ASSETS || plan->grain_count == 0u || plan->grain_count > P0N_RFL_MATERIAL_MAX_GRAINS_PER_WINDOW || !(plan->output_gain > 0.0f) || atomic_load_explicit(&r->assets[plan->asset_slot].ready, memory_order_acquire) == 0u) return 0;
  }
  const uint32_t w = atomic_load_explicit(&r->write_index, memory_order_relaxed);
  for (uint32_t i = 0u; i < count; ++i) r->windows[(w + i) % P0N_RFL_MATERIAL_WINDOW_RING] = plans[i];
  if (active_generation == 0u) atomic_store_explicit(&r->active_generation, generation, memory_order_release);
  atomic_store_explicit(&r->write_index, (w + count) % P0N_RFL_MATERIAL_WINDOW_RING, memory_order_release);
  return 1;
}

static inline float p0n_rfl_material_hann(uint32_t elapsed, uint32_t duration) {
  if (duration <= 1u || elapsed >= duration) return 0.0f;
  const float pos = ((float)elapsed / (float)(duration - 1u)) * (float)(P0N_RFL_MATERIAL_HANN_POINTS - 1u);
  const uint32_t left = (uint32_t)pos;
  const uint32_t right = left + 1u < P0N_RFL_MATERIAL_HANN_POINTS ? left + 1u : left;
  const float mix = pos - (float)left;
  return P0N_RFL_MATERIAL_HANN[left] + (P0N_RFL_MATERIAL_HANN[right] - P0N_RFL_MATERIAL_HANN[left]) * mix;
}

static inline float p0n_rfl_material_sample_channel(const P0NRflMaterialAsset* a, double position, uint32_t channel) {
  if (!a || !a->pcm || a->frames < 2u) return 0.0f;
  if (position < 0.0 || position >= (double)(a->frames - 1u)) return 0.0f;
  const uint32_t left = (uint32_t)position;
  const uint32_t right = left + 1u;
  const float mix = (float)(position - (double)left);
  const uint32_t ch = a->channels == 1u ? 0u : (channel < a->channels ? channel : a->channels - 1u);
  const float l = a->pcm[(size_t)left * a->channels + ch];
  const float rr = a->pcm[(size_t)right * a->channels + ch];
  return l + (rr - l) * mix;
}

static inline P0NRflMaterialVoice* p0n_rfl_material_find_voice(P0NRflMaterialRenderer* r) {
  for (uint32_t i = 0u; i < P0N_RFL_MATERIAL_MAX_VOICES; ++i) if (!r->voices[i].active) return &r->voices[i];
  return NULL;
}

static inline P0NRflMaterialPendingWindow* p0n_rfl_material_find_pending_window(P0NRflMaterialRenderer* r) {
  for (uint32_t i = 0u; i < P0N_RFL_MATERIAL_ACTIVE_WINDOWS; ++i) {
    if (!r->pending_windows[i].active) return &r->pending_windows[i];
  }
  return NULL;
}

static inline uint32_t p0n_rfl_material_pending_window_count(P0NRflMaterialRenderer* r) {
  if (!r) return 0u;
  uint32_t count = 0u;
  for (uint32_t i = 0u; i < P0N_RFL_MATERIAL_ACTIVE_WINDOWS; ++i) {
    if (r->pending_windows[i].active) count += 1u;
  }
  return count;
}

static inline void p0n_rfl_material_prune_ended_voices(P0NRflMaterialRenderer* r, uint64_t render_start_frame) {
  for (uint32_t i = 0u; i < P0N_RFL_MATERIAL_MAX_VOICES; ++i) {
    if (r->voices[i].active && r->voices[i].stop_frame <= render_start_frame) r->voices[i].active = 0u;
  }
}

static inline void p0n_rfl_material_admit_windows(P0NRflMaterialRenderer* r, uint64_t render_start_frame) {
  uint32_t admitted = 0u;
  while (admitted < (P0N_RFL_MATERIAL_WINDOW_RING - 1u)) {
    const uint32_t rd = atomic_load_explicit(&r->read_index, memory_order_relaxed);
    const uint32_t w = atomic_load_explicit(&r->write_index, memory_order_acquire);
    if (rd == w) break;

    /* Preserve SPSC backpressure: do not consume a source window when the RT-owned
       pending bank is full. The producer will see the original ring pressure. */
    P0NRflMaterialPendingWindow* pending = p0n_rfl_material_find_pending_window(r);
    if (!pending) break;

    const P0NRflMaterialWindowPlan plan = r->windows[rd];
    atomic_store_explicit(&r->read_index, (rd + 1u) % P0N_RFL_MATERIAL_WINDOW_RING, memory_order_release);
    admitted += 1u;
    if (plan.generation != atomic_load_explicit(&r->active_generation, memory_order_acquire)) continue;

    const P0NRflMaterialAsset* a = &r->assets[plan.asset_slot];
    if (atomic_load_explicit(&a->ready, memory_order_acquire) == 0u) continue;

    const int window_late = render_start_frame > plan.deadline_frame;
    if (window_late) atomic_fetch_add_explicit(&r->windows_stale, 1u, memory_order_relaxed);

    uint64_t pending_mask = 0u;
    for (uint32_t gi = 0u; gi < plan.grain_count; ++gi) {
      const P0NRflMaterialGrainPlan* g = &plan.grains[gi];
      if (g->duration_frames < 2u || !(g->playback_rate > 0.0f)) continue;
      const uint64_t stop_frame = g->start_frame + (uint64_t)g->duration_frames;
      /* No catch-up: an attack whose original start is already behind this render
         quantum has lost its transient timing identity. Future grains survive. */
      if (g->start_frame < render_start_frame || stop_frame <= render_start_frame) {
        atomic_fetch_add_explicit(&r->grains_dropped_stale, 1u, memory_order_relaxed);
        continue;
      }
      pending_mask |= (UINT64_C(1) << gi);
    }

    if (pending_mask == 0u) continue;
    pending->plan = plan;
    pending->pending_grain_mask = pending_mask;
    pending->active = 1u;
    if (!window_late) atomic_fetch_add_explicit(&r->windows_accepted, 1u, memory_order_relaxed);
  }
}

static inline void p0n_rfl_material_start_due_grains(
  P0NRflMaterialRenderer* r,
  uint64_t render_start_frame,
  uint64_t render_end_frame
) {
  const uint32_t generation = atomic_load_explicit(&r->active_generation, memory_order_acquire);
  for (uint32_t wi = 0u; wi < P0N_RFL_MATERIAL_ACTIVE_WINDOWS; ++wi) {
    P0NRflMaterialPendingWindow* pending = &r->pending_windows[wi];
    if (!pending->active) continue;
    P0NRflMaterialWindowPlan* plan = &pending->plan;
    if (plan->generation != generation) {
      pending->active = 0u;
      pending->pending_grain_mask = 0u;
      continue;
    }
    const P0NRflMaterialAsset* a = &r->assets[plan->asset_slot];
    uint64_t mask = pending->pending_grain_mask;
    for (uint32_t gi = 0u; gi < plan->grain_count && mask != 0u; ++gi) {
      const uint64_t bit = UINT64_C(1) << gi;
      if ((mask & bit) == 0u) continue;
      const P0NRflMaterialGrainPlan* g = &plan->grains[gi];
      const uint64_t stop_frame = g->start_frame + (uint64_t)g->duration_frames;
      if (g->start_frame < render_start_frame || stop_frame <= render_start_frame) {
        mask &= ~bit;
        atomic_fetch_add_explicit(&r->grains_dropped_stale, 1u, memory_order_relaxed);
        continue;
      }
      if (g->start_frame >= render_end_frame) continue;

      P0NRflMaterialVoice* v = p0n_rfl_material_find_voice(r);
      mask &= ~bit;
      if (!v) {
        atomic_fetch_add_explicit(&r->grains_dropped_voice_pressure, 1u, memory_order_relaxed);
        continue;
      }
      v->active = 1u;
      v->generation = plan->generation;
      v->asset_slot = plan->asset_slot;
      v->start_frame = g->start_frame;
      v->stop_frame = stop_frame;
      v->source_start_frame = g->source_start_frame;
      v->source_step = (double)g->playback_rate * (double)a->sample_rate / (double)r->sample_rate;
      v->duration_frames = g->duration_frames;
      v->gain = plan->output_gain;
      atomic_fetch_add_explicit(&r->grains_started, 1u, memory_order_relaxed);
    }
    pending->pending_grain_mask = mask;
    if (mask == 0u) pending->active = 0u;
  }
}

static inline float p0n_rfl_material_render(P0NRflMaterialRenderer* r, uint64_t start_frame, float* stereo, uint32_t frames) {
  if (!r || !stereo || frames == 0u || atomic_load_explicit(&r->terminal, memory_order_acquire) != 0u) return 0.0f;
  p0n_rfl_material_prune_ended_voices(r, start_frame);
  p0n_rfl_material_admit_windows(r, start_frame);
  p0n_rfl_material_start_due_grains(r, start_frame, start_frame + (uint64_t)frames);
  atomic_store_explicit(&r->observed_pending_windows, p0n_rfl_material_pending_window_count(r), memory_order_relaxed);
  float peak = 0.0f;
  uint32_t active_count = 0u;
  for (uint32_t fi = 0u; fi < frames; ++fi) {
    const uint64_t frame = start_frame + (uint64_t)fi;
    float mix_l = 0.0f, mix_r = 0.0f;
    for (uint32_t vi = 0u; vi < P0N_RFL_MATERIAL_MAX_VOICES; ++vi) {
      P0NRflMaterialVoice* v = &r->voices[vi];
      if (!v->active) continue;
      if (frame >= v->stop_frame) { v->active = 0u; continue; }
      if (frame < v->start_frame) continue;
      const uint32_t elapsed = (uint32_t)(frame - v->start_frame);
      const P0NRflMaterialAsset* a = &r->assets[v->asset_slot];
      const double source_position = v->source_start_frame + (double)elapsed * v->source_step;
      const float env = p0n_rfl_material_hann(elapsed, v->duration_frames);
      mix_l += p0n_rfl_material_sample_channel(a, source_position, 0u) * env * v->gain;
      mix_r += p0n_rfl_material_sample_channel(a, source_position, 1u) * env * v->gain;
    }
    stereo[fi * 2u] += mix_l;
    stereo[fi * 2u + 1u] += mix_r;
    const float al = mix_l < 0.0f ? -mix_l : mix_l;
    const float ar = mix_r < 0.0f ? -mix_r : mix_r;
    const float mag = al > ar ? al : ar;
    if (mag > peak) peak = mag;
  }
  for (uint32_t vi = 0u; vi < P0N_RFL_MATERIAL_MAX_VOICES; ++vi) if (r->voices[vi].active) active_count += 1u;
  atomic_store_explicit(&r->observed_active_voices, active_count, memory_order_relaxed);
  if (peak > 0.000001f) atomic_fetch_add_explicit(&r->nonzero_callbacks, 1u, memory_order_relaxed);
  return peak;
}

static inline void p0n_rfl_material_stop_generation(P0NRflMaterialRenderer* r, uint32_t generation) {
  if (!r || generation == 0u) return;
  if (atomic_load_explicit(&r->active_generation, memory_order_acquire) != generation) return;
  atomic_store_explicit(&r->active_generation, 0u, memory_order_release);
  for (uint32_t i = 0u; i < P0N_RFL_MATERIAL_MAX_VOICES; ++i) {
    if (r->voices[i].active && r->voices[i].generation == generation) r->voices[i].active = 0u;
  }
  for (uint32_t i = 0u; i < P0N_RFL_MATERIAL_ACTIVE_WINDOWS; ++i) {
    if (r->pending_windows[i].active && r->pending_windows[i].plan.generation == generation) {
      r->pending_windows[i].active = 0u;
      r->pending_windows[i].pending_grain_mask = 0u;
    }
  }
  atomic_store_explicit(&r->observed_active_voices, 0u, memory_order_relaxed);
  atomic_store_explicit(&r->observed_pending_windows, 0u, memory_order_relaxed);
  const uint32_t w = atomic_load_explicit(&r->write_index, memory_order_acquire);
  atomic_store_explicit(&r->read_index, w, memory_order_release);
}

static inline void p0n_rfl_material_panic(P0NRflMaterialRenderer* r) {
  if (!r) return;
  atomic_store_explicit(&r->terminal, 1u, memory_order_release);
  for (uint32_t i = 0u; i < P0N_RFL_MATERIAL_MAX_VOICES; ++i) r->voices[i].active = 0u;
  for (uint32_t i = 0u; i < P0N_RFL_MATERIAL_ACTIVE_WINDOWS; ++i) {
    r->pending_windows[i].active = 0u;
    r->pending_windows[i].pending_grain_mask = 0u;
  }
  atomic_store_explicit(&r->observed_active_voices, 0u, memory_order_relaxed);
  atomic_store_explicit(&r->observed_pending_windows, 0u, memory_order_relaxed);
  const uint32_t w = atomic_load_explicit(&r->write_index, memory_order_acquire);
  atomic_store_explicit(&r->read_index, w, memory_order_release);
}

#endif
