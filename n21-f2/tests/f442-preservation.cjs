'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),baseline=require('./fixtures/f441_preservation_baseline.json');
const allowed=new Map([
 ['src/nodal/07_sound_designer.js','Audit interaction, persistence and history fixes'],
 ['src/forge_and_melodic/05_preview_and_sample_intake.js','Optional external history owner for shared envelope editor; legacy owner remains default'],
 ['src/audio/02_rfl_worklet.js','Equivalent worklet sampling and reporting; cached warmup settings'],
 ['src/audio/03_recorder.js','RFL material/scheduler settings cache only'],
 ['styles/20_nodal_sound_designer.css','Constellation workspace, remove action and node menu'],
 ['template/head.html','F4.4.2 document title']
]);
const hash=s=>crypto.createHash('sha256').update(s).digest('hex'),preserved=[],modified=[];
for(const [file,expected]of Object.entries(baseline.files)){
 const actual=hash(fs.readFileSync(path.join(root,file)));
 if(actual===expected)preserved.push(file);else{assert(allowed.has(file),'Unreviewed change outside patch: '+file);modified.push({file,reason:allowed.get(file),before:expected,after:actual});}
}
for(const file of allowed.keys())assert(modified.some(m=>m.file===file),'Expected audited edit missing: '+file);
const manifest=require('../source-manifest.json'),added=manifest.files.filter(f=>!Object.hasOwn(baseline.files,f));
assert.deepEqual(added,['src/nodal/11_editing_session.js','src/audio/00_rfl_settings_cache.js']);
const report={baseline:baseline.version,preserved,modified,added};fs.writeFileSync(path.join(root,'results/f442-preservation.json'),JSON.stringify(report,null,2)+'\n');
console.log('PASS',preserved.length,'unchanged production modules/styles; six audited edits and two explicit new modules');
