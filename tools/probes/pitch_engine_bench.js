/* Probe only (not shipped): objective comparison of XenSonar pitch engines on identical test signals.
 *  A = 'xen-lane-time-pitch-v1' (realtime 2-head delay-line shifter; Material Track + Root Follow pitch sliders)
 *  C = One-Shot offline worker (PCMR, polyphase windowed-sinc granular renderer)
 * Metrics per shift: colour = worst partial level deviation vs. ideal (dB, comb-filter cancellation), residual = energy outside the expected partials (dB re. total), ripple = 10 ms RMS
 * coefficient of variation on a steady sine (amplitude "grain"), level = output RMS / ideal RMS.
 * Run: node tools/probes/pitch_engine_bench.js [path/to/index.html] */
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const html=fs.readFileSync(path.resolve(process.argv[2]||path.join(__dirname,'../../index.html')),'utf8');
const cut=(s,start,end)=>{const i=s.indexOf(start);if(i<0)throw Error('marker '+start);const a=i+start.length,b=s.indexOf(end,a);return s.slice(a,b)};
const A=cut(html,"const __XenTimeStablePitch=(()=>{\n const code=`","`;")+'';
const C=cut(html,'const __xenOSQRWorkerCode=String.raw`','`;');
(async()=>{const b=await chromium.launch();const p=await b.newPage();const blank=path.join(require('os').tmpdir(),'xen_pitch_bench.html');fs.writeFileSync(blank,'<!doctype html><title>bench</title>');await p.goto('file://'+blank);
const out=await p.evaluate(async({A,C})=>{
 const SR=48000,DUR=3,N=SR*DUR;
 // Test tones deliberately NOT aligned to the 55 ms head spacing (220/440 Hz happen to be, and flatter delay-line shifters).
 const F0={r197:197,r233:233.1,r311:311.1};const sig={sine431:i=>.5*Math.sin(2*Math.PI*431*i/SR),sine523:i=>.5*Math.sin(2*Math.PI*523.3*i/SR)};
 for(const [k,f] of Object.entries(F0))sig[k]=i=>{let v=0;for(let h=1;h<=8;h++)v+=Math.sin(2*Math.PI*f*h*i/SR)/h;return .3*v};
 const parts={sine431:[431],sine523:[523.3]};for(const [k,f] of Object.entries(F0))parts[k]=[1,2,3,4,5,6,7,8].map(h=>f*h);
 const mk=f=>{const x=new Float32Array(N);for(let i=0;i<N;i++)x[i]=f(i);return x};
 function fft(re,im){const n=re.length;for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]]}}
  for(let len=2;len<=n;len<<=1){const ang=-2*Math.PI/len,wr=Math.cos(ang),wi=Math.sin(ang);for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let j=0;j<len/2;j++){const ur=re[i+j],ui=im[i+j],vr=re[i+j+len/2]*cr-im[i+j+len/2]*ci,vi=re[i+j+len/2]*ci+im[i+j+len/2]*cr;re[i+j]=ur+vr;im[i+j]=ui+vi;re[i+j+len/2]=ur-vr;im[i+j+len/2]=ui-vi;const t=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=t}}}}
 function metrics(y,expect,kind){const from=Math.round(1.2*SR),M=65536;const re=new Float64Array(M),im=new Float64Array(M);
  for(let i=0;i<M;i++){const w=.5-.5*Math.cos(2*Math.PI*i/(M-1));re[i]=y[from+i]*w}fft(re,im);
  let tot=0,inb=0;const df=SR/M;for(let k=1;k<M/2;k++){const e=re[k]*re[k]+im[k]*im[k],f=k*df;tot+=e;if(expect.some(t=>Math.abs(f-t)<=12))inb+=e}
  const resid=10*Math.log10(Math.max(1e-12,(tot-inb)/tot));
  const fr=480,vals=[];for(let s=from;s+fr<=from+M;s+=fr){let q=0;for(let i=s;i<s+fr;i++)q+=y[i]*y[i];vals.push(Math.sqrt(q/fr))}
  const mean=vals.reduce((a,b)=>a+b,0)/vals.length,sd=Math.sqrt(vals.reduce((a,b)=>a+(b-mean)**2,0)/vals.length);
  const lv=expect.map(t=>{let e=0;for(let k=1;k<M/2;k++){const f=k*df;if(Math.abs(f-t)<=12)e+=re[k]*re[k]+im[k]*im[k]}return e}),ref=expect.map((t,j)=>1/((j+1)**2));
  const s1=lv.reduce((a,b)=>a+b,0),s2=ref.reduce((a,b)=>a+b,0),colour=expect.length>1?Math.max(...lv.map((e,j)=>Math.abs(10*Math.log10(Math.max(1e-30,e/s1)/(ref[j]/s2))))):0;
  return {residualDb:+resid.toFixed(1),colourDb:+colour.toFixed(1),ripplePct:+(100*sd/mean).toFixed(2),rms:+mean.toFixed(4)}}
 async function engineA(x,cents){const ctx=new OfflineAudioContext(2,N,SR);const url='data:application/javascript;charset=utf-8,'+encodeURIComponent(A);await ctx.audioWorklet.addModule(url);
  const buf=ctx.createBuffer(2,N,SR);buf.copyToChannel(x,0);buf.copyToChannel(x,1);const src=ctx.createBufferSource();src.buffer=buf;
  const node=new AudioWorkletNode(ctx,'xen-lane-time-pitch-v1',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2]});src.connect(node).connect(ctx.destination);src.start(0);
  ctx.suspend(128/SR).then(async()=>{node.port.postMessage({cents});await new Promise(r=>setTimeout(r,80));ctx.resume()});
  const r=await ctx.startRendering();return r.getChannelData(0)}
 async function engineC(x,cents){const w=new Worker(URL.createObjectURL(new Blob([C],{type:'application/javascript'})));
  const res=await new Promise((ok,bad)=>{w.onmessage=e=>e.data.error?bad(Error(e.data.error)):ok(e.data);w.postMessage({type:'render',id:1,rate:SR,sourceRate:SR,frames:N,pitch:Math.pow(2,cents/1200),start:0,span:DUR,regionEnd:DUR,channels:[x.slice(),x.slice()]})});
  w.terminate();return {y:res.channels[0],renderer:res.renderer,grains:res.grainCount}}
 const rows=[];
 for(const [kind,cents] of [['sine431',200],['sine431',700],['sine523',700],['r197',300],['r197',700],['r233',700],['r311',700],['r197',-700],['r233',-1200],['r311',1200]]){
  const x=mk(sig[kind]),ratio=Math.pow(2,cents/1200),expect=parts[kind].map(f=>f*ratio);
  const ideal=metrics(mk(i=>sig[kind](i*ratio)),expect,kind);
  const a=metrics(await engineA(x,cents),expect,kind);
  let c;try{const r=await engineC(x,cents);c={...metrics(r.y,expect,kind),renderer:r.renderer}}catch(e){c={error:String(e.message)}}
  rows.push({signal:kind,cents,ideal,A_laneShift:a,C_oneShotWorker:c})}
 return rows},{A,C});
for(const r of out)console.log(JSON.stringify(r));await b.close()})();
