/* Probe only (not shipped): ROOM4-05 mixdown PCM + EQ parity.
 * Run: node tools/probes/multitrack_mixdown_probe.js <index.html> -> prints JSON incl. RMS/hash of the exported 32-bit float WAV
 * Compare an old and a new build:  node ... old.html ; node ... new.html ; Note: Room IV has no UI to set a track EQ yet (the key 'arrangement:<trackId>' is not user-reachable), so parity is checked with a flat EQ. */
const {chromium}=require('playwright');const path=require('path'),fs=require('fs'),os=require('os'),crypto=require('crypto');
const target='file://'+path.resolve(process.argv[2]||path.join(__dirname,'../../index.html'));
const f=path.join(os.tmpdir(),'xen_mix_stereo.wav');{const sr=48000,n=sr*4,buf=Buffer.alloc(44+n*4);buf.write('RIFF',0);buf.writeUInt32LE(36+n*4,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(2,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*4,28);buf.writeUInt16LE(4,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*4,40);
 let s=1;for(let i=0;i<n;i++){s=(s*1103515245+12345)&0x7fffffff;const w=(s/0x7fffffff-.5)*2,t=i/sr;buf.writeInt16LE(Math.round(6000*(.5*w+Math.sin(2*Math.PI*220*t))),44+i*4);buf.writeInt16LE(Math.round(6000*(.5*w+Math.sin(2*Math.PI*330*t))),46+i*4)}fs.writeFileSync(f,buf)}
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1600,height:1000},acceptDownloads:true});const p=await ctx.newPage();
const errors=[];p.on('pageerror',e=>errors.push(String(e).slice(0,200)));
await p.goto(target);await p.waitForTimeout(6000);
await p.evaluate(()=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();[...document.querySelectorAll('button')].find(b=>b.offsetParent&&n(b.innerText).endsWith('MULTITRACK'))?.click()});await p.waitForTimeout(3000);
await p.setInputFiles('.xmt input[type=file]',f);for(let i=0;i<40&&!(await p.$('.xmt .clip'));i++)await p.waitForTimeout(250);await p.waitForTimeout(1500);
await p.selectOption('.xmt select[aria-label^="Mixdown format"]','float32').catch(()=>{});
const usage=await p.evaluate(async()=>{const pr=await new Promise(r=>{const q=indexedDB.open('xensonar-multitrack-v1');q.onsuccess=()=>{const g=q.result.transaction('projects').objectStore('projects').get('current');g.onsuccess=()=>r(g.result)}});const m=pr.tracks[0].clips[0].materialId;return {used:await __XenMultitrackInbox.usage(m),unused:await __XenMultitrackInbox.usage('nope')}});console.log(JSON.stringify({usage}));
await p.locator('.xmt .ruler').first().click({button:'right'});await p.waitForTimeout(300);
const [dl]=await Promise.all([p.waitForEvent('download',{timeout:60000}),p.evaluate(()=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();[...document.querySelectorAll('.xmt-menu [role=menuitem]')].find(x=>n(x.innerText).startsWith('Export mixdown (loop)'))?.click()})]);
const file=await dl.path();const buf=fs.readFileSync(file);const hdr=buf.indexOf('data')+8;const fl=new Float32Array(buf.buffer.slice(buf.byteOffset+hdr,buf.byteOffset+buf.length-((buf.length-hdr)%4)));
let ss=0,pk=0;for(const v of fl){ss+=v*v;pk=Math.max(pk,Math.abs(v))}
console.log(JSON.stringify({bytes:buf.length,samples:fl.length,rms:Math.sqrt(ss/fl.length),peak:pk,sha:crypto.createHash('sha256').update(buf).digest('hex').slice(0,16),errors}));
fs.writeFileSync(process.env.OUT||path.join(os.tmpdir(),'xen_mix_out.wav'),buf);await b.close()})();
