import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createClock,load} from './c11-test-harness.mjs';
const {EntrophonPlanRecordEncoder}=await load('src/features/xensonar/browserImplant/protocol/entrophonVoiceRecord.ts');
const plan={baseFreqs:[220,220.7,219.4,221,219,220.3],colorFreqs:[330,440,550],colorGains:[.02,.02,.02],
 waveform:2,filterType:0,peakGain:.04,sustainGain:.018,attackFrames:96,decayFrames:480,
 releaseStartFrames:36000,releaseFrames:10000,stopAfterFrames:48000,pitchBendMul:1.025,pitchBendFrames:4320,
 filterStartHz:2600,filterPeakHz:4930,filterEndHz:1612,filterAttackFrames:144,filterDecayFrames:3840,
 filterQ:1.2,preDriveGain:.7,driveAmount:1.5,bodyFreqHz:330,bodyQ:3.2,bodyGain:.13,
 delayFrames:6000,delayWetGain:.03,delayFeedback:.08,normalizationGain:1/6};
async function run(sab,storm){
 const c=await createClock({sab,profile:1}),e=new EntrophonPlanRecordEncoder();
 await c.message({type:'SET_MUTED',muted:false});
 c.send(e.encode({...plan,token:1,epoch:c.epoch,frame:c.frame+256,auxRouteMask:1}));
 const protectedPcm=[],timings=[];let maxReserved=0,token=2;
 for(let q=0;q<450;q++){
  if(storm&&q>3&&q<250)for(let i=0;i<16;i++)c.send(e.encode({...plan,token:token++,epoch:c.epoch,frame:c.frame+256,auxRouteMask:2}));
  const started=performance.now();c.render();timings.push((performance.now()-started)*1000);
  protectedPcm.push(...c.outputs[1][0]);maxReserved=Math.max(maxReserved,c.processor.reservations.usedUnits);
 }
 const bytes=Buffer.from(new Float32Array(protectedPcm).buffer),hash=crypto.createHash('sha256').update(bytes).digest('hex');
 const rejects=c.messages.filter(m=>m.type==='RECORD_RESULT'&&m.result!==0).length;
 const accepted=c.messages.filter(m=>m.type==='RECORD_RESULT'&&m.result===0).length;
 timings.sort((a,b)=>a-b);await c.stop();
 return {hash,nonzeroSamples:protectedPcm.filter(x=>Math.abs(x)>1e-9).length,accepted,rejects,maxReserved,
  callbackMedianUs:timings[Math.floor(timings.length*.5)],callbackP99Us:timings[Math.floor(timings.length*.99)],nominalQuantumUs:128/48000*1e6};
}
const results=[];
for(const sab of [false,true]){
 const clean=await run(sab,false),overload=await run(sab,true);
 assert.equal(clean.hash,overload.hash,'protected live tail changed under rejected-attack storm');
 assert(overload.nonzeroSamples>0);assert(overload.rejects>3800);assert(overload.maxReserved<=256);
 results.push({transport:sab?'SAB':'MessagePort',protectedTailBitIdentical:true,clean,overload});
}
console.log(JSON.stringify({pass:true,proof:'actual C11 Entrophon PCM in independent aux route; overload at real processor boundary',physicalAudio:false,
 timingScope:'container computation only; excludes browser scheduler, full graph and audio device',results},null,2));
