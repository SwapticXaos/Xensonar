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
function FractaliaMaterialImage({material}){
 const ref=P.useRef(null);P.useEffect(()=>{const canvas=ref.current;if(!canvas)return;const ctx=canvas.getContext('2d');ctx.fillStyle='#081b1b';ctx.fillRect(0,0,288,96);if(!material)return;
  if(material.version===3){const {field,columns,rows}=material;for(let x=0;x<columns;x++)for(let y=0;y<rows;y++){const value=Math.sqrt(field[x*rows+y]);if(value<=0)continue;ctx.fillStyle=`rgba(94,234,212,${value})`;ctx.fillRect(x/columns*288,96-(y+1)/rows*96,Math.ceil(288/columns),Math.ceil(96/rows))}}
  else{ctx.strokeStyle='#5eead4';ctx.beginPath();material.contour.forEach((v,i)=>{const x=i/(material.contour.length-1)*288,y=48-v*40;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke()}
 },[material]);return P.createElement('canvas',{ref,width:288,height:96,'data-fractalia-template':material?.version||'none','aria-label':'Active instrument sound-colour template',style:{width:'100%',height:96,display:'block',border:'1px solid #285a51',borderRadius:4}});
}
function FractaliaForgeLab(){
 const h=P.createElement,[recipe,setRecipe]=P.useState(__Fractalia.snapshot),[atlas,setAtlas]=P.useState(null),[captureDetail,setCaptureDetail]=P.useState('standard'),[preparing,setPreparing]=P.useState(false),[busy,setBusy]=P.useState(false),[error,setError]=P.useState(''),[status,setStatus]=P.useState(''),[name,setName]=P.useState(recipe.name),[tick,refresh]=P.useReducer(v=>v+1,0),file=P.useRef(null);
 const grid=pe(s=>s.spectralData),version=pe(s=>s.renderVersion),material=pe(s=>s.materialExport),duration=material.bars*(material.beatsPerBar||4)*60/material.bpm,session=__Fractalia.libraryState(),entries=__Fractalia.libraryEntries(),slots=__Fractalia.slotState(),legacy=recipe.version===2;
 P.useEffect(()=>Vt.subscribe(()=>refresh()),[]);
 P.useEffect(()=>__Fractalia.subscribe(()=>{setRecipe(__Fractalia.snapshot());refresh()}),[]);
 P.useEffect(()=>{setName(recipe.name)},[recipe.name]);
 P.useEffect(()=>{let active=true;const controller=new AbortController();setPreparing(true);setAtlas(null);__Fractalia.atlasFor({grid,durationSec:duration,instrument:recipe,signal:controller.signal,priority:0,check:()=>{if(!active)throw new DOMException('Cancelled','AbortError')}}).then(a=>{if(active){setAtlas(a);setPreparing(false)}}).catch(e=>{if(active){setPreparing(false);if(e.name!=='AbortError'&&recipe.material)setError(e.message)}});return()=>{active=false;controller.abort()}},[grid,version,duration,recipe]);
 const run=async fn=>{setError('');setStatus('');setBusy(true);try{await fn()}catch(e){setError(e.name==='QuotaExceededError'?'Browser storage is full. Export the instrument to a file.':e.name==='AbortError'?'Cancelled: the drawing or instrument changed.':e.message)}finally{setBusy(false)}};
 const materialMode=recipe.donor?.revision>=2;
 const edit=(key,value)=>run(async()=>__Fractalia.set({...recipe,params:{...recipe.params,[key]:value}})),modified=session.modified||name!==recipe.name;
 const button={type:'button',className:'rounded border border-teal-800 bg-teal-950/40 px-2 py-2 text-[11px] text-teal-100 disabled:opacity-40'};
 return h('section',{'data-fractalia-lab':'f3','data-fractalia-engine':recipe.version,style:{padding:'8px 0',color:'#d1fae5',minWidth:0}},
  h('strong',null,'FRACTALIA · Compare & Cache F4.3.3'),h('p',{style:{fontSize:11,lineHeight:1.5,color:'#a7b8b3',margin:'6px 0'}},'Capture a drawing as sound colour. Load that instrument to play any melody drawing.'),
  h('div',{'data-fractalia-material-mode':recipe.material?'instrument':'drawing',style:{border:'1px solid #285a51',padding:8,borderRadius:5,fontSize:11,background:recipe.material?'#13312d':'#101f24'}},
   h('strong',null,recipe.material?'Instrument geometry: '+recipe.name:'Instrument geometry: Follow current drawing'),recipe.material?.rows===256&&h('span',{style:{marginLeft:6,color:'#99f6e4'}},'· Fine capture'),
   h('div',{'data-fractalia-save-state':session.saved?modified?'modified':'saved':recipe.material?'unsaved':'drawing',style:{color:'#a7b8b3',marginTop:3}},recipe.material?(session.saved?(modified?'Unsaved instrument changes':'Saved instrument'):'Captured / imported · not yet saved')+(legacy?' · Legacy F2 sound':recipe.version===4?' · Relational F4':' · Spectral F3'):'Draw → capture → replace the melody → play'),
   h('div',{style:{marginTop:6}},h(FractaliaMaterialImage,{material:recipe.material||atlas?.material})),
   h('div',{style:{fontSize:10,color:'#a7b8b3',marginTop:4}},recipe.material?'Stored instrument drawing · Carrier: current main drawing / composition':'Instrument follows current drawing · Carrier: same current drawing')),
  h('div',{style:{display:'flex',flexWrap:'wrap',gap:10,alignItems:'center',marginTop:8}},
   h('label',{style:{fontSize:11}},'Reading ',h('select',{'aria-label':'Fractalia reading',disabled:busy||legacy,value:recipe.version,onChange:e=>run(async()=>{await __Fractalia.changeReading(+e.target.value);setStatus('New interpretation active. Save Active Instrument keeps a separate copy.')}),className:'rounded border border-teal-800 bg-neutral-900 p-1'},...[[4,'Relational F4'],[3,'Spectral F3'],...legacy?[[2,'Legacy F2']]:[]].map(([id,label])=>h('option',{key:id,value:id},label)))),
   h('label',{style:{fontSize:11}},'Body ',h('select',{'aria-label':'Fractalia Body',disabled:busy,value:recipe.params.body,onChange:e=>edit('body',e.target.value),className:'rounded border border-teal-800 bg-neutral-900 p-1'},...['prism','reed','hollow'].map(v=>h('option',{key:v,value:v},v[0].toUpperCase()+v.slice(1))))),
   !materialMode&&h('label',{style:{fontSize:11}},'Depth ',h('select',{'aria-label':'Fractalia Depth',disabled:busy,value:recipe.params.depth,onChange:e=>edit('depth',+e.target.value),className:'rounded border border-teal-800 bg-neutral-900 p-1'},...[0,1,2,3,4].map(v=>h('option',{key:v,value:v},v)))),
   ...(materialMode?[['motion','Motion',1]]:[['fold','Fold',1.5],['brightness','Brightness',1],['motion','Motion',1],...legacy?[]:[['geometry','Drawn Spacing',1]]]).map(([key,label,max])=>h('label',{key,title:key==='geometry'?'Blend harmonic alignment with the template’s geometric partial spacing':undefined,style:{fontSize:11,display:'flex',gap:5,alignItems:'center'}},label,h('input',{type:'range','aria-label':'Fractalia '+label,min:0,max,step:.05,value:recipe.params[key],onChange:e=>edit(key,+e.target.value),style:{width:85}}),recipe.params[key].toFixed(2)))),
  recipe.version===4&&h('div',{'data-fractalia-donor':true,style:{padding:8,marginTop:8,border:'1px solid #285a51',borderRadius:5,fontSize:11,minHeight:140,overflowWrap:'anywhere'}},
   h('label',null,'Sound source ',h('select',{'aria-label':'Fractalia sound source',style:{maxWidth:'100%',display:'block',minWidth:0},value:!recipe.donor?'internal':materialMode?'material':'donor',disabled:busy,onChange:e=>run(()=>__Fractalia.bindDonor(e.target.value!=='internal',e.target.value==='donor'?'material-flow':'material-relations')),className:'rounded border border-teal-800 bg-neutral-900 p-1'},h('option',{value:'internal'},'Fractalia synthesis'),h('option',{value:'material'},'Current cached donor · Material Relations'),h('option',{value:'donor'},'Current cached donor · Motion 2 pilot'))),
   h('p',{'data-fractalia-source-state':true},recipe.donor?(fractaliaDonorSnapshot().ready?'Current cached donor: '+fractaliaDonorSnapshot().name:'Current cached donor: not prepared'):'Audio source: Fractalia synthesis'),
   recipe.donor&&h('div',null,h('p',null,materialMode?'Material Relations · source-only · mono. Uses the prepared PCM and region mask. Other Donor presets are independent.':'Motion 2 pilot · fixed reading; other Donor presets are independent · mono.'),
    h('label',null,'Ecology ',h('input',{'aria-label':'Fractalia donor ecology',type:'range',min:0,max:1,step:.05,value:recipe.donor.amount,onChange:e=>run(()=>__Fractalia.set({...recipe,donor:{...recipe.donor,amount:+e.target.value}}))}),recipe.donor.amount.toFixed(2))),
   materialMode&&recipe.donor.revision===2&&h('button',{...button,disabled:busy,onClick:()=>run(async()=>{await __Fractalia.bindDonor(true);setStatus('New recombination interpretation active. Save Active Instrument keeps a separate copy.')})},'Enable new recombination'),
   materialMode&&h('div',{'data-fractalia-material-controls':true},
    ...[['warp','Elastic spacing'],['exchange','Family distribution']].map(([key,label])=>h('label',{key,style:{display:'block',marginTop:6}},label,h('input',{'aria-label':'Fractalia '+label,type:'range',min:0,max:1,step:.05,value:recipe.donor[key],onChange:e=>run(()=>__Fractalia.set({...recipe,donor:{...recipe.donor,[key]:+e.target.value}}))}),recipe.donor[key].toFixed(2))),
    recipe.donor.revision>=3&&h('div',null,
     h('label',{style:{display:'block',marginTop:6}},'Recombination ',h('input',{'aria-label':'Fractalia Recombination',type:'range',min:0,max:1,step:.05,value:recipe.donor.recombine,onChange:e=>run(()=>__Fractalia.set({...recipe,donor:{...recipe.donor,recombine:+e.target.value}}))}),recipe.donor.recombine.toFixed(2)),
     h('label',null,'Structure levels ',h('select',{'aria-label':'Fractalia structure levels',value:recipe.donor.layers,onChange:e=>run(()=>__Fractalia.set({...recipe,donor:{...recipe.donor,layers:+e.target.value}}))},h('option',{value:1},'One · family'),h('option',{value:2},'Two · family + internal')))),
    h('label',null,'Material axis ',h('select',{'aria-label':'Fractalia material axis',style:{maxWidth:'100%',display:'block'},value:recipe.donor.axis,onChange:e=>run(()=>__Fractalia.set({...recipe,donor:{...recipe.donor,axis:e.target.value}}))},...[["energy","Material energy"],["absolute","Absolute Hz · 20–20000"],["relative","Harmonic reference · 6 octaves"]].map(([id,label])=>h('option',{key:id,value:id},label)))),
    h('label',{style:{display:'block',marginTop:6}},'Pitch anchor ',h('select',{'aria-label':'Fractalia pitch anchor',style:{maxWidth:'100%',display:'block'},value:recipe.donor.pitchReference,onChange:e=>run(()=>__Fractalia.set({...recipe,donor:{...recipe.donor,pitchReference:e.target.value}}))},h('option',{value:'measured'},'Lowest strong donor peak'),h('option',{value:'neutral'},'Raw donor reference · 220 Hz'))),
    h('label',{style:{display:'block',marginTop:6}},'Evolution seconds ',h('input',{'aria-label':'Fractalia evolution seconds',type:'number',min:.2,max:60,step:.2,value:recipe.donor.evolutionSec,onChange:e=>run(()=>__Fractalia.set({...recipe,donor:{...recipe.donor,evolutionSec:+e.target.value}})),style:{width:65}})),
    h('p',{'data-fractalia-material-report':true},__FractaliaMaterialRuntime.getReport()?(__FractaliaMaterialRuntime.getReport().richness===0?'Sparse donor: no structural deformation is inferred.':'Measured donor material drives spacing and distribution.'):'Play to analyze this donor. Ecology 0 uses the same phase transport as the deformed sound.'),
    h('p',{'data-fractalia-live-audio':true,style:{color:'#a7b8b3'}},'Live transfer: prepared audio. Root Follow and Melodic Loop receive the rendered sound; keep the experiment to edit and render again.'),
    h('div',{style:{display:'flex',gap:6,flexWrap:'wrap'}},h('button',{...button,disabled:busy,onClick:()=>run(async()=>{const json=await __FractaliaExperiments.exported();rP(new Blob([json],{type:'application/json'}),'Fractalia_Material_Experiment.json');setStatus('Frozen donor, instrument, Carrier and timing exported.')})},'Export Frozen Experiment'),
     h('button',{...button,disabled:busy,onClick:()=>run(async()=>{await __FractaliaExperiments.restoreLast();setStatus('Frozen experiment restored.')})},'Restore Last Experiment'),
     h('label',{...button},'Import Experiment',h('input',{type:'file',accept:'.json',style:{display:'none'},'aria-label':'Import Fractalia experiment',onChange:e=>{const f=e.target.files?.[0];e.target.value='';if(f)void run(async()=>{if(f.size>128*1024*1024)throw Error('Experiment exceeds 128 MiB');await __FractaliaExperiments.restore(__FractaliaExperiments.parse(await f.text()));setStatus('Complete material experiment restored.')})}})))),
   materialMode&&__FractaliaExperiments.warning()&&h('p',{style:{color:'#fdba74'}},__FractaliaExperiments.warning())),
  legacy&&h('p',{style:{fontSize:10,color:'#fdba74',margin:'6px 0'}},'F2 material keeps its original sound. Capture the original drawing again to create a Spectral F3 instrument.'),
  h('label',{style:{display:'flex',flexWrap:'wrap',gap:6,alignItems:'center',fontSize:11,marginTop:8}},'Capture detail',h('select',{'aria-label':'Fractalia capture detail',value:captureDetail,disabled:busy,onChange:e=>setCaptureDetail(e.target.value),className:'rounded border border-teal-800 bg-neutral-900 p-1'},h('option',{value:'standard'},'Standard · 24 × 128'),h('option',{value:'fine'},'Fine · more drawing detail')),h('span',{style:{color:'#a7b8b3',fontSize:10}},'Applies to the next Capture / New Instrument.')),
  h('label',{style:{display:'block',fontSize:11,marginTop:8}},'Instrument name',h('input',{'aria-label':'Fractalia instrument name',value:name,onChange:e=>setName(e.target.value),maxLength:120,className:'mt-1 w-full rounded border border-teal-800 bg-neutral-900 px-2 py-1'})),
  h('div',{style:{display:'flex',gap:6,flexWrap:'wrap',marginTop:6}},
   h('button',{...button,disabled:busy,'data-fractalia-new':true,onClick:()=>run(async()=>{await __Fractalia.saveInstrument({grid,durationSec:duration,name,resolution:captureDetail});setStatus('New instrument saved from this drawing. Replace the melody or load another instrument to compare.')})},'Save Drawing as New Instrument'),
   h('button',{...button,disabled:busy||!recipe.material||session.saved&&!modified,'data-fractalia-save-active':true,onClick:()=>run(async()=>{await __Fractalia.saveActiveInstrument({name});setStatus('Active instrument saved. Its sound-colour template is retained.')})},session.saved?'Save Instrument Changes':'Save Active Instrument')),
  h('div',{style:{display:'flex',gap:6,flexWrap:'wrap',marginTop:6}},
   h('button',{...button,disabled:busy,onClick:()=>run(async()=>{await __Fractalia.pinDrawing({grid,durationSec:duration,name,resolution:captureDetail});setStatus('Drawing captured as an unsaved instrument. Changing the melody retains this sound colour.')})},'Capture Drawing'),
   h('button',{...button,disabled:busy||!recipe.material,onClick:()=>run(async()=>{await __Fractalia.followDrawing();setStatus('Sound colour now follows the current drawing.')})},'Follow Current Drawing')),
  h('label',{style:{display:'flex',gap:6,alignItems:'center',fontSize:11,marginTop:8}},'Examples',h('select',{'aria-label':'Fractalia example instruments',disabled:busy,value:'',onChange:e=>{const kind=e.target.value;if(kind)void run(async()=>{await __Fractalia.compareExample(kind);setStatus('Example source changed; F3/F4 processing and Carrier retained. Press Play.')})},className:'min-w-0 flex-1 rounded border border-teal-800 bg-neutral-900 p-1 text-xs'},h('option',{value:''},'Try an example instrument…'),...[["glass","Glass Branches"],["reed","Reed Weave"],["hollow","Hollow Bloom"]].map(([id,label])=>h('option',{key:id,value:id},label)))),
  h('div',{'data-fractalia-library':true,style:{display:'flex',gap:6,flexWrap:'wrap',marginTop:8}},
   h('select',{'aria-label':'Saved Fractalia instruments',disabled:busy,value:session.activeId,onChange:e=>{if(e.target.value)void run(async()=>{await __Fractalia.compareInstrument(e.target.value);setStatus('Instrument material changed; F3/F4 settings and Carrier retained. Press Play.')})},className:'min-w-0 flex-1 rounded border border-teal-800 bg-neutral-900 p-1 text-xs'},h('option',{value:''},entries.length?'Choose saved instrument…':'No saved instruments yet'),...entries.map(e=>h('option',{key:e.id,value:e.id},e.name+' · F'+e.version))),
   h('button',{...button,disabled:busy||!session.activeId,onClick:()=>run(async()=>{await __Fractalia.loadInstrument(session.activeId);setStatus('Original saved preset loaded, including its own processing. Press Play.')})},'Original preset'),
   h('button',{...button,disabled:busy||!session.activeId,onClick:()=>run(async()=>{await __Fractalia.removeInstrument(session.activeId);setStatus('Library entry removed. The active sound colour is retained until you change it.')})},'Remove')),
  h('div',{'data-fractalia-ab':true,style:{marginTop:7,padding:'6px 8px',border:'1px solid #285a51',borderRadius:5,fontSize:11}},
   h('div',{style:{color:'#a7b8b3',marginBottom:5}},'Compare on the same Carrier · instrument selection keeps F3/F4 controls'),
   h('div',{style:{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}},
    ...['A','B'].flatMap(letter=>[
     h('button',{...button,key:letter+'-store',disabled:busy,'data-fractalia-store-slot':letter,onClick:()=>run(async()=>{__Fractalia.storeSlot(letter);setStatus('Variant '+letter+' captured with all current instrument settings.')})},'Remember '+letter),
     h('button',{...button,key:letter+'-recall',disabled:busy||!slots[letter],'data-fractalia-recall-slot':letter,onClick:()=>run(async()=>{await __Fractalia.recallSlot(letter);if(pe.getState().carrierIntegralSelection?.machineId==='fractalia-self-carrier'){await __f333PlayCurrent(pe.getState());setStatus('Playing variant '+letter+' on the current Carrier.')}else setStatus('Variant '+letter+' restored. Select Fractalia and press Play.')})},slots[letter]?'Play '+letter+' · '+slots[letter].name:'Play '+letter+' (empty)')
    ])),
   h('div',{style:{marginTop:4,fontSize:10,color:'#92b6ae'}},'A/B saves the complete working recipe, not the WAV; sound buffers are reused while cached. Different donor PCM needs the corresponding frozen experiment.')),
  h('div',{style:{display:'flex',gap:6,flexWrap:'wrap',marginTop:6}},
   h('button',{...button,disabled:busy||!recipe.material,onClick:()=>run(async()=>{const exported=__Fractalia.preset({...recipe,name});rP(new Blob([JSON.stringify(exported)],{type:'application/json'}),'Fractalia_'+(name.replace(/[^a-z0-9_-]+/gi,'_')||'Instrument')+'.json');setStatus('Complete instrument exported.')})},'Export Instrument'),
   h('button',{...button,disabled:busy,onClick:()=>file.current?.click()},'Import Instrument'),
   h('input',{ref:file,type:'file',accept:'.json,application/json',style:{display:'none'},'aria-label':'Import Fractalia instrument',onChange:e=>{const f=e.target.files?.[0];e.target.value='';if(f)void run(async()=>{if(f.size>8*1024*1024)throw Error('Instrument file exceeds 8 MiB');await __Fractalia.importInstrument(JSON.parse(await f.text()));setStatus('Instrument imported and active. Save Active Instrument adds it to the library. Current melody retained.')})}})),
  h('p',{role:'status','aria-live':'polite',style:{fontSize:11,lineHeight:1.5,minHeight:34,color:error||__Fractalia.lastError()?'#fca5a5':'#9dcbbf',margin:'8px 0 0'}},error||__Fractalia.lastError()||session.warning||status||(busy||preparing?'Preparing instrument…':atlas?(recipe.material?'Instrument ready. Play the current melody with this sound colour.':'Current drawing supplies sound colour and melody. Capture Drawing fixes the sound colour.'):'Draw or import a sound-colour template.')));
}
