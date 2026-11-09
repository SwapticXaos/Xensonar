#ifndef XENSONAR_P0_NATIVE_AUDIO_DRIVER_H
#define XENSONAR_P0_NATIVE_AUDIO_DRIVER_H

#include <stdint.h>

typedef struct {
  uint32_t sample_rate;
  uint32_t channels;
  uint32_t block_frames;
  const char* backend_name;
} P0NAudioFormat;

typedef struct {
  uint64_t callback_index;
  uint64_t frame_start;
  uint32_t frames;
  uint64_t callback_started_ns;
  uint64_t callback_finished_ns;
  int underrun_reported;
  uint64_t underrun_count;
  uint64_t process_error_count;
} P0NCallbackObservation;

typedef void (*P0NRenderCallback)(float* interleaved_stereo, uint32_t frames, void* userdata);

/*
 * This is the ONLY device-facing seam for P0-N.
 * The DSP core, browser protocol and musical semantics must not depend on PipeWire,
 * ALSA, JACK, CPAL, or any other host API. Driver implementations may allocate
 * during prepare/open but never from the render callback.
 */
typedef struct P0NAudioDriver P0NAudioDriver;

struct P0NAudioDriver {
  const char* name;
  int (*prepare)(P0NAudioDriver* self, const P0NAudioFormat* requested,
                 P0NRenderCallback render, void* userdata);
  int (*start)(P0NAudioDriver* self);
  int (*stop)(P0NAudioDriver* self);
  int (*query_format)(P0NAudioDriver* self, P0NAudioFormat* actual);
  int (*query_last_observation)(P0NAudioDriver* self, P0NCallbackObservation* observation);
  void (*destroy)(P0NAudioDriver* self);
  void* impl;
};

#endif
