'use strict';
// HWKB-01 unit test: parser, key -> position, settings, device report, key events (simulated browser, no hardware).
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.resolve(__dirname,'../src/post-oct/037-xen-hardware-keyboard.js'),'utf8');
function make(opts={}){
 const store=opts.store||{},events=[];
 class KeyboardEvent{constructor(type,init){this.type=type;Object.assign(this,init)}}
 const win={dispatchEvent(ev){events.push(ev);return true}};
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
assert.equal(P([0xD0,50]).kind,'aftertouch');assert.equal(P([0xC0,5]).kind,'other');assert.equal(HW.parse([]),null);assert.equal(HW.parse(null),null);
// ---- key -> position ----
assert.equal(HW.positionOf(48,{root:48,offset:0}),0);assert.equal(HW.positionOf(60,{root:48,offset:0}),12);assert.equal(HW.positionOf(47,{root:48,offset:0}),-1);
assert.equal(HW.positionOf(48,{root:48,offset:3}),3,'offset shifts by whole positions');
// ---- defaults: off, nothing sent ----
assert.equal(HW.snapshot().enabled,false);assert.equal(events.length,0);
// ---- notes become keydown / keyup with a position, key identity = code ----
HW._message([0x90,48,90]);assert.equal(events.length,1);assert.equal(events[0].type,'keydown');assert.equal(events[0].code,'XenHw48');assert.equal(events[0].__xenHwPos,0);assert.equal(events[0].key,'Unidentified');
HW._message([0x90,75,90]);assert.equal(events[1].__xenHwPos,27,'positions go beyond 20 / 32: as many keys as the device has');
HW._message([0x80,48,0]);assert.equal(events[2].type,'keyup');assert.equal(events[2].code,'XenHw48');
HW._message([0x90,75,0]);assert.equal(events[3].type,'keyup','velocity-0 Note On releases');
HW._message([0x90,47,90]);assert.equal(events.length,4,'a key below the first position is ignored, never played as another note');
// retrigger of a held key: release then press again
HW._message([0x90,50,90]);HW._message([0x90,50,90]);assert.deepEqual(events.slice(4).map(e=>e.type),['keydown','keyup','keydown']);HW._message([0x80,50,0]);
// ---- channel filter ----
events.length=0;HW.setConfig({channel:2});HW._message([0x90,48,90]);assert.equal(events.length,0,'channel 1 is filtered when channel 2 is chosen');HW._message([0x91,48,90]);assert.equal(events.length,1);HW._message([0x81,48,0]);HW.setConfig({channel:0});
// ---- a setting changed while a key is held cannot leave a stuck note: the release uses the key remembered at press time ----
events.length=0;HW._message([0x90,52,90]);HW.setConfig({offset:2});HW._message([0x80,52,0]);assert.deepEqual(events.map(e=>e.type+':'+e.code),['keydown:XenHw52','keyup:XenHw52']);
// a device or channel change releases everything held
events.length=0;HW._message([0x90,53,90]);HW.setConfig({channel:3});assert.equal(events.at(-1).type,'keyup');HW.setConfig({channel:0});
// ---- presets, learn ----
HW.setConfig({offset:0});HW.applyPreset('c2');assert.equal(HW.snapshot().cfg.root,36);assert.equal(HW.snapshot().cfg.preset,'c2');
events.length=0;HW.learn(true);HW._message([0x90,64,90]);assert.equal(events.length,0,'the learn key is not played');assert.equal(HW.snapshot().cfg.root,64);assert.equal(HW.snapshot().cfg.preset,'custom');
HW._message([0x90,65,90]);assert.equal(events[0].__xenHwPos,1);HW._message([0x80,65,0]);
// ---- settings persist in their own key and are sanitised ----
assert.deepEqual(JSON.parse(store['xensonar.hwkeyboard.v1']),{deviceId:'',channel:0,root:64,offset:0,preset:'custom'});
{const m=make({store:{'xensonar.hwkeyboard.v1':JSON.stringify({root:9999,offset:-5000,channel:'x',deviceId:{a:1},preset:7})}});const c=m.HW.snapshot().cfg;assert.equal(c.root,127);assert.equal(c.offset,-64);assert.equal(c.channel,0);assert.equal(c.deviceId,'');}
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
 const ins=make({nav:{userAgent:'Firefox/130'}});ins.win.isSecureContext=false;ins.HW.enable();assert.equal(ins.HW.snapshot().status,'unsupported');assert(/not a secure context/.test(ins.explain(ins.HW.snapshot())),'an insecure page is named as the reason');
 {const o=make({nav:{userAgent:'Mozilla/5.0 (X11; Linux x86_64; rv:102.0) Gecko/20100101 Firefox/102.0'}});o.HW.enable();assert(/version 102.*108 or newer/.test(o.explain(o.HW.snapshot())),'an old Firefox is named');const n=make({nav:{userAgent:'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0'}});n.HW.enable();assert(/Firefox 130.*dom\.webmidi\.enabled/.test(n.explain(n.HW.snapshot())),'a current Firefox without the API: the about:config setting is named')}
 {const f2=make({nav:{userAgent:'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:158.0) Gecko/20100101 Firefox/158.0'}});f2.win.location={protocol:'file:'};f2.HW.enable();
  const e2=f2.explain({...f2.HW.snapshot(),env:{...f2.HW.snapshot().env,proto:'file:'}});assert(/local file \(file:\).*http:\/\/localhost/.test(e2)&&/Firefox 158/.test(e2),'Firefox on a local file: the likely reason is named\n'+e2)}
 const ff=make({nav:{userAgent:'Mozilla/5.0 Firefox/130.0',requestMIDIAccess:()=>new Promise(()=>{})}});ff.HW.enable();assert.equal(ff.HW.snapshot().status,'asking');assert(/add-on/.test(ff.explain(ff.HW.snapshot())),'Firefox: the add-on prompt is announced');
 // ---- device attach / detach, running with a simulated device ----
 const input={id:'a',name:'Mini 25',manufacturer:'Acme',state:'connected',onmidimessage:null};const access={inputs:new Map([['a',input]]),onstatechange:null};
 const k=make({nav:{userAgent:'Chrome/130',requestMIDIAccess:async()=>access}});k.HW.enable();await new Promise(r=>setTimeout(r,5));
 assert.equal(k.HW.snapshot().status,'ready');assert.equal(typeof input.onmidimessage,'function');
 input.onmidimessage({data:new Uint8Array([0x90,48,100])});assert.equal(k.events.at(-1).type,'keydown');
 input.state='disconnected';access.onstatechange();assert.equal(k.events.at(-1).type,'keyup','unplugging releases the held key');
 input.state='connected';access.onstatechange();input.onmidimessage({data:new Uint8Array([0xB0,64,127])});input.onmidimessage({data:new Uint8Array([0xF8])});
 const rep=k.HW.report();for(const s of ['Chrome/130','Acme Mini 25','note on 1 (velocity 100..100)','CC64×1','Messages: 3'])assert(rep.includes(s),'report contains '+s+'\n'+rep);
 assert(!/sessions?|token|user/i.test(rep.replace('userAgent','')),'the report carries no personal data');
 k.HW.disable();assert.equal(input.onmidimessage,null,'switching off detaches the device');assert.equal(k.HW.snapshot().status,'off');
 console.log('PASS HWKB-01 core: parser, key→position, channel, learn, presets, persistence, errors, report, device unplug');
})().catch(e=>{console.error(e);process.exit(1)});
