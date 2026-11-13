const {chromium}=require('playwright');const path=require('path');const html=path.resolve(process.argv[2]);
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:900}});
  const perr=[];p.on('pageerror',e=>perr.push(e.message.slice(0,200)));
  await p.addInitScript(()=>{window.__long=[];try{new PerformanceObserver(l=>{for(const e of l.getEntries())__long.push([Math.round(e.startTime),Math.round(e.duration)])}).observe({entryTypes:['longtask']})}catch{}
    window.__n=0;for(const k of ['createGain','createBufferSource','createOscillator','createBiquadFilter','createStereoPanner','createWaveShaper']){const o=BaseAudioContext.prototype[k];BaseAudioContext.prototype[k]=function(...a){if(!(this instanceof OfflineAudioContext))__n++;return o.apply(this,a)}}
    window.__ls=0;const ss=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){__ls+=String(v).length;return ss.call(this,k,v)};});
  await p.goto('file://'+html);await p.waitForTimeout(4000);
  const c=await p.context().newCDPSession(p);await c.send('HeapProfiler.enable');await c.send('Performance.enable');
  await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(3000);
  const gc=async()=>{await c.send('HeapProfiler.collectGarbage');return (await c.send('Runtime.getHeapUsage')).usedSize/1e6};
  const m=async()=>(await c.send('Performance.getMetrics')).metrics.reduce((o,x)=>(o[x.name]=x.value,o),{});
  const h0=await gc(),m0=await m(),t0=await p.evaluate(()=>({n:__n,l:__long.length,ls:__ls,t:performance.now()}));
  // gentle mouse movement over the play field (as a player would)
  const box={x:270,y:370,w:900,h:470};
  for(let i=0;i<400;i++){await p.mouse.move(box.x+box.w*(0.5+0.4*Math.sin(i/17)),box.y+box.h*(0.5+0.4*Math.cos(i/11)));await p.waitForTimeout(100);if(i%40===20)await p.mouse.click(box.x+box.w*(0.5+0.3*Math.sin(i/7)),box.y+box.h*0.5)}
  const m1=await m(),t1=await p.evaluate(()=>({n:__n,l:__long.length,ls:__ls,t:performance.now(),long:__long.slice(-200)})),hraw=(await c.send('Runtime.getHeapUsage')).usedSize/1e6,h1=await gc();
  const sec=(t1.t-t0.t)/1000,lt=t1.long.filter(x=>x[0]>t0.t);
  console.log(JSON.stringify({sec:+sec.toFixed(1),mainBusyPct:+(((m1.TaskDuration-m0.TaskDuration)/(m1.Timestamp-m0.Timestamp))*100).toFixed(1),scriptPct:+(((m1.ScriptDuration-m0.ScriptDuration)/(m1.Timestamp-m0.Timestamp))*100).toFixed(1),
    nodesPerSec:+((t1.n-t0.n)/sec).toFixed(1),heapAfterGC_start:+h0.toFixed(1),heapBeforeGC_end:+hraw.toFixed(1),heapAfterGC_end:+h1.toFixed(1),longTasks:lt.length,longMax:Math.max(0,...lt.map(x=>x[1])),longTotalMs:lt.reduce((a,x)=>a+x[1],0),storageBytesWritten:t1.ls-t0.ls,perr}));
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
