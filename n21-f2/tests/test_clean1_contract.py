"""Cleanup contracts: no change to shipped DSP/preset vocabulary or layout."""
from pathlib import Path
import re,json,hashlib
root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'source-manifest.json').read_text())
js=''.join((root/file).read_text() for file in manifest['files'])
foot=(root/manifest['entry']).read_text()
assert 'function YV(){return typeof performance<' not in js, 'Dead RFL helper still exists'
for name in ['f353-structure-workflow','f354-sustain-scout']:
 assert f'id="{name}"' not in foot, f'Dead style {name} still exists'
assert 'const travel = travelSpan > 0' not in js
assert 'const routingEpoch = __f333Epoch;' not in js
assert 'const frac=x=>lo+' not in js
assert len(re.findall(r'getPresets',js))>=1
for marker in ['__mlDrumLabelWidth=74','--xen-drum-label-width','__f49StopRFL']:
 assert any(marker in p.read_text() for p in (root/'src').rglob('*.js')),marker
assert hashlib.sha256((root/manifest['entry']).read_bytes()).hexdigest()==manifest['sha256'], 'Cleanup checked the wrong build snapshot'
print('Current cleanup contracts: PASS')
