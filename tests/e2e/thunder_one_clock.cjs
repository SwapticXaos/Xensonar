'use strict';
// THUNDER-ONE (real app): one hold mechanism for every synth, Nodal's. A held key plays its first pulse(s) from the main
// thread as before; from then on the audio clock of the gesture in the worklet plays every step (Nodal: its own worklet,
// Entrophon and classic sounds: the C11 worklet), with the same clock description and the same step function.
//  - Entrophon (factory default sound): after the first two notes the main thread starts no voice; every expected step sounds
//  - slot volumes and microtiming stay on the clock (before, Entrophon fell back to main-thread pulses for them); levels follow
//  - the main thread is blocked for 150 ms every 400 ms: no step is lost (the clock does not depend on it)
//  - "Loose" (the old timing, kept as a feature bug): every pulse is started by the main thread, no clock
// Usage: node tests/e2e/thunder_one_clock.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 // count main-thread voice starts; ask the C11 worklet how many steps its clock played
 await E(`(()=>{window.__hosts=new Set();const oc=__XenHoldResident.capture;__XenHoldResident.capture=function(s,h,...r){if(h)window.__hosts.add(h);return oc.call(this,s,h,...r)};
  window.__steps=()=>Promise.all([...window.__hosts].map(h=>new Promise(ok=>{const id=Math.random();const l=ev=>{if(ev.data?.type==='DIAGNOSTIC_SNAPSHOT'&&ev.data.requestId===id){h.node.port.removeEventListener('message',l);const s=ev.data.snapshot;ok({taps:s.holdTapStarts,live:s.holdCompleteSteps,missed:s.holdMissedSteps,silent:s.holdSilentSteps})}};h.node.port.addEventListener('message',l);h.node.port.postMessage({type:'DIAGNOSTIC_REQUEST',requestId:id})}))).then(a=>a.reduce((s,x)=>({taps:s.taps+x.taps,missed:s.missed+x.missed,silent:s.silent+x.silent}),{taps:0,missed:0,silent:0}));
  window.__vs=[];const o=pL;pL=function(e){window.__vs.push(performance.now());return o(e)}})()`);
 const bpm=Number(await E('__NodalBallGrid.params().quantizeBpm||108'));
 const hold=async(patch,ms,jank=0)=>{await p.evaluate(x=>__xenProbe.bridge.patch(x),patch);await p.waitForTimeout(900);
  const before=await p.evaluate(()=>window.__steps());await p.evaluate(()=>{window.__vs.length=0});
  if(jank)await p.evaluate(ms=>{window.__jank=setInterval(()=>{const t=performance.now();while(performance.now()-t<ms);},400)},jank);
  const t0=Date.now();await p.keyboard.down('q');await p.waitForTimeout(ms);await p.keyboard.up('q');const held=Date.now()-t0;
  await p.evaluate(()=>clearInterval(window.__jank));await p.waitForTimeout(400);
  const after=await p.evaluate(()=>window.__steps()),main=await p.evaluate(()=>window.__vs.length);
  const seg=patch.keyboardHoldSegments||16,interval=240/bpm/seg*1000;
  return {main,clock:after.taps-before.taps,missed:after.missed-before.missed,silent:after.silent-before.silent,expected:Math.floor(held/interval)+1,res:JSON.parse(await E('JSON.stringify(__XenHoldResident.diagnostics().totals)')),why:JSON.parse(await E('JSON.stringify(__XenHoldResident.diagnostics().lastRejects||[])')).map(x=>x.reason+'@'+x.index+'/'+x.count)}};
 // start defaults (since 182e933) put Nodal troodle on the Keyboard: this test is about the Entrophon factory sound (former default), so it sets it
 const base={keyboardHoldSoundPreset:'entrophon:factory:marimba-holz@1',thunderModeEnabled:true,thunderKeyboardEnabled:true,thunderTiming:'exact',keyboardHoldSegments:16,keyboardHoldCustomSegments:16,keyboardHoldReferenceBars:1,keyboardHoldPatternSteps:Array(16).fill(true),keyboardHoldPitchCents:Array(16).fill(0),keyboardHoldSlotVolumes:[],keyboardHoldMicrotiming:[]};
 const notes=[];
 // warm-up: right after Power the existing voice admission may refuse a partial of the very first attack; then the plan is
 // deliberately not taken over (an incomplete sound would be repeated) and the main thread keeps the key until the next session
 await hold(base,700);
 // 1. Entrophon factory sound, plain pattern: two main-thread notes, then only the clock
 let r=await hold(base,3000);notes.push('plain '+JSON.stringify(r));
 assert(r.main<=2,'the main thread starts only the first notes: '+JSON.stringify(r));assert.equal(r.missed+r.silent,0,'no step lost');
 assert(Math.abs(r.main+r.clock-r.expected)<=1,'every expected step sounds: '+(r.main+r.clock)+' of '+r.expected);
 // 2. slot volumes, microtiming and pitch steps stay on the clock
 r=await hold({...base,keyboardHoldSlotVolumes:Array.from({length:16},(_,i)=>i%2?.3:1),keyboardHoldMicrotiming:Array.from({length:16},(_,i)=>i%4===3?.25:0),keyboardHoldPitchCents:Array.from({length:16},(_,i)=>[0,700,-500,1200][i%4])},3000);notes.push('volumes/micro/pitch '+JSON.stringify(r));
 assert(r.main<=2,'volume and microtiming patterns no longer fall back to main-thread pulses: '+r.main);assert(Math.abs(r.main+r.clock-r.expected)<=1);assert.equal(r.missed+r.silent,0);
 // 3. main thread blocked 150 ms every 400 ms: the clock keeps every step
 r=await hold(base,3000,150);notes.push('blocked main thread '+JSON.stringify(r));
 assert(r.main<=2);assert.equal(r.missed+r.silent,0,'no step lost while the main thread is blocked');assert(Math.abs(r.main+r.clock-r.expected)<=1,'all steps: '+(r.main+r.clock)+' of '+r.expected);
 // 4. Loose = the old timing: every pulse from the main thread, the clock plays nothing
 r=await hold({...base,thunderTiming:'loose'},2000);notes.push('loose '+JSON.stringify(r));
 assert.equal(r.clock,0,'Loose: no audio-clock steps');assert(Math.abs(r.main-r.expected)<=2,'Loose: every pulse from the main thread: '+r.main+' of '+r.expected);
 // 5. the switch is in the Hold zone and toggles the parameter
 const sw=p.locator('[data-xen-thunder-timing]').first();if(await sw.count()){await sw.click();await p.waitForTimeout(300);assert.equal(await E('__NodalBallGrid.params().thunderTiming'),'exact');}
 assert.deepEqual(errors,[]);console.log('PASS THUNDER-ONE: one hold clock (Nodal mechanism) for Entrophon, volumes/microtiming/pitch on the clock, robust against a blocked main thread, Loose keeps the old timing · '+notes.join(' · '));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
