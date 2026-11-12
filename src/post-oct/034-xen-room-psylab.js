(()=>{"use strict";
/* ROOM5-01 · Room V · Psychedelic Lab (deferred chunk, evaluated on first open only).
 * Cold by contract: no timers, listeners or audio nodes while the room is closed.
 * One AudioWorklet engine (xen-psylab-v1) on the LIVE AudioContext, routed into the live master
 * input "main" through the shell bridge, so Rec, Loop-Rec and Live Mastering hear it.
 * Tuning is the Main Room's grid (any system, mode, base, muted steps, offsets): nothing assumes 12-EDO.
 * Data owner: localStorage "xensonar.psylab.instruments.v1" (working patch + user patches, view and metronome preferences). The grid is owned by the Main Room.
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
 ['crystal','CRYSTAL','Resonators tuned to the Main Room grid ring along with the sound.'],
 ['chaos','CHAOS','A Lorenz attractor moves the sound. It never repeats.'],['out','OUT','']];
function toUnit(p,v){const[, , ,lo,hi, ,curve]=p;v=clamp(v,lo,hi);if(curve==='exp')return Math.log(v/lo)/Math.log(hi/lo);if(curve==='cube'){const m=Math.max(Math.abs(lo),Math.abs(hi));return .5+.5*Math.cbrt(v/m)}return(v-lo)/(hi-lo)}
function fromUnit(p,t){const[, , ,lo,hi, ,curve]=p;t=clamp(t,0,1);if(curve==='exp')return lo*Math.pow(hi/lo,t);if(curve==='cube'){const m=Math.max(Math.abs(lo),Math.abs(hi)),x=2*t-1;return clamp(m*x*x*x,lo,hi)}return lo+(hi-lo)*t}
function fmt(p,v){const unit=p[7],a=Math.abs(v);const n=a>=1000?v.toFixed(0):a>=100?v.toFixed(1):a>=10?v.toFixed(2):v.toFixed(3);return unit?n+' '+unit:n}
function defaultParams(){return RANGES.def.slice()}
function sanitizeParams(a){const out=defaultParams();if(Array.isArray(a))for(const p of PARAMS){const v=Number(a[p[0]]);if(Number.isFinite(v))out[p[0]]=clamp(v,p[3],p[4])}out[37]=0;return out}

/* Pitch comes from the Main Room grid (ROOM5-02): the Live Room owns tuning, mode, base Hz, muted steps and offsets; this room reads and
   edits them through __NodalBallGrid, draws them with the Live Room's own grid layer and plays the Live Room's keys. There is no second scale here. */
const liveGridParams=()=>{const p=__NodalBallGrid.params();return p?__xenLiveGridParams(p):null};
function gridNotes(p){return uw(p.gridBase,p.gridTuning,p.manualGridMutedSteps??[],p.manualGridStepOffsets??[])}
/* up to eight resonator frequencies, spread over the audible grid degrees (the grid lists them from high to low) */
function gridResonators(p,oct){const notes=p?gridNotes(p):[];if(!notes.length)return[220];const out=[],step=Math.max(1,Math.floor(notes.length/8));
 for(let i=notes.length-1;i>=0&&out.length<8;i-=step)out.push(notes[i]*Math.pow(2,oct));return out}
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
 constructor(options){this.visual=!options||options.visual!==false;this.ctx=null;this.node=null;this.out=null;this.anL=null;this.anR=null;this.split=null;this.starting=null;this.pending=new Map();this.raf=0;this.queue=[];this.params=defaultParams();this.res=[220];this.closed=false}
 async ensure(){if(this.node)return this.node;if(this.starting)return this.starting;
  this.starting=(async()=>{const bridge=__xenMultitrackBridge.current;if(!bridge)throw Error('The audio bridge is not ready: open the Live Room once.');
   const ctx=await bridge.ensureAudioReady();await loadModule(ctx);if(this.closed)throw Error('Room closed.');
   const node=new AudioWorkletNode(ctx,'xen-psylab-v1',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2],processorOptions:{params:this.params.slice(),res:this.res.slice()}});
   const out=ctx.createGain();out.gain.value=1;node.connect(out);out.connect(bridge.getMasterInput(ctx));
   // The picture (scope + spectrum) needs two analysers; a host that shows no picture (options.visual=false) creates none of them.
   let split=null,anL=null,anR=null;
   if(this.visual){split=ctx.createChannelSplitter(2);anL=ctx.createAnalyser();anR=ctx.createAnalyser();anL.fftSize=anR.fftSize=1024;anL.smoothingTimeConstant=.6;node.connect(split);split.connect(anL,0);split.connect(anR,1)}
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
  setTimeout(()=>{try{node.port.postMessage({t:'dispose'});node.disconnect();out.disconnect();split?.disconnect();anL?.disconnect();anR?.disconnect()}catch{}},400)}
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
/* A patch is a sound (the 39 numbers), not a tuning. `grid` is only a suggestion shown next to the patch. */
const patch=(name,grid,over)=>{const params=defaultParams();for(const k in over)params[BY_KEY[k][0]]=over[k];return{id:'factory:'+name,name,grid,params}};
const FACTORY=[
 patch('Liquid Bell','ji',{ratioB:3.5,ratioC:7.07,fmAB:2.2,fmBC:.7,fmCA:.1,opMix:.05,fold:.05,attack:.004,release:2.6,delayTime:.33,delayFb:.5,delayMix:.32,loopShift:.4,detune:6,cPan:.35}),
 patch('Escher Staircase','12edo',{shepMix:1,shepRate:.12,shepInterval:2,ratioB:1.5,ratioC:2,fmAB:.5,fmBC:.3,fmCA:.2,fold:.1,attack:.4,release:3,delayTime:.5,delayFb:.4,delayMix:.25,cutoff:6000,detune:12}),
 patch('Barber Spiral','12edo',{ratioB:1,ratioC:2,fmAB:.6,fmBC:.2,fmCA:0,fold:.12,attack:.01,release:.9,delayTime:.27,delayFb:.86,delayMix:.5,loopShift:7,spread:.8,cutoff:5200,reso:.2}),
 patch('Chaos Insect','22edo',{ratioB:2.76,ratioC:.51,fmAB:4.5,fmBC:3.2,fmCA:2.4,selfFb:.6,fold:.35,crush:.25,attack:.003,release:.35,chaosRate:6,cFm:.8,cPan:.9,cFold:.5,delayTime:.11,delayFb:.6,delayMix:.25,loopShift:-14}),
 patch('Crystal Cave','ji',{ratioB:2,ratioC:5,fmAB:.9,fmBC:.4,fold:.05,attack:.002,release:.25,resMix:.6,resQ:320,delayTime:.62,delayFb:.55,delayMix:.35,loopShift:.25,cutoff:9000}),
 patch('Deep Fold Drone','ji',{ratioB:.5,ratioC:1.5,fmAB:.8,fmBC:.5,fmCA:.4,fold:.7,opMix:.25,attack:1.6,release:6,cutoff:1400,reso:.35,chaosRate:.12,cFold:.7,cCut:.6,cPan:.5,delayTime:.9,delayFb:.6,delayMix:.3,loopShift:-.3,detune:18,drive:.4}),
 patch('Tritave Ghost','bp',{shepMix:.8,shepRate:-.07,shepInterval:3,ratioB:3,ratioC:1.6667,fmAB:1.1,fmBC:.6,fmCA:.5,fold:.2,attack:.25,release:4,shiftHz:5,shiftMix:.35,delayTime:.74,delayFb:.7,delayMix:.4,loopShift:2.2,cShift:.4,chaosRate:.25}),
 patch('Alien Choir','ji',{ratioB:1.005,ratioC:2.99,fmAB:1.6,fmBC:.9,fmCA:.7,opMix:.4,fold:.25,morph:.45,cutoff:1800,reso:.55,shiftHz:11,shiftMix:.5,detune:28,attack:.3,release:2.2,cCut:.5,cShift:.6,chaosRate:.8,delayTime:.42,delayFb:.5,delayMix:.3,loopShift:-3})];
/* `scale` / `root` of patches saved by the first version of this room are kept untouched (never deleted), but no longer used. */
function sanitizePatch(p,fallbackName){const out={id:typeof p?.id==='string'?p.id:'user:'+uid(),name:String(p?.name||fallbackName||'Patch').slice(0,60),params:sanitizeParams(p?.params)};
 if(typeof p?.grid==='string')out.grid=p.grid.slice(0,80);if(typeof p?.scale==='string')out.scale=p.scale.slice(0,2000);const root=Number(p?.root);if(root>=8&&root<=8000)out.root=root;return out}
const METRO_DEFAULT={bpm:108,beats:4,vol:.5};
function sanitizeMetro(m){return{bpm:clamp(Number(m?.bpm)||METRO_DEFAULT.bpm,20,400),beats:clamp(Number(m?.beats)||METRO_DEFAULT.beats,.5,64),vol:clamp(Number.isFinite(Number(m?.vol))?Number(m.vol):METRO_DEFAULT.vol,0,1)}}
function loadStore(){try{const raw=localStorage.getItem(STORE_KEY);if(!raw)return null;const data=JSON.parse(raw);if(data?.format!==FORMAT)return null;
  return{working:sanitizePatch(data.working,'Working patch'),user:Array.isArray(data.user)?data.user.slice(0,500).map(p=>sanitizePatch(p)):[],hold:data.hold===true,snap:data.snap!==false,bounceSec:clamp(Number(data.bounceSec)||8,.5,120),
   orient:data.orient==='piano'?'piano':'live',flip:data.flip===true,mirror:data.mirror===true,large:data.large===true,log:data.log===true,edges:data.edges!==false,oct:clamp(Math.round(Number(data.oct)||0),-3,4),metro:sanitizeMetro(data.metro)}}catch{return null}}
function saveStore(state){try{localStorage.setItem(STORE_KEY,JSON.stringify({format:FORMAT,version:VERSION,working:state.working,user:state.user,hold:state.hold,snap:state.snap,bounceSec:state.bounceSec,orient:state.orient,flip:state.flip,mirror:state.mirror,large:state.large,log:state.log,edges:state.edges,oct:state.oct,metro:state.metro,updatedAt:Date.now()}));return true}catch{return false}}

/* ---------- ROOM5-08: host for the Live Room (preparation, not wired to any control yet) ----------
   One headless engine per lane ("keyboard", "wave"), so keyboard and Wave Starter may use different patches at the same time.
   No analysers, no mandala, no metronome: nothing is drawn in the Live Room. Sound ids are "psylab:<patch id>" (same pattern as "sample:" / "nodal:").
   The engine is created on the first note of a lane, not before; reading the patch list costs one localStorage read. */
const LiveHost=(()=>{
 const engines=new Map(),active=new Map(),PREFIX='psylab:';
 const patches=()=>{const st=loadStore();return FACTORY.concat(st?st.user:[])};
 const isId=v=>typeof v==='string'&&v.startsWith(PREFIX);
 const find=id=>{const pid=isId(id)?id.slice(PREFIX.length):id;return patches().find(q=>q.id===pid)||null};
 const entries=()=>patches().map(q=>({value:PREFIX+q.id,label:q.name,hint:'Psy Lab'+(q.grid?' · '+q.grid:''),originLabel:'Psy Lab'}));
 function engineFor(lane,id){let rec=engines.get(lane);const pt=find(id);if(!pt)return null;
  if(!rec){rec={engine:new PsyEngine({visual:false}),patch:null};engines.set(lane,rec)}
  if(rec.patch!==pt.id){rec.patch=pt.id;rec.engine.setAll(pt.params)}return rec.engine}
 return{isId,find,entries,
  start(lane,keyId,id,hz,vel){const e=engineFor(lane,id);if(!e)return false;const k=lane+':'+keyId;if(active.has(k))e.noteOff(k);active.set(k,e);e.noteOn(k,hz,vel==null?.8:vel);return true},
  bend(lane,keyId,hz){const k=lane+':'+keyId;active.get(k)?.bend(k,hz)},
  stop(lane,keyId){const k=lane+':'+keyId,e=active.get(k);if(e){e.noteOff(k);active.delete(k)}},
  allOff(lane){for(const[k,e]of active)if(!lane||k.startsWith(lane+':')){e.noteOff(k);active.delete(k)}},
  dispose(){for(const rec of engines.values())rec.engine.dispose();engines.clear();active.clear()},
  status(){return{lanes:[...engines.keys()],active:active.size,visual:[...engines.values()].map(r=>r.engine.visual)}}}})();

/* ---------- metronome: for the player only ---------- */
/* Clicks go straight to the speakers (ctx.destination), NOT into the live master input: Rec, Loop-Rec, Live Mastering and the bounce never hear them.
   A 25 ms timer schedules every click 120 ms ahead on the audio clock; it exists only while the metronome runs. */
class Metronome{
 constructor(){this.ctx=null;this.out=null;this.timer=0;this.running=false;this.bpm=108;this.beats=4;this.vol=.5;this.k=0;this.next=0;this.onBeat=null;this.starting=false}
 async start(){if(this.running||this.starting)return;this.starting=true;
  try{const bridge=__xenMultitrackBridge.current;if(!bridge)throw Error('The audio bridge is not ready: open the Live Room once.');const ctx=await bridge.ensureAudioReady();
   this.ctx=ctx;this.out=ctx.createGain();this.out.gain.value=this.vol;this.out.connect(ctx.destination);this.k=0;this.next=ctx.currentTime+.08;this.running=true;this.tick()}
  finally{this.starting=false}}
 stop(){this.running=false;clearTimeout(this.timer);this.timer=0;const out=this.out;this.out=null;if(out){try{out.gain.setTargetAtTime(0,this.ctx.currentTime,.01)}catch{}setTimeout(()=>{try{out.disconnect()}catch{}},120)}}
 setVolume(v){this.vol=v;if(this.out)this.out.gain.setTargetAtTime(v,this.ctx.currentTime,.01)}
 accent(k){const b=this.beats;return k===0||Math.floor(k/b+1e-9)!==Math.floor((k-1)/b+1e-9)}
 tick(){if(!this.running)return;const ctx=this.ctx,spb=60/this.bpm;
  while(this.next<ctx.currentTime+.12){const t=this.next,hi=this.accent(this.k);this.click(t,hi);if(this.onBeat){const wait=Math.max(0,(t-ctx.currentTime)*1000);const cb=this.onBeat;setTimeout(()=>cb(hi),wait)}this.k++;this.next+=spb}
  this.timer=setTimeout(()=>this.tick(),25)}
 click(t,hi){const ctx=this.ctx,o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=hi?1600:1000;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(hi?.9:.6,t+.002);g.gain.exponentialRampToValueAtTime(.0008,t+.045);o.connect(g);g.connect(this.out);o.start(t);o.stop(t+.06);o.onended=()=>{try{g.disconnect()}catch{}}}
}

const CSS=`
.xpl{color:#e9e4ff;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;padding:14px 16px 28px;max-width:1500px;margin:0 auto}
.xpl h2{font-size:20px;letter-spacing:.18em;margin:0;background:linear-gradient(90deg,#ff5ecb,#ffd166,#5ef2ff,#b28dff);-webkit-background-clip:text;background-clip:text;color:transparent}
.xpl-sub{color:#9f96c4;font-size:11px;margin:4px 0 12px;max-width:900px;line-height:1.5}
.xpl-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}
.xpl button,.xpl select,.xpl input[type=text],.xpl input[type=number]{background:#120d24;color:#efe9ff;border:1px solid #4b3d7a;border-radius:6px;padding:6px 10px;font:inherit;min-height:30px}
.xpl button{cursor:pointer}.xpl button:hover:not(:disabled){background:#22184a;border-color:#8f7bff}.xpl button:disabled{opacity:.45;cursor:default}
.xpl button[aria-pressed=true]{background:#3b1d5e;border-color:#ff7ad9;color:#ffd6f3}
.xpl :focus-visible{outline:2px solid #5ef2ff;outline-offset:2px}
.xpl-main{display:grid;grid-template-columns:minmax(320px,1.15fr) minmax(320px,1fr);gap:14px;align-items:start}
.xpl.xpl-large{max-width:1900px}
.xpl-large .xpl-main{grid-template-columns:minmax(0,1fr)}
.xpl-large .xpl-pad{width:min(100%,calc(82vh*1.8966));margin:0 auto}
.xpl-large .xpl-panels{grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}
@media(max-width:980px){.xpl-main{grid-template-columns:minmax(0,1fr)}}
.xpl-pad{position:relative;border:1px solid #4b3d7a;border-radius:10px;overflow:hidden;background:#05030c;touch-action:none;aspect-ratio:1100/580;min-height:220px}
.xpl-pad canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.xpl-pad canvas.xpl-scope{opacity:.3;pointer-events:none}
.xpl-pad-hint{position:absolute;left:150px;bottom:8px;right:10px;color:#b9b0e0;font-size:10px;pointer-events:none;text-shadow:0 0 6px #000}
.xpl-readout{position:absolute;right:10px;top:8px;color:#ffe9a8;font-size:11px;pointer-events:none;text-shadow:0 0 6px #000;text-align:right}
.xpl-gridbox{margin-top:10px;border:1px solid #33285c;border-radius:8px;padding:8px 10px;background:rgba(18,13,36,.6)}
.xpl-gridbox .xen-gridctl{font-size:11px;color:#cfc6f2}
.xpl-gridbox .xen-gridctl button{border-color:#4b3d7a!important}
.xpl-gridbox .xen-gridctl-note{color:#ff9aa8}
.xpl-gridsub{margin-top:6px;color:#9f96c4;font-size:10px;line-height:1.45}
.xpl-metro{display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center;margin:0 0 10px;padding:6px 8px;border:1px solid #33285c;border-radius:8px;background:rgba(18,13,36,.5)}
.xpl-metro label{color:#cfc6f2;font-size:11px;display:flex;align-items:center;gap:5px}
.xpl-beat{width:11px;height:11px;border-radius:50%;background:#2a2150;display:inline-block;transition:background .08s,box-shadow .08s}
.xpl-beat.on{background:#ffd166;box-shadow:0 0 8px #ffd166}.xpl-beat.hi{background:#ff7ad9;box-shadow:0 0 10px #ff7ad9}
.xpl-note{color:#9f96c4;font-size:10px;line-height:1.45}
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


/* ---------- the mandala: full resolution, own canvas behind the pad ---------- */
/* Kaleidoscope (up to twelve arms, each mirrored) of two things at once: the stereo scope figure (left against right channel) and a ring of
   petals from the spectrum (log-spaced bins, loud partials grow outwards). Strokes fade out slowly (destination-out) so moving sound leaves a trail.
   It draws only into its own canvas, never into the pad. It belongs to this room: a host that plays the engine without a picture creates no analysers. */
const TAU=Math.PI*2;
/* Hairlines (lineWidth exactly 1) take the browser's fast path: about 25 times cheaper than a 1.1 px stroke in software-drawn canvases, and plain
   "source-over" is about 6 times cheaper than additive blending there. So the picture is made of one hairline path per colour band, not of dozens of strokes.
   Quality levels: the picture may lose frames, the sound never. The draw loop watches its own frame rate and steps down when the machine cannot keep
   about 40 frames per second while something sounds, and back up when there is plenty of room. */
const MANDALA_LEVELS=[{arms:4,step:16,petals:24,every:2},{arms:6,step:8,petals:48,every:1},{arms:6,step:4,petals:72,every:1},{arms:12,step:4,petals:96,every:1}];
const BANDS=3;
let fadeFrames=0;/* frames of fading after the last sound: about 70 frames leave nothing visible */
function faded(sg){if(++fadeFrames<70)return false;fadeFrames=0;sg.setTransform(1,0,0,1,0,0);sg.globalCompositeOperation='source-over';sg.clearRect(0,0,sg.canvas.width,sg.canvas.height);return true}
function paintMandala(sg,st,bufL,bufR,spec,peak,pitchHue){
 const W=sg.canvas.width,H=sg.canvas.height,lv=MANDALA_LEVELS[st.level];
 st.tick=(st.tick+1)%lv.every;if(st.tick!==0)return peak>.001; // skipped frame: keep what is on the canvas
 sg.setTransform(1,0,0,1,0,0);sg.globalCompositeOperation='destination-out';sg.fillStyle='rgba(0,0,0,'+((peak>.001?.2:.09)*lv.every)+')';sg.fillRect(0,0,W,H);
 if(!(peak>.001))return false;
 fadeFrames=0;
 const cx=W/2,cy=H/2,rad=Math.min(W,H)*.45,gain=rad*.62/Math.max(.2,peak*1.1),arms=lv.arms,step=lv.step,P=lv.petals,n=bufL.length,bins=spec.length,loud=st.loud+=(Math.min(1,peak*2.4+.15)-st.loud)*.1;
 st.hue=(st.hue+.9*lv.every)%360;const hue=(pitchHue+st.hue)%360,wedge=TAU/(arms*2);
 sg.globalCompositeOperation='source-over';sg.lineWidth=1;sg.lineJoin='miter';
 // petal heights: spectrum on a log-like axis, interpolated between bins and smoothed over time, so the ring flows instead of jittering
 const sm=st.petal;for(let j=0;j<=P;j++){const pos=1+Math.pow(j/P,1.7)*(bins*.62),i0=pos|0,fr=pos-i0,v=(spec[i0]*(1-fr)+spec[Math.min(bins-1,i0+1)]*fr)/255;sm[j]+=(v-sm[j])*.18}
 for(let band=0;band<BANDS;band++){
  const fig=new Path2D(),pet=new Path2D();
  for(let k=band;k<arms;k+=BANDS){
   const a0=k*TAU/arms+st.hue*.004;
   for(let mir=0;mir<2;mir++){const m=mir?-1:1;
    // the stereo figure: left against right channel, rotated and mirrored by hand (so that one path holds every arm)
    {const cs=Math.cos(a0),sn=Math.sin(a0);for(let i=0;i<n;i+=step){const x=bufL[i]*gain,y=bufR[i]*gain*m,px=cx+x*cs-y*sn,py=cy+x*sn+y*cs;if(i)fig.lineTo(px,py);else fig.moveTo(px,py)}}
    // the petals: one wedge of the spectrum ring, loud partials grow outwards
    for(let j=0;j<=P;j++){const r=rad*(.72+sm[j]*.17*loud),a=a0+m*(j/P*wedge),px=cx+Math.cos(a)*r,py=cy+Math.sin(a)*r;if(j)pet.lineTo(px,py);else pet.moveTo(px,py)}
   }}
  const h=(hue+band*120)%360;
  sg.strokeStyle='hsla('+h+',92%,64%,.62)';sg.stroke(fig);
  sg.strokeStyle='hsla('+((h+45)%360)+',96%,72%,.5)';sg.stroke(pet);
 }
 return true}
/* frame-rate watcher: called once per drawn frame while the mandala is active */
function watchMandala(st,dtMs,now){
 st.dt+=(dtMs-st.dt)*.08;
 const since=now-st.changed;
 if(st.dt>27&&st.level>0&&since>1200){st.level--;st.changed=now;if(now-st.upAt<8000)st.holdUp=now+30000;if(st.el)st.el.dataset.quality=st.level}
 else if(st.dt<17.5&&st.level<MANDALA_LEVELS.length-1&&since>4000&&now>st.holdUp){st.level++;st.changed=now;st.upAt=now;if(st.el)st.el.dataset.quality=st.level}}

/* ---------- the pad: the Main Room's own pitch space ---------- */
/* Same canvas size (1100 x 580), same frequency range (gj) and the same grid layer as the Live Room. 'live': pitch runs up the page, the blue
   triangles sit at the left edge, the horizontal axis is intensity. 'piano': pitch runs left (low) to right (high), triangles on top, vertical axis is
   intensity. In piano view the layer is drawn through a 90 degree transform, so it is still the very same drawing code. */
const PAD_W=1100,PAD_H=580,SCOPE_W=1100,SCOPE_H=580;
/* orient: 'live' = pitch runs up the page, 'piano' = along the page. flip turns the direction of the pitch axis round (live: low on top, piano: high on the left).
   The view and the direction only change the picture and the pointer: the keys never depend on them. */
function padGeometry(orient,flip,log){const{min,max}=gj(),piano=orient==='piano',ext=piano?PAD_W:PAD_H,len=piano?PAD_H:PAD_W,span=max-min,lspan=Math.log(max/min);
 // t: 0 at the low end of the range, 1 at the high end. Linear = the Main Room's own scale (higher intervals are wider). Logarithmic = every octave is the same width.
 // default direction: high end at y = 0 (top of the page / right end of the piano view)
 return{piano,flip:!!flip,log:!!log,ext,len,min,max,
  yOf:f=>{const t=log?Math.log(Math.max(f,min*.01)/min)/lspan:(f-min)/span,y=(flip?t:1-t)*ext;return y<0?0:y>ext?ext:y},
  freqOf:y=>{const c=y<0?0:y>ext?ext:y,t=flip?c/ext:1-c/ext;return log?min*Math.pow(max/min,t):min+t*span}}}
/* pointer (client) to the layer's own coordinates */
function padLocal(canvas,e,geo){const r=canvas.getBoundingClientRect(),sx=(e.clientX-r.left)/Math.max(1,r.width)*PAD_W,sy=(e.clientY-r.top)/Math.max(1,r.height)*PAD_H;
 return geo.piano?{x:sy,y:PAD_W-sx}:{x:sx,y:sy}}
/* ball target: the nearest un-muted grid line when "Snap" (lockCursorToGrid) is on, else the free pitch */
function padTarget(p,geo,rows,y){if(p&&p.lockCursorToGrid&&rows.length){let best=null,bd=Infinity;for(const row of rows){if(row.manualMuted||row.modeMuted||!Number.isFinite(row.freq))continue;const d=Math.abs(geo.yOf(row.freq)-y);if(d<bd){bd=d;best=row}}if(best)return{y:geo.yOf(best.freq),freq:best.freq}}
 return{y,freq:geo.freqOf(y)}}
/* intensity from the free axis: 'live' left to right, 'piano' bottom to top */
const padIntensity=(geo,x)=>clamp(geo.piano?1-x/geo.len:x/geo.len,0,1);

/* this room has no loops or slots on the letter keys: all three rows are pitch keys (32 positions), so the highlighted key window of the grid layer is the 32-key one */
const keyWindowViews=new WeakMap();
function keyWindowView(p){let v=keyWindowViews.get(p);if(!v){v=Object.create(p,{resonanceHotkeyMode:{value:'keyboard-extension',enumerable:true}});keyWindowViews.set(p,v)}return v}

/* One grid step up or down from a pitch, with the Live Room's own function (arrow keys with "Snap"): muted steps are skipped, the range ends are kept. */
function stepGridHz(p,hz,dir){return Qa(uZ(Zs(hz),dir,p.gridBase,p.gridTuning,p.manualGridMutedSteps,p.manualGridStepOffsets))}
/* Notes that sound right now, drawn over the grid in pink/violet: the green line stays "the last one moved", these are all the others that are active (Hold, chords, several keys). */
function paintActiveNotes(g,geo,notesHz,ballY){
 if(!notesHz.size)return;const len=geo.len;
 g.save();g.lineWidth=2;
 for(const hz of notesHz.values()){const y=geo.yOf(hz);
  const gr=g.createLinearGradient(0,0,len,0);gr.addColorStop(0,'rgba(255,115,220,.9)');gr.addColorStop(.5,'rgba(200,120,255,.5)');gr.addColorStop(1,'rgba(255,115,220,.9)');
  g.strokeStyle=gr;g.beginPath();g.moveTo(0,y);g.lineTo(len,y);g.stroke();
  if(Math.abs(y-ballY)>2){g.fillStyle='rgba(255,130,225,.95)';g.beginPath();g.moveTo(15,y);g.lineTo(0,y-5.5);g.lineTo(0,y+5.5);g.closePath();g.fill()}}
 g.restore()}
/* Which key plays which grid line, written at the right end of the line (the Live Room's key window: 20 or, with the third row, 32 keys). Cached until the grid, the window or the view changes. */
const KEYCAPS_FIRST=['1','2','3','4','5','6','7','8','9','0','Q','W','E','R','T','Z','U','I','O','P'];
function keyLabelLines(p,geo,windowOffset,mirror){
 const caps=KEYCAPS_FIRST.concat(__XenKeyboardLayout.keycaps()),n=caps.length,out=[];
 for(let k=0;k<n;k++){const idx=mirror?n-1-k:k,hz=wF(p.gridBase,p.gridTuning,windowOffset,idx,p.manualGridMutedSteps,p.manualGridStepOffsets);if(hz===null||!Number.isFinite(hz)||hz<=0)continue;out.push({y:geo.yOf(hz),hz,cap:caps[k]})}
 out.sort((a,b)=>a.y-b.y);const kept=[];let lastY=-99;for(const e of out){if(e.y-lastY<9.5)continue;kept.push(e);lastY=e.y}
 return kept}
function paintKeyLabels(g,geo,lines){if(!lines.length)return;g.save();g.font='9px monospace';g.textAlign='right';g.fillStyle='rgba(215,195,255,.62)';for(const e of lines)g.fillText(e.cap,geo.len-5,e.y-3);g.restore()}
const useGrid=()=>{P.useSyncExternalStore(__NodalBallGrid.subscribe,__NodalBallGrid.snapshot,__NodalBallGrid.snapshot);return __NodalBallGrid.params()};

function XenPsyLabRoom(){
 useStyle();
 const gridParams=useGrid(),keyboardLayout=P.useSyncExternalStore(__XenKeyboardLayout.subscribe,__XenKeyboardLayout.getSnapshot,__XenKeyboardLayout.getSnapshot);
 const initial=P.useMemo(()=>loadStore()||{working:{...sanitizePatch(FACTORY[0]),id:'working'},user:[],hold:false,snap:true,bounceSec:8,orient:'live',flip:false,mirror:false,large:false,log:false,edges:true,oct:0,metro:{...METRO_DEFAULT}},[]);
 const patchRef=P.useRef(initial.working),engineRef=P.useRef(null),metroRef=P.useRef(null);if(!engineRef.current)engineRef.current=new PsyEngine();if(!metroRef.current)metroRef.current=new Metronome();
 const engine=engineRef.current,metro=metroRef.current;
 const[user,setUser]=P.useState(initial.user),[selected,setSelected]=P.useState(''),[epoch,setEpoch]=P.useState(0);
 const[hold,setHold]=P.useState(initial.hold),[bounceSec,setBounceSec]=P.useState(initial.bounceSec),[orient,setOrient]=P.useState(initial.orient),[oct,setOct]=P.useState(initial.oct),[flip,setFlip]=P.useState(initial.flip),[mirror,setMirror]=P.useState(initial.mirror),[large,setLarge]=P.useState(initial.large),[logAxis,setLogAxis]=P.useState(initial.log),[edges,setEdges]=P.useState(initial.edges);
 const[metroOn,setMetroOn]=P.useState(false),[metroCfg,setMetroCfg]=P.useState(initial.metro);
 const[status,setStatus]=P.useState(''),[busy,setBusy]=P.useState(false),[mutate,setMutate]=P.useState(.25);
 const live=P.useRef({hold,user,bounceSec,orient,flip,mirror,large,log:logAxis,edges,oct,metro:metroCfg});live.current={hold,user,bounceSec,orient,flip,mirror,large,log:logAxis,edges,oct,metro:metroCfg};
 const padRef=P.useRef(null),canvasRef=P.useRef(null),scopeRef=P.useRef(null),readoutRef=P.useRef(null),rootRef=P.useRef(null),beatRef=P.useRef(null);
 const held=P.useRef(new Map()),latched=P.useRef(new Map()),notesHz=P.useRef(new Map()),arrow=P.useRef({up:false,down:false,left:false,right:false,id:null}),intensity=P.useRef(.5),keyLines=P.useRef({sig:'',lines:[]}),saveTimer=P.useRef(0),noteSeq=P.useRef(100),tapTimes=P.useRef([]);
 const focus=P.useRef({x:PAD_W*.5,y:PAD_H*.5,inside:false}),ball=P.useRef({cursorX:PAD_W*.5,cursorY:PAD_H*.5,freq:0});
 const gridRef=P.useRef(null);gridRef.current=gridParams;

 const snapshot=()=>{const l=live.current;return{working:{...patchRef.current,id:'working'},user:l.user,hold:l.hold,snap:true,bounceSec:l.bounceSec,orient:l.orient,flip:l.flip,mirror:l.mirror,large:l.large,log:l.log,edges:l.edges,oct:l.oct,metro:l.metro}};
 const persist=P.useCallback(()=>{clearTimeout(saveTimer.current);saveTimer.current=setTimeout(()=>saveStore(snapshot()),600)},[]);
 const flush=P.useCallback(()=>{clearTimeout(saveTimer.current);saveStore(snapshot())},[]);
 P.useEffect(()=>{persist()},[hold,user,bounceSec,orient,flip,mirror,large,logAxis,edges,oct,metroCfg,persist]);
 /* the crystal resonators follow the Main Room grid (and the octave shift) */
 P.useEffect(()=>{engine.setRes(gridResonators(gridParams,oct))},[gridParams,oct,engine]);
 P.useEffect(()=>{engine.setAll(patchRef.current.params);const onHide=()=>flush();window.addEventListener('pagehide',onHide);
  return()=>{window.removeEventListener('pagehide',onHide);flush();engine.dispose();metro.onBeat=null;metro.stop()}},[engine,metro,flush]);

 /* metronome: its own clock, its own output, never recorded */
 P.useEffect(()=>{metro.bpm=metroCfg.bpm;metro.beats=metroCfg.beats;metro.setVolume(metroCfg.vol)},[metroCfg,metro]);
 P.useEffect(()=>{metro.onBeat=hi=>{const el=beatRef.current;if(!el)return;el.className='xpl-beat '+(hi?'hi':'on');clearTimeout(el.__off);el.__off=setTimeout(()=>{if(el)el.className='xpl-beat'},90)};
  if(metroOn)void metro.start().catch(e=>{setMetroOn(false);setStatus('Metronome: '+String(e?.message||e))});else metro.stop();return()=>{metro.onBeat=null}},[metroOn,metro]);
 const setMetro=patch=>setMetroCfg(c=>sanitizeMetro({...c,...patch}));
 const tapTempo=()=>{const now=performance.now(),t=tapTimes.current;if(t.length&&now-t[t.length-1]>2000)t.length=0;t.push(now);if(t.length>6)t.shift();
  if(t.length>=2){const bpm=60000/((t[t.length-1]-t[0])/(t.length-1));setMetro({bpm:Math.round(bpm*10)/10})}};
 const useLiveTempo=()=>{const bpm=__xenMultitrackBridge.current?.getLiveBpm?.();if(bpm>0){setMetro({bpm:Math.round(bpm*10)/10});setStatus('Metronome tempo taken from the Live Room: '+Math.round(bpm*10)/10+' BPM.')}else setStatus('The Live Room has no tempo yet.')};

 const release=P.useCallback(id=>{notesHz.current.delete(id);engine.noteOff(id)},[engine]);
 const panic=P.useCallback(()=>{held.current.clear();latched.current.clear();notesHz.current.clear();arrow.current.up=arrow.current.down=arrow.current.left=arrow.current.right=false;engine.allOff();setStatus('All notes off.')},[engine]);
 /* A note started by key or pad. With Hold on it keeps sounding until it is played again or Hold is switched off. */
 const start=P.useCallback((source,hz,vel)=>{const l=live.current;
  if(l.hold){const key=Math.round(1200*Math.log2(hz));const old=latched.current.get(key);if(old!==undefined){latched.current.delete(key);release(old);return null}
   const id=++noteSeq.current;latched.current.set(key,id);notesHz.current.set(id,hz/Math.pow(2,l.oct));engine.noteOn(id,hz,vel);return null}
  const id=++noteSeq.current;held.current.set(source,id);notesHz.current.set(id,hz/Math.pow(2,l.oct));engine.noteOn(id,hz,vel);return id},[engine,release]);
 const stop=P.useCallback(source=>{const id=held.current.get(source);if(id===undefined)return;held.current.delete(source);release(id)},[release]);
 P.useEffect(()=>{if(!hold&&latched.current.size){for(const id of latched.current.values())release(id);latched.current.clear()}},[hold,release]);

 /* pad: pointer. The blue triangles work exactly like in the Live Room (click = mute/unmute, drag = fine tune, right click = new base). */
 const handle=P.useRef(null),setMacro=P.useCallback(v=>{patchRef.current.params[37]=0;engine.setParam(37,v)},[engine]);
 P.useEffect(()=>{const canvas=canvasRef.current;if(!canvas)return;
  const show=(hz,label)=>{if(readoutRef.current)readoutRef.current.textContent=hz.toFixed(2)+' Hz · '+(1200*Math.log2(hz/(gridRef.current?.gridBase||440))).toFixed(0)+' ct vs base'+(label||'')};
  const down=e=>{if(e.button!==0)return;e.preventDefault();document.activeElement?.blur?.();try{canvas.setPointerCapture(e.pointerId)}catch{};const p=liveGridParams();if(!p)return;
   const geo=padGeometry(live.current.orient,live.current.flip,live.current.log),pt=padLocal(canvas,e,geo),rows=__NodalBallGrid.rows(),hit=__XenGridHandles.hit(rows,geo.yOf,pt.x,pt.y);
   focus.current={x:pt.x,y:pt.y,inside:true};
   if(hit){handle.current={step:hit.stepIndex,startY:pt.y,base:p.manualGridStepOffsets?.[hit.stepIndex]??0,moved:false,pointer:e.pointerId};return}
   const tg=padTarget(p,geo,rows,pt.y),hz=tg.freq*Math.pow(2,live.current.oct);intensity.current=padIntensity(geo,pt.x);setMacro(intensity.current);start('pad:'+e.pointerId,hz,.9);show(hz)};
  const move=e=>{const p=liveGridParams(),geo=padGeometry(live.current.orient,live.current.flip,live.current.log),pt=padLocal(canvas,e,geo),rows=__NodalBallGrid.rows();focus.current={x:pt.x,y:pt.y,inside:true};
   const h=handle.current;
   if(h&&h.pointer===e.pointerId){h.moved=true;__NodalBallGrid.setOffset(h.step,__XenGridHandles.dragOffset(h.base,h.startY,pt.y));return}
   canvas.style.cursor=__XenGridHandles.near(rows,geo.yOf,pt.x,pt.y)?(geo.piano?'ew-resize':'ns-resize'):'crosshair';
   const id=held.current.get('pad:'+e.pointerId);if(id===undefined||!p)return;
   const tg=padTarget(p,geo,rows,pt.y),hz=tg.freq*Math.pow(2,live.current.oct);engine.bend(id,hz);notesHz.current.set(id,tg.freq);intensity.current=padIntensity(geo,pt.x);setMacro(intensity.current);show(hz)};
  const up=e=>{const h=handle.current;if(h&&h.pointer===e.pointerId){handle.current=null;if(!h.moved)__NodalBallGrid.toggleMute(h.step)}stop('pad:'+e.pointerId)};
  const leave=()=>{focus.current.inside=false};
  const menu=e=>{e.preventDefault();const geo=padGeometry(live.current.orient,live.current.flip,live.current.log),pt=padLocal(canvas,e,geo),hit=__XenGridHandles.hit(__NodalBallGrid.rows(),geo.yOf,pt.x,pt.y);
   if(hit){const ref=__xenMainRootFromGridLine(hit),p=liveGridParams();if(ref!==null&&p&&Math.abs(ref-p.gridBase)>1e-7){__NodalBallGrid.update({gridBase:ref});setStatus('Grid base set to '+ref.toFixed(2)+' Hz.')}}};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',up);canvas.addEventListener('pointerleave',leave);canvas.addEventListener('contextmenu',menu);
  return()=>{canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('lostpointercapture',up);canvas.removeEventListener('pointerleave',leave);canvas.removeEventListener('contextmenu',menu)}},[engine,setMacro,start,stop]);

 /* keyboard: the Live Room's own keys, with the third row on by default ("keyboard extension"): 1-0, Q-P and A-# play 32 grid steps, one key after the other
    (the third row follows the DE / EN keyboard layout of the Main Room). , ; . : switch the grid system, AltGr / right Ctrl the mode, [ and - shift the key window.
    Same guards as the Live Room: text fields keep their keys, a drop-down or a button never swallows a note. */
 P.useEffect(()=>{
  const inside=t=>t===document.body||!!rootRef.current?.contains(t);
  const announceGrid=()=>setTimeout(()=>{const q=__NodalBallGrid.params();if(q)setStatus('Grid: '+ti(j0,q.gridTuning)+' · '+ti(Ka(q.gridTuning),q.gridMode))},120);
  const goTo=(p,geo,newHz,code)=>{ // move the cursor to a pitch; a held pad note follows, else the arrow key sounds the new pitch while it is held
   const f=focus.current;f.y=geo.yOf(newHz);let bent=false;
   for(const[source,id]of held.current)if(source.startsWith('pad:')){engine.bend(id,newHz*Math.pow(2,live.current.oct));notesHz.current.set(id,newHz);bent=true}
   if(!bent)start('key:'+code,newHz*Math.pow(2,live.current.oct),.8);
   if(readoutRef.current)readoutRef.current.textContent=(newHz*Math.pow(2,live.current.oct)).toFixed(2)+' Hz'};
  const arrowDown=e=>{const p=liveGridParams(),ar=arrow.current;if(!p)return;
   if(e.key==='ArrowLeft'||e.key==='ArrowRight'){ar[e.key==='ArrowLeft'?'left':'right']=true;return}
   const dir=e.key==='ArrowUp'?1:-1,geo=padGeometry(live.current.orient,live.current.flip,live.current.log);
   if(p.lockCursorToGrid){ // Snap: one grid step per press (the Live Room's own uZ), skipping muted steps
    if(e.repeat)return;const from=ball.current.freq||geo.freqOf(focus.current.y),to=stepGridHz(p,from,dir);if(to>0&&Number.isFinite(to))goTo(p,geo,to,e.code);return}
   // no Snap: the cursor glides while the key is held (moved in the draw loop)
   if(e.repeat)return;ar[dir>0?'up':'down']=true;start('key:'+e.code,geo.freqOf(focus.current.y)*Math.pow(2,live.current.oct),.8)};
  const down=e=>{if(Qp(e.target)||!inside(e.target))return;
   // Arrow keys belong to the cursor, not to the page scroll (sliders and drop-downs that have the focus keep theirs)
   if(e.key.startsWith('Arrow')&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!(e.target?.matches?.('input[type=range],select'))){e.preventDefault();e.stopPropagation();arrowDown(e);return}
   const p=liveGridParams(),third=__xenThirdKeyboardRowIndex(e);
   // a key of the third row is a note first; only the other keys may switch the grid
   if(p&&third<0&&!e.metaKey&&pPe({event:e,params:__NodalBallGrid.params(),runWithAudio:fn=>fn(),changeGridTuning:__NodalBallGrid.changeTuning,setGridMode:__NodalBallGrid.changeMode,resetKeyboardWindow:__NodalBallGrid.resetWindow})){e.preventDefault();e.stopPropagation();announceGrid();return}
   if(e.ctrlKey||e.metaKey||e.altKey)return;
   if(e.code==='Escape'){e.preventDefault();panic();return}
   if(e.code==='Space'){e.preventDefault();e.stopPropagation();if(!e.repeat)setHold(h=>!h);return}
   if(dJ(e.code)){const d=mJ(e.code);if(d!==null){e.preventDefault();e.stopPropagation();__NodalBallGrid.shiftWindow(d)}return}
   let idx=third>=0?iw.length+third:AJ(e,HJ,VJ);if(idx<0||!p)return;e.preventDefault();e.stopPropagation();if(e.repeat)return;
   if(live.current.mirror)idx=yJ(idx,iw.length+12); // keys low → high instead of high → low (the Live Room's keyboard mirror): independent of the view
   const hz0=wF(p.gridBase,p.gridTuning,__NodalBallGrid.windowOffset(),idx,p.manualGridMutedSteps,p.manualGridStepOffsets);
   if(hz0===null||!Number.isFinite(hz0)||hz0<=0){if(readoutRef.current)readoutRef.current.textContent='muted step';return}
   const hz=hz0*Math.pow(2,live.current.oct);focus.current.y=padGeometry(live.current.orient,live.current.flip,live.current.log).yOf(hz0);start('key:'+e.code,hz,e.shiftKey?1:.8);if(readoutRef.current)readoutRef.current.textContent=hz.toFixed(2)+' Hz'};
  const up=e=>{if(e.key.startsWith('Arrow')){const ar=arrow.current;ar[e.key==='ArrowUp'?'up':e.key==='ArrowDown'?'down':e.key==='ArrowLeft'?'left':'right']=false}stop('key:'+e.code)};
  const blur=()=>{for(const source of[...held.current.keys()])stop(source)};
  document.addEventListener('keydown',down,true);document.addEventListener('keyup',up,true);window.addEventListener('blur',blur);
  return()=>{document.removeEventListener('keydown',down,true);document.removeEventListener('keyup',up,true);window.removeEventListener('blur',blur)}},[panic,start,stop]);

 /* drawing: the Live Room's grid layer (lines, green snapped line, blue triangles, cursor, ball) plus a scope figure behind it.
    Runs only while this room is mounted and the tab is visible. */
 P.useEffect(()=>{const canvas=canvasRef.current;if(!canvas)return;const g=canvas.getContext('2d');let raf=0,bufL=null,bufR=null,spec=null,last=performance.now(),sg=scopeRef.current?scopeRef.current.getContext('2d'):null,scopeBlank=true,scale=1;const mandala={el:scopeRef.current,petal:new Float32Array(128),loud:.3,hue:0,level:MANDALA_LEVELS.length-2,tick:0,dt:16.7,changed:0,upAt:0,holdUp:0};
  const trk={s:{current:null},l:{current:0},c:{current:null},d:{current:0}},winRef={current:0},layer={ctx:g,state:ball.current,params:null,t:0,focusCursorRef:focus,getVisibleGridLines:()=>__NodalBallGrid.rows(),
   activeGridLineFreqRef:trk.s,activeGridLineSinceRef:trk.l,previousGridLineFreqRef:trk.c,previousGridLineAtRef:trk.d,keyboardWindowOffsetRef:winRef};
  const draw=now=>{raf=requestAnimationFrame(draw);if(document.hidden)return;const dt=Math.min(.1,Math.max(0,(now-last)/1000));last=now;
   const p=liveGridParams(),geo=padGeometry(live.current.orient,live.current.flip,live.current.log);
   // backing store: 1, 1.25 or 1.5 times the pad's own 1100 x 580 units, following the displayed size and the screen density (large view, high-density screens stay crisp)
   const want=Math.max(1,Math.min(1.5,Math.round((canvas.clientWidth||PAD_W)*Math.min(2,window.devicePixelRatio||1)/PAD_W*4)/4)),bw=Math.round(PAD_W*want),bh=Math.round(PAD_H*want);
   if(canvas.width!==bw||canvas.height!==bh){canvas.width=bw;canvas.height=bh;if(scopeRef.current){scopeRef.current.width=bw;scopeRef.current.height=bh;scopeBlank=true}scale=want}
   g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='source-over';g.clearRect(0,0,bw,bh);
   // mandala: its own canvas BEHIND the pad, full resolution, redrawn every frame while something sounds (fading trails), then left alone
   const an=engine.anL;
   if(sg&&an){if(!bufL||bufL.length!==an.fftSize){bufL=new Float32Array(an.fftSize);bufR=new Float32Array(an.fftSize);spec=new Uint8Array(an.frequencyBinCount)}
    an.getFloatTimeDomainData(bufL);engine.anR.getFloatTimeDomainData(bufR);an.getByteFrequencyData(spec);let peak=0;for(let i=0;i<bufL.length;i+=8){const a=Math.abs(bufL[i]);if(a>peak)peak=a}
    // the colour follows the pitch of the ball: one turn per octave
    const pitchHue=(Math.log2(Math.max(20,ball.current.freq||220))%1)*360;
    if(peak>.001||!scopeBlank){scopeBlank=!paintMandala(sg,mandala,bufL,bufR,spec,peak,pitchHue)&&faded(sg);if(peak>.001)watchMandala(mandala,dt*1000,now)}else mandala.dt=16.7}
   if(!p)return;
   // arrow keys without Snap: the cursor glides in pitch (up = higher, whatever the view), left / right move the intensity
   {const ar=arrow.current,f0=focus.current;
    if(ar.up||ar.down){const dir=(ar.up?1:0)-(ar.down?1:0);f0.y=Math.max(0,Math.min(geo.ext,f0.y+dir*(geo.flip?1:-1)*150*dt));const id=held.current.get(ar.up?'key:ArrowUp':'key:ArrowDown');if(id!==undefined){const hz=geo.freqOf(f0.y);engine.bend(id,hz*Math.pow(2,live.current.oct));notesHz.current.set(id,hz)}}
    if(ar.left||ar.right){intensity.current=Math.max(0,Math.min(1,intensity.current+((ar.right?1:0)-(ar.left?1:0))*.6*dt));setMacro(intensity.current)}}
   // ball follows the pointer; with Snap on it sits on the nearest grid line
   const rows=__NodalBallGrid.rows(),f=focus.current,tg=padTarget(p,geo,rows,f.y),k=1-Math.pow(.65,dt*60),b=ball.current;b.cursorX+=(f.x-b.cursorX)*k;b.cursorY+=(tg.y-b.cursorY)*k;b.freq=tg.freq;
   winRef.current=__NodalBallGrid.windowOffset();layer.params=keyWindowView(p);layer.edgeLines=live.current.edges;layer.t=now/1000;
   g.save();if(geo.piano)g.setTransform(0,scale,-scale,0,PAD_W*scale,0);else g.setTransform(scale,0,0,scale,0,0);
   __xenDrawMainGridLayer(layer,geo.len,geo.yOf,geo.freqOf);
   if(p.gridOn!==false){const lc=live.current,sig=p.gridTuning+'|'+p.gridBase+'|'+(p.manualGridMutedSteps||[]).join()+'|'+(p.manualGridStepOffsets||[]).join()+'|'+winRef.current+'|'+lc.mirror+'|'+lc.orient+'|'+lc.flip+'|'+lc.log+'|'+__XenKeyboardLayout.getSnapshot();
    if(keyLines.current.sig!==sig)keyLines.current={sig,lines:keyLabelLines(p,geo,winRef.current,lc.mirror)};paintKeyLabels(g,geo,keyLines.current.lines)}
   paintActiveNotes(g,geo,notesHz.current,b.cursorY);
   g.restore();
   // frequency label next to the ball
   if(f.inside&&readoutRef.current&&!held.current.size)readoutRef.current.textContent=(tg.freq*Math.pow(2,live.current.oct)).toFixed(2)+' Hz'};
  raf=requestAnimationFrame(draw);return()=>cancelAnimationFrame(raf)},[engine]);

 const touched=P.useCallback(()=>{persist()},[persist]);
 const loadPatch=P.useCallback((p,note)=>{const clean=sanitizePatch(p);patchRef.current={...clean,id:'working'};engine.setAll(clean.params);setEpoch(e=>e+1);setStatus(note||('Loaded “'+clean.name+'”.'));persist()},[engine,persist]);
 const all=P.useMemo(()=>[...FACTORY,...user],[user]);
 const onSelect=id=>{setSelected(id);const p=all.find(x=>x.id===id);if(p)loadPatch(p)};
 const selectedPatch=all.find(x=>x.id===selected),suggestion=selectedPatch?.grid,suggestionLabel=suggestion?ti(j0,suggestion):'';
 const saveAs=()=>{const current=all.find(x=>x.id===selected);const name=window.prompt('Name for this patch',current&&!current.id.startsWith('factory:')?current.name:'My patch');if(!name||!name.trim())return;
  const existing=user.find(x=>x.name===name.trim());if(existing&&!window.confirm('Overwrite the saved patch “'+existing.name+'”?'))return;
  const saved=sanitizePatch({...patchRef.current,name:name.trim(),id:existing?existing.id:'user:'+uid(),grid:gridRef.current?.gridTuning});setUser(list=>existing?list.map(x=>x.id===existing.id?saved:x):[...list,saved]);setSelected(saved.id);setStatus('Saved “'+saved.name+'” (with the current grid system as a suggestion).')};
 const remove=()=>{const p=user.find(x=>x.id===selected);if(!p||!window.confirm('Delete the saved patch “'+p.name+'”? The sound you hear stays as working patch.'))return;setUser(list=>list.filter(x=>x.id!==p.id));setSelected('');setStatus('Deleted “'+p.name+'”.')};
 const doMutate=()=>{const params=patchRef.current.params.slice();for(const p of PARAMS){if(p[8]==='hidden'||p[1]==='level')continue;if(Math.random()<.55){const t=clamp(toUnit(p,params[p[0]])+(Math.random()-.5)*2*mutate*.6,0,1);params[p[0]]=fromUnit(p,t)}}
  params[BY_KEY.delayFb[0]]=Math.min(params[BY_KEY.delayFb[0]],.95);loadPatch({...patchRef.current,params},'Mutated by '+Math.round(mutate*100)+' %. Not happy? Load a patch or mutate again.')};
 const notesForBounce=()=>{const out=[];for(const key of latched.current.keys())out.push(Math.pow(2,key/1200));if(out.length)return out.slice(0,6);const p=liveGridParams();return[(p?p.gridBase:220)*Math.pow(2,live.current.oct-1)]};
 const doBounce=async target=>{if(busy)return;setBusy(true);setStatus('Rendering '+bounceSec+' s offline …');
  try{const rate=engine.ctx?.sampleRate||48000,r=await bounce({params:patchRef.current.params.map((v,i)=>i===37?0:v),res:gridResonators(liveGridParams(),live.current.oct),notes:notesForBounce(),seconds:bounceSec,sampleRate:rate});
   if(!(r.peak>1e-4))throw Error('The render is silent (level, envelope or cutoff?).');
   const name='PsyLab · '+(all.find(x=>x.id===selected)?.name||'patch')+' · '+new Date().toISOString().slice(11,19).replace(/:/g,'');
   if(target==='multitrack'){await __XenMultitrackInbox.send({channels:[r.left,r.right],sampleRate:r.sampleRate,name,origin:'psylab'});setStatus('Sent “'+name+'” ('+bounceSec+' s, peak '+r.peak.toFixed(2)+'): it is now a Material and waits in Room IV · Multitrack.')}
   else{const blob=await __xenRecorderFloatWav(r.left,r.right,r.sampleRate),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name.replace(/[^\w.-]+/g,'_')+'.wav';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);setStatus('Downloaded “'+a.download+'” (32-bit float WAV, peak '+r.peak.toFixed(2)+').')}}
  catch(e){setStatus('Bounce failed: '+String(e?.message||e))}finally{setBusy(false)}};
 const gridExtra=u.jsxs(u.Fragment,{children:[
  u.jsxs('label',{className:'xpl-note',children:[u.jsx('input',{type:'checkbox','aria-label':'Show grid lines',checked:gridParams?.gridOn!==false,onChange:e=>__NodalBallGrid.update({gridOn:e.target.checked})}),' Grid lines']}),
  u.jsxs('label',{className:'xpl-note',children:[u.jsx('input',{type:'checkbox','aria-label':'Snap ball to grid',checked:!!gridParams?.lockCursorToGrid,onChange:e=>__NodalBallGrid.update({lockCursorToGrid:e.target.checked})}),' Snap ball to grid']}),
  u.jsx('button',{type:'button',onClick:()=>{const n=Zd(gridParams.gridTuning);__NodalBallGrid.update({manualGridMutedSteps:[],manualGridStepOffsets:Array.from({length:n},()=>0)});setStatus('Grid reset: all steps on, offsets 0.')},children:'Grid reset'})]});

 const panels=GROUPS.map(([id,title,text])=>u.jsxs('section',{className:'xpl-panel','aria-label':title,children:[u.jsx('h3',{children:title}),text?u.jsx('p',{children:text}):null,
  PARAMS.filter(p=>p[8]===id).map(p=>u.jsx(PsySlider,{p,patchRef,engine,onTouched:touched},p[1]+':'+epoch))]},id));
 const piano=orient==='piano';
 return u.jsxs('div',{className:'xpl'+(large?' xpl-large':''),ref:rootRef,'data-xen-psylab':'true',children:[
  u.jsx('h2',{children:'PSYCHEDELIC LAB'}),
  u.jsx('p',{className:'xpl-sub',children:'Room V. A feedback-FM hydra, an endless Escher staircase, a spiral echo that shifts every repeat, grid-tuned crystals and a Lorenz attractor that never repeats itself. It plays on the Main Room grid: same lines, same blue triangles, same keys.'}),
  u.jsxs('div',{className:'xpl-bar',children:[
   u.jsxs('select',{'aria-label':'Patch',value:selected,onChange:e=>onSelect(e.target.value),children:[u.jsx('option',{value:'',children:'Working patch'}),
    u.jsx('optgroup',{label:'Factory',children:FACTORY.map(p=>u.jsx('option',{value:p.id,children:p.name},p.id))}),
    user.length?u.jsx('optgroup',{label:'Saved',children:user.map(p=>u.jsx('option',{value:p.id,children:p.name},p.id))}):null]}),
   suggestion&&gridParams&&gridParams.gridTuning!==suggestion?u.jsx('button',{type:'button',title:'This patch was made for another grid system. Switching changes the Main Room grid too.',onClick:()=>__NodalBallGrid.changeTuning(suggestion),children:'Grid → '+suggestionLabel}):null,
   u.jsx('button',{type:'button',onClick:saveAs,children:'Save as …'}),
   u.jsx('button',{type:'button',onClick:remove,disabled:!user.some(x=>x.id===selected),children:'Delete'}),
   u.jsx('button',{type:'button',onClick:doMutate,title:'Move a random half of the controls by the chosen amount',children:'Mutate'}),
   u.jsx('input',{type:'range','aria-label':'Mutation amount',min:.02,max:1,step:.01,value:mutate,onChange:e=>setMutate(Number(e.target.value)),style:{width:90,accentColor:'#ff7ad9'}}),
   u.jsx('button',{type:'button','aria-pressed':hold,onClick:()=>setHold(h=>!h),title:'Notes keep sounding until you play them again (Space)',children:hold?'Hold: on':'Hold: off'}),
   u.jsx('button',{type:'button',onClick:panic,title:'Esc',children:'All notes off'}),
   u.jsx('button',{type:'button','aria-pressed':piano,onClick:()=>setOrient(piano?'live':'piano'),title:'Main Room view: pitch runs up the page, like in the Live Room. Piano view: pitch runs along the page. Only the picture changes, never the keys.','data-psy-orient':orient,children:piano?'View: piano ↔':'View: Main Room ↕'}),
   u.jsx('button',{type:'button','aria-pressed':flip,onClick:()=>setFlip(v=>!v),title:'Turn the direction of the pitch axis round. Only the picture and the pointer change, never the keys.','data-psy-flip':flip?'1':'0',children:piano?(flip?'Pitch: high on the left':'Pitch: low on the left'):(flip?'Pitch: low on top':'Pitch: high on top')}),
   u.jsx('button',{type:'button','aria-pressed':logAxis,onClick:()=>setLogAxis(v=>!v),title:'Linear: the Main Room\'s own spacing, higher intervals are wider. Logarithmic: every octave is equally wide, like the keys of a piano. Only the picture and the pointer change.','data-psy-log':logAxis?'1':'0',children:logAxis?'Spacing: logarithmic':'Spacing: linear'}),
   u.jsx('button',{type:'button','aria-pressed':edges,onClick:()=>setEdges(v=>!v),title:'Edges only: the grid lines are drawn at the two outer ends, the middle belongs to the mandala (the line of the ball and the notes that sound stay visible). Full: as in the Main Room.','data-psy-edges':edges?'1':'0',children:edges?'Grid lines: edges only':'Grid lines: full'}),
   u.jsx('button',{type:'button','aria-pressed':mirror,onClick:()=>{panic();setMirror(v=>!v)},title:'Which way the keys are tuned along the keyboard (the Live Room\'s keyboard mirror). High → low: key 1 plays the highest note of the key window, as in the Main Room. Low → high: key 1 plays the lowest, like a piano. Independent of the picture.','data-psy-mirror':mirror?'1':'0',children:mirror?'Keys: low → high':'Keys: high → low'}),
   u.jsx('button',{type:'button','aria-pressed':large,onClick:()=>setLarge(v=>!v),title:'A big play surface: the pad takes the full width and all controls move below it.','data-psy-large':large?'1':'0',children:large?'Large view: on':'Large view: off'}),
   u.jsxs('span',{className:'xpl-note',children:['Octave ',u.jsx('button',{type:'button','aria-label':'Octave down',onClick:()=>{panic();setOct(o=>clamp(o-1,-3,4))},children:'−'}),' ',oct>0?'+'+oct:oct,' ',u.jsx('button',{type:'button','aria-label':'Octave up',onClick:()=>{panic();setOct(o=>clamp(o+1,-3,4))},children:'+'})]}),
   u.jsx('span',{style:{flex:'1 1 20px'}}),
   u.jsxs('label',{className:'xpl-note',children:['Bounce ',u.jsx('input',{type:'number','aria-label':'Bounce length in seconds',min:.5,max:120,step:.5,value:bounceSec,onChange:e=>setBounceSec(clamp(Number(e.target.value)||8,.5,120)),style:{width:64}}),' s']}),
   u.jsx('button',{type:'button',disabled:busy,onClick:()=>void doBounce('multitrack'),title:'Render the held notes (or the grid base) offline and store the result as Material; it appears in Room IV',children:'→ Multitrack'}),
   u.jsx('button',{type:'button',disabled:busy,onClick:()=>void doBounce('wav'),children:'⤓ WAV'})]}),
  u.jsxs('div',{className:'xpl-metro','data-psy-metro':'true',children:[
   u.jsx('button',{type:'button','aria-pressed':metroOn,onClick:()=>setMetroOn(v=>!v),title:'A click for you only: it goes straight to the speakers and is never recorded, mixed or bounced.',children:metroOn?'♩ Metronome: on':'♩ Metronome: off'}),
   u.jsx('span',{className:'xpl-beat',ref:beatRef,'aria-hidden':'true'}),
   u.jsxs('label',{children:['BPM ',u.jsx('input',{type:'number','aria-label':'Metronome BPM',min:20,max:400,step:.1,value:metroCfg.bpm,onChange:e=>setMetro({bpm:e.target.value}),style:{width:78}})]}),
   u.jsxs('label',{children:['Beats per bar ',u.jsx('input',{type:'number','aria-label':'Beats per bar',min:.5,max:64,step:.5,value:metroCfg.beats,onChange:e=>setMetro({beats:e.target.value}),style:{width:64}})]}),
   u.jsxs('label',{children:['Volume ',u.jsx('input',{type:'range','aria-label':'Metronome volume',min:0,max:1,step:.01,value:metroCfg.vol,onChange:e=>setMetro({vol:e.target.value}),style:{width:90,accentColor:'#ffd166'}})]}),
   u.jsx('button',{type:'button',onClick:tapTempo,title:'Tap the beat',children:'Tap'}),
   u.jsx('button',{type:'button',onClick:useLiveTempo,title:'Take the tempo of the Live Room',children:'= Live BPM'}),
   u.jsx('span',{className:'xpl-note',children:'Not in the recording.'})]}),
  u.jsxs('div',{className:'xpl-main',children:[
   u.jsxs('div',{children:[
    u.jsxs('div',{className:'xpl-pad',ref:padRef,children:[u.jsx('canvas',{ref:scopeRef,className:'xpl-scope',width:SCOPE_W,height:SCOPE_H,'aria-hidden':'true'}),u.jsx('canvas',{ref:canvasRef,width:PAD_W,height:PAD_H,role:'application','aria-label':piano?'Play pad: horizontal pitch, vertical intensity':'Play pad: vertical pitch, horizontal intensity',style:{cursor:'crosshair'}}),u.jsx('div',{className:'xpl-readout',ref:readoutRef}),
     u.jsx('div',{className:'xpl-pad-hint',children:(piano?(flip?'← high · pitch · low →':'← low · pitch · high →')+'   ↑ intensity   triangles on top':(flip?'↑ low · pitch · high ↓':'↑ high · pitch · low ↓')+'   → intensity   blue triangles')+': click = mute, drag = tune, right click = base'})]}),
    u.jsxs('div',{className:'xpl-gridbox',children:[u.jsx(__XenGridControls,{extra:gridExtra}),
     u.jsx('div',{className:'xpl-gridsub',children:['This is the Main Room grid: changes here change it there. Three pitch rows: 1–0 · Q–P · '+__XenKeyboardLayout.keycaps().join(' ')+' · 32 positions. “, ;” and “. :” switch the system, AltGr / right Ctrl the mode, “[” and “-” shift the key window. Keyboard: ',
      ...['de','en'].map(layout=>u.jsx('button',{key:layout,type:'button','aria-pressed':keyboardLayout===layout,'data-psy-layout':layout,style:{minHeight:22,padding:'1px 8px',marginRight:4},onClick:()=>{panic();__XenKeyboardLayout.set(layout)},title:'The same setting as the Live Room: it only changes the third row (A–# on a German keyboard, A–/ on an English one).',children:layout==='de'?'German':'English'}))]})]}),
    u.jsx('div',{className:'xpl-status',role:'status','aria-live':'polite',children:status}),
    u.jsx('div',{className:'xpl-keys',children:'Space = Hold. Esc = all notes off. Shift = louder. Click a value to type it exactly, double-click a slider to reset it. The header Rec records this room (not the metronome).'})]}),
   u.jsx('div',{className:'xpl-panels',children:panels})]})]});
}
/* PsyEngine is exported on purpose: a host without a picture (a later Live Room hook-up: Enter / left mouse button / keyboard) loads this chunk on first use and
   creates new PsyEngine({visual:false}); no analyser, no canvas, no room UI. */
return Object.freeze({XenPsyLabRoom,PsyEngine,LiveHost,__test:Object.freeze({PARAMS,RANGES,FACTORY,toUnit,fromUnit,sanitizePatch,sanitizeMetro,moduleCode,STORE_KEY,Metronome})});
})()
