/* xen_asset.c — immutable material, reference counted, deferred retirement.
 *
 * THE CONTRACT (this is the fix for the retirement defect):
 *
 *   An asset is destroyed only when BOTH are true
 *     prog_refs  == 0   no live program can generate future work from it
 *     voice_refs == 0   no live voice is reading it right now
 *
 *   xen_asset_retire() therefore never changes what you hear. It marks intent.
 *   A program that is merely *between* grains still holds prog_refs, so the
 *   grain that has not been generated yet is still guaranteed valid material.
 *   Retirement completes in xen_engine_maintain() on the control thread.
 *
 *   Creating a program against a retiring asset fails closed.
 */
#include "../xen_internal.h"
#include <stdlib.h>
#include <string.h>

xen_id xen_asset_publish(xen_engine* e, const float* interleaved, uint64_t frames,
                         uint32_t channels, double base_hz, const char* name) {
    if (!e || !interleaved || frames == 0 || channels == 0) return 0;
    /* EXPERIMENTAL: material is mixed to mono. The grain reader is mono in
     * this slice; a stereo reader is future work, not architecture. */
    float* data = (float*)malloc((size_t)frames * sizeof(float));
    if (!data) return 0;
    for (uint64_t i = 0; i < frames; i++) {
        double s = 0;
        for (uint32_t c = 0; c < channels; c++) s += (double)interleaved[i * channels + c];
        data[i] = (float)(s / (double)channels);
    }

    pthread_mutex_lock(&e->asset_lock);
    int32_t slot = -1;
    for (uint32_t i = 1; i < XEN_MAX_ASSETS; i++) {   /* slot 0 reserved */
        if (e->asset[i].state == XEN_A_FREE) { slot = (int32_t)i; break; }
    }
    if (slot < 0) {
        pthread_mutex_unlock(&e->asset_lock);
        free(data);
        return 0;
    }
    xen_asset* a = &e->asset[slot];
    a->data = data;
    a->frames = frames;
    a->base_hz = base_hz > 0 ? base_hz : 110.0;
    atomic_store_explicit(&a->voice_refs, 0, memory_order_relaxed);
    a->prog_refs = 0;
    a->state = XEN_A_LIVE;
    snprintf(a->name, sizeof(a->name), "%s", name ? name : "asset");
    xen_id h = xen_pack(0, a->gen, (uint32_t)slot);
    pthread_mutex_unlock(&e->asset_lock);
    return h;
}

/* Resolve without locking: gen+slot validation is enough for a read, and the
 * realtime thread never calls this. */
int xen_asset_slot_valid(const xen_engine* e, xen_id h, int32_t* slot) {
    uint32_t s = xen_h_slot(h);
    if (h == 0 || s == 0 || s >= XEN_MAX_ASSETS) return 0;
    const xen_asset* a = &e->asset[s];
    if (a->state == XEN_A_FREE) return 0;
    if (a->gen != xen_h_gen(h)) return 0;
    if (slot) *slot = (int32_t)s;
    return 1;
}

/* caller holds asset_lock */
void xen_assets_maintain_locked(xen_engine* e) {
    for (uint32_t i = 1; i < XEN_MAX_ASSETS; i++) {
        xen_asset* a = &e->asset[i];
        if (a->state != XEN_A_RETIRING) continue;
        if (a->prog_refs != 0) continue;
        if (atomic_load_explicit(&a->voice_refs, memory_order_acquire) != 0) continue;
        free(a->data);
        a->data = NULL;
        a->frames = 0;
        a->state = XEN_A_FREE;
        a->gen++;
        a->name[0] = 0;
    }
}

int xen_asset_retire(xen_engine* e, xen_id h) {
    if (!e) return XEN_ERR_ARG;
    pthread_mutex_lock(&e->asset_lock);
    int32_t slot = -1;
    if (!xen_asset_slot_valid(e, h, &slot)) {
        pthread_mutex_unlock(&e->asset_lock);
        return XEN_ERR_HANDLE;
    }
    e->asset[slot].state = XEN_A_RETIRING;
    xen_assets_maintain_locked(e);
    int done = (e->asset[slot].state == XEN_A_FREE);
    pthread_mutex_unlock(&e->asset_lock);
    return done ? XEN_RETIRE_DONE : XEN_RETIRE_DEFERRED;
}

int xen_asset_is_live(const xen_engine* e, xen_id h) {
    int32_t slot = -1;
    if (!e || !xen_asset_slot_valid(e, h, &slot)) return 0;
    return e->asset[slot].state == XEN_A_LIVE;
}
