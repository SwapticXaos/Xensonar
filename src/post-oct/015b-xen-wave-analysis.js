/* XenSonar Wave Editor: audio analysis (tempo, root in Hz, tuning system, scale, key changes). AUDIO-ANALYSE-01.
 * A pure READING tool of the Wave Editor: it never changes audio, selection or history and has nothing to do with the Spectral Forge.
 * The pitch-line extractor below is the one the Forge's "Transform to Carrier" uses (single owner now: this file; lab.js calls it by name).
 * Plain global functions of a classic script: they are stringified into one Worker on demand (KALT: nothing runs until the button is pressed). */
/* Minimal DSP tools the extractor and the analysis need (same maths as the Forge gestalt tools, which are private to the main bundle). */
function __xenAnalysisToolsFactory(){
  const TAU=Math.PI*2,PHASES=64;
  function fft(re,im,inverse){const n=re.length;for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t}}
    for(let len=2;len<=n;len<<=1){const ang=(inverse?TAU:-TAU)/len,wr=Math.cos(ang),wi=Math.sin(ang);for(let s=0;s<n;s+=len){let ar=1,ai=0;for(let j=0;j<len/2;j++){const a=s+j,b=a+len/2,br=re[b]*ar-im[b]*ai,bi=re[b]*ai+im[b]*ar;re[b]=re[a]-br;im[b]=im[a]-bi;re[a]+=br;im[a]+=bi;const nr=ar*wr-ai*wi;ai=ar*wi+ai*wr;ar=nr}}}
    if(inverse)for(let i=0;i<n;i++){re[i]/=n;im[i]/=n}}
  function makeSincKernel(step){
    if(step<=1.02)return null;
    const cutoff=1/step,radius=Math.min(64,Math.ceil(8*step)),taps=radius*2,table=new Float64Array((PHASES+1)*taps);
    for(let phase=0;phase<=PHASES;phase++){const f=phase/PHASES,row=phase*taps;let total=0;
      for(let q=0;q<taps;q++){const x=(f+radius-1-q)*cutoff;if(Math.abs(x)>=8)continue;const w=(Math.abs(x)<1e-9?1:Math.sin(Math.PI*x)/(Math.PI*x))*(.5+.5*Math.cos(Math.PI*x/8))*cutoff;table[row+q]=w;total+=w;}
      const factor=1/Math.max(1e-9,total);for(let q=0;q<taps;q++)table[row+q]*=factor;}
    return {table,radius,taps,phases:PHASES};
  }
  function resample(model,run,position,kernel){
    const mid=Math.floor(position),f=(position-mid)*kernel.phases,phase=Math.min(kernel.phases-1,Math.floor(f)),blend=f-phase,row=phase*kernel.taps,next=row+kernel.taps,first=mid-kernel.radius+1,samples=model.samples;
    let value=0;for(let q=0;q<kernel.taps;q++){const i=first+q;if(i>=run.sourceStart&&i<=run.sourceEnd)value+=samples[i]*(kernel.table[row+q]*(1-blend)+kernel.table[next+q]*blend);}
    return value;
  }
  return {fft,makeSincKernel,resample};
}
/* Offline pitch extraction (harmonic-pitch-skeleton-v1), moved here unchanged from the Forge room. The Forge's "Transform to Carrier" keeps calling it by name. */
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
/* Tempo, tuning, root and scale on top of the pitch lines. */
function __audioAnalysisFactory(tools,carrier) {
  /* Tempo + tuning + root + scale of an audio region. Built on the pitch lines of the Carrier extraction
     (carrier.analyze) and one onset envelope. Everything is a fit with a chance correction, never a lookup. */
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),BP=1901.955,NOTE=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'],mod=(x,m)=>((x%m)+m)%m;
  const JI5=[0,111.73,203.91,315.64,386.31,498.04,590.22,701.96,813.69,884.36,1017.6,1088.27];
  const JI7=JI5.concat([231.17,266.87,582.51,617.49,933.13,968.83]).sort((a,b)=>a-b);
  const SYSTEMS=[5,7,12,14,17,19,22,24,31,41,53].map(n=>({id:n+'-EDO',label:n+'-EDO',n,period:1200,grid:Array.from({length:n},(_,i)=>1200*i/n)}))
    .concat([{id:'13ED3',label:'Bohlen–Pierce (13 per 3:1)',n:13,period:BP,grid:Array.from({length:13},(_,i)=>BP*i/13)},
      {id:'JI5',label:'Just intonation (5-limit)',n:12,period:1200,grid:JI5,just:true},{id:'JI7',label:'Just intonation (7-limit)',n:18,period:1200,grid:JI7,just:true}]);
  const SCALES=[['Major (Ionian)','0 2 4 5 7 9 11'],['Natural minor (Aeolian)','0 2 3 5 7 8 10'],['Dorian','0 2 3 5 7 9 10'],['Phrygian','0 1 3 5 7 8 10'],['Lydian','0 2 4 6 7 9 11'],['Mixolydian','0 2 4 5 7 9 10'],['Locrian','0 1 3 5 6 8 10'],['Harmonic minor','0 2 3 5 7 8 11'],['Melodic minor','0 2 3 5 7 9 11'],['Phrygian dominant','0 1 4 5 7 8 10'],['Double harmonic','0 1 4 5 7 8 11'],['Hungarian minor','0 2 3 6 7 8 11'],['Whole tone','0 2 4 6 8 10'],['Octatonic (dim.)','0 2 3 5 6 8 9 11'],['Pentatonic major','0 2 4 7 9'],['Pentatonic minor','0 3 5 7 10'],['Blues','0 3 5 6 7 10']].map(([name,set])=>({name,semis:set.split(' ').map(Number)}));
  const luts=new Map();
  function lut(sys){ // integer cent -> nearest grid step (circular)
    let t=luts.get(sys.id);if(t)return t;const L=Math.ceil(sys.period);t=new Int16Array(L);
    for(let x=0;x<L;x++){let best=0,bd=1e9;for(let j=0;j<sys.grid.length;j++){const d=Math.abs(mod(x-sys.grid[j]+sys.period/2,sys.period)-sys.period/2);if(d<bd){bd=d;best=j;}}t[x]=best;}
    luts.set(sys.id,t);return t;
  }
  const dev=(x,sys,j)=>mod(x-sys.grid[j]+sys.period/2,sys.period)-sys.period/2;
  /* ---------- tempo ---------- */
  function tempo(samples,sampleRate,progress){
    const f=Math.max(1,Math.floor(sampleRate/12000)),rate=sampleRate/f,n=Math.floor(samples.length/f),x=new Float32Array(n);
    for(let i=0;i<n;i++){let s=0;for(let k=0;k<f;k++)s+=samples[i*f+k];x[i]=s/f;}
    const N=1024,H=Math.max(32,Math.round(rate/100)),fe=rate/H,frames=Math.floor((n-N)/H);
    if(frames<fe*4)return null;
    const k0=Math.ceil(40*N/rate),k1=Math.floor(Math.min(5000,rate*.45)*N/rate),hann=Float64Array.from({length:N},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/(N-1)));
    const re=new Float64Array(N),im=new Float64Array(N),prev=new Float64Array(k1-k0),env=new Float64Array(frames);
    for(let t=0;t<frames;t++){
      for(let i=0;i<N;i++){re[i]=x[t*H+i]*hann[i];im[i]=0;}
      tools.fft(re,im);let flux=0;
      for(let k=k0;k<k1;k++){const l=Math.log1p(300*Math.hypot(re[k],im[k])/(N/4));if(t)flux+=Math.max(0,l-prev[k-k0]);prev[k-k0]=l;}
      env[t]=flux;if(t%512===0)progress(.2*t/frames);
    }
    const w=Math.round(fe*.5),cum=new Float64Array(frames+1);for(let i=0;i<frames;i++)cum[i+1]=cum[i]+env[i];
    let peakEnv=0;for(let i=0;i<frames;i++){const a=Math.max(0,i-w),b=Math.min(frames,i+w+1);env[i]=Math.max(0,env[i]-(cum[b]-cum[a])/(b-a));peakEnv=Math.max(peakEnv,env[i]);}
    if(peakEnv<1e-6)return null;
    let size=1;while(size<2*frames)size<<=1;const ar=new Float64Array(size),ai=new Float64Array(size);let mean=0;for(let i=0;i<frames;i++)mean+=env[i];mean/=frames;
    for(let i=0;i<frames;i++)ar[i]=env[i]-mean;
    tools.fft(ar,ai);for(let i=0;i<size;i++){ar[i]=ar[i]*ar[i]+ai[i]*ai[i];ai[i]=0;}tools.fft(ar,ai,true);
    const ac=new Float64Array(Math.floor(fe*5)+2);for(let l=0;l<ac.length;l++)ac[l]=ar[l]/ar[0]*frames/Math.max(1,frames-l);
    const at=p=>{const i=Math.floor(p),fr=p-i;return i+1<ac.length?ac[i]*(1-fr)+ac[i+1]*fr:0;};
    const WK=[1,.75,.55,.4],WS=WK.reduce((a,b)=>a+b,0),raw=b=>{const L=60*fe/b;let s=0;for(let k=0;k<4;k++)s+=WK[k]*at(L*(k+1));return Math.max(0,s/WS);};
    const grid=[];for(let b=45;b<=230;b+=.25)grid.push({b,s:raw(b),p:raw(b)*Math.exp(-.5*(Math.log2(b/110)/.9)**2)});
    let top=grid[0];for(const g of grid)if(g.p>top.p)top=g;
    let best=top.b,bs=top.s;for(let b=top.b-1.5;b<=top.b+1.5;b+=.05){const s=raw(b);if(s>bs){bs=s;best=b;}}
        let mu=0,sd=0;for(const g of grid)mu+=g.s;mu/=grid.length;for(const g of grid)sd+=(g.s-mu)**2;sd=Math.sqrt(sd/grid.length);
    const z=(bs-mu)/(sd||1),confidence=clamp((z-2.5)/3,0,1)*clamp(bs/.25,0,1);
    const alt=[2,.5].map(m=>({bpm:best*m,strength:raw(best*m)/Math.max(bs,1e-9)})).filter(a=>a.bpm>=40&&a.bpm<=240);
    return {bpm:Math.round(best*10)/10,confidence,alternatives:alt.map(a=>({bpm:Math.round(a.bpm*10)/10,strength:Math.round(a.strength*100)/100}))};
  }
  /* ---------- tuning / root / scale ---------- */
  const tolOf=sys=>sys.just?9:Math.min(14,sys.period/sys.n*.25);
  function fold(obs,period){const L=Math.ceil(period),H=new Float64Array(L);for(const o of obs)H[Math.round(mod(o.c,period))%L]+=o.w;return H;}
  function smooth(H,tol){const L=H.length,t=Math.max(1,Math.floor(tol)),K=new Float64Array(L);for(let i=0;i<L;i++){let s=0;for(let d=-t;d<=t;d++)s+=H[(i+d+L)%L]*(1-Math.abs(d)/(t+1));K[i]=s;}return K;}
  function fitSystems(obs,total){
    const folded=new Map(),kernels=new Map(),out=[];
    for(const sys of SYSTEMS){
      const tol=tolOf(sys),t=Math.max(1,Math.floor(tol));let H=folded.get(sys.period);if(!H){H=fold(obs,sys.period);folded.set(sys.period,H);}
      const key=sys.period+':'+t;let K=kernels.get(key);if(!K){K=smooth(H,tol);kernels.set(key,K);}
      const L=K.length,maxOff=sys.just?L:Math.ceil(sys.period/sys.n),g=sys.grid.map(Math.round);let bf=-1,bo=0;
      for(let o=0;o<maxOff;o++){let f=0;for(let j=0;j<g.length;j++)f+=K[(g[j]+o)%L];if(f>bf){bf=f;bo=o;}}
      const f=bf/total,p=Math.min(.95,sys.grid.length*(t+1)/L),score=(f-p)/(1-p)-.035*Math.abs(Math.log2(sys.grid.length/12));
      out.push({sys,offset:bo,score});
    }
    return out.sort((a,b)=>b.score-a.score);
  }
  function refine(obs,sys,offset){ // mean deviation of the observations that sit near a grid step
    const t=lut(sys),L=t.length,tol=tolOf(sys),span=sys.just?sys.period:sys.period/sys.n;let s=0,c=0;
    for(const o of obs){const x=mod(Math.round(o.c-offset),L),d=dev(o.c-offset,sys,t[x]);if(Math.abs(d)<=tol){s+=d*o.w;c+=o.w;}}
    return mod(c?offset+s/c:offset,span);
  }
  function templates(sys){
    if(sys.id==='13ED3')return {n:13,cls:j=>j,list:[{name:'Bohlen–Pierce Lambda',set:[0,2,3,4,6,7,9,10,12]}]};
    if(sys.just)return {n:12,cls:j=>Math.round(sys.grid[j]/100)%12,list:SCALES.map(s=>({name:s.name,set:s.semis}))};
    if(sys.n<12)return {n:sys.n,cls:j=>j,list:[]};
    const list=[];for(const s of SCALES){const set=[...new Set(s.semis.map(v=>Math.round(v*sys.n/12)%sys.n))];if(set.length===s.semis.length)list.push({name:s.name,set});}
    return {n:sys.n,cls:j=>j,list};
  }
  function hist(obs,sys,offset,tpl){
    const t=lut(sys),L=t.length,D=new Float64Array(tpl.n),B=new Float64Array(tpl.n);let d=0,b=0;
    for(const o of obs){const k=tpl.cls(t[mod(Math.round(o.c-offset),L)]);D[k]+=o.w;d+=o.w;if(o.b){B[k]+=o.w;b+=o.w;}}
    for(let k=0;k<tpl.n;k++){D[k]/=d||1;B[k]/=b||1;}
    return {D,B,bass:b};
  }
  function pickScale(D,B,tpl){
    const n=tpl.n,five=Math.round(n*7/12),mix=Float64Array.from(D,(d,k)=>d+.5*B[k]),mx=Math.max(...mix)||1,res=[];
    for(const T of tpl.list)for(let r=0;r<n;r++){
      let inside=0,cov=0;for(const k of T.set){const d=(k+r)%n;inside+=D[d];if(D[d]>=.03)cov++;}
      res.push({name:T.name,root:r,inside,score:inside*(.6+.4*cov/T.set.length)+.08*mix[r]/mx+.02*mix[(five+r)%n]/mx,set:T.set});
    }
    return res.sort((x,y)=>y.score-x.score);
  }
  function describe(rootCents){
    const n=Math.round(rootCents/100),midi=69+n,d=rootCents-100*n,exact=Math.abs(d)<1.5;
    return {name:NOTE[mod(midi,12)]+(Math.floor(midi/12)-1),approx:!exact,cents:Math.round(d*10)/10};
  }
  const r2=v=>Math.round(v*100)/100,sameFamily=(a,b)=>a.period===b.period&&!a.just&&!b.just&&(a.n%b.n===0||b.n%a.n===0);
  function infer(obs){
    if(obs.length<40)return null;
    let total=0;for(const o of obs)total+=o.w;
    const fits=fitSystems(obs,total),best=fits[0];if(best.score<.3)return {tuning:[],none:true,observations:obs.length};
    const sys=best.sys,offset=refine(obs,sys,best.offset),second=fits.find(f=>f!==best&&!sameFamily(f.sys,sys));
    const gap=best.score-(second?second.score:0),tuning=[{id:sys.id,label:sys.label,fit:r2(clamp(best.score,0,1)),confidence:r2(clamp(best.score,0,1)*(.55+.45*clamp(gap/.35,0,1)))}];
    for(const f of fits.slice(1)){if(tuning.length>=3||f.score<Math.max(.3,best.score-.25))break;if(!sameFamily(f.sys,sys))tuning.push({id:f.sys.id,label:f.sys.label,fit:r2(clamp(f.score,0,1))});}
    const tpl=templates(sys),{D,B}=hist(obs,sys,offset,tpl),ranked=tpl.list.length?pickScale(D,B,tpl):[],top=ranked[0],named=top&&top.inside>=.8;
    const mix=Array.from(D,(d,k)=>d+.5*B[k]),rootDegree=named?top.root:mix.indexOf(Math.max(...mix));
    const centsOf=r=>mod(offset+(sys.just?JI5[r]:sys.period*r/sys.n),sys.period);
    const low=(obs.some(o=>o.b)?obs.filter(o=>o.b):obs).map(o=>o.c).sort((a,b)=>a-b),ref=low[Math.floor(low.length*.25)];
    const hzOf=r=>{const c=centsOf(r),k=Math.round((ref-c)/sys.period);return {c:c+k*sys.period,hz:Math.round(440*2**((c+k*sys.period)/1200)*100)/100};};
    const rootAt=hzOf(rootDegree);let scale=null,confidence=r2(clamp(Math.max(...D)*.5,0,.5));
    if(top){
      const other=ranked.find(r=>r.root!==top.root||r.set.join()!==top.set.join()),gapS=top.score-(other?other.score:0),alts=[];
      confidence=r2(clamp((top.inside-.7)/.3,0,1)*(.5+.5*clamp(gapS/.05,0,1)));
      for(const r of ranked.slice(1)){if(alts.length>=2||r.score<top.score-.08)break;if(r.name!==top.name||r.root!==top.root)alts.push({name:r.name,rootHz:hzOf(r.root).hz,fit:r2(r.inside)});}
      scale={name:named?top.name:null,fit:r2(top.inside),confidence,alternatives:alts};
    }
    const used=[];for(let k=0;k<tpl.n;k++)if(D[k]>=.03)used.push(mod(k-rootDegree,tpl.n));
    return {tuning,offsetCents:Math.round(offset*10)/10,concertA:sys.id==='12-EDO'?r2(440*2**((offset>50?offset-100:offset)/1200)):null,
      root:{hz:rootAt.hz,...describe(rootAt.c),confidence},scale,degrees:used.sort((a,b)=>a-b),degreeCount:tpl.n,observations:obs.length};
  }
  function sections(obs,duration){
    /* key / tuning changes: the folded pitch histograms of 10 s before and after each 5 s block edge are compared (cosine);
       edges where they part clearly become section borders, every section is then analysed on its own. */
    const B=5,nb=Math.ceil(duration/B),V=Array.from({length:nb},()=>new Float64Array(1200));
    for(const o of obs){const b=Math.min(nb-1,Math.floor(o.t/B));V[b][Math.round(mod(o.c,1200))%1200]+=o.w;}
    const sm=V.map(h=>smooth(h,7)),pair=(a,b)=>{let dot=0,x=0,y=0;for(let i=0;i<1200;i++){dot+=a[i]*b[i];x+=a[i]*a[i];y+=b[i]*b[i];}return x&&y?dot/Math.sqrt(x*y):null;};
    const sum=(from,to)=>{const h=new Float64Array(1200);for(let b=from;b<to;b++)for(let i=0;i<1200;i++)h[i]+=sm[b][i];return h;};
    const cand=[];for(let j=2;j<=nb-2;j++){const c=pair(sum(j-2,j),sum(j,j+2));if(c!==null&&1-c>.3)cand.push({j,d:1-c});}
    cand.sort((a,b)=>b.d-a.d);const cuts=[];for(const c of cand)if(cuts.every(x=>Math.abs(x-c.j)>=3))cuts.push(c.j);
    cuts.sort((a,b)=>a-b);const edges=[0].concat(cuts.map(j=>j*B),[duration]),parts=[];
    for(let i=0;i<edges.length-1;i++){const a=edges[i],b=edges[i+1],r=infer(obs.filter(o=>o.t>=a&&o.t<b));if(r&&!r.none&&r.tuning.length)parts.push({startSec:a,endSec:b,tuning:r.tuning[0],root:r.root,scale:r.scale});}
    return parts.length>1?parts:[];
  }
  function analyze({samples,sampleRate},progress=()=>{}){
    if(!(samples instanceof Float32Array)||!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000)throw Error('Invalid audio source.');
    const duration=samples.length/sampleRate;if(duration<4)throw Error('Please select at least 4 seconds of audio for the analysis.');
    let peak=0;for(let i=0;i<samples.length;i++){const v=samples[i];if(!Number.isFinite(v))throw Error('The source contains invalid audio data.');if(v>peak)peak=v;else if(-v>peak)peak=-v;}
    if(peak>1e-5&&peak<.3){const gain=.5/peak;samples=samples.map(v=>v*gain);} // the noise gate of the pitch lines is absolute: a quiet recording must not read as silence
    const result={durationSec:duration,bpm:null,tonal:null,sections:[]};
    result.bpm=tempo(samples,sampleRate,p=>progress(p));progress(.2);
    const CH=Math.round(55*sampleRate),obs=[];let hop=.02,failure=null;
    try{
      for(let a=0,part=0,parts=Math.ceil(samples.length/CH);a<samples.length;a+=CH,part++){
        const b=Math.min(samples.length,a+CH);if((b-a)/sampleRate<1)continue;
        const r=carrier.analyze({samples:samples.subarray(a,b),sampleRate,options:{voices:3,strictness:.5,noiseDb:-46,minimumMs:90,minHz:45,maxHz:1600}},p=>progress(.2+.7*(part+p)/parts));
        hop=r.hopSec;for(const note of r.notes){const w=1/Math.sqrt(note.pitchHz.length);note.pitchHz.forEach((hz,i)=>obs.push({c:1200*Math.log2(hz/440),t:a/sampleRate+note.startSec+hop*(i+.5),w}));}
      }
    }catch(error){failure=error.message||String(error);}
    const low=new Map();for(const o of obs){const k=Math.round(o.t/hop);if(!low.has(k)||o.c<low.get(k))low.set(k,o.c);}
    for(const o of obs)o.b=low.get(Math.round(o.t/hop))===o.c;
    progress(.92);
    result.tonal=obs.length>=40?infer(obs):null;result.tonalNote=failure||(result.tonal?null:'No stable pitches found.');
    if(result.tonal&&duration>=30)result.sections=sections(obs,duration);
    progress(1);return result;
  }
  return {analyze,tempo,infer};
}
function __analysisTime(seconds){const m=Math.floor(seconds/60);return m+':'+String(Math.floor(seconds-m*60)).padStart(2,'0');}
/* One row list feeds the Wave Editor text and a copy of it, so they can never disagree. */
function __analysisRows(result){
  const pct=v=>Math.round(v*100)+' %',rows=[],tonal=result.tonal,hzText=hz=>(hz>=100?hz.toFixed(1):hz.toFixed(2))+' Hz';
  const noteText=root=>(root.approx?'≈ ':'= ')+root.name+(root.approx&&Math.abs(root.cents)>=1?' '+(root.cents>0?'+':'−')+Math.abs(root.cents)+' ct':'');
  if(result.bpm)rows.push({key:'bpm',label:'Tempo',main:result.bpm.bpm.toFixed(1)+' BPM',acc:result.bpm.confidence,sub:result.bpm.alternatives.length?'or '+result.bpm.alternatives.map(a=>a.bpm+' BPM').join(' / ')+' (half / double time)':''});
  else rows.push({key:'bpm',label:'Tempo',main:'no steady pulse found',sub:''});
  if(tonal&&!tonal.none&&tonal.tuning.length){
    const t=tonal.tuning[0],root=tonal.root,scale=tonal.scale;
    rows.push({key:'root',label:'Root',main:hzText(root.hz)+' '+noteText(root),acc:root.confidence,sub:''});
    rows.push({key:'tuning',label:'Tuning',main:t.label,acc:t.confidence,sub:(tonal.tuning.length>1?'also '+tonal.tuning.slice(1).map(o=>o.label+' ('+pct(o.fit)+' fit)').join(', ')+'. ':'')+(tonal.concertA&&Math.abs(tonal.concertA-440)>=.3?'A4 = '+tonal.concertA.toFixed(1)+' Hz.':'')});
    rows.push({key:'scale',label:'Scale',main:scale&&scale.name?scale.name:'no single scale',acc:scale?scale.confidence:undefined,sub:(scale&&scale.alternatives.length?'or '+scale.alternatives.map(a=>a.name+' on '+hzText(a.rootHz)).join(', ')+'. ':'')+'Steps used above the root: '+tonal.degrees.join(' ')+' (of '+tonal.degreeCount+').'});
  }else rows.push({key:'tonal',label:'Tuning & scale',main:'not determined',sub:tonal&&tonal.none?'No pitch grid fits clearly (free tuning, noise or too little pitched material).':result.tonalNote||'No stable pitches found.'});
  for(const s of result.sections||[])rows.push({key:'sec'+s.startSec,label:__analysisTime(s.startSec)+'–'+__analysisTime(s.endSec),main:hzText(s.root.hz)+' · '+s.tuning.label,acc:s.scale?s.scale.confidence:undefined,sub:(s.scale&&s.scale.name?s.scale.name:'no single scale')+' · '+noteText(s.root),section:true});
  return rows;
}
function __analysisText(result){return __analysisRows(result).map(r=>r.label+': '+r.main+(r.acc!=null?' (accuracy '+Math.round(r.acc*100)+' %)':'')+(r.sub?' · '+r.sub:'')).join('\n');}

function __xenAnalysisWorkerMain(){
  const tools=__xenAnalysisToolsFactory();
  const analyzer=__audioAnalysisFactory(tools,__audioCarrierAnalysisFactory(tools));
  onmessage=({data})=>{try{postMessage({result:analyzer.analyze(data,progress=>postMessage({progress}))});}catch(error){postMessage({error:error?.message||String(error)});}};
}
/* At most 2 minutes go to one worker (the caller cuts them); samples are mono Float32Array and are transferred, never kept. */
const __XEN_AUDIO_ANALYSIS_MAX_SEC=120;
function __xenAudioAnalysisRun(samples,sampleRate,{signal,onProgress=()=>{}}={}){
  const code=[__xenAnalysisToolsFactory.toString(),__audioCarrierAnalysisFactory.toString(),__audioAnalysisFactory.toString(),'('+__xenAnalysisWorkerMain.toString()+')();'].join('\n');
  return __xenRunBlobWorker({code,payload:{samples,sampleRate},transfer:[samples.buffer],signal,onProgress,timeoutMs:240000,timeoutMessage:'The analysis is taking too long. Please select a shorter range.',errorMessage:'Audio analysis failed.'});
}
globalThis.__audioCarrierAnalysisFactory=__audioCarrierAnalysisFactory;
Object.freeze({MAX_SEC:__XEN_AUDIO_ANALYSIS_MAX_SEC,run:__xenAudioAnalysisRun,time:__analysisTime,text:__analysisText,carrierAnalysisFactory:__audioCarrierAnalysisFactory});
