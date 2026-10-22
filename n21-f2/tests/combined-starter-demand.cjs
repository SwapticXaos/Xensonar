'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=file=>fs.readFileSync(file,'utf8'),tick=()=>new Promise(resolve=>setImmediate(resolve));
const handoff=read('src/handoff/00_chat_feature_addons.js'),bass=handoff.slice(handoff.indexOf('const __XenBassGrid=(()=>{'),handoff.indexOf('function __XenBassGridRuntime'));
function fixture(){
 const memory=new Map(),changes=[],live={gridTuning:'12edo',gridMode:'ionian',materialLoopActive:false,rootFollowLoopActive:false,manualGridMutedSteps:[1,3,6,8,10],manualGridStepOffsets:[]};
 const localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)};
 const c=vm.createContext({console,Promise,AbortController,DOMException,localStorage,crypto:require('node:crypto').webcrypto,window:{},setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:fn=>{setImmediate(fn);return 1},__xenGridStepLimit:256,xF:()=>[1,3,6,8,10],Kp:()=>Array.from({length:12},(_,i)=>i*100),vF:()=>1200,Au:()=>Array(12).fill(true),Ka:()=>[{value:'chromatic'},{value:'aeolian'}]});
 const head=read('template/head.html'),start=head.indexOf('const __XenStarterColdBrowser='),end=head.indexOf('})();',start);vm.runInContext(head.slice(start,end+5),c);
 vm.runInContext(bass+'\n'+read('src/mix/03_quick_menu.js')+'\n'+read('src/mix/03_meta_menu.js')+'\nthis.api={seed:__XenStarterMaterial,quick:__XenQuick,meta:__XenMetaSessions,bridge:__XenMainRoomSessionBridge,ids:__XenStarterDemoIds,pending:__XenStarterPendingKey,audition:__XenMetaAudition,installed:__XenStarterInstalled};',c);
 return {c,memory,localStorage,live,changes,api:c.api,attach(){return c.api.bridge.attach({nParamsUI:live,updateNParams:patch=>{changes.push(patch);Object.assign(live,patch)}})}};
}
(async()=>{
 const f=fixture(),{seed,ids}=f.api;assert(f.api.installed);assert.equal(seed.snapshot().phase,'idle');
 let calls=0,ready=false,release;
 seed.attach(async()=>{calls++;await new Promise(resolve=>release=resolve);ready=true},()=>ready);
 assert.equal(calls,0,'attaching a provider does not render');assert.equal(await seed.ensure('unrelated-id'),false);
 const first=seed.ensure('material'),joined=seed.ensure(ids[0]);assert.equal(first,joined,'all entrants join one job');await tick();assert.equal(calls,1);assert.equal(seed.snapshot().phase,'preparing');release();await first;assert.equal(seed.snapshot().phase,'ready');
 assert.equal(await seed.ensure(ids[0]),true);assert.equal(calls,1,'ready demand performs no render or provider I/O');
 f.localStorage.removeItem(f.api.pending);ready=false;assert.equal(await seed.ensure('material'),false);assert.equal(calls,1,'opening a manager cannot regenerate a deleted completed demo');
 let failures=0;seed.attach(async()=>{failures++;if(failures===1)throw Error('durable write failed');ready=true},()=>ready);
 await assert.rejects(seed.ensure(ids[0]),/durable write failed/);assert.equal(seed.snapshot().phase,'failed');seed.request();await tick();assert.equal(seed.snapshot().phase,'ready');assert.equal(failures,2,'visible Retry resumes the failed known-ID request after the one-time marker is cleared');
 // Keep synchronous activation's established boolean contract; explicit deferred
 // UI selection has a distinct API and cannot overwrite a later selection.
 ready=false;seed.attach(async()=>{await new Promise(resolve=>release=resolve);ready=true},()=>ready);
 const selected=[];f.api.quick.register('material',{entries:[{id:ids[0]}],choose:id=>selected.push(id)});
 const deferred=f.api.quick.activatePrepared({kind:'material',id:ids[0]});await tick();f.api.quick.cancelActivation();release();assert.equal(await deferred,null);assert.deepEqual(selected,[]);
 assert.equal(f.api.quick.activate({kind:'material',id:ids[0]}),true);assert.deepEqual(selected,[ids[0]]);
 ready=false;seed.attach(async()=>{await new Promise(resolve=>release=resolve);ready=true},()=>ready);
 let previews=0;f.api.audition.register('rootFollow',{available:()=>ready,start(){previews++;return()=>{}}});
 const preview=f.api.audition.toggle({kind:'rootFollow',id:ids[0]});await tick();assert.equal(f.api.audition.status().phase,'preparing');f.api.audition.stop();release();assert.equal(await preview,'stopped');assert.equal(previews,0,'Stop prevents delayed RFL preview after shared preparation');
 // Native standalone Material also owns a token before its first lookup.
 const audio=read('src/audio/01_voice_and_rfl_ownership.js'),block=audio.slice(audio.indexOf('const __XenMaterialStandalonePreview='),audio.indexOf('\nconst FI='));
 let plays=0;f.c.bs=()=>({entries:ready?[{id:ids[0],blob:{size:100}}]:[]});f.c.URL={createObjectURL:()=> 'blob:test',revokeObjectURL(){}};f.c.Audio=function(){this.play=async()=>{plays++};this.pause=this.load=this.removeAttribute=()=>{}};
 vm.runInContext(block+';this.material=__XenMaterialStandalonePreview',f.c);ready=false;seed.attach(async()=>{await new Promise(resolve=>release=resolve);ready=true},()=>ready);
 const material=f.c.material.toggleById(ids[0]);await tick();assert.equal(f.c.material.activeId(),ids[0]);f.c.material.stop();release();assert.equal(await material,'stopped');assert.equal(plays,0,'Stop prevents delayed native Material audio');
 const pristine=fixture();pristine.attach();pristine.api.quick.register('grid',{entries:[{id:'12edo'}],choose(){}});await tick();assert.equal(pristine.live.gridMode,'aeolian');assert.deepEqual(Array.from(pristine.live.manualGridMutedSteps),[1,4,6,9,11]);assert.equal(pristine.live.materialLoopActive,false);
 const authored=fixture();authored.attach();authored.api.quick.register('grid',{entries:[{id:'12edo'}],choose(){}});authored.live.gridTuning='19edo';authored.live.gridMode='phrygian';authored.live.materialLoopActive=true;await tick();assert.equal(authored.changes.length,0,'late bridge must preserve manual Grid/play choices');
 console.log('PASS starter demand single-flight, ready fast path, deletion, retry, synchronous activation contract, Stop/switch and pristine-only initialization');
})().catch(error=>{console.error(error);process.exitCode=1});
