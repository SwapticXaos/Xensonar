'use strict';
// Real DSP: simultaneous Hold buses must not all double their filter banks.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
let Processor;
const b={console,Math,Float32Array,Float64Array,WeakMap,sampleRate:48000,currentFrame:0,
 AudioWorkletProcessor:class{constructor(){this.port={postMessage(){}}}},registerProcessor:(n,C)=>{Processor=C}};
vm.createContext(b);vm.runInContext(fs.readFileSync(path.join(__dirname,'../../src/quickrack/equalizer/eq-worklet.js'),'utf8')+'\n__xenEqLiveModule();globalThis.eq=__XenEqLive;',b);
const plan=n=>({base:0,filters:Array.from({length:24},(_,i)=>({frequency:40*Math.pow(400,i/23),q:1,gain:Math.sin(i+n)*2}))});
const message=(n,revision)=>({...b.eq.coefficients(plan(n),24,48000),revision,intent:'morph'});
const nodes=Array.from({length:6},()=>new Processor({processorOptions:{initial:message(0,0),deferTransitions:true}}));
const input=[[new Float32Array(128).fill(.01),new Float32Array(128).fill(-.01)]],out=[[new Float32Array(128),new Float32Array(128)]];
let maxDual=0,peak=0;
for(let tick=0;tick<400;tick++){
 b.currentFrame=tick*128;
 if(tick<30)nodes.forEach((p,i)=>p.port.onmessage({data:message(1+i+tick/30,tick+1)}));
 let dual=0;
 for(const p of nodes){const before=p.stats.dualFrames;p.process(input,out);if(p.stats.dualFrames>before)dual++;
  for(const ch of out[0])for(const x of ch){assert(Number.isFinite(x));peak=Math.max(peak,Math.abs(x));}}
 maxDual=Math.max(maxDual,dual);assert(dual<=1,'only one Hold EQ may warm/crossfade in a quantum');
}
assert(nodes.every(p=>!p.pending&&!p.phase),'all latest positions eventually settle without starvation');
assert(peak<.1,'small input has no transition energy burst');
// Disposing the current owner must let the next bus continue.
nodes[0].port.onmessage({data:message(9,31)});nodes[1].port.onmessage({data:message(10,31)});
for(let tick=400;tick<600;tick++){b.currentFrame=tick*128;nodes[0].process(input,out);if(nodes[0].phase)break;}
nodes[0].port.onmessage({data:{kind:'dispose'}});
for(let tick=600;tick<800;tick++){b.currentFrame=tick*128;nodes[1].process(input,out);}
assert(!nodes[1].pending&&!nodes[1].phase,'disposed owner cannot block another bus');
// A positive audio-clock gap delays optional recoloring; old audio stays live.
const pressure=new Processor({processorOptions:{initial:message(0,0),deferTransitions:true}});
b.currentFrame=800*128;pressure.process(input,out);pressure.port.onmessage({data:message(4,1)});
b.currentFrame+=512;const gapAt=b.currentFrame;pressure.process(input,out);assert.equal(pressure.phase,0);assert(pressure.pending,'pressure holds newest plan without starting another bank');
for(let at=gapAt+128;at<gapAt+4800;at+=128){b.currentFrame=at;pressure.process(input,out);assert.equal(pressure.phase,0,'no warm-up during conservative recovery window');}
for(let at=gapAt+4864;at<gapAt+10000;at+=128){b.currentFrame=at;pressure.process(input,out);}
assert(!pressure.pending&&!pressure.phase,'newest EQ eventually catches up after pressure');
console.log(JSON.stringify({pressureDeferral:true,status:'PASS',holdBuses:6,maxConcurrentDualBanks:maxDual,peak,latestSettled:true,disposedOwnerReleased:true}));
