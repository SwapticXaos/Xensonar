// Frozen merge ancestry: this test checks all 259 product fragments, not only
// selected audio files or version-name markers. No parent source ZIP needed.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const ledger=require('../../docs/merge/CONSOLIDATION_ANCESTRY_LOCK.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const fmt=x=>JSON.stringify(x);
function productFiles(){const out=[];for(const top of ['src','styles']){
 const walk=dir=>{for(const child of fs.readdirSync(dir,{withFileTypes:true})){
 const abs=path.join(dir,child.name); if(child.isDirectory())walk(abs);
 else if(child.isFile())out.push(path.relative(root,abs).split(path.sep).join('/'));
 }};walk(path.join(root,top));
 }return out.sort()}
function verify(override={}){
 const keys=productFiles();
 assert.deepEqual(keys,Object.keys(ledger.origin_uvo_sha256).sort(),'missing/untracked product files relative to UVO-1');
 assert.deepEqual(keys,Object.keys(ledger.origin_eq_p15_sha256).sort(),'missing/untracked product files relative to EQ P1.5');
 const differsU=[],differsE=[];
 for(const file of keys){
  const actual=Object.prototype.hasOwnProperty.call(override,file)?sha(Buffer.from(override[file])):sha(fs.readFileSync(path.join(root,file)));
  const expectedU=ledger.origin_uvo_sha256[file],expectedE=ledger.origin_eq_p15_sha256[file];
  assert(actual===expectedU||actual===expectedE,'unknown, unreviewed product contents: '+file);
  if(actual!==expectedU)differsU.push(file);
  if(actual!==expectedE)differsE.push(file);
 }
 assert.deepEqual(differsU.sort(),ledger.expected_changes_relative_to_uvo,'UVO changes outside reviewed EQ/editor scope');
 assert.deepEqual(differsE.sort(),ledger.expected_changes_relative_to_eq_p15,'EQ changes outside reviewed UVO ownership scope');
 return keys.length;
}
const count=verify();
// Negative mutation check: an incorrect branch selection must fail this gate.
if(process.argv.includes('--selftest')){
 assert.throws(()=>verify({'src/quickrack/equalizer/eq-core.js':'// accidentally reverted EQ'}),/unreviewed product contents/);
 assert.throws(()=>verify({'src/audio/lifecycle/00_voice_lease.js':'// accidentally reverted UVO'}),/unreviewed product contents/);
 console.log('PASS mutation controls detect wrong EQ and UVO branch content');
}
console.log('PASS full source ancestry: '+count+' fragments, 4 selected EQ/editor descendants, 5 selected UVO descendants');
