
/* F3.27: one canonical Drum Machine selection; Forge only chooses through this bridge. */
function __f350CloneDrumEdit(value){
 if(!value)return null;
 return {...value,grid:value.grid?im(value.grid):null,
  laneKitOverrides:JSON.parse(JSON.stringify(value.laneKitOverrides||{})),
  laneSettings:JSON.parse(JSON.stringify(value.laneSettings||{}))};
}
var __mlSharedDrumMachine={snapshot:null,signature:"",listeners:new Set(),editListeners:new Set(),cycle:null,choosePreset:null,liveEdit:null,
 historyPast:[],historyFuture:[],editGesture:null,
 canUndo(){return this.historyPast.length>0},canRedo(){return this.historyFuture.length>0},
 beginGesture(){if(!this.editGesture)this.editGesture={before:__f350CloneDrumEdit(this.liveEdit),recorded:false}},
 endGesture(){this.editGesture=null},
 undo(){if(!this.canUndo())return false;this.endGesture();const previous=this.historyPast.pop();this.historyFuture.push(__f350CloneDrumEdit(this.liveEdit));this.setLiveEdit(previous,true,false);return true},
 redo(){if(!this.canRedo())return false;this.endGesture();const next=this.historyFuture.pop();this.historyPast.push(__f350CloneDrumEdit(this.liveEdit));this.setLiveEdit(next,true,false);return true},
 resetHistory(){this.historyPast=[];this.historyFuture=[];this.editGesture=null},
 preview:__mlPreviewSharedDrums,stop:__mlStopSharedDrums,previewContext:null,previewOwned:false,previewToken:null,
 previewPhase:"idle",previewStep:-1,previewListeners:new Set(),
 subscribePreview(fn){this.previewListeners.add(fn);fn(this.previewPhase,this.previewStep);return()=>this.previewListeners.delete(fn)},
 setPreview(phase,step){if(this.previewPhase===phase&&this.previewStep===step)return;
   this.previewPhase=phase;this.previewStep=step;
   for(const fn of this.previewListeners)try{fn(phase,step)}catch(error){console.error("[ml drum preview cursor]",error)}},
 setLiveEdit(next,notifyForge=true,recordHistory=true){
   if(recordHistory&&JSON.stringify(this.liveEdit)!==JSON.stringify(next)){
     if(!this.editGesture||!this.editGesture.recorded){
       const before=this.editGesture?this.editGesture.before:__f350CloneDrumEdit(this.liveEdit);
       this.historyPast.push(before);
       if(this.historyPast.length>32)this.historyPast.shift();
       if(this.editGesture)this.editGesture.recorded=true;
       this.historyFuture=[];
     }
   }
   this.liveEdit=next;
   __f53ActiveLiveDrumMachine?.prepareSamples(next?.grid||this.snapshot?.exported).catch(()=>{});
   __f351SaveDraft('drum',next&&this.snapshot?{source:__f351DrumSource(this.snapshot),edit:__f350CloneDrumEdit(next)}:null);
   for(const fn of this.listeners)try{fn(this.snapshot)}catch(e){console.error("[ml drum grid]",e)}
   if(notifyForge){
     for(const fn of this.editListeners)try{fn(next)}catch(e){console.error("[ml drum forge sync]",e)}
     if(typeof window!=="undefined")window.dispatchEvent(new Event("xensonar:live-drum-grid-updated"));
   }
 },
 subscribeEdits(fn){this.editListeners.add(fn);return()=>this.editListeners.delete(fn)},
 publish(next){const signature=JSON.stringify(next);if(signature===this.signature)return;
 const previous=this.snapshot;
 const changedPattern=!previous||previous.mode!==next.mode||previous.pattern!==next.pattern||previous.configId!==next.configId;
 this.signature=signature;this.snapshot=next;
 if(!this.liveEdit)__f53ActiveLiveDrumMachine?.prepareSamples(next?.exported).catch(()=>{});
 
   if(this.liveEdit&&!changedPattern&&(previous.kit!==next.kit||JSON.stringify(previous.laneKitOverrides)!==JSON.stringify(next.laneKitOverrides))){this.liveEdit={...this.liveEdit,kit:next.kit,laneKitOverrides:next.laneKitOverrides||{}}}
   if(changedPattern){
     this.liveEdit=null;this.resetHistory();
     if(!previous){
       const draft=__f351ReadWorkspace().drum;
       if(draft?.source===__f351DrumSource(next))this.liveEdit=__f351CleanDrumDraft(draft.edit);
     }
     __f351SaveDraft('drum',this.liveEdit?{source:__f351DrumSource(next),edit:__f350CloneDrumEdit(this.liveEdit)}:null);
   }
   if(this.previewOwned&&previous&&(previous.kit!==next.kit||JSON.stringify(previous.drumStyle)!==JSON.stringify(next.drumStyle)||JSON.stringify(previous.laneKitOverrides)!==JSON.stringify(next.laneKitOverrides))){const playing=b9e();if(playing?.drumRenderRequest)void __mlRefreshLiveDrumStem({...playing.drumRenderRequest,...__mlCanonicalDrumSpec(next,this.previewContext?.groove||{},this.previewContext?.computer||{})})}
 for(const fn of this.listeners)try{fn(next)}catch(e){console.error("[ml drum bridge]",e)}},
 subscribe(fn){this.listeners.add(fn);if(this.snapshot)fn(this.snapshot);return()=>this.listeners.delete(fn)} };
function __f48BaseDrumSpec(snapshot,localGroove,localComputer){
 const edit=__mlSharedDrumMachine.liveEdit;
 if(edit?.grid){return {drumPattern:undefined,drumKit:edit.kit||snapshot?.kit||localGroove.drumKit,
  drumLevel:.9,customDrumPattern:edit.grid,drumLaneKitOverrides:edit.laneKitOverrides||{},
  drumLaneSettings:edit.laneSettings||{}};}
 if(snapshot){const selected=snapshot.exported;
  if(selected){const grid=im({useCustom:true,presetSource:selected.presetSource||snapshot.pattern,
   bars:selected.bars,segmentsPerBar:selected.segmentsPerBar,segmentMarkers:selected.segmentMarkers,
   stepCount:selected.stepCount,laneOrder:selected.laneOrder,laneSteps:selected.laneSteps,stepPrograms:selected.stepPrograms||{},sampleSlots:selected.sampleSlots||{}});
   return {drumPattern:undefined,drumKit:snapshot.kit||selected.drumKit,drumLevel:.9,
    customDrumPattern:grid,drumLaneKitOverrides:selected.laneKitOverrides||{},drumLaneSettings:selected.laneSettings||{}};
  }
  return {drumPattern:snapshot.pattern,drumKit:snapshot.kit||localGroove.drumKit,drumLevel:.9,
   customDrumPattern:null,drumLaneKitOverrides:snapshot.laneKitOverrides||localGroove.drumLaneKitOverrides,
   drumLaneSettings:snapshot.laneSettings||localGroove.drumLaneSettings};
 }
 return {drumPattern:localComputer.useCustom?undefined:localGroove.drumPattern,
  drumKit:localGroove.drumKit,drumLevel:.9,customDrumPattern:localComputer.useCustom?localComputer:null,
  drumLaneKitOverrides:localGroove.drumLaneKitOverrides,drumLaneSettings:localGroove.drumLaneSettings};
}
function __mlCanonicalDrumSpec(snapshot,groove,computer){
 const spec=__f48BaseDrumSpec(snapshot,groove,computer);
 const cycleBars=spec.customDrumPattern?.bars||__mlSharedDrumMachine.liveEdit?.grid?.bars||(snapshot?__mlGridFromSelection(snapshot)?.bars:null)||computer?.bars||groove?.barsInterpretation||2;
 return {...spec,drumCycleBars:Math.max(1,cycleBars),...(snapshot?.drumStyle?{drumStyle:snapshot.drumStyle}:{})};
}