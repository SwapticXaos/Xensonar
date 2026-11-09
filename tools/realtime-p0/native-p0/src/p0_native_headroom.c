#define _POSIX_C_SOURCE 200809L
#include <math.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#define memset p0_core_memset
#define memcpy p0_core_memcpy
#include "../../core/p0_core.c"
#undef memcpy
#undef memset

#define RUNS 5000u

static uint64_t ns(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC_RAW,&t);return(uint64_t)t.tv_sec*1000000000ull+t.tv_nsec;}
static int cmp_u64(const void*a,const void*b){uint64_t x=*(const uint64_t*)a,y=*(const uint64_t*)b;return x<y?-1:x>y?1:0;}
static void lp(float* b0,float* b1,float* b2,float* a1,float* a2){double w=P0_PI2*2400/48000,cs=cos(w),alpha=sin(w)/(2*pow(10,1.0/20)),z=1+alpha;*b0=(1-cs)/2/z;*b1=(1-cs)/z;*b2=*b0;*a1=-2*cs/z;*a2=(1-alpha)/z;}
static int start_voices(unsigned count){float b0,b1,b2,a1,a2;lp(&b0,&b1,&b2,&a1,&a2);float rel=exp(-1.0/(.025704*48000));unsigned slot=0;uint64_t group=1;while(slot<count){unsigned n=count-slot;if(n>3)n=3;if(p0_begin_attack_group(1,group++,n,p0_frame(),p0_frame()+4320)!=1)return 0;for(unsigned i=0;i<n;i++)if(p0_set_attack_note(i,slot+i,1,2,110.0f+13.0f*(slot+i),.025f,b0,b1,b2,a1,a2,1536,0,55680,rel)!=1)return 0;if(p0_commit_attack_group()!=1)return 0;slot+=n;p0_render(256);}for(unsigned i=0;i<20&&p0_active_voices()<count;i++)p0_render(256);return p0_active_voices()==count;}
int main(void){unsigned voices[]={1,3,8,16};printf("{\"sampleRate\":48000,\"blockFrames\":128,\"physicalAudio\":false,\"scenarios\":[");for(unsigned s=0;s<4;s++){p0_init(48000);float* table=(float*)p0_sine_table_ptr();for(int i=0;i<P0_SINE_TABLE;i++)table[i]=sin(P0_PI2*(double)i/P0_SINE_TABLE);if(p0_arm(1,72000)!=1||!start_voices(voices[s]))return 2;uint64_t times[RUNS];for(unsigned i=0;i<RUNS;i++){if((i%400)==0)p0_renew_lease(1,p0_frame()+72000);uint64_t a=ns();p0_render(128);uint64_t b=ns();times[i]=b-a;}qsort(times,RUNS,sizeof(uint64_t),cmp_u64);uint64_t quantum=128ull*1000000000ull/48000ull;double p99pct=(double)times[(RUNS*99)/100]/(double)quantum*100.0;if(s)printf(",");printf("{\"voices\":%u,\"p50Ns\":%llu,\"p95Ns\":%llu,\"p99Ns\":%llu,\"maxNs\":%llu,\"quantumNs\":%llu,\"p99QuantumPct\":%.6f}",voices[s],(unsigned long long)times[RUNS/2],(unsigned long long)times[(RUNS*95)/100],(unsigned long long)times[(RUNS*99)/100],(unsigned long long)times[RUNS-1],(unsigned long long)quantum,p99pct);}puts("]}");return 0;}
