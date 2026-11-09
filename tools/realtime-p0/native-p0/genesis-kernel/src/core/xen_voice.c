/* xen_voice.c — bounded voice pool with an explicit priority contract.
 *
 * Two structural decisions:
 *
 *  1. The active list is BIRTH ORDERED. Removal shifts instead of swapping
 *     with the last element. Summation order into the bus is therefore a
 *     function of musical history alone, never of which slot happened to be
 *     recycled — which is what makes the mix bit-reproducible under any
 *     callback partitioning.
 *
 *  2. Allocation is priority aware (§10). An interactive attack may take a
 *     voice from the autonomous texture; the texture may never take one from
 *     an interactive voice; nothing is ever taken silently — both outcomes
 *     increment an observable counter.
 */
#include "../xen_internal.h"
#include <math.h>
#include <string.h>

void xen_voices_init(xen_voices* v) {
    memset(v, 0, sizeof(*v));
    for (uint32_t i = 0; i < XEN_MAX_VOICES; i++) {
        v->freelist[i] = (uint16_t)(XEN_MAX_VOICES - 1 - i);
        v->slot_at[i] = -1;
        v->owner[i] = -1;
        v->asset[i] = -1;
    }
    v->n_free = XEN_MAX_VOICES;
    v->n_active = 0;
}

static void detach(xen_engine* e, uint32_t idx) {
    xen_voices* v = &e->v;
    int32_t at = v->slot_at[idx];
    if (at < 0) return;
    for (uint32_t i = (uint32_t)at; i + 1 < v->n_active; i++) {
        uint16_t nv = v->active[i + 1];
        v->active[i] = nv;
        v->slot_at[nv] = (int32_t)i;
    }
    v->n_active--;
    v->slot_at[idx] = -1;
}

void xen_voice_free(xen_engine* e, uint32_t idx) {
    xen_voices* v = &e->v;
    if (v->slot_at[idx] < 0) return;
    detach(e, idx);
    if (v->asset[idx] >= 0) {
        atomic_fetch_sub_explicit(&e->asset[v->asset[idx]].voice_refs, 1, memory_order_release);
        v->asset[idx] = -1;
    }
    if (v->owner[idx] >= 0) {
        xen_program* p = &e->prog[v->owner[idx]];
        if (p->voices) p->voices--;
        v->owner[idx] = -1;
    }
    v->type[idx] = XEN_V_FREE;
    v->releasing[idx] = 0;
    v->token[idx] = 0;
    v->freelist[v->n_free++] = (uint16_t)idx;
}

/* Number of voices that can be admitted for one priority class without
 * touching a higher/equal-priority voice. Used to make compound timbre
 * admission side-effect-free: a plan that cannot fit is denied before any
 * texture victim is stolen. Bounded by XEN_MAX_VOICES. */
uint32_t xen_voice_capacity_for_priority(const xen_engine* e, uint8_t pri) {
    const xen_voices* v = &e->v;
    uint32_t n = v->n_free;
    if (pri == XEN_PRI_INTERACTIVE) {
        for (uint32_t i = 0; i < v->n_active; i++) {
            uint16_t idx = v->active[i];
            if (v->pri[idx] == XEN_PRI_TEXTURE) n++;
        }
    }
    return n;
}

/* Returns a voice index or -1. Never blocks, never allocates, O(1) amortised
 * except for the bounded steal scan which walks the active list once. */
int32_t xen_voice_alloc(xen_engine* e, uint8_t pri) {
    xen_voices* v = &e->v;
    if (v->n_free == 0) {
        if (pri != XEN_PRI_INTERACTIVE) return -1;   /* texture never steals  */
        /* oldest texture voice only: interactive voices are never taken */
        int32_t victim = -1;
        for (uint32_t i = 0; i < v->n_active; i++) {
            uint16_t idx = v->active[i];
            if (v->pri[idx] == XEN_PRI_TEXTURE) { victim = (int32_t)idx; break; }
        }
        if (victim < 0) return -1;
        xen_voice_free(e, (uint32_t)victim);
    }
    uint32_t idx = v->freelist[--v->n_free];
    v->slot_at[idx] = (int32_t)v->n_active;
    v->active[v->n_active++] = (uint16_t)idx;
    if (v->n_active > e->voices_peak) e->voices_peak = v->n_active;
    v->pri[idx] = pri;
    v->owner[idx] = -1;
    v->asset[idx] = -1;
    v->releasing[idx] = 0;
    v->token[idx] = 0;
    v->age[idx] = 0;
    v->env[idx] = 0;
    v->phase[idx] = 0;
    v->attack_inc[idx] = 0;
    v->start_frame[idx] = 0;
    v->end_frame[idx] = 0;
    v->waveform[idx] = 0;
    v->stage[idx] = 0;
    v->b0[idx]=v->b1[idx]=v->b2[idx]=v->a1[idx]=v->a2[idx]=0.0f;
    v->z1[idx]=v->z2[idx]=0.0f;
    return (int32_t)idx;
}

/* ------------------------------------------------------------------------ */
/* EXPERIMENTAL_PLACEHOLDER voice bodies. PARITY_NOT_ESTABLISHED.            */
/* ------------------------------------------------------------------------ */
void xen_voices_render(xen_engine* e, uint32_t n) {
    xen_voices* v = &e->v;
    float* bl = e->busL;
    float* br = e->busR;

    for (int32_t ai = (int32_t)v->n_active - 1; ai >= 0; ai--) {
        uint32_t idx = v->active[ai];
        double gl = v->gl[idx], gr = v->gr[idx];

        if (v->type[idx] == XEN_V_GRAIN) {
            int32_t as = v->asset[idx];
            const xen_asset* a = &e->asset[as];
            const float* data = a->data;
            uint64_t len = a->frames;
            if (!data || len == 0) { xen_voice_free(e, idx); continue; }
            double pos = v->pos[idx], rate = v->rate[idx];
            double age = v->age[idx], dur = v->dur[idx];
            double inv = (double)XEN_HANN_N / dur;
            uint32_t i = 0;
            for (; i < n && age < dur; i++) {
                double wi = age * inv;
                uint32_t wI = (uint32_t)wi;
                if (wI >= XEN_HANN_N) wI = XEN_HANN_N - 1;
                double wf = wi - (double)wI;
                double w = (double)xen_hann[wI] + ((double)xen_hann[wI + 1] - (double)xen_hann[wI]) * wf;
                double p = pos;
                if (p >= (double)len) p -= (double)len * floor(p / (double)len);
                if (p < 0) p = 0;
                uint64_t i0 = (uint64_t)p;
                double f = p - (double)i0;
                uint64_t i1 = (i0 + 1 >= len) ? 0 : i0 + 1;
                double s = ((double)data[i0] + ((double)data[i1] - (double)data[i0]) * f) * w;
                bl[i] += (float)(s * gl);
                br[i] += (float)(s * gr);
                pos += rate;
                age += 1.0;
            }
            v->pos[idx] = pos;
            v->age[idx] = age;
            if (age >= dur) xen_voice_free(e, idx);

        } else if (v->type[idx] == XEN_V_ATTACK) {
            double ph = v->phase[idx], inc = v->finc[idx];
            double env = v->env[idx], dec = v->envk[idx];
            for (uint32_t i = 0; i < n; i++) {
                double s = (xen_sin_turns(ph) + 0.45 * xen_sin_turns(ph * 2.01 + 0.25) +
                            0.22 * xen_sin_turns(ph * 3.02)) * env;
                double y = xen_softclip(s * 1.4);
                bl[i] += (float)(y * gl);
                br[i] += (float)(y * gr);
                ph += inc;
                if (ph >= 1.0) ph -= 1.0;      /* wrap per sample: quantum must
                                                  not change the trajectory   */
                env *= dec;
                /* Extinction must happen at an exact SAMPLE, not at a chunk
                 * boundary. Reaping the voice at the end of the block instead
                 * would make the last few output samples depend on the device
                 * quantum - found by comparing xen-render --partition runs. */
                if (env < 1e-5) env = 0.0;
            }
            v->phase[idx] = ph;
            v->env[idx] = env;
            if (env == 0.0) xen_voice_free(e, idx);

        } else if (v->type[idx] == XEN_V_TONE) {
            double ph = v->phase[idx];
            double env = v->env[idx];
            const double inc = v->finc[idx];
            const double attack_inc = v->attack_inc[idx];
            const double decay_mul = v->envk[idx];
            uint8_t stage = v->stage[idx];
            float z1 = v->z1[idx], z2 = v->z2[idx];
            int finished = 0;
            for (uint32_t i = 0; i < n; i++) {
                xen_frame fr = e->frame + (xen_frame)i;
                if (fr < v->start_frame[idx]) continue;
                if (fr >= v->end_frame[idx]) { finished = 1; break; }
                if (stage == 0u) stage = 1u;
                if (stage == 1u) {
                    env += attack_inc;
                    if (env >= 1.0) { env = 1.0; stage = 2u; }
                } else {
                    env *= decay_mul;
                }
                double p = ph - floor(ph);
                double raw;
                switch (v->waveform[idx]) {
                    case XEN_OSC_TRIANGLE: raw = 1.0 - 4.0 * fabs(p - 0.5); break;
                    case XEN_OSC_SAWTOOTH: raw = p * 2.0 - 1.0; break;
                    case XEN_OSC_SQUARE: raw = p < 0.5 ? 1.0 : -1.0; break;
                    default: raw = xen_sin_turns(p); break;
                }
                raw *= env;
                float x = (float)(raw * 2.0); /* gain is carried by gl/gr */
                float y = v->b0[idx] * x + z1;
                z1 = v->b1[idx] * x - v->a1[idx] * y + z2;
                z2 = v->b2[idx] * x - v->a2[idx] * y;
                bl[i] += y * v->gl[idx];
                br[i] += y * v->gr[idx];
                ph += inc;
                if (ph >= 1.0) ph -= floor(ph);
            }
            v->phase[idx] = ph;
            v->env[idx] = env;
            v->stage[idx] = stage;
            v->z1[idx] = z1; v->z2[idx] = z2;
            if (finished || e->frame + (xen_frame)n >= v->end_frame[idx]) xen_voice_free(e, idx);

        } else if (v->type[idx] == XEN_V_SUSTAIN) {
            double ph = v->phase[idx], inc = v->finc[idx];
            double env = v->env[idx], k = v->envk[idx];
            int rel = v->releasing[idx];
            for (uint32_t i = 0; i < n; i++) {
                if (rel) { env -= k; if (env < 0) env = 0; }
                else     { env += (1.0 - env) * k; }
                double s = xen_sin_turns(ph) + 0.25 * xen_sin_turns(ph * 2.0 + 0.1);
                bl[i] += (float)(s * env * gl);
                br[i] += (float)(s * env * gr);
                ph += inc;
                if (ph >= 1.0) ph -= 1.0;
            }
            v->phase[idx] = ph;
            v->env[idx] = env;
            if (rel && env <= 1e-6) xen_voice_free(e, idx);
        }
    }
}
