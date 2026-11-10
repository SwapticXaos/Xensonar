/* Probe only (not shipped): deterministic pitch behaviour of the Root Follow resident grain core
 * (src/audio/rfl/01_resident_worklet.js, class RawResidentCore) without a browser.
 * A 300 Hz sine loop (12 s) is armed at unity (target = anchor), then the target is raised by N cents
 * via update(), exactly like a root change or an offset on the tracked root would do.
 * Reports peak frequency and residual (energy outside +-12 Hz of the expected tone).
 * Tuning: neutral scales (1.0), maxGrains 8. Run: node tools/probes/rf_core_pitch_probe.js */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'../../src/audio/rfl/01_resident_worklet.js'),'utf8');
const a=src.indexOf('String.raw`')+'String.raw`'.length,b=src.lastIndexOf('`;');const code=src.slice(a,b).replace(/export\{[^}]*\};?/,'');
const SR=48000,Core=new Function('sampleRate','AudioWorkletProcessor','registerProcessor',code+'\nreturn RawResidentCore;')(SR,class{constructor(){this.port={postMessage(){}}}},()=>{});
const L=SR*12,x=new Float32Array(L);for(let i=0;i<L;i++)x[i]=.5*Math.sin(2*Math.PI*300*i/SR);
const tuning={grainWindowScale:1,grainSpacingScale:1,jitterScale:1,sourceDurationScale:1,maxGrains:8,microCutSafety:false,microCutSearchRadiusMs:4,sourceStartGuardMs:0,grainTimeDitherMs:0,grainSourceDitherMs:0};
const prog=t=>({mode:'base',transportAnchorSec:0,desiredLoopDurationSec:12,loopStartSec:0,loopEndSec:12,stepSec:.024,windowSec:.06,rawTargetHz:t,entryRootHz:null,sessionAnchorHz:null,smoothedRootHz:null,tuning});
function spectrum(seg){const N=1<<15,re=new Float64Array(N),im=new Float64Array(N);for(let i=0;i<N;i++)re[i]=(seg[i]||0)*(.5-.5*Math.cos(2*Math.PI*i/(N-1)));
 for(let i=1,j=0;i<N;i++){let bit=N>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]]}}
 for(let len=2;len<=N;len<<=1){const ang=-2*Math.PI/len,wr=Math.cos(ang),wi=Math.sin(ang);for(let i=0;i<N;i+=len){let cr=1,ci=0;for(let j=0;j<len/2;j++){const ur=re[i+j],ui=im[i+j],vr=re[i+j+len/2]*cr-im[i+j+len/2]*ci,vi=re[i+j+len/2]*ci+im[i+j+len/2]*cr;re[i+j]=ur+vr;im[i+j]=ui+vi;re[i+j+len/2]=ur-vr;im[i+j+len/2]=ui-vi;const t=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=t}}}
 return {N,p:k=>re[k]**2+im[k]**2}}
function measure(seg,target){const {N,p}=spectrum(seg);let bk=1,tot=0,inb=0;for(let k=Math.round(100*N/SR);k<Math.round(2000*N/SR);k++)if(p(k)>p(bk))bk=k;for(let k=1;k<N/2;k++){const e=p(k);tot+=e;if(Math.abs(k*SR/N-target)<=12)inb+=e}
 return {peakHz:+(bk*SR/N).toFixed(1),residualDb:+(10*Math.log10(Math.max(1e-12,(tot-inb)/tot))).toFixed(1)}}
for(const cents of [0,100,700,1200]){
 const core=new Core(SR);core.load([x,x],SR);core.arm(prog(266.78),.05);const out=new Float32Array(SR*8);let frame=0;
 const render=(from,to)=>{for(let f=from;f<to;f+=128){const o=[new Float32Array(128),new Float32Array(128)];core.render(frame,o);out.set(o[0].subarray(0,Math.min(128,to-f)),f);frame+=128}};
 render(0,SR*4);core.update(prog(266.78*Math.pow(2,cents/1200)));render(SR*4,SR*8);
 const target=300*Math.pow(2,cents/1200);console.log(JSON.stringify({cents,expectedHz:+target.toFixed(1),...measure(out.subarray(Math.round(6*SR)),target)}));
}
