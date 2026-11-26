'use strict';
// SONG-PART-TAGS-01/02 (real app): Wave Editor strip names repetitions A1 / A2 and sections A1a / A1b (repetition colour as a frame);
// a mask on a part / section sends its designation in the title ("abacb_tags · A2", "… · A1b") to the Material Track;
// the colours travel along: the Mixing Desk crate shows a two-tone chip (letter colour top, section shade bottom, repetition ring)
// and the Quick Rack tint helper gives body = letter / section, border = repetition colour.
// SONG-PART-TAGS-02: a mask INSIDE a section (4 of 8 bars) takes the section's designation, a mask across two sections only the part's;
// card colours = main rubric (body) + sub rubric (border), shown in the Mixing Desk crate, the Quick Rack card and the Meta-Menu tile.
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
 // SONG-PART-TAGS-02: masks set directly (snap off): 10–14 s lies inside A1b (8–16 s), 6–12 s spans A1a | A1b
 const setMask=(a,d)=>p.evaluate(([a,d])=>{const w=globalThis.__XenWaveUIW01;const ed=[...document.querySelectorAll('[data-material-intake-gateway] canvas')].map(n=>w.getEditor(n)).filter(Boolean).find(e=>e.doc);
  ed.options.onSelection({fineLoopRange:{startSec:a,durationSec:d},detailViewport:{startSec:0,durationSec:80}});return 1},[a,d]);
 await setMask(10,4);await p.waitForTimeout(500);await send();
 await setMask(6,6);await p.waitForTimeout(500);await send();
 await setMask(14,6);await p.waitForTimeout(500);await send();
 // the titles in the Mixing Desk library crate, with their chips and colour codes
 await p.evaluate(()=>{[...document.querySelectorAll('header button')].find(b=>/LIVE ROOM/.test(b.innerText)).click()});await p.waitForTimeout(2000);
 await p.evaluate(()=>window.__XenDjStage.setExpanded(true));await p.waitForTimeout(800);
 await p.evaluate(()=>{const t=[...document.querySelectorAll('.xen-dj-stage button')].find(x=>/Material Library/.test(x.innerText));t&&t.click()});await p.waitForTimeout(1200);
 if(process.env.SHOT_DIR)await p.locator('.xen-dj-crate').screenshot({path:path.join(process.env.SHOT_DIR,'crate.png')});
 const crate=await p.locator('.xen-dj-crate-item').evaluateAll(n=>n.map(x=>({name:x.querySelector('.xen-dj-crate-name')?.title,tag:x.querySelector('[data-xen-song-part-tag]')?.dataset.xenSongPartTag||null,main:x.style.getPropertyValue('--sp-main'),sub:x.style.getPropertyValue('--sp-sub'),card:x.style.getPropertyValue('--sp-card')})));
 const crateNames=crate.map(c=>c.name);const by=t=>crate.filter(c=>new RegExp('abacb_tags · '+t+'$').test(c.name||''));
 assert.equal(by('A2').length,1,'A2 sent: '+JSON.stringify(crateNames));assert.equal(by('A1b').length,2,'A1b clicked + 4 bars inside A1b: '+JSON.stringify(crateNames));
 assert.equal(by('A1').length,1,'across A1a | A1b: the part A1');assert.ok(crate.some(c=>c.name==='abacb_tags'),'across A1 | B: plain title');
 const a2=by('A2')[0],a1b=by('A1b')[0],a1=by('A1')[0],plain=crate.find(c=>c.name==='abacb_tags');
 assert.equal(a2.tag,'A2');assert.equal(a1b.tag,'A1b');assert.equal(plain.tag,null);assert.equal(plain.sub,'','no colour code: plain look');
 assert.equal(a2.main,a1b.main,'same kind A: same main rubric');assert.equal(a2.sub,occ[2][1],'A2: sub rubric = its repetition colour (the frame in the strip)');
 assert.equal(a1.sub,occ[0][1],'A1: repetition colour');assert.notEqual(a1b.sub,a1b.main,'A1b: the section shade as sub rubric');
 // Quick Rack: "+Rack" puts A1b into the live rack; its card shows body = main rubric, border = sub rubric
 await p.evaluate(()=>{const row=[...document.querySelectorAll('.xen-dj-crate-item')].find(x=>/abacb_tags · A1b$/.test(x.querySelector('.xen-dj-crate-name')?.title||''));[...row.querySelectorAll('button')].find(b=>/Rack/.test(b.innerText))?.click()});await p.waitForTimeout(1200);
 const tile=await p.evaluate(()=>{const t=[...document.querySelectorAll('.xen-quick-tile')].find(x=>/A1b/.test(x.title||''));return t?{cls:t.className,border:t.style.getPropertyValue('--xen-session-border'),bg:t.style.getPropertyValue('--xen-session-bg'),cb:getComputedStyle(t).borderTopColor}:null});
 if(process.env.SHOT_DIR){const r=await p.evaluate(()=>{const t=[...document.querySelectorAll('.xen-quick-tile')].find(x=>/A1b/.test(x.title||''));t.scrollIntoView({block:'center'});const g=t.closest('.xen-quick-grid')||t.parentElement;const b=g.getBoundingClientRect();return {x:Math.max(0,b.x-6),y:Math.max(0,b.y-6),width:b.width+12,height:b.height+12}});await p.screenshot({path:path.join(process.env.SHOT_DIR,'quick.png'),clip:r})}
 assert.ok(tile&&/is-session-tinted/.test(tile.cls),'Quick Rack card tinted: '+JSON.stringify(tile));assert.equal(tile.border,a1b.sub,'card border = sub rubric');assert.equal(tile.bg,a1b.card,'card body = main rubric');
 // Meta-Menu tile of the same entry (draft session) in the same colours
 const mt=await p.evaluate(()=>window.__xenProbe.draw.evalInBundle(`JSON.stringify(__xenMetaItemTint({kind:'material',id:'nope',name:'abacb_tags · A1b'}))`));
 assert.deepEqual(JSON.parse(mt),{border:a1b.sub,background:a1b.card},'Meta-Menu tile / colour controls default to the part colours');
 assert.deepEqual(errors,[]);console.log('PASS SONG-PART-TAGS-01/02 strip A1 B1 A2 C B2 / A1a A1b · titles by containment (A2, A1b, 4 bars in A1b = A1b, across A1a|A1b = A1, across parts = plain) · crate, Quick Rack card and Meta-Menu tile in main / sub rubric');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
