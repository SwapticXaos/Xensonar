'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const pw=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const {go,seed,download,executable}=require('./test_package_station_browser_p4.cjs');
(async()=>{const browser=await pw.chromium.launch({executablePath:executable,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const {context,page}=await go(browser);await seed(page,8);const dir=path.join(__dirname,'../test-results-p4');await download(page,path.join(dir,'large-baseline.xenpack'));
 const client=await context.newCDPSession(page);const results=[];
 for(const mb of [8,128,512]){if(mb!==8)await seed(page,mb);await client.send('HeapProfiler.collectGarbage');const before=await client.send('Runtime.getHeapUsage');let peak={...before},stopped=false;
  const monitor=(async()=>{while(!stopped){const h=await client.send('Runtime.getHeapUsage');if(h.usedSize+(h.backingStorageSize||0)>peak.usedSize+(peak.backingStorageSize||0))peak=h;await new Promise(r=>setTimeout(r,100))}})();
  const result=await page.evaluate(async()=>{const api=window.__XenPackageStation4,t=api._test,start=performance.now(),out=await t.exportSpool('large',null);const info=await t.walk(out);const r={bytes:out.size,records:info.records,elapsedMs:performance.now()-start,stats:api.stats(),kind:out.kind};await out.remove();return r});
  stopped=true;await monitor;results.push({fixtureMiB:mb,...result,before,peak});console.log('LARGE',JSON.stringify(results.at(-1)));
 }
 assert(results.at(-1).bytes-results[0].bytes>=504*1024*1024);assert(results[1].stats.maxChunk<=1048576);assert(results[1].stats.maxRecordBinary===results[0].stats.maxRecordBinary);
 const working=r=>r.peak.usedSize+(r.peak.backingStorageSize||0)-r.before.usedSize-(r.before.backingStorageSize||0);
 assert(working(results.at(-1))<working(results[0])+96*1024*1024,'temporary working set should not follow total library size');
 fs.writeFileSync(path.join(__dirname,'../test-results-p4/large-report.json'),JSON.stringify({results,workingGrowthBytes:working(results.at(-1))-working(results[0]),pass:true},null,2));
 await context.close();}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
