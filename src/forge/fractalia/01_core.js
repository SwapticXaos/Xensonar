/* Fractalia F3 · Spectral Instruments.
   Every raster cell contributes to an integrated 24 x 128 spectral field.
   The field supplies excitation, partial spacing and within-note evolution;
   carrier tracks alone supply notes, tuning, timing and dynamics.
   F2 material is rendered by the unchanged, explicit legacy engine. */
function createFractaliaCore({resolution='standard'}={}){
 const legacy=typeof createFractaliaLegacyCore==='function'?createFractaliaLegacyCore():require('./00_legacy_f2.js')();
 const ENGINE='fractalia-spectral-instrument-f3',SIZE=2048,STATES=resolution==='fine'?17:9,COLUMNS=resolution==='fine'?48:24,ROWS=resolution==='fine'?256:128,LEVELS=[1,2,4,8,16,32,64,128,256,512],TAU=Math.PI*2;
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a)),wrap=v=>v-Math.floor(v),fft=legacy.fft;
 const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){for(const x of Object.values(v))freeze(x);Object.freeze(v)}return v};
 const lerp=(a,b,t)=>a+(b-a)*t;
 function material(input){
  if(input?.version===2)return legacy.material(input);
  if(input?.schema!=='xensonar.fractalia-material'||input.version!==3)throw Error('Unsupported Fractalia material');
  if(![[24,128],[48,256]].some(([c,r])=>input.columns===c&&input.rows===r)||!Array.isArray(input.field)||input.field.length!==input.columns*input.rows||!input.field.every(v=>Number.isFinite(v)&&v>=0&&v<=1))throw Error('Invalid Fractalia spectral field');
  if(input.silent!==false||!input.field.some(v=>v>0))throw Error('The instrument contains no sound-colour material');
  return freeze({schema:input.schema,version:3,columns:input.columns,rows:input.rows,field:input.field.slice(),silent:false});
 }
 function settings(input={}){
  if(input.material?.version===2||input.version===1||input.version===2)return freeze({...legacy.settings(input),instrumentId:typeof input.instrumentId==='string'?input.instrumentId:null});
  if(input.schema&&input.schema!=='xensonar.fractalia')throw Error('Invalid Fractalia recipe');
  if(input.version!=null&&input.version!==3)throw Error('Unsupported Fractalia recipe version');
  const p=input.params||input,n=(k,d,a=0,b=1)=>Number.isFinite(p[k])?clamp(p[k],a,b):d;
  return freeze({schema:'xensonar.fractalia',version:3,engine:ENGINE,name:String(input.name||'Spectral Instrument').slice(0,120),instrumentId:typeof input.instrumentId==='string'?input.instrumentId:null,params:{body:['prism','reed','hollow'].includes(p.body)?p.body:'prism',depth:Math.round(n('depth',2,0,4)),fold:n('fold',.7,0,1.5),motion:n('motion',.5),brightness:n('brightness',.65),geometry:n('geometry',.8)},material:input.material?material(input.material):null});
 }
 function describe(m){
  if(m.version===2)return {legacy:true,roughness:m.roughness,level:Array(COLUMNS).fill(1)};
  if(m.columns!==COLUMNS||m.rows!==ROWS)return createFractaliaCore({resolution:m.rows===256?'fine':'standard'}).describe(m);
  const field=m.field,profile=new Float64Array(ROWS),levels=[],centers=[];let first=COLUMNS,last=0,total=0;
  for(let x=0;x<COLUMNS;x++){let sum=0,center=0;for(let y=0;y<ROWS;y++){const v=field[x*ROWS+y];profile[y]+=v;sum+=v;center+=y*v}levels.push(Math.sqrt(sum/ROWS));centers.push(sum?center/sum:NaN);if(sum>1e-9){first=Math.min(first,x);last=x}total+=sum}
  // The lowest resolved band, rather than its faint lower edge, defines
  // the pitch reference. Its width remains part of the instrument.
  const threshold=Math.max(...profile)*1e-4;let firstBand=0;while(firstBand<ROWS-1&&profile[firstBand]<=threshold)firstBand++;
  let baseMass=0,baseMoment=0;for(let y=firstBand;y<ROWS&&profile[y]>threshold;y++){baseMass+=profile[y];baseMoment+=profile[y]*y}const base=baseMass?baseMoment/baseMass:firstBand;
  let roughness=0,pairs=0,previous=null;for(let x=first;x<=last;x++){if(Number.isFinite(centers[x])){if(previous!==null){roughness+=Math.abs(centers[x]-previous)/ROWS;pairs++}previous=centers[x]}}
  let mean=0;for(let y=0;y<ROWS;y++)mean+=y*profile[y];mean/=Math.max(total,1e-20);let variance=0;for(let y=0;y<ROWS;y++)variance+=(y-mean)**2*profile[y];
  const maxLevel=Math.max(1e-20,...levels);return {profile,levels:levels.map(v=>v/maxLevel),centers,first:Math.min(first,COLUMNS-1),last,base,total,roughness:clamp(roughness/Math.max(1,pairs)*10),width:Math.sqrt(variance/Math.max(total,1e-20))/ROWS};
 }
 function capture({grid,tracks=[],durationSec=1,resolution:requested=resolution}={}){
  if(requested!==resolution)return createFractaliaCore({resolution:requested}).capture({grid,tracks,durationSec});
  const field=new Float64Array(COLUMNS*ROWS);
  if(grid?.width>0&&grid.height>1){
   const w=grid.width,h=grid.height;
   // Area overlap, not a point sample: a narrow stroke between analysis-bin
   // centres still transfers all of its energy to the neighbouring cells.
   for(let x=0;x<w;x++){const column=grid.getColumn(x),x0=x/w*COLUMNS,x1=(x+1)/w*COLUMNS;
    for(let y=0;y<h;y++){const v=clamp(column[y]);if(v<=0)continue;const y0=(h-1-y)/h*ROWS,y1=(h-y)/h*ROWS;
     for(let a=Math.floor(x0);a<Math.min(COLUMNS,Math.ceil(x1));a++)for(let b=Math.floor(y0);b<Math.min(ROWS,Math.ceil(y1));b++)field[a*ROWS+b]+=v*v*(Math.min(a+1,x1)-Math.max(a,x0))*(Math.min(b+1,y1)-Math.max(b,y0));
    }
   }
  }else for(let x=0;x<COLUMNS;x++)for(const t of tracks){const s=t.at((x+.5)/COLUMNS*durationSec),v=clamp(s?.gain);if(v<=0)continue;const p=clamp(Math.log2(Math.max(20,s.hz||220)/20)/Math.log2(1000))*(ROWS-1),i=Math.floor(p);field[x*ROWS+i]+=v*v*(1-(p-i));if(i+1<ROWS)field[x*ROWS+i+1]+=v*v*(p-i)}
  const maximum=Math.max(...field);if(maximum<=1e-16)throw Error('Draw or import a sound-colour template first');
  return material({schema:'xensonar.fractalia-material',version:3,columns:COLUMNS,rows:ROWS,field:Array.from(field,v=>v/maximum),silent:false});
 }
 function example(kind){
  const specs={glass:{name:'Glass Branches',body:'prism',geometry:1,fold:.65,depth:2,brightness:.8,motion:.65},reed:{name:'Reed Weave',body:'reed',geometry:.25,fold:1.1,depth:3,brightness:.72,motion:.55},hollow:{name:'Hollow Bloom',body:'hollow',geometry:.85,fold:.5,depth:1,brightness:.55,motion:.3}},spec=specs[kind];if(!spec)throw Error('Unknown example instrument');
  const field=[];for(let x=0;x<COLUMNS;x++){const u=x/(COLUMNS-1);for(let y=0;y<ROWS;y++){
   let bands;if(kind==='glass')bands=[[22,.7,1],[39+Math.sin(u*TAU)*2,.8,.8],[66+u*5,1.2,.6],[94,1,.35*(1-u)]];
   else if(kind==='reed')bands=[1,3,5,7].map((h,i)=>[18+Math.log2(h)/6*ROWS+Math.sin(u*TAU*2)*.7,1.2+u*2,1/(1+i*.55)]);
   else bands=[[20+u*4,2+u*2,.65],[50+Math.sin(u*Math.PI)*9,3+u*4,1],[86-u*12,2+u*3,.65]];
   let v=0;for(const [center,width,gain]of bands)v+=gain*Math.exp(-.5*((y-center)/width)**2);field.push(clamp(v*v));
  }}
  return settings({name:spec.name,params:spec,material:{schema:'xensonar.fractalia-material',version:3,columns:COLUMNS,rows:ROWS,field,silent:false}});
 }
 function importInstrument(input){
  if(input?.schema==='xensonar.fractalia-instrument'&&[2,3].includes(input.version)){
   if(!input.recipe?.material)throw Error('This file has settings but no saved instrument material');
   const r=settings(input.recipe);if(r.material.silent)throw Error('The instrument material is empty');
   if(input.version!==r.version)throw Error('Instrument and material versions do not match');
   if(input.engine&&input.engine!==r.engine||input.recipe.engine&&input.recipe.engine!==r.engine)throw Error('Unsupported instrument engine');return r;
  }
  if(input?.schema==='xensonar.fractalia-atlas'&&input.version===1)return legacy.importInstrument(input);
  throw Error('Choose a complete Fractalia instrument file, not a settings recipe');
 }
 function sample(table,phase){const pos=wrap(phase)*table.length,i=Math.floor(pos),f=pos-i;return lerp(table[i],table[(i+1)%table.length],f)}
 const sine=Float32Array.from({length:4096},(_,i)=>Math.sin(TAU*i/4096));
 function groupsFor(profile){
  const groups=[];let current=null;const threshold=Math.max(...profile)*1e-4;
  // Faint inter-band tails stay in the fully integrated harmonic spectrum.
  // Thresholding here only locates resolved regions for the eight modal voices.
  for(let y=0;y<ROWS;y++){if(profile[y]<=threshold){current=null;continue}if(!current){current={from:y,to:y,mass:0,moment:0};groups.push(current)}current.to=y;current.mass+=profile[y];current.moment+=profile[y]*y}
  // Split broad bands into resolved regions. If there are too many regions,
  // merge the nearest pair; no energy is discarded by the bounded modal bank.
  while(groups.length<8){let index=-1,width=2;for(let i=0;i<groups.length;i++)if(groups[i].to-groups[i].from>width){width=groups[i].to-groups[i].from;index=i}if(index<0)break;const g=groups[index],mid=Math.floor((g.from+g.to)/2),parts=[];for(const [a,b] of [[g.from,mid],[mid+1,g.to]]){let mass=0,moment=0;for(let y=a;y<=b;y++){mass+=profile[y];moment+=profile[y]*y}parts.push({from:a,to:b,mass,moment})}groups.splice(index,1,...parts)}
  while(groups.length>8){let index=0,distance=Infinity;for(let i=0;i<groups.length-1;i++){const d=groups[i+1].moment/groups[i+1].mass-groups[i].moment/groups[i].mass;if(d<distance){distance=d;index=i}}const a=groups[index],b=groups[index+1];groups.splice(index,2,{from:a.from,to:b.to,mass:a.mass+b.mass,moment:a.moment+b.moment})}
  return groups;
 }
 async function compile({grid,tracks,durationSec,instrument={},onProgress,check=()=>{}}){
  const recipe=settings(instrument);if(recipe.version===2)return legacy.compile({grid,tracks,durationSec,instrument:recipe,onProgress,check});
  if(recipe.material&&recipe.material.rows!==ROWS)return createFractaliaCore({resolution:recipe.material.rows===256?'fine':'standard'}).compile({grid,tracks,durationSec,instrument:recipe,onProgress,check});
  const m=recipe.material||capture({grid,tracks,durationSec}),d=describe(m),p=recipe.params,states=[],stateProfiles=[],levels=[],groups=groupsFor(d.profile);let peak=0;
  const ratio=y=>2**((y-d.base)/ROWS*6);
  for(let s=0;s<STATES;s++){check();const at=d.first+(d.last-d.first)*s/(STATES-1),profile=new Float64Array(ROWS);let weight=0;
   for(let x=Math.max(d.first,Math.floor(at)-1);x<=Math.min(d.last,Math.ceil(at)+1);x++){const w=Math.max(0,1-Math.abs(at-x)/1.5);weight+=w;for(let y=0;y<ROWS;y++)profile[y]+=m.field[x*ROWS+y]*w}
   if(weight)for(let y=0;y<ROWS;y++)profile[y]/=weight;stateProfiles.push(profile);
   const amplitudes=new Float64Array(SIZE/2+1),phases=new Float64Array(SIZE/2+1);let mass=0;
   for(let y=0;y<ROWS;y++){if(profile[y]<=0)continue;const r=ratio(y),energy=profile[y],h=Math.max(1,Math.min(256,r)),lo=Math.floor(h),f=h-lo;
    // Each energy cell contributes to both neighbouring harmonic regions.
    // The exact spacing is additionally retained by the modal bank below.
    amplitudes[lo]+=energy*(1-f);amplitudes[lo+1]+=energy*f;mass+=energy;
   }
   levels.push(Math.sqrt(mass/Math.max(1e-20,Math.max(...d.profile))));
   const re=new Float64Array(SIZE),im=new Float64Array(SIZE);
   for(let h=1;h<=512;h++){
    let a=Math.sqrt(amplitudes[h])*Math.pow(h,-(.08+(1-p.brightness)*.25));
    if(p.body==='reed')a*=h%2?1.25:.38;
    if(p.body==='hollow')a*=.2+.8*Math.abs(Math.sin(h*(.18+d.width*.8)));
    phases[h]=(.25+d.roughness*.7)*Math.sin(h*(.6+d.width*8)+s*.14*p.motion);
    re[h]=re[SIZE-h]=a*Math.sin(phases[h]);im[h]=-a*Math.cos(phases[h]);im[SIZE-h]=-im[h];
   }
   fft(re,im,true);const maximum=Math.max(1e-12,...re.map(Math.abs)),wave=Float64Array.from(re,v=>v/maximum);
   // Recursive phase folds process the material waveform itself. A bounded
   // parallel share of the original excitation survives every fold stage.
   for(let i=0;i<SIZE;i++){const phase=i/SIZE;let v=wave[i];for(let depth=0;depth<p.depth;depth++){
    const shift=p.fold*(.04+.06*d.roughness)/(depth+1),bent=phase+shift*v,branch=sample(wave,bent*(depth+2)),amount=clamp(p.fold*.16/(1+depth*.3),0,.24);v=lerp(v,sample(wave,bent)+branch*.22,amount)}
    if(p.body==='reed')v=lerp(v,Math.tanh(v*(1.5+p.fold))-.12*v*v,.4);
    if(p.body==='hollow')v=lerp(v,v-.65*sample(wave,phase+.06+d.width*.24),.5);
    re[i]=v;im[i]=0;
   }
   fft(re,im);re[0]=im[0]=0;
   for(let h=1;h<SIZE/2;h++){const shade=Math.pow(h,-(1-p.brightness)*1.4);re[h]*=shade;im[h]*=shade;re[SIZE-h]=re[h];im[SIZE-h]=-im[h]}
   const banks=LEVELS.map(limit=>{const r=new Float64Array(SIZE),q=new Float64Array(SIZE);for(let h=1;h<=limit;h++){r[h]=r[SIZE-h]=re[h];q[h]=im[h];q[SIZE-h]=-im[h]}fft(r,q,true);const table=Float32Array.from(r);for(const v of table)peak=Math.max(peak,Math.abs(v));return table});states.push(banks);onProgress?.((s+1)/STATES);await new Promise(resolve=>setTimeout(resolve,0));
  }
  const trim=.7/Math.max(peak,1e-12);for(const b of states)for(const table of b)for(let i=0;i<table.length;i++)table[i]*=trim;
  const modeStrength=p.geometry*(p.body==='prism'?.8:p.body==='hollow'?.62:.42),modes=groups.map(g=>{
   const exact=ratio(g.moment/g.mass),nearest=Math.max(1,Math.round(exact)),r=lerp(nearest,exact,p.geometry),spread=(g.to-g.from)/ROWS;
   const gains=stateProfiles.map(pr=>{let mass=0;for(let y=g.from;y<=g.to;y++)mass+=pr[y];return Math.sqrt(mass)});
   return {ratio:r,gains,spread,decay:.04+(1-clamp(spread*8))*.35};
  });
  const maxMode=Math.max(1e-12,...Array.from({length:STATES},(_,s)=>modes.reduce((sum,mode)=>sum+mode.gains[s],0)));
  for(const mode of modes)mode.gains=mode.gains.map(v=>v/maxMode*modeStrength*Math.pow(mode.ratio,-(1-p.brightness)*1.4));
  const maxLevel=Math.max(1e-12,...levels),normalizedLevels=levels.map(v=>v/maxLevel);
  check();return {engine:ENGINE,recipe,material:m,states,levels:LEVELS,modes,modeStrength,stateLevels:normalizedLevels,
   evolutionSec:.12+(1-p.motion)*1.4+d.roughness*.25,releaseSec:.008+d.width*.12+(p.body==='prism'?.04:p.body==='hollow'?.025:.008),roughness:d.roughness,
   key:JSON.stringify({engine:ENGINE,params:p,material:m}),bytes:STATES*LEVELS.length*SIZE*4};
 }
 async function renderPCM({tracks=[],durationSec,instrument={},atlas=null,grid,sampleRate=48000,onProgress,check=()=>{}}){
  if(atlas?.recipe.version===2||!atlas&&settings(instrument).version===2)return legacy.renderPCM({tracks,durationSec,instrument,atlas,grid,sampleRate,onProgress,check});
  if(!Number.isFinite(durationSec)||durationSec<=0||durationSec>600||!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000)throw Error('Invalid Fractalia render bounds');
  const frames=Math.ceil(durationSec*sampleRate);if(frames>24000000)throw Error('Fractalia figure is too long for this sample rate');
  if(!tracks.length){check();return {left:new Float32Array(frames),sampleRate,atlas,engine:ENGINE}}
  atlas??=await compile({grid,tracks,durationSec,instrument,check});const p=atlas.recipe.params;const left=new Float32Array(frames),block=64;let lastYield=Date.now();
  for(let ti=0;ti<tracks.length;ti++){
   const track=tracks[ti],phases=new Float64Array(atlas.modes.length),increments=new Float64Array(phases.length),gains=new Float64Array(phases.length);let phase=0,age=0,lastHz=220,lastGain=0,releaseAge=0,active=false;
   const gainAt=typeof track.gainAt==='function'?t=>clamp(track.gainAt(t)):t=>clamp(track.at(t)?.gain);
   for(let start=0;start<frames;start+=block){
    if((start&4095)===0){check();if(Date.now()-lastYield>16){onProgress?.((ti+start/frames)/Math.max(1,tracks.length));await new Promise(r=>setTimeout(r,0));lastYield=Date.now()}}
    const count=Math.min(block,frames-start);let a=track.at((start+.5)/sampleRate);const b=track.at((start+count-.5)/sampleRate),positive=a?.gain>1e-8||b?.gain>1e-8;
    if(!active&&!positive){let found=false;for(let j=0;j<count;j++)if(gainAt((start+j+.5)/sampleRate)>1e-8){a=track.at((start+j+.5)/sampleRate);found=true;break}if(!found)continue}
    const audible=hz=>{hz=Number.isFinite(hz)&&hz>0?hz:lastHz;const top=Math.min(12000,sampleRate*.43);if(hz<20)hz*=2**Math.ceil(Math.log2(20/Math.max(1e-20,hz)));if(hz>top)hz*=2**Math.floor(Math.log2(top/hz));return clamp(hz,20,top)};
    let hz0=audible(a?.gain>0?a.hz:lastHz),hz1=audible(b?.gain>0?b.hz:hz0);lastHz=hz1;
    const available=sampleRate*.44/Math.max(hz0,hz1),l=Math.max(0,Math.min(LEVELS.length-1,Math.floor(Math.log2(available)))),lo=Math.max(0,l-1),blend=l?clamp(Math.log2(available/LEVELS[l])):0;
    const onsetPending=!active||releaseAge>0&&positive;
    const normalState=Math.min(.72,age/atlas.evolutionSec*.72),releaseState=.72+.28*clamp(releaseAge/atlas.releaseSec),state=(onsetPending?0:releaseAge?releaseState:normalState)*(atlas.states.length-1),sa=Math.floor(state),sb=Math.min(atlas.states.length-1,sa+1),mix=state-sa;
    const ta=atlas.states[sa][lo],tb=atlas.states[sa][l],tc=atlas.states[sb][lo],td=atlas.states[sb][l],stateGain=.7+.3*lerp(atlas.stateLevels[sa],atlas.stateLevels[sb],mix);
    for(let k=0;k<phases.length;k++){const mode=atlas.modes[k],frequency=Math.max(hz0,hz1)*mode.ratio;increments[k]=mode.ratio/sampleRate;const transient=p.body==='prism'?.28+.72*Math.exp(-age/mode.decay):p.body==='hollow'?.5+.5*Math.exp(-age/(mode.decay*1.4)):.9+.1*Math.exp(-age/mode.decay);gains[k]=lerp(mode.gains[sa],mode.gains[sb],mix)*transient*Math.exp(-releaseAge/(mode.decay*.4))*clamp((sampleRate*.46-frequency)/(sampleRate*.06))}
    for(let j=0;j<count;j++){
     const i=start+j,t=(i+.5)/sampleRate,g=gainAt(t);let gain=g;
     if(g>1e-8){if(!active||releaseAge>0){active=true;age=0;phase=0;phases.fill(0);const onset=track.at(t);hz0=audible(onset?.hz);hz1=positive?hz1:hz0}releaseAge=0;lastGain=g;gain*=Math.min(1,age*sampleRate/24)}
     else if(active){releaseAge+=1/sampleRate;if(releaseAge>=atlas.releaseSec){active=false;lastGain=0;continue}gain=lastGain*(1-releaseAge/atlas.releaseSec)**2}
     else continue;
     const hz=lerp(hz0,hz1,j/count),aa=sample(ta,phase),ab=sample(tb,phase),ba=sample(tc,phase),bb=sample(td,phase);
     let v=lerp(lerp(aa,ab,blend),lerp(ba,bb,blend),mix)*(1-atlas.modeStrength*.5);
     for(let k=0;k<phases.length;k++){v+=sample(sine,phases[k])*gains[k];phases[k]=wrap(phases[k]+hz*increments[k])}
     const guard=typeof track.guardAt==='function'&&g>0?clamp(track.guardAt(t)):1;
     left[i]+=v*gain*guard*stateGain*.65;phase=wrap(phase+hz/sampleRate);age+=1/sampleRate;
    }
   }
   check();onProgress?.((ti+1)/Math.max(1,tracks.length));
  }
  const edge=Math.min(48,frames/2);for(let i=0;i<frames;i++){let v=left[i];if(!Number.isFinite(v))throw Error('Invalid Fractalia audio');if(Math.abs(v)>.9)v=Math.sign(v)*(.9+.08*Math.tanh((Math.abs(v)-.9)/.08));left[i]=v*Math.min(1,i/edge,(frames-1-i)/edge)}
  check();return {left,sampleRate,atlas,engine:ENGINE};
 }
 return Object.freeze({ENGINE,SIZE,STATES,POINTS:128,COLUMNS,ROWS,LEVELS,settings,material,capture,describe,example,compile,renderPCM,importInstrument,fft,legacy});
}
if(typeof module!=='undefined'&&module.exports)module.exports=createFractaliaCore;
