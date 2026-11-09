'use strict';
// Exercises the actual Runtime-Diagnose ZIP exporter with mocked audio owners.
// Tests attachment contents, not only a source text match.
const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const src=fs.readFileSync(path.join(root,'src/runtime/instrument/05_timing_and_admission.js'),'utf8');
 const a=src.indexOf('async function Bre(e){');const b=src.indexOf('}v6();function __XenFullscreenButton',a);
 assert(a>=0&&b>a);const fn=src.slice(a,b+1);
 const traceSrc=fs.readFileSync(path.join(root,'src/contracts/16_workspace_export_stream.js'),'utf8');
 const files=[];const events=[];
 const url={createObjectURL:()=> 'blob:diagnostic',revokeObjectURL(){}};
 const ctx={Blob,ArrayBuffer,Uint8Array,Date,JSON,Math,URL:url,window:{setTimeout(){}},
  document:{body:{appendChild(){}},createElement:()=>({click(){},remove(){},style:{}})},
  y6:async()=>({}),Lre:()=>null,Tre:()=>({}),Gz:()=>({windowMs:60000,bucketMs:250,points:[]}),
  Tne:()=>({}),__XenSoundTrace:{read:()=>({events:[],dropped:0})},
  __XenAudioProbe:{read:()=>({records:[],enabled:true,session:0,truncated:false})},
  bn:(area,evt,detail)=>events.push({area,evt,detail}),xw:()=>({}),
  ki:{events:[],sessionId:'test-session'},Hx:'test-build',S6:()=>null,
  Ere:c=>{files.push(...c);return Uint8Array.from([1,2,3]);},
  Fre:()=>'',nre:()=>({}),Sre:()=>({}),nc:x=>x,_x:'x',__XenPackageExportTraceP315:null
 };
 vm.createContext(ctx);
 vm.runInContext(traceSrc+'\n'+fn+'\nthis.Bre=Bre;',ctx);
 // Set the lexical trace, don't mask it with a sandbox property.
 vm.runInContext('__XenPackageExportTraceP315.begin();__XenPackageExportTraceP315.step("donor-export-start",{assets:2});__XenPackageExportTraceP315.fail(new RangeError("Invalid string length"));',ctx);
 const result=await ctx.Bre({snapshot:{},audioCtx:null});
 if(!result) console.error("diagnostic ZIP failure",events.at(-1));
 assert.equal(result,true);
 const traceFile=files.find(f=>f.name==='package_station_export_trace.json');
 assert(traceFile,'Diagnostic ZIP must include the package-station report');
 const parsed=JSON.parse(traceFile.text);
 assert.equal(parsed.runs.length,1);assert.equal(parsed.runs[0].status,'error');
 assert.equal(parsed.runs[0].error.invalidStringLength,true);
 assert(parsed.runs[0].events.some(e=>e.stage==='donor-export-start'&&e.assets===2));
 assert(events.some(e=>e.area==='package-station'&&e.evt==='failed'),'events.log channel gets error event');
 console.log('PASS P3.15 real Runtime-Diagnose ZIP includes export trace, stages, error signature, no audio');
})().catch(err=>{console.error(err);process.exitCode=1});
