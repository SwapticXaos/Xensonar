'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'src/forge/lifecycle/01_offline_jobs.js'),'utf8');
const checks=[],pass=s=>{checks.push(s);console.log('PASS',s);},tick=()=>new Promise(r=>setImmediate(r));
function host(withWorker=true){
 const workers=[],timers=new Map(),urls=new Set();let next=0,revoked=0;
 class Worker{constructor(){this.posts=[];this.terminated=0;workers.push(this);}postMessage(data,transfer){this.posts.push({data,transfer});}terminate(){this.terminated++;}receipt(data){this.onmessage?.({data});}}
 const schedule=(f,ms)=>{timers.set(++next,{f,ms});return next;},clear=id=>timers.delete(id);
 const ctx=vm.createContext({DOMException,Float32Array,Blob,Worker:withWorker?Worker:undefined,
  URL:{createObjectURL(){const id='blob:'+next;urls.add(id);return id;},revokeObjectURL(id){assert(urls.delete(id));revoked++;}},
  setTimeout:schedule,setInterval:schedule,clearTimeout:clear,clearInterval:clear});
 vm.runInContext(source+';globalThis.api=__F35640OfflineJob;',ctx);
 return{api:ctx.api,workers,timers,urls,get revoked(){return revoked;},poll(){for(const {f,ms}of [...timers.values()])if(ms===20)f();}};
}
(async()=>{
 const h=host(),progress=[];let payloads=0,decodes=0;
 const job=h.api.run({script:'',label:'test',payload:()=>{payloads++;return{n:1};},transfer:()=>[],options:{onProgress:p=>progress.push(p)},decode:m=>{decodes++;return m.value;}});
 const worker=h.workers[0];assert.equal(payloads,0);worker.receipt({ready:true});worker.receipt({ready:true});assert.equal(payloads,1);assert.equal(worker.posts.length,1);
 worker.receipt({progress:.5});worker.receipt({value:17});assert.equal(await job.promise,17);job.cancel();assert.equal(decodes,1);assert.deepEqual(progress,[.5]);
 assert.equal(worker.terminated,1);assert.equal(h.timers.size,0);assert.equal(h.urls.size,0);assert.equal(h.revoked,1);
 pass('startup receipt owns one payload, progress and result; success releases worker, URL and every timer');
 for(const mode of ['cancel','predicate','predicate-error','bad-progress','early-result','decode-error']){
  const h=host();let cancelled=false;
  const job=h.api.run({script:'',label:'test',payload:{},options:{isCancelled(){if(cancelled&&mode==='predicate-error')throw Error('predicate failed');return cancelled;}},decode(){if(mode==='decode-error')throw Error('bad decode');return 1;}});
  const w=h.workers[0],late=w.onmessage;const result=job.promise.catch(e=>e.name);
  if(mode==='cancel')job.cancel();else if(mode.startsWith('predicate')){cancelled=true;h.poll();}else if(mode==='early-result')w.receipt({value:1});else{w.receipt({ready:true});w.receipt(mode==='bad-progress'?{progress:NaN}:{value:1});}
  const name=await result;assert.equal(name,['cancel','predicate'].includes(mode)?'AbortError':'Error');late({data:{value:99}});job.cancel();
  assert.equal(h.timers.size,0,mode);assert.equal(h.urls.size,0,mode);assert.equal(w.terminated,1,mode);
 }
 pass('cancel, cancellation exceptions, malformed receipts and decode failures settle once and reject late results');
 const fallback=host();let runs=0,guarded,finish;
 const job2=fallback.api.run({script:'',label:'test',payload:{},decode:()=>1,fallback:async(reason,options)=>{runs++;guarded=options;await new Promise(r=>finish=r);return 77;}});
 const w=fallback.workers[0],late=w.onmessage;w.onerror({message:'blocked',preventDefault(){}});await tick();assert.equal(runs,1);assert.equal(w.posts.length,0);assert.equal(w.terminated,1);
 const result2=job2.promise.catch(e=>e.name);job2.cancel();assert(guarded.isCancelled());late({data:{ready:true}});finish();assert.equal(await result2,'AbortError');await tick();assert.equal(fallback.timers.size,0);
 const unavailable=host(false),job3=unavailable.api.run({script:'',label:'test',decode:()=>0,fallback:()=>42});assert.equal(await job3.promise,42);assert.equal(unavailable.timers.size,0);
 assert(unavailable.api.small({samples:new Float32Array(32),sampleRate:48000,durationSec:1,bands:16}));assert(!unavailable.api.small({samples:new Float32Array(32),sampleRate:48000,durationSec:3,bands:16}));
 pass('boot failure has one fallback owner; cancel prevents fallback publication; protected CPU fallback limits remain');
 const activitySource=fs.readFileSync(path.join(root,'src/forge/lifecycle/02_workbench_activity.js'),'utf8');
 const log=[],refs={operation:{current:0},activity:{current:null},disposed:{current:false},setBusy:x=>log.push(['busy',x]),setPreviewPending:x=>log.push(['pending',x]),setError:x=>log.push(['error',x])};
 const activity=new Function('Vt',activitySource+';return __f35624WorkbenchActivity;')({stop:()=>log.push(['stop'])})(refs);
 const a=activity.begin('preview'),b=activity.begin('export');assert(!activity.isCurrent(a));assert(activity.isCurrent(b));activity.finish(a);assert.equal(refs.activity.current.token,b);
 activity.error(a,Error('stale'));activity.error(b,new DOMException('stopped','AbortError'));activity.error(b,Error('visible'));assert(log.some(e=>e[1]==='visible'));assert(!log.some(e=>e[1]==='stale'));
 activity.finish(b);assert.equal(refs.activity.current,null);activity.cancel(false);activity.begin('preview');activity.dispose();const count=log.length;activity.dispose();activity.cancel();assert.equal(activity.begin('export'),null);assert.equal(log.length,count);
 pass('workbench operation token remains authoritative; stale completion/error and post-unmount UI writes are suppressed');
 fs.writeFileSync(path.join(root,'results/f445-offline-ownership.json'),JSON.stringify({status:'PASS',checks},null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;});
