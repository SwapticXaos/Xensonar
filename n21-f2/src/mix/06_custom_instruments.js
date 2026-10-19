/* Reusable Melodic instruments are recipes over the existing engines. No PCM
   conversion, substitute synthesizer, or mutation of the authored note. */
const __mlCustomStorageKey = 'xensonar.melodic.custom-instruments.v1';
const __mlCustomVoiceKeys = ['carrierIntegralTimbre','carrierIntegralField','sampleOffsetSec','samplePlaybackDurationSec','materialPitchMode','anchorHz','sampleSourceKind'];
let __mlCustomStoredText = null, __mlCustomStoredEntries = [];
function __mlCustomId(id) { return typeof id==='string' && /^custom:[a-z0-9-]+@1$/.test(id); }
function __mlCustomDefinition(input) {
  if (!input || typeof input!=='object' || typeof input.basePreset!=='string' || input.basePreset.length>220 || !input.basePreset || input.basePreset.startsWith('custom:')) throw Error('Invalid custom instrument source');
  if (JSON.stringify(input).length>250000) throw Error('Custom instrument is too large');
  if (!Array.isArray(input.fields) || input.fields.length>8) throw Error('Custom instrument supports up to eight independent fields');
  const voice={};
  for (const key of __mlCustomVoiceKeys) if (input.voice?.[key]!=null) voice[key]=JSON.parse(JSON.stringify(input.voice[key]));
  const result={name:String(input.name||'Custom Instrument').trim().slice(0,96)||'Custom Instrument',basePreset:input.basePreset,fields:input.fields.map(field=>Zr(field)),voice};
  if (input.basePreset.startsWith('nodal:')) {
    if (!input.nodalInstrument) throw Error('Nodal source snapshot is missing');
    result.nodalInstrument=__XenNodalModel.normalize(input.nodalInstrument);
  }
  if (isSavedEntrophonSound(input.basePreset)) {
    if (!input.entrophonInstrument) throw Error('Entrophon source snapshot is missing');
    result.entrophonInstrument=normalizeEntrophonInstrument(input.entrophonInstrument);
  }
  return result;
}
function __mlCustomList() {
  const text=localStorage.getItem(__mlCustomStorageKey)||'[]';
  if (text===__mlCustomStoredText) return __mlCustomStoredEntries;
  const entries=JSON.parse(text);
  if (!Array.isArray(entries)||entries.length>48) throw Error('Invalid custom instrument library');
  const seen=new Set();
  const next=entries.map(entry=>{
    if (!__mlCustomId(entry?.id)||seen.has(entry.id)) throw Error('Invalid custom instrument identity');
    seen.add(entry.id);
    return {id:entry.id,instrument:__mlCustomDefinition(entry.instrument)};
  });
  __mlCustomStoredText=text;__mlCustomStoredEntries=next;
  return next;
}
function __mlCustomFind(id, composer) {
  if (!__mlCustomId(id)) return null;
  const embedded=composer?.customInstruments?.[id];
  if (embedded) return embedded;
  return __mlCustomList().find(entry=>entry.id===id)?.instrument??null;
}
function __mlCustomSourceFields(composer) {
  if (!composer.customInstruments) return {};
  const entries=Object.entries(composer.customInstruments);
  if (entries.length>48) throw Error('Too many custom instrument snapshots');
  const bank=Object.create(null);
  for (const [id, definition] of entries) {
    if (!__mlCustomId(id)) throw Error('Invalid custom instrument snapshot ID');
    bank[id]=__mlCustomDefinition(definition);
  }
  return {customInstruments:bank};
}
function __mlNoteFields(note) {
  return [...(note.instrumentFields??[]),...(note.localField?[note.localField]:[])];
}
function __mlCaptureCustomInstrument(composer, note, name) {
  const track=composer.tracks.find(item=>item.id===note.trackId);
  if (!track) throw Error('Instrument track is missing');
  const id=yW(track,note), previous=__mlCustomFind(id,composer), basePreset=previous?.basePreset??id;
  const voice={...previous?.voice};
  for (const key of __mlCustomVoiceKeys) if (note[key]!=null) voice[key]=note[key];
  const definition={name,basePreset,voice,fields:[...(previous?.fields??[]),...__mlNoteFields(note)]};
  if (basePreset.startsWith('nodal:')) definition.nodalInstrument=previous?.nodalInstrument??nodalFindInstrument(basePreset,composer);
  if (isSavedEntrophonSound(basePreset)) definition.entrophonInstrument=previous?.entrophonInstrument??entrophonFindInstrument(basePreset,composer);
  return __mlCustomDefinition(definition);
}
function __mlSaveCustomInstrument(composer, note, name, mutate) {
  const definition=__mlCaptureCustomInstrument(composer,note,name), entries=__mlCustomList();
  if (entries.length>=48) throw Error('Custom instrument library is full (48 instruments)');
  let id;
  do { id='custom:'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9)+'@1'; } while(entries.some(entry=>entry.id===id));
  const next=[...entries,{id,instrument:definition}], text=JSON.stringify(next);
  // Persist first; a quota/storage failure must not claim that saving worked.
  localStorage.setItem(__mlCustomStorageKey,text);
  __mlCustomStoredText=text;__mlCustomStoredEntries=next;
  mutate(project=>{project.customInstruments={...project.customInstruments,[id]:definition};},'Saved custom instrument · '+definition.name,{history:false});
  return {id,instrument:definition};
}
function __mlEmbedCustomInstrument(composer,id) {
  if (!__mlCustomId(id)) return;
  const definition=__mlCustomFind(id,composer);
  if (!definition) throw Error('Custom instrument is missing');
  composer.customInstruments={...composer.customInstruments,[id]:definition};
}
function __mlCustomMenu(composer) {
  let saved=[];try{saved=__mlCustomList()}catch{}
  const entries=new Map(saved.map(entry=>[entry.id,entry.instrument]));
  const referenced=new Set([...(composer?.tracks??[]).map(track=>track.instrumentPreset),...(composer?.notes??[]).map(note=>note.instrumentPresetOverride)]);
  for (const [id,instrument] of Object.entries(composer?.customInstruments??{})) if (referenced.has(id)&&!entries.has(id)) entries.set(id,instrument);
  return entries.size?[{id:'custom',label:'Custom Instruments · Source + Curves',options:Array.from(entries,([id,instrument])=>({id,label:instrument.name,hint:'Original engine with saved block curves',originLabel:'Custom'}))}]:[];
}
function __mlResolveCustomRequest(request) {
  const composer=request.composer;
  if (!composer?.tracks.some(track=>__mlCustomId(track.instrumentPreset))&&!composer?.notes.some(note=>__mlCustomId(note.instrumentPresetOverride))) return request;
  const definitions=new Map();
  const resolve=id=>{
    if (!__mlCustomId(id)) return null;
    if (!definitions.has(id)) {
      const definition=__mlCustomFind(id,composer);
      if (!definition) throw Error('Custom instrument is missing: '+id);
      // Different recipes may own different bodies captured from the same
      // original preset ID. Give each snapshot its own execution identity.
      const playbackPreset=definition.nodalInstrument?'nodal:recipe-'+id.slice(7):definition.entrophonInstrument?'entrophon:recipe-'+id.slice(7):definition.basePreset;
      definitions.set(id,{...definition,playbackPreset});
    }
    return definitions.get(id);
  };
  const tracks=composer.tracks.map(track=>{const definition=resolve(track.instrumentPreset);return definition?{...track,instrumentPreset:definition.playbackPreset}:track;});
  const originalTracks=new Map(composer.tracks.map(track=>[track.id,track]));
  const notes=composer.notes.map(note=>{
    const track=originalTracks.get(note.trackId),definition=track&&resolve(yW(track,note));
    return definition?{...definition.voice,...note,instrumentPresetOverride:definition.playbackPreset,instrumentFields:[...definition.fields,...(note.instrumentFields??[])]}:note;
  });
  const expanded={...composer,tracks,notes,nodalInstruments:{...composer.nodalInstruments},entrophonInstruments:{...composer.entrophonInstruments}};
  for (const definition of definitions.values()) {
    if (definition.nodalInstrument) expanded.nodalInstruments[definition.playbackPreset]=definition.nodalInstrument;
    if (definition.entrophonInstrument) expanded.entrophonInstruments[definition.playbackPreset]=definition.entrophonInstrument;
  }
  // Execution owns the resolved fields; library-only entries cannot invalidate
  // unrelated stems, and repeated preparation cannot apply a recipe twice.
  delete expanded.customInstruments;
  return {...request,composer:expanded};
}
function __MelodicCustomSave({composer,note,mutate}) {
  const [open,setOpen]=P.useState(false),[name,setName]=P.useState(''),[message,setMessage]=P.useState('');
  P.useEffect(()=>{setOpen(false);setMessage('');},[note.id]);
  if (!open) return u.jsxs(P.Fragment,{children:[u.jsx('button',{type:'button',className:'melodic-custom-save',onClick:()=>{setName((composer.tracks.find(track=>track.id===note.trackId)?.label||'Instrument')+' Custom');setOpen(true);},children:'Save as Custom Synth Instrument'}),message&&u.jsx('span',{role:'status',children:message})]});
  return u.jsxs('form',{className:'melodic-custom-save-form',onSubmit:event=>{event.preventDefault();try{const entry=__mlSaveCustomInstrument(composer,note,name,mutate);setMessage('Saved · '+entry.instrument.name+' · available in Custom Instruments');setOpen(false);}catch(error){setMessage(error.message);}},children:[
    u.jsxs('label',{children:['Instrument name',u.jsx('input',{'aria-label':'Custom instrument name',autoFocus:true,required:true,maxLength:96,value:name,onChange:event=>setName(event.currentTarget.value)})]}),
    u.jsx('button',{type:'submit',children:'Save Instrument'}),u.jsx('button',{type:'button',onClick:()=>setOpen(false),children:'Cancel'}),message&&u.jsx('span',{role:'status',children:message})]});
}
