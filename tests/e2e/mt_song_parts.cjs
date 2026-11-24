'use strict';
// MT-SONGPARTS-01 (real app): the song parts of the Wave Editor strip travel with "Send to Multitrack". The clip shows three levels:
// its own colour on top (name band), the parts A B A C B in the middle (same colours as the strip), the sections of a part (A1 A2 …)
// at the bottom. Saved with the Multitrack project: still there after a reload.
// Usage: node tests/e2e/mt_song_parts.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const {song,SR}=require('../helpers/meter_synth.cjs'),{wav}=require('../helpers/analysis_synth.cjs');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'xen-mtsp-'));
const T={A:{},B:{root:73.4,chord:[1,1.2,1.5,1.8],chordHz:293.7,hats:false,lead:660},C:{root:41.2,chord:[1,1.335],chordHz:164.8,lead:0}};
const file=path.join(dir,'abacb_mt.wav');fs.writeFileSync(file,wav(song({bpm:120,S:4,sections:[...'ABACB'].map(k=>({bars:8,...T[k]}))}).samples,SR));
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1600,height:1000}});const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 await p.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/MATERIAL FORGE/.test(b.innerText)).click());await p.waitForTimeout(2000);
 await p.getByText('Import Audio').first().click();await p.waitForTimeout(2500);
 await p.locator('input[type=file][accept^="audio/"]').setInputFiles(file);await p.getByRole('button',{name:'Wave Editor'}).first().waitFor({timeout:60000});
 await p.locator('[data-xwe-song-start]').click();await p.waitForFunction(()=>document.querySelector('[data-xwe-song-parts]')?.getAttribute('data-xwe-song-parts')==='done',null,{timeout:60000});
 const strip=p.locator('.xwe-song-strip');await strip.scrollIntoViewIfNeeded();const sb=await strip.boundingBox();
 await p.mouse.click(sb.x+sb.width*.1,sb.y+sb.height*.3,{button:'right'});const menu=p.locator('[data-xwe-song-menu]');await menu.waitFor();
 await menu.locator('[data-xwe-song-num="every"]').fill('4');await menu.locator('[data-xwe-song-action="every"]').click();await p.waitForTimeout(300);
 const stripColors=await p.locator('[data-xwe-song-part]').evaluateAll(n=>n.map(x=>getComputedStyle(x).backgroundColor));
 // the Wave Editor sends its document (same length as the analysed audio) to the Multitrack
 const status=await p.evaluate(async()=>{const w=globalThis.__XenWaveUIW01;const c=[...document.querySelectorAll('canvas')].find(c=>{try{return w.getEditor(c)?.doc?.frames>0}catch{return false}});
  const ed=w.getEditor(c);let msg='';const set=ed.setStatus.bind(ed);ed.setStatus=m=>{msg=m;set(m)};await ed.sendToMultitrack();ed.setStatus=set;return msg});
 assert.match(status,/with its 5 song parts/,status);
 const open=async()=>{await p.evaluate(()=>{[...document.querySelectorAll('header button, button')].find(x=>/MULTITRACK/.test(x.innerText)&&x.offsetParent).click()});await p.waitForSelector('[data-xmt-tempo]',{timeout:30000});await p.waitForTimeout(1500)};
 await open();
 const clip=p.locator('.xmt .clip').filter({has:p.locator('[data-xmt-songparts]')}).first();await clip.waitFor({timeout:30000});
 const read=()=>clip.evaluate(el=>{const r=el.getBoundingClientRect(),q=s=>[...el.querySelectorAll(s)].map(x=>{const b=x.getBoundingClientRect();return {l:x.dataset.xmtPart||x.dataset.xmtSec,x:(b.left-r.left)/r.width,w:b.width/r.width,top:b.top-r.top,bottom:r.bottom-b.bottom,h:b.height,pc:x.style.getPropertyValue('--pc')}});
  return {parts:q('[data-xmt-part]'),secs:q('[data-xmt-sec]'),title:el.title,h:r.height}});
 let v=await read();if(process.env.SHOT)await clip.screenshot({path:process.env.SHOT});
 assert.deepEqual(v.parts.map(q=>q.l),[...'ABACB'],'parts in the middle band: '+JSON.stringify(v.parts.map(q=>q.l)));
 v.parts.forEach((q,i)=>assert.ok(Math.abs(q.x-i*.2)<.02&&Math.abs(q.w-.2)<.02,'part '+q.l+' at its place in the clip: '+q.x.toFixed(3)+' / '+q.w.toFixed(3)));
 assert.deepEqual(v.secs.map(q=>q.l),['A1','A2'],'sections of the first A at the bottom: '+JSON.stringify(v.secs.map(q=>q.l)));
 assert.ok(v.secs.every(q=>q.bottom<=1.5&&q.h<v.h*.4),'sections sit at the bottom: '+JSON.stringify(v.secs)+' h '+v.h);assert.ok(v.parts.every(q=>q.top>=13),'the name band (clip colour) stays on top');
 const hex=s=>'#'+(s.match(/\d+/g)||[]).slice(0,3).map(n=>(+n).toString(16).padStart(2,'0')).join('');assert.deepEqual(v.parts.map(q=>q.pc),stripColors.map(hex),'part colours as in the strip');assert.notEqual(v.secs[0].pc,v.secs[1].pc,'sections in their own shades');
 assert.match(v.title,/Song parts: A \(A1 A2\) · B · A · C · B/);
 // saved with the project
 await p.reload();await p.waitForTimeout(3500);await open();await clip.waitFor({timeout:30000});v=await read();
 assert.deepEqual(v.parts.map(q=>q.l),[...'ABACB'],'after a reload');assert.equal(v.secs.length,2);
 // ---- MT-SONGPARTS-02: Open in WAV Editor brings the parts into the strip (no analysis); Apply & Return gives the edited parts to the new clip ----
 p.on('dialog',d=>d.accept());
 await clip.click({button:'right',position:{x:40,y:8}});await p.locator('.xmt-menu button',{hasText:'Open in WAV Editor'}).click();
 await p.waitForFunction(()=>{const s=document.querySelector('[data-xwe-song-parts]');return s?.getAttribute('data-xwe-song-parts')==='done'&&/Multitrack edit/.test(s.parentElement.innerText)},null,{timeout:60000});await p.waitForTimeout(500);
 const labels=()=>p.locator('[data-xwe-song-part]').evaluateAll(n=>n.map(x=>x.dataset.xweSongPart).join(''));

 assert.equal(await labels(),'ABACB','the strip shows the clip parts at once');assert.equal(await p.locator('[data-xwe-song-start]').count(),0,'no analysis needed');
 assert.equal(await p.locator('[data-xwe-song-sub]').evaluateAll(n=>n.map(x=>x.dataset.xweSongSub).join(' ')),'A1 A2','with the sections');
 // rename the last part to D (working copy) while the Wave Editor is open
 await p.evaluate(()=>{const el=[...document.querySelectorAll('[data-xwe-song-part]')].pop();el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:el.getBoundingClientRect().left+5,clientY:el.getBoundingClientRect().top+5}))});
 await p.locator('[data-xwe-song-menu] [data-xwe-song-letter="D"]').evaluate(el=>el.click());await p.waitForTimeout(300);assert.equal(await labels(),'ABACD',await p.locator('[data-xwe-song-caption]').innerText()+' | menu '+await p.locator('[data-xwe-song-menu]').count()+' | edited '+await p.locator('.xwe-song-edited').count());
 await p.locator('[data-xwe-apply-return]').evaluate(el=>el.click());
 await p.waitForSelector('[data-xmt-tempo]',{timeout:60000});await p.waitForTimeout(1500);
 await p.waitForFunction(()=>[...document.querySelectorAll('.xmt .clip [data-xmt-songparts]')].some(x=>x.dataset.xmtSongparts==='A B A C D'),null,{timeout:30000});
 v=await read();assert.deepEqual(v.parts.map(q=>q.l),[...'ABACD'],'the edited parts on the replaced clip: '+JSON.stringify(v.parts.map(q=>[q.l,+q.x.toFixed(3),+q.w.toFixed(3)])));assert.deepEqual(v.secs.map(q=>q.l),['A1','A2']);
 v.parts.forEach((q,i)=>assert.ok(Math.abs(q.x-i*.2)<.02,'still in place: '+q.l+' '+q.x.toFixed(3)));
 // ---- split the clip at 30 % (inside the 2nd part B): both halves keep their parts in place ----
 {const lane=clip.locator('xpath=..');const cb=await clip.boundingBox();
  await lane.click({button:'right',position:{x:Math.round(cb.x-(await lane.boundingBox()).x+cb.width*.3),y:2}}).catch(()=>{});
  const setCur=p.locator('.xmt-menu button',{hasText:'Set cursor here'});if(await setCur.count())await setCur.first().click();else await p.keyboard.press('Escape');
  await clip.click({button:'right',position:{x:Math.round(cb.width*.3),y:8}});await p.locator('.xmt-menu button',{hasText:'Split at cursor'}).click();await p.waitForTimeout(500);
  const halves=await p.locator('.xmt .clip [data-xmt-songparts]').evaluateAll(n=>n.map(sp=>[...sp.querySelectorAll('[data-xmt-part]')].map(x=>x.dataset.xmtPart).join('')));
  assert.deepEqual(halves,['AB','BACD'],'split inside B: AB | BACD '+JSON.stringify(halves))}
 assert.deepEqual(errors,[]);console.log('PASS MT-SONGPARTS-01 Wave Editor → Multitrack: clip colour / parts A B A C B / sections A1 A2, kept after reload · Open in WAV Editor → strip shows them → edit → Apply & Return → new clip ABACD · split keeps the parts in both halves');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
