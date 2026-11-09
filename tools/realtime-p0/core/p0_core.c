// Xensonar P0-W portable DSP core.
// Pilot-only, no product integration. Fixed-size state; no malloc, I/O, locks or callbacks.
// Built both to wasm32 and native harness from the same source.

#include <stdint.h>
#include <stddef.h>


void* memset(void* dest, int value, size_t count) {
  unsigned char* d = (unsigned char*)dest;
  for (size_t i = 0; i < count; ++i) d[i] = (unsigned char)value;
  return dest;
}

void* memcpy(void* dest, const void* src, size_t count) {
  unsigned char* d = (unsigned char*)dest;
  const unsigned char* s = (const unsigned char*)src;
  for (size_t i = 0; i < count; ++i) d[i] = s[i];
  return dest;
}

#define P0_MAX_VOICES 16
#define P0_MAX_TAILS 4
#define P0_TOTAL_VOICES (P0_MAX_VOICES + P0_MAX_TAILS)
#define P0_MAX_PENDING_GROUPS 64
#define P0_MAX_GROUP_NOTES 3
#define P0_TOKEN_SLOTS 128
#define P0_PROGRAM_STEPS 64
#define P0_MAX_BLOCK 256
#define P0_SINE_TABLE 4096
#define P0_PI2 6.283185307179586476925286766559

#define P0_KIND_LEGACY 1
#define P0_KIND_GATED 2
#define P0_KIND_PROGRAM 3

#define P0_RESULT_OK 1
#define P0_RESULT_REJECTED 0
#define P0_RESULT_INVALID -1
#define P0_RESULT_CAPACITY -2
#define P0_RESULT_CLOSED -3
#define P0_RESULT_STALE -4

static float g_sine[P0_SINE_TABLE];
static float g_output[P0_MAX_BLOCK * 2];

typedef struct {
  uint8_t active;
  uint8_t kind;
  uint8_t releasing;
  uint8_t panic_releasing;
  uint16_t token_slot;
  uint32_t token_generation;
  double phase;
  double increment;
  float peak;
  float env;
  uint32_t age_frames;
  uint32_t delay_frames;
  uint32_t attack_frames;
  uint32_t release_start_frames;
  uint32_t stop_frames;
  float release_coef;
  uint32_t release_frames_remaining;
  float release_step;
  float b0, b1, b2, a1, a2;
  float z1, z2;
} P0Voice;

typedef struct {
  uint16_t token_slot;
  uint32_t token_generation;
  uint8_t kind;
  float frequency_hz;
  float peak;
  float b0, b1, b2, a1, a2;
  uint32_t attack_frames;
  uint32_t release_start_frames;
  uint32_t stop_frames;
  float release_coef;
} P0PendingNote;

typedef struct {
  uint8_t occupied;
  uint8_t note_count;
  uint64_t group_id;
  uint64_t intended_frame;
  uint64_t latest_admission_frame;
  P0PendingNote notes[P0_MAX_GROUP_NOTES];
} P0PendingGroup;

typedef struct {
  uint8_t count;
  float ratio[P0_MAX_GROUP_NOTES];
  float gain[P0_MAX_GROUP_NOTES];
} P0ProgramStep;

static P0Voice g_voices[P0_TOTAL_VOICES];
static P0PendingGroup g_pending[P0_MAX_PENDING_GROUPS];
static uint32_t g_closed_generation[P0_TOKEN_SLOTS];
static uint32_t g_seen_generation[P0_TOKEN_SLOTS];
static uint64_t g_token_input_sequence[P0_TOKEN_SLOTS];
static uint8_t g_token_kind[P0_TOKEN_SLOTS];
static uint32_t g_held_generation[P0_TOKEN_SLOTS];
static uint64_t g_reconcile_sequence = 0;
static uint64_t g_builder_input_sequence = 0;
static P0PendingGroup g_builder;
static uint8_t g_builder_active = 0;
static P0ProgramStep g_program[P0_PROGRAM_STEPS];

static uint32_t g_sample_rate = 48000;
static uint64_t g_frame = 0;
static uint32_t g_owner_epoch = 0;
static uint8_t g_owner_closed = 1;
static uint64_t g_lease_valid_through = 0;
static uint64_t g_state_revision = 0;
static float g_root_hz = 220.0f;
static float g_program_gain = 1.0f;
static float g_root_target=220.0f,g_gain_target=1.0f,g_root_step=0,g_gain_step=0;
static uint32_t g_state_ramp_remaining=0;

static uint8_t g_program_running = 0;
static uint32_t g_program_revision = 0;
static uint32_t g_program_closed_revision = 0;
static uint32_t g_program_steps = 16;
static uint32_t g_program_tempo_milli = 120000;
static uint64_t g_program_start_frame = 0;
static uint64_t g_program_step_counter = 0;
static float g_program_b0 = 1.0f, g_program_b1 = 0.0f, g_program_b2 = 0.0f, g_program_a1 = 0.0f, g_program_a2 = 0.0f;
static uint32_t g_program_attack_frames = 1536;
static uint32_t g_program_release_start_frames = 5011;
static uint32_t g_program_stop_frames = 12480;
static float g_program_release_coef = 0.9992f;

// bounded counters for pilot evidence
static uint64_t g_started_external = 0;
static uint64_t g_started_program = 0;
static uint64_t g_expired = 0;
static uint64_t g_cancelled = 0;
static uint64_t g_capacity_rejected = 0;
static uint64_t g_invalid_rejected = 0;
static uint64_t g_panic_count = 0;
static uint64_t g_release_count = 0;
static uint64_t g_state_applied = 0;
static uint64_t g_state_ignored_old = 0;

static int finite_float(float x) { return __builtin_isfinite(x); }
static int valid_coefficients(float b0, float b1, float b2, float a1, float a2) {
  return finite_float(b0) && finite_float(b1) && finite_float(b2) && finite_float(a1) && finite_float(a2)
    && b0 >= -4 && b0 <= 4 && b1 >= -4 && b1 <= 4 && b2 >= -4 && b2 <= 4
    && a2 > -1 && a2 < 1 && 1+a1+a2 > 0 && 1-a1+a2 > 0;
}

static void zero_voice(P0Voice* v) {
  uint8_t* p = (uint8_t*)v;
  for (size_t i = 0; i < sizeof(P0Voice); ++i) p[i] = 0;
}

static void zero_group(P0PendingGroup* g) {
  uint8_t* p = (uint8_t*)g;
  for (size_t i = 0; i < sizeof(P0PendingGroup); ++i) p[i] = 0;
}

static uint32_t active_voice_count(void) {
  uint32_t n = 0;
  for (uint32_t i = 0; i < P0_TOTAL_VOICES; ++i) if (g_voices[i].active) ++n;
  return n;
}

static uint32_t pending_group_count(void) {
  uint32_t n = 0;
  for (uint32_t i = 0; i < P0_MAX_PENDING_GROUPS; ++i) if (g_pending[i].occupied) ++n;
  return n;
}

static uint32_t pending_note_count(void) {
  uint32_t n=0;
  for (uint32_t i=0;i<P0_MAX_PENDING_GROUPS;++i) if (g_pending[i].occupied) n+=g_pending[i].note_count;
  return n;
}

static int find_free_voice(void) {
  // P0 does not steal. Tail slots are reserved for explicit release/panic tails,
  // not for new attacks. New notes use the first 16 slots only.
  for (uint32_t i = 0; i < P0_MAX_VOICES; ++i) if (!g_voices[i].active) return (int)i;
  return -1;
}

static uint32_t free_attack_voice_count(void) {
  uint32_t n = 0;
  for (uint32_t i = 0; i < P0_MAX_VOICES; ++i) if (!g_voices[i].active) ++n;
  return n;
}

static float wavetable(double phase) {
  while (phase >= (double)P0_SINE_TABLE) phase -= (double)P0_SINE_TABLE;
  while (phase < 0.0) phase += (double)P0_SINE_TABLE;
  uint32_t i0 = (uint32_t)phase;
  uint32_t i1 = (i0 + 1u) & (P0_SINE_TABLE - 1u);
  float frac = (float)(phase - (double)i0);
  return g_sine[i0] + (g_sine[i1] - g_sine[i0]) * frac;
}

static float biquad(P0Voice* v, float x) {
  // Transposed Direct Form II, normalized coefficients.
  float y = v->b0 * x + v->z1;
  v->z1 = v->b1 * x - v->a1 * y + v->z2;
  v->z2 = v->b2 * x - v->a2 * y;
  return y;
}

static void begin_linear_release(P0Voice* v, uint32_t frames, uint8_t panic) {
  if (!v->active) return;
  if (v->delay_frames) { zero_voice(v); return; }
  if (frames < 1) frames = 1;
  if (v->releasing && v->release_frames_remaining <= frames) return;
  v->releasing = 1;
  v->panic_releasing = panic;
  v->release_frames_remaining = frames;
  v->release_step = v->env / (float)frames;
}

static void close_voice(P0Voice* v) {
  zero_voice(v);
}

static int token_closed(uint16_t slot, uint32_t generation) {
  if (slot >= P0_TOKEN_SLOTS || generation == 0) return 1;
  return generation <= g_closed_generation[slot];
}

static void start_voice_from_note(const P0PendingNote* n, uint32_t delay_frames, uint32_t attack_frames) {
  int idx = find_free_voice();
  if (idx < 0) return;
  P0Voice* v = &g_voices[(uint32_t)idx];
  zero_voice(v);
  v->active = 1;
  v->kind = n->kind;
  v->token_slot = n->token_slot;
  v->token_generation = n->token_generation;
  v->increment = ((double)n->frequency_hz * (double)P0_SINE_TABLE) / (double)g_sample_rate;
  v->peak = n->peak;
  v->env = 0.0001f;
  v->delay_frames = delay_frames;
  v->attack_frames = attack_frames ? attack_frames : 1u;
  v->release_start_frames = n->release_start_frames;
  v->stop_frames = n->stop_frames;
  v->release_coef = n->release_coef;
  v->b0 = n->b0; v->b1 = n->b1; v->b2 = n->b2; v->a1 = n->a1; v->a2 = n->a2;
}

static void start_program_voice(float frequency_hz, float peak, uint32_t delay_frames) {
  if (!finite_float(frequency_hz) || frequency_hz <= 0 || frequency_hz > g_sample_rate * 0.45f
      || !finite_float(peak) || peak < 0 || peak > 1) { ++g_invalid_rejected; return; }
  int idx = find_free_voice();
  if (idx < 0) { ++g_capacity_rejected; return; }
  P0Voice* v = &g_voices[(uint32_t)idx];
  zero_voice(v);
  v->active = 1;
  v->kind = P0_KIND_PROGRAM;
  v->token_slot = 0;
  v->token_generation = 0;
  v->increment = ((double)frequency_hz * (double)P0_SINE_TABLE) / (double)g_sample_rate;
  v->peak = peak;
  v->env = 0.0001f;
  v->delay_frames = delay_frames;
  v->attack_frames = g_program_attack_frames ? g_program_attack_frames : 1u;
  v->release_start_frames = g_program_release_start_frames;
  v->stop_frames = g_program_stop_frames;
  v->release_coef = g_program_release_coef;
  v->b0 = g_program_b0; v->b1 = g_program_b1; v->b2 = g_program_b2; v->a1 = g_program_a1; v->a2 = g_program_a2;
  ++g_started_program;
}

static uint64_t program_step_frame(uint64_t step_counter) {
  // 16th note = 15 / BPM seconds. tempo is milli-BPM.
  // Compute each step from the absolute counter, not by accumulating rounded frame lengths.
  uint64_t numer = step_counter * (uint64_t)g_sample_rate * 15000ull;
  uint64_t denom = (uint64_t)(g_program_tempo_milli ? g_program_tempo_milli : 120000u);
  return g_program_start_frame + (numer + denom / 2ull) / denom;
}

static void render_program_due(uint64_t block_start, uint32_t frames) {
  if (!g_program_running || g_owner_closed) return;
  uint64_t block_end = block_start + (uint64_t)frames;
  uint32_t notes_started_this_block = 0;
  // At most enough steps to start 4 local notes. No historical catch-up list.
  for (uint32_t inspected = 0; inspected < 4u; ++inspected) {
    uint64_t due = program_step_frame(g_program_step_counter);
    if (due >= block_end) break;
    if (due < block_start) {
      // If the audio timeline jumped, advance program phase without replaying missed steps.
      ++g_program_step_counter;
      continue;
    }
    uint32_t step_index = (uint32_t)(g_program_step_counter % (uint64_t)g_program_steps);
    P0ProgramStep* step = &g_program[step_index];
    uint32_t allowed = step->count;
    if (allowed > P0_MAX_GROUP_NOTES) allowed = P0_MAX_GROUP_NOTES;
    if (notes_started_this_block + allowed > 4u) { ++g_capacity_rejected; ++g_program_step_counter; continue; }
    if (free_attack_voice_count()<allowed) { ++g_capacity_rejected; ++g_program_step_counter; continue; }
    uint32_t delay=(uint32_t)(due-block_start);
    uint32_t ramp_delay=delay<g_state_ramp_remaining?delay:g_state_ramp_remaining;
    float root_at_start=g_root_hz+g_root_step*(float)ramp_delay;
    uint8_t valid=1;
    for(uint32_t n=0;n<allowed;++n) {
      float frequency=root_at_start*step->ratio[n];
      if(!finite_float(frequency)||frequency<=0||frequency>g_sample_rate*.45f)valid=0;
    }
    if(!valid){++g_invalid_rejected;++g_program_step_counter;continue;}
    for (uint32_t n = 0; n < allowed; ++n) {
      start_program_voice(root_at_start * step->ratio[n], step->gain[n], delay);
      ++notes_started_this_block;
    }
    ++g_program_step_counter;
    if (notes_started_this_block >= 4u) break;
  }
}

static void process_pending(uint64_t block_start, uint32_t frames) {
  uint64_t block_end = block_start + (uint64_t)frames;
  uint32_t lead = (g_sample_rate * 5u + 999u) / 1000u;
  uint32_t inspected = 0;
  uint32_t notes_started = 0;
  for (uint32_t i = 0; i < P0_MAX_PENDING_GROUPS && inspected < 16u; ++i) {
    P0PendingGroup* g = &g_pending[i];
    if (!g->occupied) continue;
    ++inspected;
    if (g_owner_closed) { zero_group(g); ++g_cancelled; continue; }
    if (block_start > g->latest_admission_frame) { zero_group(g); ++g_expired; continue; }
    // Sorted directory; inspect at most 16 occupied entries. Reserve just early
    // enough to retain an on-time start despite the existing 5 ms safe lead.
    if (g->intended_frame >= block_end + lead) break;
    uint8_t valid = 1;
    for (uint32_t n = 0; n < g->note_count; ++n) {
      if (token_closed(g->notes[n].token_slot, g->notes[n].token_generation)) { valid = 0; break; }
    }
    if (!valid) { zero_group(g); ++g_cancelled; continue; }
    if (notes_started + g->note_count > 8u) continue;
    if (free_attack_voice_count() < g->note_count) {
      zero_group(g); ++g_capacity_rejected; continue;
    }
    uint64_t safe_start = g->intended_frame > block_start + lead ? g->intended_frame : block_start + lead;
    uint32_t delay = (uint32_t)(safe_start - block_start);
    for (uint32_t n = 0; n < g->note_count; ++n) {
      P0PendingNote* note = &g->notes[n];
      uint64_t intended_peak = g->intended_frame + note->attack_frames;
      uint32_t attack = note->attack_frames;
      if (note->kind == P0_KIND_LEGACY) attack = safe_start >= intended_peak
        ? (g_sample_rate * 35u + 9999u) / 10000u : (uint32_t)(intended_peak - safe_start);
      start_voice_from_note(note, delay, attack);
    }
    notes_started += g->note_count;
    g_started_external += g->note_count;
    zero_group(g);
  }
}

static float render_voice_sample(P0Voice* v) {
  if (!v->active) return 0.0f;

  if (v->delay_frames > 0) { --v->delay_frames; return 0.0f; }

  if (v->releasing) {
    if (v->release_frames_remaining > 0) {
      v->env -= v->release_step;
      if (v->env < 0) v->env = 0;
      --v->release_frames_remaining;
    } else {
      close_voice(v);
      return 0.0f;
    }
  } else {
    if (v->age_frames < v->attack_frames) {
      float t = (float)v->age_frames / (float)v->attack_frames;
      v->env = 0.0001f + (v->peak - 0.0001f) * t;
    } else if (v->age_frames == v->attack_frames) {
      v->env = v->peak;
    } else if ((v->kind == P0_KIND_LEGACY || v->kind == P0_KIND_PROGRAM) && v->age_frames > v->release_start_frames) {
      float target = 0.0001f;
      v->env = target + (v->env - target) * v->release_coef;
    }
  }

  float x = wavetable(v->phase);
  v->phase += v->increment;
  if (v->phase >= (double)P0_SINE_TABLE) v->phase -= (double)P0_SINE_TABLE;
  float y = biquad(v, x) * v->env;
  if(v->kind==P0_KIND_PROGRAM)y*=g_program_gain;
  ++v->age_frames;
  if ((v->releasing && v->release_frames_remaining == 0) || (!v->releasing && (v->kind == P0_KIND_LEGACY || v->kind == P0_KIND_PROGRAM) && v->age_frames >= v->stop_frames)) {
    close_voice(v);
  }
  return y;
}

__attribute__((visibility("default"))) uintptr_t p0_sine_table_ptr(void) { return (uintptr_t)&g_sine[0]; }
__attribute__((visibility("default"))) uintptr_t p0_output_ptr(void) { return (uintptr_t)&g_output[0]; }
__attribute__((visibility("default"))) uint32_t p0_max_block(void) { return P0_MAX_BLOCK; }

__attribute__((visibility("default"))) void p0_init(uint32_t sample_rate) {
  g_sample_rate = sample_rate ? sample_rate : 48000u;
  g_frame = 0;
  g_owner_epoch = 0;
  g_owner_closed = 1;
  g_lease_valid_through = 0;
  g_state_revision = 0;
  g_reconcile_sequence = 0;
  g_root_hz = 220.0f;
  g_program_gain = 1.0f;
  g_root_target=220.0f;g_gain_target=1.0f;g_root_step=g_gain_step=0;g_state_ramp_remaining=0;
  g_program_running = 0;
  g_program_revision = 0;
  g_program_closed_revision = 0;
  g_program_steps = 16;
  g_program_tempo_milli = 120000;
  g_program_step_counter = 0;
  g_builder_active = 0;
  for (uint32_t i = 0; i < P0_TOTAL_VOICES; ++i) zero_voice(&g_voices[i]);
  for (uint32_t i = 0; i < P0_MAX_PENDING_GROUPS; ++i) zero_group(&g_pending[i]);
  for (uint32_t i = 0; i < P0_TOKEN_SLOTS; ++i) { g_closed_generation[i] = 0; g_seen_generation[i] = 0; }
  for (uint32_t i = 0; i < P0_PROGRAM_STEPS; ++i) {
    g_program[i].count = 0;
    for (uint32_t n = 0; n < P0_MAX_GROUP_NOTES; ++n) { g_program[i].ratio[n] = 1.0f; g_program[i].gain[n] = 0.0f; }
  }
  g_started_external = g_started_program = g_expired = g_cancelled = 0;
  g_capacity_rejected = g_invalid_rejected = g_panic_count = g_release_count = 0;
  g_state_applied = g_state_ignored_old = 0;
}

__attribute__((visibility("default"))) int32_t p0_arm(uint32_t owner_epoch, uint64_t lease_valid_through_frame) {
  if (owner_epoch == 0 || owner_epoch <= g_owner_epoch || !g_owner_closed
      || lease_valid_through_frame <= g_frame || lease_valid_through_frame > g_frame + (uint64_t)g_sample_rate*2u) return P0_RESULT_INVALID;
  if (active_voice_count() != 0 || pending_group_count() != 0 || g_program_running) return P0_RESULT_CAPACITY;
  g_owner_epoch = owner_epoch;
  g_owner_closed = 0;
  g_lease_valid_through = lease_valid_through_frame;
  g_state_revision = 0;
  g_program_revision = g_program_closed_revision = 0;
  g_reconcile_sequence = 0;
  for (uint32_t i = 0; i < P0_TOKEN_SLOTS; ++i) { g_closed_generation[i] = 0; g_seen_generation[i] = 0; }
  return P0_RESULT_OK;
}

__attribute__((visibility("default"))) int32_t p0_renew_lease(uint32_t owner_epoch, uint64_t lease_valid_through_frame) {
  if (g_owner_closed || owner_epoch != g_owner_epoch) return P0_RESULT_CLOSED;
  if (lease_valid_through_frame <= g_frame || lease_valid_through_frame > g_frame + (uint64_t)g_sample_rate*2u) return P0_RESULT_INVALID;
  if (lease_valid_through_frame > g_lease_valid_through) g_lease_valid_through = lease_valid_through_frame;
  return P0_RESULT_OK;
}

__attribute__((visibility("default"))) int32_t p0_set_state(uint32_t owner_epoch, uint64_t revision, float root_hz, float program_gain) {
  if (g_owner_closed || owner_epoch != g_owner_epoch) return P0_RESULT_CLOSED;
  if (!finite_float(root_hz) || !finite_float(program_gain) || !(root_hz > 0.0f)
      || root_hz > g_sample_rate*0.45f || !(program_gain >= 0.0f) || program_gain > 1) { ++g_invalid_rejected; return P0_RESULT_INVALID; }
  if (revision <= g_state_revision) { ++g_state_ignored_old; return P0_RESULT_REJECTED; }
  g_state_revision = revision;
  g_root_target=root_hz;g_gain_target=program_gain;
  g_state_ramp_remaining=(g_sample_rate+99u)/100u;
  g_root_step=(root_hz-g_root_hz)/(float)g_state_ramp_remaining;
  g_gain_step=(program_gain-g_program_gain)/(float)g_state_ramp_remaining;
  ++g_state_applied;
  return P0_RESULT_OK;
}

__attribute__((visibility("default"))) int32_t p0_begin_attack_group(uint32_t owner_epoch, uint64_t group_id, uint32_t note_count, uint64_t intended_frame, uint64_t latest_admission_frame) {
  if (g_owner_closed || owner_epoch != g_owner_epoch) return P0_RESULT_CLOSED;
  g_builder_active = 0;
  if (note_count < 1u || note_count > P0_MAX_GROUP_NOTES || latest_admission_frame < intended_frame
      || intended_frame > g_frame + (uint64_t)g_sample_rate*2u) return P0_RESULT_INVALID;
  if (pending_note_count() + note_count > 64u) return P0_RESULT_CAPACITY;
  zero_group(&g_builder);
  g_builder.occupied = 1;
  g_builder.note_count = (uint8_t)note_count;
  g_builder.group_id = group_id;
  g_builder_input_sequence = group_id;
  g_builder.intended_frame = intended_frame;
  g_builder.latest_admission_frame = latest_admission_frame;
  g_builder_active = 1;
  return P0_RESULT_OK;
}

__attribute__((visibility("default"))) int32_t p0_set_attack_note(
  uint32_t index, uint32_t token_slot, uint32_t token_generation, uint32_t kind,
  float frequency_hz, float peak,
  float b0, float b1, float b2, float a1, float a2,
  uint32_t attack_frames, uint32_t release_start_frames, uint32_t stop_frames, float release_coef
) {
  if (!g_builder_active || index >= g_builder.note_count || token_slot >= P0_TOKEN_SLOTS || token_generation == 0) return P0_RESULT_INVALID;
  if (!finite_float(frequency_hz) || !finite_float(peak) || !(frequency_hz > 0.0f)
      || frequency_hz > g_sample_rate*0.45f || !(peak > 0.0f) || peak > 1
      || attack_frames == 0 || attack_frames > g_sample_rate || stop_frames <= attack_frames
      || !finite_float(release_coef) || release_coef < 0 || release_coef > 1
      || !valid_coefficients(b0,b1,b2,a1,a2)) { g_builder_active = 0; return P0_RESULT_INVALID; }
  if (kind != P0_KIND_LEGACY && kind != P0_KIND_GATED) return P0_RESULT_INVALID;
  P0PendingNote* n = &g_builder.notes[index];
  n->token_slot = (uint16_t)token_slot;
  n->token_generation = token_generation;
  n->kind = (uint8_t)kind;
  n->frequency_hz = frequency_hz;
  n->peak = peak;
  n->b0 = b0; n->b1 = b1; n->b2 = b2; n->a1 = a1; n->a2 = a2;
  n->attack_frames = attack_frames;
  n->release_start_frames = release_start_frames;
  n->stop_frames = stop_frames;
  n->release_coef = release_coef;
  return P0_RESULT_OK;
}

__attribute__((visibility("default"))) int32_t p0_commit_attack_group(void) {
  if (!g_builder_active) return P0_RESULT_INVALID;
  for (uint32_t n = 0; n < g_builder.note_count; ++n) {
    P0PendingNote* note = &g_builder.notes[n];
    if (note->token_generation == 0 || token_closed(note->token_slot, note->token_generation)) {
      g_builder_active = 0;
      ++g_cancelled;
      return P0_RESULT_CLOSED;
    }
    if (note->token_generation <= g_seen_generation[note->token_slot]) { g_builder_active = 0; return P0_RESULT_REJECTED; }
    if (note->kind == P0_KIND_GATED && g_builder_input_sequence <= g_reconcile_sequence
        && g_held_generation[note->token_slot] != note->token_generation) { g_builder_active=0; return P0_RESULT_CLOSED; }
    if (g_token_kind[note->token_slot] == P0_KIND_GATED && g_seen_generation[note->token_slot] > g_closed_generation[note->token_slot]) { g_builder_active=0; return P0_RESULT_CAPACITY; }
    for (uint32_t j=0;j<n;++j) if (g_builder.notes[j].token_slot == note->token_slot) { g_builder_active = 0; return P0_RESULT_INVALID; }
  }
  // Fixed-size compaction + sorted insertion. Future entries cannot hide a due one.
  uint32_t count=0;
  for (uint32_t i=0;i<P0_MAX_PENDING_GROUPS;++i) if (g_pending[i].occupied) {
    if (count!=i) g_pending[count]=g_pending[i];
    ++count;
  }
  for (uint32_t i=count;i<P0_MAX_PENDING_GROUPS;++i) zero_group(&g_pending[i]);
  if (count < P0_MAX_PENDING_GROUPS) {
    uint32_t pos=count;
    while (pos>0 && g_pending[pos-1].intended_frame>g_builder.intended_frame) { g_pending[pos]=g_pending[pos-1]; --pos; }
    g_pending[pos]=g_builder;
    for (uint32_t n=0;n<g_builder.note_count;++n) {
      uint32_t slot=g_builder.notes[n].token_slot;
      g_seen_generation[slot]=g_builder.notes[n].token_generation;
      g_token_input_sequence[slot]=g_builder_input_sequence;
      g_token_kind[slot]=g_builder.notes[n].kind;
    }
    g_builder_active=0;
    return P0_RESULT_OK;
  }
  g_builder_active = 0;
  return P0_RESULT_CAPACITY;
}

__attribute__((visibility("default"))) int32_t p0_release(uint32_t owner_epoch, uint32_t token_slot, uint32_t token_generation, uint32_t release_frames) {
  if (owner_epoch != g_owner_epoch || token_slot >= P0_TOKEN_SLOTS || token_generation == 0) return P0_RESULT_INVALID;
  if (release_frames == 0 || release_frames > g_sample_rate) return P0_RESULT_INVALID;
  if (token_generation <= g_closed_generation[token_slot]) return P0_RESULT_OK;
  if (token_generation > g_closed_generation[token_slot]) g_closed_generation[token_slot] = token_generation;
  ++g_release_count;
  for (uint32_t i = 0; i < P0_MAX_PENDING_GROUPS; ++i) {
    P0PendingGroup* g = &g_pending[i];
    if (!g->occupied) continue;
    uint8_t match = 0;
    for (uint32_t n = 0; n < g->note_count; ++n) {
      if (g->notes[n].token_slot == token_slot && g->notes[n].token_generation <= token_generation) { match = 1; break; }
    }
    if (match) { zero_group(g); ++g_cancelled; }
  }
  for (uint32_t i = 0; i < P0_TOTAL_VOICES; ++i) {
    P0Voice* v = &g_voices[i];
    if (v->active && v->kind != P0_KIND_PROGRAM && v->token_slot == token_slot && v->token_generation <= token_generation) begin_linear_release(v, release_frames, 0);
  }
  return P0_RESULT_OK;
}

__attribute__((visibility("default"))) int32_t p0_panic(uint32_t owner_epoch, uint32_t fade_frames) {
  if (owner_epoch != g_owner_epoch) return P0_RESULT_INVALID;
  if (g_owner_closed) return P0_RESULT_OK;
  if (fade_frames == 0 || fade_frames > g_sample_rate) return P0_RESULT_INVALID;
  g_owner_closed = 1;
  g_program_running = 0;
  g_builder_active = 0;
  for (uint32_t i = 0; i < P0_MAX_PENDING_GROUPS; ++i) if (g_pending[i].occupied) { zero_group(&g_pending[i]); ++g_cancelled; }
  for (uint32_t i = 0; i < P0_TOTAL_VOICES; ++i) if (g_voices[i].active) begin_linear_release(&g_voices[i], fade_frames, 1);
  ++g_panic_count;
  return P0_RESULT_OK;
}

// Full held-state reconciliation is separate from one-shot articulation.
__attribute__((visibility("default"))) void p0_set_closed_generation(uint32_t slot,uint32_t generation) {
  if(slot<P0_TOKEN_SLOTS && generation>g_closed_generation[slot])g_closed_generation[slot]=generation;
}
__attribute__((visibility("default"))) int32_t p0_apply_closed(uint32_t owner_epoch) {
  if(owner_epoch!=g_owner_epoch)return P0_RESULT_INVALID;
  for(uint32_t i=0;i<P0_MAX_PENDING_GROUPS;++i)if(g_pending[i].occupied) {
    for(uint32_t j=0;j<g_pending[i].note_count;++j)if(token_closed(g_pending[i].notes[j].token_slot,g_pending[i].notes[j].token_generation)) {
      zero_group(&g_pending[i]);++g_cancelled;break;
    }
  }
  for(uint32_t i=0;i<P0_TOTAL_VOICES;++i)if(g_voices[i].active&&g_voices[i].kind!=P0_KIND_PROGRAM
      &&token_closed(g_voices[i].token_slot,g_voices[i].token_generation))begin_linear_release(&g_voices[i],g_sample_rate*30u/1000u,0);
  return P0_RESULT_OK;
}
__attribute__((visibility("default"))) void p0_group_input_sequence(uint64_t sequence) { g_builder_input_sequence=sequence; }
__attribute__((visibility("default"))) int32_t p0_reconcile_begin(uint64_t observed_sequence) {
  if (observed_sequence < g_reconcile_sequence) return P0_RESULT_REJECTED;
  g_reconcile_sequence=observed_sequence;
  for (uint32_t i=0;i<P0_TOKEN_SLOTS;++i) g_held_generation[i]=0;
  return P0_RESULT_OK;
}
__attribute__((visibility("default"))) void p0_reconcile_hold(uint32_t slot,uint32_t generation) {
  if(slot<P0_TOKEN_SLOTS)g_held_generation[slot]=generation;
}
__attribute__((visibility("default"))) int32_t p0_reconcile_apply(uint32_t owner_epoch) {
  if(owner_epoch!=g_owner_epoch)return P0_RESULT_INVALID;
  for(uint32_t i=0;i<P0_TOKEN_SLOTS;++i) if(g_token_kind[i]==P0_KIND_GATED
    &&g_seen_generation[i]>g_closed_generation[i]&&g_token_input_sequence[i]<=g_reconcile_sequence
    &&g_held_generation[i]!=g_seen_generation[i]) { g_closed_generation[i]=g_seen_generation[i];++g_release_count; }
  return p0_apply_closed(owner_epoch);
}

__attribute__((visibility("default"))) int32_t p0_program_set_header(
  uint32_t owner_epoch, uint32_t revision, uint32_t steps, uint32_t tempo_milli,
  float b0, float b1, float b2, float a1, float a2,
  uint32_t attack_frames, uint32_t release_start_frames, uint32_t stop_frames, float release_coef
) {
  if (g_owner_closed || owner_epoch != g_owner_epoch) return P0_RESULT_CLOSED;
  if (g_program_running || revision <= g_program_revision) return P0_RESULT_REJECTED;
  if (steps < 1 || steps > P0_PROGRAM_STEPS || tempo_milli < 10000u || tempo_milli > 400000u
      || !valid_coefficients(b0,b1,b2,a1,a2) || !finite_float(release_coef) || release_coef < 0 || release_coef > 1
      || attack_frames == 0 || attack_frames > g_sample_rate || stop_frames <= attack_frames) return P0_RESULT_INVALID;
  g_program_revision = revision;
  g_program_steps = steps;
  g_program_tempo_milli = tempo_milli;
  g_program_b0 = b0; g_program_b1 = b1; g_program_b2 = b2; g_program_a1 = a1; g_program_a2 = a2;
  g_program_attack_frames = attack_frames;
  g_program_release_start_frames = release_start_frames;
  g_program_stop_frames = stop_frames;
  g_program_release_coef = release_coef;
  for (uint32_t i = 0; i < P0_PROGRAM_STEPS; ++i) g_program[i].count = 0;
  return P0_RESULT_OK;
}

__attribute__((visibility("default"))) int32_t p0_program_set_step(
  uint32_t owner_epoch, uint32_t step, uint32_t count,
  float r0, float g0, float r1, float g1, float r2, float g2
) {
  if (g_owner_closed || owner_epoch != g_owner_epoch) return P0_RESULT_CLOSED;
  if (step >= g_program_steps || count > P0_MAX_GROUP_NOTES) return P0_RESULT_INVALID;
  if (g_program_running || !finite_float(r0) || !finite_float(r1) || !finite_float(r2)
      || !finite_float(g0) || !finite_float(g1) || !finite_float(g2)
      || r0 <= 0 || r1 <= 0 || r2 <= 0 || r0 > 16 || r1 > 16 || r2 > 16
      || g0 < 0 || g1 < 0 || g2 < 0 || g0 > 1 || g1 > 1 || g2 > 1) return P0_RESULT_INVALID;
  P0ProgramStep* s = &g_program[step];
  s->count = (uint8_t)count;
  s->ratio[0] = r0; s->gain[0] = g0;
  s->ratio[1] = r1; s->gain[1] = g1;
  s->ratio[2] = r2; s->gain[2] = g2;
  return P0_RESULT_OK;
}

__attribute__((visibility("default"))) int32_t p0_program_start(uint32_t owner_epoch, uint64_t start_frame) {
  if (g_owner_closed || owner_epoch != g_owner_epoch) return P0_RESULT_CLOSED;
  if (g_program_running || start_frame < g_frame || start_frame > g_frame + g_sample_rate*2u || !g_program_revision
      || g_program_revision <= g_program_closed_revision) return P0_RESULT_REJECTED;
  g_program_start_frame = start_frame;
  g_program_step_counter = 0;
  g_program_running = 1;
  return P0_RESULT_OK;
}

__attribute__((visibility("default"))) int32_t p0_program_stop(uint32_t owner_epoch, uint32_t panic_fade_frames) {
  if (owner_epoch != g_owner_epoch) return P0_RESULT_INVALID;
  g_program_running = 0;
  g_program_closed_revision = g_program_revision;
  if (panic_fade_frames) {
    for (uint32_t i = 0; i < P0_TOTAL_VOICES; ++i) if (g_voices[i].active && g_voices[i].kind == P0_KIND_PROGRAM) begin_linear_release(&g_voices[i], panic_fade_frames, 0);
  }
  return P0_RESULT_OK;
}

__attribute__((visibility("default"))) uint32_t p0_render(uint32_t frames) {
  if (frames > P0_MAX_BLOCK) frames = P0_MAX_BLOCK;
  if (!g_owner_closed && g_lease_valid_through && g_frame >= g_lease_valid_through) {
    p0_panic(g_owner_epoch, (uint32_t)(((uint64_t)g_sample_rate * 5ull + 999ull) / 1000ull));
  }
  process_pending(g_frame, frames);
  render_program_due(g_frame, frames);
  for (uint32_t i = 0; i < frames; ++i) {
    if (!g_owner_closed && g_frame+i >= g_lease_valid_through) p0_panic(g_owner_epoch, (g_sample_rate*5u+999u)/1000u);
    float mix = 0.0f;
    for (uint32_t v = 0; v < P0_TOTAL_VOICES; ++v) mix += render_voice_sample(&g_voices[v]);
    g_output[i * 2u] = mix;
    g_output[i * 2u + 1u] = mix;
    if(g_state_ramp_remaining) {
      g_root_hz+=g_root_step;g_program_gain+=g_gain_step;
      if(--g_state_ramp_remaining==0){g_root_hz=g_root_target;g_program_gain=g_gain_target;g_root_step=g_gain_step=0;}
    }
  }
  g_frame += frames;
  return frames;
}

__attribute__((visibility("default"))) void p0_set_frame(uint64_t frame) { if (g_owner_closed && active_voice_count() == 0 && pending_group_count() == 0) g_frame = frame; }
__attribute__((visibility("default"))) uint64_t p0_frame(void) { return g_frame; }
__attribute__((visibility("default"))) uint32_t p0_owner_epoch(void) { return g_owner_epoch; }
__attribute__((visibility("default"))) uint32_t p0_owner_closed(void) { return g_owner_closed; }
__attribute__((visibility("default"))) uint64_t p0_state_revision(void) { return g_state_revision; }
__attribute__((visibility("default"))) uint32_t p0_active_voices(void) { return active_voice_count(); }
__attribute__((visibility("default"))) uint32_t p0_pending_groups(void) { return pending_group_count(); }
__attribute__((visibility("default"))) uint32_t p0_pending_notes(void) { return pending_note_count(); }
__attribute__((visibility("default"))) uint32_t p0_program_running(void) { return g_program_running; }
__attribute__((visibility("default"))) uint64_t p0_started_external(void) { return g_started_external; }
__attribute__((visibility("default"))) uint64_t p0_started_program(void) { return g_started_program; }
__attribute__((visibility("default"))) uint64_t p0_expired(void) { return g_expired; }
__attribute__((visibility("default"))) uint64_t p0_cancelled(void) { return g_cancelled; }
__attribute__((visibility("default"))) uint64_t p0_capacity_rejected(void) { return g_capacity_rejected; }
__attribute__((visibility("default"))) uint64_t p0_invalid_rejected(void) { return g_invalid_rejected; }
__attribute__((visibility("default"))) uint64_t p0_panic_count(void) { return g_panic_count; }
__attribute__((visibility("default"))) uint64_t p0_release_count(void) { return g_release_count; }
__attribute__((visibility("default"))) uint64_t p0_state_applied(void) { return g_state_applied; }
__attribute__((visibility("default"))) uint64_t p0_state_ignored_old(void) { return g_state_ignored_old; }
