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
  if(mode==='segment')mode='beat';/* parts: the analysis' segment grid */
  const g=mode==='bar'?grid?.bars:mode==='beat'?grid?.segments:null;if(!g||!g.length||mode==='off')return t;
  let lo=0,hi=g.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(g[m]<=t)lo=m;else hi=m}
  return Math.abs(g[lo]-t)<=Math.abs(g[hi]-t)?g[lo]:g[hi];
 }
 /* the loop mask while dragging: only the edge that moves snaps; a moved mask keeps its length and snaps its start */
 function snapRange(range,grid,mode,edge='both',total=Infinity){
  if(!range||mode==='off'||!grid)return range;
  let s=range.startSec,e=range.startSec+range.durationSec;
  /* GRAB-EDGE-01: a moved mask keeps its length EXACTLY – if the nearest grid line would push its end past the file end (or its start
     below 0), it takes the nearest grid line where it still fits; none fits: unchanged (before, the end was cut and the Taktometer squeezed) */
  if(edge==='move'){const len=e-s,g=(mode==='bar'?grid.bars:grid.segments)||[];let ns=snapTime(s,grid,mode);
   if(ns<0||ns+len>total+1e-6){let best=null;for(const t of g)if(t>=0&&t+len<=total+1e-6&&(best==null||Math.abs(t-s)<Math.abs(best-s)))best=t;if(best==null)return range;ns=best}
   return {startSec:ns,durationSec:len}}
  else{if(edge!=='end')s=snapTime(s,grid,mode);if(edge!=='start')e=snapTime(e,grid,mode)}
  /* GRAB-EDGE-01: the moving edge collapsed onto the fixed one (pulled over it): keep ONE grid step instead of a 50 ms sliver */
  if(e-s<.05&&(edge==='start'||edge==='end')){const g=(mode==='bar'?grid.bars:grid.segments)||[];
   if(edge==='end'){const n=g.find(t=>t>s+.05);if(n!=null&&n<=total+1e-6)e=n}else{let q=null;for(const t of g)if(t<e-.05)q=t;if(q!=null&&q>=0)s=q}}
  if(e-s<.05)return range;
  return {startSec:Math.max(0,s),durationSec:Math.min(total,e)-Math.max(0,s)};
 }
 /* derived fields of a stretch from the grid: whole bars between its edges, loop = bar line to bar line */
 function stretch(start,end,S,grid,total){
  const bars=grid?.bars??[],eps=.05;
  const inside=bars.filter(t=>t>=start-eps&&t<end-eps),ls=inside.length?inside[0]:start;
  const after=bars.find(t=>t>=end-eps),le=after!=null&&after<=total+eps?after:end;
  const nb=Math.max(1,inside.filter(t=>t<le-eps).length||Math.round((le-ls)/Math.max(.1,grid?.barSec||2)));
  const loopEndSec=Math.max(ls+.05,le);return {loopStartSec:ls,loopEndSec,bars:nb,segments:nb*S,segmentsPerBar:S,bpm:60*nb*S/Math.max(1e-6,loopEndSec-ls)};
 }
 /* section colour: the part colour, hue turned per section (C1, C2 …) – shown in the lower half of the block */
 function shade(hex,k){
  const n=parseInt(String(hex).slice(1),16),r=(n>>16&255)/255,g=(n>>8&255)/255,b=(n&255)/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,d=mx-mn;
  let h=0,s0=d?d/(1-Math.abs(2*l-1)):0;if(d){h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;h*=60}
  const turn=[-38,38,-76,76,-114,114][k%6]+(k>=6?18:0),H=((h+turn)%360+360)%360,L=Math.max(.28,Math.min(.62,l-.06+(k%2?.05:0))),S2=Math.min(1,s0+.1);
  const c=(1-Math.abs(2*L-1))*S2,x=c*(1-Math.abs((H/60)%2-1)),m=L-c/2,[R,G,B]=H<60?[c,x,0]:H<120?[x,c,0]:H<180?[0,c,x]:H<240?[0,x,c]:H<300?[x,0,c]:[c,0,x];
  return '#'+[R,G,B].map(v=>Math.round((v+m)*255).toString(16).padStart(2,'0')).join('');
 }
 function derive(p,grid,i,n,total){
  const S=Math.max(1,p.segmentsPerBar||grid?.segmentsPerBar||4),startSec=i===0?0:p.startSec,endSec=i===n-1?total:p.endSec,color=colorOf(p.label);
  const out={...p,index:i,startSec,endSec,...stretch(p.startSec,p.endSec,S,grid,total),color,colorIndex:letterIndex(p.label)};
  // sections (C1, C2 …): the cuts inside the part; each section is a selectable loop of whole bars with its own shade
  const cuts=(p.cuts??[]).filter(t=>t>startSec+.05&&t<endSec-.05).sort((x,y)=>x-y);out.cuts=cuts;
  out.subParts=cuts.length?[startSec,...cuts].map((st,k,arr)=>{const en=k+1<arr.length?arr[k+1]:endSec;return {startSec:st,endSec:en,...stretch(st,en,S,grid,total),shade:shade(color,k)}}):null;
  return out;
 }
 /* SONG-PART-TAGS-01: repetition number (A1, A2 … only when the letter occurs more than once) and section letters (A1a, A1b …);
    the repetition colour is the edge colour of a sent card. Palettes from __XenSongPartTint (main bundle) when present. */
 const OCC=globalThis.__XenSongPartTint?.OCC_COLORS??['#4ade80','#f43f5e','#facc15','#22d3ee','#c084fc','#fb923c','#e2e8f0','#84cc16'];
 const subLetter=k=>k<26?String.fromCharCode(97+k):'z'+(k-25);
 function tagParts(parts){
  const count={},seen={};for(const p of parts)count[p.label]=(count[p.label]||0)+1;
  return parts.map(p=>{const occ=seen[p.label]=(seen[p.label]||0)+1,repeats=count[p.label],tag=p.label+(repeats>1?occ:'');
   return {...p,occ,repeats,tag,occColor:repeats>1?OCC[(occ-1)%OCC.length]:null,
    subParts:p.subParts?p.subParts.map((q,k)=>({...q,tag:tag+subLetter(k),subLetter:subLetter(k)})):p.subParts}});
 }
 function normalize(parts,grid,total){const n=parts.length;return tagParts(parts.map((p,i)=>derive({...p,edited:p.edited??false},grid,i,n,total)))}
 // editing starts from the parts as shown: sections found by the analysis become cuts the user can keep or remove
 const clean=p=>{const {subParts,...rest}=p;return {...rest,cuts:p.cuts??(subParts&&subParts.length>1?subParts.slice(1).map(q=>q.startSec):[])}};
 const within=(cuts,a,b)=>(cuts??[]).filter(t=>t>a+.05&&t<b-.05);
 /* move the boundary between part i-1 and part i to time t (snapped); at least one grid step stays on each side */
 function moveBoundary(parts,i,t,grid,mode,total){
  if(i<=0||i>=parts.length)return parts;const a=parts[i-1],b=parts[i],min=(grid?.barSec??1)*(mode==='beat'?.25:1);
  let x=snapTime(t,grid,mode);x=Math.max(a.startSec+min,Math.min(b.endSec-min,x));if(!(x>a.startSec&&x<b.endSec))return parts;
  const out=parts.map(clean);out[i-1]={...out[i-1],endSec:x,cuts:within(out[i-1].cuts,out[i-1].startSec,x),edited:true};out[i]={...out[i],startSec:x,cuts:within(out[i].cuts,x,out[i].endSec),edited:true};return normalize(out,grid,total);
 }
 function split(parts,i,t,grid,mode,total,label=null){
  const p=parts[i];if(!p)return parts;const x=snapTime(t,grid,mode),min=(grid?.barSec??1)*.5;if(!(x>p.startSec+min&&x<p.endSec-min))return parts;
  const out=parts.map(clean),c=out[i];
  out.splice(i,1,{...c,endSec:x,cuts:within(c.cuts,c.startSec,x),edited:true},{...c,startSec:x,cuts:within(c.cuts,x,c.endSec),label:label??nextLetter(parts),edited:true});return normalize(out,grid,total);
 }
 function merge(parts,i,grid,total){ // part i absorbs part i+1 (keeps the letter of i); the old boundary stays as a section cut
  if(i<0||i+1>=parts.length)return parts;const out=parts.map(clean),a=out[i],b=out[i+1];
  out.splice(i,2,{...a,endSec:b.endSec,cuts:[...a.cuts,a.endSec,...b.cuts],edited:true});return normalize(out,grid,total);
 }
 function setLabel(parts,i,label,grid,total){const out=parts.map(clean);if(!out[i])return parts;out[i]={...out[i],label,edited:true};return normalize(out,grid,total)}
 /* subdivide: a section boundary at t (snapped), n even sections in whole bars, remove one boundary, remove all */
 function addCut(parts,i,t,grid,mode,total){
  const out=parts.map(clean),p=out[i];if(!p)return parts;const x=snapTime(t,grid,mode),min=(grid?.barSec??1)*(mode==='beat'?.25:.5);
  if(!(x>p.startSec+min&&x<p.endSec-min)||p.cuts.some(c=>Math.abs(c-x)<min))return parts;
  out[i]={...p,cuts:[...p.cuts,x].sort((a,b)=>a-b),edited:true};return normalize(out,grid,total);
 }
 function subdivideEven(parts,i,count,grid,total){
  const out=parts.map(clean),p=out[i];if(!p||!(count>=2))return parts;const eps=.05;
  const bars=(grid?.bars??[]).filter(t=>t>=p.startSec-eps&&t<p.endSec-eps);let cuts=[];
  // whole bars when the part has enough of them, else whole segments (beats), else plain time
  const segs=(grid?.segments??[]).filter(t=>t>=p.startSec-eps&&t<p.endSec-eps);
  if(bars.length>=count){const step=bars.length/count;for(let k=1;k<count;k++)cuts.push(bars[Math.round(k*step)])}
  else if(segs.length>=count){const step=segs.length/count;for(let k=1;k<count;k++)cuts.push(segs[Math.round(k*step)])}
  else{const L=p.endSec-p.startSec;for(let k=1;k<count;k++)cuts.push(p.startSec+L*k/count)}
  cuts=[...new Set(cuts)].filter(t=>t>p.startSec+eps&&t<p.endSec-eps);if(!cuts.length)return parts;
  out[i]={...p,cuts,edited:true};return normalize(out,grid,total);
 }
 function removeCut(parts,i,t,total,grid){
  const out=parts.map(clean),p=out[i];if(!p||!p.cuts.length)return parts;
  const k=p.cuts.reduce((best,c,j)=>Math.abs(c-t)<Math.abs(p.cuts[best]-t)?j:best,0);
  out[i]={...p,cuts:p.cuts.filter((_,j)=>j!==k),edited:true};return normalize(out,grid,total);
 }
 /* sections from an analysis of the part: boundaries snapped to the grid (bar / beat), duplicates and edge hits dropped */
 function setCuts(parts,i,times,grid,mode,total){
  const out=parts.map(clean),p=out[i];if(!p)return parts;const min=(grid?.barSec??1)*(mode==='beat'?.25:.75);
  const cuts=[];for(const t of [...times].sort((a,b)=>a-b)){const x=snapTime(t,grid,mode);if(x>p.startSec+min&&x<p.endSec-min&&!cuts.some(c=>Math.abs(c-x)<min))cuts.push(x)}
  if(!cuts.length)return parts;out[i]={...p,cuts,edited:true};return normalize(out,grid,total);
 }
 /* move section boundary k of part i (snapped), never past its neighbours */
 function moveCut(parts,i,k,t,grid,mode,total){
  const out=parts.map(clean),p=out[i];if(!p||!(k>=0&&k<p.cuts.length))return parts;const min=(grid?.barSec??1)*(mode==='beat'?.25:1);
  const lo=(k>0?p.cuts[k-1]:p.startSec)+min,hi=(k+1<p.cuts.length?p.cuts[k+1]:p.endSec)-min;if(!(hi>lo))return parts;
  const x=Math.max(lo,Math.min(hi,snapTime(t,grid,mode)));const cuts=p.cuts.slice();cuts[k]=x;out[i]={...p,cuts,edited:true};return normalize(out,grid,total);
 }
 /* a section every n bars (1 = every bar) */
 function subdivideEvery(parts,i,nBars,grid,total){
  const out=parts.map(clean),p=out[i];if(!p||!(nBars>0)||!Number.isFinite(nBars))return parts;const eps=.05;
  const bars=(grid?.bars??[]).filter(t=>t>p.startSec+eps&&t<p.endSec-eps),first=(grid?.bars??[]).find(t=>t>=p.startSec-eps)??p.startSec;
  let cuts;
  if(Math.abs(nBars-Math.round(nBars))<1e-9)cuts=bars.filter(t=>Math.round((t-first)/Math.max(.05,grid?.barSec||2))%Math.round(nBars)===0);
  else{/* a fraction of bars (1.5, 2.25 …): counted in segments of the grid when it divides into whole segments, else in time */
   const S=Math.max(1,grid?.segmentsPerBar||1),step=nBars*S,segs=(grid?.segments??[]).filter(t=>t>=first-eps&&t<p.endSec-eps);
   if(segs.length&&Math.abs(step-Math.round(step))<.01){const n=Math.round(step);cuts=segs.filter((t,k)=>k>0&&k%n===0)}
   else{const len=nBars*Math.max(.05,grid?.barSec||2);cuts=[];for(let t=first+len;t<p.endSec-eps;t+=len)cuts.push(t)}}
  cuts=cuts.filter(t=>t>p.startSec+eps&&t<p.endSec-eps);if(!cuts.length)return parts;
  out[i]={...p,cuts,edited:true};return normalize(out,grid,total);
 }
 function clearCuts(parts,i,grid,total){const out=parts.map(clean);if(!out[i])return parts;out[i]={...out[i],cuts:[],edited:true};return normalize(out,grid,total)}
 function nextLetter(parts){const used=new Set(parts.map(p=>p.label));for(let k=0;k<26;k++){const l=String.fromCharCode(65+k);if(!used.has(l))return l}return 'Z'}
 /* store: edits per song, persisted as the plain part list (start, end, letter, segments per bar) */
 const KEY='xensonar.songParts.edit.v1:',listeners=new Set(),mem=new Map();
 const keyOf=asset=>asset?`${asset.fileName||asset.label||'audio'}|${(Number(asset.originalDuration)||0).toFixed(3)}|${asset.sampleRate||0}`:null;
 function load(asset){const k=keyOf(asset);if(!k)return null;if(mem.has(k))return mem.get(k);
  try{const raw=storage?.getItem(KEY+k);const v=raw?JSON.parse(raw):null;if(v&&Array.isArray(v.parts)){mem.set(k,v);return v}}catch{}return null}
 function save(asset,parts){const k=keyOf(asset);if(!k)return;const v={savedAt:Date.now(),parts:parts.map(p=>({startSec:p.startSec,endSec:p.endSec,label:p.label,segmentsPerBar:p.segmentsPerBar,groups:p.groups??null,cuts:p.cuts??[],edited:!!p.edited}))};
  mem.set(k,v);try{storage?.setItem(KEY+k,JSON.stringify(v))}catch{}listeners.forEach(f=>{try{f(k)}catch{}})}
 function clear(asset){const k=keyOf(asset);if(!k)return;mem.delete(k);try{storage?.removeItem(KEY+k)}catch{}listeners.forEach(f=>{try{f(k)}catch{}})}
 /* PART-NAMES-01: a name and a colour per KIND of part (letter), per song: all A parts are "Verse" and share the colour, their
    sections read "Verse 1", "Verse 2" in shades of it. The letter stays the identity (what returns), the name is what you read. */
 const KIND_KEY='xensonar.songParts.kinds.v1:',HEXC=/^#[0-9a-f]{6}$/i;
 function kinds(asset){const k=keyOf(asset);if(!k)return {};try{const v=JSON.parse(storage?.getItem(KIND_KEY+k)||'{}');return v&&typeof v==='object'?v:{}}catch{return {}}}
 function setKind(asset,letter,patch){const k=keyOf(asset);if(!k||!letter)return;const all=kinds(asset),cur={...(all[letter]||{})};
  if('name' in patch){const n=String(patch.name??'').trim().slice(0,32);if(n&&n!==letter)cur.name=n;else delete cur.name}
  if('color' in patch){if(HEXC.test(patch.color||''))cur.color=String(patch.color).toLowerCase();else delete cur.color}
  if(Object.keys(cur).length)all[letter]=cur;else delete all[letter];
  try{Object.keys(all).length?storage?.setItem(KIND_KEY+k,JSON.stringify(all)):storage?.removeItem(KIND_KEY+k)}catch{}listeners.forEach(f=>{try{f('kinds')}catch{}})}
 function decorate(parts,kd){if(!kd||!Object.keys(kd).length)return parts;return parts.map(p=>{const o=kd[p.label];if(!o)return p;const color=o.color||p.color;
  return {...p,...(o.name?{name:o.name}:{}),color,subParts:p.subParts?p.subParts.map((q,k)=>({...q,shade:o.color?shade(color,k):q.shade})):p.subParts}})}
 /* "Verse 2" (named kind, repeated) · "Verse" · "A2" · "B"; a section: "Verse 2a" / "A2a" */
 const displayName=p=>p?.name?p.name+(p.repeats>1?' '+p.occ:''):(p?.tag||p?.label||'');
 const sectionName=(p,q)=>p?.name?displayName(p)+(p.repeats>1?'':' ')+(q?.subLetter??''):(q?.tag??'');
 /* the parts to show: the saved working copy (re-derived on the current grid) or the analysis, with names and colours */
 function current(asset,result){const v=load(asset),kd=kinds(asset);if(!v||!result?.ok)return {parts:decorate(tagParts(result?.parts??[]),kd),edited:false};
  return {parts:decorate(normalize(v.parts,result.grid,result.durationSec),kd),edited:true}}
 /* SONG-PARTS-MANUAL-01: the finished song analysis is kept per song (without the novelty curve), so a song that was analysed
    once shows its parts at once after a reload; a new song is only analysed when the strip is clicked. At most MAX_RESULTS songs. */
 const RES_KEY='xensonar.songParts.analysis.v1:',RES_INDEX='xensonar.songParts.analysis.index.v1',MAX_RESULTS=24,resMem=new Map();
 function loadResult(asset){const k=keyOf(asset);if(!k)return null;if(resMem.has(k))return resMem.get(k);
  try{const raw=storage?.getItem(RES_KEY+k);const v=raw?JSON.parse(raw):null;if(v?.ok&&Array.isArray(v.parts)){resMem.set(k,v);return v}}catch{}return null}
 function saveResult(asset,result){const k=keyOf(asset);if(!k||!result?.ok||!Array.isArray(result.parts))return;
  const {novelty,debug,...keep}=result;keep.analyzedAt=Date.now();resMem.set(k,keep);
  try{let idx=[];try{idx=JSON.parse(storage?.getItem(RES_INDEX)||'[]')}catch{}if(!Array.isArray(idx))idx=[];idx=idx.filter(x=>x!==k);idx.push(k);
   while(idx.length>MAX_RESULTS){const old=idx.shift();try{storage?.removeItem(RES_KEY+old);storage?.removeItem('xensonar.songParts.tonal.v1:'+old)}catch{}}
   storage?.setItem(RES_KEY+k,JSON.stringify(keep));storage?.setItem(RES_INDEX,JSON.stringify(idx))}catch{}}
 function clearResult(asset){const k=keyOf(asset);if(!k)return;resMem.delete(k);try{storage?.removeItem(RES_KEY+k)}catch{}}
 /* KEY-02: the pitch-line analysis of the Wave Editor (root in Hz, tuning, scale) per part, run on demand and kept per song.
    An entry belongs to a part when the two overlap by at least 80 % of each (edited boundaries keep a nearby result). */
 const TON_KEY='xensonar.songParts.tonal.v1:';
 function tonalList(asset){const k=keyOf(asset);if(!k)return [];try{const v=JSON.parse(storage?.getItem(TON_KEY+k)||'[]');return Array.isArray(v)?v:[]}catch{return []}}
 function tonalFor(asset,range){if(!range)return null;let best=null,bo=0;for(const t of tonalList(asset)){const o=Math.min(t.endSec,range.endSec)-Math.max(t.startSec,range.startSec);
   if(o<=0)continue;const f=Math.min(o/Math.max(1e-9,t.endSec-t.startSec),o/Math.max(1e-9,range.endSec-range.startSec));if(f>=.8&&f>bo){bo=f;best=t}}return best}
 function saveTonal(asset,entry){const k=keyOf(asset);if(!k||!entry)return;const list=tonalList(asset).filter(t=>!(Math.abs(t.startSec-entry.startSec)<.05&&Math.abs(t.endSec-entry.endSec)<.05));
  list.push(entry);list.sort((a,b)=>a.startSec-b.startSec);try{storage?.setItem(TON_KEY+k,JSON.stringify(list.slice(-64)))}catch{}listeners.forEach(f=>{try{f('tonal')}catch{}})}
 function clearTonal(asset){const k=keyOf(asset);if(!k)return;try{storage?.removeItem(TON_KEY+k)}catch{}listeners.forEach(f=>{try{f('tonal')}catch{}})}
 // mask snap mode (bar / beat / off), shared by the strip and the purple mask
 const SNAP_KEY='xensonar.songParts.snap.v1';
 function snapMode(){try{const v=storage?.getItem(SNAP_KEY);return v==='bar'||v==='beat'||v==='segment'||v==='off'?v:'bar'}catch{return 'bar'}}
 function setSnapMode(m){try{storage?.setItem(SNAP_KEY,m)}catch{}listeners.forEach(f=>{try{f('snap')}catch{}})}
 return Object.freeze({snapTime,snapRange,moveBoundary,split,merge,setLabel,addCut,subdivideEven,subdivideEvery,setCuts,moveCut,removeCut,clearCuts,shade,nextLetter,normalize,colorOf,keyOf,load,save,clear,kinds,setKind,decorate,displayName,sectionName,tagParts,subLetter,OCC_COLORS:OCC,loadResult,saveResult,clearResult,tonalList,tonalFor,saveTonal,clearTonal,current,snapMode,setSnapMode,
  subscribe:f=>(listeners.add(f),()=>listeners.delete(f))});
}
const __xenSongPartsEdit=__xenSongPartsEditFactory(typeof localStorage!=='undefined'?localStorage:null);
