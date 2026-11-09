/* xen-host — minimal realtime host for the PipeWire backend.
 *
 * Built only with PIPEWIRE=1 / -DXEN_WITH_PIPEWIRE=ON. Runs the same episode
 * as xen-render, on a device, through the same render kernel.
 *
 *   xen-host [--seconds S] [--quantum N] [--record out.wav]
 */
#include "xen/xen_audio.h"
#include "xen/xen_xensonar.h"
#include "xen_fixture.h"
#include <unistd.h>

int main(int argc, char** argv) {
    double seconds = 20.0;
    uint32_t quantum = 0;
    const char* rec = NULL;
    for (int i = 1; i < argc; i++) {
        if (!strcmp(argv[i], "--seconds") && i + 1 < argc) seconds = atof(argv[++i]);
        else if (!strcmp(argv[i], "--quantum") && i + 1 < argc) quantum = (uint32_t)atoi(argv[++i]);
        else if (!strcmp(argv[i], "--record") && i + 1 < argc) rec = argv[++i];
    }

    xen_config cfg;
    xen_config_default(&cfg);
    xen_engine* e = xen_engine_create(&cfg);
    uint64_t mf;
    float* mat = xen_fixture_material(cfg.sample_rate, 20260101, 2.0, &mf);
    xen_id asset = xen_asset_publish(e, mat, mf, 1, 110.0, "material");
    free(mat);

    xen_backend* be = NULL;
    int rc = xen_backend_pipewire_create(e, "xensonar", quantum, &be);
    if (rc != XEN_OK) {
        fprintf(stderr, "pipewire backend unavailable (rc=%d). "
                        "Build with -DXEN_WITH_PIPEWIRE and run on a machine with a "
                        "PipeWire graph.\n", rc);
        xen_engine_destroy(e);
        return 2;
    }

    xen_root_follow_params rf = { 120.0, 8.0, 1.85, 0.5, 0.45, 0.5 };
    xen_id prog = xsn_root_follow_create(e, asset, &rf, 20260101);
    uint32_t ep = xen_engine_epoch(e);
    xen_program_activate(e, ep, prog, 1, XEN_FRAME_ASAP);
    if (rec) xen_record_start(e, rec);

    xen_backend_start(be);
    uint32_t token = 1;
    for (double t = 0; t < seconds; t += 0.25) {
        usleep(250000);
        /* a live gesture every second, timestamped 5 ms ahead */
        if ((int)(t * 4) % 4 == 0) {
            xsn_wave_attack(e, 7 + (token % 5), 0.9f, 0.0f, ++token,
                            (uint32_t)(cfg.sample_rate / 200));
        }
        xen_engine_maintain(e);
        xen_telemetry tel;
        xen_engine_telemetry(e, &tel);
        xen_backend_info bi;
        xen_backend_query(be, &bi);
        fprintf(stderr, "\r frame %-10llu quantum %-5u voices %-3u grains %-7llu attacks %-4llu "
                        "denied %-4llu rec %u",
                (unsigned long long)tel.frame, bi.last_quantum, tel.voices_active,
                (unsigned long long)tel.grains_emitted,
                (unsigned long long)tel.attacks_executed,
                (unsigned long long)tel.attacks_denied_no_voice, tel.recorder_status);
    }
    fprintf(stderr, "\n");
    xen_backend_stop(be);
    if (rec) xen_record_stop(e);
    xen_backend_destroy(be);
    xen_engine_destroy(e);
    return 0;
}
