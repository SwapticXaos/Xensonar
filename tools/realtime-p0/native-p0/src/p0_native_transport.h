#ifndef XENSONAR_P0_NATIVE_TRANSPORT_H
#define XENSONAR_P0_NATIVE_TRANSPORT_H

#include <stdatomic.h>
#include <stdint.h>
#include <stddef.h>

#define P0N_NORMAL_CAPACITY 64u
#define P0N_MAX_GROUP_NOTES 3u
#define P0N_TOKEN_SLOTS 128u

typedef struct {
  uint16_t slot;
  uint32_t generation;
  float frequency_hz;
  float peak;
} P0NNote;

typedef struct {
  uint64_t sequence;
  /* All timing is in the native engine frame domain and is stamped once at ingress.
     The RT consumer must never derive a fresh deadline from dequeue time. */
  uint64_t source_frame;
  uint64_t intended_frame;
  uint64_t latest_admission_frame;
  uint8_t note_count;
  P0NNote notes[P0N_MAX_GROUP_NOTES];
} P0NAttackGroup;

typedef struct {
  P0NAttackGroup entries[P0N_NORMAL_CAPACITY];
  atomic_ullong write_count;
  atomic_ullong read_count;
  atomic_ullong rejected_full;
} P0NSpscAttackRing;

typedef struct {
  /* Single-producer / single-consumer latest-state mailbox. Every shared payload
     word is atomic, so the seqlock snapshot is C11 data-race-free. */
  atomic_ullong seq;
  atomic_ullong revision;
  atomic_uint root_hz_bits;
  atomic_uint gain_bits;
} P0NStateMailbox;

typedef struct {
  atomic_ullong owner_lease_revision;
  atomic_uint panic_epoch;
  atomic_uint release_generation[P0N_TOKEN_SLOTS];
} P0NSafetyMailbox;

static inline void p0n_ring_init(P0NSpscAttackRing* ring) {
  atomic_init(&ring->write_count, 0u);
  atomic_init(&ring->read_count, 0u);
  atomic_init(&ring->rejected_full, 0u);
}

static inline int p0n_ring_push(P0NSpscAttackRing* ring, const P0NAttackGroup* item) {
  uint64_t w = atomic_load_explicit(&ring->write_count, memory_order_relaxed);
  uint64_t r = atomic_load_explicit(&ring->read_count, memory_order_acquire);
  if (w - r >= P0N_NORMAL_CAPACITY) {
    atomic_fetch_add_explicit(&ring->rejected_full, 1u, memory_order_relaxed);
    return 0;
  }
  ring->entries[w % P0N_NORMAL_CAPACITY] = *item;
  atomic_store_explicit(&ring->write_count, w + 1u, memory_order_release);
  return 1;
}

static inline int p0n_ring_pop(P0NSpscAttackRing* ring, P0NAttackGroup* out) {
  uint64_t r = atomic_load_explicit(&ring->read_count, memory_order_relaxed);
  uint64_t w = atomic_load_explicit(&ring->write_count, memory_order_acquire);
  if (r == w) return 0;
  *out = ring->entries[r % P0N_NORMAL_CAPACITY];
  atomic_store_explicit(&ring->read_count, r + 1u, memory_order_release);
  return 1;
}

static inline uint32_t p0n_ring_depth(const P0NSpscAttackRing* ring) {
  uint64_t w = atomic_load_explicit(&ring->write_count, memory_order_acquire);
  uint64_t r = atomic_load_explicit(&ring->read_count, memory_order_acquire);
  uint64_t depth = w >= r ? w - r : 0u;
  return depth > P0N_NORMAL_CAPACITY ? P0N_NORMAL_CAPACITY : (uint32_t)depth;
}

static inline uint32_t p0n_float_bits(float value) {
  union { float f; uint32_t u; } bits;
  bits.f = value;
  return bits.u;
}

static inline float p0n_bits_float(uint32_t value) {
  union { float f; uint32_t u; } bits;
  bits.u = value;
  return bits.f;
}

static inline void p0n_state_init(P0NStateMailbox* box, float root_hz, float gain) {
  atomic_init(&box->seq, 0u);
  atomic_init(&box->revision, 0u);
  atomic_init(&box->root_hz_bits, p0n_float_bits(root_hz));
  atomic_init(&box->gain_bits, p0n_float_bits(gain));
}

static inline int p0n_state_is_lock_free(P0NStateMailbox* box) {
  return atomic_is_lock_free(&box->seq)
      && atomic_is_lock_free(&box->revision)
      && atomic_is_lock_free(&box->root_hz_bits)
      && atomic_is_lock_free(&box->gain_bits);
}

static inline int p0n_state_write(P0NStateMailbox* box, uint64_t revision, float root_hz, float gain) {
  /* The control lane is the single writer. Rejecting non-increasing revisions here
     prevents an old state from overwriting a newer state before RT observes it. */
  uint64_t current = atomic_load_explicit(&box->revision, memory_order_seq_cst);
  if (revision <= current) return 0;
  uint64_t s = atomic_load_explicit(&box->seq, memory_order_seq_cst);
  if (s & 1u) return 0;
  atomic_store_explicit(&box->seq, s + 1u, memory_order_seq_cst);
  atomic_store_explicit(&box->root_hz_bits, p0n_float_bits(root_hz), memory_order_seq_cst);
  atomic_store_explicit(&box->gain_bits, p0n_float_bits(gain), memory_order_seq_cst);
  atomic_store_explicit(&box->revision, revision, memory_order_seq_cst);
  atomic_store_explicit(&box->seq, s + 2u, memory_order_seq_cst);
  return 1;
}

static inline int p0n_state_read(const P0NStateMailbox* box, uint64_t* revision, float* root_hz, float* gain) {
  for (unsigned attempt = 0; attempt < 4u; ++attempt) {
    uint64_t a = atomic_load_explicit(&box->seq, memory_order_seq_cst);
    if (a & 1u) continue;
    uint64_t r = atomic_load_explicit(&box->revision, memory_order_seq_cst);
    uint32_t hz_bits = atomic_load_explicit(&box->root_hz_bits, memory_order_seq_cst);
    uint32_t gain_bits = atomic_load_explicit(&box->gain_bits, memory_order_seq_cst);
    uint64_t b = atomic_load_explicit(&box->seq, memory_order_seq_cst);
    if (a == b && !(b & 1u)) {
      *revision = r; *root_hz = p0n_bits_float(hz_bits); *gain = p0n_bits_float(gain_bits);
      return 1;
    }
  }
  return 0;
}

static inline void p0n_safety_init(P0NSafetyMailbox* box) {
  atomic_init(&box->owner_lease_revision, 0u);
  atomic_init(&box->panic_epoch, 0u);
  for (unsigned i = 0; i < P0N_TOKEN_SLOTS; ++i) atomic_init(&box->release_generation[i], 0u);
}

static inline void p0n_release_max(P0NSafetyMailbox* box, unsigned slot, unsigned generation) {
  if (slot >= P0N_TOKEN_SLOTS || generation == 0u) return;
  unsigned cur = atomic_load_explicit(&box->release_generation[slot], memory_order_relaxed);
  while (generation > cur && !atomic_compare_exchange_weak_explicit(
    &box->release_generation[slot], &cur, generation, memory_order_release, memory_order_relaxed)) {}
}

#endif
