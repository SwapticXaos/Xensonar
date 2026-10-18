const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {load}=require('./offline_runtime.cjs'),{setup,pcmBytes}=require('./forge_speed2.cjs');
(async()=>{
 const root=path.resolve(process.argv[2]||'.'),runtimes=[load(root,{speed1:true}),load(root)],cases=[];
 for(const r of runtimes){r.run(setup);r.run(`var stageJob={key:'speed2-stage-check',sampleRate:48000,durationSec:.4,support:{plan:__speedCarrier,length:19200},recipe:{mode:'state',coupling:.64,variantRevision:'revised'},model:__speedModel,cecilia:xR('vocal',{vocal:{formantShift:7,vowel:3.4,breath:.8,presence:.9,vibratoCents:90,humanize:.7}})};var stageMaterial={runs:[{voice:0,startSample:0,endSample:19200,sourceStart:0,sourceEnd:30000,sourceOffset:0,sourceSpeed:1,timeMode:'loop',states:[{sample:0,nodeId:0,aperiodicity:.22},{sample:18000,nodeId:5,aperiodicity:.36}]}]};`);let ready=0,pcm=0;const Native=r.context.Worker;r.context.Worker=class extends Native{constructor(...args){super(...args);this.addEventListener('message',e=>{if(e.data?.ready)ready++;if(e.data?.value?.pcm instanceof Float32Array)pcm++;});}};r.receipts=()=>({ready,pcm});}
 for(const revision of ['revised','original']){
  for(const r of runtimes)r.run(`stageJob.recipe.variantRevision=${JSON.stringify(revision)};`);
  const outputs=[];
  for(const r of runtimes){outputs.push(await r.run(`(${revision==='original'?'__f352RenderCeciliaOriginal':'__f352RenderCecilia'})(stageJob,{material:stageMaterial})`));outputs.push(await r.run(`__F352Worker.run('synthetic',stageJob,{material:stageMaterial})`));}
  for(const out of outputs)assert.deepEqual(pcmBytes(out.pcm),pcmBytes(outputs[0].pcm),revision+' CPU/thread PCM');
  cases.push(revision);
 }
 for(const r of runtimes){assert.deepEqual(r.receipts(),{ready:2,pcm:2});const cancel=await r.run(`(async()=>{let interrupted=false,checks=0;setTimeout(()=>interrupted=true,0);try{await __F352DSP.spectrum(Float32Array.from({length:384000},(_,i)=>.2*Math.sin(i/17)),48000,{isCancelled:()=>{checks++;return interrupted}});return {caught:false,checks}}catch(error){return {caught:error.name==='AbortError',checks}}})()`);assert(cancel.caught&&cancel.checks<=65,JSON.stringify(cancel));}
 const report={status:'PASS',cases,actualWorkers:4,fullPCM:true,asyncSpectrumCancellation:true};fs.writeFileSync('results/speed2-cecilia-stages.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
})().catch(e=>{console.error(e.message?.slice(0,1000),e.stack?.split('\n').filter(s=>s.trim().startsWith('at ')).slice(0,4).join('\n'));process.exitCode=1;});
