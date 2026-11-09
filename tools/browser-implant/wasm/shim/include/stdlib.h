#ifndef XEN_WASM_STDLIB_H
#define XEN_WASM_STDLIB_H
#include <stddef.h>
void* malloc(size_t n);
void* calloc(size_t n, size_t size);
void free(void* p);
#endif
