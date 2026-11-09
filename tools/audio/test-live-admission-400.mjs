import assert from 'node:assert/strict';
import {load,TonePlanRecordEncoder,createClock,toneRecord} from './c11-test-harness.mjs';
import {createHostedClock} from './c11-host-test-harness.mjs';
const {createWaveStarterDirectSafeLane}=await load('src/features/xensonar/audio/waveStarterDirectSafeLane.ts');
let now=100,frame=4800,timers=0,emitted=[];
const lane=createWaveStarterDirectSafeLane({nowMs:()=>now,getAudioFrame:()=>frame,getPressureBias:()=>0,
 getActiveScheduledToneCount:()=>0,setTimeoutFn:()=>{timers++;return 1;},clearTimeoutFn(){},
 emitDirectAttack:(hz,_sector,opts)=>emitted.push({hz,at:now,requested:opts.requestedAtMs})});
for(const hz of [220,277.1826,329.6276])lane.request(hz,false,{requestedAtMs:now});
assert.deepEqual(emitted.map(v=>v.hz),[220,277.1826,329.6276]);assert(emitted.every(v=>v.at===v.requested));
for(let i=0;i<10000;i++)lane.request(440,false,{requestedAtMs:now});
assert.equal(emitted.length,8);assert.equal(timers,0);lane.flush();assert.equal(emitted.length,8);
now+=500;frame+=24000;lane.request(440,false,{requestedAtMs:100});assert.equal(emitted.length,8);
lane.request(550,false,{requestedAtMs:now});assert.equal(emitted.length,9);lane.dispose();
// Explicit Hold/Worklet routes also refuse to retain or replay attacks.
const {createWaveStarterLaneRuntime}=await load('src/features/xensonar/audio/waveStarterLaneRuntime.ts');
const specialEmits=[],reportTimers=new Map();let timerId=0;
const special=createWaveStarterLaneRuntime({nowMs:()=>now,getAudioContext:()=>({state:'running',sampleRate:48000,currentTime:frame/48000}),
 getPressureBias:()=>0,getActiveScheduledToneCount:()=>0,recordAdaptiveAction(){},
 getPolicy:()=>({specialPathIsolation:{holdGestureLoopWorkletBridge:true,holdGestureLegacyFallback:false,staleFailoverCandidates:true,workletShadowMirroring:false,liveReports:true}}),
 setTimeoutFn:(f,ms)=>{assert.equal(ms,900,'only cold report timers are allowed');reportTimers.set(++timerId,f);return timerId;},
 clearTimeoutFn:id=>reportTimers.delete(id),emitAttack:(hz,_sector,options)=>specialEmits.push({hz,options})});
for(const hz of [220,277,330])special.request(hz,false,{requestedAtMs:now,waveStarterGestureLoopWorkletBridge:true});
assert.equal(specialEmits.length,3);assert(specialEmits.every(x=>x.options.waveStarterGestureLoopWorkletOnly===true));
for(let i=0;i<10000;i++)special.request(440,false,{requestedAtMs:now,waveStarterGestureLoopWorkletBridge:true});
assert.equal(specialEmits.length,8);assert.equal(reportTimers.size,1);
now+=500;frame+=24000;special.flushDeferred();special.request(880,false,{requestedAtMs:100,synthWorkletFailoverCandidate:true});
assert.equal(specialEmits.length,8);special.dispose();assert.equal(reportTimers.size,0);
const cases=[];
for(const sab of [false,true]) {
 const c=await createHostedClock({sab});
 const encoder=new TonePlanRecordEncoder();let token=0,builds=0;
 function request(voices=8,duration=48000,target=c.host.currentContextFrame()+256){
  const id=++token;
  if(!c.host.tryReserveAttack(id,target,voices*2,voices))return false;
  builds++;
  return c.host.trySubmitTonePlan(encoder.encode({token:id,epoch:c.host.epoch,frame:target,
   tones:Array.from({length:voices},(_,i)=>({frequencyHz:220+i*27,gain:0.03,cutoffHz:5000,resonance:0.7,delayFrames:0,durationFrames:duration,waveform:0}))}));
 }
 for(let i=0;i<3;i++)assert(request()); // calm three-note case remains immediate
 for(let i=0;i<10000;i++)request();
 assert.equal(builds,8,'no expensive plans beyond the reserved render budget');
 assert.equal(c.host.diagnosticSnapshot().reservedRenderUnits,128);
 await c.pump();
 assert.equal(c.host.diagnosticSnapshot().kernelAccepted,0,'transport is not kernel admission');
 await c.render();
 assert.equal(c.host.diagnosticSnapshot().kernelAccepted,8);
 assert.equal(c.host.diagnosticSnapshot().renderWindowsStarted,0,'admission is not execution');
 await c.render();await c.render();
 assert.equal(c.host.diagnosticSnapshot().renderWindowsStarted,8);
 const live=c.host.diagnosticSnapshot().reservedRenderUnits;
 c.ctx.state='suspended';await c.pump();assert.equal(request(),false);
 assert.equal(c.host.diagnosticSnapshot().reservedRenderUnits,live,'suspend never refunds active voices');
 c.ctx.state='running';
 let nonzero=0;
 for(let i=0;i<385;i++){const out=await c.render();nonzero+=out[0][0].filter(x=>Math.abs(x)>1e-9).length;}
 assert(nonzero>0);assert.equal(c.host.diagnosticSnapshot().reservedRenderUnits,0);assert.equal(c.host.diagnosticSnapshot().ended,8);
 assert(request(1,1000));await c.pump();
 // Delayed transport is stale, not a new attack at resume time.
 c.realm.currentFrame+=48000;
 await c.render();assert.equal(c.host.diagnosticSnapshot().reservedRenderUnits,0);
 assert(request(1,1000));await c.pump();for(let i=0;i<12;i++)await c.render();
 assert.equal(c.host.diagnosticSnapshot().reservedRenderUnits,0);
 const snap=c.host.diagnosticSnapshot();cases.push({transport:sab?'SAB':'MessagePort',builtFrom10003Requests:builds-2,
  initialAccepted:8,nonzeroSamples:nonzero,reservationsAfterEnds:snap.reservations,renderUnitLimit:snap.renderUnitLimit});
 await c.stop();
}
// Duplicate tokens and underestimated reservations cannot become extra voices.
{
 const c=await createHostedClock();const f=c.host.currentContextFrame()+256;
 assert(c.host.tryReserveAttack(1,f,2,1));assert(!c.host.tryReserveAttack(1,f,2,1));
 const e=new TonePlanRecordEncoder();
 const t={frequencyHz:440,gain:.1,cutoffHz:8000,resonance:.7,delayFrames:0,durationFrames:2400,waveform:0};
 assert(!c.host.trySubmitTonePlan(e.encode({token:1,epoch:c.host.epoch,frame:f,tones:[t,t]})));
 assert.equal(c.host.diagnosticSnapshot().reservedRenderUnits,0);await c.stop();
}
// Consumer defense also holds if a sender bypasses the host: no hidden kernel
// voice denial, no old work queued for catch-up after load has ended.
for(const sab of [false,true]) {
 const c=await createClock({sab});await c.message({type:'SET_MUTED',muted:false});
 let submittedToKernel=0;
 const submit=c.processor.bridge.submitRecord.bind(c.processor.bridge);
 c.processor.bridge.submitRecord=rec=>{submittedToKernel++;return submit(rec);};
 for(let block=0;block<30;block++){
  for(let k=0;k<16;k++)c.send(toneRecord(c,1000+block*16+k,c.frame+256,undefined,48000));
  c.render();
 }
 assert.equal(submittedToKernel,64,'kernel preparation is bounded by render cost, not 480 queued records');
 assert.equal(c.processor.reservations.usedVoices,64);
 await c.stop();
}
console.log(JSON.stringify({pass:true,proof:'real host, transports, processor and C11/WASM with model clock',physicalAudio:false,
 quietChord:{requested:3,emitted:3,addedDelayMs:0},noDeferredTimers:true,cases,consumerDefense:true},null,2));
