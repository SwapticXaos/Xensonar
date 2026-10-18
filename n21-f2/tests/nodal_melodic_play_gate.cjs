'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = require('./nodal_sources.cjs').readNodalSources(path.resolve(__dirname,'..'));
const from = source.indexOf('async function nodalPlayMelodic(request)');
const to = source.indexOf('function nodalSendToMelodic(', from);
assert(from > 0 && to > from, 'real melodic transport implementation must be present');
const sourceId = 'nodal:test@1', trackId='t1';
function fakeContext(label) {
 const destinations=[];
 const context = {label, state:'running', sampleRate:48000, currentTime:100, destination:{label:label+'-raw-destination'}, destinations,
  createGain(){return {gain:{value:1}, connect(to){destinations.push(to)}, disconnect(){}}},
  createStereoPanner(){return {pan:{value:0},connect(to){destinations.push(to)},disconnect(){}}},
 };
 return context;
}
const melodicIsolatedContext = fakeContext('legacy-melodic'), sharedContext=fakeContext('shared-xensonar');
const sharedOutput = {label:'shared-final-mix'};
const recorded = {created:[],notes:[],phases:[],stop:false, ensureCalls:0};
const instrument = Object.freeze({name:'Test organ',referenceHz:220, articulation:{durationSec:.25,attackSec:.01,releaseSec:.1}});
const composer={tracks:[{id:trackId, instrumentPreset:sourceId, enabled:true, pan:0, volume:.8}],
 notes:[{id:'n1',trackId,channelIndex:0,startUnit:0,durationUnits:2,velocity:.8}],selectedTrackId:trackId,
 pitchSteps:[{ratio:1}],pitchLines:[{id:'line-0',hz:220}],bars:1,beatsPerBar:4,stepsPerBar:4};
const bridge={async ensureAudio(){recorded.ensureCalls++;return sharedContext},getOutput(ctx){assert.strictEqual(ctx,sharedContext);return sharedOutput},acquireVoice(){return {release(){}}}};
const scripts={
 beginEntrophonMelodicPreparation:()=>new AbortController().signal, hS(){},g9e:()=>1,uP:()=>true,p9e:()=>{recorded.isolatedContextCalls=(recorded.isolatedContextCalls??0)+1;return melodicIsolatedContext},
 __mlSetPhase:p=>recorded.phases.push(p),
 __XenNodalInstallation:{get current(){return bridge}},
 SW:async()=>new Map([[sourceId,{kind:'nodal',instrument,plan:{key:'p1',cost:1}}]]),
 iD:c=>c.stepsPerBar*c.bars,lD:()=>2,
 E$:()=>2,c9e:()=>false,
 __mlSoloTrackId:null,
 yW:(track,note)=>note?.instrumentPresetOverride??track.instrumentPreset,
 __XenNodalLive:{async createPlayer(ctx,dest,admission){recorded.created.push({ctx,dest,admission});return {
  async prepare(){},
  noteOn(inst,opts,at){recorded.notes.push({inst,opts,at});if (recorded.rejectNext) {recorded.rejectNext=false;return null}const ticket=admission.acquire(1);if(!ticket)return null; return {noteOff(){ticket.release()}}},
  stop(){recorded.stop=true},dispose(){recorded.disposed=true}}}},
 Mx(){},
 Ax:(c,n)=>n.startUnit,
 F$:(c,n)=>n.durationUnits,
 uD:(c,n)=>n.channelIndex,
 nodalMelodicNoteOptions:()=>({frequency:220,velocity:.8,gain:.6,durationSec:.3,releaseSec:.1}),
 __mlGetStem:async()=>{throw Error('Nodal-only playback should not render a sample stem')},
 y9e:(session)=>{recorded.session=session},
 setTimeout:()=>0,clearTimeout(){},
};
vm.runInNewContext(source.slice(from,to)+'\nthis.play=nodalPlayMelodic;',scripts,{filename:'06_melodic_bridge.js'});
(async()=>{
 const ok=await scripts.play({composer,bpm:120,bars:1,trackIds:[trackId],noteId:'n1',loop:false,onPhase:p=>recorded.phases.push(p)});
 assert.equal(ok,true,'Nodal selected note should start');
 assert.equal(recorded.ensureCalls,1,'shared owner should activate once');
 assert.equal(recorded.created.length,1,'exactly one live instrument player');
 assert.strictEqual(recorded.created[0].ctx,sharedContext,'Nodal live transport must use established shared XenSonar AudioContext');
 assert(recorded.created[0].ctx !== melodicIsolatedContext,'Nodal must not use separate preview context');
 assert.equal(recorded.isolatedContextCalls??0,0,'Nodal Play must never create the isolated legacy preview context');
 assert(recorded.created[0].ctx.destinations.includes(sharedOutput),'Nodal preview must route via shared final mix bus');
 assert.equal(recorded.notes.length,1,'real note-on must reach Worklet player');
 assert.equal(recorded.notes[0].opts.confirmStart,true,'selected note must request Worklet acknowledgement');
 assert(recorded.phases.includes('playing'),'transport becomes playing');
 recorded.rejectNext=true;const failed=[];
 await assert.rejects(()=>scripts.play({composer,bpm:120,bars:1,trackIds:[trackId],noteId:'n1',loop:false,onPhase:p=>failed.push(p)}),/Could not start Nodal note/);
 assert(failed.includes('failed'),'refused note must fail instead of appearing to play');
 recorded.rejectNext=true;
 await assert.rejects(()=>scripts.play({composer,bpm:120,trackIds:[trackId],loop:true}),/No Nodal voice/);
 const originalEnsure=bridge.ensureAudio;
 bridge.ensureAudio=async()=>{throw Error('Audio initialization failed')};
 const setupPhases=[],errors=[];
 await assert.rejects(()=>scripts.play({composer,bpm:120,trackIds:[trackId],noteId:'n1',onPhase:p=>setupPhases.push(p),onPlaybackError:m=>errors.push(m)}),/initialization failed/);
 assert(setupPhases.includes('failed'),'cold initialization failure must exit preparing');
 assert.equal(errors.length,1,'initialization failure reaches UI exactly once');
 bridge.ensureAudio=originalEnsure;
 console.log('PASS Nodal transport: shared owner, direct note, refusal and cold-start error feedback');
})().catch(e=>{console.error('FAIL Nodal Melodic play gate:',e.message);process.exitCode=1});
