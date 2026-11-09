import fs from 'node:fs';
import assert from 'node:assert/strict';
import {P0BoundedClient,P0_PROTOCOL} from '../web/p0-client.js';
import {makeGatedNote,makeLegacyNote,webAudioLowpassCoefficients,legacy323Envelope,P0_PROGRAM_STEPS} from '../web/p0-fixtures.js';
const wasmModule=await WebAssembly.compile(fs.readFileSync(new URL('../artifacts/p0_core.wasm',import.meta.url)));
globalThis.sampleRate=48000;globalThis.currentFrame=0;
let Processor,outbox;
globalThis.AudioWorkletProcessor=class{constructor(){const target=outbox;this.port={onmessage:null,postMessage:m=>target.push(structuredClone(m))};}};
globalThis.registerProcessor=(_name,klass)=>{Processor=klass;};
await import('../worklet/p0-worklet.js');
function wire(name){
  const ab=[],ba=[],reports=[],scope={sessionId:name,engineEpoch:'engine-'+name,ownerEpoch:1};
  outbox=ba;globalThis.currentFrame=0;
  const p=new Processor({processorOptions:{...scope,wasmModule}});
  const c=new P0BoundedClient({postMessage:m=>ab.push(structuredClone(m))},m=>reports.push(m),scope);
  const deliver=()=>{while(ab.length)p.port.onmessage({data:ab.shift()});};
  const replies=()=>{while(ba.length)c.handle(ba.shift());};
  const pump=()=>{let budget=2000;while(ab.length||ba.length){assert.ok(--budget>0);deliver();replies();}};
  const render=(frames)=>{const a=new Float32Array(frames);let k=0;while(k<frames){const n=Math.min(128,frames-k),out=[[new Float32Array(n),new Float32Array(n)]];globalThis.currentFrame=Number(p.e.p0_frame());assert.equal(p.process([],out),true);a.set(out[0][0],k);k+=n;}return a;};
  const arm=()=>{c.postNormal({kind:'arm',leaseValidThroughFrame:72000});pump();assert.equal(p.e.p0_owner_closed(),0);};
  const attack=(id,slot,gated=false,intended=512,inputSequence=id)=>c.postNormal({kind:'attack-group',groupId:id,inputSequence,intendedFrame:intended,latestAdmissionFrame:intended+4320,notes:[(gated?makeGatedNote:makeLegacyNote)(48000,slot,1,220)]});
  const program=()=>{const h={revision:1,tempoMilli:120000,...webAudioLowpassCoefficients(48000,2400,1),...legacy323Envelope(48000,.18,false)};c.postNormal({kind:'program-config',header:h,steps:P0_PROGRAM_STEPS});pump();};
  pump();return {ab,ba,reports,scope,p,c,pump,deliver,replies,render,arm,attack,program};
}
const results=[];
function check(id,fn){const detail=fn();results.push({id,pass:true,...detail});}
check('T01-full-pressure-panic-through-real-adapter',()=>{
  const w=wire('pressure');w.arm();w.program();
  w.c.postNormal({kind:'program-start',startFrame:15000});w.pump();
  for(let i=0;i<16;i++){assert.equal(w.attack(i+1,i,true),true);w.pump();}
  const played=w.render(2000);assert.ok(played.some(x=>Math.abs(x)>.001));assert.equal(w.p.e.p0_active_voices(),16);
  for(let i=0;i<64;i++){assert.equal(w.attack(100+i,32+i,false,30000),true);w.pump();}
  assert.equal(w.p.e.p0_pending_notes(),64);
  for(let i=0;i<32;i++)w.attack(200+i,96+i,false,30000);
  assert.equal(w.c.count('normal'),2);assert.ok(w.c.normalQueue.length>0);
  for(let i=0;i<128;i++)assert.equal(w.c.postSafety({kind:'release',tokenSlot:i,tokenGeneration:1}),true);
  assert.equal(w.c.postSafety({kind:'panic'}),true);assert.equal(w.c.normalQueue.length,0);
  assert.equal(w.c.count('safety'),1);w.pump();
  assert.equal(w.p.e.p0_owner_closed(),1);assert.equal(w.p.e.p0_pending_notes(),0);assert.equal(w.p.e.p0_program_running(),0);
  w.render(240);assert.equal(w.p.e.p0_active_voices(),0);assert.ok(w.render(10000).every(x=>x===0));w.pump();
  const proof=w.reports.filter(m=>m.kind==='render-proof').at(-1);assert.equal(proof.peak,0);assert.equal(proof.fault,false);
  const forged={...w.scope,protocol:P0_PROTOCOL,packetSequence:10000,channel:'normal',kind:'arm',leaseValidThroughFrame:72000};
  w.p.port.onmessage({data:forged});assert.equal(w.p.e.p0_owner_closed(),1);
  w.p.port.onmessage({data:{...forged,sessionId:'old',packetSequence:10001}});assert.equal(w.p.e.p0_owner_closed(),1);
  return {activeBefore:16,pendingBefore:64,silentAfterFade:true};
});
check('T02-reconcile-before-arm-and-after-start',()=>{
  const w=wire('reconcile');w.c.postSafety({kind:'gate-reconcile',observedInputSequence:10,held:[]});w.pump();w.arm();
  w.attack(1,1,true,512,9);w.attack(2,2,false,512,8);w.pump();w.attack(3,3,true,512,11);w.pump();w.render(2000);
  assert.equal(w.p.e.p0_started_external(),2n);assert.equal(w.p.e.p0_active_voices(),2);
  w.c.postSafety({kind:'gate-reconcile',observedInputSequence:12,held:[]});w.pump();w.render(1440);
  assert.equal(w.p.e.p0_active_voices(),1);
});
check('T03-terminal-safety-before-arm-or-program',()=>{
  const w=wire('early-panic');w.c.postSafety({kind:'panic'});w.pump();
  w.p.port.onmessage({data:{...w.scope,protocol:P0_PROTOCOL,packetSequence:100,channel:'normal',kind:'arm',leaseValidThroughFrame:72000}});
  assert.equal(w.p.e.p0_owner_closed(),1);assert.equal(w.p.e.p0_owner_epoch(),0);
  const z=wire('early-stop');z.c.postSafety({kind:'program-stop'});z.pump();z.arm();z.program();z.c.postNormal({kind:'program-start',startFrame:512});z.pump();z.render(8000);assert.equal(z.p.e.p0_started_program(),0n);
});
check('T04-invalid-lease-cannot-mutate-state',()=>{
  const w=wire('lease');w.arm();w.c.postState({kind:'state',revision:1,rootHz:220,programGain:1,leaseValidThroughFrame:72000});w.pump();
  w.c.postState({kind:'state',revision:2,rootHz:330,programGain:0,leaseValidThroughFrame:0});w.pump();assert.equal(w.p.e.p0_state_revision(),1n);
});
function stallTake(ms){
  const w=wire('stall-'+ms);w.arm();w.program();w.c.postNormal({kind:'program-start',startFrame:512});w.pump();
  let revision=0,nextHeartbeat=0;const total=60000,samples=new Float32Array(total);let k=0;
  while(k<total){
    if(k>=nextHeartbeat&&!(k>=16800&&k<16800+48*ms)){
      w.c.postState({kind:'state',revision:++revision,rootHz:220,programGain:1,leaseValidThroughFrame:k+72000});w.pump();nextHeartbeat=k+12000;
    }
    const n=Math.min(128,total-k);samples.set(w.render(n),k);k+=n;
  }
  return {samples,started:Number(w.p.e.p0_started_program()),faulted:w.p.faulted};
}
check('T05-100-250-500ms-model-stall-sample-continuity',()=>{
  const baseline=stallTake(0);assert.ok(baseline.samples.some(x=>Math.abs(x)>.001));
  for(const ms of [100,250,500]){const t=stallTake(ms);assert.equal(t.started,baseline.started);assert.equal(t.faulted,false);for(let i=0;i<t.samples.length;i++)assert.equal(t.samples[i],baseline.samples[i]);}
  return {frames:60000,starts:baseline.started,maxAbs:0,actualBrowserStall:false};
});
check('T06-silent-preparation-versus-armed-frame-gap',()=>{
 const w=wire('warmup');globalThis.currentFrame=512;const out=[[new Float32Array(128),new Float32Array(128)]];
 assert.equal(w.p.process([],out),true);assert.equal(w.p.e.p0_frame(),640n);assert.equal(w.p.faulted,false);
 w.arm();globalThis.currentFrame=1024;w.p.process([],out);assert.equal(w.p.faulted,true);assert.equal(w.p.e.p0_owner_closed(),1);
});
console.log(JSON.stringify({pass:true,scope:'Actual client + actual adapter + actual WASM; simulated MessagePort/render clock. No browser/device approval.',results},null,2));
