import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const { P0_PROGRAM_STEPS, webAudioLowpassCoefficients, legacy323Envelope, makeLegacyNote } = await import(pathToFileURL(path.join(root,'web/p0-fixtures.js')).href);
const sent=[];
const scope={sessionId:'model-session',engineEpoch:'model-engine',ownerEpoch:7};let sequence=0;
globalThis.sampleRate=48000; globalThis.currentFrame=0;
globalThis.AudioWorkletProcessor=class { constructor(){ this.port={postMessage:(m)=>sent.push(m),onmessage:null}; } };
let Processor=null; globalThis.registerProcessor=(name,klass)=>{assert.equal(name,'xensonar-p0-w');Processor=klass;};
await import(pathToFileURL(path.join(root,'worklet/p0-worklet.js')).href+'?t='+Date.now());
const wasmBytes=fs.readFileSync(path.join(root,'artifacts/p0_core.wasm'));
const wasmModule=await WebAssembly.compile(wasmBytes);
const p=new Processor({processorOptions:{wasmModule,...scope}});
function msg(data){
 if(data.kind==='panic')data={kind:'safety-state',state:{revision:1,closedThroughGenerationBySlot:Array(128).fill(0),reconcileGates:null,stopProgram:false,ownerEpochClosed:true}};
 const channel=data.kind==='state'?'state':data.kind==='safety-state'?'safety':'normal';
 p.port.onmessage({data:{...data,...scope,channel,protocol:'p0-w/325-audit1',packetSequence:++sequence}});
}
const sr=48000, ownerEpoch=7;
msg({kind:'arm',ownerEpoch,leaseValidThroughFrame:sr*2});
msg({kind:'state',ownerEpoch,revision:21,rootHz:220,programGain:1,leaseValidThroughFrame:sr*2});
msg({kind:'state',ownerEpoch,revision:20,rootHz:330,programGain:1,leaseValidThroughFrame:sr*2});
const coeff=webAudioLowpassCoefficients(sr,2400,1), env=legacy323Envelope(sr,.18,false);
msg({kind:'program-config',ownerEpoch,header:{revision:1,tempoMilli:120000,...coeff,attackFrames:env.attackFrames,releaseStartFrames:env.releaseStartFrames,stopFrames:env.stopFrames,releaseCoef:env.releaseCoef},steps:P0_PROGRAM_STEPS});
msg({kind:'program-start',ownerEpoch,startFrame:256});
let startedBefore=0;
for(let q=0;q<250;q++){const out=[[new Float32Array(128),new Float32Array(128)]];p.process([],out);globalThis.currentFrame+=128;}
let proof=[...sent].reverse().find(x=>x.kind==='render-proof'); startedBefore=proof.startedProgram; assert.ok(startedBefore>0);
// 500ms worth of render callbacks with no control messages = main-thread stall model.
for(let q=0;q<Math.ceil(sr*.5/128);q++){const out=[[new Float32Array(128),new Float32Array(128)]];p.process([],out);globalThis.currentFrame+=128;}
proof=[...sent].reverse().find(x=>x.kind==='render-proof');
assert.ok(proof.startedProgram>startedBefore); assert.equal(proof.stateRevision,21);
// stale attack expires, never starts.
const starts=proof.startedExternal; const n=makeLegacyNote(sr,20,1,550);
msg({kind:'attack-group',ownerEpoch,groupId:99,intendedFrame:currentFrame-10000,latestAdmissionFrame:currentFrame-5000,notes:[n]});
for(let q=0;q<8;q++){const out=[[new Float32Array(128),new Float32Array(128)]];p.process([],out);globalThis.currentFrame+=128;}
proof=[...sent].reverse().find(x=>x.kind==='render-proof'); assert.equal(proof.startedExternal,starts);
msg({kind:'panic',ownerEpoch,fadeFrames:240});
for(let q=0;q<40;q++){const out=[[new Float32Array(128),new Float32Array(128)]];p.process([],out);globalThis.currentFrame+=128;}
proof=[...sent].reverse().find(x=>x.kind==='render-proof'); assert.equal(proof.ownerClosed,1); assert.equal(proof.programRunning,0);
console.log(JSON.stringify({pass:true,startedBefore,afterStall:proof.startedProgram,renderProof:proof,messageCount:sent.length},null,2));
