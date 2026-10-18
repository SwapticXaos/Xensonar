'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const s=fs.readFileSync('src/runtime/instrument/10_entrophon_and_voice_control.js','utf8');
const backend=fs.readFileSync('src/audio/entrophon/02_worklet_and_voice_backend.js','utf8');
const original={enabled:false,engineAmount:1,unison:3,detune:0,unisonSpread:0,colorAmount:.8,volume:1,filterKeytrack:0,filterFreqBase:1800,filterResonance:1,filterEnvAmount:.5,distortion:0,foldAmount:0,colorSet:'default',filterType:'lowpass'};
function prepared(x){return {unison:Array.from({length:x.unison},()=>1),colorRatios:[.5,1.5,2],colorGains:[.2,.14,.1].map(n=>x.enabled?n*x.engineAmount*x.colorAmount:0)};}
const f=new Function('uT','Ew','__entPreparedConfig','Yie','Wn','fI','Wie',s.slice(s.indexOf('const Jie=220;'),s.indexOf('const Fb='))+';return dT;')(
 ()=>original,()=>({...original}),prepared,e=>e.freq,(v,a,b)=>Math.max(a,Math.min(b,v)),(a,b,t)=>a+(b-a)*t,{});
const disabled=f({surface:'wave',freq:220});assert(disabled.colorGains.every(x=>x===0));
const forced=f({surface:'wave',freq:220,forceEnabled:true});
assert(forced.colorGains.some(x=>x>0),'explicit Entrophon Keyboard must not lose the color oscillators because Wave Starter chose Legacy');
assert.equal(forced.gainScale,1.16,'keyboard Entrophon must use the complete enabled body, not the 0.82 disabled attenuation');
assert.equal(original.enabled,false,'do not mutate globally disabled Wave state');
assert(backend.includes('forceEnabled:entrophonActive')||backend.includes('forceEnabled:true'),'Entrophon renderer must request the full active body from the body builder');
console.log('PASS explicit keyboard Entrophon retains its complete body with global Wave Entrophon disabled');
