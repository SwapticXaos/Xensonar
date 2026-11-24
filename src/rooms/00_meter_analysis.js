/* METER-ANALYSIS-01 (Taktometer · Analyze / Fit to target / Loop korrigieren).
 * Counts the segments (counts, beats) of the purple loop mask from the music in and AROUND it, proposes bar readings
 * (12 segments = 2 bars of 5 + 2 = 12/5 bars, or 3 × 4, 4 × 3 …), measures how far the mask is off the beat grid and cuts it:
 *  - micro  (Loop korrigieren): keeps the counted number of segments, puts start and end just before the real attacks;
 *  - target (Fit to target):    bars × segments per bar from the Taktometer, cut along the music's own segment grid
 *                               from where the mask starts (may jump by whole segments).
 * Time truth: bars × segmentsPerBar × 60 / bpm = mask length (the same relation the Raw send and the Live room use).
 * Pure functions over mono PCM (no React, no audio context), testable in node. */
function __xenMeterAnalysisFactory(){
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const MIN_T=.17,MAX_T=2,HOP_SEC=.005,MAX_S=16;
 const gcd=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b){const r=a%b;a=b;b=r}return a||1};
 /* one-pole band split: low < 180 Hz, high > 2.5 kHz, full; energy per 5 ms hop, compressed against the context mean */
 function features(samples,sr,t0,t1){
  /* a start before 0 s reads silence, so an attack right at the file start is still an onset */
  const hop=Math.max(16,Math.round(sr*HOP_SEC)),i0=clamp(Math.floor(t0*sr),-Math.round(sr*.2),samples.length),i1=clamp(Math.floor(t1*sr),i0,samples.length);
  const n=Math.max(0,Math.floor((i1-i0)/hop)),low=new Float64Array(n),high=new Float64Array(n),full=new Float64Array(n);
  const aL=1-Math.exp(-2*Math.PI*180/sr),aH=1-Math.exp(-2*Math.PI*2500/sr);let lp=0,hp=0;
  for(let i=Math.max(0,i0-Math.round(sr*.03));i<i0;i++){const x=samples[i]||0;lp+=aL*(x-lp);hp+=aH*(x-hp)}
  for(let f=0;f<n;f++){let el=0,eh=0,ef=0;const s=i0+f*hop;for(let i=s;i<s+hop;i++){const x=samples[i]||0;lp+=aL*(x-lp);hp+=aH*(x-hp);const h=x-hp;el+=lp*lp;eh+=h*h;ef+=x*x}low[f]=el/hop;high[f]=eh/hop;full[f]=ef/hop}
  /* trailing energy windows longer than a period of low notes (65 Hz = 15 ms): no ripple onsets from sustained bass or drones */
  const trail=(a,k)=>{const o=new Float64Array(a.length);let s=0;for(let i=0;i<a.length;i++){s+=a[i];if(i>=k)s-=a[i-k];o[i]=s/Math.min(k,i+1)}return o};
  low.set(trail(low,6));full.set(trail(full,4));high.set(trail(high,2));
  const comp=a=>{let m=0;for(const v of a)m+=v;m=m/Math.max(1,a.length)+1e-12;const c=new Float64Array(a.length);for(let i=0;i<a.length;i++)c[i]=Math.log1p(12*a[i]/m);return c};
  const cl=comp(low),ch=comp(high),cf=comp(full);
  const diff=c=>{const d=new Float64Array(c.length);for(let i=2;i<c.length;i++)d[i]=Math.max(0,c[i]-Math.max(c[i-1],c[i-2]*.5+c[i-1]*.5));return d};
  const nl=diff(cl),nh=diff(ch),nf=diff(cf),nov=new Float64Array(n);
  for(let i=0;i<n;i++)nov[i]=1.3*nl[i]+nf[i]+.8*nh[i];
  // remove the slow floor (sustained noise) and smooth with a 10 ms gaussian for fast grid reads
  const W=Math.max(1,Math.round(.15/HOP_SEC)),pre=new Float64Array(n+1);for(let i=0;i<n;i++)pre[i+1]=pre[i]+nov[i];
  const sn=new Float64Array(n),g=[.135,.607,1,.607,.135];
  const flat=new Float64Array(n);for(let i=0;i<n;i++){const a=Math.max(0,i-W),b=Math.min(n,i+W+1);flat[i]=Math.max(0,nov[i]-(pre[b]-pre[a])/(b-a))}
  for(let i=0;i<n;i++){let s=0,w=0;for(let k=-2;k<=2;k++){const j=i+k;if(j>=0&&j<n){s+=flat[j]*g[k+2];w+=g[k+2]}}sn[i]=s/w}
  return {rate:sr/hop,t0:i0/sr,n,nov:sn,nl,nh,nf,cl,cf};
 }
 /* is there a pulse at all? clear attacks stand far above the typical novelty (drone, noise, pads: they do not) */
 function pulse(F){if(F.n<32)return {ok:false,p99:0,peak:0};const a=Array.from(F.nov).sort((x,y)=>y-x),p99=a[Math.floor(a.length*.01)],p50=a[Math.floor(a.length*.5)],peak=p99/(p50+.05);return {ok:p99>=.8&&peak>=6,p99,peak}}
 const at=(F,arr,t)=>{const x=(t-F.t0)*F.rate;if(x<0||x>F.n-1)return null;const i=Math.floor(x),f=x-i;return arr[i]*(1-f)+(arr[Math.min(F.n-1,i+1)]??0)*f};
 const peakNear=(F,arr,t,w)=>{const a=Math.max(0,Math.floor((t-w-F.t0)*F.rate)),b=Math.min(F.n-1,Math.ceil((t+w-F.t0)*F.rate));let m=0;for(let i=a;i<=b;i++)m=Math.max(m,arr[i]);return m};
 const meanOver=(F,arr,t,len)=>{const a=Math.max(0,Math.floor((t-F.t0)*F.rate)),b=Math.min(F.n,Math.ceil((t+len-F.t0)*F.rate));if(b<=a)return 0;let s=0;for(let i=a;i<b;i++)s+=arr[i];return s/(b-a)};
 /* grid read: mean onset strength on start+phase+k·T over the context; points inside the mask count fully, context 0.6 */
 function comb(F,T,origin,ctx0,ctx1,m0,m1){
  const k0=Math.ceil((ctx0-origin)/T),k1=Math.floor((ctx1-origin)/T);let s=0,w=0;
  for(let k=k0;k<=k1;k++){const t=origin+k*T,v=at(F,F.nov,t);if(v==null)continue;const ww=t>=m0-1e-6&&t<=m1+1e-6?1:.6;s+=v*ww;w+=ww}
  return w>0?s/w:0;
 }
 function acf(F,T){
  const L=Math.round(T*F.rate);if(L<1||L>=F.n-4)return 0;let m=0;for(let i=0;i<F.n;i++)m+=F.nov[i];m/=F.n;
  let s0=0,s=0,c=0;for(let i=0;i<F.n;i++){const a=F.nov[i]-m;s0+=a*a;if(i+L<F.n){s+=a*(F.nov[i+L]-m);c++}}
  return s0>0&&c>0?(s/c)/(s0/F.n):0;
 }
 const tempoPrior=T=>{const b=60/T,z=Math.log2(b/112)/.9;return Math.exp(-.5*z*z)};
 /* strength of the grid against the same grid shifted off-beat: high only when onsets sit ON the grid */
 function gridContrast(F,T,origin,ctx0,ctx1,m0,m1){
  const on=comb(F,T,origin,ctx0,ctx1,m0,m1);let off=0;const fr=[.5,.25,.75,1/3,2/3];for(const f of fr)off+=comb(F,T,origin+f*T,ctx0,ctx1,m0,m1);off/=fr.length;
  return {on,off,contrast:(on-off)/(on+off+1e-9)};
 }
 function bestPhase(F,T,start,ctx0,ctx1,m0,m1,span){
  let best={phase:0,v:-1};const step=.0025;for(let p=-span;p<=span+1e-9;p+=step){const v=comb(F,T,start+p,ctx0,ctx1,m0,m1);if(v>best.v)best={phase:p,v}}
  return best;
 }
 /* refine the segment period and the grid phase together (coarse → fine) */
 function refine(F,T,start,ctx0,ctx1,m0,m1){
  let bt=T,bp=0,bv=-1;const span=Math.min(.06,T*.3);
  for(const [rel,steps,pSpan] of [[.04,80,span],[.004,40,Math.min(span,.012)],[.0006,30,.004]]){
   const tc=bt,pc=bp;for(let i=-steps;i<=steps;i++){const t=tc*(1+rel*i/steps);if(t<MIN_T*.9)continue;
    for(let p=pc-pSpan;p<=pc+pSpan+1e-9;p+=Math.max(.0005,pSpan/12)){const v=comb(F,t,start+p,ctx0,ctx1,m0,m1);if(v>bv){bv=v;bt=t;bp=p}}}
  }
  return {T:bt,phase:bp,score:bv};
 }
 /* sample-exact attack: first rise of a 0.5 ms envelope before the onset peak, minus a 1.5 ms pre-roll, on a zero crossing */
 function attackBefore(samples,sr,t,search=.03){
  const a=clamp(Math.floor((t-search)*sr),1,samples.length-2),b=clamp(Math.floor((t+search*.5)*sr),a+1,samples.length-1),w=Math.max(4,Math.round(sr*.0005));
  const env=[];let peak=0,pi=a;for(let i=a;i<b;i+=w){let m=0;for(let j=i;j<Math.min(b,i+w);j++)m=Math.max(m,Math.abs(samples[j]||0));env.push(m);if(m>peak){peak=m;pi=i}}
  if(peak<=1e-5)return null;let base=Infinity;for(let i=0;i<=Math.floor((pi-a)/w);i++)base=Math.min(base,env[i]);
  const thr=base+(peak-base)*.2;let k=0;for(;k<env.length;k++)if(env[k]>=thr)break;
  const tA=(a+k*w)/sr-.0015;return zeroCross(samples,sr,tA,.0007);
 }
 function zeroCross(samples,sr,t,span){
  const c=Math.round(t*sr),r=Math.max(1,Math.round(span*sr));let best=c,bd=Infinity;
  for(let i=Math.max(1,c-r);i<=Math.min(samples.length-1,c+r);i++){const p=samples[i-1]||0,q=samples[i]||0;if(p<=0&&q>=0||p>=0&&q<=0){const d=Math.abs(i-c)+(Math.abs(p)+Math.abs(q))*sr*.002;if(d<bd){bd=d;best=i}}}
  return Math.max(0,best)/sr;
 }
 /* accent profile per segment and the meter score for every bar length S (segments per bar) */
 function meterScores(F,T,origin,ctx0,ctx1){
  const k0=Math.ceil((ctx0-origin)/T),k1=Math.floor((ctx1-origin-T*.5)/T),ks=[],rows=[];
  const times=[];for(let k=k0;k<=k1;k++){times.push(origin+k*T);ks.push(k)}
  return meterScoresAt(F,times,ks,T);
 }
 /* the same on given beat times (song analysis: tracked beats with drift); ks[i] = beat index, 0 = a downbeat candidate */
 function meterScoresAt(F,times,ks,T){
  const rows=[];
  for(const t of times){const w=Math.min(.03,T*.15);
   rows.push([peakNear(F,F.nl,t,w),peakNear(F,F.nf,t,w),peakNear(F,F.nh,t,w),meanOver(F,F.cl,t,T*.5),meanOver(F,F.cf,t,T*.9)])}
  const K=rows.length,D=5;if(K<4)return {scores:{},segmentsInContext:K};
  for(let d=0;d<D;d++){let m=0,v=0;for(const r of rows)m+=r[d];m/=K;for(const r of rows)v+=(r[d]-m)**2;const sd=Math.sqrt(v/K)||1;for(const r of rows)r[d]=(r[d]-m)/sd}
  const acc=rows.map(r=>r[0]+.6*r[1]+.8*r[3]+.4*r[4]),scores={},raw={};
  for(let S=2;S<=MAX_S;S++){
   let s=0,c=0;for(let i=0;i+S<K;i++){let p=0;for(let d=0;d<D;d++)p+=rows[i][d]*rows[i+S][d];s+=p/D;c++}
   const rep=c>0?s/c:0,cover=Math.min(1,c/(S*2));
   const ph=new Array(S).fill(0),pc=new Array(S).fill(0);for(let i=0;i<K;i++){const m=((ks[i]%S)+S)%S;ph[m]+=acc[i];pc[m]++}
   for(let m=0;m<S;m++)ph[m]=pc[m]?ph[m]/pc[m]:0;const others=ph.slice(1),mean=ph.reduce((a,b)=>a+b,0)/S,maxOther=others.length?Math.max(...others):0;
   const down=.5*(ph[0]-mean)+.5*(ph[0]-maxOther);
   const prior={2:0,3:.05,4:.08,5:.02,6:.03,7:.02,8:.01}[S]??-.012*(S-8);
   raw[S]={repetition:rep*cover,downbeat:down,prior,score:rep*cover+.35*Math.tanh(down/2)+prior};
  }
  // a bar of 10 repeats whenever a bar of 5 does: prefer the smallest bar length that explains repetition and downbeat
  for(let S=2;S<=MAX_S;S++){let sc=raw[S].score;
   for(let d=2;d<S;d++){if(S%d)continue;const r=raw[d];
    if(r.repetition>=.7*raw[S].repetition&&r.downbeat>=.8*raw[S].downbeat){sc=Math.min(sc,r.score-.05);break}
    if(r.score>=sc-.1){sc-=.14;break}}
   scores[S]={...raw[S],score:sc}}
  return {scores,segmentsInContext:K,accent:acc};
 }
 function fraction(N,S){
  const rn=Math.round(N);if(Math.abs(N-rn)>1e-9)return {text:String(Number((N/S).toFixed(4))),whole:Math.floor(N/S),extra:Number((N-Math.floor(N/S)*S).toFixed(4))};
  const g=gcd(rn,S),whole=Math.floor(rn/S),extra=rn-whole*S;
  return {text:g===S?String(rn/S):(rn/g)+'/'+(S/g),whole,extra,mixed:extra?(whole?whole+' ':'')+(extra/gcd(extra,S))+'/'+(S/gcd(extra,S)):String(whole)};
 }
 function reading(N,S,score=null){
  const f=fraction(N,S),bars=N/S;
  const label=f.whole>0&&f.extra>0?`${f.whole} × ${S} + ${f.extra}`:f.whole>0?`${f.whole} × ${S}`:`${f.extra} of ${S}`;
  return {segmentsPerBar:S,bars,barsText:f.text,mixed:f.mixed??f.text,wholeBars:f.whole,extraSegments:f.extra,totalSegments:N,label,decimal:Number(bars.toFixed(4)),score};
 }
 /* readings of N segments as bars of S, best musical reading first */
 function readings(N,scores={},limit=MAX_S){
  const list=[];for(let S=2;S<=MAX_S;S++){const sc=scores[S]?.score;list.push(reading(N,S,Number.isFinite(sc)?sc:({3:.05,4:.08,5:.02,6:.03,7:.02}[S]??-.01*S)))}
  if(N>=1&&N<=MAX_S&&Math.abs(N-Math.round(N))<1e-9&&!list.some(r=>r.segmentsPerBar===N))list.push(reading(N,Math.round(N),-1));
  // a bar longer than the mask, or one bar plus a remainder of a very long bar, is a weak reading: keep it, rank it low
  for(const r of list){if(r.wholeBars<1)r.score-=2;else if(r.wholeBars<2&&r.extraSegments>0&&r.segmentsPerBar>8)r.score-=.15}
  list.sort((a,b)=>b.score-a.score||a.segmentsPerBar-b.segmentsPerBar);return list.slice(0,limit);
 }
 function input(asset){
  const samples=asset?.monoSamples,sr=Number(asset?.sampleRate);if(!samples||!samples.length||!(sr>0))throw Error('No audio for the meter analysis.');
  return {samples,sr,total:Number(asset.originalDuration)||samples.length/sr};
 }
 /* analyze(asset,start,dur,{segments}) — segments forces the count (tempo level ×½ / ×2) */
 function analyze(asset,startSec,durationSec,options={}){
  const {samples,sr,total}=input(asset),L=Number(durationSec),start=Number(startSec);
  if(!(L>=MIN_T*1.5))return {ok:false,reason:'The mask is too short for a meter analysis.'};
  const pad=clamp(L*.75,2,10),ctx0=Math.max(0,start-pad),ctx1=Math.min(total,start+L+pad),m0=start,m1=start+L;
  const F=features(samples,sr,ctx0-.02,ctx1+.05);if(F.n<16)return {ok:false,reason:'Not enough audio around the mask.'};
  let energy=0;for(let i=0;i<F.n;i++)energy+=F.nov[i];if(!(energy/F.n>1e-4))return {ok:false,reason:'No clear rhythm in or around the mask.'};
  if(!pulse(F).ok)return {ok:false,reason:'No clear pulse in or around the mask (drone, texture or noise): count it as 1 bar, 1 segment.'};
  /* the segment period comes from the music (context + mask), not from the mask length: scan 30–350 BPM in 0.5 % steps */
  const forced=Number(options.segments),cands=[];
  const scan=forced>0?[L/forced]:(()=>{const a=[];for(let T=MIN_T;T<=MAX_T;T*=1.005)a.push(T);return a})();
  for(const T of scan){
   const ph=bestPhase(F,T,start,ctx0,ctx1,m0,m1,Math.min(.05,T*.25)),g=gridContrast(F,T,start+ph.phase,ctx0,ctx1,m0,m1),a=acf(F,T);
   const n=L/T,fit=1-Math.min(1,Math.abs(n-Math.round(n))*2);
   const score=(.6*g.contrast+.4*Math.max(0,a))*(.3+.7*tempoPrior(T))+.04*fit;cands.push({N:Math.max(1,Math.round(n)),T,score,contrast:g.contrast,acf:a})}
  if(!cands.length)return {ok:false,reason:'No segment grid fits this mask.'};
  cands.sort((a,b)=>b.score-a.score);
  const best=cands[0],r=refine(F,best.T,start,ctx0,ctx1,m0,m1),T=r.T;
  const exact=L/T,N=forced>0?Math.round(forced):Math.max(1,Math.round(exact));
  const origin=start+r.phase,att=attackBefore(samples,sr,origin);
  const startPrecise=att!=null&&Math.abs(att-origin)<Math.min(.035,T*.2)?att:zeroCross(samples,sr,origin,.0007);
  const meter=meterScores(F,T,startPrecise,ctx0,ctx1),list=readings(N,meter.scores);
  const near=(x,y)=>Math.abs(x/y-1)<.06||Math.abs(x/y-2)<.12||Math.abs(x/y-.5)<.03||Math.abs(x/y-1.5)<.09||Math.abs(x/y-2/3)<.04;
  const second=cands.find(c=>!near(c.T,best.T));
  const confidence=clamp(.5*clamp(best.contrast,0,1)+.3*clamp(best.acf,0,1)+.2*clamp(second?(best.score-second.score)/(best.score+1e-9)*2:1,0,1),0,1);
  const levels=[.5,2].map(f=>{const n=N*f;return Number.isInteger(n)&&n>=1&&L/n>=MIN_T*.9&&L/n<=MAX_T*1.1?{segments:n,bpm:Number((60*n/L).toFixed(2))}:null}).filter(Boolean);
  return {ok:true,startSec:start,durationSec:L,segmentPeriodSec:T,segmentBpm:Number((60/T).toFixed(3)),segmentsExact:Number(exact.toFixed(4)),segments:N,
   deviationSec:Number((L-N*T).toFixed(5)),startOffsetSec:Number((startPrecise-start).toFixed(5)),startPreciseSec:startPrecise,
   confidence:Number(confidence.toFixed(3)),segmentsInContext:meter.segmentsInContext,meterScores:meter.scores,readings:list,best:list[0]??null,levels,
   context:{startSec:Number(ctx0.toFixed(3)),endSec:Number(ctx1.toFixed(3))},__F:F};
 }
 /* cut a loop of `segments` (may be fractional) segments from the analysed grid; snaps the end to the next real attack */
 function cut(asset,analysis,segments){
  const {samples,sr,total}=input(asset),T=analysis.segmentPeriodSec,n=Number(segments);if(!(n>0)||!(T>0))throw Error('Invalid target.');
  let start=analysis.startPreciseSec,len=n*T;
  if(len>total)throw Error('The target ('+n+' segments ≈ '+len.toFixed(2)+' s) is longer than the audio.');
  if(start+len>total){const back=Math.ceil((start+len-total)/T-1e-9);start=Math.max(0,start-back*T)}
  const grid=start+len;let end=grid;
  if(Math.abs(n-Math.round(n))<1e-9){const a=attackBefore(samples,sr,grid,.025);if(a!=null&&Math.abs(a-grid)<Math.min(.012,T*.05))end=a}
  if(end===grid)end=zeroCross(samples,sr,grid,.0007);
  end=Math.min(total,end);const dur=Math.max(.05,end-start);
  return {startSec:start,durationSec:dur,segments:n,bpm:60*n/dur,segmentPeriodSec:T};
 }
 /* Loop korrigieren (micro): same number of segments, exact grid, real attacks */
 function microCorrect(asset,startSec,durationSec,options={}){
  const a=options.analysis??analyze(asset,startSec,durationSec,options);if(!a.ok)return a;
  const c=cut(asset,a,a.segments);return {...a,ok:true,corrected:c,changeStartSec:c.startSec-startSec,changeEndSec:c.startSec+c.durationSec-(startSec+durationSec)};
 }
 /* Fit to target (coarse): bars × segmentsPerBar from the Taktometer, cut along the segment grid of the music */
 function fitTarget(asset,startSec,durationSec,target,options={}){
  const bars=Number(target?.bars),S=Math.round(Number(target?.segmentsPerBar));if(!(bars>0)||!(S>=1))throw Error('Set Number of Bars and Number of Segments first.');
  const a=options.analysis??analyze(asset,startSec,durationSec,options);if(!a.ok)return a;
  const n=bars*S,c=cut(asset,a,n);return {...a,ok:true,corrected:c,target:{bars,segmentsPerBar:S,segments:n},reading:reading(n,S,null)};
 }
 /* metadata patch with exact time truth: bars × S × 60 / bpm = loop length */
 function metaPatch(segments,S,durationSec){
  const s=Math.max(1,Math.min(MAX_S,Math.round(S))),bars=segments/s;
  return {bars,beatsPerBar:s,guideSegments:s,bpm:60*segments/Math.max(1e-6,durationSec)};
 }
 /* repair-result shape of the old Loop korrigieren, so undo, persistence and candidates keep working */
 function asRepairResult(result,S){
  const c=result.corrected,s=Math.max(1,Math.round(S||result.best?.segmentsPerBar||4));
  const primary={bars:c.segments/s,bpm:Math.round(c.bpm*100)/100,startSec:c.startSec,durationSec:c.durationSec,confidence:result.confidence,fitScore:result.confidence,segments:c.segments,segmentsPerBar:s,method:'meter-analysis-01'};
  const candidates=[primary];
  for(const lv of result.levels??[])candidates.push({...primary,segments:lv.segments,bars:lv.segments/s,bpm:lv.bpm,durationSec:c.durationSec,fitScore:result.confidence*.6});
  return {primary,candidates,meterAnalysis:{segments:result.segments,segmentsExact:result.segmentsExact,segmentBpm:result.segmentBpm,deviationSec:result.deviationSec,startOffsetSec:result.startOffsetSec,confidence:result.confidence}};
 }
 const strip=a=>{if(!a||typeof a!=='object')return a;const {__F,...rest}=a;return rest};
 return Object.freeze({analyze:(...x)=>strip(analyze(...x)),analyzeRaw:analyze,cut,microCorrect:(...x)=>strip(microCorrect(...x)),fitTarget:(...x)=>strip(fitTarget(...x)),readings,reading,metaPatch,asRepairResult,fraction,
  internals:Object.freeze({pulse,features,at,comb,acf,tempoPrior,gridContrast,bestPhase,refine,attackBefore,zeroCross,meterScoresAt,MIN_T,MAX_T})});
}
const __xenMeterAnalysis=__xenMeterAnalysisFactory();
/* Loop korrigieren (micro) for lGe: the counted segments on the exact grid, real attacks; null = fall back to the old tempo repair */
function __xenMeterRepair(asset,range,meter){
 try{
  const r=__xenMeterAnalysis.microCorrect(asset,range.startSec,range.durationSec);
  if(!r.ok||!(r.confidence>=.12))return null;
  const S=Math.round(Number(meter?.guideSegments)||Number(meter?.beatsPerBar)||r.best?.segmentsPerBar||4),out=__xenMeterAnalysis.asRepairResult(r,S);
  out.meterAnalysis.changeStartMs=Math.round(r.changeStartSec*10000)/10;out.meterAnalysis.changeEndMs=Math.round(r.changeEndSec*10000)/10;
  return out;
 }catch(error){console.warn('[xensonar][meter-analysis][repair]',error);return null}
}
function __xenMeterRepairMessage(result){
 const m=result.meterAnalysis,p=result.primary,ms=v=>(v>0?'+':'')+v.toFixed(1)+' ms';
 return `Loop corrected precisely: ${m.segments} segments at ${m.segmentBpm.toFixed(2)} BPM (the mask counted ${m.segmentsExact}). Start ${ms(m.changeStartMs)}, end ${ms(m.changeEndMs)} · ${p.durationSec.toFixed(3)} s. Bars and segments: right click on the Taktometer → Analyze.`;
}
