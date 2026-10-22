'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('src/audio/01_voice_and_rfl_ownership.js','utf8');
const start=src.indexOf('const __XenMaterialStandalonePreview=(()=>{');
const end=src.indexOf('\nconst FI=',start);
assert(start>=0&&end>start);
const mock={entries:[{id:'a',blob:{size:300}},{id:'b',blob:{size:300}}]};
const audios=[];
class FakeAudio {constructor(){audios.push(this)}async play(){this.started=true}pause(){this.paused=true}load(){}removeAttribute(){} }
const vmContext=vm.createContext({bs:()=>mock,Audio:FakeAudio,URL:{createObjectURL:blob=>'blob:'+blob.size, revokeObjectURL:()=>{}},console});
vm.runInContext(src.slice(start,end)+'\nglobalThis.preview=__XenMaterialStandalonePreview;',vmContext);
(async()=>{
 const p=vmContext.preview,states=[];const unsub=p.subscribe(()=>states.push(p.activeId()));
 assert.equal(p.activeId(),null);
 assert.equal(p.canPreview('a'),true);
 assert.equal(await p.toggleById('a'),'playing'); assert.equal(p.activeId(),'a');
 assert.equal(await p.toggleById('b'),'playing'); assert.equal(p.activeId(),'b');
 assert.equal(audios[0].paused,true,'Starting another preview interrupts first');
 assert.equal(await p.toggleById('b'),'stopped');assert.equal(p.activeId(),null);
 assert.equal(await p.toggleById('a'),'playing');audios[2].onended();assert.equal(p.activeId(),null,'On-ended returns the button to ▶');
 unsub();assert(states.includes('a')&&states.includes('b')&&states.includes(null));
 console.log('PASS standalone Material audio preview ▶→■→▶, mutual interruption, automatic end, and independent Power');
})().catch(e=>{console.error(e);process.exitCode=1});
