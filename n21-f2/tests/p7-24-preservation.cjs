'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const base=require('../docs/p7-24-song-projects/baseline.json'),fixes=require('../docs/p7-24-song-projects/corrections.json'),added=require('../docs/p7-24-song-projects/additions.json'),sessions=require('./sessions-reviewed-preservation.cjs'),manifest=sessions.priorManifest;
const sha=x=>crypto.createHash('sha256').update(x).digest('hex'),anchors={};
assert.equal(base.commit,'5e82993f5bf44c0c65c0dfbabacaf0688565a930');
for(const file of Object.keys(fixes))assert(Object.hasOwn(base.hashes,file),'correction must name an existing baseline unit');
for(const [file,hash] of Object.entries(base.hashes)){
 let text=sessions.readBaseline(file);const current=sha(fs.readFileSync(file));
 for(const c of [...(fixes[file]||[])].reverse()){
  assert.equal(text.split(c.new).length-1,c.count,'exact P7.24 correction '+file);
  text=text.split(c.new).join(c.old);
 }
 assert.equal(sha(text),hash,'P7.24 protected source/style/template '+file);
 if(fixes[file])anchors[file]=current;
}
assert.deepEqual(added.sourceAdditions.map(a=>a.file),['src/mix/03_song_projects.js'],'bounded new source surface');
assert.deepEqual(added.styleAdditions.map(a=>a.definition.file),['styles/27_song_projects.css'],'bounded new style surface');
const files=[...base.files],styles=base.styles.map(s=>({...s}));
for(const a of added.sourceAdditions){
 assert(!base.files.includes(a.file)&&!files.includes(a.file),'unique new source '+a.file);
 const at=files.indexOf(a.after);assert(at>=0,'declared source predecessor '+a.file);
 assert.equal(sha(sessions.readBaseline(a.file)),a.sha256,'reviewed new source '+a.file);
 files.splice(at+1,0,a.file);anchors[a.file]=a.sha256;
}
for(const a of added.styleAdditions){
 const file=a.definition.file;assert(!styles.some(s=>s.file===file),'unique new style '+file);
 const at=styles.findIndex(s=>s.file===a.after);assert(at>=0,'declared style predecessor '+file);
 assert.equal(sha(sessions.readBaseline(file)),a.sha256,'reviewed new style '+file);
 styles.splice(at+1,0,a.definition);anchors[file]=a.sha256;
}
assert.deepEqual(manifest.files,files,'exact complete source ordering');
assert.deepEqual(manifest.styles,styles,'exact complete style ordering');
const sourceAdditions=added.sourceAdditions.map(a=>a.file),styleAdditions=added.styleAdditions.map(a=>a.definition.file);
const priorManifest={...manifest,files:manifest.files.filter(f=>!sourceAdditions.includes(f)),styles:manifest.styles.filter(s=>!styleAdditions.includes(s.file))};
assert.deepEqual(priorManifest.files,base.files);assert.deepEqual(priorManifest.styles,base.styles);
console.log('PASS P7.24 exact reversible source corrections, protected baseline and hashed additions/order');
if(process.argv.includes('--historical')){
 const path=require('node:path'),historical=require('../docs/p7-24-song-projects/historical-files.json'),root=path.resolve(__dirname,'../..');
 assert.equal(historical.commit,base.commit);
 assert.equal(Object.keys(historical.sha256).length,868,'complete frozen historical inventory');
 for(const [file,hash] of Object.entries(historical.sha256)){
  let bytes=fs.readFileSync(path.join(root,file));
  if(file.startsWith('n21-f2/')&&Object.hasOwn(require('../docs/sessions-reviewed/baseline.json').hashes,file.slice(7)))bytes=Buffer.from(sessions.readBaseline(file.slice(7)));
  if(file==='artifacts/SHA256SUMS'){
   const lines=bytes.toString('utf8').split('\n');
   assert(lines.length>=112,'all 111 prior checksum entries remain');
   bytes=Buffer.from(lines.slice(0,111).join('\n')+'\n');
  }
  assert.equal(sha(bytes),hash,'historical artifact/result/HTML preserved '+file);
 }
 console.log('PASS all 868 historical paths and exact 111-entry checksum prefix preserved');
}
module.exports={anchors:{...anchors,...sessions.anchors},sourceAdditions:[...sourceAdditions.filter(f=>!sessions.sourceRetirements.includes(f)),...sessions.sourceAdditions],styleAdditions:[...styleAdditions.filter(f=>!sessions.styleRetirements.includes(f)),...sessions.styleAdditions],priorManifest};
