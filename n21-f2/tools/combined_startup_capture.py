"""Explicit release-freeze capture. Never called by build or the test gate."""
import pathlib, subprocess, json, difflib, hashlib, argparse
app=pathlib.Path(__file__).resolve().parents[1]; repo=app.parent; docs=app/'docs/combined-startup'; base='18fc0331a58fd7528d9f7c071418ebe590bd0b68'
sha=lambda b:hashlib.sha256(b).hexdigest()
p=argparse.ArgumentParser();p.add_argument('--freeze',action='store_true');args=p.parse_args()
if not args.freeze: p.error('Capture requires explicit --freeze after production ownership reports ready')
baseline=json.loads((docs/'baseline.json').read_text()); records={}
paths=subprocess.check_output(['git','diff','--name-only',base],cwd=repo,text=True).splitlines()
# Record every existing modified input/test/tool/doc. Generated HTML/results are
# historical bytes, not a second source-of-truth for reversible source edits.
for file in paths:
 if file.startswith('n21-f2/'):
  if file.startswith('n21-f2/results/') or (file.endswith('.html') and '/' not in file[7:]):continue
 elif file not in ['README.md','.github/workflows/consolidation.yml']:continue
 target=repo/file;old=subprocess.check_output(['git','show',base+':'+file],cwd=repo);new=target.read_bytes() if target.exists() else None
 if old==new:continue
 record={'oldSHA256':sha(old),'newSHA256':sha(new) if new is not None else None,'oldBytes':len(old),'newBytes':len(new) if new is not None else None}
 if new is None:record['deletedUTF8']=old.decode()
 else:
  before=old.decode().splitlines(keepends=True);after=new.decode().splitlines(keepends=True)
  # The generated ownership index contains thousands of repeated JSON lines.
  # Store its exact replacement instead of quadratic ambiguous line matching.
  opcodes=[('replace',0,len(before),0,len(after))] if file=='n21-f2/source-index.json' else difflib.SequenceMatcher(None,before,after,autojunk=False).get_opcodes()
  record['edits']=[{'oldStart':a,'newStart':c,'old':before[a:b],'new':after[c:d]} for tag,a,b,c,d in opcodes if tag!='equal']
 records[file[7:] if file.startswith('n21-f2/') else '../'+file]=record
protected=set(baseline['manifest']['files'])|{s['file'] for s in baseline['manifest']['styles']}|{s['file'] for s in baseline['manifest'].get('headExtensions',[])}|{'template/head.html','template/foot.html','template/script-close.html','build.cjs'}
manifest=json.loads((app/'source-manifest.json').read_text());active=set(manifest['files'])|{s['file'] for s in manifest['styles']}|{s['file'] for s in manifest.get('headExtensions',[])}|{'template/head.html','template/foot.html','template/script-close.html','build.cjs'}
new_files={file:sha((app/file).read_bytes()) for file in sorted(active-protected)}
ledger={'base':base,'purpose':'Exact line-addressed reversible release ledger; hashes reject undeclared edits before historical projection. Capture is an explicit freeze operation.','manifest':manifest,'records':records,'additions':new_files,'protectedFiles':sorted(protected),'retirements':sorted(protected-active)}
(docs/'ledger.json').write_text(json.dumps(ledger,indent=2,ensure_ascii=False)+'\n');print('Frozen reversible files',len(records),'active additions',len(new_files))
