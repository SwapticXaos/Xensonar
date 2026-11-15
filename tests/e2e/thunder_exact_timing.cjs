'use strict';
// THUNDER-CLOCK-01 (real app): Thunder pulses on the audio clock for every synth (as Nodal), the old timing selectable.
//  - the switch in the Thunder header: "Exact" by default, click = "Loose" (parameter thunderTiming), click again = Exact
//  - Exact: a held key with a classic sound (Bell) and with an Entrophon sound plays every pulse on the gesture's grid, with a plain pattern and with
//    slot volumes (measured on the Loop-Rec take of the Keyboard lane: deviation of the pulse spacing from the pattern interval, first two intervals excluded:
//    they start with the key-down attack, whose response time is unchanged, and its decay masks the onset of pulse 1 for this detector)
//  - Loose keeps the old main-thread timing (measurably looser), the switch says so
//  - after the key is released no further pulse sounds (exact pulses are handed over at most ~35 ms ahead)
// Usage: node tests/e2e/thunder_exact_timing.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 const timing=()=>E('__NodalBallGrid.params().thunderTiming??null');
 // ---- the switch ----
 const sw=p.locator('[data-xen-thunder-timing]').first();await sw.scrollIntoViewIfNeeded();
 assert.equal(await sw.getAttribute('data-xen-thunder-timing'),'exact','Exact by default (no stored value: '+await timing()+')');assert.equal(await sw.innerText(),'Exact');assert.equal(await sw.getAttribute('aria-checked'),'true');
 await sw.click();await p.waitForTimeout(300);assert.equal(await timing(),'loose');assert.equal(await sw.innerText(),'Loose');assert(/feature bug/.test(await sw.getAttribute('title')),'the switch explains the old timing');
 await sw.click();await p.waitForTimeout(300);assert.equal(await timing(),'exact');
 await p.evaluate(()=>document.activeElement?.blur?.());
 // ---- measure ----
 const phase=()=>E('__XenLoopRec.snapshot().phase');const takes=()=>E('JSON.stringify(bs().entries.filter(e=>e.sessionTake).map(e=>e.id))').then(JSON.parse);
 const bpm=Number(await E('__NodalBallGrid.params().quantizeBpm||108')),interval=240/bpm/8*1000;
 const measure=async(preset,mode,dyn)=>{
  await p.evaluate(([preset,mode,dyn])=>__xenProbe.bridge.patch({keyboardHoldSoundPreset:preset,thunderTiming:mode,thunderModeEnabled:true,thunderKeyboardEnabled:true,keyboardHoldSegments:8,keyboardHoldCustomSegments:8,keyboardHoldReferenceBars:1,keyboardHoldPatternSteps:Array(8).fill(true),keyboardHoldPitchCents:Array(8).fill(0),keyboardHoldSlotVolumes:dyn?[1,.7,1,.7,1,.7,1,.7]:[],keyboardHoldMicrotiming:[]}),[preset,mode,dyn]);await p.waitForTimeout(1500);
  for(let i=0;i<100&&!['idle','failed'].includes(await phase());i++)await p.waitForTimeout(100);const before=await takes();await E('__XenLoopRec.toggle()');
  for(let i=0;i<80&&await phase()!=='recording';i++)await p.waitForTimeout(100);await p.waitForTimeout(150);
  const t0=await E('__XenLoopRec.progress()?.toStart??0');
  await p.keyboard.down('q');await p.waitForTimeout(4200);await p.keyboard.up('q');const upAt=await E('(()=>{const pr=__XenLoopRec.progress();return pr?pr:null})()');
  await p.waitForTimeout(900);await E('__XenLoopRec.toggle()');
  for(let i=0;i<150;i++){if((await takes()).length>before.length)break;await p.waitForTimeout(100)}const id=(await takes()).find(x=>!before.includes(x));assert(id,'take stored');
  return p.evaluate(async([id,interval])=>{const blob=window.__xenProbe.draw.evalInBundle(`__materialAudioBlob(bs().entries.find(x=>x.id===${JSON.stringify(id)}),'test')`);
   const buf=await new OfflineAudioContext(1,1,48000).decodeAudioData(await blob.arrayBuffer()),sr=buf.sampleRate,d=buf.getChannelData(0),hop=Math.round(sr*.001),n=Math.floor(d.length/hop),env=new Float32Array(n);
   for(let k=0;k<n;k++){let m=0;for(let i=k*hop;i<(k+1)*hop;i++){const a=Math.abs(d[i]);if(a>m)m=a}env[k]=m}let top=0;for(const v of env)if(v>top)top=v;
   const on=[];let last=-1e9;for(let k=3;k<n;k++){const rise=env[k]-Math.max(env[k-1],env[k-2],env[k-3]);if(rise>top*.12&&env[k]>top*.2&&k-last>interval*.7){on.push(k);last=k}}
   const iois=[];for(let i=1;i<on.length;i++)iois.push(on[i]-on[i-1]);const rest=iois.slice(2);/* the first two intervals start with the key-down attack (its response time is unchanged) and its decay masks the onset of pulse 1 for this detector */
   return {pulses:on.length,first:iois[0],dev:rest.length?Math.max(...rest.map(x=>Math.abs(x-interval))):null,mean:rest.length?rest.reduce((a,x)=>a+Math.abs(x-interval),0)/rest.length:null,lastOnsetMs:on[on.length-1]}},[id,interval])};
 const rows=[];
 for(const [label,preset] of [['Bell','bell'],['Entrophon marimba','entrophon:factory:marimba-holz@1']])for(const dyn of [false,true]){
  const r=await measure(preset,'exact',dyn);rows.push(label+(dyn?' +slot volumes':'')+' exact: max '+r.dev.toFixed(1)+' ms, mean '+r.mean.toFixed(2));
  assert(r.pulses>=14,label+': the held key plays its pulses ('+r.pulses+')');assert(r.dev<=3,label+(dyn?' with slot volumes':'')+': every pulse on the grid (max deviation '+r.dev+' ms)')}
 {const r=await measure('bell','loose',true);rows.push('Bell +slot volumes loose: max '+(r.dev??NaN).toFixed(1)+' ms, mean '+(r.mean??NaN).toFixed(2));assert(r.pulses>=8,'loose still plays');assert(r.dev>3,'loose keeps the old, looser timing ('+r.dev+' ms)')}
 // ---- after release: nothing more (exact) ----
 {await p.evaluate(()=>__xenProbe.bridge.patch({keyboardHoldSoundPreset:'bell',thunderTiming:'exact',keyboardHoldSlotVolumes:[]}));await p.waitForTimeout(800);
  const voices=()=>E('window.__tv??0');await E('(()=>{window.__tv=0;const o=pL;pL=function(e){window.__tv++;return o(e)}})()');
  await p.keyboard.down('q');await p.waitForTimeout(1500);await p.keyboard.up('q');const atUp=await voices();await p.waitForTimeout(1200);const after=await voices();
  assert(after-atUp<=1,'after release at most the pulse already handed over (≤ 35 ms ahead) follows: '+(after-atUp))}
 assert.deepEqual(errors,[]);console.log('PASS THUNDER-CLOCK-01 switch Exact (default) / Loose; '+rows.join(' · '));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
