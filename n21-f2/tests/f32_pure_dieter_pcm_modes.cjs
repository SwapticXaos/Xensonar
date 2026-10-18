'use strict';
// Real Pure Dieter DSP, using its production o5e renderer with its production
// FFT substitute from the worker. Failing if modes silently collapse to one PCM.
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const assert=require('node:assert/strict');
const c=require('../src/forge/fractalia/01_core.js')();
const source=fs.readFileSync(path.join(__dirname,'../src/app/forge/07_preview_cache_and_controls.js'),'utf8');
const end=source.indexOf('function i5e(');assert(end>0);
const sandbox={performance,console,Math,Float32Array,Float64Array,Promise,setTimeout};
sandbox.hs=(bin,height)=>20*Math.pow(1000,bin/Math.max(1,height-1));
sandbox.mNe=phase=>2*(phase%(2*Math.PI)/(2*Math.PI))-1;
sandbox.lx=phase=>2*Math.abs(2*((phase%(2*Math.PI)+2*Math.PI)%(2*Math.PI)/(2*Math.PI))-1)-1;
vm.createContext(sandbox);vm.runInContext(source.slice(0,end)+'\nglobalThis.Renderer=o5e;',sandbox);
const rate=8000,grid={width:12,height:20,
 get(x,y){return y===8||y===11||y===14? Math.max(.05,1-x/15)*(y===11?1:.5):0},
 getGrain(x,y){return .25+(y%5)*.1}
};
const buffer=(channels,length,sampleRate)=>{const pcm=new Float32Array(length);return {getChannelData:()=>pcm,copyToChannel:p=>pcm.set(p),length,sampleRate}};
const engine=new sandbox.Renderer(()=>({sampleRate:rate,createBuffer:buffer}));
engine.idft=(real,imag,n)=>{const re=Float64Array.from(real),im=Float64Array.from(imag);c.fft(re,im,true);return Float32Array.from(re)};
const wave={sine:1,sawtooth:0,square:0,triangle:0};
const saw={sine:0,sawtooth:1,square:0,triangle:0};
function comparison(a,b){let ss=0,aa=0,bb=0;for(let i=0;i<a.length;i++){const d=a[i]-b[i];ss+=d*d;aa+=a[i]*a[i];bb+=b[i]*b[i]}return Math.sqrt(ss/Math.max(1e-10,(aa+bb)/2))}
(async()=>{
 const sounds={};for(const mode of ['additive','ifft','granular','glyph']){
  const result=await engine.renderToBuffer(grid,mode,wave,null,{durationSec:.35});sounds[mode]=result.getChannelData(0);
  assert(sounds[mode].every(Number.isFinite),mode+' must be finite');assert(sounds[mode].some(v=>Math.abs(v)>.02),mode+' must be audible');
 }
 const difference={};for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){
  const names=Object.keys(sounds),key=names[i]+' / '+names[j];difference[key]=comparison(sounds[names[i]],sounds[names[j]]);
  assert(difference[key]>.08,'same signal: '+key+' ('+difference[key]+')');
 }
 const changed=await engine.renderToBuffer(grid,'additive',saw,null,{durationSec:.35});
 const waveDifference=comparison(sounds.additive,changed.getChannelData(0));
 assert(waveDifference>.08,'Additive waveform mix must alter PCM');
 console.log('PASS distinct audible PCM for all four Pure Dieter modes; additive sine/saw mix changes audio',JSON.stringify({difference,waveDifference}));
})().catch(e=>{console.error(e);process.exitCode=1});
