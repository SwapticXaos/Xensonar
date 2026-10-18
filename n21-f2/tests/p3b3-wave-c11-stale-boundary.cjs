'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const app=read('src/01_app_runtime.js'),wave=read('src/audio/05_live_voice_runtime.js');
const fragment=(s,start,end)=>{const i=s.indexOf('function '+start+'(');const j=s.indexOf(end,i+10);assert(i>=0&&j>i);return s.slice(i,j);};
// Real production VW (first 20ms deadline) + __wave39PlayTone (second deadline).
// The simulated host refuses reservation immediately after recording the attempt;
// no DSP or audio output is claimed.
let calls=[];
const ctx={currentTime:1,sampleRate:48000,state:'running'};
const env={HW:()=>({gradientDuration:.25,shapedVolume:.3,shapedResonance:1.2,shapedCutoff:800,useScheduledTonePath:false}),
  cAe:()=>1000, Hd:()=>false,rg:{get:()=>null},
  Jp:(context,start,slack)=>context.currentTime<=start+slack,
  __wave39Owned:()=>true,__entTargetIsCurrent:(context,start)=>Math.round(start*context.sampleRate)>=Math.round(context.currentTime*context.sampleRate),
  __wave39Reserve:(context,start,units)=>{calls.push({start,units});return null;},K3:.005};
const funcs=new Function(...Object.keys(env),
  fragment(wave,'uAe','function VW')+
  fragment(app,'__wave39PlayTone','function __wave39Scheduled')+
  fragment(wave,'VW','function ')+
  ';return {VW,__wave39PlayTone};')(...Object.values(env));
function note(ageMs){calls=[];const output=funcs.VW({ctx,toneFreq:220,delay:0,duration:.25,waveform:'sawtooth',gain:.3,resonance:1.2,cutoffHz:800,requestedAtMs:1000-ageMs,entrophonWaveActive:false,silentHotPath:true,waveTargets:[],waveGradient:{},wavePlan:null,mainOutput:{}});return {output,attempts:calls};}
const timely=note(5);
assert.equal(timely.attempts.length,1,'5ms-old playable Clean Pluck must reach Worklet reservation');
assert(timely.attempts[0].start>=ctx.currentTime+.005-1e-12,'missed original timestamp starts after the current quantum, never catches up in the past');
assert.equal(note(21).attempts.length,0,'truly late inputs still drop: the 20ms fail-fast window remains');
assert.equal(note(0).attempts.length,1,'fresh inputs still reach the Worklet');
console.log('PASS P3B3 shared Wave C11 deadline: input accepted once, bounded catch-up, old events dropped');
