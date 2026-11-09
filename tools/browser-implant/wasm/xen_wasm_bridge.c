/* Browser ABI bridge: fixed 64-word records -> REAL C11 kernel.
 * Kind 1 is the frozen Direct-Synth tone plan. Kind 2 is the resolved
 * Wave Entrophon render-class plan. Musical policy remains on the browser
 * control side; this bridge validates/decodes transport only. */
#include "xen_wasm_bridge.h"
#include "xen/xen_audio.h"
#include "xen_internal.h" /* browser-only route capture + dedicated profile */
#include <string.h>

#define REC_META 0u
#define REC_TOKEN 1u
#define REC_EPOCH 2u
#define REC_FRAME_LO 3u
#define REC_FRAME_HI 4u
#define PROTOCOL_VERSION 1u
#define KIND_TONE_PLAN 1u
#define KIND_ENTROPHON_PLAN 2u

#define TP_TONE_COUNT 5u
#define TP_TONES 8u
#define TONE_WORDS 7u

#define EP_BASE_COUNT 5u
#define EP_COLOR_COUNT 6u
#define EP_FLAGS 7u
#define EP_BASE_FREQS 8u
#define EP_COLOR_FREQS 14u
#define EP_COLOR_GAINS 17u
#define EP_PEAK_GAIN 20u
#define EP_SUSTAIN_GAIN 21u
#define EP_ATTACK_FRAMES 22u
#define EP_DECAY_FRAMES 23u
#define EP_RELEASE_START_FRAMES 24u
#define EP_RELEASE_FRAMES 25u
#define EP_STOP_AFTER_FRAMES 26u
#define EP_PITCH_BEND_MUL 27u
#define EP_PITCH_BEND_FRAMES 28u
#define EP_FILTER_START_HZ 29u
#define EP_FILTER_PEAK_HZ 30u
#define EP_FILTER_END_HZ 31u
#define EP_FILTER_ATTACK_FRAMES 32u
#define EP_FILTER_DECAY_FRAMES 33u
#define EP_FILTER_Q 34u
#define EP_PRE_DRIVE_GAIN 35u
#define EP_DRIVE_AMOUNT 36u
#define EP_BODY_FREQ_HZ 37u
#define EP_BODY_Q 38u
#define EP_BODY_GAIN 39u
#define EP_DELAY_FRAMES 40u
#define EP_DELAY_WET_GAIN 41u
#define EP_DELAY_FEEDBACK 42u
#define EP_NORMALIZATION_GAIN 43u
#define EP_AUX_ROUTE_MASK 44u

#define PROFILE_DIRECT 0u
#define PROFILE_ENTROPHON 1u

static xen_engine* g_engine;
static uint32_t g_profile;
static uint32_t g_record[XEN_WASM_RECORD_WORDS];
static float g_out_l[XEN_MAX_BLOCK];
static float g_out_r[XEN_MAX_BLOCK];
static float g_out_aux[XEN_WASM_ENTROPHON_AUX_OUTPUTS][XEN_MAX_BLOCK];

static float bits_f32(uint32_t u) { float f; memcpy(&f, &u, sizeof f); return f; }
static xen_frame u64_words(uint32_t lo, uint32_t hi) {
    return ((xen_frame)hi << 32) | (xen_frame)lo;
}

int xen_wasm_init_profile(uint32_t sample_rate, uint32_t profile) {
    if (g_engine || profile > PROFILE_ENTROPHON) return XEN_ERR_STATE;
    xen_config cfg; xen_config_default(&cfg);
    cfg.sample_rate = sample_rate;
    cfg.lateness_policy = XEN_LATE_DROP;
    cfg.lateness_tolerance_frames = 0;
    g_engine = xen_engine_create(&cfg);
    if (!g_engine) return XEN_ERR_STATE;
    g_profile = profile;
    if (profile == PROFILE_ENTROPHON) {
        /* Dedicated render-class host enters Xensonar's existing main bus.
         * Bypass the generic kernel placeholder Forge/master transform so the
         * Entrophon body is not double-processed. Direct-Synth profile stays
         * byte-for-byte on the existing post-DSP path. */
        g_engine->bypass_post_fx = 1u;
    }
    return XEN_OK;
}
int xen_wasm_init(uint32_t sample_rate) { return xen_wasm_init_profile(sample_rate, PROFILE_DIRECT); }
void xen_wasm_destroy(void) { if (g_engine) xen_engine_destroy(g_engine); g_engine = 0; g_profile = 0u; }
uint32_t xen_wasm_epoch(void) { return g_engine ? xen_engine_epoch(g_engine) : 0u; }
uint32_t xen_wasm_panic(void) { return g_engine ? xen_engine_panic(g_engine) : 0u; }
uintptr_t xen_wasm_record_scratch_ptr(void) { return (uintptr_t)g_record; }
uintptr_t xen_wasm_output_l_ptr(void) { return (uintptr_t)g_out_l; }
uintptr_t xen_wasm_output_r_ptr(void) { return (uintptr_t)g_out_r; }
uintptr_t xen_wasm_output_aux_ptr(uint32_t route) {
    return route < XEN_WASM_ENTROPHON_AUX_OUTPUTS ? (uintptr_t)g_out_aux[route] : (uintptr_t)0;
}
uint32_t xen_wasm_max_render_frames(void) { return XEN_MAX_BLOCK; }

static int submit_tone(const uint32_t* w) {
    const uint32_t count = w[TP_TONE_COUNT];
    if (count == 0u || count > XEN_TONE_PLAN_MAX) return XEN_ERR_ARG;
    xen_tone_plan p; memset(&p, 0, sizeof p);
    p.token = w[REC_TOKEN];
    p.frame = u64_words(w[REC_FRAME_LO], w[REC_FRAME_HI]);
    p.tone_count = count;
    for (uint32_t i = 0; i < count; ++i) {
        const uint32_t b = TP_TONES + i * TONE_WORDS;
        p.tones[i].frequency_hz = bits_f32(w[b + 0u]);
        p.tones[i].gain = bits_f32(w[b + 1u]);
        p.tones[i].cutoff_hz = bits_f32(w[b + 2u]);
        p.tones[i].resonance = bits_f32(w[b + 3u]);
        p.tones[i].delay_frames = w[b + 4u];
        p.tones[i].duration_frames = w[b + 5u];
        p.tones[i].waveform = w[b + 6u];
    }
    return xen_tone_plan_submit(g_engine, w[REC_EPOCH], &p);
}

static int submit_entrophon(const uint32_t* w) {
    xen_entrophon_plan p; memset(&p, 0, sizeof p);
    p.token = w[REC_TOKEN];
    p.frame = u64_words(w[REC_FRAME_LO], w[REC_FRAME_HI]);
    p.base_count = w[EP_BASE_COUNT];
    p.color_count = w[EP_COLOR_COUNT];
    const uint32_t flags = w[EP_FLAGS];
    p.waveform = flags & 0xffu;
    p.filter_type = (flags >> 8) & 0xffu;
    for (uint32_t i=0; i<XEN_ENTROPHON_BASE_MAX; i++) p.base_freqs[i] = bits_f32(w[EP_BASE_FREQS+i]);
    for (uint32_t i=0; i<XEN_ENTROPHON_COLOR_MAX; i++) {
        p.color_freqs[i] = bits_f32(w[EP_COLOR_FREQS+i]);
        p.color_gains[i] = bits_f32(w[EP_COLOR_GAINS+i]);
    }
    p.peak_gain = bits_f32(w[EP_PEAK_GAIN]);
    p.sustain_gain = bits_f32(w[EP_SUSTAIN_GAIN]);
    p.attack_frames = w[EP_ATTACK_FRAMES];
    p.decay_frames = w[EP_DECAY_FRAMES];
    p.release_start_frames = w[EP_RELEASE_START_FRAMES];
    p.release_frames = w[EP_RELEASE_FRAMES];
    p.stop_after_frames = w[EP_STOP_AFTER_FRAMES];
    p.pitch_bend_mul = bits_f32(w[EP_PITCH_BEND_MUL]);
    p.pitch_bend_frames = w[EP_PITCH_BEND_FRAMES];
    p.filter_start_hz = bits_f32(w[EP_FILTER_START_HZ]);
    p.filter_peak_hz = bits_f32(w[EP_FILTER_PEAK_HZ]);
    p.filter_end_hz = bits_f32(w[EP_FILTER_END_HZ]);
    p.filter_attack_frames = w[EP_FILTER_ATTACK_FRAMES];
    p.filter_decay_frames = w[EP_FILTER_DECAY_FRAMES];
    p.filter_q = bits_f32(w[EP_FILTER_Q]);
    p.pre_drive_gain = bits_f32(w[EP_PRE_DRIVE_GAIN]);
    p.drive_amount = bits_f32(w[EP_DRIVE_AMOUNT]);
    p.body_freq_hz = bits_f32(w[EP_BODY_FREQ_HZ]);
    p.body_q = bits_f32(w[EP_BODY_Q]);
    p.body_gain = bits_f32(w[EP_BODY_GAIN]);
    p.delay_frames = w[EP_DELAY_FRAMES];
    p.delay_wet_gain = bits_f32(w[EP_DELAY_WET_GAIN]);
    p.delay_feedback = bits_f32(w[EP_DELAY_FEEDBACK]);
    p.normalization_gain = bits_f32(w[EP_NORMALIZATION_GAIN]);
    p.aux_route_mask = w[EP_AUX_ROUTE_MASK];
    return xen_entrophon_plan_submit(g_engine, w[REC_EPOCH], &p);
}

int xen_wasm_submit_record(const uint32_t* w, uint32_t nwords) {
    if (!g_engine || !w || nwords != XEN_WASM_RECORD_WORDS) return XEN_ERR_ARG;
    const uint32_t meta = w[REC_META];
    if (((meta >> 8) & 0xffu) != PROTOCOL_VERSION) return XEN_ERR_ARG;
    const uint32_t kind = meta & 0xffu;
    /* Host profiles are hard ownership boundaries, not merely output presets.
     * A wrong-kind record must fail closed instead of silently rendering a
     * migrated class through the other host. */
    if (g_profile == PROFILE_DIRECT && kind != KIND_TONE_PLAN) return XEN_ERR_ARG;
    if (g_profile == PROFILE_ENTROPHON && kind != KIND_ENTROPHON_PLAN) return XEN_ERR_ARG;
    if (kind == KIND_TONE_PLAN) return submit_tone(w);
    if (kind == KIND_ENTROPHON_PLAN) return submit_entrophon(w);
    return XEN_ERR_ARG;
}
int xen_wasm_submit_tone_record(const uint32_t* w, uint32_t nwords) {
    if (!w || nwords != XEN_WASM_RECORD_WORDS || (w[REC_META] & 0xffu) != KIND_TONE_PLAN) return XEN_ERR_ARG;
    return xen_wasm_submit_record(w, nwords);
}

int xen_wasm_render(uint32_t frames) {
    if (!g_engine || frames == 0u || frames > XEN_MAX_BLOCK) return XEN_ERR_ARG;
    for (uint32_t route=0; route<XEN_WASM_ENTROPHON_AUX_OUTPUTS; route++) {
        memset(g_out_aux[route], 0, frames * sizeof(float));
        g_engine->entrophon_aux_out[route] = g_profile == PROFILE_ENTROPHON ? g_out_aux[route] : 0;
    }
    xen_engine_render(g_engine, g_out_l, g_out_r, frames);
    for (uint32_t route=0; route<XEN_WASM_ENTROPHON_AUX_OUTPUTS; route++) g_engine->entrophon_aux_out[route] = 0;
    return XEN_OK;
}
