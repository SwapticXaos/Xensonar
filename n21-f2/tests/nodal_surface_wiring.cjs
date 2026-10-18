"use strict";
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../src');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
const particle=read('audio/entrophon/02_worklet_and_voice_backend.js');
const wave=read('audio/05_live_voice_runtime.js');
const shell=read('app/forge/01_room_shell.js');
const previews=read('rhythm/04_workspace_and_transport.js');
function segment(source,head,tail) {
 const start=source.indexOf(head);assert(start>=0,'Missing '+head);
 const end=source.indexOf(tail,start+head.length);assert(end>start,'Missing boundary '+tail);
 return source.slice(start,end);
}
const audioCtx={state:'running',currentTime:3};
const events=[];
const sandbox={
 P:{useEffect(){},useMemo(fn){return fn();}},
 ea(){},fr(){},
 __XenNodalSurfaces:{note(...args){events.push(args);return {id:'nodal-live'};}},
 $W:()=>false,
 MS:()=>{throw new Error('Nodal particle fell back to legacy synth')},
 qwe:()=>{throw new Error('Nodal particle attempted legacy synth/sample')}
};
vm.createContext(sandbox);
vm.runInContext(segment(particle,'function Qwe(','const jb='),sandbox);
const host=sandbox.Qwe({audioCtx:null,getAudioCtx:()=>audioCtx,allowSecondaryStart:()=>true,
  particleRuntime:{getParticlePreset:()=> 'nodal:my-tone@2'}});
host.playNexusAgentTone(330,.22,undefined,3.01,undefined,{x:1,y:1},'particle');
assert.equal(events.length,1);
assert.equal(events[0][0],'particle');assert.equal(events[0][1],'nodal:my-tone@2');
assert.equal(events[0][2].frequency,330);
assert.equal(events[0][3],audioCtx);
host.playNexusAgentTone(440,.18,undefined,undefined,'nodal:my-tone@2',undefined,'preview');
assert.equal(events.length,2,'explicit preview override must use the same Nodal route');
// Worklet and legacy wave paths each must intercept Nodal before synth/sample resolution.
vm.runInContext(segment(wave,'function Ixe(e){','function '),sandbox);
const input={runtime:{enabled:true},transientRuntime:{canAdmitVoice:()=>true},
  resolvedDirect:{selection:{kind:'nodal',id:'nodal:my-tone@2'},emitState:{playbackFreq:551,volume:.35,waveGradient:{}}},
  primeMyzelFromY(){},cursor:{cursorY:2},ctx:audioCtx,options:{}};
sandbox.Ixe(input);
assert.equal(events.length,3);assert.equal(events[2][0],'wave');assert.equal(events[2][2].frequency,551);
vm.runInContext(segment(wave,'function $w(e){','function GW('),sandbox);
// The source's named globals refer to compile-time defaults. A fake valid preset
// is unnecessary: the Nodal interception must happen first.
const option=sandbox.$w('nodal:my-tone@2');assert.equal(option.kind,'nodal');
assert.equal(option.id,'nodal:my-tone@2');
assert(shell.includes('__XenNodalSurfaces.options(Nj(Is))'),'wave dropdown contains direct Nodal recipes');
assert(shell.includes('__XenNodalSurfaces.options(_j(Is))'),'particle dropdown contains direct Nodal recipes');
assert(shell.includes('__XenNodalSurfaces.note("wave",__nodalWaveId'),'central direct-wave emission uses synthetic Nodal');
assert(previews.includes('await __XenNodalSurfaces.select("wave",e.selectionId)'),'wave preview prepares before attack');
assert(previews.includes('await __XenNodalSurfaces.select("particle",e.selectionId)'),'particle preview prepares before attack');
// Previews must return ownership of the live lane to the selected instrument.
// Without this, a temporary preview silently leaves the live particle/wave sources unprepared.
const previewSelects=[];
const previewContext={state:'running',currentTime:4};
sandbox.__XenNodalSurfaces.select=async (lane,id)=>{previewSelects.push([lane,id]);return {id}};
sandbox.o7=()=>({isCurrent:()=>true});sandbox.bEe=()=>{};sandbox.yEe=()=>{};
sandbox.$w=id=>({kind:'nodal',id});sandbox.BT=id=>({kind:'nodal',id});
vm.runInContext(segment(previews,'async function SEe(e){','async function vEe(e){'),sandbox);
vm.runInContext(segment(previews,'async function vEe(e){','function AEe('),sandbox);
(async()=>{
 const waveSoundRuntimeRef={current:{enabled:false,preset:'nodal:resident@3',volume:.3}};
 await sandbox.SEe({selectionId:'nodal:preview@1',waveSoundRuntimeRef,nexusParamsRef:{current:{waveOvertonesEnabled:true}},waveOvertoneArpQueueRef:{current:[]},initAudio:async()=>previewContext,playWaveStartSound(){}});
 assert.deepEqual(previewSelects.map(x=>x.join('/')),['wave/nodal:preview@1','wave/nodal:resident@3'],'Wave preview must restore the configured live source');
 previewSelects.length=0;
 const nexusParamsRef={current:{particlePreset:'nodal:resident@3',particleVolume:.18}};
 await sandbox.vEe({selectionId:'nodal:preview@1',nexusParamsRef,initAudio:async()=>previewContext,playNexusAgentTone(){},gameWidth:800,gameHeight:400});
 assert.deepEqual(previewSelects.map(x=>x.join('/')),['particle/nodal:preview@1','particle/nodal:resident@3'],'Particle preview must restore the configured live source');
 console.log('PASS actual Qwe/Ixe and Nodal preview ownership restoration');
})().catch(e=>{console.error(e);process.exitCode=1});
