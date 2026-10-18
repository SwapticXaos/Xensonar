const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {parse}=require('./extract.cjs');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))),file=path.resolve(process.argv[2]||path.join(root,manifest.entry)),{map}=parse(file);
const fixture=path.join(__dirname,'fixtures/clean5_runtime_baseline.json');
const plain=v=>JSON.parse(JSON.stringify(v,(k,x)=>ArrayBuffer.isView(x)?Array.from(x):x));
async function exercise(){
 const log=[],subscribers={},settings={enabled:false,amount:.35,mode:'parallel',variantRevision:'revised'},config={params:{materialPilot:true,gestaltPilot:false,variantRevision:'revised',carrierTranspose:0}},source={sampleRate:8000,samples:new Float32Array([.1,.2]),atlas:{nodes:[{center:0}]}};
 const donor={selected:true,source:{id:'A',fileName:'test.wav',importStartSec:0,importDurationSec:1},model:{hybrid:{sourceGrains:source}},sourceRevision:2,phase:'ready'};
 const state={spectralData:{width:2,height:2,values:[0,.2,.4,0],melodicCarrier:null},renderVersion:1,materialExport:{bars:1,bpm:120,beatsPerBar:4,loopPreview:true},carrierIntegralSynthLab:{readerSettings:{color:.4}},createProjectSnapshot(){return {spectralSnapshot:[...this.spectralData.values],melodicCarrier:this.spectralData.melodicCarrier}}};
 const subscribe=(name,fn)=>{(subscribers[name]??=[]).push(fn);log.push(['subscribe',name]);return()=>log.push(['unsubscribe',name])};
 let pipelineState={phase:'idle',progress:0,result:null},pipelineListeners=[],cancelHook,blocked=null,failure=null,tuning='12edo',signatureCalls=0,planCalls=0;
 const pipeline={async render(job){log.push(['render',job.key]);pipelineState={phase:'rendering',progress:.6,result:pipelineState.result};for(const fn of pipelineListeners)fn();if(blocked)await blocked;if(failure)throw failure;const artifact={key:job.key,buffer:{tag:'buffer'},durationSec:job.durationSec,manifest:job.manifest};pipelineState={phase:'ready',progress:1,result:artifact};return artifact},invalidate(){log.push(['invalidate']);pipelineState={...pipelineState,phase:pipelineState.result?'stale':'idle'}},getSnapshot:()=>pipelineState,subscribe(fn){pipelineListeners.push(fn);return()=>{pipelineListeners=pipelineListeners.filter(f=>f!==fn);log.push(['pipeline-unsubscribe'])}},diagnostics:()=>({tag:'pipeline'})};
 const makePCM=(name,material={runs:[]})=>{log.push(['donor-worker',name]);const pcm=new Float32Array([.2,.3]);pcm.donorMaterialPlan=material;return pcm};
 const worker=name=>({render:async()=>makePCM(name)});
 const runtime={getSnapshot:()=>donor,subscribe:fn=>subscribe('donor',fn),beginRender:()=>{log.push(['begin']);donor.phase='rendering';return 7},setPlaybackStopHandler(fn){cancelHook=fn;log.push(['stop-handler'])},reportRenderProgress:(t,p)=>log.push(['progress',t,p]),markFigurePrepared:(...args)=>log.push(['prepared',...args]),finish:t=>log.push(['finish',t]),markPlaying:t=>{donor.phase='playing';log.push(['playing',t])},failPlayback:(t,e)=>log.push(['fail',t,e.name,e.message]),stop(){donor.phase='ready';log.push(['donor-stop'])}};
 const ctx=vm.createContext({console,Float32Array,Float64Array,ArrayBuffer,DOMException,Map,Set,
  __f352CreatePipeline(adapters){ctx.adapters=adapters;log.push(['pipeline-created']);return pipeline},
  pe:{getState:()=>state,subscribe:fn=>subscribe('state',fn)},Vt:runtime,
  __F341Workbench:{getConfig:()=>config,subscribe:fn=>subscribe('workbench',fn),fingerprint:x=>JSON.stringify(x),materialModel:(x,c)=>({...x,sourceIndex:{position:c.params.position??0}})},
  __F352Session:{export:()=>({...settings}),subscribe:fn=>subscribe('session',fn)},
  __F353SourceIdentity:{key:s=>s?.id??'none'},__F3564Master:{getSnapshot:()=>({tuning}),subscribe:fn=>subscribe('tuning',fn)},
  xR:(kind,reader)=>({kind,...reader}),__f333Signature:grid=>{signatureCalls++;return JSON.stringify(grid.values)},
  Zp:(bars,bpm,beats)=>bars*beats*60/bpm,ph:class{constructor(w,h){this.width=w;this.height=h}restoreData(values){this.values=[...values]}},
  __ForgeF33:{buildCarrierSupportPlan(grid){planCalls++;return {bands:[{gainCurve:Float32Array.from(grid.values),centerRatioCurve:new Float32Array([1,1])}]}}},
  __f3565PitchSemis:()=>0,__f3565PitchSupport:s=>s,
  __F356GestaltWorkerOriginal:worker('gestalt-original'),__F356GestaltWorker:worker('gestalt-revised'),__F356WorkerOriginal:worker('material-original'),__F356Worker:worker('material-revised'),
  __f356ProjectCeciliaStates:(job,material)=>{log.push(['project-states']);material.projected=true},
  __F352Worker:{run:(stage)=>{log.push(['cecilia-worker',stage]);return null},cancel:()=>log.push(['worker-cancel']),status:()=>({ready:true})},
  __f352RenderCeciliaOriginal:()=>({route:'synthetic-original'}),__f352RenderCecilia:()=>({route:'synthetic-revised'}),
  __F352DSPOriginal:{combine:()=>({route:'combine-original'})},__F352DSP:{combine:()=>({route:'combine-revised'}),spectrum:()=>({route:'spectrum'})},
  xt:{getContext:()=>({createBuffer:(c,n,sr)=>({channels:c,length:n,sampleRate:sr,copyToChannel:pcm=>log.push(['copy',Array.from(pcm)])})}),stop:()=>log.push(['audio-stop']),async playBufferInternal(buffer,duration,position,onPosition,onEnd,options){log.push(['play-buffer',buffer,duration,position,options]);onPosition(.4);onEnd();return true}},__f3564ActivateLiveGain:buffer=>log.push(['gain',buffer])
 });
 for(const name of ['__f352Clone','__f352Freeze','__createF352JobCapture','__createF352RenderAdapters','__createF352PlaybackRuntime','__F352Runtime'])if(map.has(name))vm.runInContext(map.get(name),ctx);
 const api=vm.runInContext('__F352Runtime',ctx),captures=[];
 const first=api.capture(state),second=api.capture(state);assert.strictEqual(first.support,second.support);assert.strictEqual(first.model.samples,source.samples);assert(Object.isFrozen(first.config.params));assert.notStrictEqual(first.config,config);
 captures.push(plain(first));settings.enabled=true;settings.amount=.6;settings.mode='state';config.params.position=.7;captures.push(plain(api.capture(state)));
 state.renderVersion++;state.spectralData.values=[0,.5,.3,0];captures.push(plain(api.capture(state)));
 const errors=[];const bad=async label=>{try{api.capture(state)}catch(e){errors.push([label,e.name,e.message])}};
 donor.model={};await bad('source');donor.model={hybrid:{sourceGrains:source}};config.params.materialPilot=false;await bad('mode');config.params.materialPilot=true;
 state.spectralData.values=[0,0,0,0];await bad('empty');state.spectralData.values=[0,.5,.3,0];
 const adapterResults=[];
 for(const gestalt of [false,true])for(const revision of ['original','revised']){const job={...api.capture(state),config:{params:{gestaltPilot:gestalt,materialPilot:true,variantRevision:revision}}};adapterResults.push(plain(await ctx.adapters.donor(job,{})));}
 try{await ctx.adapters.donor({config:{params:{}}},{})}catch(e){errors.push(['adapter-mode',e.name,e.message])}
 for(const revision of ['original','revised']){const job={recipe:{variantRevision:revision}};adapterResults.push(ctx.adapters.synthetic(job,{},{}));adapterResults.push(ctx.adapters.combine(job,{},{},{}));}
 adapterResults.push(ctx.adapters.buffer(new Float32Array([.1,.2]),8000));adapterResults.push(ctx.adapters.spectrum(new Float32Array([.1]),8000,()=>false,{}));
 const artifact=await api.render(state);assert.strictEqual(api.current(),artifact);donor.selected=false;assert.equal(api.current(),null);donor.selected=true;
 const played=await api.play(state,{fromPosition:.25,onPosition:p=>log.push(['position',p]),onEnd:()=>log.push(['end'])});assert.equal(played,true);
 cancelHook();failure=new Error('planned render failure');try{await api.play(state)}catch(e){errors.push(['play-failure',e.name,e.message])}failure=null;
 let resolve;blocked=new Promise(r=>resolve=r);const pending=api.play(state);await Promise.resolve();api.stop();resolve();assert.equal(await pending,false);blocked=null;
 let release;blocked=new Promise(r=>release=r);const stale=api.render(state);donor.selected=false;release();try{await stale}catch(e){errors.push(['stale',e.name,e.message])}donor.selected=true;blocked=null;
 api.attach();const unchanged=log.length;subscribers.state[0]();assert.equal(log.length,unchanged);state.renderVersion++;state.spectralData.values=[0,.7,.3,0];subscribers.state[0]();donor.selected=false;subscribers.donor[0]();tuning='ji';subscribers.tuning[0]();
 return plain({captures,errors,adapterResults,played,signatureCalls,planCalls,diagnostics:api.diagnostics(),log});
}
(async()=>{const result=await exercise();if(process.argv.includes('--capture'))fs.writeFileSync(fixture,JSON.stringify(result,null,2)+'\n');assert.deepEqual(result,JSON.parse(fs.readFileSync(fixture)),'Latest baseline capture/playback behavior changed');const report={status:'PASS',captureCases:result.captures.length,errorCases:result.errors.length,adapterResults:result.adapterResults.length,lifecycleEvents:result.log.length,signatureCalls:result.signatureCalls,planCalls:result.planCalls,sha256:crypto.createHash('sha256').update(JSON.stringify(result)).digest('hex')};fs.writeFileSync(path.join(root,'results/clean5_runtime_characterization.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report))})().catch(e=>{console.error(e);process.exitCode=1});
