/* Program planning versus DSP occupancy, and interactive response under load.
 *
 * Two questions:
 *   - does knowing about thousands of future grains cost voices now?  (no)
 *   - is a live gesture actually ADMITTED and AUDIBLE while a dense autonomous
 *     program runs?  (asserted on the counter AND on the rendered difference
 *     signal, not inferred from a voice total)
 */
#include "xen_fixture.h"

typedef struct { xen_engine* e; xen_backend* be; xen_id prog; uint32_t ep; } rig;

static rig make(uint64_t seed, int activate) {
    rig r;
    r.e = xen_engine_create(NULL);
    uint64_t mf;
    float* mat = xen_fixture_material(48000, 20260101, 2.0, &mf);
    xen_id a = xen_asset_publish(r.e, mat, mf, 1, 110.0, "m");
    free(mat);
    r.ep = xen_engine_epoch(r.e);
    r.prog = xen_program_create(r.e, r.ep, XEN_PROGRAM_GRANULAR, a, XEN_DENSE_PARAMS,
                                XEN_PROGRAM_PARAMS, seed);
    if (activate) xen_program_activate(r.e, r.ep, r.prog, 1, 0);
    xen_backend_null_create(r.e, NULL, 0, &r.be);
    return r;
}
static void done(rig* r) { xen_backend_destroy(r->be); xen_engine_destroy(r->e); }

int main(void) {
    xen_test_begin("planning-and-interactivity");
    const uint64_t N = 384000;   /* 8 s */
    float* buf = malloc(N * 2 * sizeof(float));

    /* ---------- 1. created but inactive: zero DSP cost -------------------- */
    {
        rig r = make(1, 0);
        xen_backend_null_run(r.be, 240000, buf);
        xen_telemetry t;
        xen_engine_telemetry(r.e, &t);
        XCHECK(t.programs_live == 1, "program not live");
        XCHECK(t.programs_active == 0, "program should be inactive");
        XCHECK(t.voices_peak == 0, "an inactive program reserved %u voices", t.voices_peak);
        XCHECK(t.grains_emitted == 0, "an inactive program emitted grains");
        XCHECK(xen_rms(buf, 0, 480000) == 0.0, "inactive program made sound");
        XNOTE("5 s inactive: 0 voices, 0 grains, exact silence");
        done(&r);
    }

    /* ---------- 2. dense run: many grains, few simultaneous voices -------- */
    {
        rig r = make(2, 1);
        xen_backend_null_run(r.be, N, buf);
        xen_telemetry t;
        xen_engine_telemetry(r.e, &t);
        double expected = XEN_DENSE_PARAMS[2] * XEN_DENSE_PARAMS[0] / XEN_DENSE_PARAMS[1];
        XCHECK(t.grains_emitted > 1600, "only %llu grains in 8 s",
               (unsigned long long)t.grains_emitted);
        XCHECK(t.voices_peak < (uint32_t)(expected * 2.0),
               "peak voices %u far above the %.0f concurrency implied by the parameters",
               t.voices_peak, expected);
        XCHECK(t.grains_denied_no_voice == 0, "grains were denied at the nominal operating point");
        XCHECK(t.nonfinite_blocks == 0, "non-finite block detected");
        XCHECK(xen_all_finite(buf, (size_t)N * 2), "non-finite sample");
        XNOTE("EXPERIMENTAL operating point 120ms/8ms/1.85: %llu grains scheduled, peak %u voices"
              " of %u, concurrency implied %.1f",
              (unsigned long long)t.grains_emitted, t.voices_peak, XEN_MAX_VOICES, expected);
        done(&r);
    }

    /* ---------- 3. live attack during the dense texture ------------------- */
    {
        const uint64_t M = 96000;
        const xen_frame AT = 48000;
        float* base = malloc(M * 2 * sizeof(float));
        float* hit = malloc(M * 2 * sizeof(float));

        rig r1 = make(3, 1);
        xen_backend_null_run(r1.be, M, base);
        xen_telemetry t1;
        xen_engine_telemetry(r1.e, &t1);
        done(&r1);

        rig r2 = make(3, 1);
        xen_gesture g = { XEN_G_ATTACK, 4242, AT, 1.5f, 1.0f, 0.0f, XEN_PITCH_ROOT_RATIO };
        XCHECK(xen_gesture_submit(r2.e, r2.ep, &g) == XEN_OK, "attack refused");
        xen_backend_null_run(r2.be, M, hit);
        xen_telemetry t2;
        xen_engine_telemetry(r2.e, &t2);

        /* the gesture itself must be reported as executed - not inferred */
        XCHECK(t2.attacks_executed == 1, "attack was not executed (%llu)",
               (unsigned long long)t2.attacks_executed);
        XCHECK(t2.attacks_denied_no_voice == 0, "attack was denied");
        XCHECK(t2.grains_emitted == t1.grains_emitted,
               "the texture changed because of the attack (%llu vs %llu)",
               (unsigned long long)t1.grains_emitted, (unsigned long long)t2.grains_emitted);

        /* and it must be audible at exactly its intended frame */
        float* diff = malloc(M * 2 * sizeof(float));
        for (uint64_t i = 0; i < M * 2; i++) diff[i] = hit[i] - base[i];
        long onset = xen_first_onset(diff, (size_t)M * 2, 1e-6);
        XCHECK(onset >= 0, "attack was inaudible");
        XCHECK(onset / 2 == (long)AT, "attack audible at frame %ld, intended %llu",
               onset / 2, (unsigned long long)AT);
        XCHECK(xen_rms(diff, 0, (size_t)AT * 2) == 0.0, "signal changed before the attack frame");
        XNOTE("attack audible at frame %ld (intended %llu), texture bit-identical before it",
              onset / 2, (unsigned long long)AT);
        free(diff);
        free(base);
        free(hit);
        done(&r2);
    }

    free(buf);
    return xen_test_end();
}
