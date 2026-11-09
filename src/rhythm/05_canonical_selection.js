
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
 endGesture(){
   const pending=this.gestureDraftPending===true;
   this.editGesture=null;this.gestureDraftPending=false;
   if(pending)__f351SaveDraft('drum',this.liveEdit&&this.snapshot?
      {source:__f351DrumSource(this.snapshot),edit:__f350CloneDrumEdit(this.liveEdit)}:null);
 },
 undo(){if(!this.canUndo())return false;this.endGesture();const previous=this.historyPast.pop();this.historyFuture.push(__f350CloneDrumEdit(this.liveEdit));this.setLiveEdit(previous,true,false);return true},
 redo(){if(!this.canRedo())return false;this.endGesture();const next=this.historyFuture.pop();this.historyPast.push(__f350CloneDrumEdit(this.liveEdit));this.setLiveEdit(next,true,false);return true},
 resetHistory(){this.historyPast=[];this.historyFuture=[];this.editGesture=null;this.gestureDraftPending=false},
 preview:__mlPreviewSharedDrums,stop:__mlStopSharedDrums,previewContext:null,previewOwned:false,previewToken:null,
 previewPhase:"idle",previewStep:-1,previewListeners:new Set(),
 // LIVE-GUARD-01: strictly read-only rAF clock witness; no scheduler callbacks.
 mainPowerOn:false,
 setMainPower(enabled){this.mainPowerOn=enabled===true},
 readMainTick(){
   const ctx=__f53ActiveLiveDrumMachine?.__visualClock,selection=this.snapshot;
   if(!this.mainPowerOn||!selection?.active||!ctx||ctx.state!=="running"||
      !Number.isFinite(ctx.currentTime))return -1;
   const bpm=Number(selection.bpm);
   if(!Number.isFinite(bpm)||bpm<=0)return -1;
   const stepDurationSec=60/Math.max(20,Math.min(420,bpm))/4;
   const elapsed=ctx.currentTime-GPe;
   return elapsed>=-.003?Math.max(0,Math.floor((elapsed+.003)/stepDurationSec)):-1;
 },
 subscribePreview(fn){this.previewListeners.add(fn);fn(this.previewPhase,this.previewStep);return()=>this.previewListeners.delete(fn)},
 setPreview(phase,step){if(this.previewPhase===phase&&this.previewStep===step)return;
   this.previewPhase=phase;this.previewStep=step;
   for(const fn of this.previewListeners)try{fn(phase,step)}catch(error){console.error("[ml drum preview cursor]",error)}},
 setLiveEdit(next,notifyForge=true,recordHistory=true){
   // Preserve a detached, unsaved new pattern across direct grid/mixer edits.
   // Undo/redo passes recordHistory=false and restores the exact previous marker.
   if(recordHistory&&next&&this.liveEdit?.__xenNewPatternDraft===true&&
      !Object.prototype.hasOwnProperty.call(next,'__xenNewPatternDraft'))
     next={...next,__xenNewPatternDraft:true};
   if(recordHistory&&JSON.stringify(this.liveEdit)!==JSON.stringify(next)){
     if(!this.editGesture||!this.editGesture.recorded){
       const before=this.editGesture?this.editGesture.before:__f350CloneDrumEdit(this.liveEdit);
       this.historyPast.push(before);
       if(this.historyPast.length>32)this.historyPast.shift();
       if(this.editGesture)this.editGesture.recorded=true;
       this.historyFuture=[];
     }
   }
   if(next&&this.snapshot)next=__XenDrumSessionWorkspace.reconcileEdit(this.liveEdit,next,this.snapshot);
   this.liveEdit=next;
   __f53ActiveLiveDrumMachine?.prepareSamples(next?.grid||this.snapshot?.exported).catch(()=>{});
   // Do not repeatedly deep-copy and synchronously persist the entire beat
   // on each pointer move; persist the final gesture state exactly once.
   if(this.editGesture)this.gestureDraftPending=true;
   else __f351SaveDraft('drum',next&&this.snapshot?{source:__f351DrumSource(this.snapshot),edit:__f350CloneDrumEdit(next)}:null);
   for(const fn of this.listeners)try{fn(this.snapshot)}catch(e){console.error("[ml drum grid]",e)}
   if(notifyForge){
     for(const fn of this.editListeners)try{fn(next)}catch(e){console.error("[ml drum forge sync]",e)}
     if(typeof window!=="undefined")window.dispatchEvent(new Event("xensonar:live-drum-grid-updated"));
   }
 },
 subscribeEdits(fn){this.editListeners.add(fn);return()=>this.editListeners.delete(fn)},
 publish(next){
 // Restore the beat-owned global rack decay when a different saved beat is selected.
 // Later knob movements remain managed by the existing rack owner.
 const changedBeat=!this.snapshot||this.snapshot.mode!==next.mode||this.snapshot.configId!==next.configId||this.snapshot.pattern!==next.pattern;
 const stored=changedBeat?__xenBeatDrumStyleSafe(next.exported?.drumStyle):null;
 if(stored){
  if(Math.abs(__f48RackParams.drumDecay-stored.decayScale)>1e-6)__f48PatchRack({...__f48RackParams,drumDecay:stored.decayScale});
  next={...next,drumStyle:{...next.drumStyle,decayScale:stored.decayScale}};
 }
 const signature=JSON.stringify(next);if(signature===this.signature)return;
 const previous=this.snapshot;
 const changedPattern=!previous||previous.mode!==next.mode||previous.pattern!==next.pattern||previous.configId!==next.configId;
 this.signature=signature;this.snapshot=next;
 if(!this.liveEdit)__f53ActiveLiveDrumMachine?.prepareSamples(next?.exported).catch(()=>{});
 
   if(this.liveEdit&&!changedPattern&&(previous.kit!==next.kit||JSON.stringify(previous.laneKitOverrides)!==JSON.stringify(next.laneKitOverrides))){this.liveEdit={...this.liveEdit,kit:next.kit,laneKitOverrides:next.laneKitOverrides||{}}}
   if(changedPattern){
     this.liveEdit=null;this.resetHistory();
     if(!previous){
       const draft=__XenDrumSessionWorkspace.legacyBootDraft(next);
       if(draft)this.liveEdit=draft;
     }
     __f351SaveDraft('drum',this.liveEdit?{source:__f351DrumSource(next),edit:__f350CloneDrumEdit(this.liveEdit)}:null);
   }
   __XenDrumSessionWorkspace.onPublish(previous,next,this);
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
 const liveStyle=__mlSharedDrumMachine.liveEdit?.drumStyle||snapshot?.drumStyle;
 const savedStyle=__xenBeatDrumStyleSafe(snapshot?.exported?.drumStyle);
 // Existing controls continue to drive edge/softness/air/snap/swing/decay.
 // Non-room pan/choke remain part of a saved beat for preview and export parity.
 const currentStyle=__mlSharedDrumMachine.liveEdit?.drumStyle||!savedStyle?liveStyle:{...liveStyle,pan:savedStyle.pan,chokeGroup:savedStyle.chokeGroup};
 return {...spec,drumCycleBars:Math.max(1,cycleBars),...(currentStyle?{drumStyle:currentStyle}:{})};
}