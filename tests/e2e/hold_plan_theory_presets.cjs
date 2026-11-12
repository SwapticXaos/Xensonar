'use strict';
// HOLD-LIB-03 (real app): the music-theory plan presets resolve on the real Grid: functional triads on a major / minor mode, roles by degree,
// valid patterns for every position, and no failure on a Grid with another step count. Usage: node tests/e2e/hold_plan_theory_presets.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(1500);
  const E=code=>p.evaluate(c=>window.__xenProbe.draw.evalInBundle(c),code);
  await E("globalThis.__hpp=__xenGetDeferredFn('__xenHoldPatternPlanFactory')();0");
  const plan=async(id,origin)=>JSON.parse(await E('JSON.stringify(__hpp.fromPreset('+JSON.stringify(id)+','+JSON.stringify(origin)+'))'));
  const ionian={tuningId:'12edo',modeId:'ionian',gridBaseHz:220,mainMutedDegrees:[1,3,6,8,10],mainStepOffsets:[]};
  const aeolian={tuningId:'12edo',modeId:'aeolian',gridBaseHz:220,mainMutedDegrees:[1,4,6,9,11],mainStepOffsets:[]};
  const ids=JSON.parse(await E('JSON.stringify(__hpp.presets)'));
  const theory=ids.filter(x=>String(x.group).startsWith('Theory'));assert(theory.length>=8,'theory presets: '+theory.length);assert(ids.some(x=>x.group==='Neutral figures'),'neutral presets kept');
  for(const o of[ionian,aeolian])for(const pr of ids){const pl=await plan(pr.id,o);assert.equal(pl.entries.length,7,pr.id+' fills every step');assert(pl.entries.every(e=>e&&e.pattern.slots>=1),pr.id)}
  const c=(pl,i)=>pl.entries[i].pattern.pitchCents;
  // triads: major mode => I major, II minor, VII diminished; minor mode => I minor
  const tI=await plan('triads',ionian);assert.deepEqual(c(tI,0).slice(0,3),[0,400,700],'I major');assert.deepEqual(c(tI,1).slice(0,3),[0,300,700],'II minor');assert.deepEqual(c(tI,3).slice(0,3),[0,400,700],'IV major');assert.deepEqual(c(tI,4).slice(0,3),[0,400,700],'V major');assert.deepEqual(c(tI,6).slice(0,3),[0,300,600],'VII diminished');
  const tA=await plan('triads',aeolian);assert.deepEqual(c(tA,0).slice(0,3),[0,300,700],'i minor');assert.deepEqual(c(tA,2).slice(0,3),[0,400,700],'III major');
  // sevenths: Imaj7 / ii7 / V7
  const sv=await plan('sevenths',ionian);assert.deepEqual(c(sv,0).slice(0,4),[0,400,700,1100]);assert.deepEqual(c(sv,1).slice(0,4),[0,300,700,1000]);assert.deepEqual(c(sv,4).slice(0,4),[0,400,700,1000]);
  // fugue: subject on I, answer on V (one slot later), different material elsewhere
  const fu=await plan('fugue',ionian);assert.deepEqual(c(fu,0),c(fu,4),'answer has the subject pitches');assert.equal(fu.entries[0].pattern.muteSteps[0],1);assert.equal(fu.entries[4].pattern.muteSteps[0],0,'answer enters one slot later');assert.notDeepEqual(c(fu,1),c(fu,0));
  // jazz functional: tonic / subdominant / dominant differ in slot count
  const jf=await plan('jazz-func',ionian);assert.deepEqual([jf.entries[0].pattern.slots,jf.entries[1].pattern.slots,jf.entries[4].pattern.slots],[4,6,8]);
  const jc=await plan('jazz-shells',ionian);assert(jc.entries[0].pattern.microtiming.some(v=>v>0)&&jc.entries[0].pattern.muteSteps.includes(0),'swing and real rests');
  // other Grids: 19 steps (chromatic) and a 5-note mode keep working
  for(const o of[{tuningId:'19edo',modeId:'chromatic',gridBaseHz:220,mainMutedDegrees:[],mainStepOffsets:[]},{tuningId:'12edo',modeId:'pentatonic',gridBaseHz:220,mainMutedDegrees:[1,3,5,6,8,10,11],mainStepOffsets:[]}])
   for(const pr of theory){const pl=await plan(pr.id,o);assert(pl.entries.length>=5&&pl.entries.every(e=>e.pattern.pitchCents.every(v=>v>=-1200&&v<=1200)),pr.id+' on '+o.tuningId)}
  assert.deepEqual(errors,[]);console.log('PASS HOLD-LIB-03 theory plan presets (functional triads, sevenths, jazz roles, fugue voices)');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
