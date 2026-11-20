/* DUAL-ALIGN-01 · Dual Donor variant 3 ("aligned"): one shared sound body, built from an explicit recipe.
 * What variants 1/2 approximated, done as a source–filter morph:
 *  - each donor region is analysed once (Hann STFT at the donor's own rate, true instantaneous frequency,
 *    true spectral envelope via iterated cepstral smoothing, f0 + voicing, band energy, onsets);
 *  - linked windows are aligned by their events (DTW over loudness/onset/brightness), not by linear progress;
 *  - envelope (resonance) and fine structure (texture, incl. pitch) are separated: fine structure is
 *    re-pitched onto one shared f0, formants stay where they are -> no doubled partial series, no moving formants;
 *  - motion = loudness contour, timing and pitch contour of a region;
 *  - phase comes from the dominant contributor (never an average of two foreign phases), peak-locked,
 *    reset at aligned onsets; the remainder plays the same moment of its donor and fills band edges seamlessly.
 * Self-contained: the factory is stringified into the offline worker. All audible bins derive from marked PCM. */
(()=>{/* scope of the lab room payload: only the registration below leaves it */
function __f35636DualDSPFactoryAligned(){
  const version='dual-donor-aligned-body-f3.57.1',TAU=Math.PI*2,SR=48000,N=2048,HOP=256,BINS=N/2+1;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),wrap=x=>x-TAU*Math.round(x/TAU),lerp=(a,b,t)=>a+(b-a)*t;
  const freq=(y,sr)=>35*Math.pow(sr*.46/35,1-y);
  const plans=new Map(),hanns=new Map();
  function plan(n){let p=plans.get(n);if(p)return p;const bits=Math.round(Math.log2(n)),rev=new Uint32Array(n),cos=new Float64Array(n/2),sin=new Float64Array(n/2);
    for(let i=0;i<n;i++){let r=0,x=i;for(let b=0;b<bits;b++){r=(r<<1)|(x&1);x>>=1;}rev[i]=r;}
    for(let i=0;i<n/2;i++){cos[i]=Math.cos(TAU*i/n);sin[i]=Math.sin(TAU*i/n);}p={rev,cos,sin};plans.set(n,p);return p;}
  function fft(re,im,inverse=false){const n=re.length,{rev,cos,sin}=plan(n);
    for(let i=0;i<n;i++){const j=rev[i];if(j>i){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t;}}
    for(let size=2;size<=n;size<<=1){const half=size>>1,step=n/size;
      for(let s=0;s<n;s+=size)for(let j=0,t=0;j<half;j++,t+=step){const wr=cos[t],wi=inverse?sin[t]:-sin[t],a=s+j,b=a+half,tr=re[b]*wr-im[b]*wi,ti=re[b]*wi+im[b]*wr;re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;}}
    if(inverse){const k=1/n;for(let i=0;i<n;i++){re[i]*=k;im[i]*=k;}}}
  function hann(n){let w=hanns.get(n);if(!w){w=Float64Array.from({length:n},(_,j)=>.5-.5*Math.cos(TAU*(j+.5)/n));hanns.set(n,w);}return w;}
  /* ---------- validation (same contract and messages as variants 1/2, plus morph settings) ---------- */
  function validate(plan,sources,settings={}){
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
    const duration=Number(settings.duration??Math.min(8,Math.max(...links.flatMap(l=>[l.A,l.B].map(r=>(r.x1-r.x0)*sources[r.slot].duration)))));
    if(!Number.isFinite(duration)||duration<.1||duration>8)throw Error('Choose a hybrid duration between 0.1 and 8 seconds.');
    const strength=clamp(Number(settings.strength??.8),0,1);if(!Number.isFinite(strength))throw Error('Invalid relationship strength.');
    const balance=clamp(Number(settings.balance??.5),0,1),balanceEnd=clamp(Number(settings.balanceEnd??settings.balance??.5),0,1);
    if(!Number.isFinite(balance)||!Number.isFinite(balanceEnd))throw Error('Invalid morph balance.');
    const alignment=settings.alignment==='linear'?'linear':'events';
    return {links,sampleRate:SR,duration,strength,balance,balanceEnd,alignment,remainder:plan.remainder};
  }
  function key(plan,sources,settings={}){const j=validate(plan,sources,settings);
    return JSON.stringify({version,sources:{A:sources.A.revision,B:sources.B.revision},regions:plan.regions,links:plan.links,remainder:plan.remainder,
      settings:{duration:settings.duration??null,strength:j.strength,balance:j.balance,balanceEnd:j.balanceEnd,alignment:j.alignment}});}
  /* ---------- analysis: one pass per distinct region ---------- */
  function cepSmooth(src,dst,n,q,re,im){const half=n/2;
    for(let k=0;k<=half;k++){re[k]=src[k];im[k]=0;}for(let k=1;k<half;k++){re[n-k]=src[k];im[n-k]=0;}
    fft(re,im);for(let i=q+1;i<n-q;i++){re[i]=0;im[i]=0;}fft(re,im,true);for(let k=0;k<=half;k++)dst[k]=re[k];}
  async function analyse(source,region,maxFrames,check){
    const sr=source.sampleRate,n=clamp(2**Math.round(Math.log2(N*sr/SR)),512,8192),bins=n/2+1,w=hann(n),pcm=source.samples,lag=n/8;
    let wsum=0;for(let j=0;j<n;j++)wsum+=w[j];const norm=2/wsum;
    const first=Math.floor(region.x0*pcm.length),last=Math.max(first+1,Math.min(pcm.length-1,Math.ceil(region.x1*pcm.length)-1));
    const K=clamp(Math.round((last-first)/(n/8))+1,2,Math.max(2,maxFrames));
    const logmag=new Float32Array(K*bins),env=new Float32Array(K*bins),ifreq=new Float32Array(K*bins),phase=new Float32Array(K*bins);
    const f0=new Float32Array(K),voicing=new Float32Array(K),logE=new Float32Array(K),onset=new Float32Array(K),centroid=new Float32Array(K);
    const low=freq(region.y1,sr),high=freq(region.y0,sr),k0=Math.max(1,Math.ceil(low*n/sr)),k1=Math.min(bins-2,Math.floor(high*n/sr));
    const re=new Float64Array(n),im=new Float64Array(n),cr=new Float64Array(n),ci=new Float64Array(n),L=new Float64Array(bins),E=new Float64Array(bins),T=new Float64Array(bins);
    const wacf=new Float64Array(n);{for(let j=0;j<n;j++){re[j]=w[j];im[j]=0;}fft(re,im);for(let j=0;j<n;j++){re[j]=re[j]*re[j]+im[j]*im[j];im[j]=0;}fft(re,im,true);for(let j=0;j<n;j++)wacf[j]=re[j]/re[0];}
    const tauMin=Math.max(2,Math.floor(sr/1400)),tauMax=Math.min(Math.floor(.45*n),Math.ceil(sr/55));
    const at=i=>i>=first&&i<=last?pcm[i]:0;let peakL=-Infinity;
    for(let f=0;f<K;f++){
      if(f%16===0){check();await new Promise(r=>setTimeout(r,0));}
      const c=Math.round(first+(last-first)*(K===1?.5:f/(K-1)))-n/2;
      for(let j=0;j<n;j++){re[j]=at(c+j)*w[j];im[j]=at(c+j+lag)*w[j];}
      fft(re,im);
      let energy=0,count=0,cen=0,cw=0;const o=f*bins;
      for(let k=0;k<bins;k++){const m=(n-k)%n,xr=.5*(re[k]+re[m]),xi=.5*(im[k]-im[m]),yr=.5*(im[k]+im[m]),yi=.5*(re[m]-re[k]);
        const mag=Math.hypot(xr,xi)*norm,p1=Math.atan2(xi,xr),p2=Math.atan2(yi,yr);
        L[k]=Math.log(mag+1e-9);logmag[o+k]=L[k];phase[o+k]=wrap(p1+Math.PI*k);/* window-centre phase: comparable across FFT sizes */ifreq[o+k]=(k+wrap(p2-p1-TAU*k*lag/n)*n/(TAU*lag))*sr/n;
        if(k>=k0&&k<=k1){energy+=mag*mag;count++;cen+=mag*k;cw+=mag;}}
      // f0 and voicing: normalised autocorrelation of the power spectrum, divided by the window own ACF.
      for(let k=0;k<bins;k++){const v=Math.exp(2*L[k]);cr[k]=v;ci[k]=0;if(k>0&&k<n/2){cr[n-k]=v;ci[n-k]=0;}}fft(cr,ci,true);
      let best=0,bestTau=0;const r0=cr[0]||1e-20;for(let t=tauMin;t<=tauMax;t++){const v=cr[t]/r0/Math.max(.05,wacf[t]);if(v>best){best=v;bestTau=t;}}
      if(bestTau<=tauMin)best=Math.min(best,.3);/* monotone decay from lag 0 = coloured noise, not a pitch */
      let tau=bestTau;if(best>.3)for(let t=tauMin+1;t<bestTau;t++){const v=cr[t]/r0/Math.max(.05,wacf[t]),vp=cr[t-1]/r0/Math.max(.05,wacf[t-1]),vn=cr[t+1]/r0/Math.max(.05,wacf[t+1]);if(v>=.9*best&&v>=vp&&v>=vn){tau=t;break;}}
      let period=tau;if(tau>tauMin&&tau<tauMax){const a=cr[tau-1]/wacf[tau-1],b=cr[tau]/wacf[tau],d=cr[tau+1]/wacf[tau+1],den=a-2*b+d;if(den<0)period=tau+clamp(.5*(a-d)/den,-.5,.5);}
      voicing[f]=clamp(best,0,1);f0[f]=best>.55&&tau?sr/period:0;
      // True envelope: iterated cepstral smoothing; lifter order follows the pitch (half a period) or 1.25 ms.
      const q=clamp(Math.round(f0[f]?.5*sr/f0[f]:sr/800),8,Math.round(sr*.006));
      cepSmooth(L,E,n,q,cr,ci);for(let it=0;it<2;it++){for(let k=0;k<bins;k++)T[k]=Math.max(L[k],E[k]);cepSmooth(T,E,n,q,cr,ci);}
      for(let k=0;k<bins;k++)env[o+k]=E[k];
      logE[f]=.5*Math.log(energy/Math.max(1,count)+1e-18);centroid[f]=cw>0?Math.log(Math.max(1,cen/cw)):0;
      for(let k=k0;k<=k1;k++)if(L[k]>peakL)peakL=L[k];
    }
    // Band flux above a floor 60 dB under the region peak, averaged over the bins that sound: decaying tails and numerical silence
    // do not count as attacks, and a sparse spectrum (few partials) attacks as clearly as a dense one.
    {const floor=peakL-7;for(let f=1;f<K;f++){let rise=0,active=0;const o=f*bins,p=o-bins;for(let k=k0;k<=k1;k++){const x=Math.max(floor,logmag[o+k]),y=Math.max(floor,logmag[p+k]);if(x>floor||y>floor)active++;rise+=Math.max(0,x-y);}onset[f]=rise/Math.max(8,active);}}
    // Stable pitch track: 5-frame median over voiced frames; region decision by voiced fraction.
    const voicedIdx=[];for(let f=0;f<K;f++)if(f0[f]>0)voicedIdx.push(f);
    const sm=Float32Array.from(f0);for(const f of voicedIdx){const near=[];for(let d=-2;d<=2;d++){const g=f+d;if(g>=0&&g<K&&f0[g]>0)near.push(f0[g]);}near.sort((a,b)=>a-b);sm[f]=near[near.length>>1];}
    let topE=-Infinity;for(let f=0;f<K;f++)topE=Math.max(topE,logE[f]);const audible=f=>logE[f]>topE-4.6;let nAud=0;for(let f=0;f<K;f++)if(audible(f))nAud++;
    const sorted=voicedIdx.map(f=>sm[f]).sort((a,b)=>a-b),median=sorted.length?sorted[sorted.length>>1]:0,voiced=voicedIdx.filter(audible).length>=Math.max(1,nAud*.45);
    if(voiced){let last=median;for(let f=0;f<K;f++){if(sm[f]>0&&Math.abs(Math.log(sm[f]/median))<1.2)last=sm[f];sm[f]=last;}}
    let meanE=0,wE=0;for(let f=0;f<K;f++){const x=Math.exp(2*logE[f]);meanE+=x;wE+=1;}meanE=.5*Math.log(meanE/Math.max(1,wE)+1e-18);
    // Onsets: local maxima of the band flux above an adaptive threshold, at least 40 ms apart; not where the window runs past
    // the region end (truncation leakage looks like an attack).
    const spacing=(last-first)/sr/Math.max(1,K-1),onsets=[];{const v=Array.from(onset).sort((a,b)=>a-b),med=v[v.length>>1]||0,mad=(v.map(x=>Math.abs(x-med)).sort((a,b)=>a-b)[v.length>>1])||0;
      const thr=Math.max(med+4*mad,.35);for(let f=1;f<K-1;f++)if(first+(last-first)*f/(K-1)+n/4<=last&&onset[f]>thr&&onset[f]>=onset[f-1]&&onset[f]>onset[f+1]&&(!onsets.length||(f-onsets[onsets.length-1])*spacing>.04))onsets.push(f);}
    return {sr,n,bins,K,logmag,env,ifreq,phase,f0:sm,voicing,voiced,f0Median:median,logE,topE,meanE,onset,onsets,centroid,low,high,spacing};
  }
  /* ---------- alignment: DTW over loudness, onset strength and brightness ---------- */
  // Both sequences share one scale: level relative to its own peak (60 dB range), onset strength relative to its strongest, brightness jointly z-scored.
  function features(a,b,M){
    const pick=(an,arr,i,useMax)=>{const lo=i*(an.K-1)/M,hi=(i+1)*(an.K-1)/M;if(!useMax||hi-lo<1){const x=clamp((lo+hi)/2,0,an.K-1),f=Math.floor(x),g=Math.min(an.K-1,f+1);return lerp(arr[f],arr[g],x-f);}
      let m=-Infinity;for(let f=Math.floor(lo);f<=Math.ceil(hi)&&f<an.K;f++)m=Math.max(m,arr[f]);return m;};
    const one=an=>{let top=1e-9;for(const x of an.onset)top=Math.max(top,x);
      return Array.from({length:M},(_,i)=>[(Math.max(an.topE-7,pick(an,an.logE,i,false))-an.topE)/7*2,pick(an,an.onset,i,true)/top*2,pick(an,an.centroid,i,false)]);};
    const fa=one(a),fb=one(b),all=[...fa,...fb].map(v=>v[2]),m=all.reduce((x,y)=>x+y,0)/all.length,sd=Math.sqrt(all.reduce((x,y)=>x+(y-m)**2,0)/all.length)||1;
    for(const v of [...fa,...fb])v[2]=(v[2]-m)/sd*.5;return [fa,fb];}
  function align(a,b,mode){const G=512;
    if(mode==='linear'){const t=Float64Array.from({length:G},(_,i)=>i/(G-1));return {pa:t,pb:t.slice(),matched:0};}
    const M=128,[fa,fb]=features(a,b,M),W=Math.round(M*.6),D=new Float64Array(M*M).fill(Infinity),from=new Uint8Array(M*M);
    const cost=(i,j)=>{let s=0;for(let d=0;d<3;d++)s+=(fa[i][d]-fb[j][d])**2;return Math.sqrt(s);};let mean=0;for(let i=0;i<M;i++)mean+=cost(i,i);const pen=.25*mean/M;
    for(let i=0;i<M;i++)for(let j=Math.max(0,i-W);j<=Math.min(M-1,i+W);j++){const c=cost(i,j);if(!i&&!j){D[0]=c;continue;}
      let best=Infinity,dir=0;if(i&&j&&D[(i-1)*M+j-1]<best){best=D[(i-1)*M+j-1];dir=0;}if(i&&D[(i-1)*M+j]+pen<best){best=D[(i-1)*M+j]+pen;dir=1;}if(j&&D[i*M+j-1]+pen<best){best=D[i*M+j-1]+pen;dir=2;}
      D[i*M+j]=c+best;from[i*M+j]=dir;}
    const path=[];let i=M-1,j=M-1;while(i>0||j>0){path.push([i,j]);const d=from[i*M+j];if(d===0){i--;j--;}else if(d===1)i--;else j--;}path.push([0,0]);path.reverse();
    const P=path.length,smooth=(k)=>{const out=new Float64Array(P);for(let p=0;p<P;p++){let s=0,c=0;for(let d=-3;d<=3;d++){const q=clamp(p+d,0,P-1);s+=path[q][k];c++;}out[p]=s/c/(M-1);}out[0]=0;out[P-1]=1;return out;};
    const sa=smooth(0),sb=smooth(1),pa=new Float64Array(G),pb=new Float64Array(G);
    for(let g=0;g<G;g++){const x=g/(G-1)*(P-1),p=Math.floor(x),q=Math.min(P-1,p+1);pa[g]=lerp(sa[p],sa[q],x-p);pb[g]=lerp(sb[p],sb[q],x-p);}
    for(let g=1;g<G;g++){pa[g]=Math.max(pa[g],pa[g-1]);pb[g]=Math.max(pb[g],pb[g-1]);}
    let matched=0;for(const fa0 of a.onsets){const t=fa0/(a.K-1);let g=0;while(g<G-1&&pa[g]<t)g++;const tb=pb[g];if(b.onsets.some(fb0=>Math.abs(fb0/(b.K-1)-tb)*(b.K-1)*b.spacing<.06))matched++;}
    return {pa,pb,matched};}
  // Output progress u -> (positions in A and B). The master clock is a weighted mix of both timings (beta = share of B).
  function timeline(al,beta){const G=al.pa.length,m=new Float64Array(G);for(let g=0;g<G;g++)m[g]=lerp(al.pa[g],al.pb[g],beta)+1e-6*g/G;for(let g=1;g<G;g++)m[g]=Math.max(m[g],m[g-1]+1e-9);
    const lo=m[0],hi=m[G-1];return u=>{const x=lo+(hi-lo)*clamp(u,0,1);let a=0,b=G-1;while(b-a>1){const c=(a+b)>>1;if(m[c]<=x)a=c;else b=c;}const t=(x-m[a])/Math.max(1e-12,m[b]-m[a]);return {A:lerp(al.pa[a],al.pa[b],t),B:lerp(al.pb[a],al.pb[b],t)};};}
  /* ---------- reading an analysed region at a progress position ---------- */
  function cursor(a,pos){const x=clamp(pos,0,1)*(a.K-1),f=Math.floor(x),g=Math.min(a.K-1,f+1),t=x-f,nearest=t<.5?f:g;
    return {a,f,g,t,nearest,logE:lerp(a.logE[f],a.logE[g],t),f0:a.voiced?lerp(a.f0[f],a.f0[g],t):0,frame:x};}
  function sampleArr(arr,c,hz){const a=c.a,k=hz*a.n/a.sr;if(k<1||k>a.bins-2)return null;const k0=Math.floor(k),u=k-k0,o1=c.f*a.bins,o2=c.g*a.bins;
    const v1=arr[o1+k0]+(arr[o1+k0+1]-arr[o1+k0])*u,v2=arr[o2+k0]+(arr[o2+k0+1]-arr[o2+k0])*u;return v1+(v2-v1)*c.t;}
  const logAt=(c,hz)=>sampleArr(c.a.logmag,c,hz),envAt=(c,hz)=>sampleArr(c.a.env,c,hz);
  function ifAt(c,hz){const a=c.a,k=Math.round(hz*a.n/a.sr);if(k<1||k>a.bins-2)return null;const o=c.nearest*a.bins+k;return {hz:a.ifreq[o],phase:a.phase[o]};}
  const role={env:{resonance:1,all:.5,texture:0,motion:0},fine:{texture:1,all:.5,resonance:0,motion:0},motion:{motion:1,all:.5,resonance:0,texture:0}};
  const shareB=(prop,fa,fb,bal)=>{const shift=role[prop][fb]-role[prop][fa];return shift>0?lerp(bal,1,shift):lerp(bal,0,-shift);};
  /* ---------- render ---------- */
  async function render(plan,sources,settings={},options={}){
    const job=validate(plan,sources,settings);
    const check=()=>{if(options.isCancelled?.())throw new DOMException('Dual Donor synthesis cancelled.','AbortError');};check();
    for(const slot of ['A','B'])for(let i=0;i<sources[slot].samples.length;i++){if(!Number.isFinite(sources[slot].samples[i]))throw Error('Donor '+slot+' contains invalid PCM.');}
    const length=Math.round(job.duration*SR),outFrames=Math.ceil((length+N/2)/HOP)+1;
    const regionKey=(slot,r)=>slot+'|'+r.x0+'|'+r.x1+'|'+r.y0+'|'+r.y1,wanted=new Map();
    for(const l of job.links){wanted.set(regionKey('A',l.A),['A',l.A]);wanted.set(regionKey('B',l.B),['B',l.B]);}
    const remSlot=job.remainder==='keep_A'?'A':job.remainder==='keep_B'?'B':null,remRegion=remSlot?{...job.links[0][remSlot],y0:0,y1:1}:null;
    if(remSlot)wanted.set('rem',[remSlot,remRegion]);
    const budget=Math.floor(24e6/(4*BINS*Math.max(1,wanted.size))),maxFrames=Math.max(48,Math.min(outFrames+2,budget));
    const analyses=new Map();let done=0;
    for(const [k,[slot,r]] of wanted){analyses.set(k,await analyse(sources[slot],r,maxFrames,check));done++;options.onProgress?.(.35*done/wanted.size);}
    const meanBal=(job.balance+job.balanceEnd)/2;
    const links=job.links.map(l=>{const a=analyses.get(regionKey('A',l.A)),b=analyses.get(regionKey('B',l.B)),fa=l.A.feature??'all',fb=l.B.feature??'all';
      const al=align(a,b,job.alignment),src=l.direction==='B_to_A'?'B':'A',tgt=src==='A'?'B':'A',srcFeature=src==='A'?fa:fb;
      const beta=l.mode==='imprint'?((srcFeature==='motion')===(src==='B')?1:0):l.mode==='cross'?shareB('motion',fa,fb,meanBal):.5;
      return {l,a,b,fa,fb,al,src,tgt,srcFeature,at:timeline(al,beta),prev:null};});
    const remA=remSlot?analyses.get('rem'):null;
    const out=new Float64Array(length),weight=new Float64Array(length),w=hann(N);
    const power=new Float64Array(BINS),parts=new Float64Array(BINS),domMag=new Float64Array(BINS),domIF=new Float64Array(BINS),domPhase=new Float64Array(BINS),reset=new Uint8Array(BINS);
    const mag=new Float64Array(BINS),outPhase=new Float64Array(BINS),prevMag=new Float64Array(BINS),locked=new Float64Array(BINS),own=links.map(()=>new Float64Array(BINS).fill(.5));
    const peaks=new Int32Array(BINS),tm=new Float64Array(BINS),tif=new Float64Array(BINS),tph=new Float64Array(BINS),diff=new Float64Array(BINS),pre=new Float64Array(BINS+1),re=new Float64Array(N),im=new Float64Array(N);
    const report=links.map(L=>({mode:L.l.mode,A:{f0:L.a.voiced?Math.round(L.a.f0Median*10)/10:null,onsets:L.a.onsets.length},B:{f0:L.b.voiced?Math.round(L.b.f0Median*10)/10:null,onsets:L.b.onsets.length},alignment:job.alignment,matchedOnsets:L.al.matched}));
    let frames=0;
    for(let center=0;center<length+N/2;center+=HOP){
      if(frames%8===0){check();options.onProgress?.(.35+.65*clamp(center/length,0,1));await new Promise(r=>setTimeout(r,0));}
      const u=clamp(center/Math.max(1,length-1),0,1),bal=lerp(job.balance,job.balanceEnd,u),s=job.strength;
      power.fill(0);parts.fill(0);domMag.fill(0);reset.fill(0);let firstPos=null;
      for(let li=0;li<links.length;li++){const L=links[li],l=L.l,pos=L.at(u),ca=cursor(L.a,pos.A),cb=cursor(L.b,pos.B);if(li===0)firstPos=pos;
        // Transient reset when either relevant timeline crosses one of its onsets.
        let crossed=false;if(L.prev){for(const [an,p0,p1,use] of [[L.a,L.prev.A,pos.A,l.mode!=='imprint'||L.tgt==='A'||L.srcFeature==='motion'],[L.b,L.prev.B,pos.B,l.mode!=='imprint'||L.tgt==='B'||L.srcFeature==='motion']])
          if(use)for(const f of an.onsets){const t=f/(an.K-1);if(t>p0&&t<=p1){crossed=true;break;}}}
        L.prev=pos;
        // Output band and log-relative band maps (identity when both regions cover the same band).
        const tgtA=l.mode==='imprint'&&L.tgt==='A',tgtB=l.mode==='imprint'&&L.tgt==='B';
        const lo=tgtA?L.a.low:tgtB?L.b.low:Math.exp(lerp(Math.log(L.a.low),Math.log(L.b.low),bal)),hi=tgtA?L.a.high:tgtB?L.b.high:Math.exp(lerp(Math.log(L.a.high),Math.log(L.b.high),bal));
        const span=Math.log(hi/lo),ea=Math.log(L.a.high/L.a.low)/span,eb=Math.log(L.b.high/L.b.low)/span;
        const gA=f=>L.a.low*Math.pow(f/lo,ea),gB=f=>L.b.low*Math.pow(f/lo,eb),invA=x=>lo*Math.pow(x/L.a.low,1/ea),invB=x=>lo*Math.pow(x/L.b.low,1/eb);
        // Roles: who owns envelope, fine structure (incl. pitch) and motion.
        let wEnv,wFine,wMot,f0out=0,blend=1;
        const fA=ca.f0?invA(ca.f0):0,fB=cb.f0?invB(cb.f0):0;
        if(l.mode==='cross'){wEnv=shareB('env',L.fa,L.fb,bal);wFine=shareB('fine',L.fa,L.fb,bal);wMot=shareB('motion',L.fa,L.fb,bal);blend=s;
          if(fA&&fB)f0out=Math.exp(lerp(Math.log(fA),Math.log(fB),wFine));}
        else if(l.mode==='interlock'){wEnv=.5;wFine=.5;wMot=.5;if(fA&&fB)f0out=Math.sqrt(fA*fB);}
        else{const toB=L.src==='B',f=L.srcFeature,x=v=>toB?v:1-v;/* x(v): share of B when the source owns v */
          wEnv=x(f==='resonance'||f==='all'?s:0);wFine=x(f==='texture'||f==='all'?s:0);wMot=x(f==='motion'?s:0);
          const ft=L.tgt==='A'?fA:fB,fs=L.src==='A'?fA:fB,cs=L.src==='A'?ca:cb;
          if(ft){f0out=ft;if(f==='motion'&&fs&&cs.a.f0Median)f0out=ft*Math.pow(cs.f0/cs.a.f0Median,s);}}
        const rA=f0out&&fA?fA/f0out:1,rB=f0out&&fB?fB/f0out:1;
        const target=lerp(ca.logE-L.a.meanE,cb.logE-L.b.meanE,wMot)+(l.mode==='imprint'?(L.tgt==='A'?L.a.meanE:L.b.meanE):lerp(L.a.meanE,L.b.meanE,l.mode==='cross'?bal:.5));
        const k0=Math.max(1,Math.ceil(lo*N/SR)),k1=Math.min(BINS-2,Math.floor(hi*N/SR));if(k1<k0)continue;
        let energy=0,count=0;
        for(let k=k0;k<=k1;k++){const hz=k*SR/N;
          const eA=envAt(ca,gA(hz)),eB=envAt(cb,gB(hz)),hA=gA(hz*rA),hB=gB(hz*rB);
          const lA=logAt(ca,hA),lB=logAt(cb,hB),fineA=lA==null?null:lA-envAt(ca,hA),fineB=lB==null?null:lB-envAt(cb,hB);
          let m=0,useB=false;
          if(eA==null||eB==null||fineA==null||fineB==null){tm[k]=0;tif[k]=0;tph[k]=0;diff[k]=0;continue;}
          const morph=Math.exp(lerp(eA,eB,wEnv)+lerp(fineA,fineB,wFine));
          if(l.mode==='interlock'){
            // Each structure is bent through the resonance of the other, then both interlock by local salience.
            const mA=Math.exp(fineA+lerp(eA,eB,.5*s)-L.a.meanE),mB=Math.exp(fineB+lerp(eB,eA,.5*s)-L.b.meanE);diff[k]=Math.log(mA+1e-12)-Math.log(mB+1e-12);
            tm[k]=mA;tif[k]=mB;/* temporarily store both, combined below */
          }else{
            const layerA=logAt(ca,gA(hz)),layerB=logAt(cb,gB(hz));
            const layer=Math.sqrt((1-bal)*Math.exp(2*(layerA??-30))+bal*Math.exp(2*(layerB??-30)));
            m=Math.exp(lerp(Math.log(layer+1e-12),Math.log(morph+1e-12),blend));
            useB=wFine>.5||(wFine===.5&&lB>lA);
            const src=useB?ifAt(cb,hB):ifAt(ca,hA),scale=hz/(useB?hB:hA);
            tm[k]=m;tif[k]=src?src.hz*scale:hz;tph[k]=src?src.phase:0;}
        }
        if(l.mode==='interlock'){
          pre[0]=0;for(let k=k0;k<=k1;k++)pre[k-k0+1]=pre[k-k0]+diff[k];const o=own[li],kappa=1+8*s,alpha=crossed?1:.15;
          for(let k=k0;k<=k1;k++){const r=Math.max(2,Math.round(k*.06)),a=Math.max(k0,k-r),b=Math.min(k1,k+r),d=(pre[b-k0+1]-pre[a-k0])/(b-a+1);
            const target0=1/(1+Math.exp(-kappa*d));o[k]+= (target0-o[k])*alpha;const mA=tm[k],mB=tif[k],g=Math.exp(lerp(L.a.meanE,L.b.meanE,.5));
            const hz=k*SR/N,useB=o[k]<.5,src=useB?ifAt(cb,gB(hz*rB)):ifAt(ca,gA(hz*rA)),scale=hz/(useB?gB(hz*rB):gA(hz*rA));
            tm[k]=Math.sqrt(o[k]*mA*mA+(1-o[k])*mB*mB)*g;tif[k]=src?src.hz*scale:hz;tph[k]=src?src.phase:0;}
        }
        for(let k=k0;k<=k1;k++){energy+=tm[k]*tm[k];count++;}
        const actual=.5*Math.log(energy/Math.max(1,count)+1e-18),gain=Math.exp(clamp(target-actual,-3,3));
        for(let k=k0;k<=k1;k++){const hz=k*SR/N,uu=Math.log(hz/lo)/span,edge=clamp(Math.min(uu/.04,(1-uu)/.04),0,1),m=tm[k]*gain*edge;if(!(m>0))continue;
          power[k]+=m*m;parts[k]+=edge;if(m>domMag[k]){domMag[k]=m;domIF[k]=tif[k];domPhase[k]=tph[k];}if(crossed)reset[k]=1;}
      }
      // Remainder: the same moment of its donor (timeline of the first link), filling exactly what the links leave open.
      const remC=remA&&firstPos?cursor(remA,firstPos[remSlot]):null;
      for(let k=1;k<BINS-1;k++){let m=parts[k]>1e-9?Math.sqrt(power[k]/Math.max(1,parts[k])):0;
        if(remC){const cov=Math.min(1,parts[k]),hz=k*SR/N,lr=logAt(remC,hz);if(lr!=null&&cov<1){const rm=Math.exp(lr)*(1-cov);m=Math.sqrt(m*m+rm*rm);if(rm>domMag[k]){const src=ifAt(remC,hz);domMag[k]=rm;domIF[k]=src?src.hz:hz;domPhase[k]=src?src.phase:0;}}}
        mag[k]=m;}
      // Phase: one field. Peaks advance by the instantaneous frequency of the dominant contributor; neighbours lock to their peak.
      for(let k=1;k<BINS-1;k++){outPhase[k]=!frames||reset[k]||prevMag[k]<1e-9?domPhase[k]:wrap(locked[k]+TAU*domIF[k]*HOP/SR);}
      let np=0;for(let k=2;k<BINS-2;k++)if(mag[k]>1e-9&&mag[k]>mag[k-1]&&mag[k]>=mag[k+1])peaks[np++]=k;
      for(let k=1,pi=0;k<BINS-1;k++){while(pi+1<np&&Math.abs(peaks[pi+1]-k)<Math.abs(peaks[pi]-k))pi++;const p=np?peaks[pi]:-1;
        locked[k]=p>=0&&p!==k&&Math.abs(p-k)<=8?wrap(outPhase[p]+wrap(domPhase[k]-domPhase[p])):outPhase[k];}
      re.fill(0);im.fill(0);
      for(let k=1;k<BINS-1;k++){const m=(k&1?-1:1)*mag[k]*N/2;/* centre phase -> frame-start phase */re[k]=m*Math.cos(locked[k]);im[k]=m*Math.sin(locked[k]);re[N-k]=re[k];im[N-k]=-im[k];prevMag[k]=mag[k];}
      fft(re,im,true);
      for(let j=0;j<N;j++){const i=center+j-N/2;if(i<0||i>=length)continue;out[i]+=re[j]*w[j];weight[i]+=w[j]*w[j];}
      frames++;
    }
    check();const pcm=new Float32Array(length);let peak=0,energy=0;const fade=Math.min(96,length/8);
    for(let i=0;i<length;i++){const edge=clamp(Math.min(i/fade,(length-1-i)/fade),0,1),v=out[i]/Math.max(weight[i],1e-3)*edge;if(!Number.isFinite(v))throw Error('Hybrid contains invalid samples.');pcm[i]=v;peak=Math.max(peak,Math.abs(v));energy+=v*v;}
    if(peak<1e-7)throw Error('The linked regions contain no shared audible structure. Widen the marks or choose another relationship.');
    const gain=.88/peak;for(let i=0;i<length;i++)pcm[i]*=gain;
    options.onProgress?.(1);
    return {samples:pcm,sampleRate:SR,duration:job.duration,manifest:{schema:'xensonar-dual-donor-result-v1',version,key:key(plan,sources,settings),
      sourceRevisions:{A:sources.A.revision,B:sources.B.revision},recipe:JSON.parse(JSON.stringify(plan)),
      settings:{duration:job.duration,strength:job.strength,balance:job.balance,balanceEnd:job.balanceEnd,alignment:job.alignment},
      alignment:job.alignment==='events'?'event-aligned (DTW over loudness, onsets, brightness)':'relative progress within each linked time window',
      frequencyMapping:'log-relative band map; fine structure re-pitched to one shared f0, true spectral envelope kept in place',
      phasePolicy:'dominant-contributor instantaneous frequency, peak-locked, reset at aligned onsets',revision:'aligned',analysis:report,
      remainder:job.remainder,frames,peakBeforeGain:peak,finalGain:gain,rms:Math.sqrt(energy/length)*gain,addedNoise:0,addedOscillators:0,outputBodies:1}};
  }
  return Object.freeze({version,validate,key,render,_internal:{analyse,align,features}});
}
__F35636DualDSP.register('aligned',__f35636DualDSPFactoryAligned);
})();
