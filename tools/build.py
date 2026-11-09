#!/usr/bin/env python3
"""Build index.html from src/.  Usage:
  python3 tools/build.py          write index.html
  python3 tools/build.py --check  fail if index.html differs from a fresh build
index.html is the deliverable (Netlify, offline). Edit src/, then build."""
import re, sys, hashlib
from pathlib import Path
root = Path(__file__).resolve().parent.parent
src = root / 'src'
tpl = (src / 'index.template.html').read_bytes().decode('utf-8')
out = re.sub('⁣XEN-BLOCK:([^⁣]+)⁣', lambda m: (src / m.group(1)).read_bytes().decode('utf-8'), tpl)
data = out.encode('utf-8'); target = root / 'index.html'
sha = hashlib.sha256(data).hexdigest()
if '--check' in sys.argv:
    ok = target.exists() and target.read_bytes() == data
    print(('OK ' if ok else 'MISMATCH ') + f'{len(data)} bytes sha256 {sha}')
    sys.exit(0 if ok else 1)
target.write_bytes(data)
print(f'index.html {len(data)} bytes sha256 {sha}')
