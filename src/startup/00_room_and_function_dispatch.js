
/* xen-lazy: unified offline on-demand room, chunk, and function-island loader.
   Direct eval is intentional: payloads run inside the main module lexical scope so they share
   private module bindings without leaking globals or requiring external network fetches. */
function __xenEvalInModule(__xenLdSource){
 return eval(__xenLdSource);
}
const __xenLazyRuntime=(()=>{
 const rooms=Object.create(null),chunks=Object.create(null),fns=Object.create(null);
 const meta={room:Object.create(null),chunk:Object.create(null),fn:Object.create(null)};
 const active=new Set();
 const validKey=/^[A-Za-z0-9_$-]{1,80}$/;
 const now=()=>typeof performance!=='undefined'&&typeof performance.now==='function'?performance.now():Date.now();

 function resolveDeps(el,ownerTag){
  const raw=el.getAttribute?.('data-xen-deps');
  if(!raw)return [];
  const deps=raw.split(',').map(s=>s.trim()).filter(Boolean);
  for(const dep of deps){
   if(dep.startsWith('room:'))loadRoom(dep.slice(5));
   else if(dep.startsWith('fn:'))loadFunction(dep.slice(3));
   else loadChunk(dep);
  }
  return deps;
 }

 function loadKind(kind,key,prefix,cache,wrapExpr){
  if(Object.hasOwn(cache,key))return cache[key];
  if(typeof key!=='string'||!validKey.test(key))throw Error('Invalid deferred XenSonar '+kind+': '+key);
  const tag=kind+':'+key;
  if(active.has(tag))throw Error('Cyclic deferred XenSonar dependency: '+tag);
  const el=document.getElementById(prefix+key);
  if(!el)throw Error('Missing offline XenSonar '+kind+': '+key);
  active.add(tag);
  try{
   const deps=resolveDeps(el,tag);
   const src=el.textContent||'';
   const bytes=src.length;
   const t0=now();
   const exportsObj=__xenEvalInModule(wrapExpr?'('+src+'\n)':src);
   const loadMs=Math.max(0,+(now()-t0).toFixed(2));
   if(wrapExpr&&typeof exportsObj!=='function')throw Error('Invalid XenSonar function island '+key);
   cache[key]=exportsObj;
   meta[kind][key]={loaded:true,bytes,loadMs,deps};
   el.textContent='';
   return exportsObj;
  }finally{
   active.delete(tag);
  }
 }

 function loadRoom(kind){return loadKind('room',kind,'xen-room-',rooms,false)}
 function loadChunk(key){return loadKind('chunk',key,'xen-chunk-',chunks,false)}
 function loadFunction(key){return loadKind('fn',key,'xen-function-',fns,true)}

 function isLoaded(kind,key){
  if(kind==='room')return Object.hasOwn(rooms,key);
  if(kind==='chunk')return Object.hasOwn(chunks,key);
  if(kind==='fn'||kind==='function')return Object.hasOwn(fns,key);
  return false;
 }

 function listDom(type,prefix,cache,metaMap){
  const out=Object.create(null);
  if(typeof document!=='undefined'&&document.querySelectorAll){
   for(const el of document.querySelectorAll('script[type="'+type+'"]')){
    const id=el.id||'';
    if(!id.startsWith(prefix))continue;
    const key=id.slice(prefix.length);
    const loaded=Object.hasOwn(cache,key);
    const info=metaMap[key];
    out[key]=loaded
     ?{loaded:true,bytes:info?.bytes??0,loadMs:info?.loadMs??0,deps:info?.deps??[]}
     :{loaded:false,bytes:(el.textContent||'').length,loadMs:null,deps:(el.getAttribute('data-xen-deps')||'').split(',').map(s=>s.trim()).filter(Boolean)};
   }
  }
  for(const key of Object.keys(cache))if(!Object.hasOwn(out,key))out[key]={loaded:true,bytes:metaMap[key]?.bytes??0,loadMs:metaMap[key]?.loadMs??0,deps:metaMap[key]?.deps??[]};
  return out;
 }

 function roomStatus(){
  const out={lab:false,canonical:false,nodal:false,multitrack:false,psylab:false,xenpolar:false};
  if(typeof document!=='undefined'&&document.querySelectorAll){
   for(const el of document.querySelectorAll('script[type="application/x-xensonar-room"]')){
    if(el.id&&el.id.startsWith('xen-room-'))out[el.id.slice(9)]=Object.hasOwn(rooms,el.id.slice(9));
   }
  }
  for(const k of Object.keys(out))out[k]=Object.hasOwn(rooms,k);
  return out;
 }

 function chunkStatus(){
  const dom=listDom('application/x-xensonar-chunk','xen-chunk-',chunks,meta.chunk);
  const out=Object.create(null);
  for(const k of Object.keys(dom))out[k]=dom[k].loaded;
  return out;
 }

 function fnStatus(){return Object.keys(fns)}

 function report(){
  const r=listDom('application/x-xensonar-room','xen-room-',rooms,meta.room);
  const c=listDom('application/x-xensonar-chunk','xen-chunk-',chunks,meta.chunk);
  const f=listDom('application/x-xensonar-function','xen-function-',fns,meta.fn);
  let totalBytes=0,loadedBytes=0,count=0,loadedCount=0;
  for(const group of [r,c,f]){
   for(const entry of Object.values(group)){
    count++;totalBytes+=entry.bytes;
    if(entry.loaded){loadedCount++;loadedBytes+=entry.bytes}
   }
  }
  return {totals:{count,loadedCount,coldCount:count-loadedCount,totalBytes,loadedBytes,deferredBytes:totalBytes-loadedBytes},rooms:r,chunks:c,functions:f};
 }

 function lazyObject(chunkKey,prop){
  let resolved=null;
  const target=()=>resolved??(resolved=prop?loadChunk(chunkKey)[prop]:loadChunk(chunkKey));
  return new Proxy(Object.create(null),{
   get(_,k){const o=target();const v=o[k];return typeof v==='function'?v.bind(o):v},
   set(_,k,v){const o=target();o[k]=v;return true},
   has(_,k){return k in target()},
   ownKeys(){return Reflect.ownKeys(target())},
   getOwnPropertyDescriptor(_,k){return Reflect.getOwnPropertyDescriptor(target(),k)}
  });
 }

 loadRoom.status=roomStatus;
 loadChunk.status=chunkStatus;
 loadFunction.status=fnStatus;
 return Object.freeze({loadRoom,loadChunk,loadFunction,isLoaded,roomStatus,chunkStatus,fnStatus,report,lazyObject});
})();
const __xenLoadDeferred=__xenLazyRuntime.loadRoom;
const __xenLoadChunk=__xenLazyRuntime.loadChunk;
const __xenGetDeferredFn=__xenLazyRuntime.loadFunction;
const __xenLazyObject=__xenLazyRuntime.lazyObject;
window.__XenRoomChunks=Object.freeze({load:__xenLoadDeferred,status:__xenLoadDeferred.status});
window.__XenLazyLoader=Object.freeze({
 loadRoom:__xenLoadDeferred,
 loadChunk:__xenLoadChunk,
 loadFunction:__xenGetDeferredFn,
 isLoaded:__xenLazyRuntime.isLoaded,
 status:()=>({rooms:__xenLazyRuntime.roomStatus(),chunks:__xenLazyRuntime.chunkStatus(),functions:__xenLazyRuntime.fnStatus()}),
 report:__xenLazyRuntime.report
});
window.__XenDeferredFunctionStatus=()=>__xenGetDeferredFn.status();
window.__xenOpenForgeWorkflow=function(trigger){__xenLoadChunk('forge-workflow');return window.__xenOpenForgeWorkflow(trigger)};
window.__XenSoundRecipeExportUI={
 open(...args){__xenLoadChunk('sound-recipe-export');return window.__XenSoundRecipeExportUI.open(...args)},
 close(){if(__xenLazyRuntime.isLoaded('chunk','sound-recipe-export'))window.__XenSoundRecipeExportUI.close()}
};

