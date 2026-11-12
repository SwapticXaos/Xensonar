'use strict';
// The slot cards of the Hold panel (Main Room, Thunder Mode) are the QUICK editor: click = rest / sound, right-click = fretless pitch slider (±1 octave) on the card.
// They must work for the lane pattern AND for a shown plan step (the change is written into that step), and the plan can be switched ON / OFF right there:
// OFF = the lane arpeggio plays on every key. Usage: node tests/e2e/hold_cards_live_edit.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
const ready=p=>p.waitForFunction(()=>window.__xenProbe&&__xenProbe.bridge.available(),null,{timeout:30000});
const np=p=>p.evaluate(()=>__xenProbe.bridge.capture().nParamsUI);
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1500,height:950}});const p=await ctx.newPage();
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);await ready(p);await p.waitForTimeout(2500);
  const E=code=>p.evaluate(c=>window.__xenProbe.draw.evalInBundle(c),code);
  await p.getByRole('button',{name:'Power',exact:true}).click();await p.waitForTimeout(800);
  await p.getByText('Keyboard-Hold Pattern').first().click();await p.waitForTimeout(300);
  const panel=p.locator('.xen-hold-pattern').first(),cards=panel.locator('[data-xensonar-shared-segment-pattern-grid] > button');
  await cards.first().scrollIntoViewIfNeeded();
  const popup=p.locator('[data-xen-hold-pitch-popup]');
  // ---- lane pattern: right-click opens the pitch slider on the card, a click in its upper half raises the pitch, left click toggles the slot ----
  const n0=await np(p);const cardCount=await cards.count();
  await cards.nth(2).click({button:'right'});await p.waitForTimeout(200);assert.equal(await popup.count(),1,'right-click on a card opens the pitch slider');
  const pb=await popup.boundingBox();await p.mouse.click(pb.x+pb.width/2,pb.y+pb.height*.05);await p.waitForTimeout(250);
  let n1=await np(p);assert(n1.keyboardHoldPitchCents[2]>(n0.keyboardHoldPitchCents[2]||0)+100,'the slider raised the pitch of slot 3: '+(n0.keyboardHoldPitchCents[2]||0)+' → '+n1.keyboardHoldPitchCents[2]);
  assert.deepEqual(n1.keyboardHoldPitchCents.filter((v,k)=>k!==2),n0.keyboardHoldPitchCents.filter((v,k)=>k!==2),'only that slot changed');await p.keyboard.press('Escape');await p.mouse.click(5,5);await p.waitForTimeout(250);
  await cards.nth(4).click();await p.waitForTimeout(200);n1=await np(p);assert.notEqual(n1.keyboardHoldPatternSteps[4],n0.keyboardHoldPatternSteps[4],'left click toggles the slot');await cards.nth(4).click();await p.waitForTimeout(150);
  // ---- Save changes to …? also for the lane arpeggio: edit the cards, then load another pattern ----
  const sel=panel.locator('select[aria-label="keyboard saved Arpeggio Patterns"]'),hpm=panel.locator('.xen-hpm01'),loadBtn=hpm.getByRole('button',{name:'Load',exact:true});
  await sel.focus();await p.waitForTimeout(500);
  const fac=await sel.locator('optgroup[label="Factory"] option').allInnerTexts();
  await sel.selectOption({label:fac.find(t=>t.startsWith('Major · triad sweep ↑ ·'))});await loadBtn.click();await p.waitForTimeout(400);
  assert.equal(await hpm.locator('[role=alertdialog]').count(),0,'nothing to save right after loading');
  await cards.nth(1).click();await p.waitForTimeout(200);const edited=(await np(p)).keyboardHoldPatternSteps.slice();
  await sel.selectOption({label:fac.find(t=>t.startsWith('Minor · triad sweep ↑ ·'))});await loadBtn.click();await p.waitForTimeout(300);
  const ban=hpm.locator('[role=alertdialog]');assert.match(await ban.innerText(),/Save changes to “Major · triad sweep ↑”\?/,'edited cards: loading another pattern asks first');
  await ban.getByRole('button',{name:'Cancel'}).click();await p.waitForTimeout(200);assert.deepEqual((await np(p)).keyboardHoldPatternSteps,edited,'Cancel keeps the cards as they are');
  await loadBtn.click();await p.waitForTimeout(300);await ban.getByRole('button',{name:'Discard changes'}).click();await p.waitForTimeout(400);
  let q0=await np(p);assert.deepEqual(q0.keyboardHoldPitchCents.slice(0,4),[0,300,700,1200],'Discard loads the minor arpeggio');
  await cards.nth(2).click();await p.waitForTimeout(200);
  await sel.selectOption({label:fac.find(t=>t.startsWith('Major · triad sweep ↑ ·'))});await loadBtn.click();await p.waitForTimeout(300);
  await ban.getByRole('button',{name:/^Save as “Minor · triad sweep ↑ \(edited\)”/}).click();await p.waitForTimeout(700);
  q0=await np(p);assert.deepEqual(q0.keyboardHoldPitchCents.slice(0,4),[0,400,700,1200],'after saving the edited copy the chosen major arpeggio is loaded');
  await sel.focus();await p.waitForTimeout(400);assert((await sel.locator('optgroup[label^="Saved"] option').allInnerTexts()).some(t=>t.startsWith('Minor · triad sweep ↑ (edited)')),'the edited copy is in the shared library');
  // ---- a plan is active: the same gestures edit the shown plan step ----
  await E("globalThis.__hpp=__xenGetDeferredFn('__xenHoldPatternPlanFactory')();0");
  const origin=JSON.stringify({tuningId:n0.gridTuning,modeId:n0.gridMode,gridBaseHz:n0.gridBase,mainMutedDegrees:n0.manualGridMutedSteps,mainStepOffsets:n0.manualGridStepOffsets});
  const mode=n0.gridMode==='aeolian'?'sweeps-minor':'sweeps-major';
  const plan=JSON.parse(await E('JSON.stringify(__hpp.factoryPlan('+JSON.stringify(mode)+','+origin+'))'));
  await E('__NodalBallGrid.update({keyboardHoldPlan:'+JSON.stringify(plan)+',keyboardHoldPitchCents:Array(24).fill(0),keyboardHoldPatternSteps:'+JSON.stringify(Array(24).fill(1))+',keyboardHoldSegments:24,keyboardHoldReferenceBars:1})');await p.waitForTimeout(400);
  const toggle=panel.getByRole('switch',{name:/Hold Pattern Plan/});assert.equal((await toggle.innerText()).trim(),'Plan ON');
  assert.match(await panel.locator('[data-xen-plan-overrides]').innerText(),/Plan “.*” is ON/,'with the plan ON the lane view says why a loaded arpeggio is not heard on every key');
  await p.evaluate(()=>document.activeElement?.blur());await p.keyboard.down('2');await p.waitForTimeout(300);await p.keyboard.up('2');await p.waitForTimeout(300);
  assert.equal(await panel.getAttribute('data-xen-plan-step'),'','a key attack shows the plan step on the cards');
  const slots=await cards.count(),pos=await p.evaluate(()=>__xenProbe.holdPlan.last.position),before=(await np(p)).keyboardHoldPlan.entries[pos].pattern;
  await cards.nth(3).scrollIntoViewIfNeeded();await p.waitForTimeout(300);/* (a page scroll closes the slider by design) */
  await cards.nth(3).click({button:'right'});await p.waitForTimeout(200);assert.equal(await popup.count(),1,'right-click works on a plan step too');
  const pb2=await popup.boundingBox();await p.mouse.click(pb2.x+pb2.width/2,pb2.y+pb2.height*.7);await p.waitForTimeout(250);await p.keyboard.press('Escape');await p.mouse.click(5,5);await p.waitForTimeout(250);
  const mid=await np(p),after=mid.keyboardHoldPlan.entries[pos];
  assert(after.pattern.pitchCents[3]<before.pitchCents[3]-300,'the pitch of that slot of the PLAN step changed: '+before.pitchCents[3]+' → '+after.pattern.pitchCents[3]);
  assert.match(after.source.name,/ \(edited\)$/,'the step is named as edited, so no stale description stays: '+after.source.name);
  assert.deepEqual(mid.keyboardHoldPitchCents.slice(0,24).filter(Boolean),[],'the lane pattern is untouched');assert.deepEqual(mid.keyboardHoldPatternSteps,Array(24).fill(1));
  await cards.nth(5).click();await p.waitForTimeout(200);assert.notEqual((await np(p)).keyboardHoldPlan.entries[pos].pattern.muteSteps[5],before.muteSteps[5],'left click toggles the slot of the plan step');
  // ---- plan OFF / ON right in the panel ----
  await toggle.click();await p.waitForTimeout(300);let q=await np(p);assert.equal(q.keyboardHoldPlan.enabled,false);assert.equal((await toggle.innerText()).trim(),'Plan OFF','the switch stays visible when the plan is off');
  assert.equal(await panel.locator('[data-xen-plan-overrides]').count(),0);assert.equal(await panel.getAttribute('data-xen-plan-step'),null,'plan off: the cards show the lane arpeggio');
  const hzKey=await p.evaluate(()=>{const prm=__xenProbe.bridge.capture().nParamsUI,t=__xenProbe.holdPlan.gridTable(prm);return t.base*Math.pow(2,t.audible[1].cents/1200)});
  assert.equal(await p.evaluate(hz=>__xenProbe.holdPlan.forHz(__xenProbe.bridge.capture().nParamsUI,hz),hzKey),null,'plan off: the lane arpeggio plays on every key');
  await cards.nth(3).click({button:'right'});await p.waitForTimeout(200);assert.equal(await popup.count(),1,'the lane cards still have their pitch slider');await p.keyboard.press('Escape');await p.mouse.click(5,5);await p.waitForTimeout(200);
  await toggle.click();await p.waitForTimeout(300);q=await np(p);assert.equal(q.keyboardHoldPlan.enabled,true);assert.notEqual(await p.evaluate(hz=>__xenProbe.holdPlan.forHz(__xenProbe.bridge.capture().nParamsUI,hz),hzKey),null,'plan on again: the keys play their step figures');
  assert.match(await p.locator('button.xen-hpm02-open').innerText(),/Plan: /);
  assert.deepEqual(errors,[]);console.log('PASS Hold cards: right-click pitch slider + click on lane and plan step; plan ON/OFF in the panel');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
