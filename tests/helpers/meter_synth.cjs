'use strict';
// Seeded synthetic music with a known meter for the Taktometer meter-analysis test (tests/meter_analysis.test.cjs).
const {rng}=require('./analysis_synth.cjs'),SR=44100;
/* drums + bass + chord in a given meter: bar start = kick + low bass + chord, beat 3 (or the group start) = snare, hats on eighths */
function meterMusic({bpm=120,S=4,dur=30,seed=3,groups=null,offset=0}){
 const out=new Float32Array(Math.round(dur*SR)),R=rng(seed),beat=60/bpm,accent=new Set(groups??[0]);
 const tone=(t0,len,hz,amp,parts=5)=>{const n0=Math.round(t0*SR),n=Math.round(len*SR);for(let i=0;i<n&&n0+i<out.length;i++){if(n0+i<0)continue;const t=i/SR,env=Math.min(1,t/.004)*Math.exp(-t*3/len);let s=0;for(let h=1;h<=parts;h++)s+=Math.sin(2*Math.PI*hz*h*t)/h;out[n0+i]+=amp*env*s*.35}};
 const hit=(t0,len,amp,kind)=>{const n0=Math.round(t0*SR);for(let i=0;i<Math.round(len*SR);i++){const k=n0+i;if(k<0)continue;if(k>=out.length)break;const t=i/SR;out[k]+=kind==='kick'?amp*Math.sin(2*Math.PI*(50*t+60*(1-Math.exp(-t*30))/30))*Math.exp(-t*30):amp*(R()*2-1)*Math.exp(-t*(kind==='hat'?160:38))}};
 for(let b=0;b*beat<dur+beat;b++){const t=offset+b*beat,pos=b%S;
  hit(t,.14,pos===0?.95:.45,'kick');if(!accent.has(pos)&&pos%2===1)hit(t,.1,.35,'snare');
  hit(t,.03,.12,'hat');hit(t+beat/2,.03,.09,'hat');
  if(pos===0){tone(t,beat*S*.95,55,1.1,6);for(const r of [1,1.25,1.5])tone(t,beat*S*.9,220*r,.25,4)}
  else if(accent.has(pos))tone(t,beat*1.5,82.5,.6,6);
  tone(t,beat*.8,440*Math.pow(2,Math.floor(R()*7)/12),.18,3);}
 let mx=0;for(const v of out)mx=Math.max(mx,Math.abs(v));for(let i=0;i<out.length;i++)out[i]/=mx*1.1;return out;
}
module.exports={meterMusic,SR};
