/* Panic / epoch terminality — the defect-A regression test.
 *
 * The previous prototype let a program created before panic be reactivated
 * afterwards through its old handle. Program handles now carry the epoch they
 * were minted in, so there is no argument the caller can pass that revives it.
 */
#include "xen_fixture.h"

int main(void) {
    xen_test_begin("panic-epoch-terminality");
    xen_config cfg;
    xen_config_default(&cfg);
    xen_engine* e = xen_engine_create(&cfg);
    uint64_t mf;
    float* mat = xen_fixture_material(48000, 7, 1.0, &mf);
    xen_id asset = xen_asset_publish(e, mat, mf, 1, 110.0, "mat");
    free(mat);

    uint32_t ep1 = xen_engine_epoch(e);
    xen_id prog = xen_program_create(e, ep1, XEN_PROGRAM_GRANULAR, asset, XEN_DENSE_PARAMS,
                                     XEN_PROGRAM_PARAMS, 5);
    XCHECK(prog != 0, "program creation failed");
    xen_program_activate(e, ep1, prog, 1, 0);

    xen_backend* be = NULL;
    xen_backend_null_create(e, NULL, 0, &be);
    const uint64_t HALF = 24000;
    float* buf = malloc(HALF * 2 * sizeof(float));
    xen_backend_null_run(be, HALF, buf);

    xen_telemetry t;
    xen_engine_telemetry(e, &t);
    XCHECK(t.voices_active > 5, "texture should be running, voices=%u", t.voices_active);
    uint64_t grains_before = t.grains_emitted;
    uint64_t attacks_before = t.attacks_executed;

    /* a command already in flight when the fence lands */
    xen_gesture inflight = { XEN_G_ATTACK, 99, HALF + 12000, 1.5f, 1.0f, 0.0f, XEN_PITCH_ROOT_RATIO };
    XCHECK(xen_gesture_submit(e, ep1, &inflight) == XEN_OK, "in-flight submit rejected early");

    uint32_t ep2 = xen_engine_panic(e);
    XCHECK(ep2 == ep1 + 1, "epoch did not advance: %u -> %u", ep1, ep2);

    /* --- everything from the dead epoch must fail closed ------------------ */
    xen_gesture g = { XEN_G_ATTACK, 1, HALF + 1000, 1.5f, 1.0f, 0.0f, XEN_PITCH_ROOT_RATIO };
    XCHECK(xen_gesture_submit(e, ep1, &g) == XEN_ERR_EPOCH, "old-epoch gesture accepted");
    XCHECK(xen_state_set_at(e, ep1, XEN_STATE_ROOT_HZ, 200.f, HALF + 1) == XEN_ERR_EPOCH,
           "old-epoch state accepted");
    XCHECK(xen_program_activate(e, ep1, prog, 1, XEN_FRAME_ASAP) == XEN_ERR_EPOCH,
           "old-epoch program command accepted");
    /* the exact defect: old handle, *current* epoch argument */
    XCHECK(xen_program_activate(e, ep2, prog, 1, XEN_FRAME_ASAP) == XEN_ERR_HANDLE,
           "STALE PROGRAM HANDLE WAS REACTIVATED AFTER PANIC");
    XCHECK(xen_program_update(e, ep2, prog, XEN_DENSE_PARAMS, XEN_PROGRAM_PARAMS,
                              XEN_FRAME_ASAP) == XEN_ERR_HANDLE, "stale handle updated");
    XCHECK(xen_program_destroy(e, ep2, prog, XEN_FRAME_ASAP) == XEN_ERR_HANDLE,
           "stale handle destroyed");

    /* --- the fence takes effect and stays silent -------------------------- */
    xen_backend_null_run(be, HALF, buf);
    xen_engine_telemetry(e, &t);
    XCHECK(t.voices_active == 0, "voices survived panic: %u", t.voices_active);
    XCHECK(t.programs_active == 0, "programs still active after panic: %u", t.programs_active);
    XCHECK(t.attacks_executed == attacks_before, "in-flight attack resurrected");
    XCHECK(t.grains_emitted == grains_before, "program kept emitting after panic");

    float* quiet = malloc(HALF * 2 * sizeof(float));
    xen_backend_null_run(be, HALF, quiet);
    XCHECK(xen_rms(quiet, 0, (size_t)HALF * 2) == 0.0, "post-panic output is not silent (rms %g)",
           xen_rms(quiet, 0, (size_t)HALF * 2));

    xen_engine_maintain(e);
    xen_engine_telemetry(e, &t);
    XCHECK(t.programs_live == 0, "program slot not reclaimed: %u", t.programs_live);

    /* --- a new epoch is fully functional ---------------------------------- */
    xen_id prog2 = xen_program_create(e, ep2, XEN_PROGRAM_GRANULAR, asset, XEN_DENSE_PARAMS,
                                      XEN_PROGRAM_PARAMS, 5);
    XCHECK(prog2 != 0, "cannot create a program in the new epoch");
    XCHECK(prog2 != prog, "handle reuse produced an identical id");
    XCHECK(xen_program_activate(e, ep2, prog2, 1, XEN_FRAME_ASAP) == XEN_OK, "activate failed");
    xen_backend_null_run(be, HALF, buf);
    xen_engine_telemetry(e, &t);
    XCHECK(t.voices_active > 5, "new epoch texture did not start (%u voices)", t.voices_active);

    /* --- restart: session identity + no resurrection ---------------------- */
    uint32_t s1 = xen_engine_session(e);
    uint32_t ep3 = xen_engine_restart(e);
    XCHECK(xen_engine_session(e) == s1 + 1, "session did not advance");
    XCHECK(xen_program_activate(e, ep3, prog2, 1, XEN_FRAME_ASAP) == XEN_ERR_HANDLE,
           "pre-restart handle still usable");
    xen_backend_null_run(be, HALF, quiet);
    XCHECK(xen_rms(quiet, 0, (size_t)HALF * 2) == 0.0, "restart left audible material");
    xen_engine_maintain(e);

    XCHECK(xen_all_finite(buf, (size_t)HALF * 2), "non-finite output");
    free(buf);
    free(quiet);
    xen_backend_destroy(be);
    xen_engine_destroy(e);
    return xen_test_end();
}
