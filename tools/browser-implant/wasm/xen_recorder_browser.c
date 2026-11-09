#include "xen_internal.h"
#include <stdlib.h>
#include <string.h>
static uint32_t pow2(uint32_t v){uint32_t p=1;while(p<v&&p<(1u<<30))p<<=1;return p;}
int xen_recorder_init(xen_recorder* r,uint32_t cap,uint32_t sr){memset(r,0,sizeof(*r));r->cap_frames=pow2(cap<4096?4096:cap);r->ring=(float*)calloc((size_t)r->cap_frames*2u,sizeof(float));if(!r->ring)return XEN_ERR_ARG;r->sample_rate=sr;atomic_store(&r->status,XEN_REC_IDLE);return XEN_OK;}
void xen_recorder_free(xen_recorder* r){free(r->ring);r->ring=0;}
void xen_recorder_push(xen_recorder* r,const float* src,uint32_t frames){if(atomic_load_explicit(&r->status,memory_order_relaxed)!=XEN_REC_ACTIVE)return;uint32_t w=atomic_load_explicit(&r->w,memory_order_relaxed),rd=atomic_load_explicit(&r->r,memory_order_acquire),used=w-rd;if(frames>r->cap_frames-used){atomic_store_explicit(&r->status,XEN_REC_OVERRUN,memory_order_release);atomic_fetch_add_explicit(&r->overruns,1,memory_order_relaxed);return;}for(uint32_t i=0;i<frames;i++){uint32_t at=(w+i)&(r->cap_frames-1u);r->ring[at*2]=src[i*2];r->ring[at*2+1]=src[i*2+1];}atomic_store_explicit(&r->w,w+frames,memory_order_release);atomic_fetch_add_explicit(&r->frames,frames,memory_order_relaxed);}
uint32_t xen_recorder_pull(xen_recorder* r,float* dst,uint32_t max){uint32_t rd=atomic_load_explicit(&r->r,memory_order_relaxed),w=atomic_load_explicit(&r->w,memory_order_acquire),n=w-rd;if(n>max)n=max;for(uint32_t i=0;i<n;i++){uint32_t at=(rd+i)&(r->cap_frames-1u);dst[i*2]=r->ring[at*2];dst[i*2+1]=r->ring[at*2+1];}atomic_store_explicit(&r->r,rd+n,memory_order_release);return n;}
/* Browser build records to the in-memory ring. File persistence belongs to host/UI. */
int xen_record_start(xen_engine* e,const char* ignored){(void)ignored;if(!e)return XEN_ERR_ARG;atomic_store(&e->rec.w,0);atomic_store(&e->rec.r,0);atomic_store(&e->rec.frames,0);atomic_store(&e->rec.overruns,0);atomic_store(&e->rec.status,XEN_REC_ACTIVE);return XEN_OK;}
int xen_record_stop(xen_engine* e){if(!e)return XEN_ERR_ARG;if(atomic_load(&e->rec.status)==XEN_REC_ACTIVE)atomic_store(&e->rec.status,XEN_REC_IDLE);return XEN_OK;}
int xen_record_status(const xen_engine* e){return e?(int)atomic_load(&((xen_engine*)e)->rec.status):XEN_ERR_ARG;}
uint32_t xen_record_drain(xen_engine* e,float* dst,uint32_t max){return e?xen_recorder_pull(&e->rec,dst,max):0;}
