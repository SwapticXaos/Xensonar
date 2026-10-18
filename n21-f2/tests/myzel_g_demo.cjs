'use strict';const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),scope={Float32Array,Float64Array,Math,Number,WeakMap};vm.createContext(scope);
vm.runInContext(fs.readFileSync(path.join(root,'src/audio/09_myzel_g_dsp.js'),'utf8')+';globalThis.make=createMyzelGDSP;',scope);
const sr=44100,seconds=18,frames=sr*seconds,dsp=scope.make(sr),pcm=Buffer.allocUnsafe(44+frames*4);
pcm.write('RIFF',0);pcm.writeUInt32LE(pcm.length-8,4);pcm.write('WAVEfmt ',8);pcm.writeUInt32LE(16,16);
pcm.writeUInt16LE(1,20);pcm.writeUInt16LE(2,22);pcm.writeUInt32LE(sr,24);pcm.writeUInt32LE(sr*4,28);pcm.writeUInt16LE(4,32);pcm.writeUInt16LE(16,34);
pcm.write('data',36);pcm.writeUInt32LE(frames*4,40);
const patterns=[
 {label:'Grundkörper',types:[],root:126,frequency:174,brightness:.45,motion:.25},
 {label:'Fold → Resonator',types:['wavefolder','resonator'],root:126,frequency:187,brightness:.55,motion:.73},
 {label:'Resonator → Fold',types:['resonator','wavefolder'],root:126,frequency:187,brightness:.55,motion:.73},
 {label:'Formant → Chorus',types:['formant_filter','chorus'],root:143,frequency:238,brightness:.75,motion:.4},
 {label:'Comb → Shimmer',types:['comb_filter','shimmer_delay'],root:119,frequency:185,brightness:.64,motion:.65},
 {label:'Grain → Drive → Formant',types:['grain_blur','drive','formant_filter'],root:127,frequency:203,brightness:.87,motion:.45},
 {label:'Tilt → Sub → Crush',types:['spectral_tilt','sub_harmonic','bitcrusher'],root:111,frequency:155,brightness:.61,motion:.45},
 {label:'Chorus → Formant → Resonator',types:['chorus','formant_filter','resonator'],root:126,frequency:196,brightness:.52,motion:.55},
 {label:'Release',types:[],root:126,frequency:175,brightness:.32,motion:.15}];
let peak=0,rmsSum=0;
for(let pos=0;pos<frames;pos+=128){
 const count=Math.min(128,frames-pos),time=pos/sr,section=Math.min(patterns.length-1,Math.floor(time/2)),p=patterns[section];
 if(pos===0||Math.floor((pos-1)/sr/2)!==section){
  dsp.controls({active:1,root:p.root,frequency:p.frequency,presence:.76,motion:p.motion,
    brightness:p.brightness,tension:.46,body:.83,level:.72,pan:0,
    stages:p.types.map((type,j)=>({type,frequency:p.frequency*(1+j*.05),strength:.88-j*.08}))});
 }
 const out=[new Float32Array(count),new Float32Array(count)];dsp.process([],out);
 for(let i=0;i<count;i++){
  const edge=Math.min(1,(pos+i)/(sr*.15),(frames-1-pos-i)/(sr*.25)),gain=Math.max(0,edge)*.91;
  for(let ch=0;ch<2;ch++){
   const f=Math.max(-1,Math.min(1,out[ch][i]*gain));pcm.writeInt16LE(Math.round(f*32767),44+(pos+i)*4+ch*2);
   peak=Math.max(peak,Math.abs(f));rmsSum+=f*f;
  }
 }
}
const wav=path.join(root,'MYZEL_G_KLANGDEMO.wav');fs.writeFileSync(wav,pcm);
fs.writeFileSync(path.join(root,'results/myzel_g_demo.json'),JSON.stringify({seconds,sampleRate:sr,sections:patterns.map(p=>p.label),peak,rms:Math.sqrt(rmsSum/(frames*2)),note:'Offline DSP demonstration, not a recording of the XenSonar browser installation.'},null,2)+'\n');
console.log(JSON.stringify({file:wav,peak,rms:Math.sqrt(rmsSum/(frames*2))}));
