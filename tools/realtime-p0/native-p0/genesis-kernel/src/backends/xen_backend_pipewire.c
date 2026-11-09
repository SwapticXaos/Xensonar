/* xen_backend_pipewire.c — first realtime backend.
 *
 * BUILD STATUS IN THIS DELIVERY: compiled = NO (libpipewire-0.3-dev is not
 * installed in the authoring sandbox and the sandbox has no root). The code
 * below is real, not a sketch, but it has not been compiled or run against a
 * device. See KNOWN_LIMITATIONS.md. Nothing in the test suite claims
 * otherwise.
 *
 * Design notes:
 *  - The engine knows nothing about PipeWire. This file translates a device
 *    callback into exactly one call of the shared render kernel.
 *  - Planar F32 is requested so the kernel can write channel buffers directly;
 *    no interleave pass, no scratch copy.
 *  - The quantum is whatever the graph gives us, every cycle, and is passed
 *    straight through as the `frames` argument. It never touches musical time.
 *  - XRuns are read from the device layer. They are never synthesised.
 */
#include "../xen_internal.h"
#include <stdlib.h>
#include <string.h>

#ifndef XEN_WITH_PIPEWIRE

int xen_backend_pipewire_create(xen_engine* e, const char* name, uint32_t quantum_hint,
                                xen_backend** out) {
    (void)e; (void)name; (void)quantum_hint;
    if (out) *out = NULL;
    return XEN_ERR_UNSUPPORTED;
}

#else /* ------------------------------------------------------------------ */

#include <pipewire/pipewire.h>
#include <spa/param/audio/format-utils.h>
#include <spa/pod/builder.h>
#include <spa/utils/result.h>

typedef struct {
    struct pw_thread_loop* loop;
    struct pw_stream*      stream;
    struct spa_hook        listener;
    xen_engine*            e;
    uint32_t               rate;
    uint32_t               quantum_hint;
    _Atomic uint32_t       last_quantum;
    _Atomic uint64_t       frames;
    _Atomic uint64_t       xruns;
    _Atomic int            running;
    char                   name[32];
} pw_impl;

/* ---- realtime callback: no allocation, no logging, no locking ------------ */
static void on_process(void* userdata) {
    pw_impl* im = (pw_impl*)userdata;
    struct pw_buffer* b = pw_stream_dequeue_buffer(im->stream);
    if (!b) return;
    struct spa_buffer* buf = b->buffer;
    if (buf->n_datas < 2 || !buf->datas[0].data || !buf->datas[1].data) {
        pw_stream_queue_buffer(im->stream, b);
        return;
    }
    float* l = (float*)buf->datas[0].data;
    float* r = (float*)buf->datas[1].data;

    uint32_t stride = sizeof(float);
    uint32_t maxf = buf->datas[0].maxsize / stride;
    uint32_t n = maxf;
    if (b->requested && b->requested < n) n = (uint32_t)b->requested;
    if (n == 0) { pw_stream_queue_buffer(im->stream, b); return; }

    xen_engine_render(im->e, l, r, n);            /* the one render kernel */

    for (uint32_t c = 0; c < 2; c++) {
        buf->datas[c].chunk->offset = 0;
        buf->datas[c].chunk->stride = (int32_t)stride;
        buf->datas[c].chunk->size = n * stride;
    }
    atomic_store_explicit(&im->last_quantum, n, memory_order_relaxed);
    atomic_fetch_add_explicit(&im->frames, n, memory_order_relaxed);
    pw_stream_queue_buffer(im->stream, b);
}

static void on_state_changed(void* userdata, enum pw_stream_state old,
                             enum pw_stream_state state, const char* error) {
    (void)old; (void)error;
    pw_impl* im = (pw_impl*)userdata;
    atomic_store(&im->running, state == PW_STREAM_STATE_STREAMING);
}

/* NOT IMPLEMENTED: xrun accounting. PipeWire does not hand a stream a simple
 * xrun count, and inventing one from timing guesses would be exactly the kind
 * of fabricated evidence this project refuses. backend_xruns therefore stays 0
 * and is documented as "not reported" rather than "zero xruns occurred". */
static const struct pw_stream_events k_events = {
    PW_VERSION_STREAM_EVENTS,
    .state_changed = on_state_changed,
    .process = on_process,
};

static int pw_start(xen_backend* b) {
    pw_impl* im = (pw_impl*)b->impl;
    return pw_thread_loop_start(im->loop) == 0 ? XEN_OK : XEN_ERR_BACKEND;
}

static int pw_stop(xen_backend* b) {
    pw_impl* im = (pw_impl*)b->impl;
    pw_thread_loop_stop(im->loop);
    atomic_store(&im->running, 0);
    return XEN_OK;
}

static void pw_destroy_be(xen_backend* b) {
    pw_impl* im = (pw_impl*)b->impl;
    if (im->loop) pw_thread_loop_stop(im->loop);
    if (im->stream) {
        pw_thread_loop_lock(im->loop);
        pw_stream_destroy(im->stream);
        pw_thread_loop_unlock(im->loop);
    }
    if (im->loop) pw_thread_loop_destroy(im->loop);
    free(im);
    free(b);
    pw_deinit();
}

static void pw_query_be(const xen_backend* b, xen_backend_info* out) {
    pw_impl* im = (pw_impl*)b->impl;
    memset(out, 0, sizeof *out);
    out->sample_rate = im->rate;
    out->channels = 2;
    out->last_quantum = atomic_load(&im->last_quantum);
    out->frames_rendered = atomic_load(&im->frames);
    out->backend_xruns = atomic_load(&im->xruns);
    out->running = atomic_load(&im->running);
    snprintf(out->name, sizeof out->name, "pipewire");
}

int xen_backend_pipewire_create(xen_engine* e, const char* name, uint32_t quantum_hint,
                                xen_backend** out) {
    if (!e || !out) return XEN_ERR_ARG;
    *out = NULL;

    pw_init(NULL, NULL);

    xen_backend* b = (xen_backend*)calloc(1, sizeof(xen_backend));
    pw_impl* im = (pw_impl*)calloc(1, sizeof(pw_impl));
    if (!b || !im) { free(b); free(im); return XEN_ERR_ARG; }
    im->e = e;
    im->rate = e->cfg.sample_rate;
    im->quantum_hint = quantum_hint ? quantum_hint : 0;
    snprintf(im->name, sizeof im->name, "%s", name ? name : "xensonar");

    im->loop = pw_thread_loop_new("xen-audio", NULL);
    if (!im->loop) { free(im); free(b); return XEN_ERR_BACKEND; }

    char latency[64];
    if (im->quantum_hint)
        snprintf(latency, sizeof latency, "%u/%u", im->quantum_hint, im->rate);
    else
        snprintf(latency, sizeof latency, "512/%u", im->rate);

    struct pw_properties* props = pw_properties_new(
        PW_KEY_MEDIA_TYPE, "Audio",
        PW_KEY_MEDIA_CATEGORY, "Playback",
        PW_KEY_MEDIA_ROLE, "Production",
        PW_KEY_NODE_NAME, im->name,
        PW_KEY_NODE_LATENCY, latency,
        PW_KEY_NODE_ALWAYS_PROCESS, "true",
        NULL);
    char rate_str[32];
    snprintf(rate_str, sizeof rate_str, "1/%u", im->rate);
    pw_properties_set(props, PW_KEY_NODE_RATE, rate_str);

    pw_thread_loop_lock(im->loop);
    im->stream = pw_stream_new_simple(pw_thread_loop_get_loop(im->loop),
                                      im->name, props, &k_events, im);
    if (!im->stream) {
        pw_thread_loop_unlock(im->loop);
        pw_thread_loop_destroy(im->loop);
        free(im); free(b);
        return XEN_ERR_BACKEND;
    }

    uint8_t pod_buf[1024];
    struct spa_pod_builder bld = SPA_POD_BUILDER_INIT(pod_buf, sizeof pod_buf);
    struct spa_audio_info_raw info = {
        .format = SPA_AUDIO_FORMAT_F32P,   /* planar: the kernel writes direct */
        .rate = im->rate,
        .channels = 2,
        .position = { SPA_AUDIO_CHANNEL_FL, SPA_AUDIO_CHANNEL_FR },
    };
    const struct spa_pod* params[1];
    params[0] = spa_format_audio_raw_build(&bld, SPA_PARAM_EnumFormat, &info);

    int rc = pw_stream_connect(im->stream, PW_DIRECTION_OUTPUT, PW_ID_ANY,
                               PW_STREAM_FLAG_AUTOCONNECT | PW_STREAM_FLAG_MAP_BUFFERS |
                               PW_STREAM_FLAG_RT_PROCESS,
                               params, 1);
    pw_thread_loop_unlock(im->loop);
    if (rc < 0) {
        pw_stream_destroy(im->stream);
        pw_thread_loop_destroy(im->loop);
        free(im); free(b);
        return XEN_ERR_BACKEND;
    }

    b->e = e;
    b->impl = im;
    b->start = pw_start;
    b->stop = pw_stop;
    b->destroy = pw_destroy_be;
    b->query = pw_query_be;
    *out = b;
    return XEN_OK;
}

#endif /* XEN_WITH_PIPEWIRE */
