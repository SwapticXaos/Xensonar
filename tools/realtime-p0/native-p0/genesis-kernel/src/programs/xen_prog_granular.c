/* xen_prog_granular.c — autonomous granular program + the generator seam.
 *
 *  ############################################################
 *  #  EXPERIMENTAL_PLACEHOLDER — PARITY_NOT_ESTABLISHED       #
 *  #  The grain geometry, density law, jitter, pitch ladder   #
 *  #  and source-offset behaviour below are INVENTED. They    #
 *  #  are not Xensonar Root Follow. They exist only to give   #
 *  #  the substrate a realistic autonomous workload.          #
 *  #  Replace via xen_engine_set_grain_generator().           #
 *  ############################################################
 *
 * The only thing that is architecture (and is tested) is:
 *   - the program owns its own schedule on the audio timeline;
 *   - a step materialises voices at the step frame and never earlier;
 *   - the random stream is seeded and therefore reproducible;
 *   - denial of a grain is explicit, never a silent thinning.
 */
#include "../xen_internal.h"
#include <math.h>
#include <string.h>

/* params (EXPERIMENTAL):
 *   0 window_ms   1 step_ms   2 microdensity   3 pitch_spread
 *   4 gain        5 source_jitter (0..1)       6,7 reserved            */

/* REFERENCE_UNKNOWN: an 11-limit ladder, chosen because Xensonar is
 * xenharmonic, not because this specific ladder is canonical. */
static const double k_ratios[12] = {
    1.0, 12.0/11.0, 11.0/10.0, 6.0/5.0, 11.0/9.0, 4.0/3.0,
    11.0/8.0, 3.0/2.0, 8.0/5.0, 18.0/11.0, 11.0/6.0, 2.0
};

static uint32_t generator_experimental_v1(void* user, const xen_grain_ctx* ctx,
                                          xen_grain_event* out, uint32_t max_events,
                                          uint64_t* next_step_frames) {
    (void)user;
    const double* p = ctx->params;
    double window_ms = p[0] > 0.1 ? p[0] : 120.0;
    double step_ms   = p[1] > 0.02 ? p[1] : 8.0;
    double density   = p[2] > 0.0 ? p[2] : 1.0;
    double spread    = p[3] < 0 ? 0 : (p[3] > 1 ? 1 : p[3]);
    double gain      = p[4];
    double jitter    = p[5] < 0 ? 0 : (p[5] > 1 ? 1 : p[5]);

    uint64_t step_frames = (uint64_t)(step_ms * 0.001 * ctx->sample_rate + 0.5);
    if (step_frames < 1) step_frames = 1;
    *next_step_frames = step_frames;

    /* fractional density without hidden accumulator state: floor plus a
     * seeded Bernoulli trial. Mean rate == density per step. */
    uint32_t count = (uint32_t)density;
    double frac = density - (double)count;
    if (frac > 0.0 && xen_rng_f(ctx->rng) < frac) count++;
    if (count > max_events) count = max_events;

    double win_frames = window_ms * 0.001 * ctx->sample_rate;
    if (win_frames < 16.0) win_frames = 16.0;

    for (uint32_t i = 0; i < count; i++) {
        uint32_t top = (uint32_t)(spread * 11.0 + 0.5);
        double ratio = k_ratios[xen_rng_u(ctx->rng, top + 1u)];
        double base = ctx->asset_base_hz > 0 ? ctx->asset_base_hz : 110.0;
        double pan = xen_rng_bi(ctx->rng) * 0.8;

        out[i].frame      = ctx->now;
        out[i].asset_slot = ctx->asset_slot;
        out[i].source_pos = xen_rng_f(ctx->rng) * (double)ctx->asset_frames * (0.25 + 0.75 * jitter);
        out[i].rate       = (ctx->root_hz * ratio) / base * (1.0 + xen_rng_bi(ctx->rng) * 0.004);
        out[i].dur_frames = win_frames * (1.0 + xen_rng_bi(ctx->rng) * 0.06);
        out[i].gain       = (float)(gain * (0.6 + 0.4 * xen_rng_f(ctx->rng)));
        out[i].pan        = (float)pan;
    }
    return count;
}

xen_grain_generator_fn xen_default_generator(void) { return generator_experimental_v1; }

/* ------------------------------------------------------------------------ */
/* One scheduling step. Called by the realtime dispatcher when the program's
 * next_frame is due. Cost is bounded by XEN_GRAINS_PER_STEP.                */
void xen_program_step(xen_engine* e, uint32_t slot) {
    xen_program* p = &e->prog[slot];
    uint64_t step = (uint64_t)(0.008 * e->sr + 0.5);
    if (step < 1) step = 1;

    if (p->asset < 0 || e->asset[p->asset].data == NULL) {
        p->next_frame += step;        /* keep the schedule alive, emit nothing */
        return;
    }
    const xen_asset* a = &e->asset[p->asset];

    xen_grain_ctx ctx;
    ctx.params        = p->params;
    ctx.root_hz       = (double)e->state[XEN_STATE_ROOT_HZ];
    ctx.asset_base_hz = a->base_hz;
    ctx.asset_frames  = a->frames;
    ctx.sample_rate   = e->sr;
    ctx.now           = p->next_frame;
    ctx.rng           = &p->rng;
    ctx.asset_slot    = (uint32_t)p->asset;

    uint64_t next_step = step;
    xen_grain_generator_fn fn = e->gen_fn ? e->gen_fn : generator_experimental_v1;
    uint32_t n = fn(e->gen_user, &ctx, e->gbuf, XEN_GRAINS_PER_STEP, &next_step);
    if (n > XEN_GRAINS_PER_STEP) n = XEN_GRAINS_PER_STEP;
    if (next_step < 1) next_step = 1;

    double tex = (double)e->state[XEN_STATE_TEXTURE_GAIN];
    for (uint32_t i = 0; i < n; i++) {
        const xen_grain_event* g = &e->gbuf[i];
        int32_t vi = xen_voice_alloc(e, XEN_PRI_TEXTURE);
        if (vi < 0) { XEN_INC(e, grains_denied_no_voice); continue; }
        xen_voices* v = &e->v;
        v->type[vi]  = XEN_V_GRAIN;
        v->owner[vi] = (int16_t)slot;
        v->asset[vi] = (int16_t)p->asset;
        atomic_fetch_add_explicit(&e->asset[p->asset].voice_refs, 1, memory_order_acquire);
        p->voices++;
        v->pos[vi]  = g->source_pos;
        v->rate[vi] = g->rate;
        v->age[vi]  = 0.0;
        v->dur[vi]  = g->dur_frames > 8.0 ? g->dur_frames : 8.0;
        double ang = ((double)g->pan + 1.0) * 0.7853981633974483;
        v->gl[vi] = (float)(cos(ang) * (double)g->gain * tex);
        v->gr[vi] = (float)(sin(ang) * (double)g->gain * tex);
        p->emitted++;
        XEN_INC(e, grains_emitted);
    }
    p->next_frame += next_step;
}
