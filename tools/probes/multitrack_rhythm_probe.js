/* Probe only (not shipped): ROOM4-08 drum and bass patterns as direct Multitrack sources (no recording step). */
const {chromium}=require('playwright');const path=require('path'),fs=require('fs'),os=require('os');
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const cx=await b.newContext({viewport:{width:1600,height:1000},acceptDownloads:true});const p=await cx.newPage();
const errors=[];p.on('pageerror',e=>errors.push(String(e).slice(0,200)));p.on('dialog',d=>d.accept());
await p.goto('file://'+path.resolve(process.argv[2]||path.join(__dirname,'../../index.html')));await p.waitForTimeout(7000);
await p.evaluate(()=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();[...document.querySelectorAll('button')].find(b=>b.offsetParent&&n(b.innerText).endsWith('MULTITRACK'))?.click()});await p.waitForTimeout(3000);
const proj=()=>p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('xensonar-multitrack-v1');q.onsuccess=()=>{const g=q.result.transaction('projects').objectStore('projects').get('current');g.onsuccess=()=>r(g.result)}}));
const log=o=>console.log(JSON.stringify(o));
const opts=async sel=>p.$$eval(sel+' option',o=>o.map(x=>({v:x.value,t:x.textContent})).filter(x=>x.v));
const drums=await opts('[data-xmt-add-drums]'),bass=await opts('[data-xmt-add-bass]');
log({step:'lists',drums:drums.length,bass:bass.length,firstDrums:drums.slice(0,4).map(x=>x.t),firstBass:bass.slice(0,4).map(x=>x.t)});
const status=()=>p.evaluate(()=>[...document.querySelectorAll('.xmt .warn, .xmt .sr')].map(e=>e.innerText).filter(Boolean).join(' | ').slice(0,200));
const add=async(sel,opt,tag)=>{const before=(await proj())?.tracks.flatMap(t=>t.clips).length||0;await p.selectOption(sel,opt.v);let after=before;for(let i=0;i<80&&after===before;i++){await p.waitForTimeout(500);after=(await proj())?.tracks.flatMap(t=>t.clips).length||0}
 await p.waitForTimeout(1500);const pr=await proj(),t=pr.tracks[pr.tracks.length-1],c=t.clips[0];
 log({step:tag,chosen:opt.t,added:after-before,track:t.name,clip:c?{fit:c.fit,sourceBpm:c.sourceBpm,len:c.lenBeats,start:c.startBeat}:null,status:await status()});return c};
if(drums.length)await add('[data-xmt-add-drums]',drums[0],'add drum pattern');
if(drums.length>3)await add('[data-xmt-add-drums]',drums[3],'add another drum pattern');
if(bass.length)await add('[data-xmt-add-bass]',bass[0],'add bass pattern');
await p.locator('.xmt .clip').first().click();await p.waitForTimeout(800);
log({step:'inspector',info:await p.locator('[data-clip-source-info]').first().innerText().catch(()=>null),clips:await p.locator('.xmt .clip').count()});
await p.selectOption('.xmt select[aria-label^="Mixdown format"]','float32').catch(()=>{});
await p.locator('.xmt .ruler').first().click({button:'right',position:{x:5,y:5}});await p.waitForTimeout(250);
const [dl]=await Promise.all([p.waitForEvent('download',{timeout:90000}),p.evaluate(()=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();[...document.querySelectorAll('.xmt-menu [role=menuitem]')].find(x=>n(x.innerText).startsWith('Export mixdown (song)'))?.click()})]);
const file=path.join(os.tmpdir(),'xen_rhythm_mix.wav');await dl.saveAs(file);const buf=fs.readFileSync(file),hdr=buf.indexOf('data')+8,fl=new Float32Array(buf.buffer.slice(buf.byteOffset+hdr,buf.byteOffset+buf.length-((buf.length-hdr)%4)));let ss=0,pk=0;for(const v of fl){ss+=v*v;pk=Math.max(pk,Math.abs(v))}
log({step:'mixdown',seconds:+(fl.length/2/48000).toFixed(2),rms:+Math.sqrt(ss/fl.length).toFixed(4),peak:+pk.toFixed(3)});
log({step:'errors',errors});await b.close()})();
