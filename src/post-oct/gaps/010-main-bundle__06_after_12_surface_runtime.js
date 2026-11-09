        programToken:programKey==null?null:String(programKey)};
    };
    const requested=describe(slot?.id,selected,null);
    const prepared=describe(slot?.ready?.id,slot?.ready?.instrument,slot?.ready?.programKey);
    const holdPrepared=describe(hold?.id,hold?.instrument,null);
    return {lane,desiredId:slot?.id??null,phase:slot?.phase??'idle',error:slot?.error??null,
      requested,prepared,holdPrepared,
      requestedMatchesPrepared:requested&&prepared?requested.acousticKey===prepared.acousticKey:null,
      requestedMatchesHoldPrepared:requested&&holdPrepared?requested.acousticKey===holdPrepared.acousticKey:null,
      preparedProgramReady:!!slot?.ready&&slot?.context===config?.getContext()&&owner?.player===slot.ready.player,
      holdProgramReady:!!hold?.pinned&&hold?.context===config?.getContext()&&owner?.player===hold.player,
      fallbackHeldVoices:[...fallbackHoldVoices.keys()].filter(key=>key.startsWith(lane+':')).length};
  },pcmDiagnostics:()=>({cache:owner?.player?.pcmG2Status?.()??null,capture:owner?.player?.pcmG3Status?.()??null}),options,warmParticleField,warmWaveField,releaseHeld,releaseParticles,releaseLive,releaseFallbackHold,muteFallbackHold,syncHoldClock,stopHoldClocks,endFallbackHoldGesture,dispose,snapshot:()=>{
    const status=owner?.player?.snapshot();if(!status)return null;
    const programs=new Set();for(const slot of lanes.values())if(acceptsGrid(slot,owner?.context)&&slot.gridPrepared)programs.add(slot.gridPrepared);
    return {...status,gridCoverage:preparedGrid?{total:preparedGrid.total,requested:Math.min(2048,preparedGrid.total),limited:preparedGrid.total>2048}:null,
      particleGridCoverage:preparedParticleGrid?{roots:preparedParticleGrid.grid.roots.length,ratios:preparedParticleGrid.ratios.length,total:preparedParticleGrid.frequencies.length}:null,
      gridPrograms:[...programs].map(p=>({wave:!!p.wave,particle:!!p.particle,total:p.total,requested:p.requested,limited:p.total>p.requested}))};
  }});
}
const __XenNodalSurfaces=createNodalSurfaceRuntime({library:__XenNodalLibrary,live:__XenNodalLive,model:__XenNodalModel});
/* XEN_SOUND_RECIPE_BRIDGE_START */
/* Instrument-only diagnostic extraction: explicit user action, read-only.
   No tempo, tuning, hold, pan, playback route, performance or session state. */
if(typeof window!=='undefined')window.__XenSoundRecipeDiagnostics=Object.freeze((()=>{
 function collect(){
  const items=[],payloads=new Map(),warnings=[];
  const add=(kind,key,label,origin,instrument)=>{
   if(!instrument)return;
   try{
    const native=kind==='nodal'?__XenNodalModel.normalize(instrument):normalizeEntrophonInstrument(instrument);
    const json=kind==='nodal'?__XenNodalModel.serialize(native):serializeEntrophonInstrument(native);
    const info=kind==='nodal'?`${native.nodes.length} nodes · ${native.kernelVersion} · ${native.blockedEdges?.length??0} blocked edges`:
      `${native.surface} · ${native.engineVersion} · ${Object.keys(native.config).length} parameters`;
    items.push({key,kind,label,origin,info,name:native.name});payloads.set(key,json);
   }catch(error){warnings.push(label+': '+String(error?.message??error));}
  };
  for(const [lane,label] of [['wave','Wave Starter'],['keyboard','Keyboard'],['particle','Particles']]){
   try{const selected=__XenNodalSurfaces.recipeForLane(lane);
    if(selected)add('nodal','nodal:active:'+lane,label+' · '+selected.instrument.name,'Selected '+label,selected.instrument);
   }catch(error){warnings.push('Nodal '+label+': '+String(error?.message??error));}
  }
  try{
   let draft=__NodalSessionDraft?.instrument??null;
   if(!draft){const raw=localStorage.getItem(__NodalDraftKey);
     if(raw&&raw.length<250000){const saved=JSON.parse(raw);draft=saved?.instrument??null;}}
   if(draft)add('nodal','nodal:draft','Sound Designer draft · '+draft.name,'Unsaved/working draft',draft);
  }catch(error){warnings.push('Nodal draft: '+String(error?.message??error));}
  try{for(const entry of __XenNodalLibrary.list())add('nodal','nodal:saved:'+entry.id+'@'+entry.revision,
    entry.instrument.name+' · rev '+entry.revision,'Saved Nodal library',entry.instrument);
  }catch(error){warnings.push('Nodal library: '+String(error?.message??error));}
  for(const [surface,label] of [['wave','Wave Starter'],['particle','Particles'],['spectral','Spectral']]){
   try{const instrument=captureEntrophonInstrument('Current '+label,surface);
     add('entrophon','entrophon:current:'+surface,label+' · current sound','Live Entrophon editor',instrument);
   }catch(error){warnings.push('Entrophon '+label+': '+String(error?.message??error));}
  }
  try{for(const entry of __XenEntrophonLibrary.list())add('entrophon','entrophon:saved:'+entry.id+'@'+entry.revision,
    entry.instrument.name+' · rev '+entry.revision,'Saved Entrophon library',entry.instrument);
  }catch(error){warnings.push('Entrophon library: '+String(error?.message??error));}
  return {items,payloads,warnings};
 }
 function soundPath(){
   const lanes={};
   for(const lane of ['keyboard','wave'])lanes[lane]=__XenNodalSurfaces.debugRecipeFlow(lane);
   const noteTrace=__XenNodalSurfaces.traceSnapshot();
   const saved=__XenNodalLibrary.list().map(e=>{
     const key=__XenNodalModel.semanticKey(e.instrument);
     return {id:'nodal:'+e.id+'@'+e.revision,name:e.instrument.name,revision:e.revision,
       kernelVersion:e.instrument.kernelVersion,nodeCount:e.instrument.nodes.length,
       material:e.instrument.material??null,acousticKey:key};
   });
   let draft=null;
   try{const raw=__NodalSessionDraft??JSON.parse(localStorage.getItem(__NodalDraftKey)||'null');
     if(raw?.instrument){const instrument=__XenNodalModel.normalize(raw.instrument);
       draft={name:instrument.name,kernelVersion:instrument.kernelVersion,
         nodeCount:instrument.nodes.length,material:instrument.material??null,
         acousticKey:__XenNodalModel.semanticKey(instrument)};}
   }catch(e){draft={error:String(e?.message??e)};}
   return {schema:'xensonar-nodal-sound-path-diagnostic-v1',
     explanation:'Read-only snapshot. Keyboard selection, prepared Nodal program and Hold preparation. Does not prove physical speaker output; no BPM/hold pattern or other session state.',
     lanes,saved,draft,noteTrace,comparison:(()=>{
       const keyboardEvents=noteTrace.events.filter(e=>e.lane==='keyboard'&&e.voiceId);
       const single=[...keyboardEvents].reverse().find(e=>e.playType==='single-note');
       const thunder=[...keyboardEvents].reverse().find(e=>e.playType==='thunder-clock');
       return {single:single??null,thunder:thunder??null,
         sameRecipe:single&&thunder?single.identity?.semanticKey===thunder.identity?.semanticKey:null,
         sameProgram:single&&thunder?single.programKey===thunder.programKey:null,
         explanation:'A same-recipe result with different sound suggests articulation/PCM/clock processing, not lost instrument settings. Submitted events do not prove speaker output.'};
     })()};
 }
 return Object.freeze({
  list:()=>{const {items,warnings}=collect();return {schema:'xensonar-instrument-recipe-inventory-v1',items,warnings};},
  archive:()=>{
   // Exact native recipe JSON, collected only when the user requests a Runtime ZIP.
   // No BPM, performance state, storage writes or PCM renders.
   const {items,payloads,warnings}=collect();
   return {schema:'xensonar-runtime-instrument-recipes-v1',
     note:'Canonical instrument recipes. A selected instrument, draft and saved revision may differ. No EQ, BPM, Hold, or performance snapshots are merged into sound recipes.',
     items:items.map(item=>({...item,recipe:JSON.parse(payloads.get(item.key))})),warnings};
  },
  soundPath,
  traceControl:command=>__XenNodalSurfaces.traceControl(command),
  read:key=>{const {payloads}=collect();const json=payloads.get(key);
    if(!json)throw Error('Instrument not found or changed. Refresh the list.');return json;}
 });
})());
/* XEN_SOUND_RECIPE_BRIDGE_END */

// On-demand diagnostic inspection only; no permanent UI polling or new audio work.
if(typeof globalThis!=='undefined')globalThis.XenSonarSourceSlots=()=>({
  wave:__XenNodalSurfaces.selectionStatus('wave'),
  keyboard:__XenNodalSurfaces.selectionStatus('keyboard'),
  particle:__XenNodalSurfaces.selectionStatus('particle'),
  pcm:__XenNodalSurfaces.pcmDiagnostics?.()??null });
