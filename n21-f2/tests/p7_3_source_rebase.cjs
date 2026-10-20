'use strict';
// Verify the Forge-only P7.3 delta against a separately reproduced P7.2 checkout.
// This intentionally does NOT rewrite the historical P7 preservation test.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const target=path.resolve(process.argv[2]||'.');
const parent=process.argv[3]&&path.resolve(process.argv[3]);
const patchPath=process.argv[4]&&path.resolve(process.argv[4]);
assert(parent&&patchPath,'Usage: node tests/p7_3_source_rebase.cjs <p7.3-root> <p7.2-root> <stage11.xpatch.json>');
const patch=JSON.parse(fs.readFileSync(patchPath));
assert.equal(patch.order,11);
const hash=t=>crypto.createHash('sha256').update(t).digest('hex');
let editCount=0;
for(const f of patch.files){
 const oldPath=path.join(parent,f.path),newPath=path.join(target,f.path);
 const old=fs.existsSync(oldPath)?fs.readFileSync(oldPath,'utf8'):'';
 const got=fs.readFileSync(newPath,'utf8');
 assert.equal(hash(old),f.before_sha256,`${f.path}: wrong predecessor`);
 const points=Array.from(old);
 for(const e of [...f.edits].reverse()){
  assert(e.at>=0&&e.at+e.delete<=points.length,`${f.path}: invalid Unicode span`);
  points.splice(e.at,e.delete,...Array.from(e.insert));editCount++;
 }
 assert.equal(points.join(''),got,`${f.path}: unreviewed change outside exact stage11 spans`);
 assert.equal(hash(got),f.after_sha256,`${f.path}: wrong output`);
}
// No hidden source/style/template changes from the P7.2 snapshot.
const walk=(root,dir)=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(root,dir+'/'+entry.name):[dir+'/'+entry.name]);
const changed=new Set(patch.files.map(f=>f.path));
let unchanged=0;
for(const dir of ['src','styles','template'])for(const f of walk(parent,dir)){
 const next=path.join(target,f);assert(fs.existsSync(next),`P7.3 deleted original source ${f}`);
 if(changed.has(f))continue;
 assert.equal(hash(fs.readFileSync(next)),hash(fs.readFileSync(path.join(parent,f))),`Undeclared P7.3 code drift ${f}`);
 unchanged++;
}
const manifest=JSON.parse(fs.readFileSync(path.join(target,'source-manifest.json')));
let html=fs.readFileSync(path.join(target,'template/head.html'),'utf8');
for(const f of manifest.files)html+=fs.readFileSync(path.join(target,f),'utf8');
html+=fs.readFileSync(path.join(target,'template/script-close.html'),'utf8');
for(const s of manifest.styles)html+=s.tag+fs.readFileSync(path.join(target,s.file),'utf8')+'</style>'+s.after;
html+=fs.readFileSync(path.join(target,'template/foot.html'),'utf8');
assert.equal(hash(html),patch.result_html_sha256,'P7.3 produced wrong standalone HTML');
assert.equal(Buffer.byteLength(html),patch.result_html_bytes,'P7.3 HTML size diverges');
console.log(`PASS P7.3 exact rebase: ${patch.files.length} files, ${editCount} source-span edits, ${unchanged} inherited source/style/template files byte-identical`);
console.log(`PASS P7.3 built HTML SHA256 ${patch.result_html_sha256}`);
