/* Forge Voices DSP · offline only (KALT). One self-contained factory so the same
   source runs in a Worker, on the main thread as a fallback, and in Node tests.
   Every engine is band-limited by construction, exact in pitch (phase accumulation
   from the Carrier's own Hz), stereo, and loop-aware: release and room tails are
   folded back into the start of the cycle instead of being cut.
   Carrier events supply pitch, timing and dynamics; the engines supply timbre. */
function createForgeVoicesDSP(){
 const TAU=Math.PI*2,LN2=Math.LN2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
 const SN=8192,SINE=new Float32Array(SN+1);for(let i=0;i<=SN;i++)SINE[i]=Math.sin(TAU*i/SN);
 // phase in cycles; linear interpolation of an 8192-point table (error below -90 dB)
 const sin1=p=>{p-=Math.floor(p);const x=p*SN,i=x|0;return SINE[i]+(SINE[i+1]-SINE[i])*(x-i)};
 const curve=(a,u)=>{const n=a.length;if(n===1)return a[0];const x=clamp(u,0,1)*(n-1),i=Math.min(n-2,x|0);return a[i]+(a[i+1]-a[i])*(x-i)};
 function fft(re,im,inverse){const n=re.length;for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t}}
  for(let len=2;len<=n;len<<=1){const ang=(inverse?TAU:-TAU)/len,wr=Math.cos(ang),wi=Math.sin(ang);for(let s=0;s<n;s+=len){let ar=1,ai=0;for(let j=0;j<len/2;j++){const a=s+j,b=a+len/2,br=re[b]*ar-im[b]*ai,bi=re[b]*ai+im[b]*ar;re[b]=re[a]-br;im[b]=im[a]-bi;re[a]+=br;im[a]+=bi;const nr=ar*wr-ai*wi;ai=ar*wi+ai*wr;ar=nr}}}
 }
 const rng=seed=>{let a=seed>>>0||1;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}};
 // Same audible-range convention as the existing Carrier renderers: fold by octaves, never drop a note.
 function audibleHz(v,sr){let hz=Number.isFinite(v)&&v>0?v:220;const top=Math.min(12000,sr*.43);if(hz<20)hz*=2**Math.ceil(Math.log2(20/hz));if(hz>top)hz*=2**Math.floor(Math.log2(top/hz));return clamp(hz,20,top)}
 const pause=()=>new Promise(r=>setTimeout(r,0));

 /* One note of the Carrier as sample-accurate envelopes. The tail after the note
    end belongs to the note; with wrap enabled it lands at the start of the loop. */
 function voice(ev,job,p){
  const sr=job.sampleRate,frames=job.frames,start=clamp(ev.startSec,0,job.durationSec),end=clamp(ev.endSec,start,job.durationSec);
  const n0=Math.round(start*sr),len=Math.max(1,Math.round((end-start)*sr)),G=ev.gain.map(v=>clamp(Number.isFinite(v)?v:0,0,1));
  const LP=ev.pitch.map(v=>Math.log(audibleHz(v,sr))),att=Math.max(1,Math.min(len,Math.round(Math.max(p.attack,ev.fadeInSec||0)*sr)));
  const fo=Math.min(len,Math.round((ev.fadeOutSec||0)*sr)),rel=Math.max(8,Math.round(p.release*sr)),peak=Math.max(1e-6,...G);
  const held=i=>{let g=curve(G,i/Math.max(1,len-1));if(i<att)g*=.5-.5*Math.cos(Math.PI*i/att);if(fo>0&&i>len-fo)g*=(len-i)/fo;return g},last=held(len-1);
  const gain=i=>i<len?held(i):i<len+rel?last*(.5+.5*Math.cos(Math.PI*(i-len)/rel)):0;
  const logHz=i=>curve(LP,i/Math.max(1,len-1));
  let lo=Infinity,hi=-Infinity;for(const v of LP){if(v<lo)lo=v;if(v>hi)hi=v}
  return {n0,len,total:last>1e-7?len+rel:len,gain,logHz,peak,startSec:start,minHz:Math.exp(lo),maxHz:Math.exp(hi),sr,frames,wrap:p.tailWrap>=.5};
 }

 /* ---------- G · Gahjer: wave terrain, read as a stream of band-limited wavetables ---------- */
 function prepareTerrain(input,relief){
  if(!input||!(input.width>0)||!(input.height>1)||input.data?.length!==input.width*input.height)throw Error('Gahjer needs a drawing as terrain');
  // Columns are averaged to at most 1024: the orbit reads neighbourhoods, not single pixels.
  const fx=Math.max(1,Math.ceil(input.width/1024)),w=Math.floor(input.width/fx),h=input.height;let a=new Float32Array(w*h),max=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0;for(let k=0;k<fx;k++)s+=input.data[y*input.width+x*fx+k]||0;a[y*w+x]=s/fx}
  const sigma=.6+relief*5.4,radius=Math.ceil(sigma*2.5),kernel=new Float32Array(radius*2+1);let ks=0;
  for(let i=-radius;i<=radius;i++)ks+=kernel[i+radius]=Math.exp(-.5*(i/sigma)**2);for(let i=0;i<kernel.length;i++)kernel[i]/=ks;
  let b=new Float32Array(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0;for(let k=-radius;k<=radius;k++){let xx=x+k;xx=xx<0?xx+w:xx>=w?xx-w:xx;s+=a[y*w+xx]*kernel[k+radius]}b[y*w+x]=s} // time wraps: the figure is a loop
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0;for(let k=-radius;k<=radius;k++){const yy=y+k;if(yy>=0&&yy<h)s+=b[yy*w+x]*kernel[k+radius]}a[y*w+x]=s;if(s>max)max=s}
  if(max<=1e-9)throw Error('The drawing is empty: Gahjer has no terrain to read');
  for(let i=0;i<a.length;i++)a[i]/=max;return {w,h,data:a};
 }
 async function gaia(job,L,R,io){
  const p=job.params,sr=job.sampleRate,T=prepareTerrain(job.terrain,p.relief),w=T.w,h=T.h,D=T.data,dur=job.durationSec;
  const N=256,TS=1024,HOP=512,lobes=Math.round(p.lobes),are=new Float64Array(N),aim=new Float64Array(N),tre=new Float64Array(TS),tim=new Float64Array(TS);
  const cosT=new Float32Array(N),sinArg=new Float32Array(N);for(let j=0;j<N;j++){cosT[j]=Math.cos(TAU*j/N);sinArg[j]=TAU*j/N}
  const sample=(x,y)=>{if(y<=-1||y>=h)return 0;x-=Math.floor(x/w)*w;const x0=x|0,x1=x0+1===w?0:x0+1,fy=Math.floor(y),ty=y-fy,tx=x-x0;
   const r0=fy>=0?fy*w:-1,r1=fy+1<h?(fy+1)*w:-1,a=r0<0?0:D[r0+x0]+(D[r0+x1]-D[r0+x0])*tx,b=r1<0?0:D[r1+x0]+(D[r1+x1]-D[r1+x0])*tx;return a+(b-a)*ty};
  // One table = one revolution of the orbit, analysed and rebuilt with only the harmonics that fit below Nyquist.
  function table(out,xc,yc,rx,ry,phase,dir,harmonics){
   for(let j=0;j<N;j++){are[j]=sample(xc+dir*rx*cosT[j],yc-ry*Math.sin(lobes*sinArg[j]+phase));aim[j]=0}
   fft(are,aim,false);const K=Math.max(1,Math.min(harmonics,N/2-1));let rest=0;for(let k=2;k<=K;k++)rest+=are[k]*are[k]+aim[k]*aim[k];
   let m1=Math.hypot(are[1],aim[1]);const want=p.anchor*Math.sqrt(rest);
   if(m1<want){if(m1>1e-12){are[1]*=want/m1;aim[1]*=want/m1}else{are[1]=0;aim[1]=-want}m1=want}
   const energy=rest+m1*m1,found=energy/(energy+N*N*1e-6); // an orbit over empty ground falls back to a plain tone
   tre.fill(0);tim.fill(0);const scale=found/Math.sqrt(Math.max(energy,1e-30))*.5;
   // Shift the cycle so its fundamental always has sine phase. A changing orbit then
   // changes colour only: it can never detune the note, and both channels share one bass.
   const ur=m1>1e-12?-aim[1]/m1:1,ui=m1>1e-12?-are[1]/m1:0;let cr=ur,ci=ui;
   for(let k=1;k<=K;k++){const xr=(are[k]*cr-aim[k]*ci)*scale,xi=(are[k]*ci+aim[k]*cr)*scale;tre[k]=xr;tim[k]=xi;tre[TS-k]=xr;tim[TS-k]=-xi;const t=cr*ur-ci*ui;ci=cr*ui+ci*ur;cr=t}
   tim[1]-=(1-found)*.5;tim[TS-1]+=(1-found)*.5;fft(tre,tim,true);
   for(let i=0;i<TS;i++)out[i+1]=tre[i];out[0]=out[TS];out[TS+1]=out[1];out[TS+2]=out[2];
  }
  const read=(t,ph)=>{const x=ph*TS,i=x|0,f=x-i,a=t[i],b=t[i+1],c=t[i+2],d=t[i+3];return b+.5*f*(c-a+f*(2*a-5*b+4*c-d+f*(3*(b-c)+d-a)))};
  // Carrier Tuning transposes the notes, not the picture: look the terrain up at the drawn pitch.
  const shift=Math.log(job.pitchRatio>0?job.pitchRatio:1),rowOf=logHz=>(1-(logHz-shift-Math.log(20))/Math.log(1000))*h-.5,semis=h/(12*Math.log2(1000));
  for(let vi=0;vi<job.events.length;vi++){
   const v=voice(job.events[vi],job,p);let tables=[0,1,2,3].map(()=>new Float32Array(TS+3)),ph=0,o=v.n0%v.frames;
   const build=(i,lt,rt)=>{const g=v.gain(i),lh=v.logHz(Math.min(i,v.len-1)),hz=Math.exp(lh),age=i/sr,gn=Math.sqrt(clamp(g/v.peak,0,1));
    const ry=p.reachPitch*semis*(1-p.dynamics*.6*(1-gn)),rx=p.reachTime/dur*w,yc=rowOf(lh)+p.lift*ry,xc=(v.startSec+age)/dur*w,phase=TAU*p.drift*.35*age;
    const K=Math.min(Math.round(p.richness),Math.floor(.45*sr/hz));
    table(lt,xc,yc,rx,ry,phase,1,K);if(p.width>0)table(rt,xc,yc,rx,ry,phase+p.width*.6,-1,K);else rt.set(lt)};
   build(0,tables[0],tables[1]);
   for(let i=0;i<v.total;i+=HOP){
    const count=Math.min(HOP,v.total-i);build(Math.min(i+count,v.total-1),tables[2],tables[3]);
    const [la,ra,lb,rb]=tables,g0=v.gain(i),g1=v.gain(i+count),f0=Math.exp(v.logHz(Math.min(i,v.len-1)))/sr,f1=Math.exp(v.logHz(Math.min(i+count,v.len-1)))/sr;
    for(let j=0;j<count;j++){const u=j/count,g=(g0+(g1-g0)*u)*.32,a=read(la,ph),b=read(lb,ph),c=read(ra,ph),d=read(rb,ph);
     if(o<v.frames){L[o]+=(a+(b-a)*u)*g;R[o]+=(c+(d-c)*u)*g}
     ph+=f0+(f1-f0)*u;if(ph>=1)ph-=1;if(++o>=v.frames&&v.wrap)o=0}
    tables=[lb,rb,la,ra];if((i/HOP&15)===0)await io.tick((vi+i/v.total)/job.events.length);
   }
  }
  return {terrain:[w,h]};
 }

 /* ---------- H · Holgriot: the figure's own intervals as overtone spectrum ---------- */
 /* The tones of the figure, weighted by duration and loudness. A steady note (even a
    slightly shaky hand-drawn one) is one tone at its mean pitch; a real glide counts
    with where it starts and where it arrives. Tones closer than 12 cents are one tone. */
 function scaleOf(events,sr=48000){
  const pts=[],steady=50/1200*LN2;
  for(const ev of events){const len=Math.max(1e-4,ev.endSec-ev.startSec),n=Math.min(64,ev.pitch.length);let sum=0,wt=0,lo=Infinity,hi=-Infinity,first=null,last=null;
   for(let i=0;i<n;i++){const u=n===1?0:i/(n-1),g=curve(ev.gain,u);if(g<=1e-4)continue;const l=Math.log(audibleHz(curve(ev.pitch,u),sr));sum+=l*g;wt+=g;if(l<lo)lo=l;if(l>hi)hi=l;if(first===null)first=l;last=l}
   if(!(wt>0))continue;const weight=wt/n*len;if(hi-lo<=steady)pts.push([sum/wt,weight]);else pts.push([first,weight/2],[last,weight/2])}
  pts.sort((a,b)=>a[0]-b[0]);const tones=[],tol=12/1200*LN2;
  for(const [l,wt] of pts){const t=tones[tones.length-1];if(t&&l-t.log/t.weight<tol){t.log+=l*wt;t.weight+=wt}else tones.push({log:l*wt,weight:wt})}
  return tones.map(t=>({hz:Math.exp(t.log/t.weight),weight:t.weight})).sort((a,b)=>b.weight-a.weight).slice(0,12).sort((a,b)=>a.hz-b.hz);
 }
 /* Sethares' principle, read from the drawing: place each overtone on the nearest
    interval that actually occurs between the figure's tones (repeated at the equave).
    Then notes of this figure share partials and fuse, in whatever tuning was drawn. */
 function mirrorSpectrum(tones,{partials,mirror,equave}){
  const E=Math.log(equave),cand=[0];
  for(const a of tones)for(const b of tones){let d=Math.log(a.hz/b.hz);d-=Math.floor(d/E)*E;if(d>3/1200*LN2&&E-d>3/1200*LN2&&!cand.some(c=>Math.abs(c-d)<3/1200*LN2))cand.push(d)}
  cand.sort((a,b)=>a-b);const tol=100/1200*LN2,ratios=[];
  for(let k=1;k<=partials;k++){const lk=Math.log(k),base=Math.floor(lk/E)*E;let best=lk,dist=tol;
   for(const shift of [base-E,base,base+E])for(const c of cand){const x=shift+c,d=Math.abs(x-lk);if(x>=0&&d<dist){dist=d;best=x}}
   ratios.push(Math.exp(lk+(best-lk)*mirror))}
  return {ratios,intervals:cand.map(c=>Math.exp(c)),tones};
 }
 async function hildegard(job,L,R,io){
  const p=job.params,sr=job.sampleRate,frames=job.frames,BL=64,tones=scaleOf(job.events,sr),P=Math.round(p.partials);
  const spec=mirrorSpectrum(tones,{partials:P,mirror:p.mirror,equave:p.equave}),ratio=spec.ratios,slope=2.2-1.7*p.tilt,random=rng(0x48494c44);
  const base=new Float64Array(P),hard=new Float64Array(P),tau=new Float64Array(P),det=new Float64Array(P);let norm=0;
  for(let k=0;k<P;k++){base[k]=Math.pow(k+1,-slope);hard[k]=Math.exp(-k*(1-p.hardness)*.22);tau[k]=Math.max(.03,p.decay*Math.pow(k+1,-.7));det[k]=p.shimmer*.0012*(.3+.7*random());norm+=base[k]*base[k]}
  norm=.36/Math.sqrt(norm);const mid=(1+p.width)/2,side=(1-p.width)/2,phL=new Float64Array(P),phR=new Float64Array(P),a0=new Float64Array(P),a1=new Float64Array(P);
  const amps=(v,i,out)=>{const g=v.gain(i),gn=clamp(g/v.peak,0,1),age=i/sr,soft=p.dynamics*1.2*(1-gn),level=Math.sqrt(gn);
   for(let k=0;k<P;k++)out[k]=base[k]*norm*((1-p.bow)*v.peak*hard[k]*Math.exp(-age/tau[k])*level+p.bow*g*Math.pow(k+1,-soft))};
  for(let vi=0;vi<job.events.length;vi++){
   const v=voice(job.events[vi],job,p),top=.45*sr,noise=rng(0x9e3779b9^vi*2654435761);let o=v.n0%frames;amps(v,0,a0);
   for(let k=0;k<P;k++)phL[k]=phR[k]=k?noise():0; // spread overtone phases: same spectrum, far lower peaks
   // Mallet noise: a few milliseconds of resonated noise at the strike. Deterministic per note.
   const strike=(1-p.bow)*p.hardness*.22*v.peak,nf=clamp(Math.exp(v.logHz(0))*6,800,7000),nr=Math.exp(-Math.PI*nf*.35/sr),nc=2*nr*Math.cos(TAU*nf/sr);let n1=0,n2=0;
   for(let i=0;i<v.total;i+=BL){
    const count=Math.min(BL,v.total-i),h0=Math.exp(v.logHz(Math.min(i,v.len-1)))/sr,h1=Math.exp(v.logHz(Math.min(i+count,v.len-1)))/sr;amps(v,i+count,a1);
    for(let j=0;j<count;j++){const u=j/count,f=h0+(h1-h0)*u;let l=0,r=0;
     for(let k=0;k<P;k++){const fk=f*ratio[k];if(fk*sr>=top)continue;const a=(a0[k]+(a1[k]-a0[k])*u)*Math.min(1,(top-fk*sr)/(.05*sr));
      const sl=sin1(phL[k]),sr2=det[k]>0?sin1(phR[k]):sl;l+=a*(sl*mid+sr2*side);r+=a*(sr2*mid+sl*side);
      phL[k]+=fk*(1-det[k]);phR[k]+=fk*(1+det[k]);if(phL[k]>=1)phL[k]-=1;if(phR[k]>=1)phR[k]-=1}
     if(strike>0&&i+j<sr*.08){const e=Math.exp(-(i+j)/(sr*.012))*strike,x=(noise()*2-1)*(1-nr),y=x+nc*n1-nr*nr*n2;n2=n1;n1=y;l+=y*e*6;r+=y*e*6}
     if(o<frames){L[o]+=l;R[o]+=r}if(++o>=frames&&v.wrap)o=0}
    a0.set(a1);if((i/BL&63)===0)await io.tick(.8*(vi+i/v.total)/job.events.length);
   }
  }
  // Sympathetic halo: resonators on the figure's own tones answer the dry sound.
  let resonators=0;
  if(p.halo>0&&tones.length){
   const E=p.equave,list=[],maxW=Math.max(...tones.map(t=>t.weight));
   for(const t of tones)for(let n=-6;n<=6;n++){const hz=t.hz*E**n;if(hz>=60&&hz<=Math.min(6000,.4*sr))list.push({hz,w:Math.sqrt(t.weight/maxW)/(1+.35*Math.abs(Math.log2(hz/440)))})}
   list.sort((a,b)=>b.w-a.w);const bank=list.slice(0,48);resonators=bank.length;
   const tail=Math.min(Math.round(p.haloDecay*1.3*sr),12*sr),wrap=p.tailWrap>=.5,dry=new Float32Array(frames);for(let i=0;i<frames;i++)dry[i]=(L[i]+R[i])*.5;
   const gainAll=p.halo*1.6/Math.sqrt(bank.length);
   for(let m=0;m<bank.length;m++){const b=bank[m],r=Math.pow(10,-3/(p.haloDecay*sr)),c=r*Math.cos(TAU*b.hz/sr),s=r*Math.sin(TAU*b.hz/sr),g=Math.sqrt(1-r)*.12*b.w*gainAll;
    const pan=p.width*Math.sin(m*2.39996),gl=g*Math.cos((pan+1)*Math.PI/4),gr=g*Math.sin((pan+1)*Math.PI/4);let zr=0,zi=0;
    for(let i=0;i<frames+tail;i++){const x=i<frames?dry[i]:0,t=x+c*zr-s*zi;zi=s*zr+c*zi;zr=t;const q=i<frames?i:wrap?i%frames:-1;if(q>=0){L[q]+=zr*gl;R[q]+=zr*gr}}
    if((m&3)===0)await io.tick(.8+.2*m/bank.length)}
  }
  return {tones:tones.map(t=>t.hz),ratios:ratio,resonators};
 }

 /* ---------- I · Ingor: a spectrum that is the same at every scale ---------- */
 async function isolde(job,L,R,io){
  const p=job.params,sr=job.sampleRate,frames=job.frames,dur=job.durationSec,BL=64,E=p.equave;
  const D=Math.max(1,Math.min(Math.round(p.density),Math.floor(Math.log(E)/Math.log(1.07)))),step=Math.log(E)/D,lc=Math.log(p.center),top=.45*sr;
  const stepsPerOctave=LN2/step,H=Math.max(1,Math.min(Math.round(p.body),Math.floor(160/Math.max(1,Math.ceil(Math.log(top/18)/step)+2))));
  let hn=0;for(let h=1;h<=H;h++)hn+=Math.pow(h,-3);const norm=.5/Math.sqrt(p.span*stepsPerOctave*.375*hn),halfSpan=p.span/2;
  const bell=lf=>{const u=(lf-lc)/LN2/halfSpan;if(u<=-1||u>=1)return 0;const c=Math.cos(Math.PI*u/2);return c*c};
  const edge=hz=>hz<=18||hz>=top?0:Math.min(1,(hz-18)/6,(top-hz)/(.05*sr));
  const shape=1+5*p.sharp,pulseGain=1+p.pulse*(.6+p.sharp*.9);
  for(let vi=0;vi<job.events.length;vi++){
   const v=voice(job.events[vi],job,p),rotMax=Math.abs(p.spiral)*(1+v.total/frames);
   const nLo=Math.floor(Math.log(18/v.maxHz)/step-rotMax)-1,nHi=Math.ceil(Math.log(top/v.minHz)/step+rotMax)+1,C=nHi-nLo+1;
   const seed=rng(0x49534f4c^vi*40503),phase=Float64Array.from({length:C*H},seed),w0=new Float32Array(C),w1=new Float32Array(C),pl0=new Float32Array(C),pl1=new Float32Array(C),pr0=new Float32Array(C),pr1=new Float32Array(C),env=new Float32Array(C).fill(-1);
   const weights=(i,wt,pl,pr)=>{const t=v.startSec+i/sr,rot=p.spiral*t/dur,lh=v.logHz(Math.min(i,v.len-1)),g=v.gain(i);
    for(let c=0;c<C;c++){const lf=lh+(nLo+c+rot)*step,hz=Math.exp(lf);let a=bell(lf)*edge(hz);if(a<=0){wt[c]=0;env[c]=-1;continue}
     const slot=(lf-lc)/step;
     if(p.pulse>0){ // every register pulses at its own, loop-synchronous rate
      const perLoop=Math.max(1,Math.round(p.pulseRate*Math.pow(p.pulseRatio,Math.round(slot)/D))),rate=perLoop/dur;
      const e=rate>30?.5:Math.pow(.5+.5*Math.cos(TAU*perLoop*t/dur),shape);env[c]=env[c]<0?e:env[c]+(e-env[c])*.35;a*=(1-p.pulse+p.pulse*env[c])*pulseGain}
     const pan=p.swirl*p.width*Math.sin(TAU*slot*.381966),ang=(pan+1)*Math.PI/4;a*=g*norm;wt[c]=a;pl[c]=a*Math.cos(ang)*Math.SQRT2;pr[c]=a*Math.sin(ang)*Math.SQRT2}
    return lh};
   let o=v.n0%frames,l0=weights(0,w0,pl0,pr0);
   for(let i=0;i<v.total;i+=BL){
    const count=Math.min(BL,v.total-i),l1=weights(i+count,w1,pl1,pr1),t0=v.startSec+i/sr,r0=p.spiral*t0/dur,r1=p.spiral*(t0+count/sr)/dur;
    for(let c=0;c<C;c++){
     if(w0[c]<=0&&w1[c]<=0)continue;
     const fa=Math.exp(l0+(nLo+c+r0)*step)/sr,fb=Math.exp(l1+(nLo+c+r1)*step)/sr,df=(fb-fa)/count,dl=(pl1[c]-pl0[c])/count,dr=(pr1[c]-pr0[c])/count;
     for(let h=1;h<=H;h++){if(Math.max(fa,fb)*h*sr>=top)break;const hg=Math.pow(h,-1.5);let ph=phase[c*H+h-1],f=fa*h,gl=pl0[c]*hg,gr=pr0[c]*hg,q=o;
      for(let j=0;j<count;j++){if(q<frames){const s=sin1(ph);L[q]+=s*gl;R[q]+=s*gr}ph+=f;if(ph>=1)ph-=1;f+=df*h;gl+=dl*hg;gr+=dr*hg;if(++q>=frames&&v.wrap)q=0}
      phase[c*H+h-1]=ph}
    }
    o+=count;if(o>=frames&&v.wrap)o-=frames;w0.set(w1);pl0.set(pl1);pr0.set(pr1);l0=l1;if((i/BL&63)===0)await io.tick((vi+i/v.total)/job.events.length);
   }
  }
  return {components:Math.round(p.span*stepsPerOctave),density:D,body:H};
 }

 /* ---------- Room: 8-line feedback delay network, exact for a loop ---------- */
 // The network is time-periodic with the loop (its slow modulation completes whole
 // cycles), so folding the complete tail back equals the steady state of endless repetition.
 async function room(L,R,job,io){
  const p=job.params,sr=job.sampleRate,frames=L.length;if(!(p.space>0))return 0;
  const t60=.4+p.size*p.size*7,scale=(.55+p.size*.9)*sr/1000,wrap=p.tailWrap>=.5,tail=wrap?Math.min(Math.round(t60*1.25*sr),14*sr):0,total=frames+tail;
  const ms=[29.7,37.1,41.1,43.7,53.3,59.9,67.3,73.1],n=8,len=ms.map(m=>Math.round(m*scale)|1),size=1<<Math.ceil(Math.log2(Math.max(...len)+64)),mask=size-1;
  const lines=len.map(()=>new Float32Array(size)),fb=len.map(l=>Math.pow(10,-3*l/(t60*sr))),lp=new Float64Array(n),damp=.25+.5*(1-p.size*.5);
  const cyc=[1,2,3,2,1,3,2,1].map(c=>Math.max(1,Math.round(c*job.durationSec*.11))),depth=.0006*sr,pre=Math.round(.012*sr),outL=new Float32Array(frames),outR=new Float32Array(frames);
  // two Schroeder allpasses per input channel smear transients before the network
  const ap=[[5.3,1.7],[6.1,2.3]].map(c=>c.map(m=>{const d=Math.round(m*sr/1000)|1;return {b:new Float32Array(d),i:0,d}}));
  const pass=(a,x)=>{const y=a.b[a.i];const z=x+y*.6;a.b[a.i]=z;a.i=a.i+1===a.d?0:a.i+1;return y-z*.6};
  const tap=new Float64Array(n);let w=0,lowL=0,lowR=0;const hp=Math.exp(-TAU*110/sr),wet=p.space*.45;
  for(let i=0;i<total;i++){
   const src=i-pre;let xl=src>=0&&src<frames?L[src]:0,xr=src>=0&&src<frames?R[src]:0;xl=pass(ap[0][1],pass(ap[0][0],xl));xr=pass(ap[1][1],pass(ap[1][0],xr));
   let sum=0;const ti=i/frames;
   for(let k=0;k<n;k++){const d=len[k]+depth*(1+sin1(cyc[k]*ti+k*.13)),pos=w-d+size,i0=Math.floor(pos),f=pos-i0,a=lines[k][i0&mask],b=lines[k][(i0+1)&mask];
    const y=a+(b-a)*f;lp[k]+=(y-lp[k])*damp;tap[k]=lp[k];sum+=lp[k]}
   sum*=2/n;let yl=0,yr=0;
   for(let k=0;k<n;k++){const v=tap[k];lines[k][w&mask]=(k&1?xr:xl)*.5+(v-sum)*fb[k];if(k&1)yr+=k&2?v:-v;else yl+=k&2?-v:v}
   w++;lowL=lowL*hp+yl*(1-hp);lowR=lowR*hp+yr*(1-hp); // the room carries no sub-bass
   const q=i<frames?i:i%frames;outL[q]+=(yl-lowL)*wet;outR[q]+=(yr-lowR)*wet;
   if((i&32767)===0)await io.tick(i/total);
  }
  for(let i=0;i<frames;i++){L[i]+=outL[i];R[i]+=outR[i]}return t60;
 }

 const engines={gaia,hildegard,isolde};
 /* job: {engine,params,events:[{startSec,endSec,pitch:[Hz],gain:[0..1],fadeInSec?,fadeOutSec?}],durationSec,sampleRate,terrain?}
    returns {left,right,sampleRate,report}. Never mutates its input. */
 async function render(job,{onProgress=()=>{},check=()=>{},cooperative=false}={}){
  const run=engines[job?.engine];if(!run)throw Error('Unknown Forge voice engine');
  const {durationSec,sampleRate:sr}=job;
  if(!Number.isFinite(durationSec)||durationSec<=0||durationSec>600||!Number.isFinite(sr)||sr<8000||sr>192000)throw Error('Invalid Forge voice render bounds');
  const frames=Math.round(durationSec*sr);if(frames<64||frames>24000000)throw Error('The figure is too long for this sample rate');
  let events=(job.events||[]).filter(e=>e&&e.endSec>e.startSec&&e.pitch?.length&&e.gain?.length&&e.gain.some(g=>g>1e-6));
  if(!events.length)throw Error('The carrier figure is empty.');
  // Dense pictures (textures, imported images) can hold thousands of strokes. The 512 that carry
  // the most sound are rendered; the report says how many were left out. Nothing is cut silently.
  const found=events.length,LIMIT=512;
  if(found>LIMIT){const weight=e=>(e.endSec-e.startSec)*Math.max(...e.gain);events=events.map((e,i)=>[weight(e),i,e]).sort((a,b)=>b[0]-a[0]||a[1]-b[1]).slice(0,LIMIT).sort((a,b)=>a[1]-b[1]).map(x=>x[2])}
  const L=new Float32Array(frames),R=new Float32Array(frames);let stage=0,last=Date.now();const spans=job.params.space>0?[.86,.14]:[1,0];
  const io={async tick(f){check();onProgress(clamp((stage?spans[0]:0)+f*spans[stage],0,.999));if(cooperative&&Date.now()-last>14){await pause();last=Date.now();check()}}};
  const work={...job,events,frames},detail=await run(work,L,R,io);check();stage=1;
  const t60=await room(L,R,work,io);check();
  let peak=0,sum=0;for(let i=0;i<frames;i++){const a=L[i],b=R[i];if(!(a===a&&b===b))throw Error('Invalid Forge voice audio');const m=Math.max(Math.abs(a),Math.abs(b));if(m>peak)peak=m;sum+=a*a+b*b}
  // A transparent safety gain instead of a clipper: the whole cycle is scaled, never distorted.
  const gain=peak*job.params.level>.92?.92/peak:job.params.level,fade=job.params.tailWrap>=.5?0:Math.min(Math.round(.006*sr),frames>>1);
  for(let i=0;i<frames;i++){const e=fade?Math.min(1,(frames-1-i)/fade):1;L[i]*=gain*e;R[i]*=gain*e}
  onProgress(1);
  return {left:L,right:R,sampleRate:sr,report:{engine:job.engine,notes:events.length,omitted:found-events.length,peak:peak*gain,rms:Math.sqrt(sum/(2*frames))*gain,guardDb:20*Math.log10(gain/job.params.level),roomSeconds:t60,...detail}};
 }
 return Object.freeze({render,scaleOf,mirrorSpectrum,prepareTerrain,audibleHz,fft});
}
if(typeof module!=='undefined'&&module.exports)module.exports=createForgeVoicesDSP;
/* Forge Voices runtime (lazy, Forge room only). Turns the current figure into a
   serializable job and renders it in a short-lived Worker: nothing here runs while
   the Live Room plays, and no Worker, timer or buffer outlives a render. */
const __ForgeVoicesRuntime=(()=>{
 let scriptURL=null,direct=null;
 function script(){
  if(!scriptURL){const source=createForgeVoicesDSP.toString()+`
const dsp=createForgeVoicesDSP();onmessage=async e=>{try{const r=await dsp.render(e.data,{onProgress:p=>postMessage({progress:p})});postMessage({result:r},[r.left.buffer,r.right.buffer])}catch(error){postMessage({error:String(error&&error.message||error)})}};`;
   scriptURL=URL.createObjectURL(new Blob([source],{type:'text/javascript'}))}
  return scriptURL;
 }
 const local=()=>direct??(direct=createForgeVoicesDSP());
 function run(job,{check=()=>{},onProgress=()=>{}}={}){
  check();if(typeof Worker==='undefined')return local().render(job,{check,onProgress,cooperative:true});
  return new Promise((resolve,reject)=>{
   let worker,timer,done=false;const finish=(error,value)=>{if(done)return;done=true;clearInterval(timer);worker?.terminate();error?reject(error):resolve(value)};
   try{worker=new Worker(script());
    worker.onmessage=e=>{try{check();if(e.data.error)throw Error(e.data.error);if(e.data.result)finish(null,e.data.result);else onProgress(e.data.progress)}catch(error){finish(error)}};
    worker.onerror=e=>finish(Error('Forge voice worker: '+e.message));timer=setInterval(()=>{try{check()}catch(error){finish(error)}},20);worker.postMessage(job);
   }catch(error){finish(error)}
  });
 }
 // The drawing as height map. Row 0 is the top of the picture (20 kHz), as everywhere in the Forge.
 function terrainOf(grid){
  const width=grid.width,height=grid.height,data=new Float32Array(width*height);
  for(let x=0;x<width;x++){const column=grid.getColumn(x);for(let y=0;y<height;y++){const v=column[y];if(v>0)data[y*width+x]=v<1?v:1}}
  return {width,height,data};
 }
 const eventsOf=(grid,durationSec,pitchRatio)=>__FractaliaMaterialRuntime.events(grid,durationSec,pitchRatio)
  .map(e=>({startSec:e.startSec,endSec:e.endSec,pitch:Array.from(e.pitch),gain:Array.from(e.gain),fadeInSec:e.fadeInSec||0,fadeOutSec:e.fadeOutSec||0}));
 async function renderCarrier({machineId,grid,durationSec,previewPitchRatio=1,instrument,onProgress,signal}){
  const spec=__ForgeVoices.spec,engine=spec.engineOf(machineId);if(!engine)throw Error('Unknown Forge voice');
  const recipe=spec.recipe(engine,instrument?.[engine]??__ForgeVoices.snapshot()[engine]),transport=__f333Epoch;
  const check=()=>{if(signal?.aborted||transport!==__f333Epoch)throw new DOMException('Forge voice render cancelled','AbortError')};check();
  const events=eventsOf(grid,durationSec,previewPitchRatio);if(!events.length)throw Error('The carrier figure is empty.');
  const context=xt.getContext(),job={engine,params:recipe.params,events,durationSec,sampleRate:context.sampleRate,pitchRatio:previewPitchRatio,terrain:engine==='gaia'?terrainOf(grid):undefined};
  const result=await run(job,{check,onProgress});check();
  const buffer=context.createBuffer(2,result.left.length,result.sampleRate);buffer.copyToChannel(result.left,0);buffer.copyToChannel(result.right,1);
  return {buffer,report:result.report};
 }
 // The panels read the figure the same way the renderer does (pitch classes, mirrored overtones).
 function figure(){
  const state=pe.getState(),grid=state.spectralData,durationSec=Zp(state.materialExport.bars,state.materialExport.bpm,state.materialExport.beatsPerBar);
  let events=[];try{events=eventsOf(grid,durationSec,1)}catch{}
  return {events,durationSec,grid};
 }
 const api={renderCarrier,figure,dsp:local,terrainOf};__ForgeVoices.register(api);return api;
})();
/* Forge Voices · Synth Lab panels for Gahjer, Holgriot and Ingor (lazy, Forge room only).
   KALT: no timers or animation loops. Pictures are redrawn only when the recipe or the
   drawing changes. Sliders answer immediately on screen; the recipe (and with it the
   render) is committed once the hand rests, and a running preview restarts by itself. */
const __ForgeVoiceUI=(()=>{
 const ACCENT={gaia:['#34d399','#064e3b','#0c1f1a'],hildegard:['#fbbf24','#78350f','#1f170a'],isolde:['#38bdf8','#0c4a6e','#0a1a24']};
 const pct=v=>Math.round(v*100)+' %',ms=v=>v<1?Math.round(v*1000)+' ms':v.toFixed(2)+' s',sec=v=>v.toFixed(2)+' s',int=v=>String(Math.round(v));
 const cents=r=>Math.round(1200*Math.log2(r))+' ct';
 // label, value text, one-line meaning. Order is the order on screen.
 const META={
  gaia:[['reachPitch','Reach · pitch',v=>v.toFixed(2)+' st','How far the orbit looks up and down the picture: which neighbouring voices colour the note.'],
   ['reachTime','Reach · time',ms,'How far it looks back (left ear) and ahead (right ear) in time.'],
   ['lift','Lift',v=>v.toFixed(2),'1 = the orbit just touches the note\'s own line. 0 = centred on it. Negative = it looks upwards.'],
   ['lobes','Lobes',int,'Loops of the orbit. More lobes emphasise higher overtones.'],
   ['relief','Relief',v=>v<.34?'sharp':v<.67?'rolling':'soft','Sharp ridges sound bright and reedy, soft hills round and flute-like.'],
   ['drift','Drift',pct,'The orbit slowly changes shape while a note lasts. Pitch stays exact.'],
   ['dynamics','Dynamics → orbit',pct,'Louder strokes swing a wider orbit and sound richer.'],
   ['anchor','Fundamental',pct,'Keeps the drawn pitch clear, however wild the terrain is.'],
   ['richness','Overtone limit',int,'Highest overtone read from the terrain.']],
  hildegard:[['mirror','Mirror',pct,'0 = ordinary harmonics. 100 % = every overtone moves to an interval that occurs in the figure.'],
   ['partials','Overtones',int,''],['tilt','Brightness',pct,''],
   ['bow','Strike ↔ Bow',v=>v<.2?'struck':v>.8?'bowed':'mixed','Struck tones ring out on their own; bowed tones follow the drawn loudness.'],
   ['decay','Ring time',sec,'How long a struck tone rings. High overtones fade first.'],
   ['hardness','Mallet',v=>v<.34?'felt':v<.67?'wood':'metal',''],
   ['dynamics','Dynamics → colour',pct,'Softer strokes sound darker.'],
   ['halo','Sympathetic halo',pct,'Resonators on the figure\'s own tones answer everything that is played.'],
   ['haloDecay','Halo ring',sec,''],['shimmer','Shimmer',pct,'Slow beating between the left and right overtones.']],
  isolde:[['density','Steps per equave',int,'1 = one partial per equave (the classic endless tone).'],
   ['body','Body',int,'Harmonics of each partial: 1 is glassy, 4 is full.'],
   ['center','Centre',v=>Math.round(v)+' Hz','Where the sound is loudest. It stays there, whatever the pitch does.'],
   ['span','Span',v=>v.toFixed(1)+' oct','Width of the audible window.'],
   ['spiral','Spiral',v=>v===0?'still':(v>0?'+':'')+Math.round(v)+' steps / loop','The whole spectrum climbs or sinks during the loop and arrives exactly where it began.'],
   ['pulse','Pulse depth',pct,'Each register pulses at its own rate.'],
   ['sharp','Pulse sharpness',pct,''],['swirl','Swirl',pct,'Registers are spread around the stereo field and rotate with the spiral.']],
  common:[['attack','Attack',ms,''],['release','Release',ms,'The tail belongs to the note. With wrapping on it continues at the start of the loop.'],
   ['width','Stereo width',pct,''],['space','Room',pct,''],['size','Room size',v=>(.4+v*v*7).toFixed(1)+' s',''],['level','Level',pct,'']]};
 const RATIOS={equave:['Equave',[['2/1',2],['3/1',3],['3/2',1.5],['φ',1.6180339887]],'The interval at which the sound repeats itself. 2/1 is the octave, 3/1 the tritave.'],
  pulseRate:['Pulses per loop',[['1',1],['2',2],['3',3],['4',4],['5',5],['7',7]],'Pulses of the centre register in one loop. Any number, whole numbers keep the loop seamless.'],
  pulseRatio:['Pulse ratio per equave',[['2',2],['3',3],['3/2',1.5]],'One equave higher pulses this much faster. Rates are rounded to whole pulses per loop.']};
 const parseRatio=text=>{const m=String(text).trim().replace(',','.').match(/^(\d*\.?\d+)\s*(?:[/:]\s*(\d*\.?\d+))?$/);if(!m)return NaN;return m[2]?+m[1]/+m[2]:+m[1]};

 function Slider({engine,name,label,format,hint,value,spec,accent,onLive,onCommit}){
  const h=P.createElement,[local,setLocal]=P.useState(value);P.useEffect(()=>setLocal(value),[value]);
  return h('label',{title:hint||undefined,style:{display:'grid',gridTemplateColumns:'minmax(0,7.6rem) minmax(0,1fr) 5.2rem',alignItems:'center',gap:8,fontSize:11,color:'#cbd5e1',minHeight:26}},
   h('span',{style:{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},label),
   h('input',{type:'range','aria-label':label,'data-forge-voice-param':name,min:spec.min,max:spec.max,step:spec.step,value:local,style:{width:'100%',accentColor:accent},
    onChange:e=>{const v=+e.target.value;setLocal(v);onLive(name,v)},onPointerUp:()=>onCommit(),onKeyUp:()=>onCommit(),onBlur:()=>onCommit()}),
   h('span',{style:{textAlign:'right',fontVariantNumeric:'tabular-nums',color:'#f1f5f9'}},format(local)));
 }
 function RatioField({name,value,spec,accent,onSet}){
  const h=P.createElement,[label,chips,hint]=RATIOS[name],[text,setText]=P.useState(''),[bad,setBad]=P.useState(false);
  const show=v=>{const c=chips.find(c=>Math.abs(c[1]-v)<1e-6);return c?c[0]:String(+v.toFixed(5))};P.useEffect(()=>{setText(show(value));setBad(false)},[value]);
  const commit=()=>{const v=text.trim()==='φ'?1.6180339887:parseRatio(text);if(!(v>=spec.min&&v<=spec.max)){setBad(true);return}setBad(false);onSet(name,v)};
  return h('div',{title:hint,style:{display:'grid',gridTemplateColumns:'minmax(0,7.6rem) minmax(0,1fr)',alignItems:'center',gap:8,fontSize:11,color:'#cbd5e1',minHeight:28}},
   h('span',null,label),
   h('div',{style:{display:'flex',flexWrap:'wrap',gap:4,alignItems:'center'}},
    ...chips.map(([t,v])=>h('button',{key:t,type:'button','data-forge-voice-ratio':name+':'+t,onClick:()=>onSet(name,v),
     style:{padding:'2px 7px',borderRadius:4,border:'1px solid '+(Math.abs(v-value)<1e-6?accent:'#334155'),background:Math.abs(v-value)<1e-6?accent+'22':'transparent',color:'#e2e8f0',fontSize:11}},t)),
    h('input',{type:'text','aria-label':label+' (ratio or number)','data-forge-voice-ratio-input':name,value:text,onChange:e=>setText(e.target.value),onBlur:commit,onKeyDown:e=>{if(e.key==='Enter'){e.preventDefault();commit()}},
     style:{width:'4.6rem',padding:'2px 5px',borderRadius:4,border:'1px solid '+(bad?'#f87171':'#334155'),background:'#0b1220',color:'#f1f5f9',fontSize:11}}),
    name==='equave'?h('span',{style:{color:'#94a3b8'}},cents(value)):null,
    bad?h('span',{role:'alert',style:{color:'#fca5a5'}},'Use '+spec.min+' … '+spec.max+', e.g. 3/2'):null));
 }

 /* Pictures. Each shows what the renderer will actually read. */
 // A magnifier on the longest note: the terrain around it and the path the two ears travel.
 function drawGaia(ctx,W,H,accent,params,fig){
  const ev=fig.events.slice().sort((a,b)=>(b.endSec-b.startSec)*Math.max(...b.gain)-(a.endSec-a.startSec)*Math.max(...a.gain))[0];
  if(!ev){ctx.fillStyle='#94a3b8';ctx.font='11px monospace';ctx.fillText('Draw a figure: it becomes the landscape.',10,H/2);return}
  const grid=fig.grid,gw=grid.width,gh=grid.height,rowsPerSemi=gh/(12*Math.log2(1000)),hz=ev.pitch[ev.pitch.length>>1];
  const cxg=(ev.startSec+ev.endSec)/2/fig.durationSec*gw,cyg=(1-Math.log(hz/20)/Math.log(1000))*gh-.5;
  const ryg=params.reachPitch*rowsPerSemi,rxg=params.reachTime/fig.durationSec*gw,halfRows=Math.max(4*rowsPerSemi,(Math.abs(params.lift)+1.25)*ryg),halfCols=Math.max(gw*.02,rxg*1.6,halfRows*W/H*.6);
  const image=ctx.createImageData(W,H),columns=new Map();
  for(let x=0;x<W;x++){let gx=Math.round(cxg+(x/(W-1)*2-1)*halfCols);gx=((gx%gw)+gw)%gw;let c=columns.get(gx);if(!c){c=grid.getColumn(gx);columns.set(gx,c)}
   for(let y=0;y<H;y++){const gy=Math.round(cyg+(y/(H-1)*2-1)*halfRows),v=gy>=0&&gy<gh?Math.min(1,c[gy]||0):0,i=(y*W+x)*4;image.data[i]=14+40*v;image.data[i+1]=30+200*v;image.data[i+2]=34+130*v;image.data[i+3]=255}}
  ctx.putImageData(image,0,0);
  const sx=W/2/halfCols,sy=H/2/halfRows,x=W/2,y=H/2,cy=y+params.lift*ryg*sy,lobes=Math.round(params.lobes);
  for(const [color,dir,offset] of [['#7dd3fc',1,0],['#fdba74',-1,params.width*.6]]){ctx.strokeStyle=color;ctx.lineWidth=1.6;ctx.beginPath();
   for(let j=0;j<=240;j++){const a=Math.PI*2*j/240,px=x+dir*Math.max(1,rxg*sx)*Math.cos(a),py=cy-ryg*sy*Math.sin(lobes*a+offset);j?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.stroke()}
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,2.4,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#cbd5e1';ctx.font='10px monospace';ctx.fillText('± '+(halfRows/rowsPerSemi).toFixed(1)+' st · ± '+Math.round(halfCols/gw*fig.durationSec*1000)+' ms around the longest note',6,H-5);
 }
 function drawHildegard(ctx,W,H,accent,params,fig){
  const dsp=__ForgeVoicesRuntime.dsp(),tones=dsp.scaleOf(fig.events),P2=Math.round(params.partials),spec=dsp.mirrorSpectrum(tones,{partials:P2,mirror:params.mirror,equave:params.equave});
  const top=Math.log(P2+1),X=r=>8+Math.log(r)/top*(W-16),slope=2.2-1.7*params.tilt;
  ctx.strokeStyle='#33415588';ctx.lineWidth=1;for(let k=1;k<=P2;k++){ctx.beginPath();ctx.moveTo(X(k),H-14);ctx.lineTo(X(k),H-8);ctx.stroke()}
  spec.ratios.forEach((r,k)=>{const a=Math.pow(k+1,-slope*.45),moved=Math.abs(Math.log(r/(k+1)))>.002;ctx.strokeStyle=moved?accent:'#e2e8f0';ctx.lineWidth=moved?2:1.2;ctx.beginPath();ctx.moveTo(X(r),H-16);ctx.lineTo(X(r),H-16-a*(H-30));ctx.stroke()});
  ctx.fillStyle='#94a3b8';ctx.font='10px monospace';ctx.fillText(tones.length<2?'One pitch only: add a second note to mirror':tones.length+' tones · '+spec.intervals.length+' intervals · '+spec.ratios.filter((r,k)=>Math.abs(Math.log(r/(k+1)))>.002).length+' overtones moved',8,11);
 }
 function drawIsolde(ctx,W,H,accent,params,fig){
  const E=params.equave,D=Math.max(1,Math.min(Math.round(params.density),Math.floor(Math.log(E)/Math.log(1.07)))),step=Math.log(E)/D,ev=fig.events[0],hz=ev?ev.pitch[0]:220;
  const cx=W/2,cy=H/2+2,R=Math.min(W,H)/2-8,lo=Math.log(20),range=Math.log(1000),half=params.span/2;
  ctx.strokeStyle='#475569';ctx.lineWidth=1;ctx.beginPath();
  for(let i=0;i<=600;i++){const lf=lo+range*i/600,a=lf/Math.log(E)*Math.PI*2,r=4+(lf-lo)/range*R,x=cx+r*Math.cos(a),y=cy-r*Math.sin(a);i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();
  for(let n=Math.ceil((lo-Math.log(hz))/step);;n++){const lf=Math.log(hz)+n*step;if(lf>lo+range)break;const u=(lf-Math.log(params.center))/Math.LN2/half,w=Math.abs(u)<1?Math.cos(Math.PI*u/2)**2:0;
   const a=lf/Math.log(E)*Math.PI*2,r=4+(lf-lo)/range*R;ctx.fillStyle=w>0?accent:'#475569';ctx.globalAlpha=w>0?.35+.65*w:.6;ctx.beginPath();ctx.arc(cx+r*Math.cos(a),cy-r*Math.sin(a),w>0?2+4*w:1.5,0,Math.PI*2);ctx.fill()}
  ctx.globalAlpha=1;
  if(params.pulse>0){const rates=[-2,-1,0,1,2].map(o=>Math.max(1,Math.round(params.pulseRate*Math.pow(params.pulseRatio,o))));ctx.fillStyle='#94a3b8';ctx.font='10px monospace';ctx.fillText('pulses / loop: '+rates.join(' · '),8,H-5)}
 }
 const DRAW={gaia:drawGaia,hildegard:drawHildegard,isolde:drawIsolde};
 function Picture({engine,params,accent}){
  const h=P.createElement,ref=P.useRef(null),grid=pe(s=>s.spectralData),version=pe(s=>s.renderVersion),material=pe(s=>s.materialExport),W=320,H=engine==='isolde'?150:120;
  const fig=P.useMemo(()=>__ForgeVoicesRuntime.figure(),[grid,version,material.bars,material.bpm,material.beatsPerBar]);
  P.useEffect(()=>{const canvas=ref.current,ctx=canvas?.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,W,H);
   try{DRAW[engine](ctx,W,H,accent,params,fig)}catch(error){ctx.fillStyle='#fca5a5';ctx.font='11px monospace';ctx.fillText('Picture unavailable',10,20)}
  },[engine,params,fig,accent]);
  return h('canvas',{ref,width:W,height:H,'data-forge-voice-picture':engine,role:'img','aria-label':engine==='gaia'?'Terrain with the orbit of the longest note; blue is the left ear, orange the right':engine==='hildegard'?'Overtones of each note; coloured lines were moved onto intervals of the figure':'Spiral of partials; bright dots are audible',
   style:{width:'100%',height:'auto',aspectRatio:W+' / '+H,display:'block',borderRadius:5,border:'1px solid '+accent+'55',background:'#070b12'}});
 }

 function Lab({engine}){
  const h=P.createElement,spec=__ForgeVoices.spec,def=spec.engines[engine],[accent,deep,ground]=ACCENT[engine];
  const recipe=P.useSyncExternalStore(__ForgeVoices.subscribe,()=>__ForgeVoices.snapshot()[engine]),report=P.useSyncExternalStore(__ForgeVoices.subscribe,__ForgeVoices.lastReport),failure=P.useSyncExternalStore(__ForgeVoices.subscribe,__ForgeVoices.lastError);
  const [draft,setDraft]=P.useState(recipe.params),pending=P.useRef(null),[more,setMore]=P.useState(false);
  P.useEffect(()=>{pending.current=null;setDraft(recipe.params)},[recipe]);
  // Commit = one recipe change. If the figure was sounding, it is rendered again and keeps playing.
  // The Forge prepares the new sound by itself; playback resumes as soon as that is ready.
  const resume=P.useRef(null),forget=()=>{if(resume.current){resume.current();resume.current=null}};P.useEffect(()=>forget,[]);
  const apply=next=>{const sounding=__ForgeTransportAccess.snapshot().phase==='playing'||!!resume.current;forget();
   if(__ForgeVoices.set(engine,next)===recipe||!sounding)return;
   let seenBusy=false;const again=()=>{const phase=__ForgeTransportAccess.snapshot().phase;if(phase!=='idle'){seenBusy=true;return}if(!seenBusy)return;forget();
     if(__ForgeVoices.engineOf(pe.getState().carrierIntegralSelection?.machineId)===engine)__ForgeTransportAccess.activate()};
   const off=__ForgeTransportAccess.subscribe(again),settle=setTimeout(()=>{seenBusy=true;again()},450),limit=setTimeout(forget,20000);
   resume.current=()=>{off();clearTimeout(settle);clearTimeout(limit)}};
  const live=(name,value)=>{pending.current={...(pending.current??recipe.params),[name]:value};setDraft(pending.current)};
  const commit=()=>{if(pending.current){const params=pending.current;pending.current=null;apply({preset:null,params})}};
  const setNow=(name,value)=>{pending.current=null;apply({preset:null,params:{...recipe.params,[name]:value}})};
  const slider=([name,label,format,hint])=>h(Slider,{key:name,engine,name,label,format,hint,value:draft[name],spec:def.params[name],accent,onLive:live,onCommit:commit});
  const ratio=name=>h(RatioField,{key:name,name,value:recipe.params[name],spec:def.params[name],accent,onSet:setNow});
  const box={border:'1px solid '+accent+'33',borderRadius:6,padding:'8px 9px',marginTop:8,background:ground},head={fontSize:10,letterSpacing:'.12em',textTransform:'uppercase',color:accent,marginBottom:4};
  const own=report?.engine===engine?report:null,db=v=>(20*Math.log10(Math.max(v,1e-6))).toFixed(1);
  return h('section',{'data-forge-voice-lab':engine,style:{padding:'8px 0',color:'#e2e8f0',minWidth:0}},
   h('div',{style:{display:'flex',alignItems:'baseline',gap:8}},h('span',{'aria-hidden':true,style:{fontSize:20,color:accent}},def.glyph),h('strong',{style:{letterSpacing:'.08em'}},def.title.toUpperCase())),
   h('p',{style:{fontSize:11,lineHeight:1.5,color:'#a8b3c4',margin:'5px 0 8px'}},def.summary),
   h(Picture,{engine,params:draft,accent}),
   h('div',{role:'group','aria-label':def.label+' presets',style:{display:'flex',flexWrap:'wrap',gap:5,marginTop:8}},
    ...def.presets.map(p=>h('button',{key:p.id,type:'button','data-forge-voice-preset':p.id,'aria-pressed':recipe.preset===p.id,onClick:()=>{pending.current=null;apply(spec.preset(engine,p.id))},
     style:{padding:'4px 9px',borderRadius:999,border:'1px solid '+(recipe.preset===p.id?accent:'#334155'),background:recipe.preset===p.id?deep:'#0b1220',color:'#f1f5f9',fontSize:11}},p.name))),
   h('div',{style:box},h('div',{style:head},engine==='gaia'?'Orbit':engine==='hildegard'?'Spectrum & touch':'Spiral'),
    engine==='isolde'?ratio('equave'):null,...META[engine].map(slider),engine==='hildegard'?ratio('equave'):null,
    engine==='isolde'?[ratio('pulseRate'),ratio('pulseRatio')]:null),
   h('div',{style:box},
    h('button',{type:'button','aria-expanded':more,'data-forge-voice-more':true,onClick:()=>setMore(v=>!v),style:{...head,background:'none',border:0,padding:0,cursor:'pointer',width:'100%',textAlign:'left',marginBottom:more?4:0}},(more?'▾ ':'▸ ')+'Envelope, stereo & room'),
    more?[...META.common.map(slider),
     h('label',{key:'wrap',title:'Off: tails are cut at the end, for one-shot samples.',style:{display:'flex',alignItems:'center',gap:8,fontSize:11,color:'#cbd5e1',minHeight:26}},
      h('input',{type:'checkbox','data-forge-voice-param':'tailWrap',checked:recipe.params.tailWrap>=.5,onChange:e=>setNow('tailWrap',e.target.checked?1:0),style:{accentColor:accent}}),'Tails continue at the loop start (seamless loop)')]:null),
   h('div',{style:{display:'flex',gap:8,alignItems:'center',marginTop:8}},
    h('button',{type:'button','data-forge-voice-reset':true,onClick:()=>{pending.current=null;apply(spec.recipe(engine))},style:{padding:'4px 9px',borderRadius:4,border:'1px solid #334155',background:'#0b1220',color:'#cbd5e1',fontSize:11}},'Reset '+def.label),
    h('span',{style:{fontSize:10,color:'#7c8798'}},'Play below renders the figure with these settings.')),
   h('p',{role:'status','aria-live':'polite','data-forge-voice-status':failure?'error':own?'rendered':'idle',style:{fontSize:11,lineHeight:1.5,minHeight:32,margin:'8px 0 0',color:failure?'#fca5a5':'#9fb3c8'}},
    failure||(own?own.notes+' notes'+(own.omitted?' (the '+own.notes+' strongest of '+(own.notes+own.omitted)+')':'')+' · peak '+db(own.peak)+' dBFS'+(own.guardDb<-.05?' · levelled '+own.guardDb.toFixed(1)+' dB to stay clean':'')+(own.roomSeconds?' · room '+own.roomSeconds.toFixed(1)+' s':'')+
     (own.resonators?' · '+own.resonators+' halo strings':'')+(own.components?' · '+own.components+' partials per note':''):'Stereo · exact pitch · tails wrap into the loop')));
 }
 return {Lab,parseRatio};
})();
const ForgeVoiceLab=__ForgeVoiceUI.Lab;
(()=>{"use strict";
/* P30 – upper-layer page navigation. Does not affect UP's Synth Lab target.
 * Scroll both the page and any actual scrollable Forge ancestor to the top;
 * never scroll the Stamp Library's independent thumbnail gallery. */
function __forgeScrollCompletelyUp(target){
 const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 const options={top:0,behavior:reduce?'auto':'smooth'};
 let el=target?.parentElement;
 while(el&&el!==document.documentElement){
   const style=window.getComputedStyle?.(el);
   if(el.scrollHeight>el.clientHeight+1&&/auto|scroll/.test(style?.overflowY||'')){
     if(typeof el.scrollTo==='function')el.scrollTo(options);else el.scrollTop=0;
   }
   el=el.parentElement;
 }
 window.scrollTo(options);
}

/* The return trip from the top right corner lands at the actual lower UP anchor. */
function __forgeScrollToForgeActionRack(){
 const target=document.querySelector('.xen-forge-action-rack>.xen-forge-up-triangle')||document.querySelector('.xen-forge-action-rack');
 target?.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'auto':'smooth',block:'end',inline:'nearest'});
}
/* Gold is the full-page return, cyan is the original rack shortcut.
   Scroll only the click target's containing scroll chains, not inner galleries. */
function __forgeScrollCompletelyDown(target){
 const behavior=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'auto':'smooth';
 let el=target?.parentElement;
 while(el&&el!==document.documentElement){
   const style=window.getComputedStyle?.(el);
   if(el.scrollHeight>el.clientHeight+1&&/auto|scroll/.test(style?.overflowY||'')){
     if(typeof el.scrollTo==='function')el.scrollTo({top:el.scrollHeight,behavior});
     else el.scrollTop=el.scrollHeight;
   }
   el=el.parentElement;
 }
 window.scrollTo({top:Math.max(document.documentElement.scrollHeight,document.body?.scrollHeight||0),behavior});
}
/* Details stay semantic and native; only the expensive panel leaves the
   horizontal rack's clipped overflow. Geometry updates only when open. */
function __forgePositionCarrierFilterPanel(details){
 if(!details?.open)return;
 const trigger=details.querySelector('summary'),panel=details.querySelector('.xen-carrier-filter-panel');
 if(!trigger||!panel)return;
 const box=trigger.getBoundingClientRect(),width=Math.min(426,Math.max(240,innerWidth-20));
 const left=Math.max(10,Math.min(innerWidth-width-10,box.right-width));
 const below=box.bottom+7;
 // The filter chevron points DOWN. Never silently flip the overlay above it.
 // If the button sits at the viewport foot, expose space by scrolling its
 // actual scrollable parent, at most once per opening (not on every scroll).
 const room=innerHeight-below-8;
 if(room<Math.min(210,innerHeight*.42)&&details.dataset?.forgeFilterAutoScroll!=='1'){
   if(details.dataset)details.dataset.forgeFilterAutoScroll='1';
   trigger.scrollIntoView?.({behavior:'auto',block:'start',inline:'nearest'});
   if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>__forgePositionCarrierFilterPanel(details));
 }
 panel.style.left=Math.round(left)+'px';panel.style.top=Math.round(below)+'px';
 panel.style.width=width+'px';panel.style.maxHeight=Math.max(0,room)+'px';
}
function FractaliaMaterialImage({material}){
 const ref=P.useRef(null);P.useEffect(()=>{const canvas=ref.current;if(!canvas)return;const ctx=canvas.getContext('2d');ctx.fillStyle='#081b1b';ctx.fillRect(0,0,288,96);if(!material)return;
  if(material.version===3){const {field,columns,rows}=material;for(let x=0;x<columns;x++)for(let y=0;y<rows;y++){const value=Math.sqrt(field[x*rows+y]);if(value<=0)continue;ctx.fillStyle=`rgba(94,234,212,${value})`;ctx.fillRect(x/columns*288,96-(y+1)/rows*96,Math.ceil(288/columns),Math.ceil(96/rows))}}
  else{ctx.strokeStyle='#5eead4';ctx.beginPath();material.contour.forEach((v,i)=>{const x=i/(material.contour.length-1)*288,y=48-v*40;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke()}
 },[material]);return P.createElement('canvas',{ref,width:288,height:96,'data-fractalia-template':material?.version||'none','aria-label':'Active instrument sound-colour template',style:{width:'100%',height:96,display:'block',border:'1px solid #285a51',borderRadius:4}});
}
function FractaliaForgeLab(){
 const h=P.createElement,[recipe,setRecipe]=P.useState(__Fractalia.snapshot),[atlas,setAtlas]=P.useState(null),[captureDetail,setCaptureDetail]=P.useState('standard'),[preparing,setPreparing]=P.useState(false),[busy,setBusy]=P.useState(false),[error,setError]=P.useState(''),[status,setStatus]=P.useState(''),[name,setName]=P.useState(recipe.name),[tick,refresh]=P.useReducer(v=>v+1,0),file=P.useRef(null);
 const grid=pe(s=>s.spectralData),version=pe(s=>s.renderVersion),material=pe(s=>s.materialExport),duration=material.bars*(material.beatsPerBar||4)*60/material.bpm,session=__Fractalia.libraryState(),entries=__Fractalia.libraryEntries(),slots=__Fractalia.slotState(),legacy=recipe.version===2;
 P.useEffect(()=>Vt.subscribe(()=>refresh()),[]);
 P.useEffect(()=>__Fractalia.subscribe(()=>{setRecipe(__Fractalia.snapshot());refresh()}),[]);
 P.useEffect(()=>{setName(recipe.name)},[recipe.name]);
 P.useEffect(()=>{let active=true;const controller=new AbortController();setPreparing(true);setAtlas(null);__Fractalia.atlasFor({grid,durationSec:duration,instrument:recipe,signal:controller.signal,priority:0,check:()=>{if(!active)throw new DOMException('Cancelled','AbortError')}}).then(a=>{if(active){setAtlas(a);setPreparing(false)}}).catch(e=>{if(active){setPreparing(false);if(e.name!=='AbortError'&&recipe.material)setError(e.message)}});return()=>{active=false;controller.abort()}},[grid,version,duration,recipe]);
 const run=async fn=>{setError('');setStatus('');setBusy(true);try{await fn()}catch(e){setError(e.name==='QuotaExceededError'?'Browser storage is full. Export the instrument to a file.':e.name==='AbortError'?'Cancelled: the drawing or instrument changed.':e.message)}finally{setBusy(false)}};
 const materialMode=recipe.donor?.revision>=2;
 const edit=(key,value)=>run(async()=>__Fractalia.set({...recipe,params:{...recipe.params,[key]:value}})),modified=session.modified||name!==recipe.name;
 const button={type:'button',className:'rounded border border-teal-800 bg-teal-950/40 px-2 py-2 text-[11px] text-teal-100 disabled:opacity-40'};
 return h('section',{'data-fractalia-lab':'f3','data-fractalia-engine':recipe.version,style:{padding:'8px 0',color:'#d1fae5',minWidth:0}},
  h('strong',null,'FRACTALIA · Compare & Cache F4.3.3'),h('p',{style:{fontSize:11,lineHeight:1.5,color:'#a7b8b3',margin:'6px 0'}},'Capture a drawing as sound colour. Load that instrument to play any melody drawing.'),
  h('div',{'data-fractalia-material-mode':recipe.material?'instrument':'drawing',style:{border:'1px solid #285a51',padding:8,borderRadius:5,fontSize:11,background:recipe.material?'#13312d':'#101f24'}},
   h('strong',null,recipe.material?'Instrument geometry: '+recipe.name:'Instrument geometry: Follow current drawing'),recipe.material?.rows===256&&h('span',{style:{marginLeft:6,color:'#99f6e4'}},'· Fine capture'),
   h('div',{'data-fractalia-save-state':session.saved?modified?'modified':'saved':recipe.material?'unsaved':'drawing',style:{color:'#a7b8b3',marginTop:3}},recipe.material?(session.saved?(modified?'Unsaved instrument changes':'Saved instrument'):'Captured / imported · not yet saved')+(legacy?' · Legacy F2 sound':recipe.version===4?' · Relational F4':' · Spectral F3'):'Draw → capture → replace the melody → play'),
   h('div',{style:{marginTop:6}},h(FractaliaMaterialImage,{material:recipe.material||atlas?.material})),
   h('div',{style:{fontSize:10,color:'#a7b8b3',marginTop:4}},recipe.material?'Stored instrument drawing · Carrier: current main drawing / composition':'Instrument follows current drawing · Carrier: same current drawing')),
  h('div',{style:{display:'flex',flexWrap:'wrap',gap:10,alignItems:'center',marginTop:8}},
   h('label',{style:{fontSize:11}},'Reading ',h('select',{'aria-label':'Fractalia reading',disabled:busy||legacy,value:recipe.version,onChange:e=>run(async()=>{await __Fractalia.changeReading(+e.target.value);setStatus('New interpretation active. Save Active Instrument keeps a separate copy.')}),className:'rounded border border-teal-800 bg-neutral-900 p-1'},...[[4,'Relational F4'],[3,'Spectral F3'],...legacy?[[2,'Legacy F2']]:[]].map(([id,label])=>h('option',{key:id,value:id},label)))),
   h('label',{style:{fontSize:11}},'Body ',h('select',{'aria-label':'Fractalia Body',disabled:busy,value:recipe.params.body,onChange:e=>edit('body',e.target.value),className:'rounded border border-teal-800 bg-neutral-900 p-1'},...['prism','reed','hollow'].map(v=>h('option',{key:v,value:v},v[0].toUpperCase()+v.slice(1))))),
   !materialMode&&h('label',{style:{fontSize:11}},'Depth ',h('select',{'aria-label':'Fractalia Depth',disabled:busy,value:recipe.params.depth,onChange:e=>edit('depth',+e.target.value),className:'rounded border border-teal-800 bg-neutral-900 p-1'},...[0,1,2,3,4].map(v=>h('option',{key:v,value:v},v)))),
   ...(materialMode?[['motion','Motion',1]]:[['fold','Fold',1.5],['brightness','Brightness',1],['motion','Motion',1],...legacy?[]:[['geometry','Drawn Spacing',1]]]).map(([key,label,max])=>h('label',{key,title:key==='geometry'?'Blend harmonic alignment with the template’s geometric partial spacing':undefined,style:{fontSize:11,display:'flex',gap:5,alignItems:'center'}},label,h('input',{type:'range','aria-label':'Fractalia '+label,min:0,max,step:.05,value:recipe.params[key],onChange:e=>edit(key,+e.target.value),style:{width:85}}),recipe.params[key].toFixed(2)))),
  recipe.version===4&&h('div',{'data-fractalia-donor':true,style:{padding:8,marginTop:8,border:'1px solid #285a51',borderRadius:5,fontSize:11,minHeight:140,overflowWrap:'anywhere'}},
   h('label',null,'Sound source ',h('select',{'aria-label':'Fractalia sound source',style:{maxWidth:'100%',display:'block',minWidth:0},value:!recipe.donor?'internal':materialMode?'material':'donor',disabled:busy,onChange:e=>run(()=>__Fractalia.bindDonor(e.target.value!=='internal',e.target.value==='donor'?'material-flow':'material-relations')),className:'rounded border border-teal-800 bg-neutral-900 p-1'},h('option',{value:'internal'},'Fractalia synthesis'),h('option',{value:'material'},'Current cached donor · Material Relations'),h('option',{value:'donor'},'Current cached donor · Motion 2 pilot'))),
   h('p',{'data-fractalia-source-state':true},recipe.donor?(fractaliaDonorSnapshot().ready?'Current cached donor: '+fractaliaDonorSnapshot().name:'Current cached donor: not prepared'):'Audio source: Fractalia synthesis'),
   recipe.donor&&h('div',null,h('p',null,materialMode?'Material Relations · source-only · mono. Uses the prepared PCM and region mask. Other Donor presets are independent.':'Motion 2 pilot · fixed reading; other Donor presets are independent · mono.'),
    h('label',null,'Ecology ',h('input',{'aria-label':'Fractalia donor ecology',type:'range',min:0,max:1,step:.05,value:recipe.donor.amount,onChange:e=>run(()=>__Fractalia.set({...recipe,donor:{...recipe.donor,amount:+e.target.value}}))}),recipe.donor.amount.toFixed(2))),
   materialMode&&recipe.donor.revision===2&&h('button',{...button,disabled:busy,onClick:()=>run(async()=>{await __Fractalia.bindDonor(true);setStatus('New recombination interpretation active. Save Active Instrument keeps a separate copy.')})},'Enable new recombination'),
   materialMode&&h('div',{'data-fractalia-material-controls':true},
    ...[['warp','Elastic spacing'],['exchange','Family distribution']].map(([key,label])=>h('label',{key,style:{display:'block',marginTop:6}},label,h('input',{'aria-label':'Fractalia '+label,type:'range',min:0,max:1,step:.05,value:recipe.donor[key],onChange:e=>run(()=>__Fractalia.set({...recipe,donor:{...recipe.donor,[key]:+e.target.value}}))}),recipe.donor[key].toFixed(2))),
    recipe.donor.revision>=3&&h('div',null,
     h('label',{style:{display:'block',marginTop:6}},'Recombination ',h('input',{'aria-label':'Fractalia Recombination',type:'range',min:0,max:1,step:.05,value:recipe.donor.recombine,onChange:e=>run(()=>__Fractalia.set({...recipe,donor:{...recipe.donor,recombine:+e.target.value}}))}),recipe.donor.recombine.toFixed(2)),
     h('label',null,'Structure levels ',h('select',{'aria-label':'Fractalia structure levels',value:recipe.donor.layers,onChange:e=>run(()=>__Fractalia.set({...recipe,donor:{...recipe.donor,layers:+e.target.value}}))},h('option',{value:1},'One · family'),h('option',{value:2},'Two · family + internal')))),
    h('label',null,'Material axis ',h('select',{'aria-label':'Fractalia material axis',style:{maxWidth:'100%',display:'block'},value:recipe.donor.axis,onChange:e=>run(()=>__Fractalia.set({...recipe,donor:{...recipe.donor,axis:e.target.value}}))},...[["energy","Material energy"],["absolute","Absolute Hz · 20–20000"],["relative","Harmonic reference · 6 octaves"]].map(([id,label])=>h('option',{key:id,value:id},label)))),
    h('label',{style:{display:'block',marginTop:6}},'Pitch anchor ',h('select',{'aria-label':'Fractalia pitch anchor',style:{maxWidth:'100%',display:'block'},value:recipe.donor.pitchReference,onChange:e=>run(()=>__Fractalia.set({...recipe,donor:{...recipe.donor,pitchReference:e.target.value}}))},h('option',{value:'measured'},'Lowest strong donor peak'),h('option',{value:'neutral'},'Raw donor reference · 220 Hz'))),
    h('label',{style:{display:'block',marginTop:6}},'Evolution seconds ',h('input',{'aria-label':'Fractalia evolution seconds',type:'number',min:.2,max:60,step:.2,value:recipe.donor.evolutionSec,onChange:e=>run(()=>__Fractalia.set({...recipe,donor:{...recipe.donor,evolutionSec:+e.target.value}})),style:{width:65}})),
    h('p',{'data-fractalia-material-report':true},__FractaliaMaterialRuntime.getReport()?(__FractaliaMaterialRuntime.getReport().richness===0?'Sparse donor: no structural deformation is inferred.':'Measured donor material drives spacing and distribution.'):'Play to analyze this donor. Ecology 0 uses the same phase transport as the deformed sound.'),
    h('p',{'data-fractalia-live-audio':true,style:{color:'#a7b8b3'}},'Live transfer: prepared audio. Root Follow and Melodic Loop receive the rendered sound; keep the experiment to edit and render again.'),
    h('div',{style:{display:'flex',gap:6,flexWrap:'wrap'}},h('button',{...button,disabled:busy,onClick:()=>run(async()=>{const json=await __FractaliaExperiments.exported();rP(new Blob([json],{type:'application/json'}),'Fractalia_Material_Experiment.json');setStatus('Frozen donor, instrument, Carrier and timing exported.')})},'Export Frozen Experiment'),
     h('button',{...button,disabled:busy,onClick:()=>run(async()=>{await __FractaliaExperiments.restoreLast();setStatus('Frozen experiment restored.')})},'Restore Last Experiment'),
     h('label',{...button},'Import Experiment',h('input',{type:'file',accept:'.json',style:{display:'none'},'aria-label':'Import Fractalia experiment',onChange:e=>{const f=e.target.files?.[0];e.target.value='';if(f)void run(async()=>{if(f.size>128*1024*1024)throw Error('Experiment exceeds 128 MiB');await __FractaliaExperiments.restore(__FractaliaExperiments.parse(await f.text()));setStatus('Complete material experiment restored.')})}})))),
   materialMode&&__FractaliaExperiments.warning()&&h('p',{style:{color:'#fdba74'}},__FractaliaExperiments.warning())),
  legacy&&h('p',{style:{fontSize:10,color:'#fdba74',margin:'6px 0'}},'F2 material keeps its original sound. Capture the original drawing again to create a Spectral F3 instrument.'),
  h('label',{style:{display:'flex',flexWrap:'wrap',gap:6,alignItems:'center',fontSize:11,marginTop:8}},'Capture detail',h('select',{'aria-label':'Fractalia capture detail',value:captureDetail,disabled:busy,onChange:e=>setCaptureDetail(e.target.value),className:'rounded border border-teal-800 bg-neutral-900 p-1'},h('option',{value:'standard'},'Standard · 24 × 128'),h('option',{value:'fine'},'Fine · more drawing detail')),h('span',{style:{color:'#a7b8b3',fontSize:10}},'Applies to the next Capture / New Instrument.')),
  h('label',{style:{display:'block',fontSize:11,marginTop:8}},'Instrument name',h('input',{'aria-label':'Fractalia instrument name',value:name,onChange:e=>setName(e.target.value),maxLength:120,className:'mt-1 w-full rounded border border-teal-800 bg-neutral-900 px-2 py-1'})),
  h('div',{style:{display:'flex',gap:6,flexWrap:'wrap',marginTop:6}},
   h('button',{...button,disabled:busy,'data-fractalia-new':true,onClick:()=>run(async()=>{await __Fractalia.saveInstrument({grid,durationSec:duration,name,resolution:captureDetail});setStatus('New instrument saved from this drawing. Replace the melody or load another instrument to compare.')})},'Save Drawing as New Instrument'),
   h('button',{...button,disabled:busy||!recipe.material||session.saved&&!modified,'data-fractalia-save-active':true,onClick:()=>run(async()=>{await __Fractalia.saveActiveInstrument({name});setStatus('Active instrument saved. Its sound-colour template is retained.')})},session.saved?'Save Instrument Changes':'Save Active Instrument')),
  h('div',{style:{display:'flex',gap:6,flexWrap:'wrap',marginTop:6}},
   h('button',{...button,disabled:busy,onClick:()=>run(async()=>{await __Fractalia.pinDrawing({grid,durationSec:duration,name,resolution:captureDetail});setStatus('Drawing captured as an unsaved instrument. Changing the melody retains this sound colour.')})},'Capture Drawing'),
   h('button',{...button,disabled:busy||!recipe.material,onClick:()=>run(async()=>{await __Fractalia.followDrawing();setStatus('Sound colour now follows the current drawing.')})},'Follow Current Drawing')),
  h('label',{style:{display:'flex',gap:6,alignItems:'center',fontSize:11,marginTop:8}},'Examples',h('select',{'aria-label':'Fractalia example instruments',disabled:busy,value:'',onChange:e=>{const kind=e.target.value;if(kind)void run(async()=>{await __Fractalia.compareExample(kind);setStatus('Example source changed; F3/F4 processing and Carrier retained. Press Play.')})},className:'min-w-0 flex-1 rounded border border-teal-800 bg-neutral-900 p-1 text-xs'},h('option',{value:''},'Try an example instrument…'),...[["glass","Glass Branches"],["reed","Reed Weave"],["hollow","Hollow Bloom"]].map(([id,label])=>h('option',{key:id,value:id},label)))),
  h('div',{'data-fractalia-library':true,style:{display:'flex',gap:6,flexWrap:'wrap',marginTop:8}},
   h('select',{'aria-label':'Saved Fractalia instruments',disabled:busy,value:session.activeId,onChange:e=>{if(e.target.value)void run(async()=>{await __Fractalia.compareInstrument(e.target.value);setStatus('Instrument material changed; F3/F4 settings and Carrier retained. Press Play.')})},className:'min-w-0 flex-1 rounded border border-teal-800 bg-neutral-900 p-1 text-xs'},h('option',{value:''},entries.length?'Choose saved instrument…':'No saved instruments yet'),...entries.map(e=>h('option',{key:e.id,value:e.id},e.name+' · F'+e.version))),
   h('button',{...button,disabled:busy||!session.activeId,onClick:()=>run(async()=>{await __Fractalia.loadInstrument(session.activeId);setStatus('Original saved preset loaded, including its own processing. Press Play.')})},'Original preset'),
   h('button',{...button,disabled:busy||!session.activeId,onClick:()=>run(async()=>{await __Fractalia.removeInstrument(session.activeId);setStatus('Library entry removed. The active sound colour is retained until you change it.')})},'Remove')),
  h('div',{'data-fractalia-ab':true,style:{marginTop:7,padding:'6px 8px',border:'1px solid #285a51',borderRadius:5,fontSize:11}},
   h('div',{style:{color:'#a7b8b3',marginBottom:5}},'Compare on the same Carrier · instrument selection keeps F3/F4 controls'),
   h('div',{style:{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}},
    ...['A','B'].flatMap(letter=>[
     h('button',{...button,key:letter+'-store',disabled:busy,'data-fractalia-store-slot':letter,onClick:()=>run(async()=>{__Fractalia.storeSlot(letter);setStatus('Variant '+letter+' captured with all current instrument settings.')})},'Remember '+letter),
     h('button',{...button,key:letter+'-recall',disabled:busy||!slots[letter],'data-fractalia-recall-slot':letter,onClick:()=>run(async()=>{await __Fractalia.recallSlot(letter);if(pe.getState().carrierIntegralSelection?.machineId==='fractalia-self-carrier'){await __f333PlayCurrent(pe.getState());setStatus('Playing variant '+letter+' on the current Carrier.')}else setStatus('Variant '+letter+' restored. Select Fractalia and press Play.')})},slots[letter]?'Play '+letter+' · '+slots[letter].name:'Play '+letter+' (empty)')
    ])),
   h('div',{style:{marginTop:4,fontSize:10,color:'#92b6ae'}},'A/B saves the complete working recipe, not the WAV; sound buffers are reused while cached. Different donor PCM needs the corresponding frozen experiment.')),
  h('div',{style:{display:'flex',gap:6,flexWrap:'wrap',marginTop:6}},
   h('button',{...button,disabled:busy||!recipe.material,onClick:()=>run(async()=>{const exported=__Fractalia.preset({...recipe,name});rP(new Blob([JSON.stringify(exported)],{type:'application/json'}),'Fractalia_'+(name.replace(/[^a-z0-9_-]+/gi,'_')||'Instrument')+'.json');setStatus('Complete instrument exported.')})},'Export Instrument'),
   h('button',{...button,disabled:busy,onClick:()=>file.current?.click()},'Import Instrument'),
   h('input',{ref:file,type:'file',accept:'.json,application/json',style:{display:'none'},'aria-label':'Import Fractalia instrument',onChange:e=>{const f=e.target.files?.[0];e.target.value='';if(f)void run(async()=>{if(f.size>8*1024*1024)throw Error('Instrument file exceeds 8 MiB');await __Fractalia.importInstrument(JSON.parse(await f.text()));setStatus('Instrument imported and active. Save Active Instrument adds it to the library. Current melody retained.')})}})),
  h('p',{role:'status','aria-live':'polite',style:{fontSize:11,lineHeight:1.5,minHeight:34,color:error||__Fractalia.lastError()?'#fca5a5':'#9dcbbf',margin:'8px 0 0'}},error||__Fractalia.lastError()||session.warning||status||(busy||preparing?'Preparing instrument…':atlas?(recipe.material?'Instrument ready. Play the current melody with this sound colour.':'Current drawing supplies sound colour and melody. Capture Drawing fixes the sound colour.'):'Draw or import a sound-colour template.')));
}
/* Small PLAY is the top-of-drawing face of the EXISTING green carrier
   renderer, never the independent raw-material preview. Transport ownership,
   donor/listening-mode resolution, progress and cancel remain in one bridge. */
function __ForgeHeaderPlay(){
 const state=P.useSyncExternalStore(__ForgeTransportAccess.subscribe,__ForgeTransportAccess.snapshot,__ForgeTransportAccess.snapshot);
 const preparing=state.phase==='preparing',playing=state.phase==='playing';
 return u.jsx('button',{type:'button','data-forge-draw-play':true,
  className:'xen-forge-draw-play',disabled:!state.available,'aria-busy':preparing,
  'aria-pressed':playing,
  'aria-label':preparing?'Cancel carrier rendering':playing?'Pause painted carrier':'Play painted carrier in the selected listening mode',
  title:preparing?'Cancel carrier rendering':playing?'Pause painted carrier':'Play painted carrier · active listening mode',
  onClick:()=>void __ForgeTransportAccess.activate(),
  children:u.jsx('span',{className:'xen-forge-draw-play-word',children:'PLAY'})});
}
function __ForgeMiniPlay(){
 const state=P.useSyncExternalStore(__ForgeTransportAccess.subscribe,__ForgeTransportAccess.snapshot,__ForgeTransportAccess.snapshot);
 const loading=state.phase==='preparing',playing=state.phase==='playing';
 const fill=Math.min(99,Math.round(Math.max(0,Number(state.progress)||0)));
 return P.createElement('button',{type:'button','data-forge-synth-snap-play':true,'data-forge-synth-lab-play':true,
  'aria-label':loading?'Cancel figure rendering':playing?'Pause figure preview':'Play current figure','aria-busy':loading,
  title:loading?'Preparing current figure · '+fill+' %':playing?'Pause figure preview':state.ready?'Preview ready · starts immediately':'Preview is not yet audibly ready · Play prepares the selected mode',
  disabled:!state.available,onClick:()=>void __ForgeTransportAccess.activate(),
  className:'relative overflow-hidden inline-flex h-8 min-w-20 items-center justify-center gap-1 rounded border px-2 text-xs font-semibold text-white disabled:opacity-40 '+(loading?'border-neutral-500 bg-neutral-700':playing?'border-red-400 bg-red-600':state.ready?'border-green-400/40 bg-green-600 hover:bg-green-500':'border-neutral-500 bg-neutral-700')},
  loading&&P.createElement('span',{'aria-hidden':true,className:'pointer-events-none absolute inset-x-0 bottom-0 bg-emerald-500/90',style:{height:fill+'%'}}),
  P.createElement('span',{className:'relative z-10'},loading?'■ '+fill+' %':playing?'⏸ Pause':'▶ Play'));
}
function __PureDieterControls(){
 const mode=pe(s=>s.synthMode),mix=pe(s=>s.waveformMix),usesMix=mode!=='ifft';
 return P.createElement('div',{className:'mt-3 space-y-3 text-xs text-neutral-300','data-pure-dieter-controls':true},
  P.createElement('label',{className:'flex items-center gap-2'},'Direct mode',P.createElement('select',{
   'aria-label':'Pure Dieter synthesis',value:mode,onChange:e=>pe.getState().setSynthMode(e.target.value),
   className:'rounded border border-neutral-700 bg-black p-1'},...DGe.map(v=>P.createElement('option',{key:v.id,value:v.id},v.label)))),
  P.createElement('div',{className:'grid grid-cols-2 gap-2',style:{opacity:usesMix?1:.45}},...['sine','sawtooth','square','triangle'].map(k=>P.createElement('label',{
   key:k,className:'flex flex-col gap-1'},k,P.createElement('input',{
    'aria-label':'Pure Dieter '+k,type:'range',min:0,max:1,step:.05,disabled:!usesMix,value:mix[k],
    onChange:e=>pe.getState().setWaveformMix({[k]:+e.target.value})})))),
  P.createElement('p',{className:'text-[10px] text-neutral-400'},
   usesMix?'Waveform mix affects Additive, Granular and Glyph. Changed settings render on Play; exact repeats may use cache.':'IFFT reconstructs the painted spectrum directly; waveform mix does not apply in this mode.'),
  P.createElement('p',{className:'text-[10px] text-neutral-400'},'Stop or a mode change cancels the current render.'));
}
/* One existing field in three locations; display 1/3 without storing a duplicate string. */
/* FMB05: native material bars owners share one keyboard, text and visibly stepped control. */
function __XenMaterialBarsInput({value,onCommit,disabled=false,className='',style=null,'aria-label':ariaLabel='Number of Bars',max=16}){
 const h=P.createElement;
 const [draft,setDraft]=P.useState(()=>value===''?'':__xenFormatAudioMaterialBars(value));
 const [invalid,setInvalid]=P.useState(false);
 P.useEffect(()=>{setDraft(value===''?'':__xenFormatAudioMaterialBars(value));setInvalid(false)},[value]);
 const commit=()=>{
  const parsed=__xenParseAudioMaterialBars(draft,max);
  if(parsed.ok){setInvalid(false);setDraft(__xenFormatAudioMaterialBars(parsed.bars));onCommit?.(parsed.bars)}
  else {setInvalid(true);setDraft(value===''?'':__xenFormatAudioMaterialBars(value))}
 };
 const step=direction=>{
  if(disabled)return;
  const parsed=__xenParseAudioMaterialBars(draft,max);
  const next=__xenStepAudioMaterialBars(parsed.ok?parsed.bars:value,direction,max);
  setInvalid(false);setDraft(__xenFormatAudioMaterialBars(next));onCommit?.(next);
 };
 const button=(direction,label,symbol,top)=>h('button',{
  type:'button',disabled,'data-xen-bars-step':direction>0?'up':'down',
  'aria-label':label+' '+ariaLabel,
  title:direction>0?'Increase Bars (above 1: +1; below 1: smaller denominator)':'Decrease Bars (below 1: 1/2, 1/3, 1/4 …)',
  onMouseDown:e=>e.preventDefault(),onPointerDown:e=>e.stopPropagation(),onClick:e=>{e.stopPropagation();step(direction)},
  style:{position:'absolute',right:0,top:top?'0':'50%',width:13,height:'50%',padding:0,
   background:'#171923',border:'1px solid #52525b',color:'#d4d4d8',fontSize:9,lineHeight:'9px',
   cursor:disabled?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1}
 },symbol);
 return h('span',{'data-xen-audio-bars-stepper':true,style:{display:'inline-block',position:'relative',
   flex:'0 0 auto',width:62,height:24,verticalAlign:'middle',minWidth:0}},
  h('input',{type:'text',inputMode:'decimal',value:draft,disabled,className,style:{...style,
     width:'100%',height:'100%',maxWidth:'none',minWidth:0,boxSizing:'border-box',padding:'0 15px 0 4px'},
   'aria-label':ariaLabel,title:invalid?'Invalid bar span (1/2, 1/3, 1/32, 1/64)':'Bars: type 1/3 or use ▲▼',
   'aria-invalid':invalid?'true':undefined,
   onChange:e=>{setInvalid(false);setDraft(e.currentTarget.value)},onBlur:commit,
   onKeyDown:e=>{e.stopPropagation();if(e.key==='Enter')e.currentTarget.blur();
    else if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();step(e.key==='ArrowUp'?1:-1)}},
   onKeyUp:e=>e.stopPropagation()}),
  button(1,'Increase','▲',true),button(-1,'Decrease','▼',false));
}
globalThis.__XenMaterialBarsInput=__XenMaterialBarsInput;
function __ForgeMaterialQuickFields({meta,onPatch,disabled=false}){
 const h=P.createElement,cls='xen-forge-quick-input rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100';
 const field=(label,input)=>h('label',{className:'xen-forge-quick-field',key:label},
   h('span',{className:'xen-forge-quick-caption',title:label},label),input);
 return h('div',{'data-forge-inline-metadata':true,className:'xen-forge-inline-metadata'},
   field('Number of Bars',h(__XenMaterialBarsInput,{value:meta.bars,disabled,onCommit:bars=>onPatch({bars}),className:cls,'aria-label':'Number of Bars'})),
   /* Existing canonical guideSegments drives both Spectral Forge guide lines and the
      audio-import Bar Meter; it is independent of the number of bars and of beatsPerBar. */
   field('Number of Segments',h('input',{type:'number',min:1,max:16,step:1,value:meta.guideSegments,'aria-label':'Number of Segments',
     title:'Visual subdivisions inside each bar · independent of bar count and tempo',
     disabled:disabled,onChange:event=>{if(disabled)return;onPatch({guideSegments:Math.max(1,Math.min(16,Math.round(Number(event.currentTarget.value)||1)))});},className:cls})),
   field('Frequency Anchor (Hz)',h('input',{type:'number',min:1,max:24000,step:'any',
     value:__forgeMaterialRootHz(meta.rootHz)??'',placeholder:'Auto','aria-label':'Material Frequency Anchor (Hz)',
     disabled:disabled,onChange:event=>{if(disabled)return;const value=event.currentTarget.value;onPatch({rootHz:value===''?null:__forgeMaterialRootHz(Number(value))})},className:cls})));
}
function __ForgeMaterialMetadata({meta,onPatch,selection}){
 const h=P.createElement,duration=selection?.fineLoopRange?.durationSec;
 const label=(text,control)=>h('label',{className:'space-y-1 text-[11px] text-neutral-400'},h('span',{className:'block uppercase tracking-[0.18em] text-neutral-500'},text),control);
 const input='w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100';
 const count=(key,value)=>h('input',{type:'number',min:1,max:16,value, 'aria-label':key==='bars'?'Number of Bars':'Melodic Loop Bar Segments',onChange:event=>onPatch({[key]:Math.max(1,Math.min(16,Math.round(Number(event.currentTarget.value)||1)))}),className:input});
 return h('section',{'data-forge-material-metadata':true,className:'rounded border border-neutral-800 bg-neutral-900/40 px-3 py-2 text-[11px] text-neutral-300'},
  h('div',{className:'mb-2 uppercase tracking-[0.22em] text-neutral-500'},'Raw Audio · Metadata'),
  h('p',{className:'mb-2 text-neutral-400'},'Sample / Loop · usable in Particles, Wave Starter, Melodic Loop and Drums. The destination does not change the source.'),
  h('div',null,h('span',{className:'block uppercase text-neutral-500'},'Original Tempo'),h('span',null,meta.bars>0&&duration>0?`${(meta.bars*(meta.beatsPerBar||4)*60/duration).toFixed(1)} BPM · calculated from bars / selection`:'Not calculated yet')),
  h('p',{className:'mt-2 text-neutral-500'},'Bars describe loop length. The frequency anchor is used for pitch following; empty keeps the existing automatic/default behavior.'),
  h('details',{className:'mt-2'},h('summary',{className:'cursor-pointer text-neutral-400'},'Melodic Loop · visual guides'),label('Bar Segments (Guide Markers)',count('guideSegments',meta.guideSegments)),h('p',{className:'mt-1 text-neutral-500'},'Visual editing guides; no additional Root Follow subdivision.')));
}
function __emiliaGestureMoved(a,b){return Math.hypot(b.x-a.x,b.y-a.y)>.006;}
function __emiliaVisualGraph(model){
 const nodes=model.nodes.filter(n=>!n.muted),degree=Array(nodes.length).fill(0),edges=[];
 const blocked=new Set((model.blockedEdges||[]).map(pair=>pair.slice().sort().join('\0')));
 for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
  const a=nodes[i],b=nodes[j];if(blocked.has([a.id,b.id].sort().join('\0')))continue;
  const span=a.radius+b.radius;
  const overlap=span>0?Math.max(0,Math.min(1,1-Math.hypot(a.x-b.x,a.y-b.y)/span)):0;
  const w=overlap*overlap*(3-2*overlap)*Math.sqrt(a.strength*b.strength);
  if(w>0){edges.push({a:i,b:j,weight:w});degree[i]+=w;degree[j]+=w;}
 }
 for(const edge of edges)edge.weight/=Math.max(1,degree[edge.a],degree[edge.b]);
 return {nodes,edges};
}
function EmiliaForgeLab(){
  const h=P.createElement,[recipe,setRecipe]=P.useState(()=>__Emilia.snapshot());
  const [focus,setFocus]=P.useState(()=>__Emilia.snapshot().model.nodes[0].id);
  const [preview,setPreview]=P.useState('off'),[error,setError]=P.useState(''),[revision,setRevision]=P.useState(0);
  const [dragPose,setDragPose]=P.useState(null);
  const animationFrame=P.useRef(null),rippleOverlay=P.useRef(null),rippleTimers=P.useRef(new Set());
  const rippleFrames=P.useRef(new Set()),pendingRelease=P.useRef([]);
  const area=P.useRef(null),drag=P.useRef(null),history=P.useRef([]),future=P.useRef([]),alive=P.useRef(false);
  P.useEffect(()=>{alive.current=true;const unsub=__Emilia.subscribe(()=>setRecipe(__Emilia.snapshot()));return()=>{
    alive.current=false;unsub();__Emilia.stopPreview();
    if(animationFrame.current!==null)cancelAnimationFrame(animationFrame.current);
    for(const id of rippleFrames.current)cancelAnimationFrame(id);rippleFrames.current.clear();
    for(const timer of rippleTimers.current)clearTimeout(timer);rippleTimers.current.clear();
    pendingRelease.current=[];
    rippleOverlay.current?.replaceChildren();
  }},[]);
  const instrument=recipe.model,selected=instrument.nodes.find(n=>n.id===focus)||instrument.nodes[0];
  const graph=P.useMemo(()=>__XenNodalModel.compile(instrument),[instrument]);
  const dragging=!!dragPose&&__emiliaGestureMoved(dragPose.from,dragPose.to);
  const liveInstrument=P.useMemo(()=>dragging?{...instrument,nodes:instrument.nodes.map(n=>n.id===dragPose.id?{...n,...dragPose.to}:n)}:instrument,[instrument,dragPose,dragging]);
  const liveGraph=P.useMemo(()=>dragging?__emiliaVisualGraph(liveInstrument):graph,[dragging,liveInstrument,graph]);
  const roles=__XenNodalModel.roles,organs=__NodalOrgans;
  function commit(next,record=true){try{
    if(__Emilia.semanticKey(next)===__Emilia.semanticKey(__Emilia.snapshot()))return;
    if(record){history.current=[...history.current.slice(-31),__Emilia.snapshot()];future.current=[];}
    __Emilia.set(next);setRecipe(__Emilia.snapshot());setError('');setRevision(v=>v+1);
  }catch(err){setError(err.message)}}
  const edit=(id,patch)=>commit(__Emilia.editNode(recipe,id,patch));
  // Inert HTML layer: no setState, React reconciliation or SVG radius animation on any wave.
  // Transform/opacity on a normal HTML element can be promoted to a compositor layer.
  function ring(x,y){
    const host=rippleOverlay.current;if(!host||!alive.current)return;
    while(host.childElementCount>=6)host.firstElementChild.remove();
    const wave=document.createElement('span');wave.className='emilia-b-ripple-wave';
    wave.setAttribute('data-emilia-ripple','true');
    wave.style.left=(Math.max(0,Math.min(1,x))*100)+'%';
    wave.style.top=(Math.max(0,Math.min(1,y))*100)+'%';
    host.appendChild(wave);
    const timer=setTimeout(()=>{rippleTimers.current.delete(timer);wave.remove()},1450);
    rippleTimers.current.add(timer);
    wave.addEventListener('animationend',()=>{clearTimeout(timer);rippleTimers.current.delete(timer);wave.remove()},{once:true});
  }
  function afterTwoFrames(fn){
    const one=requestAnimationFrame(()=>{rippleFrames.current.delete(one);
      const two=requestAnimationFrame(()=>{rippleFrames.current.delete(two);if(alive.current)fn()});
      rippleFrames.current.add(two);
    });rippleFrames.current.add(one);
  }
  function completeReleaseWave(task){
    if(!pendingRelease.current.includes(task))return;
    pendingRelease.current=pendingRelease.current.filter(item=>item!==task);
    if(task.timer){clearTimeout(task.timer);rippleTimers.current.delete(task.timer)}
    // Wait for React's commit and the first post-audio paints before creating motion.
    afterTwoFrames(()=>ring(task.x,task.y));
  }
  function afterAudioRelease(x,y){
    // refreshPreview() calls its onState('playing') only once PCM synthesis/copy
    // has completed. Fallback is only for a failed/stalled render.
    const task={x,y,timer:null};pendingRelease.current.push(task);
    const timer=setTimeout(()=>{rippleTimers.current.delete(timer);completeReleaseWave(task)},2800);
    task.timer=timer;rippleTimers.current.add(timer);
  }
  function notifyPreviewSettled(state){
    if(state==='playing'||state==='error'||state==='off'){
      for(const task of [...pendingRelease.current])completeReleaseWave(task);
    }
  }
  function begin(e,node){if(e.button!==0)return;e.preventDefault();
    const r=area.current?.getBoundingClientRect();if(!r?.width)return;
    const el=e.currentTarget;el.setPointerCapture(e.pointerId);
    drag.current={id:node.id,from:recipe,origin:{x:node.x,y:node.y},rect:r,clientX:e.clientX,clientY:e.clientY,element:el,pointer:e.pointerId,next:{x:node.x,y:node.y}};
    setDragPose({id:node.id,from:{x:node.x,y:node.y},to:{x:node.x,y:node.y}});
    setFocus(node.id);ring(node.x,node.y);
  }
  function move(e){const d=drag.current;if(!d||d.pointer!==e.pointerId)return;
    const x=Math.min(.965,Math.max(.035,d.origin.x+(e.clientX-d.clientX)/d.rect.width));
    const y=Math.min(.965,Math.max(.035,d.origin.y+(e.clientY-d.clientY)/d.rect.height));
    d.next={x,y};
    if(animationFrame.current!==null)return;
    animationFrame.current=requestAnimationFrame(()=>{animationFrame.current=null;const active=drag.current;if(active&&active.pointer===e.pointerId)setDragPose({id:active.id,from:active.origin,to:active.next})});
  }
  function finish(e,cancel=false){const d=drag.current;if(!d||d.pointer!==e.pointerId)return;
    drag.current=null;try{d.element.releasePointerCapture(d.pointer)}catch{}
    if(animationFrame.current!==null){cancelAnimationFrame(animationFrame.current);animationFrame.current=null;}
    setDragPose(null);
    if(cancel)return;
    if(__emiliaGestureMoved(d.origin,d.next)){
      // The recipe commit can synchronously invalidate caches and asynchronously
      // launch expensive PCM synthesis. A release ring during that work froze.
      const waitForPreview=preview==='playing'||preview==='loading';
      if(waitForPreview)afterAudioRelease(d.next.x,d.next.y);
      commit(__Emilia.moveNode(d.from,d.id,d.next.x,d.next.y));
      if(!waitForPreview)afterTwoFrames(()=>ring(d.next.x,d.next.y));
    }
  }
  function add(role){if(instrument.nodes.length>=__Emilia.MAX_NODES||!roles.includes(role))return;
    const next=__Emilia.createNode(recipe,role);
    const item=next.model.nodes.find(n=>!instrument.nodes.some(o=>o.id===n.id));
    commit(next);if(item)setFocus(item.id);
  }
  function remove(id){if(instrument.nodes.length<=1)return;
    const next=__Emilia.removeNode(recipe,id);commit(next);
    if(focus===id)setFocus(next.model.nodes[0].id);
  }
  function undo(){const prev=history.current.pop();if(prev){future.current.push(__Emilia.snapshot());commit(prev,false)}}
  function redo(){const next=future.current.pop();if(next){history.current.push(__Emilia.snapshot());commit(next,false)}}
  async function toggle(){if(preview==='playing'||preview==='loading'){__Emilia.stopPreview();setPreview('off');return;}
    setError('');await __Emilia.startPreview((state,cause)=>{if(!alive.current)return;setPreview(state==='error'?'off':state);notifyPreviewSettled(state);if(cause)setError(cause.message)});
  }
  const atMax=instrument.nodes.length>=__Emilia.MAX_NODES;
  return h('section',{className:'emilia-b','data-emilia-synth-lab':'true','data-xensonar-emilia-b':'true', 'aria-label':'Emilia constellation timbre'},
    h('header',{className:'emilia-b-heading'},h('div',null,h('strong',null,'EMILIA · Nodal Timbre'),h('small',null,'HX ↔ Emilia · Carrier plays the figure')),
      h('span',null,instrument.nodes.length,' / ',__Emilia.MAX_NODES,' nodes')),
    h('p',{className:'emilia-b-caption'},'Node positions shape HX harmonics, resonance and feedback. Drag to rearrange; release to hear the new constellation.'),
    h('div',{className:'emilia-b-field-frame'},h('svg',{ref:area,viewBox:'0 0 1000 1000',className:'emilia-b-field','data-emilia-nodal-field':'true',role:'group',
        'aria-label':'Nodal constellation field',onPointerMove:move,onPointerUp:finish,onPointerCancel:e=>finish(e,true)},
      h('defs',null,
        h('radialGradient',{id:'emilia-b-shade'},h('stop',{offset:0,stopColor:'#164753'}),h('stop',{offset:'.72',stopColor:'#101d35'}),h('stop',{offset:1,stopColor:'#070e20'})),
        h('radialGradient',{id:'emilia-b-halo'},h('stop',{offset:0,stopColor:'#52ddcc',stopOpacity:.35}),h('stop',{offset:1,stopColor:'#52ddcc',stopOpacity:0})),
        h('radialGradient',{id:'emilia-b-node-shade'},h('stop',{offset:0,stopColor:'#224d58'}),h('stop',{offset:1,stopColor:'#071b2b'}))),
      h('rect',{width:1000,height:1000,rx:22,fill:'url(#emilia-b-shade)'}),
      ...Array.from({length:9},(_,i)=>h('g',{key:'grid-'+i,stroke:'#8adecf',strokeOpacity:.10},
        h('line',{x1:(i+1)*100,y1:0,x2:(i+1)*100,y2:1000}),h('line',{x1:0,y1:(i+1)*100,x2:1000,y2:(i+1)*1000}))),
      ...graph.edges.map((e,i)=>{const a=instrument.nodes.find(n=>n.id===graph.nodes[e.a].id),b=instrument.nodes.find(n=>n.id===graph.nodes[e.b].id);return h('line',{key:'link'+i,x1:a.x*1000,y1:a.y*1000,x2:b.x*1000,y2:b.y*1000,
        stroke:'#72f7cf',strokeWidth:2+e.weight*9,strokeOpacity:(dragging?.12:.22)+e.weight*(dragging?.18:.65),pointerEvents:'none'});}),
      ...dragging?liveGraph.edges.map((e,i)=>{const a=liveInstrument.nodes.find(n=>n.id===liveGraph.nodes[e.a].id),b=liveInstrument.nodes.find(n=>n.id===liveGraph.nodes[e.b].id);return h('line',{key:'live-link'+i,'data-emilia-live-link':'true',x1:a.x*1000,y1:a.y*1000,x2:b.x*1000,y2:b.y*1000,stroke:'#b1ffef',strokeWidth:2+e.weight*9,strokeOpacity:.32+e.weight*.65,pointerEvents:'none'});}):[],
      ...dragging?[h('g',{key:'origin-'+dragPose.id,className:'emilia-b-ghost',transform:`translate(${dragPose.from.x*1000} ${dragPose.from.y*1000})`,pointerEvents:'none'},h('circle',{r:43,fill:'#163c49',stroke:'#82dace',strokeDasharray:'9 7',strokeWidth:4}),h('circle',{r:9,fill:'#b5fff2'}))]:[],
      ...liveInstrument.nodes.map(node=>h('g',{key:node.id,transform:`translate(${node.x*1000} ${node.y*1000})`,
        className:'emilia-b-node drag-ghost'+(selected.id===node.id?' is-selected':''),tabIndex:0,role:'button',
        'aria-label':'Move '+organs[node.role].label,onPointerDown:e=>begin(e,node),onFocus:()=>setFocus(node.id),onKeyDown:e=>{
          if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const step=e.shiftKey?.04:.01;edit(node.id,{
            x:Math.min(.965,Math.max(.035,node.x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0))),
            y:Math.min(.965,Math.max(.035,node.y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0)))});}}},
        h('circle',{r:74,fill:'url(#emilia-b-halo)',pointerEvents:'none'}),
        h('circle',{r:43,fill:'url(#emilia-b-node-shade)',stroke:organs[node.role].color,strokeWidth:selected.id===node.id?6:3,opacity:node.muted?.4:1}),
        h('text',{textAnchor:'middle',y:11,fill:organs[node.role].color,fontSize:36,pointerEvents:'none'},organs[node.role].glyph),
        h('text',{textAnchor:'middle',y:93,fill:'#d5efea',fontSize:27,pointerEvents:'none'},organs[node.role].label)))),
      h('div',{className:'emilia-b-ripple-overlay','data-emilia-ripple-layer':'true',ref:rippleOverlay,'aria-hidden':'true'})),
    h('div',{className:'emilia-b-actions'},
      h('label',null,'Add node',h('select',{'aria-label':'Add Emilia node',value:'',disabled:atMax,
        onChange:e=>{add(e.target.value);e.target.value='';}},
        h('option',{value:''},atMax?'7 / 7 reached':'+ Node'),...roles.map(role=>h('option',{key:role,value:role},organs[role].label)))),
      h('button',{type:'button',disabled:!history.current.length,onClick:undo},'↶ Undo'),
      h('button',{type:'button',disabled:!future.current.length,onClick:redo},'↷ Redo'),
      h('button',{type:'button',className:preview==='playing'?'is-playing':'','aria-pressed':preview==='playing','data-emilia-held-preview':'true','aria-label':preview==='playing'||preview==='loading'?'Stop preview':'Preview',
        onClick:()=>void toggle()},preview==='playing'?'■ Stop preview':preview==='loading'?'Preparing…':'▶ Preview')),
    h('div',{className:'emilia-b-node-list'},...instrument.nodes.map((node,index)=>h('div',{key:node.id,
      className:'emilia-b-list-entry'+(selected.id===node.id?' selected':'')},
      h('button',{type:'button',className:'emilia-b-pick',onClick:()=>setFocus(node.id)},String(index+1).padStart(2,'0')+' · '+organs[node.role].label),
      h('span',null,Number(node.ratio).toFixed(2)+'×'),
      h('button',{type:'button',title:'Remove node','aria-label':'Remove node '+organs[node.role].label,
        disabled:instrument.nodes.length<=1,onClick:()=>remove(node.id)},'×')))),
    h('div',{className:'emilia-b-inspector'},
      h('span',null,'Selected · '+organs[selected.role].label),
      h('label',null,'Role',h('select',{value:selected.role,'aria-label':'Emilia selected organ',onChange:e=>edit(selected.id,{role:e.target.value})},...roles.map(role=>h('option',{key:role,value:role},organs[role].label)))),
      h('label',null,'Ratio',h('input',{type:'number',min:.125,max:8,step:.05,value:selected.ratio,'aria-label':'Emilia ratio',onChange:e=>{const v=Number(e.target.value);if(v>=.125&&v<=8)edit(selected.id,{ratio:v})}})),
      h('label',null,'Reach',h('input',{type:'range',min:.05,max:.7,step:.01,value:selected.radius,'aria-label':'Emilia coupling reach',onChange:e=>edit(selected.id,{radius:Number(e.target.value)})})),
      h('label',null,'Strength',h('input',{type:'range',min:0,max:2,step:.05,value:selected.strength,'aria-label':'Emilia influence',onChange:e=>edit(selected.id,{strength:Number(e.target.value)})})),
      h('label',null,'Mute',h('input',{type:'checkbox',checked:selected.muted,onChange:e=>edit(selected.id,{muted:e.target.checked})}))),
    h('p',{className:'emilia-b-status',role:'status'},error||(preview==='playing'?'Preview playing · release drag to hear the changed constellation':
      preview==='loading'?'Calculating timbre…':'Ready · Preview auditions the timbre; Carrier Play uses the drawn figure')));
}
function __F347OnsetText(body){
 const e=body?.onsetEvidence;
 if(!e)return "No onset estimate available.";
 if(e.kind==='transient')return "Possible attack · "+(e.startSec*1000).toFixed(0)+'–'+(e.endSec*1000).toFixed(0)+' ms · '+(e.confidence*100).toFixed(0)+' % Evidenz';
 if(e.kind==='level-rise')return "Gradual Onset · "+(e.endSec*1000).toFixed(0)+" ms · no sharp attack";
 return (e.kind==='selection-boundary'?"Sound Already Present at Selection Boundary":"Onset Undetermined")+" · no attack claimed";
}
function __f35622LibraryPagination(items,filter,page){
const matches=items.filter(x=>(x.name+' '+x.sourceLabel+' '+(x.tags??[]).join(' ')).toLocaleLowerCase().includes(filter.toLocaleLowerCase().trim()));
 const pageSize=8,pageCount=Math.max(1,Math.ceil(matches.length/pageSize)),safePage=Math.min(page,pageCount-1),visible=matches.slice(safePage*pageSize,(safePage+1)*pageSize);
 return {matches,pageCount,safePage,visible};
}
function __f35622LibraryView({runtime,route,items,loaded,filter,setFilter,name,setName,message,saving,busy,active,apply,save,favorite,matches,pageCount,safePage,visible,setPage}){
 return u.jsxs('section',{className:'f347-library f348-library','data-f347-donor-library':'true','aria-label':"Donor Library",children:[
  u.jsxs('div',{className:'f347-library-heading',children:[u.jsxs('div',{children:[u.jsx('h3',{children:"01 · Donor Library"}),u.jsx('p',{children:"Load saved audio selections. The carrier figure is preserved when switching donors."})]}),u.jsx('span',{className:'f341-muted',children:loaded?items.length+' saved selections':"Loading library …"})]}),
  u.jsxs('div',{className:'f347-library-tools',children:[u.jsx('input',{'aria-label':"Search Workshop Library",placeholder:"Search name, file or tag",value:filter,onChange:e=>{setFilter(e.currentTarget.value);setPage(0)}}),u.jsx('input',{'aria-label':"Name Audio Selection",placeholder:"Name Audio Selection",value:name,maxLength:100,onChange:e=>setName(e.currentTarget.value)}),u.jsx('button',{type:'button',disabled:busy||!runtime.model||!name.trim(),onClick:()=>void save(),children:saving?"Saving …":"Save Audio Selection"})]}),
  loaded&&!matches.length?u.jsx('p',{className:'f341-muted',children:items.length?"No matching entries.":"No saved audio selections for this browser origin yet. You can save a loaded selection here."}):null,
  u.jsx('div',{className:'f347-library-items',children:visible.map(item=>u.jsxs('div',{className:'f347-library-item f348-library-item','aria-current':active===item.id,children:[u.jsxs('div',{children:[u.jsx('strong',{title:item.name,children:item.name}),u.jsx('small',{title:item.sourceLabel,children:item.sourceLabel+' · '+Number(item.selectionStartSec).toFixed(2)+'–'+Number(item.selectionStartSec+item.selectionDurationSec).toFixed(2)+' s'+(item.tags?.length?' · '+item.tags.join(', '):'')})]}),u.jsx('button',{type:'button','aria-label':(item.favorite?'Remove favorite: ':'Mark as favorite: ')+item.name,disabled:busy,onClick:()=>void favorite(item),children:item.favorite?'★':'☆'}),u.jsx('button',{type:'button',disabled:busy,'aria-label':(active===item.id?'Reload: ':'Load donor: ')+item.name,onClick:()=>void apply(item.id),children:active===item.id?'Reload':'Load donor'})]},item.id))}),
  pageCount>1?u.jsxs('nav',{className:'f348-library-pages','aria-label':'Bibliotheksseiten',children:[u.jsx('span',{children:(safePage+1)+' / '+pageCount+' · '+matches.length+' Treffer'}),u.jsx('button',{type:'button','aria-label':'Vorherige Bibliotheksseite',disabled:safePage===0,onClick:()=>setPage(n=>Math.max(0,n-1)),children:"‹ Back"}),u.jsx('button',{type:'button','aria-label':"Next library page",disabled:safePage>=pageCount-1,onClick:()=>setPage(n=>Math.min(pageCount-1,n+1)),children:'Weiter ›'})]}):null,
  busy&&!saving?u.jsxs('p',{role:'status',children:[route.message||"Analyzing donor …",' ',u.jsx('button',{type:'button',onClick:()=>__ForgeDonorRoutingF317.cancel(),children:"Cancel"})]}):null,
  message?u.jsx('p',{role:'status',children:message}):null,
  u.jsxs('details',{className:'f348-library-help',children:[u.jsx('summary',{children:"What data are stored here?"}),u.jsx('p',{className:'f341-muted',children:"Library = audio + selection. Recipe preset = transfer controls. Donor variant = controls + markings for this particular selection."})]})
 ]});
}
function __f35622WorkbenchDock({showLibrary,showRack,setShowLibrary,setShowRack,action}){
 return (showLibrary||showRack)?u.jsxs('aside',{className:'f349-library-dock f351-side-dock','aria-label':"Donor Library & Combination Rack",children:[
  showLibrary?u.jsxs('section',{id:'f351-library-panel',className:'f351-side-card f351-library-card',children:[u.jsxs('div',{className:'f351-card-bar',children:[u.jsx('span',{children:"01 / SOUND MATERIAL"}),action("Collapse",()=>setShowLibrary(false),false,{'aria-label':"Collapse Donor Library"})]}),u.jsx(__F347Library,{})]}):null,
  showRack?u.jsxs('section',{id:'f351-combination-panel',className:'f351-side-card f351-rack-card',children:[u.jsxs('div',{className:'f351-card-bar',children:[u.jsx('span',{children:'02 / KLANGKOMBINATION'}),action("Collapse",()=>setShowRack(false),false,{'aria-label':"Collapse Combination Rack"})]}),u.jsx(__F351CombinationRack,{})]}):null
 ]}):null;
}
function __F347Library(){
 const runtime=cU(),route=P.useSyncExternalStore(__ForgeDonorRoutingF317.subscribe,__ForgeDonorRoutingF317.getSnapshot,__ForgeDonorRoutingF317.getSnapshot);
 const [items,setItems]=P.useState([]),[loaded,setLoaded]=P.useState(false),[filter,setFilter]=P.useState(''),[name,setName]=P.useState(''),[message,setMessage]=P.useState(''),[saving,setSaving]=P.useState(false),[page,setPage]=P.useState(0),alive=P.useRef(false);
 P.useEffect(()=>{alive.current=true;let serial=0;const refresh=async()=>{const n=++serial;try{const list=await __DonorLibraryF36.donorLibrary.list();if(alive.current&&n===serial){setItems(list);setLoaded(true);}}catch(e){if(alive.current){setLoaded(true);setMessage("Could not read library: "+(e.message??e));}}};void refresh();window.addEventListener('xensonar:donor-library-changed',refresh);return()=>{alive.current=false;serial++;window.removeEventListener('xensonar:donor-library-changed',refresh);};},[]);
 P.useEffect(()=>{setName((runtime.source?.fileName??'').replace(/\.[^.]+$/,''));},[runtime.source]);
 const busy=saving||route.phase!=='idle'||runtime.phase==='analyzing',active=__ForgeDonorRoutingF317.activeId();
 const apply=async id=>{setMessage('');__ForgeDonorRoutingF317.setDraft(id);try{await new Promise((resolve,reject)=>{const req={id,resolve,reject,handled:false};window.dispatchEvent(new CustomEvent('xensonar:forge:apply-library-donor',{detail:req}));if(!req.handled)reject(Error("Please open the Forge Sound Material panel; the library interface is not ready yet."));});if(alive.current)setMessage("Donor loaded and activated for the figure. The sound material has been reanalyzed.");}catch(e){if(alive.current&&e.name!=='AbortError')setMessage("Could not load donor: "+(e.message??e));}};
 const save=async()=>{if(busy||!runtime.source)return;setSaving(true);setMessage('');try{const s=runtime.source;await __DonorLibraryF36.donorLibrary.save(name,'',{source:{label:s.fileName,durationSec:s.originalDuration,sampleRate:s.sampleRate,channelCount:s.channelCount,sourceAsset:s},selection:{fineLoopRange:{startSec:s.importStartSec,durationSec:s.importDurationSec},detailViewport:{startSec:s.importStartSec,durationSec:s.importDurationSec}},readMode:s.projectionReadMode??'hybrid',sourceAdapterId:'local-file'});window.dispatchEvent(new Event('xensonar:donor-library-changed'));if(alive.current)setMessage("Audio selection saved to the Donor Library. Transfer recipes are saved separately below.");}catch(e){if(alive.current)setMessage("Save failed: "+(e.message??e));}finally{if(alive.current)setSaving(false);}};
 const favorite=async item=>{try{await __DonorLibraryF36.donorLibrary.favorite(item.id,!item.favorite);window.dispatchEvent(new Event('xensonar:donor-library-changed'));}catch(e){if(alive.current)setMessage(e.message??String(e));}};
 const {matches,pageCount,safePage,visible}=__f35622LibraryPagination(items,filter,page);
 return __f35622LibraryView({runtime,route,items,loaded,filter,setFilter,name,setName,message,saving,busy,active,apply,save,favorite,matches,pageCount,safePage,visible,setPage});
}
function __F347Memory(){
 const [state,setState]=P.useState(()=>__ForgeF33.experimentStatePersistenceStatus());
 P.useEffect(()=>{const refresh=()=>setState(__ForgeF33.experimentStatePersistenceStatus());refresh();const timer=setInterval(refresh,800);return()=>clearInterval(timer);},[]);
 const time=state.lastSavedAt||state.lastRestoredAt;
 const text=state.restoring?"Browser storage: loading saved state …":state.lastError?"Browser storage: "+state.lastError+(state.protectingSavedState?" · existing state remains protected.":''):state.lastSavedAt?"Browser storage: state saved · "+new Date(time).toLocaleTimeString():state.lastRestoredAt?"Browser storage: state restored":state.restoreComplete?"Browser storage: autosave enabled":"Checking browser storage …";
 return u.jsxs('div',{className:'f347-memory',role:'status','data-f347-memory':'true',children:[u.jsx('span',{children:text}),u.jsx('button',{type:'button',disabled:state.restoring||!state.restoreComplete||state.protectingSavedState,onClick:async()=>{await __f333Persistence?.saveNow();setState(__ForgeF33.experimentStatePersistenceStatus());},children:"Save Current State"}),state.protectingSavedState?u.jsx('button',{type:'button',disabled:state.restoring,onClick:async()=>{await __f333Persistence?.restore();setState(__ForgeF33.experimentStatePersistenceStatus());},children:"Reload Saved State"}):null]});
}
function xse(e){return bG(e.samples,e.sampleRate,e)}
function Gse(e){if(e)return JSON.stringify({durationSec:e.durationSec,rmsMean:e.rmsMean,rmsVariance:e.rmsVariance,transientScore:e.transientScore,brightnessScore:e.brightnessScore,sustainScore:e.sustainScore,fitRoute:e.fitRoute,bridgeProfile:e.bridgeProfile,materialProfile:e.materialProfile,recommendedSettings:e.recommendedSettings,summary:e.summary})}
function Uge(e){if(e)return{fileName:e.fileName,sampleRate:e.sampleRate,originalDuration:Ay(e.originalDuration),importStartSec:Ay(e.importStartSec),importDurationSec:Ay(e.importDurationSec),samples:e.monoSamples?.length??null}}
function Kge(e){return e==="embodiment"?Gge:jge}
function g3(e,t){return e?Ya({id:Kge(t),kind:"source-asset",subsystem:"spectral-forge",label:Hge,owner:"spectralForge/lifecycle.registerSpectralForgeSourceAsset",meta:{context:t,...Uge(e)}}):null}
function NFe(e){const t=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"],n=12*Math.log2(e/440)+69,r=Math.round(n),a=Math.floor(r/12)-1,o=(r%12+12)%12;return`${t[o]}${a}`}
function rBe(e,t){return{key:`carrier:${e}:${t}`,updatedAt:Date.now()}}
function aBe(e){if(!e)return null;const t=e.analysisCache?`${e.analysisCache.width}:${e.analysisCache.height}:${e.sampleRate}:${e.importDurationSec}`:"raw";return{key:`donor:${e.fileName}:${t}`,updatedAt:Date.now()}}
function dNe(e){return[xB,"proof",__F341Workbench.fingerprint(),Math.max(0,Math.floor(e.sourceRevision)),e.renderMethod||"spectral",e.registerPolicy||"resonance",e.kind].join("|")}
async function S5e(e,t){Vt.stop();const n=Vt.getSnapshot();if(!n.source||!n.model)throw new Error("Please extract timbre first.");const r=dNe({sourceRevision:n.sourceRevision,renderMethod:n.model.renderMethod??"spectral",registerPolicy:n.model.bodyV3?.registerPolicy??"resonance",kind:e}),a=Vt.beginRender(e);Vt.setPlaybackStopHandler(()=>xt.stop());const o=()=>Vt.getSnapshot().generation===a,i=()=>{o()&&(Vt.finish(a),t?.())};try{const s=await xt.playDonorProofPreview(n.source,n.model,e,i,()=>!o(),{cacheKey:r,onRenderProgress:l=>Vt.reportRenderProgress(a,l)});return s&&o()?Vt.markPlaying(a):i(),s&&o()}catch(s){throw o()&&Vt.failPlayback(a,s),s}}
function v5e(){
 const e=cU(),t=pe(s=>s.renderVersion),ready=!!e.source&&!!e.model,phase=['analyzing','rendering','playing','error'].includes(e.phase)?e.phase:'idle',generation=P.useRef(0),[active,setActive]=P.useState(null);
 const stop=()=>{Vt.stop();setActive(null);};
 P.useEffect(()=>()=>{generation.current++;Vt.stop();},[]);
 const input=P.useCallback((source,start,duration)=>{const before=Vt.getSnapshot().generation;Vt.invalidateInput(source,start,duration);if(Vt.getSnapshot().generation!==before)generation.current++;},[]);
 const hear=async(kind)=>{
  const before=Vt.getSnapshot();
  if(before.phase==='playing'||before.phase==='rendering'){
   Vt.stop();setActive(null);if(before.auditionKind===kind)return false;
  }
  // Always reconcile with the selected purple mask: an older extracted model may be stale.
  try{await __f3562EnsureDonor();}catch(error){console.warn("[F3.56.11] Donor Preview",error);return false;}
  if(!Vt.selectDonor())return false;
  const s=pe.getState();s.setCarrierDonorV2DonorUseMode('timbre_projection');setActive(kind);
  try{
   const played=kind==='carrier'?await LU(s.spectralData,Zp(s.materialExport.bars,s.materialExport.bpm,s.materialExport.beatsPerBar),{loopPreview:s.materialExport.loopPreview,onPosition:position=>pe.getState().setPlayheadPosition(position),onEnd:()=>{setActive(null);pe.getState().setPlayheadPosition(0);}}):await S5e(kind,()=>setActive(null));
   if(!played)setActive(null);return played;
  }catch(error){setActive(null);return false;}
 };
 return {donorState:e,donorReady:ready,donorPhase:phase,donorError:e.error,donorRenderProgress:e.renderProgress,donorFigurePrepared:!!e.preparedFigureKey&&e.preparedFigureRenderVersion===t,extractionGeneration:generation,donorProofActive:e.phase==='playing'||e.phase==='rendering'?e.auditionKind:null,stopDonorAudition:stop,handleDonorInputChange:input,handleDonorPreview:()=>hear('carrier'),handleDonorProof:hear,selectOtherHearing:()=>{setActive(null);__F35611DonorIntent=false;Vt.selectCarrier();},donorRegisterPolicy:e.model?.bodyV3?.registerPolicy??'resonance',donorRegisterAvailable:!!e.model&&(e.model.renderMethod==='hybrid'?e.model.hybrid?.kind==='periodic':wB(e.model)),handleDonorRegisterPolicy:policy=>{setActive(null);Vt.setRegisterPolicy(policy);},donorRenderMethod:'hybrid',donorHybridAvailable:!!e.model?.hybrid,handleDonorRenderMethod:method=>{setActive(null);Vt.setRenderMethod(method);}};
}
function A5e(e,t=0){return Number.isFinite(e)?e:t}
function Po(e){return A5e(e).toFixed(2)}
function BU(e){const t=e.getChannelData(0);let n=0,r=0,a=0,o=0,i=0;const s=Math.max(64,Math.floor(e.sampleRate*.018));let l=0;for(let d=0;d<t.length;d+=1){const p=t[d]??0,f=Math.abs(p);if(n=Math.max(n,f),r+=p*p,a+=f,l+=f,d>=s&&(l-=Math.abs(t[d-s]??0)),i=Math.max(i,l/Math.min(s,d+1)),d>0){const b=t[d-1]??0;(b<0&&p>=0||b>0&&p<=0)&&(o+=1)}}const c=Math.max(1,t.length);return{durationSec:e.length/Math.max(1,e.sampleRate),peak:n,rms:Math.sqrt(r/c),meanAbs:a/c,zeroCrossingRate:o/c,envelopePeak:i}}
function DU(e){const t=e.donorUseMode==="synthetic_pigment";return{renderMode:"carrier_donor_v2",bars:e.bars,bpm:e.bpm,beatsPerBar:4,durationSec:e.durationSec,donorUseMode:e.donorUseMode,rootFollowEligibility:{canSend:t,mode:t?"synthetic":"granular_audio",reason:t?"Synthetic pigment can later be connected to Root Follow as a modulatable V2 plan.":e.donorUseMode==="timbre_projection"?"Donor Projection is exported as a finished audio body; not a replaceable synthesis plan.":"Raw Texture Layer is sample/granular in character and requires a separate Root Follow audio mode."},materialspurEligibility:{canSend:!0,mode:e.donorUseMode!=="raw_texture_overlay"?"synthetic_render":"raw_granular_render",reason:"Bar count, BPM, and render duration are included in the V2 metadata contract."}}}
function NU(e){const t=Math.abs(e.audioStats.durationSec-e.loopMetadata.durationSec),n=t<=.025,r=e.fieldCoverageContract.bindingActiveColumnRatio,a=e.fieldCoverageContract.skeletonActiveColumnRatio,o=e.fieldCoverageContract.presenceActiveColumnRatio,i=e.audioStats.rms>5e-4&&e.audioStats.peak>.01,s=e.rootFollowPlan??null,l=!!s&&s.eligible&&s.sourceKind==="synth"&&s.renderMode==="direct"&&!s.usesAudioBuffer&&!s.usesGranularPlayback&&!s.usesSamplePresets&&s.lineCount>0&&(s.activeDurationRatio>=.55||s.coveredDurationBeats>=Math.max(1,s.totalBeats*.55)),c=[];n||c.push(`V2-Zeitvertrag abweichend: Δ ${t.toFixed(3)}s.`),o>.02&&a<o*.45&&c.push(`Skeleton only weakly covers the presence field: ${Po(a)} of ${Po(o)}.`),a>.02&&r<a*.5&&c.push(`Binding verliert viele Skeleton-Zeitspalten: ${Po(r)} of ${Po(a)}.`),i||c.push("V2-Render hat kaum messbare Energie."),e.loopMetadata.rootFollowEligibility.mode==="synthetic"&&!l&&c.push("The V2 Root Follow plan has not yet been prepared as a bar-length purely synthetic pattern.");const d=[{id:"v2_time_master",label:"V2 follows bar and tempo time",passed:n,detail:`Render ${e.audioStats.durationSec.toFixed(2)} s · target ${e.loopMetadata.durationSec.toFixed(2)} s · Δ ${t.toFixed(3)}s.`,severity:n?"info":"fail"},{id:"v2_presence_field",label:"Painted presence exists as a field",passed:o>.002,detail:`Presence columns ${Po(o)} · field cells ${e.fieldCoverageContract.fieldCellCount}.`,severity:o>.002?"info":"fail"},{id:"v2_skeleton_coverage",label:"Carrier skeleton reads the field sufficiently",passed:o<=.002||a>=o*.45,detail:`Presence ${Po(o)} → Skeleton ${Po(a)} · Verlust ${Po(e.fieldCoverageContract.presenceToSkeletonLossRatio)}.`,severity:o<=.002||a>=o*.45?"info":"warn"},{id:"v2_binding_coverage",label:"Binding reaches the interpreted shape",passed:a<=.002||r>=a*.5,detail:`Skeleton ${Po(a)} → Binding ${Po(r)} · Verlust ${Po(e.fieldCoverageContract.skeletonToBindingLossRatio)}.`,severity:a<=.002||r>=a*.5?"info":"warn"},{id:"v2_render_energy",label:"V2 render generates a measurable sound body",passed:i,detail:`RMS ${e.audioStats.rms.toFixed(4)} · Peak ${e.audioStats.peak.toFixed(3)} · ZCR ${e.audioStats.zeroCrossingRate.toFixed(3)}.`,severity:i?"info":"fail"},{id:"v2_material_metadata",label:"Material Track metadata is complete",passed:e.loopMetadata.materialspurEligibility.canSend&&e.loopMetadata.bars>0&&e.loopMetadata.bpm>0,detail:`${e.loopMetadata.bars} bars · ${e.loopMetadata.bpm} BPM · ${e.loopMetadata.durationSec.toFixed(2)} s · ${e.loopMetadata.materialspurEligibility.mode}.`,severity:"info"},{id:"v2_root_follow_synthetic_event",label:"Root Follow receives a synthetic V2 multi-line plan",passed:l||e.loopMetadata.rootFollowEligibility.mode!=="synthetic",detail:s?`${s.mode} · Linien ${s.lineCount} · tracks ${s.trackCount} · coverage ${s.coveredDurationBeats.toFixed(2)}/${s.totalBeats.toFixed(2)} beats (${Po(s.activeDurationRatio)}) · AudioBuffer ${s.usesAudioBuffer?"ja":"no"} · granular ${s.usesGranularPlayback?"ja":"no"} · samples ${s.usesSamplePresets?"ja":"no"}.`:"No Root Follow plan in the V2 report.",severity:l||e.loopMetadata.rootFollowEligibility.mode!=="synthetic"?"info":"warn"}],p={timeMasterPass:n,renderVsLoopDeltaSec:t,presenceActiveColumnRatio:o,skeletonActiveColumnRatio:a,bindingActiveColumnRatio:r,presenceToSkeletonLossRatio:e.fieldCoverageContract.presenceToSkeletonLossRatio,skeletonToBindingLossRatio:e.fieldCoverageContract.skeletonToBindingLossRatio,earlyLatePresenceSkew:e.fieldCoverageContract.earlyLatePresenceSkew,earlyLateSkeletonSkew:e.fieldCoverageContract.earlyLateSkeletonSkew,earlyLateBindingSkew:e.fieldCoverageContract.earlyLateBindingSkew,anchorCount:e.carrierSummary?.anchorCount??0,donorAtlasCellCount:e.donorAtlasSummary?.cellCount??0,bindingCount:e.bindingSummary?.bindingCount??0,materialAllocationCount:e.materialAllocationSummary?.allocationCount??0,meanBindingConfidence:e.bindingSummary?.meanConfidence??0,meanMaterialLeakRisk:e.materialAllocationSummary?.meanLeakRisk??0,renderRms:e.audioStats.rms,renderPeak:e.audioStats.peak,renderZeroCrossingRate:e.audioStats.zeroCrossingRate,rootFollowLineCount:s?.lineCount??0,rootFollowTrackCount:s?.trackCount??0,rootFollowCoveredDurationBeats:s?.coveredDurationBeats??0,rootFollowActiveDurationRatio:s?.activeDurationRatio??0,rootFollowMaxLineDurationBeats:s?.maxLineDurationBeats??0,rootFollowUsesGranularPlayback:s?.usesGranularPlayback??!1,rootFollowUsesSamplePresets:s?.usesSamplePresets??!1},f=s?s.lineCount+" Linien · "+s.coveredDurationBeats.toFixed(1)+"/"+s.totalBeats.toFixed(1)+" beats":"—",b=`V2 · ${e.loopMetadata.bars} bars @ ${Math.round(e.loopMetadata.bpm)} BPM · ${e.loopMetadata.durationSec.toFixed(2)}s · Presence ${Po(o)} → Skeleton ${Po(a)} → Binding ${Po(r)} · RMS ${e.audioStats.rms.toFixed(3)} · ${e.loopMetadata.donorUseMode} · RootFollow ${f}`;return{createdAt:Date.now(),validationMode:"carrier_donor_v2",sourceSignature:e.sourceSignature,loopMetadata:e.loopMetadata,checks:d,metrics:p,rootFollowPlan:s,v2:{carrierSummary:e.carrierSummary,continuitySummary:e.continuitySummary,donorSummary:e.donorSummary,donorAtlasSummary:e.donorAtlasSummary,gestaltFieldSummary:e.gestaltFieldSummary,materialFieldSummary:e.materialFieldSummary,bindingSummary:e.bindingSummary,materialAllocationSummary:e.materialAllocationSummary,transferProfile:e.transferProfile,fieldCoverageContract:e.fieldCoverageContract},conditions:{v2_combined:e.audioStats},warnings:c,summaryLine:b}}
function x5e(e){return e.anchorsByTime.flat()}
function OU(e){const t=x5e(e),n=t.length,r=e.anchorsByTime.reduce((l,c)=>Math.max(l,c.length),0),a=e.width>0?n/e.width:0,o=n>0?t.reduce((l,c)=>l+c.energy,0)/n:0,i=t.reduce((l,c)=>!l||c.energy>l.energy?c:l,null),s={tonal:0,cluster:0,noise:0,transient:0};for(const l of t)s[l.regime]+=1;return{anchorCount:n,peakPolyphony:r,meanAnchorsPerFrame:a,meanAnchorEnergy:o,strongestAnchorHz:i?.centerHz??null,regimeCounts:s}}
function M5e(e){const t=e.links.length,n=t>0?e.links.reduce((o,i)=>o+i.continuityScore,0)/t:0,r=t>0?e.links.reduce((o,i)=>o+i.deltaBins,0)/t:0,a=t>0?e.links.reduce((o,i)=>Math.max(o,i.continuityScore),0):0;return{linkCount:t,meanContinuityScore:n,meanDeltaBins:r,strongestContinuityScore:a}}
function $O(e,t){return t<=1e-9?0:dx(e/t)}
function _U(e,t){return(e-t)/Math.max(1e-6,e+t)}
function zU(e){let t=null,n=null,r=0;for(let a=0;a<e.length;a+=1)e[a]&&(r+=1,t===null&&(t=a),n=a);return{first:t,last:n,count:r}}
function w5e(e){const t=Math.max(0,e?.width??0),n=Array.from({length:t},()=>!1);let r=0,a=0;const o=Math.max(1,Math.floor(t/2));if(e)for(let s=0;s<t;s+=1){const l=e.anchorsByTime[s]??[];l.length>0&&(n[s]=!0);const c=l.reduce((d,p)=>d+Math.max(0,p.energy),0);s<o?r+=c:a+=c}const i=zU(n);return{...i,ratio:t>0?i.count/t:0,skew:i.count>0?_U(r,a):0}}
function R5e(e,t){const n=Math.max(0,e?.width??0),r=Array.from({length:n},()=>!1);let a=0,o=0;const i=Math.max(1,Math.floor(n/2)),s=new Map;if(e)for(const c of e.anchorsByTime)for(const d of c)s.set(d.id,d);for(const c of t??[]){const d=s.get(c.carrierAnchorId);if(!d)continue;const p=d.timeIndex;if(p<0||p>=n)continue;r[p]=!0;const f=Math.max(0,d.energy)*Math.max(0,c.confidence||0);p<i?a+=f:o+=f}const l=zU(r);return{...l,ratio:n>0?l.count/n:0,skew:l.count>0?_U(a,o):0}}
function jU(e,t,n){const r=Math.max(1,e.width||t?.width||1),a=w5e(t),o=R5e(t,n),i=dx(e.stats.activeDurationRatio),s=dx(a.ratio),l=dx(o.ratio);return{width:r,presenceActiveColumnRatio:i,skeletonActiveColumnRatio:s,bindingActiveColumnRatio:l,presenceToSkeletonLossRatio:$O(Math.max(0,i-s),Math.max(1e-6,i)),skeletonToBindingLossRatio:$O(Math.max(0,s-l),Math.max(1e-6,s)),earlyLatePresenceSkew:e.stats.earlyLateEnergySkew,earlyLateSkeletonSkew:a.skew,earlyLateBindingSkew:o.skew,firstPresenceColumn:e.stats.firstActiveColumn,lastPresenceColumn:e.stats.lastActiveColumn,firstSkeletonColumn:a.first,lastSkeletonColumn:a.last,firstBindingColumn:o.first,lastBindingColumn:o.last,activePresenceColumnCount:e.stats.activeColumnCount,activeSkeletonColumnCount:a.count,activeBindingColumnCount:o.count,fieldCellCount:e.stats.activeCellCount,paintedEnergyDurationRatio:i,maxColumnEnergy:e.stats.maxColumnEnergy,meanActiveColumnEnergy:e.stats.meanActiveColumnEnergy}}
function GU(e,t){const n=e.data.slice(),r=new Float32Array(n.length);return{width:e.width,height:e.height,durationSec:t,carrierTrace:n,orderedField:r,bodyField:r,residualField:r,transientField:r,compositeField:n,builtFromSignature:"carrier-donor-v2:donor-projection:carrier-view"}}
function C5e(e){const t=IR(e.spectralData,e.meter.intendedLoopDurationSec,{maxAnchorsPerFrame:8,minPeakAmplitude:.025,verticalSmoothingRadius:1,minPeakDistanceBins:2}),n=OU(t),r=DU({...e.meter,durationSec:e.meter.intendedLoopDurationSec,donorUseMode:"timbre_projection"}),a=ev(e.spectralData),o=BU(e.renderedBuffer),i=NU({sourceSignature:e.sourceSignature,loopMetadata:r,audioStats:o,carrierSummary:n,continuitySummary:null,donorSummary:null,donorAtlasSummary:null,gestaltFieldSummary:null,materialFieldSummary:null,bindingSummary:null,materialAllocationSummary:null,transferProfile:e.current.transferProfile,fieldCoverageContract:jU(a.presence,t,[]),rootFollowPlan:null}),s=[...Array(e.renderedBuffer.numberOfChannels).keys()].every(l=>e.renderedBuffer.getChannelData(l).every(Number.isFinite));return i.checks=[{id:"projection-finite",label:"Finite Audio Signal",passed:s,severity:s?"info":"fail",detail:"Computed PCM samples verified."},{id:"projection-duration",label:"Time Follows the Figure",passed:i.metrics.timeMasterPass,severity:i.metrics.timeMasterPass?"info":"fail",detail:`Duration ${o.durationSec.toFixed(3)} s.`},{id:"projection-headroom",label:"Ausgangspegel",passed:o.peak<=.98,severity:o.peak<=.98?"info":"warn",detail:`Peak ${o.peak.toFixed(3)}, RMS ${o.rms.toFixed(3)}.`}],i.warnings=["Atlas/binding metrics do not apply to this direct material projection. This report does not assess subjective sound quality."],i.summaryLine=`Donor body · ${n.anchorCount} carrier anchors · ${o.durationSec.toFixed(2)} s · peak ${o.peak.toFixed(3)}`,{mode:"carrier_donor_v2",sourceSignature:e.sourceSignature,buffer:e.renderedBuffer,loopMetadata:r,report:i,rootFollowConfig:null,rootFollowPlan:null,rootFollowGranularProfile:null,donorMaterialProfile:null,syntheticRootFollow:!1}}
function eA(e,t,n){return Number.isFinite(e)?Math.max(t,Math.min(n,Math.round(e))):t}
function VU(e){const t=Math.max(1,e.spectralData.width),n=Math.max(1,e.spectralData.height),r=eA(Math.min(e.x0,e.x1),0,t-1),a=eA(Math.max(e.x0,e.x1),0,t-1),o=eA(Math.min(e.y0,e.y1),0,n-1),i=eA(Math.max(e.y0,e.y1),0,n-1);return a<r||i<o?null:{x0:r,x1:a,y0:o,y1:i,reason:e.reason||"spectral-forge-edit"}}
function P5e(e){const t=Math.max(1,Number.isFinite(e.radius)?e.radius:1);return VU({spectralData:e.spectralData,x0:e.x-t,x1:e.x+t,y0:e.y-t,y1:e.y+t,reason:e.reason})}
function I5e(e){e.ports.invalidateAudioBuffer(),e.ports.setAudioBufferDirty(!0);const t=e.dirty;if(t){const n=t.reason??`spectral-forge-${e.activeTool}-edit`;typeof t.x=="number"&&typeof t.y=="number"?P5e({spectralData:e.spectralData,x:t.x,y:t.y,radius:Math.max(1,t.radius??e.defaultBrushSize??1),reason:n}):typeof t.x0=="number"&&typeof t.x1=="number"&&typeof t.y0=="number"&&typeof t.y1=="number"&&VU({spectralData:e.spectralData,x0:t.x0,x1:t.x1,y0:t.y0,y1:t.y1,reason:n})}e.ports.triggerRender()}
function E5e(e){switch(e){case"workbench_plus_body":return"Workbench + Source";case"lab_only":return"Lab";case"workbench_only":default:return"Workbench"}}
function F5e(e){CB[e.activeTool];const{brushSize:t,intensity:n,hardness:r,numHarmonics:a,harmonicDecay:o,sprayDensity:i,eraseMode:s,grainSize:l}=e.settings,{spectralData:c,x:d,y:p}=e;switch(e.activeTool){case"brush":c.applyBrush(d,p,t,n,r,s,l),e.syncForge3Region(d,p,t);break;case"hardBrush":e.forge3Mode&&e.bodyLinkedMode?e.forge3Field.applySteinmetz(c,d,p,t,n,s,l):c.applyBrush(d,p,t,n,1,s,l),e.syncForge3Region(d,p,t);break;case"harmonicBrush":c.applyHarmonicBrush(d,p,t,n,r,a,o,c.height,s,l),e.syncForge3Region(d,p,t);break;case"noiseBrush":c.applyNoiseBrush(d,p,t,n,s,l),e.syncForge3Region(d,p,t);break;case"spray":c.applySpray(d,p,t,n,i,s,l),e.syncForge3Region(d,p,t);break;case"smudge":c.applySmudge(d,p,t,n,0,0,l),e.syncForge3Region(d,p,t);break;case"dodgeBurn":c.applyDodgeBurn(d,p,t,n,r,s,l),e.syncForge3Region(d,p,t);break;case"blurSharpen":c.applyBlurSharpen(d,p,t,n,r,s),e.syncForge3Region(d,p,t);break;case"delaySmear":c.applyDelaySmear(d,p,t,n,r,s,l),e.syncForge3Region(d,p,t);break;case"threshold":c.applyThresholdBrush(d,p,t,n,r,s,l),e.syncForge3Region(d,p,t);break;case"sourceTrace":{const f=e.sourceAsset?.analysisCache;f&&(c.applySourceTrace(d,p,t,n,r,f.data,f.width,f.height,f.transientEnvelope,s,l),e.forge3Mode&&e.bodyLinkedMode&&e.sourceAsset&&e.forge3Field.applySourceTraceMetadata(c,e.sourceAsset,d,p,t,n,r,s)),e.syncForge3Region(d,p,t,e.forge3Mode&&e.bodyLinkedMode&&e.sourceAsset?"preserve":"reseed");break}case"formant":c.applyFormantStamp(d,p,e.settings.formantVowel,n,c.height,t,s,l),e.syncForge3Region(d,p,t);break}}
function WU(e,t){return(1-Math.log(e/20)/Math.log(1e3))*t}
function T5e(e){switch(e.regime){case"transient":return"rgba(251, 191, 36, 0.95)";case"cluster":return"rgba(236, 72, 153, 0.92)";case"noise":return"rgba(148, 163, 184, 0.88)";case"tonal":default:return"rgba(167, 139, 250, 0.95)"}}
function L5e(e){return`rgba(192, 132, 252, ${Math.max(.18,Math.min(.82,e.continuityScore*.88)).toFixed(3)})`}
function B5e(e){if(!e)return null;switch(e.dominantRegister){case"low":return"rgba(56, 189, 248, 0.92)";case"high":return"rgba(251, 191, 36, 0.92)";case"mid":default:return"rgba(74, 222, 128, 0.92)"}}
function ForgePCMSpectrumView({frame}) {
 const visible=P.useContext(__ForgeWorkspaceVisibility);
 return visible?u.jsx(ForgePCMSpectrumOwner,{frame}):null;
}
function ForgePCMSpectrumOwner({frame}) {
 const output=P.useRef(null),redOutput=P.useRef(null),latest=P.useRef(frame),image=P.useRef(null);
 const [status,setStatus]=P.useState('Play to measure'),[shown,setShown]=P.useState(true);
 latest.current=frame;
 function draw() {
  const target=output.current,args={...latest.current,canvas:latest.current.canvasRef.current},base=args.canvas;
  if(!target||!base)return;
  if(target.width!==base.width)target.width=base.width;
  if(target.height!==base.height)target.height=base.height;
  const context=target.getContext('2d');if(!context)return;
  context.clearRect(0,0,target.width,target.height);
  if(!image.current||!(args.viewPort.zoomX>0&&args.viewPort.zoomY>0))return;
  const {offsetX,offsetY,zoomX,zoomY}=args.viewPort,sx=image.current.width/args.spectralData.width,sy=image.current.height/args.spectralData.height;
  context.globalCompositeOperation='source-over';context.imageSmoothingEnabled=true;
  context.drawImage(image.current,offsetX*sx,offsetY*sy,target.width/zoomX*sx,target.height/zoomY*sy,0,0,target.width,target.height);
  // Reuse the pre-4.3.4 editor's cached carrier mask; never write into the grid.
  context.globalCompositeOperation='destination-out';
  __forgeDisplayDraw(context,__forgeDisplayCarrierLayers(args).protection,args);
  context.globalCompositeOperation='source-over';
  const red=redOutput.current;
  if(red){
   red.width=target.width;red.height=target.height;
   const tint=red.getContext('2d');tint.drawImage(target,0,0);
   tint.globalCompositeOperation='source-in';tint.fillStyle='rgb(245,76,82)';tint.fillRect(0,0,red.width,red.height);
  }
 }
 P.useEffect(()=>{draw()},[frame]);
 P.useEffect(()=>{
  if(!shown)return;
  setStatus('Play to measure');
  let alive=true,worker=null,url=null,scheduled=null,sequence=0,buffer=null,animation=null,swapTimer=null;
  const removers=[];
  const identity=()=>{
   const s=pe.getState(),m=s.materialExport,d=Vt.getSnapshot();
   return [s.spectralData,s.renderVersion,s.synthMode,s.waveformMix,s.carrierIntegralSelection,s.carrierIntegralSynthLab,s.carrierIntegralHarmonicXplore,
    s.sourceAsset,s.sourceAssetContext,s.sourcePreviewMode,m.bars,m.beatsPerBar,m.bpm,__ForgeListeningMode.value(),d.sourceRevision,d.selected,
    __F3564Master.getSnapshot().tuning,__Fractalia.snapshot(),__Emilia.snapshot(),__F341Workbench.fingerprint(),__F352Session.getSnapshot().recipe];
  };
  let stamp=identity();
  function cancel() {
   sequence++;buffer=null;
   if(swapTimer!==null){clearTimeout(swapTimer);swapTimer=null}
   if(scheduled!==null){if(typeof cancelIdleCallback==='function')cancelIdleCallback(scheduled);else clearTimeout(scheduled);scheduled=null}
   if(worker){worker.onmessage=worker.onerror=null;worker.terminate();worker=null}
   if(url){URL.revokeObjectURL(url);url=null}
  }
  function pulse() {
   if(image.current&&!animation&&redOutput.current)
    animation=redOutput.current.animate([{opacity:0},{opacity:.82},{opacity:0}],{duration:2800,iterations:Infinity});
  }
  function invalidate() {
   const next=identity();if(next.every((v,i)=>Object.is(v,stamp[i])))return;
   stamp=next;cancel();pulse();if(alive)setStatus(image.current?'Previous spectrum · awaiting preview':'Play to measure');
  }
  function enqueue(fn) {
   const run=()=>{scheduled=null;if(alive)fn()};
   scheduled=typeof requestIdleCallback==='function'?requestIdleCallback(run,{timeout:100}):setTimeout(run,0);
  }
  function receive(pcm,options) {
   if(!alive||!pcm?.getChannelData)return;
   if(!/^(forge-f333-|forge-f352-hybrid$|donor-projection$)/.test(options.lifecycleMode||''))return;
   invalidate();cancel();pulse();
   // At most 64 MiB of PCM, copied in 256 KiB idle slices. Never detach AudioBuffer data.
   if(pcm.length*pcm.numberOfChannels>16777216){setStatus('Preview too long for spectrum');return}
   const token=sequence;buffer=pcm;setStatus(image.current?'Previous spectrum · measuring':'Measuring heard audio…');
   enqueue(()=>{
    if(token!==sequence||!buffer)return;
    try{
     url=URL.createObjectURL(new Blob(['('+forgePCMMeasurementWorker.toString()+')()'],{type:'text/javascript'}));
     worker=new Worker(url,{name:'forge-pcm-view'});URL.revokeObjectURL(url);url=null;
     worker.onerror=()=>{if(alive&&token===sequence){cancel();setStatus('Spectrum unavailable')}};
     worker.onmessage=({data})=>{
      if(!alive||token!==sequence)return;
      if(data.type==='error'){cancel();setStatus('Spectrum unavailable');return}
      if(data.type!=='image')return;
      try{
       const bitmap=document.createElement('canvas');bitmap.width=data.width;bitmap.height=data.height;
       bitmap.getContext('2d').putImageData(new ImageData(data.pixels,data.width,data.height),0,0);
       cancel();
       const commitToken=sequence;
       const commit=()=>{
        swapTimer=null;if(!alive||commitToken!==sequence)return;
        animation?.cancel();animation=null;image.current=bitmap;draw();setStatus('Cyan · heard spectrum');
       };
       // Commit only at the cyan end of the red pulse. Web Animations owns the
       // pulse; one view-scoped timeout replaces the former repaint loop.
       const phase=animation?(Number(animation.currentTime)||0)%2800:0;
       if(phase>35)swapTimer=setTimeout(commit,2800-phase);else commit();
      }catch{cancel();setStatus('Spectrum unavailable')}
     };
     worker.postMessage({type:'begin',length:buffer.length,channels:buffer.numberOfChannels,sampleRate:buffer.sampleRate,rate:Math.max(.05,options.playbackRate??1)});
     let channel=0,offset=0;
     function transfer() {
      if(token!==sequence||!buffer||!worker)return;
      try{
       const end=Math.min(buffer.length,offset+65536),samples=buffer.getChannelData(channel).slice(offset,end);
       worker.postMessage({type:'chunk',channel,offset,samples},[samples.buffer]);offset=end;
       if(offset===buffer.length){channel++;offset=0}
       if(channel===buffer.numberOfChannels){buffer=null;worker.postMessage({type:'finish'})}else enqueue(transfer);
      }catch{cancel();if(alive)setStatus('Spectrum unavailable')}
     }
     transfer();
    }catch{cancel();if(alive)setStatus('Spectrum unavailable')}
   });
  }
  removers.push(observeForgePreviewPCM(xt,receive));
  for(const store of [pe,Vt,__ForgeListeningMode,__F3564Master,__Fractalia,__Emilia,__F341Workbench,__F352Session])removers.push(store.subscribe(invalidate));
  const resize=new MutationObserver(draw),base=latest.current.canvasRef.current;
  if(base)resize.observe(base,{attributes:true,attributeFilter:['width','height']});
  return ()=>{alive=false;cancel();animation?.cancel();animation=null;for(const remove of removers)remove();resize.disconnect();image.current=null;draw()};
 },[shown]);
 return u.jsxs(u.Fragment,{children:[
  u.jsx('canvas',{ref:output,'data-forge-pcm-spectrum':status,className:'absolute inset-0 pointer-events-none',style:{display:shown?'block':'none',opacity:.88}}),
  u.jsx('canvas',{ref:redOutput,'data-forge-spectrum-transition':true,className:'absolute inset-0 pointer-events-none',style:{display:shown?'block':'none',opacity:0}}),
  null]});
}
function __F33BaseFrame(args){
  const ctx=args.canvas.getContext('2d');if(!ctx)return;
  const layer=__forgeDisplayLayers(args),lut=args.colorLut;
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
  ctx.fillStyle=`rgb(${lut[0]},${lut[1]},${lut[2]})`;ctx.fillRect(0,0,args.canvas.width,args.canvas.height);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';__forgeDisplayDraw(ctx,layer.raster,args);ctx.restore();
}
function __forgeDisplayVisibility(data,field){
  const count=data.width*data.height,active=new Float32Array(count),trace=new Float32Array(count);
  const energy=data.data,weights=field?.sourceWeight??[],bias=field?.traceBias??[],mass=field?.bodyMass??[];
  for(let i=0;i<count;i++){
    const amp=energy[i]??0;if(amp>.003){active[i]=amp;continue;}
    const value=Math.max(bias[i]??0,(weights[i]??0)*.24,(mass[i]??0)*.12);
    if(value>.02)trace[i]=Math.min(1,value);
  }
  return{active,trace};
}
function __ForgeVisualKey({colorMapName,showGrain,onGrain}){
  const gradient=P.useMemo(()=>{
    const lut=bE(xO[colorMapName]??xO.magma),stops=[];
    for(let i=0;i<=8;i++){const at=Math.round(i/8*255)*3;stops.push(`rgb(${lut[at]},${lut[at+1]},${lut[at+2]}) ${i/8*100}%`);}
    return `linear-gradient(90deg,${stops.join(',')})`;
  },[colorMapName]);
  return u.jsxs('div',{'data-forge-visual-key':'true',style:{margin:'7px 0',fontSize:10,lineHeight:1.5,color:'#aeb9c9'},children:[
    u.jsx('div',{style:{height:5,borderRadius:3,background:gradient,marginBottom:3},'aria-hidden':true}),
    u.jsx('div',{children:'Figur: Energie · schwach → stark'}),
    u.jsxs('label',{style:{display:'flex',alignItems:'center',gap:5,marginTop:5,cursor:'pointer'},title:"Shows saved granularity as a color. Its audible effect depends on the selected listening mode.",children:[
      u.jsx('input',{type:'checkbox',checked:showGrain,onChange:event=>onGrain(event.currentTarget.checked),'aria-label':"Show Grain Colors",style:{accentColor:'#63c8d2'}}),
      u.jsx('span',{children:"Grain Colors (G)"}),
    ]}),
    showGrain&&u.jsx('div',{style:{color:'#91a5ba'},children:"Red: short · Turquoise: long"}),
    u.jsx('div',{style:{marginTop:3,color:'#91a5ba'},children:"Body / Source: parameters of the selected lens"}),
  ]});
}
function D5e(args){const display=args.variant==='forge3'&&!__f333WorkingSource(pe.getState())?{...args,forge3Lens:'hear',showTraceLayer:false}:args;__F33BaseFrame(display);}
function __xenForgeLinePreviewCells(x0,y0,x1,y1,brushSize,visit){
 const dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;
 let error=dx-dy,x=x0,y=y0;
 const limit=Math.max(dx,dy,1),spacing=Math.max(1,Math.floor(brushSize*.3));
 for(let step=0;;step++){
  if(step%spacing===0)visit(x,y);
  if(x===x1&&y===y1)break;
  const doubled=2*error;
  if(doubled>-dy){error-=dy;x+=sx}
  if(doubled<dx){error+=dx;y+=sy}
  if(step>limit+1)break;
 }
}
function N5e({canvas:e,viewPort:t,spectralData:n,activeTool:r,lineStart:a,toolSettings:o,stampPhase:i,stampSelStart:s,stampSelEnd:l,stampData:c,stampScaleX:d,stampScaleY:p,stampRotation:f,stampFlipX:b,stampFlipY:g,mousePos:y,guideDragMarkerIndex:x,guideLayout:A,colorLut:M,showGrainLayer:v,synthMode:w,showPlayheadMarker:R,isPlaying:k,playheadPosition:I,showCarrierDonorV2Overlay:E,showCarrierDonorV2ContinuityOverlay:F,showCarrierDonorV2BindingOverlay:L,carrierDonorV2Skeleton:B,carrierDonorV2ContinuityGraph:O,carrierAnchorMap:T,carrierBindingMap:_,v2OverlayWarning:G,screenToDataFromScreen:j}){if(!e)return;const N=e.getContext("2d");if(!N)return;const W=e.width,V=e.height;N.clearRect(0,0,W,V);const{offsetX:U,zoomX:H,offsetY:q,zoomY:K}=t,Y=[55,110,220,440,880,1760,3520,7040,14080,65.41,130.81,261.63,523.25,1046.5,2093,4186,8372];N.strokeStyle="rgba(255,255,255,0.07)",N.lineWidth=1;for(const X of Y){const ne=(WU(X,n.height)-q)*K;ne<0||ne>V||(N.beginPath(),N.moveTo(0,ne),N.lineTo(W,ne),N.stroke())}const{safeBars:J,barWidthData:Z,guideMarkers:te}=A;N.strokeStyle="rgba(103, 232, 249, 0.14)",N.lineWidth=1;for(let X=0;X<J;X++){const Q=X*Z;for(let ne=0;ne<te.length;ne++){const ie=(Q+te[ne]*Z-U)*H;if(ie<0||ie>W)continue;N.beginPath(),N.moveTo(ie,0),N.lineTo(ie,V),N.stroke();const de=x===ne,oe=3,ue=4;N.fillStyle=de?"rgba(34, 211, 238, 0.95)":"rgba(125, 211, 252, 0.82)",N.beginPath(),N.moveTo(ie,oe+7),N.lineTo(ie-ue,oe),N.lineTo(ie+ue,oe),N.closePath(),N.fill()}}N.strokeStyle="rgba(34, 211, 238, 0.30)",N.lineWidth=1.3;for(let X=0;X<=J;X++){const ne=(X*Z-U)*H;ne<0||ne>W||(N.beginPath(),N.moveTo(ne,0),N.lineTo(ne,V),N.stroke())}if(N.lineWidth=1,E&&B){if(F&&O&&T.size>0){N.save(),N.lineCap="round";for(const X of O.links){const Q=T.get(X.fromAnchorId),ne=T.get(X.toAnchorId);if(!Q||!ne)continue;const ee=(Q.timeIndex-U)*H,ie=(Q.centerBin-q)*K,de=(ne.timeIndex-U)*H,oe=(ne.centerBin-q)*K;ee<-14&&de<-14||ee>W+14&&de>W+14||ie<-14&&oe<-14||ie>V+14&&oe>V+14||(N.strokeStyle=L5e(X),N.lineWidth=.8+X.continuityScore*1.5,N.beginPath(),N.moveTo(ee,ie),N.lineTo(de,oe),N.stroke())}N.restore()}for(const X of B.anchorsByTime)for(const Q of X){const ne=(Q.timeIndex-U)*H,ee=(Q.centerBin-q)*K;if(ne<-10||ne>W+10||ee<-10||ee>V+10)continue;const ie=Math.max(2,Math.min(6,1.6+Q.energy*6)),de=Math.max(1,Q.bandwidthBins*K/2),oe=T5e(Q);if(N.strokeStyle=oe,N.lineWidth=Q.regime==="tonal"?1.4:1,N.beginPath(),N.moveTo(ne,ee-de),N.lineTo(ne,ee+de),N.stroke(),N.fillStyle=oe,N.beginPath(),N.arc(ne,ee,ie,0,Math.PI*2),N.fill(),L){const ue=_.get(Q.id),fe=B5e(ue);ue&&fe&&(N.strokeStyle=fe,N.lineWidth=1+ue.confidence*2.2,N.beginPath(),N.arc(ne,ee,ie+2.6,0,Math.PI*2),N.stroke())}}N.lineWidth=1}if(G){N.save(),N.font="11px sans-serif";const X=8,ne=N.measureText(G).width+X*2,ee=24,ie=Math.max(8,W-ne-8),de=8;N.fillStyle="rgba(245, 158, 11, 0.14)",N.strokeStyle="rgba(245, 158, 11, 0.45)",N.lineWidth=1,N.fillRect(ie,de,ne,ee),N.strokeRect(ie+.5,de+.5,ne-1,ee-1),N.fillStyle="rgba(253, 224, 71, 0.95)",N.fillText(G,ie+X,de+15),N.restore()}if(k||R){const X=(I*n.width-U)*H,Q=Math.max(24,H*10),ne=X-Q*.5,ee=X+Q*.5;if(ee>=0&&ne<=W){const ie=Math.max(0,ne),de=Math.min(W,ee),oe=N.createLinearGradient(ie,0,de,0);oe.addColorStop(0,"rgba(0, 255, 136, 0.00)"),oe.addColorStop(.12,"rgba(0, 255, 136, 0.18)"),oe.addColorStop(.5,"rgba(90, 255, 180, 0.40)"),oe.addColorStop(.88,"rgba(0, 255, 136, 0.18)"),oe.addColorStop(1,"rgba(0, 255, 136, 0.00)"),N.fillStyle=oe,N.fillRect(ie,0,Math.max(0,de-ie),V),N.strokeStyle="rgba(0,255,136,0.34)",N.lineWidth=1.2,N.strokeRect(ie+.5,.5,Math.max(0,de-ie-1),V-1)}if(X>=0&&X<=W)N.save(),N.strokeStyle="#00ff88",N.lineWidth=3.5,N.shadowColor="#00ff88",N.shadowBlur=22,N.beginPath(),N.moveTo(X,0),N.lineTo(X,V),N.stroke(),N.restore(),N.fillStyle="#7dffbf",N.beginPath(),N.moveTo(X-6,0),N.lineTo(X+6,0),N.lineTo(X,10),N.closePath(),N.fill();else{const ie=X<0?0:W,de=X<0?1:-1;N.fillStyle="rgba(0,255,136,0.9)",N.beginPath(),N.moveTo(ie,18),N.lineTo(ie+de*10,12),N.lineTo(ie+de*10,24),N.closePath(),N.fill()}}if(r==="line"&&a){
 if(y){
  const endpoint=j(y.sx,y.sy),spanX=Math.max(1,H),spanY=Math.max(1,K);
  N.save();N.fillStyle="rgba(252, 211, 77, 0.88)";N.beginPath();
  __xenForgeLinePreviewCells(a.x,a.y,endpoint.x,endpoint.y,o.brushSize,(px,py)=>{
   const left=Math.floor((px-U)*H),top=Math.floor((py-q)*K);
   if(left>W||top>V||left+spanX<0||top+spanY<0)return;
   N.rect(left,top,spanX,spanY);
  });
  N.fill();N.restore();
 }
 const X=(a.x-U)*H,Q=(a.y-q)*K;
 N.fillStyle="#ff0",N.beginPath(),N.arc(X,Q,4,0,Math.PI*2),N.fill();
}if(r==="stamp"&&i==="selecting"&&s&&l){const X=(Math.min(s.x,l.x)-U)*H,Q=(Math.min(s.y,l.y)-q)*K,ne=Math.abs(l.x-s.x)*H,ee=Math.abs(l.y-s.y)*K;N.strokeStyle="#ff0",N.lineWidth=1,N.setLineDash([4,4]),N.strokeRect(X,Q,ne,ee),N.setLineDash([]),N.fillStyle="rgba(255, 255, 0, 0.05)",N.fillRect(X,Q,ne,ee)}if(r==="stamp"&&i==="stamping"&&c&&y){const X=j(y.sx,y.sy),Q=n.getStampBounds(c,{scaleX:d,scaleY:p,rotation:f,flipX:b,flipY:g}),{halfW:ne,halfH:ee,outW:ie,outH:de}=Q,oe=(X.x-ne-U)*H,ue=(X.y-ee-q)*K,fe=ie*H,he=de*K;N.strokeStyle="#0ff",N.lineWidth=1,N.setLineDash([3,3]),N.strokeRect(oe,ue,fe,he),N.setLineDash([]),N.fillStyle="rgba(0, 255, 255, 0.08)",N.fillRect(oe,ue,fe,he);const re={scaleX:d,scaleY:p,rotation:f,flipX:b,flipY:g};if(fe>1&&he>1&&ie>1&&de>1){const le=document.createElement("canvas");le.width=ie,le.height=de;const Ae=le.getContext("2d");if(Ae){const ce=Ae.createImageData(ie,de),ge=ce.data;for(let Ce=0;Ce<de;Ce++)for(let Re=0;Re<ie;Re++){const xe=n.sampleStampTransformed(c,Re-ne,Ce-ee,re).amp;if(xe<=.01)continue;const Be=Math.round(xe*255)*3,Ie=(Ce*ie+Re)*4;ge[Ie]=M[Be],ge[Ie+1]=M[Be+1],ge[Ie+2]=M[Be+2],ge[Ie+3]=115}Ae.putImageData(ce,0,0),N.save(),N.imageSmoothingEnabled=!0,N.imageSmoothingQuality="high",N.drawImage(le,oe,ue,fe,he),N.restore()}}}if(y){const{sx:X,sy:Q}=y,ne=o.eraseMode,ee=o.brushSize,ie=ee*H,de=ee*K;N.save(),N.strokeStyle=ne?"rgba(255, 80, 80, 0.7)":"rgba(255, 255, 255, 0.6)",N.lineWidth=1,(r!=="stamp"||i!=="selecting")&&(N.beginPath(),N.ellipse(X,Q,Math.max(1,ie),Math.max(1,de),0,0,Math.PI*2),N.stroke());const oe=Math.max(ie,de)+6,ue=14;if(N.strokeStyle=ne?"rgba(255, 100, 100, 0.9)":"rgba(255, 255, 255, 0.8)",N.lineWidth=1,N.beginPath(),N.moveTo(X,Q-oe-ue),N.lineTo(X,Q-oe),N.stroke(),N.beginPath(),N.moveTo(X,Q+oe),N.lineTo(X,Q+oe+ue),N.stroke(),N.beginPath(),N.moveTo(X-oe-ue,Q),N.lineTo(X-oe,Q),N.stroke(),N.beginPath(),N.moveTo(X+oe,Q),N.lineTo(X+oe+ue,Q),N.stroke(),N.fillStyle=ne?"#ff4444":"#ffffff",N.beginPath(),N.arc(X,Q,1.5,0,Math.PI*2),N.fill(),ne&&(N.strokeStyle="rgba(255, 80, 80, 0.9)",N.lineWidth=2,N.beginPath(),N.moveTo(X-4,Q),N.lineTo(X+4,Q),N.stroke()),w==="granular"||v){const[fe,he,re]=kB(o.grainSize);N.fillStyle=`rgb(${fe}, ${he}, ${re})`,N.beginPath(),N.arc(X+oe+4,Q+oe+4,3,0,Math.PI*2),N.fill(),N.strokeStyle="rgba(255,255,255,0.5)",N.lineWidth=.5,N.stroke()}N.restore()}}
function O5e({hoverInfo:e,forge3Hover:t,eraseMode:n}){return e?u.jsxs("div",{className:"absolute bottom-1 right-1 bg-black/70 text-xs text-gray-300 px-2 py-1 rounded font-mono pointer-events-none",children:[e.note," (",e.freq," Hz) | ",e.time.toFixed(3),"s",t&&u.jsx("span",{className:"ml-2 text-emerald-300",children:t}),n&&u.jsx("span",{className:"ml-2 text-red-400",children:"⊖ RADIEREN"})]}):null}
function _5e({isPlaying:e,playheadPosition:t,variant:n,forge3Lens:r}){return u.jsxs(u.Fragment,{children:[e&&u.jsxs("div",{className:"absolute top-2 right-3 bg-black/65 text-[10px] text-emerald-300 px-2 py-1 rounded pointer-events-none font-mono",children:["Scan ",Math.max(0,Math.min(100,t*100)).toFixed(1),"%"]}),n==="forge3"&&u.jsxs("div",{className:"absolute top-2 right-3 translate-y-6 bg-black/65 text-[10px] text-cyan-200 px-2 py-1 rounded pointer-events-none font-mono",children:["Lens:",r==="body"?"Body":r==="source"?"Source":"Listen"]})]})}
function z5e({activeTool:e,stampPhase:t,stampScaleX:n,stampScaleY:r}){return e!=="stamp"?null:u.jsxs("div",{className:"absolute top-2 left-14 bg-black/80 text-xs text-cyan-300 px-3 py-1.5 rounded pointer-events-none",children:[t==="idle"&&"📋 Drag a rectangle around the desired area",t==="selecting"&&"📋 Select area... (release to confirm)",t==="stamping"&&`📋 Click = Stamp | Scroll = Uniform Scale | Arrow Keys = Stretch | X: ${(n*100).toFixed(0)}% Y: ${(r*100).toFixed(0)}%`]})}
function j5e({spectralHeight:e,viewPort:t,canvasHeight:n}){const tune=P.useSyncExternalStore(__F3564Master.subscribe,__F3564Master.getSnapshot,__F3564Master.getSnapshot);const pitchRatio=2**(tune.tuning/12);return u.jsxs("div",{className:"absolute left-0 top-0 bottom-0 w-12 pointer-events-none flex flex-col justify-between py-1",children:[[2e4,1e4,5e3,2e3,1e3,500,200,100,50,20].map(r=>{const o=(WU(r/pitchRatio,e)-t.offsetY)*t.zoomY;return!n||o<0||o>n?null:u.jsx("div",{className:"absolute text-[9px] text-gray-500 font-mono",style:{top:Math.min(Math.max(0,n-12),Math.max(0,o)),left:2},children:r>=1e3?`${r/1e3}k`:r},r)}),t.autoFitY?null:u.jsxs("div",{className:"absolute left-1 bottom-1 max-w-11 leading-[9px] text-[8px] text-gray-500 font-mono",children:["Tuned Hz",u.jsx("br",{}),"A/B/C root-rel."]})]})}
function __f333NavigatorSampleEdgeHit(x,width,selected,zone=9){
 if(!selected||!Number.isFinite(x)||!Number.isFinite(width)||width<=0||typeof zone!=='number'||!Number.isFinite(zone)||zone<=0)return null;
 const left=selected.start*width,right=selected.end*width;
 const dl=Math.abs(x-left),dr=Math.abs(x-right);
 return dl<=zone||dr<=zone?(dl<=dr?'selection-left':'selection-right'):null;
}
function __f333NavigatorSampleResize(edge,opposite,pointer){
 const minWidth=.003;
 const fixed=Math.max(0,Math.min(1,Number.isFinite(opposite)?opposite:0));
 const p=Math.max(0,Math.min(1,Number.isFinite(pointer)?pointer:fixed));
 return edge==='selection-left'?{start:Math.max(0,Math.min(fixed-minWidth,p)),end:fixed}:
  {start:fixed,end:Math.min(1,Math.max(fixed+minWidth,p))};
}
function __f375ForgeSelectionMainPixel(fraction,geometry){
 if(!geometry||!Number.isFinite(fraction)||!Number.isFinite(geometry.width)||geometry.width<=0||
    !Number.isFinite(geometry.zoomX)||geometry.zoomX<=0||!Number.isFinite(geometry.offsetX)||
    !Number.isFinite(geometry.rectWidth)||geometry.rectWidth<=0)return null;
 const canvasWidth=Number.isFinite(geometry.canvasWidth)&&geometry.canvasWidth>0?geometry.canvasWidth:geometry.rectWidth;
 const pixel=(fraction*geometry.width-geometry.offsetX)*geometry.zoomX*geometry.rectWidth/canvasWidth;
 return pixel>=0&&pixel<=geometry.rectWidth?pixel:null;
}
function __f375ForgeMainSelectionHandles({mainCanvasRef,spectralWidth,viewPort}){
 const snapshot=P.useSyncExternalStore(__ForgeNavigatorSample.subscribe,__ForgeNavigatorSample.snapshot,__ForgeNavigatorSample.snapshot);
 const selected=__ForgeNavigatorSample.current(),dragCleanup=P.useRef(null);
 P.useEffect(()=>()=>{dragCleanup.current?.();dragCleanup.current=null},[]);
 if(!selected||!Number.isFinite(spectralWidth)||spectralWidth<=0)return null;
 const canvas=mainCanvasRef.current,rect=canvas?.getBoundingClientRect?.();
 if(!canvas||!rect||rect.width<=0)return null;
 const geom={width:spectralWidth,zoomX:viewPort.zoomX,offsetX:viewPort.offsetX,rectWidth:rect.width,canvasWidth:canvas.width};
 const start=__f375ForgeSelectionMainPixel(selected.start,geom),end=__f375ForgeSelectionMainPixel(selected.end,geom);
 const makeHandle=(edge,position)=>{
  if(position===null)return null;
  const beginDrag=event=>{
   if(event.button!==0)return;
   event.preventDefault();event.stopPropagation();
   dragCleanup.current?.();
   const initial=__ForgeNavigatorSample.current();if(!initial)return;
   const fixed=edge==='selection-left'?initial.end:initial.start;
   const onMove=pointer=>{
    const c=mainCanvasRef.current,box=c?.getBoundingClientRect?.();if(!c||!box||box.width<=0)return;
    const x=Math.max(0,Math.min(box.width,pointer.clientX-box.left));
    const dataX=viewPort.offsetX+x*c.width/box.width/Math.max(.00001,viewPort.zoomX);
    const fraction=Math.max(0,Math.min(1,dataX/spectralWidth));
    const span=__f333NavigatorSampleResize(edge,fixed,fraction);
    __ForgeNavigatorSample.select(span.start,span.end);
   };
   const done=()=>{dragCleanup.current?.();dragCleanup.current=null};
   const onBlur=()=>done();
   const cleanup=()=>{window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',done);window.removeEventListener('blur',onBlur)};
   dragCleanup.current=cleanup;
   window.addEventListener('mousemove',onMove);window.addEventListener('mouseup',done);window.addEventListener('blur',onBlur);
  };
  return u.jsxs('div',{
   ...(edge==='selection-left'?{'data-forge-main-sample-start':true}:{'data-forge-main-sample-end':true}),
   'aria-label':edge==='selection-left'?'Trim sample start':'Trim sample end',
   title:edge==='selection-left'?'Drag violet triangle to trim sample start':'Drag violet triangle to trim sample end',
   style:{position:'absolute',top:0,bottom:0,left:position+'px',width:'14px',transform:'translateX(-50%)',cursor:'ew-resize',zIndex:30,touchAction:'none'},onMouseDown:beginDrag,
   children:[
    u.jsx('span',{style:{pointerEvents:'none',position:'absolute',left:'50%',top:0,bottom:0,width:'1px',transform:'translateX(-50%)',background:'rgba(192,132,252,.9)'}}),
    u.jsx('span',{style:{pointerEvents:'none',position:'absolute',left:'50%',top:0,transform:'translateX(-50%)',width:0,height:0,borderLeft:'5px solid transparent',borderRight:'5px solid transparent',borderTop:'8px solid #d8a0f5'}})
   ]
  });
 };
 return u.jsxs(P.Fragment,{children:[makeHandle('selection-left',start),makeHandle('selection-right',end)]});
}
function G5e({overviewWrapRef:e,overviewCanvasRef:t,viewPort:n,onNavigatorMouseDown:r}){
 const state=P.useSyncExternalStore(__ForgeNavigatorSample.subscribe,__ForgeNavigatorSample.snapshot,__ForgeNavigatorSample.snapshot);
 const selected=__ForgeNavigatorSample.current();
 return u.jsxs("div",{className:"z-10 border-t border-gray-800 bg-gray-950 px-3 py-2 shadow-[0_-10px_24px_rgba(0,0,0,0.45)]",children:[u.jsxs("div",{className:"flex items-center gap-3 text-[10px] text-gray-500 mb-1.5",children:[u.jsx("span",{className:"text-cyan-300 font-semibold",children:"Navigator"}),u.jsx("button",{type:"button",onClick:()=>pe.getState().setViewPort({autoFitX:true,spanX:1,startX:0,offsetX:0}),className:"rounded border border-cyan-900 px-2 py-0.5 text-cyan-200","data-forge-fit-drawing":true,children:"Whole Drawing"}),u.jsx("span",{children:"Click = playback position · Drag = select sample · Alt+Drag = move"}),u.jsx("span",{title:"Violet selection edges trim the sample, also via the matching triangles and lines above the magnified painting. Cyan viewport edges zoom the drawing.",children:"Violet trim · Cyan zoom"}),selected&&u.jsx("button",{type:"button",onClick:__ForgeNavigatorSample.clear,className:"rounded border border-violet-800 px-1 text-violet-200",title:"Clear sample selection",children:"✕"}),u.jsxs("span",{className:"ml-auto font-mono text-gray-400",children:["X ",n.zoomX.toFixed(1),"x"]})]}),u.jsxs("div",{ref:e,className:"relative h-14 min-w-0 rounded-md overflow-hidden border border-gray-800 bg-black cursor-crosshair","data-forge-navigator":"full-drawing",style:{width:"100%"},onMouseDown:r,onMouseMove:event=>{
 const box=event.currentTarget.getBoundingClientRect(),geometry=t.current?.__navigatorViewport;
 const pointer=Math.max(0,Math.min(box.width,event.clientX-box.left));
 const sampleEdge=!event.altKey?__f333NavigatorSampleEdgeHit(pointer,box.width,__ForgeNavigatorSample.current()):null;
 const mode=geometry?Z5e(pointer,geometry):'move';
 event.currentTarget.style.cursor=sampleEdge?'ew-resize':mode==='move'?(event.altKey?'grab':'crosshair'):'ew-resize';
 },children:[u.jsx("canvas",{ref:t,className:"block w-full h-full",style:{imageRendering:"pixelated",width:"100%",height:"100%"}}),selected&&u.jsx("div",{"data-forge-navigator-sample-selection":true,"aria-label":"One-shot sample selection",className:"pointer-events-none absolute inset-y-0 rounded border-x-2 border-violet-200 bg-violet-400/30",style:{left:selected.start*100+"%",width:(selected.end-selected.start)*100+"%",background:"rgba(167,139,250,0.32)",borderLeft:"2px solid rgba(221,214,254,0.96)",borderRight:"2px solid rgba(221,214,254,0.96)"},children:state.previewing&&Number.isFinite(state.previewDurationSec)&&state.previewDurationSec>0?u.jsx("span",{"data-forge-navigator-region-playhead":true,"aria-hidden":true,className:"forge-navigator-region-sweep",style:{"--forge-region-preview-duration":state.previewDurationSec+"s"},children:u.jsx("span",{className:"forge-navigator-region-playhead"})}):null})]})]})}
function ZO(e){return Number.isFinite(e)?Math.max(H5e,Math.min(V5e,e)):1}
function X5e(e){const t=e.deltaMode===1?e.deltaY*16:e.deltaMode===2?e.deltaY*160:e.deltaY;return Number.isFinite(t)?Math.max(-YO,Math.min(YO,t)):0}
function e_(e){const t=Math.max(1,e.spectralWidth),n=Math.max(1,Math.min(t,e.mainCanvasWidth/e.zoomX)),r=e.offsetX/t*e.containerWidth,a=Math.max(e.minWidthPx??10,n/t*e.containerWidth);return{visibleWidth:n,leftPx:r,widthPx:a,rightPx:r+a}}
function Y5e(e,t,n){return Math.max(0,Math.min(e-t,n))}
function J5e(e){const t=Math.max(1,Math.min(e.spectralWidth,e.mainCanvasWidth/e.zoomX)),n=Math.max(16,e.spectralWidth*.015),r=e.offsetX,a=r+t,o=e.pointerX/e.containerWidth*e.spectralWidth;if(e.mode==="resize-left"){const l=Math.max(0,Math.min(o,a-n)),c=Math.max(n,a-l),d=Math.max(.1,Math.min(20,e.mainCanvasWidth/c));return{offsetX:l,zoomX:d}}if(e.mode==="resize-right"){const l=Math.max(r+n,Math.min(e.spectralWidth,o)),c=Math.max(n,l-r);return{zoomX:Math.max(.1,Math.min(20,e.mainCanvasWidth/c))}}const i=o-t*.5,s=Math.max(0,e.spectralWidth-t);return{offsetX:Math.max(0,Math.min(s,i))}}
function Z5e(e,t,n=U5e){return Math.abs(e-t.leftPx)<=n?"resize-left":Math.abs(e-t.rightPx)<=n?"resize-right":"move"}
function e4e({mainCanvasRef:e,colorLUTRef:t,spectralData:n,viewPort:r,setViewPort:a,renderVersion:o,showGrainLayer:i,synthMode:s,playheadPosition:l,isPlaying:c,showPlayheadMarker:d}){const p=P.useRef(null),f=P.useRef(null),b=P.useRef(null),g=P.useCallback(()=>{const A=f.current;if(!A)return;const M=A.getContext("2d");if(!M)return;const box=A.parentElement.getBoundingClientRect(),v=Math.max(1,Math.round(box.width)),w=Math.max(1,Math.round(box.height));if(A.width!==v)A.width=v;if(A.height!==w)A.height=w;M.clearRect(0,0,v,w);const R=t.current,k=i||s==="granular",I=n.width/v,E=n.height/w,cache=A.__fullOverview;let F;if(cache&&cache.grid===n&&cache.version===o&&cache.lut===R&&cache.grains===k&&cache.width===v&&cache.height===w)F=cache.pixels;else{F=M.createImageData(v,w);const L=F.data;for(let G=0;G<w;G++){const j=Math.floor(G*E),N=Math.min(n.height,Math.ceil((G+1)*E));for(let W=0;W<v;W++){const V=Math.floor(W*I),U=Math.min(n.width,Math.ceil((W+1)*I));let H=0,q=0;for(let J=j;J<N;J++)for(let Z=V;Z<U;Z++){const te=n.get(Z,J);te>H&&(H=te,q=n.getGrain(Z,J))}const K=Math.round(Math.max(0,Math.min(1,H))*255)*3,Y=(G*v+W)*4;if(k&&H>.01){const[J,Z,te]=kB(q),X=.36;L[Y]=Math.round(R[K]*(1-X)+J*X),L[Y+1]=Math.round(R[K+1]*(1-X)+Z*X),L[Y+2]=Math.round(R[K+2]*(1-X)+te*X)}else L[Y]=R[K],L[Y+1]=R[K+1],L[Y+2]=R[K+2];L[Y+3]=255}}A.__fullOverview={grid:n,version:o,lut:R,grains:k,width:v,height:w,pixels:F};}M.putImageData(F,0,0);const __liveViewport=pe.getState().viewPort,B=e_({spectralWidth:n.width,mainCanvasWidth:e.current?.width??n.width,containerWidth:v,offsetX:__liveViewport.offsetX,zoomX:__liveViewport.zoomX}),{widthPx:O}=B,T=Y5e(v,O,B.leftPx);A.__navigatorViewport=B;M.fillStyle="rgba(0, 0, 0, 0.28)",M.fillRect(0,0,T,w),M.fillRect(T+O,0,v-(T+O),w);const _=M.createLinearGradient(T,0,T+O,0);if(_.addColorStop(0,"rgba(34, 211, 238, 0.18)"),_.addColorStop(.5,"rgba(34, 211, 238, 0.08)"),_.addColorStop(1,"rgba(34, 211, 238, 0.18)"),M.fillStyle=_,M.fillRect(T,0,O,w),M.strokeStyle="rgba(103, 232, 249, 0.95)",M.lineWidth=2,M.strokeRect(T+.5,.5,Math.max(1,O-1),w-1),M.fillStyle="rgba(103, 232, 249, 0.95)",M.fillRect(T-1,2,4,w-4),M.fillRect(T+O-3,2,4,w-4),c||d){const G=l*v;M.strokeStyle="rgba(0,255,136,0.95)",M.lineWidth=1.5,M.beginPath(),M.moveTo(G,0),M.lineTo(G,w),M.stroke()}},[t,c,e,l,i,d,n,s,r,o]),y=P.useCallback((A,M)=>{const v=p.current,w=e.current;if(!v||!w)return;const R=v.getBoundingClientRect(),k=Math.max(0,Math.min(R.width,A-R.left));a(J5e({mode:M,pointerX:k,containerWidth:R.width,spectralWidth:n.width,mainCanvasWidth:w.width,offsetX:r.offsetX,zoomX:r.zoomX}))},[e,a,n.width,r.offsetX,r.zoomX]);P.useEffect(()=>{g()},[g,o]);/*navigator-bitmap-fit*/P.useEffect(()=>{const wrap=p.current,bitmap=f.current;if(!wrap||!bitmap||typeof ResizeObserver==="undefined")return;let frame=0;const sync=()=>{const box=wrap.getBoundingClientRect(),width=Math.max(1,Math.round(box.width)),height=Math.max(1,Math.round(box.height));if(!box.width||!box.height)return;if(bitmap.width!==width)bitmap.width=width;if(bitmap.height!==height)bitmap.height=height;g()};const queue=()=>{if(frame)cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{frame=0;sync()})};const observer=new ResizeObserver(queue);observer.observe(wrap);queue();return()=>{observer.disconnect();frame&&cancelAnimationFrame(frame)}},[g]);const x=P.useCallback(A=>{if(A.button!==0)return;const M=p.current,v=e.current;if(!M||!v)return;const w=M.getBoundingClientRect(),R=Math.max(0,Math.min(w.width,A.clientX-w.left)),k=e_({spectralWidth:n.width,mainCanvasWidth:v.width,containerWidth:w.width,offsetX:r.offsetX,zoomX:r.zoomX}),{leftPx:I}=k,E=Z5e(R,k),selection=__ForgeNavigatorSample.current(),selectionResize=!A.altKey?__f333NavigatorSampleEdgeHit(R,w.width,selection):null;
 b.current={mode:E,selectionResize,fixedRatio:selectionResize?(selectionResize==='selection-left'?selection.end:selection.start):0,select:!A.altKey&&!selectionResize&&E==='move',startRatio:w.width?R/w.width:0,grabOffsetPx:R-I,startLeftPx:I,startRightPx:k.rightPx,rectWidth:w.width,pointerDownX:A.clientX,moved:!1}},[e,n.width,r.offsetX,r.zoomX]);return P.useEffect(()=>{const ratio=v=>{const R=p.current?.getBoundingClientRect();return R&&R.width?Math.max(0,Math.min(1,(v-R.left)/R.width)):0};const A=v=>{const w=b.current;if(!w)return;if(!w.moved&&Math.abs(v.clientX-w.pointerDownX)>3)w.moved=!0;if(!w.moved)return;if(w.selectionResize){const span=__f333NavigatorSampleResize(w.selectionResize,w.fixedRatio,ratio(v.clientX));__ForgeNavigatorSample.select(span.start,span.end)}else if(w.select)__ForgeNavigatorSample.select(w.startRatio,ratio(v.clientX));else y(v.clientX,w.mode)},M=v=>{const w=b.current;if(!w)return;if(!w.moved){if(!w.selectionResize){__ForgeNavigatorSample.clear();__f340SeekFromNavigator(ratio(v.clientX))}}else if(w.selectionResize){const span=__f333NavigatorSampleResize(w.selectionResize,w.fixedRatio,ratio(v.clientX));__ForgeNavigatorSample.select(span.start,span.end)}else if(w.select)__ForgeNavigatorSample.select(w.startRatio,ratio(v.clientX));b.current=null};const cancel=()=>{b.current=null};return window.addEventListener("mousemove",A),window.addEventListener("mouseup",M),window.addEventListener("blur",cancel),()=>{window.removeEventListener("mousemove",A),window.removeEventListener("mouseup",M),window.removeEventListener("blur",cancel)}},[y]),{overviewWrapRef:p,overviewCanvasRef:f,onNavigatorMouseDown:x}}
function t4e({mainCanvasRef:e,spectralWidth:t,viewPort:n,setViewPort:r,isPlaying:a,playheadPosition:o,renderVersion:i,renderMain:s,renderOverlay:l}){const __forgeVisible=P.useContext(__ForgeWorkspaceVisibility),c=P.useRef(null),d=P.useRef(()=>{});P.useEffect(()=>{if(!a)return;const p=e.current;if(!p)return;const f=Math.max(1,p.width/n.zoomX),b=Math.max(0,t-f),g=o*t,y=(g-n.offsetX)*n.zoomX,x=Math.max(36,p.width*.14);if(y<x||y>p.width-x){const A=g-f*.5,M=Math.max(0,Math.min(b,A));Math.abs(M-n.offsetX)>.5&&r({offsetX:M})}},[a,e,o,r,t,n.offsetX,n.zoomX]),P.useEffect(()=>{d.current=l},[l]),P.useEffect(()=>{if(!__forgeVisible)return;let p=!0;const f=()=>{p&&(d.current(),c.current=requestAnimationFrame(f))};return c.current=requestAnimationFrame(f),()=>{p=!1,c.current&&cancelAnimationFrame(c.current),c.current=null}},[__forgeVisible]),P.useEffect(()=>{if(__forgeVisible)s()},[s,i,__forgeVisible])}
function __forgeResizeViewportProjection(view,previous,size,spectralWidth,spectralHeight){
 if(!size||size.width<=0||size.height<=0)return view;let next={...view};
 if(Number.isFinite(view.spanX)||view.autoFitX){const span=view.autoFitX?1:Math.max(.005,Math.min(1,view.spanX||1)),start=Math.max(0,Math.min(1-span,view.startX||0));next={...next,zoomX:size.width/(spectralWidth*span),offsetX:start*spectralWidth,spanX:span,startX:start,autoFitX:span>=.999999}}
 else if(previous?.width>0)next.zoomX=Math.max(.001,view.zoomX*size.width/previous.width);
 else next={...next,zoomX:size.width/spectralWidth,offsetX:0,spanX:1,startX:0,autoFitX:true};
 if(view.autoFitY)next={...next,zoomY:size.height/spectralHeight,offsetY:0};
 else if(previous?.height>0&&previous.height!==size.height)next.zoomY=Math.max(.001,view.zoomY*size.height/previous.height);
 else if(!previous?.height&&Math.abs((view.zoomY||1)-1)<.001&&Math.abs(view.offsetY||0)<.001)next.zoomY=size.height/spectralHeight;
 return __forgeClampHorizontalViewport(next,size.width,spectralWidth);
}
function __forgeClampHorizontalViewport(view,canvasWidth,spectralWidth){
 const width=Math.max(1,canvasWidth),spectral=Math.max(1,spectralWidth),span=Number.isFinite(view.spanX)?Math.max(.005,Math.min(1,view.autoFitX?1:view.spanX)):null;
 const zoom=span?width/(spectral*span):Math.max(Number.isFinite(view.zoomX)&&view.zoomX>0?view.zoomX:1,width/spectral),offset=span?(view.startX||0)*spectral:view.offsetX||0;
 return {...view,zoomX:zoom,offsetX:Math.max(0,Math.min(offset,Math.max(0,spectral-width/zoom)))};
}
function n4e({containerRef,mainCanvasRef,overlayCanvasRef,spectralWidth,spectralHeight,setViewPort,renderMain,autoFitY=false,viewZoomY=1,viewPort}){
 const previous=P.useRef({width:0,height:0});
 const sync=P.useCallback(()=>{const area=containerRef.current,canvas=mainCanvasRef.current,overlay=overlayCanvasRef.current;if(!area||!canvas||!overlay)return;const box=area.getBoundingClientRect(),size={width:Math.floor(box.width),height:Math.floor(box.height)};if(size.width<1||size.height<1)return;
  const current=pe.getState().viewPort,next=__forgeResizeViewportProjection(current,previous.current,size,spectralWidth,spectralHeight);previous.current=size;
  for(const bitmap of [canvas,overlay]){if(bitmap.width!==size.width)bitmap.width=size.width;if(bitmap.height!==size.height)bitmap.height=size.height}
  if(['zoomX','zoomY','offsetX','offsetY','spanX','startX','autoFitX'].some(k=>typeof next[k]==='number'?Math.abs((current[k]??-1)-next[k])>.00001:next[k]!==current[k]))setViewPort(next);renderMain(next);
 },[containerRef,mainCanvasRef,overlayCanvasRef,spectralWidth,spectralHeight,setViewPort,renderMain]);
 P.useLayoutEffect(()=>{sync()},[sync,autoFitY,viewZoomY,viewPort?.spanX,viewPort?.startX,viewPort?.autoFitX]);
 P.useEffect(()=>{const area=containerRef.current;if(!area)return;const observer=new ResizeObserver(sync);observer.observe(area);return()=>observer.disconnect()},[containerRef,sync]);
}
function __f35616StampBoundary(clientX,clientY,canvas,toCell,width,height,farEdge){
 const rect=canvas?.getBoundingClientRect?.();
 if(!rect)return{x:0,y:0};
 const x=Math.max(rect.left,Math.min(rect.right,Number.isFinite(clientX)?clientX:rect.left));
 const y=Math.max(rect.top,Math.min(rect.bottom,Number.isFinite(clientY)?clientY:rect.top));
 const cell=toCell(x,y);
 const endX=farEdge?Math.max(0,width):Math.max(0,width-1);
 const endY=farEdge?Math.max(0,height):Math.max(0,height-1);
 return{x:Math.max(0,Math.min(endX,Math.floor(Number(cell.x)||0))),
         y:Math.max(0,Math.min(endY,Math.floor(Number(cell.y)||0)))};
}
function r4e({variant:e="legacy",forge3Lens:t="hear",showTraceLayer:n=!1}){P.useEffect(()=>{if(e!=="forge3")return;if(__forgeWorkspaceVisible)__F352Runtime.attach();return()=>__deactivateForgeWorkspace()},[e]);const r=P.useRef(null),a=P.useRef(null),o=P.useRef(null),i=P.useRef(!1),s=P.useRef(null),l=P.useRef(!1),c=P.useRef(null),d=P.useRef(null),p=P.useRef(!1),f=P.useRef(null),b=P.useRef(null),[g,y]=P.useState(null),[x,A]=P.useState(null),M=pe(be=>be.spectralData),v=pe(be=>be.viewPort),w=pe(be=>be.setViewPort),R=pe(be=>be.activeTool),k=pe(be=>be.toolSettings),I=qr(R,k),E=pe(be=>be.renderVersion),F=pe(be=>be.triggerRender),L=pe(be=>be.setAudioBufferDirty),B=pe(be=>be.pushUndo),O=pe(be=>be.colorMapName),T=pe(be=>be.playheadPosition),_=pe(be=>be.isPlaying),G=pe(be=>be.showPlayheadMarker),j=pe(be=>be.lineStart),N=pe(be=>be.setLineStart),W=pe(be=>be.waveformMix),V=pe(be=>be.showGrainLayer),U=pe(be=>be.synthMode),H=pe(be=>be.materialExport),q=pe(be=>be.carrierDonorV2.skeleton),K=pe(be=>be.carrierDonorV2.continuityGraph),Y=pe(be=>be.carrierDonorV2.bindingPreview),J=pe(be=>be.carrierDonorV2.overlayVisible),Z=pe(be=>be.carrierDonorV2.continuityOverlayVisible),te=pe(be=>be.carrierDonorV2.bindingOverlayVisible),X=pe(be=>be.carrierDonorV2.freshness),Q=pe(be=>be.sourceAsset),ne=pe(be=>be.forge3EditTarget),ee=ys(),ie=P.useMemo(()=>e!=="forge3"?null:__forgeDisplayVisibility(M,ee),[e,M,ee,Q,E]),de=ie?.active??null,oe=ie?.trace??null,ue=pe(be=>be.stampData),fe=pe(be=>be.stampScaleX),he=pe(be=>be.stampScaleY),re=pe(be=>be.stampRotation),le=pe(be=>be.stampFlipX),Ae=pe(be=>be.stampFlipY),ce=pe(be=>be.stampPhase),ge=pe(be=>be.setStampData),Ce=pe(be=>be.setStampScale),Re=pe(be=>be.setStampPhase),se=pe(be=>be.stampSelStart),xe=pe(be=>be.setStampSelStart),Be=pe(be=>be.setGuideMarker),Ie=P.useRef(bE(xO[O])); P.useEffect(()=>{Ie.current=bE(xO[O])},[O]),P.useEffect(()=>{e==="forge3"&&ee.ensureInitialized(M,pe.getState().sourceAssetContext==="forge3_main"?Q:null)},[e,M,Q,ee]);const Qe=e==="forge3"&&!!Q&&pe.getState().sourceAssetContext==="forge3_main"&&ne==="linked_body",Ne=P.useCallback((be,ve)=>{const Je=r.current;if(!Je)return{x:0,y:0};const Oe=Je.getBoundingClientRect(),Xe=be-Oe.left,it=ve-Oe.top,Ze=Math.floor(Xe/v.zoomX+v.offsetX),st=Math.floor(it/v.zoomY+v.offsetY);return{x:Ze,y:st}},[v]),Ue=P.useCallback(()=>{const be=Math.max(1,H.bars||1),ve=M.width/be,Je=(H.guideMarkers||[]).filter(Oe=>Number.isFinite(Oe));return{safeBars:be,barWidthData:ve,guideMarkers:Je}},[H.bars,H.guideMarkers,M.width]),Ye=P.useCallback((be,ve)=>{const Je=r.current;if(!Je)return null;const Oe=Je.getBoundingClientRect(),Xe=be-Oe.left,it=ve-Oe.top;if(it<0||it>18)return null;const{safeBars:Ze,barWidthData:st,guideMarkers:ht}=Ue();if(ht.length===0)return null;let ft=null;for(let Ot=0;Ot<Ze;Ot++){const un=Ot*st;for(let Xt=0;Xt<ht.length;Xt++){const fn=(un+ht[Xt]*st-v.offsetX)*v.zoomX,Ut=Math.abs(fn-Xe);Ut>10||(!ft||Ut<ft.distance)&&(ft={markerIndex:Xt,barIndex:Ot,distance:Ut})}}return ft},[Ue,v.offsetX,v.zoomX]),Ve=P.useCallback(be=>{const ve=r.current;ve&&D5e({canvas:ve,spectralData:M,renderVersion:pe.getState().renderVersion,viewPort:be??v,colorLut:Ie.current,showGrain:V||U==="granular",variant:e,forge3Lens:t,forge3Field:ee,activeVisibilityMask:de,traceVisibilityMask:oe,showTraceLayer:n})},[M,v,V,U,e,t,ee,de,oe,n]),tt=P.useMemo(()=>{const be=new Map;if(!q)return be;for(const ve of q.anchorsByTime)for(const Je of ve)be.set(Je.id,Je);return be},[q]),dt=P.useMemo(()=>{const be=new Map;for(const ve of Y)be.set(ve.carrierAnchorId,ve);return be},[Y]),gt=P.useMemo(()=>J?X.skeletonMeta.status==="dirty"?"Carrier overlay still shows the previous analysis — updating.":te&&X.bindingMeta.status==="dirty"?"Assignment rings still show the previous mapping — updating.":Z&&X.continuityMeta.status==="dirty"?"Continuity lines still show the previous carrier reading — updating.":"":"",[J,te,Z,X]);function Ge(be,ve){const Je=pe.getState().viewPort;return{x:Math.floor(be/Je.zoomX+Je.offsetX),y:Math.floor(ve/Je.zoomY+Je.offsetY)}}const Te=P.useCallback(()=>{N5e({canvas:a.current,viewPort:v,spectralData:M,activeTool:R,lineStart:j,toolSettings:I,stampPhase:ce,stampSelStart:se,stampSelEnd:f.current,stampData:ue,stampScaleX:fe,stampScaleY:he,stampRotation:re,stampFlipX:le,stampFlipY:Ae,mousePos:d.current,guideDragMarkerIndex:b.current?.markerIndex??null,guideLayout:Ue(),colorLut:Ie.current,showGrainLayer:V,synthMode:U,showPlayheadMarker:G,isPlaying:_,playheadPosition:T,showCarrierDonorV2Overlay:J,showCarrierDonorV2ContinuityOverlay:Z,showCarrierDonorV2BindingOverlay:te,carrierDonorV2Skeleton:q,carrierDonorV2ContinuityGraph:K,carrierAnchorMap:tt,carrierBindingMap:dt,v2OverlayWarning:gt,screenToDataFromScreen:Ge})},[v,M,R,j,I,ce,se,ue,fe,he,re,le,Ae,V,U,Ue,G,_,T,J,Z,te,q,K,tt,dt,gt]);t4e({mainCanvasRef:r,spectralWidth:M.width,viewPort:v,setViewPort:w,isPlaying:_,playheadPosition:T,renderVersion:E,renderMain:Ve,renderOverlay:Te});const{overviewWrapRef:rt,overviewCanvasRef:lt,onNavigatorMouseDown:ut}=e4e({mainCanvasRef:r,colorLUTRef:Ie,spectralData:M,viewPort:v,setViewPort:w,renderVersion:E,showGrainLayer:V,synthMode:U,playheadPosition:T,isPlaying:_,showPlayheadMarker:G});n4e({containerRef:o,mainCanvasRef:r,overlayCanvasRef:a,spectralWidth:M.width,spectralHeight:M.height,setViewPort:w,renderMain:Ve,autoFitY:!!v.autoFitY,viewZoomY:v.zoomY,viewPort:v});P.useEffect(()=>{const canvas=r.current;if(!canvas||canvas.width<2)return;const current=pe.getState().viewPort,next=__forgeClampHorizontalViewport(current,canvas.width,M.width);if(Math.abs(next.zoomX-current.zoomX)>.0001||Math.abs(next.offsetX-current.offsetX)>.0001)w({zoomX:next.zoomX,offsetX:next.offsetX})},[M.width,v.zoomX,v.offsetX,v.spanX,v.startX,v.autoFitX,w]);const at=P.useCallback((be,ve,Je,Oe="reseed")=>{e==="forge3"&&ee.syncRegionFromSpectralData(M,be,ve,Je,Oe)},[e,ee,M]),qe=P.useCallback(be=>{I5e({spectralData:M,activeTool:R,defaultBrushSize:I.brushSize??1,dirty:be,ports:{invalidateAudioBuffer:()=>xt.invalidateBuffer(),setAudioBufferDirty:L,triggerRender:F}})},[R,I.brushSize,M,L,F]),mt=P.useCallback((be,ve)=>{F5e({activeTool:R,spectralData:M,settings:I,forge3Mode:e==="forge3",bodyLinkedMode:Qe,sourceAsset:Q,forge3Field:ee,syncForge3Region:at,x:be,y:ve}),qe({x:be,y:ve,radius:I.brushSize,reason:`spectral-forge-${R}-paint`})},[R,Qe,ee,Q,I,M,at,qe,e]),It=P.useCallback(be=>{if(be.button===0){const Je=Ye(be.clientX,be.clientY);if(Je){b.current={markerIndex:Je.markerIndex,barIndex:Je.barIndex};return}}if(be.button===1||be.button===0&&be.altKey){l.current=!0,c.current={x:be.clientX,y:be.clientY,ox:v.offsetX,oy:v.offsetY};return}if(be.button!==0)return;const ve=Ne(be.clientX,be.clientY);if(R==="stamp"){if(ce==="idle"||ce==="selecting"){const stampStart=__f35616StampBoundary(be.clientX,be.clientY,r.current,Ne,M.width,M.height,!1);xe(stampStart),Re("selecting"),p.current=!0,f.current=stampStart;return}if(ce==="stamping"&&ue){B(),M.pasteStamp(ve.x,ve.y,ue,I.intensity,I.eraseMode,{scaleX:fe,scaleY:he,rotation:re,flipX:le,flipY:Ae}),Qe?(ee.pasteCapturedStampMetadata(M,ue,ve.x,ve.y,I.intensity,I.eraseMode,{scaleX:fe,scaleY:he,rotation:re,flipX:le,flipY:Ae}),at(ve.x,ve.y,Math.max(ue.width,ue.height)*.6,"preserve")):at(ve.x,ve.y,Math.max(ue.width,ue.height)*.6),qe({x:ve.x,y:ve.y,radius:Math.max(ue.width,ue.height)*Math.max(fe,he,1)*.6,reason:"spectral-forge-stamp-paste"});return}return}if(R==="line"){if(!j)N(ve);else{B();const{brushSize:Je,intensity:Oe,hardness:Xe,eraseMode:it,grainSize:Ze}=I;M.drawLine(j.x,j.y,ve.x,ve.y,Je,Oe,Xe,"brush",it,.3,Ze),e==="forge3"&&at(ve.x,ve.y,Je),qe({x0:Math.min(j.x,ve.x)-Je,x1:Math.max(j.x,ve.x)+Je,y0:Math.min(j.y,ve.y)-Je,y1:Math.max(j.y,ve.y)+Je,reason:"spectral-forge-line-edit"}),N(null)}return}if(R==="morph"){i.current=!0,s.current=ve,B(),I.morphMode!=="push"&&(e==="forge3"&&Q?(ee.applyMorph(M,ve.x,ve.y,I.brushSize,I.intensity,I.morphMode,0,0),at(ve.x,ve.y,I.brushSize,"preserve")):(M.applyMorph(ve.x,ve.y,I.brushSize,I.intensity,I.morphMode,0,0),e==="forge3"&&at(ve.x,ve.y,I.brushSize)),qe({x:ve.x,y:ve.y,radius:I.brushSize,reason:"spectral-forge-morph-edit"}));return}if(R==="smudge"){i.current=!0,s.current=ve,B(),M.applySmudge(ve.x,ve.y,I.brushSize,I.intensity*.6,0,0,I.grainSize),e==="forge3"&&at(ve.x,ve.y,I.brushSize),qe({x:ve.x,y:ve.y,radius:I.brushSize,reason:"spectral-forge-smudge-edit"});return}i.current=!0,s.current=ve,B(),mt(ve.x,ve.y)},[Ne,R,Qe,j,N,B,mt,I,M,qe,v,ce,ue,fe,he,re,le,Ae,xe,Re,ge,Ye,ee,at,e]),Ct=P.useCallback(be=>{const ve=r.current;if(!ve)return;const Je=ve.getBoundingClientRect();d.current={sx:be.clientX-Je.left,sy:be.clientY-Je.top};const Oe=Ne(be.clientX,be.clientY),Xe=hs(Oe.y,M.height)*__f3565PitchRatio(),it=Oe.x/M.width*Ar;if(e==="forge3")__XenForgePitchHeaderState.update(Xe,M.height);
else{y({freq:Math.round(Xe*10)/10,time:Math.round(it*1e3)/1e3,note:NFe(Xe)});x&&A(null)};if(b.current){const{barWidthData:st,guideMarkers:ht}=Ue(),ft=b.current,Ot=ft.barIndex*st,un=(Oe.x-Ot)/Math.max(1,st),Xt=ft.markerIndex===0?0:ht[ft.markerIndex-1]??0,hn=ft.markerIndex===ht.length-1?1:ht[ft.markerIndex+1]??1,fn=1/(Math.max(1,H.guideSegments)*8),Ut=Math.max(Xt+fn,Math.min(hn-fn,un));Be(ft.markerIndex,Ut);return}if(p.current&&R==="stamp"){f.current=__f35616StampBoundary(be.clientX,be.clientY,r.current,Ne,M.width,M.height,!0);return}if(l.current&&c.current){const st=(be.clientX-c.current.x)/v.zoomX,ht=(be.clientY-c.current.y)/v.zoomY;w({offsetX:Math.max(0,c.current.ox-st),offsetY:Math.max(0,c.current.oy-ht),autoFitY:false});return}if(!i.current)return;const Ze=s.current;if(Ze){const{brushSize:st,intensity:ht,hardness:ft,eraseMode:Ot,sprayDensity:un,grainSize:Xt}=I,hn=Oe.x-Ze.x,fn=Oe.y-Ze.y,Ut=Math.max(Math.abs(hn),Math.abs(fn),1),He=Math.max(1,Math.floor(Math.max(1,st)*.35));if(R==="morph"){const _e=Oe.x-Ze.x,ot=Oe.y-Ze.y;Qe?ee.applyMorph(M,Oe.x,Oe.y,st,ht,I.morphMode,_e,ot):(M.applyMorph(Oe.x,Oe.y,st,ht,I.morphMode,_e,ot),e==="forge3"&&at(Oe.x,Oe.y,st))}else if(R==="smudge"){const _e=Oe.x-Ze.x,ot=Oe.y-Ze.y;M.applySmudge(Oe.x,Oe.y,st,ht,_e,ot,Xt)}else if(R==="dodgeBurn")for(let _e=0;_e<=Ut;_e+=He){const ot=_e/Ut,kt=Math.round(Ze.x+hn*ot),Ke=Math.round(Ze.y+fn*ot);M.applyDodgeBurn(kt,Ke,st,ht,ft,Ot,Xt)}else if(R==="blurSharpen")for(let _e=0;_e<=Ut;_e+=He){const ot=_e/Ut,kt=Math.round(Ze.x+hn*ot),Ke=Math.round(Ze.y+fn*ot);M.applyBlurSharpen(kt,Ke,st,ht,ft,Ot)}else if(R==="delaySmear")for(let _e=0;_e<=Ut;_e+=He){const ot=_e/Ut,kt=Math.round(Ze.x+hn*ot),Ke=Math.round(Ze.y+fn*ot);M.applyDelaySmear(kt,Ke,st,ht,ft,Ot,Xt)}else if(R==="threshold")for(let _e=0;_e<=Ut;_e+=He){const ot=_e/Ut,kt=Math.round(Ze.x+hn*ot),Ke=Math.round(Ze.y+fn*ot);M.applyThresholdBrush(kt,Ke,st,ht,ft,Ot,Xt)}else if(R==="sourceTrace"){const _e=Q?.analysisCache;if(_e){for(let ot=0;ot<=Ut;ot+=He){const kt=ot/Ut,Ke=Math.round(Ze.x+hn*kt),Mt=Math.round(Ze.y+fn*kt);M.applySourceTrace(Ke,Mt,st,ht,ft,_e.data,_e.width,_e.height,_e.transientEnvelope,Ot,Xt),Qe&&Q&&ee.applySourceTraceMetadata(M,Q,Ke,Mt,st,ht,ft,Ot)}at(Oe.x,Oe.y,st)}}else if(R==="harmonicBrush")for(let _e=0;_e<=Ut;_e+=He){const ot=_e/Ut,kt=Math.round(Ze.x+hn*ot),Ke=Math.round(Ze.y+fn*ot);M.applyHarmonicBrush(kt,Ke,st,ht*.5,ft,I.numHarmonics,I.harmonicDecay,M.height,Ot,Xt)}else if(R==="formant")for(let _e=0;_e<=Ut;_e+=He){const ot=_e/Ut,kt=Math.round(Ze.x+hn*ot),Ke=Math.round(Ze.y+fn*ot);M.applyFormantStamp(kt,Ke,I.formantVowel,ht,M.height,st,Ot,Xt)}else if(R==="noiseBrush")for(let _e=0;_e<=Ut;_e+=He){const ot=_e/Ut,kt=Math.round(Ze.x+hn*ot),Ke=Math.round(Ze.y+fn*ot);M.applyNoiseBrush(kt,Ke,st,ht,Ot,Xt)}else if(R==="hardBrush")if(Qe)for(let _e=0;_e<=Ut;_e+=He){const ot=_e/Ut,kt=Math.round(Ze.x+hn*ot),Ke=Math.round(Ze.y+fn*ot);ee.applySteinmetz(M,kt,Ke,st,ht,Ot,Xt)}else M.drawLine(Ze.x,Ze.y,Oe.x,Oe.y,st,ht,1,"brush",Ot,un,Xt);else R==="spray"?M.drawLine(Ze.x,Ze.y,Oe.x,Oe.y,st,ht,ft,"spray",Ot,un,Xt):M.drawLine(Ze.x,Ze.y,Oe.x,Oe.y,st,ht,ft,"brush",Ot,un,Xt);if(e==="forge3"){const _e=R==="morph"&&Qe||R==="sourceTrace"&&Qe||R==="hardBrush"&&Qe?"preserve":"reseed";at(Oe.x,Oe.y,st,_e)}qe({x0:Math.min(Ze.x,Oe.x)-st,x1:Math.max(Ze.x,Oe.x)+st,y0:Math.min(Ze.y,Oe.y)-st,y1:Math.max(Ze.y,Oe.y)+st,reason:`spectral-forge-${R}-drag`})}s.current=Oe},[Ne,v,w,R,Qe,Q,I,M,qe,Ue,H.guideSegments,Be,ee,at,e,x,t]),St=P.useCallback(be=>{if(p.current&&R==="stamp"&&se){p.current=!1;const ve=__f35616StampBoundary(be.clientX,be.clientY,r.current,Ne,M.width,M.height,!0),Je=Math.min(se.x,ve.x),Oe=Math.min(se.y,ve.y),Xe=Math.abs(ve.x-se.x),it=Math.abs(ve.y-se.y);if(Xe>1&&it>1){Qe&&ee.captureStampMeta(Je,Oe,Xe,it);const Ze=I.eraseMode?(()=>{B();const st=M.cutRegion(Je,Oe,Xe,it);return Qe&&ee.excavateCapturedRegion(Je,Oe,Xe,it),qe({x0:Je,x1:Je+Xe,y0:Oe,y1:Oe+it,reason:"spectral-forge-stamp-cut"}),st})():M.copyRegion(Je,Oe,Xe,it);ge(Ze),Ce(1,1),Re("stamping"),I.eraseMode&&pe.getState().activeTool==="stamp"&&pe.getState().toolSettings.eraseMode&&pe.getState().updateToolSettings({eraseMode:!1})}else Re("idle");xe(null),f.current=null}b.current=null,i.current=!1,s.current=null,l.current=!1,c.current=null},[R,se,M,I.eraseMode,B,qe,ge,Ce,Re,xe,Ne,ee,e]),At=P.useCallback(be=>{if(e==="forge3")__XenForgePitchHeaderState.clear();if(p.current&&R==="stamp"){f.current=__f35616StampBoundary(be.clientX,be.clientY,r.current,Ne,M.width,M.height,!0);return}d.current=null,b.current=null,i.current=!1,s.current=null,l.current=!1,c.current=null,p.current&&(p.current=!1,f.current=null,pe.getState().setStampSelStart(null),pe.getState().setStampPhase("idle"))},[R,Ne,M.width,M.height]);P.useEffect(()=>()=>{if(e==="forge3")__XenForgePitchHeaderState.clear()},[e]);P.useEffect(()=>{const track=event=>{if(!p.current||pe.getState().activeTool!=="stamp")return;const canvas=r.current;if(!canvas)return;const box=canvas.getBoundingClientRect();if(event.clientX<box.left||event.clientX>=box.right||event.clientY<box.top||event.clientY>=box.bottom)Ct(event)},finish=event=>{if(p.current&&pe.getState().activeTool==="stamp")St(event)};window.addEventListener("mousemove",track);window.addEventListener("mouseup",finish);return()=>{window.removeEventListener("mousemove",track);window.removeEventListener("mouseup",finish)}},[Ct,St]);P.useEffect(()=>{const be=o.current;if(!be)return;let ve=0,Je=null;const Oe=()=>{Je=null;const it=Math.max(-JO,Math.min(JO,ve));if(ve=0,Math.abs(it)<.01)return;const Ze=pe.getState();if(Ze.activeTool!=="stamp"||Ze.stampPhase!=="stamping")return;const st=Math.exp(-it*W5e);Ze.setStampScale(ZO(Ze.stampScaleX*st),ZO(Ze.stampScaleY*st))},Xe=it=>{it.preventDefault(),it.stopPropagation();const Ze=pe.getState();if(Ze.activeTool==="stamp"&&Ze.stampPhase==="stamping"){ve+=X5e(it),Je===null&&(Je=window.requestAnimationFrame(Oe));return}};return be.addEventListener("wheel",Xe,{passive:!1,capture:!0}),()=>{be.removeEventListener("wheel",Xe,!0),Je!==null&&window.cancelAnimationFrame(Je)}},[]);const Et=P.useCallback(be=>{const ve=Ne(be.clientX,be.clientY);pe.getState().setShowPlayheadMarker(!1),xt.previewColumn(M,ve.x,W,300)},[Ne,M,W]),Se=P.useCallback(be=>{be.preventDefault(),R==="stamp"&&(Re("idle"),ge(null),xe(null),f.current=null,p.current=!1),R==="line"&&j&&N(null)},[R,Re,ge,xe,j,N]);return u.jsxs("div",{className:e==="forge3"?"xen-fp9-carrier-grid grid flex-1 min-h-0 bg-black":"grid flex-1 min-h-0 grid-rows-[minmax(0,1fr)_auto] bg-black",children:[u.jsxs("div",{className:"relative min-h-[300px] overflow-hidden",ref:o,style:{touchAction:"none",overscrollBehavior:"contain"},children:[u.jsx("canvas",{ref:r,"data-forge-carrier-canvas":e==="forge3"?"true":undefined,className:"absolute inset-0",style:{imageRendering:"auto"}}),e==="forge3"&&u.jsx(ForgePCMSpectrumView,{frame:{canvasRef:r,spectralData:M,renderVersion:E,viewPort:v,colorLut:Ie.current,showGrain:V||U==="granular",variant:e,forge3Lens:t,forge3Field:ee,activeVisibilityMask:de,traceVisibilityMask:oe,showTraceLayer:n}}),u.jsx("canvas",{ref:a,className:"absolute inset-0 pointer-events-none"}),u.jsx("div",{className:"absolute inset-0",style:{cursor:"none",touchAction:"none"},onMouseDown:It,onMouseMove:Ct,onMouseUp:St,onMouseLeave:At,onDoubleClick:Et,onContextMenu:Se}),u.jsx(__f375ForgeMainSelectionHandles,{mainCanvasRef:r,spectralWidth:M.width,viewPort:v}),e!=="forge3"&&u.jsx(O5e,{hoverInfo:g,forge3Hover:x,eraseMode:I.eraseMode}),e!=="forge3"&&u.jsx(_5e,{isPlaying:_,playheadPosition:T,variant:e,forge3Lens:t}),u.jsx(z5e,{activeTool:R,stampPhase:ce,stampScaleX:fe,stampScaleY:he}),u.jsx(j5e,{spectralHeight:M.height,viewPort:v,canvasHeight:r.current?.height})]}),e==="forge3"&&u.jsx(__ForgeBottomStatus,{}),u.jsx(G5e,{overviewWrapRef:rt,overviewCanvasRef:lt,viewPort:v,onNavigatorMouseDown:ut})]})}
function o4e(e){return`${e.label} (${e.shortcut})`}
function i4e(e,t,n){return["w-9 h-9 flex items-center justify-center rounded text-lg","transition-all duration-100",e===t?(n&&__XenForgeEraseTools.has(t)?"bg-red-600 shadow-lg shadow-red-500/30 scale-105 text-white":"bg-purple-600 shadow-lg shadow-purple-500/30 scale-105"):"bg-gray-800 hover:bg-gray-700"].join(" ")}
function s4e(e){return`Eraser Mode (X) ${e?"ON":"OFF"}`}
function l4e(e){return e?"⊖":"⊕"}
function c4e(e){return["w-9 h-9 flex items-center justify-center rounded text-sm font-bold","transition-all duration-100",e?"bg-red-600 shadow-lg shadow-red-500/40 text-white animate-pulse":"bg-gray-800 hover:bg-gray-700 text-gray-400"].join(" ")}
function qU(e){return Array.from(new Set(e.map(t=>t.category)))}
function u4e(e,t){return qU(e).filter(n=>t==="all"||t===n)}
function d4e(e,t){return e.filter(n=>n.category===t)}
function t_(e,t){return t===e?"bg-cyan-700 text-white":e==="legacy"?"bg-amber-950/40 text-amber-300 hover:bg-amber-900/30":"bg-gray-800 text-gray-400 hover:bg-gray-700"}
function m4e(e){return e==="legacy"?"legacy bank":`core · ${e}`}
function p4e(e){return`text-[10px] uppercase tracking-wide px-1 ${e==="legacy"?"text-amber-500":"text-gray-500"}`}
function h4e(e){return e.legacy?"bg-amber-950/30 hover:bg-amber-900/30 border border-amber-800/40":"bg-gray-800 hover:bg-gray-700"}
function f4e(e){return e.legacy?"legacy":e.category}
function g4e(e){return e.legacy?"text-amber-400/90":"text-cyan-400/80"}
function b4e(){const e=pe(g=>g.activeTool),t=pe(g=>g.setActiveTool),n=pe(g=>g.toolSettings.eraseMode),r=pe(g=>g.toggleEraseMode),a=pe(g=>g.setStampData),o=pe(g=>g.setStampPhase),i=pe(g=>g.resetStampTransform),s=pe(g=>g.updateToolSettings),l=P.useRef(null),[c,d]=P.useState({open:!1,x:0,y:0}),[p,f]=P.useState("all"),[donorOpen,setDonorOpen]=P.useState(false);P.useEffect(()=>{const onState=event=>setDonorOpen(!!event.detail?.open);window.addEventListener('xensonar:forge:donor-library-state',onState);return()=>window.removeEventListener('xensonar:forge:donor-library-state',onState)},[]);P.useEffect(()=>{const g=y=>{l.current&&(l.current.contains(y.target)||d(x=>({...x,open:!1})))};return window.addEventListener("mousedown",g),()=>window.removeEventListener("mousedown",g)},[]);const b=g=>{const y=Wb.find(x=>x.id===g);y&&(t("stamp"),s({brushSize:y.defaultSize,intensity:y.defaultIntensity}),a(__forgePresetStampForTool(y.stamp)),i(),o("stamping"),d(x=>({...x,open:!1})))};return u.jsxs("div",{className:"xen-forge-tool-rail flex flex-col gap-1 p-1.5 bg-gray-900 border-r border-gray-700 w-12",children:[a4e.map(g=>u.jsx("button",{title:o4e(g),onClick:()=>t(g.id),onContextMenu:y=>{g.id==="stamp"&&(y.preventDefault(),d({open:!0,x:y.clientX+8,y:y.clientY+8}))},className:i4e(e,g.id,n),children:__XenForgeToolIcon(g)},g.id)),u.jsx("button",{title:s4e(n),onClick:r,className:c4e(n),children:__XenForgeEraseIcon(n)}),
 u.jsxs("button",{type:"button",className:"xen-donor-library-dock-switch",'data-forge-donor-library-dock-toggle':"true",'aria-expanded':donorOpen,'aria-label':donorOpen?"Close Donor Library":"Open Donor Library",title:donorOpen?"Close Donor Library":"Donor Library · open between Play Rack and Raw Audio",onClick:()=>window.dispatchEvent(new CustomEvent('xensonar:forge:donor-library-toggle')),children:[u.jsxs("span",{className:"xen-donor-library-dock-letters",'aria-hidden':true,children:[u.jsx("span",{children:Array.from("DONOR",x=>u.jsx("span",{children:x}))}),u.jsx("span",{children:Array.from("LIBRARY",x=>u.jsx("span",{children:x}))})]}),u.jsx("svg",{className:"xen-donor-library-dock-arrow",viewBox:"0 0 40 20",'aria-hidden':true,children:u.jsx("path",{d:"M2 2 H38 L20 18 Z",fill:"currentColor"})})]}),c.open&&u.jsxs("div",{ref:l,className:"fixed z-50 bg-gray-900 border border-gray-700 rounded-md p-1.5 w-72 shadow-2xl",style:{left:c.x,top:c.y},children:[u.jsxs("div",{className:"text-[10px] text-cyan-300 px-1.5 pb-1.5 border-b border-gray-700 mb-1 flex items-center justify-between",children:[u.jsx("span",{children:"Stamp Presets"}),u.jsxs("span",{className:"text-gray-500",children:[Wb.length," Entries"]})]}),u.jsxs("div",{className:"px-1.5 pb-1.5 text-[10px] text-gray-500 border-b border-gray-800 mb-2",children:[u.jsx("span",{className:"text-cyan-400",children:"Core"})," = kuratierte Kernbank · ",u.jsx("span",{className:"text-amber-400",children:"Legacy"})," = older comparison baseline"]}),u.jsxs("div",{className:"mb-2 flex flex-wrap gap-1 px-1",children:[u.jsx("button",{onClick:()=>f("all"),className:`rounded px-2 py-0.5 text-[10px] ${t_("all",p)}`,children:"All"}),qU(Wb).map(g=>u.jsx("button",{onClick:()=>f(g),className:`rounded px-2 py-0.5 text-[10px] ${t_(g,p)}`,children:g},g))]}),u.jsx("div",{className:"max-h-[60vh] overflow-y-auto pr-1 flex flex-col gap-2",children:u4e(Wb,p).map(g=>u.jsxs("div",{className:"flex flex-col gap-1",children:[u.jsx("div",{className:p4e(g),children:m4e(g)}),d4e(Wb,g).map(y=>u.jsxs("button",{onClick:()=>b(y.id),className:`text-left px-2 py-1.5 rounded ${h4e(y)}`,title:y.description,children:[u.jsxs("div",{className:"flex items-center justify-between gap-2",children:[u.jsx("div",{className:"text-[11px] text-gray-200 leading-tight",children:y.name}),u.jsx("div",{className:`text-[9px] uppercase ${g4e(y)}`,children:f4e(y)})]}),u.jsx("div",{className:"text-[10px] text-gray-500 leading-tight",children:y.description}),u.jsxs("div",{className:"mt-1 flex flex-wrap items-center gap-1 text-[9px]",children:[u.jsx("span",{className:"rounded px-1.5 py-0.5",style:{backgroundColor:`${y.previewColor}22`,color:y.previewColor},children:y.spectralRole}),u.jsxs("span",{className:"text-gray-500",children:["Size ",y.defaultSize]}),u.jsxs("span",{className:"text-gray-500",children:["Int ",Math.round(y.defaultIntensity*100),"%"]}),u.jsx("span",{className:"text-gray-500",children:y.decayType})]}),u.jsx("div",{className:"mt-1 flex flex-wrap gap-1 text-[9px] text-gray-500",children:y.tags.map(x=>u.jsx("span",{className:"rounded bg-black/20 px-1.5 py-0.5",children:x},x))})]},y.id))]},g))})]})]})}
function v4e(e,t){return{brush:"🖌️ Soft Brush",hardBrush:"✏️ Hard Brush",line:"📐 Linien-Tool",harmonicBrush:"🎵 Harmonic Brush",noiseBrush:"🌊 Noise Brush",spray:"Spray",formant:"🗣️ Formant",stamp:"Stamp",morph:"🌀 Morph",smudge:"🫟 Smudge",dodgeBurn:t.eraseMode?"🌘 Abdunkeln":"☀️ Nachbelichten",blurSharpen:t.eraseMode?"≋ Sharpen":"≋ Weichzeichnen",delaySmear:"⟿ Delay Smear",threshold:t.eraseMode?"🚪 Open Threshold":"🚪 Threshold gate",sourceTrace:"🧬 Source Trace"}[e]??e}
function A4e(e){return y4e.has(e)}
function x4e(e){const t=CB[e.activeTool]??"workbench_only";return t==="workbench_plus_body"&&e.forge3EditTarget==="workbench"?"workbench_only":t}
function M4e(e){return CB[e]??"workbench_only"}
function w4e(e){return e<.2?"Noisy":e<.4?"Gritty":e<.6?"Neutral":e<.8?"Smooth":"Tonal"}
function R4e(e){switch(e.activeTool){case"smudge":return"Intensity = push, Hardness = edge retention";case"dodgeBurn":return e.eraseMode?"Erase = darken · Intensity = pressure":"Normal = expose · Intensity = pressure";case"blurSharpen":return e.eraseMode?"Erase = sharpen · Hardness = detail protection":"Normal = blur · Hardness = detail protection";case"delaySmear":return"Intensity = repeat level, Hardness = trace fidelity";case"threshold":return e.eraseMode?"Erase = restore material below the gate":"Normal = leises Material lokal wegschneiden";case"sourceTrace":return e.eraseMode?"Erase = locally thin out the source trace in the image":"Pull the original audio spectrum into the canvas as a high-resolution trace";default:return null}}
function C4e(){const e=pe(F=>F.activeTool),t=pe(F=>F.toolSettings),n=pe(F=>F.updateToolSettings),r=pe(F=>F.stampPhase),a=pe(F=>F.stampScaleX),o=pe(F=>F.stampScaleY),i=pe(F=>F.stampRotation),s=pe(F=>F.stampFlipX),l=pe(F=>F.stampFlipY),c=pe(F=>F.setStampScale),d=pe(F=>F.rotateStamp),p=pe(F=>F.toggleStampFlipX),f=pe(F=>F.toggleStampFlipY),b=pe(F=>F.resetStampTransform),g=pe(F=>F.synthMode),y=pe(F=>F.showGrainLayer),x=pe(F=>F.spectralData),A=pe(F=>F.sourceAssetContext),M=pe(F=>F.forge3EditTarget),v=pe(F=>F.setForge3EditTarget),w=g==="granular"||y,R=e==="morph"?x.height:80,k=M4e(e),I=x4e({activeTool:e,forge3EditTarget:M}),E=R4e({activeTool:e,eraseMode:t.eraseMode});return u.jsxs("div",{className:"bg-gray-900 border-t border-gray-700 px-4 py-2 flex items-center gap-6 text-xs text-gray-300 flex-wrap",children:[u.jsx("span",{className:"text-purple-400 font-semibold",children:v4e(e,{eraseMode:t.eraseMode})}),u.jsx("span",{className:"rounded border border-neutral-700 px-2 py-0.5 text-[10px] text-neutral-400",title:"Shows which layer this tool actually affects in the current Forge-3 state.",children:E5e(I)}),t.eraseMode&&u.jsx("span",{className:"text-red-400 font-bold flex items-center gap-1 bg-red-900/40 px-2 py-0.5 rounded",children:"⊖ Eraser Mode"}),A==="forge3_main"&&k==="workbench_plus_body"&&u.jsxs("div",{className:"flex items-center gap-1 rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-1",children:[u.jsx("span",{className:"text-[10px] text-cyan-200/80",children:"Tool Target"}),u.jsx("button",{onClick:()=>v("workbench"),className:`h-6 rounded px-2 text-[10px] ${M==="workbench"?"bg-cyan-700 text-white":"bg-neutral-800 text-neutral-300 hover:bg-neutral-700"}`,title:"Affects only the workbench; the source remains unchanged.",children:"Workbench"}),u.jsx("button",{onClick:()=>v("linked_body"),className:`h-6 rounded px-2 text-[10px] ${M==="linked_body"?"bg-cyan-700 text-white":"bg-neutral-800 text-neutral-300 hover:bg-neutral-700"}`,title:"Affects both workbench and source.",children:"Workbench + Source"})]}),u.jsxs("label",{className:"flex items-center gap-2",children:[u.jsx("span",{className:"text-gray-500",children:"Size"}),u.jsx("input",{type:"range",min:1,max:R,step:1,value:t.brushSize,onChange:F=>n({brushSize:Number(F.target.value)}),className:"w-24 accent-purple-500",...tA}),u.jsx("span",{className:"w-10 text-right font-mono",children:t.brushSize})]}),u.jsxs("label",{className:"flex items-center gap-2",children:[u.jsx("span",{className:"text-gray-500",children:"Intensity"}),u.jsx("input",{type:"range",min:.01,max:1,step:.01,value:t.intensity,onChange:F=>n({intensity:Number(F.target.value)}),className:"w-24 accent-purple-500",...tA}),u.jsxs("span",{className:"w-8 text-right font-mono",children:[(t.intensity*100).toFixed(0),"%"]})]}),A4e(e)&&u.jsxs("label",{className:"flex items-center gap-2",children:[u.jsx("span",{className:"text-gray-500",children:"Hardness"}),u.jsx("input",{type:"range",min:0,max:1,step:.05,value:t.hardness,onChange:F=>n({hardness:Number(F.target.value)}),className:"w-20 accent-purple-500",...tA}),u.jsxs("span",{className:"w-8 text-right font-mono",children:[(t.hardness*100).toFixed(0),"%"]})]}),e==="harmonicBrush"&&u.jsxs(u.Fragment,{children:[u.jsxs("label",{className:"flex items-center gap-2",children:[u.jsx("span",{className:"text-gray-500",children:"Overtones"}),u.jsx("input",{type:"range",min:1,max:16,step:1,value:t.numHarmonics,onChange:F=>n({numHarmonics:Number(F.target.value)}),className:"w-20 accent-amber-500",onPointerUp:PE}),u.jsx("span",{className:"w-5 text-right font-mono",children:t.numHarmonics})]}),u.jsxs("label",{className:"flex items-center gap-2",children:[u.jsx("span",{className:"text-gray-500",children:"Decay"}),u.jsx("input",{type:"range",min:.1,max:.95,step:.05,value:t.harmonicDecay,onChange:F=>n({harmonicDecay:Number(F.target.value)}),className:"w-20 accent-amber-500",onPointerUp:PE}),u.jsxs("span",{className:"w-8 text-right font-mono",children:[(t.harmonicDecay*100).toFixed(0),"%"]})]})]}),e==="spray"&&u.jsxs("label",{className:"flex items-center gap-2",children:[u.jsx("span",{className:"text-gray-500",children:"Density"}),u.jsx("input",{type:"range",min:.05,max:1,step:.05,value:t.sprayDensity,onChange:F=>n({sprayDensity:Number(F.target.value)}),className:"w-20 accent-cyan-500"}),u.jsxs("span",{className:"w-8 text-right font-mono",children:[(t.sprayDensity*100).toFixed(0),"%"]})]}),e==="formant"&&u.jsxs("div",{className:"flex items-center gap-1",children:[u.jsx("span",{className:"text-gray-500 mr-1",children:"Vowel"}),["a","e","i","o","u"].map(F=>u.jsx("button",{onClick:()=>n({formantVowel:F}),className:`w-7 h-7 rounded font-bold text-sm uppercase
                ${t.formantVowel===F?"bg-pink-600 text-white":"bg-gray-800 text-gray-400 hover:bg-gray-700"}`,children:F},F))]}),e==="morph"&&u.jsxs(u.Fragment,{children:[u.jsxs("div",{className:"flex items-center gap-1",children:[u.jsx("span",{className:"text-gray-500 mr-1",children:"Mode"}),S4e.map(F=>u.jsx("button",{onClick:()=>n({morphMode:F.id}),className:`px-2 h-7 rounded text-[11px] ${t.morphMode===F.id?"bg-cyan-700 text-white":"bg-gray-800 text-gray-400 hover:bg-gray-700"}`,children:F.label},F.id))]}),u.jsx("span",{className:"text-[10px] text-cyan-300/80",children:"Radius can extend to the full spectrum height"})]}),E&&u.jsx("span",{className:"text-[10px] text-cyan-300/80",children:E}),w&&u.jsxs("label",{className:"flex items-center gap-2",children:[u.jsx("span",{className:"text-cyan-400",children:"🌾 Grain"}),u.jsx("input",{type:"range",min:0,max:1,step:.05,value:t.grainSize,onChange:F=>n({grainSize:Number(F.target.value)}),className:"w-24 accent-cyan-400",...tA}),u.jsx("span",{className:"w-14 text-right font-mono text-cyan-300",children:w4e(t.grainSize)})]}),e==="stamp"&&r==="stamping"&&u.jsxs("div",{className:"flex items-center gap-3",children:[u.jsxs("span",{className:"text-cyan-400 font-mono",children:["X: ",(a*100).toFixed(0),"%"]}),u.jsxs("span",{className:"text-cyan-400 font-mono",children:["Y: ",(o*100).toFixed(0),"%"]}),u.jsxs("span",{className:"text-cyan-400 font-mono",children:["Rot: ",Math.round(i*180/Math.PI),"°"]}),u.jsxs("span",{className:"text-cyan-300 text-[11px]",children:[s?"FlipX ":"",l?"FlipY":""]}),u.jsxs("div",{className:"flex items-center gap-1",children:[u.jsx("button",{onClick:()=>c(a+.1,o),className:"h-6 px-2 rounded bg-gray-800 hover:bg-gray-700 text-cyan-300",children:"X+"}),u.jsx("button",{onClick:()=>c(a-.1,o),className:"h-6 px-2 rounded bg-gray-800 hover:bg-gray-700 text-cyan-300",children:"X-"}),u.jsx("button",{onClick:()=>c(a,o+.1),className:"h-6 px-2 rounded bg-gray-800 hover:bg-gray-700 text-cyan-300",children:"Y+"}),u.jsx("button",{onClick:()=>c(a,o-.1),className:"h-6 px-2 rounded bg-gray-800 hover:bg-gray-700 text-cyan-300",children:"Y-"}),u.jsx("button",{onClick:()=>d(-Math.PI/24),className:"h-6 px-2 rounded bg-gray-800 hover:bg-gray-700 text-cyan-300",children:"⟲"}),u.jsx("button",{onClick:()=>d(Math.PI/24),className:"h-6 px-2 rounded bg-gray-800 hover:bg-gray-700 text-cyan-300",children:"⟳"}),u.jsx("button",{onClick:p,className:`h-6 px-2 rounded ${s?"bg-cyan-700 text-white":"bg-gray-800 hover:bg-gray-700 text-cyan-300"}`,children:"⇋"}),u.jsx("button",{onClick:f,className:`h-6 px-2 rounded ${l?"bg-cyan-700 text-white":"bg-gray-800 hover:bg-gray-700 text-cyan-300"}`,children:"⇵"}),u.jsx("button",{onClick:b,className:"h-6 px-2 rounded bg-gray-800 hover:bg-gray-700 text-cyan-300",children:"Reset"})]})]})]})}
function sK(e,t){const n=t.length,r=n>0?t.reduce((p,f)=>p+f.confidence,0)/n:0,a=n>0?t.reduce((p,f)=>p+f.donorCellIds.length,0)/n:0,o=new Map;for(const p of e.anchorsByTime)for(const f of p)o.set(f.id,f);let i=null,s=-1;const l={low:0,mid:0,high:0},c={attack:0,sustain:0,release:0},d={tonal:0,cluster:0,noise:0,transient:0};for(const p of t)l[p.dominantRegister]+=1,c[p.dominantPhase]+=1,d[p.dominantRegime]+=1,p.confidence>s&&(s=p.confidence,i=o.get(p.carrierAnchorId)?.centerHz??null);return{bindingCount:n,meanConfidence:r,meanCellsPerBinding:a,strongestCarrierHz:i,dominantRegisterCounts:l,dominantPhaseCounts:c,dominantRegimeCounts:d}}
function WOe(e,t,n){const r=Math.abs(t.centerBin-e.centerBin);if(r>n.maxDeltaBins)return 0;const a=Math.max(0,1-r/n.maxDeltaBins),o=1-Math.min(1,Math.abs(e.energy-t.energy)/Math.max(.001,Math.max(e.energy,t.energy))),i=Math.max(1,e.bandwidthBins),s=Math.max(1,t.bandwidthBins),l=Math.max(i,s)/Math.min(i,s);if(l>n.maxBandwidthRatio)return 0;const c=Math.max(0,1-(l-1)/Math.max(.001,n.maxBandwidthRatio-1)),d=e.regime===t.regime?1:e.regime==="tonal"&&t.regime==="cluster"||e.regime==="cluster"&&t.regime==="tonal"?.74:e.regime==="transient"&&t.regime==="tonal"||e.regime==="tonal"&&t.regime==="transient"?.56:.4;return a*.42+o*.16+c*.18+d*.24}
function qOe(e,t){const n={...VOe},r=[];for(let a=0;a<e.anchorsByTime.length-1;a+=1){const o=e.anchorsByTime[a]??[],i=e.anchorsByTime[a+1]??[];for(const s of o){const l=i.map(c=>{const d=WOe(s,c,n);return{fromAnchorId:s.id,toAnchorId:c.id,continuityScore:d,deltaBins:Math.abs(c.centerBin-s.centerBin)}}).filter(c=>c.continuityScore>=n.minScore).sort((c,d)=>d.continuityScore-c.continuityScore||c.deltaBins-d.deltaBins).slice(0,n.maxLinksPerAnchor);r.push(...l)}}return{links:r}}
function QOe(e){return Number.isFinite(e)?Math.max(0,Math.min(1,e)):0}
function UOe(e){const t=new Map;if(!e)return t;for(const n of e.links)t.set(n.fromAnchorId,(t.get(n.fromAnchorId)??0)+n.continuityScore),t.set(n.toAnchorId,(t.get(n.toAnchorId)??0)+n.continuityScore);return t}
function KOe(e){return{id:e.id,timeIndex:e.timeIndex,centerBin:e.centerBin,centerHz:e.centerHz,energy:e.energy,bandwidthBins:e.bandwidthBins,regime:e.regime,clusterId:e.clusterId}}
function $Oe(e){if(!e.length)return 0;const t=e.length,n=e.reduce((o,i)=>o+Math.max(0,i.energy),0),r=e.reduce((o,i)=>o+Math.max(0,i.bandwidthBins),0)/t,a=t*.45+Math.min(2,n)*.35+Math.min(6,r)*.2;return QOe(a/3)}
function XOe(e){return e.reduce((t,n)=>t+Math.max(0,n.energy),0)}
function YOe(e,t){return e.length?e.reduce((r,a)=>r+(t.get(a.id)??0),0)/e.length:0}
function JOe(e,t){const n=UOe(t),r=e.anchorsByTime.map((a,o)=>{const i=a??[];return{timeIndex:o,anchors:i.map(KOe),density:$Oe(i),totalEnergy:XOe(i),continuityStrength:YOe(i,n)}});return{width:e.width,height:e.height,durationSec:e.durationSec,slots:r}}
function ZOe(e){const t=e.slots.length;if(!t)return{slotCount:0,peakPolyphony:0,meanAnchorsPerSlot:0,meanDensity:0,sparseSlotRatio:0,denseSlotRatio:0};const n=e.slots.map(c=>c.anchors.length),r=e.slots.map(c=>c.density),a=n.reduce((c,d)=>Math.max(c,d),0),o=n.reduce((c,d)=>c+d,0)/t,i=r.reduce((c,d)=>c+d,0)/t,s=e.slots.filter(c=>c.density<.25).length/t,l=e.slots.filter(c=>c.density>.66).length/t;return{slotCount:t,peakPolyphony:a,meanAnchorsPerSlot:o,meanDensity:i,sparseSlotRatio:s,denseSlotRatio:l}}
function b_(e){return e.length?e.reduce((t,n)=>t+n,0)/e.length:0}
function e_e(e){if(!e.anchors.length)return"noise";const t={tonal:0,cluster:0,noise:0,transient:0};for(const n of e.anchors)t[n.regime]+=n.energy||1;return Object.entries(t).sort((n,r)=>r[1]-n[1])[0]?.[0]??"noise"}
function t_e(e,t,n){const r=n.detail.anchorFocus,a=n.detail.inharmonicFreedom;return e===t.regime?.85+r*.15:e==="cluster"&&t.regime==="noise"||e==="noise"&&t.regime==="cluster"?.55+a*.25:e==="tonal"&&t.kind==="ordered"||e==="transient"&&t.kind==="transient"?.65+r*.2:.2+a*.2}
function n_e(e,t,n){switch(t.kind){case"transient":return e<.3+n.detail.bandwidthSpread*.3?1:.45+n.detail.transientLoad*.2;case"residual":return e>.25?.65+n.detail.residualLoad*.3:.45+n.detail.bandwidthSpread*.2;case"resonant":return e>.15?.55+n.detail.resonanceLoad*.35:.45+n.detail.anchorFocus*.15;case"ordered":return e<.75?.45+(1-n.detail.orderednessPenalty)*.4:.35+n.detail.zoneCoupling*.15;case"mixed":default:return .4+n.detail.zoneCoupling*.2+n.detail.inharmonicFreedom*.15}}
function MK(e,t){const n=e.sequenceRecoverability*(.25+t.detail.sequenceDecoupling*.55)+e.prosodicTrace*(.2+t.detail.prosodySuppression*.65)+e.cellEntanglement*(.1+t.detail.cellDisentanglement*.55),r=(e.overallLeakRisk??0)*(.45+t.detail.orderednessPenalty*.35)+(e.recommendedSuppression??0)*(.25+t.detail.prosodySuppression*.35);return px(n/1.75*.45+r*.55)}
function r_e(e,t,n,r){const a=t_e(t,n,r),o=n_e(e.density,n,r),i=px(e.totalEnergy/Math.max(1,e.anchors.length)),s=px(e.continuityStrength),l=a*.35+o*.25+i*.2+s*(.08+r.detail.continuityFidelity*.08)+px(e.anchors.length/6)*(.06+r.detail.polyAnchorBlend*.12)-MK(n,r)*(.18+r.detail.orderednessPenalty*.32);return Math.max(0,l)}
function a_e(e){const t=e.reduce((n,r)=>n+r,0);return t<=0?new Float32Array(e.map(()=>0)):new Float32Array(e.map(n=>n/t))}
function wK(e,t,n=JS()){const r=[];for(const a of e.slots){if(!a.anchors.length||!t.cells.length)continue;const o=e_e(a),i=t.cells.map(d=>({cell:d,score:r_e(a,o,d,n)})).filter(d=>d.score>0).sort((d,p)=>p.score-d.score).slice(0,3);if(!i.length)continue;const s=a_e(i.map(d=>d.score)),l=b_(i.map(d=>MK(d.cell,n))),c=b_(i.map(d=>d.score));r.push({timeIndex:a.timeIndex,anchorIds:a.anchors.map(d=>d.id),cellIds:i.map(d=>d.cell.id),weights:s,confidence:c,leakRisk:l})}return{allocations:r}}
function RK(e){if(!e.allocations.length)return{allocationCount:0,meanConfidence:0,meanLeakRisk:0,meanCellsPerAllocation:0};const t=e.allocations.length,n=e.allocations.reduce((o,i)=>o+i.confidence,0)/t,r=e.allocations.reduce((o,i)=>o+i.leakRisk,0)/t,a=e.allocations.reduce((o,i)=>o+i.cellIds.length,0)/t;return{allocationCount:t,meanConfidence:n,meanLeakRisk:r,meanCellsPerAllocation:a}}
function iA(e){return e8e(e)}
function i_e(e){const t=e.residualModel?Math.max(0,e.residualModel.meanResidualStrength*(.55+e.residualModel.meanResidualFlatness*.45)):iA(e.meanResidualBands),n=e.resonanceModel?Math.max(0,e.resonanceModel.meanResonanceStrength*(.6+e.resonanceModel.meanResonanceSharpness*.4)):iA(e.meanFormantEnvelope),r=e.transientModel?Math.max(0,e.transientModel.meanTransientStrength*(.5+e.transientModel.meanOnsetSharpness*.3+e.transientModel.meanDecayTightness*.2)):iA(e.meanModulationProfile),a=e.orderedModel?Math.max(0,e.orderedModel.meanOrderedness*(1-e.orderedModel.meanInharmonicSpread*.6)):iA(e.meanRelativeSpectralEnvelope),o=e.leakAuditModel?Math.max(e.leakAuditModel.meanRecommendedSuppression,e.leakAuditModel.meanOverallLeakRisk*.85):e.prosodicTrace*.45+e.sequenceRecoverability*.35+e.cellEntanglement*.2,s=[["ordered",Math.max(0,a-o)],["resonant",n],["residual",t],["transient",r]];s.sort((f,b)=>b[1]-f[1]);const l=s[0];if(!l)return"mixed";const[c,d]=l,p=s[1]?.[1]??0;return d<=.05||Math.abs(d-p)<.05?"mixed":c}
function s_e(e){return{id:e.id,register:e.register,regime:e.regime,kind:i_e(e),relativeEnvelope:e.meanRelativeSpectralEnvelope,residualProfile:e.meanResidualBands,resonanceProfile:e.meanFormantEnvelope,transientProfile:e.meanModulationProfile,sequenceRecoverability:e.sequenceRecoverability,prosodicTrace:e.prosodicTrace,cellEntanglement:e.cellEntanglement,orderedStrength:e.orderedModel?.meanOrderedness,orderedInharmonicSpread:e.orderedModel?.meanInharmonicSpread,orderedPartialWeights:e.orderedModel?.meanPartialWeights,orderedSpectralSlope:e.orderedModel?.meanSpectralSlope,orderedOddEvenBalance:e.orderedModel?.meanOddEvenBalance,resonanceStrength:e.resonanceModel?.meanResonanceStrength,resonanceSharpness:e.resonanceModel?.meanResonanceSharpness,resonancePeakCenters:e.resonanceModel?.meanPeakCenters,resonancePeakWeights:e.resonanceModel?.meanPeakWeights,resonancePeakWidths:e.resonanceModel?.meanPeakWidths,resonanceBodyCentroid:e.resonanceModel?.meanBodyCentroid,residualStrength:e.residualModel?.meanResidualStrength,residualFlatness:e.residualModel?.meanResidualFlatness,noiseColorCentroid:e.residualModel?.meanNoiseColorCentroid,transientStrength:e.transientModel?.meanTransientStrength,onsetSharpness:e.transientModel?.meanOnsetSharpness,onsetSpread:e.transientModel?.meanOnsetSpread,decayTightness:e.transientModel?.meanDecayTightness,overallLeakRisk:e.leakAuditModel?.meanOverallLeakRisk,recommendedSuppression:e.leakAuditModel?.meanRecommendedSuppression}}
function l_e(e){return{cells:e.cells.map(s_e)}}
function c_e(e){const t={ordered:0,resonant:0,residual:0,transient:0,mixed:0};if(!e.cells.length)return{cellCount:0,kindCounts:t,meanSequenceRecoverability:0,meanProsodicTrace:0,meanCellEntanglement:0,meanOrderedStrength:0,strongOrderedRatio:0,meanResonanceStrength:0,strongResonantRatio:0,meanResonanceSharpness:0,meanResidualStrength:0,strongResidualRatio:0,meanResidualFlatness:0,meanNoiseColorCentroid:0,meanTransientStrength:0,strongTransientRatio:0,meanOnsetSharpness:0,meanOnsetSpread:0,meanDecayTightness:0,meanOverallLeakRisk:0,highLeakRatio:0,meanRecommendedSuppression:0};const n=e.cells.reduce((I,E)=>(I[E.kind]+=1,I),{...t}),r=e.cells.reduce((I,E)=>I+E.sequenceRecoverability,0)/e.cells.length,a=e.cells.reduce((I,E)=>I+E.prosodicTrace,0)/e.cells.length,o=e.cells.reduce((I,E)=>I+E.cellEntanglement,0)/e.cells.length,i=e.cells.reduce((I,E)=>I+(E.orderedStrength??0),0)/e.cells.length,s=e.cells.filter(I=>(I.orderedStrength??0)>.55).length/e.cells.length,l=e.cells.reduce((I,E)=>I+(E.resonanceStrength??0),0)/e.cells.length,c=e.cells.filter(I=>(I.resonanceStrength??0)>.48).length/e.cells.length,d=e.cells.reduce((I,E)=>I+(E.resonanceSharpness??0),0)/e.cells.length,p=e.cells.reduce((I,E)=>I+(E.residualStrength??0),0)/e.cells.length,f=e.cells.filter(I=>(I.residualStrength??0)>.48).length/e.cells.length,b=e.cells.reduce((I,E)=>I+(E.residualFlatness??0),0)/e.cells.length,g=e.cells.reduce((I,E)=>I+(E.noiseColorCentroid??0),0)/e.cells.length,y=e.cells.reduce((I,E)=>I+(E.transientStrength??0),0)/e.cells.length,x=e.cells.filter(I=>(I.transientStrength??0)>.48).length/e.cells.length,A=e.cells.reduce((I,E)=>I+(E.onsetSharpness??0),0)/e.cells.length,M=e.cells.reduce((I,E)=>I+(E.onsetSpread??0),0)/e.cells.length,v=e.cells.reduce((I,E)=>I+(E.decayTightness??0),0)/e.cells.length,w=e.cells.reduce((I,E)=>I+(E.overallLeakRisk??0),0)/e.cells.length,R=e.cells.filter(I=>(I.overallLeakRisk??0)>.58).length/e.cells.length,k=e.cells.reduce((I,E)=>I+(E.recommendedSuppression??0),0)/e.cells.length;return{cellCount:e.cells.length,kindCounts:n,meanSequenceRecoverability:r,meanProsodicTrace:a,meanCellEntanglement:o,meanOrderedStrength:i,strongOrderedRatio:s,meanResonanceStrength:l,strongResonantRatio:c,meanResonanceSharpness:d,meanResidualStrength:p,strongResidualRatio:f,meanResidualFlatness:b,meanNoiseColorCentroid:g,meanTransientStrength:y,strongTransientRatio:x,meanOnsetSharpness:A,meanOnsetSpread:M,meanDecayTightness:v,meanOverallLeakRisk:w,highLeakRatio:R,meanRecommendedSuppression:k}}
function du(e){return Number.isFinite(e)?Math.max(0,Math.min(1,e)):0}
function sA(e,t,n,r,a,o,i){const s=Math.max(0,Math.min(t-1,Math.round(r))),l=Math.max(0,Math.min(n-1,Math.round(a))),c=Math.max(0,Math.min(n,Math.round(o))),d=Math.max(0,i);if(!(d<=0))for(let p=Math.max(0,l-c);p<=Math.min(n-1,l+c);p+=1){const f=Math.abs(p-l),b=c<=0?1:1-f/Math.max(1,c+1),g=p*t+s;e[g]=du((e[g]??0)+d*b)}}
function $f(e){let t=0;for(let n=0;n<e.length;n+=1)t=Math.max(t,e[n]??0);if(t<=1e-6)return e;for(let n=0;n<e.length;n+=1)e[n]=du((e[n]??0)/t);return e}
function u_e(e,t){if(!e)return{ordered:t*.2,body:t*.28,residual:t*.22,transient:t*.12};const n=Math.max(e.kind==="ordered"?.72:0,e.orderedStrength??0,e.regime==="tonal"?.42:0),r=Math.max(e.kind==="resonant"?.72:0,e.resonanceStrength??0,e.resonanceSharpness?e.resonanceSharpness*.55:0),a=Math.max(e.kind==="residual"?.78:0,e.residualStrength??0,e.regime==="noise"?.52:0),o=Math.max(e.kind==="transient"?.82:0,e.transientStrength??0,e.regime==="transient"?.56:0),i=e.kind==="mixed"?.24:0;return{ordered:t*du(n+i),body:t*du(r+i),residual:t*du(a+i),transient:t*du(o+i)}}
function d_e(e){switch(e.regime){case"tonal":return{ordered:.74,body:.28,residual:.08,transient:.08};case"cluster":return{ordered:.22,body:.48,residual:.36,transient:.16};case"noise":return{ordered:.08,body:.22,residual:.72,transient:.18};case"transient":return{ordered:.12,body:.18,residual:.24,transient:.78};default:return{ordered:.25,body:.3,residual:.25,transient:.15}}}
function m_e(e){const t=Math.max(1,e.skeleton.width||e.spectralData.width||1),n=Math.max(1,e.skeleton.height||e.spectralData.height||1),r=t*n,a=ev(e.spectralData).presence,o=new Float32Array(r),i=new Float32Array(r),s=new Float32Array(r),l=new Float32Array(r),c=new Float32Array(r),d=new Float32Array(r);for(let g=0;g<Math.min(r,a.energy.length);g+=1)o[g]=du(a.energy[g]??0);const p=new Map((e.materialField?.cells??[]).map(g=>[g.id,g])),f=new Map((e.materialAllocationPreview?.allocations??[]).map(g=>[g.timeIndex,g])),b=[];for(const g of e.skeleton.anchorsByTime)for(const y of g)b.push(y);for(const g of b){const y=f.get(g.timeIndex),x=Math.max(1,Math.min(n/4,Math.ceil(g.bandwidthBins*.75+1))),A=du(g.energy);let M=0,v=0,w=0,R=0;if(y&&y.cellIds.length)for(let I=0;I<y.cellIds.length;I+=1){const E=p.get(y.cellIds[I]),F=y.weights[I]??0,L=u_e(E,F);M+=L.ordered,v+=L.body,w+=L.residual,R+=L.transient}else{const I=d_e(g);M=I.ordered,v=I.body,w=I.residual,R=I.transient}const k=y?.78+y.confidence*.34:.72;sA(i,t,n,g.timeIndex,g.centerBin,x,A*M*k),sA(s,t,n,g.timeIndex,g.centerBin,x+1,A*v*k),sA(l,t,n,g.timeIndex,g.centerBin,x+2,A*w*(.72+(y?.leakRisk??0)*.18)),sA(c,t,n,g.timeIndex,g.centerBin,Math.max(1,Math.floor(x*.6)),A*R*k)}$f(o),$f(i),$f(s),$f(l),$f(c);for(let g=0;g<r;g+=1)d[g]=du(o[g]*.28+i[g]*.28+s[g]*.26+l[g]*.2+c[g]*.24);return $f(d),{width:t,height:n,durationSec:e.durationSec,carrierTrace:o,orderedField:i,bodyField:s,residualField:l,transientField:c,compositeField:d,builtFromSignature:`carrier-donor-v2:${e.sourceSignature}`}}
async function _B(e){const epoch=__f333Epoch,revision=pe.getState().renderVersion;
 const rendered=await __f333RenderHearing(OB({...e,projectName:e.snapshot.materialExport.name,valueSource:'right-override'}));
 if(epoch!==__f333Epoch||revision!==pe.getState().renderVersion)return {played:false,reason:"The figure or listening mode has changed.",machineId:e.machineId};
 const current=()=>epoch===__f333Epoch&&revision===pe.getState().renderVersion;
 const played=await xt.playBufferInternal(rendered.buffer,rendered.buffer.duration,0,
   p=>{if(current())e.onAudioPosition?.(p)},()=>{if(current())e.onAudioEnd?.()},
   {playbackRate:1,volume:e.previewGain??1,loopPreview:!!e.loopPreview,lifecycleMode:'forge-f333-hearing'});
 return {played:played&&current(),machineId:e.machineId,cacheHit:rendered.cacheHit};}
function VE(e,t,n,r=.05){const a=Math.max(r,n||r),o=Math.max(r,Math.min(t,a));return{startSec:Math.max(0,Math.min(a-o,e)),durationSec:o}}
function $B(e,t,n,r=2.2){const a=Math.max(.15,Math.min(n,t*r)),o=e+t*.5;return VE(o-a*.5,a,n,.15)}
function pc(e){return e.startSec+e.durationSec}
function Ty(e,t){const n=Math.max(e.startSec,t.startSec),r=Math.min(pc(e),pc(t));return r<=n?null:{startSec:n,durationSec:r-n}}
function k6e(e,t){return e.startSec>=t.startSec&&pc(e)<=pc(t)}
/* P30 – Stamp Gallery: a deliberate cross-category first contact, not a text list.
 * The thumbnail is sampled from the REAL stamp intensity matrix, without
 * touching stamp state, altering audio, creating images, or allocating per frame. */
/* P35 – deliberate visual and musical curation: 8 Atlas 2026 forms and
 * 8 short contrasting originals. Older sustained variants remain under All.
 * No preset IDs, stored sessions or Stamp Library contents are deleted. */
const __forgeFeaturedStampIds=[
 'barcode-grid--2026-03', // Rhythm Islands – rhythm
 'diamond-body--2026-06', // Facet Strike – transient
 'spiral-knot--2026-01', // Helix Transit – direction
 'cross-lattice--2026-02', // Counterpoint Relay – interplay
 'fan-bridge--2026-04', // Bloom Fan – harmonic fan
 'glass-orb--2026-05', // Prismatic Echo – echo shape
 'suspended-cloud--2026-07', // Meteor Choir – clouds
 'choir-bloom--2026-08', // Breathing Vowels – phrasing
 'zigzag-pentatonic','mirror-waltz', // concise melody
 'click-ladder','pluck-needle', // attack
 'glass-orb', // Glass Orb - resonant form
 'grain-mist', // texture
 'shimmer-rain', // Shimmer Rain - granular air
 'rising-third-call' // short call
];
/* One visible-content contract for atlas thumbnails and the stamp tool.
 * Cropping changes only preset-load geometry, never the stored atlas or arbitrary user stamps. */
function __forgeStampContentRect(stamp){
 const W=Math.max(1,Math.floor(stamp?.width||1)),H=Math.max(1,Math.floor(stamp?.height||1)),data=stamp?.data||[];
 let x0=W,y0=H,x1=-1,y1=-1;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  if((data[y*W+x]||0)>.03){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 }
 if(x1<0)return {x0:0,y0:0,x1:W,y1:H};
 const px=Math.max(3,(x1-x0+1)*.07),py=Math.max(3,(y1-y0+1)*.07);
 return {x0:Math.max(0,Math.floor(x0-px)),y0:Math.max(0,Math.floor(y0-py)),
  x1:Math.min(W,Math.ceil(x1+1+px)),y1:Math.min(H,Math.ceil(y1+1+py))};
}
function __forgePresetStampForTool(stamp){
 const {x0,y0,x1,y1}=__forgeStampContentRect(stamp),width=x1-x0,height=y1-y0,W=stamp.width;
 if(width===stamp.width&&height===stamp.height)return {width,height,data:stamp.data.slice(),grainData:stamp.grainData.slice()};
 const data=new Float32Array(width*height),grainData=new Float32Array(width*height);
 for(let y=0;y<height;y++){
  const start=(y0+y)*W+x0;
  data.set(stamp.data.subarray(start,start+width),y*width);
  grainData.set(stamp.grainData.subarray(start,start+width),y*width);
 }
 return {width,height,data,grainData};
}
function __forgeStampPreviewPixels(preset,width=108,height=72){
 const stamp=preset?.stamp,W=Math.max(1,stamp?.width||1),H=Math.max(1,stamp?.height||1),
       data=stamp?.data||[],pixels=new Uint8ClampedArray(width*height*4);
 const {x0,y0,x1,y1}=__forgeStampContentRect(stamp);
 const scale=Math.min((width-8)/(x1-x0),(height-8)/(y1-y0)),
       left=(width-(x1-x0)*scale)/2,top=(height-(y1-y0)*scale)/2;
 const hex=/^#[0-9a-f]{6}$/i.test(preset?.previewColor||'')?preset.previewColor:'#79ddd1',
       R=parseInt(hex.slice(1,3),16),G=parseInt(hex.slice(3,5),16),B=parseInt(hex.slice(5,7),16);
 let activePixels=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const off=(y*width+x)*4,srcX=Math.floor((x-left)/scale+x0),srcY=Math.floor((y-top)/scale+y0),
         val=srcX>=0&&srcX<W&&srcY>=0&&srcY<H?Math.max(0,Math.min(1,data[srcY*W+srcX]||0)):0,
         peak=val>.02?Math.sqrt(val):0,
         grid=(x%24===0||y%18===0)?5:0;
   if(peak>.19)activePixels++;
   pixels[off]=Math.min(255,7+grid+R*peak*.95+peak*24);
   pixels[off+1]=Math.min(255,13+grid+G*peak*.98+peak*19);
   pixels[off+2]=Math.min(255,25+grid+B*peak+peak*24);
   pixels[off+3]=255;
 }
 return {width,height,pixels,activePixels};
}
function __ForgeStampPreviewCanvas({preset}){
 const ref=P.useRef(null);
 P.useEffect(()=>{
   const canvas=ref.current,ctx=canvas?.getContext?.('2d');if(!ctx)return;
   const image=__forgeStampPreviewPixels(preset,canvas.width,canvas.height);
   ctx.putImageData(new ImageData(image.pixels,image.width,image.height),0,0);
 },[preset]);
 return P.createElement('canvas',{ref,width:108,height:72,className:'xen-stamp-tile-canvas',
   'aria-hidden':true,'data-stamp-preview':preset.id});
}
const __forgeRevisedStampPresetsP31=__XenStampAtlas2026.refineSustains(Wb);
function JHe(props){
 const [open,setOpen]=P.useState(true),[tab,setTab]=P.useState('presets'),
       [query,setQuery]=P.useState(''),[active,setActive]=P.useState(null),[checkSerial,setCheckSerial]=P.useState(0),
       [showAll,setShowAll]=P.useState(false);
 const entries=dB(s=>s.entries),h=P.createElement;
 const [atlas,setAtlas]=P.useState([]),[atlasError,setAtlasError]=P.useState('');
 const [audition,setAudition]=P.useState({phase:'idle',text:''});
 const player=P.useRef(null),gallery=P.useRef(null);
 P.useEffect(()=>{
  const owner=__XenStampFigureAudition.create({onState:setAudition});player.current=owner;
  const unwatch=__forgeObserveIntakeVisibility(gallery.current,()=>owner.clear());
  const hidden=()=>{if(document.hidden)owner.clear();};document.addEventListener('visibilitychange',hidden);
  return()=>{unwatch();document.removeEventListener('visibilitychange',hidden);owner.dispose();player.current=null;};
 },[]);
 P.useEffect(()=>{if(!open)player.current?.clear();},[open]);
 P.useEffect(()=>{let ready=true;__XenStampAtlas2026.loadVariants(Wb)
   .then(variants=>{if(ready)setAtlas(variants)})
   .catch(error=>{if(ready)setAtlasError('2026 raster decoding unavailable: '+error.message)});
   return()=>{ready=false};},[]);
 const allPresets=P.useMemo(()=>[...Wb,...atlas,...__forgeRevisedStampPresetsP31],[atlas]);

 const choose=preset=>{const state=pe.getState();state.setActiveTool('stamp');state.updateToolSettings({brushSize:preset.defaultSize,intensity:preset.defaultIntensity});
  state.setStampData(__forgePresetStampForTool(preset.stamp));state.resetStampTransform();state.setStampPhase('stamping');setActive(preset.id);setCheckSerial(v=>v+1);
  void player.current?.play(preset).catch(error=>{console.warn('[Stamp Library preview]',error.message)})};
 const featured=__forgeFeaturedStampIds.map(id=>allPresets.find(p=>p.id===id)).filter(Boolean);
 const ordered=[...featured,...allPresets.filter(p=>!__forgeFeaturedStampIds.includes(p.id))];
 const results=ordered.filter(p=>(p.name+' '+p.description+' '+p.tags.join(' ')).toLowerCase().includes(query.toLowerCase()));
 const presets=(showAll||query.trim())?results:featured;
 return h('section',{ref:gallery,'data-stamp-library':true,'data-stamp-library-expanded':open?'true':'false',
   className:'xen-stamp-gallery-section rounded border border-neutral-800 bg-black/20 p-2'},
  h('button',{type:'button','aria-expanded':open,onClick:()=>setOpen(!open),className:'xen-stamp-gallery-heading flex w-full items-center justify-between gap-2 text-left'},
   h('span',{className:'text-[11px] uppercase tracking-[0.2em] text-neutral-300'},'Stamp Library'),
   h('span',{className:'text-[10px] text-cyan-300'},allPresets.length+' Presets · '+entries.length+' Custom '+(open?'▴':'▾'))),
  open&&h('div',{className:'xen-stamp-library-body', 'data-stamp-library-body':true},
   h('div',{className:'xen-stamp-library-tabs'},...['presets','custom','all'].map(t=>h('button',{key:t,type:'button',
     'aria-pressed':tab===t,onClick:()=>setTab(t),className:'xen-stamp-library-tab'+(tab===t?' is-active':'')},
     t==='presets'?'Presets':t==='custom'?'Custom':'Both'))),
   tab!=='custom'&&h('div',{className:'xen-stamp-library-presets'},
    h('div',{className:'xen-stamp-gallery-controls'},
     h('span',{className:'xen-stamp-gallery-caption',role:'status',title:audition.text},audition.phase==='rendering'?'RENDERING …':audition.phase==='error'?'PREVIEW UNAVAILABLE':'SPECTRAL FORMS'),
     h('div',{className:'xen-stamp-gallery-filter', 'data-stamp-gallery-featured':!showAll},
      h('button',{type:'button','aria-pressed':!showAll,onClick:()=>setShowAll(false),children:'Curated · '+featured.length}),
      h('button',{type:'button','aria-pressed':showAll,onClick:()=>setShowAll(true),children:'All · '+allPresets.length}))),
    h('input',{type:'search','aria-label':'Search stamp presets',placeholder:'Find a shape…',value:query,
      onChange:e=>setQuery(e.target.value),className:'xen-stamp-gallery-search'}),
    (atlasError||audition.phase==='error')&&h('div',{className:'text-[10px] text-amber-300',role:'status'},atlasError||audition.text),
    h('div',{'data-stamp-presets':true,'data-stamp-gallery-grid':true,className:'xen-stamp-gallery-grid'},
     ...presets.map(p=>h('button',{key:p.id,type:'button','data-stamp-preset':p.id,'aria-pressed':active===p.id,
       onClick:()=>choose(p),title:p.description+' · Select and hear with the current Forge hearing',
       className:'xen-stamp-gallery-tile'+(active===p.id?' is-selected':'')},
       h('span',{className:'xen-stamp-tile-copy'},
        h('span',{className:'xen-stamp-tile-name'},p.name),
        h('span',{className:'xen-stamp-tile-category',style:{color:p.previewColor}},p.category||p.bank||'Stamp')),
       h('span',{className:'xen-stamp-tile-preview'},h(__ForgeStampPreviewCanvas,{preset:p}),
        active===p.id&&h('span',{key:checkSerial,className:'xen-stamp-loaded-check','aria-hidden':true},
         h('svg',{className:'xen-stamp-check-svg',viewBox:'0 0 18 18',fill:'none',focusable:'false'},
          h('path',{className:'xen-stamp-check-stroke',d:'M2 9 L7 14 L16 4',stroke:'currentColor',strokeWidth:2.5,strokeLinecap:'round',strokeLinejoin:'round'})))))))),
   tab!=='presets'&&h(__CustomStampLibrary,props)));
}
function __createForgeMicCapture({onFile,onState=()=>{},mediaDevices=navigator.mediaDevices,Recorder=globalThis.MediaRecorder,secure=globalThis.isSecureContext!==false,maxSeconds=60}) {
  let phase='idle',generation=0,disposed=false,stream=null,recorder=null,tick=null,limit=null,started=0;
  const notify=(next,message='',seconds=0)=>{phase=next;if(!disposed)onState({phase,message,seconds});};
  const clearTimers=()=>{clearInterval(tick);clearTimeout(limit);tick=limit=null;};
  const release=()=>{
    clearTimers();
    if(recorder){recorder.ondataavailable=recorder.onstop=recorder.onerror=null;try{if(recorder.state!=='inactive')recorder.stop();}catch{}recorder=null;}
    if(stream){for(const track of stream.getTracks()){track.onended=null;track.stop();}stream=null;}
  };
  const messageFor=error=>error?.name==='NotAllowedError'||error?.name==='SecurityError'
    ?'Microphone access was denied. Please allow microphone access in your browser and try again.'
    :error?.name==='NotFoundError'?'No microphone found. Please connect a microphone and try again.'
    :error?.name==='NotReadableError'?'The microphone is unavailable or is being used by another application.'
    :error?.message||'Microphone recording failed.';
  const fail=(error,token)=>{if(disposed||token!==generation)return;generation++;release();notify('failed',messageFor(error));};
  function cancel(){if(disposed||!['requesting','recording'].includes(phase))return;generation++;release();notify('idle','Recording discarded.');}
  function stop(){
    if(disposed||phase!=='recording')return;
    clearTimers();notify('processing','Importing the recording as audio …');
    try{if(recorder?.state!=='inactive')recorder.stop();}catch(error){fail(error,generation);}
  }
  async function start(){
    if(disposed||!['idle','failed'].includes(phase))return;
    if(!secure||!mediaDevices?.getUserMedia){notify('failed','Microphone recording requires HTTPS or localhost and a browser that supports microphone input.');return;}
    if(!Recorder){notify('failed','This browser does not support microphone recording. Audio file import is still available.');return;}
    const token=++generation;notify('requesting','Please allow microphone access in your browser.');
    try{
      const acquired=await mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
      if(disposed||token!==generation){acquired.getTracks().forEach(track=>track.stop());return;}
      stream=acquired;
      const mime=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4'].find(type=>Recorder.isTypeSupported?.(type));
      recorder=mime?new Recorder(stream,{mimeType:mime}):new Recorder(stream);
      const reportedChannels=Number(stream.getAudioTracks()[0]?.getSettings?.().channelCount)||null;
      recorder.__xenInputChannelCount=reportedChannels;
      const current=recorder,chunks=[];let finished=false;
      current.ondataavailable=event=>{if(token===generation&&event.data?.size)chunks.push(event.data);};
      current.onerror=event=>fail(event.error||Error('Microphone recording was interrupted.'),token);
      current.onstop=async()=>{
        if(finished||disposed||token!==generation)return;finished=true;
        const type=current.mimeType||chunks[0]?.type||'audio/webm';release();notify('processing','Importing the recording as audio …');
        try{
          if(!chunks.length)throw Error('The recording contains no audio. Please record again.');
          const extension=type.includes('ogg')?'ogg':type.includes('mp4')?'m4a':'webm';
          const stamp=new Date().toISOString().replace(/[:.]/g,'-');
          let file=new File(chunks,'Mikrofon_'+stamp+'.'+extension,{type});
          // Only a genuinely mono input track may require decoding a wrongly
          // stereo-tagged MediaRecorder container back into mono for the editor.
          // Never silently downmix a genuinely stereo microphone.
          if(current.__xenInputChannelCount===1){
           const AC=window.AudioContext||window.webkitAudioContext;
           if(AC){const context=new AC();try{
             const decoded=await context.decodeAudioData(await file.arrayBuffer());
             if(decoded.numberOfChannels>1){
               const mono=new Float32Array(decoded.length);
               for(let ch=0;ch<decoded.numberOfChannels;ch++){
                 const src=decoded.getChannelData(ch);
                 for(let i=0;i<mono.length;i++)mono[i]+=src[i]/decoded.numberOfChannels;
               }
               const wav=xt.encodeSamplesToWAV(mono,decoded.sampleRate);
               file=new File([wav],'Microphone_'+stamp+'.wav',{type:'audio/wav'});
             }
           }finally{await context.close();}}
          }
          const loaded=await onFile(file);
          if(disposed||token!==generation)return;
          if(loaded===false)throw Error('The recording could not be imported. Please record again or import an audio file.');
          notify('idle','Recording loaded as a donor source. Select a region in the mask below and preview the donor.');
        }catch(error){fail(error,token);}
      };
      current.start(250);started=performance.now();notify('recording','Microphone recording in progress.',0);
      tick=setInterval(()=>{if(token===generation&&phase==='recording')notify('recording','Microphone recording in progress.',Math.min(maxSeconds,(performance.now()-started)/1000));},250);
      limit=setTimeout(stop,maxSeconds*1000);
      for(const track of stream.getAudioTracks())track.onended=stop;
    }catch(error){fail(error,token);}
  }
  function dispose(){if(disposed)return;disposed=true;generation++;release();}
  return {start,stop,cancel,dispose};
}
function __ForgeMicrophoneIntake({onFile,disabled=false,onBusyChange,compact=false}) {
  const [state,setState]=P.useState({phase:'idle',message:'',seconds:0}),owner=P.useRef(null),element=P.useRef(null),importRef=P.useRef(onFile);
  importRef.current=onFile;
  P.useEffect(()=>{
    const capture=__createForgeMicCapture({onFile:file=>importRef.current(file),onState:setState});owner.current=capture;
    const unwatch=__forgeObserveIntakeVisibility(element.current,()=>capture.cancel());
    return()=>{owner.current=null;unwatch();capture.dispose();};
  },[]);
  const recording=state.phase==='recording',requesting=state.phase==='requesting',processing=state.phase==='processing',busy=recording||requesting||processing;
  P.useEffect(()=>{onBusyChange?.(busy);},[busy,onBusyChange]);
  return u.jsxs('div',{ref:element,'data-forge-microphone':state.phase,className:compact?'xen-rack-microphone':'',style:compact?undefined:{display:'flex',flexWrap:'wrap',alignItems:'center',gap:6,maxWidth:440},children:[
    u.jsx('button',{type:'button',disabled:processing||(!busy&&disabled),onClick:()=>recording?owner.current?.stop():requesting?owner.current?.cancel():owner.current?.start(),
      className:recording?'xen-enough-finish':undefined,
      'aria-label':recording?'Finish and import microphone recording':requesting?'Cancel microphone request':processing?'Importing microphone recording':'Microphone',
      style:{border:'1px solid '+(recording?'#f87171':'#3f6e77'),borderRadius:5,padding:'6px 9px',background:recording?'#6b1620':'#10232a',color:'#e5f6f5',opacity:(processing||(!busy&&disabled))?0.5:1},
      title:state.message||'Record audio with Microphone',children:recording?u.jsxs('span',{className:'xen-enough-layers',children:[u.jsx('span',{className:'xen-enough-veil xen-enough-veil--left','aria-hidden':'true'}),u.jsx('span',{className:'xen-enough-veil xen-enough-veil--right','aria-hidden':'true'}),u.jsx('span',{className:'xen-enough-ripples','aria-hidden':'true'}),u.jsx('span',{className:'xen-enough-filaments','aria-hidden':'true'}),u.jsx('span',{className:'xen-enough-legend',children:'🎙 Enough! · '+state.seconds.toFixed(1)+' s'})]}):requesting?'🎙 Cancel':processing?'🎙 Importing…':compact&&state.phase==='failed'?'⚠ Microphone':'🎙 Microphone'}),
    recording&&u.jsx('button',{type:'button',onClick:()=>owner.current?.cancel(),className:'rounded border border-neutral-600 px-2 py-1 text-neutral-300','aria-label':'Discard microphone recording',children:compact?'×':'Discard'}),
    u.jsx('span',{role:'status','aria-live':recording?'off':'polite',className:compact?'sr-only':'',style:compact?undefined:{fontSize:10,color:state.phase==='failed'?'#fca5a5':'#94a3b8',maxWidth:260},children:state.message||'Stimme / Mikrofon · bis 60 s'})
  ]});
}
function __forgeObserveIntakeVisibility(element,onHidden){
  const ancestors=[];for(let node=element;node;node=node.parentElement)ancestors.push(node);
  const hidden=()=>ancestors.some(node=>node.hidden||node.getAttribute('aria-hidden')==='true'||getComputedStyle(node).display==='none'||getComputedStyle(node).visibility==='hidden');
  const observer=new MutationObserver(()=>{if(hidden())onHidden();});
  for(const node of ancestors)observer.observe(node,{attributes:true,attributeFilter:['class','style','hidden','aria-hidden']});
  window.addEventListener('pagehide',onHidden);
  return()=>{observer.disconnect();window.removeEventListener('pagehide',onHidden);};
}
function __audioCarrierAnalysisFactory(tools) {
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function analyze({samples,sampleRate,options={}},progress=()=>{}) {
    if(!(samples instanceof Float32Array)||!samples.length||!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000)throw Error('Invalid audio source.');
    const duration=samples.length/sampleRate;
    if(duration<.12||duration>60.01)throw Error('Please select an audio region between 0.12 and 60 seconds.');
    if(["voices","strictness","noiseDb","minimumMs","minHz","maxHz"].some(key=>options[key]!=null&&!Number.isFinite(Number(options[key]))))throw Error("Invalid filter setting.");
    const voices=clamp(Math.round(options.voices??4),1,6),strict=clamp(Number(options.strictness??.5),0,1),gate=Math.pow(10,clamp(Number(options.noiseDb??-46),-80,-15)/20),minimum=clamp(Number(options.minimumMs??90),40,300)/1000;
    const low=clamp(Number(options.minHz??65),35,200),high=clamp(Number(options.maxHz??1600),400,3000),rate=Math.min(12000,sampleRate),step=sampleRate/rate;
    const pcm=new Float32Array(Math.ceil(samples.length/step)),kernel=tools.makeSincKernel(step),model={samples},run={sourceStart:0,sourceEnd:samples.length-1};
    for(let i=0;i<samples.length;i++)if(!Number.isFinite(samples[i]))throw Error('The source contains invalid audio data.');
    for(let i=0;i<pcm.length;i++){
      pcm[i]=kernel?tools.resample(model,run,i*step,kernel):samples[Math.min(samples.length-1,Math.round(i*step))];
      if(i%16384===0)progress(.12*i/pcm.length);
    }
    const windowSize=low<55?4096:2048,size=8192,hop=Math.round(rate*.02),half=windowSize>>1;
    const hann=Float64Array.from({length:windowSize},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/(windowSize-1))),re=new Float64Array(size),im=new Float64Array(size),mag=new Float64Array(size/2),frames=[];
    const gcd=(a,b)=>b?gcd(b,a%b):a;
    function detect(center){
      let mean=0,energy=0,count=0;const radius=Math.round(rate*.02);
      for(let i=Math.max(0,center-radius);i<Math.min(pcm.length,center+radius);i++){mean+=pcm[i];energy+=pcm[i]*pcm[i];count++;}
      if(!count||Math.sqrt(Math.max(0,energy/count-(mean/count)**2))<gate)return [];
      re.fill(0);im.fill(0);mean/=count;
      for(let i=0;i<windowSize;i++)re[i]=((pcm[center-half+i]??0)-mean)*hann[i];
      tools.fft(re,im);
      const lo=Math.max(2,Math.floor(30*size/rate)),hi=Math.min(mag.length-2,Math.ceil(Math.min(5200,rate*.46)*size/rate));
      const floorSamples=[];let maximum=0;
      for(let k=lo;k<hi;k++){mag[k]=Math.hypot(re[k],im[k]);maximum=Math.max(maximum,mag[k]);if(k%4===0)floorSamples.push(mag[k]);}
      floorSamples.sort((a,b)=>a-b);const noise=floorSamples[Math.floor(floorSamples.length*.5)]||0,threshold=Math.max(maximum*.012,noise*(5+strict*11));
      const peaks=[];
      for(let k=lo+1;k<hi-1;k++)if(mag[k]>=threshold&&mag[k]>mag[k-1]&&mag[k]>=mag[k+1]){
        const a=Math.log(mag[k-1]+1e-20),b=Math.log(mag[k]+1e-20),c=Math.log(mag[k+1]+1e-20),delta=clamp(.5*(a-c)/(a-2*b+c||1),-.5,.5);
        peaks.push({hz:(k+delta)*rate/size,amp:mag[k]/Math.max(1e-20,maximum)});
      }
      peaks.sort((a,b)=>b.amp-a.amp);peaks.length=Math.min(peaks.length,96);
      const candidates=new Map();
      for(const p of peaks)for(let h=1;h<=8;h++){const hz=p.hz/h;if(hz<low||hz>high)continue;const key=Math.round(1200*Math.log2(hz)/15);if(!candidates.has(key))candidates.set(key,hz);}
      const residual=peaks.map(p=>p.amp),chosen=[];let first=0;
      for(let voice=0;voice<voices;voice++){
        let best=null;
        for(const hz of candidates.values()){
          let score=0,divisor=0,fund=0,frequencySum=0,weightSum=0;const matched=[];
          for(let i=0;i<peaks.length;i++){
            if(residual[i]<.008)continue;const p=peaks[i],h=Math.round(p.hz/hz);
            if(h<1||h>16||Math.abs(p.hz-h*hz)>Math.max(2.2,p.hz*.012))continue;
            const weight=Math.pow(residual[i],.8)/Math.pow(h,.25);score+=weight;divisor=gcd(divisor,h);if(h===1)fund=residual[i];matched.push(i);frequencySum+=(p.hz/h)*weight;weightSum+=weight;
          }
          if(!matched.length||(!fund&&(matched.length<3||divisor!==1)))continue;
          if(!fund)score*=voices===1?.92:.48;
          if(matched.length===1&&fund<.06+strict*.14)continue;
          score*=1+.025*Math.min(5,matched.length-1);
          if(!best||score>best.score)best={hz:frequencySum/weightSum,score,matched};
        }
        if(!best||best.score<Math.max(.1,first*(.12+strict*.28)))break;
        if(!voice)first=best.score;
        if(chosen.some(p=>Math.abs(1200*Math.log2(p.hz/best.hz))<70))break;
        chosen.push({hz:best.hz,strength:best.score/Math.max(first,1e-8)});
        for(let i=0;i<peaks.length;i++){const h=Math.round(peaks[i].hz/best.hz);if(h>=1&&h<=32&&Math.abs(peaks[i].hz-h*best.hz)<Math.max(2.5,peaks[i].hz*.014))residual[i]=0;}
      }
      return chosen;
    }
    const active=[],finished=[];let serial=0,lastProgress=0;
    function close(track){if(track.points.length*hop/rate>=minimum){if(finished.length>=4096)throw Error("Too many pitch lines. Please select a shorter region or stricter filters.");finished.push(track);}}
    for(let center=Math.floor(hop/2);center<pcm.length;center+=hop){
      const time=center/rate,pitches=detect(center),used=new Set();
      for(const track of active)track.matched=false;
      const pairs=[];for(let t=0;t<active.length;t++)for(let p=0;p<pitches.length;p++){const distance=Math.abs(1200*Math.log2(active[t].points.at(-1).hz/pitches[p].hz));if(distance<85)pairs.push({t,p,distance});}
      pairs.sort((a,b)=>a.distance-b.distance);
      for(const pair of pairs){const track=active[pair.t];if(track.matched||used.has(pair.p))continue;track.points.push({time,hz:pitches[pair.p].hz});track.last=time;track.matched=true;used.add(pair.p);}
      for(let i=active.length-1;i>=0;i--)if(time-active[i].last>.041){close(active[i]);active.splice(i,1);}
      for(let p=0;p<pitches.length;p++)if(!used.has(p)&&active.length<voices)active.push({id:'audio-note-'+serial++,last:time,matched:true,points:[{time,hz:pitches[p].hz}]});
      const fraction=.12+.88*center/pcm.length;
      if(fraction-lastProgress>.02){progress(fraction);lastProgress=fraction;}
      frames.push(pitches.length);
    }
    active.forEach(close);progress(1);
    return {durationSec:duration,hopSec:hop/rate,notes:finished.sort((a,b)=>a.points[0].time-b.points[0].time).map(track=>({id:track.id,startSec:Math.max(0,track.points[0].time-hop/rate/2),endSec:Math.min(duration,track.points.at(-1).time+hop/rate/2),pitchHz:track.points.map(p=>p.hz)})),frames:frames.length,settings:{voices,strictness:strict,noiseDb:20*Math.log10(gate),minimumMs:minimum*1000,minHz:low,maxHz:high}};
  }
  return {analyze};
}
function __audioCarrierWorkerMain(){
  const tools=__forgeGestaltToolsFactory(Math.PI*2,{resamplingPhases:64},(v,a,b)=>Math.max(a,Math.min(b,v)));
  const analyzer=__audioCarrierAnalysisFactory(tools);
  onmessage=({data})=>{try{postMessage({result:analyzer.analyze(data,progress=>postMessage({progress}))});}catch(error){postMessage({error:error?.message||String(error)});}};
}
function __audioCarrierAnalyze(source,range,options,{signal,onProgress=()=>{}}={}){
  return new Promise((resolve,reject)=>{
    if(signal?.aborted){reject(new DOMException('Abgebrochen','AbortError'));return;}
    const rate=source?.sampleRate,start=Math.round(range?.startSec*rate),end=Math.min(source?.monoSamples?.length??0,Math.round((range?.startSec+range?.durationSec)*rate));
    if(!Number.isFinite(rate)||!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||range.durationSec<.12||range.durationSec>60){reject(Error('Please select an audio region between 0.12 and 60 seconds.'));return;}
    let worker,url,timer,settled=false;
    const done=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);worker?.terminate();if(url)URL.revokeObjectURL(url);error?reject(error):resolve(result);};
    const abort=()=>done(new DOMException('Abgebrochen','AbortError'));
    try{
      const code=[__forgeGestaltToolsFactory.toString(),__audioCarrierAnalysisFactory.toString(),'('+__audioCarrierWorkerMain.toString()+')();'].join('\n');
      url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));worker=new Worker(url);
      worker.onmessage=({data})=>{if(data.error)done(Error(data.error));else if(data.result)done(null,data.result);else if(Number.isFinite(data.progress))onProgress(data.progress);};
      worker.onerror=event=>done(Error(event.message||'Audioanalyse fehlgeschlagen.'));
      signal?.addEventListener('abort',abort,{once:true});timer=setTimeout(()=>done(Error('Analysis is taking too long. Please select a shorter region.')),120000);
      const samples=source.monoSamples.slice(start,end);worker.postMessage({samples,sampleRate:rate,options},[samples.buffer]);
    }catch(error){done(error);}
  });
}
function __audioCarrierDocument(result,material){
  const duration=result.durationSec,reference=Math.max(40,material.bpm||108),baseBeats=Math.max(1,material.beatsPerBar||4);
  const beatsPerBar=duration<baseBeats*60/reference?Math.max(1,Math.min(baseBeats,Math.round(duration*reference/60))):baseBeats;
  const bars=Da(Math.round(duration*reference/(60*beatsPerBar))),durationBeats=bars*beatsPerBar,bpm=durationBeats*60/duration;
  return {target:'legacy',transferVersion:3,origin:'audio-to-carrier',name:'Audio Carrier',role:'loop',bars,beatsPerBar,bpm,durationSec:duration,guideSegments:4,guideMarkers:[.25,.5,.75],carrier:{version:'melodic-carrier-v1',origin:'audio-to-carrier',durationBeats,tracks:[{id:'audio-carrier',label:'Audio to Carrier',enabled:true}],notes:result.notes.map(note=>({id:note.id,voiceId:note.id,trackId:'audio-carrier',startBeat:note.startSec*bpm/60,durationBeats:(note.endSec-note.startSec)*bpm/60,pitchHz:note.pitchHz,gainCurve:[.65,.65],fadeInBeats:Math.min(.008,(note.endSec-note.startSec)*.1)*bpm/60,fadeOutBeats:Math.min(.008,(note.endSec-note.startSec)*.1)*bpm/60}))}};
}
function __ForgeDetuneControl(){
 pe(state=>state.renderVersion);const mode=__useForgeListeningMode(),route=pe(state=>__f333Route(state)),grid=pe(state=>state.spectralData),amount=__forgeDetuneAmount(grid.carrierDetune);
 const last=P.useRef(.5),drag=P.useRef(false);if(amount>0)last.current=amount;
 if(mode.value==='donor'||!['carrier','hearing'].includes(route))return null;
 const update=(next,undo=true)=>{const state=pe.getState();if(undo)state.pushUndo();state.spectralData.carrierDetune=__forgeDetuneAmount(next);state.triggerRender();if(!drag.current)__f333PersistNow();};
 return u.jsxs('div',{'data-forge-detune':true,style:{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap'},children:[
  u.jsx('button',{type:'button','aria-pressed':amount>0,onClick:()=>update(amount>0?0:last.current),title:'Detune · compresses and recenters the frequency space. Off: fixed Hz mapping; the drawing stays unchanged.',className:'h-8 rounded border px-2 text-xs '+(amount>0?'border-amber-400 bg-amber-900 text-amber-100':'border-neutral-700 bg-neutral-900 text-neutral-300'),children:'Detune'}),
  amount>0&&u.jsxs('label',{style:{display:'flex',gap:5,alignItems:'center',fontSize:10},children:[u.jsx('input',{type:'range',min:1,max:100,step:1,value:Math.round(amount*100),'aria-label':'Detune amount',style:{width:100},onPointerDown:()=>{pe.getState().pushUndo();drag.current=true;},onPointerUp:()=>{drag.current=false;__f333PersistNow();},onPointerCancel:()=>{drag.current=false;__f333PersistNow();},onBlur:()=>{drag.current=false;__f333PersistNow();},onChange:event=>update(Number(event.currentTarget.value)/100,!drag.current)}),u.jsx('output',{children:Math.round(amount*100)+' %'})]})
 ]});
}
function __AudioToCarrierControls({source,range,disabled=false,onBusyChange}) {
  const [status,setStatus]=P.useState({phase:'idle',progress:0,message:''}),[settings,setSettings]=P.useState({voices:4,strictness:.5,noiseDb:-46,minimumMs:90,register:'standard'});
  const controller=P.useRef(null),generation=P.useRef(0),element=P.useRef(null),filterPanel=P.useRef(null),input=P.useRef(null);
  input.current={source,start:range?.startSec,duration:range?.durationSec};
  const busy=status.phase==='analyzing';
  const cancel=P.useCallback(()=>{generation.current++;controller.current?.abort();controller.current=null;setStatus(previous=>previous.phase==='analyzing'?{phase:'idle',progress:0,message:'Analysis canceled; carrier unchanged.'}:previous);},[]);
  P.useEffect(()=>{onBusyChange?.(busy);},[busy,onBusyChange]);
  P.useEffect(()=>{cancel();setStatus({phase:"idle",progress:0,message:""});},[source,range?.startSec,range?.durationSec,cancel]);
  P.useEffect(()=>{if(disabled)cancel();},[disabled,cancel]);
  P.useEffect(()=>{const unwatch=__forgeObserveIntakeVisibility(element.current,cancel);return()=>{generation.current++;controller.current?.abort();unwatch();};},[cancel]);
   P.useEffect(()=>{const relocate=()=>__forgePositionCarrierFilterPanel(filterPanel.current);
     window.addEventListener('resize',relocate);document.addEventListener('scroll',relocate,true);
     return()=>{window.removeEventListener('resize',relocate);document.removeEventListener('scroll',relocate,true)};},[]);
  async function transform(){
    if(busy||disabled||!source||!range)return;
    const token=++generation.current,abort=new AbortController();controller.current=abort;
    const captured={...input.current},version=pe.getState().renderVersion;
    setStatus({phase:'analyzing',progress:0,message:'Analyzing pitches in the background …'});
    try{
      await new Promise(resolve=>requestAnimationFrame(resolve));
      if(abort.signal.aborted)return;
      const register=settings.register==='deep'?{minHz:35,maxHz:1200}:settings.register==='high'?{minHz:100,maxHz:3000}:{minHz:65,maxHz:1600};
      const result=await __audioCarrierAnalyze(source,range,{...settings,...register},{signal:abort.signal,onProgress:progress=>{if(token===generation.current)setStatus({phase:'analyzing',progress,message:'Analyzing pitches in the background …'});}});
      if(token!==generation.current)return;
      const current=input.current;
      if(current.source!==captured.source||current.start!==captured.start||current.duration!==captured.duration||pe.getState().renderVersion!==version)throw Error('Source, selection, or carrier has changed. Please run the analysis again.');
      if(!result.notes.length)throw Error('No stable notes detected. Lower the noise threshold or strictness, or select a clearer audio region.');
      const transfer=__audioCarrierDocument(result,pe.getState().materialExport);
      transfer.name=(source.fileName||'Audio').replace(/\.[^.]+$/,'')+' · Carrier';
      transfer.carrier.extraction={algorithm:'harmonic-pitch-skeleton-v1',settings:result.settings,sourceName:source.fileName||'Audio',startSec:range.startSec,durationSec:result.durationSec};
      __f334CommitCarrier(transfer,{neutral:true,message:'Audio converted to neutral pitch lines.'});__f333PersistNow();
      setStatus({phase:'idle',progress:1,message:result.notes.length+' pitch lines imported · sound engine preserved · Undo restores the previous figure.'});
      requestAnimationFrame(()=>document.querySelector('#spectralforge-station-draw')?.scrollIntoView({block:'start',behavior:'auto'}));
    }catch(error){if(token===generation.current&&error?.name!=='AbortError'){setStatus({phase:'failed',progress:0,message:error.message||'Audioanalyse fehlgeschlagen.'});if(filterPanel.current){filterPanel.current.open=true;requestAnimationFrame(()=>__forgePositionCarrierFilterPanel(filterPanel.current));}}}
    finally{if(token===generation.current)controller.current=null;}
  }
  const field=(key,label,min,max,step,display)=>u.jsxs('label',{style:{display:'grid',gap:2,minWidth:0,fontSize:10},children:[label,u.jsx('input',{type:'range',min,max,step,value:settings[key],'aria-label':label,onChange:event=>{const next=Number(event.currentTarget.value);setSettings(value=>({...value,[key]:next}));}}),u.jsx('output',{children:display})]});
  return u.jsxs('div',{ref:element,'data-audio-to-carrier':status.phase,className:'xen-carrier-actions',children:[
    u.jsx('button',{type:'button',disabled:!busy&&(disabled||!source||!range),onClick:busy?cancel:transform,'aria-busy':busy,
      title:status.message?status.message+' · Audio to Carrier · Undo remains available.':'Audio to Carrier · detects fundamental pitch lines, including chords, from the Raw Audio selection below. Replaces the carrier figure; Undo remains available.',
      className:__ForgeRackClass('carrier'),
      children:__ForgeRackCaption('carrier',busy?'Cancel · '+Math.round(status.progress*100)+' %':undefined)}),
    u.jsxs('details',{ref:filterPanel,className:'xen-carrier-filter',onToggle:()=>{const target=filterPanel.current;if(target&&!target.open)delete target.dataset.forgeFilterAutoScroll;__forgePositionCarrierFilterPanel(target)},children:[u.jsxs('summary',{title:'Pitch detection filters for Transform to Carrier','aria-label':'Filters for Transform to Carrier',children:[u.jsx('span',{className:'xen-carrier-filter-text',children:'Filter'}),u.jsx('span',{className:'xen-carrier-filter-chevron','aria-hidden':true,children:'⌄'})]}),u.jsx('fieldset',{disabled:busy,className:'xen-carrier-filter-panel',children:u.jsxs(P.Fragment,{children:[
      field('voices','Maximum simultaneous notes',1,6,1,String(settings.voices)),field('noiseDb','Noise threshold',-70,-20,1,settings.noiseDb+' dB'),field('strictness','Detection strictness',0,1,.05,Math.round(settings.strictness*100)+' %'),field('minimumMs','Minimum note length',40,240,10,settings.minimumMs+' ms'),
      u.jsxs('div',{className:'xen-carrier-filter-footer',children:[
        u.jsxs('label',{className:'xen-carrier-range',children:['Pitch range',u.jsxs('select',{'aria-label':'Pitch range',value:settings.register,onChange:event=>{const next=event.currentTarget.value;setSettings(value=>({...value,register:next}));},style:{display:'block',background:'#171322',padding:4,border:'1px solid #4d3e61'},children:[u.jsx('option',{value:'standard',children:'Voice / guitar · 65–1600 Hz'}),u.jsx('option',{value:'deep',children:'Low · 35–1200 Hz'}),u.jsx('option',{value:'high',children:'High · 100–3000 Hz'})]})]}),
        u.jsx('span',{className:'xen-carrier-filter-help',children:'Higher strictness suppresses uncertain notes. Lower the noise threshold for quiet voices. Dense chords and octave doublings may remain ambiguous.'})
      ]}),
      (status.phase!=='idle'||status.message)&&u.jsx('div',{role:'status','aria-live':'polite',className:'xen-carrier-feedback',style:{color:status.phase==='failed'?'#fca5a5':'#b6a8c9'},children:status.message})
    ]})})]})
  ]});
}
function E6e(e){return e?ZK.get(e)??__ForgeF33.getPreloadedMaterialIntakeState(e)??null:null}
function F6e(e,t){e&&(ZK.set(e,t),__ForgeF33.saveMaterialIntakeState(e,t))}
function qM(e){return Math.max(0,Math.min(1,e))}
function WE(e){return Math.max(1,Math.min(8,Math.round(e)))}
function j_(e){return typeof e=="number"&&Number.isFinite(e)&&e>0}
function mA(e){return Math.max(50,Math.min(220,e))}
function G_(e,t,n){const r=Math.max(0,Math.floor(t*e.sampleRate)),a=Math.max(1,Math.floor(n*e.sampleRate)),o=Math.min(e.monoSamples.length,r+a),i=Math.max(1,o-r),s=Math.max(32,Math.min(Math.floor(e.sampleRate*.03),Math.max(32,Math.floor(i*.12))));let l=0,c=0,d=0;for(let b=0;b<s&&r+b<o&&o-s+b>=r;b+=1){const g=e.monoSamples[r+b]??0,y=e.monoSamples[o-s+b]??0,x=g-y;l+=x*x,c+=(g*g+y*y)*.5,d+=1}if(d===0)return 0;const p=Math.sqrt(l/d),f=Math.sqrt(Math.max(1e-8,c/d));return qM(1-p/Math.max(.02,f*1.15))}
function V_(e,t,n){const r=Math.max(0,t-n),a=Math.min(e.length,t+n);if(a<=r)return 0;let o=0;for(let i=r;i<a;i+=1){const s=e[i]??0;o+=s*s}return Math.sqrt(o/Math.max(1,a-r))}
function W_(e,t){const n=Math.max(1,Math.min(e.monoSamples.length-2,Math.floor(t*e.sampleRate))),r=Math.max(16,Math.floor(e.sampleRate*.008)),a=Math.abs(e.monoSamples[n]??0),o=V_(e.monoSamples,n-r,r),i=V_(e.monoSamples,n+r,r),s=1-Math.min(1,Math.abs(o-i)/Math.max(.005,Math.max(o,i)));return qM((1-Math.min(1,a/.45))*.6+s*.4)}
function K6e(e,t,n,r){const a=Q6e(e),o=r?.startSec??t,i=r?r.startSec+r.durationSec:t+n,s=Math.max(0,Math.min(t,o)-Math.max(.2,n*.35)),l=Math.min(e.originalDuration,Math.max(t+n,i)+Math.max(.2,n*.35)),c=Math.max(s+.5,l);return n$(a,s,c,60,210)}
function $6e(e){const t=[e];return e>1&&t.push(e-1),e<8&&t.push(e+1),e%2===0&&e/2>=1&&t.push(e/2),e*2<=8&&t.push(e*2),Array.from(new Set(t.map(WE)))}
function X6e(e,t,n,r,a){const o=H_(e,t,r),i=o.startSec+o.durationSec,s=t+n,l=Math.max(.035,Math.min(.22,a*.22),Math.min(.25,Math.abs(r-n)+a*.12)),c=32,d=Math.max(8,Math.floor(e.sampleRate*.015));let p=o,f=-1/0;for(let b=-c;b<=c;b+=1){const g=Math.max(o.startSec+.08,Math.min(e.originalDuration,i+b/c*l)),y=U6e(e.monoSamples,Math.floor(g*e.sampleRate),d),x=Math.max(.08,y/e.sampleRate-o.startSec),A=H_(e,o.startSec,x),M=A.startSec+A.durationSec,v=G_(e,A.startSec,A.durationSec),w=W_(e,M),R=1-Math.min(1,Math.abs(A.durationSec-r)/Math.max(.08,a*.55)),k=1-Math.min(1,Math.abs(M-s)/Math.max(.08,a*.75)),I=1-Math.abs(b)/(c+1),E=R*.42+k*.31+w*.11+v*.1+I*.06;E>f&&(f=E,p=A)}return{candidate:p,seam:G_(e,p.startSec,p.durationSec),softness:W_(e,p.startSec+p.durationSec),fitScore:Math.max(0,f)}}
function Y6e(e,t,n,r={}){const a=K6e(e,t,n,r.detailViewport),o=mA(Math.round(a.bpm)),i=r.meter,s=j_(i?.bars)?WE(i.bars):null,l=Math.max(1,Math.round(n/Math.max(.001,60/o*4))),c=s??WE(l),d=j_(i?.bpm)?mA(Math.round(i.bpm)):null,p=mA(c*240/Math.max(.25,n)),f=d??mA(a.confidence>=.45?o*.7+p*.3:p*.72+o*.28),b=60/Math.max(1,f),y=(s?[c]:$6e(c)).map(A=>{const M=Math.max(.25,Math.min(e.originalDuration,A*b*4)),v=X6e(e,t,n,M,b),w=1-Math.min(1,Math.abs(v.candidate.durationSec-M)/Math.max(.08,b*.55)),R=1-Math.min(1,Math.abs(v.candidate.durationSec-n)/Math.max(.12,n*.28)),k=qM(v.fitScore*.46+w*.24+R*.24+a.confidence*.06);return{bars:A,bpm:Math.round(f),startSec:t,durationSec:v.candidate.durationSec,confidence:qM(a.confidence*.34+v.seam*.12+v.softness*.14+w*.22+R*.18),fitScore:k}}).sort((A,M)=>A.bars===c&&M.bars!==c?-1:M.bars===c&&A.bars!==c?1:(M.fitScore??0)!==(A.fitScore??0)?(M.fitScore??0)-(A.fitScore??0):Math.abs(A.durationSec-n)-Math.abs(M.durationSec-n));return{primary:y.find(A=>A.bars===c)??y[0],candidates:y.slice(0,4)}}
function eGe(e){return e.replace(/\.[^.]+$/,"").trim()||"material"}
function tGe(e){const t=Math.min(e.durationSec,Math.max(4,J6e)),n=Math.min(t,Math.max(.5,Math.min(Z6e,e.durationSec)));return{detailViewport:{startSec:0,durationSec:t},fineLoopRange:{startSec:0,durationSec:n}}}
function nGe(e,t){return{selection:r$(e),repairResult:t}}
function r$(e){return{detailViewport:{...e.detailViewport},fineLoopRange:{...e.fineLoopRange}}}
function rGe(e,t){return{fineLoopRange:{startSec:e.primary.startSec,durationSec:e.primary.durationSec},detailViewport:$B(e.primary.startSec,e.primary.durationSec,t,2.6)}}
function aGe(e,t){return{fineLoopRange:{startSec:e.startSec,durationSec:e.durationSec},detailViewport:$B(e.startSec,e.durationSec,t,2.6)}}
function oGe(e,t){return`Loop corrected: start remains at ${e.primary.startSec.toFixed(2)}s, end was set to ${a$(e.primary).toFixed(2)}s. Working meter remains at ${t?.bars??e.primary.bars} bars and ${t?.bpm??e.primary.bpm} BPM.`}
function iGe(e){return`Alternative applied: start remains at ${e.startSec.toFixed(2)}s · Ende ${a$(e).toFixed(2)}s. Working meter remains unchanged.`}
function sGe(e){return{success:`The raw loop was set to ${e}.`,failure:`Rohsendung an ${e} failed.`}}
function a$(e){return e.startSec+e.durationSec}
function lGe({sourceAdapters:e,targetAdapter:t,rawTargetAdapter:n,onMetaPatch:r,meter:a,persistenceKey:o,onUseDonorFromLibrary:__useDonor}){const i=E6e(o),__activation=P.useRef(0),__fileLoadSerial=P.useRef(0),__fileLoadPending=P.useRef(false),[s,l]=P.useState(()=>i?.source??null),[c,d]=P.useState(()=>i?.selection??null),[p,f]=P.useState(()=>i?.sourceAdapterId??e[0]?.id??"local-file"),[b,g]=P.useState(()=>i?.readMode??"hybrid"),[y,x]=P.useState(()=>i?.repairResult??null),[A,M]=P.useState(null),[v,w]=P.useState(!1),[R,k]=P.useState(()=>i?.status??"No source loaded yet."),[I,E]=P.useState(!1),F=P.useMemo(()=>e.find(J=>J.id===p)??e[0]??null,[p,e]);P.useEffect(()=>{const update=()=>E(Id.isPlaying());window.addEventListener('xensonar:forge:raw-preview-state',update);return()=>{window.removeEventListener('xensonar:forge:raw-preview-state',update);Id.stop();};},[]),P.useEffect(()=>{F6e(o,{source:s,selection:c,sourceAdapterId:p,readMode:b,repairResult:y,status:R})},[o,b,y,c,s,p,R]);const L=P.useCallback(J=>{d(Z=>!Z||!s?Z:{...Z,detailViewport:VE(J.startSec,J.durationSec,s.durationSec,.15)})},[s]),B=P.useCallback(J=>{d(Z=>!Z||!s?Z:{...Z,fineLoopRange:VE(J.startSec,J.durationSec,s.durationSec,.05)})},[s]),O=P.useCallback(async(J,{fromEditor=false}={})=>{__ForgeDonorRoutingF317.cancel();const sourceAdapter=fromEditor?rVe:F;if(!sourceAdapter?.loadFromFile)return k(sourceAdapter?.unavailableReason??"This source cannot load files in this build."),!1;const epoch=++__fileLoadSerial.current;__fileLoadPending.current=true;w(!0),k(`Loading ${J.name} …`);try{const Z=await sourceAdapter.loadFromFile(J);if(epoch!==__fileLoadSerial.current)return!1;if(fromEditor)f("local-file");const te=__ForgeF33.resolveMaterialIntakeSelection(o,Z)??tGe(Z);return l(Z),d(te),x(null),M(null),E(!1),r?.({name:eGe(Z.label)}),k(`${Z.label} loaded. The middle shows the full WAV; the lower view shows the precise loop.`),!0}catch(Z){if(epoch!==__fileLoadSerial.current)return!1;return console.error("[xensonar][material-intake][load]",Z),k("Source could not be loaded."),!1}finally{if(epoch===__fileLoadSerial.current){__fileLoadPending.current=false;w(!1)}}},[F,r]),T=P.useCallback(()=>{if(!s||!c)return!1;const J=$B(c.fineLoopRange.startSec,c.fineLoopRange.durationSec,s.durationSec,2.4);return d(Z=>Z&&{...Z,detailViewport:J}),k("The lower fine selection now determines the upper view range without changing the fine selection itself."),!0},[c,s]),_=P.useCallback(()=>{M(null),x(null)},[]),G=P.useCallback(async()=>{if(!s||!c)return!1;w(!0),k("Loop repair respects your chosen start point, measures tempo in context, and then primarily adjusts the end.");try{const J=Y6e(s.sourceAsset,c.fineLoopRange.startSec,c.fineLoopRange.durationSec,{detailViewport:c.detailViewport,meter:a});return M(Z=>Z??nGe(c,y)),x(J),d(Z=>Z&&{...Z,...rGe(J,s.durationSec)}),Id.stop(),E(!1),k(oGe(J,a)),!0}catch(J){return console.error("[xensonar][material-intake][repair]",J),k("Loop repair failed."),!1}finally{w(!1)}},[a,y,c,s]),j=P.useCallback(()=>A?(Id.stop(),E(!1),d(r$(A.selection)),x(A.repairResult),M(null),k("Loop correction reverted. Start and end are restored to their pre-correction positions."),!0):!1,[A]),N=P.useCallback(J=>s?(d(Z=>Z&&{...Z,...aGe(J,s.durationSec)}),k(iGe(J)),!0):!1,[s]),W=P.useCallback(async(J,Z=0)=>{if(!s)return!1;try{return await Id.playLoop(s.sourceAsset,J,Z),E(Id.isPlaying()),k(Z>0?"Loop preview jumps to the clicked position of the lower mask.":"Loop preview reads the current lower mask."),!0}catch(te){return console.error("[xensonar][material-intake][preview-restart]",te),k("Loop preview could not be updated."),E(!1),!1}},[s]),V=P.useCallback(async(J,Z)=>{if(!s||!c)return!1;const te=Z??c.fineLoopRange,X=Math.max(0,Math.min(Math.max(0,te.durationSec-.001),J-te.startSec));return W(te,X)},[W,c,s]),U=P.useCallback(J=>{const Z=Id.updateLoopRangeLive(J);return Z&&(E(!0),k("Loop preview follows the moved lower mask without restarting.")),Z},[]),H=P.useCallback(async()=>!s||!c?!1:Id.isPlaying()?(Id.stop(),E(!1),k("Loop preview stopped."),!0):W(c.fineLoopRange),[W,c,s]),q=P.useCallback(async()=>{if(!s||!c)return!1;w(!0),k(`${t.label} is receiving the selected loop …`);try{return await t.commitLoop({source:s,selection:c,readMode:b,repairResult:y}),k("Loop transferred to the Forge-3 workbench."),!0}catch(J){return console.error("[xensonar][material-intake][commit]",J),k("Transfer to workbench failed."),!1}finally{w(!1)}},[b,y,c,s,t]),K=P.useCallback(async(J,Z,te,intent=null)=>{if(!J||!s||!c)return!1;if(J.id==="raw-melodic-pink-lane-send"&&(!intent?.fromUser||intent.sourceId!==s.id||__fileLoadPending.current))return!1;w(!0),k(`${J.label} …`);try{return await J.commitLoop({source:s,selection:c,readMode:b,repairResult:y,exportTitle:te?.trim()||null}),k(Z?.success??`${J.label} abgeschlossen.`),!0}catch(X){return console.error("[xensonar][material-intake][raw-send]",X),k(Z?.failure??`${J.label} failed.`),!1}finally{w(!1)}},[b,y,c,s]),Y=P.useCallback(async J=>n?K(n,sGe("Xensonar"),J):!1,[n,K]);
const __commitWaveDocument=P.useCallback(result=>{
 if(!result?.source?.sourceAsset||!result?.selection)return false;
 const request=__XenForgeRawGain.get(s);
 Id.stop();E(false);__ForgeDonorRoutingF317.cancel();
 __XenForgeRawGain.bind(result.source);__XenForgeRawGain.setRange(result.source,result.selection.fineLoopRange);__XenForgeRawGain.set(result.source,request);
 l(result.source);d(result.selection);x(null);M(null);k("Wave Editor · edited project revision committed. Preview, donor and export use this source.");return true;
},[s]);
const __setWaveSelection=P.useCallback(selection=>{d(selection);},[]);
const __loadDonorLibrary=P.useCallback(async(J,apply=false,requestedTicket=null)=>{
 if(!J?.source?.sourceAsset||!J?.selection)throw Error("Incomplete saved donor.");
 if(!apply&&requestedTicket===null&&!J.__keepPreparedHybrid)__ForgeDonorRoutingF317.cancel();
 if(requestedTicket!==null&&!__ForgeDonorRoutingF317.current(requestedTicket))throw new DOMException("Donor selection superseded.",'AbortError');
 const ticket=apply?(requestedTicket??__ForgeDonorRoutingF317.begin(J.id)):null;
 if(apply&&!__ForgeDonorRoutingF317.current(ticket))throw new DOMException("Donor selection superseded.",'AbortError');
 __activation.current=ticket;Id.stop();E(false);l(J.source);d(J.selection);x(null);M(null);g(J.readMode??'hybrid');f(J.sourceAdapterId??'local-file');r?.({name:eGe(J.source.label)});
 if(!apply){w(false);k(J.__keepPreparedHybrid?"Hybrid donor active in Spectral Forge. Ready for Carrier playback.":"Donor selection loaded as source. The painted figure remains unchanged.");return true;}
 w(true);k("Extracting donor timbre for the painted figure …");
 try{
  if(typeof __useDonor!=='function')throw Error("Donor timbre extraction is unavailable.");
  pe.getState().setCarrierDonorV2DonorUseMode('timbre_projection');
  await new Promise(resolve=>window.requestAnimationFrame(()=>window.requestAnimationFrame(resolve)));
  if(!__ForgeDonorRoutingF317.current(ticket))throw new DOMException("Donor selection superseded.",'AbortError');
  const ok=await __ForgeDonorRoutingF317.invoke(ticket,()=>__useDonor({source:J.source,selection:J.selection,readMode:J.readMode??'hybrid',repairResult:null}));
  if(!__ForgeDonorRoutingF317.current(ticket)||ok===false)throw new DOMException("Donor activation cancelled.",'AbortError');
  if(!Vt.selectDonor()||!__ForgeDonorRoutingF317.applied(ticket,J.id))throw Error("Donor analysis was not activated.");
  pe.getState().setSourcePreviewMode('forge');k("Donor timbre activated · painted figure unchanged.");return true;
 }catch(error){__ForgeDonorRoutingF317.failed(ticket,error);if(__activation.current===ticket)k(error?.name==='AbortError'?"Donor activation cancelled.":"Could not activate donor: "+String(error?.message??error));throw error;}
 finally{if(__activation.current===ticket)w(false);}
},[r,__useDonor]);return{source:s,selection:c,repairResult:y,hasRepairUndo:!!A,status:R,busy:v,previewPlaying:I,readMode:b,sourceAdapterId:p,activeSourceAdapter:F,setSourceAdapterId:f,setReadMode:g,loadSourceFromFile:O,setDetailViewport:L,setFineLoopRange:B,clearRepairUndo:_,fitViewportToFineLoop:T,repairLoop:G,undoRepairLoop:j,applyRepairCandidate:N,togglePreview:H,restartPreviewWithRange:W,scrubPreviewAt:V,updateActivePreviewRange:U,commitToTarget:q,sendRawToAdapter:K,sendRawToTarget:Y,loadLibraryEntry:__loadDonorLibrary,commitWaveDocument:__commitWaveDocument,setWaveSelection:__setWaveSelection,stopWaveSourcePreview:()=>{Id.stop();E(false)}}}
function uGe(e=cGe){const t=P.useRef({}),[n,r]=P.useState({}),[a,o]=P.useState({});P.useEffect(()=>()=>{Object.values(t.current).forEach(l=>window.clearTimeout(l)),t.current={}},[]);const i=P.useCallback(l=>{t.current[l]&&window.clearTimeout(t.current[l]),o(c=>({...c,[l]:!0})),t.current[l]=window.setTimeout(()=>{o(c=>({...c,[l]:!1})),delete t.current[l]},e)},[e]),s=P.useCallback(async(l,c)=>{r(d=>({...d,[l]:!0}));try{const d=await c();return d&&i(l),d}finally{r(d=>({...d,[l]:!1}))}},[i]);return{pendingMap:n,successMap:a,flashSuccess:i,runActionWithFeedback:s}}
function o$(e){if(e.getAttribute("data-spectralforge-scroll-root")==="true")return"spectral-root";const t=e.getAttribute("data-xensonar-scroll-island");return t?"scroll-island:"+t:e.getAttribute("data-wheel-allow-scroll")==="true"?"wheel-allow-scroll":null}
function pGe(e){const t=o$(e),n=e.id?"#"+e.id:"",r=typeof e.className=="string"&&e.className.trim()?"."+e.className.trim().split(/\s+/).slice(0,3).join("."):"";return e.tagName.toLowerCase()+n+r+(t?"["+t+"]":"")}
function hGe(e,t){const n=window.getComputedStyle(t),r=t.getBoundingClientRect(),a=t.scrollHeight>t.clientHeight+2;return{label:e,tag:pGe(t),marker:o$(t),overflowY:n.overflowY,scrollTop:t.scrollTop,scrollHeight:t.scrollHeight,clientHeight:t.clientHeight,canScroll:a,rectTop:Number.isFinite(r.top)?Math.round(r.top):null,rectBottom:Number.isFinite(r.bottom)?Math.round(r.bottom):null}}
function i$(){const e=window.__xensonarSpectralForgeEntryScrollDiag;if(e?.version==="3.2.91.5.20"&&Array.isArray(e.events))return e;const t={version:"3.2.91.5.20",lastOutcome:null,events:[],latestByToken:{}};return window.__xensonarSpectralForgeEntryScrollDiag=t,t}
function Eo(e){try{const t=i$(),n={ts:e.ts??Math.round(performance.now()),...e};t.events.push(n),t.events.length>q_&&t.events.splice(0,t.events.length-q_),n.token&&(t.latestByToken[n.token]=n)}catch{}}
function Q_(e){const n=window.getComputedStyle(e).overflowY;return(n==="auto"||n==="scroll"||n==="overlay")&&e.scrollHeight>e.clientHeight+2}
function fGe(e,t){if(t&&Q_(t))return{element:t,kind:"spectral-root"};let n=e.parentElement;for(;n&&n!==document.body&&n!==document.documentElement;){if(Q_(n))return{element:n,kind:n===t?"spectral-root":"scrollable-parent"};n=n.parentElement}return t?{element:t,kind:"spectral-root"}:{element:null,kind:"window"}}
function Zk(e){return e.element?.scrollTop??document.scrollingElement?.scrollTop??window.scrollY}
function eP(e){return e.element?window.getComputedStyle(e.element).overflowY:"window"}
function gGe(e,t){const n=t.element?.getBoundingClientRect()??null;return n?e.top-n.top:e.top}
function s$(e,t){const n=e.getBoundingClientRect(),r=t.element?.getBoundingClientRect()??{top:0,bottom:window.innerHeight},a=Math.max(n.top,r.top),o=Math.min(n.bottom,r.bottom),i=Math.max(0,o-a);return Math.max(0,Math.min(1,i/Math.max(1,n.height)))}
function bGe(e,t,n){const r=e.getBoundingClientRect(),a=s$(e,t);if(!t.element)return a>.64&&r.top>=n-2&&r.top<=Math.max(n+90,window.innerHeight*.35);const o=t.element.getBoundingClientRect(),i=r.top-o.top;return a>.64&&i>=n-2&&i<=Math.max(n+90,o.height*.35)}
function yGe(e={}){try{const t=document.documentElement,n=document.body,r=window.getComputedStyle(t),a=window.getComputedStyle(n),o=new Set,i=[],s=(c,d)=>{!d||o.has(d)||(o.add(d),i.push(hGe(c,d)))};s("html",t),s("body",n),document.querySelectorAll(mGe).forEach((c,d)=>{s("candidate:"+d,c)});const l={version:"3.2.91.5.20",ts:Math.round(performance.now()),reason:e.reason??"manual",token:e.token??"manual",document:{windowScrollY:Math.round(window.scrollY),documentScrollHeight:document.scrollingElement?.scrollHeight??t.scrollHeight,documentClientHeight:document.scrollingElement?.clientHeight??t.clientHeight,htmlOverflowY:r.overflowY,bodyOverflowY:a.overflowY,bodySpectralForgeActive:n.getAttribute("data-xensonar-spectralforge-active")==="true",documentCanScroll:(document.scrollingElement?.scrollHeight??t.scrollHeight)>(document.scrollingElement?.clientHeight??t.clientHeight)+2},counts:{spectralRoots:document.querySelectorAll(qE).length,materialIntakeTargets:document.querySelectorAll('[data-material-intake-gateway="true"]').length,cutUploadTargets:document.querySelectorAll('[data-cut-upload-entry-target="true"]').length},selectedScroller:e.selectedScroller?{kind:e.selectedScroller.kind,tag:bx(e.selectedScroller)}:null,candidates:i};return window.__xensonarScrollLayerDiag=l,l}catch{return null}}
function U_(e){try{const t=i$();t.lastOutcome=e}catch{}}
function SGe(e={}){const t=e.reason??"manual",n=e.token??"manual",r=e.behavior??"auto",a=e.viewportOffsetPx??8,o=document.querySelector(dGe),i=document.querySelector(qE);if(!o){const M={ok:!1,reason:t,token:n,targetFound:!1,rootFound:!!i,scrollerKind:i?"spectral-root":"none",targetTopInWindow:null,targetTopInScroller:null,scrollerScrollTop:i?.scrollTop??null,scrollTopBefore:i?.scrollTop??null,scrollTopAfter:i?.scrollTop??null,targetTopInWindowBefore:null,targetTopInWindowAfter:null,targetTopInScrollerBefore:null,targetTopInScrollerAfter:null,visibleRatio:null,scrollerTag:i?"div[data-spectralforge-scroll-root]":null,scrollerOverflowY:i?window.getComputedStyle(i).overflowY:null,scrollerScrollHeight:i?.scrollHeight??null,scrollerClientHeight:i?.clientHeight??null};return U_(M),Eo({phase:"target-missing",reason:t,target:wp,token:n,ok:!1,attempt:e.attempt,targetFound:!1,rootFound:!!i,scrollerKind:M.scrollerKind,scrollerTag:M.scrollerTag,scrollerOverflowY:M.scrollerOverflowY,scrollerScrollHeight:M.scrollerScrollHeight,scrollerClientHeight:M.scrollerClientHeight,note:"scroll helper could not find the material intake gateway target"}),M}const s=o.closest(qE)??i,l=fGe(o,s),c=yGe({reason:t,token:n,selectedScroller:l});if(c){const M=c.candidates.filter(v=>v.canScroll).length;Eo({phase:"scroll-layer-snapshot",reason:t,target:wp,token:n,attempt:e.attempt,rootFound:!!s,scrollerKind:l.kind,scrollerTag:bx(l),scrollerOverflowY:eP(l),note:"scroll-layer snapshot: documentCanScroll="+c.document.documentCanScroll+", bodySpectralForgeActive="+c.document.bodySpectralForgeActive+", scrollableCandidates="+M+", spectralRoots="+c.counts.spectralRoots})}const d=o.getBoundingClientRect(),p=gGe(d,l),f=Zk(l);if(Eo({phase:"target-found",reason:t,target:wp,token:n,attempt:e.attempt,targetFound:!0,rootFound:!!s,scrollerKind:l.kind,scrollerTag:bx(l),scrollerOverflowY:eP(l),scrollerScrollHeight:l.element?.scrollHeight??document.scrollingElement?.scrollHeight??null,scrollerClientHeight:l.element?.clientHeight??document.scrollingElement?.clientHeight??null,scrollTopBefore:f,targetTopInWindowBefore:d.top,targetTopInScrollerBefore:p}),l.element){const M=l.element.getBoundingClientRect(),v=l.element.scrollTop+d.top-M.top-a;l.element.scrollTo({top:Math.max(0,v),behavior:r})}else window.scrollTo({top:Math.max(0,window.scrollY+d.top-a),behavior:r});const b=o.getBoundingClientRect();(b.top<a||b.top>window.innerHeight*.72)&&window.scrollTo({top:Math.max(0,window.scrollY+b.top-a),behavior:r});const g=o.getBoundingClientRect(),y=l.element?.getBoundingClientRect()??null,x=s$(o,l),A={ok:bGe(o,l,a),reason:t,token:n,targetFound:!0,rootFound:!!s,scrollerKind:l.kind,targetTopInWindow:g.top,targetTopInScroller:y?g.top-y.top:g.top,scrollerScrollTop:Zk(l),scrollTopBefore:f,scrollTopAfter:Zk(l),targetTopInWindowBefore:d.top,targetTopInWindowAfter:g.top,targetTopInScrollerBefore:p,targetTopInScrollerAfter:y?g.top-y.top:g.top,visibleRatio:x,scrollerTag:bx(l),scrollerOverflowY:eP(l),scrollerScrollHeight:l.element?.scrollHeight??document.scrollingElement?.scrollHeight??null,scrollerClientHeight:l.element?.clientHeight??document.scrollingElement?.clientHeight??null};return U_(A),Eo({phase:"scroll-attempt",reason:t,target:wp,token:n,ok:A.ok,attempt:e.attempt,targetFound:A.targetFound,rootFound:A.rootFound,scrollerKind:A.scrollerKind,scrollerTag:A.scrollerTag,scrollerOverflowY:A.scrollerOverflowY,scrollerScrollHeight:A.scrollerScrollHeight,scrollerClientHeight:A.scrollerClientHeight,scrollTopBefore:A.scrollTopBefore,scrollTopAfter:A.scrollTopAfter,targetTopInWindowBefore:A.targetTopInWindowBefore,targetTopInWindowAfter:A.targetTopInWindowAfter,targetTopInScrollerBefore:A.targetTopInScrollerBefore,targetTopInScrollerAfter:A.targetTopInScrollerAfter,visibleRatio:A.visibleRatio}),A.ok&&Eo({phase:"scroll-applied",reason:t,target:wp,token:n,ok:!0,attempt:e.attempt,visibleRatio:x,scrollTopAfter:A.scrollTopAfter,targetTopInWindowAfter:A.targetTopInWindowAfter,targetTopInScrollerAfter:A.targetTopInScrollerAfter}),A}
function xGe({sourceReady:e,intakeGatewayRef:t,externalLoadFile:n,externalLoadOrigin:r=null,entryScrollIntent:a=null,onExternalLoadConsumed:o,onEntryScrollIntentConsumed:i,loadSourceFromFile:s,runActionWithFeedback:l}){const c=P.useRef(""),d=P.useRef(null),p=P.useRef([]),f=P.useRef([]),b=P.useRef(0),g=P.useRef(e),y=P.useRef(s),x=P.useRef(l),A=P.useRef(o),M=P.useRef(i);P.useEffect(()=>{g.current=e,y.current=s,x.current=l,A.current=o,M.current=i},[s,i,o,l,e]);const v=P.useCallback(I=>{const E=p.current.length>0||f.current.length>0;p.current.forEach(F=>window.cancelAnimationFrame(F)),p.current=[],f.current.forEach(F=>window.clearTimeout(F)),f.current=[],I&&E&&Eo({phase:"cleanup",token:d.current?.token,reason:d.current?.reason,target:d.current?.target,note:"cleared scheduled entry-scroll convergence passes"})},[]),w=P.useCallback(()=>{v(!0)},[v]),R=P.useCallback((I="auto")=>{const E=d.current;if(!dy(E))return!1;const F=b.current+1;b.current=F;const L=t.current;L&&(L.scrollIntoView({block:"start",inline:"nearest",behavior:I}),window.scrollY>tP&&window.scrollBy({top:-tP,left:0,behavior:"auto"}));const B=SGe({reason:E.reason,token:E.token,behavior:I,viewportOffsetPx:tP,attempt:F});return B.ok?(Eo({phase:"intent-consumed",reason:E.reason,target:E.target,token:E.token,ok:!0,attempt:F,visibleRatio:B.visibleRatio,scrollTopAfter:B.scrollTopAfter,targetTopInWindowAfter:B.targetTopInWindowAfter,targetTopInScrollerAfter:B.targetTopInScrollerAfter}),d.current=null,w(),M.current?.(E.token),!0):(Eo({phase:"intent-still-pending",reason:E.reason,target:E.target,token:E.token,ok:!1,attempt:F,visibleRatio:B.visibleRatio,scrollTopAfter:B.scrollTopAfter,targetTopInWindowAfter:B.targetTopInWindowAfter,targetTopInScrollerAfter:B.targetTopInScrollerAfter,note:"scroll pass did not yet place the gateway visibly near the top"}),!1)},[w,t]),k=P.useCallback(()=>{if(!dy(d.current))return;const I=d.current;Eo({phase:"intent-scheduled",reason:I.reason,target:I.target,token:I.token,sourceReady:g.current,note:"starting RAF/timer convergence for material-intake gateway entry"}),w();const E=F=>{const L=window.requestAnimationFrame(()=>{p.current=p.current.filter(B=>B!==L),!R("auto")&&F>0&&E(F-1)});p.current.push(L)};E(AGe),f.current=vGe.map(F=>window.setTimeout(()=>{const L=F>=1320?"smooth":"auto";R(L)},F))},[w,R]);P.useEffect(()=>()=>{v(!1)},[v]),P.useEffect(()=>{if(!n){c.current="";return}const I=`${n.name}:${n.size}:${n.lastModified}:${r??"manual"}`;if(c.current===I)return;c.current=I;let E=!1;return dy(a)&&(d.current=a,Eo({phase:"intent-pending",reason:a.reason,target:a.target,token:a.token,fileSignature:I,note:"external file load attached a scroll intent before decoding"})),Eo({phase:"load-started",reason:a?.reason,target:a?.target,token:a?.token,fileSignature:I,sourceReady:g.current}),x.current("load",async()=>{const F=await y.current(n);return Eo({phase:"load-finished",reason:a?.reason,target:a?.target,token:a?.token,ok:F,fileSignature:I,sourceReady:F}),F&&!E&&k(),E?!1:F}).finally(()=>{E||(Eo({phase:"external-load-consumed",reason:a?.reason,target:a?.target,token:a?.token,fileSignature:I,note:"file/origin cleanup acknowledged separately from entry-scroll intent consumption"}),A.current?.())}),()=>{E=!0,Eo({phase:"load-cancelled",reason:a?.reason,target:a?.target,token:a?.token,fileSignature:I})}},[a,n,r,k]),P.useEffect(()=>{dy(a)&&(Eo({phase:"intent-seen",reason:a.reason,target:a.target,token:a.token,sourceReady:g.current,note:"MaterialIntakePanel observed a valid material-intake entry scroll intent"}),d.current=a,k())},[a,k,e])}
function Jb(e){return Math.max(0,Math.min(1,e))}
function pA(e,t,n){return t<=0?0:e/t*n}
function K_(e,t,n,r,a,rawGain=1){const o=r*.5;e.strokeStyle=a,e.lineWidth=1,e.beginPath();for(let i=0;i<n;i+=1){const s=Math.min(t.length-1,Math.floor(i/Math.max(1,n-1)*t.length)),l=Math.min(1,Math.max(0,(t[s]??0)*rawGain)),c=o-l*(r*.42),d=o+l*(r*.42);e.moveTo(i+.5,c),e.lineTo(i+.5,d)}e.stroke()}
function MGe(e,t,n,r){const a=new Float32Array(r);if(e.length===0||t<=0)return a;const o=Math.max(0,Math.floor(n.startSec*t)),i=Math.min(e.length,Math.max(o+1,Math.floor(pc(n)*t))),s=Math.max(1,i-o);for(let l=0;l<r;l+=1){const c=o+Math.floor(l/r*s),d=Math.min(i,o+Math.max(1,Math.floor((l+1)/r*s)));let p=0;for(let f=c;f<d;f+=1){const b=Math.abs(e[f]??0);b>p&&(p=b)}a[l]=p}return a}
function wGe(e,t,n,r,a,o,i){e.clearRect(0,0,t,n),e.fillStyle="#020617",e.fillRect(0,0,t,n),e.strokeStyle="rgba(148,163,184,0.28)",e.beginPath(),e.moveTo(0,n-.5),e.lineTo(t,n-.5),e.stroke();const s=Ty(a,r);if(!s)return;const l=Math.max(1e-4,r.durationSec),c=(s.startSec-r.startSec)/l,d=s.durationSec/l,p=c*t,f=Math.max(2,d*t);e.fillStyle="rgba(34, 211, 238, 0.09)",e.fillRect(p,0,f,n),e.strokeStyle="rgba(34, 211, 238, 0.92)",e.lineWidth=1.4,e.strokeRect(p+.5,.5,Math.max(1,f-1),n-1);const b=__xenAudioMaterialBars(o?.bars??1),g=Array.isArray(o?.guideMarkers)?o.guideMarkers:[],y=a.startSec,x=Math.max(1e-4,a.durationSec),barSec=x/b;for(let M=0;M<=Math.floor(b);M+=1){const v=y+M*barSec;if(v<r.startSec||v>r.startSec+r.durationSec)continue;const R=(v-r.startSec)/l*t;e.strokeStyle=M===0?"rgba(250, 204, 21, 0.95)":"rgba(168, 85, 247, 0.82)",e.lineWidth=M===0?2:1.5,e.beginPath(),e.moveTo(R+.5,0),e.lineTo(R+.5,n),e.stroke(),M<b&&(e.fillStyle=M===0?"rgba(250, 204, 21, 0.95)":"rgba(168, 85, 247, 0.88)",e.font="11px sans-serif",e.fillText(String(M+1),Math.min(t-12,R+4),11))}for(let M=0;M<Math.ceil(b);M+=1){const v=y+M*barSec,w=barSec;for(const R of g){const k=v+R*w;if(k<r.startSec||k>r.startSec+r.durationSec)continue;const E=(k-r.startSec)/l*t;e.strokeStyle="rgba(248,250,252,0.42)",e.lineWidth=1,e.beginPath(),e.moveTo(E+.5,n*.34),e.lineTo(E+.5,n),e.stroke()}}e.fillStyle="rgba(148,163,184,0.82)",e.font="10px sans-serif";const A=o?.bpm?`${Math.round(o.bpm)} BPM`:"BPM unset";if(i!=null&&i>=a.startSec&&i<=pc(a)){const v=(i-r.startSec)/l*t;e.strokeStyle="rgba(34, 197, 94, 0.98)",e.lineWidth=2,e.beginPath(),e.moveTo(v+.5,0),e.lineTo(v+.5,n),e.stroke()}n>=28&&e.fillText(`Taktometer · Start = 1 · ${b} bars · ${A}`,8,n-7)}
function hA(e,t,n){const r=Math.max(n*8,t.durationSec*.025,.015),a=t.startSec,o=pc(t);return Math.abs(e-a)<=r?"resize-start":Math.abs(e-o)<=r?"resize-end":e>=a&&e<=o?"move":"new"}
function $_(e,t,n,r){let a=t.startSec,o=t.durationSec;if(t.mode==="move")a=t.startSec+(e-t.anchorTime);else if(t.mode==="resize-start"){const l=t.startSec+t.durationSec;a=Math.min(e,l-r),o=l-a}else t.mode==="resize-end"?o=Math.max(t.startSec+r,e)-t.startSec:(a=Math.min(t.anchorTime,e),o=Math.abs(e-t.anchorTime));const i=Math.max(r,Math.min(n,o));return{startSec:Math.max(0,Math.min(n-i,a)),durationSec:i}}
// P10 — lower purple Term Mask only: a drag from the interior defines a new mask.
// The upper overview retains its independent move/resize behavior.
function __xenP10DetailMode(mode){return mode==="move"?"new":mode}
function __xenP10CrossedDragThreshold(x0,x1){return Math.abs(x1-x0)>=4}
const __XenForgeWaveformCache=new WeakMap();
function __XenForgeWaveformEnvelope(asset,range,width){
 const old=__XenForgeWaveformCache.get(asset);
 if(old&&old.start===range.startSec&&old.duration===range.durationSec&&old.width===width)return old.values;
 const values=MGe(asset.monoSamples,asset.sampleRate,range,width);
 __XenForgeWaveformCache.set(asset,{start:range.startSec,duration:range.durationSec,width,values});
 return values;
}

function __XenWaveNativeMorph({detailRef:e}){
 const editor=globalThis.__XenWaveUIW01.getEditor(e.current);
 const binding=editor?.nativeMorphBinding?.();
 if(!binding)return null;
 const field=Zr(null),values=binding.read(field.deformation.resolution);
 field.range={startRatio:0,endRatio:1};
 field.deformation.curve=[...values];field.deformation.interior=[...values];
 field.edgeHandles={left:values[0]??0,right:values[values.length-1]??0};
 field.targetSlots['dynamic-fade']={edgeHandles:{...field.edgeHandles},deformation:{...field.deformation,curve:[...values],interior:[...values],xOffsets:new Array(values.length).fill(0)}};
 const history={capture:binding.capture,undo:binding.undo,canUndo:binding.canUndo};
 return ao.createPortal(u.jsx('div',{'data-xwe-native-morph':'true',children:u.jsx(G$,{
  fieldInput:field,historyKey:binding.key,fixedTarget:'dynamic-fade',compact:true,
  title:binding.title,xweExpandMorph:binding.expand,description:'',statusDescription:'',historyController:history,showBypass:false,showGrid:false,
  onCommit:(next,message)=>binding.commit(next.deformation.curve,message)
 })}),binding.host);
}

function __XenWaveOfflineEQPortal({detailRef:e}){
 const editor=globalThis.__XenWaveUIW01.getEditor(e.current);
 const binding=editor?.offlineEqBinding?.();
 const [expanded,setExpanded]=P.useState(false);
 if(!binding)return null;
 return ao.createPortal(u.jsx('div',{'data-xwe-offline-eq':'true',children:u.jsx(__XenEQPanel,{
  sourceKey:binding.key,owner:'Wave Editor · Offline',onClose:binding.close,expanded,setExpanded
 })}),binding.host);
}
function RGe(e){const{source:t,selection:n,previewPlaying:r,meter:a,setDetailViewport:o,setFineLoopRange:i,clearRepairUndo:s,scrubPreviewAt:l,updateActivePreviewRange:c}=e,d=P.useRef(null),p=P.useRef(null),f=P.useRef(null),[b,g]=P.useState(null),[y,x]=P.useState(null),[A,M]=P.useState("crosshair"),[v,w]=P.useState("crosshair"),[rawGainRevision,bumpRawGain]=P.useState(0),[waveEditorRevision,bumpWaveEditor]=P.useState(0);
 P.useEffect(()=>{if(!t||!p.current)return;return globalThis.__XenWaveUIW01.attach({source:t,selection:n,detailCanvas:p.current,overviewCanvas:d.current,onCommit:e.commitWaveDocument,onSelection:e.setWaveSelection,stopSourcePreview:e.stopWaveSourcePreview,onViewChange:()=>bumpWaveEditor(v=>v+1)})},[!!t]);
 P.useLayoutEffect(()=>{if(t&&p.current)globalThis.__XenWaveUIW01.getEditor(p.current)?.update({source:t,selection:n,detailCanvas:p.current,overviewCanvas:d.current,onCommit:e.commitWaveDocument,onSelection:e.setWaveSelection,stopSourcePreview:e.stopWaveSourcePreview,onViewChange:()=>bumpWaveEditor(v=>v+1)})});
 P.useEffect(()=>__XenForgeRawGain.subscribe(()=>bumpRawGain(v=>v+1)),[]);
 P.useLayoutEffect(()=>{if(t){__XenForgeRawGain.bind(t);if(n?.fineLoopRange)__XenForgeRawGain.setRange(t,n.fineLoopRange)}},[t?.id,t?.sourceAsset,n?.fineLoopRange?.startSec,n?.fineLoopRange?.durationSec]);
 return P.useEffect(()=>{if(!r||!n){x(null);return}let F=0;const L=()=>{x(Id.getPlaybackOffsetSec()),F=window.requestAnimationFrame(L)};return L(),()=>window.cancelAnimationFrame(F)},[r,n]),P.useEffect(()=>{const F=d.current;if(!F||!t||!n)return;const L=F.getContext("2d");if(!L)return;const{width:B,height:O}=F;L.clearRect(0,0,B,O),L.fillStyle="#020617",L.fillRect(0,0,B,O),L.strokeStyle="rgba(148,163,184,0.35)",L.beginPath(),L.moveTo(0,O*.5+.5),L.lineTo(B,O*.5+.5),L.stroke(),(globalThis.__XenWaveUIW01.enabled(p.current)&&globalThis.__XenWaveUIW01.drawStereo(L,t.sourceAsset,{startSec:0,durationSec:t.durationSec},B,O,__XenForgeRawGain.effective(t)))||K_(L,t.waveformPreview,B,O,"rgba(248,250,252,0.92)",__XenForgeRawGain.effective(t));const T=pA(n.detailViewport.startSec,t.durationSec,B),_=Math.max(2,pA(n.detailViewport.durationSec,t.durationSec,B));L.fillStyle="rgba(34, 211, 238, 0.12)",L.fillRect(T,0,_,O),L.strokeStyle="rgba(34, 211, 238, 0.95)",L.lineWidth=1.5,L.strokeRect(T+.5,.5,Math.max(1,_-1),O-1);if(!globalThis.__XenWaveUIW01.enabled(p.current)){const G=pA(n.fineLoopRange.startSec,t.durationSec,B),j=Math.max(2,pA(n.fineLoopRange.durationSec,t.durationSec,B));L.fillStyle="rgba(168, 85, 247, 0.13)",L.fillRect(G,6,j,O-12),L.strokeStyle="rgba(168, 85, 247, 0.95)",L.strokeRect(G+.5,6.5,Math.max(1,j-1),O-13);}globalThis.__XenWaveUIW01.drawEditSelection?.(L,p.current,{startSec:0,durationSec:t.durationSec},B,O)},[n,t,rawGainRevision,waveEditorRevision]),P.useEffect(()=>{const F=p.current;if(!F||!t||!n)return;const L=F.getContext("2d");if(!L)return;const{width:B,height:O}=F;L.clearRect(0,0,B,O),L.fillStyle="#020617",L.fillRect(0,0,B,O),L.strokeStyle="rgba(148,163,184,0.35)",L.beginPath(),L.moveTo(0,O*.5+.5),L.lineTo(B,O*.5+.5),L.stroke();const T=__XenForgeWaveformEnvelope(t.sourceAsset,n.detailViewport,B);(globalThis.__XenWaveUIW01.enabled(p.current)&&globalThis.__XenWaveUIW01.drawStereo(L,t.sourceAsset,n.detailViewport,B,O,__XenForgeRawGain.effective(t)))||K_(L,T,B,O,"rgba(248,250,252,0.92)",__XenForgeRawGain.effective(t));const _=Ty(n.fineLoopRange,n.detailViewport);if(_&&!globalThis.__XenWaveUIW01.enabled(p.current)){const G=(_.startSec-n.detailViewport.startSec)/Math.max(1e-4,n.detailViewport.durationSec),j=_.durationSec/Math.max(1e-4,n.detailViewport.durationSec),N=G*B,W=Math.max(2,j*B);if(L.fillStyle="rgba(168, 85, 247, 0.16)",L.fillRect(N,0,W,O),L.strokeStyle="rgba(168, 85, 247, 0.95)",L.lineWidth=1.5,L.strokeRect(N+.5,.5,Math.max(1,W-1),O-1),r&&y!=null){const V=n.fineLoopRange.startSec+y;if(V>=_.startSec&&V<=pc(_)){const H=(V-n.detailViewport.startSec)/Math.max(1e-4,n.detailViewport.durationSec)*B;L.strokeStyle="rgba(34, 197, 94, 0.98)",L.lineWidth=2,L.beginPath(),L.moveTo(H+.5,0),L.lineTo(H+.5,O),L.stroke()}}};globalThis.__XenWaveUIW01.drawEditSelection?.(L,p.current,n.detailViewport,B,O)},[a,y,r,n,t,rawGainRevision,waveEditorRevision]),P.useEffect(()=>{const F=f.current;if(!F||!n)return;const L=F.getContext("2d");if(!L)return;const B=r&&y!=null?n.fineLoopRange.startSec+y:null;wGe(L,F.width,F.height,n.detailViewport,n.fineLoopRange,a,B)},[a,y,r,n]),P.useEffect(()=>{if(!b||!t||!n)return;
 const F=B=>{if(b.pointerId!=null&&B.pointerId!==b.pointerId)return;const O=b.target==="overview"?d.current:p.current;if(!O)return;
 const T=O.getBoundingClientRect(),_="clientX"in B?B.clientX:0,G=Jb((_-T.left)/Math.max(1,T.width)),j=t.durationSec;
 if(b.target==="overview"){const N=G*t.durationSec;o($_(N,b,j,.15));return}
 // Do not mutate the lower mask or repair undo on click / 1-3px jitter.
 if(!b.activated){if(!__xenP10CrossedDragThreshold(b.clientX,_))return;b.activated=true}
 const N=n.detailViewport,W=N.startSec+G*N.durationSec,V=$_(W,b,j,.05);i(V),r&&c(V)
 },L=B=>{if(b.pointerId!=null&&B.pointerId!==b.pointerId)return;
 if(b.finished||b.cancelled)return;b.finished=true;
 if(b.target==="detail"&&b.activated&&b.mode==="new")s();g(null)
 },K=B=>{if(B?.pointerId!=null&&b.pointerId!=null&&B.pointerId!==b.pointerId)return;
 // Cancellation is not a commit: restore the original purple mask, including preview.
 if(b.finished||b.cancelled)return;b.cancelled=true;
 if(b.target==="detail"&&b.activated&&b.originalMask){i(b.originalMask);r&&c(b.originalMask)}g(null)
 };
 window.addEventListener("pointermove",F);window.addEventListener("pointerup",L);
 window.addEventListener("pointercancel",K);window.addEventListener("blur",K);
 return()=>{window.removeEventListener("pointermove",F);window.removeEventListener("pointerup",L);
 window.removeEventListener("pointercancel",K);window.removeEventListener("blur",K)}
 },[b,r,n,o,i,t,c,s]),{overviewRef:d,detailRef:p,playstripRef:f,overviewCursor:A,detailCursor:v,resetOverviewCursor:()=>M("crosshair"),resetDetailCursor:()=>w("crosshair"),updateOverviewCursor:F=>{if(!t||!n){M("crosshair");return}const L=F.currentTarget.getBoundingClientRect(),O=Jb((F.clientX-L.left)/Math.max(1,L.width))*t.durationSec,T=hA(O,n.detailViewport,t.durationSec/Math.max(1,L.width));M(T==="resize-start"||T==="resize-end"?"ew-resize":T==="move"?"pointer":"crosshair")},updateDetailCursor:F=>{if(!t||!n){w("crosshair");return}const L=F.currentTarget.getBoundingClientRect(),B=Jb((F.clientX-L.left)/Math.max(1,L.width)),O=n.detailViewport.startSec+B*n.detailViewport.durationSec,T=Ty(n.fineLoopRange,n.detailViewport)??n.fineLoopRange,_=hA(O,T,n.detailViewport.durationSec/Math.max(1,L.width));w(_==="resize-start"||_==="resize-end"?"ew-resize":"crosshair")},beginOverviewDrag:F=>{if(F.button!==0||!t||!n)return;const L=F.currentTarget.getBoundingClientRect(),O=Jb((F.clientX-L.left)/Math.max(1,L.width))*t.durationSec,T=hA(O,n.detailViewport,t.durationSec/Math.max(1,L.width));T==="move"&&!globalThis.__XenWaveUIW01.enabled(p.current)&&l(O),g({target:"overview",mode:T,anchorTime:O,startSec:T==="new"?O:n.detailViewport.startSec,durationSec:T==="new"?.15:n.detailViewport.durationSec})},beginDetailDrag:F=>{if(F.button!==0||!t||!n)return;const L=F.currentTarget.getBoundingClientRect(),B=Jb((F.clientX-L.left)/Math.max(1,L.width)),O=n.detailViewport.startSec+B*n.detailViewport.durationSec,T=Ty(n.fineLoopRange,n.detailViewport)??n.fineLoopRange,_=hA(O,T,n.detailViewport.durationSec/Math.max(1,L.width));const D=__xenP10DetailMode(_);g({target:"detail",pointerId:F.pointerId,clientX:F.clientX,activated:false,originalMask:{...n.fineLoopRange},mode:D,anchorTime:O,startSec:D==="new"?O:n.fineLoopRange.startSec,durationSec:D==="new"?.05:n.fineLoopRange.durationSec})}}}
function fA(e){const t=(e?.sourceAsset?.fileName||e?.label||"").trim();return t.replace(/\.[a-z0-9]{1,8}$/i,"").trim()||t||"Audio Selection"}
function __f3562SameMask(a,b){
 if(!a||!b)return false;
 const close=(x,y)=>Math.abs(Number(x)-Number(y))<1/Math.max(1,a.sampleRate||b.sampleRate||48000);
 return a.sampleRate===b.sampleRate&&a.monoSamples===b.monoSamples&&
        close(a.importStartSec,b.importStartSec)&&close(a.importDurationSec,b.importDurationSec);
}
function __f435OnExtractTimbre(){
 const mode=__ForgeListeningMode.value();
 if(mode==='fractalia'||mode==='donor')return mode;
 __ForgeListeningMode.choose('donor',{prepare:false});
 return 'donor';
}
function __xenForgeTimbreProvenanceP29({runtime,activeLibraryId,rawAsset,mask}) {
 const ready=!!(runtime?.model?.hybrid&&runtime?.source);
 if(ready&&activeLibraryId)return 'Library · '+(runtime.source?.fileName||activeLibraryId);
 if(ready)return 'Cache · Prepared Timbre';
 if(rawAsset&&Number.isFinite(mask?.durationSec)&&mask.durationSec>0)
   return 'Current Purple Mask · auto-extract when listening to Donor';
 if(rawAsset)return 'Raw Audio · select the purple mask';
 return 'Audio Import Missing · Donor Library Entry Missing';
}
function CGe(props){
 const key=props.persistenceKey??null;
 const [attempt,retry]=P.useState(0),[restoration,setRestoration]=P.useState({key:null,status:'loading',error:null});
 P.useEffect(()=>{
  const controller=new AbortController();
  setRestoration({key,status:'loading',error:null});
  __ForgeF33.ensureMaterialIntakeState(key,{signal:controller.signal}).then(()=>{
   if(!controller.signal.aborted)setRestoration({key,status:'ready',error:null});
  },error=>{if(!controller.signal.aborted)setRestoration({key,status:'error',error});});
  return()=>controller.abort();
 },[key,attempt]);
 if(restoration.key===key&&restoration.status==='ready')return u.jsx(__CGeHydrated,{...props},key??'unsaved');
 if(restoration.key===key&&restoration.status==='error')return u.jsxs('div',{'data-material-intake-restoration':'error',role:'alert',children:[u.jsx('p',{children:String(restoration.error?.message??'Saved source could not be restored.')}),u.jsx('button',{type:'button',onClick:()=>retry(value=>value+1),children:'Retry saved source'})]});
 return u.jsx('div',{'data-material-intake-restoration':'loading',role:'status',children:'Restoring saved source …'});
}

function __XenWaveTaktometer({canvasRef,meta,onPatch,disabled}){
 const [opened,setOpened]=P.useState(false),anchor=P.useRef(null),popupRef=P.useRef(null);
 const [requestedLeft,setRequestedLeft]=P.useState(0),[popupLeft,setPopupLeft]=P.useState(0);
 // The bar-meter spans the whole workspace. Anchor the settings to the
 // point clicked *within* that ruler, not to its permanently left-aligned DOM wrapper.
 const openAt=(event,allowClose)=>{
  const rect=anchor.current?.getBoundingClientRect();
  if(rect)setRequestedLeft(Math.max(0,Math.min(rect.width,event.clientX-rect.left)));
  setOpened(previous=>allowClose?!previous:true);
 };
 P.useLayoutEffect(()=>{
  if(!opened||!anchor.current||!popupRef.current)return;
  const anchorRect=anchor.current.getBoundingClientRect();
  const popupWidth=popupRef.current.getBoundingClientRect().width;
  // Prefer the pointer's X, but keep all fields and Close reachable at
  // narrow widths and at the right edge of the window.
  const maxLeft=Math.max(0,Math.min(anchorRect.width-popupWidth,innerWidth-anchorRect.left-popupWidth-8));
  const next=Math.max(0,Math.min(requestedLeft,maxLeft));
  setPopupLeft(before=>Math.abs(before-next)<0.5?before:next);
 },[opened,requestedLeft]);
 P.useEffect(()=>{
  if(!opened)return;
  const outside=event=>{if(!anchor.current?.contains(event.target))setOpened(false)};
  const escape=event=>{if(event.key==='Escape')setOpened(false)};
  document.addEventListener('pointerdown',outside,true);
  document.addEventListener('keydown',escape,true);
  return()=>{document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',escape,true)};
 },[opened]);
 const edit=(key,event)=>{if(disabled||!onPatch)return;const value=Math.max(1,Math.min(16,Math.round(Number(event.currentTarget.value)||1)));onPatch({[key]:value})};
 const field=(key,label)=>u.jsxs('label',{children:[label,key==='bars'?u.jsx(__XenMaterialBarsInput,{value:meta?.bars??1,disabled:disabled||!onPatch,onCommit:bars=>onPatch({bars}),'aria-label':label}):u.jsx('input',{type:'number',min:1,max:16,step:1,value:meta?.[key]??1,disabled:disabled||!onPatch,'aria-label':label,onChange:event=>edit(key,event)})]});
 return u.jsxs('div',{ref:anchor,'data-xwe-meter-anchor':'true',children:[
  u.jsx('canvas',{ref:canvasRef,width:1200,height:18,'data-xen-bar-meter':'true',title:'Taktometer · Klicken für Takte und Segmente',className:'w-full border border-neutral-800 bg-black',onClick:event=>openAt(event,true),onContextMenu:event=>{event.preventDefault();openAt(event,false)}}),
  opened?u.jsxs('div',{ref:popupRef,'data-xwe-meter-menu':'true',className:'xwe-meter-popup',style:{left:popupLeft},children:[field('bars','Number of Bars'),field('guideSegments','Number of Segments'),u.jsx('button',{type:'button',onClick:()=>setOpened(false),title:'Taktometer schließen',children:'×'})]}):null
 ]});
}

function __CGeHydrated({sourceAdapters:e,targetAdapter:t,rawTargetAdapter:n,rawRootFollowTargetAdapter:r,rawMelodicPinkLaneTargetAdapter:a,rawMelodicSampleTargetAdapter:o,onMetaPatch:i,exportMeta:s,meter:l,persistenceKey:c,externalLoadFile:d,onExternalLoadConsumed:p,externalLoadOrigin:f=null,entryScrollIntent:b=null,onEntryScrollIntentConsumed:g,loadButtonLabel:y="Load Source",onExtractTimbre:x,onApplyTimbre:A,onDonorInputChange:M,onEmbodyTimbre:v,timbreStatusLabel:w,embodimentStatusLabel:R}){const k=P.useRef(null),I=P.useRef(null),{source:E,selection:F,repairResult:L,hasRepairUndo:B,status:O,busy:T,previewPlaying:_,readMode:G,sourceAdapterId:j,activeSourceAdapter:N,setSourceAdapterId:W,setReadMode:V,loadSourceFromFile:U,setDetailViewport:H,setFineLoopRange:q,clearRepairUndo:K,fitViewportToFineLoop:Y,repairLoop:J,undoRepairLoop:Z,applyRepairCandidate:te,togglePreview:X,scrubPreviewAt:Q,updateActivePreviewRange:ne,commitToTarget:ee,sendRawToAdapter:ie,sendRawToTarget:de,loadLibraryEntry:__loadLibraryEntry,commitWaveDocument:__commitWaveDocument,setWaveSelection:__setWaveSelection,stopWaveSourcePreview:__stopWaveSourcePreview}=lGe({sourceAdapters:e,targetAdapter:t,rawTargetAdapter:n,onMetaPatch:i,meter:l,persistenceKey:c,onUseDonorFromLibrary:v}),[oe,ue]=P.useState(()=>fA(E)),[__libraryOpen,__setLibraryOpen]=P.useState(false),[__libraryRevision,__setLibraryRevision]=P.useState(0),[__micBusy,__setMicBusy]=P.useState(false),[__carrierBusy,__setCarrierBusy]=P.useState(false);
 // P29: keep the original Additional Sound Paths & Diagnostics as the single
 // accessible home for status, raw metadata, and optional tempo hypotheses.
 const [__diagTargetP29,__setDiagTargetP29]=P.useState(null);
 const __donorRuntimeP29=P.useSyncExternalStore(Vt.subscribe,Vt.getSnapshot,Vt.getSnapshot);
 const __donorRouteP29=P.useSyncExternalStore(__ForgeDonorRoutingF317.subscribe,__ForgeDonorRoutingF317.getSnapshot,__ForgeDonorRoutingF317.getSnapshot);
 P.useEffect(()=>{
   if(c!=='spectral-forge3')return;
   // Parent owns the disclosure and may mount it AFTER Material Intake.
   // Keep one canonical diagnostics home; never expose a fallback beside NAME.
   const selector='[data-forge-material-diagnostics-slot="true"]';
   const locate=()=>{const node=document.querySelector(selector);if(node){
     __setDiagTargetP29(previous=>previous===node?previous:node);return true;
   }return false;};
   if(locate())return;
   const observer=new MutationObserver(()=>{if(locate())observer.disconnect();});
   observer.observe(document.body||document.documentElement,{subtree:true,childList:true});
   return()=>observer.disconnect();
 },[c]);
 P.useEffect(()=>{if(c!=='spectral-forge3')return;const onApply=event=>{const req=event.detail;if(!req?.id||req.handled)return;req.handled=true;if(__ForgeDonorRoutingF317.activeId()===req.id&&Vt.getSnapshot().model){Vt.selectDonor();pe.getState().setSourcePreviewMode('forge');req.resolve?.();return;}const ticket=__ForgeDonorRoutingF317.begin(req.id);Promise.resolve().then(async()=>{const donor=await __DonorLibraryF36.donorLibrary.load(req.id);if(!__ForgeDonorRoutingF317.current(ticket))throw new DOMException("Donor selection superseded.",'AbortError');await __loadLibraryEntry(donor,true,ticket);}).then(()=>req.resolve?.(),error=>{__ForgeDonorRoutingF317.failed(ticket,error);req.reject?.(error);})};const onPrepared=event=>{const req=event.detail;if(!req?.entry||req.handled)return;req.handled=true;
  Promise.resolve().then(()=>__loadLibraryEntry({...req.entry,__keepPreparedHybrid:true},false))
  .then(()=>req.resolve?.(),error=>req.reject?.(error));};
 window.addEventListener('xensonar:forge:apply-library-donor',onApply);
 window.addEventListener('xensonar:forge:accept-prepared-donor',onPrepared);
 return()=>{window.removeEventListener('xensonar:forge:apply-library-donor',onApply);
  window.removeEventListener('xensonar:forge:accept-prepared-donor',onPrepared);}},[c,__loadLibraryEntry]);
 P.useEffect(()=>{
  if(c!=='spectral-forge3')return;
  const resolve=event=>{
   const request=event.detail;if(!request||request.handled)return;
   request.handled=true;
   Promise.resolve().then(async()=>{
    const asset=E?.sourceAsset,mask=F?.fineLoopRange;
    // A completed extraction is an active musical choice, not a draft. Repainting
    // the purple mask must not replace it until the user explicitly Extracts again
    // or chooses Use as Donor in the library. Only bootstrap from the mask when
    // no completed source/model exists (the one-click, no-click-street path).
    const committed=Vt.getSnapshot();
    if(committed.model?.hybrid&&committed.source){
     if(!Vt.selectDonor())throw Error('The committed donor could not be selected.');
     return {source:'committed-runtime'};
    }
    if(asset&&mask&&Number.isFinite(mask.startSec)&&Number.isFinite(mask.durationSec)&&mask.durationSec>0){
     if(mask.durationSec<.025||mask.durationSec>8)throw Error("The lower donor mask must be between 25 ms and 8 seconds long.");
     const target=sg(asset,{startSec:mask.startSec,durationSec:mask.durationSec});
     const current=Vt.getSnapshot();
     if(current.model?.hybrid&&__f3562SameMask(current.source,target)){
      if(!Vt.selectDonor())throw Error("The prepared donor mask could not be activated.");
      pe.getState().setCarrierDonorV2DonorUseMode('timbre_projection');
      return {source:'mask-reused'};
     }
     const ticket=__ForgeDonorRoutingF317.beginRead('analyzing');
     try{
      const success=await v({source:E,selection:F,readMode:G,repairResult:L});
      if(!__ForgeDonorRoutingF317.current(ticket))return {source:'superseded'};
      if(!success||!__f3562SameMask(Vt.getSnapshot().source,target)||!Vt.selectDonor())
       throw Error("The last donor mask could not be applied.");
      pe.getState().setCarrierDonorV2DonorUseMode('timbre_projection');
      return {source:'mask-analyzed'};
     }finally{__ForgeDonorRoutingF317.finishRead(ticket)}
    }
    // Only when there is no lower mask: return to the last applied library donor.
    const id=__ForgeDonorRoutingF317.lastId();
    if(id){
     if(__ForgeDonorRoutingF317.activeId()===id&&Vt.getSnapshot().model?.hybrid){
      Vt.selectDonor();return {source:'library-reused',id};
     }
     const item=await __DonorLibraryF36.donorLibrary.load(id);
     await __loadLibraryEntry(item,true);
     return {source:'library-loaded',id};
    }
    const current=Vt.getSnapshot();
    if(current.model?.hybrid&&current.source){Vt.selectDonor();return {source:'prepared-runtime'};}
    throw Error("Please select a donor mask below or load an entry from the Donor Library.");
   }).then(request.resolve,request.reject);
  };
  window.addEventListener('xensonar:forge:resolve-last-donor',resolve);
  return()=>window.removeEventListener('xensonar:forge:resolve-last-donor',resolve);
 },[c,E,F,G,L,v,__loadLibraryEntry]);
 // The visible Donor dock must control this real intake panel, not a shadow copy.
 P.useEffect(()=>{
  const toggle=()=>__setLibraryOpen(previous=>!previous);
  window.addEventListener('xensonar:forge:donor-library-toggle',toggle);
  return()=>window.removeEventListener('xensonar:forge:donor-library-toggle',toggle);
 },[]);
 P.useEffect(()=>{
  window.dispatchEvent(new CustomEvent('xensonar:forge:donor-library-state',{detail:{open:__libraryOpen}}));
 },[__libraryOpen]);
 P.useEffect(()=>{ue(fA(E))},[E?.id]);const fe=oe.trim()||fA(E),{pendingMap:he,successMap:re,runActionWithFeedback:le}=uGe();xGe({sourceReady:!!E,intakeGatewayRef:I,externalLoadFile:d,externalLoadOrigin:f,entryScrollIntent:b,onExternalLoadConsumed:p,onEntryScrollIntentConsumed:g,loadSourceFromFile:U,runActionWithFeedback:le});/* W06 — file handoff is handled only by the mounted Material Intake owner.
   Use its canonical file decoder and its already attached Wave Editor instance. */
 P.useEffect(()=>{
  if(c!=='spectral-forge3')return;
  const receive=event=>{
   const request=event.detail;
   if(!request?.file||request.claimed)return;
   request.claimed=true;
   (async()=>{
    const wave=globalThis.__XenWaveUIW01;
    if(!wave?.getEditor)throw Error('Stereo Wave Editor is unavailable.');
    const editors=()=>[...(I.current?.querySelectorAll('canvas')||[])].map(node=>wave.getEditor(node)).filter(Boolean);
    const previousIds=new Set(editors().map(instance=>instance.doc?.id));
    /* ROOM4-03d: never silently replace unsaved Wave Editor work with a Multitrack clip. */
    if(request.confirmUnsaved&&!request.roundTripToken&&editors().some(instance=>instance.hasUnsavedWork?.())&&!globalThis.confirm('The Wave Editor holds unsaved edits. Sending this recording replaces them.\n\nOK = replace them and open the recording\nCancel = keep your work'))throw Error('Send cancelled: your unsaved Wave Editor edits were kept.');
    if(request.roundTripToken&&editors().some(instance=>instance.hasUnsavedWork?.())&&!globalThis.confirm('The Wave Editor holds unsaved edits. Opening this Multitrack clip replaces them.\n\nOK = replace them and open the clip\nCancel = keep your work'))throw Error('Clip edit cancelled: your unsaved Wave Editor work was kept.');
    const success=await U(request.file,{fromEditor:true});
    if(!success)throw Error('Material Intake could not decode the editor audio. The previous source was preserved.');
    await new Promise((resolve,reject)=>{
     let frames=0;
     const find=()=>{
      const editor=editors().find(instance=>instance.doc&&!previousIds.has(instance.doc.id));
      if(editor){editor.open();if(editor.overlay){if(request.roundTripToken&&!globalThis.__XenMultitrackRoundTrip?.bind(editor,request.roundTripToken)){reject(Error('The Wave Editor source did not match the requested Multitrack clip.'));return}
       // ROOM4-03c: arrive with the blue mask bar at the top edge (the 'Wave Editor / Source options' row scrolls out).
       if(request.roundTripToken||request.scrollToEditor){const top=()=>{const c=editor.options?.overviewCanvas||editor.options?.detailCanvas;if(!c?.isConnected)return;window.scrollBy({top:c.getBoundingClientRect().top-2,behavior:'auto'})};requestAnimationFrame(()=>requestAnimationFrame(top));setTimeout(top,350)}
       resolve();return}
       reject(Error('Stereo Wave Editor could not be opened.'));return}
      if(++frames>=180){reject(Error('Wave Editor did not attach to the newly loaded audio.'));return}
      requestAnimationFrame(find);
     };
     requestAnimationFrame(find);
    });
    request.resolve?.();
   })().catch(error=>request.reject?.(error));
  };
  window.addEventListener('xensonar:forge:send-to-editor-file',receive);
  return()=>window.removeEventListener('xensonar:forge:send-to-editor-file',receive);
 },[c,U]);
 const __forgeInputSeenF323=P.useRef(null);
  P.useEffect(()=>{
    const next={source:E?.sourceAsset??null,start:F?.fineLoopRange.startSec??0,duration:F?.fineLoopRange.durationSec??0};
    const previous=__forgeInputSeenF323.current;
    __forgeInputSeenF323.current=next;
    // On entering Forge this panel is re-created; its initial state is NOT a new donor input.
    // In particular a library donor is independent of the Raw Audio selection (possibly null).
    if(!previous||__ForgeDonorRoutingF317.getSnapshot().phase==='applying')return;
    if(previous.source===next.source&&previous.start===next.start&&previous.duration===next.duration)return;
    M?.(next.source,next.start,next.duration);
  },[E?.sourceAsset,F?.fineLoopRange.startSec,F?.fineLoopRange.durationSec,M]);const [__rackMicTarget,__setRackMicTarget]=P.useState(null);
 P.useEffect(()=>{
  let live=true;
  const find=()=>{if(!live)return;const target=document.querySelector('[data-forge-rack-microphone-slot]');__setRackMicTarget(old=>old===target?old:target);};
  find();const timer=setTimeout(find,80);
  return()=>{live=false;clearTimeout(timer)};
 },[]);
 P.useEffect(()=>{window.dispatchEvent(new CustomEvent('xensonar:forge:mic-busy',{detail:{busy:__micBusy}}));},[__micBusy]);
 const Ae=RGe({commitWaveDocument:__commitWaveDocument,setWaveSelection:__setWaveSelection,stopWaveSourcePreview:__stopWaveSourcePreview,source:E,selection:F,previewPlaying:_,meter:l,setDetailViewport:H,setFineLoopRange:q,clearRepairUndo:K,scrubPreviewAt:Q,updateActivePreviewRange:ne}),{overviewRef:ce,detailRef:ge,playstripRef:Ce,overviewCursor:Re,detailCursor:se,updateOverviewCursor:xe,updateDetailCursor:Be,resetOverviewCursor:Ie,resetDetailCursor:Qe,beginOverviewDrag:Ne,beginDetailDrag:Ue}=Ae,Ye=()=>!E||!F?null:{source:E,selection:F,readMode:G,repairResult:L,exportTitle:fe},Ve=F?.fineLoopRange.durationSec??0,tt=Ve>0&&Ve<=5,dt=async()=>!r||!E||!F?!1:ie(r,{success:"The loop was prepared as a Root Follow loop.",failure:"Sending the Root Follow loop failed."},fe),gt=async(fromUser=false)=>!a||!E||!F?!1:ie(a,{success:"Raw Audio was sent directly to Melodic Loop as a pink track.",failure:"Direct Raw Audio import to Melodic Loop failed."},fe,{fromUser,sourceId:E.id}),Ge=async()=>!o||!E||!F||!tt?!1:ie(o,{success:"The raw sample was sent to Melodic Loop.",failure:"Sending the raw sample to Melodic Loop failed."},fe),Te=P.useMemo(()=>{if(!F)return{text:"No fine selection yet."};const qe=k6e(F.fineLoopRange,F.detailViewport),mt=Ty(F.fineLoopRange,F.detailViewport);return qe?{text:"The lower mask is fully inside the current view window."}:mt?{text:"The lower mask is preserved and extends partly beyond the current view window."}:{text:"The lower mask is saved but currently lies completely outside the visible detail window."}},[F]),rt=()=>{N?.canImportFile&&k.current?.click()},lt=L?.candidates??[],ut=F?`${F.detailViewport.startSec.toFixed(2)} s → ${pc(F.detailViewport).toFixed(2)}s`:"–",at=F?`${F.fineLoopRange.startSec.toFixed(2)} s → ${pc(F.fineLoopRange).toFixed(2)}s`:"–";const __micController=u.jsx(__ForgeMicrophoneIntake,{compact:!!__rackMicTarget,disabled:T||__carrierBusy||!N?.canImportFile,
  onBusyChange:__setMicBusy,onFile:file=>le('load',()=>U(file))});
 const __micNode=__rackMicTarget?ao.createPortal(__micController,__rackMicTarget):__micController;
 const __sourceOptions=u.jsxs("details",{className:"xen-raw-source-options",children:[u.jsx("summary",{children:"Source options"}),u.jsxs("div",{className:"xen-raw-source-options-controls",children:[u.jsx("select",{value:j,disabled:__micBusy||__carrierBusy,onChange:qe=>W(qe.target.value),className:"rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-100",children:e.map(qe=>u.jsx("option",{value:qe.id,children:qe.label},qe.id))}),u.jsx(xi,{tone:"cyan",type:"button",onClick:()=>__setLibraryOpen(v=>!v),active:__libraryOpen,className:"py-1.5 whitespace-nowrap",children:"Donor Library"}),u.jsxs("select",{value:G,onChange:qe=>V(qe.target.value),className:"rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-100",title:"Defines how the committed loop is projected into the spectral workbench.",children:[u.jsx("option",{value:"legacy",children:"Forge Interpretation: Legacy"}),u.jsx("option",{value:"transient",children:"Forge Interpretation: Transient"}),u.jsx("option",{value:"hybrid",children:"Forge Interpretation: Hybrid"})]})]})]});
 const __diagnosticsP29=u.jsxs(u.Fragment,{children:[
   u.jsxs("div",{className:"rounded border border-neutral-800 bg-neutral-900/40 px-3 py-2 text-[11px] text-neutral-400",children:[u.jsx("div",{children:O}),u.jsx("div",{"data-forge-diagnostic-timbre-source":"true",className:"mt-1 text-cyan-200",children:["Timbre: ",__xenForgeTimbreProvenanceP29({runtime:__donorRuntimeP29,activeLibraryId:__ForgeDonorRoutingF317.activeId(),rawAsset:E?.sourceAsset,mask:F?.fineLoopRange})]}),w&&String(w).trim().toLowerCase()!=="missing"?u.jsxs("div",{className:"mt-1 text-cyan-300",children:["Material: ",w]}):null,R?u.jsxs("div",{className:"mt-1 text-violet-300",children:["Embodiment:",R]}):null,o&&F?u.jsx("div",{className:"mt-2 text-neutral-500",children:"Samples can be composed in Melodic Loop or improvised live as Wave Starter or particle sounds."}):null]}),s&&i?u.jsx(__ForgeMaterialMetadata,{meta:s,onPatch:i,selection:F}):null,
   lt.length>0&&u.jsxs("div",{className:"flex flex-wrap items-center gap-2 rounded border border-neutral-800 bg-neutral-900/40 px-3 py-2 text-[11px] text-neutral-400",children:[u.jsx("span",{className:"uppercase tracking-[0.2em] text-neutral-500",children:"Alternative Taktdeutungen"}),lt.map((qe,mt)=>u.jsxs(xi,{tone:"neutral",onClick:()=>{le(`candidate-${mt}`,()=>te(qe))},pending:!!he[`candidate-${mt}`],success:!!re[`candidate-${mt}`],className:"px-2 py-1",children:[qe.bars," bars · ",qe.durationSec.toFixed(2),"s",qe.fitScore!=null?` · ${(qe.fitScore*100).toFixed(0)}%`:""]},`${qe.bars}-${mt}`))]})
 ]});
 const __forgeSharedControls=u.jsxs("div",{className:"space-y-2",children:[u.jsx(__ForgeRackRows,{primary:__ForgeRackOrder('primary',{load:u.jsx(xi,{tone:"neutral",onClick:()=>{le("fit",()=>Y())},disabled:!E||!F||T,pending:!!he.fit,success:!!re.fit,className:__ForgeRackClass('load',"min-h-[5rem] min-w-[9.25rem] justify-center text-center"),children:__ForgeRackCaption("load")}),repair:u.jsx(xi,{tone:"cyan",onClick:()=>{le("repair",()=>B?Z():J())},disabled:!E||!F||T,pending:!!he.repair,success:!!re.repair,active:B,className:__ForgeRackClass('repair',"min-h-[5rem] min-w-[10.5rem] justify-center text-center"),children:__ForgeRackCaption("repair",B?"Undo Loop korrigieren":undefined)}),apply:u.jsx(xi,{tone:"violet",onClick:()=>{le("commit",()=>ee())},disabled:!E||!F||T,pending:!!he.commit,success:!!re.commit,className:__ForgeRackClass('apply',"min-h-[5rem] min-w-[6.25rem] justify-center text-center"),children:__ForgeRackCaption("apply")}),extract:v?u.jsx(xi,{tone:"violet",onClick:()=>{__f435OnExtractTimbre();le("embody-timbre",async()=>{const qe=Ye();return!qe||!v?!1:await v(qe)})},disabled:!E||!F||T||!v,pending:!!he["embody-timbre"],success:!!re["embody-timbre"],className:__ForgeRackClass('extract',"min-h-[5rem] min-w-[11rem] justify-center text-center"),title:"Analyze the selected audio region and prepare its timbre as a donor in the Donor Workshop.",children:__ForgeRackCaption("extract")}):u.jsxs(u.Fragment,{children:[u.jsx(xi,{tone:"cyan",onClick:()=>{__f435OnExtractTimbre();le("extract-timbre",async()=>{const qe=Ye();return!qe||!x?!1:await x(qe)})},disabled:!E||!F||T||!x,pending:!!he["extract-timbre"],success:!!re["extract-timbre"],className:__ForgeRackClass('extract',"min-h-[5rem] min-w-[9rem] justify-center text-center"),title:"Analyze the selected audio region and prepare its timbre as a donor in the Donor Workshop.",children:__ForgeRackCaption("extract")}),u.jsx(xi,{tone:"violet",onClick:()=>{le("apply-timbre",async()=>{const qe=Ye();return!qe||!A?!1:await A(qe)})},disabled:!E||!F||T||!A,pending:!!he["apply-timbre"],success:!!re["apply-timbre"],className:"min-h-[5rem] min-w-[9rem] justify-center text-center",children:"Apply Timbre"})]}),play:u.jsx(xi,{tone:"emerald",onClick:()=>{le("preview",()=>X())},disabled:!E||!F||T,active:_,pending:!!he.preview,success:!!re.preview&&!_,className:__ForgeRackClass('play',"min-h-[5rem] min-w-[6.5rem] justify-center text-center xen-forge-giant-play"),children:_?"Stop":u.jsxs("span",{className:"xen-forge-giant-play-wrap",children:[u.jsx("span",{className:"xen-forge-giant-play-ghost",children:"Preview Loop"}),u.jsx("span",{className:"xen-forge-giant-play-legend",children:"PLAY"})]})}),material:n&&u.jsxs("div",{className:"xen-forge-raw-volume-dock",children:[u.jsx(xi,{tone:"amber",onClick:()=>{le("raw",()=>de(fe))},disabled:!E||!F||T,pending:!!he.raw,success:!!re.raw,className:__ForgeRackClass('material',"min-h-[5rem] min-w-[11.25rem] justify-center text-center"),children:__ForgeRackCaption("material")}),u.jsx(__XenForgeRawVolumeTriangle,{source:E,disabled:!E||!F||T})]})}),secondary:__ForgeRackOrder('secondary',{pink:a&&u.jsx(xi,{tone:"pink",onClick:event=>{const fromUser=event.nativeEvent?.isTrusted===true;le("raw-melodic-pink",()=>gt(fromUser))},disabled:!E||!F||T,pending:!!he["raw-melodic-pink"],success:!!re["raw-melodic-pink"],className:__ForgeRackClass('pink',"min-h-[5rem] min-w-[9.5rem] justify-center text-center"),children:__ForgeRackCaption("pink")}),saveGroup:u.jsxs("div",{"data-forge-source-save-actions":"true",className:"xen-forge-source-save-row flex items-stretch gap-2",children:[r&&u.jsx(xi,{tone:"violet",onClick:()=>{le("raw-root-follow",()=>dt())},disabled:!E||!F||T,pending:!!he["raw-root-follow"],success:!!re["raw-root-follow"],className:__ForgeRackClass('root',"min-h-[3.5rem] min-w-[9.5rem] justify-center text-center"),children:__ForgeRackCaption("root")}),o&&u.jsx(xi,{tone:"violet",onClick:()=>{le("raw-sample",()=>Ge())},disabled:!E||!F||T||!tt,pending:!!he["raw-sample"],success:!!re["raw-sample"],className:__ForgeRackClass('sample',`min-h-[3.5rem] min-w-[9.5rem] justify-center text-center ${tt?"":"opacity-60"}`),title:"Save as Sample for Melodic Loop, Wave Starter and Particles",children:__ForgeRackCaption("sample")}),u.jsx(xi,{tone:"cyan",onClick:()=>{le("donor-library-save",async()=>{await __DonorLibraryF36.donorLibrary.save(fe,"",{source:E,selection:F,readMode:G,sourceAdapterId:j});__setLibraryOpen(true);__setLibraryRevision(n=>n+1);window.dispatchEvent(new Event('xensonar:donor-library-changed'));return true})},disabled:!E||!E?.sourceAsset||!F?.fineLoopRange||T,pending:!!he["donor-library-save"],success:!!re["donor-library-save"],className:__ForgeRackClass('donor',"min-h-[3.5rem] min-w-[13rem] justify-center text-center px-2"),children:__ForgeRackCaption("donor")}),u.jsx(__AudioToCarrierControls,{source:E?.sourceAsset,range:F?.fineLoopRange,disabled:!E||T||__micBusy,onBusyChange:__setCarrierBusy})]})}),extras:[u.jsxs("button",{type:"button",className:"xen-forge-upper-triangle",title:"Upper · Scroll to top of XenSonar",'aria-label':"Scroll to very top",onClick:e=>__forgeScrollCompletelyUp(e.currentTarget),children:[u.jsx("span",{className:"xen-forge-upper-double-chevron",'aria-hidden':true,children:"⌃\n⌃"}),u.jsx("span",{className:"xen-forge-upper-label",children:"UPPER"})]}),u.jsxs("button",{type:"button",className:"xen-forge-up-triangle",title:"Up · Synth Lab / Carrier drawing","aria-label":"Scroll to Synth Lab",onClick:()=>{const target=document.querySelector('[aria-label="Collapse Synth Lab"]')||document.querySelector('[aria-label="Expand Synth Lab"]')||document.querySelector('[data-forge-synth-lab-header="true"]')||document.querySelector('#spectralforge-station-draw');if(!target)return;target.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start',inline:'nearest'});},children:[u.jsx("span",{className:"xen-forge-up-chevron","aria-hidden":true,children:"⌃"}),u.jsx("span",{className:"xen-forge-up-label",children:"UP"})]})]}),u.jsxs("div",{className:"xen-forge-name-section flex flex-col gap-2",children:[u.jsxs("div",{className:"xen-forge-name-rack rounded border border-violet-900/50 bg-violet-950/15 text-[11px] text-violet-100/85",children:[u.jsx("span",{className:"xen-forge-name-word","aria-hidden":"true",children:"NAME"}),u.jsx("span",{className:"xen-forge-name-colon","aria-hidden":"true",children:":"}),u.jsx("span",{className:"xen-forge-name-heading uppercase tracking-[0.18em] text-violet-300/80",children:__ForgeRackCopy.titleHeading}),u.jsx("input",{value:oe,onChange:qe=>ue(qe.target.value),disabled:!E,readOnly:!E,tabIndex:E?undefined:-1,placeholder:E?fA(E):"Import audio to name a loop","aria-label":"Loop/Sample betiteln",className:"xen-forge-name-input w-full rounded border border-violet-800/70 bg-neutral-950 px-2 py-2 text-sm text-violet-50 outline-none focus:border-violet-500"}),u.jsx("span",{className:"xen-forge-name-help text-[10px] leading-relaxed text-violet-100/60",children:__ForgeRackCopy.titleHelp}),s&&i?u.jsx(__ForgeMaterialQuickFields,{meta:s,onPatch:i,disabled:!E}):null]}),c==='spectral-forge3'&&__diagTargetP29?ao.createPortal(__diagnosticsP29, __diagTargetP29):null]})]});
 return u.jsxs("div",{ref:I,"data-material-intake-gateway":"true","data-cut-upload-entry-target":"true",className:"xen-raw-intake-compact scroll-mt-3 border-t border-neutral-800 bg-neutral-950/80 text-xs text-neutral-300",children:[u.jsx("input",{ref:k,type:"file",accept:"audio/*,.wav,.mp3,.ogg,.m4a,.aac,.flac",disabled:T||__micBusy||__carrierBusy||!N?.canImportFile,className:"hidden",onChange:qe=>{const mt=qe.target.files?.[0];mt&&le("load",()=>U(mt)),qe.currentTarget.value=""}}),__micNode,__libraryOpen&&u.jsx(__DonorLibraryF36.DonorLibraryPanel,{
 React:P,jsx:u,source:E,selection:F,readMode:G,sourceAdapterId:j,disabled:T, externalOpen:true,refreshToken:__libraryRevision,onClose:()=>__setLibraryOpen(false),
 onLoad:__loadLibraryEntry,
 onActivate:c==='spectral-forge3'?id=>new Promise((resolve,reject)=>{const req={id,resolve,reject,handled:false};window.dispatchEvent(new CustomEvent('xensonar:forge:apply-library-donor',{detail:req}));if(!req.handled)reject(Error("Material Intake is unavailable."));}):undefined,
 onPreviewSelection:c==='spectral-forge3'?async id=>{const ticket=__ForgeDonorRoutingF317.beginRead('preview-loading');try{const value=await __DonorLibraryF36.donorLibrary.load(id);if(!__ForgeDonorRoutingF317.current(ticket))throw new DOMException("Preview superseded.",'AbortError');const played=await __ForgeDonorRoutingF317.invoke(ticket,()=>Id.playLoop(value.source.sourceAsset,value.selection.fineLoopRange));if(!__ForgeDonorRoutingF317.current(ticket)||!Id.isPlaying())throw new DOMException("Preview cancelled.",'AbortError');__ForgeDonorRoutingF317.finishRead(ticket);return true;}catch(error){__ForgeDonorRoutingF317.failed(ticket,error);throw error;}}:undefined,
 onLoadSelection:c==='spectral-forge3'?async id=>{const ticket=__ForgeDonorRoutingF317.beginRead('source-loading');try{const value=await __DonorLibraryF36.donorLibrary.load(id);if(!__ForgeDonorRoutingF317.current(ticket))throw new DOMException("Source superseded.",'AbortError');await __loadLibraryEntry(value,false,ticket);__ForgeDonorRoutingF317.finishRead(ticket);return true;}catch(error){__ForgeDonorRoutingF317.failed(ticket,error);throw error;}}:undefined,
 onPreview:async J=>{if(!J?.source?.sourceAsset||!J?.selection?.fineLoopRange)throw Error('Fehlende Donor-Maske');Id.stop();await Id.playLoop(J.source.sourceAsset,J.selection.fineLoopRange);},
 onStopPreview:()=>__ForgeDonorRoutingF317.cancel()
}),!E&&__sourceOptions,!E&&N?.unavailableReason&&u.jsx("div",{className:"mb-3 rounded border border-amber-900/40 bg-amber-950/15 px-3 py-2 text-[11px] text-amber-100/85",children:N.unavailableReason}),E?u.jsxs("div",{className:"space-y-3",children:[u.jsxs("div",{className:"flex items-center justify-between text-[11px] text-neutral-500",children:[u.jsx("span",{title:"Full WAV · overall source view. Drag its range to choose which part is magnified below. The lower loop mask remains independent.",children:"Entire File"}),u.jsxs("span",{children:[E.label," · ",E.durationSec.toFixed(2),"s"]}),u.jsx("span",{"data-xwe-launch-slot":"true",className:"xwe-launch-slot"}),__sourceOptions]}),u.jsx("canvas",{ref:ce,width:1200,height:102,title:"Full WAV / source overview: move the upper view range to zoom the lower view. This does not change the independent loop selection.",className:"w-full border border-neutral-800 bg-black",style:{cursor:Re},onPointerMove:xe,onPointerLeave:Ie,onPointerDown:Ne}),u.jsxs("div",{className:"grid gap-3 md:grid-cols-[11rem_11rem_minmax(0,1fr)]",children:[u.jsxs("div",{children:[u.jsx("div",{className:"uppercase tracking-[0.2em] text-neutral-500",children:"Viewport"}),u.jsx("div",{className:"mt-1 rounded border border-neutral-800 bg-neutral-900/60 px-2 py-1 text-neutral-100",children:ut})]}),u.jsxs("div",{children:[u.jsx("div",{className:"uppercase tracking-[0.2em] text-neutral-500",children:"Fine Selection"}),u.jsx("div",{className:"mt-1 rounded border border-neutral-800 bg-neutral-900/60 px-2 py-1 text-neutral-100",children:at})]}),u.jsx("div",{className:"rounded border border-neutral-800 bg-neutral-900/50 px-3 py-2 text-[11px] text-neutral-400",children:"The upper mask only determines what is magnified below. The lower mask is the actual loop used for preview, repair, raw sending, and transfer into the spectral Forge-3 workspace."})]}),u.jsxs("div",{className:"flex items-center justify-between text-[11px] text-neutral-500",title:"Independent Loop Mask: selects the actual loop for preview, repair, Raw Audio export and Forge transfer. The upper range only changes its visible context. "+Te.text,children:[u.jsx("span",{children:"Loop Mask"}),u.jsx("span",{title:Te.text,children:Te.text.startsWith("No fine")?Te.text:"ⓘ"})]}),u.jsx("canvas",{ref:ge,width:1200,height:124,title:"Independent Loop Mask · drag edges to choose the exact loop. Hover above for zoom context and selection status.",className:"w-full border border-neutral-800 bg-black",style:{cursor:se},onPointerMove:Be,onPointerLeave:Qe,onPointerDown:Ue}),u.jsx(__XenWaveTaktometer,{canvasRef:Ce,meta:s,onPatch:i,disabled:!E}),u.jsx("div",{"data-xwe-inline-slot":"true",className:"xwe-inline-mount"}),u.jsx(__XenWaveNativeMorph,{detailRef:ge}),u.jsx(__XenWaveOfflineEQPortal,{detailRef:ge}),__forgeSharedControls]}):u.jsx(__XenForgeNoAudioP32,{onImport:rt,disabled:T||__micBusy||__carrierBusy||!N?.canImportFile,controls:__forgeSharedControls})]})}
function kGe({ready:e,selected:t=!1,phase:n,error:r,progress:a=0,prepared:o=!1,onPreview:i}){const s=P.useId(),l=n==="playing"||n==="rendering",c=!!i&&(e||l),d=n==="rendering"?"Cancel":n==="playing"?"Stop":e?n==="error"?"Listen Again":"Listen":"locked",p=n==="rendering"?`Rendering sound body … ${Math.round(Math.max(0,Math.min(1,a))*100)}%`:n==="playing"?"Donor timbre in your figure":e?o?"Calculated · ready to play":"Timbre Model · Ready":"Select audio and choose “Extract Timbre”.";return u.jsxs("div",{className:"space-y-1",children:[u.jsx("button",{type:"button",disabled:!c,onClick:()=>{c&&i?.()},className:`min-h-11 w-full rounded-lg border px-2 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300 disabled:opacity-50 disabled:cursor-not-allowed ${l||t?"border-violet-400 bg-violet-950 text-violet-100":e?"border-violet-700 bg-violet-950/30 text-violet-100 hover:bg-violet-950/60":"border-neutral-700 bg-gray-900/80 text-gray-300"}`,title:r||(!e&&!l?"Extract timbre first":p),"aria-pressed":l||t,"aria-describedby":s,"aria-label":`Donor: ${d}`,"data-spectral-forge-donor-hearing":"true",children:u.jsxs("span",{className:"flex items-center justify-between gap-2",children:[u.jsxs("span",{className:"flex items-center gap-2",children:[u.jsx("span",{"aria-hidden":"true",className:"rounded border border-violet-700 px-1.5 py-0.5 text-[10px]",children:"D"}),u.jsx("span",{className:"text-[11px] font-semibold",children:"Donor"})]}),u.jsx("span",{className:"text-[10px]",children:d})]})}),u.jsx("p",{id:s,role:"status",className:"px-1 text-[10px] leading-relaxed text-neutral-400",children:p}),r&&u.jsx("div",{role:"alert",className:"rounded border border-amber-800 bg-amber-950/30 px-2 py-1 text-[11px] text-amber-100",children:r})]})}
function __F33BaseProof({ready:e,active:t,similarity:n,eventCount:r,onSelect:a,registerPolicy:o="resonance",registerAvailable:i=!1,onRegisterPolicy:s,renderMethod:l="spectral",hybridAvailable:c=!1,onRenderMethod:d}){const p=[["original","Original Body","Analyzed sound body from the donor mask; listen to the entire mask using Listen to Donor Sample"],["reconstruction","Model","Reconstruction without Carrier"],["transposed","+7","Reconstruction seven semitones higher"],["carrier","Figure","Donor body in the painted figure"]];return u.jsxs("div",{className:"mt-2 rounded border border-violet-900/60 bg-black/25 p-2","aria-label":"Donor-Vergleichsstrecke",children:[u.jsxs("div",{className:"flex items-center justify-between gap-2 text-[10px] text-neutral-400",children:[u.jsx("span",{children:"Original Body → Model → +7 → Figure"}),l==="spectral"&&Number.isFinite(n)?u.jsxs("span",{title:"Spectral similarity between original and model; not an assessment of recognizability",children:["Spektral: ",Math.round((n??0)*100),"%"]}):null]}),u.jsx("div",{className:"mt-1 grid grid-cols-4 gap-1",children:p.map(([f,b,g])=>u.jsx("button",{type:"button",disabled:!e||!a,"aria-pressed":t===f,title:g,onClick:()=>a?.(f),className:`min-h-8 rounded border px-1 text-[10px] ${t===f?"border-violet-300 bg-violet-800 text-white":"border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-violet-600"} disabled:cursor-not-allowed disabled:opacity-40`,children:b},f))}),(r??0)>1?u.jsxs("div",{className:"mt-1 text-[10px] text-amber-200",children:["Strongest of ",r," sound bodies used"]}):null,(!c?u.jsx("span",{className:"mt-1 block text-amber-200",children:"When selecting a listening mode, the donor is prepared from the lower mask or the most recent library selection."}):null),i&&s?u.jsxs("label",{className:"mt-2 block text-[10px] text-neutral-400",children:["Register",u.jsxs("select",{"aria-label":"Donor-Register",value:o,disabled:!e,onChange:f=>s(f.target.value),className:"mt-1 w-full min-w-0 rounded border border-neutral-700 bg-neutral-900 px-1 py-1 text-neutral-200",children:[u.jsx("option",{value:"resonance",children:"Resonanzen halten"}),u.jsx("option",{value:"partials",children:"Include overtones"})]})]}):null]})}
function PGe(props){const session=P.useSyncExternalStore(__F352Session.subscribe,__F352Session.getSnapshot,__F352Session.getSnapshot),workbench=P.useSyncExternalStore(__F341Workbench.subscribe,__F341Workbench.getSnapshot,__F341Workbench.getSnapshot),runtime=cU();return (workbench.config.params.materialPilot)&&runtime.selected?u.jsx(__F352ResultPanel,{}):__F33BaseProof(props);}
function NGe(e,t){return t!==e?"bg-gray-800 text-gray-400 hover:bg-gray-700":e==="granular"?"bg-cyan-700 text-white ring-1 ring-cyan-400":"bg-green-700 text-white"}
function OGe({expanded:e,onToggle:t,synthMode:n,setSynthMode:r,showGrainLayer:a,setShowGrainLayer:o}){const i=s=>{r(s),xt.invalidateBuffer()};return u.jsxs("div",{className:"p-2 border-b border-gray-800","data-spectral-forge-legacy-renderer-surface":"true","data-spectral-forge-direct-renderer-reference-surface":"true",children:[u.jsxs("button",{onClick:t,className:"text-gray-500 font-semibold mb-1.5 w-full text-left flex items-center gap-1",children:[u.jsx("span",{className:`transition-transform ${e?"rotate-90":""}`,children:"▶"}),"⚙️ Direct Renderer (Reference)"]}),e&&u.jsxs("div",{className:"flex flex-col gap-2",children:[u.jsx("div",{className:"rounded bg-gray-800/50 p-1.5 text-[10px] leading-relaxed text-gray-500",children:BGe}),u.jsx("div",{className:"flex flex-col gap-1",children:DGe.map(s=>u.jsxs("button",{onClick:()=>i(s.id),className:`h-8 rounded text-xs font-medium transition-colors flex items-center justify-between px-2 ${NGe(s.id,n)}`,children:[u.jsx("span",{children:s.label}),u.jsx("span",{className:"text-[10px] opacity-60",children:s.desc})]},s.id))}),u.jsxs("div",{className:"mt-2",children:[u.jsxs("label",{className:"flex items-center gap-2 cursor-pointer",children:[u.jsx("input",{type:"checkbox",checked:a,onChange:s=>o(s.target.checked),className:"accent-cyan-500"}),u.jsx("span",{className:"text-gray-400",children:"🌾 Show Granulation Layer"})]}),(a||n==="granular")&&u.jsxs("div",{className:"mt-1.5 text-[10px] text-gray-500 leading-relaxed bg-gray-800/50 p-1.5 rounded",children:[u.jsxs("div",{className:"flex items-center gap-1.5 mb-0.5",children:[u.jsx("span",{className:"w-3 h-3 rounded-full bg-red-500 inline-block"}),u.jsx("span",{children:"Short = Noise/Clicks"})]}),u.jsxs("div",{className:"flex items-center gap-1.5 mb-0.5",children:[u.jsx("span",{className:"w-3 h-3 rounded-full bg-gray-400 inline-block"}),u.jsx("span",{children:"Medium = Texture"})]}),u.jsxs("div",{className:"flex items-center gap-1.5",children:[u.jsx("span",{className:"w-3 h-3 rounded-full bg-cyan-400 inline-block"}),u.jsx("span",{children:"Lang = Tonal/Smooth"})]})]})]})]})]})}
function Y_(e){return{cacheKey:e.cacheKey,rendered:e.rendered,machineId:e.machineId}}
function _Ge(e){return Ti({version:"basis-hearing-stable-request-v1",optionId:e.option.id,machineId:e.option.machineId,harmonicXploreProfileId:e.option.harmonicXploreProfileId??null,spectralSignature:ER(e.snapshot),synthMode:e.snapshot.synthMode,waveformMix:e.snapshot.waveformMix,bars:e.snapshot.materialExport.bars,selection:zGe(e.selection,e.option.machineId),synthLab:jGe(e.synthLab),harmonicXplore:$je(e.harmonicXplore),previewBpm:Math.round(e.previewBpm*10),previewGain:Math.round(e.previewGain*1e4),previewPitchSemitones:Math.round(e.previewPitchSemitones*100)})}
function zGe(e,t){const n=e;return{machineId:n?.machineId??t,bodySourceMode:n?.bodySourceMode??null,presetId:n?.presetId??null,paramsPatch:n?.paramsPatch??{}}}
function jGe(e){const t=e;return{presetId:t?.presetId??null,paramsPatch:t?.paramsPatch??{}}}
function HGe(e){const t=e.audition.optionId===e.optionId?e.audition:null,n=e.chosenOptionId?e.chosenOptionId===e.optionId:e.activeBySelection,r=t?.phase==="preparing",a=r?"loading":t?.phase==="playing"?"spielt":t?.phase==="ready"?"ready":t?.phase==="error"?"Error":n?"selected":"Play";return{visuallyActive:n,pending:r,statusLabel:a,progressPercent:t?String(Math.round(t.progress*100)):"",phase:t?.phase??"idle"}}
function gp(e){switch(e.session.type){case"progress":e.previewSessionDriver.reportProgress(e.previewRequest,e.session.progress);break;case"ready":e.previewSessionDriver.markReady(e.previewRequest,e.session.cacheHit);break;case"playing":e.previewSessionDriver.markPlaying(e.previewRequest);break;case"play-ended":e.previewSessionDriver.markPlayEnded(e.previewRequest);break;case"error":e.previewSessionDriver.markError(e.previewRequest,e.session.message);break}e.setBasisHearingAudition(e.ui)}
function VGe(){const e=pe(T=>T.carrierIntegralSelection),t=pe(T=>T.setCarrierIntegralSelection),n=pe(T=>T.carrierIntegralSynthLab),r=pe(T=>T.carrierIntegralHarmonicXplore),a=pe(T=>T.setCarrierIntegralHarmonicXplore),o=pe(T=>T.materialExport),i=pe(T=>T.renderVersion),s=pe(T=>T.synthMode),l=pe(T=>T.waveformMix),c=pe(T=>T.setBasisHearingTransportBridge),d=pe(T=>T.createProjectSnapshot),p=pe(T=>T.setIsPlaying),f=pe(T=>T.setPlayheadPosition),b=pe(T=>T.setShowPlayheadMarker),[g,y]=P.useState(null),[x,A]=P.useState({optionId:null,phase:"idle",progress:0,cacheHit:null}),M=$K(),{beginGeneration:v,getOrStartInflight:w,getPreparedEntry:R,isCurrentGeneration:k,previewSessionDriver:I,rememberPreparedEntry:E}=M,F=e.machineId,L=P.useCallback(T=>{Vt.selectCarrier();const _=v(),G=T.harmonicXploreProfileId?{profileId:T.harmonicXploreProfileId,source:"user"}:null,j=G?tU(r,G):r,N=$Q(e,{machineId:T.machineId,source:"user"}),V={...d(),carrierIntegralSelection:N,carrierIntegralSynthLab:n,carrierIntegralHarmonicXplore:j},U={snapshot:V,machineId:T.machineId,selection:N,synthLab:n,harmonicXplore:j,previewBpm:o.bpm,previewGain:1,previewPitchSemitones:__f3565PitchSemis(),loopPreview:!!o.loopPreview},H=_Ge({option:T,snapshot:V,selection:N,synthLab:n,harmonicXplore:j,previewBpm:o.bpm,previewGain:1,previewPitchSemitones:__f3565PitchSemis()}),q=KK({routeKind:"basis-hearing",renderVersion:i,synthMode:s,waveformMix:l,machineId:T.machineId,carrierIntegralSource:N.source,carrierIntegralPreset:N.presetId,carrierIntegralBodySource:N.bodySourceMode,carrierIntegralParams:N.paramsPatch,synthLab:n,harmonicXplore:j,bars:o.bars,bpm:o.bpm,beatsPerBar:o.beatsPerBar}),K=R(H),Y=n0({identity:{requestKey:H,routeKind:"basis-hearing"},reason:K?"prepared-cache-reuse":"basis-hearing-click",loopPreview:U.loopPreview});I.schedule(Y),y(T.id),G&&a(G),t({machineId:T.machineId,source:"user"}),xt.stop(),p(!1),b(!1),f(0),A({optionId:T.id,phase:K?"ready":"preparing",progress:K?1:.035,cacheHit:K?!0:null}),c({requestKey:q,optionId:T.id,machineId:T.machineId,phase:K?"ready":"preparing",progress:K?1:.035,loopPreview:U.loopPreview,updatedAt:Date.now()});const J=()=>k(_)&&I.isCurrentRequest(Y),Z=Q=>J()?(p(!0),b(!0),f(0),c({requestKey:q,optionId:T.id,machineId:T.machineId,phase:"playing",progress:1,loopPreview:U.loopPreview,updatedAt:Date.now()}),gp({previewSessionDriver:I,previewRequest:Y,setBasisHearingAudition:A,session:{type:"playing"},ui:{optionId:T.id,phase:"playing",progress:1,cacheHit:Q??!0}}),_B({...U,onAudioPosition:ne=>{J()&&f(ne)},onAudioEnd:()=>{J()&&(p(!1),b(!1),f(0),c({requestKey:q,optionId:T.id,machineId:T.machineId,phase:"ready",progress:1,loopPreview:U.loopPreview,updatedAt:Date.now()}),gp({previewSessionDriver:I,previewRequest:Y,setBasisHearingAudition:A,session:{type:"play-ended"},ui:{optionId:T.id,phase:"ready",progress:1,cacheHit:!0}}))}}).then(ne=>({...ne,cacheHit:ne.cacheHit??Q??void 0}))):Promise.resolve({played:!1,reason:"basis hearing request is stale before playback start",machineId:T.machineId,cacheHit:Q??void 0});(K?Promise.resolve({warmed:!0,cacheHit:!0,cacheKey:K.cacheKey,rendered:!1,reason:"Basis-Hearing prepared cache reused",machineId:T.machineId}):w(H,()=>EK({...U,onRenderProgress:Q=>{if(!J())return;const ne=Math.max(.035,Math.min(1,Q));gp({previewSessionDriver:I,previewRequest:Y,setBasisHearingAudition:A,session:{type:"progress",progress:ne},ui:ee=>ee.optionId===T.id?{...ee,phase:"preparing",progress:ne}:ee}),c({requestKey:q,optionId:T.id,machineId:T.machineId,phase:"preparing",progress:ne,loopPreview:U.loopPreview,updatedAt:Date.now()})}}).then(Q=>(E(H,Y_(Q)),Q)),()=>{I.beginPrewarm(Y)})).then(Q=>!J()||(E(H,Y_(Q)),gp({previewSessionDriver:I,previewRequest:Y,setBasisHearingAudition:A,session:{type:"ready",cacheHit:Q.cacheHit||!!K},ui:{optionId:T.id,phase:"ready",progress:1,cacheHit:Q.cacheHit||!!K}}),c({requestKey:q,optionId:T.id,machineId:T.machineId,phase:"ready",progress:1,loopPreview:U.loopPreview,updatedAt:Date.now()}),!I.canPlay(Y))?null:Z(Q.cacheHit||!!K)).then(Q=>{if(!(!Q||!J())){if(!Q.played){p(!1),b(!1),f(0),gp({previewSessionDriver:I,previewRequest:Y,setBasisHearingAudition:A,session:{type:"error",message:Q.reason||"basis hearing preview did not play"},ui:{optionId:T.id,phase:"error",progress:0,cacheHit:Q.cacheHit??null}}),c({requestKey:q,optionId:T.id,machineId:T.machineId,phase:"error",progress:0,loopPreview:U.loopPreview,updatedAt:Date.now()});return}p(!0),b(!0),c({requestKey:q,optionId:T.id,machineId:T.machineId,phase:"playing",progress:1,loopPreview:U.loopPreview,updatedAt:Date.now()}),gp({previewSessionDriver:I,previewRequest:Y,setBasisHearingAudition:A,session:{type:"playing"},ui:{optionId:T.id,phase:"playing",progress:1,cacheHit:Q.cacheHit??!0}})}}).catch(Q=>{if(!J())return;const ne=Q instanceof Error?Q.message:String(Q);console.error("[xensonar][spectralforge][basis-hearing-preview]",Q),p(!1),b(!1),f(0),gp({previewSessionDriver:I,previewRequest:Y,setBasisHearingAudition:A,session:{type:"error",message:ne},ui:{optionId:T.id,phase:"error",progress:0,cacheHit:null}}),c({requestKey:q,optionId:T.id,machineId:T.machineId,phase:"error",progress:0,loopPreview:U.loopPreview,updatedAt:Date.now()})})},[r,e,n,d,v,w,R,k,o.bars,o.bpm,o.loopPreview,i,s,l,I,E,a,t,c,p,f,b]),B=P.useCallback(T=>{const _=F===T.machineId&&(!T.harmonicXploreProfileId||r.profileId===T.harmonicXploreProfileId);return HGe({optionId:T.id,activeBySelection:_,chosenOptionId:g,audition:x})},[x,g,r.profileId,F]);return{cancelPendingAudition:P.useCallback((T=!0)=>{v(),T&&xt.stop(),y(null),A({optionId:null,phase:"idle",progress:0,cacheHit:null}),p(!1)},[v,p]),selectedHearingMachine:F,selectAndPreviewHearingOption:L,resolveOptionUi:B}}
function __F341BaseHearing({donorReady:e=!1,donorProofReady:t=!1,donorSelected:n=!1,donorPhase:r="idle",donorError:a,donorProgress:o=0,donorPrepared:i=!1,onDonorPreview:s,onOtherHearing:l,donorProofActive:c=null,donorSimilarity:d,donorEventCount:p,onDonorProof:f,donorRegisterPolicy:b,donorRegisterAvailable:g,onDonorRegisterPolicy:y,donorRenderMethod:x,donorHybridAvailable:A,onDonorRenderMethod:M,layout:__layout="rail",selectedPicker:__selectedPicker=null,onPickerChange:__onPickerChange=null}){const __route=P.useSyncExternalStore(__ForgeDonorRoutingF317.subscribe,__ForgeDonorRoutingF317.getSnapshot,__ForgeDonorRoutingF317.getSnapshot),__busy=__route.phase!=="idle"||r==="analyzing";const __machine=pe(se=>se.carrierIntegralSelection.machineId),v=pe(se=>se.applyHarmonizer),w=pe(se=>se.synthMode),R=pe(se=>se.setSynthMode),k=pe(se=>se.colorMapName),I=pe(se=>se.setColorMapName),E=pe(se=>se.clearCanvas),F=pe(se=>se.undo),L=pe(se=>se.redo),B=pe(se=>se.undoStack),O=pe(se=>se.redoStack),T=pe(se=>se.sourceAssetContext),_=pe(se=>se.resetForgeMainPath),G=pe(se=>se.waveformMix),j=pe(se=>se.setWaveformMix),N=pe(se=>se.showGrainLayer),W=pe(se=>se.setShowGrainLayer),[V,U]=P.useState(6),[H,q]=P.useState(.5),[K,Y]=P.useState(7),[J,Z]=P.useState(.7),[te,X]=P.useState(5),[Q,ne]=P.useState(1.4),[ee,ie]=P.useState(3),[de,oe]=P.useState(null),[__diagOpen,__setDiagOpen]=P.useState(!1),ue=se=>oe(xe=>xe===se?null:se),{cancelPendingAudition:fe,selectAndPreviewHearingOption:he,resolveOptionUi:re}=VGe();P.useEffect(()=>{r==="rendering"&&fe(!1)},[r,fe]);const le=[{type:"overtones",label:"Overtones",icon:"🔔",params:{harmonics:V,decay:H}},{type:"intervals",label:"Interval",icon:"🎼",params:{semitones:K,amount:J}},{type:"inharmonic",label:"Inharmonisch",icon:"🔩",params:{partials:te,spread:Q,decay:H}},{type:"spectralBlur",label:"Spectral Blur",icon:"🌫️",params:{radius:ee}}],Ae=[{id:"magma",label:"🟣 Magma"},{id:"hot",label:"🔥 Hot"},{id:"ice",label:"🧊 Ice"},{id:"phosphor",label:"💚 Phosphor"},{id:"rainbow",label:"🌈 Rainbow"}],ce=(se,xe)=>{j({[se]:xe}),xt.invalidateBuffer()},ge=se=>{j(se),xt.invalidateBuffer()},Ce=T==="forge3_main"?"Undo: Main Path":"Undo: Workbench";return __layout==="picker"?u.jsxs("div",{className:"min-w-0 flex-1",children:[u.jsxs("select",{"aria-label":"Select Listening Mode",title:"Select Listening Mode and open Synth Lab",className:"w-full min-w-0 rounded border border-fuchsia-700/60 bg-neutral-900 px-2 py-2 text-xs text-neutral-100","data-forge-hearing-picker":"true",value:__selectedPicker??(n?"donor":LGe.find(__opt=>__opt.machineId===__machine)?.id??"pure-dieter"),onChange:__ev=>{const __choice=__ev.currentTarget.value;fe();__setDiagOpen(!1);__onPickerChange?.(__choice)},children:[...LGe.filter(__opt=>!__forgeSelfMachine(__opt.machineId)).map(__opt=>u.jsx("option",{value:__opt.id,children:__opt.label},__opt.id)),u.jsx("option",{value:"donor",children:"Donor"}),...LGe.filter(__opt=>__forgeSelfMachine(__opt.machineId)).map(__opt=>u.jsx("option",{value:__opt.id,children:__opt.label},__opt.id))]})]}):u.jsxs("div",{className:__layout!=="rail"?"w-full min-w-0 bg-gray-950 flex flex-col text-xs [&_button:focus-visible]:outline [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-cyan-300 [&_input:focus-visible]:outline [&_input:focus-visible]:outline-cyan-300":"w-56 shrink-0 bg-gray-950 border-l border-gray-700 flex flex-col overflow-y-auto text-xs [&_button:focus-visible]:outline [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-cyan-300 [&_input:focus-visible]:outline [&_input:focus-visible]:outline-cyan-300","data-forge-harmonizer-layout":__layout,"aria-label":"Interpretations and Sound Design",children:[__layout!=="rail"?null:u.jsxs("div",{className:"p-2 border-b border-gray-800 flex gap-1",children:[u.jsxs("button",{onClick:F,disabled:B.length===0,className:"flex-1 h-7 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-gray-300",title:`${Ce} (Ctrl+Z)`,children:["↶ ",T==="forge3_main"?"Main Path":"Workbench"]}),u.jsx("button",{onClick:L,disabled:O.length===0,className:"flex-1 h-7 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-gray-300",title:"Redo (Ctrl+Y)",children:"↷ Redo"}),u.jsx("button",{onClick:E,className:"h-7 px-2 rounded bg-red-900/50 hover:bg-red-800 text-red-300","aria-label":"Clear Workbench",title:"Clear Workbench",children:"🗑️"}),u.jsx("button",{onClick:_,className:"h-7 px-2 rounded bg-amber-900/50 hover:bg-amber-800 text-amber-200","aria-label":"Reset Forge Main Path",title:"Reset Forge Main Path",children:"⟲"})]}),__layout!=="rail"?null:u.jsxs("div",{className:"px-2 pb-2 flex flex-wrap gap-1 border-b border-gray-800",children:[u.jsx("span",{className:"rounded border border-neutral-700 px-2 py-0.5 text-[10px] text-neutral-400",children:Ce}),u.jsxs("span",{className:"rounded border border-neutral-700 px-2 py-0.5 text-[10px] text-neutral-400",children:["Trash: ","Clear Workbench"]}),T==="forge3_main"?u.jsx("span",{className:"rounded border border-amber-500/40 px-2 py-0.5 text-[10px] text-amber-200",children:"Reset: Forge Main Path"}):null,T==="forge3_main"?u.jsx("span",{className:"rounded border border-fuchsia-500/40 px-2 py-0.5 text-[10px] text-fuchsia-300",children:"Forge Source Active"}):null]}),u.jsxs("div",{className:"p-2 border-b border-gray-800","data-spectral-forge-basis-hearing-modes":"carrier-integral",children:[u.jsx("h2",{className:"font-semibold text-fuchsia-100",children:"Interpretations"}),u.jsx("p",{className:"mt-1 text-[10px] leading-relaxed text-neutral-400",children:"One figure, different sound bodies. Tap to listen."}),u.jsx("div",{className:"mt-2 rounded-lg border border-fuchsia-900/35 bg-black/20 p-2",children:u.jsxs("div",{className:__layout==="sidebar"?"grid grid-cols-2 gap-1.5":__layout==="deck"?"grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3":"grid grid-cols-1 gap-1",children:[LGe.map(se=>{const xe=mo(se.machineId),Be=l$(se.machineId),Ie=se.summary?`${se.label} · ${se.summary}`:`${xe.label} · ${xe.summary}`,{visuallyActive:Qe,pending:Ne,statusLabel:Ue,progressPercent:Ye,phase:Ve}=re(se),tt=Qe&&!n&&r!=="rendering"&&r!=="playing";return u.jsx("button",{type:"button",onClick:()=>{l?.(),he(se),__layout==="sidebar"&&window.dispatchEvent(new CustomEvent("xensonar:forge-hearing-pick"))},"aria-pressed":tt,"aria-label":`${se.label}: ${Ue}`,className:`min-h-10 rounded-lg border px-2 py-2 text-left transition ${tt?Be.active:"border-neutral-800 bg-gray-900/80 text-gray-300 hover:border-neutral-500/70 hover:bg-gray-800/70"} ${Ne?"ring-1 ring-lime-300/45":""}`,title:Ie,"data-spectral-forge-basis-hearing-mode":se.machineId,"data-spectral-forge-basis-hearing-option":se.id,"data-spectral-forge-basis-hearing-profile":se.harmonicXploreProfileId??"","data-spectral-forge-basis-hearing-active":tt?"true":"false","data-spectral-forge-basis-hearing-phase":Ve,"data-spectral-forge-basis-hearing-progress":Ye,"data-spectral-forge-basis-hearing-click-previews":"true",children:u.jsxs("div",{className:"flex items-center justify-between gap-2",children:[u.jsxs("span",{className:"flex items-center gap-2",children:[u.jsx("span",{className:`rounded border px-1.5 py-0.5 text-[10px] ${Be.chip}`,children:Be.glyph}),u.jsx("span",{className:"text-[11px] font-semibold text-neutral-100",children:se.label})]}),u.jsx("span",{className:`text-[10px] ${Ne?"text-lime-200":"text-neutral-500"}`,children:Ue})]})},se.id)}),u.jsx(kGe,{ready:e,selected:n,phase:r,error:a,progress:o,prepared:i,onPreview:s?()=>{r!=="playing"&&r!=="rendering"&&fe(),s()}:void 0}),u.jsx(PGe,{ready:t&&!__busy,active:c,similarity:d,eventCount:p,renderMethod:x,hybridAvailable:A,onRenderMethod:M?se=>{fe(),M(se)}:void 0,registerPolicy:b,registerAvailable:g,onRegisterPolicy:y?se=>{fe(),y(se)}:void 0,onSelect:f?se=>{r!=="playing"&&r!=="rendering"&&fe(),f(se)}:void 0})]})})]}),(__layout==="sidebar"?u.jsxs("details",{className:"border-t border-neutral-800 px-2 py-2",children:[u.jsx("summary",{className:"cursor-pointer text-[11px] text-neutral-400",children:"Additional Listening Parameters"}),u.jsxs("div",{className:"p-2 border-b border-gray-800",children:[u.jsxs("button",{onClick:()=>ue("waveform"),"aria-expanded":de==="waveform",className:"text-gray-500 font-semibold mb-1.5 w-full text-left flex items-center gap-1",children:[u.jsx("span",{className:`transition-transform ${de==="waveform"?"rotate-90":""}`,children:"▶"}),"🔊 Waveform"]}),de==="waveform"&&u.jsxs("div",{className:"flex flex-col gap-2 mt-2",children:[u.jsx("div",{className:"flex flex-wrap gap-1",children:qGe.map((se,xe)=>u.jsx("button",{onClick:()=>ge(se.mix),className:"h-6 px-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 text-[10px]",title:se.label,children:se.label},xe))}),u.jsxs("label",{className:"flex items-center gap-1",children:[u.jsx("span",{className:"text-gray-500 w-12",children:"Sine"}),u.jsx("input",{type:"range",min:0,max:1,step:.05,value:G.sine,onChange:se=>ce("sine",Number(se.target.value)),className:"flex-1 accent-blue-400",...gA}),u.jsxs("span",{className:"w-8 text-gray-400 font-mono text-right",children:[(G.sine*100).toFixed(0),"%"]})]}),u.jsxs("label",{className:"flex items-center gap-1",children:[u.jsx("span",{className:"text-gray-500 w-12",children:"Saw"}),u.jsx("input",{type:"range",min:0,max:1,step:.05,value:G.sawtooth,onChange:se=>ce("sawtooth",Number(se.target.value)),className:"flex-1 accent-orange-400",...gA}),u.jsxs("span",{className:"w-8 text-gray-400 font-mono text-right",children:[(G.sawtooth*100).toFixed(0),"%"]})]}),u.jsxs("label",{className:"flex items-center gap-1",children:[u.jsx("span",{className:"text-gray-500 w-12",children:"Square"}),u.jsx("input",{type:"range",min:0,max:1,step:.05,value:G.square,onChange:se=>ce("square",Number(se.target.value)),className:"flex-1 accent-green-400",...gA}),u.jsxs("span",{className:"w-8 text-gray-400 font-mono text-right",children:[(G.square*100).toFixed(0),"%"]})]}),u.jsxs("label",{className:"flex items-center gap-1",children:[u.jsx("span",{className:"text-gray-500 w-12",children:"Triangle"}),u.jsx("input",{type:"range",min:0,max:1,step:.05,value:G.triangle,onChange:se=>ce("triangle",Number(se.target.value)),className:"flex-1 accent-pink-400",...gA}),u.jsxs("span",{className:"w-8 text-gray-400 font-mono text-right",children:[(G.triangle*100).toFixed(0),"%"]})]})]})]}),u.jsx(OGe,{expanded:de==="legacy-renderer",onToggle:()=>ue("legacy-renderer"),synthMode:w,setSynthMode:R,showGrainLayer:N,setShowGrainLayer:W}),u.jsxs("div",{className:"p-2 border-b border-gray-800",children:[u.jsx("div",{className:"text-gray-500 font-semibold mb-1.5",children:"🎨 Color Palette"}),u.jsx(__ForgeVisualKey,{colorMapName:k,showGrain:N,onGrain:W}),u.jsx("div",{className:__layout==="sidebar"?"grid grid-cols-2 gap-1":__layout==="deck"?"grid grid-cols-2 gap-1 sm:grid-cols-5":"flex flex-col gap-1",children:Ae.map(se=>u.jsx("button",{onClick:()=>I(se.id),"aria-pressed":k===se.id,className:`h-6 rounded text-left px-2 transition-colors
                ${k===se.id?"bg-purple-700 text-white":"bg-gray-800 text-gray-400 hover:bg-gray-700"}`,children:se.label},se.id))})]}),u.jsxs("div",{className:"p-2 border-b border-gray-800",children:[u.jsxs("button",{onClick:()=>ue("harmonizer"),"aria-expanded":de==="harmonizer",className:"text-gray-500 font-semibold mb-1.5 w-full text-left flex items-center gap-1",children:[u.jsx("span",{className:`transition-transform ${de==="harmonizer"?"rotate-90":""}`,children:"▶"}),"🎵 Material Operators"]}),de==="harmonizer"&&u.jsx("div",{className:"flex flex-col gap-2 mt-2",children:le.map(se=>u.jsxs("div",{className:"bg-gray-800/50 rounded p-2",children:[u.jsxs("button",{onClick:()=>v(se.type,se.params),className:"w-full h-7 rounded bg-amber-700 hover:bg-amber-600 text-white text-xs font-medium mb-1.5 flex items-center justify-center gap-1",children:[se.icon," ",se.label," Apply"]}),se.type==="overtones"&&u.jsxs("div",{className:"flex flex-col gap-1",children:[u.jsxs("label",{className:"flex items-center gap-1",children:[u.jsx("span",{className:"text-gray-500 w-14",children:"Count"}),u.jsx("input",{type:"range",min:1,max:16,value:V,onChange:xe=>U(Number(xe.target.value)),className:"flex-1 accent-amber-500"}),u.jsx("span",{className:"w-5 text-gray-400 font-mono text-right",children:V})]}),u.jsxs("label",{className:"flex items-center gap-1",children:[u.jsx("span",{className:"text-gray-500 w-14",children:"Decay"}),u.jsx("input",{type:"range",min:.1,max:.95,step:.05,value:H,onChange:xe=>q(Number(xe.target.value)),className:"flex-1 accent-amber-500"}),u.jsxs("span",{className:"w-8 text-gray-400 font-mono text-right",children:[(H*100).toFixed(0),"%"]})]})]}),se.type==="intervals"&&u.jsxs("div",{className:"flex flex-col gap-1",children:[u.jsxs("label",{className:"flex items-center gap-1",children:[u.jsx("span",{className:"text-gray-500 w-14",children:"Semitones"}),u.jsx("input",{type:"range",min:1,max:24,value:K,onChange:xe=>Y(Number(xe.target.value)),className:"flex-1 accent-amber-500"}),u.jsx("span",{className:"w-5 text-gray-400 font-mono text-right",children:K})]}),u.jsxs("label",{className:"flex items-center gap-1",children:[u.jsx("span",{className:"text-gray-500 w-14",children:"Strength"}),u.jsx("input",{type:"range",min:.1,max:1,step:.05,value:J,onChange:xe=>Z(Number(xe.target.value)),className:"flex-1 accent-amber-500"}),u.jsxs("span",{className:"w-8 text-gray-400 font-mono text-right",children:[(J*100).toFixed(0),"%"]})]})]}),se.type==="inharmonic"&&u.jsxs("div",{className:"flex flex-col gap-1",children:[u.jsxs("label",{className:"flex items-center gap-1",children:[u.jsx("span",{className:"text-gray-500 w-14",children:"Partials"}),u.jsx("input",{type:"range",min:2,max:12,value:te,onChange:xe=>X(Number(xe.target.value)),className:"flex-1 accent-amber-500"}),u.jsx("span",{className:"w-5 text-gray-400 font-mono text-right",children:te})]}),u.jsxs("label",{className:"flex items-center gap-1",children:[u.jsx("span",{className:"text-gray-500 w-14",children:"Spread"}),u.jsx("input",{type:"range",min:1.05,max:2.5,step:.05,value:Q,onChange:xe=>ne(Number(xe.target.value)),className:"flex-1 accent-amber-500"}),u.jsx("span",{className:"w-8 text-gray-400 font-mono text-right",children:Q.toFixed(2)})]})]}),se.type==="spectralBlur"&&u.jsxs("label",{className:"flex items-center gap-1",children:[u.jsx("span",{className:"text-gray-500 w-14",children:"Radius"}),u.jsx("input",{type:"range",min:1,max:10,value:ee,onChange:xe=>ie(Number(xe.target.value)),className:"flex-1 accent-amber-500"}),u.jsx("span",{className:"w-5 text-gray-400 font-mono text-right",children:ee})]})]},se.type))})]}),(__layout!=="rail"?u.jsxs("details",{className:"border-t border-neutral-800 px-3 py-2 text-[10px] text-gray-500",children:[u.jsx("summary",{className:"cursor-pointer select-none",children:"Show keyboard shortcuts"}),u.jsxs("div",{className:"p-2 text-[10px] text-gray-600 leading-relaxed",children:[u.jsx("div",{className:"font-semibold text-gray-500 mb-1",children:"⌨️ Shortcuts"}),u.jsx("div",{children:"B/H/L/A/N/S/F/T/M = tools"}),u.jsx("div",{children:"X = Eraser Mode"}),u.jsx("div",{children:"T + right-click = Stamp Presets"}),u.jsx("div",{children:"Arrow keys = stretch stamp X/Y"}),u.jsx("div",{children:"Q / E = rotate stamp"}),u.jsx("div",{children:"G = toggle grain layer"}),u.jsx("div",{children:"Mouse wheel = zoom"}),u.jsx("div",{children:"Shift+wheel = Y-only zoom"}),u.jsx("div",{children:"Alt+Drag = Pan"}),u.jsx("div",{children:"Double-click = preview"}),u.jsx("div",{children:"Ctrl+Z / Ctrl+Y = Undo/Redo"}),u.jsx("div",{children:"Space = Play/Stop"}),u.jsx("div",{children:"Right-click = cancel"})]})]}):u.jsxs("div",{className:"p-2 text-[10px] text-gray-600 leading-relaxed",children:[u.jsx("div",{className:"font-semibold text-gray-500 mb-1",children:"⌨️ Shortcuts"}),u.jsx("div",{children:"B/H/L/A/N/S/F/T/M = tools"}),u.jsx("div",{children:"X = Eraser Mode"}),u.jsx("div",{children:"T + right-click = Stamp Presets"}),u.jsx("div",{children:"Arrow keys = stretch stamp X/Y"}),u.jsx("div",{children:"Q / E = rotate stamp"}),u.jsx("div",{children:"G = toggle grain layer"}),u.jsx("div",{children:"Mouse wheel = zoom"}),u.jsx("div",{children:"Shift+wheel = Y-only zoom"}),u.jsx("div",{children:"Alt+Drag = Pan"}),u.jsx("div",{children:"Double-click = preview"}),u.jsx("div",{children:"Ctrl+Z / Ctrl+Y = Undo/Redo"}),u.jsx("div",{children:"Space = Play/Stop"}),u.jsx("div",{children:"Right-click = cancel"})]}))]}):u.jsxs(u.Fragment,{children:[u.jsxs("div",{className:"p-2 border-b border-gray-800",children:[u.jsxs("button",{onClick:()=>ue("waveform"),"aria-expanded":de==="waveform",className:"text-gray-500 font-semibold mb-1.5 w-full text-left flex items-center gap-1",children:[u.jsx("span",{className:`transition-transform ${de==="waveform"?"rotate-90":""}`,children:"▶"}),"🔊 Waveform"]}),de==="waveform"&&u.jsxs("div",{className:"flex flex-col gap-2 mt-2",children:[u.jsx("div",{className:"flex flex-wrap gap-1",children:qGe.map((se,xe)=>u.jsx("button",{onClick:()=>ge(se.mix),className:"h-6 px-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 text-[10px]",title:se.label,children:se.label},xe))}),u.jsxs("label",{className:"flex items-center gap-1",children:[u.jsx("span",{className:"text-gray-500 w-12",children:"Sine"}),u.jsx("input",{type:"range",min:0,max:1,step:.05,value:G.sine,onChange:se=>ce("sine",Number(se.target.value)),className:"flex-1 accent-blue-400",...gA}),u.jsxs("span",{className:"w-8 text-gray-400 font-mono text-right",children:[(G.sine*100).toFixed(0),"%"]})]}),u.jsxs("label",{className:"flex items-center gap-1",children:[u.jsx("span",{className:"text-gray-500 w-12",children:"Saw"}),u.jsx("input",{type:"range",min:0,max:1,step:.05,value:G.sawtooth,onChange:se=>ce("sawtooth",Number(se.target.value)),className:"flex-1 accent-orange-400",...gA}),u.jsxs("span",{className:"w-8 text-gray-400 font-mono text-right",children:[(G.sawtooth*100).toFixed(0),"%"]})]}),u.jsxs("label",{className:"flex items-center gap-1",children:[u.jsx("span",{className:"text-gray-500 w-12",children:"Square"}),u.jsx("input",{type:"range",min:0,max:1,step:.05,value:G.square,onChange:se=>ce("square",Number(se.target.value)),className:"flex-1 accent-green-400",...gA}),u.jsxs("span",{className:"w-8 text-gray-400 font-mono text-right",children:[(G.square*100).toFixed(0),"%"]})]}),u.jsxs("label",{className:"flex items-center gap-1",children:[u.jsx("span",{className:"text-gray-500 w-12",children:"Triangle"}),u.jsx("input",{type:"range",min:0,max:1,step:.05,value:G.triangle,onChange:se=>ce("triangle",Number(se.target.value)),className:"flex-1 accent-pink-400",...gA}),u.jsxs("span",{className:"w-8 text-gray-400 font-mono text-right",children:[(G.triangle*100).toFixed(0),"%"]})]})]})]}),u.jsx(OGe,{expanded:de==="legacy-renderer",onToggle:()=>ue("legacy-renderer"),synthMode:w,setSynthMode:R,showGrainLayer:N,setShowGrainLayer:W}),u.jsxs("div",{className:"p-2 border-b border-gray-800",children:[u.jsx("div",{className:"text-gray-500 font-semibold mb-1.5",children:"🎨 Color Palette"}),u.jsx(__ForgeVisualKey,{colorMapName:k,showGrain:N,onGrain:W}),u.jsx("div",{className:__layout==="sidebar"?"grid grid-cols-2 gap-1":__layout==="deck"?"grid grid-cols-2 gap-1 sm:grid-cols-5":"flex flex-col gap-1",children:Ae.map(se=>u.jsx("button",{onClick:()=>I(se.id),"aria-pressed":k===se.id,className:`h-6 rounded text-left px-2 transition-colors
                ${k===se.id?"bg-purple-700 text-white":"bg-gray-800 text-gray-400 hover:bg-gray-700"}`,children:se.label},se.id))})]}),u.jsxs("div",{className:"p-2 border-b border-gray-800",children:[u.jsxs("button",{onClick:()=>ue("harmonizer"),"aria-expanded":de==="harmonizer",className:"text-gray-500 font-semibold mb-1.5 w-full text-left flex items-center gap-1",children:[u.jsx("span",{className:`transition-transform ${de==="harmonizer"?"rotate-90":""}`,children:"▶"}),"🎵 Material Operators"]}),de==="harmonizer"&&u.jsx("div",{className:"flex flex-col gap-2 mt-2",children:le.map(se=>u.jsxs("div",{className:"bg-gray-800/50 rounded p-2",children:[u.jsxs("button",{onClick:()=>v(se.type,se.params),className:"w-full h-7 rounded bg-amber-700 hover:bg-amber-600 text-white text-xs font-medium mb-1.5 flex items-center justify-center gap-1",children:[se.icon," ",se.label," Apply"]}),se.type==="overtones"&&u.jsxs("div",{className:"flex flex-col gap-1",children:[u.jsxs("label",{className:"flex items-center gap-1",children:[u.jsx("span",{className:"text-gray-500 w-14",children:"Count"}),u.jsx("input",{type:"range",min:1,max:16,value:V,onChange:xe=>U(Number(xe.target.value)),className:"flex-1 accent-amber-500"}),u.jsx("span",{className:"w-5 text-gray-400 font-mono text-right",children:V})]}),u.jsxs("label",{className:"flex items-center gap-1",children:[u.jsx("span",{className:"text-gray-500 w-14",children:"Decay"}),u.jsx("input",{type:"range",min:.1,max:.95,step:.05,value:H,onChange:xe=>q(Number(xe.target.value)),className:"flex-1 accent-amber-500"}),u.jsxs("span",{className:"w-8 text-gray-400 font-mono text-right",children:[(H*100).toFixed(0),"%"]})]})]}),se.type==="intervals"&&u.jsxs("div",{className:"flex flex-col gap-1",children:[u.jsxs("label",{className:"flex items-center gap-1",children:[u.jsx("span",{className:"text-gray-500 w-14",children:"Semitones"}),u.jsx("input",{type:"range",min:1,max:24,value:K,onChange:xe=>Y(Number(xe.target.value)),className:"flex-1 accent-amber-500"}),u.jsx("span",{className:"w-5 text-gray-400 font-mono text-right",children:K})]}),u.jsxs("label",{className:"flex items-center gap-1",children:[u.jsx("span",{className:"text-gray-500 w-14",children:"Strength"}),u.jsx("input",{type:"range",min:.1,max:1,step:.05,value:J,onChange:xe=>Z(Number(xe.target.value)),className:"flex-1 accent-amber-500"}),u.jsxs("span",{className:"w-8 text-gray-400 font-mono text-right",children:[(J*100).toFixed(0),"%"]})]})]}),se.type==="inharmonic"&&u.jsxs("div",{className:"flex flex-col gap-1",children:[u.jsxs("label",{className:"flex items-center gap-1",children:[u.jsx("span",{className:"text-gray-500 w-14",children:"Partials"}),u.jsx("input",{type:"range",min:2,max:12,value:te,onChange:xe=>X(Number(xe.target.value)),className:"flex-1 accent-amber-500"}),u.jsx("span",{className:"w-5 text-gray-400 font-mono text-right",children:te})]}),u.jsxs("label",{className:"flex items-center gap-1",children:[u.jsx("span",{className:"text-gray-500 w-14",children:"Spread"}),u.jsx("input",{type:"range",min:1.05,max:2.5,step:.05,value:Q,onChange:xe=>ne(Number(xe.target.value)),className:"flex-1 accent-amber-500"}),u.jsx("span",{className:"w-8 text-gray-400 font-mono text-right",children:Q.toFixed(2)})]})]}),se.type==="spectralBlur"&&u.jsxs("label",{className:"flex items-center gap-1",children:[u.jsx("span",{className:"text-gray-500 w-14",children:"Radius"}),u.jsx("input",{type:"range",min:1,max:10,value:ee,onChange:xe=>ie(Number(xe.target.value)),className:"flex-1 accent-amber-500"}),u.jsx("span",{className:"w-5 text-gray-400 font-mono text-right",children:ee})]})]},se.type))})]}),(__layout!=="rail"?u.jsxs("details",{className:"border-t border-neutral-800 px-3 py-2 text-[10px] text-gray-500",children:[u.jsx("summary",{className:"cursor-pointer select-none",children:"Show keyboard shortcuts"}),u.jsxs("div",{className:"p-2 text-[10px] text-gray-600 leading-relaxed",children:[u.jsx("div",{className:"font-semibold text-gray-500 mb-1",children:"⌨️ Shortcuts"}),u.jsx("div",{children:"B/H/L/A/N/S/F/T/M = tools"}),u.jsx("div",{children:"X = Eraser Mode"}),u.jsx("div",{children:"T + right-click = Stamp Presets"}),u.jsx("div",{children:"Arrow keys = stretch stamp X/Y"}),u.jsx("div",{children:"Q / E = rotate stamp"}),u.jsx("div",{children:"G = toggle grain layer"}),u.jsx("div",{children:"Mouse wheel = zoom"}),u.jsx("div",{children:"Shift+wheel = Y-only zoom"}),u.jsx("div",{children:"Alt+Drag = Pan"}),u.jsx("div",{children:"Double-click = preview"}),u.jsx("div",{children:"Ctrl+Z / Ctrl+Y = Undo/Redo"}),u.jsx("div",{children:"Space = Play/Stop"}),u.jsx("div",{children:"Right-click = cancel"})]})]}):u.jsxs("div",{className:"p-2 text-[10px] text-gray-600 leading-relaxed",children:[u.jsx("div",{className:"font-semibold text-gray-500 mb-1",children:"⌨️ Shortcuts"}),u.jsx("div",{children:"B/H/L/A/N/S/F/T/M = tools"}),u.jsx("div",{children:"X = Eraser Mode"}),u.jsx("div",{children:"T + right-click = Stamp Presets"}),u.jsx("div",{children:"Arrow keys = stretch stamp X/Y"}),u.jsx("div",{children:"Q / E = rotate stamp"}),u.jsx("div",{children:"G = toggle grain layer"}),u.jsx("div",{children:"Mouse wheel = zoom"}),u.jsx("div",{children:"Shift+wheel = Y-only zoom"}),u.jsx("div",{children:"Alt+Drag = Pan"}),u.jsx("div",{children:"Double-click = preview"}),u.jsx("div",{children:"Ctrl+Z / Ctrl+Y = Undo/Redo"}),u.jsx("div",{children:"Space = Play/Stop"}),u.jsx("div",{children:"Right-click = cancel"})]}))]}))]})}
function UGe(e){return Number.isFinite(e)?Math.max(0,Math.min(1,e)):0}
function KGe(e,t,n,r,a,o){for(let i=0;i<r;i+=1)for(let s=0;s<n;s+=1){const l=UGe(t[i*n+s]??0);if(l<=1e-4)continue;const c=(i*n+s)*4,d=l*o;e.data[c]=Math.min(255,e.data[c]+a[0]*d),e.data[c+1]=Math.min(255,e.data[c+1]+a[1]*d),e.data[c+2]=Math.min(255,e.data[c+2]+a[2]*d),e.data[c+3]=255}}
function $Ge(e){switch(e){case"carrierTrace":return"Figure";case"ordered":return"Overtones";case"body":return"Resonance";case"residual":return"Noise";case"transient":return"Attack";case"composite":return"Overall"}}
function XGe(e){switch(e){case"ready":return"ready";case"building":return"building";case"error":return"Error";case"missing":default:return"missing"}}
function Zb(e,t=2){return Number.isFinite(e)?e.toFixed(t):"—"}
function YGe({embodimentField:e,embodimentStatus:t,embodimentMessage:n,embodimentLayersVisibility:r,v2ValidationReport:a=null,fieldMode:o="legacy",previewAvailable:i,previewPhase:s="idle",previewError:l,validationBusy:c,onToggleLayer:d,onPlayPreview:p,onRunValidation:f,onDownloadValidationReport:b,onDownloadValidationBundle:g,onSendToMaterialspur:y,materialspurSendBusy:x=!1,materialspurEntryLabel:A=null}){const M=P.useRef(null),v=o==="carrier_donor_v2",w=v&&!!(i??e),R=s==="rendering"||s==="playing",k=s==="rendering"?"Cancel Rendering":s==="playing"?"Stop":s==="error"?"Listen Again":"Listen to Body",I=w&&!!y,E=P.useMemo(()=>{if(!e)return[];const F=[{key:"carrierTrace",field:e.carrierTrace,color:[180,210,255],scale:.85},{key:"ordered",field:e.orderedField,color:[86,243,255],scale:.9},{key:"body",field:e.bodyField,color:[162,92,255],scale:.8},{key:"residual",field:e.residualField,color:[255,177,71],scale:.7},{key:"transient",field:e.transientField,color:[255,245,112],scale:.95}];return r.composite&&F.unshift({key:"composite",field:e.compositeField,color:[245,245,255],scale:.35}),F.filter(L=>r[L.key])},[e,r]);return P.useEffect(()=>{const F=M.current;if(!F)return;const L=F.getContext("2d");if(!L)return;if(L.clearRect(0,0,F.width,F.height),L.fillStyle="#020617",L.fillRect(0,0,F.width,F.height),!e){L.fillStyle="rgba(148, 163, 184, 0.7)",L.font="13px monospace",L.fillText("No embodiment space has been built yet.",18,26);return}const B=L.createImageData(e.width,e.height);for(const O of E)KGe(B,O.field,e.width,e.height,O.color,O.scale);L.putImageData(B,0,0)},[e,E]),u.jsxs("section",{className:"rounded-xl border border-neutral-800 bg-neutral-950/70 p-3 text-xs text-neutral-300 [&_button:focus-visible]:outline [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-cyan-300","aria-label":"Sound Body",children:[u.jsxs("div",{className:"flex flex-wrap items-start justify-between gap-3",children:[u.jsxs("div",{className:"space-y-1",children:[u.jsx("div",{className:"font-mono uppercase tracking-[0.2em] text-neutral-500",children:"Sound Body"}),u.jsx("div",{className:"text-sm text-neutral-100",children:"Timbre follows your figure."}),u.jsx("div",{className:"max-w-4xl text-neutral-400",children:"The layers show the prepared material distribution. Preview them for sound comparison."})]}),u.jsxs("div",{className:"rounded border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-[11px] text-neutral-300",children:[u.jsx("div",{role:"status",children:XGe(t)}),u.jsx("div",{className:"mt-1 text-neutral-500",children:n})]})]}),u.jsxs("div",{className:"mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_17rem]",children:[u.jsxs("div",{className:"space-y-2",children:[u.jsx("canvas",{ref:M,width:e?.width??640,height:e?.height??192,className:"w-full rounded border border-neutral-800 bg-black",role:"img","aria-label":"Material distribution along the painted figure"}),u.jsx("div",{className:"flex flex-wrap gap-2 text-[11px]",children:["carrierTrace","ordered","body","residual","transient","composite"].map(F=>u.jsx("button",{type:"button",onClick:()=>d(F),"aria-pressed":r[F],className:`rounded border px-2 py-1 ${r[F]?"border-cyan-700 bg-cyan-950/25 text-cyan-100":"border-neutral-700 text-neutral-400 hover:bg-neutral-900"}`,children:$Ge(F)},F))})]}),u.jsxs("div",{className:"space-y-3",children:[u.jsxs("div",{className:"space-y-2",children:[u.jsx("button",{type:"button",disabled:!w&&!R,"aria-pressed":R,onClick:p,className:`rounded border px-3 py-2 text-left ${w?"border-cyan-600/70 bg-cyan-950/30 text-cyan-100 hover:bg-cyan-950/45":"border-neutral-700 text-neutral-400 opacity-50"}`,children:k}),l&&u.jsx("div",{role:"alert",className:"text-amber-200",children:l}),u.jsx("button",{type:"button",disabled:!I||x,onClick:y,className:`rounded border px-3 py-2 text-left ${I?"border-violet-600/70 bg-violet-950/30 text-violet-100 hover:bg-violet-950/45":"border-neutral-700 text-neutral-400 opacity-50"}`,children:x?"Material Track is being built …":"Send to Material Track"}),A?u.jsxs("div",{className:"rounded border border-violet-800/50 bg-violet-950/20 px-3 py-2 text-[11px] text-violet-100",children:["Sent:",A]}):null]}),u.jsxs("details",{className:"rounded border border-neutral-800 p-2",children:[u.jsx("summary",{className:"cursor-pointer py-1 text-neutral-300",children:"Analysis and Comparison"}),u.jsx("button",{type:"button",disabled:!w||c,onClick:f,className:`rounded border px-3 py-2 text-left ${w?"border-amber-600/70 bg-amber-950/30 text-amber-100 hover:bg-amber-950/45":"border-neutral-700 text-neutral-400 opacity-50"}`,children:c?"Validation running …":"Inspect Sound Body"}),u.jsxs("div",{className:"grid gap-2 sm:grid-cols-2",children:[u.jsx("button",{type:"button",disabled:!w,onClick:b,className:`rounded border px-3 py-2 text-left ${w?"border-sky-700/70 bg-sky-950/30 text-sky-100 hover:bg-sky-950/45":"border-neutral-700 text-neutral-400 opacity-50"}`,children:"Load Inspection Report"}),u.jsx("button",{type:"button",disabled:!w||c,onClick:g,className:`rounded border px-3 py-2 text-left ${w?"border-indigo-700/70 bg-indigo-950/30 text-indigo-100 hover:bg-indigo-950/45":"border-neutral-700 text-neutral-400 opacity-50"}`,children:"Load Comparison WAV"})]}),u.jsxs("div",{className:"rounded border border-neutral-800 bg-neutral-900/40 px-3 py-2 text-[11px] text-neutral-400",children:[u.jsx("div",{className:"uppercase tracking-[0.2em] text-neutral-500",children:"Material Image"}),v&&e?u.jsxs(u.Fragment,{children:[u.jsxs("div",{className:"mt-1 text-neutral-100",children:[e.width," × ",e.height," ·"," ",e.durationSec.toFixed(2),"s"]}),u.jsxs("div",{className:"mt-1",children:["Signature: ",e.builtFromSignature]})]}):u.jsx("div",{className:"mt-1",children:"No material image prepared yet."})]}),u.jsxs("div",{className:"rounded border border-neutral-800 bg-neutral-900/40 px-3 py-2 text-[11px] text-neutral-400",children:[u.jsx("div",{className:"uppercase tracking-[0.2em] text-neutral-500",children:"Measurements"}),a?u.jsxs(u.Fragment,{children:[u.jsx("div",{className:"mt-1 text-neutral-100",children:a.summaryLine}),u.jsxs("div",{className:"mt-1",children:["Energy ",Zb(a.metrics.renderRms,4)," RMS · Peak ",Zb(a.metrics.renderPeak,3)]}),u.jsxs("div",{className:"mt-1",children:["Presence"," ",Zb(a.metrics.presenceActiveColumnRatio)," ","→ Skeleton"," ",Zb(a.metrics.skeletonActiveColumnRatio)," ","→ Binding"," ",Zb(a.metrics.bindingActiveColumnRatio)]}),u.jsxs("div",{className:"mt-1",children:["Anchor: ",a.metrics.anchorCount," · Atlas Cells"," ",a.metrics.donorAtlasCellCount," · Bindings"," ",a.metrics.bindingCount," · Allocation"," ",a.metrics.materialAllocationCount]}),u.jsxs("div",{className:"mt-1",children:["Modus ",a.loopMetadata.donorUseMode," · Material Track"," ",a.loopMetadata.materialspurEligibility.mode," ","· Root Follow"," ",a.loopMetadata.rootFollowEligibility.mode]}),u.jsx("div",{className:"mt-2 space-y-1",children:a.checks.map(F=>u.jsxs("div",{className:`rounded border px-2 py-1 ${F.passed?"border-emerald-800/70 bg-emerald-950/25 text-emerald-100":F.severity==="fail"?"border-rose-800/70 bg-rose-950/25 text-rose-100":"border-amber-800/70 bg-amber-950/25 text-amber-100"}`,children:[u.jsx("div",{className:"font-medium",children:F.label}),u.jsx("div",{className:"mt-0.5 text-[10px]",children:F.detail})]},F.id))}),a.warnings.length?u.jsxs("div",{className:"mt-2 rounded border border-amber-800/70 bg-amber-950/25 px-2 py-1 text-amber-100",children:[u.jsx("div",{className:"font-medium",children:"Warnings"}),u.jsx("div",{className:"mt-0.5 space-y-0.5 text-[10px]",children:a.warnings.map((F,L)=>u.jsxs("div",{children:["• ",F]},L))})]}):null]}):u.jsx("div",{className:"mt-1",children:"No inspection yet. Measurements help with troubleshooting; they do not judge musical quality."})]})]})]})]})]})}
function JGe({bars:e,guideSegments:t,backLabel:n,showImageImport:r,onBarsChange:a,onGuideSegmentsChange:o,onBack:i,onOpenImageImport:s,showStationNav:__showStations=false}){return u.jsxs("div",{className:"flex flex-wrap items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/70 px-3 py-2 text-xs [&_button:focus-visible]:outline [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-cyan-300","data-xensonar-spectralforge-functional-header":"true",children:[u.jsxs("div",{className:__showStations?"flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-2 lg:w-auto lg:flex-1":"flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1","aria-label":"Workflow",children:[u.jsx("span",{className:"font-semibold text-neutral-100",children:"SpectralForge"}),__showStations?u.jsx("nav",{"aria-label":"Spectral Forge Stationen",children:u.jsx("ol",{className:"flex flex-wrap items-center gap-1 text-[11px]",children:[["draw","Draw"],["material","Sound Material"],["listen","Listen"],["output","Output"]].map(([id,label],idx)=>u.jsx("li",{children:u.jsxs("button",{type:"button",className:"rounded border border-neutral-700 bg-neutral-900/70 px-2 py-1 text-neutral-300 hover:border-cyan-600 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-300",onClick:()=>document.getElementById("spectralforge-station-"+id)?.scrollIntoView({behavior:"smooth",block:"start"}),children:[u.jsx("span",{"aria-hidden":"true",className:"mr-1 text-violet-400",children:idx+1}),label]})},id))})}):u.jsx("ol",{className:"flex flex-wrap items-center gap-1 text-[10px] text-neutral-400",children:["Draw","Sound Material","Listen","Output"].map((l,c)=>u.jsxs("li",{className:"flex items-center gap-1",children:[u.jsx("span",{"aria-hidden":"true",className:"text-violet-400",children:c+1}),l,c<3&&u.jsx("span",{"aria-hidden":"true",className:"px-1 text-neutral-600",children:"→"})]},l))})]}),u.jsx(Z_,{label:"Bars",value:e,min:1,max:16,onChange:l=>a(J_(l,1,16,e))}),u.jsx(Z_,{label:"Bar Segments",value:t,min:1,max:16,onChange:l=>o(J_(l,1,16,t))}),u.jsx("button",{type:"button",onClick:i,className:"border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:bg-neutral-900",children:n}),r?u.jsx("button",{type:"button",onClick:s,className:"border border-fuchsia-700 bg-fuchsia-950/35 px-3 py-1.5 text-fuchsia-100 hover:bg-fuchsia-900/35",title:"Open dedicated image import for SpectralForge",children:"Import Image"}):null]})}
function ZGe(e,t){return e.trim().replace(/[^a-z0-9]+/gi,"-").replace(/^-+|-+$/g,"").toLowerCase()||t}
async function eHe(e){const{payload:t}=e,n=t.selection.fineLoopRange.durationSec;if(!(n>0))throw new Error("There is no valid raw excerpt yet.");if(n>5.001)throw new Error(`Raw sample for Melodic Loop is limited to 5.0 s · current ${n.toFixed(2)}s.`);const r=await cS({transferMode:"source-direct",spectralData:e.spectralData,synthMode:e.synthMode,waveformMix:e.waveformMix,rawSourceAsset:t.source.sourceAsset,selectionStartSec:t.selection.fineLoopRange.startSec,selectionDurationSec:t.selection.fineLoopRange.durationSec,sourceView:e.sourceView??"energy",activeWorkspace:e.activeWorkspace??"wave-material",destructiveProfile:e.destructiveProfile??null,warpProfile:e.warpProfile??null}),a=(t.exportTitle?.trim()||t.source.label.replace(/\.[^.]+$/,"")||"roh-sample").trim(),o=`${ZGe(Wp(a),"roh-sample")}.wav`;return xS(o,r.blob)}
function GHe(e){try{return new Date(e).toLocaleString()}catch{return String(e)}}
function HHe(e,t="cyan"){return e?t==="cyan"?"border-cyan-600/70 bg-cyan-950/20":"border-neutral-600/70 bg-neutral-900/50":"border-neutral-800 bg-neutral-950/40"}
function VHe(e,t,n=t){return`${e} ${e===1?t:n}`}
function qHe(e){return GHe(e)}
function QHe(e){return VHe(e,"Stamp")}
function UHe(e){return e?"▲":"▼"}
function KHe(e){return e?"Sent ✓":"Send Stamp as Sample to Melodic Loop"}
function $He(e){return`Current stamp in tool: ${e.width}×${e.height} · can be saved directly.`}
function XHe(e){return`${e.width}×${e.height} · modified ${qHe(e.updatedAt)}`}
function YHe(e){return HHe(e)}
function __CustomStampLibrary({onSendStampAsMelodicSample:e}){const t=pe(L=>L.stampData),n=pe(L=>L.setStampData),r=pe(L=>L.setStampPhase),a=pe(L=>L.setActiveTool),o=pe(L=>L.resetStampTransform),i=dB(L=>L.entries),[s,l]=P.useState(null),[c,d]=P.useState("custom-stamp"),[p,f]=P.useState(!0),[b,g]=P.useState(!1),[y,x]=P.useState(!1),[A,M]=P.useState(null),v=P.useMemo(()=>i.find(L=>L.id===s)??null,[i,s]);P.useEffect(()=>{v&&d(v.name)},[v]),P.useEffect(()=>{!s&&i.length>0&&l(i[0].id)},[i,s]),P.useEffect(()=>{if(!y)return;const L=window.setTimeout(()=>x(!1),1400);return()=>window.clearTimeout(L)},[y]);const w=async L=>{g(!0),M(null);try{await L()}catch(B){M(B instanceof Error?B.message:"Stamp library failed")}finally{g(!1)}},R=()=>{v&&(a("stamp"),n({width:v.stamp.width,height:v.stamp.height,data:v.stamp.data.slice(),grainData:v.stamp.grainData.slice()}),o(),r("stamping"))},k=()=>w(async()=>{if(!t)throw new Error("There is currently no stamp to save");const L=await fE({name:c,stamp:t});l(L.id),d(L.name)}),I=()=>w(async()=>{if(!t)throw new Error("There is currently no stamp to save");const L=await fE({id:s??void 0,name:c,stamp:t});l(L.id),d(L.name)}),E=()=>w(async()=>{s&&(await aQ(s),l(null))}),F=()=>w(async()=>{if(!t)throw new Error("There is currently no stamp to send");if(!e)throw new Error("The Melodic Loop sample route is not available here");await e({name:c,stampData:t}),x(!0)});return u.jsxs("section",{className:"space-y-2 rounded border border-neutral-800 bg-black/20 p-2","data-xensonar-custom-stamp-library-collapsible":"true","data-xensonar-custom-stamp-library-expanded":p?"true":"false",children:[u.jsxs("button",{type:"button",onClick:()=>f(L=>!L),className:"flex w-full items-center justify-between gap-2 text-left","aria-expanded":p,children:[u.jsx("div",{children:u.jsx("div",{className:"text-[11px] uppercase tracking-[0.2em] text-neutral-500",children:"Custom Stamps"})}),u.jsxs("div",{className:"flex items-center gap-2 text-[10px] text-cyan-300",children:[u.jsx("span",{children:QHe(i.length)}),u.jsx("span",{className:"rounded border border-neutral-700 px-1.5 py-0.5 text-neutral-300",children:UHe(p)})]})]}),p?u.jsxs("div",{className:"space-y-2","data-xensonar-custom-stamp-library-body":"true",children:[u.jsxs("label",{className:"block space-y-1 text-xs text-neutral-400",children:[u.jsx("span",{className:"uppercase tracking-[0.2em] text-neutral-500",children:"Stamp Name"}),u.jsx("input",{value:c,onChange:L=>d(L.target.value),className:"w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100"})]}),u.jsxs("div",{className:"grid grid-cols-2 gap-2 text-xs md:grid-cols-3",children:[u.jsx("button",{type:"button",disabled:b||!t,onClick:()=>void k(),className:"rounded border border-cyan-700/60 bg-cyan-950/30 px-2 py-1 text-cyan-200 hover:bg-cyan-900/30 disabled:opacity-50",children:"Save Current Stamp Again"}),u.jsx("button",{type:"button",disabled:b||!t||!e,onClick:()=>void F(),className:"rounded border border-violet-700/70 bg-violet-950/30 px-2 py-1 text-violet-100 hover:bg-violet-900/30 disabled:opacity-50",children:KHe(y)}),u.jsx("button",{type:"button",disabled:b||!t,onClick:()=>void I(),className:"rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-900 disabled:opacity-50",children:"Overwrite Selected"}),u.jsx("button",{type:"button",disabled:!v,onClick:R,className:"rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-900 disabled:opacity-50",children:"Load into Stamp Tool"}),u.jsx("button",{type:"button",disabled:b||!v,onClick:()=>void E(),className:"rounded border border-red-900/70 px-2 py-1 text-red-200 hover:bg-red-950/40 disabled:opacity-50",children:"Delete from Database"})]}),t&&u.jsx("div",{className:"rounded border border-neutral-800 bg-neutral-950/40 px-2 py-1 text-[10px] text-neutral-500",children:$He(t)}),A&&u.jsx("div",{className:"rounded border border-red-900/70 bg-red-950/40 px-2 py-1 text-[11px] text-red-200",children:A}),u.jsxs("div",{className:"max-h-72 space-y-2 overflow-y-auto pr-1",children:[i.length===0&&u.jsx("div",{className:"rounded border border-dashed border-neutral-800 px-3 py-3 text-[11px] text-neutral-500",children:WHe}),i.map(L=>{const B=L.id===s;return u.jsx("button",{type:"button",onClick:()=>l(L.id),className:`block w-full rounded border p-2 text-left ${YHe(B)}`,children:u.jsxs("div",{className:"flex items-start justify-between gap-2",children:[u.jsxs("div",{children:[u.jsx("div",{className:"text-sm text-neutral-100",children:L.name}),u.jsx("div",{className:"text-[10px] text-neutral-500",children:XHe(L)})]}),u.jsx("span",{className:"rounded bg-neutral-900 px-1.5 py-0.5 text-[9px] text-neutral-400",children:"Forge Only"})]})},L.id)})]})]}):null]})}
function __f35645PresetItems(allRecipes,group){
 const family=id=>id.endsWith('-original')?id.slice(0,-9):id;
 const paired=item=>__f35645PairedMethods.includes(family(item.id));
 if(group===0)return allRecipes.filter(paired).sort((a,b)=>{
   const i=__f35645PairedMethods.indexOf(family(a.id))-__f35645PairedMethods.indexOf(family(b.id));
   return i||Number(!a.id.endsWith('-original'))-Number(!b.id.endsWith('-original'));
 });
 if(group===2)return allRecipes.filter(item=>item.id.startsWith('user-'));
 return allRecipes.filter(item=>!item.id.startsWith('user-')&&!paired(item)&&item.values?.engine==='spectral');
}
function __f35645Methods(recipe){
 const links=recipe?.links??[];
 const names=[];
 for(const link of links){
   const mode=link.mode==='imprint'?'Imprint'+(link.direction==='A_to_B'?' A→B':link.direction==='B_to_A'?' B→A':''):link.mode==='cross'?'Cross':link.mode==='interlock'?'Interlock':null;
   if(mode&&!names.includes(mode))names.push(mode);
 }
 return names.length?names.join(' + '):'No connection';
}
function __DonorSelectorF315({onAudition}){
 const runtime=cU(),routing=P.useSyncExternalStore(__ForgeDonorRoutingF317.subscribe,__ForgeDonorRoutingF317.getSnapshot,__ForgeDonorRoutingF317.getSnapshot);
 // Same recipe store as the full workbench: no duplicate preset state or browser storage.
 const workbench=P.useSyncExternalStore(__F341Workbench.subscribe,__F341Workbench.getSnapshot,__F341Workbench.getSnapshot);
 const [items,setItems]=P.useState([]),[message,setMessage]=P.useState(''),alive=P.useRef(true);
 P.useEffect(()=>{alive.current=true;let serial=0;const refresh=async()=>{const n=++serial;try{const list=await __DonorLibraryF36.donorLibrary.list();if(alive.current&&n===serial)setItems(list);}catch(error){if(alive.current)setMessage("Library unavailable: "+String(error?.message??error));}};refresh();window.addEventListener('xensonar:donor-library-changed',refresh);return()=>{alive.current=false;window.removeEventListener('xensonar:donor-library-changed',refresh);};},[]);
 const selected=items.some(x=>x.id===routing.draftId)?routing.draftId:'',busy=routing.phase!=='idle'||runtime.phase==='analyzing';
 const allRecipes=__F341Workbench.getPresets(),recipeId=workbench.config.preset;
 const recipeName=allRecipes.find(item=>item.id===recipeId)?.name??(recipeId==='custom'?"Custom":'');
 const recipeGroups=[
   {name:"Listening modes · interpretations",items:__f35645PresetItems(allRecipes,0)},
   {name:"Spectral Listening Modes",items:__f35645PresetItems(allRecipes,1)},
   {name:"Custom Recipes",items:__f35645PresetItems(allRecipes,2)}
 ];
 // A stored donor variant contains material-specific markings and must never be
 // silently applied to a different source. Portable recipes remain available.
 const applyRecipe=id=>{
   const item=allRecipes.find(entry=>entry.id===id);
   if(!item)return;
   if(item.variant&&item.variant.sourceKey!==__F341Workbench.getConfig().sourceKey){
     setMessage("This recipe contains source-specific markings. Please load the associated donor first.");
     return;
   }
   setMessage('');
   __F341Workbench.preset(id); // applies immediately, just like the workbench picker
 };
 const apply=async(id=selected)=>{if(!id)return !!runtime.model;try{await new Promise((resolve,reject)=>{const req={id,resolve,reject,handled:false};window.dispatchEvent(new CustomEvent('xensonar:forge:apply-library-donor',{detail:req}));if(!req.handled)reject(Error("Material Intake is unavailable."));});return true;}catch(error){if(alive.current&&error?.name!=='AbortError')setMessage("Error: "+String(error?.message??error));return false;}};
 const hear=async(kind)=>{setMessage('');try{const result=await onAudition?.(kind);if(result===false&&!Vt.getSnapshot().model&&runtime.phase!=='rendering')setMessage('Select a purple donor mask in Sound Material or a donor from the library.');}catch(error){setMessage(String(error?.message??error));}};
 const active=__ForgeDonorRoutingF317.activeId(),activeName=items.find(x=>x.id===active)?.name??(runtime.model?runtime.source?.fileName??"Current Sound Material Selection":"No active donor yet");
 // Donor selection is valid input; a cached timbre model is NOT a prerequisite for clicking Play.
 const available=true,stoppable=busy||runtime.phase==='rendering'||runtime.phase==='playing';
 const figureRendering=runtime.phase==='rendering'&&runtime.auditionKind==='carrier';
 const figurePercent=figureRendering?Math.max(2,Math.min(100,Math.round((runtime.renderProgress??0)*100))):0;
 return u.jsxs('div',{'data-synth-lab-donor-library':'true',className:'mt-2 space-y-2 rounded border border-teal-800/60 bg-teal-950/15 p-2',children:[
  u.jsx('label',{htmlFor:'forge-donor-presets-f317',className:'block text-[10px] font-semibold text-teal-200',children:"Saved Donor Selection"}),
  u.jsx('select',{id:'forge-donor-presets-f317','aria-label':"Select donor from library",value:selected,onChange:event=>{const id=event.currentTarget.value;setMessage('');__ForgeDonorRoutingF317.setDraft(id);if(id)void apply(id);},className:'block w-full min-w-0 rounded border border-teal-700 bg-neutral-950 px-2 py-1.5 text-xs text-teal-100',children:[u.jsx('option',{value:'',children:runtime.model?"Current Sound Material Selection":"Select donor …"}),...items.map(item=>u.jsx('option',{value:item.id,children:(item.favorite?'★ ':'')+item.name+' · '+item.sourceLabel},item.id))]}),
  u.jsx('label',{htmlFor:'forge-donor-recipes-f3563',className:'block text-[10px] font-semibold text-teal-200',children:"Saved Recipe"}),
  u.jsxs('select',{id:'forge-donor-recipes-f3563','aria-label':"Quickly select a saved recipe",value:recipeId,onChange:event=>applyRecipe(event.currentTarget.value),className:'block w-full min-w-0 rounded border border-teal-700 bg-neutral-950 px-2 py-1.5 text-xs text-teal-100',children:[
   ...recipeGroups.map(group=>u.jsx('optgroup',{label:group.name,children:group.items.length?group.items.map(item=>{
     const mismatched=!!item.variant&&item.variant.sourceKey!==workbench.config.sourceKey;
     return u.jsx('option',{value:item.id,disabled:mismatched,title:mismatched?"Belongs to a different donor selection":item.description??'',children:item.name+(mismatched?' · anderer Donor':'')},item.id);
   }):[u.jsx('option',{disabled:true,value:'__empty_'+group.name,children:"No recipes saved yet"})]},group.name)),
   recipeId==='custom'?u.jsx('option',{value:'custom',disabled:true,children:"Custom · Edit in Workshop"}):null
  ]}),
  u.jsx('div',{'data-forge-active-donor':'true',className:'text-[10px] text-teal-200',children:busy?routing.message:"Active: "+activeName+(recipeName?" · Recipe: "+recipeName:'')}),
  u.jsxs('div',{'data-forge-donor-audition-actions':'v1',className:'flex flex-wrap items-center gap-2',children:[
   u.jsx('button',{type:'button',disabled:busy||!available,'aria-pressed':runtime.phase==='playing'&&runtime.auditionKind==='sample',onClick:()=>void hear('sample'),className:'min-h-8 rounded border border-teal-600 px-2 py-1 text-[11px] text-teal-100 disabled:opacity-40',children:"Listen to Donor Sample"}),
   u.jsxs('button',{type:'button',disabled:busy||!available,'aria-pressed':runtime.phase==='playing'&&runtime.auditionKind==='carrier','aria-busy':figureRendering,'aria-label':figureRendering?'Listen to Figure with Donor · Rendering '+figurePercent+'%':'Listen to Figure with Donor','data-donor-figure-render-percent':figureRendering?figurePercent:undefined,onClick:()=>void hear('carrier'),className:'relative isolate flex h-8 w-[196px] shrink-0 items-center justify-center overflow-hidden whitespace-nowrap rounded border border-violet-600 px-2 py-1 text-[11px] text-violet-100 disabled:opacity-70',children:[figureRendering&&u.jsx('span',{'aria-hidden':'true',className:'pointer-events-none absolute inset-y-0 left-0 z-0 bg-emerald-500/90',style:{width:figurePercent+'%',transition:'width 120ms linear'}}),u.jsx('span',{className:'pointer-events-none relative z-10',children:"Listen to Figure with Donor"})]}),
   u.jsx('button',{type:'button',onClick:()=>__ForgeDonorRoutingF317.cancel(),disabled:!stoppable,'aria-hidden':!stoppable,className:'h-8 w-[98px] shrink-0 whitespace-nowrap rounded border border-neutral-500 px-2 py-1 text-[11px] text-neutral-100 '+(stoppable?'':'invisible pointer-events-none'),children:busy||runtime.phase==='rendering'?"Cancel":"Stop Preview"})]}),
  u.jsx('div',{className:'text-[10px] leading-relaxed text-neutral-400',children:"Sample: the active donor mask in its original form. Figure: this timbre along your drawing. Donor and recipe apply immediately on selection. Create and edit custom recipes in the full Donor Workshop."}),
  (message||routing.message.startsWith('Fehler:')&&routing.message||runtime.error)&&u.jsx('div',{role:'alert',className:'text-[10px] text-amber-200',children:message||(routing.message.startsWith('Fehler:')?routing.message:'')||runtime.error})
 ]});
}
function ZHe({hearingPanel: __hearingPanel = null, donorSelected: __donorSelected = !1}) {
    const e = P.useMemo(() => TK(), []), t = pe(F => F.carrierIntegralSelection), n = pe(F => F.carrierIntegralSynthLab), r = pe(F => F.carrierIntegralHarmonicXplore), a = pe(F => F.setCarrierIntegralSelection), o = pe(F => F.setCarrierIntegralSynthLab), i = pe(F => F.setCarrierIntegralHarmonicXplore), s = e.machineItems.find(F => F.id === t.machineId) ?? e.machineItems[0], l = s.id, c = e.presetsByMachine[l] ?? [], d = c$(l, s.bodySourceModes), p = ZS(t), f = MR(n), b = mc(r.profileId), g = RR({
        synthLab: n,
        harmonicXplore: r
    }), y = rU(r), x = eU(r.profileId), [A, M] = P.useState("synth"), [v, w] = P.useState(!1), [R, k] = P.useState(!0), [__labExpanded, __setLabExpanded] = P.useState(!1), __mode=__useForgeListeningMode(), I = (F, L) => a({
        paramsPatch: {
            ...t.paramsPatch,
            [F]: L
        },
        source: "user"
    }), E = (F, L) => o({
        paramsPatch: {
            ...n.paramsPatch,
            [F]: L
        },
        source: "user"
    });
    P.useEffect(()=>{const open=()=>{__setLabExpanded(true);M('synth')};window.addEventListener('xensonar:forge:listening-choice',open);return()=>window.removeEventListener('xensonar:forge:listening-choice',open)},[]);
    const __selectedDonor=__mode.value==='donor',__choose=choice=>{__mode.choose(choice);__setLabExpanded(true);M('synth')};
    return u.jsxs("section", {
        className: "rounded border border-fuchsia-900/60 bg-fuchsia-950/10 p-2",
        "data-xensonar-spectralforge-inline-synth-lab": "true",
        "data-xensonar-spectralforge-inline-synth-lab-compact": "true",
        "data-forge-merged-lab-picker": "true",
        style: {
            overflowAnchor: "none"
        },
        children: [ __mode.error?u.jsx("p",{role:"status",className:"text-xs text-amber-200",children:__mode.error}):null, __selectedDonor ? u.jsxs("div", {
            className: "min-w-0",
            children: [ u.jsx(__DonorSelectorF315, {
                onAudition: kind => __hearingPanel?.props.onDonorProof?.(kind)
            }), u.jsx(__F341WorkbenchEntry, {}) ]
        }) : l === "fractalia-self-carrier" ? u.jsx(FractaliaForgeLab, {}) : __ForgeVoices.is(l) ? u.jsx(ForgeVoiceLab, {engine: __ForgeVoices.engineOf(l)}, l) : l === "emilia-nodal-carrier" ? u.jsx(EmiliaForgeLab, {}) : l === "raw-darkpsy-oscillator" ? u.jsx(__PureDieterControls,{}) : __labExpanded ? u.jsx(d$, {
            auditionValueSource: "right-override",
            compactLayout: !__labExpanded,
            activeDeviceLayer: A,
            setActiveDeviceLayer: M,
            selectedMachine: l,
            selectedProjectAvailable: !1,
            auditionBusyKey: null,
            selection: t,
            setCarrierIntegralSelection: a,
            params: p,
            updateMachineParam: I,
            shownBodySourceModes: d,
            selectedPresets: c,
            showLesartLab: v,
            setShowLesartLab: w,
            synthLab: n,
            synthParams: f,
            setCarrierIntegralSynthLab: o,
            updateSynthParam: E,
            showSynthLab: R,
            setShowSynthLab: k,
            harmonicXplore: r,
            harmonicXploreSummary: y,
            harmonicXploreDescriptor: x,
            harmonicXploreProfileSummary: b?.summary,
            harmonicXploreConfig: g,
            updateHarmonicXplore: F => i({
                ...F,
                source: "user"
            }),
            onPreviewSelectedMachine: () => void __ForgeTransportAccess.toggle()
        }) : u.jsx("button", {
            type: "button",
            onClick: () => __setLabExpanded(!0),
            className: "mt-2 w-full rounded border border-fuchsia-900/50 px-2 py-1.5 text-left text-[10px] text-fuchsia-200",
            children: "Open controls for selected listening mode ▾"
        }), u.jsx("div",{"data-forge-synth-snap-footer":true,className:"mt-3 flex items-center gap-2 border-t border-fuchsia-900/40 pt-2",children:u.jsxs(P.Fragment,{children:[u.jsx(__ForgeMiniPlay,{}),u.jsx(__ForgeDetuneControl,{})]})}) ]
    });
}
function tVe({variant:e,sidebarTop:t,onOpenGestureProjectsInSpectralForge:n,onSendStampAsMelodicSample:r,hearingPanel:__hearingPanel=null,donorSelected:__donorSelected=!1,collapsed:__collapsed=!1,onToggle:__onToggle}){
 const forge=e==="forge3",active=__useForgeListeningMode();
 const choose=mode=>__ForgeListeningMode.choose(mode); // Emits the original choice event and opens the same lab controls.
 return u.jsxs("aside",{
  className:__collapsed?"min-w-0 self-start overflow-hidden rounded-lg border border-pink-700/70 bg-neutral-950/80 p-1 text-xs text-neutral-300":"min-w-0 space-y-2 rounded-lg border border-neutral-800 bg-neutral-950/70 p-2 text-xs text-neutral-400",
  "aria-label":forge?"Synth Lab":"Projects and Sound Material","data-xensonar-spectralforge-sidebar-compact-workbench":"true",
  children:[__collapsed?u.jsx("button",{type:"button",onClick:__onToggle,"aria-label":"Expand Synth Lab",title:"Expand Synth Lab","aria-expanded":!1,className:"flex h-9 w-full items-center justify-center rounded border border-pink-600 bg-pink-950/60 text-lg font-bold text-pink-200 hover:bg-pink-900/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-300",children:"←"}):null,
   u.jsxs("div",{style:__collapsed?{display:"none"}:void 0,className:"space-y-2",children:[
    t,
    u.jsxs("div",{className:forge?"f33-synth-lab-header":"flex flex-wrap items-center justify-between gap-2 px-1","data-forge-synth-lab-header":forge?"true":undefined,
     children:[u.jsx("h2",{className:"inline-flex items-center gap-2 text-[12px] font-semibold text-fuchsia-100",children:forge?u.jsxs(P.Fragment,{children:[u.jsx("span",{className:"shrink-0 text-[28px] leading-none",style:{fontSize:"28px"},"aria-hidden":"true",children:"🎛️"}),u.jsx("span",{children:"Synth Lab"})]}):"Projects and Material"}),
      forge&&__hearingPanel?P.cloneElement(__hearingPanel,{onPickerChange:choose,selectedPicker:active.value}):null,
      forge?u.jsx("button",{type:"button",onClick:__onToggle,"aria-label":"Collapse Synth Lab","aria-expanded":!0,className:"rounded border border-pink-600/80 bg-pink-950/40 px-2 py-1 text-[11px] font-semibold text-pink-200 hover:bg-pink-900/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-300",children:"Collapse"}):null]}),
    forge?null:u.jsx(eVe,{}),
    forge?u.jsx(ZHe,{hearingPanel:__hearingPanel,donorSelected:__donorSelected}):null,
    u.jsx(JHe,{onSendStampAsMelodicSample:r})
   ]})]
 });
}
function cVe(e){return{id:"melodic-loop-raw-sample-send",label:"Save as Sample",acceptsRawLoop:!0,acceptsAnalysisMeta:!0,acceptsSpectralProjection:!1,async commitLoop(t){await eHe({payload:t,spectralData:e.spectralData,synthMode:e.synthMode,waveformMix:e.waveformMix,sourceView:e.sourceView,activeWorkspace:e.activeWorkspace,destructiveProfile:e.destructiveProfile,warpProfile:e.warpProfile})}}}
function rz(e,t,n){return Math.max(t,Math.min(n,e))}
function dVe(e){if(!e.analysisCache)throw new Error("Donor analysis requires analysisCache");return e.analysisCache}
function mVe(e,t,n,r){const a=new Float32Array(n);for(let o=0;o<n;o+=1)a[o]=e[o*t+r]??0;return a}
function pVe(e,t){if(t<=0)return e.slice();const n=new Float32Array(e.length);for(let r=0;r<e.length;r+=1){let a=0,o=0;for(let i=-t;i<=t;i+=1){const s=r+i;if(s<0||s>=e.length)continue;const l=t+1-Math.abs(i);a+=e[s]*l,o+=l}n[r]=o>0?a/o:e[r]}return n}
function hVe(e,t,n){const r=Math.max(n*.42,.025);let a=t;for(;a>0&&e[a-1]>=r;)a-=1;let o=t;for(;o<e.length-1&&e[o+1]>=r;)o+=1;return Math.max(1,o-a+1)}
function fVe(e,t){const n=[];for(let a=1;a<e.length-1;a+=1){const o=e[a]??0;o<t.minPeakAmplitude||o<(e[a-1]??0)||o<(e[a+1]??0)||n.push({y:a,value:o})}n.sort((a,o)=>o.value-a.value);const r=[];for(const a of n)if(!r.some(o=>Math.abs(o-a.y)<t.minPeakDistanceBins)&&(r.push(a.y),r.length>=t.maxAnchorsPerFrame))break;return r.sort((a,o)=>a-o),r}
function gVe(e,t,n){let r=0,a=0;for(let i=-4;i<=4;i+=1){if(i===0)continue;const s=t+i;s<0||s>=e.length||(r+=e[s]??0,a+=1)}const o=a>0?r/a:0;return Math.max(0,n-o)}
function bVe(e,t,n,r){return r>.2&&e>.12?"transient":n>=12||n>=7&&e>.16?"cluster":t<.03||e<.11?"noise":"tonal"}
function yVe(e,t){const n=e[t]??0,r=t>0?e[t-1]??0:n,a=t<e.length-1?e[t+1]??0:n;return n>.56||n>.34&&n>=r&&n>=a?"attack":t>2&&n<r*.72&&n<.16?"release":"sustain"}
function SVe(e){return e<220?"low":e<1760?"mid":"high"}
function vVe(e,t){const n={...uVe},r=dVe(e),{width:a,height:o,data:i,transientEnvelope:s}=r,l=[];for(let d=0;d<a;d+=1)l.push(pVe(mVe(i,a,o,d),n.verticalSmoothingRadius));const c=[];for(let d=0;d<a;d+=1){const p=l[d],f=fVe(p,n);for(let b=0;b<f.length;b+=1){const g=f[b]??0,y=p[g]??0,x=hVe(p,g,y),A=gVe(p,g,y),M=s[d]??0,v=bVe(y,A,x,M),w=B0(g,o),R=Math.ceil(x*.5);c.push({id:`donor-anchor-${d}-${b}-${g}`,frameIndex:d,centerBin:g,centerHz:w,bandwidthBins:x,bandwidthHz:Math.abs(B0(rz(g+R,0,o-1),o)-B0(rz(g-R,0,o-1),o)),energy:y,regime:v,phase:yVe(s,d),register:SVe(w)})}}return c}
function UE(e){return Number.isFinite(e)?Math.max(0,Math.min(1,e)):0}
function p$(e){let t=0;for(let n=0;n<e.length;n+=1)t+=e[n]??0;return t}
function AVe(e){return e.length?p$(e)/e.length:0}
function xVe(e){const t=p$(e);if(t<=1e-9)return new Float32Array(e.length);const n=new Float32Array(e.length);for(let r=0;r<e.length;r+=1)n[r]=(e[r]??0)/t;return n}
function MVe(e,t){if(!e.length||t<=0)return new Float32Array(t);const n=new Float32Array(t),r=e.length-1;for(let a=0;a<t;a+=1){const i=a/(t-1)*r,s=Math.floor(i),l=Math.min(r,s+1),c=i-s;n[a]=(e[s]??0)*(1-c)+(e[l]??0)*c}return n}
function wVe(e){if(e.length<2)return 0;let t=0,n=0,r=0,a=0,o=0;for(let s=0;s<e.length;s+=1){const l=s,c=Math.log(Math.max(1e-8,e[s]??0));t+=l,n+=c,r+=l*l,a+=l*c,o+=1}const i=o*r-t*t;return Math.abs(i)<1e-9?0:(o*a-t*n)/i}
function RVe(e){let t=0,n=0;for(let a=0;a<e.length;a+=1)a%2===0?n+=e[a]??0:t+=e[a]??0;const r=t+n;return r<=1e-9?0:(t-n)/r}
function CVe(e){if(!e.length)return 0;const t=AVe(e);let n=0,r=0;for(let s=0;s<e.length;s+=1){const l=e[s]??0;l>=t?n+=l:r+=l}const a=n>0?(n-r)/(n+r+1e-9):0;let o=0;for(let s=1;s<e.length;s+=1)o+=Math.abs((e[s]??0)-(e[s-1]??0));const i=UE(o/Math.max(1e-9,e.length-1));return UE(a*(1-.35*i))}
function kVe(e){if(e.length<3)return 0;let t=0;for(let n=1;n<e.length-1;n+=1){const r=e[n-1]??0,a=e[n]??0,o=e[n+1]??0;t+=Math.abs((r+o)*.5-a)}return UE(t/(e.length-2))}
function PVe(e){const t=xVe(MVe(e.relativeSpectralEnvelope,nP)),n=new Float32Array(nP);for(let r=0;r<nP;r+=1)n[r]=r+1;return{atomId:e.id,anchorId:e.anchorId,register:e.register,phase:e.phase,regime:e.regime,orderedness:CVe(t),partialBins:n,partialWeights:t,spectralSlope:wVe(t),oddEvenBalance:RVe(t),inharmonicSpread:kVe(t)}}
function IVe(e){return e.atoms.map(PVe)}
function YB(e){return Number.isFinite(e)?Math.max(0,Math.min(1,e)):0}
function JB(e){let t=0;for(let n=0;n<e.length;n+=1)t+=e[n]??0;return t}
function h$(e){const t=JB(e);if(t<=1e-9)return new Float32Array(e.length);const n=new Float32Array(e.length);for(let r=0;r<e.length;r+=1)n[r]=(e[r]??0)/t;return n}
function FVe(e){const t=JB(e);if(t<=1e-9)return .5;let n=0;for(let r=0;r<e.length;r+=1){const a=e.length===1?.5:r/(e.length-1);n+=a*(e[r]??0)}return YB(n/t)}
function TVe(e){if(!e.length)return 0;const t=Array.from(e).sort((r,a)=>r-a),n=Math.floor(t.length/2);return t.length%2===0?((t[n-1]??0)+(t[n]??0))*.5:t[n]??0}
function LVe(e){const t=TVe(e),n=[];for(let r=0;r<e.length;r+=1){const a=r>0?e[r-1]??e[r]??0:e[r]??0,o=e[r]??0,i=r<e.length-1?e[r+1]??o:o;if(o<a||o<i||o<=t)continue;const s=Math.max(0,o-t),l=t+s*.5;let c=r;for(;c>0&&(e[c-1]??0)>=l;)c-=1;let d=r;for(;d<e.length-1&&(e[d+1]??0)>=l;)d+=1;const p=Math.max(1,d-c+1);n.push({index:r,prominence:s,width:p})}return n.sort((r,a)=>a.prominence-r.prominence),n.slice(0,fy)}
function BVe(e,t){if(!e.length||!t.length)return 0;const n=t.reduce((a,o)=>a+o.prominence,0),r=JB(e);return r<=1e-9?0:YB(n/r*1.8)}
function DVe(e){if(!e.length)return 0;let t=0,n=0;for(const r of e){const a=1/Math.max(1,r.width);t+=a*r.prominence,n+=r.prominence}return n<=1e-9?0:YB(t/n*4)}
function NVe(e){const t=new Float32Array(fy),n=new Float32Array(fy),r=new Float32Array(fy);for(let a=0;a<fy;a+=1){const o=e[a];o&&(t[a]=o.index/(KE-1),n[a]=o.prominence,r[a]=o.width/KE)}return{centers:t,weights:h$(n),widths:r}}
function OVe(e){const t=h$(MVe(e.formantEnvelope.length?e.formantEnvelope:e.relativeSpectralEnvelope,KE)),n=LVe(t),r=NVe(n);return{atomId:e.id,anchorId:e.anchorId,register:e.register,phase:e.phase,regime:e.regime,resonanceStrength:BVe(t,n),bodyCentroid:FVe(t),resonanceSharpness:DVe(n),resonanceProfile:t,peakCenters:r.centers,peakWeights:r.weights,peakWidths:r.widths}}
function _Ve(e){return e.atoms.map(OVe)}
function ZB(e){return Number.isFinite(e)?Math.max(0,Math.min(1,e)):0}
function f$(e){let t=0;for(let n=0;n<e.length;n+=1)t+=e[n]??0;return t}
function zVe(e){const t=f$(e);if(t<=1e-9)return new Float32Array(e.length);const n=new Float32Array(e.length);for(let r=0;r<e.length;r+=1)n[r]=(e[r]??0)/t;return n}
function jVe(e){const t=f$(e);if(t<=1e-9)return .5;let n=0;for(let r=0;r<e.length;r+=1){const a=e.length===1?.5:r/(e.length-1);n+=a*(e[r]??0)}return ZB(n/t)}
function GVe(e){if(!e.length)return 0;let t=0,n=0;for(let r=0;r<e.length;r+=1){const a=Math.max(1e-8,e[r]??0);t+=Math.log(a),n+=a}return t=Math.exp(t/e.length),n/=e.length,n<=1e-9?0:ZB(t/n)}
function VVe(e,t){if(!e.length)return 0;const n=TVe(e);let r=0;for(let o=0;o<e.length;o+=1)(e[o]??0)>n*1.12&&(r+=1);const a=r/e.length;return ZB(t*.62+a*.38)}
function WVe(e){const t=zVe(e.residualBands),n=GVe(t);return{atomId:e.id,anchorId:e.anchorId,register:e.register,phase:e.phase,regime:e.regime,residualStrength:VVe(t,n),noiseColorCentroid:jVe(t),residualFlatness:n,residualProfile:t}}
function qVe(e){return e.atoms.map(WVe)}
function GR(e){return Number.isFinite(e)?Math.max(0,Math.min(1,e)):0}
function QVe(e){let t=0;for(let n=0;n<e.length;n+=1)t+=e[n]??0;return t}
function UVe(e){const t=QVe(e);if(t<=1e-9)return new Float32Array(e.length);const n=new Float32Array(e.length);for(let r=0;r<e.length;r+=1)n[r]=(e[r]??0)/t;return n}
function KVe(e){switch(e){case"attack":return 1;case"sustain":return .56;case"release":default:return .28}}
function $Ve(e){const t=e.modulationProfile[0]??e.transientValue??0,n=e.modulationProfile[1]??0,r=e.modulationProfile[2]??e.quality??0,a=e.modulationProfile[3]??0;return UVe(new Float32Array([Math.max(0,t),Math.max(0,1-a),Math.max(0,n),Math.max(0,r)]))}
function XVe(e,t){const n=e.modulationProfile[0]??e.transientValue??0,r=t[1]??0,a=t[3]??0;return GR(n*.54+KVe(e.phase)*.24+r*.12+a*.1)}
function YVe(e,t){const n=e.modulationProfile[0]??e.transientValue??0,r=t[1]??0,a=e.phase==="attack"?1:e.phase==="sustain"?.55:.25;return GR(n*.58+r*.24+a*.18)}
function JVe(e,t){const n=t[2]??0,r=e.modulationProfile[0]??e.transientValue??0;return GR(n*(.7+r*.3))}
function ZVe(e,t){const n=t[3]??0,r=t[1]??0,a=e.phase==="release"?.42:e.phase==="sustain"?.68:.84;return GR(a*(.48+n*.34+r*.18))}
function eWe(e){const t=$Ve(e);return{atomId:e.id,anchorId:e.anchorId,register:e.register,phase:e.phase,regime:e.regime,transientStrength:XVe(e,t),onsetSharpness:YVe(e,t),onsetSpread:JVe(e,t),decayTightness:ZVe(e,t),transientProfile:t}}
function tWe(e){return e.atoms.map(eWe)}
function Pg(e){return Number.isFinite(e)?Math.max(0,Math.min(1,e)):0}
function bA(e){const t=new Map;for(const n of e??[])t.set(n.atomId,n);return t}
function nWe(e,t){const n=e?e.orderedness*(.68+(1-e.inharmonicSpread)*.32):0,r=t?t.resonanceStrength*(.3+t.resonanceSharpness*.35):0;return Pg(n*.74+r*.26)}
function rWe(e,t,n){const r=e?e.transientStrength*(.36+e.onsetSharpness*.34+(1-e.onsetSpread)*.3):0,a=t?t.orderedness*.32:0,o=n?n.residualFlatness*.18:0;return Pg(r*.62+a*.38-o*.22)}
function aWe(e){return e?Pg(e.resonanceStrength*(.45+e.resonanceSharpness*.55)):0}
function oWe(e,t){const n=e?e.transientStrength*(.42+e.onsetSharpness*.28+e.decayTightness*.3):0,r=t?t.residualStrength*(.18+(1-t.residualFlatness)*.24):0;return Pg(n*.78+r*.22)}
function iWe(e,t,n,r){return Pg(e*.34+t*.3+n*.18+r*.18)}
function sWe(e,t,n){return Pg(n*.55+t*.3+e*.15)}
function lWe(e){const t=bA(e.orderedFrames),n=bA(e.resonanceFrames),r=bA(e.residualFrames),a=bA(e.transientFrames);return e.atoms.map(o=>{const i=t.get(o.id),s=n.get(o.id),l=r.get(o.id),c=a.get(o.id),d=nWe(i,s),p=rWe(c,i,l),f=aWe(s),b=oWe(c,l),g=iWe(d,p,f,b),y=sWe(d,p,g);return{atomId:o.id,anchorId:o.anchorId,register:o.register,phase:o.phase,regime:o.regime,pitchLeakRisk:d,prosodicLeakRisk:p,resonanceLeakRisk:f,articulationLeakRisk:b,overallLeakRisk:g,recommendedSuppression:y}})}
function cWe(e){if(!e.length)return{frameCount:0,cellCount:0,meanPitchLeakRisk:0,meanProsodicLeakRisk:0,meanOverallLeakRisk:0,highLeakRatio:0,meanRecommendedSuppression:0};const t=e.length,n=e.reduce((s,l)=>s+l.pitchLeakRisk,0)/t,r=e.reduce((s,l)=>s+l.prosodicLeakRisk,0)/t,a=e.reduce((s,l)=>s+l.overallLeakRisk,0)/t,o=e.filter(s=>s.overallLeakRisk>.58).length/t,i=e.reduce((s,l)=>s+l.recommendedSuppression,0)/t;return{frameCount:t,cellCount:0,meanPitchLeakRisk:n,meanProsodicLeakRisk:r,meanOverallLeakRisk:a,highLeakRatio:o,meanRecommendedSuppression:i}}
function uWe(e,t){if(!e.length&&!t.length)return{frameCount:0,cellCount:0,meanOrderedness:0,strongOrderedRatio:0,meanInharmonicSpread:0};const n=t.length?t.map(s=>({orderedness:s.meanOrderedness,inharmonicSpread:s.meanInharmonicSpread})):e.map(s=>({orderedness:s.orderedness,inharmonicSpread:s.inharmonicSpread})),r=Math.max(1,n.length),a=n.reduce((s,l)=>s+l.orderedness,0)/r,o=n.filter(s=>s.orderedness>.55).length/r,i=n.reduce((s,l)=>s+l.inharmonicSpread,0)/r;return{frameCount:e.length,cellCount:t.length,meanOrderedness:a,strongOrderedRatio:o,meanInharmonicSpread:i}}
function dWe(e,t){if(!e.length&&!t.length)return{frameCount:0,cellCount:0,meanResonanceStrength:0,strongResonanceRatio:0,meanResonanceSharpness:0};const n=t.length?t.map(s=>({strength:s.meanResonanceStrength,sharpness:s.meanResonanceSharpness})):e.map(s=>({strength:s.resonanceStrength,sharpness:s.resonanceSharpness})),r=n.length,a=n.reduce((s,l)=>s+l.strength,0)/r,o=n.filter(s=>s.strength>.48).length/r,i=n.reduce((s,l)=>s+l.sharpness,0)/r;return{frameCount:e.length,cellCount:t.length,meanResonanceStrength:a,strongResonanceRatio:o,meanResonanceSharpness:i}}
function mWe(e,t){if(!e.length&&!t.length)return{frameCount:0,cellCount:0,meanResidualStrength:0,strongResidualRatio:0,meanResidualFlatness:0,meanNoiseColorCentroid:0};const n=t.length?t.map(l=>({strength:l.meanResidualStrength,flatness:l.meanResidualFlatness,centroid:l.meanNoiseColorCentroid})):e.map(l=>({strength:l.residualStrength,flatness:l.residualFlatness,centroid:l.noiseColorCentroid})),r=n.length,a=n.reduce((l,c)=>l+c.strength,0)/r,o=n.filter(l=>l.strength>.48).length/r,i=n.reduce((l,c)=>l+c.flatness,0)/r,s=n.reduce((l,c)=>l+c.centroid,0)/r;return{frameCount:e.length,cellCount:t.length,meanResidualStrength:a,strongResidualRatio:o,meanResidualFlatness:i,meanNoiseColorCentroid:s}}
function pWe(e,t){if(!e.length&&!t.length)return{frameCount:0,cellCount:0,meanTransientStrength:0,strongTransientRatio:0,meanOnsetSharpness:0,meanOnsetSpread:0,meanDecayTightness:0};const n=t.length?t.map(c=>({strength:c.meanTransientStrength,onsetSharpness:c.meanOnsetSharpness,onsetSpread:c.meanOnsetSpread,decayTightness:c.meanDecayTightness})):e.map(c=>({strength:c.transientStrength,onsetSharpness:c.onsetSharpness,onsetSpread:c.onsetSpread,decayTightness:c.decayTightness})),r=n.length,a=n.reduce((c,d)=>c+d.strength,0)/r,o=n.filter(c=>c.strength>.48).length/r,i=n.reduce((c,d)=>c+d.onsetSharpness,0)/r,s=n.reduce((c,d)=>c+d.onsetSpread,0)/r,l=n.reduce((c,d)=>c+d.decayTightness,0)/r;return{frameCount:e.length,cellCount:t.length,meanTransientStrength:a,strongTransientRatio:o,meanOnsetSharpness:i,meanOnsetSpread:s,meanDecayTightness:l}}
function fWe(e){if(!e.analysisCache)throw new Error("Donor timbre tensor requires analysisCache");return e.analysisCache}
function g$(e,t,n){return Math.max(t,Math.min(n,e))}
function gWe(e,t,n,r){const a=new Float32Array(n);for(let o=0;o<n;o+=1)a[o]=e[o*t+r]??0;return a}
function eD(e){let t=0;for(let n=0;n<e.length;n+=1)t=Math.max(t,e[n]??0);if(t<=1e-6)return e;for(let n=0;n<e.length;n+=1)e[n]=(e[n]??0)/t;return e}
function yWe(e,t,n,r){const a=new Float32Array(r),o=Math.max(1,Math.floor(e.length/r));for(let i=0;i<r;i+=1){const s=i*o,l=i===r-1?e.length:Math.min(e.length,s+o);let c=0,d=0;for(let p=s;p<l;p+=1)Math.abs(p-t)<=n||(c+=e[p]??0,d+=1);a[i]=d>0?c/d:0}return eD(a)}
function SWe(e,t,n){const r=n*2+1,a=new Float32Array(r);for(let o=0;o<r;o+=1){const i=o-n,s=g$(t+i,0,e.length-1);a[o]=e[s]??0}return eD(a)}
function vWe(e,t,n,r){let a=0;for(let s=0;s<t.length;s+=1)a+=t[s]??0;a/=Math.max(1,t.length);let o=0;for(let s=0;s<r.length;s+=1)o+=r[s]??0;o/=Math.max(1,r.length);const i=e*.5+n*.18+o*.18+(1-a)*.14;return g$(i,0,1)}
function AWe(e,t,n){const r={...hWe},a=fWe(e),{width:o,height:i,data:s,transientEnvelope:l}=a,c=[];for(const k of t){const I=gWe(s,o,i,k.frameIndex),E=SWe(I,k.centerBin,r.envelopeRadiusBins),F=pVe(E,r.formantSmoothingRadius);eD(F);const L=yWe(I,k.centerBin,Math.max(2,Math.floor(k.bandwidthBins*.5)),r.residualBandCount),B=l[k.frameIndex]??0,O=new Float32Array([B,Math.min(1,k.bandwidthBins/24),k.energy,Math.max(0,1-Math.abs((l[Math.max(0,k.frameIndex-1)]??B)-(l[Math.min(l.length-1,k.frameIndex+1)]??B)))]),T=vWe(k.energy,L,B,E);T<r.minAtomQuality||c.push({id:`timbre-atom-${k.id}`,anchorId:k.id,frameIndex:k.frameIndex,centerHz:k.centerHz,transientValue:B,register:k.register,phase:k.phase,regime:k.regime,relativeSpectralEnvelope:E,residualBands:L,formantEnvelope:F,modulationProfile:O,quality:T})}const d={atoms:c,registerBoundariesHz:[220,1760],sourceFrameCount:o},p=IVe(d),f=uWe(p,[]),b=_Ve(d),g=dWe(b,[]),y=qVe(d),x=mWe(y,[]),A=tWe(d),M=pWe(A,[]),v={...d,orderedFrames:p,resonanceFrames:b,residualFrames:y,transientFrames:A},w=lWe(v),R=cWe(w);return{...d,orderedFrames:p,orderedSummary:f,resonanceFrames:b,resonanceSummary:g,residualFrames:y,residualSummary:x,transientFrames:A,transientSummary:M,leakAuditFrames:w,leakAuditSummary:R}}
function xWe(e,t){const n=e.length,r=t.atoms.length,a=new Map,o={low:0,mid:0,high:0},i={attack:0,sustain:0,release:0},s={tonal:0,cluster:0,noise:0,transient:0};let l=null,c=-1;for(const _ of e)a.set(_.frameIndex,(a.get(_.frameIndex)??0)+1),o[_.register]+=1,i[_.phase]+=1,s[_.regime]+=1,_.energy>c&&(c=_.energy,l=_.centerHz);const d=a.size>0?Math.max(...a.values()):0,p=r>0?t.atoms.reduce((_,G)=>_+G.quality,0)/r:0,f=t.orderedSummary?.meanOrderedness??0,b=t.orderedSummary?.strongOrderedRatio??0,g=t.orderedSummary?.meanInharmonicSpread??0,y=t.resonanceSummary?.meanResonanceStrength??0,x=t.resonanceSummary?.strongResonanceRatio??0,A=t.resonanceSummary?.meanResonanceSharpness??0,M=t.residualSummary?.meanResidualStrength??0,v=t.residualSummary?.strongResidualRatio??0,w=t.residualSummary?.meanResidualFlatness??0,R=t.residualSummary?.meanNoiseColorCentroid??0,k=t.transientSummary?.meanTransientStrength??0,I=t.transientSummary?.strongTransientRatio??0,E=t.transientSummary?.meanOnsetSharpness??0,F=t.transientSummary?.meanOnsetSpread??0,L=t.transientSummary?.meanDecayTightness??0,B=t.leakAuditSummary?.meanOverallLeakRisk??0,O=t.leakAuditSummary?.highLeakRatio??0,T=t.leakAuditSummary?.meanRecommendedSuppression??0;return{anchorCount:n,atomCount:r,peakPolyphony:d,meanQuality:p,strongestAnchorHz:l,meanOrderedness:f,strongOrderedRatio:b,meanOrderedInharmonicSpread:g,meanResonanceStrength:y,strongResonanceRatio:x,meanResonanceSharpness:A,meanResidualStrength:M,strongResidualRatio:v,meanResidualFlatness:w,meanNoiseColorCentroid:R,meanTransientStrength:k,strongTransientRatio:I,meanOnsetSharpness:E,meanOnsetSpread:F,meanDecayTightness:L,meanLeakAuditRisk:B,highLeakAuditRatio:O,meanRecommendedSuppression:T,registerCounts:o,phaseCounts:i,regimeCounts:s}}
function MWe(e){const t=e.cells.length,n={low:0,mid:0,high:0},r={attack:0,sustain:0,release:0},a={tonal:0,cluster:0,noise:0,transient:0};let o=0,i=0,s=0,l=0,c=0,d=0,p=0,f=0,b=0,g=0,y=0,x=0,A=0,M=0,v=0,w=0,R=0,k=0,I=0,E=0,F=0,L=0,B=0,O=0;for(const T of e.cells)n[T.register]+=1,r[T.phase]+=1,a[T.regime]+=1,o+=T.stability,i+=T.pitchLeakRisk,s+=T.sequenceRecoverability,l+=T.prosodicTrace,c+=T.cellEntanglement,d=Math.max(d,T.quality),p+=T.orderedModel?.meanOrderedness??0,b+=T.orderedModel?.meanInharmonicSpread??0,f+=(T.orderedModel?.meanOrderedness??0)>.55?1:0,g+=T.resonanceModel?.meanResonanceStrength??0,x+=T.resonanceModel?.meanResonanceSharpness??0,y+=(T.resonanceModel?.meanResonanceStrength??0)>.48?1:0,A+=T.residualModel?.meanResidualStrength??0,v+=T.residualModel?.meanResidualFlatness??0,w+=T.residualModel?.meanNoiseColorCentroid??0,M+=(T.residualModel?.meanResidualStrength??0)>.48?1:0,R+=T.leakAuditModel?.meanOverallLeakRisk??0,k+=(T.leakAuditModel?.meanOverallLeakRisk??0)>.58?1:0,I+=T.leakAuditModel?.meanRecommendedSuppression??0,E+=T.transientModel?.meanTransientStrength??0,L+=T.transientModel?.meanOnsetSharpness??0,B+=T.transientModel?.meanOnsetSpread??0,O+=T.transientModel?.meanDecayTightness??0,F+=(T.transientModel?.meanTransientStrength??0)>.48?1:0;return t>0&&(o/=t,i/=t,s/=t,l/=t,c/=t,p/=t,b/=t,f/=t,g/=t,x/=t,y/=t,A/=t,v/=t,w/=t,M/=t,R/=t,k/=t,I/=t,E/=t,L/=t,B/=t,O/=t,F/=t),{cellCount:t,meanStability:o,meanPitchLeakRisk:i,meanSequenceRecoverability:s,meanProsodicTrace:l,meanCellEntanglement:c,strongestCellQuality:d,meanOrderedness:p,strongOrderedRatio:f,meanOrderedInharmonicSpread:b,meanResonanceStrength:g,strongResonanceRatio:y,meanResonanceSharpness:x,meanResidualStrength:A,strongResidualRatio:M,meanResidualFlatness:v,meanNoiseColorCentroid:w,meanTransientStrength:E,strongTransientRatio:F,meanOnsetSharpness:L,meanOnsetSpread:B,meanDecayTightness:O,meanLeakAuditRisk:R,highLeakAuditRatio:k,meanRecommendedSuppression:I,registerCounts:n,phaseCounts:r,regimeCounts:a}}
function b$(e){return e.source?[e.source.fileName,e.source.importStartSec,e.source.importDurationSec,e.source.sampleRate,e.bars,Math.round(e.bpm)].join(":"):e.fallback??"carrier-donor-v2-front"}
function wWe(e){if(!e.freshness.renderEligibility.canPreviewV2)throw new Error(e.freshness.renderEligibility.reason);if(!e.skeleton||!e.donorAtlas||e.donorUseMode!=="timbre_projection"&&!e.bindingPreview.length)throw new Error("V2 requires a carrier skeleton, donor atlas and binding.");if(e.donorUseMode==="raw_texture_overlay"&&(!e.materialField||!e.materialAllocationPreview))throw new Error("Raw Texture V2 requires a material field and material allocation.");return{skeleton:e.skeleton,donorAtlas:e.donorAtlas,bindingPreview:e.bindingPreview,materialField:e.materialField,materialAllocationPreview:e.materialAllocationPreview,transferProfile:e.transferProfile,donorUseMode:e.donorUseMode}}
function RWe(e){if(e.current.materialAllocationPreview&&e.current.materialAllocationSummary)return{materialAllocationPreview:e.current.materialAllocationPreview,materialAllocationSummary:e.current.materialAllocationSummary};if(!e.current.gestaltField||!e.current.materialField)return{materialAllocationPreview:e.current.materialAllocationPreview,materialAllocationSummary:e.current.materialAllocationSummary};const t=wK(e.current.gestaltField,e.current.materialField,e.transferProfile);return{materialAllocationPreview:t,materialAllocationSummary:RK(t)}}
function CWe(e){if(e.bindingPreview.length&&e.bindingSummary)return{bindingPreview:e.bindingPreview,bindingSummary:e.bindingSummary};if(!e.skeleton||!e.donorAtlas)return{bindingPreview:e.bindingPreview,bindingSummary:e.bindingSummary};const t=e.bindingPreview.length?e.bindingPreview:NB(e.skeleton,e.donorAtlas);return{bindingPreview:t,bindingSummary:sK(e.skeleton,t)}}
function kWe(e){const t=wWe(e.current),n=DU({bars:e.meter.bars,bpm:e.meter.bpm,durationSec:e.meter.intendedLoopDurationSec,donorUseMode:t.donorUseMode}),r=ev(e.spectralData),a=CWe(e.current),o=RWe({current:e.current,transferProfile:t.transferProfile}),i=jU(r.presence,t.skeleton,a.bindingPreview),s=e.donorSource?xse({samples:e.donorSource.monoSamples,sampleRate:e.donorSource.sampleRate,startSec:e.donorSource.importStartSec,durationSec:e.donorSource.importDurationSec,route:"spectralforge-carrier-donor",sourceRole:"spectralforge-donor",name:e.donorSource.fileName}):null,l=e.carrierIntegralSelection?ZS(e.carrierIntegralSelection):null,c=e.carrierIntegralSelection?QQ({machineId:e.carrierIntegralSelection.machineId,bodySourceMode:e.carrierIntegralSelection.bodySourceMode,params:l}):null,d=t.donorUseMode==="synthetic_pigment"?yK({skeleton:t.skeleton,bindingPreview:a.bindingPreview,donorAtlas:t.donorAtlas,materialField:t.materialField,materialAllocationPreview:o.materialAllocationPreview,bars:e.meter.bars,bpm:e.meter.bpm,durationSec:e.meter.intendedLoopDurationSec,donorUseMode:t.donorUseMode,materialInterpretationProfile:s,carrierIntegralParams:l,carrierIntegralRouteSignature:c,carrierIntegralTimbre:e.carrierIntegralSynthLab?yB(e.carrierIntegralSynthLab):null}):null,p=s?xG(s):MG(e.renderedBuffer,{route:"spectralforge-carrier-donor",durationSec:e.meter.intendedLoopDurationSec,bars:e.meter.bars,name:e.sourceSignature}),f=NU({sourceSignature:e.sourceSignature,loopMetadata:n,audioStats:BU(e.renderedBuffer),carrierSummary:e.current.summary,continuitySummary:e.current.continuitySummary,donorSummary:e.current.donorSummary,donorAtlasSummary:e.current.donorAtlasSummary,gestaltFieldSummary:e.current.gestaltFieldSummary,materialFieldSummary:e.current.materialFieldSummary,bindingSummary:a.bindingSummary,materialAllocationSummary:o.materialAllocationSummary,transferProfile:t.transferProfile,fieldCoverageContract:i,rootFollowPlan:d?.summary??null}),b=!!d?.summary.eligible&&n.rootFollowEligibility.canSend&&n.rootFollowEligibility.mode==="synthetic";return{mode:"carrier_donor_v2",sourceSignature:e.sourceSignature,buffer:e.renderedBuffer,loopMetadata:n,report:f,rootFollowConfig:d?.config??null,rootFollowPlan:d?.summary??null,rootFollowGranularProfile:p,donorMaterialProfile:s,syntheticRootFollow:b}}
function PWe(e){const t=e.artifacts.loopMetadata,n=e.materialName?.trim()||"SpectralForge V2",r=e.artifacts.buffer.length/Math.max(1,e.artifacts.buffer.sampleRate);return{name:n+(t.donorUseMode==="timbre_projection"?" · Donor-Projektion":t.donorUseMode==="synthetic_pigment"?" · V2 synthetisch":" · V2 raw granular"),role:"loop",bpm:t.bpm,bars:t.bars,guideSegments:e.meter.guideSegments,guideMarkers:e.meter.guideMarkers,loopStartSec:0,loopEndSec:t.durationSec,rootHz:null,sourceVersion:"xensonar-spectralforge-v2-4.103",renderMode:"carrier-donor-v2:"+t.donorUseMode,durationSec:r,intendedLoopDurationSec:t.durationSec,workspaceOrigin:"spectralforge-v2",transitionGuard:"V2 timing contract: bars and BPM from the upper SpectralForge timeline are retained in the Material Track package.",balanceCarrier:t.donorUseMode==="timbre_projection"?"The figure determines shape and timing; extracted donor material is synthesized per voice.":t.donorUseMode==="synthetic_pigment"?"CarrierPresence supplies time and frequency; donor acts as synthetic pigment.":"CarrierPresence supplies time and frequency; donor additionally adds raw granular texture.",routeSummary:t.donorUseMode==="timbre_projection"?"Donor body from the same synthesis as the listening preview.":"SpectralForge V2 was rendered from Carrier Skeleton, Donor Atlas, Binding, and Material Allocation into a Material Track loop.",stabilizeBy:e.artifacts.report.summaryLine,stableId:e.stableId,rootFollowPreferred:e.artifacts.syntheticRootFollow,rootFollowGranularProfile:Gse(e.artifacts.rootFollowGranularProfile),spectralGranularBridge:e.artifacts.rootFollowGranularProfile?.bridgeProfile.summary}}
async function IWe(e){const t=++e.extractionGeneration.current;e.stopDonorAudition(),e.clearLocalValidationState();const n=pe.getState(),{setEmbodimentStatus:r,setEmbodimentPipelineState:a,setSpectralEmbodimentSourceAsset:o,setCarrierDonorV2Patch:i,setEmbodimentField:s,beginCarrierSkeletonBuild:l,finishCarrierSkeletonBuild:c,failCarrierSkeletonBuild:d,beginDonorAnalysisBuild:p,finishDonorAnalysisBuild:f,failDonorAnalysisBuild:b,beginDonorAtlasBuild:g,finishDonorAtlasBuild:y,failDonorAtlasBuild:x,beginGestaltFieldBuild:A,finishGestaltFieldBuild:M,failGestaltFieldBuild:v,beginMaterialFieldBuild:w,finishMaterialFieldBuild:R,failMaterialFieldBuild:k,beginMaterialAllocationBuild:I,finishMaterialAllocationBuild:E,failMaterialAllocationBuild:F,beginBindingBuild:L,finishBindingBuild:B,failBindingBuild:O}=n;r("building","V2 embodiment is reading the carrier and donor selection …"),a({stage:"preview_ready",freshness:"dirty",message:"V2 embodiment is calculated from the purple selection mask and the current workbench shape.",lastUpdatedAt:Date.now()});try{const T=e.payload.selection.fineLoopRange,_=sg(e.payload.source.sourceAsset,{startSec:T.startSec,durationSec:T.durationSec});o(_);const G=Vt.beginExtraction(_);try{const re=await kE(_);if(e.extractionGeneration.current!==t||!Vt.commitExtraction(G,_,re))return!1}catch(re){throw Vt.failExtraction(G,re),re}if(pe.getState().carrierDonorV2.donorUseMode==="timbre_projection")return s(GU(e.spectralData,e.intendedLoopDuration),"ready","Sound material ready. Select a donor and listen to the figure."),a({stage:"preview_ready",freshness:"clean",message:"Donor sound material ready.",lastUpdatedAt:Date.now()}),e.setForge3AudioMode("body"),i({busy:"none"}),!0;const j=rBe(e.renderVersion,e.materialExport.bars);l(j);const N=IR(e.spectralData),W=OU(N),V=qOe(N),U=M5e(V);c(j,N,W,V,U),A();const H=JOe(N,V),q=ZOe(H);M(H,q);const K=await av(_);if(e.extractionGeneration.current!==t)return!1;o(K);const Y=aBe(K);if(!Y)throw new Error("Could not create V2 donor fingerprint.");p(Y);const J=vVe(K),Z=AWe(K,J),te=xWe(J,Z);f(Y,J,Z,te),g();const X=lK(Z),Q=MWe(X);if(y(X,Q),await kE(K),e.extractionGeneration.current!==t)return!1;w();const ne=l_e(X),ee=c_e(ne);R(ne,ee),L(),I();const ie=NB(N,X),de=sK(N,ie),oe=wK(H,ne,e.transferProfile),ue=RK(oe);B(ie,de),E(oe,ue);const fe=b$({source:K,bars:e.materialExport.bars,bpm:e.materialExport.bpm,fallback:"carrier-donor-v2-front"}),he=m_e({spectralData:e.spectralData,skeleton:N,materialField:ne,materialAllocationPreview:oe,durationSec:e.intendedLoopDuration,sourceSignature:fe});return s(he,"ready","V2 Embodiment ready · "+W.anchorCount+" Anker · "+Q.cellCount+" Donor-Zellen · "+de.bindingCount+" Bindings · "+e.materialExport.bars+" bars @ "+Math.round(e.materialExport.bpm)+" BPM = "+e.intendedLoopDuration.toFixed(2)+"s."),a({stage:"preview_ready",freshness:"clean",message:"V2 embodiment ready: Presence → Skeleton → Binding · Material Allocation"+ue.allocationCount+"Zones · Leak"+ue.meanLeakRisk.toFixed(2)+" · Mode "+pe.getState().carrierDonorV2.donorUseMode+".",lastUpdatedAt:Date.now()}),e.setForge3AudioMode("body"),!0}catch(T){if(e.extractionGeneration.current!==t)return!1;const _=T instanceof Error?T.message:"V2 Embodiment could not be rendered.";return console.error("Front V2 embodiment workflow failed",T),i({busy:"none"}),d(_),b(_),x(_),v(_),k(_),O(_),F(_),r("error",_),!1}}
function az(e,t){return(e.trim().replace(/\.[^.]+$/,"").replace(/[^a-z0-9äöüß _-]+/gi,"-").replace(/\s+/g," ")||t).trim()}
function rP(e,t){if(typeof window>"u")return;const n=window.URL.createObjectURL(e);DV(n,e,t,"spectralForge/carrierDonorV2FrontActions.triggerBlobDownload");const r=window.document.createElement("a");r.href=n,r.download=t,window.document.body.appendChild(r),r.click(),r.remove(),window.setTimeout(()=>{window.URL.revokeObjectURL(n),NV(n,"spectral-forge-room-download-url-revoked")},5e3)}
function EWe(e){const t=()=>e.donorReady||(e.embodimentField?.builtFromSignature?.startsWith("carrier-donor-v2:")??!1),n=(l=e.spectralEmbodimentSourceAsset??e.sourceAsset)=>b$({source:l,bars:e.materialExport.bars,bpm:e.materialExport.bpm,fallback:"carrier-donor-v2-front"}),r=async()=>{const l=Vt.getSnapshot(),c=pe.getState();if(l.selected||c.carrierDonorV2.donorUseMode==="timbre_projection"){if(!l.source||!l.model)throw new Error("Please extract timbre first.");const b=Zp(c.materialExport.bars,c.materialExport.bpm,c.materialExport.beatsPerBar),g=await xt.renderDonorBodyToBuffer(c.spectralData,l.source,b);if(Vt.getSnapshot().source!==l.source||Vt.getSnapshot().model!==l.model||pe.getState().renderVersion!==c.renderVersion||Zp(pe.getState().materialExport.bars,pe.getState().materialExport.bpm,pe.getState().materialExport.beatsPerBar)!==b)throw new Error("Figure or donor changed. Please export again.");return C5e({spectralData:c.spectralData,current:c.carrierDonorV2,donorSource:l.source,renderedBuffer:g,sourceSignature:n(l.source),meter:{...c.materialExport,intendedLoopDurationSec:b}})}const d=pe.getState().carrierDonorV2,p=pe.getState().spectralEmbodimentSourceAsset??e.sourceAsset;if(!d.freshness.renderEligibility.canPreviewV2)throw new Error(d.freshness.renderEligibility.reason);if(!d.skeleton||!d.donorAtlas||d.donorUseMode!=="timbre_projection"&&!d.bindingPreview.length)throw new Error("V2 requires a carrier skeleton, donor atlas and binding.");if(d.donorUseMode==="raw_texture_overlay"&&(!d.materialField||!d.materialAllocationPreview))throw new Error("Raw Texture V2 requires a material field and material allocation.");const f=await xt.renderCarrierDonorV2CompositeToBuffer(e.spectralData,e.synthMode,e.waveformMix,d.skeleton,d.bindingPreview,d.donorAtlas,d.materialField,d.materialAllocationPreview,p,d.transferProfile,e.intendedLoopDuration,d.donorUseMode);return kWe({spectralData:e.spectralData,current:d,donorSource:p,renderedBuffer:f,sourceSignature:n(p),meter:{bars:e.materialExport.bars,bpm:e.materialExport.bpm,guideSegments:e.materialExport.guideSegments,guideMarkers:e.materialExport.guideMarkers,intendedLoopDurationSec:e.intendedLoopDuration},carrierIntegralSelection:e.carrierIntegralSelection,carrierIntegralSynthLab:e.carrierIntegralSynthLab})};return{isFrontV2Field:t,buildValidationArtifacts:r,runValidation:async()=>{if(t()){e.setValidationBusy(!0);try{const l=await r();e.setValidationReport(l.report),e.setEmbodimentStatus(e.embodimentStatus,"V2-Validation: "+l.report.summaryLine)}catch(l){e.setEmbodimentStatus("error",l instanceof Error?l.message:"V2 validation could not be calculated.")}finally{e.setValidationBusy(!1)}}},downloadValidationReport:async()=>{if(!t())return;const l=e.validationReport?null:await r(),c=e.validationReport??l?.report;if(!c)return;l&&e.setValidationReport(c);const d=new Blob([JSON.stringify(c,null,2)],{type:"application/json"});rP(d,az(c.sourceSignature,"carrier-donor-v2")+".v2.validation.json")},sendToMaterialspur:async()=>{if(t()){e.setMaterialSendBusy(!0);try{const l=await r();e.setValidationReport(l.report);const c=lg(l.buffer),d=l.syntheticRootFollow,p=$T(PWe({artifacts:l,meter:{guideSegments:e.materialExport.guideSegments,guideMarkers:e.materialExport.guideMarkers},materialName:e.materialExport.name,stableId:"spectralforge-v2-"+Date.now().toString(36)}),c);d&&l.rootFollowConfig&&ri("rootFollowBankMembership",{entryId:p.id,enabled:!0,config:l.rootFollowConfig}),e.setLastMaterialEntry(p);const f=d&&l.rootFollowPlan?" · Root Follow prepared synthetically: "+l.rootFollowPlan.lineCount+" lines.":d?" · Root Follow queued.":".";e.setEmbodimentStatus("ready","V2 sent to Material Track:"+p.name+" · "+p.bars+" bars · "+(p.intendedLoopDurationSec??p.durationSec).toFixed(2)+"s"+f)}catch(l){console.error("Front V2 material handoff failed",l),e.setEmbodimentStatus("error",l instanceof Error?l.message:"V2 could not be sent to Material Track.")}finally{e.setMaterialSendBusy(!1)}}},downloadValidationBundle:async()=>{if(t()){e.setValidationBusy(!0);try{const l=await r();e.setValidationReport(l.report);const c=az(l.report.sourceSignature,"carrier-donor-v2");rP(lg(l.buffer),c+"__v2.wav");const d=new Blob([JSON.stringify(l.report,null,2)],{type:"application/json"});rP(d,c+"__v2.validation.json")}catch(l){e.setEmbodimentStatus("error",l instanceof Error?l.message:"V2 validation bundle could not be created.")}finally{e.setValidationBusy(!1)}}}}}
function FWe(e,t,n='legacy',r='classic'){P.useEffect(()=>{
 if(!e)return;const key=event=>{const state=pe.getState(),target=event.target;
 if(target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target?.tagName))return;
 if(event.ctrlKey||event.metaKey){if(event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?state.redo():state.undo();}else if(event.key.toLowerCase()==='y'){event.preventDefault();state.redo();}return;}
 if(event.key===' '){event.preventDefault();if(n==='forge3'&&__ForgeTransportAccess.hasOwner()){void __ForgeTransportAccess.toggle();return;}if(state.isPlaying){__f333Stop();pe.setState(__f333Idle());return;}
  __f333PlayCurrent(state,{audioMode:r,fromPosition:state.playheadPosition,onPosition:p=>pe.getState().setPlayheadPosition(p),onEnd:()=>pe.setState(__f333Idle())})
   .then(played=>{if(played)pe.setState({isPlaying:true,showPlayheadMarker:true})}).catch(error=>console.warn('[forge][play]',error));return;}
 const tools={b:'brush',h:'hardBrush',l:'line',a:'harmonicBrush',n:'noiseBrush',s:'spray',f:'formant',t:'stamp',m:'morph',j:'smudge',d:'dodgeBurn',k:'blurSharpen',y:'delaySmear',r:'threshold',u:'sourceTrace'};
 const lower=event.key.toLowerCase();
 if(state.activeTool==='stamp'&&state.stampPhase==='stamping'&&state.stampData){
  if(['ArrowRight','ArrowLeft','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();state.adjustStampScale(event.key==='ArrowRight'?.08:event.key==='ArrowLeft'?-.08:0,event.key==='ArrowUp'?.08:event.key==='ArrowDown'?-.08:0);return;}
  if(lower==='q'||lower==='e'){event.preventDefault();state.rotateStamp(lower==='q'?-Math.PI/32:Math.PI/32);return;}
 }
 if(tools[lower])state.setActiveTool(tools[lower]);else if(lower==='x')state.toggleEraseMode();else if(lower==='g')state.setShowGrainLayer(!state.showGrainLayer);
 };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
},[e,r]);}
function LWe(e){const t=new ph(Math.max(8,e.width),Math.max(8,e.height));return t.data.set(e.data),t.grainData.set(e.grainData),t}
/* Spectral Forge UI-only pointer pitch. No influence on material, audio, or tuning. */
const __XenForgePitchHeaderState=(()=>{
 let snapshot=Object.freeze({active:false,note:'—',hz:'—',near:false});
 const listeners=new Set();
 const subscribe=fn=>{listeners.add(fn);return()=>listeners.delete(fn)};
 const getSnapshot=()=>snapshot;
 const publish=next=>{
  if(snapshot.active===next.active&&snapshot.note===next.note&&snapshot.hz===next.hz&&snapshot.near===next.near)return;
  snapshot=Object.freeze(next);for(const listener of listeners)listener();
 };
 function update(hz,gridHeight){
  if(!(Number.isFinite(hz)&&hz>0)){clear();return;}
  const midi=69+12*Math.log2(hz/440),rounded=Math.round(midi);
  const noteHz=440*Math.pow(2,(rounded-69)/12);
  const cents=Math.abs(1200 * Math.log2(hz/noteHz));
  // The cursor is mapped to discrete spectral rows; take that spatial precision
  // into account so a conventional note centre can actually be hit.
  const rowCents=1200*Math.log2(1000)/Math.max(1,gridHeight);
  const near=cents<=Math.min(29,Math.max(5,rowCents*.52));
  publish({active:true,note:NFe(hz),hz:hz.toFixed(1),near});
 }
 function clear(){publish({active:false,note:'—',hz:'—',near:false})}
 return Object.freeze({subscribe,getSnapshot,update,clear});
})();
function __ForgeHeaderPitch(){
 const store=__XenForgePitchHeaderState;
 const value=P.useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot);
 return u.jsxs('div',{'data-forge-header-pitch':true,'data-forge-pitch-readout':true,
  role:'status','aria-live':'off',
  title:'Cursor pitch · Hz is continuous; note names reference 12-tone equal temperament only',
  className:'xen-forge-header-pitch',children:[
   u.jsx('span',{className:'xen-forge-note-marker'+(value.near?' xen-forge-pitch-near':''),'aria-hidden':'true',children:'≈'}),
   u.jsx('span',{className:'xen-forge-note-name',children:value.note}),
   u.jsx('span',{className:'xen-forge-note-freq',children:value.hz+' Hz'})]});
}
/* FP9: one projected Forge transport-status owner, not a second persisted status. */
const __ForgeBottomStatusState=(()=>{
 let current=Object.freeze({message:'',error:false});const listeners=new Set();
 const subscribe=fn=>{listeners.add(fn);return()=>listeners.delete(fn)};
 const getSnapshot=()=>current;
 const publish=raw=>{const message=String(raw||'');const error=/^(Transfer failed|Listening-mode transfer failed|Error|Failed|Cannot |Unable )/i.test(message);
  // A later preview tick must never erase a transfer failure. A new explicit send can release it.
  if(current.error&&!error&&!/^(Preparing (?:Pink|Carrier|Raw|material|transfer)|Sending|Transfer started|Importing)/i.test(message))return;
  if(current.message===message&&current.error===error)return;
  current=Object.freeze({message,error});for(const fn of listeners)fn();};
 return Object.freeze({subscribe,getSnapshot,publish});
})();
function __ForgeBottomStatus(){
 const store=__ForgeBottomStatusState;
 const state=P.useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot);
 return u.jsx('div',{'data-forge-progress-line':'true','data-forge-hearing-status':'true',
  role:state.error?'alert':'status','aria-live':state.error?'assertive':'polite','aria-atomic':'true',
  className:'xen-forge-progress-line'+(state.error?' xen-forge-progress-error':''),
  title:state.message||undefined,children:state.message||' '});
}
window.__ForgeBottomStatusState=__ForgeBottomStatusState;
function __ForgeF38History(){const undo=pe(z=>z.undo),redo=pe(z=>z.redo),clear=pe(z=>z.clearCanvas),reset=pe(z=>z.resetForgeMainPath),uN=pe(z=>z.undoStack.length),rN=pe(z=>z.redoStack.length),ctx=pe(z=>z.sourceAssetContext);return u.jsxs("div",{className:"flex flex-wrap items-center gap-1.5",role:"group","aria-label":"Werkbankverlauf","data-forge-draw-history":"true",children:[u.jsx("button",{type:"button",onClick:undo,disabled:uN===0,title:ctx==="forge3_main"?"Undo: Hauptpfad (Ctrl+Z)":"Undo: Werkbank (Ctrl+Z)",className:"h-7 rounded bg-gray-800 px-2 text-gray-200 hover:bg-gray-700 disabled:opacity-30",children:"↶ Undo"}),u.jsx("button",{type:"button",onClick:redo,disabled:rN===0,title:"Redo (Ctrl+Y)",className:"h-7 rounded bg-gray-800 px-2 text-gray-200 hover:bg-gray-700 disabled:opacity-30",children:"↷ Redo"}),u.jsx("button",{type:"button",onClick:clear,title:"Clear Workbench",className:"h-7 rounded bg-red-900/50 px-2 text-red-300 hover:bg-red-800","aria-label":"Clear Workbench",children:"🗑️"}),u.jsx("button",{type:"button",onClick:reset,title:"Reset Forge Main Path",className:"h-7 rounded bg-amber-900/50 px-2 text-amber-200 hover:bg-amber-800","aria-label":"Reset Forge Main Path",children:"⟲"})]})}
function BWe({onBack: e, variant: t = "legacy", sidebarTop: n, forge3Lens: r = "hear", footerContent: a, externalAudioUploadFile: o = null, externalAudioUploadOrigin: i = null, entryScrollIntent: s = null, onExternalAudioUploadConsumed: l, onEntryScrollIntentConsumed: c}) {
    const d = P.useRef(null), p = P.useRef(null), [f, b] = P.useState(!0), [__forgeSidebarCollapsed, __setForgeSidebarCollapsed] = P.useState(!1), [__advancedOpen, __setAdvancedOpen] = P.useState(false), [g] = P.useState(!1), [y, x] = P.useState("classic"), [A, M] = P.useState(null), [v, w] = P.useState(!1), [R, k] = P.useState(!1), [I, E] = P.useState(null), F = pe(Se => Se.audioBufferDirty), L = pe(Se => Se.setAudioBufferDirty), B = pe(Se => Se.materialExport), O = pe(Se => Se.updateMaterialExport), T = pe(Se => Se.renderVersion), _ = pe(Se => Se.spectralData), G = pe(Se => Se.sourceAsset), j = pe(Se => Se.synthMode), N = pe(Se => Se.waveformMix), W = pe(Se => Se.embodimentField), V = pe(Se => Se.embodimentStatus), U = pe(Se => Se.embodimentMessage), H = pe(Se => Se.embodimentLayersVisibility), q = pe(Se => Se.setEmbodimentField), K = pe(Se => Se.setEmbodimentStatus), Y = pe(Se => Se.setEmbodimentLayersVisibility), J = pe(Se => Se.carrierDonorV2), Z = pe(Se => Se.carrierIntegralSelection), te = pe(Se => Se.carrierIntegralSynthLab), X = pe(Se => Se.spectralEmbodimentSourceAsset), {donorState: Q, donorReady: ne, donorPhase: ee, donorError: ie, donorRenderProgress: de, donorFigurePrepared: oe, extractionGeneration: ue, donorProofActive: fe, stopDonorAudition: he, handleDonorInputChange: re, handleDonorPreview: le, handleDonorProof: Ae, selectOtherHearing: ce, donorRegisterPolicy: ge, donorRegisterAvailable: Ce, handleDonorRegisterPolicy: Re, donorRenderMethod: se, donorHybridAvailable: xe, handleDonorRenderMethod: Be} = v5e(), Ie = P.useRef(null);
    const __waveAutoCollapseOwned=P.useRef(false),__forgeSidebarNow=P.useRef(__forgeSidebarCollapsed);
    P.useEffect(()=>{__forgeSidebarNow.current=__forgeSidebarCollapsed},[__forgeSidebarCollapsed]);
    P.useEffect(()=>{
      if(t!=="forge3")return;
      const onVisibility=event=>{
        if(event.detail?.open===true){
          if(!__forgeSidebarNow.current){__waveAutoCollapseOwned.current=true;__forgeSidebarNow.current=true;__setForgeSidebarCollapsed(true)}
        }else if(event.detail?.open===false&&__waveAutoCollapseOwned.current){
          __waveAutoCollapseOwned.current=false;__forgeSidebarNow.current=false;__setForgeSidebarCollapsed(false);
        }
      };
      window.addEventListener('xensonar:wave-editor-visibility',onVisibility);
      return()=>window.removeEventListener('xensonar:wave-editor-visibility',onVisibility);
    },[t]);

    P.useEffect(() => {
        d.current?.focus({
            preventScroll: !0
        });
    }, []), P.useEffect(() => {
        F && (xt.invalidateBuffer(), L(!1));
    }, [ F, L ]), P.useEffect(() => {
        const Se = g3(G, "main");
        return () => {
            Se?.markReleased("spectral-forge-main-source-asset-context-replaced");
        };
    }, [ G ]), P.useEffect(() => {
        const Se = g3(X, "embodiment");
        return () => {
            Se?.markReleased("spectral-forge-embodiment-source-asset-context-replaced");
        };
    }, [ X ]), FWe(f, B, t, y);
    const Qe = () => {
        window.setTimeout(() => {
            p.current?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }, 80);
    }, Ne = P.useMemo(() => Zp(B.bars, B.bpm, B.beatsPerBar), [ B.bars, B.bpm, B.beatsPerBar ]), Ue = `${T}:${Ne}`, Ye = P.useRef(Ue);
    P.useEffect(() => {
        Ye.current !== Ue && (Ye.current = Ue, (ee === "rendering" || ee === "playing") && he());
    }, [ Ue, ee ]), P.useEffect(() => {
        if (!ne || J.donorUseMode !== "timbre_projection" && !Q.selected) return;
        const Se = window.setTimeout(() => {
            const be = pe.getState();
            q(GU(be.spectralData, Ne), "ready", "Carrier Figure · Sound Material Ready");
        }, 150);
        return () => window.clearTimeout(Se);
    }, [ Ue, ne, Q.model, Q.selected, J.donorUseMode, Ne, q ]);
    const Ve = t === "forge3" ? "← Back to III.2" : "← Back to V", tt = P.useMemo(() => cVe({
        spectralData: _,
        synthMode: j,
        waveformMix: N,
        sourceView: "energy",
        activeWorkspace: "wave-material"
    }), [ _, j, N ]), dt = async ({name: Se, stampData: be}) => {
        const ve = await xt.renderToBuffer(LWe(be), j, N), Je = lg(ve);
        await u$({
            blob: Je,
            name: `${az(Se, "stempel-sample")}.wav`
        });
    }, {isFrontV2Field: gt, runValidation: Ge, downloadValidationReport: Te, sendToMaterialspur: rt, downloadValidationBundle: lt} = EWe({
        spectralData: _,
        synthMode: j,
        waveformMix: N,
        sourceAsset: G,
        spectralEmbodimentSourceAsset: X,
        embodimentField: W,
        embodimentStatus: V,
        donorReady: ne,
        carrierIntegralSelection: Z,
        carrierIntegralSynthLab: te,
        materialExport: B,
        intendedLoopDuration: Ne,
        validationReport: A,
        setValidationBusy: w,
        setValidationReport: M,
        setMaterialSendBusy: k,
        setLastMaterialEntry: E,
        setEmbodimentStatus: K
    }), ut = Se => IWe({
        payload: Se,
        extractionGeneration: ue,
        stopDonorAudition: he,
        clearLocalValidationState: () => {
            M(null), E(null);
        },
        setForge3AudioMode: x,
        renderVersion: T,
        spectralData: _,
        materialExport: {
            bars: B.bars,
            bpm: B.bpm
        },
        transferProfile: J.transferProfile,
        intendedLoopDuration: Ne
    }), at = Se => {
        Y({
            [Se]: !H[Se]
        });
    }, qe = async () => {
        if (pe.getState().carrierDonorV2.donorUseMode === "timbre_projection") {
            await le();
            return;
        }
        if (!gt()) return;
        const Se = pe.getState().carrierDonorV2, be = pe.getState().spectralEmbodimentSourceAsset ?? G;
        !Se.skeleton || !Se.donorAtlas || Se.donorUseMode !== "timbre_projection" && !Se.bindingPreview.length || await xt.playCarrierDonorV2Preview(_, j, N, Se.skeleton, Se.bindingPreview, Se.donorAtlas, Se.materialField, Se.materialAllocationPreview, be, Se.transferProfile, Ne, Se.donorUseMode, 0);
    }, mt = ne || W?.builtFromSignature?.startsWith("carrier-donor-v2:") ? "carrier_donor_v2" : "legacy", It = J.donorUseMode === "timbre_projection" || Q.selected ? ne : mt === "carrier_donor_v2" && J.freshness.renderEligibility.canPreviewV2, Ct = It ? ne ? "Sound Material Ready" : "V2 Ready" : "missing", St = It ? "V2 Ready · " + B.bars + " bars · " + Ne.toFixed(2) + "s" : V === "ready" ? "ready" : V === "building" ? "building" : V === "error" ? "Error" : "missing", At = t === "forge3" ? u.jsxs("div", {
        className: "space-y-3 text-white select-none",
        children: [ u.jsxs("section", {
            id: "spectralforge-station-draw",
            "data-forge-station": "draw",
            className: "scroll-mt-4 overflow-hidden border border-neutral-800 border-t-2 border-t-violet-500/70 bg-gray-950",
            children: [ u.jsx("header", {
                className: "xen-forge-draw-header flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 bg-neutral-950 px-3 py-2",
                children: u.jsxs(u.Fragment, {
                    children: [ u.jsx(__ForgeHeaderPlay, {}), u.jsx(__ForgeHeaderPitch, {}), u.jsx(__ForgeF38History, {}), u.jsxs(u.Fragment,{children:[u.jsx('button',{type:'button','data-forge-down-corner':true,className:'xen-forge-down-corner','aria-label':'Scroll to the very bottom',onClick:e=>__forgeScrollCompletelyDown(e.currentTarget)}),u.jsx('button',{type:'button','data-forge-down-corner-inner':true,className:'xen-forge-down-corner-inner','aria-label':'Scroll down to the Forge UP controls',onClick:__forgeScrollToForgeActionRack})]}) ]
                })
            }), u.jsxs("div", {
                className: "flex min-h-[560px] min-w-0 overflow-hidden",
                children: [ u.jsx(b4e, {}), u.jsxs("div", {
                    className: "flex min-w-0 flex-1 flex-col",
                    children: [ u.jsx("div", {
                        className: t === "forge3" ? "flex min-h-[470px] shrink-0 flex-col md:min-h-[550px] lg:min-h-[630px]" : "flex min-h-[440px] shrink-0 flex-col md:min-h-[520px] lg:min-h-[600px]",
                        style: t === "forge3" && __forgeSidebarCollapsed && !__waveAutoCollapseOwned.current ? {
                            minHeight: "min(88vh, 1000px)"
                        } : void 0,
                        children: u.jsx(r4e, {
                            variant: t,
                            forge3Lens: r,
                            showTraceLayer: g
                        })
                    }), u.jsx("div", {"data-forge-brush-row":true,children:u.jsx(C4e,{})}), u.jsx("section",{id:"spectralforge-station-output","data-forge-transport-under-canvas":true,className:"min-w-0 border-t border-emerald-900/60",children:u.jsx(C6e,{ref:Ie,variant:t,forge3AudioMode:y,onChangeForge3AudioMode:x})}) ]
                }) ]
            }) ]
        }), u.jsxs("section", {
            id: "spectralforge-station-material",
            "data-forge-station": "material",
            className: "scroll-mt-4 overflow-hidden border border-neutral-800 border-t-2 border-t-cyan-500/70 bg-gray-950",
            children: [ u.jsx("header", {
                className: "flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 bg-neutral-950 px-3 py-2",
                children: u.jsx("h2", {
                    className: "text-sm font-semibold text-neutral-100",
                    children: "Sound Material · Donor"
                })
            }), u.jsx(CGe, {
                sourceAdapters: [ rVe, aVe ],
                targetAdapter: oVe,
                rawTargetAdapter: iVe,
                rawRootFollowTargetAdapter: sVe,
                rawMelodicPinkLaneTargetAdapter: lVe,
                rawMelodicSampleTargetAdapter: tt,
                onMetaPatch: Se => O(Se),
                meter: {
                    bpm: B.bpm,
                    bars: B.bars,
                    guideSegments: B.guideSegments,
                    guideMarkers: B.guideMarkers
                },
                persistenceKey: `spectral-${t}`,
                externalLoadFile: o,
                externalLoadOrigin: i,
                entryScrollIntent: s,
                onExternalLoadConsumed: l,
                onEntryScrollIntentConsumed: c,
                loadButtonLabel: "Import Audio",
                onDonorInputChange: re,
                onEmbodyTimbre: ut,
                exportMeta: {
                    name: B.name,
                    role: B.role,
                    bpm: B.bpm,
                    bars: B.bars,
                    guideSegments: B.guideSegments,
                    rootHz: B.rootHz
                },
                timbreStatusLabel: Ct,
                embodimentStatusLabel: St
            }) ]
        }), null, null, t === "forge3" ? u.jsxs("details", {
            "data-forge-advanced": "v1",
            className: "mx-3 mb-3 rounded border border-neutral-800 bg-neutral-950/50 text-xs text-neutral-300",
            onToggle: Se => __setAdvancedOpen(Se.currentTarget.open),
            children: [ u.jsx("summary", {
                className: "cursor-pointer select-none px-3 py-2 text-neutral-400 hover:text-neutral-100",
                children: "Additional Sound Paths & Diagnostics"
            }), u.jsx("div",{"data-forge-material-diagnostics-slot":"true",className:"space-y-2 border-t border-neutral-800 p-3"}), __advancedOpen && u.jsxs("div", {
                className: "space-y-3 border-t border-neutral-800 p-3",
                children: [ u.jsxs("label", {
                    className: "flex items-center gap-3 px-3 py-2 text-xs text-neutral-300",
                    children: [ "Sound Transfer", u.jsx("select", {
                        className: "rounded border border-neutral-700 bg-neutral-900 px-2 py-1",
                        value: J.donorUseMode,
                        disabled: J.busy !== "none",
                        onChange: Se => {
                            xt.stop(), pe.getState().setCarrierDonorV2DonorUseMode(Se.target.value), M(null), 
                            E(null);
                        },
                        children: Object.entries(XLe).map(([Se, be]) => u.jsx("option", {
                            value: Se,
                            children: be
                        }, Se))
                    }) ]
                }), u.jsx(YGe, {
                    embodimentField: W,
                    embodimentStatus: V,
                    embodimentMessage: U,
                    embodimentLayersVisibility: H,
                    v2ValidationReport: A,
                    fieldMode: mt,
                    previewAvailable: It,
                    previewPhase: ee,
                    previewError: ie,
                    validationBusy: v,
                    onToggleLayer: at,
                    onPlayPreview: qe,
                    onRunValidation: Ge,
                    onDownloadValidationReport: Te,
                    onDownloadValidationBundle: lt,
                    onSendToMaterialspur: rt,
                    materialspurSendBusy: R,
                    materialspurEntryLabel: I ? I.name + " · " + I.bars + " bars" : null
                }), a ]
            }) ]
        }) : u.jsxs(u.Fragment, {
            children: [ u.jsxs("label", {
                className: "flex items-center gap-3 px-3 py-2 text-xs text-neutral-300",
                children: [ "Sound Transfer", u.jsx("select", {
                    className: "rounded border border-neutral-700 bg-neutral-900 px-2 py-1",
                    value: J.donorUseMode,
                    disabled: J.busy !== "none",
                    onChange: Se => {
                        xt.stop(), pe.getState().setCarrierDonorV2DonorUseMode(Se.target.value), M(null), 
                        E(null);
                    },
                    children: Object.entries(XLe).map(([Se, be]) => u.jsx("option", {
                        value: Se,
                        children: be
                    }, Se))
                }) ]
            }), u.jsx(YGe, {
                embodimentField: W,
                embodimentStatus: V,
                embodimentMessage: U,
                embodimentLayersVisibility: H,
                v2ValidationReport: A,
                fieldMode: mt,
                previewAvailable: It,
                previewPhase: ee,
                previewError: ie,
                validationBusy: v,
                onToggleLayer: at,
                onPlayPreview: qe,
                onRunValidation: Ge,
                onDownloadValidationReport: Te,
                onDownloadValidationBundle: lt,
                onSendToMaterialspur: rt,
                materialspurSendBusy: R,
                materialspurEntryLabel: I ? I.name + " · " + I.bars + " bars" : null
            }) ]
        }) ]
    }) : u.jsx("div", {
        className: "space-y-3",
        children: u.jsxs("div", {
            className: "flex min-h-[720px] overflow-hidden border border-neutral-800 bg-gray-950 text-white select-none",
            children: [ u.jsx(b4e, {}), u.jsxs("div", {
                className: "flex min-h-0 min-w-0 flex-1 flex-col",
                style: {
                    overscrollBehavior: "auto"
                },
                children: [ u.jsx("div", {
                    className: "flex min-h-[440px] shrink-0 flex-col md:min-h-[520px] lg:min-h-[600px]",
                    children: u.jsx(r4e, {
                        variant: t,
                        forge3Lens: r,
                        showTraceLayer: g
                    })
                }), u.jsx(C6e, {
                    ref: Ie,
                    variant: t,
                    forge3AudioMode: y,
                    onChangeForge3AudioMode: x
                }), u.jsx(C4e, {}), u.jsx(CGe, {
                    sourceAdapters: [ rVe, aVe ],
                    targetAdapter: oVe,
                    rawTargetAdapter: iVe,
                    rawRootFollowTargetAdapter: sVe,
                    rawMelodicPinkLaneTargetAdapter: lVe,
                    rawMelodicSampleTargetAdapter: tt,
                    onMetaPatch: Se => O(Se),
                    meter: {
                        bpm: B.bpm,
                        bars: B.bars,
                        guideSegments: B.guideSegments,
                        guideMarkers: B.guideMarkers
                    },
                    persistenceKey: `spectral-${t}`,
                    externalLoadFile: o,
                    externalLoadOrigin: i,
                    entryScrollIntent: s,
                    onExternalLoadConsumed: l,
                    onEntryScrollIntentConsumed: c,
                    loadButtonLabel: "Import Audio",
                    onDonorInputChange: re,
                    onEmbodyTimbre: ut,
                    exportMeta: {
                        name: B.name,
                        role: B.role,
                        bpm: B.bpm,
                        bars: B.bars,
                        guideSegments: B.guideSegments
                    },
                    timbreStatusLabel: Ct,
                    embodimentStatusLabel: St
                }), t === "forge3" ? u.jsxs("details", {
                    "data-forge-advanced": "v1",
                    className: "mx-3 mb-3 rounded border border-neutral-800 bg-neutral-950/50 text-xs text-neutral-300",
                    onToggle: Se => __setAdvancedOpen(Se.currentTarget.open),
                    children: [ u.jsx("summary", {
                        className: "cursor-pointer select-none px-3 py-2 text-neutral-400 hover:text-neutral-100",
                        children: "Additional Sound Paths & Diagnostics"
                    }), u.jsx("div",{"data-forge-material-diagnostics-slot":"true",className:"space-y-2 border-t border-neutral-800 p-3"}), __advancedOpen && u.jsxs("div", {
                        className: "space-y-3 border-t border-neutral-800 p-3",
                        children: [ u.jsxs("label", {
                            className: "flex items-center gap-3 px-3 py-2 text-xs text-neutral-300",
                            children: [ "Sound Transfer", u.jsx("select", {
                                className: "rounded border border-neutral-700 bg-neutral-900 px-2 py-1",
                                value: J.donorUseMode,
                                disabled: J.busy !== "none",
                                onChange: Se => {
                                    xt.stop(), pe.getState().setCarrierDonorV2DonorUseMode(Se.target.value), M(null), 
                                    E(null);
                                },
                                children: Object.entries(XLe).map(([Se, be]) => u.jsx("option", {
                                    value: Se,
                                    children: be
                                }, Se))
                            }) ]
                        }), u.jsx(YGe, {
                            embodimentField: W,
                            embodimentStatus: V,
                            embodimentMessage: U,
                            embodimentLayersVisibility: H,
                            v2ValidationReport: A,
                            fieldMode: mt,
                            previewAvailable: It,
                            previewPhase: ee,
                            previewError: ie,
                            validationBusy: v,
                            onToggleLayer: at,
                            onPlayPreview: qe,
                            onRunValidation: Ge,
                            onDownloadValidationReport: Te,
                            onDownloadValidationBundle: lt,
                            onSendToMaterialspur: rt,
                            materialspurSendBusy: R,
                            materialspurEntryLabel: I ? I.name + " · " + I.bars + " bars" : null
                        }), a ]
                    }) ]
                }) : u.jsxs(u.Fragment, {
                    children: [ u.jsxs("label", {
                        className: "flex items-center gap-3 px-3 py-2 text-xs text-neutral-300",
                        children: [ "Sound Transfer", u.jsx("select", {
                            className: "rounded border border-neutral-700 bg-neutral-900 px-2 py-1",
                            value: J.donorUseMode,
                            disabled: J.busy !== "none",
                            onChange: Se => {
                                xt.stop(), pe.getState().setCarrierDonorV2DonorUseMode(Se.target.value), M(null), 
                                E(null);
                            },
                            children: Object.entries(XLe).map(([Se, be]) => u.jsx("option", {
                                value: Se,
                                children: be
                            }, Se))
                        }) ]
                    }), u.jsx(YGe, {
                        embodimentField: W,
                        embodimentStatus: V,
                        embodimentMessage: U,
                        embodimentLayersVisibility: H,
                        v2ValidationReport: A,
                        fieldMode: mt,
                        previewAvailable: It,
                        previewPhase: ee,
                        previewError: ie,
                        validationBusy: v,
                        onToggleLayer: at,
                        onPlayPreview: qe,
                        onRunValidation: Ge,
                        onDownloadValidationReport: Te,
                        onDownloadValidationBundle: lt,
                        onSendToMaterialspur: rt,
                        materialspurSendBusy: R,
                        materialspurEntryLabel: I ? I.name + " · " + I.bars + " bars" : null
                    }) ]
                }) ]
            }), u.jsx(QGe, {
                donorReady: ne,
                donorProofReady: !!Q.model?.bodyV3?.frames.length,
                donorSelected: Q.selected,
                donorPhase: ee,
                donorError: ie,
                donorProgress: de,
                donorPrepared: oe,
                onDonorPreview: () => le(),
                onOtherHearing: ce,
                donorProofActive: fe,
                donorSimilarity: Q.model?.bodyV3?.reconstructionSimilarity,
                donorEventCount: Q.model?.bodyV3?.detectedEventCount,
                donorRegisterPolicy: ge,
                donorRegisterAvailable: Ce,
                onDonorRegisterPolicy: Re,
                donorRenderMethod: se,
                donorHybridAvailable: xe,
                onDonorRenderMethod: Be,
                onDonorProof: Se => Ae(Se)
            }) ]
        })
    });
    return u.jsxs("section", {
        ref: d,
        tabIndex: 0,
        onFocus: () => b(!0),
        onBlur: Se => {
            d.current?.contains(Se.relatedTarget) || b(!1);
        },
        onMouseDown: () => b(!0),
        "data-wheel-allow-scroll": "true",
        "data-xensonar-scroll-island": "spectralforge-page",
        className: "space-y-4 outline-none",
        children: [ t === "forge3" ? null : u.jsx(JGe, {
            bars: B.bars,
            guideSegments: B.guideSegments,
            backLabel: Ve,
            showImageImport: t === "forge3",
            onBarsChange: Se => O({
                bars: Se
            }),
            onGuideSegmentsChange: Se => O({
                guideSegments: Se
            }),
            onBack: e,
            onOpenImageImport: () => Ie.current?.openImageImportDialog(),
            showStationNav: t === "forge3"
        }), u.jsxs("div", {
            "data-forge-sidebar-grid": t === "forge3" ? "true" : "legacy",
            "data-forge-sidebar-collapsed": t === "forge3" && __forgeSidebarCollapsed ? "true" : "false",
            style: t === "forge3" && __forgeSidebarCollapsed ? {
                gridTemplateColumns: "minmax(0,1fr) 44px"
            } : void 0,
            className: "grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_26rem]",
            children: [ u.jsxs("div", {
                className: "space-y-3",
                children: [ u.jsx("div", {
                    ref: p,
                    "data-xensonar-spectralforge-workmode-header": "true",
                    className: "h-0",
                    "aria-hidden": "true"
                }), u.jsx("div", {
                    className: "space-y-3",
                    children: At
                }), t === "forge3" ? null : a ]
            }), u.jsx(tVe, {
                variant: t,
                sidebarTop: n,
                collapsed: t === "forge3" && __forgeSidebarCollapsed,
                onToggle: () => {__waveAutoCollapseOwned.current=false;__forgeSidebarNow.current=!__forgeSidebarNow.current;__setForgeSidebarCollapsed(Se => !Se)},
                onOpenGestureProjectsInSpectralForge: Qe,
                onSendStampAsMelodicSample: dt,
                donorSelected: Q.selected,
                hearingPanel: t === "forge3" ? u.jsx(QGe, {
                    layout: "picker",
                    donorReady: ne,
                    donorProofReady: !!Q.model?.bodyV3?.frames.length,
                    donorSelected: Q.selected,
                    donorPhase: ee,
                    donorError: ie,
                    donorProgress: de,
                    donorPrepared: oe,
                    onDonorPreview: () => le(),
                    onOtherHearing: ce,
                    donorProofActive: fe,
                    donorSimilarity: Q.model?.bodyV3?.reconstructionSimilarity,
                    donorEventCount: Q.model?.bodyV3?.detectedEventCount,
                    donorRegisterPolicy: ge,
                    donorRegisterAvailable: Ce,
                    onDonorRegisterPolicy: Re,
                    donorRenderMethod: se,
                    donorHybridAvailable: xe,
                    onDonorRenderMethod: Be,
                    onDonorProof: Se => Ae(Se)
                }) : null
            }) ]
        }) ]
    });
}
function Zl(){const e=AB();return CR({...e,brush:{...e.brush,brushSize:7,intensity:.42,hardness:.46,grainSize:.56},hardBrush:{...e.hardBrush,brushSize:4,intensity:.52,hardness:1,grainSize:.55},stamp:{...e.stamp,brushSize:22,intensity:.62,hardness:.52,grainSize:.58},morph:{...e.morph,brushSize:80,intensity:.8,hardness:.46,grainSize:.6,morphMode:"push"},smudge:{...e.smudge,brushSize:14,intensity:.31,hardness:.54,grainSize:.6},sourceTrace:{...e.sourceTrace,brushSize:18,intensity:.4,hardness:.62,grainSize:.62},threshold:{...e.threshold,brushSize:14,intensity:.34,hardness:.74,grainSize:.56}})}
function DWe(){return{version:"spectral-forge-project-v1",activeTool:"brush",toolProfiles:Zl(),spectralSnapshot:pe.getState().spectralData.cloneData(),materialExport:{name:"forge3-workshop",role:"loop",bpm:108,bars:4,beatsPerBar:4,guideSegments:4,guideMarkers:[.25,.5,.75],beatGuideAudible:!1,beatGuideVolume:.35,loopPreview:!0},viewPort:{offsetX:0,offsetY:0,zoomX:1,zoomY:1},synthMode:"granular",waveformMix:{sine:1,sawtooth:0,square:0,triangle:0},colorMapName:"magma",showGrainLayer:!0,logScale:!0,stampTransform:{scaleX:1,scaleY:1,rotation:0,flipX:!1,flipY:!1},sourceMeta:null}}
function oz(){const e=pe.getState();return{snapshot:e.createProjectSnapshot(),sourceAsset:e.sourceAsset,sourceAssetContext:e.sourceAssetContext,sourcePreviewMode:e.sourcePreviewMode,stampData:e.stampData,stampPhase:e.stampPhase,stampSelStart:e.stampSelStart,lineStart:e.lineStart}}
function NWe(e){pe.getState().loadProjectSnapshot(e.snapshot),pe.setState(n=>({toolProfiles:Zl(),toolSettings:qr(e.snapshot.activeTool,Zl()[e.snapshot.activeTool]),sourceAsset:e.sourceAsset,sourceAssetContext:e.sourceAssetContext??"forge3_reference",sourcePreviewMode:e.sourcePreviewMode,stampData:e.stampData,stampPhase:e.stampPhase,stampSelStart:e.stampSelStart,lineStart:e.lineStart,renderVersion:n.renderVersion+1,audioBufferDirty:!0}))}
function a0(e,t){pe.setState(n=>{const r=CR({...Zl(),...t??{}});return{activeTool:e,toolProfiles:r,toolSettings:qr(e,r[e]),showGrainLayer:!0,synthMode:"granular",renderVersion:n.renderVersion+1,audioBufferDirty:!0}})}
function ey(e){if(e==="forge1"){a0("brush");return}if(e==="steinmetz"){a0("hardBrush",{hardBrush:{...Zl().hardBrush,eraseMode:!0,brushSize:5,intensity:.58}});return}if(e==="knetmasse"){a0("morph",{morph:{...Zl().morph,brushSize:30,intensity:.3,hardness:.5,morphMode:"push"},smudge:{...Zl().smudge,brushSize:12,intensity:.28,hardness:.56}});return}if(e==="transplant"){a0("stamp",{stamp:{...Zl().stamp,brushSize:26,intensity:.66,hardness:.56}});return}a0("sourceTrace")}
function iz(){__f333Stop();ys().clear();const e=DWe();e.spectralSnapshot.fill(0),pe.getState().loadProjectSnapshot(e),pe.setState(n=>({undoStack:[],redoStack:[],sourceAsset:null,sourcePreviewMode:"forge",stampData:null,stampPhase:"idle",stampSelStart:null,lineStart:null,toolProfiles:Zl(),toolSettings:qr("brush",Zl().brush),renderVersion:n.renderVersion+1,audioBufferDirty:!0}))}
function OWe({onBack:e,externalAudioUploadFile:t=null,externalAudioUploadOrigin:n=null,entryScrollIntent:r=null,onExternalAudioUploadConsumed:a,onEntryScrollIntentConsumed:o}){const i=P.useRef(null),[__carrierEntry,__setCarrierEntry]=P.useState(()=>__f334HasPendingCarrier()),__externalEntry=P.useRef({file:t,intent:r});
 P.useEffect(()=>{const previous=__externalEntry.current;__externalEntry.current={file:t,intent:r};if((t!==previous.file||r!==previous.intent)&&(t||r))__setCarrierEntry(false)},[t,r]);
 return P.useLayoutEffect(()=>{i.current=oz();aP?NWe(aP):__f333ReadCarrier(pe.getState().spectralData)||(iz(),a0("brush"));
 const receive=()=>{if(__f334ReceiveCarrier())__setCarrierEntry(true)};
 let live=true;
 const receiveField=async()=>{
   const original=await __XenMetaEditE4Project.consumeValidated({inspectSource:q=>__XenMetaEditResolver.inspectSource(q),readProject:id=>Y7(id)});
   if(!live)return;
   if(original){
    if(original.status!=='ready'){__f334Notice('Edit: '+original.reason);return;}
    try{pe.getState().loadProjectSnapshot(original.snapshot);
     __setCarrierEntry(true);
     __f334Notice('Saved Figure Project opened in native Spectral Forge · original library entry unchanged.');
     requestAnimationFrame(()=>document.querySelector('#spectralforge-station-draw')?.scrollIntoView({block:'start',behavior:'auto'}));
    }catch(error){__f334Notice('Edit: '+(error instanceof Error?error.message:'Project load failed.')+' Source archive unchanged.');}
    return;
   }
   const intent=await __XenMetaEditE4.consumeValidated({
  readBank:async()=>Yp(),readMaterial:async id=>{await __ensureMaterialLibraryHydrated();return bs().entries.find(x=>x.id===id)??await Uhe(QT,id,'Failed to read field source')}
 });if(!live||!intent)return;
  if(intent.status!=='ready'){__f334Notice('Edit: '+intent.reason);return;}
  try{const carrier=__f334CommitCarrier(intent.transfer,{neutral:true,message:'Derived carrier field · stored continuous geometry is editable; this is not the original brush snapshot.'});
   __setCarrierEntry(true);
   __f334Notice('Derived carrier field opened in Spectral Forge · '+carrier.notes.length+' voices · source unchanged.');
   requestAnimationFrame(()=>document.querySelector('#spectralforge-station-draw')?.scrollIntoView({block:'start',behavior:'auto'}));
  }catch(error){__f334Notice('Edit: '+(error instanceof Error?error.message:'Failed to materialize field.')+' Original source unchanged.');}
 };
 window.addEventListener(__f334TransferEvent,receive);window.addEventListener('xensonar:meta-edit-forge-field-ready',receiveField);receive();receiveField();
 return()=>{live=false;window.removeEventListener(__f334TransferEvent,receive);window.removeEventListener('xensonar:meta-edit-forge-field-ready',receiveField);aP=oz();const s=i.current;if(!s)return;pe.getState().loadProjectSnapshot(s.snapshot),pe.setState(c=>({sourceAsset:s.sourceAsset,sourceAssetContext:s.sourceAssetContext??"forge3_reference",sourcePreviewMode:s.sourcePreviewMode,stampData:s.stampData,stampPhase:s.stampPhase,stampSelStart:s.stampSelStart,lineStart:s.lineStart,renderVersion:c.renderVersion+1,audioBufferDirty:!0}))}},[]),u.jsx(BWe,{onBack:e,variant:"forge3",forge3Lens:"hear",externalAudioUploadFile:__carrierEntry?null:t,externalAudioUploadOrigin:__carrierEntry?null:n,entryScrollIntent:__carrierEntry?null:r,onExternalAudioUploadConsumed:a,onEntryScrollIntentConsumed:o,footerContent:u.jsxs("div",{className:"space-y-3 rounded border border-neutral-800 bg-neutral-950/70 p-3 text-xs text-neutral-300",children:[u.jsxs("div",{className:"flex flex-wrap items-center gap-2",children:[u.jsx("span",{className:"uppercase tracking-[0.22em] text-neutral-500",children:"Quick Profiles"}),u.jsx("button",{type:"button",onClick:()=>ey("forge1"),className:"rounded border border-neutral-700 px-3 py-1.5 hover:bg-neutral-900",children:"Direct Default"}),u.jsx("button",{type:"button",onClick:()=>ey("steinmetz"),className:"rounded border border-neutral-700 px-3 py-1.5 hover:bg-neutral-900",children:"Stonecutter"}),u.jsx("button",{type:"button",onClick:()=>ey("knetmasse"),className:"rounded border border-neutral-700 px-3 py-1.5 hover:bg-neutral-900",children:"Clay"}),u.jsx("button",{type:"button",onClick:()=>ey("transplant"),className:"rounded border border-neutral-700 px-3 py-1.5 hover:bg-neutral-900",children:"Transplantation"}),u.jsx("button",{type:"button",onClick:()=>ey("trace"),className:"rounded border border-neutral-700 px-3 py-1.5 hover:bg-neutral-900",children:"Trace Reading"}),u.jsx("button",{type:"button",onClick:iz,className:"rounded border border-red-900/70 px-3 py-1.5 text-red-200 hover:bg-red-950/30",children:"Neutral-Reset"})]}),u.jsxs("div",{className:"grid gap-3 md:grid-cols-2",children:[u.jsxs("div",{className:"rounded border border-neutral-800 bg-neutral-950/60 p-3 leading-relaxed text-neutral-400",children:["Audio is imported below, roughly selected, finely set below, and previewed. Only after",u.jsx("span",{className:"text-neutral-200",children:"Apply"})," does the loop land above as material in the spectral canvas. Images can be loaded directly into the workspace through the new Import Image button in SpectralForge."]}),u.jsx("div",{className:"rounded border border-neutral-800 bg-neutral-950/60 p-3 leading-relaxed text-neutral-400",children:"SpectralForge is the body workbench for material you have already selected: morph, stamp, cut and read traces. For anyone extending it, the rule is simple: make the controls readable first, then bring the theory along."})]})]})})}
function jWe({onBack:e,onRequestModeChange:t,syntheticForgeLogicView:n,onSyntheticForgeLogicViewChange:r}){const[a,o]=P.useState(0);return P.useEffect(()=>{if(typeof window>"u")return;const i=()=>o(s=>s+1);return window.addEventListener(yE,i),()=>window.removeEventListener(yE,i)},[]),u.jsx(zWe,{onReset:()=>t("experimental"),children:u.jsx(P.Suspense,{fallback:u.jsx("div",{className:"border border-violet-900/60 bg-violet-950/20 p-4 text-sm text-violet-100",children:"Loading SyntheticForge …"}),children:u.jsx(_We,{onBack:e,onRequestModeChange:t,externalLogicView:n,onExternalLogicViewChange:r,hideTopLogicSwitch:!0},a)})})}
function GWe({mode:e,syntheticForgeLogicView:t,modeHint:n,onModeChange:r,onSyntheticForgeLogicViewChange:a}){return u.jsxs("div",{className:"space-y-3 border border-neutral-800 bg-neutral-950/60 p-3 text-xs text-neutral-400",children:[u.jsx("div",{className:"uppercase tracking-[0.2em] text-neutral-500",children:"II Material Forge"}),u.jsxs("div",{className:"grid gap-3 md:grid-cols-2 xl:grid-cols-2",children:[u.jsxs("div",{className:"relative min-w-0","data-xen-workflow-tile":"spectral-forge",children:[u.jsxs("button",{type:"button","data-xen-workflow-select":true,onClick:()=>r("experimental"),className:`w-full h-full rounded-2xl border px-5 py-4 text-left transition ${e==="experimental"?"border-cyan-500 bg-cyan-950/40 text-cyan-100 shadow-[0_0_0_1px_rgba(6,182,212,0.15)]":"border-neutral-700 bg-neutral-950/70 text-neutral-200 hover:bg-neutral-900"}`,children:[u.jsx("div",{className:"text-lg font-semibold uppercase tracking-[0.22em] text-cyan-200 md:text-xl",children:"SpectralForge"}),u.jsx("div",{className:"mt-1 text-lg font-semibold",children:"Import Audio · Paint Figures"}),u.jsx("div",{className:"mt-1 text-[11px] leading-relaxed text-neutral-400",children:"Draw a melody or sound figure, listen immediately and follow its playback in the image."})]}),e==="experimental"?u.jsx("button",{type:"button","data-xen-workflow-more":true,className:"xen-wf-more",title:"Explore the creative workflow", "aria-label":"More about Spectral Forge workflow", "aria-haspopup":"dialog","aria-controls":"xen-creative-workflow",onClick:v=>{v.stopPropagation();window.__xenOpenForgeWorkflow?.(v.currentTarget)},children:"More ↗"}):null]}),u.jsxs("button",{type:"button",onClick:()=>r("canonical"),className:`rounded-2xl border px-5 py-4 text-left transition ${e==="canonical"?"border-violet-500 bg-violet-950/40 text-violet-100 shadow-[0_0_0_1px_rgba(139,92,246,0.15)]":"border-neutral-700 bg-neutral-950/70 text-neutral-200 hover:bg-neutral-900"}`,children:[u.jsx("div",{className:"text-lg font-semibold uppercase tracking-[0.22em] text-violet-200 md:text-xl",children:"Melodic Loop"}),u.jsx("div",{className:"mt-1 text-lg font-semibold",children:"Microtonal Loop Composer"}),u.jsx("div",{className:"mt-1 text-[11px] leading-relaxed text-neutral-400",children:"Compose Ideas, Tune Precisely"})]})]}),e==="external"?u.jsx("div",{className:"rounded border border-cyan-900/40 bg-cyan-950/15 p-3 text-[11px] leading-relaxed text-cyan-100",children:"Xenpolar uses the same technical slot, but the adapter-dock path is no longer part of the visible Material Forge navigation. Switch back to SpectralForge or SyntheticForge as needed."}):null,e?null:u.jsx("div",{className:"text-neutral-500",children:n})]})}
/* ML01: The Melodic Loop workbench always opens on its primary composer; a deliberate Drum Machine intent is handled by the existing host/event route. */
function HWe(){return"melodic"}
function VWe(){const e=iH();return e==="canonical"?"canonical":e==="experimental"?"experimental":null}
function WWe({onBack:e,packageStationKeepAlive:t=!1,externalAudioUploadFile:n=null,externalAudioUploadOrigin:r=null,entryScrollIntent:a=null,onExternalAudioUploadConsumed:o,onEntryScrollIntentConsumed:i,__xenFirstForgeIntent=null}){const[s,l]=P.useState(()=>VWe()),[c,d]=P.useState(()=>__xenFirstForgeIntent?.mode==="canonical"&&__xenFirstForgeIntent.view==="drums"?"drums":HWe());const __xenCanonicalEverOpened=P.useRef(s==="canonical");if(s==="canonical")__xenCanonicalEverOpened.current=true;P.useEffect(()=>{if(!__xenFirstForgeIntent)return;if(__xenFirstForgeIntent.mode==="canonical"){l("canonical");d(__xenFirstForgeIntent.view||"melodic")}else if(__xenFirstForgeIntent.mode==="experimental")l("experimental")},[__xenFirstForgeIntent]);P.useEffect(()=>{typeof window<"u"&&(s?CT(s):(window.localStorage.setItem(wT,"legacy"),window.sessionStorage.setItem(RT,"legacy")))},[s]),P.useEffect(()=>{!n&&!dy(a)||l(f=>f==="experimental"?f:"experimental")},[a,n]),P.useEffect(()=>{typeof window>"u"||(window.localStorage.setItem(y$,c),window.sessionStorage.setItem(S$,c))},[c]),P.useEffect(()=>{if(typeof window>"u")return;window.__XenForgeBridgeReady=true;const f=()=>{l("canonical"),d("melodic")},b=()=>{l("experimental")},g=Xd("openSyntheticForgeMelodicLoop",f);
 const openDrums=()=>{l("canonical");d("drums")};
 window.addEventListener(__mlOpenDrumMachineEvent,openDrums);
 window.addEventListener("xensonar:nodal-open-melodic",f);
 const __xenWheelOpen=e=>{if(['wheel-melodic-discovery','meta-melodic-project','meta-melodic-derived'].includes(e.detail?.source))f()};
 window.addEventListener('xensonar:open-canonical-melodic-loop',__xenWheelOpen);
 return window.addEventListener(uS,b),()=>{window.__XenForgeBridgeReady=false;g(),window.removeEventListener(uS,b);window.removeEventListener(__mlOpenDrumMachineEvent,openDrums);window.removeEventListener("xensonar:nodal-open-melodic",f);window.removeEventListener('xensonar:open-canonical-melodic-loop',__xenWheelOpen)}},[]);const p=P.useMemo(()=>s?"":"Choose the workbench here first.",[s]);return u.jsxs("div",{className:"space-y-3",children:[u.jsx(GWe,{mode:s,syntheticForgeLogicView:c,modeHint:p,onModeChange:mode=>{l(mode);if(mode==="canonical")d("melodic")},onSyntheticForgeLogicViewChange:d}),s==="canonical"||(t&&__xenCanonicalEverOpened.current)?u.jsx("div",{className:s==="canonical"?void 0:"sr-only pointer-events-none","aria-hidden":s==="canonical"?void 0:!0,"data-package-station-keepalive":s==="canonical"?void 0:"true",children:u.jsx(jWe,{onBack:e,onRequestModeChange:l,syntheticForgeLogicView:c,onSyntheticForgeLogicViewChange:d})}):null,s===null||s==="canonical"?null:s==="experimental"?u.jsx(OWe,{onBack:e,externalAudioUploadFile:n,externalAudioUploadOrigin:r,entryScrollIntent:a,onExternalAudioUploadConsumed:o,onEntryScrollIntentConsumed:i}):null]})}
function __f334Notice(message){
  __f334TransferNotice=message;
  if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent(__f334NoticeEvent,{detail:message}));
}
function __f334HasPendingCarrier(){const pending=DM.get('legacy');return pending?.carrier?.version==='melodic-carrier-v1'||pending?.audioPrepared?.version==='melodic-audio-v1';}
function __f334CommitCarrier(transfer,{neutral=false,message="Melodic Loop transferred as carrier figure."}={}){const state=pe.getState(),target=state.spectralData,grid=new ph(target.width,target.height);
    // Validate and prepare everything before touching the current drawing.
    const carrier=__f333MaterializeCarrier(transfer.carrier,grid);
    const materialExport=IDe(state.materialExport,{name:transfer.name,role:'loop',bars:transfer.bars,
      bpm:transfer.bpm,beatsPerBar:transfer.beatsPerBar,guideSegments:transfer.guideSegments,guideMarkers:transfer.guideMarkers});
    const canvas=typeof document==='undefined'?null:document.querySelector('[data-forge-carrier-canvas="true"]');
    const bounds=canvas?.getBoundingClientRect();
    // The element's premount bounding height is not the painted canvas height.
    // Let the mounted drawing surface own vertical fit; keep the request across resizes.
    const viewPort={offsetX:0,offsetY:0,zoomX:bounds?.width>0?bounds.width/target.width:1,
      zoomY:1,autoFitY:true};
    state.pushUndo();if(neutral){Vt.selectCarrier();__F35611DonorIntent=false;}++__f333RestoreBarrier;__f333Stop();ys().clear();
    target.restoreData(grid.cloneData());target.melodicCarrier=carrier;
    pe.setState(current=>({...__f333Idle(),melodicCarrier:carrier,lastCommitDomain:'carrier',
      sourceAsset:null,sourceAssetContext:'none',sourcePreviewMode:'forge',forge3EditTarget:'workbench',
      spectralEmbodimentSourceAsset:null,embodimentField:null,embodimentStatus:'missing',
      embodimentMessage:message,
      stampData:null,stampPhase:'idle',stampSelStart:null,lineStart:null,
      carrierDonorV2:{...current.carrierDonorV2,skeleton:null,summary:null,continuityGraph:null,
        bindingPreview:[],overlayVisible:false,continuityOverlayVisible:false,bindingOverlayVisible:false},
      carrierIntegralSelection:{...current.carrierIntegralSelection,source:"user"},
      materialExport,viewPort,showGrainLayer:false,renderVersion:current.renderVersion+1,audioBufferDirty:true}));return carrier;}
function __f334ReceiveCarrier(){
  const transfer=DM.get('legacy');
  if(!transfer)return false;
  try{
    if(transfer.audioPrepared)return __mlReceiveRenderedAudio(transfer);
    if(transfer.origin!=='melodic-loop'||!transfer.carrier)throw new Error("This transfer contains no Melodic carrier figure. Please send again from Melodic Loop.");
    const carrier=__f334CommitCarrier(transfer);
    // Acknowledge only the exact successfully committed item.
    if(DM.get('legacy')===transfer)DM.delete('legacy');
    __f333PersistNow();
    __f334Notice("Pitch figure transferred · "+carrier.notes.length+' Noten · '+transfer.bars+" bars · carrier without body lens");
    requestAnimationFrame(()=>document.querySelector('#spectralforge-station-draw')?.scrollIntoView({block:'start',behavior:'auto'}));
    return true;
  }catch(error){
    __f334Notice(error instanceof Error?error.message:"Melodic carrier transfer failed.");
    return false;
  }
}
function __f340SeekFromNavigator(position) {
  if(!Number.isFinite(position))return false;
  const at=Math.max(0,Math.min(1,position));
  const state=pe.getState();
  state.setPlayheadPosition(at);
  state.setShowPlayheadMarker(true);
  // Seek the active Forge transport, regardless of its listening mode.
  // The session owns the actual audio buffer; moving the marker alone is not a seek.
  if(state.isPlaying&&xt.isPlaying&&xt.__f340PreviewSession?.buffer){
    void xt.seekNormalized(at).catch(error=>console.warn('Spectral Forge Navigator Seek fehlgeschlagen',error));
  }
  return true;
}
async function __f341Spectrogram(samples,sampleRate,isCancelled=()=>false){
 const width=Math.max(64,Math.min(360,Math.ceil(samples.length/sampleRate*55))),height=150,size=2048,values=new Float32Array(width*height),input=new Float32Array(size);
 let maximum=0;
 for(let x=0;x<width;x++){
  if(isCancelled())return null;
  const center=Math.round((x+.5)/width*samples.length);
  for(let i=0;i<size;i++)input[i]=(samples[center+i-size/2]??0)*(.5-.5*Math.cos(2*Math.PI*i/(size-1)));
  const spectrum=ah(input);
  for(let y=0;y<height;y++){
   const high=35*(sampleRate*.46/35)**(1-y/height),low=35*(sampleRate*.46/35)**(1-(y+1)/height);
   const a=Math.max(1,Math.floor(low/sampleRate*size)),b=Math.min(spectrum.length-1,Math.max(a,Math.ceil(high/sampleRate*size)));
   let power=0;for(let k=a;k<=b;k++)power=Math.max(power,spectrum[k]);values[y*width+x]=power;maximum=Math.max(maximum,power);
  }
  if(x%24===23)await new Promise(resolve=>setTimeout(resolve,0));
 }
 return {width,height,values,maximum};
}
function __mlReceiveRenderedAudio(transfer) {
  const state = pe.getState(), prepared = transfer.audioPrepared, target = state.spectralData;
  if (transfer.origin !== 'melodic-loop' || prepared.version !== 'melodic-audio-v1' ||
      prepared.width !== target.width || prepared.height !== target.height ||
      !(prepared.data instanceof Float32Array) || prepared.data.length !== target.width * target.height * 2 || !prepared.asset)
    throw new Error('Invalid prepared Melodic audio transfer. Please send again.');
  const materialExport = IDe(state.materialExport, {name: transfer.name, role: 'loop', bars: transfer.bars,
    beatsPerBar: transfer.beatsPerBar, bpm: transfer.bpm, guideSegments: transfer.guideSegments, guideMarkers: transfer.guideMarkers});
  state.pushUndo(); __f333Stop(); ys().clear(); xt.invalidateBuffer();
  target.restoreData(prepared.data); delete target.melodicCarrier;
  state.setSourceAsset(prepared.asset, 'forge3_main');
  pe.setState(current => ({...__f333Idle(), melodicCarrier: null, lastCommitDomain: 'audio',
    materialExport, stampData: null, stampPhase: 'idle', stampSelStart: null, lineStart: null,
    renderVersion: current.renderVersion + 1, audioBufferDirty: true}));
  if (DM.get('legacy') === transfer) DM.delete('legacy');
  __f333PersistNow();
  __f334Notice('Rendered composition received · ' + transfer.name);
  return true;
}
function __f341Selection(source,model){
 const preferred=model.bodyV3?.sourceChannelIndex===1?source.rightSamples:source.leftSamples;const pcm=preferred?.length?preferred:source.monoSamples;
 const start=Math.max(0,Math.round(source.importStartSec*source.sampleRate)),end=Math.min(pcm.length,start+Math.round(source.importDurationSec*source.sampleRate));
 return {samples:pcm.subarray(start,end),sampleRate:source.sampleRate,duration:(end-start)/source.sampleRate,eventStart:(__F341Workbench.getConfig().params.materialPilot)?0:model.bodyV3?.eventStartSec??0,eventDuration:(__F341Workbench.getConfig().params.materialPilot)?(end-start)/source.sampleRate:model.hybrid.samples.length/model.hybrid.sampleRate};
}
function __f341CanvasSetup(canvas){
 const box=canvas.getBoundingClientRect(),ratio=Math.min(2,globalThis.devicePixelRatio||1);
 const w=Math.max(1,Math.round(box.width)),h=canvas.dataset.output?160:canvas.dataset.f350Sample?Math.max(280,Math.round(box.height)||380):520;
 canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);
 const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);
 return {ctx,w,h};
}
function __f341Heatmap(ctx,heat,x,y,w,h){if(!heat)return;let small=__F343HeatCanvas.get(heat);if(!small){small=document.createElement('canvas');small.width=heat.width;small.height=heat.height;const c=small.getContext('2d'),image=c.createImageData(heat.width,heat.height);for(let i=0;i<heat.values.length;i++){const db=20*Math.log10(Math.max(1e-12,heat.values[i])/Math.max(1e-12,heat.maximum)),t=Math.max(0,Math.min(1,(db+66)/66));image.data[i*4]=Math.round(10+245*t**2);image.data[i*4+1]=Math.round(18+185*Math.sin(t*Math.PI*.7));image.data[i*4+2]=Math.round(35+130*Math.sin(t*Math.PI));image.data[i*4+3]=255;}c.putImageData(image,0,0);__F343HeatCanvas.set(heat,small);}ctx.imageSmoothingEnabled=true;ctx.drawImage(small,x,y,w,h);}
function __f343WaveIndex(samples){
 let index=__F343WaveIndices.get(samples);if(index)return index;
 const step=128,count=Math.ceil(samples.length/step),min=new Float32Array(count),max=new Float32Array(count);
 let peak=0;
 for(let block=0;block<count;block++){
  let lo=0,hi=0;const first=block*step,last=Math.min(samples.length,first+step);
  for(let i=first;i<last;i++){const s=samples[i];if(s<lo)lo=s;if(s>hi)hi=s;peak=Math.max(peak,Math.abs(s));}
  min[block]=lo;max[block]=hi;
 }
 index={step,min,max,peak};__F343WaveIndices.set(samples,index);return index;
}
function __f343WaveRange(samples,index,a,b){
 const step=index.step,n=samples.length; a=Math.max(0,Math.min(n,a));b=Math.max(a,Math.min(n,b));
 let low=0,high=0;
 const firstBlock=Math.min(index.min.length,Math.ceil(a/step));
 const endBlock=Math.min(index.min.length,Math.floor(b/step));
 const firstEnd=Math.min(b,firstBlock*step);
 for(let i=a;i<firstEnd;i++){const s=samples[i];low=Math.min(low,s);high=Math.max(high,s);}
 for(let j=firstBlock;j<endBlock;j++){low=Math.min(low,index.min[j]);high=Math.max(high,index.max[j]);}
 for(let i=Math.max(firstEnd,endBlock*step);i<b;i++){const s=samples[i];low=Math.min(low,s);high=Math.max(high,s);}
 return [low,high];
}
function __f341Paint(canvas,selection,body,model,heat,config,layer,range,point,viewport=[0,1],runs=[],selectedRun=null){
 if(!canvas||!selection)return;const setup=__f341CanvasSetup(canvas),{ctx,w}=setup,sy=canvas.dataset?.f350Sample?setup.h/520:1,h=setup.h/sy;
 ctx.scale(1,sy);
 const left=w<500?64:84,right=14,iw=Math.max(1,w-left-right),lo=viewport[0],hi=viewport[1],duration=selection.duration;
 const xpos=f=>left+(f-lo)/(hi-lo)*iw;
 ctx.fillStyle='#080d18';ctx.fillRect(0,0,w,h);ctx.font='11px system-ui';ctx.fillStyle='#8394ae';ctx.fillText('Frequenz',9,25);ctx.fillText('Wellenform',9,287);
 __f341Heatmap(ctx,heat,xpos(0),28,iw/(hi-lo),218);
 ctx.fillStyle='#080d18';ctx.fillRect(0,0,left,h);ctx.fillRect(w-right,0,right,h);
 ctx.fillStyle='#8394ae';for(const hz of [10000,3000,1000,300,100])if(hz<selection.sampleRate*.46){const y=28+218*(1-Math.log(hz/35)/Math.log(selection.sampleRate*.46/35));ctx.fillText(hz>=1000?(hz/1000)+' kHz':hz+' Hz',9,y);}
 // Waveform is the entire selected donor mask, not just the automatically cropped event.
 const waveIndex=__f343WaveIndex(selection.samples),peak=waveIndex.peak;ctx.strokeStyle='#62cdd2';ctx.beginPath();
 for(let px=0;px<iw;px++){const a=Math.floor((lo+px/iw*(hi-lo))*selection.samples.length),b=Math.max(a+1,Math.floor((lo+(px+1)/iw*(hi-lo))*selection.samples.length));const [low,high]=__f343WaveRange(selection.samples,waveIndex,a,b);ctx.moveTo(left+px,291-low/Math.max(1e-9,peak)*30);ctx.lineTo(left+px,291-high/Math.max(1e-9,peak)*30);}ctx.stroke();
 const eventLo=selection.eventStart/duration,eventHi=(selection.eventStart+selection.eventDuration)/duration;
 ctx.fillStyle='#02040a99';if(xpos(eventLo)>left)ctx.fillRect(left,28,Math.min(iw,xpos(eventLo)-left),298);if(xpos(eventHi)<left+iw)ctx.fillRect(Math.max(left,xpos(eventHi)),28,left+iw-Math.max(left,xpos(eventHi)),298);
 const frames=body.frames??[],hop=Math.max(body.frameHopSec??.0125,selection.eventDuration/Math.max(1,frames.length-1));
 // Pitch trace uses measured values only.
 if(layer==='pitch'){ctx.strokeStyle='#bef264';ctx.lineWidth=1.5;ctx.beginPath();let continuing=false;for(const f of frames){const x=xpos((selection.eventStart+f.timeSec)/duration),hz=f.f0Hz;if(x<left||x>left+iw){continuing=false;continue;}if(!(hz>0)||f.pitchConfidence<.45){continuing=false;continue;}const y=28+218*(1-Math.log(hz/35)/Math.log(selection.sampleRate*.46/35));if(continuing)ctx.lineTo(x,y);else ctx.moveTo(x,y);continuing=true;}ctx.stroke();}
 if(layer==='resonance'){ctx.fillStyle='#fbbf24';for(const f of frames){const x=xpos((selection.eventStart+f.timeSec)/duration);if(x<left||x>left+iw)continue;for(const peak of (f.spectralPeaks??[]).slice(0,8)){const hz=peak.hz;if(!(hz>35))continue;const y=28+218*(1-Math.log(hz/35)/Math.log(selection.sampleRate*.46/35));ctx.globalAlpha=Math.max(.2,Math.min(1,peak.amplitude??.5));ctx.fillRect(x-1,y-1,3,3);}}ctx.globalAlpha=1;}
 const rowTop=338,rowHeight=22;
 for(let r=0;r<__F341Workbench.layers.length;r++){
  const l=__F341Workbench.layers[r],y=rowTop+r*rowHeight;ctx.fillStyle=l.id===layer?'#172639':'#101925';ctx.fillRect(left,y,iw,rowHeight-3);ctx.fillStyle=l.id===layer?l.color:'#8b9bb0';ctx.font='10px system-ui';ctx.fillText(({material:'Material',noise:"Noise",pitch:"Pitch",resonance:"Resonances",dynamics:"Level",attack:"Onset"})[l.id],5,y+13);
  if(l.id==='material'){for(const win of model.sourceIndex?.windows??[]){const a=xpos((selection.eventStart+win.startSample/model.sampleRate)/duration),b=xpos((selection.eventStart+win.endSample/model.sampleRate)/duration);ctx.fillStyle='#2dd4bf66';ctx.fillRect(Math.max(left,a),y,Math.max(0,Math.min(left+iw,b)-Math.max(left,a)),rowHeight-3);ctx.fillStyle='#b6ffed';if(b-a>20)ctx.fillText(String(win.id+1),Math.max(left,a)+4,y+13);}}
  else for(const f of frames){const a=xpos((selection.eventStart+f.timeSec-hop*.5)/duration),b=xpos((selection.eventStart+f.timeSec+hop*.5)/duration);if(a>left+iw||b<left)continue;const entry=body.onsetEvidence,observed=l.id==='attack'&&(model.atlas?f.role==='attack':entry&&['transient','level-rise'].includes(entry.kind)&&f.timeSec+hop*.5>=entry.startSec&&f.timeSec-hop*.5<=entry.endSec);let v=l.id==='noise'?f.aperiodicity:l.id==='pitch'?f.pitchConfidence:l.id==='dynamics'?f.relativeLevel:l.id==='attack'?(observed?(model.atlas?model.atlas.attacks.find(a=>f.center>=a.start&&f.center<=a.end)?.confidence??0:entry.confidence):0):Math.min(1,(f.spectralPeaks?.length??0)/16);ctx.fillStyle=l.id==='attack'?observed?(model.atlas||entry.kind==='transient'?l.color:'#e2b65b'):'#64748b':l.color;ctx.globalAlpha=.06+Math.max(0,Math.min(1,v??0))*.85;ctx.fillRect(Math.max(left,a),y,Math.max(1,Math.min(left+iw,b)-Math.max(left,a)),rowHeight-3);}ctx.globalAlpha=1;
 }
 for(const d of model.sourceIndex?.frameDecisions??[]){const f=frames[d.frame];if(!f)continue;const x=xpos((selection.eventStart+f.timeSec)/duration);if(x<left||x>left+iw)continue;ctx.fillStyle=d.reasons.includes('manual')||d.reasons.includes('source-state')?'#2dd4bf':d.reasons.includes('evolving')?'#38bdf8':d.reasons.includes('accepted')?'#34d399':d.reasons.includes('air')||d.reasons.includes('shape')?'#fb7185':'#64748b';ctx.fillRect(x,rowTop+rowHeight-6,3,3);}
 // Manual annotations are outlines; measured analysis is never recoloured into a false claim.
 const colors={include:'#2dd4bf',exclude:'#fb7185',texture:'#f472b6',tonal:'#a3e635'};
 for(const region of config.regions){const a=Math.max(left,xpos(region.start)),b=Math.min(left+iw,xpos(region.end));if(b<=a)continue;ctx.strokeStyle=colors[region.role];ctx.lineWidth=2;ctx.strokeRect(a,28,b-a,298);ctx.fillStyle=colors[region.role]+'33';ctx.fillRect(a,28,b-a,298);}
 if(range){const a=Math.max(left,xpos(range[0])),b=Math.min(left+iw,xpos(range[1]));ctx.fillStyle='#c4b5fd33';ctx.fillRect(a,28,b-a,445);ctx.strokeStyle='#c4b5fd';ctx.lineWidth=1;ctx.strokeRect(a,28,b-a,445);}
 if(point!=null){ctx.strokeStyle='#e2e8f0aa';ctx.beginPath();ctx.moveTo(xpos(point),28);ctx.lineTo(xpos(point),473);ctx.stroke();}
 ctx.fillStyle='#a6b3c6';ctx.font='10px system-ui';for(let i=0;i<=6;i++){const f=lo+(hi-lo)*i/6,x=xpos(f);ctx.fillText((f*duration).toFixed(2)+' s',x-9,493);}
 ctx.fillStyle='#637891';ctx.fillText("Click = inspect · Drag = mark region · analysis and editing are separate",left,515);
 // Read-position markers and manual weights show the recipe without falsifying measured evidence.
 const params=config.params;
 // Markers use FFT-safe geometry from the same per-voice planner/renderer.
 const visibleRuns=selectedRun==null?runs:runs.filter((_,i)=>i===selectedRun);
 for(const run of visibleRuns){const g=run.workbenchRead;if(!g)continue;const a=xpos((selection.eventStart+g.safeLo/model.sampleRate)/duration),b=xpos((selection.eventStart+g.safeHi/model.sampleRate)/duration);ctx.strokeStyle='#fbbf24';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(Math.max(left,a),330);ctx.lineTo(Math.min(left+iw,b),330);ctx.stroke();const f=(selection.eventStart+g.firstSourceCenter/model.sampleRate)/duration,x=xpos(f);if(x<left||x>left+iw)continue;ctx.fillStyle='#e2fef6';ctx.beginPath();ctx.moveTo(x,332);ctx.lineTo(x-4,325);ctx.lineTo(x+4,325);ctx.fill();}
 {ctx.font='10px system-ui';ctx.fillStyle='#f472b6';ctx.fillText('Gewichtung ×'+params.noise.toFixed(2),Math.max(left,w-165),rowTop+rowHeight+13);}
 ctx.fillStyle='#c4b5fd';ctx.fillText(params.motion===0?'Materialposition gehalten':params.direction==='pendulum'?'Pendeln ×'+params.motion.toFixed(2):params.direction==='reverse'?"Backward ×"+params.motion.toFixed(2):"Forward ×"+params.motion.toFixed(2),Math.max(left,w-165),rowTop+13);
 canvas.__f341Geometry={left,width:iw,lo,hi,rowTop:rowTop*sy,rowHeight:rowHeight*sy};
}
function __F341Control({label,name,min,max,step=0.01,unit='',help}){
 const state=P.useSyncExternalStore(__F341Workbench.subscribe,__F341Workbench.getSnapshot,__F341Workbench.getSnapshot),value=state.config.params[name],base=__F341Workbench.defaults[name];
 const automatic=value==null,effective=automatic?(name==='mapping'?.5:1):value;
 return u.jsxs('label',{className:'f341-control',children:[u.jsxs('span',{className:'f341-control-title',children:[u.jsx('span',{children:label}),u.jsx('button',{type:'button',className:((automatic||value===base)?'f341-auto selected':'f341-auto'),onClick:e=>{e.preventDefault();__F341Workbench.patch({[name]:base})},children:base==null?'Auto':'Basis'})]}),name==='detail'?u.jsx('select',{'aria-label':label,value:effective,onChange:e=>__F341Workbench.patch({[name]:Number(e.currentTarget.value)}),children:[u.jsx('option',{value:1,children:"Auto window · full length"}),u.jsx('option',{value:.5,children:"Half Length"}),u.jsx('option',{value:.25,children:"Quarter Length"})]}):u.jsx('input',{type:'range','aria-label':label,min,max,step,value:effective,onChange:e=>__F341Workbench.patch({[name]:Number(e.currentTarget.value)})}),u.jsxs('span',{className:'f341-control-value',children:[automatic?'Automatisch':Number(value).toFixed(step<.1?2:1)+unit,u.jsx('span',{children:help})]})]});
}
function __f342Plan(grid,model,config,durationSec,sampleRate){
 const plan=__ForgeF33.buildCarrierSupportPlan(grid,durationSec);

 if(config.params.gestaltPilot)return {...(config.params.variantRevision === "original" ? __F356GestaltOriginal : __F356Gestalt).plan(plan,model,sampleRate,durationSec,config),error:''};
 if(config.params.materialPilot)return {...(config.params.variantRevision === "original" ? __F356MaterialOriginal : __F356Material).plan(plan,model,sampleRate,durationSec,config),error:''};
 const {material}=__ForgeF33.planDonorMaterial(plan,model,sampleRate,durationSec);
 for(const voice of new Set(material.runs.map(r=>r.voice))){const runs=material.runs.filter(r=>r.voice===voice),size=__F347FilmSize(model,runs,sampleRate,config.params);for(const run of runs){const g=__ForgeF33.spectralFilmGeometry(model,run,sampleRate,size);run.workbenchRead={...g,firstSourceCenter:__F341Workbench.readPosition(g.safeLo,g.safeHi,0,config.params)};}}
 return {...material,error:''};
}
function __f342DecisionText(decision){const names={'source-state':"Audible source state in the sound atlas",manual:"Allowed by direct window selection or marking",outside:"Outside the selected material windows",evolving:"Allowed in varying motion",accepted:"Similarity accepted",attack:'Before the measured attack end',tail:"Beyond the analysis boundary",quiet:"Level below 8%",pitch:"Pitch confidence too low",air:"Aperiodicity outside donor tolerance",shape:"Spectral shape outside donor tolerance"};return decision?.reasons?.map(r=>names[r]??r).join(' · ')??"No decision data for this frame.";}
function __f344PreviewProgress(runtime,pending,planned,model,body){
 if(!pending&&runtime.phase!=='rendering')return null;
 const runs=planned?.runs??[],voices=new Set(runs.map(run=>run.voice)).size;
 const windows=model?.sourceIndex?.windows?.length??0,frames=body?.frames?.length??0;
 const facts=runs.length+" carrier runs · "+voices+" voices · "+windows+" source windows";
 const p=runtime.phase==='rendering'&&Number.isFinite(runtime.renderProgress)?Math.max(0,Math.min(1,runtime.renderProgress)):null;
 let label;
 if(p===null||p<.02)label="Preparing: mapping donor to current carrier figure · "+facts;
 else if(p<.06)label="Preparing donor model · "+frames+" analysis frames available";
 else if(p<.08)label="Preparing material plan for transfer · "+facts;
 else if(p<1)label="Computing sound transfer · approx. "+Math.floor(p*20)*5+' % · '+facts;
 else label="Audio buffer computed · sending to playback · "+facts;
 return {text:label,progress:p};
}
function __F351CombinationRack(){
 const session=P.useSyncExternalStore(__F352Session.subscribe,__F352Session.getSnapshot,__F352Session.getSnapshot),render=P.useSyncExternalStore(__F352Runtime.subscribe,__F352Runtime.getSnapshot,__F352Runtime.getSnapshot),wb=P.useSyncExternalStore(__F341Workbench.subscribe,__F341Workbench.getSnapshot,__F341Workbench.getSnapshot);
 const runtime=cU(),recipe=session.recipe,[error,setError]=P.useState('');
 const current=render.result?.key===__F352Runtime.identity(),supported=wb.config.params.materialPilot;
 const slider=(name,label,help,enabled=true)=>u.jsxs('label',{className:'f351-control',children:[u.jsxs('span',{className:'f351-control-head',children:[u.jsx('span',{children:label}),u.jsx('output',{htmlFor:'f351-'+name,children:Math.round(recipe[name]*100)+' %'})]}),u.jsx('input',{id:'f351-'+name,type:'range',min:0,max:100,step:1,value:Math.round(recipe[name]*100),disabled:!enabled,'aria-label':'Kombinieren: '+label,'aria-describedby':'f351-explain-'+name,onChange:e=>__F352Session.patch({[name]:Number(e.currentTarget.value)/100})}),u.jsx('small',{id:'f351-explain-'+name,children:help})]},name);
 const audition=async()=>{setError('');try{if(!Vt.selectDonor())throw Error("Please load a donor first.");await __F352Runtime.play();}catch(e){if(e.name!=='AbortError')setError(e.message);}};
 const exportAudio=async(format)=>{setError('');try{if(!Vt.selectDonor())throw Error("Please load a donor first.");const state=pe.getState(),blob=format==='flac'?await __f345ExportFlacCurrent(state):await __f333ExportCurrent(state);Yk(blob,Xk(state.materialExport.name)+'_Donor_Cecilia.'+format,'spectralForge/HybridRack');}catch(e){if(e.name!=='AbortError')setError(e.message);}};
 const mode=__F352Session.modes.find(m=>m.id===recipe.mode);
 const phase=render.phase==='rendering'?'Calculated · '+render.stage:current?"Result up to date":render.result?"Recipe changed · recalculate result":"Ready to Render";
 return u.jsxs('div',{className:'f351-combination','data-f351-combination-rack':'true',children:[
  u.jsxs('div',{className:'f351-combo-heading',children:[u.jsx('div',{className:'f351-overline',children:"SOUND BODY"}),u.jsx('h3',{children:"Combine with"}),u.jsx('p',{children:"Donor and Cecilia. One shared musical figure."})]}),
  u.jsxs('label',{className:'f352-enable',children:[u.jsx('input',{type:'checkbox',checked:recipe.enabled,'aria-label':'Klangkombination aktivieren',onChange:e=>__F352Session.patch({enabled:e.currentTarget.checked})}),' Kombination aktiv']}),
  u.jsxs('label',{className:'f351-selector',children:[u.jsx('span',{children:'Klangerzeugung'}),u.jsx('select',{'aria-label':"Combine with Sound Generator",value:'cecilia',children:__F352Session.providers.map(p=>u.jsx('option',{value:p.id,disabled:!p.readyForPilot,children:p.label+(p.readyForPilot?'':" · later")},p.id))})]}),
  u.jsxs('label',{className:'f351-selector',children:[u.jsx('span',{children:'Cecilia · Verbindungsverfahren'}),u.jsx('select',{'aria-label':'Cecilia-Verbindungsverfahren',value:recipe.mode+'|'+(recipe.variantRevision==='original'?'original':'revised'),onChange:e=>{const parts=e.currentTarget.value.split('|');__F352Session.patch({mode:parts[0],variantRevision:parts[1]})},children:__F352Session.modes.flatMap(m=>['original','revised'].map(revision=>u.jsx('option',{value:m.id+'|'+revision,children:m.label+' · '+(revision==='original'?'1':'2')},m.id+'|'+revision)))})]}),
  u.jsxs('p',{className:'f351-method-hint',children:[mode.description,' · ',recipe.variantRevision==='original'?'Variant 1: previous rendering.':'Variant 2: recalculated coloration/coupling (Ü).']}),
  u.jsxs('div',{className:'f351-meter',role:'img','aria-label':"Sound identity: Donor "+Math.round((1-recipe.amount)*100)+' Prozent, Cecilia '+Math.round(recipe.amount*100)+" percent",children:[u.jsx('span',{style:{width:((1-recipe.amount)*100)+'%'}}),u.jsx('span',{style:{width:(recipe.amount*100)+'%'}})]}),
  slider('amount',"Sound Identity","0%: Donor Sustain. 100%: Cecilia. Between them: loudness-aware crossfade."),
  slider('coupling','Zustandskopplung',recipe.mode==='state'?"Noisiness and brightness of selected donor states shape Cecilia; time and pitch remain carrier-controlled.":"Active in States mode.",recipe.mode==='state'),
  slider('color',"Spectral Complement",recipe.mode==='spectral'?"0: blend freely. 100: gently reduce Cecilia in occupied frequency regions. Donor material remains intact.":"Active in Spectral mode.",recipe.mode==='spectral'),
  u.jsx(__F352CeciliaControls,{}),
  !supported?u.jsx('p',{className:'f341-error',role:'status',children:"For blending, choose the “Sound Material · Motion” listening mode. Historical spectral modes remain available separately."}):null,
  u.jsxs('div',{className:'f351-status',role:'status',children:[u.jsx('strong',{children:phase}),render.phase==='rendering'?u.jsx('progress',{max:1,value:render.progress,'aria-label':'Klangkombination Fortschritt'}):null,u.jsx('p',{children:recipe.enabled?"Playback, result image and export use the same rendered sound.":"Activate links the recipe to playback and export."})]}),
  u.jsxs('div',{className:'f352-rack-actions',children:[u.jsx('button',{type:'button',className:'f341-primary',disabled:!recipe.enabled||!supported||!runtime.model,onClick:()=>runtime.phase==='playing'||render.phase==='rendering'?__F352Runtime.stop():void audition(),children:runtime.phase==='playing'||render.phase==='rendering'?"Stop / Cancel":"Listen to Combination"}),...['wav','flac'].map(format=>u.jsx('button',{type:'button',disabled:!recipe.enabled||!supported||!runtime.model||render.phase==='rendering',onClick:()=>void exportAudio(format),children:format.toUpperCase()},format))]}),
  error||render.error?u.jsx('p',{role:'alert',className:'f341-error',children:error||render.error}):null,
  u.jsx('button',{type:'button',className:'f351-reset',onClick:()=>__F352Session.reset(),children:"Reset Combination Recipe"})
 ]});
}
function __F352CeciliaControls(){
 const state=P.useSyncExternalStore(pe.subscribe,pe.getState,pe.getState),p=xR('vocal',state.carrierIntegralSynthLab?.readerSettings);
 const change=(name,value)=>{const s=pe.getState(),lab=s.carrierIntegralSynthLab;s.setCarrierIntegralSynthLab({...lab,readerSettings:{...lab.readerSettings,vocal:{...lab.readerSettings?.vocal,[name]:value}},updatedAt:Date.now()});};
 return u.jsxs('details',{className:'f352-cecilia',children:[u.jsx('summary',{children:'Cecilias Klangfarbe'}),...[
  ['vowel',"Vowel Shape",0,4,.05],['formantShift','Formantlage',-10,10,.5],['breath','Hauch',0,.45,.01],['presence',"Presence",0,1,.01]
 ].map(([name,label,min,max,step])=>u.jsxs('label',{className:'f351-control',children:[u.jsxs('span',{className:'f351-control-head',children:[label,u.jsx('output',{children:p[name].toFixed(name==='formantShift'?1:2)})]}),u.jsx('input',{type:'range',min,max,step,value:p[name],'aria-label':'Cecilia '+label,onChange:e=>change(name,Number(e.currentTarget.value))})]},name)),u.jsx('small',{children:"The carrier figure controls pitch motion, onsets and rests. Vowel shape, formant position, breath and presence shape Cecilia."})]});
}
function __F352ResultPanel(){
 const rendering=P.useSyncExternalStore(__F352Runtime.subscribe,__F352Runtime.getSnapshot,__F352Runtime.getSnapshot),session=P.useSyncExternalStore(__F352Session.subscribe,__F352Session.getSnapshot,__F352Session.getSnapshot);
 P.useSyncExternalStore(pe.subscribe,pe.getState,pe.getState);const canvas=P.useRef(null),artifact=rendering.result,current=!!artifact&&artifact.key===__F352Runtime.identity();
 P.useEffect(()=>{if(!canvas.current||!artifact?.spectrum)return;const node=canvas.current;let pending=0;const paint=()=>{if(pending)return;pending=requestAnimationFrame(()=>{pending=0;const {ctx,w,h}=__f341CanvasSetup(node);ctx.fillStyle='#080d18';ctx.fillRect(0,0,w,h);__f341Heatmap(ctx,artifact.spectrum,0,0,w,h);});};paint();const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(paint);observer?.observe(node);return()=>{observer?.disconnect();if(pending)cancelAnimationFrame(pending);};},[artifact]);
 return u.jsxs('section',{className:'f352-result-panel','data-f352-result-panel':'true',children:[
  u.jsxs('div',{className:'f352-result-header',children:[u.jsx('strong',{children:(!session.recipe.enabled||session.recipe.amount===0)?(__F341Workbench.getConfig().params.gestaltPilot?"Klanggestalt · Rendered Result":__F341Workbench.getConfig().params.materialPilot?"Sound Material · Combined Result":"Donor Sustain · Combined Result"):'Donor + Cecilia · combined result'}),u.jsx('span',{role:'status',children:rendering.phase==='rendering'?rendering.stage:current?"Current":artifact?"Recipe changed · previous result":"Not calculated yet"})]}),
  rendering.phase==='rendering'?u.jsx('progress',{max:1,value:rendering.progress,'aria-label':'Forge Klangberechnung Fortschritt'}):null,
  artifact?.spectrum?u.jsx('canvas',{ref:canvas,'aria-label':"Spectrum of the Audible Forge Result"}):u.jsx('p',{children:"The carrier figure controls the donor. An enabled blend adds Cecilia."}),
  artifact?u.jsx('p',{className:'f352-result-note',children:"Output: "+(artifact.manifest.audioOrigin==='SOURCE_ONLY'?"original donor audio only":"original donor audio + Cecilia")+' · '+artifact.durationSec.toFixed(2)+' s · '+artifact.sampleRate+' Hz · '+artifact.material.runs.length+" sound events"}):null,
  rendering.error?u.jsx('p',{role:'alert',className:'f341-error',children:rendering.error}):null
 ]});
}
function __f35624WorkbenchActivity({operation,activity,disposed,setBusy,setPreviewPending,setError}){
 const isCurrent=token=>token!=null&&!disposed.current&&operation.current===token&&activity.current?.token===token;
 const begin=kind=>{if(disposed.current)return null;if(activity.current)Vt.stop();const token=++operation.current;activity.current={token,kind};setBusy(true);setPreviewPending(kind==='preview');setError('');return token;};
 const finish=token=>{if(!isCurrent(token))return;activity.current=null;setBusy(false);setPreviewPending(false);};
 const cancel=(stopAudio=true)=>{if(disposed.current)return;operation.current++;activity.current=null;setBusy(false);setPreviewPending(false);if(stopAudio)Vt.stop();};
 const dispose=()=>{if(disposed.current)return;const owned=!!activity.current;disposed.current=true;operation.current++;activity.current=null;if(owned)Vt.stop();};
 const error=(token,e)=>{if(isCurrent(token)&&e?.name!=='AbortError')setError(e?.message??String(e));};
 return {begin,isCurrent,finish,cancel,dispose,error};
}
function __F353RecipePanel(){
 const wb=P.useSyncExternalStore(__F341Workbench.subscribe,__F341Workbench.getSnapshot,__F341Workbench.getSnapshot),[name,setName]=P.useState(''),[message,setMessage]=P.useState('');
 const save=variant=>{try{const item=__F341Workbench.savePreset(name,variant);__F341Workbench.set({...__F341Workbench.getConfig(),preset:item.id});setName('');setMessage('„'+item.name+"” saved and available under Custom Recipes.");}catch(e){setMessage(e.message);}};
 return u.jsxs('div',{className:'f353-recipe-save',children:[u.jsx('input',{'aria-label':'Recipe name',placeholder:"Name your custom recipe",value:name,onChange:e=>setName(e.currentTarget.value),maxLength:80}),u.jsx('button',{type:'button',disabled:!name.trim(),onClick:()=>save(false),children:"Save Custom Recipe"}),u.jsx('button',{type:'button',disabled:!name.trim()||!wb.config.sourceKey,onClick:()=>save(true),children:"Save with Donor Markings"}),message?u.jsx('span',{role:'status',children:message}):null]});
}
function __F3564CarrierMiniature({material=null}){
 const ref=P.useRef(null),grid=pe(state=>state.spectralData),rev=pe(state=>state.renderVersion);
 const donor=Vt.getSnapshot(),artifact=__F352Runtime.current(),active=!!donor.source&&!!donor.model;
 P.useEffect(()=>{
  const canvas=ref.current,ctx=canvas?.getContext('2d');if(!canvas||!ctx||!grid?.data)return;
  const w=canvas.width,h=canvas.height,top=h-24;
  ctx.fillStyle='#07111b';ctx.fillRect(0,0,w,h);
  const image=ctx.createImageData(w,top),iw=grid.width,ih=grid.height,src=grid.data;
  for(let y=0;y<top;y++)for(let x=0;x<w;x++){
   const sx=Math.min(iw-1,Math.floor(x/w*iw)),sy=Math.min(ih-1,Math.floor(y/top*ih));
   const v=Math.max(0,Math.min(1,src[sy*iw+sx]||0)),i=(y*w+x)*4;
   image.data[i]=Math.round(7+v*(active?38:213));
   image.data[i+1]=Math.round(15+v*(active?186:102));
   image.data[i+2]=Math.round(26+v*(active?171:48));
   image.data[i+3]=255;
  }
  ctx.putImageData(image,0,0);
  ctx.fillStyle='#0b1c29';ctx.fillRect(0,top,w,h-top);
  ctx.strokeStyle=active?'#2dd4bf':'#b9a579';ctx.lineWidth=1.3;
  const pcm=artifact?.pcm;
  if(pcm?.length){
   ctx.beginPath();const mid=top+12;
   for(let x=0;x<w;x++){
    const a=Math.floor(x/w*pcm.length),b=Math.max(a+1,Math.floor((x+1)/w*pcm.length));let peak=0;
    for(let i=a;i<Math.min(b,pcm.length);i+=Math.max(1,Math.floor((b-a)/15)))peak=Math.max(peak,Math.abs(pcm[i]));
    const span=Math.min(10,peak*10);ctx.moveTo(x+.5,mid-span);ctx.lineTo(x+.5,mid+span);
   }ctx.stroke();
  }else{ctx.beginPath();ctx.moveTo(0,top+12);ctx.lineTo(w,top+12);ctx.stroke();}
 },[grid,rev,active,artifact?.key,material]);
 return u.jsxs('div',{className:'f3564-carrier-mini','data-f3564-mini':'true',children:[
  u.jsx('strong',{children:'Carrier-Miniatur'}),
  u.jsx('canvas',{ref,width:320,height:120,'aria-label':"Miniature carrier figure with current donor PCM motion"}),
  u.jsx('small',{children:active?(artifact?"Orange: carrier · below: actual donor audio motion":"Orange: carrier with loaded donor · sound motion after rendering"):"Carrier Figure · Donor Not Loaded Yet"})
 ]});
}
function __F356GestaltPanel({ range, selection, material }) {
  const wb = P.useSyncExternalStore(
      __F341Workbench.subscribe,
      __F341Workbench.getSnapshot,
      __F341Workbench.getSnapshot,
    ),
    p = wb.config.params;
  const info = material?.gestaltTransform;
  const names = { imprint: "Resonant Imprint", motion: "Timbre Motion", weave: "Material States", articulation: "Articulation", signature:"Donor-Signatur",film:"Spektraler Film",air:"Hauch & Reibung",freeze:"Stillbild",wander:"Wandernd" };
  return u.jsxs("section", {
    className: "f347-control-group",
    "data-f356-gestalt": "true",
    children: [
      u.jsx("h3", { children: "Klanggestalt · " + names[p.gestaltMode] + (p.variantRevision === "original" ? " · 1" : " · 2") }),
      u.jsx("p", {
        children:
          "Your drawing leads pitch, voices, rhythm and dynamics. The donor lends its resonance colour and its own internal motion. Thin lines focus the pitch; wider strokes can preserve the source’s irregular spectral spacing. Glissandi and changes of width or intensity shape the journey through the recording.",
      }),
      u.jsxs("div", {
        className: "f3564-carrier-layout",
        children: [
          u.jsxs("div", {
            className: "f3564-carrier-controls",
            children: [
              u.jsxs("div", {
                className: "f341-controls f3564-three-cards",
                children: [
                  u.jsx(__F341Control, {
                    label: "Resonance Identity",
                    name: "gestaltIdentity",
                    min: 0,
                    max: 1,
                    step: 0.01,
                    help: "0: resonance colour moves with pitch. 1: preserve more of the donor’s original resonance frequencies and spectral troughs. Most effective with a stable tonal source.",
                  }),
                  u.jsx(__F341Control, {
                    label: "Internal Motion",
                    name: "gestaltMotion",
                    min: 0,
                    max: 1,
                    step: 0.01,
                    help: "0: hold a source state at the chosen position. 1: travel farther through the allowed recording. Short dots use short excerpts and an observed source attack where available.",
                  }),
                  u.jsx(__F341Control, {
                    label: "Gesture Response",
                    name: "gestaltGesture",
                    min: 0,
                    max: 1,
                    step: 0.01,
                    help: "0: even source-time motion. 1: pitch movement, stroke width and changes of intensity reshape source time. Broad strokes also retain more original irregular partial spacing.",
                  }),
                ],
              }),
              u.jsxs("div", {
                className: "f341-controls",
                children: [
                  u.jsx(__F341Control, {
                    label: "Source Position",
                    name: "position",
                    min: 0,
                    max: 1,
                    step: 0.01,
                    help: "Choose where a held or partial source journey begins. Material States also uses this position as a gentle preference.",
                  }),
                  u.jsx(__F341Control, {
                    label: "Tune Carrier Together",
                    name: "carrierTranspose",
                    min: -48,
                    max: 48,
                    step: 0.1,
                    unit: " st",
                    help: "Shift all painted voices together, keeping their intervals.",
                  }),
                  u.jsxs("label", {
                    className: "f341-control",
                    children: [
                      u.jsx("span", { children: "Reference for Unpitched Material" }),
                      u.jsx("input", {
                        type: "number",
                        min: 20,
                        max: 20000,
                        step: 1,
                        value: p.carrierNeutralHz,
                        "aria-label": "Klanggestalt Unpitched Reference",
                        onChange: (e) => {
                          if (e.currentTarget.value)
                            __F341Workbench.patch({
                              carrierNeutralHz: Number(e.currentTarget.value),
                            });
                        },
                      }),
                      u.jsx("small", {
                        children:
                          "Hz. Confident tonal material follows its observed fundamental; textures and uncertain passages use the source region’s tonal reference, or this value when no reliable pitch is available.",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          u.jsx(__F3564CarrierMiniature, { material }),
        ],
      }),
      p.gestaltMode === "articulation" ? u.jsx(__F341Control,{label:"Articulation Transfer",name:"articulationAmount",min:0,max:1,step:.01,help:"Use the observed donor beginning, sustained body and ending within each painted phrase. Connected glissandi stay connected; pauses remain silent."}) : null,
      u.jsxs("label", {
        children: [
          "Source Journey ",
          u.jsx("select", {
            "aria-label": "Klanggestalt Source Journey",
            value: p.planning === "reference" ? "reference" : "neutral",
            onChange: (e) => __F341Workbench.patch({ planning: e.currentTarget.value }),
            children: [
              u.jsx("option", { value: "neutral", children: "Use Allowed Source Regions" }),
              u.jsx("option", { value: "reference", children: "Use a Marked Reference Journey" }),
            ],
          }),
        ],
      }),
      p.planning === "reference"
        ? u.jsxs("div", {
            children: [
              u.jsx("span", {
                children: selection
                  ? " Reference " +
                    (p.referenceStart * selection.duration).toFixed(2) +
                    "–" +
                    (p.referenceEnd * selection.duration).toFixed(2) +
                    " s "
                  : "",
              }),
              u.jsx("button", {
                type: "button",
                disabled: !range,
                onClick: () =>
                  __F341Workbench.patch({ referenceStart: range[0], referenceEnd: range[1] }),
                children: "Use Marking as Reference",
              }),
            ],
          })
        : null,
      u.jsx("p", {
        className: "f341-muted",
        children:
          p.gestaltMode === "weave"
            ? "Observed donor states combine level, spectral envelope, brightness and aperiodicity. Phrase selection also considers observed transitions. Include/Exclude markings remain boundaries."
            : p.gestaltMode === "motion"
              ? "Signed pitch movement and changes in the stroke shape move source time forward or backward with reflected boundaries. Pitch and pauses continue to follow the drawing."
              : "The original recording supplies every audible component. Resonance identity changes its spectral colouring without adding a second voice or a noise layer.",
      }),
      material?.stateField ? u.jsx("p",{role:"status",children:"Observed Donor States: "+material.stateField.states.length+" · "+material.stateField.analyzedFrames+" contained analysis frames · transitions refer to source order."}) : null,
      info
        ? u.jsx("p", {
            role: "status",
            children:
              "Rendered: " +
              names[info.mode] +
              " · " +
              Math.round(info.identity * 100) +
              "% resonance identity · " +
              Math.round(info.motion * 100) +
              "% internal motion. Playback and export use this same result.",
          })
        : null,
    ],
  });
}
function __F356MaterialPanel({range,selection,material}){
 const wb=P.useSyncExternalStore(__F341Workbench.subscribe,__F341Workbench.getSnapshot,__F341Workbench.getSnapshot),p=wb.config.params;
 const info=material?.materialTransform;
 return u.jsxs('section',{className:'f347-control-group','data-f356-material':'true',children:[
  u.jsx('h3',{children:"Sound Material · Carrier Moves the Recording" + (p.variantRevision === "original" ? " · 1" : " · 2") + ""}),
  u.jsx('p',{children:"An experiment with the full recording: each carrier voice draws its own sound motion through the figure. Choose how source time advances and experiment with a shared pitch reference."}),
  u.jsxs('div',{className:'f3564-carrier-layout',children:[u.jsxs('div',{className:'f3564-carrier-controls',children:[u.jsxs('div',{className:'f341-controls f3564-three-cards',children:[
   u.jsx(__F341Control,{label:"Tune Carrier Together",name:'carrierTranspose',min:-48,max:48,step:.1,unit:" st",help:"Continuously shifts all carrier voices together."}),
   u.jsxs('label',{className:'f341-control',children:[u.jsx('span',{children:"Unchanged Pitch at Carrier Position"}),u.jsx('input',{type:'number',min:20,max:20000,step:1,value:p.carrierNeutralHz,'aria-label':"Carrier Position for Unchanged Pitch",onChange:e=>{if(e.currentTarget.value)__F341Workbench.patch({carrierNeutralHz:Number(e.currentTarget.value)})}}),u.jsx('small',{children:"Hz on the canvas. Fixed reference independent of the donor; above this position the entire recording shifts up, below it shifts down."})]}),
   u.jsxs('label',{className:'f341-control',children:[u.jsx('span',{children:'Quellzeit'}),u.jsx('select',{'aria-label':"Sound Material Source Time",value:p.materialTime,onChange:e=>__F341Workbench.patch({materialTime:e.currentTarget.value,...(e.currentTarget.value==='hold'&&p.position===0?{position:.5}:{})}),children:[u.jsx('option',{value:'stretch',children:"Full Motion · Stretch to Event Length"}),u.jsx('option',{value:'loop',children:'Independent tempo · repeat'}),u.jsx('option',{value:'hold',children:'Hold sound state'})]}),u.jsx('small',{children:p.materialTime==='stretch'?"One continuous source region runs through each carrier event once. Its own timing variations are stretched along with it.":p.materialTime==='loop'?"Source time runs at the original tempo; only the loop boundary is crossfaded. Pitch transposition may introduce reconstruction artifacts.":"One excerpt stays fixed. This also freezes its internal motion."})]}),
   ]}),
   p.materialTime!=='stretch'?u.jsx('div',{className:'f3564-position-row',children:u.jsx(__F341Control,{label:'Quellposition',name:'position',min:0,max:1,step:.01,help:"Start position within the allowed continuous source region."})}):null
  ]}),u.jsx(__F3564CarrierMiniature,{material})]}),
  u.jsxs('label',{children:["Choose Source Motion ",u.jsx('select',{'aria-label':"Choose Sound Material Motion",value:p.planning==='reference'?'reference':'neutral',onChange:e=>__F341Workbench.patch({planning:e.currentTarget.value}),children:[u.jsx('option',{value:'neutral',children:"Use Allowed Source Range"}),u.jsx('option',{value:'reference',children:'Fest markierter Referenzverlauf'})]})]}),
  p.planning==='reference'?u.jsxs('div',{children:[u.jsx('span',{children:selection?' Referenz '+(p.referenceStart*selection.duration).toFixed(2)+'–'+(p.referenceEnd*selection.duration).toFixed(2)+' s ':''}),u.jsx('button',{type:'button',disabled:!range,onClick:()=>__F341Workbench.patch({referenceStart:range[0],referenceEnd:range[1]}),children:"Use Marking as Reference"})]}):null,
  u.jsx('p',{className:'f341-muted',children:"Include/Exclude limits original material. Each carrier event remains within a continuous source region. Quiet states are not individually boosted. Playback and export use the same audio buffer."}),
  info?u.jsx('p',{role:'status',children:"Last Auditioned State: "+({stretch:'Motion stretched',loop:'Independent tempo',hold:'Sound state held'}[info.timeMode]??"Sound Material")+' · gemeinsame Tonlage '+info.transpose.toFixed(1)+" semitones."}):null
 ]});
}
function __F341UseMaterialPlan({effectiveModel,carrierState,duration,planRate,config}){
 return P.useMemo(()=>{try{return effectiveModel?__f342Plan(carrierState.spectralData,effectiveModel,config,duration,planRate):{runs:[],error:''};}catch(e){return {runs:[],error:e.message};}},[effectiveModel,config,carrierState.spectralData,carrierState.renderVersion,duration,planRate]);
}
function __F341UseWorkshopVisuals({selection,source,setHeat,setError,body,canvas,effectiveModel,hybrid,heat,config,layer,range,point,viewport,materialError,linkMode,runs,selectedRun,showOutput,outputCanvas,output}){
 P.useEffect(()=>{let cancelled=false;setHeat(null);if(selection){const cached=__F341Spectrograms.get(source);if(cached)setHeat(cached);else __f341Spectrogram(selection.samples,selection.sampleRate,()=>cancelled).then(value=>{if(value&&!cancelled){__F341Spectrograms.set(source,value);setHeat(value)}}).catch(e=>{if(!cancelled)setError(String(e.message??e))});}return()=>{cancelled=true};},[selection,source]);
 P.useEffect(()=>{if(!selection||!body)return;let pending=0;const paint=()=>{if(pending)return;pending=requestAnimationFrame(()=>{pending=0;__f341Paint(canvas.current,selection,body,effectiveModel??{...hybrid,sourceIndex:{...hybrid.sourceIndex,windows:[]}},heat,config,layer,range,point,viewport,materialError?[]:linkMode==='source'?runs.filter(run=>point!=null&&(point*selection.duration-selection.eventStart)*hybrid.sampleRate>=run.sourceStart&&(point*selection.duration-selection.eventStart)*hybrid.sampleRate<=run.sourceEnd):runs,linkMode==='source'?null:selectedRun);});};paint();const obs=typeof ResizeObserver!=='undefined'?new ResizeObserver(paint):null;obs?.observe(canvas.current);return()=>{obs?.disconnect();if(pending)cancelAnimationFrame(pending);};},[selection,body,effectiveModel,heat,config,layer,range,point,viewport,runs,selectedRun,materialError,linkMode]);
 P.useEffect(()=>{if(!showOutput||!outputCanvas.current||!output?.mantle)return;const c=outputCanvas.current;let pending=0;const paint=()=>{if(pending)return;pending=requestAnimationFrame(()=>{pending=0;const {ctx,w,h}=__f341CanvasSetup(c);ctx.fillStyle='#080d18';ctx.fillRect(0,0,w,h);__f341Heatmap(ctx,output.mantle,0,0,w,h);});};paint();const obs=typeof ResizeObserver!=='undefined'?new ResizeObserver(paint):null;obs?.observe(c);return()=>{obs?.disconnect();if(pending)cancelAnimationFrame(pending);};},[showOutput,output]);
 }
function __f35623WorkbenchCanvasInteractions({drag,keyboardAnchor,setLayer,setLinkMode,setPoint,setRange,selection,hybrid,runs,setSelectedRun}){
const setFromPointer=e=>{const c=e.currentTarget,box=c.getBoundingClientRect(),g=c.__f341Geometry;if(!g)return null;return __F341Workbench.clamp(g.lo+((e.clientX-box.left-g.left)/g.width)*(g.hi-g.lo),g.lo,g.hi);};
const down=e=>{if(e.button!==0)return;const f=setFromPointer(e);if(f==null)return;const box=e.currentTarget.getBoundingClientRect(),g=e.currentTarget.__f341Geometry,y=e.clientY-box.top;if(y>=g.rowTop&&y<g.rowTop+g.rowHeight*6)setLayer(__F341Workbench.layers[Math.floor((y-g.rowTop)/g.rowHeight)].id);drag.current={start:f,x:e.clientX};keyboardAnchor.current=null;setLinkMode('source');setPoint(f);setRange(null);const sample=(f*selection.duration-selection.eventStart)*hybrid.sampleRate;const linked=runs.findIndex(run=>sample>=run.sourceStart&&sample<=run.sourceEnd);setSelectedRun(linked<0?null:linked);e.currentTarget.setPointerCapture(e.pointerId);};
const move=e=>{if(!drag.current)return;const f=setFromPointer(e);if(f==null)return;setPoint(f);if(Math.abs(e.clientX-drag.current.x)>4)setRange([Math.min(f,drag.current.start),Math.max(f,drag.current.start)]);};
const up=e=>{if(drag.current){move(e);drag.current=null;}if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);};
return {down,move,up};
}
function __f35623WorkbenchKeyboard({canvas,selection,point,viewport,setPoint,setLinkMode,keyboardAnchor,setRange,close,dialog,runtime,preview,stopPreview,previewPending}){
const keydown=e=>{if(e.target===canvas.current&&selection&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const start=point??viewport[0],next=__F341Workbench.clamp(start+(e.key==='ArrowLeft'?-1:1)*.01/selection.duration,0,1);setPoint(next);setLinkMode('source');if(e.shiftKey){if(keyboardAnchor.current==null)keyboardAnchor.current=start;setRange([Math.min(keyboardAnchor.current,next),Math.max(keyboardAnchor.current,next)]);}else{keyboardAnchor.current=null;setRange(null);}}if(e.key==='Escape'){e.preventDefault();close();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)){e.preventDefault();e.shiftKey?__F341Workbench.redo():__F341Workbench.undo();}if(e.key==='Tab'){const nodes=[...dialog.current.querySelectorAll('button,input,select,[tabindex="0"]')].filter(n=>!n.disabled&&n.offsetParent!==null),first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}if(e.key===' '&&e.target===dialog.current){e.preventDefault();(runtime.phase==='playing'||runtime.phase==='rendering'||previewPending)?stopPreview():void preview();}e.stopPropagation();};
return keydown;
}
function __f35623WorkbenchAnalysisView({action,analysisText,availableRoles,body,busy,canvas,choiceIndex,config,down,drag,frame,frameIndex,hybrid,layer,mark,materialMode,metrics,move,point,range,reanalyse,selection,setLayer,setViewport,source,sourceMode,up}){
return u.jsxs('div',{className:'f341-main',children:[u.jsxs('div',{className:'f341-source',children:[
   u.jsxs('div',{className:'f341-viewtools',children:[u.jsx('strong',{children:"Donor Selection · Spectrum & Time"}),action("Entire Selection",()=>setViewport([0,1])),action("Enlarge Marking",()=>range&&setViewport(range),!range)]}),
   u.jsx('canvas',{ref:canvas,className:'f341-canvas','data-f350-sample':'true','aria-label':"Donor Spectrum with Analysis Layers",tabIndex:0,onPointerDown:down,onPointerMove:move,onPointerUp:up,onPointerCancel:()=>{drag.current=null}}),
   u.jsxs('div',{className:'f341-layerbuttons',children:__F341Workbench.layers.map(item=>action(item.label,()=>setLayer(item.id),false,{key:item.id,'aria-pressed':layer===item.id,style:{borderColor:layer===item.id?item.color:undefined,color:layer===item.id?item.color:undefined}}))}),
   u.jsx('p',{className:'f341-explanation',children:config.params.gestaltPilot?(layer==='material'?"Turquoise marks the allowed original source regions. Each carrier phrase stays in one connected region.":"The original PCM supplies the sound. Confident pitch observations guide tonal transport; resonance colour and gesture-shaped source time form this listening mode."):materialMode?(layer==='material'?"Turquoise shows allowed continuous source regions. The recording is not filtered here by sound similarity.":"Analysis describes the source; it does not determine transposition or split sound into tone and noise here."):sourceMode?(layer==='dynamics'?"The measured donor level acts as a sound-state index: quieter carrier passages select softer source states, louder passages select stronger states.":layer==='material'?"All audible sound states are available; your Include and Exclude markings restrict the source.":analysisText[layer]):analysisText[layer]}),
   u.jsx('p',{className:'f341-muted',children:materialMode?"The entire selected recording is available. Drag to mark a region; Include and Exclude shape source motion.":sourceMode?"The entire marked source is available. Quiet and strong states provide different Donor Sustain material. Drag to mark, use arrow keys to inspect.":"Dimmed regions lie outside the automatically analyzed sound event. A marking there can be analyzed as a new donor selection. Sample keyboard: arrows inspect, Shift + arrows select."})
  ]}),u.jsxs('aside',{className:'f341-inspector',children:[
   u.jsx('h3',{children:"Material & Examined Position"}),u.jsx('p',{children:point==null?"Click the sequence or an analysis row.":(point*selection.duration).toFixed(3)+" s in selection · "+(source.importStartSec+point*selection.duration).toFixed(3)+" s in file"}),
   u.jsxs('details',{className:'f350-analysis-details',children:[u.jsx('summary',{children:"Measured Analysis Values"}),frame?u.jsxs('dl',{children:[["Fundamental Frequency",metrics.pitchHz>0?metrics.pitchHz.toFixed(1)+' Hz':"not reliable"],["Pitch Confidence",(metrics.confidence*100).toFixed(0)+' %'],["Noise indicator",(metrics.noise*100).toFixed(1)+' %'],["Relative Level",(metrics.level*100).toFixed(0)+' %'],['Spektralspitzen',String(frame.spectralPeaks?.length??0)],['Materialentscheidung',__f342DecisionText(choiceIndex?.frameDecisions?.[frameIndex])],['Analysevorschlag',hybrid.kind==='periodic'?'periodisch':hybrid.kind==='modal'?'Resonanzmaterial':'Textur']].map(([a,b])=>u.jsxs('div',{children:[u.jsx('dt',{children:a}),u.jsx('dd',{children:b})]},a))}):u.jsx('p',{className:'f341-muted',children:point==null?"Analysis values appear here.":"This position lies outside the current event analysis."})]}),
   u.jsx('h3',{children:sourceMode?"Observed Attacks":"Onset & Material Rules"}),u.jsx('p',{className:'f341-muted',children:sourceMode?(hybrid.atlas?.attacks?.length??0)+" brief level rises observed. A selection boundary with ongoing sound counts as sustained sound.":__F347OnsetText(body)}),
   !sourceMode&&!materialMode&&u.jsxs('div',{className:'f347-choice',children:[
    u.jsxs('label',{children:["Material Strategy",u.jsxs('select',{'aria-label':'Donor Materialstrategie',disabled:config.params.windowMode!=='auto'||config.regions.some(r=>r.role==='include'),value:config.params.materialPolicy,onChange:e=>__F341Workbench.patch({materialPolicy:e.currentTarget.value}),children:[u.jsx('option',{value:'similar',children:"Prefer Similar States"}),u.jsx('option',{value:'evolving',children:"Allow Varying Motion"})]})]}),
    u.jsx('p',{children:config.params.windowMode!=='auto'||config.regions.some(r=>r.role==='include')?"Direct window selection or your Include markings determine the material here.":config.params.materialPolicy==='similar'?"Aperiodicity, spectral shape, level and, for periodic material, pitch confidence restrict the candidate pool. Adjust tolerance or choose motion mode.":"Local changes in spectral shape, level and aperiodicity divide the motion into material segments. Noisy or changing frames are not rejected solely for their sound class."}),
    u.jsxs('label',{children:[(config.params.materialPolicy==='similar'?"Similarity Tolerance":"Sensitivity to Segment Changes")+' · '+config.params.selectionTolerance.toFixed(2)+'×',u.jsx('input',{type:'range','aria-label':'Donor selection tolerance',min:.5,max:2.5,step:.05,value:config.params.selectionTolerance,disabled:config.params.windowMode!=='auto'||config.regions.some(r=>r.role==='include'),onChange:e=>__F341Workbench.patch({selectionTolerance:Number(e.currentTarget.value)})})]}),
    u.jsx('p',{children:config.params.materialPolicy==='similar'?"Higher = wider similarity tolerance. Level and pitch limits remain part of this strategy.":"Higher = more sensitive to local changes; more material segments. This is a segmentation choice, not a rating of the sound."}),
    u.jsx('p',{children:(choiceIndex?.windows?.length??0)+" permitted material windows · "+(choiceIndex?.acceptedFrames?.length??0)+" accepted analysis frames"+(choiceIndex?.fallback?" · automatic fallback region":'')})
   ]}),u.jsx('h3',{children:"Edit Material"}),u.jsx('p',{children:range?'Markiert: '+(range[0]*selection.duration).toFixed(3)+'–'+(range[1]*selection.duration).toFixed(3)+' s':"Drag to select a region directly in the sequence."}),
   u.jsx('div',{className:'f341-mark-actions',children:Object.entries(availableRoles).map(([id,label])=>action(label,()=>mark(id),!range,{key:id,'data-f341-mark':id}))}),
   action("Reanalyze Region as Donor",()=>void reanalyse(),!range||busy),
   !sourceMode&&!materialMode&&u.jsxs('label',{className:'f341-select',children:[u.jsx('span',{children:'Direkte Fensterwahl'}),u.jsx('select',{'aria-label':'Donor Materialfenster',value:config.params.windowMode,onChange:e=>__F341Workbench.patch({windowMode:e.currentTarget.value}),children:[u.jsx('option',{value:'auto',children:"Choose by Material Strategy"}),u.jsx('option',{value:'all',children:"Allow Entire Analyzed Sound Body"}),u.jsx('option',{value:'pin',children:"Lock One Original Auto Window"})]})]}),
   !sourceMode&&!materialMode&&config.params.windowMode==='pin'?u.jsx('select',{'aria-label':'Hold auto window',value:config.params.windowId,onChange:e=>__F341Workbench.patch({windowId:Number(e.currentTarget.value)}),children:(hybrid.sourceIndex?.windows??[]).map(win=>u.jsx('option',{value:win.id,children:'Window '+(win.id+1)+' · '+((win.endSample-win.startSample)/hybrid.sampleRate).toFixed(2)+' s'},win.id))}):null,
   u.jsx('p',{className:'f341-muted',children:materialMode?"Include selects source regions, Exclude removes them. Without markings, the entire selection is available.":sourceMode?"Include limits the source; Exclude removes regions. Without these markings, all audible states remain available.":config.regions.some(r=>r.role==='include')?"Manual Include regions replace automatic window selection. Excluded regions are then subtracted.":"Noise/Tonal markings weight the spectrum used there. They do not change measured analysis values."})
  ]})]});
}
function __f35631WorkbenchExpertControls({materialMode,sourceMode,config,controls,runs,outputCurrent,output,planned}) {
  return !materialMode&&u.jsxs('details',{className:'f350-specialist',children:[u.jsx('summary',{children:sourceMode?"Source Motion & Formant Position":"Spectral Projection Controls"}),
 u.jsxs('div',{className:'f341-controls-header',children:[u.jsxs('div',{children:[u.jsx('h3',{children:"03 · Design Transfer"}),u.jsx('p',{children:"The carrier figure controls time, pitch motion and rests. Control changes stop the preview. The current recipe is rendered on the next play. Apply activates it in Forge."})]}),u.jsxs('label',{className:'f341-select',children:[u.jsx('span',{children:'Materialrichtung'}),u.jsx('select',{'aria-label':'Donor Materialrichtung',value:config.params.direction,onChange:e=>__F341Workbench.patch({direction:e.currentTarget.value}),children:[u.jsx('option',{value:'pendulum',children:'Pendeln'}),u.jsx('option',{value:'forward',children:"Forward"}),u.jsx('option',{value:'reverse',children:"Backward"})]})]})]}),
  ...[
   ["Project Spectrum onto Carrier Figure",['mapping','resonance','formant','spread']],
   ["Read Material & Transfer Dynamics",['motion','position','dynamics']],
   ['Weight existing spectral components',['noise','tonal']]
  ].filter(([,names])=>!sourceMode||names.includes('motion')).map(([title,names])=>u.jsxs('div',{className:'f347-control-group',children:[u.jsx('h4',{children:title}),u.jsx('div',{className:'f341-controls',children:controls.filter(c=>names.includes(c.name)&&(!sourceMode||['resonance','formant','position'].includes(c.name)||c.name==='motion'&&config.params.sustainFlavor==='motion')).map(item=>u.jsx(__F341Control,item,item.name))})]},title)),
  !sourceMode&&config.params.signaturePilot&&u.jsx('p',{className:'f341-muted',children:"Donor-fidelity experiments: Preserve Spectrum opens the carrier mask; Preserve Source Motion avoids local pitch normalization. All three at 0 = baseline engine without experiments. Scale Peak Neighbors also changes analysis-window lobes; its quality depends on the material. With a static image, the second control cannot preserve moving vibrato. Neither experiment changes the saved original samples."}),
  !sourceMode&&u.jsx('p',{className:'f341-muted',children:"Noise and tonal weights both default to 1: no additional separation. The weights are a spectral interpretation, not isolated breath/noise or tonal tracks. With textures lacking reliable partial frequencies, their separate effects may be subtle."}),
  !sourceMode&&u.jsxs('div',{className:'f347-window-controls',children:[
   u.jsxs('label',{children:["Spectral Grain Windows · Rule",u.jsxs('select',{'aria-label':'Donor Fensterregel',value:config.params.windowStrategy,onChange:e=>__F341Workbench.patch({windowStrategy:e.currentTarget.value}),children:[u.jsx('option',{value:'capacity',children:"F3-45 · By Available Material Span"}),u.jsx('option',{value:'structure',children:"By Periods & Local Changes"}),u.jsx('option',{value:'duration',children:"Custom Target Duration"})]})]}),
   u.jsx(__F341Control,controls.find(c=>c.name==='detail')),
   config.params.windowStrategy==='duration'?u.jsxs('label',{children:['Target duration · '+config.params.windowMs.toFixed(0)+' ms',u.jsx('input',{type:'range','aria-label':'Donor window target duration',min:8,max:170,step:1,value:config.params.windowMs,onChange:e=>__F341Workbench.patch({windowMs:Number(e.currentTarget.value)})})]}):null,
   u.jsx('p',{children:config.params.windowStrategy==='capacity'?"The established F3-45 rule remains the baseline: the shortest allowed material span per voice limits window length.":config.params.windowStrategy==='structure'?"The rule estimates duration from observed periods and local changes. Stronger changes shorten windows; available material span still limits their length.":"Target duration is rounded to a power-of-two FFT size and limited by available material span."}),
   u.jsx('p',{'data-f347-window-summary':'true',children:runs.length?"Actual "+[...new Set(runs.filter(r=>r.workbenchRead).map(r=>r.workbenchRead.size))].sort((a,b)=>a-b).map(n=>n+' Samples / '+(n/(outputCurrent?output.buffer.sampleRate:planned.sampleRate)*1000).toFixed(1)+' ms · grid '+((outputCurrent?output.buffer.sampleRate:planned.sampleRate)/n).toFixed(1)+' Hz').join(' · ')+' · '+(outputCurrent?'gerendert':'geplant'):"Window sizes appear once the figure contains a carrier run."}),
   u.jsx('p',{children:"Short windows track changes more closely but resolve frequency more coarsely. Long windows preserve finer spectral structure. Original PCM excerpts are read with overlap and projected spectrally in full; analysis values do not replace the audio."})
  ]}),
  sourceMode&&u.jsx(__F341Control,{label:'Formantlage',name:'formant',min:-12,max:12,step:.5,unit:" st",help:"0 preserves the original source pitch. This shift is an intentional timbral change."})
 ]});
}
function __f35631WorkbenchABCompare({action,wb,busy}) {
  return u.jsxs('details',{className:'f347-recipe-compare',children:[u.jsx('summary',{children:"Optional: Compare Two Transfer Recipes"}),u.jsxs('div',{children:[action("Remember Recipe A",()=>__F341Workbench.storeA(),busy),action(wb.compareSide==='A'?"Switch to Recipe B":"Load Recipe A",()=>__F341Workbench.toggleAB(),!wb.hasA||busy)]}),u.jsx('p',{className:'f341-muted',children:"Only controls and markings change. Source, carrier and tempo remain the same. Each side is heard with the normal Play control; no finished audio take is saved."})]});
}
function __f35631WorkbenchPresetSave({presetName,setPresetName,setError,config,materialError,action}) {
  return u.jsxs('footer',{className:'f341-footer',children:[u.jsx('input',{'aria-label':"Name your custom recipe",placeholder:"Name Preset or Donor Variant",value:presetName,onChange:e=>setPresetName(e.currentTarget.value)}),action("Save Parameter Preset",()=>{try{const item=__F341Workbench.savePreset(presetName);__F341Workbench.set({...config,preset:item.id});setPresetName('');setError('')}catch(e){setError(e.message)}},!presetName.trim()),action("Save Donor Variant",()=>{try{const item=__F341Workbench.savePreset(presetName,true);__F341Workbench.set({...config,preset:item.id});setPresetName('');setError('')}catch(e){setError(e.message)}},!presetName.trim()||!!materialError)]});
}
function __f35631WorkbenchControlDescriptors({hybrid,sourceMode}) {
  return [
  {label:"Projection · Partial Structure ↔ Canvas",name:'mapping',min:0,max:1,help:"Auto follows the analysis suggestion and figure width. You can override this assumption with the control."},
  {label:'Resonanzen erhalten',name:'resonance',min:0,max:1,help:hybrid?.kind==='periodic'?'Periodic donor · active resonance correction.':"Inactive for this donor · requires periodic material."},
  {label:'Donor spectrum preserved · experiment',name:'sourceSpectrum',min:0,max:1,step:.05,help:"0 = exactly the previous sound. Higher values retain more of the original donor frequencies instead of cutting them with the carrier canvas. Pitch, glissandi and voices remain carrier-controlled. Noise components may also become more pronounced."},
  {label:'Original motion preserved · experiment',name:'sourceMotion',min:0,max:1,step:.05,help:hybrid?.kind==='periodic'?"0 = previous normalization. 1 = preserve natural vibrato and source pitch motion relative to the carrier melody; playback remains tied to source motion. To isolate the effect, set Donor Spectrum to 1 and Material Motion to Forward.":"The source was not recognized as stably tonal: this experiment does not change pitch mapping here."},
  {label:'Peak-Nachbarschaft skalieren · Versuch',name:'spectralCohesion',min:0,max:1,step:.05,help:"0 = previous sound. 1 = when transposing, frequency spacings immediately around spectral peaks shift proportionally too. This may preserve rough or complex sounds differently, but can also create blur. Active only in this experimental listening mode."},
  {label:'Resonanzlage',name:'formant',min:-12,max:12,step:.5,unit:" st",help:hybrid?.kind==='periodic'?"Shifts resonance correction.":"Inactive for this donor · requires periodic material."},
  {label:'Spektrale Breite',name:'spread',min:.5,max:2,help:"Affects the broad-area component."},
  {label:sourceMode?"Body Change Speed":'Materialbewegung',name:'motion',min:0,max:3,help:sourceMode?"Motion only: pace of slow, phase-compatible loop changes. 0 holds the same body.":"0 holds the source position."},
  {label:sourceMode?'Bevorzugter Quellort':'Start position in window',name:'position',min:0,max:1,help:sourceMode?"When seam quality is similar, prefer a loop body closer to this source position.":"Start center within the yellow FFT-safe span for each carrier run."},
  {label:"Noise Component Weight",name:'noise',min:0,max:2,help:hybrid?.kind==='texture'?"Texture: no separate partial structure. Energy correction can balance relative weighting.":"Relative weight; total energy is compensated."},
  {label:'Tonale Anteile gewichten',name:'tonal',min:0,max:2,help:hybrid?.kind==='texture'?"Texture: no separate partial structure; effect may be absent.":"Weight around partial frequencies; not an isolated tonal stem."},
  {label:"Balance Donor Level",name:'dynamics',min:0,max:1,help:"0 retains more microdynamics."},
  {label:"Shorten Windows",name:'detail',min:.25,max:1,step:.25,help:"Powers of two: full, half or quarter length of the selected window rule."}
 ];
}
function __f35636Asset(result,name) {
  const pcm=result.samples, duration=pcm.length/result.sampleRate;
  return {id:'dual-'+result.revision,kind:'audio',fileName:(name||'Hybrid Donor')+'.wav',sampleRate:result.sampleRate,monoSamples:pcm,leftSamples:pcm,rightSamples:pcm,
    midSamples:pcm,sideSamples:new Float32Array(pcm.length),channelCount:1,numberOfChannels:1,
    waveformPreview:E4e(pcm,1024),stereoWidthPreview:new Float32Array(1024),
    durationSec:duration,originalDuration:duration,importStartSec:0,importDurationSec:duration,
    dualDonorManifest:result.manifest,contentRevision:result.revision};
}
function __f35636Wav(source){const samples=source.samples,buffer=new ArrayBuffer(44+samples.length*4),v=new DataView(buffer);const str=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i));};
  str(0,'RIFF');v.setUint32(4,36+samples.length*4,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,3,true);v.setUint16(22,1,true);
  v.setUint32(24,source.sampleRate,true);v.setUint32(28,source.sampleRate*4,true);v.setUint16(32,4,true);v.setUint16(34,32,true);str(36,'data');v.setUint32(40,samples.length*4,true);
  for(let i=0;i<samples.length;i++)v.setFloat32(44+i*4,samples[i],true);return new Blob([buffer],{type:'audio/wav'});
}
function __f35636Download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name.replace(/[^a-z0-9._ -]/gi,'_');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function __f35636PortableRevision(bytes){let a=2166136261,b=2246822519;for(let i=0;i<bytes.length;i++){a=Math.imul(a^bytes[i],16777619);b=Math.imul(b^bytes[i],3266489917);}return 'pcm64:'+bytes.length+':'+(a>>>0).toString(16)+':'+(b>>>0).toString(16);}
async function __f35636RevisionMatches(bytes,expected,sr=null,count=null){
 if(typeof expected!=='string')return false;if(expected.startsWith('pcm64:'))return __f35636PortableRevision(bytes)===expected;
 const digest=await __f35635Digest(bytes);return (sr==null?digest:digest+':'+sr+':'+count)===expected;
}
async function __f35636SessionFile(value){
  const entries=[];for(const slot of ['A','B','result']){const s=slot==='result'?value.result:value.sources[slot];if(s)entries.push({slot,sampleRate:s.sampleRate,length:s.samples.length,revision:s.revision,duration:s.duration,pcmRevision:__f35636PortableRevision(new Uint8Array(s.samples.buffer,s.samples.byteOffset,s.samples.byteLength))});}
  const grid=value.carrier?.spectralSnapshot?new Float32Array(value.carrier.spectralSnapshot):null;
  if(grid)entries.push({slot:'carrier-grid',length:grid.length,pcmRevision:__f35636PortableRevision(new Uint8Array(grid.buffer))});
  const encoder=new TextEncoder(),header=encoder.encode(JSON.stringify({schema:'xensonar-dual-donor-session-v2',plan:value.plan,settings:value.settings,
    carrier:value.carrier?{...value.carrier,spectralSnapshot:null}:null,workbench:value.workbench??null,combination:value.combination??null,stateContractVersion:3,renderContext:value.renderContext??null,resultManifest:value.result?.manifest??null,resultRevision:value.result?.revision??null,
    pcm:entries}));
  const size=new ArrayBuffer(4);new DataView(size).setUint32(0,header.length,true);return new Blob([new Uint8Array([88,68,83,49]),size,header,...['A','B','result'].map(slot=>slot==='result'?value.result?.samples:value.sources[slot]?.samples).filter(Boolean),...(grid?[grid]:[])],{type:'application/octet-stream'});
}
async function __f35636ReadSession(file){
  if(file.size>72*1024*1024||file.size<12)throw Error('Invalid session size.');const bytes=await file.arrayBuffer(),v=new DataView(bytes);
  if(v.getUint32(0,false)!==0x58445331)throw Error('Not a Dual Donor audio session.');const len=v.getUint32(4,true);if(len>12*1024*1024||len+8>bytes.byteLength)throw Error('Invalid session header.');
  const h=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,8,len)));if(!['xensonar-dual-donor-session-v1','xensonar-dual-donor-session-v2'].includes(h.schema))throw Error('Unsupported audio session.');
  const sources={A:null,B:null},slots=new Set();let result=null,at=8+len;
  for(const p of h.pcm){const grid=p.slot==='carrier-grid';if(!['A','B','result','carrier-grid'].includes(p.slot)||!Number.isSafeInteger(p.length)||p.length<(grid?1:256)||p.length>12000000||(!grid&&!(p.sampleRate>=8000&&p.sampleRate<=192000))||at+p.length*4>bytes.byteLength)throw Error('Invalid session audio.');
    if(slots.has(p.slot))throw Error('Duplicate session audio.');slots.add(p.slot);
    const samples=new Float32Array(bytes.slice(at,at+p.length*4));at+=p.length*4;for(const x of samples)if(!Number.isFinite(x))throw Error('Session contains invalid audio.');
    if(grid){if(!h.carrier||!(await __f35636RevisionMatches(new Uint8Array(samples.buffer),p.pcmRevision)))throw Error('Carrier figure does not match its content revision.');h.carrier.spectralSnapshot=samples;continue;}
    const source={samples,sampleRate:p.sampleRate,duration:p.length/p.sampleRate,revision:p.revision};
    if(!(await __f35636RevisionMatches(new Uint8Array(samples.buffer),p.pcmRevision,p.sampleRate,p.length)))throw Error('Session audio does not match its saved content revision.');
    if(p.slot==='result')result={...source,manifest:h.resultManifest};else sources[p.slot]=source;
  }
  if(at!==bytes.byteLength)throw Error('Unexpected trailing session data.');
  if(!sources.A||!sources.B)throw Error('Session needs both original donor recordings.');
  if(result&&(!h.resultManifest?.recipe||!Array.isArray(h.resultManifest.recipe.links)||typeof h.resultManifest.key!=='string'))throw Error('Completed audio has no valid saved render recipe.');
  if(result)result.manifest={...result.manifest,recipe:__f35634Clean(result.manifest.recipe)};
  const plan=__f35634Clean({...h.plan,revision:h.plan?.revision??(h.resultManifest?.version==='dual-donor-spectral-body-f3.56.36'?'original':'revised')});
  // Assess freshness BEFORE source revisions are rebound to the verified imported PCM.
  // A completed old render stays available even if today's draft cannot be rendered yet.
  let current=false;
  if(result&&h.resultManifest){try{
    current=h.resultManifest.version===__F35636DualDSP.forPlan(plan).version&&
      h.resultManifest.key===__F35636DualDSP.key(plan,sources,h.settings??{});
  }catch{/* An incomplete or edited draft does not invalidate the old audio itself. */}}
  for(const slot of ['A','B']){const revision=await __f35635PCMRevision(sources[slot]);
    // Session files bind marks to the actual imported PCM, not to a carried-over label.
    sources[slot].revision=revision;plan.sources[slot]={...plan.sources[slot],kind:'file',id:'session:'+revision,revision};}
  if(result){result.revision=await __f35635PCMRevision(result);
    result.manifest=current?{...result.manifest,key:__F35636DualDSP.key(plan,sources,h.settings??{}),sourceRevisions:{A:sources.A.revision,B:sources.B.revision},recipe:plan}:
      {...result.manifest,key:'last-render:'+(result.manifest?.key??result.revision)};}
  return {plan,sources,result,settings:h.settings,carrier:h.carrier,workbench:h.workbench,combination:h.combination,renderContext:h.renderContext??null};
}
function __F35636Output({body,current,problem,settings,onSettings,job,onRender,onCancel,onListen,audition,onSave,onUse,onHearCarrier,transferReady,actionFeedback,carrierPreviewBusy,onExport,onExportSession,onImportSession,sessionImport,savedFigure,onRestore,audioSaved}) {
 return u.jsxs('section',{className:'f35636-output','aria-label':'Hybrid donor output',children:[
  u.jsx('div',{className:'f35634-overline',children:'04 / SHARED SOUND BODY'}),u.jsx('h3',{children:'Build a donor. Give it a figure.'}),
  u.jsx('p',{children:'Linked time windows follow the same relative progress. Cross finds a spectral middle; Imprint reshapes the target; Interlock bends each structure through the other. The result is one new donor.'}),
  u.jsxs('div',{className:'f35636-controls',children:[
   u.jsxs('label',{children:['Body duration (s)',u.jsx('input',{type:'number','aria-label':'Hybrid duration',min:.1,max:8,step:.1,value:settings.duration,onChange:e=>onSettings({...settings,duration:Number(e.currentTarget.value)})})]}),
   u.jsxs('label',{children:['Relationship strength · '+Math.round(settings.strength*100)+'%',u.jsx('input',{type:'range','aria-label':'Relationship strength',min:0,max:1,step:.01,value:settings.strength,onChange:e=>onSettings({...settings,strength:Number(e.currentTarget.value)})})]})]}),
  problem?u.jsx('p',{className:'f35636-status',children:problem}):null,
  body&&!current?u.jsx('p',{className:'f35636-status',children:'Changes pending. The last completed hybrid remains available to hear or export. Build again for the current recipe.'}):null,
  u.jsxs('div',{className:'f35636-actions',children:[u.jsx('button',{type:'button',disabled:!!problem||job.busy,onClick:onRender,children:job.busy?job.label:'Build Hybrid Donor'}),job.busy?u.jsx('button',{type:'button',onClick:onCancel,children:'Cancel'}):null]}),
  job.busy?u.jsx('progress',{max:1,value:job.progress,'aria-label':'Hybrid preparation progress'}):null,
  body?u.jsx('p',{role:'status',children:'Ready · '+body.duration.toFixed(2)+' s · '+body.manifest.recipe.links.length+' relationship(s) · one sound body'}):null,
  u.jsxs('div',{className:'f35636-actions',children:[
   u.jsx('button',{type:'button',disabled:!body||job.busy,onClick:onListen,children:audition?.slot==='result'?'■ Stop Hybrid':'▶ Hear Hybrid'}),
   u.jsx('button',{type:'button',disabled:!body||job.busy,onClick:onExport,children:'Export Hybrid WAV'}),
   u.jsx('button',{type:'button',disabled:!body||!current||job.busy,onClick:onSave,children:'Save to Donor Library'}),
   u.jsx('button',{type:'button',disabled:!body||!current||job.busy,onClick:onUse,children:'Use Hybrid in Forge'}),u.jsx('button',{type:'button',disabled:!transferReady||job.busy||carrierPreviewBusy,onClick:onHearCarrier,children:'▶ Hear Hybrid in Carrier'})]}),
  transferReady?u.jsx('p',{className:'f35637-transfer-confirm',role:'status',children:'✓ Hybrid in Forge · Available in Audio Import Rack'}):null,
  actionFeedback?u.jsx('p',{className:'f35637-action-feedback '+actionFeedback.kind,role:'status',children:actionFeedback.text}):null,
  u.jsx('p',{className:'f35636-small',children:'Articulation lets your drawing lead onset, duration, pitch and silence. The donor contributes its observed beginning, body and ending. Carrier transfer is an explicit action.'}),
  u.jsxs('details',{children:[u.jsx('summary',{children:'Keep this experiment · original audio and figure'}),
   u.jsx('p',{children:audioSaved||'A complete session includes original recordings, marks, relationships, settings and the saved carrier. Blueprint JSON contains no audio.'}),
   u.jsxs('div',{className:'f35636-actions',children:[u.jsx('button',{type:'button',onClick:onExportSession,children:'Export complete session'}),u.jsx('button',{type:'button',onClick:()=>sessionImport.current?.click(),children:'Import complete session'}),u.jsx('button',{type:'button',disabled:!savedFigure,onClick:onRestore,children:'Restore saved figure'}),u.jsx('input',{ref:sessionImport,type:'file',accept:'.xds',hidden:true,onChange:e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';void onImportSession(file)}})]})]})
 ]});
}
function __f35634Clean(data){
 const base=__F35634Default();if(!data||!['xensonar-dual-donor-ui-v1',base.schema].includes(data.schema))return base;
 const cleanSource=s=>s&&['active','library','file'].includes(s.kind)?{kind:s.kind,id:typeof s.id==='string'?s.id:null,label:String(s.label||'Donor').slice(0,140),revision:typeof s.revision==='string'?s.revision.slice(0,110):null}:null;
 const regions=(Array.isArray(data.regions)?data.regions:[]).slice(0,48).filter(r=>r&&['A','B'].includes(r.slot)&&typeof r.id==='string').map(r=>({id:r.id.slice(0,64),slot:r.slot,x0:__F341Workbench.clamp(Number(r.x0),0,1),x1:__F341Workbench.clamp(Number(r.x1),0,1),y0:__F341Workbench.clamp(Number(r.y0),0,1),y1:__F341Workbench.clamp(Number(r.y1),0,1),feature:['all','resonance','texture','motion'].includes(r.feature)?r.feature:'all'})).filter(r=>r.x1>r.x0&&r.y1>r.y0);
 const ids=new Set(regions.map(r=>r.id));const links=(Array.isArray(data.links)?data.links:[]).slice(0,48).filter(l=>l&&ids.has(l.a)&&ids.has(l.b)&&regions.some(r=>r.id===l.a&&r.slot==='A')&&regions.some(r=>r.id===l.b&&r.slot==='B')).map(l=>({id:String(l.id||'link').slice(0,64),a:l.a,b:l.b,mode:['cross','imprint','interlock'].includes(l.mode)?l.mode:'cross',direction:['A_to_B','B_to_A'].includes(l.direction)?l.direction:null}));
 return {revision:data.revision === "original" ? "original" : "revised",schema:base.schema,name:String(data.name||base.name).slice(0,100),sources:{A:cleanSource(data.sources?.A),B:cleanSource(data.sources?.B)},regions,links,operation:['cross','imprint','interlock'].includes(data.operation)?data.operation:'cross',imprintDirection:['A_to_B','B_to_A'].includes(data.imprintDirection)?data.imprintDirection:'A_to_B',remainder:['undecided','linked_only','keep_A','keep_B'].includes(data.remainder)?data.remainder:'undecided',updatedAt:Number(data.updatedAt)||0};
}
function __f35634Load(){try{return __f35634Clean(JSON.parse(localStorage.getItem(__F35634Key)||localStorage.getItem(__F35634LegacyKey)||'null'))}catch{return __F35634Default()}}
async function __f35635Digest(bufferLike){
 const bytes=bufferLike instanceof Uint8Array?bufferLike:new Uint8Array(bufferLike.buffer||bufferLike,bufferLike.byteOffset||0,bufferLike.byteLength||bufferLike.length);
 if(globalThis.crypto?.subtle){const hash=await crypto.subtle.digest('SHA-256',bytes);return 'sha256:'+Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');}
 let h=2166136261;for(let i=0;i<bytes.length;i++){h^=bytes[i];h=Math.imul(h,16777619)}return 'fnv32:'+bytes.length+':'+(h>>>0).toString(16);
}
async function __f35635PCMRevision(pcm){
 const raw=new Uint8Array(pcm.samples.buffer,pcm.samples.byteOffset,pcm.samples.byteLength);
 return (await __f35635Digest(raw))+':'+pcm.sampleRate+':'+pcm.samples.length;
}
function __f35646CarrierStamp(s){
 return [s.renderVersion,s.spectralData,s.materialExport,s.viewPort,s.activeTool,s.toolProfiles,s.synthMode,s.waveformMix,s.colorMapName,s.showGrainLayer,s.logScale,s.stampScaleX,s.stampScaleY,s.stampRotation,s.stampFlipX,s.stampFlipY,s.carrierIntegralSelection,s.carrierIntegralSynthLab,s.carrierIntegralHarmonicXplore];
}
function __f35646DraftSaver(capture,write,onState=()=>{},delay=300){
 let timer=null,pending=false,closed=false,queue=Promise.resolve();
 function flush(){
  clearTimeout(timer);timer=null;if(!pending)return queue;pending=false;
  let value;try{value=capture();}catch(e){onState(false,e);return queue;}if(!value)return queue;
  queue=queue.catch(()=>{}).then(()=>write(value)).then(()=>onState(true),e=>onState(false,e));return queue;
 }
 return Object.freeze({schedule(){if(closed)return;pending=true;clearTimeout(timer);timer=setTimeout(flush,delay);},flush,close(){if(closed)return queue;closed=true;return flush();}});
}
function __f35637AutomaticRecipe(plan,sources){
 if(!sources?.A?.revision||!sources?.B?.revision)throw Error('Load both original recordings first.');
 if(plan.links?.length)return __f35634Clean(plan);
 const mode=['cross','imprint','interlock'].includes(plan.operation)?plan.operation:'cross';
 const direction=mode==='imprint'?(plan.imprintDirection==='B_to_A'?'B_to_A':'A_to_B'):null;
 const regions=[...(plan.regions??[])],ids={};
 for(const slot of ['A','B']){
  const id='auto-'+slot;ids[slot]=id;
  if(!regions.some(r=>r.id===id)&&regions.filter(r=>r.slot===slot).length>=24)throw Error('Donor '+slot+' already has 24 marks. Connect your existing regions or remove a mark before automatic creation.');
  if(!regions.some(r=>r.id===id))regions.push({id,slot,x0:0,x1:1,y0:0,y1:1,feature:'all'});
 }
 const recipe={...plan,sources:{...plan.sources,A:{...plan.sources.A,revision:sources.A.revision},B:{...plan.sources.B,revision:sources.B.revision}},
   regions,links:[{id:'auto-pair-1',a:ids.A,b:ids.B,mode,direction}],
   remainder:'linked_only',operation:mode,revision:plan.revision,updatedAt:Date.now()};
 return __f35634Clean(recipe);
}
function __f35634PCM(asset,start=0,duration=null){
 const pcm=asset?.monoSamples?.length?asset.monoSamples:asset?.leftSamples?.length?asset.leftSamples:null;
 const sampleRate=Number(asset?.sampleRate)||0;
 if(!pcm||!sampleRate||sampleRate<8000)throw new Error('This source has no readable PCM.');
 const first=Math.max(0,Math.min(pcm.length-1,Math.floor(Number(start||0)*sampleRate)));
 const count=Math.min(pcm.length-first,Math.floor(Math.max(.025,Math.min(60,Number(duration)||60))*sampleRate));
 if(count<256)throw new Error('The saved selection contains too little audio.');
 return {samples:pcm.subarray(first,first+count),sampleRate,duration:count/sampleRate,originalDuration:pcm.length/sampleRate,truncated:Number(duration)>60||pcm.length-first>count+1};
}
function __f35634CurrentPCM(source){if(!source)return null;return __f35634PCM(source,source.importStartSec??0,source.importDurationSec??60)}
function __f35634Freq(yy,sampleRate){return 35*Math.pow(sampleRate*.46/35,1-yy)}
function __f35634RegionText(r,src){
 if(!src)return 'Source unavailable';const t0=r.x0*src.duration,t1=r.x1*src.duration;
 const high=__f35634Freq(r.y0,src.sampleRate),low=__f35634Freq(r.y1,src.sampleRate);
 const hz=f=>f>=1000?(f/1000).toFixed(1)+'k':Math.round(f)+'Hz';
 return t0.toFixed(2)+'–'+t1.toFixed(2)+'s · '+hz(low)+'–'+hz(high);
}
function __F35634Spectrum({slot,source,regions,selected,onPick,onAdd,feature,links,activeLink,editable=true,scanProgress=null}){
 const canvas=P.useRef(null),draw=P.useRef(null),[heat,setHeat]=P.useState(null),[draft,setDraft]=P.useState(null),drag=P.useRef(null),[analysisState,setAnalysisState]=P.useState('');
 P.useEffect(()=>{let disposed=false;setHeat(null);setAnalysisState(source?'Preparing spectrum…':'Choose a source to view its real spectrum.');if(!source)return;
 __f341Spectrogram(source.samples,source.sampleRate,()=>disposed).then(h=>{if(!disposed){setHeat(h);setAnalysisState(h?'':'Spectrum unavailable.')}}).catch(e=>{if(!disposed)setAnalysisState('Spectrum: '+(e.message||e))});return()=>{disposed=true};},[source]);
 const paint=()=>{const c=canvas.current;if(!c)return;const w=c.clientWidth||600,h=c.clientHeight||250,ratio=Math.min(2,window.devicePixelRatio||1);c.width=Math.round(w*ratio);c.height=Math.round(h*ratio);const ctx=c.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);
 ctx.fillStyle='#07111e';ctx.fillRect(0,0,w,h);const g={left:45,top:8,width:Math.max(50,w-57),height:Math.max(60,h-34)};draw.current=g;
 if(heat)__f341Heatmap(ctx,heat,g.left,g.top,g.width,g.height);
 else{ctx.fillStyle='#101e30';ctx.fillRect(g.left,g.top,g.width,g.height);ctx.fillStyle='#7790a9';ctx.font='12px system-ui';ctx.fillText(analysisState||'Awaiting source',g.left+18,g.top+g.height/2);}
 ctx.lineWidth=1;ctx.font='10px system-ui';ctx.textBaseline='middle';
 for(const f of [100,500,2000,8000]){if(!source||f>=source.sampleRate*.46)continue;const y=g.top+g.height*(1-Math.log(f/35)/Math.log(source.sampleRate*.46/35));ctx.strokeStyle='#ffffff15';ctx.beginPath();ctx.moveTo(g.left,y);ctx.lineTo(g.left+g.width,y);ctx.stroke();ctx.fillStyle='#90a7bf';ctx.textAlign='right';ctx.fillText(f>=1000?(f/1000)+'k':String(f),g.left-6,y);}
 for(let i=0;i<=4;i++){const x=g.left+g.width*i/4;ctx.strokeStyle='#ffffff14';ctx.beginPath();ctx.moveTo(x,g.top);ctx.lineTo(x,g.top+g.height);ctx.stroke();ctx.fillStyle='#8ca9c1';ctx.textAlign='center';ctx.fillText(source?(source.duration*i/4).toFixed(1)+'s':(i*25)+'%',x,h-12);}
 const fill=slot==='A'?'rgba(62,220,195,.23)':'rgba(249,165,104,.22)',stroke=slot==='A'?'#61ead5':'#ffbb83';
 const box=(r,active=false,provisional=false)=>{const x=g.left+r.x0*g.width,y=g.top+r.y0*g.height,bw=(r.x1-r.x0)*g.width,bh=(r.y1-r.y0)*g.height;
 const involved=links.some(l=>(slot==='A'?l.a:l.b)===r.id&&l.id===activeLink);ctx.fillStyle=fill;ctx.fillRect(x,y,bw,bh);ctx.lineWidth=involved?3.5:active?2.5:1.5;ctx.strokeStyle=involved?'#f6ffbd':stroke;ctx.setLineDash(provisional?[5,4]:[]);ctx.strokeRect(x,y,bw,bh);ctx.setLineDash([]);};
 regions.filter(r=>editable||!String(r.id).startsWith('auto-')).forEach(r=>{box(r,r.id===selected,false);const indices=links.map((l,i)=>((slot==='A'?l.a:l.b)===r.id?String(i+1).padStart(2,'0'):null)).filter(Boolean);if(indices.length){const x=g.left+r.x0*g.width,y=g.top+r.y0*g.height,txt=indices.join(' · ');ctx.font='bold 11px system-ui';const tw=ctx.measureText(txt).width+13;ctx.fillStyle=links.some(l=>l.id===activeLink&&(slot==='A'?l.a:l.b)===r.id)?'#f3e8a0':'#122837';ctx.fillRect(x+2,y+2,tw,19);ctx.fillStyle=links.some(l=>l.id===activeLink&&(slot==='A'?l.a:l.b)===r.id)?'#1b1b20':'#e4fffc';ctx.fillText(txt,x+8,y+15);}});if(draft)box(draft,true,true);
 if(scanProgress!=null&&source){const x=g.left+g.width*Math.max(0,Math.min(1,scanProgress));ctx.beginPath();ctx.moveTo(x,g.top);ctx.lineTo(x,g.top+g.height);ctx.strokeStyle='#e9f1bb';ctx.lineWidth=2;ctx.stroke();}
 ctx.textAlign='left';ctx.textBaseline='alphabetic';};
 P.useEffect(()=>{paint();const obs=typeof ResizeObserver==='function'?new ResizeObserver(()=>paint()):null;if(canvas.current)obs?.observe(canvas.current);return()=>obs?.disconnect()},[heat,source,regions,selected,draft,analysisState,links,activeLink,scanProgress,editable]);
 const point=e=>{const g=draw.current,c=canvas.current;if(!g||!c)return null;const b=c.getBoundingClientRect(),x=(e.clientX-b.left-g.left)/g.width,y=(e.clientY-b.top-g.top)/g.height;return{x:Math.max(0,Math.min(1,x)),y:Math.max(0,Math.min(1,y))}};
 const down=e=>{if(!source||!editable||e.button!==0)return;const p=point(e);if(!p)return;drag.current=p;e.currentTarget.setPointerCapture(e.pointerId);setDraft(null);};
 const move=e=>{if(!drag.current)return;const p=point(e);if(!p)return;setDraft({x0:Math.min(p.x,drag.current.x),x1:Math.max(p.x,drag.current.x),y0:Math.min(p.y,drag.current.y),y1:Math.max(p.y,drag.current.y)});};
 const up=e=>{if(!drag.current)return;const p=point(e);const start=drag.current;drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);setDraft(null);if(!p)return;
 const box={x0:Math.min(p.x,start.x),x1:Math.max(p.x,start.x),y0:Math.min(p.y,start.y),y1:Math.max(p.y,start.y)};
 if(box.x1-box.x0<.015||box.y1-box.y0<.025){const hit=[...regions].reverse().find(r=>p.x>=r.x0&&p.x<=r.x1&&p.y>=r.y0&&p.y<=r.y1);if(hit)onPick(hit.id);return;}onAdd({...box,feature});};
 return u.jsxs('div',{className:'f35634-spectrum',children:[u.jsx('canvas',{ref:canvas,'aria-label':`Donor ${slot} · logarithmic time-frequency spectrum; draw a rectangle with mouse or touch`,onPointerDown:down,onPointerMove:move,onPointerUp:up,onPointerCancel:()=>{drag.current=null;setDraft(null)},style:{touchAction:'none'},tabIndex:0}),u.jsxs('div',{className:'f35634-spectrum-caption',children:[u.jsx('span',{children:'VERTICAL: HIGH ↑ / LOW ↓ · HORIZONTAL: TIME →'}),u.jsx('span',{role:'status',children:analysisState})]})]});
}
function __F35635NumericMark({slot,source,feature,onAdd,disabled}){
 const [t0,setT0]=P.useState('0'),[t1,setT1]=P.useState('0.4'),[f0,setF0]=P.useState('140'),[f1,setF1]=P.useState('1600'),[err,setErr]=P.useState('');
 const create=()=>{if(!source||disabled)return;const first=Number(t0),last=Number(t1),low=Number(f0),high=Number(f1),nyquist=source.sampleRate*.46;
 if(!(first>=0&&last>first&&last<=source.duration&&low>=35&&high>low&&high<=nyquist)){setErr('Time or frequency is outside the selected audio.');return}
 const y=f=>1-Math.log(f/35)/Math.log(nyquist/35);setErr('');onAdd({x0:first/source.duration,x1:last/source.duration,y0:y(high),y1:y(low),feature});};
 return u.jsxs('details',{className:'f35635-numeric',children:[u.jsx('summary',{children:'Mark by numbers / keyboard'}),u.jsxs('div',{className:'f35635-numeric-fields',children:[u.jsx('label',{children:['From (s)',u.jsx('input',{type:'number',min:0,step:'.01',value:t0,onChange:e=>setT0(e.currentTarget.value)})]}),u.jsx('label',{children:['To (s)',u.jsx('input',{type:'number',min:0,step:'.01',value:t1,onChange:e=>setT1(e.currentTarget.value)})]}),u.jsx('label',{children:['Low (Hz)',u.jsx('input',{type:'number',min:35,step:1,value:f0,onChange:e=>setF0(e.currentTarget.value)})]}),u.jsx('label',{children:['High (Hz)',u.jsx('input',{type:'number',min:35,step:1,value:f1,onChange:e=>setF1(e.currentTarget.value)})]}),u.jsx('button',{type:'button',disabled:!source||disabled,onClick:create,children:'Add region'})]}),err?u.jsx('p',{role:'alert',children:err}):null]});
}
function __F35634DualWorkbench({activeSource,visible=true}){
 const [plan,setPlan]=P.useState(__f35634Load),[library,setLibrary]=P.useState([]),[fetchError,setFetchError]=P.useState(''),[notice,setNotice]=P.useState(''),[sources,setSources]=P.useState({A:null,B:null}),[loading,setLoading]=P.useState({A:false,B:false}),[feature,setFeature]=P.useState({A:'all',B:'all'}),[selected,setSelected]=P.useState({A:null,B:null});
 const [refreshLibrary,setRefreshLibrary]=P.useState(0),[saved,setSaved]=P.useState(true),[activeLink,setActiveLink]=P.useState(null),[audition,setAudition]=P.useState(null),[advanced,setAdvanced]=P.useState(false);
 const fileA=P.useRef(null),fileB=P.useRef(null),importRef=P.useRef(null),tokens=P.useRef({A:0,B:0}),intentEpoch=P.useRef(0),active=P.useRef(true),resolved=P.useRef({A:null,B:null}),sessionAudio=P.useRef(new Map()),preview=P.useRef({ctx:null,node:null,gain:null,token:0}),buffers=P.useRef(new WeakMap());
/* Added inside the existing DualWorkbench. Shared epoch protects render, import and activation. */
 const [body,setBody]=P.useState(null),[bodySettings,setBodySettings]=P.useState({duration:2,strength:.8}),[bodyJob,setBodyJob]=P.useState({busy:false,progress:0,label:''}),[audioSaved,setAudioSaved]=P.useState(''),[savedFigure,setSavedFigure]=P.useState(null),[savedWorkbench,setSavedWorkbench]=P.useState(null),[savedCombination,setSavedCombination]=P.useState(null);
 const [hydrated,setHydrated]=P.useState(false),[renderContext,setRenderContext]=P.useState(null);
 const [transferredKey,setTransferredKey]=P.useState(null),[actionFeedback,setActionFeedback]=P.useState(null),[carrierPreviewBusy,setCarrierPreviewBusy]=P.useState(false);
 const latest=P.useRef(null),persist=P.useRef(null),pendingCarrier=P.useRef(null),restoreEpoch=P.useRef(0);
 latest.current={plan,sources,body,bodySettings,renderContext};
 const autoHearKey=P.useRef(null),bodyEpoch=P.useRef(0),bodyCapture=P.useRef(null),sessionImport=P.useRef(null),bodyRestore=P.useRef(false),bodySession=P.useRef(null);
 let bodyKey='',bodyProblem='';try{bodyKey=__F35636DualDSP.key(plan,sources,bodySettings)}catch(e){bodyProblem=e.message}
 const bodyCurrent=!!body&&body.manifest.key===bodyKey,bodyRef=P.useRef(null);bodyRef.current=body;
 const transferReady=bodyCurrent&&transferredKey===bodyKey;const feedback=actionFeedback?.key===bodyKey?actionFeedback:null;
 const reportAction=(kind,text)=>{setActionFeedback({key:bodyKey,kind,text});setNotice(text);};
 P.useEffect(()=>{if(bodyCapture.current&&(bodyCapture.current.key!==bodyKey||!visible)){bodyEpoch.current++;bodyCapture.current=null;setBodyJob({busy:false,progress:0,label:''});}preview.current.token++;try{preview.current.node?.stop()}catch{}preview.current.node=null;setAudition(null);},[bodyKey,visible]);
 P.useEffect(()=>{
  let live=true;const ticket=++restoreEpoch.current,initial=latest.current,initialPlan=initial.plan,initialCarrier=__f35646CarrierStamp(pe.getState());
  const initialWorkbench=__F341Workbench.getSnapshot(),initialCombination=__F352Session.getSnapshot();
  bodyRestore.current=false;
  __F35636DualStore.read().then(value=>{
    if(!live||ticket!==restoreEpoch.current||!value||latest.current.plan!==initialPlan)return;
    const clean=__f35634Clean(value.plan),same=['A','B'].every(slot=>clean.sources[slot]?.revision===initialPlan.sources[slot]?.revision&&clean.sources[slot]?.id===initialPlan.sources[slot]?.id);
    if(!same)return;
    for(const slot of ['A','B'])if(clean.sources[slot]?.kind==='file'&&value.sources?.[slot]){sessionAudio.current.set(clean.sources[slot].id,value.sources[slot]);setSources(s=>({...s,[slot]:value.sources[slot]}));}
    if(value.settings&&latest.current.bodySettings===initial.bodySettings)setBodySettings(value.settings);if(value.result&&latest.current.body===initial.body)setBody(value.result);
    if(value.carrier){setSavedFigure(value.carrier);if(!__f35646CarrierStamp(pe.getState()).some((v,i)=>v!==initialCarrier[i]))pendingCarrier.current=value.carrier;}
    if(value.workbench){setSavedWorkbench(value.workbench);if(__F341Workbench.getSnapshot()===initialWorkbench)__F341Workbench.restore(value.workbench);}
    if(value.combination){setSavedCombination(value.combination);if(__F352Session.getSnapshot()===initialCombination)__F352Session.restore(value.combination);}
    setRenderContext(value.renderContext??null);setAudioSaved('Original audio and editable experiment restored.');
  }).catch(()=>{if(live)setAudioSaved('Audio storage unavailable · export a complete session to keep the recordings.');}).finally(()=>{
    if(live&&ticket===restoreEpoch.current){bodyRestore.current=true;setHydrated(true);}
  });return()=>{live=false;};
 },[]);
 const captureFigure=()=>{const s=pe.getState(),snapshot=s.createProjectSnapshot();return {...snapshot,spectralSnapshot:snapshot.spectralSnapshot.slice(),donorWorkbench:null};};
 const captureDraft=()=>{
  const v=latest.current;
  if(!['A','B'].some(slot=>v.sources[slot])||['A','B'].some(slot=>v.sources[slot]?v.plan.sources[slot]?.revision!==v.sources[slot].revision:!!v.plan.sources[slot]?.revision))return null;
  return {schema:'xensonar-dual-donor-session-v2',stateContractVersion:3,plan:v.plan,sources:v.sources,settings:v.bodySettings,result:v.body,
    carrier:pendingCarrier.current??captureFigure(),workbench:__F341Workbench.export(),combination:__F352Session.export(),renderContext:v.renderContext};
 };
 const experiment=()=>captureDraft();
 P.useEffect(()=>{
  if(!hydrated)return;let live=true;
  const saver=__f35646DraftSaver(captureDraft,__F35636DualStore.write,(ok)=>{if(live)setAudioSaved(ok?'Original recordings and current experiment saved in this browser.':'Audio storage unavailable · export a complete session.');});
  persist.current=saver;let stamp=__f35646CarrierStamp(pe.getState());
  const schedule=()=>saver.schedule(),unsubWorkbench=__F341Workbench.subscribe(schedule),unsubCombination=__F352Session.subscribe(schedule);
  const unsubCarrier=pe.subscribe(()=>{const next=__f35646CarrierStamp(pe.getState());if(next.some((v,i)=>v!==stamp[i])){stamp=next;pendingCarrier.current=null;schedule();}});
  const flush=()=>void saver.flush();window.addEventListener('pagehide',flush);schedule();
  return()=>{live=false;unsubWorkbench();unsubCombination();unsubCarrier();window.removeEventListener('pagehide',flush);if(persist.current===saver)persist.current=null;void saver.close();};
 },[hydrated]);
 P.useEffect(()=>{persist.current?.schedule();},[plan,sources,body,bodySettings,renderContext]);
 P.useEffect(()=>()=>{bodyEpoch.current++;},[]);
 const cancelBody=()=>{intentEpoch.current++;bodyCapture.current=null;autoHearKey.current=null;bodyEpoch.current++;setBodyJob({busy:false,progress:0,label:''});stopPreview();};
 const synthesize=async(recipe=plan,settings=bodySettings,hearWhenReady=false)=>{stopPreview();const ticket=++bodyEpoch.current,figure=pendingCarrier.current??captureFigure(),context={workbench:__F341Workbench.export(),combination:__F352Session.export()};let key='';try{key=__F35636DualDSP.key(recipe,sources,settings)}catch(e){setNotice(e.message);return;}
  autoHearKey.current=hearWhenReady?key:null;
  bodyCapture.current={key,ticket,recipe};setBodyJob({busy:true,progress:0,label:'Building shared sound body…'});setNotice('');
  try{const next=await __F35636DualWorker.render(recipe,sources,settings,{isCancelled:()=>!active.current||ticket!==bodyEpoch.current,onProgress:p=>{if(active.current&&ticket===bodyEpoch.current)setBodyJob({busy:true,progress:p,label:'Building shared sound body…'});}});
    next.revision=await __f35635PCMRevision(next);if(!active.current||ticket!==bodyEpoch.current||next.manifest.key!==key)return;
    setBody(next);setRenderContext(context);setSavedFigure(figure);setSavedWorkbench(context.workbench);setSavedCombination(context.combination);setNotice('Hybrid ready. Play it, keep it, or hear how your painted Carrier shapes it.');
  }catch(e){if(active.current&&ticket===bodyEpoch.current&&e.name!=='AbortError')setNotice('Synthesis: '+e.message);}
  finally{if(bodyCapture.current?.ticket===ticket)bodyCapture.current=null;
   if(active.current&&ticket===bodyEpoch.current)setBodyJob({busy:false,progress:1,label:''});}
 };
 const saveBody=async()=>{if(!bodyCurrent){setNotice('Render the current recipe before saving this donor.');return;}if(!body){setNotice('Create a hybrid before saving.');return;}const result=body,asset=__f35636Asset(result,plan.name),libraryEntry=__F35638DonorBridge.entryFromAsset(asset,plan.name);
  setNotice('Saving the completed hybrid to Donor Library…');try{await __DonorLibraryF36.donorLibrary.save(plan.name,'dual donor, articulation',{source:libraryEntry.source,selection:libraryEntry.selection,readMode:'hybrid',sourceAdapterId:'local-file'});
    window.dispatchEvent(new Event('xensonar:donor-library-changed'));setNotice('Hybrid saved as an independent donor in the Donor Library.');
  }catch(e){setNotice('Could not save in Donor Library: '+String(e.message||e).replace(/\.+$/,'')+'. You can still export the completed hybrid as WAV.');}
 };
 const useBody=async()=>{if(!bodyCurrent){setNotice('Render the current recipe before transferring this donor.');return;}if(!body)return;stopPreview();const result=body,epoch=++bodyEpoch.current,asset=__f35636Asset(result,plan.name),currentWorkbench=__F341Workbench.export(),currentCombination=__F352Session.export();let ticket=null,committed=false;
  bodyCapture.current={key:bodyKey,ticket:epoch,recipe:plan};
  setTransferredKey(null);setBodyJob({busy:true,progress:0,label:'Preparing donor for Forge…'});reportAction('info','Transferring hybrid to Forge…');
  try{for(const slot of ['A','B']){if(plan.sources[slot]?.kind==='active'&&sources[slot]){const id='file:captured:'+sources[slot].revision;sessionAudio.current.set(id,sources[slot]);change(p=>({...p,sources:{...p.sources,[slot]:{kind:'file',id,label:p.sources[slot].label+' (frozen)',revision:sources[slot].revision}}}));resolved.current[slot]=null;}}
    __F352Runtime.stop();ticket=Vt.beginReplacement(asset);const model=await kE(asset,()=>!active.current||bodyEpoch.current!==epoch||Vt.getSnapshot().generation!==ticket);
    if(!active.current||bodyEpoch.current!==epoch||Vt.getSnapshot().generation!==ticket)return;
    if(!Vt.commitExtraction(ticket,asset,model))throw Error('A newer donor action superseded this transfer.');committed=true;
    // Publish the newly prepared donor to the real Forge Material Intake owner as well.
    // The old implementation only updated the runtime/store; the old intake mask could
    // overwrite the transferred donor on the next ordinary Forge action.
    const forgeEntry=__F35638DonorBridge.entryFromAsset(asset,plan.name);
    const accepted=await new Promise(resolve=>{
      const request={entry:forgeEntry,handled:false,resolve:()=>resolve(true),reject:()=>resolve(false)};
      window.dispatchEvent(new CustomEvent('xensonar:forge:accept-prepared-donor',{detail:request}));
      if(!request.handled)resolve(false);
    });
    if(!active.current||epoch!==bodyEpoch.current||Vt.getSnapshot().generation!==ticket)return;
    if(!accepted){try{F6e('spectral-forge3',{...forgeEntry,repairResult:null,status:'Hybrid donor transferred to Forge.'});}catch{/* Opaque test contexts disallow browser storage; the live donor is still prepared. */}}
    pe.getState().setSpectralEmbodimentSourceAsset(asset);__F341Workbench.sourceChanged(asset);__F341Workbench.preset('gestalt-articulation');__F352Session.patch({enabled:false});
    if(currentWorkbench?.params?.gestaltMode==='articulation'){__F341Workbench.restore({...currentWorkbench,sourceKey:__F341Workbench.sourceKey(asset)});__F352Session.restore(currentCombination);}
    setSavedWorkbench(__F341Workbench.export());setSavedCombination(__F352Session.export());
    if(!Vt.selectDonor())throw Error('Hybrid donor could not be activated.');pe.getState().setCarrierDonorV2DonorUseMode('timbre_projection');
    setTransferredKey(bodyKey);
    reportAction('success','✓ Hybrid transferred to Forge · Ready in Audio Import Rack. Return to Forge to inspect it, or hear it in your Carrier here.');
  }catch(e){if(!committed&&ticket!=null&&Vt.getSnapshot().generation===ticket)Vt.failExtraction(ticket,e);if(active.current&&epoch===bodyEpoch.current&&e.name!=='AbortError')reportAction('error','Transfer failed: '+e.message);}
  finally{if(bodyCapture.current?.ticket===epoch)bodyCapture.current=null;if(active.current&&epoch===bodyEpoch.current)setBodyJob({busy:false,progress:1,label:''});}
 };
 const hearHybridInCarrier=async()=>{
  if(!transferReady){reportAction('info','Use Hybrid in Forge first, then preview it in the Carrier.');return;}
  const s=pe.getState(),grid=s.spectralData?.data;
  if(!grid?.some?.(v=>v>.0001)){reportAction('info','✓ Hybrid is in Forge. Your Carrier drawing is empty. Draw a figure in Spectral Forge before playing it.');return;}
  setCarrierPreviewBusy(true);reportAction('info','Playing the transferred hybrid through your painted Carrier…');
  try{await LU(s.spectralData,Zp(s.materialExport.bars,s.materialExport.bpm,s.materialExport.beatsPerBar),{loopPreview:s.materialExport.loopPreview});
    reportAction('success','▶ Carrier preview started with your transferred hybrid.');}
  catch(e){reportAction('error','Carrier preview failed: '+(e.message||e)+'. The hybrid remains available in Forge.');}
  finally{setCarrierPreviewBusy(false);}
 };
 const exportSession=async()=>{if(!sources.A||!sources.B){setNotice('Load both recordings before exporting a complete session.');return;}try{const value=experiment();__f35636Download(await __f35636SessionFile(value),plan.name+'.xds');setNotice('Complete session exported with both recordings, recipe and carrier figure.');}catch(e){setNotice('Session export: '+e.message);}};
 const importSession=async file=>{if(!file)return;cancelBody();const intent=++intentEpoch.current;tokens.current.A++;tokens.current.B++;setLoading({A:false,B:false});const epoch=++bodyEpoch.current;try{const value=await __f35636ReadSession(file);if(!active.current||epoch!==bodyEpoch.current||intent!==intentEpoch.current)return;
    for(const slot of ['A','B'])sessionAudio.current.set(value.plan.sources[slot].id,value.sources[slot]);resolved.current={A:null,B:null};tokens.current.A++;tokens.current.B++;
    pendingCarrier.current=value.carrier??null;setRenderContext(value.renderContext??null);if(value.workbench)__F341Workbench.restore(value.workbench);if(value.combination)__F352Session.restore(value.combination);
    setPlan(value.plan);setSources(value.sources);setBodySettings(value.settings??{duration:2,strength:.8});setBody(value.result);setSavedFigure(value.carrier??null);setSavedWorkbench(value.workbench??null);setSavedCombination(value.combination??null);setSelected({A:null,B:null});setActiveLink(null);
    setNotice('Complete session loaded. Use Restore saved figure when you want its exact carrier and tempo.');
  }catch(e){if(active.current&&epoch===bodyEpoch.current&&intent===intentEpoch.current)setNotice('Session import: '+e.message);}};
 const restoreFigure=()=>{if(!savedFigure)return;try{__F352Runtime.stop();__F341Workbench.withSnapshotRestore(()=>pe.getState().loadProjectSnapshot({...savedFigure,spectralSnapshot:new Float32Array(savedFigure.spectralSnapshot)}));if(savedWorkbench)__F341Workbench.restore(savedWorkbench);if(savedCombination)__F352Session.restore(savedCombination);setNotice('Saved carrier, bars, tempo and render settings restored.');}catch(e){setNotice('Figure restore: '+e.message);}};

 P.useEffect(()=>{active.current=true;return()=>{active.current=false;tokens.current.A++;tokens.current.B++;preview.current.token++;try{preview.current.node?.stop()}catch{}preview.current.node=null;void preview.current.ctx?.close().catch(()=>{});}},[]);
 P.useEffect(()=>{if(!visible){preview.current.token++;try{preview.current.node?.stop()}catch{}preview.current.node=null;setAudition(null)}},[visible]);
 const stopPreview=()=>{preview.current.token++;try{preview.current.node?.stop()}catch{}preview.current.node=null;setAudition(null);};
 const listen=async(slot,selectedOnly=false,provided=null)=>{if(!provided&&audition?.slot===slot&&audition?.selection===selectedOnly){stopPreview();return;}const source=slot==='result'?bodyRef.current:sources[slot];if(!source)return;const token=++preview.current.token;try{preview.current.node?.stop()}catch{}preview.current.node=null;setAudition(null);
 try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('AudioContext unavailable');let ctx=preview.current.ctx;if(!ctx||ctx.state==='closed'){ctx=new AC();preview.current.ctx=ctx;buffers.current=new WeakMap();}await ctx.resume();if(token!==preview.current.token)return;
 let audioBuffer=buffers.current.get(source);if(!audioBuffer){audioBuffer=ctx.createBuffer(1,source.samples.length,source.sampleRate);audioBuffer.copyToChannel(source.samples,0);buffers.current.set(source,audioBuffer)}
 const region=selectedOnly?plan.regions.find(r=>r.id===selected[slot]&&r.slot===slot):null;if(selectedOnly&&!region)throw new Error('Select a marked region first');
 const from=region?region.x0*source.duration:0,to=region?region.x1*source.duration:source.duration;if(to-from<.01)throw new Error('Selection too short');
 const node=ctx.createBufferSource(),gain=ctx.createGain();node.buffer=audioBuffer;gain.gain.value=.72;node.connect(gain);gain.connect(ctx.destination);node.onended=()=>{if(preview.current.node===node){preview.current.node=null;setAudition(null)}try{node.disconnect();gain.disconnect()}catch{}};preview.current.node=node;setAudition({slot,selection:selectedOnly});node.start(0,from,to-from);
 }catch(e){if(token===preview.current.token)setNotice('Audition: '+(e.message||e))}};

 P.useEffect(()=>{if(body&&bodyCurrent&&autoHearKey.current===bodyKey){autoHearKey.current=null;void listen('result',false,body);}},[body,bodyCurrent,bodyKey]);
 const autoReady=Boolean(sources.A&&sources.B&&['A','B'].every(slot=>plan.sources[slot]?.revision===sources[slot]?.revision));
 const autoBuild=()=>{if(!autoReady){setNotice('Load two recordings first.');return;}if(plan.links.length){void synthesize(plan,bodySettings,true);return;}let recipe;try{recipe=__f35637AutomaticRecipe(plan,sources);}catch(e){setNotice(e.message);return;}
 setPlan(recipe);setSelected({A:'auto-A',B:'auto-B'});setActiveLink(recipe.links[0].id);void synthesize(recipe,bodySettings,true);};
 const change=fn=>{intentEpoch.current++;setPlan(current=>{const next=__f35634Clean({...fn(current),updatedAt:Date.now()});return next});};
 P.useEffect(()=>{try{localStorage.setItem(__F35634Key,JSON.stringify(plan));setSaved(true)}catch{setSaved(false)}},[plan]);
 P.useEffect(()=>{let live=true;const read=()=>__DonorLibraryF36.donorLibrary.list().then(items=>{if(live){setLibrary(items);setFetchError('');setRefreshLibrary(n=>n+1)}}).catch(e=>{if(live)setFetchError('Library unavailable: '+(e.message||e))});void read();window.addEventListener('xensonar:donor-library-changed',read);return()=>{live=false;window.removeEventListener('xensonar:donor-library-changed',read)}},[]);
 P.useEffect(()=>{for(const slot of ['A','B']){
 const descriptor=plan.sources[slot],key=descriptor?(descriptor.kind+':'+descriptor.id+(descriptor.kind==='library'?':'+refreshLibrary:'')):'empty';
 if(resolved.current[slot]?.key===key&&(descriptor?.kind!=='active'||resolved.current[slot]?.source===activeSource))continue;
 resolved.current[slot]={key,source:activeSource};
 const ticket=++tokens.current[slot];
 if(descriptor?.kind!=='file')setSources(old=>({...old,[slot]:null}));
 if(!descriptor){setLoading(old=>({...old,[slot]:false}));continue}
 if(descriptor.kind==='file'){const remembered=sessionAudio.current.get(descriptor.id);if(remembered)setSources(old=>({...old,[slot]:remembered}));setLoading(old=>({...old,[slot]:false}));continue}
 setLoading(old=>({...old,[slot]:true}));
 (async()=>{try{let pcm;if(descriptor.kind==='active')pcm=__f35634CurrentPCM(activeSource);else{const entry=await __DonorLibraryF36.donorLibrary.load(descriptor.id);const a=entry.source?.sourceAsset;const region=entry.selection?.fineLoopRange;pcm=__f35634PCM(a,region?.startSec??0,region?.durationSec??60)}
 if(!active.current||tokens.current[slot]!==ticket)return;
 if(pcm){pcm.revision=await __f35635PCMRevision(pcm);if(!active.current||tokens.current[slot]!==ticket)return;}
 setSources(old=>({...old,[slot]:pcm}));
 if(pcm&&!plan.regions.some(r=>r.slot===slot)&&descriptor.revision!==pcm.revision)change(p=>({...p,sources:{...p.sources,[slot]:{...p.sources[slot],revision:pcm.revision}}}));
 if(!pcm)setNotice('The active Forge donor has not been extracted. Load a source first.');
 }catch(e){if(active.current&&tokens.current[slot]===ticket)setNotice('Donor '+slot+': '+(e.message||e))}
 finally{if(active.current&&tokens.current[slot]===ticket)setLoading(old=>({...old,[slot]:false}))}})();
 }},[plan.sources.A?.kind,plan.sources.A?.id,plan.sources.B?.kind,plan.sources.B?.id,activeSource,refreshLibrary]);
 const choose=(slot,kind,id,label)=>{stopPreview();tokens.current[slot]++;resolved.current[slot]=null;setSources(old=>({...old,[slot]:null}));setSelected(s=>({...s,[slot]:null}));setActiveLink(null);setNotice('');change(p=>{const removed=new Set(p.regions.filter(r=>r.slot===slot).map(r=>r.id));return {...p,sources:{...p.sources,[slot]:kind?{kind,id,label,revision:null}:null},regions:p.regions.filter(r=>r.slot!==slot),links:p.links.filter(l=>!removed.has(l.a)&&!removed.has(l.b))}})};
 const localFile=async(slot,file)=>{if(!file)return;intentEpoch.current++;const token=++tokens.current[slot];setLoading(x=>({...x,[slot]:true}));setNotice('');try{
 if(file.size>20000000)throw new Error('File exceeds 20 MB; please select a shorter recording.');
 const bytes=await file.arrayBuffer();const digest=await __f35635Digest(new Uint8Array(bytes));const decoder=new OfflineAudioContext(1,1,44100);const buffer=await decoder.decodeAudioData(bytes);const rate=buffer.sampleRate,channel=buffer.getChannelData(0),length=Math.min(channel.length,Math.floor(rate*60));const samples=new Float32Array(length);samples.set(channel.subarray(0,length));
 if(length<256)throw new Error('No readable sound samples.');
 if(!active.current||tokens.current[slot]!==token)return;
 const data={samples,sampleRate:rate,duration:length/rate,originalDuration:buffer.duration,truncated:buffer.duration>length/rate+0.01,revision:digest};
 setSources(s=>({...s,[slot]:data}));
 const audioId='file:'+digest;sessionAudio.current.set(audioId,data);stopPreview();
 change(p=>{const same=p.sources[slot]?.kind==='file'&&p.sources[slot]?.id===audioId;const legacy=!!(p.sources[slot]?.kind==='file'&&!p.sources[slot]?.revision&&p.regions.some(r=>r.slot===slot));const keep=same||legacy;return {...p,sources:{...p.sources,[slot]:{kind:'file',id:audioId,label:file.name,revision:legacy?'legacy:unverified':digest}},regions:keep?p.regions:p.regions.filter(r=>r.slot!==slot),links:keep?p.links:p.links.filter(l=>!p.regions.some(r=>r.slot===slot&&(r.id===l.a||r.id===l.b)))}});
 if(data.truncated)setNotice('Only the first 60 seconds are shown. Choose shorter source material to work beyond this window.');
 }catch(e){if(active.current&&tokens.current[slot]===token)setNotice('Cannot read file: '+(e.message||e))}finally{if(active.current&&tokens.current[slot]===token)setLoading(s=>({...s,[slot]:false}))}};
 const mismatched=slot=>Boolean(sources[slot]&&plan.regions.some(r=>r.slot===slot)&&plan.sources[slot]?.revision!==sources[slot]?.revision);
 const bindRevision=(slot,keep)=>{if(!sources[slot])return;stopPreview();change(p=>{const removed=new Set(keep?[]:p.regions.filter(r=>r.slot===slot).map(r=>r.id));return {...p,sources:{...p.sources,[slot]:{...p.sources[slot],revision:sources[slot].revision}},regions:p.regions.filter(r=>!removed.has(r.id)),links:p.links.filter(l=>!removed.has(l.a)&&!removed.has(l.b))}});setNotice(keep?'Marks deliberately reinterpreted against the current audio.':'Old marks cleared for the new audio.')};
 const add=(slot,box)=>{if(mismatched(slot)){setNotice('Confirm the new source revision before editing marks.');return;}
  const autoLink=plan.links.find(l=>['auto-cross-1','auto-pair-1'].includes(l.id)),autoId=autoLink?.[slot==='A'?'a':'b'];
  // First manual gesture refines the existing automatic Cross link instead of creating
  // a competing second sound layer or requiring the musician to reconnect regions.
  if(autoLink&&plan.regions.some(r=>r.id===autoId&&r.x0===0&&r.x1===1&&r.y0===0&&r.y1===1)&&plan.regions.filter(r=>r.slot===slot).length===1){
    change(p=>({...p,regions:p.regions.map(r=>r.id===autoId?{...r,...box}:r)}));setSelected(a=>({...a,[slot]:autoId}));setActiveLink(autoLink.id);setNotice('Automatic pair refined for Donor '+slot+'. The pair stays connected. Build the edited version when ready.');return;
  }
  if(plan.regions.filter(r=>r.slot===slot).length>=24){setNotice('24 marks per donor maximum. Remove a mark before adding another.');return;}const id=slot+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);change(p=>({...p,regions:[...p.regions,{id,slot,...box}]}));setSelected(a=>({...a,[slot]:id}));};
 const remove=id=>{change(p=>({...p,regions:p.regions.filter(r=>r.id!==id),links:p.links.filter(l=>l.a!==id&&l.b!==id)}));setSelected(s=>({A:s.A===id?null:s.A,B:s.B===id?null:s.B}));};
 const link=()=>{const a=selected.A,b=selected.B;if(!a||!b||mismatched('A')||mismatched('B'))return;const id='link-'+Date.now().toString(36);change(p=>({...p,remainder:p.remainder==='undecided'?'linked_only':p.remainder,links:[...p.links.filter(l=>l.a!==a||l.b!==b),{id,a,b,mode:p.operation,direction:p.operation==='imprint'?p.imprintDirection:null}]}));setActiveLink(id);setNotice('Regions connected. The main build action will use this relationship. Unlinked material remains excluded for now.');};
 const exportPlan=()=>{const blob=new Blob([JSON.stringify(plan,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='XenSonar_Dual_Donor_Blueprint.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const importPlan=async f=>{if(!f)return;cancelBody();const intent=++intentEpoch.current;tokens.current.A++;tokens.current.B++;setLoading({A:false,B:false});try{
 if(f.size>1000000)throw new Error('Blueprint is too large.');const parsed=JSON.parse(await f.text());if(!active.current||intent!==intentEpoch.current)return;
 if(!['xensonar-dual-donor-ui-v1','xensonar-dual-donor-ui-v2'].includes(parsed.schema))throw new Error('Not a supported Dual Donor blueprint.');
 const next=__f35634Clean(parsed);stopPreview();setSelected({A:null,B:null});setActiveLink(null);
 setSources(old=>({A:old.A?.revision===next.sources.A?.revision?old.A:sessionAudio.current.get(next.sources.A?.id)||null,B:old.B?.revision===next.sources.B?.revision?old.B:sessionAudio.current.get(next.sources.B?.id)||null}));resolved.current={A:null,B:null};setPlan(next);setNotice('Blueprint loaded. Audio already available in this session is reused; other sources can be reconnected.');
 }catch(e){if(active.current&&intent===intentEpoch.current)setNotice('Import failed: '+(e.message||e))}};
 const sourceCard=slot=>{const descriptor=plan.sources[slot],selectedRows=plan.regions.filter(r=>r.slot===slot),ready=!!sources[slot],stale=mismatched(slot),color=slot==='A'?'teal':'amber';return u.jsxs('article',{className:'f35634-source-card '+color,children:[
 u.jsxs('div',{className:'f35634-card-title',children:[u.jsxs('div',{children:[u.jsx('span',{className:'f35634-overline',children:'SOURCE '+slot}),u.jsx('h3',{children:slot==='A'?'Donor A · source identity':'Donor B · companion identity'})]}),u.jsx('span',{className:'f35634-state '+(ready?'ready':''),children:loading[slot]?'Loading…':ready?stale?'Source changed · marks need confirmation':'Spectrum ready':descriptor?.kind==='file'?'Reconnect audio':'Awaiting source'})]}),
 u.jsxs('div',{className:'f35634-source-picker',children:[u.jsx('select',{'aria-label':'Choose donor '+slot,value:descriptor?.kind==='library'?'lib:'+descriptor.id:descriptor?.kind==='active'?'active':descriptor?.kind==='file'?'file':'',onChange:e=>{const value=e.currentTarget.value;if(value==='active')choose(slot,'active',null,'Current Forge donor');else if(value.startsWith('lib:')){const id=value.slice(4),row=library.find(x=>x.id===id);choose(slot,'library',id,row?.name||'Saved donor')}else if(value==='file')slot==='A'?fileA.current?.click():fileB.current?.click();else choose(slot,null,null,'');},children:[u.jsx('option',{value:'',children:'Select sound source…'}),u.jsx('option',{value:'active',children:'Current Forge donor'}),descriptor?.kind==='file'?u.jsx('option',{value:'file',children:'Local file · '+descriptor.label}):null,...library.map(row=>u.jsx('option',{value:'lib:'+row.id,children:row.name+' · '+row.sourceLabel},row.id))]}),u.jsx('button',{type:'button',onClick:()=>slot==='A'?fileA.current?.click():fileB.current?.click(),children:'Import audio…'}),u.jsx('input',{ref:slot==='A'?fileA:fileB,type:'file',accept:'audio/*,.wav,.mp3,.ogg,.flac',hidden:true,onChange:e=>{const f=e.currentTarget.files?.[0];e.currentTarget.value='';void localFile(slot,f)}})]}),
 u.jsxs('div',{className:'f35634-source-caption',children:[u.jsx('strong',{children:descriptor?.label||'No donor selected'}),u.jsx('span',{children:ready?`${sources[slot].duration.toFixed(2)} s · ${sources[slot].sampleRate} Hz`:'Stored files from the Donor Library stay independent of active Forge audio.'})]}),
 u.jsxs('div',{className:'f35635-audition',children:[u.jsx('button',{type:'button',disabled:!ready,onClick:()=>void listen(slot,false),children:audition?.slot===slot&&!audition.selection?'■ Stop':'▶ Hear source'}),u.jsx('button',{type:'button',disabled:!ready||!selected[slot],onClick:()=>void listen(slot,true),children:audition?.slot===slot&&audition.selection?'■ Stop':'▶ Hear marked time'}),u.jsx('small',{children:'Dry source · time crop only; no spectral filtering'})]}),
 stale?u.jsxs('div',{className:'f35635-stale',role:'alert',children:[u.jsx('strong',{children:'Source audio changed. Old marks need explicit confirmation.'}),u.jsx('button',{type:'button',onClick:()=>bindRevision(slot,true),children:'Reinterpret old marks'}),u.jsx('button',{type:'button',onClick:()=>bindRevision(slot,false),children:'Clear old marks'})]}):null,
 u.jsxs('div',{className:'f35634-mark-controls',children:[u.jsx('span',{children:'Meaning'}),u.jsx('select',{'aria-label':'Feature of new '+slot+' area',value:feature[slot],onChange:e=>{const value=e.currentTarget.value;setFeature(s=>({...s,[slot]:value}))},children:[['all','Full sound character'],['resonance','Resonance / tonal body'],['texture','Texture / noise'],['motion','Temporal movement']].map(([v,label])=>u.jsx('option',{value:v,children:label},v))}),u.jsx('small',{title:'These labels express artistic intent. They do not claim automatic extraction of a sound feature.',children:'Select a time-frequency area · feature intent'})]}),
 u.jsx(__F35634Spectrum,{slot,source:sources[slot],regions:selectedRows,selected:selected[slot],feature:feature[slot],links:plan.links,activeLink,editable:true,scanProgress:bodyJob.busy?bodyJob.progress:null,onPick:id=>{setActiveLink(null);setSelected(s=>({...s,[slot]:id}))},onAdd:box=>add(slot,box)}),
 u.jsx(__F35635NumericMark,{slot,source:sources[slot],feature:feature[slot],onAdd:box=>add(slot,box),disabled:stale}),
 u.jsxs('div',{className:'f35634-region-heading',children:[u.jsx('strong',{children:'Marked regions'}),u.jsx('span',{children:selectedRows.length+' / 24'})]}),
 selectedRows.length?u.jsx('div',{className:'f35634-region-list',children:selectedRows.map((r,i)=>u.jsxs('div',{className:'f35634-region-row'+(selected[slot]===r.id?' chosen':''),children:[u.jsx('button',{type:'button','aria-pressed':selected[slot]===r.id,onClick:()=>setSelected(s=>({...s,[slot]:r.id})),children:(i+1)+'. '+__f35634RegionText(r,sources[slot])+(plan.links.some(l=>(slot==='A'?l.a:l.b)===r.id)?'  ↗ '+plan.links.map((l,j)=>(slot==='A'?l.a:l.b)===r.id?String(j+1).padStart(2,'0'):'').filter(Boolean).join(', '):'')}),u.jsx('select',{'aria-label':'Region '+(i+1)+' characteristic donor '+slot,value:r.feature,onChange:e=>{const value=e.currentTarget.value;change(p=>({...p,regions:p.regions.map(x=>x.id===r.id?{...x,feature:value}:x)}))},children:[['all','Full'],['resonance','Resonance'],['texture','Texture'],['motion','Motion']].map(([id,name])=>u.jsx('option',{value:id,children:name},id))}),u.jsx('button',{type:'button','aria-label':'Remove region '+(i+1)+' on donor '+slot,onClick:()=>remove(r.id),children:'×'})]},r.id))}):u.jsx('p',{className:'f35634-empty-regions',children:'No areas yet. Draw over the real spectrum to define source material.'}),
 ]});};
 const countA=plan.regions.filter(r=>r.slot==='A').length,countB=plan.regions.filter(r=>r.slot==='B').length,linked=plan.links.length;
 return u.jsxs('section',{id:'f35634-dual-panel',role:'tabpanel',className:'f35634-stage '+(advanced?'f35637-advanced':'f35637-easy'),style:{display:visible?'block':'none'},'data-f35634-dual-workshop':'true','aria-label':'Dual Donor Assembly',children:[
 u.jsxs('div',{className:'f35634-top',children:[u.jsxs('div',{children:[u.jsx('div',{className:'f35634-overline',children:'EXPERIMENTAL · DUAL DONOR + ARTICULATION'}),u.jsx('h2',{children:'Two sources. A new sound body.'}),u.jsx('p',{children:'Choose independent donors, select time-frequency material, then connect matching areas. Your marks define a shared spectral body. Hear the result, then explicitly give it to the carrier.'})]}),u.jsxs('div',{className:'f35635-steps',children:[u.jsx('span',{children:'01  Hear sources'}),u.jsx('span',{children:'02  Mark regions'}),u.jsx('span',{children:'03  Compose relationship'}),u.jsx('span',{children:'04  Build & hear Hybrid'})]})]}),
 u.jsxs('div',{className:'f35634-namebar',children:[u.jsxs('label',{children:['Hybrid name',u.jsx('input',{'aria-label':'Name hybrid donor',value:plan.name,maxLength:100,onChange:e=>{const value=e.currentTarget.value;change(p=>({...p,name:value}))}})]}),u.jsx('span',{className:'f35634-autosave',role:'status',children:saved?'Blueprint autosaved in this browser':'Browser storage unavailable · export JSON to keep your work'}),u.jsx('button',{type:'button',onClick:exportPlan,children:'Export blueprint ↓'}),u.jsx('button',{type:'button',onClick:()=>importRef.current?.click(),children:'Import blueprint ↑'}),u.jsx('input',{ref:importRef,type:'file',accept:'.json,application/json',hidden:true,onChange:e=>{const f=e.currentTarget.files?.[0];e.currentTarget.value='';void importPlan(f)}})]}),
 notice?u.jsx('p',{className:'f35634-notice',role:'status',children:notice}):null,fetchError?u.jsx('p',{className:'f35634-notice f35637-library-warning',role:'status',children:fetchError}):null,
 u.jsxs('div',{className:'f35634-source-grid f35642-source-grid',children:[sourceCard('A'),u.jsxs('div',{className:'f35642-region-bridge','aria-label':'Connect marked regions from both donors',children:[
    u.jsx('div',{className:'f35642-bridge-heading',children:'↔  CONNECT REGIONS'}),
    u.jsx('p',{className:'f35642-bridge-guide',role:'status',children:!selected.A?'① Select or draw a region in Donor A’s spectrum.':!selected.B?'② A is selected. Choose a region in Donor B.':'③ Both regions are selected. How should they interact?'}),
    u.jsxs('div',{className:'f35642-region-pair',children:[u.jsx('span',{children:'A · '+(selected.A?__f35635FeatureName[plan.regions.find(r=>r.id===selected.A)?.feature]||'Selected':'Select')}),u.jsx('span',{children:'↔'}),u.jsx('span',{children:'B · '+(selected.B?__f35635FeatureName[plan.regions.find(r=>r.id===selected.B)?.feature]||'Selected':'Select')})]}),
    u.jsxs('label',{children:['Method for new connection',u.jsx('select',{'aria-label':'Synthesis method for Donor A and B',value:plan.operation,onChange:e=>{const operation=e.currentTarget.value;change(p=>({...p,operation}))},children:[u.jsx('option',{value:'cross',children:'Cross'}),u.jsx('option',{value:'imprint',children:'Imprint'}),u.jsx('option',{value:'interlock',children:'Interlock'})]})]}),
    u.jsx('p',{className:'f35643-method-explain','aria-live':'polite',children:plan.operation==='cross'?'Cross: A and B form a shared spectral body.':plan.operation==='imprint'?'Imprint: One sound reshapes the other’s structure.':'Interlock: A and B reshape each other reciprocally.'}),
    plan.operation==='imprint'?u.jsxs('label',{children:['Imprint direction',u.jsx('select',{'aria-label':'Imprint direction',value:plan.imprintDirection,onChange:e=>{const imprintDirection=e.currentTarget.value;change(p=>({...p,imprintDirection}))},children:[u.jsx('option',{value:'A_to_B',children:'A → B'}),u.jsx('option',{value:'B_to_A',children:'B → A'})]})]}):null,
    u.jsxs('label',{children:['Synthesis variant for the entire hybrid',u.jsx('select',{'aria-label':'Shared synthesis variant',value:plan.revision,onChange:e=>{const revision=e.currentTarget.value;change(p=>({...p,revision}))},children:[u.jsx('option',{value:'original',children:'1'}),u.jsx('option',{value:'revised',children:'2'})]})]}),
    u.jsx('small',{className:'f35643-scope-note',children:'All linked regions currently share variant 1 or 2. Cross, Imprint and Interlock may differ for individual connections.'}),
    u.jsx('button',{type:'button',className:'f35642-connect',disabled:!selected.A||!selected.B||mismatched('A')||mismatched('B')||plan.links.length>=12,onClick:link,children:selected.A&&selected.B?'✦ Connect These Regions':'Select A + B'}),
    u.jsx('small',{children:'Each connection receives a matching number in both spectra. Then rebuild the hybrid.'})
  ]}),sourceCard('B')]}),
 u.jsxs('section',{className:'f35637-quick', 'aria-label':'Automatic donor relationship',children:[
   u.jsxs('div',{className:'f35637-quick-heading',children:[u.jsxs('div',{children:[u.jsx('div',{className:'f35634-overline',children:plan.links.length?'YOUR SOUND CROSSING':'AUTOMATIC SOUND CROSSING'}),u.jsx('h3',{children:plan.links.length?'Your regions → one new donor':'Two sounds → one new donor'}),u.jsx('p',{children:plan.links.length?'Your marked regions and relationships are preserved. The button builds precisely this recipe.':'Load A and B. Automatic assembly uses the selected method and direction. Existing marks are preserved.'})]}),u.jsxs('div',{className:'f35637-quick-cta',children:[u.jsx('button',{type:'button',className:'f35637-primary',disabled:!autoReady||bodyJob.busy,onClick:autoBuild,children:bodyJob.busy?'Building…':plan.links.length?'✦ Build & Hear My Regions':'✦ Auto-'+(plan.operation==='imprint'?'Imprint':plan.operation==='interlock'?'Interlock':'Cross')+' & Hear'}),bodyJob.busy?u.jsx('button',{type:'button',onClick:cancelBody,children:'Cancel'}):null]})]}),
   u.jsxs('div',{className:'f35637-visual',role:'img','aria-label':'Both original spectra are analysed at equal relative time positions and joined into one hybrid, not two audio streams',children:[u.jsxs('div',{className:'f35637-visual-donor',children:[u.jsx('strong',{children:'A'}),u.jsx('span',{children:sources.A?'Ready · '+sources.A.duration.toFixed(1)+' s':'Load sound A'})]}),u.jsx('div',{className:'f35637-visual-bridge',children:[u.jsx('span',{className:'f35637-bridge-line a'}),u.jsx('div',{className:'f35637-bridge-core',children:bodyJob.busy?Math.round(bodyJob.progress*100)+'%':bodyCurrent?'✓':'↔'}),u.jsx('span',{className:'f35637-bridge-line b'})]}),u.jsxs('div',{className:'f35637-visual-donor b',children:[u.jsx('strong',{children:'B'}),u.jsx('span',{children:sources.B?'Ready · '+sources.B.duration.toFixed(1)+' s':'Load sound B'})]}),u.jsxs('div',{className:'f35637-visual-result',children:[u.jsx('strong',{children:'HYBRID'}),u.jsx('span',{children:bodyJob.busy?'Building '+__f35645Methods(bodyCapture.current?.recipe||plan)+' · '+((bodyCapture.current?.recipe?.revision||plan.revision)==='original'?'1':'2')+'…':body?'Hybrid · '+__f35645Methods(body.manifest?.recipe)+' · '+(body.manifest?.recipe?.revision==='original'?'1':'2')+' · '+body.duration.toFixed(1)+' s'+(bodyCurrent?'':' · previous render'):'Waiting for two sounds'})]})]}),
   bodyJob.busy?u.jsx('progress',{max:1,value:bodyJob.progress,'aria-label':'Automatic spectrum synthesis progress'}):null,
   body?u.jsxs('div',{className:'f35637-ready-actions',children:[u.jsx('button',{type:'button',className:'f35637-primary',onClick:()=>void listen('result'),children:audition?.slot==='result'?'■ Stop Hybrid':'▶ Hear Hybrid Again'}),u.jsx('button',{type:'button','data-dual-action':'use-in-forge',onClick:()=>void useBody(),disabled:bodyJob.busy||!bodyCurrent,title:!bodyCurrent?'Rebuild the current recipe before transferring.':'Transfer the current hybrid to Forge',children:'Use Hybrid in Forge'}),u.jsx('button',{type:'button','data-dual-action':'hear-in-carrier',onClick:()=>void hearHybridInCarrier(),disabled:bodyJob.busy||carrierPreviewBusy||!transferReady,title:!transferReady?'Use Hybrid in Forge first.':'Preview your painted Carrier with the transferred hybrid',children:'▶ Hear Hybrid in Carrier'}),u.jsx('button',{type:'button',onClick:()=>void saveBody(),disabled:bodyJob.busy||!bodyCurrent,title:!bodyCurrent?'Rebuild the current recipe before saving.':'Save current hybrid',children:'Save Hybrid to Donor Library'}),u.jsx('button',{type:'button',onClick:()=>__f35636Download(__f35636Wav(body),plan.name+'.wav'),children:'Export WAV'})]}):null,
   body&&transferReady?u.jsx('p',{className:'f35637-transfer-confirm','data-dual-transfer-ready':'true',role:'status',children:'✓ Hybrid in Forge · Available in Audio Import Rack'}):null,
   body&&feedback?u.jsx('p',{className:'f35637-action-feedback '+feedback.kind,role:'status','aria-live':'polite',children:feedback.text}):null,
   body&&!bodyCurrent?u.jsx('p',{className:'f35637-last',children:'The recipe or source has changed. Your LAST completed hybrid is still available above; create again for the new version.'}):null,
   advanced&&plan.links.some(l=>['auto-cross-1','auto-pair-1'].includes(l.id))?u.jsx('p',{className:'f35637-edit-tip',children:'Refine the automatic pair: draw a rectangle in either spectrum. Your first edit replaces its full-range selection; the connection remains in place.'}):null,
   u.jsx('button',{type:'button',className:'f35637-advanced-toggle','aria-expanded':advanced,onClick:()=>setAdvanced(v=>!v),children:advanced?'− Hide detailed editing':'＋ Refine regions, links & synthesis settings'}),
   u.jsx('small',{className:'f35637-explain',children:['auto-cross-1','auto-pair-1'].includes(body?.manifest?.recipe?.links?.[0]?.id)?'Automatic recipe: '+__f35645Methods(body.manifest.recipe)+'. Both analyses feed a single resynthesized spectral body. The scan line tracks actual relative processing time.':'The moving scan line shows relative source time during actual calculation; it is not a claim of exact one-to-one partial matching.'})
 ]}),
 u.jsxs('section',{className:'f35634-compose',"aria-label":'Relationship editor',children:[
  u.jsxs('div',{className:'f35635-compose-summary',children:[u.jsx('span',{className:'f35634-overline',children:'CONNECTIONS · EDIT'}),u.jsx('h3',{children:'Connected regions'}),u.jsx('p',{children:'Matching numbers in both spectra identify connected regions.'})]}),
  u.jsx('p',{className:'f35642-relationship-hint',children:'Create connections between the spectrograms above. Edit or remove existing connections here.'}),
  u.jsx('div',{className:'f35634-links',children:plan.links.length?plan.links.map((l,i)=>{const a=plan.regions.find(r=>r.id===l.a),b=plan.regions.find(r=>r.id===l.b);return u.jsxs('div',{className:'f35634-link'+(activeLink===l.id?' active':''),children:[u.jsx('button',{type:'button',className:'f35635-link-focus','aria-pressed':activeLink===l.id,onClick:()=>{setActiveLink(l.id);setSelected({A:l.a,B:l.b});change(p=>({...p,operation:l.mode,imprintDirection:l.direction||p.imprintDirection}))},children:String(i+1).padStart(2,'0')+'  A '+(__f35635FeatureName[a?.feature]||'?')+(l.mode==='imprint'?(l.direction==='A_to_B'?' → ':l.direction==='B_to_A'?' ← ':' ? '):' ↔ ')+'B '+(__f35635FeatureName[b?.feature]||'?')}),u.jsx('select',{'aria-label':'Connection '+(i+1)+' synthesis rule',value:l.mode,onChange:e=>{const value=e.currentTarget.value;change(p=>({...p,links:p.links.map(x=>x.id===l.id?{...x,mode:value,direction:value==='imprint'?x.direction:null}:x)}))},children:[u.jsx('option',{value:'cross',children:'Cross'}),u.jsx('option',{value:'imprint',children:'Imprint'}),u.jsx('option',{value:'interlock',children:'Interlock'})]}),l.mode==='imprint'?u.jsx('select',{'aria-label':'Connection '+(i+1)+' imprint direction',value:l.direction||'',onChange:e=>{const value=e.currentTarget.value;change(p=>({...p,links:p.links.map(x=>x.id===l.id?{...x,direction:value}:x)}))},children:[u.jsx('option',{value:'',children:'Set direction!'}),u.jsx('option',{value:'A_to_B',children:'A → B'}),u.jsx('option',{value:'B_to_A',children:'B → A'})]}):null,u.jsx('button',{type:'button','aria-label':'Remove connection '+(i+1),onClick:()=>{setActiveLink(null);change(p=>({...p,links:p.links.filter(x=>x.id!==l.id)}))},children:'×'})]},l.id)}):u.jsx('p',{children:'No connections yet. Mark a region in A and B, then use the bridge between them.'})}),
  u.jsxs('div',{className:'f35635-remainder',children:[u.jsx('label',{children:'Unlinked sound material'}),u.jsx('select',{'aria-label':'Treatment of unlinked material',value:plan.remainder,onChange:e=>{const value=e.currentTarget.value;change(p=>({...p,remainder:value}))},children:[u.jsx('option',{value:'undecided',children:'Undecided'}),u.jsx('option',{value:'linked_only',children:'Use only linked properties'}),u.jsx('option',{value:'keep_A',children:'Keep unlinked properties from A'}),u.jsx('option',{value:'keep_B',children:'Keep unlinked properties from B'})]}),u.jsx('small',{children:'Unlinked frequency bands can stay from A or B; linked windows align by relative progress.'})]})
 ]}),
 u.jsx(__F35636Output,{body,current:bodyCurrent,problem:bodyProblem,settings:bodySettings,onSettings:setBodySettings,job:bodyJob,onRender:()=>void synthesize(),onCancel:cancelBody,onListen:()=>void listen('result'),audition,onSave:()=>void saveBody(),onUse:()=>void useBody(),onHearCarrier:()=>void hearHybridInCarrier(),transferReady:transferReady,actionFeedback:feedback,carrierPreviewBusy:carrierPreviewBusy,onExport:()=>bodyRef.current&&__f35636Download(__f35636Wav(bodyRef.current),plan.name+'.wav'),onExportSession:()=>void exportSession(),onImportSession:importSession,sessionImport,savedFigure,onRestore:restoreFigure,audioSaved}),
 u.jsx('p',{className:'f35634-footnote',children:'Source audition is dry. Hybrid audition plays the prepared result. Transfer to the carrier is explicit; complete sessions include the original recordings.'})
 ]});
}
function __F341WorkbenchDialog({onClose:onClose}){const hybridState=P.useSyncExternalStore(__F352Runtime.subscribe,__F352Runtime.getSnapshot,__F352Runtime.getSnapshot),session=P.useSyncExternalStore(__F352Session.subscribe,__F352Session.getSnapshot,__F352Session.getSnapshot),runtime=cU(),wb=P.useSyncExternalStore(__F341Workbench.subscribe,__F341Workbench.getSnapshot,__F341Workbench.getSnapshot),config=wb.config,model=runtime.model,materialMode=config.params.materialPilot,hybrid=materialMode?model?.hybrid?.sourceGrains??model?.hybrid:model?.hybrid,source=runtime.source,body=materialMode?hybrid?.workbenchAnalysis??model?.bodyV3:model?.bodyV3,[layer,setLayer]=P.useState("dynamics"),[range,setRange]=P.useState(null),[point,setPoint]=P.useState(null),[viewport,setViewport]=P.useState([0,1]),[heat,setHeat]=P.useState(null),[busy,setBusy]=P.useState(!1),[error,setError]=P.useState(""),[showOutput,setShowOutput]=P.useState(!0),[presetName,setPresetName]=P.useState(""),[previewPending,setPreviewPending]=P.useState(!1),[showLibrary,setShowLibrary]=P.useState(()=>"undefined"==typeof window||"function"!=typeof window.matchMedia||window.matchMedia("(min-width:1250px)").matches),[showRack,setShowRack]=P.useState(!1),[dualMode,setDualMode]=P.useState(!1),[dualSeen,setDualSeen]=P.useState(!1),canvas=P.useRef(null),outputCanvas=P.useRef(null),drag=P.useRef(null),dialog=P.useRef(null),[selectedRun,setSelectedRun]=P.useState(null),[linkMode,setLinkMode]=P.useState("carrier"),operation=P.useRef(0),keyboardAnchor=P.useRef(null),activity=P.useRef(null),activityDisposed=P.useRef(!1);P.useEffect(()=>{const node=dialog.current,header=node?.querySelector(".f341-header");if(!node||!header)return;const measure=()=>node.style.setProperty("--f351-header-height",Math.ceil(header.getBoundingClientRect().height)+"px");measure();const observer="undefined"!=typeof ResizeObserver?new ResizeObserver(measure):null;return observer?.observe(header),window.addEventListener("resize",measure),()=>{observer?.disconnect(),window.removeEventListener("resize",measure)}},[]);const carrierState=P.useSyncExternalStore(pe.subscribe,pe.getState,pe.getState),selection=P.useMemo(()=>source&&hybrid?__f341Selection(source,model):null,[source,model,!1,materialMode]),analysed=selection&&null!=point?point*selection.duration-selection.eventStart:null,frame=null!=analysed&&analysed>=0&&analysed<=selection.eventDuration?body.frames[Math.max(0,Math.min(body.frames.length-1,Math.round(analysed/Math.max(1e-9,body.frameHopSec))))]:null,metrics=__F341Workbench.metrics(frame),hybridActive=materialMode,artifact=hybridState.result,output=hybridActive?artifact?{...artifact,mantle:artifact.spectrum}:null:__F341Workbench.getOutput(),currentKey=hybridActive?__F352Runtime.identity():"function"==typeof __F33CurrentKey?__F33CurrentKey():null,outputCurrent=!!output&&output.key===currentKey&&(hybridActive||output.configKey===__F341Workbench.fingerprint()),materialSignature=JSON.stringify([config.params.materialPilot,config.params.planning,config.params.referenceStart,config.params.referenceEnd,config.params.engine,config.params.windowMode,config.params.windowId,config.params.materialPolicy,config.params.selectionTolerance,config.regions]),validation=P.useMemo(()=>{try{return{model:hybrid?__F341Workbench.materialModel(hybrid,config):null,error:""}}catch(e){return{model:null,error:e.message}}},[hybrid,materialSignature]),effectiveModel=validation.model,duration=Zp(carrierState.materialExport.bars,carrierState.materialExport.bpm,carrierState.materialExport.beatsPerBar),planRate=outputCurrent?output.buffer.sampleRate:48e3,planned=__F341UseMaterialPlan({sourceMode:!1,effectiveModel:effectiveModel,carrierState:carrierState,duration:duration,planRate:planRate,config:config}),materialError=validation.error||planned.error,runs=outputCurrent&&output.material?.runs?output.material.runs:planned.runs,rawIndex=(null==selectedRun||runs[selectedRun],hybrid?.sourceIndex),choiceIndex=effectiveModel?.sourceIndex??rawIndex,frameIndex=frame?body.frames.indexOf(frame):-1;P.useEffect(()=>{const prior=document.activeElement,overflow=document.body.style.overflow;return document.body.style.overflow="hidden",dialog.current?.focus(),()=>{document.body.style.overflow=overflow,prior?.focus?.()}},[]),P.useEffect(()=>{setRange(null),setPoint(null),setSelectedRun(null),setViewport([0,1])},[source,!1,materialMode]),P.useEffect(()=>{setError("")},[config]);const workbenchActivity=__f35624WorkbenchActivity({operation:operation,activity:activity,disposed:activityDisposed,setBusy:setBusy,setPreviewPending:setPreviewPending,setError:setError});P.useEffect(()=>(activityDisposed.current=!1,()=>workbenchActivity.dispose()),[]),__F341UseWorkshopVisuals({selection:selection,source:source,setHeat:setHeat,setError:setError,body:body,canvas:canvas,effectiveModel:effectiveModel,hybrid:hybrid,heat:heat,config:config,layer:layer,range:range,point:point,viewport:viewport,materialError:materialError,linkMode:linkMode,runs:runs,selectedRun:selectedRun,showOutput:showOutput,outputCanvas:outputCanvas,output:output});const{down:down,move:move,up:up}=__f35623WorkbenchCanvasInteractions({drag:drag,keyboardAnchor:keyboardAnchor,setLayer:setLayer,setLinkMode:setLinkMode,setPoint:setPoint,setRange:setRange,selection:selection,hybrid:hybrid,runs:runs,setSelectedRun:setSelectedRun}),activate=()=>{if(materialError)throw Error(materialError);if(!hybrid)throw Error("Please extract donor material first.");if(Vt.stop(),xt.stop(),!Vt.selectDonor())throw Error("Could not activate donor.");pe.getState().setCarrierDonorV2DonorUseMode("timbre_projection")},close=()=>{workbenchActivity.cancel(!!activity.current||["analyzing","rendering","playing"].includes(Vt.getSnapshot().phase)),onClose()},stopPreview=()=>workbenchActivity.cancel(!0),preview=async()=>{const id=workbenchActivity.begin("preview");if(null!==id)try{if(await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0))),!workbenchActivity.isCurrent(id))return;if(activate(),!workbenchActivity.isCurrent(id))return;const s=pe.getState();await LU(s.spectralData,Zp(s.materialExport.bars,s.materialExport.bpm,s.materialExport.beatsPerBar),{loopPreview:s.materialExport.loopPreview})}catch(e){workbenchActivity.error(id,e)}finally{workbenchActivity.finish(id)}},action=(text,click,disabled=!1,extra={})=>u.jsx("button",{type:"button",onClick:click,disabled:disabled,...extra,children:text}),roleNames={include:"Include",exclude:"Exclude",texture:"Emphasize Noise",tonal:"Tonales betonen"},availableRoles=materialMode?{include:roleNames.include,exclude:roleNames.exclude}:roleNames,keydown=__f35623WorkbenchKeyboard({canvas:canvas,selection:selection,point:point,viewport:viewport,setPoint:setPoint,setLinkMode:setLinkMode,keyboardAnchor:keyboardAnchor,setRange:setRange,close:close,dialog:dialog,runtime:runtime,preview:preview,stopPreview:stopPreview,previewPending:previewPending}),controls=__f35631WorkbenchControlDescriptors({hybrid:hybrid,sourceMode:!1}),analysisText={material:"Turquoise shows allowed source windows. Green: similar within the chosen tolerance. Blue: allowed in varying motion. Pink: similarity criterion not met; this is not a judgment of musical usefulness. Turquoise dots: explicitly allowed. Manual Include regions replace window selection.",noise:"Pink shows analyzed aperiodicity for each time window. It indicates noise; inharmonic resonances may also contribute. Markings are your interpretation.",pitch:"Green shows pitch-estimation confidence. The line in the spectrogram is the measured fundamental frequency.",resonance:"Yellow shows measured spectral peaks. Their positions remain visible independently of manual resonance correction.",dynamics:"Blue shows relative analysis level. Level compensation controls local balancing during transfer.",attack:"Violet: brief observed level increase, possible attack. Gold: gradual onset. Gray: no onset claimed. A selection boundary with ongoing sound is not treated as an attack. "+__F347OnsetText(body)};return u.jsx("div",{className:"f341-backdrop",onPointerDown:e=>e.stopPropagation(),children:u.jsxs("section",{ref:dialog,tabIndex:-1,role:"dialog","aria-modal":"true","aria-label":"Donor Workshop",className:"f341-dialog f349-dialog f350-dialog f351-dialog "+(showLibrary||showRack?"f349-docked":"f349-expanded")+(dualMode?" f35634-dual-mode":""),onKeyDown:keydown,onKeyUp:e=>{"Shift"===e.key&&(keyboardAnchor.current=null)},children:[u.jsxs("header",{className:"f341-header",children:[u.jsxs("div",{children:[u.jsx("div",{className:"f341-eyebrow",children:"SPECTRAL FORGE / DONOR WORKSHOP"}),u.jsx("h2",{children:dualMode?"Dual Donor Assembly · Sound Crossing":config.params.gestaltPilot?"Sound Form · Carrier & Donor":materialMode?"Sound Material · Carrier & Donor":"Donor Workshop · Spectral Listening Modes"}),u.jsx("p",{children:dualMode?"Two independent donors · spectral regions · one prepared donor · carrier-led articulation":source?source.fileName+" · marked selection "+source.importStartSec.toFixed(2)+"–"+(source.importStartSec+source.importDurationSec).toFixed(2)+" s":"Extract a donor selection first."})]}),u.jsxs("div",{className:"f341-toolbar",children:[u.jsxs("div",{className:"f351-header-controls",children:[action(showLibrary?"01 · Library −":"01 · Library +",()=>setShowLibrary(v=>!v),!1,{"data-f349-toggle-library":"true","aria-pressed":showLibrary,"aria-expanded":showLibrary,"aria-controls":showLibrary?"f351-library-panel":void 0}),dualMode?null:action(showRack?"02 · Cecilia −":"02 · Cecilia +",()=>setShowRack(v=>!v),!1,{"data-f351-toggle-rack":"true","aria-label":showRack?"Close Cecilia combination":"Open Cecilia combination","aria-pressed":showRack,"aria-expanded":showRack,"aria-controls":showRack?"f351-combination-panel":void 0})]}),action("Apply & Return to Forge",()=>{try{activate(),workbenchActivity.cancel(!1),onClose()}catch(e){setError(e.message)}},!hybrid||busy||!!materialError,{"data-f342-apply":"true",className:"f341-primary"}),action("Return to Forge · Keep Changes",close,!1,{"aria-label":"Close Donor Workshop"})]}),u.jsxs("nav",{className:"f35634-tabs",role:"tablist","aria-label":"Donor Workshop areas",children:[u.jsx("button",{type:"button",role:"tab","aria-selected":!dualMode,onClick:()=>setDualMode(!1),"aria-controls":"f35634-single-panel",children:"Single Donor · Transfer"}),u.jsx("button",{type:"button",role:"tab","aria-selected":dualMode,onClick:()=>{setDualSeen(!0),setDualMode(!0)},"aria-controls":"f35634-dual-panel","data-f35634-open":"true",children:"Dual Donor · Assembly · Experimental"})]})]}),__f35622WorkbenchDock({showLibrary:showLibrary,showRack:showRack,setShowLibrary:setShowLibrary,setShowRack:setShowRack,action:action}),u.jsxs("div",{id:"f35634-single-panel",role:"tabpanel","aria-label":"Single Donor transfer",className:"f349-workspace",children:[showRack?u.jsx("p",{className:"f351-main-hint",role:"status",children:hybridActive?"Carrier: time, voices, pitch and dynamics · Donor: original material · Cecilia: additional timbre. Playback and export refer to the same result.":"Edit carrier and donor. Cecilia can be connected as a second sound source on the left."}):null,error||materialError||runtime.error?u.jsx("p",{role:"alert",className:"f341-error",children:materialError||error||runtime.error}):null,wb.notice?u.jsx("p",{role:"status",className:"f342-notice",children:wb.notice}):null,"analyzing"===runtime.phase?u.jsxs("p",{role:"status",className:"f342-notice",children:["Analyze New Region · Valid Donor Preserved. ",action("Cancel reanalysis",stopPreview)]}):null,selection?u.jsxs(u.Fragment,{children:[u.jsxs("div",{className:"f341-toolbar f350-transport",children:[u.jsxs("label",{children:[u.jsx("span",{children:"Saved Recipe"}),u.jsx("select",{"aria-label":"Donor Workshop Preset",value:config.preset,onChange:e=>{"__save_recipe__"!==e.currentTarget.value?__F341Workbench.preset(e.currentTarget.value):document.querySelector("[aria-label='Recipe name']")?.focus()},children:[...["Listening modes · interpretations","Spectral Listening Modes","Custom Recipes"].map((label,group)=>u.jsx("optgroup",{label:label,children:__f35645PresetItems(__F341Workbench.getPresets(),group).map(item=>u.jsx("option",{value:item.id,children:item.name},item.id)).concat(2!==group||__F341Workbench.getPresets().some(item=>item.id.startsWith("user-"))?[]:[u.jsx("option",{value:"__save_recipe__",children:"Save custom recipe above …"})])},label)),"custom"===config.preset?u.jsx("option",{value:"custom",children:"Custom"}):null]})]}),action("rendering"===runtime.phase?"Cancel Rendering":"playing"===runtime.phase?"Stop":previewPending?"Cancel Preparation":hybridActive&&session.recipe.enabled&&session.recipe.amount>0?"Listen to Combination":"Listen to Figure",()=>previewPending||"rendering"===runtime.phase||"playing"===runtime.phase?stopPreview():void preview(),busy&&!previewPending&&"rendering"!==runtime.phase,{"data-f341-preview":"true",className:"f341-primary"}),action("Listen to Original",()=>{(async()=>{const id=workbenchActivity.begin("original");if(null!==id)try{await S5e("original",()=>{})}catch(e){workbenchActivity.error(id,e)}finally{workbenchActivity.finish(id)}})()},busy),action(showOutput?"Hide Rendered Result":"Show Rendered Result",()=>setShowOutput(!showOutput),!output?.mantle),action("Base Recipe · Clear Markings",()=>{__F341Workbench.reset(),setError("")},busy),action("Back to Workshop",()=>__F341Workbench.undo(),!wb.canUndo||busy),action("Workshop Forward",()=>__F341Workbench.redo(),!wb.canRedo||busy)]}),config.params.gestaltPilot?u.jsx(__F356GestaltPanel,{range:range,selection:selection,material:outputCurrent?output.material:planned}):materialMode&&u.jsx(__F356MaterialPanel,{range:range,selection:selection,material:outputCurrent?output.material:null}),config.params.signaturePilot&&u.jsxs("div",{className:"f347-control-group",children:[u.jsx("h4",{children:"Donor signature · experiment"}),u.jsx("div",{className:"f341-controls",children:[u.jsx(__F341Control,controls.find(c=>"sourceSpectrum"===c.name)),u.jsx(__F341Control,controls.find(c=>"sourceMotion"===c.name)),u.jsx(__F341Control,controls.find(c=>"spectralCohesion"===c.name))]})]}),(()=>{const progress=__f344PreviewProgress(runtime,previewPending,planned,effectiveModel,body);return progress?u.jsxs("div",{className:"f344-inline-progress",role:"status","aria-live":"polite",children:[null!==progress.progress?u.jsx("progress",{max:1,value:progress.progress,"aria-label":"Donor render progress"}):null,u.jsx("span",{children:progress.text})]}):null})(),u.jsx(__F353RecipePanel,{}),u.jsx("p",{className:"f341-muted",children:"The selected listening mode transfers donor sound to the painted figure. Adjust its sound parameters here."}),!1,!1,!1,u.jsxs("div",{className:"f347-section-heading",children:[u.jsx("span",{children:"Source"}),u.jsx("h3",{children:"Donor Sound States & Material Selection"})]}),__f35623WorkbenchAnalysisView({action:action,analysisText:analysisText,availableRoles:availableRoles,body:body,busy:busy,canvas:canvas,choiceIndex:choiceIndex,config:config,down:down,drag:drag,frame:frame,frameIndex:frameIndex,hybrid:hybrid,layer:layer,mark:role=>{if(range)try{__F341Workbench.addRegion(...range,role),setError("")}catch(e){setError(e.message)}},materialMode:materialMode,metrics:metrics,move:move,point:point,range:range,reanalyse:async()=>{if(!range||!source||!selection)return;const id=workbenchActivity.begin("reanalyse");if(null===id)return;let ticket=null,committed=!1;try{Vt.stop(),xt.stop();const start=range[0]*selection.duration,duration=(range[1]-range[0])*selection.duration;if(duration<.025||duration>8)throw Error("Please mark a region between 25 ms and 8 seconds.");const next={...source,importStartSec:source.importStartSec+start,importDurationSec:duration};ticket=Vt.beginReplacement(next);const prepared=await kE(next,()=>!workbenchActivity.isCurrent(id)||Vt.getSnapshot().generation!==ticket);if(!workbenchActivity.isCurrent(id)||Vt.getSnapshot().generation!==ticket)return;Vt.commitExtraction(ticket,next,prepared)?(committed=!0,pe.getState().setSpectralEmbodimentSourceAsset(next)):workbenchActivity.error(id,new Error("Reanalysis discarded. The previous donor is preserved."))}catch(e){!committed&&workbenchActivity.isCurrent(id)&&null!=ticket&&Vt.getSnapshot().generation===ticket&&Vt.failExtraction(ticket,e),workbenchActivity.error(id,e)}finally{workbenchActivity.finish(id)}},selection:selection,setLayer:setLayer,setViewport:setViewport,source:source,sourceMode:!1,up:up}),!1,showOutput&&output?.mantle?u.jsxs("div",{className:"f341-output",children:[u.jsx("h3",{children:outputCurrent?hybridActive&&"SOURCE_PLUS_SYNTH"===artifact?.manifest.audioOrigin?"Donor + Cecilia · current result":"Donor · current result":"Previous result · rerender recipe"}),u.jsx("p",{children:"This spectrum was generated from the actual rendered audio."}),u.jsx("canvas",{ref:outputCanvas,"data-output":"true","aria-label":"Spectrum of the rendered carrier-donor result"})]}):null,config.regions.length?u.jsxs("div",{className:"f341-regions",children:[u.jsx("strong",{children:"Manual edits"}),...config.regions.map(r=>u.jsxs("span",{className:"f341-region",children:[roleNames[r.role]+" · "+(r.start*selection.duration).toFixed(2)+"–"+(r.end*selection.duration).toFixed(2)+" s",action("×",()=>__F341Workbench.removeRegion(r.id),!1,{"aria-label":"Remove marking"})]},r.id))]}):null,__f35631WorkbenchExpertControls({materialMode:materialMode,sourceMode:!1,config:config,controls:controls,runs:runs,outputCurrent:outputCurrent,output:output,planned:planned}),__f35631WorkbenchABCompare({action:action,wb:wb,busy:busy}),__f35631WorkbenchPresetSave({presetName:presetName,setPresetName:setPresetName,setError:setError,config:config,materialError:materialError,action:action}),u.jsx("p",{className:"f341-muted",children:"Parameter presets contain no markings or window IDs from other sources. Donor variants apply to the same selection. Browser storage belongs to the origin of this opened file; a different location or browser may show a separate collection."})]}):u.jsx("p",{className:"f341-empty",children:"Mark a donor in Audio Import and choose “Extract Timbre”. Its selection and analysis will be shown here in detail."}),u.jsx(__F347Memory,{})]}),dualMode||dualSeen?u.jsx(__F35634DualWorkbench,{activeSource:source,visible:dualMode}):null]})})}
function __F341WorkbenchEntry(){
 const state=cU(),[open,setOpen]=P.useState(false),wb=P.useSyncExternalStore(__F341Workbench.subscribe,__F341Workbench.getSnapshot,__F341Workbench.getSnapshot);
 P.useSyncExternalStore(pe.subscribe,pe.getState,pe.getState);
 const session=P.useSyncExternalStore(__F352Session.subscribe,__F352Session.getSnapshot,__F352Session.getSnapshot),result=P.useSyncExternalStore(__F352Runtime.subscribe,__F352Runtime.getSnapshot,__F352Runtime.getSnapshot);
 const output=__F341Workbench.getOutput(),current=(wb.config.params.materialPilot)?!!__F352Runtime.current():!!output&&output.key===__F33CurrentKey()&&output.configKey===__F341Workbench.fingerprint(),item=__F341Workbench.getPresets().find(p=>p.id===wb.config.preset);
 return u.jsxs('div',{className:'f347-workshop-entry','data-f347-donor-area':'true',children:[
  u.jsx('p',{className:'f342-forge-status',role:'status',children:state.model?(state.selected?"Donor Active for Figure":"Donor Loaded")+' · '+(session.recipe.enabled&&(wb.config.params.materialPilot)?'Donor + Cecilia':item?.name??"Custom")+' · '+(current?"rendered result up to date":"Settings rendered on playback"):"Open Donor Library or extract a selection in Sound Material"}),
  u.jsx('button',{type:'button',className:'f341-entry',onClick:()=>{__ForgeListeningMode.choose('donor',{prepare:false});__F341Workbench.preset('material-flow-original');setOpen(true)},'data-f341-workbench-open':'true',children:"🧩 Open Donor Workshop · Analysis, Advanced Settings & Custom Recipes"}),
  open?u.jsx(__F341WorkbenchDialog,{onClose:()=>setOpen(false)}):null
 ]});
}
function QGe(props){
 return props.layout==='picker'?u.jsx(__F341BaseHearing,props):u.jsxs(u.Fragment,{children:[u.jsx(__F341BaseHearing,props),props.donorSelected?u.jsx(__F341WorkbenchEntry,{}):null]});
}
return Object.freeze({"OWe":OWe,"jWe":jWe,"WWe":WWe});
})()