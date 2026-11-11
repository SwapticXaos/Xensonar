/* Probe only (not shipped): ROOM4-15 the synthetic plan: a drum pattern clip follows a tempo change by being played again by the drum engine
 * (brightness stays), versus tape (everything slows down and gets darker). Brightness = loudness-weighted zero-crossing rate measured only in the loud 10 ms frames (a per-second rate would halve with the longer pauses alone). */
const {chromium}=require('playwright');const path=require('path'),fs=require('fs'),os=require('os');
const target='file://'+path.resolve(process.argv[2]||path.join(__dirname,'../../index.html'));
function analyse(file){const buf=fs.readFileSync(file),hdr=buf.indexOf('data')+8,fl=new Float32Array(buf.buffer.slice(buf.byteOffset+hdr,buf.byteOffset+buf.length-((buf.length-hdr)%4)));const n=fl.length/2,sr=48000,F=Math.round(sr*.01);
 let mx=0;const rms=[];for(let f=0;f+F<=n;f+=F){let q=0;for(let i=f;i<f+F;i++)q+=fl[2*i]*fl[2*i];const r=Math.sqrt(q/F);rms.push(r);mx=Math.max(mx,r)}
 let zs=0,w=0,act=0;rms.forEach((r,k)=>{if(r>.03*mx){let z=0;for(let i=k*F+1;i<(k+1)*F;i++)if((fl[2*(i-1)]<0)!==(fl[2*i]<0))z++;zs+=z*r;w+=r;act++}});
 return {zcr:Math.round(zs/w/(F/sr)),activeSec:+(act*.01).toFixed(2),soundingSec:+(n/sr).toFixed(2)}}
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const cx=await b.newContext({viewport:{width:1700,height:1000},acceptDownloads:true});const p=await cx.newPage();
const errors=[];p.on('pageerror',e=>errors.push(String(e).slice(0,200)));p.on('dialog',d=>d.accept());const log=o=>console.log(JSON.stringify(o));
await p.goto(target);await p.waitForTimeout(7000);
await p.evaluate(()=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();[...document.querySelectorAll('button')].find(b=>b.offsetParent&&n(b.innerText).endsWith('MULTITRACK'))?.click()});await p.waitForTimeout(3000);
const proj=()=>p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('xensonar-multitrack-v1');q.onsuccess=()=>{const g=q.result.transaction('projects').objectStore('projects').get('current');g.onsuccess=()=>r(g.result)}}));
const opts=await p.$$eval('[data-xmt-add-drums] option',o=>o.map(x=>({v:x.value,t:x.textContent})).filter(x=>x.v));
await p.selectOption('[data-xmt-add-drums]',opts[0].v);for(let i=0;i<80&&!(await proj())?.tracks.some(t=>t.clips.length);i++)await p.waitForTimeout(500);await p.waitForTimeout(2000);
const c0=(await proj()).tracks[0].clips[0];log({step:'drum pattern clip',pattern:opts[0].t,synth:c0.synth,warp:c0.warp,fit:c0.fit,len:+c0.lenBeats.toFixed(2)});
await p.selectOption('.xmt select[aria-label^="Mixdown format"]','float32').catch(()=>{});
let k=0;const exp=async()=>{await p.waitForTimeout(1200);await p.locator('.xmt .ruler').first().click({button:'right',position:{x:5,y:5}});await p.waitForTimeout(250);
 const [dl]=await Promise.all([p.waitForEvent('download',{timeout:120000}),p.evaluate(()=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();[...document.querySelectorAll('.xmt-menu [role=menuitem]')].find(x=>n(x.innerText).startsWith('Export mixdown (song)'))?.click()})]);
 const file=path.join(os.tmpdir(),'xen_pw_'+(k++)+'.wav');await dl.saveAs(file);return analyse(file)};
const A=await exp();log({step:'at the original tempo',bpm:(await proj()).bpm,export:A});
// halve the tempo
const bpm0=(await proj()).bpm;const t=p.locator('label:has-text("Tempo") input').first();await t.fill(String(bpm0/2));await t.blur();
await p.locator('.xmt .clip').first().click();await p.waitForTimeout(500);
for(let i=0;i<80;i++){await p.waitForTimeout(500);const st=await p.locator('[data-clip-warp-info]').first().innerText().catch(()=>'');if(/pattern \d+ BPM/.test(st)){log({step:'info line',st});break}}
const B=await exp();log({step:'half tempo, pattern warp (engine plays it again)',export:B,longer:+(B.soundingSec/A.soundingSec).toFixed(2),brightnessRatio:+(B.zcr/A.zcr).toFixed(2)});
await p.selectOption('.xmt select[aria-label="Warp mode"]','tape');await p.waitForTimeout(800);
const C=await exp();log({step:'half tempo, tape warp (audio slowed down)',export:C,longer:+(C.soundingSec/A.soundingSec).toFixed(2),brightnessRatio:+(C.zcr/A.zcr).toFixed(2)});
await p.selectOption('.xmt select[aria-label="Warp mode"]','synth');await p.waitForTimeout(800);
// the lower-edge stretch also drives the synthetic tempo
await t.fill(String(bpm0));await t.blur();await p.waitForTimeout(800);await p.locator('.xmt .clip').first().click();
const box=await p.locator('.xmt .clip').first().boundingBox();const y=box.y+box.height*.8,x=box.x+box.width-3;await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x+box.width*.5,y,{steps:10});await p.mouse.up();await p.waitForTimeout(1200);
const c1=(await proj()).tracks[0].clips[0];log({step:'lower edge stretch on a pattern clip',stretch:+(c1.stretch||1).toFixed(3),warp:c1.warp,len:+c1.lenBeats.toFixed(2)});
for(let i=0;i<80;i++){await p.waitForTimeout(500);const st=await p.locator('[data-clip-warp-info]').first().innerText().catch(()=>'');if(/pattern \d+ BPM/.test(st)){log({step:'info line after stretch',st});break}}
const D=await exp();log({step:'stretched, pattern warp',export:D,brightnessRatio:+(D.zcr/A.zcr).toFixed(2)});
log({step:'errors',errors});await b.close()})();
