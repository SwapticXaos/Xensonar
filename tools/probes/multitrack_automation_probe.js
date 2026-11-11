/* Probe only (not shipped): ROOM4-13 automation lanes in the real app, measured on the exported mixdown. */
const {chromium}=require('playwright');const path=require('path'),fs=require('fs'),os=require('os');
const target='file://'+path.resolve(process.argv[2]||path.join(__dirname,'../../index.html'));
const f=path.join(os.tmpdir(),'xen_auto_tone.wav');{const sr=48000,n=sr*3,buf=Buffer.alloc(44+n*4);buf.write('RIFF',0);buf.writeUInt32LE(36+n*4,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(2,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*4,28);buf.writeUInt16LE(4,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*4,40);for(let i=0;i<n;i++){const v=Math.round(7000*Math.sin(2*Math.PI*220*i/sr));buf.writeInt16LE(v,44+i*4);buf.writeInt16LE(v,46+i*4)}fs.writeFileSync(f,buf)}
function win(file){const buf=fs.readFileSync(file),hdr=buf.indexOf('data')+8,fl=new Float32Array(buf.buffer.slice(buf.byteOffset+hdr,buf.byteOffset+buf.length-((buf.length-hdr)%4)));const sr=48000;
 const r=(a,b,ch)=>{let s=0,n=0;for(let i=Math.floor(a*sr);i<Math.floor(b*sr);i++){s+=fl[2*i+ch]*fl[2*i+ch];n++}return +Math.sqrt(s/n).toFixed(4)};
 return {startL:r(.3,.7,0),startR:r(.3,.7,1),endL:r(2.2,2.6,0),endR:r(2.2,2.6,1),seconds:+(fl.length/2/sr).toFixed(2)}}
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const cx=await b.newContext({viewport:{width:1700,height:1000},acceptDownloads:true});const p=await cx.newPage();
const errors=[];p.on('pageerror',e=>errors.push(String(e).slice(0,200)));p.on('dialog',d=>d.accept());const log=o=>console.log(JSON.stringify(o));
await p.goto(target);await p.waitForTimeout(6000);
const mt=async()=>{await p.evaluate(()=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();[...document.querySelectorAll('button')].find(b=>b.offsetParent&&n(b.innerText).endsWith('MULTITRACK'))?.click()});await p.waitForTimeout(3000)};
await mt();await p.setInputFiles('.xmt input[type=file]',f);for(let i=0;i<40&&!(await p.$('.xmt .clip'));i++)await p.waitForTimeout(250);await p.waitForTimeout(1200);
await p.selectOption('.xmt select[aria-label^="Mixdown format"]','float32').catch(()=>{});
const proj=()=>p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('xensonar-multitrack-v1');q.onsuccess=()=>{const g=q.result.transaction('projects').objectStore('projects').get('current');g.onsuccess=()=>r(g.result)}}));
let k=0;const exp=async()=>{await p.waitForTimeout(900);await p.locator('.xmt .ruler').first().click({button:'right',position:{x:5,y:5}});await p.waitForTimeout(250);
 const [dl]=await Promise.all([p.waitForEvent('download',{timeout:90000}),p.evaluate(()=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();[...document.querySelectorAll('.xmt-menu [role=menuitem]')].find(x=>n(x.innerText).startsWith('Export mixdown (song)'))?.click()})]);
 const file=path.join(os.tmpdir(),'xen_auto_'+(k++)+'.wav');await dl.saveAs(file);return win(file)};
await p.locator('.xmt .clip').first().click();await p.waitForTimeout(300);await p.selectOption('.xmt label[title^="How the clip"] select','natural');await p.waitForTimeout(500);
const base=await exp();log({step:'no automation',export:base});
// lane: Volume x. Point at beat 0 (value 1) and beat 5 (value 0)
await p.selectOption('[data-xmt-auto-select]','volume');await p.waitForTimeout(500);
const svg=p.locator('[data-xmt-auto-svg]');const bb=await svg.boundingBox();log({step:'lane',visible:await svg.count(),width:Math.round(bb.width),height:Math.round(bb.height)});
const ppb=await p.evaluate(()=>{const c=document.querySelector('.xmt .clip'),L=parseFloat(c.style.width);return L/5.4});
const yAt=v=>bb.y+9+(1-v/2)*(bb.height-18);
await p.mouse.click(bb.x+1,yAt(1));await p.waitForTimeout(300);await p.mouse.click(bb.x+5*ppb,yAt(0));await p.waitForTimeout(900);
const pj=await proj();log({step:'curve drawn',volume:pj.tracks[0].auto?.volume?.map(q=>[+q.b.toFixed(2),+q.v.toFixed(2)])});
const v1=await exp();log({step:'export with a volume ramp 1 -> 0 over 5 beats',export:v1,fallDb:+(20*Math.log10(v1.endL/v1.startL)).toFixed(1),expectedAbout:-15.6});
// drag the second point up: the fall becomes shallower
const pts=await svg.locator('circle').all();const c1=await pts[1].boundingBox();await p.mouse.move(c1.x+c1.width/2,c1.y+c1.height/2);await p.mouse.down();await p.mouse.move(c1.x+c1.width/2,yAt(1),{steps:6});await p.mouse.up();await p.waitForTimeout(800);
log({step:'point dragged up',volume:(await proj()).tracks[0].auto?.volume?.map(q=>[+q.b.toFixed(2),+q.v.toFixed(2)])});
// live playback with the lane (no errors)
await p.locator('.xmt').click({position:{x:5,y:5}});await p.keyboard.press('Space');await p.waitForTimeout(2200);await p.keyboard.press('Space');await p.waitForTimeout(300);log({step:'live play with automation: ok'});
// double-click deletes a point
const c2=await svg.locator('circle').nth(1).boundingBox();await p.mouse.dblclick(c2.x+c2.width/2,c2.y+c2.height/2);await p.waitForTimeout(700);log({step:'double-click deletes a point',points:(await proj()).tracks[0].auto?.volume?.length});
await p.getByRole('button',{name:'Clear'}).click();await p.waitForTimeout(600);log({step:'clear',auto:(await proj()).tracks[0].auto??null});
const v2=await exp();log({step:'after clear: export as before',identical:JSON.stringify(v2)===JSON.stringify(base)});
// pan lane: left at the start, right at the end
await p.selectOption('[data-xmt-auto-select]','pan');await p.waitForTimeout(500);const bb2=await svg.boundingBox();const yp=v=>bb2.y+9+(1-(v+1)/2)*(bb2.height-18);
await p.mouse.click(bb2.x+1,yp(-1));await p.waitForTimeout(300);await p.mouse.click(bb2.x+5*ppb,yp(1));await p.waitForTimeout(900);
const pn=await exp();log({step:'pan -1 -> +1',export:pn,startLeftHeavy:pn.startL>pn.startR*2,endRightHeavy:pn.endR>pn.endL*2});
// persistence
await p.waitForTimeout(800);await p.reload();await p.waitForTimeout(6000);await mt();for(let i=0;i<40&&!(await p.$('.xmt .clip'));i++)await p.waitForTimeout(250);await p.waitForTimeout(1500);
await p.selectOption('.xmt select[aria-label^="Mixdown format"]','float32').catch(()=>{});
const pn2=await exp();log({step:'after reload',same:JSON.stringify(pn2)===JSON.stringify(pn)});
log({step:'errors',errors});await b.close()})();
