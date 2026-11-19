'use strict';
// KEY-PHANTOM-01 (real app, Live Room): a modifier the OS reports as active without the key being pressed here
// (Sticky Keys latch/lock, or a modifier stuck in the OS) is made visible; a real hold is not reported.
//  1. Backspace arrives with Alt active but no Alt keydown was ever seen -> candidate logged, no note yet
//     (the Octave hold still works: it ignores modifiers, which is why Backspace "works here but not elsewhere")
//  2. a second key with the same phantom Alt -> a visible note names Alt and says to press it once
//  3. a fresh Alt press -> logged "released by pressing it", the note says so, no candidate left
//  4. negative: Alt really pressed (keydown seen), then Backspace with Alt -> nothing logged, no note
//  5. negative: Alt held from before the focus (keyup without keydown) -> logged "was really held", no stuck note
// Usage: node tests/e2e/key_phantom_modifier.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1440,height:1000}});const p=await ctx.newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 const cdp=await ctx.newCDPSession(p);const ALT=1;
 const key=(type,code,keyName,modifiers=0,vk=0)=>cdp.send('Input.dispatchKeyEvent',{type,code,key:keyName,modifiers,windowsVirtualKeyCode:vk});
 const tap=async(code,keyName,modifiers,vk)=>{await key('rawKeyDown',code,keyName,modifiers,vk);await key('keyUp',code,keyName,modifiers,vk);await p.waitForTimeout(80)};
 const diag=()=>p.evaluate(()=>globalThis.__XenKeyCheck.diagnostics());
 const noteText=()=>p.evaluate(()=>document.querySelector('[data-xen-key-phantom]')?.textContent||'');
 const holds=()=>p.evaluate(()=>globalThis.__XenLiveHolds.snapshot());
 const reset=async()=>{await p.evaluate(()=>{window.dispatchEvent(new Event('blur'));document.querySelector('[data-xen-key-phantom]')?.remove()});await p.waitForTimeout(120)};
 const cv=await p.locator('canvas[data-xen-play-area]').boundingBox();await p.mouse.move(cv.x+cv.width*.5,cv.y+cv.height*.5);
 // 1
 await key('rawKeyDown','Backspace','Backspace',ALT,8);await p.waitForTimeout(120);
 assert.equal((await holds()).octave,true,'the Octave hold works even with a phantom Alt (it ignores modifiers)');
 await key('keyUp','Backspace','Backspace',ALT,8);await p.waitForTimeout(80);
 let d=await diag();assert.deepEqual(d.candidates,['Alt'],'phantom Alt is a candidate after one key');
 assert.equal(d.phantom.at(-1).how,'active, not pressed');assert.equal(d.phantom.at(-1).key,'Backspace');
 assert.equal(await noteText(),'','one key alone shows no note yet');
 // 2
 await tap('KeyX','x',ALT,88);
 assert.match(await noteText(),/reports Alt as held.*Press Alt once/,'second key with phantom Alt shows the note');
 // 3
 await key('rawKeyDown','AltLeft','Alt',ALT,18);await p.waitForTimeout(80);await key('keyUp','AltLeft','Alt',0,18);await p.waitForTimeout(80);
 d=await diag();assert.equal(d.phantom.at(-1).how,'released by pressing it');assert.deepEqual(d.candidates,[]);
 assert.match(await noteText(),/without the key being pressed.*released it/,'the note says the Alt press released it');
 await tap('KeyX','x',0,88);
 // 4
 await reset();const n4=(await diag()).phantom.length;
 await key('rawKeyDown','AltLeft','Alt',ALT,18);await p.waitForTimeout(80);
 await tap('Backspace','Backspace',ALT,8);await tap('KeyX','x',ALT,88);
 await key('keyUp','AltLeft','Alt',0,18);await p.waitForTimeout(80);
 d=await diag();assert.equal(d.phantom.length,n4,'a really pressed Alt is no phantom');assert.equal(await noteText(),'','no note for a real Alt hold');
 // 5
 await reset();
 await tap('Backspace','Backspace',ALT,8);await tap('KeyX','x',ALT,88);
 assert.match(await noteText(),/reports Alt as held/);
 await key('keyUp','AltLeft','Alt',0,18);await p.waitForTimeout(80);
 d=await diag();assert.equal(d.phantom.at(-1).how,'was really held');assert.deepEqual(d.candidates,[]);
 assert.match(await noteText(),/really held, all fine/,'a keyup without keydown withdraws the note');
 assert.equal((await holds()).damp,false,'no Damp hold left');
 assert.deepEqual(errors,[]);console.log('PASS KEY-PHANTOM-01: phantom Alt (never pressed here) logged and shown after two keys, released by an Alt press; real holds not reported');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
