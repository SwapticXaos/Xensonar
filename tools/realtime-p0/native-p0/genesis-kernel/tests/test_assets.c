/* Asset lifetime (defect C).
 *
 * The hard case: an ACTIVE program, no grain currently sounding, retirement
 * requested, and a future grain still expected. The previous prototype only
 * protected assets that had a live voice, so the gap between grains was a hole.
 * The contract now counts program references too, and retirement is deferred
 * rather than allowed to affect sound.
 */
#include "xen_fixture.h"

int main(void) {
    xen_test_begin("asset-lifetime");
    xen_config cfg;
    xen_config_default(&cfg);
    xen_engine* e = xen_engine_create(&cfg);
    uint64_t mf;
    float* mat = xen_fixture_material(48000, 11, 1.0, &mf);
    xen_id asset = xen_asset_publish(e, mat, mf, 1, 110.0, "mat");
    free(mat);
    XCHECK(asset != 0, "publish failed");
    XCHECK(xen_asset_is_live(e, asset), "asset not live after publish");

    /* sparse: 3 ms grains every 60 ms, so most of the timeline is a gap */
    double sparse[XEN_PROGRAM_PARAMS] = { 3.0, 60.0, 1.0, 0.3, 0.5, 0.5, 0, 0 };
    uint32_t ep = xen_engine_epoch(e);
    xen_id prog = xen_program_create(e, ep, XEN_PROGRAM_GRANULAR, asset, sparse,
                                     XEN_PROGRAM_PARAMS, 31337);
    XCHECK(prog != 0, "program creation failed");
    xen_program_activate(e, ep, prog, 1, 0);

    xen_backend* be = NULL;
    xen_backend_null_create(e, NULL, 0, &be);
    float* buf = malloc(48000 * 2 * sizeof(float));

    /* advance in small steps until we are demonstrably inside a gap */
    xen_telemetry t;
    int found_gap = 0;
    for (int i = 0; i < 200 && !found_gap; i++) {
        xen_backend_null_run(be, 512, buf);
        xen_engine_telemetry(e, &t);
        if (t.voices_active == 0 && t.grains_emitted >= 3) found_gap = 1;
    }
    XCHECK(found_gap, "never observed a gap between grains");
    uint64_t grains_at_retire = t.grains_emitted;
    XNOTE("retiring while program is ACTIVE, %u voices sounding, %llu grains so far",
          t.voices_active, (unsigned long long)grains_at_retire);

    /* the dangerous moment */
    int rc = xen_asset_retire(e, asset);
    XCHECK(rc == XEN_RETIRE_DEFERRED, "retire was not deferred (rc=%d)", rc);
    XCHECK(!xen_asset_is_live(e, asset), "asset should now be marked retiring");

    /* a program may not be created against a retiring asset */
    xen_id bad = xen_program_create(e, ep, XEN_PROGRAM_GRANULAR, asset, sparse,
                                    XEN_PROGRAM_PARAMS, 1);
    XCHECK(bad == 0, "program was created against a retiring asset");

    /* future grains must still be valid material */
    xen_backend_null_run(be, 48000, buf);
    xen_engine_telemetry(e, &t);
    XCHECK(t.grains_emitted > grains_at_retire,
           "no grains after retirement request (%llu -> %llu)",
           (unsigned long long)grains_at_retire, (unsigned long long)t.grains_emitted);
    XCHECK(xen_rms(buf, 0, 96000) > 1e-5, "material went silent after retirement request");
    XCHECK(xen_all_finite(buf, 96000), "non-finite output after retirement request");
    XCHECK(t.assets_retiring == 1 && t.assets_live == 0, "asset accounting wrong (%u/%u)",
           t.assets_live, t.assets_retiring);
    XNOTE("%llu further grains generated from the retiring asset, all valid",
          (unsigned long long)(t.grains_emitted - grains_at_retire));

    /* maintain must NOT free it while the program lives */
    xen_engine_maintain(e);
    xen_engine_telemetry(e, &t);
    XCHECK(t.assets_retiring == 1, "asset freed while a live program referenced it");

    /* now drop the program and drain */
    xen_program_destroy(e, ep, prog, XEN_FRAME_ASAP);
    xen_backend_null_run(be, 48000, buf);
    xen_engine_maintain(e);
    xen_engine_telemetry(e, &t);
    XCHECK(t.assets_retiring == 0 && t.assets_live == 0, "asset never reclaimed (%u/%u)",
           t.assets_live, t.assets_retiring);
    XCHECK(t.programs_live == 0, "program slot leaked");
    XCHECK(xen_all_finite(buf, 96000), "non-finite output after reclamation");

    /* engine still renders with no assets at all */
    xen_backend_null_run(be, 4800, buf);
    XCHECK(xen_all_finite(buf, 9600), "non-finite output with zero assets");

    free(buf);
    xen_backend_destroy(be);
    xen_engine_destroy(e);
    return xen_test_end();
}
