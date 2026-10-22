'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const base=require('../docs/sessions-reviewed/baseline.json'),fixes=require('../docs/sessions-reviewed/corrections.json'),added=require('../docs/sessions-reviewed/additions.json'),manifest=require('../source-manifest.json');
const root=path.resolve(__dirname,'..'),sha=x=>crypto.createHash('sha256').update(x).digest('hex'),anchors={},projected=new Map();
assert.equal(base.commit,'10178acb733db38f1801b263ac5200d98c17e69b');
assert.equal(manifest.entry,'Xensonar_P7_38_Sessions_Reviewed_Test.html');
assert.equal(manifest.version,'XenSonar P7.38 · reviewed Sessions, grid profiles, auditions and startup geometry');
assert.deepEqual(Object.fromEntries(Object.keys(base.metadata).map(k=>[k,manifest[k]])),base.metadata,'preserved manifest metadata');
assert.deepEqual(Object.keys(manifest).sort(),['version','entry','files','sha256','bytes','sourceOrder','status','baseVersion','styles','baselineSha256','headExtensions'].sort(),'bounded manifest field surface');
assert.equal(base.files.length,208);assert.equal(base.styles.length,28);assert.equal(Object.keys(base.hashes).length,239);
for(const file of Object.keys(fixes))assert(Object.hasOwn(base.hashes,file),'reviewed correction belongs to baseline '+file);
for(const [file,hash] of Object.entries(base.hashes)){
 let text=fs.readFileSync(path.join(root,file),'utf8');const current=sha(text);
 for(const c of [...(fixes[file]||[])].reverse()){
  assert.equal(c.count,1,'unique reviewed correction '+file);assert.equal(text.split(c.new).length-1,c.count,'exact P7.38 correction '+file);
  text=text.split(c.new).join(c.old);
 }
 assert.equal(sha(text),hash,'P7.38 protected source/style/template '+file);projected.set(file,text);
 if(fixes[file])anchors[file]=current;
}
assert.deepEqual(added.sourceRetirements.map(a=>a.file),['src/mix/03_song_projects.js']);
assert.deepEqual(added.styleRetirements.map(a=>a.definition.file),['styles/27_song_projects.css']);
assert.deepEqual(added.sourceAdditions.map(a=>a.file),['src/mix/03_meta_menu.js','src/mix/03_legacy_song_import.js','src/mix/03_session_auditions.js']);
assert.deepEqual(added.styleAdditions.map(a=>a.definition.file),['styles/27_meta_menu.css']);
const files=[...base.files],styles=base.styles.map(s=>({...s}));
for(const a of added.sourceRetirements){
 assert.equal(files[a.index],a.file,'exact retired source position');assert.equal(base.hashes[a.file],a.sha256);assert.equal(sha(fs.readFileSync(path.join(root,a.file))),a.sha256,'retired source retained unchanged');files.splice(files.indexOf(a.file),1);
}
for(const a of added.styleRetirements){
 assert.deepEqual(base.styles[a.index],a.definition,'exact retired style position');assert.equal(base.hashes[a.definition.file],a.sha256);assert.equal(sha(fs.readFileSync(path.join(root,a.definition.file))),a.sha256,'retired style retained unchanged');styles.splice(styles.findIndex(s=>s.file===a.definition.file),1);
}
for(const a of added.sourceAdditions){
 assert(!base.files.includes(a.file)&&!files.includes(a.file));const at=files.indexOf(a.after);assert(at>=0);assert.equal(sha(fs.readFileSync(path.join(root,a.file))),a.sha256,'reviewed new source '+a.file);files.splice(at+1,0,a.file);anchors[a.file]=a.sha256;
}
for(const a of added.styleAdditions){
 const file=a.definition.file;assert(!styles.some(s=>s.file===file));const at=styles.findIndex(s=>s.file===a.after);assert(at>=0);assert.equal(sha(fs.readFileSync(path.join(root,file))),a.sha256,'reviewed new style '+file);styles.splice(at+1,0,a.definition);anchors[file]=a.sha256;
}
assert.deepEqual(manifest.files,files,'exact complete source order and retirement');assert.deepEqual(manifest.styles,styles,'exact complete style order and retirement');
assert.deepEqual(added.headExtensions.map(a=>a.definition.file),['styles/28_grid_profiles.css','src/app/00_startup_diagnostics.js']);
assert.deepEqual(manifest.headExtensions,added.headExtensions.map(a=>a.definition),'exact reviewed head extension wrappers and ordering');
for(const a of added.headExtensions){assert(!base.hashes[a.definition.file]);assert.equal(sha(fs.readFileSync(path.join(root,a.definition.file))),a.sha256,'reviewed head extension '+a.definition.file);anchors[a.definition.file]=a.sha256;}
assert.equal(added.build.file,'build.cjs');assert.equal(sha(fs.readFileSync(path.join(root,added.build.file))),added.build.sha256,'reviewed reproducible build extension');
const priorManifest={...manifest,files:base.files,styles:base.styles};delete priorManifest.headExtensions;
const readBaseline=file=>{assert(projected.has(file),'projected protected baseline file '+file);return projected.get(file)};
if(require.main===module)console.log('PASS P7.38 exact 239-unit reversible baseline, bounded source/style retirements/additions, head extensions and build');
if(process.argv.includes('--historical')){
 const historical=require('../docs/sessions-reviewed/historical-files.json');assert.equal(historical.commit,base.commit);assert.equal(historical.checksumPrefixEntries,116);assert.equal(Object.keys(historical.sha256).length,935);
 for(const [file,hash] of Object.entries(historical.sha256)){
  let bytes=fs.readFileSync(path.join(root,'..',file));const appFile=file.startsWith('n21-f2/')?file.slice(7):null;
  if(appFile&&projected.has(appFile))bytes=Buffer.from(readBaseline(appFile));
  if(file==='artifacts/SHA256SUMS'){const lines=bytes.toString('utf8').trimEnd().split('\n');assert(lines.length>=116);bytes=Buffer.from(lines.slice(0,116).join('\n')+'\n');}
  assert.equal(sha(bytes),hash,'historical artifact/result/HTML/contract preserved '+file);
 }
 console.log('PASS 935 historical paths and exact 116-entry checksum prefix preserved');
}
module.exports={anchors,sourceAdditions:added.sourceAdditions.map(a=>a.file),styleAdditions:added.styleAdditions.map(a=>a.definition.file),sourceRetirements:added.sourceRetirements.map(a=>a.file),styleRetirements:added.styleRetirements.map(a=>a.definition.file),priorManifest,readBaseline};
