const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {load}=require('./offline_runtime.cjs'),{median}=require('./forge_speed2.cjs');
const roots=process.argv.slice(2).map(p=>p==='@speed2'?p:path.resolve(p)),runs=+(process.env.RUNS||3);
if(roots.length!==2)throw Error('Usage: node tests/dual_speed3.cjs baseline candidate');
const init=`
var __dualSources={};
for(const [slot,sr,hz] of [['A',22050,173],['B',96000,257]]){
 const samples=Float32Array.from({length:sr},(_,i)=>.17*Math.sin(i*2*Math.PI*hz/sr)+.065*Math.sin(i*2*Math.PI*hz*2.12/sr)+.02*Math.cos(i*.031));
 __dualSources[slot]={samples,sampleRate:sr,duration:1,revision:'speed3-'+slot};
}
var __dualPlan={schema:'xensonar-dual-donor-ui-v2',sources:{A:{revision:'speed3-A'},B:{revision:'speed3-B'}},
 regions:[{id:'a',slot:'A',x0:.04,x1:.94,y0:.08,y1:.93,feature:'all'},{id:'b',slot:'B',x0:.03,x1:.91,y0:.06,y1:.94,feature:'texture'}],
 links:[{id:'l',a:'a',b:'b',mode:'cross',direction:'A_to_B'}],remainder:'linked_only'};
var __dualSettings={duration:.4,strength:.8};`;
const cases=[];for(const revision of ['original','revised'])for(const mode of ['cross','interlock','imprint'])cases.push({revision,mode});
cases.push({revision:'revised',mode:'imprint',direction:'B_to_A',remainder:'keep_A'});
(async()=>{
 const report=[];
 for(const c of cases.filter(c=>!process.env.CASES||process.env.CASES.split(',').includes(c.revision+'-'+c.mode+(c.direction?'-'+c.direction:'')))){const rt=roots.map(root=>root==='@speed2'?load(path.join(__dirname,'..'),{speed3Baseline:true}):load(root));for(const r of rt){r.run(init);r.run(`__dualPlan.revision=${JSON.stringify(c.revision)};__dualPlan.links[0].mode=${JSON.stringify(c.mode)};__dualPlan.links[0].direction=${JSON.stringify(c.direction||'A_to_B')};__dualPlan.remainder=${JSON.stringify(c.remainder||'linked_only')};`);}
  const times=[[],[]];let reference,meta,progress;
  for(let rep=-1;rep<runs;rep++)for(const idx of rep%2===0?[1,0]:[0,1]){
   const r=rt[idx];r.run('var __dualProgress=[]');const t=performance.now();
   const out=await r.run('__F35636DualDSP.render(__dualPlan,__dualSources,__dualSettings,{onProgress:p=>__dualProgress.push(p)})'),ms=performance.now()-t;
   const bytes=Buffer.from(out.samples.buffer),metadata=JSON.parse(JSON.stringify(out.manifest)),pr=Array.from(r.run('__dualProgress'));
   if(!reference){reference=Buffer.from(bytes);meta=metadata;progress=pr;}else{assert.deepEqual(bytes,reference);assert.deepEqual(metadata,meta);assert.deepEqual(pr,progress);}
   if(rep>=0)times[idx].push(ms);
  }
  let receipts=0;const NativeWorker=rt[1].context.Worker;rt[1].context.Worker=class extends NativeWorker{constructor(...args){super(...args);receipts++;}};
  const direct=await rt[1].run('__F35636DualDSP.render(__dualPlan,__dualSources,__dualSettings)');
  const worker=await rt[1].run('__F35636DualWorker.render(__dualPlan,__dualSources,__dualSettings)');
  assert.equal(receipts,1,'Actual Worker must run');
  await assert.rejects(rt[1].run('__F35636DualDSP.render(__dualPlan,__dualSources,__dualSettings,{isCancelled:()=>true})'),e=>e.name==='AbortError');
  await assert.rejects(rt[1].run('__F35636DualWorker.render(__dualPlan,__dualSources,__dualSettings,{isCancelled:()=>true})'),e=>e.name==='AbortError');
  assert.deepEqual(Buffer.from(worker.samples.buffer),Buffer.from(direct.samples.buffer));assert.deepEqual(JSON.parse(JSON.stringify(worker.manifest)),JSON.parse(JSON.stringify(direct.manifest)));
  const row={...c,baselineMs:median(times[0]),candidateMs:median(times[1]),times,sha256:crypto.createHash('sha256').update(reference).digest('hex'),pcmIdentical:true,metadataIdentical:true,progressIdentical:true,workerIdentical:true,workerReceipts:receipts,abortIdentical:true};row.savingPercent=100*(1-row.candidateMs/row.baselineMs);report.push(row);console.log(JSON.stringify(row));
 }
 fs.writeFileSync(process.env.OUT||path.join(__dirname,'../results/speed3-dual.json'),JSON.stringify({runtime:process.version,roots,runs,report},null,2)+'\n');
})().catch(e=>{console.error(e.stack);process.exitCode=1});
