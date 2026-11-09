'use strict';
// Ω1-E: Nodal dispose cuts a registered, still playing voice before destroying its player.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(process.env.OMEGA_NODAL_SOURCE||path.join(root,'src/nodal/12_surface_runtime.js'),'utf8');
const a=source.indexOf('function createNodalSurfaceRuntime('),b=source.indexOf('const __XenNodalSurfaces=',a);
assert(a>=0&&b>a);
const helper=fs.readFileSync(path.join(root,'src/audio/lifecycle/00_voice_lease.js'),'utf8');
const scope={Map,Set,WeakMap,Math,Number,Object,Array,performance:{now:()=>100},nodalLivePlanCosts:()=>({attack:1,tail:1})};
vm.createContext(scope);
vm.runInContext(helper+'\n'+source.slice(a,b)+'\nthis.surfaceFactory=createNodalSurfaceRuntime;',scope);
const ctx={state:'running',currentTime:5},output={};
let lastVoice=null,playerDisposals=0;
const instrument={name:'A',seed:1,referenceHz:220,articulation:{durationSec:.3}};
const library={list:()=>[{id:'a',revision:1,instrument}]};
const live={createPlayer:async()=>({
 snapshot:()=>({disposed:false}), prepare:async()=>{},isPrepared:()=>true,pin:()=>true,
 unpin:()=>{},route:()=>{},placement:()=>{},
 noteOn(){return lastVoice={id:'voice-1',cutCount:0,cut(){this.cutCount++;return true},noteOff(){}}},
 dispose(){playerDisposals++}
})};
(async()=>{
 const owner=scope.surfaceFactory({library,live,model:{semanticKey:i=>i.name}});
 owner.configure({getContext:()=>ctx,getOutput:()=>output,ensureReady:async()=>{},acquire:()=>({release(){}})});
 assert(await owner.select('wave','nodal:a@1'));
 assert(owner.note('wave','nodal:a@1',{frequency:220,gain:.25},ctx));
 owner.dispose();
 assert.equal(lastVoice.cutCount,1,'An active handle must be cut before Nodal owner is disposed');
 assert.equal(playerDisposals,1);
 owner.releaseLive();owner.dispose();
 assert.equal(lastVoice.cutCount,1,'Reentrant release after disposal must not cut twice');
 console.log('OMEGA NODAL DISPOSE PASS: existing hotpath voice handle cut once on owner retirement');
})().catch(e=>{console.error(e);process.exitCode=1});
