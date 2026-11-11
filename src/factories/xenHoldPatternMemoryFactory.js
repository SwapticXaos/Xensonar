/* XenSonar THUNDER-HPM01 · named Hold Pattern Memory, separate IndexedDB owner.
   Function island: evaluated on first use of the Pattern Memory control, never at boot and never in the audio path.
   No realtime audio, Q, song or Package Station mutations. */
function __xenHoldPatternMemoryFactory(){
'use strict';
const DB='xensonar-thunder-hold-patterns-v1', STORE='patterns', SCHEMA=1;
let opening=null;
const copy=v=>JSON.parse(JSON.stringify(v));
const fail=s=>{throw Error('Hold Pattern Memory: '+s)};
const id=()=>globalThis.crypto?.randomUUID?.()||'hpm-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const stamp=()=>new Date().toISOString();
const nameOf=n=>{if(typeof n!=='string')fail('Name must be text');const v=n.trim();if(!v||v.length>80)fail('Name must have 1–80 characters');return v};
const normalizedName=n=>n.normalize('NFKC').toLocaleLowerCase();
/* Pattern-only provenance, not a playable/grid-restoring snapshot. The future HPP
   owns a self-contained, restorable native-grid definition. */
function tuningOrigin(raw){
 if(raw==null)return null;
 if(typeof raw!=='object'||Array.isArray(raw))fail('Invalid tuning provenance');
 const id=raw.tuningId,mode=raw.modeId;
 if(typeof id!=='string'||!id.trim()||id.length>1024||typeof mode!=='string'||!mode.trim()||mode.length>160)fail('Invalid tuning identity');
 const hz=raw.gridBaseHz;
 if(typeof hz!=='number'||!Number.isFinite(hz)||hz<=0||hz>20000)fail('Invalid tuning root frequency');
 const degrees=raw.mainMutedDegrees,offsets=raw.mainStepOffsets;
 if(!Array.isArray(degrees)||degrees.length>256||degrees.some(v=>!Number.isInteger(v)||v<0||v>=256)||new Set(degrees).size!==degrees.length)fail('Invalid grid mute degrees');
 if(!Array.isArray(offsets)||offsets.length>256||offsets.some(v=>typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>120))fail('Invalid grid step offsets');
 return {tuningId:id,modeId:mode,gridBaseHz:hz,mainMutedDegrees:degrees.slice(),mainStepOffsets:offsets.slice()};
}
function payload(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))fail('Invalid pattern');
 const slots=raw.slots;
 if(!Number.isSafeInteger(slots)||slots<1||slots>256)fail('Slots must be 1–256');
 const bars=raw.referenceBars;
 if(typeof bars!=='number'||!Number.isFinite(bars)||bars<.125||bars>16)fail('Bars must be 0.125–16');
 if(!['keyboard','enter'].includes(raw.sourceLane))fail('Invalid source lane');
 if(!Array.isArray(raw.muteSteps)||raw.muteSteps.length!==slots||raw.muteSteps.some(v=>v!==0&&v!==1))fail('Mute pattern length/values invalid');
 if(!Array.isArray(raw.pitchCents)||raw.pitchCents.length!==slots||raw.pitchCents.some(v=>typeof v!=='number'||!Number.isFinite(v)||v< -1200||v>1200))fail('Pitch pattern length/values invalid');
 // Additive HPM02 fields: old HPM01 rows load as 100% volume and 0 microtiming.
 const volumes=raw.slotVolumes??Array(slots).fill(1),micro=raw.microtiming??Array(slots).fill(0);
 if(!Array.isArray(volumes)||volumes.length!==slots||volumes.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>1.5))fail('Slot Volume length/values invalid');
 if(!Array.isArray(micro)||micro.length!==slots||micro.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<-.45||v>.45))fail('Slot Microtiming length/values invalid');
 return {sourceLane:raw.sourceLane,slots,referenceBars:bars,muteSteps:raw.muteSteps.slice(),pitchCents:raw.pitchCents.slice(),slotVolumes:volumes.slice(),microtiming:micro.slice(),tuningOrigin:tuningOrigin(raw.tuningOrigin)};
}
function stored(row){
 if(!row||row.schemaVersion!==SCHEMA||typeof row.id!=='string'||!row.id||!Number.isSafeInteger(row.revision)||row.revision<1)fail('Invalid saved pattern metadata');
 if(typeof row.createdAt!=='string'||!Number.isFinite(Date.parse(row.createdAt))||typeof row.updatedAt!=='string'||!Number.isFinite(Date.parse(row.updatedAt)))fail('Invalid saved timestamps');
 return {schemaVersion:SCHEMA,id:row.id,revision:row.revision,name:nameOf(row.name),...payload(row),createdAt:row.createdAt,updatedAt:row.updatedAt};
}
function open(){
 if(opening)return opening;
 opening=new Promise((resolve,reject)=>{
  if(!globalThis.indexedDB){reject(Error('IndexedDB unavailable'));return}
  let req,settled=false;
  try{req=indexedDB.open(DB,1)}catch(e){reject(e);return}
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'id'})};
  req.onsuccess=()=>{if(settled){req.result.close();return}settled=true;const db=req.result;
   db.onversionchange=()=>{db.close();opening=null};resolve(db)};
  req.onerror=()=>{if(!settled){settled=true;reject(req.error||Error('Cannot open Hold Pattern Memory'))}};
  req.onblocked=()=>{if(!settled){settled=true;reject(Error('Hold Pattern Memory blocked by another tab'))}};
 }).catch(e=>{opening=null;throw e});
 return opening;
}
/* All reads and writes run in one IndexedDB transaction. A stale revision aborts. */
async function run(mode,operation){const db=await open();return new Promise((resolve,reject)=>{
 let tx,result,error=null,finished=false;
 try{
  tx=db.transaction(STORE,mode);const store=tx.objectStore(STORE),r=store.getAll();
  r.onsuccess=()=>{try{
   const rows=r.result.map(stored),ids=new Set();for(const row of rows){if(ids.has(row.id))fail('Duplicate IDs');ids.add(row.id)}
   result=operation(rows,store);
  }catch(e){error=e;try{tx.abort()}catch{}}};
  r.onerror=()=>{error=r.error||Error('Cannot read pattern library');try{tx.abort()}catch{}};
  tx.oncomplete=()=>{finished=true;resolve(copy(result))};
  tx.onabort=()=>{finished=true;reject(error||tx.error||Error('Pattern transaction aborted'))};
  tx.onerror=()=>{};
 }catch(e){if(tx&&!finished){try{tx.abort()}catch{reject(e)}}else reject(e)}
})}
const find=(rows,patternId)=>{const row=rows.find(p=>p.id===patternId);if(!row)fail('Pattern no longer exists');return row};
const unique=(rows,sourceLane,name,exceptId)=>{const key=normalizedName(name);if(rows.some(r=>r.sourceLane===sourceLane&&r.id!==exceptId&&normalizedName(r.name)===key))fail('A pattern with that name already exists in this lane')};
const revision=(row,expected)=>{if(expected!==undefined&&row.revision!==expected)fail('Pattern changed in another tab; reload the library')};
const sorted=rows=>rows.slice().sort((a,b)=>a.sourceLane.localeCompare(b.sourceLane)||a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
async function list(){return run('readonly',rows=>sorted(rows))}
async function get(patternId){return run('readonly',rows=>find(rows,patternId))}
async function saveAs(name,input){const clean=nameOf(name),p=payload(input);return run('readwrite',(rows,store)=>{
 unique(rows,p.sourceLane,clean);const at=stamp(),row={schemaVersion:SCHEMA,id:id(),revision:1,name:clean,...p,createdAt:at,updatedAt:at};store.add(row);return row;
})}
async function rename(patternId,newName,expectedRevision){const clean=nameOf(newName);return run('readwrite',(rows,store)=>{
 const row=find(rows,patternId);revision(row,expectedRevision);unique(rows,row.sourceLane,clean,patternId);
 if(row.name===clean)return row;const next={...row,name:clean,revision:row.revision+1,updatedAt:stamp()};store.put(next);return next;
})}
async function duplicate(patternId,expectedRevision){return run('readwrite',(rows,store)=>{
 const row=find(rows,patternId);revision(row,expectedRevision);let n=1,clean;
 do{const suffix=n===1?' copy':' copy '+n;clean=row.name.slice(0,80-suffix.length).trimEnd()+suffix;n++;if(n>10000)fail('No free copy name')}while(rows.some(r=>r.sourceLane===row.sourceLane&&normalizedName(r.name)===normalizedName(clean)));
 unique(rows,row.sourceLane,clean);
 const at=stamp(),next={...copy(row),id:id(),revision:1,name:clean,createdAt:at,updatedAt:at};store.add(next);return next;
})}
async function remove(patternId,expectedRevision){return run('readwrite',(rows,store)=>{
 const row=find(rows,patternId);revision(row,expectedRevision);store.delete(patternId);return {id:row.id,name:row.name};
})}
return Object.freeze({version:'HPM01',dbName:DB,validate:payload,list,get,saveAs,rename,duplicate,remove});
}
