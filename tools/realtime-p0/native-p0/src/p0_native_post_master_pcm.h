#ifndef P0_NATIVE_POST_MASTER_PCM_H
#define P0_NATIVE_POST_MASTER_PCM_H

#include <math.h>
#include <stdatomic.h>
#include <stdint.h>
#include <string.h>

#define P0N_POST_MASTER_GATE_CLOSED 0x80000000u

#define P0N_POST_MASTER_CHANNELS 2u
#define P0N_POST_MASTER_RING_FRAMES 32768u
#define P0N_POST_MASTER_MAX_BLOCK_FRAMES 4096u
#define P0N_POST_MASTER_DEFAULT_PREFILL_FRAMES 2048u
#define P0N_POST_MASTER_LOW_WATERMARK_FRAMES 1024u
#define P0N_POST_MASTER_HIGH_WATERMARK_FRAMES 8192u

#if (P0N_POST_MASTER_RING_FRAMES & (P0N_POST_MASTER_RING_FRAMES - 1u)) != 0
#error "P0N_POST_MASTER_RING_FRAMES must be a power of two"
#endif

typedef struct {
  float samples[P0N_POST_MASTER_RING_FRAMES * P0N_POST_MASTER_CHANNELS];
  _Atomic uint32_t read_frame;
  _Atomic uint32_t write_frame;
  /* Control closes the gate; audio never waits for control. */
  _Atomic uint32_t render_gate;
  _Atomic uint32_t quiet_generation;
  _Atomic uint32_t enabled;
  _Atomic uint32_t committed;
  _Atomic uint32_t fault_latched;
  _Atomic uint32_t generation;
  _Atomic uint32_t prefill_frames;
  _Atomic uint32_t min_fill_frames;
  _Atomic uint32_t max_fill_frames;
  _Atomic uint64_t ingress_blocks;
  _Atomic uint64_t ingress_frames;
  _Atomic uint64_t rendered_frames;
  _Atomic uint64_t underrun_callbacks;
  _Atomic uint64_t underrun_frames;
  _Atomic uint64_t overflow_rejects;
  _Atomic uint64_t continuity_errors;
  _Atomic uint64_t duplicate_blocks;
  _Atomic uint64_t expected_sequence;
  _Atomic uint64_t expected_source_frame;
  _Atomic uint64_t last_sequence;
  _Atomic uint64_t last_source_frame;
  _Atomic uint32_t last_block_frames;
  _Atomic uint32_t have_sequence;
  uint32_t sample_rate;
  uint32_t channels;
} P0NPostMasterPcm;

static inline uint32_t p0n_post_master_available_read(const P0NPostMasterPcm* p) {
  const uint32_t rd = atomic_load_explicit(&p->read_frame, memory_order_acquire);
  const uint32_t wr = atomic_load_explicit(&p->write_frame, memory_order_acquire);
  return (uint32_t)(wr - rd);
}

static inline uint32_t p0n_post_master_available_write(const P0NPostMasterPcm* p) {
  const uint32_t used = p0n_post_master_available_read(p);
  return used >= P0N_POST_MASTER_RING_FRAMES ? 0u : P0N_POST_MASTER_RING_FRAMES - used;
}

static inline void p0n_post_master_note_fill(P0NPostMasterPcm* p, uint32_t fill) {
  uint32_t old_max = atomic_load_explicit(&p->max_fill_frames, memory_order_relaxed);
  while (fill > old_max && !atomic_compare_exchange_weak_explicit(
      &p->max_fill_frames, &old_max, fill, memory_order_relaxed, memory_order_relaxed)) {}
  if (atomic_load_explicit(&p->committed, memory_order_relaxed) != 0u) {
    uint32_t old_min = atomic_load_explicit(&p->min_fill_frames, memory_order_relaxed);
    while (fill < old_min && !atomic_compare_exchange_weak_explicit(
        &p->min_fill_frames, &old_min, fill, memory_order_relaxed, memory_order_relaxed)) {}
  }
}

static inline void p0n_post_master_init(P0NPostMasterPcm* p) {
  if (!p) return;
  memset(p, 0, sizeof(*p));
  atomic_init(&p->read_frame, 0u);
  atomic_init(&p->write_frame, 0u);
  atomic_init(&p->render_gate, P0N_POST_MASTER_GATE_CLOSED);
  atomic_init(&p->quiet_generation, 0u);
  atomic_init(&p->enabled, 0u);
  atomic_init(&p->committed, 0u);
  atomic_init(&p->fault_latched, 0u);
  atomic_init(&p->generation, 0u);
  atomic_init(&p->prefill_frames, P0N_POST_MASTER_DEFAULT_PREFILL_FRAMES);
  atomic_init(&p->min_fill_frames, UINT32_MAX);
  atomic_init(&p->max_fill_frames, 0u);
  atomic_init(&p->ingress_blocks, 0u);
  atomic_init(&p->ingress_frames, 0u);
  atomic_init(&p->rendered_frames, 0u);
  atomic_init(&p->underrun_callbacks, 0u);
  atomic_init(&p->underrun_frames, 0u);
  atomic_init(&p->overflow_rejects, 0u);
  atomic_init(&p->continuity_errors, 0u);
  atomic_init(&p->duplicate_blocks, 0u);
  atomic_init(&p->expected_sequence, 0u);
  atomic_init(&p->expected_source_frame, 0u);
  atomic_init(&p->last_sequence, UINT64_MAX);
  atomic_init(&p->last_source_frame, 0u);
  atomic_init(&p->last_block_frames, 0u);
  atomic_init(&p->have_sequence, 0u);
  p->sample_rate = 0u;
  p->channels = 0u;
}

static inline uint32_t p0n_post_master_begin(
    P0NPostMasterPcm* p, uint32_t sample_rate, uint32_t channels, uint32_t prefill_frames) {
  if (!p || sample_rate < 8000u || sample_rate > 192000u || channels != P0N_POST_MASTER_CHANNELS) return 0u;
  if (prefill_frames < 128u || prefill_frames > P0N_POST_MASTER_HIGH_WATERMARK_FRAMES ||
      prefill_frames >= P0N_POST_MASTER_RING_FRAMES) return 0u;
  /* Caller serializes control producers, but never the audio callback. A new
     generation cannot reset storage under an old reader or an active stream. */
  const uint32_t old_generation = atomic_load_explicit(&p->generation, memory_order_acquire);
  if (atomic_load_explicit(&p->enabled, memory_order_acquire) ||
      atomic_load_explicit(&p->render_gate, memory_order_acquire) != P0N_POST_MASTER_GATE_CLOSED ||
      atomic_load_explicit(&p->quiet_generation, memory_order_acquire) != old_generation) return 0u;
  atomic_store_explicit(&p->committed, 0u, memory_order_release);
  atomic_store_explicit(&p->read_frame, 0u, memory_order_relaxed);
  atomic_store_explicit(&p->write_frame, 0u, memory_order_relaxed);
  atomic_store_explicit(&p->fault_latched, 0u, memory_order_relaxed);
  atomic_store_explicit(&p->prefill_frames, prefill_frames, memory_order_relaxed);
  atomic_store_explicit(&p->min_fill_frames, UINT32_MAX, memory_order_relaxed);
  atomic_store_explicit(&p->max_fill_frames, 0u, memory_order_relaxed);
  atomic_store_explicit(&p->ingress_blocks, 0u, memory_order_relaxed);
  atomic_store_explicit(&p->ingress_frames, 0u, memory_order_relaxed);
  atomic_store_explicit(&p->rendered_frames, 0u, memory_order_relaxed);
  atomic_store_explicit(&p->underrun_callbacks, 0u, memory_order_relaxed);
  atomic_store_explicit(&p->underrun_frames, 0u, memory_order_relaxed);
  atomic_store_explicit(&p->overflow_rejects, 0u, memory_order_relaxed);
  atomic_store_explicit(&p->continuity_errors, 0u, memory_order_relaxed);
  atomic_store_explicit(&p->duplicate_blocks, 0u, memory_order_relaxed);
  atomic_store_explicit(&p->expected_sequence, 0u, memory_order_relaxed);
  atomic_store_explicit(&p->expected_source_frame, 0u, memory_order_relaxed);
  atomic_store_explicit(&p->last_sequence, UINT64_MAX, memory_order_relaxed);
  atomic_store_explicit(&p->last_source_frame, 0u, memory_order_relaxed);
  atomic_store_explicit(&p->last_block_frames, 0u, memory_order_relaxed);
  atomic_store_explicit(&p->have_sequence, 0u, memory_order_relaxed);
  p->sample_rate = sample_rate;
  p->channels = channels;
  uint32_t generation = atomic_load_explicit(&p->generation, memory_order_relaxed) + 1u;
  if (generation == 0u) generation = 1u;
  atomic_store_explicit(&p->generation, generation, memory_order_release);
  atomic_store_explicit(&p->enabled, 1u, memory_order_release);
  atomic_store_explicit(&p->render_gate, 0u, memory_order_release);
  return generation;
}

/* Return values: 1 accepted, 2 exact duplicate retry, 0 rejected/backpressure, -1 continuity/format fault. */
static inline int p0n_post_master_push(
    P0NPostMasterPcm* p,
    uint32_t generation,
    uint64_t sequence,
    uint64_t source_start_frame,
    const float* interleaved,
    uint32_t frames) {
  if (!p || !interleaved || frames == 0u || frames > P0N_POST_MASTER_MAX_BLOCK_FRAMES ||
      atomic_load_explicit(&p->enabled, memory_order_acquire) == 0u ||
      atomic_load_explicit(&p->fault_latched, memory_order_acquire) != 0u ||
      generation != atomic_load_explicit(&p->generation, memory_order_acquire)) return -1;

  const uint32_t have_sequence = atomic_load_explicit(&p->have_sequence, memory_order_acquire);
  if (have_sequence != 0u) {
    const uint64_t last_sequence = atomic_load_explicit(&p->last_sequence, memory_order_relaxed);
    const uint64_t last_source = atomic_load_explicit(&p->last_source_frame, memory_order_relaxed);
    const uint32_t last_frames = atomic_load_explicit(&p->last_block_frames, memory_order_relaxed);
    if (sequence == last_sequence && source_start_frame == last_source && frames == last_frames) {
      atomic_fetch_add_explicit(&p->duplicate_blocks, 1u, memory_order_relaxed);
      return 2;
    }
    const uint64_t expected_sequence = atomic_load_explicit(&p->expected_sequence, memory_order_relaxed);
    const uint64_t expected_frame = atomic_load_explicit(&p->expected_source_frame, memory_order_relaxed);
    if (sequence != expected_sequence || source_start_frame != expected_frame) {
      atomic_fetch_add_explicit(&p->continuity_errors, 1u, memory_order_relaxed);
      atomic_store_explicit(&p->fault_latched, 1u, memory_order_release);
      return -1;
    }
  }

  for (uint32_t i = 0u; i < frames * P0N_POST_MASTER_CHANNELS; ++i) {
    if (!isfinite(interleaved[i])) {
      atomic_fetch_add_explicit(&p->continuity_errors, 1u, memory_order_relaxed);
      atomic_store_explicit(&p->fault_latched, 1u, memory_order_release);
      return -1;
    }
  }

  if (p0n_post_master_available_write(p) < frames) {
    atomic_fetch_add_explicit(&p->overflow_rejects, 1u, memory_order_relaxed);
    return 0;
  }

  const uint32_t wr = atomic_load_explicit(&p->write_frame, memory_order_relaxed);
  const uint32_t mask = P0N_POST_MASTER_RING_FRAMES - 1u;
  for (uint32_t i = 0u; i < frames; ++i) {
    const uint32_t dst = (wr + i) & mask;
    p->samples[dst * 2u] = interleaved[i * 2u];
    p->samples[dst * 2u + 1u] = interleaved[i * 2u + 1u];
  }
  atomic_store_explicit(&p->write_frame, wr + frames, memory_order_release);
  atomic_store_explicit(&p->last_sequence, sequence, memory_order_relaxed);
  atomic_store_explicit(&p->last_source_frame, source_start_frame, memory_order_relaxed);
  atomic_store_explicit(&p->last_block_frames, frames, memory_order_relaxed);
  atomic_store_explicit(&p->expected_sequence, sequence + 1u, memory_order_relaxed);
  atomic_store_explicit(&p->expected_source_frame, source_start_frame + (uint64_t)frames, memory_order_relaxed);
  atomic_store_explicit(&p->have_sequence, 1u, memory_order_release);
  atomic_fetch_add_explicit(&p->ingress_blocks, 1u, memory_order_relaxed);
  atomic_fetch_add_explicit(&p->ingress_frames, frames, memory_order_relaxed);
  p0n_post_master_note_fill(p, p0n_post_master_available_read(p));
  return 1;
}

static inline int p0n_post_master_prefilled(const P0NPostMasterPcm* p) {
  if (!p || atomic_load_explicit(&p->enabled, memory_order_acquire) == 0u ||
      atomic_load_explicit(&p->fault_latched, memory_order_acquire) != 0u) return 0;
  const uint32_t prefill = atomic_load_explicit(&p->prefill_frames, memory_order_relaxed);
  return p0n_post_master_available_read(p) >= prefill;
}

static inline int p0n_post_master_commit(P0NPostMasterPcm* p, uint32_t generation) {
  if (!p || generation != atomic_load_explicit(&p->generation, memory_order_acquire) || !p0n_post_master_prefilled(p)) return 0;
  if (atomic_load_explicit(&p->committed, memory_order_acquire)) return 1;
  atomic_store_explicit(&p->min_fill_frames, p0n_post_master_available_read(p), memory_order_relaxed);
  atomic_store_explicit(&p->committed, 1u, memory_order_release);
  return 1;
}

/* Returns 1 for PCM or its reserved silence. STOP never revives legacy
   voices. The next silent callback is the control-plane stop acknowledgement. */
static inline int p0n_post_master_render(P0NPostMasterPcm* p, float* output, uint32_t frames) {
  if (!p || !output || frames == 0u) return 0;
  const uint32_t generation = atomic_load_explicit(&p->generation, memory_order_acquire);
  if (!generation) return 0;
  uint32_t gate = atomic_load_explicit(&p->render_gate, memory_order_acquire);
  if ((gate & P0N_POST_MASTER_GATE_CLOSED) ||
      !atomic_compare_exchange_strong_explicit(&p->render_gate, &gate, gate + 1u,
        memory_order_acq_rel, memory_order_acquire)) {
    memset(output, 0, (size_t)frames * P0N_POST_MASTER_CHANNELS * sizeof(float));
    atomic_store_explicit(&p->quiet_generation, generation, memory_order_release);
    return 1;
  }
  if (atomic_load_explicit(&p->committed, memory_order_acquire) == 0u) {
    memset(output, 0, (size_t)frames * P0N_POST_MASTER_CHANNELS * sizeof(float));
    atomic_fetch_sub_explicit(&p->render_gate, 1u, memory_order_release);
    return 1;
  }

  uint32_t available = p0n_post_master_available_read(p);
  const uint32_t take = available < frames ? available : frames;
  const uint32_t rd = atomic_load_explicit(&p->read_frame, memory_order_relaxed);
  const uint32_t mask = P0N_POST_MASTER_RING_FRAMES - 1u;
  for (uint32_t i = 0u; i < take; ++i) {
    const uint32_t src = (rd + i) & mask;
    output[i * 2u] = p->samples[src * 2u];
    output[i * 2u + 1u] = p->samples[src * 2u + 1u];
  }
  if (take < frames) {
    memset(output + (size_t)take * 2u, 0, (size_t)(frames - take) * 2u * sizeof(float));
    atomic_fetch_add_explicit(&p->underrun_callbacks, 1u, memory_order_relaxed);
    atomic_fetch_add_explicit(&p->underrun_frames, frames - take, memory_order_relaxed);
    atomic_store_explicit(&p->fault_latched, 1u, memory_order_release);
  }
  atomic_store_explicit(&p->read_frame, rd + take, memory_order_release);
  atomic_fetch_add_explicit(&p->rendered_frames, frames, memory_order_relaxed);
  p0n_post_master_note_fill(p, available - take);
  atomic_fetch_sub_explicit(&p->render_gate, 1u, memory_order_release);
  return 1;
}

static inline int p0n_post_master_stop(P0NPostMasterPcm* p, uint32_t generation) {
  if (!p || !generation || generation != atomic_load_explicit(&p->generation, memory_order_acquire)) return 0;
  atomic_fetch_or_explicit(&p->render_gate, P0N_POST_MASTER_GATE_CLOSED, memory_order_acq_rel);
  atomic_store_explicit(&p->committed, 0u, memory_order_release);
  atomic_store_explicit(&p->enabled, 0u, memory_order_release);
  return 1;
}

static inline int p0n_post_master_stopped(const P0NPostMasterPcm* p, uint32_t generation) {
  return p && generation && generation == atomic_load_explicit(&p->generation, memory_order_acquire) &&
    !atomic_load_explicit(&p->enabled, memory_order_acquire) &&
    atomic_load_explicit(&p->quiet_generation, memory_order_acquire) == generation &&
    atomic_load_explicit(&p->render_gate, memory_order_acquire) == P0N_POST_MASTER_GATE_CLOSED;
}

#endif
