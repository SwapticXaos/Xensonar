'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..');
const scope={Float32Array, Float64Array, Math, Number, WeakMap,console};vm.createContext(scope);
vm.runInContext(fs.readFileSync(path.join(root,'src/audio/09_myzel_g_dsp.js'),'utf8')+';globalThis.createG=createMyzelGDSP;',scope);
const rate=32000,frames=rate*1.2;
function render(change,seconds=1.2){let dsp=scope.createG(rate),out=new Float32Array(Math.round(seconds*rate)),right=new Float32Array(out.length);dsp.controls({active:1,root:165,frequency:220,presence:.83,motion:.6,brightness:.7,tension:.3,body:.75,level:.7,...change});for(let i=0;i<out.length;i+=128){const n=Math.min(128,out.length-i);dsp.process([],[out.subarray(i,i+n),right.subarray(i,i+n)]);}
 let energy=0,peak=0;for(let i=rate*.3;i<out.length;i++){const v=out[i];assert(Number.isFinite(v));energy+=v*v;peak=Math.max(peak,Math.abs(v));}return {pcm:out,r:right,energy:energy/(out.length-rate*.3),peak};}
const checks=[];function pass(label){checks.push(label);console.log('PASS',label)}
let base=render({});assert(base.energy>.000003);assert(base.peak<1);pass('continuous bounded stereo PCM without note events');
const organs=['resonator','formant_filter','spectral_tilt','wavefolder','sub_harmonic','shimmer_delay','comb_filter','grain_blur','drive','chorus','bitcrusher'];
for (let kind of organs){let a=render({stages:[{type:kind,strength:.95,frequency:220}]});let difference=0;for(let i=rate*.3;i<a.pcm.length;i++)difference+=Math.abs(a.pcm[i]-base.pcm[i]);assert(difference/(a.pcm.length-rate*.3)>.00007,kind+' must transform actual PCM');checks.push(kind+' audible structural PCM difference');}
pass('all eleven labelled organ kernels change sound');
let foldThenRes=render({stages:[{type:'wavefolder',strength:.9,frequency:220},{type:'resonator',strength:.9,frequency:220}]}),reverse=render({stages:[{type:'resonator',strength:.9,frequency:220},{type:'wavefolder',strength:.9,frequency:220}]});
let orderDiff=0;for(let i=rate*.3;i<foldThenRes.pcm.length;i++)orderDiff+=Math.abs(foldThenRes.pcm[i]-reverse.pcm[i]);assert(orderDiff/foldThenRes.pcm.length>.00007);pass('chronological organ ordering is noncommutative');
let noteA=render({root:165,frequency:180}),noteB=render({root:165,frequency:430}),fast=render({motion:.95}),slow=render({motion:.05});let freqDiff=0,motionDiff=0;for(let i=rate*.3;i<noteA.pcm.length;i++){freqDiff+=Math.abs(noteA.pcm[i]-noteB.pcm[i]);motionDiff+=Math.abs(fast.pcm[i]-slow.pcm[i]);}assert(freqDiff/noteA.pcm.length>.004);assert(motionDiff/noteA.pcm.length>.001);pass('resident frequency and motion change the sounding oscillator body');
let silent=render({active:0},2);assert(silent.pcm.slice(rate).every(v=>v===0));pass('inactive engine settles to silence');
let hostile=render({root:NaN,frequency:Infinity,level:Infinity,stages:[{type:'drive',strength:Infinity,frequency:-5}]});assert(hostile.pcm.every(Number.isFinite));pass('hostile controls remain finite');
let tooMany=render({stages:organs.map(type=>({type,strength:.9,frequency:200}))});assert(tooMany.peak<1);pass('max three stages and strict output headroom');
let more=render({stages:[{type:'chorus',strength:.8,frequency:220}]});let moreAgain=render({stages:[{type:'chorus',strength:.8,frequency:220}]});assert.equal(crypto.createHash('sha256').update(more.pcm).digest('hex'),crypto.createHash('sha256').update(moreAgain.pcm).digest('hex'));pass('deterministic synth/organ output');
fs.writeFileSync(path.join(root,'results/myzel_g_dsp.json'),JSON.stringify({checks,baseEnergy:base.energy,basePeak:base.peak,orderedDifference:orderDiff/foldThenRes.pcm.length},null,2)+'\n');
