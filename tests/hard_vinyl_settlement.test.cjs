'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const source=fs.readFileSync(path.join(__dirname,'../src/mix/03_quick_menu__before_eq-core.js'),'utf8');
function block(name){const start=source.indexOf('const '+name+'=');return source.slice(start,source.indexOf('})();',start)+5);}
function setup(){
 const c={console,setTimeout,clearTimeout,__XenNudgeFeedback:{endPreview(){},preview(){}}};vm.createContext(c);vm.runInContext(block('__XenMaterialVoiceMix')+';globalThis.mix=__XenMaterialVoiceMix;',c);
 const code=JSON.parse(source.slice(source.indexOf(' const code=',source.indexOf('const __XenMaterialPhase='))+12).split(';\n')[0]);
 const messages=[],w={sampleRate:48000,currentFrame:0,AudioWorkletProcessor:class{constructor(){this.port={postMessage:m=>messages.push(m)}}},registerProcessor:(name,Processor)=>{w.Processor=Processor}};
 vm.createContext(w);vm.runInContext(code,w);const processor=new w.Processor();
 const send=m=>processor.port.onmessage({data:m});
 send({type:'load',channels:[new Float32Array(48000)],sampleRate:48000});
 send({type:'start',loopStart:0,loopEnd:1,offset:0,baseRate:1,bpm:120,mode:'vinyl',feel:'hard',attack:0,when:0});
 return {mix:c.mix,processor,send,messages,w};
}
test('hard Vinyl release commits the reached PCM phase without retargeting or changing attApplied',async()=>{
 const {mix,processor,send,messages,w}=setup();let resolve,targets=0;
 const owner={target(a,interaction){targets++;send({type:'target',attack:a,interaction})},mode(){},feel(){},beginGesture(){send({type:'gesture-begin',interaction:'drag'})},endGesture(){send({type:'gesture-end',interaction:'drag',token:17});return new Promise(r=>resolve=r)}};
 mix.setMode('m','vinyl');mix.setFeel('m','hard');mix.registerTransport('m',owner);mix.beginGesture('m','drag');mix.set('m','att',1,'drag');
 processor.process([],[[new Float32Array(128)]]);w.currentFrame+=128;
 const reached=-processor.motion.phase,position=processor.position;assert.ok(reached>0&&reached<1);
 mix.endGesture('m','drag');assert.equal(mix.isSettling(),true);
 const ack=messages.find(m=>m.type==='gesture-settled');assert.equal(ack.token,17);assert.equal(ack.attack,reached);
 resolve(ack.attack);await flush();assert.equal(mix.get('m').att,reached);assert.equal(mix.get('m').attApplied,0);assert.equal(targets,2);assert.equal(processor.position,position);assert.equal(processor.motion.rate,1);
});
test('a newer gesture or detached transport rejects an old release acknowledgement',async()=>{
 for(const detach of [false,true]){const {mix}=setup();let resolve;const owner={target(){},mode(){},endGesture:()=>new Promise(r=>resolve=r)};
 mix.setMode('m','vinyl');mix.setFeel('m','hard');const off=mix.registerTransport('m',owner);mix.set('m','att',1,'drag');mix.endGesture('m','drag');if(detach)off();else mix.beginGesture('m','drag');resolve(.01);await flush();assert.equal(mix.get('m').att,1);}
});
test('mode, feel, restore, and newer targets invalidate pending reached positions',async()=>{
 for(const change of [m=>m.setMode('m','granular'),m=>m.setFeel('m','soft'),m=>m.restoreSession([{kind:'material',id:'m'}],{m:{att:.5}}),m=>m.set('m','att',.5,'click')]){
  const {mix}=setup();let resolve;mix.setMode('m','vinyl');mix.setFeel('m','hard');mix.registerTransport('m',{target(){},mode(){},feel(){},endGesture:()=>new Promise(r=>resolve=r)});mix.set('m','att',1,'drag');mix.endGesture('m','drag');change(mix);const expected=mix.get('m').att;resolve(.01);await flush();assert.equal(mix.get('m').att,expected);
 }
});
test('capture guard covers active hard Vinyl drags and scopes selected material IDs',()=>{
 const {mix}=setup();mix.setMode('m','vinyl');mix.setFeel('m','hard');mix.beginGesture('m','drag');
 assert.equal(mix.isSettling([{kind:'material',id:'m'}]),true);assert.equal(mix.isSettling([{kind:'material',id:'other'}]),false);mix.endGesture('m','drag');assert.equal(mix.isSettling(),false);
});
test('obsolete unresolved releases immediately stop blocking capture',()=>{
 for(const cancel of [(m,off)=>off(),m=>m.setMode('m','granular'),m=>m.setFeel('m','soft'),m=>m.restoreSession([{kind:'material',id:'m'}]),m=>{m.beginGesture('m','drag');m.setMode('m','granular')}]){
  const {mix}=setup();mix.setMode('m','vinyl');mix.setFeel('m','hard');const off=mix.registerTransport('m',{target(){},mode(){},feel(){},endGesture:()=>new Promise(()=>{})});mix.endGesture('m','drag');assert.equal(mix.isSettling(),true);cancel(mix,off);
  assert.equal(mix.isSettling(),false);
 }
});
test('newest registered transport owns canonical phase independent of ACK order; rejection is handled',async()=>{
 const {mix}=setup();mix.setMode('m','vinyl');mix.setFeel('m','hard');let older,newer;
 mix.registerTransport('m',{target(){},mode(){},endGesture:()=>new Promise(r=>older=r)});
 mix.registerTransport('m',{target(){},mode(){},endGesture:()=>new Promise(r=>newer=r)});
 mix.endGesture('m','drag');newer(.2);await flush();older(.1);await flush();assert.equal(mix.get('m').att,.2);
 mix.registerTransport('m',{target(){},mode(){},endGesture:()=>Promise.reject(Error('closed'))});mix.endGesture('m','drag');await flush();assert.equal(mix.isSettling(),false);assert.equal(mix.get('m').att,.2);
});
test('finite reached phases outside the thumb range survive release, restore, and source offset',async()=>{
 const {mix,processor,send,messages}=setup();const attack=2.001;
 // Restored audio phase can lie outside the interactive thumb range.
 processor.configure('vinyl','hard',attack);let resolve;
 mix.setMode('m','vinyl');mix.setFeel('m','hard');mix.registerTransport('m',{target(){},mode(){},endGesture(){send({type:'gesture-end',interaction:'drag',token:91});return new Promise(r=>resolve=r)}});
 mix.endGesture('m','drag');resolve(messages.find(m=>m.token===91).attack);await flush();assert.equal(mix.get('m').att,attack);
 mix.restoreSession([{kind:'material',id:'m'}],JSON.parse(JSON.stringify(mix.snapshot())));assert.equal(mix.get('m').att,attack);assert.equal(mix.get('m').attApplied,attack);
 send({type:'target',attack,interaction:'restore'});assert.equal(processor.motion.target,-attack);
 const audio=fs.readFileSync(path.join(__dirname,'../src/audio/01_voice_and_rfl_ownership.js'),'utf8');const start=audio.indexOf('function __xenMaterialLoopPhaseSec('),end=audio.indexOf('\nfunction zfe(',start);const offset=new Function(audio.slice(start,end)+';return __xenMaterialLoopPhaseSec')();
 const plan={sourceDurationSec:4,loopStartSec:0,playbackRate:1};assert.equal(offset(plan,attack,120),4-attack*.5);
 send({type:'target',attack:5,interaction:'drag'});assert.equal(processor.motion.target,-2);
});
