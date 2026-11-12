// TEST ONLY (never part of index.html): main-thread cost of the Live Room while it plays, via Chrome DevTools metrics.
// Usage: node tools/probes/live_canvas_cost.js <html> [seconds] [dpr]    → prints TaskDuration / ScriptDuration / LayoutDuration per second and the canvas backing size.
const {chromium}=require('playwright');const path=require('node:path');
(async()=>{
 const html=path.resolve(process.argv[2]),secs=+process.argv[3]||6,dpr=+process.argv[4]||1;
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 const ctx=await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:dpr});const p=await ctx.newPage();
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 const cdp=await ctx.newCDPSession(p);await cdp.send('Performance.enable');
 const get=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
 const size=await p.evaluate(()=>{const c=document.querySelector('canvas[data-xen-play-area]');const r=c.getBoundingClientRect();return{backing:c.width+'x'+c.height,css:Math.round(r.width)+'x'+Math.round(r.height)}});
 const a=await get();await p.waitForTimeout(secs*1000);const z=await get();
 const per=k=>((z[k]-a[k])/secs).toFixed(3);
 console.log(JSON.stringify({dpr,canvas:size,taskSecPerSec:per('TaskDuration'),scriptSecPerSec:per('ScriptDuration'),layoutSecPerSec:per('LayoutDuration'),recalcStyleSecPerSec:per('RecalcStyleDuration')}));
 await b.close();
})();
