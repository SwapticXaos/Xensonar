#ifndef P0_NATIVE_ROOT_FOLLOW_CONTROL_H
#define P0_NATIVE_ROOT_FOLLOW_CONTROL_H

#include <stdint.h>
#include <string.h>
#include <stdatomic.h>

#define P0N_RFL_PROGRAM_ID_MAX 96u

typedef enum {
  P0N_RFL_KIND_NONE = 0,
  P0N_RFL_KIND_MATERIAL = 1,
  P0N_RFL_KIND_SYNTH_DIRECT = 2
} P0NRflProgramKind;

typedef struct {
  uint32_t version;
  uint32_t generation;
  P0NRflProgramKind kind;
  char program_id[P0N_RFL_PROGRAM_ID_MAX];
} P0NRflProgramIdentity;

typedef struct {
  uint32_t generation;
  uint64_t source_frame;
  float root_hz;
  float volume;
  uint32_t gate_open;
} P0NRflRealtimeState;

typedef struct {
  P0NRflProgramIdentity program;
  _Atomic uint32_t active_generation;
  _Atomic uint32_t stopped_generation;
  _Atomic uint32_t terminal_panic;
  _Atomic uint64_t latest_source_frame;
  P0NRflRealtimeState latest_state;
} P0NRflControl;

static inline int p0n_rfl_valid_id(const char* id) {
  if (!id || !id[0]) return 0;
  size_t n = 0u;
  while (n < P0N_RFL_PROGRAM_ID_MAX && id[n] != '\0') ++n;
  return n > 0u && n < P0N_RFL_PROGRAM_ID_MAX;
}

static inline float p0n_rfl_clampf(float v, float lo, float hi) {
  return v < lo ? lo : (v > hi ? hi : v);
}

static inline void p0n_rfl_control_init(P0NRflControl* c) {
  memset(c, 0, sizeof(*c));
  atomic_init(&c->active_generation, 0u);
  atomic_init(&c->stopped_generation, 0u);
  atomic_init(&c->terminal_panic, 0u);
  atomic_init(&c->latest_source_frame, 0u);
}

static inline int p0n_rfl_install_program(
  P0NRflControl* c,
  uint32_t generation,
  P0NRflProgramKind kind,
  const char* program_id
) {
  if (!c || atomic_load_explicit(&c->terminal_panic, memory_order_acquire)) return 0;
  if (generation == 0u || kind == P0N_RFL_KIND_NONE || !p0n_rfl_valid_id(program_id)) return 0;
  const uint32_t active = atomic_load_explicit(&c->active_generation, memory_order_acquire);
  const uint32_t stopped = atomic_load_explicit(&c->stopped_generation, memory_order_acquire);
  if (generation <= active || generation <= stopped) return 0;
  memset(&c->program, 0, sizeof(c->program));
  c->program.version = 1u;
  c->program.generation = generation;
  c->program.kind = kind;
  strncpy(c->program.program_id, program_id, P0N_RFL_PROGRAM_ID_MAX - 1u);
  c->latest_state.generation = generation;
  c->latest_state.source_frame = 0u;
  c->latest_state.root_hz = 220.0f;
  c->latest_state.volume = 0.0f;
  c->latest_state.gate_open = 0u;
  atomic_store_explicit(&c->latest_source_frame, 0u, memory_order_release);
  atomic_store_explicit(&c->active_generation, generation, memory_order_release);
  return 1;
}

static inline int p0n_rfl_update_state(
  P0NRflControl* c,
  const P0NRflRealtimeState* next
) {
  if (!c || !next || atomic_load_explicit(&c->terminal_panic, memory_order_acquire)) return 0;
  const uint32_t active = atomic_load_explicit(&c->active_generation, memory_order_acquire);
  const uint32_t stopped = atomic_load_explicit(&c->stopped_generation, memory_order_acquire);
  if (active == 0u || next->generation != active || next->generation <= stopped) return 0;
  uint64_t latest = atomic_load_explicit(&c->latest_source_frame, memory_order_acquire);
  if (next->source_frame < latest) return 0;
  c->latest_state = *next;
  c->latest_state.root_hz = p0n_rfl_clampf(next->root_hz, 27.5f, 3520.0f);
  c->latest_state.volume = p0n_rfl_clampf(next->volume, 0.0f, 1.0f);
  c->latest_state.gate_open = next->gate_open ? 1u : 0u;
  atomic_store_explicit(&c->latest_source_frame, next->source_frame, memory_order_release);
  return 1;
}

static inline int p0n_rfl_stop_program(P0NRflControl* c, uint32_t generation) {
  if (!c || generation == 0u) return 0;
  const uint32_t active = atomic_load_explicit(&c->active_generation, memory_order_acquire);
  if (generation != active) return 0;
  c->latest_state.gate_open = 0u;
  atomic_store_explicit(&c->stopped_generation, generation, memory_order_release);
  atomic_store_explicit(&c->active_generation, 0u, memory_order_release);
  return 1;
}

static inline void p0n_rfl_panic(P0NRflControl* c) {
  if (!c) return;
  c->latest_state.gate_open = 0u;
  const uint32_t active = atomic_load_explicit(&c->active_generation, memory_order_acquire);
  if (active > 0u) atomic_store_explicit(&c->stopped_generation, active, memory_order_release);
  atomic_store_explicit(&c->active_generation, 0u, memory_order_release);
  atomic_store_explicit(&c->terminal_panic, 1u, memory_order_release);
}

#endif
