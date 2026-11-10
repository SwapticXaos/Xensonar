/* Probe only (not shipped): ROOM4-01 Multitrack room in the real layout (headless Chromium).
 * Run: node tools/probes/multitrack_probe.js [path/to/index.html] */
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const os=require('os');
const target='file://'+path.resolve(process.argv[2]||path.join(__dirname,'../../index.html'));
function wav(file){const sr=48000,n=sr*2,buf=Buffer.alloc(44+n*4);buf.write('RIFF',0);buf.writeUInt32LE(36+n*4,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(2,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*4,28);buf.writeUInt16LE(4,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*4,40);
 for(let i=0;i<n;i++){const v=Math.round(9000*Math.sin(2*Math.PI*233.1*i/sr));buf.writeInt16LE(v,44+i*4);buf.writeInt16LE(v,46+i*4)}fs.writeFileSync(file,buf)}
const tone=path.join(os.tmpdir(),'xen_mt_tone.wav');wav(tone);
const out=[];const log=(k,v)=>{out.push({k,v});console.log(JSON.stringify({step:k,...(typeof v==='object'?v:{v})}))};
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1600,height:1000}});const p=await ctx.newPage();
const errors=[];p.on('pageerror',e=>errors.push(String(e).slice(0,200)));p.on('dialog',d=>d.accept());
await p.addInitScript({path:path.join(__dirname,'room_activity_instrument.js')});
await p.goto(target);await p.waitForTimeout(6000);
const clkX=t=>p.evaluate(t=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&!b.disabled&&(n(b.innerText)===t||n(b.innerText).endsWith(' '+t)||n(b.getAttribute('aria-label'))===t));if(b)b.click();return !!b},t);
const clkS=t=>p.evaluate(t=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&!b.disabled&&n(b.innerText).startsWith(t));if(b){b.scrollIntoView();b.click()}return !!b},t);
const lvl=async(ms=1500)=>{let m=0;for(let i=0;i<ms/150;i++){await p.waitForTimeout(150);m=Math.max(m,...(await p.evaluate(()=>__probe.rms())).map(x=>x.rms),0)}return +m.toFixed(4)};
log('boot',{chunkEvaluated:await p.evaluate(()=>__XenRoomChunks.status().multitrack),errors:errors.length});
// harvest one material
await clkX('MATERIAL FORGE');await p.waitForTimeout(3000);await clkS('SPECTRALFORGE');await p.waitForTimeout(5000);
await p.setInputFiles('input[type=file][accept^="audio"]',tone);await p.waitForTimeout(5000);
await clkS('📀 Send raw as a loop to Material Track');await p.waitForTimeout(4000);
await clkX('MULTITRACK');await p.waitForTimeout(3500);await p.evaluate(()=>window.scrollTo(0,0));
log('room IV',{chunkEvaluated:await p.evaluate(()=>__XenRoomChunks.status().multitrack),title:await p.evaluate(()=>document.querySelector('.xmt h2')?.innerText??null),
 materials:await p.$$eval('.xmt select option',o=>o.map(x=>x.textContent))});
await clkX('+ Clip at cursor');await p.waitForTimeout(400);
await clkX('+ Track');await p.waitForTimeout(400);
// cursor to bar 3 on the ruler, add clip to track 2
await p.evaluate(()=>{const r=document.querySelector('.xmt .ruler');const rect=r.getBoundingClientRect();const ppb=28;r.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:rect.left+8*ppb+1,clientY:rect.top+5}))});
await clkX('+ Clip at cursor');await p.waitForTimeout(400);
const clips=()=>p.$$eval('.xmt .clip',c=>c.map(x=>({label:x.getAttribute('aria-label'),left:parseFloat(x.style.left),width:parseFloat(x.style.width)})));
log('clips',{clips:await clips()});if(process.env.SHOT)await p.screenshot({path:process.env.SHOT});
await clkX('Play from cursor (Space)');await p.waitForTimeout(400);
await p.evaluate(()=>{const c=document.querySelector('.xmt .cur');});
log('ctx in room IV',{states:await p.evaluate(()=>__probe.rms().map(x=>x.state))});
await clkX('⏮');await clkX('Stop (Space)');await p.waitForTimeout(300);await clkX('Play from cursor (Space)');
const playLvl=await lvl(2500);const ph=await p.evaluate(()=>{const e=document.querySelector('.xmt .ph');return {display:e.style.display,left:e.style.left}});
log('playing',{peakRms:playLvl,playhead:ph,status:await p.evaluate(()=>document.querySelector('.xmt [role=alert]')?.innerText??'')});
await clkX('Stop (Space)');const stopLvl=await lvl(1200);log('stopped',{peakRms:stopLvl});
// keyboard: select first clip, move right by grid, delete, undo
const first=(await clips())[0];await p.locator('.xmt .clip').first().focus();await p.keyboard.press('ArrowRight');await p.waitForTimeout(200);
const moved=(await clips())[0];await p.keyboard.press('Delete');await p.waitForTimeout(200);const afterDel=(await clips()).length;
await p.keyboard.press('Control+z');await p.waitForTimeout(200);const afterUndo=(await clips()).length;
log('keyboard',{leftBefore:first.left,leftAfterArrow:moved.left,countAfterDelete:afterDel,countAfterUndo:afterUndo,announce:await p.evaluate(()=>document.querySelector('.xmt [aria-live]')?.innerText)});
// persistence across reload
await p.waitForTimeout(1200);await p.reload();await p.waitForTimeout(6000);await clkX('MULTITRACK');await p.waitForTimeout(3000);
log('after reload (expect 2: undo restored the deleted clip)',{clips:(await clips()).length});
// leaving the room stops playback
await clkX('Play from cursor (Space)');await p.waitForTimeout(5200);log('replay status',{status:await p.evaluate(()=>document.querySelector('.xmt [role=alert]')?.innerText??''),materials:await p.$$eval('.xmt select option',o=>o.map(x=>x.textContent)),clips:await clips(),ph:await p.evaluate(()=>document.querySelector('.xmt .ph')?.style.cssText)});const before=await lvl(800);await clkX('LIVE ROOM');await p.waitForTimeout(800);const after=await lvl(1200);
log('leave room',{levelInRoom:before,levelAfterLeaving:after});
log('errors',{errors});await b.close()})();
