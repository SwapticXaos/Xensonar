#define _GNU_SOURCE
#define _POSIX_C_SOURCE 200809L
#include <math.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

#define SAMPLE_RATE 48000u
#define BLOCK_FRAMES 128u
#define TABLE_SIZE 4096u
#define WARMUP_BLOCKS 2000u
#define MEASURE_BLOCKS 12000u
#define MAX_BODIES 64u
#define PI2 6.283185307179586476925286766559

typedef struct {
  double phase;
  double increment;
  float env;
  float b0, b1, b2, a1, a2;
  float z1, z2;
} StressBody;

static float table[TABLE_SIZE];
static volatile float output_sink = 0.0f;

static uint64_t now_ns(void) {
  struct timespec t;
  clock_gettime(CLOCK_MONOTONIC_RAW, &t);
  return (uint64_t)t.tv_sec * 1000000000ull + (uint64_t)t.tv_nsec;
}

static int cmp_u64(const void *a, const void *b) {
  const uint64_t x = *(const uint64_t *)a;
  const uint64_t y = *(const uint64_t *)b;
  return x < y ? -1 : x > y ? 1 : 0;
}

static float wavetable(double phase) {
  uint32_t i0 = (uint32_t)phase;
  uint32_t i1 = (i0 + 1u) & (TABLE_SIZE - 1u);
  float frac = (float)(phase - (double)i0);
  return table[i0] + (table[i1] - table[i0]) * frac;
}

static void lowpass(float *b0, float *b1, float *b2, float *a1, float *a2) {
  double w = PI2 * 2400.0 / (double)SAMPLE_RATE;
  double cs = cos(w);
  double alpha = sin(w) / (2.0 * pow(10.0, 1.0 / 20.0));
  double z = 1.0 + alpha;
  *b0 = (float)(((1.0 - cs) / 2.0) / z);
  *b1 = (float)((1.0 - cs) / z);
  *b2 = *b0;
  *a1 = (float)((-2.0 * cs) / z);
  *a2 = (float)((1.0 - alpha) / z);
}

static void init_bodies(StressBody *bodies, unsigned count) {
  float b0, b1, b2, a1, a2;
  lowpass(&b0, &b1, &b2, &a1, &a2);
  memset(bodies, 0, sizeof(*bodies) * count);
  for (unsigned i = 0; i < count; ++i) {
    double hz = 82.406889 + (double)(i % 24u) * 11.731 + (double)(i / 24u) * 3.17;
    bodies[i].increment = hz * (double)TABLE_SIZE / (double)SAMPLE_RATE;
    bodies[i].phase = (double)((i * 197u) & (TABLE_SIZE - 1u));
    bodies[i].env = 0.025f + (float)(i % 7u) * 0.001f;
    bodies[i].b0 = b0; bodies[i].b1 = b1; bodies[i].b2 = b2;
    bodies[i].a1 = a1; bodies[i].a2 = a2;
  }
}

static void render_block(StressBody *bodies, unsigned count) {
  float checksum = 0.0f;
  for (unsigned f = 0; f < BLOCK_FRAMES; ++f) {
    float mix = 0.0f;
    for (unsigned i = 0; i < count; ++i) {
      StressBody *v = &bodies[i];
      float x = wavetable(v->phase);
      v->phase += v->increment;
      if (v->phase >= (double)TABLE_SIZE) v->phase -= (double)TABLE_SIZE;
      float y = v->b0 * x + v->z1;
      v->z1 = v->b1 * x - v->a1 * y + v->z2;
      v->z2 = v->b2 * x - v->a2 * y;
      mix += y * v->env;
    }
    checksum += mix * 0.000001f;
  }
  output_sink += checksum;
}

static void emit_scenario(unsigned bodies_count) {
  StressBody bodies[MAX_BODIES];
  uint64_t samples[MEASURE_BLOCKS];
  const uint64_t quantum_ns = (uint64_t)BLOCK_FRAMES * 1000000000ull / SAMPLE_RATE;
  init_bodies(bodies, bodies_count);
  for (unsigned i = 0; i < WARMUP_BLOCKS; ++i) render_block(bodies, bodies_count);
  for (unsigned i = 0; i < MEASURE_BLOCKS; ++i) {
    uint64_t a = now_ns();
    render_block(bodies, bodies_count);
    uint64_t b = now_ns();
    samples[i] = b - a;
  }
  qsort(samples, MEASURE_BLOCKS, sizeof(samples[0]), cmp_u64);
  const uint64_t p50 = samples[MEASURE_BLOCKS / 2u];
  const uint64_t p95 = samples[(MEASURE_BLOCKS * 95u) / 100u];
  const uint64_t p99 = samples[(MEASURE_BLOCKS * 99u) / 100u];
  const uint64_t max = samples[MEASURE_BLOCKS - 1u];
  printf("{\"bodies\":%u,\"p50Ns\":%llu,\"p95Ns\":%llu,\"p99Ns\":%llu,\"maxNs\":%llu,\"quantumNs\":%llu,\"p50QuantumPct\":%.6f,\"p95QuantumPct\":%.6f,\"p99QuantumPct\":%.6f,\"maxQuantumPct\":%.6f}",
         bodies_count,
         (unsigned long long)p50, (unsigned long long)p95,
         (unsigned long long)p99, (unsigned long long)max,
         (unsigned long long)quantum_ns,
         (double)p50 * 100.0 / (double)quantum_ns,
         (double)p95 * 100.0 / (double)quantum_ns,
         (double)p99 * 100.0 / (double)quantum_ns,
         (double)max * 100.0 / (double)quantum_ns);
}

int main(void) {
  const unsigned scenarios[] = {8u, 16u, 32u, 64u};
  for (unsigned i = 0; i < TABLE_SIZE; ++i) table[i] = sinf((float)(PI2 * (double)i / (double)TABLE_SIZE));
  printf("{\"schema\":\"xensonar.p0n.synthetic-headroom.v1\",\"physicalAudio\":false,\"claim\":\"synthetic-steady-state-dsp-cost-only\",\"sampleRate\":%u,\"blockFrames\":%u,\"warmupBlocks\":%u,\"measureBlocks\":%u,\"bodyDefinition\":\"one wavetable interpolation + one TDF-II biquad + envelope multiply + mono mix per sample; no ingress/program/lifecycle work\",\"scenarios\":[",
         SAMPLE_RATE, BLOCK_FRAMES, WARMUP_BLOCKS, MEASURE_BLOCKS);
  for (unsigned i = 0; i < sizeof(scenarios)/sizeof(scenarios[0]); ++i) {
    if (i) putchar(',');
    emit_scenario(scenarios[i]);
  }
  printf("],\"sink\":%.9g}\n", (double)output_sink);
  return 0;
}
