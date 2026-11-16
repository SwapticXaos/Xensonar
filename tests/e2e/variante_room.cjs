'use strict';
// VARIANTE-ROOM-01 (real app): the button "Xensonar Variante" (Nodal Center · Art Installation · Field Access) opens the Xensonar Variante
// (native room, ported from the Full build) instead of the "archived in the Core build" placeholder. It plays on the live master (no second AudioContext)
// and is silent again after leaving the room.
// Usage: node tests/e2e/variante_room.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1100}})).newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript({path:path.resolve(__dirname,'../../tools/probes/room_activity_instrument.js')});
 await p.goto('file://'+html);await p.waitForTimeout(3500);
 assert.equal(await p.evaluate(()=>window.__XenRoomChunks.status().xenpolar),false,'the room chunk is not evaluated at start (cold)');
 await p.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/NODAL/.test(b.innerText)).click());await p.waitForTimeout(2000);
 const art=p.getByRole('button',{name:'Art Installation'});if(await art.count())await art.first().click();await p.waitForTimeout(1200);
 const v=p.getByRole('button',{name:'Xensonar Variante'});assert.equal(await v.count(),1,'the button is there');
 await v.scrollIntoViewIfNeeded();await v.click();await p.waitForSelector('[data-xen-variante-room]',{timeout:20000});
 assert.equal(await p.getByText(/archived in the Core build/).count(),0,'no placeholder');
 assert.equal(await p.evaluate(()=>window.__XenRoomChunks.status().xenpolar),true);
 assert.ok(await p.getByText('Zündung starten').count()>0,'the room is the Variante');
 const ctxBefore=await p.evaluate(()=>__probe.ctxs.length);
 // play: ignite, click into the field (ripple)
 await p.getByText('Zündung starten').click();await p.waitForTimeout(1500);
 const canvas=p.locator('[data-xen-variante-room] canvas').first();const box=await canvas.boundingBox();
 for(let i=0;i<3;i++){await p.mouse.click(box.x+box.width*(.3+.2*i),box.y+box.height*.55);await p.waitForTimeout(500)}
 const rms=async sec=>{await p.evaluate(()=>__probe.reset());let mx=0;for(let k=0;k<sec;k++){await p.waitForTimeout(250);mx=Math.max(mx,...(await p.evaluate(()=>__probe.rms())).map(x=>x.rms))}return mx};
 await p.mouse.click(box.x+box.width*.5,box.y+box.height*.5);const played=await rms(3);console.log('Variante RMS',played.toFixed(4));
 assert.ok(played>.003,'it makes sound: '+played);
 assert.equal(await p.evaluate(()=>__probe.ctxs.length),Math.max(ctxBefore,1),'the shared live AudioContext is used, no second one');
 // leave the room: silent again
 await p.locator('[data-xen-variante-back]').click();await p.waitForSelector('[data-xen-variante-launcher]',{timeout:10000});await p.waitForTimeout(4000);
 const after=await rms(2);console.log('after leaving',after.toFixed(4));assert.ok(after<.002,'silent after leaving the room: '+after);
 // launcher: card opens the room again, "Live Room" leads back
 await p.getByRole('button',{name:/Xensonar Variante/}).click();await p.waitForSelector('[data-xen-variante-room]');await p.locator('[data-xen-variante-back]').click();
 await p.locator('[data-xen-variante-back]').click();await p.waitForSelector('.xen-mainroom-particle-band',{timeout:15000});
 assert.deepEqual(errors,[]);console.log('PASS VARIANTE-ROOM-01 button -> Variante room, plays on the live master, silent after leaving, back to the Live Room');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
