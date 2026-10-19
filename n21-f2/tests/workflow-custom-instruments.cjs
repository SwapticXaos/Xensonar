'use strict';
const assert=require('assert/strict'),fs=require('fs'),{load}=require('./offline_runtime.cjs');
const h=load(process.cwd());
const result=JSON.parse(h.run(`JSON.stringify((()=>{
 const raw={tracks:[{...Vp[0],enabled:true}],notes:[],pitchSteps:[{id:'step-0',ratio:1,muted:false}],pitchLines:[{id:'line-0',hz:220}],baseHz:220,tuning:'ji',stepsPerBar:4,beatsPerBar:4,bars:1,zoom:1,scrollX:0,activeTrackIds:[Vp[0].id],selectedTrackId:Vp[0].id};
 raw.notes=[pr(raw,{id:'one',trackId:Vp[0].id,startUnit:0,durationUnits:1,channelIndex:0,velocity:.7,localField:H5(H5(Yf(Dx(),'dynamic-fade'),'left',.2),'right',-.7)})];
 const composer=$n(raw),before=JSON.stringify({tracks:composer.tracks,notes:composer.notes}),entry=__mlSaveCustomInstrument(composer,composer.notes[0],'Reusable body',fn=>fn(composer));
 const savedField=JSON.stringify(entry.instrument.fields),authoredPreserved=JSON.stringify({tracks:composer.tracks,notes:composer.notes})===before;
 composer.notes[0].localField=H5(composer.notes[0].localField,'right',.8);
 const snapshotIsolated=JSON.stringify(entry.instrument.fields)===savedField;
 composer.tracks[0].instrumentPreset=entry.id;
 const reload=$n(JSON.parse(JSON.stringify(composer))),request={composer:reload,trackIds:[Vp[0].id],bpm:240,bars:1},requestBefore=JSON.stringify(request),expanded=__mlResolveCustomRequest(request);
 const preserveAuthored=JSON.stringify(request)===requestBefore,notFlattened=expanded.composer.tracks[0].instrumentPreset===entry.instrument.basePreset;
 const fieldLayers=expanded.composer.notes[0].instrumentFields.length,localFieldKept=JSON.stringify(expanded.composer.notes[0].localField)===JSON.stringify(reload.notes[0].localField),idempotent=__mlResolveCustomRequest(expanded)===expanded;
 const materialRoute=__mlNodalRflConfig(reload).sourceKind;
 localStorage.removeItem(__mlCustomStorageKey);
 const independent=__mlResolveCustomRequest(request).composer.tracks[0].instrumentPreset===entry.instrument.basePreset;
 const menu=__mlCustomMenu(reload).flatMap(group=>group.options).some(option=>option.id===entry.id);
 const n=nodalOpenStarter('hollow'),source='nodal:shared-source@1',a={name:'A',basePreset:source,fields:[],voice:{},nodalInstrument:n},b={...a,name:'B',nodalInstrument:{...n,coupling:.65}};
 const dual={...reload,tracks:[{...reload.tracks[0],id:'a',instrumentPreset:'custom:body-a@1'},{...reload.tracks[0],id:'b',instrumentPreset:'custom:body-b@1'}],notes:[{...reload.notes[0],id:'a1',trackId:'a',localField:null},{...reload.notes[0],id:'b1',trackId:'b',localField:null}],customInstruments:{'custom:body-a@1':__mlCustomDefinition(a),'custom:body-b@1':__mlCustomDefinition(b)}};
 const freshTrack={...reload.tracks[0],id:'fresh',instrumentPreset:'custom:source-voice@1'},freshNote=pr({...reload,tracks:[freshTrack]},{id:'fresh-note',trackId:'fresh',startUnit:0,durationUnits:1,channelIndex:0});
 const voiceDefinition=__mlCustomDefinition({name:'Saved slice',basePreset:'sample:source',fields:[],voice:{sampleOffsetSec:.23,samplePlaybackDurationSec:.31,materialPitchMode:'source-granular'}});
 const fresh=__mlResolveCustomRequest({composer:{...reload,tracks:[freshTrack],notes:[freshNote],customInstruments:{'custom:source-voice@1':voiceDefinition}}}).composer.notes[0];
 const freshNoteSource=fresh.sampleOffsetSec===.23&&fresh.samplePlaybackDurationSec===.31&&fresh.materialPitchMode==='source-granular';
 const split=__mlResolveCustomRequest({composer:dual}),ids=split.composer.tracks.map(track=>track.instrumentPreset),distinctBodies=ids[0]!==ids[1]&&split.composer.nodalInstruments[ids[0]].coupling!==split.composer.nodalInstruments[ids[1]].coupling;
 let cycleRejected=false;try{__mlCustomDefinition({name:'bad',basePreset:'custom:cycle@1',fields:[]})}catch{cycleRejected=true}
 const originalWrite=localStorage.setItem;let failed=false,mutated=false;localStorage.setItem=()=>{throw Error('quota')};try{__mlSaveCustomInstrument(raw,raw.notes[0],'Fail',()=>mutated=true)}catch{failed=true}finally{localStorage.setItem=originalWrite}
 return {authoredPreserved,snapshotIsolated,preserveAuthored,notFlattened,fieldLayers,localFieldKept,idempotent,independent,menu,materialRoute,distinctBodies,freshNoteSource,cycleRejected,quotaFailure:failed&&!mutated};
})())`));
for(const key of ['authoredPreserved','snapshotIsolated','preserveAuthored','notFlattened','localFieldKept','idempotent','independent','menu','distinctBodies','freshNoteSource','cycleRejected','quotaFailure'])assert.equal(result[key],true,key);
assert.equal(result.fieldLayers,1);assert.equal(result.materialRoute,'material');
fs.mkdirSync('results/workflow-integrity',{recursive:true});fs.writeFileSync('results/workflow-integrity/custom-instruments.json',JSON.stringify(result,null,2)+'\n');
console.log('PASS custom instruments: original engines, independent field layers, source snapshots, project reload/library deletion, collision-free bodies, quota failure and RFL material routing');
