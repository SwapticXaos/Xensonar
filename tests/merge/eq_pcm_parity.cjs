'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..');
function setup(file){let C;const b={sampleRate:48000,currentFrame:0,AudioWorkletProcessor:class{constructor(){this.port={postMessage(){}}}},registerProcessor:(n,c)=>C=c};vm.createContext(b);vm.runInContext(fs.readFileSync(file,'utf8')+'\n__xenEqLiveModule();globalThis.eq=__XenEqLive',b);const initial={...b.eq.coefficients({base:-3,filters:Array.from({length:24},(_,i)=>({gain:Math.sin(i)*4,q:2,frequency:40*Math.pow(400,i/23)}))},24,48000),revision:0};return {b,p:new C({processorOptions:{initial}})};}
const a=setup(root+'/tests/fixtures/eq_worklet_m3p2.js'),b=setup(root+'/src/quickrack/equalizer/eq-worklet.js');
const input=[[Float32Array.from({length:128},(_,i)=>Math.sin(i*.17)*.01),Float32Array.from({length:128},(_,i)=>Math.cos(i*.13)*.02)]],oa=[[new Float32Array(128),new Float32Array(128)]],ob=[[new Float32Array(128),new Float32Array(128)]];
for(let t=0;t<3000;t++){a.b.currentFrame=b.b.currentFrame=t*128;a.p.process(input,oa);b.p.process(input,ob);assert.deepEqual(oa,ob,'M3P3 stable-bank output parity block '+t)}
console.log('PASS 3000 bit-identical stereo blocks, 24 filters, original M3P2 vs integrated M3P3 kernel');
