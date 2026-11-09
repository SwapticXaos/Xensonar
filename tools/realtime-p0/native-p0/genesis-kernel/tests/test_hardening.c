/* Hardening regressions discovered by external adversarial review:
 * - new-epoch work submitted immediately after Panic must survive;
 * - Panic is independent of a saturated ordinary command ring;
 * - reverse-time future admission must remain structurally cheap enough to
 *   drain without the previous O(N^2) sorted-array insertion behaviour. */
#include "xen_fixture.h"
#include <time.h>

static double elapsed_ms(struct timespec a, struct timespec b) {
    return (double)(b.tv_sec - a.tv_sec) * 1000.0 + (double)(b.tv_nsec - a.tv_nsec) / 1e6;
}

int main(void) {
    xen_test_begin("hardening-regressions");

    /* 1. Immediate new-world work after Panic. */
    {
        xen_engine* e = xen_engine_create(NULL);
        uint64_t mf;
        float* mat = xen_fixture_material(48000, 17, 0.5, &mf);
        xen_id asset = xen_asset_publish(e, mat, mf, 1, 110.0, "mat");
        free(mat);
        uint32_t ep1 = xen_engine_epoch(e);
        uint32_t ep2 = xen_engine_panic(e);
        XCHECK(ep2 == ep1 + 1, "panic did not advance epoch");

        double par[XEN_PROGRAM_PARAMS];
        memcpy(par, XEN_DENSE_PARAMS, sizeof par);
        xen_id p = xen_program_create(e, ep2, XEN_PROGRAM_GRANULAR, asset,
                                      par, XEN_PROGRAM_PARAMS, 123);
        XCHECK(p != 0, "new-epoch program could not be created before RT fence observation");
        XCHECK(xen_program_activate(e, ep2, p, 1, XEN_FRAME_ASAP) == XEN_OK,
               "new-epoch program activation was not accepted immediately");

        xen_gesture g = {0};
        g.kind = XEN_G_ATTACK;
        g.token = 777;
        g.frame = XEN_FRAME_ASAP;
        g.p0 = 220.0f;
        g.p1 = 1.0f;
        g.pitch_mode = XEN_PITCH_HZ;
        XCHECK(xen_gesture_submit(e, ep2, &g) == XEN_OK,
               "new-epoch gesture was not accepted immediately");

        float L[512], R[512];
        xen_engine_render(e, L, R, 512);
        xen_telemetry t; xen_engine_telemetry(e, &t);
        XCHECK(t.attacks_executed == 1, "new-epoch gesture vanished across panic fence");
        XCHECK(t.programs_active == 1, "new-epoch program vanished across panic fence");
        XCHECK(t.dropped_epoch == 0, "valid new-epoch work was classified as stale epoch");
        xen_engine_destroy(e);
    }

    /* 2. Saturated old-world ring cannot defeat Panic. A new command may
     * explicitly see QUEUE_FULL until RT drains the dead backlog, but Panic
     * itself is not queued and therefore cannot fail or require producer-side
     * consumption of the SPSC ring. */
    {
        xen_engine* e = xen_engine_create(NULL);
        uint32_t ep1 = xen_engine_epoch(e);
        uint32_t accepted = 0;
        for (uint32_t i = 0; i < XEN_CMD_RING_CAP; i++) {
            int rc = xen_state_set_at(e, ep1, XEN_STATE_MASTER_GAIN, 0.5f,
                                      1000000u + (xen_frame)i);
            if (rc == XEN_OK) accepted++;
        }
        XCHECK(accepted == XEN_CMD_RING_CAP, "could not fill command ring (%u)", accepted);
        uint32_t ep2 = xen_engine_panic(e);
        XCHECK(ep2 == ep1 + 1, "panic failed under full ring");
        float L[64], R[64];
        xen_engine_render(e, L, R, 64);
        xen_telemetry t; xen_engine_telemetry(e, &t);
        XCHECK(t.sched_occupancy == 0, "dead old-epoch backlog survived panic (%u)", t.sched_occupancy);
        xen_gesture g = {0};
        g.kind = XEN_G_ATTACK; g.token = 88; g.frame = XEN_FRAME_ASAP;
        g.p0 = 330.0f; g.p1 = 1.0f; g.pitch_mode = XEN_PITCH_HZ;
        XCHECK(xen_gesture_submit(e, ep2, &g) == XEN_OK,
               "new epoch did not recover after full-ring panic");
        xen_engine_render(e, L, R, 64);
        xen_engine_telemetry(e, &t);
        XCHECK(t.attacks_executed == 1, "post-full-ring panic attack did not execute");
        xen_engine_destroy(e);
    }

    /* 3. Adversarial reverse ordering. This is not a machine-independent hard
     * deadline assertion; it records the observed admission time while the
     * algorithmic guarantee is the fixed-capacity O(log N) heap in core. */
    {
        xen_engine* e = xen_engine_create(NULL);
        uint32_t ep = xen_engine_epoch(e);
        const xen_frame base = 2000000;
        uint32_t accepted = 0;
        for (uint32_t i = 0; i < XEN_CMD_RING_CAP; i++) {
            int rc = xen_state_set_at(e, ep, XEN_STATE_FORGE_AMOUNT,
                                      (float)(i & 255u) / 255.0f,
                                      base + (xen_frame)(XEN_CMD_RING_CAP - 1u - i));
            if (rc == XEN_OK) accepted++;
        }
        XCHECK(accepted == XEN_CMD_RING_CAP, "reverse backlog acceptance mismatch %u", accepted);
        float L[64], R[64];
        struct timespec a,b;
        clock_gettime(CLOCK_MONOTONIC, &a);
        xen_engine_render(e, L, R, 64);
        clock_gettime(CLOCK_MONOTONIC, &b);
        xen_telemetry t; xen_engine_telemetry(e, &t);
        XCHECK(t.sched_occupancy == XEN_SCHED_CAP, "scheduler occupancy %u != %u",
               t.sched_occupancy, XEN_SCHED_CAP);
        XCHECK(t.dropped_sched_full == 0, "scheduler dropped accepted commands");
        XNOTE("reverse %u-command admission observed %.3f ms (informational; heap is O(log N)/insert)",
              accepted, elapsed_ms(a,b));
        xen_engine_destroy(e);
    }

    return xen_test_end();
}
