import pathlib,json,zipfile,hashlib,shutil,subprocess,os,sys,tempfile
repo=pathlib.Path(__file__).resolve().parents[2];app=repo/'n21-f2';out=repo/'artifacts';m=json.loads((app/'source-manifest.json').read_text());base='10178acb733db38f1801b263ac5200d98c17e69b';entry='Xensonar_P7_38_Sessions_Reviewed_Test.html';assert m['entry']==entry
report='P7_38_Sessions_Reviewed_Pruefbericht.md';patchname='XenSonar_P7_38_Sessions_Reviewed.patch';proofname='P7_38_Sessions_Reviewed_Messdaten.zip';srcname='XenSonar_P7_38_Sessions_Reviewed_Quellen.zip'
referenceName='XenSonar_P7_37_GridProfiles_Hover_BootGuard_Test.html'
referencePath=pathlib.Path(os.environ.get('XENSONAR_HANDOFF_REFERENCE','/tmp/xensonar-hover-handoff/'+referenceName))
if referencePath.exists():referenceBytes=referencePath.read_bytes()
else:
 with zipfile.ZipFile(out/proofname) as previousProof:referenceBytes=previousProof.read('handoff-reference/'+referenceName)
assert hashlib.sha256(referenceBytes).hexdigest()=='35406409a61e3cbe8d989490b2f8dedd95ac2934205248f1873f643a1219d9bb'
shutil.copyfile(app/entry,out/entry);shutil.copyfile(app/'docs/sessions-reviewed/report.md',out/report)
index='/tmp/xensonar-sessions-reviewed-release.index';pathlib.Path(index).unlink(missing_ok=True);env={**os.environ,'GIT_INDEX_FILE':index}
subprocess.run(['git','read-tree',base],cwd=repo,env=env,check=True)
paths=['README.md','Xensonar_direct_test_latest.html','.github','n21-f2',':!n21-f2/*.html',':!n21-f2/results/**']
subprocess.run(['git','add','--',*paths],cwd=repo,env=env,check=True)
(out/patchname).write_bytes(subprocess.check_output(['git','diff','--cached','--binary',base,'--',*paths],cwd=repo,env=env));pathlib.Path(index).unlink()
with zipfile.ZipFile(out/proofname,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in sorted((app/'results/sessions-reviewed').rglob('*')):
  if p.is_file():z.write(p,p.relative_to(app))
 for p in sorted((app/'docs/sessions-reviewed').glob('*')):
  if p.is_file():z.write(p,p.relative_to(app))
 for p in sorted((app/'docs/hover-review').rglob('*')):
  if p.is_file():z.write(p,p.relative_to(app))
 z.writestr('handoff-reference/'+referenceName,referenceBytes)
keep={entry,'Xensonar_P7_24_Song_Projects_Test.html','Xensonar_P7_Live_Control_Isolation_Test.html','Xensonar_N21_F2_Forge_Ready_Test.html','Xensonar_N21_F2_Audio_Carrier_Test.html','Xensonar_N21_F2_Live_Controls_Test.html','Xensonar_N21_F2_UI_Refinement_Test.html','Xensonar_N21_F2_Workflow_Integrity_Test.html'}
with zipfile.ZipFile(out/srcname,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for folder,dirs,files in os.walk(app):
  dirs[:]=sorted(d for d in dirs if d not in {'node_modules','.git','__pycache__','.cache'})
  for name in sorted(files):
   p=pathlib.Path(folder)/name;rel=p.relative_to(app)
   if p.is_symlink() or p.suffix in {'.zip','.pyc'}:continue
   if p.suffix=='.patch' and not rel.as_posix().startswith('docs/hover-review/received/patches/'):continue
   if rel.as_posix() in {'results/sessions-reviewed/package-proof.json','results/sessions-reviewed/artifact-verification.json'}:continue
   if rel.parts[0]=='results' and 'sessions-reviewed' not in rel.parts and p.suffix.lower() in {'.png','.jpg','.jpeg','.webp'}:continue
   if len(rel.parts)==1 and p.suffix=='.html' and name not in keep:continue
   z.write(p,pathlib.Path('n21-f2')/rel)
 for rel in ['README.md','Xensonar_direct_test_latest.html','.github/workflows/consolidation.yml']:z.write(repo/rel,rel)
 z.writestr(zipfile.ZipInfo('PAKETINHALT.md',(2026,10,21,0,0,0)),'XenSonar P7.38: gepruefte Sessions, Grid-Profile, Hover- und Boot-Schutz, native Vorschauen. Aktive Datei: '+entry+'. Quellen, Historienpruefung und Freigabetests unter n21-f2: npm ci, npm run build, npm run test:consolidation, npm run test:consolidation:browser. Unveraenderte P7.24-Song-Quellen, Styles und Tests bleiben als historischer Vertrag vorhanden, sind nicht im aktiven Build. Die Originaluebergabe wird durch Manifest, Pruefsummen, Stufenledger und uebernommene Testfaelle dokumentiert. Alte generierte Screenshots und weitere HTML-Versionen bleiben unveraendert im Repository und frueheren Archiven; zur Groessenbegrenzung enthaelt dieses Paket nur benoetigte Vergleichs-HTMLs. Aktuelle Messdaten/Screenshots sind enthalten. Native Chromium-Pruefung belegt keine physische Audioausgabe.\n',compress_type=zipfile.ZIP_DEFLATED)
assert (out/srcname).stat().st_size<32*1024*1024,(out/srcname).stat().st_size
for name in [srcname,proofname]:
 with zipfile.ZipFile(out/name) as z:assert z.testzip() is None
 print(name,(out/name).stat().st_size)
sums=out/'SHA256SUMS';original=subprocess.check_output(['git','show',base+':artifacts/SHA256SUMS'],cwd=repo).decode();previous=sums.read_text().splitlines();assert sums.read_text().startswith(original);assert len(previous) in (116,121);names=[entry,srcname,proofname,report,patchname]
assert len(previous)==116 or [line.split(maxsplit=1)[1].lstrip('*') for line in previous[116:]]==names
previous=previous[:116];known=set()
for line in previous:
 expected,name=line.split(maxsplit=1);name=name.lstrip('*');known.add(name);assert hashlib.sha256((out/name).read_bytes()).hexdigest()==expected,name
for name in names:
 assert name not in known;previous.append(hashlib.sha256((out/name).read_bytes()).hexdigest()+'  '+name)
if '--no-register' not in sys.argv:
 sums.write_text('\n'.join(previous)+'\n');assert sums.read_text().startswith(original);print('Artifact checksums',len(previous))
else:print('Provisional artifacts generated; checksum registry unchanged')
