/* HWKB-01 / HWKB-02 · Hardware keyboard input layer (keys with velocity, layouts for ordinary / multi-channel (Lumatone) / MPE controllers, controls that press XenSonar keys, monitor, device report).
   A MIDI keyboard is only the wire protocol of the hardware: nothing is sent out, no MIDI sounds. Each key becomes the SAME key event as a computer key
   (position k of the Keyboard window), so Window offset, tuning (tritave, JI ...), muted steps, Hold slots, Psy Lab and ownership of the key behave exactly as on the
   computer keyboard (bPe reads event.__xenHwPos). Off by default; nothing touches Web MIDI before the player switches it on (permission prompt).
   Settings live in their own browser key (like the keyboard layout), one profile per device name, never in sessions. The Grid decides the pitch: pitch bend is shown, not used.
   Zone: WARM (message handler is plain JS, no React per message; the monitor refreshes at most every 120 ms). Not tested with real hardware. */
const __XenHwKeyboard=(()=>{
 const KEY='xensonar.hwkeyboard.v1';
 const PRESETS=Object.freeze([
  {id:'c2',label:'Lowest key C2 (36) · typical for 49 / 61 keys',root:36},
  {id:'c3',label:'Lowest key C3 (48) · typical for 25 / 37 keys',root:48},
  {id:'f1',label:'Lowest key F1 (29) · typical for 32 keys',root:29},
  {id:'c4',label:'Middle C (60) is the first position',root:60},
  {id:'a0',label:'Lowest key A0 (21) · 88 keys',root:21}]);
 /* HWKB-02 layouts: how a key becomes a position of the Keyboard window. The Grid decides the pitch, never the device.
    linear  = one row of keys: position = key number - first key (every ordinary keyboard; an isomorphic controller that sends key numbers is isomorphic in the Grid).
    blocks  = controllers that spread their keys over several channels (Lumatone: channel and key number are free per key; usual are one channel per board of 56 keys or one channel per period of the tuning): position = (channel - first channel) x keys per channel + key - first key.
    mpe     = one channel per finger (MPE): the channel is only the finger, so it is ignored for the position. */
 const LAYOUTS=Object.freeze([{id:'linear',label:'One row of keys (ordinary keyboard)'},{id:'blocks',label:'Several channels in a row (Lumatone, one channel per block / period)'},{id:'mpe',label:'MPE: one channel per finger (channel ignored)'}]);
 /* what a pedal, wheel, knob, pad or program button can do: press an existing XenSonar key. Nothing new is wired: the owner of that key does the work. */
 const ACTIONS=Object.freeze([
  {id:'sustain',label:'Sustain (the ´ key)',code:'Equal',key:'´'},{id:'swell',label:'Swell / expression up (B)',code:'KeyB',key:'b'},{id:'damp',label:'Damp / expression down (left Alt)',code:'AltLeft',key:'Alt'},
  {id:'octave',label:'Octave / period hold (Backspace)',code:'Backspace',key:'Backspace'},{id:'winDown',label:'Keyboard window down (Ü)',code:'BracketLeft',key:'ü'},{id:'winUp',label:'Keyboard window up (ß)',code:'Minus',key:'ß'},
  {id:'enter',label:'Wave Starter (Enter)',code:'Enter',key:'Enter'},{id:'detach',label:'Detach the foundation (Space)',code:'Space',key:' '}]);
 const CURVES=Object.freeze({linear:1,soft:.5,hard:2});
 const NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
 const noteName=n=>NAMES[((n%12)+12)%12]+(Math.floor(n/12)-1);
 const VEL0=Object.freeze({curve:'linear',min:1,max:127,floor:.15,top:1});
 const DEFAULT_ASSIGNS=Object.freeze([Object.freeze({src:'cc',num:64,ch:0,code:'Equal',key:'´',shift:false,label:'Sustain (the ´ key)'})]);
 const DEFAULTS=Object.freeze({deviceId:'',channel:0,root:48,offset:0,preset:'c3',layout:'linear',blockSize:56,blockFirstNote:0,blockFirstChannel:1,vel:VEL0,assigns:DEFAULT_ASSIGNS});
 const clampInt=(v,lo,hi,d)=>{v=Math.round(Number(v));return Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):d};
 const clampNum=(v,lo,hi,d)=>{v=Number(v);return Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):d};
 const str=(v,n,d='')=>typeof v==='string'?v.slice(0,n):d;
 const cleanVel=v=>{const min=clampInt(v?.min,1,126,1),max=Math.max(min+1,clampInt(v?.max,2,127,127));return{curve:v?.curve==='fixed'||Object.hasOwn(CURVES,v?.curve)?v.curve:'linear',min,max,floor:clampNum(v?.floor,0,1,.15),top:clampNum(v?.top,.1,1.5,1)}};
 const cleanAssign=a=>a&&['cc','note','pc'].includes(a.src)&&typeof a.code==='string'&&a.code?{src:a.src,num:clampInt(a.num,0,127,0),ch:clampInt(a.ch,0,16,0),code:a.code.slice(0,40),key:str(a.key,20,'Unidentified'),shift:!!a.shift,label:str(a.label,60)}:null;
 const clean=v=>({deviceId:str(v?.deviceId,200),channel:clampInt(v?.channel,0,16,0),root:clampInt(v?.root,0,127,48),offset:clampInt(v?.offset,-512,512,0),preset:str(v?.preset,20,'custom'),
  layout:LAYOUTS.some(l=>l.id===v?.layout)?v.layout:'linear',blockSize:clampInt(v?.blockSize,1,128,56),blockFirstNote:clampInt(v?.blockFirstNote,0,127,0),blockFirstChannel:clampInt(v?.blockFirstChannel,1,16,1),
  vel:cleanVel(v?.vel),assigns:Array.isArray(v?.assigns)?v.assigns.slice(0,32).map(cleanAssign).filter(Boolean):DEFAULT_ASSIGNS.map(a=>({...a}))});
 /* one profile per device name (ids are not stable between browsers), so two keyboards keep their own first key, layout, velocity curve and controls */
 const cleanProfiles=p=>{const out={};if(p&&typeof p==='object')for(const k of Object.keys(p).slice(0,16)){const {deviceId,...rest}=clean(p[k]);out[k.slice(0,120)]=rest}return out};
 const load=()=>{try{const raw=typeof localStorage!=='undefined'?localStorage.getItem(KEY):null;if(!raw)return{cfg:clean(DEFAULTS),profiles:{}};const j=JSON.parse(raw);return{cfg:clean(j),profiles:cleanProfiles(j?.profiles)}}catch{return{cfg:clean(DEFAULTS),profiles:{}}}};
 let {cfg,profiles}=load(),enabled=false,status='off',access=null,learning=false,errorText='',lastErr=null,permState='',lastControl=null;
 const held=new Map(),attached=new Map(),listeners=new Set(),gains=new Map(),ctl=new Map();
 const blank=()=>({messages:0,noteOn:0,noteOff:0,cc:{},bend:0,aftertouch:0,pc:0,other:0,velMin:null,velMax:null,below:0,above:0,filtered:0,controls:0,channels:{},errors:[],first:null});
 let stats=blank(),log=[],snap=null,timer=0;
 const notify=()=>{snap=null;for(const fn of listeners)try{fn()}catch{}};
 const publish=(now)=>{if(now){if(timer){clearTimeout(timer);timer=0}notify();return}if(timer)return;timer=setTimeout(()=>{timer=0;notify()},120)};
 /* position of a hardware key in the Keyboard window (negative = below the first position: ignored, never played as another note) */
 const positionOf=(note,c=cfg,ch=1)=>c.layout==='blocks'?(ch-c.blockFirstChannel)*c.blockSize+(note-c.blockFirstNote)+c.offset:note-c.root+c.offset;
 /* velocity 1..127 -> level of the note (a factor on the slot volume): the played range of THIS keyboard is spread over floor..top along the curve; 'fixed' = every key at top */
 const levelOf=(v,c=cfg.vel)=>{if(c.curve==='fixed')return c.top;const x=Math.max(0,Math.min(1,(v-c.min)/(c.max-c.min)));return (c.floor+(1-c.floor)*Math.pow(x,CURVES[c.curve]||1))*c.top};
 /* the level of a key by its key id (event.code): 1 for computer keys and anything unknown. Read by the voice starters (first note, Hold pulses, Psy Lab). */
 const gainFor=code=>{const g=typeof code==='string'?gains.get(code):undefined;return g===undefined?1:g};
 /* one MIDI message -> {kind, ch (1..16), a, b}; Note On with velocity 0 is a Note Off; realtime / system messages are 'system' */
 function parse(bytes){
  if(!bytes||!bytes.length)return null;const s=bytes[0];
  if(s<0x80)return{kind:'data',ch:0,a:s,b:0};
  if(s>=0xF0)return{kind:s>=0xF8?'realtime':'system',ch:0,a:bytes[1]|0,b:bytes[2]|0};
  const ch=(s&15)+1,a=(bytes[1]|0)&127,b=(bytes[2]|0)&127;
  switch(s&0xF0){
   case 0x90:return b>0?{kind:'noteOn',ch,a,b}:{kind:'noteOff',ch,a,b:0};
   case 0x80:return{kind:'noteOff',ch,a,b};
   case 0xB0:return{kind:'cc',ch,a,b};
   case 0xC0:return{kind:'pc',ch,a,b:0};
   case 0xE0:return{kind:'bend',ch,a:(b<<7)|a,b:0};
   case 0xA0:return{kind:'aftertouch',ch,a,b};
   case 0xD0:return{kind:'aftertouch',ch,a:-1,b:a};
   default:return{kind:'other',ch,a,b};}
 }
 /* A browser should hand over one message per event, but drivers differ: several messages in one packet, running status (data bytes without a status byte)
    and realtime bytes in between are all accepted. `port` keeps the running status of one input. */
 function split(bytes,port){
  const out=[];if(!bytes)return out;let i=0;const n=bytes.length;
  while(i<n){const b=bytes[i];
   if(b>=0xF8){out.push([b]);i++;continue}
   if(b>=0xF0){port.rs=0;if(b===0xF0){let j=i+1;while(j<n&&bytes[j]!==0xF7)j++;out.push([0xF0]);i=j+1;continue}const len=b===0xF2?3:b===0xF1||b===0xF3?2:1;out.push(Array.from(bytes.slice(i,i+len)));i+=len;continue}
   let status=b,at=i+1;if(b<0x80){if(!port.rs){i++;continue}status=port.rs;at=i}else port.rs=b;
   const need=(status&0xF0)===0xC0||(status&0xF0)===0xD0?1:2,msg=[status];let j=at;
   while(msg.length<=need&&j<n){const d=bytes[j];if(d>=0xF8){out.push([d]);j++;continue}if(d>=0x80)break;msg.push(d);j++}
   if(msg.length===need+1)out.push(msg);i=j}
  return out;
 }
 function emit(type,code,pos,key,shift){
  try{const ev=new KeyboardEvent(type,{code,key:key||'Unidentified',shiftKey:!!shift,bubbles:true,cancelable:true});if(type==='keydown'&&pos!==undefined)ev.__xenHwPos=pos;window.dispatchEvent(ev)}
  catch(e){if(stats.errors.length<5)stats.errors.push(String(e&&e.message||e).slice(0,120))}
 }
 const say=t=>{log.push(t);if(log.length>12)log.shift()};
 function rangeMiss(pos){stats.above++;say('position '+pos+' is above the top of the Grid: move the window down (ß / Ü) or lower the first key');publish()}
 function release(id){const e=held.get(id);if(!e)return;held.delete(id);emit('keyup',e.code,e.pos)}
 function releaseAll(){for(const id of [...held.keys()])release(id);for(const [k,c] of ctl){if(c.down)emit('keyup',c.code,undefined,c.key,c.shift)}ctl.clear()}
 const keyId=(ch,note)=>'XenHw'+ch+'_'+note;
 function press(ch,note,vel){
  if(learning==='first'){learning=false;setConfig(cfg.layout==='blocks'?{blockFirstNote:note,blockFirstChannel:ch}:{root:note,preset:'custom'});return}
  const pos=positionOf(note,cfg,ch);
  if(pos<0){stats.below++;return}
  const code=keyId(ch,note);
  if(held.has(code))release(code);
  if(gains.size>4096)gains.clear();gains.set(code,levelOf(vel));
  held.set(code,{code,pos});emit('keydown',code,pos);
 }
 /* a control (pedal, wheel, knob, pad, program button) presses and releases an existing XenSonar key: on at 64 and above, off below (a pad or a program button taps it) */
 const assignOf=(src,num,ch)=>cfg.assigns.find(a=>a.src===src&&a.num===num&&(!a.ch||a.ch===ch));
 function control(a,on,tap){
  const k=a.src+a.num+'_'+a.ch,c=ctl.get(k)||{down:false,code:a.code,key:a.key,shift:a.shift};ctl.set(k,c);stats.controls++;
  if(tap){emit('keydown',a.code,undefined,a.key,a.shift);emit('keyup',a.code,undefined,a.key,a.shift);return}
  if(on&&!c.down){c.down=true;emit('keydown',a.code,undefined,a.key,a.shift)}else if(!on&&c.down){c.down=false;emit('keyup',a.code,undefined,a.key,a.shift)}
 }
 function note(m,name){
  if(!m)return;const s=stats;s.messages++;
  const add=t=>say((name?name.slice(0,18)+' · ':'')+t);
  if(m.kind==='realtime'||m.kind==='data')return;
  if(m.ch)s.channels[m.ch]=(s.channels[m.ch]||0)+1;
  /* learning a control: the first controller / program / key that moves is the one */
  if(learning==='control'&&(m.kind==='cc'||m.kind==='pc'||m.kind==='noteOn')){learning=false;lastControl={src:m.kind==='noteOn'?'note':m.kind,num:m.a,ch:m.ch};add('learned '+describe(lastControl));publish(true);return}
  const isNote=m.kind==='noteOn'||m.kind==='noteOff';
  if(isNote){const a=assignOf('note',m.a,m.ch);if(a){add((m.kind==='noteOn'?'on ':'off ')+noteName(m.a)+' ('+m.a+') → '+(a.label||a.code));control(a,m.kind==='noteOn');publish();return}}
  if(cfg.layout==='linear'&&cfg.channel&&m.ch&&m.ch!==cfg.channel&&isNote){s.filtered++;return}
  switch(m.kind){
   case 'noteOn':{s.noteOn++;s.velMin=s.velMin===null?m.b:Math.min(s.velMin,m.b);s.velMax=s.velMax===null?m.b:Math.max(s.velMax,m.b);const pos=positionOf(m.a,cfg,m.ch);
    add('on '+noteName(m.a)+' ('+m.a+') v'+m.b+' ch'+m.ch+' → position '+pos+(pos<0?' · below the first key: ignored':' · level '+levelOf(m.b).toFixed(2)));press(m.ch,m.a,m.b);break}
   case 'noteOff':s.noteOff++;add('off '+noteName(m.a)+' ('+m.a+')');release(keyId(m.ch,m.a));break;
   case 'cc':{s.cc[m.a]=(s.cc[m.a]||0)+1;
    if(m.a===120||m.a===123){add('CC'+m.a+' all notes off');releaseAll();break}
    const a=assignOf('cc',m.a,m.ch);add('CC'+m.a+' = '+m.b+' ch'+m.ch+(a?' → '+(a.label||a.code):''));if(a)control(a,m.b>=64);break}
   case 'pc':{s.pc++;const a=assignOf('pc',m.a,m.ch);add('program '+m.a+' ch'+m.ch+(a?' → '+(a.label||a.code):''));if(a)control(a,true,true);break}
   case 'bend':s.bend++;if(s.bend%8===1)add('pitch bend '+m.a+' ch'+m.ch+' (not used: the Grid decides the pitch)');break;
   case 'aftertouch':s.aftertouch++;if(s.aftertouch%8===1)add('aftertouch '+m.b+' ch'+m.ch);break;
   default:s.other++;if(m.kind!=='system')add(m.kind);}
  publish();
 }
 const describe=c=>c?(c.src==='cc'?'controller CC'+c.num:c.src==='pc'?'program button '+c.num:'key / pad '+noteName(c.num)+' ('+c.num+')')+(c.ch?' on channel '+c.ch:''):'';
 const profileKey=()=>{if(!cfg.deviceId)return '*';const d=access?[...access.inputs.values()].find(i=>i.id===cfg.deviceId):null;return d?((d.manufacturer||'')+' '+(d.name||'')).trim().slice(0,120)||'*':'*'};
 function save(){const {deviceId,...rest}=cfg;profiles={...profiles,[profileKey()]:rest};try{localStorage.setItem(KEY,JSON.stringify({...cfg,profiles}))}catch{}publish(true)}
 function inputs(){const out=[];if(access)for(const i of access.inputs.values())out.push({id:i.id,name:i.name||'MIDI input',manufacturer:i.manufacturer||'',state:i.state});return out}
 function detach(){for(const [inp] of attached)try{inp.onmidimessage=null}catch{}attached.clear()}
 function refresh(){
  if(!access)return;detach();
  const list=[...access.inputs.values()],use=cfg.deviceId?list.filter(i=>i.id===cfg.deviceId):list;
  for(const i of use){if(i.state==='disconnected')continue;const port={rs:0};i.onmidimessage=e=>{try{for(const msg of split(e.data,port))note(parse(msg),i.name)}catch(err){if(stats.errors.length<5)stats.errors.push(String(err&&err.message||err).slice(0,120))}};attached.set(i,true);try{i.open?.()?.catch?.(()=>{})}catch{}}
  if(!stats.first&&list[0])stats.first={name:list[0].name||'',manufacturer:list[0].manufacturer||''};
  if(cfg.deviceId&&!list.some(i=>i.id===cfg.deviceId&&i.state!=='disconnected'))releaseAll();
  status=!enabled?'off':list.some(i=>i.state!=='disconnected')?'ready':'no-device';publish(true);
 }
 /* a refusal by the browser (denied) is something else than a system MIDI service that cannot start (failed: e.g. Chromium "Platform dependent initialization failed" when the OS backend, on Linux the ALSA sequencer, is not available) */
 const kindOfError=e=>{const n=String(e&&e.name),m=String(e&&e.message);return (n==='NotAllowedError'||n==='SecurityError')&&!/platform|initiali[sz]ation/i.test(m)?'denied':'failed'};
 const envInfo=()=>{const ua=typeof navigator!=='undefined'?String(navigator.userAgent||''):'';return{secure:typeof window!=='undefined'?window.isSecureContext:undefined,proto:typeof location!=='undefined'?String(location.protocol):'',linux:/Linux/.test(ua)&&!/Android/.test(ua),firefox:/Firefox\//.test(ua),ua}};
 const onBlur=()=>releaseAll();/* a window that loses the focus must not leave notes or a pedal hanging */
 function enable(){
  if(enabled)return;
  if(typeof navigator==='undefined'||typeof navigator.requestMIDIAccess!=='function'){status='unsupported';publish(true);return}
  enabled=true;status='asking';lastErr=null;errorText='';publish(true);
  try{navigator.permissions?.query({name:'midi'}).then(r=>{permState=r.state},()=>{})}catch{}
  let req;try{req=navigator.requestMIDIAccess({sysex:false})}catch(e){req=Promise.reject(e)}
  Promise.resolve(req).then(a=>{if(!enabled){return}access=a;a.onstatechange=()=>{releaseAllIfGone();refresh()};try{window.addEventListener('blur',onBlur)}catch{}refresh()})
   .catch(e=>{enabled=false;status=kindOfError(e);lastErr={name:String(e&&e.name||'Error').slice(0,40),message:String(e&&e.message||e).slice(0,160)};errorText=lastErr.message;if(stats.errors.length<5)stats.errors.push(lastErr.name+': '+lastErr.message);publish(true)});
 }
 const releaseAllIfGone=()=>{if(!access)return;const live=new Set([...access.inputs.values()].filter(i=>i.state!=='disconnected').map(i=>i.id));if(![...attached.keys()].some(i=>live.has(i.id)))releaseAll()};
 function disable(){enabled=false;detach();releaseAll();learning=false;status='off';try{window.removeEventListener('blur',onBlur)}catch{}if(access)try{access.onstatechange=null}catch{}access=null;publish(true)}
 function setConfig(patch){
  const prev=cfg;let next={...cfg,...patch};
  /* another device: keep what belongs to the old one and bring back what was set for the new one */
  if(patch&&Object.hasOwn(patch,'deviceId')&&patch.deviceId!==prev.deviceId){const {deviceId,...rest}=prev;profiles={...profiles,[profileKey()]:rest};cfg={...prev,deviceId:str(patch.deviceId,200)};const p=profiles[profileKey()]||profiles['*'];/* a keyboard seen for the first time starts from the settings for "all devices", not from another keyboard's */next=p?{...p,deviceId:cfg.deviceId}:{...next}}
  cfg=clean(next);
  if(patch&&Object.hasOwn(patch,'root')&&!Object.hasOwn(patch,'preset'))cfg.preset='custom';
  if(prev.deviceId!==cfg.deviceId||prev.channel!==cfg.channel||prev.layout!==cfg.layout)releaseAll();
  save();if(prev.deviceId!==cfg.deviceId)refresh();
 }
 function applyPreset(id){const p=PRESETS.find(x=>x.id===id);if(p)setConfig({root:p.root,preset:p.id})}
 function learn(on){learning=on===false?false:on==='control'?'control':'first';if(learning==='control')lastControl=null;publish(true)}
 /* velocity: take the softest and hardest touch that arrived so far as the range of this keyboard */
 function usePlayedRange(){if(stats.velMin===null||stats.velMax===null||stats.velMax-stats.velMin<8)return false;setConfig({vel:{...cfg.vel,min:stats.velMin,max:stats.velMax}});return true}
 function addAssign(control,target){const c=cleanAssign({...control,...target});if(!c)return false;setConfig({assigns:[...cfg.assigns.filter(a=>!(a.src===c.src&&a.num===c.num&&a.ch===c.ch)),c]});lastControl=null;publish(true);return true}
 function removeAssign(i){releaseAll();setConfig({assigns:cfg.assigns.filter((_,k)=>k!==i)})}
 function report(){
  const L=[];const nav=typeof navigator!=='undefined'?navigator:{};
  L.push('XenSonar hardware keyboard report (stage 2)');
  L.push('Browser: '+String(nav.userAgent||'?').slice(0,200));
  const env=envInfo();
  L.push('Web MIDI: '+(typeof nav.requestMIDIAccess==='function'?'available':'not available')+' · status: '+status+(lastErr?' ('+lastErr.name+': '+lastErr.message+')':errorText?' ('+errorText+')':''));
  L.push('Page: '+(env.proto||'?')+' · secure context: '+(env.secure===undefined?'?':env.secure)+' · permission: '+(permState||'?')+' · platform: '+String(nav.platform||'?').slice(0,40));
  L.push('Devices: '+(inputs().map(d=>(d.manufacturer?d.manufacturer+' ':'')+d.name+' ['+d.state+']').join('; ')||'none'));
  L.push('Settings: layout '+cfg.layout+(cfg.layout==='blocks'?' ('+cfg.blockSize+' keys per channel, first key '+cfg.blockFirstNote+' on channel '+cfg.blockFirstChannel+')':', first key '+cfg.root+' ('+noteName(cfg.root)+')')+', offset '+cfg.offset+', channel '+(cfg.channel||'all')+', preset '+cfg.preset+', device '+(cfg.deviceId?'selected':'all'));
  L.push('Velocity: curve '+cfg.vel.curve+', range '+cfg.vel.min+'..'+cfg.vel.max+', softest level '+cfg.vel.floor+', loudest level '+cfg.vel.top);
  L.push('Controls: '+(cfg.assigns.map(a=>describe(a)+' → '+(a.label||a.code)).join('; ')||'none'));
  L.push('Messages: '+stats.messages+' · note on '+stats.noteOn+' (velocity '+(stats.velMin===null?'-':stats.velMin+'..'+stats.velMax)+') · note off '+stats.noteOff+' · pitch bend '+stats.bend+' · aftertouch '+stats.aftertouch+' · program '+stats.pc+' · other '+stats.other);
  L.push('Channels seen: '+(Object.keys(stats.channels).map(k=>k+'×'+stats.channels[k]).join(' ')||'none'));
  L.push('Controllers seen: '+(Object.keys(stats.cc).map(k=>'CC'+k+'×'+stats.cc[k]).join(' ')||'none'));
  L.push('Ignored: '+stats.below+' below the first position, '+stats.above+' above the top of the Grid, '+stats.filtered+' filtered by channel');
  if(stats.errors.length)L.push('Errors: '+stats.errors.join(' | '));
  L.push('Last messages:');for(const l of log)L.push('  '+l);
  return L.join('\n');
 }
 function snapshot(){
  if(snap)return snap;
  const supported=typeof navigator!=='undefined'&&typeof navigator.requestMIDIAccess==='function';
  snap=Object.freeze({enabled,status:!supported&&status==='off'?'unsupported':status,learning,cfg,devices:inputs(),log:log.slice(),held:held.size,errorText,lastErr,env:envInfo(),supported,presets:PRESETS,layouts:LAYOUTS,actions:ACTIONS,
   velSeen:stats.velMin===null?null:[stats.velMin,stats.velMax],channelsSeen:Object.keys(stats.channels).map(Number),lastControl,lastControlText:describe(lastControl)});
  return snap;
 }
 return Object.freeze({PRESETS,LAYOUTS,ACTIONS,parse,split,positionOf,levelOf,gainFor,describe,rangeMiss,kindOfError,noteName,enable,disable,setConfig,applyPreset,learn,usePlayedRange,addAssign,removeAssign,report,snapshot,
  subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),
  /* test hook: feed bytes as if a device sent them (also used by the browser test with a simulated device) */
  _message:(bytes,name)=>{for(const m of split(bytes,_port))note(parse(m),name||'test')},_reset:()=>{releaseAll();cfg=clean(DEFAULTS);profiles={};held.clear();gains.clear();ctl.clear();log=[];stats=blank();snap=null;learning=false;lastControl=null;_port.rs=0}});
})();
const _port={rs:0};

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
 note:{margin:0,fontSize:11,lineHeight:1.4,color:'#8a8a98'},
 group:{border:'1px solid #24242d',borderRadius:6,padding:'8px 10px',margin:0,display:'grid',gap:8,minWidth:0},legend:{padding:'0 6px',color:'#e9e4ff',fontSize:12}};
const __xenHwStatus={off:'Off',asking:'Waiting for the browser…',ready:'Ready','no-device':'On · no keyboard found',unsupported:'Not available in this browser',denied:'Permission denied',failed:'MIDI could not start'};
/* what happened and what to try, in plain words: by CATEGORY of problem, not by browser (the raw browser message stays visible).
   Typical causes are listed because the layer must work on any browser / system, with hardware nobody on the team can test. */
function __xenHwExplain(s){
 const env=s.env||{},err=s.lastErr?(' ('+s.lastErr.name+': '+s.lastErr.message+')'):'';
 switch(s.status){
  case 'unsupported':return 'Web MIDI is not offered here. Typical causes: the browser does not implement it (e.g. Safari, older versions); the page is not a secure page or is opened as a local file'+(env.secure===false||env.proto==='file:'?' (this one: '+(env.proto||'?')+(env.secure===false?', not secure':'')+')':'')+', and some browsers only offer Web MIDI on https pages; a browser setting or policy has switched it off. Try the https version of XenSonar or another browser (Chrome, Edge and Opera offer it).';
  case 'denied':return 'The browser did not give permission'+err+'. Check the site settings of this page (lock symbol), allow MIDI devices, and switch on again. Some browsers show an extra prompt (for example to install a small add-on): accept it.';
  case 'failed':return 'The browser accepted, but the system MIDI service could not start'+err+'. '+(env.linux?'On Linux the browser needs the ALSA sequencer (kernel module snd-seq): try “sudo modprobe snd-seq”. ':'')+'A sandboxed browser (Snap, Flatpak) may need extra access to MIDI devices. Plug the keyboard in, switch on again, and copy the device report if it keeps failing.';
  case 'asking':return 'Waiting for the browser: it may show a permission prompt, or an extra prompt (for example to install a small add-on). Accept it.';
  case 'no-device':return 'Switched on, but no keyboard was found: plug it in.';
  default:return '';}
}
/* add a control in two steps: move it on the device, then say which XenSonar key it presses (from the list, or any key of the computer keyboard) */
function __XenHwAddControl({s}){
 const HW=__XenHwKeyboard,S=__xenHwStyle;const [target,setTarget]=P.useState('swell'),[wait,setWait]=P.useState(false);
 P.useEffect(()=>{if(!wait)return;const key=e=>{if(e.key==='Escape'){setWait(false);return}if(String(e.code||'').startsWith('XenHw'))return;e.preventDefault();e.stopPropagation();
   if(s.lastControl)HW.addAssign(s.lastControl,{code:e.code,key:e.key,shift:e.shiftKey,label:'key '+(e.key&&e.key.length===1?e.key.toUpperCase():e.code)});setWait(false)};
  window.addEventListener('keydown',key,true);return()=>window.removeEventListener('keydown',key,true)},[wait,s.lastControl]);
 const add=()=>{if(!s.lastControl)return;if(target==='other'){setWait(true);return}const a=s.actions.find(x=>x.id===target);if(a)HW.addAssign(s.lastControl,{code:a.code,key:a.key,label:a.label})};
 return u.jsxs('div',{style:S.field,children:[
  u.jsx('button',{type:'button',style:{...S.btn,...(s.learning==='control'?S.btnOn:null)},'aria-pressed':s.learning==='control','data-xen-hw-learn-control':'true',disabled:!s.enabled,onClick:()=>HW.learn(s.learning==='control'?false:'control'),title:'Press this, then move the pedal, wheel or knob, or press the pad or program button',children:s.learning==='control'?'Move the control…':s.lastControl?'Learned: '+s.lastControlText:'1 · Learn a control'}),
  u.jsxs('label',{style:S.field,children:['2 · presses',u.jsxs('select',{style:S.inp,'aria-label':'Control action',value:target,onChange:e=>setTarget(e.target.value),children:[...s.actions.map(a=>u.jsx('option',{key:a.id,value:a.id,children:a.label})),u.jsx('option',{value:'other',children:'Another key… (press it on the computer keyboard)'})]})]}),
  u.jsx('button',{type:'button',style:{...S.btn,...(wait?S.btnOn:null)},'data-xen-hw-add-control':'true',disabled:!s.lastControl,onClick:add,children:wait?'Press the key… (Esc cancels)':'Add'})]});
}
function __XenHwKeyboardSettings({onClose}){
 const s=P.useSyncExternalStore(__XenHwKeyboard.subscribe,__XenHwKeyboard.snapshot,__XenHwKeyboard.snapshot);
 const [copied,setCopied]=P.useState('');
 const HW=__XenHwKeyboard,c=s.cfg,S=__xenHwStyle;
 const long=__xenHwExplain(s);
 const copy=()=>{const t=HW.report();(navigator.clipboard?.writeText?navigator.clipboard.writeText(t):Promise.reject()).then(()=>setCopied('Report copied. Paste it into your message.'),()=>setCopied(t))};
 return u.jsxs(P.Fragment,{children:[
  u.jsxs('div',{style:S.head,children:[u.jsx('h2',{id:'xen-hw-title',style:{margin:0,fontSize:15,color:'#f0eaff'},children:'Hardware keyboard (MIDI)'}),u.jsx('button',{type:'button',style:S.btn,onClick:onClose,'data-xen-hw-close':'true',children:'Close'})]}),
  u.jsxs('label',{style:{...S.field,fontSize:13,color:'#e9e4ff',cursor:'pointer'},title:'Each key plays the same slot as the computer key in its place: same Window, tuning, muted steps and Hold slots. Needs the Live Room (Power on); the browser asks for permission.',children:[
   u.jsx('input',{type:'checkbox','aria-label':'Use a hardware keyboard',checked:s.enabled,disabled:!s.supported,onChange:e=>e.target.checked?HW.enable():HW.disable()}),'Use a keyboard connected by USB']}),
  u.jsx('p',{role:long&&['unsupported','denied','failed'].includes(s.status)?'alert':undefined,style:{...S.note,...(['unsupported','denied','failed'].includes(s.status)?{color:'#f0b46a'}:null)},children:'Status: '+(__xenHwStatus[s.status]||s.status)+(long?' · '+long:'')}),
  u.jsx('p',{style:S.note,children:'The Grid decides the pitch, the keyboard only says which line: key after key is Grid line after Grid line, with your tuning (a tritave stays a tritave), muted steps skipped, and the Keyboard window (ß / Ü). For an ordinary piano layout choose a 12-step Grid without muted steps. How hard you play sets the level. Needs the Live Room (Power on). Not yet tested with real hardware: feedback welcome (copy the device report below).'}),
  u.jsxs('label',{style:S.field,children:['Device',u.jsxs('select',{style:S.inp,'aria-label':'Keyboard device',value:c.deviceId,onChange:e=>HW.setConfig({deviceId:e.target.value}),children:[u.jsx('option',{value:'',children:'All devices'}),...s.devices.map(d=>u.jsx('option',{key:d.id,value:d.id,children:(d.manufacturer?d.manufacturer+' ':'')+d.name+(d.state==='disconnected'?' (disconnected)':'')}))]})]}),
  u.jsxs('label',{style:S.field,title:'How the keys of the device are laid out. One row: every ordinary keyboard, and isomorphic controllers that send plain key numbers. Several channels in a row: controllers that spread their keys over channels, such as the Lumatone, where every key is given a channel and a key number in its editor: one channel per board of 56 keys, or (recommended for microtonal tunings) one channel per period. MPE: one channel per finger.',children:['Layout',u.jsx('select',{style:S.inp,'aria-label':'Hardware key layout',value:c.layout,onChange:e=>HW.setConfig({layout:e.target.value}),children:s.layouts.map(l=>u.jsx('option',{key:l.id,value:l.id,children:l.label}))})]}),
  c.layout==='blocks'?u.jsxs('div',{style:S.field,'data-xen-hw-blocks':'true',children:[
   u.jsxs('label',{style:S.field,title:'How many positions one channel covers. Lumatone: 56 (keys per board). One channel per period: the number of open Grid steps in one period (for example 12, 19, 31, or 13 for Bohlen-Pierce).',children:['Keys per channel',u.jsx('input',{type:'number',min:1,max:128,style:{...S.inp,width:64},'aria-label':'Keys per channel',value:c.blockSize,onChange:e=>HW.setConfig({blockSize:e.target.value})})]}),
   u.jsxs('label',{style:S.field,children:['First channel',u.jsx('input',{type:'number',min:1,max:16,style:{...S.inp,width:54},'aria-label':'First channel',value:c.blockFirstChannel,onChange:e=>HW.setConfig({blockFirstChannel:e.target.value})})]}),
   u.jsxs('label',{style:S.field,children:['First key (0–127)',u.jsx('input',{type:'number',min:0,max:127,style:{...S.inp,width:64},'aria-label':'First key of a channel',value:c.blockFirstNote,onChange:e=>HW.setConfig({blockFirstNote:e.target.value})})]}),
   u.jsx('button',{type:'button',style:{...S.btn,...(s.learning==='first'?S.btnOn:null)},'aria-pressed':s.learning==='first',onClick:()=>HW.learn(s.learning==='first'?false:true),title:'Press this, then press the key that should be position 1: its key number and channel become the start',children:s.learning==='first'?'Press a key…':'Learn first key'}),
   u.jsxs('label',{style:S.field,title:'Shifts every key by whole positions.',children:['Offset',u.jsx('input',{type:'number',min:-512,max:512,style:{...S.inp,width:64},'aria-label':'Keyboard position offset',value:c.offset,onChange:e=>HW.setConfig({offset:e.target.value})})]}),
   s.channelsSeen.length?u.jsx('span',{style:{color:'#8a8a98'},children:'Channels seen: '+s.channelsSeen.join(', ')}):null]}):null,
  c.layout==='linear'?u.jsxs('label',{style:S.field,children:['Channel',u.jsxs('select',{style:S.inp,'aria-label':'Keyboard channel',value:c.channel,onChange:e=>HW.setConfig({channel:+e.target.value}),children:[u.jsx('option',{value:0,children:'All'}),...Array.from({length:16},(_,i)=>u.jsx('option',{key:i,value:i+1,children:i+1}))]})]}):null,
  c.layout==='blocks'?null:u.jsxs('label',{style:S.field,title:'Typical setups. The first key is the one that plays position 1 of the Keyboard window (the computer key 1).',children:['Preset',u.jsxs('select',{style:S.inp,'aria-label':'Keyboard preset',value:c.preset,onChange:e=>HW.applyPreset(e.target.value),children:[...(c.preset==='custom'?[u.jsx('option',{key:'custom',value:'custom',children:'Custom'})]:[]),...s.presets.map(p=>u.jsx('option',{key:p.id,value:p.id,children:p.label}))]})]}),
  c.layout==='blocks'?null:u.jsxs('div',{style:S.field,children:[
   u.jsxs('label',{style:S.field,children:['First key (0–127)',u.jsx('input',{type:'number',min:0,max:127,style:{...S.inp,width:64},'aria-label':'First key',value:c.root,onChange:e=>HW.setConfig({root:e.target.value})}),u.jsx('span',{style:{color:'#8a8a98'},children:HW.noteName(c.root)})]}),
   u.jsx('button',{type:'button',style:{...S.btn,...(s.learning==='first'?S.btnOn:null)},'aria-pressed':s.learning==='first',onClick:()=>HW.learn(s.learning==='first'?false:true),title:'Press this, then press the key that should be position 1',children:s.learning==='first'?'Press a key…':'Learn first key'}),
   u.jsxs('label',{style:S.field,title:'Shifts every key by whole positions (like the window keys).',children:['Offset',u.jsx('input',{type:'number',min:-512,max:512,style:{...S.inp,width:64},'aria-label':'Keyboard position offset',value:c.offset,onChange:e=>HW.setConfig({offset:e.target.value})})]})]}),
  /* HWKB-02 touch: velocity of the key -> level of the note */
  u.jsxs('fieldset',{style:S.group,'data-xen-hw-velocity':'true',children:[u.jsx('legend',{style:S.legend,children:'Touch (velocity → level)'}),
   u.jsxs('div',{style:S.field,children:[
    u.jsxs('label',{style:S.field,title:'How the force of your touch becomes level. Soft: a light touch is already fairly loud. Hard: you have to dig in. Fixed: every key the same (for keyboards without velocity).',children:['Curve',u.jsxs('select',{style:S.inp,'aria-label':'Velocity curve',value:c.vel.curve,onChange:e=>HW.setConfig({vel:{...c.vel,curve:e.target.value}}),children:[u.jsx('option',{value:'soft',children:'Soft (light touch)'}),u.jsx('option',{value:'linear',children:'Linear'}),u.jsx('option',{value:'hard',children:'Hard (firm touch)'}),u.jsx('option',{value:'fixed',children:'Fixed (no velocity)'})]})]}),
    u.jsxs('label',{style:S.field,title:'Level of the softest touch, relative to the loudest (0 = silent, 1 = no dynamics).',children:['Softest',u.jsx('input',{type:'range',min:0,max:1,step:.01,style:{width:90},'aria-label':'Softest level',value:c.vel.floor,disabled:c.vel.curve==='fixed',onChange:e=>HW.setConfig({vel:{...c.vel,floor:+e.target.value}})}),u.jsx('span',{style:{color:'#8a8a98',minWidth:30},children:Math.round(c.vel.floor*100)+'%'})]}),
    u.jsxs('label',{style:S.field,title:'Level of the hardest touch as a factor on the slot volume of the sound (100% = as loud as the computer keys).',children:['Loudest',u.jsx('input',{type:'range',min:.1,max:1.5,step:.01,style:{width:90},'aria-label':'Loudest level',value:c.vel.top,onChange:e=>HW.setConfig({vel:{...c.vel,top:+e.target.value}})}),u.jsx('span',{style:{color:'#8a8a98',minWidth:34},children:Math.round(c.vel.top*100)+'%'})]})]}),
   u.jsxs('div',{style:S.field,children:[
    u.jsxs('label',{style:S.field,title:'The velocity values your keyboard really sends for the softest and the hardest touch (1 to 127). Many keyboards never reach 127 or never go below 20.',children:['Range of this keyboard',u.jsx('input',{type:'number',min:1,max:126,style:{...S.inp,width:54},'aria-label':'Softest velocity',value:c.vel.min,onChange:e=>HW.setConfig({vel:{...c.vel,min:e.target.value}})}),'to',u.jsx('input',{type:'number',min:2,max:127,style:{...S.inp,width:54},'aria-label':'Hardest velocity',value:c.vel.max,onChange:e=>HW.setConfig({vel:{...c.vel,max:e.target.value}})})]}),
    u.jsx('button',{type:'button',style:S.btn,'data-xen-hw-calibrate':'true',disabled:!s.velSeen||s.velSeen[1]-s.velSeen[0]<8,onClick:()=>HW.usePlayedRange(),title:'Play a few keys as softly and as hard as you can, then press this: the softest and hardest touch that arrived become the range.',children:s.velSeen?'Use what I played ('+s.velSeen[0]+'–'+s.velSeen[1]+')':'Use what I played'})]})]}),
  /* HWKB-02 controls: a pedal, wheel, knob, pad or program button presses an existing XenSonar key */
  u.jsxs('fieldset',{style:S.group,'data-xen-hw-controls':'true',children:[u.jsx('legend',{style:S.legend,children:'Pedal, wheel, knobs, pads'}),
   u.jsx('p',{style:S.note,children:'A control presses a XenSonar key: held while a pedal or wheel is past the middle, tapped by a program button. Any key works, so everything that has a hotkey (Grid, muted steps, sounds, window) can be reached from the device.'}),
   ...c.assigns.map((a,i)=>u.jsxs('div',{style:S.field,'data-xen-hw-assign':String(i),children:[u.jsx('span',{children:HW.describe(a)+' → '+(a.label||a.code)}),u.jsx('button',{type:'button',style:S.btn,'aria-label':'Remove '+HW.describe(a),onClick:()=>HW.removeAssign(i),children:'Remove'})]},i)),
   u.jsx(__XenHwAddControl,{s})]}),
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
  const key=e=>{if(e.key==='Escape'&&!e.defaultPrevented){e.stopPropagation();e.preventDefault();close()}};
  window.addEventListener('keydown',key,true);return()=>window.removeEventListener('keydown',key,true);
 },[open,close]);
 return u.jsxs('div',{style:S.row,'data-xen-hw-keyboard':'true','aria-label':'Hardware keyboard',children:[
  u.jsxs('div',{style:S.head,children:[u.jsx('span',{children:'Keyboard · Hardware (MIDI)'}),u.jsx('span',{'aria-live':'polite',children:__xenHwStatus[s.status]||s.status})]}),
  u.jsx('button',{type:'button',ref:opener,style:S.btn,'aria-haspopup':'dialog','aria-expanded':open,onClick:()=>setOpen(true),children:'Set up hardware keyboard…'}),
  open&&typeof document!=='undefined'&&ao.createPortal(u.jsx('div',{style:S.back,onMouseDown:e=>{if(e.target===e.currentTarget)close()},children:
   u.jsx('div',{ref:dlg,role:'dialog','aria-modal':'true','aria-labelledby':'xen-hw-title',style:S.dlg,'data-xen-hw-dialog':'true',children:u.jsx(__XenHwKeyboardSettings,{onClose:close})})}),document.body)]});
}
