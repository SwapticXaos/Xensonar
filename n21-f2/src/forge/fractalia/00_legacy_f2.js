/* Fractalia F2 · Contour Resonance.
   A drawing is compiled once into an excitation / resonant-body instrument.
   The musical carrier supplies pitch, timing and amplitude independently.
   Self-similar phase folds are one controllable process within this instrument,
   never a grain clock or a repetition of the source melody. */
function createFractaliaLegacyCore(){
 const ENGINE='fractalia-contour-resonance-f2',SIZE=1024,STATES=7,POINTS=128,LEVELS=[1,2,4,8,16,32,64,128,256],TAU=Math.PI*2;
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a)),wrap=v=>v-Math.floor(v);
 const read=(a,x,cyclic=true)=>{const p=(cyclic?wrap(x):clamp(x))*(cyclic?a.length:a.length-1),i=Math.floor(p),f=p-i;return a[i]+(a[cyclic?(i+1)%a.length:Math.min(i+1,a.length-1)]-a[i])*f};
 function fft(re,im,inverse=false){const n=re.length;for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]]}}
  for(let len=2;len<=n;len<<=1){const angle=(inverse?TAU:-TAU)/len,wr=Math.cos(angle),wi=Math.sin(angle);for(let start=0;start<n;start+=len){let ar=1,ai=0;for(let j=0;j<len/2;j++){
   const a=start+j,b=a+len/2,br=re[b]*ar-im[b]*ai,bi=re[b]*ai+im[b]*ar;re[b]=re[a]-br;im[b]=im[a]-bi;re[a]+=br;im[a]+=bi;const nr=ar*wr-ai*wi;ai=ar*wi+ai*wr;ar=nr}}}
  if(inverse)for(let i=0;i<n;i++){re[i]/=n;im[i]/=n}
 }
 const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){for(const x of Object.values(v))freeze(x);Object.freeze(v)}return v};
 function material(input){
  if(!input||input.schema!=='xensonar.fractalia-material'||input.version!==2)throw Error('Unsupported Fractalia material');
  const curve=key=>{const a=input[key];if(!Array.isArray(a)||a.length!==POINTS||!a.every(Number.isFinite))throw Error('Invalid Fractalia '+key);return a.map(v=>clamp(v,-4,4))};
  const out={schema:input.schema,version:2,contour:curve('contour'),energy:curve('energy'),profile:curve('profile'),detail:curve('detail'),density:clamp(input.density),roughness:clamp(input.roughness),asymmetry:clamp(input.asymmetry,-1,1),silent:input.silent===true};
  if(input.legacyWaves){if(!Array.isArray(input.legacyWaves)||input.legacyWaves.length>17)throw Error('Invalid legacy instrument');out.legacyWaves=input.legacyWaves.map(a=>{if(!Array.isArray(a)||a.length!==SIZE||!a.every(Number.isFinite))throw Error('Invalid legacy waveform');return a.map(v=>clamp(v,-4,4))})}
  return freeze(out);
 }
 function settings(input={}){
  if(input.schema&&input.schema!=='xensonar.fractalia')throw Error('Invalid Fractalia recipe');
  if(input.version!=null&&![1,2].includes(input.version))throw Error('Unsupported Fractalia recipe version');
  const p=input.params||input,n=(key,fallback,min=0,max=1)=>Number.isFinite(p[key])?clamp(p[key],min,max):fallback;
  return freeze({schema:'xensonar.fractalia',version:2,engine:ENGINE,name:String(input.name||'Contour Instrument').slice(0,120),params:{
   body:['prism','reed','hollow'].includes(p.body)?p.body:p.method==='surface'?'hollow':p.method==='classic'?'reed':'prism',
   depth:Math.round(n('depth',2,0,4)),fold:n('fold',.8,0,1.5),motion:n('motion',.45),brightness:n('brightness',.6)},material:input.material?material(input.material):null});
 }
 function capture({grid,tracks=[],durationSec=1}={}){
  const energy=new Float64Array(POINTS),pitch=new Float64Array(POINTS),detail=new Float64Array(POINTS),vertical=new Float64Array(POINTS);let total=0,mean=0,density=0;
  if(grid?.width>0&&grid.height>1){
   const w=grid.width,h=grid.height;
   for(let x=0;x<w;x++){const column=grid.getColumn(x),xi=Math.min(POINTS-1,Math.floor(x/w*POINTS));let sum=0,p=0,max=0;
    for(let y=0;y<h;y++){const v=clamp(column[y]);if(v<=0)continue;const weight=v*v,position=1-(y+.5)/h;sum+=weight;p+=position*weight;max=Math.max(max,v);vertical[Math.min(POINTS-1,Math.floor(position*POINTS))]+=weight;density++}
    energy[xi]+=max;pitch[xi]+=p;detail[xi]+=sum;total+=sum;mean+=p;
   }
   const columnsPerCell=w/POINTS;for(let i=0;i<POINTS;i++)energy[i]=Math.min(1,energy[i]/Math.max(1,columnsPerCell));density/=w*h;
  }else for(let i=0;i<POINTS;i++)for(const track of tracks){const s=track.at((i+.5)/POINTS*durationSec),g=clamp(s?.gain);if(g<=0)continue;const pos=clamp(Math.log2(Math.max(20,s.hz||220)/20)/Math.log2(1000));energy[i]=Math.max(energy[i],g);pitch[i]+=pos*g*g;detail[i]+=g*g;vertical[Math.min(POINTS-1,Math.floor(pos*POINTS))]+=g*g;total+=g*g;mean+=pos*g*g;density+=1/POINTS/Math.max(1,tracks.length)}
  mean=total>0?mean/total:.5;const contour=new Float64Array(POINTS);let variance=0,last=mean;
  for(let i=0;i<POINTS;i++){const p=detail[i]>1e-20?pitch[i]/detail[i]:last;last=p;contour[i]=p;variance+=(p-mean)**2*energy[i]}
  const spread=Math.sqrt(variance/Math.max(1e-9,energy.reduce((a,b)=>a+b,0))),scale=Math.max(.035,spread*2.4);let rough=0,asym=0;
  for(let i=0;i<POINTS;i++){contour[i]=clamp((contour[i]-mean)/scale,-1,1);rough+=Math.abs(contour[i]-contour[(i+POINTS-1)%POINTS]);asym+=contour[i]*energy[i]}
  const maximum=Math.max(1e-20,...vertical),profile=Array.from({length:POINTS},(_,i)=>read(vertical,clamp(mean+(i/(POINTS-1)-.5)*.8),false)/maximum);
  // Broad and narrow strokes retain distinct body widths; center frequency is
  // deliberately absent from the transferable instrument's identity.
  const dmax=Math.max(1e-20,...detail);for(let i=0;i<POINTS;i++)detail[i]=Math.sqrt(detail[i]/dmax);
  return material({schema:'xensonar.fractalia-material',version:2,contour:Array.from(contour),energy:Array.from(energy),profile,detail:Array.from(detail),density,roughness:rough/POINTS*3,asymmetry:asym/POINTS,silent:total<=1e-16});
 }
 function importInstrument(input){
  if(input?.schema==='xensonar.fractalia-instrument'&&input.version===2)return settings(input.recipe);
  if(input?.schema==='xensonar.fractalia-atlas'&&input.version===1){
   if(!Array.isArray(input.states)||!input.states.length||input.states.length>17)throw Error('Invalid F1 instrument');
   const waves=input.states.map(s=>s?.[s.length-1]);
   const empty=Array(POINTS).fill(0),m=material({schema:'xensonar.fractalia-material',version:2,contour:empty,energy:Array(POINTS).fill(1),profile:empty,detail:empty,density:.15,roughness:.4,asymmetry:0,silent:false,legacyWaves:waves});
   return settings({name:input.name||'Imported F1 Instrument',params:input.recipe?.params,material:m});
  }
  if(input?.schema==='xensonar.fractalia')return settings(input);
  throw Error('This file is not a Fractalia instrument');
 }
 async function compile({grid,tracks,durationSec,instrument={},onProgress,check=()=>{}}){
  const recipe=settings(instrument),m=recipe.material||capture({grid,tracks,durationSec}),p=recipe.params,states=[];let peak=0;
  for(let si=0;si<STATES;si++){check();const u=si/(STATES-1),shift=(u-.5)*.36*p.motion,wave=new Float64Array(SIZE);
   for(let i=0;i<SIZE;i++){
    const phase=i/SIZE,a=TAU*phase,contour=read(m.contour,phase+shift),edge=read(m.detail,phase*2-shift),ink=read(m.energy,phase+shift);
    let x;
    if(m.legacyWaves)x=read(m.legacyWaves[Math.min(m.legacyWaves.length-1,Math.round(u*(m.legacyWaves.length-1)))],phase);
    else {
     // Curvature warps phase within each cycle. Fold recursion operates on this
     // excitation, then the drawn resonant body filters its complete spectrum.
     const bent=a+p.fold*(contour*1.8+(edge-.5)*Math.sin(a)*1.2);
     if(p.body==='reed'){const z=Math.sin(bent)+(.26+ink*.38)*Math.sin(2*bent+.7*m.asymmetry);x=Math.tanh(z*(1.8+p.fold*2.8))-(.15+m.asymmetry*.12)*z*z}
     else if(p.body==='hollow')x=Math.sin(bent)*(.52+.48*Math.cos(2*a+contour*2.4))+.32*Math.sin(3*bent+ink*1.5);
     else x=Math.sin(bent+(.7+edge*1.9)*Math.sin(3*a+contour))+.28*Math.cos(5*a-ink*2.8);
     for(let d=0;d<p.depth;d++){const branch=read(m.contour,phase*(2+d)+shift),amount=p.fold*(.38+edge*.55)/(1+d*.42);x=Math.sin(bent+amount*x*(1.3+branch))*.8+x*.2}
    }
    wave[i]=m.silent?0:x;
   }
   const re=wave,im=new Float64Array(SIZE);fft(re,im);re[0]=im[0]=0;
   // Frequency-dependent body from the vertical ink profile, rather than
   // adding an unrelated hiss source or another copy of the carrier melody.
   for(let h=1;h<=SIZE/2;h++){
    const position=.5+Math.log2(h)/12,res=read(m.profile,position,false),fine=read(m.detail,Math.log2(h+1)*.27+u*.12);
    const tilt=Math.pow(h,-(.12+(1-p.brightness)*1.35));let body=.32+res*2.8+fine*.45;
    if(p.body==='hollow')body*=h%2?.95:.18+res*.5;
    if(p.body==='reed')body*=h%2?1.2:.42+inkMean(m)*.25;
    re[h]*=tilt*body;im[h]*=tilt*body;if(h<SIZE/2){re[SIZE-h]=re[h];im[SIZE-h]=-im[h]}
   }
   const banks=LEVELS.map(limit=>{const r=new Float64Array(SIZE),q=new Float64Array(SIZE);for(let h=1;h<=limit;h++){r[h]=r[SIZE-h]=re[h];q[h]=im[h];q[SIZE-h]=-im[h]}fft(r,q,true);const table=Float32Array.from(r);for(const v of table)peak=Math.max(peak,Math.abs(v));return table});states.push(banks);onProgress?.((si+1)/STATES);
  }
  const trim=peak>0?.66/peak:1;for(const banks of states)for(const t of banks)for(let i=0;i<t.length;i++)t[i]*=trim;
  const baseModes=p.body==='prism'?[1.41421356,2.731,4.113]:p.body==='hollow'?[1.005,2.007,3.013]:[1.002,2.001,3.004];
  const modeMix=m.silent||m.legacyWaves?0:p.body==='prism'?.22:p.body==='hollow'?.09:.025;
  const modes=baseModes.map((r,i)=>({ratio:r*(1+m.roughness*.035*(i+1)),gain:modeMix*(.7+.3*read(m.profile,.58+i*.13,false))/(i+1)}));
  const key=JSON.stringify({params:p,material:m});check();return {engine:ENGINE,recipe,material:m,states,levels:LEVELS,modes,key,bytes:STATES*LEVELS.length*SIZE*4};
 }
 function inkMean(m){return m.energy.reduce((a,b)=>a+b,0)/POINTS}
 const sine=Float32Array.from({length:2048},(_,i)=>Math.sin(TAU*i/2048));
 function oscillator(table,phase){const pos=phase*table.length,i=Math.floor(pos),f=pos-i;return table[i]+(table[(i+1)%table.length]-table[i])*f}
 async function renderPCM({tracks=[],durationSec,instrument={},atlas=null,grid,sampleRate=48000,onProgress,check=()=>{}}){
  if(!Number.isFinite(durationSec)||durationSec<=0||durationSec>600||!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000)throw Error('Invalid Fractalia render bounds');
  const frames=Math.ceil(durationSec*sampleRate);if(frames>24000000)throw Error('Fractalia figure is too long for this sample rate');
  atlas??=await compile({grid,tracks,durationSec,instrument,check});const left=new Float32Array(frames),p=atlas.recipe.params;
  const block=64,lastYield={time:Date.now()},edge=Math.min(32,frames/2);
  for(let ti=0;ti<tracks.length;ti++){
   const track=tracks[ti],phases=new Float64Array(atlas.modes.length);let phase=0,active=false,age=0,lastHz=220;
   const gainAt=typeof track.gainAt==='function'?t=>clamp(track.gainAt(t)):t=>clamp(track.at(t)?.gain);
   for(let start=0;start<frames;start+=block){const count=Math.min(block,frames-start),a=track.at((start+.5)/sampleRate),b=track.at((start+count-.5)/sampleRate);
    let hz0=Number.isFinite(a?.hz)&&a.hz>0?a.hz:lastHz,hz1=b?.gain>0&&b.hz>0?b.hz:hz0;
    for(let j=0;j<count;j++){
     const i=start+j,t=(i+.5)/sampleRate,g=gainAt(t);if(g<=1e-8){active=false;continue}
     if(!active){const onset=track.at(t);hz0=onset.hz>0?onset.hz:hz0;phase=0;phases.fill(0);age=0;active=true}
     let hz=hz0+(hz1-hz0)*j/count;const top=Math.min(12000,sampleRate*.43);
     if(hz<20)hz*=2**Math.ceil(Math.log2(20/Math.max(1e-20,hz)));if(hz>top)hz*=2**Math.floor(Math.log2(top/hz));hz=clamp(hz,20,top);lastHz=hz;
     const available=sampleRate*.44/hz,l=Math.max(0,Math.min(LEVELS.length-1,Math.floor(Math.log2(available)))),lo=Math.max(0,l-1),blend=l===0?0:clamp(Math.log2(available/LEVELS[l]));
     const state=clamp(.15+age*(.25+p.motion*1.5)+g*.12*p.motion)*(STATES-1),sa=Math.floor(state),sb=Math.min(STATES-1,sa+1),mix=state-sa;
     const aa=oscillator(atlas.states[sa][lo],phase),ab=oscillator(atlas.states[sa][l],phase),ba=oscillator(atlas.states[sb][lo],phase),bb=oscillator(atlas.states[sb][l],phase);
     let v=(aa+(ab-aa)*blend)*(1-mix)+(ba+(bb-ba)*blend)*mix;
     for(let k=0;k<phases.length;k++){const mode=atlas.modes[k],frequency=hz*mode.ratio;if(frequency<sampleRate*.44)v+=oscillator(sine,phases[k])*mode.gain;phases[k]=wrap(phases[k]+frequency/sampleRate)}
     const guard=typeof track.guardAt==='function'?clamp(track.guardAt(t)):1;left[i]+=v*g*guard*Math.min(1,age*sampleRate/24)*.72;phase=wrap(phase+hz/sampleRate);age+=1/sampleRate;
    }
    if((start&4095)===0){check();if(Date.now()-lastYield.time>16){onProgress?.((ti+start/frames)/Math.max(1,tracks.length));await new Promise(r=>setTimeout(r,0));lastYield.time=Date.now()}}
   }
   check();onProgress?.((ti+1)/Math.max(1,tracks.length));
  }
  for(let i=0;i<frames;i++){const x=left[i];if(!Number.isFinite(x))throw Error('Invalid Fractalia audio');const v=Math.abs(x)>.85?Math.sign(x)*(.85+.13*Math.tanh((Math.abs(x)-.85)/.13)):x;left[i]=v*Math.min(1,i/edge,(frames-1-i)/edge)}
  check();onProgress?.(1);return {left,sampleRate,atlas,engine:ENGINE};
 }
 return Object.freeze({ENGINE,SIZE,STATES,POINTS,LEVELS,settings,material,capture,compile,renderPCM,importInstrument,fft});
}
if(typeof module!=='undefined'&&module.exports)module.exports=createFractaliaLegacyCore;
