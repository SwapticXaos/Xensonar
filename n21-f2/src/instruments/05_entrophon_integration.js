/* Saved instruments use the existing selectors, composer snapshots and transport. */
const __EntrophonLiveDefinitions=new Map();
function isSavedEntrophonSound(id){return typeof id==='string'&&id.startsWith('entrophon:');}
function entrophonLiveDefinition(id){
  if(!isSavedEntrophonSound(id))return null;
  if(__EntrophonLiveDefinitions.has(id))return __EntrophonLiveDefinitions.get(id);
  const value=entrophonFindInstrument(id);
  if(value){if(__EntrophonLiveDefinitions.size>=96)__EntrophonLiveDefinitions.delete(__EntrophonLiveDefinitions.keys().next().value);__EntrophonLiveDefinitions.set(id,value);}
  return value;
}
function entrophonSoundOptions(existing=[]){
  let entries=[];try{entries=__XenEntrophonLibrary.list();}catch{}
  return [...existing,...entries.map(entry=>({value:'entrophon:'+entry.id+'@'+entry.revision,label:'Entrophon · '+entry.instrument.name,originLabel:'Entrophon',hint:'Saved synthetic instrument'}))];
}
function entrophonComposerSourceFields(composer){
  const bank=Object.create(null),stored=composer.entrophonInstruments??{};
  // Keep definitions referenced by a slot or note; replaced drafts must not grow the project forever.
  const keys=new Set();
  for(const track of composer.tracks??[])if(isSavedEntrophonSound(track.instrumentPreset))keys.add(track.instrumentPreset);
  for(const note of composer.notes??[])if(isSavedEntrophonSound(note.instrumentPresetOverride))keys.add(note.instrumentPresetOverride);
  if(keys.size>48)throw new Error('Too many Entrophon project instruments');
  for(const key of keys){
    if(!/^entrophon:.+@[1-9][0-9]*$/.test(key)||key.length>220)throw new Error('Invalid Entrophon project source');
    const value=stored[key]??entrophonFindInstrument(key,composer);
    if(!value)throw new Error('Missing Entrophon instrument: '+key);
    bank[key]=normalizeEntrophonInstrument(value);
  }
  return keys.size?{entrophonInstruments:bank}:{};
}
function entrophonInstrumentMenu(composer){
  const choices=new Map();let entries=[];try{entries=__XenEntrophonLibrary.list();}catch{}
  for(const entry of entries)choices.set('entrophon:'+entry.id+'@'+entry.revision,{instrument:entry.instrument,project:false});
  for(const [key,value] of Object.entries(composer?.entrophonInstruments??{}))choices.set(key,{instrument:choices.get(key)?.instrument??value,project:!choices.has(key)});
  return choices.size?[{id:'entrophon',label:'Entrophon · Synthetic Instruments',options:[...choices].map(([id,item])=>({id,label:item.instrument.name+(item.project?' · in project':''),originLabel:'Entrophon',hint:'Direct synthetic sound',baseHz:220}))}]:[];
}
function entrophonScheduleMelodic(ctx,destination,composer,note,track,start,stepSec,source,register){
  const item=source.noteBuffers.get(note.id);if(!item)throw new Error('Entrophon note not prepared: '+note.id);
  const player=ctx.createBufferSource(),pan=ctx.createStereoPanner(),gain=ctx.createGain();
  player.buffer=item.buffer??item;pan.pan.value=Math.max(-1,Math.min(1,track.pan??0));gain.gain.value=Math.max(0,Math.min(1,track.volume??.8));
  player.connect(pan);pan.connect(gain);gain.connect(destination);player.start(start+Ax(composer,note)*stepSec);
  register?.(player);register?.(pan);register?.(gain);
}
function entrophonEditSavedSound(entry){
  const instrument=normalizeEntrophonInstrument(entry.instrument);
  dG(instrument.surface,{...instrument.config});entrophonSetLibraryEditEntry(entry);
  window.dispatchEvent(new CustomEvent('xensonar:entrophon-open-editor',{detail:entry}));
}
function EntrophonSoundEditor(){
  const h=P.createElement,[entry,setEntry]=P.useState(null);
  P.useEffect(()=>{const open=e=>setEntry(e.detail);window.addEventListener('xensonar:entrophon-open-editor',open);return()=>window.removeEventListener('xensonar:entrophon-open-editor',open);},[]);
  if(!entry)return null;
  return h('div',{role:'dialog','aria-modal':true,'aria-label':'Edit Entrophon sound',style:{position:'fixed',inset:0,zIndex:100000,background:'rgba(0,0,0,.8)',display:'flex',alignItems:'center',justifyContent:'center',padding:16},onClick:e=>{if(e.target===e.currentTarget)setEntry(null);}},h('div',{style:{width:'min(760px,96vw)',maxHeight:'90vh',overflowY:'auto',background:'#140b1d',border:'1px solid #a855f7',padding:14}},h('div',{style:{display:'flex',justifyContent:'space-between',marginBottom:8}},h('strong',null,entry.instrument.name),h('button',{type:'button',onClick:()=>setEntry(null)},'Close')),h(lse,{surface:entry.instrument.surface,gridBase:220,gridTuning:'Instrument'})));
}

let __EntrophonMelodicPreparationController=null;
function beginEntrophonMelodicPreparation(){cancelEntrophonMelodicPreparation();__EntrophonMelodicPreparationController=new AbortController();return __EntrophonMelodicPreparationController.signal;}
function cancelEntrophonMelodicPreparation(){__EntrophonMelodicPreparationController?.abort();__EntrophonMelodicPreparationController=null;}
function hasEntrophonMelodicNotes(request){return !request.drumPreviewOnly&&(request.composer.notes??[]).some(note=>{const track=request.composer.tracks.find(t=>t.id===note.trackId);return track&&isSavedEntrophonSound(yW(track,note));});}
