/* XenSonar THUNDER-HPP01 · Hold Pattern Plan (KALT zone, function island).
   Evaluated only when the Plan view of the Hold Pattern Studio opens. Owns:
   - the plan model (one Hold Pattern per AUDIBLE step of one tuning period, self-contained),
   - the named plan library (separate IndexedDB, never touches the Hold Pattern Memory DB),
   - preset generators, deviation analysis and the Plan view UI.
   The active plan is the working copy nParamsUI.keyboardHoldPlan (saved with sessions);
   the hot path only reads it through __XenHoldPlanRuntime.forHz at key attack. */
function __xenHoldPatternPlanFactory(){
'use strict';
const DB='xensonar-thunder-hold-pattern-plans-v1',STORE='plans',SCHEMA=1,MAX_POSITIONS=256,MAX_JSON=200000;
const fail=s=>{throw Error('Hold Pattern Plan: '+s)};
const copy=v=>JSON.parse(JSON.stringify(v));
const stamp=()=>new Date().toISOString();
const newId=()=>globalThis.crypto?.randomUUID?.()||'hpp-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const memory=()=>globalThis.__XenHoldPatternMemory??(globalThis.__XenHoldPatternMemory=__xenGetDeferredFn('__xenHoldPatternMemoryFactory')());

/* ---------- Grid model ---------- */
function tuningLabel(id){try{return hc(id)?.label||String(id)}catch{return String(id)}}
function modeLabel(id){try{return (yF.find(m=>m.value===id)?.label||String(id||'')).replace(/\s*\(.*\)$/,'')}catch{return String(id||'')}}
function periodName(cents){return Math.abs(cents-1200)<1?'octave':Math.abs(cents-1901.955)<2?'tritave':Math.round(cents)+' ¢ period'}
/* Native Grid = the tuning context a plan was made for. Restorable: it is exactly what the
   Live Room Grid owner stores (tuning, mode, mutes, offsets, root). */
function nativeGrid(origin){
 const tuningId=String(origin?.tuningId||'12edo'),modeId=String(origin?.modeId||'chromatic');
 const gridBaseHz=Number(origin?.gridBaseHz)>0?Number(origin.gridBaseHz):220;
 const mainMutedDegrees=(origin?.mainMutedDegrees||[]).filter(Number.isInteger).slice(0,256);
 const mainStepOffsets=(origin?.mainStepOffsets||[]).map(v=>Number(v)||0).slice(0,256);
 let steps=[],periodCents=1200;try{steps=Kp(tuningId)||[];periodCents=Number(vF(tuningId))||1200}catch{}
 const muted=new Set(mainMutedDegrees),audible=[];
 steps.forEach((c,degree)=>{if(muted.has(degree))return;const raw=Number(c)+(mainStepOffsets[degree]||0)*10;
  if(Number.isFinite(raw))audible.push({degree,cents:Math.round((((raw%periodCents)+periodCents)%periodCents)*1000)/1000})});
 audible.sort((a,b)=>a.cents-b.cents||a.degree-b.degree);
 return {tuningId,modeId,gridBaseHz,mainMutedDegrees,mainStepOffsets,periodCents,audible:audible.slice(0,MAX_POSITIONS)};
}
/* Steps are named neutrally: index within the period, Grid degree, cents. No tonal function is
   inferred from the step count. A user may give any step its own label (e.g. a function name
   where it fits); labels belong to the plan and never change pitch or playback. */
function gridTitle(g){const m=modeLabel(g.modeId);return tuningLabel(g.tuningId)+(m?' '+m:'')}
const labelOf=(plan,i)=>{const l=plan?.labels?.[i];return typeof l==='string'?l.trim():''};
function positionLabel(g,i,plan){const l=labelOf(plan,i);return 'step '+(i+1)+'/'+g.audible.length+(l?' “'+l+'”':'')}
function suggestName(g,i,plan){const l=labelOf(plan,i);
 return (gridTitle(g)+' · step '+(i+1)+'/'+g.audible.length+' · '+Math.round(g.audible[i].cents)+'¢'+(l?' · '+l:'')).slice(0,80)}
/* Deviation never blocks playing; it explains how the plan is projected. */
function deviation(plan,origin){
 if(!plan?.nativeGrid)return {level:'none',text:''};
 const a=plan.nativeGrid,b=nativeGrid(origin),n=a.audible.length,m=b.audible.length;
 const sameSet=a.tuningId===b.tuningId&&n===m&&a.audible.every((x,i)=>x.degree===b.audible[i].degree);
 const sameCents=sameSet&&a.audible.every((x,i)=>Math.abs(x.cents-b.audible[i].cents)<.01);
 const rootMoved=Math.abs(Math.log2(a.gridBaseHz/b.gridBaseHz))>1e-6;
 if(sameCents)return {level:rootMoved?'transposed':'match',native:a,current:b,
  text:rootMoved?'Same Grid, root moved from '+a.gridBaseHz.toFixed(2)+' Hz to '+b.gridBaseHz.toFixed(2)+' Hz. Positions are unchanged.':'Playing on its native Grid.'};
 if(sameSet)return {level:'retuned',native:a,current:b,text:'Same steps, but fine-tuned differently than when the plan was made. Patterns keep their own cents.'};
 const wrap=m>n?' Positions '+(n+1)+'–'+m+' reuse positions 1–'+(m-n)+'.':m<n?' Positions '+(m+1)+'–'+n+' are not reachable.':'';
 return {level:'deviation',native:a,current:b,
  text:'Deviation: made for '+gridTitle(a)+' ('+n+' audible steps per '+periodName(a.periodCents)+'), now '+gridTitle(b)+' ('+m+' per '+periodName(b.periodCents)+'). Patterns are projected by step order.'+wrap};
}

/* ---------- Plan model ---------- */
function validatePattern(raw){return copy(memory().validate({...raw,sourceLane:'keyboard'}))}
function patternOnly(p){const v=validatePattern(p);return {slots:v.slots,referenceBars:v.referenceBars,muteSteps:v.muteSteps,pitchCents:v.pitchCents,slotVolumes:v.slotVolumes,microtiming:v.microtiming}}
function validatePlan(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))fail('Invalid plan');
 const g=raw.nativeGrid;if(!g||typeof g.tuningId!=='string'||!Array.isArray(g.audible)||!g.audible.length||g.audible.length>MAX_POSITIONS)fail('Invalid native Grid');
 if(!(Number(g.periodCents)>1)||!(Number(g.gridBaseHz)>0))fail('Invalid native Grid period/root');
 if(!Array.isArray(raw.entries)||raw.entries.length!==g.audible.length)fail('Entries must match the audible steps');
 const name=typeof raw.name==='string'?raw.name.trim().slice(0,80):'';
 const plan={version:1,name,enabled:raw.enabled!==false,
  nativeGrid:{tuningId:g.tuningId.slice(0,1024),modeId:String(g.modeId||'').slice(0,160),gridBaseHz:Number(g.gridBaseHz),
   mainMutedDegrees:(g.mainMutedDegrees||[]).filter(Number.isInteger).slice(0,256),mainStepOffsets:(g.mainStepOffsets||[]).map(v=>Number(v)||0).slice(0,256),
   periodCents:Number(g.periodCents),audible:g.audible.map(x=>({degree:x.degree|0,cents:Number(x.cents)||0}))},
  entries:raw.entries.map(e=>e?{pattern:patternOnly(e.pattern),source:{kind:String(e.source?.kind||'copy').slice(0,20),name:String(e.source?.name||'').slice(0,80)}}:null),
  labels:g.audible.map((_,i)=>typeof raw.labels?.[i]==='string'?raw.labels[i].trim().slice(0,40):'')};
 if(JSON.stringify(plan).length>MAX_JSON)fail('Plan is too large (max 200 KB)');
 return plan;
}
function createPlan(origin,name=''){const g=nativeGrid(origin);if(!g.audible.length)fail('The current Grid has no audible steps');
 return {version:1,name,enabled:true,nativeGrid:g,entries:g.audible.map(()=>null),labels:g.audible.map(()=>'')}}
function setLabel(plan,pos,text){const labels=plan.nativeGrid.audible.map((_,i)=>labelOf(plan,i));labels[pos]=String(text||'').slice(0,40);return {...plan,labels}}
const withEntries=(plan,fn)=>{const entries=plan.entries.slice();fn(entries);return {...plan,entries}};
function assign(plan,pos,pattern,source){return withEntries(plan,e=>{e[pos]={pattern:patternOnly(pattern),source:{kind:source?.kind||'copy',name:String(source?.name||'').slice(0,80)}}})}
function clearPosition(plan,pos){return withEntries(plan,e=>{e[pos]=null})}
function reanchor(plan,origin){const g=nativeGrid(origin),n=plan.entries.length;
 return {...plan,nativeGrid:g,entries:g.audible.map((_,i)=>plan.entries[i%n]??null),labels:g.audible.map((_,i)=>labelOf(plan,i%n))}}

/* ---------- Presets: neutral figures in GRID STEPS of the plan's own Grid ----------
   An offset of +1 means "the next audible step of this Grid", whatever its size (19-EDO chromatic,
   Bohlen-Pierce, a sparse mode). Nothing assumes 7 steps, an octave or a tonal function.
   Pattern pitches are limited to ±1200 cents (Hold Pattern range); larger leaps fold by the period. */
function stepCents(g,pos,k){const n=g.audible.length,t=pos+k,wrap=Math.floor(t/n),i=((t%n)+n)%n;
 let c=g.audible[i].cents+wrap*g.periodCents-g.audible[pos].cents;
 while(c>1200)c-=g.periodCents;while(c<-1200)c+=g.periodCents;return Math.round(c*1000)/1000}
function stepsPattern(g,pos,offsets,{bars=1}={}){
 const slots=offsets.length;return {slots,referenceBars:bars,muteSteps:offsets.map(()=>1),
  pitchCents:offsets.map(k=>stepCents(g,pos,k)),slotVolumes:offsets.map((_,i)=>i===0?1:.82),microtiming:offsets.map(()=>0)}}
const split=(n,m)=>Array.from({length:m},(_,i)=>Math.round(i*n/m));
const PRESETS=[
 {id:'pulse',label:'Pulse · 0',info:'Every step repeats only itself (4 slots). A neutral start to paint over.',
  make:(g,p)=>stepsPattern(g,p,[0,0,0,0])},
 {id:'neighbours',label:'Neighbours · 0 +1 0 −1',info:'Each step alternates with its upper and lower audible neighbour in this Grid.',
  make:(g,p)=>stepsPattern(g,p,[0,1,0,-1])},
 {id:'run',label:'Run · 0 +1 +2 +3 +2 +1',info:'Three consecutive audible steps up and back.',
  make:(g,p)=>stepsPattern(g,p,[0,1,2,3,2,1])},
 {id:'mirror',label:'Mirror · 0 +1 +2 +1 0 −1 −2 −1',info:'Symmetric figure around each step.',
  make:(g,p)=>stepsPattern(g,p,[0,1,2,1,0,-1,-2,-1])},
 {id:'split3',label:'Period ÷ 3',info:'Divides this Grid’s audible steps into 3 equal step counts (e.g. 19 steps → 0 +6 +13).',
  make:(g,p)=>stepsPattern(g,p,split(g.audible.length,3))},
 {id:'split4',label:'Period ÷ 4',info:'Divides this Grid’s audible steps into 4 equal step counts (e.g. 13 steps → 0 +3 +7 +10).',
  make:(g,p)=>stepsPattern(g,p,split(g.audible.length,4))},
 {id:'polymeter',label:'Polymeter · 3 4 5 6 7 …',info:'Step k gets 3 + (k mod 5) slots of a 0 +1 +2 +1 figure: different subdivisions across the keys.',
  make:(g,p)=>{const len=3+(p%5),fig=[0,1,2,1];return stepsPattern(g,p,Array.from({length:len},(_,i)=>fig[i%fig.length]))}}
];
/* HOLD-LIB-03: plans from music theory. Figures are built from GRID STEPS of the plan's own Grid: +2 steps = a third, +4 = a fifth, +6 = a seventh, +n = the period
   (n = audible steps). In a 7-step major mode this gives major triads on I IV V and minor ones on II III VI, in a minor mode the minor-key harmony; in other Grids
   the same step arithmetic gives the corresponding "skip-a-step" stacks. Roles (tonic / subdominant / dominant, subject / answer / episode) look at the position
   as a degree of a 7-step view (position × 7 ÷ steps), so they stay meaningful when the Grid has another size. Hold patterns span at most ±1200 cents. */
const degree7=(g,pos)=>{const n=g.audible.length;return n<2?0:Math.min(6,Math.floor(pos*7/n))};
const rich=(g,pos,offs,o={})=>({slots:offs.length,referenceBars:o.bars||1,muteSteps:o.mute?o.mute.split('').map(Number):offs.map(()=>1),
 pitchCents:offs.map(k=>stepCents(g,pos,k)),slotVolumes:o.vol||offs.map((_,i)=>i===0?1:.82),microtiming:o.micro||offs.map(()=>0)});
const swing=(len,d=.25)=>Array.from({length:len},(_,i)=>i%2?d:0);
const accent=(len,every=4)=>Array.from({length:len},(_,i)=>i===0?1:i%every===0?.92:.72);
PRESETS.push(
 {group:'Theory · basics',id:'triads',label:'Triads · 1 3 5 8 5 3',info:'Every step arpeggiates its own triad (root, third, fifth, octave, back). Major or minor follows the Grid mode: major triads on I IV V in a major mode, minor in a minor mode.',
  make:(g,p)=>rich(g,p,[0,2,4,g.audible.length,4,2],{vol:accent(6,3)})},
 {group:'Theory · basics',id:'sevenths',label:'Sevenths · 1 3 5 7 5 3',info:'Seventh chords on every step (root, third, fifth, seventh, back): maj7 / m7 / dominant 7 / half-diminished, decided by the Grid mode.',
  make:(g,p)=>rich(g,p,[0,2,4,6,4,2],{vol:accent(6,3)})},
 {group:'Theory · Jazz',id:'jazz-walk',label:'Jazz · walking line',info:'Quarter-note walking bass over two bars: root, third, fifth, third | root, second, third, approach from below. Every step walks from itself.',
  make:(g,p)=>rich(g,p,[0,2,4,2,0,1,2,-1],{bars:2,vol:[1,.7,.85,.7,.95,.7,.85,.7]})},
 {group:'Theory · Jazz',id:'jazz-shells',label:'Jazz · Charleston shells (3 7 5)',info:'Comping with guide tones: third on the 1, seventh on the "and" of 2, fifth on the "and" of 3, swung eighths. Rests are real muted steps.',
  make:(g,p)=>rich(g,p,[2,0,0,6,0,4,0,0],{mute:'10010100',vol:[1,.6,.6,.85,.6,.8,.6,.6],micro:swing(8,.28)})},
 {group:'Theory · Jazz',id:'jazz-func',label:'Jazz · functional colours (T S D)',info:'Different figures by harmonic function (in a 7-step view): tonic I III VI = slow seventh arpeggio, subdominant II IV = flowing sextuplet seventh run, dominant V VII = swung eighth line with a leading-tone approach.',
  make:(g,p)=>{const d=degree7(g,p);
   if(d===0||d===2||d===5)return rich(g,p,[0,2,4,6],{vol:[1,.7,.75,.8]});
   if(d===1||d===3)return rich(g,p,[0,2,4,6,4,2],{vol:accent(6,3)});
   return rich(g,p,[0,2,4,6,4,2,1,-1],{vol:accent(8,2),micro:swing(8,.22)})}},
 {group:'Theory · Baroque',id:'alberti',label:'Baroque · Alberti bass',info:'Root, fifth, third, fifth, repeated: the classical accompaniment figure on every step.',
  make:(g,p)=>rich(g,p,[0,4,2,4,0,4,2,4],{vol:[1,.7,.85,.7,.95,.7,.85,.7]})},
 {group:'Theory · Baroque',id:'prelude',label:'Baroque · prelude figure',info:'Broken-chord prelude figure within one octave: 1 3 5 8 5 3 5 8 (after the well-known C major prelude pattern).',
  make:(g,p)=>rich(g,p,[0,2,4,g.audible.length,4,2,4,g.audible.length],{vol:accent(8,4)})},
 {group:'Theory · Baroque',id:'fugue',label:'Baroque · fugue voices',info:'Voices by degree (7-step view): I = subject (scale run 1 2 3 4 5 4 3 2), V = answer (same subject, entering one slot later), II and VI = episode (rising sequence in thirds), III IV VII = countersubject (syncopated, with rests).',
  make:(g,p)=>{const d=degree7(g,p);
   if(d===0)return rich(g,p,[0,1,2,3,4,3,2,1],{vol:accent(8,4)});
   if(d===4)return rich(g,p,[0,1,2,3,4,3,2,1],{mute:'01111111',vol:accent(8,4)});
   if(d===1||d===5)return rich(g,p,[0,2,1,3,2,4,3,5],{vol:accent(8,2)});
   return rich(g,p,[0,-1,0,2,0,-1,0,2],{mute:'10110101',vol:[1,.6,.8,.9,.6,.7,.6,.85]})}}
);
for(const q of PRESETS)q.group??='Neutral figures';
function fromPreset(id,origin,name){const pr=PRESETS.find(x=>x.id===id);if(!pr)fail('Unknown preset');
 const plan=createPlan(origin,name||pr.label+' · '+gridTitle(nativeGrid(origin)));
 return {...plan,entries:plan.nativeGrid.audible.map((_,i)=>({pattern:patternOnly(pr.make(plan.nativeGrid,i)),source:{kind:'preset',name:pr.label}}))}}

/* ---------- Plan library (own DB; schema-independent from Hold Pattern Memory) ---------- */
let opening=null;
function open(){if(opening)return opening;
 opening=new Promise((resolve,reject)=>{if(!globalThis.indexedDB){reject(Error('IndexedDB unavailable'));return}
  let req;try{req=indexedDB.open(DB,1)}catch(e){reject(e);return}
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'id'})};
  req.onsuccess=()=>{const db=req.result;db.onversionchange=()=>{db.close();opening=null};resolve(db)};
  req.onerror=()=>reject(req.error||Error('Cannot open plan library'));req.onblocked=()=>reject(Error('Plan library blocked by another tab'));
 }).catch(e=>{opening=null;throw e});return opening}
async function run(mode,op){const db=await open();return new Promise((resolve,reject)=>{let result,error=null;
 const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE),r=store.getAll();
 r.onsuccess=()=>{try{result=op(r.result.filter(x=>x?.schemaVersion===SCHEMA),store)}catch(e){error=e;try{tx.abort()}catch{}}};
 tx.oncomplete=()=>resolve(copy(result??null));tx.onabort=()=>reject(error||tx.error||Error('Plan transaction aborted'))})}
const key=n=>n.normalize('NFKC').toLocaleLowerCase();
const cleanName=n=>{const v=String(n||'').trim();if(!v||v.length>80)fail('Name must have 1–80 characters');return v};
const store={
 list:()=>run('readonly',rows=>rows.slice().sort((a,b)=>a.name.localeCompare(b.name))),
 saveAs:(name,plan)=>{const clean=cleanName(name),p=validatePlan({...plan,name:clean});return run('readwrite',(rows,s)=>{
  if(rows.some(r=>key(r.name)===key(clean)))fail('A plan with that name already exists');
  const at=stamp(),row={schemaVersion:SCHEMA,id:newId(),revision:1,name:clean,plan:p,createdAt:at,updatedAt:at};s.add(row);return row})},
 overwrite:(id,plan,revision)=>run('readwrite',(rows,s)=>{const row=rows.find(r=>r.id===id);if(!row)fail('Plan no longer exists');
  if(row.revision!==revision)fail('Plan changed in another tab; reload the list');
  const next={...row,revision:row.revision+1,plan:validatePlan({...plan,name:row.name}),updatedAt:stamp()};s.put(next);return next}),
 remove:(id)=>run('readwrite',(rows,s)=>{const row=rows.find(r=>r.id===id);if(!row)fail('Plan no longer exists');s.delete(id);return {id}})
};

/* ---------- Lazy styles (cold: injected on first use, never at boot) ---------- */
if(typeof document!=='undefined'&&!document.getElementById('xen-hpp01-styles')){
 const st=document.createElement('style');st.id='xen-hpp01-styles';st.textContent=`
.xen-hpp-tabs{display:flex;gap:4px}.xen-hpp-tabs button[aria-selected=true]{background:#3b2a58!important;border-color:#c9a5f5!important;color:#fff}
.xen-hpp-banner{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 6px;padding:6px 8px;border:1px solid #c79a4a;border-radius:7px;background:#2a2112;color:#f7e0b0;font-size:12px}
.xen-hpp{display:grid;flex:1;min-height:0;grid-template-columns:minmax(170px,1fr) minmax(260px,1.6fr) minmax(230px,1.2fr);gap:9px}
.xen-hpp>div{min-width:0;min-height:0;background:#151422;border:1px solid #403551;border-radius:7px;padding:9px;display:flex;flex-direction:column;gap:7px;overflow:auto}
.xen-hpp strong{font-size:12px;color:#e4c8ff}.xen-hpp p{margin:0;font-size:11px;color:#b9abc9}
.xen-hpp-lib-row{display:flex;flex-direction:column;gap:3px;text-align:left;font-size:11px;padding:6px!important;cursor:grab!important}
.xen-hpp-lib-row.armed{border-color:#f7d18a!important;background:#3a2f18!important}
.xen-hpp-dots{display:flex;gap:1px;height:7px;align-items:stretch}.xen-hpp-dots i{flex:1;max-width:9px;background:#3a3550;border-radius:1px}.xen-hpp-dots i.on{background:#8fd9b6}
.xen-hpp-ladder{display:flex;flex-direction:column-reverse;gap:4px}
.xen-hpp-step{display:grid;grid-template-columns:52px minmax(0,1fr) auto;gap:6px;align-items:center;padding:5px 6px;border:1px solid #4a3d62;border-radius:6px;background:#1c1a2c;cursor:pointer}
.xen-hpp-step.selected{border-color:#c9a5f5;box-shadow:0 0 0 1px #c9a5f5 inset}.xen-hpp-step.drop{border-color:#f7d18a;background:#2d2616}
.xen-hpp-step.live{box-shadow:0 0 0 2px #7ef0c4 inset}.xen-hpp-step.unreachable{opacity:.45}
.xen-hpp-step b{font-size:13px;color:#f3e6ff}.xen-hpp-step small{display:block;font-size:10px;color:#9d8fb2}
.xen-hpp-step .empty{font-size:11px;color:#7d728f;font-style:italic}.xen-hpp-step .name{font-size:11px;color:#e8e1f2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.xen-hpp-step-actions{display:flex;gap:3px}.xen-hpp-step-actions button{padding:2px 6px!important;font-size:11px}
.xen-hpp-basis{display:flex;flex-direction:column;gap:5px;padding:7px;border:1px solid #3d5a4c;border-radius:6px;background:#111d18}.xen-hpp-basis strong{color:#bfeed6!important}
.xen-hpp-degrees{display:flex;flex-wrap:wrap;gap:2px}.xen-hpp-degrees i{width:9px;height:9px;border-radius:2px;background:#2b2a38}.xen-hpp-degrees i.on{background:#8fd9b6}
.xen-hpp-dev{font-size:11px;border-radius:6px;padding:6px;border:1px solid #3d5a4c;background:#132219;color:#bfeed6}
.xen-hpp-dev.deviation{border-color:#c79a4a;background:#2a2112;color:#f7e0b0}.xen-hpp-dev.retuned,.xen-hpp-dev.transposed{border-color:#5a6ec7;background:#151b33;color:#c8d3ff}
.xen-hpp-row{display:flex;flex-wrap:wrap;gap:5px;align-items:center}.xen-hpp label{display:flex;flex-direction:column;gap:3px;font-size:11px;color:#e7d3f4}
.xen-hpp input[type=text],.xen-hpp select{background:#0c101c;color:#e5ddfa;border:1px solid #5d5080;border-radius:4px;padding:5px;font-size:12px}
.xen-hpp-toggle{display:flex!important;flex-direction:row!important;align-items:center;gap:6px!important;font-size:12px!important}
@media(max-width:930px){.xen-hpp{display:flex;flex-direction:column;overflow:auto}.xen-hpp>div{flex:none;overflow:visible}}`;
 document.head.appendChild(st);
}

/* ---------- Plan view ---------- */
const DND_PATTERN='application/x-xen-hold-pattern',DND_POS='application/x-xen-hpp-position';
function Dots({pattern}){const m=(pattern?.muteSteps||[]).slice(0,32);return u.jsx('span',{className:'xen-hpp-dots','aria-hidden':'true',children:m.map((v,i)=>u.jsx('i',{className:v?'on':''},i))})}
/* The plan has no tuning model of its own: its steps ARE the audible steps of the Main Room Grid.
   This card shows that basis and links to the room's own Grid tools instead of duplicating them. */
function GridBasis({origin,onOpenGridWorkbench}){
 const g=nativeGrid(origin);let total=0;try{total=(Kp(g.tuningId)||[]).length}catch{}
 const muted=new Set(g.mainMutedDegrees);
 return u.jsxs('div',{className:'xen-hpp-basis','data-xen-hpp-basis':'true',children:[
  u.jsxs('div',{className:'xen-hpp-row',style:{justifyContent:'space-between'},children:[u.jsx('strong',{children:'Basis · Main Room Grid'}),
   onOpenGridWorkbench?u.jsx('button',{type:'button',onClick:onOpenGridWorkbench,title:'Close the studio and open the Main Room Grid Workbench (tunings, periods, steps).',children:'Grid Workbench…'}):null]}),
  u.jsx('p',{children:gridTitle(g)+' · period '+Math.round(g.periodCents*1000)/1000+' ¢ ('+periodName(g.periodCents)+') · '+g.audible.length+' of '+total+' steps audible · root '+g.gridBaseHz.toFixed(2)+' Hz'}),
  u.jsx('span',{className:'xen-hpp-degrees','aria-label':'Grid degrees of one period; dim = muted',children:Array.from({length:Math.min(total,256)},(_,d)=>u.jsx('i',{className:muted.has(d)?'':'on',title:'degree '+d+(muted.has(d)?' · muted':'')},d))}),
  u.jsx('p',{children:'Tuning, period, mode and mutes are set in the Main Room (Grid System, Grid Mode, Grid Workbench). Every audible step becomes one plan step.'})]});
}
function PresetPicker({value,onChange,children}){
 return u.jsxs('div',{className:'xen-hpp-row',children:[
  u.jsx('select',{'aria-label':'Plan preset',value,onChange:e=>onChange(e.target.value),children:[...new Set(PRESETS.map(p=>p.group))].map(gr=>u.jsx('optgroup',{label:gr,children:PRESETS.filter(p=>p.group===gr).map(p=>u.jsx('option',{value:p.id,title:p.info,children:p.label},p.id))},gr))}),children]});
}
function PlanView({plan,origin,workingPattern,onPlanChange,onRestoreGrid,onEditPosition,onAudition,armedPosition,onOpenGridWorkbench}){
 const [library,setLibrary]=P.useState([]),[plans,setPlans]=P.useState([]),[armed,setArmed]=P.useState(null);
 const [selected,setSelected]=P.useState(armedPosition??0),[dropAt,setDropAt]=P.useState(-1),[message,setMessage]=P.useState('');
 const [planName,setPlanName]=P.useState(plan?.name||''),[savedId,setSavedId]=P.useState(''),[preset,setPreset]=P.useState(PRESETS[0].id);
 const [patternName,setPatternName]=P.useState(''),[livePos,setLivePos]=P.useState(-1),[busy,setBusy]=P.useState(false);
 const perform=async(fn)=>{if(busy)return;setBusy(true);setMessage('');try{await fn()}catch(e){setMessage(String(e?.message||e))}finally{setBusy(false)}};
 const refresh=async()=>{const [a,b]=await Promise.all([memory().list(),store.list()]);setLibrary([...a,...memory().factory('keyboard')]);setPlans(b)};
 P.useEffect(()=>{refresh().catch(e=>setMessage('Library unavailable: '+e.message))},[]);
 // Live feedback while the dialog is open: which plan position the last key attack used.
 P.useEffect(()=>{let seen=__XenHoldPlanRuntime.last.serial;const t=setInterval(()=>{const l=__XenHoldPlanRuntime.last;if(l.serial!==seen){seen=l.serial;setLivePos(l.position)}},150);return()=>clearInterval(t)},[]);
 const dev=P.useMemo(()=>deviation(plan,origin),[plan,origin]);
 const grid=plan?.nativeGrid,current=P.useMemo(()=>nativeGrid(origin),[origin]);
 const n=grid?.audible.length||0,idx=Math.min(selected,Math.max(0,n-1));
 const [labelDraft,setLabelDraft]=P.useState('');
 P.useEffect(()=>{if(grid){setPatternName(suggestName(grid,idx,plan));setLabelDraft(labelOf(plan,idx))}},[grid,idx,plan?.labels]);
 // A plan without any assigned step simply follows the Main Room Grid (nothing to lose).
 P.useEffect(()=>{if(plan&&dev.level!=='match'&&dev.level!=='none'&&!plan.entries.some(Boolean)&&!(plan.labels||[]).some(Boolean))onPlanChange(reanchor(plan,origin))},[dev.level]);
 P.useEffect(()=>{if(plan?.name)setPlanName(plan.name)},[plan?.name]);
 const change=(next,msg)=>{onPlanChange(next);if(msg)setMessage(msg)};
 const patternFrom=id=>id==='working'?{pattern:workingPattern,name:'Working pattern',kind:'working'}:(()=>{const r=library.find(x=>x.id===id);return r?{pattern:r,name:r.name,kind:'library'}:null})();
 const assignTo=(pos,src)=>{if(!plan||!src)return;change(assign(plan,pos,src.pattern,{kind:src.kind,name:src.name}),positionLabel(grid,pos,plan)+' ← '+src.name)};
 const onDrop=(ev,pos)=>{ev.preventDefault();setDropAt(-1);const dt=ev.dataTransfer;
  const from=dt.getData(DND_POS);if(from!==''&&plan){const f=Number(from);if(plan.entries[f]){change(withEntries(plan,e=>{e[pos]=plan.entries[f]}),positionLabel(grid,pos,plan)+' ← copy of '+positionLabel(grid,f,plan))}return}
  perform(async()=>assignTo(pos,patternFrom(dt.getData(DND_PATTERN))))};
 const hzFor=pos=>{const g=current.audible.length?current:grid;if(!g?.audible.length)return 220;const a=g.audible[pos%g.audible.length];
  let hz=g.gridBaseHz*Math.pow(2,a.cents/1200);const r=Math.pow(2,g.periodCents/1200);while(hz>520)hz/=r;while(hz<130)hz*=r;return hz};
 if(!plan)return u.jsxs('div',{className:'xen-hpp',children:[
  u.jsxs('div',{style:{gridColumn:'1 / -1'},children:[u.jsx(GridBasis,{origin,onOpenGridWorkbench}),u.jsx('strong',{children:'Hold Pattern Plan · Keyboard'}),
   u.jsx('p',{children:'A plan gives every audible step of the period ('+current.audible.length+' steps of '+gridTitle(current)+' per '+periodName(current.periodCents)+') its own Hold Pattern. It is projected onto all keyboard rows and follows the movable key window.'}),
   u.jsx('button',{type:'button',onClick:()=>change(createPlan(origin),'Empty plan created for '+gridTitle(current)+'.'),children:'＋ Empty plan for current Grid'}),
   u.jsx(PresetPicker,{value:preset,onChange:setPreset,children:u.jsx('button',{type:'button',onClick:()=>change(fromPreset(preset,origin),'Preset generated for '+gridTitle(current)+'.'),children:'Generate from preset'})}),
   u.jsx('p',{children:PRESETS.find(p=>p.id===preset)?.info}),
   u.jsxs('label',{children:['Load saved plan',u.jsx('select',{'aria-label':'Saved plans',value:'',onChange:e=>{const r=plans.find(x=>x.id===e.target.value);if(r){setSavedId(r.id);change(validatePlan(r.plan),'Loaded '+r.name+'.')}},
    children:[u.jsx('option',{value:'',children:plans.length?'Choose…':'No saved plans yet'}),...plans.map(r=>u.jsx('option',{value:r.id,children:r.name},r.id))]})]}),
   message?u.jsx('p',{role:'status',children:message}):null]})]});
 const entry=plan.entries[idx];
 const savedRow=plans.find(r=>r.id===savedId);
 return u.jsxs('div',{className:'xen-hpp','data-xen-hpp':'true',children:[
  /* Library */
  u.jsxs('div',{style:{maxHeight:'34em',overflowY:'auto'},children:[u.jsx('strong',{children:'Arpeggio Pattern Library'}),
   u.jsx('p',{children:'Drag onto a step, or click to arm and then click steps to paint. Factory arpeggios are listed after your saved ones.'}),
   ...[{...workingPattern,id:'working',name:'◉ Current Arpeggio Pattern',sourceLane:'keyboard'},...library].map(r=>u.jsxs('button',{type:'button',draggable:true,
    className:'xen-hpp-lib-row'+(armed===r.id?' armed':''),'aria-pressed':armed===r.id,
    onDragStart:ev=>{ev.dataTransfer.setData(DND_PATTERN,r.id);ev.dataTransfer.effectAllowed='copy'},
    onClick:()=>setArmed(a=>a===r.id?null:r.id),title:r.slots+' slots · '+r.referenceBars+' bars'+(r.factory?' · factory':r.sourceLane==='enter'?' · Enter lane':''),
    children:[u.jsx('span',{children:r.name+(r.sourceLane==='enter'?' · Enter':'')}),u.jsx(Dots,{pattern:r})]},r.id)),
   armed?u.jsx('button',{type:'button',onClick:()=>{const src=patternFrom(armed);change(withEntries(plan,e=>{for(let i=0;i<e.length;i++)if(!e[i])e[i]={pattern:patternOnly(src.pattern),source:{kind:src.kind,name:src.name}}}),'Filled empty steps with '+src.name+'.')},children:'Fill empty steps with armed'}):null]}),
  /* Ladder */
  u.jsxs('div',{children:[u.jsx(GridBasis,{origin,onOpenGridWorkbench}),u.jsx('strong',{children:plan.name||'Untitled plan'}),u.jsx('p',{children:'Made for '+gridTitle(grid)+' · '+n+' audible steps per '+periodName(grid.periodCents)+' · root '+grid.gridBaseHz.toFixed(2)+' Hz'}),
   u.jsx('div',{className:'xen-hpp-ladder',role:'listbox','aria-label':'Plan steps, root at the bottom',children:grid.audible.map((a,i)=>{const en=plan.entries[i];
    return u.jsxs('div',{role:'option','aria-selected':i===idx,tabIndex:0,draggable:!!en,
     className:'xen-hpp-step'+(i===idx?' selected':'')+(dropAt===i?' drop':'')+(livePos>=0&&livePos%n===i?' live':'')+(i>=current.audible.length&&dev.level==='deviation'?' unreachable':''),
     onClick:()=>{setSelected(i);if(armed){assignTo(i,patternFrom(armed))}},
     onKeyDown:ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();setSelected(i);if(armed)assignTo(i,patternFrom(armed))}},
     onDragStart:ev=>{ev.dataTransfer.setData(DND_POS,String(i));ev.dataTransfer.effectAllowed='copy'},
     onDragOver:ev=>{ev.preventDefault();ev.dataTransfer.dropEffect='copy';setDropAt(i)},onDragLeave:()=>setDropAt(d=>d===i?-1:d),onDrop:ev=>onDrop(ev,i),
     children:[u.jsxs('span',{children:[u.jsx('b',{children:String(i+1)}),u.jsx('small',{children:'deg '+a.degree+' · '+Math.round(a.cents)+'¢'})]}),
      u.jsxs('span',{style:{minWidth:0},children:[en?u.jsx('span',{className:'name',children:en.source?.name||'Pattern'}):u.jsx('span',{className:'empty',children:'lane pattern'}),
       labelOf(plan,i)?u.jsx('small',{children:labelOf(plan,i)}):null,en?u.jsx(Dots,{pattern:en.pattern}):null]}),
      u.jsxs('span',{className:'xen-hpp-step-actions',children:[
       u.jsx('button',{type:'button','aria-label':'Audition '+positionLabel(grid,i,plan),title:'Audition at this step',onClick:ev=>{ev.stopPropagation();onAudition(en?en.pattern:workingPattern,hzFor(i))},children:'▶'}),
       en?u.jsx('button',{type:'button','aria-label':'Clear '+positionLabel(grid,i,plan),title:'Clear: this step uses the lane pattern',onClick:ev=>{ev.stopPropagation();change(clearPosition(plan,i))},children:'✕'}):null]})]},i)})}),
   u.jsx('p',{children:'Root at the bottom. Muted Grid steps are not part of the plan. Empty steps play the lane’s working pattern. Pattern pitches are cents relative to the pressed key.'})]}),
  /* Plan + selected step */
  u.jsxs('div',{children:[
   u.jsxs('label',{className:'xen-hpp-toggle',children:[u.jsx('input',{type:'checkbox',checked:plan.enabled!==false,onChange:e=>change({...plan,enabled:e.target.checked})}),'Plan active on Keyboard Hold']}),
   dev.text?u.jsxs('div',{className:'xen-hpp-dev '+dev.level,role:'status',children:[dev.text,
    dev.level!=='match'?u.jsxs('div',{className:'xen-hpp-row',style:{marginTop:5},children:[
     u.jsx('button',{type:'button',onClick:()=>{onRestoreGrid(plan.nativeGrid);setMessage('Live Room Grid restored to '+gridTitle(plan.nativeGrid)+'.')},title:'Switch the Live Room Grid back to the plan’s tuning, mode, mutes, fine tuning and root.',children:'Restore plan Grid'}),
     u.jsx('button',{type:'button',onClick:()=>change(reanchor(plan,origin),'Plan re-anchored to '+gridTitle(current)+'.'),title:'Keep the patterns, but make the current Grid the plan’s native Grid.',children:'Adopt current Grid'})]}):null]}):null,
   u.jsx('strong',{children:'Selected · '+positionLabel(grid,idx,plan)}),
   u.jsxs('label',{children:['Pattern name (technical suggestion, editable)',u.jsx('input',{type:'text',maxLength:80,value:patternName,onChange:e=>setPatternName(e.target.value),onKeyDown:e=>e.stopPropagation()})]}),
   u.jsxs('div',{className:'xen-hpp-row',children:[
    u.jsx('button',{type:'button',onClick:()=>onEditPosition(idx,entry?entry.pattern:null,positionLabel(grid,idx,plan),hzFor(idx)),title:'Load this step’s pattern into the Pattern view and tune it by ear on this step.',children:'✎ Edit in Arpeggio Pattern view'}),
    u.jsx('button',{type:'button',disabled:!entry||busy,onClick:()=>perform(async()=>{await memory().saveAs(patternName,{...entry.pattern,sourceLane:'keyboard',tuningOrigin:{tuningId:grid.tuningId,modeId:grid.modeId||'chromatic',gridBaseHz:grid.gridBaseHz,mainMutedDegrees:grid.mainMutedDegrees,mainStepOffsets:grid.mainStepOffsets}});await refresh();setMessage('Saved “'+patternName+'” to the pattern library.')}),children:'Save to library'}),
   ]}),
   u.jsxs('label',{children:['Step label (optional, your own name, e.g. a function where it fits)',u.jsx('input',{type:'text',maxLength:40,value:labelDraft,placeholder:'no label',
    onChange:e=>setLabelDraft(e.target.value),onBlur:()=>{if(labelDraft.trim()!==labelOf(plan,idx))change(setLabel(plan,idx,labelDraft.trim()))},
    onKeyDown:e=>{e.stopPropagation();if(e.key==='Enter')e.currentTarget.blur()}})]}),
   u.jsx('strong',{children:'Plan library'}),
   u.jsxs('label',{children:['Plan name',u.jsx('input',{type:'text',maxLength:80,value:planName,placeholder:'e.g. 19 EDO chromatic · evening',onChange:e=>setPlanName(e.target.value),onKeyDown:e=>e.stopPropagation()})]}),
   u.jsx('select',{'aria-label':'Saved plans',value:savedId,onChange:e=>setSavedId(e.target.value),children:[u.jsx('option',{value:'',children:plans.length?'Saved plans…':'No saved plans yet'}),...plans.map(r=>u.jsx('option',{value:r.id,children:r.name},r.id))]}),
   u.jsxs('div',{className:'xen-hpp-row',children:[
    u.jsx('button',{type:'button',disabled:busy||!planName.trim(),onClick:()=>perform(async()=>{const row=await store.saveAs(planName,plan);change({...plan,name:row.name});await refresh();setSavedId(row.id);setMessage('Plan saved as '+row.name+'.')}),children:'Save As'}),
    u.jsx('button',{type:'button',disabled:busy||!savedRow,onClick:()=>perform(async()=>{if(!globalThis.confirm('Overwrite saved plan “'+savedRow.name+'” with the current plan?'))return;await store.overwrite(savedRow.id,plan,savedRow.revision);await refresh();setMessage('Updated '+savedRow.name+'.')}),children:'Overwrite'}),
    u.jsx('button',{type:'button',disabled:busy||!savedRow,onClick:()=>{change(validatePlan(savedRow.plan),'Loaded '+savedRow.name+'.')},children:'Load'}),
    u.jsx('button',{type:'button',disabled:busy||!savedRow,onClick:()=>perform(async()=>{if(!globalThis.confirm('Delete saved plan “'+savedRow.name+'”? The active plan stays.'))return;await store.remove(savedRow.id);setSavedId('');await refresh();setMessage('Saved plan deleted.')}),children:'Delete'})]}),
   u.jsx(PresetPicker,{value:preset,onChange:setPreset,children:u.jsx('button',{type:'button',onClick:()=>{if(plan.entries.some(Boolean)&&!globalThis.confirm('Replace the active plan with the preset “'+PRESETS.find(p=>p.id===preset).label+'”? Saved plans are not changed.'))return;change(fromPreset(preset,origin),'Preset generated for '+gridTitle(current)+'.')},children:'New from preset'})}),
   u.jsx('button',{type:'button',onClick:()=>{if(globalThis.confirm('Remove the plan from the Keyboard? Saved plans stay in the library.'))change(null,'')},children:'Remove plan from Keyboard'}),
   message?u.jsx('p',{role:'status',className:'xen-hpp-message',children:message}):null]})]});
}

return Object.freeze({version:'HPP01',dbName:DB,nativeGrid,deviation,validatePlan,createPlan,assign,clearPosition,reanchor,fromPreset,presets:PRESETS.map(p=>({id:p.id,label:p.label,info:p.info,group:p.group})),
 suggestName,positionLabel,setLabel,gridTitle,store,PlanView,patternOnly});
}
