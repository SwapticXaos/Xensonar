#!/usr/bin/env node
// TEST ONLY. Offline re-render of the RFL resident grain processor (xensonar-raw-resident-v1) without a browser.
// Input: a capture written by the rflTap scenario (RFL_CAPTURE=file.json, see rfl_click_scenarios.js): the exact load/arm/state
// messages the app sent to the worklet, with the audio frame at which each was posted. The worklet source is taken from
// src/audio/rfl/01_resident_worklet.js (the String.raw module `fne`), so a fix there is measured by re-running this script.
// Output: click list of the offline render (same detector as the probe), compared with the clicks the browser tap saw,
// and for each offline click the grains that were sounding at that frame (envelope at the click, how the grain ended).
//   node tools/probes/rfl_resident_offline.cjs capture.json [--sec 40] [--json out.json] [--src path/to/01_resident_worklet.js]
'use strict';
const fs=require('fs'),path=require('path');
const arg=(k,d)=>{const i=process.argv.indexOf(k);return i<0?d:process.argv[i+1]};
const CAP=process.argv[2];if(!CAP){console.error('usage: rfl_resident_offline.cjs capture.json');process.exit(2)}
const SRC=arg('--src',path.join(__dirname,'..','..','src','audio','rfl','01_resident_worklet.js'));
const cap=JSON.parse(fs.readFileSync(CAP,'utf8'));
const rec=cap.capture[cap.capture.length-1];const sr=rec.sr;

function loadCore(file){
  const s=fs.readFileSync(file,'utf8');const a=s.indexOf('String.raw`')+11,b=s.indexOf('`;',a);
  let mod=s.slice(a,b).replace(/export\s*\{[^}]*\};?\s*$/,'');
  let registered=null;
  const factory=new Function('AudioWorkletProcessor','registerProcessor','sampleRate','currentFrame',mod+'\n;return {RawResidentCore,RawGrainPool,HANN_WINDOW};');
  class AWP{constructor(){this.port={postMessage(){},onmessage:null}}}
  return factory(AWP,(n,c)=>{registered=c},sr,0);
}
const {RawResidentCore,HANN_WINDOW}=loadCore(SRC);

const detect=(f32,rate)=>{const n=f32.length,out=[];const d=new Float32Array(n);for(let i=2;i<n;i++)d[i]=Math.abs(f32[i]-2*f32[i-1]+f32[i-2]);const W=384,G=6;let i=W+2;
  while(i<n-W){if(d[i]>0.012){let mx=0,sb=0,cb=0;for(let k=i-W;k<i-G;k++){sb+=d[k];cb++;if(d[k]>mx)mx=d[k]}let s2=sb,c2=cb;for(let k=i+G+1;k<=i+W;k++){s2+=d[k];c2++}const ratio=d[i]/(s2/c2+1e-7);if(ratio>25&&d[i]>8*mx){out.push({i,step:Math.abs(f32[i]-f32[i-1])});i+=W;continue}}i++}return out};

const msgs=rec.msgs.slice().sort((x,y)=>x.f-y.f);
const load=msgs.find(m=>m.type==='load'),arm=msgs.find(m=>m.type==='arm');
if(!load||!arm){console.error('capture has no load/arm');process.exit(2)}
const core=new RawResidentCore(sr);
const ch=load.channels.map(a=>Float32Array.from(a));
let map=null;if(load.map){map={};for(const [k,v] of Object.entries(load.map))map[k]=v&&v.f32?Float32Array.from(v.f32):v}
core.load(ch,load.sampleRate,map);
core.arm(arm.program,arm.firstWindowSec);
const pending=msgs.filter(m=>m.type==='state'&&m.f>=arm.f);
const SEC=+arg('--sec',40),Q=128;
const f0=Math.floor(arm.f/Q)*Q,total=Math.ceil(SEC*sr/Q)*Q;
const L=new Float32Array(total),R=new Float32Array(total),l=new Float32Array(Q),r=new Float32Array(Q);
// per-frame trace of grain events for attribution: record each grain's [startFrame, stopFrame, durationFrames, sourceFrame, limit, sourceStep]
const grains=[];const seen=new Set();
for(let q=0;q<total;q+=Q){
  const frame=f0+q;
  while(pending.length&&pending[0].f<=frame){const m=pending.shift();core.update(m.program)}
  core.render(frame,[l,r]);L.set(l,q);R.set(r,q);
  const p=core.pool;for(let s=0;s<p.count;s++){const key=p.startFrame[s]+':'+p.sourceFrame[s];if(!seen.has(key)){seen.add(key);grains.push({start:p.startFrame[s],stop:p.stopFrame[s],dur:p.duration[s]*sr,src:p.sourceFrame[s],limit:p.sourceLimit[s],step:p.sourceStep[s],winStep:p.windowStep[s]})}}
}
const env=(g,fr)=>{const ph=(fr-g.start)*g.winStep,wi=ph|0;return wi<0||wi>=159?0:HANN_WINDOW[wi]+(HANN_WINDOW[wi+1]-HANN_WINDOW[wi])*(ph-wi)};
const clicks=detect(L,sr).map(c=>{const fr=f0+c.i;
  const near=grains.filter(g=>Math.abs(fr-g.start)<3||Math.abs(fr-g.stop)<3||(fr>=g.start&&fr<g.stop&&(g.src+(fr-g.start)*g.step)>g.limit-2)).map(g=>({at:Math.abs(fr-g.start)<3?'start':Math.abs(fr-g.stop)<3?'stop':'source-limit',envAtStop:+env(g,g.stop-1).toFixed(3),envAtClick:+env(g,fr).toFixed(3),durFrames:Math.round(g.dur),playedFrames:Math.round(g.stop-g.start),cutByStop:Math.round(g.stop-g.start)<Math.round(g.dur)-1,srcEndSec:+((g.src+(g.stop-g.start)*g.step)/load.sampleRate).toFixed(4),limitSec:+(g.limit/load.sampleRate).toFixed(4)}));
  return{t:+(fr/sr).toFixed(4),step:+c.step.toFixed(3),loopPhase:+(((fr/sr-arm.program.transportAnchorSec)%arm.program.desiredLoopDurationSec+arm.program.desiredLoopDurationSec)%arm.program.desiredLoopDurationSec).toFixed(4),grains:near}});
const browser=(cap.clicksResident||[]).map(c=>c.t);
const match=clicks.filter(c=>browser.some(t=>Math.abs(t-c.t)<0.002)).length;
const out={sr,seconds:+(total/sr).toFixed(1),grains:grains.length,offlineClicks:clicks.length,browserClicks:browser.length,matchedWithin2ms:match,clicks,browser};
console.log(JSON.stringify({sr,seconds:out.seconds,grains:out.grains,offlineClicks:out.offlineClicks,browserClicks:out.browserClicks,matchedWithin2ms:match}));
for(const c of clicks)console.log(JSON.stringify(c));
const J=arg('--json',null);if(J)fs.writeFileSync(J,JSON.stringify(out,null,1));
