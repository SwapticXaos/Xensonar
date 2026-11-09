'use strict';
// Ω1-D RED: A → B → A must not revive a stale async PCM request.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.join(__dirname, '../src');
const audio = fs.readFileSync(path.join(base, 'audio/entrophon/02_worklet_and_voice_backend.js'), 'utf8');
const rhythm = fs.readFileSync(path.join(base, 'rhythm/04_workspace_and_transport.js'), 'utf8');
const shell = fs.readFileSync(path.join(base, 'app/forge/01_room_shell.js'), 'utf8');
function segment(source, start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `Missing source section: ${start} → ${end}`);
  return source.slice(a, b);
}
// Exercise the real existing rhythm controller, not a fake revision counter.
let state;
const P = {
  useRef: (v) => ({ current: v }),
  useState: (v) => { state = v; return [v, next => { state = next; }]; },
  useEffect: () => {}, useCallback: fn => fn
};
const sourceScope = { P, QJ:{}, pj: () => ({}), u2e: () => ({}),
  __f350RestoreRhythm: () => ({particlePreset:'sample:A', volume:1}),
  __xenDronePersist: {load:()=>({}),save:()=>{}},
  nZ:()=>{}, EL:'x', Q2e:()=>({}), K2e:()=>{}, __f350PersistRhythm:()=>{},
  d2e:(_prev,patch)=>patch, tR:"persist", __f48RackDefaults:{}, __f48PatchRack:()=>{},
  __f48BassParamsEvent:'bass', window:{dispatchEvent:()=>{},localStorage:{setItem:()=>{}}}, Event:class{},Object,Math,Number,
};
vm.createContext(sourceScope);
vm.runInContext('var $2e; '+segment(rhythm, '$2e=()=>{', ',ax=')+';this.controller=$2e();', sourceScope);
const controller = sourceScope.controller;
const current = controller.nexusParamsRef.current;
assert.equal(current.particlePreset,'sample:A');
assert.equal(current.__xenParticleSourceRevision ?? 0, 0);
controller.updateNParams({particlePreset:'sample:B'});
assert.equal(current.__xenParticleSourceRevision, 1, 'revision must advance when source changes');
controller.updateNParams({particlePreset:'sample:A'});
assert.equal(current.__xenParticleSourceRevision, 2, 'ABA must advance again');
controller.updateNParams({volume:.4});
assert.equal(current.__xenParticleSourceRevision, 2, 'unrelated control edits must not invalidate pending samples');
controller.updateNParams({particlePreset:'sample:A'});
assert.equal(current.__xenParticleSourceRevision, 2, 'same selection is idempotent');
assert.equal(Object.keys(current).includes('__xenParticleSourceRevision'), false, 'private revision must not be persisted as user state');
assert.equal(Object.keys(state).includes('__xenParticleSourceRevision'), false, 'private revision must not escape through UI state');
assert.ok(shell.includes('getParticleSourceGeneration:()=>Tt.current.__xenParticleSourceRevision??0'), 'main room must expose the controller revision to particle ingress');
const ctx = {state:'running', currentTime:2};
let releaseDecode, ticketCount=0;
const s = {Number,Math,Array,Map,Set,Float32Array,MS:()=>5,
  TF:()=>new Promise(resolve=>{releaseDecode=resolve}),FF:()=>({fresh:true}),ea:()=>{},
  Ws:(_x,min,max)=>min,y9:()=>({anchorHz:220}),vg:()=>({targetDurationSec:.25}),_1:(x)=>x,
  window:{setTimeout:()=>1,clearTimeout:()=>{}},};
vm.createContext(s);vm.runInContext(fs.readFileSync(path.join(base,'audio/lifecycle/00_voice_lease.js'),'utf8'),s);
vm.runInContext(segment(audio,'function __xenAsyncSampleOwned(', 'const Iwe=')+'\nthis.start=Pwe;',s);
let liveRevision=0;
const sample = {sampleId:'s',ctx,rootFreq:220,baseFreq:220,volume:.5,output:{},targetHz:220,startTime:2,
  sourceFenceId:'sample:A', sourceFenceGeneration:liveRevision,
  getLiveParticlePreset:()=>current.particlePreset,
  getLiveParticleSourceGeneration:()=>liveRevision,
  getLiveContext:()=>ctx,acquireVoice:()=>{ticketCount++;return null}};
(async()=>{
  // Begin old A, switch to B and back to A while promise is unresolved.
  const pending=s.start(sample);
  liveRevision=2;
  releaseDecode({buffer:{duration:1},baseHz:220});
  assert.equal(await pending,false, 'ABA stale PCM must drop');
  assert.equal(ticketCount,0, 'ABA stale PCM must not reserve a voice');
  // New A from the new generation remains valid.
  const next=s.start({...sample,sourceFenceGeneration:2});
  releaseDecode({buffer:{duration:1},baseHz:220});
  assert.equal(await next,false);
  assert.equal(ticketCount,1,'new generation A reaches normal voice admission');
  // No revision fence on independent per-agent/resident sample.
  const independent=s.start({...sample,sourceFenceId:undefined,sourceFenceGeneration:undefined});
  releaseDecode({buffer:{duration:1},baseHz:220});
  assert.equal(await independent,false);
  assert.equal(ticketCount,2,'unrelated resident still playable');
  // Elastic path must use the same revision fence, despite different voice graph.
  vm.runInContext(segment(audio,'async function Gwe(', 'function Hwe(')+'\nthis.startElastic=Gwe;',s);
  const elastic=s.startElastic({...sample,sourceFenceGeneration:0,elasticPitchStable:true});
  releaseDecode({buffer:{duration:1},baseHz:220});
  assert.equal(await elastic,false,'ABA stale elastic sample must drop');
  assert.equal(ticketCount,2,'ABA stale elastic sample cannot reserve a voice');
  // Actual dispatcher must forward epoch along both sample paths.
  const ingress={gwe:()=>{},vwe:(_s,t)=>({allowed:true,volume:t.volume}),Rwe:()=>{},Cwe:()=>[],
    xwe:()=>({}),cwe:()=>({dispatchRequest:{presetRoute:{kind:'sample'}},transientPlan:{},bodyVoiceBudget:1}),
    bwe:()=>{},wwe:ports=>ports,Wwe:(ports,request)=>{ingress.ports=ports;ingress.req=request},
    sk:()=>{},Swe:()=>'',Math,Number};
  vm.createContext(ingress);
  vm.runInContext(segment(audio,'function qwe(', 'function Qwe(')+'\nthis.dispatch=qwe;',ingress);
  const ingressState={ctx,particlePreset:'sample:A',particleSourceGeneration:2,guardState:{},fx:{},
    getAuxTargets:()=>({}),getMainOutput:()=>({}), getLiveContext:()=>ctx,
    getLiveParticlePreset:()=>current.particlePreset,
    getLiveParticleSourceGeneration:()=>current.__xenParticleSourceRevision,
    recordAudioPressureCount:()=>{}};
  ingress.dispatch(ingressState,{sourceKind:'particle',presetOverride:'sample:A',freq:220,volume:.4});
  assert.equal(ingress.req.sourceFenceGeneration,2,'ingress must capture current generation');
  assert.equal(ingress.ports.getLiveParticleSourceGeneration(),2,'ingress must provide live generation getter');
  ingress.dispatch(ingressState,{sourceKind:'resident',presetOverride:'sample:A',freq:220,volume:.4});
  assert.equal(ingress.req.sourceFenceGeneration,undefined,'resident must not be globally fenced');
  const routes={Math,Pwe:p=>(routes.pcm=p,Promise.resolve(false)),Gwe:p=>(routes.elastic=p,Promise.resolve(false))};
  vm.createContext(routes);vm.runInContext(segment(audio,'function Wwe(', 'function qwe(')+'\nthis.route=Wwe;',routes);
  const ports={ctx,getLiveContext:()=>ctx,getLiveParticlePreset:()=>current.particlePreset,
    getLiveParticleSourceGeneration:()=>current.__xenParticleSourceRevision,getMainOutput:()=>({})};
  const request={sourceKind:'particle',sourceFenceId:'sample:A',sourceFenceGeneration:2,
    synthTonePlan:{sitarBias:0,psyBias:0,mainTones:[],introTones:[]},axes:{},
    presetRoute:{kind:'sample',sampleId:'s'},transientPlan:{},freq:220,volume:.4};
  routes.route(ports,request);
  assert.equal(routes.pcm.sourceFenceGeneration,2,'PCM receives epoch');
  assert.equal(routes.pcm.getLiveParticleSourceGeneration(),2,'PCM receives live epoch getter');
  routes.route(ports,{...request,sourceKind:'resident',presetRoute:{kind:'sample',sampleId:'s',elasticPitchStable:true}});
  assert.equal(routes.elastic.sourceFenceGeneration,2,'elastic renderer is wired to epoch');
  assert.equal(routes.elastic.getLiveParticleSourceGeneration(),2,'elastic receives live getter');
  assert.ok(audio.includes('s.dispatchRequest.sourceFenceGeneration=e.particleSourceGeneration'), 'dispatcher must capture epoch together with source ID');
  assert.ok(audio.includes('getLiveParticleSourceGeneration:e.getLiveParticleSourceGeneration'), 'sample renderer must forward live revision getter');
  console.log('OMEGA PARTICLE SELECTION EPOCH PASS: ABA, unrelated edits, non-global sources, no Voice acquisition for stale intent');
})().catch(e=>{console.error(e);process.exitCode=1});
