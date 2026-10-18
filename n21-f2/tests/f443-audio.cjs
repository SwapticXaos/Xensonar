'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const {load}=require('./offline_runtime.cjs'),{setup,pcmBytes,median}=require('./forge_speed2.cjs');
const root=path.resolve(__dirname,'..'),contexts=[load(root,{forge443Baseline:true}),load(root)];for(const h of contexts)h.run(setup);
const report={checks:[],timings:[],limits:['Node/V8 offline measurement, not target browser, live audio, or musical preference.']};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const cases=[
  {name:'revised-stretch',mode:'stretch',sr:16000,dur:1.2},
  {name:'revised-loop',mode:'loop',sr:16000,dur:1.2},
  {name:'revised-hold',mode:'hold',sr:16000,dur:.7},
  {name:'identity',mode:'loop',sr:16000,dur:.6,identity:true},
  {name:'downsample',mode:'stretch',sr:8000,dur:.32},
  {name:'48k-polyphonic',mode:'stretch',sr:48000,dur:.6,poly:true},
  {name:'source-regions',mode:'loop',sr:16000,dur:.7,regions:true},
  {name:'spectral-envelope',mode:'stretch',sr:16000,dur:.45,envelope:true}
 ];
 for(const c of cases){
  if(process.env.F443_CASES&&!process.env.F443_CASES.split(',').includes(c.name))continue;
  const expression=`__F356Material.render(__caseCarrier,__speedModel,${c.sr},${c.dur},{workbench:__caseConfig,onProgress:p=>__progress.push(p)${c.envelope?',spectralEnvelope:({bins})=>Float64Array.from({length:bins},(_,i)=>.6+.3*Math.sin(i*.02))':''}})`;
  for(const h of contexts)h.run(`var __caseCarrier={...__speedCarrier,bands:__speedCarrier.bands.map(b=>({...b}))};var __caseConfig={...__speedWorkbench,params:{...__speedWorkbench.params,materialTime:'${c.mode}'},regions:${c.regions?"[{role:'include',start:.05,end:.42},{role:'exclude',start:.2,end:.22},{role:'include',start:.58,end:.95}]":"[]"}};${c.identity?'__caseCarrier.bands[0].centerRatioCurve=new Float32Array(121).fill(1);':''}${c.poly?'__caseCarrier.bands.push({...__caseCarrier.bands[0],centerRatioCurve:Float32Array.from(__caseCarrier.bands[0].centerRatioCurve,v=>v*1.5),gainCurve:Float32Array.from(__caseCarrier.bands[0].gainCurve,v=>v*.4)});':''}`);
  let reference,metadata,progress;const times=[[],[]];
  const runs=+(process.env.F443_RUNS||(c.name==='revised-stretch'?5:1));
  for(let repeat=-1;repeat<runs;repeat++)for(const idx of repeat%2?[0,1]:[1,0]){
   const h=contexts[idx];h.run('var __progress=[];__speedSeed()');const started=performance.now(),pcm=await h.run(expression),ms=performance.now()-started;
   const bytes=pcmBytes(pcm),meta=JSON.parse(JSON.stringify(pcm.donorMaterialPlan)),pr=Array.from(h.run('__progress'));
   if(!reference){reference=Buffer.from(bytes);metadata=meta;progress=pr}else{assert.deepEqual(bytes,reference,c.name+' PCM');assert.deepEqual(meta,metadata,c.name+' material');assert.deepEqual(pr,progress,c.name+' progress')}
   assert(pcm.every(Number.isFinite));if(repeat>=0)times[idx].push(ms);
  }
  report.checks.push({case:c.name,sha256:hash(reference),frames:reference.length/4,pcmIdentical:true,metadataIdentical:true,progressIdentical:true});
  const row={name:c.name,runs,baselineMs:median(times[0]),candidateMs:median(times[1]),times};row.savingPercent=100*(1-row.candidateMs/row.baselineMs);report.timings.push(row);console.log(JSON.stringify(row));
 }
 for(const h of contexts){
  await assert.rejects(h.run(`__F356Material.render(__speedCarrier,__speedModel,16000,1.2,{workbench:__speedWorkbench,isCancelled:()=>true})`),e=>e.name==='AbortError');
  h.run('var __cancel=false');await assert.rejects(h.run(`__F356Material.render(__speedCarrier,__speedModel,16000,1.2,{workbench:__speedWorkbench,isCancelled:()=>__cancel,onProgress:()=>{__cancel=true}})`),e=>e.name==='AbortError');
 }
 report.checks.push({case:'pre-start and progress cancellation',identical:true});
 // These use the real Worker bridge. Count receipts so a silent fallback cannot pass.
 for(const h of contexts)h.run(`var __workerReceipts={created:0,ready:0,pcm:0};var __NativeWorker=Worker;Worker=class extends __NativeWorker{constructor(...args){super(...args);__workerReceipts.created++;this.addEventListener('message',e=>{if(e.data?.ready)__workerReceipts.ready++;if(e.data?.pcm instanceof Float32Array)__workerReceipts.pcm++})}};`);
 const workerOutputs=[];
 for(const h of contexts){const out=await h.run(`__F356Worker.render(__speedCarrier,__speedModel,16000,.7,{workbench:__speedWorkbench})`);workerOutputs.push(out);const receipts=JSON.parse(JSON.stringify(h.run('__workerReceipts')));assert.deepEqual(receipts,{created:1,ready:1,pcm:1});}
 assert.deepEqual(pcmBytes(workerOutputs[1]),pcmBytes(workerOutputs[0]));assert.deepEqual(JSON.parse(JSON.stringify(workerOutputs[1].donorMaterialPlan)),JSON.parse(JSON.stringify(workerOutputs[0].donorMaterialPlan)));
 report.checks.push({case:'actual revised material workers',pcmIdentical:true,metadataIdentical:true,workerReceipts:{created:1,ready:1,pcm:1}});
 fs.writeFileSync(process.env.F443_OUT||path.join(root,'results/f443-audio.json'),JSON.stringify(report,null,2)+'\n');console.log('PASS full PCM, material, progress, abort, and actual workers');
})().catch(e=>{console.error(e);process.exitCode=1});
