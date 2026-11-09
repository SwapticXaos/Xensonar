import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {verifyEvidence} from '../harness/unpack-pcm-evidence.mjs';
import {tapWire,processor,wasmModule} from './pcm-test-support.mjs';
import {P0_TAP_PROTOCOL} from '../web/p0-pcm-contract.js';
import {P0_PROTOCOL} from '../web/p0-client.js';
import {P0_PROGRAM_STEPS,legacy323Envelope,webAudioLowpassCoefficients} from '../web/p0-fixtures.js';
import {AUDITED_WASM_SHA256,renderProgramOracle,pcmMetrics,comparePcm,assessCaptureSuite} from '../web/p0-capture-oracle.js';
const results=[];
function check(id,fn){results.push({id,pass:true,...fn()});}
async function take(sr=48000,stallMs=0,overflow=false){
 const w=tapWire(sr),sent=[],s=processor('xensonar-p0-w',{...w.scope,wasmModule},sent);let sequence=0,revision=0;
 const msg=m=>s.onMessage({...w.scope,protocol:P0_PROTOCOL,channel:m.kind==='state'?'state':'normal',packetSequence:++sequence,...m});
 msg({kind:'arm',leaseValidThroughFrame:Math.round(sr*1.5)});
 const h={revision:1,tempoMilli:120000,...webAudioLowpassCoefficients(sr,2400,1),...legacy323Envelope(sr,.18,false)};
 msg({kind:'program-config',header:h,steps:P0_PROGRAM_STEPS});
 const start=64,count=Math.round(sr*(overflow?3:1.25)),relative=Math.round(sr*.1),programStart=start+relative;
 const t=w.c.startCapture(start,count);w.pump();msg({kind:'program-start',startFrame:programStart});
 const receipt=sent.find(x=>x.kind==='receipt'&&x.op==='program-start');assert.equal(receipt.result,1);
 const pauseStart=start+Math.round(sr*.32),pauseEnd=pauseStart+Math.round(sr*(overflow?1.8:stallMs/1000));
 let nextHeartbeat=0,held=false,releaseFrame=null;
 while(w.frame<start+count+sr*.12){
  const f=w.frame,paused=!overflow&&f>=pauseStart&&f<pauseEnd;
  if(!paused&&f>=nextHeartbeat){msg({kind:'state',revision:++revision,rootHz:220,programGain:1,leaseValidThroughFrame:f+Math.round(sr*1.5)});nextHeartbeat=f+Math.round(sr*.25);}
  if(overflow&&f>=pauseStart&&f<pauseEnd&&!held){w.c.holdBufferReturns(true);held=true;}
  if(held&&f>=pauseEnd){w.c.holdBufferReturns(false);w.pump();held=false;releaseFrame=f;}
  const audio=[[new Float32Array(128),new Float32Array(128)]];globalThis.currentFrame=f;s.process([],audio);w.render(128,audio[0]);if(!paused)w.pump();
 }
 w.pump();const done=await t.done;
 const reference=renderProgramOracle(wasmModule,sr,count,relative),ranges=done.chunks.map(c=>[(c.firstFrame-start)*2,(c.firstFrame-start+c.frames)*2]);
 const result={...w.scope,wasmSha256:AUDITED_WASM_SHA256,sampleRate:sr,channels:2,captureStartFrame:start,relativeProgramStartFrame:relative,frameCount:count,
  validation:done.validation,end:done.end,programReceipt:receipt,proof:sent.filter(x=>x.kind==='render-proof').at(-1),faults:[],metrics:pcmMetrics(done.data),
  oracleCompare:comparePcm(reference,done.data,overflow?ranges:null),data:done.data,chunks:done.chunks,
  stallRequestedMs:stallMs,stallActualMs:stallMs,audioFrameBefore:pauseStart,audioFrameAfter:pauseStart+Math.round(stallMs*sr/1000),
  // Predicate fixture only. This test does not claim a PerformanceObserver event.
  traceSupported:true,stallPerfStart:10,stallPerfEnd:10+stallMs,longTasks:[{startTime:10,duration:stallMs}]};
 if(overflow)Object.assign(result,{faultInjection:'withheld-buffer-returns',holdRequestedMs:1800,holdActualMs:1800,returnReleaseFrame:releaseFrame,recoveryMetrics:pcmMetrics(done.data.subarray((releaseFrame-start+256)*2))});
 assert.equal(result.oracleCompare.maxAbs,0);assert.equal(result.oracleCompare.rms,0);return result;
}
const baseline=await take();const report={protocol:P0_PROTOCOL,tapProtocol:P0_TAP_PROTOCOL,wasmSha256:AUDITED_WASM_SHA256,wg1:{pass:true,wasmSha256:AUDITED_WASM_SHA256},takes:{baseline}};
for(const ms of [100,250,500]){const t=await take(48000,ms);t.compare=comparePcm(baseline.data,t.data);report.takes['stall'+ms]=t;}
report.takes.overflowReturns=await take(48000,0,true);
check('O01-full-engine-tap-client-model',()=>{assert.equal(assessCaptureSuite(report).pass,true);return {rates:[48000],normalFrames:baseline.frameCount,normalStallsMs:[100,250,500],maxAbs:0,overflowDropped:report.takes.overflowReturns.validation.gapFrames,engineOpenAfterOverflow:report.takes.overflowReturns.proof.ownerClosed===0,actualBrowser:false};});
check('O02-silence-invalid-baseline-and-nonfinite-never-pass',()=>{
 const silent=structuredClone(report);for(const t of Object.values(silent.takes)){t.metrics={finite:true,peak:0,rms:0};}assert.equal(assessCaptureSuite(silent).pass,false);
 for(const mutate of [r=>{r.takes.baseline.validation.frameExact=false;},r=>{r.takes.stall500.oracleCompare.maxAbs=.01;},r=>{r.takes.stall250.metrics.finite=false;},r=>{r.takes.stall100.programReceipt.result=-1;},r=>{r.takes.baseline.proof.fault=true;}]){const r=structuredClone(report);mutate(r);assert.equal(assessCaptureSuite(r).pass,false);}
});
check('O03-lease-stop-cannot-pass-recorder-overflow',()=>{const r=structuredClone(report);r.takes.overflowReturns.proof.ownerClosed=1;r.takes.overflowReturns.proof.programRunning=0;assert.equal(assessCaptureSuite(r).pass,false);r.takes.overflowReturns.proof.frame+=900000;assert.equal(assessCaptureSuite(r).pass,false);});
check('O04-trace-and-provenance-are-required',()=>{
 for(const mutate of [r=>{r.takes.stall500.traceSupported=false;},r=>{r.takes.stall100.longTasks=[];},r=>{r.wg1.pass=false;},r=>{r.wasmSha256='foreign';},r=>{r.takes.baseline.proof.sessionId='foreign';}]){const r=structuredClone(report);mutate(r);assert.equal(assessCaptureSuite(r).pass,false);}
});
for(const sr of [44100,96000]){const b=await take(sr),t=await take(sr,500);assert.equal(b.validation.frameExact,true);assert.equal(t.validation.frameExact,true);assert.equal(comparePcm(b.data,t.data).maxAbs,0);}
results.push({id:'O05-44k1-96k-500ms-pool-coverage',pass:true,maxAbs:0});
const rawReport=structuredClone(report),pcm=[];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const [name,t] of Object.entries(rawReport.takes)){
 const bytes=Buffer.from(t.data.buffer,t.data.byteOffset,t.data.byteLength);t.pcmSha256=sha(bytes);
 pcm.push({name,encoding:'f32le-interleaved-stereo',sampleRate:t.sampleRate,frames:t.frameCount,sha256:t.pcmSha256,base64:bytes.toString('base64')});delete t.data;
}
const evidence={format:'p0-pcm-evidence/1',captureOrigin:'node-model-fixture',report:rawReport,pcm};
const wasmBytes=fs.readFileSync(new URL('../artifacts/p0_core.wasm',import.meta.url));
const verified=await verifyEvidence(JSON.parse(JSON.stringify(evidence)),wasmBytes);
assert.equal(verified.report.pass,true);assert.equal(verified.decoded.length,5);assert.equal(verified.report.physicalOutputProven,false);
results.push({id:'O06-raw-PCM-roundtrip-independent-recomputation',pass:true,takes:5,browserEvidence:false});
const missing=structuredClone(evidence);missing.pcm.pop();assert.equal((await verifyEvidence(missing,wasmBytes)).report.pass,false);
const corrupt=structuredClone(evidence);corrupt.pcm[0].sha256='corrupt';await assert.rejects(()=>verifyEvidence(corrupt,wasmBytes),/hash mismatch/);
for(const mutate of [e=>{e.report.takes.baseline.end.kind='foreign';},e=>{e.report.takes.baseline.end.sessionId='foreign';},e=>{e.report.takes.baseline.end.captureId=99;}]){
 const bad=structuredClone(evidence);mutate(bad);await assert.rejects(()=>verifyEvidence(bad,wasmBytes),/capture-end envelope/);
}
const fabricated=structuredClone(evidence);
for(const t of fabricated.pcm){const bytes=Buffer.alloc(t.frames*8);t.base64=bytes.toString('base64');t.sha256=sha(bytes);fabricated.report.takes[t.name].pcmSha256=t.sha256;}
assert.equal((await verifyEvidence(fabricated,wasmBytes)).report.pass,false);
results.push({id:'O07-missing-corrupt-foreign-end-and-rehashed-silence-rejected',pass:true});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'p0-pcm-evidence-'));
try{
 const input=path.join(temp,'model.json'),output=path.join(temp,'decoded');fs.writeFileSync(input,JSON.stringify(evidence));
 const cli=JSON.parse(execFileSync(process.execPath,[fileURLToPath(new URL('../harness/unpack-pcm-evidence.mjs',import.meta.url)),input,output],{encoding:'utf8'}));
 assert.equal(cli.pass,true);assert.equal(cli.physicalOutputProven,false);
 const wav=fs.readFileSync(path.join(output,'baseline.wav'));assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt16LE(20),3);assert.equal(wav.readUInt16LE(22),2);assert.equal(wav.readUInt32LE(24),48000);assert.equal(wav.readUInt32LE(44),60000);assert.equal(wav.length,60000*8+56);
 assert.ok(fs.existsSync(path.join(output,'overflowReturns_RECORDING_GAPS_OR_INVALID.wav')));
}finally{fs.rmSync(temp,{recursive:true,force:true});}
results.push({id:'O08-CLI-Float32-WAV-export-and-gap-label',pass:true});
console.log(JSON.stringify({pass:true,scope:'Actual synth adapter/WASM + actual tap/client, simulated render and control stalls. Trace and W-G1 fields are predicate fixtures, not browser evidence.',results},null,2));
