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
/* HOLD-LIB-02 / THUNDER-SPEED: read-only factory arpeggios for Thunder Mode, i.e. for SHREDDING: figures faster than hands can play on a computer keyboard.
   They use the editor's own model: SLOTS are the notes of the bar (Bars = 1), the arpeggio is repeated over the whole row of slot cards (32 = 32nd notes,
   24 = sextuplets / triplet figures), so "Slots" in the Hold panel means exactly what it always meant, and every card carries its own pitch (right-click as usual).
   Pitches are cents above the held key (the same in every Grid; major / minor are unambiguous); a Hold pattern spans at most ±1200 ¢.
   Rows are generated, never stored: they can be loaded (then Slots / Bars / every card stay editable), never renamed, duplicated or deleted. Factory plans refer to them by name. */
const J=(a,b)=>1200*Math.log2(a/b),R3=n=>Math.round(n*1000)/1000;
const JM3=R3(J(5,4)),Jm3=R3(J(6,5)),J5=R3(J(3,2)),H7=R3(J(7,4)),S3=R3(J(7,6));
const T32=32,SEXT=24;
const FACTORY=[
 // [name, the figure (cents per note), slots of the bar it is repeated over, {mute:'1/0 per note of the figure'}]
 ['Major · triad sweep ↑',[0,400,700,1200],T32],['Major · triad sweep ↓',[1200,700,400,0],T32],['Major · triad sweep ↑↓',[0,400,700,1200,700,400],SEXT],
 ['Major · triad roll (sextuplets)',[0,400,700],SEXT],['Major · Alberti 1-5-3-5',[0,700,400,700,0,700,400,700],T32],
 ['Major · maj7 sweep ↑↓',[0,400,700,1100,1200,1100,700,400],T32],['Major · dominant 7 sweep ↑↓',[0,400,700,1000,1200,1000,700,400],T32],
 ['Major · add9 ↑↓',[0,200,400,700,1200,700],SEXT],['Major · pentatonic run ↑↓',[0,200,400,700,900,700,400,200],T32],
 ['Major · scale run ↑ (Ionian)',[0,200,400,500,700,900,1100,1200],T32],['Major · scale run ↓ (Ionian)',[1200,1100,900,700,500,400,200,0],T32],
 ['Major · offbeat sparkle',[0,0,0,400,0,700,0,1200],T32,{mute:'01010101'}],
 ['Minor · triad sweep ↑',[0,300,700,1200],T32],['Minor · triad sweep ↓',[1200,700,300,0],T32],['Minor · triad sweep ↑↓',[0,300,700,1200,700,300],SEXT],
 ['Minor · triad roll (sextuplets)',[0,300,700],SEXT],['Minor · Alberti 1-5-3-5',[0,700,300,700,0,700,300,700],T32],
 ['Minor · m7 sweep ↑↓',[0,300,700,1000,1200,1000,700,300],T32],['Minor · minor-major 7 sweep ↑↓',[0,300,700,1100,1200,1100,700,300],T32],
 ['Minor · pentatonic run ↑↓',[0,300,500,700,1000,700,500,300],T32],
 ['Minor · scale run ↑ (Aeolian)',[0,200,300,500,700,800,1000,1200],T32],['Minor · scale run ↓ (Aeolian)',[1200,1000,800,700,500,300,200,0],T32],
 ['Minor · harmonic minor run ↑',[0,200,300,500,700,800,1100,1200],T32],['Minor · pedal point shred',[1200,1100,1200,800,1200,700,1200,300],T32],
 ['Minor · offbeat sparkle',[0,0,0,300,0,700,0,1200],T32,{mute:'01010101'}],
 ['Mode · Dorian run ↑',[0,200,300,500,700,900,1000,1200],T32],['Mode · Phrygian run ↑',[0,100,300,500,700,800,1000,1200],T32],
 ['Mode · Lydian run ↑',[0,200,400,600,700,900,1100,1200],T32],['Mode · Mixolydian run ↑',[0,200,400,500,700,900,1000,1200],T32],
 ['Mode · Locrian run ↑',[0,100,300,500,600,800,1000,1200],T32],
 ['Jazz · bebop dominant run ↓',[1200,1100,1000,900,700,500,400,200],T32],['Jazz · enclosure into the root',[200,-100,0,0],T32,{mute:'1110'}],
 ['Diminished · half-diminished m7♭5 sweep ↑↓',[0,300,600,1000,1200,1000,600,300],T32],['Diminished · dim7 sweep ↑↓',[0,300,600,900,1200,900,600,300],T32],
 ['Augmented · triad sweep ↑↓',[0,400,800,1200,800,400],SEXT],['Sus4 · sweep ↑',[0,500,700,1200],T32],['Sus2 · sweep ↑',[0,200,700,1200],T32],
 ['Fifths · tremolo',[0,700,0,700],T32],['Octaves · tremolo',[0,1200,0,1200],T32],['Whole-tone · run ↑',[0,200,400,600,800,1000],SEXT],
 ['Just major · 4:5:6 sweep ↑↓',[0,JM3,J5,1200,J5,JM3],SEXT],['Just minor · 10:12:15 sweep ↑↓',[0,Jm3,J5,1200,J5,Jm3],SEXT],
 ['Harmonic 4:5:6:7 sweep ↑↓',[0,JM3,J5,H7,1200,H7,J5,JM3],T32],['Neutral triad (350 ¢) sweep ↑↓',[0,350,700,1200,700,350],SEXT],
 ['Septimal minor · 6:7:9 sweep ↑↓',[0,S3,J5,1200,J5,S3],SEXT]
];
function factory(lane){
 const sourceLane=lane==='enter'?'enter':'keyboard';
 return FACTORY.map(([name,figure,slots,o],i)=>{const n=figure.length,mute0=o?.mute?o.mute.split('').map(Number):figure.map(()=>1),at=k=>k%n;
  const cents=Array.from({length:slots},(_,k)=>figure[at(k)]),mute=Array.from({length:slots},(_,k)=>mute0[at(k)]);
  return {schemaVersion:SCHEMA,id:'factory:'+i,factory:true,revision:0,name,sourceLane,slots,referenceBars:1,muteSteps:mute,pitchCents:cents,
   slotVolumes:cents.map((_,k)=>at(k)===0?1:.86),microtiming:cents.map(()=>0),tuningOrigin:null}});
}
return Object.freeze({version:'HPM01',dbName:DB,validate:payload,list,get,saveAs,rename,duplicate,remove,factory});
}
