/* Probe only (not shipped): ROOM4-05 Original-speed clip keeps its real length on a tempo change + source info line. */
const {chromium}=require('playwright');const path=require('path'),fs=require('fs'),os=require('os');
const f=path.join(os.tmpdir(),'xen_tempo_stereo.wav');{const sr=48000,n=sr*4,buf=Buffer.alloc(44+n*4);buf.write('RIFF',0);buf.writeUInt32LE(36+n*4,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(2,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*4,28);buf.writeUInt16LE(4,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*4,40);for(let i=0;i<n;i++){const v=Math.round(6000*Math.sin(2*Math.PI*220*i/sr));buf.writeInt16LE(v,44+i*4);buf.writeInt16LE(v,46+i*4)}fs.writeFileSync(f,buf)}
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1600,height:1000}})).newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e).slice(0,200)));
await p.goto('file://'+path.resolve(process.argv[2]||path.join(__dirname,'../../index.html')));await p.waitForTimeout(6000);
await p.evaluate(()=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();[...document.querySelectorAll('button')].find(b=>b.offsetParent&&n(b.innerText).endsWith('MULTITRACK'))?.click()});await p.waitForTimeout(3000);
await p.setInputFiles('.xmt input[type=file]',f);for(let i=0;i<40&&!(await p.$('.xmt .clip'));i++)await p.waitForTimeout(250);await p.waitForTimeout(1500);
const proj=()=>p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('xensonar-multitrack-v1');q.onsuccess=()=>{const g=q.result.transaction('projects').objectStore('projects').get('current');g.onsuccess=()=>r(g.result)}}));
await p.locator('.xmt .clip').first().click();await p.waitForTimeout(500);
const info=await p.locator('[data-clip-source-info]').first().innerText();
await p.selectOption('.xmt select[title^="How the clip"], .xmt label[title^="How the clip"] select','natural');await p.waitForTimeout(1200);
const a=(await proj());const ca=a.tracks[0].clips[0];
const bpmInput=p.locator('label:has-text("Tempo") input').first();await bpmInput.fill(String(a.bpm/2));await bpmInput.blur();await p.waitForTimeout(1500);
const c=(await proj());const cc=c.tracks[0].clips[0];
console.log(JSON.stringify({info,bpmBefore:a.bpm,lenBefore:ca.lenBeats,fit:ca.fit,bpmAfter:c.bpm,lenAfter:cc.lenBeats,expected:ca.lenBeats/2,errors}));await b.close()})();
