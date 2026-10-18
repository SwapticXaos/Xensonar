'use strict';
const fs=require('fs'),assert=require('assert/strict'),{chromium}=require('playwright');
const baseline=fs.readFileSync('tests/fixtures/forge-progress/polytrace-baseline.js','utf8');
const timer=fs.readFileSync('tests/fixtures/forge-progress/polytrace-timer.js','utf8');
const m=require('../source-manifest.json'),html=fs.readFileSync(m.entry,'utf8').replace('const kEe=CEe("root");',`${timer};window.__bench={get timer(){return __forgePolytraceTimer},get raster(){return TR},get descriptor(){return LB},get store(){return pe},get grid(){return ph},get sync(){return tK},get cooperative(){return __forgePolytraceCooperative},baseline:(${baseline})};const kEe=CEe("root");`);
(async()=>{const b=await chromium.launch({executablePath:process.env.XEN_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{const p=await b.newPage();await p.route('https://xensonar.test/**',r=>r.fulfill({contentType:'text/html',body:html}));await p.goto('https://xensonar.test/bench');await p.waitForFunction(()=>window.__bench?.store?.getState());
 const results=await p.evaluate(async()=>{
  const x=__bench,s=x.store.getState(),g=s.spectralData;for(let i=0;i<g.width;i++)for(let y=0;y<g.height;y++)g.set(i,y,Math.abs(y-g.height*.65)<2?.65:0);
  const snap=s.createProjectSnapshot(),median=a=>[...a].sort((a,b)=>a-b)[a.length>>1],measure=fn=>{const t=performance.now();fn();return performance.now()-t};
  const raster=[],descriptor=[];for(let i=0;i<3;i++){x.raster(snap);x.descriptor(g);}for(let i=0;i<9;i++){raster.push(measure(()=>{for(let j=0;j<20;j++)x.raster(snap)})/20);descriptor.push(measure(()=>{for(let j=0;j<10;j++)x.descriptor(g)})/10)}
  const rows=[];for(const timbre of ['fm','acid','vocal']){
   const grid=new x.grid(96,96);for(let i=0;i<96;i++)grid.set(i,60,.6);const args={spectralData:grid,durationSec:8,sampleRate:48000,baseHz:220,gain:.46,maxVoices:12,timbre};
   x.baseline(args);x.sync(args);await x.cooperative({...args,descriptor:x.descriptor(grid)});
   const before=[],after=[],cooperative=[],timed=[];for(let i=0;i<7;i++){if(i%2){after.push(measure(()=>x.sync(args)));before.push(measure(()=>x.baseline(args)));}else{before.push(measure(()=>x.baseline(args)));after.push(measure(()=>x.sync(args)));}const elapsed=async fn=>{const t=performance.now();await fn({...args,descriptor:x.descriptor(grid)});return performance.now()-t;};if(i%2){timed.push(await elapsed(x.timer));cooperative.push(await elapsed(x.cooperative));}else{cooperative.push(await elapsed(x.cooperative));timed.push(await elapsed(x.timer));}}
   rows.push({timbre,renderedDurationSec:args.durationSec,baselineMs:median(before),syncMs:median(after),cooperativeMs:median(cooperative),timerMs:median(timed),timerRuns:timed,baselineRuns:before,syncRuns:after,cooperativeRuns:cooperative});
  }
  return {raster:{width:g.width,height:g.height,medianMs:median(raster),runs:raster,callsRemoved:{cacheHit:1,inflightJoin:1}},descriptor:{medianMs:median(descriptor),runs:descriptor,callsRemovedPerFullPolytraceRender:1},rows};
 });
 assert(results.raster.medianMs>0);for(const row of results.rows)assert(row.syncMs<row.baselineMs*1.4,'sync render must not regress by more than 40%: '+JSON.stringify(row));fs.mkdirSync('results/forge-progress',{recursive:true});fs.writeFileSync('results/forge-progress/performance.json',JSON.stringify({scope:'Chromium/V8; 7 alternating warmed render runs, 9 preparation batches; cooperative time includes real event-loop yields, not a synthetic wait',...results},null,2)+'\n');console.log(JSON.stringify(results,null,2));
 }finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
