'use strict';
// GRID-MODES-01 (real app): modes in the Grid Workbench.
//  - the Modes tab shows the cycle slots, the library (incl. "Chromatic 12 (projected)") and the projection view
//  - on 31-EDO: Chromatic opens 31 steps, Chromatic 12 opens 12 (the 12 semitones projected), Ionian 7
//  - "Save current pattern as mode": the open steps become a mode in cents; it projects onto 12-EDO and 31-EDO
//  - the cycle order is editable (↑) and AltGr / right Ctrl walk exactly that order (Chromatic left out); a mode outside it steps to slot 1
// Usage: node tests/e2e/grid_modes_workbench.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1600,height:1000}})).newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click().catch(()=>{});await p.waitForTimeout(2500);
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 const state=async()=>JSON.parse(await E(`(()=>{const g=__NodalBallGrid.params();const mask=Au(g.gridMode,g.gridTuning);return JSON.stringify({tuning:g.gridTuning,mode:g.gridMode,open:mask.filter(Boolean).length,steps:mask.length})})()`));
 const setT=async id=>{await E(`__NodalBallGrid.changeTuning(${JSON.stringify(id)});'ok'`);await p.waitForTimeout(500)};
 const setM=async id=>{await E(`__NodalBallGrid.changeMode(${JSON.stringify(id)});'ok'`);await p.waitForTimeout(400)};
 // projection counts on 31-EDO
 await setT('31edo');await setM('chromatic');let s=await state();assert.equal(s.tuning,'31edo');assert.equal(s.open,31,'Chromatic opens every step');
 await setM('chromatic_12');s=await state();assert.equal(s.open,12,'Chromatic 12 opens the 12 projected semitones: '+JSON.stringify(s));
 await setM('ionian');s=await state();assert.equal(s.open,7);
 // the workbench, Modes tab
 await E(`globalThis.__XenOpenGridWorkbench();'ok'`);await p.waitForTimeout(800);await p.locator('[data-xen-wb-tab="modes"]').click();await p.waitForTimeout(500);
 assert(await p.locator('[data-xen-mode-workbench]').count(),'Modes tab open');
 assert(await p.locator('[data-xen-mode-entry="chromatic_12"]').count(),'library offers Chromatic 12');
 const proj=await p.locator('[data-xen-mode-projection]').innerText();assert(/7 mode positions → 7 of 31 grid steps/.test(proj),'projection of Ionian on 31-EDO: '+proj.slice(0,160));
 // save the current pattern (Ionian on 31-EDO) as an own mode, then project it onto 12-EDO
 await p.getByLabel('Name of the new mode').fill('Test Ionian 31');await p.locator('[data-xen-mode-save]').click();await p.waitForTimeout(500);
 const user=await E(`JSON.stringify(__xenModeStore.userModes().map(m=>({v:m.value,l:m.label,n:m.cents.length})))`);const um=JSON.parse(user).find(m=>m.l==='Test Ionian 31');
 assert(um&&um.n===7,'own mode stored with 7 positions: '+user);assert(await p.locator(`[data-xen-mode-entry="${um.v}"]`).count(),'own mode in the library');
 await setT('12edo');await setM(um.v);s=await state();assert.equal(s.mode,um.v,'own mode accepted on 12-EDO');assert.equal(s.open,7,'own mode projected onto 12-EDO: '+JSON.stringify(s));
 const mask12=JSON.parse(await E(`JSON.stringify(Au(${JSON.stringify(um.v)},'12edo').map(Number))`));assert.deepEqual(mask12,[1,0,1,0,1,1,0,1,0,1,0,1],'= Ionian on 12-EDO');
 // cycle order: [ionian, own, chromatic_12]; move chromatic_12 up with ↑ → [ionian, chromatic_12, own]
 await E(`__xenModeStore.setRack(['ionian',${JSON.stringify(um.v)},'chromatic_12']);'ok'`);await p.waitForTimeout(400);
 await p.locator('[data-xen-mode-slot="chromatic_12"] button[aria-label^="Move"][aria-label$="up"]').click();await p.waitForTimeout(400);
 const rack=JSON.parse(await E(`JSON.stringify(__xenModeStore.rack())`));assert.deepEqual(rack,['ionian','chromatic_12',um.v],'↑ reorders the cycle');
 await p.keyboard.press('Escape').catch(()=>{});await E(`document.activeElement&&document.activeElement.blur&&document.activeElement.blur();'ok'`);
 await E(`globalThis.__XenOpenGridWorkbench&&0;'ok'`);
 // close the workbench (×) and cycle with AltGr / right Ctrl on 31-EDO
 await p.locator('button',{hasText:'×'}).first().click().catch(()=>{});await p.waitForTimeout(400);
 await setT('31edo');await setM('dorian');/* outside the cycle: AltGr steps to slot 1 */
 const walk=[];const key=async code=>{await p.keyboard.press(code==='alt'?'AltGraph':'ControlRight');await p.waitForTimeout(350);walk.push((await state()).mode)};
 await p.mouse.click(5,300);for(let k=0;k<4;k++)await key('alt');await key('ctrl');
 assert.deepEqual(walk,['ionian','chromatic_12',um.v,'ionian',um.v],'AltGr walks the cycle order, right Ctrl back: '+walk.join(' → '));
 assert(!walk.includes('chromatic'),'Chromatic is not in the walk');
 if(errors.length)console.log('pageerrors',errors.slice(0,3));assert.deepEqual(errors,[]);
 console.log('PASS GRID-MODES-01 · 31-EDO: chromatic 31 / chromatic_12 12 / ionian 7 · own mode 7 positions → 12-EDO Ionian · cycle '+walk.join(' → '));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
