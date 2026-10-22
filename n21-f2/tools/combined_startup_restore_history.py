"""Restore frozen evidence after tests. Never restores source or release files."""
import pathlib,subprocess,json,argparse,hashlib
app=pathlib.Path(__file__).resolve().parents[1];repo=app.parent;base=json.loads((app/'docs/combined-startup/baseline.json').read_text());parser=argparse.ArgumentParser();parser.add_argument('--restore',action='store_true');args=parser.parse_args()
if not args.restore:parser.error('requires --restore after evidence capture')
if not (repo/'.git').exists():
 print('Source-only tree: no historical Git repository to restore; full --historical checks require the repository')
 raise SystemExit(0)
count=0
for file in base['sha256']:
 if not file.startswith('n21-f2/results/'):continue
 target=repo/file
 if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest()==base['sha256'][file]:continue
 original=subprocess.check_output(['git','show',base['commit']+':'+file],cwd=repo)
 if not target.exists() or target.read_bytes()!=original:target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(original);count+=1
print('Restored historical result bytes:',count)
