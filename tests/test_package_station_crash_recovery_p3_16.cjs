'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const code=fs.readFileSync(path.join(root,'src/contracts/16_workspace_export_stream.js'),'utf8');
const memory=new Map();
const storage={setItem:(key,v)=>memory.set(key,v),getItem:key=>memory.get(key)??null};
function launch(){
 const ctx={JSON,Date,WeakSet,performance:{now:()=>120},localStorage:storage};
 vm.createContext(ctx);vm.runInContext(code+'\nthis.trace=__XenPackageExportTraceP315;',ctx);return ctx.trace;
}
let first=launch();first.begin();first.step('sample-encode-start',{bytes:2500000,secret:'PRIVATE AUDIO'});
const recovered=launch().read();
assert.equal(recovered.runs.at(-1).status,'interrupted','Crash/reload must preserve interrupted export stage');
assert.equal(recovered.runs.at(-1).events.at(-1).stage,'sample-encode-start');
assert.equal(recovered.runs.at(-1).events.at(-1).bytes,2500000);
assert(!JSON.stringify(recovered).includes('PRIVATE AUDIO'));
const next=launch();next.begin();next.step('json-serialize-start',{count:100});next.fail(new RangeError('Invalid string length'));
const errors=launch().read().runs;
assert.equal(errors.at(-1).status,'error');assert.equal(errors.at(-1).error.invalidStringLength,true);
assert.equal(errors.at(-2).status,'interrupted');
const source=fs.readFileSync(path.join(root,'src/app/forge/02_boot_and_workspace_tools.js'),'utf8');
const a=source.indexOf('async function JEe('),b=source.indexOf('function ZEe(',a);
assert(a>=0&&b>a);
const fStart=source.indexOf('function YEe('),fEnd=source.indexOf('async function JEe(',fStart);
assert(fStart>=0&&fEnd>fStart);
const guardedJSON=Object.create(JSON);
guardedJSON.stringify=(value,...args)=>{const result=JSON.stringify(value,...args);if(result?.length>130000)throw new RangeError('Invalid string length');return result;};
const hCtx={JSON:guardedJSON,Date,WeakSet};vm.createContext(hCtx);
vm.runInContext(code+'\n'+source.slice(fStart,fEnd)+'\nthis.hashMaterial=YEe;',hCtx);
const sampleMetadata={name:'Dust \u2728',role:'loop',mimeType:'audio/wav',dataBase64:'QUJD'.repeat(70000),sizeBytes:210000,durationSec:12,bars:4,guideMarkers:[0,0.5]};
function legacyHash(data){let h=2166136261;for(let i=0;i<data.length;i++){
 h^=data.charCodeAt(i);h=Math.imul(h,16777619);
}return 'h'+(h>>>0).toString(16)}
const normalized={name:sampleMetadata.name,role:sampleMetadata.role,mimeType:sampleMetadata.mimeType,
 dataBase64:sampleMetadata.dataBase64,sizeBytes:sampleMetadata.sizeBytes,durationSec:sampleMetadata.durationSec,
 bpm:undefined,bars:sampleMetadata.bars,guideSegments:undefined,guideMarkers:sampleMetadata.guideMarkers,
 loopStartSec:undefined,loopEndSec:undefined,rootHz:undefined,sourceVersion:undefined,renderMode:undefined,
 intendedLoopDurationSec:null,rootFollowPreferred:false,rootFollowGranularProfile:null,spectralGranularBridge:null,
 audioPaintImportDetailJson:null,audioIdentityKey:null,audioIdentitySource:null};
assert.equal(hCtx.hashMaterial(sampleMetadata),legacyHash(JSON.stringify(normalized)),
 'Streaming hash must preserve historic Material contentHash across large audio');
const resultSource=source.slice(a,b);
let inflight=0,peak=0;const gates=[];
const items=[0,1,2].map(i=>({id:'id'+i,name:'A',role:'loop',blob:{size:4,type:'audio/wav',arrayBuffer(){inflight++;peak=Math.max(peak,inflight);return new Promise(resolve=>gates.push(()=>{inflight--;resolve(new ArrayBuffer(4))}));}},guideMarkers:[]}));
const ctx={Sw:()=> 'YWJj',YEe:()=> 'hash',__XenPackageExportTraceP315:{step(){}},Promise,setTimeout};vm.createContext(ctx);vm.runInContext(resultSource+'\nthis.exportMaterial=JEe',ctx);
(async()=>{
 const done=ctx.exportMaterial(items);
 await Promise.resolve();await Promise.resolve();
 assert.equal(peak,1,'Material audio reads should never be started in parallel');
 let resolved=0;for(let ticks=0;resolved<3&&ticks<200;ticks++){if(gates.length){gates.shift()();resolved++;}await new Promise(r=>setTimeout(r,0));}assert.equal(resolved,3);
 const result=await done;
 assert.equal(result.entries.length,3);assert.equal(peak,1);
 console.log('PASS P3.16 crash-persistent bounded export trace and sequential material audio reads');
})().catch(error=>{console.error(error);process.exitCode=1});
