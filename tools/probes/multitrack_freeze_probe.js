/* Probe only (not shipped): ROOM4-12 bounce / freeze in the real app, measured on the exported mixdown. */
const {chromium}=require('playwright');const path=require('path'),fs=require('fs'),os=require('os');
const target='file://'+path.resolve(process.argv[2]||path.join(__dirname,'../../index.html'));
const f=path.join(os.tmpdir(),'xen_fz_tone.wav');{const sr=48000,n=sr*3,buf=Buffer.alloc(44+n*4);buf.write('RIFF',0);buf.writeUInt32LE(36+n*4,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(2,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*4,28);buf.writeUInt16LE(4,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*4,40);for(let i=0;i<n;i++){const v=Math.round(7000*Math.sin(2*Math.PI*220*i/sr));buf.writeInt16LE(v,44+i*4);buf.writeInt16LE(v,46+i*4)}fs.writeFileSync(f,buf)}
function analyse(file){const buf=fs.readFileSync(file),hdr=buf.indexOf('data')+8,fl=new Float32Array(buf.buffer.slice(buf.byteOffset+hdr,buf.byteOffset+buf.length-((buf.length-hdr)%4)));const sr=48000,n=fl.length/2;
 const a=Math.floor(sr*.8),b=Math.floor(sr*1.8);let zc=0,ss=0;for(let i=a+1;i<b;i++){if(fl[2*(i-1)]<0&&fl[2*i]>=0)zc++;ss+=fl[2*i]*fl[2*i]}return {hz:+(zc/((b-a)/sr)).toFixed(1),rms:+Math.sqrt(ss/(b-a)).toFixed(4),seconds:+(n/sr).toFixed(2)}}
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const cx=await b.newContext({viewport:{width:1700,height:1000},acceptDownloads:true});const p=await cx.newPage();
const errors=[];p.on('pageerror',e=>errors.push(String(e).slice(0,200)));p.on('dialog',d=>d.accept());const log=o=>console.log(JSON.stringify(o));
await p.goto(target);await p.waitForTimeout(6000);
await p.evaluate(()=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();[...document.querySelectorAll('button')].find(b=>b.offsetParent&&n(b.innerText).endsWith('MULTITRACK'))?.click()});await p.waitForTimeout(3000);
await p.setInputFiles('.xmt input[type=file]',f);for(let i=0;i<40&&!(await p.$('.xmt .clip'));i++)await p.waitForTimeout(250);await p.waitForTimeout(1200);
await p.selectOption('.xmt select[aria-label^="Mixdown format"]','float32').catch(()=>{});
const proj=()=>p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('xensonar-multitrack-v1');q.onsuccess=()=>{const g=q.result.transaction('projects').objectStore('projects').get('current');g.onsuccess=()=>r(g.result)}}));
let k=0;const exp=async()=>{await p.waitForTimeout(900);await p.locator('.xmt .ruler').first().click({button:'right',position:{x:5,y:5}});await p.waitForTimeout(250);
 const [dl]=await Promise.all([p.waitForEvent('download',{timeout:90000}),p.evaluate(()=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();[...document.querySelectorAll('.xmt-menu [role=menuitem]')].find(x=>n(x.innerText).startsWith('Export mixdown (song)'))?.click()})]);
 const file=path.join(os.tmpdir(),'xen_fz_'+(k++)+'.wav');await dl.saveAs(file);return analyse(file)};
const menu=async(label,sel='.xmt .hdr')=>{await p.locator(sel).first().click({button:'right'});await p.waitForTimeout(250);const ok=await p.evaluate(l=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();const it=[...document.querySelectorAll('.xmt-menu [role=menuitem]')].find(x=>n(x.innerText).startsWith(l));if(!it||it.disabled)return false;it.click();return true},label);await p.waitForTimeout(500);return ok};
const tr=async()=>{const pr=await proj();return pr.tracks.map(t=>({n:t.name,frozenBy:!!t.frozenBy,bounceOf:!!t.bounceOf,clips:t.clips.length,fit:t.clips[0]?.fit,len:+(t.clips[0]?.lenBeats||0).toFixed(3),vol:t.volume}))};
await p.locator('.xmt .clip').first().click();await p.waitForTimeout(300);await p.selectOption('.xmt label[title^="How the clip"] select','natural');await p.waitForTimeout(500);
// the track gets an octave up (granular pitch) so that the bounce has something worth rendering
await p.locator('.xmt .hdr input[aria-label^="Pitch of"]').first().fill('1200');await p.waitForTimeout(500);
for(let i=0;i<60;i++){await p.waitForTimeout(500);const st=await p.locator('[data-clip-warp-info]').first().innerText().catch(()=>'');if(/granular ready/.test(st))break}
const A=await exp();log({step:'before: track +1200 ct',export:A});
log({step:'freeze',menu:await menu('Freeze track')});for(let i=0;i<60&&(await tr()).length<2;i++)await p.waitForTimeout(500);await p.waitForTimeout(1500);
const t1=await tr();log({step:'tracks after freeze',tracks:t1,frozenHeader:await p.locator('.xmt .tn').first().innerText(),fadedLane:await p.locator('.xmt .trk.frozen').count()});
const B=await exp();log({step:'export after freeze (original asleep, bounce plays)',export:B,sameTone:Math.abs(B.hz-A.hz)<3,levelDiffDb:+(20*Math.log10(B.rms/A.rms)).toFixed(2)});
await p.locator('.xmt').click({position:{x:5,y:5}});await p.keyboard.press('Space');await p.waitForTimeout(1800);await p.keyboard.press('Space');await p.waitForTimeout(300);log({step:'live play with a frozen track: ok'});
log({step:'unfreeze',menu:await menu('Unfreeze track')});await p.waitForTimeout(1000);
const t2=await tr();const C=await exp();log({step:'after unfreeze',tracks:t2,export:C,sameAsBefore:Math.abs(C.hz-A.hz)<3&&Math.abs(20*Math.log10(C.rms/A.rms))<.2});
log({step:'bounce (keep original)',menu:await menu('Bounce to a new track')});for(let i=0;i<60&&(await tr()).length<2;i++)await p.waitForTimeout(500);await p.waitForTimeout(1500);
const t3=await tr();const D=await exp();log({step:'after bounce: both tracks sound',tracks:t3,export:D,levelVsBeforeDb:+(20*Math.log10(D.rms/A.rms)).toFixed(2)});
log({step:'errors',errors});await b.close()})();
