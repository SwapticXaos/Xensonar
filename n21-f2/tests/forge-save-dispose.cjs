'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{load}=require('./offline_runtime.cjs');
const h=load(process.cwd());
(async()=>{
 const result=await h.run(`(async()=>{
 const snapshot=pe.getState().createProjectSnapshot();snapshot.materialExport.name='Obsolete saved work';let release;
 const record={id:'workspace:autosave-v1',value:{version:'spectral-forge-experiment-v1',projectSnapshot:snapshot}};
 const before=pe.getState().materialExport.name;
 const controller=__ForgeF33.createExperimentStatePersistenceController({store:pe,runtime:Vt,prepareDonor:async()=>null,storage:{get:()=>new Promise(resolve=>release=resolve),put:async()=>{}}});
 const starting=controller.start();for(let i=0;i<30&&!release;i++)await Promise.resolve();if(!release)throw Error('restore did not reach storage');controller.dispose();release(record);await starting;
 return {before,after:pe.getState().materialExport.name};})()`);
 const donorResults=await h.run(`(async()=>{
 async function scenario(failure){let resolve,reject,commits=0,errors=0,stops=0;const source={kind:'audio',fileName:'late.wav',sampleRate:8000,originalDuration:.1,channelCount:1,monoSamples:new Float32Array(800)},snapshot=pe.getState().createProjectSnapshot();
 const record={value:{version:'spectral-forge-experiment-v1',projectSnapshot:snapshot,donorSource:{assetId:'asset:late',importStartSec:0,importDurationSec:.1}}};
 const runtime={getSnapshot:()=>({source:null,model:null}),beginExtraction:()=>1,commitExtraction:()=>{commits++;return true},failExtraction:()=>{errors++},stop:()=>{stops++},subscribe:()=>()=>{}};
 const controller=__ForgeF33.createExperimentStatePersistenceController({store:pe,runtime,storage:{get:async id=>id==='asset:late'?{value:source}:record,put:async()=>{}},prepareDonor:()=>new Promise((a,b)=>{resolve=a;reject=b})});
 const pending=controller.start();for(let i=0;i<50&&!resolve;i++)await Promise.resolve();if(!resolve)throw Error('Donor preparation not reached');controller.dispose();if(failure)reject(Error('obsolete donor decode'));else resolve({});await pending;return {failure,commits,errors,stops};}
 return [await scenario(false),await scenario(true)];})()`);
 for(const row of donorResults){assert.equal(row.commits,0);assert.equal(row.errors,0);assert.equal(row.stops,0)}result.donors=donorResults;
 fs.writeFileSync('results/forge-smoothness/restore-dispose.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));assert.equal(result.after,result.before,'disposed persistence owner must not overwrite newer work with a late restore');console.log('PASS late restore cannot change the workspace after disposal');
})().catch(error=>{console.error(error);process.exitCode=1});
