"""Prove source ZIP/no-Git tests and net patch rebuild exact frozen HTML."""
import pathlib,subprocess,tempfile,zipfile,tarfile,io,os,json,hashlib,argparse
app=pathlib.Path(__file__).resolve().parents[1];repo=app.parent;out=repo/'artifacts';base='18fc0331a58fd7528d9f7c071418ebe590bd0b68';src=out/'XenSonar_P7_39_Combined_Startup_Quellen.zip';patch=out/'XenSonar_P7_39_Combined_Startup.patch';rows=[]
parser=argparse.ArgumentParser();parser.add_argument('--focused',action='append',default=[]);args=parser.parse_args()
def run(label,argv,cwd,env=None):
 p=subprocess.run(argv,cwd=cwd,env={**os.environ,'NODE_PATH':str(app/'node_modules'),**(env or {})},stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=240);rows.append({'name':label,'passed':p.returncode==0,'exit':p.returncode,'output':p.stdout.strip()});assert p.returncode==0,(label,p.stdout)
def proofs(folder,prefix):
 a=folder/'n21-f2';(a/'node_modules').symlink_to(app/'node_modules',target_is_directory=True)
 run(prefix+'-initial-source-guard',['node','tests/combined-startup-preservation.cjs'],a)
 run(prefix+'-build',['node','build.cjs'],a);run(prefix+'-verify',['node','build.cjs','--verify'],a)
 for test in ['combined-startup-preservation','sessions-reviewed-preservation','p7-24-preservation',*args.focused]:run(prefix+'-'+test,['node','tests/'+test+'.cjs'],a)
 run(prefix+'-final-source-guard',['node','tests/combined-startup-preservation.cjs'],a)
 m=json.loads((a/'source-manifest.json').read_text());assert (a/m['entry']).read_bytes()==(app/m['entry']).read_bytes();assert not (folder/'.git').exists()
with tempfile.TemporaryDirectory(prefix='xensonar-combined-extracted-') as tmp:
 t=pathlib.Path(tmp)
 with zipfile.ZipFile(src) as z:
  z.extractall(t)
  inventory=json.loads((app/'docs/combined-startup/baseline.json').read_text())['sha256'];historical=0
  for name in z.namelist():
   data=(t/name).read_bytes();assert data==z.read(name),name
   if name!='PAKETINHALT.md':assert data==(repo/name).read_bytes(),('archive differs from frozen workspace input',name)
   if name in inventory and (name.startswith('n21-f2/results/') or name.startswith('artifacts/') or (name.startswith('n21-f2/') and '/' not in name[7:] and name.endswith('.html'))):
    assert hashlib.sha256(data).hexdigest()==inventory[name],('included historical bytes changed before tests',name);historical+=1
  rows.append({'name':'source-zip-extracted-byte-inputs-and-included-history','passed':True,'files':len(z.namelist()),'historicalPathsChecked':historical,'scope':'All ZIP entries match exact package bytes and frozen workspace inputs before any test. Included historical paths are hashed; this is not the full repository history inventory.'})
 proofs(t,'source-zip-no-git')
with tempfile.TemporaryDirectory(prefix='xensonar-combined-patch-') as tmp:
 t=pathlib.Path(tmp);index=t/'verify.index';env={**os.environ,'GIT_INDEX_FILE':str(index)}
 run('patch-base-read-tree',['git','read-tree',base],repo,env);run('patch-apply-base-index',['git','apply','--check','--cached',str(patch)],repo,env)
 paths=subprocess.check_output(['git','ls-tree','-r','--name-only',base],cwd=repo,text=True).splitlines();selected=[p for p in paths if p.startswith(('n21-f2/src/','n21-f2/styles/','n21-f2/template/','n21-f2/tools/','n21-f2/tests/','n21-f2/docs/','.github/')) or p in ['README.md','n21-f2/README.md','n21-f2/build.cjs','n21-f2/source-manifest.json','n21-f2/source-index.json','n21-f2/package.json','n21-f2/package-lock.json'] or (p.startswith('n21-f2/') and '/' not in p[7:] and p.endswith('.md'))]
 payload=subprocess.check_output(['git','archive',base,'--',*selected],cwd=repo)
 with tarfile.open(fileobj=io.BytesIO(payload)) as tar:tar.extractall(t,filter='data')
 run('patch-workingtree-apply',['git','apply',str(patch)],t);proofs(t,'patched-baseline-no-git')
result={'baseline':base,'sourceZipSHA256':hashlib.sha256(src.read_bytes()).hexdigest(),'patchSHA256':hashlib.sha256(patch.read_bytes()).hexdigest(),'rows':rows,'failed':sum(not r['passed'] for r in rows),'dependencyScope':'Temporary no-Git trees reuse existing pinned node_modules via a symlink. Source ZIP excludes dependencies; npm ci is the supported fresh install. Browser/hardware claims are restricted to separate native evidence.'}
(app/'results/combined-startup/package-proof.json').write_text(json.dumps(result,indent=2)+'\n');print('PASS source ZIP and exact-baseline net patch rebuild byte-identical frozen HTML;',len(rows),'checks')
