/* xen_engine.c — clock, dispatcher, render kernel, master, lifecycle.
 *
 * The render kernel below is the ONLY place audio is produced. The null
 * backend and the PipeWire backend both call xen_engine_render(); there is no
 * second offline engine anywhere in this tree.
 */
#include "../xen_internal.h"
#include <math.h>
#include <stdlib.h>
#include <string.h>

/* --------------------------------------------------- realtime alloc guard */
static _Atomic int      g_rt_guard = 0;
static _Atomic uint64_t g_rt_viol  = 0;
void     xen_rt_guard_begin(void) { atomic_store(&g_rt_guard, 1); }
void     xen_rt_guard_end(void)   { atomic_store(&g_rt_guard, 0); }
uint64_t xen_rt_guard_violations(void) { return atomic_load(&g_rt_viol); }
int      xen_rt_guard_active(void) { return atomic_load_explicit(&g_rt_guard, memory_order_relaxed); }
void     xen_rt_guard_violation(void) { atomic_fetch_add(&g_rt_viol, 1); }

/* ------------------------------------------------------------------ setup */
void xen_config_default(xen_config* c) {
    if (!c) return;
    c->sample_rate = 48000;
    c->seed = 0x5EED0001ULL;
    c->lateness_policy = XEN_LATE_DROP;       /* conservative default (§2D)   */
    c->lateness_tolerance_frames = 0;
    c->recorder_capacity_frames = 1u << 18;   /* 5.5 s at 48 kHz              */
}

xen_engine* xen_engine_create(const xen_config* cfg_in) {
    xen_config cfg;
    xen_config_default(&cfg);
    if (cfg_in) cfg = *cfg_in;
    if (cfg.sample_rate < 8000 || cfg.sample_rate > 384000) return NULL;

    xen_dsp_init();
    xen_engine* e = (xen_engine*)calloc(1, sizeof(xen_engine));
    if (!e) return NULL;
    e->cfg = cfg;
    e->sr = (double)cfg.sample_rate;
    e->frame = 0;
    atomic_store(&e->epoch, 1u);
    atomic_store(&e->panic_epoch, 1u);
    atomic_store(&e->session, 1u);
    atomic_store(&e->seq, 1u);
    atomic_store(&e->pub_now, 0u);
    e->rt_epoch = 1u;
    pthread_mutex_init(&e->asset_lock, NULL);
    xen_voices_init(&e->v);
    for (uint32_t i = 0; i < XEN_MAX_PROGRAMS; i++) {
        atomic_store(&e->prog[i].state, XEN_P_FREE);
        e->prog[i].asset = -1;
    }

    e->delay.n = (uint32_t)(cfg.sample_rate * 3 / 2);     /* 1.5 s            */
    e->delay.l = (float*)calloc(e->delay.n, sizeof(float));
    e->delay.r = (float*)calloc(e->delay.n, sizeof(float));
    if (!e->delay.l || !e->delay.r || xen_recorder_init(&e->rec, cfg.recorder_capacity_frames,
                                                        cfg.sample_rate) != XEN_OK) {
        xen_engine_destroy(e);
        return NULL;
    }

    /* EXPERIMENTAL_PLACEHOLDER defaults */
    e->state[XEN_STATE_ROOT_HZ]      = 96.0f;
    e->state[XEN_STATE_MASTER_GAIN]  = 0.8f;
    e->state[XEN_STATE_FORGE_AMOUNT] = 0.32f;
    e->state[XEN_STATE_FORGE_TONE]   = 0.55f;
    e->state[XEN_STATE_FORGE_SPACE]  = 0.42f;
    e->state[XEN_STATE_TEXTURE_GAIN] = 1.0f;
    e->gen_fn = xen_default_generator();
    return e;
}

void xen_engine_destroy(xen_engine* e) {
    if (!e) return;
    xen_record_stop(e);
    xen_recorder_free(&e->rec);
    for (uint32_t i = 0; i < XEN_MAX_ASSETS; i++) free(e->asset[i].data);
    free(e->delay.l);
    free(e->delay.r);
    pthread_mutex_destroy(&e->asset_lock);
    free(e);
}

void xen_engine_set_grain_generator(xen_engine* e, xen_grain_generator_fn fn, void* user) {
    if (!e) return;
    e->gen_fn = fn ? fn : xen_default_generator();
    e->gen_user = user;
}

uint32_t  xen_engine_epoch(const xen_engine* e)   { return e ? atomic_load(&((xen_engine*)e)->epoch) : 0; }
uint32_t  xen_engine_session(const xen_engine* e) { return e ? atomic_load(&((xen_engine*)e)->session) : 0; }
xen_frame xen_engine_now(const xen_engine* e)     { return e ? atomic_load(&((xen_engine*)e)->pub_now) : 0; }

uint32_t xen_engine_panic(xen_engine* e) {
    if (!e) return 0;
    /* Terminal lifecycle has its own one-way side channel. This deliberately
     * does not consume or enqueue in the ordinary SPSC ring. Once this call
     * returns, new-epoch commands can be submitted immediately; the realtime
     * thread applies the fence before it drains ordinary commands. */
    uint32_t ne = atomic_fetch_add_explicit(&e->epoch, 1u, memory_order_acq_rel) + 1u;
    atomic_store_explicit(&e->panic_epoch, ne, memory_order_release);
    return ne;
}

uint32_t xen_engine_restart(xen_engine* e) {
    if (!e) return 0;
    uint32_t ep = xen_engine_panic(e);
    atomic_fetch_add(&e->session, 1u);
    return ep;
}

void xen_engine_maintain(xen_engine* e) {
    if (!e) return;
    pthread_mutex_lock(&e->asset_lock);
    for (uint32_t i = 0; i < XEN_MAX_PROGRAMS; i++) {
        xen_program* p = &e->prog[i];
        if (atomic_load_explicit(&p->state, memory_order_acquire) != XEN_P_DEAD) continue;
        if (p->asset >= 0 && e->asset[p->asset].prog_refs > 0) e->asset[p->asset].prog_refs--;
        p->asset = -1;
        p->gen++;
        p->active = 0;
        p->voices = 0;
        atomic_store_explicit(&p->state, XEN_P_FREE, memory_order_release);
    }
    xen_assets_maintain_locked(e);
    pthread_mutex_unlock(&e->asset_lock);
}

/* ------------------------------------------------------------ token rings */
static int token_in(const uint32_t* ring, uint32_t tok) {
    if (tok == 0) return 0;
    for (uint32_t i = 0; i < XEN_CANCEL_RING; i++) if (ring[i] == tok) return 1;
    return 0;
}
static void token_put(uint32_t* ring, uint32_t* pos, uint32_t tok) {
    if (tok == 0) return;
    ring[*pos] = tok;
    *pos = (*pos + 1u) % XEN_CANCEL_RING;
}
static void token_del(uint32_t* ring, uint32_t tok) {
    for (uint32_t i = 0; i < XEN_CANCEL_RING; i++) if (ring[i] == tok) ring[i] = 0;
}

/* ----------------------------------------------------------------- panic */
void xen_rt_panic(xen_engine* e, uint32_t new_epoch) {
    while (e->v.n_active) xen_voice_free(e, e->v.active[e->v.n_active - 1u]);
    xen_entrophon_panic(e);
    for (uint32_t i = 0; i < XEN_MAX_PROGRAMS; i++) {
        xen_program* p = &e->prog[i];
        uint32_t st = atomic_load_explicit(&p->state, memory_order_acquire);
        if (st == XEN_P_FREE || st == XEN_P_DEAD) continue;
        if (p->epoch == new_epoch) continue;     /* created after the fence   */
        p->active = 0;
        p->voices = 0;
        atomic_store_explicit(&p->state, XEN_P_DEAD, memory_order_release);
    }
    e->sched_count = 0;
    e->svfL.lp = e->svfL.bp = e->svfR.lp = e->svfR.bp = 0.0;
    memset(e->delay.l, 0, e->delay.n * sizeof(float));
    memset(e->delay.r, 0, e->delay.n * sizeof(float));
    e->delay.w = 0;
    memset(e->cancel_tok, 0, sizeof e->cancel_tok);
    memset(e->seen_tok, 0, sizeof e->seen_tok);
    e->rt_epoch = new_epoch;
    XEN_INC(e, panics);
}

/* ------------------------------------------------------- command execution */
static void rt_exec(xen_engine* e, const xen_cmd* c) {
    switch (c->kind) {
    case XEN_CMD_STATE:
        if (c->a < XEN_STATE_SLOTS) {
            e->state[c->a] = c->f0;
            XEN_INC(e, state_applied);
        }
        return;

    case XEN_CMD_PROG_ACTIVATE: {
        uint32_t s;
        if (xen_rt_resolve_program(e, c, &s) != XEN_OK) return;
        xen_program* p = &e->prog[s];
        if (c->a) {
            /* activation resets the schedule: an inactive interval is never
             * "caught up" into a burst */
            p->next_frame = c->frame;
            p->active = 1;
        } else {
            p->active = 0;      /* sounding grains finish naturally */
        }
        return;
    }
    case XEN_CMD_PROG_UPDATE: {
        uint32_t s;
        if (xen_rt_resolve_program(e, c, &s) != XEN_OK) return;
        xen_program* p = &e->prog[s];
        for (uint32_t i = 0; i < c->n_params && i < XEN_PROGRAM_PARAMS; i++) p->params[i] = c->params[i];
        XEN_INC(e, program_updates_applied);
        return;
    }
    case XEN_CMD_PROG_DESTROY: {
        uint32_t s;
        if (xen_rt_resolve_program(e, c, &s) != XEN_OK) return;
        xen_program* p = &e->prog[s];
        p->active = 0;
        atomic_store_explicit(&p->state, XEN_P_DYING, memory_order_release);
        return;
    }
    case XEN_CMD_TONE_PLAN: {
        /* A compound timbre is all-or-nothing. Preflight before stealing any
         * lower-priority texture voice so a denied plan cannot damage the
         * texture it failed to replace. */
        if (xen_voice_capacity_for_priority(e, XEN_PRI_INTERACTIVE) < c->tone_count) {
            XEN_INC(e, tone_plans_denied_no_voice);
            XEN_INC(e, attacks_denied_no_voice);
            return;
        }
        uint32_t slots[XEN_TONE_PLAN_MAX];
        uint32_t n = 0;
        for (uint32_t i = 0; i < c->tone_count; i++) {
            int32_t vi = xen_voice_alloc(e, XEN_PRI_INTERACTIVE);
            if (vi < 0) {
                while (n) xen_voice_free(e, slots[--n]);
                XEN_INC(e, tone_plans_denied_no_voice);
                XEN_INC(e, attacks_denied_no_voice);
                return;
            }
            slots[n++] = (uint32_t)vi;
        }
        for (uint32_t i = 0; i < c->tone_count; i++) {
            uint32_t vi = slots[i];
            const xen_tone_rt* t = &c->tones[i];
            xen_voices* v = &e->v;
            v->type[vi] = XEN_V_TONE;
            v->token[vi] = c->token;
            v->phase[vi] = 0.0;
            v->finc[vi] = t->phase_inc;
            v->env[vi] = 0.0;
            v->envk[vi] = t->decay_mul;
            v->attack_inc[vi] = t->attack_inc;
            v->start_frame[vi] = c->frame + (xen_frame)t->delay_frames;
            v->end_frame[vi] = v->start_frame[vi] + (xen_frame)t->duration_frames;
            v->waveform[vi] = t->waveform;
            v->stage[vi] = 0u;
            v->b0[vi]=t->b0; v->b1[vi]=t->b1; v->b2[vi]=t->b2;
            v->a1[vi]=t->a1; v->a2[vi]=t->a2; v->z1[vi]=0.0f; v->z2[vi]=0.0f;
            v->gl[vi] = t->gain * 0.5f;
            v->gr[vi] = t->gain * 0.5f;
        }
        XEN_INC(e, tone_plans_executed);
        XEN_INC(e, attacks_executed);
        return;
    }
    case XEN_CMD_ENTROPHON_PLAN: {
        int rc = xen_entrophon_rt_admit(e, c->token, c->frame, &c->entrophon);
        if (rc != XEN_OK) {
            XEN_INC(e, entrophon_plans_denied_no_body);
            XEN_INC(e, attacks_denied_no_voice);
            return;
        }
        XEN_INC(e, entrophon_plans_executed);
        XEN_INC(e, attacks_executed);
        return;
    }
    case XEN_CMD_GESTURE: break;
    default: return;
    }

    XEN_INC(e, gestures_executed);

    if (c->a == XEN_G_RELEASE) {
        uint32_t matched = 0;
        for (int32_t i = (int32_t)e->v.n_active - 1; i >= 0; i--) {
            uint32_t idx = e->v.active[i];
            if (e->v.token[idx] != c->token || e->v.type[idx] == XEN_V_GRAIN) continue;
            if (e->v.releasing[idx]) continue;   /* already terminal: idempotent */
            e->v.releasing[idx] = 1;
            e->v.envk[idx] = 1.0 / (0.12 * e->sr);
            matched++;
        }
        if (matched) {
            XEN_INC(e, releases_executed);
        } else {
            XEN_INC(e, releases_no_match);
            /* If the attack has not happened yet, arm a cancellation so the
             * release cannot be lost. If it already happened and finished,
             * do nothing: a terminated voice needs no termination. */
            if (!token_in(e->seen_tok, c->token)) token_put(e->cancel_tok, &e->cancel_pos, c->token);
        }
        return;
    }

    /* ATTACK / SUSTAIN */
    if (token_in(e->cancel_tok, c->token)) {
        token_del(e->cancel_tok, c->token);
        XEN_INC(e, attacks_cancelled);
        return;
    }
    token_put(e->seen_tok, &e->seen_pos, c->token);

    int32_t vi = xen_voice_alloc(e, XEN_PRI_INTERACTIVE);
    if (vi < 0) {
        XEN_INC(e, attacks_denied_no_voice);   /* explicit, never silent */
        return;
    }
    xen_voices* v = &e->v;
    double pitch = c->f0 > 0.0f ? (double)c->f0 : 1.0;
    double vel = c->f1 > 0.0f ? (double)c->f1 : 0.8;
    double freq = (c->b == XEN_PITCH_HZ) ? pitch : (double)e->state[XEN_STATE_ROOT_HZ] * pitch;
    v->type[vi] = (c->a == XEN_G_SUSTAIN) ? XEN_V_SUSTAIN : XEN_V_ATTACK;
    v->token[vi] = c->token;
    v->finc[vi] = freq / e->sr;
    v->phase[vi] = 0.0;
    if (v->type[vi] == XEN_V_SUSTAIN) {
        v->env[vi] = 0.0;
        v->envk[vi] = 1.0 / (0.02 * e->sr);
    } else {
        v->env[vi] = 1.0;
        v->envk[vi] = exp(-1.0 / (0.5 * e->sr));     /* EXPERIMENTAL decay */
    }
    double ang = ((double)c->f2 + 1.0) * 0.7853981633974483;
    v->gl[vi] = (float)(cos(ang) * vel * 0.5);
    v->gr[vi] = (float)(sin(ang) * vel * 0.5);
    XEN_INC(e, attacks_executed);
}

/* ------------------------------------------------------------- dispatcher */
static void rt_execute_due(xen_engine* e) {
    uint32_t guard = 0;
    int progress = 1;
    while (progress && guard < 1000000u) {
        progress = 0;
        while (e->sched_count && e->sched[0].frame <= e->frame) {
            xen_cmd c;
            (void)xen_sched_pop_min(e, &c);
            rt_exec(e, &c);
            progress = 1;
            guard++;
        }
        for (uint32_t s = 0; s < XEN_MAX_PROGRAMS; s++) {
            xen_program* p = &e->prog[s];
            if (atomic_load_explicit(&p->state, memory_order_relaxed) != XEN_P_LIVE) continue;
            if (!p->active) continue;
            while (p->next_frame <= e->frame && guard < 1000000u) {
                xen_frame before = p->next_frame;
                xen_program_step(e, s);
                if (p->next_frame <= before) p->next_frame = before + 1;  /* never stall */
                progress = 1;
                guard++;
            }
        }
    }
}

static void rt_apply_mailbox(xen_engine* e) {
    uint32_t d = atomic_exchange_explicit(&e->mail_dirty, 0u, memory_order_acquire);
    while (d) {
        uint32_t b = (uint32_t)__builtin_ctz(d);
        d &= d - 1u;
        e->state[b] = atomic_load_explicit(&e->mail[b], memory_order_relaxed);
        XEN_INC(e, state_applied);
    }
}

/* --------------------------------------------------------------- dsp pass */
static void render_chunk(xen_engine* e, float* L, float* R, uint32_t n) {
    memset(e->busL, 0, n * sizeof(float));
    memset(e->busR, 0, n * sizeof(float));

    xen_voices_render(e, n);
    xen_entrophon_render(e, n);

    if (!e->bypass_post_fx) {
        /* ---- Forge (EXPERIMENTAL_PLACEHOLDER realtime transform) ------------ */
        double amount = (double)e->state[XEN_STATE_FORGE_AMOUNT];
        double tone   = (double)e->state[XEN_STATE_FORGE_TONE];
        double space  = (double)e->state[XEN_STATE_FORGE_SPACE];
        if (amount < 0) amount = 0;
        if (amount > 1) amount = 1;
        if (tone < 0.02) tone = 0.02;
        if (tone > 1) tone = 1;
        if (space < 0) space = 0;
        if (space > 0.95) space = 0.95;
        double f = 0.06 + 0.9 * tone * tone;
        double q = 1.1 - 0.7 * amount;
        double drive = 1.0 + amount * 5.0;
        double dl = e->sr * (0.021 + 0.25 * space);
        double dr = e->sr * (0.031 + 0.33 * space);
        if (dl > e->delay.n - 2) dl = e->delay.n - 2;
        if (dr > e->delay.n - 2) dr = e->delay.n - 2;
        double fb = 0.15 + 0.55 * space;
        double wet = amount * 0.9;
        double tmp[2];
        for (uint32_t i = 0; i < n; i++) {
            double l = (double)e->busL[i], r = (double)e->busR[i];
            double cl = xen_softclip(l * drive) / (1.0 + amount);
            double cr = xen_softclip(r * drive) / (1.0 + amount);
            double fl = xen_svf_tick(&e->svfL, cl, f, q);
            double fr = xen_svf_tick(&e->svfR, cr, f, q);
            xen_delay_tick(&e->delay, fl * 0.7, fr * 0.7, dl, dr, fb, tmp);
            e->busL[i] = (float)(l * (1.0 - wet) + (fl + tmp[0]) * wet);
            e->busR[i] = (float)(r * (1.0 - wet) + (fr + tmp[1]) * wet);
        }

    }

    /* ---- Master + recorder tap: one signal, one truth -------------------- */
    double mg = (double)e->state[XEN_STATE_MASTER_GAIN];
    float pl = e->peak_l * 0.98f, pr = e->peak_r * 0.98f;
    int bad = 0;
    for (uint32_t i = 0; i < n; i++) {
        float l = e->bypass_post_fx ? e->busL[i] : (float)xen_softclip((double)e->busL[i] * mg);
        float r = e->bypass_post_fx ? e->busR[i] : (float)xen_softclip((double)e->busR[i] * mg);
        if (!isfinite(l) || !isfinite(r)) bad = 1;
        L[i] = l;
        R[i] = r;
        e->recbuf[i * 2u] = l;
        e->recbuf[i * 2u + 1u] = r;
        float al = l < 0 ? -l : l, ar = r < 0 ? -r : r;
        if (al > pl) pl = al;
        if (ar > pr) pr = ar;
    }
    e->peak_l = pl;
    e->peak_r = pr;
    if (bad) XEN_INC(e, nonfinite_blocks);
    xen_recorder_push(&e->rec, e->recbuf, n);
}

/* ------------------------------------------------------------ the kernel */
void xen_engine_render(xen_engine* e, float* L, float* R, uint32_t frames) {
    if (!e || !L || !R || frames == 0) return;
    e->entrophon_aux_offset = 0u;
    atomic_store_explicit(&e->last_quantum, frames, memory_order_relaxed);
    atomic_store_explicit(&e->pub_now, e->frame, memory_order_release);

    /* Apply terminal epoch fences before ordinary command admission. This is
     * the key property that makes commands submitted immediately after Panic
     * valid instead of accepted-then-silently-dropped. Multiple panics before
     * one callback collapse safely to the newest epoch. */
    uint32_t pe = atomic_load_explicit(&e->panic_epoch, memory_order_acquire);
    if (pe != e->rt_epoch) xen_rt_panic(e, pe);

    xen_rt_drain(e);
    /* Catch a fence published concurrently while the drain was running. New
     * epoch commands are protected inside xen_rt_drain(); this second check
     * handles the case where the ring happened to contain only old work. */
    pe = atomic_load_explicit(&e->panic_epoch, memory_order_acquire);
    if (pe != e->rt_epoch) xen_rt_panic(e, pe);
    rt_apply_mailbox(e);

    /* promote freshly created programs into the realtime-owned state */
    for (uint32_t s = 0; s < XEN_MAX_PROGRAMS; s++) {
        if (atomic_load_explicit(&e->prog[s].state, memory_order_acquire) == XEN_P_ARMED)
            atomic_store_explicit(&e->prog[s].state, XEN_P_LIVE, memory_order_release);
    }

    uint32_t done = 0;
    while (done < frames) {
        rt_execute_due(e);

        uint32_t n = frames - done;
        if (n > XEN_MAX_BLOCK) n = XEN_MAX_BLOCK;
        xen_frame limit = e->frame + (xen_frame)n;
        if (e->sched_count) {
            xen_frame f = e->sched[0].frame;
            if (f > e->frame && f < limit) limit = f;
        }
        for (uint32_t s = 0; s < XEN_MAX_PROGRAMS; s++) {
            xen_program* p = &e->prog[s];
            if (atomic_load_explicit(&p->state, memory_order_relaxed) != XEN_P_LIVE || !p->active) continue;
            if (p->next_frame > e->frame && p->next_frame < limit) limit = p->next_frame;
        }
        n = (uint32_t)(limit - e->frame);
        if (n == 0) n = 1;

        render_chunk(e, L + done, R + done, n);
        e->entrophon_aux_offset += n;
        e->frame += n;
        done += n;
    }

    /* DYING -> DEAD once nothing can reference the program any more */
    uint32_t live = 0, act = 0, inter = 0;
    for (uint32_t s = 0; s < XEN_MAX_PROGRAMS; s++) {
        xen_program* p = &e->prog[s];
        uint32_t st = atomic_load_explicit(&p->state, memory_order_acquire);
        if (st == XEN_P_DYING && p->voices == 0)
            atomic_store_explicit(&p->state, XEN_P_DEAD, memory_order_release);
        else if (st == XEN_P_LIVE || st == XEN_P_ARMED) { live++; if (p->active) act++; }
    }
    for (uint32_t i = 0; i < e->v.n_active; i++)
        if (e->v.pri[e->v.active[i]] == XEN_PRI_INTERACTIVE) inter++;

    atomic_store_explicit(&e->pub_voices, e->v.n_active + e->entrophon.active_count, memory_order_relaxed);
    atomic_store_explicit(&e->pub_voices_inter, inter + e->entrophon.active_count, memory_order_relaxed);
    atomic_store_explicit(&e->pub_voices_peak, e->voices_peak, memory_order_relaxed);
    atomic_store_explicit(&e->pub_sched, e->sched_count, memory_order_relaxed);
    atomic_store_explicit(&e->pub_sched_peak, e->sched_peak, memory_order_relaxed);
    atomic_store_explicit(&e->pub_progs_live, live, memory_order_relaxed);
    atomic_store_explicit(&e->pub_progs_active, act, memory_order_relaxed);
    atomic_store_explicit(&e->pub_peak_l, e->peak_l, memory_order_relaxed);
    atomic_store_explicit(&e->pub_peak_r, e->peak_r, memory_order_relaxed);
    atomic_store_explicit(&e->pub_now, e->frame, memory_order_release);
}

/* ------------------------------------------------------------- telemetry */
void xen_engine_telemetry(const xen_engine* ce, xen_telemetry* t) {
    if (!ce || !t) return;
    xen_engine* e = (xen_engine*)ce;
    memset(t, 0, sizeof *t);
    t->session = atomic_load(&e->session);
    t->epoch = atomic_load(&e->epoch);
    t->frame = atomic_load(&e->pub_now);
    t->sample_rate = e->cfg.sample_rate;
    t->last_quantum = atomic_load(&e->last_quantum);
    t->voices_active = atomic_load(&e->pub_voices);
    t->voices_interactive = atomic_load(&e->pub_voices_inter);
    t->voices_peak = atomic_load(&e->pub_voices_peak);
    t->programs_live = atomic_load(&e->pub_progs_live);
    t->programs_active = atomic_load(&e->pub_progs_active);
    t->sched_occupancy = atomic_load(&e->pub_sched);
    t->sched_peak = atomic_load(&e->pub_sched_peak);
#define XEN_COPY(n) t->n = XEN_GET(e, n);
    XEN_CNT_LIST(XEN_COPY)
#undef XEN_COPY
    pthread_mutex_lock(&e->asset_lock);
    for (uint32_t i = 1; i < XEN_MAX_ASSETS; i++) {
        if (e->asset[i].state == XEN_A_LIVE) t->assets_live++;
        else if (e->asset[i].state == XEN_A_RETIRING) t->assets_retiring++;
    }
    pthread_mutex_unlock(&e->asset_lock);
    t->recorder_status = atomic_load(&e->rec.status);
    t->recorder_frames = atomic_load(&e->rec.frames);
    t->recorder_overruns = atomic_load(&e->rec.overruns);
    t->peak_l = atomic_load(&e->pub_peak_l);
    t->peak_r = atomic_load(&e->pub_peak_r);
}
