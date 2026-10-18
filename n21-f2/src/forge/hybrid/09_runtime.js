

var __F352Runtime=(()=>{
 const jobs=__createF352JobCapture({pe,Vt,__F341Workbench,__F352Session,xR,__f333Signature,__f352Clone,__f352Freeze,Zp,ph,__ForgeF33,__f3565PitchSemis,__f3565PitchSupport,sourceKey:source=>__F353SourceIdentity.key(source),readTuning:()=>__F3564Master.getSnapshot().tuning});
 const pipeline=__f352CreatePipeline(__createF352RenderAdapters({__F356GestaltWorkerOriginal,__F356GestaltWorker,__F356WorkerOriginal,__F356Worker,__f356ProjectCeciliaStates,__F352Worker,__f352RenderCeciliaOriginal,__f352RenderCecilia,__F352DSPOriginal,__F352DSP,xt}));
 return __createF352PlaybackRuntime({pipeline,identity:jobs.identity,capture:jobs.capture,pe,Vt,xt,__F352Worker,__F341Workbench,__F352Session,__f3564ActivateLiveGain,subscribeTuning:listener=>__F3564Master.subscribe(listener)});
})();
