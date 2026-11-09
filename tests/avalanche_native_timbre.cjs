'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function fn(s,name){const i=s.indexOf('function '+name+'(');assert(i>=0,name);let end=s.indexOf('\nfunction ',i+12);return s.slice(i,end<0?s.length:end);}
const runtime=read('src/audio/05_live_voice_runtime.js'),app=read('src/01_app_runtime.js'),parent=read('tests/fixtures/wave39_M2_encoder.js');
const gradients=read('src/runtime/instrument/01_voice_gradients_and_effects.js').split('const iZ=')[0];
const encoder=app.slice(app.indexOf('class __wave39Encoder'),app.indexOf('function __wave39Submit'));
function setup(code){
 let captured;const ctx={currentTime:0,sampleRate:48000},destination={},host={waveMainDestination:destination,resolveAuxRouteMask:()=>0,node:{connect(){}}};
 const box={__wave39GradientCache:[],console,Float32Array,Float64Array,Uint32Array,Math,vr:1000,Me:(x,a,b)=>Math.min(b,Math.max(a,x)),os:(a,b,x)=>a+(b-a)*x,ry:x=>{const t=Math.min(1,Math.max(0,x));return t*t*(3-2*t)},Jp:()=>true,K3:.005,
 __wave39Owned:()=>true,__XenAvalanche:{route:(c,n,d)=>d,lane:()=>null,targets:(c,n,t)=>t},
 __wave39Reserve:()=>({host,route:box.route,frame:0,token:1,epoch:1}),
 __wave39Submit:(reservation,release,held,context,active,ticket,session,rebuild)=>{captured={record:new Uint32Array(box.route.waveEncoder.u32),rebuild};return true;}};
 code=code.replace('catch(error){reservation.host.cancelUnsubmitted(reservation.token);if(ticket)release();return false;}','catch(error){throw error;}');
 vm.createContext(box);vm.runInContext(gradients+'\n'+encoder+'\n'+fn(runtime,'HW')+'\n'+fn(runtime,'lAe')+'\n'+code+'\nglobalThis.E=__wave39Encoder;',box);box.route={waveEncoder:new box.E()};
 const e={ctx,holdSession:{gradientEnabled:true,gradientMode:'sitar_rise'},duration:.23,gain:.14,resonance:1.3,cutoffHz:2100,toneFreq:217.37,waveform:'triangle',wavePlan:{},prominence:1,waveTargets:[],mainOutput:destination,heldLong:false,activeScheduledTonesRef:{current:[]},transientRuntime:{pickTargets:t=>t,admitVoice:()=>({plan:{gainScale:1,envelopeScale:1}}),releaseVoice(){}}};
 return {box,e,run(x){box.e={...e,waveGradient:box.oZ(x,true,'sitar_rise')};vm.runInContext('__wave39PlayTone(e,HW({waveGradient:e.waveGradient,duration:e.duration,gain:e.gain,resonance:e.resonance,cutoffHz:e.cutoffHz}),0)',box);return captured;}};
}
const original=setup(fn(parent,'__wave39PlayTone')),current=setup(fn(app,'__wave39FillTone')+'\n'+fn(app,'__wave39PlayTone'));
const first=current.run(250);assert.equal(typeof first.rebuild,'function');
for(const x of [0,250,500,750,1000]){const expected=original.run(x).record,actual=first.rebuild(x);assert.deepEqual(actual,expected,'original complete tone encoder parity at '+x);}
assert.notDeepEqual(first.rebuild(0),first.rebuild(1000),'timbre changes native DSP parameters');
console.log('PASS resident recipe matches original direct Wave39 encoder at five actual gradient positions, exact pitch/routing/envelope');

module.exports={records:[first.rebuild(0),first.rebuild(1000)]};
