/* HWKB-01 · Hardware keyboard input layer (stage 1: notes, monitor, device report).
   A MIDI keyboard is only the wire protocol of the hardware: nothing is sent out, no MIDI sounds. Each key becomes the SAME key event as a computer key
   (position k of the Keyboard window), so Window offset, tuning (tritave, JI ...), muted steps, Hold slots, Psy Lab and ownership of the key behave exactly as on the
   computer keyboard (bPe reads event.__xenHwPos). Off by default; nothing touches Web MIDI before the player switches it on (permission prompt).
   Settings live in their own browser key (like the keyboard layout), never in sessions. Stage 2: velocity, sustain pedal, pitch bend, aftertouch.
   Zone: WARM (message handler is plain JS, no React per message; the monitor refreshes at most every 120 ms). Not tested with real hardware. */
const __XenHwKeyboard=(()=>{
 const KEY='xensonar.hwkeyboard.v1';
 const PRESETS=Object.freeze([
  {id:'c2',label:'Lowest key C2 (36) · typical for 49 / 61 keys',root:36},
  {id:'c3',label:'Lowest key C3 (48) · typical for 25 / 37 keys',root:48},
  {id:'f1',label:'Lowest key F1 (29) · typical for 32 keys',root:29},
  {id:'c4',label:'Middle C (60) is the first position',root:60},
  {id:'a0',label:'Lowest key A0 (21) · 88 keys',root:21}]);
 const NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
 const noteName=n=>NAMES[((n%12)+12)%12]+(Math.floor(n/12)-1);
 const DEFAULTS=Object.freeze({deviceId:'',channel:0,root:48,offset:0,preset:'c3'});
 const clampInt=(v,lo,hi,d)=>{v=Math.round(Number(v));return Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):d};
 const clean=v=>({deviceId:typeof v?.deviceId==='string'?v.deviceId.slice(0,200):'',channel:clampInt(v?.channel,0,16,0),root:clampInt(v?.root,0,127,48),offset:clampInt(v?.offset,-64,64,0),
  preset:typeof v?.preset==='string'?v.preset.slice(0,20):'custom'});
 const load=()=>{try{const raw=typeof localStorage!=='undefined'?localStorage.getItem(KEY):null;return raw?clean(JSON.parse(raw)):{...DEFAULTS}}catch{return{...DEFAULTS}}};
 let cfg=load(),enabled=false,status='off',access=null,learning=false,errorText='';
 const held=new Map(),attached=new Map(),listeners=new Set();
 const stats={messages:0,noteOn:0,noteOff:0,cc:{},bend:0,aftertouch:0,other:0,velMin:null,velMax:null,below:0,above:0,filtered:0,errors:[],first:null};
 let log=[],snap=null,dirty=false,timer=0;
 const notify=()=>{snap=null;for(const fn of listeners)try{fn()}catch{}};
 const publish=(now)=>{if(now){if(timer){clearTimeout(timer);timer=0}notify();return}dirty=true;if(timer)return;timer=setTimeout(()=>{timer=0;dirty=false;notify()},120)};
 /* position of a hardware key in the Keyboard window (negative = below the first position: ignored, never played as another note) */
 const positionOf=(note,c=cfg)=>note-c.root+c.offset;
 /* one MIDI message -> {kind, ch (1..16), a, b}; Note On with velocity 0 is a Note Off; realtime / system messages are 'system' */
 function parse(bytes){
  if(!bytes||!bytes.length)return null;const s=bytes[0];
  if(s<0x80)return{kind:'data',ch:0,a:s,b:0};
  if(s>=0xF0)return{kind:s>=0xF8?'realtime':'system',ch:0,a:bytes[1]|0,b:bytes[2]|0};
  const ch=(s&15)+1,a=bytes[1]|0,b=bytes[2]|0;
  switch(s&0xF0){
   case 0x90:return b>0?{kind:'noteOn',ch,a,b}:{kind:'noteOff',ch,a,b:0};
   case 0x80:return{kind:'noteOff',ch,a,b};
   case 0xB0:return{kind:'cc',ch,a,b};
   case 0xE0:return{kind:'bend',ch,a:(b<<7)|a,b:0};
   case 0xA0:case 0xD0:return{kind:'aftertouch',ch,a,b};
   default:return{kind:'other',ch,a,b};}
 }
 function emit(type,code,pos){
  try{const ev=new KeyboardEvent(type,{code,key:'Unidentified',bubbles:true,cancelable:true});if(type==='keydown')ev.__xenHwPos=pos;window.dispatchEvent(ev)}
  catch(e){if(stats.errors.length<5)stats.errors.push(String(e&&e.message||e).slice(0,120))}
 }
 function rangeMiss(pos){stats.above++;log.push('position '+pos+' is above the top of the Grid: move the window down (ß / Ü) or lower the first key');if(log.length>10)log.shift();publish()}
 function release(note){const e=held.get(note);if(!e)return;held.delete(note);emit('keyup',e.code,e.pos)}
 function releaseAll(){for(const n of [...held.keys()])release(n)}
 function press(note,vel){
  if(learning){learning=false;cfg={...cfg,root:note,preset:'custom'};save();return}
  const pos=positionOf(note);
  if(pos<0){stats.below++;return}
  if(held.has(note))release(note);
  const code='XenHw'+note;held.set(note,{code,pos});emit('keydown',code,pos);
 }
 function note(m,name){
  const s=stats;s.messages++;
  const add=t=>{log.push((name?name.slice(0,18)+' · ':'')+t);if(log.length>10)log.shift()};
  if(m.kind==='realtime')return;
  if(cfg.channel&&m.ch&&m.ch!==cfg.channel&&(m.kind==='noteOn'||m.kind==='noteOff')){s.filtered++;return}
  switch(m.kind){
   case 'noteOn':s.noteOn++;s.velMin=s.velMin===null?m.b:Math.min(s.velMin,m.b);s.velMax=s.velMax===null?m.b:Math.max(s.velMax,m.b);add('on '+noteName(m.a)+' ('+m.a+') v'+m.b+' ch'+m.ch+' → position '+positionOf(m.a)+(positionOf(m.a)<0?' · below the first key: ignored':''));press(m.a,m.b);break;
   case 'noteOff':s.noteOff++;add('off '+noteName(m.a)+' ('+m.a+')');release(m.a);break;
   case 'cc':s.cc[m.a]=(s.cc[m.a]||0)+1;add('CC'+m.a+' = '+m.b+' ch'+m.ch);break;
   case 'bend':s.bend++;add('pitch bend '+m.a);break;
   case 'aftertouch':s.aftertouch++;add('aftertouch '+m.a+' '+m.b);break;
   default:s.other++;add(m.kind);}
  publish();
 }
 function save(){try{localStorage.setItem(KEY,JSON.stringify(cfg))}catch{}publish(true)}
 function inputs(){const out=[];if(access)for(const i of access.inputs.values())out.push({id:i.id,name:i.name||'MIDI input',manufacturer:i.manufacturer||'',state:i.state});return out}
 function detach(){for(const [inp] of attached)try{inp.onmidimessage=null}catch{}attached.clear()}
 function refresh(){
  if(!access)return;detach();
  const list=[...access.inputs.values()],use=cfg.deviceId?list.filter(i=>i.id===cfg.deviceId):list;
  for(const i of use){if(i.state==='disconnected')continue;i.onmidimessage=e=>note(parse(e.data),i.name);attached.set(i,true)}
  if(!stats.first&&list[0])stats.first={name:list[0].name||'',manufacturer:list[0].manufacturer||''};
  if(cfg.deviceId&&!list.some(i=>i.id===cfg.deviceId&&i.state!=='disconnected'))releaseAll();
  status=!enabled?'off':list.length?'ready':'no-device';publish(true);
 }
 function enable(){
  if(enabled)return;
  if(typeof navigator==='undefined'||typeof navigator.requestMIDIAccess!=='function'){status='unsupported';publish(true);return}
  enabled=true;status='asking';publish(true);
  navigator.requestMIDIAccess({sysex:false}).then(a=>{if(!enabled){return}access=a;a.onstatechange=()=>{releaseAllIfGone();refresh()};refresh()})
   .catch(e=>{enabled=false;status='denied';errorText=String(e&&e.message||e).slice(0,160);if(stats.errors.length<5)stats.errors.push(errorText);publish(true)});
 }
 const releaseAllIfGone=()=>{if(!access)return;const live=new Set([...access.inputs.values()].filter(i=>i.state!=='disconnected').map(i=>i.id));if(![...attached.keys()].some(i=>live.has(i.id)))releaseAll()};
 function disable(){enabled=false;detach();releaseAll();learning=false;status='off';if(access)try{access.onstatechange=null}catch{}access=null;publish(true)}
 function setConfig(patch){
  const prev=cfg;cfg=clean({...cfg,...patch});
  if(patch&&Object.hasOwn(patch,'root')&&!Object.hasOwn(patch,'preset'))cfg.preset='custom';
  if(prev.deviceId!==cfg.deviceId||prev.channel!==cfg.channel)releaseAll();
  save();if(prev.deviceId!==cfg.deviceId)refresh();
 }
 function applyPreset(id){const p=PRESETS.find(x=>x.id===id);if(p)setConfig({root:p.root,preset:p.id})}
 function learn(on){learning=on!==false;publish(true)}
 function report(){
  const L=[];const nav=typeof navigator!=='undefined'?navigator:{};
  L.push('XenSonar hardware keyboard report (stage 1)');
  L.push('Browser: '+String(nav.userAgent||'?').slice(0,200));
  L.push('Web MIDI: '+(typeof nav.requestMIDIAccess==='function'?'available':'not available')+' · status: '+status+(errorText?' ('+errorText+')':''));
  L.push('Devices: '+(inputs().map(d=>(d.manufacturer?d.manufacturer+' ':'')+d.name+' ['+d.state+']').join('; ')||'none'));
  L.push('Settings: first key '+cfg.root+' ('+noteName(cfg.root)+'), offset '+cfg.offset+', channel '+(cfg.channel||'all')+', preset '+cfg.preset+', device '+(cfg.deviceId?'selected':'all'));
  L.push('Messages: '+stats.messages+' · note on '+stats.noteOn+' (velocity '+(stats.velMin===null?'-':stats.velMin+'..'+stats.velMax)+') · note off '+stats.noteOff+' · pitch bend '+stats.bend+' · aftertouch '+stats.aftertouch+' · other '+stats.other);
  L.push('Controllers seen: '+(Object.keys(stats.cc).map(k=>'CC'+k+'×'+stats.cc[k]).join(' ')||'none'));
  L.push('Ignored: '+stats.below+' below the first position, '+stats.above+' above the top of the Grid, '+stats.filtered+' filtered by channel');
  if(stats.errors.length)L.push('Errors: '+stats.errors.join(' | '));
  L.push('Last messages:');for(const l of log)L.push('  '+l);
  return L.join('\n');
 }
 function snapshot(){
  if(snap)return snap;
  snap=Object.freeze({enabled,status,learning,cfg,devices:inputs(),log:log.slice(),held:held.size,errorText,supported:typeof navigator!=='undefined'&&typeof navigator.requestMIDIAccess==='function',presets:PRESETS});
  return snap;
 }
 return Object.freeze({PRESETS,parse,positionOf,rangeMiss,noteName,enable,disable,setConfig,applyPreset,learn,report,snapshot,
  subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),
  /* test hook: feed a message as if a device sent it (also used by the browser test with a simulated device) */
  _message:(bytes,name)=>note(parse(bytes),name||'test'),_reset:()=>{releaseAll();cfg={...DEFAULTS};held.clear();log=[];snap=null;learning=false}});
})();

/* UI: a slim row in the technical card row (next to the Touchpad helper) opens a dialog with everything adjustable without code, with typical presets.
   Inline styles on purpose: independent of which utility classes the main stylesheet happens to contain. */
const __xenHwStyle={
 row:{display:'grid',gap:4,marginTop:8,paddingTop:8,borderTop:'1px solid #24242d',color:'#bdbdc5',fontSize:11,minWidth:0},
 head:{display:'flex',justifyContent:'space-between',gap:8,alignItems:'baseline'},
 btn:{background:'#14141c',color:'#e9e4ff',border:'1px solid #3b3b4a',borderRadius:4,padding:'4px 10px',font:'inherit',cursor:'pointer'},
 btnOn:{background:'#1d2a30',borderColor:'#5ef2ff'},
 back:{position:'fixed',inset:0,zIndex:30000,background:'rgba(2,2,8,.72)',display:'flex',alignItems:'center',justifyContent:'center',padding:16},
 dlg:{width:'min(560px,100%)',maxHeight:'92vh',overflow:'auto',background:'#0d0d14',color:'#cfcfd8',border:'1px solid #3b3b4a',borderRadius:8,padding:'16px 18px',fontSize:12,display:'grid',gap:10},
 field:{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'},
 inp:{background:'#14141c',color:'#e9e4ff',border:'1px solid #3b3b4a',borderRadius:4,padding:'3px 6px',font:'inherit'},
 mon:{margin:0,maxHeight:130,overflow:'auto',background:'#07070b',border:'1px solid #24242d',borderRadius:4,padding:6,fontSize:10,lineHeight:1.35,color:'#9a9aa8',whiteSpace:'pre-wrap'},
 note:{margin:0,fontSize:11,lineHeight:1.4,color:'#8a8a98'}};
const __xenHwStatus={off:'Off',asking:'Waiting for permission…',ready:'Ready','no-device':'On · no keyboard found',unsupported:'Not available in this browser',denied:'Permission denied'};
function __XenHwKeyboardSettings({onClose}){
 const s=P.useSyncExternalStore(__XenHwKeyboard.subscribe,__XenHwKeyboard.snapshot,__XenHwKeyboard.snapshot);
 const [copied,setCopied]=P.useState('');
 const HW=__XenHwKeyboard,c=s.cfg,S=__xenHwStyle;
 const long={unsupported:'This browser has no Web MIDI (Chrome and Edge work; Firefox asks for an add-on; Safari does not support it).','no-device':'Switched on, but no keyboard was found: plug it in.',denied:'The browser refused access or Web MIDI failed'+(s.errorText?' ('+s.errorText+')':'')+'.'}[s.status]||'';
 const copy=()=>{const t=HW.report();(navigator.clipboard?.writeText?navigator.clipboard.writeText(t):Promise.reject()).then(()=>setCopied('Report copied. Paste it into your message.'),()=>setCopied(t))};
 return u.jsxs(P.Fragment,{children:[
  u.jsxs('div',{style:S.head,children:[u.jsx('h2',{id:'xen-hw-title',style:{margin:0,fontSize:15,color:'#f0eaff'},children:'Hardware keyboard (MIDI)'}),u.jsx('button',{type:'button',style:S.btn,onClick:onClose,'data-xen-hw-close':'true',children:'Close'})]}),
  u.jsxs('label',{style:{...S.field,fontSize:13,color:'#e9e4ff',cursor:'pointer'},title:'Each key plays the same slot as the computer key in its place: same Window, tuning, muted steps and Hold slots. Needs the Live Room (Power on); the browser asks for permission.',children:[
   u.jsx('input',{type:'checkbox','aria-label':'Use a hardware keyboard',checked:s.enabled,onChange:e=>e.target.checked?HW.enable():HW.disable()}),'Use a keyboard connected by USB']}),
  u.jsx('p',{style:S.note,children:'Status: '+(__xenHwStatus[s.status]||s.status)+(long?' · '+long:'')}),
  u.jsx('p',{style:S.note,children:'Each key plays the same slot as the computer key in its place, with your tuning (a tritave stays a tritave), muted steps and the Keyboard window (ß / Ü). Needs the Live Room (Power on). Stage 1: keys only; velocity, pedal and pitch bend follow. New and not yet tested with real hardware: feedback welcome (copy the device report below).'}),
  u.jsxs('label',{style:S.field,children:['Device',u.jsxs('select',{style:S.inp,'aria-label':'Keyboard device',value:c.deviceId,onChange:e=>HW.setConfig({deviceId:e.target.value}),children:[u.jsx('option',{value:'',children:'All devices'}),...s.devices.map(d=>u.jsx('option',{key:d.id,value:d.id,children:(d.manufacturer?d.manufacturer+' ':'')+d.name+(d.state==='disconnected'?' (disconnected)':'')}))]})]}),
  u.jsxs('label',{style:S.field,children:['Channel',u.jsxs('select',{style:S.inp,'aria-label':'Keyboard channel',value:c.channel,onChange:e=>HW.setConfig({channel:+e.target.value}),children:[u.jsx('option',{value:0,children:'All'}),...Array.from({length:16},(_,i)=>u.jsx('option',{key:i,value:i+1,children:i+1}))]})]}),
  u.jsxs('label',{style:S.field,title:'Typical setups. The first key is the one that plays position 1 of the Keyboard window (the computer key 1).',children:['Preset',u.jsxs('select',{style:S.inp,'aria-label':'Keyboard preset',value:c.preset,onChange:e=>HW.applyPreset(e.target.value),children:[...(c.preset==='custom'?[u.jsx('option',{key:'custom',value:'custom',children:'Custom'})]:[]),...s.presets.map(p=>u.jsx('option',{key:p.id,value:p.id,children:p.label}))]})]}),
  u.jsxs('div',{style:S.field,children:[
   u.jsxs('label',{style:S.field,children:['First key (0–127)',u.jsx('input',{type:'number',min:0,max:127,style:{...S.inp,width:64},'aria-label':'First key',value:c.root,onChange:e=>HW.setConfig({root:e.target.value})}),u.jsx('span',{style:{color:'#8a8a98'},children:HW.noteName(c.root)})]}),
   u.jsx('button',{type:'button',style:{...S.btn,...(s.learning?S.btnOn:null)},'aria-pressed':s.learning,onClick:()=>HW.learn(!s.learning),title:'Press this, then press the key that should be position 1',children:s.learning?'Press a key…':'Learn first key'}),
   u.jsxs('label',{style:S.field,title:'Shifts every key by whole positions (like the window keys).',children:['Offset',u.jsx('input',{type:'number',min:-64,max:64,style:{...S.inp,width:64},'aria-label':'Keyboard position offset',value:c.offset,onChange:e=>HW.setConfig({offset:e.target.value})})]})]}),
  u.jsx('pre',{style:S.mon,'aria-label':'Keyboard monitor',children:s.log.length?s.log.join('\n'):'Monitor: press a key on your keyboard.'}),
  u.jsx('div',{style:S.field,children:u.jsx('button',{type:'button',style:S.btn,onClick:copy,children:'Copy device report'})}),
  copied&&(copied.startsWith('Report')?u.jsx('p',{style:{...S.note,color:'#6ee7a8'},children:copied}):u.jsx('textarea',{readOnly:true,style:{...S.mon,height:96,width:'100%'},'aria-label':'Device report',value:copied,onFocus:e=>e.target.select()}))]});
}
/* the slim row in the technical card row; "Set up…" opens the dialog (Escape or Close returns focus to the button) */
function __XenHwKeyboardDock(){
 const s=P.useSyncExternalStore(__XenHwKeyboard.subscribe,__XenHwKeyboard.snapshot,__XenHwKeyboard.snapshot);
 const [open,setOpen]=P.useState(false);const opener=P.useRef(null),dlg=P.useRef(null),S=__xenHwStyle;
 const close=P.useCallback(()=>{setOpen(false);opener.current?.focus?.()},[]);
 P.useEffect(()=>{
  if(!open)return;
  dlg.current?.querySelector('[data-xen-hw-close]')?.focus?.();
  const key=e=>{if(e.key==='Escape'){e.stopPropagation();e.preventDefault();close()}};
  window.addEventListener('keydown',key,true);return()=>window.removeEventListener('keydown',key,true);
 },[open,close]);
 return u.jsxs('div',{style:S.row,'data-xen-hw-keyboard':'true','aria-label':'Hardware keyboard',children:[
  u.jsxs('div',{style:S.head,children:[u.jsx('span',{children:'Keyboard · Hardware (MIDI)'}),u.jsx('span',{'aria-live':'polite',children:__xenHwStatus[s.status]||s.status})]}),
  u.jsx('button',{type:'button',ref:opener,style:S.btn,'aria-haspopup':'dialog','aria-expanded':open,onClick:()=>setOpen(true),children:'Set up hardware keyboard…'}),
  open&&typeof document!=='undefined'&&ao.createPortal(u.jsx('div',{style:S.back,onMouseDown:e=>{if(e.target===e.currentTarget)close()},children:
   u.jsx('div',{ref:dlg,role:'dialog','aria-modal':'true','aria-labelledby':'xen-hw-title',style:S.dlg,'data-xen-hw-dialog':'true',children:u.jsx(__XenHwKeyboardSettings,{onClose:close})})}),document.body)]});
}
