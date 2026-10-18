

function __f347OriginalMaterialFactory(){
 const version='donor-material-f3.56', clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const phase=p=>p-2*Math.PI*Math.round(p/(2*Math.PI));
 const check=o=>{if(o.isCancelled?.())throw new DOMException("Sound Material rendering cancelled.",'AbortError');};
 const tick=()=>new Promise(r=>setTimeout(r,0));
 function complexFFT(real, imag, inverse = false) {
const n = real.length;
if (n !== imag.length || n < 2 || (n & (n - 1)))
throw new Error("FFT requires a power of two.");
for (let i = 1, j = 0; i < n; i++) {
let bit = n >> 1;
for (; j & bit; bit >>= 1)
j ^= bit;
j ^= bit;
if (i < j) {
[real[i], real[j]] = [real[j], real[i]];
[imag[i], imag[j]] = [imag[j], imag[i]];
}
}
for (let size = 2; size <= n; size *= 2) {
const angle = (inverse ? 2 : -2) * Math.PI / size, wr = Math.cos(angle), wi = Math.sin(angle);
for (let start = 0; start < n; start += size) {
let r = 1, im = 0;
for (let k = 0; k < size / 2; k++) {
const a = start + k, b = a + size / 2;
const tr = real[b] * r - imag[b] * im, ti = real[b] * im + imag[b] * r;
real[b] = real[a] - tr;
imag[b] = imag[a] - ti;
real[a] += tr;
imag[a] += ti;
const next = r * wr - im * wi;
im = r * wi + im * wr;
r = next;
}
}
}
if (inverse)
for (let i = 0; i < n; i++) {
real[i] /= n;
imag[i] /= n;
}
}
 function allowedModel(input,cfg){
  const model=input.sourceGrains??input, count=model.samples?.length??0;
  if(count<128)throw Error("The donor selection contains too little sound material.");
  const regions=cfg.regions??[],inc=regions.filter(r=>r.role==='include'),exc=regions.filter(r=>r.role==='exclude');
  let spans=inc.length?inc.map(r=>[Math.ceil(r.start*count),Math.min(count,Math.floor(r.end*count))]):[[0,count]];
  spans.sort((a,b)=>a[0]-b[0]);const merged=[];
  for(const [a,b] of spans){const last=merged.at(-1);if(last&&a<=last[1])last[1]=Math.max(last[1],b);else merged.push([a,b]);}spans=merged;
  for(const r of exc){const a=Math.floor(r.start*count),b=Math.ceil(r.end*count),next=[];
   for(const [lo,hi] of spans){if(b<=lo||a>=hi)next.push([lo,hi]);else{if(a>lo)next.push([lo,a]);if(b<hi)next.push([b,hi]);}}spans=next;
  }
  if(cfg.params.planning==='reference'){
   const a=Math.ceil(cfg.params.referenceStart*count),b=Math.floor(cfg.params.referenceEnd*count);
   if(!spans.some(([lo,hi])=>a>=lo&&b<=hi))throw Error("The reference sequence must lie entirely within an allowed donor region.");
   spans=[[a,b]];
  }
  const windows=spans.filter(([a,b])=>b-a>=128).map(([a,b],id)=>({id,startSample:a,endSample:b-1,stateDistance:0,role:'material'}));
  if(!windows.length)throw Error("The markings leave no continuous donor region.");
  return {...model,sourceIndex:{windows,fallback:false,selection:'whole-recorded-material'},materialPrepared:true};
 }
 function control(carrier,voice,sample,length){
  const b=carrier.bands[voice],d=b.gainCurve.length-1,x=clamp(sample/Math.max(1,length-1)*d,0,d),cell=Math.round(x);
  if(!(b.gainCurve[cell]>0))return null;
  const a=Math.floor(x),z=Math.min(d,a+1),f=x-a,connected=b.gainCurve[a]>0&&b.gainCurve[z]>0;
  const gain=connected?b.gainCurve[a]*(1-f)+b.gainCurve[z]*f:b.gainCurve[cell];
  const ratio=connected?Math.exp(Math.log(b.centerRatioCurve[a])*(1-f)+Math.log(b.centerRatioCurve[z])*f):b.centerRatioCurve[cell];
  return {gain,hz:ratio*carrier.rootReferenceHz,cell};
 }
 function plan(carrier,input,sr,duration,cfg){
  const model=input.materialPrepared?input:allowedModel(input,cfg),length=Math.round(sr*duration),windows=model.sourceIndex.windows,runs=[];
  const mode=cfg.params.materialTime??'stretch';let previousWindow=null;
  for(let voice=0;voice<carrier.bands.length;voice++){
   const b=carrier.bands[voice],d=Math.max(1,b.gainCurve.length-1);
   for(let i=0;i<b.gainCurve.length;){if(!(b.gainCurve[i]>0)){i++;continue;}const first=i;while(i<b.gainCurve.length&&b.gainCurve[i]>0)i++;
    const start=Math.max(0,Math.ceil((first-.5)/d*(length-1))),end=i===b.gainCurve.length?length:Math.min(length,Math.ceil((i-.5)/d*(length-1)));
    // F53 continuity principle at phrase scale: never reselect at each pitch step.
    const preferred=cfg.params.position*model.samples.length;
    const selected=cfg.params.planning==='structure'&&previousWindow&&windows.includes(previousWindow)?previousWindow:
     windows.reduce((a,b)=>Math.abs((a.startSample+a.endSample)/2-preferred)<Math.abs((b.startSample+b.endSample)/2-preferred)?a:b);
    previousWindow=selected;
    const sourceStart=selected.startSample,sourceEnd=selected.endSample+1,span=sourceEnd-sourceStart;
    const speed=mode==='stretch'?(span-1)/Math.max(1,end-start-1):mode==='hold'?0:model.sampleRate/sr;
    runs.push({voice,firstCell:first,lastCell:i-1,startSample:start,endSample:end,windowId:selected.id,sourceStart,sourceEnd:sourceEnd-1,stateDistance:0,
     sourceSpeed:speed,sourceOffset:mode==='stretch'?0:clamp(cfg.params.position??0,0,1)*Math.max(0,span-1),timeMode:mode,
     workbenchRead:{size:0,safeLo:sourceStart,safeHi:sourceEnd-1,firstSourceCenter:sourceStart,lastSourceCenter:sourceEnd-1},states:[]});
   }
  }
  return {version,sampleRate:sr,durationSec:duration,runs,workbench:cfg,sourceFallback:false,maximumLevelCorrection:1,
   structuralPlan:{version:'f353-continuity-adapted-f356',mode:cfg.params.planning,sourceJumps:0,states:runs.length,warnings:[],roles:['whole-source-span-per-carrier-event']}};
 }
 function sample(model,run,position){
  const lo=run.sourceStart,hi=run.sourceEnd;
  if(position<lo||position>hi)return 0;
  const a=Math.floor(position),b=Math.min(hi,a+1),f=position-a;
  return model.samples[a]*(1-f)+model.samples[b]*f;
 }
 function sourceAt(run,age){
  const span=run.sourceEnd-run.sourceStart+1,offset=run.sourceOffset+age*run.sourceSpeed;
  return run.sourceStart+(run.timeMode==='loop'?offset:clamp(offset,0,span-1));
 }
 function read(model,run,position){
  if(run.timeMode!=='loop')return sample(model,run,position);
  const span=run.sourceEnd-run.sourceStart+1,local=position-run.sourceStart;
  const fade=Math.min(span/8,model.sampleRate*.025),period=span-fade;
  if(local<0)return 0;
  // The first pass keeps the original entry. Later passes overlap the tail
  // with the beginning; the ring advances by span-fade, avoiding a second seam.
  if(local<period)return sample(model,run,position);
  const at=local%period;
  if(at>=fade)return sample(model,run,run.sourceStart+at);
  const w=.5-.5*Math.cos(Math.PI*at/fade);
  return sample(model,run,run.sourceStart+period+at)*(1-w)+sample(model,run,run.sourceStart+at)*w;
 }
 function resample(model,run,position,step){
  if(step<=1.02)return read(model,run,position);
  const cutoff=1/step,radius=Math.min(64,Math.ceil(8*step)),center=Math.floor(position);let value=0,weight=0;
  for(let i=center-radius+1;i<=center+radius;i++){const x=(position-i)*cutoff;if(Math.abs(x)>=8)continue;
   const sinc=Math.abs(x)<1e-9?1:Math.sin(Math.PI*x)/(Math.PI*x),w=sinc*(.5+.5*Math.cos(Math.PI*x/8))*cutoff;
   value+=read(model,run,i)*w;weight+=w;
  }return value/Math.max(1e-9,weight);
 }
 async function render(carrier,input,sr,duration,options={}){
  check(options);const cfg=options.workbench,p=cfg.params,model=input.materialPrepared?input:allowedModel(input,cfg);
  const length=Math.round(sr*duration);
  if(!Number.isSafeInteger(length)||length<1||length*20>192*1024*1024)throw Error("The figure exceeds the 192 MiB offline-buffer budget.");
  const material=plan(carrier,model,sr,duration,cfg),out=new Float32Array(length);
  let sourceEnergy=0,sourceCount=0;
  for(const w of model.sourceIndex.windows)for(let i=w.startSample;i<=w.endSample;i++){const v=model.samples[i];sourceEnergy+=v*v;sourceCount++;}
  // One gain for the complete donor. Quiet/noisy states keep their original relation.
  const gain=.24/Math.max(.04,Math.sqrt(sourceEnergy/Math.max(1,sourceCount)));
  const tune=2**((p.carrierTranspose??0)/12),neutral=p.carrierNeutralHz??220;
  let frames=0,directSamples=0,peak=0,phaseResets=0,bandlimitedBins=0;
  const total=material.runs.reduce((s,r)=>s+r.endSample-r.startSample,0);let completed=0;
  for(const run of material.runs){
   check(options);const count=run.endSample-run.startSample;
   const b=carrier.bands[run.voice];
   const identity=run.timeMode!=='hold'&&Math.abs(run.sourceSpeed-model.sampleRate/sr)<1e-10&&
    b.centerRatioCurve.slice(run.firstCell,run.lastCell+1).every(r=>Math.abs(Math.log(r*carrier.rootReferenceHz/neutral*tune))<1e-9);
   if(identity){
    for(let j=0;j<count;j++){
     if(j%4096===0){check(options);if(j%32768===0)await tick();}
     const c=control(carrier,run.voice,run.startSample+j,length);if(!c)continue;
     const edge=Math.min(1,j/(sr*.002),(count-1-j)/(sr*.002));
     out[run.startSample+j]+=resample(model,run,sourceAt(run,j),model.sampleRate/sr)*gain*c.gain*Math.max(0,edge);directSamples++;
    }
    completed+=count;options.onProgress?.(completed/Math.max(1,total));continue;
   }
   const size=2**Math.round(Math.log2(sr*.085)),hop=size/8,bins=size/2+1,binHz=sr/size,step=model.sampleRate/sr;
   const re=new Float64Array(size),im=new Float64Array(size),yr=new Float64Array(size),yi=new Float64Array(size),mag=new Float64Array(bins),angles=new Float64Array(bins),priorAngles=new Float64Array(bins);
   const signal=new Float64Array(count),weights=new Float64Array(count);
   // One FFT window per run; analysis and overlap-add use the same exact samples.
   const analysisWindow=Float64Array.from({length:size},(_,j)=>Math.sin(Math.PI*(j+.5)/size));
   let priorPeaks=[],previousSource=NaN;
   for(let center=0;center<count+size/2;center+=hop){
    check(options);const age=clamp(center,0,count-1),c=control(carrier,run.voice,run.startSample+age,length);if(!c)continue;
    const ratio=c.hz/neutral*tune,source=sourceAt(run,age),delta=(source-previousSource)/step;
    const continuous=Number.isFinite(previousSource)&&(run.timeMode==='hold'||Math.abs(delta)<size/2);
    re.fill(0);im.fill(0);let maximum=0;
    for(let j=0;j<size;j++){const index=(j+size/2)%size;re[index]=resample(model,run,source+(j-size/2)*step,step)*analysisWindow[j];}
    complexFFT(re,im);
    for(let k=1;k<bins-1;k++){mag[k]=Math.hypot(re[k],im[k]);angles[k]=Math.atan2(im[k],re[k]);maximum=Math.max(maximum,mag[k]);}
    const peaks=[];
    for(let k=2;k<bins-2;k++)if(mag[k]>maximum*.0001&&mag[k]>mag[k-1]&&mag[k]>=mag[k+1]){
     const l=Math.log(Math.max(1e-20,mag[k-1])),m=Math.log(Math.max(1e-20,mag[k])),r=Math.log(Math.max(1e-20,mag[k+1]));
     const off=clamp(.5*(l-r)/(l-2*m+r||1),-.5,.5);
     const estimated=continuous&&Math.abs(delta)>.5?k*binHz+phase(angles[k]-priorAngles[k]-2*Math.PI*k*delta/size)*sr/(2*Math.PI*delta):(k+off)*binHz;
     const hz=clamp(estimated,(k-.5)*binHz,(k+.5)*binHz),target=hz*ratio;
     let old=null,dist=Infinity;
     for(const prev of priorPeaks){const d=Math.abs(prev.hz-hz);if(!prev.used&&d<binHz*1.25&&d<dist){old=prev;dist=d;}}
     if(old)old.used=true;
     const angle=continuous&&old?phase(old.angle+Math.PI*(old.target+target)*hop/sr):angles[k];
     peaks.push({bin:k,hz,target,angle});
    }
    if(!continuous)phaseResets++;
    yr.fill(0);yi.fill(0);
    if(peaks.length)for(let k=1,index=0;k<bins-1;k++){
     while(index+1<peaks.length&&Math.abs(peaks[index+1].bin-k)<Math.abs(peaks[index].bin-k))index++;
     const q=peaks[index],dest=q.target/binHz+(k-q.bin);
     // Translate the analysis lobe; its width is an analysis-window property.
     // All independent detected components use the SAME ratio, with no F0 rounding.
     if(dest<1||dest>=bins-2){bandlimitedBins++;continue;}
     const angle=phase(q.angle+phase(angles[k]-angles[q.bin])),a=Math.floor(dest),f=dest-a;
     const real=mag[k]*Math.cos(angle),imag=mag[k]*Math.sin(angle);
     yr[a]+=real*(1-f);yi[a]+=imag*(1-f);yr[a+1]+=real*f;yi[a+1]+=imag*f;
    }
    for(let k=1;k<bins-1;k++){yr[size-k]=yr[k];yi[size-k]=-yi[k];}
    complexFFT(yr,yi,true);
    for(let j=0;j<size;j++){const at=center+j-size/2;if(at<0||at>=count)continue;const w=analysisWindow[j];signal[at]+=yr[(j+size/2)%size]*w;weights[at]+=w*w;}
    priorAngles.set(angles);priorPeaks=peaks;previousSource=source;frames++;
    if(frames%12===0){options.onProgress?.((completed+Math.min(count,center))/Math.max(1,total));await tick();}
   }
   run.workbenchRead={...run.workbenchRead,size,hop,firstSourceCenter:sourceAt(run,0),lastSourceCenter:sourceAt(run,count-1)};
   for(let j=0;j<count;j++){const c=control(carrier,run.voice,run.startSample+j,length);if(!c)continue;const edge=Math.max(0,Math.min(1,j/(sr*.002),(count-1-j)/(sr*.002)));out[run.startSample+j]+=signal[j]/Math.max(1e-12,weights[j])*c.gain*gain*edge;}
   completed+=count;
  }
  check(options);for(const value of out){if(!Number.isFinite(value))throw Error("Material transformation produced invalid audio.");peak=Math.max(peak,Math.abs(value));}
  const finalGain=peak>.9?.9/peak:1;if(finalGain!==1)for(let i=0;i<length;i++)out[i]*=finalGain;
  material.materialTransform={version,neutralHz:neutral,transpose:p.carrierTranspose??0,timeMode:p.materialTime,fixedSourceReference:true,sourceF0Used:false,frameNormalization:false,sourceGain:gain,finalGain,directSamples,frames,phaseResets,bandlimitedBins};
  material.supportProjection={version,source:'complete-recorded-pcm',spectralFrames:frames,phaseStarts:phaseResets};
  Object.defineProperty(out,'donorMaterialPlan',{value:material});options.onProgress?.(1);return out;
 }
 return Object.freeze({version,allowedModel,plan,control,render});
}
const __F356MaterialOriginal=__f347OriginalMaterialFactory();