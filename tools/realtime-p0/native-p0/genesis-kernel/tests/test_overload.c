/* Overload semantics (§10) and bounded queues.
 *
 * Nothing here is allowed to be silent. Every refusal is a counter the host
 * can read, and the priority order is enforced structurally: an interactive
 * attack may take a voice from the autonomous texture, the texture may never
 * take one from an interactive voice, and a release always works.
 */
#include "xen_fixture.h"

int main(void) {
    xen_test_begin("overload-and-bounds");
    float* buf = malloc(48000 * 2 * sizeof(float));

    /* ---------- 1. command ring exhaustion is explicit -------------------- */
    {
        xen_engine* e = xen_engine_create(NULL);
        uint32_t ep = xen_engine_epoch(e);
        int ok = 0, full = 0, other = 0;
        for (int i = 0; i < (int)XEN_CMD_RING_CAP + 500; i++) {
            xen_gesture g = { XEN_G_ATTACK, (uint32_t)i, 1000000 + (xen_frame)i, 1.5f, 0.5f, 0, XEN_PITCH_ROOT_RATIO };
            int rc = xen_gesture_submit(e, ep, &g);
            if (rc == XEN_OK) ok++;
            else if (rc == XEN_ERR_QUEUE_FULL) full++;
            else other++;
        }
        XCHECK(ok == (int)XEN_CMD_RING_CAP, "ring accepted %d (cap %u)", ok, XEN_CMD_RING_CAP);
        XCHECK(full == 500, "overflow not reported as QUEUE_FULL (%d)", full);
        XCHECK(other == 0, "unexpected status codes (%d)", other);
        xen_telemetry t;
        xen_engine_telemetry(e, &t);
        XCHECK(t.dropped_queue_full == 500, "queue-full counter = %llu",
               (unsigned long long)t.dropped_queue_full);
        XNOTE("ring cap %u: %d accepted, %d refused with an explicit code",
              XEN_CMD_RING_CAP, ok, full);
        xen_engine_destroy(e);
    }

    /* ---------- 2. absurd texture demand: bounded, finite, counted -------- */
    {
        xen_engine* e = xen_engine_create(NULL);
        uint64_t mf;
        float* mat = xen_fixture_material(48000, 3, 0.5, &mf);
        xen_id a = xen_asset_publish(e, mat, mf, 1, 110.0, "m");
        free(mat);
        double absurd[XEN_PROGRAM_PARAMS] = { 400.0, 1.0, 40.0, 1.0, 0.1, 0.5, 0, 0 };
        uint32_t ep = xen_engine_epoch(e);
        xen_id p = xen_program_create(e, ep, XEN_PROGRAM_GRANULAR, a, absurd,
                                      XEN_PROGRAM_PARAMS, 3);
        xen_program_activate(e, ep, p, 1, 0);
        xen_backend* be = NULL;
        xen_backend_null_create(e, NULL, 0, &be);
        xen_backend_null_run(be, 48000, buf);
        xen_telemetry t;
        xen_engine_telemetry(e, &t);
        XCHECK(t.voices_peak <= XEN_MAX_VOICES, "voice pool exceeded: %u", t.voices_peak);
        XCHECK(t.grains_denied_no_voice > 0, "denial was not reported");
        XCHECK(xen_all_finite(buf, 96000), "non-finite output under overload");
        XNOTE("requested %llu grains, %llu denied explicitly, peak %u/%u voices",
              (unsigned long long)t.grains_emitted,
              (unsigned long long)t.grains_denied_no_voice, t.voices_peak, XEN_MAX_VOICES);

        /* an interactive attack must still get in, by taking a texture voice */
        uint64_t before = t.attacks_executed;
        xen_gesture g = { XEN_G_ATTACK, 4242, xen_engine_now(e) + 64, 1.5f, 1.0f, 0.0f, XEN_PITCH_ROOT_RATIO };
        XCHECK(xen_gesture_submit(e, ep, &g) == XEN_OK, "attack rejected at submit");
        xen_backend_null_run(be, 4800, buf);
        xen_engine_telemetry(e, &t);
        XCHECK(t.attacks_executed == before + 1, "interactive attack lost under texture overload");
        XCHECK(t.attacks_denied_no_voice == 0, "attack denied while texture voices existed");
        XNOTE("interactive attack admitted with a saturated texture (priority holds)");
        xen_backend_destroy(be);
        xen_engine_destroy(e);
    }

    /* ---------- 3. genuine exhaustion is reported, not silent ------------- */
    {
        xen_engine* e = xen_engine_create(NULL);
        uint32_t ep = xen_engine_epoch(e);
        xen_backend* be = NULL;
        xen_backend_null_create(e, NULL, 0, &be);
        for (uint32_t i = 0; i < XEN_MAX_VOICES; i++) {
            xen_gesture g = { XEN_G_SUSTAIN, 1000 + i, 240, 1.0f + 0.001f * (float)i, 0.2f, 0, XEN_PITCH_ROOT_RATIO };
            xen_gesture_submit(e, ep, &g);
        }
        xen_backend_null_run(be, 2400, buf);
        xen_telemetry t;
        xen_engine_telemetry(e, &t);
        XCHECK(t.voices_active == XEN_MAX_VOICES, "expected a full pool, got %u", t.voices_active);
        xen_gesture extra = { XEN_G_SUSTAIN, 99999, xen_engine_now(e) + 48, 1.5f, 1.0f, 0, XEN_PITCH_ROOT_RATIO };
        xen_gesture_submit(e, ep, &extra);
        xen_backend_null_run(be, 2400, buf);
        xen_engine_telemetry(e, &t);
        XCHECK(t.attacks_denied_no_voice == 1, "exhaustion was silent (denied=%llu)",
               (unsigned long long)t.attacks_denied_no_voice);
        /* release still works when nothing else can be admitted */
        xen_gesture rel = { XEN_G_RELEASE, 1000, XEN_FRAME_ASAP, 0, 0, 0, XEN_PITCH_ROOT_RATIO };
        XCHECK(xen_gesture_submit(e, ep, &rel) == XEN_OK, "release refused under exhaustion");
        xen_backend_null_run(be, 24000, buf);
        xen_engine_telemetry(e, &t);
        XCHECK(t.releases_executed == 1, "release did not execute under exhaustion");
        XCHECK(t.voices_active < XEN_MAX_VOICES, "release freed nothing");
        XCHECK(xen_all_finite(buf, 4800), "non-finite output");
        XNOTE("pool exhausted: attack refused with a counter, release still authoritative");
        xen_backend_destroy(be);
        xen_engine_destroy(e);
    }

    free(buf);
    return xen_test_end();
}
