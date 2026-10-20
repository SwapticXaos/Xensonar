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
    cursor:0,lastFrame:0,channels:[channel(),channel()],coeff:new Float64Array(24)});
  const nodes = Array.from({length:12},organ), retiring = Array.from({length:3},organ);
  const route = new Int8Array(3).fill(-1), wanted = new Int8Array(3).fill(-1);
  let routeLength=0,wantedLength=0,retiringLength=0,pending=false,fade=1,clock=0,quietReset=true;
  const params={active:0,root:165,frequency:220,neighbourFrequency:220,presence:.5,neighbour:0,motion:0,
    brightness:.6,tension:.3,body:.6,level:.7,pan:0,roughness:0,rootLevel:.62,ballLevel:.34,nodeLevel:.78,ballToneLevel:1,ballToneHz:0,ballToneGate:1,
    density:.3,spread:.4,hollow:.4,bloom:.4,openness:.5,retention:.5,gesture:.5};
  const defaults={...params}, smooth={...params}, keys=Object.keys(params);
  const frequencies=new Float64Array(4), gains=new Float64Array(4), phases=new Float64Array(4);
  const partials=10, energies=new Float64Array(partials*4), goals=new Float64Array(partials*4);
  const increments=new Float64Array(4), leftStates=new Float64Array(2), rightStates=new Float64Array(2);
  let stereoClock=0;
  const controlStep=1-Math.exp(-1/(rate*.045)), gainStep=1-Math.exp(-1/(rate*.065));
  const lowCoefficient=1-Math.exp(-TAU*850/rate), fadeStep=1/(rate*.14);
  function clearNode(n) {
    n.cursor=0;n.power=0;n.goal=0;n.hz=220;n.targetHz=220;n.x=.5;n.y=.5;n.targetX=.5;n.targetY=.5;n.memory=1.7;n.coupling=0;n.lastFrame=clock;
    for (const ch of n.channels) {ch.ring.fill(0);ch.filter.fill(0);ch.low=0;ch.env=0;ch.held=0;ch.hold=0;
      ch.subphase=0;ch.dcX=0;ch.dcY=0;ch.aa1=0;ch.aa2=0;ch.previous=0;}
  }
  function reset() {
    quietReset=true;
    for(const n of nodes){clearNode(n);n.id='';n.type='';n.goal=0;}
    for(const n of retiring)clearNode(n);
    route.fill(-1);wanted.fill(-1);routeLength=0;wantedLength=0;retiringLength=0;pending=false;fade=1;
    clock=0;phases.fill(0);energies.fill(0);goals.fill(0);leftStates.fill(0);rightStates.fill(0);stereoClock=0;
  }
  function copyNode(to,from) {
    for(const key of ['id','type','hz','targetHz','power','goal','x','y','targetX','targetY','memory','coupling','cursor','lastFrame'])to[key]=from[key];
    to.coeff.set(from.coeff);
    for(let k=0;k<2;k++){const a=to.channels[k],b=from.channels[k];a.ring.set(b.ring);a.filter.set(b.filter);
      for(const key of ['low','env','held','hold','subphase','dcX','dcY','aa1','aa2','previous'])a[key]=b[key];}
  }
  function coefficient(freq,q,out,offset) {
    const g=Math.tan(Math.PI*c(freq,25,rate*.34)/rate),k=1/c(q,.7,20),a=1/(1+g*(g+k));
    out[offset]=a;out[offset+1]=g*a;out[offset+2]=g*g*a;out[offset+3]=k;
  }
  function prepare(n) {
    const hz=n.hz, spread=.025+n.coupling*.16;
    for(let j=0;j<3;j++)coefficient(hz*(j===0?1:j===1?2+spread:3-spread*.5),4.5+n.y*6+j,n.coeff,j*4);
    const vowel=c(n.x*.65+smooth.brightness*.2+smooth.hollow*.15);
    // Absolute formant regions preserve their character when resident pitch moves.
    coefficient(290+vowel*520,3.6,n.coeff,12);
    coefficient(920+vowel*1080,4.5,n.coeff,16);
    coefficient(2240+vowel*720,5.2,n.coeff,20);
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
        let duplicate=false;for(let k=0;k<wantedLength;k++)if(wanted[k]===index)duplicate=true;
        if(!duplicate)wanted[wantedLength++]=index;
      }
      pending=wantedLength!==routeLength;
      for(let i=0;i<wantedLength;i++)if(wanted[i]!==route[i])pending=true;
      if(pending&&fade>=1)commitRoute();
    }
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
    for(let v=0;v<4;v++){
      increments[v]=frequencies[v]/rate;
      let norm=0;const openness=c(t.brightness*.30+t.openness*.7),window=1.1+openness*5+t.density*2+(1-t.body)*.8;
      const centre=1.5+t.bloom*6.5+t.motion*1.5+t.tension*.8;
      for(let k=0;k<partials;k++){
        const h=k+1,odd=h&1;
        const hollow=odd?1+.55*t.hollow+t.roughness*.22:1-.85*t.hollow;
        const body=Math.exp(-k/window)/(1+k*(.13+t.body*.18));
        const focus=Math.exp(-(((h-centre)/(1.3+t.spread*2))**2))*(.15+t.bloom*.65);
        const sheen=.65+.35*sin(clock/rate*(.11+v*.03)+(k/partials)*(.3+t.density*.4));
        const mask=c((rate*.43-frequencies[v]*h)/(rate*.08));
        const energy=(body*hollow+focus)*sheen*mask*(v===0?(k===0?1.25:.55):1);
        goals[v*partials+k]=energy;norm+=energy;
      }
      const scale=gains[v]/Math.max(1,norm*.65);
      for(let k=0;k<partials;k++)goals[v*partials+k]*=scale;
    }
  }
  function process(input,output) {
    const count=output[0]?.length??0;if(!count)return true;
    settleRetiring();
    if(pending&&fade>=1)commitRoute();
    for(let k=0;k<routeLength;k++){const n=nodes[route[k]];const step=1-Math.exp(-count/(rate*.065));n.hz+=(n.targetHz-n.hz)*step;n.x+=(n.targetX-n.x)*step;n.y+=(n.targetY-n.y)*step;prepare(n);}
    for(let k=0;k<retiringLength;k++)prepare(retiring[k]);
    sourceCoefficients();
    for(let i=0;i<count;i++){
      for(let k=0;k<keys.length;k++){const key=keys[k];smooth[key]+=(params[key]-smooth[key])*controlStep;}
      if(smooth.active<.00001&&params.active===0){
        if(!quietReset){reset();quietReset=true;}
        for(let ch=0;ch<output.length;ch++)output[ch][i]=0;continue;
      }
      quietReset=false;let x=0;
      for(let v=0;v<4;v++){
        phases[v]+=increments[v];if(phases[v]>=1)phases[v]-=Math.floor(phases[v]);
        for(let k=0;k<partials;k++){const index=v*partials+k;
          energies[index]+=(goals[index]-energies[index])*gainStep;
          x+=sin(phases[v]*(k+1)+v*.17)*energies[index];}
      }
      for(let j=0;j<routeLength;j++){const n=nodes[route[j]];n.power+=(n.goal-n.power)*gainStep;}
      fade=Math.min(1,fade+fadeStep);const f=fade*fade*(3-2*fade);
      for(let ch=0;ch<Math.min(2,output.length);ch++){
        let y=x;for(let j=0;j<routeLength;j++)y=effect(y,nodes[route[j]],ch);
        if(fade<1){let old=x;for(let j=0;j<retiringLength;j++)old=effect(old,retiring[j],ch);y=old*(1-f)+y*f;}
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
    sourceFrequencies:Array.from(frequencies),sourceGains:Array.from(gains),memoryBytes:15*lag*2*4};}
  return {controls,process,snapshot};
}
const __MyzelGSource = `const createMyzelGDSP=${createMyzelGDSP.toString()};
class XensonarMyzelGProcessor extends AudioWorkletProcessor {
  constructor(){super();this.dsp=createMyzelGDSP(sampleRate);this.port.onmessage=e=>{
    if(e.data?.type==='inspect')this.port.postMessage({type:'state',state:this.dsp.snapshot()});
    else this.dsp.controls(e.data);
  };this.port.postMessage({type:'myzel-ready',version:'G2'});}
  process(inputs,outputs){return this.dsp.process(inputs[0]??[],outputs[0]??[]);}
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
  node.onprocessorerror=()=>{engine.error='G2 processor error';engine.fallbackGain.gain.setTargetAtTime(.65,ctx.currentTime,.075);};
  node.port.postMessage(engine.lastControls||{active:0});engine.fallbackGain.gain.setTargetAtTime(0,ctx.currentTime,.07);
  return true;
}
