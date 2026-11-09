/* xen_command.c — the control -> realtime boundary.
 *
 * ONE ring carries every timed command: gestures, timed state, program
 * activate/update/destroy, panic. One ring means one total order, and a total
 * order plus a (frame, seq) sort is the whole determinism story.
 *
 * Three distinct times are kept apart deliberately:
 *   arrival time      - when the control thread called submit. Never musical.
 *   effective frame   - cmd.frame. The musical time. Survives every boundary.
 *   callback boundary - the frames argument of xen_engine_render. Irrelevant.
 */
#include "../xen_internal.h"
#include <string.h>
#include <math.h>

/* ------------------------------------------------------------------ ring */
int xen_ring_push(xen_engine* e, const xen_cmd* c) {
    uint32_t h = atomic_load_explicit(&e->ring.head, memory_order_relaxed);
    uint32_t t = atomic_load_explicit(&e->ring.tail, memory_order_acquire);
    if (h - t >= XEN_CMD_RING_CAP) return XEN_ERR_QUEUE_FULL;
    e->ring.buf[h & (XEN_CMD_RING_CAP - 1u)] = *c;
    atomic_store_explicit(&e->ring.head, h + 1u, memory_order_release);
    return XEN_OK;
}

int xen_ring_pop(xen_engine* e, xen_cmd* out) {
    uint32_t t = atomic_load_explicit(&e->ring.tail, memory_order_relaxed);
    uint32_t h = atomic_load_explicit(&e->ring.head, memory_order_acquire);
    if (t == h) return 0;
    *out = e->ring.buf[t & (XEN_CMD_RING_CAP - 1u)];
    atomic_store_explicit(&e->ring.tail, t + 1u, memory_order_release);
    return 1;
}

/* ------------------------------------------------------------- scheduler */
/* Fixed-capacity min-heap ordered by (frame, seq).
 *
 * The previous sorted-array insertion had an O(N^2) adversarial admission
 * cost when a full batch arrived in reverse frame order. A binary heap keeps
 * each accepted insertion O(log XEN_SCHED_CAP), with no allocation and the
 * same deterministic total order. */
static int earlier_than(const xen_cmd* a, const xen_cmd* b) {
    if (a->frame != b->frame) return a->frame < b->frame;
    return a->seq < b->seq;
}

void xen_sched_insert(xen_engine* e, const xen_cmd* c) {
    if (e->sched_count >= XEN_SCHED_CAP) {
        XEN_INC(e, dropped_sched_full);
        return;
    }
    uint32_t i = e->sched_count++;
    e->sched[i] = *c;
    while (i > 0) {
        uint32_t parent = (i - 1u) >> 1u;
        if (!earlier_than(&e->sched[i], &e->sched[parent])) break;
        xen_cmd tmp = e->sched[parent];
        e->sched[parent] = e->sched[i];
        e->sched[i] = tmp;
        i = parent;
    }
    if (e->sched_count > e->sched_peak) e->sched_peak = e->sched_count;
}

int xen_sched_pop_min(xen_engine* e, xen_cmd* out) {
    if (!e->sched_count) return 0;
    *out = e->sched[0];
    uint32_t n = --e->sched_count;
    if (!n) return 1;
    e->sched[0] = e->sched[n];
    uint32_t i = 0;
    for (;;) {
        uint32_t l = i * 2u + 1u;
        if (l >= n) break;
        uint32_t r = l + 1u;
        uint32_t m = (r < n && earlier_than(&e->sched[r], &e->sched[l])) ? r : l;
        if (!earlier_than(&e->sched[m], &e->sched[i])) break;
        xen_cmd tmp = e->sched[i];
        e->sched[i] = e->sched[m];
        e->sched[m] = tmp;
        i = m;
    }
    return 1;
}

/* --------------------------------------------------- realtime-side drain */
/* Panic is deliberately NOT a command-ring item. xen_engine_panic() publishes
 * a terminal epoch fence through panic_epoch; xen_engine_render() applies that
 * fence before draining this SPSC ring. Therefore the control producer never
 * consumes the ring and a full ordinary queue can never defeat Panic. */
void xen_rt_drain(xen_engine* e) {
    xen_cmd c;
    while (xen_ring_pop(e, &c)) {
        /* A Panic may be published concurrently after xen_engine_render() did
         * its initial fence check. Observe it before classifying the command,
         * otherwise a valid new-epoch command could be accepted by control and
         * then dropped here under the previous RT epoch. */
        uint32_t pe = atomic_load_explicit(&e->panic_epoch, memory_order_acquire);
        if (pe != e->rt_epoch) xen_rt_panic(e, pe);
        if (c.epoch != e->rt_epoch) { XEN_INC(e, dropped_epoch); continue; }

        if (c.frame == XEN_FRAME_ASAP) c.frame = e->frame;

        if (c.frame < e->frame) {
            int interactive_attack =
                (c.kind == XEN_CMD_GESTURE && c.a != XEN_G_RELEASE) ||
                c.kind == XEN_CMD_ENTROPHON_PLAN;
            if (interactive_attack) {
                if (e->cfg.lateness_policy == XEN_LATE_DROP ||
                    (e->frame - c.frame) > (xen_frame)e->cfg.lateness_tolerance_frames) {
                    XEN_INC(e, dropped_stale);
                    continue;
                }
                c.frame = e->frame;   /* XEN_LATE_CLAMP, explicit opt-in only */
            } else {
                /* Releases, timed state and program lifecycle converge at the
                 * current frame rather than being silently lost. */
                c.frame = e->frame;
            }
        }
        xen_sched_insert(e, &c);
    }
}

/* ------------------------------------------------- control-side handles */
static int resolve_program(xen_engine* e, uint32_t epoch, xen_id id, uint32_t* slot) {
    if (epoch != atomic_load_explicit(&e->epoch, memory_order_acquire)) return XEN_ERR_EPOCH;
    if (xen_h_epoch(id) != (epoch & 0xFFFFu)) return XEN_ERR_HANDLE;
    uint32_t s = xen_h_slot(id);
    if (id == 0 || s >= XEN_MAX_PROGRAMS) return XEN_ERR_HANDLE;
    xen_program* p = &e->prog[s];
    uint32_t st = atomic_load_explicit(&p->state, memory_order_acquire);
    if (st != XEN_P_ARMED && st != XEN_P_LIVE) return XEN_ERR_HANDLE;
    if (p->gen != xen_h_gen(id) || p->epoch != epoch) return XEN_ERR_HANDLE;
    *slot = s;
    return XEN_OK;
}

int xen_rt_resolve_program(xen_engine* e, const xen_cmd* c, uint32_t* slot) {
    uint32_t s = xen_h_slot(c->id);
    if (c->id == 0 || s >= XEN_MAX_PROGRAMS) return XEN_ERR_HANDLE;
    xen_program* p = &e->prog[s];
    uint32_t st = atomic_load_explicit(&p->state, memory_order_acquire);
    if (st != XEN_P_ARMED && st != XEN_P_LIVE) return XEN_ERR_HANDLE;
    if (p->gen != xen_h_gen(c->id)) return XEN_ERR_HANDLE;
    if (p->epoch != c->epoch || p->epoch != e->rt_epoch) return XEN_ERR_HANDLE;
    *slot = s;
    return XEN_OK;
}

/* =========================================================== public api */
int xen_gesture_submit(xen_engine* e, uint32_t epoch, const xen_gesture* g) {
    if (!e || !g) return XEN_ERR_ARG;
    XEN_INC(e, gestures_submitted);
    if (epoch != atomic_load_explicit(&e->epoch, memory_order_acquire)) {
        XEN_INC(e, dropped_epoch);
        return XEN_ERR_EPOCH;
    }
    if (g->kind > XEN_G_RELEASE) return XEN_ERR_ARG;

    /* Early lateness rejection so the caller learns synchronously. pub_now is
     * a lower bound on the realtime frame, so this is conservative; the drain
     * applies the same policy authoritatively. RELEASE is exempt. */
    if (g->kind != XEN_G_RELEASE && g->frame != XEN_FRAME_ASAP) {
        xen_frame now = atomic_load_explicit(&e->pub_now, memory_order_acquire);
        if (g->frame < now) {
            if (e->cfg.lateness_policy == XEN_LATE_DROP ||
                (now - g->frame) > (xen_frame)e->cfg.lateness_tolerance_frames) {
                XEN_INC(e, dropped_stale);
                return XEN_ERR_STALE;
            }
        }
    }

    xen_cmd c;
    memset(&c, 0, sizeof c);
    c.kind  = XEN_CMD_GESTURE;
    c.epoch = epoch;
    c.frame = g->frame;
    c.a     = g->kind;
    c.b     = g->pitch_mode;
    c.token = g->token;
    c.f0    = g->p0;
    c.f1    = g->p1;
    c.f2    = g->p2;
    c.seq   = atomic_fetch_add_explicit(&e->seq, 1, memory_order_relaxed);
    int rc = xen_ring_push(e, &c);
    if (rc != XEN_OK) XEN_INC(e, dropped_queue_full);
    return rc;
}

static int tone_filter(float cutoff, float q, double sr, xen_tone_rt* out) {
    if (!(cutoff > 0.0f) || !isfinite(cutoff) || !isfinite(q) || !(sr > 0.0)) return XEN_ERR_ARG;
    if (cutoff < 40.0f) cutoff = 40.0f;
    if (cutoff > (float)sr * 0.45f) cutoff = (float)sr * 0.45f;
    if (q < 0.35f) q = 0.35f;
    if (q > 6.0f) q = 6.0f;
    const double w = 6.28318530717958647692 * (double)cutoff / sr;
    const double c = cos(w), sn = sin(w), alpha = sn / (2.0 * (double)q);
    const double a0 = 1.0 + alpha;
    out->b0 = (float)(((1.0 - c) * 0.5) / a0);
    out->b1 = (float)((1.0 - c) / a0);
    out->b2 = out->b0;
    out->a1 = (float)((-2.0 * c) / a0);
    out->a2 = (float)((1.0 - alpha) / a0);
    return XEN_OK;
}

int xen_tone_plan_submit(xen_engine* e, uint32_t epoch, const xen_tone_plan* plan) {
    if (!e || !plan || plan->tone_count == 0 || plan->tone_count > XEN_TONE_PLAN_MAX) return XEN_ERR_ARG;
    XEN_INC(e, tone_plans_submitted);
    if (epoch != atomic_load_explicit(&e->epoch, memory_order_acquire)) {
        XEN_INC(e, dropped_epoch);
        return XEN_ERR_EPOCH;
    }
    xen_frame at = plan->frame;
    if (at == XEN_FRAME_ASAP) at = atomic_load_explicit(&e->pub_now, memory_order_acquire);
    xen_frame now = atomic_load_explicit(&e->pub_now, memory_order_acquire);
    if (at < now) {
        if (e->cfg.lateness_policy == XEN_LATE_DROP ||
            (now - at) > (xen_frame)e->cfg.lateness_tolerance_frames) {
            XEN_INC(e, dropped_stale);
            return XEN_ERR_STALE;
        }
        at = now;
    }

    xen_cmd c;
    memset(&c, 0, sizeof c);
    c.kind = XEN_CMD_TONE_PLAN;
    c.epoch = epoch;
    c.frame = at;
    c.token = plan->token;
    c.tone_count = plan->tone_count;
    c.seq = atomic_fetch_add_explicit(&e->seq, 1, memory_order_relaxed);

    for (uint32_t i = 0; i < plan->tone_count; i++) {
        const xen_tone_desc* in = &plan->tones[i];
        xen_tone_rt* out = &c.tones[i];
        const uint64_t max_delay_frames = (uint64_t)llround(0.5 * e->sr);
        const uint64_t max_duration_frames = (uint64_t)llround(8.0 * e->sr);
        if (!(in->frequency_hz > 0.0f) || !isfinite(in->frequency_hz) ||
            !(in->gain > 0.0f) || !isfinite(in->gain) ||
            in->delay_frames > max_delay_frames ||
            in->duration_frames < 2u || in->duration_frames > max_duration_frames ||
            in->waveform > XEN_OSC_SQUARE) return XEN_ERR_ARG;
        out->delay_frames = in->delay_frames;
        out->duration_frames = in->duration_frames;
        out->phase_inc = in->frequency_hz / (float)e->sr;
        out->gain = in->gain;
        uint32_t attack_frames = (uint32_t)llround(0.004 * e->sr);
        if (attack_frames < 1u) attack_frames = 1u;
        if (attack_frames > in->duration_frames / 3u) attack_frames = in->duration_frames / 3u;
        if (attack_frames < 1u) attack_frames = 1u;
        uint32_t decay_frames = in->duration_frames > attack_frames ? in->duration_frames - attack_frames : 1u;
        out->attack_inc = 1.0f / (float)attack_frames;
        out->decay_mul = (float)pow(0.001, 1.0 / (double)decay_frames);
        out->waveform = (uint8_t)in->waveform;
        int rc = tone_filter(in->cutoff_hz, in->resonance, e->sr, out);
        if (rc != XEN_OK) return rc;
    }
    int rc = xen_ring_push(e, &c);
    if (rc != XEN_OK) XEN_INC(e, dropped_queue_full);
    return rc;
}

static int entrophon_biquad(uint32_t type, float cutoff, float q, double sr, xen_biquad_coeff* out) {
    if (!out || !(cutoff > 0.0f) || !isfinite(cutoff) || !isfinite(q) || !(sr > 0.0)) return XEN_ERR_ARG;
    if (type > XEN_FILTER_NOTCH) return XEN_ERR_ARG;
    if (cutoff < 40.0f) cutoff = 40.0f;
    if (cutoff > (float)sr * 0.45f) cutoff = (float)sr * 0.45f;
    if (q < 0.1f) q = 0.1f;
    if (q > 26.0f) q = 26.0f;
    const double w = 6.28318530717958647692 * (double)cutoff / sr;
    const double c = cos(w), sn = sin(w), alpha = sn / (2.0 * (double)q);
    const double a0 = 1.0 + alpha;
    double b0,b1,b2;
    switch (type) {
        case XEN_FILTER_HIGHPASS:
            b0=(1.0+c)*0.5; b1=-(1.0+c); b2=b0; break;
        case XEN_FILTER_BANDPASS:
            b0=alpha; b1=0.0; b2=-alpha; break;
        case XEN_FILTER_NOTCH:
            b0=1.0; b1=-2.0*c; b2=1.0; break;
        default:
            b0=(1.0-c)*0.5; b1=1.0-c; b2=b0; break;
    }
    out->b0=(float)(b0/a0); out->b1=(float)(b1/a0); out->b2=(float)(b2/a0);
    out->a1=(float)((-2.0*c)/a0); out->a2=(float)((1.0-alpha)/a0);
    return XEN_OK;
}

int xen_entrophon_plan_submit(xen_engine* e, uint32_t epoch, const xen_entrophon_plan* p) {
    if (!e || !p || p->base_count == 0u || p->base_count > XEN_ENTROPHON_BASE_MAX ||
        p->color_count > XEN_ENTROPHON_COLOR_MAX || p->waveform > XEN_OSC_SQUARE ||
        p->filter_type > XEN_FILTER_NOTCH || (p->aux_route_mask & ~0x3fu)) return XEN_ERR_ARG;
    XEN_INC(e, entrophon_plans_submitted);
    if (epoch != atomic_load_explicit(&e->epoch, memory_order_acquire)) {
        XEN_INC(e, dropped_epoch); return XEN_ERR_EPOCH;
    }
    xen_frame at = p->frame;
    if (at == XEN_FRAME_ASAP) at = atomic_load_explicit(&e->pub_now, memory_order_acquire);
    xen_frame now = atomic_load_explicit(&e->pub_now, memory_order_acquire);
    if (at < now) {
        if (e->cfg.lateness_policy == XEN_LATE_DROP ||
            (now-at) > (xen_frame)e->cfg.lateness_tolerance_frames) {
            XEN_INC(e, dropped_stale); return XEN_ERR_STALE;
        }
        at = now;
    }

    const uint64_t max_frames = (uint64_t)llround(8.0 * e->sr);
    if (!(p->peak_gain > 0.0f) || !isfinite(p->peak_gain) ||
        !(p->sustain_gain >= 0.0f) || !isfinite(p->sustain_gain) ||
        p->attack_frames < 1u || p->attack_frames > max_frames ||
        p->decay_frames > max_frames || p->release_start_frames > max_frames ||
        p->release_frames < 1u || p->release_frames > max_frames ||
        p->stop_after_frames < 2u || p->stop_after_frames > max_frames ||
        p->release_start_frames >= p->stop_after_frames ||
        !(p->pitch_bend_mul > 0.0f) || !isfinite(p->pitch_bend_mul) ||
        p->pitch_bend_frames > max_frames ||
        !(p->filter_q > 0.0f) || !isfinite(p->filter_q) ||
        !isfinite(p->pre_drive_gain) || !isfinite(p->drive_amount) ||
        !(p->body_freq_hz > 0.0f) || !isfinite(p->body_freq_hz) ||
        !(p->body_q > 0.0f) || !isfinite(p->body_q) || !isfinite(p->body_gain) ||
        p->delay_frames >= XEN_ENTROPHON_DELAY_MAX ||
        !isfinite(p->delay_wet_gain) || !isfinite(p->delay_feedback) ||
        !(p->normalization_gain > 0.0f) || !isfinite(p->normalization_gain)) return XEN_ERR_ARG;

    xen_cmd c; memset(&c,0,sizeof c);
    c.kind=XEN_CMD_ENTROPHON_PLAN; c.epoch=epoch; c.frame=at; c.token=p->token;
    c.seq=atomic_fetch_add_explicit(&e->seq,1,memory_order_relaxed);
    xen_entrophon_rt* r=&c.entrophon;
    r->base_count=p->base_count; r->color_count=p->color_count;
    r->aux_route_mask=p->aux_route_mask;
    r->waveform=(uint8_t)p->waveform; r->filter_type=(uint8_t)p->filter_type;
    for(uint32_t i=0;i<p->base_count;i++) {
        if (!(p->base_freqs[i]>0.0f) || !isfinite(p->base_freqs[i])) return XEN_ERR_ARG;
        r->base_inc[i]=p->base_freqs[i]/(float)e->sr;
    }
    for(uint32_t i=0;i<p->color_count;i++) {
        if (!(p->color_freqs[i]>0.0f) || !isfinite(p->color_freqs[i]) || !isfinite(p->color_gains[i])) return XEN_ERR_ARG;
        r->color_inc[i]=p->color_freqs[i]/(float)e->sr; r->color_gain[i]=p->color_gains[i];
    }
    r->peak_gain=p->peak_gain; r->sustain_gain=p->sustain_gain;
    r->attack_frames=p->attack_frames; r->decay_frames=p->decay_frames;
    r->release_start_frames=p->release_start_frames; r->release_frames=p->release_frames;
    r->stop_after_frames=p->stop_after_frames;
    r->bend_frames=p->pitch_bend_frames;
    r->bend_step=p->pitch_bend_frames ? (float)pow((double)p->pitch_bend_mul,1.0/(double)p->pitch_bend_frames) : 1.0f;
    if (entrophon_biquad(p->filter_type,p->filter_start_hz,p->filter_q,e->sr,&r->filter_start)!=XEN_OK ||
        entrophon_biquad(p->filter_type,p->filter_peak_hz,p->filter_q,e->sr,&r->filter_peak)!=XEN_OK ||
        entrophon_biquad(p->filter_type,p->filter_end_hz,p->filter_q,e->sr,&r->filter_end)!=XEN_OK ||
        entrophon_biquad(XEN_FILTER_BANDPASS,p->body_freq_hz,p->body_q,e->sr,&r->body_filter)!=XEN_OK) return XEN_ERR_ARG;
    r->filter_attack_frames=p->filter_attack_frames; r->filter_decay_frames=p->filter_decay_frames;
    r->pre_drive_gain=p->pre_drive_gain; r->drive_amount=p->drive_amount;
    r->body_gain=p->body_gain; r->delay_frames=p->delay_frames;
    r->delay_wet_gain=p->delay_wet_gain; r->delay_feedback=p->delay_feedback;
    r->normalization_gain=p->normalization_gain;
    int rc=xen_ring_push(e,&c); if(rc!=XEN_OK) XEN_INC(e,dropped_queue_full); return rc;
}


int xen_state_set_at(xen_engine* e, uint32_t epoch, uint32_t slot, float value, xen_frame at) {
    if (!e || slot >= XEN_STATE_SLOTS) return XEN_ERR_ARG;
    if (epoch != atomic_load_explicit(&e->epoch, memory_order_acquire)) {
        XEN_INC(e, dropped_epoch);
        return XEN_ERR_EPOCH;
    }
    XEN_INC(e, state_writes);
    xen_cmd c;
    memset(&c, 0, sizeof c);
    c.kind  = XEN_CMD_STATE;
    c.epoch = epoch;
    c.frame = at;
    c.a     = slot;
    c.f0    = value;
    c.seq   = atomic_fetch_add_explicit(&e->seq, 1, memory_order_relaxed);
    int rc = xen_ring_push(e, &c);
    if (rc != XEN_OK) XEN_INC(e, dropped_queue_full);
    return rc;
}

int xen_state_set_latest(xen_engine* e, uint32_t epoch, uint32_t slot, float value) {
    if (!e || slot >= XEN_STATE_SLOTS) return XEN_ERR_ARG;
    if (epoch != atomic_load_explicit(&e->epoch, memory_order_acquire)) {
        XEN_INC(e, dropped_epoch);
        return XEN_ERR_EPOCH;
    }
    XEN_INC(e, state_writes);
    atomic_store_explicit(&e->mail[slot], value, memory_order_relaxed);
    atomic_fetch_or_explicit(&e->mail_dirty, 1u << slot, memory_order_release);
    return XEN_OK;
}

float xen_state_get(const xen_engine* e, uint32_t slot) {
    return (e && slot < XEN_STATE_SLOTS) ? e->state[slot] : 0.0f;
}

/* ------------------------------------------------------------- programs */
xen_id xen_program_create(xen_engine* e, uint32_t epoch, uint32_t kind, xen_id asset,
                          const double* params, uint32_t n_params, uint64_t seed) {
    if (!e || kind != XEN_PROGRAM_GRANULAR) return 0;
    if (epoch != atomic_load_explicit(&e->epoch, memory_order_acquire)) return 0;

    pthread_mutex_lock(&e->asset_lock);
    int32_t aslot = -1;
    if (!xen_asset_slot_valid(e, asset, &aslot) || e->asset[aslot].state != XEN_A_LIVE) {
        pthread_mutex_unlock(&e->asset_lock);
        return 0;                       /* retiring or unknown: fail closed  */
    }
    int32_t slot = -1;
    for (uint32_t i = 0; i < XEN_MAX_PROGRAMS; i++) {
        if (atomic_load_explicit(&e->prog[i].state, memory_order_relaxed) == XEN_P_FREE) {
            slot = (int32_t)i;
            break;
        }
    }
    if (slot < 0) {
        pthread_mutex_unlock(&e->asset_lock);
        return 0;
    }
    xen_program* p = &e->prog[slot];
    p->epoch = epoch;
    p->kind = kind;
    p->asset = aslot;
    p->seed = seed;
    p->rng = seed ^ 0xA0761D6478BD642FULL;
    p->active = 0;
    p->next_frame = 0;
    p->voices = 0;
    p->emitted = 0;
    memset(p->params, 0, sizeof p->params);
    for (uint32_t i = 0; i < n_params && i < XEN_PROGRAM_PARAMS; i++) p->params[i] = params[i];
    e->asset[aslot].prog_refs++;
    atomic_store_explicit(&p->state, XEN_P_ARMED, memory_order_release);
    xen_id h = xen_pack(epoch, p->gen, (uint32_t)slot);
    pthread_mutex_unlock(&e->asset_lock);
    return h;
}

static int push_prog_cmd(xen_engine* e, uint32_t kind, uint32_t epoch, xen_id id,
                         xen_frame at, uint32_t a, const double* params, uint32_t n) {
    uint32_t slot;
    int rc = resolve_program(e, epoch, id, &slot);
    if (rc != XEN_OK) return rc;
    xen_cmd c;
    memset(&c, 0, sizeof c);
    c.kind  = kind;
    c.epoch = epoch;
    c.frame = at;
    c.id    = id;
    c.a     = a;
    if (params) {
        c.n_params = n < XEN_PROGRAM_PARAMS ? n : XEN_PROGRAM_PARAMS;
        for (uint32_t i = 0; i < c.n_params; i++) c.params[i] = params[i];
    }
    c.seq = atomic_fetch_add_explicit(&e->seq, 1, memory_order_relaxed);
    rc = xen_ring_push(e, &c);
    if (rc != XEN_OK) XEN_INC(e, dropped_queue_full);
    return rc;
}

int xen_program_activate(xen_engine* e, uint32_t epoch, xen_id id, int on, xen_frame at) {
    if (!e) return XEN_ERR_ARG;
    return push_prog_cmd(e, XEN_CMD_PROG_ACTIVATE, epoch, id, at, on ? 1u : 0u, NULL, 0);
}

int xen_program_update(xen_engine* e, uint32_t epoch, xen_id id,
                       const double* params, uint32_t n, xen_frame at) {
    if (!e || !params) return XEN_ERR_ARG;
    return push_prog_cmd(e, XEN_CMD_PROG_UPDATE, epoch, id, at, 0, params, n);
}

int xen_program_destroy(xen_engine* e, uint32_t epoch, xen_id id, xen_frame at) {
    if (!e) return XEN_ERR_ARG;
    return push_prog_cmd(e, XEN_CMD_PROG_DESTROY, epoch, id, at, 0, NULL, 0);
}
