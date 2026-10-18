'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {load}=require('./offline_runtime.cjs');
const runtime=load(path.resolve(__dirname,'..'));
runtime.run(`
globalThis.holdTest={};
(()=>{
  let id=0;
  const nodes=[];
  function param(){return {value:1,events:[],setValueAtTime(...x){this.events.push(['set',...x])},
    linearRampToValueAtTime(...x){this.events.push(['ramp',...x])},
    setValueCurveAtTime(...x){this.events.push(['curve',...x])},
    cancelScheduledValues(){},cancelAndHoldAtTime(){}}}
  const ctx={currentTime:0,state:'running',sampleRate:48000,
    createBufferSource(){const n={id:id++,playbackRate:param(),connect(){},disconnect(){},
      start(...args){this.started=args},stop(...args){this.stopped=args}};nodes.push(n);return n},
    createGain(){return {gain:param(),connect(){},disconnect(){}}}};
  const buffer={duration:2,numberOfChannels:1,sampleRate:44100,length:88200};
  let released=0;
  function attach(extra={}) {
    const source=ctx.createBufferSource(),master=ctx.createGain();
    return __xenAttachSampleHold({ctx,source,master,dry:ctx.createGain(),input:{},buffer,
      rate:1,start:0,duration:2,peak:.2,release:.08,cleanup(){released++},...extra});
  }
  holdTest.ctx=ctx;holdTest.attach=attach;holdTest.nodes=nodes;
  holdTest.state=()=>__xenSampleHoldState(ctx);
  holdTest.set=v=>__xenSetSampleHold(ctx,v);
  holdTest.tick=()=>{const s=holdTest.state();clearTimeout(s.timer);__xenSampleHoldTick(s);clearTimeout(s.timer);s.timer=null};
  holdTest.released=()=>released;
})();
`);
const r=s=>runtime.run(s),t=r('holdTest.attach()');
assert.equal(r('holdTest.state().active.size'),0);
assert.equal(r('holdTest.nodes.length'),1,'ordinary note schedules no grains');
r('holdTest.ctx.currentTime=.2;holdTest.set(true)');
assert.equal(r('holdTest.state().active.size'),1);
const times=[.206,.306,.706,1.206,3,8,60],positions=times.map(x=>t.sourcePositionAt(x));
assert(positions.every((x,i)=>x>=0&&x<=2&&(i===0||x>=positions[i-1])));
const speed=x=>(t.sourcePositionAt(x+.001)-t.sourcePositionAt(x))/.001;
assert(speed(.21)>.98);assert(speed(1)<speed(.4));assert(speed(8)<.003);
assert(r('holdTest.nodes.slice(1).every(n=>n.playbackRate.events.every(e=>e[1]===1))'),'grain pitch must never follow the time-deceleration factor');
// Original direct source ending must not retire the held grain voice or lease.
t.osc.onended();assert.equal(r('holdTest.released()'),0);
r('holdTest.ctx.currentTime=8;holdTest.tick()');
const starts=r('holdTest.nodes.filter(n=>n.started).map(n=>n.started[0])');
assert(starts.filter(x=>x>=8).length<=4,'no late catch-up burst');
assert(starts.filter(x=>x>=8).every(x=>x>=8.004));
const other=r('holdTest.attach({start:8,duration:2,rate:1.5})');
assert.equal(r('holdTest.state().active.size'),2,'new notes join an existing hold');
const before=r('holdTest.nodes.length');r('holdTest.set(false);holdTest.tick()');
assert.equal(r('holdTest.nodes.length'),before,'gate closes before more scheduling');
assert.equal(r('holdTest.state().active.size'),0);assert.equal(r('holdTest.state().timer'),null);
assert(t.gain.gain.events.some(e=>e[0]==='ramp'&&e[1]===0&&Math.abs(e[2]-8.02)<1e-9));
for(const n of r('holdTest.nodes'))n.onended?.();other.dispose();t.dispose();
assert.equal(r('holdTest.released()'),2,'each sample lease is returned once');
assert.equal(r('holdTest.state().voices.size'),0);
// At EOF source access stays inside the original buffer and can still extend.
r('holdTest.ctx.currentTime=9.999');
const tail=r('holdTest.attach({start:8,duration:2})');r('holdTest.set(true)');
assert(tail.sourcePositionAt(50)<=2-.003);
tail.dispose();r('holdTest.set(false)');
// Very short source, transposition and pre-context hold use the same grain renderer.
const tiny=r('holdTest.attach({start:10,heldLong:true,buffer:{duration:.008},rate:4})');
tiny.dispose();r('holdTest.set(false)');
console.log('PASS Granular Hold: continuous deceleration, fixed grain pitch, polyphony, late-grain skip, EOF bounds, gate-before-work, 20ms cut, idempotent lease cleanup');
