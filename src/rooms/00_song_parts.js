/* SONG-PARTS-01 (Wave Editor · coloured part strip above the overview).
 * Splits the whole upload into parts and names them by letter in order of appearance: A, B, C …; a part that returns
 * (same material) gets the same letter and colour again. No cultural names (verse/chorus): letters only.
 * Each part carries its meter: whole bars inside it, segments per bar, segments, BPM (time truth as in the Taktometer).
 *  - no clear meter (drone, sound effect, one hit, less than two bars): ONE part, 1 bar, 1 segment;
 *  - otherwise: tempo from several windows -> beat tracking (dynamic programming, follows drift) -> bar length and downbeat
 *    -> features per bar (8 bands, chroma, level, onset density) -> novelty -> boundaries on bar lines -> letters by similarity.
 * Pure functions; analyze() runs in a Blob worker on a decimated copy, boundaries are snapped to real attacks afterwards. */
function __xenSongPartsFactory(meter){
 const I=meter.internals,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const COLORS=['#38bdf8','#f472b6','#a3e635','#fbbf24','#a78bfa','#2dd4bf','#fb923c','#f87171','#818cf8','#e879f9','#facc15','#4ade80'];
 const letter=i=>i<26?String.fromCharCode(65+i):String.fromCharCode(65+i%26)+Math.floor(i/26+1);
 function decimate(samples,sr,target=11025){
  const f=Math.max(1,Math.floor(sr/target));if(f===1)return {samples:Float32Array.from(samples),sampleRate:sr};
  const n=Math.floor(samples.length/f),x=new Float32Array(n);for(let i=0,o=0;i<n;i++,o+=f){let s=0;for(let j=0;j<f;j++)s+=samples[o+j];x[i]=s/f}
  return {samples:x,sampleRate:sr/f};
 }
 /* tempo: best segment period in up to six 16 s windows, clustered; rhythmic only if the grid clearly beats its off-beat shift */
 function tempo(x,sr,D){
  const nw=clamp(Math.round(D/20),1,6),len=Math.min(16,D),res=[],pulses=[];
  for(let w=0;w<nw;w++){
   const w0=nw===1?0:(D-len)*w/(nw-1),w1=w0+len,F=I.features(x,sr,w0,w1);if(F.n<64)continue;
   let e=0;for(let i=0;i<F.n;i++)e+=F.nov[i];if(!(e/F.n>1e-4))continue;
   const pl=I.pulse(F);pulses.push(pl.ok);if(!pl.ok)continue;
   let best=null;
   for(let T=I.MIN_T;T<=I.MAX_T;T*=1.01){
    const ph=I.bestPhase(F,T,w0,w0,w1,w0,w1,Math.min(T*.5,.5)),g=I.gridContrast(F,T,w0+ph.phase,w0,w1,w0,w1),a=I.acf(F,T);
    const sc=(.6*g.contrast+.4*Math.max(0,a))*(.3+.7*I.tempoPrior(T));if(!best||sc>best.score)best={T,score:sc,contrast:g.contrast,acf:a,phase:ph.phase,w0,w1,F}}
   if(best){const r=I.refine(best.F,best.T,w0+best.phase,w0,w1,w0,w1),g=I.gridContrast(best.F,r.T,w0+best.phase+r.phase,w0,w1,w0,w1);res.push({T:r.T,score:best.score,contrast:g.contrast,acf:best.acf})}
  }
  if(!res.length||pulses.filter(Boolean).length<Math.max(1,pulses.length*.5))return res.length?{T:res[0].T,contrast:0,acf:0,support:0,windows:res.length,pulse:false}:null;
  const groups=[];for(const r of res){const g=groups.find(g=>Math.abs(g.T/r.T-1)<.03);if(g){g.items.push(r);g.T=g.items.reduce((a,b)=>a+b.T,0)/g.items.length;g.score+=r.score}else groups.push({T:r.T,items:[r],score:r.score})}
  groups.sort((a,b)=>b.score-a.score);const g=groups[0],contrast=g.items.reduce((a,b)=>a+b.contrast,0)/g.items.length,acf=g.items.reduce((a,b)=>a+b.acf,0)/g.items.length;
  return {T:g.T,contrast,acf,support:g.items.length/res.length,windows:res.length};
 }
 /* beat tracking by dynamic programming (Ellis 2007): onsets + a penalty for deviating from the period */
 function track(F,T){
  const P=T*F.rate,n=F.n,nov=F.nov;let m=0,v=0;for(let i=0;i<n;i++)m+=nov[i];m/=n;for(let i=0;i<n;i++)v+=(nov[i]-m)**2;const sd=Math.sqrt(v/n)||1;
  const score=new Float64Array(n),back=new Int32Array(n).fill(-1),lo=Math.round(P*.5),hi=Math.round(P*2),tight=300;
  const pen=new Float64Array(hi+1);for(let d=lo;d<=hi;d++){const l=Math.log(d/P);pen[d]=-tight*l*l}
  for(let t=0;t<n;t++){let best=0,bi=-1;for(let d=lo;d<=hi&&d<=t;d++){const c=score[t-d]+pen[d];if(c>best||bi<0){best=c;bi=t-d}}score[t]=nov[t]/sd+(bi>=0?Math.max(0,best):0);back[t]=bi>=0&&best>0?bi:-1}
  let end=n-1,bs=-Infinity;for(let t=Math.max(0,n-Math.round(P*1.5));t<n;t++)if(score[t]>bs){bs=score[t];end=t}
  const beats=[];for(let t=end;t>=0;t=back[t]){beats.push(F.t0+t/F.rate);if(back[t]<0)break}
  return beats.reverse();
 }
 function barLength(F,beats,T){
  const ks=beats.map((_,i)=>i),ms=I.meterScoresAt(F,beats,ks,T),acc=ms.accent;if(!acc)return {S:4,phase:0,scores:{}};
  const raw={};
  for(let S=2;S<=12;S++){const rep=ms.scores[S]?.repetition??0,ph=new Array(S).fill(0),pc=new Array(S).fill(0);
   for(let i=0;i<acc.length;i++){ph[i%S]+=acc[i];pc[i%S]++}for(let p=0;p<S;p++)ph[p]=pc[p]?ph[p]/pc[p]:0;
   const mean=ph.reduce((a,b)=>a+b,0)/S;let bp=0;for(let p=1;p<S;p++)if(ph[p]>ph[bp])bp=p;const maxOther=Math.max(...ph.filter((_,i)=>i!==bp));
   const down=.5*(ph[bp]-mean)+.5*(ph[bp]-maxOther),prior={2:0,3:.05,4:.08,5:.02,6:.03,7:.02,8:.01}[S]??-.012*(S-8);
   raw[S]={S,phase:bp,repetition:rep,downbeat:down,score:rep+.35*Math.tanh(down/2)+prior}}
  for(let S=2;S<=12;S++)for(let d=2;d<S;d++){if(S%d)continue;const r=raw[d];if(r.repetition>=.7*raw[S].repetition&&r.downbeat>=.8*raw[S].downbeat){raw[S].score=Math.min(raw[S].score,r.score-.05);break}}
  const best=Object.values(raw).sort((a,b)=>b.score-a.score)[0];return {S:best.S,phase:best.phase,scores:raw};
 }
 /* spectrum per frame: radix-2 FFT, 8 log bands, 12-bin chroma, level */
 function fft(re,im){const n=re.length;for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]]}}
  for(let len=2;len<=n;len<<=1){const a=-2*Math.PI/len,wr=Math.cos(a),wi=Math.sin(a),h=len>>1;for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let k=0;k<h;k++){const xr=re[i+k+h]*cr-im[i+k+h]*ci,xi=re[i+k+h]*ci+im[i+k+h]*cr;re[i+k+h]=re[i+k]-xr;im[i+k+h]=im[i+k]-xi;re[i+k]+=xr;im[i+k]+=xi;const t=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=t}}}}
 const EDGES=[40,120,250,500,1000,2000,3500,5500],DIM=8+12+2;
 function frames(x,sr,D){
  const N=1024,hop=Math.max(.05,D/30000),win=new Float64Array(N);for(let i=0;i<N;i++)win[i]=.5-.5*Math.cos(2*Math.PI*i/(N-1));
  const nf=Math.max(1,Math.floor((x.length-N)/(hop*sr))+1),out=[],re=new Float64Array(N),im=new Float64Array(N),bin=sr/N;
  const band=new Int16Array(N/2),pc=new Int16Array(N/2);for(let k=0;k<N/2;k++){const f=k*bin;let b=-1;for(let e=0;e<EDGES.length-1;e++)if(f>=EDGES[e]&&f<EDGES[e+1])b=e;if(f>=EDGES[EDGES.length-1]&&f<sr/2)b=7;band[k]=b;pc[k]=f>=65&&f<=2100?((Math.round(12*Math.log2(f/440)+69)%12)+12)%12:-1}
  for(let fi=0;fi<nf;fi++){const o=Math.floor(fi*hop*sr);let lev=0;for(let i=0;i<N;i++){const s=x[o+i]||0;re[i]=s*win[i];im[i]=0;lev+=s*s}fft(re,im);
   const v=new Float64Array(DIM-1),ch=new Float64Array(12);for(let k=1;k<N/2;k++){const p=re[k]*re[k]+im[k]*im[k];if(band[k]>=0)v[band[k]]+=p;if(pc[k]>=0)ch[pc[k]]+=Math.sqrt(p)}
   for(let b=0;b<8;b++)v[b]=Math.log(1e-9+v[b]);let cs=0;for(let c=0;c<12;c++)cs+=ch[c];for(let c=0;c<12;c++)v[8+c]=cs>0?ch[c]/cs:1/12;v[20]=Math.log(1e-9+lev/N);
   out.push({t:(o+N/2)/sr,v})}
  return out;
 }
 /* one vector per unit (bar, or time block without a meter); dims are z-scored with absolute floors so steady material stays steady */
 function unitVectors(fr,F,units){
  const vs=units.map(([a,b])=>{const v=new Float64Array(DIM);let c=0;for(const f of fr){if(f.t<a||f.t>=b)continue;for(let d=0;d<DIM-1;d++)v[d]+=f.v[d];c++}
   if(c)for(let d=0;d<DIM-1;d++)v[d]/=c;else{const f=fr.reduce((p,q)=>Math.abs(q.t-(a+b)/2)<Math.abs(p.t-(a+b)/2)?q:p,fr[0]);for(let d=0;d<DIM-1;d++)v[d]=f?f.v[d]:0}
   let s=0,n=0;for(let i=Math.max(0,Math.floor((a-F.t0)*F.rate));i<Math.min(F.n,Math.ceil((b-F.t0)*F.rate));i++){s+=F.nov[i];n++}v[DIM-1]=n?s/n:0;return v});
  const floors=d=>d<8?1.2:d<20?.06:d===20?1.2:.05,weights=d=>d<8?1:d<20?1.6:.7;
  for(let d=0;d<DIM;d++){let m=0;for(const v of vs)m+=v[d];m/=vs.length;let s=0;for(const v of vs)s+=(v[d]-m)**2;const sd=Math.max(floors(d),Math.sqrt(s/vs.length));for(const v of vs)v[d]=(v[d]-m)/sd*weights(d)}
  return vs;
 }
 const dist=(a,b)=>{let s=0;for(let d=0;d<a.length;d++)s+=(a[d]-b[d])**2;return Math.sqrt(s/a.length)};
 function mean(vs,a,b){const m=new Float64Array(DIM);for(let i=a;i<b;i++)for(let d=0;d<DIM;d++)m[d]+=vs[i][d];for(let d=0;d<DIM;d++)m[d]/=Math.max(1,b-a);return m}
 /* novelty: mean distance across a candidate boundary minus the mean distance within both sides */
 function boundaries(vs,k,minLen){
  const B=vs.length,nov=new Float64Array(B);
  for(let i=k;i<=B-k;i++){let cross=0,within=0,nc=0,nw=0;for(let a=i-k;a<i;a++)for(let b=i;b<i+k;b++){cross+=dist(vs[a],vs[b]);nc++}
   for(let a=i-k;a<i;a++)for(let b=a+1;b<i;b++){within+=dist(vs[a],vs[b]);nw++}for(let a=i;a<i+k;a++)for(let b=a+1;b<i+k;b++){within+=dist(vs[a],vs[b]);nw++}
   nov[i]=cross/nc-(nw?within/nw:0)}
  let m=0,c=0;for(const v of nov)if(v>0){m+=v;c++}m=c?m/c:0;
  const cut=[];for(let i=1;i<B;i++){const v=nov[i];if(v<.45||v<m*1.2)continue;let peak=true;for(let j=Math.max(1,i-Math.ceil(minLen/2));j<=Math.min(B-1,i+Math.ceil(minLen/2));j++)if(nov[j]>v||nov[j]===v&&j<i){peak=false;break}if(peak)cut.push(i)}
  const out=[0];for(const i of cut)if(i-out[out.length-1]>=minLen&&B-i>=Math.min(minLen,2))out.push(i);out.push(B);return {edges:out,novelty:Array.from(nov)};
 }
 /* letters: compare each part with the parts already named; the same material returns with the same letter */
 function label(vs,edges){
  const parts=[];for(let i=0;i+1<edges.length;i++)parts.push({a:edges[i],b:edges[i+1],v:mean(vs,edges[i],edges[i+1])});
  const protos=[];for(const p of parts){let best=-1,bd=Infinity;protos.forEach((q,i)=>{const d=dist(p.v,q.v);if(d<bd){bd=d;best=i}});
   if(best>=0&&bd<.55){p.label=best;const q=protos[best];q.n++;for(let d=0;d<DIM;d++)q.v[d]+=(p.v[d]-q.v[d])/q.n}else{p.label=protos.length;protos.push({v:Float64Array.from(p.v),n:1})}}
  const merged=[];for(const p of parts){const l=merged[merged.length-1];if(l&&l.label===p.label)l.b=p.b;else merged.push({...p})}
  return merged;
 }
 function single(D,reason,extra={}){return {ok:true,rhythmic:false,reason,durationSec:D,segmentsPerBar:1,bpm:null,parts:[{index:0,label:'A',colorIndex:0,color:COLORS[0],startSec:0,endSec:D,loopStartSec:0,loopEndSec:D,bars:1,segments:1,segmentsPerBar:1,bpm:null}],...extra}}
 /* analyze({samples,sampleRate}) — samples are best decimated already (decimate()) */
 function analyze({samples,sampleRate}){
  const x=samples,sr=sampleRate,D=x.length/sr;
  if(!(D>0))return {ok:false,reason:'No audio.'};
  if(D<3)return single(D,'Shorter than 3 s: one part.');
  const tp=tempo(x,sr,D);
  if(!tp||tp.contrast<.18||tp.support<.5)return single(D,'No clear meter (drone, texture or effect): one part.',{tempo:tp});
  const F=I.features(x,sr,-.1,D),T=tp.T,beats=track(F,T).filter(t=>t>-.05&&t<D).map(t=>Math.max(0,t));
  if(beats.length<4)return single(D,'Too few beats: one part.',{tempo:tp});
  const bl=barLength(F,beats,T),S=bl.S,downs=[];for(let i=bl.phase;i<beats.length;i+=S)downs.push(beats[i]);
  const barDur=T*S,lastEnd=downs[downs.length-1]+barDur;
  const bars=[];for(let i=0;i<downs.length;i++){const a=downs[i],b=i+1<downs.length?downs[i+1]:lastEnd;if(b<=D+barDur*.25)bars.push([a,Math.min(b,D)])}
  if(bars.length<2)return single(D,'Less than two bars: one part.',{tempo:tp,segmentsPerBar:S});
  const fr=frames(x,sr,D),vs=unitVectors(fr,F,bars),minLen=bars.length>=24?4:2,k=Math.min(4,Math.max(1,Math.floor(bars.length/4)));
  const {edges,novelty}=boundaries(vs,k,minLen),lp=label(vs,edges);
  const fullBar=b=>b[1]-b[0]>=barDur*.9;
  const parts=lp.map((p,i)=>{
   const first=bars[p.a],last=bars[p.b-1];let whole=0;for(let j=p.a;j<p.b;j++)if(fullBar(bars[j]))whole++;
   const loopEnd=fullBar(last)?last[1]:bars[Math.max(p.a,p.b-2)][1];const nBars=Math.max(1,fullBar(last)?p.b-p.a:p.b-p.a-1);
   return {index:i,label:letter(p.label),colorIndex:p.label%COLORS.length,color:COLORS[p.label%COLORS.length],
    startSec:i===0?0:first[0],endSec:i===lp.length-1?D:bars[p.b]?.[0]??D,loopStartSec:first[0],loopEndSec:Math.max(first[0]+barDur*.5,loopEnd),
    bars:nBars,segments:nBars*S,segmentsPerBar:S,bpm:null}});
  for(const p of parts)p.bpm=60*p.segments/(p.loopEndSec-p.loopStartSec);
  return {ok:true,rhythmic:true,durationSec:D,segmentsPerBar:S,bpm:60/T,tempo:tp,barCount:bars.length,beats:beats.length,parts,novelty};
 }
 /* after the worker: put every loop edge on the real attack of the full-rate audio (sample exact, zero crossing) */
 function snap(result,asset){
  if(!result?.ok||!result.rhythmic)return result;const x=asset.monoSamples,sr=asset.sampleRate;
  const at=t=>{const a=I.attackBefore(x,sr,t,.03);return a!=null&&Math.abs(a-t)<.035?a:I.zeroCross(x,sr,t,.0007)};
  const parts=result.parts.map(p=>{const s=at(p.loopStartSec),e=Math.min(asset.originalDuration??x.length/sr,at(p.loopEndSec));return {...p,loopStartSec:s,loopEndSec:e,bpm:60*p.segments/(e-s)}});
  return {...result,parts};
 }
 return Object.freeze({analyze,decimate,snap,COLORS,letter});
}
const __xenSongParts=__xenSongPartsFactory(__xenMeterAnalysis);
/* worker run (keeps the UI responsive on long songs); falls back to the main thread when Blob workers are unavailable */
function __xenAnalyzeSongParts(asset,{signal}={}){
 const d=__xenSongParts.decimate(asset.monoSamples,asset.sampleRate);
 const code="'use strict';const meter=("+__xenMeterAnalysisFactory.toString()+")();const parts=("+__xenSongPartsFactory.toString()+")(meter);"+
  "self.onmessage=e=>{try{self.postMessage({result:parts.analyze(e.data)})}catch(err){self.postMessage({error:String(err&&err.message||err)})}};";
 const run=typeof Worker!=='undefined'&&typeof __xenRunBlobWorker==='function'
  ?__xenRunBlobWorker({code,payload:d,transfer:[d.samples.buffer],signal,timeoutMs:600000,name:'xensonar-song-parts',errorMessage:'Song analysis failed.'}).catch(error=>{if(error?.name==='AbortError')throw error;console.warn('[xensonar][song-parts] worker failed, main thread',error);return __xenSongParts.analyze(__xenSongParts.decimate(asset.monoSamples,asset.sampleRate))})
  :Promise.resolve().then(()=>__xenSongParts.analyze(d));
 return run.then(result=>__xenSongParts.snap(result,asset));
}
