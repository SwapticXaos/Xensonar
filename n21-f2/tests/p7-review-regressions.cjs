'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),cp=require('child_process'),m=require('../source-manifest.json');
const html=fs.readFileSync(m.entry,'utf8');let scripts=0;
for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
 if(!match[2].trim()||(/type=/.test(match[1])&&!/module|javascript/.test(match[1])))continue;
 const result=cp.spawnSync(process.execPath,['--check','--input-type='+(/module/.test(match[1])?'module':'commonjs')],{input:match[2],encoding:'utf8',maxBuffer:2e6});assert.equal(result.status,0,result.stderr);scripts++;
}
assert(scripts>0);console.log('PASS complete built HTML script syntax ('+scripts+' scripts)');
const broken=fs.readFileSync('docs/p7-review/received/patches/22_P7_11_PREVIEW_COMPACT_AND_PEDAL_SMOOTHING.xpatch.json','utf8');assert(broken.includes('aria-label:'));
const production=fs.readFileSync('src/forge_and_melodic/06_note_editor_and_material_tools.js','utf8');assert(!production.includes('aria-label:`Preview'));
// The new resolver must refresh previously played live revisions after an edit.
const code=fs.readFileSync('src/instruments/05_entrophon_integration.js','utf8').split('function entrophonSoundOptions(')[0];let latest=1,listener;
const old={name:'old',config:{volume:.2}},next={name:'new',config:{volume:.8}},sandbox={window:{addEventListener:(type,fn)=>{assert.equal(type,'xensonar:entrophon-library-changed');listener=fn}},entrophonFindInstrument:id=>id==='entrophon:A@'+latest?(latest===1?old:next):null,__XenEntrophonLibrary:{list:()=>[{id:'A',revision:latest,instrument:latest===1?old:next}]}};
vm.createContext(sandbox);vm.runInContext(code+';this.resolve=entrophonLiveDefinition',sandbox);assert.equal(sandbox.resolve('entrophon:A@1'),old);latest=2;listener();assert.equal(sandbox.resolve('entrophon:A@1'),next);assert.equal(old.config.volume,.2);assert.equal(sandbox.resolve('entrophon:B@1'),null);console.log('PASS cached live revision refresh, same instrument identity and captured snapshot unchanged');
const source=fs.readFileSync('src/runtime/01_instrument_state.js','utf8');const start=source.indexOf('const __xenDronePersist='),end=source.indexOf('})();',start)+5;let stored='';const persistence=vm.runInNewContext(source.slice(start,end)+';__xenDronePersist',{localStorage:{getItem:()=>stored,setItem:(_k,v)=>stored=v}});
stored=JSON.stringify({droneFixedHz:'bad',droneRefucktorEcho:true,droneCursorFollow:'true',droneWobbleRate:'1/16',droneVolume:123});assert.deepEqual(JSON.parse(JSON.stringify(persistence.load())),{droneWobbleRate:'1/16'});console.log('PASS typed persisted Drone controls reject invalid AudioParam payloads');
(async()=>{
 const {load,PCMBuffer}=require('./offline_runtime.cjs'),h=load(process.cwd());h.context.testPCM=new PCMBuffer({numberOfChannels:1,length:48000,sampleRate:48000});h.context.testPCM.getChannelData(0).fill(.2);
 const state=await h.run(`(async()=>{const render=__f333RenderCurrent,context=xt.getContext;let release;xt.getContext=()=>({state:'running'});__f333RenderCurrent=()=>new Promise(r=>release=r);try{__ForgeNavigatorSample.select(.1,.4);const pending=__f333PreviewNavigatorSample();if(!__ForgeNavigatorSample.snapshot().previewBusy)throw Error('busy not entered');__ForgeNavigatorSample.select(.2,.4);release({buffer:testPCM});await pending;return {...__ForgeNavigatorSample.snapshot()}}finally{__f333RenderCurrent=render;xt.getContext=context}})()`);
 assert.equal(state.previewBusy,false);assert.equal(state.previewing,false);console.log('PASS stale Navigator preview releases busy without starting or clearing a newer job');
 // Decode rejection after cancellation cannot clear the newer recording or publish an error.
 const transport=fs.readFileSync('src/audio/03_rfl_transport_legacy.js','utf8'),fn=transport.slice(transport.indexOf('function pve('),transport.indexOf('function hve('));let cancelled=false,rejectDecode,writes=0;
 const env={Blob,eL(){},ave(){writes++},dve(){writes++;return{}},uve(){writes++;return{}}};vm.createContext(env);vm.runInContext(fn+';this.stop=pve;',env);
 const rec={},job=env.stop({ctx:{decodeAudioData:()=>new Promise((_resolve,reject)=>rejectDecode=reject)},recorder:rec,recordingChunksRef:{current:[new Blob(['data'])]},recordedBufferRef:{current:null},recordingMarkersRef:{current:[]},lastRecordingSourceModeRef:{current:'with_drums'},updateRecordingPreviewUrl(){if(cancelled)writes++},setRecordingWaveform(){writes++},setRecordingPlayheadMs(){writes++},setRecordingState(){writes++},isDiscarded:()=>cancelled})();
 for(let i=0;i<20&&!rejectDecode;i++)await new Promise(r=>setImmediate(r));assert(rejectDecode);cancelled=true;rejectDecode(Error('late decoder error'));await job;assert.equal(writes,0);console.log('PASS cancelled decoder rejection cannot publish into the next take');
})().catch(e=>{console.error(e);process.exitCode=1});
