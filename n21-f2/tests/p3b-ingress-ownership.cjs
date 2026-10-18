'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const s=fs.readFileSync('src/audio/entrophon/02_worklet_and_voice_backend.js','utf8');
const extract=(a,b)=>s.slice(s.indexOf('function '+a+'('),s.indexOf(b,s.indexOf('function '+a+'(')));
let legacy=0,notes=[],legacyAllowed=true,pressure=[];
const dispatch=new Function('__XenNodalSurfaces','vwe','gwe','Rwe','Cwe','sk','Swe',extract('qwe','function Qwe')+';return qwe;')({note(...args){notes.push(args);return{};}},()=>{legacy++;return {allowed:legacyAllowed,volume:.1};},()=>{},()=>{},()=>[],()=>{},()=> 'particle-synth-tone');
const host={ctx:{state:'running',currentTime:1},particlePreset:'nodal:A@1',getMainOutput:()=>({}),recordAudioPressureCount:(...a)=>pressure.push(a)};
const note={freq:220,volume:.2,sourceKind:'particle',nodalIngressChecked:true};
assert(dispatch(host,note).admitted);assert.equal(legacy,0,'certified Nodal ingress does not spend a second legacy credit');assert.equal(notes.at(-1)[2].gain,.2,'Nodal uses bounded requested gain');
for(const marker of [undefined,false,1,'true']){dispatch(host,{...note,nodalIngressChecked:marker});assert.equal(notes.at(-1)[2].gain,.1,'uncertified direct calls retain Legacy attenuation');}
assert.equal(legacy,4);
dispatch(host,{...note,sourceKind:'other'});assert.equal(legacy,5,'other lanes retain Legacy guard');
legacyAllowed=false;assert.equal(dispatch({...host,particlePreset:'classic'},note).admitted,false);assert.equal(legacy,6,'Classic still reaches Legacy guard');
let callbackCalls=0,requests=[];
const Qwe=new Function('P','qwe','ea','fr','MS',extract('Qwe','const jb=')+';return Qwe;')({useEffect(){},useMemo:fn=>fn()},(e,t)=>requests.push(t),()=>{},()=>{},()=>0);
function wrapper(result,missing=false){return Qwe({getAudioCtx:()=>host.ctx,...missing?{}:{allowSecondaryStart(){callbackCalls++;return result;}},refucktorAudioGuardRef:{},particleRuntime:{getParticlePreset(){return 'nodal:A@1';},getParticleGradientX(){},getParticleGradientY(){},getParticleSampleProfileMode(){}},particleAuxTargets:{},transientRuntimeRef:{}});}
wrapper(true).playNexusAgentTone(220,.2);assert.equal(requests.at(-1).nodalIngressChecked,true);assert.equal(callbackCalls,1,'one ingress decision per request');
for(const result of [undefined,1]){wrapper(result).playNexusAgentTone(220,.2);assert.equal(requests.at(-1).nodalIngressChecked,false);}
wrapper(null,true).playNexusAgentTone(220,.2);assert.equal(requests.at(-1).nodalIngressChecked,false);
const count=requests.length;wrapper(false).playNexusAgentTone(220,.2);assert.equal(requests.length,count,'an ingress rejection never reaches dispatch');
console.log('PASS explicit ingress ownership, one callback, Nodal gain, conservative untagged and Legacy paths');
