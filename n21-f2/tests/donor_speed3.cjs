// Same production sources, fixed PCM and carrier. Alternating order; one warmup.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {load}=require('./offline_runtime.cjs');
const {setup,median}=require('./forge_speed2.cjs');
const probe=require('./donor_speed3_setup.cjs');
const roots=process.argv.slice(2).map(p=>p==='@speed2'?p:path.resolve(p));
if(roots.length!==2)throw Error('Usage: node tests/donor_speed3.cjs baseline candidate');
const runs=+(process.env.RUNS||3),report=[];
const cases=[
 {name:'texture',sr:16000,dur:1.2},
 {name:'periodic',sr:16000,dur:1.2},
 {name:'modal',sr:16000,dur:1.2},
 {name:'texture-48k',sr:48000,dur:.6},
 {name:'integer-downsample',sr:8000,dur:.32},
 {name:'real-wav',sr:16000,dur:.32}
].filter(c=>!process.env.CASES||process.env.CASES.split(',').includes(c.name));
const wav=fs.readFileSync(path.join(__dirname,'fixtures/donor_a.wav'));
// This controlled fixture is PCM16 mono with a 44-byte header.
assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt16LE(22),1);assert.equal(wav.readUInt16LE(34),16);
const wavSR=wav.readUInt32LE(24),wavSamples=[];for(let i=44;i<wav.length;i+=2)wavSamples.push(wav.readInt16LE(i)/32768);
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
(async()=>{
 for(const c of cases){
  const rt=roots.map(root=>root==='@speed2'?load(path.join(__dirname,'..'),{speed3Baseline:true}):load(root));
  for(const r of rt){r.run(setup);r.run(probe);
   if(c.name==='modal')r.run(`__auditModel.kind='modal';__auditConfig.params={...__auditConfig.params,tonal:1.3,noise:.7,resonance:.65,formant:4};`);
   if(c.name==='periodic')r.run(`__auditModel.kind='periodic';__auditModel.marks=Float64Array.from({length:340},(_,i)=>i*93+18);__auditModel.referenceHz=16000/93;__auditConfig.params={...__auditConfig.params,signaturePilot:true,sourceMotion:.65,spectralCohesion:.7,sourceSpectrum:.4,tonal:1.2,noise:.75,resonance:.8,formant:-3};`);
   if(c.name==='real-wav')r.run(`__auditModel.samples=Float32Array.from(${JSON.stringify(wavSamples)});__auditModel.sampleRate=${wavSR};__auditModel.bodyStart=600;__auditModel.bodyEnd=${wavSamples.length-600};__auditModel.sourceIndex={windows:[{id:0,startSample:600,endSample:${wavSamples.length-600},stateDistance:0}],representativeLevel:.15,fallback:false};`);
  }
  const times=[[],[]];let reference,metadata,progress;
  for(let rep=-1;rep<runs;rep++)for(const idx of rep%2===0?[1,0]:[0,1]){
   const r=rt[idx];r.run('var __speed3Progress=[]');
   const start=performance.now(),out=await r.run(`__ForgeF33.renderDonorHybrid(__auditPlan,__auditModel,${c.sr},${c.dur},{workbench:__auditConfig,onProgress:p=>__speed3Progress.push(p)})`),ms=performance.now()-start;
   const bytes=Buffer.from(out.buffer,out.byteOffset,out.byteLength),meta=JSON.parse(JSON.stringify(out.donorMaterialPlan)),pr=Array.from(r.run('__speed3Progress'));
   assert(out.every(Number.isFinite));
   if(!reference){reference=Buffer.from(bytes);metadata=meta;progress=pr;}
   else{assert.deepEqual(bytes,reference,c.name+' PCM');assert.deepEqual(meta,metadata,c.name+' metadata');assert.deepEqual(pr,progress,c.name+' progress');}
   if(rep>=0)times[idx].push(ms);
  }
  for(const r of rt)await assert.rejects(r.run(`__ForgeF33.renderDonorHybrid(__auditPlan,__auditModel,${c.sr},${c.dur},{workbench:__auditConfig,isCancelled:()=>true})`),e=>e.name==='AbortError');
  if(c.name==='texture')for(const r of rt){r.run('var __cancelOnProgress=false');await assert.rejects(r.run(`__ForgeF33.renderDonorHybrid(__auditPlan,__auditModel,${c.sr},${c.dur},{workbench:__auditConfig,isCancelled:()=>__cancelOnProgress,onProgress:p=>{__cancelOnProgress=true}})`),e=>e.name==='AbortError');}
  const row={name:c.name,sampleRate:c.sr,duration:c.dur,runs,baselineMs:median(times[0]),candidateMs:median(times[1]),times,sha256:hash(reference),bytes:reference.length,pcmIdentical:true,metadataIdentical:true,progressIdentical:true,abortIdentical:true};row.savingPercent=100*(1-row.candidateMs/row.baselineMs);report.push(row);console.log(JSON.stringify(row));
 }
 fs.writeFileSync(process.env.OUT||path.join(__dirname,'../results/speed3-donor.json'),JSON.stringify({runtime:process.version,roots,runs,report},null,2)+'\n');
})().catch(e=>{console.error(e.stack);process.exitCode=1});
