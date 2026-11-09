/* Release/cancel correctness (defect B) and late-event policy (defect D).
 *
 * B: a stale lifecycle command must not poison the identity state of a later
 *    valid one. The fix is structural: RELEASE is never subject to the
 *    lateness policy at all, and there is no dedup set that a rejected command
 *    can pollute.
 * D: the default policy cannot compress. Several late attacks with distinct
 *    intended frames are all rejected instead of landing on one frame.
 */
#include "xen_fixture.h"

static xen_engine* fresh(uint32_t policy, uint32_t tol) {
    xen_config cfg;
    xen_config_default(&cfg);
    cfg.lateness_policy = policy;
    cfg.lateness_tolerance_frames = tol;
    return xen_engine_create(&cfg);
}

int main(void) {
    xen_test_begin("release-and-lateness");
    float* buf = malloc(96000 * 2 * sizeof(float));

    /* ---------- 1. attack, stale release, then a second valid release ----- */
    {
        xen_engine* e = fresh(XEN_LATE_DROP, 0);
        xen_backend* be = NULL;
        xen_backend_null_create(e, NULL, 0, &be);
        uint32_t ep = xen_engine_epoch(e);
        xen_gesture a = { XEN_G_SUSTAIN, 77, 1000, 1.5f, 0.8f, 0.0f, XEN_PITCH_ROOT_RATIO };
        XCHECK(xen_gesture_submit(e, ep, &a) == XEN_OK, "sustain rejected");
        xen_backend_null_run(be, 24000, buf);
        xen_telemetry t;
        xen_engine_telemetry(e, &t);
        XCHECK(t.voices_active == 1, "held voice missing (%u)", t.voices_active);

        /* stale: intended frame far in the past. Must NOT be dropped. */
        xen_gesture r1 = { XEN_G_RELEASE, 77, 10, 0, 0, 0, XEN_PITCH_ROOT_RATIO };
        XCHECK(xen_gesture_submit(e, ep, &r1) == XEN_OK, "stale release was rejected");
        /* valid: right now */
        xen_gesture r2 = { XEN_G_RELEASE, 77, XEN_FRAME_ASAP, 0, 0, 0, XEN_PITCH_ROOT_RATIO };
        XCHECK(xen_gesture_submit(e, ep, &r2) == XEN_OK, "valid release was rejected");

        xen_backend_null_run(be, 24000, buf);
        xen_engine_telemetry(e, &t);
        XCHECK(t.voices_active == 0, "voice survived release (%u voices)", t.voices_active);
        XCHECK(t.releases_executed >= 1, "no release executed");
        XNOTE("stale+valid release: executed=%llu no_match=%llu",
              (unsigned long long)t.releases_executed, (unsigned long long)t.releases_no_match);
        xen_backend_destroy(be);
        xen_engine_destroy(e);
    }

    /* ---------- 2. duplicate valid release is harmless -------------------- */
    {
        xen_engine* e = fresh(XEN_LATE_DROP, 0);
        xen_backend* be = NULL;
        xen_backend_null_create(e, NULL, 0, &be);
        uint32_t ep = xen_engine_epoch(e);
        xen_gesture a = { XEN_G_SUSTAIN, 31, 500, 1.5f, 0.8f, 0.0f, XEN_PITCH_ROOT_RATIO };
        xen_gesture_submit(e, ep, &a);
        xen_backend_null_run(be, 12000, buf);
        xen_gesture r = { XEN_G_RELEASE, 31, XEN_FRAME_ASAP, 0, 0, 0, XEN_PITCH_ROOT_RATIO };
        for (int i = 0; i < 5; i++)
            XCHECK(xen_gesture_submit(e, ep, &r) == XEN_OK, "release %d rejected", i);
        xen_backend_null_run(be, 24000, buf);
        xen_telemetry t;
        xen_engine_telemetry(e, &t);
        XCHECK(t.voices_active == 0, "voice survived 5 releases");
        XCHECK(t.releases_executed == 1, "release was not idempotent (%llu executed)",
               (unsigned long long)t.releases_executed);
        XCHECK(t.releases_no_match == 4, "unexpected no-match count %llu",
               (unsigned long long)t.releases_no_match);
        xen_backend_destroy(be);
        xen_engine_destroy(e);
    }

    /* ---------- 3. release that arrives before its attack ----------------- */
    {
        xen_engine* e = fresh(XEN_LATE_DROP, 0);
        xen_backend* be = NULL;
        xen_backend_null_create(e, NULL, 0, &be);
        uint32_t ep = xen_engine_epoch(e);
        xen_gesture a = { XEN_G_SUSTAIN, 55, 30000, 1.5f, 0.8f, 0.0f, XEN_PITCH_ROOT_RATIO };
        xen_gesture r = { XEN_G_RELEASE, 55, 10000, 0, 0, 0, XEN_PITCH_ROOT_RATIO };
        xen_gesture_submit(e, ep, &a);
        xen_gesture_submit(e, ep, &r);
        xen_backend_null_run(be, 48000, buf);
        xen_telemetry t;
        xen_engine_telemetry(e, &t);
        XCHECK(t.attacks_cancelled == 1, "early release did not cancel the attack (%llu)",
               (unsigned long long)t.attacks_cancelled);
        XCHECK(t.voices_active == 0, "cancelled attack still sounding");
        xen_backend_destroy(be);
        xen_engine_destroy(e);
    }

    /* ---------- 4. late burst must not compress --------------------------- */
    {
        xen_engine* e = fresh(XEN_LATE_DROP, 0);
        xen_backend* be = NULL;
        xen_backend_null_create(e, NULL, 0, &be);
        uint32_t ep = xen_engine_epoch(e);
        xen_backend_null_run(be, 48000, buf);      /* engine is now at 1 s */
        int accepted = 0;
        for (int i = 0; i < 24; i++) {
            /* 24 separately timed attacks, all of them already in the past */
            xen_gesture g = { XEN_G_ATTACK, (uint32_t)(200 + i),
                              (xen_frame)(2000 + i * 1800), 1.5f, 1.0f, 0.0f, XEN_PITCH_ROOT_RATIO };
            if (xen_gesture_submit(e, ep, &g) == XEN_OK) accepted++;
        }
        xen_backend_null_run(be, 24000, buf);
        xen_telemetry t;
        xen_engine_telemetry(e, &t);
        XCHECK(accepted == 0, "%d late attacks were accepted under XEN_LATE_DROP", accepted);
        XCHECK(t.attacks_executed == 0, "late attacks executed (%llu)",
               (unsigned long long)t.attacks_executed);
        XCHECK(t.dropped_stale == 24, "stale counter = %llu, expected 24",
               (unsigned long long)t.dropped_stale);
        XCHECK(t.voices_active == 0, "burst produced voices");
        XNOTE("24 separately-timed late attacks -> 0 executed, 24 reported stale");
        xen_backend_destroy(be);
        xen_engine_destroy(e);
    }

    /* ---------- 5. intentional simultaneity survives ---------------------- */
    {
        xen_engine* e = fresh(XEN_LATE_DROP, 0);
        xen_backend* be = NULL;
        xen_backend_null_create(e, NULL, 0, &be);
        uint32_t ep = xen_engine_epoch(e);
        const xen_frame CHORD = 20000;
        float ratios[3] = { 1.0f, 1.25f, 1.5f };
        for (int i = 0; i < 3; i++) {
            xen_gesture g = { XEN_G_SUSTAIN, (uint32_t)(300 + i), CHORD, ratios[i], 0.7f, 0.0f, XEN_PITCH_ROOT_RATIO };
            XCHECK(xen_gesture_submit(e, ep, &g) == XEN_OK, "chord note %d rejected", i);
        }
        xen_backend_null_run(be, 48000, buf);
        xen_telemetry t;
        xen_engine_telemetry(e, &t);
        XCHECK(t.attacks_executed == 3, "chord collapsed: %llu notes",
               (unsigned long long)t.attacks_executed);
        XCHECK(t.voices_interactive == 3, "chord voices = %u", t.voices_interactive);
        XCHECK(xen_rms(buf, 0, (size_t)CHORD * 2u) == 0.0, "chord sounded before its frame");
        long onset = xen_first_onset(buf, 48000u * 2u, 1e-6);
        XCHECK(onset == (long)CHORD * 2, "chord onset at sample %ld, expected %lu",
               onset, (unsigned long)(CHORD * 2));
        XNOTE("3 notes sharing one intended frame remain 3 simultaneous voices");
        xen_backend_destroy(be);
        xen_engine_destroy(e);
    }

    /* ---------- 6. opt-in CLAMP policy is the only way to compress -------- */
    {
        xen_engine* e = fresh(XEN_LATE_CLAMP, 480);   /* 10 ms tolerance */
        xen_backend* be = NULL;
        xen_backend_null_create(e, NULL, 0, &be);
        uint32_t ep = xen_engine_epoch(e);
        xen_backend_null_run(be, 48000, buf);
        xen_frame now = xen_engine_now(e);
        xen_gesture in = { XEN_G_ATTACK, 900, now - 200, 1.5f, 1.0f, 0.0f, XEN_PITCH_ROOT_RATIO };
        xen_gesture out = { XEN_G_ATTACK, 901, now - 40000, 1.5f, 1.0f, 0.0f, XEN_PITCH_ROOT_RATIO };
        XCHECK(xen_gesture_submit(e, ep, &in) == XEN_OK, "within-tolerance attack rejected");
        XCHECK(xen_gesture_submit(e, ep, &out) == XEN_ERR_STALE, "out-of-tolerance attack accepted");
        xen_backend_null_run(be, 24000, buf);
        xen_telemetry t;
        xen_engine_telemetry(e, &t);
        XCHECK(t.attacks_executed == 1, "clamp policy executed %llu attacks",
               (unsigned long long)t.attacks_executed);
        xen_backend_destroy(be);
        xen_engine_destroy(e);
    }

    free(buf);
    return xen_test_end();
}
