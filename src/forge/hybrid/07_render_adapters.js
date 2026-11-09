

// Adapters select existing independent DSP/Worker revisions.
function __createF352RenderAdapters({__F356GestaltWorkerOriginal,__F356GestaltWorker,__F356WorkerOriginal,__F356Worker,__f356ProjectCeciliaStates,__F352Worker,__f352RenderCeciliaOriginal,__f352RenderCecilia,__F352DSPOriginal,__F352DSP,xt}){
 return {
  async donor(job,options){
   if(job.config.params.gestaltPilot){
    const pcm=await (job.config.params.variantRevision === "original" ? __F356GestaltWorkerOriginal : __F356GestaltWorker).render(job.support.plan,job.model,job.sampleRate,job.durationSec,{...options,workbench:job.config});
    return {pcm,material:pcm.donorMaterialPlan};
   }
   if(job.config.params.materialPilot){
    // The F3.56 material renderer is NOT part of the older F3.52 worker script.
    // Its own worker preserves complete source PCM and carrier-led source time.
    const pcm=await (job.config.params.variantRevision === "original" ? __F356WorkerOriginal : __F356Worker).render(job.support.plan,job.model,job.sampleRate,job.durationSec,{...options,workbench:job.config});
    const material=pcm.donorMaterialPlan;
    // Cecilia's coupling consumes source states. F3.56 plans continuous PCM
    // runs without state hops; construct a light, read-only analysis projection
    // for the optional Cecilia stem without changing any donor PCM or timing.
    __f356ProjectCeciliaStates(job,material);
    return {pcm,material};
   }
   throw Error('Choose an active donor listening mode before rendering.');
  },
  synthetic:(job,donor,options)=>__F352Worker.run('synthetic',job,{material:donor.material},options)??(job.recipe?.variantRevision==="original"?__f352RenderCeciliaOriginal:__f352RenderCecilia)(job,donor,options),
  combine:(job,donor,synthetic,options)=>__F352Worker.run('combine',job,{donor,synthetic},options)??(job.recipe?.variantRevision==="original"?__F352DSPOriginal:__F352DSP).combine(job,donor,synthetic,options),
  buffer(pcm,sr){const buffer=xt.getContext().createBuffer(1,pcm.length,sr);buffer.copyToChannel(pcm,0);return buffer;},
  spectrum:(pcm,sr,isCancelled,job)=>__F352Worker.run('spectrum',job,{pcm},{isCancelled})??__F352DSP.spectrum(pcm,sr,{isCancelled})
 };
}
