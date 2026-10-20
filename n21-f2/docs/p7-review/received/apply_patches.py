#!/usr/bin/env python3
"""Apply the compact, ordered XenSonar P7 source patches to an unpacked N21-F2
Nodal Ball Grid *modular source tree*. Never includes/requires bundled HTML.

Usage:
 python3 apply_patches.py /path/to/unpacked/n21-f2 --to 21

Run on a disposable source-tree copy. Every edited module and every assembled
HTML stage is SHA256-checked. Failure halts without attempting a fuzzy merge.
"""
from pathlib import Path
import argparse, json, hashlib, subprocess, sys, shutil
HERE=Path(__file__).resolve().parent
PATCHES=HERE/'patches'
BASIS_SHA='e8e63ffe8703fbe3ed683603e880c5e5b8a2970f04cf620e0ed291e98313884d'

def sha(s):return hashlib.sha256(s.encode('utf-8')).hexdigest()

def assemble(root,manifest):
 read=lambda p:(root/p).read_text(encoding='utf-8')
 s=read('template/head.html')
 for f in manifest['files']:s+=read(f)
 s+=read('template/script-close.html')
 for style in manifest['styles']:
  s+=style['tag']+read(style['file'])+'</style>'+style['after']
 s+=read('template/foot.html')
 return s

def apply(root,to='08',build=True,keep_original=True):
 if not (root/'source-manifest.json').exists():raise RuntimeError('Missing source-manifest.json; select unzipped n21-f2 folder')
 manifestpath=root/'source-manifest.json'
 manifest=json.loads(manifestpath.read_text())
 baseline=assemble(root,manifest)
 if sha(baseline)!=BASIS_SHA:
  raise RuntimeError(f'Wrong source baseline: {sha(baseline)} expected {BASIS_SHA}. No changes applied.')
 print('VERIFIED original N21-F2 source baseline',BASIS_SHA)
 patches=sorted(PATCHES.glob('*.xpatch.json'))
 if not patches:raise RuntimeError('No patch files')
 if to not in [p.name[:2] for p in patches]:raise ValueError('Unknown stage '+to)
 for path in patches:
  order=path.name[:2]
  if int(order)>int(to):break
  patch=json.loads(path.read_text())
  assert patch['format']=='xensonar-source-span-patch-v1'
  before=assemble(root,manifest)
  if sha(before)!=patch['previous_html_sha256']:
   raise RuntimeError(f'Stage {order}: assembled predecessor mismatch (unsafe to apply)')
  # Prepare everything in memory and verify all hashes before writing any files.
  updates={}
  for f in patch['files']:
   relative=f['path']
   target=root/relative
   exists=target.exists()
   if f.get('new_file'):
    if exists:raise RuntimeError(f'Stage {order}: added file already exists: {relative}')
    old=''
   else:
    if not exists:raise RuntimeError(f'Stage {order}: expected file absent: {relative}')
    old=target.read_text(encoding='utf-8')
    if sha(old)!=f['before_sha256']:raise RuntimeError(f'Stage {order}: source mismatch: {relative}')
   current=old
   last_at=len(old)+1
   for e in reversed(f['edits']):
    at=e['at'];delete=e['delete']
    if not 0<=at<=len(current) or at+delete>len(current) or at+delete>last_at:
     raise RuntimeError(f'Stage {order}: invalid edit position in {relative}')
    current=current[:at]+e['insert']+current[at+delete:]
    last_at=at
   if sha(current)!=f['after_sha256']:raise RuntimeError(f'Stage {order}: wrong output content: {relative}')
   updates[relative]=current
  for file,content in updates.items():
   target=root/file
   target.parent.mkdir(parents=True,exist_ok=True)
   target.write_text(content,encoding='utf-8')
  extra='src/handoff/00_chat_feature_addons.js'
  if extra in updates and extra not in manifest['files']:
   manifest['files'].insert(0,extra)
  result=assemble(root,manifest)
  resultsha=sha(result)
  if resultsha!=patch['result_html_sha256'] or len(result.encode())!=patch['result_html_bytes']:
   raise RuntimeError(f'Stage {order}: bad source reconstruction {resultsha} expected {patch["result_html_sha256"]}')
  print(f'PASS stage {order} {patch["id"]}: {len(updates)} files, exact HTML SHA256 {resultsha}')
 # Preserve historical HTML artifact: target new output name, built locally after patches.
 manifest['entry']=f'XenSonar_Codex_Handoff_Through_{to}.html'
 if manifestpath.exists():
  # Source-index intentionally left as original: regenerate per repo policy during CodeX integration.
  manifestpath.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 if build:
  proc=subprocess.run(['node','build.cjs'],cwd=root,check=True,text=True,capture_output=True)
  print(proc.stdout.strip())
  proc=subprocess.run(['node','build.cjs','--verify'],cwd=root,check=True,text=True,capture_output=True)
  print(proc.stdout.strip())
 print('Final source SHA256:',sha(assemble(root,manifest)))
 return manifest['entry']

if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('source_dir',help='unpacked n21-f2 directory; run on disposable copy')
 p.add_argument('--to',default='21',help='end stage 00..21')
 p.add_argument('--no-build',action='store_true',help='skip running build.cjs after source edits')
 args=p.parse_args()
 try:apply(Path(args.source_dir).resolve(),args.to,not args.no_build)
 except Exception as e:print('ERROR:',e,file=sys.stderr);sys.exit(2)
