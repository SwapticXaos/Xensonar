'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),report={checks:[],cost:[]};
const plain=x=>JSON.parse(JSON.stringify(x,(k,v)=>ArrayBuffer.isView(v)?Array.from(v):v));
function harness(baseline){
 const source=fs.readFileSync(path.join(root,baseline?'tests/fixtures/f442_forge_baseline/src/forge/hybrid/06_job_capture.js':'src/forge/hybrid/06_job_capture.js'),'utf8');
 const recipe={enabled:true,amount:.35,mode:'parallel'},config={params:{materialPilot:true,carrierTranspose:0,variantRevision:'revised'},regions:[]};
 const raw={version:'fixture',sampleRate:8000,samples:new Float32Array([.1,.2,.3]),atlas:{nodes:[]}},donor={selected:true,source:{id:'donor-A'},model:{hybrid:{sourceGrains:raw}},sourceRevision:2};
 const cost={snapshots:0,restores:0,signatures:0,plans:0};let transposition=0,tuning='JI',current;
 const state={renderVersion:1,spectralData:{width:128,height:150,values:Float32Array.from({length:19200},(_,i)=>i%9?.3:0),melodicCarrier:null},materialExport:{bars:1,bpm:120,beatsPerBar:4},carrierIntegralSynthLab:{readerSettings:{vocal:{color:.4}}},createProjectSnapshot(){cost.snapshots++;return{spectralSnapshot:new Float32Array(current.spectralData.values),melodicCarrier:plain(current.spectralData.melodicCarrier)}}};
 current=state;
 const signature=grid=>{cost.signatures++;return Array.from(grid.values).join(',')};
 const context=vm.createContext({console,Map,Set,Float32Array,Float64Array,ArrayBuffer,DOMException,Math,Object,JSON});
 vm.runInContext(fs.readFileSync(path.join(root,'src/forge/hybrid/05_capture_tools.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'src/forge/hybrid/10_carrier_capture.js'),'utf8')+'\n'+source+'\nglobalThis.make=__createF352JobCapture',context);
 const api=context.make({pe:{getState:()=>current},Vt:{getSnapshot:()=>donor},__F341Workbench:{getConfig:()=>config,fingerprint:JSON.stringify,materialModel:(raw,c)=>({...raw,selection:c.regions})},__F352Session:{export:()=>({...recipe})},xR:(kind,settings)=>plain(settings?.vocal??{}),__f333Signature:signature,__f352Clone:x=>structuredClone(x),__f352Freeze:x=>x,Zp:(bars,bpm,beats)=>bars*beats*60/bpm,ph:class{constructor(width,height){Object.assign(this,{width,height})}restoreData(values){cost.restores++;this.values=new Float32Array(values)}},__ForgeF33:{buildCarrierSupportPlan(grid){cost.plans++;return{bands:[{gainCurve:new Float32Array(grid.values),centerRatioCurve:new Float32Array(grid.values.length).fill(1)}]}}},__f3565PitchSemis:()=>transposition,__f3565PitchSupport:(support,semitones)=>semitones?{...support,semitones}:support,sourceKey:s=>s.id,readTuning:()=>tuning});
 return{api,state,config,recipe,raw,donor,cost,setCurrent:v=>current=v,transpose:v=>transposition=v,tuning:v=>tuning=v};
}
function shape(job){return plain({key:job.key,donorKey:job.donorKey,syntheticKey:job.syntheticKey,support:job.support,model:job.model,config:job.config,cecilia:job.cecilia,recipe:job.recipe,manifest:job.manifest,durationSec:job.durationSec,sampleRate:job.sampleRate})}
const a=harness(true),b=harness(false);
function compare(name,mutate=()=>{}){for(const h of [a,b])mutate(h);const x=a.api.capture(a.state),y=b.api.capture(b.state);assert.deepEqual(shape(y),shape(x),name);report.checks.push(name);return y;}
compare('first capture matches all keys, support, manifest and sound settings');
const first=compare('unchanged capture preserves all published fields');
for(let i=0;i<6;i++)compare('repeated capture '+i);
const baselineCopies=a.cost.snapshots,candidateCopies=b.cost.snapshots;
report.cost.push({captures:8,baselineCopies,candidateCopies});
if(!process.argv.includes('--observe-baseline'))assert.equal(candidateCopies,1,'unchanged carrier must not copy the project again');
compare('same mutable grid change without revision',h=>h.state.spectralData.values[31]=.72);
compare('same grid revision change',h=>{h.state.spectralData.values[25]=.95;h.state.renderVersion++});
compare('new grid object with same content',h=>h.state.spectralData={...h.state.spectralData,values:new Float32Array(h.state.spectralData.values)});
compare('new grid object with changed content',h=>{h.state.spectralData={...h.state.spectralData,values:new Float32Array(h.state.spectralData.values)};h.state.spectralData.values[50]=.8});
compare('melodic metadata on same grid object',h=>h.state.spectralData.melodicCarrier={revision:1,tracks:[{hz:220,gain:.7}]});
compare('melodic metadata changed in place',h=>h.state.spectralData.melodicCarrier.tracks[0].hz=330);
compare('independent duration changes',h=>h.state.materialExport.bars=3);
compare('tempo changes',h=>h.state.materialExport.bpm=97);
compare('donor changes',h=>h.donor.source={id:'donor-B'});
compare('config changes',h=>h.config.params.position=.7);
compare('recipe changes',h=>h.recipe.amount=.8);
compare('transpose changes',h=>h.transpose(7));
compare('tuning changes',h=>h.tuning('19edo'));
assert.strictEqual(b.api.capture(b.state).model.samples,b.raw.samples,'read-only raw PCM identity retained');
const copied=b.cost.snapshots;b.api.capture(b.state);assert.equal(b.cost.snapshots,copied);
assert.notStrictEqual(first.config,b.config);report.checks.push('project inputs are independent; PCM ownership preserved');
// Return to an earlier carrier must preserve keys after the bounded memo is replaced.
compare('stale state with newer global snapshot provider',h=>h.setCurrent({...h.state,spectralData:{...h.state.spectralData,values:new Float32Array(h.state.spectralData.values).fill(.19)}}));
compare('return to original current owner',h=>h.setCurrent(h.state));
compare('return to an earlier duration',h=>h.state.materialExport.bars=1);
const start=performance.now();for(let i=0;i<30;i++)a.api.capture(a.state);const oldMs=performance.now()-start;
const after=performance.now();for(let i=0;i<30;i++)b.api.capture(b.state);const nextMs=performance.now()-after;
report.cost.push({captures:30,oldMs,nextMs,note:'instrumented synthetic grid; not full application latency'});
fs.writeFileSync(path.join(root,'results/f443-capture.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.cost));console.log('PASS',report.checks.length,'capture contract cases');
