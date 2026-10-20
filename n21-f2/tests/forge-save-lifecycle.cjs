'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{load}=require('./offline_runtime.cjs');
const h=load(process.cwd());
(async()=>{
 const result=await h.run(`(async()=>{
 const oldSet=setTimeout,oldClear=clearTimeout;let now=0,next=0,copies=0,writes=0;const timers=new Map(),records=new Map();
 setTimeout=(fn,delay)=>{const id=++next;timers.set(id,{at:now+delay,fn});return id};clearTimeout=id=>timers.delete(id);
 const tick=async ms=>{const target=now+ms;for(;;){let first=null;for(const [id,t]of timers)if(t.at<=target&&(!first||t.at<first[1].at))first=[id,t];if(!first)break;now=first[1].at;timers.delete(first[0]);first[1].fn();for(let i=0;i<15;i++)await Promise.resolve()}now=target;for(let i=0;i<15;i++)await Promise.resolve()};
 const make=pe.getState().createProjectSnapshot;pe.setState({createProjectSnapshot:()=>{copies++;return make()}});
 const storage={get:async id=>records.get(id)||null,has:async id=>records.has(id),put:async row=>{writes++;records.set(row.id,row)}};
 const controller=__ForgeF33.createExperimentStatePersistenceController({store:pe,runtime:Vt,prepareDonor:async()=>null,storage,debounceMs:100,maxLatencyMs:400});
 try{await controller.start();for(let i=1;i<=80;i++){pe.getState().setPlayheadPosition(i/80);pe.getState().setIsPlaying(true);pe.getState().setShowPlayheadMarker(true);pe.setState({basisHearingTransportBridge:{...pe.getState().basisHearingTransportBridge,progress:i/80}});await tick(16)}await tick(200);const playback={copies,writes};
 pe.getState().updateMaterialExport({name:'Saved actual edit'});pe.getState().spectralData.set(11,18,.625);pe.getState().spectralData.setGrain(11,18,.375);pe.getState().triggerRender();await tick(200);const afterEdit={copies,writes,name:records.get('workspace:autosave-v1')?.value.projectSnapshot.materialExport.name,pixel:records.get('workspace:autosave-v1')?.value.projectSnapshot.spectralSnapshot[18*2048+11]};
 pe.getState().updateMaterialExport({name:'Explicitly flushed edit'});await controller.saveNow();const flushedCopies=copies;await tick(200);const afterFlush={flushedCopies,copies,name:records.get('workspace:autosave-v1')?.value.projectSnapshot.materialExport.name};return {playback,afterEdit,afterFlush};
 }finally{controller.dispose();pe.setState({createProjectSnapshot:make});setTimeout=oldSet;clearTimeout=oldClear}
})()`);
 fs.writeFileSync('results/forge-smoothness/autosave.json',JSON.stringify({entry:require('../source-manifest.json').entry,sha256:require('../source-manifest.json').sha256,...result},null,2)+'\n');
 console.log(JSON.stringify(result));assert.equal(result.playback.copies,0,'unchanged playback must not allocate project snapshots for autosave');assert.equal(result.playback.writes,0);assert.equal(result.afterEdit.copies,1);assert.equal(result.afterEdit.name,'Saved actual edit');assert.equal(result.afterEdit.pixel,.625);assert.equal(result.afterFlush.copies,result.afterFlush.flushedCopies,'explicit save consumes the pending autosave');assert.equal(result.afterFlush.name,'Explicitly flushed edit');console.log('PASS autosave ignores playback-only updates and preserves actual project edits');
})().catch(error=>{console.error(error);process.exitCode=1});
