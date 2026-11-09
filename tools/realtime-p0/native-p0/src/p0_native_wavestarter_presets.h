#ifndef P0_NATIVE_WAVESTARTER_PRESETS_H
#define P0_NATIVE_WAVESTARTER_PRESETS_H

#include <stdint.h>
#include <string.h>

#define P0N_WS_PRESET_MANIFEST_VERSION "wave-starter-synth-preset-v1"
#define P0N_WS_PRESET_COUNT 15u
#define P0N_WS_MAX_PARTIALS 3u
#define P0N_WS_WAVE_SINE 0u
#define P0N_WS_WAVE_TRIANGLE 1u
#define P0N_WS_WAVE_SAWTOOTH 2u
#define P0N_WS_WAVE_SQUARE 3u

typedef struct {
  float freq_mul;
  float delay_sec;
  float duration_sec;
  float gain_mul;
  float resonance;
  float cutoff_hz;
  float prominence;
  uint8_t waveform;
} P0NWaveStarterPresetTone;

typedef struct {
  const char* id;
  uint8_t tone_count;
  P0NWaveStarterPresetTone tones[P0N_WS_MAX_PARTIALS];
} P0NWaveStarterPreset;

enum {
  P0N_WS_PRESET_GLASS_PING = 0,
  P0N_WS_PRESET_SOFT_PLUCK = 1,
  P0N_WS_PRESET_BELL_TONE = 2,
  P0N_WS_PRESET_CLEAN_PLUCK = 3,
  P0N_WS_PRESET_DEEP_SUB = 4,
  P0N_WS_PRESET_VIBRATO_GLASS = 5,
  P0N_WS_PRESET_TAPE_HALO = 6,
  P0N_WS_PRESET_MEMBRANE_THUMP = 7,
  P0N_WS_PRESET_REED_SIGH = 8,
  P0N_WS_PRESET_SPARK_CHIME = 9,
  P0N_WS_PRESET_BOWED_GLASS = 10,
  P0N_WS_PRESET_KALIMBA_TINE = 11,
  P0N_WS_PRESET_GONG_WASH = 12,
  P0N_WS_PRESET_CHIME_SPRAY = 13,
  P0N_WS_PRESET_DUST_PULSE = 14,
};

static const P0NWaveStarterPreset P0N_WS_PRESETS[P0N_WS_PRESET_COUNT] = {
  {"glass_ping",1u,{{1.0f,0.0f,0.4f,1.0f,2.0f,1800.0f,1.0f,P0N_WS_WAVE_TRIANGLE},{0.0f,0.0f,0.0f,0.0f,0.0f,0.0f,0.0f,P0N_WS_WAVE_SINE},{0.0f,0.0f,0.0f,0.0f,0.0f,0.0f,0.0f,P0N_WS_WAVE_SINE}}},
  {"soft_pluck",1u,{{1.0f,0.0f,0.3f,1.0f,1.0f,1200.0f,1.0f,P0N_WS_WAVE_SINE},{0.0f,0.0f,0.0f,0.0f,0.0f,0.0f,0.0f,P0N_WS_WAVE_SINE},{0.0f,0.0f,0.0f,0.0f,0.0f,0.0f,0.0f,P0N_WS_WAVE_SINE}}},
  {"bell_tone",2u,{{1.0f,0.0f,0.5f,0.8f,1.0f,2400.0f,1.0f,P0N_WS_WAVE_SINE},{2.0f,0.02f,0.3f,0.4f,1.0f,2400.0f,0.56f,P0N_WS_WAVE_TRIANGLE},{0.0f,0.0f,0.0f,0.0f,0.0f,0.0f,0.0f,P0N_WS_WAVE_SINE}}},
  {"clean_pluck",1u,{{1.0f,0.0f,0.25f,0.7f,3.0f,800.0f,1.0f,P0N_WS_WAVE_SAWTOOTH},{0.0f,0.0f,0.0f,0.0f,0.0f,0.0f,0.0f,P0N_WS_WAVE_SINE},{0.0f,0.0f,0.0f,0.0f,0.0f,0.0f,0.0f,P0N_WS_WAVE_SINE}}},
  {"deep_sub",2u,{{0.5f,0.0f,0.55f,0.9f,1.4f,620.0f,1.0f,P0N_WS_WAVE_SINE},{0.75f,0.03f,0.45f,0.35f,1.2f,900.0f,0.6f,P0N_WS_WAVE_TRIANGLE},{0.0f,0.0f,0.0f,0.0f,0.0f,0.0f,0.0f,P0N_WS_WAVE_SINE}}},
  {"vibrato_glass",3u,{{1.0f,0.0f,0.52f,0.78f,1.8f,2100.0f,1.0f,P0N_WS_WAVE_TRIANGLE},{2.01f,0.018f,0.46f,0.34f,1.1f,2600.0f,0.52f,P0N_WS_WAVE_SINE},{0.998f,0.028f,0.62f,0.22f,1.0f,1700.0f,0.34f,P0N_WS_WAVE_SINE}}},
  {"tape_halo",3u,{{1.0f,0.0f,0.7f,0.72f,1.6f,1400.0f,1.0f,P0N_WS_WAVE_TRIANGLE},{1.5f,0.03f,0.56f,0.32f,1.0f,1800.0f,0.54f,P0N_WS_WAVE_SINE},{0.5f,0.05f,0.64f,0.24f,0.9f,900.0f,0.3f,P0N_WS_WAVE_SINE}}},
  {"membrane_thump",2u,{{0.5f,0.0f,0.24f,0.95f,1.2f,520.0f,1.0f,P0N_WS_WAVE_TRIANGLE},{0.98f,0.01f,0.16f,0.24f,1.0f,760.0f,0.42f,P0N_WS_WAVE_SINE},{0.0f,0.0f,0.0f,0.0f,0.0f,0.0f,0.0f,P0N_WS_WAVE_SINE}}},
  {"reed_sigh",2u,{{1.0f,0.0f,0.28f,0.7f,2.4f,1200.0f,1.0f,P0N_WS_WAVE_SQUARE},{1.5f,0.018f,0.32f,0.24f,2.8f,1700.0f,0.46f,P0N_WS_WAVE_TRIANGLE},{0.0f,0.0f,0.0f,0.0f,0.0f,0.0f,0.0f,P0N_WS_WAVE_SINE}}},
  {"spark_chime",3u,{{1.0f,0.0f,0.18f,0.72f,3.6f,3000.0f,1.0f,P0N_WS_WAVE_SINE},{2.48f,0.01f,0.12f,0.22f,2.2f,4200.0f,0.34f,P0N_WS_WAVE_TRIANGLE},{3.72f,0.016f,0.1f,0.12f,1.6f,5200.0f,0.18f,P0N_WS_WAVE_SINE}}},
  {"bowed_glass",3u,{{1.0f,0.0f,0.82f,0.66f,1.8f,2000.0f,1.0f,P0N_WS_WAVE_TRIANGLE},{2.01f,0.06f,0.74f,0.24f,1.1f,2800.0f,0.42f,P0N_WS_WAVE_SINE},{0.5f,0.03f,0.64f,0.14f,0.9f,1200.0f,0.24f,P0N_WS_WAVE_SINE}}},
  {"kalimba_tine",2u,{{1.0f,0.0f,0.24f,0.76f,2.2f,2200.0f,1.0f,P0N_WS_WAVE_TRIANGLE},{2.04f,0.012f,0.16f,0.2f,1.2f,3200.0f,0.34f,P0N_WS_WAVE_SINE},{0.0f,0.0f,0.0f,0.0f,0.0f,0.0f,0.0f,P0N_WS_WAVE_SINE}}},
  {"gong_wash",3u,{{1.0f,0.0f,0.64f,0.72f,1.6f,1600.0f,1.0f,P0N_WS_WAVE_SINE},{1.5f,0.02f,0.52f,0.24f,1.1f,2200.0f,0.46f,P0N_WS_WAVE_TRIANGLE},{2.48f,0.06f,0.4f,0.14f,1.0f,2600.0f,0.24f,P0N_WS_WAVE_SINE}}},
  {"chime_spray",3u,{{1.0f,0.0f,0.2f,0.68f,3.8f,3400.0f,1.0f,P0N_WS_WAVE_SINE},{2.62f,0.01f,0.12f,0.2f,2.2f,4600.0f,0.34f,P0N_WS_WAVE_TRIANGLE},{3.94f,0.016f,0.1f,0.12f,1.8f,5400.0f,0.18f,P0N_WS_WAVE_SINE}}},
  {"dust_pulse",3u,{{1.0f,0.0f,0.14f,0.56f,3.4f,2600.0f,1.0f,P0N_WS_WAVE_TRIANGLE},{2.2f,0.004f,0.09f,0.14f,2.2f,4200.0f,0.24f,P0N_WS_WAVE_SINE},{3.36f,0.012f,0.08f,0.08f,1.6f,5200.0f,0.12f,P0N_WS_WAVE_SINE}}},
};

static inline int p0n_ws_find_preset(const char* id) {
  if (!id) return -1;
  for (uint32_t i = 0; i < P0N_WS_PRESET_COUNT; ++i) {
    if (strcmp(id, P0N_WS_PRESETS[i].id) == 0) return (int)i;
  }
  return -1;
}

#endif
