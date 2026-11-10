/* Probe only (not shipped): ROOM4-03c clip → WAV Editor → Apply & Return, in the real app.
 * Run: node tools/probes/multitrack_roundtrip_probe.js [index.html]   (SHOT_DIR=/dir for screenshots) */
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const os=require('os');
const target='file://'+path.resolve(process.argv[2]||path.join(__dirname,'../../index.html'));
function stereo(file){const sr=48000,n=sr*4,buf=Buffer.alloc(44+n*4);buf.write('RIFF',0);buf.writeUInt32LE(36+n*4,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(2,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*4,28);buf.writeUInt16LE(4,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*4,40);
 for(let i=0;i<n;i++){const t=i/sr,ph=t%.5,env=Math.exp(-ph*20);buf.writeInt16LE(Math.round(9000*env*Math.sin(2*Math.PI*330*t)),44+i*4);buf.writeInt16LE(Math.round(9000*env*Math.sin(2*Math.PI*495*t)),46+i*4)}fs.writeFileSync(file,buf)}
const f=path.join(os.tmpdir(),'xen_rt_stereo.wav');stereo(f);const SHOT=process.env.SHOT_DIR;
const log=(k,v)=>console.log(JSON.stringify({step:k,...v}));
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await (await b.newContext({viewport:{width:1600,height:1000}})).newPage();
const errors=[];p.on('pageerror',e=>errors.push(String(e).slice(0,200)));p.on('dialog',d=>d.accept());
await p.goto(target);await p.waitForTimeout(6000);
const clk=(t,s)=>p.evaluate(([t,s])=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&!b.disabled&&(s?n(b.innerText).startsWith(t):(n(b.innerText)===t||n(b.innerText).endsWith(' '+t))));if(b){b.scrollIntoView();b.click()}return !!b},[t,!!s]);
const proj=()=>p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('xensonar-multitrack-v1');q.onsuccess=()=>{const g=q.result.transaction('projects').objectStore('projects').get('current');g.onsuccess=()=>r(g.result)}}));
await clk('MULTITRACK');await p.waitForTimeout(3000);
await p.setInputFiles('.xmt input[type=file]',f);for(let i=0;i<40&&!(await p.$('.xmt .clip'));i++)await p.waitForTimeout(250);
// second clip of the same material on another track (must stay untouched), then move the first to bar 3
await p.locator('.xmt .clip').first().click();await p.keyboard.press('Control+d');await p.waitForTimeout(300);
await p.locator('.xmt .clip').nth(1).focus();await p.keyboard.press('ArrowDown');await p.waitForTimeout(300);
await p.waitForTimeout(900);const before=await proj();const cl=t=>t.tracks.flatMap(x=>x.clips.map(c=>({track:x.name,id:c.id,mat:c.materialId,start:c.startBeat,len:c.lenBeats??null,gain:c.gain})));
log('before',{tracks:before.tracks.length,clips:cl(before)});
const target0=cl(before)[0];
await p.locator('[data-clip="'+target0.id+'"]').click({button:'right'});await p.waitForTimeout(200);
const items=await p.$$eval('.xmt-menu [role=menuitem]',m=>m.map(x=>x.innerText.split('\n')[0]));
const scissors=await p.evaluate(()=>{const e=document.querySelector('.xmt-menu .xmt-open-wave');return e?getComputedStyle(e,'::before').backgroundImage.slice(0,30):null});
await clk('Open in WAV Editor…');
let btn=null;for(let i=0;i<120&&!btn;i++){await p.waitForTimeout(250);btn=await p.$('[data-xwe-apply-return]')}
await p.waitForTimeout(800);
const pos=await p.evaluate(()=>{const ov=[...document.querySelectorAll('[data-material-intake-gateway="true"] canvas')].filter(c=>c.offsetParent).map(c=>c.getBoundingClientRect()).sort((a,b)=>a.top-b.top)[0];const we=[...document.querySelectorAll('button')].find(b=>/^Wave Editor$/.test(b.innerText.trim())&&b.classList.contains('xwe-launch'));return {blueMaskTop:ov?Math.round(ov.top):null,waveEditorRowVisible:we?we.getBoundingClientRect().bottom>0:null,channels:document.querySelector('.xwe-dialog')?.innerText.includes('Stereo')}});
log('open in WAV editor',{menu:items.filter(x=>/WAV|now/.test(x)),scissorsIcon:scissors,returnButton:!!btn,...pos});
if(SHOT)await p.screenshot({path:path.join(SHOT,'roundtrip_arrival.png')});
// edit: reverse whole file, then Apply & Return
await p.evaluate(()=>{const b=[...document.querySelectorAll('.xwe-dialog button')].find(x=>/^Reverse$/.test(x.innerText.trim()));b?.click()});await p.waitForTimeout(800);
await p.locator('[data-xwe-apply-return]').click();
for(let i=0;i<60;i++){await p.waitForTimeout(250);if(await p.$('.xmt .clip'))break}
await p.waitForTimeout(1500);const after=await proj();const A=cl(after);
const t=A.find(c=>c.id===target0.id)||A.find(c=>c.start===target0.start&&c.track===target0.track);
log('apply & return',{inRoomIV:!!(await p.$('.xmt')),tracks:after.tracks.length,targetMaterialChanged:t&&t.mat!==target0.mat,targetStartKept:t&&t.start===target0.start,targetTrackKept:t&&t.track===target0.track,otherClipsUnchanged:cl(before).slice(1).every(o=>A.some(c=>c.id===o.id&&c.mat===o.mat&&c.start===o.start))});
await p.locator('.xmt').click({position:{x:5,y:5}});await p.keyboard.press('Control+z');await p.waitForTimeout(900);const u=cl(await proj()).find(c=>c.id===target0.id);
log('undo',{materialRestored:u?.mat===target0.mat});
log('errors',{errors});await b.close()})();
