'use strict';
// DUAL-ALIGN-01 rig: loads the Dual Donor renderers (variant 2 'revised' and variant 3 'aligned') from src without a browser,
// builds synthetic donors with known answers and measures the properties a hybrid must have.
const fs=require('fs'),path=require('path'),extract=require('./extract_function.cjs');
const src=p=>fs.readFileSync(path.join(__dirname,'..','..',p),'utf8');
const revised=new Function(extract(src('src/forge/dual/01_dsp_and_worker.js'),'__f35636DualDSPFactory')+';return __f35636DualDSPFactory();')();
const aligned=new Function(extract(src('src/rooms/00_dual_aligned_dsp.js'),'__f35636DualDSPFactoryAligned')+';return __f35636DualDSPFactoryAligned();')();
function rng(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
// Harmonic tone with a formant envelope (Gaussian bumps in log-frequency), optional onset, vibrato and noise.
function tone({sr=48000,dur=2,f0=220,formants=[[700,1],[1200,.6],[2600,.3]],bw=.25,onset=0,decay=0,vib=0,noise=0,seed=1}){
  const n=Math.round(sr*dur),x=new Float32Array(n),R=rng(seed),env=f=>{let a=.02;for(const [c,g] of formants)a+=g*Math.exp(-(((Math.log2(f/c))/bw)**2));return a;};
  const H=Math.floor(sr*.45/f0),amps=Array.from({length:H},(_,h)=>env(f0*(h+1))),ph=amps.map(()=>R()*Math.PI*2);let phase=0;
  for(let i=0;i<n;i++){const t=i/sr,on=t<onset?0:1,g=on*(decay?Math.exp(-(t-onset)/decay):1)*Math.min(1,(t-onset)/.004+0);
    const f=f0*(1+vib*Math.sin(2*Math.PI*5.5*t));phase+=2*Math.PI*f/sr;let v=0;for(let h=0;h<H;h++)v+=amps[h]*Math.sin((h+1)*phase+ph[h]);
    x[i]=(v*.08+noise*(R()*2-1))*(t<onset?0:g);}
  return x;}
function noiseBurst({sr=48000,dur=2,onset=0,decay=.3,seed=3,color=0}){const n=Math.round(sr*dur),x=new Float32Array(n),R=rng(seed);let y=0;for(let i=0;i<n;i++){const t=i/sr;y=color*y+(R()*2-1);x[i]=t<onset?0:y*.2*Math.exp(-(t-onset)/decay);}return x;}
const source=(samples,sr=48000,rev='r')=>({samples,sampleRate:sr,duration:samples.length/sr,revision:rev});
function plan({revision='aligned',modeA='all',modeB='all',mode='cross',direction=null,remainder='linked_only',regA={x0:0,x1:1,y0:0,y1:1},regB={x0:0,x1:1,y0:0,y1:1}}={}){
  return {schema:'xensonar-dual-donor-ui-v2',revision,name:'t',sources:{A:{kind:'file',id:'a',label:'A',revision:'ra'},B:{kind:'file',id:'b',label:'B',revision:'rb'}},
    regions:[{id:'a1',slot:'A',...regA,feature:modeA},{id:'b1',slot:'B',...regB,feature:modeB}],links:[{id:'l1',a:'a1',b:'b1',mode,direction}],operation:mode,imprintDirection:direction||'A_to_B',remainder,updatedAt:0};}
async function render(variant,p,A,B,settings={}){const dsp=variant==='aligned'?aligned:revised;p={...p,revision:variant};
  return dsp.render(p,{A:{...A,revision:'ra'},B:{...B,revision:'rb'}},{duration:2,strength:1,...settings});}
// --- measurements ---
function fftMag(x,start,n){const re=new Float64Array(n),im=new Float64Array(n);for(let j=0;j<n;j++){const w=.5-.5*Math.cos(2*Math.PI*(j+.5)/n);re[j]=(x[start+j]||0)*w;}
  for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
  for(let len=2;len<=n;len*=2){const a=-2*Math.PI/len;for(let s=0;s<n;s+=len)for(let j=0;j<len/2;j++){const wr=Math.cos(a*j),wi=Math.sin(a*j),p=s+j,q=p+len/2,tr=re[q]*wr-im[q]*wi,ti=re[q]*wi+im[q]*wr;re[q]=re[p]-tr;im[q]=im[p]-ti;re[p]+=tr;im[p]+=ti;}}
  return Float64Array.from({length:n/2},(_,k)=>Math.hypot(re[k],im[k]));}
// Long-term power spectrum over [t0,t1] seconds, 8192-point frames.
function spectrum(x,sr,t0,t1,n=8192){const out=new Float64Array(n/2);let c=0;for(let s=Math.floor(t0*sr);s+n<=Math.min(x.length,t1*sr);s+=n/4){const m=fftMag(x,s,n);for(let k=0;k<n/2;k++)out[k]+=m[k]*m[k];c++;}return {p:out.map(v=>v/Math.max(1,c)),hz:sr/n};}
// Share of energy (100..5000 Hz) lying within +-1.2 % of the harmonics of f0.
function harmonicShare(sp,f0){let inS=0,all=0;for(let k=0;k<sp.p.length;k++){const f=k*sp.hz;if(f<100||f>5000)continue;all+=sp.p[k];const h=Math.round(f/f0);if(h>=1&&Math.abs(f-h*f0)<=f0*h*.012+sp.hz)inS+=sp.p[k];}return inS/all;}
// Envelope correlation in log-frequency: smoothed log spectrum vs. a reference envelope function, 300..4000 Hz.
function envelopeCorr(sp,envFn){const xs=[],ys=[];for(let o=0;o<40;o++){const f=300*Math.pow(4000/300,o/39);let s=0,c=0;for(let k=0;k<sp.p.length;k++){const g=k*sp.hz;if(Math.abs(Math.log2(g/f))<1/12){s=Math.max(s,sp.p[k]);c++;}}xs.push(Math.log(s+1e-20));ys.push(Math.log(envFn(f)));}
  const m=a=>a.reduce((x,y)=>x+y,0)/a.length,mx=m(xs),my=m(ys);let sxy=0,sxx=0,syy=0;for(let i=0;i<xs.length;i++){sxy+=(xs[i]-mx)*(ys[i]-my);sxx+=(xs[i]-mx)**2;syy+=(ys[i]-my)**2;}return sxy/Math.sqrt(sxx*syy);}
// Onset count of an output: 10 ms RMS envelope, rises > 9 dB within 30 ms from a quiet floor.
function attacks(x,sr){const h=Math.round(sr*.01),e=[];for(let s=0;s+h<=x.length;s+=h){let v=0;for(let i=s;i<s+h;i++)v+=x[i]*x[i];e.push(10*Math.log10(v/h+1e-12));}
  const peak=Math.max(...e),out=[];for(let i=3;i<e.length;i++){if(e[i]-e[i-3]>9&&e[i]>peak-20&&(!out.length||i-out[out.length-1]>10))out.push(i);}return out.map(i=>i*.01);}
function bandEnergyDb(sp,lo,hi){let s=0;for(let k=0;k<sp.p.length;k++){const f=k*sp.hz;if(f>=lo&&f<hi)s+=sp.p[k];}return 10*Math.log10(s+1e-20);}
module.exports={revised,aligned,tone,noiseBurst,source,plan,render,spectrum,harmonicShare,envelopeCorr,attacks,bandEnergyDb,rng};
