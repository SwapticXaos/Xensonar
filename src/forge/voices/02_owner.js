/* Forge Voices · state owner for the G/H/I listening modes (Gaia, Hildegard, Isolde).
   KALT: this small owner holds recipes only. DSP, Worker and Synth Lab panels live in
   the lazy Forge room chunk and register themselves here when that chunk is opened.
   One recipe per mode; the draft is kept in localStorage and inside each Forge project. */
const __ForgeVoices=(()=>{
 const spec=createForgeVoiceSpec(),STORAGE='xensonar.forge.voices.v1',listeners=new Set();
 let recipes={},revision=0,lastError=null,lastReport=null,runtime=null;
 for(const id of spec.ids)recipes[id]=spec.recipe(id);
 try{const raw=JSON.parse(localStorage.getItem(STORAGE)||'null');if(raw&&typeof raw==='object')for(const id of spec.ids)if(raw[id])try{recipes[id]=spec.recipe(id,raw[id])}catch{}}catch{}
 recipes=Object.freeze(recipes);
 const engineOf=spec.engineOf,is=machineId=>engineOf(machineId)!==null,snapshot=()=>recipes;
 const notify=()=>{for(const fn of listeners)try{fn()}catch(error){console.warn('[Forge Voices] View update',error)}};
 // A project without (or with a damaged) recipe for a mode keeps the current draft of that mode.
 function normalizeProject(input){if(!input||typeof input!=='object')return null;const out={};for(const id of spec.ids)if(input[id])try{out[id]=spec.recipe(id,input[id])}catch{}return Object.keys(out).length?out:null}
 // Only the parameters are sound. The preset name is a label.
 const semanticKey=(machineId,input)=>{const id=engineOf(machineId);return id+':'+JSON.stringify(spec.recipe(id,(input??recipes)[id]??recipes[id]).params)};
 function set(engine,input,{invalidate=true}={}){
  const next=spec.recipe(engine,input),previous=recipes[engine];if(JSON.stringify(next)===JSON.stringify(previous))return previous;
  const sound=JSON.stringify(next.params)!==JSON.stringify(previous.params);recipes=Object.freeze({...recipes,[engine]:next});
  try{localStorage.setItem(STORAGE,JSON.stringify(recipes))}catch{}
  if(sound){revision++;lastError=null;
   if(invalidate&&typeof pe!=='undefined'&&pe.getState){const state=pe.getState();if(engineOf(state.carrierIntegralSelection?.machineId)===engine){__f333Stop();pe.setState({...__f333Idle(),renderVersion:(state.renderVersion??0)+1,audioBufferDirty:true})}}}
  if(invalidate&&typeof __f333Persistence!=='undefined')__f333Persistence?.scheduleSave?.();
  notify();return next;
 }
 function loadProject(input){const next=normalizeProject(input);if(!next)return;for(const id of Object.keys(next))set(id,next[id],{invalidate:false})}
 function lab(){if(!runtime)__xenLoadDeferred('lab');if(!runtime)throw Error('This listening mode could not be loaded.');return runtime}
 async function renderCarrier(args){
  try{lastError=null;const result=await lab().renderCarrier(args);lastReport=result.report;notify();return result.buffer}
  catch(error){if(error?.name!=='AbortError'){lastError=String(error?.message||error);notify()}throw error}
 }
 return Object.freeze({spec,is,engineOf,snapshot,semanticKey,set,loadProject,normalizeProject,renderCarrier,
  subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),revision:()=>revision,lastError:()=>lastError,lastReport:()=>lastReport,
  register(next){runtime=next},preset:(engine,id)=>set(engine,spec.preset(engine,id))});
})();
/* Listening modes that render themselves from the Carrier and are never replaced by a selected Donor. */
const __forgeSelfMachine=id=>id==='emilia-nodal-carrier'||id==='fractalia-self-carrier'||__ForgeVoices.is(id);
/* Modes whose heard PCM (not a generic carrier pattern) is what live destinations receive. */
const __forgeRenderedMachine=id=>id==='fractalia-self-carrier'||__ForgeVoices.is(id);
