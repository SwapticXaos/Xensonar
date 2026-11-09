/* xen_recorder.c — bounded RT -> writer handoff.
 *
 * The realtime thread pushes the exact samples it just sent to the backend
 * into a fixed ring. It never opens, writes, seeks or flushes anything. A
 * writer thread drains the ring into a WAV file. If the writer cannot keep
 * up the recorder latches XEN_REC_OVERRUN, stops accepting samples and the
 * host can see that the capture is not authoritative. Audio is never blocked
 * and an incomplete recording is never silently presented as complete.
 */
#include "../xen_internal.h"
#include <stdlib.h>
#include <string.h>
#include <time.h>

static uint32_t round_pow2(uint32_t v) {
    uint32_t p = 1;
    while (p < v && p < (1u << 30)) p <<= 1;
    return p;
}

int xen_recorder_init(xen_recorder* r, uint32_t cap_frames, uint32_t sr) {
    memset(r, 0, sizeof(*r));
    r->cap_frames = round_pow2(cap_frames < 4096 ? 4096 : cap_frames);
    r->ring = (float*)calloc((size_t)r->cap_frames * 2u, sizeof(float));
    if (!r->ring) return XEN_ERR_ARG;
    r->sample_rate = sr;
    atomic_store(&r->status, XEN_REC_IDLE);
    return XEN_OK;
}

void xen_recorder_free(xen_recorder* r) {
    free(r->ring);
    r->ring = NULL;
}

/* realtime side */
void xen_recorder_push(xen_recorder* r, const float* interleaved, uint32_t frames) {
    if (atomic_load_explicit(&r->status, memory_order_relaxed) != XEN_REC_ACTIVE) return;
    uint32_t w = atomic_load_explicit(&r->w, memory_order_relaxed);
    uint32_t rd = atomic_load_explicit(&r->r, memory_order_acquire);
    uint32_t used = w - rd;
    if (frames > r->cap_frames - used) {
        atomic_store_explicit(&r->status, XEN_REC_OVERRUN, memory_order_release);
        atomic_fetch_add_explicit(&r->overruns, 1, memory_order_relaxed);
        return;
    }
    uint32_t mask = r->cap_frames - 1;
    for (uint32_t i = 0; i < frames; i++) {
        uint32_t idx = (w + i) & mask;
        r->ring[idx * 2u]     = interleaved[i * 2u];
        r->ring[idx * 2u + 1] = interleaved[i * 2u + 1];
    }
    atomic_store_explicit(&r->w, w + frames, memory_order_release);
    atomic_fetch_add_explicit(&r->frames, frames, memory_order_relaxed);
}

/* consumer side (writer thread or test) */
uint32_t xen_recorder_pull(xen_recorder* r, float* dst, uint32_t max_frames) {
    uint32_t rd = atomic_load_explicit(&r->r, memory_order_relaxed);
    uint32_t w = atomic_load_explicit(&r->w, memory_order_acquire);
    uint32_t avail = w - rd;
    if (avail > max_frames) avail = max_frames;
    uint32_t mask = r->cap_frames - 1;
    for (uint32_t i = 0; i < avail; i++) {
        uint32_t idx = (rd + i) & mask;
        dst[i * 2u]     = r->ring[idx * 2u];
        dst[i * 2u + 1] = r->ring[idx * 2u + 1];
    }
    atomic_store_explicit(&r->r, rd + avail, memory_order_release);
    return avail;
}

/* ------------------------------------------------------------ wav writer */
static void wr_u32(FILE* f, uint32_t v) { fwrite(&v, 4, 1, f); }
static void wr_u16(FILE* f, uint16_t v) { fwrite(&v, 2, 1, f); }

static void* writer_main(void* ud) {
    xen_recorder* r = (xen_recorder*)ud;
    FILE* f = fopen(r->path, "wb");
    if (!f) {
        atomic_store(&r->status, XEN_REC_IO_FAILED);
        return NULL;
    }
    fwrite("RIFF", 1, 4, f); wr_u32(f, 0); fwrite("WAVE", 1, 4, f);
    fwrite("fmt ", 1, 4, f); wr_u32(f, 16); wr_u16(f, 3); wr_u16(f, 2);
    wr_u32(f, r->sample_rate); wr_u32(f, r->sample_rate * 8); wr_u16(f, 8); wr_u16(f, 32);
    fwrite("data", 1, 4, f); wr_u32(f, 0);

    enum { CH = 4096 };
    static _Thread_local float buf[CH * 2];
    uint64_t total = 0;
    struct timespec ts = { 0, 2 * 1000 * 1000 };
    for (;;) {
        uint32_t got = xen_recorder_pull(r, buf, CH);
        if (got) {
            if (fwrite(buf, sizeof(float) * 2, got, f) != got) {
                atomic_store(&r->status, XEN_REC_IO_FAILED);
                break;
            }
            total += got;
        } else {
            if (atomic_load(&r->stop)) break;
            nanosleep(&ts, NULL);
        }
    }
    uint32_t data_bytes = (uint32_t)(total * 8u);
    fseek(f, 4, SEEK_SET);  wr_u32(f, 36u + data_bytes);
    fseek(f, 40, SEEK_SET); wr_u32(f, data_bytes);
    fclose(f);
    return NULL;
}

int xen_record_start(xen_engine* e, const char* path) {
    if (!e) return XEN_ERR_ARG;
    xen_recorder* r = &e->rec;
    if (atomic_load(&r->status) == XEN_REC_ACTIVE) return XEN_ERR_STATE;
    atomic_store(&r->r, 0);
    atomic_store(&r->w, 0);
    atomic_store(&r->frames, 0);
    atomic_store(&r->stop, 0);
    atomic_store(&r->status, XEN_REC_ACTIVE);
    if (path && path[0]) {
        snprintf(r->path, sizeof(r->path), "%s", path);
        if (pthread_create(&r->thread, NULL, writer_main, r) != 0) {
            atomic_store(&r->status, XEN_REC_IO_FAILED);
            return XEN_ERR_IO;
        }
        r->thread_live = 1;
    }
    return XEN_OK;
}

int xen_record_stop(xen_engine* e) {
    if (!e) return XEN_ERR_ARG;
    xen_recorder* r = &e->rec;
    uint32_t st = atomic_load(&r->status);
    if (st == XEN_REC_ACTIVE) atomic_store(&r->status, XEN_REC_IDLE);
    atomic_store(&r->stop, 1);
    if (r->thread_live) {
        pthread_join(r->thread, NULL);
        r->thread_live = 0;
    }
    return (st == XEN_REC_OVERRUN || st == XEN_REC_IO_FAILED) ? XEN_ERR_STATE : XEN_OK;
}

int xen_record_status(const xen_engine* e) {
    return e ? (int)atomic_load(&((xen_engine*)e)->rec.status) : XEN_REC_IDLE;
}

uint32_t xen_record_drain(xen_engine* e, float* dst, uint32_t max_frames) {
    if (!e || !dst) return 0;
    return xen_recorder_pull(&e->rec, dst, max_frames);
}
