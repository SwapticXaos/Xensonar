/* Recording truth: the recorder tap is the master signal, sample for sample.
 * Plus the explicit overrun contract and the out-of-callback file writer. */
#include "xen_fixture.h"
#include <unistd.h>

int main(void) {
    xen_test_begin("recording");
    const uint64_t N = 96000;
    float* master = malloc(N * 2 * sizeof(float));
    float* captured = malloc(N * 2 * sizeof(float));

    /* ---------- 1. bit-exact parity with the master ----------------------- */
    {
        xen_config cfg;
        xen_config_default(&cfg);
        cfg.recorder_capacity_frames = 1u << 15;
        xen_engine* e = xen_engine_create(&cfg);
        uint64_t mf;
        float* mat = xen_fixture_material(48000, 20260101, 1.0, &mf);
        xen_id a = xen_asset_publish(e, mat, mf, 1, 110.0, "m");
        free(mat);
        uint32_t ep = xen_engine_epoch(e);
        xen_id p = xen_program_create(e, ep, XEN_PROGRAM_GRANULAR, a, XEN_DENSE_PARAMS,
                                      XEN_PROGRAM_PARAMS, 90210);
        xen_program_activate(e, ep, p, 1, 0);
        xen_gesture g = { XEN_G_ATTACK, 5, 30000, 1.5f, 1.0f, 0.0f, XEN_PITCH_ROOT_RATIO };
        xen_gesture_submit(e, ep, &g);

        static const uint32_t ragged[] = { 199, 512, 64, 1024 };
        xen_backend* be = NULL;
        xen_backend_null_create(e, ragged, 4, &be);
        XCHECK(xen_record_start(e, NULL) == XEN_OK, "record start failed");

        uint64_t pos = 0, got = 0;
        while (pos < N) {
            uint64_t n = (N - pos) < 8192 ? (N - pos) : 8192;
            xen_backend_null_run(be, n, master + pos * 2u);
            pos += n;
            got += xen_record_drain(e, captured + got * 2u, (uint32_t)(N - got));
        }
        got += xen_record_drain(e, captured + got * 2u, (uint32_t)(N - got));
        xen_record_stop(e);

        XCHECK(got == N, "captured %llu of %llu frames", (unsigned long long)got,
               (unsigned long long)N);
        XCHECK(memcmp(master, captured, (size_t)N * 2 * sizeof(float)) == 0,
               "recording differs from the master signal");
        XCHECK(xen_record_status(e) != XEN_REC_OVERRUN, "unexpected overrun");
        XNOTE("%llu frames captured, memcmp-identical to the device stream",
              (unsigned long long)got);
        xen_backend_destroy(be);
        xen_engine_destroy(e);
    }

    /* ---------- 2. overrun is explicit, audio is never blocked ------------ */
    {
        xen_config cfg;
        xen_config_default(&cfg);
        cfg.recorder_capacity_frames = 4096;     /* deliberately too small */
        xen_engine* e = xen_engine_create(&cfg);
        xen_backend* be = NULL;
        xen_backend_null_create(e, NULL, 0, &be);
        xen_record_start(e, NULL);
        xen_backend_null_run(be, 48000, master);   /* never drained */
        XCHECK(xen_record_status(e) == XEN_REC_OVERRUN, "overrun not reported (status %d)",
               xen_record_status(e));
        XCHECK(xen_record_stop(e) == XEN_ERR_STATE, "stop did not surface the failure");
        XCHECK(xen_all_finite(master, 96000), "audio was damaged by the overrun");
        xen_telemetry t;
        xen_engine_telemetry(e, &t);
        XCHECK(t.recorder_overruns >= 1, "overrun counter not incremented");
        XNOTE("undersized ring -> XEN_REC_OVERRUN, audio unaffected");
        xen_backend_destroy(be);
        xen_engine_destroy(e);
    }

    /* ---------- 3. writer thread produces a real file, outside the RT path */
    {
        xen_engine* e = xen_engine_create(NULL);
        uint64_t mf;
        float* mat = xen_fixture_material(48000, 5, 0.5, &mf);
        xen_id a = xen_asset_publish(e, mat, mf, 1, 110.0, "m");
        free(mat);
        uint32_t ep = xen_engine_epoch(e);
        xen_id p = xen_program_create(e, ep, XEN_PROGRAM_GRANULAR, a, XEN_DENSE_PARAMS,
                                      XEN_PROGRAM_PARAMS, 1);
        xen_program_activate(e, ep, p, 1, 0);
        xen_backend* be = NULL;
        xen_backend_null_create(e, NULL, 0, &be);
        char path[256];
        snprintf(path, sizeof path, "/tmp/xen_test_record_%ld.wav", (long)getpid());
        unlink(path);
        XCHECK(xen_record_start(e, path) == XEN_OK, "file recording failed to start");
        xen_backend_null_run(be, 24000, master);
        usleep(20000);
        xen_backend_null_run(be, 24000, master);
        XCHECK(xen_record_stop(e) == XEN_OK, "file recording reported a failure");
        FILE* f = fopen(path, "rb");
        XCHECK(f != NULL, "wav file was not created");
        if (f) {
            fseek(f, 0, SEEK_END);
            long sz = ftell(f);
            fclose(f);
            XCHECK(sz > 44 + 40000 * 8, "wav file too small (%ld bytes)", sz);
            XNOTE("wav written by the writer thread: %ld bytes", sz);
        }
        unlink(path);
        xen_backend_destroy(be);
        xen_engine_destroy(e);
    }

    free(master);
    free(captured);
    return xen_test_end();
}
