'use strict';
// MYZEL-COSMOS-01 rig: the real Art-Installation hum path without a browser.
// Loads geometry (07), live bridge (08) and kernel (09) from a directory, runs
// myzelGUpdate every 30 ms against a fake engine whose worklet port feeds the
// kernel (structuredClone, as postMessage would), and renders stereo PCM.
// Used by tests/myzel_cosmos_01.test.cjs, parent files live in
// tests/fixtures/myzel_g2_pre_cosmos (state 93dbe4d).
const fs=require('fs'),vm=require('vm'),path=require('path');
const ROOT=path.resolve(__dirname,'../..');
const SRC=path.join(ROOT,'src/audio'),PARENT=path.join(ROOT,'tests/fixtures/myzel_g2_pre_cosmos');
const EFFECTS=['resonator','formant_filter','spectral_tilt','wavefolder','sub_harmonic','shimmer_delay','comb_filter','grain_blur','drive','chorus','bitcrusher'];
const RATIOS=[1,9/8,6/5,5/4,4/3,11/8,3/2,8/5,13/8,5/3,7/4,15/8];
const W=1100,H=400;
function rng(seed){let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
// Same distribution as Rebuild Layout (Gpe): x in [.1,.9]W, y in [.1,.9]H, eleven organs plus one drawn duplicate.
function layout(seed){
  const r=rng(seed),order=EFFECTS.slice();order.push(EFFECTS[Math.floor(r()*11)]);
  for(let i=11;i>0;i--){const j=Math.floor(r()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  return RATIOS.map((ratio,i)=>({id:`resident-${i}`,label:String(i),x:W*.1+r()*W*.8,y:H*.1+r()*H*.8,frequency:220*ratio,
    muted:false,isCustomResident:false,energy:0,config:{auraRadius:150,modules:[{type:order[i],intensity:.8}]}}));
}
// A fixed grid for the "Cross grid lines" ball tone: 12-EDO 110..440 Hz, as __NodalBallGrid.control does it.
function gridStub(){
  const lines=[];for(let k=0;k<=24;k++){const freq=110*2**(k/12);lines.push({id:'g'+k,freq,y:(440-freq)/330});}
  lines.sort((a,b)=>a.y-b.y);
  return {control(snapshot,mix,state,time){
    const y=Math.max(0,Math.min(1,snapshot.cursorNormalizedY??.5));
    if(mix.ballToneMode!=='grid'){state.previousY=y;return {hz:0,gate:1};}
    if(!Number.isFinite(state.time)){state.previousY=y;state.time=time;state.lastHit=-Infinity;state.frequency=0;return {hz:0,gate:0};}
    let crossed=null;const p=state.previousY;
    if(y>p){for(const l of lines)if(l.y>p&&l.y<=y)crossed=l;}else if(y<p){for(let i=lines.length-1;i>=0;i--)if(lines[i].y<p&&lines[i].y>=y)crossed=lines[i];}
    if(crossed){state.frequency=crossed.freq;state.lastHit=time;}
    state.previousY=y;state.time=time;const age=time-state.lastHit;
    return {hz:state.frequency,gate:age>=0&&age<.14?(1-age/.14)**2:0};
  }};
}
function load(dir){
  // new Function (main realm), not vm: the kernel's Math lookups stay fast, so CPU numbers mean something.
  const body=['07_myzel_g_geometry.js','08_myzel_g_live.js','09_myzel_g_dsp.js'].map(f=>fs.readFileSync(path.join(dir,f),'utf8')).join('\n;\n')+
    '\n;return {createMyzelGDSP,myzelGUpdate,myzelGSpatialFrame,constellation:typeof myzelGConstellation==="function"?myzelGConstellation:null};';
  return new Function('__NodalBallGrid','performance','setTimeout','clearTimeout','jF',body)(gridStub(),{now:()=>0},()=>0,()=>{},()=>Promise.reject(new Error('no worklet')));
}
// Ball: a fixed Lissajous over the whole field (the same for every layout).
function ball(t){return {x:.5+.43*Math.sin(2*Math.PI*t/7.3),y:.5+.41*Math.sin(2*Math.PI*t/5.1+1)};}
function render({dir=SRC,seed=1,nodes=null,seconds=8,rate=48000,mix={},coupling=true,ballPath=ball,onMessage=null,onBlock=null}={}){
  const api=load(dir),dsp=api.createMyzelGDSP(rate),fake={currentTime:0};
  const messages=[];
  const g={ctx:fake,disposed:false,history:[],candidate:null,candidateSince:0,lastUpdate:0,lastMessage:-Infinity,active:false,
    fallbackRunning:false,fallbackPitches:[0,0,0,0],fallbackLevels:[0,0,0,0],output:{gain:{setTargetAtTime(){}}},
    worklet:{port:{postMessage(m){const copy=structuredClone(m);messages.push(copy);if(onMessage)onMessage(copy);dsp.controls(copy);}}}};
  const refs={__myzelG:g},layoutNodes=nodes||layout(seed);
  const mixAll={rootLevel:.62,ballLevel:.34,nodeLevel:.78,ballToneLevel:1,decay:.72,ballToneMode:'grid',...mix};
  const frames=Math.round(seconds*rate),left=new Float32Array(frames),right=new Float32Array(frames);
  const block=128,perUpdate=Math.round(rate*.0305/block);let pos=0,blocks=0,previous=ballPath(0);
  const out=[new Float32Array(block),new Float32Array(block)];let cpu=0n;
  while(pos<frames){
    if(blocks%perUpdate===0){
      const t=pos/rate,b=ballPath(t),speed=Math.hypot((b.x-previous.x)*W,(b.y-previous.y)*H)/(perUpdate*block/rate*60);previous=b;
      fake.currentTime=t;
      api.myzelGUpdate(fake,refs,{enabled:true,audible:true,mode:'installation',couplingEnabled:coupling,rootHz:220,mix:mixAll,
        snapshot:{myzelAudioNodes:layoutNodes,myzelAudioWidth:W,myzelAudioHeight:H,cursorNormalizedX:b.x,cursorNormalizedY:b.y,
          myceliumBallSpeed:speed,nearestNodeFreq:220}});
    }
    const t0=process.hrtime.bigint();dsp.process(null,out);cpu+=process.hrtime.bigint()-t0;
    const n=Math.min(block,frames-pos);left.set(out[0].subarray(0,n),pos);right.set(out[1].subarray(0,n),pos);pos+=n;blocks++;
    if(onBlock)onBlock(dsp,pos/rate);
  }
  return {left,right,rate,messages,dsp,cpuMsPerSecond:Number(cpu)/1e6/seconds,cosmos:api.constellation?api.constellation({myzelAudioNodes:layoutNodes,myzelAudioWidth:W,myzelAudioHeight:H}):null};
}
// Long-term log spectrum in 1/3-octave bands (60 Hz .. 12 kHz), dB, from 4096-point frames.
function fft(re,im){const n=re.length;for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
  for(let len=2;len<=n;len<<=1){const a=-2*Math.PI/len;for(let i=0;i<n;i+=len)for(let k=0;k<len/2;k++){const c=Math.cos(a*k),s=Math.sin(a*k),xr=re[i+k+len/2],xi=im[i+k+len/2],tr=xr*c-xi*s,ti=xr*s+xi*c;
    re[i+k+len/2]=re[i+k]-tr;im[i+k+len/2]=im[i+k]-ti;re[i+k]+=tr;im[i+k]+=ti;}}}
function describe({left,right,rate}){
  const N=4096,bands=[];for(let f=60;f<12000;f*=2**(1/3))bands.push(f);
  const power=new Float64Array(bands.length);let frames=0;
  for(let start=rate;start+N<=left.length;start+=N){const re=new Float64Array(N),im=new Float64Array(N);
    for(let i=0;i<N;i++){const w=.5-.5*Math.cos(2*Math.PI*i/N);re[i]=(left[start+i]+right[start+i])*.5*w;}
    fft(re,im);for(let k=1;k<N/2;k++){const f=k*rate/N,b=bands.findIndex((lo,j)=>f>=lo&&f<(bands[j+1]??lo*2**(1/3)));if(b>=0)power[b]+=re[k]*re[k]+im[k]*im[k];}frames++;}
  const spectrum=Array.from(power,p=>10*Math.log10(p/Math.max(1,frames)+1e-12));
  // envelope (20 ms RMS) modulation and stereo width, after the first second
  const hop=Math.round(rate*.02),env=[];let mid=0,side=0,sum=0,count=0,peak=0;
  for(let s=rate;s+hop<=left.length;s+=hop){let e=0;for(let i=s;i<s+hop;i++){const l=left[i],r=right[i];e+=l*l+r*r;mid+=(l+r)**2;side+=(l-r)**2;peak=Math.max(peak,Math.abs(l),Math.abs(r));}env.push(Math.sqrt(e/(2*hop)));sum+=e;count+=2*hop;}
  const mean=env.reduce((a,b)=>a+b,0)/Math.max(1,env.length),sd=Math.sqrt(env.reduce((a,b)=>a+(b-mean)**2,0)/Math.max(1,env.length));
  let centroidNum=0,centroidDen=0;spectrum.forEach((db,i)=>{const p=10**(db/10);centroidNum+=p*Math.log2(bands[i]);centroidDen+=p;});
  // Pitch-independent character: spectral slope (dB per octave, 100 Hz..6 kHz),
  // and the rhythm of the envelope: share of envelope motion at 0.3-1.5 Hz
  // (swells), 1.5-5 Hz (echo cascades) and 5-20 Hz (beating, flutter).
  let sx=0,sy=0,sxx=0,sxy=0,k=0;bands.forEach((f,i)=>{if(f<100||f>6000)return;const x=Math.log2(f),y=spectrum[i];sx+=x;sy+=y;sxx+=x*x;sxy+=x*y;k++;});
  const slope=(k*sxy-sx*sy)/Math.max(1e-9,k*sxx-sx*sx);
  const ehop=Math.round(rate*.01),envelope=[];for(let s=rate;s+ehop<=left.length;s+=ehop){let e=0;for(let i=s;i<s+ehop;i++)e+=left[i]*left[i]+right[i]*right[i];envelope.push(Math.sqrt(e/(2*ehop)));}
  const em=envelope.reduce((a,b)=>a+b,0)/Math.max(1,envelope.length),M=envelope.length,bandPower=[[.3,1.5],[1.5,5],[5,20]].map(()=>0);
  for(let q=1;q<=Math.floor(M/2);q++){const f=q*100/M;let re=0,im=0;for(let i=0;i<M;i++){const a=2*Math.PI*q*i/M;re+=(envelope[i]-em)*Math.cos(a);im-=(envelope[i]-em)*Math.sin(a);}
    [[.3,1.5],[1.5,5],[5,20]].forEach(([lo,hi],b)=>{if(f>=lo&&f<hi)bandPower[b]+=(re*re+im*im)/(M*M);});}
  const rhythm=bandPower.map(p=>Math.sqrt(p)/Math.max(1e-9,em));
  return {spectrum,rms:Math.sqrt(sum/Math.max(1,count)),modulation:sd/Math.max(1e-9,mean),width:Math.sqrt(side/Math.max(1e-12,mid)),
    centroidHz:2**(centroidNum/Math.max(1e-12,centroidDen)),peak,slope,swell:rhythm[0],cascade:rhythm[1],flutter:rhythm[2]};
}
// Mean pairwise distance between layouts: spectra mean-removed (level-independent), RMS dB difference.
function spread(descriptions){
  const shapes=descriptions.map(d=>{const m=d.spectrum.reduce((a,b)=>a+b,0)/d.spectrum.length;return d.spectrum.map(x=>x-m);});
  let total=0,pairs=0;for(let i=0;i<shapes.length;i++)for(let j=i+1;j<shapes.length;j++){
    total+=Math.sqrt(shapes[i].reduce((s,x,k)=>s+(x-shapes[j][k])**2,0)/shapes[i].length);pairs++;}
  const sd=key=>{const v=descriptions.map(d=>d[key]),m=v.reduce((a,b)=>a+b,0)/v.length;return Math.sqrt(v.reduce((a,b)=>a+(b-m)**2,0)/v.length)/Math.max(1e-9,Math.abs(m));};
  const sdAbs=key=>{const v=descriptions.map(d=>d[key]),m=v.reduce((a,b)=>a+b,0)/v.length;return Math.sqrt(v.reduce((a,b)=>a+(b-m)**2,0)/v.length);};
  return {spectrumDb:total/Math.max(1,pairs),modulationCv:sd('modulation'),widthCv:sd('width'),centroidCv:sd('centroidHz'),rmsCv:sd('rms'),
    slopeSd:sdAbs('slope'),swellCv:sd('swell'),cascadeCv:sd('cascade'),flutterCv:sd('flutter')};
}
module.exports={SRC,PARENT,W,H,layout,load,render,describe,spread,ball};
