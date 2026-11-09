#!/usr/bin/env python3
"""One-time split of index.html into src/ (template + one file per <script>/<style> block).
Reassemble with tools/build.py. Byte-identical round trip is checked at the end."""
import re, sys, json
from pathlib import Path
root = Path(__file__).resolve().parents[2]
html = (root / 'index.html').read_text('utf-8')
src = root / 'src'
TOKEN = '⁣XEN-BLOCK:{}⁣'   # invisible separator, never present in the app
assert '⁣' not in html
pat = re.compile(r'(<(script|style)\b([^>]*)>)(.*?)(</\2\s*>)', re.S | re.I)
parts, last, blocks, used = [], 0, [], set()
counts = {'script': 0, 'style': 0}
for m in pat.finditer(html):
    tag = m.group(2).lower(); attrs = m.group(3); body = m.group(4)
    n = counts[tag]; counts[tag] += 1
    ident = re.search(r'\bid=["\']([^"\']+)', attrs)
    typ = re.search(r'\btype=["\']([^"\']+)', attrs)
    if ident: base = ident.group(1)
    elif typ and typ.group(1) == 'module': base = 'main-bundle'
    elif 'rel="stylesheet"' in attrs: base = 'main-bundle'
    else: base = 'inline'
    base = re.sub(r'[^A-Za-z0-9._-]+', '-', base).strip('-')[:60] or 'block'
    ext = 'js' if tag == 'script' else 'css'
    name = f"{ext}/{n:03d}-{base}.{ext}"
    assert name not in used; used.add(name)
    parts.append(html[last:m.start(4)]); parts.append(TOKEN.format(name)); last = m.end(4)
    blocks.append({'file': name, 'tag': tag, 'attrs': attrs.strip(), 'bytes': len(body.encode('utf-8'))})
    p = src / name; p.parent.mkdir(parents=True, exist_ok=True); p.write_bytes(body.encode('utf-8'))
parts.append(html[last:])
(src / 'index.template.html').write_bytes(''.join(parts).encode('utf-8'))
(src / 'blocks.json').write_text(json.dumps(blocks, indent=1, ensure_ascii=False) + '\n', 'utf-8')
print('scripts', counts['script'], 'styles', counts['style'])
