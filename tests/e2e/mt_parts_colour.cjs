'use strict';
// MT-PARTS-01 (real app, Room V Multitrack): name recurring parts and colour them.
//  - three markers named Verse / Chorus / Verse (double-click renames); right-click the first Verse → "Part colour: Rose"
//  - both Verse parts are shaded (ruler and every lane) up to the next marker; Chorus stays plain; the 2nd Verse flag takes the colour
//  - one undo step removes it; the colour is saved with the project (reload)
// Usage: node tests/e2e/mt_parts_colour.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1600,height:1000}});const p=await ctx.newPage();
  const errors=[];p.on('pageerror',e=>errors.push(e.message));let nextName='';p.on('dialog',d=>d.accept(nextName));
  const open=async()=>{await p.evaluate(()=>{[...document.querySelectorAll('header button, button')].find(x=>/MULTITRACK/.test(x.innerText)&&x.offsetParent).click()});await p.waitForSelector('[data-xmt-tempo]',{timeout:30000});await p.waitForTimeout(800)};
  await p.goto('file://'+html);await p.waitForTimeout(3500);await open();
  const ruler=p.locator('.xmt .ruler');const rb=await ruler.boundingBox();
  for(const [x,name] of [[60,'Verse'],[260,'Chorus'],[460,'Verse']]){
    await ruler.click({position:{x,y:6}});await p.locator('[data-xmt-addmarker]').click();await p.waitForTimeout(200);
    nextName=name;const mk=p.locator('.xmt .mk').nth((await p.locator('.xmt .mk').count())-1);await mk.dblclick();await p.waitForTimeout(250);
  }
  const names=await p.$$eval('.xmt .mk span',s=>s.map(x=>x.textContent));assert.deepEqual(names,['Verse','Chorus','Verse'],'three named markers');
  assert.equal(await p.locator('.xmt .part').count(),0,'no colour yet: nothing shaded (as before)');
  await p.locator('.xmt .mk').first().click({button:'right'});await p.waitForSelector('.xmt-menu');
  await p.locator('.xmt-menu [data-xmt-part-color="#fb7185"]').click();await p.waitForTimeout(400);
  const bands=await p.$$eval('.xmt .ruler .part',d=>d.map(x=>({l:parseFloat(x.style.left),w:parseFloat(x.style.width),bg:getComputedStyle(x).backgroundColor})));
  assert.equal(bands.length,2,'both Verse parts are shaded in the ruler: '+JSON.stringify(bands));
  assert.ok(bands.every(q=>/251, 113, 133/.test(q.bg)),'in Rose');
  const flags=await p.$$eval('.xmt .mk',d=>d.map(x=>getComputedStyle(x).borderLeftColor));
  assert.ok(/251, 113, 133/.test(flags[0])&&/251, 113, 133/.test(flags[2])&&!/251, 113, 133/.test(flags[1]),'the 2nd Verse flag takes the colour, Chorus not: '+flags);
  const lanes=await p.locator('.xmt .lane').count(),laneParts=await p.locator('.xmt .lane .part').count();
  assert.ok(lanes>=1&&laneParts===2*lanes,'every lane is shaded for both parts: '+laneParts+' in '+lanes+' lanes');
  const saved=async()=>p.evaluate(async()=>{const db=await __XenMultitrackInbox.db();return await new Promise(ok=>{const q=db.transaction('projects').objectStore('projects').get('current');q.onsuccess=()=>ok(q.result.markers.map(m=>[m.name,m.color||null]))})});
  await p.waitForTimeout(1500);assert.deepEqual(await saved(),[['Verse','#fb7185'],['Chorus',null],['Verse','#fb7185']],'saved with the project');
  // undo: one step
  await p.locator('.xmt .tracks').click({position:{x:5,y:5}}).catch(()=>{});await p.keyboard.press('Control+z');await p.waitForTimeout(400);
  assert.equal(await p.locator('.xmt .part').count(),0,'one undo removes the part colour');
  await p.keyboard.press('Control+Shift+z');await p.waitForTimeout(400);
  assert.equal(await p.locator('.xmt .ruler .part').count(),2,'redo brings it back');
  await p.waitForTimeout(1500);
  // reload: kept
  await p.reload();await p.waitForTimeout(3500);await open();
  assert.equal(await p.locator('.xmt .ruler .part').count(),2,'after reload the parts are still coloured');
  assert.deepEqual(errors,[]);console.log('PASS MT-PARTS-01 named parts: colour per name, shading in ruler and '+lanes+' lane(s), undo/redo, saved');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
