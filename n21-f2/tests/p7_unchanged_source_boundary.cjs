'use strict';
// Source-boundary gate: exactly the stated P7 patch surface differs from the
// user's original N21-F2 Nodal Ball Grid baseline. Does NOT whitewash legacy
// preservation hash tests: their conflicts remain explicitly documented.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const patched=path.resolve(process.argv[2]||'.');
const baseline=process.argv[3]&&path.resolve(process.argv[3]);
const patchesDir=process.argv[4]&&path.resolve(process.argv[4]);
assert(baseline&&patchesDir,'Usage: node p7_unchanged_source_boundary.cjs <patched-tree> <original-tree> <handoff-patches-directory>');
const stages=fs.readdirSync(patchesDir).filter(n=>/^0[0-8]_.*\.xpatch\.json$/.test(n)).sort();
assert.equal(stages.length,9,'Nine reviewed patch stages expected');
const touched=new Set(),byStage=[];
for(const stage of stages){const data=JSON.parse(fs.readFileSync(path.join(patchesDir,stage)));
 assert.equal(data.format,'xensonar-source-span-patch-v1');
 for(const file of data.files)touched.add(file.path);
 byStage.push([stage,data.files.length]);
}
const walk=(dir,prefix='')=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(item=>{
 const rel=prefix?prefix+'/'+item.name:item.name;return item.isDirectory()?walk(path.join(dir,item.name),rel):[rel]});
const originalFiles=walk(baseline).filter(p=>/^(src|styles|template)\//.test(p));
const currentFiles=walk(patched).filter(p=>/^(src|styles|template)\//.test(p));
const originals=new Set(originalFiles),currents=new Set(currentFiles);
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
let unchanged=0,changed=0,added=0;
for(const rel of new Set([...originals,...currents])){
 const a=originals.has(rel),b=currents.has(rel),declared=touched.has(rel);
 assert(b,`Unexpected deletion: ${rel}`);
 if(!a){assert(declared,`Undeclared new file: ${rel}`);added++;continue}
 const equal=hash(path.join(baseline,rel))===hash(path.join(patched,rel));
 if(equal)unchanged++;
 else{assert(declared,`Undeclared modified source: ${rel}`);changed++}
}
for(const rel of touched)assert(currents.has(rel),`Patch refers to absent source: ${rel}`);
const baseManifest=JSON.parse(fs.readFileSync(path.join(baseline,'source-manifest.json')));
const p7Manifest=JSON.parse(fs.readFileSync(path.join(patched,'source-manifest.json')));
assert.deepEqual(p7Manifest.files.slice(1),baseManifest.files,'Pre-existing module assembly sequence changed');
assert.equal(p7Manifest.files[0],'src/handoff/00_chat_feature_addons.js','Only reviewed feature addon may be prepended');
assert.deepEqual(p7Manifest.styles,baseManifest.styles,'Stylesheet order and ownership must be preserved');
console.log(`PASS P7 source boundary: ${unchanged} identical source/style/template files, ${changed} declared modifications, ${added} declared addition`);
console.log(`PASS all ${stages.length} stages and exact existing module order retained: ${byStage.map(([s,n])=>s.slice(0,2)+':'+n).join(' ')}`);
