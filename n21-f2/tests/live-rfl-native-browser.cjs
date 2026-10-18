'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const m=JSON.parse(fs.readFileSync('source-manifest.json')),boot='const kEe=CEe("root");iY.createRoot(kEe).render(u.jsx(P.StrictMode,{children:u.jsx(REe,{})}));';
let html=fs.readFileSync(m.entry,'utf8');assert(html.includes(boot));html=html.replace(boot,'window.__rfl={plan:R3,render:oy,settings:Fw,tuning:vG};'+boot);
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.XEN_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://xensonar.test/**',r=>r.fulfill({contentType:'text/html',body:html}));await page.goto('https://xensonar.test/native');await page.waitForFunction(()=>!!window.__rfl);
  const rows=await page.evaluate(async()=>{
   const rows=[],api=window.__rfl;
   for(const mode of ['flowing','fragment'])for(const rate of [44100,48000,96000]){
    const ctx=new OfflineAudioContext(2,Math.ceil(rate*1.5),rate),buffer=ctx.createBuffer(1,24000,48000),pcm=buffer.getChannelData(0);pcm.fill(.5,14400);
    const tuning=api.tuning(api.settings({qualityMode:mode==='flowing'?'base':'fragment',windowMs:76,stepMs:26},mode==='flowing'?'flowing':'grainy'));
    let count=0;
    for(let i=0;i<47;i++){
     const plan=api.plan({buffer,currentTimeSec:0,mode,windowStartSec:.02+i*.026,windowDurationSec:.076,
      desiredLoopDurationSec:1,transportAnchorSec:0,loopStartSec:.05,loopEndSec:.3,
      rawTargetHz:[220,880,110,330][Math.floor(i/7)%4],previousSmoothedRootHz:null,entryRootHz:220,sessionAnchorHz:null,stepSec:.026,tuning});
     api.render({ctx,destination:ctx.destination,buffer,plan,registerGrain(){count++}});
    }
    const rendered=await ctx.startRendering();let peak=0;
    for(const v of rendered.getChannelData(0)){if(!Number.isFinite(v))throw Error('nonfinite PCM');peak=Math.max(peak,Math.abs(v));}
    rows.push({mode,rate,nativeGrains:count,excludedTransientPeak:peak});
   }
   return rows;
  });
  for(const r of rows){console.log(JSON.stringify(r));assert(r.nativeGrains>0);assert.equal(r.excludedTransientPeak,0,'native interpolation must not blend material beyond the crop');}
  assert.deepEqual(errors,[]);fs.writeFileSync('results/live-stability/native-browser.json',JSON.stringify({rows,errors},null,2)+'\n');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
