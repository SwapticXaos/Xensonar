'use strict';
// HWKB-01 unit test: parser, key -> position, settings, device report, key events (simulated browser, no hardware).
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.resolve(__dirname,'../src/post-oct/037-xen-hardware-keyboard.js'),'utf8');
function make(opts={}){
 const store=opts.store||{},events=[];
 class KeyboardEvent{constructor(type,init){this.type=type;Object.assign(this,init)}}
 const win={dispatchEvent(ev){events.push(ev);return true},addEventListener(t,f){(win.on[t]=win.on[t]||[]).push(f)},removeEventListener(t,f){win.on[t]=(win.on[t]||[]).filter(x=>x!==f)},on:{}};
 const nav=opts.nav||{userAgent:'TestBrowser/1.0'};
 const box={window:win,navigator:nav,KeyboardEvent,localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v}},setTimeout:(f)=>{f();return 0},clearTimeout(){},P:{useState(){},useSyncExternalStore(){}},u:{}};
 vm.createContext(box);
 const api=vm.runInContext(src+'\n;({HW:__XenHwKeyboard,explain:__xenHwExplain})',box);return{HW:api.HW,explain:api.explain,events,store,nav,win};
}
const {HW,events,store}=make();
// ---- parser ----
const P=b=>JSON.parse(JSON.stringify(HW.parse(b)));
assert.deepEqual(P([0x90,60,100]),{kind:'noteOn',ch:1,a:60,b:100});
assert.deepEqual(P([0x91,60,0]),{kind:'noteOff',ch:2,a:60,b:0},'Note On with velocity 0 is a Note Off');
assert.deepEqual(P([0x80,60,40]),{kind:'noteOff',ch:1,a:60,b:40});
assert.deepEqual(P([0xB0,64,127]),{kind:'cc',ch:1,a:64,b:127});
assert.equal(P([0xE0,0,64]).a,8192,'pitch bend centre = 8192 (14 bit)');assert.equal(P([0xE0,127,127]).a,16383);
assert.equal(P([0xF8]).kind,'realtime');assert.equal(P([0xFE]).kind,'realtime');assert.equal(P([0xF0,1,2]).kind,'system');
assert.equal(P([0xD0,50]).kind,'aftertouch');assert.equal(P([0xC0,5]).kind,'pc');assert.deepEqual(P([0xD3,50]),{kind:'aftertouch',ch:4,a:-1,b:50},'channel pressure has one data byte');assert.equal(HW.parse([]),null);assert.equal(HW.parse(null),null);
// ---- key -> position ----
assert.equal(HW.positionOf(48,{root:48,offset:0}),0);assert.equal(HW.positionOf(60,{root:48,offset:0}),12);assert.equal(HW.positionOf(47,{root:48,offset:0}),-1);
assert.equal(HW.positionOf(48,{root:48,offset:3}),3,'offset shifts by whole positions');
// ---- defaults: off, nothing sent ----
assert.equal(HW.snapshot().enabled,false);assert.equal(events.length,0);
// ---- notes become keydown / keyup with a position, key identity = code ----
HW._message([0x90,48,90]);assert.equal(events.length,1);assert.equal(events[0].type,'keydown');assert.equal(events[0].code,'XenHw1_48');assert.equal(events[0].__xenHwPos,0);assert.equal(events[0].key,'Unidentified');
HW._message([0x90,75,90]);assert.equal(events[1].__xenHwPos,27,'positions go beyond 20 / 32: as many keys as the device has');
HW._message([0x80,48,0]);assert.equal(events[2].type,'keyup');assert.equal(events[2].code,'XenHw1_48');
HW._message([0x90,75,0]);assert.equal(events[3].type,'keyup','velocity-0 Note On releases');
HW._message([0x90,47,90]);assert.equal(events.length,4,'a key below the first position is ignored, never played as another note');
// retrigger of a held key: release then press again
HW._message([0x90,50,90]);HW._message([0x90,50,90]);assert.deepEqual(events.slice(4).map(e=>e.type),['keydown','keyup','keydown']);HW._message([0x80,50,0]);
// ---- channel filter ----
events.length=0;HW.setConfig({channel:2});HW._message([0x90,48,90]);assert.equal(events.length,0,'channel 1 is filtered when channel 2 is chosen');HW._message([0x91,48,90]);assert.equal(events.length,1);HW._message([0x81,48,0]);HW.setConfig({channel:0});
// ---- a setting changed while a key is held cannot leave a stuck note: the release uses the key remembered at press time ----
events.length=0;HW._message([0x90,52,90]);HW.setConfig({offset:2});HW._message([0x80,52,0]);assert.deepEqual(events.map(e=>e.type+':'+e.code),['keydown:XenHw1_52','keyup:XenHw1_52']);
// a device or channel change releases everything held
events.length=0;HW._message([0x90,53,90]);HW.setConfig({channel:3});assert.equal(events.at(-1).type,'keyup');HW.setConfig({channel:0});
// ---- presets, learn ----
HW.setConfig({offset:0});HW.applyPreset('c2');assert.equal(HW.snapshot().cfg.root,36);assert.equal(HW.snapshot().cfg.preset,'c2');
events.length=0;HW.learn(true);HW._message([0x90,64,90]);assert.equal(events.length,0,'the learn key is not played');assert.equal(HW.snapshot().cfg.root,64);assert.equal(HW.snapshot().cfg.preset,'custom');
HW._message([0x90,65,90]);assert.equal(events[0].__xenHwPos,1);HW._message([0x80,65,0]);
// ---- settings persist in their own key and are sanitised ----
{const st=JSON.parse(store['xensonar.hwkeyboard.v1']);assert.deepEqual({deviceId:st.deviceId,channel:st.channel,root:st.root,offset:st.offset,preset:st.preset},{deviceId:'',channel:0,root:64,offset:0,preset:'custom'});assert.equal(st.layout,'linear');assert.equal(st.profiles['*'].root,64,'the settings are also kept as the profile of "all devices"')}
// an HWKB-01 record (no velocity, layout or controls) loads unchanged and gets the defaults
{const m=make({store:{'xensonar.hwkeyboard.v1':JSON.stringify({deviceId:'',channel:3,root:36,offset:2,preset:'c2'})}});const c=m.HW.snapshot().cfg;assert.deepEqual([c.channel,c.root,c.offset,c.preset,c.layout,c.vel.curve,c.assigns.length,c.assigns[0].num],[3,36,2,'c2','linear','linear',1,64])}
{const m=make({store:{'xensonar.hwkeyboard.v1':JSON.stringify({root:9999,offset:-5000,channel:'x',deviceId:{a:1},preset:7})}});const c=m.HW.snapshot().cfg;assert.equal(c.root,127);assert.equal(c.offset,-512);assert.equal(c.channel,0);assert.equal(c.deviceId,'');}
{const m=make({store:{'xensonar.hwkeyboard.v1':'{not json'}});assert.equal(m.HW.snapshot().cfg.root,48,'broken storage falls back to the defaults');}
// ---- unsupported browser: enable() says so and changes nothing ----
{const m=make({nav:{userAgent:'Safari'}});m.HW.enable();assert.equal(m.HW.snapshot().status,'unsupported');assert.equal(m.HW.snapshot().enabled,false);}
// ---- denied permission vs a system MIDI service that cannot start (different causes, different advice) ----
(async()=>{
 const err=(name,msg)=>{const e=new Error(msg);e.name=name;return e};
 const m=make({nav:{userAgent:'X',requestMIDIAccess:()=>Promise.reject(err('NotAllowedError','Permission to use Web MIDI API was not granted.'))}});m.HW.enable();await new Promise(r=>setTimeout(r,5));
 assert.equal(m.HW.snapshot().status,'denied');assert.equal(m.HW.snapshot().enabled,false);assert(/did not give permission/.test(m.explain(m.HW.snapshot())));
 assert.equal(m.HW.kindOfError(err('SecurityError','blocked')),'denied');
 const f=make({nav:{userAgent:'Mozilla/5.0 (X11; Linux x86_64) Chrome/130',platform:'Linux x86_64',requestMIDIAccess:()=>Promise.reject(err('InvalidStateError','Platform dependent initialization failed.'))}});f.HW.enable();await new Promise(r=>setTimeout(r,5));
 assert.equal(f.HW.snapshot().status,'failed','the browser said yes but the system service failed: not "denied"');assert.equal(f.HW.snapshot().enabled,false);
 const ex=f.explain(f.HW.snapshot());assert(/system MIDI service could not start/.test(ex)&&/Platform dependent initialization failed/.test(ex)&&/snd-seq/.test(ex),'Linux advice: '+ex);
 assert.equal(f.HW.kindOfError(err('NotAllowedError','Platform dependent initialization failed.')),'failed','a platform message wins even under a permission-like name');
 const fr=f.HW.report();assert(/InvalidStateError: Platform dependent initialization failed/.test(fr)&&/secure context/.test(fr),'the report carries the error and the page facts\n'+fr);
 const w=make({nav:{userAgent:'Mozilla/5.0 (Windows) Chrome/130',requestMIDIAccess:()=>Promise.reject(err('InvalidStateError','Platform dependent initialization failed.'))}});w.HW.enable();await new Promise(r=>setTimeout(r,5));assert(!/snd-seq/.test(w.explain(w.HW.snapshot())),'no Linux advice off Linux');
 // 'not available': typical causes by category (no browser-specific branches); a local or insecure page is named when that is the case
 const ins=make({nav:{userAgent:'SomeBrowser/9'}});ins.win.isSecureContext=false;ins.HW.enable();assert.equal(ins.HW.snapshot().status,'unsupported');
 const ei=ins.explain(ins.HW.snapshot());assert(/not offered here/.test(ei)&&/not secure/.test(ei)&&/browser setting or policy/.test(ei),'insecure page: '+ei);
 const loc=make({nav:{userAgent:'SomeBrowser/9'}});loc.HW.enable();const el=loc.explain({...loc.HW.snapshot(),env:{...loc.HW.snapshot().env,proto:'file:'}});assert(/local file/.test(el)&&/\(this one: file:\)/.test(el),'local file named: '+el);
 for(const ua of ['Mozilla/5.0 Firefox/158.0','Mozilla/5.0 Chrome/130','Mozilla/5.0 Safari/605'])assert.equal(make({nav:{userAgent:ua}}).explain({status:'unsupported',env:{ua}}).includes('Firefox 158'),false,'no per-browser branches');
 const ff=make({nav:{userAgent:'Any/1',requestMIDIAccess:()=>new Promise(()=>{})}});ff.HW.enable();assert.equal(ff.HW.snapshot().status,'asking');assert(/permission prompt|add-on/.test(ff.explain(ff.HW.snapshot())),'asking: a prompt may appear');
 const input={id:'a',name:'Mini 25',manufacturer:'Acme',state:'connected',onmidimessage:null};const access={inputs:new Map([['a',input]]),onstatechange:null};
 const k=make({nav:{userAgent:'Chrome/130',requestMIDIAccess:async()=>access}});k.HW.enable();await new Promise(r=>setTimeout(r,5));
 assert.equal(k.HW.snapshot().status,'ready');assert.equal(typeof input.onmidimessage,'function');
 input.onmidimessage({data:new Uint8Array([0x90,48,100])});assert.equal(k.events.at(-1).type,'keydown');
 input.state='disconnected';access.onstatechange();assert.equal(k.events.at(-1).type,'keyup','unplugging releases the held key');
 input.state='connected';access.onstatechange();input.onmidimessage({data:new Uint8Array([0xB0,64,127])});input.onmidimessage({data:new Uint8Array([0xF8])});
 const rep=k.HW.report();for(const s of ['Chrome/130','Acme Mini 25','note on 1 (velocity 100..100)','CC64×1','Messages: 3'])assert(rep.includes(s),'report contains '+s+'\n'+rep);
 assert(!/sessions?|token|user/i.test(rep.replace('userAgent','')),'the report carries no personal data');
 k.HW.disable();assert.equal(input.onmidimessage,null,'switching off detaches the device');assert.equal(k.HW.snapshot().status,'off');
 await stage2();
 console.log('PASS HWKB-01/02 core: velocity curves, layouts (linear / channel blocks / MPE), controls → keys, running status and packed messages, profiles per device, parser, key→position, channel, learn, presets, persistence, errors, report, device unplug');
})().catch(e=>{console.error(e);process.exit(1)});

// ================= HWKB-02 =================
async function stage2(){
 const near=(a,b,t,m)=>assert(Math.abs(a-b)<=t,m+': '+a+' vs '+b);
 // ---- velocity → level ----
 {const {HW}=make();const V=(v,c)=>HW.levelOf(v,{curve:'linear',min:1,max:127,floor:.15,top:1,...c});
  near(V(127),1,1e-12,'hardest = top');near(V(1),.15,1e-12,'softest = floor');near(V(64),.15+.85*.5,1e-9,'linear middle');
  assert(V(64,{curve:'soft'})>V(64)&&V(64,{curve:'hard'})<V(64),'soft is louder and hard is quieter in the middle');near(V(64,{curve:'hard'}),.15+.85*.25,1e-9,'hard = square');
  near(V(5,{curve:'fixed',top:.8}),.8,1e-12,'fixed: every key the same (keyboards without velocity)');near(V(127,{curve:'fixed',top:.8}),.8,1e-12,'fixed');
  near(V(40,{min:40,max:100}),.15,1e-12,'the played range of this keyboard is the whole range');near(V(100,{min:40,max:100}),1,1e-12,'range top');near(V(20,{min:40,max:100}),.15,1e-12,'below the range');
  for(let v=1;v<127;v++)for(const curve of ['linear','soft','hard'])assert(V(v+1,{curve})>=V(v,{curve}),'monotonic');
  near(V(127,{top:1.4}),1.4,1e-12,'loudest level up to 1.5');
  // the level belongs to the key id and is 1 for computer keys
  assert.equal(HW.gainFor('KeyQ'),1);assert.equal(HW.gainFor(undefined),1);
  HW._message([0x90,48,127]);near(HW.gainFor('XenHw1_48'),1,1e-12,'hard key');HW._message([0x80,48,0]);HW._message([0x90,48,1]);near(HW.gainFor('XenHw1_48'),.15,1e-12,'soft key');near(HW.gainFor('XenHw1_48'),.15,1e-12,'still known after release');HW._message([0x80,48,0]);
  // calibrate from what was played
  HW._reset();assert.equal(HW.usePlayedRange(),false,'nothing played yet');HW._message([0x90,50,30]);HW._message([0x80,50,0]);HW._message([0x90,50,110]);HW._message([0x80,50,0]);assert.equal(HW.usePlayedRange(),true);
  assert.deepEqual([HW.snapshot().cfg.vel.min,HW.snapshot().cfg.vel.max],[30,110]);near(HW.levelOf(30),.15,1e-12,'calibrated soft');near(HW.levelOf(110),1,1e-12,'calibrated hard');
  HW.setConfig({vel:{curve:'bogus',min:500,max:-3,floor:9,top:99}});const v=HW.snapshot().cfg.vel;assert.deepEqual([v.curve,v.min<v.max,v.floor,v.top],['linear',true,1,1.5],'velocity settings are sanitised')}
 // ---- layouts ----
 {const {HW,events}=make();
  // blocks: Lumatone-like, 56 keys per board on channels 1..5
  HW.setConfig({layout:'blocks',blockSize:56,blockFirstNote:0,blockFirstChannel:1});
  assert.equal(HW.positionOf(0,HW.snapshot().cfg,1),0);assert.equal(HW.positionOf(55,HW.snapshot().cfg,1),55);assert.equal(HW.positionOf(0,HW.snapshot().cfg,2),56,'the next board continues the row');assert.equal(HW.positionOf(10,HW.snapshot().cfg,5),234);
  HW._message([0x91,3,90]);assert.equal(events.at(-1).__xenHwPos,59);assert.equal(events.at(-1).code,'XenHw2_3');HW._message([0x81,3,0]);assert.equal(events.at(-1).type,'keyup');
  // one channel per period of 31 steps, first channel 3
  HW.setConfig({blockSize:31,blockFirstChannel:3,blockFirstNote:60});assert.equal(HW.positionOf(60,HW.snapshot().cfg,3),0);assert.equal(HW.positionOf(60,HW.snapshot().cfg,4),31);assert.equal(HW.positionOf(60,HW.snapshot().cfg,2),-31,'below the first channel: ignored');
  // learn in blocks sets first key AND first channel
  HW.learn(true);HW._message([0x94,12,80]);assert.deepEqual([HW.snapshot().cfg.blockFirstNote,HW.snapshot().cfg.blockFirstChannel],[12,5]);
  // the channel filter belongs to the one-row layout only
  HW.setConfig({layout:'mpe',channel:2,root:48});events.length=0;HW._message([0x95,50,90]);HW._message([0x99,50,90]);assert.deepEqual(events.map(e=>e.__xenHwPos+':'+e.code),['2:XenHw6_50','2:XenHw10_50'],'MPE: every channel plays, the same key on two channels is two keys');
  HW._message([0x85,50,0]);assert.equal(events.at(-1).code,'XenHw6_50','… and each is released on its own');HW._message([0x89,50,0]);
  HW.setConfig({layout:'nonsense'});assert.equal(HW.snapshot().cfg.layout,'linear')}
 // ---- controls press XenSonar keys ----
 {const {HW,events}=make();const ev=()=>events.map(e=>e.type+':'+e.code);
  HW._message([0xB0,64,127]);HW._message([0xB0,64,100]);HW._message([0xB0,64,0]);assert.deepEqual(ev(),['keydown:Equal','keyup:Equal'],'the sustain pedal (CC64) holds the Sustain key: once down, once up');assert.equal(events[0].__xenHwPos,undefined,'a control is not a note');
  events.length=0;HW._message([0xB0,64,63]);HW._message([0xB0,64,64]);assert.deepEqual(ev(),['keydown:Equal'],'on at 64 (half-pedal devices send every value)');
  HW._message([0xB0,123,0]);assert.deepEqual(ev(),['keydown:Equal','keyup:Equal'],'All Notes Off releases keys and controls');
  // learn a controller, give it an action
  events.length=0;HW.learn('control');assert.equal(HW.snapshot().learning,'control');HW._message([0xB0,1,90]);assert.equal(events.length,0,'the learned move is not played');assert.deepEqual({...HW.snapshot().lastControl},{src:'cc',num:1,ch:1});
  const swell=HW.ACTIONS.find(a=>a.id==='swell');assert.equal(HW.addAssign({...HW.snapshot().lastControl,ch:0},{code:swell.code,key:swell.key,label:swell.label}),true);
  HW._message([0xB3,1,127]);HW._message([0xB3,1,0]);assert.deepEqual(ev(),['keydown:KeyB','keyup:KeyB'],'mod wheel → Swell (B), any channel');
  // a pad (key) as a control is not played as a note; a program button taps
  const down=HW.ACTIONS.find(a=>a.id==='winDown');HW.addAssign({src:'note',num:36,ch:10},{code:down.code,key:down.key,label:down.label});HW.addAssign({src:'pc',num:5,ch:0},{code:'KeyM',key:'m',label:'my key'});
  events.length=0;HW._message([0x99,36,100]);HW._message([0x89,36,0]);assert.deepEqual(ev(),['keydown:BracketLeft','keyup:BracketLeft'],'pad → window down');assert.equal(events[0].__xenHwPos,undefined);
  HW.setConfig({root:36});HW._message([0x90,36,100]);assert.equal(events.at(-1).code,'XenHw1_36','the same key number on another channel is still a note');HW._message([0x80,36,0]);
  events.length=0;HW._message([0xC0,5]);assert.deepEqual(ev(),['keydown:KeyM','keyup:KeyM'],'program button taps the key');assert.equal(events[0].key,'m');
  const n=HW.snapshot().cfg.assigns.length;HW.removeAssign(0);assert.equal(HW.snapshot().cfg.assigns.length,n-1);
  assert.equal(HW.addAssign({src:'sysex',num:1},{code:'KeyA'}),false,'unknown control kinds are refused');
  assert(/controller CC1/.test(HW.describe({src:'cc',num:1,ch:0}))&&/program button 5/.test(HW.describe({src:'pc',num:5}))&&/key \/ pad C2 \(36\) on channel 10/.test(HW.describe({src:'note',num:36,ch:10})))}
 // ---- what drivers really deliver: several messages in one packet, running status, realtime bytes in between ----
 {const {HW,events}=make();const port={rs:0},S=(b,p)=>JSON.parse(JSON.stringify(HW.split(b,p)));
  assert.deepEqual(S([0x90,60,100,0x90,64,90,0x80,60,0],port),[[0x90,60,100],[0x90,64,90],[0x80,60,0]],'three messages in one packet');
  assert.deepEqual(S([0x90,60,100,62,90,64,0],{rs:0}),[[0x90,60,100],[0x90,62,90],[0x90,64,0]],'running status');
  const p2={rs:0};S([0x90,60,100],p2);assert.deepEqual(S([62,90],p2),[[0x90,62,90]],'running status across packets');
  assert.deepEqual(S([0x90,60,0xF8,100],{rs:0}),[[0xF8],[0x90,60,100]],'a clock byte inside a message');
  assert.deepEqual(S([0xF0,1,2,3,0xF7,0x90,60,1],{rs:0}),[[0xF0],[0x90,60,1]],'a system exclusive block is skipped');
  assert.deepEqual(S([0xC0,5,0xD0,7,0xE0,0,64],{rs:0}),[[0xC0,5],[0xD0,7],[0xE0,0,64]],'one-byte messages');
  assert.deepEqual(S([60,100],{rs:0}),[],'data without a status is dropped');assert.deepEqual(S([0x90,60],{rs:0}),[],'an incomplete message is dropped');assert.deepEqual(S(null,{rs:0}),[]);
  HW._message([0x90,48,100,50,100,48,0,50,0]);assert.deepEqual(events.map(e=>e.type+':'+e.code),['keydown:XenHw1_48','keydown:XenHw1_50','keyup:XenHw1_48','keyup:XenHw1_50'],'a packed running-status phrase plays');
  events.length=0;for(let i=0;i<50;i++)HW._message([0xE0,i,64]);HW._message([0xA0,60,90]);HW._message([0xFE]);assert.equal(events.length,0,'pitch bend, aftertouch and active sensing never play or move anything');}
 // ---- one profile per device ----
 {const a={id:'x1',name:'Big 88',manufacturer:'Acme',state:'connected',onmidimessage:null},b={id:'x2',name:'Hex',manufacturer:'Luma',state:'connected',onmidimessage:null},access={inputs:new Map([['x1',a],['x2',b]]),onstatechange:null};
  const k=make({nav:{userAgent:'Chrome/130',requestMIDIAccess:async()=>access}});k.HW.enable();await new Promise(r=>setTimeout(r,5));
  k.HW.setConfig({deviceId:'x1'});k.HW.setConfig({root:21,vel:{...k.HW.snapshot().cfg.vel,curve:'hard'}});
  k.HW.setConfig({deviceId:'x2'});k.HW.setConfig({layout:'blocks',blockSize:56});
  k.HW.setConfig({deviceId:'x1'});let c=k.HW.snapshot().cfg;assert.deepEqual([c.root,c.vel.curve,c.layout],[21,'hard','linear'],'the first keyboard has its own settings back');
  k.HW.setConfig({deviceId:'x2'});c=k.HW.snapshot().cfg;assert.deepEqual([c.layout,c.blockSize],['blocks',56],'… and the second one too');
  const again=make({store:k.store,nav:{userAgent:'Chrome/130',requestMIDIAccess:async()=>access}});assert.equal(again.HW.snapshot().cfg.layout,'blocks','kept across a reload');
  // only the chosen device is listened to; the window losing focus releases what is held
  assert.equal(a.onmidimessage,null);b.onmidimessage({data:new Uint8Array([0x90,5,100])});assert.equal(k.events.at(-1).type,'keydown');(k.win.on.blur||[]).forEach(f=>f());assert.equal(k.events.at(-1).type,'keyup','a window that loses the focus leaves no hanging note');
  const rep=k.HW.report();for(const s of ['stage 2','layout blocks (56 keys per channel','Velocity: curve','Controls: controller CC64','Channels seen: 1×'])assert(rep.includes(s),'report contains '+s+'\n'+rep)}
}
