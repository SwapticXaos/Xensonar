const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {load}=require('./offline_runtime.cjs');
(async()=>{
 const root=path.resolve(process.argv[2]||'.'),runtime=load(root);
 runtime.run('window.__refactor={wb:__F341Workbench,material:__F356Material,originalMaterial:__F356MaterialOriginal,gestalt:__F356Gestalt,originalGestalt:__F356GestaltOriginal,workers:[__F356WorkerOriginal,__F356GestaltWorkerOriginal,__F356Worker,__F356GestaltWorker]};');
 const source=fs.readFileSync(path.join(__dirname,'refactor_characterization.cjs'),'utf8');
 const start='const result=await page.evaluate(async()=>{',end='\n  });\n  assert.deepEqual(errors,[]);';
 const script='(async()=>{'+source.split(start)[1].split(end)[0]+'\n})()';
 const result=await runtime.run(script),expected=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/clean2_refactor_characterization.json')));
 assert.deepEqual(JSON.parse(JSON.stringify(result)),expected);
 console.log(JSON.stringify({status:'PASS',presets:result.audio.length,downsampleCases:result.downsampled.length,workers:result.workers.length,workerReceipts:result.workerReceipts,bytes:'complete Float32 PCM fixture identical',runtime:process.version}));
})().catch(e=>{console.error(e.message?.slice(0,1400),e.stack?.split('\n').filter(s=>s.trim().startsWith('at ')).slice(0,5).join('\n'));process.exitCode=1;});
