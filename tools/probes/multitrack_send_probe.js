/* Probe only (not shipped): ROOM4-03 Send-to-Multitrack paths, raw import with tempo detection, overview rail.
 * Run: node tools/probes/multitrack_send_probe.js [path/to/index.html]   (SHOT_DIR=/dir for screenshots) */
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const os=require('os');
const target='file://'+path.resolve(process.argv[2]||path.join(__dirname,'../../index.html'));
// 120 BPM click loop, 8 s, first beat after 0.37 s of silence (tests tempo + beat offset detection)
function clicks(file,bpm=120,pre=.37,sec=8){const sr=48000,n=Math.round(sr*sec),buf=Buffer.alloc(44+n*4);buf.write('RIFF',0);buf.writeUInt32LE(36+n*4,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(2,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*4,28);buf.writeUInt16LE(4,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*4,40);
 const beat=60/bpm;for(let i=0;i<n;i++){const t=i/sr-pre;let v=0;if(t>=0){const k=Math.floor(t/beat),ph=t-k*beat;v=Math.exp(-ph*38)*Math.sin(2*Math.PI*(k%4?660:990)*ph)*(k%4?.55:.9)}const s=Math.round(12000*v);buf.writeInt16LE(s,44+i*4);buf.writeInt16LE(s,46+i*4)}fs.writeFileSync(file,buf)}
function tone(file){const sr=48000,n=sr*2,buf=Buffer.alloc(44+n*4);buf.write('RIFF',0);buf.writeUInt32LE(36+n*4,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(2,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*4,28);buf.writeUInt16LE(4,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*4,40);
 for(let i=0;i<n;i++){const env=(i%(sr/2))<sr/6?1:.35,v=Math.round(9000*env*Math.sin(2*Math.PI*233.1*i/sr));buf.writeInt16LE(v,44+i*4);buf.writeInt16LE(v,46+i*4)}fs.writeFileSync(file,buf)}
const loopFile=path.join(os.tmpdir(),'xen_mt_click120.wav'),toneFile=path.join(os.tmpdir(),'xen_mt_tone.wav');clicks(loopFile);tone(toneFile);
const log=(k,v)=>console.log(JSON.stringify({step:k,...v}));const SHOT=process.env.SHOT_DIR;
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1600,height:1000}});const p=await ctx.newPage();
const errors=[];p.on('pageerror',e=>errors.push(String(e).slice(0,200)));p.on('dialog',d=>d.accept());
await p.goto(target);await p.waitForTimeout(6000);
const clk=(t,starts)=>p.evaluate(([t,s])=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&!b.disabled&&(s?n(b.innerText).startsWith(t):(n(b.innerText)===t||n(b.innerText).endsWith(' '+t))));if(b){b.scrollIntoView();b.click()}return !!b},[t,!!starts]);
const inboxCount=()=>p.evaluate(()=>__XenMultitrackInbox.count());
const waitInbox=async(n,ms=20000)=>{for(let t=0;t<ms;t+=250){if(await inboxCount()>=n)return true;await p.waitForTimeout(250)}return false};
log('boot',{chunkEvaluated:await p.evaluate(()=>__XenRoomChunks.status().multitrack),inboxApi:await p.evaluate(()=>Object.keys(globalThis.__XenMultitrackInbox||{})),errors:errors.length});
// 1 · Wave Editor (W01) → Multitrack
await clk('MATERIAL FORGE');await p.waitForTimeout(3000);await clk('SPECTRALFORGE',1);await p.waitForTimeout(5000);
await p.setInputFiles('input[type=file][accept^="audio"]',toneFile);await p.waitForTimeout(4000);
await p.locator('.xwe-launch').first().click();await p.waitForTimeout(2000);
{const btn=p.locator('[data-xwe-send-multitrack]');const box=await btn.boundingBox();const dlg=await p.locator('.xwe-dialog').boundingBox();
 await btn.click();const ok=await waitInbox(1);await p.waitForTimeout(300);
 const overlap=await p.evaluate(()=>{const b=document.querySelector('[data-xwe-send-multitrack]').getBoundingClientRect();return [...document.querySelectorAll('.xwe-dialog button,.xwe-dialog select,.xwe-dialog input')].filter(e=>e.dataset.xweSendMultitrack!=='true'&&e.offsetParent).some(e=>{const r=e.getBoundingClientRect();return r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top})});
 log('wave editor send',{overlapsOtherControls:overlap,button:!!box,bottomRight:box?{rightGap:Math.round(dlg.x+dlg.width-(box.x+box.width)),bottomGap:Math.round(dlg.y+dlg.height-(box.y+box.height))}:null,inbox:await inboxCount(),ok,status:await p.evaluate(()=>document.querySelector('.xwe-dialog [class*=status]')?.textContent||'')})}
if(SHOT)await p.locator('.xwe-dialog').screenshot({path:path.join(SHOT,'w01_send.png')});
await clk('Close ×');await p.waitForTimeout(500);
// 2 · Spectral Forge rack → Multitrack (layout: Send row unchanged, button under Figure Projects)
// the Forge renders the current listening mode, like Send to Editor: it needs a drawn Carrier figure
{await p.evaluate(()=>document.querySelector('.f31-play-rack').scrollIntoView({block:'end'}));await p.waitForTimeout(400);
 const c0=await p.evaluate(()=>{const r=document.querySelector('.f31-play-rack').getBoundingClientRect();return [...document.querySelectorAll('canvas')].map(c=>c.getBoundingClientRect()).filter(b=>b.width>300&&b.height>120&&b.bottom<=r.top+5&&b.bottom>r.top-700).map(b=>({x:b.left,y:b.top,w:b.width,h:b.height})).sort((a,b)=>b.w*b.h-a.w*a.h)[0]});
 await p.mouse.move(c0.x+c0.w*.1,c0.y+c0.h*.6);await p.mouse.down();for(let i=1;i<=30;i++)await p.mouse.move(c0.x+c0.w*(.1+.8*i/30),c0.y+c0.h*(.6-.25*Math.sin(i/3)),{steps:2});await p.mouse.up();await p.waitForTimeout(2500)}
{const btn=p.locator('[data-forge-send-to-multitrack]');await btn.scrollIntoViewIfNeeded();const box=await btn.boundingBox(),fp=await p.locator('.f33-rack-project-corner').boundingBox(),ed=await p.locator('[data-forge-send-to-editor]').boundingBox();
 if(SHOT)await p.locator('.f31-play-rack').screenshot({path:path.join(SHOT,'forge_rack.png')});
 await btn.click();const ok=await waitInbox(2,40000);
 log('forge send',{insideCorner:box.y>=fp.y&&box.y+box.height<=fp.y+fp.height+1,cornerBottom:Math.round(fp.y+fp.height),editorRowBottom:Math.round(ed.y+ed.height),inbox:await inboxCount(),ok,message:await p.evaluate(()=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode())if(/Sent to Multitrack|Multitrack transfer failed/.test(n.textContent)&&n.textContent.length<200)return n.textContent.trim();return ''})})}
// 3 · Melodic Loop Distribution → Multitrack
{await clk('MELODIC LOOP',1);await p.waitForTimeout(5000);
 const btn=await p.$('[data-ml-send-multitrack]');
 if(btn){await btn.scrollIntoViewIfNeeded();if(SHOT)await p.locator('[data-ml-quick-access]').first().screenshot({path:path.join(SHOT,'melodic_distribution.png')});await btn.click()}
 const ok=btn?await waitInbox(3,60000):false;
 log('melodic loop send',{button:!!btn,inbox:await inboxCount(),ok,status:await p.evaluate(()=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode())if(/Melodic Loop (sent|export failed)/.test(n.textContent)&&n.textContent.length<200)return n.textContent.trim();return ''})})}
// 4 · Room IV: inbox arrives on new tracks
await clk('MULTITRACK');await p.waitForTimeout(4000);await p.evaluate(()=>window.scrollTo(0,0));
const tracks=()=>p.$$eval('.xmt .hdr input[type=text]',x=>x.map(i=>i.value));
const clips=()=>p.$$eval('.xmt .clip',c=>c.map(x=>({label:x.getAttribute('aria-label'),width:parseFloat(x.style.width)})));
log('arrived',{inboxLeft:await inboxCount(),tracks:await tracks(),status:await p.evaluate(()=>[...document.querySelectorAll('.xmt *')].map(e=>e.childNodes.length===1&&e.textContent).find(t=>t&&t.startsWith('Arrived'))||'')});
// 5 · raw import with tempo detection: 120 BPM loop with 0.37 s pre-roll into a 108 BPM session
{const before=(await tracks()).length;await p.setInputFiles('.xmt input[type=file]',loopFile);let n=before;for(let i=0;i<60&&n===before;i++){await p.waitForTimeout(250);n=(await tracks()).length}
 const last=p.locator('.xmt .clip').last();await last.click();await p.waitForTimeout(300);
 const ins=await p.evaluate(()=>[...document.querySelectorAll('.xmt .bar .muted')].map(x=>x.innerText).find(t=>/Tempo|speed|Tape/.test(t))||'');
 const c=(await clips()).slice(-1)[0];const ppb=28;
 log('raw import',{tracksBefore:before,tracksAfter:n,clip:c.label,widthBeats:+(c.width/ppb).toFixed(2),expectedBeats:'16 − 0.74 offset = 15.26 (source beats, played at 108/120 rate)',inspector:ins})}
// 6 · one overview bar per axis: drag = scroll, edges = zoom; full = everything visible, no native scrollbars
for(let i=0;i<22;i++)await clk('+ Track');await p.waitForTimeout(400);
const geo=()=>p.evaluate(()=>{const sc=document.querySelector('.xmt .tracks'),row=document.querySelector('.xmt .trk:not(.rr)'),rr=document.querySelector('.xmt .trk.rr');return {nativeScrollbars:(sc.offsetWidth-sc.clientWidth-2)+(sc.offsetHeight-sc.clientHeight-2),scrollTop:Math.round(sc.scrollTop),vScrollMax:sc.scrollHeight-sc.clientHeight,hScrollMax:sc.scrollWidth-sc.clientWidth,trackH:+row.getBoundingClientRect().height.toFixed(1),viewH:sc.clientHeight-rr.offsetHeight,tier:row.className.replace('trk','').trim()||'full',laneW:Math.round(document.querySelector('.xmt .lane').getBoundingClientRect().width),viewW:sc.clientWidth-240,rulerStaysTop:Math.round(rr.getBoundingClientRect().top-sc.getBoundingClientRect().top),zoomSlider:[...document.querySelectorAll('.xmt label')].some(l=>/^Zoom/.test(l.innerText))}});
const dragBy=async(sel,dx,dy)=>{const bb=await p.locator(sel).boundingBox();const x=bb.x+bb.width/2,y=bb.y+bb.height/2;await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x+dx,y+dy,{steps:8});await p.mouse.up();await p.waitForTimeout(250)};
{const g0=await geo();
 await dragBy('.xmt .rail.v .thumb',0,60);const g1=await geo();
 await dragBy('.xmt .rail.v .thumb b.e',0,2000);const g2=await geo();
 await dragBy('.xmt .rail.v .thumb b.e',0,-2000);const g3=await geo();
 await p.locator('.xmt .rail.v').dblclick({position:{x:10,y:5}});await p.waitForTimeout(300);const g4=await geo();
 log('vertical bar',{start:g0,afterMove:g1,bottomEdgeToEnd_allTracks:g2,bottomEdgeToTop_oneTrack:g3,doubleClick:g4})}
{await p.locator('.xmt .rail.h').dblclick({position:{x:5,y:10}});await p.waitForTimeout(300);const h0=await geo();
 await dragBy('.xmt .rail.h .thumb b.r',-500,0);const h1=await geo();
 await dragBy('.xmt .rail.h .thumb',150,0);const h2=await geo();const sl=await p.evaluate(()=>document.querySelector('.xmt .tracks').scrollLeft);
 await p.locator('.xmt .rail.h').focus();await p.keyboard.press('Shift+ArrowRight');await p.waitForTimeout(200);const h3=await geo();
 if(SHOT)await p.locator('.xmt').screenshot({path:path.join(SHOT,'room4.png')});
 log('horizontal bar',{doubleClick_whole:{laneW:h0.laneW,viewW:h0.viewW,hScrollMax:h0.hScrollMax},rightEdgeIn_zoom:{laneW:h1.laneW},move:{scrollLeft:Math.round(sl),hScrollMax:h2.hScrollMax},keyZoomOut:{laneW:h3.laneW},zoomSliderLeft:h3.zoomSlider})}
log('tooltips',await p.evaluate(()=>{const el=[...document.querySelectorAll('.xmt button,.xmt input:not([type=file]),.xmt select')];const miss=el.filter(e=>!e.title&&!e.closest('[title]')&&!e.closest('table')&&e.getAttribute('role')!=='menuitem');return {controls:el.length,withoutTooltip:miss.length,examples:miss.slice(0,5).map(e=>e.outerHTML.slice(0,80))}}));
// 7 · persistence: reload, tracks still there, inbox empty
const t0=await tracks();await p.reload();await p.waitForTimeout(6000);await clk('MULTITRACK');await p.waitForTimeout(3500);
log('after reload',{before:t0.length,after:(await tracks()).length,inbox:await inboxCount()});
log('errors',{errors});await b.close()})();
