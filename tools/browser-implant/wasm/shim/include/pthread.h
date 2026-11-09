#ifndef XEN_WASM_PTHREAD_H
#define XEN_WASM_PTHREAD_H
#include <stdint.h>
typedef uint32_t pthread_t;
typedef struct { uint32_t unused; } pthread_mutex_t;
static inline int pthread_mutex_init(pthread_mutex_t* m, const void* a){(void)m;(void)a;return 0;}
static inline int pthread_mutex_destroy(pthread_mutex_t* m){(void)m;return 0;}
static inline int pthread_mutex_lock(pthread_mutex_t* m){(void)m;return 0;}
static inline int pthread_mutex_unlock(pthread_mutex_t* m){(void)m;return 0;}
#endif
