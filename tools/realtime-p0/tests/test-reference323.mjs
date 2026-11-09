import assert from 'node:assert/strict';
import { playScheduledToneWithLifecycle } from '../reference323/compiled/features/xensonar/audio/scheduledTonePlaybackBoundary.js';

class Param {
  constructor(){ this.value=0; this.events=[]; }
  cancelScheduledValues(t){ this.events.push(['cancel',t]); }
  setValueAtTime(v,t){ this.events.push(['set',v,t]); this.value=v; }
  linearRampToValueAtTime(v,t){ this.events.push(['linear',v,t]); this.value=v; }
  exponentialRampToValueAtTime(v,t){ this.events.push(['exp',v,t]); this.value=v; }
  setTargetAtTime(v,t,c){ this.events.push(['target',v,t,c]); this.value=v; }
}
class Node { connect(){} disconnect(){} }
class Osc extends Node { constructor(){ super(); this.frequency={value:0}; this.type='sine'; this.starts=[]; this.stops=[]; } start(t){this.starts.push(t)} stop(t){this.stops.push(t)} }
class Gain extends Node { constructor(){super();this.gain=new Param()} }
class Filter extends Node { constructor(){super();this.frequency=new Param();this.Q=new Param();this.type='lowpass'} }
function run(heldLong,currentTime=0,offset=0.05){
  const ctx={state:'running',currentTime,createOscillator:()=>new Osc(),createGain:()=>new Gain(),createBiquadFilter:()=>new Filter()};
  const active={current:[]}; const out=new Node();
  const ok=playScheduledToneWithLifecycle({ctx,activeScheduledTonesRef:active,transientRuntime:{admitVoice:()=>null,pickTargets:(x)=>x.filter(Boolean),releaseVoice:()=>{}},getMainOutput:()=>out,heldLong,recordCount:()=>{},recordAdaptiveAction:()=>{},silentHotPathSources:{other:true}},
    {freq:220,offset,dur:0.18,type:'sine',volume:0.04,q:1,cutoff:2400,options:{source:'other'}});
  assert.equal(ok,true); assert.equal(active.current.length,1);
  const h=active.current[0];
  return {gain:h.gain.gain.events, filterFreq:h.filter.frequency.events, filterQ:h.filter.Q.events, starts:h.osc.starts,stops:h.osc.stops};
}
const normal=run(false), held=run(true);
const targetN=normal.gain.find(e=>e[0]==='target');
const targetH=held.gain.find(e=>e[0]==='target');
assert.ok(Math.abs(normal.starts[0]-0.05)<1e-12);
assert.ok(Math.abs(targetN[2]-0.1544)<1e-9);
assert.ok(Math.abs(targetN[3]-0.025704)<1e-9);
assert.ok(Math.abs(normal.stops[0]-0.31)<1e-9);
assert.ok(Math.abs(targetH[2]-0.99)<1e-9);
assert.ok(Math.abs(targetH[3]-0.0476)<1e-9);
assert.ok(Math.abs(held.stops[0]-1.21)<1e-9);
const admittedNow=5000/48000;
const late=run(false,admittedNow,-0.088);
assert.ok(Math.abs(late.starts[0]-(admittedNow+.005))<1e-12);
assert.ok(Math.abs(late.gain.find(e=>e[0]==='linear')[2]-(admittedNow+.0085))<1e-12);
assert.ok(Math.abs(late.gain.find(e=>e[0]==='target')[2]-(admittedNow+.005+.1044))<1e-12);
assert.ok(Math.abs(late.stops[0]-(admittedNow+.005+.26))<1e-12);
console.log(JSON.stringify({pass:true,normal,held,accepted88msLate:late},null,2));
