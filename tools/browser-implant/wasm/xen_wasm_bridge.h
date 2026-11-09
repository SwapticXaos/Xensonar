#ifndef XEN_WASM_BRIDGE_H
#define XEN_WASM_BRIDGE_H
#include <stdint.h>
#ifdef __cplusplus
extern "C" {
#endif
#define XEN_WASM_RECORD_WORDS 64u
#define XEN_WASM_TONE_RECORD_WORDS XEN_WASM_RECORD_WORDS
#define XEN_WASM_ENTROPHON_AUX_OUTPUTS 6u
int      xen_wasm_init(uint32_t sample_rate);
int      xen_wasm_init_profile(uint32_t sample_rate, uint32_t profile);
void     xen_wasm_destroy(void);
uint32_t xen_wasm_epoch(void);
uint32_t xen_wasm_panic(void);
int      xen_wasm_submit_record(const uint32_t* words, uint32_t word_count);
int      xen_wasm_submit_tone_record(const uint32_t* words, uint32_t word_count); /* v1 compatibility alias */
uintptr_t xen_wasm_record_scratch_ptr(void);
uintptr_t xen_wasm_output_l_ptr(void);
uintptr_t xen_wasm_output_r_ptr(void);
uintptr_t xen_wasm_output_aux_ptr(uint32_t route);
uint32_t xen_wasm_max_render_frames(void);
int      xen_wasm_render(uint32_t frames);
#ifdef __cplusplus
}
#endif
#endif
