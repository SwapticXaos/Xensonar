"""Build deterministic P7.39 artifacts; history registration is explicit."""
import pathlib,json,zipfile,hashlib,subprocess,os,tempfile,argparse
app=pathlib.Path(__file__).resolve().parents[1];repo=app.parent;out=repo/'artifacts';base='18fc0331a58fd7528d9f7c071418ebe590bd0b68';entry='Xensonar_P7_39_Combined_Startup_Test.html'
names=[entry,'XenSonar_P7_39_Combined_Startup_Quellen.zip','P7_39_Combined_Startup_Messdaten.zip','P7_39_Combined_Startup_Pruefbericht.md','XenSonar_P7_39_Combined_Startup.patch'];parser=argparse.ArgumentParser();parser.add_argument('--register',action='store_true');args=parser.parse_args();sha=lambda b:hashlib.sha256(b).hexdigest()
assert json.loads((app/'source-manifest.json').read_text())['entry']==entry
(out/entry).write_bytes((app/entry).read_bytes());(out/names[3]).write_bytes((app/'docs/combined-startup/report.md').read_bytes())
def add(z,name,data):
 info=zipfile.ZipInfo(str(name),(2026,10,22,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.create_system=3;info.external_attr=0o100644<<16;z.writestr(info,data,compresslevel=9)
# Source-only net patch rebuilds generated HTML instead of embedding old or new blobs.
with tempfile.TemporaryDirectory(prefix='xensonar-combined-index-') as tmp:
 env={**os.environ,'GIT_INDEX_FILE':tmp+'/index'};subprocess.run(['git','read-tree',base],cwd=repo,env=env,check=True)
 paths=['README.md','.github','n21-f2',':(exclude,glob)n21-f2/*.html',':(exclude,glob)n21-f2/results/**'];subprocess.run(['git','add','--',*paths],cwd=repo,env=env,check=True)
 (out/names[4]).write_bytes(subprocess.check_output(['git','diff','--cached','--binary',base,'--',*paths],cwd=repo,env=env))
keep={entry,'Xensonar_P7_38_Sessions_Reviewed_Test.html','Xensonar_P7_24_Song_Projects_Test.html','Xensonar_P7_Live_Control_Isolation_Test.html','Xensonar_N21_F2_Forge_Ready_Test.html','Xensonar_N21_F2_Audio_Carrier_Test.html','Xensonar_N21_F2_Live_Controls_Test.html','Xensonar_N21_F2_UI_Refinement_Test.html','Xensonar_N21_F2_Workflow_Integrity_Test.html'}
with zipfile.ZipFile(out/names[1],'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for folder,dirs,files in os.walk(app):
  dirs[:]=sorted(d for d in dirs if d not in {'node_modules','.git','__pycache__','.cache'})
  for name in sorted(files):
   p=pathlib.Path(folder)/name;rel=p.relative_to(app)
   if p.is_symlink() or p.suffix in {'.zip','.pyc'}:continue
   if p.suffix=='.patch' and not rel.as_posix().startswith(('docs/hover-review/received/patches/','docs/combined-startup/received/')):continue
   if name in {'package-proof.json','artifact-verification.json'} and rel.parts[0]=='results':continue
   if rel.parts[0]=='results' and (p.suffix.lower() in {'.png','.jpg','.jpeg','.webp','.html','.wav','.trace','.heapsnapshot','.cpuprofile'} or p.name.endswith('.trace.json')):continue
   if len(rel.parts)==1 and p.suffix=='.html' and name not in keep:continue
   add(z,pathlib.Path('n21-f2')/rel,p.read_bytes())
 for rel in ['README.md','Xensonar_direct_test_latest.html','.github/workflows/consolidation.yml']:add(z,rel,(repo/rel).read_bytes())
 add(z,'PAKETINHALT.md',('XenSonar P7.39 Zwischenstand - Gesamtregression noch offen. Combined Nodal/Starter Grid + Startup. Einstieg: n21-f2/'+entry+'.\nQuellen: npm ci; npm run build; npm run verify:build. Host-/Browsermatrix: node tools/combined_startup_validate.cjs [--browser].\nHistorische Vollinventarpruefungen --historical benoetigen das komplette Repository mit alten Artefakten. Normale reversible Quellenpruefungen funktionieren ohne Git. Fixtures unter tests bleiben vollstaendig. Alte Ergebnisse/HTMLs bleiben im Repository unveraendert; generierte Vergleichsbilder, rohe CPU-/Tracing-Daten und redundante Kandidaten-HTMLs sind nicht im Quellenpaket. Messdaten und native Audio-/Startmessungen stehen im separaten Messdaten-ZIP. Physische Audioausgabe, Opera/Firefox und universelle Absturzfreiheit sind nicht belegt.\n').encode())
assert (out/names[1]).stat().st_size<32*1024*1024,(out/names[1]).stat().st_size
with zipfile.ZipFile(out/names[2],'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for root in [app/'docs/combined-startup',app/'results/combined-startup']:
  for p in sorted(root.rglob('*')):
   if not p.is_file() or p.name=='artifact-verification.json':continue
   add(z,p.relative_to(app),p.read_bytes())
for name in [names[1],names[2]]:
 with zipfile.ZipFile(out/name) as z:assert z.testzip() is None
 print(name,(out/name).stat().st_size)
sums=out/'SHA256SUMS';prefix=subprocess.check_output(['git','show',base+':artifacts/SHA256SUMS'],cwd=repo);assert len(prefix.decode().splitlines())==121;assert sums.read_bytes().startswith(prefix)
for line in prefix.decode().splitlines():
 expected,name=line.split(maxsplit=1);assert sha((out/name.lstrip('*')).read_bytes())==expected,name
registered=prefix+''.join(sha((out/n).read_bytes())+'  '+n+'\n' for n in names).encode()
if args.register:sums.write_bytes(registered);print('Registered',len(registered.decode().splitlines()),'checksums; historical prefix unchanged')
else:print('Provisional artifacts; historical checksum registry unchanged')
