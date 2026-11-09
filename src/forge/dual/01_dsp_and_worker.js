

/* F3.56.34 EXPERIMENTAL UI — Dual Donor Assembly. No synth, no audio routing changes.
 * Donor Library is read-only here. Edits persist as a compact, explicit blueprint only.
 * Existing Forge/Workbench state, carrier, audio contexts and live engine remain untouched.
 */
/* One shared spectral body, built offline from an explicit, revision-bound recipe.
 * All audible bins derive from marked PCM. No oscillators/noise generators, no A+B player. */
function __f35636DualDSPFactory() {
  const version='dual-donor-spectral-body-f3.56.41', TAU=Math.PI*2;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)), wrap=x=>x-TAU*Math.round(x/TAU);
  function fft(re,im,inverse=false) {
    const n=re.length;
    for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
    for(let len=2;len<=n;len*=2){const ang=(inverse?TAU:-TAU)/len,cr=Math.cos(ang),ci=Math.sin(ang);
      for(let start=0;start<n;start+=len){let wr=1,wi=0;for(let j=0;j<len/2;j++){const a=start+j,b=a+len/2,tr=re[b]*wr-im[b]*wi,ti=re[b]*wi+im[b]*wr;
        re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;const nw=wr*cr-wi*ci;wi=wr*ci+wi*cr;wr=nw;}}}
    if(inverse)for(let i=0;i<n;i++){re[i]/=n;im[i]/=n;}
  }
  function sample(pcm,pos) {if(pos<0||pos>pcm.samples.length-1)return 0;const a=Math.floor(pos),b=Math.min(pcm.samples.length-1,a+1);return pcm.samples[a]+(pcm.samples[b]-pcm.samples[a])*(pos-a);}
  // This renderer uses one fixed FFT size; the worker owns its Float64 window.
  const analysisWindow = Float64Array.from({length:2048},(_,j)=>Math.sin(Math.PI*(j+.5)/2048));
  const freq=(y,sr)=>35*Math.pow(sr*.46/35,1-y);
  function validate(plan,sources,settings={}) {
    if(plan?.schema!=='xensonar-dual-donor-ui-v2')throw Error('Unsupported Dual Donor blueprint.');
    for(const slot of ['A','B']){const s=sources?.[slot];if(!(s?.samples instanceof Float32Array)||!s.samples.length||!(s.sampleRate>=8000&&s.sampleRate<=192000))throw Error('Load both donor recordings first.');
      if(!Number.isFinite(s.duration)||Math.abs(s.duration-s.samples.length/s.sampleRate)>2/s.sampleRate)throw Error('Donor '+slot+' duration does not match its PCM.');
      if(!s.revision||s.revision!==plan.sources?.[slot]?.revision)throw Error('Confirm the content revision of Donor '+slot+' before synthesis.');
      if(s.samples.byteLength>48*1024*1024)throw Error('Donor '+slot+' exceeds the 48 MiB input limit.');}
    if(!plan.links?.length)throw Error('Connect at least one region from each donor.');
    if(plan.links.length>12)throw Error('This renderer supports up to 12 relationships per body.');
    if(!['linked_only','keep_A','keep_B'].includes(plan.remainder))throw Error('Choose how unlinked material should be treated.');
    const ids=new Set(),linkIds=new Set();
    for(const r of plan.regions??[]){if(ids.has(r.id))throw Error('Region IDs must be unique.');ids.add(r.id);}
    const links=plan.links.map(l=>{
      if(typeof l.id!=='string'||!l.id||linkIds.has(l.id))throw Error('Every relationship needs a unique ID.');linkIds.add(l.id);
      const a=plan.regions.find(r=>r.id===l.a&&r.slot==='A'),b=plan.regions.find(r=>r.id===l.b&&r.slot==='B');
      if(!a||!b)throw Error('A relationship refers to unavailable marks.');
      if(!['cross','imprint','interlock'].includes(l.mode))throw Error('Unknown relationship operation.');
      if(l.mode==='imprint'&&!['A_to_B','B_to_A'].includes(l.direction))throw Error('Set the direction of every Imprint relationship.');
      for(const r of [a,b]){if(![r.x0,r.x1,r.y0,r.y1].every(Number.isFinite)||r.x0<0||r.x1>1||r.y0<0||r.y1>1||r.x1<=r.x0||r.y1<=r.y0)throw Error('Invalid time-frequency mark.');
        if((r.x1-r.x0)*sources[r.slot].duration<.025)throw Error('Each marked time window needs at least 25 ms.');}
      return {id:l.id,mode:l.mode,direction:l.direction,A:a,B:b};
    });
    const sampleRate=48000, duration=Number(settings.duration??Math.min(8,Math.max(...links.flatMap(l=>[l.A,l.B].map(r=>(r.x1-r.x0)*sources[r.slot].duration)))));
    if(!Number.isFinite(duration)||duration<.1||duration>8)throw Error('Choose a hybrid duration between 0.1 and 8 seconds.');
    const strength=clamp(Number(settings.strength??.8),0,1);if(!Number.isFinite(strength))throw Error('Invalid relationship strength.');
    return {links,sampleRate,duration,strength,remainder:plan.remainder};
  }
  const kernels=new Map();
  function bandlimited(source,pos,step,first=0,last=source.samples.length-1){
    if(step<=1.02)return sample(source,pos);
    let table=kernels.get(step);const radius=Math.min(64,Math.ceil(8*step)),phases=512;
    if(!table){table=Array.from({length:phases},(_,p)=>{const a=new Float64Array(radius*2);let sum=0;for(let j=0;j<a.length;j++){const x=(p/phases-(j-radius+1))/step;const w=Math.abs(x)>=8?0:(Math.abs(x)<1e-9?1:Math.sin(Math.PI*x)/(Math.PI*x))*(.5+.5*Math.cos(Math.PI*x/8))/step;a[j]=w;sum+=w;}for(let j=0;j<a.length;j++)a[j]/=sum;return a;});kernels.set(step,table);}
    const center=Math.floor(pos),a=table[Math.min(phases-1,Math.floor((pos-center)*phases))];let value=0;for(let j=0;j<a.length;j++){const at=center+j-radius+1;if(at>=first&&at<=last)value+=sample(source,at)*a[j];};return value;
  }
  function frame(source,r,fraction,n,sr,previous) {
    const re=new Float64Array(n),im=new Float64Array(n), bins=n/2+1;
    const first=r.x0*source.samples.length,last=Math.min(source.samples.length-1,r.x1*source.samples.length-1),center=first+(last-first)*fraction;
    const step=source.sampleRate/sr;
    for(let j=0;j<n;j++){const at=center+(j-n/2)*step;re[j]=(at>=first&&at<=last?bandlimited(source,at,step,first,last):0)*analysisWindow[j];}
    fft(re,im);const mag=new Float64Array(bins),angle=new Float64Array(bins),inst=new Float64Array(bins),env=new Float64Array(bins);
    const delta=(center-(previous?.center??center))/step;
    for(let k=0;k<bins;k++){mag[k]=Math.hypot(re[k],im[k]);angle[k]=Math.atan2(im[k],re[k]);
      inst[k]=k+(previous&&delta>.01?clamp(wrap(angle[k]-previous.angle[k]-TAU*k*delta/n)*n/(TAU*delta),-.5,.5):0);}
    const logMagnitude=Float64Array.from(mag,m=>Math.log(Math.max(1e-10,m)));
    let sum=0;const radius=10;
    for(let k=0;k<bins+radius;k++) {if(k<bins)sum+=logMagnitude[k];if(k>2*radius)sum-=logMagnitude[k-2*radius-1];
      if(k>=radius){const at=k-radius;env[at]=sum/(Math.min(bins-1,k)-Math.max(0,k-2*radius)+1);}}
    const low=freq(r.y1,source.sampleRate),high=freq(r.y0,source.sampleRate);
    let energy=0,count=0,maximum=0,peakBin=0;for(let k=Math.max(1,Math.ceil(low*n/sr));k<Math.min(bins-1,high*n/sr);k++){energy+=mag[k]**2;count++;if(mag[k]>maximum){maximum=mag[k];peakBin=k;}}
    const rms=Math.sqrt(energy/Math.max(1,count));let anchor=null;
    if(maximum>rms*3&&peakBin>1&&peakBin<bins-2){const l=Math.log(Math.max(1e-10,mag[peakBin-1])),m=Math.log(Math.max(1e-10,maximum)),r=Math.log(Math.max(1e-10,mag[peakBin+1]));
      anchor=(peakBin+clamp(.5*(l-r)/(l-2*m+r||1),-.5,.5))*sr/n;
      if(previous?.anchor&&Math.abs(Math.log(anchor/previous.anchor))<.18)anchor=previous.anchor*.65+anchor*.35;
    }
    let rise=0,base=0;for(let k=1;k<bins;k++){base+=mag[k];rise+=Math.max(0,mag[k]-(previous?.mag[k]??mag[k]));}
    const flux=rise/Math.max(1e-8,base);
    return {mag,angle,inst,env,center,low,high,energy:rms,logEnergy:Math.log(Math.max(rms,1e-10)),frequencyRatio:high/low,anchor,feature:r.feature??'all',flux};
  }
  function at(a,k){const i=clamp(k,0,a.length-1),lo=Math.floor(i),hi=Math.min(a.length-1,lo+1);return a[lo]+(a[hi]-a[lo])*(i-lo);}
  function read(f,u,n,sr) {const hz=f.low*Math.pow(f.frequencyRatio,clamp(u,0,1)),k=hz*n/sr;if(u<0||u>1)return {m:0,e:Math.log(1e-10),p:0,d:0,k};
    return {m:at(f.mag,k),e:at(f.env,k),p:at(f.angle,k),d:at(f.inst,k)-k,k};}
  function property(source,target,strength) {
    const feature=source.feature;
    if(feature==='motion')return target.m;
    const meanSource=source.logEnergy,meanTarget=target.logEnergy;
    const shaped=feature==='resonance'?source.e-meanSource+Math.log(Math.max(target.m,1e-10))-target.e+meanTarget:
      feature==='texture'?target.e+(Math.log(Math.max(source.m,1e-10))-source.e):Math.log(Math.max(source.m,1e-10))-meanSource+meanTarget;
    const base=Math.log(Math.max(target.m,1e-10));return Math.exp(base+clamp(shaped-base,-2.3,2.3)*strength);
  }
  function mapped(f,u,n,sr) {const s=read(f,u,n,sr);s.energy=f.energy;s.logEnergy=f.logEnergy;s.feature=f.feature;return s;}
  function key(plan,sources,settings={}) {validate(plan,sources,settings);return JSON.stringify({version,sources:{A:sources.A.revision,B:sources.B.revision},regions:plan.regions,links:plan.links,remainder:plan.remainder,settings:{duration:settings.duration??null,strength:settings.strength??.8}});}
  async function render(plan,sources,settings={},options={}) {
    const job=validate(plan,sources,settings);
    for(const slot of ['A','B'])for(let i=0;i<sources[slot].samples.length;i++){if(!Number.isFinite(sources[slot].samples[i]))throw Error('Donor '+slot+' contains invalid PCM.');if(i%65536===0){if(options.isCancelled?.())throw new DOMException('Hybrid synthesis cancelled.','AbortError');await new Promise(r=>setTimeout(r,0));}}
    const sr=job.sampleRate,length=Math.round(job.duration*sr),n=2048,hop=256,bins=n/2+1;
    const out=new Float64Array(length),weight=new Float64Array(length),phase=new Float64Array(bins),oldMagnitude=new Float64Array(bins);
    const lockedPhase=new Float64Array(bins),rawPhase=new Float64Array(bins),magnitudeFrame=new Float64Array(bins);
    const previous=job.links.map(()=>({A:null,B:null})), previousRemainder={frame:null}, region={x0:0,x1:1,y0:0,y1:1,feature:'all'};
    let frames=0;const check=()=>{if(options.isCancelled?.())throw new DOMException('Dual Donor synthesis cancelled.','AbortError');};check();
    for(let center=0;center<length+n/2;center+=hop) {
      check();const fraction=clamp(center/Math.max(1,length-1),0,1),states=[];
      for(let i=0;i<job.links.length;i++){const l=job.links[i],a=frame(sources.A,l.A,fraction,n,sr,previous[i].A),b=frame(sources.B,l.B,fraction,n,sr,previous[i].B);previous[i]={A:a,B:b};
        const target=l.direction==='B_to_A'?a:b;
        const low=l.mode==='imprint'?target.low:Math.sqrt(a.low*b.low),high=l.mode==='imprint'?target.high:Math.sqrt(a.high*b.high);
        const sharedAnchor=l.mode!=='imprint'&&a.anchor&&b.anchor?Math.sqrt(a.anchor*b.anchor):null;
        const shiftA=sharedAnchor?Math.log(a.anchor/sharedAnchor/(a.low/low))/Math.log(a.high/a.low):0,shiftB=sharedAnchor?Math.log(b.anchor/sharedAnchor/(b.low/low))/Math.log(b.high/b.low):0;
        states.push({l,a,b,low,high,logSpan:Math.log(high/low),shiftA,shiftB});}
      let rest=null;if(job.remainder!=='linked_only'){const src=sources[job.remainder==='keep_A'?'A':'B'];rest=frame(src,region,fraction,n,sr,previousRemainder.frame);previousRemainder.frame=rest;}
      const re=new Float64Array(n),im=new Float64Array(n);
      for(let k=1;k<bins-1;k++) {
        const hz=k*sr/n;let power=0,parts=0,drift=0,pr=0,pi=0,covered=false,reset=0;
        for(const s of states){if(hz<s.low||hz>s.high)continue;covered=true;const u=Math.log(hz/s.low)/s.logSpan;
          const edge=Math.min(1,u/.04,(1-u)/.04),ua=u+s.shiftA,ub=u+s.shiftB,a=mapped(s.a,ua,n,sr),b=mapped(s.b,ub,n,sr);let m,p,d;
          if(s.l.mode==='imprint') {
            const source=s.l.direction==='A_to_B'?a:b,target=s.l.direction==='A_to_B'?b:a;
            m=property(source,target,job.strength);p=target.p;d=target.d*k/Math.max(1e-5,target.k);
            if(source.feature==='motion'){m*=Math.exp(clamp(Math.log((source.energy+1e-8)/(target.energy+1e-8)),-1.2,1.2)*job.strength);d=(1-job.strength)*d+job.strength*source.d*k/Math.max(1e-5,source.k);}
          } else {
            let aa=a,bb=b;
            if(s.l.mode==='interlock') {
              const eps=.025, slopeA=clamp(read(s.a,ua+eps,n,sr).e-read(s.a,ua-eps,n,sr).e,-2,2),slopeB=clamp(read(s.b,ub+eps,n,sr).e-read(s.b,ub-eps,n,sr).e,-2,2);
              aa=mapped(s.a,ua+slopeB*.035*job.strength,n,sr);bb=mapped(s.b,ub+slopeA*.035*job.strength,n,sr);
            }
            const ew=f=>f==='resonance'?1:f==='all'?.5:0,tw=f=>f==='texture'?1:f==='all'?.5:0;
            const ea=ew(aa.feature),eb=ew(bb.feature),ta=tw(aa.feature),tb=tw(bb.feature);
            const meanA=aa.logEnergy,meanB=bb.logEnergy;
            const envelope=ea+eb?(ea*(aa.e-meanA)+eb*(bb.e-meanB))/(ea+eb):((aa.e-meanA)+(bb.e-meanB))*.5;
            const fineA=Math.log(Math.max(aa.m,1e-10))-aa.e,fineB=Math.log(Math.max(bb.m,1e-10))-bb.e;
            const wa=ta+tb?ta/(ta+tb):.5,wb=1-wa;
            const detail=.5*Math.log(Math.max(1e-20,wa*Math.exp(clamp(2*fineA,-30,30))+wb*Math.exp(clamp(2*fineB,-30,30))));
            const joint=envelope+detail+(meanA+meanB)*.5, middle=.5*Math.log(Math.max(1e-20,(aa.m*aa.m+bb.m*bb.m)*.5));
            m=Math.exp(clamp(middle+(joint-middle)*job.strength,-30,20));
            if(s.l.mode==='interlock') {
              const difference=Math.log(Math.max(1e-10,aa.m))-aa.e-Math.log(Math.max(1e-10,bb.m))+bb.e;
              const choice=.5+.45*Math.tanh(difference*job.strength);
              const interleaved=Math.sqrt(choice*aa.m*aa.m+(1-choice)*bb.m*bb.m);
              m=m*(1-job.strength*.55)+interleaved*job.strength*.55;
            }p=Math.atan2(Math.sin(aa.p)+Math.sin(bb.p),Math.cos(aa.p)+Math.cos(bb.p));d=(aa.d*k/Math.max(1,aa.k)+bb.d*k/Math.max(1,bb.k))*.5;
          }
          reset=Math.max(reset,s.l.mode==='imprint'?(s.l.direction==='A_to_B'?s.b.flux:s.a.flux):Math.max(s.a.flux,s.b.flux));
          power+=m*m*edge*edge;drift+=d*edge;pr+=Math.cos(p)*m*edge;pi+=Math.sin(p)*m*edge;parts+=edge;
        }
        let magnitude=0,angle=0,deviation=0;
        if(parts>1e-9){magnitude=Math.sqrt(power/Math.max(1,parts));angle=Math.atan2(pi,pr);deviation=drift/parts;}
        else if(rest&&!covered){magnitude=rest.mag[k];angle=rest.angle[k];deviation=rest.inst[k]-k;}
        // Phase belongs to the single shared output field; spectral joins cannot spawn two voices.
        phase[k]=frames&&oldMagnitude[k]>1e-8&&reset<.42?wrap(phase[k]+TAU*(k+deviation)*hop/n):angle;
        rawPhase[k]=angle;magnitudeFrame[k]=magnitude;
      }
      const peaks=[];for(let k=2;k<bins-2;k++)if(magnitudeFrame[k]>1e-8&&magnitudeFrame[k]>magnitudeFrame[k-1]&&magnitudeFrame[k]>=magnitudeFrame[k+1])peaks.push(k);
      for(let k=1,pi=0;k<bins-1;k++){
        while(pi+1<peaks.length&&Math.abs(peaks[pi+1]-k)<Math.abs(peaks[pi]-k))pi++;
        const peak=peaks[pi];lockedPhase[k]=peak!=null&&Math.abs(peak-k)<=8?wrap(phase[peak]+wrap(rawPhase[k]-rawPhase[peak])):phase[k];
        const m=magnitudeFrame[k];re[k]=m*Math.cos(lockedPhase[k]);im[k]=m*Math.sin(lockedPhase[k]);re[n-k]=re[k];im[n-k]=-im[k];oldMagnitude[k]=m;
      }
      fft(re,im,true);
      for(let j=0;j<n;j++){const i=center+j-n/2;if(i<0||i>=length)continue;const w=analysisWindow[j];out[i]+=re[j]*w;weight[i]+=w*w;}
      frames++;if(frames%8===0){options.onProgress?.(clamp(center/length,0,1));await new Promise(r=>setTimeout(r,0));}
    }
    check();const pcm=new Float32Array(length);let peak=0,energy=0;const fade=Math.min(96,length/8);
    for(let i=0;i<length;i++){const edge=clamp(Math.min(i/fade,(length-1-i)/fade),0,1),v=out[i]/Math.max(weight[i],1e-8)*edge;if(!Number.isFinite(v))throw Error('Hybrid contains invalid samples.');pcm[i]=v;peak=Math.max(peak,Math.abs(v));energy+=v*v;}
    if(peak<1e-7)throw Error('The linked regions contain no shared audible structure. Widen the marks or choose another relationship.');
    const gain=Math.min(1,.88/peak);if(gain<1)for(let i=0;i<length;i++)pcm[i]*=gain;
    options.onProgress?.(1);
    return {samples:pcm,sampleRate:sr,duration:job.duration,manifest:{schema:'xensonar-dual-donor-result-v1',version,key:key(plan,sources,settings),
      sourceRevisions:{A:sources.A.revision,B:sources.B.revision},recipe:JSON.parse(JSON.stringify(plan)),settings:{duration:job.duration,strength:job.strength},
      alignment:'relative progress within each linked time window',frequencyMapping:'log-relative; Cross/Interlock registered shared band, Imprint target coordinates with scaled phase deviation',phasePolicy:'shared-field-local-peak-lock; observed-transient-reset',revision:41,
      remainder:job.remainder,frames,peakBeforeGain:peak,finalGain:gain,rms:Math.sqrt(energy/length)*gain,addedNoise:0,addedOscillators:0,outputBodies:1}};
  }
  return Object.freeze({version,validate,key,render});
}

const __F35636DualDSPOriginal=__f35636DualDSPFactoryOriginal();
const __F35636DualDSPUpdated=__f35636DualDSPFactory();
const __F35636DualDSP=Object.freeze({
  forPlan:plan=>plan?.revision==='original'?__F35636DualDSPOriginal:__F35636DualDSPUpdated,
  get version(){return 'dual-variant-router-f3.56.42';},
  validate(plan,sources,settings){return this.forPlan(plan).validate(plan,sources,settings);},
  key(plan,sources,settings){return this.forPlan(plan).key(plan,sources,settings);},
  render(plan,sources,settings,options){return this.forPlan(plan).render(plan,sources,settings,options);}
});
const __F35636DualWorker=(()=>{
  function render(plan,sources,settings,options={}){
    __F35636DualDSP.validate(plan,sources,settings);
    const factory=plan?.revision==='original'?__f35636DualDSPFactoryOriginal:__f35636DualDSPFactory;
    const script='const dsp=('+factory.toString()+')();self.postMessage({ready:true});self.onmessage=async e=>{try{const r=await dsp.render(e.data.plan,e.data.sources,e.data.settings,{onProgress:p=>self.postMessage({progress:p})});self.postMessage({result:r},[r.samples.buffer]);}catch(error){self.postMessage({error:error.message,name:error.name});}}';
    const copy=s=>({samples:s.samples.slice(),sampleRate:s.sampleRate,duration:s.duration,revision:s.revision});
    return __F35640OfflineJob.run({script,options,label:'Dual Donor',
      payload:()=>({plan,sources:{A:copy(sources.A),B:copy(sources.B)},settings}),
      transfer:wire=>[wire.sources.A.samples.buffer,wire.sources.B.samples.buffer],
      decode:m=>{if(!(m.result?.samples instanceof Float32Array)||!m.result.samples.length)throw Error('Incomplete hybrid result.');return m.result;}
    }).promise;
  }
  return Object.freeze({render});
})();