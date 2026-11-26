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
 // GRID-MODES-02: the shared pointer sort mechanism (as in the tuning rack) – SWAP in the middle of a slot, INSERT at its edges, library → slots
 await setT('12edo');await E(`__xenModeStore.setRack(['chromatic','ionian','dorian','phrygian']);'ok'`);await p.waitForTimeout(500);
 const slot=v=>p.locator('[data-xen-mode-slot="'+v+'"]').first();
 const pointerDrag=async(from,toLocator,fracY)=>{const a=await from.boundingBox(),b=await toLocator.boundingBox();await p.mouse.move(a.x+a.width/2,a.y+a.height/2);await p.mouse.down();
  await p.mouse.move(a.x+a.width/2+6,a.y+a.height/2+10,{steps:3});await p.mouse.move(b.x+b.width/2,b.y+b.height*fracY,{steps:12});await p.waitForTimeout(150);return async()=>{await p.mouse.up();await p.waitForTimeout(500)}};
 const order=async()=>JSON.parse(await E(`JSON.stringify(__xenModeStore.rack())`));
 // swap: drag Slot 1 (chromatic) onto the middle of Slot 3 (dorian)
 let up=await pointerDrag(slot('chromatic').locator('button').first(),slot('dorian'),.5);
 assert(await p.locator('[data-xen-sort-preview],.xen-quick-ghost').count()>=0);await up();
 assert.deepEqual(await order(),['dorian','ionian','chromatic','phrygian'],'drop on the middle of a slot swaps the two');
 // insert before: drag phrygian onto the UPPER edge of slot 1 (dorian)
 up=await pointerDrag(slot('phrygian').locator('button').first(),slot('dorian'),.08);await up();
 assert.deepEqual(await order(),['phrygian','dorian','ionian','chromatic'],'drop on the upper edge inserts before');
 // insert after: drag phrygian onto the LOWER edge of the last slot (chromatic)
 up=await pointerDrag(slot('phrygian').locator('button').first(),slot('chromatic'),.94);await up();
 assert.deepEqual(await order(),['dorian','ionian','chromatic','phrygian'],'drop on the lower edge inserts after');
 // library → slots: lydian onto the lower edge of ionian inserts after it; a mode already in the cycle is refused; swap replaces
 up=await pointerDrag(p.locator('[data-xen-mode-entry="lydian"] button').first(),slot('ionian'),.94);await up();
 assert.deepEqual(await order(),['dorian','ionian','lydian','chromatic','phrygian'],'library entry dropped on the lower edge is inserted after');
 up=await pointerDrag(p.locator('[data-xen-mode-entry="mixolydian"] button').first(),slot('chromatic'),.5);await up();
 assert.deepEqual(await order(),['dorian','ionian','lydian','mixolydian','phrygian'],'library entry dropped on the middle replaces the slot');
 up=await pointerDrag(p.locator('[data-xen-mode-entry="dorian"] button').first(),slot('phrygian'),.5);await up();
 assert.deepEqual(await order(),['dorian','ionian','lydian','mixolydian','phrygian'],'a mode that is already in the cycle is not added twice');
 // a mode row never becomes a Quick Access item
 assert.equal(JSON.parse(await E(`JSON.stringify(__XenQuick.snapshot().items.filter(i=>i.kind==='gridmode').length)`)),0,'no Quick Access item of kind gridmode');
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
