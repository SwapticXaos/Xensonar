'use strict';
// Ω1-E: actual PCM and raw/elastic Gwe renderers acquire, complete and
// retire leases without needing a real audio device.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const backend=fs.readFileSync(path.join(root,'src/audio/entrophon/02_worklet_and_voice_backend.js'),'utf8');
const lease=fs.readFileSync(path.join(root,'src/audio/lifecycle/00_voice_lease.js'),'utf8');
const piece=(start,end)=>{const a=backend.indexOf(start),b=backend.indexOf(end,a+start.length);assert(a>=0&&b>a);return backend.slice(a,b)};
const created=[],stopped=[],disconnected=[],released=[];
const param=()=>({value:1,setValueAtTime(v){this.value=v},linearRampToValueAtTime(v){this.value=v},exponentialRampToValueAtTime(v){this.value=v}});
let serial=0;
function node(label){
 const id=label+':'+(++serial);
 const n={id,gain:param(),frequency:param(),Q:param(),pan:param(),playbackRate:param(),type:'',
  connect(){return this;},disconnect(){disconnected.push(id)},start(){this.started=true},stop(){stopped.push(id)},onended:null};
 created.push(n);return n;
}
const ctx={state:'running',currentTime:4,
 createBufferSource(){return node('source')},createGain(){return node('gain')},createBiquadFilter(){return node('filter')},createStereoPanner(){return node('pan')}};
const other={...ctx,state:'running',currentTime:4};
const timeouts=new Map();let timer=0,elasticCuts=0;
const world={Math,Number,Object,Map,Set,WeakMap,Array,Float32Array,
 MS:()=>4000,TF:async()=>({buffer:{duration:.6},baseHz:220,baseHzSource:'file',tempoPitchLinked:true,playbackDurationSec:.5}),
 FF:()=>({fresh:true}),ea(){},Ws:(v,a,b)=>Math.min(b,Math.max(a,v)),
 y9:()=>({anchorHz:220}),vg:()=>({targetDurationSec:.26}),_1:(x,a,b)=>Math.min(b,Math.max(a,x)),
 jwe:()=>{return ()=>{elasticCuts++}},
 window:{setTimeout(fn){const id=++timer;timeouts.set(id,fn);return id},clearTimeout(id){timeouts.delete(id)}}};
vm.createContext(world);
vm.runInContext(lease+'\n'+piece('function __xenAsyncSampleOwned(', 'const Iwe=')+piece('async function Gwe(', 'function Hwe(')+'\nthis.renderPCM=Pwe;this.renderElastic=Gwe;this.retire=__xenRetireVoiceLeases;this.count=__xenVoiceLeaseCount;',world);
function input(context,name,elasticPitchStable=false){return {
 ctx:context,sampleId:name,rootFreq:220,baseFreq:220,targetHz:220,volume:.7,
 startTime:4,requestedAtMs:4000,output:{},getLiveContext:()=>context,
 elasticPitchStable,acquireVoice:()=>({gainScale:1,release:()=>released.push(name)})};}
(async()=>{
 const a=await world.renderPCM(input(ctx,'pcmA'));
 assert.equal(a,true);assert.equal(world.count(ctx),1);
 const source=created.find(n=>n.id.startsWith('source'));
 assert.equal(source.started,true);
 source.onended();source.onended();
 assert.equal(world.count(ctx),0);assert.deepEqual(released,['pcmA']);
 const b=await world.renderPCM(input(ctx,'pcmB'));
 assert.equal(b,true);
 const bSource=created.filter(n=>n.id.startsWith('source')).at(-1);
 assert.equal(world.count(ctx),1);
 const separate=await world.renderPCM(input(other,'other'));
 assert.equal(separate,true);assert.equal(world.count(other),1);
 const cutoff=world.retire(ctx);
 assert.equal(cutoff,1);assert.equal(world.count(ctx),0);assert.equal(world.count(other),1);
 assert.equal(released.filter(x=>x==='pcmB').length,1);
 assert.equal(stopped.filter(x=>x.startsWith('source')).length>=1,true,'context retire stops physical buffer source');
 // Repeated late completions after owner retirement are harmless.
 bSource.onended();bSource.onended();
 assert.equal(released.filter(x=>x==='pcmB').length,1);
 const c=await world.renderElastic(input(other,'elasticC',true));
 assert.equal(c,true);assert.equal(world.count(other),2);
 assert.ok(timeouts.size>0);
 assert.equal(world.retire(other),2);
 assert.equal(elasticCuts,1,'Retirement cancels elastic grain job exactly once');
 assert.equal(timeouts.size,0,'Retired elastic PCM cannot leave dangling timeout');
 assert.equal(released.filter(x=>x==='elasticC').length,1);
 assert.equal(released.filter(x=>x==='other').length,1);
 assert.equal(world.retire(other),0);
 assert.equal(world.count(other),0);
 // Callback race: a finishing voice cannot release the admission of a newer one.
 const d=await world.renderElastic(input(ctx,'normalD',false));
 assert.equal(d,true);
 const live=created.findLast(n=>n.id.startsWith('source'));
 live.onended();
 assert.equal(released.filter(x=>x==='normalD').length,1);
 assert.equal(world.count(ctx),0);
 // Corrupt/invalid metadata must not strand an acquired admission ticket.
 world.vg=()=>{throw new Error('invalid imported PCM metadata')};
 const invalid=await world.renderElastic(input(ctx,'badMetadata',true));
 assert.equal(invalid,false,'Planning error must fail closed, not escape from async renderer');
 assert.equal(released.filter(x=>x==='badMetadata').length,1,'Planning must release its ticket');
 assert.equal(world.count(ctx),0);
 console.log('OMEGA LEASE RENDERER INTEGRATION PASS: PCM, elastic, onended, context retirement, tickets once, jobs/timers released');
})().catch(e=>{console.error(e);process.exitCode=1});
