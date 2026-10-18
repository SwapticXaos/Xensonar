'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const pipelineFactory=new Function(read('src/forge/hybrid/03_render_pipeline.js')+';return __f352CreatePipeline;')();
const controllerFactory=new Function(read('src/forge/hybrid/08_playback_controller.js')+';return __createF352PlaybackRuntime;')();
const engineSource=read('src/app/forge/07_preview_cache_and_controls.js');
const method=engineSource.slice(engineSource.indexOf('async playBufferInternal'),engineSource.indexOf('async ',engineSource.indexOf('async playBufferInternal')+7));
const Engine=new Function('Ii','b3','y3','G2','S3','requestAnimationFrame','cancelAnimationFrame','RY','yu','return class{'+method+'}')(
 c=>c.currentTime,()=>{},()=>{},()=>{},()=>{},()=>1,()=>{},()=>0,()=>[]);
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
const tick=()=>new Promise(r=>setImmediate(r)),checks=[],pass=s=>{checks.push(s);console.log('PASS',s);};
const job=key=>({key,donorKey:key,syntheticKey:key,recipe:{amount:0},sampleRate:48000,manifest:{}});
function adapters(donor=async()=>({pcm:new Float32Array(64),material:{runs:[]}})){
 return{donor,buffer:pcm=>({pcm}),spectrum:async()=>({values:new Float32Array(8)})};
}
function store(){const listeners=new Set();return{listeners,subscribe(f){listeners.add(f);return()=>listeners.delete(f);},emit(){for(const f of [...listeners])f();}};}
function engine(){
 const e=new Engine(),sources=[],ctx={state:'running',currentTime:0,
  createBufferSource(){const s={starts:0,stops:0,playbackRate:{setValueAtTime(){}},connect(){},disconnect(){},start(){this.starts++;},stop(){this.stops++;}};sources.push(s);return s;},
  createGain:()=>({gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}})};
 Object.assign(e,{playToken:0,getContext:()=>ctx,stopBeatGuide(){},scheduleBeatGuide(){},stop(){this.playToken++;this.currentSource?.stop();this.currentSource=null;this.currentBufferCleanup?.();this.isPlaying=false;}});
 return{e,ctx,sources};
}
function controller(){
 let key='A',stopHandler=null;const state={renderVersion:1,materialExport:{loopPreview:false}},selected=store();
 Object.assign(selected,{phase:'ready',selected:true,generation:0,getSnapshot(){return this;},
  stop(){const f=stopHandler;stopHandler=null;f?.();this.phase='ready';this.generation++;this.emit();},
  beginRender(){this.phase='rendering';return ++this.generation;},setPlaybackStopHandler(f){stopHandler=f;},
  reportRenderProgress(){},markFigurePrepared(){},markPlaying(t){if(t===this.generation)this.phase='playing';},
  finish(t){if(t===this.generation){stopHandler=null;this.phase='ready';}},failPlayback(){this.phase='error';}});
 const pe=Object.assign(store(),{getState:()=>state}),workbench=store(),session=store(),tuning=store(),audio=engine();
 let gate=null,cancels=0;
 const pipeline=pipelineFactory(adapters(async()=>{if(gate)await gate.promise;return{pcm:new Float32Array(64),material:{runs:[]}};}));
 const api=controllerFactory({pipeline,identity:()=>key,capture:()=>job(key),pe,Vt:selected,xt:audio.e,
  __F352Worker:{cancel(){cancels++;},status:()=>({})},__F341Workbench:workbench,__F352Session:session,
  __f3564ActivateLiveGain(){},subscribeTuning:f=>tuning.subscribe(f)});
 return{api,pipeline,selected,audio,stores:[pe,selected,workbench,session,tuning],setKey(k){key=k;pe.emit();},setGate(g){gate=g;},get cancels(){return cancels;}};
}
(async()=>{
 let active=0,max=0;const gates=[];
 const pipeline=pipelineFactory(adapters(async()=>{active++;max=Math.max(max,active);try{const g=deferred();gates.push(g);await g.promise;return{pcm:new Float32Array(64),material:{runs:[]}};}finally{active--;}}));
 const first=pipeline.render(job('A'));assert.strictEqual(pipeline.render(job('A')),first);
 const old=first.catch(e=>e.name);pipeline.invalidate();const next=pipeline.render(job('B'));await tick();
 assert.equal(gates.length,1);gates.shift().resolve();await tick();assert.equal(await old,'AbortError');
 assert.equal(gates.length,1);gates.shift().resolve();assert.equal((await next).key,'B');assert.equal(max,1);
 assert.equal((await pipeline.render(job('B'))).key,'B');assert.equal(pipeline.diagnostics().donorRenders,2);
 pass('same-key deduplication, serialized replacements and retained cache survive cancellation');
 let publishes=0;pipeline.subscribe(()=>publishes++);const pending=pipeline.render(job('C')).catch(e=>e.name);await tick();pipeline.dispose();const atDispose=publishes;
 assert.equal(pipeline.diagnostics().cacheBytes,0);assert.equal(pipeline.diagnostics().artifactBytes,0);
 gates.shift().resolve();assert.equal(await pending,'AbortError');assert.equal(publishes,atDispose);
 await assert.rejects(pipeline.render(job('D')),{name:'AbortError'});pipeline.dispose();
 pass('final pipeline disposal releases caches and listeners; late jobs cannot publish or repopulate');

 const c=controller(),detach=c.api.attach();assert.equal(c.api.attach(),detach);assert(c.stores.every(s=>s.listeners.size===1));
 const gate=deferred();c.setGate(gate);const stopped=c.api.play().catch(e=>e.name);await tick();
 assert.equal(c.pipeline.diagnostics().listeners,1);c.api.stop();assert.equal(c.pipeline.diagnostics().listeners,0,'unsubscribe without waiting for the blocked render');
 gate.resolve();assert.equal(await stopped,'AbortError');c.setGate(null);
 assert.equal(await c.api.play(),true);assert.equal(c.audio.sources.length,1);
 c.setKey('B');assert.equal(c.audio.e.isPlaying,false);assert.equal(c.api.current(),null);
 assert.equal(c.pipeline.diagnostics().artifactEntries,1,'ordinary edits retain previous reusable results');
 detach();detach();assert(c.stores.every(s=>s.listeners.size===0));c.api.attach();assert(c.stores.every(s=>s.listeners.size===1));
 c.api.dispose();c.api.dispose();assert(c.stores.every(s=>s.listeners.size===0));
 await assert.rejects(c.api.render(),{name:'AbortError'});assert.throws(()=>c.api.attach(),{name:'AbortError'});
 pass('one attach owner, prompt progress cleanup, edit invalidation, reversible detach and terminal dispose');

 const suspended=controller();suspended.api.attach();const resumed=deferred();suspended.audio.ctx.state='suspended';suspended.audio.ctx.resume=()=>resumed.promise;
 const stale=suspended.api.play();await tick();suspended.setKey('changed');resumed.resolve();assert.equal(await stale,false);assert.equal(suspended.audio.sources.length,0);
 suspended.audio.ctx.state='running';assert.equal(await suspended.api.play(),true);assert.equal(suspended.audio.sources.at(-1).starts,1);suspended.api.dispose();
 pass('module/recipe change while AudioContext.resume waits cannot resurrect stale audio; successor still plays');

 const reentrant=engine();const played=await reentrant.e.playBufferInternal({},1,0,()=>reentrant.e.stop(),()=>{},{});
 assert.equal(played,false);assert.equal(reentrant.sources[0].starts,0);
 const veto=engine();const previous=veto.e.playToken;assert.equal(await veto.e.playBufferInternal({},1,0,null,null,{isCurrent:()=>false}),false);assert.equal(veto.e.playToken,previous);
 pass('reentrant position callback cannot start a stopped buffer; a stale caller cannot stop a newer owner');
 const noAttach=controller(),resume=deferred();noAttach.audio.ctx.state='suspended';noAttach.audio.ctx.resume=()=>resume.promise;
 const moving=noAttach.api.play();await tick();noAttach.setKey('B');resume.resolve();assert.equal(await moving,false);assert.equal(noAttach.audio.sources.length,0);noAttach.api.dispose();
 pass('last-boundary identity guard also protects callers without store attachment');
 fs.writeFileSync(path.join(root,'results/f445-forge-lifecycle.json'),JSON.stringify({status:'PASS',checks},null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;});
