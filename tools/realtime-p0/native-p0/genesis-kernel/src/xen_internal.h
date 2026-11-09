/* xen_internal.h — engine-private structures. Not installed, not ABI. */
#ifndef XEN_INTERNAL_H
#define XEN_INTERNAL_H

#include "xen/xen_audio.h"
#include <stdatomic.h>
#include <pthread.h>
#include <stdio.h>

/* ------------------------------------------------------------------- rng */
/* splitmix64. Deterministic, allocation free, identical on every platform
 * because it is pure integer arithmetic. */
static inline uint64_t xen_rng_next(uint64_t* s) {
    uint64_t z = (*s += 0x9E3779B97F4A7C15ULL);
    z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9ULL;
    z = (z ^ (z >> 27)) * 0x94D049BB133111EBULL;
    return z ^ (z >> 31);
}
/* [0,1) with 24 bits of mantissa: the same value on any IEEE-754 machine. */
static inline double xen_rng_f(uint64_t* s) {
    return (double)(uint32_t)(xen_rng_next(s) >> 40) * (1.0 / 16777216.0);
}
static inline double xen_rng_bi(uint64_t* s) { return xen_rng_f(s) * 2.0 - 1.0; }
static inline uint32_t xen_rng_u(uint64_t* s, uint32_t n) {
    return n ? (uint32_t)(xen_rng_next(s) >> 33) % n : 0u;
}

/* -------------------------------------------------------------- commands */
enum {
    XEN_CMD_GESTURE = 0,
    XEN_CMD_TONE_PLAN,
    XEN_CMD_ENTROPHON_PLAN,
    XEN_CMD_STATE,
    XEN_CMD_PROG_ACTIVATE,
    XEN_CMD_PROG_UPDATE,
    XEN_CMD_PROG_DESTROY
};

typedef struct {
    uint32_t delay_frames;
    uint32_t duration_frames;
    float phase_inc;
    float gain;
    float attack_inc;
    float decay_mul;
    float b0,b1,b2,a1,a2;
    uint8_t waveform;
} xen_tone_rt;


typedef struct { float b0,b1,b2,a1,a2; } xen_biquad_coeff;

typedef struct {
    uint32_t base_count, color_count;
    uint32_t aux_route_mask;
    uint8_t waveform, filter_type;
    float base_inc[XEN_ENTROPHON_BASE_MAX];
    float color_inc[XEN_ENTROPHON_COLOR_MAX];
    float color_gain[XEN_ENTROPHON_COLOR_MAX];
    float peak_gain, sustain_gain;
    uint32_t attack_frames, decay_frames, release_start_frames, release_frames, stop_after_frames;
    float bend_step;
    uint32_t bend_frames;
    xen_biquad_coeff filter_start, filter_peak, filter_end;
    uint32_t filter_attack_frames, filter_decay_frames;
    float pre_drive_gain, drive_amount;
    xen_biquad_coeff body_filter;
    float body_gain;
    uint32_t delay_frames;
    float delay_wet_gain, delay_feedback, normalization_gain;
} xen_entrophon_rt;

typedef struct {
    uint32_t  kind;
    uint32_t  epoch;
    xen_frame frame;      /* effective musical frame (ASAP resolved on drain) */
    uint64_t  seq;        /* submission order: makes execution deterministic  */
    uint64_t  id;         /* program handle                                   */
    uint32_t  a;          /* gesture kind / state slot / activate flag        */
    uint32_t  b;          /* gesture pitch mode / reserved                    */
    uint32_t  token;
    float     f0, f1, f2;
    uint32_t  n_params;
    double    params[XEN_PROGRAM_PARAMS];
    uint32_t  tone_count;
    xen_tone_rt tones[XEN_TONE_PLAN_MAX];
    xen_entrophon_rt entrophon;
} xen_cmd;

typedef struct {
    xen_cmd          buf[XEN_CMD_RING_CAP];
    _Atomic uint32_t head;   /* producer: control thread */
    _Atomic uint32_t tail;   /* consumer: realtime thread */
} xen_ring;

/* ---------------------------------------------------------------- voices */
enum { XEN_V_FREE = 0, XEN_V_GRAIN, XEN_V_ATTACK, XEN_V_SUSTAIN, XEN_V_TONE };
enum { XEN_PRI_TEXTURE = 0, XEN_PRI_INTERACTIVE = 1 };

typedef struct {
    uint8_t  type[XEN_MAX_VOICES];
    uint8_t  pri[XEN_MAX_VOICES];
    uint8_t  releasing[XEN_MAX_VOICES];
    int16_t  owner[XEN_MAX_VOICES];    /* program slot, -1 for gestures       */
    int16_t  asset[XEN_MAX_VOICES];    /* asset slot, -1 if none              */
    uint32_t token[XEN_MAX_VOICES];
    double   pos[XEN_MAX_VOICES];
    double   rate[XEN_MAX_VOICES];
    double   age[XEN_MAX_VOICES];
    double   dur[XEN_MAX_VOICES];
    double   phase[XEN_MAX_VOICES];
    double   finc[XEN_MAX_VOICES];
    double   env[XEN_MAX_VOICES];
    double   envk[XEN_MAX_VOICES];
    double   attack_inc[XEN_MAX_VOICES];
    xen_frame start_frame[XEN_MAX_VOICES];
    xen_frame end_frame[XEN_MAX_VOICES];
    uint8_t  waveform[XEN_MAX_VOICES];
    uint8_t  stage[XEN_MAX_VOICES];
    float    b0[XEN_MAX_VOICES], b1[XEN_MAX_VOICES], b2[XEN_MAX_VOICES];
    float    a1[XEN_MAX_VOICES], a2[XEN_MAX_VOICES];
    float    z1[XEN_MAX_VOICES], z2[XEN_MAX_VOICES];
    float    gl[XEN_MAX_VOICES];
    float    gr[XEN_MAX_VOICES];

    uint16_t freelist[XEN_MAX_VOICES];
    uint32_t n_free;
    uint16_t active[XEN_MAX_VOICES];   /* birth ordered: keeps the summation  */
    int32_t  slot_at[XEN_MAX_VOICES];  /* order a function of musical history */
    uint32_t n_active;
} xen_voices;

/* ---------------------------------------------------------- Entrophon bodies */
typedef struct {
    uint8_t active;
    uint8_t waveform;
    uint32_t token;
    uint32_t aux_route_mask;
    xen_frame start_frame;
    uint32_t age;
    uint32_t base_count, color_count;
    double phase[XEN_ENTROPHON_BASE_MAX + XEN_ENTROPHON_COLOR_MAX];
    double inc[XEN_ENTROPHON_BASE_MAX + XEN_ENTROPHON_COLOR_MAX];
    float color_gain[XEN_ENTROPHON_COLOR_MAX];
    float peak_gain, sustain_gain;
    uint32_t attack_frames, decay_frames, release_start_frames, release_frames, stop_after_frames;
    float release_start_gain, release_mul, env;
    double bend_step;
    uint32_t bend_remaining;
    xen_biquad_coeff filter_start, filter_peak, filter_end;
    uint32_t filter_attack_frames, filter_decay_frames;
    float filter_z1, filter_z2;
    float pre_drive_gain, drive_amount;
    xen_biquad_coeff body_filter;
    float body_z1, body_z2, body_gain;
    uint32_t delay_frames, delay_w, delay_generation;
    float delay_wet_gain, delay_feedback, normalization_gain;
    float delay[XEN_ENTROPHON_DELAY_MAX];
    uint32_t delay_tag[XEN_ENTROPHON_DELAY_MAX];
} xen_entrophon_body;

typedef struct {
    xen_entrophon_body body[XEN_ENTROPHON_BODIES];
    uint32_t active_count;
    uint32_t peak_count;
} xen_entrophon_pool;

/* -------------------------------------------------------------- programs */
enum { XEN_P_FREE = 0, XEN_P_ARMED, XEN_P_LIVE, XEN_P_DYING, XEN_P_DEAD };

typedef struct {
    _Atomic uint32_t state;
    uint32_t  gen;
    uint32_t  epoch;
    uint32_t  kind;
    int32_t   asset;
    uint64_t  seed;
    uint64_t  rng;
    double    params[XEN_PROGRAM_PARAMS];
    int       active;
    xen_frame next_frame;
    uint32_t  voices;
    uint64_t  emitted;
} xen_program;

/* ---------------------------------------------------------------- assets */
enum { XEN_A_FREE = 0, XEN_A_LIVE, XEN_A_RETIRING };

typedef struct {
    float*          data;        /* mono mixdown, engine owned               */
    uint64_t        frames;
    double          base_hz;
    _Atomic int32_t voice_refs;  /* realtime thread                          */
    int32_t         prog_refs;   /* control thread                           */
    uint32_t        gen;
    uint32_t        state;
    char            name[32];
} xen_asset;

/* -------------------------------------------------------------- recorder */
typedef struct {
    float*           ring;          /* interleaved stereo                     */
    uint32_t         cap_frames;
    _Atomic uint32_t w, r;
    _Atomic uint32_t status;
    _Atomic uint64_t frames;
    _Atomic uint64_t overruns;
    _Atomic int      stop;
    pthread_t        thread;
    int              thread_live;
    uint32_t         sample_rate;
    char             path[512];
} xen_recorder;

/* ------------------------------------------------------------------- dsp */
typedef struct { double lp, bp; } xen_svf;

typedef struct {
    float*   l;
    float*   r;
    uint32_t n;
    uint32_t w;
} xen_delay;

#define XEN_HANN_N 2048
extern float xen_hann[XEN_HANN_N + 1];
void   xen_dsp_init(void);
double xen_softclip(double x);
double xen_sin_turns(double p);
double xen_svf_tick(xen_svf* s, double x, double f, double q);
void   xen_delay_tick(xen_delay* d, double xl, double xr, double dl, double dr,
                      double fb, double* out);


/* Entrophon render-class core. Admission occurs from rt_exec at an exact frame;
 * rendering is fixed-pool and allocation-free. */
int  xen_entrophon_rt_admit(xen_engine* e, uint32_t token, xen_frame frame, const xen_entrophon_rt* plan);
void xen_entrophon_render(xen_engine* e, uint32_t n);
void xen_entrophon_panic(xen_engine* e);

/* ------------------------------------------------------------- telemetry */
#define XEN_CNT_LIST(X)                \
    X(gestures_submitted)              \
    X(gestures_executed)               \
    X(attacks_executed)                \
    X(attacks_denied_no_voice)         \
    X(tone_plans_submitted)            \
    X(tone_plans_executed)             \
    X(tone_plans_denied_no_voice)       \
    X(entrophon_plans_submitted)        \
    X(entrophon_plans_executed)         \
    X(entrophon_plans_denied_no_body)   \
    X(attacks_cancelled)               \
    X(releases_executed)               \
    X(releases_no_match)               \
    X(dropped_stale)                   \
    X(dropped_epoch)                   \
    X(dropped_queue_full)              \
    X(dropped_sched_full)              \
    X(grains_emitted)                  \
    X(grains_denied_no_voice)          \
    X(state_writes)                    \
    X(state_applied)                   \
    X(program_updates_applied)         \
    X(panics)                          \
    X(nonfinite_blocks)

typedef struct {
#define XEN_DECL(n) _Atomic uint64_t n;
    XEN_CNT_LIST(XEN_DECL)
#undef XEN_DECL
} xen_counters;

#define XEN_INC(e, f) atomic_fetch_add_explicit(&(e)->cnt.f, 1u, memory_order_relaxed)
#define XEN_ADD(e, f, v) atomic_fetch_add_explicit(&(e)->cnt.f, (uint64_t)(v), memory_order_relaxed)
#define XEN_GET(e, f) atomic_load_explicit(&(e)->cnt.f, memory_order_relaxed)

/* ---------------------------------------------------------------- engine */
struct xen_engine {
    xen_config cfg;
    double     sr;

    /* authoritative clock: owned by the realtime thread */
    xen_frame        frame;
    _Atomic uint64_t pub_now;
    _Atomic uint32_t epoch;
    _Atomic uint32_t panic_epoch; /* terminal side-channel; never uses cmd ring */
    _Atomic uint32_t session;
    _Atomic uint64_t seq;
    uint32_t         rt_epoch;
    _Atomic uint32_t last_quantum;

    xen_ring  ring;
    xen_cmd   sched[XEN_SCHED_CAP];
    uint32_t  sched_count;
    uint32_t  sched_peak;

    /* latest-wins mailbox (live control surfaces) */
    _Atomic float    mail[XEN_STATE_SLOTS];
    _Atomic uint32_t mail_dirty;

    float state[XEN_STATE_SLOTS];

    xen_voices  v;
    xen_entrophon_pool entrophon;
    uint32_t    voices_peak;
    xen_program prog[XEN_MAX_PROGRAMS];
    xen_asset   asset[XEN_MAX_ASSETS];
    pthread_mutex_t asset_lock;   /* control thread only; never taken in RT   */

    /* token bookkeeping (bounded rings, no dedup state that can be poisoned) */
    uint32_t cancel_tok[XEN_CANCEL_RING];
    uint32_t cancel_pos;
    uint32_t seen_tok[XEN_CANCEL_RING];
    uint32_t seen_pos;

    /* dsp */
    float     busL[XEN_MAX_BLOCK];
    float     busR[XEN_MAX_BLOCK];
    /* Optional browser-WASM capture. Each Entrophon body writes only to the
     * aux outputs named by its immutable record mask. NULL in native hosts. */
    float*    entrophon_aux_out[6];
    uint32_t  entrophon_aux_offset;
    uint8_t   bypass_post_fx; /* dedicated browser render-class profile only */
    xen_svf   svfL, svfR;
    xen_delay delay;
    float     peak_l, peak_r;

    xen_grain_generator_fn gen_fn;
    void*                  gen_user;
    xen_grain_event        gbuf[XEN_GRAINS_PER_STEP];

    float        recbuf[XEN_MAX_BLOCK * 2];   /* interleaved recorder scratch */

    /* values published by the realtime thread for telemetry readers */
    _Atomic uint32_t pub_voices, pub_voices_inter, pub_voices_peak;
    _Atomic uint32_t pub_sched, pub_sched_peak;
    _Atomic uint32_t pub_progs_live, pub_progs_active;
    _Atomic float    pub_peak_l, pub_peak_r;

    xen_recorder rec;
    xen_counters cnt;
};

/* --------------------------------------------------------- internal api */
/* handle layout: [epoch:16][gen:32][slot:16] */
static inline xen_id xen_pack(uint32_t epoch, uint32_t gen, uint32_t slot) {
    return ((uint64_t)(epoch & 0xFFFFu) << 48) | ((uint64_t)gen << 16) | (uint64_t)(slot & 0xFFFFu);
}
static inline uint32_t xen_h_epoch(xen_id h) { return (uint32_t)((h >> 48) & 0xFFFFu); }
static inline uint32_t xen_h_gen(xen_id h)   { return (uint32_t)((h >> 16) & 0xFFFFFFFFu); }
static inline uint32_t xen_h_slot(xen_id h)  { return (uint32_t)(h & 0xFFFFu); }

void     xen_voices_init(xen_voices* v);
uint32_t xen_voice_capacity_for_priority(const struct xen_engine* e, uint8_t pri);
int32_t  xen_voice_alloc(struct xen_engine* e, uint8_t pri);
void     xen_voice_free(struct xen_engine* e, uint32_t idx);
void     xen_voices_render(struct xen_engine* e, uint32_t n);

int  xen_asset_slot_valid(const struct xen_engine* e, xen_id h, int32_t* slot);
void xen_assets_maintain_locked(struct xen_engine* e);

void xen_program_step(struct xen_engine* e, uint32_t slot);
xen_grain_generator_fn xen_default_generator(void);

int  xen_ring_push(struct xen_engine* e, const xen_cmd* c);
int  xen_ring_pop(struct xen_engine* e, xen_cmd* out);
void xen_sched_insert(struct xen_engine* e, const xen_cmd* c);
int  xen_sched_pop_min(struct xen_engine* e, xen_cmd* out);
int  xen_rt_resolve_program(struct xen_engine* e, const xen_cmd* c, uint32_t* slot);
void xen_rt_drain(struct xen_engine* e);
void xen_rt_panic(struct xen_engine* e, uint32_t new_epoch);

int      xen_recorder_init(xen_recorder* r, uint32_t cap_frames, uint32_t sr);
void     xen_recorder_free(xen_recorder* r);
void     xen_recorder_push(xen_recorder* r, const float* interleaved, uint32_t frames);
uint32_t xen_recorder_pull(xen_recorder* r, float* dst, uint32_t max_frames);

/* backend vtable */
struct xen_backend {
    xen_engine* e;
    int (*start)(struct xen_backend*);
    int (*stop)(struct xen_backend*);
    void (*destroy)(struct xen_backend*);
    void (*query)(const struct xen_backend*, xen_backend_info*);
    void* impl;
};

#endif /* XEN_INTERNAL_H */
