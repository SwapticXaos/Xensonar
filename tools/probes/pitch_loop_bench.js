/* Probe only (not shipped): PITCH-HQ-01 loop renderer (offline worker, loop:true) on fair test tones.
 * Reports residual in the loop middle and across the loop seam, compared with the unshifted source seam, level ratio and render time.
 * Run: node tools/probes/pitch_loop_bench.js [path/to/index.html] */
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');const os=require('os');
const h=fs.readFileSync(process.argv[2]||path.join(__dirname,'../../index.html'),'utf8');const k='const __xenOSQRWorkerCode=String.raw`';const a=h.indexOf(k)+k.length;const C=h.slice(a,h.indexOf('`;',a));
(async()=>{const b=await chromium.launch();const p=await b.newPage();const blank=path.join(os.tmpdir(),'lb.html');fs.writeFileSync(blank,'<!doctype html>');await p.goto('file://'+blank);
const out=await p.evaluate(async C=>{const SR=48000;
 function fft(re,im){const n=re.length;for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]]}}
  for(let len=2;len<=n;len<<=1){const ang=-2*Math.PI/len,wr=Math.cos(ang),wi=Math.sin(ang);for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let j=0;j<len/2;j++){const ur=re[i+j],ui=im[i+j],vr=re[i+j+len/2]*cr-im[i+j+len/2]*ci,vi=re[i+j+len/2]*ci+im[i+j+len/2]*cr;re[i+j]=ur+vr;im[i+j]=ui+vi;re[i+j+len/2]=ur-vr;im[i+j+len/2]=ui-vi;const t=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=t}}}}
 function resid(y,from,expect){const M=16384,re=new Float64Array(M),im=new Float64Array(M);for(let i=0;i<M;i++)re[i]=y[from+i]*(.5-.5*Math.cos(2*Math.PI*i/(M-1)));fft(re,im);let tot=0,inb=0;for(let k=1;k<M/2;k++){const e=re[k]**2+im[k]**2,f=k*SR/M;tot+=e;if(expect.some(t=>Math.abs(f-t)<=20))inb+=e}return +(10*Math.log10((tot-inb)/tot)).toFixed(1)}
 const w=new Worker(URL.createObjectURL(new Blob([C],{type:'application/javascript'})));let id=0;
 const render=(x,cents,loop)=>new Promise((ok,bad)=>{const my=++id;w.onmessage=e=>{if(e.data.id!==my)return;e.data.error?bad(Error(e.data.error)):ok(e.data)};const L=x.length;
  w.postMessage(loop?{type:'render',loop:true,id:my,rate:SR,pitch:Math.pow(2,cents/1200),channels:[x.slice(),x.slice()]}:{type:'render',id:my,rate:SR,sourceRate:SR,frames:L,pitch:Math.pow(2,cents/1200),start:0,span:L/SR,regionEnd:L/SR,channels:[x.slice(),x.slice()]})});
 const rows=[];
 for(const [f0,cents,bars] of [[197,700,2],[233.1,-1200,2],[311.1,1200,2],[431,700,2],[197,300,2.37],[200,700,2],[240,-1200,2],[300,1200,2],[480,700,2.5]]){
  const L=Math.round(SR*bars),x=new Float32Array(L);for(let i=0;i<L;i++){let v=0;for(let h=1;h<=8;h++)v+=Math.sin(2*Math.PI*f0*h*i/SR)/h;x[i]=.3*v}
  const exp=[1,2,3,4,5,6,7,8].map(h=>f0*h*Math.pow(2,cents/1200));
  const t0=performance.now();const r=await render(x,cents,true);const ms=performance.now()-t0;const y=r.channels[0];
  const yy=new Float32Array(2*L);yy.set(y,0);yy.set(y,L);
  let jump=0,typ=0;for(let i=1;i<2*L;i++){const dlt=Math.abs(yy[i]-yy[i-1]);if(Math.abs(i-L)<2)jump=Math.max(jump,dlt);else typ=Math.max(typ,dlt)}
  let rms=0;for(const v of y)rms+=v*v;rms=Math.sqrt(rms/L);let rin=0;for(const v of x)rin+=v*v;rin=Math.sqrt(rin/L);
  const xx=new Float32Array(2*L);xx.set(x,0);xx.set(x,L);const srcExp=[1,2,3,4,5,6,7,8].map(h=>f0*h);
  // periodic source variant: loop length = whole number of f0 periods
  rows.push({f0,cents,loopSec:bars,sourceSeam:resid(xx,L-8192,srcExp),sourceMid:resid(xx,Math.floor(L/2)-8192,srcExp),renderMs:Math.round(ms),renderer:r.renderer,residMid:resid(yy,Math.floor(L/2)-8192,exp),residSeam:resid(yy,L-8192,exp),seamStep:+jump.toFixed(4),maxStepElsewhere:+typ.toFixed(4),levelRatio:+(rms/rin).toFixed(3)})}
 // speed for a long loop
 {const L=SR*28,x=new Float32Array(L);for(let i=0;i<L;i++)x[i]=.3*Math.sin(2*Math.PI*233.1*i/SR)+.1*Math.sin(2*Math.PI*466.2*i/SR);const t0=performance.now();await render(x,700,true);rows.push({longLoopSec:28,renderMs:Math.round(performance.now()-t0)})}
 return rows},C);
for(const r of out)console.log(JSON.stringify(r));await b.close()})();
