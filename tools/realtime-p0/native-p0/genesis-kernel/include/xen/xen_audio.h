/* =============================================================================
 * xen_audio.h — Xensonar Native Audio Module, public C ABI.
 *
 * Everything a host needs, and nothing else. POD types, integer handles, no
 * ownership transfer of PCM, no callbacks from the realtime thread into the
 * host except the optional (documented, RT-safe) grain generator seam.
 *
 * THREAD MODEL
 *   control thread : every function below except xen_engine_render()
 *   realtime thread: xen_engine_render() only, called by a backend
 *   writer thread  : owned by the recorder, never touches engine state
 *
 * Exactly one control thread is supported. This is deliberate: a single-
 * producer ring is the cheapest correct handoff, and a host that needs more
 * can serialise on its own side.
 *
 * MUSICAL SEMANTICS WARNING
 *   The *sound* produced by this kernel is EXPERIMENTAL_PLACEHOLDER.
 *   See MUSICAL_SEMANTICS.md. No claim of Xensonar parity is made anywhere.
 *   The execution substrate — time, lifecycle, ownership — is the real product.
 * ========================================================================== */
#ifndef XEN_AUDIO_H
#define XEN_AUDIO_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/* ------------------------------------------------------------- capacities */
/* Fixed at compile time so the host can size its own structures and so the
 * realtime path never grows a container. Generous on purpose: the whole
 * administrative footprint below is a few hundred kilobytes. */
#define XEN_MAX_VOICES        512u
#define XEN_MAX_PROGRAMS       64u
#define XEN_MAX_ASSETS        256u
#define XEN_CMD_RING_CAP     4096u   /* control -> realtime, power of two     */
#define XEN_SCHED_CAP        4096u   /* realtime-side time-ordered scheduler  */
#define XEN_PROGRAM_PARAMS      8u
#define XEN_STATE_SLOTS        16u
#define XEN_MAX_BLOCK        1024u   /* internal chunk; any quantum is OK     */
#define XEN_GRAINS_PER_STEP    32u   /* generator output bound per step       */
#define XEN_CANCEL_RING       256u
#define XEN_TONE_PLAN_MAX        8u   /* bounded resolved interactive tone plan */
#define XEN_ENTROPHON_BASE_MAX    6u   /* live Wave Entrophon unison bound        */
#define XEN_ENTROPHON_COLOR_MAX   3u   /* live Wave Entrophon colour bound        */
#define XEN_ENTROPHON_BODIES     32u   /* fixed group-voice pool, no RT growth    */
#define XEN_ENTROPHON_DELAY_MAX 16384u /* per-body mono delay ring                 */

/* ------------------------------------------------------------------- types */
typedef uint64_t xen_frame;
typedef uint64_t xen_id;             /* 0 == invalid */

/* "apply at the first render block that observes this command". Not frame
 * deterministic; use a real frame number when determinism matters. */
#define XEN_FRAME_ASAP ((xen_frame)UINT64_MAX)

typedef struct xen_engine  xen_engine;
typedef struct xen_backend xen_backend;

/* ----------------------------------------------------------- status codes */
enum {
    XEN_OK                  =  0,
    XEN_RETIRE_DEFERRED     =  1,  /* asset still referenced; freed later     */
    XEN_RETIRE_DONE         =  2,
    XEN_ERR_ARG             = -1,
    XEN_ERR_EPOCH           = -2,  /* command belongs to a dead epoch         */
    XEN_ERR_STALE           = -3,  /* rejected by the lateness policy         */
    XEN_ERR_QUEUE_FULL      = -4,  /* command ring or scheduler exhausted     */
    XEN_ERR_NO_SLOT         = -5,
    XEN_ERR_HANDLE          = -6,  /* unknown / reclaimed / wrong-epoch id    */
    XEN_ERR_ASSET_RETIRING  = -7,
    XEN_ERR_STATE           = -8,
    XEN_ERR_BACKEND         = -9,
    XEN_ERR_IO              = -10,
    XEN_ERR_UNSUPPORTED     = -11
};

/* --------------------------------------------------------- gesture kinds */
enum {
    XEN_G_ATTACK  = 0,   /* transient, self-terminating                       */
    XEN_G_SUSTAIN = 1,   /* held until a RELEASE with the same token          */
    XEN_G_RELEASE = 2    /* terminal lifecycle for one token; never dropped   */
};

/* Pitch interpretation for interactive Gesture p0. ROOT_RATIO preserves the
 * generic experimental test path; HZ is the preferred implant seam when
 * Xensonar has already resolved its own tuning/pitch semantics. */
enum { XEN_PITCH_ROOT_RATIO = 0, XEN_PITCH_HZ = 1 };

/* ------------------------------------------------ resolved tone plans */
/* Generic execution primitive for adapters that have already resolved musical
 * semantics into concrete oscillator/filter/envelope instructions. The engine
 * does not know presets, scales or WaveStarter. All values are execution data. */
enum {
    XEN_OSC_SINE = 0,
    XEN_OSC_TRIANGLE = 1,
    XEN_OSC_SAWTOOTH = 2,
    XEN_OSC_SQUARE = 3
};

typedef struct {
    float    frequency_hz;
    float    gain;
    float    cutoff_hz;
    float    resonance;
    uint32_t delay_frames;
    uint32_t duration_frames;
    uint32_t waveform;
} xen_tone_desc;

typedef struct {
    uint32_t token;
    xen_frame frame;             /* musical attack boundary */
    uint32_t tone_count;
    xen_tone_desc tones[XEN_TONE_PLAN_MAX];
} xen_tone_plan;

/** Atomically admits one bounded compound interactive timbre. The whole plan
 *  occupies one command-ring slot; partial voices are created together at the
 *  attack boundary or the plan is rejected as a whole. */
int xen_tone_plan_submit(xen_engine* e, uint32_t epoch, const xen_tone_plan* plan);


/* ---------------------------------------------------- resolved Entrophon plan */
/* Render-class-specific execution primitive. Xensonar resolves musical policy,
 * pressure thinning, tuning and parameter semantics before crossing this ABI.
 * The kernel owns only realtime generation and timing from this point onward. */
enum {
    XEN_FILTER_LOWPASS = 0,
    XEN_FILTER_HIGHPASS = 1,
    XEN_FILTER_BANDPASS = 2,
    XEN_FILTER_NOTCH = 3
};

typedef struct {
    uint32_t token;
    xen_frame frame;
    uint32_t base_count;
    uint32_t color_count;
    uint32_t waveform;       /* XEN_OSC_* for base oscillators; colours are square */
    uint32_t filter_type;    /* XEN_FILTER_* */
    uint32_t aux_route_mask; /* browser profile: six bounded per-voice FX sends */
    float base_freqs[XEN_ENTROPHON_BASE_MAX];
    float color_freqs[XEN_ENTROPHON_COLOR_MAX];
    float color_gains[XEN_ENTROPHON_COLOR_MAX];
    float peak_gain;
    float sustain_gain;
    uint32_t attack_frames;
    uint32_t decay_frames;
    uint32_t release_start_frames;
    uint32_t release_frames;
    uint32_t stop_after_frames;
    float pitch_bend_mul;
    uint32_t pitch_bend_frames;
    float filter_start_hz;
    float filter_peak_hz;
    float filter_end_hz;
    uint32_t filter_attack_frames;
    uint32_t filter_decay_frames;
    float filter_q;
    float pre_drive_gain;
    float drive_amount;
    float body_freq_hz;
    float body_q;
    float body_gain;
    uint32_t delay_frames;
    float delay_wet_gain;
    float delay_feedback;
    float normalization_gain;
} xen_entrophon_plan;

/** Submit one already-resolved Wave Entrophon voice body atomically. No heap,
 *  IO, graph construction or parameter interpretation occurs in realtime. */
int xen_entrophon_plan_submit(xen_engine* e, uint32_t epoch, const xen_entrophon_plan* plan);

/* ------------------------------------------------------------ state slots */
enum {
    XEN_STATE_ROOT_HZ      = 0,
    XEN_STATE_MASTER_GAIN  = 1,
    XEN_STATE_FORGE_AMOUNT = 2,
    XEN_STATE_FORGE_TONE   = 3,
    XEN_STATE_FORGE_SPACE  = 4,
    XEN_STATE_TEXTURE_GAIN = 5
    /* 6..15 free for adapters */
};

/* --------------------------------------------------------- program kinds */
enum {
    XEN_PROGRAM_GRANULAR = 0   /* EXPERIMENTAL_PLACEHOLDER generator          */
};

/* ------------------------------------------------------- lateness policy */
/* A gesture may arrive after its intended frame. Two policies, both explicit:
 *
 *  XEN_LATE_DROP  (default) : reject it. Cannot compress N late attacks onto
 *                             one frame, so it cannot manufacture a burst.
 *  XEN_LATE_CLAMP           : execute at the current frame if the lateness is
 *                             within tolerance_frames, else reject. This CAN
 *                             collapse several separately-timed late attacks
 *                             onto one frame; it exists only because some
 *                             hosts prefer a sloppy note to no note. Opt in
 *                             knowingly.
 *
 * RELEASE and PANIC are never subject to either policy (see §10 priority). */
enum { XEN_LATE_DROP = 0, XEN_LATE_CLAMP = 1 };

/* -------------------------------------------------------- recorder status */
enum { XEN_REC_IDLE = 0, XEN_REC_ACTIVE = 1, XEN_REC_OVERRUN = 2, XEN_REC_IO_FAILED = 3 };

/* ------------------------------------------------------------------ config */
typedef struct {
    uint32_t sample_rate;                /* 48000 default                     */
    uint64_t seed;                       /* engine-level seed                 */
    uint32_t lateness_policy;            /* XEN_LATE_*                        */
    uint32_t lateness_tolerance_frames;  /* CLAMP only                        */
    uint32_t recorder_capacity_frames;   /* bounded RT->writer ring           */
} xen_config;

void xen_config_default(xen_config* cfg);

/* --------------------------------------------------------------- telemetry */
/* Bounded, pull-based POD snapshot. Counters are plain increments on paths
 * that already execute; reading this never touches the realtime thread. */
typedef struct {
    uint32_t session;
    uint32_t epoch;
    uint64_t frame;
    uint32_t sample_rate;
    uint32_t last_quantum;

    uint32_t voices_active;
    uint32_t voices_peak;
    uint32_t voices_interactive;
    uint32_t programs_live;
    uint32_t programs_active;

    uint32_t sched_occupancy;
    uint32_t sched_peak;

    uint64_t gestures_submitted;
    uint64_t gestures_executed;
    uint64_t attacks_executed;
    uint64_t attacks_denied_no_voice;   /* explicit, never silent             */
    uint64_t tone_plans_submitted;
    uint64_t tone_plans_executed;
    uint64_t tone_plans_denied_no_voice;
    uint64_t entrophon_plans_submitted;
    uint64_t entrophon_plans_executed;
    uint64_t entrophon_plans_denied_no_body;
    uint64_t attacks_cancelled;         /* release arrived before the attack  */
    uint64_t releases_executed;
    uint64_t releases_no_match;
    uint64_t dropped_stale;
    uint64_t dropped_epoch;
    uint64_t dropped_queue_full;
    uint64_t dropped_sched_full;

    uint64_t grains_emitted;
    uint64_t grains_denied_no_voice;
    uint64_t state_writes;
    uint64_t state_applied;
    uint64_t program_updates_applied;
    uint64_t panics;

    uint32_t assets_live;
    uint32_t assets_retiring;

    uint32_t recorder_status;
    uint64_t recorder_frames;
    uint64_t recorder_overruns;

    uint64_t nonfinite_blocks;          /* blocks whose output was not finite */
    float    peak_l, peak_r;
} xen_telemetry;

/* =========================================================================
 * lifecycle
 * ====================================================================== */
xen_engine* xen_engine_create(const xen_config* cfg);
void        xen_engine_destroy(xen_engine* e);

/** Current epoch. Every submitted command must carry it. */
uint32_t  xen_engine_epoch(const xen_engine* e);
uint32_t  xen_engine_session(const xen_engine* e);

/** Frame most recently published by the realtime thread (block start). The
 *  control thread uses it for lateness decisions; it is a lower bound. */
xen_frame xen_engine_now(const xen_engine* e);

/** Terminal fence. Increments the epoch, so every previously issued program
 *  handle and every in-flight command immediately fails closed. The realtime
 *  side flushes the scheduler, stops every voice and kills every program at
 *  the start of the next render block. Returns the new epoch. */
uint32_t xen_engine_panic(xen_engine* e);

/** Panic + new session identity. Assets survive (see README, asset contract). */
uint32_t xen_engine_restart(xen_engine* e);

/** Control-thread housekeeping: reclaims dead program slots and completes
 *  deferred asset retirement. Call it periodically (e.g. 10 Hz) or after
 *  destroy/retire. Never call from the realtime thread. */
void xen_engine_maintain(xen_engine* e);

void xen_engine_telemetry(const xen_engine* e, xen_telemetry* out);

/* =========================================================================
 * assets — immutable, reference counted, deferred retirement
 * ====================================================================== */
/** Copies `frames*channels` samples into engine-owned storage. Control thread.
 *  Asset handles are epoch independent: an asset makes no sound on its own. */
xen_id xen_asset_publish(xen_engine* e, const float* interleaved, uint64_t frames,
                         uint32_t channels, double base_hz, const char* name);

/** Marks the asset for retirement. The asset stays fully valid — including for
 *  grains that have not been generated yet — until no live program references
 *  it and no live voice reads it. Returns XEN_RETIRE_DONE if it was freed
 *  immediately, XEN_RETIRE_DEFERRED otherwise. */
int xen_asset_retire(xen_engine* e, xen_id asset);

/** Programs cannot be created against a retiring asset (fails closed). */
int xen_asset_is_live(const xen_engine* e, xen_id asset);

/* =========================================================================
 * programs — autonomous musical processes
 * ====================================================================== */
/** Creates a program in the ARMED state: it exists, it holds a reference on
 *  its asset, and it consumes no DSP resources whatsoever until activated. */
xen_id xen_program_create(xen_engine* e, uint32_t epoch, uint32_t kind, xen_id asset,
                          const double* params, uint32_t n_params, uint64_t seed);

/** Activation/deactivation is a timed command: `at` may be a frame or ASAP.
 *  Activation resets the program's next-event frame to the activation frame,
 *  so an inactive interval can never be "caught up". */
int xen_program_activate(xen_engine* e, uint32_t epoch, xen_id program, int on, xen_frame at);

/** Whole-parameter-block replacement applied atomically at `at`. Parameters
 *  are copied into the command, so the realtime side never reads memory the
 *  control thread may still be writing. */
int xen_program_update(xen_engine* e, uint32_t epoch, xen_id program,
                       const double* params, uint32_t n_params, xen_frame at);

/** The program stops scheduling at `at`; already sounding grains finish
 *  naturally. The slot is reclaimed by xen_engine_maintain() once the realtime
 *  side has acknowledged that nothing can reference it any more. */
int xen_program_destroy(xen_engine* e, uint32_t epoch, xen_id program, xen_frame at);

/* =========================================================================
 * state — continuous values
 * ====================================================================== */
/** Timed, sample-accurate, deterministic. Use this for anything that must be
 *  reproducible. Consumes one command ring slot. */
int xen_state_set_at(xen_engine* e, uint32_t epoch, uint32_t slot, float value, xen_frame at);

/** Latest-wins mailbox for live control surfaces. Coalescing: N writes to one
 *  slot between two render blocks produce ONE observation. Applied at the
 *  start of the next block, therefore NOT frame deterministic — by design. */
int xen_state_set_latest(xen_engine* e, uint32_t epoch, uint32_t slot, float value);

float xen_state_get(const xen_engine* e, uint32_t slot);

/* =========================================================================
 * gestures — discrete, timestamped, epoch fenced
 * ====================================================================== */
typedef struct {
    uint32_t  kind;       /* XEN_G_*                                          */
    uint32_t  token;      /* identity for RELEASE; 0 is allowed for ATTACK    */
    xen_frame frame;      /* intended musical frame, or XEN_FRAME_ASAP        */
    float     p0;         /* ratio or resolved Hz, selected by pitch_mode     */
    float     p1;         /* velocity 0..1                                    */
    float     p2;         /* pan -1..1                                        */
    uint32_t  pitch_mode; /* XEN_PITCH_*; zero keeps source compatibility     */
} xen_gesture;

/** Returns XEN_OK, or XEN_ERR_EPOCH / XEN_ERR_STALE / XEN_ERR_QUEUE_FULL.
 *  Rejection is synchronous and explicit: a caller always learns that a
 *  gesture will not be heard. */
int xen_gesture_submit(xen_engine* e, uint32_t epoch, const xen_gesture* g);

/* =========================================================================
 * recording — same samples the backend receives
 * ====================================================================== */
/** path == NULL records to the bounded ring only (drain it yourself).
 *  Otherwise a writer thread is started which drains the ring to a WAV file.
 *  The realtime thread never touches the filesystem. */
int      xen_record_start(xen_engine* e, const char* wav_path);
int      xen_record_stop(xen_engine* e);
int      xen_record_status(const xen_engine* e);
/** Consumer side of the ring. Returns frames written to dst (interleaved). */
uint32_t xen_record_drain(xen_engine* e, float* dst_interleaved, uint32_t max_frames);

/* =========================================================================
 * render — the one kernel, shared by every backend
 * ====================================================================== */
/** Planar stereo. `frames` may be anything and may change every call; musical
 *  time is derived from the engine frame counter, never from this argument. */
void xen_engine_render(xen_engine* e, float* left, float* right, uint32_t frames);

/* =========================================================================
 * grain generator seam  (§3: do not invent Xensonar parity)
 * ====================================================================== */
typedef struct {
    xen_frame frame;       /* absolute start frame                           */
    uint32_t  asset_slot;  /* engine-internal slot, supplied in the context   */
    double    source_pos;  /* read offset in asset frames                     */
    double    rate;        /* playback rate                                   */
    double    dur_frames;  /* grain length                                    */
    float     gain;
    float     pan;
} xen_grain_event;

typedef struct {
    const double* params;        /* XEN_PROGRAM_PARAMS doubles                */
    double        root_hz;
    double        asset_base_hz;
    uint64_t      asset_frames;
    double        sample_rate;
    xen_frame     now;           /* frame of this scheduling step             */
    uint64_t*     rng;           /* program-owned deterministic stream        */
    uint32_t      asset_slot;
} xen_grain_ctx;

/** Called on the realtime thread when a program's scheduling step is due.
 *  MUST be realtime safe: no allocation, no I/O, no locks, bounded work.
 *  Writes up to `max_events` grains, sets *next_step_frames (>=1), returns
 *  the number written. Replace this to install canonical Xensonar behaviour
 *  without touching the substrate. */
typedef uint32_t (*xen_grain_generator_fn)(void* user, const xen_grain_ctx* ctx,
                                           xen_grain_event* out, uint32_t max_events,
                                           uint64_t* next_step_frames);

/** Install before activating any granular program. NULL restores the built-in
 *  EXPERIMENTAL_PLACEHOLDER generator. */
void xen_engine_set_grain_generator(xen_engine* e, xen_grain_generator_fn fn, void* user);

/* =========================================================================
 * backends — prepare / start / render / query / stop / destroy
 * ====================================================================== */
typedef struct {
    uint32_t sample_rate;
    uint32_t channels;
    uint32_t last_quantum;
    uint64_t frames_rendered;
    uint64_t backend_xruns;   /* reported by the device layer, never invented */
    int      running;
    char     name[32];
} xen_backend_info;

/** Deterministic offline device. `quanta` is a cycled list of callback sizes;
 *  pass NULL for a constant 512. */
int xen_backend_null_create(xen_engine* e, const uint32_t* quanta, uint32_t n_quanta,
                            xen_backend** out);
/** Drives exactly `frames` frames through the shared render kernel.
 *  out_interleaved may be NULL. */
int xen_backend_null_run(xen_backend* b, uint64_t frames, float* out_interleaved);

/** Real PipeWire backend. Returns XEN_ERR_UNSUPPORTED if the library was built
 *  without PipeWire support. */
int xen_backend_pipewire_create(xen_engine* e, const char* stream_name,
                                uint32_t quantum_hint, xen_backend** out);

int  xen_backend_start(xen_backend* b);
int  xen_backend_stop(xen_backend* b);
void xen_backend_destroy(xen_backend* b);
void xen_backend_query(const xen_backend* b, xen_backend_info* out);

/* =========================================================================
 * realtime allocation guard (test/diagnostic only)
 * ====================================================================== */
/** When the library is linked with -Wl,--wrap=malloc,... these two mark the
 *  window in which any allocation is a hard error. No-ops otherwise. */
void     xen_rt_guard_begin(void);
void     xen_rt_guard_end(void);
uint64_t xen_rt_guard_violations(void);

#ifdef __cplusplus
}
#endif
#endif /* XEN_AUDIO_H */
