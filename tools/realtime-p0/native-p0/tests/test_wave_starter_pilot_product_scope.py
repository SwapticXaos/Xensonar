#!/usr/bin/env python3
import hashlib, json
from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
manifest=HERE.parent/'contracts'/'XENSONAR_359_PRODUCT_SRC_SHA256.txt'
allowed={'src/App.tsx','src/features/xensonar/audio/useNativeWaveStarterPilot.ts'}
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
missing_required={'src/App.tsx','src/features/xensonar/audio/useNativeWaveStarterPilot.ts'}-set(changed)
checks={
 'onlyAllowedProductFilesChanged':not extra,
 'appBoundaryChanged':'src/App.tsx' in changed,
 'pilotHookAdded':'src/features/xensonar/audio/useNativeWaveStarterPilot.ts' in changed,
 'changeCountExactly2':len(changed)==2,
}
result={'pass':all(checks.values()),'claim':'wave-starter-pilot-product-scope','checks':checks,'changed':changed,'unexpected':sorted(extra),'missingRequired':sorted(missing_required)}
print(json.dumps(result,separators=(',',':')))
raise SystemExit(0 if result['pass'] else 1)
