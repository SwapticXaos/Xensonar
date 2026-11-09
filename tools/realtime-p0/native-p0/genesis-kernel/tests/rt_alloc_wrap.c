/* Linker-level allocation detector.
 *
 * Linked with -Wl,--wrap=malloc,--wrap=calloc,--wrap=realloc,--wrap=free,
 * --wrap=posix_memalign, so every allocator call made by the engine (or by
 * anything it calls) inside xen_rt_guard_begin()/end() is counted. This is a
 * real mechanism, not a self-reported variable.
 */
#include <stddef.h>

extern void* __real_malloc(size_t);
extern void* __real_calloc(size_t, size_t);
extern void* __real_realloc(void*, size_t);
extern void  __real_free(void*);
extern int   __real_posix_memalign(void**, size_t, size_t);

extern int  xen_rt_guard_active(void);
extern void xen_rt_guard_violation(void);

void* __wrap_malloc(size_t n) {
    if (xen_rt_guard_active()) xen_rt_guard_violation();
    return __real_malloc(n);
}
void* __wrap_calloc(size_t a, size_t b) {
    if (xen_rt_guard_active()) xen_rt_guard_violation();
    return __real_calloc(a, b);
}
void* __wrap_realloc(void* p, size_t n) {
    if (xen_rt_guard_active()) xen_rt_guard_violation();
    return __real_realloc(p, n);
}
void __wrap_free(void* p) {
    if (xen_rt_guard_active()) xen_rt_guard_violation();
    __real_free(p);
}
int __wrap_posix_memalign(void** p, size_t a, size_t n) {
    if (xen_rt_guard_active()) xen_rt_guard_violation();
    return __real_posix_memalign(p, a, n);
}
