#!/usr/bin/env python3
"""Build index.html from source-manifest.json + src/index.template.html (ordered concat).
  python3 tools/build.py          write index.html (delivery: without diagnostic layers)
  python3 tools/build.py --check  fail if index.html differs from a fresh build
  python3 tools/build.py --diag   write dist/XenSonar_DIAG.html: the same app WITH the diagnostic layers (sections marked "diag")
  python3 tools/build.py --probe  write a TEST-ONLY build (tests/probe/probe.json) to dist/, never index.html
  --plain (with any of the above)  skip the compaction step; output goes to dist/…_PLAIN.html (source text for tests and reading)
index.html is the deliverable (Netlify, offline). Edit sources, then build.
Compaction (MIN-01, tools/minify.cjs, esbuild pinned in tools/slim): whitespace, comments and syntax of the scripts, CSS; names are
kept. Needs `npm ci --prefix tools/slim` once.
Sections with "diag": true in the manifest are diagnostic layers (opt-in monitors, collectors, test-only storage labs). The
delivery leaves them out together with their <script> element; nothing in the app depends on them (all access is guarded)."""
import re, sys, json, hashlib, subprocess
from pathlib import Path
root = Path(__file__).resolve().parent.parent
man = json.loads((root / 'source-manifest.json').read_text('utf-8'))
tpl = (root / man['template']).read_bytes().decode('utf-8')
sec = {s['id']: list(s['files']) for s in man['sources']}
diag_ids = {s['id'] for s in man['sources'] if s.get('diag')}
probe = '--probe' in sys.argv
diag = '--diag' in sys.argv
plain = '--plain' in sys.argv
if probe:
    pj = json.loads((root / 'tests/probe/probe.json').read_text('utf-8'))
    for sid, extra in pj['append'].items(): sec[sid] += extra
SEP = '⁣'
if not diag:
    for sid in diag_ids:
        pattern = r'[ \t]*<script\b[^>]*>' + SEP + 'XEN-SECTION:' + re.escape(sid) + SEP + r'</script>[ \t]*\n?'
        tpl, n = re.subn(pattern, '', tpl)
        assert n == 1, 'diagnostic section must sit alone in its own <script> element: ' + sid
def body(m):
    return ''.join((root / f).read_bytes().decode('utf-8') for f in sec[m.group(1)])
out = re.sub(SEP + 'XEN-SECTION:([^' + SEP + ']+)' + SEP, body, tpl)
assert SEP not in out, 'unresolved template token'
if not plain:
    res = subprocess.run(['node', str(root / 'tools/minify.cjs')], input=out.encode('utf-8'), capture_output=True)
    if res.returncode != 0:
        sys.exit('compaction failed: ' + res.stderr.decode('utf-8', 'replace') + ' (run: npm ci --prefix tools/slim)')
    out = res.stdout.decode('utf-8')
data = out.encode('utf-8')
name = pj['output'] if probe else 'dist/XenSonar_DIAG.html' if diag else man['output']
if plain: name = (name if name.startswith('dist/') else 'dist/XenSonar.html').replace('.html', '_PLAIN.html')
target = root / name
if probe or diag or plain: target.parent.mkdir(parents=True, exist_ok=True)
sha = hashlib.sha256(data).hexdigest()
if '--check' in sys.argv:
    ok = target.exists() and target.read_bytes() == data
    print(('OK ' if ok else 'MISMATCH ') + f'{len(data)} bytes sha256 {sha}')
    sys.exit(0 if ok else 1)
target.write_bytes(data)
print(f'{target.name} {len(data)} bytes sha256 {sha}')
