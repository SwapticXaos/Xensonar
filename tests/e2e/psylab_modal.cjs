'use strict';
// UI-PSYLAB-MODAL-01 (real app, Room V · Psychedelic Lab): Save Sound, Delete Sound and exact parameter values use an INTERNAL XenSonar dialog (portal on document.body),
// never a browser prompt() / confirm(). Escape and the backdrop close it; Enter submits; saving an existing name offers "Overwrite"; keys do not play notes while it is open.
// Usage: node tests/e2e/psylab_modal.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1500,height:1000}})).newPage();const errors=[],native=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('dialog',async d=>{native.push(d.type()+': '+d.message());await d.dismiss()});
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click().catch(()=>{});await p.waitForTimeout(2500);
 await p.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/PSY LAB/.test(b.innerText)).click());await p.waitForSelector('[data-xen-psylab]',{timeout:30000});await p.waitForTimeout(1500);
 const modal=()=>p.locator('[data-psy-modal]');
 // exact value
 const val=p.locator('.xpl-val').first();const before=await val.innerText();await val.click();await p.waitForTimeout(300);
 assert.equal(await modal().getAttribute('data-psy-modal'),'param','exact value opens the internal dialog');assert.equal(await p.locator('body > .xpl-modal-back').count(),1,'portal on document.body');
 await p.keyboard.press('Escape');await p.waitForTimeout(250);assert.equal(await modal().count(),0,'Escape closes');
 await val.click();await p.waitForTimeout(250);await p.locator('.xpl-modal-input').fill('abc');await p.keyboard.press('Enter');await p.waitForTimeout(200);assert(await p.locator('.xpl-modal-warn[role=alert]').count(),'invalid number is explained, dialog stays');
 await p.locator('.xpl-modal-input').fill('0,5');await p.keyboard.press('Enter');await p.waitForTimeout(300);assert.equal(await modal().count(),0,'a valid value (comma allowed) applies and closes');
 const after=await val.innerText();assert.notEqual(after,before,'the value changed: '+before+' → '+after);
 // save
 await p.getByRole('button',{name:/^Save/}).first().click();await p.waitForTimeout(300);assert.equal(await modal().getAttribute('data-psy-modal'),'save');
 await p.keyboard.press('a');/* typing goes into the dialog, not the instrument */
 await p.locator('.xpl-modal-input').fill('Modal Test Sound');await p.keyboard.press('Enter');await p.waitForTimeout(400);assert.equal(await modal().count(),0);
 assert(/Saved “Modal Test Sound”/.test(await p.locator('.xpl-status').innerText()),'status says saved: '+await p.locator('.xpl-status').innerText());
 // overwrite offer
 await p.getByRole('button',{name:/^Save/}).first().click();await p.waitForTimeout(300);await p.locator('.xpl-modal-input').fill('Modal Test Sound');await p.waitForTimeout(150);
 assert(/already exists/.test(await p.locator('.xpl-modal-warn').innerText()),'existing name is announced');assert.equal((await p.locator('.xpl-modal-btn.is-primary').innerText()).trim(),'Overwrite Sound');
 await p.mouse.click(5,5);await p.waitForTimeout(250);assert.equal(await modal().count(),0,'a click on the backdrop closes');
 // delete
 const del=p.getByRole('button',{name:/^Delete/}).first();await del.click();await p.waitForTimeout(300);assert.equal(await modal().getAttribute('data-psy-modal'),'delete');
 await p.locator('.xpl-modal-btn.is-danger').click();await p.waitForTimeout(300);assert(/Deleted “Modal Test Sound”/.test(await p.locator('.xpl-status').innerText()));
 assert.deepEqual(native,[],'no native browser dialog appeared');assert.deepEqual(errors,[]);
 console.log('PASS UI-PSYLAB-MODAL-01 · exact value (invalid → message, comma ok), save, overwrite offer, backdrop / Escape, delete · no native popup');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
