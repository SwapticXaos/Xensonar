#ifndef XEN_WASM_STDIO_H
#define XEN_WASM_STDIO_H
#include <stddef.h>
typedef struct xen_wasm_FILE FILE;
int snprintf(char* dst, size_t cap, const char* fmt, ...);
#endif
