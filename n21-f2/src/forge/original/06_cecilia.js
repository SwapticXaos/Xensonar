

function __f347OriginalCeciliaDSPFactory(){
 const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
 const yieldTask=()=>new Promise(r=>setTimeout(r,0));
 const check=o=>{if(o?.isCancelled?.())throw new DOMException('Klangberechnung abgebrochen.','AbortError');};
 function fft(re,im,inverse=false){const n=re.length;for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}for(let s=2;s<=n;s*=2){const a=(inverse?2:-2)*Math.PI/s,cs=Math.cos(a),sn=Math.sin(a);for(let from=0;from<n;from+=s){let wr=1,wi=0;for(let k=0;k<s/2;k++){const x=from+k,y=x+s/2,tr=re[y]*wr-im[y]*wi,ti=re[y]*wi+im[y]*wr;re[y]=re[x]-tr;im[y]=im[x]-ti;re[x]+=tr;im[x]+=ti;const tmp=wr*cs-wi*sn;wi=wr*sn+wi*cs;wr=tmp;}}}if(inverse)for(let k=0;k<n;k++){re[k]/=n;im[k]/=n;}}
 async function complement(donor,synth,sr,strength,options){if(strength===0)return synth;const n=2048,hop=512,bands=24,window=Float64Array.from({length:n},(_,i)=>Math.sin(Math.PI*(i+.5)/n));
  const out=new Float32Array(synth.length),weights=new Float32Array(synth.length),dr=new Float64Array(n),di=new Float64Array(n),re=new Float64Array(n),im=new Float64Array(n),smooth=new Float64Array(bands).fill(1),bins=Int16Array.from({length:n/2+1},(_,k)=>clamp(Math.floor(Math.log(Math.max(40,k*sr/n)/40)/Math.log(sr*.5/40)*bands),0,bands-1));
  let frames=0;for(let start=-n+hop;start<synth.length;start+=hop){check(options);dr.fill(0);di.fill(0);re.fill(0);im.fill(0);for(let j=0;j<n;j++){const at=start+j;if(at>=0&&at<synth.length){dr[j]=donor[at]*window[j];re[j]=synth[at]*window[j];}}fft(dr,di);fft(re,im);
   const de=new Float64Array(bands),se=new Float64Array(bands);for(let k=1;k<=n/2;k++){de[bins[k]]+=dr[k]**2+di[k]**2;se[bins[k]]+=re[k]**2+im[k]**2;}
   for(let b=0;b<bands;b++){let d=de[b]*2,s=se[b]*2;if(b){d+=de[b-1];s+=se[b-1];}if(b+1<bands){d+=de[b+1];s+=se[b+1];}const target=1-strength*.75*d/(d+s+1e-18);smooth[b]+=.25*(target-smooth[b]);}
   for(let k=0;k<=n/2;k++){const b=bins[k],gain=(smooth[Math.max(0,b-1)]+smooth[b]*2+smooth[Math.min(bands-1,b+1)])/4;re[k]*=gain;im[k]*=gain;if(k&&k<n/2){re[n-k]*=gain;im[n-k]*=gain;}}
   fft(re,im,true);for(let j=0;j<n;j++){const at=start+j;if(at>=0&&at<out.length){out[at]+=re[j]*window[j];weights[at]+=window[j]**2;}}if(++frames%8===0){options.onProgress?.(.7*(start+n)/Math.max(1,synth.length+n));await yieldTask();}
  }for(let i=0;i<out.length;i++)out[i]/=Math.max(1e-9,weights[i]);return out;
 }
 async function combine(job,donor,synthetic,options={}){const {amount,mode,color}=job.recipe,d=donor.pcm,raw=synthetic.pcm;
  if(d.length!==raw.length)throw Error("Sound sources have different timelines.");
  let s=mode==='spectral'?await complement(d,raw,job.sampleRate,color,options):raw;
  // A broad spectral process may spread energy across an edge. Restore exact carrier support.
  if(s!==raw){for(let i=0;i<s.length;i++)if(!job.support.activeAt(i,s.length))s[i]=0;}
  const out=new Float32Array(d.length),gd=Math.cos(amount*Math.PI/2),gs=Math.sin(amount*Math.PI/2);let ed=0,es=0,em=0,peak=0;
  for(let i=0;i<out.length;i++){const value=amount===1?s[i]:d[i]*gd+s[i]*gs;if(!Number.isFinite(value))throw Error("Non-finite sound value.");out[i]=value;ed+=d[i]**2;es+=s[i]**2;em+=value**2;peak=Math.max(peak,Math.abs(value));if(i%65536===65535){check(options);await yieldTask();}}
  const target=(1-amount)*ed+amount*es,scale=Math.min(1,em>1e-20?Math.sqrt(target/em):1,peak>.9?.9/peak:1);
  if(scale<1)for(let i=0;i<out.length;i++){out[i]*=scale;if(i%65536===65535){check(options);await yieldTask();}}check(options);options.onProgress?.(1);
  return {pcm:out,metrics:{peak:peak*scale,gainCompensation:scale,donorRms:Math.sqrt(ed/out.length),syntheticRms:Math.sqrt(es/out.length),resultRms:Math.sqrt(em/out.length)*scale,spectralStrength:mode==='spectral'?color:0}};
 }
 async function spectrum(samples,sampleRate,options={}){const width=Math.max(64,Math.min(360,Math.ceil(samples.length/sampleRate*55))),height=150,size=2048,values=new Float32Array(width*height),re=new Float64Array(size),im=new Float64Array(size);let maximum=0;
  for(let x=0;x<width;x++){check(options);const center=Math.round((x+.5)/width*samples.length);im.fill(0);for(let i=0;i<size;i++)re[i]=(samples[center+i-size/2]??0)*(.5-.5*Math.cos(2*Math.PI*i/(size-1)));fft(re,im);
   for(let y=0;y<height;y++){const high=35*(sampleRate*.46/35)**(1-y/height),low=35*(sampleRate*.46/35)**(1-(y+1)/height),a=Math.max(1,Math.floor(low/sampleRate*size)),b=Math.min(size/2,Math.max(a,Math.ceil(high/sampleRate*size)));let power=0;for(let k=a;k<=b;k++)power=Math.max(power,Math.hypot(re[k],im[k]));values[y*width+x]=power;maximum=Math.max(maximum,power);}
   if(x%8===7)await yieldTask();
  }return {width,height,values,maximum};
 }
 return Object.freeze({combine,complement,spectrum});
}
const __F352DSPOriginal=__f347OriginalCeciliaDSPFactory();
async function __f352RenderCeciliaOriginal(job,donor,options={}){
 const {plan,length}=job.support,sr=job.sampleRate,parameters=job.cecilia;
 if(plan.bands.length>64)throw Error("The figure contains more than 64 separate voice tracks. Please split the figure.");
 const voice=M3e({...parameters,breath:0,vibratoCents:0,humanize:0},sr,plan.bands.length),out=new Float32Array(length);
 const coupling=job.recipe.mode==='state'?job.recipe.coupling:0,atlas=job.model.atlas,material=donor.material;
 const pole=1-Math.exp(-2*Math.PI*1200/sr),noisePole=1-Math.exp(-2*Math.PI*3000/sr),smooth=1-Math.exp(-1/(sr*.015));
 let done=0;const total=material.runs.reduce((sum,r)=>sum+r.endSample-r.startSample,0);
 for(const run of material.runs){const band=plan.bands[run.voice],count=band.gainCurve.length-1;let low=0,noiseLow=0,noiseSlow=0,seed=(0x9e3779b9^((run.voice+1)*1234567)^run.startSample)>>>0,stage=0,tilt=0,breath=parameters.breath;
  for(let at=run.startSample;at<run.endSample;at++){
   if(at%4096===0){if(options.isCancelled?.())throw new DOMException('Cecilia-Berechnung abgebrochen.','AbortError');options.onProgress?.(done/Math.max(1,total));await new Promise(r=>setTimeout(r,0));}
   const x=at/Math.max(1,length-1)*count,a=Math.floor(x),b=Math.min(count,a+1),fraction=x-a,cell=Math.round(x);
   if(!(band.gainCurve[cell]>0)){done++;continue;}
   const connected=band.gainCurve[a]>0&&band.gainCurve[b]>0;
   const gain=connected?band.gainCurve[a]*(1-fraction)+band.gainCurve[b]*fraction:band.gainCurve[cell];
   const ratio=connected?Math.exp(Math.log(Math.max(1e-9,band.centerRatioCurve[a]))*(1-fraction)+Math.log(Math.max(1e-9,band.centerRatioCurve[b]))*fraction):band.centerRatioCurve[cell];
   const hz=ratio*plan.rootReferenceHz;if(hz>=sr*.4)throw Error("Carrier pitch exceeds the safe range of Cecilia synthesis.");
   while(stage+1<run.states.length&&run.states[stage+1].sample<=at)stage++;
   const state=run.states[stage],next=run.states[Math.min(run.states.length-1,stage+1)],fade=Math.min(1,(at-state.sample)/Math.max(1,next.sample-state.sample)),node=atlas?.nodes?.[state.nodeId]??state,nextNode=atlas?.nodes?.[next.nodeId]??next;
   const air=state.aperiodicity*(1-fade)+next.aperiodicity*fade;
   const centroid=Math.exp(Math.log(Math.max(80,node.centroidHz??1200))*(1-fade)+Math.log(Math.max(80,nextNode.centroidHz??1200))*fade);
   const wantedTilt=coupling*Math.max(-.35,Math.min(.35,Math.log2(centroid/1800)*.15));
   tilt+=smooth*(wantedTilt-tilt);breath+=smooth*(Math.min(.45,parameters.breath+coupling*air*.20)-breath);
   const raw=voice(run.voice,hz,(at-run.startSample)/sr);low+=pole*(raw-low);
   seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;seed>>>=0;
   const random=seed/4294967295*2-1;noiseLow+=noisePole*(random-noiseLow);noiseSlow+=pole*(noiseLow-noiseSlow);
   const value=low*(1-tilt)+(raw-low)*(1+tilt)+(noiseLow-noiseSlow)*breath*.5;
   const edge=Math.max(0,Math.min(1,(at-run.startSample)/(sr*.004),(run.endSample-1-at)/(sr*.006)));
   out[at]+=value*gain*edge*.18*parameters.outputGain;done++;
  }
 }
 let peak=0;for(let i=0;i<out.length;i++){if(!Number.isFinite(out[i]))throw Error("Cecilia produced no valid audio buffer.");peak=Math.max(peak,Math.abs(out[i]));}
 if(peak>.9)for(let i=0;i<out.length;i++)out[i]*=.9/peak;
 options.onProgress?.(1);return {pcm:out,metrics:{peak:Math.min(.9,peak),coupling}};
}