#!/usr/bin/env python3
import hashlib, json
from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
manifest=HERE.parent/'contracts'/'XENSONAR_359_PRODUCT_SRC_SHA256.txt'
allowed={
 'src/App.tsx',
 'src/features/xensonar/audio/useNativeWaveStarterPilot.ts',
 'src/features/xensonar/audio/waveStarterPresetTonePlan.ts',
 'src/features/xensonar/audio/waveStarterSynthPresetManifest.json',
}
required=set(allowed)
base={}
for line in manifest.read_text().splitlines():
    h,p=line.split(None,1); base[p.strip()]=h
current={}
for p in (ROOT/'src').rglob('*'):
    if p.is_file():
        rel=p.relative_to(ROOT).as_posix()
        current[rel]=hashlib.sha256(p.read_bytes()).hexdigest()
changed=[]
for rel in sorted(set(base)|set(current)):
    if base.get(rel)!=current.get(rel): changed.append(rel)
extra=set(changed)-allowed
missing=required-set(changed)
checks={
 'onlyExpectedProductFilesChanged':not extra,
 'allRequiredProductFilesChanged':not missing,
 'changeCountExactly4':len(changed)==4,
 'appBoundaryChanged':'src/App.tsx' in changed,
 'pilotHookChanged':'src/features/xensonar/audio/useNativeWaveStarterPilot.ts' in changed,
 'legacyTonePlanReadsCanonicalManifest':'src/features/xensonar/audio/waveStarterPresetTonePlan.ts' in changed,
 'canonicalPresetManifestAdded':'src/features/xensonar/audio/waveStarterSynthPresetManifest.json' in changed,
}
result={'pass':all(checks.values()),'claim':'wavestarter-synth-palette-product-scope-from-359','checks':checks,'changed':changed,'unexpected':sorted(extra),'missingRequired':sorted(missing)}
print(json.dumps(result,separators=(',',':')))
raise SystemExit(0 if result['pass'] else 1)
