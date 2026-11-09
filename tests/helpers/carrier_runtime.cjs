'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,'src',p),'utf8');
function fixture(){
 const c={console,Float32Array,Float64Array,Uint32Array,Math,Number,JSON,Object,Array,Map,Set,Date,Blob,Ar:10};vm.createContext(c);
 let s=read('app/forge/03_spectral_grid_and_archives.js');vm.runInContext(s.slice(0,s.indexOf('/* xen-lazy:lab */')),c);
 s=read('forge_and_melodic/10_audition_and_persistence.js');vm.runInContext(s.slice(s.indexOf('function __f333Signature('),s.indexOf('// Readiness, prewarm')),c);
 s=read('app/forge/05_forge_state_and_analysis.js');vm.runInContext(s.slice(s.indexOf('function B0('),s.indexOf('function wNe(')),c);
 s=read('forge/editor/06_output_routing.js');vm.runInContext(s.slice(s.indexOf('function OE('),s.indexOf('function uje(')),c);
 const file=path.join(root,'src/forge/analysis/06_polyphonic_transfer.js');if(fs.existsSync(file))vm.runInContext(fs.readFileSync(file,'utf8'),c);
 s=read('forge/editor/06_output_routing.js');
 vm.runInContext(s.slice(s.indexOf('const LK='),s.indexOf('const bze=')),c);
 const encoderStart=s.indexOf('function lg('),encoderEnd=s.indexOf('async function cS(',encoderStart);
 vm.runInContext(s.slice(encoderStart,encoderEnd),c);
 c.OfflineAudioContext=class{createBuffer(channels,length,sampleRate){const pcm=Array.from({length:channels},()=>new Float32Array(length));return{length,sampleRate,numberOfChannels:channels,getChannelData:i=>pcm[i]}}};
 c.Zr=x=>x;c.$p=(field,target)=>({...field,target});c.gc=field=>({resolved:field.targetSlots[field.target]?.deformation.curve??[]});c.vS=x=>x*12;c.IF=x=>Math.max(0,1+x*.95);
 c.__testCarrierVolume=100;c.__F3564Master={getSnapshot:()=>({volume:c.__testCarrierVolume,tuning:0})};c.xt={getContext:()=>new c.OfflineAudioContext()};
 s=read('forge_and_melodic/10_audition_and_persistence.js');vm.runInContext(s.slice(s.indexOf('const __f3564PeakMemo='),s.indexOf('function __f352Enabled(')),c);
 return c;
}
function grid(width=32,height=96){const data=new Float32Array(width*height);return{width,height,data,getColumn:x=>Float32Array.from({length:height},(_,y)=>data[y*width+x]),get:(x,y)=>data[y*width+x],set(x,y,value){data[y*width+x]=value}}}

module.exports={fixture,grid};
