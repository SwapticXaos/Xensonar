'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const contract=fs.readFileSync(path.join(root,'src/contracts/16_workspace_export_stream.js'),'utf8');
const app=fs.readFileSync(path.join(root,'src/app/forge/03_spectral_grid_and_archives.js'),'utf8');
const from=app.indexOf('function AQ('),to=app.indexOf('function yLe(',from);
assert(from>=0 && to>from,'Production workspace archive serializer must be found');
const code=app.slice(from,to);
const originalStringify=JSON.stringify;
const guardedJSON=Object.create(JSON);
guardedJSON.stringify=function(value,replacer,space){
 const result=originalStringify(value,replacer,space);
 if(typeof result==='string' && result.length>130000)throw new RangeError('Invalid string length');
 return result;
};
const ctx={JSON:guardedJSON,Blob,URL:{createObjectURL:()=> 'blob:test'},Date,Error,WeakSet,ArrayBuffer,DataView,
 pLe:(key,value)=>value,
 $Ee:()=>false,
 Uj:(parts,label)=>({parts,label,bytes:new Blob(parts).size}),
 document:{createElement:()=>({click(){},remove(){}}),body:{appendChild(){}}},
 window:{setTimeout(){}},Ox(){}
};
vm.createContext(ctx);
vm.runInContext(contract+'\n'+code+'\nthis.__test={gLe,xQ,trace:__XenPackageExportTraceP315,stream:__XenPackageExportStreamP315};',ctx);
const {gLe,xQ,trace,stream}=ctx.__test;
function fileObj(large){return {
 format:'xensonar',version:1,packageId:'test',exportedAt:1,label:'test',
 warnings:[],sections:[{kind:'audio',summary:'large',payload:{dataBase64:large}}],
 workspace:{composer:{tracks:[]}},projects:[],samples:[{archivedId:'sample-1',dataBase64:large}],
 gridLibrary:null,customRasterPresets:null,customRasterPresetLibrary:null,materialLibrary:null,
 rootFollowBank:null,bassClipLibrary:null,bassPatternLibrary:null,bassPatterns:null,
 drumConfigLibrary:null,spectralForgeProjects:null,syntheticForgeSavedWorkspaces:null,
 syntheticForgeCurrentWorkspace:null,spectralForgeCustomStamps:null,residentConstellations:null,
 room3ResidentConstellations:null,browserLocalStorage:null,donorLibrary:{presets:[],assets:[{value:{base64:large}}]},
 forgeExperiment:null};}
const big='A'.repeat(250000);
const output=xQ(fileObj(big),'large');
assert(output.bytes>1.9*big.length);
const data=JSON.parse(output.parts.join(''));
assert.equal(data.samples[0].dataBase64,big);
assert.equal(data.donorLibrary.assets[0].value.base64,big);
assert.equal(data.sections[0].summary,'large');
assert.equal(data.workspace.composer.tracks.length,0);
const date=new Date('2020-01-01T00:00:00.000Z');
const tricky={x:'hi\n\"\\ 😀',array:[undefined,NaN,Infinity,null,true],date,
 omitted:undefined,nested:{undefinedValue:undefined,test:'a'.repeat(140000)}};
const chunks=[];
stream.write(chunks,tricky,(k,v)=>v);
assert.deepEqual(JSON.parse(chunks.join('')),JSON.parse(originalStringify(tricky)));
const cyclic={};cyclic.self=cyclic;
assert.throws(()=>stream.write([],cyclic,(_,v)=>v),/cyclic|circular/i);
const t=trace.begin();trace.step('sample-store-read',{count:4,bytes:1024,secret:'private-audio'});trace.fail(new RangeError('Invalid string length'));
const log=trace.read();
assert.equal(log.runs.at(-1).status,'error');
assert.equal(log.runs.at(-1).events[1].stage,'sample-store-read');
assert(!originalStringify(log).includes('private-audio'));
assert(!originalStringify(log).includes(big.slice(0,100)));
assert.match(fs.readFileSync(path.join(root,'src/runtime/instrument/05_timing_and_admission.js'),'utf8'),/package_station_export_trace\.json/,'Runtime diagnostic ZIP must include export trace');
assert.match(app,/__XenPackageExportTraceP315\.begin\(/,'Actual export initiates trace');
assert.match(app,/__XenPackageExportTraceP315\.fail\(/,'Actual export records failure');
assert.match(app,/__XenPackageExportTraceP315\.step\(/,'Actual export records stages');
console.log('PASS P3.15 streaming real workspace serializer; large nested archive; same decoded JSON; diagnosis ZIP; safe bounded trace');
