'use strict';
// TAKT-SEEK (real app, Wave Editor / import area): LEFT click on the Taktometer moves the running playback to that point and plays on from there; RIGHT click opens Number of Bars / Segments
// (both used to open the settings). Usage: node tests/e2e/wave_taktometer_seek.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
  const header=t=>p.evaluate(t=>{[...document.querySelectorAll('header button')].find(b=>new RegExp(t).test(b.innerText.trim())).click()},t);
  await header('^Rec$');await p.waitForTimeout(800);await p.keyboard.down('KeyA');await p.waitForTimeout(6500);await p.keyboard.up('KeyA');await p.waitForTimeout(300);await header('Enough');await p.waitForTimeout(2500);
  const w=p.locator('[data-xen-send-wave-editor]');await w.scrollIntoViewIfNeeded();await w.click();
  await p.waitForFunction(()=>{const x=globalThis.__XenWaveUIW01;return !!x&&[...document.querySelectorAll('canvas')].some(c=>{try{return x.getEditor(c)?.doc?.frames>0}catch{return false}})},null,{timeout:60000});await p.waitForTimeout(1500);
  const meter=p.locator('[data-xen-bar-meter]');await meter.scrollIntoViewIfNeeded();assert.equal(await meter.count(),1);
  const ed=()=>p.evaluate(()=>{const x=globalThis.__XenWaveUIW01;const c=[...document.querySelectorAll('canvas')].find(c=>{try{return x.getEditor(c)?.doc?.frames>0}catch{return false}});const e=x.getEditor(c);return{playing:!!e.audioNode,start:e.transport?.startFrame??null,end:e.transport?.endFrame??null,sr:e.doc.sampleRate,frames:e.doc.frames,vs:e.doc.viewport.start,ve:e.doc.viewport.end}});
  const mb=await meter.boundingBox();
  // left click: no settings popup
  await p.mouse.click(mb.x+mb.width*.5,mb.y+mb.height/2);await p.waitForTimeout(400);assert.equal(await p.locator('[data-xwe-meter-menu]').count(),0,'a left click no longer opens Number of Bars / Segments');
  // right click: settings popup
  await p.mouse.click(mb.x+mb.width*.5,mb.y+mb.height/2,{button:'right'});await p.waitForTimeout(400);assert.equal(await p.locator('[data-xwe-meter-menu]').count(),1,'a right click opens Number of Bars / Segments');
  assert.match(await p.locator('[data-xwe-meter-menu]').innerText(),/Number of Bars/);assert.match(await p.locator('[data-xwe-meter-menu]').innerText(),/Number of Segments/);
  await p.keyboard.press('Escape');await p.waitForTimeout(300);assert.equal(await p.locator('[data-xwe-meter-menu]').count(),0);
  // not playing: the left click does nothing (no playback starts)
  await p.mouse.click(mb.x+mb.width*.3,mb.y+mb.height/2);await p.waitForTimeout(400);assert.equal((await ed()).playing,false,'not playing: a left click starts nothing');
  // playing: the left click seeks and plays on
  await p.getByRole('button',{name:'Play Audio'}).click();await p.waitForTimeout(900);let s0=await ed();assert(s0.playing,'the Wave Editor plays');
  await p.mouse.click(mb.x+mb.width*.7,mb.y+mb.height/2);await p.waitForTimeout(700);
  const s1=await ed();const want=s1.vs+.7*(s1.ve-s1.vs);
  assert(s1.playing,'it keeps playing after the click');assert(Math.abs(s1.start-want)<(s1.ve-s1.vs)*.03,'the playback restarted at the clicked point: start '+s1.start+' wanted ≈ '+Math.round(want)+' (earlier start '+s0.start+')');
  assert(s1.start>s0.start+(s1.ve-s1.vs)*.3,'it jumped forward');
  assert.deepEqual(errors,[]);console.log('PASS TAKT-SEEK left click seeks ('+s0.start+' → '+s1.start+' of '+s1.frames+' frames), right click = bars/segments');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
