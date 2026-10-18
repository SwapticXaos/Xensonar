'use strict';
const fs=require('node:fs'), assert=require('node:assert/strict'), vm=require('node:vm'), path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const hotkeys=read('src/rhythm/04_workspace_and_transport.js');
const audio=read('src/audio/entrophon/02_worklet_and_voice_backend.js');
const worklet=read('src/runtime/instrument/05_timing_and_admission.js');
const release=read('src/runtime/instrument/10_entrophon_and_voice_control.js');
const graphics=read('src/rhythm/03_live_drum_bodies.js');
const bass=read('src/runtime/instrument/12_rhythm_and_bass_editor.js');
function extractFunction(source,name,context={}) {const i=source.indexOf('function '+name+'(');assert(i>=0,name+' exists');let a=source.indexOf('{',i),level=0, quote=null, escaped=false;for(let k=a;k<source.length;k++){const ch=source[k];if(quote){if(escaped){escaped=false;continue}if(ch==='\\'){escaped=true;continue}if(ch===quote)quote=null;continue}if('"\'`'.includes(ch)){quote=ch;continue}if(ch==='{')level++;else if(ch==='}'&&--level===0)return vm.runInNewContext('('+source.slice(i,k+1)+')',{...context});}throw Error('unclosed '+name)}
// Restored N/M must never modify or use the grid mask; real grid-mode switching remains independent.
const particleMode=extractFunction(hotkeys,'ske',{rS:(system,mode)=>mode,Au:(mode,system)=>mode==='dorian'?[true,false,true]:[true,true,false]});
const changed=particleMode('ji','dorian');assert.deepEqual(Object.keys(changed.nexusPatch).sort(),['agentEnabled','churchMode']);
assert(!Object.hasOwn(changed.nexusPatch,'gridMode'));assert(!Object.hasOwn(changed.nexusPatch,'manualGridMutedSteps'));
const gridMode=extractFunction(hotkeys,'lke',{rS:(tuning,mode)=>mode,Au:()=>[true,false,true],Zd:()=>3});
assert.deepEqual(Object.keys(gridMode('12edo','ionian').nexusPatch).sort(),['gridMode','manualGridMutedSteps']);
assert.match(graphics,/r\.agentEnabled\?\.\[i\]!==!1/,'Particle brightness follows only its own mute state');
assert.match(bass,/const name=B\.trim\(\)/,'Retain Save As from visible field');
assert(fs.readFileSync(path.join(root,'styles/19_bass_manager_fix.css'),'utf8').includes('height: 16rem'),'Retain large Bass canvas');
// During hold, particle main tones may extend. On key-up only held particle voices are cut.
assert(audio.includes('holdOwner:g?"wave-sustain":heldParticle?"particle-sustain"'), 'Explicit owner for particle hold');
assert(audio.includes('Hwe(t.transientPlan,g.prominence,Vwe(t,g),t.sustainExtended===!0'), 'Hold flag travels from particle dispatch to audio scheduling');
assert.match(audio,/release:\(\)=>i\.bridge\.cut\(i\.id\)/, 'Resident particles have per-voice cut');
assert.match(worklet,/cut\(t\)\{for\(let n=0;n<this\.active\.length;n\+\+\)/, 'Worklet core supports per-voice cut');
assert.match(worklet,/a\.type==="cut"/, 'Worklet protocol handles individual cut');
const ese=extractFunction(release,'ese');
const calls=[];const gain={value:.6,cancelScheduledValues:at=>calls.push(['cancel',at]),setValueAtTime:(v,at)=>calls.push(['set',v,at]),exponentialRampToValueAtTime:(v,at)=>calls.push(['ramp',v,at])};
const wave={holdOwner:'wave-sustain',osc:{stop:at=>calls.push(['wave-stop',at])},gain:{gain:{...gain}}};
const normal={holdOwner:undefined,osc:{stop:()=>{throw Error('normal tone touched')}}};
const particle={backend:'particle-resident',holdOwner:'particle-sustain',release:()=>calls.push(['cut-particle'])};
ese({currentTime:5},[normal,particle,wave]);
assert(calls.some(x=>x[0]==='cut-particle'),'Particle cut on keyup');
assert(calls.some(x=>x[0]==='wave-stop'),'Wave remains handled as before');
assert(!calls.some(x=>x[0]==='wave-stop'&&x[1]<5.15),'Do not change wave release');
console.log('PASS nested-tuning separation and per-particle key-up hard cut contracts');
// Execute the actual embedded AudioWorkletProcessor in an isolated fake worklet runtime.
// A cut must end just one voice and release its admission; the rest must continue.
const marker='registerProcessor("xensonar-particle-resident-v1"';
const position=worklet.indexOf(marker),scriptOpen=worklet.lastIndexOf('=`',position)+2,scriptClose=worklet.indexOf('`,ire=`',position);
assert(position>0&&scriptOpen>2&&scriptClose>scriptOpen,'Worklet source present');
const processorCode=worklet.slice(scriptOpen,scriptClose).replace(/export\{F as ParticleResidentProcessor\};\s*$/,'');
let Processor=null;
class FakeAWP{constructor(){this.port={postMessage:()=>{},onmessage:null}}}
const sandbox={AudioWorkletProcessor:FakeAWP,registerProcessor:(name,ctor)=>{if(name==='xensonar-particle-resident-v1')Processor=ctor},sampleRate:48000,currentFrame:0,Float32Array,Float64Array,Uint8Array,Math,Number,ArrayBuffer};
vm.runInNewContext(processorCode,sandbox,{timeout:2000});
assert(Processor,'Resident Worklet is executable');
const resident=new Processor({processorOptions:{session:7}}); resident.ready=true;
for (let i=0;i<2;i++) {resident.core.active[i]=1;resident.core.records[i][1]=42+i;resident.core.records[i][17]=1;}
resident.core.activeCount=2;resident.core.filterCost=2;
resident.port.onmessage({data:{type:'cut',session:7,id:42}});
assert.equal(resident.core.active[0],1,'Requested held voice remains active only during declick fade');
assert.equal(resident.core.cutActive[0],1,'Requested held voice begins individual fade');
const remainingBeforeRepeat=resident.core.cutRemaining[0];
assert.equal(resident.core.active[1],1,'Unrelated voice must keep playing');
assert.equal(resident.core.activeCount,2,'Voices still count during bounded release');
resident.port.onmessage({data:{type:'cut',session:7,id:42}});
assert.equal(resident.core.cutRemaining[0],remainingBeforeRepeat,'Cut is idempotent');
resident.port.onmessage({data:{type:'cut',session:17,id:43}});
assert.equal(resident.core.active[1],1,'Stale session cannot cut an unrelated voice');
resident.port.onmessage({data:{type:'cut',session:7,id:43}});
assert.equal(resident.core.cutActive[1],1,'Second individual fade works');
console.log('PASS actual Resident AudioWorklet processor: targeted declick release, session isolation, no collateral voice stop');
// The actual grid painter must render byte-identical grid stroke commands when
// *only* the particle mute mask changes. This is the crucial nested-tuning UI invariant.
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const paintGrid=extractFunction(graphics,'V2e',{Me:clamp,Qa:y=>440,Zs:freq=>freq,uw:()=>[440,550],vr:1100,iw:Array(13).fill(0),performance:{now:()=>1000},Math});
function paintedGrid(agentEnabled,manualGridMutedSteps=[]){
 const trace=[];const grad={addColorStop:()=>{}};
 const ctx={
   beginPath(){},closePath(){},moveTo(x,y){this.first=[x,y]},lineTo(x,y){this.last=[x,y]},arc(){},fill(){},save(){},restore(){},setLineDash(){},
   stroke(){trace.push(['stroke',String(this.strokeStyle),this.last])},fillText(value,x,y){trace.push(['label',value,this.fillStyle,x,y])},
   createRadialGradient:()=>grad,createLinearGradient:()=>grad
 };
 const state={cursorX:100,cursorY:210};
 const params={gridOn:true,gridBase:440,gridTuning:'12edo',manualGridMutedSteps,manualGridStepOffsets:[],lockCursorToGrid:false,agentEnabled,particleSystem:'ji',churchMode:'ionian'};
 const ref={current:null},zero={current:0};
 paintGrid({ctx,state,params,t:0,focusCursorRef:{current:{x:100,y:210}},getVisibleGridLines:()=>[{freq:440,label:'A4',stepIndex:0,manualMuted:manualGridMutedSteps.includes(0),modeMuted:false},{freq:550,label:'C#5',stepIndex:1,manualMuted:manualGridMutedSteps.includes(1),modeMuted:false}],activeGridLineFreqRef:ref,activeGridLineSinceRef:zero,previousGridLineFreqRef:{current:null},previousGridLineAtRef:zero,keyboardWindowOffsetRef:zero});
 return JSON.stringify(trace);
}
const gridBefore=paintedGrid([true,true,false]);
assert.equal(paintedGrid([false,false,true]),gridBefore,'Particle mutes must never dim grid lines');
assert.notEqual(paintedGrid([true,true,false],[0]),gridBefore,'Actual grid mute must still dim its own line');
console.log('PASS real canvas grid painter: particle mask cannot affect raster brightness; independent grid mute still works');
// The original German Equal/acute key must invoke the release on key-up.
const eventCode=read('src/audio/05_live_voice_runtime.js');
const keyupStart=eventCode.indexOf('Yxe=(e,t)=>');
const keyupEnd=eventCode.indexOf(';function Jxe',keyupStart);
assert(keyupStart>0&&keyupEnd>keyupStart,'Key-up handler was located');
const onKeyUp=vm.runInNewContext('('+eventCode.slice(keyupStart+4,keyupEnd)+')',{Yw:e=>e.code==='Equal'||e.key==='´'||e.key==='`'});
const pressEvents=[];
assert(onKeyUp({code:'Equal',key:'Dead'},{setSustainHoldActive:v=>pressEvents.push(['sustain',v]),releaseHeldScheduledTones:()=>pressEvents.push(['release'])}));
assert.equal(JSON.stringify(pressEvents),JSON.stringify([['sustain',false],['release']]));
const legacyTrace=[];
const nativeGain={value:.4,cancelScheduledValues:t=>legacyTrace.push(['cancel',t]),setValueAtTime:(v,t)=>legacyTrace.push(['set',t]),linearRampToValueAtTime:(v,t)=>legacyTrace.push(['linear',v,t])};
const native={holdOwner:'particle-sustain',backend:'legacy',gain:{gain:nativeGain},osc:{stop:t=>legacyTrace.push(['stop',t])}};
ese({currentTime:8},[native,normal]);
assert(legacyTrace.some(e=>e[0]==='linear'&&e[1]===0&&e[2]>=8&&e[2]<8.01),'Legacy particle has almost instantaneous release');
assert(legacyTrace.some(e=>e[0]==='stop'&&e[1]<8.01),'Legacy particle oscillator stops at key-up');
console.log('PASS acute-key key-up action and legacy particle near-immediate stop');
