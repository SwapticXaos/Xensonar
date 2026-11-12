// TEST ONLY (never part of index.html): what does recording stems cost? AudioRenderCapacity (render load of the audio thread) and main-thread time,
// idle Live Room vs. while recording stems, alternating runs.  Usage: node tools/probes/stems_cost.js dist/XenSonar_PROBE.html [rounds] [seconds]
const {chromium}=require('playwright');const path=require('node:path');
(async()=>{
 const html=path.resolve(process.argv[2]),rounds=+process.argv[3]||3,secs=+process.argv[4]||6;
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 const ctx=await b.newContext({viewport:{width:1440,height:900}});const p=await ctx.newPage();
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(3000);
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 const hasRC=await p.evaluate(()=>!!(__XenLiveStemSource.get().ctx.renderCapacity));
 const cdp=await ctx.newCDPSession(p);await cdp.send('Performance.enable');
 const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
 const measure=async()=>{
  await p.evaluate(()=>{window.__rc={n:0,avg:0,peak:0,under:0};const rc=__XenLiveStemSource.get().ctx.renderCapacity;if(!rc)return;rc.onupdate=e=>{window.__rc.n++;window.__rc.avg+=e.averageLoad;window.__rc.peak=Math.max(window.__rc.peak,e.peakLoad);window.__rc.under+=e.underrunRatio};rc.start({updateInterval:.5})});
  const a=await metrics();await p.waitForTimeout(secs*1000);const z=await metrics();
  const rc=await p.evaluate(()=>{const r=window.__rc;try{__XenLiveStemSource.get().ctx.renderCapacity.stop()}catch{}return{updates:r.n,avgLoad:r.n?+(r.avg/r.n).toFixed(4):null,peakLoad:+r.peak.toFixed(4),underrun:r.n?+(r.under/r.n).toFixed(5):null}});
  return{...rc,mainThreadSecPerSec:+((z.TaskDuration-a.TaskDuration)/secs).toFixed(3)};
 };
 await p.keyboard.down('KeyA');await p.waitForTimeout(500);
 const rows={idle:[],stems:[]};
 for(let r=0;r<rounds;r++){
  rows.idle.push(await measure());
  await p.evaluate(()=>__XenStemRecorder.start({name:'cost'}));await p.waitForTimeout(800);
  rows.stems.push(await measure());
  await p.evaluate(()=>__XenStemRecorder.stop());await p.waitForFunction(()=>['done','error'].includes(__XenStemRecorder.snapshot().phase),null,{timeout:90000});
  await p.waitForTimeout(1500);
 }
 await p.keyboard.up('KeyA');
 console.log(JSON.stringify({renderCapacityAvailable:hasRC,rows},null,1));
 await b.close();
})();
