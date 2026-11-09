#!/usr/bin/env python3
"""Prove editability: modifying an EQ style produces a new valid HTML,
without silently rewriting the pinned reference manifest or original source.
"""
from pathlib import Path
import tempfile,shutil,subprocess,hashlib
root=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as tmp:
 dest=Path(tmp)/'sandbox_project'
 shutil.copytree(root,dest,ignore=shutil.ignore_patterns('dist','__pycache__','.git'))
 before=(dest/'source-manifest.json').read_bytes()
 css=dest/'styles/quickrack/eq.css'
 css.write_text(css.read_text()+'\n/* test edit only */\n')
 r=subprocess.run(['node','build.cjs'],cwd=dest,capture_output=True,text=True)
 assert r.returncode==0,(r.stdout,r.stderr)
 assert 'DEVELOPMENT_BUILD' in r.stdout
 assert 'MODIFIED source section' in r.stderr
 assert (dest/'source-manifest.json').read_bytes()==before
 out=(dest/'dist/XenSonar_Standalone.html').read_bytes()
 assert b'/* test edit only */' in out
 assert hashlib.sha256(out).hexdigest()!=hashlib.sha256((root/'dist/XenSonar_Standalone.html').read_bytes()).hexdigest()
 strict=subprocess.run(['node','build.cjs','--verify'],cwd=dest,capture_output=True,text=True)
 assert strict.returncode!=0,'--verify must refuse modified non-release source'
print('EDITABLE BUILD PASS: changes compile, frozen baseline guarded, original unmodified')
