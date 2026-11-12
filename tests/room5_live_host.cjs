'use strict';
// ROOM5-08 (preparation): LiveHost = headless Psy Lab synthesizer for the Live Room, one engine per lane (keyboard / wave), ids "psylab:<patch id>".
// Nothing in the Live Room calls it yet; this test fixes the contract the hook-up will use.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.resolve(__dirname,'../src/post-oct/034-xen-room-psylab.js'),'utf8');
const store={};
const box={console,Math,JSON,Object,Array,Number,String,Float32Array,Float64Array,Uint8Array,Date,WeakMap,Map,P:{},u:{},localStorage:{getItem:k=>store[k]??null,setItem(k,v){store[k]=String(v)}},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:()=>0,cancelAnimationFrame(){}};
class Node{constructor(kind){this.kind=kind;this.gain={value:1,setTargetAtTime(){}}}connect(d){return d}disconnect(){}}
box.globalThis=box;vm.createContext(box);
(async()=>{
 const made={analyser:0},nodes=[];
 const ctx={currentTime:0,sampleRate:44100,destination:{},audioWorklet:{addModule:async()=>{}},createGain:()=>new Node('gain'),createChannelSplitter:()=>new Node('split'),createAnalyser:()=>{made.analyser++;return new Node('an')}};
 box.AudioWorkletNode=class{constructor(n,k,o){this.opts=o;this.msgs=[];nodes.push(this);this.port={postMessage:m=>this.msgs.push(m)}}connect(d){return d}disconnect(){}};
 box.__xenMultitrackBridge={current:{ensureAudioReady:async()=>ctx,getMasterInput:()=>new Node('master')}};
 const Chunk=vm.runInContext(src,box),H=Chunk.LiveHost;
 // ids and catalog entries
 assert(H.isId('psylab:factory:Liquid Bell')&&!H.isId('sample:1')&&!H.isId('entrophon')&&!H.isId(null));
 const ent=H.entries();assert(ent.length>=8&&ent.every(e=>e.value.startsWith('psylab:')&&e.originLabel==='Psy Lab'&&e.label),'factory patches listed under the Psy Lab rubric');
 assert(H.find('psylab:factory:Liquid Bell')&&H.find('psylab:nope')===null);
 // user patches saved in Room V appear too
 store[Chunk.__test.STORE_KEY]=JSON.stringify({format:'xensonar.psylab',version:1,working:{id:'w',name:'w',params:[]},user:[{id:'user:abc',name:'Mine',params:[]}]});
 assert(H.entries().some(e=>e.value==='psylab:user:abc'&&e.label==='Mine'),'user patches are listed');
 // no engine before the first note
 assert.equal(nodes.length,0);assert.deepEqual(JSON.parse(JSON.stringify(H.status().lanes)),[]);
 // keyboard and wave lanes: own engine, own patch, no analysers
 assert.equal(H.start('keyboard','KeyA','psylab:factory:Liquid Bell',440,.7),true);
 assert.equal(H.start('wave','Enter','psylab:factory:Chaos Insect',330),true);
 await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));
 assert.equal(nodes.length,2,'one engine per lane');assert.equal(made.analyser,0,'no picture, no analysers');assert.deepEqual(JSON.parse(JSON.stringify(H.status().visual)),[false,false]);
 const kb=nodes[0],wv=nodes[1];
 const params=(n)=>n.opts.processorOptions.params;assert.notDeepEqual(Array.from(params(kb)),Array.from(params(wv)),'the two lanes carry different patches');
 const on=n=>[...n.msgs].filter(m=>m.t==='on');
 // ROOM5-11: the processor compares ids as NUMBERS (typed array): every id on the wire must be a finite number, and the off must carry the on's number
 const kOn=on(kb),wOn=on(wv);assert.equal(kOn.length,1);assert.equal(wOn.length,1);
 for(const m of[...kOn,...wOn])assert(typeof m.id==='number'&&Number.isFinite(m.id),'numeric voice id on the wire: '+JSON.stringify(m));
 assert.equal(kOn[0].hz,440);assert.equal(kOn[0].vel,.7);assert.equal(wOn[0].hz,330);assert.equal(wOn[0].vel,.8);assert.notEqual(kOn[0].id,wOn[0].id);
 H.bend('keyboard','KeyA',466);assert(kb.msgs.some(m=>m.t==='bend'&&m.id===kOn[0].id&&m.hz===466));
 H.stop('keyboard','KeyA');assert(kb.msgs.some(m=>m.t==='off'&&m.id===kOn[0].id),'note-off carries the same number');assert.equal(H.status().active,1);
 // re-press of the same key: the old voice is released, the new one has a new number
 H.start('keyboard','KeyA','psylab:factory:Liquid Bell',440);H.start('keyboard','KeyA','psylab:factory:Liquid Bell',494);
 const k2=on(kb).slice(-2);assert.notEqual(k2[0].id,k2[1].id);assert(kb.msgs.some(m=>m.t==='off'&&m.id===k2[0].id),'re-press releases the previous voice');H.stop('keyboard','KeyA');
 // unknown id: refuses, makes no sound
 assert.equal(H.start('keyboard','KeyB','psylab:missing',440),false);
 H.allOff('wave');assert(wv.msgs.some(m=>m.t==='off'&&m.id===wOn[0].id));assert.equal(H.status().active,0);
 // panic (Power off): every engine of every lane is disposed (output faded, then disconnected)
 H.start('keyboard','KeyC','psylab:factory:Liquid Bell',440);await new Promise(r=>setImmediate(r));H.panic();
 assert.deepEqual(JSON.parse(JSON.stringify(H.status().lanes)),[]);assert.equal(H.status().active,0);assert(nodes.every(n=>n.msgs.some(m=>m.t==='alloff')),'every engine got all-off');
 H.dispose();assert.deepEqual(JSON.parse(JSON.stringify(H.status().lanes)),[]);
 console.log('PASS ROOM5-08 live host contract');
})().catch(e=>{console.error(e);process.exit(1)});
