/* P4A: portable sound definitions, not a second preset library.
   The existing Melodic project will own these immutable recipes. Runtime nodes,
   routes and the current slot's enabled state are deliberately not persisted. */
const __EntrophonDefinitions = new WeakSet();
function normalizeEntrophonInstrument(value) {
  if(value&&__EntrophonDefinitions.has(value))return value;
  if(!value||value.schema!=='xensonar.entrophon-instrument'||value.schemaVersion!==1||value.engineVersion!=='c11-v1')throw new Error('Unsupported Entrophon instrument');
  if(!['wave','particle','spectral'].includes(value.surface))throw new Error('Invalid Entrophon sound origin');
  if(typeof value.name!=='string'||!value.name.trim()||value.name.trim().length>100)throw new Error('Entrophon instrument needs a name (1–100 characters)');
  if(!value.config||typeof value.config!=='object'||Array.isArray(value.config))throw new Error('Missing Entrophon sound definition');
  for(const [key,item] of Object.entries(value.config)){
    if(!Object.hasOwn(ES[value.surface],key))throw new Error('Unknown Entrophon parameter: '+key);
    if(typeof item==='number'&&!Number.isFinite(item))throw new Error('Invalid Entrophon parameter: '+key);
    if(typeof item!==typeof ES[value.surface][key])throw new Error('Invalid Entrophon parameter type: '+key);
  }
  // Slot activation is an input-routing concern. A captured instrument is active.
  const config=Object.freeze(zA(value.surface,{...value.config,enabled:true}));
  const result=Object.freeze({schema:'xensonar.entrophon-instrument',schemaVersion:1,engineVersion:'c11-v1',name:value.name.trim(),surface:value.surface,config});
  __EntrophonDefinitions.add(result);return result;
}
function captureEntrophonInstrument(name,surface='wave') {
  if(!['wave','particle','spectral'].includes(surface))throw new Error('Invalid Entrophon sound origin');
  return normalizeEntrophonInstrument({schema:'xensonar.entrophon-instrument',schemaVersion:1,engineVersion:'c11-v1',name,surface,config:Ew(surface)});
}
function serializeEntrophonInstrument(value){return JSON.stringify(normalizeEntrophonInstrument(value));}
function deserializeEntrophonInstrument(text){
  if(typeof text!=='string'||text.length>20000)throw new Error('Entrophon instrument exceeds size limit');
  return normalizeEntrophonInstrument(JSON.parse(text));
}
function resolveEntrophonInstrument(value,note) {
  const instrument=normalizeEntrophonInstrument(value);
  if(!note||!Number.isFinite(note.freq)||note.freq<10||note.freq>24000)throw new Error('Invalid Entrophon note frequency');
  for(const key of ['rootFreq','tuningStrength','unison','detuneCents','filterFreq','filterQ']){
    if(note[key]!==undefined&&!Number.isFinite(note[key]))throw new Error('Invalid Entrophon note parameter: '+key);
  }
  if(note.pitchPolicy!==undefined&&!['note','instrument'].includes(note.pitchPolicy))throw new Error('Invalid Entrophon pitch policy');
  // Composition frequencies already carry the intended microtonal tuning.
  // Compatibility tuning is explicit; never silently snap a Melodic note again.
  const tuning=note.pitchPolicy==='instrument'?{}:{tuningStrength:0};
  return dT({...note,...tuning,surface:instrument.surface,forceEnabled:true},instrument.config);
}
