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

 /* ---------- G · Gaia: wave terrain, read as a stream of band-limited wavetables ---------- */
 function prepareTerrain(input,relief){
  if(!input||!(input.width>0)||!(input.height>1)||input.data?.length!==input.width*input.height)throw Error('Gaia needs a drawing as terrain');
  // Columns are averaged to at most 1024: the orbit reads neighbourhoods, not single pixels.
  const fx=Math.max(1,Math.ceil(input.width/1024)),w=Math.floor(input.width/fx),h=input.height;let a=new Float32Array(w*h),max=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0;for(let k=0;k<fx;k++)s+=input.data[y*input.width+x*fx+k]||0;a[y*w+x]=s/fx}
  const sigma=.6+relief*5.4,radius=Math.ceil(sigma*2.5),kernel=new Float32Array(radius*2+1);let ks=0;
  for(let i=-radius;i<=radius;i++)ks+=kernel[i+radius]=Math.exp(-.5*(i/sigma)**2);for(let i=0;i<kernel.length;i++)kernel[i]/=ks;
  let b=new Float32Array(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0;for(let k=-radius;k<=radius;k++){let xx=x+k;xx=xx<0?xx+w:xx>=w?xx-w:xx;s+=a[y*w+xx]*kernel[k+radius]}b[y*w+x]=s} // time wraps: the figure is a loop
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0;for(let k=-radius;k<=radius;k++){const yy=y+k;if(yy>=0&&yy<h)s+=b[yy*w+x]*kernel[k+radius]}a[y*w+x]=s;if(s>max)max=s}
  if(max<=1e-9)throw Error('The drawing is empty: Gaia has no terrain to read');
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

 /* ---------- H · Hildegard: the figure's own intervals as overtone spectrum ---------- */
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

 /* ---------- I · Isolde: a spectrum that is the same at every scale ---------- */
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
