/* xen_xensonar.c — see header. Pure translation, no state of its own beyond
 * the engine handles it returns. Marked EXPERIMENTAL throughout. */
#include "xen/xen_xensonar.h"
#include <math.h>

static void pack_params(const xen_root_follow_params* p, double* out) {
    out[0] = p->window_ms;
    out[1] = p->step_ms;
    out[2] = p->microdensity;
    out[3] = p->pitch_spread;
    out[4] = p->gain;
    out[5] = p->source_jitter;
    out[6] = 0.0;
    out[7] = 0.0;
}

xen_id xsn_root_follow_create(xen_engine* e, xen_id material,
                              const xen_root_follow_params* p, uint64_t seed) {
    if (!e || !p) return 0;
    double par[XEN_PROGRAM_PARAMS];
    pack_params(p, par);
    return xen_program_create(e, xen_engine_epoch(e), XEN_PROGRAM_GRANULAR, material,
                              par, XEN_PROGRAM_PARAMS, seed);
}

int xsn_root_follow_update(xen_engine* e, xen_id prog, const xen_root_follow_params* p,
                           xen_frame at) {
    if (!e || !p) return XEN_ERR_ARG;
    double par[XEN_PROGRAM_PARAMS];
    pack_params(p, par);
    return xen_program_update(e, xen_engine_epoch(e), prog, par, XEN_PROGRAM_PARAMS, at);
}

int xsn_root_follow_set_root(xen_engine* e, double hz, xen_frame at) {
    return xen_state_set_at(e, xen_engine_epoch(e), XEN_STATE_ROOT_HZ, (float)hz, at);
}

xen_id xsn_wave_attack_resolved(xen_engine* e, const xen_wave_voice_spec* spec,
                                uint32_t token, uint32_t lead_frames) {
    if (!e || !spec || spec->resolved_hz <= 0.0) return 0;
    xen_gesture g = {0};
    g.kind = XEN_G_ATTACK;
    g.token = token;
    g.frame = xen_engine_now(e) + (xen_frame)lead_frames;
    g.p0 = (float)spec->resolved_hz;
    g.p1 = spec->velocity;
    g.p2 = spec->pan;
    g.pitch_mode = XEN_PITCH_HZ;
    return xen_gesture_submit(e, xen_engine_epoch(e), &g) == XEN_OK ? token : 0;
}

int xsn_key_down_resolved(xen_engine* e, const xen_wave_voice_spec* spec,
                          uint32_t token, uint32_t lead_frames) {
    if (!e || !spec || spec->resolved_hz <= 0.0) return XEN_ERR_ARG;
    xen_gesture g = {0};
    g.kind = XEN_G_SUSTAIN;
    g.token = token;
    g.frame = xen_engine_now(e) + (xen_frame)lead_frames;
    g.p0 = (float)spec->resolved_hz;
    g.p1 = spec->velocity;
    g.p2 = spec->pan;
    g.pitch_mode = XEN_PITCH_HZ;
    return xen_gesture_submit(e, xen_engine_epoch(e), &g);
}

int xsn_key_up(xen_engine* e, uint32_t token) {
    if (!e) return XEN_ERR_ARG;
    xen_gesture g = {0};
    g.kind = XEN_G_RELEASE;
    g.token = token;
    g.frame = XEN_FRAME_ASAP;   /* terminal commands are never scheduled late */
    return xen_gesture_submit(e, xen_engine_epoch(e), &g);
}

int xsn_forge_set(xen_engine* e, double amount, double tone, double space, xen_frame at) {
    uint32_t ep = xen_engine_epoch(e);
    int rc = xen_state_set_at(e, ep, XEN_STATE_FORGE_AMOUNT, (float)amount, at);
    if (rc == XEN_OK) rc = xen_state_set_at(e, ep, XEN_STATE_FORGE_TONE, (float)tone, at);
    if (rc == XEN_OK) rc = xen_state_set_at(e, ep, XEN_STATE_FORGE_SPACE, (float)space, at);
    return rc;
}

int xsn_master_gain(xen_engine* e, double gain, xen_frame at) {
    return xen_state_set_at(e, xen_engine_epoch(e), XEN_STATE_MASTER_GAIN, (float)gain, at);
}
