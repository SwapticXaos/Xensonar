(()=>{"use strict";
/* ROOM5-01 · Room V · Psychedelic Lab (deferred chunk, evaluated on first open only).
 * Cold by contract: no timers, listeners or audio nodes while the room is closed.
 * One AudioWorklet engine (xen-psylab-v1) on the LIVE AudioContext, routed into the live master
 * input "main" through the shell bridge, so Rec, Loop-Rec and Live Mastering hear it.
 * Tuning is free: root in Hz plus a scale of ratios / cents / N-EDO of any period; nothing assumes 12-EDO.
 * Data owner: localStorage "xensonar.psylab.instruments.v1" (working patch + user patches).
 * Bounce renders the same engine offline and hands the PCM to __XenMultitrackInbox (durable Material). */
const STORE_KEY='xensonar.psylab.instruments.v1',FORMAT='xensonar.psylab',VERSION=1;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const uid=()=>globalThis.crypto?.randomUUID?.()??(Date.now().toString(36)+Math.random().toString(36).slice(2,8));

/* index, key, label, min, max, default, curve (lin | exp | cube = fine around zero), unit, group */
const PARAMS=[
 [0,'ratioB','B ratio',.125,16,2,'exp','×','hydra'],[1,'ratioC','C ratio',.125,16,3.5,'exp','×','hydra'],
 [2,'fmAB','B → A',0,8,1.2,'lin','','hydra'],[3,'fmBC','C → B',0,8,.8,'lin','','hydra'],
 [4,'fmCA','A → C ring',0,4,.3,'lin','','hydra'],[5,'selfFb','A feedback',0,2,0,'lin','','hydra'],
 [6,'opMix','B in mix',0,1,.2,'lin','','hydra'],[7,'detune','Stereo detune',0,60,8,'lin','ct','hydra'],
 [8,'shepMix','Staircase mix',0,1,0,'lin','','escher'],[9,'shepRate','Rise / fall',-1,1,0,'cube','/s','escher'],
 [10,'shepInterval','Stack interval',1.2,4,2,'exp','×','escher'],
 [11,'fold','Fold',0,1,.15,'lin','','shape'],[12,'cutoff','Cutoff',30,20000,20000,'exp','Hz','shape'],
 [13,'reso','Resonance',0,1,.1,'lin','','shape'],[14,'morph','LP · BP · HP',0,1,0,'lin','','shape'],
 [15,'crush','Dust',0,1,0,'lin','','shape'],
 [16,'attack','Attack',.001,4,.02,'exp','s','env'],[17,'release','Release',.02,12,1.2,'exp','s','env'],
 [18,'glide','Glide',0,2,.04,'lin','s','env'],
 [19,'shiftHz','Shift',-400,400,0,'cube','Hz','spiral'],[20,'shiftMix','Shift mix',0,1,0,'lin','','spiral'],
 [21,'delayTime','Echo time',.01,2,.38,'exp','s','spiral'],[22,'delayFb','Echo feedback',0,1.05,.45,'lin','','spiral'],
 [23,'delayMix','Echo mix',0,1,.3,'lin','','spiral'],[24,'loopShift','Spiral (shift in loop)',-60,60,0,'cube','Hz','spiral'],
 [25,'spread','Ping-pong',0,1,.35,'lin','','spiral'],
 [26,'resMix','Crystal mix',0,1,0,'lin','','crystal'],[27,'resQ','Crystal ring',5,600,80,'exp','Q','crystal'],
 [28,'chaosRate','Chaos speed',.02,30,.4,'exp','','chaos'],[29,'cFold','→ Fold',0,1,0,'lin','','chaos'],
 [30,'cFm','→ FM',0,1,0,'lin','','chaos'],[31,'cShift','→ Shift',0,1,0,'lin','','chaos'],
 [32,'cDelay','→ Echo time',0,1,0,'lin','','chaos'],[33,'cPan','→ Pan',0,1,.2,'lin','','chaos'],
 [34,'cCut','→ Cutoff',0,1,0,'lin','','chaos'],
 [35,'drive','Drive',0,1,.1,'lin','','out'],[36,'level','Level',0,1,.7,'lin','','out'],
 [37,'macro','Pad Y',0,1,0,'lin','','hidden'],[38,'macroDepth','Pad Y depth',0,1,.6,'lin','','out']];
const NPAR=40,BY_KEY=Object.fromEntries(PARAMS.map(p=>[p[1],p]));
const RANGES=(()=>{const lo=new Array(NPAR).fill(0),hi=new Array(NPAR).fill(1),def=new Array(NPAR).fill(0);for(const p of PARAMS){lo[p[0]]=p[3];hi[p[0]]=p[4];def[p[0]]=p[5]}return{lo,hi,def}})();
const GROUPS=[['hydra','HYDRA','Three operators in a feedback ring: A is heard, B bends A, C bends B, A bends C.'],
 ['escher','ESCHER','Endless staircase: a stack of partials that rises or falls forever. The stack interval is free (2 = octaves, 3 = tritaves …).'],
 ['shape','SHAPE','Wavefolder, morphing filter and sample dust.'],['env','ENVELOPE','How notes appear, vanish and slide.'],
 ['spiral','SPIRAL','Frequency shifter and an echo whose repeats are shifted again and again: barber-pole spirals.'],
 ['crystal','CRYSTAL','Resonators tuned to the current scale ring along with the sound.'],
 ['chaos','CHAOS','A Lorenz attractor moves the sound. It never repeats.'],['out','OUT','']];
function toUnit(p,v){const[, , ,lo,hi, ,curve]=p;v=clamp(v,lo,hi);if(curve==='exp')return Math.log(v/lo)/Math.log(hi/lo);if(curve==='cube'){const m=Math.max(Math.abs(lo),Math.abs(hi));return .5+.5*Math.cbrt(v/m)}return(v-lo)/(hi-lo)}
function fromUnit(p,t){const[, , ,lo,hi, ,curve]=p;t=clamp(t,0,1);if(curve==='exp')return lo*Math.pow(hi/lo,t);if(curve==='cube'){const m=Math.max(Math.abs(lo),Math.abs(hi)),x=2*t-1;return clamp(m*x*x*x,lo,hi)}return lo+(hi-lo)*t}
function fmt(p,v){const unit=p[7],a=Math.abs(v);const n=a>=1000?v.toFixed(0):a>=100?v.toFixed(1):a>=10?v.toFixed(2):v.toFixed(3);return unit?n+' '+unit:n}
function defaultParams(){return RANGES.def.slice()}
function sanitizeParams(a){const out=defaultParams();if(Array.isArray(a))for(const p of PARAMS){const v=Number(a[p[0]]);if(Number.isFinite(v))out[p[0]]=clamp(v,p[3],p[4])}out[37]=0;return out}

/* Scale text → ratios within one period. Tokens: "19edo", "13ed3" (N equal steps of a period), ratios "3/2" or "1.5",
   cents "386c", and "@3/1" to set the period for a list. Always sorted, unique, starting at 1. */
function parseScale(text){
 const src=String(text??'').trim().toLowerCase();let period=2;const out=[];let error='';
 const ratio=tok=>{if(/^\d+(\.\d+)?\/\d+(\.\d+)?$/.test(tok)){const[a,b]=tok.split('/').map(Number);return b>0?a/b:NaN}if(/^-?\d+(\.\d+)?c$/.test(tok))return Math.pow(2,parseFloat(tok)/1200);if(/^\d+(\.\d+)?$/.test(tok))return Number(tok);return NaN};
 const ed=/^(\d{1,3})\s*-?\s*ed\s*(o|t|\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?)$/.exec(src.replace(/\s+/g,' '));
 if(ed){const n=clamp(parseInt(ed[1],10),1,200),per=ed[2]==='o'?2:ed[2]==='t'?3:ratio(ed[2]);if(!(per>1.0001)||per>16)return{ratios:[1],period:2,error:'Period must be between 1 and 16.'};
  for(let i=0;i<n;i++)out.push(Math.pow(per,i/n));return{ratios:out,period:per,error:''}}
 for(const tok of src.split(/[\s,;]+/).filter(Boolean)){
  if(tok[0]==='@'){const p=ratio(tok.slice(1));if(p>1.0001&&p<=16)period=p;else error='Bad period "'+tok+'".';continue}
  const r=ratio(tok);if(!(r>0)||!Number.isFinite(r)){error='Cannot read "'+tok+'".';continue}out.push(r)}
 if(!out.length)return{ratios:[1],period,error:error||'Empty scale.'};
 const folded=out.map(r=>{const x=Math.log(r)/Math.log(period);return Math.pow(period,x-Math.floor(x))}).sort((a,b)=>a-b);
 const uniq=[];for(const r of folded)if(!uniq.length||Math.abs(1200*Math.log2(r/uniq[uniq.length-1]))>.5)uniq.push(r);
 if(Math.abs(1200*Math.log2(uniq[0]))>.5)uniq.unshift(1);else uniq[0]=1;
 return{ratios:uniq.slice(0,200),period,error}}
/* degree may be any integer: steps below 0 and above the scale size continue through the periods */
function degreeHz(root,scale,degree){const n=scale.ratios.length,o=Math.floor(degree/n),i=degree-o*n;return root*Math.pow(scale.period,o)*scale.ratios[i]}
function resonatorHz(root,scale){const n=scale.ratios.length,out=[];const step=Math.max(1,Math.round(n/7));for(let d=0;out.length<8&&d<n*3;d+=step){const hz=degreeHz(root,scale,d);if(hz>30&&hz<12000)out.push(hz)}return out.length?out:[root]}

/*PSY-WORKLET-BEGIN*/
function psyLabWorkletModule(RANGE_LO,RANGE_HI,RANGE_DEF){
 /* Rules of this processor: no allocation, no closures and no function calls with number arguments inside process()
    (a boxed double is garbage on the audio thread). Everything per sample is inlined on typed arrays.
    Phases wrap by integer truncation (x-=x|0), not by Math.floor: no call per sample in any engine. */
 const TS=4096,SIN=new Float32Array(TS+2);for(let i=0;i<TS+2;i++)SIN[i]=Math.sin(2*Math.PI*i/TS); // two guard points: a wrapped phase may be exactly 1
 const NV=6,NP=6,NPAR=40,NRES=8,BLOCK=128;
 // Hilbert pair (two 4-section allpass chains, 90 degrees apart), coefficients squared
 const HA=new Float64Array([0.6923878*0.6923878,0.9360654322959*0.9360654322959,0.9882295226860*0.9882295226860,0.9987488452737*0.9987488452737]);
 const HB=new Float64Array([0.4021921162426*0.4021921162426,0.8561710882420*0.8561710882420,0.9722909545651*0.9722909545651,0.9952884791278*0.9952884791278]);
 const HSIZE=34;
 class XenPsyLabProcessor extends AudioWorkletProcessor{
  constructor(options){super();const o=options?.processorOptions||{};
   this.sr=sampleRate;this.isr=1/sampleRate;this.dead=false;
   this.lo=new Float64Array(RANGE_LO);this.hi=new Float64Array(RANGE_HI);
   this.target=new Float64Array(RANGE_DEF);this.cur=new Float64Array(RANGE_DEF);
   if(Array.isArray(o.params))for(let i=0;i<NPAR&&i<o.params.length;i++){const v=+o.params[i];if(v===v){const c=v<this.lo[i]?this.lo[i]:v>this.hi[i]?this.hi[i]:v;this.target[i]=c;this.cur[i]=c}}
   // voices
   this.vAct=new Uint8Array(NV);this.vGate=new Uint8Array(NV);this.vId=new Float64Array(NV).fill(-1);this.vAge=new Float64Array(NV);
   this.vHz=new Float64Array(NV);this.vF=new Float64Array(NV);this.vVel=new Float64Array(NV);this.vEnv=new Float64Array(NV);this.vPan=new Float64Array(NV);
   this.vPh=new Float64Array(NV*4);this.vPrev=new Float64Array(NV);this.vSh=new Float64Array(NV*NP*2);
   this.active=0;this.clock=0;
   // Shepard stack (shared by all voices so they climb together)
   this.shU=new Float64Array(NP);for(let j=0;j<NP;j++)this.shU[j]=j/NP;this.shR=new Float64Array(NP);this.shW=new Float64Array(NP);
   // block buffers
   this.bL=new Float32Array(BLOCK);this.bR=new Float32Array(BLOCK);
   // filter, crush, resonators, shifters, delay, output
   this.svf=new Float64Array(4);
   // scalar state lives in a typed array: a double stored into an object field is boxed (garbage per block)
   this.st=new Float64Array(8);this.st[7]=-1;
   this.rHz=new Float64Array(NRES);this.rA1=new Float64Array(NRES);this.rA2=new Float64Array(NRES);this.rG=new Float64Array(NRES);this.rY=new Float64Array(NRES*2);this.rN=0;this.rDirty=true;
   if(Array.isArray(o.res))this.setRes(o.res);
   this.H=new Float64Array(HSIZE*4);
   let size=1;while(size<this.sr*2.7)size<<=1;this.dSize=size;this.dMask=size-1;this.dL=new Float32Array(size);this.dR=new Float32Array(size);this.dW=0;this.st[5]=this.cur[21]*this.sr;
   this.dc=new Float64Array(4);this.lz=new Float64Array([.1,0,20]);this.mod=new Float64Array(4);
   this.quiet=0;this.sleepBlocks=Math.ceil(this.sr*1.5/BLOCK);
   // offline bounce: a fixed list of events by frame, no port traffic needed
   this.script=Array.isArray(o.script)?o.script.slice().sort((a,b)=>a.f-b.f):null;this.scriptAt=0;
   this.port.onmessage=e=>this.handle(e.data);
  }
  setRes(list){let n=0;for(let i=0;i<list.length&&n<NRES;i++){const hz=+list[i];if(hz>20&&hz<this.sr*.45)this.rHz[n++]=hz}this.rN=n;this.rDirty=true}
  handle(m){if(!m)return;const t=m.t;
   if(t==='p'){const i=m.i|0;if(i>=0&&i<NPAR){const v=+m.v;if(v===v)this.target[i]=v<this.lo[i]?this.lo[i]:v>this.hi[i]?this.hi[i]:v}}
   else if(t==='all'){const a=m.v;if(a)for(let i=0;i<NPAR&&i<a.length;i++){const v=+a[i];if(v===v)this.target[i]=v<this.lo[i]?this.lo[i]:v>this.hi[i]?this.hi[i]:v}}
   else if(t==='on')this.noteOn(+m.id,+m.hz,m.vel===undefined?1:+m.vel);
   else if(t==='off'){for(let v=0;v<NV;v++)if(this.vAct[v]&&this.vId[v]===+m.id)this.vGate[v]=0}
   else if(t==='bend'){const hz=+m.hz;if(hz>0)for(let v=0;v<NV;v++)if(this.vAct[v]&&this.vId[v]===+m.id)this.vHz[v]=hz<8?8:hz>this.sr*.45?this.sr*.45:hz}
   else if(t==='alloff'){for(let v=0;v<NV;v++)this.vGate[v]=0}
   else if(t==='res'){if(Array.isArray(m.hz))this.setRes(m.hz)}
   else if(t==='dispose'){this.dead=true}
  }
  noteOn(id,hz,vel){if(!(hz>0))return;hz=hz<8?8:hz>this.sr*.45?this.sr*.45:hz;
   let v=-1;for(let i=0;i<NV;i++)if(this.vAct[i]&&this.vId[i]===id){v=i;break}
   if(v<0)for(let i=0;i<NV;i++)if(!this.vAct[i]){v=i;break}
   if(v<0){let best=1/0;for(let i=0;i<NV;i++){const score=this.vAge[i]+(this.vGate[i]?1e12:0);if(score<best){best=score;v=i}}} // steal: released first, then oldest
   const fresh=!this.vAct[v];
   if(fresh){this.active++;this.vF[v]=hz;this.vEnv[v]=0;this.vPrev[v]=0;for(let k=0;k<4;k++)this.vPh[v*4+k]=0;for(let k=0;k<NP*2;k++)this.vSh[v*NP*2+k]=0}
   this.vAct[v]=1;this.vGate[v]=1;this.vId[v]=id;this.vHz[v]=hz;this.vVel[v]=vel<0?0:vel>1?1:vel;this.vAge[v]=++this.clock;this.vPan[v]=((v*0.6180339887)%1)*2-1;
   this.quiet=0;
  }
  process(inputs,outputs){
   if(this.dead)return false;
   const out=outputs[0];if(!out||!out[0])return true;
   const oL=out[0],oR=out[1]||out[0],n=oL.length;
   if(this.script){const sc=this.script;while(this.scriptAt<sc.length&&sc[this.scriptAt].f<currentFrame+n){this.handle(sc[this.scriptAt].m);this.scriptAt++}}
   if(this.active===0&&this.quiet>=this.sleepBlocks)return true; // asleep: outputs are already zero
   if(n>this.bL.length){this.bL=new Float32Array(n);this.bR=new Float32Array(n)} // only if a host ever changes the quantum
   this.control(n);this.voices(n);this.shape(n);this.crystal(n);this.shifter(n);this.echo(n);this.output(n,oL,oR);
   return true;
  }
  /* Stage methods take only the block length: number arguments or results would be boxed. Small functions are
     optimised reliably by every JavaScript engine; one huge process() is not. */
  control(n){const cur=this.cur,tg=this.target,isr=this.isr;
   // ---- parameters: one-pole per block (about 20 ms) ----
   const pk=1-Math.exp(-n*isr/.02);for(let i=0;i<NPAR;i++)cur[i]+=(tg[i]-cur[i])*pk;
   // ---- chaos: Lorenz attractor, a few Euler steps per block ----
   const lz=this.lz,mod=this.mod;{let dt=cur[28]*n*isr,steps=1;while(dt/steps>.006)steps++;const h=dt/steps;let x=lz[0],y=lz[1],z=lz[2];
    for(let s=0;s<steps;s++){const dx=10*(y-x),dy=x*(28-z)-y,dz=x*y-2.6666666667*z;x+=dx*h;y+=dy*h;z+=dz*h}
    if(!(x*x+y*y+z*z<1e6)){x=.1;y=0;z=20}lz[0]=x;lz[1]=y;lz[2]=z;
    const mk=1-Math.exp(-n*isr/.03);mod[0]+=(x*.05-mod[0])*mk;mod[1]+=(y*.037-mod[1])*mk;mod[2]+=((z-25)*.05-mod[2])*mk}
   mod[3]=cur[37]*cur[38];
  }
  voices(n){
   const bL=this.bL,bR=this.bR,cur=this.cur,sr=this.sr,isr=this.isr,mod=this.mod,m0=mod[0],m1=mod[1],m2=mod[2],macro=mod[3];
   let fold=cur[11]+cur[29]*m0*.6+macro*.5;fold=fold<0?0:fold>1?1:fold;
   let fmScale=1+cur[30]*m1*1.2+macro*1.5;if(fmScale<0)fmScale=0;
   const iAB=cur[2]*fmScale*.159154943,iBC=cur[3]*fmScale*.159154943,iCA=cur[4]*.159154943,iSelf=cur[5]*.159154943; // radians → cycles
   const rB=cur[0],rC=cur[1],opMix=cur[6],det=cur[7]*.00028881; // cents/2 → relative
   const foldG=(1+fold*7)*.25,foldMix=fold*5>1?1:fold*5;
   const atkK=1-Math.exp(-isr/cur[16]),relK=1-Math.exp(-isr/cur[17]),gk=cur[18]<.001?1:1-Math.exp(-isr/cur[18]);
   // ---- Shepard stack positions for this block ----
   const shepMix=cur[8],shepOn=shepMix>.0005;
   if(shepOn){const shU=this.shU,shR=this.shR,shW=this.shW,du=cur[9]*n*isr/NP,lnI=Math.log(cur[10]);let sum=0;
    for(let j=0;j<NP;j++){let uu=shU[j]+du;uu-=uu|0;if(uu<0)uu+=1;shU[j]=uu;shR[j]=Math.exp(lnI*NP*(uu-.5));const w=.5-.5*Math.cos(6.283185307*uu);shW[j]=w;sum+=w}
    const norm=sum>1e-6?1.6/sum:0;for(let j=0;j<NP;j++)shW[j]*=norm}
   // ---- voices ----
   for(let i=0;i<n;i++){bL[i]=0;bR[i]=0}
   const panMod=cur[33]*m1;
   for(let v=0;v<NV;v++){if(!this.vAct[v])continue;
    const vPh=this.vPh,q=v*4;let pa=vPh[q],pr=vPh[q+1],pb=vPh[q+2],pc=vPh[q+3],prev=this.vPrev[v],f=this.vF[v],env=this.vEnv[v];
    const ft=this.vHz[v],gate=this.vGate[v],vel=this.vVel[v];
    let pan=this.vPan[v]*.55+panMod*(v&1?-1:1);pan=pan<-1?-1:pan>1?1:pan;const gl=Math.cos((pan+1)*.7853981634)*vel*.26,gr=Math.sin((pan+1)*.7853981634)*vel*.26; // headroom: six voices plus echo stay below the soft clipper
    const sh=this.vSh,so=v*NP*2,shR=this.shR,shW=this.shW;
    for(let i=0;i<n;i++){
     f+=(ft-f)*gk;const inc=f*isr;
     // C ← A, B ← C
     pc+=inc*rC;pc-=pc|0;if(pc<0)pc+=1;let p=pc+iCA*prev;p-=p|0;if(p<0)p+=1;let x=p*TS,k=x|0;const cOut=inc*rC<.47?SIN[k]+(SIN[k+1]-SIN[k])*(x-k):0;
     pb+=inc*rB;pb-=pb|0;if(pb<0)pb+=1;p=pb+iBC*cOut;p-=p|0;if(p<0)p+=1;x=p*TS;k=x|0;const bOut=inc*rB<.47?SIN[k]+(SIN[k+1]-SIN[k])*(x-k):0;
     const pm=iAB*bOut+iSelf*prev;
     // A, twice (left / right slightly detuned)
     pa+=inc*(1+det);pa-=pa|0;if(pa<0)pa+=1;pr+=inc*(1-det);pr-=pr|0;if(pr<0)pr+=1;
     p=pa+pm;p-=p|0;if(p<0)p+=1;x=p*TS;k=x|0;let aL=SIN[k]+(SIN[k+1]-SIN[k])*(x-k);
     p=pr+pm;p-=p|0;if(p<0)p+=1;x=p*TS;k=x|0;let aR=SIN[k]+(SIN[k+1]-SIN[k])*(x-k);
     if(shepOn){let sL=0,sR=0;
      for(let j=0;j<NP;j++){const fi=inc*shR[j];if(fi>.47||fi<.00018)continue;const w=shW[j],s2=so+j*2;
       let ph=sh[s2]+fi*(1+det);ph-=ph|0;if(ph<0)ph+=1;sh[s2]=ph;p=ph+pm;p-=p|0;if(p<0)p+=1;x=p*TS;k=x|0;sL+=w*(SIN[k]+(SIN[k+1]-SIN[k])*(x-k));
       ph=sh[s2+1]+fi*(1-det);ph-=ph|0;if(ph<0)ph+=1;sh[s2+1]=ph;p=ph+pm;p-=p|0;if(p<0)p+=1;x=p*TS;k=x|0;sR+=w*(SIN[k]+(SIN[k+1]-SIN[k])*(x-k))}
      aL+=(sL-aL)*shepMix;aR+=(sR-aR)*shepMix}
     prev=(aL+aR)*.5;
     let yL=aL+(bOut-aL)*opMix,yR=aR+(bOut-aR)*opMix;
     if(foldMix>0){p=yL*foldG;p-=p|0;if(p<0)p+=1;x=p*TS;k=x|0;yL+=((SIN[k]+(SIN[k+1]-SIN[k])*(x-k))-yL)*foldMix;
      p=yR*foldG;p-=p|0;if(p<0)p+=1;x=p*TS;k=x|0;yR+=((SIN[k]+(SIN[k+1]-SIN[k])*(x-k))-yR)*foldMix}
     if(gate)env+=(1-env)*atkK;else env-=env*relK;
     bL[i]+=yL*env*gl;bR[i]+=yR*env*gr;
    }
    vPh[q]=pa;vPh[q+1]=pr;vPh[q+2]=pb;vPh[q+3]=pc;this.vPrev[v]=prev;this.vF[v]=f;this.vEnv[v]=env;
    if(!gate&&env<2e-5){this.vAct[v]=0;this.vId[v]=-1;this.active--}
   }
  }
  shape(n){
   const bL=this.bL,bR=this.bR,cur=this.cur,sr=this.sr,isr=this.isr,mod=this.mod,m0=mod[0],m1=mod[1],m2=mod[2],macro=mod[3];
   // ---- dust (sample and hold) ----
   if(cur[15]>.002){const period=1+cur[15]*cur[15]*60;let ph=this.st[0],hl=this.st[1],hr=this.st[2];
    for(let i=0;i<n;i++){ph+=1;if(ph>=period){ph-=period;hl=bL[i];hr=bR[i]}bL[i]=hl;bR[i]=hr}this.st[0]=ph;this.st[1]=hl;this.st[2]=hr}
   // ---- morphing state variable filter (TPT) ----
   {let fc=cur[12]*Math.pow(2,cur[34]*m2*3+macro*0);fc=fc<25?25:fc>sr*.45?sr*.45:fc;
    if(fc<19000||cur[14]>.001||cur[13]>.12){const g=Math.tan(Math.PI*fc*isr),kq=1/(.5+cur[13]*cur[13]*24.5),a1=1/(1+g*(g+kq)),a2=g*a1,a3=g*a2,mo=cur[14];
     const wl=mo<.5?1-mo*2:0,wb=mo<.5?mo*2:2-mo*2,wh=mo<.5?0:mo*2-1,s=this.svf;
     for(let c=0;c<2;c++){const b=c?bR:bL;let i1=s[c*2],i2=s[c*2+1];
      for(let i=0;i<n;i++){const x=b[i],v3=x-i2,v1=a1*i1+a2*v3,v2=i2+a2*i1+a3*v3;i1=2*v1-i1;i2=2*v2-i2;b[i]=wl*v2+wb*v1+wh*(x-kq*v1-v2)}
      s[c*2]=i1<1e-20&&i1>-1e-20?0:i1;s[c*2+1]=i2<1e-20&&i2>-1e-20?0:i2}}}
  }
  crystal(n){
   const bL=this.bL,bR=this.bR,cur=this.cur,sr=this.sr,isr=this.isr,mod=this.mod,m0=mod[0],m1=mod[1],m2=mod[2],macro=mod[3];
   // ---- crystal: resonators tuned to the scale ----
   if(cur[26]>.001&&this.rN>0){if(this.rDirty||this.st[7]!==cur[27]){this.st[7]=cur[27];this.rDirty=false;
     for(let r=0;r<this.rN;r++){const w=6.283185307*this.rHz[r]*isr,R=Math.exp(-w/(2*this.st[7]));this.rA1[r]=2*R*Math.cos(w);this.rA2[r]=R*R;this.rG[r]=(1-R*R)*.5}}
    const mix=cur[26],rY=this.rY,rN=this.rN,comp=1.4/Math.sqrt(rN);
    for(let r=0;r<rN;r++){const a1=this.rA1[r],a2=this.rA2[r],g=this.rG[r]*comp*mix,toL=r&1?.35:1,toR=r&1?1:.35;let y1=rY[r*2],y2=rY[r*2+1];
     // each resonator hears the mix so far (dry plus the resonators before it): that thickens the ring on purpose
     for(let i=0;i<n;i++){const x=(bL[i]+bR[i])*.5,y=x+a1*y1-a2*y2;y2=y1;y1=y;bL[i]+=y*g*toL;bR[i]+=y*g*toR}
     rY[r*2]=y1<1e-20&&y1>-1e-20?0:y1;rY[r*2+1]=y2<1e-20&&y2>-1e-20?0:y2}}
  }
  shifter(n){
   const bL=this.bL,bR=this.bR,cur=this.cur,sr=this.sr,isr=this.isr,mod=this.mod,m0=mod[0],m1=mod[1],m2=mod[2],macro=mod[3];
   // ---- direct frequency shifter (left up, right up; the echo loop spins both ways) ----
   const H=this.H;
   if(cur[20]>.001){const hz=cur[19]+cur[31]*m0*220,inc=hz*isr,mix=cur[20];let ph=this.st[3];
    for(let i=0;i<n;i++){ph+=inc;ph-=ph|0;if(ph<0)ph+=1;let x=ph*TS,k=x|0;const sn=SIN[k]+(SIN[k+1]-SIN[k])*(x-k);let p=ph+.25;p-=p|0;if(p<0)p+=1;x=p*TS;k=x|0;const cs=SIN[k]+(SIN[k+1]-SIN[k])*(x-k);
     for(let c=0;c<2;c++){const b=c?bR:bL,o=c*HSIZE,inp=b[i];let v=inp;
      for(let s=0;s<4;s++){const q=o+s*4,y=HA[s]*(v+H[q+3])-H[q+1];H[q+1]=H[q];H[q]=v;H[q+3]=H[q+2];H[q+2]=y;v=y}
      const I=H[o+32];H[o+32]=v;v=inp;
      for(let s=0;s<4;s++){const q=o+16+s*4,y=HB[s]*(v+H[q+3])-H[q+1];H[q+1]=H[q];H[q]=v;H[q+3]=H[q+2];H[q+2]=y;v=y}
      b[i]=inp+((I*cs-v*sn)-inp)*mix}}
    this.st[3]=ph}
  }
  echo(n){
   const bL=this.bL,bR=this.bR,cur=this.cur,sr=this.sr,isr=this.isr,mod=this.mod,m0=mod[0],m1=mod[1],m2=mod[2],macro=mod[3];
   const H=this.H;
   // ---- spiral echo: feedback runs through a second shifter, opposite directions left and right ----
   {const dL=this.dL,dR=this.dR,mask=this.dMask,size=this.dSize,fb=cur[22],mix=cur[23],cross=cur[25]*.5,rightRatio=1+cur[25]*.5;
    let target=cur[21]*(1+cur[32]*m2*.35)*sr;const maxD=(this.dSize-4)/rightRatio;target=target<8?8:target>maxD?maxD:target;
    const inc=cur[24]*isr,spin=inc!==0;let w=this.dW,dCur=this.st[5],ph=this.st[4];
    for(let i=0;i<n;i++){dCur+=(target-dCur)*.00025; // tape-like glide when the time moves
     let pos=w-dCur+size;let i0=pos|0;let fr=pos-i0;i0&=mask;const eL=dL[i0]+(dL[(i0+1)&mask]-dL[i0])*fr;
     pos=w-dCur*rightRatio+size;i0=pos|0;fr=pos-i0;i0&=mask;const eR=dR[i0]+(dR[(i0+1)&mask]-dR[i0])*fr;
     let fL=eL+(eR-eL)*cross,fR=eR+(eL-eR)*cross;
     if(spin){ph+=inc;ph-=ph|0;if(ph<0)ph+=1;let x=ph*TS,k=x|0;const sn=SIN[k]+(SIN[k+1]-SIN[k])*(x-k);let p=ph+.25;p-=p|0;if(p<0)p+=1;x=p*TS;k=x|0;const cs=SIN[k]+(SIN[k+1]-SIN[k])*(x-k);
      for(let c=0;c<2;c++){const o=(2+c)*HSIZE,inp=c?fR:fL;let v=inp;
       for(let s=0;s<4;s++){const q=o+s*4,y=HA[s]*(v+H[q+3])-H[q+1];H[q+1]=H[q];H[q]=v;H[q+3]=H[q+2];H[q+2]=y;v=y}
       const I=H[o+32];H[o+32]=v;v=inp;
       for(let s=0;s<4;s++){const q=o+16+s*4,y=HB[s]*(v+H[q+3])-H[q+1];H[q+1]=H[q];H[q]=v;H[q+3]=H[q+2];H[q+2]=y;v=y}
       if(c)fR=I*cs+v*sn;else fL=I*cs-v*sn}}
     // soft saturation keeps feedback above 1 musical instead of exploding
     fL*=fb;fR*=fb;fL=fL>3?1:fL<-3?-1:fL*(27+fL*fL)/(27+9*fL*fL);fR=fR>3?1:fR<-3?-1:fR*(27+fR*fR)/(27+9*fR*fR);
     dL[w]=bL[i]+fL;dR[w]=bR[i]+fR;w=(w+1)&mask;
     bL[i]+=eL*mix;bR[i]+=eR*mix}
    this.dW=w;this.st[5]=dCur;this.st[4]=ph}
  }
  output(n,oL,oR){
   const bL=this.bL,bR=this.bR,cur=this.cur,sr=this.sr,isr=this.isr,mod=this.mod,m0=mod[0],m1=mod[1],m2=mod[2],macro=mod[3];
   // ---- drive, DC blocker, level ----
   {const dg=1+cur[35]*7,lvl=cur[36]/(1+cur[35]*.6),dc=this.dc;let peak=0,x1=dc[0],y1=dc[1],x2=dc[2],y2=dc[3];
    // DC blocker first, soft clipper last: the output can never exceed the level setting
    for(let i=0;i<n;i++){let x=bL[i],y=x-x1+.9995*y1;x1=x;y1=y;let a=y*dg;a=a>3?1:a<-3?-1:a*(27+a*a)/(27+9*a*a);a*=lvl;oL[i]=a;if(a>peak)peak=a;else if(-a>peak)peak=-a;
     x=bR[i];y=x-x2+.9995*y2;x2=x;y2=y;a=y*dg;a=a>3?1:a<-3?-1:a*(27+a*a)/(27+9*a*a);a*=lvl;if(oR!==oL)oR[i]=a;if(a>peak)peak=a;else if(-a>peak)peak=-a}
    dc[0]=x1;dc[1]=y1<1e-20&&y1>-1e-20?0:y1;dc[2]=x2;dc[3]=y2<1e-20&&y2>-1e-20?0:y2;
    if(!(peak<=1.5)||!(y1===y1)||!(y2===y2)){ // a non-finite state must never reach the master: silence this block and reset every memory
     for(let i=0;i<n;i++){oL[i]=0;if(oR!==oL)oR[i]=0}this.svf.fill(0);this.rY.fill(0);this.H.fill(0);this.dL.fill(0);this.dR.fill(0);this.dc.fill(0);this.vPrev.fill(0);peak=0}
    this.st[6]=peak;this.quiet=this.active===0&&peak<1e-5?this.quiet+1:0;
    if(this.active===0&&this.quiet===this.sleepBlocks){this.dL.fill(0);this.dR.fill(0);this.H.fill(0);this.rY.fill(0);this.svf.fill(0);this.dc.fill(0)} // going to sleep with clean memories
   }
  }
 }
 registerProcessor('xen-psylab-v1',XenPsyLabProcessor);
}
/*PSY-WORKLET-END*/
const moduleCode=()=>'('+psyLabWorkletModule.toString()+')('+JSON.stringify(RANGES.lo)+','+JSON.stringify(RANGES.hi)+','+JSON.stringify(RANGES.def)+');';
const moduleReady=new WeakMap();
function loadModule(ctx){let job=moduleReady.get(ctx);if(job)return job;
 job=(async()=>{const code=moduleCode();let error=null;
  for(const mode of(typeof location!=='undefined'&&location.protocol==='file:'?['data','blob']:['blob','data'])){let url=null;
   try{url=mode==='blob'?URL.createObjectURL(new Blob([code],{type:'application/javascript'})):'data:application/javascript;charset=utf-8,'+encodeURIComponent(code);await ctx.audioWorklet.addModule(url);return}
   catch(e){error=e}finally{if(mode==='blob'&&url)URL.revokeObjectURL(url)}}
  throw error??Error('Psychedelic Lab engine could not be loaded.')})();
 moduleReady.set(ctx,job);job.catch(()=>{if(moduleReady.get(ctx)===job)moduleReady.delete(ctx)});return job}

/* Live engine: created on the first note, removed when the room closes. Slider moves are coalesced to one message per frame. */
class PsyEngine{
 constructor(){this.ctx=null;this.node=null;this.out=null;this.anL=null;this.anR=null;this.starting=null;this.pending=new Map();this.raf=0;this.queue=[];this.params=defaultParams();this.res=[220];this.closed=false}
 async ensure(){if(this.node)return this.node;if(this.starting)return this.starting;
  this.starting=(async()=>{const bridge=__xenMultitrackBridge.current;if(!bridge)throw Error('The audio bridge is not ready: open the Live Room once.');
   const ctx=await bridge.ensureAudioReady();await loadModule(ctx);if(this.closed)throw Error('Room closed.');
   const node=new AudioWorkletNode(ctx,'xen-psylab-v1',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2],processorOptions:{params:this.params.slice(),res:this.res.slice()}});
   const out=ctx.createGain();out.gain.value=1;node.connect(out);out.connect(bridge.getMasterInput(ctx));
   const split=ctx.createChannelSplitter(2),anL=ctx.createAnalyser(),anR=ctx.createAnalyser();anL.fftSize=anR.fftSize=1024;node.connect(split);split.connect(anL,0);split.connect(anR,1);
   this.ctx=ctx;this.node=node;this.out=out;this.split=split;this.anL=anL;this.anR=anR;
   for(const m of this.queue)node.port.postMessage(m);this.queue.length=0;return node})();
  try{return await this.starting}finally{this.starting=null}}
 send(m){if(this.node)this.node.port.postMessage(m);else{this.queue.push(m);if(this.queue.length>64)this.queue.shift();void this.ensure().catch(()=>{})}}
 setParam(i,v){this.params[i]=v;if(!this.node)return;this.pending.set(i,v);if(!this.raf)this.raf=requestAnimationFrame(()=>{this.raf=0;if(!this.node)return;for(const[k,val]of this.pending)this.node.port.postMessage({t:'p',i:k,v:val});this.pending.clear()})}
 setAll(params){this.params=params.slice();this.pending.clear();if(this.node)this.node.port.postMessage({t:'all',v:this.params})}
 setRes(hz){this.res=hz.slice();if(this.node)this.node.port.postMessage({t:'res',hz:this.res})}
 noteOn(id,hz,vel){this.send({t:'on',id,hz,vel})}
 noteOff(id){if(this.node)this.node.port.postMessage({t:'off',id});else this.queue=this.queue.filter(m=>!(m.t==='on'&&m.id===id))}
 bend(id,hz){if(this.node)this.node.port.postMessage({t:'bend',id,hz})}
 allOff(){this.queue.length=0;if(this.node)this.node.port.postMessage({t:'alloff'})}
 dispose(){this.closed=true;if(this.raf){cancelAnimationFrame(this.raf);this.raf=0}const{node,out,split,anL,anR,ctx}=this;this.node=null;this.queue.length=0;if(!node)return;
  try{node.port.postMessage({t:'alloff'});out.gain.setTargetAtTime(0,ctx.currentTime,.04)}catch{}
  setTimeout(()=>{try{node.port.postMessage({t:'dispose'});node.disconnect();out.disconnect();split.disconnect();anL.disconnect();anR.disconnect()}catch{}},400)}
}
/* Offline render of the same processor: deterministic, no realtime capture. */
async function bounce({params,res,notes,seconds,sampleRate}){
 const Offline=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;const frames=Math.round(seconds*sampleRate),ctx=new Offline(2,frames,sampleRate);
 await loadModule(ctx);const hold=Math.max(.05,seconds-Math.min(seconds*.5,Math.max(.3,params[17]*2.5)));
 const script=[];notes.forEach((hz,i)=>{script.push({f:0,m:{t:'on',id:i+1,hz,vel:1}});script.push({f:Math.round(hold*sampleRate),m:{t:'off',id:i+1}})});
 const node=new AudioWorkletNode(ctx,'xen-psylab-v1',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2],processorOptions:{params:params.slice(),res:res.slice(),script}});
 node.connect(ctx.destination);const buf=await ctx.startRendering();const L=buf.getChannelData(0),R=buf.getChannelData(1);
 const fade=Math.min(frames,Math.round(.02*sampleRate));for(let i=0;i<fade;i++){const g=i/fade;L[frames-1-i]*=g;R[frames-1-i]*=g}
 let peak=0;for(let i=0;i<frames;i++){const a=Math.abs(L[i]),b=Math.abs(R[i]);if(a>peak)peak=a;if(b>peak)peak=b}
 return{left:L,right:R,sampleRate,peak}}

/* ---------- patches ---------- */
const patch=(name,scale,root,over)=>{const params=defaultParams();for(const k in over)params[BY_KEY[k][0]]=over[k];return{id:'factory:'+name,name,scale,root,params}};
const FACTORY=[
 patch('Liquid Bell','1/1 9/8 5/4 11/8 3/2 13/8 7/4',220,{ratioB:3.5,ratioC:7.07,fmAB:2.2,fmBC:.7,fmCA:.1,opMix:.05,fold:.05,attack:.004,release:2.6,delayTime:.33,delayFb:.5,delayMix:.32,loopShift:.4,detune:6,cPan:.35}),
 patch('Escher Staircase','1/1 9/8 5/4 3/2 5/3',110,{shepMix:1,shepRate:.12,shepInterval:2,ratioB:1.5,ratioC:2,fmAB:.5,fmBC:.3,fmCA:.2,fold:.1,attack:.4,release:3,delayTime:.5,delayFb:.4,delayMix:.25,cutoff:6000,detune:12}),
 patch('Barber Spiral','12edo',146.83,{ratioB:1,ratioC:2,fmAB:.6,fmBC:.2,fmCA:0,fold:.12,attack:.01,release:.9,delayTime:.27,delayFb:.86,delayMix:.5,loopShift:7,spread:.8,cutoff:5200,reso:.2}),
 patch('Chaos Insect','22edo',330,{ratioB:2.76,ratioC:.51,fmAB:4.5,fmBC:3.2,fmCA:2.4,selfFb:.6,fold:.35,crush:.25,attack:.003,release:.35,chaosRate:6,cFm:.8,cPan:.9,cFold:.5,delayTime:.11,delayFb:.6,delayMix:.25,loopShift:-14}),
 patch('Crystal Cave','1/1 8/7 4/3 3/2 12/7 7/4',196,{ratioB:2,ratioC:5,fmAB:.9,fmBC:.4,fold:.05,attack:.002,release:.25,resMix:.6,resQ:320,delayTime:.62,delayFb:.55,delayMix:.35,loopShift:.25,cutoff:9000}),
 patch('Deep Fold Drone','1/1 7/6 4/3 3/2 7/4',55,{ratioB:.5,ratioC:1.5,fmAB:.8,fmBC:.5,fmCA:.4,fold:.7,opMix:.25,attack:1.6,release:6,cutoff:1400,reso:.35,chaosRate:.12,cFold:.7,cCut:.6,cPan:.5,delayTime:.9,delayFb:.6,delayMix:.3,loopShift:-.3,detune:18,drive:.4}),
 patch('Tritave Ghost','13ed3',130,{shepMix:.8,shepRate:-.07,shepInterval:3,ratioB:3,ratioC:1.6667,fmAB:1.1,fmBC:.6,fmCA:.5,fold:.2,attack:.25,release:4,shiftHz:5,shiftMix:.35,delayTime:.74,delayFb:.7,delayMix:.4,loopShift:2.2,cShift:.4,chaosRate:.25}),
 patch('Alien Choir','1/1 16/15 6/5 4/3 3/2 8/5 9/5',174.6,{ratioB:1.005,ratioC:2.99,fmAB:1.6,fmBC:.9,fmCA:.7,opMix:.4,fold:.25,morph:.45,cutoff:1800,reso:.55,shiftHz:11,shiftMix:.5,detune:28,attack:.3,release:2.2,cCut:.5,cShift:.6,chaosRate:.8,delayTime:.42,delayFb:.5,delayMix:.3,loopShift:-3})];
function sanitizePatch(p,fallbackName){const scaleText=typeof p?.scale==='string'&&p.scale.trim()?p.scale.slice(0,2000):'12edo';const root=Number(p?.root);
 return{id:typeof p?.id==='string'?p.id:'user:'+uid(),name:String(p?.name||fallbackName||'Patch').slice(0,60),scale:scaleText,root:root>=8&&root<=8000?root:220,params:sanitizeParams(p?.params)}}
function loadStore(){try{const raw=localStorage.getItem(STORE_KEY);if(!raw)return null;const data=JSON.parse(raw);if(data?.format!==FORMAT)return null;
  return{working:sanitizePatch(data.working,'Working patch'),user:Array.isArray(data.user)?data.user.slice(0,500).map(p=>sanitizePatch(p)):[],hold:data.hold===true,snap:data.snap!==false,bounceSec:clamp(Number(data.bounceSec)||8,.5,120)}}catch{return null}}
function saveStore(state){try{localStorage.setItem(STORE_KEY,JSON.stringify({format:FORMAT,version:VERSION,working:state.working,user:state.user,hold:state.hold,snap:state.snap,bounceSec:state.bounceSec,updatedAt:Date.now()}));return true}catch{return false}}

const CSS=`
.xpl{color:#e9e4ff;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;padding:14px 16px 28px;max-width:1500px;margin:0 auto}
.xpl h2{font-size:20px;letter-spacing:.18em;margin:0;background:linear-gradient(90deg,#ff5ecb,#ffd166,#5ef2ff,#b28dff);-webkit-background-clip:text;background-clip:text;color:transparent}
.xpl-sub{color:#9f96c4;font-size:11px;margin:4px 0 12px;max-width:900px;line-height:1.5}
.xpl-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}
.xpl button,.xpl select,.xpl input[type=text],.xpl input[type=number]{background:#120d24;color:#efe9ff;border:1px solid #4b3d7a;border-radius:6px;padding:6px 10px;font:inherit;min-height:30px}
.xpl button{cursor:pointer}.xpl button:hover:not(:disabled){background:#22184a;border-color:#8f7bff}.xpl button:disabled{opacity:.45;cursor:default}
.xpl button[aria-pressed=true]{background:#3b1d5e;border-color:#ff7ad9;color:#ffd6f3}
.xpl :focus-visible{outline:2px solid #5ef2ff;outline-offset:2px}
.xpl-main{display:grid;grid-template-columns:minmax(320px,1.15fr) minmax(320px,1fr);gap:14px;align-items:start}
@media(max-width:980px){.xpl-main{grid-template-columns:minmax(0,1fr)}}
.xpl-pad{position:relative;border:1px solid #4b3d7a;border-radius:10px;overflow:hidden;background:#05030c;touch-action:none;cursor:crosshair;aspect-ratio:16/10;min-height:260px}
.xpl-pad canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.xpl-pad-hint{position:absolute;left:10px;bottom:8px;color:#b9b0e0;font-size:10px;pointer-events:none;text-shadow:0 0 6px #000}
.xpl-readout{position:absolute;right:10px;top:8px;color:#ffe9a8;font-size:11px;pointer-events:none;text-shadow:0 0 6px #000;text-align:right}
.xpl-tune{display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px 10px;align-items:center;margin-top:10px}
.xpl-tune input[type=text]{width:100%;box-sizing:border-box}
.xpl-note{color:#9f96c4;font-size:10px;line-height:1.45}
.xpl-err{color:#ff9aa8}
.xpl-panels{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
.xpl-panel{border:1px solid #33285c;border-radius:8px;padding:9px 10px 10px;background:linear-gradient(160deg,rgba(40,22,78,.55),rgba(10,8,24,.75))}
.xpl-panel h3{margin:0 0 2px;font-size:11px;letter-spacing:.2em;color:#ffd166}
.xpl-panel p{margin:0 0 7px;color:#8f86b4;font-size:10px;line-height:1.4}
.xpl-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 8px;align-items:center;margin-top:5px}
.xpl-row label{color:#cfc6f2;font-size:11px}
.xpl-val{color:#5ef2ff;font-size:11px;cursor:text;background:none!important;border:none!important;padding:0!important;min-height:0!important;text-align:right}
.xpl-row input[type=range]{grid-column:1/-1;width:100%;accent-color:#b28dff;cursor:pointer;margin:0}
.xpl-status{min-height:16px;color:#b9f5c8;font-size:11px;margin-top:8px}
.xpl-keys{color:#9f96c4;font-size:10px;margin-top:8px;line-height:1.5}
`;
function useStyle(){P.useEffect(()=>{if(document.getElementById('xen-psylab-style'))return;const s=document.createElement('style');s.id='xen-psylab-style';s.textContent=CSS;document.head.appendChild(s)},[])}

/* One slider = one tiny component. Moving it writes to the engine and to the patch object, never to room state. */
function PsySlider({p,patchRef,engine,onTouched}){
 const[index, ,label]=p;const[value,setValue]=P.useState(()=>patchRef.current.params[index]);
 const apply=v=>{v=clamp(v,p[3],p[4]);patchRef.current.params[index]=v;engine.setParam(index,v);setValue(v);onTouched()};
 const id='xpl-p-'+p[1];
 return u.jsxs('div',{className:'xpl-row',children:[u.jsx('label',{htmlFor:id,children:label}),
  u.jsx('button',{type:'button',className:'xpl-val',title:'Click to type an exact value. Double-click the slider to reset.',onClick:()=>{const typed=window.prompt(label+' ('+p[3]+' … '+p[4]+(p[7]?' '+p[7]:'')+')',String(+value.toPrecision(6)));if(typed===null)return;const v=Number(String(typed).replace(',','.'));if(Number.isFinite(v))apply(v)},children:fmt(p,value)}),
  u.jsx('input',{id,type:'range',min:0,max:1000,step:1,value:Math.round(toUnit(p,value)*1000),'data-psy-param':p[1],'aria-valuetext':fmt(p,value),
   onChange:e=>apply(fromUnit(p,Number(e.target.value)/1000)),onDoubleClick:()=>apply(p[5])})]})}

const KEY_ROWS=['KeyZ','KeyX','KeyC','KeyV','KeyB','KeyN','KeyM','KeyA','KeyS','KeyD','KeyF','KeyG','KeyH','KeyJ','KeyK','KeyL','KeyQ','KeyW','KeyE','KeyR','KeyT','KeyY','KeyU','KeyI','KeyO','KeyP','Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Digit0'];
const PAD_PERIODS=3;

function XenPsyLabRoom(){
 useStyle();
 const initial=P.useMemo(()=>loadStore()||{working:{...sanitizePatch(FACTORY[0]),id:'working'},user:[],hold:false,snap:true,bounceSec:8},[]);
 const patchRef=P.useRef(initial.working),engineRef=P.useRef(null);if(!engineRef.current)engineRef.current=new PsyEngine();const engine=engineRef.current;
 const[user,setUser]=P.useState(initial.user),[selected,setSelected]=P.useState(''),[epoch,setEpoch]=P.useState(0);
 const[scaleText,setScaleText]=P.useState(initial.working.scale),[rootText,setRootText]=P.useState(String(initial.working.root));
 const[hold,setHold]=P.useState(initial.hold),[snap,setSnap]=P.useState(initial.snap),[bounceSec,setBounceSec]=P.useState(initial.bounceSec);
 const[status,setStatus]=P.useState(''),[busy,setBusy]=P.useState(false),[mutate,setMutate]=P.useState(.25);
 const scale=P.useMemo(()=>parseScale(scaleText),[scaleText]);
 const root=P.useMemo(()=>{const v=Number(String(rootText).replace(',','.'));return v>=8&&v<=8000?v:patchRef.current.root},[rootText]);
 const live=P.useRef({scale,root,hold,snap,user,bounceSec});live.current={scale,root,hold,snap,user,bounceSec};
 const padRef=P.useRef(null),canvasRef=P.useRef(null),readoutRef=P.useRef(null),rootRef=P.useRef(null);
 const held=P.useRef(new Map()),latched=P.useRef(new Map()),saveTimer=P.useRef(0),noteSeq=P.useRef(100);

 const persist=P.useCallback(()=>{clearTimeout(saveTimer.current);saveTimer.current=setTimeout(()=>{const l=live.current;saveStore({working:{...patchRef.current,id:'working'},user:l.user,hold:l.hold,snap:l.snap,bounceSec:l.bounceSec})},600)},[]);
 const flush=P.useCallback(()=>{clearTimeout(saveTimer.current);const l=live.current;saveStore({working:{...patchRef.current,id:'working'},user:l.user,hold:l.hold,snap:l.snap,bounceSec:l.bounceSec})},[]);
 P.useEffect(()=>{patchRef.current.scale=scaleText;patchRef.current.root=root;engine.setRes(resonatorHz(root,scale));persist()},[scaleText,root,scale,engine,persist]);
 P.useEffect(()=>{persist()},[hold,snap,user,bounceSec,persist]);
 P.useEffect(()=>{engine.setAll(patchRef.current.params);const onHide=()=>flush();window.addEventListener('pagehide',onHide);
  return()=>{window.removeEventListener('pagehide',onHide);flush();engine.dispose()}},[engine,flush]);

 const release=P.useCallback(id=>{engine.noteOff(id)},[engine]);
 const panic=P.useCallback(()=>{held.current.clear();latched.current.clear();engine.allOff();setStatus('All notes off.')},[engine]);
 /* A note started by key or pad. With Hold on it keeps sounding until it is played again or Hold is switched off. */
 const start=P.useCallback((source,hz,vel)=>{const l=live.current;
  if(l.hold){const key=Math.round(1200*Math.log2(hz));const old=latched.current.get(key);if(old!==undefined){latched.current.delete(key);release(old);return null}
   const id=++noteSeq.current;latched.current.set(key,id);engine.noteOn(id,hz,vel);return null}
  const id=++noteSeq.current;held.current.set(source,id);engine.noteOn(id,hz,vel);return id},[engine,release]);
 const stop=P.useCallback(source=>{const id=held.current.get(source);if(id===undefined)return;held.current.delete(source);release(id)},[release]);
 P.useEffect(()=>{if(!hold&&latched.current.size){for(const id of latched.current.values())release(id);latched.current.clear()}},[hold,release]);

 /* pad geometry: X = pitch over PAD_PERIODS periods starting one period below the root, Y = intensity (Pad Y) */
 const padHz=P.useCallback((nx)=>{const l=live.current,per=l.scale.period,n=l.scale.ratios.length;const pos=clamp(nx,0,1)*PAD_PERIODS-1; // in periods relative to root
  if(!l.snap)return l.root*Math.pow(per,pos);
  let best=0,bestD=1/0;const base=Math.floor(pos);for(let o=base-1;o<=base+1;o++)for(let i=0;i<n;i++){const x=o+Math.log(l.scale.ratios[i])/Math.log(per),d=Math.abs(x-pos);if(d<bestD){bestD=d;best=x}}
  return l.root*Math.pow(per,best)},[]);
 const setMacro=P.useCallback(ny=>{const v=clamp(1-ny,0,1);patchRef.current.params[37]=0;engine.setParam(37,v)},[engine]);
 P.useEffect(()=>{const pad=padRef.current;if(!pad)return;
  const at=e=>{const r=pad.getBoundingClientRect();return[(e.clientX-r.left)/Math.max(1,r.width),(e.clientY-r.top)/Math.max(1,r.height)]};
  const show=hz=>{if(readoutRef.current)readoutRef.current.textContent=hz.toFixed(2)+' Hz · '+(1200*Math.log2(hz/live.current.root)).toFixed(0)+' ct'};
  const down=e=>{if(e.button!==undefined&&e.button!==0)return;e.preventDefault();try{pad.setPointerCapture(e.pointerId)}catch{}const[nx,ny]=at(e),hz=padHz(nx);setMacro(ny);start('pad:'+e.pointerId,hz,.9);show(hz)};
  const move=e=>{const id=held.current.get('pad:'+e.pointerId);if(id===undefined)return;const[nx,ny]=at(e),hz=padHz(nx);engine.bend(id,hz);setMacro(ny);show(hz)};
  const up=e=>{stop('pad:'+e.pointerId)};
  pad.addEventListener('pointerdown',down);pad.addEventListener('pointermove',move);pad.addEventListener('pointerup',up);pad.addEventListener('pointercancel',up);pad.addEventListener('lostpointercapture',up);
  return()=>{pad.removeEventListener('pointerdown',down);pad.removeEventListener('pointermove',move);pad.removeEventListener('pointerup',up);pad.removeEventListener('pointercancel',up);pad.removeEventListener('lostpointercapture',up)}},[engine,padHz,setMacro,start,stop]);

 /* computer keyboard: four rows walk through the scale degrees, whatever the tuning is */
 P.useEffect(()=>{
  const typing=t=>{const tag=t?.tagName?.toLowerCase?.();return tag==='textarea'||tag==='select'||t?.isContentEditable||(tag==='input'&&!['range','checkbox','button'].includes((t.type||'text').toLowerCase()))};
  const inside=t=>t===document.body||!!rootRef.current?.contains(t);
  const down=e=>{if(e.ctrlKey||e.metaKey||e.altKey||typing(e.target)||!inside(e.target))return;
   if(e.code==='Escape'){e.preventDefault();panic();return}
   if(e.code==='Space'){e.preventDefault();e.stopPropagation();if(!e.repeat)setHold(h=>!h);return}
   const k=KEY_ROWS.indexOf(e.code);if(k<0)return;e.preventDefault();e.stopPropagation();if(e.repeat)return;
   const l=live.current,hz=degreeHz(l.root,l.scale,k-7);start('key:'+e.code,hz,e.shiftKey?1:.8);if(readoutRef.current)readoutRef.current.textContent=hz.toFixed(2)+' Hz · step '+(k-7)};
  const up=e=>{if(KEY_ROWS.includes(e.code))stop('key:'+e.code)};
  const blur=()=>{for(const source of[...held.current.keys()])stop(source)};
  document.addEventListener('keydown',down,true);document.addEventListener('keyup',up,true);window.addEventListener('blur',blur);
  return()=>{document.removeEventListener('keydown',down,true);document.removeEventListener('keyup',up,true);window.removeEventListener('blur',blur)}},[panic,start,stop]);

 /* scope: kaleidoscopic left/right figure plus the scale grid. Runs only while this room is mounted and the tab is visible. */
 P.useEffect(()=>{const canvas=canvasRef.current;if(!canvas)return;const g=canvas.getContext('2d');let raf=0,hue=0,bufL=null,bufR=null,idle=0;
  const draw=()=>{raf=requestAnimationFrame(draw);if(document.hidden)return;
   const w=canvas.clientWidth|0,h=canvas.clientHeight|0;if(!w||!h)return;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;idle=0}
   const an=engine.anL,playing=!!an&&(held.current.size>0||latched.current.size>0);
   let peak=0;if(an){if(!bufL||bufL.length!==an.fftSize){bufL=new Float32Array(an.fftSize);bufR=new Float32Array(an.fftSize)}an.getFloatTimeDomainData(bufL);engine.anR.getFloatTimeDomainData(bufR);for(let i=0;i<bufL.length;i+=8){const a=Math.abs(bufL[i]);if(a>peak)peak=a}}
   if(!playing&&peak<.002){if(idle++>2)return}else idle=0; // nothing to show: keep the last frame, spend nothing
   g.globalCompositeOperation='source-over';g.fillStyle='rgba(5,3,12,.3)';g.fillRect(0,0,w,h);
   // scale grid
   const l=live.current,per=l.scale.period,n=l.scale.ratios.length;g.lineWidth=1;
   for(let o=-1;o<PAD_PERIODS-1;o++)for(let i=0;i<n;i++){const x=(o+1+Math.log(l.scale.ratios[i])/Math.log(per))/PAD_PERIODS*w;g.strokeStyle=i===0?'rgba(255,209,102,.5)':n>40?'rgba(140,120,220,.10)':'rgba(140,120,220,.22)';g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke()}
   if(an&&peak>.001){hue=(hue+.7)%360;const cx=w/2,cy=h/2,rad=Math.min(w,h)*.42,arms=6;g.globalCompositeOperation='lighter';g.lineWidth=1;const gain=rad/Math.max(.25,peak*1.15);
    for(let a=0;a<arms;a++){const rot=a*Math.PI*2/arms+hue*.004,cs=Math.cos(rot),sn=Math.sin(rot);g.strokeStyle='hsla('+((hue+a*60)%360)+',95%,60%,.16)';g.beginPath();
     for(let i=0;i<bufL.length;i+=2){const x=bufL[i]*gain,y=bufR[i]*gain,px=cx+x*cs-y*sn,py=cy+x*sn+y*cs;if(i)g.lineTo(px,py);else g.moveTo(px,py)}g.stroke()}}};
  raf=requestAnimationFrame(draw);return()=>cancelAnimationFrame(raf)},[engine]);

 const touched=P.useCallback(()=>{persist()},[persist]);
 const loadPatch=P.useCallback((p,note)=>{const clean=sanitizePatch(p);patchRef.current={...clean,id:'working'};setScaleText(clean.scale);setRootText(String(clean.root));engine.setAll(clean.params);setEpoch(e=>e+1);setStatus(note||('Loaded “'+clean.name+'”.'));persist()},[engine,persist]);
 const all=P.useMemo(()=>[...FACTORY,...user],[user]);
 const onSelect=id=>{setSelected(id);const p=all.find(x=>x.id===id);if(p)loadPatch(p)};
 const saveAs=()=>{const current=all.find(x=>x.id===selected);const name=window.prompt('Name for this patch',current&&!current.id.startsWith('factory:')?current.name:'My patch');if(!name||!name.trim())return;
  const existing=user.find(x=>x.name===name.trim());if(existing&&!window.confirm('Overwrite the saved patch “'+existing.name+'”?'))return;
  const saved={...sanitizePatch({...patchRef.current,name:name.trim(),id:existing?existing.id:'user:'+uid()})};setUser(list=>existing?list.map(x=>x.id===existing.id?saved:x):[...list,saved]);setSelected(saved.id);setStatus('Saved “'+saved.name+'”.')};
 const remove=()=>{const p=user.find(x=>x.id===selected);if(!p||!window.confirm('Delete the saved patch “'+p.name+'”? The sound you hear stays as working patch.'))return;setUser(list=>list.filter(x=>x.id!==p.id));setSelected('');setStatus('Deleted “'+p.name+'”.')};
 const doMutate=()=>{const params=patchRef.current.params.slice();for(const p of PARAMS){if(p[8]==='hidden'||p[1]==='level')continue;if(Math.random()<.55){const t=clamp(toUnit(p,params[p[0]])+(Math.random()-.5)*2*mutate*.6,0,1);params[p[0]]=fromUnit(p,t)}}
  params[BY_KEY.delayFb[0]]=Math.min(params[BY_KEY.delayFb[0]],.95);loadPatch({...patchRef.current,params},'Mutated by '+Math.round(mutate*100)+' %. Not happy? Load a patch or mutate again.')};
 const notesForBounce=()=>{const l=live.current,out=[];for(const key of latched.current.keys())out.push(Math.pow(2,key/1200));return out.length?out.slice(0,6):[l.root]};
 const doBounce=async target=>{if(busy)return;setBusy(true);setStatus('Rendering '+bounceSec+' s offline …');
  try{const l=live.current,rate=engine.ctx?.sampleRate||48000,r=await bounce({params:patchRef.current.params.map((v,i)=>i===37?0:v),res:resonatorHz(l.root,l.scale),notes:notesForBounce(),seconds:bounceSec,sampleRate:rate});
   if(!(r.peak>1e-4))throw Error('The render is silent (level, envelope or cutoff?).');
   const name='PsyLab · '+(all.find(x=>x.id===selected)?.name||'patch')+' · '+new Date().toISOString().slice(11,19).replace(/:/g,'');
   if(target==='multitrack'){await __XenMultitrackInbox.send({channels:[r.left,r.right],sampleRate:r.sampleRate,name,origin:'psylab'});setStatus('Sent “'+name+'” ('+bounceSec+' s, peak '+r.peak.toFixed(2)+'): it is now a Material and waits in Room IV · Multitrack.')}
   else{const blob=await __xenRecorderFloatWav(r.left,r.right,r.sampleRate),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name.replace(/[^\w.-]+/g,'_')+'.wav';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);setStatus('Downloaded “'+a.download+'” (32-bit float WAV, peak '+r.peak.toFixed(2)+').')}}
  catch(e){setStatus('Bounce failed: '+String(e?.message||e))}finally{setBusy(false)}};

 const panels=GROUPS.map(([id,title,text])=>u.jsxs('section',{className:'xpl-panel','aria-label':title,children:[u.jsx('h3',{children:title}),text?u.jsx('p',{children:text}):null,
  PARAMS.filter(p=>p[8]===id).map(p=>u.jsx(PsySlider,{p,patchRef,engine,onTouched:touched},p[1]+':'+epoch))]},id));
 return u.jsxs('div',{className:'xpl',ref:rootRef,'data-xen-psylab':'true',children:[
  u.jsx('h2',{children:'PSYCHEDELIC LAB'}),
  u.jsx('p',{className:'xpl-sub',children:'Room V. A feedback-FM hydra, an endless Escher staircase, a spiral echo that shifts every repeat, scale-tuned crystals and a Lorenz attractor that never repeats itself. Play the pad or the keyboard, shape the sound, then bounce it into your material.'}),
  u.jsxs('div',{className:'xpl-bar',children:[
   u.jsxs('select',{'aria-label':'Patch',value:selected,onChange:e=>onSelect(e.target.value),children:[u.jsx('option',{value:'',children:'Working patch'}),
    u.jsx('optgroup',{label:'Factory',children:FACTORY.map(p=>u.jsx('option',{value:p.id,children:p.name},p.id))}),
    user.length?u.jsx('optgroup',{label:'Saved',children:user.map(p=>u.jsx('option',{value:p.id,children:p.name},p.id))}):null]}),
   u.jsx('button',{type:'button',onClick:saveAs,children:'Save as …'}),
   u.jsx('button',{type:'button',onClick:remove,disabled:!user.some(x=>x.id===selected),children:'Delete'}),
   u.jsx('button',{type:'button',onClick:doMutate,title:'Move a random half of the controls by the chosen amount',children:'Mutate'}),
   u.jsx('input',{type:'range','aria-label':'Mutation amount',min:.02,max:1,step:.01,value:mutate,onChange:e=>setMutate(Number(e.target.value)),style:{width:90,accentColor:'#ff7ad9'}}),
   u.jsx('button',{type:'button','aria-pressed':hold,onClick:()=>setHold(h=>!h),title:'Notes keep sounding until you play them again (Space)',children:hold?'Hold: on':'Hold: off'}),
   u.jsx('button',{type:'button',onClick:panic,title:'Esc',children:'All notes off'}),
   u.jsx('span',{style:{flex:'1 1 20px'}}),
   u.jsxs('label',{className:'xpl-note',children:['Bounce ',u.jsx('input',{type:'number','aria-label':'Bounce length in seconds',min:.5,max:120,step:.5,value:bounceSec,onChange:e=>setBounceSec(clamp(Number(e.target.value)||8,.5,120)),style:{width:64}}),' s']}),
   u.jsx('button',{type:'button',disabled:busy,onClick:()=>void doBounce('multitrack'),title:'Render the held notes (or the root) offline and store the result as Material; it appears in Room IV',children:'→ Multitrack'}),
   u.jsx('button',{type:'button',disabled:busy,onClick:()=>void doBounce('wav'),children:'⤓ WAV'})]}),
  u.jsxs('div',{className:'xpl-main',children:[
   u.jsxs('div',{children:[
    u.jsxs('div',{className:'xpl-pad',ref:padRef,role:'application','aria-label':'Play pad: horizontal pitch, vertical intensity',children:[u.jsx('canvas',{ref:canvasRef}),u.jsx('div',{className:'xpl-readout',ref:readoutRef}),
     u.jsx('div',{className:'xpl-pad-hint',children:'← lower · pitch · higher →   ↑ intensity (Pad Y)   gold line = root'})]}),
    u.jsxs('div',{className:'xpl-tune',children:[
     u.jsx('label',{htmlFor:'xpl-root',children:'Root Hz'}),u.jsx('input',{id:'xpl-root',type:'text',inputMode:'decimal',value:rootText,onChange:e=>setRootText(e.target.value),onKeyDown:e=>{if(e.key==='Enter')e.target.blur()}}),
     u.jsx('label',{htmlFor:'xpl-scale',children:'Scale'}),u.jsx('input',{id:'xpl-scale',type:'text',value:scaleText,onChange:e=>setScaleText(e.target.value),onKeyDown:e=>{if(e.key==='Enter')e.target.blur()},spellCheck:false}),
     u.jsx('span',{}),u.jsxs('div',{className:'xpl-note',children:[scale.error?u.jsx('span',{className:'xpl-err',children:scale.error+' '}):null,scale.ratios.length+' steps per period '+(+scale.period.toFixed(4))+'. Write “19edo”, “13ed3”, ratios “1/1 9/8 5/4 3/2”, cents “386c”, or add “@3/1” for another period. ',
      u.jsxs('label',{children:[u.jsx('input',{type:'checkbox',checked:snap,onChange:e=>setSnap(e.target.checked)}),' Pad snaps to the scale']})]})]}),
    u.jsx('div',{className:'xpl-status',role:'status','aria-live':'polite',children:status}),
    u.jsx('div',{className:'xpl-keys',children:'Keyboard: Y/Z-row, A-row, Q-row and number row walk upwards through the scale (36 steps), Shift = louder. Space = Hold. Esc = all notes off. After typing a root or scale press Enter to play again. Click a value to type it exactly, double-click a slider to reset it. The header Rec records this room too.'})]}),
   u.jsx('div',{className:'xpl-panels',children:panels})]})]});
}
return Object.freeze({XenPsyLabRoom,__test:Object.freeze({PARAMS,RANGES,FACTORY,parseScale,degreeHz,resonatorHz,toUnit,fromUnit,sanitizePatch,moduleCode,STORE_KEY})});
})()
