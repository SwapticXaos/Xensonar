#!/usr/bin/env python3
import json,re,subprocess,sys
from pathlib import Path
HERE=Path(__file__).resolve().parent
NATIVE=HERE.parent
ROOT=HERE.parents[3]
manifest_path=ROOT/'src/features/xensonar/audio/waveStarterSynthPresetManifest.json'
toneplan_path=ROOT/'src/features/xensonar/audio/waveStarterPresetTonePlan.ts'
domain_path=ROOT/'src/features/xensonar/domain/instrumentData.ts'
header_path=NATIVE/'src/p0_native_wavestarter_presets.h'
generator=NATIVE/'generate-wavestarter-presets.py'
manifest=json.loads(manifest_path.read_text())
presets=list(manifest.get('presets',{}).keys())
proc=subprocess.run([sys.executable,str(generator),'--check'],cwd=NATIVE,text=True,capture_output=True)
header=header_path.read_text()
toneplan=toneplan_path.read_text()
domain=domain_path.read_text()
m=re.search(r'export type WaveSoundPreset\s*=\s*(.*?);',domain,re.S)
domain_ids=re.findall(r'[\"\']([a-z0-9_]+)[\"\']',m.group(1) if m else '')
header_ids=re.findall(r'\{"([a-z0-9_]+)",\s*\d+u,',header)
checks={
 'generatorCheckPasses':proc.returncode==0,
 'manifestVersionPresent':manifest.get('version')=='wave-starter-synth-preset-v1',
 'presetCountExactly15':len(presets)==15,
 'presetIdsUnique':len(set(presets))==len(presets),
 'domainWaveSoundPresetExactlyMatchesManifest':domain_ids==presets,
 'nativeHeaderContainsAllPresetIds':header_ids==presets,
 'nativeHeaderCountMatches':f'#define P0N_WS_PRESET_COUNT {len(presets)}u' in header,
 'legacyTonePlanImportsManifest':'waveStarterSynthPresetManifest.json' in toneplan,
 'legacyTonePlanNoClassicSwitch':('case \'glass_ping\'' not in toneplan and 'case "glass_ping"' not in toneplan),
}
result={'pass':all(checks.values()),'claim':'wavestarter-synth-preset-manifest-parity','checks':checks,'version':manifest.get('version'),'presetCount':len(presets),'presets':presets,'generatorStdout':proc.stdout.strip(),'generatorStderr':proc.stderr.strip()}
print(json.dumps(result,separators=(',',':')))
raise SystemExit(0 if result['pass'] else 1)
