/* Probe only (not shipped): LIVEZONE-01/02 behaviour in the real layout.
 * Run: node tools/probes/livezone_probe.js [path/to/index.html]  (headless Chromium, no audio hardware). */
const {chromium}=require('playwright');const path=require('path');
const target='file://'+path.resolve(process.argv[2]||path.resolve(__dirname,'../../index.html'));
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:1600,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(String(e).slice(0,200)));
const dialogs=[];let answer=true;p.on('dialog',async d=>{dialogs.push(d.message().slice(0,60));answer?await d.accept():await d.dismiss()});
await p.addInitScript({path:path.join(__dirname,'room_activity_instrument.js')});
await p.goto(target);await p.waitForTimeout(6000);
const clk=async t=>{const ok=await p.evaluate(t=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&(n(b.innerText)===t||n(b.innerText).endsWith(' '+t)||n(b.getAttribute('aria-label'))===t));if(b)b.click();return !!b},t);if(!ok)throw Error('no button '+t);await p.waitForTimeout(2000)};
const has=t=>p.evaluate(t=>[...document.querySelectorAll('button')].some(b=>b.offsetParent&&(b.innerText||'').includes(t)),t);
async function level(name,sec=4){await p.evaluate(()=>__probe.reset());let peak=0;for(let k=0;k<sec;k++){await p.waitForTimeout(1000);peak=Math.max(peak,...(await p.evaluate(()=>__probe.rms())).map(x=>x.rms),0)}
 const r=await p.evaluate(()=>__probe.read());const room=await p.evaluate(()=>(document.querySelector('[class*="room-btn"][class*="bg-"]:not([class*="border"])')?.innerText||'').replace(/\s+/g,' ').trim());const row={step:name,room,ctx:r.ctx.map(c=>c.state).join(','),peakRms:+peak.toFixed(4),timeoutsPerSec:+(r.timeouts/sec).toFixed(1),rafPerSec:+(r.raf/sec).toFixed(1),startsPerSec:+(r.sourceStarts/sec).toFixed(1)};console.log(JSON.stringify(row));return row}
const out={};
await clk('Power');out.live=await level('1 Live Room, Power an');
await clk('NODAL CENTER');out.nodal=await level('2 Nodal Center (Live-Bereich, Power bleibt an)');
await clk('LIVE ROOM');out.liveBack=await level('3 zurück Live Room');
await clk('MATERIAL FORGE');out.forge=await level('4 Material Forge (kalt)');
await clk('LIVE ROOM');out.liveAfterForge=await level('5 zurück Live Room (bleibt aus)');
// Mycelium: formation must survive
await clk('NODAL CENTER');await clk('Art Installation');const shotBefore=await p.screenshot();await clk('Mycelium · OFF');out.myzelOn=await level('6 Art Installation, Myzel an');
await clk('MATERIAL FORGE');out.forgeMyzel=await level('7 Forge (Myzel war an)');
console.log(JSON.stringify({step:'7b Myzel-Schalter nach Rückkehr',myzelOffLabel:await (async()=>{await clk('NODAL CENTER');await clk('Art Installation');return await has('Mycelium · OFF')})()}));
const shotAfter=await p.screenshot();
console.log(JSON.stringify({step:'7c Art Installation vor Myzel-an vs. nach Rückkehr (Bilder im tmp-Ordner)',equal:Buffer.compare(shotBefore,shotAfter)===0,bytes:[shotBefore.length,shotAfter.length]}));
require('fs').writeFileSync(path.join(require('os').tmpdir(),'livezone_before.png'),shotBefore);require('fs').writeFileSync(path.join(require('os').tmpdir(),'livezone_after.png'),shotAfter);
// Context sleep / wake
await clk('LIVE ROOM');out.ctxLive=await level('8 Live Room, alles aus (Kontext läuft)',2);
await clk('MATERIAL FORGE');out.ctxForge=await level('9 Forge, alles aus (nach 1,5 s angehalten)',3);
await clk('LIVE ROOM');out.ctxBack=await level('10 zurück Live Room (Kontext wieder an)',2);
await clk('Power');out.powerAgain=await level('11 Power an nach Rückkehr: hörbar');
// Recording guard (before the switch)
await clk('Rec');
answer=false;await clk('MATERIAL FORGE');out.recCancel=await level('12 Rec läuft, Rückfrage -> Cancel: bleibt im Live Room, Live läuft');
answer=true;await clk('MATERIAL FORGE');out.recOk=await level('13 Rec läuft, Rückfrage -> OK: Forge, Live aus, Kontext läuft (Aufnahme)',3);
console.log(JSON.stringify({dialogs,errors}));await b.close();})();
