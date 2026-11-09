/* Source-only phase transport, with continuous per-event material time.
   Phase state belongs to an event, never to a gain run or a shared atlas. */
async function renderFractaliaMaterialJob(job,{check=()=>{},onProgress=()=>{}}={}) {
 const {complexFFT:fft,phase,resample,sourceAt}=__forgeMaterialToolsFactory();
 const engine=createFractaliaMaterialEngine(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const {model,mapping,recipe,sampleRate:sr,durationSec,events}=job;
 if(!Number.isFinite(sr)||sr<8000||sr>192000||!Number.isFinite(durationSec)||durationSec<=0)throw Error('Material render needs a positive duration and a sample rate between 8 and 192 kHz.');
 const length=Math.ceil(sr*durationSec);
 if(!Number.isSafeInteger(length)||length<1||length>0xffffffff)throw Error('This output cannot fit in one browser audio buffer. Split the Carrier into shorter sections.');
 if(!Array.isArray(events))throw Error('Material render needs Carrier events.');
 for(const event of events)if(!Number.isFinite(event.startSec)||!Number.isFinite(event.endSec)||event.endSec<=event.startSec||!event.pitch?.length||!event.gain?.length||!event.pitch.every(v=>Number.isFinite(v)&&v>0)||!event.gain.every(Number.isFinite))throw Error('Invalid Carrier event: '+String(event.id??'unnamed'));
 check();let out;try{out=new Float32Array(length)}catch{throw Error('The browser could not allocate '+Math.ceil(length*4/1048576)+' MiB for the material output. Split the Carrier into shorter sections or release other audio buffers.');}
 const size=Math.min(4096,2**Math.round(Math.log2(sr*.085))),hop=size/8,bins=size/2+1,binHz=sr/size;
 const sample=(values,u,log=false)=>{const x=clamp(u,0,1)*(values.length-1),a=Math.floor(x),b=Math.min(a+1,values.length-1),f=x-a;return log?Math.exp(Math.log(Math.max(1e-12,values[a]))*(1-f)+Math.log(Math.max(1e-12,values[b]))*f):values[a]*(1-f)+values[b]*f};
 const anchor=recipe.donor.pitchReference==='neutral'?220:mapping.donor.referenceHz;
 if(!(anchor>0))throw Error('No material pitch anchor is available.');
 const gain=.22/Math.max(.04,mapping.donor.rms),analysisWindow=Float64Array.from({length:size},(_,j)=>Math.sin(Math.PI*(j+.5)/size));
 const report={revision:recipe.donor.revision>=3?2:1,events:[],recombinedFrames:0,spectralFrames:0,axis:mapping.axis,anchorHz:anchor,richness:mapping.donor.richness,coverage:mapping.coverage,worker:job.worker===true,limitedBins:0};
 // Only the final PCM grows with the piece. Overlap-add uses a fixed ring,
 // independent of note duration and event count; all events keep their phases.
 const eventBounds=e=>({start:Math.max(0,Math.ceil(e.startSec*sr)),end:Math.min(length,Math.ceil(e.endSec*sr))});
 const total=events.reduce((s,e)=>{const {start,end}=eventBounds(e),count=end-start;return s+(count>0?Math.ceil((count+size/2)/hop):0)},0)||1;
 let done=0;
 report.execution={mode:'offline-overlap-add-ring',requestedEvents:events.length,outputSamples:length,outputBytes:out.byteLength,overlapAddBytes:size*16};
 onProgress(0);
 for(const event of events){
  check();const {start,end}=eventBounds(event),count=end-start;if(count<1)continue;
  const control=i=>{
   const seconds=i/sr-event.startSec,u=clamp(seconds/(event.endSec-event.startSec),0,1),g=sample(event.gain,u)*Math.min(1,event.fadeInSec>0?seconds/event.fadeInSec:1,event.fadeOutSec>0?(event.endSec-i/sr)/event.fadeOutSec:1),hz=sample(event.pitch,u,true);
   return {gain:clamp(g,0,1),hz:clamp(hz,20,sr*.43)};
  };
  const windows=model.sourceIndex.windows,selected=windows.reduce((a,b)=>(b.endSample-b.startSample>a.endSample-a.startSample)?b:a);
  // The window is selected once for this event; silent interior samples advance
  // source time, Fractalia time and phases exactly as audible interior samples.
  const run={sourceStart:selected.startSample,sourceEnd:selected.endSample,sourceSpeed:(selected.endSample-selected.startSample)/Math.max(1,count-1),sourceOffset:0,timeMode:'stretch'};
  const re=new Float64Array(size),im=new Float64Array(size),yr=new Float64Array(size),yi=new Float64Array(size),mag=new Float64Array(bins),angles=new Float64Array(bins),priorAngles=new Float64Array(bins);
  const signal=new Float64Array(size),weights=new Float64Array(size);let priorPeaks=[],previousSource=NaN,frames=0,phaseStarts=0,emitted=0;
  const emit=until=>{for(;emitted<until;emitted++){const slot=emitted&(size-1),c=control(start+emitted),edge=Math.min(1,emitted/(sr*.002),(count-1-emitted)/(sr*.002));out[start+emitted]+=signal[slot]/Math.max(1e-12,weights[slot])*c.gain*gain*Math.max(0,edge);signal[slot]=0;weights[slot]=0}};
  for(let center=0;center<count+size/2;center+=hop){
   check();const age=clamp(center,0,count-1),c=control(start+age),source=sourceAt(run,age),step=model.sampleRate/sr,delta=(source-previousSource)/step;
   const sourcePhaseReliable=Number.isFinite(previousSource)&&Math.abs(delta)<size/2;
   const continuous=recipe.donor.revision>=3?Number.isFinite(previousSource):sourcePhaseReliable;
   re.fill(0);im.fill(0);for(let j=0;j<size;j++){const index=(j+size/2)%size;re[index]=resample(model,run,source+(j-size/2)*step,step)*analysisWindow[j]}
   fft(re,im);let maximum=0;for(let k=1;k<bins-1;k++){mag[k]=Math.hypot(re[k],im[k]);angles[k]=Math.atan2(im[k],re[k]);maximum=Math.max(maximum,mag[k])}
   const transform=engine.frame(mapping,recipe,age/sr,binHz,bins,{...job.diagnostics,sourceSample:source,windowId:selected.id}),peaks=[];
   const ratio=c.hz/anchor;let oldIndex=0;
   for(let k=2;k<bins-2;k++)if(mag[k]>maximum*.0001&&mag[k]>mag[k-1]&&mag[k]>=mag[k+1]){
    const l=Math.log(Math.max(1e-20,mag[k-1])),m=Math.log(Math.max(1e-20,mag[k])),r=Math.log(Math.max(1e-20,mag[k+1]));
    const off=clamp(.5*(l-r)/(l-2*m+r||1),-.5,.5),estimated=sourcePhaseReliable&&Math.abs(delta)>.5?k*binHz+phase(angles[k]-priorAngles[k]-2*Math.PI*k*delta/size)*sr/(2*Math.PI*delta):(k+off)*binHz;
    const hz=clamp(estimated,(k-.5)*binHz,(k+.5)*binHz),target=hz*ratio*transform.ratios[k];
    let old=null,best=Infinity;while(oldIndex<priorPeaks.length&&priorPeaks[oldIndex].hz<hz-binHz*1.25)oldIndex++;
    for(let i=oldIndex;i<priorPeaks.length&&priorPeaks[i].hz<=hz+binHz*1.25;i++){const prev=priorPeaks[i],distance=Math.abs(prev.hz-hz);if(!prev.used&&distance<best){old=prev;best=distance}}
    if(old)old.used=true;const angle=continuous&&old?phase(old.angle+Math.PI*(old.target+target)*hop/sr):angles[k];
    const children=[];
    if(transform.branches){const z=transform.branches,count=z.layers*2,mix=z.mix[k];for(let layer=0;layer<z.layers;layer++)for(let side=0;side<2;side++){
     const index=layer*2+side,polarity=side?1:-1,scale=layer===0?1:z.innerScale,offset=polarity*z.span[k]*scale*(side?1.25-z.balance[k]:.25+z.balance[k]);
     const childTarget=target*2**offset,prior=old?.children?.[index],childAngle=continuous&&prior?phase(prior.angle+Math.PI*(prior.target+childTarget)*hop/sr):angles[k];
     const power=layer===0?(z.layers===2?.72:1):.28;
     children.push({target:childTarget,angle:childAngle,weight:Math.sqrt(mix*power*(side?z.balance[k]:1-z.balance[k]))});
    }}
    peaks.push({bin:k,hz,target,angle,children,parentWeight:transform.branches?Math.sqrt(1-transform.branches.mix[k]):1});
   }
   if(!continuous)phaseStarts++;
   yr.fill(0);yi.fill(0);
   for(let k=1,index=0;peaks.length&&k<bins-1;k++){
    while(index+1<peaks.length&&Math.abs(peaks[index+1].bin-k)<Math.abs(peaks[index].bin-k))index++;
    const q=peaks[index],relative=phase(angles[k]-angles[q.bin]),amplitude=mag[k]*transform.gains[k];
    const deposit=(target,angle,weight)=>{if(!(weight>0))return;const dest=target/binHz+(k-q.bin);if(dest<1||dest>=bins-2){report.limitedBins++;return}const a=Math.floor(dest),f=dest-a,v=amplitude*weight,theta=phase(angle+relative);yr[a]+=v*Math.cos(theta)*(1-f);yi[a]+=v*Math.sin(theta)*(1-f);yr[a+1]+=v*Math.cos(theta)*f;yi[a+1]+=v*Math.sin(theta)*f;};
    deposit(q.target,q.angle,q.parentWeight);for(const child of q.children)deposit(child.target,child.angle,child.weight);
   }
   if(peaks.some(p=>p.children.some(c=>c.weight>.01)))report.recombinedFrames++;
   for(let k=1;k<bins-1;k++){yr[size-k]=yr[k];yi[size-k]=-yi[k]}fft(yr,yi,true);
   for(let j=0;j<size;j++){const at=center+j-size/2;if(at<0||at>=count)continue;const w=analysisWindow[j],slot=at&(size-1);signal[slot]+=yr[(j+size/2)%size]*w;weights[slot]+=w*w}
   // No later frame can touch samples before the next frame's left edge.
   emit(Math.min(count,Math.max(0,center+hop-size/2)));
   priorAngles.set(angles);priorPeaks=peaks;previousSource=source;frames++;done++;
   if(done%8===0){onProgress(.98*done/total);await new Promise(r=>setTimeout(r,0))}
  }
  emit(count);
  report.events.push({id:event.id,startSec:event.startSec,endSec:event.endSec,phaseStarts,frames,sourceWindow:selected.id,ageEndSec:(count-1)/sr});report.spectralFrames+=frames;
 }
 check();let peak=0;
 for(let at=0;at<out.length;at+=262144){check();for(let i=at;i<Math.min(out.length,at+262144);i++){const v=out[i];if(!Number.isFinite(v))throw Error('Material deformation produced invalid audio');peak=Math.max(peak,Math.abs(v))}onProgress(.98+.01*Math.min(out.length,at+262144)/out.length);await new Promise(r=>setTimeout(r,0))}
 const trim=peak>.9?.9/peak:1;
 if(trim!==1)for(let at=0;at<out.length;at+=262144){check();for(let i=at;i<Math.min(out.length,at+262144);i++)out[i]*=trim;await new Promise(r=>setTimeout(r,0))}
 check();
 report.finalGain=trim;onProgress(1);return {left:out,sampleRate:sr,report};
}
if(typeof module!=='undefined'&&module.exports)module.exports=renderFractaliaMaterialJob;
