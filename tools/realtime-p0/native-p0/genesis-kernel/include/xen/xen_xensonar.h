/* xen_xensonar.h — Xensonar-specific adapter layer.
 *
 * Everything with a Xensonar name lives here, above the ABI. The engine below
 * has never heard of Root Follow, WaveStarter or Forge. Deleting this file
 * cannot damage the substrate; replacing the UI cannot reach past it.
 *
 * STATUS: EXPERIMENTAL. The parameter meanings below are this kernel's own
 * placeholder semantics. PARITY_NOT_ESTABLISHED — see MUSICAL_SEMANTICS.md.
 */
#ifndef XEN_XENSONAR_H
#define XEN_XENSONAR_H

#include "xen/xen_audio.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    double window_ms;      /* EXPERIMENTAL grain window                      */
    double step_ms;        /* EXPERIMENTAL scheduling step                   */
    double microdensity;   /* EXPERIMENTAL mean grains per step              */
    double pitch_spread;   /* 0..1 over an 11-limit ladder, REFERENCE_UNKNOWN */
    double gain;
    double source_jitter;  /* 0..1                                           */
} xen_root_follow_params;

/** Root Follow adapter: one persistent granular Program + harmonic State +
 *  immutable material Asset. Returns a program handle or 0. */
xen_id xsn_root_follow_create(xen_engine* e, xen_id material,
                              const xen_root_follow_params* p, uint64_t seed);
int    xsn_root_follow_update(xen_engine* e, xen_id prog, const xen_root_follow_params* p,
                              xen_frame at);
int    xsn_root_follow_set_root(xen_engine* e, double hz, xen_frame at);

/* WaveStarter implant seam. Tuning is Xensonar product semantics, therefore
 * the adapter receives already-resolved pitch rather than inventing a scale.
 * This spec is intentionally small; canonical WaveStarter parity may later
 * require a richer bounded VoiceSpec without changing the engine's ownership. */
typedef struct {
    double resolved_hz;
    float  velocity;
    float  pan;
} xen_wave_voice_spec;

xen_id xsn_wave_attack_resolved(xen_engine* e, const xen_wave_voice_spec* spec,
                                uint32_t token, uint32_t lead_frames);
int    xsn_key_down_resolved(xen_engine* e, const xen_wave_voice_spec* spec,
                             uint32_t token, uint32_t lead_frames);
int    xsn_key_up(xen_engine* e, uint32_t token);

/** Forge adapter: coherent transform state. */
int xsn_forge_set(xen_engine* e, double amount, double tone, double space, xen_frame at);

/** Master adapter. */
int xsn_master_gain(xen_engine* e, double gain, xen_frame at);


#ifdef __cplusplus
}
#endif
#endif
