/* Callback partition invariance WITH dynamic state and program updates.
 *
 * Commands arrive during the render, at segment boundaries, exactly as they
 * would from a control thread — they are not all pre-loaded. Their effective
 * frames fall in the middle of blocks, so the sub-block dispatcher has to
 * split. If callback size leaked into musical time, these hashes would differ.
 */
#include "xen_fixture.h"

typedef struct {
    uint64_t deliver_at;
    uint64_t frame;
    int      kind;   /* 0 gesture, 1 state, 2 program update, 3 activate */
    uint32_t a;
    float    f;
} ev;

static ev k_events[] = {
    { 10000,  24000, 0, 1, 1.5f   },
    { 20000,  30011, 1, XEN_STATE_ROOT_HZ, 128.0f },
    { 40000,  50007, 2, 0, 4.0f   },   /* step_ms 8 -> 4 at frame 50007      */
    { 52000,  61111, 0, 2, 1.375f },
    { 70000,  80003, 1, XEN_STATE_FORGE_AMOUNT, 0.75f },
    { 90000, 100001, 3, 0, 0.0f   },   /* deactivate mid-render              */
    {105000, 112345, 3, 1, 0.0f   },   /* reactivate: must not catch up      */
    {120000, 130777, 0, 3, 1.8333f },
    {140000, 150555, 4, 8, 1.25f   },   /* sustain: held, then released      */
    {200000, 214321, 5, 8, 0.0f    },   /* release at an odd frame           */
};

static uint32_t run(const uint32_t* quanta, uint32_t nq, float* out, uint64_t total) {
    xen_config cfg;
    xen_config_default(&cfg);
    xen_engine* e = xen_engine_create(&cfg);
    uint64_t mf;
    float* mat = xen_fixture_material(48000, 20260101, 2.0, &mf);
    xen_id a = xen_asset_publish(e, mat, mf, 1, 110.0, "mat");
    free(mat);
    uint32_t ep = xen_engine_epoch(e);
    xen_id p = xen_program_create(e, ep, XEN_PROGRAM_GRANULAR, a, XEN_DENSE_PARAMS,
                                  XEN_PROGRAM_PARAMS, 777);
    xen_program_activate(e, ep, p, 1, 0);

    xen_backend* be = NULL;
    xen_backend_null_create(e, quanta, nq, &be);
    xen_backend_start(be);

    const uint64_t SEG = 4096;
    size_t ei = 0;
    uint64_t pos = 0;
    double params[XEN_PROGRAM_PARAMS];
    memcpy(params, XEN_DENSE_PARAMS, sizeof params);
    while (pos < total) {
        while (ei < sizeof(k_events) / sizeof(ev) && k_events[ei].deliver_at <= pos) {
            const ev* v = &k_events[ei++];
            if (v->kind == 0) {
                xen_gesture g = { XEN_G_ATTACK, v->a, v->frame, v->f, 1.0f, 0.0f, XEN_PITCH_ROOT_RATIO };
                xen_gesture_submit(e, ep, &g);
            } else if (v->kind == 1) {
                xen_state_set_at(e, ep, v->a, v->f, v->frame);
            } else if (v->kind == 2) {
                params[1] = v->f;
                xen_program_update(e, ep, p, params, XEN_PROGRAM_PARAMS, v->frame);
            } else if (v->kind == 3) {
                xen_program_activate(e, ep, p, (int)v->a, v->frame);
            } else if (v->kind == 4) {
                xen_gesture g = { XEN_G_SUSTAIN, v->a, v->frame, v->f, 0.7f, 0.0f, XEN_PITCH_ROOT_RATIO };
                xen_gesture_submit(e, ep, &g);
            } else {
                xen_gesture g = { XEN_G_RELEASE, v->a, v->frame, 0, 0, 0, XEN_PITCH_ROOT_RATIO };
                xen_gesture_submit(e, ep, &g);
            }
        }
        uint64_t n = total - pos < SEG ? total - pos : SEG;
        xen_backend_null_run(be, n, out + pos * 2u);
        pos += n;
    }
    xen_backend_stop(be);
    xen_backend_destroy(be);

    xen_telemetry t;
    xen_engine_telemetry(e, &t);
    XCHECK(t.attacks_executed == 4, "attacks executed = %llu (expected 4)",
           (unsigned long long)t.attacks_executed);
    XCHECK(t.program_updates_applied == 1, "program updates = %llu",
           (unsigned long long)t.program_updates_applied);
    XCHECK(t.state_applied >= 2, "state applied = %llu", (unsigned long long)t.state_applied);
    XCHECK(t.dropped_stale == 0, "unexpected stale drops: %llu", (unsigned long long)t.dropped_stale);
    xen_engine_destroy(e);
    return xen_hash_f32(out, (size_t)total * 2u);
}

int main(void) {
    xen_test_begin("partition-invariance");
    const uint64_t N = 432000;  /* 9 s: long enough for voices to die mid-run */
    static const uint32_t q512[] = { 512 };
    static const uint32_t ragged[] = { 64, 127, 511, 128, 1024, 73, 256 };
    static const uint32_t tiny[] = { 33 };
    static const uint32_t big[] = { 1024, 2048 };

    float* a = malloc(N * 2 * sizeof(float));
    float* b = malloc(N * 2 * sizeof(float));
    float* c = malloc(N * 2 * sizeof(float));
    float* d = malloc(N * 2 * sizeof(float));

    uint32_t ha = run(q512, 1, a, N);
    uint32_t hb = run(ragged, 7, b, N);
    uint32_t hc = run(tiny, 1, c, N);
    uint32_t hd = run(big, 2, d, N);

    XCHECK(memcmp(a, b, (size_t)N * 2 * sizeof(float)) == 0, "512 vs ragged differ");
    XCHECK(memcmp(a, c, (size_t)N * 2 * sizeof(float)) == 0, "512 vs 33 differ");
    XCHECK(memcmp(a, d, (size_t)N * 2 * sizeof(float)) == 0, "512 vs 1024/2048 differ");
    XCHECK(xen_all_finite(a, (size_t)N * 2), "non-finite output");
    XNOTE("512=%08x  ragged=%08x  33=%08x  1024/2048=%08x", ha, hb, hc, hd);

    free(a); free(b); free(c); free(d);
    return xen_test_end();
}
