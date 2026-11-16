'use strict';
// WAVE-LOOP-01 (real app): the Wave Editor header has '▶ Loop' between Play and Close; it drives the same Preview Loop as the big PLAY below (which shows Stop meanwhile). Usage: node tests/e2e/wave_loop_button.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
const header=t=>p.evaluate(t=>{[...document.querySelectorAll('header button')].find(b=>new RegExp(t).test(b.innerText.trim())).click()},t);
await header('^Rec$');await p.waitForTimeout(800);await p.keyboard.down('KeyA');await p.waitForTimeout(5000);await p.keyboard.up('KeyA');await p.waitForTimeout(300);await header('Enough');await p.waitForTimeout(2500);
await p.locator('[data-xen-send-wave-editor]').click();
await p.waitForFunction(()=>{const x=globalThis.__XenWaveUIW01;return !!x&&[...document.querySelectorAll('canvas')].some(c=>{try{return x.getEditor(c)?.doc?.frames>0}catch{return false}})},null,{timeout:60000});await p.waitForTimeout(1500);
const lb=p.getByRole('button',{name:'Loop Audio'});assert.equal(await lb.count(),1);
const order=await p.evaluate(()=>[...document.querySelector('[aria-label="Loop Audio"]').parentElement.children].map(b=>b.innerText.trim()));assert.deepEqual(order.slice(-3),['▶ Play','▶ Loop','Close ×']);
const big=()=>p.evaluate(()=>document.querySelector('.xen-forge-giant-play')?.innerText.replace(/\s+/g,' '));
assert.equal(await big(),'PLAY');
await lb.click();await p.waitForTimeout(1500);assert.equal((await lb.innerText()).trim(),'■ Stop');assert.equal(await big(),'Stop','the big PLAY is the same loop');
await lb.click();await p.waitForTimeout(1200);assert.equal((await lb.innerText()).trim(),'▶ Loop');assert.equal(await big(),'PLAY');
assert.deepEqual(errs,[]);console.log('PASS WAVE-LOOP-01 Loop button between Play and Close drives the existing Preview Loop');await b.close()})().catch(e=>{console.error(e);process.exit(1)});
