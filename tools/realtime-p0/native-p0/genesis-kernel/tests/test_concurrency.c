/* Concurrent control/render smoke. This is intentionally not a musical
 * determinism test; it exercises the ownership boundary under a real render
 * thread while the single supported control producer submits live work,
 * program changes and epoch fences. Run under TSan for the strongest value. */
#include "xen_fixture.h"
#include <pthread.h>
#include <stdatomic.h>
#include <unistd.h>

typedef struct {
    xen_engine* e;
    _Atomic int run;
    _Atomic int bad;
} ctx_t;

static void* render_thread(void* arg) {
    ctx_t* c = (ctx_t*)arg;
    static const uint32_t q[] = {64,127,511,128,1024,73,256};
    float L[1024], R[1024];
    uint32_t i = 0;
    while (atomic_load_explicit(&c->run, memory_order_acquire)) {
        uint32_t n = q[i++ % (sizeof q/sizeof q[0])];
        xen_engine_render(c->e, L, R, n);
        for (uint32_t k=0;k<n;k++) {
            if (!isfinite(L[k]) || !isfinite(R[k])) atomic_store(&c->bad, 1);
        }
    }
    return NULL;
}

int main(void) {
    xen_test_begin("concurrent-control-render");
    xen_engine* e = xen_engine_create(NULL);
    uint64_t mf;
    float* mat = xen_fixture_material(48000, 91, 1.0, &mf);
    xen_id asset = xen_asset_publish(e, mat, mf, 1, 110.0, "mat");
    free(mat);

    uint32_t ep = xen_engine_epoch(e);
    xen_id prog = xen_program_create(e, ep, XEN_PROGRAM_GRANULAR, asset,
                                     XEN_DENSE_PARAMS, XEN_PROGRAM_PARAMS, 91);
    XCHECK(prog != 0, "initial program creation failed");
    XCHECK(xen_program_activate(e, ep, prog, 1, XEN_FRAME_ASAP) == XEN_OK,
           "initial activation failed");

    ctx_t c = { .e=e };
    atomic_store(&c.run, 1); atomic_store(&c.bad, 0);
    pthread_t th;
    XCHECK(pthread_create(&th, NULL, render_thread, &c) == 0, "render thread creation failed");

    uint64_t submits = 0;
    for (uint32_t i=0;i<2500;i++) {
        ep = xen_engine_epoch(e);
        (void)xen_state_set_latest(e, ep, XEN_STATE_FORGE_AMOUNT, (float)(i%100)/100.0f);
        if ((i % 3u)==0u) {
            xen_gesture g = {0};
            g.kind = XEN_G_ATTACK; g.token = 10000u+i; g.frame = XEN_FRAME_ASAP;
            g.p0 = 110.0f + (float)(i%300u); g.p1 = 0.4f; g.pitch_mode = XEN_PITCH_HZ;
            if (xen_gesture_submit(e, ep, &g) == XEN_OK) submits++;
        }
        if ((i % 23u)==0u && prog) {
            double p[XEN_PROGRAM_PARAMS]; memcpy(p, XEN_DENSE_PARAMS, sizeof p);
            p[4] = 0.2 + 0.001 * (double)(i%100u);
            (void)xen_program_update(e, ep, prog, p, XEN_PROGRAM_PARAMS, XEN_FRAME_ASAP);
        }
        if (i==700u || i==1600u) {
            ep = xen_engine_panic(e);
            xen_engine_maintain(e);
            prog = xen_program_create(e, ep, XEN_PROGRAM_GRANULAR, asset,
                                      XEN_DENSE_PARAMS, XEN_PROGRAM_PARAMS, 1000u+i);
            XCHECK(prog != 0, "new-epoch program creation failed at iteration %u", i);
            if (prog) XCHECK(xen_program_activate(e, ep, prog, 1, XEN_FRAME_ASAP) == XEN_OK,
                             "new-epoch activation failed at iteration %u", i);
        }
        if ((i & 63u)==0u) usleep(20);
    }

    /* Give the render owner a bounded opportunity to observe the final fence
     * before stopping it; this is still concurrent, not a control-side render. */
    xen_telemetry t;
    for (int tries=0; tries<5000; tries++) {
        xen_engine_telemetry(e, &t);
        if (t.epoch >= 3 && t.panics >= 1) break;
        usleep(100);
    }
    atomic_store_explicit(&c.run, 0, memory_order_release);
    pthread_join(th, NULL);
    xen_engine_maintain(e);
    xen_engine_telemetry(e, &t);
    XCHECK(!atomic_load(&c.bad), "non-finite sample observed during concurrent render");
    XCHECK(t.epoch == 3 && t.panics >= 1, "latest epoch fence was not observed (epoch=%u panics=%llu)", t.epoch, (unsigned long long)t.panics);
    XCHECK(submits > 100, "too few gestures accepted for meaningful stress (%llu)",
           (unsigned long long)submits);
    XCHECK(t.nonfinite_blocks == 0, "engine reported non-finite blocks");
    XNOTE("accepted gestures=%llu, panics=%llu, final epoch=%u",
          (unsigned long long)submits, (unsigned long long)t.panics, t.epoch);
    xen_engine_destroy(e);
    return xen_test_end();
}
