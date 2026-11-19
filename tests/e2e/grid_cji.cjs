'use strict';
// GRID-CJI-01 (real app): start from the Just Intonation grid, add complex ratios in the Period Workbench → the draft is a CJI (custom JI),
// the marker rack shows fractions instead of cents, Save stores family cji + the fractions, the library lists it as CJI, it survives a reload
// and re-opens with its fractions; a cents-only step turns it back into a CDO; Scala export writes the ratios.
// Usage: node tests/e2e/grid_cji.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');const fs=require('node:fs');const os=require('node:os');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1600,height:900},acceptDownloads:true});const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);await p.waitForTimeout(3500);
  const open=async()=>{await p.locator('[title^="Click: Open Grid Workbench"]').first().click();await p.waitForSelector('[data-xen-ratio-input]',{timeout:15000});await p.waitForTimeout(300)};
  const menu=p.locator('[data-xen-header-menu="grid"]'),input=p.locator('[data-xen-ratio-input]');
  const markers=()=>p.locator('[aria-label^="Tune marker"]').evaluateAll(els=>els.map(e=>e.getAttribute('aria-label')));
  const title=()=>p.locator('label:has-text("Speichertitel") input').inputValue();
  const lib=()=>p.evaluate(()=>window.__xenProbe.draw.evalInBundle('JSON.stringify(FJ().map(t=>({label:t.label,family:t.family,kind:t.divisionKind,steps:t.stepCents,ratios:t.stepRatios||null})))')).then(JSON.parse);
  await open();
  // pick the built-in Just Intonation grid in the library: unmodified, it is already all ratios
  await menu.locator('button',{hasText:/^Just Intonation/}).first().click();await p.waitForTimeout(400);
  assert.equal(await title(),'12 CJI','the unmodified JI grid is already a custom JI draft');
  // add two complex ratios
  await input.fill('81/64');await input.press('Enter');await p.waitForTimeout(250);await input.fill('1001/1000');await input.press('Enter');await p.waitForTimeout(250);await input.fill('45/32');await input.press('Enter');await p.waitForTimeout(250);
  assert.match(await title(),/^15 CJI$/,'name says CJI, not CDO: '+await title());
  const m=await markers();assert.ok(m.some(x=>/ · 81\/64 · 407\.8c$/.test(x)),'marker aria carries ratio and cents: '+JSON.stringify(m));
  const txt=await menu.innerText();assert.match(txt,/\n\d+ \(9\/8\)\n/,'rack label shows the fraction instead of cents');assert.match(txt,/15 Schritte\n15 CJI/,'classification line says CJI');
  await p.locator('button',{hasText:/^Save$/}).click();await p.waitForTimeout(600);
  let l=await lib();let e=l.find(t=>t.label==='15 CJI');assert.ok(e,'saved: '+JSON.stringify(l.map(t=>t.label)));assert.equal(e.family,'cji');assert.equal(e.kind,'ratio');assert.equal(e.steps.length,15);
  assert.equal(e.ratios['407.8'],'81/64');assert.equal(e.ratios['1.7'],'1001/1000');assert.equal(e.ratios['203.9'],'9/8');assert.equal(e.ratios['551.3'],'11/8');assert.equal(Object.keys(e.ratios).length,14,'every step but the root has a fraction');
  assert.match(await menu.innerText(),/15 CJI[\s\S]{0,40}CJI · Octave · 15 Schritte/,'library line says CJI');
  // reload: kept, and opening it again shows fractions
  await p.reload();await p.waitForTimeout(3500);l=await lib();e=l.find(t=>t.label==='15 CJI');assert.ok(e&&e.ratios&&e.ratios['407.8']==='81/64','kept after reload');
  await open();await menu.locator('button',{hasText:/^15 CJI/}).first().click();await p.waitForTimeout(400);
  assert.match(await menu.innerText(),/\n\d+ \(9\/8\)\n/,'fractions are back after re-opening');
  // library package (archive) round trip: fractions and family survive export -> import mapping, and the content hash lets the same grid be recognised (no duplicate)
  const arch=await p.evaluate(()=>window.__xenProbe.draw.evalInBundle(`(()=>{const exp=JSON.parse(JSON.stringify(H6({selectedTuning:null,activeRack:[],customTunings:FJ()})));const pay=V6(exp);const g=pay.customTunings.find(t=>t.label==='15 CJI');const y=Yoe(g,'custom:zz','copy');const r=Q6({payload:pay,mode:'append',fallbackCurrentTuning:'12edo'});return JSON.stringify({fam:g.family,kind:g.divisionKind,ratio:g.stepRatios&&g.stepRatios['407.8'],y:{fam:y.family,kind:y.divisionKind,r:y.stepRatios&&y.stepRatios['407.8']},imported:r.importedCount})})()`)).then(JSON.parse);
  assert.deepEqual(arch,{fam:'cji',kind:'ratio',ratio:'81/64',y:{fam:'cji',kind:'ratio',r:'81/64'},imported:0},'archive keeps the CJI; re-importing the same grid adds no duplicate: '+JSON.stringify(arch));
  // Scala export of the saved grid carries the ratios
  const [dl]=await Promise.all([p.waitForEvent('download'),p.locator('[data-xen-scala-export]').click()]);const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'xen-cji-')),dl.suggestedFilename());await dl.saveAs(out);
  const scl=fs.readFileSync(out,'utf8');assert.match(scl,/\n 81\/64\n/);assert.match(scl,/\n 1001\/1000\n/);assert.match(scl,/\n 2\/1\n$/);
  // a cents-only step makes it a custom division again; the ratios of the other steps stay
  await p.locator('[aria-label^="Tune marker 3"]').click();await p.waitForTimeout(150);
  await p.locator('label:has-text("Set Cents for Marker") input').fill('1234.5');await p.locator('label:has-text("Set Cents for Marker") input').blur();await p.waitForTimeout(250);
  assert.ok(!/ CJI\b/.test(await title()),'name leaves CJI once a step is not a ratio: '+await title());
  assert.deepEqual(errors,[]);console.log('PASS GRID-CJI-01 JI + complex ratios = CJI, fractions shown/saved/reloaded/exported, cents step turns it back');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
