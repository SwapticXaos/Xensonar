/* xen_entrophon.c — bounded realtime renderer for the resolved Wave Entrophon class.
 *
 * Musical policy is resolved on the browser/control side. This file owns only
 * execution: oscillator generation, envelope, bend, two filters, waveshaping
 * and the per-body feedback delay. No allocation, locks, IO or graph mutation
 * occurs in xen_entrophon_render().
 */
#include "../xen_internal.h"
#include <math.h>

static inline double clampd(double x, double lo, double hi) {
    return x < lo ? lo : (x > hi ? hi : x);
}

static inline double osc_sample(uint8_t waveform, double phase) {
    double p = phase - floor(phase);
    switch (waveform) {
        case XEN_OSC_TRIANGLE: return 1.0 - 4.0 * fabs(p - 0.5);
        case XEN_OSC_SAWTOOTH: return p * 2.0 - 1.0;
        case XEN_OSC_SQUARE: return p < 0.5 ? 1.0 : -1.0;
        default: return xen_sin_turns(p);
    }
}

static inline float biquad_tick(const xen_biquad_coeff* c, float x, float* z1, float* z2) {
    float y = c->b0 * x + *z1;
    *z1 = c->b1 * x - c->a1 * y + *z2;
    *z2 = c->b2 * x - c->a2 * y;
    return y;
}

static inline xen_biquad_coeff coeff_lerp(const xen_biquad_coeff* a, const xen_biquad_coeff* b, float t) {
    xen_biquad_coeff c;
    c.b0 = a->b0 + (b->b0-a->b0)*t;
    c.b1 = a->b1 + (b->b1-a->b1)*t;
    c.b2 = a->b2 + (b->b2-a->b2)*t;
    c.a1 = a->a1 + (b->a1-a->a1)*t;
    c.a2 = a->a2 + (b->a2-a->a2)*t;
    return c;
}

static inline float env_before_release(const xen_entrophon_body* b, uint32_t age) {
    if (b->attack_frames && age < b->attack_frames)
        return b->peak_gain * ((float)(age + 1u) / (float)b->attack_frames);
    const uint32_t decay_start = b->attack_frames;
    const uint32_t decay_end = decay_start + b->decay_frames;
    if (b->decay_frames && age < decay_end) {
        float t = (float)(age - decay_start) / (float)b->decay_frames;
        return b->peak_gain + (b->sustain_gain - b->peak_gain) * t;
    }
    return b->sustain_gain;
}

static inline float drive_sample(float x, float amount) {
    /* WebAudio used a precomputed tanh curve. This bounded rational version has
     * the same control law (k=amount*18+1) but avoids transcendental work in RT. */
    double in = clampd((double)x, -1.0, 1.0);
    double k = clampd((double)amount, 0.0, 8.0) * 18.0 + 1.0;
    double z = clampd(in * k, -3.0, 3.0);
    double y = xen_softclip(z) * (1.0 - 0.06 * fabs(in));
    return (float)y;
}

int xen_entrophon_rt_admit(xen_engine* e, uint32_t token, xen_frame frame, const xen_entrophon_rt* p) {
    if (!e || !p) return XEN_ERR_ARG;
    uint32_t slot = XEN_ENTROPHON_BODIES;
    for (uint32_t i=0; i<XEN_ENTROPHON_BODIES; i++) {
        if (!e->entrophon.body[i].active) { slot=i; break; }
    }
    if (slot == XEN_ENTROPHON_BODIES) return XEN_ERR_NO_SLOT;

    xen_entrophon_body* b = &e->entrophon.body[slot];
    b->active = 1u;
    b->waveform = p->waveform;
    b->token = token;
    b->aux_route_mask = p->aux_route_mask;
    b->start_frame = frame;
    b->age = 0u;
    b->base_count = p->base_count;
    b->color_count = p->color_count;
    for (uint32_t i=0; i<XEN_ENTROPHON_BASE_MAX + XEN_ENTROPHON_COLOR_MAX; i++) {
        b->phase[i] = 0.0;
        b->inc[i] = 0.0;
    }
    for (uint32_t i=0; i<p->base_count; i++) b->inc[i] = p->base_inc[i];
    for (uint32_t i=0; i<p->color_count; i++) {
        b->inc[XEN_ENTROPHON_BASE_MAX+i] = p->color_inc[i];
        b->color_gain[i] = p->color_gain[i];
    }
    b->peak_gain = p->peak_gain;
    b->sustain_gain = p->sustain_gain;
    b->attack_frames = p->attack_frames;
    b->decay_frames = p->decay_frames;
    b->release_start_frames = p->release_start_frames;
    b->release_frames = p->release_frames;
    b->stop_after_frames = p->stop_after_frames;
    b->release_start_gain = env_before_release(b, p->release_start_frames);
    if (b->release_start_gain < 0.0001f) b->release_start_gain = 0.0001f;
    b->release_mul = p->release_frames
        ? (float)pow(0.0001 / (double)b->release_start_gain, 1.0 / (double)p->release_frames)
        : 0.0f;
    b->env = 0.0f;
    b->bend_step = p->bend_step;
    b->bend_remaining = p->bend_frames;
    b->filter_start = p->filter_start;
    b->filter_peak = p->filter_peak;
    b->filter_end = p->filter_end;
    b->filter_attack_frames = p->filter_attack_frames;
    b->filter_decay_frames = p->filter_decay_frames;
    b->filter_z1 = b->filter_z2 = 0.0f;
    b->pre_drive_gain = p->pre_drive_gain;
    b->drive_amount = p->drive_amount;
    b->body_filter = p->body_filter;
    b->body_z1 = b->body_z2 = 0.0f;
    b->body_gain = p->body_gain;
    b->delay_frames = p->delay_frames;
    b->delay_wet_gain = p->delay_wet_gain;
    b->delay_feedback = p->delay_feedback;
    b->normalization_gain = p->normalization_gain;
    b->delay_w = 0u;
    b->delay_generation++;
    if (!b->delay_generation) b->delay_generation = 1u;
    e->entrophon.active_count++;
    if (e->entrophon.active_count > e->entrophon.peak_count)
        e->entrophon.peak_count = e->entrophon.active_count;
    return XEN_OK;
}

void xen_entrophon_panic(xen_engine* e) {
    if (!e) return;
    for (uint32_t i=0; i<XEN_ENTROPHON_BODIES; i++) e->entrophon.body[i].active = 0u;
    e->entrophon.active_count = 0u;
}

void xen_entrophon_render(xen_engine* e, uint32_t n) {
    if (!e || !n || !e->entrophon.active_count) return;
    for (uint32_t bi=0; bi<XEN_ENTROPHON_BODIES; bi++) {
        xen_entrophon_body* b = &e->entrophon.body[bi];
        if (!b->active) continue;
        uint32_t age = b->age;
        float env = b->env;
        int finished = 0;

        for (uint32_t i=0; i<n; i++) {
            xen_frame fr = e->frame + (xen_frame)i;
            if (fr < b->start_frame) continue;
            if (age >= b->stop_after_frames) { finished=1; break; }

            if (age < b->release_start_frames) {
                env = env_before_release(b, age);
            } else if (age == b->release_start_frames) {
                env = b->release_start_gain;
            } else if (age < b->release_start_frames + b->release_frames) {
                env *= b->release_mul;
            } else {
                env = 0.0f;
            }

            double mix = 0.0;
            for (uint32_t o=0; o<b->base_count; o++) {
                mix += osc_sample(b->waveform, b->phase[o]);
                b->phase[o] += b->inc[o];
                if (b->phase[o] >= 1.0) b->phase[o] -= floor(b->phase[o]);
            }
            for (uint32_t o=0; o<b->color_count; o++) {
                uint32_t j = XEN_ENTROPHON_BASE_MAX + o;
                mix += osc_sample(XEN_OSC_SQUARE, b->phase[j]) * (double)b->color_gain[o];
                b->phase[j] += b->inc[j];
                if (b->phase[j] >= 1.0) b->phase[j] -= floor(b->phase[j]);
            }
            mix *= (double)b->normalization_gain;

            if (b->bend_remaining) {
                for (uint32_t o=0; o<b->base_count; o++) b->inc[o] *= b->bend_step;
                for (uint32_t o=0; o<b->color_count; o++) b->inc[XEN_ENTROPHON_BASE_MAX+o] *= b->bend_step;
                b->bend_remaining--;
            }

            xen_biquad_coeff fc;
            if (b->filter_attack_frames && age < b->filter_attack_frames) {
                float t = (float)age / (float)b->filter_attack_frames;
                fc = coeff_lerp(&b->filter_start, &b->filter_peak, t);
            } else if (b->filter_decay_frames > b->filter_attack_frames && age < b->filter_decay_frames) {
                float t = (float)(age - b->filter_attack_frames) /
                          (float)(b->filter_decay_frames - b->filter_attack_frames);
                fc = coeff_lerp(&b->filter_peak, &b->filter_end, t);
            } else {
                fc = b->filter_end;
            }

            float driven = drive_sample((float)(mix * b->pre_drive_gain), b->drive_amount);
            float filtered = biquad_tick(&fc, driven, &b->filter_z1, &b->filter_z2);
            float body = biquad_tick(&b->body_filter, (float)mix, &b->body_z1, &b->body_z2) * b->body_gain;
            float direct = (filtered + body) * env;
            float delayed = 0.0f;
            if (b->delay_frames) {
                uint32_t r = (b->delay_w + XEN_ENTROPHON_DELAY_MAX - b->delay_frames) % XEN_ENTROPHON_DELAY_MAX;
                if (b->delay_tag[r] == b->delay_generation) delayed = b->delay[r];
                b->delay[b->delay_w] = direct + delayed * b->delay_feedback;
                b->delay_tag[b->delay_w] = b->delay_generation;
                b->delay_w = (b->delay_w + 1u) % XEN_ENTROPHON_DELAY_MAX;
            }
            float y = direct + delayed * b->delay_wet_gain;
            e->busL[i] += y;
            e->busR[i] += y;
            if (b->aux_route_mask) {
                const uint32_t oi = e->entrophon_aux_offset + i;
                for (uint32_t route=0; route<6u; route++) {
                    float* out = e->entrophon_aux_out[route];
                    if (out && (b->aux_route_mask & (1u << route))) out[oi] += direct;
                }
            }
            age++;
        }
        b->age = age;
        b->env = env;
        if (finished || age >= b->stop_after_frames) {
            b->active = 0u;
            if (e->entrophon.active_count) e->entrophon.active_count--;
        }
    }
}
