'use strict';
// METER-ANALYSIS-01 (real app, Wave Editor): right click on the Taktometer → Analyze counts the segments of the purple mask from the music
// around it and offers bar readings (5/4 music, 2 bars + 2 counts = 12 segments → "2 × 5 + 2" = 12/5 bars); Apply writes bars/segments/BPM;
// a mask that is off the grid is offered "Correct & apply"; Fit to target cuts Number of Bars × Number of Segments along the music.
// Usage: node tests/e2e/taktometer_meter_analysis.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const {meterMusic,SR}=require('../helpers/meter_synth.cjs'),{wav}=require('../helpers/analysis_synth.cjs');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'xen-meter-'));
const BPM=132,beat=60/BPM,file=path.join(dir,'five_four_132.wav');fs.writeFileSync(file,wav(meterMusic({bpm:BPM,S:5,dur:30}),SR));
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1100}})).newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 await p.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/MATERIAL FORGE/.test(b.innerText)).click());await p.waitForTimeout(2000);
 await p.getByText('Import Audio').first().click();await p.waitForTimeout(2500);
 await p.locator('input[type=file][accept^="audio/"]').setInputFiles(file);const wb=p.getByRole('button',{name:'Wave Editor'}).first();await wb.waitFor({timeout:60000});await p.waitForTimeout(1500);
 await wb.click();await p.waitForSelector('[data-xwe-tonal-analysis]',{timeout:30000});await p.waitForTimeout(800);
 const field=async(label,v)=>{const i=p.locator(`input[aria-label="${label}"]`).first();await i.fill(String(v));await i.dispatchEvent('change');await p.waitForTimeout(300)};
 const menu=p.locator('[data-xwe-meter-menu]'),act=id=>menu.locator(`[data-xwe-meter-action="${id}"]`);
 const open=async()=>{if(await menu.count())return;const m=p.locator('[data-xen-bar-meter]');await m.scrollIntoViewIfNeeded();const bb=await m.boundingBox();await p.mouse.click(bb.x+bb.width*.2,bb.y+bb.height/2,{button:'right'});await menu.waitFor({timeout:5000})};
 const barsValue=()=>menu.locator('input[aria-label="Number of Bars"]').inputValue(),segValue=()=>menu.locator('input[aria-label="Number of Segments"]').inputValue();
 // ---- mask = 2 bars of 5 + 2 counts, from a downbeat (bar 5), 9 ms late and 26 ms too long ----
 const t0=beat*20;await field('End s',(t0+beat*12+.035).toFixed(3));await field('Start s',(t0+.009).toFixed(3));
 await open();assert.match(await menu.innerText(),/Number of Bars/);assert.match(await menu.innerText(),/Target: /);
 await act('analyze').click();await menu.locator('[data-xwe-meter-result]').waitFor({timeout:15000});
 let t=await menu.locator('[data-xwe-meter-result]').innerText();
 assert.match(t,/^12 segments · 13[12]\.\d\d BPM per segment/m,t);
 const first=menu.locator('[data-xwe-meter-reading]').first();assert.equal(await first.getAttribute('data-xwe-meter-reading'),'5',t);assert.match(await first.innerText(),/2 × 5 \+ 2 · 12\/5 bars \(2 2\/5\)/);
 assert.equal(await first.getAttribute('aria-checked'),'true','the most likely reading is preselected');
 assert.ok(await menu.locator('[data-xwe-meter-reading="4"]').count()&&await menu.locator('[data-xwe-meter-reading="3"]').count(),'3 × 4 and 4 × 3 stay on offer');
 assert.equal(await menu.locator('[data-xwe-meter-deviation]').count(),1,'the mask is off the grid: '+t);
 // ---- Correct & apply: exact 12 segments, bars 12/5, segments 5, time truth ----
 await act('correct-apply').click();await p.waitForTimeout(500);
 assert.equal(await barsValue(),'12/5');assert.equal(await segValue(),'5');
 let st=await menu.locator('[role=status]').innerText();assert.match(st,/Mask corrected precisely · 12\/5 bars of 5 · 13[12]\.\d\d BPM/,st);
 const bpmApplied=Number(st.match(/(\d+\.\d+) BPM/)[1]);assert.ok(Math.abs(bpmApplied-BPM)<.6,'BPM '+bpmApplied);
 // the mask now sits on the grid
 await act('analyze').click();await menu.locator('[data-xwe-meter-result]').waitFor();t=await menu.locator('[data-xwe-meter-result]').innerText();
 assert.match(t,/^12 segments/m);assert.equal(await menu.locator('[data-xwe-meter-deviation]').count(),0,'after the correction the mask sits on the grid: '+t);
 // ---- another reading: 3 × 4 → Apply writes bars 3, segments 4 ----
 await menu.locator('[data-xwe-meter-reading="4"]').click();await act('apply').click();await p.waitForTimeout(400);
 assert.equal(await barsValue(),'3');assert.equal(await segValue(),'4');
 // ---- Fit to target: 2 bars of 5 = 10 segments from where the mask starts ----
 const bars=menu.locator('input[aria-label="Number of Bars"]');await bars.fill('2');await bars.press('Enter');await menu.locator('input[aria-label="Number of Segments"]').fill('5');await p.waitForTimeout(300);
 assert.match(await menu.innerText(),/Target: 2 × 5 = 10 segments/);
 await act('fit').click();await p.waitForTimeout(500);st=await menu.locator('[role=status]').innerText();
 const len=Number((st.match(/→ (\d+\.\d+) s = 10 segments/)||[])[1]);assert.match(st,/→ \d+\.\d+ s = 10 segments \(2 × 5\)/,st);assert.ok(Math.abs(len-beat*10)<.006,'length '+len+' vs '+beat*10);
 assert.equal(await barsValue(),'2');assert.equal(await segValue(),'5');
 // ---- the Taktometer has its own Undo (mask + bar settings); Loop korrigieren is untouched by it ----
 await act('undo').click();await p.waitForTimeout(400);assert.equal(await barsValue(),'2');assert.equal(await segValue(),'5');
 assert.match(await menu.locator('[role=status]').innerText(),/Previous mask and bar settings restored/);
 // ---- Loop korrigieren (micro): an 8-segment mask 14 ms early and 31 ms long is put on the grid, Undo restores it ----
 await p.keyboard.press('Escape');await p.waitForTimeout(200);
 const t1=beat*10;await field('Start s',(t1-.014).toFixed(3));await field('End s',(t1+beat*8+.017).toFixed(3));
 const repair=p.locator('.xen-forge-tile-repair').first();await repair.scrollIntoViewIfNeeded();await repair.click();
 await p.waitForFunction(()=>/Loop corrected precisely: 8 segments at 13[12]\.\d\d BPM/.test(document.body.textContent),null,{timeout:15000});
 const msg=await p.evaluate(()=>(document.body.textContent.match(/Loop corrected precisely:[^\n]*/)||[''])[0]);
 const plen=Number((msg.match(/· (\d+\.\d+) s/)||[])[1]);assert.ok(Math.abs(plen-beat*8)<.006,'micro length '+plen+' vs '+beat*8+' · '+msg);
 assert.match(await repair.innerText(),/Undo Loop korrigieren/);await repair.click();await p.waitForTimeout(400);
 assert.match(await p.evaluate(()=>document.body.textContent),/Loop correction reverted/);
 assert.deepEqual(errors,[]);console.log('PASS METER-ANALYSIS-01 5/4 mask → 12 segments = 2 × 5 + 2 (12/5 bars), corrected, re-read, fitted to 2 × 5 = '+len.toFixed(3)+' s, Loop korrigieren micro → '+plen.toFixed(3)+' s + Undo');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
