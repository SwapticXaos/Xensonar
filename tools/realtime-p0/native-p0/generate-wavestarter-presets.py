#!/usr/bin/env python3
import argparse, json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT.parents[2] / 'src/features/xensonar/audio/waveStarterSynthPresetManifest.json'
OUT = ROOT / 'src/p0_native_wavestarter_presets.h'
WAVE = {'sine':0, 'triangle':1, 'sawtooth':2, 'square':3}

def ident(value):
    return re.sub(r'[^A-Za-z0-9_]', '_', value).upper()

def f(v):
    text=f'{float(v):.9g}'
    if '.' not in text and 'e' not in text.lower(): text += '.0'
    return text+'f'

def render(m):
    presets=list(m['presets'].items())
    max_partials=max(len(v) for _,v in presets)
    lines=[
        '#ifndef P0_NATIVE_WAVESTARTER_PRESETS_H',
        '#define P0_NATIVE_WAVESTARTER_PRESETS_H',
        '',
        '#include <stdint.h>',
        '#include <string.h>',
        '',
        f'#define P0N_WS_PRESET_MANIFEST_VERSION "{m["version"]}"',
        f'#define P0N_WS_PRESET_COUNT {len(presets)}u',
        f'#define P0N_WS_MAX_PARTIALS {max_partials}u',
        '#define P0N_WS_WAVE_SINE 0u',
        '#define P0N_WS_WAVE_TRIANGLE 1u',
        '#define P0N_WS_WAVE_SAWTOOTH 2u',
        '#define P0N_WS_WAVE_SQUARE 3u',
        '',
        'typedef struct {',
        '  float freq_mul;',
        '  float delay_sec;',
        '  float duration_sec;',
        '  float gain_mul;',
        '  float resonance;',
        '  float cutoff_hz;',
        '  float prominence;',
        '  uint8_t waveform;',
        '} P0NWaveStarterPresetTone;',
        '',
        'typedef struct {',
        '  const char* id;',
        '  uint8_t tone_count;',
        '  P0NWaveStarterPresetTone tones[P0N_WS_MAX_PARTIALS];',
        '} P0NWaveStarterPreset;',
        '',
        'enum {',
    ]
    for idx,(name,_) in enumerate(presets):
        lines.append(f'  P0N_WS_PRESET_{ident(name)} = {idx},')
    lines += ['};','', 'static const P0NWaveStarterPreset P0N_WS_PRESETS[P0N_WS_PRESET_COUNT] = {']
    zero='{0.0f,0.0f,0.0f,0.0f,0.0f,0.0f,0.0f,P0N_WS_WAVE_SINE}'
    for name,tones in presets:
        rendered=[]
        for t in tones:
            rendered.append('{'+','.join([
                f(t['freqMul']), f(t['delay']), f(t['duration']), f(t['gainMul']),
                f(t['resonance']), f(t['cutoffHz']), f(t['prominence']),
                f'P0N_WS_WAVE_{t["waveform"].upper().replace("TOOTH", "TOOTH")}'
            ])+'}')
        while len(rendered)<max_partials: rendered.append(zero)
        lines.append(f'  {{"{name}",{len(tones)}u,{{{",".join(rendered)}}}}},')
    lines += [
        '};','',
        'static inline int p0n_ws_find_preset(const char* id) {',
        '  if (!id) return -1;',
        '  for (uint32_t i = 0; i < P0N_WS_PRESET_COUNT; ++i) {',
        '    if (strcmp(id, P0N_WS_PRESETS[i].id) == 0) return (int)i;',
        '  }',
        '  return -1;',
        '}',
        '',
        '#endif',''
    ]
    return '\n'.join(lines)

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--check', action='store_true'); args=ap.parse_args()
    m=json.loads(MANIFEST.read_text())
    if not m.get('version') or not isinstance(m.get('presets'),dict): raise SystemExit('bad wavestarter preset manifest')
    if len(m['presets']) != 15: raise SystemExit('expected 15 wavestarter synth presets')
    for name, tones in m['presets'].items():
        if not (1 <= len(tones) <= 3): raise SystemExit(f'bad partial count: {name}')
        for tone in tones:
            if tone.get('waveform') not in WAVE: raise SystemExit(f'bad waveform: {name}')
            if not (float(tone['duration']) > 0 and float(tone['freqMul']) > 0 and float(tone['gainMul']) > 0): raise SystemExit(f'bad tone: {name}')
    content=render(m)
    if args.check:
        if not OUT.exists() or OUT.read_text()!=content: raise SystemExit('wavestarter preset generated header out of date')
    else:
        OUT.write_text(content)
        print(OUT)
if __name__=='__main__': main()
