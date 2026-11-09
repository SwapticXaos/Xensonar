#define _POSIX_C_SOURCE 200809L
#include <pthread.h>
#include <sched.h>
#include <stdio.h>
#include <stdlib.h>
#include "../src/p0_native_post_master_pcm.h"
#define CHECK(x) do { if (!(x)) { fprintf(stderr, "FAIL line %d: %s\n", __LINE__, #x); exit(2); } } while (0)
static P0NPostMasterPcm pcm;
static atomic_int done, bad;
static void* audio(void* unused) {
  (void)unused;
  float output[256];
  while (!atomic_load(&done)) {
    if (p0n_post_master_render(&pcm, output, 128u)) {
      float tag = 0.0f;
      for (unsigned i=0;i<128u;i++) {
        float left = output[i*2u], right = output[i*2u+1u];
        if (!isfinite(left) || right != -left || (left != 0.0f && tag != 0.0f && left != tag)) atomic_store(&bad,1);
        if (left != 0.0f) tag=left;
      }
    }
    sched_yield();
  }
  return NULL;
}
int main(void) {
  p0n_post_master_init(&pcm);
  pthread_t thread; CHECK(!pthread_create(&thread,NULL,audio,NULL));
  float block[8192];
  uint32_t previous=0;
  for (unsigned iteration=1;iteration<=300;iteration++) {
    uint32_t gen=p0n_post_master_begin(&pcm,48000u,2u,128u);CHECK(gen==previous+1u);
    CHECK(!p0n_post_master_begin(&pcm,48000u,2u,128u)); /* Never reset an active ring. */
    for(unsigned i=0;i<4096u;i++){block[i*2u]=(float)iteration;block[i*2u+1u]=-(float)iteration;}
    CHECK(p0n_post_master_push(&pcm,gen,0u,0u,block,4096u)==1);
    CHECK(p0n_post_master_commit(&pcm,gen));
    while(!atomic_load(&pcm.rendered_frames))sched_yield();
    CHECK(!p0n_post_master_stop(&pcm,gen+1u));
    CHECK(p0n_post_master_stop(&pcm,gen));
    while(!p0n_post_master_stopped(&pcm,gen))sched_yield();
    CHECK(!p0n_post_master_commit(&pcm,gen));
    CHECK(p0n_post_master_stop(&pcm,gen)); /* An ACK retry is idempotent. */
    float silence[256];CHECK(p0n_post_master_render(&pcm,silence,128u)==1);
    for(unsigned i=0;i<256u;i++)CHECK(silence[i]==0.0f); /* No legacy resurrection. */
    previous=gen;
  }
  atomic_store(&done,1);CHECK(!pthread_join(thread,NULL));CHECK(!atomic_load(&bad));
  puts("post-master-concurrent-lifecycle: PASS (300 generations, real producer/audio threads)");
}
