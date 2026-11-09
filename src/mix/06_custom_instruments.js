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

/* xen-lazy:canonical */


/* xen-lazy:canonical */


/* xen-lazy:canonical */


/* xen-lazy:canonical */


/* xen-lazy:canonical */

/* ML-PT-01: field clips remain compact editor/source objects. Only a field
   whose imported timbre was explicitly replaced is expanded for execution;
   every backend then prepares all voices instead of one silent/flattened clip. */
function __mlCarrierSliceField(field,startRatio,durationRatio,id){
 if(!field)return null;
 const normalized=Zr(field);if(!normalized.enabled||normalized.bypassed)return normalized;
 const slots={};
 for(const target of ['dynamic-fade','pitch-elastic']){
  const selected=$p(normalized,target),curve=gc(selected,512).resolved;
  const values=Array.from({length:512},(_,index)=>u6(selected,startRatio+durationRatio*index/511,curve));
  slots[target]={edgeHandles:{left:values[0],right:values[511]},deformation:{resolution:512,curve:values,interior:[...values],xOffsets:new Array(512).fill(0),smoothing:0}};
 }
 const current=slots[normalized.interpreterKind==='pitch-elastic'?'pitch-elastic':'dynamic-fade'];
 return {...normalized,id,range:{startRatio:0,endRatio:1},edgeHandles:current.edgeHandles,deformation:current.deformation,targetSlots:slots};
}
function __mlResolveCarrierRequest(request){
 const composer=request.composer;if(!composer?.notes)return request;
 const candidates=composer.notes.filter(note=>note.carrierTransfer?.mode==='last-hearing'&&note.carrierTransfer.instrumentPolicy==='track'&&note.instrumentPresetOverride==null&&note.carrierIntegralTimbre==null&&note.carrierIntegralField?.schemaVersion==='carrier-integral-field-v1');
 if(!candidates.length)return request;
 const targets=new Set(candidates),selected=request.noteId?composer.notes.find(note=>note.id===request.noteId):null;
 const selectedField=selected&&targets.has(selected),sourceNotes=selectedField?[selected]:composer.notes;
 const notes=sourceNotes.flatMap(note=>{
  if(!targets.has(note))return [note];
  const start=Ax(composer,note),duration=F$(composer,note);
  return note.carrierIntegralField.voices.map((voice,index)=>{
   const offset=Math.max(0,Math.min(1,voice.startRatio)),length=Math.max(1e-9,voice.durationRatio),id=note.id+':voice:'+index+':'+voice.id;
   const fields=[...(note.instrumentFields??[]),...(note.localField?[note.localField]:[])].map((field,i)=>__mlCarrierSliceField(field,offset,length,id+':clip:'+i));
   return {...note,id,carrierIntegralField:null,carrierIntegralTimbre:null,instrumentPresetOverride:null,
    startUnit:start+offset*duration,startStep:start+offset*duration,startBeat:null,endBeat:null,
    durationUnits:length*duration,lengthSteps:length*duration,velocity:Math.max(0,Math.min(1,voice.velocity??.75)),
    carrierRelativeSemitones:Number.isFinite(voice.relativeSemitones)?voice.relativeSemitones:0,
    carrierVoiceVolume:Math.max(0,Math.min(1.5,voice.trackVolume??.75)),carrierVoicePan:Number.isFinite(voice.pan)?voice.pan:0,
    localField:voice.localField??null,instrumentFields:fields,carrierSourceVoiceId:voice.voiceId??voice.id,
    carrierGeometryVersion:voice.geometryVersion===1?1:note.carrierGeometryVersion,
    fadeInUnits:0,fadeOutUnits:0,fadeInSteps:0,fadeOutSteps:0,edgeFadeInMs:null,edgeFadeOutMs:null};
  });
 });
 return {...request,composer:{...composer,notes},...(selectedField?{noteId:null,trackIds:[selected.trackId]}:{})};
}
function __mlResolveCustomRequest(request) {
  request=__mlResolveCarrierRequest(request);
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

/* xen-lazy:canonical */

