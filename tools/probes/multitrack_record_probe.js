/* Probe only (not shipped): ROOM4-14 recording an audio input onto a track (Chromium fake microphone: a periodic beep). */
const {chromium}=require('playwright');const path=require('path'),fs=require('fs'),os=require('os');
const target='file://'+path.resolve(process.argv[2]||path.join(__dirname,'../../index.html'));
const f=path.join(os.tmpdir(),'xen_rec_tone.wav');{const sr=48000,n=sr*6,buf=Buffer.alloc(44+n*4);buf.write('RIFF',0);buf.writeUInt32LE(36+n*4,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(2,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*4,28);buf.writeUInt16LE(4,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*4,40);for(let i=0;i<n;i++){const v=Math.round(5000*Math.sin(2*Math.PI*220*i/sr));buf.writeInt16LE(v,44+i*4);buf.writeInt16LE(v,46+i*4)}fs.writeFileSync(f,buf)}
(async()=>{const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required']});
const cx=await b.newContext({viewport:{width:1700,height:1000},acceptDownloads:true,permissions:['microphone']});const p=await cx.newPage();
const errors=[];p.on('pageerror',e=>errors.push(String(e).slice(0,200)));p.on('dialog',d=>d.accept());const log=o=>console.log(JSON.stringify(o));
await p.goto(target);await p.waitForTimeout(6000);
await p.evaluate(()=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();[...document.querySelectorAll('button')].find(b=>b.offsetParent&&n(b.innerText).endsWith('MULTITRACK'))?.click()});await p.waitForTimeout(3000);
await p.setInputFiles('.xmt input[type=file]',f);for(let i=0;i<40&&!(await p.$('.xmt .clip'));i++)await p.waitForTimeout(250);await p.waitForTimeout(1200);
const proj=()=>p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('xensonar-multitrack-v1');q.onsuccess=()=>{const g=q.result.transaction('projects').objectStore('projects').get('current');g.onsuccess=()=>r(g.result)}}));
log({step:'controls',rec:await p.locator('[data-xmt-rec]').count(),input:await p.locator('[data-xmt-rec-input]').count(),latencyDefault:await p.locator('[data-xmt-rec-latency]').inputValue()});
await p.locator('[data-xmt-rec]').click();await p.waitForTimeout(1500);
log({step:'recording',buttonText:await p.locator('[data-xmt-rec]').innerText(),status:await p.locator('.xmt .warn').first().innerText().catch(()=>null)});
await p.waitForTimeout(2500);await p.locator('[data-xmt-rec]').click();
for(let i=0;i<60&&(await proj()).tracks.length<2;i++)await p.waitForTimeout(500);await p.waitForTimeout(2000);
const pj=await proj();const nt=pj.tracks[pj.tracks.length-1];
log({step:'result',tracks:pj.tracks.map(t=>t.name),clip:nt.clips[0]?{start:nt.clips[0].startBeat,lenBeats:+nt.clips[0].lenBeats.toFixed(2),fit:nt.clips[0].fit,bpm:nt.clips[0].sourceBpm}:null,expectedLenBeatsAbout:+(4*pj.bpm/60).toFixed(2),status:await p.locator('.xmt .warn').first().innerText().catch(()=>'')});
await p.locator('.xmt .clip').last().click();await p.waitForTimeout(800);
log({step:'inspector for the recording',info:await p.locator('[data-clip-source-info]').first().innerText().catch(()=>null)});
// the recording itself must contain sound: silence the first track and export
await p.locator('.xmt .trk:not(.rr) .hdr button[aria-label^="Mute"]').first().click();await p.waitForTimeout(500);
await p.selectOption('.xmt select[aria-label^="Mixdown format"]','float32').catch(()=>{});
await p.locator('.xmt .ruler').first().click({button:'right',position:{x:5,y:5}});await p.waitForTimeout(250);
const [dl]=await Promise.all([p.waitForEvent('download',{timeout:90000}),p.evaluate(()=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();[...document.querySelectorAll('.xmt-menu [role=menuitem]')].find(x=>n(x.innerText).startsWith('Export mixdown (song)'))?.click()})]);
const file=path.join(os.tmpdir(),'xen_rec_out.wav');await dl.saveAs(file);const buf=fs.readFileSync(file),hdr=buf.indexOf('data')+8,fl=new Float32Array(buf.buffer.slice(buf.byteOffset+hdr,buf.byteOffset+buf.length-((buf.length-hdr)%4)));let ss=0,pk=0;for(const v of fl){ss+=v*v;pk=Math.max(pk,Math.abs(v))}
log({step:'export of the recording alone (first track muted)',seconds:+(fl.length/2/48000).toFixed(2),rms:+Math.sqrt(ss/fl.length).toFixed(4),peak:+pk.toFixed(3)});
log({step:'errors',errors});await b.close()})();
