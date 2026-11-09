'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const core=fs.readFileSync(path.resolve(__dirname,'../../../src/quickrack/equalizer/eq-core.js'),'utf8');
let posted=0,spawned=0;
class BlobMock{constructor(parts){this.text=parts.join('')}}
class WorkerMock{constructor(){spawned++}postMessage(){posted++}terminate(){}}
const sandbox={localStorage:{getItem:()=>null,setItem(){}},window:{addEventListener(){}},requestAnimationFrame:()=>1,Worker:WorkerMock,Blob:BlobMock,URL:{createObjectURL:()=>'',revokeObjectURL(){}},console,Math,Number,Array,Object,Set,WeakMap,WeakSet,Map,Date,JSON,setTimeout,clearTimeout};
vm.runInNewContext(core+'\nglobalThis.eq=__XenEQ;',sandbox);const eq=sandbox.eq;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function param(){return {value:0,setTargetAtTime(value){this.value=value},cancelScheduledValues(){},cancelAndHoldAtTime(){}}}
const createdGains=[];
const ctx={state:'running',sampleRate:48000,currentTime:0,createGain:()=>{const n={gain:param(),connect(){},disconnect(){}};createdGains.push(n);return n},createBiquadFilter:()=>({frequency:param(),Q:param(),gain:param(),connect(){},disconnect(){}}),addEventListener(){},removeEventListener(){}};
(async()=>{
 const devices=Array.from({length:4},(_,index)=>eq.create(ctx,`material:empty-${index}`));
 // Flat nonzero curves (constant shelves) are solved exactly without sparse search.
 eq.set('material:constant',{a:Array(360).fill(.5),b:Array(360).fill(.5),mode:'adaptive'});
 const constant=eq.create(ctx,'material:constant');
 const dry=createdGains[createdGains.length-1];
 assert.ok(Math.abs(dry.gain.value-Math.pow(10,6/20))<1e-7,'constant +6 dB must be applied by dry GainNode');
 eq.livePlan(eq.get('material:constant'),48000,'material:constant');
 await wait(240);
 assert.equal(posted,0,'neutral and constant EQ profiles must not consume worker fits');
 assert.equal(spawned,0,'no Worker needs to be spawned for flat profiles');
 assert.equal(constant.filterCount,0,'constant gain should need no Biquad filters');
 assert.equal(eq.livePlan(eq.get('material:constant'),48000,'material:constant').fitError,0);
 const v=eq.get('material:constant');
 eq.set('material:constant',{morph:v.morph});
 assert.equal(eq.get('material:constant'),v,'a redundant scalar update must not replace an already-fitted config');
 eq.set('material:constant',{morph:0.3});
 assert.equal(eq.get('material:constant').a,v.a,'morph changes must reuse the unchanged canonical A curve');
 assert.equal(eq.get('material:constant').b,v.b,'morph changes must reuse the unchanged canonical B curve');
 eq.startGesture('material:constant');
 eq.set('material:constant',{morph:0.4});
 const gestureCfg=eq.get('material:constant');
 eq.endGesture('material:constant');
 assert.notEqual(eq.get('material:constant'),gestureCfg,'gesture end must finalize provisional configuration');
 devices.forEach(d=>d.dispose());constant.dispose();
 console.log('PASS p1.3 idle flat profiles, state reuse, gesture finalization');
})().catch(error=>{console.error(error);process.exitCode=1});
