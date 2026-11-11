/* PKG-BOOT-TDZ-01: Package Station boot() runs before the main module reaches
 * `const __XMEM_MR03_ROOT_PILOT` (audio/01_voice_and_rfl_ownership.js). Reading that const here threw
 * "Cannot access before initialization" whenever a restore journal was pending (after any .xenpack
 * import or crash recovery), so the app never finished starting. Same definition, read at call time. */
function __xmemRootPilotEarly(){return typeof window!=="undefined"&&window.__XMEM_MR03_ENABLE_ROOT__===true}
/* Package Station 4: lossless, framed structured-clone archive.
 * One IDB record at a time, <= 1 MiB binary I/O, awaited disk writes.
 * No Base64, archive-sized string, getAll(audio), or renderer dependency.
 * The factory stays dormant until Package Station is used or recovery is pending. */
function __createXenPackageStation4(env=globalThis) {
 const CHUNK=1024*1024, MAGIC='XENPACK4\n', JOURNAL='xensonar:package-station:v4:recovery',
  RUNTIME='xensonar:package-station:v4:runtime', TRANSPORT='xensonar-package-station-v4-transport';
 const te=new TextEncoder(),td=new TextDecoder('utf-8',{fatal:true});
 const owned=n=>typeof n==='string'&&/^xensonar(?:[.::_-]|$)/i.test(n);
 const legacyKeys=new Set(['forge-donor-presets-f317','forge-donor-recipes-f3563','forge-history-pages-v1']);
 const dataKey=k=>(owned(k)||legacyKeys.has(k))&&!/^xensonar(?::package-station:|\.package-import\.|\.melodic-project-reservations\.|-last-workspace-package-import-ledger)/i.test(k);
 const dbKey=n=>owned(n)&&n!==TRANSPORT;
 const fail=s=>{throw Error('Paketstation: '+s)};
 const check=(v,s)=>{if(!v)fail(s)};
 const yieldUI=()=>new Promise(r=>setTimeout(r,0));
 let hooks={},busy=false,inPreview=false,aborted=false,dialog=null,lastProgress=0;
 const TRACE='xensonar:package-station:v4:trace';
 let events=[];try{const previous=JSON.parse(env.localStorage?.getItem(TRACE)??'null');if(Array.isArray(previous?.events))events=previous.events.slice(-80)}catch{}
 function note(stage,detail={}){
  if(env.__XEN_PACKAGE_STATION_TEST__===true)env.console?.log('P4 '+stage);
  const event={stage,at:new Date().toISOString()};for(const key of ['count','records','bytes','chunks'])if(Number.isFinite(detail[key]))event[key]=detail[key];
  events.push(event);if(events.length>80)events.shift();try{env.localStorage?.setItem(TRACE,JSON.stringify({schemaVersion:4,events}))}catch{}
 }

 const stats={bytes:0,records:0,databases:0,maxChunk:0,maxRecordBinary:0};
 const trace=(stage,detail={})=>{if(inPreview)return;note(stage,detail);hooks.trace?.step(stage,detail);if(dialog&&Date.now()-lastProgress>100){lastProgress=Date.now();dialog.text.textContent=stage+' · '+(stats.bytes/1048576).toFixed(1)+' MB · '+stats.records+' records';}};
 function checkAbort(){if(aborted){const e=Error('Paketstation: Vorgang abgebrochen.');e.name='AbortError';throw e}}
 function progress(title){
  if(!env.document)return ()=>{};
  const outer=env.document.createElement('div');outer.setAttribute('role','dialog');outer.setAttribute('aria-modal','true');
  outer.style.cssText='position:fixed;inset:0;z-index:2147483646;background:#050b14e8;display:grid;place-items:center;color:#d5fcff;font:15px system-ui';
  const box=env.document.createElement('div');box.style.cssText='max-width:560px;padding:28px;border:1px solid #277c89;border-radius:18px;background:#08151f';
  const heading=env.document.createElement('h2');heading.textContent=title;
  const text=env.document.createElement('p');text.textContent='Preparing …';text.setAttribute('aria-live','polite');
  const actions=env.document.createElement('div'),cancel=env.document.createElement('button');cancel.textContent='Cancel';cancel.style.cssText='padding:9px 20px;background:#173841;color:#d5fcff;border:1px solid #3e818b;border-radius:8px';
  cancel.onclick=()=>{aborted=true;cancel.disabled=true};actions.append(cancel);box.append(heading,text,actions);outer.append(box);env.document.body.append(outer);dialog={outer,text,actions,cancel};
  return ()=>{outer.remove();dialog=null};
 }
 const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0});
 function crc(bytes,c=0xffffffff){for(let i=0;i<bytes.length;i++)c=crcTable[(c^bytes[i])&255]^(c>>>8);return c>>>0}
 const u32=n=>{const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,n,true);return b};
 function request(r){return new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||Error('IndexedDB request failed'))})}
 function open(name,version,upgrade){return new Promise((resolve,reject)=>{
  let ended=false;const r=version?env.indexedDB.open(name,version):env.indexedDB.open(name);
  r.onupgradeneeded=e=>upgrade?.(r.result,r.transaction,e);
  r.onerror=()=>reject(r.error||Error('IndexedDB open failed'));
  r.onblocked=()=>{ended=true;reject(Error('Paketstation: Datenbank blockiert. Andere XenSonar-Tabs derselben Datei schließen.'))};
  r.onsuccess=()=>{if(ended){r.result.close();return}r.result.onversionchange=()=>r.result.close();resolve(r.result)};
 })}
 async function tx(db,store,mode,run){return new Promise((resolve,reject)=>{
  let value;const t=db.transaction(store,mode);t.oncomplete=()=>resolve(value);t.onabort=()=>reject(t.error||Error('IndexedDB transaction aborted'));t.onerror=()=>{};
  try{run(t.objectStore(store),v=>{value=v},t)}catch(e){try{t.abort()}catch{}reject(e)}
 })}
 async function transport(){return open(TRANSPORT,1,db=>{db.createObjectStore('chunks',{keyPath:['name','n']});db.createObjectStore('files',{keyPath:'name'})})}
 async function transportIO(store,mode,run){const db=await transport();try{return await tx(db,store,mode,run)}finally{db.close()}}
 async function directory(){try{return await env.navigator?.storage?.getDirectory?.()}catch{return null}}
 /* Disk spool has the same range-reader interface on OPFS and IndexedDB.
    The IDB fallback never reconstructs a whole output Blob: it downloads bounded parts. */
 async function spool(name,write=false){
  const dir=await directory();
  if(dir){
   const h=await dir.getFileHandle('xen-p4-'+name,{create:write});
   if(write){const w=await h.createWritable();let size=0;return {kind:'opfs',name,async write(b){checkAbort();await w.write(b);size+=b.byteLength??b.size},async close(){await w.close();return spool(name)},async abort(){try{await w.abort()}catch{}try{await dir.removeEntry('xen-p4-'+name)}catch{}}}}
   const file=await h.getFile();return {kind:'opfs',name,size:file.size,read:async(o,n)=>new Uint8Array(await file.slice(o,o+n).arrayBuffer()),slice:(o,n)=>file.slice(o,o+n),file,remove:()=>dir.removeEntry('xen-p4-'+name)};
  }
  if(write){
   await removeSpool(name);let n=0,size=0;
   return {kind:'idb',name,async write(b){checkAbort();const blob=b instanceof Blob?b:new Blob([b]);check(blob.size<=CHUNK+64,'Interner Schreibblock zu groß.');await transportIO('chunks','readwrite',s=>s.put({name,n:n++,blob}));size+=blob.size},async close(){await transportIO('files','readwrite',s=>s.put({name,size,count:n}));return spool(name)},async abort(){await removeSpool(name)}};
  }
  const meta=await transportIO('files','readonly',(s,set)=>{const r=s.get(name);r.onsuccess=()=>set(r.result)});check(meta,'Sicherungsdatei im Zwischenspeicher fehlt.');
  // Chunk sizes vary (frame headers/payloads). Keep only their small offsets in RAM.
  const index=[];let offset=0;
  for(let i=0;i<meta.count;i++){const row=await transportIO('chunks','readonly',(s,set)=>{const r=s.get([name,i]);r.onsuccess=()=>set(r.result)});check(row,'Sicherungsblock fehlt.');index.push({offset,size:row.blob.size});offset+=row.blob.size}
  check(offset===meta.size,'Unvollständige Sicherungsdatei.');
  const slice=async(o,len)=>{const parts=[];let remaining=len;
   let lo=0,hi=index.length;while(lo<hi){const m=(lo+hi)>>1;if(index[m].offset+index[m].size<=o)lo=m+1;else hi=m}
   for(let i=lo;i<index.length&&remaining>0;i++){
    const at=index[i],row=await transportIO('chunks','readonly',(s,set)=>{const r=s.get([name,i]);r.onsuccess=()=>set(r.result)}),start=Math.max(0,o-at.offset),take=Math.min(at.size-start,remaining);
    parts.push(row.blob.slice(start,start+take));o+=take;remaining-=take;
   }check(remaining===0,'Abgeschnittene Sicherungsdatei.');return new Blob(parts)
  };
  return {kind:'idb',name,size:meta.size,slice,read:async(o,n)=>new Uint8Array(await (await slice(o,n)).arrayBuffer()),remove:()=>removeSpool(name)};
 }
 async function removeSpool(name){
  const dir=await directory();if(dir)try{await dir.removeEntry('xen-p4-'+name)}catch{}
  await transportIO('chunks','readwrite',s=>s.delete(IDBKeyRange.bound([name,0],[name,Number.MAX_SAFE_INTEGER])));
  await transportIO('files','readwrite',s=>s.delete(name));
 }
 function source(file){return {size:file.size,read:async(o,n)=>new Uint8Array(await file.slice(o,o+n).arrayBuffer()),slice:(o,n)=>file.slice(o,o+n)}}
 async function writer(sink){
  let pending=new Uint8Array(CHUNK),used=0;
  async function flush(){if(used){await sink.write(pending.subarray(0,used));pending=new Uint8Array(CHUNK);used=0}}
  async function output(bytes){for(let at=0;at<bytes.length;){const take=Math.min(CHUNK-used,bytes.length-at);pending.set(bytes.subarray(at,at+take),used);used+=take;at+=take;if(used===CHUNK)await flush()}}
  await output(te.encode(MAGIC));let checksum=0xffffffff,frames=0;
  async function frame(tag,payload){checkAbort();const b=payload instanceof Uint8Array?payload:te.encode(JSON.stringify(payload));check(b.byteLength<=CHUNK,'Metadatenblock zu groß.');
   const head=new Uint8Array(9);head[0]=tag;new DataView(head.buffer).setUint32(1,b.length,true);new DataView(head.buffer).setUint32(5,(crc(b)^0xffffffff)>>>0,true);
   checksum=crc(b,crc(head,checksum));frames++;stats.bytes+=head.length+b.length;stats.maxChunk=Math.max(stats.maxChunk,b.length);
   await output(head);await output(b);
  }
  return {json:v=>frame(1,v),raw:b=>frame(2,b),async finish(){await frame(3,{checksum:(checksum^0xffffffff)>>>0,frames});await flush();return sink.close()}};
 }
 function reader(src){let offset=MAGIC.length,checksum=0xffffffff,frames=0,cache=null,cacheAt=-1;
  async function read(at,length){
   check(at>=0&&length>=0&&at+length<=src.size,'Archivblock abgeschnitten.');
   if(cache&&at>=cacheAt&&at+length<=cacheAt+cache.length)return cache.subarray(at-cacheAt,at-cacheAt+length);
   if(length===0)return new Uint8Array();
   const out=new Uint8Array(length);let pos=0;
   while(pos<length){if(!cache||at<cacheAt||at>=cacheAt+cache.length){cacheAt=at;cache=await src.read(at,Math.min(CHUNK,src.size-at));check(cache.length>0,'Archiv abgeschnitten.')}
    const take=Math.min(length-pos,cacheAt+cache.length-at);out.set(cache.subarray(at-cacheAt,at-cacheAt+take),pos);at+=take;pos+=take;
   }return out;
  }
  return {async init(){check(td.decode(await read(0,MAGIC.length))===MAGIC,'Unbekanntes Archivformat.')},get offset(){return offset},
   async next(){checkAbort();check(offset+9<=src.size,'Archiv unvollständig: Abschluss oder Block fehlt.');const head=await read(offset,9),dv=new DataView(head.buffer,head.byteOffset,head.byteLength),tag=head[0],len=dv.getUint32(1,true),expected=dv.getUint32(5,true);offset+=9;
    check([1,2,3].includes(tag)&&len<=CHUNK&&offset+len<=src.size,'Ungültiger Archivblock.');const start=offset,b=await read(offset,len);offset+=len;
    check(((crc(b)^0xffffffff)>>>0)===expected,'Prüfsumme stimmt nicht. Originaldaten bleiben geschützt.');
    if(tag===3){const foot=JSON.parse(td.decode(b));check(foot.checksum===((checksum^0xffffffff)>>>0)&&foot.frames===frames&&offset===src.size,'Archivabschluss stimmt nicht.');return {tag,value:foot}}
    checksum=crc(b,crc(head,checksum));frames++;stats.bytes=offset;
    return tag===1?{tag,value:JSON.parse(td.decode(b))}:{tag,bytes:b,slice:()=>src.slice(start,len)};
   }};
 }
 async function encode(w,input){const refs=new Map();let next=0,recordBinary=0;
  const token=v=>w.json(v);
  const raw=async bytes=>{recordBinary+=bytes.byteLength;for(let i=0;i<bytes.byteLength;i+=CHUNK)await w.raw(bytes.subarray(i,i+CHUNK))};
  async function visit(v){
   if(v===null||typeof v==='boolean'){await token({t:'primitive',v});return}
   if(typeof v==='number'){await token({t:'number',v:Object.is(v,-0)?'-0':String(v)});return}
   if(typeof v==='undefined'){await token({t:'undefined'});return}
   if(typeof v==='bigint'){await token({t:'bigint',v:String(v)});return}
   if(typeof v==='string'){
    await token({t:'string',length:v.length});
    for(let i=0;i<v.length;){let end=Math.min(v.length,i+32768);if(end<v.length&&/[\uD800-\uDBFF]/.test(v[end-1]))end--;await token({t:'text',v:v.slice(i,end)});i=end}return;
   }
   check(typeof v==='object','Nicht speicherbarer Wert im Archiv.');
   if(refs.has(v)){await token({t:'ref',id:refs.get(v)});return}const id=next++;refs.set(v,id);
   if(v instanceof ArrayBuffer){await token({t:'buffer',id,size:v.byteLength});await raw(new Uint8Array(v));return}
   if(ArrayBuffer.isView(v)){await token({t:'view',id,kind:v.constructor.name,offset:v.byteOffset,length:v instanceof DataView?v.byteLength:v.length});await visit(v.buffer);return}
   if(v instanceof Blob){const file=typeof File!=='undefined'&&v instanceof File;await token({t:file?'file':'blob',id,size:v.size,mime:v.type,name:file?v.name:null,modified:file?v.lastModified:null});recordBinary+=v.size;
    for(let i=0;i<v.size;i+=CHUNK)await w.raw(new Uint8Array(await v.slice(i,i+CHUNK).arrayBuffer()));return}
   if(v instanceof Date){await token({t:'date',id,v:String(v.getTime())});return}
   if(v instanceof RegExp){await token({t:'regexp',id,source:v.source,flags:v.flags});return}
   if(v instanceof Map){await token({t:'map',id,length:v.size});for(const [k,x] of v){await visit(k);await visit(x)}return}
   if(v instanceof Set){await token({t:'set',id,length:v.size});for(const x of v)await visit(x);return}
   const keys=Object.keys(v);await token({t:Array.isArray(v)?'array':'object',id,length:Array.isArray(v)?v.length:undefined,count:keys.length});
   for(const k of keys){await visit(k);await visit(v[k])}
  }
  await visit(input);stats.maxRecordBinary=Math.max(stats.maxRecordBinary,recordBinary);
 }
 async function decode(r,materialize=true){const refs=new Map();let binary=0;
  async function token(){const f=await r.next();check(f.tag===1,'Wertstruktur beschädigt.');return f.value}
  const integer=(n,max=Number.MAX_SAFE_INTEGER)=>{check(Number.isSafeInteger(n)&&n>=0&&n<=max,'Ungültige Größenangabe.');return n};
  async function visit(depth=0){check(depth<512,'Zu tief verschachteltes Archiv.');const n=await token();check(n&&typeof n.t==='string','Ungültiger Werttyp.');
   switch(n.t){
    case 'primitive':check(n.v===null||typeof n.v==='boolean','Ungültiger Skalar.');return n.v;
    case 'undefined':return undefined;
    case 'number':check(typeof n.v==='string'&&/^(?:-0|NaN|[-+]?Infinity|[-+\d.eE]+)$/.test(n.v),'Ungültige Zahl.');return Number(n.v);
    case 'bigint':return materialize?BigInt(n.v):null;
    case 'string':{integer(n.length);const parts=[];let len=0;while(len<n.length){const t=await token();check(t.t==='text'&&typeof t.v==='string'&&t.v.length>0,'Ungültiger Textblock.');len+=t.v.length;if(materialize)parts.push(t.v)}check(len===n.length,'Textlänge stimmt nicht.');return materialize?parts.join(''):null}
    case 'ref':check(refs.has(n.id),'Ungültige Objektbeziehung.');return refs.get(n.id);
   }
   integer(n.id);check(!refs.has(n.id),'Doppelte Objektkennung.');let out;
   if(n.t==='buffer'||n.t==='blob'||n.t==='file'){
    integer(n.size);binary+=n.size;const parts=[];out=n.t==='buffer'&&materialize?new Uint8Array(n.size):null;let pos=0;
    while(pos<n.size){const f=await r.next();check(f.tag===2&&f.bytes.length>0&&pos+f.bytes.length<=n.size,'Binärdaten unvollständig.');if(materialize){if(out)out.set(f.bytes,pos);else parts.push(new Blob([f.bytes]))}pos+=f.bytes.length}
    if(materialize)out=n.t==='buffer'?out.buffer:n.t==='file'?new File(parts,n.name,{type:n.mime,lastModified:n.modified}):new Blob(parts,{type:n.mime});
   }else if(n.t==='view'){
    const types={Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array,BigInt64Array,BigUint64Array,DataView};
    check(Object.hasOwn(types,n.kind),'Unbekanntes Binärformat.');integer(n.offset);integer(n.length);refs.set(n.id,null);const b=await visit(depth+1);out=materialize?new types[n.kind](b,n.offset,n.length):null;
   }else if(n.t==='date'){out=materialize?new Date(Number(n.v)):null}
   else if(n.t==='regexp'){out=materialize?new RegExp(n.source,n.flags):null}
   else if(n.t==='array'||n.t==='object'){
    integer(n.count);if(n.t==='array')integer(n.length,0xffffffff);out=materialize?(n.t==='array'?new Array(n.length):{}):null;refs.set(n.id,out);
    const seen=new Set();for(let i=0;i<n.count;i++){const k=await visit(depth+1),v=await visit(depth+1);if(materialize){check(typeof k==='string'&&!seen.has(k)&&!(n.t==='array'&&k==='length'),'Ungültiger Objektschlüssel.');seen.add(k);Object.defineProperty(out,k,{value:v,writable:true,enumerable:true,configurable:true})}}
   }else if(n.t==='map'||n.t==='set'){
    integer(n.length);out=materialize?(n.t==='map'?new Map():new Set()):null;refs.set(n.id,out);for(let i=0;i<n.length;i++){const k=await visit(depth+1);if(n.t==='map'){const v=await visit(depth+1);out?.set(k,v)}else out?.add(k)}
   }else fail('Unbekannter Werttyp: '+n.t);
   refs.set(n.id,out);return out;
  }
  const value=await visit();stats.maxRecordBinary=Math.max(stats.maxRecordBinary,binary);return value;
 }
 async function inventory(){
  // WC06-INV01: without exhaustive native enumeration a 'complete' archive
  // could silently omit an active or future xensonar database.
  if(typeof env.indexedDB?.databases!=='function')
   fail('Vollständiges Datenbankinventar in diesem Browser nicht prüfbar; Paketvorgang sicher abgebrochen.');
  const all=await env.indexedDB.databases();
  check(Array.isArray(all)&&all.every(x=>x&&typeof x.name==='string'&&
   Number.isInteger(x.version)&&x.version>=1),
   'Datenbankinventar unvollständig oder ungültig; Paketvorgang sicher abgebrochen.');
  return all.filter(x=>dbKey(x.name)).map(x=>({name:x.name,version:x.version})).sort((a,b)=>a.name.localeCompare(b.name));
 }
 // PKG-XMEM-01: canonical Melodic snapshot fence (EXPORT ONLY).
 // No repository mutation, import migration, or legacy cleanup is performed here.
 const XMEM_REPO='xensonar-xmem-melodic-repository-pilot-v1';
 const XMEM_MARKER='xensonar-xmem-melodic-authority-test-v1';
 const XMEM_LEGACY='xensonar-melodic-loop-projects-v1';
 function xmemMarker(raw){
  if(raw===null)return false;
  let v;try{v=JSON.parse(raw)}catch{fail('XMEM-Speicherautorität ist beschädigt; kein Export.');}
  check(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')==='db,mode,source,version'&&
   v.version===1&&v.mode==='indexeddb'&&v.db===XMEM_REPO&&v.source==='xmem02c2-test',
   'XMEM-Speicherautorität ist unbekannt; Export abgebrochen.');
  return true;
 }
 async function xmemWitness(){
  const markerRaw=env.localStorage.getItem(XMEM_MARKER),active=xmemMarker(markerRaw);
   const release=globalThis.__XMEMRelease01?.marker('melodic')??null;
   if(release&&release.phase!=='released')fail('XMEM Melodic release intent unresolved; export blocked');
   const released=!!release,releaseRaw=release?.raw??null;
   check(!released,'MR03C retained-only export: previously released legacy source requires v7 restore contract.');
   if(released)check(env.localStorage.getItem(XMEM_LEGACY)===null,
     'Legacy Melodic resurrected after release; export blocked');
  const available=(await inventory()).some(e=>e.name===XMEM_REPO);
  check(!active||available,'XMEM-Autorität aktiv, aber Repository fehlt; kein Paketexport.');
  if(!available)return {active:false,available:false,markerRaw};
  const db=await open(XMEM_REPO);
  let h;
  try{
   check(db.objectStoreNames.contains('control')&&db.objectStoreNames.contains('records'),
    'XMEM-Repository-Schema unbekannt; kein Paketexport.');
   h=await tx(db,'control','readonly',(store,set)=>{const q=store.get('head');q.onsuccess=()=>set(q.result)});
  }finally{db.close()}
  check(h&&h.id==='head'&&[1,2].includes(h.version)&&Number.isSafeInteger(h.revision)&&
   typeof h.contentDigest==='string'&&typeof h.legacyHash==='string'&&Number.isSafeInteger(h.count),
   'XMEM-Head ist beschädigt oder inkompatibel; kein Paketexport.');
  if(h.version===2)check(active,'XMEM-Epoch existiert ohne ausgewählte Speicherautorität; Export gesperrt.');
   if(released)check(active&&h.version===2&&h.epoch?.phase==='retained'&&
      release.sourceHash===h.legacyHash&&release.legacyKey===XMEM_LEGACY&&
      release.db===XMEM_REPO,'Freigabezeuge passt nicht zum kanonischen Melodic-Head');
  let verified=null;
  if(active){
   check(typeof env.indexedDB.databases==='function',
    'Aktive XMEM-Autorität benötigt sichere IndexedDB-Inventarisierung.');
   const reader=env.XenSonarXMemMelodicRepositoryPilot;
   check(typeof reader?.read==='function',
    'XMEM-Projekt-Reader fehlt; kein unvollständiges Melodic-Paket.');
   verified=await reader.read(); // Real v1/v2 reader validates SHA-256 ledger and legacy drift.
   check(verified&&Array.isArray(verified.projects)&&verified.revision===h.revision&&verified.count===h.count&&
    new Set(verified.projects.map(p=>p?.id)).size===verified.projects.length&&
    Array.isArray(verified.records)&&new Set(verified.records.map(r=>r?.id)).size===verified.records.length&&
    verified.records.filter(r=>!r.deleted).length===h.count,
    'XMEM-Snapshot unvollständig oder Projektidentitäten beschädigt.');
   if(h.version===2)check(h.epoch?.phase==='retained'&&verified.phase==='retained'&&
    h.epoch.id===verified.epochId,'XMEM-Epoch nicht lesbar; Export blockiert.');
  }
  return {active,available,markerRaw,released,releaseRaw,recordIds:active?verified.records.map(r=>r.id).sort():null,
   headVersion:h.version,revision:h.revision,
   digest:h.contentDigest,count:h.count,legacyHash:h.legacyHash,
   epochId:h.epoch?.id??null,phase:h.epoch?.phase??'pilot-v1'};
 }
 function xmemSame(a,b){return JSON.stringify(a)===JSON.stringify(b)}
 async function previewRestore(file,internal=false){
  if(!internal)check(!busy,'Während eines laufenden Paketvorgangs kann keine Restore-Prüfung erfolgen.');
  check(file&&typeof file.size==='number'&&typeof file.slice==='function','Bitte ein .xenpack-Archiv auswählen.');
  check(env.crypto?.subtle&&typeof env.crypto.subtle.digest==='function','WebCrypto-SHA-256 fehlt.');
  if(!internal)busy=true;inPreview=true;
  try{
  const hash=async value=>{
   const b=await env.crypto.subtle.digest('SHA-256',te.encode(value));
   return Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
  };
  // Pass 1 validates archive framing, CRCs, format & shape without allocating PCM.
  const src=source(file),manifest=await walk(src);
  check(manifest.version===6&&manifest.xmem?.schema===1&&manifest.xmem.db===XMEM_REPO&&manifest.xmem.active===true,
   'Nur aktive XMEM-Archive der Version 6 können so geprüft werden. Kein Restore.');
  check(manifest.scope?.complete||manifest.scope?.selected?.melodicProjects,
   'XMEM-Projektbibliothek wurde im Archiv nicht ausgewählt.');
  check(manifest.names.includes(XMEM_REPO),'Kanonischer XMEM-Speicher fehlt.');
  const marker=manifest.storage.local.find(([k])=>k===XMEM_MARKER),
   legacy=manifest.storage.local.find(([k])=>k===XMEM_LEGACY),
    releasedArchive=manifest.xmem?.released===true,
    releaseWitness=manifest.storage.local.find(([k])=>k==='xensonar.xmem.release01.melodic.v1');
   if(releasedArchive){
    check(manifest.version===7&&marker&&!legacy&&releaseWitness,
      'XMEM-v7: Authority oder Release-Zeuge fehlt beziehungsweise Legacy ist wieder vorhanden');
   }else check(manifest.version===6&&marker&&legacy&&!releaseWitness,
    'XMEM-v6: Authority-Marker oder ursprüngliche Legacy-Kopie fehlt');
  let parsedMarker;
  try{parsedMarker=JSON.parse(marker[1])}catch{fail('Authority-Marker-JSON beschädigt.')}
  check(parsedMarker&&parsedMarker.version===1&&parsedMarker.mode==='indexeddb'&&
   parsedMarker.db===XMEM_REPO&&parsedMarker.source==='xmem02c2-test',
   'Authority-Marker im Archiv unvereinbar.');
  const refs=new Set(),seenSampleKeys=new Set(),sampleAssets=new Map(),recordLines=[],ids=new Set(),ordinals=new Set();
  let head=null,live=0,tombstones=0,charCount=0,recordCount=0,currentDB=null,currentStore=null,
   repoSchema=null,hasHeadStore=false,hasRecordStore=false,attachedAssets=0;
  const sampleRx=/^(?:melodic-sample:|sample:)(.+)$/;
  function collectRefs(v){
   const seen=new WeakSet();
   function visit(x,depth){
    if(depth>64)fail('Unzulässig tiefe Projekt-Referenzstruktur.');
    if(typeof x==='string'){
     const m=sampleRx.exec(x);
     if(m){check(m[1].length>0&&m[1].length<512,'Ungültige Sample-Referenz.');refs.add(m[1]);}
     return;
    }
    if(!x||typeof x!=='object'||seen.has(x))return;
    seen.add(x);if(ArrayBuffer.isView(x)||x instanceof Blob||x instanceof ArrayBuffer)return;
    if(Array.isArray(x)){for(const y of x)visit(y,depth+1);return}
    for(const [key,value]of Object.entries(x))if(!/^(dataBase64|base64|fileName|name|description)$/.test(key)){
     if(/^(sampleId|melodicSampleId|sourceSampleId)$/i.test(key)&&typeof value==='string'){
      const id=value.replace(/^(?:sample:|melodic-sample:)/,'');
      check(id.length>0&&id.length<512,'Ungültiger Sample-Identifier.');refs.add(id);
     }
     visit(value,depth+1);
    }
   }
   visit(v,0);
  }
  // Pass 2 invokes the original P4 decoder with a callback for each decoded
  // record. Big binary payloads are *not retained*; only identifiers and hashes.
  await walk(src,{
   database:async schema=>{
    currentDB=schema.name;repoSchema=currentDB===XMEM_REPO?schema:repoSchema;
    if(currentDB===XMEM_REPO){
     check(schema.version===1,'XMEM-Repository-Datenbankschema inkompatibel.');
     const needed=['control','records'];
     for(const name of needed){const s=schema.stores.find(v=>v.name===name);
      check(s&&s.keyPath==='id'&&!s.autoIncrement&&!s.indexes.length,
       'XMEM-Repository-Schema für '+name+' unerwartet.');
     }
     check(schema.stores.length===2,'XMEM-Repository enthält unerwartete Stores.');
    }
   },
   store:async name=>{currentStore=name;if(currentDB===XMEM_REPO){
    if(name==='control')hasHeadStore=true;if(name==='records')hasRecordStore=true;
   }},
   record:async row=>{
    const key=row?.key,value=row?.value;
    if(currentDB==='xensonar-melodic-samples'&&typeof key==='string'){
     if(value?.id!==undefined)check(value.id===key,'Sample-ID und Archivschlüssel widersprechen sich.');
     check(!seenSampleKeys.has(key),'Doppelter Melodic-Sample-Schlüssel im Archiv.');
     seenSampleKeys.add(key);sampleAssets.set(key,{hasBlob:value?.blob instanceof Blob,size:value?.blob instanceof Blob?value.blob.size:0});attachedAssets++;
    }
    if(currentDB!==XMEM_REPO)return;
    if(currentStore==='control'){
     check(key==='head'&&value?.id==='head'&&!head,'Doppelter/ungültiger XMEM-Control-Head.');
     head=value;return;
    }
    check(currentStore==='records','Unbekannter XMEM-Store.');
    const r=value;
    check(typeof key==='string'&&r?.id===key&&key.length>0&&!ids.has(key),
     'Projekt-ID/Schlüssel fehlt, stimmt nicht oder ist doppelt.');ids.add(key);
    check(Number.isSafeInteger(r.revision)&&r.revision>=1&&Number.isSafeInteger(r.ordinal)&&r.ordinal>=0&&
     typeof r.deleted==='boolean','XMEM-Projektrecord beschädigt.');
    if(r.deleted){
     check(r.json===null&&r.sha256===null,'Beschädigter Tombstone.');tombstones++;
    }else{
     check(typeof r.json==='string'&&typeof r.sha256==='string','Projekt-JSON oder SHA fehlt.');
     charCount+=r.json.length;check(charCount<=16*1024*1024,'XMEM-Projektbibliothek überschreitet Speichervertrag.');
     check(await hash(r.json)===r.sha256,'Projekt-SHA-256 stimmt nicht.');
     let project;try{project=JSON.parse(r.json)}catch{fail('Projekt-JSON unlesbar.')}
     check(project&&project.id===key&&project.composer&&Array.isArray(project.composer.tracks),
      'Musikalische Projektidentität oder Tracks fehlen.');
     check(!ordinals.has(r.ordinal),'Doppelte Projektposition.');ordinals.add(r.ordinal);
     collectRefs(project);live++;
    }
    recordCount++;check(recordCount<=10000,'Zu viele XMEM-Projektrecords.');
    recordLines.push({id:r.id,revision:r.revision,ordinal:r.ordinal,deleted:r.deleted,sha256:r.sha256});
   },
   databaseEnd:async()=>{currentStore=null;currentDB=null;}
  });
  check(repoSchema&&hasHeadStore&&hasRecordStore&&head,
   'XMEM-Repository ist nicht vollständig.');
  check(head.version===2&&head.authority==='xmem-epoch-retained-test-v2'&&
   head.epoch?.version===1&&head.epoch.phase==='retained'&&typeof head.epoch.id==='string'&&
   head.epoch.id.length>0,'Nur ein vollständiger RETAINED-Epoch-v2-Head wird akzeptiert.');
  check(head.revision===manifest.xmem.revision&&head.version===manifest.xmem.headVersion&&
   head.count===manifest.xmem.count&&head.contentDigest===manifest.xmem.digest&&
   head.epoch.id===manifest.xmem.epochId&&manifest.xmem.phase==='retained',
   'Archiv-Zeuge und XMEM-Head stimmen nicht überein.');
  check(head.count===live&&live<=5000&&recordCount===ids.size,
   'XMEM-Projektanzahl oder Recordinventar widersprüchlich.');
  const ordered=recordLines.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  const ledgerText=ordered.map(r=>JSON.stringify([r.id,r.revision,r.ordinal,r.deleted,r.sha256])).join('\n');
  check(await hash(ledgerText)===head.contentDigest,'XMEM-Head und Projektledger-Digest widersprechen sich.');
  if(releasedArchive){
    check(head.epoch.sourceHash===head.legacyHash&&head.epoch.backupHash===head.legacyHash&&
      typeof head.epoch.sourceDigest==='string'&&Number.isSafeInteger(head.epoch.sourceRevision)&&
      Number.isSafeInteger(head.epoch.backupLength)&&head.epoch.backupLength>=0,
      'XMEM-v7: Epoch-Backup-Zeuge widerspricht der ursprünglichen Quelle');
    let witness;try{witness=JSON.parse(releaseWitness[1])}catch{fail('XMEM-v7: Freigabezeuge beschädigt')}
    check(witness?.version===1&&witness.area==='melodic'&&witness.phase==='released'&&
      witness.legacyKey===XMEM_LEGACY&&witness.db===XMEM_REPO&&
      typeof witness.nonce==='string'&&!!witness.nonce&&
      witness.sourceHash===head.legacyHash&&manifest.xmem.sourceHash===head.legacyHash&&
      manifest.xmem.headVersion===2&&manifest.xmem.phase==='retained',
      'XMEM-v7: Freigabezeuge stimmt nicht zum Projektledger');
   }else check(await hash(legacy[1])===head.legacyHash,'Legacy-SHA-256 passt nicht zum XMEM-Head.');
  for(const id of refs){
   check(seenSampleKeys.has(id),'Referenziertes Melodic-Sample fehlt im Archiv: '+id);
   const asset=sampleAssets.get(id);
   check(asset?.hasBlob&&asset.size>0,'Referenziertes Melodic-Sample ohne Audio-Blob: '+id);
  }
  // Target inspection does not call indexedDB.open(). Therefore no accidental
  // creation of an absent database and no mutation of the target profile.
  let targetState='UNKNOWN';
  if(typeof env.indexedDB?.databases==='function'){
   const databases=await env.indexedDB.databases();
   const existingRepo=databases.some(d=>d.name===XMEM_REPO);
   if(existingRepo||env.localStorage.getItem(XMEM_MARKER)!==null)targetState='EXISTING_AUTHORITY_OR_REPOSITORY';
   else if(databases.some(d=>dbKey(d.name))||localRows(env.localStorage).length||localRows(env.sessionStorage).length)
    targetState='OTHER_DATA_PRESENT';
   else targetState='EMPTY';
  }
  return Object.freeze({schema:'pkg-xmem02a-readonly-preview-v1',mode:'READ_ONLY_RESTORE_PREFLIGHT',
   archiveVerified:true,commitAllowed:false,projectCount:live,tombstoneCount:tombstones,
   archiveRecords:manifest.records,archiveDatabases:manifest.databases,
   sampleRefs:refs.size,attachedSampleRecords:attachedAssets,
   headRevision:head.revision,headVersion:head.version,epochPhase:head.epoch.phase,legacyReleased:releasedArchive,
   ledgerSha256:head.contentDigest,targetState,
   warning:'NO RESTORE PERFORMED. Audio playback, full asset roundtrip and crash-safe commit still unverified.'});
  }finally{inPreview=false;if(!internal)busy=false}
 }

 function localRows(storage){const rows=[];for(let i=0;i<storage.length;i++){const k=storage.key(i);if(dataKey(k))rows.push([k,storage.getItem(k)])}return rows.sort((a,b)=>a[0].localeCompare(b[0]))}
 function schema(db){return {name:db.name,version:db.version,stores:Array.from(db.objectStoreNames,name=>{const s=db.transaction(name).objectStore(name);return {name,keyPath:s.keyPath,autoIncrement:s.autoIncrement,indexes:Array.from(s.indexNames,name=>{const i=s.index(name);return{name,keyPath:i.keyPath,unique:i.unique,multiEntry:i.multiEntry}})}})}}
 async function nextRecord(db,store,after,first){return tx(db,store,'readonly',(s,set)=>{const q=s.openCursor(first?null:IDBKeyRange.lowerBound(after,true));q.onsuccess=()=>{const c=q.result;set(c?{key:c.primaryKey,value:c.value}:null)}})}
 // Build an index of KEYS before reading values. Unselected audio records are not
 // materialized. Follow references from selected roots, retaining one record at a time.
 async function selectionPlan(selection,runtime){
  if(selection==null)return null;
  const scope=__XenPackageSelection41.scope(selection);check(Object.values(scope.selected).some(Boolean),'Mindestens eine Rubrik auswählen.');
  if(scope.complete)return {scope,runtime};
  const initialLocal=localRows(env.localStorage),initialSession=localRows(env.sessionStorage);
  const entries=await inventory(),rows=[],byID=new Map(),queue=[];
  const addIndex=(id,value)=>{const list=byID.get(id)??[];list.push(value);byID.set(id,list)};
  const include=row=>{if(row.included)return;row.included=true;queue.push(row)};
  for(const entry of entries){const db=await open(entry.name);try{for(const store of db.objectStoreNames){
   const keys=await tx(db,store,'readonly',(s,set)=>{const found=[],q=s.openKeyCursor();q.onsuccess=()=>{const c=q.result;if(!c){set(found);return}found.push(c.primaryKey);c.continue()}});
   for(const key of keys){const category=__XenPackageSelection41.recordCategory(entry.name,store,key),row={db:entry.name,store,key,category,included:false};rows.push(row);if(typeof key==='string')addIndex(key,row);if(scope.selected[category])include(row)}
  }}finally{db.close()}}
  const localRowsByStorage={local:initialLocal,session:initialSession},locals=[];
  const objectIDs=value=>{const ids=new Set(),seen=new WeakSet();function visit(v){if(!v||typeof v!=='object'||seen.has(v))return;seen.add(v);if(typeof v.id==='string')ids.add(v.id);for(const x of Object.values(v))visit(x)}visit(value);return ids};
  for(const [storage,list] of Object.entries(localRowsByStorage))for(const [key,text]of list){const category=__XenPackageSelection41.keyCategory(key),row={storage,key,text,category,included:false};locals.push(row);try{for(const id of objectIDs(JSON.parse(text)))addIndex(id,row)}catch{}if(scope.selected[category])include(row)}
  const explicit=(id,context)=>{
   let candidates=[];
   if(id.startsWith('melodic-sample:')||id.startsWith('sample:')){
    const key=id.slice(id.startsWith('sample:')?7:15);candidates=(byID.get(key)??[]).filter(r=>r.db==='xensonar-melodic-samples');check(candidates.length,'Benötigtes Sample fehlt im Browserspeicher: '+key);
   }else if(id.startsWith('asset:')){
    const namespaces=['xensonar-spectral-forge-experiment-state','xensonar-spectral-forge-material-intake-v1'];const owner=namespaces.includes(context)?context:null;
    candidates=(byID.get(id)??[]).filter(r=>owner?r.db===owner:namespaces.includes(r.db));check(candidates.length,'Benötigte Audioquelle fehlt im Browserspeicher: '+id);
   }else{
    let key=id;if(/^(nodal|entrophon):/.test(id))key=id.slice(id.indexOf(':')+1).split('@')[0];
    if(key.length<6)return;
    candidates=(byID.get(key)??[]).filter(r=>!['sampleMirror','sessionMirror','otherDatabases','recovery'].includes(r.category));
   }
   for(const row of candidates)include(row);
  };
  function references(value,context){
   const seen=new WeakSet();
   function visit(v,path=[]){
    if(typeof v==='string'){
     const last=path.at(-1),parent=path.at(-2),grandparent=path.at(-3);
     const drumRef=last==='drumConfigId'||(last==='configId'&&parent==='selection'&&grandparent==='drumWorkspace');
     const drumSample=last==='id'&&/^sample[1-6]$/.test(parent||'')&&grandparent==='sampleSlots';
     if(v&&drumRef){
      const needed=(byID.get(v)??[]).filter(row=>row.db==='xensonar-drum-config-library');
      check(needed.length>0,'Verknüpftes Drum-Pattern fehlt im Browserspeicher: '+v);
      for(const row of needed)include(row);
      return;
     }
     if(v&&drumSample){
      const needed=(byID.get(v)??[]).filter(row=>row.db==='xensonar-melodic-samples');
      check(needed.length>0,'Benötigtes Drum-Sample fehlt im Browserspeicher: '+v);
      for(const row of needed)include(row);
      return;
     }
     if(v.length<2048)explicit(v,context);return;
    }
    if(!v||typeof v!=='object'||seen.has(v)||v instanceof Blob||v instanceof ArrayBuffer||ArrayBuffer.isView(v))return;
    seen.add(v);
    for(const [key,x] of Object.entries(v))if(!/^(dataBase64|base64|fileName|name|description)$/.test(key))visit(x,[...path,key]);
   }
   visit(value);
  }
  const chosenRuntime={};if(scope.selected.currentEditor&&runtime?.melodic)chosenRuntime.melodic=runtime.melodic;if(scope.selected.currentMain&&runtime?.main)chosenRuntime.main=runtime.main;references(chosenRuntime,null);
  for(let index=0;index<queue.length;index++){
   checkAbort();const row=queue[index];if(row.storage){try{references(JSON.parse(row.text),null)}catch(e){if(e?.message?.startsWith('Paketstation:'))throw e}}
   else {if(['sampleMirror','sessionMirror'].includes(row.category))continue;const db=await open(row.db);try{let value=await tx(db,row.store,'readonly',(s,set)=>{const q=s.get(row.key);q.onsuccess=()=>set(q.result)});check(value!==undefined,'Datensatz wurde während der Sicherung geändert.');references(value,row.db);value=null}finally{db.close()}}
   if(index%16===0){trace('selection-dependencies',{count:index+1});await yieldUI()}
  }
  scope.localDependencies={local:[],session:[]};for(const row of locals)if(row.included&&!scope.selected[row.category])scope.localDependencies[row.storage].push(row.key);
  const selectedRows=rows.filter(r=>r.included),selectedLocal={local:[],session:[]};for(const row of locals)if(row.included)selectedLocal[row.storage].push([row.key,row.text]);
  trace('selection-ready',{records:selectedRows.length,count:locals.filter(r=>r.included).length});
  return {scope,runtime:chosenRuntime,rows:selectedRows,local:selectedLocal,snapshot:{local:initialLocal,session:initialSession}};
 }
 function mergeDependencyLocal(previous,incoming){
  if(previous==null)return incoming;if(previous===incoming)return previous;
  try{
   const a=JSON.parse(previous),b=JSON.parse(incoming);
   const mergeList=(x,y)=>{if(!x.every(v=>v&&typeof v.id==='string')||!y.every(v=>v&&typeof v.id==='string'))return null;const map=new Map(x.map(v=>[v.id,v]));for(const v of y)map.set(v.id,v);return [...map.values()]};
   if(Array.isArray(a)&&Array.isArray(b)){const rows=mergeList(a,b);if(rows)return JSON.stringify(rows)}
   if(a&&b&&!Array.isArray(a)&&!Array.isArray(b)&&Array.isArray(a.entries)&&Array.isArray(b.entries)){const entries=mergeList(a.entries,b.entries);if(entries)return JSON.stringify({...a,...b,entries})}
   // Unknown dependency shapes may not silently replace an unchecked category.
   fail('Benötigte Bibliothek unterscheidet sich im Zielbrowser. Die zugehörige Rubrik ausdrücklich mit auswählen.');
  }catch(e){if(e?.message?.startsWith('Paketstation:'))throw e;fail('Benötigte Bibliothek kann nicht sicher zusammengeführt werden. Zugehörige Rubrik mit auswählen.')}
 }
 async function writeArchive(sink,runtime=null,validate=()=>{},plan=null){
  const xmem=globalThis.__XMEM_MR03_ENABLE_MELODIC__===true?await xmemWitness():null;
  if(globalThis.__XMEM_MR03_ENABLE_MELODIC__===true)check(xmem?.active&&xmem?.headVersion===2&&xmem.phase==='retained',
    'MR03C Melodic IDB must be active, retained and independently verified.');
  check(!plan?.xmem||xmemSame(plan.xmem,xmem),'XMEM-Repository seit der Auswahl verändert.');
  const w=await writer(sink),allLocal=localRows(env.localStorage),allSession=localRows(env.sessionStorage),allDBs=await inventory(),partial=plan&&!plan.scope.complete,local=partial?plan.local.local:allLocal,session=partial?plan.local.session:allSession,dbs=partial?allDBs.filter(d=>plan.rows.some(r=>r.db===d.name)):allDBs;
  if(partial)check(JSON.stringify(plan.snapshot.local)===JSON.stringify(allLocal)&&JSON.stringify(plan.snapshot.session)===JSON.stringify(allSession),'Arbeitsstand wurde während der Sicherung geändert.');
  const xmemArchived=!!xmem?.active&&xmem.available&&dbs.some(d=>d.name===XMEM_REPO);
  const headerVersion=xmemArchived?6:(plan?5:4);
   const xmemArchive=xmemArchived?{schema:1,db:XMEM_REPO,active:xmem.active,released:!!xmem.released,sourceHash:xmem.legacyHash,
   revision:xmem.revision,digest:xmem.digest,count:xmem.count,headVersion:xmem.headVersion,
   epochId:xmem.epochId,phase:xmem.phase}:undefined;
  await w.json({kind:'header',schema:'xensonar.browser-workspace',version:headerVersion,
   createdAt:new Date().toISOString(),databases:dbs.length,scope:plan?.scope??(xmemArchived?__XenPackageSelection41.scope(__XenPackageSelection41.all()):undefined),xmem:xmemArchive});
  await w.json({kind:'storage'});await encode(w,{local,session});
  await w.json({kind:'runtime'});await encode(w,plan?plan.runtime:runtime);
  for(const entry of dbs){checkAbort();const db=await open(entry.name);try{
   await w.json({kind:'database',schema:schema(db)});stats.databases++;trace('database-start',{count:stats.databases});
   for(const store of db.objectStoreNames){await w.json({kind:'store',name:store});let after,first=true,count=0;
    const selected=partial?plan.rows.filter(r=>r.db===entry.name&&r.store===store):null;
    while(true){let row;if(partial){const item=selected[count];if(!item)break;const value=await tx(db,store,'readonly',(s,set)=>{const q=s.get(item.key);q.onsuccess=()=>set(q.result)});check(value!==undefined,'Datensatz wurde während der Sicherung geändert.');row={key:item.key,value}}
     else row=await nextRecord(db,store,after,first);
     if(!row)break;after=row.key;first=false;await w.json({kind:'record'});await encode(w,row);row=null;stats.records++;count++;if(count%8===0){trace('records-written',{records:stats.records,bytes:stats.bytes});await yieldUI()}}
    await w.json({kind:'store-end',count});
   }await w.json({kind:'database-end'});
  }finally{db.close()}}
  check(JSON.stringify(allLocal)===JSON.stringify(localRows(env.localStorage))&&JSON.stringify(allSession)===JSON.stringify(localRows(env.sessionStorage)),'Arbeitsstand wurde während der Sicherung geändert. Bitte erneut sichern.');
  check(JSON.stringify((await inventory()).map(d=>d.name))===JSON.stringify(allDBs.map(d=>d.name)),'Datenbankinventar wurde während der Sicherung geändert.');
  if(xmem)check(xmemSame(xmem,await xmemWitness()),'XMEM-Repository während der Paketsicherung verändert; Export verworfen.');
  await w.json({kind:'end',databases:stats.databases,records:stats.records});validate();
  const saved=await w.finish();
  if(xmem)check(xmemSame(xmem,await xmemWitness()),'XMEM-Repository während der Paketsicherung verändert; Export verworfen.');
  return saved;
 }
 // First pass validates all framing/checksums/structure with no decoded PCM allocation.
 // Second pass restores ONE record at a time. IDs and reference strings are untouched.
 async function walk(src,apply=null){const r=reader(src);await r.init();let f=await r.next(),header=f.value;
  check(f.tag===1&&header.kind==='header'&&header.schema==='xensonar.browser-workspace'&&[4,5,6].includes(header.version),'Unbekannte Paketversion.');
  if(header.version>=5){check(header.scope?.version===1,'Inhaltsauswahl fehlt.');const normalized=__XenPackageSelection41.scope(header.scope.selected);check(normalized.complete===header.scope.complete,'Inhaltsauswahl ist widersprüchlich.');for(const name of ['local','session'])check(Array.isArray(header.scope.localDependencies?.[name]??[]),'Ungültige Bibliotheksabhängigkeiten.')}
  if(header.version>=6)check(header.xmem?.schema===1&&header.xmem.db===XMEM_REPO&&
   Number.isSafeInteger(header.xmem.revision)&&typeof header.xmem.digest==='string'&&
   Number.isSafeInteger(header.xmem.count)&&typeof header.xmem.active==='boolean'&&
    header.xmem.released!==true,
    'XMEM-Archivkopf beschädigt oder unvollständig.');
  const names=new Set(),schemas=[];let databases=0,records=0,current=null,store=null,count=0,storage=null,runtime=null;
  f=await r.next();check(f.value?.kind==='storage','Speicherinventar fehlt.');storage=await decode(r,true);
  check(storage&&['local','session'].every(k=>Array.isArray(storage[k])&&storage[k].every(a=>Array.isArray(a)&&a.length===2&&dataKey(a[0])&&typeof a[1]==='string')),'Ungültiger Browserspeicher.');
  for(const k of ['local','session'])check(new Set(storage[k].map(a=>a[0])).size===storage[k].length,'Doppelte Speicherschlüssel.');
  f=await r.next();check(f.value?.kind==='runtime','Aktueller Arbeitsstand fehlt.');runtime=await decode(r,!!apply);
  while(true){f=await r.next();check(f.tag===1,'Unerwarteter Datenblock.');const v=f.value;
   if(v.kind==='database'){
    check(!current&&dbKey(v.schema?.name)&&!names.has(v.schema.name),'Ungültige oder doppelte Datenbank.');names.add(v.schema.name);current=v.schema;schemas.push(current);
    check(Number.isSafeInteger(current.version)&&current.version>=1&&Array.isArray(current.stores),'Ungültiges Datenbankschema.');
    const sn=new Set();for(const s of current.stores){check(s&&typeof s.name==='string'&&!sn.has(s.name)&&Array.isArray(s.indexes),'Ungültiger Objektspeicher.');sn.add(s.name);check(s.keyPath===null||typeof s.keyPath==='string'||Array.isArray(s.keyPath)&&s.keyPath.every(x=>typeof x==='string'),'Ungültiger Schlüsselpfad.');check(typeof s.autoIncrement==='boolean','Ungültiger Schlüsselgenerator.');const ix=new Set();for(const i of s.indexes){check(typeof i.name==='string'&&!ix.has(i.name)&&typeof i.unique==='boolean'&&typeof i.multiEntry==='boolean','Ungültiger Index.');ix.add(i.name)}}
    current._stores=new Set();await apply?.database?.(current);databases++;trace('database-validated',{count:databases});
   }else if(v.kind==='store'){
    check(current&&!store&&current.stores.some(x=>x.name===v.name)&&!current._stores.has(v.name),'Ungültige Speicherreihenfolge.');store=v.name;current._stores.add(store);count=0;await apply?.store?.(store);
   }else if(v.kind==='record'){
    check(current&&store!==null,'Datensatz außerhalb eines Speichers.');const row=await decode(r,!!apply);if(apply){check(row&&Object.hasOwn(row,'key')&&Object.hasOwn(row,'value'),'Ungültiger Datensatz.');await apply.record(row)}records++;count++;if(records%8===0){trace('records-validated',{records,bytes:r.offset});await yieldUI()}
   }else if(v.kind==='store-end'){check(store!==null&&v.count===count,'Anzahl der Datensätze stimmt nicht.');store=null}
   else if(v.kind==='database-end'){check(current&&store===null&&current._stores.size===current.stores.length,'Datenbank unvollständig.');await apply?.databaseEnd?.();current=null}
   else if(v.kind==='end'){check(!current&&store===null&&v.databases===databases&&v.records===records&&header.databases===databases,'Archivinventar stimmt nicht.');break}
   else fail('Unbekannter Archivabschnitt.');
  }
  f=await r.next();check(f.tag===3,'Archivabschluss fehlt.');
  if(header.version>=6){
    check(names.has(XMEM_REPO),'XMEM-Archiv ohne kanonisches Repository.');
    if(header.xmem.active){
     check(storage.local.some(([k])=>k===XMEM_MARKER),
       'XMEM-Archiv ohne Authority-Marker.');
     if(header.version===7)check(
       storage.local.some(([k])=>k==='xensonar.xmem.release01.melodic.v1')&&
       !storage.local.some(([k])=>k===XMEM_LEGACY),
       'XMEM-v7 braucht kleinen Freigabezeugen statt Legacy-JSON.');
     else check(storage.local.some(([k])=>k===XMEM_LEGACY),
       'XMEM-v6-Archiv ohne originale Legacy-Rückfallquelle.');
    }
   }
  return {version:header.version,storage,runtime,databases,records,names:[...names],schemas,scope:header.scope??null,xmem:header.xmem??null};
 }
 function resetStats(){for(const k of Object.keys(stats))stats[k]=0}
 async function exportSpool(name,runtime,validate,plan){resetStats();const out=await spool(name,true);try{return await writeArchive(out,runtime,validate,plan)}catch(e){await out.abort();throw e}}
 function filename(label){return (String(label||'XenSonar_Workspace').replace(/[^\p{L}\p{N}._-]+/gu,'_').slice(0,90)||'XenSonar_Workspace')+'_'+new Date().toISOString().replace(/[:.]/g,'-')+'.xenpack'}
 async function multipart(src,name){
  check(dialog,'Browser ohne Dateistream benötigt den Paketstationsdialog.');trace('multipart-download',{bytes:src.size});
  const limit=32*1024*1024,parts=Math.ceil(src.size/limit);dialog.cancel.disabled=false;
  for(let i=0;i<parts;i++){
   checkAbort();const blob=await src.slice(i*limit,Math.min(limit,src.size-i*limit)),url=URL.createObjectURL(blob);
   try{await new Promise((resolve,reject)=>{
    dialog.text.textContent='Save part '+(i+1)+' / '+parts+' · Select all parts together when importing.';
    const link=env.document.createElement('a');link.textContent='Save part '+(i+1)+' and continue';link.href=url;link.download=name+'.'+String(i+1).padStart(4,'0');link.style.cssText='display:block;margin:15px 0;color:#6de8ee';
    link.onclick=()=>{link.style.pointerEvents='none';setTimeout(()=>{link.remove();resolve()},1000)};dialog.actions.prepend(link);dialog.cancel.onclick=()=>{aborted=true;link.remove();reject(Error('Paketstation: Download abgebrochen.'))};
   })}finally{URL.revokeObjectURL(url)}
  }
 }
 async function prepare(options={}){
  if(__xmemRootPilotEarly())throw Error('XMEM-MR03C Root-IDB pilot: Product backup is blocked.');
  if(globalThis.__XMEM_MR03_ENABLE_MELODIC__===true){
   check(options.__allowXmemLabExport===true&&options.confirmTestExport===true,'MR03C: Produkt-Backup ist gesperrt; nur ausdrücklich bestätigter Testexport ohne Restore-Freigabe.');
   check(options.selection==null||__XenPackageSelection41.scope(options.selection).complete,'MR03C: selektive XMEM-Projektsicherung ist noch gesperrt.');
  }
  if(options.selection!=null)check(Object.values(__XenPackageSelection41.normalize(options.selection)).some(Boolean),'Mindestens eine Rubrik auswählen.');
  check(!busy,'Ein Vorgang läuft bereits.');busy=true;aborted=false;const done=progress('Package Station · Backup');hooks.trace?.begin();trace('operation-begin');
  let saved,chosen=options._chosen??null;
  try{
   // Must be invoked while the header button's user activation is still alive.
   if(!chosen&&typeof env.showSaveFilePicker==='function')chosen=await env.showSaveFilePicker({suggestedName:filename(options.packageLabel),types:[{description:'XenSonar workspace',accept:{'application/octet-stream':['.xenpack']}}]});
   trace('snapshot-flush');await hooks.flush?.(options.selection);await yieldUI();const runtime=await hooks.capture?.(options.selection)??null;
   let plan;
   let writes=0;const proto=env.IDBObjectStore?.prototype,originals={};if(proto)for(const method of ['add','put','delete','clear']){originals[method]=proto[method];proto[method]=function(...args){if(dbKey(this.transaction.db.name))writes++;return originals[method].apply(this,args)}}
   try{
    plan=await selectionPlan(options.selection,runtime);
    if(chosen){resetStats();const stream=await chosen.createWritable();let position=0;const sink={async write(bytes){checkAbort();await stream.write(bytes);position+=bytes.byteLength},async close(){await stream.close();const file=await chosen.getFile();return {...source(file),kind:'direct',size:position,remove:async()=>{}}},abort:async()=>{try{await stream.abort()}catch{}}};
     try{saved=await writeArchive(sink,runtime,()=>check(writes===0,'Arbeitsstand wurde während der Sicherung geändert.'),plan)}catch(e){await sink.abort();throw e}
    }else saved=await exportSpool('export',runtime,()=>check(writes===0,'Arbeitsstand wurde während der Sicherung geändert.'),plan);
    check(writes===0,'Datenbank wurde während der Sicherung geändert. Bitte nach Abschluss laufender Speichervorgänge erneut sichern.')}finally{if(proto)for(const [k,v]of Object.entries(originals))proto[k]=v}
   trace('archive-written-'+saved.kind,{bytes:saved.size,records:stats.records});trace('archive-verify',{bytes:saved.size,records:stats.records});const verified=await walk(saved);
   let semantic=null;
   if(globalThis.__XMEM_MR03_ENABLE_MELODIC__===true){
    const virtualFile={size:saved.size,slice:(start,end)=>({arrayBuffer:async()=> (await saved.slice(start,end-start)).arrayBuffer()})};
    semantic=await previewRestore(virtualFile,true);
    check(semantic.archiveVerified&&semantic.commitAllowed===false&&
       semantic.projectCount===verified.xmem.count&&semantic.epochPhase==='retained',
       'MR03C: source/archived Melodic ledger divergence, export refused.');
   }
   const name=filename(globalThis.__XMEM_MR03_ENABLE_MELODIC__===true?'XMEM_MR03C_TEST_EXPORT_ONLY_RESTORE_NOT_APPROVED':options.packageLabel);
   if(saved.kind==='direct'){trace('backup-verified',{bytes:saved.size,records:verified.records});hooks.trace?.finish({bytes:saved.size,records:verified.records});return {saved:true,byteLength:saved.size,filename:chosen.name,statusMessage:semantic?'XMEM MR03C TEST EXPORT ONLY — RESTORE NOT APPROVED.':undefined}}
   if(saved.kind==='opfs'){
    const url=URL.createObjectURL(saved.file);trace('backup-verified',{bytes:saved.size,records:verified.records});hooks.trace?.finish({bytes:saved.size,records:verified.records});
    return {download:{url,byteLength:saved.size,filename:name,extension:'.xenpack',createdAt:new Date().toISOString()},statusMessage:semantic?'XMEM MR03C TEST EXPORT ONLY — RESTORE NOT APPROVED.':plan&&!plan.scope.complete?'Selected workspace content verified.':'Full workspace backup verified.'};
   }
   if(saved.size<=32*1024*1024){const blob=await saved.slice(0,saved.size),url=URL.createObjectURL(blob);await saved.remove();trace('backup-verified',{bytes:saved.size,records:verified.records});hooks.trace?.finish({bytes:saved.size,records:verified.records});return {download:{url,byteLength:blob.size,filename:name,extension:'.xenpack',createdAt:new Date().toISOString()},statusMessage:semantic?'XMEM MR03C TEST EXPORT ONLY — RESTORE NOT APPROVED.':undefined}}
   await multipart(saved,name);await saved.remove();trace('backup-verified',{bytes:saved.size,records:verified.records});hooks.trace?.finish({bytes:saved.size,records:verified.records});return {saved:true,byteLength:saved.size,statusMessage:'All backup parts downloaded.'};
  }catch(e){if(saved)await saved.remove().catch(()=>{});if(e?.name==='AbortError'){trace('operation-cancelled');hooks.trace?.fail(e);return {cancelled:true}}
   if(/während der Sicherung geändert/.test(String(e?.message))&&(options._retry??0)<2){trace('snapshot-retry');hooks.trace?.fail(e);await new Promise(r=>setTimeout(r,500));done();busy=false;return await prepare({...options,_retry:(options._retry??0)+1,_chosen:chosen})}
   trace('operation-failed');hooks.trace?.fail(e);throw e}finally{done();busy=false}
 }
 async function copyTo(src,name){const out=await spool(name,true);try{for(let i=0;i<src.size;i+=CHUNK)await out.write(await src.read(i,Math.min(CHUNK,src.size-i)));return await out.close()}catch(e){await out.abort();throw e}}
 async function applyArchive(src){
  if(__xmemRootPilotEarly()||globalThis.__XMEM_MR03_ENABLE_MELODIC__===true)throw Error('XMEM-MR03C APPLY BLOCKED: never mutate a selected IDB authority.');
  // A COMPLETE validation pass precedes deleting or changing any application data.
  const valid=await walk(src);if(valid.version>=6)throw Error('XMEM-MR03C APPLY BLOCKED: v6/v7 IDB restore owner is not accepted.');
  const existing=new Set((await inventory()).map(d=>d.name));let db=null,storeName=null,activeSchema=null;
  const partial=valid.scope&&!valid.scope.complete,selected=valid.scope?.selected;
  async function prune(storeDB,name){if(!partial){await tx(storeDB,name,'readwrite',s=>s.clear());return}await tx(storeDB,name,'readwrite',s=>{const q=s.openKeyCursor();q.onsuccess=()=>{const c=q.result;if(!c)return;const category=__XenPackageSelection41.recordCategory(storeDB.name,name,c.primaryKey);if(category!=='unusedAssets'&&selected[category])s.delete(c.primaryKey);c.continue()}})}
  const storagePlan=[[env.localStorage,valid.storage.local,'local'],[env.sessionStorage,valid.storage.session,'session']].map(([storage,rows,name])=>({storage,name,remove:localRows(storage).filter(([key])=>!partial||selected[__XenPackageSelection41.keyCategory(key)]).map(([key])=>key),rows:rows.map(([key,value])=>[key,partial&&!selected[__XenPackageSelection41.keyCategory(key)]?mergeDependencyLocal(storage.getItem(key),value):value])}));
  const shape=s=>JSON.stringify({name:s.name,version:s.version,stores:s.stores.map(x=>({name:x.name,keyPath:x.keyPath,autoIncrement:x.autoIncrement,indexes:x.indexes})).sort((a,b)=>a.name.localeCompare(b.name))});
  // Schema compatibility is checked for ALL existing databases before the first clear.
  for(const s of valid.schemas)if(existing.has(s.name)){const d=await open(s.name);try{check(shape(schema(d))===shape(s),'Speicherschema unterscheidet sich. Dieselbe XenSonar-Version im Zielbrowser verwenden.')}finally{d.close()}}
  trace('import-schemas-verified',{count:valid.schemas.length});
  try{const info=await walk(src,{
   database:async s=>{activeSchema=s;db=await open(s.name,existing.has(s.name)?undefined:s.version,d=>{for(const x of s.stores){const os=d.createObjectStore(x.name,{keyPath:x.keyPath,autoIncrement:x.autoIncrement});for(const i of x.indexes)os.createIndex(i.name,i.keyPath,{unique:i.unique,multiEntry:i.multiEntry})}})},
   store:async name=>{storeName=name;await prune(db,storeName)},
   record:async row=>{const desc=activeSchema.stores.find(x=>x.name===storeName);await tx(db,storeName,'readwrite',s=>desc.keyPath===null?s.put(row.value,row.key):s.put(row.value))},
   databaseEnd:async()=>{db.close();db=null}
  });
  // Empty absent target stores AFTER incoming writes. Keep their schema; deleting a
  // database can leave an uncancellable blocked request racing the rollback.
  trace('import-prune-start');
  for(const entry of await inventory())if(!valid.names.includes(entry.name)){const extra=await open(entry.name);try{for(const store of extra.objectStoreNames)await prune(extra,store)}finally{extra.close()}}
  trace('import-storage-start');
  for(const {storage,remove,rows}of storagePlan){for(const key of remove)storage.removeItem(key);for(const [key,value]of rows)storage.setItem(key,value)}
  let previousRuntime=null;if(partial){const preserved=await transportIO('files','readonly',(s,set)=>{const q=s.get('preserved-runtime');q.onsuccess=()=>set(q.result)});previousRuntime=preserved?.value??null}
  const runtime=Object.fromEntries(Object.entries({...previousRuntime,...info.runtime}).filter(([,v])=>v!=null));const hasRuntime=Object.keys(runtime).length>0;
  await transportIO('files','readwrite',s=>{if(hasRuntime)s.put({name:'runtime',value:runtime});else s.delete('runtime')});
  if(hasRuntime)env.localStorage.setItem(RUNTIME,'1');else env.localStorage.removeItem(RUNTIME);
  if(partial){for(const name of ['xensonar-melodic-metadata-m6','xensonar-meta-archive-m9'])if(existing.has(name)||valid.names.includes(name)){const mirror=await open(name);try{if(mirror.objectStoreNames.contains('control'))await tx(mirror,'control','readwrite',s=>s.clear())}finally{mirror.close()}}}
  trace('import-data-complete',{records:info.records});return info;
  }finally{db?.close()}
 }
 function observeWrites(){
  let writes=0;const proto=env.IDBObjectStore?.prototype,original={};
  if(proto)for(const method of ['add','put','delete','clear']){original[method]=proto[method];proto[method]=function(...args){if(dbKey(this.transaction.db.name))writes++;return original[method].apply(this,args)}}
  return {assert:()=>check(writes===0,'Arbeitsstand wurde während der Sicherung geändert. Bitte erneut versuchen.'),stop:()=>{if(proto)for(const [key,value]of Object.entries(original))proto[key]=value}};
 }
 async function captureRollbackSnapshot(){
  // Cold boot hydration/autosave may finish while a large incoming archive is
  // checked. Retake the entire rollback snapshot after a detected mutation;
  // never weaken its write fence or reuse an earlier runtime capture.
  for(let attempt=0;attempt<3;attempt++){
   checkAbort();await hooks.flush?.();await yieldUI();
   const runtime=await hooks.capture?.()??null,guard=observeWrites();
   try{
    await exportSpool('rollback',runtime,guard.assert);guard.assert();
    await walk(await spool('rollback'));checkAbort();return runtime;
   }catch(error){
    const changed=/während der Sicherung geändert|Datenbankinventar wurde.*geändert/.test(String(error?.message));
    if(!changed||attempt===2)throw error;
    trace('rollback-snapshot-retry',{attempt:attempt+1});
   }finally{guard.stop()}
   await new Promise(resolve=>setTimeout(resolve,500));
  }
 }
 async function prepareXmemLab(options={}){
  check(globalThis.__XMEM_MR03_ENABLE_MELODIC__===true&&!__xmemRootPilotEarly(),
   'MR03C only available in isolated Melodic test origin, never under Root pilot.');
  check(options.confirmTestExport===true, 'MR03C requires explicit confirmTestExport:true.');
  const owner=globalThis.XenSonarXMemMelodicCutoverTest;
  check(owner?.status()?.status==='active'&&owner.status().persistentSelected===true,
   'MR03C canonical persistent Melodic owner has not been activated.');
  const result=await prepare({...options,__allowXmemLabExport:true,confirmTestExport:true,
   packageLabel:'XMEM_MR03C_TEST_EXPORT_ONLY_RESTORE_NOT_APPROVED'});
  return Object.freeze({...result,productRestoreApproved:false,
   warning:'XMEM MR03C TEST EXPORT ONLY — RESTORE NOT APPROVED.'});
 }
 // RESTORE03D: disposable empty-origin cold restore laboratory only.
 // This method is intentionally NOT wired to Package Station UI, normal import,
 // startup or existing owner state. Never use against a user's real profile.
 const MR03D_JOURNAL='xensonar:package-station:mr03d:disposable-restore-v1';
 let mr03dWrittenInThisFactory=false;
 async function mr03dHash(bytes){
  const value=await env.crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(value),b=>b.toString(16).padStart(2,'0')).join('');
 }
 async function mr03dHashValue(value){
  const seen=new WeakMap();let next=1;
  async function visit(v,depth){
   check(depth<=128,'MR03D: archive record too deeply nested.');
   if(v===undefined)return ['undefined'];
   if(v===null||typeof v==='boolean'||typeof v==='string')return [typeof v,v];
   if(typeof v==='number')return ['number',Object.is(v,-0)?'-0':String(v)];
   if(typeof v==='bigint')return ['bigint',String(v)];
   check(typeof v==='object','MR03D: unsupported record type.');
   if(seen.has(v))return ['ref',seen.get(v)];
   const id=next++;seen.set(v,id);
   if(v instanceof Blob)return ['blob',id,v.type,v.size,
    typeof env.File==='function'&&v instanceof env.File?[v.name,v.lastModified]:null,
    await mr03dHash(await v.arrayBuffer())];
   if(v instanceof ArrayBuffer)return ['buffer',id,v.byteLength,await mr03dHash(v)];
   if(ArrayBuffer.isView(v))return ['view',id,v.constructor.name,v.byteOffset,v.byteLength,await mr03dHash(v.buffer.slice(v.byteOffset,v.byteOffset+v.byteLength))];
   if(v instanceof Date)return ['date',id,String(v.getTime())];
   if(v instanceof RegExp)return ['regexp',id,v.source,v.flags];
   if(v instanceof Map){const parts=[];for(const [k,x]of v)parts.push([await visit(k,depth+1),await visit(x,depth+1)]);return ['map',id,parts];}
   if(v instanceof Set){const parts=[];for(const x of v)parts.push(await visit(x,depth+1));return ['set',id,parts];}
   const parts=[];for(const k of Object.keys(v).sort())parts.push([k,await visit(v[k],depth+1)]);
   return [Array.isArray(v)?'array':'object',id,Array.isArray(v)?v.length:null,parts];
  }
  return mr03dHash(te.encode(JSON.stringify(await visit(value,0))));
 }
 function mr03dJournal(){
  const raw=env.localStorage.getItem(MR03D_JOURNAL);
  if(raw===null)return null;
  let j;try{j=JSON.parse(raw)}catch{fail('MR03D: unreadable restore intent; do not continue.');}
  check(j&&j.version===1&&typeof j.phase==='string','MR03D: malformed restore intent; do not continue.');
  return j;
 }
 function mr03dWriteJournal(j){
  env.localStorage.setItem(MR03D_JOURNAL,JSON.stringify(j));
  check(env.localStorage.getItem(MR03D_JOURNAL)===JSON.stringify(j),'MR03D: journal durability readback failed.');
 }
 function mr03dLabGate(options,mode){
  check(env.__XEN_PACKAGE_STATION_TEST__===true&&env.__XMEM_MR03D_DISPOSABLE_LAB__===true&&
   globalThis.__XMEM_MR03_ROOT_PILOT!==true&&globalThis.__XMEM_MR03_ENABLE_MELODIC__!==true,
   'MR03D: isolated disposable TEST environment required; production restore remains blocked.');
  check(options?.confirmDisposableLab===true,'MR03D: explicit disposable-lab confirmation required.');
  check(typeof env.indexedDB?.databases==='function'&&typeof env.navigator?.locks?.request==='function',
   'MR03D: native database inventory and exclusive Web Locks are mandatory.');
  check(typeof env.crypto?.subtle?.digest==='function','MR03D: WebCrypto unavailable.');
  check(!busy,'MR03D: another package operation is running.');
  if(mode==='write')check(!mr03dJournal(),'MR03D: previous/pending restoration detected; never overwrite it.');
 }
 async function mr03dReadback(j){
  check(j.phase==='awaiting_reopen'||j.phase==='verified_test_only','MR03D: not in readback phase.');
  const names=await env.indexedDB.databases();
  const own=names.filter(x=>dbKey(x.name));
  check(names.length===j.schemas.length&&own.length===j.schemas.length&&j.schemas.every(s=>own.some(d=>d.name===s.name&&d.version===s.version)),
   'MR03D: missing or unexpected database after reopen.');
  for(const scope of ['local','session']){
   const storage=scope==='local'?env.localStorage:env.sessionStorage;
   const actualKeys=localRows(storage).map(([k])=>k).sort();
   const expectedKeys=j.storage.filter(x=>x.scope===scope).map(x=>x.key).sort();
   check(JSON.stringify(actualKeys)===JSON.stringify(expectedKeys),
    'MR03D: extra or missing local/session data after reopen.');
  }
  for(const item of j.storage){
   const actual=(item.scope==='session'?env.sessionStorage:env.localStorage).getItem(item.key);
   check(actual!==null&&await mr03dHash(te.encode(actual))===item.hash,
    'MR03D: browser storage differs after reopen: '+item.key);
  }
  let count=0;
  for(const s of j.schemas){
   const db=await open(s.name);try{
    const live=schema(db);
    check(JSON.stringify(live)===JSON.stringify(s),'MR03D: schema changed for '+s.name);
    for(const storeName of s.stores.map(x=>x.name)){
     const expected=j.records.filter(x=>x.db===s.name&&x.store===storeName);
     const keys=await tx(db,storeName,'readonly',(store,set)=>{
      const result=[],q=store.openKeyCursor();q.onsuccess=()=>{const c=q.result;if(!c){set(result);return}result.push(JSON.stringify(c.primaryKey));c.continue()};
     });
     check(keys.length===expected.length&&new Set(keys).size===keys.length&&
      expected.every(x=>keys.includes(x.key)), 'MR03D: extra/missing records in '+s.name+'/'+storeName);
     for(const row of expected){
      const value=await tx(db,storeName,'readonly',(store,set)=>{
       const q=store.get(JSON.parse(row.key));q.onsuccess=()=>set(q.result);
      });
      check(value!==undefined&&await mr03dHashValue(value)===row.digest,
       'MR03D: record corruption after reopen at '+s.name+'/'+storeName+'/'+row.key);
      count++;
     }
    }
   }finally{db.close()}
  }
  check(count===j.records.length,'MR03D: incomplete restored record inventory.');
  const repo=await open(XMEM_REPO);try{
   const head=await tx(repo,'control','readonly',(store,set)=>{
    const q=store.get('head');q.onsuccess=()=>set(q.result);
   });
   check(head?.version===2&&head?.authority==='xmem-epoch-retained-test-v2'&&
    head?.contentDigest===j.ledger&&head?.count===j.count&&head?.revision===j.revision&&
    head?.epoch?.phase==='retained', 'MR03D: canonical Melodic head does not match archive.');
  }finally{repo.close()}
  return {verifiedRecords:count,databases:j.schemas.length,melodicProjects:j.count,ledger:j.ledger};
 }
 async function restoreXmemLab(file,options={}){
  mr03dLabGate(options,'write');
  check(file&&Number.isFinite(file.size)&&typeof file.slice==='function','MR03D: no archive file.');
  return env.navigator.locks.request('xensonar:xmem:workspace-writer:v1',
   {mode:'exclusive',ifAvailable:true},async lock=>{
    check(lock,'MR03D: another workspace writer owns the lock.');
    mr03dLabGate(options,'write');
    const prior=await env.indexedDB.databases();
    check(prior.length===0&&env.localStorage.length===0&&env.sessionStorage.length===0,
     'MR03D: target must be completely EMPTY before verification. No existing projects may be touched.');
    const proof=await previewRestore(file,true);
    check(proof.archiveVerified===true&&proof.commitAllowed===false&&proof.epochPhase==='retained'&&
      proof.targetState==='EMPTY','MR03D: independent archive preflight failed or target not empty.');
    let incoming;inPreview=true;try{incoming=await walk(source(file));}finally{inPreview=false}
    check(incoming.version===6&&incoming.scope?.complete===true&&incoming.xmem?.active===true&&
     incoming.xmem?.released!==true&&incoming.names.includes(XMEM_REPO),
     'MR03D: only complete active retained XENPACK-v6 is eligible.');
    check(incoming.records<=2000&&incoming.schemas.length<=30&&
     incoming.storage.local.length<=250&&incoming.storage.session.length<=250,
     'MR03D: disposable lab capacity bound exceeded; production restore not available.');
    const beforeCommit=await env.indexedDB.databases();
    check(beforeCommit.length===0&&env.localStorage.length===0&&env.sessionStorage.length===0,
      'MR03D: target changed while inspecting the archive.');
    const journal={version:1,phase:'intent',createdAt:new Date().toISOString(),
     ledger:proof.ledgerSha256,count:proof.projectCount,revision:proof.headRevision,
     schemas:incoming.schemas.map(s=>({name:s.name,version:s.version,stores:s.stores})),records:[],storage:[]};
    // Intent before first DB write. Any failure leaves a blocking marker.
    mr03dWriteJournal(journal);mr03dWrittenInThisFactory=true;
    let db=null,activeSchema=null,storeName=null;
    try{
     await walk(source(file),{
      database:async s=>{
       check(!db,'MR03D: nested database in archive.');activeSchema=s;
       db=await open(s.name,s.version,d=>{for(const spec of s.stores){
        const os=d.createObjectStore(spec.name,{keyPath:spec.keyPath,autoIncrement:spec.autoIncrement});
        for(const ix of spec.indexes)os.createIndex(ix.name,ix.keyPath,{unique:ix.unique,multiEntry:ix.multiEntry});
       }});
      },
      store:async name=>{storeName=name;},
      record:async row=>{
       const descriptor=activeSchema.stores.find(x=>x.name===storeName);
       check(descriptor&&row&&Object.hasOwn(row,'key')&&Object.hasOwn(row,'value'),
        'MR03D: malformed archive record.');
       const digest=await mr03dHashValue(row.value);
       await tx(db,storeName,'readwrite',s=>{
        if(descriptor.keyPath===null)s.put(row.value,row.key);
        else s.put(row.value);
       });
       journal.records.push({db:activeSchema.name,store:storeName,key:JSON.stringify(row.key),digest});
      },
      databaseEnd:async()=>{db.close();db=null;activeSchema=null;storeName=null;}
     });
     check(journal.records.length===incoming.records,'MR03D: incomplete record commit.');
     for(const [scope,items]of [['local',incoming.storage.local],['session',incoming.storage.session]]){
      const storage=scope==='local'?env.localStorage:env.sessionStorage;
      for(const [key,value]of items){
       check(key!==MR03D_JOURNAL,'MR03D: archive cannot overwrite restore intent.');
       storage.setItem(key,value);
       check(storage.getItem(key)===value,'MR03D: storage write readback failed: '+key);
       journal.storage.push({scope,key,hash:await mr03dHash(te.encode(value))});
      }
     }
     journal.phase='awaiting_reopen';mr03dWriteJournal(journal);
     return Object.freeze({status:'COLD_V6_LAB_APPLIED_VERIFY_AFTER_REOPEN',
      productRestoreApproved:false,expectedProjects:proof.projectCount,
      expectedRecords:journal.records.length,databases:journal.schemas.length,
      warning:'Dispose this test origin after independent reopen verification. Not a product restore.'});
    }catch(error){try{journal.phase='blocked';journal.failure=String(error?.message??error).slice(0,350);mr03dWriteJournal(journal)}catch{}
     throw error;
    }finally{try{db?.close()}catch{}}
   });
 }
 async function verifyXmemLab(options={}){
  mr03dLabGate(options,'read');
  check(!mr03dWrittenInThisFactory,'MR03D: readback must use a NEW package factory after reload.');
  return env.navigator.locks.request('xensonar:xmem:workspace-writer:v1',
   {mode:'exclusive',ifAvailable:true},async lock=>{
    check(lock,'MR03D: workspace writer lock unavailable.');
    const journal=mr03dJournal();
    check(journal&&journal.phase==='awaiting_reopen','MR03D: no verified-staging journal; broken restores stay blocked.');
    const checked=await mr03dReadback(journal);
    // Verifies persisted bytes but does not assert any audio E2E or productive restore.
    journal.phase='verified_test_only';mr03dWriteJournal(journal);
    return Object.freeze({...checked,status:'COLD_V6_LAB_READBACK_PASS_TEST_ONLY',productRestoreApproved:false,
     warning:'Browser-process restart, actual editor operations and audio have NOT been certified.'});
   });
 }
 async function importFiles(files,mode='replace'){
  if(__xmemRootPilotEarly()||globalThis.__XMEM_MR03_ENABLE_MELODIC__===true)throw Error('XMEM-MR03C RESTORE BLOCKED: v6 canonical IDB+assets cold restore not yet proven.');
  check(!busy,'Ein Vorgang läuft bereits.');check(!env.localStorage.getItem(JOURNAL),'Zuerst die ausstehende Wiederherstellung abschließen.');
  const sorted=[...files].sort((a,b)=>a.name.localeCompare(b.name));check(sorted.length>0,'Keine Datei gewählt.');
  if(sorted.length>1){const base=sorted[0].name.replace(/\.\d{4}$/,'');check(sorted.every((f,i)=>f.name===base+'.'+String(i+1).padStart(4,'0')),'Alle zusammengehörigen Archivteile in lückenloser Reihenfolge auswählen.');}
  const file=sorted.length===1?sorted[0]:new Blob(sorted);check(await isPackage(file),'Kein vollständiges XenSonar-Archiv.');
  // This format is a full exact restore. Do not pretend key-wise merging has musical semantics.
  check(mode==='replace','Vollständige .xenpack-Sicherungen mit „Replace“ laden. Alte JSON-Pakete unterstützen weiterhin ihre bisherigen Importmodi.');
  busy=true;aborted=false;const done=progress('Package Station · Check backup');hooks.trace?.begin();trace('operation-begin');
  try{
   const info=await walk(source(file));if(info.version>=6)throw Error('XMEM-MR03C RESTORE BLOCKED: v6/v7 archive is verification-only.');trace('import-preflight-complete',{records:info.records,bytes:file.size});
   if(env.confirm&&!env.confirm((info.scope&&!info.scope.complete?'Ausgewählte Rubriken aus diesem Paket wiederherstellen? Nicht ausgewählte Rubriken bleiben erhalten.':'Gesamten Arbeitsstand aus dieser Sicherung wiederherstellen? Die aktuelle Browser-Arbeitskopie wird ersetzt.')+'\n'+info.databases+' Datenbanken, '+info.records+' Datensätze. XenSonar startet anschließend neu.')){trace('operation-cancelled');hooks.trace?.fail(new DOMException('Cancelled','AbortError'));return;}
   await copyTo(source(file),'incoming');const runtime=await captureRollbackSnapshot();
   await transportIO('files','readwrite',s=>s.put({name:'preserved-runtime',value:runtime}));
   env.localStorage.setItem(JOURNAL,JSON.stringify({version:4,phase:'prepared',startedAt:new Date().toISOString()}));
   trace('import-staged',{records:info.records,bytes:file.size});env.location.reload();
  }catch(e){if(!env.localStorage.getItem(JOURNAL)){await removeSpool('incoming').catch(()=>{});await removeSpool('rollback').catch(()=>{})}trace('operation-failed');hooks.trace?.fail(e);throw e}finally{done();busy=false}
 }
 async function boot(){
  if(mr03dJournal())throw Error('MR03D DISPOSABLE RESTORE JOURNAL PRESENT: normal boot blocked; use isolated laboratory verification only.');
  if(__xmemRootPilotEarly()||globalThis.__XMEM_MR03_ENABLE_MELODIC__===true)throw Error('XMEM-MR03C RESTORE BLOCKED: legacy boot recovery cannot own the IDB workspace.');
  const raw=env.localStorage.getItem(JOURNAL);
  if(raw){trace('recovery-start');
   let journal;try{journal=JSON.parse(raw);check(journal.version===4&&['prepared','applying','rolling-back'].includes(journal.phase),'Wiederherstellungsjournal ist ungültig.')}catch(e){showRecoveryError(e);throw e}
   aborted=false;const done=progress('Package Station · Restore');if(dialog)dialog.cancel.style.display='none';
   try{
    if(journal.phase==='prepared'){
     const incoming=await spool('incoming');journal.phase='applying';env.localStorage.setItem(JOURNAL,JSON.stringify(journal));
     try{const info=await applyArchive(incoming);trace('import-committed',{records:info.records});journal.phase='committed'}
     catch(error){journal.phase='rolling-back';env.localStorage.setItem(JOURNAL,JSON.stringify(journal));await applyArchive(await spool('rollback'));trace('rollback-complete');journal.phase='rolled-back';env.alert?.('Import nicht abgeschlossen. Der vorherige Arbeitsstand wurde wiederhergestellt.\n'+error.message)}
    }else{journal.phase='rolling-back';env.localStorage.setItem(JOURNAL,JSON.stringify(journal));await applyArchive(await spool('rollback'));trace('rollback-complete');journal.phase='rolled-back';env.alert?.('Unterbrochener Import: Der vorherige Arbeitsstand wurde wiederhergestellt.')}
    env.localStorage.removeItem(JOURNAL);await removeSpool('incoming').catch(()=>trace('cleanup-deferred'));await removeSpool('rollback').catch(()=>trace('cleanup-deferred'));await transportIO('files','readwrite',s=>s.delete('preserved-runtime')).catch(()=>{});trace('recovery-finished');
   }catch(e){trace('recovery-failed');showRecoveryError(e);throw e}finally{done()}
  }
  // The IDB record, not the localStorage marker, is authoritative for pending runtime.
  const marked=!!env.localStorage.getItem(RUNTIME);
  const rec=await transportIO('files','readonly',(s,set)=>{const r=s.get('runtime');r.onsuccess=()=>set(r.result)});
  if(rec&&(rec.value===null||typeof rec.value!=='object'||Array.isArray(rec.value)))throw Error('Paketstation: Ungültige Runtime-Übergabe im Transport.');
  const value=rec?.value??null;
  if(value&&Object.keys(value).length){
   if(!marked)try{env.localStorage.setItem(RUNTIME,'1')}catch{note('runtime-marker-repair-deferred')}
   return value;
  }
  if(marked)try{env.localStorage.removeItem(RUNTIME)}catch{note('runtime-marker-repair-deferred')}
  return null;
 }
 function showRecoveryError(error){const run=()=>{const x=progress('Package Station · Recovery needed');if(dialog){dialog.cancel.style.display='none';dialog.text.textContent='Wiederherstellung angehalten. '+error.message+' Nach Freigabe des Speichers oder Schließen anderer XenSonar-Tabs diese Datei erneut öffnen.'}};if(env.document?.body)run();else env.document?.addEventListener('DOMContentLoaded',run,{once:true})}
 async function consumeRuntime(field){
  if(field!=='main'&&field!=='melodic')return;
  // The read, field removal, and put/delete are ONE serialized IDB readwrite TX.
  const outcome=await transportIO('files','readwrite',(store,set,transaction)=>{
   const request=store.get('runtime');
   request.onsuccess=()=>{
    try{
     const row=request.result;
     if(!row){set({empty:true});return}
     if(!row.value||typeof row.value!=='object'||Array.isArray(row.value)){transaction.abort();return}
     const value=row.value;
     if(!Object.prototype.hasOwnProperty.call(value,field)){
      if(!Object.keys(value).length){store.delete('runtime');set({empty:true})}
      else set({empty:false});
      return;
     }
     const remaining={...value};delete remaining[field];row.value=remaining;
     if(Object.keys(remaining).length){store.put(row);set({empty:false})}
     else{store.delete('runtime');set({empty:true})}
    }catch(error){try{transaction.abort()}catch{}}
   };
  });
  // Best-effort derived marker: it cannot share the IDB commit boundary.
  // A failed marker write must not falsify the already committed IDB result.
  if(outcome?.empty)try{env.localStorage.removeItem(RUNTIME)}catch{note('runtime-marker-repair-deferred')}
 }
 async function isPackage(file){if(!file||file.size<MAGIC.length)return false;const head=new Uint8Array(await file.slice(0,MAGIC.length).arrayBuffer());return head.every((v,i)=>v===MAGIC.charCodeAt(i))}
 /* ARCHIVE-01: reuse the package inventory and reference closure. Values are
    inspected one at a time; the UI retains metadata and Blob handles only on play. */
 function catalogueItems(value){
  if(Array.isArray(value)&&value.every(x=>x&&typeof x==='object'&&typeof x.id==='string'))return value;
  if(value&&typeof value==='object')for(const key of ['entries','projects','presets','patterns','items','clips','sessions']){
   const container=value[key],items=Array.isArray(container)?container:container&&typeof container==='object'?Object.values(container):null;
   if(items?.length&&items.every(x=>x&&typeof x==='object'&&(typeof x.id==='string'||typeof x.name==='string')))return items;
  }
  return [value];
 }
 function catalogueBlob(value){
  if(value instanceof Blob)return value;
  if(!value||typeof value!=='object')return null;
  for(const key of ['blob','audioBlob','file'])if(value[key] instanceof Blob)return value[key];
  if(value.audio?.blob instanceof Blob)return value.audio.blob;
  return null;
 }
 function catalogueTitle(value,fallback){return String(value?.name??value?.title??value?.instrument?.name??value?.project?.name??value?.fileName??value?.id??fallback).slice(0,200)}
 function catalogueDescription(value){
  const kind=v=>v instanceof Blob?'Audio/Blob':ArrayBuffer.isView(v)?v.constructor.name:v instanceof ArrayBuffer?'ArrayBuffer':Array.isArray(v)?'Liste ('+v.length+')':v===null?'Null':typeof v==='object'?'Datensatz':typeof v;
  const fields=value&&typeof value==='object'&&!ArrayBuffer.isView(value)&&!(value instanceof Blob)?
   Object.keys(value).slice(0,16).map(k=>k.slice(0,72)+' ('+kind(value[k])+')'):[];
  let blobCount=0,blobBytes=0,binaryCount=0,binaryBytes=0,visited=0,truncated=false;
  const seen=new WeakSet();
  function visit(v,depth){
   if(v===null||typeof v!=='object')return;
   if(v instanceof Blob){blobCount++;blobBytes+=v.size;return}
   if(ArrayBuffer.isView(v)||v instanceof ArrayBuffer){binaryCount++;binaryBytes+=v.byteLength;return}
   if(seen.has(v))return;seen.add(v);
   if(depth>=4||visited++>=96){truncated=true;return}
   const keys=Array.isArray(v)?v.slice(0,8):Object.keys(v).slice(0,24).map(k=>v[k]);
   for(const item of keys)visit(item,depth+1);
   if((Array.isArray(v)?v.length:Object.keys(v).length)>24)truncated=true;
  }
  visit(value,0);
  return {kind:kind(value),fields,blobCount,blobBytes,binaryCount,binaryBytes,truncated};
 }
 async function catalogueInspect(row){
  check(row&&typeof row.id==='string','Unbekannter Inventareintrag.');
  let value,location='',owner='';
  if(row.source==='local'){
   const storage=row.id.startsWith('local:')?env.localStorage:row.id.startsWith('session:')?env.sessionStorage:null;
   check(storage,'Unbekannter Browser-Speicher.');
   const raw=storage.getItem(row.key);check(raw!==null,'Eintrag nicht mehr vorhanden; Bestand aktualisieren.');
   let source;try{source=JSON.parse(raw)}catch{source=raw}
   const items=catalogueItems(source),index=Number(row.id.slice(row.id.lastIndexOf(':')+1));
   check(Number.isSafeInteger(index)&&index>=0&&index<items.length,'Eintrag wurde verschoben; Bestand aktualisieren.');
   value=items[index];
   if(row.itemId!==null&&row.itemId!==undefined)check(value?.id===row.itemId,'Eintrag wurde verändert; Bestand aktualisieren.');
   location=(storage===env.localStorage?'localStorage':'sessionStorage')+' / '+row.key;
   owner=row.owner||'Speichereigentümer nicht zugeordnet';
  }else if(row.source==='database'){
   check(dbKey(row.db),'Unbekannte Datenbank.');
   // Opening a deleted database without a version would otherwise recreate it.
   let nonexistent=false,db;
   try{db=await open(row.db,null,(_database,transaction,event)=>{
    if(event.oldVersion===0){nonexistent=true;transaction.abort()}
   })}catch(error){if(nonexistent)fail('Datenbank wurde entfernt; Bestand aktualisieren.');throw error}
   try{
    check(db.objectStoreNames.contains(row.store),'Objektspeicher nicht mehr vorhanden.');
    value=await tx(db,row.store,'readonly',(store,set)=>{const q=store.get(row.key);q.onsuccess=()=>set(q.result)});
    check(value!==undefined,'Eintrag wurde gelöscht; Bestand aktualisieren.');
   }finally{db.close()}
   location='IndexedDB / '+row.db+' / '+row.store;
   owner=row.managed?'Materialbibliothek':'Kein sicherer Löschpfad für diesen Speicher-Owner im Auge';
  }else if(row.source==='runtime'){
   value={type:'runtime',state:'Aktueller Laufzeitstatus, keine separat gespeicherte Audio-Datei'};
   location='Aktuelle Arbeitssession';owner='Laufzeit';
  }else fail('Unbekannte Eintragsquelle.');
  return {location,owner,key:row.source==='database'?String(row.key):row.key??row.id,category:row.category,
   inPackage:!!row.inPackage,managed:!!row.managed,summary:catalogueDescription(value)};
 }
 async function catalogue(selection){
  if(__xmemRootPilotEarly()||globalThis.__XMEM_MR03_ENABLE_MELODIC__===true)throw Error('XMEM-MR03C CATALOGUE BLOCKED: canonical IDB categories not yet independently verified.');
  check(!busy,'Ein Vorgang läuft bereits.');
  aborted=false;
  const runtime=await hooks.capture?.(selection)??null,plan=await selectionPlan(selection??__XenPackageSelection41.all(),runtime),rows=[];
  const chosen=new Set((plan?.rows??[]).map(row=>JSON.stringify([row.db,row.store,row.key])));
  const chosenLocal=new Set(Object.entries(plan?.local??{}).flatMap(([storage,list])=>list.map(([key])=>storage+':'+key)));
  const complete=plan?.scope.complete??true;
  /* ROOM4-05: read-only. How many Multitrack clips (and unplaced inbox items) use each Material; shown as 'Used in' and as the basis of the delete warning. */
  const mtUse=new Map();
  try{if((await inventory()).some(e=>e.name==='xensonar-multitrack-v1')){const mdb=await open('xensonar-multitrack-v1');try{
   if(mdb.objectStoreNames.contains('projects')){
    const project=await tx(mdb,'projects','readonly',(s,set)=>{const q=s.get('current');q.onsuccess=()=>set(q.result)});
    for(const t of (Array.isArray(project?.tracks)?project.tracks:[]))for(const c of (Array.isArray(t?.clips)?t.clips:[]))if(typeof c?.materialId==='string')mtUse.set(c.materialId,(mtUse.get(c.materialId)||0)+1);
    const inbox=await tx(mdb,'projects','readonly',(s,set)=>{const q=s.get('inbox');q.onsuccess=()=>set(q.result)});
    for(const it of (Array.isArray(inbox)?inbox:[]))if(typeof it?.materialId==='string')mtUse.set(it.materialId,(mtUse.get(it.materialId)||0)+1);
   }}finally{mdb.close()}}}catch{}
  const usedIn=id=>{const n=typeof id==='string'?mtUse.get(id):0;return n?'Multitrack · '+n+(n===1?' Clip':' Clips'):null};
  for(const [storage,owner] of [['local',env.localStorage],['session',env.sessionStorage]])for(const [key,text]of localRows(owner)){
   let value;try{value=JSON.parse(text)}catch{value=text}
   const category=__XenPackageSelection41.keyCategory(key),items=catalogueItems(value);
   items.forEach((item,index)=>{
    const owner=storage!=='local'||typeof item?.id!=='string'?null:
     key==='xensonar-bass-clip-library-v1'?'bass':
     key==='xensonar.nodal.instruments.v1'?'nodal':key==='xensonar.entrophon.instruments.v1'?'entrophon':
     category==='melodicProjects'&&item.composer?'melodicProject':null;
    const native=owner==='bass'?{kind:'bass',id:'clip:'+item.id,name:catalogueTitle(item,item.id)}:null;
    rows.push({usedIn:usedIn(item?.id),id:storage+':'+key+':'+index,source:storage,key,itemId:typeof item?.id==='string'?item.id:null,name:catalogueTitle(item,__XenPackageSelection41.groups.flatMap(group=>group.items).find(pair=>pair[0]===category)?.[1]??'Saved settings'),category,inPackage:complete||chosenLocal.has(storage+':'+key),previewable:false,managed:!!owner,owner,revision:Number.isInteger(item?.revision)?item.revision:null,native});
   });
  }
  for(const entry of await inventory()){
   const db=await open(entry.name);try{for(const store of db.objectStoreNames){let after,first=true;
    while(true){const row=await nextRecord(db,store,after,first);if(!row)break;after=row.key;first=false;
     const category=__XenPackageSelection41.recordCategory(entry.name,store,row.key),blob=catalogueBlob(row.value),id=JSON.stringify([entry.name,store,row.key]);
     rows.push({usedIn:entry.name==='xensonar-material-library'&&store==='materials'?usedIn(String(row.value?.id??row.key)):null,id:'db:'+id,source:'database',db:entry.name,store,key:row.key,name:catalogueTitle(row.value,row.key),category,inPackage:complete||chosen.has(id),previewable:!!blob,bytes:blob?.size??null,managed:entry.name==='xensonar-material-library'&&store==='materials',materialId:entry.name==='xensonar-material-library'&&store==='materials'?String(row.value?.id??row.key):null});
     if(rows.length%32===0)await yieldUI();
    }
   }}finally{db.close()}
  }
  for(const field of Object.keys(runtime??{}))rows.push({id:'runtime:'+field,source:'runtime',name:field==='main'?'Current main room':'Current Melodic / Forge editor',category:field==='main'?'currentMain':'currentEditor',inPackage:complete||!!plan?.runtime?.[field],previewable:false,managed:false});
  return rows;
 }
 async function catalogueAudio(row){
  check(row?.source==='database'&&dbKey(row.db),'Unbekannte Audioquelle.');const db=await open(row.db);
  try{check(db.objectStoreNames.contains(row.store),'Audioarchiv nicht verfügbar.');const value=await tx(db,row.store,'readonly',(store,set)=>{const q=store.get(row.key);q.onsuccess=()=>set(q.result)});const blob=catalogueBlob(value);check(blob&&blob.size>0,'Für diesen Eintrag ist keine Audio-Vorschau gespeichert.');return blob}finally{db.close()}
 }
 return Object.freeze({configure:v=>{hooks={...hooks,...v}},catalogue,catalogueAudio,prepare,prepareXmemLab,previewRestore,restoreXmemLab,verifyXmemLab,importFiles,isPackage,boot,consumeRuntime,
  inspect:file=>walk(source(file)),catalogueInspect,stats:()=>({...stats}),diagnostics:()=>({schemaVersion:4,events:[...events],limits:{chunkBytes:CHUNK,recordAtATime:true},stats:{...stats}}),_test:env.__XEN_PACKAGE_STATION_TEST__===true?{encode,decode,writer,reader,source,walk,spool,exportSpool,applyArchive,inventory,localRows,crc,resetStats,JOURNAL,RUNTIME,TRANSPORT,selectionPlan,writeArchive,xmemWitness}:undefined});
}
let __xenPackageStation4Instance;
function __xenPackageStation4(){return __xenPackageStation4Instance??=(globalThis.__XenPackageStation4=__createXenPackageStation4())}
// Stop before ANY application initializer during restore. Normal boot performs only two key reads.
let __xenRestoredWorkspace4=null;
if(localStorage.getItem('xensonar:package-station:v4:recovery')||localStorage.getItem('xensonar:package-station:v4:runtime'))
 __xenRestoredWorkspace4=await __xenPackageStation4().boot();
