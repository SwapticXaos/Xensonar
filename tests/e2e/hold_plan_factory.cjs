'use strict';
// HPP-FACTORY (real app): factory Hold Pattern PLANS. A plan is not one figure on every step: every degree of the key gets its own factory arpeggio
// (its chord / mode / idiom), at shredding speed; the plans are listed in the plan library and load from the Plan view; a key press plays that degree's figure.
// Usage: node tests/e2e/hold_plan_factory.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
const ready=p=>p.waitForFunction(()=>window.__xenProbe&&__xenProbe.bridge.available(),null,{timeout:30000});
const np=p=>p.evaluate(()=>__xenProbe.bridge.capture().nParamsUI);
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1500,height:950}});const p=await ctx.newPage();
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);await ready(p);await p.waitForTimeout(2500);
  const E=code=>p.evaluate(c=>window.__xenProbe.draw.evalInBundle(c),code);
  await E("globalThis.__hpp=__xenGetDeferredFn('__xenHoldPatternPlanFactory')();0");
  const list=JSON.parse(await E('JSON.stringify(__hpp.factoryPlans)'));assert(list.length>=8,'factory plans: '+list.length);
  const ionian={tuningId:'12edo',modeId:'ionian',gridBaseHz:261.63,mainMutedDegrees:[1,3,6,8,10],mainStepOffsets:[]};
  const fp=async id=>JSON.parse(await E('JSON.stringify(__hpp.factoryPlan('+JSON.stringify(id)+','+JSON.stringify(ionian)+'))'));
  const has=(pat,c)=>pat.pitchCents.some((v,i)=>pat.muteSteps[i]===1&&Math.abs(v-c)<2);
  for(const it of list){const pl=await fp(it.id);
   assert.equal(pl.entries.length,7,it.id+': 7 degrees');assert(pl.entries.every(e=>e&&e.source.kind==='factory'),it.id+': every degree has a factory arpeggio');
   assert.deepEqual(pl.entries.map(e=>e.source.name),it.degrees,it.id+': the named arpeggios');
   const distinct=new Set(pl.entries.map(e=>e.source.name)).size;assert(distinct>=3,it.id+': different figures on different degrees ('+distinct+')');
   for(const e of pl.entries)assert(e.pattern.slots/e.pattern.referenceBars>=20-1e-9,it.id+': shredding speed');
   assert.equal(pl.labels.filter(Boolean).length,7,it.id+': every degree labelled');assert.equal(pl.nativeGrid.audible.length,7);
  }
  // diatonic chord qualities of the major key
  const sw=await fp('sweeps-major'),e=i=>sw.entries[i].pattern;
  assert(has(e(0),400)&&!has(e(0),300),'I major');assert(has(e(1),300)&&!has(e(1),400),'ii minor');assert(has(e(3),400),'IV major');assert(has(e(4),1000)&&has(e(4),400),'V dominant 7');assert(has(e(5),300),'vi minor');assert(has(e(6),600)&&has(e(6),300),'vii° half-diminished');
  const br=await fp('baroque-runs');assert.deepEqual(br.entries.map(x=>x.pattern.pitchCents.slice(0,3)),[[0,200,400],[0,200,300],[0,100,300],[0,200,400],[0,200,400],[0,200,300],[0,100,300]],'every degree runs its own mode');
  const mi=await fp('sweeps-minor');assert.equal(mi.nativeGrid.modeId,'aeolian');assert(has(mi.entries[0].pattern,300)&&has(mi.entries[2].pattern,400),'i minor, III major');
  // Real UI: Power, Keyboard-Hold tab, Hold Pattern Studio → Plan → load a factory plan from the list
  await p.getByRole('button',{name:'Power',exact:true}).click();await p.waitForTimeout(800);
  await p.getByText('Keyboard-Hold Pattern').first().click();await p.waitForTimeout(300);
  await p.locator('button.xen-hpm02-open').click();await p.waitForTimeout(300);await p.getByRole('tab',{name:/^Plan/}).click();await p.waitForTimeout(500);
  const sel=p.locator('.xen-hpm02-dialog select[aria-label="Saved plans"]');
  const opts=await sel.locator('optgroup[label^="Factory plans"] option').allInnerTexts();assert(opts.includes('Diatonic sweeps · major key')&&opts.includes('Jazz · minor ii–V–i'),'factory plans listed: '+opts);
  await sel.selectOption({label:'Jazz · sevenths & bebop (major key)'});await p.waitForTimeout(600);
  const n=await np(p),plan=n.keyboardHoldPlan;assert.equal(plan.name,'Jazz · sevenths & bebop (major key)');assert.equal(plan.enabled,true);
  assert.equal(await p.locator('.xen-hpp-step').count(),7);
  const names=await p.locator('.xen-hpp-step .name').allInnerTexts();assert(new Set(names).size>=5,'the ladder shows different arpeggios per degree: '+names);
  // a major-key plan on another room mode shows the deviation; "Restore plan Grid" switches the room to the plan's Grid (never automatically)
  let devText=await p.locator('.xen-hpp-dev').innerText();
  if(/Deviation/.test(devText)){assert.equal((await np(p)).keyboardHoldPlan.nativeGrid.modeId,'ionian');await p.getByRole('button',{name:'Restore plan Grid'}).click();await p.waitForTimeout(500);devText=await p.locator('.xen-hpp-dev').innerText()}
  assert.match(devText,/native Grid|root moved/,'room Grid = plan Grid: '+devText);assert.equal((await np(p)).gridMode,'ionian');
  // the resolver gives each degree its own figure
  const slots=await p.evaluate(()=>{const prm=__xenProbe.bridge.capture().nParamsUI,h=__xenProbe.holdPlan,t=h.gridTable(prm);return t.audible.slice(0,7).map(a=>{const r=h.forHz(prm,t.base*Math.pow(2,a.cents/1200));return r?[r.slots,r.bars,r.pitches.join(' ')]:null})});
  assert(slots.every(Boolean),'every degree resolves to a plan pattern');assert(new Set(slots.map(x=>x[2])).size>=5,'different figures');
  // HPP-LIVEVIEW: close the studio; the Keyboard-Hold tab shows the figure of the degree each key attack plays
  await p.keyboard.press('Escape');await p.waitForTimeout(300);if(await p.locator('.xen-hpm02-dialog').count())await p.locator('.xen-hpm02-dialog button',{hasText:/Close|✕/}).first().click().catch(()=>{});await p.waitForTimeout(300);
  // the played figure is shown on the EXISTING slot cards (red pitch line) and info line; above them only the step numbers. No second graphic.
  const panel=p.locator('.xen-hold-pattern',{has:p.locator('.xen-hpp-steps')});assert.equal(await panel.count(),1,'step numbers in the Keyboard-Hold tab');
  assert.equal(await panel.locator('.xen-hpp-steps>button').count(),8,'"Lane" + one number per degree');
  assert.equal(await p.locator('.xen-hpp-live,.xen-hpp-live-strip,[data-xen-hpp-live]').count(),0,'no separate live box / bar chart');
  const cards=panel.locator('[data-xensonar-shared-segment-pattern-grid] > button');
  await p.evaluate(()=>document.activeElement?.blur());
  const shown=[];
  for(const k of['1','2','3','4']){await p.keyboard.down(k);await p.waitForTimeout(260);
   const pos=await p.evaluate(()=>__xenProbe.holdPlan.last.position),chip=await panel.locator('.xen-hpp-steps>button.on').innerText(),name=await panel.locator('[data-xen-hpp-live-name]').innerText();
   const tops=await cards.evaluateAll(bs=>bs.map(b=>parseFloat(b.querySelector('.xen-hold-pitch-preview')?.style.top)));
   await p.keyboard.up(k);await p.waitForTimeout(120);
   const lp=(await np(p)).keyboardHoldPlan,en=lp.entries[pos%7];assert(pos>=0,'key '+k+' is on the plan Grid');
   assert.equal(chip,lp.labels[pos%7],'lit number = played degree ('+k+')');assert(name.includes(en.source.name),'info line names the arpeggio: '+name);
   assert.equal(tops.length,en.pattern.slots,'the slot cards show the figure of that degree');
   tops.forEach((t,q)=>assert(Math.abs(t-(50-en.pattern.pitchCents[q]/24))<.01,'red pitch line of slot '+(q+1)+' = figure pitch'));
   shown.push(name)}
  assert(new Set(shown).size>=3,'different keys show different figures: '+shown.join(' | '));
  // read-only: a click on a card does not change the plan; "Lane" returns to the editable lane pattern
  const before=JSON.stringify((await np(p)).keyboardHoldPlan);await cards.first().click();await p.waitForTimeout(200);assert.equal(JSON.stringify((await np(p)).keyboardHoldPlan),before,'plan figure cards are read-only');
  await panel.getByRole('button',{name:'Lane',exact:true}).click();await p.waitForTimeout(200);
  const ln=await np(p);assert.equal(await cards.count(),ln.keyboardHoldPatternSteps.length,'Lane shows the lane pattern again');
  await cards.nth(1).click();await p.waitForTimeout(200);assert.notEqual((await np(p)).keyboardHoldPatternSteps[1],ln.keyboardHoldPatternSteps[1],'the lane pattern is editable');await cards.nth(1).click();await p.waitForTimeout(150);
  // touching a lane setting (Slots) while a plan step is shown returns to the lane view
  await panel.locator('.xen-hpp-steps>button').nth(2).click();await p.waitForTimeout(200);assert.equal(await panel.getAttribute('data-xen-plan-step'),'','plan step marked (lane settings dimmed)');
  await panel.locator('select').filter({hasText:'other'}).first().click({force:true}).catch(()=>{});await p.keyboard.press('Escape');await p.waitForTimeout(200);
  assert.equal(await panel.getAttribute('data-xen-plan-step'),null,'lane settings touched: back to the lane view');
  // a number selects a step by hand
  await panel.locator('.xen-hpp-steps>button').nth(3).click();await p.waitForTimeout(200);assert.equal(await cards.count(),(await np(p)).keyboardHoldPlan.entries[2].pattern.slots,'step 3 shown by hand');
  // the view disappears when the plan is switched off
  const pl=(await np(p)).keyboardHoldPlan;await E('__NodalBallGrid.update({keyboardHoldPlan:'+JSON.stringify({...pl,enabled:false})+'})');await p.waitForTimeout(300);assert.equal(await p.locator('.xen-hpp-steps').count(),0,'no step numbers without an active plan');
  assert.deepEqual(errors,[]);console.log('PASS HPP-FACTORY plans: every degree its own fast arpeggio; listed and loaded in the Plan view; HPP-LIVEVIEW shows the played figure');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
