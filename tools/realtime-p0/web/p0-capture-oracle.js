import {P0_PROGRAM_STEPS,legacy323Envelope,webAudioLowpassCoefficients} from './p0-fixtures.js';
import {P0_TAP_PROTOCOL} from './p0-pcm-contract.js';
export const AUDITED_WASM_SHA256='8add51d3875c0b4c5187b4ce8a581f03f3bc238b29b2f3277f05608e62809aa0';
export function pcmMetrics(data){
  let peak=0,sum=0,finite=true,nonzero=0;
  for(const x of data){if(!Number.isFinite(x)){finite=false;continue;}peak=Math.max(peak,Math.abs(x));sum+=x*x;if(x!==0)nonzero++;}
  return {finite,peak,rms:finite?Math.sqrt(sum/Math.max(1,data.length)):null,nonzeroSamples:nonzero,framesStereo:data.length/2};
}
export function comparePcm(a,b,ranges=null){
  let maxAbs=0,sum=0,samples=0,finite=true;const lengthEqual=a.length===b.length&&a.length>0;
  const scan=(from,to)=>{for(let i=from;i<to;i++){if(!Number.isFinite(a[i])||!Number.isFinite(b[i])){finite=false;continue;}const d=a[i]-b[i];maxAbs=Math.max(maxAbs,Math.abs(d));sum+=d*d;samples++;}};
  if(ranges)for(const [from,to] of ranges)scan(from,to);else scan(0,Math.min(a.length,b.length));
  return {lengthEqual,finite,samplesCompared:samples,maxAbs:finite?maxAbs:null,rms:finite?Math.sqrt(sum/Math.max(1,samples)):null};
}
export function expectedProgramStarts(sr,captureStart,programStart,frameCount){
  const entries=[];
  for(let step=0;;step++){
    const frame=programStart+Math.round(step*sr*15000/120000);if(frame>=captureStart+frameCount)break;
    const index=step%P0_PROGRAM_STEPS.length,count=P0_PROGRAM_STEPS[index].length;
    if(frame>=captureStart&&count)entries.push({frame,relativeFrame:frame-captureStart,step:index,notes:count});
  }
  return entries;
}
export function renderProgramOracle(wasmModule,sr,frameCount,relativeStart){
  const e=new WebAssembly.Instance(wasmModule,{}).exports;e.p0_init(sr);
  const table=new Float32Array(e.memory.buffer,e.p0_sine_table_ptr(),4096);for(let i=0;i<table.length;i++)table[i]=Math.sin(2*Math.PI*i/table.length);
  const ok=r=>{if(r!==1)throw new Error('offline program oracle rejected configuration');};
  ok(e.p0_arm(1,BigInt(Math.round(sr*1.5))));ok(e.p0_set_state(1,1n,220,1));
  const h=webAudioLowpassCoefficients(sr,2400,1),v=legacy323Envelope(sr,.18,false);
  ok(e.p0_program_set_header(1,1,P0_PROGRAM_STEPS.length,120000,h.b0,h.b1,h.b2,h.a1,h.a2,v.attackFrames,v.releaseStartFrames,v.stopFrames,v.releaseCoef));
  for(let i=0;i<P0_PROGRAM_STEPS.length;i++){const s=P0_PROGRAM_STEPS[i],a=s[0]??[1,0],b=s[1]??[1,0],c=s[2]??[1,0];ok(e.p0_program_set_step(1,i,s.length,...a,...b,...c));}
  ok(e.p0_program_start(1,BigInt(relativeStart)));
  const data=new Float32Array(frameCount*2),view=new Float32Array(e.memory.buffer,e.p0_output_ptr(),e.p0_max_block()*2);
  for(let frame=0;frame<frameCount;){const n=Math.min(128,frameCount-frame);ok(e.p0_renew_lease(1,BigInt(frame+Math.round(sr*1.5))));e.p0_render(n);data.set(view.subarray(0,n*2),frame*2);frame+=n;}
  return data;
}
const exact=c=>c?.lengthEqual===true&&c.finite===true&&c.samplesCompared>0&&c.maxAbs===0&&c.rms===0;
const audible=m=>m?.finite===true&&m.peak>0.001&&Number.isFinite(m.rms)&&m.rms>0;
function common(t){return !!t&&t.wasmSha256===AUDITED_WASM_SHA256&&t.validation?.integrity===true&&audible(t.metrics)&&exact(t.oracleCompare)
  &&t.programReceipt?.op==='program-start'&&t.programReceipt.result===1&&t.proof?.ownerClosed===0&&t.proof.programRunning===1&&t.proof.startedProgram>0&&t.proof.fault===false
  &&t.proof.frame>=t.captureStartFrame+t.frameCount&&t.proof.armedOwnerEpoch===t.ownerEpoch
  &&t.proof.sessionId===t.sessionId&&t.proof.engineEpoch===t.engineEpoch
  &&t.programReceipt.sessionId===t.sessionId&&t.programReceipt.engineEpoch===t.engineEpoch&&t.programReceipt.ownerEpoch===t.ownerEpoch
  &&Array.isArray(t.faults)&&t.faults.length===0;}
export function hasStallTrace(t){return t?.traceSupported===true&&Array.isArray(t.longTasks)&&t.longTasks.some(e=>Number.isFinite(e.startTime)&&Number.isFinite(e.duration)&&e.startTime<=t.stallPerfStart+5&&e.startTime+e.duration>=t.stallPerfEnd-5);}
export function assessCaptureSuite(report){
  const b=report.takes?.baseline;
  const baselinePass=common(b)&&b.validation.frameExact===true;
  const normal=baselinePass&&[100,250,500].every(ms=>{const t=report.takes['stall'+ms];return common(t)&&t.validation.frameExact===true&&exact(t.compare)
    &&t.sampleRate===b.sampleRate&&t.frameCount===b.frameCount&&t.relativeProgramStartFrame===b.relativeProgramStartFrame
    &&t.stallRequestedMs===ms&&t.stallActualMs>=ms*.95&&t.audioFrameAfter-t.audioFrameBefore>=ms*.90*t.sampleRate/1000;});
  const o=report.takes?.overflowReturns;
  const recorderOverflowPass=common(o)&&o.faultInjection==='withheld-buffer-returns'&&o.validation.frameExact===false
    &&o.validation.gapFrames>0&&o.end?.poolDroppedFrames===o.validation.gapFrames&&o.end.timelineGapFrames===0
    &&audible(o.recoveryMetrics)&&o.holdActualMs>=o.holdRequestedMs*.95&&o.proof.frame>o.returnReleaseFrame;
  const tracePass=normal&&[100,250,500].every(ms=>hasStallTrace(report.takes['stall'+ms]));
  const provenancePass=report.protocol==='p0-w/325-audit1'&&report.tapProtocol===P0_TAP_PROTOCOL&&report.wasmSha256===AUDITED_WASM_SHA256
    &&report.wg1?.pass===true&&report.wg1.wasmSha256===report.wasmSha256;
  return {baselinePass:!!baselinePass,sampleContinuityPass:!!normal,recorderOverflowPass:!!recorderOverflowPass,tracePass:!!tracePass,provenancePass:!!provenancePass,
    pass:!!(baselinePass&&normal&&recorderOverflowPass&&tracePass&&provenancePass),physicalOutputProven:false};
}
