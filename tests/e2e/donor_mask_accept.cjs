'use strict';
// DONOR-MASK-01 (real app, Spectral Forge): the donor is whatever lies in the purple mask of the Sound Material editor, wherever the audio came from.
//  1. a Carrier sent to the Wave Editor (Send to Editor) and then used as donor for a new request: accepted
//  2. the purple mask has no usable length (0): the beginning of the source is used instead of the refusal "Please select a donor mask below ..."
//  3. the request falls into the gap in which the panel has dropped and not yet re-registered its resolver: it is asked again, not refused
// Usage: node tests/e2e/donor_mask_accept.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(4000);
 const clkX=t=>p.evaluate(t=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&(n(b.innerText)===t||n(b.innerText).endsWith(' '+t)));if(b){b.click();return true}return false},t);
 const clkS=t=>p.evaluate(t=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&n(b.innerText).startsWith(t));if(b){b.scrollIntoView();b.click()}return !!b},t);
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 await clkX('MATERIAL FORGE');await p.waitForTimeout(3000);await clkS('SPECTRALFORGE');await p.waitForTimeout(4000);
 const cv=p.locator('[data-forge-carrier-canvas]');await cv.scrollIntoViewIfNeeded();const bb=await cv.boundingBox();
 for(let k=0;k<3;k++){await p.mouse.move(bb.x+bb.width*.1,bb.y+bb.height*(.3+k*.15));await p.mouse.down();for(let i=1;i<=40;i++)await p.mouse.move(bb.x+bb.width*(.1+.8*i/40),bb.y+bb.height*(.3+k*.15+.08*Math.sin(i/5)),{steps:1});await p.mouse.up()}
 await p.waitForTimeout(1500);
 await p.locator('[data-forge-send-to-editor]').first().scrollIntoViewIfNeeded();await p.locator('[data-forge-send-to-editor]').first().click();
 for(let i=0;i<90;i++){await p.waitForTimeout(1000);if(!JSON.parse(await E('JSON.stringify(__ForgeNavigatorSample.snapshot())')).busy)break}
 const msg=await E('__ForgeNavigatorSample.snapshot().message');assert(/Sent to Editor/.test(msg),'the figure arrived in the editor: '+msg);
 const ask=()=>E("(async()=>{try{await __f3562EnsureDonor();return 'OK '+Vt.selectDonor()}catch(e){return 'ERR '+e.message}})()");
 const clean=async()=>{await E('Vt.invalidateInput();1');await p.waitForTimeout(300)};
 // 1) plain
 await clean();assert.equal(await ask(),'OK true','a Carrier sent to the editor is accepted as donor');
 // 2) mask without length: the intake's selection holds a zero-length fine range
 await E("(()=>{const w=globalThis.__XenWaveUIW01;const ed=[...document.querySelectorAll('[data-material-intake-gateway] canvas')].map(n=>w.getEditor(n)).filter(Boolean).find(e=>e.doc);ed.options.onSelection({fineLoopRange:{startSec:0,durationSec:0},detailViewport:{startSec:0,durationSec:4}});return 1})()");
 await p.waitForTimeout(600);await clean();
 let zero=await ask();if(!/true/.test(zero)){await p.waitForTimeout(1500);zero=await ask()}
 // 3) the resolver is not registered at the moment of the request: the first dispatch is swallowed, the second one is answered
 await clean();
 await E("(()=>{const o=window.dispatchEvent.bind(window);let swallowed=false;window.dispatchEvent=function(ev){if(!swallowed&&ev&&ev.type==='xensonar:forge:resolve-last-donor'){swallowed=true;return true}return o(ev)};globalThis.__restoreDispatch=()=>{window.dispatchEvent=o};return 1})()");
 const gap=await ask();await E('__restoreDispatch();1');
 assert.equal(gap,'OK true','a request in the re-registration gap is asked again, not refused: '+gap);
 assert.deepEqual(errs,[]);
 console.log('donor_mask_accept OK');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
