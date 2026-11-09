#!/usr/bin/env python3
"""XenSonar M13 + EQ-P1.4: verify source provenance, semantics, patch reversibility.
Usage: python verify_three_way.py --merged MERGED --m13 LAZY_HEAD --eq EQ_HEAD --patch-dir PATCH_DIRECTORY
"""
from pathlib import Path
import argparse,gzip,hashlib,subprocess,tempfile,re
p=argparse.ArgumentParser()
p.add_argument('--merged',type=Path,required=True)
p.add_argument('--m13',type=Path,required=True)
p.add_argument('--eq',type=Path,required=True)
p.add_argument('--patch-dir',type=Path,default=Path(__file__).resolve().parents[1]/'patches')
a=p.parse_args()
expected={
 'm13':'5a46174d6427c6c4515d296c78e2e96fc7f26cfb8bb7708362eb3a01b8343810',
 'eq':'294900b573fbcebe001d5e40e2ee3a2ce56e5eb1fde6892dcb60abdbb6580860',
 'merged':'c65014ef58228a9e7ccea75b1d2ff8160632af98abfebc6bba8258f200f23448',
}
for label,fn in [('m13',a.m13),('eq',a.eq),('merged',a.merged)]:
 digest=hashlib.sha256(fn.read_bytes()).hexdigest()
 assert digest==expected[label],f'{label}: expected {expected[label]}, found {digest}'
 print('SHA PASS',label,digest)
html=a.merged.read_text()
assert '\n<<<<<<< HEAD\n' not in html and '\n>>>>>>> eq\n' not in html
assert html.count("className:'xen-quick-save-trigger'")==1
assert "onClick:()=>{if(__XenMetaSessions.ensureHydrated())setSaveOpen(true);else setMessage(__XenMetaSessions.snapshot().error)}" in html
line=next(x for x in html.splitlines() if "children:[u.jsxs('div',{className:'xen-quick-mutes-save'" in x)
assert "title:'Save Quickrack Session in Meta Menu'" not in line
assert "title:collapsed?'Expand Quickrack':'Collapse Quickrack'" not in line
assert "'#285765'" in line and "'#0a2530'" in line
for term in ['__XenM13BootStatus','__xenM12InventoryFactory','__xenM11HydrationFactory','__XenEQDock','__XenEQPanel','xensonar.quickrack.eq.patterns.v1']:
 assert term in html,term
print('SEMANTIC CONTRACT PASS')
for label,old,patchname in [('M13',a.m13,'M13_to_Merge.patch.gz'),('EQ-P1.4',a.eq,'EQ_P1_4_to_Merge.patch.gz')]:
 with tempfile.TemporaryDirectory() as d:
  working=Path(d)/'Xensonar.html';working.write_bytes(old.read_bytes())
  patch=gzip.open(a.patch_dir/patchname,'rb').read()
  run=subprocess.run(['patch','--fuzz=0','-p0'],input=patch,cwd=d,capture_output=True)
  assert run.returncode==0,run.stderr.decode()
  assert working.read_bytes()==a.merged.read_bytes(),f'nonidentical reconstruction from {label}'
 print('RECONSTRUCTION PASS',label)
print('VERIFIED THREE-WAY MERGE')
