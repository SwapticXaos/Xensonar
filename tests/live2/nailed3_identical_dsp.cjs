'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../../src/quickrack/equalizer/eq-worklet.js'),'utf8');
let currentFrame=0,Processor;
const scope={console,Math,Float64Array,Float32Array,sampleRate:48000,currentFrame,
 AudioWorkletProcessor:class{constructor(){this.port={postMessage(){},onmessage:null}}},registerProcessor:(name,p)=>{Processor=p}};
vm.createContext(scope);vm.runInContext(source,scope);
const eq=vm.runInContext('__XenEqLive',scope);vm.runInContext('__xenEqLiveModule()',scope);
const plan=hz=>({base:0,filters:[{gain:6,frequency:hz,q:1.5}]});
const initial={...eq.coefficients(plan(700),24,48000),revision:0};
const machine=new Processor({processorOptions:{initial}});
const input=[new Float32Array(128).fill(.14),new Float32Array(128).fill(-.07)];
const output=[new Float32Array(128),new Float32Array(128)];
function tick(){scope.currentFrame=currentFrame;machine.process([input],[output]);currentFrame+=128;assert(output.every(a=>a.every(Number.isFinite)),'output must remain finite')}
function push(p,revision){machine.port.onmessage({data:{...eq.coefficients(p,24,48000),revision,intent:'morph'}})}
for(let i=1;i<=30;i++){push(plan(700),i);for(let j=0;j<8;j++)tick()}
assert.equal(machine.stats.dualFrames,0,'identical DSP must never start dual-bank crossfade');
assert.equal(machine.stats.applied,1,'initial plan is already applied');
// Real difference must still crossfade and reach steady state.
push(plan(1300),31);for(let i=0;i<20;i++)tick();
assert(machine.stats.dualFrames>0,'a real filter change must transition');
assert.equal(machine.stats.applied,2,'one changed plan applied');
const before=machine.stats.dualFrames;
for(let i=32;i<=40;i++){push(plan(1300),i);tick()}
assert.equal(machine.stats.dualFrames,before,'identical follow-up updates must not restart DSP transition');
// A repeated *new* target may arrive while its first crossfade is underway.
// Once that transition finishes the duplicate must not schedule another.
const beforeSecond=machine.stats.dualFrames;
push(plan(2100),41);tick(); // begins a real transition
for(let rev=42;rev<=53;rev++){push(plan(2100),rev);tick()} // same target queued during phase
for(let i=0;i<80;i++)tick();
const finalDual=machine.stats.dualFrames;
assert(finalDual-beforeSecond < 1800, 'repeated in-flight identical target must cause just one warm+fade transition');
assert.equal(machine.stats.applied,3,'new target applied exactly once despite duplicate queue');
console.log('PASS identical coefficient revisions skip double bank, real changes crossfade');
