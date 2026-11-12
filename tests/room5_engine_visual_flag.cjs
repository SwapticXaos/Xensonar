'use strict';
// ROOM5-02: PsyEngine without a picture ({visual:false}) creates no analyser: the basis for hooking the synthesizer into the Live Room later
// (Enter / left mouse button / keyboard) without paying for a visualisation there.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.resolve(__dirname,'../src/post-oct/034-xen-room-psylab.js'),'utf8');
const box={console,Math,JSON,Object,Array,Number,String,Float32Array,Float64Array,Uint8Array,Date,WeakMap,Map,P:{},u:{},localStorage:{getItem:()=>null,setItem(){}},setTimeout:()=>0,clearTimeout(){}};
class Node{constructor(kind){this.kind=kind;this.gain={value:1,setTargetAtTime(){}}}connect(d){return d}disconnect(){}}
const destination={kind:'destination'};box.globalThis=box;vm.createContext(box);
// ---- the engine without a picture creates no analysers (preparation for a hook-up in the Live Room) ----
(async()=>{
 const made={splitter:0,analyser:0,worklet:0};
 const mkCtx=()=>({currentTime:0,sampleRate:44100,destination,audioWorklet:{addModule:async()=>{}},createGain:()=>new Node('gain'),createChannelSplitter:()=>{made.splitter++;return new Node('split')},createAnalyser:()=>{made.analyser++;return Object.assign(new Node('an'),{fftSize:0,smoothingTimeConstant:0})}});
 for(const visual of[false,true]){made.splitter=made.analyser=made.worklet=0;const c=mkCtx();
  box.AudioWorkletNode=class{constructor(){made.worklet++;this.port={postMessage(){}};}connect(d){return d}disconnect(){}};
  box.__xenMultitrackBridge={current:{ensureAudioReady:async()=>c,getMasterInput:()=>new Node('master')}};
  const Chunk=vm.runInContext(src,box);const eng=new Chunk.PsyEngine(visual?undefined:{visual:false});await eng.ensure();
  assert.equal(made.worklet,1);if(visual){assert(made.splitter===1&&made.analyser===2&&eng.anL&&eng.anR,'default: the picture analysers exist')}else{assert.equal(made.splitter+made.analyser,0,'visual:false creates no analyser');assert.equal(eng.anL,null)}
  eng.noteOn(1,220,1);eng.noteOff(1);eng.dispose()}
 console.log('PASS ROOM5-02 engine without a picture creates no analysers');
})().catch(e=>{console.error(e);process.exit(1)});
