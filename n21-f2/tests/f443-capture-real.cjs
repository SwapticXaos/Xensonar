'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{load}=require('./offline_runtime.cjs');
const root=path.resolve(__dirname,'..'),runtimes=[load(root,{forge443Baseline:true}),load(root)],report={checks:[],timings:[]};
const setup=`
var __captureGrid=new ph(128,150);
for(let x=0;x<128;x++)for(let y=0;y<150;y++){__captureGrid.set(x,y,x>8&&x<118?.7*Math.exp(-((y-75)**2)/12):0);__captureGrid.setGrain(x,y,.4);}
pe.setState({spectralData:__captureGrid,renderVersion:1});
__F341Workbench.restore(__F341Workbench.make({preset:'material-flow',params:{...__F341Workbench.getPresets().find(p=>p.id==='material-flow').values}}));
var __captureRaw={version:'fixture',samples:Float32Array.from({length:1024},(_,i)=>.2*Math.sin(i*.04)),sampleRate:16000,atlas:{nodes:[]}};
var __captureDonor={selected:true,source:{fileName:'fixed.wav',monoSamples:new Float32Array([.1,.2]),channelCount:1,sampleRate:16000,importStartSec:0,importDurationSec:2/16000},model:{hybrid:{sourceGrains:__captureRaw}},sourceRevision:1};
var __captureCopies=0,__captureCopyBytes=0,__originalSnapshot=pe.getState().createProjectSnapshot;
pe.setState({createProjectSnapshot:()=>{__captureCopies++;const snapshot=__originalSnapshot();__captureCopyBytes+=snapshot.spectralSnapshot.byteLength;return snapshot;}});
var __captureAPI=__createF352JobCapture({pe,Vt:{getSnapshot:()=>__captureDonor},__F341Workbench,__F352Session,xR,__f333Signature,__f352Clone,__f352Freeze,Zp,ph,__ForgeF33,__f3565PitchSemis,__f3565PitchSupport,sourceKey:source=>__F353SourceIdentity.key(source),readTuning:()=>__F3564Master.getSnapshot().tuning});
function __captureComparable(){const j=__captureAPI.capture(pe.getState());return JSON.parse(JSON.stringify({key:j.key,donorKey:j.donorKey,syntheticKey:j.syntheticKey,config:j.config,cecilia:j.cecilia,recipe:j.recipe,manifest:j.manifest,support:j.support},(k,v)=>ArrayBuffer.isView(v)?Array.from(v):v));}
`;
for(const h of runtimes)h.run(setup);
function compare(name,change=''){const values=runtimes.map(h=>{if(change)h.run(change);return JSON.parse(JSON.stringify(h.run('__captureComparable()')))});assert.deepEqual(values[1],values[0],name);report.checks.push(name);}
compare('real ph, canonical snapshot, support builder and source identity');
compare('unchanged real carrier');
compare('same revision in-place geometry mutation','__captureGrid.set(64,75,.1);');
compare('grain-only edits preserve baseline support semantics','__captureGrid.setGrain(64,75,.9);');
compare('invalid melodic metadata canonicalizes exactly','__captureGrid.melodicCarrier={version:"invalid",notes:[{hz:330}]};');
compare('in-place invalid metadata edit','__captureGrid.melodicCarrier.notes[0].hz=440;');
for(const h of runtimes){h.run('__captureGrid.clear()');assert.throws(()=>h.run('__captureComparable()'),/carrier figure is empty/);}
report.checks.push('same revision empty carrier still raises original error');
compare('restore after failed empty carrier','__captureGrid.set(64,75,.6);');
compare('snapshot from new current state','var __oldState=pe.getState();var __newGrid=new ph(128,150);__newGrid.set(70,80,.8);pe.setState({spectralData:__newGrid});');
for(const h of runtimes){const job=h.run('__captureAPI.capture(__oldState)');h.context.__staleJob=job;}
const stale=runtimes.map(h=>JSON.parse(JSON.stringify(h.run('({key:__staleJob.key,carrier:__staleJob.manifest.carrierKey,support:__staleJob.support})'),(k,v)=>ArrayBuffer.isView(v)?Array.from(v):v)));
assert.deepEqual(stale[1],stale[0]);report.checks.push('explicit stale state retains current snapshot-provider behavior');
compare('current capture after intervening stale capture');
const times=[[],[]];for(let repetition=-1;repetition<5;repetition++)for(const index of repetition%2?[0,1]:[1,0]){const h=runtimes[index],start=performance.now();h.run('for(let i=0;i<40;i++)__captureAPI.capture(pe.getState());');const ms=performance.now()-start;if(repetition>=0)times[index].push(ms);}
const median=a=>[...a].sort((a,b)=>a-b)[2];report.timings.push({capturesPerRun:40,runs:5,baselineMs:median(times[0]),candidateMs:median(times[1]),times,snapshotCopies:runtimes.map(h=>h.run('__captureCopies')),copiedSpectralBytes:runtimes.map(h=>h.run('__captureCopyBytes')),scope:'actual snapshot/grid/support code, warm carrier, Node/V8; not full app latency'});
fs.writeFileSync(path.join(root,'results/f443-capture-real.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
