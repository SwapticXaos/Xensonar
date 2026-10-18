'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),baseline=require('./fixtures/f442_production_hashes.json');
const manifest=require('../source-manifest.json'),previous=require('./fixtures/f442_manifest.json');
const allowed=new Map([
 ['src/forge/dsp/01_material_tools.js','Named gain-only sampler sharing the original interpolation branch'],
 ['src/forge/revised/01_material.js','Use gain-only sampling where pitch/cell are unused'],
 ['src/forge/hybrid/06_job_capture.js','Delegate carrier snapshot/support ownership to the bounded helper'],
 ['template/head.html','F4.4.3 document title only']
]);
const hash=data=>crypto.createHash('sha256').update(data).digest('hex'),preserved=[],modified=[];
for(const [file,expected] of Object.entries(baseline.files)){
 const actual=hash(fs.readFileSync(path.join(root,file)));
 if(actual===expected)preserved.push(file);
 else{assert(allowed.has(file),'Unreviewed production change: '+file);modified.push({file,reason:allowed.get(file),before:expected,after:actual});}
}
for(const file of allowed.keys())assert(modified.some(item=>item.file===file),'Expected reviewed edit missing: '+file);
assert.deepEqual(manifest.files.filter(file=>!Object.hasOwn(baseline.files,file)),['src/forge/hybrid/10_carrier_capture.js']);
assert.deepEqual(manifest.files.filter(file=>file!=='src/forge/hybrid/10_carrier_capture.js'),previous.files);
assert.deepEqual(manifest.styles,previous.styles);
assert(fs.readFileSync(path.join(root,'template/head.html'),'utf8').replace('XenSonar · F4.4.3 · Spectral Forge Refactor + Runtime','XenSonar · F4.4.2 · Nodal Interaction + Root Follow Runtime')===fs.readFileSync(path.join(root,'tests/fixtures/f442_head.html'),'utf8'));
const report={baseline:baseline.version,preserved,modified,added:['src/forge/hybrid/10_carrier_capture.js']};
fs.mkdirSync(path.join(root,'results'),{recursive:true});
fs.writeFileSync(path.join(root,'results/f443-preservation.json'),JSON.stringify(report,null,2)+'\n');
console.log('PASS',preserved.length,'unchanged production modules/styles/templates;',modified.length,'explicit edits and one new helper');
