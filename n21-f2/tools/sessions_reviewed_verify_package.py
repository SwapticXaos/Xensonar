import pathlib,subprocess,tempfile,zipfile,tarfile,io,os,json,hashlib
repo=pathlib.Path(__file__).resolve().parents[2];app=repo/'n21-f2';out=repo/'artifacts';base='10178acb733db38f1801b263ac5200d98c17e69b';src=out/'XenSonar_P7_38_Sessions_Reviewed_Quellen.zip';patch=out/'XenSonar_P7_38_Sessions_Reviewed.patch';rows=[]
def run(label,args,cwd,env=None):
 p=subprocess.run(args,cwd=cwd,env={**os.environ,'NODE_PATH':str(app/'node_modules'),**(env or {})},stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=180);rows.append({'name':label,'passed':p.returncode==0,'exit':p.returncode,'output':p.stdout.strip()});assert p.returncode==0,(label,p.stdout)
with tempfile.TemporaryDirectory(prefix='xensonar-sessions-extracted-') as tmp:
 t=pathlib.Path(tmp)
 with zipfile.ZipFile(src) as z:z.extractall(t)
 a=t/'n21-f2';(a/'node_modules').symlink_to(app/'node_modules',target_is_directory=True)
 run('source-zip-build',['node','build.cjs'],a);run('source-zip-verify',['node','build.cjs','--verify'],a)
 run('source-zip-preservation',['node','tests/sessions-reviewed-preservation.cjs'],a);run('source-zip-ancestry',['node','tests/p7-24-preservation.cjs'],a);run('source-zip-integrity',['node','tests/p738-session-integrity.cjs'],a)
 m=json.loads((a/'source-manifest.json').read_text());assert (a/m['entry']).read_bytes()==(app/m['entry']).read_bytes();assert (t/'Xensonar_direct_test_latest.html').read_bytes()==(app/m['entry']).read_bytes()
with tempfile.TemporaryDirectory(prefix='xensonar-sessions-patch-') as tmp:
 t=pathlib.Path(tmp);index=t/'verify.index';env={**os.environ,'GIT_INDEX_FILE':str(index)}
 run('patch-base-read-tree',['git','read-tree',base],repo,env);run('patch-apply-base-index',['git','apply','--check','--cached',str(patch)],repo,env)
 # Reconstruct a clean baseline with all build inputs and patch-touched existing paths.
 paths=subprocess.check_output(['git','ls-tree','-r','--name-only',base],cwd=repo).decode().splitlines();selected=[p for p in paths if p.startswith(('n21-f2/src/','n21-f2/styles/','n21-f2/template/','n21-f2/tools/','n21-f2/tests/','n21-f2/docs/','.github/')) or p in ['README.md','Xensonar_direct_test_latest.html','n21-f2/README.md','n21-f2/build.cjs','n21-f2/source-manifest.json','n21-f2/source-index.json','n21-f2/package.json','n21-f2/package-lock.json'] or (p.startswith('n21-f2/') and '/' not in p[7:] and p.endswith('.md'))]
 payload=subprocess.check_output(['git','archive',base,'--',*selected],cwd=repo)
 with tarfile.open(fileobj=io.BytesIO(payload)) as tar:tar.extractall(t,filter='data')
 run('patch-workingtree-apply',['git','apply',str(patch)],t)
 a=t/'n21-f2';(a/'node_modules').symlink_to(app/'node_modules',target_is_directory=True)
 run('patched-base-build',['node','build.cjs'],a);run('patched-base-preservation',['node','tests/sessions-reviewed-preservation.cjs'],a)
 m=json.loads((a/'source-manifest.json').read_text());assert (a/m['entry']).read_bytes()==(app/m['entry']).read_bytes()
(app/'results/sessions-reviewed/package-proof.json').write_text(json.dumps({'baseline':base,'sourceZipSHA256':hashlib.sha256(src.read_bytes()).hexdigest(),'patchSHA256':hashlib.sha256(patch.read_bytes()).hexdigest(),'rows':rows,'failed':sum(not r['passed'] for r in rows),'dependencyScope':'Build/test proofs reuse the existing pinned node_modules through a temporary symlink; ZIP excludes dependencies. npm ci is the supported clean dependency installation.'},indent=2)+'\n');print('PASS extracted source and clean-base patch build identical release HTML;',len(rows),'checks')
