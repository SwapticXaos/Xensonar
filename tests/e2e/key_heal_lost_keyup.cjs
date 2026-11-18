'use strict';
// KEY-HEAL-01 (real app, Live Room): a lost key release never leaves a hold on.
//  1. left Alt held (trusted, via DevTools input) switches the Damp hold on
//  2. the release is lost (the OS / window manager swallowed it); the next trusted key or pointer event carries the OS view
//     "Alt is not down" -> XenSonar replays the lost keyup: the Damp hold goes off
//  3. negative: while Alt IS still down, other keys and mouse moves keep the hold on; a normal release ends it as before
//  4. Backspace (Octave hold) and the other holds are released when the window loses focus (blur), as before
// Usage: node tests/e2e/key_heal_lost_keyup.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1440,height:1000}});const p=await ctx.newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 const cdp=await ctx.newCDPSession(p);const ALT=1;
 const key=(type,code,keyName,modifiers=0,vk=0)=>cdp.send('Input.dispatchKeyEvent',{type,code,key:keyName,modifiers,windowsVirtualKeyCode:vk});
 const move=(x,y,modifiers=0)=>cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y,modifiers});
 const holds=()=>p.evaluate(()=>globalThis.__XenLiveHolds.snapshot());
 const cv=await p.locator('canvas[data-xen-play-area]').boundingBox();const cx=cv.x+cv.width*.5,cy=cv.y+cv.height*.5;
 await move(cx,cy);
 // 1 + 3: Alt down -> Damp on; other key and moves WITH Alt down keep it
 await key('rawKeyDown','AltLeft','Alt',ALT,18);await p.waitForTimeout(150);
 assert.equal((await holds()).damp,true,'left Alt switches the Damp hold on');
 await move(cx+20,cy,ALT);await move(cx+40,cy,ALT);await key('rawKeyDown','KeyX','x',ALT,88);await key('keyUp','KeyX','x',ALT,88);await p.waitForTimeout(150);
 assert.equal((await holds()).damp,true,'while Alt is really down, other input keeps the hold');
 // normal release
 await key('keyUp','AltLeft','Alt',0,18);await p.waitForTimeout(150);assert.equal((await holds()).damp,false,'a normal release ends the hold');
 // 2: lost release, healed by a mouse move
 await key('rawKeyDown','AltLeft','Alt',ALT,18);await p.waitForTimeout(150);assert.equal((await holds()).damp,true);
 await move(cx+60,cy,0);await p.waitForTimeout(150);
 assert.equal((await holds()).damp,false,'lost Alt release: the next mouse move without Alt ends the Damp hold');
 // 2b: lost release, healed by a key event
 await key('rawKeyDown','AltLeft','Alt',ALT,18);await p.waitForTimeout(150);assert.equal((await holds()).damp,true);
 await key('rawKeyDown','KeyX','x',0,88);await key('keyUp','KeyX','x',0,88);await p.waitForTimeout(150);
 assert.equal((await holds()).damp,false,'lost Alt release: the next key without Alt ends the Damp hold');
 // 4: Backspace held, window loses focus -> Octave hold off
 await key('rawKeyDown','Backspace','Backspace',0,8);await p.waitForTimeout(150);assert.equal((await holds()).octave,true,'Backspace switches the Octave hold on');
 await p.evaluate(()=>window.dispatchEvent(new Event('blur')));await p.waitForTimeout(150);
 assert.equal((await holds()).octave,false,'losing the window focus releases the Octave hold');
 await key('keyUp','Backspace','Backspace',0,8);
 assert.deepEqual(errors,[]);console.log('PASS KEY-HEAL-01: lost Alt release healed by the next mouse move or key, real holds kept, Backspace hold released on blur');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
