'use strict';
// Native preparation completion must not immediately start another full program.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
let now=0,id=0;const timers=new Map(),jobs=[],posts=[],current=new Set();
const ctx={state:'running',sampleRate:48000,addEventListener(){},removeEventListener(){}},host={epoch:1,node:{port:{postMessage:m=>posts.push(m)}}};
const box={console,Map,WeakMap,Worker:class{},AbortController,performance:{now:()=>now},GMe:()=>new Uint8Array(),
 setTimeout:(fn,delay)=>(timers.set(++id,{fn,at:now+delay}),id),clearTimeout:id=>timers.delete(id),
 __XenAvalanche:{onTimbre(){},dragging:()=>false},__XenHoldResident:{isCurrent:s=>current.has(s)},
 __entrophonCreateRenderWorker:()=>({send:m=>m.type==='init'?Promise.resolve({ready:true}):new Promise(resolve=>jobs.push({at:now,m,resolve}))})};
vm.createContext(box);vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/audio/hold_modulation.js'),'utf8')+'\nglobalThis.M=__XenHoldMod;',box);const M=box.M;
const s={key:'klaviatur:A',id:1,ctx,armed:true,hosts:new Set([host]),epochs:new Map([[host,1]])};current.add(s);
const r=n=>{const r=new Uint32Array(64);r[26]=100;r[12]=n;return r;},tap=()=>({len:100,complete:true,ch:[{idx:0,buf:new Float32Array(100)}]});
const turn=()=>new Promise(setImmediate);
function advance(t){now=t;for(const [id,v] of [...timers])if(v.at<=now){timers.delete(id);v.fn()}}
(async()=>{
 await M.prepare(ctx,{});M.request(s,[r(1)],[0]);M.request(s,[r(2)],[0]);assert.equal(jobs.length,1);
 now=40;jobs[0].resolve({tap:tap()});await turn();assert.equal(jobs.length,1,'allow quiet time after expensive native preparation');
 M.request(s,[r(3)],[0]);M.request(s,[r(4)],[0]);advance(119);assert.equal(jobs.length,1,'no early wake or catch-up');advance(120);assert.equal(jobs.length,2);assert.equal(jobs[1].m.records[0][12],4,'latest target replaces queued intermediates');
 now=140;jobs[1].resolve({tap:tap()});await turn();assert.equal(posts.length,1,'only current final variant published');
 M.request(s,[r(5)],[0]);assert.equal(jobs.length,2);M.dispose(ctx);advance(1000);assert.equal(jobs.length,2,'dispose cancels cooldown wake');
 console.log('PASS native render duty pacing, latest-only cooldown, no catch-up, final target and disposal');
})().catch(e=>{console.error(e);process.exitCode=1});
