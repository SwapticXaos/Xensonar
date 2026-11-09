'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
let Processor;
class Base{constructor(){this.messages=[];this.port={postMessage:m=>this.messages.push(structuredClone(m))}}}
const box={AudioWorkletProcessor:Base,sampleRate:48000,currentFrame:0,registerProcessor:(name,C)=>{Processor=C},console,setTimeout,clearTimeout,Float32Array,Float64Array,Int16Array,ArrayBuffer,DataView,Blob,URL,WeakMap};
vm.createContext(box);vm.runInContext(fs.readFileSync(path.join(root,'src/quickrack/equalizer/eq-worklet.js'),'utf8')+'\n__xenEqLiveModule();globalThis.live=__XenEqLive;',box);
const initial=box.live.coefficients({base:-3,filters:Array.from({length:24},(_,i)=>({frequency:25*Math.pow(700,i/23),q:1+i*.3,gain:Math.sin(i)*8}))},24,48000);initial.revision=0;
const p=new Processor({processorOptions:{initial}}),input=[new Float32Array(128),new Float32Array(128)],output=[new Float32Array(128),new Float32Array(128)];
for(let tick=0;tick<700;tick++){
 for(let i=0;i<128;i++){input[0][i]=tick<150?Math.sin((tick*128+i)*.17)*.01:0;input[1][i]=-input[0][i]*.7}
 if(tick<100)for(let j=0;j<10;j++)p.port.onmessage({data:{...initial,revision:tick*10+j+1}});
 box.currentFrame=tick*128;assert.equal(p.process([input],[output]),true);
 for(const ch of output)for(const x of ch)assert(Number.isFinite(x));
}
assert.equal(p.revision,1000);assert.equal(p.pending,null);assert(p.sleeping,'silent filter bank must sleep after its real tail');
assert(p.stats.applied<101,'rapid redraws cannot create a render backlog');assert.equal(p.stats.nonfinite,0);
p.port.onmessage({data:{...initial,revision:12}});assert.equal(p.pending,null,'stale plan ignored');
// Invalid unstable coefficients must not become the active or queued bank.
const unstable=new Float64Array(initial.coefficients);unstable[4]=2;
p.port.onmessage({data:{...initial,coefficients:unstable,revision:1001}});assert.equal(p.revision,1000);
input[0].fill(.01);box.currentFrame=700*128;p.process([input],[output]);assert(!p.sleeping,'new attack wakes without graph setup');
p.port.onmessage({data:{kind:'dispose'}});assert.equal(p.process([input],[output]),false);
// Capture processor preserves all finite Float32 values, including > fullscale,
// stereo polarity and the final partially filled block.
vm.runInContext(fs.readFileSync(path.join(root,'src/audio/03_pcm_master_recorder.js'),'utf8')+'\n__xenMasterPcmWorkletModule();',box);
const r=new Processor(),frames=16896,expected=[];
for(let at=0;at<frames;at+=128){
 for(let i=0;i<128;i++){input[0][i]=(at+i)%9===0?1.25:Math.sin((at+i)*.33);input[1][i]=-.37*input[0][i];expected.push(input[0][i],input[1][i])}
 box.currentFrame=at;r.process([input]);
}
r.port.onmessage({data:{kind:'stop'}});
const samples=r.messages.filter(x=>x.kind==='chunk').flatMap(x=>Array.from(new Float32Array(x.data,0,x.frames*2)));
assert.deepEqual(samples,expected);assert.equal(r.messages.at(-1).kind,'done');assert.equal(r.messages.at(-1).frameGaps,0);
assert.equal(r.messages.filter(x=>x.kind==='chunk').length,3);
console.log('PASS EQ coalescing, epoch/stability gates, silence/same-attack wake/dispose; Float32 capture block boundaries and fullscale preservation.',{applied:p.stats.applied,replaced:p.stats.coalesced,frames});
