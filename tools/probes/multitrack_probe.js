/* Probe only (not shipped): ROOM4-02 Multitrack room in the real layout (headless Chromium).
 * Run: node tools/probes/multitrack_probe.js [path/to/index.html]   (SHOT=/path.png for a screenshot) */
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const os=require('os');
const target='file://'+path.resolve(process.argv[2]||path.join(__dirname,'../../index.html'));
function wav(file){const sr=48000,n=sr*2,buf=Buffer.alloc(44+n*4);buf.write('RIFF',0);buf.writeUInt32LE(36+n*4,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(2,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*4,28);buf.writeUInt16LE(4,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*4,40);
 for(let i=0;i<n;i++){const env=(i%(sr/2))<sr/6?1:.35,v=Math.round(9000*env*Math.sin(2*Math.PI*233.1*i/sr));buf.writeInt16LE(v,44+i*4);buf.writeInt16LE(v,46+i*4)}fs.writeFileSync(file,buf)}
const tone=path.join(os.tmpdir(),'xen_mt_tone.wav');wav(tone);
const log=(k,v)=>console.log(JSON.stringify({step:k,...v}));
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1600,height:1000},acceptDownloads:true});const p=await ctx.newPage();
const errors=[];p.on('pageerror',e=>errors.push(String(e).slice(0,200)));p.on('dialog',d=>d.accept());
await p.addInitScript({path:path.join(__dirname,'room_activity_instrument.js')});
await p.goto(target);await p.waitForTimeout(6000);
const clkX=t=>p.evaluate(t=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&!b.disabled&&(n(b.innerText)===t||n(b.innerText).endsWith(' '+t)||n(b.getAttribute('aria-label'))===t));if(b)b.click();return !!b},t);
const clkS=t=>p.evaluate(t=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&!b.disabled&&n(b.innerText).startsWith(t));if(b){b.scrollIntoView();b.click()}return !!b},t);
const lvl=async(ms=1200)=>{let m=0;for(let i=0;i<ms/150;i++){await p.waitForTimeout(150);m=Math.max(m,...(await p.evaluate(()=>__probe.rms())).map(x=>x.rms),0)}return +m.toFixed(4)};
const clips=()=>p.$$eval('.xmt .clip',c=>c.map(x=>({label:x.getAttribute('aria-label'),left:parseFloat(x.style.left),width:parseFloat(x.style.width),wave:!!x.querySelector('canvas'),id:x.dataset.clip})));
log('boot',{chunkEvaluated:await p.evaluate(()=>__XenRoomChunks.status().multitrack),errors:errors.length});
await clkX('MATERIAL FORGE');await p.waitForTimeout(3000);await clkS('SPECTRALFORGE');await p.waitForTimeout(5000);
await p.setInputFiles('input[type=file][accept^="audio"]',tone);await p.waitForTimeout(5000);
await clkS('📀 Send raw as a loop to Material Track');await p.waitForTimeout(4000);
await clkX('MULTITRACK');await p.waitForTimeout(3500);await p.evaluate(()=>window.scrollTo(0,0));
// project: clip on track 1 at 0, track 2, clip on track 2 at bar 3
await clkX('+ Clip at cursor');await clkX('+ Track');
await p.evaluate(()=>{const r=document.querySelector('.xmt .ruler');const rect=r.getBoundingClientRect();r.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:rect.left+8*28+1,clientY:rect.top+5}))});
await clkX('+ Clip at cursor');await p.waitForTimeout(1500);
log('clips',{clips:(await clips()).map(c=>({label:c.label,wave:c.wave}))});
if(process.env.SHOT)await p.screenshot({path:process.env.SHOT});
// drag first clip down onto track 2 and right by 16 beats (Alt not pressed: move)
{const box=await p.locator('.xmt .clip').first().boundingBox();const lanes=await p.$$eval('.xmt .lane',l=>l.map(x=>{const r=x.getBoundingClientRect();return {y:r.top+r.height/2}}));
 await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();await p.mouse.move(box.x+box.width/2+80,lanes[1].y,{steps:6});await p.mouse.move(box.x+box.width/2+32*28,lanes[1].y,{steps:6});await p.mouse.up();await p.waitForTimeout(300);
 log('drag to other track',{clips:(await clips()).map(c=>c.label)})}
// trim: right edge of the clip at beat 8 (visible) by -4 beats
{const all=await clips();const ci=all.findIndex(c=>c.left===8*28);const c=all[ci];const box=await p.locator('.xmt .clip').nth(ci).boundingBox();await p.mouse.move(box.x+box.width-3,box.y+box.height/2);await p.mouse.down();await p.mouse.move(box.x+box.width-3-4*28,box.y+box.height/2,{steps:5});await p.mouse.up();await p.waitForTimeout(300);
 log('trim right edge',{widthBefore:c.width,widthAfter:(await clips())[ci].width,expected:12*28})}
// split at cursor beat 12 on the clip 8-24
{await p.evaluate(()=>{const r=document.querySelector('.xmt .ruler');const rect=r.getBoundingClientRect();r.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:rect.left+12*28+1,clientY:rect.top+5}))});const n0=(await clips()).length;const cl=await clips();const hit=cl.find(c=>c.left===224);if(hit){await p.focus('[data-clip="'+hit.id+'"]');await p.keyboard.press('s');await p.waitForTimeout(300)}
 log('split',{hadClipAtCursor:!!hit,before:n0,after:(await clips()).length})}
// context menus
const menu=async(sel,label)=>{const el=p.locator(sel).first();await el.click({button:'right'});await p.waitForTimeout(200);const items=await p.$$eval('.xmt-menu [role=menuitem]',m=>m.map(x=>x.innerText.split('\n')[0]));await p.keyboard.press('Escape');await p.waitForTimeout(150);return {label,items:items.length,first:items.slice(0,4),closed:!(await p.$('.xmt-menu'))}};
log('context menus',{clip:await menu('.xmt .clip','clip'),lane:await menu('.xmt .lane','lane'),header:await menu('.xmt .hdr >> nth=1','track'),ruler:await menu('.xmt .ruler','ruler')});
// play from bar 3 (beat 8, where clips sound); mute the sounding clip live, then unmute
const setCursor=async beat=>p.evaluate(b=>{const r=document.querySelector('.xmt .ruler');const rect=r.getBoundingClientRect();r.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:rect.left+b*28+1,clientY:rect.top+5}))},beat);
await setCursor(8);await clkX('Play from cursor (Space)');const playing=await lvl(1500);
const sounding=await clips();for(const c of sounding){await p.focus('[data-clip="'+c.id+'"]');await p.keyboard.press('m')}const muted=await lvl(900);
for(const c of sounding){await p.focus('[data-clip="'+c.id+'"]');await p.keyboard.press('m')}const unmuted=await lvl(900);
log('playing + live clip mute',{peakRms:playing,afterMute:muted,afterUnmute:unmuted,status:await p.evaluate(()=>document.querySelector('.xmt [role=alert]')?.innerText??'')});
await clkX('Stop (Space)');
// loop: region bar 1-2 (beats 0-4) via state, then play 3 s and track playhead stays inside
await p.evaluate(()=>{const r=document.querySelector('.xmt .ruler'),rect=r.getBoundingClientRect();r.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:rect.left+4*28+1,clientY:rect.top+5}))});await p.waitForTimeout(150);
await clkX('Loop end here');await p.waitForTimeout(150);
await p.evaluate(()=>{const r=document.querySelector('.xmt .ruler'),rect=r.getBoundingClientRect();r.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:rect.left+1,clientY:rect.top+5}))});await p.waitForTimeout(150);
await clkX('Loop start here');await p.waitForTimeout(150);
await clkS('⟳ Loop');await p.waitForTimeout(150);await clkX('⏮');await clkX('Play from cursor (Space)');
const pos=[];for(let i=0;i<14;i++){await p.waitForTimeout(250);pos.push(parseFloat(await p.evaluate(()=>document.querySelector('.xmt .ph').style.left))||0)}
await clkX('Stop (Space)');log('loop playback',{loopBeats:'0-4',maxPlayheadBeat:+((Math.max(...pos)-240)/28).toFixed(2),wrapped:pos.some((v,i)=>i&&v<pos[i-1])});
await clkS('⟳ Loop');
// conversion: original speed (real audio length) via the clip context menu
{const cl=await clips();const i=cl.findIndex(c=>c.left===224);await p.locator('.xmt .clip').nth(i).click({button:'right'});await p.waitForTimeout(150);await clkX('Original speed (real audio length)');await p.waitForTimeout(400);
 log('original speed',{widthBefore:cl[i].width,widthAfter:(await clips())[i].width,expected:+(2*108/60*28).toFixed(1),inspector:await p.evaluate(()=>[...document.querySelectorAll('.xmt .bar .muted')].map(x=>x.innerText).find(t=>/speed|Tape/.test(t))??'')})}
// mixdown export
const dl=p.waitForEvent('download',{timeout:30000});await clkS('⤓ Mixdown');const d=await dl;const file=path.join(os.tmpdir(),'xen_mt_mix.wav');await d.saveAs(file);const head=fs.readFileSync(file).subarray(0,12).toString('latin1');
log('mixdown',{name:d.suggestedFilename(),bytes:fs.statSync(file).size,riff:head.startsWith('RIFF')&&head.includes('WAVE'),status:await p.evaluate(()=>document.querySelector('.xmt [role=alert]')?.innerText??'')});
// persistence
const count=(await clips()).length;await p.waitForTimeout(1200);await p.reload();await p.waitForTimeout(6000);await clkX('MULTITRACK');await p.waitForTimeout(3000);
log('after reload',{before:count,after:(await clips()).length});
await setCursor(8);await clkX('Play from cursor (Space)');await p.waitForTimeout(1200);const inRoom=await lvl(800);await clkX('LIVE ROOM');await p.waitForTimeout(800);
log('leave room',{levelInRoom:inRoom,levelAfterLeaving:await lvl(1000)});
log('errors',{errors});await b.close()})();
