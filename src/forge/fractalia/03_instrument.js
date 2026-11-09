/* A single recipe owns the active instrument, its identity and modified state.
   Capture/save-from-drawing ALWAYS captures the drawing. Save-active NEVER does.
   Library writes commit before UI/audio state; a failed write preserves work. */
const __Fractalia=(()=>{
 const core=createFractaliaInstrumentCore(),MACHINE='fractalia-self-carrier',STORAGE='xensonar.fractalia.f4',LIBRARY='xensonar.fractalia.instruments.v4',SLOTS='xensonar.fractalia.compare.f433';
 const listeners=new Set(),jobs=createFractaliaCompileJobs(args=>(args.captureResolution?createFractaliaInstrumentCore({resolution:args.captureResolution}):core).compile(args));let recipe=core.settings(),revision=0,lastAtlas=null,lastOverlay=null,lastError=null,warning='',library=[],unreadEntries=[],libraryDamaged=false;
 try{const raw=JSON.parse(localStorage.getItem(LIBRARY)||localStorage.getItem('xensonar.fractalia.instruments.v3')||localStorage.getItem('xensonar.fractalia.instruments.v2')||'[]');if(!Array.isArray(raw))throw Error('Invalid library');
  library=raw.flatMap(item=>{try{const r=core.importInstrument(item),id=String(item.id);if(!id||id==='undefined')throw Error();return [{id,name:r.name,schema:'xensonar.fractalia-instrument',version:r.version,engine:r.engine,recipe:core.settings({...r,instrumentId:id})}]}catch{unreadEntries.push(item);warning='Some unsupported entries cannot be opened. They are retained in the library.';return []}});
 }catch{libraryDamaged=true;warning='The saved instrument library could not be read. The previous storage has been retained.'}
 try{const raw=JSON.parse(localStorage.getItem(STORAGE)||localStorage.getItem('xensonar.fractalia.f3')||localStorage.getItem('xensonar.fractalia.f2')||'null');if(raw){recipe=core.settings(raw);if(!recipe.material)recipe=core.settings({...recipe,material:null});else if(!recipe.instrumentId){const match=library.find(e=>soundKey(e.recipe)===soundKey(recipe)&&e.name===recipe.name);if(match)recipe=core.settings({...recipe,instrumentId:match.id})}}}catch{warning='The last active instrument could not be restored. Saved library entries remain available.'}
 // Two persistent listening variants, separate from saved instrument presets.
 // A slot keeps the full working recipe. PCM lives only in the bounded hearing cache.
 const slots={A:null,B:null};
 try{const saved=JSON.parse(localStorage.getItem(SLOTS)||'null');if(saved?.version===1)for(const letter of ['A','B']){
  const item=saved[letter];if(item?.recipe)slots[letter]={recipe:core.settings(item.recipe),donorKey:item.donorKey??null};
 }}catch{warning='Comparison slots could not be restored; the instrument library is unaffected.'}
 function slotState(){const out={};for(const letter of ['A','B']){const value=slots[letter];out[letter]=value?{name:value.recipe.name,version:value.recipe.version,active:soundKey(value.recipe)===soundKey(recipe)}:null}return out}
 function storeSlot(letter){if(!['A','B'].includes(letter))throw Error('Unknown comparison slot');
  const item={recipe,donorKey:recipe.donor&&typeof fractaliaDonorSnapshot==='function'?fractaliaDonorSnapshot().key:null};
  slots[letter]=item;
  try{localStorage.setItem(SLOTS,JSON.stringify({version:1,...slots}));warning=''}catch{warning='A/B variant held in this session, but storage is full. Export the experiment for a permanent backup.'}
  notify();return slotState()[letter];
 }
 async function recallSlot(letter){const item=slots[letter];if(!item)throw Error('Comparison slot '+letter+' is empty');
  if(item.recipe.donor&&item.donorKey!==null&&typeof fractaliaDonorSnapshot==='function'&&fractaliaDonorSnapshot().key!==item.donorKey)
   throw Error('Slot '+letter+' needs its original donor. Restore the frozen experiment before comparing.');
  const next=set(item.recipe);await flushWorkspace();return next;
 }
 // The instrument selector changes ONLY the source material; the active F3/F4
 // reading, processing parameters and donor link remain the common test rig.
 // Explicit Load Original remains available to retrieve the complete preset.
 function combinedInstrument(input,id){const target=core.settings(input);
  if(!target.material||target.material.version===2||recipe.version===2)
   throw Error('This legacy F2 instrument cannot share the current F3/F4 processing. Use Original preset instead.');
  const base=core.convert(target,recipe.version);
  return core.settings({...base,name:target.name,instrumentId:id,params:recipe.params,
   ...(recipe.version===4?{compilerRevision:recipe.compilerRevision,...(recipe.donor?{donor:recipe.donor}:{})}:{})});
 }
 async function compareInstrument(id){const entry=library.find(x=>x.id===id);if(!entry)throw Error('Instrument not found');
  const next=set(combinedInstrument(entry.recipe,id));await flushWorkspace();return next;
 }
 async function compareExample(kind){const source=core.example(kind,recipe.version===3?3:4);
  const next=set(combinedInstrument(source,null));await flushWorkspace();return next;
 }
 function soundKey(input){const r=core.settings(input);return JSON.stringify({engine:r.engine,version:r.version,compilerRevision:r.compilerRevision,timeModel:r.timeModel,params:r.params,material:r.material,donor:r.donor})}
 const snapshot=()=>recipe,semanticKey=soundKey,subscribe=fn=>(listeners.add(fn),()=>listeners.delete(fn));
 function notify(){for(const fn of listeners)try{fn()}catch(error){console.warn('[Fractalia] View update',error)}}
 function libraryState(){const active=library.find(e=>e.id===recipe.instrumentId);return {activeId:active?.id||'',modified:!!active&&(soundKey(active.recipe)!==soundKey(recipe)||active.name!==recipe.name),saved:!!active,warning}}
 function apply(next,{invalidate=true}={}){
  const audioChanged=soundKey(next)!==soundKey(recipe);recipe=next;lastError=null;
  if(audioChanged){revision++;lastAtlas=null;lastOverlay=null;if(invalidate&&typeof pe!=='undefined'&&pe.getState&&pe.getState().carrierIntegralSelection?.machineId===MACHINE){__f333Stop();pe.setState({...__f333Idle(),renderVersion:(pe.getState().renderVersion||0)+1,audioBufferDirty:true})}}
  if(invalidate&&typeof __f333Persistence!=='undefined')__f333Persistence?.scheduleSave?.();
  notify();return recipe;
 }
 async function flushWorkspace(){try{if(typeof __f333Persistence!=='undefined'&&__f333Persistence?.status().restoreComplete){const result=await __f333Persistence.saveNow();if(result===false)throw Error('Workspace not saved');warning='';notify();return result}return false}catch(error){warning='Instrument retained. Workspace backup failed; save the project again.';notify();return false}}
 function set(input,options={}){const next=core.settings(input);if(JSON.stringify(next)===JSON.stringify(recipe))return recipe;localStorage.setItem(STORAGE,JSON.stringify(next));return apply(next,options)}
 function commit(next,updated){
  if(libraryDamaged)throw Error('The existing library could not be read and will not be overwritten. Export the active instrument to a file.');
  const previous=localStorage.getItem(LIBRARY);localStorage.setItem(LIBRARY,JSON.stringify([...updated,...unreadEntries]));
  try{localStorage.setItem(STORAGE,JSON.stringify(next))}catch(error){try{if(previous===null)localStorage.removeItem(LIBRARY);else localStorage.setItem(LIBRARY,previous)}catch{}throw Error('Instrument could not be saved: browser storage is full or unavailable. Export the active instrument as a file.')}
  library=updated;return apply(next);
 }
 function source(grid,durationSec,pitchRatio=1){
  const doc=__f333ReadCarrier(grid),boundaries=[];let tracks=[];try{tracks=__Emilia.carrierTracks(grid,durationSec,pitchRatio)}catch{}
  if(!tracks.length&&!doc?.notes?.length)tracks=__paintedCarrierTracks(grid,durationSec,pitchRatio);
  if(doc)for(let i=0;i<doc.notes.length;i++){const n=doc.notes[i],start=n.startBeat/doc.durationBeats*durationSec,end=(n.startBeat+n.durationBeats)/doc.durationBeats*durationSec;boundaries.push(start/durationSec,end/durationSec);
   if(tracks[i]){tracks[i].startSec=start;tracks[i].endSec=end;tracks[i].eventId=n.id??String(i);tracks[i].guardAt=t=>Math.min(1,n.fadeInBeats>0?1:Math.max(0,(t-start)/.0005),n.fadeOutBeats>0?1:Math.max(0,(end-t)/.0005))}}
  return {tracks,boundaries};
 }
 async function atlasFor({grid,durationSec,instrument=recipe,onProgress,check=()=>{},signal,priority=1,captureResolution}){
  const r=core.settings(instrument),key=r.material?soundKey(r):soundKey(r)+':'+__f333Signature(grid)+':'+JSON.stringify(__f333ReadCarrier(grid))+':'+(captureResolution||'standard');check();
  const data=r.material?{}:source(grid,durationSec);
  const atlas=await jobs.request(key,{...data,grid,durationSec,instrument:r,captureResolution},{check,onProgress,signal,priority});
  check();lastAtlas=atlas;onProgress?.(1);return atlas;
 }
 async function renderCarrier({grid,durationSec,previewPitchRatio=1,instrument=recipe,onProgress,signal,diagnostics,preparedDonorKey}){
  // Resolve a valid purple Sound Material mask lazily, before fixing the render identity.
  // In Fractalia this is material acquisition, not a command to change listening modes.
  if(instrument.donor&&(preparedDonorKey===undefined||preparedDonorKey!==fractaliaDonorSnapshot().key))await __f3562EnsureDonor();
  const donorKey=instrument.donor?fractaliaDonorSnapshot().key:null;
  const epoch=revision,transport=__f333Epoch,check=()=>{if(signal?.aborted||epoch!==revision||transport!==__f333Epoch||donorKey!==null&&fractaliaDonorSnapshot().key!==donorKey)throw new DOMException('Fractalia render cancelled','AbortError')};
  try{lastError=null;const atlas=await atlasFor({grid,durationSec,instrument,onProgress:p=>onProgress?.(p*.12),check,signal,priority:3}),data=source(grid,durationSec,previewPitchRatio),ctx=xt.getContext();
   const args={...data,grid,durationSec,previewPitchRatio,instrument,atlas,diagnostics,sampleRate:ctx.sampleRate,onProgress:p=>onProgress?.(.12+.88*p),check};
   const result=atlas.recipe.donor?await (atlas.recipe.donor.revision>=2?__FractaliaMaterialRuntime.render(args):renderFractaliaDonorPCM(args)):await core.renderPCM(args);check();
   const buffer=ctx.createBuffer(1,result.left.length,result.sampleRate);buffer.copyToChannel(result.left,0);

   return buffer;
  }catch(error){if(error?.name!=='AbortError'){lastError=String(error.message||error);notify()}throw error}
 }
 const libraryEntries=()=>library.map(({id,name,recipe:r})=>({id,name,version:r.version,legacy:r.version===2}));
 function preset(input=recipe){const r=core.settings(input);if(!r.material)throw Error('Capture or load an instrument first');return {schema:'xensonar.fractalia-instrument',version:r.version,engine:r.engine,name:r.name,recipe:r}}
 const newId=()=>typeof crypto!=='undefined'&&crypto.randomUUID?'fractalia-'+crypto.randomUUID():'fractalia-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
 async function fromDrawing({grid,durationSec,name=recipe.name,resolution='standard'}){
  const generation=revision,signature=__f333Signature(grid),drawVersion=pe.getState().renderVersion,params=recipe.params,target=recipe.version===2?4:recipe.version;
  const check=()=>{if(revision!==generation||pe.getState().renderVersion!==drawVersion)throw new DOMException('Drawing or instrument changed during capture','AbortError')};
  const input=core.settings({version:target,name:name.trim()||'Spectral Instrument',params,...recipe.donor?{compilerRevision:recipe.compilerRevision,donor:recipe.donor}:{}});
  const atlas=await atlasFor({grid,durationSec,instrument:input,check,captureResolution:resolution,priority:2});
  check();if(__f333Signature(grid)!==signature)throw new DOMException('Drawing changed during capture','AbortError');return core.settings({...atlas.recipe,name:input.name,material:atlas.material});
 }
 async function pinDrawing(args){const next=set(await fromDrawing(args));await flushWorkspace();return next}
 async function saveInstrument(args){
  if(library.length+unreadEntries.length>=48)throw Error('The library has 48 instruments. Export and remove an entry before saving another.');
  const next=core.settings({...await fromDrawing(args),instrumentId:newId()}),entry={...preset(next),id:next.instrumentId};commit(next,[entry,...library]);await flushWorkspace();return entry.id;
 }
 async function saveActiveInstrument({name=recipe.name}={}){
  if(!recipe.material)throw Error('Capture or load an instrument first');const index=library.findIndex(e=>e.id===recipe.instrumentId);
  if(index<0&&library.length+unreadEntries.length>=48)throw Error('The library has 48 instruments. Export and remove an entry first.');
  const next=core.settings({...recipe,name:name.trim()||'Spectral Instrument',instrumentId:index>=0?recipe.instrumentId:newId()}),entry={...preset(next),id:next.instrumentId},updated=library.slice();if(index>=0)updated[index]=entry;else updated.unshift(entry);commit(next,updated);await flushWorkspace();return next.instrumentId;
 }
 async function loadInstrument(id){const entry=library.find(x=>x.id===id);if(!entry)throw Error('Instrument not found');const next=set({...entry.recipe,instrumentId:id});await flushWorkspace();return next}
 async function removeInstrument(id){const updated=library.filter(x=>x.id!==id),next=recipe.instrumentId===id?core.settings({...recipe,instrumentId:null}):recipe;commit(next,updated);await flushWorkspace()}
 async function importInstrument(input){const next=set({...core.importInstrument(input),instrumentId:null});await flushWorkspace();return next}
 async function loadExample(kind){const example=core.example(kind,recipe.version===3?3:4);const next=set(recipe.donor?{...example,compilerRevision:recipe.compilerRevision,donor:recipe.donor}:example);await flushWorkspace();return next}
 async function followDrawing(){const next=set({version:recipe.version===2?4:recipe.version,name:recipe.name,params:recipe.params,...recipe.donor?{compilerRevision:recipe.compilerRevision,donor:recipe.donor}:{}});await flushWorkspace();return next}
 async function changeReading(version){const next=set(core.convert(recipe,version));await flushWorkspace();return next}
 async function bindDonor(enabled,reading='material-relations'){if(recipe.version!==4)throw Error('Choose Relational F4 first');const {donor,...base}=recipe;
  const binding=reading==='material-flow'?{mode:'tile',reading,revision:1,amount:.65}:{mode:'tile',reading:'material-relations',revision:3,recombine:.9,layers:2,amount:.9,warp:.8,exchange:.7,axis:'energy',pitchReference:'measured',evolutionSec:6};
  const next=set({...base,...enabled&&donor?.revision===2&&binding.revision===3?{instrumentId:null}:{},compilerRevision:enabled?(binding.revision>=3?4:binding.revision===2?3:2):1,...enabled?{donor:binding}:{}});await flushWorkspace();return next}
 function loadProject(input){if(input==null)return;set(core.settings(input),{invalidate:false})}
 return Object.freeze({MACHINE,core,snapshot,semanticKey,set,subscribe,bindDonor,changeReading,compareInstrument,compareExample,storeSlot,recallSlot,slotState,jobStats:jobs.stats,source,atlasFor,renderCarrier,preset,loadProject,libraryEntries,libraryState,saveInstrument,saveActiveInstrument,pinDrawing,loadExample,followDrawing,loadInstrument,removeInstrument,importInstrument,
  getLastAtlas:()=>lastAtlas,lastError:()=>lastError,overlayRecord:args=>lastOverlay?.key===__f333Signature(args.spectralData)?lastOverlay:null,spectrumFor:grid=>lastOverlay?.key===__f333Signature(grid)?lastOverlay:null});
})();

/* xen-lazy:lab */


/* xen-lazy:lab */

