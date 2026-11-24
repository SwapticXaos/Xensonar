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
   // tatum (fastest even pulse) of this window, see PULSE-HIERARCHY in the meter analysis
   const tt=I.tatum(F,w0,w1);if(!tt||tt.f<.35)continue;
   const r=I.refine(F,tt.T,tt.origin,w0,w1,w0,w1),g=I.gridContrast(F,r.T,tt.origin+r.phase,w0,w1,w0,w1);res.push({T:r.T,score:tt.f,contrast:g.contrast,acf:I.acf(F,r.T),fit:tt.f})
  }
  if(!res.length||pulses.filter(Boolean).length<Math.max(1,pulses.length*.5))return res.length?{T:res[0].T,contrast:0,acf:0,support:0,windows:res.length,pulse:false}:null;
  const groups=[];for(const r of res){const g=groups.find(g=>Math.abs(g.T/r.T-1)<.03);if(g){g.items.push(r);g.T=g.items.reduce((a,b)=>a+b.T,0)/g.items.length;g.score+=r.score}else groups.push({T:r.T,items:[r],score:r.score})}
  groups.sort((a,b)=>b.score-a.score);const g=groups[0],contrast=g.items.reduce((a,b)=>a+b.contrast,0)/g.items.length,acf=g.items.reduce((a,b)=>a+b.acf,0)/g.items.length;
  const fit=g.items.reduce((a,b)=>a+b.fit,0)/g.items.length;
  return {T:g.T,contrast,acf,fit,support:g.items.length/res.length,windows:res.length};
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
 /* bar length in tatums (accent repetition, strongest position = "1"), then the counting level (4/4 in eighths -> 4 quarters) */
 /* harmonic change at a time: chroma of the half bar before vs after (sum-normalised), the strongest cue for "1" */
 function harmonicChange(fr,t,W){
  const avg=(a,b)=>{const c=new Float64Array(12);let n=0;for(const f of fr){if(f.t<a)continue;if(f.t>=b)break;for(let k=0;k<12;k++)c[k]+=f.v[NMFCC+k];n++}let s=0;for(const v of c)s+=v;return s>0?c.map(v=>v/s):c};
  const x=avg(t-W,t),y=avg(t,t+W);let d=0;for(let k=0;k<12;k++)d+=(x[k]-y[k])**2;return Math.sqrt(d);
 }
 function barLength(F,beats,T0,fr){
  const prior=S=>I.TATUM_PRIOR(S,T0);
  const ks=beats.map((_,i)=>i),ms=I.meterScoresAt(F,beats,ks,T0,{maxS:32,prior,freePhase:true,minBarSec:1.1});
  let St=0,bs=-Infinity;for(const [S,v] of Object.entries(ms.scores))if(v.score>bs){bs=v.score;St=+S}
  if(!St)return {S:4,phase:0,level:1,St:4,groups:null};
  // a two-bar pattern is still two bars: prefer half the length when it scores nearly as well
  while(St%2===0&&St/2>=3&&ms.scores[St/2]&&ms.scores[St/2].score>=ms.scores[St].score-.2)St/=2;
  let v=ms.scores[St];
  // phase: accent per position plus the harmonic change on it (z-scored) – chords tend to change on "1"
  if(fr&&fr.length){const W=Math.max(.25,Math.min(1.2,St*T0/2)),hc=beats.map(t=>harmonicChange(fr,t,W)),m=hc.reduce((a,b)=>a+b,0)/hc.length,sd=Math.sqrt(hc.reduce((a,b)=>a+(b-m)**2,0)/hc.length)||1;
   const pos=new Array(St).fill(0),cnt=new Array(St).fill(0);hc.forEach((h,i)=>{pos[i%St]+=(h-m)/sd;cnt[i%St]++});
   let best=v.phase,bv=-Infinity;for(let p=0;p<St;p++){const sc=v.positions[p]+1.2*(cnt[p]?pos[p]/cnt[p]:0);if(sc>bv){bv=sc;best=p}}v={...v,phase:best}}
  const rot=Array.from({length:St},(_,p)=>v.positions[(p+v.phase)%St]),lv=I.countingLevel(rot,St,T0);
  return {St,phase:v.phase,level:lv.level,S:lv.S,groups:lv.groups,scores:ms.scores};
 }
 /* spectrum per frame: radix-2 FFT, 8 log bands, 12-bin chroma, level */
 function fft(re,im){const n=re.length;for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]]}}
  for(let len=2;len<=n;len<<=1){const a=-2*Math.PI/len,wr=Math.cos(a),wi=Math.sin(a),h=len>>1;for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let k=0;k<h;k++){const xr=re[i+k+h]*cr-im[i+k+h]*ci,xi=re[i+k+h]*ci+im[i+k+h]*cr;re[i+k+h]=re[i+k]-xr;im[i+k+h]=im[i+k]-xi;re[i+k]+=xr;im[i+k]+=xi;const t=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=t}}}}
 /* timbre = 13 MFCC from 24 mel bands (60–5000 Hz), harmony = 12-bin chroma (110–2000 Hz, 2048-point FFT), plus onset density */
 const NMEL=24,NMFCC=13,DIM=NMFCC+12+1;
 function frames(x,sr,D){
  const N=2048,hop=Math.max(.05,D/30000),win=new Float64Array(N);for(let i=0;i<N;i++)win[i]=.5-.5*Math.cos(2*Math.PI*i/(N-1));
  const nf=Math.max(1,Math.floor((x.length-N)/(hop*sr))+1),out=[],re=new Float64Array(N),im=new Float64Array(N),bin=sr/N,H=N/2;
  const mel=f=>2595*Math.log10(1+f/700),imel=m=>700*(Math.pow(10,m/2595)-1),lo=mel(60),hi=mel(Math.min(5000,sr/2-50)),cent=[];
  for(let i=0;i<NMEL+2;i++)cent.push(imel(lo+(hi-lo)*i/(NMEL+1)));
  const fb=[];for(let m=0;m<NMEL;m++){const w=[];for(let k=1;k<H;k++){const f=k*bin;let g=0;if(f>cent[m]&&f<cent[m+1])g=(f-cent[m])/(cent[m+1]-cent[m]);else if(f>=cent[m+1]&&f<cent[m+2])g=(cent[m+2]-f)/(cent[m+2]-cent[m+1]);if(g>0)w.push(k,g)}fb.push(w)}
  const dct=[];for(let c=0;c<NMFCC;c++){const r=new Float64Array(NMEL);for(let m=0;m<NMEL;m++)r[m]=Math.cos(Math.PI*c*(m+.5)/NMEL);dct.push(r)}
  const pc=new Int16Array(H);for(let k=0;k<H;k++){const f=k*bin;pc[k]=f>=110&&f<=2000?((Math.round(12*Math.log2(f/440)+69)%12)+12)%12:-1}
  const P=new Float64Array(H),lm=new Float64Array(NMEL);
  for(let fi=0;fi<nf;fi++){const o=Math.floor(fi*hop*sr);for(let i=0;i<N;i++){re[i]=(x[o+i]||0)*win[i];im[i]=0}fft(re,im);
   for(let k=1;k<H;k++)P[k]=re[k]*re[k]+im[k]*im[k];
   for(let m=0;m<NMEL;m++){const w=fb[m];let e=0;for(let j=0;j<w.length;j+=2)e+=P[w[j]]*w[j+1];lm[m]=Math.log(1e-10+e)}
   const v=new Float64Array(DIM-1);for(let c=0;c<NMFCC;c++){let e=0;const r=dct[c];for(let m=0;m<NMEL;m++)e+=r[m]*lm[m];v[c]=e}
   let mx=0;const ch=v.subarray(NMFCC,NMFCC+12);for(let k=1;k<H;k++)if(pc[k]>=0)ch[pc[k]]+=Math.sqrt(P[k]);for(let c=0;c<12;c++)mx=Math.max(mx,ch[c]);for(let c=0;c<12;c++)ch[c]=mx>0?ch[c]/mx:0;
   out.push({t:(o+N/2)/sr,v})}
  return out;
 }
 /* one vector per unit (bar, or time block); MFCC dims z-scored (c0 = loudness weighted low), chroma kept 0..1, onset density z-scored */
 function unitVectors(fr,F,units){
  let j0=0;const vs=units.map(([a,b])=>{const v=new Float64Array(DIM);let c=0;while(j0<fr.length&&fr[j0].t<a)j0++;for(let j=j0;j<fr.length&&fr[j].t<b;j++){for(let d=0;d<DIM-1;d++)v[d]+=fr[j].v[d];c++}
   if(c)for(let d=0;d<DIM-1;d++)v[d]/=c;else{const f=fr[Math.min(fr.length-1,j0)];for(let d=0;d<DIM-1;d++)v[d]=f?f.v[d]:0}
   let s=0,n=0;for(let i=Math.max(0,Math.floor((a-F.t0)*F.rate));i<Math.min(F.n,Math.ceil((b-F.t0)*F.rate));i++){s+=F.nov[i];n++}v[DIM-1]=n?s/n:0;return v});
  const weight=d=>d===0?.4:d<NMFCC?1:d<NMFCC+12?2.2:.6;
  for(let d=0;d<DIM;d++){const isChroma=d>=NMFCC&&d<NMFCC+12;let m=0;for(const v of vs)m+=v[d];m/=vs.length;let q=0;for(const v of vs)q+=(v[d]-m)**2;
   const sd=isChroma?1:Math.max(1e-6,Math.sqrt(q/vs.length));for(const v of vs)v[d]=(isChroma?v[d]:(v[d]-m)/sd)*weight(d)}
  return vs;
 }
 const dist=(a,b)=>{let s=0;for(let d=0;d<a.length;d++)s+=(a[d]-b[d])**2;return Math.sqrt(s/a.length)};
 /* relative (scale free) comparisons, tuned on real recordings: every distance is measured against the spread INSIDE the
    material, so a noisy live take and a clean synthetic loop are judged alike. dm = bar-to-bar distance matrix. */
 /* chords that alternate every bar (or cycle over 4) make a part look restless inside: average over a phrase of ~6 s first */
 function phraseSmooth(vs,w){if(w<=1)return vs;const B=vs.length,h=Math.floor(w/2);return vs.map((_,i)=>{const a=Math.max(0,i-h),b=Math.min(B,a+w),m=new Float64Array(DIM);for(let j=a;j<b;j++)for(let d=0;d<DIM;d++)m[d]+=vs[j][d];for(let d=0;d<DIM;d++)m[d]/=b-a;return m})}
 function distMatrix(vs){const B=vs.length,m=new Float64Array(B*B);for(let i=0;i<B;i++)for(let j=i+1;j<B;j++){const d=dist(vs[i],vs[j]);m[i*B+j]=d;m[j*B+i]=d}return m}
 /* repetition profile (second-order similarity): similarity scaled by the median distance, smoothed along diagonals over
    ±L bars (a repeated SEQUENCE becomes a strong stripe), then every bar = its row of similarities to the whole piece;
    two bars of the same kind of part are similar to the same places. Returns 1 − correlation of those rows. */
 function profileDistance(dm,B,L){
  const off=[];for(let i=0;i<B;i++)for(let j=i+1;j<B;j+=Math.max(1,Math.floor(B/60)))off.push(dm[i*B+j]);off.sort((a,b)=>a-b);
  const sig=off[Math.floor(off.length/2)]||1,S=new Float64Array(B*B);for(let i=0;i<B*B;i++){const d=dm[i]/sig;S[i]=Math.exp(-d*d)}
  const Sp=new Float64Array(B*B);for(let i=0;i<B;i++)for(let j=0;j<B;j++){let s=0,c=0;for(let l=-L;l<=L;l++){const a=i+l,b=j+l;if(a<0||b<0||a>=B||b>=B)continue;s+=S[a*B+b];c++}Sp[i*B+j]=s/c}
  const rows=[];for(let i=0;i<B;i++){const r=Sp.subarray(i*B,(i+1)*B);let m=0;for(const v of r)m+=v;m/=B;let q=0;for(const v of r)q+=(v-m)**2;const sd=Math.sqrt(q/B)||1;rows.push(Float64Array.from(r,v=>(v-m)/sd))}
  const R=new Float64Array(B*B);for(let i=0;i<B;i++)for(let j=i+1;j<B;j++){let c=0;const a=rows[i],b=rows[j];for(let k=0;k<B;k++)c+=a[k]*b[k];const d=1-c/B;R[i*B+j]=d;R[j*B+i]=d}
  return R;
 }
 function blockMean(m,B,a0,a1,b0,b1,same){let s=0,n=0;for(let i=a0;i<a1;i++)for(let j=same?i+1:b0;j<b1;j++){s+=m[i*B+j];n++}return n?s/n:0}
 /* energy distance of two bar ranges relative to their inner spread: about 0 for the same material, larger for different */
 let SCALE=.05;   // typical bar-to-neighbour distance of the piece (set per analysis): very even parts are not judged against ~0
 function relDistance(m,B,a0,a1,b0,b1){const cross=blockMean(m,B,a0,a1,b0,b1,false),wa=blockMean(m,B,a0,a1,a0,a1,true),wb=blockMean(m,B,b0,b1,b0,b1,true);
  const within=a1-a0>1&&b1-b0>1?(wa+wb)/2:Math.max(wa,wb);return (cross-within)/Math.max(within,SCALE,.05)}
 function neighbourScale(m,B){const v=[];for(let i=0;i<B;i++){let s=0,c=0;for(let j=i+1;j<=Math.min(B-1,i+4);j++){s+=m[i*B+j];c++}if(c)v.push(s/c)}v.sort((a,b)=>a-b);return v.length?v[Math.floor(v.length/2)]:.05}
 /* boundaries: relative novelty at two scales (4 and 8 bars), peaks at least minLen bars apart */
 function boundaries(m,B,minLen,barDur=2,kernelSec=5){
  // kernels in SECONDS (~5 s and ~10 s), not in bars: the structure must not depend on how the bar was read
  const K1=Math.max(2,Math.min(8,Math.round(kernelSec/barDur))),K2=Math.max(K1+1,Math.min(16,2*K1));
  const nov=new Float64Array(B);
  for(let i=2;i<=B-2;i++){let s=0,c=0;for(const K of [K1,K2]){const k=Math.min(K,i,B-i);if(k<2||(K===K2&&k<Math.ceil(K2*.6)))continue;s+=relDistance(m,B,i-k,i,i,i+k);c++}nov[i]=c?s/c:0}
  const sorted=Array.from(nov.slice(2,B-1)).sort((x,y)=>x-y),med=sorted[Math.floor(sorted.length/2)]??0,mad=(sorted.map(v=>Math.abs(v-med)).sort((x,y)=>x-y)[Math.floor(sorted.length/2)])??0;
  const top=Math.max(...nov),thr=Math.max(.15,Math.min(med+mad,.45*top)),cand=[];
  for(let i=2;i<=B-2;i++){const v=nov[i];if(v<thr)continue;let peak=true;for(let j=Math.max(1,i-minLen+1);j<=Math.min(B-1,i+minLen-1);j++)if(nov[j]>v||nov[j]===v&&j<i){peak=false;break}if(peak)cand.push(i)}
  const out=[0];for(const i of cand)if(i-out[out.length-1]>=minLen&&B-i>=minLen)out.push(i);out.push(B);return {edges:out,novelty:Array.from(nov),threshold:thr};
 }
 /* letters: each part joins the group whose members are closest (average linkage, relative energy distance), else a new letter */
 function label(m,B,edges,minLen){
  let parts=[];for(let i=0;i+1<edges.length;i++)parts.push({a:edges[i],b:edges[i+1]});
  const SAME=.7,groups=[];   // tuned on real + progressive test sets (see tests/song_parts.test.cjs)
  const assign=()=>{groups.length=0;for(const p of parts){let best=-1,bd=Infinity;groups.forEach((g,gi)=>{let w=0,d=0;for(const q of g){const L=q.b-q.a;d+=L*relDistance(m,B,p.a,p.b,q.a,q.b);w+=L}d/=w;if(d<bd){bd=d;best=gi}});   // earlier occurrences weighted by length: a short transition hardly counts
   if(best>=0&&bd<SAME){p.label=best;groups[best].push(p)}else{p.label=groups.length;groups.push([p])}}};
  assign();
  // repeats in a row are one part; a part shorter than minLen joins the more similar neighbour
  // neighbours with the same letter are ONE coherent part; the inner boundaries are kept as sub-sections (drill-down)
  const merge=()=>{const out=[];for(const p of parts){const l=out[out.length-1];if(l&&l.label===p.label){l.subs=[...(l.subs??[[l.a,l.b]]),...(p.subs??[[p.a,p.b]])];l.b=p.b}else out.push({...p})}parts=out};
  merge();
  for(let guard=0;guard<B;guard++){const i=parts.findIndex(p=>p.b-p.a<minLen);if(i<0||parts.length<2)break;
   const L=parts[i-1],R=parts[i+1],p=parts[i];const dl=L?relDistance(m,B,p.a,p.b,L.a,L.b):Infinity,dr=R?relDistance(m,B,p.a,p.b,R.a,R.b):Infinity;
   if(dl<=dr){L.subs=[...(L.subs??[[L.a,L.b]]),[p.a,p.b]];L.b=p.b}else{R.subs=[[p.a,p.b],...(R.subs??[[R.a,R.b]])];R.a=p.a}parts.splice(i,1);assign();merge()}
  // letters in order of first appearance
  const order=new Map();for(const p of parts){if(!order.has(p.label))order.set(p.label,order.size);p.label=order.get(p.label)}
  return parts;
 }
 /* SONG-PARTS-02 · two levels. The fine parts (labelled as above) are grouped into MAIN parts for the overview: a part shorter
    than the main minimum (max(10 s, song/16)) joins the more similar neighbour, the fine pieces stay as its sections (F1, F2 …).
    The letter of a main part is that of its dominant fine part (most bars). */
 function mainParts(m,B,fine,minBars){
  let main=fine.map(p=>({a:p.a,b:p.b,pieces:(p.subs??[[p.a,p.b]]).map(([a,b])=>({a,b,fine:p.label}))}));
  // a short part that RETURNS (hook, refrain, break) is information and stays a main part; only one-off fragments are absorbed
  const count=new Map();for(const p of fine)count.set(p.label,(count.get(p.label)??0)+1);
  const recurring=p=>p.pieces.some(q=>count.get(q.fine)>1);
  for(let guard=0;guard<B&&main.length>1;guard++){
   let i=-1,len=Infinity;main.forEach((p,k)=>{const L=p.b-p.a;if(L<minBars&&L<len&&!recurring(p)){len=L;i=k}});if(i<0)break;
   const p=main[i],L=main[i-1],R=main[i+1],dl=L?relDistance(m,B,p.a,p.b,L.a,L.b):Infinity,dr=R?relDistance(m,B,p.a,p.b,R.a,R.b):Infinity;
   if(dl<=dr){L.b=p.b;L.pieces.push(...p.pieces)}else{R.a=p.a;R.pieces.unshift(...p.pieces)}main.splice(i,1)}
  // a main part is what most of its bars are: its dominant fine part decides the letter, so recurrence keeps the fine judgement
  for(const p of main){const w=new Map();for(const q of p.pieces)w.set(q.fine,(w.get(q.fine)??0)+q.b-q.a);p.label=[...w.entries()].sort((x,y)=>y[1]-x[1]||x[0]-y[0])[0][0]}
  const out=[];for(const p of main){const l=out[out.length-1];if(l&&l.label===p.label){l.b=p.b;l.pieces.push(...p.pieces)}else out.push(p)}
  const order=new Map();for(const p of out){if(!order.has(p.label))order.set(p.label,order.size);p.label=order.get(p.label);p.subs=p.pieces.length>1?p.pieces.map(q=>[q.a,q.b]):null}
  return out;
 }
 /* SUBDIVIDE-02 · sections inside a part (Foote novelty, the standard method for "where does the music change"):
    MFCC + chroma per counted beat, cosine self-similarity, checkerboard kernel (~4 s), peaks with prominence,
    the strongest kept at phrase distance (≥ 4 bars / ≥ 4 s), each snapped to the nearest bar line within half a bar.
    Tuned against a librosa reference (Foote + Laplacian) on three Udio prog songs: F 0.76, precision 0.88. */
 function footeSections(fr,F,units,downs,barSec,opt={}){
  const n=units.length;if(n<8)return [];
  const vs=unitVectors(fr,F,units),V=vs.map(v=>{let q=0;for(const x of v)q+=x*x;q=Math.sqrt(q)||1;return v.map(x=>x/q)});
  const unitSec=(units[n-1][1]-units[0][0])/n,k=Math.max(4,Math.min(16,Math.round((opt.kernelSec??5)/unitSec)));
  const sim=(i,j)=>{let c=0;const a=V[i],b=V[j];for(let d=0;d<a.length;d++)c+=a[d]*b[d];return c};
  const g=[];for(let a=-k;a<k;a++){const w=Math.exp(-.5*((a+.5)/(k/2))**2);g.push(w)}
  const nov=new Float64Array(n);
  for(let i=k;i<=n-k;i++){let s=0;for(let a=-k;a<k;a++)for(let b=-k;b<k;b++){const sign=(a<0)===(b<0)?1:-1;s+=sign*g[a+k]*g[b+k]*sim(i+a,i+b)}nov[i]=s}
  let mx=0;for(const v of nov)mx=Math.max(mx,v);if(!(mx>0))return [];for(let i=0;i<n;i++)nov[i]=Math.max(0,nov[i]/mx);
  /* two more cues a listener (and the eye on the waveform) uses: a LOUDNESS step (rises count more than drops) and a change of
     TONAL centre (mean chroma over ~8 s before vs after). Each normalised, then mixed with the timbre/harmony novelty. */
  const lev=units.map(([a,b])=>{const i0=Math.max(0,Math.floor((a-F.t0)*F.rate)),i1=Math.min(F.n,Math.ceil((b-F.t0)*F.rate));let s=0,c=0;for(let i=i0;i<i1;i++){s+=F.cf[i];c++}return c?s/c:0});
  const chroma=units.map(([a,b])=>{const c=new Float64Array(12);let m=0;for(const f of fr){if(f.t<a)continue;if(f.t>=b)break;for(let q=0;q<12;q++)c[q]+=f.v[NMFCC+q];m++}let t=0;for(const v of c)t+=v;return t>0?c.map(v=>v/t):c});
  const kl=k,kt=Math.max(k,Math.min(32,Math.round(8/unitSec))),loud=new Float64Array(n),tonal=new Float64Array(n);
  for(let i=1;i<n;i++){
   const L=Math.min(kl,i,n-i);if(L>=2){let a=0,b=0;for(let j=i-L;j<i;j++)a+=lev[j];for(let j=i;j<i+L;j++)b+=lev[j];const d=(b-a)/L;loud[i]=d>0?d:.6*-d}
   const Tn=Math.min(kt,i,n-i);if(Tn>=3){const A=new Float64Array(12),Bv=new Float64Array(12);for(let j=i-Tn;j<i;j++)for(let q=0;q<12;q++)A[q]+=chroma[j][q];for(let j=i;j<i+Tn;j++)for(let q=0;q<12;q++)Bv[q]+=chroma[j][q];
    let ab=0,aa=0,bb=0;for(let q=0;q<12;q++){ab+=A[q]*Bv[q];aa+=A[q]*A[q];bb+=Bv[q]*Bv[q]}tonal[i]=1-ab/Math.max(1e-9,Math.sqrt(aa*bb))}}
  const norm=a=>{let m2=0;for(const v of a)m2=Math.max(m2,v);if(m2>0)for(let i=0;i<a.length;i++)a[i]/=m2};norm(loud);norm(tonal);
  const wT=opt.wTimbre??.6,wL=opt.wLoud??.25,wK=opt.wTonal??.15;
  for(let i=0;i<n;i++)nov[i]=wT*nov[i]+wL*loud[i]+wK*tonal[i];
  mx=0;for(const v of nov)mx=Math.max(mx,v);if(mx>0)for(let i=0;i<n;i++)nov[i]/=mx;
  const cand=[];for(let i=k;i<=n-k;i++){const v=nov[i];if(v<(opt.minRel??.2))continue;let peak=true;for(let j=Math.max(0,i-3);j<=Math.min(n-1,i+3);j++)if(nov[j]>v||nov[j]===v&&j<i){peak=false;break}if(!peak)continue;
   let lo=v,ro=v;for(let j=i;j>=Math.max(0,i-k);j--)lo=Math.min(lo,nov[j]);for(let j=i;j<=Math.min(n-1,i+k);j++)ro=Math.min(ro,nov[j]);
   if(v-Math.max(lo,ro)>=(opt.prominence??.08))cand.push({i,v})}
  const minGap=Math.max(opt.minSec??4,4*(barSec||0)),chosen=[];
  for(const c of cand.sort((x,y)=>y.v-x.v)){const t=units[c.i][0];if(chosen.every(u=>Math.abs(u-t)>=minGap-.01))chosen.push(t)}
  const snap=t=>{if(!downs||!downs.length)return t;let best=downs[0];for(const d of downs)if(Math.abs(d-t)<Math.abs(best-t))best=d;return Math.abs(best-t)<=.5*(barSec||1)?best:t};
  const out=[];for(const t of chosen.map(snap).sort((x,y)=>x-y))if(out.every(u=>Math.abs(u-t)>.05))out.push(t);
  return out.filter(t=>t>units[0][0]+1&&t<units[n-1][1]-1);
 }
 function single(D,reason,extra={}){return {ok:true,rhythmic:false,reason,durationSec:D,segmentsPerBar:1,bpm:null,parts:[{index:0,label:'A',colorIndex:0,color:COLORS[0],startSec:0,endSec:D,loopStartSec:0,loopEndSec:D,bars:1,segments:1,segmentsPerBar:1,bpm:null}],...extra}}
 /* analyze({samples,sampleRate}) — samples are best decimated already (decimate()) */
 function analyze({samples,sampleRate,debug=false,mainMinSec=null,sections=null}){
  const x=samples,sr=sampleRate,D=x.length/sr;
  if(!(D>0))return {ok:false,reason:'No audio.'};
  if(D<3)return single(D,'Shorter than 3 s: one part.');
  const tp=tempo(x,sr,D);
  if(sections&&(!tp||tp.fit<.35||tp.contrast<.5||tp.support<.5)){const F0=I.features(x,sr,-.1,D),fr0=frames(x,sr,D),blk=[];for(let t=0;t+.5<=D;t+=.5)blk.push([t,t+.5]);
   return {ok:true,rhythmic:false,durationSec:D,sections:footeSections(fr0,F0,blk,null,0,sections).map(t=>Math.round(t*1000)/1000)}}
  if(!tp||tp.fit<.35||tp.contrast<.5||tp.support<.5)return single(D,'No clear meter (drone, texture or effect): one part.',{tempo:tp});
  const F=I.features(x,sr,-.1,D),T=tp.T,beats=track(F,T).filter(t=>t>-.05&&t<D).map(t=>Math.max(0,t));
  if(beats.length<4)return single(D,'Too few beats: one part.',{tempo:tp});
  const fr=frames(x,sr,D),bl=barLength(F,beats,T,fr),S=bl.S,St=bl.St,downs=[];let segGrid=beats;
  if(bl.level>1){
   /* even meter: follow the beats once more on the counting level (quarters) – rubato and ritardandi lose fewer beats there
      than on the fast tatum grid; the "1" is placed again (accent + harmonic change) on those beats */
   const Tc=T*bl.level,cb=track(F,Tc).filter(t=>t>-.05&&t<D).map(t=>Math.max(0,t));
   const ms=I.meterScoresAt(F,cb,cb.map((_,i)=>i),Tc,{maxS:S,freePhase:true}),v=ms.scores[S];
   let ph=v?v.phase:0;
   if(v&&fr.length){const W=Math.max(.25,Math.min(1.2,S*Tc/2)),hc=cb.map(t=>harmonicChange(fr,t,W)),m=hc.reduce((a,b)=>a+b,0)/hc.length,sd=Math.sqrt(hc.reduce((a,b)=>a+(b-m)**2,0)/hc.length)||1;
    const pos=new Array(S).fill(0),cnt=new Array(S).fill(0);hc.forEach((h,i)=>{pos[i%S]+=(h-m)/sd;cnt[i%S]++});let bv=-Infinity;for(let p=0;p<S;p++){const sc=v.positions[p]+1.2*(cnt[p]?pos[p]/cnt[p]:0);if(sc>bv){bv=sc;ph=p}}}
   for(let i=ph;i<cb.length;i+=S)downs.push(cb[i]);segGrid=cb;
  }else{for(let i=bl.phase;i<beats.length;i+=St)downs.push(beats[i]);segGrid=beats}
  const barDur=T*St,lastEnd=downs[downs.length-1]+barDur;
  if(sections){const units=[];for(let i=0;i+1<segGrid.length;i++)if(segGrid[i]>=0&&segGrid[i+1]<=D)units.push([segGrid[i],segGrid[i+1]]);
   return {ok:true,rhythmic:true,durationSec:D,segmentsPerBar:S,bpm:60/(T*bl.level),sections:footeSections(fr,F,units,downs,barDur,sections).map(t=>Math.round(t*1000)/1000)}}
  const bars=[];for(let i=0;i<downs.length;i++){const a=downs[i],b=i+1<downs.length?downs[i+1]:lastEnd;if(b<=D+barDur*.25)bars.push([a,Math.min(b,D)])}
  if(bars.length<2)return single(D,'Less than two bars: one part.',{tempo:tp,segmentsPerBar:S});
  /* sections (Subdivide by analysis): a finer phrase smoothing, kernel and minimum, and NO merging of similar neighbours –
     verse lines and phrases are alike and still separate sections */
  const sec=sections||{},smoothSec=sec.smoothSec??6,minSec=sec.minSec??4,kernelSec=sec.kernelSec??5;
  const vs=unitVectors(fr,F,bars),B=vs.length,dm=profileDistance(distMatrix(phraseSmooth(vs,Math.max(1,Math.min(4,Math.round(smoothSec/barDur))))),B,2),__scale=(SCALE=neighbourScale(dm,B)),minLen=Math.max(2,Math.min(8,Math.round(minSec/barDur)));
  const bd=B>=2*minLen?boundaries(dm,B,minLen,barDur,kernelSec):{edges:[0,B],novelty:[],threshold:0},{novelty}=bd;
  /* the diagonal smoothing blurs a change by about a bar: an edge moves by one bar when the raw bar features change clearly (25 %) more sharply there */
  const raw=distMatrix(vs),sharp=i=>{const k=Math.min(2,i,B-i);if(k<1)return -Infinity;let c=0,n=0;for(let a=i-k;a<i;a++)for(let b=i;b<i+k;b++){c+=raw[a*B+b];n++}return c/n-(k>1?(raw[(i-2)*B+i-1]+raw[i*B+i+1])/2:0)};
  const edges=bd.edges.map((e,j,all)=>{if(j===0||j===all.length-1)return e;const b0=sharp(e);let best=e,bv=b0;for(const d of [-1,1]){const i=e+d;if(i<=all[j-1]||i>=all[j+1])continue;const v=sharp(i);if(v>bv&&v>b0+.25*Math.abs(b0)){bv=v;best=i}}return best});
  // mainMinSec: a finer scale for "Subdivide by analysis" of one part (sections may be short there)
  const lp=mainParts(dm,B,label(dm,B,edges,minLen),Math.max(2,Math.ceil((mainMinSec>0?mainMinSec:Math.max(10,D/20))/barDur)));
  const fullBar=b=>b[1]-b[0]>=barDur*.9;
  const parts=lp.map((p,i)=>{
   const first=bars[p.a],last=bars[p.b-1];let whole=0;for(let j=p.a;j<p.b;j++)if(fullBar(bars[j]))whole++;
   const loopEnd=fullBar(last)?last[1]:bars[Math.max(p.a,p.b-2)][1];const nBars=Math.max(1,fullBar(last)?p.b-p.a:p.b-p.a-1);
   return {index:i,label:letter(p.label),colorIndex:p.label%COLORS.length,color:COLORS[p.label%COLORS.length],
    startSec:i===0?0:first[0],endSec:i===lp.length-1?D:bars[p.b]?.[0]??D,loopStartSec:first[0],loopEndSec:Math.max(first[0]+barDur*.5,loopEnd),
    bars:nBars,segments:nBars*S,segmentsPerBar:S,bpm:null,
    subParts:(p.subs&&p.subs.length>1)?p.subs.map(([a,b])=>{const s0=bars[a][0],e0=bars[b-1][1];const n=Math.max(1,b-a);return {startSec:s0,endSec:bars[b]?.[0]??Math.min(D,e0),loopStartSec:s0,loopEndSec:Math.min(D,e0),bars:n,segments:n*S,segmentsPerBar:S,bpm:60*n*S/Math.max(1e-6,Math.min(D,e0)-s0)}}):null}});
  for(const p of parts)p.bpm=60*p.segments/(p.loopEndSec-p.loopStartSec);
  /* meter per part: a part may have its own bar (4/4 verse, 7/8 bridge). Same tatum, own bar length, own "1", own counting
     level; taken only when it explains the part clearly better than the song meter */
  for(const p of parts){
   const pb=beats.filter(t=>t>=p.startSec-T*.3&&t<p.endSec-T*.3);if(pb.length<24)continue;
   const own=barLength(F,pb,T,fr);if(!own.scores||own.St===St||own.St%St===0||St%own.St===0)continue;   // 8 vs 4 is the same meter read twice
   const sOwn=own.scores[own.St]?.score??-Infinity,sSong=own.scores[St]?.score??-Infinity;if(!(sOwn>sSong+.25))continue;
   const start=pb[own.phase],bar=own.St*T,n=Math.max(1,Math.floor((p.endSec-start)/bar+.25)),segBpm=60/(T*own.level);
   // only a meter one can count and loop: 50–240 per minute, a bar of 0.9–4.5 s, at least 6 bars in the part
   if(segBpm<50||segBpm>240||bar<.9||bar>4.5||n<6)continue;
   Object.assign(p,{loopStartSec:start,loopEndSec:Math.min(D,start+n*bar),bars:n,segments:n*own.S,segmentsPerBar:own.S,groups:own.groups,ownMeter:true});
   p.bpm=60*p.segments/(p.loopEndSec-p.loopStartSec);
  }
  // after a part with its own meter the song grid is shifted: the next part starts where the last bar of that part ends
  for(let i=1;i<parts.length;i++){const a=parts[i-1],p=parts[i];if(!a.ownMeter||p.ownMeter)continue;
   if(Math.abs(p.loopStartSec-a.loopEndSec)<barDur*.6){const start=a.loopEndSec,n=Math.max(1,Math.floor((p.endSec-start)/barDur+.25));
    Object.assign(p,{loopStartSec:start,loopEndSec:Math.min(D,start+n*barDur),bars:n,segments:n*S});p.bpm=60*p.segments/(p.loopEndSec-p.loopStartSec)}}
  // the grid for snapping and for edited parts: counting-level beats and bar lines (seconds, 1 ms)
  const r3=t=>Math.round(t*1000)/1000,grid={segments:segGrid.filter(t=>t>=0&&t<=D).map(r3),bars:downs.filter(t=>t>=0&&t<=D).map(r3),barSec:barDur,segmentsPerBar:S};
  return {ok:true,rhythmic:true,durationSec:D,grid,segmentsPerBar:S,groups:bl.groups,tatumsPerBar:St,bpm:60/(T*bl.level),tempo:tp,barCount:bars.length,beats:beats.length,parts,novelty,...(debug?{debug:{bars,dm:Array.from(dm),threshold:bd.threshold}}:{})};
 }
 /* after the worker: put every loop edge on the real attack of the full-rate audio (sample exact, zero crossing) */
 function snap(result,asset){
  if(!result?.ok||!result.rhythmic)return result;const x=asset.monoSamples,sr=asset.sampleRate;
  const at=t=>{const a=I.attackBefore(x,sr,t,.03);return a!=null&&Math.abs(a-t)<.035?a:I.zeroCross(x,sr,t,.0007)};
  const total=asset.originalDuration??x.length/sr,fix=p=>{const s=at(p.loopStartSec),e=Math.min(total,at(p.loopEndSec));return {...p,loopStartSec:s,loopEndSec:e,bpm:60*p.segments/(e-s)}};
  const parts=result.parts.map(p=>({...fix(p),subParts:p.subParts?p.subParts.map(fix):null}));
  return {...result,parts};
 }
 return Object.freeze({analyze,decimate,snap,COLORS,letter});
}
const __xenSongParts=__xenSongPartsFactory(__xenMeterAnalysis);
/* worker run (keeps the UI responsive on long songs); falls back to the main thread when Blob workers are unavailable */
function __xenAnalyzeSongParts(asset,{signal,range=null,mainMinSec=null,sections=null}={}){
 /* range: analyse only [start, end) of the audio (Subdivide by analysis); times come back in song time */
 const sr=asset.sampleRate,off=range?Math.max(0,range.startSec):0,full=asset.monoSamples;
 const src=range?full.subarray(Math.floor(off*sr),Math.min(full.length,Math.ceil(range.endSec*sr))):full;
 const d={...__xenSongParts.decimate(src,sr),mainMinSec,sections};
 const code="'use strict';const meter=("+__xenMeterAnalysisFactory.toString()+")();const parts=("+__xenSongPartsFactory.toString()+")(meter);"+
  "self.onmessage=e=>{try{self.postMessage({result:parts.analyze(e.data)})}catch(err){self.postMessage({error:String(err&&err.message||err)})}};";
 const run=typeof Worker!=='undefined'&&typeof __xenRunBlobWorker==='function'
  ?__xenRunBlobWorker({code,payload:d,transfer:[d.samples.buffer],signal,timeoutMs:600000,name:'xensonar-song-parts',errorMessage:'Song analysis failed.'}).catch(error=>{if(error?.name==='AbortError')throw error;console.warn('[xensonar][song-parts] worker failed, main thread',error);return __xenSongParts.analyze({...__xenSongParts.decimate(src,sr),mainMinSec,sections})})
  :Promise.resolve().then(()=>__xenSongParts.analyze(d));
 const shift=r=>{if(!off||!r?.ok)return r;if(r.sections&&!r.parts)return {...r,offsetSec:off,sections:r.sections.map(t=>t+off)};const o=t=>t+off,sh=p=>({...p,startSec:o(p.startSec),endSec:o(p.endSec),loopStartSec:o(p.loopStartSec),loopEndSec:o(p.loopEndSec)});
  return {...r,offsetSec:off,parts:r.parts.map(p=>({...sh(p),subParts:p.subParts?p.subParts.map(sh):null})),grid:r.grid?{...r.grid,segments:r.grid.segments.map(o),bars:r.grid.bars.map(o)}:null}};
 return run.then(result=>{const r=shift(result);return r?.parts?__xenSongParts.snap(r,asset):r});
}
