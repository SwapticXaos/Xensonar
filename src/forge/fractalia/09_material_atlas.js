/* Material revision 1. The full measured spectrum and full captured field are
   authoritative. Small families are descriptors, never a partial-count limit. */
function createFractaliaMaterialEngine() {
 const {complexFFT:fft}=__forgeMaterialToolsFactory(),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 const lerp=(a,b,t)=>a+(b-a)*t,tick=()=>new Promise(r=>setTimeout(r,0));
 function sample(a,u){const x=clamp(u)*(a.length-1),i=Math.floor(x);return lerp(a[i],a[Math.min(i+1,a.length-1)],x-i)}
 async function analyze(model,{check=()=>{},onProgress=()=>{}}={}) {
  const sr=model.sampleRate,windows=model.sourceIndex.windows;
  const shortest=Math.min(...windows.map(w=>w.endSample-w.startSample+1));
  const size=Math.min(4096,2**Math.floor(Math.log2(Math.max(128,Math.min(shortest,sr*.09))))),bins=size/2+1;
  const floor=Math.max(20,sr/size),top=sr*.45,B=192,power=new Float64Array(bins),frames=[];
  let energy=0,count=0;for(const w of windows)for(let i=w.startSample;i<=w.endSample;i++){energy+=model.samples[i]**2;count++;if(i%32768===0){check();await tick()}}
  const re=new Float64Array(size),im=new Float64Array(size);
  for(const w of windows){
   const n=Math.max(1,Math.ceil(40*(w.endSample-w.startSample+1)/Math.max(1,count)));
   for(let f=0;f<n;f++){
    check();const center=w.startSample+(w.endSample-w.startSample)*(f+.5)/n;
    re.fill(0);im.fill(0);for(let j=0;j<size;j++){const at=Math.round(center+j-size/2);re[j]=(at>=w.startSample&&at<=w.endSample?model.samples[at]:0)*Math.sin(Math.PI*(j+.5)/size)}
    fft(re,im);const profile=new Float64Array(B);let sum=0,centroid=0;
    for(let k=1;k<bins-1;k++){const hz=k*sr/size,p=re[k]**2+im[k]**2;power[k]+=p;sum+=p;centroid+=p*Math.log(Math.max(floor,hz));
     if(hz>=floor&&hz<=top){const u=Math.log(hz/floor)/Math.log(top/floor)*(B-1),a=Math.floor(u),d=u-a;profile[a]+=p*(1-d);profile[Math.min(B-1,a+1)]+=p*d}}
    const total=profile.reduce((a,b)=>a+b,0)||1;frames.push({windowId:w.id,sourceSample:center,profile:Array.from(profile,v=>v/total),centroidHz:Math.exp(centroid/Math.max(1e-20,sum))});
    onProgress(Math.min(.95,frames.length/45));await tick();
   }
  }
  if(!(energy>1e-16))throw Error('The allowed donor material is silent.');
  const profile=new Float64Array(B);for(const f of frames)for(let i=0;i<B;i++)profile[i]+=f.profile[i]/frames.length;
  const cdf=[],frequencies=[];let sum=0;for(let i=0;i<B;i++){sum+=profile[i];cdf.push(sum);frequencies.push(floor*(top/floor)**(i/(B-1)))}
  for(let i=0;i<B;i++)cdf[i]/=sum;
  const maximum=Math.max(...power),peaks=[];
  for(let k=2;k<bins-2;k++)if(power[k]>maximum*.007&&power[k]>power[k-1]&&power[k]>=power[k+1]){const l=Math.log(Math.max(1e-20,power[k-1])),m=Math.log(Math.max(1e-20,power[k])),r=Math.log(Math.max(1e-20,power[k+1]));const off=clamp(.5*(l-r)/(l-2*m+r||1),-.5,.5);peaks.push({hz:(k+off)*sr/size,energy:power[k]});}
  let entropy=0;for(const v of profile)if(v>0)entropy-=v*Math.log(v);const richness=clamp((peaks.length-1)/8);
  const root=peaks[0]?.hz||0,harmonicEnergy=peaks.reduce((s,p)=>s+(root>0&&Math.abs(p.hz/root-Math.round(p.hz/root))<.04?p.energy:0),0),peakEnergy=peaks.reduce((s,p)=>s+p.energy,0);
  const referenceConfidence=peaks.length>=3?harmonicEnergy/Math.max(1e-20,peakEnergy):0;
  const quantile=q=>{let i=cdf.findIndex(v=>v>=q);i=Math.max(0,i);return frequencies[i]};
  const families=Array.from({length:8},(_,i)=>({id:'donor-region-'+i,lo:quantile(i/8),center:quantile((i+.5)/8),hi:quantile((i+1)/8)}));
  check();onProgress(1);return {revision:1,size,sampleRate:sr,frequencies,cdf,profile:Array.from(profile),frames,peaks,families,richness,entropy,referenceHz:root,referenceConfidence,rms:Math.sqrt(energy/count),sourceSamples:count,floor,top};
 }
 function coordinate(atlas,hz,axis){
  if(axis==='absolute')return clamp(Math.log(Math.max(20,hz)/20)/Math.log(1000));
  if(axis==='relative')return clamp(Math.log2(Math.max(1,hz)/atlas.referenceHz)/6);
  return sample(atlas.cdf,Math.log(Math.max(atlas.floor,hz)/atlas.floor)/Math.log(atlas.top/atlas.floor));
 }
 function prepare(material,relations,atlas,donor){
  if(donor.axis==='relative'&&atlas.referenceConfidence<.65)throw Error('This donor has no reliable harmonic reference. Choose Material energy or Absolute Hz.');
  const R=material.rows,columns=[];let previous=0,baseline=Infinity,maximumCount=0;
  for(let x=relations.first;x<=relations.last;x++){
   const raw=material.field.slice(x*R,(x+1)*R),mass=raw.reduce((a,b)=>a+b,0),profile=Array.from({length:R},(_,i)=>(raw[i]||0)/Math.max(1e-20,mass));
   const bands=relations.bands[x].filter(b=>b.mass>=mass*.025);let near=0,den=0;
   for(let i=0;i<bands.length;i++)for(let j=i+1;j<bands.length;j++){const w=Math.sqrt(bands[i].mass*bands[j].mass);near+=w*Math.exp(-Math.abs(bands[i].center-bands[j].center)/(R*.16));den+=w}
   const mean=profile.reduce((a,v,i)=>a+v*i/R,0),width=Math.sqrt(profile.reduce((a,v,i)=>a+v*(i/R-mean)**2,0));
   baseline=Math.min(baseline,bands.length||baseline);maximumCount=Math.max(maximumCount,bands.length);
   columns.push({profile,near:den?near/den:0,split:clamp((bands.length-baseline)/Math.max(1,baseline)),merge:clamp((maximumCount-bands.length)/Math.max(1,maximumCount)),mean,width,regions:bands.map(b=>({center:b.center/R,width:b.width/R,mass:b.mass/Math.max(1e-20,mass)}))});previous=bands.length;
  }
  const signature=Array(material.rows).fill(0);for(const c of columns)for(let y=0;y<R;y++)signature[y]+=c.profile[y]/columns.length;
  // Coverage refers to actual nonzero source energy. The energy axis addresses
  // quantiles of that energy; empty frequency space is never filled with sound.
  const coverage=relations.modes.map(m=>{const q=m.signature.center/R,hits=atlas.frequencies.reduce((s,hz,i)=>s+atlas.profile[i]*Math.exp(-.5*((coordinate(atlas,hz,donor.axis)-q)/.1)**2),0);return {id:m.id,sourceEnergy:hits}});
  return {revision:1,rows:R,columns,signature,axis:donor.axis,coverage,donor:atlas};
 }
 function frame(mapping,recipe,ageSec,binHz,bins,diagnostics={}){
  const d=recipe.donor,p=recipe.params,A=mapping.donor,u=p.motion===0?0:clamp(ageSec/d.evolutionSec),pos=u*(mapping.columns.length-1),a=Math.floor(pos),b=Math.min(a+1,mapping.columns.length-1),t=pos-a;
  const ca=mapping.columns[a],cb=mapping.columns[b],get=k=>lerp(ca[k],cb[k],t);
  // A global instrument signature is present even in staccato. Local evolution
  // and event age stay distinct from the source-window reading position.
  const profile=ca.profile.map((v,i)=>.45*mapping.signature[i]+.55*lerp(v,cb.profile[i],t));
  const mean=profile.reduce((s,v,i)=>s+v*i/(profile.length-1),0),near=diagnostics.disableNear?0:get('near');
  const split=diagnostics.disableSplit?0:Math.max(get('split'),mapping.columns.reduce((s,c)=>s+c.split,0)/mapping.columns.length*.5),merge=get('merge');
  const gains=new Float64Array(bins),ratios=new Float64Array(bins),branches=recipe.donor.revision>=3?{mix:new Float64Array(bins),span:new Float64Array(bins),balance:new Float64Array(bins),layers:d.layers,innerScale:0}:null;let previousHz=0;
  const localFrames=A.frames.filter(f=>f.windowId===diagnostics.windowId);let localCDF=null;
  if(localFrames.length&&Number.isFinite(diagnostics.sourceSample)){let hi=localFrames.findIndex(f=>f.sourceSample>=diagnostics.sourceSample);if(hi<0)hi=localFrames.length-1;const lo=Math.max(0,hi-1),a=localFrames[lo],b=localFrames[hi],t=clamp((diagnostics.sourceSample-a.sourceSample)/Math.max(1,b.sourceSample-a.sourceSample));let sum=0;localCDF=a.profile.map((v,i)=>(sum+=lerp(v,b.profile[i],t)));localCDF=localCDF.map(v=>v/Math.max(1e-20,sum));}
  const radius=(.045+.18*get('width'))*(p.body==='hollow'?1.3:p.body==='reed'?.8:1),smoothMass=new Float64Array(128),smoothCenter=new Float64Array(128);
  for(let j=0;j<128;j++){const q=j/127;let mass=0,moment=0;for(let i=Math.max(0,Math.floor((q-radius*4)*(profile.length-1)));i<=Math.min(profile.length-1,Math.ceil((q+radius*4)*(profile.length-1)));i++){const at=i/(profile.length-1),w=profile[i]*Math.exp(-.5*((q-at)/radius)**2);mass+=w;moment+=w*at}smoothMass[j]=mass;smoothCenter[j]=mass>1e-12?moment/mass:q;}
  const amount=diagnostics.bypass?0:d.amount,rich=A.richness;
  for(let k=0;k<bins;k++){
   if(k===0){ratios[k]=1;gains[k]=1;continue}
   const hz=Math.max(binHz,k*binHz),baseQ=coordinate(A,hz,mapping.axis),q=mapping.axis==='energy'&&localCDF?.length ? .6*baseQ+.4*sample(localCDF,Math.log(Math.max(A.floor,hz)/A.floor)/Math.log(A.top/A.floor)):baseQ;
   const mass=sample(smoothMass,q),local=sample(smoothCenter,q);
   const strength=amount*rich,tether=clamp((q-.08)/.28)*clamp(Math.log2(hz/Math.max(1,A.referenceHz))/.65),signed=q-local;
   // Near = inward spacing coupling; split = outward separation of existing
   // parts; merge = convergence. They are independent operations, not one gain.
   let displacement=(-near*signed*2.8+split*Math.tanh(signed/.07)*.42-merge*signed*1.8+(local-q)*.65)*(diagnostics.disableWarp?0:d.warp)*strength*tether;
   displacement=clamp(displacement,-.38,.38);
   // Monotone destination, preserving order even at relation transitions.
   let target=hz*2**displacement;target=Math.max(previousHz+binHz*.18,target);previousHz=target;ratios[k]=target/hz;
   const density=clamp(mass/Math.max(.01,radius*2),.12,3),contrast=Math.log(density)*.45;
   const exchange=near*(mean-q)*1.6+split*Math.tanh((q-local)/.06)*.5-merge*Math.abs(q-mean);
   gains[k]=Math.exp(clamp(strength*(diagnostics.disableDistribution?0:d.exchange)*(contrast+exchange),-.9,.9));
   if(branches&&!diagnostics.disableRecombination){const structural=clamp(split*2.8+near*.65+Math.abs(q-local)*1.2);branches.mix[k]=clamp(strength*d.recombine*structural*tether,0,.78);branches.span[k]=(.035+.27*d.warp)*(.35+.65*clamp(Math.abs(signed)/Math.max(.02,radius)+split))*tether;branches.balance[k]=clamp(.5+(local-q)*1.7,.15,.85);}
  }
  if(branches)branches.innerScale=clamp(radius/(.16+get('width')),.16,.6);
  if(amount===0){ratios.fill(1);gains.fill(1)}
  return {gains,ratios,branches,near,split,merge,u};
 }
 return {analyze,prepare,frame,coordinate,sample};
}
if(typeof module!=='undefined'&&module.exports)module.exports=createFractaliaMaterialEngine;
