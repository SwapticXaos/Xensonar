/* G2: stable resident identities, bounded ordered routes, crossfaded state
   transitions and a geometry-shaped harmonic source. The same kernel renders
   offline and in AudioWorklet. No buffers or voices are allocated in process(). */
function createMyzelGDSP(sampleRate) {
  const rate = Math.max(8000, Math.min(192000, Number.isFinite(sampleRate) ? sampleRate : 48000));
  const TAU = Math.PI * 2, c = (v, lo=0, hi=1) => Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo));
  const kinds = ['resonator','formant_filter','spectral_tilt','wavefolder','sub_harmonic','shimmer_delay',
    'comb_filter','grain_blur','drive','chorus','bitcrusher'];
  const lag = Math.ceil(rate * .34) + 4, tableSize = 4096;
  const sine = new Float64Array(tableSize + 1);
  for (let i=0;i<=tableSize;i++) sine[i] = Math.sin(i/tableSize*TAU);
  function sin(phase) { const p = (phase-Math.floor(phase))*tableSize, i=Math.floor(p);return sine[i]+(sine[i+1]-sine[i])*(p-i); }
  const channel = () => ({ring:new Float32Array(lag), low:0, env:0, held:0, hold:0, subphase:0,
    filter:new Float64Array(12), dcX:0, dcY:0, aa1:0, aa2:0, previous:0});
  const organ = () => ({id:'',type:'',hz:220,targetHz:220,power:0,goal:0,x:.5,y:.5,targetX:.5,targetY:.5,memory:1.7,coupling:0,
    partnerA:0,partnerB:0,cursor:0,lastFrame:0,channels:[channel(),channel()],coeff:new Float64Array(24)});
  const nodes = Array.from({length:12},organ), retiring = Array.from({length:3},organ);
  const route = new Int8Array(3).fill(-1), wanted = new Int8Array(3).fill(-1);
  let routeLength=0,wantedLength=0,retiringLength=0,pending=false,fade=1,clock=0,quietReset=true;
  const params={active:0,root:165,frequency:220,neighbourFrequency:220,presence:.5,neighbour:0,motion:0,
    brightness:.6,tension:.3,body:.6,level:.7,pan:0,roughness:0,rootLevel:.62,ballLevel:.34,nodeLevel:.78,ballToneLevel:1,ballToneHz:0,ballToneGate:1,
    density:.3,spread:.4,hollow:.4,bloom:.4,openness:.5,retention:.5,gesture:.5,webLevel:0,toneMetal:0};
  const defaults={...params}, smooth={...params}, keys=Object.keys(params);
  const movingKeys=new Array(keys.length),sourceEnabled=new Uint8Array(4);
  const frequencies=new Float64Array(4), gains=new Float64Array(4), phases=new Float64Array(4);
  const partials=10, energies=new Float64Array(partials*4), goals=new Float64Array(partials*4);
  const sourceHollow=new Float64Array(partials),sourceBody=new Float64Array(partials),sourceFocus=new Float64Array(partials);
  // MYZEL-COSMOS-01: the two node tones take the constellation's timbre: their
  // partials move from harmonic towards free-bar modes (toneMetal). One
  // rotating phasor per partial (rotation per block), started from the
  // harmonic phases, so the switch is seamless; unused until toneMetal is
  // first above 0, before that the G2 arithmetic runs unchanged.
  const toneBar=[1,2.756,5.404,8.933,13.344,18.638,24.814,31.873,39.814,48.637],toneRatio=new Float64Array(partials);
  const toneRe=new Float64Array(partials*2),toneIm=new Float64Array(partials*2),toneCos=new Float64Array(partials*2),toneSin=new Float64Array(partials*2);
  let toneMetalUsed=false;
  const sourceShape={window:NaN,centre:NaN,hollow:NaN,roughness:NaN,body:NaN,spread:NaN,bloom:NaN};
  let preparedStepFrames=-1,preparedRouteStep=0;
  const increments=new Float64Array(4), leftStates=new Float64Array(2), rightStates=new Float64Array(2);
  let stereoClock=0;
  const controlStep=1-Math.exp(-1/(rate*.045)), gainStep=1-Math.exp(-1/(rate*.065));
  const lowCoefficient=1-Math.exp(-TAU*850/rate), fadeStep=1/(rate*.14);
  // MYZEL-COSMOS-01: the constellation web (payload from myzelGConstellation).
  // Up to 16 node voices, excited by the ball (entering an aura; crossing a
  // grid line at a simple ratio to the node) and by each other: an impulse
  // travels along every link with that link's delay and share. Control tick
  // every ~2.5 ms. All state is allocated here; without a payload or with
  // webLevel 0 none of it runs and the output is the G2 output unchanged.
  const WEB=16,WP=4,webTick=Math.max(32,Math.round(rate*.0025)),webTickSec=webTick/rate,webRing=Math.ceil(1.9/webTickSec)+2;
  const webIds=new Array(WEB).fill(''),webOn=new Uint8Array(WEB),webFresh=new Uint8Array(WEB),webAwake=new Uint8Array(WEB),webAwakeList=new Int8Array(WEB),webTaken=new Uint8Array(WEB),webSlot=new Int8Array(WEB);
  const webBase=new Float64Array(WEB),webX=new Float64Array(WEB),webY=new Float64Array(WEB),webRadius=new Float64Array(WEB).fill(.3);
  const webPanL=new Float64Array(WEB).fill(Math.SQRT1_2),webPanR=new Float64Array(WEB).fill(Math.SQRT1_2),webPanGoalL=new Float64Array(WEB).fill(Math.SQRT1_2),webPanGoalR=new Float64Array(WEB).fill(Math.SQRT1_2),webDecay=new Float64Array(WEB).fill(.99);
  const webAmp=new Float64Array(WEB),webEnv=new Float64Array(WEB),webTouch=new Float64Array(WEB),webGlow=new Float64Array(WEB),webKick=new Float64Array(WEB),webRing2=new Float64Array(WEB),webRang=new Float64Array(WEB);
  // Partials are rotating phasors (no table, no floor per sample); rotation
  // and a one-step renormalisation are updated per tick.
  const webRe=new Float64Array(WEB*WP).fill(1),webIm=new Float64Array(WEB*WP),webCos=new Float64Array(WEB*WP).fill(1),webSin=new Float64Array(WEB*WP);
  const webInc=new Float64Array(WEB*WP),webIncGoal=new Float64Array(WEB*WP),webPart=new Float64Array(WEB*WP);
  const webPending=new Float32Array(WEB*webRing),webFrom=new Int8Array(WEB*4),webTo=new Int8Array(WEB*4),webGain=new Float64Array(WEB*4),webDelay=new Int32Array(WEB*4);
  const webBar=[1,2.756,5.404,8.933],webRatios=[],webRatioValues=[];
  for(let q=1;q<=16;q++)for(let p=q;p<2*q&&p<=32;p++){let a=p,b=q;while(b){const t=a%b;a=b;b=t;}
    if(a!==1)continue;webRatios.push(1200*Math.log2(p/q));webRatioValues.push(1/(1+Math.log2(p*q)/2.6));}
  let webLinks=0,webQueued=0,webLive=false,webAwakeCount=0,webVoices=0,webCountdown=0,webTickIndex=0,webSx=1,webSy=1,webAttack=1,webRelease=1,webGateBefore=0,webBallHz=0;
  const web={sympathy:.6,glow:.3};
  function webAffinity(ratio){
    if(!(ratio>0)||!Number.isFinite(ratio))return 0;
    let cents=1200*Math.log2(ratio);cents-=1200*Math.floor(cents/1200);let best=0;
    for(let i=0;i<webRatios.length;i++){const d=Math.min(Math.abs(cents-webRatios[i]),Math.abs(cents-1200-webRatios[i]));
      if(d<=14&&webRatioValues[i]>best)best=webRatioValues[i];}
    return best;
  }
  function webClear(){
    webAmp.fill(0);webEnv.fill(0);webTouch.fill(0);webGlow.fill(0);webKick.fill(0);webRing2.fill(0);webRang.fill(-1e9);webPending.fill(0);webAwake.fill(0);
    webAwakeCount=0;webVoices=0;webQueued=0;webCountdown=0;webTickIndex=0;webGateBefore=0;webBallHz=0;
    for(let i=0;i<webInc.length;i++)webInc[i]=webIncGoal[i];
  }
  function webConfigure(p){
    const count=Math.min(WEB,Array.isArray(p?.ids)?p.ids.length:0),num=(list,i,v)=>Number.isFinite(list?.[i])?list[i]:v;
    webSx=c(num([p?.sx],0,1),.1,20);webSy=c(num([p?.sy],0,1),.1,20);
    webTaken.fill(0);webSlot.fill(-1);webFresh.fill(0);
    for(let i=0;i<count;i++){const id=String(p.ids[i]).slice(0,160),slot=webIds.indexOf(id);if(slot>=0&&!webTaken[slot]){webTaken[slot]=1;webSlot[i]=slot;}}
    for(let i=0;i<count;i++){if(webSlot[i]>=0)continue;
      let slot=-1,quiet=Infinity;for(let j=0;j<WEB;j++)if(!webTaken[j]){const loud=webIds[j]===''?-1:webEnv[j]+webAmp[j];if(loud<quiet){quiet=loud;slot=j;}}
      // A slot taken over from another node is released (35 ms) and retuned at once, never glided.
      if(slot<0)continue;webTaken[slot]=1;webSlot[i]=slot;webIds[slot]=String(p.ids[i]).slice(0,160);webTouch[slot]=0;webAmp[slot]=0;webFresh[slot]=1;}
    const metal=c(num([p?.metal],0,0)),hollow=c(num([p?.hollow],0,.5)),roll=.18+.55*c(num([p?.bright],0,.5)),cents=c(num([p?.detuneCents],0,0),0,30);
    for(let j=0;j<WEB;j++)if(!webTaken[j]){webOn[j]=0;webGlow[j]=0;webKick[j]=0;}
    for(let i=0;i<count;i++){const j=webSlot[i];if(j<0)continue;
      const base=c(num(p.f,i,220),20,4000),hz=base*2**(c(num(p.detune,i,0),-1,1)*cents/1200),pan=c(num(p.pan,i,0),-1,1),angle=(pan+1)*Math.PI/4;
      webOn[j]=1;webBase[j]=base;webX[j]=num(p.X,i,.5);webY[j]=num(p.Y,i,.5);webRadius[j]=Math.max(.02,num(p.radius,i,.3));
      webPanGoalL[j]=Math.cos(angle);webPanGoalR[j]=Math.sin(angle);if(webFresh[j]&&webEnv[j]<1e-4){webPanL[j]=webPanGoalL[j];webPanR[j]=webPanGoalR[j];}webDecay[j]=Math.exp(-webTickSec/c(num(p.tau,i,1),.08,8));
      let norm=0;
      for(let k=0;k<WP;k++){const ratio=(k+1)+metal*(webBar[k]-(k+1)),amp=roll**k*(k&1?1-.85*hollow:1)*(hz*ratio<rate*.45?1:0);
        webIncGoal[j*WP+k]=hz*ratio/rate;webPart[j*WP+k]=amp;norm+=amp;}
      for(let k=0;k<WP;k++){webPart[j*WP+k]/=Math.max(1e-9,norm);if(webFresh[j]||webEnv[j]+webAmp[j]<1e-4)webInc[j*WP+k]=webIncGoal[j*WP+k];}
    }
    webLinks=0;const links=Array.isArray(p?.links)?p.links:[];
    for(let k=0;k+4<links.length&&webLinks+2<=webFrom.length;k+=5){
      const a=webSlot[links[k]]??-1,b=webSlot[links[k+1]]??-1;if(a<0||b<0||a===b)continue;
      const delay=Math.max(1,Math.round(c(num(links,k+2,.1),.005,1.85)/webTickSec));
      webFrom[webLinks]=a;webTo[webLinks]=b;webGain[webLinks]=c(num(links,k+3,0),0,.95);webDelay[webLinks++]=delay;
      webFrom[webLinks]=b;webTo[webLinks]=a;webGain[webLinks]=c(num(links,k+4,0),0,.95);webDelay[webLinks++]=delay;
    }
    webAttack=1-Math.exp(-1/(rate*c(num([p?.attack],0,.04),.002,1)));webRelease=1-Math.exp(-1/(rate*.035));
    web.sympathy=c(num([p?.sympathy],0,.6));web.glow=c(num([p?.glow],0,.3));
    webLive=count>0;
  }
  function webBall(data){
    if(!webLive)return;
    const couple=c(data.webCouple??1),gesture=c(params.gesture),bx=c(data.ballU??.5)*webSx,by=c(data.ballV??.5)*webSy;
    // The ball plucks a node once per pass: when it comes close (touch above
    // .5); the node is armed again only after the ball has moved away (.2).
    for(let i=0;i<WEB;i++){if(!webOn[i])continue;
      const d=Math.hypot(bx-webX[i],by-webY[i])/webRadius[i],touch=Math.exp(-d*d*1.4);
      if(webTouch[i]>=0&&touch>.5){webKick[i]+=couple*(.4+.6*gesture)*.8;webTouch[i]=-1;}
      else if(webTouch[i]<0&&touch<.2)webTouch[i]=0;
      webGlow[i]=touch>.08?touch*couple*web.glow*(.3+.7*gesture):0;}
    // A grid-line crossing of the ball rings the nodes an octave or a fifth
    // away from it, each node at most every 0.3 s. Sympathetic ringing stays
    // local: only the ball's pluck travels along the links.
    const hz=params.ballToneHz,gate=c(params.ballToneGate);
    if(hz>0&&(gate>webGateBefore+.25||(hz!==webBallHz&&gate>.5)))
      for(let i=0;i<WEB;i++){if(!webOn[i]||webTickIndex-webRang[i]<.3/webTickSec)continue;const a=webAffinity(hz/webBase[i]);
        if(a>.45){webRing2[i]+=web.sympathy*a*.22*couple*c(params.ballToneLevel);webRang[i]=webTickIndex;}}
    webGateBefore=gate;webBallHz=hz;
  }
  function webStep(){
    const at=webTickIndex%webRing;webAwakeCount=0;
    for(let i=0;i<WEB;i++){
      const index=i*webRing+at;let kick=webPending[index];
      if(kick!==0){webPending[index]=0;webQueued--;}
      kick+=webKick[i];webKick[i]=0;
      if(webRing2[i]>0){webAmp[i]=Math.min(1.25,webAmp[i]+webRing2[i]);webRing2[i]=0;}
      if(kick>.002){
        webAmp[i]=Math.min(1.25,webAmp[i]+kick);
        for(let k=0;k<webLinks;k++)if(webFrom[k]===i){const pass=kick*webGain[k];
          if(pass>.003){const to=webTo[k]*webRing+(webTickIndex+webDelay[k])%webRing;if(webPending[to]===0)webQueued++;webPending[to]+=pass;}}
      }
      webAmp[i]*=webDecay[i];if(webOn[i]&&webAmp[i]<webGlow[i])webAmp[i]=webGlow[i];
      // Below -80 dB (and x0.1 gain after it) a voice sleeps and costs nothing.
      if(webAmp[i]<1e-4&&webEnv[i]<1e-4){webAmp[i]=0;webEnv[i]=0;webAwake[i]=0;}else{webAwake[i]=1;webAwakeList[webAwakeCount++]=i;}
      webPanL[i]+=(webPanGoalL[i]-webPanL[i])*.12;webPanR[i]+=(webPanGoalR[i]-webPanR[i])*.12;
      if(webAwake[i])for(let k=0;k<WP;k++){const j=i*WP+k;webInc[j]+=(webIncGoal[j]-webInc[j])*.12;
        const angle=TAU*webInc[j],re=webRe[j],im=webIm[j],norm=1.5-.5*(re*re+im*im);
        webCos[j]=Math.cos(angle);webSin[j]=Math.sin(angle);webRe[j]=re*norm;webIm[j]=im*norm;}
    }
    webVoices=webAwakeCount;
    // Impulses still on their way keep the web awake.
    if(webQueued>0&&!webAwakeCount)webAwakeCount=1;
    webTickIndex++;
  }
  function clearNode(n) {
    n.preparedType=null;
    n.cursor=0;n.power=0;n.goal=0;n.hz=220;n.targetHz=220;n.x=.5;n.y=.5;n.targetX=.5;n.targetY=.5;n.memory=1.7;n.coupling=0;n.partnerA=0;n.partnerB=0;n.lastFrame=clock;
    for (const ch of n.channels) {ch.ring.fill(0);ch.filter.fill(0);ch.low=0;ch.env=0;ch.held=0;ch.hold=0;
      ch.subphase=0;ch.dcX=0;ch.dcY=0;ch.aa1=0;ch.aa2=0;ch.previous=0;}
  }
  function reset() {
    quietReset=true;
    for(const n of nodes){clearNode(n);n.id='';n.type='';n.goal=0;}
    for(const n of retiring)clearNode(n);
    route.fill(-1);wanted.fill(-1);routeLength=0;wantedLength=0;retiringLength=0;pending=false;fade=1;
    clock=0;phases.fill(0);energies.fill(0);goals.fill(0);leftStates.fill(0);rightStates.fill(0);stereoClock=0;
    webClear();toneMetalUsed=false;
  }
  function copyNode(to,from) {
    to.preparedType=null;
    for(const key of ['id','type','hz','targetHz','power','goal','x','y','targetX','targetY','memory','coupling','partnerA','partnerB','cursor','lastFrame'])to[key]=from[key];
    to.coeff.set(from.coeff);
    for(let k=0;k<2;k++){const a=to.channels[k],b=from.channels[k];a.ring.set(b.ring);a.filter.set(b.filter);
      for(const key of ['low','env','held','hold','subphase','dcX','dcY','aa1','aa2','previous'])a[key]=b[key];}
  }
  function coefficient(freq,q,out,offset) {
    const g=Math.tan(Math.PI*c(freq,25,rate*.34)/rate),k=1/c(q,.7,20),a=1/(1+g*(g+k));
    out[offset]=a;out[offset+1]=g*a;out[offset+2]=g*g*a;out[offset+3]=k;
  }
  function prepare(n) {
    // Only these roles read the coefficient bank. Retiring nodes keep their
    // own role and run this same preparation throughout their original fade.
    if(n.type==='resonator'){
      // MYZEL-COSMOS-01: with linked neighbours its upper modes ring at their intervals.
      const hz=n.hz, spread=.025+n.coupling*.16, pa=n.partnerA, pb=n.partnerB;
      if(n.preparedType===n.type&&n.preparedHz===hz&&n.preparedY===n.y&&n.preparedCoupling===n.coupling&&n.preparedA===pa&&n.preparedB===pb)return;
      for(let j=0;j<3;j++)coefficient(hz*(j===0?1:j===1?(pa>0?pa:2+spread):(pb>0?pb:3-spread*.5)),4.5+n.y*6+j,n.coeff,j*4);
      n.preparedType=n.type;n.preparedHz=hz;n.preparedY=n.y;n.preparedCoupling=n.coupling;n.preparedA=pa;n.preparedB=pb;
    }else if(n.type==='formant_filter'){
      const vowel=c(n.x*.65+smooth.brightness*.2+smooth.hollow*.15);
      if(n.preparedType===n.type&&n.preparedVowel===vowel)return;
      // Absolute formant regions preserve their character when resident pitch moves.
      coefficient(290+vowel*520,3.6,n.coeff,12);
      coefficient(920+vowel*1080,4.5,n.coeff,16);
      coefficient(2240+vowel*720,5.2,n.coeff,20);
      n.preparedType=n.type;n.preparedVowel=vowel;
    }
  }
  function band(x,n,ch,index,offset) {
    const a=n.coeff,k=index*2,v3=x-ch.filter[k+1],v1=a[offset]*ch.filter[k]+a[offset+1]*v3;
    const v2=ch.filter[k+1]+a[offset+1]*ch.filter[k]+a[offset+2]*v3;
    ch.filter[k]=2*v1-ch.filter[k];ch.filter[k+1]=2*v2-ch.filter[k+1];return v1*a[offset+3];
  }
  function reclaim(index) {
    let n=nodes[index];const age=Math.max(0,clock-n.lastFrame)/rate;
    if(age>.035){const keep=Math.exp(-age/Math.max(.2,n.memory));
      for(const ch of n.channels){for(let i=0;i<lag;i++)ch.ring[i]*=keep;
        for(let i=0;i<ch.filter.length;i++)ch.filter[i]*=keep;ch.low*=keep;ch.env*=keep;ch.held*=keep;}
    }
    n.lastFrame=clock;
  }
  function settleRetiring() {
    if(fade<1||!retiringLength)return;
    for(let i=0;i<retiringLength;i++){
      const old=retiring[i];let used=false;
      for(let j=0;j<routeLength;j++)if(nodes[route[j]].id===old.id)used=true;
      if(!used){const n=nodes.find(n=>n.id===old.id);if(n)copyNode(n,old);}
    }
    retiringLength=0;
  }
  function commitRoute() {
    settleRetiring();
    retiringLength=routeLength;
    for(let i=0;i<routeLength;i++)copyNode(retiring[i],nodes[route[i]]);
    for(let i=0;i<wantedLength;i++){let index=wanted[i];let existed=false;
      for(let j=0;j<routeLength;j++)if(route[j]===index)existed=true;
      if(!existed)reclaim(index);}
    route.set(wanted);routeLength=wantedLength;fade=retiringLength?0:1;pending=false;
  }
  function controls(data) {
    if(!data||typeof data!=='object')return;
    if(data.reset===true){reset();for(const key of keys){params[key]=defaults[key];smooth[key]=defaults[key];}}
    for(const key of keys)if(key in data)params[key]=key==='root'||key==='frequency'||key==='neighbourFrequency'?
      c(data[key],35,8000):key==='ballToneHz'?c(data[key],0,8000):key==='pan'?c(data[key],-1,1):c(data[key]);
    if(Array.isArray(data.stages)){
      wanted.fill(-1);wantedLength=0;
      for(let i=0;i<Math.min(3,data.stages.length);i++){
        const spec=data.stages[i];if(!kinds.includes(spec?.type))continue;
        const id=String(spec.id??spec.key??`${spec.type}:${i}`).slice(0,160);
        let index=nodes.findIndex(n=>n.id===id);
        if(index<0)index=nodes.findIndex(n=>!n.id);
        if(index<0){let age=Infinity;for(let j=0;j<12;j++){
          let used=false;for(let k=0;k<routeLength;k++)if(route[k]===j)used=true;
          for(let k=0;k<wantedLength;k++)if(wanted[k]===j)used=true;
          if(!used&&nodes[j].lastFrame<age){age=nodes[j].lastFrame;index=j;}
        }}
        if(index<0)continue;
        const n=nodes[index];
        if(n.id===id&&n.type!==spec.type){
          // Coalesce rapid role edits until the bounded outgoing route has finished.
          if(fade<1){wanted[wantedLength++]=index;continue;}
          let activeRole=false;for(let j=0;j<routeLength;j++)if(route[j]===index)activeRole=true;
          if(activeRole){settleRetiring();retiringLength=routeLength;
            for(let j=0;j<routeLength;j++)copyNode(retiring[j],nodes[route[j]]);fade=0;}
        }
        if(n.id!==id||n.type!==spec.type){clearNode(n);n.id=id;n.type=spec.type;}
        n.targetHz=c(spec.frequency??params.frequency,35,8000);n.goal=c(spec.strength??0);
        n.targetX=c(spec.x??.5);n.targetY=c(spec.y??.5);n.memory=c(spec.memory??(.28+n.targetY*2.8),.2,5);n.coupling=c(spec.coupling??params.density);
        n.partnerA=c(spec.partnerA??0,0,8);n.partnerB=c(spec.partnerB??0,0,8);
        let duplicate=false;for(let k=0;k<wantedLength;k++)if(wanted[k]===index)duplicate=true;
        if(!duplicate)wanted[wantedLength++]=index;
      }
      pending=wantedLength!==routeLength;
      for(let i=0;i<wantedLength;i++)if(wanted[i]!==route[i])pending=true;
      if(pending&&fade>=1)commitRoute();
    }
    if(data.web&&typeof data.web==='object')webConfigure(data.web);
    webBall(data);
    if(quietReset&&params.active>0)for(const key of keys)if(key!=='active')smooth[key]=params[key];
  }
  function read(ch,n,delay) {
    const at=(n.cursor-c(delay,1,lag-3)+lag)%lag,i=Math.floor(at),f=at-i;
    return ch.ring[i]*(1-f)+ch.ring[(i+1)%lag]*f;
  }
  function effect(x,n,channel) {
    const ch=n.channels[channel],amount=n.power,pos=n.cursor,t=smooth;let wet=x;
    if(amount<.00001){ch.ring[pos]=x;return x;}
    switch(n.type){
      case 'resonator': {let modes=0;for(let j=0;j<3;j++)modes+=band(x,n,ch,j,j*4)*(j===0?1.5:j===1?.75:.4);
        wet=x*.40+modes*2.1;break;}
      case 'formant_filter': {let vowels=0;for(let j=0;j<3;j++)vowels+=band(x,n,ch,j+3,12+j*4)*(j===0?1.4:j===1?1:.6);
        wet=x*.25+vowels*2.4;break;}
      case 'spectral_tilt':ch.low+=(x-ch.low)*lowCoefficient;wet=x+(n.x-.5)*1.7*(x-2*ch.low);break;
      case 'wavefolder':
      case 'drive': {const push=1+amount*(n.type==='wavefolder'?11:9)*( .55+t.gesture*.65);
        // Two substeps and a fixed lowpass reduce nonlinear image energy.
        const middle=(ch.previous+x)*.5;ch.previous=x;
        for(let j=0;j<2;j++){const input=j?x:middle;
          const shaped=n.type==='wavefolder'?sin(input*push/TAU)*.52:Math.tanh(input*push)*.48;
          ch.aa1+=(shaped-ch.aa1)*.72;ch.aa2+=(ch.aa1-ch.aa2)*.72;}
        wet=ch.aa2;break;}
      case 'sub_harmonic':ch.env+=(Math.abs(x)-ch.env)*(.002);ch.subphase=(ch.subphase+n.hz*.5/rate)%1;
        wet=x+sin(ch.subphase)*Math.min(.24,ch.env*2.4);break;
      case 'shimmer_delay': {const period=.065+n.y*.09,p=(clock/rate/period)%1,p2=(p+.5)%1;
        const one=read(ch,n,rate*(.012+period*(1-p))),two=read(ch,n,rate*(.012+period*(1-p2)));
        const shimmer=one*(.5-.5*sin(p+.25))+two*(.5-.5*sin(p2+.25));
        ch.low+=(x-ch.low)*.60;ch.ring[pos]=Math.tanh(ch.low+shimmer*(.12+amount*.20));wet=x*.8+shimmer*.62;
        return x+(wet-x)*amount;}
      case 'comb_filter': {const echo=read(ch,n,rate/c(n.hz,35,8000));
        ch.ring[pos]=Math.tanh(x+echo*(.22+amount*.35));wet=x*.7+echo*.68;
        return x+(wet-x)*amount;}
      case 'grain_blur': {const period=.045+n.y*.065,p=(clock/rate/period)%1,p2=(p+.5)%1;
        const speed=.28+t.spread*.46,base=.018+n.y*.1;
        const one=read(ch,n,rate*(base+p*period*speed)),two=read(ch,n,rate*(base+p2*period*speed));
        wet=x*.58+(one*(.5-.5*sin(p+.25))+two*(.5-.5*sin(p2+.25)))*.70;break;}
      case 'chorus': {const depth=.002+n.y*.004,seconds=.019+sin(clock/rate*(.13+n.x*.4)+channel*.27)*depth;
        wet=x*.75+read(ch,n,rate*seconds)*.48;break;}
      case 'bitcrusher':if(ch.hold--<=0){const levels=2**(13-Math.round(amount*8));ch.held=Math.round(x*levels)/levels;ch.hold=1+Math.round(amount*amount*14);}wet=ch.held;break;
    }
    ch.ring[pos]=x;return c(x+(wet-x)*amount,-1.3,1.3);
  }
  function sourceCoefficients() {
    const t=smooth;
    frequencies[0]=params.ballToneHz>0?params.ballToneHz:t.root;frequencies[1]=t.root;frequencies[2]=t.frequency;frequencies[3]=t.neighbourFrequency;
    gains[0]=t.rootLevel*.21*t.ballToneGate*t.ballToneLevel;
    gains[1]=t.ballLevel*(.04+t.gesture*.46)*(.25+t.presence*.75)*t.ballToneLevel;
    gains[2]=t.nodeLevel*t.presence*(.08+t.gesture*.34);
    gains[3]=t.nodeLevel*t.neighbour*(.04+t.gesture*.19)*( .35+t.density*.65);
    // Spectral shape is shared by all four sources; only phase sheen, pitch
    // mask, normalization and gains differ. Keep their exact arithmetic.
    const openness=c(t.brightness*.30+t.openness*.7),window=1.1+openness*5+t.density*2+(1-t.body)*.8;
    const centre=1.5+t.bloom*6.5+t.motion*1.5+t.tension*.8;
    if(sourceShape.window!==window||sourceShape.centre!==centre||sourceShape.hollow!==t.hollow||sourceShape.roughness!==t.roughness||sourceShape.body!==t.body||sourceShape.spread!==t.spread||sourceShape.bloom!==t.bloom){
      for(let k=0;k<partials;k++){
        const h=k+1,odd=h&1;
        sourceHollow[k]=odd?1+.55*t.hollow+t.roughness*.22:1-.85*t.hollow;
        sourceBody[k]=Math.exp(-k/window)/(1+k*(.13+t.body*.18));
        sourceFocus[k]=Math.exp(-(((h-centre)/(1.3+t.spread*2))**2))*(.15+t.bloom*.65);
      }
      sourceShape.window=window;sourceShape.centre=centre;sourceShape.hollow=t.hollow;sourceShape.roughness=t.roughness;sourceShape.body=t.body;sourceShape.spread=t.spread;sourceShape.bloom=t.bloom;
    }
    if(!toneMetalUsed&&params.toneMetal>0){toneMetalUsed=true;
      for(let v=2;v<4;v++)for(let k=0;k<partials;k++){const p=phases[v]*(k+1),a=TAU*(p-Math.floor(p)+v*.17);
        toneRe[(v-2)*partials+k]=Math.cos(a);toneIm[(v-2)*partials+k]=Math.sin(a);}}
    if(toneMetalUsed)for(let k=0;k<partials;k++){toneRatio[k]=(k+1)+t.toneMetal*(toneBar[k]-(k+1));
      for(let v=2;v<4;v++){const j=(v-2)*partials+k,a=TAU*frequencies[v]/rate*toneRatio[k],re=toneRe[j],im=toneIm[j],norm=1.5-.5*(re*re+im*im);
        toneCos[j]=Math.cos(a);toneSin[j]=Math.sin(a);toneRe[j]=re*norm;toneIm[j]=im*norm;}}
    for(let v=0;v<4;v++){
      increments[v]=frequencies[v]/rate;
      let norm=0;
      for(let k=0;k<partials;k++){
        const h=k+1,hollow=sourceHollow[k],body=sourceBody[k],focus=sourceFocus[k];
        const sheen=.65+.35*sin(clock/rate*(.11+v*.03)+(k/partials)*(.3+t.density*.4));
        const mask=c((rate*.43-frequencies[v]*(toneMetalUsed&&v>1?toneRatio[k]:h))/(rate*.08));
        const energy=(body*hollow+focus)*sheen*mask*(v===0?(k===0?1.25:.55):1);
        goals[v*partials+k]=energy;norm+=energy;
      }
      const scale=gains[v]/Math.max(1,norm*.65);
      for(let k=0;k<partials;k++)goals[v*partials+k]*=scale;
    }
  }
  function process(input,output) {
    const count=output?.[0]?.length??0;if(!count)return true;
    if(quietReset&&params.active===0&&smooth.active<.00001&&!routeLength&&!retiringLength&&!pending){
      // No source, filter or route needs to run after the existing silent
      // reset. Preserve the tiny active-envelope remainder exactly so the
      // next activation starts with the same samples as the original DSP.
      if(smooth.active!==0)for(let i=0;i<count;i++)smooth.active+=(params.active-smooth.active)*controlStep;
      for(let ch=0;ch<output.length;ch++)output[ch].fill(0);
      return true;
    }
    settleRetiring();
    if(pending&&fade>=1)commitRoute();
    if(routeLength&&preparedStepFrames!==count){preparedStepFrames=count;preparedRouteStep=1-Math.exp(-count/(rate*.065));}
    for(let k=0;k<routeLength;k++){const n=nodes[route[k]];n.hz+=(n.targetHz-n.hz)*preparedRouteStep;n.x+=(n.targetX-n.x)*preparedRouteStep;n.y+=(n.targetY-n.y)*preparedRouteStep;prepare(n);}
    for(let k=0;k<retiringLength;k++)prepare(retiring[k]);
    sourceCoefficients();
    // A port message can change targets only between render callbacks. Test
    // their exact floating-point fixed point once per block, keeping the
    // original recurrence and order for every value which can still move.
    let movingCount=0;
    for(let k=0;k<keys.length;k++){
      const key=keys[k],value=smooth[key];
      if(!Object.is(value+(params[key]-value)*controlStep,value))movingKeys[movingCount++]=key;
    }
    // An unused source owns no harmonic work, but its phase keeps advancing
    // exactly as before. Never park a nonzero residual or release tail.
    for(let v=0;v<4;v++){
      sourceEnabled[v]=0;
      for(let k=0;k<partials;k++){const index=v*partials+k;
        if(energies[index]!==0||goals[index]!==0){sourceEnabled[v]=1;break;}}
    }
    for(let i=0;i<count;i++){
      for(let k=0;k<movingCount;k++){const key=movingKeys[k];smooth[key]+=(params[key]-smooth[key])*controlStep;}
      if(smooth.active<.00001&&params.active===0){
        if(!quietReset){reset();quietReset=true;}
        for(let ch=0;ch<output.length;ch++)output[ch][i]=0;continue;
      }
      quietReset=false;let x=0;
      for(let v=0;v<4;v++){
        phases[v]+=increments[v];if(phases[v]>=1)phases[v]-=Math.floor(phases[v]);
        if(!sourceEnabled[v])continue;
        if(toneMetalUsed&&v>1){const base=(v-2)*partials;
          for(let k=0;k<partials;k++){const index=v*partials+k,j=base+k,re=toneRe[j],im=toneIm[j];
            energies[index]+=(goals[index]-energies[index])*gainStep;
            toneRe[j]=re*toneCos[j]-im*toneSin[j];const next=re*toneSin[j]+im*toneCos[j];toneIm[j]=next;
            x+=next*energies[index];}
          continue;}
        for(let k=0;k<partials;k++){const index=v*partials+k;
          energies[index]+=(goals[index]-energies[index])*gainStep;
          x+=sin(phases[v]*(k+1)+v*.17)*energies[index];}
      }
      // The web sounds before the organs, so a touched organ colours it too.
      let webL=x,webR=x;
      if((webLive||webAwakeCount)&&(params.webLevel>0||smooth.webLevel>1e-7)){
        if(--webCountdown<=0){webStep();webCountdown=webTick;}
        let l=0,r=0;
        for(let n=0;n<webVoices;n++){const i=webAwakeList[n];
          const goal=webAmp[i];webEnv[i]+=(goal-webEnv[i])*(goal>webEnv[i]?webAttack:webRelease);
          let v=0;for(let k=0;k<WP;k++){const j=i*WP+k,re=webRe[j],im=webIm[j],cs=webCos[j],sn=webSin[j];
            webRe[j]=re*cs-im*sn;const next=re*sn+im*cs;webIm[j]=next;v+=next*webPart[j];}
          v*=webEnv[i];l+=v*webPanL[i];r+=v*webPanR[i];}
        const gain=smooth.webLevel*.2;webL=x+l*gain;webR=x+r*gain;
      }
      for(let j=0;j<routeLength;j++){const n=nodes[route[j]];n.power+=(n.goal-n.power)*gainStep;}
      fade=Math.min(1,fade+fadeStep);const f=fade*fade*(3-2*fade);
      for(let ch=0;ch<Math.min(2,output.length);ch++){
        const input=ch?webR:webL;
        let y=input;for(let j=0;j<routeLength;j++)y=effect(y,nodes[route[j]],ch);
        if(fade<1){let old=input;for(let j=0;j<retiringLength;j++)old=effect(old,retiring[j],ch);y=old*(1-f)+y*f;}
        const dc=ch?rightStates:leftStates,value=y-dc[0]+.996*dc[1];dc[0]=y;dc[1]=value;
        const pan=ch===0?(smooth.pan>0?1-smooth.pan*.55:1):(smooth.pan<0?1+smooth.pan*.55:1);
        const out=value*smooth.active*smooth.level*pan*.82;
        output[ch][i]=Number.isFinite(out)?Math.tanh(out):0;
      }
      for(let ch=2;ch<output.length;ch++)output[ch][i]=0;
      for(let j=0;j<routeLength;j++){const n=nodes[route[j]];n.cursor=(n.cursor+1)%lag;n.lastFrame=clock;}
      if(fade<1)for(let j=0;j<retiringLength;j++){retiring[j].cursor=(retiring[j].cursor+1)%lag;retiring[j].lastFrame=clock;}
      clock++;
    }
    return true;
  }
  function snapshot() {return {version:'G2',frame:clock,route:Array.from(route).slice(0,routeLength).map(i=>nodes[i].id),
    nodes:nodes.filter(n=>n.id).map(n=>({id:n.id,type:n.type,hz:n.hz,lastFrame:n.lastFrame,
      storedEnergy:n.channels[0].ring.reduce((s,x)=>s+x*x,0)/lag})),fade,
    sourceFrequencies:Array.from(frequencies),sourceGains:Array.from(gains),memoryBytes:15*lag*2*4,
    web:{live:webLive,awake:webAwakeCount,links:webLinks,ids:webIds.slice(),on:Array.from(webOn),amp:Array.from(webAmp),env:Array.from(webEnv),
      queued:webQueued}};}
  return {controls,process,snapshot};
}
const __MyzelGSource = `const createMyzelGDSP=${createMyzelGDSP.toString()};
class XensonarMyzelGProcessor extends AudioWorkletProcessor {
  constructor(){super();this.running=true;this.audibleConfirmed=false;this.dsp=createMyzelGDSP(sampleRate);this.port.onmessage=e=>{
    if(e.data?.type==='dispose'){this.running=false;return;}
    if(e.data?.type==='inspect')this.port.postMessage({type:'state',state:this.dsp.snapshot()});
    else this.dsp.controls(e.data);
  };this.port.postMessage({type:'myzel-ready',version:'G2'});}
  process(inputs,outputs){
    if(!this.running)return false;
    const audio=outputs[0]??null,keepAlive=this.dsp.process(null,audio);
    // This one-shot handshake is based on actual output PCM, not a successful
    // constructor or control message. A silent worklet must never mute fallback.
    if(!this.audibleConfirmed&&audio){
      outer:for(let ch=0;ch<audio.length;ch++){
        const samples=audio[ch];
        for(let i=0;i<samples.length;i++)if(Number.isFinite(samples[i])&&Math.abs(samples[i])>1e-5){
          this.audibleConfirmed=true;this.port.postMessage({type:'myzel-audible'});break outer;
        }
      }
    }
    return keepAlive;
  }
}
registerProcessor('xensonar-myzel-g',XensonarMyzelGProcessor);`;
const __myzelGLoaderCache=new WeakMap();
async function myzelGPrepareWorklet(engine){
  const ctx=engine.ctx;let ready=__myzelGLoaderCache.get(ctx);
  if(!ready){ready=jF(ctx,__MyzelGSource,'Myzel G2 spatial organ synth');__myzelGLoaderCache.set(ctx,ready);
    ready.catch(()=>{if(__myzelGLoaderCache.get(ctx)===ready)__myzelGLoaderCache.delete(ctx);});}
  await ready;if(engine.disposed||ctx.state==='closed')return false;
  const node=new AudioWorkletNode(ctx,'xensonar-myzel-g',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
  engine.nodes.push(node);engine.worklet=node;node.connect(engine.output);
  node.port.onmessage=event=>{
    if(engine.disposed||engine.worklet!==node||engine.workletFailed||event.data?.type!=='myzel-audible'||engine.workletAudible)return;
    engine.workletAudible=true;
    engine.fallbackGain.gain.setTargetAtTime(0,ctx.currentTime,.07);
    // Keep the native fallback for the fade, then retire its real DSP sources.
    engine.parkFallback();
  };
  node.onprocessorerror=()=>{
    if(engine.disposed||engine.worklet!==node)return;
    engine.error='G2 processor error';engine.workletFailed=true;
    // A stopped OscillatorNode is one-shot. Restore a fresh, independently
    // owned native fallback instead of trying to restart retired sources.
    engine.restoreFallback();
  };
  // Do not mute the fallback until the actual Worklet PCM reports non-silence.
  node.port.postMessage(engine.lastControls||{active:0});
  return true;
}
