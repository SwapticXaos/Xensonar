'use strict';
// SONG-PART-TAGS-01 (real app): Wave Editor strip names repetitions A1 / A2 and sections A1a / A1b (repetition colour as a frame);
// a mask on a part / section sends its designation in the title ("abacb_tags · A2", "… · A1b") to the Material Track;
// the colours travel along: the Mixing Desk crate shows a two-tone chip (letter colour top, section shade bottom, repetition ring)
// and the Quick Rack tint helper gives body = letter / section, border = repetition colour.
// Usage: node tests/e2e/song_part_tags_send.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const {song,SR}=require('../helpers/meter_synth.cjs'),{wav}=require('../helpers/analysis_synth.cjs');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'xen-sptag-'));
const T={A:{},B:{root:73.4,chord:[1,1.2,1.5,1.8],chordHz:293.7,hats:false,lead:660},C:{root:41.2,chord:[1,1.335],chordHz:164.8,lead:0}};
const file=path.join(dir,'abacb_tags.wav');fs.writeFileSync(file,wav(song({bpm:120,S:4,sections:[...'ABACB'].map(k=>({bars:8,...T[k]}))}).samples,SR));
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1600,height:1000}});const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 await p.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/MATERIAL FORGE/.test(b.innerText)).click());await p.waitForTimeout(2000);
 await p.getByText('Import Audio').first().click();await p.waitForTimeout(2500);
 await p.locator('input[type=file][accept^="audio/"]').setInputFiles(file);await p.getByRole('button',{name:'Wave Editor'}).first().waitFor({timeout:60000});
 await p.locator('[data-xwe-song-start]').click();await p.waitForFunction(()=>document.querySelector('[data-xwe-song-parts]')?.getAttribute('data-xwe-song-parts')==='done',null,{timeout:60000});
 const strip=p.locator('.xwe-song-strip');await strip.scrollIntoViewIfNeeded();let sb=await strip.boundingBox();
 // sections in the first A every 4 bars → A1a A1b
 await p.mouse.click(sb.x+sb.width*.1,sb.y+sb.height*.3,{button:'right'});const menu=p.locator('[data-xwe-song-menu]');await menu.waitFor();
 await menu.locator('[data-xwe-song-num="every"]').fill('4');await menu.locator('[data-xwe-song-action="every"]').click();await p.waitForTimeout(300);
 const names=await p.locator('[data-xwe-song-part]').evaluateAll(n=>n.map(x=>x.firstChild?.textContent||''));
 assert.deepEqual(names,['A1','B1','A2','C','B2'],'repetitions numbered in the strip: '+JSON.stringify(names));
 assert.equal(await p.locator('[data-xwe-song-sub]').evaluateAll(n=>n.map(x=>x.dataset.xweSongSub).join(' ')),'A1a A1b','sections in small letters');
 const occ=await p.locator('[data-xwe-song-occ]').evaluateAll(n=>n.map(x=>[x.dataset.xweSongOcc,x.style.getPropertyValue('--occ')]));
 assert.deepEqual(occ.map(o=>o[0]),['A1','B1','A2','B2'],'repetition frames only on repeated kinds (C occurs once)');assert.notEqual(occ[0][1],occ[2][1],'A1 and A2 differ in their frame colour');
 if(process.env.SHOT_DIR)await strip.screenshot({path:path.join(process.env.SHOT_DIR,'strip.png')});
 // send helper: click "Send to Material Track", wait for the status
 const send=async()=>{const btn=p.locator('button',{hasText:'Send raw as a loop to Material Track'}).first();await btn.scrollIntoViewIfNeeded();await btn.click();
  await p.waitForFunction(()=>![...document.querySelectorAll('button')].some(x=>/Send raw as a loop to Material Track/.test(x.innerText)&&x.disabled),null,{timeout:60000});await p.waitForTimeout(2500)};
 // A2 (the third part): one click selects the part
 await strip.scrollIntoViewIfNeeded();sb=await strip.boundingBox();await p.mouse.click(sb.x+sb.width*.5,sb.y+sb.height*.3);await p.waitForTimeout(400);
 await send();
 // A1b: first click takes A1, the second the section under the pointer
 await strip.scrollIntoViewIfNeeded();sb=await strip.boundingBox();await p.mouse.click(sb.x+sb.width*.15,sb.y+sb.height*.3);await p.waitForTimeout(300);await p.mouse.click(sb.x+sb.width*.15,sb.y+sb.height*.3);await p.waitForTimeout(400);
 await send();
 // the titles in the Mixing Desk library crate, with their chips
 await p.evaluate(()=>{[...document.querySelectorAll('header button')].find(b=>/LIVE ROOM/.test(b.innerText)).click()});await p.waitForTimeout(2000);
 await p.evaluate(()=>window.__XenDjStage.setExpanded(true));await p.waitForTimeout(800);
 await p.evaluate(()=>{const t=[...document.querySelectorAll('.xen-dj-stage button')].find(x=>/Material Library/.test(x.innerText));t&&t.click()});await p.waitForTimeout(1200);
 if(process.env.SHOT_DIR)await p.locator('.xen-dj-crate').screenshot({path:path.join(process.env.SHOT_DIR,'crate.png')});
 const crate=await p.locator('.xen-dj-crate-item').evaluateAll(n=>n.map(x=>({name:x.querySelector('.xen-dj-crate-name')?.title,tag:x.querySelector('[data-xen-song-part-tag]')?.dataset.xenSongPartTag||null,edge:x.style.getPropertyValue('--sp-edge'),top:x.style.getPropertyValue('--sp-top'),bottom:x.style.getPropertyValue('--sp-bottom')})));
 const a2=crate.find(c=>/abacb_tags · A2$/.test(c.name||'')),a1b=crate.find(c=>/abacb_tags · A1b$/.test(c.name||''));
 assert.ok(a2&&a1b,'both sends carry their designation in the title: '+JSON.stringify(crate.map(c=>c.name)));
 assert.equal(a2.tag,'A2');assert.equal(a1b.tag,'A1b');
 assert.equal(a2.top,a1b.top,'same kind A: same letter colour');assert.notEqual(a2.edge,a1b.edge,'repetition 2 vs 1: other edge colour');
 assert.equal(a2.bottom,a2.top,'a whole part: one colour top and bottom');assert.notEqual(a1b.bottom,a1b.top,'a section: its own shade at the bottom');
 assert.equal(a2.edge,occ[2][1],'the edge is the frame colour of A2 in the strip');
 const quick=await p.evaluate(n=>__XenSongPartTint.quickTint(n),a1b.name);assert.equal(quick.border,a1b.edge,'Quick Rack card border = repetition colour');assert.match(quick.background,/linear-gradient/,'two-tone body');
 assert.deepEqual(errors,[]);console.log('PASS SONG-PART-TAGS-01 strip A1 B1 A2 C B2 / A1a A1b · sent titles "… · A2", "… · A1b" · desk chips and Quick Rack tint in the part colours');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
