const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root=path.resolve(__dirname,'..');
const source=(name)=>fs.readFileSync(path.join(root,'src/nodal',name+'.js'),'utf8');
const loaderText=fs.readFileSync(path.join(__dirname,'../src/runtime/instrument/05_timing_and_admission.js'),'utf8');
const loader=loaderText.slice(loaderText.indexOf('async function jF('),loaderText.indexOf('const dne=',loaderText.indexOf('async function jF(')));
const designer=source('07_sound_designer');
assert(!/backend\.replace\s*\(\s*(?:initial\.instrument|normalized)\s*\)/.test(designer), 'Sounddesign must not replace live installation nodes');
const ctx=vm.createContext({console,setTimeout,clearTimeout,Float32Array,Float64Array,Uint32Array,performance,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:()=>{}},Blob});
vm.runInContext(loader+'\n'+['01_instrument_model','02_synthesis_kernel','03_library','04_audio_runtime','05_installation_bridge'].map(source).join('\n')+'\n' +
`globalThis.hooks={model:__XenNodalModel,dsp:__XenNodalDSP,processor:nodalWorkletProcessorFactory,live:createNodalLiveRuntime,bridge:createNodalInstallationBackend};`,ctx);
const model=ctx.hooks.model;
vm.runInContext(source('07_sound_designer')+'\nglobalThis.starter=nodalStarter;',ctx);
for (const name of ['glass','ember','breath']) {
  const starter=ctx.starter(name),plan=model.compile(starter),pcm=ctx.hooks.dsp.render(plan,{frequency:220,durationSec:.2},48000).pcm;
  const peak=pcm.reduce((maximum,sample)=>Math.max(maximum,Math.abs(sample)),0);
  assert.equal(starter.nodes.length,3);
  assert(peak>.005,`${name}: starter preview synthesis must produce PCM`);
}
const instrument=model.normalize({schema:model.schema,schemaVersion:1,kernelVersion:model.kernelVersion,name:'Preview',referenceHz:220,seed:1,
 nodes:[{id:'a',role:'resonator',x:.3,y:.4,ratio:1,cents:0,radius:.3,strength:1,excitation:.9,pickup:.9}],excitation:{kind:'tone',level:.6},coupling:.1});
const legacyNodes=[{residentId:'one',x:40,y:80,freq:220},{residentId:'two',x:90,y:40,freq:330},{residentId:'three',x:150,y:100,freq:440},{residentId:'four',x:190,y:150,freq:660}];
const ref={current:{nodes:structuredClone(legacyNodes)}};
const backend=ctx.hooks.bridge({model, dsp:{},library:{},live:{createPlayer:async()=>({prepare:async()=>{},noteOn:()=>null,stop:()=>{},dispose:()=>{},snapshot:()=>({})})}}).attach(ref,{width:500,height:500,referenceHz:220,audio:{ensureReady:async()=>{},getContext:()=>({state:'running'}),getOutput:()=>({}),acquire:()=>({release(){}})}});
// Construction/editing operations must be purely local. Legacy snapshot stays byte-identical.
const before=JSON.stringify(ref.current.nodes);
const changed=model.normalize({...instrument,name:'New Design'});
assert.equal(JSON.stringify(ref.current.nodes),before);
assert.equal(changed.name,'New Design');

let currentTime=10, noteEvents=[], releasedTickets=0;
class FakeNode{
 constructor(context){this.context=context;this.port={postMessage:msg=>{
   noteEvents.push(msg);
   const reply=(message)=>setTimeout(()=>this.port.onmessage?.({data:message}),0);
   if(msg.type==='plan')reply({type:'ready',id:msg.id});
   if(msg.type==='note')reply(msg.startSec<currentTime+.005 ? {type:'rejected',id:msg.id,reason:'late'}:{type:'started',id:msg.id});
 },close(){}};}
 connect(){}disconnect(){}
}
ctx.AudioWorkletNode=FakeNode;
const fakeContext={state:'running',get currentTime(){return currentTime},audioWorklet:{addModule:async()=>{}},addEventListener(){},removeEventListener(){}};
(async()=>{
 const player=await ctx.hooks.live({model,kernelFactory:ctx.createNodalSynthesisKernel}).createPlayer(fakeContext,{}, {acquire:()=>({release(){releasedTickets++}})});
 await player.prepare(instrument);
 const tooLate=player.noteOn(instrument,{frequency:220,confirmStart:true},currentTime);
 assert(tooLate?.started,'A confirmed preview must return an acknowledgement promise');
 await assert.rejects(tooLate.started,/late|rejected/i);
 assert.equal(player.snapshot().activeVoices,0,'Rejected preview must release voice ownership');
 assert.equal(releasedTickets,1,'Rejected preview admission must release its ticket');
 const scheduled=player.noteOn(instrument,{frequency:220,confirmStart:true},currentTime+.06);
 assert(scheduled?.started);
 await scheduled.started;
 assert(noteEvents.some(e=>e.type==='note'&&e.startSec===currentTime+.06));
 player.dispose();
 assert.equal(releasedTickets,2,'Disposal must release the accepted voice');
 const sentStarts=[];
 const bridgeForScheduling=ctx.hooks.bridge({model, dsp:{},library:{},live:{createPlayer:async()=>({
   prepare:async()=>{},noteOn:(inst,opts,startSec)=>{sentStarts.push(startSec);return {started:Promise.resolve()}},
   stop(){},dispose(){},snapshot:()=>({})
 })}}).attach({current:{nodes:structuredClone(legacyNodes)}},{width:500,height:500,referenceHz:220,
   audio:{ensureReady:async()=>{},getContext:()=>fakeContext,getOutput:()=>({}),acquire:()=>({release(){}})}});
 await bridgeForScheduling.prepareAudio(instrument);
 bridgeForScheduling.noteOn(instrument,{frequency:220,confirmStart:true});
 assert.equal(Math.round((sentStarts[0]-currentTime)*1000),60,'Preview bridge must provide a safe 60 ms dispatch margin');
 console.log('PASS: sounddesign isolation, 3 audible synthetic starters, preview late rejection and ticket release, scheduled preview ack');
})().catch(e=>{console.error(e);process.exitCode=1});
