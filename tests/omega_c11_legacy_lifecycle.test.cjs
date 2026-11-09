'use strict';
// Ω1-F RED/GREEN: physical ownership cannot be stranded by one broken finalizer.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const c11=fs.readFileSync(path.join(root,'src/audio/05_live_voice_runtime.js'),'utf8');
const runtime=fs.readFileSync(path.join(root,'src/runtime/instrument/10_entrophon_and_voice_control.js'),'utf8');
const classStart=c11.indexOf('class r9{'),classEnd=c11.indexOf('function a9(',classStart);
assert(classStart>=0&&classEnd>classStart,'Expected C11 host class');
const harness={sy:{Fence:'fence',End:'end',Cancel:'cancel'}, Set,Map,WeakMap,Uint8Array,Array,Number,Math,clearTimeout};
vm.createContext(harness);
vm.runInContext(c11.slice(classStart,classEnd)+'\nthis.C11Host=r9;',harness);
function makeHost(){
 const host=Object.create(harness.C11Host.prototype);
 const tokens=[10,11,12];
 const states=new Uint8Array([2,2,1]);
 host.reservations={states,find(token){return tokens.findIndex((x,i)=>x===token&&states[i]!==0)},release(i){states[i]=0},count:3};
 host.finishCallbacks=[null,null,null];host.building=1;host.sessionActive=true;host.epochValue=9;
 host.sessionStateMessages=0;host.sessionStateChanges=0;host.sessionTransitionSeq=0;
 host.releases={add(){}};
 return host;
}
{
 const host=makeHost(),seen=[];
 host.finishCallbacks[0]=()=>{seen.push('bad');throw Error('closed C11 port')};
 host.finishCallbacks[1]=()=>{seen.push('good');assert.equal(host.sessionActive,false,'fence admission BEFORE running old voice callbacks')};
 host.finishCallbacks[2]=()=>seen.push('third');
 assert.doesNotThrow(()=>host.acceptSession(10,true),'An old callback must not abort a new session');
 assert.deepEqual(seen,['bad','good','third']);
 assert.deepEqual(Array.from(host.reservations.states),[0,0,0]);
 assert.equal(host.building,0);assert.equal(host.epoch,10);assert.equal(host.sessionActive,true);
 assert.doesNotThrow(()=>host.acceptSession(10,false));
 assert.deepEqual(seen,['bad','good','third'],'A finalizer must be exactly once');
}
{
 const host=makeHost();
 let released=0;
 host.finishCallbacks[0]=()=>{released++;throw Error('onended failed')};
 assert.doesNotThrow(()=>host.releaseReservation(0,'end'));
 assert.equal(host.reservations.states[0],0);
 assert.doesNotThrow(()=>host.onFinished(10,()=>{throw Error('late end callback')}));
 assert.equal(released,1);
}
// Nested owner transitions must not be undone by a stale outer READY.
{
 const host=makeHost();
 host.finishCallbacks[0]=()=>host.acceptSession(11,false);
 assert.doesNotThrow(()=>host.acceptSession(10,true));
 assert.equal(host.sessionActive,false,'Nested STOP must win over stale READY');
 assert.equal(host.epoch,11,'Stale epoch must not overwrite nested transition');
}
// Host destruction is a terminal owner operation: failures in external
// callback and writer disposal cannot strand reservations or routes.
{
 const host=makeHost(),called=[];
 host.unregisterDiagnostic=()=>{called.push('unregister');throw Error('listener lost')};
 host.pendingDiagnostic={timer:null,resolve(){called.push('resolve');throw Error('UI gone')}};
 host.diagnosticSnapshot=()=>({state:'destroying'});
 host.node={port:{postMessage(){called.push('STOP')}},disconnect(){called.push('disconnect');throw Error('port closed')}};
 host.writer={destroy(){called.push('writer');throw Error('transport closed')}};
 host.messagePool={};host.auxRoutes=new Map([[{},0]]);host.directMirrorTargets=new Set([{}]);
 host.finishCallbacks[0]=()=>called.push('voice0');
 host.finishCallbacks[1]=()=>{called.push('voice1');throw Error('broken finalizer')};
 host.finishCallbacks[2]=()=>called.push('voice2');
 assert.doesNotThrow(()=>host.destroy());
 assert.deepEqual(Array.from(host.reservations.states),[0,0,0]);
 for(const item of ['unregister','resolve','STOP','disconnect','writer','voice0','voice1','voice2'])assert(called.includes(item),`Missing terminal stage: ${item}`);
 assert.equal(host.node,null);assert.equal(host.writer,null);assert.equal(host.pendingDiagnostic,null);
 assert.equal(host.auxRoutes.size,0);assert.equal(host.directMirrorTargets.size,0);
}
// Validate the existing oscillator owner Xx in isolation, not just a new helper.
const functionStart=runtime.indexOf('function Xx('),functionEnd=runtime.indexOf('function mT(',functionStart);
assert(functionStart>=0&&functionEnd>functionStart);
vm.runInContext(runtime.slice(functionStart,functionEnd)+'\nthis.makeLegacyEnd=Xx;',harness);
{
 const voices={current:[]},tone={ticket:{id:1}},events=[];
 const finish=harness.makeLegacyEnd({activeScheduledTonesRef:voices,transientRuntime:{releaseVoice(){events.push('ticket');throw Error('already retired')}},activeTone:tone,disconnect(){events.push('graph');throw Error('node closed')}});
 assert.equal(voices.current.length,1);
 assert.doesNotThrow(()=>finish());
 assert.deepEqual(events,['ticket','graph']);
 assert.equal(voices.current.length,0);
 assert.doesNotThrow(()=>finish());assert.equal(events.length,2);
}
console.log('Ω1-F C11/Legacy owner finalization PASS: fenced callback drain and graph disposal');
