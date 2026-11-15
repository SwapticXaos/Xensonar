
/* XEN-META-M3-LANES-BEGIN
   Session-lane reassignment is a change of owner REFERENCE, not a conversion.
   No Root Follow bank registration, WAV rendering or audio asset duplication here.
   A target must independently own the SAME material ID before reassignment. */
function __xenMetaLaneCompatibility(entry,targetKind){
 if(!entry||typeof entry.id!=='string'||!entry.id)return {ok:false,reason:'Missing source identity.'};
 if(entry.kind===targetKind)return {ok:true,sameLane:true};
 if(!(['material','rootFollow'].includes(entry.kind)&&['material','rootFollow'].includes(targetKind)))
  return {ok:false,reason:'Only Material ↔ Root Follow can change session lanes.'};
 if(entry.id.startsWith('loop-rec-')&&(typeof __XenMetaSessions==='undefined'||__XenMetaSessions.activeSessionTakeIds().includes(entry.id)))return {ok:false,reason:'Session Takes cannot change owner lane; their recording belongs to the session.'};
 const id=entry.id;
 // The Root Follow bank is authoritative even when its UI is unmounted.
 let bank=null;try{bank=typeof Yp==='function'?Yp():null}catch{return {ok:false,reason:'Root Follow bank unavailable; no changes made.'};}
 if(targetKind==='rootFollow'){
  if(!bank||!Array.isArray(bank.memberIds)||!bank.memberIds.includes(id))
   return {ok:false,reason:'No Root Follow bank member for this material ID. Send through the native Root Follow route first.'};
  // Preserve the bank config in place: a synth plan stays a synth plan.
  return {ok:true,sourceId:id,targetKind};
 }
 // Material must already have a durable asset. Synth-only RFL entries are NOT audio.
 let inAdapter=false,inMaterialLibrary=false;
 try{const registered=__XenQuick.adapters.get('material')?.entries;
  inAdapter=Array.isArray(registered)&&registered.some(row=>String(row.id)===id);
  const library=typeof bs==='function'?bs():null;
  inMaterialLibrary=Array.isArray(library?.entries)&&library.entries.some(row=>String(row.id)===id);
 }catch{return {ok:false,reason:'Material library unavailable; no changes made.'};}
 if(!inAdapter&&!inMaterialLibrary)
  return {ok:false,reason:'No original Material Track audio asset for this ID. A synthetic Root Follow plan is not Raw Audio.'};
 return {ok:true,sourceId:id,targetKind};
}
/* XEN-META-M3-LANES-END */
/* META-COPY-RFL-01: Material Track -> Root Follow Loop (Meta board) is a COPY, not a move.
   The new Root Follow entry is its own durable loop with the length currently set in the loop
   editor (front/back bar edit; e.g. 6 original bars, 4 played -> 4 bars). The Material entry,
   including Loop-Rec session takes, stays untouched. Cold path: runs once per drop. */
async function __xenMetaCopyMaterialToRootFollow(entry,beforeId=null){
 if(!entry||entry.kind!=='material'||typeof entry.id!=='string'||!entry.id)throw Error('Missing Material source.');
 if(__xenMaterialImportBusy)throw Error('Material import is in progress.');
 await __ensureMaterialLibraryHydrated();
 const source=bs().entries.find(row=>row.id===entry.id)??await Uhe(QT,entry.id,'Could not read the Material source');
 if(!source?.blob?.size)throw Error('Original loop audio is unavailable.');
 if(!Number.isFinite(source.bpm)||source.bpm<=0||!Number.isFinite(source.bars)||source.bars<=0)throw Error('Material needs valid BPM and bar metadata.');
 const intent=__XenRackLiveBarEdits.intentFor(source.id)??__XenRackLiveBarEdits.get(source.id);
 const front=Number.isInteger(intent?.front)?intent.front:0,back=Number.isInteger(intent?.back)?intent.back:0;
 const beatsPerBar=Math.max(1,Math.round(Number(source.beatsPerBar)||4));
 let blob=source.blob,timing;
 if(front||back){
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error('Audio decoding is unavailable.');
  const ctx=new AC();let decoded;
  try{decoded=await ctx.decodeAudioData(await source.blob.arrayBuffer());}finally{await ctx.close().catch(()=>{});}
  const rendered=await __xenRackRenderBarEdit(decoded,source,front,back);
  const duration=rendered.plan.frames/rendered.plan.rate;
  blob=rendered.blob;
  timing={bars:rendered.plan.bars,durationSec:duration,loopStartSec:0,loopEndSec:duration,intendedLoopDurationSec:duration};
 }else{
  timing={bars:Math.max(1,Math.round(source.bars)),durationSec:source.durationSec,loopStartSec:source.loopStartSec,loopEndSec:source.loopEndSec,
   intendedLoopDurationSec:source.intendedLoopDurationSec,guideSegments:source.guideSegments,guideMarkers:source.guideMarkers};
 }
 const name=(String(source.name||entry.name||'Loop').trim().slice(0,86)||'Loop')+' · Root Follow';
 const saved=await __registerDurableMaterial(Yd({name,role:'loop',bpm:source.bpm,beatsPerBar,...timing,rootHz:source.rootHz??null,
  sourceVersion:'meta-copy-to-root-follow-v1',renderMode:'raw-root-follow-loop-selection',workspaceOrigin:'spectral-forge-cut-root-follow',
  rootFollowPreferred:true,routeSummary:'Copied from a Material Track in the Meta menu, length as set in the loop editor.'},blob),{selectOnRegister:false});
 const bank=Yp();
 if(!bank.memberIds.includes(saved.id))
  await UA({...bank,memberIds:[...bank.memberIds,saved.id],orderedIds:[...bank.orderedIds.filter(id=>id!==saved.id),saved.id],
   entryConfigs:{...bank.entryConfigs,[saved.id]:tg({sourceKind:'material',renderMode:'flowing'})}});
 if(!__XenMetaSessions.addItem({kind:'rootFollow',id:saved.id,name:saved.name},beforeId))
  throw Error(__XenMetaSessions.snapshot().error||'Session draft could not take the copy.');
 try{__XenQuick.refreshLibraries()}catch{}
 return {id:saved.id,name:saved.name,bars:timing.bars};
}
