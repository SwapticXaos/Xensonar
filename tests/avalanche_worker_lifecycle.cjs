'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/audio/hold_modulation.js'),'utf8');
function setup(fails=false){const listeners=new Set(),posts=[],jobs=[],current=new Set();let dragging=false;
 const ctx={state:'running',sampleRate:48000,addEventListener:(n,f)=>listeners.add(f),removeEventListener:(n,f)=>listeners.delete(f)};
 const host={epoch:3,node:{port:{postMessage:m=>posts.push(m)}}};
 const box={console,performance,setTimeout,clearTimeout,Map,WeakMap,Worker:class{},AbortController,GMe:()=>new Uint8Array(),
 __XenAvalanche:{onTimbre(){},dragging:()=>dragging},__XenHoldResident:{isCurrent:s=>current.has(s)},
 __entrophonCreateRenderWorker:()=>{if(fails)throw Error('Worker construction denied');return {send:m=>m.type==='init'?Promise.resolve({ready:true}):new Promise(resolve=>jobs.push({m,resolve}))}}};
 vm.createContext(box);vm.runInContext(source+'\nglobalThis.M=__XenHoldMod;',box);
 function session(key){const s={key,ctx,armed:true,hosts:new Set([host]),epochs:new Map([[host,3]]),id:current.size+1};current.add(s);return s;}
 const rec=()=>{const r=new Uint32Array(64);r[26]=1000;return r;},tap=()=>({complete:true,len:1000,BASE:128,ch:[{idx:0,buf:new Float32Array(1000)}]});
 return {ctx,host,posts,jobs,current,M:box.M,session,rec,tap,drag:v=>{dragging=v},close(){ctx.state='closed';for(const fn of [...listeners])fn();}};
}
const turn=()=>new Promise(resolve=>setTimeout(resolve,40));
(async()=>{
 const failed=setup(true);await assert.doesNotReject(failed.M.prepare(failed.ctx,{}),'optional worker construction failure must be contained');
 const h=setup();await h.M.prepare(h.ctx,{});const a=h.session('klaviatur:A');h.M.request(a,[h.rec()],[0]);h.M.request(a,[h.rec()],[0]);assert.equal(h.jobs.length,1,'one in-flight render');
 h.jobs[0].resolve({tap:h.tap()});await turn();assert.equal(h.posts.length,0,'pointer-up skips obsolete prepared position');assert.equal(h.jobs.length,2);
 h.jobs[1].resolve({tap:h.tap()});await turn();assert.equal(h.posts.length,1,'final desired position delivered');
 const b=h.session('wellenstart:Enter');b.armed=false;h.M.request(b,[h.rec()],[0]);h.jobs[2].resolve({tap:h.tap()});await turn();assert.equal(h.posts.length,1);assert(b.pendingTimbre,'result held until initial FIRE');b.armed=true;h.M.activate(b);assert.equal(h.posts.length,2);
 h.M.request(a,[h.rec()],[0]);h.M.request(b,[h.rec()],[0]);h.close();h.jobs[3].resolve({tap:h.tap()});await turn();assert.equal(h.posts.length,2,'closed context cannot publish or start queued work');assert.equal(h.jobs.length,4);
 console.log('PASS worker construction failure, latest desired value, bounded queue, pre-FIRE deferral and context-close fencing');
})().catch(e=>{console.error(e);process.exitCode=1});
