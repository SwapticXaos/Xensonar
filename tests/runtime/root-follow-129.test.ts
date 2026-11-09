import { createRootFollowSampleRepository, prepareRootFollowSamples } from '../../src/features/xensonar/rootFollow/rootFollowSamplePreparation';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRootFollowSampleElasticSegmentPlan as plan } from '../../src/features/xensonar/rootFollow/rootFollowSampleElasticPlan';
import { buildRootFollowDirectEventWindow } from '../../src/features/xensonar/rootFollow/rootFollowDirectEventWindow';
import { buildRootFollowCrisisRenderEnvelope, limitRootFollowDirectEventsUnderCrisis } from '../../src/features/xensonar/rootFollow/rootFollowCrisisRenderPolicy';
import { createEmptyLoopComposer } from '../../src/features/l3lab/canonicalForge/loopDrumDomain';
import { buildSynthRootFollowEntryConfig } from '../../src/features/l3lab/canonicalForge/rootFollowSynthSnapshot';
import { normalizeRootFollowBankEntryConfig } from '../../src/features/xensonar/rootFollow/rootFollowTypes';
import { encodeChannelsFloat32ToWavBlob } from '../../src/features/l3lab/spectralForge/audio/wavEncoding';
import { resolveRootFollowDirectNoteRenderPlan } from '../../src/features/xensonar/rootFollow/rootFollowDirectNoteResolve';
import { scheduleRootFollowSampleDirectBody } from '../../src/features/xensonar/rootFollow/rootFollowDirectNoteRenderBody';
import { coordinateRootFollowSynthWindow } from '../../src/features/xensonar/rootFollow/rootFollowSynthWindowCoordinator';
const sr=24000;
const data=Float32Array.from({length:sr*2},(_,i)=>0.3*Math.sin(2*Math.PI*220*i/sr));
const buffer={duration:2,sampleRate:sr,length:data.length,numberOfChannels:1,getChannelData:()=>data} as AudioBuffer;
const base={buffer,noteStart:0,noteDuration:2,safeOffsetSec:0,sliceDurationSec:2,basePlaybackRate:1,localField:null,quality:'base' as const,mode:'flowing' as const};
function segments(step:number) { const result=[];for(let t=0;t<2-1e-8;t+=step) result.push(...plan({...base,segmentStart:t,segmentEnd:Math.min(2,t+step)})!.grains);return result; }
test('grain lattice is invariant under 24ms vs 41ms control ticks; tails overlap',()=>{
 const a=segments(.024),b=segments(.041);
 assert.equal(a.length,b.length);
 a.forEach((g,i)=>{ assert.ok(Math.abs(g.when-b[i].when)<1e-8);assert.ok(Math.abs(g.srcStart-b[i].srcStart)<1e-8);});
 assert.ok(a[0].actualGrainOut>.1); assert.ok(a.length<30,`sources: ${a.length}`);
});
test('unity-ratio PCM preserves a pure tone through scheduling boundaries',()=>{
 const out=new Float32Array(sr*2); const grains=segments(.024);
 const hop=grains[1].when-grains[0].when;
 for(const g of grains){for(let i=0;i<Math.floor(g.actualGrainOut*sr);i++){
   const dest=Math.round(g.when*sr)+i;if(dest>=out.length)break;
   const x=g.srcStart*sr+i*g.elasticRate, left=Math.floor(x);
   const value=(data[left]??0)*(1-(x-left))+(data[left+1]??0)*(x-left);
   out[dest]+=value*(.5-.5*Math.cos(2*Math.PI*i/(g.actualGrainOut*sr)))*Math.min(1,2*hop/.19);
 }}
 let error=0,energy=0;for(let i=sr*.3;i<sr*1.7;i++){error+=(out[i]-data[i])**2;energy+=data[i]**2;}
 const relative=Math.sqrt(error/energy);assert.ok(relative<.006,`relative PCM error: ${relative}`);
});
test('stereo encoder preserves opposing channel polarity',async()=>{
 const bytes=await encodeChannelsFloat32ToWavBlob([new Float32Array([.5,-.25]),new Float32Array([-.5,.25])],sr).arrayBuffer();
 const v=new DataView(bytes);assert.equal(v.getUint16(22,true),2);assert.ok(v.getInt16(44,true)>0);assert.ok(v.getInt16(46,true)<0);assert.equal(v.getUint32(40,true),8);
});
function composer(){const c=createEmptyLoopComposer(1);c.notes=[{id:'sample',trackId:'bass',startStep:0,lengthSteps:8,pitchIndex:0,velocity:.7,instrumentPresetOverride:'sample:a',noteClass:'material-base',materialPitchMode:'source-fixed'} as any]; return c;}
test('sample continuation is admitted using render time rather than old onset',()=>{
 const config=buildSynthRootFollowEntryConfig({loopComposer:composer()}); const pattern=config.synthPattern!;
 const events=buildRootFollowDirectEventWindow({entryConfig:config,pattern,beatDurationSec:.5,loopDurationSec:2,transportAnchor:0,nextSliceStart:.2,horizon:.224,sessionAnchorHz:220,ratio:1}).events;
 assert.ok(events.length>0);assert.equal(events[0].renderStart,.2);
 const envelope=buildRootFollowCrisisRenderEnvelope({policy:null,pressureBias:0});
 const kept=limitRootFollowDirectEventsUnderCrisis({events,envelope,currentTime:.18,getEventTime:e=>e.renderStart});assert.equal(kept.length,events.length);
});
test('pressure admission retains each source/track group instead of a chronological prefix',()=>{
 const events=Array.from({length:20},(_,i)=>({time:1,kind:i<19?'synth':'sample'}));
 const envelope={...buildRootFollowCrisisRenderEnvelope({policy:null,pressureBias:1}),densityScale:.35};
 const kept=limitRootFollowDirectEventsUnderCrisis({events,envelope,currentTime:1,getEventTime:e=>e.time,getEventClass:e=>e.kind});
 assert.ok(kept.some(e=>e.kind==='sample')); assert.equal(kept.length,7);
});
test('carrier field becomes individual score events; timbre does not leak into neighboring synth',()=>{
 const c=composer(); const timbre={schemaVersion:'carrier-integral-timbre-v1',presetId:'test',paramsHash:'x',oscillators:[{type:'sine',gain:.2,freqMul:1,detune:0}],filterType:'lowpass',filterFrequency:2000,filterQ:1,attackScale:.1,releaseScale:.2,transientGain:0,panSpread:0,drive:0,outputGain:1} as any;
 c.notes.push({...c.notes[0],id:'figure',instrumentPresetOverride:'reedTone',noteClass:'carrier-field',carrierIntegralTimbre:timbre,carrierIntegralField:{schemaVersion:'carrier-integral-field-v1',voices:[{id:'v1',startRatio:0,durationRatio:.5,relativeSemitones:0,velocity:.8},{id:'v2',startRatio:.5,durationRatio:.5,relativeSemitones:7,velocity:.8}]}} as any);
 const config=normalizeRootFollowBankEntryConfig(JSON.parse(JSON.stringify(buildSynthRootFollowEntryConfig({loopComposer:c}))));
 assert.equal(config.synthPattern!.notes.length,3);assert.equal(config.synthPatch!.carrierIntegralTimbre,null);
 assert.equal(config.synthPattern!.notes[0].carrierIntegralTimbre,null); assert.equal(config.synthPattern!.notes[0].materialPitchMode,'source-fixed');
 const [a,b]=config.synthPattern!.notes.slice(1);assert.ok(b.startBeat>a.startBeat);assert.ok(Math.abs(b.lineHz!/a.lineHz!-2**(7/12))<1e-8);assert.equal(a.carrierIntegralTimbre!.presetId,'test');
});
test('unresolved samples never become oscillators; failed preparation can retry',async()=>{
 const library=require('../../src/features/l3lab/canonicalForge/melodicSampleLibrary'); const original=library.loadMelodicSampleBuffer;let attempts=0;
 library.loadMelodicSampleBuffer=async()=>{attempts++;return attempts===1?null:{buffer,baseHz:220};};
 const ctx={sampleRate:sr} as AudioContext;
 const args={ctx,noteId:'a',noteStart:0,noteDuration:1,velocity:1,trackVolume:1,presetId:'sample:retry',renderSourceKind:'sample-block' as const};
 try{assert.equal(resolveRootFollowDirectNoteRenderPlan(args),null);await prepareRootFollowSamples(ctx,['sample:retry']);assert.equal(resolveRootFollowDirectNoteRenderPlan(args),null);await prepareRootFollowSamples(ctx,['sample:retry']);assert.equal(resolveRootFollowDirectNoteRenderPlan(args)?.kind,'sample');}finally{library.loadMelodicSampleBuffer=original;}
});
class Param {value=1;curves:Float32Array[]=[];setValueAtTime(v:number){this.value=v;}setValueCurveAtTime(c:Float32Array){this.curves.push(c);} }
class Node {gain=new Param();pan=new Param();playbackRate=new Param();starts:any[]=[];connect(){}stop(){}start(...v:any[]){this.starts.push(v);} }
test('sample note owns one panner across ticks, and velocity zero stays silent',()=>{
 let panners=0;const gains:Node[]=[];const ctx={currentTime:0,createGain(){const n=new Node();gains.push(n);return n;},createStereoPanner(){panners++;return new Node();},createBufferSource(){return new Node();}} as any;
 const args={ctx,destination:new Node() as any,registerNode:()=>{},resolved:{kind:'sample',buffer,baseHz:220},noteId:'one',noteStart:.1,noteDuration:2,baseFrequency:220,targetFrequency:220,trackPan:0,noteClass:'material-base',granulationMode:'flowing',granularQualityMode:'base',peak:0} as any;
 scheduleRootFollowSampleDirectBody({...args,renderStart:.1,renderEnd:.124});scheduleRootFollowSampleDirectBody({...args,renderStart:.19,renderEnd:.22});
 assert.equal(panners,1);assert.ok(gains.length>=2);for(const gain of gains)for(const curve of gain.gain.curves)assert.ok(curve.every(x=>x===0));
});
test('synth duration follows half/normal/double transport consistently',async()=>{
 const c=createEmptyLoopComposer(1);c.notes=[{id:'n',trackId:'bass',startStep:0,lengthSteps:4,pitchIndex:0,velocity:.5} as any];const entryConfig=buildSynthRootFollowEntryConfig({loopComposer:c});
 const durations:number[]=[];
 for(const mode of ['half','normal','double'] as const){
 const refs={gainRef:{current:{}},activeSynthVoicesRef:{current:new Map()},activeNodesRef:{current:new Set()},trafficRef:{current:null}} as any;
 await coordinateRootFollowSynthWindow({renderArgs:{ctx:{currentTime:0} as AudioContext,entry:{rootHz:220} as any,entryConfig,quantizeBpm:120,refs,dynamicRefs:{getCurrentRootHzRef:{current:()=>220},granularSettingsRef:{current:null},granulationModeRef:{current:'flowing'}} as any,transportAnchor:.05,nextSliceStart:.05,sessionAnchorHz:220,rootFollowLoopTimeMode:mode},scheduleDirectNote:args=>{durations.push(args.noteDuration);}});
 }
 assert.equal(durations.length,3);assert.equal(durations[0],durations[1]*2);assert.equal(durations[2],durations[1]*.5);
});
test('late preparation cannot overwrite the newer scene; concurrency is bounded', async()=>{
 const pending: Array<()=>void>=[];let active=0,maxActive=0;
 const repository=createRootFollowSampleRepository(id=>new Promise(resolve=>{
   active++;maxActive=Math.max(maxActive,active);pending.push(()=>{active--;resolve({sampleId:id,buffer} as any);});
 }));
 const old=repository.prepare(['sample:old']);const newer=repository.prepare(['sample:new']);
 pending[1]();assert.equal((await newer).committed,true);pending[0]();assert.equal((await old).committed,false);
 assert.equal(repository.get('old'),null);assert.equal(repository.get('new')?.sampleId,'new');
 active=0;maxActive=0;pending.length=0;
 const batch=repository.prepare(Array.from({length:12},(_,i)=>`sample:${i}`));
 for(let i=0;i<12;i++){await Promise.resolve();pending[i]();}
 assert.equal((await batch).committed,true);assert.equal(maxActive,4);
 repository.invalidate();assert.equal(repository.get('0'),null);
});
test('live and audition preparation retain independent sample scenes in one context', async()=>{
 const library=require('../../src/features/l3lab/canonicalForge/melodicSampleLibrary');const original=library.loadMelodicSampleBuffer;
 library.loadMelodicSampleBuffer=async()=>({buffer,baseHz:220});
 const ctx={sampleRate:sr} as AudioContext,live={},audition={};
 const args={ctx,noteId:'x',noteStart:0,noteDuration:1,velocity:1,trackVolume:1,renderSourceKind:'sample-block' as const};
 try{
   await prepareRootFollowSamples(ctx,['sample:live'],live);await prepareRootFollowSamples(ctx,['sample:preview'],audition);
   assert.equal(resolveRootFollowDirectNoteRenderPlan({...args,presetId:'sample:live',sampleOwner:live})?.kind,'sample');
   assert.equal(resolveRootFollowDirectNoteRenderPlan({...args,presetId:'sample:preview',sampleOwner:audition})?.kind,'sample');
   assert.equal(resolveRootFollowDirectNoteRenderPlan({...args,presetId:'sample:preview',sampleOwner:live}),null);
 }finally{library.loadMelodicSampleBuffer=original;}
});
