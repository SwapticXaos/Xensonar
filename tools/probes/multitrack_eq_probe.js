/* Probe only (not shipped): ROOM4-11 per-track EQ in the real app: draw a cut, hear it in the export, survive reload and undo. */
const {chromium}=require('playwright');const path=require('path'),fs=require('fs'),os=require('os');
const target='file://'+path.resolve(process.argv[2]||path.join(__dirname,'../../index.html'));
const f=path.join(os.tmpdir(),'xen_eq_tone.wav');{const sr=48000,n=sr*3,buf=Buffer.alloc(44+n*4);buf.write('RIFF',0);buf.writeUInt32LE(36+n*4,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(2,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*4,28);buf.writeUInt16LE(4,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*4,40);
 // two tones: 220 Hz and 3520 Hz, equal level
 for(let i=0;i<n;i++){const v=Math.round(4500*(Math.sin(2*Math.PI*220*i/sr)+Math.sin(2*Math.PI*3520*i/sr)));buf.writeInt16LE(v,44+i*4);buf.writeInt16LE(v,46+i*4)}fs.writeFileSync(f,buf)}
function tones(file){const buf=fs.readFileSync(file),hdr=buf.indexOf('data')+8,fl=new Float32Array(buf.buffer.slice(buf.byteOffset+hdr,buf.byteOffset+buf.length-((buf.length-hdr)%4)));const sr=48000,a=sr,b=sr*2;
 let rms=0;for(let i=0;i<fl.length;i+=2)rms+=fl[i]*fl[i];rms=Math.sqrt(rms/(fl.length/2));const mag=hz=>{let re=0,im=0;for(let i=a;i<b;i++){const x=fl[2*i],w=2*Math.PI*hz*i/sr;re+=x*Math.cos(w);im+=x*Math.sin(w)}return +(2*Math.sqrt(re*re+im*im)/(b-a)).toFixed(4)};return {low220:mag(220),high3520:mag(3520),rms:+rms.toFixed(4),seconds:+(fl.length/2/sr).toFixed(2),hdr}}
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const cx=await b.newContext({viewport:{width:1700,height:1000},acceptDownloads:true});const p=await cx.newPage();
const errors=[];p.on('pageerror',e=>errors.push(String(e).slice(0,200)));p.on('dialog',d=>d.accept());
const log=o=>console.log(JSON.stringify(o));
await p.goto(target);await p.waitForTimeout(6000);
const mt=async()=>{await p.evaluate(()=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();[...document.querySelectorAll('button')].find(b=>b.offsetParent&&n(b.innerText).endsWith('MULTITRACK'))?.click()});await p.waitForTimeout(3000)};
await mt();await p.setInputFiles('.xmt input[type=file]',f);for(let i=0;i<40&&!(await p.$('.xmt .clip'));i++)await p.waitForTimeout(250);await p.waitForTimeout(1200);
await p.selectOption('.xmt select[aria-label^="Mixdown format"]','float32').catch(()=>{});
const proj=()=>p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('xensonar-multitrack-v1');q.onsuccess=()=>{const g=q.result.transaction('projects').objectStore('projects').get('current');g.onsuccess=()=>r(g.result)}}));
let k=0;const exp=async()=>{await p.waitForTimeout(700);await p.locator('.xmt .ruler').first().click({button:'right',position:{x:5,y:5}});await p.waitForTimeout(250);
 const [dl]=await Promise.all([p.waitForEvent('download',{timeout:90000}),p.evaluate(()=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();[...document.querySelectorAll('.xmt-menu [role=menuitem]')].find(x=>n(x.innerText).startsWith('Export mixdown (song)'))?.click()})]);
 const file=path.join(os.tmpdir(),'xen_eq_'+(k++)+'.wav');await dl.saveAs(file);return tones(file)};
await p.locator('.xmt .clip').first().click();await p.waitForTimeout(400);await p.selectOption('.xmt label[title^="How the clip"] select','natural');await p.waitForTimeout(600);
const base=await exp();log({step:'no EQ',export:base,project:(await proj()).tracks[0].eq?'has eq':'no eq'});
await p.locator('[data-xmt-eq]').click();await p.waitForTimeout(1200);
const panel=p.locator('[data-xmt-eq-panel]');log({step:'EQ panel',open:await panel.count(),canvases:await panel.locator('canvas').count()});
// draw: brush along the lower part of the first canvas, left to right: a cut across the whole spectrum
const cv=panel.locator('canvas').first();const bb=await cv.boundingBox();
await p.mouse.move(bb.x+4,bb.y+bb.height*.92);await p.mouse.down();await p.mouse.move(bb.x+bb.width-4,bb.y+bb.height*.92,{steps:40});await p.mouse.up();await p.waitForTimeout(1500);
const pj=await proj();log({step:'drawn',saved:pj.tracks[0].eq?{aMin:Math.min(...pj.tracks[0].eq.a).toFixed(2),aMax:Math.max(...pj.tracks[0].eq.a).toFixed(2),morph:pj.tracks[0].eq.morph}:null,badge:await p.locator('.xmt .tn').first().innerText()});
const cut=await exp();log({step:'export with EQ',export:cut,attenuation220Db:+(20*Math.log10(cut.low220/base.low220)).toFixed(1),attenuation3520Db:+(20*Math.log10(cut.high3520/base.high3520)).toFixed(1)});
// undo of something else must not roll the EQ back
await p.locator('.xmt').click({position:{x:5,y:5}});await p.keyboard.press('Control+d');await p.waitForTimeout(500);await p.keyboard.press('Control+z');await p.waitForTimeout(800);
log({step:'undo of another edit keeps the EQ',eqStill:!!(await proj()).tracks[0].eq});
// reload the whole app: the arrangement brings its EQ back
await p.waitForTimeout(800);await p.reload();await p.waitForTimeout(6000);await mt();for(let i=0;i<40&&!(await p.$('.xmt .clip'));i++)await p.waitForTimeout(250);await p.waitForTimeout(1500);
await p.selectOption('.xmt select[aria-label^="Mixdown format"]','float32').catch(()=>{});
const after=await exp();log({step:'after reload',export:after,attenuation220Db:+(20*Math.log10(after.low220/base.low220)).toFixed(1),attenuation3520Db:+(20*Math.log10(after.high3520/base.high3520)).toFixed(1)});
// reset: flat curve again removes it from the project
await p.locator('.xmt .clip').first().click();await p.locator('[data-xmt-eq]').click();await p.waitForTimeout(1000);
log({step:'errors',errors});await b.close()})();
