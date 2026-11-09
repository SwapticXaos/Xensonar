import assert from 'node:assert/strict';
import {createClock,toneRecord,load} from './c11-test-harness.mjs';
const cases=[];
for(const sab of [false,true]) for(const initialFrame of [0,193280]) for(const mutedQuanta of [0,20,200]) {
 const c=await createClock({sab,initialFrame});
 for(let i=0;i<mutedQuanta;i++)c.render();
 await c.message({type:'SET_MUTED',muted:false});
 assert(c.send(toneRecord(c,1,c.frame+256)));
 let onset=null;
 for(let q=0;q<45;q++){
  const out=c.render(), offset=out.findIndex(v=>Math.abs(v)>1e-9);
  if(onset===null&&offset>=0)onset=q*128+offset;
 }
 assert.equal(onset,257,`unchanged onset: SAB=${sab}, mute=${mutedQuanta}, initial=${initialFrame}`);
 assert.equal(c.result(1).result,0);
 assert(c.send(toneRecord(c,2,c.frame-1)));
 c.render();
 assert.equal(c.result(2).result,-3,'late record rejected explicitly');
 cases.push({transport:sab?'SAB':'MessagePort',initialFrame,mutedQuanta,onsetFrames:onset});
 await c.stop();
}
for(const sab of [false,true]) {
 const c=await createClock({sab});
 await c.message({type:'SET_MUTED',muted:false});
 const originalEpoch=c.epoch;
 c.send(toneRecord(c,10,c.frame+512));c.render();
 await c.message({type:'PANIC'});
 assert.notEqual(c.epoch,originalEpoch);
 c.send(toneRecord(c,11,c.frame+256,originalEpoch));
 c.send(toneRecord(c,12,c.frame+256));
 c.render();
 assert.notEqual(c.result(11).result,0);assert.equal(c.result(12).result,0);
 await c.message({type:'SET_MUTED',muted:true});
 for(let i=0;i<20;i++)assert(c.render().every(x=>x===0));
 await c.message({type:'SET_MUTED',muted:false});
 for(let i=0;i<45;i++)assert(c.render().every(x=>x===0),'no old tail/attack after explicit mute');
 // Suspend with a frozen AudioContext clock preserves the existing session.
 const beforeSuspend=c.epoch, frozen=c.frame;
 await Promise.resolve();
 assert.equal(c.frame,frozen);
 c.send(toneRecord(c,13,c.frame+256));c.render();
 assert.equal(c.epoch,beforeSuspend);assert.equal(c.result(13).result,0);
 // A real clock gap is a discontinuity, not permission to catch up.
 c.send(toneRecord(c,14,c.frame+256));c.context.currentFrame+=48000;c.render();
 assert.notEqual(c.epoch,beforeSuspend);assert.notEqual(c.result(14).result,0);
 c.send(toneRecord(c,15,c.frame+256));c.render();assert.equal(c.result(15).result,0);
 await c.stop();
}
// Also exercise the dedicated Entrophon bridge on a nonzero Context clock.
const {EntrophonPlanRecordEncoder}=await load('src/features/xensonar/browserImplant/protocol/entrophonVoiceRecord.ts');
for(const sab of [false,true]) {
 const c=await createClock({sab,profile:1,initialFrame:48000});
 for(let i=0;i<20;i++)c.render();
 await c.message({type:'SET_MUTED',muted:false});
 const rec=new EntrophonPlanRecordEncoder().encode({token:21,epoch:c.epoch,frame:c.frame+256,
  baseFreqs:[220],colorFreqs:[],colorGains:[],waveform:0,filterType:0,peakGain:0.1,sustainGain:0.04,
  attackFrames:96,decayFrames:480,releaseStartFrames:2200,releaseFrames:1200,stopAfterFrames:3800,
  pitchBendMul:1,pitchBendFrames:0,filterStartHz:2600,filterPeakHz:4930,filterEndHz:1612,
  filterAttackFrames:144,filterDecayFrames:3840,filterQ:0.7,preDriveGain:0.7,driveAmount:0,
  bodyFreqHz:330,bodyQ:3.2,bodyGain:0,delayFrames:0,delayWetGain:0,delayFeedback:0,
  normalizationGain:1,auxRouteMask:1});
 c.send(rec);let onset=null;
 for(let q=0;q<45;q++){const off=c.render().findIndex(v=>Math.abs(v)>1e-9);if(onset===null&&off>=0)onset=q*128+off;}
 assert.equal(c.result(21).result,0);assert.equal(onset,257);
 await c.stop();
}
console.log(JSON.stringify({pass:true,proof:'actual processor + shipped WASM; model AudioContext clock',physicalAudio:false,
 cases,extraStartDelayFrames:0,sessionCases:['panic','old epoch','mute fence','frozen suspend/resume','clock discontinuity'],entrophonOnsetFrames:257},null,2));
