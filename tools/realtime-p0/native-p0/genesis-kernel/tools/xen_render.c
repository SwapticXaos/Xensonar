/* xen-render — offline Golden Episode renderer.
 *
 *   xen-render [--seconds S] [--seed N] [--partition uniform|ragged|tiny]
 *              [--out file.wav] [--quiet]
 *
 * Uses the null backend, i.e. exactly the same render kernel PipeWire drives.
 */
#include "xen/xen_audio.h"
#include "xen/xen_xensonar.h"
#include "xen_fixture.h"

int main(int argc, char** argv) {
    double seconds = 8.0;
    uint64_t seed = 20260101;
    const char* part = "uniform";
    const char* out = "build/episode.wav";
    int quiet = 0;

    for (int i = 1; i < argc; i++) {
        if (!strcmp(argv[i], "--seconds") && i + 1 < argc) seconds = atof(argv[++i]);
        else if (!strcmp(argv[i], "--seed") && i + 1 < argc) seed = strtoull(argv[++i], NULL, 10);
        else if (!strcmp(argv[i], "--partition") && i + 1 < argc) part = argv[++i];
        else if (!strcmp(argv[i], "--out") && i + 1 < argc) out = argv[++i];
        else if (!strcmp(argv[i], "--quiet")) quiet = 1;
    }

    static const uint32_t uniform[] = { 512 };
    static const uint32_t ragged[] = { 64, 127, 511, 128, 1024, 73, 256 };
    static const uint32_t tiny[] = { 33 };
    const uint32_t* q = uniform;
    uint32_t nq = 1;
    if (!strcmp(part, "ragged")) { q = ragged; nq = 7; }
    else if (!strcmp(part, "tiny")) { q = tiny; nq = 1; }

    xen_config cfg;
    xen_config_default(&cfg);
    cfg.seed = seed;
    xen_engine* e = xen_engine_create(&cfg);
    uint64_t mf;
    float* mat = xen_fixture_material(cfg.sample_rate, 20260101, 2.0, &mf);
    xen_id asset = xen_asset_publish(e, mat, mf, 1, 110.0, "material");
    free(mat);

    xen_root_follow_params rf = { 120.0, 8.0, 1.85, 0.5, 0.45, 0.5 };
    xen_id prog = xsn_root_follow_create(e, asset, &rf, seed);
    uint32_t ep = xen_engine_epoch(e);
    xen_program_activate(e, ep, prog, 1, 0);
    xsn_root_follow_set_root(e, 96.0, 0);
    xsn_forge_set(e, 0.32, 0.55, 0.42, 0);
    xsn_master_gain(e, 0.8, 0);

    uint32_t sr = cfg.sample_rate;
    xsn_root_follow_set_root(e, 128.0, (xen_frame)(sr * 2));
    for (int i = 0; i < 6; i++) {
        xen_gesture g = {0};
        g.kind = XEN_G_ATTACK;
        g.token = (uint32_t)(100 + i);
        g.frame = (xen_frame)(sr / 2 + i * sr);
        g.p0 = (float)(144.0 * (1.0 + 0.125 * i)); /* demo only, resolved Hz */
        g.p1 = 1.0f;
        g.p2 = (float)(i % 3 - 1) * 0.5f;
        g.pitch_mode = XEN_PITCH_HZ;
        xen_gesture_submit(e, ep, &g);
    }

    uint64_t frames = (uint64_t)(seconds * sr);
    float* buf = (float*)malloc((size_t)frames * 2 * sizeof(float));
    xen_backend* be = NULL;
    xen_backend_null_create(e, q, nq, &be);
    xen_record_start(e, out);
    xen_backend_start(be);

    uint64_t pos = 0;
    while (pos < frames) {
        uint64_t n = frames - pos < 8192 ? frames - pos : 8192;
        xen_backend_null_run(be, n, buf + pos * 2);
        pos += n;
    }
    xen_backend_stop(be);
    xen_record_stop(e);

    xen_telemetry t;
    xen_engine_telemetry(e, &t);
    uint32_t h = xen_hash_f32(buf, (size_t)frames * 2);
    if (!quiet) {
        printf("{\n");
        printf("  \"seconds\": %.3f,\n", seconds);
        printf("  \"seed\": %llu,\n", (unsigned long long)seed);
        printf("  \"partition\": \"%s\",\n", part);
        printf("  \"sample_rate\": %u,\n", t.sample_rate);
        printf("  \"frames\": %llu,\n", (unsigned long long)frames);
        printf("  \"hash\": \"%08x\",\n", h);
        printf("  \"rms\": %.6f,\n", xen_rms(buf, 0, (size_t)frames * 2));
        printf("  \"peak\": %.6f,\n", (double)(t.peak_l > t.peak_r ? t.peak_l : t.peak_r));
        printf("  \"grains_emitted\": %llu,\n", (unsigned long long)t.grains_emitted);
        printf("  \"grains_denied\": %llu,\n", (unsigned long long)t.grains_denied_no_voice);
        printf("  \"attacks_executed\": %llu,\n", (unsigned long long)t.attacks_executed);
        printf("  \"voices_peak\": %u,\n", t.voices_peak);
        printf("  \"nonfinite_blocks\": %llu,\n", (unsigned long long)t.nonfinite_blocks);
        printf("  \"recorder_status\": %u,\n", t.recorder_status);
        printf("  \"recorder_frames\": %llu,\n", (unsigned long long)t.recorder_frames);
        printf("  \"wav\": \"%s\"\n", out);
        printf("}\n");
    }
    free(buf);
    xen_backend_destroy(be);
    xen_engine_destroy(e);
    return 0;
}
