/* Stamp presets are figures, not a second sound library. Only the original
 * amplitude/grain raster is stored. A short, private Figure Project snapshot
 * goes through the same synthesis dispatch as a full Forge figure. */
const __XenStampFigureAudition=(()=>{
 const owners=new Set(),modelIds=new WeakMap(),WIDTH=128,HEIGHT=128,MAX_SECONDS=2.15;
 let nextModelId=0;
 const modelKey=model=>{if(!model)return 'missing';if(!modelIds.has(model))modelIds.set(model,++nextModelId);return modelIds.get(model);};
 const abort=()=>new DOMException('Stamp audition superseded','AbortError');
 // Area energy pooling retains narrow transients/ridges and their grain. No
 // crop/normalization of the frequency axis: +X=time, +Y=lower log frequency.
 function miniature(stamp,width=WIDTH,height=HEIGHT){
  const W=stamp?.width,H=stamp?.height;
  if(!Number.isSafeInteger(W)||!Number.isSafeInteger(H)||W<1||H<2||stamp.data?.length!==W*H||stamp.grainData?.length!==W*H)
   throw Error('The stamp has no valid amplitude/grain figure.');
  width=Math.min(width,W);height=Math.min(height,H);
  const grid=new ph(Math.max(8,width),Math.max(2,height));
  for(let y=0;y<grid.height;y++)for(let x=0;x<grid.width;x++){
   const left=x*W/grid.width,right=(x+1)*W/grid.width,top=y*H/grid.height,bottom=(y+1)*H/grid.height;
   let energy=0,grain=0,area=0;
   for(let sy=Math.floor(top);sy<Math.ceil(bottom);sy++)for(let sx=Math.floor(left);sx<Math.ceil(right);sx++){
    const weight=(Math.min(right,sx+1)-Math.max(left,sx))*(Math.min(bottom,sy+1)-Math.max(top,sy));
    const at=sy*W+sx,a=stamp.data[at],g=stamp.grainData[at];
    if(!Number.isFinite(a)||!Number.isFinite(g))throw Error('The stamp figure contains invalid values.');
    const e=Math.max(0,Math.min(1,a))**2*weight;
    energy+=e;grain+=e*Math.max(0,Math.min(1,g));area+=weight;
   }
   grid.set(x,y,Math.sqrt(energy/area));grid.setGrain(x,y,energy>0?grain/energy:.5);
  }
  return grid;
 }
 function requestFor(preset,state){
  const grid=miniature(preset.stamp),duration=Math.max(.25,Math.min(MAX_SECONDS,Zp(1,state.materialExport.bpm,state.materialExport.beatsPerBar)));
  const snapshot={version:'spectral-forge-project-v1',routingContractVersion:1,
   spectralWidth:grid.width,spectralHeight:grid.height,spectralSnapshot:grid.cloneData(),melodicCarrier:null,carrierDetune:0,
   materialExport:{...state.materialExport,name:preset.name,bars:1,guideMarkers:[],loopPreview:false},
   synthMode:state.synthMode,waveformMix:{...state.waveformMix},
   carrierIntegralSelection:state.carrierIntegralSelection,carrierIntegralSynthLab:state.carrierIntegralSynthLab,
   carrierIntegralHarmonicXplore:state.carrierIntegralHarmonicXplore,
   emiliaInstrument:__Emilia.snapshot(),fractaliaInstrument:__Fractalia.snapshot(),forgeVoices:__ForgeVoices.snapshot()};
  const request=OB({projectName:preset.name,snapshot,machineId:state.carrierIntegralSelection.machineId,
   valueSource:'right-override',selection:state.carrierIntegralSelection,synthLab:state.carrierIntegralSynthLab,
   harmonicXplore:state.carrierIntegralHarmonicXplore,previewBpm:state.materialExport.bpm,
   previewGain:1,previewPitchSemitones:__f3565PitchSemis(),loopPreview:false});
  request.renderDurationSec=duration;
  return {grid,request};
 }
 function controls(state){return [state.carrierIntegralSelection,state.carrierIntegralSynthLab,state.carrierIntegralHarmonicXplore,
  state.synthMode,state.waveformMix,state.materialExport.bpm,state.materialExport.beatsPerBar,__f3565PitchSemis(),
  __f333Route(state),__Emilia.snapshot(),__Fractalia.snapshot()];}
 const equal=(a,b)=>a.length===b.length&&a.every((value,i)=>Object.is(value,b[i]));
 function create({onState=()=>{}}={}){
  let disposed=false,controller=null,source=null,gain=null,tail=Promise.resolve(),epoch=0;
  let inputs=null,capturedDonor=null,cacheBytes=0;
  const cache=new Map(),rawRenderer=__PureDieter.create();
  const notify=(phase,text='')=>{if(!disposed)onState({phase,text});};
  function stop(){epoch++;inputs=null;capturedDonor=null;controller?.abort();controller=null;rawRenderer.cancel();
   if(source){source.onended=null;try{source.stop()}catch{}source.disconnect();source=null;}
   gain?.disconnect();gain=null;notify('idle');}
  function clear(){stop();cache.clear();cacheBytes=0;}
  function update(){if(inputs&&!equal(inputs,controls(pe.getState())))stop();}
  const release=[pe.subscribe(update),__Emilia.subscribe(update),__Fractalia.subscribe(update),
   __F3564Master.subscribe(()=>{update();if(gain&&source)gain.gain.setTargetAtTime(__f3564SafeGain(source.buffer,__F3564Master.getSnapshot().volume),xt.getContext().currentTime,.008);})];
  const donorInputs=()=>[Vt.getSnapshot().source,Vt.getSnapshot().model,Vt.getSnapshot().selected,
   __F341Workbench.fingerprint(__F341Workbench.getConfig()),Ti(__F352Session.export())];
  const donorChanged=()=>{if(capturedDonor&&!equal(capturedDonor,donorInputs()))stop();};
  release.push(Vt.subscribe(donorChanged),__F341Workbench.subscribe(donorChanged),__F352Session.subscribe(donorChanged));
  function remember(key,buffer){
   const bytes=buffer.length*buffer.numberOfChannels*4;if(bytes>4*1024*1024)return;
   if(cache.has(key))cacheBytes-=cache.get(key).length*cache.get(key).numberOfChannels*4;
   cache.delete(key);cache.set(key,buffer);cacheBytes+=bytes;
   while(cache.size>6||cacheBytes>4*1024*1024){const first=cache.keys().next().value,b=cache.get(first);cacheBytes-=b.length*b.numberOfChannels*4;cache.delete(first);}
  }
  async function renderDonor(state,grid,request,route,check){
   const duration=request.renderDurationSec;
   if(route==='donor'){
    const donor=Vt.getSnapshot();
    return xt.renderDonorBodyToBuffer(__f3565PitchGrid(grid,__f3565PitchRatio()),donor.source,duration,()=>{try{check();return false}catch{return true}},donor.model,request.onRenderProgress);
   }
   // Same frozen-job capture/adapters as the primary Donor/Hybrid path. No
   // playback runtime, workspace installation, global stop or persistent cache.
   const capture=__createF352JobCapture({pe,Vt,__F341Workbench,__F352Session,xR,__f333Signature,__f352Clone,__f352Freeze,Zp,ph,__ForgeF33,
    __f3565PitchSemis,__f3565PitchSupport,sourceKey:s=>__F353SourceIdentity.key(s),readTuning:__f3565PitchSemis});
   const miniState={...state,spectralData:grid,materialExport:{...request.snapshot.materialExport,
    bpm:state.materialExport.beatsPerBar*60/duration},createProjectSnapshot:()=>request.snapshot};
   const job=capture.capture(miniState),adapters=__createF352RenderAdapters({__F356GestaltWorkerOriginal,__F356GestaltWorker,
    __F356WorkerOriginal,__F356Worker,__f356ProjectCeciliaStates,__F352Worker,__f352RenderCeciliaOriginal,__f352RenderCecilia,
    __F352DSPOriginal,__F352DSP,xt});
   const options={isCancelled:()=>{try{check();return false}catch{return true}},onProgress:request.onRenderProgress};
   const donor=await adapters.donor(job,options);check();
   let result=donor;
   if(job.recipe.amount>0){const synthetic=await adapters.synthetic(job,donor,options);check();result=await adapters.combine(job,donor,synthetic,options);check();}
   return adapters.buffer(result.pcm,job.sampleRate);
  }
  function play(preset){
   stop();if(disposed)return Promise.resolve(false);
   capturedDonor=null;inputs=controls(pe.getState());
   const ticket=epoch,signal=(controller=new AbortController()).signal,transport=__f333Epoch;
   const current=()=>!disposed&&ticket===epoch&&!signal.aborted&&transport===__f333Epoch;
   const check=()=>{if(!current())throw abort();};
   // Resume in the click's activation, reuse the existing Forge context.
   const ctx=xt.getContext(),resumed=ctx.resume();resumed.catch(()=>{});
   notify('rendering','Rendering selected hearing …');
   const run=tail.catch(()=>{}).then(async()=>{
    await resumed;check();
    const state=pe.getState(),{grid,request}=requestFor(preset,state);
    let route=__f333Route(state);
    request.onRenderProgress=()=>check();
    let context=IB(request),preparedDonorKey;
    if(request.machineId==='fractalia-self-carrier'&&request.snapshot.fractaliaInstrument.donor){
     await __f3562EnsureDonor();check();preparedDonorKey=fractaliaDonorSnapshot().key;capturedDonor=donorInputs();
    }
    const donorRoute=['donor','donor-pending','hybrid'].includes(route);
    if(donorRoute){
     await __f3562EnsureDonor();check();
     if(!Vt.getSnapshot().selected&&!Vt.selectDonor())throw Error('Import audio to hear this stamp with the selected donor.');
     check();route=__f333Route(pe.getState());inputs=controls(pe.getState());capturedDonor=donorInputs();
    }
    // A ready donor identity is included. Preparation can change its model, so
    // donor cache insertion uses the identity AFTER acquisition as well.
    const key=()=>__f333HearingCacheKey(request,context)+'|stamp|'+(donorRoute?Ti({route,source:__F353SourceIdentity.key(Vt.getSnapshot().source),revision:Vt.getSnapshot().sourceRevision,model:modelKey(Vt.getSnapshot().model),
     workbench:__F341Workbench.fingerprint(__F341Workbench.getConfig()),hybrid:__F352Session.export()}):'machine');
    let cacheKey=key(),buffer=cache.get(cacheKey);
    if(!buffer){buffer=donorRoute?await renderDonor(state,grid,request,route,check):
     await __f333SynthesizeHearing(request,context,{check,signal,preparedDonorKey,rawRenderer,transient:true});
     check();cacheKey=key();remember(cacheKey,buffer);
    }else{cache.delete(cacheKey);cache.set(cacheKey,buffer);}
    if(donorRoute)capturedDonor=donorInputs();
    check();if(!__f333AudiblePCM(buffer))throw Error('This stamp is silent with the selected hearing settings.');
    const node=ctx.createBufferSource(),level=ctx.createGain();node.buffer=buffer;
    level.gain.value=__f3564SafeGain(buffer,__F3564Master.getSnapshot().volume);
    node.connect(level);level.connect(ctx.destination);source=node;gain=level;
    node.onended=()=>{node.disconnect();level.disconnect();if(source===node){source=null;gain=null;notify('idle');}};
    node.start();notify('playing','Selected hearing');return true;
   }).catch(error=>{if(!current()||error.name==='AbortError')return false;notify('error',error.message);throw error;});
   tail=run;return run;
  }
  function dispose(){if(disposed)return;clear();disposed=true;for(const unsubscribe of release)unsubscribe();owners.delete(owner);}
  const owner=Object.freeze({play,stop,clear,dispose,diagnostics:()=>({cacheBytes,cacheEntries:cache.size,playing:!!source})});
  owners.add(owner);return owner;
 }
 return Object.freeze({create,miniature,requestFor,stopAll(){for(const owner of owners)owner.stop();}});
})();
