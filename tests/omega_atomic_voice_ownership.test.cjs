'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/nodal/12_surface_runtime.js'),'utf8');
const begin=source.indexOf('function createNodalSurfaceRuntime(');
const end=source.indexOf('const __XenNodalSurfaces=',begin);
assert(begin>0&&end>begin,'Real Nodal surface owner boundary is required');
const scope={Map,Set,Math,Number,Object,Array,performance:{now:()=>1000},nodalLivePlanCosts:()=>({attack:1,tail:1})};
vm.createContext(scope);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/audio/lifecycle/00_voice_lease.js'),'utf8')+'\n'+source.slice(begin,end)+'\nthis.createSurface=createNodalSurfaceRuntime',scope);
const makeInstrument=name=>Object.freeze({name,seed:1,referenceHz:220,articulation:{durationSec:.2}});
const entries=['a','b','c'].map(id=>({id,revision:1,instrument:makeInstrument(id)}));
const library={list:()=>entries};
const logs=[];let sequence=0;
const players=[];
let holdB=null;
function makePlayer(admission){
  const player={admission,prepared:new Set(),pins:new Set(),voices:[],disposed:false,
    snapshot(){return {disposed:this.disposed};},
    prepare(instrument){if(instrument.name==='b'&&holdB)return holdB.promise.then(()=>this.prepared.add(instrument));this.prepared.add(instrument);return Promise.resolve();},
    isPrepared(instrument){return this.prepared.has(instrument);},
    pin(instrument){logs.push('pin:'+instrument.name);if(instrument.name==='c')return false;this.pins.add(instrument);return true;},
    unpin(instrument){logs.push('unpin:'+instrument.name);this.pins.delete(instrument);},
    route(){},placement(){},
    noteOn(instrument){const voice={id:'voice-'+(++sequence),instrument,cutCount:0,offCount:0,cut(){this.cutCount++;return true;},noteOff(){this.offCount++;}};this.voices.push(voice);return voice;},
    dispose(){this.disposed=true;logs.push('dispose');}
  };players.push(player);return player;
}
const live={createPlayer:async(context,output,admission)=>makePlayer(admission)};
const surface=scope.createSurface({library,live,model:{semanticKey:i=>i.name}});
let context={state:'running',currentTime:12};let output={};
surface.configure({getContext:()=>context,getOutput:()=>output,ensureReady:async()=>{},acquire:()=>({release(){}})});
const select=id=>surface.select('wave',id);
const note=()=>surface.note('wave',surface.selectionStatus('wave').desired,{frequency:220,gain:.3},context);
function deferred(){let resolve;const promise=new Promise(res=>{resolve=res;});return {promise,resolve};}
(async()=>{
  assert(await select('nodal:a@1'),'A ready');
  const a=note();assert.equal(a.instrument.name,'a');
  holdB=deferred();const change=select('nodal:b@1');
  for(let i=0;i<8;i++)await Promise.resolve();
  assert.equal(surface.selectionStatus('wave').phase,'preparing');
  assert.equal(note(),null,'A must never sound as B during prepare/commit');
  assert.equal(surface.selectionStatus('wave').active,'nodal:a@1','A remains retained until B committed');
  holdB.resolve();assert(await change,'B committed');
  assert(logs.indexOf('pin:b')<logs.indexOf('unpin:a'),'pin B before unpin A');
  const b=note();assert.equal(b.instrument.name,'b','After commit B is the only new voice source');
  const fail=await select('nodal:c@1');
  assert.equal(fail,null,'Failed pin MUST NOT commit a source');
  assert.equal(surface.selectionStatus('wave').active,'nodal:b@1','B retained on C pin failure');
  assert.equal(surface.selectionStatus('wave').phase,'error');
  assert.equal(note(),null,'Do not play B under failed C selection');
  // Reselect B after error, then move to a fresh context. Voice identifiers
  // deliberately collide across players as happens with per-player counters.
  assert(await select('nodal:b@1'));
  const before=note();assert.equal(before.id,'voice-3');
  sequence=0;
  context={state:'running',currentTime:20};
  assert(await select('nodal:b@1'),'fresh audio context can select B');
  assert.equal(before.cutCount,1,'Context rollover relinquishes old voice ownership');
  const after=note();assert.equal(after.id,'voice-1');
  players[0].admission.onEnded('voice-1');
  surface.releaseLive();
  assert.equal(after.cutCount,1,'Old player completion must not erase new player voice with reused ID');
  surface.releaseLive();assert.equal(after.cutCount,1,'releaseLive must not cut same voice twice');
  // A closed audio context can invalidate its MessagePort while its last
  // handle is still registered. That must not prevent ownership release.
  const broken=note();broken.cut=()=>{throw new Error('closed-port');};
  assert.doesNotThrow(()=>surface.releaseLive());
  assert.doesNotThrow(()=>surface.releaseLive());
  surface.dispose();

  // Rapid supersession: a slow B may finish after C fails. Its stale
  // compilation must never steal an A pin or silently activate B.
  holdB=deferred();context={state:'running',currentTime:30};
  const again=scope.createSurface({library,live,model:{semanticKey:i=>i.name}});
  again.configure({getContext:()=>context,getOutput:()=>output,ensureReady:async()=>{},acquire:()=>({release(){}})});
  assert(await again.select('wave','nodal:a@1'));
  const player=players.at(-1),firstPins=[...player.pins];
  const slow=again.select('wave','nodal:b@1');
  for(let i=0;i<8;i++)await Promise.resolve();
  assert.equal(await again.select('wave','nodal:c@1'),null,'C pin failure');
  holdB.resolve();assert.equal(await slow,null,'B was superseded');
  assert.deepEqual([...player.pins],firstPins,'A pin remains; stale B and failed C cannot become owners');
  assert.equal(again.selectionStatus('wave').active,'nodal:a@1');
  assert.equal(again.selectionStatus('wave').phase,'error');
  again.dispose();
  console.log('OMEGA ATOMIC VOICE OWNERSHIP PASS: prepare/swap, pin failure, context isolation, exactly-once cut');
})().catch(error=>{console.error(error);process.exitCode=1;});
