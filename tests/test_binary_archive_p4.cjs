'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const source=fs.readFileSync(path.join(__dirname,'../src/package_station/01_binary_archive.js'),'utf8');
const factory=new Function(source.slice(0,source.indexOf('let __xenPackageStation4Instance;'))+';return __createXenPackageStation4;')();
const api=factory({__XEN_PACKAGE_STATION_TEST__:true}),t=api._test;
async function fileSink(name){const handle=await fs.promises.open(name,'w');return {async write(bytes){await handle.write(bytes)},async close(){await handle.close();return fileSource(name)}}}
function fileSource(name){const size=fs.statSync(name).size;return {size,async read(offset,length){const handle=await fs.promises.open(name,'r');try{const b=Buffer.alloc(length);const {bytesRead}=await handle.read(b,0,length,offset);assert.equal(bytesRead,length);return b}finally{await handle.close()}},slice:async(o,n)=>new Blob([await fileSource(name).read(o,n)])}}
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'xen-p4-'));
 try{
  const bytes=new Uint8Array(5*1024*1024+7);for(let i=0;i<bytes.length;i++)bytes[i]=(i*17+i%71)&255;
  const buf=bytes.buffer,obj={bytes,view:new DataView(buf,3,511),file:new File([bytes],'Original.wav',{type:'audio/wav',lastModified:12345678}),blob:new Blob([bytes],{type:'audio/ogg'}),zero:-0,nan:NaN,infinity:Infinity,negative:-Infinity,undef:undefined,big:92345678901234567890n,date:new Date(12345),badDate:new Date(NaN),regexp:/abc+/gi,text:'ä漢字😀\ud800'.repeat(40000),array:new Array(10)};
  obj.array[7]='sparse';obj.self=obj;obj.map=new Map([[obj,'cycle']]);obj.set=new Set([obj]);obj.bytesAgain=bytes;Object.defineProperty(obj,'__proto__',{value:{safe:'yes'},enumerable:true});
  const file=path.join(dir,'codec.bin'),w=await t.writer(await fileSink(file));await t.encode(w,obj);await w.finish();
  const r=t.reader(fileSource(file));await r.init();const restored=await t.decode(r);assert.equal((await r.next()).tag,3);
  assert.deepEqual(new Uint8Array(restored.bytes.buffer),bytes);assert.equal(restored.bytes,restored.bytesAgain);assert.equal(restored.bytes.buffer,restored.view.buffer);assert.equal(restored.self,restored);assert.equal(restored.map.get(restored),'cycle');assert(restored.set.has(restored));
  assert.equal(restored.file.name,'Original.wav');assert.equal(restored.file.lastModified,12345678);assert.equal(restored.file.type,'audio/wav');assert.deepEqual(new Uint8Array(await restored.file.arrayBuffer()),bytes);assert.deepEqual(new Uint8Array(await restored.blob.arrayBuffer()),bytes);
  assert(Object.is(restored.zero,-0));assert(Number.isNaN(restored.nan));assert(Number.isNaN(restored.badDate.getTime()));assert.equal(restored.infinity,Infinity);assert.equal(restored.negative,-Infinity);assert.equal(restored.undef,undefined);assert.equal(restored.big,obj.big);assert.equal(restored.date.getTime(),12345);assert.equal(restored.text,obj.text);assert.equal(restored.array.length,10);assert(!(0 in restored.array));assert.equal(restored.array[7],'sparse');assert.equal(Object.getPrototypeOf(restored),Object.prototype);assert.equal(restored.__proto__.safe,'yes');
  const verify=t.reader(fileSource(file));await verify.init();await t.decode(verify,false);assert.equal((await verify.next()).tag,3);
  const damaged=fs.readFileSync(file);damaged[damaged.length-60]^=1;fs.writeFileSync(path.join(dir,'bad'),damaged);const bad=t.reader(fileSource(path.join(dir,'bad')));await bad.init();await assert.rejects(async()=>{await t.decode(bad);await bad.next()},/Prüfsumme|Archiv/);
  let active=0,peak=0,total=0;const sink={async write(b){active++;peak=Math.max(peak,active);total+=b.length;await new Promise(r=>setImmediate(r));active--},close:async()=>({size:total})};
  const large=await t.writer(sink);for(let n=0;n<32;n++)await t.encode(large,{id:'sample-'+n,pcm:new Float32Array(1024*1024)});await large.finish();assert.equal(peak,1);assert(total>128*1024*1024);assert(api.stats().maxChunk<=1024*1024);
  console.log('PASS P4 binary codec: exact bytes, File/Blob, typed view aliases, cycles, sparse arrays, Unicode, checksum corruption, 128 MiB bounded I/O and backpressure');
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
