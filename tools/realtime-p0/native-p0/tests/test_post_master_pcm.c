#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../src/p0_native_post_master_pcm.h"

#define CHECK(x) do { if (!(x)) { fprintf(stderr, "CHECK failed at %s:%d: %s\n", __FILE__, __LINE__, #x); return 2; } } while (0)

static void fill_block(float* p, uint32_t frames, uint64_t absolute_start) {
  for (uint32_t i = 0; i < frames; ++i) {
    const float v = (float)((absolute_start + i) % 997u) / 997.0f;
    p[i * 2u] = v;
    p[i * 2u + 1u] = -v;
  }
}

static int exact_path(void) {
  P0NPostMasterPcm* p = calloc(1, sizeof(*p));
  CHECK(p != NULL);
  p0n_post_master_init(p);
  const uint32_t gen = p0n_post_master_begin(p, 48000u, 2u, 2048u);
  CHECK(gen == 1u);
  float block[1024u * 2u];
  fill_block(block, 1024u, 1000u);
  CHECK(p0n_post_master_push(p, gen, 0u, 1000u, block, 1024u) == 1);
  fill_block(block, 1024u, 2024u);
  CHECK(p0n_post_master_push(p, gen, 1u, 2024u, block, 1024u) == 1);
  CHECK(p0n_post_master_push(p, gen, 1u, 2024u, block, 1024u) == 2); /* idempotent HTTP retry */
  CHECK(atomic_load(&p->duplicate_blocks) == 1u);
  CHECK(p0n_post_master_available_read(p) == 2048u);
  CHECK(p0n_post_master_prefilled(p));
  float armed[256u];
  memset(armed, 1, sizeof(armed));
  CHECK(p0n_post_master_render(p, armed, 128u) == 1);
  for (uint32_t i=0; i<256u; ++i) CHECK(armed[i] == 0.0f);
  CHECK(p0n_post_master_available_read(p) == 2048u); /* Armed silence does not consume PCM. */
  CHECK(p0n_post_master_commit(p, gen));

  float out[512u * 2u];
  for (uint32_t q = 0u; q < 4u; ++q) {
    memset(out, 0, sizeof(out));
    CHECK(p0n_post_master_render(p, out, 512u) == 1);
    for (uint32_t i = 0u; i < 512u; ++i) {
      const uint64_t absolute = 1000u + (uint64_t)q * 512u + i;
      const float expected = (float)(absolute % 997u) / 997.0f;
      CHECK(fabsf(out[i * 2u] - expected) < 1e-7f);
      CHECK(fabsf(out[i * 2u + 1u] + expected) < 1e-7f);
    }
  }
  CHECK(p0n_post_master_available_read(p) == 0u);
  CHECK(atomic_load(&p->underrun_callbacks) == 0u);
  CHECK(atomic_load(&p->ingress_frames) == 2048u);
  CHECK(atomic_load(&p->rendered_frames) == 2048u);
  CHECK(p0n_post_master_stop(p, gen));
  free(p);
  return 0;
}

static int continuity_fault(void) {
  P0NPostMasterPcm* p = calloc(1, sizeof(*p)); CHECK(p);
  p0n_post_master_init(p); uint32_t gen = p0n_post_master_begin(p, 48000u, 2u, 512u); CHECK(gen);
  float block[256u * 2u]; fill_block(block, 256u, 0u);
  CHECK(p0n_post_master_push(p, gen, 0u, 0u, block, 256u) == 1);
  fill_block(block, 256u, 999u);
  CHECK(p0n_post_master_push(p, gen, 1u, 999u, block, 256u) == -1);
  CHECK(atomic_load(&p->continuity_errors) == 1u);
  CHECK(atomic_load(&p->fault_latched) == 1u);
  CHECK(!p0n_post_master_prefilled(p));
  free(p); return 0;
}

static int backpressure(void) {
  P0NPostMasterPcm* p = calloc(1, sizeof(*p)); CHECK(p);
  p0n_post_master_init(p); uint32_t gen = p0n_post_master_begin(p, 48000u, 2u, 1024u); CHECK(gen);
  float* block = calloc(P0N_POST_MASTER_MAX_BLOCK_FRAMES * 2u, sizeof(float)); CHECK(block);
  uint64_t seq=0u, frame=0u; int rejected=0;
  while (p0n_post_master_available_write(p) >= P0N_POST_MASTER_MAX_BLOCK_FRAMES) {
    fill_block(block, P0N_POST_MASTER_MAX_BLOCK_FRAMES, frame);
    CHECK(p0n_post_master_push(p, gen, seq++, frame, block, P0N_POST_MASTER_MAX_BLOCK_FRAMES) == 1);
    frame += P0N_POST_MASTER_MAX_BLOCK_FRAMES;
  }
  fill_block(block, P0N_POST_MASTER_MAX_BLOCK_FRAMES, frame);
  rejected = p0n_post_master_push(p, gen, seq, frame, block, P0N_POST_MASTER_MAX_BLOCK_FRAMES);
  CHECK(rejected == 0);
  CHECK(atomic_load(&p->overflow_rejects) == 1u);
  CHECK(atomic_load(&p->continuity_errors) == 0u); /* backpressure is not timeline corruption */
  free(block); free(p); return 0;
}

static int underrun_latches(void) {
  P0NPostMasterPcm* p = calloc(1, sizeof(*p)); CHECK(p);
  p0n_post_master_init(p); uint32_t gen = p0n_post_master_begin(p, 48000u, 2u, 128u); CHECK(gen);
  float block[128u * 2u]; fill_block(block, 128u, 0u);
  CHECK(p0n_post_master_push(p, gen, 0u, 0u, block, 128u) == 1);
  CHECK(p0n_post_master_commit(p, gen));
  float out[256u * 2u]; memset(out, 1, sizeof(out));
  CHECK(p0n_post_master_render(p, out, 256u) == 1);
  CHECK(atomic_load(&p->underrun_callbacks) == 1u);
  CHECK(atomic_load(&p->underrun_frames) == 128u);
  CHECK(atomic_load(&p->fault_latched) == 1u);
  for (uint32_t i=128u*2u;i<256u*2u;++i) CHECK(out[i] == 0.0f);
  free(p); return 0;
}

int main(void) {
  CHECK(exact_path() == 0);
  CHECK(continuity_fault() == 0);
  CHECK(backpressure() == 0);
  CHECK(underrun_latches() == 0);
  puts("post-master-pcm: PASS");
  return 0;
}
