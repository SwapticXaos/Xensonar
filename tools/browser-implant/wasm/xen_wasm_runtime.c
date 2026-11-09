#include <stddef.h>
#include <stdint.h>

/* Cold-path fixed heap for browser build. First-fit + split + coalesce.
 * This is platform plumbing, not realtime DSP. Audio callback must not allocate. */
typedef struct block { size_t size; struct block* next; uint32_t free; } block;
#define XEN_WASM_HEAP_BYTES (16u * 1024u * 1024u)
static union { max_align_t align; unsigned char bytes[XEN_WASM_HEAP_BYTES]; } heap_store;
static block* head;

static size_t align_up(size_t n){ const size_t a=_Alignof(max_align_t); return (n+a-1u)&~(a-1u); }
static void init_heap(void){ if(head)return; head=(block*)heap_store.bytes; head->size=XEN_WASM_HEAP_BYTES-sizeof(block); head->next=0; head->free=1; }
void* malloc(size_t n){
  if(!n)return 0; init_heap(); n=align_up(n);
  for(block* b=head;b;b=b->next){
    if(!b->free||b->size<n)continue;
    if(b->size>=n+sizeof(block)+_Alignof(max_align_t)){
      block* q=(block*)((unsigned char*)(b+1)+n); q->size=b->size-n-sizeof(block); q->next=b->next; q->free=1; b->next=q; b->size=n;
    }
    b->free=0; return b+1;
  }
  return 0;
}
void free(void* p){
  if(!p)return; block* b=((block*)p)-1; b->free=1;
  for(block* q=head;q&&q->next;){ if(q->free&&q->next->free){q->size+=sizeof(block)+q->next->size;q->next=q->next->next;}else q=q->next; }
}
void* memset(void* dst,int c,size_t n){ unsigned char* d=dst; for(size_t i=0;i<n;i++)d[i]=(unsigned char)c; return dst; }
void* memcpy(void* dst,const void* src,size_t n){ unsigned char* d=dst; const unsigned char* s=src; for(size_t i=0;i<n;i++)d[i]=s[i]; return dst; }
size_t strlen(const char* s){size_t n=0;if(s)while(s[n])n++;return n;}
void* calloc(size_t n,size_t sz){ if(sz&&n>((size_t)-1)/sz)return 0; size_t z=n*sz; void* p=malloc(z); if(p)memset(p,0,z); return p; }
long long llround(double x){ return x>=0.0 ? (long long)(x+0.5) : (long long)(x-0.5); }
#include <stdarg.h>
int snprintf(char* dst,size_t cap,const char* fmt,...){
  if(!dst||cap==0)return 0; dst[0]=0;
  va_list ap; va_start(ap,fmt);
  const char* s="";
  if(fmt && fmt[0]=='%' && fmt[1]=='s' && fmt[2]==0) s=va_arg(ap,const char*);
  va_end(ap); if(!s)s=""; size_t n=strlen(s),w=n<cap-1?n:cap-1; memcpy(dst,s,w); dst[w]=0; return (int)n;
}
