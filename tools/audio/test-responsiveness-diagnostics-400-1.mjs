import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {createClock,toneRecord,load,root,TonePlanRecordEncoder} from './c11-test-harness.mjs';
import {createHostedClock,installAudioClock} from './c11-host-test-harness.mjs';
const snapshot = async c => {
  await c.message({type:'DIAGNOSTIC_REQUEST',requestId:1});
  return c.messages.findLast(m=>m.type==='DIAGNOSTIC_SNAPSHOT').snapshot;
};
const cases=[];
const {createWaveStarterDirectSafeLane}=await load('src/features/xensonar/audio/waveStarterDirectSafeLane.ts');
for(const sab of [false,true]) {
  const c=await createHostedClock({sab});
  const ages=[0,2,5,6,10,20,21], results=[];let token=0;
  const lane=createWaveStarterDirectSafeLane({nowMs:()=>1000,getAudioFrame:()=>c.realm.currentFrame,
    getPressureBias:()=>0,getActiveScheduledToneCount:()=>0,
    emitDirectAttack:(_hz,_sector,opt)=>{
      const age=1000-opt.requestedAtMs;c.host.observeInputAge(age);
      const id=++token,target=c.host.currentContextFrame()+256-Math.round(age*48);
      const accepted=c.host.tryReserveAttack(id,target,2,1); results.push({age,accepted});
      if(accepted)c.host.cancelUnsubmitted(id);
    }});
  for(const age of ages)lane.request(440,false,{requestedAtMs:1000-age});
  assert.deepEqual(results,[{age:0,accepted:true},{age:2,accepted:true},{age:5,accepted:true},
    {age:6,accepted:false},{age:10,accepted:false},{age:20,accepted:false}]);
  const d=await c.host.requestDiagnosticSnapshot();
  assert.equal(d.host.producerRejectReasons.targetPast,3);
  assert.equal(d.host.epoch,1);assert.equal(lane.diagnosticSnapshot().stale,1);
  cases.push({transport:sab?'SAB':'MessagePort',sourceAgeProbe:results,epoch:d.host.epoch});
  lane.dispose();await c.stop();
}
// Consumer staleness can happen with no discontinuity and no actual kernel call.
for(const sab of [false,true]) {
  const c=await createClock({sab});await c.message({type:'SET_MUTED',muted:false});
  const record=toneRecord(c,1,c.frame+256);for(let i=0;i<3;i++)c.render();
  c.send(record);c.render();assert.equal(c.result(1).result,-3);
  const d=await snapshot(c);assert.equal(d.epoch,1);assert.equal(d.rejectReasons.stale,1);
  assert.equal(d.submittedToKernel,0);assert.equal(d.fenceReasons.contextDiscontinuity,0);
  cases.push({transport:sab?'SAB':'MessagePort',delayedDelivery:{lateByFrames:128,consumerStale:1,kernelCalls:0,epoch:1}});
  await c.stop();
}
// A gap independently kills a running voice and drains queued records as old epoch.
for(const sab of [false,true]) {
  const c=await createClock({sab});await c.message({type:'SET_MUTED',muted:false});
  c.send(toneRecord(c,10,c.frame+256,undefined,48000));for(let i=0;i<5;i++)c.render();
  assert(c.outputs[0][0].some(v=>v!==0));
  const oldEpoch=c.epoch;c.send(toneRecord(c,11,c.frame+256));c.context.currentFrame+=128;c.render();
  assert.equal(c.epoch,oldEpoch+1);assert(c.outputs[0][0].every(v=>v===0));
  assert.equal(c.result(11).result,-4);
  const d=await snapshot(c);assert.equal(d.fenceReasons.contextDiscontinuity,1);
  assert.equal(d.fencedStartedReservations,1);assert.equal(d.lastContextGapFrames,128);
  assert.equal(d.rejectReasons.oldEpoch,1);assert.equal(d.normalEnds,0);
  cases.push({transport:sab?'SAB':'MessagePort',gapProbe:{gapFrames:128,epoch:d.epoch,cancelledStarted:d.fencedStartedReservations}});
  await c.message({type:'SET_MUTED',muted:true});await c.message({type:'PANIC'});await c.stop();
  const reasons=(await snapshot(c)).fenceReasons;
  assert.deepEqual({...reasons},{contextDiscontinuity:1,explicitMute:1,explicitPanic:1,stop:1});
}
// Actual kernel argument failure differs from a consumer rejection.
{
  const c=await createClock();await c.message({type:'SET_MUTED',muted:false});
  c.send(toneRecord(c,30,c.frame+256,undefined,1));c.render();
  const d=await snapshot(c);assert.equal(d.rejectReasons.kernelNonzero,1);assert.equal(d.kernelReturns.arg,1);
  assert.equal(d.submittedToKernel,1);await c.stop();
}
// Budget failure cannot be confused with target staleness.
{
  const c=await createHostedClock();const f=c.host.currentContextFrame()+256;
  assert(c.host.tryReserveAttack(1,f,128,64));assert(!c.host.tryReserveAttack(2,f,2,1));
  const d=await c.host.requestDiagnosticSnapshot();assert.equal(d.host.producerRejectReasons.renderUnits,1);
  assert.equal(d.host.producerRejectReasons.targetPast,0);await c.stop();
}
// Late old-epoch results are counted but must not free a newer reservation.
{
  const c=await createHostedClock();const node=c.instances[0];
  node.port.onmessage({data:{type:'SESSION_STATE',epoch:2,active:true}});
  const f=c.host.currentContextFrame()+256;assert(c.host.tryReserveAttack(42,f,2,1));
  node.port.onmessage({data:{type:'RECORD_RESULT',epoch:1,token:42,result:-4}});
  const d=c.host.diagnosticSnapshot();assert.equal(d.recordResultIgnoredEpochMismatch,1);
  assert.equal(d.allEpochResultRejected,1);assert.equal(d.reservations,1);await c.stop();
}
// Falsification control: many contiguous callbacks alone never churn the epoch.
for(const profile of [0,1]) {
  const c=await createClock({profile});await c.message({type:'SET_MUTED',muted:false});
  for(let i=0;i<20000;i++)c.render();
  const d=await snapshot(c);assert.equal(d.epoch,1);assert.equal(d.fenceReasons.contextDiscontinuity,0);
  assert.equal(d.callbacks,20000);await c.stop();
}
// Observability must not alter PCM or musical outcomes relative to shipped 400.
const changed=new Set(execFileSync('git',['diff','--name-only','5b6779d','--','src'],{cwd:root,encoding:'utf8'}).trim().split('\n'));
const parentBundle=(await build({entryPoints:[path.join(root,'src/features/xensonar/browserImplant/worklet/processor.ts')],
 bundle:true,write:false,format:'iife',platform:'browser',plugins:[{name:'parent-bytes-only',setup(b){
 b.onLoad({filter:/\.ts$/},args=>{
  const relative=path.relative(root,args.path);
  if(!changed.has(relative))return;
  return {contents:execFileSync('git',['show','5b6779d:'+relative],{cwd:root,encoding:'utf8'}),loader:'ts'};
 });}}]})).outputFiles[0].text;
const hashes=[];
for(const sourceOverride of [parentBundle,undefined]) {
 const c=await createClock({sourceOverride});await c.message({type:'SET_MUTED',muted:false});
 c.send(toneRecord(c,1,c.frame+256));const hash=crypto.createHash('sha256');
 for(let i=0;i<60;i++)hash.update(Buffer.from(c.render().buffer));
 hashes.push(hash.digest('hex'));await c.stop();
}
assert.equal(hashes[0],hashes[1]);
// One explicit export reaches both real hosts; no extra messages during idle render.
const exportModule=await build({stdin:{contents:`export {XensonarBrowserC11Host} from './src/features/xensonar/browserImplant/worklet/browserC11Host';
export {collectBrowserImplantSnapshots,downloadBrowserImplantRuntimeDiagnostic} from './src/features/xensonar/browserImplant/runtimeDiagnostics';`,resolveDir:root},bundle:true,write:false,format:'esm',platform:'browser'});
const api=await import('data:text/javascript;base64,'+Buffer.from(exportModule.outputFiles[0].text).toString('base64'));
const rig=installAudioClock();const hosts=[];
const bytes=fs.readFileSync(path.join(root,'tools/browser-implant/build-wasm/xensonar-c11.wasm'));
for(const profile of [0,1]){
 const h=new api.XensonarBrowserC11Host(rig.ctx,{},profile);hosts.push(h);
 await h.createNode({wasmBytes:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)});h.unmute();
}
await rig.pump();const before=rig.messages.length;for(let i=0;i<20;i++)await rig.render();
assert.equal(rig.messages.length,before,'no periodic diagnostics on render callbacks');
const owners=await api.collectBrowserImplantSnapshots();
for(const [name,profile] of [['direct',0],['entrophon',1]]){
 assert.equal(owners[name].consumer.profile,profile);assert.equal(owners[name].consumerSnapshotStatus,'received');
}
let blob;
const originalCreate=URL.createObjectURL;
URL.createObjectURL=b=>{blob=b;return 'blob:diagnostic-test';};
globalThis.document={body:{appendChild(){}},createElement:()=>({style:{},click(){},remove(){}})};
window.location.pathname='/Xensonar_400.1_HAUPTRAUM_DIAGNOSTIC.html';
assert(await api.downloadBrowserImplantRuntimeDiagnostic({snapshot:{},audioCtx:rig.ctx}));
const zip=Buffer.from(await blob.arrayBuffer());
assert(zip.includes(Buffer.from('admission_session_snapshots.json')));
assert(zip.includes(Buffer.from('contextDiscontinuity')));
URL.createObjectURL=originalCreate;for(const h of hosts)h.destroy();await rig.pump();
console.log(JSON.stringify({pass:true,scope:'causal signatures and cold diagnostic export; not target-device attribution',
 physicalAudio:false,behaviorChanged:false,cases,stableCallbackEpoch:1,pcmParentParity:hashes[0],
 dualHostExport:true,noPeriodicDiagnosticMessages:true},null,2));
