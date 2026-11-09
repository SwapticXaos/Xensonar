import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import * as f from '../web/p0-fixtures.js';
import {P0BoundedClient} from '../web/p0-client.js';
import {assessBrowserResult} from '../web/p0-verdict.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const bytes=fs.readFileSync(path.join(root,'artifacts/p0_core.wasm'));
const results=[];
async function core(sr=48000){const {instance}=await WebAssembly.instantiate(bytes,{});const e=instance.exports;e.p0_init(sr);const a=new Float32Array(e.memory.buffer,e.p0_sine_table_ptr(),4096);for(let i=0;i<a.length;i++)a[i]=Math.sin(2*Math.PI*i/a.length);assert.equal(e.p0_arm(1,BigInt(sr*2)),1);return e;}
function enq(e,id,start,deadline,notes,owner=1,seq=id){
 let r=e.p0_begin_attack_group(owner,BigInt(id),notes.length,BigInt(start),BigInt(deadline));if(r!==1)return r;
 e.p0_group_input_sequence(BigInt(seq));
 for(let i=0;i<notes.length;i++){const n=notes[i];r=e.p0_set_attack_note(i,n.tokenSlot,n.tokenGeneration,n.kind,n.frequencyHz,n.peak,n.b0,n.b1,n.b2,n.a1,n.a2,n.attackFrames,n.releaseStartFrames,n.stopFrames,n.releaseCoef);if(r!==1)return r;}
 return e.p0_commit_attack_group();
}
function render(e,frames,block=128){const out=new Float32Array(frames);let cur=0;while(cur<frames){const q=Math.min(block,frames-cur);e.p0_render(q);const a=new Float32Array(e.memory.buffer,e.p0_output_ptr(),q*2);for(let i=0;i<q;i++){assert.ok(Number.isFinite(a[i*2]));out[cur+i]=a[i*2];}cur+=q;}return out;}
async function check(id,fn){await fn();results.push({id,pass:true});}
await check('A01-terminal-epoch',async()=>{const e=await core();e.p0_panic(1,240);assert.notEqual(e.p0_arm(1,96000n),1);assert.equal(e.p0_arm(2,96000n),1);assert.equal(e.p0_begin_attack_group(1,1n,1,240n,4000n),-3);});
await check('A02-token-dedup',async()=>{const e=await core(),n=f.makeLegacyNote(48000,1,1,220);assert.equal(enq(e,1,256,5000,[n]),1);assert.notEqual(enq(e,1,256,5000,[n]),1);render(e,16000);assert.equal(e.p0_started_external(),1n);assert.notEqual(enq(e,2,16500,20000,[n]),1);});
await check('A03-future-head',async()=>{const e=await core();for(let i=0;i<16;i++)assert.equal(enq(e,i+1,48000,52000,[f.makeLegacyNote(48000,i+1,1,220)]),1);assert.equal(enq(e,17,256,1000,[f.makeLegacyNote(48000,17,1,330)]),1);render(e,2048);assert.equal(e.p0_started_external(),1n);});
await check('A04-idempotent-release',async()=>{const e=await core();enq(e,1,256,5000,[f.makeGatedNote(48000,1,1,220)]);render(e,1280);for(let i=0;i<40;i++){e.p0_release(1,1,1,1440);render(e,128);}assert.equal(e.p0_active_voices(),0);});
await check('A05-late-admission-padding',async()=>{const e=await core();render(e,5000);assert.equal(enq(e,1,776,5096,[f.makeLegacyNote(48000,1,1,220)]),1);const a=render(e,512);assert.equal(a.findIndex(x=>Math.abs(x)>1e-12),241);assert.equal(e.p0_started_external(),1n);});
await check('A06-finite-inputs',async()=>{const e=await core();assert.notEqual(e.p0_set_state(1,1n,Infinity,1),1);for(const field of ['frequencyHz','peak','a1','releaseCoef']){const n=f.makeLegacyNote(48000,1,1,220);n[field]=NaN;assert.notEqual(enq(e,1,256,1000,[n]),1);}assert.equal(e.p0_pending_notes(),0);});
const scope={sessionId:'test-session',engineEpoch:'test-engine',ownerEpoch:1};
function client(){const sent=[];return {sent,c:new P0BoundedClient({postMessage:m=>sent.push(m)},()=>{},scope)};}
function ack(c,m){c.handle({...scope,kind:'receipt',channel:m.channel,packetSequence:m.packetSequence});}
await check('A07-panic-under-safety-pressure',()=>{const {c,sent}=client();for(let i=0;i<128;i++)assert.equal(c.postSafety({kind:'release',tokenSlot:i,tokenGeneration:1}),true);assert.equal(sent.length,1);assert.equal(c.postSafety({kind:'panic'}),true);ack(c,sent[0]);assert.equal(sent.length,2);assert.equal(sent[1].state.ownerEpochClosed,true);assert.ok(sent[1].state.closedThroughGenerationBySlot.every(v=>v===1));assert.equal(c.postNormal({kind:'program-start'}),false);});
await check('A08-credit-identity',()=>{const {c,sent}=client();for(let i=0;i<4;i++)c.postNormal({kind:'program-start',startFrame:i});assert.equal(sent.length,2);ack(c,sent[0]);assert.equal(sent.length,3);ack(c,sent[0]);assert.equal(sent.length,3);c.handle({...scope,sessionId:'old',kind:'receipt',channel:'normal',packetSequence:sent[1].packetSequence});assert.equal(sent.length,3);assert.equal(c.count('normal'),2);});
await check('A09-real-verdict',()=>{
 const audio={reference:{finite:true,peak:.04},candidate:{finite:true,peak:.04},compare:{lengthEqual:true,maxAbs:1e-6,rms:1e-7}};
 const r={environment:{sampleRate:48000},faults:[],tests:{referenceNormal:audio,referenceHeld:audio,referenceChord:audio,stall500:{frameAdvance:40000,programStartsAdvance:4},staleAttack:{startsBefore:3,startsAfter:3,expiredBefore:0,expired:1},releaseBeforeStart:{startsBefore:3,startsAfter:3,cancelledBefore:0,cancelled:1},stateHighWater:{stateRevision:21,expectedRevision:21},panic:{ownerClosed:1,programRunning:0,activeVoices:0,pendingGroups:0,peak:0,frame:10000,requestedFrame:9000}}};
 assert.equal(assessBrowserResult(r),true);const bad=structuredClone(r);bad.tests.referenceNormal.compare.maxAbs=.1;assert.equal(assessBrowserResult(bad),false);const sound=structuredClone(r);sound.tests.panic.activeVoices=1;assert.equal(assessBrowserResult(sound),false);
});
await check('A10-gate-reconcile-orders',async()=>{
 const e=await core();assert.equal(e.p0_reconcile_begin(10n),1);e.p0_reconcile_apply(1);
 assert.notEqual(enq(e,1,256,5000,[f.makeGatedNote(48000,1,1,220)],1,9),1);
 assert.equal(enq(e,2,256,5000,[f.makeLegacyNote(48000,2,1,330)],1,8),1);
 assert.equal(enq(e,3,256,5000,[f.makeGatedNote(48000,3,1,440)],1,11),1);
 render(e,512);assert.equal(e.p0_reconcile_begin(12n),1);e.p0_reconcile_apply(1);render(e,1536);
 assert.equal(e.p0_active_voices(),1);assert.equal(e.p0_reconcile_begin(10n),0);
});
await check('A11-silence-fade-and-lease',async()=>{
 const e=await core();enq(e,1,256,5000,[f.makeGatedNote(48000,1,1,220)]);render(e,2000);e.p0_panic(1,240);render(e,240);assert.equal(e.p0_active_voices(),0);assert.ok(render(e,128).every(x=>x===0));
 const z=await core();enq(z,1,256,5000,[f.makeGatedNote(48000,1,1,220)]);render(z,96000+240);assert.equal(z.p0_owner_closed(),1);assert.equal(z.p0_active_voices(),0);
});
await check('A12-pending-notes-bound',async()=>{const e=await core();for(let i=0;i<21;i++)assert.equal(enq(e,i+1,48000,52000,[0,1,2].map(j=>f.makeLegacyNote(48000,i*3+j,1,220))),1);assert.equal(e.p0_pending_notes(),63);assert.notEqual(enq(e,22,48000,52000,[f.makeLegacyNote(48000,64,1,220),f.makeLegacyNote(48000,65,1,330)]),1);});
await check('A13-block-and-rate-parity',async()=>{
 for(const sr of [44100,48000,96000]){
  let baseline;
  for(const block of [64,128,256]){const e=await core(sr);enq(e,1,Math.round(sr*.05),Math.round(sr*.14),[f.makeLegacyNote(sr,1,1,220)]);const samples=render(e,Math.round(sr*.4),block);
   if(baseline)for(let i=0;i<samples.length;i++)assert.ok(Math.abs(baseline[i]-samples[i])<=1e-6);else baseline=samples;
  }
 }
});
await check('A14-native-WASM-signal-parity',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'p0-native-'));try{
  const file=path.join(temp,'native.f32');const report=JSON.parse(execFileSync(path.join(root,'artifacts/p0_native_core_smoke'),[file],{encoding:'utf8'}));assert.equal(report.pass,true);
  const buf=fs.readFileSync(file),native=new Float32Array(buf.buffer,buf.byteOffset,buf.length/4);
  const e=await core();enq(e,1,2400,6720,[220,330,440].map((freq,i)=>f.makeLegacyNote(48000,i+1,1,freq)));const wasm=render(e,72000);
  let max=0;for(let i=0;i<wasm.length;i++)max=Math.max(max,Math.abs(wasm[i]-native[i]));assert.ok(max<=1e-6,`max ${max}`);
  results.push({id:'native-WASM-sample-error',maxAbs:max,frames:wasm.length,physicalDevice:false});
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
await check('A15-program-chord-atomic-and-zero-gain',async()=>{
 function program(e){const c=f.webAudioLowpassCoefficients(48000,2400,1),v=f.legacy323Envelope(48000,.18,false);assert.equal(e.p0_program_set_header(1,1,1,120000,c.b0,c.b1,c.b2,c.a1,c.a2,v.attackFrames,v.releaseStartFrames,v.stopFrames,v.releaseCoef),1);assert.equal(e.p0_program_set_step(1,0,3,1,.04,1.5,.04,2,.04),1);}
 const e=await core();program(e);e.p0_set_state(1,1n,18000,1);render(e,512);assert.equal(e.p0_program_start(1,768n),1);render(e,512);assert.equal(e.p0_started_program(),0n);assert.ok(e.p0_invalid_rejected()>0n);
 const z=await core();program(z);z.p0_program_start(1,256n);assert.ok(render(z,2000).some(x=>Math.abs(x)>.001));assert.equal(z.p0_set_state(1,1n,220,0),1);render(z,480);assert.ok(render(z,10000).every(x=>x===0));
});
console.log(JSON.stringify({pass:true,scope:'Node/WASM/native offline model; no browser/device approval',results},null,2));
