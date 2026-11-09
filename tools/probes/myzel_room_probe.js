/* Probe only (not shipped): Mycelium (Nodal Art Installation) activity across rooms. Run: node tools/probes/myzel_room_probe.js */
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1600,height:1000}});
await p.addInitScript({path:__dirname+'/room_activity_instrument.js'});
const cdp=await p.context().newCDPSession(p);await cdp.send('Performance.enable');
const metr=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
await p.goto('file://'+require('path').resolve(__dirname,'../../index.html'));await p.waitForTimeout(6000);
const clk=async t=>{const ok=await p.evaluate(t=>{const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&(b.innerText||'').replace(/\s+/g,' ').trim().includes(t));if(b)b.click();return !!b},t);if(!ok)throw Error('no '+t);await p.waitForTimeout(2000)};
async function phase(name,sec){await p.evaluate(()=>__probe.reset());const m0=await metr();const rms=[];
 for(let k=0;k<sec;k++){await p.waitForTimeout(1000);rms.push(Math.max(0,...(await p.evaluate(()=>__probe.rms())).map(x=>x.rms)))}
 const m1=await metr();const r=await p.evaluate(()=>__probe.read());
 console.log(JSON.stringify({phase:name,busy:((m1.TaskDuration-m0.TaskDuration)/sec*100).toFixed(1),timeoutsPerSec:(r.timeouts/sec).toFixed(1),rafPerSec:(r.raf/sec).toFixed(1),startsPerSec:(r.sourceStarts/sec).toFixed(1),peakRms:Math.max(...rms).toFixed(4),ctx:r.ctx.map(c=>c.state),rafTop:r.rafTop.map(x=>x[0])}))}
await clk('NODAL CENTER');await clk('Art Installation');
await clk('Mycelium · OFF');
await phase('H Nodal Installation, Myzel an',6);
await clk('LIVE ROOM');
await phase('I Live Room (Myzel an, Power aus)',6);
await clk('MATERIAL FORGE');
await phase('J Forge (Myzel an)',6);
await b.close();})();
