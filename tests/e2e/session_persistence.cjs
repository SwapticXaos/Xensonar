'use strict';
// End-to-end (real app in Chromium): named sessions keep Bass timbre, Drone settings and Drone
// volume per session, across A/B switching and a full page reload. Replaces the Oct-28 isolation
// tests working_session / session_bass_drone_p2, which no longer load in isolation.
// Usage: node tests/e2e/session_persistence.cjs dist/XenSonar_PROBE.html   (build: tools/build.py --probe)
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
const ready=p=>p.waitForFunction(()=>window.__xenProbe&&__xenProbe.bridge.available(),null,{timeout:30000});
const live=p=>p.evaluate(()=>{const n=__xenProbe.bridge.capture().nParamsUI;return {bassVoice:n.bassVoice,bassResonance:n.bassResonance,dronePreset:n.dronePreset,droneFixedHz:n.droneFixedHz,droneRhythm:n.droneRhythm}});
async function droneVolume(p,set){
  // the Drone panel's "Volume N%" slider (no aria-label) inside the main-room control triptych
  const pick=()=>[...document.querySelectorAll('.xen-mainroom-control-triptych input[type=range]')].find(i=>!i.getAttribute('aria-label')&&/^Volume\s+\d+%/.test((i.closest('label')?.innerText||'').trim()));
  if(set===undefined)return p.evaluate(pick=>Number(eval(pick)().value),'('+pick+')');
  await p.evaluate(([pick,v])=>{const i=eval(pick)();const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(i,String(v));i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}))},['('+pick+')',set]);
  await p.waitForTimeout(400);return p.evaluate(pick=>Number(eval(pick)().value),'('+pick+')');
}
(async()=>{
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:900}});const p=await ctx.newPage();
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);await ready(p);await p.waitForTimeout(1500);
  const before=await p.evaluate(()=>__xenProbe.meta.snapshot().saved.length);
  // Session A
  await p.evaluate(()=>__xenProbe.bridge.patch({bassVoice:'hollow',bassResonance:.73,dronePreset:'dark_sub',droneFixedHz:55,droneRhythm:'Synkope'}));
  await p.waitForTimeout(300);const la=await live(p);
  assert.equal(la.bassVoice,'hollow','bass voice must be settable through the room owner');assert.equal(la.droneFixedHz,55);
  const va=await droneVolume(p,.17);
  assert.equal(await p.evaluate(()=>__xenProbe.meta.saveFromQuickAsNew('E2E A',false)),true,'save A');
  // Session B
  await p.evaluate(()=>__xenProbe.bridge.patch({bassVoice:'sub',bassResonance:.2,droneFixedHz:110,droneRhythm:'Off'}));
  await p.waitForTimeout(300);const vb=await droneVolume(p,.69);
  assert.equal(await p.evaluate(()=>__xenProbe.meta.saveFromQuickAsNew('E2E B',false)),true,'save B');
  const rows=await p.evaluate(()=>__xenProbe.meta.snapshot().saved.map(r=>({id:r.id,name:r.name,room:r.roomSettings,bass:r.songPerformance?.sources?.bass?.timbre,drone:r.songPerformance?.sources?.drone})));
  assert.equal(rows.length,before+2);
  const A=rows.find(r=>r.name==='E2E A'),B=rows.find(r=>r.name==='E2E B');
  assert.equal(A.room,null,'Room Settings unchecked: no room snapshot');
  assert.equal(A.bass.bassVoice,'hollow');assert.equal(A.bass.bassResonance,.73);assert.equal(B.bass.bassVoice,'sub');
  assert.equal(A.drone.params.droneRhythm,'Synkope');assert.equal(A.drone.params.droneFixedHz,55);assert.equal(B.drone.params.droneFixedHz,110);
  // SESSION-DRONE-VOL-01 (09.11.2026): drone volume is stored per session (was never wired before).
  const dv=process.env.XEN_EXPECT_DRONE_VOLUME!=='0';
  if(dv){assert.equal(A.drone.volume,va);assert.equal(B.drone.volume,vb)}
  // A/B/A switching restores live state
  const check=async(id,exp,vol)=>{assert.equal(await p.evaluate(id=>__xenProbe.meta.activateSaved(id),id),true);await p.waitForTimeout(700);
    const l=await live(p);for(const k of Object.keys(exp))assert.equal(l[k],exp[k],`${k} after activating`);if(dv)assert.equal(await droneVolume(p),vol,'drone volume after activating')};
  await check(A.id,{bassVoice:'hollow',droneFixedHz:55,droneRhythm:'Synkope'},va);
  await check(B.id,{bassVoice:'sub',droneFixedHz:110,droneRhythm:'Off'},vb);
  await check(A.id,{bassVoice:'hollow',droneFixedHz:55,droneRhythm:'Synkope'},va);
  // full reload: saved rows survive, and still restore
  await p.waitForTimeout(1800);await p.reload();await ready(p);await p.waitForTimeout(1500);
  const after=await p.evaluate(()=>__xenProbe.meta.snapshot().saved.map(r=>r.name));
  assert(after.includes('E2E A')&&after.includes('E2E B'),'sessions survive reload');
  await check(B.id,{bassVoice:'sub',droneFixedHz:110,droneRhythm:'Off'},vb);
  await check(A.id,{bassVoice:'hollow',droneFixedHz:55,droneRhythm:'Synkope'},va);
  // sessions saved before the fix carry no drone volume: activating them must leave the current volume alone
  await p.evaluate(()=>{const k='xensonar.meta-sessions.v2',d=JSON.parse(localStorage.getItem(k));for(const r of d.saved)if(r.name==='E2E B'&&r.songPerformance?.sources?.drone)delete r.songPerformance.sources.drone.volume;localStorage.setItem(k,JSON.stringify(d))});
  await p.reload();await ready(p);await p.waitForTimeout(1500);
  const keep=await droneVolume(p,.33);
  assert.equal(await p.evaluate(id=>__xenProbe.meta.activateSaved(id),B.id),true);await p.waitForTimeout(700);
  assert.equal(await droneVolume(p),keep,'legacy session without drone volume leaves the current volume untouched');
  assert.equal((await live(p)).droneFixedHz,110,'legacy session still restores its drone params');
  assert.deepEqual(errors,[],'no page errors');
  console.log(`PASS E2E sessions: bass timbre and drone params per session, A/B/A, reload${dv?', drone volume, legacy sessions without volume':''}`);
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
