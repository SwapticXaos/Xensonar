#define _POSIX_C_SOURCE 200809L
#include "p0_native_audio_driver.h"
#include <errno.h>
#include <pthread.h>
#include <stdatomic.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#define P0N_NULL_MAX_BLOCK 256u

typedef struct {
  P0NAudioFormat format;
  P0NRenderCallback render;
  void* userdata;
  pthread_t thread;
  atomic_int running;
  atomic_ullong obs_seq;
  atomic_ullong obs_callback_index;
  atomic_ullong obs_frame_start;
  atomic_uint obs_frames;
  atomic_ullong obs_started_ns;
  atomic_ullong obs_finished_ns;
  atomic_int obs_underrun;
  atomic_ullong obs_underrun_count;
  float buffer[P0N_NULL_MAX_BLOCK * 2u];
} P0NNullState;

static uint64_t now_ns(void) {
  struct timespec ts;
  clock_gettime(CLOCK_MONOTONIC, &ts);
  return (uint64_t)ts.tv_sec * 1000000000ull + (uint64_t)ts.tv_nsec;
}

static struct timespec ns_to_ts(uint64_t ns) {
  struct timespec ts;
  ts.tv_sec = (time_t)(ns / 1000000000ull);
  ts.tv_nsec = (long)(ns % 1000000000ull);
  return ts;
}

static void* null_thread(void* opaque) {
  P0NNullState* s = (P0NNullState*)opaque;
  const uint64_t quantum_ns = ((uint64_t)s->format.block_frames * 1000000000ull) / s->format.sample_rate;
  uint64_t deadline = now_ns();
  uint64_t frame = 0;
  uint64_t index = 0;
  while (atomic_load_explicit(&s->running, memory_order_acquire)) {
    deadline += quantum_ns;
    uint64_t started = now_ns();
    s->render(s->buffer, s->format.block_frames, s->userdata);
    uint64_t finished = now_ns();
    int underrun = finished > deadline;
    if (underrun) atomic_fetch_add_explicit(&s->obs_underrun_count, 1u, memory_order_relaxed);
    uint64_t seq = atomic_load_explicit(&s->obs_seq, memory_order_seq_cst);
    atomic_store_explicit(&s->obs_seq, seq + 1u, memory_order_seq_cst);
    atomic_store_explicit(&s->obs_callback_index, index++, memory_order_seq_cst);
    atomic_store_explicit(&s->obs_frame_start, frame, memory_order_seq_cst);
    atomic_store_explicit(&s->obs_frames, s->format.block_frames, memory_order_seq_cst);
    atomic_store_explicit(&s->obs_started_ns, started, memory_order_seq_cst);
    atomic_store_explicit(&s->obs_finished_ns, finished, memory_order_seq_cst);
    atomic_store_explicit(&s->obs_underrun, underrun, memory_order_seq_cst);
    atomic_store_explicit(&s->obs_seq, seq + 2u, memory_order_seq_cst);
    frame += s->format.block_frames;
    struct timespec ts = ns_to_ts(deadline);
    int rc;
    do { rc = clock_nanosleep(CLOCK_MONOTONIC, TIMER_ABSTIME, &ts, NULL); } while (rc == EINTR);
  }
  return NULL;
}

static int null_prepare(P0NAudioDriver* driver, const P0NAudioFormat* requested,
                        P0NRenderCallback render, void* userdata) {
  if (!driver || !requested || !render || requested->channels != 2u || requested->block_frames == 0u
      || requested->block_frames > P0N_NULL_MAX_BLOCK || requested->sample_rate < 8000u) return 0;
  P0NNullState* s = (P0NNullState*)calloc(1, sizeof(P0NNullState));
  if (!s) return 0;
  s->format = *requested;
  s->format.backend_name = "null-realtime-thread";
  s->render = render;
  s->userdata = userdata;
  atomic_init(&s->running, 0);
  atomic_init(&s->obs_seq, 0u);
  atomic_init(&s->obs_callback_index, 0u);
  atomic_init(&s->obs_frame_start, 0u);
  atomic_init(&s->obs_frames, 0u);
  atomic_init(&s->obs_started_ns, 0u);
  atomic_init(&s->obs_finished_ns, 0u);
  atomic_init(&s->obs_underrun, 0);
  atomic_init(&s->obs_underrun_count, 0u);
  driver->impl = s;
  return 1;
}

static int null_start(P0NAudioDriver* driver) {
  P0NNullState* s = (P0NNullState*)driver->impl;
  if (!s || atomic_exchange(&s->running, 1)) return 0;
  if (pthread_create(&s->thread, NULL, null_thread, s) != 0) {
    atomic_store(&s->running, 0); return 0;
  }
  return 1;
}

static int null_stop(P0NAudioDriver* driver) {
  P0NNullState* s = (P0NNullState*)driver->impl;
  if (!s) return 0;
  if (atomic_exchange(&s->running, 0)) pthread_join(s->thread, NULL);
  return 1;
}

static int null_query(P0NAudioDriver* driver, P0NAudioFormat* actual) {
  P0NNullState* s = (P0NNullState*)driver->impl;
  if (!s || !actual) return 0;
  *actual = s->format;
  return 1;
}

static int null_obs(P0NAudioDriver* driver, P0NCallbackObservation* observation) {
  P0NNullState* s = (P0NNullState*)driver->impl;
  if (!s || !observation) return 0;
  for (unsigned attempt = 0; attempt < 4u; ++attempt) {
    uint64_t a = atomic_load_explicit(&s->obs_seq, memory_order_seq_cst);
    if (a & 1u) continue;
    P0NCallbackObservation v;
    v.callback_index = atomic_load_explicit(&s->obs_callback_index, memory_order_seq_cst);
    v.frame_start = atomic_load_explicit(&s->obs_frame_start, memory_order_seq_cst);
    v.frames = atomic_load_explicit(&s->obs_frames, memory_order_seq_cst);
    v.callback_started_ns = atomic_load_explicit(&s->obs_started_ns, memory_order_seq_cst);
    v.callback_finished_ns = atomic_load_explicit(&s->obs_finished_ns, memory_order_seq_cst);
    v.underrun_reported = atomic_load_explicit(&s->obs_underrun, memory_order_seq_cst);
    v.underrun_count = atomic_load_explicit(&s->obs_underrun_count, memory_order_seq_cst);
    v.process_error_count = 0u;
    uint64_t b = atomic_load_explicit(&s->obs_seq, memory_order_seq_cst);
    if (a == b && !(b & 1u)) { *observation = v; return 1; }
  }
  return 0;
}

static void null_destroy(P0NAudioDriver* driver) {
  if (!driver || !driver->impl) return;
  null_stop(driver);
  free(driver->impl);
  driver->impl = NULL;
}

P0NAudioDriver p0n_create_null_driver(void) {
  P0NAudioDriver d;
  memset(&d, 0, sizeof(d));
  d.name = "null-realtime-thread";
  d.prepare = null_prepare;
  d.start = null_start;
  d.stop = null_stop;
  d.query_format = null_query;
  d.query_last_observation = null_obs;
  d.destroy = null_destroy;
  return d;
}
