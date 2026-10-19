'use strict';
const fs=require('fs'),assert=require('assert/strict'),{load}=require('./offline_runtime.cjs');
const h=load(process.cwd());
const spatial=fs.readFileSync('tests/fixtures/maintenance-before/spatial.js','utf8').split('function __mlHasTrackPan')[0].replaceAll('__mlAudibleTracks','__beforeAudibleTracks').replaceAll('__mlOutputChannels','__beforeChannels').replace('function __mlPan','function __beforePan').replaceAll('__mlPan(', '__beforePan(');
const articulation=fs.readFileSync('tests/fixtures/maintenance-before/nodal-bridge.js','utf8').split('function nodalComposerSourceFields')[0].replace('function resolveNodalArticulationFields','function __beforeArticulation');
const cache=fs.readFileSync('tests/fixtures/maintenance-before/render-cache.js','utf8'),partial=cache.slice(cache.indexOf('function __mlPartialSpan('),cache.indexOf('function __mlSpliceBuffer(')).replace('function __mlPartialSpan','function __beforePartial');
h.run(spatial+'\n'+articulation+'\n'+partial);
const result=JSON.parse(h.run(`JSON.stringify((()=>{
 let seed=91827;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 let spatialCases=0,curveCases=0,partialCases=0;
 for(let test=0;test<240;test++){
  const tracks=Array.from({length:12},(_,i)=>({id:'t'+i,enabled:random()>.25,pan:random()>.8?.1:0,instrumentPreset:'p'+i}));
  const notes=Array.from({length:120},(_,i)=>({id:'n'+i,trackId:'t'+Math.floor(random()*14),channelIndex:Math.floor(random()*3),instrumentPresetOverride:random()>.8?'override':undefined}));
  const composer={tracks,notes,pitchSteps:[{muted:false},{muted:true},{muted:false}]},request={composer,trackIds:tracks.filter(()=>random()>.3).map(t=>t.id),noteId:test%5===0?'n'+Math.floor(random()*120):null};
  const options={excludeDrums:true,drumOnly:test%19===0};
  const sources=new Map(tracks.map((track,i)=>[track.instrumentPreset,i%3===0?{buffer:{numberOfChannels:2}}:i%3===1?{kind:'nodal',instrument:{material:{width:.3}}}:{kind:'entrophon',noteBuffers:new Map(notes.filter(n=>n.trackId===track.id).map(n=>[n.id,{buffer:{numberOfChannels:2}}]))}]));
  if(!same(__mlAudibleTracks(request,options),__beforeAudibleTracks(request,options)))throw Error('Audible tracks drift '+test);
  for(const loaded of [new Map(),sources]){if(__mlOutputChannels(request,options,loaded)!==__beforeChannels(request,options,loaded))throw Error('Channel policy drift '+test);spatialCases++;}
 }
 // Preserve the existing conservative stereo policy: a muted stereo note on a
 // track with another audible note still keeps that source's stereo field.
 const conservative={composer:{tracks:[{id:'a',enabled:true,pan:0,instrumentPreset:'mono'}],notes:[{id:'audible',trackId:'a',channelIndex:0},{id:'muted',trackId:'a',channelIndex:1,instrumentPresetOverride:'stereo'}],pitchSteps:[{muted:false},{muted:true}]},trackIds:['a']};
 if(__mlOutputChannels(conservative,{excludeDrums:true},new Map([['stereo',{buffer:{numberOfChannels:2}}]]))!==2)throw Error('Conservative stereo policy changed');
 for(let test=0;test<100;test++){
  const make=()=>H5(H5(Yf(Dx(),test%2?'dynamic-fade':'pitch-elastic'),'left',random()*2-1),'right',random()*2-1);
  const articulation={volumeEnvelope:test%3?make():null,pitchEnvelope:test%4?make():null},field=make(),local=test%13===0?[field,null,make()]:test%5?field:null,fields=Array.from({length:test%4},make);
  if(test%7===0)field.enabled=false;if(test%11===0)field.bypassed=true;
  if(test%17===0)field.range={startRatio:.42,endRatio:.47000000000000003};
  for(const zero of [true,false]){const args=[articulation,local,zero,fields],snapshot=JSON.stringify(args);if(!same(resolveNodalArticulationFields(...args),__beforeArticulation(...args)))throw Error('Curve drift '+test);if(JSON.stringify(args)!==snapshot)throw Error('Authored field mutated');curveCases++;}
 }
 const raw={tracks:[{...Vp[0],enabled:true,instrumentPreset:'subPulse'}],notes:[],pitchSteps:[{id:'s',ratio:1,muted:false}],pitchLines:[{id:'l',hz:220}],baseHz:220,tuning:'ji',stepsPerBar:4,beatsPerBar:4,bars:32,zoom:1,scrollX:0,activeTrackIds:[Vp[0].id],selectedTrackId:Vp[0].id};
 function descriptor(notes,meta='same'){return{meta,notes,noteMap:new Map(notes.map(n=>[String(n.id),JSON.stringify(n)]))};}
 for(let test=0;test<100;test++){
  const composer=$n(raw);composer.notes=Array.from({length:32},(_,i)=>pr(composer,{id:'n'+i,trackId:Vp[0].id,startUnit:i*(test%3?.18:3),durationUnits:.08,channelIndex:0,velocity:.7}));
  const old=descriptor(composer.notes),nextNotes=JSON.parse(JSON.stringify(composer.notes));nextNotes[test%nextNotes.length].velocity=.3;
  if(test%7===0)nextNotes.splice(test%nextNotes.length,1);
  const next=descriptor(nextNotes,test%11===0?'different':'same'),request={composer:{...composer,notes:nextNotes},trackIds:[Vp[0].id],bpm:120,bars:32,noteId:test%13===0?'n0':null};
  if(!same(__mlPartialSpan(old,next,request,{sampleRate:44100}),__beforePartial(old,next,request,{sampleRate:44100})))throw Error('Partial bounds drift '+test);partialCases++;
 }
 const large={composer:{tracks:Array.from({length:96},(_,i)=>({id:'t'+i,enabled:true,pan:0,instrumentPreset:'mono'})),pitchSteps:[{muted:false}],notes:[]},trackIds:Array.from({length:96},(_,i)=>'t'+i)};
 let reads=0;large.composer.notes=Array.from({length:4096},(_,i)=>({id:'n'+i,channelIndex:0,get trackId(){reads++;return 't'+(i%96);}}));
 reads=0;__beforeChannels(large,{excludeDrums:true});const spatialBefore=reads;reads=0;__mlOutputChannels(large,{excludeDrums:true});const spatialAfter=reads;
 const originalZr=Zr;let normalizations=0;Zr=field=>{normalizations++;return originalZr(field);};let curveBefore,curveAfter;
 try{const field=Dx(),args=[{volumeEnvelope:field,pitchEnvelope:field},field,true,[field,field,field]];normalizations=0;__beforeArticulation(...args);curveBefore=normalizations;normalizations=0;resolveNodalArticulationFields(...args);curveAfter=normalizations;}finally{Zr=originalZr;}
 const composer=$n(raw);composer.notes=Array.from({length:48},(_,i)=>pr(composer,{id:'chain'+i,trackId:Vp[0].id,startUnit:(47-i)*.5,durationUnits:.05,channelIndex:0,velocity:.7}));
 const previous=descriptor(composer.notes),changed=JSON.parse(JSON.stringify(composer.notes));changed[47].velocity=.4;
 const next=descriptor(changed),request={composer:{...composer,notes:changed},trackIds:[Vp[0].id],bpm:120,bars:32};
 const originalSpan=__mlNoteSpan;let spans=0,boundsBefore,boundsAfter;__mlNoteSpan=(...args)=>{spans++;return originalSpan(...args);};
 try{spans=0;__beforePartial(previous,next,request,{sampleRate:44100});boundsBefore=spans;spans=0;__mlPartialSpan(previous,next,request,{sampleRate:44100});boundsAfter=spans;}finally{__mlNoteSpan=originalSpan;}
 return{spatialCases,curveCases,partialCases,conservativeStereo:true,operationCounts:{spatialBefore,spatialAfter,curveBefore,curveAfter,boundsBefore,boundsAfter}};
})())`));
assert.equal(result.spatialCases,480);assert.equal(result.curveCases,200);assert.equal(result.partialCases,100);
if(!process.argv.includes('--baseline')){
 assert(result.operationCounts.spatialAfter<result.operationCounts.spatialBefore/10);
 assert(result.operationCounts.curveAfter<result.operationCounts.curveBefore);
 assert(result.operationCounts.boundsAfter<result.operationCounts.boundsBefore);
}
fs.mkdirSync('results/maintenance',{recursive:true});fs.writeFileSync('results/maintenance/'+(process.argv.includes('--baseline')?'baseline':'equivalence')+'.json',JSON.stringify(result,null,2)+'\n');console.log('PASS preservation and counted work:',JSON.stringify(result));
