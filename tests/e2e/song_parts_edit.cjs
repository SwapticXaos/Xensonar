'use strict';
// SONG-PARTS-EDIT-01 + TAKT-POPUP-02 (real app): the parts are a working copy – split, drag a boundary (snapped to the bar),
// the copy survives a reload of the app, reset returns to the analysis. The Taktometer menu stays fully visible (fixed layer,
// not covered, follows scrolling); "Fit" inside a part changes nothing; the purple mask snaps to bar lines while dragged.
// Usage: node tests/e2e/song_parts_edit.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const {song,SR}=require('../helpers/meter_synth.cjs'),{wav}=require('../helpers/analysis_synth.cjs');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'xen-edit-'));
const T={A:{},B:{root:73.4,chord:[1,1.2,1.5,1.8],chordHz:293.7,hats:false,lead:660},C:{root:41.2,chord:[1,1.335],chordHz:164.8,lead:0}};
const file=path.join(dir,'abacb_edit.wav');fs.writeFileSync(file,wav(song({bpm:120,S:4,sections:[...'ABACB'].map(k=>({bars:8,...T[k]}))}).samples,SR));
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1440,height:900}});const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const boot=async()=>{await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
  await p.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/MATERIAL FORGE/.test(b.innerText)).click());await p.waitForTimeout(2000);
  await p.getByText('Import Audio').first().click();await p.waitForTimeout(2500);
  await p.locator('input[type=file][accept^="audio/"]').setInputFiles(file);await p.getByRole('button',{name:'Wave Editor'}).first().waitFor({timeout:60000});
  await p.waitForFunction(()=>document.querySelector('[data-xwe-song-parts]')?.getAttribute('data-xwe-song-parts')==='done',null,{timeout:60000});
  await p.waitForFunction(()=>document.querySelectorAll('[data-xwe-song-part]').length>0,null,{timeout:30000});
  await p.evaluate(()=>document.querySelector('[data-xwe-song-parts]').parentElement.scrollIntoView({block:'start'}));await p.waitForTimeout(300)};
 await boot();
 const parts=p.locator('[data-xwe-song-part]'),labels=()=>parts.evaluateAll(n=>n.map(x=>x.dataset.xweSongPart).join('')),strip=p.locator('.xwe-song-strip');
 assert.equal(await labels(),'ABACB');assert.equal(await p.locator('[data-xwe-snap]').inputValue(),'bar');
 const sb=await strip.boundingBox(),X=t=>sb.x+sb.width*t/80,Y=sb.y+sb.height/2;
 // split B (16–32 s) at 23.4 s -> snapped to the bar at 24 s
 await p.mouse.click(X(23.4),Y,{button:'right'});const menu=p.locator('[data-xwe-song-menu]');await menu.waitFor();
 assert.match(await menu.innerText(),/Split here at 0:24 \(snapped to bar\)/);await menu.locator('[data-xwe-song-action="split"]').click();await p.waitForTimeout(300);
 assert.equal(await labels(),'ABDACB','B is split into B and a new letter');assert.equal(await p.locator('.xwe-song-edited').count(),1,'working copy badge');
 // drag the boundary A|B from 16 s to 19.3 s -> snapped to 20 s
 const hb=await p.locator('[data-xwe-song-handle="1"]').boundingBox();await p.mouse.move(hb.x+hb.width/2,Y);await p.mouse.down();await p.mouse.move(X(18),Y,{steps:4});await p.mouse.move(X(19.3),Y,{steps:4});await p.mouse.up();await p.waitForTimeout(300);
 await parts.first().click();await p.waitForTimeout(300);let cap=await p.locator('[data-xwe-song-caption]').innerText();
 assert.match(cap,/^A · 0:00–0:20 · 10 bars × 4 = 40 segments · 1(19|20)\.\d\d BPM · edited/,cap);
 // the working copy survives a reload of the whole app
 await boot();await p.waitForFunction(()=>[...document.querySelectorAll('[data-xwe-song-part]')].map(x=>x.dataset.xweSongPart).join('')==='ABDACB',null,{timeout:15000}).catch(()=>{});assert.equal(await labels(),'ABDACB','edits restored after reload');assert.equal(await p.locator('.xwe-song-edited').count(),1);
 await parts.first().click();await p.waitForTimeout(300);assert.match(await p.locator('[data-xwe-song-caption]').innerText(),/^A · 0:00–0:20 · 10 bars/);
 // ---- Taktometer menu: fixed layer, fully visible, not covered, follows scrolling ----
 const meter=p.locator('[data-xen-bar-meter]');await meter.scrollIntoViewIfNeeded();let mb=await meter.boundingBox();await p.mouse.click(mb.x+mb.width*.97,mb.y+mb.height/2,{button:'right'});
 const pop=p.locator('[data-xwe-meter-menu]');await pop.waitFor();await pop.locator('[data-xwe-meter-action="analyze"]').click();await pop.locator('[data-xwe-meter-result]').waitFor();await p.waitForTimeout(200);
 const visible=()=>p.evaluate(()=>{const el=document.querySelector('[data-xwe-meter-menu]');const r=el.getBoundingClientRect(),cs=getComputedStyle(el);
  const probe=(x,y)=>{const t=document.elementFromPoint(x,y);return !!t&&el.contains(t)};
  return {fixed:cs.position==='fixed',inView:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,onTop:probe(r.left+r.width/2,r.bottom-6)&&probe(r.right-12,r.top+12),scrolls:el.scrollHeight<=el.clientHeight+1||cs.overflowY==='auto'}});
 let v=await visible();assert.ok(v.fixed&&v.inView&&v.onTop&&v.scrolls,'menu fully visible and on top: '+JSON.stringify(v));
 await p.mouse.wheel(0,250);await p.waitForTimeout(400);if(await pop.count()){v=await visible();assert.ok(v.inView&&v.onTop,'after scrolling: '+JSON.stringify(v))}
 // ---- Fit inside the part: the target is the part itself -> nothing changes ----
 if(!(await pop.count())){await meter.scrollIntoViewIfNeeded();mb=await meter.boundingBox();await p.mouse.click(mb.x+mb.width*.5,mb.y+mb.height/2,{button:'right'});await pop.waitFor()}
 const fit=pop.locator('[data-xwe-meter-action="fit"]');assert.match(await fit.innerText(),/Fit mask to 40 segments ≈ 20\.0 s/);await fit.click();await p.waitForTimeout(400);
 assert.match(await pop.locator('[role=status]').innerText(),/Mask already fits: (19|20)\.\d+ s = 40 segments \(10 × 4\)/);await p.keyboard.press('Escape');
 // ---- the purple mask snaps to bar lines while its end is dragged ----
 const det=p.locator('canvas[height="124"]').first();await det.scrollIntoViewIfNeeded();const db=await det.boundingBox();
 const fine=async()=>(await p.evaluate(()=>{const d=[...document.querySelectorAll('div')].find(d=>d.textContent==='Fine Selection');return d.nextElementSibling.textContent})).match(/[\d.]+/g).map(Number);
 const view=async()=>(await p.evaluate(()=>{const d=[...document.querySelectorAll('div')].find(d=>d.textContent==='Viewport');return d.nextElementSibling.textContent})).match(/[\d.]+/g).map(Number);
 const [s0,e0]=await fine(),[v0,v1]=await view(),xAt=t=>db.x+db.width*(t-v0)/(v1-v0);
 await p.mouse.move(xAt(e0)-1,db.y+db.height/2);await p.mouse.down();await p.mouse.move(xAt(e0-2),db.y+db.height/2,{steps:6});await p.mouse.move(xAt(e0-6.7),db.y+db.height/2,{steps:6});await p.mouse.up();await p.waitForTimeout(300);
 const [s1,e1]=await fine();assert.ok(Math.abs(s1-s0)<.02,'start unchanged '+s0+' → '+s1);assert.ok(e1<e0-1,'end moved '+e0+' → '+e1);assert.ok(Math.abs(e1/2-Math.round(e1/2))<.02,'end on a bar line (2 s grid): '+e1);
 // ---- reset to the analysis ----
 await p.evaluate(()=>document.querySelector('[data-xwe-song-parts]').parentElement.scrollIntoView({block:'start'}));await p.waitForTimeout(200);
 const sb2=await strip.boundingBox();await p.mouse.click(sb2.x+sb2.width*.1,sb2.y+sb2.height/2,{button:'right'});await menu.waitFor();await menu.locator('[data-xwe-song-action="reset"]').click();await p.waitForTimeout(300);
 assert.equal(await labels(),'ABACB');assert.equal(await p.locator('.xwe-song-edited').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS SONG-PARTS-EDIT-01 split · drag boundary (bar snap) · persists over reload · reset; Taktometer menu fixed+visible; Fit in part = no change; mask end snapped to '+e1+' s');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
