/* Probe only (not shipped): measures main-thread load, timers, rAF loops, source starts and output RMS per room phase.
 * Run: node tools/probes/room_activity_probe.js [out.json]  (Playwright + Chromium, headless; no audio hardware). */
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 const p=await b.newPage({viewport:{width:1600,height:1000}});
 await p.addInitScript({path:__dirname+'/room_activity_instrument.js'});
 const cdp=await p.context().newCDPSession(p);await cdp.send('Performance.enable');
 const metr=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
 await p.goto('file://'+require('path').resolve(__dirname,'../../index.html'));await p.waitForTimeout(6000);
 const out=[];
 async function phase(name,sec){await p.evaluate(()=>__probe.reset());const m0=await metr();const rms=[];
   for(let k=0;k<sec;k++){await p.waitForTimeout(1000);rms.push((await p.evaluate(()=>__probe.rms())).map(x=>x.rms))}
   const m1=await metr();const r=await p.evaluate(()=>__probe.read());
   const busy=((m1.TaskDuration-m0.TaskDuration)/sec*100).toFixed(1),script=((m1.ScriptDuration-m0.ScriptDuration)/sec*100).toFixed(1);
   const peakRms=rms.length?rms[0].map((_,i)=>Math.max(...rms.map(x=>x[i]||0))):[];
   const row={phase:name,mainThreadBusyPct:busy,scriptPct:script,perSec:{timeouts:(r.timeouts/sec).toFixed(1),raf:(r.raf/sec).toFixed(1),sourceStarts:(r.sourceStarts/sec).toFixed(1)},intervalsActive:r.intervalsActive,workletNodesNew:r.workletNodes,ctx:r.ctx.map((c,i)=>({state:c.state,sr:c.sr,peakRms:peakRms[i]})),rafTop:r.rafTop};
   out.push(row);console.log(JSON.stringify(row));}
 const click=async t=>{const ok=await p.evaluate(t=>{const norm=x=>(x||'').replace(/\s+/g,' ').trim();const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&(norm(b.innerText||b.getAttribute('aria-label')||b.title)===t||norm(b.innerText).replace(/^[IVX]+ /,'')===t.replace(/^[IVX]+ /,'')));if(!b)return false;b.click();return true},t);if(!ok)throw Error('no button '+t);await p.waitForTimeout(1500)};
 await phase('A boot idle (Live Room, Power aus)',5);
 await click('Power');
 await phase('B Live Room Power an',8);
 
 await click('II MATERIAL FORGE');
 await phase('C Material Forge (Live Power war an)',8);
 
 await click('III NODAL CENTER');
 await phase('D Nodal Center',8);
 await click('I LIVE ROOM');
 await phase('E zurück Live Room',8);
 await click('Power');
 await phase('F Live Room Power aus',5);
 await click('II MATERIAL FORGE');
 await phase('G Forge (Power aus)',6);
 fs.writeFileSync(process.argv[2]||'room_activity_result.json',JSON.stringify(out,null,1));
 await b.close();
})();
