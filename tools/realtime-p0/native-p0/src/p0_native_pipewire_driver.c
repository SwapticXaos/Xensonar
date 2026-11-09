#define _POSIX_C_SOURCE 200809L
#include <errno.h>
#include <pthread.h>
#include <stdatomic.h>
#include <stdint.h>
#include <stdlib.h>
#include <time.h>

#include <pipewire/pipewire.h>
#include <spa/param/audio/format-utils.h>
#include <spa/node/io.h>

#include "p0_native_pipewire_driver.h"

#define P0N_PW_CHANNELS 2u
#define P0N_PW_START_WAIT_STEPS 200u
#define P0N_PW_START_WAIT_MS 10u

typedef struct {
  struct pw_main_loop* loop;
  struct pw_stream* stream;
  pthread_t loop_thread;
  int loop_thread_started;
  int connected;
  P0NRenderCallback render;
  void* render_userdata;
  uint32_t requested_rate;
  uint32_t requested_block;
  atomic_uint actual_rate;
  atomic_uint actual_channels;
  atomic_uint actual_block;
  atomic_int stream_state;
  atomic_uint process_errors;
  atomic_ullong xrun_count;
  atomic_uintptr_t io_position_ptr;
  uint64_t last_xrun_duration;
  int have_xrun_baseline;
  atomic_ullong obs_seq;
  atomic_ullong callback_index;
  atomic_ullong obs_frame_start;
  atomic_uint obs_frames;
  atomic_ullong obs_started_ns;
  atomic_ullong obs_finished_ns;
  atomic_int obs_underrun;
  uint64_t rendered_frames;
} P0NPipeWireImpl;

static uint64_t p0n_pw_now_ns(void) {
  struct timespec ts;
  clock_gettime(CLOCK_MONOTONIC, &ts);
  return (uint64_t)ts.tv_sec * 1000000000ull + (uint64_t)ts.tv_nsec;
}

static void p0n_pw_sleep_ms(unsigned ms) {
  struct timespec req={(time_t)(ms/1000u),(long)((ms%1000u)*1000000u)};
  while(nanosleep(&req,&req)!=0 && errno==EINTR) {}
}

static void p0n_pw_publish_observation(P0NPipeWireImpl* p, uint64_t index,
                                        uint64_t frame_start, uint32_t frames,
                                        uint64_t started_ns, uint64_t finished_ns,
                                        int underrun) {
  uint64_t s=atomic_load_explicit(&p->obs_seq,memory_order_seq_cst);
  atomic_store_explicit(&p->obs_seq,s+1u,memory_order_seq_cst);
  atomic_store_explicit(&p->callback_index,index,memory_order_seq_cst);
  atomic_store_explicit(&p->obs_frame_start,frame_start,memory_order_seq_cst);
  atomic_store_explicit(&p->obs_frames,frames,memory_order_seq_cst);
  atomic_store_explicit(&p->obs_started_ns,started_ns,memory_order_seq_cst);
  atomic_store_explicit(&p->obs_finished_ns,finished_ns,memory_order_seq_cst);
  atomic_store_explicit(&p->obs_underrun,underrun,memory_order_seq_cst);
  atomic_store_explicit(&p->obs_seq,s+2u,memory_order_seq_cst);
}

static void p0n_pw_state_changed(void* userdata, enum pw_stream_state old,
                                 enum pw_stream_state state, const char* error) {
  (void)old; (void)error;
  P0NPipeWireImpl* p=(P0NPipeWireImpl*)userdata;
  if(state==PW_STREAM_STATE_ERROR)
    atomic_fetch_add_explicit(&p->process_errors,1u,memory_order_relaxed);
  atomic_store_explicit(&p->stream_state,(int)state,memory_order_release);
}

static void p0n_pw_io_changed(void* userdata, uint32_t id, void* area, uint32_t size) {
  P0NPipeWireImpl* p=(P0NPipeWireImpl*)userdata;
  if(id!=SPA_IO_Position) return;
  if(area==NULL || size<sizeof(struct spa_io_position)) {
    atomic_store_explicit(&p->io_position_ptr,(uintptr_t)0,memory_order_release);
    return;
  }
  atomic_store_explicit(&p->io_position_ptr,(uintptr_t)area,memory_order_release);
}

static void p0n_pw_param_changed(void* userdata, uint32_t id, const struct spa_pod* param) {
  P0NPipeWireImpl* p=(P0NPipeWireImpl*)userdata;
  if(param==NULL || id!=SPA_PARAM_Format) return;
  struct spa_audio_info_raw info={0};
  if(spa_format_audio_raw_parse(param,&info)<0) return;
  if(info.format!=SPA_AUDIO_FORMAT_F32 || info.channels!=P0N_PW_CHANNELS) return;
  atomic_store_explicit(&p->actual_rate,info.rate,memory_order_release);
  atomic_store_explicit(&p->actual_channels,info.channels,memory_order_release);
}

static void p0n_pw_process(void* userdata) {
  P0NPipeWireImpl* p=(P0NPipeWireImpl*)userdata;
  struct pw_buffer* pwb=pw_stream_dequeue_buffer(p->stream);
  if(pwb==NULL) {
    atomic_fetch_add_explicit(&p->process_errors,1u,memory_order_relaxed);
    return;
  }
  struct spa_buffer* buf=pwb->buffer;
  const uint32_t stride=(uint32_t)(sizeof(float)*P0N_PW_CHANNELS);
  if(buf==NULL || buf->n_datas<1u || buf->datas[0].data==NULL ||
     buf->datas[0].chunk==NULL || buf->datas[0].maxsize<stride) {
    atomic_fetch_add_explicit(&p->process_errors,1u,memory_order_relaxed);
    if(pw_stream_queue_buffer(p->stream,pwb)<0)
      atomic_fetch_add_explicit(&p->process_errors,1u,memory_order_relaxed);
    return;
  }

  uint32_t frames=buf->datas[0].maxsize/stride;
  if(pwb->requested!=0u && pwb->requested<frames) frames=pwb->requested;
  if(frames==0u) {
    if(pw_stream_queue_buffer(p->stream,pwb)<0)
      atomic_fetch_add_explicit(&p->process_errors,1u,memory_order_relaxed);
    return;
  }

  uint64_t started=p0n_pw_now_ns();
  uint64_t frame_start=p->rendered_frames;
  int underrun=0;
  uintptr_t position_ptr=atomic_load_explicit(&p->io_position_ptr,memory_order_acquire);
  if(position_ptr!=0u) {
    const struct spa_io_position* position=(const struct spa_io_position*)position_ptr;
    /* PipeWire 1.0.5 already exposes spa_io_clock::xrun as accumulated xrun
       duration, but does not yet define SPA_IO_CLOCK_FLAG_XRUN_RECOVER.
       Baseline the accumulated value on the first callback after each start;
       any later increase proves at least one xrun occurred during this run. */
    const uint64_t xrun_duration=position->clock.xrun;
    if(p->have_xrun_baseline && xrun_duration>p->last_xrun_duration) {
      underrun=1;
      atomic_fetch_add_explicit(&p->xrun_count,1u,memory_order_relaxed);
    }
    p->last_xrun_duration=xrun_duration;
    p->have_xrun_baseline=1;
  }
  /* pw_stream_get_time_n() is RT-safe; obtaining it here also validates that the
     stream timing snapshot is readable while streaming without using it to invent
     musical time. */
  struct pw_time time_info;
  if(pw_stream_get_time_n(p->stream,&time_info,sizeof(time_info))<0)
    atomic_fetch_add_explicit(&p->process_errors,1u,memory_order_relaxed);

  p->render((float*)buf->datas[0].data,frames,p->render_userdata);
  p->rendered_frames+=frames;

  buf->datas[0].chunk->offset=0u;
  buf->datas[0].chunk->stride=(int32_t)stride;
  buf->datas[0].chunk->size=frames*stride;
  /* For audio PipeWire defines pw_buffer::size in frames; publishing it makes
     timing/queue accounting explicit instead of relying only on chunk bytes. */
  pwb->size=frames;
  atomic_store_explicit(&p->actual_block,frames,memory_order_release);
  uint64_t finished=p0n_pw_now_ns();
  uint64_t index=atomic_fetch_add_explicit(&p->callback_index,1u,memory_order_relaxed)+1u;
  p0n_pw_publish_observation(p,index,frame_start,frames,started,finished,underrun);
  if(pw_stream_queue_buffer(p->stream,pwb)<0)
    atomic_fetch_add_explicit(&p->process_errors,1u,memory_order_relaxed);
}

static const struct pw_stream_events p0n_pw_events={
  PW_VERSION_STREAM_EVENTS,
  .state_changed=p0n_pw_state_changed,
  .io_changed=p0n_pw_io_changed,
  .param_changed=p0n_pw_param_changed,
  .process=p0n_pw_process,
};

static void* p0n_pw_loop_main(void* userdata) {
  P0NPipeWireImpl* p=(P0NPipeWireImpl*)userdata;
  pw_main_loop_run(p->loop);
  return NULL;
}

static int p0n_pw_prepare(P0NAudioDriver* self, const P0NAudioFormat* requested,
                          P0NRenderCallback render, void* userdata) {
  if(self==NULL || requested==NULL || render==NULL || requested->sample_rate==0u ||
     requested->channels!=P0N_PW_CHANNELS) return 0;
  P0NPipeWireImpl* p=(P0NPipeWireImpl*)calloc(1u,sizeof(*p));
  if(p==NULL) return 0;
  p->render=render;
  p->render_userdata=userdata;
  p->requested_rate=requested->sample_rate;
  p->requested_block=requested->block_frames;
  /* Negotiated values remain unknown until PipeWire proves them.  Seeding
     these from the request would let query_format() masquerade as negotiation. */
  atomic_init(&p->actual_rate,0u);
  atomic_init(&p->actual_channels,0u);
  atomic_init(&p->actual_block,0u);
  atomic_init(&p->stream_state,(int)PW_STREAM_STATE_UNCONNECTED);
  atomic_init(&p->process_errors,0u);
  atomic_init(&p->xrun_count,0u);
  atomic_init(&p->io_position_ptr,(uintptr_t)0);
  p->last_xrun_duration=0u;
  p->have_xrun_baseline=0;
  atomic_init(&p->obs_seq,0u);
  atomic_init(&p->callback_index,0u);
  atomic_init(&p->obs_frame_start,0u);
  atomic_init(&p->obs_frames,0u);
  atomic_init(&p->obs_started_ns,0u);
  atomic_init(&p->obs_finished_ns,0u);
  atomic_init(&p->obs_underrun,0);

  pw_init(NULL,NULL);
  p->loop=pw_main_loop_new(NULL);
  if(p->loop==NULL) { free(p); return 0; }
  struct pw_properties* props=pw_properties_new(
    PW_KEY_MEDIA_TYPE,"Audio",
    PW_KEY_MEDIA_CATEGORY,"Playback",
    PW_KEY_MEDIA_ROLE,"Music",
    PW_KEY_NODE_NAME,"xensonar-p0-native",
    PW_KEY_NODE_DESCRIPTION,"Xensonar P0 Native Realtime",
    NULL);
  p->stream=pw_stream_new_simple(pw_main_loop_get_loop(p->loop),
    "xensonar-p0-native",props,&p0n_pw_events,p);
  if(p->stream==NULL) {
    pw_main_loop_destroy(p->loop);
    pw_deinit();
    free(p);
    return 0;
  }
  self->impl=p;
  return 1;
}

static int p0n_pw_start(P0NAudioDriver* self) {
  P0NPipeWireImpl* p=(P0NPipeWireImpl*)self->impl;
  if(p==NULL || p->loop_thread_started) return 0;
  /* A previous stop may not have dispatched the asynchronous UNCONNECTED state
     after the loop was joined. Never let a stale STREAMING observation make a
     restart report success before the new connection has actually transitioned. */
  atomic_store_explicit(&p->stream_state,(int)PW_STREAM_STATE_UNCONNECTED,memory_order_release);
  atomic_store_explicit(&p->actual_rate,0u,memory_order_release);
  atomic_store_explicit(&p->actual_channels,0u,memory_order_release);
  atomic_store_explicit(&p->actual_block,0u,memory_order_release);
  p->last_xrun_duration=0u;
  p->have_xrun_baseline=0;
  const struct spa_pod* params[1];
  uint8_t pod_buffer[1024];
  struct spa_pod_builder builder=SPA_POD_BUILDER_INIT(pod_buffer,sizeof(pod_buffer));
  struct spa_audio_info_raw info=SPA_AUDIO_INFO_RAW_INIT(
    .format=SPA_AUDIO_FORMAT_F32,
    .channels=P0N_PW_CHANNELS,
    .rate=p->requested_rate,
    .position={SPA_AUDIO_CHANNEL_FL,SPA_AUDIO_CHANNEL_FR});
  params[0]=spa_format_audio_raw_build(&builder,SPA_PARAM_EnumFormat,&info);
  int rc=pw_stream_connect(p->stream,PW_DIRECTION_OUTPUT,PW_ID_ANY,
    PW_STREAM_FLAG_AUTOCONNECT|PW_STREAM_FLAG_MAP_BUFFERS|PW_STREAM_FLAG_RT_PROCESS,
    params,1u);
  if(rc<0) return 0;
  p->connected=1;
  if(pthread_create(&p->loop_thread,NULL,p0n_pw_loop_main,p)!=0) {
    pw_stream_disconnect(p->stream);
    p->connected=0;
    return 0;
  }
  p->loop_thread_started=1;
  for(unsigned i=0;i<P0N_PW_START_WAIT_STEPS;++i) {
    int state=atomic_load_explicit(&p->stream_state,memory_order_acquire);
    uint32_t rate=atomic_load_explicit(&p->actual_rate,memory_order_acquire);
    uint32_t channels=atomic_load_explicit(&p->actual_channels,memory_order_acquire);
    if(state==(int)PW_STREAM_STATE_STREAMING && rate==p->requested_rate && channels==P0N_PW_CHANNELS) return 1;
    if(state==(int)PW_STREAM_STATE_ERROR) break;
    p0n_pw_sleep_ms(P0N_PW_START_WAIT_MS);
  }
  pw_main_loop_quit(p->loop);
  pthread_join(p->loop_thread,NULL);
  p->loop_thread_started=0;
  if(p->connected) { pw_stream_disconnect(p->stream); p->connected=0; }
  atomic_store_explicit(&p->stream_state,(int)PW_STREAM_STATE_UNCONNECTED,memory_order_release);
  return 0;
}

static int p0n_pw_stop(P0NAudioDriver* self) {
  P0NPipeWireImpl* p=(P0NPipeWireImpl*)self->impl;
  if(p==NULL) return 0;
  if(p->loop_thread_started) {
    pw_main_loop_quit(p->loop);
    pthread_join(p->loop_thread,NULL);
    p->loop_thread_started=0;
  }
  if(p->connected) {
    pw_stream_disconnect(p->stream);
    p->connected=0;
  }
  atomic_store_explicit(&p->stream_state,(int)PW_STREAM_STATE_UNCONNECTED,memory_order_release);
  return 1;
}

static int p0n_pw_query_format(P0NAudioDriver* self, P0NAudioFormat* actual) {
  P0NPipeWireImpl* p=(P0NPipeWireImpl*)self->impl;
  if(p==NULL || actual==NULL) return 0;
  actual->sample_rate=atomic_load_explicit(&p->actual_rate,memory_order_acquire);
  actual->channels=atomic_load_explicit(&p->actual_channels,memory_order_acquire);
  actual->block_frames=atomic_load_explicit(&p->actual_block,memory_order_acquire);
  actual->backend_name="pipewire";
  return 1;
}

static int p0n_pw_query_observation(P0NAudioDriver* self, P0NCallbackObservation* out) {
  P0NPipeWireImpl* p=(P0NPipeWireImpl*)self->impl;
  if(p==NULL || out==NULL) return 0;
  for(unsigned attempt=0;attempt<4u;++attempt) {
    uint64_t a=atomic_load_explicit(&p->obs_seq,memory_order_seq_cst);
    if(a&1u) continue;
    P0NCallbackObservation v;
    v.callback_index=atomic_load_explicit(&p->callback_index,memory_order_seq_cst);
    v.frame_start=atomic_load_explicit(&p->obs_frame_start,memory_order_seq_cst);
    v.frames=atomic_load_explicit(&p->obs_frames,memory_order_seq_cst);
    v.callback_started_ns=atomic_load_explicit(&p->obs_started_ns,memory_order_seq_cst);
    v.callback_finished_ns=atomic_load_explicit(&p->obs_finished_ns,memory_order_seq_cst);
    v.underrun_reported=atomic_load_explicit(&p->obs_underrun,memory_order_seq_cst);
    v.underrun_count=atomic_load_explicit(&p->xrun_count,memory_order_seq_cst);
    v.process_error_count=atomic_load_explicit(&p->process_errors,memory_order_seq_cst);
    uint64_t b=atomic_load_explicit(&p->obs_seq,memory_order_seq_cst);
    if(a==b && !(b&1u)) { *out=v; return 1; }
  }
  return 0;
}

static void p0n_pw_destroy(P0NAudioDriver* self) {
  P0NPipeWireImpl* p=(P0NPipeWireImpl*)self->impl;
  if(p==NULL) return;
  p0n_pw_stop(self);
  if(p->stream!=NULL) pw_stream_destroy(p->stream);
  if(p->loop!=NULL) pw_main_loop_destroy(p->loop);
  pw_deinit();
  free(p);
  self->impl=NULL;
}

P0NAudioDriver p0n_create_pipewire_driver(void) {
  P0NAudioDriver driver={0};
  driver.name="pipewire";
  driver.prepare=p0n_pw_prepare;
  driver.start=p0n_pw_start;
  driver.stop=p0n_pw_stop;
  driver.query_format=p0n_pw_query_format;
  driver.query_last_observation=p0n_pw_query_observation;
  driver.destroy=p0n_pw_destroy;
  return driver;
}
