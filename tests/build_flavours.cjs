'use strict';
// DIAG-01: the delivery is the diagnostic build minus exactly the sections marked "diag" (each with its <script> element).
// Compared on the uncompacted builds (--plain); MIN-01: index.html must equal the compaction of the plain delivery (build.py --check).
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');
for(const args of [['--plain'],['--diag','--plain']])execFileSync('python3',[path.join(root,'tools/build.py'),...args],{cwd:root});
execFileSync('python3',[path.join(root,'tools/build.py'),'--check'],{cwd:root}); // index.html = compaction of the plain delivery
const man=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'),'utf8'));
const lean=fs.readFileSync(path.join(root,'dist/XenSonar_PLAIN.html'),'utf8'),full=fs.readFileSync(path.join(root,'dist/XenSonar_DIAG_PLAIN.html'),'utf8');
const diag=man.sources.filter(s=>s.diag);assert(diag.length>=1,'some sections are marked diag');
let rebuilt=full;
for(const s of diag){
 const body=s.files.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('');
 const i=rebuilt.indexOf(body);assert(i>0,'diag section present in the diagnostic build: '+s.id);
 const open=rebuilt.lastIndexOf('<script',i),close=rebuilt.indexOf('</script>',i+body.length)+'</script>'.length;
 assert.equal(rebuilt.slice(open,i).endsWith('>'),true);let a=open;while(a>0&&(rebuilt[a-1]===' '||rebuilt[a-1]==='\t'))a--;let z=close;while(rebuilt[z]===' '||rebuilt[z]==='\t')z++;if(rebuilt[z]==='\n')z++;
 rebuilt=rebuilt.slice(0,a)+rebuilt.slice(z);
}
assert.equal(rebuilt,lean,'delivery = diagnostic build without the diag sections');
for(const s of diag)assert(!lean.includes(s.files.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('').slice(0,200)),'delivery has no '+s.id);
console.log(`PASS DIAG-01 build flavours: delivery ${lean.length} chars = diagnostic build ${full.length} chars minus ${diag.length} diag sections`);
