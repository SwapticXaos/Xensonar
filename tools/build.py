#!/usr/bin/env python3
"""Build index.html from source-manifest.json + src/index.template.html (ordered concat).
  python3 tools/build.py          write index.html
  python3 tools/build.py --check  fail if index.html differs from a fresh build
index.html is the deliverable (Netlify, offline). Edit sources, then build."""
import re, sys, json, hashlib
from pathlib import Path
root = Path(__file__).resolve().parent.parent
man = json.loads((root / 'source-manifest.json').read_text('utf-8'))
tpl = (root / man['template']).read_bytes().decode('utf-8')
sec = {s['id']: s['files'] for s in man['sections']}
def body(m):
    return ''.join((root / f).read_bytes().decode('utf-8') for f in sec[m.group(1)])
out = re.sub('⁣XEN-SECTION:([^⁣]+)⁣', body, tpl)
assert '⁣' not in out, 'unresolved template token'
data = out.encode('utf-8'); target = root / man['output']
sha = hashlib.sha256(data).hexdigest()
if '--check' in sys.argv:
    ok = target.exists() and target.read_bytes() == data
    print(('OK ' if ok else 'MISMATCH ') + f'{len(data)} bytes sha256 {sha}')
    sys.exit(0 if ok else 1)
target.write_bytes(data)
print(f'index.html {len(data)} bytes sha256 {sha}')
