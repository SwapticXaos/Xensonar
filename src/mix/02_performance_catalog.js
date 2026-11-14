/* ROOM5-10: Psy Lab sounds ("psylab:<patch id>") for the Wave Starter (Enter / left click) and the Keyboard. This eager part only lists the patches and forwards to the lazy
   Room V chunk (LiveHost); the chunk is loaded when a Psy Lab sound is chosen or restored, never when a menu is built. Factory names are listed here so no chunk load is needed
   to open the menu; tests/room5_live_catalog.cjs keeps this list identical to the chunk's FACTORY patches. */
const __XenPsyLab=(()=>{
 const KEY='xensonar.psylab.instruments.v1',PREFIX='psylab:';
 const FACTORY_NAMES=['Liquid Bell','Escher Staircase','Barber Spiral','Chaos Insect','Crystal Cave','Deep Fold Drone','Tritave Ghost','Alien Choir'];
 let raw=null,cache=[],readAt=0,cursor=null,raf=0,wheel=1,prevHz=0,arrowAt=-1e9,lastTick=0,octPos=0,sustaining=false,exprLast=1;const deferred=new Set();/* PSY-SUS-01: notes whose key / mouse / gate ended while the Sustain key (´) is held: they keep sounding until it is released *//* PSY-OCT-01: Backspace (octave hold) as a fast glide, 0 = played pitch .. 1 = one octave up */const followers=new Map();
 function tick(){raf=0;if(!followers.size||!cursor){prevHz=0;return}
  const h=host(false),now=performance.now(),dt=Math.min(.1,Math.max(.001,(now-lastTick)/1000||.016));lastTick=now;
  const hz=cursor.hz(),arrows=cursor.arrows(),focus=cursor.focusHz?cursor.focusHz():0;
  /* pitch wheel: the cursor's pitch change counts only from an arrow press until the cursor has settled (free: continuous, Snap: one Grid line per press) */
  if(hz>0&&prevHz>0&&((arrows&&(arrows.up||arrows.down))||now-arrowAt<900))wheel*=hz/prevHz;prevHz=hz>0?hz:prevHz;wheel=Math.max(.25,Math.min(4,wheel));
  const k=1-Math.pow(.65,dt*60);/* the same glide time as the ball of Room V */
  /* PSY-OCT-01: Backspace held = every held Psy Lab note (mouse and keys) glides one octave up fast (~40 ms), released = back; one shared factor, no extra node */
  const oTarget=cursor.octave?.()===true?1:0;octPos+=(oTarget-octPos)*(1-Math.exp(-dt/.04));if(Math.abs(oTarget-octPos)<.002)octPos=oTarget;const oct=Math.pow(2,octPos);
  /* PSY-EXPR-01: B / Left Alt (keyboard expression, Pedal or Knob) = output gain of the Keyboard lane, same mapping as the classic keyboard sound (1 + expression x 2.35), capped at x2 because a Psy Lab voice has less headroom */
  const eg=exprGain();if(h&&Math.abs(eg-exprLast)>.003){exprLast=eg;h.gain('keyboard',eg)}
  if(h)for(const f of followers.values()){let target;
   if(f.mode==='cursor'){if(!(focus>0))continue;
    /* PSY-GRID-01: with Snap the note sits on the Grid tone the screen shows (direct step, like the pad of Room V); free (no Snap) it glides in the log-frequency domain */
    if(cursor.snap?.()===true)f.pos=Math.log2(focus);else f.pos+=(Math.log2(focus)-f.pos)*k;target=Math.pow(2,f.pos)}
   else target=f.base*wheel;target*=oct;
   if(target>0&&Math.abs(1200*Math.log2(target/f.last))>.4){f.last=target;h.bend(f.lane,f.keyId,target)}
   /* PSY-X: every held Psy Lab note (mouse or keyboard) follows the cursor's X continuously, like the pad of Room V */
   if(cursor.grad){const g=cursor.grad(),m=law(g.tOn,g.tMode,g.x/g.width);if(Math.abs(m-(f.macro??-1))>.004){f.macro=m;h.macro(f.lane,m)}}}
  raf=requestAnimationFrame(tick)}
 const isId=id=>typeof id==='string'&&id.startsWith(PREFIX);
 const exprGain=()=>{const e=cursor?.expression?.();return Number.isFinite(e)?Math.max(.12,Math.min(2,1+e*2.35)):1};
 if(typeof window!=='undefined')window.addEventListener('blur',()=>sustain(false));
 function sustain(on){on=!!on;if(on===sustaining)return;sustaining=on;if(!on){const h=host(false);for(const k of deferred){const i=k.indexOf(':');h?.stop(k.slice(0,i),k.slice(i+1),true)}deferred.clear()}}
 /* PSY-X: how far the Live Room's X position (0 left .. 1 right) pushes the Psy Lab pad regulator, following the shape the timbre gradient is set to (rises to the right, falls, peaks in the middle, peaks at the edges); disabled / none = 0 (no push) */
 const law=(on,mode,u)=>{if(!on)return 0;u=Number.isFinite(u)?Math.max(0,Math.min(1,u)):0;switch(mode){case'sitar_rise':case'psy_rise':case'wire_to_psy':return u;case'psy_to_wire':return 1-u;case'center_shine':return 1-Math.abs(2*u-1);case'edge_tension':return Math.abs(2*u-1);default:return 0}};
 /* menus are rebuilt on many renders: storage is read at most once per second */
 function entries(){const now=Date.now();if(cache.length&&now-readAt<1000)return cache;readAt=now;let s=null;try{s=localStorage.getItem(KEY)}catch{}
  if(s!==raw||!cache.length){raw=s;cache=FACTORY_NAMES.map(n=>({value:PREFIX+'factory:'+n,label:n,hint:'Psy Lab · factory · Live: no Hold, no effect sends yet',originLabel:'Psy Lab'}));
   try{const d=s?JSON.parse(s):null;if(d?.format==='xensonar.psylab'&&Array.isArray(d.user))for(const q of d.user.slice(0,500))if(q&&typeof q.id==='string'&&typeof q.name==='string'&&q.id)cache.push({value:PREFIX+q.id,label:String(q.name).slice(0,60),hint:'Psy Lab · saved · Live: no Hold, no effect sends yet',originLabel:'Psy Lab'})}catch{}}
  return cache}
 /* STEMS-04: watchers of the stem recorder; forwarded to the chunk as soon as it exists (a Psy Lab sound chosen while recording) */
 const outWatch=new Set();let forwarding=false;
 let loaded=null;const host=(create=true)=>{if(loaded||!create)return loaded;try{loaded=__xenLoadDeferred('psylab').LiveHost}catch(e){loaded=null}if(loaded&&!forwarding){forwarding=true;loaded.watch(rec=>{for(const fn of outWatch)try{fn(rec)}catch{}})}return loaded};
 return Object.freeze({PREFIX,isId,entries,host,FACTORY_NAMES,
  outputs(ctx){return host(false)?.outputs(ctx)||[]},watch(fn){outWatch.add(fn);return()=>outWatch.delete(fn)},
  /* the first Psy Lab note must not wait for the module: load and create the lane's engine as soon as the sound is chosen */
  warm(lane,id){const h=host();if(h&&isId(id))h.prepare(lane,id)},
  /* ROOM5-12: glissando. The shell registers the cursor of the Live Room (frequency of the cursor, arrow keys held); a held Psy Lab note then glides with the cursor:
     Wave Starter note (left mouse held) = the cursor's pitch (drag, or arrow keys); Keyboard notes = their key pitch x the arrow-key glide (a pitch wheel driven by Up / Down).
     The loop runs only while such a note exists (WARM: one requestAnimationFrame per frame, nothing per audio block). */
  bindCursor(api){cursor=api},cursorHz(){return cursor?cursor.hz():0},
  arrowKey(){arrowAt=performance.now()},
  glide(lane,keyId,baseHz,mode){
   if(!followers.size)octPos=cursor?.octave?.()===true?1:0;/* PSY-OCT-01: Backspace already held = the note starts an octave up */
   const f={lane,keyId,base:baseHz,mode,last:baseHz*Math.pow(2,octPos),pos:Math.log2(baseHz)};followers.set(lane+':'+keyId,f);
   if(!raf)raf=requestAnimationFrame(tick)},
  unglide(lane,keyId){followers.delete(lane+':'+keyId);if(!followers.size)wheel=1},
  law,
  sustain,
  start(lane,keyId,id,hz,vel,macro){const h=host();deferred.delete(lane+':'+keyId);if(h&&lane==='keyboard'){exprLast=exprGain();h.gain(lane,exprLast,true)}return !!h&&h.start(lane,keyId,id,followers.size?hz*Math.pow(2,octPos):cursor?.octave?.()===true?hz*2:hz,vel,macro)},
  stop(lane,keyId){const key=lane+':'+keyId;followers.delete(key);if(!followers.size)wheel=1;const h=host(false);if(sustaining&&h?.has(lane,keyId)){deferred.add(key);return}deferred.delete(key);h?.stop(lane,keyId)},
  allOff(lane){for(const k of[...followers.keys()])if(!lane||k.startsWith(lane+':'))followers.delete(k);if(!followers.size)wheel=1;const h=host(false);if(sustaining&&h){for(const k of h.keys(lane))deferred.add(k);return}for(const k of[...deferred])if(!lane||k.startsWith(lane+':'))deferred.delete(k);h?.allOff(lane)},
  /* a lane that leaves Psy Lab gives its engine back (the chunk is not loaded just to do that) */
  drop(lane){for(const k of[...followers.keys()])if(!lane||k.startsWith(lane+':'))followers.delete(k);for(const k of[...deferred])if(!lane||k.startsWith(lane+':'))deferred.delete(k);host(false)?.drop(lane)},
  /* Power off: every Psy Lab voice and tail stops at once */
  panic(){followers.clear();deferred.clear();wheel=1;host(false)?.panic()}});
})();
/* Performance shortcuts read the canonical catalog. History stores IDs only. */
const __XenPerformanceCatalog=(()=>{
 const key='xensonar-performance-recent-sounds-v1',lanes=['particle','wave','keyboard'],listeners=new Set();
 const valid=id=>typeof id==='string'&&id.length>0&&id.length<240;
 function read(){let saved;try{saved=JSON.parse(localStorage.getItem(key)||'{}')}catch{}return Object.freeze(Object.fromEntries(lanes.map(lane=>[lane,Object.freeze([...new Set(Array.isArray(saved?.[lane])?saved[lane].filter(valid):[])].slice(0,7))])))}
 let state=read();
 function publish(next){if(lanes.every(lane=>next[lane].join('\0')===state[lane].join('\0')))return;state=next;for(const fn of listeners)fn()}
 function remember(lane,id){if(!lanes.includes(lane)||!valid(id)||state[lane][0]===id)return;publish(Object.freeze({...state,[lane]:Object.freeze([id,...state[lane].filter(x=>x!==id)].slice(0,7))}));try{localStorage.setItem(key,JSON.stringify(state))}catch{}}
 window.addEventListener('storage',event=>{if(event.key===key||event.key===null)publish(read())});
 function groups(entries=[],includeCurrent=false,latest=[]){
  const catalog=new Map();for(const item of entries)if(valid(item?.value)&&!catalog.has(item.value))catalog.set(item.value,item);
  if(includeCurrent&&!catalog.has('entrophon'))catalog.set('entrophon',{value:'entrophon',label:'Current Sound'});
  /* wave / keyboard lanes (includeCurrent) only: the particle lane has no Psy Lab voice */
  if(includeCurrent)for(const item of __XenPsyLab.entries())if(!catalog.has(item.value))catalog.set(item.value,item);
  const family=item=>item.groupId==='samples'||item.value.startsWith('sample:')?'Samples':item.value.startsWith('nodal:')?'Nodal':item.value.startsWith('psylab:')?'Psy Lab':item.value==='entrophon'||item.value.startsWith('entrophon:')?'Entrophon':'Classic';
  const result=[],recent=[...new Set(latest)].map(id=>catalog.get(id)).filter(Boolean).slice(0,7);
  if(recent.length)result.push({label:'Latest',entries:recent});
  for(const label of ['Classic','Nodal','Entrophon','Psy Lab','Samples']){const list=[...catalog.values()].filter(x=>family(x)===label).sort((a,b)=>String(a.label).localeCompare(String(b.label)));if(list.length||label==='Nodal')result.push({label,entries:list})}return result;
 }
 // C11 Entrophon and Wave main outputs currently aggregate voices. Do not
 // route that whole mix to the last triggering particle's private panner.
 function canPan(lane,id){if(typeof id!=='string'||id==='entrophon'||id.startsWith('entrophon:')||id.startsWith('psylab:'))return false;return id.startsWith('nodal:')||id.startsWith('sample:')||lane==='particle'}
 return {key,snapshot:()=>state,subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),remember,groups,canPan};
})();

function __PerformancePan({kind,label,disabled=false}){
 const saved=P.useSyncExternalStore(__XenPan.subscribe,__XenPan.snapshot,__XenPan.snapshot),value=saved[kind]??0;
 return u.jsxs('label',{className:'xen-performance-pan',children:[u.jsxs('span',{children:[label+' Pan',u.jsx('output',{children:disabled?'—':value===0?'C':(value<0?'L ':'R ')+Math.round(Math.abs(value)*100)})]}),
 u.jsx(__XenRange,{type:'range',min:-1,max:1,step:.01,value,disabled,'aria-label':label+' Pan',title:disabled?'Pan is available for Nodal, samples and classic particles.': 'Double-click to centre',onChange:e=>__XenPan.set(kind,Number(e.target.value)),onDoubleClick:()=>!disabled&&__XenPan.set(kind,0)})]});
}
