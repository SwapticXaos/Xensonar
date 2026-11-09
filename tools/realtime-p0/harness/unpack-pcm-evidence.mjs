import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {P0PcmTapClient,P0_TAP_PROTOCOL,P0_TAP_BYTES} from '../web/p0-pcm-tap-client.js';
import {AUDITED_WASM_SHA256,pcmMetrics,comparePcm,renderProgramOracle,assessCaptureSuite} from '../web/p0-capture-oracle.js';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const names=new Set(['baseline','stall100','stall250','stall500','overflowReturns']);
function requireValue(condition,message){if(!condition)throw new Error(message);}
export async function verifyEvidence(evidence,wasmBytes){
 requireValue(evidence?.format==='p0-pcm-evidence/1'&&Array.isArray(evidence.pcm)&&evidence.pcm.length<=5,'unsupported evidence');
 requireValue(sha(wasmBytes)===AUDITED_WASM_SHA256,'local audited WASM hash mismatch');
 requireValue(evidence.report&&typeof evidence.report.takes==='object'&&evidence.report.takes!==null,'missing capture report');
 const module=await WebAssembly.compile(wasmBytes),report=structuredClone(evidence.report),decoded=[];const seen=new Set();
 for(const item of evidence.pcm){
  requireValue(names.has(item.name)&&!seen.has(item.name),'unknown or duplicate take');seen.add(item.name);
  const t=report?.takes?.[item.name];requireValue(t&&item.encoding==='f32le-interleaved-stereo'&&item.sampleRate===t.sampleRate&&item.frames===t.frameCount,'take metadata mismatch');
  requireValue(Number.isSafeInteger(item.frames)&&item.frames>0&&item.frames<=960000&&Number.isInteger(item.sampleRate)&&item.sampleRate>=8000&&item.sampleRate<=96000,'take bound');
  requireValue(typeof item.base64==='string'&&item.base64.length===4*Math.ceil(item.frames*8/3)&&/^[A-Za-z0-9+/]*={0,2}$/.test(item.base64),'PCM encoding/size');
  const bytes=Buffer.from(item.base64,'base64');requireValue(bytes.length===item.frames*8&&sha(bytes)===item.sha256&&item.sha256===t.pcmSha256,'PCM hash mismatch');
  const data=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length));
  const scope={sessionId:t.sessionId,engineEpoch:t.engineEpoch,ownerEpoch:t.ownerEpoch};
  const c=new P0PcmTapClient({postMessage(){}},scope),message=m=>c.handle({...scope,protocol:P0_TAP_PROTOCOL,...m});
  message({kind:'tap-ready',sampleRate:item.sampleRate,poolBuffers:16,framesPerBuffer:4096});message({kind:'pool-status',initialized:true,poolSize:16,available:16});
  const capture=c.startCapture(t.captureStartFrame,t.frameCount);
  message({kind:'capture-armed',captureId:capture.captureId,startFrame:t.captureStartFrame,endFrame:t.captureStartFrame+t.frameCount,expectedFrames:t.frameCount,sampleRate:item.sampleRate,channels:2,poolSize:16});
  requireValue(Array.isArray(t.chunks)&&t.chunks.length<=Math.ceil(item.frames/4096)+18,'chunk metadata bound');
  for(const chunk of t.chunks){
   const offset=chunk.firstFrame-t.captureStartFrame;
   requireValue(Number.isSafeInteger(offset)&&offset>=0&&Number.isSafeInteger(chunk.frames)&&chunk.frames>0&&chunk.frames<=4096&&offset+chunk.frames<=item.frames,'chunk range');
   const buffer=new ArrayBuffer(P0_TAP_BYTES);new Float32Array(buffer).set(data.subarray(offset*2,(offset+chunk.frames)*2));
   message({kind:'pcm-chunk',...chunk,captureId:capture.captureId,sampleRate:item.sampleRate,channels:2,buffer});
  }
  requireValue(t.end?.kind==='capture-end'&&t.end.captureId===capture.captureId&&c.matches(t.end),'invalid capture-end envelope');
  message(t.end);requireValue(c.takes.size===0,'capture-end did not settle');const complete=await capture.done;c.close();
  t.validation=complete.validation;t.metrics=pcmMetrics(data);
  const expected=renderProgramOracle(module,item.sampleRate,item.frames,t.relativeProgramStartFrame);
  const overflow=item.name==='overflowReturns',ranges=t.chunks.map(x=>[(x.firstFrame-t.captureStartFrame)*2,(x.firstFrame-t.captureStartFrame+x.frames)*2]);
  t.oracleCompare=comparePcm(expected,data,overflow?ranges:null);
  if(overflow)t.recoveryMetrics=pcmMetrics(data.subarray(Math.min(item.frames,Math.max(0,t.returnReleaseFrame-t.captureStartFrame+256))*2));
  decoded.push({name:item.name,bytes,data,sampleRate:item.sampleRate,frames:item.frames});
 }
 // Missing raw data is never satisfied by a JSON summary from another run.
 for(const name of names)if(!seen.has(name))delete report.takes[name];
 const baseline=decoded.find(x=>x.name==='baseline');
 if(baseline)for(const d of decoded)if(/^stall/.test(d.name))report.takes[d.name].compare=comparePcm(baseline.data,d.data);
 report.gates=assessCaptureSuite(report);report.pass=report.gates.pass;report.rawPcmRecomputed=true;
 report.evidenceOrigin=evidence.captureOrigin??'unspecified';report.physicalOutputProven=false;
 report.verificationScope='PCM, chunk accounting and predicates recomputed; browser timing/receipts are supplied metadata, not authenticated execution proof.';
 return {report,decoded};
}
function wave(bytes,sampleRate,frames){
 const h=Buffer.alloc(56);h.write('RIFF',0);h.writeUInt32LE(bytes.length+48,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(3,20);h.writeUInt16LE(2,22);h.writeUInt32LE(sampleRate,24);h.writeUInt32LE(sampleRate*8,28);h.writeUInt16LE(8,32);h.writeUInt16LE(32,34);h.write('fact',36);h.writeUInt32LE(4,40);h.writeUInt32LE(frames,44);h.write('data',48);h.writeUInt32LE(bytes.length,52);return Buffer.concat([h,bytes]);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const input=process.argv[2],output=process.argv[3];if(!input||!output)throw new Error('Usage: node harness/unpack-pcm-evidence.mjs P0_STALL_CAPTURE_EVIDENCE.json output-directory');
 requireValue(fs.statSync(input).size<=16*1024*1024,'evidence exceeds 16 MiB');
 const result=await verifyEvidence(JSON.parse(fs.readFileSync(input,'utf8')),fs.readFileSync(new URL('../artifacts/p0_core.wasm',import.meta.url)));
 fs.mkdirSync(output,{recursive:false});
 fs.writeFileSync(path.join(output,'RECOMPUTED_CAPTURE_REPORT.json'),JSON.stringify(result.report,null,2)+'\n',{flag:'wx'});
 for(const d of result.decoded){const suffix=result.report.takes[d.name].validation.frameExact?'':'_RECORDING_GAPS_OR_INVALID';fs.writeFileSync(path.join(output,d.name+suffix+'.wav'),wave(d.bytes,d.sampleRate,d.frames),{flag:'wx'});}
 console.log(JSON.stringify({pass:result.report.pass,rawPcmRecomputed:true,takes:result.decoded.length,physicalOutputProven:false,output},null,2));
}
