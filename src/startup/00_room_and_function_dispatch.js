
/* xen-rooms: offline on-demand component and helper compilation */
const __xenLoadDeferred=(()=>{
 const __xenLoadedRooms=Object.create(null);
 function load(kind){
  if(Object.hasOwn(__xenLoadedRooms,kind))return __xenLoadedRooms[kind];
  if(kind!=="lab"&&kind!=="canonical"&&kind!=="nodal"&&kind!=="multitrack"&&kind!=="psylab")throw Error("Unknown deferred XenSonar room: "+kind);
  const __xenDeferredElement=document.getElementById("xen-room-"+kind);
  if(!__xenDeferredElement)throw Error("Missing offline XenSonar chunk: "+kind);
  const __xenDeferredSource=__xenDeferredElement.textContent;
  // Direct eval is intentional: factory functions reference private _bundleSrc-scoped XenSonar services.
  // An indirect eval, external _bundleSrc or bare new Function would break these bindings.
  const __xenDeferredExports=eval(__xenDeferredSource);
  __xenLoadedRooms[kind]=__xenDeferredExports;
  __xenDeferredElement.textContent="";
  return __xenDeferredExports;
 }
 load.status=()=>({lab:Object.hasOwn(__xenLoadedRooms,"lab"),canonical:Object.hasOwn(__xenLoadedRooms,"canonical"),nodal:Object.hasOwn(__xenLoadedRooms,"nodal"),multitrack:Object.hasOwn(__xenLoadedRooms,"multitrack"),psylab:Object.hasOwn(__xenLoadedRooms,"psylab")});
 return load;
})();
window.__XenRoomChunks=Object.freeze({load:__xenLoadDeferred,status:__xenLoadDeferred.status});

/* P7.38.11: Decide freshness BEFORE any application initializer can write defaults.
   Other existing XenSonar data also blocks seeding: an untouched quick menu by
   itself is not evidence of a new browser. Storage failures are never 'fresh'. */

/* P9/M4: Non-boot function islands. Same module lexical bindings as the room loader;
   no external fetch, Worker spin-up or audio scheduling on the main boot path. */
const __xenGetDeferredFn = (() => {
 const __xenDeferredCached=Object.create(null);
 function load(__xenDeferredKey){
  if(Object.hasOwn(__xenDeferredCached,__xenDeferredKey))return __xenDeferredCached[__xenDeferredKey];
  const __xenDeferredEl=document.getElementById('xen-function-'+__xenDeferredKey);
  if(!__xenDeferredEl)throw Error('Missing XenSonar function island '+__xenDeferredKey);
  // Direct eval inherits lexical bindings of the original top-level bundle.
  const __xenDeferredImpl=eval('('+__xenDeferredEl.textContent+')');
  if(typeof __xenDeferredImpl!=='function')throw Error('Invalid XenSonar function island '+__xenDeferredKey);
  __xenDeferredCached[__xenDeferredKey]=__xenDeferredImpl;
  __xenDeferredEl.textContent='';
  return __xenDeferredImpl;
 }
 load.status=()=>Object.keys(__xenDeferredCached);
 return load;
})();
window.__XenDeferredFunctionStatus=()=>__xenGetDeferredFn.status();

window.__XenBoot?.mark("module-entered");
const __XenStarterColdBrowser=(()=>{
 try{return !Object.keys(localStorage).some(key=>/^xensonar(?:[.:-]|$)/i.test(key))}
 catch{return false}
})();
