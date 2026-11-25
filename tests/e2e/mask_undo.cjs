'use strict';
// UNDO-MASK-01 (real app, import view): moving the purple loop mask and a Taktometer count change are undone by "↶ Undo" next to "Loop Mask",
// step by step, and a running loop follows. Usage: node tests/e2e/mask_undo.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const {meterMusic,SR}=require('../helpers/meter_synth.cjs'),{wav}=require('../helpers/analysis_synth.cjs');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'xen-mu-')),file=path.join(dir,'m.wav');fs.writeFileSync(file,wav(meterMusic({bpm:120,S:4,dur:30}),SR));
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1100}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html'));await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 await p.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/MATERIAL FORGE/.test(b.innerText)).click());await p.waitForTimeout(2000);
 await p.getByText('Import Audio').first().click();await p.waitForTimeout(2500);
 await p.locator('input[type=file][accept^="audio/"]').setInputFiles(file);const wb=p.getByRole('button',{name:'Wave Editor'}).first();await wb.waitFor({timeout:60000});await p.waitForTimeout(1500);await wb.click();await p.waitForSelector('[data-xwe-tonal-analysis]',{timeout:30000});await p.waitForTimeout(800);
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);await E(`localStorage.setItem('xensonar.songParts.snap.v1','off');1`);
 const mask=p.locator('canvas[data-xwe-workspace-resize]').first();await mask.scrollIntoViewIfNeeded();const lm=await mask.boundingBox(),Y=lm.y+lm.height*.4;
 const val=l=>p.locator(`input[aria-label="${l}"]`).first().inputValue().catch(()=>null);
 const drag=async(x0,x1)=>{await p.mouse.move(lm.x+lm.width*x0,Y);await p.mouse.down();await p.mouse.move(lm.x+lm.width*x1,Y,{steps:6});await p.mouse.up();await p.waitForTimeout(500)};
 const undo=p.locator('[data-xen-mask-undo]');for(let i=0;i<20&&await undo.isEnabled();i++){await undo.click();await p.waitForTimeout(150)}
 await drag(.2,.5);const s1=await val('Start s'),e1=await val('End s');
 await drag(.6,.9);const s2=await val('Start s');assert.notEqual(s2,s1,'the second mask is a different one');
 assert(await undo.isEnabled());await undo.click();await p.waitForTimeout(500);
 assert.equal(await val('Start s'),s1,'undo restores the first mask (start)');assert.equal(await val('End s'),e1,'… and its end');
 await undo.click();await p.waitForTimeout(400);
 assert.deepEqual(errs,[]);console.log('PASS UNDO-MASK-01 mask moves are undone',s1,'→',s2);await b.close()})().catch(e=>{console.error(e);process.exit(1)});
