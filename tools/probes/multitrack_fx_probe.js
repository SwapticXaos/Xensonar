/* Probe only (not shipped): ROOM4-09 track effects, clip reverse and normalize in the real app (measured on the exported mixdown). */
const {chromium}=require('playwright');const path=require('path'),fs=require('fs'),os=require('os'),crypto=require('crypto');
const target='file://'+path.resolve(process.argv[2]||path.join(__dirname,'../../index.html'));
const f=path.join(os.tmpdir(),'xen_fx_ramp.wav');{const sr=48000,n=sr*4,buf=Buffer.alloc(44+n*4);buf.write('RIFF',0);buf.writeUInt32LE(36+n*4,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(2,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*4,28);buf.writeUInt16LE(4,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*4,40);for(let i=0;i<n;i++){const v=Math.round(9000*(1-i/n)*Math.sin(2*Math.PI*220*i/sr));buf.writeInt16LE(v,44+i*4);buf.writeInt16LE(v,46+i*4)}fs.writeFileSync(f,buf)}
function analyse(file){const buf=fs.readFileSync(file),hdr=buf.indexOf('data')+8,fl=new Float32Array(buf.buffer.slice(buf.byteOffset+hdr,buf.byteOffset+buf.length-((buf.length-hdr)%4)));const n=fl.length/2,sr=48000;
 const rms=(a,b)=>{a=Math.max(0,Math.round(a*sr));b=Math.min(n,Math.round(b*sr));if(b<=a)return 0;let s=0;for(let i=a;i<b;i++)s+=fl[2*i]*fl[2*i];return +Math.sqrt(s/(b-a)).toFixed(5)};
 return {seconds:+(n/sr).toFixed(2),first:rms(0,1),last:rms(3,4),after:rms(4.15,4.9),lateTail:rms(5,6),sha:crypto.createHash('sha256').update(buf).digest('hex').slice(0,12)}}
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const cx=await b.newContext({viewport:{width:1700,height:1000},acceptDownloads:true});const p=await cx.newPage();
const errors=[];p.on('pageerror',e=>errors.push(String(e).slice(0,200)));p.on('dialog',d=>d.accept());
await p.goto(target);await p.waitForTimeout(6000);
await p.evaluate(()=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();[...document.querySelectorAll('button')].find(b=>b.offsetParent&&n(b.innerText).endsWith('MULTITRACK'))?.click()});await p.waitForTimeout(3000);
await p.setInputFiles('.xmt input[type=file]',f);for(let i=0;i<40&&!(await p.$('.xmt .clip'));i++)await p.waitForTimeout(250);await p.waitForTimeout(1500);
await p.selectOption('.xmt select[aria-label^="Mixdown format"]','float32').catch(()=>{});
await p.locator('.xmt .clip').first().click();await p.waitForTimeout(300);await p.selectOption('.xmt label[title^="How the clip"] select','natural');await p.waitForTimeout(600);
const proj=()=>p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('xensonar-multitrack-v1');q.onsuccess=()=>{const g=q.result.transaction('projects').objectStore('projects').get('current');g.onsuccess=()=>r(g.result)}}));
let k=0;const exp=async()=>{await p.waitForTimeout(700);await p.locator('.xmt .ruler').first().click({button:'right',position:{x:5,y:5}});await p.waitForTimeout(250);
 const [dl]=await Promise.all([p.waitForEvent('download',{timeout:90000}),p.evaluate(()=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();[...document.querySelectorAll('.xmt-menu [role=menuitem]')].find(x=>n(x.innerText).startsWith('Export mixdown (song)'))?.click()})]);
 const file=path.join(os.tmpdir(),'xen_fx_'+(k++)+'.wav');await dl.saveAs(file);return analyse(file)};
const range=(label,v)=>p.evaluate(([label,v])=>{const el=[...document.querySelectorAll('[data-xmt-fx] label')].find(l=>l.textContent.trim().startsWith(label))?.querySelector('input');if(!el)return false;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(v));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true},[label,v]);
const fx=async()=>(await proj()).tracks[0].fx??null;const log=o=>console.log(JSON.stringify(o));
const base=await exp();log({step:'no effects',fxBar:await p.locator('[data-xmt-fx]').count(),export:base});
await range('Low cut',1);const e1=await exp();log({step:'low cut 2 kHz on a 220 Hz tone',fx:await fx(),export:e1,attenuationDb:+(20*Math.log10(e1.first/base.first)).toFixed(1)});
await p.locator('[data-xmt-fx] button',{hasText:'FX off'}).click();const e2=await exp();log({step:'FX off',fx:await fx(),identicalToNoEffects:e2.sha===base.sha});
await range('Echo beats',1);await range('Feedback',.5);await range('Echo mix',.6);const e3=await exp();log({step:'echo 1 beat',fx:await fx(),export:e3,tailAfterClipEnd:e3.after>1e-4,longerFile:e3.seconds>base.seconds});
await p.locator('[data-xmt-fx] button',{hasText:'FX off'}).click();await range('Reverb',.6);const e4=await exp();log({step:'reverb send',fx:await fx(),export:e4,tailAfterClipEnd:e4.after>1e-4});
// live: play with reverb, switch an effect on while playing (chain rebuild), stop
await p.locator('.xmt').click({position:{x:5,y:5}});await p.keyboard.press('Space');await p.waitForTimeout(1500);await range('Drive',.5);await p.waitForTimeout(1200);
const meter=await p.evaluate(()=>{const m=[...document.querySelectorAll('.xmt *')].find(e=>e.style&&e.style.width&&/%$/.test(e.style.width)&&e.parentElement?.className?.includes?.('meter'));return m?m.style.width:null});await p.keyboard.press('Space');
log({step:'live with effects, drive switched on while playing',meter,fx:await fx()});
await p.locator('[data-xmt-fx] button',{hasText:'FX off'}).click();await p.waitForTimeout(400);
// reverse (the tone fades out, reversed it fades in) and normalize
const menu=async label=>{await p.locator('.xmt .clip').first().click({button:'right'});await p.waitForTimeout(250);await p.evaluate(l=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();[...document.querySelectorAll('.xmt-menu [role=menuitem]')].find(x=>n(x.innerText).startsWith(l))?.click()},label);await p.waitForTimeout(900)};
await menu('Reverse');await p.waitForTimeout(1500);const e5=await exp();log({step:'reverse',clipReverse:(await proj()).tracks[0].clips[0].reverse===true,export:e5,fadesInNow:e5.first<e5.last,wasFadingOut:base.first>base.last});
await menu('Play forwards');const e6=await exp();log({step:'forwards again',identicalToNoEffects:e6.sha===base.sha});
await menu('Normalize');log({step:'normalize',gain:(await proj()).tracks[0].clips[0].gain});
log({step:'errors',errors});await b.close()})();
