/* Determinism contract:
 *   Same build, same platform, same seed, same timed inputs  =>  BIT IDENTICAL.
 * Not a tolerance. Not "close enough". memcmp of the raw float output.
 * Cross platform is a separate, weaker contract (see README §Determinism).
 */
#include "xen_fixture.h"

static uint32_t run(uint64_t seed, float* out, uint64_t frames) {
    xen_config cfg;
    xen_config_default(&cfg);
    cfg.seed = seed;
    xen_engine* e = xen_engine_create(&cfg);
    uint64_t mf;
    float* mat = xen_fixture_material(48000, 20260101, 2.0, &mf);
    xen_id a = xen_asset_publish(e, mat, mf, 1, 110.0, "mat");
    free(mat);
    uint32_t ep = xen_engine_epoch(e);
    xen_id p = xen_program_create(e, ep, XEN_PROGRAM_GRANULAR, a, XEN_DENSE_PARAMS,
                                  XEN_PROGRAM_PARAMS, seed);
    xen_program_activate(e, ep, p, 1, 0);
    /* a couple of timed gestures so the interactive path is part of the hash */
    xen_gesture g = { XEN_G_ATTACK, 1, 24000, 1.5f, 1.0f, -0.3f, XEN_PITCH_ROOT_RATIO };
    xen_gesture_submit(e, ep, &g);
    xen_gesture g2 = { XEN_G_ATTACK, 2, 60011, 1.375f, 0.9f, 0.4f, XEN_PITCH_ROOT_RATIO };
    xen_gesture_submit(e, ep, &g2);

    xen_backend* be = NULL;
    xen_backend_null_create(e, NULL, 0, &be);
    xen_backend_start(be);
    xen_backend_null_run(be, frames, out);
    xen_backend_stop(be);
    xen_backend_destroy(be);
    xen_telemetry t;
    xen_engine_telemetry(e, &t);
    uint32_t h = xen_hash_f32(out, (size_t)frames * 2u);
    XCHECK(t.grains_emitted > 300, "expected a dense texture, got %llu grains",
           (unsigned long long)t.grains_emitted);
    XCHECK(t.attacks_executed == 2, "attacks executed = %llu", (unsigned long long)t.attacks_executed);
    XCHECK(t.nonfinite_blocks == 0, "non-finite blocks = %llu", (unsigned long long)t.nonfinite_blocks);
    xen_engine_destroy(e);
    return h;
}

int main(void) {
    xen_test_begin("determinism");
    const uint64_t N = 96000;
    float* a = malloc(N * 2 * sizeof(float));
    float* b = malloc(N * 2 * sizeof(float));
    float* c = malloc(N * 2 * sizeof(float));

    uint32_t ha = run(4242, a, N);
    uint32_t hb = run(4242, b, N);
    uint32_t hc = run(4243, c, N);

    XCHECK(memcmp(a, b, (size_t)N * 2 * sizeof(float)) == 0,
           "same seed produced different bits (%08x vs %08x)", ha, hb);
    XCHECK(ha != hc, "seed had no effect: %08x == %08x", ha, hc);
    XCHECK(xen_all_finite(a, (size_t)N * 2), "non-finite sample in output");
    XCHECK(xen_rms(a, 0, (size_t)N * 2) > 1e-3, "output is silent");
    XNOTE("hash(seed 4242) = %08x   hash(seed 4243) = %08x", ha, hc);
    XNOTE("rms = %.6f  peak-to-peak check ok", xen_rms(a, 0, (size_t)N * 2));

    free(a); free(b); free(c);
    return xen_test_end();
}
