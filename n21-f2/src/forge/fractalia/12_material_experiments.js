/* One complete experimental state, not a recipe that depends on a future tile.
   IndexedDB uses structured clone; portable JSON preserves exact Float32 bytes. */
const __FractaliaExperiments=(()=>{
 let latest=null,lastKey='',warning='';
 function database(){return new Promise((resolve,reject)=>{const r=indexedDB.open('xensonar.fractalia.material-experiments',1);r.onupgradeneeded=()=>r.result.createObjectStore('states');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
 async function io(write,value){const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('states',write?'readwrite':'readonly'),r=write?tx.objectStore('states').put(value,'latest'):tx.objectStore('states').get('latest');let result;r.onsuccess=()=>result=r.result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Experiment save cancelled'))})}finally{db.close()}}
 function capture({atlas,sampleRate,durationSec,previewPitchRatio=1},captured,prepared){
  const state=pe.getState(),snapshot=structuredClone(state.createProjectSnapshot());snapshot.fractaliaInstrument=structuredClone(atlas.recipe);
  return {schema:'xensonar.fractalia-material-experiment',version:1,createdAt:new Date().toISOString(),snapshot,
   resolvedInstrument:{...structuredClone(atlas.recipe),material:structuredClone(atlas.material)},source:structuredClone(captured.runtime.source),prepared:structuredClone(prepared),
   workbench:structuredClone(captured.config),render:{sampleRate,durationSec,previewPitchRatio,tuning:__F3564Master.getSnapshot().tuning,volume:__F3564Master.getSnapshot().volume},
   viewPreferences:null,
   contract:{rendererRevision:atlas.recipe.donor.revision>=3?2:1,reading:'material-relations',mono:true,sourceKey:captured.key}};
 }
 async function freeze(args,captured,prepared,check){
  const key=JSON.stringify([captured.key,__Fractalia.semanticKey(args.atlas.recipe),__f333Signature(args.grid),__f333ReadCarrier(args.grid),args.durationSec,args.sampleRate,args.previewPitchRatio,__F3564Master.getSnapshot()]);
  if(key===lastKey&&latest)return latest;check();const value=capture(args,captured,prepared);await io(true,value);check();latest=value;lastKey=key;warning='';return value;
 }
 function stringify(value){const seen=new WeakMap();let serial=0;return JSON.stringify(value,(key,v)=>{if(ArrayBuffer.isView(v)){if(seen.has(v))return {$pcmRef:seen.get(v)};const id=++serial;seen.set(v,id);const bytes=new Uint8Array(v.buffer,v.byteOffset,v.byteLength);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return {$typed:v.constructor.name,id,base64:btoa(binary)}}return v})}
 function parse(text){const arrays=new Map(),types={Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int32Array};return JSON.parse(text,(key,v)=>{if(v?.$pcmRef){if(!arrays.has(v.$pcmRef))throw Error('Invalid material array reference');return arrays.get(v.$pcmRef)}if(v?.$typed){const Type=types[v.$typed];if(!Type||typeof v.base64!=='string')throw Error('Unsupported material array');const bytes=Uint8Array.from(atob(v.base64),c=>c.charCodeAt(0));if(bytes.byteLength%Type.BYTES_PER_ELEMENT)throw Error('Invalid material array length');const a=new Type(bytes.buffer);arrays.set(v.id,a);return a}return v})}
 function validate(value){
  if(value?.schema!=='xensonar.fractalia-material-experiment'||value.version!==1||![1,2].includes(value.contract?.rendererRevision))throw Error('Unsupported material experiment');
  const r=__Fractalia.core.settings(value.snapshot?.fractaliaInstrument);if(!(r.donor?.revision>=2))throw Error('Choose a Material Relations experiment');
  if(!(value.source?.monoSamples instanceof Float32Array)||!(value.prepared?.samples instanceof Float32Array)||value.source.monoSamples.length>24000000||value.prepared.samples.length>24000000)throw Error('Invalid donor PCM in experiment');
  for(const a of [value.source.monoSamples,value.prepared.samples])for(const n of a)if(!Number.isFinite(n))throw Error('Invalid donor samples');
  if(!Number.isFinite(value.source.sampleRate)||value.source.sampleRate<8000||value.source.sampleRate>192000||!Number.isFinite(value.source.importStartSec)||!Number.isFinite(value.source.importDurationSec)||value.source.importStartSec<0||value.source.importDurationSec<=0||(value.source.importStartSec+value.source.importDurationSec)*value.source.sampleRate>value.source.monoSamples.length+2)throw Error('Invalid donor selection');
  if(!value.snapshot.materialExport||!Number.isFinite(value.render?.sampleRate)||!Number.isFinite(value.render.tuning)||!Number.isFinite(value.render.volume))throw Error('Incomplete experiment timing or render contract');
  return value;
 }
 async function restore(value){
  validate(value);const token=__f333Epoch;
  const model=await kE(value.source);if(token!==__f333Epoch)throw new DOMException('Experiment restore superseded','AbortError');
  const prepared=value.prepared,hybrid=model.hybrid;
  const restored={...model,hybrid:hybrid.sourceGrains?{...hybrid,sourceGrains:{...hybrid.sourceGrains,...prepared}}:{...hybrid,...prepared}};
  __f333Stop();__F341Workbench.withSnapshotRestore(()=>pe.getState().loadProjectSnapshot(value.snapshot));__F341Workbench.restore(value.workbench);
  pe.getState().setSpectralEmbodimentSourceAsset(value.source);const ticket=Vt.beginExtraction(value.source);
  if(!Vt.commitExtraction(ticket,value.source,restored))throw Error('Could not restore experiment donor');
  __F3564Master.set('tuning',value.render.tuning);__F3564Master.set('volume',value.render.volume);
  __ForgeListeningMode.choose('fractalia');latest=value;lastKey='';await io(true,value);await __f333Persistence?.saveNow();return value;
 }
 async function exported(){const value=latest||await io(false);if(!value)throw Error('Play Material Relations once to freeze the complete experiment');return stringify(value)}
 return {freeze,restore,exported,parse,stringify,validate,restoreLast:async()=>{const v=await io(false);if(!v)throw Error('No frozen experiment available');return restore(v)},warning:()=>warning,failed:e=>warning='Experiment backup failed: '+String(e.message||e)};
})();
