'use strict';
// End-to-end (real app in Chromium): THUNDER-HPP01 Hold Pattern Plan.
// Plan view in the Keyboard Hold Pattern Studio, preset generation, key attack → plan position,
// deviation hint + Grid restore, step edit/store, plan library, session restore of pre-plan snapshots.
// Usage: node tests/e2e/hold_pattern_plan.cjs dist/XenSonar_PROBE.html   (build: tools/build.py --probe)
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
const ready=p=>p.waitForFunction(()=>window.__xenProbe&&__xenProbe.bridge.available(),null,{timeout:30000});
const np=p=>p.evaluate(()=>__xenProbe.bridge.capture().nParamsUI);
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1500,height:950}});const p=await ctx.newPage();
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);await ready(p);await p.waitForTimeout(2500);
  // Cold: the plan island is not evaluated at boot.
  assert.equal(await p.evaluate(()=>window.__XenDeferredFunctionStatus().includes('__xenHoldPatternPlanFactory')),false,'plan island not loaded at boot');
  assert.equal((await np(p)).keyboardHoldPlan??null,null,'no plan by default');
  await p.getByRole('button',{name:'Power',exact:true}).click();await p.waitForTimeout(800);
  const stage=p.locator('canvas[data-xen-play-area]');await stage.scrollIntoViewIfNeeded();const r=await stage.boundingBox();
  await p.mouse.click(r.x+r.width*.5,r.y+r.height*.5);await p.waitForTimeout(300);
  await p.getByText('Keyboard-Hold Pattern').first().click();await p.waitForTimeout(300);
  const open=p.locator('button.xen-hpm02-open');assert.match(await open.innerText(),/Hold Pattern Studio/);
  await open.click();await p.waitForTimeout(300);
  await p.getByRole('tab',{name:/^Plan/}).click();await p.waitForTimeout(500);
  assert.equal(await p.evaluate(()=>window.__XenDeferredFunctionStatus().includes('__xenHoldPatternPlanFactory')),true,'plan island loads on first use');
  await p.locator('.xen-hpm02-dialog select[aria-label="Plan preset"]').selectOption('polymeter');
  await p.getByRole('button',{name:'Generate from preset'}).click();await p.waitForTimeout(500);
  const n=await np(p),plan=n.keyboardHoldPlan,N=plan.nativeGrid.audible.length;
  assert.equal(await p.locator('.xen-hpp-step').count(),N,'one ladder step per audible Grid step');
  assert.equal(plan.entries.length,N);assert.equal(plan.nativeGrid.tuningId,n.gridTuning);
  assert.deepEqual(plan.entries.map(e=>e.pattern.slots).slice(0,4),[3,4,5,6],'polymeter preset gives each step its own subdivision');
  assert.match(await p.locator('[data-xen-hpp-basis]').innerText(),/Basis · Main Room Grid/);
  assert.doesNotMatch(await p.locator('.xen-hpm02-dialog').innerText(),/Tonic|Subdominant|Dominant|Mediant/,'no tonal functions are inferred');
  // Resolver: every audible step in several periods maps to its plan position; off-grid → lane pattern.
  const res=await p.evaluate(N=>{const prm=__xenProbe.bridge.capture().nParamsUI,h=__xenProbe.holdPlan,t=h.gridTable(prm),out=[];
    for(let k=-2;k<=2;k++)for(let i=0;i<N;i++){const hz=t.base*Math.pow(2,(t.audible[i].cents+k*t.period)/1200);out.push([i,h.position(t,hz),h.forHz(prm,hz)?.slots])}
    const off=t.base*Math.pow(2,(t.audible[0].cents+t.tolerance+20)/1200);return {out,off:h.position(t,off)}},N);
  for(const [i,pos,slots] of res.out){assert.equal(pos,i);assert.equal(slots,plan.entries[i].pattern.slots)}
  assert.equal(res.off,-1,'off-grid frequency uses the lane pattern');
  // Real key attacks resolve through the plan (live highlight in the ladder).
  await p.evaluate(()=>document.activeElement?.blur());
  const serial0=await p.evaluate(()=>__xenProbe.holdPlan.last.serial);
  const seen=[],counts=[];
  for(const k of ['1','2','3','4']){await p.keyboard.down(k);await p.waitForTimeout(220);seen.push(await p.evaluate(()=>__xenProbe.holdPlan.last.position));await p.keyboard.up(k);await p.waitForTimeout(80)}
  const serial1=await p.evaluate(()=>__xenProbe.holdPlan.last.serial);
  assert.ok(serial1>serial0,'key attacks consult the plan');
  assert.equal(new Set(seen).size,4,'four neighbouring keys hit four different plan positions: '+seen);
  assert.equal(await p.locator('.xen-hpp-step.live').count(),1,'last played step is highlighted');
  // Deviation is a hint, never a block; restore brings the native Grid back.
  await p.evaluate(()=>__xenProbe.bridge.patch({gridTuning:'19edo'}));await p.waitForTimeout(400);
  assert.match(await p.locator('.xen-hpp-dev').innerText(),/Deviation/);
  assert.equal(await p.evaluate(()=>{const prm=__xenProbe.bridge.capture().nParamsUI,t=__xenProbe.holdPlan.gridTable(prm);return !!__xenProbe.holdPlan.forHz(prm,t.base)}),true,'plan still plays on a foreign Grid');
  await p.getByRole('button',{name:'Restore plan Grid'}).click();await p.waitForTimeout(400);
  assert.equal((await np(p)).gridTuning,plan.nativeGrid.tuningId);assert.match(await p.locator('.xen-hpp-dev').innerText(),/native Grid/);
  // Edit a step in the Pattern view and store it back; the lane working pattern returns.
  const laneBefore=(await np(p)).keyboardHoldPatternSteps;
  await p.locator('.xen-hpp-step').nth(N-1).click();await p.waitForTimeout(150);// top of ladder = highest position? ladder is reversed
  await p.getByRole('button',{name:'✎ Edit in Pattern view'}).click();await p.waitForTimeout(300);
  const editing=await p.locator('.xen-hpp-banner').innerText();assert.match(editing,/Editing plan step/);
  await p.getByRole('button',{name:'All'}).count();// pattern view is visible
  await p.getByRole('button',{name:/^Store into/}).click();await p.waitForTimeout(400);
  const after=await np(p);
  assert.ok(after.keyboardHoldPlan.entries.some(e=>e?.source?.kind==='edited'),'stored step is marked edited');
  assert.deepEqual(after.keyboardHoldPatternSteps,laneBefore,'lane working pattern restored after step edit');
  // The step count is the room Grid's audible step count, not a fixed scale size.
  for(const [tuning,mode,mutes,expect] of [['19edo','chromatic',[],19],['bp','chromatic',[],13],['31edo','chromatic',[],31]]){
    await p.evaluate(([t,m,mu])=>__xenProbe.bridge.patch({keyboardHoldPlan:null,gridTuning:t,gridMode:m,manualGridMutedSteps:mu,manualGridStepOffsets:[]}),[tuning,mode,mutes]);await p.waitForTimeout(400);
    await p.getByRole('button',{name:'＋ Empty plan for current Grid'}).click();await p.waitForTimeout(300);
    const got=await p.locator('.xen-hpp-step').count();
    assert.equal(got,expect,tuning+' chromatic → '+expect+' plan steps');counts.push(tuning+':'+got);
  }
  await p.evaluate(g=>__xenProbe.bridge.patch({gridTuning:g.tuningId,gridMode:g.modeId,manualGridMutedSteps:g.mainMutedDegrees,manualGridStepOffsets:g.mainStepOffsets,keyboardHoldPlan:null}),plan.nativeGrid);await p.waitForTimeout(400);
  await p.locator('.xen-hpm02-dialog select[aria-label="Plan preset"]').selectOption('polymeter');
  await p.getByRole('button',{name:'Generate from preset'}).click();await p.waitForTimeout(400);
  // Studio slot cards: red pitch line inside each card (+period = top edge, 0 = middle, -period = bottom), high refs first.
  await p.evaluate(()=>{const c=Array.from({length:16},(_,i)=>[0,1200,-1200,600][i%4]);__xenProbe.bridge.patch({keyboardHoldSegments:16,keyboardHoldPitchCents:c,keyboardHoldPatternSteps:c.map(()=>1)})});await p.waitForTimeout(300);
  await p.getByRole('button',{name:/Close detailed/}).click();await p.locator('button.xen-hpm02-open').click();await p.waitForTimeout(300);
  const lines=await p.evaluate(()=>[...document.querySelectorAll('.xen-hpm02-slot-grid .xen-hold-pitch-preview')].slice(0,4).map(e=>e.style.top));
  assert.deepEqual(lines,['50%','0%','100%','25%'],'slot cards show the pitch line (octave up = top edge)');
  const refCents=await p.evaluate(()=>[...document.querySelectorAll('.xen-hpm02-ref-list button')].map(b=>Number(b.getAttribute('aria-label').match(/(-?[\d.]+) cents$/)[1])));
  assert.ok(refCents.every((v,i)=>i===0||refCents[i-1]>=v),'reference list runs high to low like the pitch rail');
  await p.getByRole('tab',{name:/^Plan/}).click();await p.waitForTimeout(300);
  // Plan library: Save As survives a reload.
  const name='E2E plan '+Date.now();
  await p.locator('.xen-hpp input[placeholder^="e.g."]').fill(name);
  await p.locator('.xen-hpp').getByRole('button',{name:'Save As',exact:true}).click();await p.waitForTimeout(600);
  // Session restore: a snapshot from before plans existed switches the plan off.
  const snap=await p.evaluate(()=>{const s=__xenProbe.bridge.capture();delete s.nParamsUI.keyboardHoldPlan;return s});
  await p.getByRole('button',{name:/Close detailed/}).click();
  await p.evaluate(s=>__xenProbe.bridge.apply(s),snap);await p.waitForTimeout(500);
  assert.equal((await np(p)).keyboardHoldPlan,null,'pre-plan snapshot restores without a plan');
  await p.reload();await ready(p);await p.waitForTimeout(1500);
  await p.getByText('Keyboard-Hold Pattern').first().click();await p.locator('button.xen-hpm02-open').click();await p.getByRole('tab',{name:/^Plan/}).click();await p.waitForTimeout(800);
  assert.ok((await p.locator('.xen-hpp select[aria-label="Saved plans"] option').allInnerTexts()).includes(name),'saved plan listed after reload');
  assert.deepEqual(errors,[],'no page errors');
  console.log('PASS hold_pattern_plan ('+N+' steps, keys→positions '+seen.join(',')+', '+counts.join(' ')+')');
  await b.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});
