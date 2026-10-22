'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),repo=path.dirname(root),base=require('../docs/combined-startup/baseline.json'),ledger=require('../docs/combined-startup/ledger.json'),manifest=require('../source-manifest.json');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex'),projected=new Map(),anchors={};
assert.equal(base.commit,'18fc0331a58fd7528d9f7c071418ebe590bd0b68');assert.equal(ledger.base,base.commit);assert.equal(base.checksumPrefixEntries,121);
const expectedProtected=[...new Set([...base.manifest.files,...base.manifest.styles.map(s=>s.file),...(base.manifest.headExtensions||[]).map(s=>s.file),'template/head.html','template/foot.html','template/script-close.html','build.cjs'])].sort();assert.deepEqual(ledger.protectedFiles,expectedProtected,'complete independent protected source/style/template/build set');
const expectedAdded=[...new Set([...manifest.files,...manifest.styles.map(s=>s.file),...(manifest.headExtensions||[]).map(s=>s.file)])].filter(f=>!expectedProtected.includes(f)).sort();assert.deepEqual(Object.keys(ledger.additions).sort(),expectedAdded,'complete independent active-file addition set');
const activeFiles=new Set([...manifest.files,...manifest.styles.map(s=>s.file),...(manifest.headExtensions||[]).map(s=>s.file),'template/head.html','template/foot.html','template/script-close.html','build.cjs']);assert.deepEqual(ledger.retirements,expectedProtected.filter(f=>!activeFiles.has(f)),'explicit complete source/style/head retirement ledger');
assert.equal(manifest.entry,'Xensonar_P7_39_Combined_Startup_Test.html');assert.deepEqual(manifest,ledger.manifest,'frozen complete manifest metadata/order/head extensions');
for(const [file,record] of Object.entries(ledger.records)){
 const target=path.join(root,file);let restored;
 if(record.newSHA256===null){assert(!fs.existsSync(target),'declared deleted input '+file);restored=record.deletedUTF8;}
 else {
  const bytes=fs.readFileSync(target);assert.equal(sha(bytes),record.newSHA256,'exact reviewed current bytes '+file);assert.equal(bytes.length,record.newBytes);
  const lines=bytes.toString('utf8').match(/[^\n]*\n|[^\n]+$/g)||[];
  for(const edit of [...record.edits].reverse()){assert.deepEqual(lines.slice(edit.newStart,edit.newStart+edit.new.length),edit.new,'exact reversible edit '+file);lines.splice(edit.newStart,edit.new.length,...edit.old)}
  restored=lines.join('');anchors[file]=record.newSHA256;
 }
 assert.equal(sha(restored),record.oldSHA256,'exact baseline projection '+file);assert.equal(Buffer.byteLength(restored),record.oldBytes);assert.equal(record.oldSHA256,base.sha256[file.startsWith('../')?file.slice(3):'n21-f2/'+file],'frozen baseline inventory '+file);projected.set(file,restored);
}
for(const file of ledger.protectedFiles){const expected=base.sha256['n21-f2/'+file];assert(expected,'baseline protected inventory '+file);assert.equal(sha(projected.get(file)??fs.readFileSync(path.join(root,file))),expected,'all original production inputs protected '+file)}
for(const [file,hash] of Object.entries(ledger.additions)){assert(!base.sha256['n21-f2/'+file],'new active file '+file);assert.equal(sha(fs.readFileSync(path.join(root,file))),hash,'new active file exact bytes '+file);anchors[file]=hash}
const readBaseline=file=>projected.get(file)??fs.readFileSync(path.join(root,file),'utf8');
if(process.argv.includes('--historical')){
 for(const [file,expected] of Object.entries(base.sha256)){
  let bytes;if(file==='Xensonar_direct_test_latest.html'){assert.equal(sha(fs.readFileSync(path.join(repo,file))),manifest.sha256,'active direct-test pointer');bytes=fs.readFileSync(path.join(root,base.manifest.entry));assert.equal(sha(bytes),expected,'original direct-test bytes retained in prior active HTML');continue}const key=file.startsWith('n21-f2/')?file.slice(7):'../'+file;if(projected.has(key))bytes=Buffer.from(projected.get(key));else bytes=fs.readFileSync(path.join(repo,file));
  if(file==='artifacts/SHA256SUMS'){const lines=bytes.toString().trimEnd().split('\n');assert(lines.length>=121);bytes=Buffer.from(lines.slice(0,121).join('\n')+'\n')}
  assert.equal(sha(bytes),expected,'historical path preserved '+file);
 }
 console.log('PASS immutable P7.38 history '+Object.keys(base.sha256).length+' paths and exact 121-entry checksum prefix');
}
if(require.main===module)console.log('PASS P7.39 reversible release ledger, original production inputs, active additions and complete manifest');
module.exports={readBaseline,priorManifest:base.manifest,anchors,sourceAdditions:manifest.files.filter(f=>!base.manifest.files.includes(f)),styleAdditions:manifest.styles.filter(s=>!base.manifest.styles.some(p=>p.file===s.file)).map(s=>s.file)};
