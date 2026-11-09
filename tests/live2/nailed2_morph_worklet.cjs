'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../../src/quickrack/equalizer/eq-worklet.js'),'utf8');
let now=0,next=0,cb=new Map();const sent=[];
class FakeNode{constructor(){this.port={postMessage:m=>sent.push({time:now,m}),close(){}}}disconnect(){}}
const scope={console,Math,Float64Array,AudioWorkletNode:FakeNode,Date:{now:()=>now},
 setTimeout:(fn,delay)=>{const id=++next;cb.set(id,{due:now+delay,fn});return id},clearTimeout:id=>cb.delete(id)};
vm.createContext(scope);vm.runInContext(src,scope);const eq=vm.runInContext('__XenEqLive',scope);
function moveTo(t){let safe=0;while(true){const hit=[...cb].filter(([,x])=>x.due<=t).sort((a,b)=>a[1].due-b[1].due)[0];if(!hit)break;assert(++safe<1000);cb.delete(hit[0]);now=hit[1].due;hit[1].fn()}now=t}
const p=n=>({base:0,filters:[{gain:4,frequency:100+n,q:2}]});
const e=eq.create({sampleRate:48000},p(0),12);
for(let i=0;i<40;i++){moveTo(i*5);e.apply(p(i),12,'morph')}
moveTo(220);
assert(sent.length>=6,'Continuous morph must send regularly instead of starving on timer resets');
assert(sent.length<=16,'Morph gesture must not flood the processor with messages');
assert.equal(sent.at(-1).m.revision,40,'Latest slider position must win');
assert(sent.every(x=>x.m.intent==='morph'));
assert(sent.every((x,i)=>i===0||x.time>=sent[i-1].time),'Delivery order is monotonic');
e.dispose();
// The processor uses a shorter whole-bank transition for morph, while paint
// keeps full conservative warming; both retain finite audio and newest-only.
let Processor;
scope.sampleRate=48000;scope.currentFrame=0;
scope.AudioWorkletProcessor=class {constructor(){this.port={postMessage(){},onmessage:null}}};
scope.registerProcessor=(name,constructor)=>{Processor=constructor};
vm.runInContext('__xenEqLiveModule()',scope);
const initial={...eq.coefficients(p(0),12,48000),revision:0};
function transition(intent){
 const machine=new Processor({processorOptions:{initial}});
 machine.port.onmessage({data:{...eq.coefficients(p(90),12,48000),revision:1,intent}});
 const i=[new Float32Array(128).fill(.1),new Float32Array(128).fill(-.03)];
 const o=[new Float32Array(128),new Float32Array(128)];
 machine.process([i],[o]);assert(o.every(ch=>ch.every(Number.isFinite)));
 return [machine.transitionWarm,machine.transitionFade];
}
const fast=transition('morph'),slow=transition('paint');
assert(fast[0]<slow[0]&&fast[1]<slow[1], 'Morph transitions should be faster, paint should retain conservative warm/fade');
console.log('PASS rapid rhythmic morph has bounded nonstarving control cadence with latest revision');
