/* xen_fixture.h — deterministic test fixtures. Header only, test-side only.
 *
 * The synthetic material below is EXPERIMENTAL. It exists so a Golden Episode
 * needs no external audio file and so every test run is reproducible from
 * source alone. It is not Xensonar material.
 */
#ifndef XEN_FIXTURE_H
#define XEN_FIXTURE_H

#include "xen/xen_audio.h"
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ------------------------------------------------------------- tiny harness */
__attribute__((unused)) static int g_checks = 0, g_fails = 0;
static const char* g_test_name = "";

#define XCHECK(cond, ...)                                                    \
    do {                                                                     \
        g_checks++;                                                          \
        if (!(cond)) {                                                       \
            g_fails++;                                                       \
            fprintf(stderr, "  FAIL %s:%d  ", __FILE__, __LINE__);           \
            fprintf(stderr, __VA_ARGS__);                                    \
            fprintf(stderr, "\n");                                           \
        }                                                                    \
    } while (0)

#define XNOTE(...)                                                           \
    do { printf("       "); printf(__VA_ARGS__); printf("\n"); } while (0)

__attribute__((unused)) static int xen_test_begin(const char* name) {
    g_test_name = name;
    printf("[ %s ]\n", name);
    return 0;
}
__attribute__((unused)) static int xen_test_end(void) {
    printf("  %s: %d checks, %d failures\n", g_test_name, g_checks, g_fails);
    return g_fails ? 1 : 0;
}

/* --------------------------------------------------------------- material */
__attribute__((unused)) static float* xen_fixture_material(uint32_t sr, uint64_t seed, double seconds,
                                   uint64_t* out_frames) {
    uint64_t n = (uint64_t)(seconds * (double)sr);
    float* buf = (float*)malloc((size_t)n * sizeof(float));
    uint64_t s = seed ? seed : 1;
    double phase[9], amp[9], ratio[9];
    static const double lad[9] = { 1.0, 6.0/5.0, 3.0/2.0, 11.0/6.0, 2.0,
                                   12.0/5.0, 3.0, 11.0/3.0, 4.0 };
    for (int k = 0; k < 9; k++) {
        s = s * 6364136223846793005ULL + 1442695040888963407ULL;
        phase[k] = (double)((s >> 40) & 0xFFFF) / 65536.0;
        amp[k] = 0.9 / (1.0 + k * 0.8);
        ratio[k] = lad[k];
    }
    double base = 110.0, noise = 0.0;
    for (uint64_t i = 0; i < n; i++) {
        double t = (double)i / (double)sr, acc = 0.0;
        for (int k = 0; k < 9; k++)
            acc += amp[k] * sin(2.0 * M_PI * base * ratio[k] * t + phase[k] * 2.0 * M_PI);
        s = s * 6364136223846793005ULL + 1442695040888963407ULL;
        double wn = (double)(int32_t)(s >> 32) / 2147483648.0;
        noise = noise * 0.995 + wn * 0.05;
        double env = 0.6 + 0.4 * sin(2.0 * M_PI * 0.37 * t);
        buf[i] = (float)tanh((acc * 0.32 + noise * 0.35) * env);
    }
    *out_frames = n;
    return buf;
}

/* --------------------------------------------------------------- helpers */
__attribute__((unused)) static uint32_t xen_hash_f32(const float* p, size_t n) {
    const unsigned char* b = (const unsigned char*)p;
    uint32_t h = 2166136261u;
    for (size_t i = 0; i < n * sizeof(float); i++) { h ^= b[i]; h *= 16777619u; }
    return h;
}

__attribute__((unused)) static int xen_all_finite(const float* p, size_t n) {
    for (size_t i = 0; i < n; i++) if (!isfinite(p[i])) return 0;
    return 1;
}

__attribute__((unused)) static double xen_rms(const float* p, size_t from, size_t to) {
    double s = 0;
    for (size_t i = from; i < to; i++) s += (double)p[i] * (double)p[i];
    return sqrt(s / (double)(to - from ? to - from : 1));
}

__attribute__((unused)) static long xen_first_onset(const float* p, size_t n, double thr) {
    for (size_t i = 0; i < n; i++) if (fabs((double)p[i]) > thr) return (long)i;
    return -1;
}

/* Standard dense episode used by several tests. EXPERIMENTAL operating point. */
static const double XEN_DENSE_PARAMS[XEN_PROGRAM_PARAMS] = {
    120.0, /* window_ms    */
    8.0,   /* step_ms      */
    1.85,  /* microdensity */
    0.5,   /* pitch spread */
    0.45,  /* gain         */
    0.5,   /* jitter       */
    0.0, 0.0
};

#endif /* XEN_FIXTURE_H */
