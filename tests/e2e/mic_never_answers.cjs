'use strict';
// MIC-WAIT-01 (real app): a browser that never answers the microphone request (Opera GX with a silent block) is no dead end: while waiting the
// Mic/Line-In menu still offers Speaker Sound, and after 10 s the wait ends with a message. Usage: node tests/e2e/mic_never_answers.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1440,height:1000}});
 await ctx.addInitScript(()=>{const md=navigator.mediaDevices;if(md)md.getUserMedia=()=>new Promise(()=>{})});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 await p.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/MATERIAL FORGE/.test(b.innerText)).click());await p.waitForTimeout(2000);
 await p.getByText('Import Audio').first().click();await p.waitForTimeout(2500);
 const box=p.locator('.xen-rack-microphone'),mic=box.locator('button').first();await mic.scrollIntoViewIfNeeded();
 await mic.click();await p.locator('[data-forge-mic-menu] [role=menuitem]').first().click();await p.waitForTimeout(500);
 assert.equal(await box.getAttribute('data-forge-microphone'),'requesting');
 assert.equal(await p.locator('[data-forge-rack-import-audio]').first().isDisabled(),false,'a pending question does not lock Import Audio');
 await mic.click();const items=p.locator('[data-forge-mic-menu] [role=menuitem]');assert.equal(await items.count(),2,'the menu opens while the browser does not answer');
 await items.nth(1).click();await p.locator('[data-forge-linein-panel]').waitFor({timeout:3000});assert.equal(await box.getAttribute('data-forge-microphone'),'idle','Speaker Sound cancels the hanging request');
 await p.locator('.f38-linein-close').click();await mic.click();await p.locator('[data-forge-mic-menu] [role=menuitem]').first().click();await p.waitForTimeout(10600);
 assert.equal(await box.getAttribute('data-forge-microphone'),'failed','the wait ends after 10 s');await mic.click();
 assert.match(await p.locator('[data-forge-mic-error]').innerText(),/did not answer/);assert.equal(await p.locator('[data-forge-mic-menu] [role=menuitem]').count(),2);
 assert.deepEqual(errs,[]);console.log('PASS MIC-WAIT-01 no dead end when the browser never answers');await b.close()})().catch(e=>{console.error(e);process.exit(1)});
