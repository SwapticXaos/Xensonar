'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),parent=require('./fixtures/f444_parent_hashes.json'),m=require('../source-manifest.json');
const allowed=new Set(['src/nodal/02_synthesis_kernel.js','src/nodal/04_audio_runtime.js','src/nodal/12_surface_runtime.js','src/app/forge/01_room_shell.js','template/head.html','src/audio/entrophon/02_worklet_and_voice_backend.js']);
let preserved=0;const changes=[];
for(const [file,hash] of Object.entries(parent.files)){
 const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
 if(hash===actual)preserved++;else{assert(allowed.has(file),'Unexpected production change: '+file);changes.push(file);}
}
assert.deepEqual(changes.sort(),[...allowed].sort());
const files=[...m.files,...m.styles.map(s=>s.file),'template/head.html','template/script-close.html','template/foot.html'];
assert.deepEqual(files.sort(),Object.keys(parent.files).sort(),'No production source added or removed');
const entrophon=fs.readFileSync(path.join(root,'src/audio/entrophon/02_worklet_and_voice_backend.js'),'utf8').replace(/const T8=("(?:[^"\\]|\\.)*")/,'const T8="<worklet>"');
assert.equal(crypto.createHash('sha256').update(entrophon).digest('hex'),parent.entrophonHostShellSha256,'Entrophon host routes outside the embedded Worklet must remain exact');
const report={parentHtmlSha256:parent.parentHtmlSha256,unchangedProductionFiles:preserved,intentionalChanges:changes,entrophonWasmAndHostRoutesUnchanged:true,drumsBassRflMaterialUnchanged:true};
fs.writeFileSync(path.join(root,'results/f444-preservation.json'),JSON.stringify(report,null,2)+'\n');console.log('PASS',report);
