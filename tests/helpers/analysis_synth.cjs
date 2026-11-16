'use strict';
// Seeded synthetic music for the audio-analysis tests: drums + bass + melody/chords from a list of scale degrees in cents (period = the interval of equivalence).
// wav(): 16-bit mono WAV bytes for the browser test.
function rng(seed){let a=seed>>>0||1;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function render({sr=44100,dur=30,bpm=120,rootHz=110,scale=[0,200,300,500,700,800,1100],period=1200,drums=true,tonal=true,seed=1,detune=0,vib=0}){
  const out=new Float32Array(Math.round(dur*sr)),R=rng(seed),beat=60/bpm;
  const add=(t0,len,hz,amp,parts)=>{const n0=Math.round(t0*sr),n=Math.round(len*sr);for(let i=0;i<n&&n0+i<out.length;i++){const t=i/sr,env=Math.min(1,t/.01)*Math.exp(-t*2.2/len)*Math.min(1,(len-t)/.02);let s=0;const f=hz*(1+vib*Math.sin(2*Math.PI*5.5*t));for(let h=1;h<=parts;h++)s+=Math.sin(2*Math.PI*f*h*t+h)/h;out[n0+i]+=amp*env*s*.4}};
  const noteHz=(deg,oct)=>rootHz*Math.pow(2,(scale[deg%scale.length]+period*Math.floor(deg/scale.length)+period*oct+(R()-.5)*2*detune)/1200);
  for(let b=0;b*beat<dur;b++){
    const t=b*beat;
    if(drums){
      for(let i=0;i<Math.round(.12*sr);i++){const k=Math.round(t*sr)+i;if(k>=out.length)break;const tt=i/sr;out[k]+=.8*Math.sin(2*Math.PI*(50*tt+ (110-50)*(1-Math.exp(-tt*30))/30 *1))*Math.exp(-tt*35)}
      if(b%2===1)for(let i=0;i<Math.round(.1*sr);i++){const k=Math.round(t*sr)+i;if(k>=out.length)break;out[k]+=(R()*2-1)*.5*Math.exp(-i/sr*40)}
      for(let h=0;h<2;h++)for(let i=0;i<Math.round(.03*sr);i++){const k=Math.round((t+h*beat/2)*sr)+i;if(k>=out.length)break;out[k]+=(R()*2-1)*.15*Math.exp(-i/sr*150)}
    }
    if(tonal){
      if(b%2===0)add(t,beat*1.9,noteHz(0,-1),1,6);                       // bass on the tonic
      if(b%4===0)add(t,beat*.95,noteHz(4,-1),.6,6);                      // fifth-ish bass
      const deg=Math.floor(R()*scale.length),deg2=Math.floor(R()*scale.length);
      add(t,beat*.9,noteHz(deg,1),.7,5);add(t+beat/2,beat*.45,noteHz(deg2,1),.5,5);
      if(b%4===0)for(const d of [0,2,4])add(t,beat*3.8,noteHz(d,0),.35,4);
    }
  }
  let mx=0;for(const v of out)mx=Math.max(mx,Math.abs(v));for(let i=0;i<out.length;i++)out[i]/=mx*1.1;return out;
}
function wav(x,sr){const b=Buffer.alloc(44+x.length*2);b.write('RIFF',0);b.writeUInt32LE(36+x.length*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(x.length*2,40);for(let i=0;i<x.length;i++)b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,x[i]))*32767),44+i*2);return b}
module.exports={render,rng,wav};
