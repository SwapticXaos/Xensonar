#include <assert.h>
#include <pthread.h>
#include <sched.h>
#include <stdatomic.h>
#include <stdint.h>
#include <stdio.h>
#include "../src/p0_native_transport.h"


typedef struct {
  P0NSpscAttackRing* ring;
} RingThreadFixture;

static void* ring_producer(void* opaque) {
  RingThreadFixture* fixture=(RingThreadFixture*)opaque;
  for(uint64_t sequence=1u;sequence<=50000u;++sequence) {
    P0NAttackGroup group={0};
    group.sequence=sequence;
    group.source_frame=sequence*10u;
    group.intended_frame=group.source_frame+240u;
    group.latest_admission_frame=group.intended_frame+4320u;
    group.note_count=1u;
    group.notes[0]=(P0NNote){7u,(uint32_t)sequence,220.0f,0.1f};
    while(!p0n_ring_push(fixture->ring,&group)) sched_yield();
  }
  return NULL;
}

static void* ring_consumer(void* opaque) {
  RingThreadFixture* fixture=(RingThreadFixture*)opaque;
  for(uint64_t expected=1u;expected<=50000u;) {
    P0NAttackGroup group={0};
    if(!p0n_ring_pop(fixture->ring,&group)) { sched_yield(); continue; }
    assert(group.sequence==expected);
    assert(group.source_frame==expected*10u);
    assert(group.intended_frame==group.source_frame+240u);
    assert(group.latest_admission_frame==group.intended_frame+4320u);
    assert(group.note_count==1u && group.notes[0].generation==(uint32_t)expected);
    ++expected;
  }
  return NULL;
}

typedef struct {
  P0NStateMailbox* state;
  atomic_uint done;
  atomic_uint snapshots;
} MailboxThreadFixture;

static float expected_root(uint64_t revision) {
  return 100.0f + (float)(revision % 1000u) * 0.125f;
}

static float expected_gain(uint64_t revision) {
  return (float)(revision % 8u) * 0.125f;
}

static void* mailbox_writer(void* opaque) {
  MailboxThreadFixture* fixture=(MailboxThreadFixture*)opaque;
  for(uint64_t revision=1u;revision<=200000u;++revision) {
    assert(p0n_state_write(fixture->state,revision,expected_root(revision),expected_gain(revision))==1);
  }
  atomic_store_explicit(&fixture->done,1u,memory_order_release);
  return NULL;
}

static void* mailbox_reader(void* opaque) {
  MailboxThreadFixture* fixture=(MailboxThreadFixture*)opaque;
  uint64_t last=0u;
  while(!atomic_load_explicit(&fixture->done,memory_order_acquire) || last<200000u) {
    uint64_t revision=0u;float root=0.0f,gain=0.0f;
    if(!p0n_state_read(fixture->state,&revision,&root,&gain)) continue;
    assert(revision>=last);
    if(revision>0u) {
      assert(root==expected_root(revision));
      assert(gain==expected_gain(revision));
    }
    last=revision;
    atomic_fetch_add_explicit(&fixture->snapshots,1u,memory_order_relaxed);
  }
  return NULL;
}

int main(void){
  P0NSpscAttackRing ring; p0n_ring_init(&ring); P0NAttackGroup g={0};
  for(unsigned i=0;i<P0N_NORMAL_CAPACITY;i++){
    g.sequence=i+1;g.source_frame=1000u+i;g.intended_frame=1240u+i;g.latest_admission_frame=5560u+i;g.note_count=1;
    assert(p0n_ring_push(&ring,&g)==1);
  }
  assert(p0n_ring_push(&ring,&g)==0);assert(atomic_load(&ring.rejected_full)==1);
  for(unsigned i=0;i<P0N_NORMAL_CAPACITY;i++){
    P0NAttackGroup out={0};assert(p0n_ring_pop(&ring,&out)==1);assert(out.sequence==i+1);
    assert(out.source_frame==1000u+i);assert(out.intended_frame==1240u+i);assert(out.latest_admission_frame==5560u+i);
  }
  assert(p0n_ring_pop(&ring,&g)==0);

  P0NSpscAttackRing threaded_ring;p0n_ring_init(&threaded_ring);RingThreadFixture ring_fixture={.ring=&threaded_ring};
  pthread_t ring_writer,ring_reader;assert(pthread_create(&ring_writer,NULL,ring_producer,&ring_fixture)==0);assert(pthread_create(&ring_reader,NULL,ring_consumer,&ring_fixture)==0);
  assert(pthread_join(ring_writer,NULL)==0);assert(pthread_join(ring_reader,NULL)==0);
  assert(atomic_load(&threaded_ring.write_count)==50000u);assert(atomic_load(&threaded_ring.read_count)==50000u);

  P0NStateMailbox state;p0n_state_init(&state,220,1);assert(p0n_state_is_lock_free(&state));
  for(unsigned i=1;i<=1000;i++)assert(p0n_state_write(&state,i,220.0f+i*.01f,1.0f)==1);
  assert(p0n_state_write(&state,999u,999.0f,0.0f)==0);
  uint64_t rev=0;float hz=0,gain=0;assert(p0n_state_read(&state,&rev,&hz,&gain));assert(rev==1000);

  P0NStateMailbox threaded_state;p0n_state_init(&threaded_state,220.0f,1.0f);assert(p0n_state_is_lock_free(&threaded_state));
  MailboxThreadFixture fixture={.state=&threaded_state};atomic_init(&fixture.done,0u);atomic_init(&fixture.snapshots,0u);
  pthread_t writer,reader;assert(pthread_create(&writer,NULL,mailbox_writer,&fixture)==0);assert(pthread_create(&reader,NULL,mailbox_reader,&fixture)==0);
  assert(pthread_join(writer,NULL)==0);assert(pthread_join(reader,NULL)==0);
  assert(p0n_state_read(&threaded_state,&rev,&hz,&gain));assert(rev==200000u);assert(hz==expected_root(rev));assert(gain==expected_gain(rev));

  P0NSafetyMailbox safety;p0n_safety_init(&safety);p0n_release_max(&safety,7,5);p0n_release_max(&safety,7,3);p0n_release_max(&safety,7,9);assert(atomic_load(&safety.release_generation[7])==9);
  printf("{\"pass\":true,\"attackCapacity\":64,\"overflowRejected\":1,\"timingPreserved\":true,\"concurrentSpscPass\":true,\"latestStateRevision\":1000,\"oldRevisionRejected\":true,\"threadedLatestStateRevision\":200000,\"threadedSnapshots\":%u,\"stateAtomicsLockFree\":true,\"releaseHighWater\":9}\n",atomic_load(&fixture.snapshots));return 0;
}
