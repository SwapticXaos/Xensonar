'use strict';
// Independent observable PCM crop contract + ownership/byte-preservation proof.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const files=['src/audio/03_rfl_transport_legacy.js','src/audio/03_flac_encoder.js','src/audio/03_recorder_helpers.js','src/audio/03_pcm_range.js','src/audio/03_recorder.js'];
const manifest=require('../source-manifest.json'),i=manifest.files.indexOf(files[0]);
assert.deepEqual(manifest.files.slice(i,i+files.length),files,'RW2 PCM owner must sit between recorder helpers and recorder');
const codec=read(files[1]),range=read(files[3]),rec=read(files[4]);
assert.match(range,/function TW\(e,t=null\)/,'TW must be in shared PCM range owner');
assert.doesNotMatch(codec,/function TW\(/);
assert.doesNotMatch(rec,/function TW\(/);
const idx=JSON.parse(read('source-index.json'));
const owner=n=>idx.declarations.find(d=>d.name===n)?.file;
assert.equal(owner('TW'),files[3], 'Static source owner should be shared range module');
assert(!idx.dependencies.some(e=>e.from===files[1]&&e.to===files[4]),'FLAC must not depend directly on recorder');
assert(!idx.dependencies.some(e=>e.from===files[4]&&e.to===files[1]&&e.symbols.includes('TW')),'Recorder should use shared owner');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const joined=Buffer.concat(files.map(f=>fs.readFileSync(path.join(root,f))));
assert.equal(joined.length,139285,'Original assembled JS bytes should stay exact');
assert.equal(sha(joined),'d26a978a785ae058e991843490e9e186f2c902fa9129f007844db0edcc989578','Original recorder bytes changed');
const ts=require('typescript');
const f=ts.createSourceFile('legacy.js',read(files[0]),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
function initializer(name){for(const stmt of f.statements)if(ts.isVariableStatement(stmt))for(const d of stmt.declarationList.declarations)if(d.name.getText(f)===name)return d.initializer.getText(f);throw Error('Missing '+name);}
const context=vm.createContext({Float32Array,Math});
vm.runInContext('const $A='+initializer('$A')+'; const ove='+initializer('ove')+';\n'+range,context);
const TW=vm.runInContext('TW',context);
function buffer(len,sr=10,ch=2){const a=Float32Array.from({length:len},(_,i)=>i),b=Float32Array.from({length:len},(_,i)=>100+i);return {length:len,sampleRate:sr,duration:len/sr,numberOfChannels:ch,getChannelData(i){return i===0?a:b;}};}
const examples=[
 {name:'full stereo',len:20,range:null,left:[0,19,20],right:[100,119,20],ms:2000},
 {name:'crop one second',len:20,range:{startMs:0,endMs:1000},left:[0,9,10],right:[100,109,10],ms:1000},
 {name:'fractional boundaries',len:20,range:{startMs:100,endMs:600},left:[1,5,5],right:[101,105,5],ms:500},
 {name:'reverse crop',len:20,range:{startMs:600,endMs:100},left:[1,5,5],right:[101,105,5],ms:500},
 {name:'negative start',len:20,range:{startMs:-250,endMs:150},left:[0,1,2],right:[100,101,2],ms:200},
 {name:'equal boundaries retain sample',len:20,range:{startMs:0,endMs:0},left:[0,0,1],right:[100,100,1],ms:100},
 {name:'bounds past end preserve old duration quirk',len:20,range:{startMs:2500,endMs:3000},left:[null,null,0],right:[null,null,0],ms:100},
 {name:'48k exact frame boundaries',len:100,sampleRate:48000,range:{startMs:0.25,endMs:1.1},left:[12,52,41],right:[112,152,41],ms:1},
 {name:'44.1k exact frame boundaries',len:100,sampleRate:44100,range:{startMs:0.25,endMs:1.1},left:[11,48,38],right:[111,148,38],ms:1},
 {name:'mono duplicates channel',len:20,ch:1,range:{startMs:100,endMs:600},left:[1,5,5],right:[1,5,5],ms:500},
];
for(const e of examples){const got=TW(buffer(e.len,e.sampleRate??10,e.ch??2),e.range);for(const [field,want] of [['left',e.left],['right',e.right]]){const data=got[field];assert.equal(data.length,want[2],e.name+' '+field+' length');if(data.length){assert.equal(data[0],want[0],e.name+' '+field+' first');assert.equal(data.at(-1),want[1],e.name+' '+field+' last');}}assert.equal(got.effectiveDurationMs,e.ms,e.name+' duration');}
assert.equal(sha(read(files[1])), '7125ee26eb5e4353c17b5589b854283498b411ed49adcdc4e7486c9e6fb1dfb4','Worker/encoder source changed unexpectedly');
console.log('PASS RW2 PCM: independent shared owner, no FLAC/recorder back-edge, 10 channel/crop fixtures, original recorder byte reconstruction');
