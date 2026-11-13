'use strict';
// MT-TEMPO + MT-PROJECTS (real app, Room IV): the tempo box commits once (Enter / blur / slider release), not on every keystroke; the slider reaches normal tempos; several projects can be
// started, listed, opened, copied, renamed and deleted (only the project record; "current" stays the working project). Usage: node tests/e2e/multitrack_projects_tempo.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1500,height:1000}})).newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);await p.waitForTimeout(3500);
  await p.evaluate(()=>{[...document.querySelectorAll('header button, button')].find(x=>/MULTITRACK/.test(x.innerText)&&x.offsetParent).click()});
  await p.waitForSelector('[data-xmt-tempo]',{timeout:30000});await p.waitForTimeout(800);
  const E=c=>p.evaluate(c=>window.__xenProbe.draw.evalInBundle(c),c);
  const cur=()=>p.evaluate(async()=>{const db=await __XenMultitrackInbox.db();return await new Promise(ok=>{const q=db.transaction('projects').objectStore('projects').get('current');q.onsuccess=()=>ok(q.result?{name:q.result.name,bpm:q.result.bpm,clips:q.result.tracks.reduce((n,t)=>n+t.clips.length,0)}:null)})});
  const keys=()=>p.evaluate(async()=>{const db=await __XenMultitrackInbox.db();return await new Promise(ok=>{const q=db.transaction('projects').objectStore('projects').getAllKeys();q.onsuccess=()=>ok(q.result.filter(k=>String(k).startsWith('proj:')))})});
  // ---- tempo ----
  const box=p.getByLabel('Tempo BPM');const start=Number(await box.inputValue());
  await box.click();await box.press('Control+a');await box.type('1');await p.waitForTimeout(900);await box.type('2');await box.type('0');await p.waitForTimeout(1000);
  const typed=await cur();assert.equal(typed?typed.bpm:start,start,'nothing is committed while typing (the clips are not re-timed 20 → 20 → 120): '+JSON.stringify(typed));
  await box.press('Enter');await p.waitForTimeout(900);assert.equal((await cur()).bpm,120,'Enter commits exactly what was typed');
  await box.click();await box.press('Control+a');await box.type('93,5');await box.press('Tab');await p.waitForTimeout(900);assert.equal((await cur()).bpm,93.5,'leaving the field commits; a decimal comma works');
  await box.press('ArrowUp');await p.waitForTimeout(900);assert.equal((await cur()).bpm,94.5,'Up = +1 BPM');
  const slider=p.getByLabel('Tempo slider');await slider.fill('500');await slider.dispatchEvent('pointerup');await p.waitForTimeout(900);const mid=(await cur()).bpm;assert(Math.abs(mid-89.4)<1,'the slider is logarithmic: the middle is about 89 BPM: '+mid);
  await box.click();await box.press('Control+a');await box.type('999');await box.press('Enter');await p.waitForTimeout(900);assert.equal((await cur()).bpm,400,'the range is kept (20-400)');
  await box.click();await box.press('Control+a');await box.type('108');await box.press('Enter');await p.waitForTimeout(900);
  // ---- projects ----
  const name=p.getByLabel('Arrangement name');assert.equal(await p.locator('[data-xmt-new-project]').count(),1,'a "+ New project" button exists');assert.equal(await p.locator('[data-xmt-open-projects]').count(),1);
  await name.fill('Alpha');await p.waitForTimeout(900);assert.equal((await cur()).name,'Alpha');
  await p.locator('[data-xmt-new-project]').click();await p.waitForTimeout(1500);
  assert.equal((await cur()).name,'Untitled Arrangement','a new, empty project is the working project');assert.equal((await keys()).length,1,'the previous project was put away, not lost');
  await name.fill('Beta');await p.waitForTimeout(900);
  await p.locator('[data-xmt-open-projects]').click();await p.waitForSelector('[data-xmt-project]');
  let listed=await p.locator('[data-xmt-project]').allInnerTexts();assert(listed.length===1&&/Alpha/.test(listed[0])&&/108 BPM/.test(listed[0]),'the list shows Alpha with its tempo: '+listed);
  // open Alpha: Beta is put away, Alpha is the working project again
  await p.locator('[data-xmt-project-open]').first().click();await p.waitForTimeout(1800);
  assert.equal((await cur()).name,'Alpha');assert.equal((await cur()).bpm,108);assert.equal(await name.inputValue(),'Alpha');
  await p.locator('[data-xmt-open-projects]').click();await p.waitForSelector('[data-xmt-project]');listed=await p.locator('[data-xmt-project]').allInnerTexts();assert(listed.length===1&&/Beta/.test(listed[0]),'Beta is in the list now: '+listed);
  // copy, rename, delete
  await p.locator('[data-xmt-project-copy]').first().click();await p.waitForTimeout(800);assert.equal(await p.locator('[data-xmt-project]').count(),2,'Copy adds a project');
  p.once('dialog',d=>d.accept('Gamma'));await p.locator('[data-xmt-project-rename]').first().click();await p.waitForTimeout(800);
  const names=await p.locator('[data-xmt-project]').allInnerTexts();assert(names.some(t=>/Gamma/.test(t)),'Rename: '+names);
  p.once('dialog',d=>d.dismiss());await p.locator('[data-xmt-project-delete]').first().click();await p.waitForTimeout(500);assert.equal((await keys()).length,2,'declining the confirmation deletes nothing');
  p.once('dialog',d=>d.accept());await p.locator('[data-xmt-project-delete]').first().click();await p.waitForTimeout(800);assert.equal((await keys()).length,1,'a confirmed delete removes only that project record');
  assert.equal((await cur()).name,'Alpha','the working project is untouched');
  assert.deepEqual(errors,[]);console.log('PASS MT-TEMPO + MT-PROJECTS tempo commits once, slider, several projects (new/open/copy/rename/delete)');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
