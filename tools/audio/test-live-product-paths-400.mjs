import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {root} from './c11-test-harness.mjs';
import {installAudioClock} from './c11-host-test-harness.mjs';
const require=createRequire(import.meta.url), esbuild=require('esbuild');
const r=await esbuild.build({stdin:{contents:`
 export {useBrowserWaveStarterImplant} from './src/features/xensonar/browserImplant/useBrowserWaveStarterImplant';
 export {useBrowserEntrophonImplant} from './src/features/xensonar/browserImplant/useBrowserEntrophonImplant';
 export {playScheduledToneWithLifecycle} from './src/features/xensonar/audio/scheduledTonePlaybackBoundary';
 export {resetEntrophonSoundConfig} from './src/core/audio/xensonarMicrotonalSoundEngine';
 `,resolveDir:root},bundle:true,write:false,platform:'browser',format:'esm',define:{'import.meta.env.VITE_XENSONAR_BROWSER_IMPLANT_DEFAULT':'"1"'},plugins:[{
 name:'test-react-lifecycle-and-master-destination',setup(b){
  b.onResolve({filter:/^react$/},()=>({path:'react',namespace:'lifecycle'}));
  b.onLoad({filter:/.*/,namespace:'lifecycle'},()=>({contents:`
   export const useRef=v=>({current:v}); export const useCallback=f=>f;
   export const useState=v=>[typeof v==='function'?v():v,()=>{}];
   export const useEffect=f=>{globalThis.__mounts.push(f)};
   export const useMemo=f=>f();`,loader:'js'}));
  b.onLoad({filter:/liveMasterBusRuntimeBoundary\.ts$/},()=>({contents:'export const getLiveMasterBusRuntime=ctx=>ctx.destination;',loader:'ts'}));
  b.onLoad({filter:/(useBrowserWaveStarterImplant|scheduledTonePlaybackBoundary)\.ts$/},args=>{
   let contents=fs.readFileSync(args.path,'utf8');
   contents=contents.replace('const plan = buildResolvedWaveStarterNativeCorePlan({','globalThis.__directBuilds++; const plan = buildResolvedWaveStarterNativeCorePlan({');
   contents=contents.replace('const microVoice = resolveXensonarMicrotonalVoice({','globalThis.__entrophonBuilds++; const microVoice = resolveXensonarMicrotonalVoice({');
   return {contents,loader:'ts',resolveDir:path.dirname(args.path)};
  });
 }}]});
const product=await import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));
const cases=[];
for(const sab of [false,true]){
 const rig=installAudioClock({sab});
 globalThis.__mounts=[];globalThis.__directBuilds=0;globalThis.__entrophonBuilds=0;
 product.resetEntrophonSoundConfig();
 const direct=product.useBrowserWaveStarterImplant({audioCtx:rig.ctx,liveMasterBusRuntimeRefs:{}});
 product.useBrowserEntrophonImplant({audioCtx:rig.ctx,liveMasterBusRuntimeRefs:{}});
 const cleanups=globalThis.__mounts.map(f=>f()).filter(Boolean);
 for(let i=0;i<200&&!(rig.instances.length===2&&rig.instances.every(n=>n.processor.ready&&!n.processor.muted));i++)await new Promise(r=>setTimeout(r,5));
 assert.equal(rig.instances.length,2);
 assert(rig.instances.every(n=>n.processor.ready&&!n.processor.muted),JSON.stringify(rig.messages.slice(-8)));
 for(let i=0;i<10003;i++)direct.tryAttack({frequencyHz:220+i%3*55,volume:.3,isSector:false,requestedAtMs:performance.now(),soundId:'glass_ping'});
 assert(globalThis.__directBuilds>=3&&globalThis.__directBuilds<=16);
 let released=0;
 const deps={ctx:rig.ctx,heldLong:false,activeScheduledTonesRef:{current:[]},
  transientRuntime:{admitVoice:()=>null,pickTargets:t=>t,releaseVoice:()=>released++},
  getMainOutput:()=>{throw new Error('Legacy graph touched after C11 ownership');},silentHotPathSources:{wave:true}};
 const request={freq:220,offset:0,dur:.18,type:'sawtooth',volume:.2,q:1.1,cutoff:2800,options:{source:'wave',prominence:1}};
 for(let i=0;i<10003;i++)product.playScheduledToneWithLifecycle(deps,request);
 const directBuilt=globalThis.__directBuilds, entBuilt=globalThis.__entrophonBuilds;
 assert(entBuilt>=3&&entBuilt<=16,`unexpected Entrophon work ${entBuilt}`);
 await rig.pump();
 let nonzero=[0,0];
 for(let i=0;i<1600;i++){
  await rig.render();rig.instances.forEach((n,j)=>nonzero[j]+=n.outputs[0][0].filter(v=>Math.abs(v)>1e-9).length);
 }
 assert(nonzero.every(n=>n>0));assert.equal(released,entBuilt,'transient leases released from actual render completion');
 assert(rig.instances.every(n=>n.processor.reservations.count===0));
 rig.ctx.state='suspended';direct.tryAttack({frequencyHz:440,volume:.2,isSector:false,soundId:'glass_ping'});
 product.playScheduledToneWithLifecycle(deps,request);
 assert.equal(globalThis.__directBuilds,directBuilt);assert.equal(globalThis.__entrophonBuilds,entBuilt);
 for(const f of cleanups)f();await rig.pump();
 cases.push({transport:sab?'SAB':'MessagePort',requestsPerClass:10003,directPlansBuilt:directBuilt,entrophonVoicesBuilt:entBuilt,
  releasedFromAudioCompletion:released,nonzeroSamples:nonzero});
}
console.log(JSON.stringify({pass:true,proof:'actual product submitters and Entrophon scheduling boundary; React lifecycle and browser graph shell mocked',physicalAudio:false,cases},null,2));
