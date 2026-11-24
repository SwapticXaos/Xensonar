/* SONG-PARTS-EDIT-01 · the song parts as a WORKING COPY the user shapes: move a boundary, split, merge, change a letter;
 * snap to the bar / beat grid of the analysis (or free). The analysis offers, the user decides – edits persist per song
 * (localStorage, keyed by the audio) until "Reset to analysis". The same grid snaps the purple loop mask while dragging.
 * Pure functions + a tiny store; parts have the shape of __xenSongParts results. */
function __xenSongPartsEditFactory(storage=null){
 const COLORS=['#38bdf8','#f472b6','#a3e635','#fbbf24','#a78bfa','#2dd4bf','#fb923c','#f87171','#818cf8','#e879f9','#facc15','#4ade80'];
 const letterIndex=l=>{const c=String(l||'A').charCodeAt(0)-65;return c>=0&&c<26?c:0};
 const colorOf=l=>COLORS[letterIndex(l)%COLORS.length];
 /* nearest grid time (binary search); mode 'bar' | 'beat' | 'off' */
 function snapTime(t,grid,mode){
  const g=mode==='bar'?grid?.bars:mode==='beat'?grid?.segments:null;if(!g||!g.length||mode==='off')return t;
  let lo=0,hi=g.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(g[m]<=t)lo=m;else hi=m}
  return Math.abs(g[lo]-t)<=Math.abs(g[hi]-t)?g[lo]:g[hi];
 }
 /* the loop mask while dragging: only the edge that moves snaps; a moved mask keeps its length and snaps its start */
 function snapRange(range,grid,mode,edge='both',total=Infinity){
  if(!range||mode==='off'||!grid)return range;
  let s=range.startSec,e=range.startSec+range.durationSec;
  if(edge==='move'){const ns=snapTime(s,grid,mode);e+=ns-s;s=ns}
  else{if(edge!=='end')s=snapTime(s,grid,mode);if(edge!=='start')e=snapTime(e,grid,mode)}
  if(e-s<.05)return range;
  return {startSec:Math.max(0,s),durationSec:Math.min(total,e)-Math.max(0,s)};
 }
 /* derived fields of a part from the grid: whole bars between its edges, loop = bar line to bar line */
 function derive(p,grid,i,n,total){
  const bars=grid?.bars??[],S=Math.max(1,p.segmentsPerBar||grid?.segmentsPerBar||4),eps=.05;
  const inside=bars.filter(t=>t>=p.startSec-eps&&t<p.endSec-eps),ls=inside.length?inside[0]:p.startSec;
  const after=bars.find(t=>t>=p.endSec-eps),le=after!=null&&after<=total+eps?after:p.endSec;
  const nb=Math.max(1,inside.filter(t=>t<le-eps).length||Math.round((le-ls)/Math.max(.1,grid?.barSec||2)));
  const out={...p,index:i,startSec:i===0?0:p.startSec,endSec:i===n-1?total:p.endSec,loopStartSec:ls,loopEndSec:Math.max(ls+.05,le),bars:nb,segments:nb*S,segmentsPerBar:S,color:colorOf(p.label),colorIndex:letterIndex(p.label)};
  out.bpm=60*out.segments/Math.max(1e-6,out.loopEndSec-out.loopStartSec);
  return out;
 }
 function normalize(parts,grid,total){const n=parts.length;return parts.map((p,i)=>derive({...p,edited:p.edited??false},grid,i,n,total))}
 const clean=p=>{const {subParts,...rest}=p;return rest};
 /* move the boundary between part i-1 and part i to time t (snapped); at least one grid step stays on each side */
 function moveBoundary(parts,i,t,grid,mode,total){
  if(i<=0||i>=parts.length)return parts;const a=parts[i-1],b=parts[i],min=(grid?.barSec??1)*(mode==='beat'?.25:1);
  let x=snapTime(t,grid,mode);x=Math.max(a.startSec+min,Math.min(b.endSec-min,x));if(!(x>a.startSec&&x<b.endSec))return parts;
  const out=parts.map(clean);out[i-1]={...out[i-1],endSec:x,edited:true};out[i]={...out[i],startSec:x,edited:true};return normalize(out,grid,total);
 }
 function split(parts,i,t,grid,mode,total,label=null){
  const p=parts[i];if(!p)return parts;const x=snapTime(t,grid,mode),min=(grid?.barSec??1)*.5;if(!(x>p.startSec+min&&x<p.endSec-min))return parts;
  const out=parts.map(clean);out.splice(i,1,{...out[i],endSec:x,edited:true},{...out[i],startSec:x,label:label??nextLetter(parts),edited:true});return normalize(out,grid,total);
 }
 function merge(parts,i,grid,total){ // part i absorbs part i+1 (keeps the letter of i)
  if(i<0||i+1>=parts.length)return parts;const out=parts.map(clean);out.splice(i,2,{...out[i],endSec:out[i+1].endSec,edited:true});return normalize(out,grid,total);
 }
 function setLabel(parts,i,label,grid,total){const out=parts.map(clean);if(!out[i])return parts;out[i]={...out[i],label,edited:true};return normalize(out,grid,total)}
 function nextLetter(parts){const used=new Set(parts.map(p=>p.label));for(let k=0;k<26;k++){const l=String.fromCharCode(65+k);if(!used.has(l))return l}return 'Z'}
 /* store: edits per song, persisted as the plain part list (start, end, letter, segments per bar) */
 const KEY='xensonar.songParts.edit.v1:',listeners=new Set(),mem=new Map();
 const keyOf=asset=>asset?`${asset.fileName||asset.label||'audio'}|${(Number(asset.originalDuration)||0).toFixed(3)}|${asset.sampleRate||0}`:null;
 function load(asset){const k=keyOf(asset);if(!k)return null;if(mem.has(k))return mem.get(k);
  try{const raw=storage?.getItem(KEY+k);const v=raw?JSON.parse(raw):null;if(v&&Array.isArray(v.parts)){mem.set(k,v);return v}}catch{}return null}
 function save(asset,parts){const k=keyOf(asset);if(!k)return;const v={savedAt:Date.now(),parts:parts.map(p=>({startSec:p.startSec,endSec:p.endSec,label:p.label,segmentsPerBar:p.segmentsPerBar,groups:p.groups??null,edited:!!p.edited}))};
  mem.set(k,v);try{storage?.setItem(KEY+k,JSON.stringify(v))}catch{}listeners.forEach(f=>{try{f(k)}catch{}})}
 function clear(asset){const k=keyOf(asset);if(!k)return;mem.delete(k);try{storage?.removeItem(KEY+k)}catch{}listeners.forEach(f=>{try{f(k)}catch{}})}
 /* the parts to show: the saved working copy (re-derived on the current grid) or the analysis */
 function current(asset,result){const v=load(asset);if(!v||!result?.ok)return {parts:result?.parts??[],edited:false};
  return {parts:normalize(v.parts,result.grid,result.durationSec),edited:true}}
 // mask snap mode (bar / beat / off), shared by the strip and the purple mask
 const SNAP_KEY='xensonar.songParts.snap.v1';
 function snapMode(){try{const v=storage?.getItem(SNAP_KEY);return v==='bar'||v==='beat'||v==='off'?v:'bar'}catch{return 'bar'}}
 function setSnapMode(m){try{storage?.setItem(SNAP_KEY,m)}catch{}listeners.forEach(f=>{try{f('snap')}catch{}})}
 return Object.freeze({snapTime,snapRange,moveBoundary,split,merge,setLabel,nextLetter,normalize,colorOf,keyOf,load,save,clear,current,snapMode,setSnapMode,
  subscribe:f=>(listeners.add(f),()=>listeners.delete(f))});
}
const __xenSongPartsEdit=__xenSongPartsEditFactory(typeof localStorage!=='undefined'?localStorage:null);
