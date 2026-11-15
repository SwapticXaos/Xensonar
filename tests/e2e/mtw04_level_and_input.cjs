'use strict';
// MTW-04 (real app, Room IV): "Match loudness" levels clips with the shared measuring core (clip gain only, nothing rendered), and the audio input shows its level while recording.
// Usage: node tests/e2e/mtw04_level_and_input.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
function wav16(file,db,hz){const sr=48000,n=sr*3,a=Math.pow(10,db/20),buf=Buffer.alloc(44+n*4);buf.write('RIFF',0);buf.writeUInt32LE(36+n*4,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(2,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*4,28);buf.writeUInt16LE(4,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*4,40);
 for(let i=0;i<n;i++){const v=Math.round(a*Math.sin(2*Math.PI*hz*i/sr)*32767);buf.writeInt16LE(v,44+i*4);buf.writeInt16LE(v,46+i*4)}fs.writeFileSync(file,buf);return file}
(async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'xen-mtw04-'));const loud=wav16(path.join(dir,'loud.wav'),-10,1000),soft=wav16(path.join(dir,'soft.wav'),-22,1000),faint=wav16(path.join(dir,'faint.wav'),-40,1000);
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  const ctx=await b.newContext({viewport:{width:1600,height:1000},permissions:['microphone']});const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);await p.waitForTimeout(3500);
  await p.evaluate(()=>{[...document.querySelectorAll('header button, button')].find(x=>/MULTITRACK/.test(x.innerText)&&x.offsetParent).click()});
  await p.waitForSelector('[data-xmt-tempo]',{timeout:30000});await p.waitForTimeout(800);
  const project=()=>p.evaluate(async()=>{const db=await __XenMultitrackInbox.db();return await new Promise(ok=>{const q=db.transaction('projects').objectStore('projects').get('current');q.onsuccess=()=>ok(q.result)})});
  const status=()=>p.evaluate(()=>document.querySelector('.xmt .warn[role=alert]')?.innerText||'');
  await p.setInputFiles('.xmt input[type=file]',[loud,soft,faint]);await p.waitForFunction(()=>document.querySelectorAll('.xmt .clip').length>=3,null,{timeout:40000});await p.waitForTimeout(2500);
  // ---- match loudness of all clips ----
  await p.locator('.xmt .clip').first().click();await p.keyboard.press('Control+a');await p.waitForSelector('[data-xmt-level]');await p.locator('[data-xmt-level]').click();await p.waitForTimeout(1000);
  const pr=await project(),gains=pr.tracks.map(t=>t.clips[0].gain),st=await status();
  const want=db=>Math.pow(10,(-18-db)/20);/* a stereo 1 kHz sine at x dBFS reads x LUFS */
  assert(Math.abs(gains[0]-want(-10))<.012,'the loud clip comes down to -18 LUFS: gain '+gains[0]+' (expected '+want(-10).toFixed(3)+')');
  assert(Math.abs(gains[1]-want(-22))<.03,'the soft clip comes up to -18 LUFS: gain '+gains[1]+' (expected '+want(-22).toFixed(3)+')');
  assert.equal(gains[2],2,'the faint clip stops at the +6 dB limit of the clip gain');assert(/3 clips levelled to -18 LUFS/.test(st)&&/1 at the \+6 dB limit/.test(st),'the status tells both: '+st);
  await p.keyboard.press('Control+z');await p.waitForTimeout(800);assert.deepEqual((await project()).tracks.map(t=>t.clips[0].gain),[1,1,1],'one undo step for all three');
  // the same from the clip menu, one clip
  await p.keyboard.press('Escape');await p.locator('.xmt .clip').first().click({button:'right'});await p.waitForSelector('.xmt-menu');
  await p.evaluate(()=>{[...document.querySelectorAll('.xmt-menu [role=menuitem]')].find(x=>/^Match loudness/.test(x.innerText.trim())).click()});await p.waitForTimeout(900);
  assert(Math.abs((await project()).tracks[0].clips[0].gain-want(-10))<.012,'clip menu: Match loudness');
  // ---- input level while recording (Chromium test microphone: a beep every second) ----
  assert.equal(await p.locator('[data-xmt-input-meter]').count(),0,'no input meter while nothing records (cold)');
  await p.locator('[data-xmt-rec]').click();await p.waitForSelector('[data-xmt-input-meter]',{timeout:20000});
  let top=0;for(let i=0;i<30;i++){await p.waitForTimeout(100);top=Math.max(top,await p.evaluate(()=>parseFloat(document.querySelector('[data-xmt-input-meter] i')?.style.width)||0))}
  assert(top>20,'the input meter moves with the test microphone: '+top+' %');
  await p.locator('[data-xmt-rec]').click();await p.waitForFunction(()=>!document.querySelector('[data-xmt-input-meter]'),null,{timeout:20000});await p.waitForTimeout(1500);
  const after=await project();assert(after.tracks.some(t=>/^Rec \d/.test(t.name)&&t.clips.length===1),'the recording arrived on its own track: '+after.tracks.map(t=>t.name));
  assert.deepEqual(errors,[]);console.log('PASS MTW-04 Match loudness (gains '+gains.map(g=>g.toFixed(3)).join(' / ')+'), input meter while recording (top '+top.toFixed(0)+' %)');
  await b.close();fs.rmSync(dir,{recursive:true,force:true});
})().catch(e=>{console.error(e);process.exit(1)});
