
/* M12 – Read-only session resource inventory. NOT a complete audio backup.
 * Only explicit session references are inventoried. Opaque roomSettings,
 * nested drum samples and library-to-library chains require later resolvers.
 * No IndexedDB open, no PCM decode, no writes to localStorage or IndexedDB.
 */
function __xenM12InventoryFactory(storage){
 const KEY='xensonar.meta-sessions.v2',MAX=12*1024*1024;
 const KINDS=new Set(['grid','material','rootFollow','drum','bass']);
 const SOURCES={
  grid:{hint:'Embedded gridProfile plus external tuning/preset catalog',verified:false},
  material:{hint:'Material library / Melodic workspace and possible linked sample assets',verified:false},
  rootFollow:{hint:'Root-Follow bank / Melodic workspace and possible linked audio assets',verified:false},
  drum:{hint:'Drum pattern playlist and xensonar-drum-config-library / drumConfigs',verified:false},
  bass:{hint:'Bass preset catalog or xensonar-bass-clip-library-v1 (clip: IDs)',verified:false}
 };
 const utf8Length=x=>new TextEncoder().encode(x).length;
 async function digest(raw){
  if(!globalThis.crypto?.subtle)return null;
  const bytes=new TextEncoder().encode(raw);
  try{
   const value=await crypto.subtle.digest('SHA-256',bytes);
   return [...new Uint8Array(value)].map(n=>n.toString(16).padStart(2,'0')).join('');
  }catch{return null} // Inventory remains useful in restricted file:// contexts.
 }
 function source(){
  const raw=storage.getItem(KEY);
  if(raw===null)throw Error('No V2 session archive to inventory.');
  if(raw.length>MAX)throw Error('Session archive exceeds the inventory safety limit.');
  let data;
  try{data=JSON.parse(raw)}catch{throw Error('Session archive is not valid JSON.');}
  if(data?.version!==2||!Array.isArray(data.saved)||!Array.isArray(data.items))
   throw Error('Only V2 session archives can be inventoried.');
  return {raw,data};
 }
 async function inspect(){
  const {raw,data}=source();
  const refs=new Map(),uses=new Map(),counts={grid:0,material:0,rootFollow:0,drum:0,bass:0};
  const sessionIDs=new Set(),issues=[];
  const opaque=[];
  function row(label,sourceId,items,other){
   if(!Array.isArray(items))throw Error('Malformed session items: '+sourceId);
   if(other?.roomSettings!=null)opaque.push({sessionId:sourceId,field:'roomSettings',reason:'Nested resource references are not enumerated by M12.'});
   if(other?.legacyOrigin!=null)opaque.push({sessionId:sourceId,field:'legacyOrigin',reason:'Legacy origin may depend on external libraries.'});
   for(const item of items){
    if(!item||!KINDS.has(item.kind)||typeof item.id!=='string'||!item.id||typeof item.name!=='string')
     throw Error('Invalid resource reference in '+sourceId);
    const key=JSON.stringify([item.kind,item.id]);
    let ref=refs.get(key);
    if(!ref){ref={kind:item.kind,id:item.id,name:item.name,occurrences:0,usedBy:[],resolution:'unverified',sourceHint:SOURCES[item.kind].hint};refs.set(key,ref);uses.set(key,new Set());}
    ref.occurrences++;
    counts[item.kind]++;
    const usageKey=JSON.stringify([sourceId,label]);
    if(!uses.get(key).has(usageKey)){uses.get(key).add(usageKey);ref.usedBy.push({id:sourceId,scope:label});}
    if(item.kind==='grid'&&!item.gridProfile)
     issues.push({sessionId:sourceId,kind:'grid',id:item.id,issue:'No embedded gridProfile; catalog lookup may be required.'});
    if(item.kind==='drum')issues.push({sessionId:sourceId,kind:'drum',id:item.id,issue:'Nested drum sample slots are not inventoried.'});
   }
  }
  for(const entry of data.saved){
   if(!entry||typeof entry.id!=='string'||!entry.id||sessionIDs.has(entry.id)||typeof entry.name!=='string')
    throw Error('Duplicate or malformed saved session.');
   sessionIDs.add(entry.id);row('saved',entry.id,entry.items,entry);
  }
  row('workingDraft','@draft',data.items,data);
  if(data.activePalette){
   if(!Array.isArray(data.activePalette.items))throw Error('Invalid active palette.');
   row('activePalette','@active',data.activePalette.items,data.activePalette);
  }
  const sha256=await digest(raw);
  if(storage.getItem(KEY)!==raw)throw Error('Session archive changed while inventory was prepared. Retry.');
  const references=[...refs.values()].sort((a,b)=>a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id));
  return {
   format:'xensonar-session-resource-inventory',schema:1,createdAt:new Date().toISOString(),
   sourceKey:KEY,sourceVersion:2,sourceBytes:utf8Length(raw),sourceSha256:sha256,
   sourceIntegrity:sha256?'sha256':'not-cryptographically-verified',
   sessionCount:data.saved.length,referenceCount:references.length,
   occurrenceCount:Object.values(counts).reduce((a,b)=>a+b,0),counts,
   sources:SOURCES,references,opaqueDependencies:opaque,coverageWarnings:issues,
   limitations:[
    'INVENTORY ONLY: no audio blobs, sample buffers or complete library data are included.',
    'Reference IDs are not proof that the referenced source exists or is recoverable.',
    'Only direct session items are enumerated. Nested roomSettings, drum sample slots and library-to-library assets require separate resolvers.',
    'An actual recoverable project backup must include required resource payloads and verify restore in an isolated target.'
   ]
  };
 }
 async function download(){
  const before=storage.getItem(KEY);
  const inventory=await inspect();
  const data=JSON.stringify(inventory,null,2);
  // Exact compare also works when WebCrypto is unavailable.
  if(storage.getItem(KEY)!==before)
   throw Error('Session archive changed before inventory download. Retry.');
  if(typeof document==='undefined'||typeof Blob==='undefined'||typeof URL==='undefined'||typeof URL.createObjectURL!=='function')
   throw Error('File download is unavailable in this context.');
  const blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob);
  try{
   const link=document.createElement('a');link.href=url;link.download='XenSonar_Session_Resource_Inventory_M12.json';
   document.body.appendChild(link);try{link.click()}finally{link.remove()}
  }finally{setTimeout(()=>URL.revokeObjectURL(url),1500)}
  return {sessions:inventory.sessionCount,refs:inventory.referenceCount,opaque:inventory.opaqueDependencies.length,bytes:blob.size};
 }
 return Object.freeze({inspect,download});
}
