/* xen_backend_null.c — deterministic offline device.
 *
 * Exists because offline rendering is a first-class requirement, not a test
 * convenience. It calls exactly the same xen_engine_render() the PipeWire
 * backend calls. There is no offline DSP path anywhere in this tree.
 *
 * The cycling quantum list is the whole point: it lets a test prove that
 * callback partitioning is not musical time.
 */
#include "../xen_internal.h"
#include <stdlib.h>
#include <string.h>

typedef struct {
    uint32_t quanta[32];
    uint32_t n_quanta;
    uint32_t cursor;
    uint32_t max_q;
    float*   l;
    float*   r;
    uint64_t frames_rendered;
    int      running;
} null_impl;

static int null_start(xen_backend* b) { ((null_impl*)b->impl)->running = 1; return XEN_OK; }
static int null_stop(xen_backend* b)  { ((null_impl*)b->impl)->running = 0; return XEN_OK; }

static void null_destroy(xen_backend* b) {
    null_impl* im = (null_impl*)b->impl;
    free(im->l);
    free(im->r);
    free(im);
    free(b);
}

static void null_query(const xen_backend* b, xen_backend_info* out) {
    const null_impl* im = (const null_impl*)b->impl;
    memset(out, 0, sizeof *out);
    out->sample_rate = b->e->cfg.sample_rate;
    out->channels = 2;
    out->last_quantum = im->n_quanta ? im->quanta[(im->cursor + im->n_quanta - 1) % im->n_quanta] : 0;
    out->frames_rendered = im->frames_rendered;
    out->backend_xruns = 0;          /* a null device cannot underrun */
    out->running = im->running;
    snprintf(out->name, sizeof out->name, "null");
}

int xen_backend_null_create(xen_engine* e, const uint32_t* quanta, uint32_t n,
                            xen_backend** out) {
    if (!e || !out) return XEN_ERR_ARG;
    xen_backend* b = (xen_backend*)calloc(1, sizeof(xen_backend));
    null_impl* im = (null_impl*)calloc(1, sizeof(null_impl));
    if (!b || !im) { free(b); free(im); return XEN_ERR_ARG; }
    if (!quanta || n == 0) {
        im->quanta[0] = 512;
        im->n_quanta = 1;
    } else {
        im->n_quanta = n > 32 ? 32 : n;
        for (uint32_t i = 0; i < im->n_quanta; i++) im->quanta[i] = quanta[i] ? quanta[i] : 1;
    }
    im->max_q = 1;
    for (uint32_t i = 0; i < im->n_quanta; i++) if (im->quanta[i] > im->max_q) im->max_q = im->quanta[i];
    im->l = (float*)calloc(im->max_q, sizeof(float));
    im->r = (float*)calloc(im->max_q, sizeof(float));
    if (!im->l || !im->r) { free(im->l); free(im->r); free(im); free(b); return XEN_ERR_ARG; }
    b->e = e;
    b->impl = im;
    b->start = null_start;
    b->stop = null_stop;
    b->destroy = null_destroy;
    b->query = null_query;
    *out = b;
    return XEN_OK;
}

int xen_backend_null_run(xen_backend* b, uint64_t frames, float* out_interleaved) {
    if (!b || !b->impl) return XEN_ERR_ARG;
    null_impl* im = (null_impl*)b->impl;
    uint64_t done = 0;
    while (done < frames) {
        uint32_t q = im->quanta[im->cursor % im->n_quanta];
        im->cursor++;
        if ((uint64_t)q > frames - done) q = (uint32_t)(frames - done);
        xen_engine_render(b->e, im->l, im->r, q);
        if (out_interleaved) {
            for (uint32_t i = 0; i < q; i++) {
                out_interleaved[(done + i) * 2u] = im->l[i];
                out_interleaved[(done + i) * 2u + 1u] = im->r[i];
            }
        }
        done += q;
        im->frames_rendered += q;
    }
    return XEN_OK;
}

/* ------------------------------------------------------- shared vtable api */
int  xen_backend_start(xen_backend* b)   { return b && b->start ? b->start(b) : XEN_ERR_ARG; }
int  xen_backend_stop(xen_backend* b)    { return b && b->stop ? b->stop(b) : XEN_ERR_ARG; }
void xen_backend_destroy(xen_backend* b) { if (b && b->destroy) b->destroy(b); }
void xen_backend_query(const xen_backend* b, xen_backend_info* out) {
    if (b && b->query && out) b->query(b, out);
    else if (out) memset(out, 0, sizeof *out);
}
