'use strict';
const assert=require('assert/strict'),fs=require('fs'),{load,PCMBuffer}=require('./offline_runtime.cjs');const h=load(process.cwd());h.context.probePCM=new PCMBuffer({numberOfChannels:1,length:128,sampleRate:48000});h.context.probePCM.getChannelData(0).fill(.2);
const result=h.run(`(()=>{xt.ctx={sampleRate:48000};pe.getState().setCarrierIntegralSelection({machineId:'raw-darkpsy-oscillator',source:'user'});const s=pe.getState(),make=s.createProjectSnapshot;let copies=0;pe.setState({createProjectSnapshot:()=>{copies++;return make()}});try{
 const request=__f333HearingRequest(pe.getState()),key=__f333HearingCacheKey(request,IB(request));__f433RememberHearing(key,probePCM);copies=0;const start=performance.now();for(let i=0;i<80;i++)if(!__f333CachedPreviewReady(pe.getState()))throw Error('ready PCM missed');const milliseconds=performance.now()-start,steadyCopies=copies;
 const unchanged=()=>__f333CachedPreviewReady(pe.getState());__F3564Master.set('volume',72);if(!unchanged()||copies!==steadyCopies)throw Error('volume does not alter raw PCM identity');
 __F3564Master.set('tuning',1);if(unchanged())throw Error('pitch must invalidate');__F3564Master.set('tuning',0);if(!unchanged())throw Error('old pitch should reuse PCM');
 pe.getState().updateMaterialExport({bpm:151});if(unchanged())throw Error('tempo must invalidate');pe.getState().updateMaterialExport({bpm:s.materialExport.bpm});if(!unchanged())throw Error('old tempo should reuse PCM');
 pe.getState().spectralData.set(17,280,.7);pe.getState().triggerRender();if(unchanged())throw Error('local paint must invalidate');
 __f449ReleaseForgeDerivedCaches();if(unchanged()||__f333ReadyMemo!==null)throw Error('cache release must release memo and PCM');return {steadyCopies,milliseconds,checks:['same-input polling','gain identity','pitch','tempo','local paint','cache release']};
 }finally{pe.setState({createProjectSnapshot:make})}})()`);assert(result.steadyCopies<=1);console.log('PASS ready identity reuses one snapshot and invalidates acoustic changes',JSON.stringify(result));
const portability=h.run(`(()=>{const values={
 'xensonar:grid-tuning-library:derived-v1':{version:1,source:'bass',grids:{'12edo':{sourceMode:'derived',mutedDegrees:[2,4],offsetsCents:{7:13}}}},
 'xensonar:refucktor-drone-workbench.v1':{dronePreset:'dark_sub',droneWobbleDepth:.37},'xensonar:refucktor-drone-volume.v1':.32,
 'xensonar.mix-pan.v1':{keyboard:-.4,material:.3},'xensonar.source-octaves.v1':{keyboard:1},'xensonar.quick-menu.v1':[{kind:'grid',id:'12edo',name:'12 EDO'}],
 'xensonar.melodic.custom-instruments.v1':{version:1,entries:[]},'xensonar.nodal.instruments.v1':{schemaVersion:1,entries:[]},'xensonar.entrophon.instruments.v1':{schemaVersion:1,entries:[]},
 'xensonar.fractalia.f4':{name:'Probe'},'xensonar.fractalia.instruments.v4':[],'xensonar.fractalia.compare.f433':{version:1,A:null,B:null},'xensonar.forge.emilia-hx-reciprocal.v4':{name:'Probe'}};
 for(const [key,value]of Object.entries(values))localStorage.setItem(key,JSON.stringify(value));localStorage.setItem('unrelated-app-setting','do not export');const archive=Q7();
 for(const key of Object.keys(values)){if(!archive.entries.some(e=>e.key===key))throw Error('missing '+key);localStorage.removeItem(key)}
 const report=XEe({payload:JSON.parse(JSON.stringify(archive)),mode:'replace'});for(const [key,value]of Object.entries(values))if(localStorage.getItem(key)!==JSON.stringify(value))throw Error('lost '+key);
 localStorage.setItem('xensonar.nodal.instruments.v1','retained new library');XEe({payload:{schemaVersion:1,entries:[]},mode:'replace'});if(localStorage.getItem('xensonar.nodal.instruments.v1')!=='retained new library')throw Error('old package erased a newer library');
 return {schemaVersion:archive.schemaVersion,count:Object.keys(values).length,report,unrelated:archive.entries.some(e=>e.key==='unrelated-app-setting')};})()`);
assert.equal(portability.schemaVersion,2);assert.equal(portability.count,13);assert.equal(portability.unrelated,false);console.log('PASS portable current settings lossless roundtrip, legacy replace protection and narrow registry',JSON.stringify(portability));
fs.mkdirSync('results/forge-efficiency',{recursive:true});fs.writeFileSync('results/forge-efficiency/host-contracts.json',JSON.stringify({entry:require('../source-manifest.json').entry,sha256:require('../source-manifest.json').sha256,readiness:result,portability},null,2)+'\n');
