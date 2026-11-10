/* Probe only (not shipped): ROOM4-07 warp in the real app.
 * Drag the lower half of the right clip edge (stretch), compare tape vs granular by the measured pitch of the
 * exported mixdown, add a pitch offset, then reset and check the export is byte-identical to the untouched one. */
const {chromium}=require('playwright');const path=require('path'),fs=require('fs'),os=require('os'),crypto=require('crypto');
const target='file://'+path.resolve(process.argv[2]||path.join(__dirname,'../../index.html'));
const f=path.join(os.tmpdir(),'xen_warp_sine.wav');{const sr=48000,n=sr*4,buf=Buffer.alloc(44+n*4);buf.write('RIFF',0);buf.writeUInt32LE(36+n*4,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(2,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*4,28);buf.writeUInt16LE(4,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*4,40);for(let i=0;i<n;i++){const v=Math.round(8000*Math.sin(2*Math.PI*220*i/sr));buf.writeInt16LE(v,44+i*4);buf.writeInt16LE(v,46+i*4)}fs.writeFileSync(f,buf)}
function analyse(file){const buf=fs.readFileSync(file),hdr=buf.indexOf('data')+8,fl=new Float32Array(buf.buffer.slice(buf.byteOffset+hdr,buf.byteOffset+buf.length-((buf.length-hdr)%4)));
 const n=fl.length/2,sr=48000,x=new Float32Array(n);for(let i=0;i<n;i++)x[i]=fl[2*i];let last=n-1;while(last>0&&Math.abs(x[last])<1e-4)last--;
 // dominant frequency from zero crossings in the middle second of the sounding part
 const a=Math.floor(last*.3),b=Math.min(last,a+sr);let zc=0;for(let i=a+1;i<b;i++)if(x[i-1]<0&&x[i]>=0)zc++;let ss=0;for(let i=a;i<b;i++)ss+=x[i]*x[i];
 return {soundingSec:+(last/sr).toFixed(3),hz:+(zc/((b-a)/sr)).toFixed(1),rms:+Math.sqrt(ss/(b-a)).toFixed(4),sha:crypto.createHash('sha256').update(buf).digest('hex').slice(0,12)}}
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const cx=await b.newContext({viewport:{width:1600,height:1000},acceptDownloads:true});const p=await cx.newPage();
const errors=[];p.on('pageerror',e=>errors.push(String(e).slice(0,200)));p.on('dialog',d=>d.accept());
await p.goto(target);await p.waitForTimeout(6000);
await p.evaluate(()=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();[...document.querySelectorAll('button')].find(b=>b.offsetParent&&n(b.innerText).endsWith('MULTITRACK'))?.click()});await p.waitForTimeout(3000);
await p.setInputFiles('.xmt input[type=file]',f);for(let i=0;i<40&&!(await p.$('.xmt .clip'));i++)await p.waitForTimeout(250);await p.waitForTimeout(1500);
await p.selectOption('.xmt select[aria-label^="Mixdown format"]','float32').catch(()=>{});
const proj=()=>p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('xensonar-multitrack-v1');q.onsuccess=()=>{const g=q.result.transaction('projects').objectStore('projects').get('current');g.onsuccess=()=>r(g.result)}}));
const clip=async()=>{await p.waitForTimeout(900);const c=(await proj()).tracks[0].clips[0];return {len:c.lenBeats,stretch:c.stretch??1,warp:c.warp??'tape',pitch:c.pitch??0,start:c.startBeat,fit:c.fit}};
const info=()=>p.locator('[data-clip-warp-info]').first().innerText().catch(()=>null);
let k=0;const exportSong=async tag=>{await p.locator('.xmt .ruler').first().click({button:'right',position:{x:5,y:5}});await p.waitForTimeout(250);
 const [dl]=await Promise.all([p.waitForEvent('download',{timeout:90000}),p.evaluate(()=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();[...document.querySelectorAll('.xmt-menu [role=menuitem]')].find(x=>n(x.innerText).startsWith('Export mixdown (song)'))?.click()})]);
 const file=path.join(os.tmpdir(),'xen_warp_'+(k++)+'.wav');await dl.saveAs(file);return {tag,...analyse(file)}};
const out=[];const log=o=>{out.push(o);console.log(JSON.stringify(o))};
await p.locator('.xmt .clip').first().click();await p.waitForTimeout(400);
await p.selectOption('.xmt label[title^="How the clip"] select','natural');const c0=await clip();
log({step:'original',clip:c0,export:await exportSong('original')});
// drag the lower half of the right edge to the right: stretch
const box=await p.locator('.xmt .clip').first().boundingBox();const y=box.y+box.height*.8,x=box.x+box.width-3;
await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x+60,y,{steps:6});await p.mouse.move(x+box.width*.5,y,{steps:10});await p.mouse.up();
const c1=await clip();log({step:'drag lower right edge',clip:c1,ratio:+(c1.len/c0.len).toFixed(4),snappedToGrid:Math.abs(c1.len*4-Math.round(c1.len*4))<1e-6,info:await info(),export:await exportSong('tape')});
// upper half of the same edge still trims / loops (no stretch change)
{const bx=await p.locator('.xmt .clip').first().boundingBox();const yy=bx.y+bx.height*.2,xx=bx.x+bx.width-3;await p.mouse.move(xx,yy);await p.mouse.down();await p.mouse.move(xx+40,yy,{steps:5});await p.mouse.up();const c=await clip();log({step:'upper half still trims/loops',lenChanged:c.len!==c1.len,stretchSame:c.stretch===c1.stretch});await p.keyboard.press('Control+z');await p.waitForTimeout(500)}
await p.selectOption('.xmt select[aria-label="Warp mode"]','grain');let st='';for(let i=0;i<60;i++){await p.waitForTimeout(500);st=await info();if(/granular ready|tape-style/.test(st||''))break}
log({step:'warp granular',clip:await clip(),info:st,export:await exportSong('granular')});
await p.locator('label:has-text("Pitch ct") input').first().fill('1200');await p.locator('label:has-text("Pitch ct") input').first().blur();for(let i=0;i<60;i++){await p.waitForTimeout(500);st=await info();if(/\+1200 ct.*granular ready|tape-style/.test(st||''))break}
log({step:'pitch +1200 ct',clip:await clip(),info:st,export:await exportSong('granular+1200')});
// live playback with the variant (no errors, signal present)
await p.keyboard.press('Home').catch(()=>{});await p.locator('.xmt').click({position:{x:5,y:5}});await p.keyboard.press('Space');await p.waitForTimeout(2500);
const meter=await p.evaluate(()=>{const m=document.querySelector('.xmt .meter i, .xmt [class*=meter] i');return m?m.style.width:null});await p.keyboard.press('Space');
log({step:'live play',meter});
await p.locator('.xmt .clip').first().click();await p.getByRole('button',{name:'Reset warp'}).click();const c9=await clip();const e9=await exportSong('reset');
log({step:'reset warp',clip:c9,export:e9,identicalToOriginal:e9.sha===out[0].export.sha,lenBack:Math.abs(c9.len-c0.len)<1e-6});
log({step:'errors',errors});await b.close()})();
