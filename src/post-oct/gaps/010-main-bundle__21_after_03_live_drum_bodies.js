var __XenDrumSessionWorkspace=(()=>{
 let bank={},pending=null,pendingTurns=0,sessionId=null,restorePhase=false,allowLegacyBoot=true;
 const listeners=new Set(),voices=['kick','snare','hatClosed','hatOpen','clap','perc'];
 const clone=x=>x==null?null:JSON.parse(JSON.stringify(x));
 const neutral=()=>({schema:'drum-lane-eq-v1',enabled:false,lowDb:0,midDb:0,highDb:0});
 const effective=(snapshot,edit,lane)=>edit?.laneKitOverrides?.[lane]||snapshot?.laneKitOverrides?.[lane]||snapshot?.exported?.laneKitOverrides?.[lane]||edit?.kit||snapshot?.kit||'dusty_tape';
 const currentSource=()=>__mlSharedDrumMachine?.snapshot?__f351DrumSource(__mlSharedDrumMachine.snapshot):'';
 const tell=()=>{if(restorePhase||__f351PreviewActive)return;for(const cb of listeners)try{cb()}catch(e){console.warn('[drum workspace listener]',e)}};
 const remember=(kit,lane,eq)=>{
  if(!kit||!voices.includes(lane))return;
  const value=__f52EQNormalize(eq),row=bank[kit]||(bank[kit]={});
  row[lane]=clone(value);
 };
 const liveEQ=(edit,snapshot,lane)=>edit?.laneSettings?.[lane]?.eq??snapshot?.exported?.laneSettings?.[lane]?.eq??snapshot?.laneSettings?.[lane]?.eq;
 const capture=()=>{
  const machine=__mlSharedDrumMachine;
  const edit=machine?.liveEdit;
  const playground=edit&&machine.snapshot?{source:currentSource(),edit:__f350CloneDrumEdit(edit)}:pending?clone(pending):null;
  const snap=machine?.snapshot;
  const selection=snap?{kit:edit?.kit||snap.kit,pattern:snap.pattern,mode:snap.mode,configId:snap.configId,laneKitOverrides:edit?.laneKitOverrides||snap.laneKitOverrides}:null;
  return __xenDrumWorkspaceSafe({version:1,eqByKit:bank,playground,selection});
 };
 const applyBank=(edit,snapshot,previousSnapshot=null,previousEdit=null,force=false,preserveBeatEQ=false)=>{
  if(!edit)return edit;
  let settings=edit.laneSettings,changed=false;
  for(const lane of voices){
   const kit=effective(snapshot,edit,lane),oldKit=previousSnapshot?effective(previousSnapshot,previousEdit,lane):kit;
   if(!force&&kit===oldKit)continue;
   // A saved beat owns its explicit lane EQ (even a deliberately neutral EQ).
   // The session bank is a fallback only for lanes without a beat EQ.
   const beatEq=edit?.laneSettings?.[lane]?.eq??snapshot?.exported?.laneSettings?.[lane]?.eq;
   if(preserveBeatEQ&&beatEq!=null)continue;
   const desired=bank[kit]?.[lane]||neutral();
   const oldEq=liveEQ(edit,snapshot,lane);
   if(JSON.stringify(__f52EQNormalize(oldEq))===JSON.stringify(__f52EQNormalize(desired)))continue;
   if(!changed)settings={...(edit.laneSettings||{})};changed=true;
   settings[lane]={...Z0[lane],...(settings[lane]||{}),eq:clone(desired)};
  }
  return changed?{...edit,laneSettings:settings}:edit;
 };
 const seedBankOnly=(machine,next)=>{
  if(!next||machine.liveEdit)return false;
  const overrides=next.laneKitOverrides||next.exported?.laneKitOverrides||{};
  if(!voices.some(lane=>bank[effective(next,{kit:next.kit,laneKitOverrides:overrides},lane)]?.[lane]))return false;
  const fresh={grid:__f52EnsureDrumGrid(__mlGridFromSelection(next)),kit:next.kit,
   laneKitOverrides:overrides,laneSettings:next.exported?.laneSettings||next.laneSettings||{}};
  machine.setLiveEdit(applyBank(fresh,next,null,null,true,true),true,false);
  return true;
 };
 return Object.freeze({
  subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),
  noteDraftChanged:tell,
  capture,
  rememberEQ(lane,eq){
   if(restorePhase||__f351PreviewActive)return;
   const machine=__mlSharedDrumMachine,kit=effective(machine.snapshot,machine.liveEdit,lane);
   remember(kit,lane,eq);tell();
  },
  reconcileEdit(before,after,snapshot){
   if(restorePhase||__f351PreviewActive||!after)return after;
   let changed=false;
   for(const lane of voices){
    const oldKit=effective(snapshot,before,lane),newKit=effective(snapshot,after,lane);
    if(oldKit===newKit)continue;
    if(!bank[oldKit]?.[lane]){
     const previous=liveEQ(before,snapshot,lane);
     if(__f52EQActive(previous))remember(oldKit,lane,previous);
    }
    changed=true;
   }
   return changed?applyBank(after,snapshot,snapshot,before):after;
  },
  onPublish(previous,next,machine){
   if(restorePhase||__f351PreviewActive)return;
   if(pending){
    if(pending.source===__f351DrumSource(next)){
     const draft=pending;pending=null;pendingTurns=0;
     const restored=__f351CleanDrumDraft(draft.edit);
     if(restored){machine.setLiveEdit(applyBank(restored,next,null,null,true,true),true,false);machine.resetHistory();return;}
    }else if(++pendingTurns<=6)return;
    else{pending=null;pendingTurns=0;}
   }
   if(!machine.liveEdit&&seedBankOnly(machine,next))return;
   if(previous&&machine.liveEdit){
    let changed=false;
    for(const lane of voices){
     const oldKit=effective(previous,{...machine.liveEdit,kit:previous.kit,laneKitOverrides:previous.laneKitOverrides||{}},lane);
     const newKit=effective(next,machine.liveEdit,lane);
     if(oldKit===newKit)continue;
     if(!bank[oldKit]?.[lane]){
      const old=liveEQ(machine.liveEdit,previous,lane);
      if(__f52EQActive(old))remember(oldKit,lane,old);
     }
     changed=true;
    }
    if(changed){
     const updated=applyBank(machine.liveEdit,next,previous,{...machine.liveEdit,kit:previous.kit,laneKitOverrides:previous.laneKitOverrides||{}});
     if(updated!==machine.liveEdit)machine.setLiveEdit(updated,true,false);
    }
   }
  },
  restore(value,{sessionId:id=null,allowLegacy=false}={}){
   const row=__xenDrumWorkspaceSafe(value),machine=__mlSharedDrumMachine;
   restorePhase=true;
   try{
    bank=clone(row.eqByKit);sessionId=id;allowLegacyBoot=allowLegacy;
    pending=row.playground?clone(row.playground):null;pendingTurns=0;
    machine.resetHistory();machine.setLiveEdit(null,true,false);
    if(pending&&machine.snapshot&&pending.source===__f351DrumSource(machine.snapshot)){
     const draft=__f351CleanDrumDraft(pending.edit);pending=null;
     if(draft)machine.setLiveEdit(applyBank(draft,machine.snapshot,null,null,true,true),true,false);
    }
    if(!machine.liveEdit&&machine.snapshot&&allowLegacyBoot){
     allowLegacyBoot=false;
     const legacy=__f351ReadWorkspace().drum;
     if(legacy?.source===__f351DrumSource(machine.snapshot)){
      const draft=__f351CleanDrumDraft(legacy.edit);
      if(draft)machine.setLiveEdit(draft,true,false);
     }
    }
    if(!machine.liveEdit&&machine.snapshot)seedBankOnly(machine,machine.snapshot);
   }finally{restorePhase=false}
   tell();return true;
  },
  legacyBootDraft(snapshot){
   if(!allowLegacyBoot||sessionId!==null)return null;
   allowLegacyBoot=false;
   const draft=__f351ReadWorkspace().drum;
   if(draft?.source!==__f351DrumSource(snapshot))return null;
   return __f351CleanDrumDraft(draft.edit);
  },
  status:()=>({sessionId,eqKits:Object.keys(bank).length,eqVoices:Object.values(bank).reduce((n,r)=>n+Object.keys(r).length,0),hasPlayground:!!pending||!!__mlSharedDrumMachine?.liveEdit})
 });
})();
