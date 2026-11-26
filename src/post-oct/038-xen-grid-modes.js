/* GRID-MODES-01 · modes as data: a user library, an editable cycle order and a view of the projection.
 *
 * How a mode works (unchanged core, src/runtime/01_instrument_state.js `Au`): a built-in mode is a set of 12-EDO pitch classes
 * (Ionian = 0 2 4 5 7 9 11), i.e. cents 0, 200, 400 … ; Bohlen–Pierce modes are sets of 13 steps per tritave. On any grid the mode
 * PROJECTS: every mode position (in cents) switches on the grid step nearest to it (folded into the period); all other steps are muted.
 * "Chromatic" is the exception: it opens every step of the grid (31 on 31-EDO). "Chromatic 12 (projected)" opens the 12 steps nearest
 * to the 12 semitones instead.
 * A user mode is stored the same way, as cents inside the period ({value:'user:…', label, cents:[…], period}), so it is independent of
 * any grid and projects onto 12-EDO, 31-EDO, JI, Maqam … exactly like the built-ins. It is made from the current grid: the open steps of
 * the active tuning + mode + manual mutes become its cents.
 * The cycle order (AltGr / right Ctrl) is a list of mode values in localStorage; empty = the built-in order. Only modes valid for the
 * current tuning are cycled (Ka(tuning) decides validity, as before). */
const __xenModeStore=(()=>{
 const LIB='xensonar.gridModes.user.v1',RACK='xensonar.gridModeRack.v1',EVT='xensonar:grid-modes-changed';
 let cache=null;
 const read=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch{return fallback}};
 const notify=()=>{cache=null;try{dispatchEvent(new CustomEvent(EVT))}catch{}};
 const write=(key,value)=>{try{if(value==null)localStorage.removeItem(key);else localStorage.setItem(key,JSON.stringify(value))}catch{}notify()};
 try{addEventListener('storage',e=>{if(e.key===LIB||e.key===RACK)notify()})}catch{}
 const valid=m=>m&&typeof m.value==='string'&&m.value.startsWith('user:')&&Array.isArray(m.cents)&&m.cents.length>0&&m.cents.every(c=>Number.isFinite(c));
 const userModes=()=>{if(!cache){const raw=read(LIB,[]);cache=(Array.isArray(raw)?raw:[]).filter(valid).slice(0,128).map(m=>{const period=Number(m.period)>0?Number(m.period):1200;
   return Object.freeze({value:m.value,label:String(m.label||'My mode').slice(0,60),period,cents:Object.freeze([...new Set(m.cents.map(c=>((c%period)+period)%period).map(c=>Math.round(c*1000)/1000))].sort((a,b)=>a-b)),user:true})})}return cache};
 const find=value=>userModes().find(m=>m.value===value)||null;
 const store=list=>write(LIB,list.map(m=>({value:m.value,label:m.label,cents:[...m.cents],period:m.period})));
 function addUserMode({label,cents,period=1200}){const value='user:'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);store([...userModes(),{value,label:String(label||'My mode').trim()||'My mode',cents,period}]);return value}
 function renameUserMode(value,label){store(userModes().map(m=>m.value===value?{...m,label:String(label||m.label).slice(0,60)}:m))}
 function removeUserMode(value){store(userModes().filter(m=>m.value!==value));const r=rack();if(r)setRack(r.filter(v=>v!==value))}
 const rack=()=>{const r=read(RACK,null);return Array.isArray(r)?r.filter(v=>typeof v==='string').slice(0,32):null};
 const setRack=list=>write(RACK,list==null?null:[...new Set(list)].slice(0,32));
 /* the order AltGr / right Ctrl walks: the user's cycle list (only modes valid for this tuning), else the built-in order */
 const cycleList=base=>{const r=rack();if(!r||!r.length)return base;const out=r.map(v=>base.find(m=>m.value===v)).filter(Boolean);return out.length?out:base};
 /* the projection itself: nearest grid step per mode position, folded into the period (same rule as the core's Au) */
 function mapping(cents,steps,period){return cents.map(c=>{let best=0,bd=Infinity,signed=0;for(let p=0;p<steps.length;p++){const raw=((c-steps[p])%period+period)%period,d=Math.min(raw,period-raw);if(d<bd){bd=d;best=p;signed=raw<=period/2?raw:raw-period}}return {cents:c,step:best,stepCents:steps[best],deviation:-signed}})}
 function project(cents,steps,period){const on=Array(steps.length).fill(false);for(const m of mapping(cents,steps,period))on[m.step]=true;return on}
 /* the positions of any mode in cents (built-in: 12-EDO classes ×100, BP: 13 steps of the tritave); null for "chromatic" (= every grid step) */
 function modeCents(mode,bpNative){if(!mode||mode.value==='chromatic')return null;if(mode.cents)return [...mode.cents];return (mode.steps||[]).map(s=>bpNative?s*1901.955/13:s*100)}
 return Object.freeze({userModes,find,addUserMode,renameUserMode,removeUserMode,rack,setRack,cycleList,mapping,project,modeCents,EVT});
})();

/* GRID-MODES-01 · the Modes tab of the Grid Workbench: cycle slots (drag / ↑ ↓ −), the mode library (built-in + own, activate, add, rename,
   delete, save the current pattern), and the projection of the selected mode onto the active grid. Same look as the tuning slots. */
function XenModeWorkbench({currentTuning}){
 const [rev,setRev]=P.useState(0),[sel,setSel]=P.useState(null),[name,setName]=P.useState(''),[msg,setMsg]=P.useState(''),[drag,setDrag]=P.useState(null);
 P.useEffect(()=>{const f=()=>setRev(v=>v+1);addEventListener(__xenModeStore.EVT,f);const off=typeof __NodalBallGrid!=='undefined'?__NodalBallGrid.subscribe(f):null;return()=>{removeEventListener(__xenModeStore.EVT,f);off?.()}},[]);
 const gp=typeof __NodalBallGrid!=='undefined'?__NodalBallGrid.params():null,tuning=gp?.gridTuning||currentTuning,mode=gp?.gridMode||'chromatic';
 const base=Ka(tuning),bp=SF(tuning)==='bp_native',stored=__xenModeStore.rack(),slots=(stored&&stored.length?stored:base.map(m=>m.value));
 const label=v=>base.find(m=>m.value===v)?.label||__xenModeStore.find(v)?.label||String(v);
 const setSlots=list=>{__xenModeStore.setRack(list);setMsg('Cycle order saved · AltGr / right Ctrl walks these slots.')};
 const move=(i,d)=>{const l=[...slots],j=i+d;if(j<0||j>=l.length)return;[l[i],l[j]]=[l[j],l[i]];setSlots(l)};
 const remove=i=>setSlots(slots.filter((_,k)=>k!==i));
 const insert=(value,at)=>{const l=slots.filter(v=>v!==value);l.splice(at==null?l.length:Math.max(0,Math.min(at,l.length)),0,value);setSlots(l)};
 const activate=v=>{try{__NodalBallGrid.changeMode(v);setMsg(label(v)+' is active.')}catch{setMsg('Open the Live Room once to activate modes.')}};
 const steps=Kp(tuning),period=vF(tuning),shown=sel||mode,modeObj=base.find(m=>m.value===shown)||__xenModeStore.find(shown),pos=__xenModeStore.modeCents(modeObj,bp);
 const map=pos?__xenModeStore.mapping(pos,steps,period):null,on=pos?__xenModeStore.project(pos,steps,period):steps.map(()=>true);
 const saveCurrent=()=>{const mask=Au(mode,tuning),muted=new Set(gp?.manualGridMutedSteps||[]),cents=steps.filter((_,i)=>mask[i]&&!muted.has(i));
  if(!cents.length){setMsg('The current pattern has no open step.');return}const v=__xenModeStore.addUserMode({label:name||(label(mode)+' on '+(hc(tuning)?.label||tuning)),cents,period});setName('');setSel(v);setMsg('Saved as a mode: '+cents.length+' positions, projectable onto every grid.')};
 const card='rounded border border-fuchsia-900/50 bg-fuchsia-950/20 p-3',btn='rounded border border-fuchsia-900/70 px-2 py-1 text-[10px] text-fuchsia-100 hover:bg-fuchsia-950/40',head='text-[10px] uppercase tracking-[0.25em] text-fuchsia-200/70';
 const onDrop=(e,at)=>{e.preventDefault();e.stopPropagation();const v=e.dataTransfer.getData('text/x-xen-mode')||drag?.value;if(!v)return;if(drag?.from!=null){const l=[...slots];l.splice(drag.from,1);const to=at>drag.from?at-1:at;l.splice(Math.max(0,Math.min(to,l.length)),0,v);setSlots(l)}else insert(v,at);setDrag(null)};
 const W=520,X=c=>20+c/period*(W-40);
 return u.jsxs('div',{className:'mt-4 grid min-h-0 flex-1 gap-4 overflow-hidden','data-xen-mode-workbench':'true',/* inline: only Tailwind classes that exist elsewhere are in the built CSS */style:{gridTemplateColumns:'minmax(15rem,0.85fr) minmax(16rem,0.95fr) minmax(22rem,1.2fr)'},children:[
  u.jsxs('div',{className:'min-h-0 overflow-y-auto pr-1 '+card,onDragOver:e=>e.preventDefault(),onDrop:e=>onDrop(e,slots.length),children:[
   u.jsxs('div',{className:'mb-2 flex items-center justify-between gap-2',children:[u.jsxs('div',{children:[u.jsx('div',{className:head,children:'Mode Cycle'}),u.jsx('div',{className:'text-[10px] leading-relaxed text-fuchsia-100/75',children:'AltGr / right Ctrl walk only these modes, in this order (modes that do not fit the tuning are skipped).'})]}),
    u.jsx('button',{type:'button',className:btn,onClick:()=>{__xenModeStore.setRack(null);setMsg('Built-in order restored.')},children:'Defaults'})]}),
   u.jsx('div',{className:'grid grid-cols-1 gap-2','data-xen-mode-slots':'true',children:slots.map((v,i)=>u.jsxs('div',{draggable:true,onDragStart:e=>{e.dataTransfer.setData('text/x-xen-mode',v);setDrag({value:v,from:i})},onDragEnd:()=>setDrag(null),onDragOver:e=>e.preventDefault(),onDrop:e=>onDrop(e,i),
    className:'flex items-start justify-between gap-3 rounded-xl border px-3 py-2 bg-black/25 '+(v===mode?'border-cyan-500/60':'border-neutral-800'),'data-xen-mode-slot':v,children:[
    u.jsxs('button',{type:'button',onClick:()=>{setSel(v);activate(v)},className:'min-w-0 flex-1 rounded-lg px-2 py-1 text-left text-neutral-200 hover:bg-neutral-900/80',children:[u.jsx('div',{className:'text-[10px] uppercase tracking-[0.2em] text-neutral-500',children:'Slot '+(i+1)}),u.jsx('div',{className:'truncate font-semibold '+(v===mode?'text-cyan-200':''),children:label(v)})]}),
    u.jsxs('div',{className:'flex shrink-0 items-center gap-1',children:[u.jsx('button',{type:'button',className:btn,'aria-label':'Move '+label(v)+' up',onClick:()=>move(i,-1),children:'↑'}),u.jsx('button',{type:'button',className:btn,'aria-label':'Move '+label(v)+' down',onClick:()=>move(i,1),children:'↓'}),u.jsx('button',{type:'button',className:btn,'aria-label':'Remove '+label(v)+' from the cycle',onClick:()=>remove(i),children:'−'})]})]},v+'@'+i))}),
   msg?u.jsx('div',{className:'mt-2 text-[10px] text-cyan-200/80','data-xen-mode-msg':'true',children:msg}):null]}),
  u.jsxs('div',{className:'flex min-h-0 flex-col '+card,children:[
   u.jsx('div',{className:head,children:'Mode Library'}),u.jsx('div',{className:'mb-2 text-[10px] text-fuchsia-100/75',children:'Click = show the projection · Use = activate · + = add to the cycle (or drag into it).'}),
   u.jsx('div',{className:'min-h-0 flex-1 space-y-1 overflow-y-auto pr-1','data-xen-mode-library':'true',onWheelCapture:e=>e.stopPropagation(),children:base.map(m=>u.jsxs('div',{draggable:true,onDragStart:e=>{e.dataTransfer.setData('text/x-xen-mode',m.value);setDrag({value:m.value,from:null})},onDragEnd:()=>setDrag(null),
    className:'flex items-center gap-1 rounded border px-2 py-1 '+(m.value===shown?'border-fuchsia-500/60 bg-fuchsia-950/40':'border-neutral-800 bg-black/20'),'data-xen-mode-entry':m.value,children:[
    u.jsx('button',{type:'button',onClick:()=>setSel(m.value),className:'min-w-0 flex-1 truncate text-left text-[11px] text-neutral-100',children:(m.user?'★ ':'')+m.label}),
    u.jsx('button',{type:'button',className:btn,onClick:()=>activate(m.value),children:'Use'}),u.jsx('button',{type:'button',className:btn,'aria-label':'Add '+m.label+' to the cycle',disabled:slots.includes(m.value),onClick:()=>insert(m.value),children:'+'}),
    m.user?u.jsx('button',{type:'button',className:btn,onClick:()=>{const t=prompt('Name of the mode',m.label);if(t)__xenModeStore.renameUserMode(m.value,t)},children:'✎'}):null,
    m.user?u.jsx('button',{type:'button',className:btn,'aria-label':'Delete '+m.label,onClick:()=>{if(confirm('Delete the mode "'+m.label+'"?')){__xenModeStore.removeUserMode(m.value);if(sel===m.value)setSel(null)}},children:'delete'}):null]},m.value))}),
   u.jsxs('div',{className:'mt-2 flex gap-1',children:[u.jsx('input',{value:name,onChange:e=>setName(e.target.value),placeholder:'Name of the new mode','aria-label':'Name of the new mode',className:'min-w-0 flex-1 rounded border border-fuchsia-900/60 bg-black/40 px-2 py-1 text-[11px] text-fuchsia-50'}),
    u.jsx('button',{type:'button',className:btn,'data-xen-mode-save':'true',title:'The open steps of the current grid (tuning + mode + manual mutes) become a mode in cents: it projects onto every grid.',onClick:saveCurrent,children:'Save current pattern as mode'})]})]}),
  u.jsxs('div',{className:'min-h-0 overflow-y-auto '+card,'data-xen-mode-projection':'true',children:[
   u.jsx('div',{className:head,children:'Projection'}),
   u.jsx('div',{className:'mb-2 text-[11px] text-fuchsia-50',children:label(shown)+' → '+(hc(tuning)?.label||tuning)+' · '+(pos?pos.length+' mode positions → '+on.filter(Boolean).length+' of '+steps.length+' grid steps':'every step of the grid ('+steps.length+')')}),
   u.jsxs('svg',{viewBox:'0 0 '+W+' 120',className:'w-full',style:{maxHeight:150},role:'img','aria-label':'Projection of '+label(shown)+' onto '+tuning,children:[
    u.jsx('line',{x1:20,x2:W-20,y1:30,y2:30,stroke:'#a78bfa55'}),u.jsx('line',{x1:20,x2:W-20,y1:90,y2:90,stroke:'#67e8f955'}),
    u.jsx('text',{x:20,y:16,fill:'#c4b5fd',fontSize:10,children:'mode positions (cents)'}),u.jsx('text',{x:20,y:112,fill:'#67e8f9',fontSize:10,children:'grid steps'}),
    ...(map||[]).map((m,i)=>u.jsx('line',{x1:X(m.cents),y1:30,x2:X(m.stepCents),y2:90,stroke:Math.abs(m.deviation)>15?'#fbbf24':'#a78bfa',strokeWidth:1},'l'+i)),
    ...(pos||[]).map((c,i)=>u.jsx('circle',{cx:X(c),cy:30,r:4,fill:'#c4b5fd'},'m'+i)),
    ...steps.map((c,i)=>u.jsx('circle',{cx:X(c),cy:90,r:on[i]?4.5:2.2,fill:on[i]?'#67e8f9':'#334155','data-on':on[i]?'1':'0'},'s'+i))]}),
   map?u.jsx('div',{className:'mt-2 grid grid-cols-2 gap-x-3 text-[10px] text-fuchsia-100/80 sm:grid-cols-3',children:map.map((m,i)=>u.jsx('div',{children:Math.round(m.cents)+' ct → step '+m.step+' ('+(m.deviation>=0?'+':'')+m.deviation.toFixed(1)+' ct)'},i))}):
    u.jsx('div',{className:'text-[10px] text-fuchsia-100/70',children:'Chromatic opens every grid step. For 12 semitones on a finer grid use "Chromatic 12 (projected)".'}),
   u.jsx('div',{className:'mt-2 text-[10px] text-fuchsia-100/60',children:'Each mode position switches on the nearest grid step (folded into the period); yellow = more than 15 ct away.'})]})]});
}
