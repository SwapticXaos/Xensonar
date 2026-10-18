'use strict';const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..'),scope={console,Math,Number,WeakMap,Float32Array,Float64Array,Int8Array};vm.createContext(scope);
for(const f of ['07_myzel_g_geometry.js','09_myzel_g_dsp.js','08_myzel_g_live.js'])vm.runInContext(fs.readFileSync(path.join(root,'src/audio',f),'utf8'),scope);
vm.runInContext('globalThis.api={make:createMyzelGDSP,frame:myzelGSpatialFrame,gesture:myzelGGesture}',scope);
const sr=44100,seconds=24,frames=seconds*sr,buffer=Buffer.alloc(44+frames*4),dsp=scope.api.make(sr);
buffer.write('RIFF');buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(2,22);buffer.writeUInt32LE(sr,24);buffer.writeUInt32LE(sr*4,28);buffer.writeUInt16LE(4,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(frames*4,40);
const types=['resonator','formant_filter','spectral_tilt','wavefolder','sub_harmonic','shimmer_delay','comb_filter','grain_blur','drive','chorus','bitcrusher','resonator'];
const layouts=['Weites Feld','Dichte Nachbarschaften','Bogen mit langem Nachklang','Getauschte Organpositionen'];
function nodes(section){return types.map((type,i)=>{
 let x,y;if(section===0||section===3){const index=section===3?(i+5)%12:i;x=80+(index%4)*265;y=70+Math.floor(index/4)*230;}
 else if(section===1){x=365+(i%4)*85;y=180+Math.floor(i/4)*95;}
 else{x=500+350*Math.cos(i/11*Math.PI);y=130+390*Math.sin(i/11*Math.PI);}
 return{id:'organ-'+i,label:type,frequency:132*[1,1.25,1.5,1.4,1.75,2.1,1.2,1.6,1.9,2.25,1.32,1.8][i],x,y,isCustomResident:false,config:{auraRadius:170,modules:[{type,intensity:.9}]}};});}
let history={history:[],candidate:null,candidateSince:0},peak=0,sum=0,priorSection=-1,energy=0,prevContact=0,lastControl=-1;
for(let pos=0;pos<frames;pos+=128){const time=pos/sr,section=Math.floor(time/6),local=time%6;
 const count=Math.min(128,frames-pos);
 if(time-lastControl>=.03||section!==priorSection){
   const reset=section!==priorSection;if(reset){history={history:[],candidate:null,candidateSince:0};energy=0;prevContact=0;}
   // Exactly the same absolute ball path and root for all four spatial recipes.
   const x=.15+.70*(.5+.5*Math.sin(local*.8)),y=.5+.30*Math.sin(local*1.25);
   const snapshot={myzelAudioNodes:nodes(section),myzelAudioWidth:1000,myzelAudioHeight:600,cursorNormalizedX:x,cursorNormalizedY:y,myceliumBallSpeed:5};
   const frame=scope.api.frame(snapshot,132),gesture=scope.api.gesture(history,snapshot,local,.033,true,frame,.72);
   const contact=gesture.contact,goal=Math.min(1,.45+Math.max(0,contact-prevContact)*3);energy=goal+(energy-goal)*Math.exp(-.033/(.18+frame.retention*.8));prevContact=contact;
   dsp.controls({active:1,reset,root:132,frequency:frame.tone.frequency,neighbourFrequency:frame.neighbour.frequency,presence:frame.tone.weight,neighbour:frame.neighbour.weight,
    motion:.45,gesture:energy,brightness:.55,tension:.35,body:.7,level:.72,pan:0,rootLevel:.45,ballLevel:.55,nodeLevel:.85,
    density:frame.density,spread:frame.spread,hollow:frame.hollow,bloom:frame.bloom,openness:frame.openness,retention:frame.retention,stages:gesture.stages});
   priorSection=section;lastControl=time;
 }
 const output=[new Float32Array(count),new Float32Array(count)];dsp.process([],output);
 for(let i=0;i<count;i++){const localTime=(pos+i)/sr%6,fade=Math.min(1,localTime/.12,(6-localTime)/.18);
  for(let ch=0;ch<2;ch++){const sample=output[ch][i]*Math.max(0,fade);peak=Math.max(peak,Math.abs(sample));sum+=sample*sample;buffer.writeInt16LE(Math.round(Math.max(-1,Math.min(1,sample))*32767),44+(pos+i)*4+ch*2);}}
}
fs.writeFileSync(path.join(root,'MYZEL_G2_LAYOUT_KLANGDEMO.wav'),buffer);
fs.writeFileSync(path.join(root,'results/myzel_g2_demo.json'),JSON.stringify({seconds,sampleRate:sr,sections:layouts.map((name,i)=>({name,start:i*6,end:(i+1)*6})),peak,rms:Math.sqrt(sum/(frames*2)),note:'Actual G2 DSP with synthetic but identical ball trajectory; four layouts. Offline, not a browser recording. No per-section loudness normalization.'},null,2)+'\n');console.log('DEMO',JSON.stringify({peak,rms:Math.sqrt(sum/(frames*2))}));
