/* Serializable factory. The exact same DSP runs offline and inside AudioWorklet. */
function createNodalSynthesisKernel() {
const emiliaWeaveTableCache=new WeakMap();
// Incremental computation across immutable plans. Cache ONLY spectral source
// inputs, never the time-dependent reciprocal loop, resonant eigenmodes or PCM.
// Full-precision keys intentionally include every input that shapes each table.
const emiliaWeaveBankCache=new Map();
const emiliaWeavePhaseCache=new Map();
const emiliaWeaveBankLimit=72,emiliaWeavePhaseLimit=12;
function emiliaMemo(cache,key,create,limit){
  if(cache.has(key)){
    const item=cache.get(key);cache.delete(key);cache.set(key,item);return item;
  }
  const item=create();cache.set(key,item);
  if(cache.size>limit)cache.delete(cache.keys().next().value);
  return item;
}
const emiliaHXWaveCache=new Map();
let emiliaHXHarmonics=null; // 32 x 2048 exact Math.sin values, shared across HX source shapes.
function emiliaHXWaves(type){
  if(emiliaHXWaveCache.has(type))return emiliaHXWaveCache.get(type);
  const levels=[1,2,4,8,16,32],size=2048;
  if(!emiliaHXHarmonics){
    const harmonics=new Float64Array(32*size);
    for(let h=1;h<=32;h++)for(let i=0;i<size;i++)harmonics[(h-1)*size+i]=Math.sin(2*Math.PI*h*i/size);
    emiliaHXHarmonics=harmonics;
  }
  const tables=levels.map(limit=>{
    const table=new Float32Array(size+1);
    for(let i=0;i<size;i++){let value=0;for(let h=1;h<=limit;h++){
      const amplitude=type==='sine'?(h===1?1:0):type==='sawtooth'?1/h:
        type==='square'?(h%2?1/h:0):(h%2?((h%4===1?1:-1)/(h*h)):0);
      value+=amplitude*emiliaHXHarmonics[(h-1)*size+i];
    }table[i]=value;}
    table[size]=table[0];return table;
  });
  let peak=0;for(const v of tables.at(-1))peak=Math.max(peak,Math.abs(v));
  for(const table of tables)for(let i=0;i<=size;i++)table[i]*=.78/peak;
  emiliaHXWaveCache.set(type,tables);return tables;
}
/* Self-contained opt-in voice, embedded in the Nodal factory. Source banks are
   shared by voices of this recipe; each voice owns all oscillator/filter states. */
function createEmiliaWeaveVoice(plan,options={},sampleRate=48000){
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),TAU=Math.PI*2;
  const frequency=options.frequency??220,velocity=options.velocity??.7,gain=options.gain??.7,duration=options.durationSec??plan.articulation.durationSec;
  if(!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000)throw Error('Invalid sample rate');
  if(!Number.isFinite(frequency)||frequency<5||frequency>12000)throw Error('Invalid note frequency');
  if(!Number.isFinite(velocity)||velocity<0||velocity>1||!Number.isFinite(gain)||gain<0||gain>1)throw Error('Invalid note level');
  if(!Number.isFinite(duration)||duration<.02||duration>30)throw Error('Invalid note duration');
  for(const key of ['attackSec','releaseSec'])if(options[key]!=null&&(!Number.isFinite(options[key])||options[key]<0||options[key]>3))throw Error('Invalid note fade');
  for(const curve of [options.volumeCurve,options.pitchCurve])if(curve&&(!Array.isArray(curve)||curve.length>512||!curve.every(Number.isFinite)))throw Error('Invalid note contour');
  const recipe=plan.emiliaWeave,hx=recipe.hxSource,oversampling=hx?4:2,n=plan.nodes.length,sr=sampleRate*oversampling,tableSize=2048,levels=[1,2,4,8,16,32];
  const hxCount=hx?.operators.length??0,hxPhase=new Float64Array(hxCount),hxStep=new Float64Array(hxCount),hxMask=new Float64Array(hxCount),hxMip=new Int8Array(hxCount),hxNext=new Int8Array(hxCount),hxMix=new Float64Array(hxCount);
  const hxTables=hx?hx.operators.map(op=>emiliaHXWaves(op.type)):[];
  const hxNorm=hx?.operators.length?.65/Math.max(.02,Math.sqrt(hx.operators.reduce((s,op)=>s+op.gain*op.gain,0))):1;
  let hxReturn=0,returnPole=0,rootNotch1=0,rootNotch2=0,rootA1=0,rootA2=0,rootA3=0;
  const rootK=1/7;
  let banks=emiliaWeaveTableCache.get(plan);
  if(!banks){
    // The relative-node phase basis depends on dx, not on global spectral
    // weights. Preserve it across constellation edits for unchanged dx values.
    // Float64 is necessary: rounding the basis to Float32 changes the sound.
    const phaseBasis=dx=>emiliaMemo(emiliaWeavePhaseCache,dx,()=>{
      const terms=new Float64Array(32*tableSize);
      const offsets=new Float64Array(32);
      for(let h=1;h<=32;h++)offsets[h-1]=dx*.08*Math.sin(h);
      for(let k=0;k<tableSize;k++){
        const phase=k/tableSize*TAU;
        for(let h=1;h<=32;h++)terms[(h-1)*tableSize+k]=Math.sin(h*phase+offsets[h-1]);
      }
      return terms;
    },emiliaWeavePhaseLimit);
    const build=p=>{
      const attack=levels.map(()=>new Float32Array(tableSize+1)),settled=levels.map(()=>new Float32Array(tableSize+1));
      const settledGains=new Float64Array(32);
      for(let h=1;h<=32;h++)settledGains[h-1]=p.partials[h-1]*Math.pow(h,-p.spectralDecay);
      const terms=phaseBasis(p.neighborhood.dx);
      for(let m=0;m<levels.length;m++){
        const limit=levels[m],dry=attack[m],wet=settled[m];
        for(let k=0;k<tableSize;k++){
          let a=0,b=0;
          for(let h=1;h<=limit;h++){
            const sine=terms[(h-1)*tableSize+k];
            a+=p.partials[h-1]*sine;
            b+=settledGains[h-1]*sine;
          }
          dry[k]=a;wet[k]=b;
        }
        dry[tableSize]=dry[0];wet[tableSize]=wet[0];
      }
      let peak=0;for(const value of attack[attack.length-1])peak=Math.max(peak,Math.abs(value));
      const scale=.78/Math.max(.001,peak);
      for(const table of [...attack,...settled])for(let k=0;k<=tableSize;k++)table[k]*=scale;
      return {attack,settled};
    };
    banks=recipe.sources.map(p=>{
      // A source can remain identical while unrelated nodes or carrier settings
      // change. Undo/Redo can also revisit an older source exactly.
      const key=JSON.stringify([p.partials,p.spectralDecay,p.neighborhood.dx]);
      return emiliaMemo(emiliaWeaveBankCache,key,()=>build(p),emiliaWeaveBankLimit);
    });emiliaWeaveTableCache.set(plan,banks);
  }
  const phase=new Float64Array(n),step=new Float64Array(n),mask=new Float64Array(n),mip=new Int8Array(n),mipNext=new Int8Array(n),mipMix=new Float64Array(n);
  const output=new Float64Array(n),previous=new Float64Array(n),bodyLow=new Float64Array(n),load=new Float64Array(n),sourceTransient=new Float64Array(n),transientStep=new Float64Array(n);
   // Constant within a voice: resolve once, not at every 4x oversampling step.
   const combDamping=new Float64Array(n),combWetAmount=new Float64Array(n),linkTotal=new Float64Array(n);
  const random=new Uint32Array(n),noiseLow=new Float64Array(n),noiseHigh=new Float64Array(n);
  const metalR=new Float64Array(n*8),metalI=new Float64Array(n*8),metalCos=new Float64Array(n*8),metalSin=new Float64Array(n*8),metalMask=new Float64Array(n*8),metalEnv=new Float64Array(n*8),metalDecay=new Float64Array(n*8);
  const filters=new Float64Array(n*6),coeff=new Float64Array(n*12),combLow=new Float64Array(n),combDelay=new Float64Array(n);
  const ringSize=Math.ceil(sr*.12)+4,rings=Array.from({length:n},()=>new Float32Array(ringSize));let cursor=0;
  const attack=Math.max(1,Math.round((options.attackSec??.004)*sr)),release=Math.max(1,Math.round((options.releaseSec??.12)*sr));
  const held=options.held===true,gateFrames=Math.round(duration*sr),lease=options.offlineDurationSec;
  const watchdog=Math.round((Number.isFinite(lease)&&lease>0&&lease<=601?lease:30)*sr);
  const volume=options.volumeCurve??plan.articulation.volumeCurve,pitch=options.pitchCurve??plan.articulation.pitchCurve;
  let root=frequency,target=frequency,age=0,released=false,releaseAge=0,releaseLevel=0,envelope=0,ended=plan.silent,faults=0,peakInternal=0;
  let expression=clamp(options.expression??velocity),expressionTarget=expression,dcX=0,dcY=0,lp1=0,lp2=0,lp3=0,lp4=0;
  const slew=1-Math.exp(-1/(sr*.006)),memoryStep=1-Math.exp(-1/(sr*.01)),noiseStep=1-Math.exp(-TAU*4200/sr),airStep=1-Math.exp(-TAU*500/sr);
  const lp=1-Math.exp(-TAU*sampleRate*(hx?.45:.33)/sr),dcPole=Math.exp(-TAU*8/sr);
  let pickupNorm=0;for(const p of recipe.sources)pickupNorm+=p.pickup;pickupNorm=Math.max(.2,pickupNorm);
  function curveAt(curve,pos,fallback){if(!curve?.length)return fallback;const p=clamp(pos)*(curve.length-1),a=Math.floor(p);return curve[a]+(curve[Math.min(a+1,curve.length-1)]-curve[a])*(p-a);}
  function svfCoefficient(hz,q,index){
    const g=Math.tan(Math.PI*clamp(hz,25,sampleRate*.43)/sr),k=1/q,a=1/(1+g*(g+k));coeff[index]=a;coeff[index+1]=g*a;coeff[index+2]=g*g*a;coeff[index+3]=k;
  }
  for(let i=0;i<n;i++){
    let seed=(options.seed??plan.seed)>>>0;for(let j=0;j<plan.nodes[i].id.length;j++){seed^=plan.nodes[i].id.charCodeAt(j);seed=Math.imul(seed,16777619);}
    random[i]=seed>>>0||1;phase[i]=((options.seed??plan.seed)%4096)/4096;sourceTransient[i]=1;transientStep[i]=Math.exp(-1/(sr*recipe.sources[i].pulseDecay));
     const p=recipe.sources[i];
     combDamping[i]=1-Math.exp(-TAU*p.dampingHz/sr);
     combWetAmount[i]=hx?clamp(.55+p.x*.30+(plan.nodes[i].role==='resonator'?.10:0),0,.94):p.combMix;
     let total=0;for(const link of recipe.links[i])total+=link.weight;
     linkTotal[i]=Math.max(1,total);
    for(let k=0;k<8;k++){const j=i*8+k,p=recipe.sources[i].nonharmonic[k];metalR[j]=Math.cos(p.phase);metalI[j]=Math.sin(p.phase);metalEnv[j]=1;metalDecay[j]=Math.exp(-1/(sr*p.decay));}
  }
  function coefficients(){
    const hzRoot=root*Math.pow(2,curveAt(pitch,age/Math.max(1,gateFrames),0)/12);
    if(hx){
      const g=Math.tan(Math.PI*clamp(hzRoot,5,sampleRate*.43)/sr);
      rootA1=1/(1+g*(g+rootK));rootA2=g*rootA1;rootA3=g*g*rootA1;
      returnPole=1-Math.exp(-TAU*Math.min(sampleRate*.36,Math.max(800,hzRoot*3))/sr);
      for(let j=0;j<hxCount;j++){
        const op=hx.operators[j],hz=hzRoot*op.ratio*Math.pow(2,op.detune/1200);hxStep[j]=hz/sr;
        hxMask[j]=clamp((sampleRate*.45-hz)/(sampleRate*.12));
        const budget=Math.max(1,sampleRate*.32/(Math.max(5,hz)*(1+hx.foldDrive*.10)));
        let m=0;while(m<levels.length-1&&levels[m+1]<=budget)m++;hxMip[j]=m;hxNext[j]=Math.min(m+1,levels.length-1);hxMix[j]=clamp((budget-levels[m])/Math.max(1,levels[hxNext[j]]-levels[m]));
      }
    }
    for(let i=0;i<n;i++){
      const p=recipe.sources[i],hz=hzRoot*plan.nodes[i].ratio*(plan.nodes[i].role==='sub'?.5:1);step[i]=hz/sr;mask[i]=clamp((sampleRate*.46-hz)/(sampleRate*.08));
      // Mips protect the highest partials also during spatial phase modulation.
      const maximum=Math.max(1,sampleRate*.38/(Math.max(5,hz)*(1+p.fm*.18+p.networkDepth*.10)));
      let level=0;while(level<levels.length-1&&levels[level+1]<=maximum)level++;
      mip[i]=level;mipNext[i]=Math.min(level+1,levels.length-1);mipMix[i]=clamp((maximum-levels[level])/Math.max(1,levels[mipNext[i]]-levels[level]));
      combDelay[i]=clamp(sr/(Math.max(12,hz)*p.combRatio),2,ringSize-3);
      for(let k=0;k<3;k++)svfCoefficient(p.formants[k],2.2+p.y*2.6,i*12+k*4);
      for(let k=0;k<8;k++){const j=i*8+k,f=hz*p.nonharmonic[k].ratio,a=TAU*f/sr;metalCos[j]=Math.cos(a);metalSin[j]=Math.sin(a);metalMask[j]=clamp((sampleRate*.45-f)/(sampleRate*.08));}
    }
  }
  coefficients();
  function lookup(table,p){const x=(p-Math.floor(p))*tableSize,a=Math.floor(x);return table[a]+(table[a+1]-table[a])*(x-a);}
  function band(input,i,k){
    const state=i*6+k*2,index=i*12+k*4,v3=input-filters[state+1],v1=coeff[index]*filters[state]+coeff[index+1]*v3;
    const v2=filters[state+1]+coeff[index+1]*filters[state]+coeff[index+2]*v3;filters[state]=2*v1-filters[state];filters[state+1]=2*v2-filters[state+1];return v1*coeff[index+3];
  }
  function noteOff(){if(!released){released=true;releaseAge=0;releaseLevel=envelope;}}
  function setFrequency(hz){if(!Number.isFinite(hz)||hz<5||hz>12000)return false;target=hz;return true;}
  function setExcitation(value){if(!Number.isFinite(value)||value<0||value>1)return false;expressionTarget=value;return true;}
  function sample(){
    if(ended)return 0;
    if(!released&&(age>=watchdog||(!held&&age>=gateFrames)))noteOff();
    expression+=(expressionTarget-expression)*slew;
    if((age&31)===0&&(pitch||Math.abs(root-target)>1e-8)){root*=Math.pow(target/root,1-Math.exp(-32/(sr*.006)));coefficients();}
    envelope=Math.min(1,age/attack);if(released){envelope=releaseLevel*Math.max(0,1-releaseAge/release);if(releaseAge++>=release){ended=true;return 0;}}
    previous.set(output);output.fill(0);let final=0,hxInput=0;
    if(hx){
      // Audio returning FROM the node body modifies the HX oscillators BEFORE
      // their signal re-enters the body. This is a reciprocal audio loop.
      const feedback=Math.tanh(hxReturn*3)*hx.feedback;
      for(let j=0;j<hxCount;j++){
        hxPhase[j]+=hxStep[j];hxPhase[j]-=Math.floor(hxPhase[j]);
        const at=hxPhase[j]+feedback*hx.phaseReturn/(TAU)*(1+j%6*.12);
        hxInput+=(lookup(hxTables[j][hxMip[j]],at)*(1-hxMix[j])+lookup(hxTables[j][hxNext[j]],at)*hxMix[j])*hx.operators[j].gain*hxMask[j];
      }
      hxInput*=hxNorm;
      const driven=hxInput*hx.foldDrive+feedback*.55;
      const shaped=Math.sin(driven+hx.asymmetry*driven*driven);
      hxInput=Math.tanh(driven)*(1-hx.foldMix)+shaped*hx.foldMix;
    }
    for(const i of recipe.order){
      const p=recipe.sources[i];let incoming=0;
      for(const link of recipe.links[i]){const contribution=output[link.node]!==0?output[link.node]:previous[link.node]*.8;incoming+=contribution*link.weight;}
      incoming/=linkTotal[i];const interaction=p.networkDepth*incoming*.65;
      phase[i]+=step[i];phase[i]-=Math.floor(phase[i]);
      const angle=TAU*phase[i],warp=(p.phaseShape*Math.sin(angle+interaction)+p.fm*Math.sin(angle*2+interaction*.7)+interaction)/(TAU*1.7);
      const at=phase[i]+warp+load[i]*p.networkDepth*.012;
      sourceTransient[i]*=transientStep[i];
      const bank=banks[i],attackColor=lookup(bank.attack[mip[i]],at)*(1-mipMix[i])+lookup(bank.attack[mipNext[i]],at)*mipMix[i],settledColor=lookup(bank.settled[mip[i]],at)*(1-mipMix[i])+lookup(bank.settled[mipNext[i]],at)*mipMix[i];
      // Note-off starts the Carrier release envelope. Keep the material
      // oscillator alive THROUGH that envelope; cutting its source immediately
      // erased the body and left only a short, common filter residue.
      let source=(attackColor*sourceTransient[i]+settledColor*(1-sourceTransient[i]))*mask[i];
      // High partials relax after an attack; sustained Carrier gates still play
      // this material. There is no autonomous note train or attack pitch sweep.
      const materialEnvelope=p.sustain+(1-p.sustain)*sourceTransient[i];source*=materialEnvelope;
      let metal=0;
      for(let k=0;k<8;k++){const j=i*8+k,r=metalR[j],q=metalI[j];metalR[j]=r*metalCos[j]-q*metalSin[j];metalI[j]=r*metalSin[j]+q*metalCos[j];metalEnv[j]*=metalDecay[j];metal+=metalR[j]*p.nonharmonic[k].gain*(.12+p.y*.15+metalEnv[j])*(1+incoming*.35)*metalMask[j];}
      let z=random[i];z^=z<<13;z^=z>>>17;z^=z<<5;random[i]=z>>>0;const rnd=random[i]/2147483648-1;
      noiseLow[i]+=(rnd-noiseLow[i])*noiseStep;noiseHigh[i]+=(noiseLow[i]-noiseHigh[i])*airStep;
      source+=(noiseLow[i]-noiseHigh[i])*p.breath*(.55+expression*.65)+metal;
      if(hx){
        const role=plan.nodes[i].role;
        source=hxInput*hx.bodyFeed+source*(role==='sub'?.34:.10)*(1-p.x);
        if(role==='drive')source=Math.tanh(source*(2+plan.nodes[i].strength*2.2));
        if(role==='fold')source=Math.sin(source*(2.5+plan.nodes[i].strength*3+p.y*2));
      }
      // Neighbour audio changes the input waveform and resistance, not merely
      // a post-render volume. The bounded multiplier cannot self-excite.
      source*=p.level*(.75+expression*.35)*(1+incoming*p.networkDepth*.35);
      let vowel=0;for(let k=0;k<3;k++)vowel+=band(source,i,k)*(k===0?.75:k===1?1.65:1.2);
      const formantWet=clamp(hx?Math.max(p.formantMix*(1+incoming*p.networkDepth*.7),plan.nodes[i].role==='formant'?.88:.12+p.y*.28):p.formantMix*(1+incoming*p.networkDepth*.7),0,.96);
      let value=source*(1-formantWet*.72)+vowel*formantWet*2.1;
      const index=(cursor-combDelay[i]+ringSize)%ringSize,a=Math.floor(index),f=index-a,ring=rings[i],echo=ring[a]*(1-f)+ring[(a+1)%ringSize]*f;
      combLow[i]+=(echo-combLow[i])*combDamping[i];
      const feedbackGain=hx?clamp(p.combFeedback+.24+incoming*.08,.12,.88):p.combFeedback;
      ring[cursor]=value*.5+combLow[i]*feedbackGain;
      const combWet=combWetAmount[i];
      value=hx?value*(1-combWet)+combLow[i]*combWet*1.6:value*(1-combWet*.55)+combLow[i]*combWet;
      load[i]+=(Math.abs(value)-load[i])*memoryStep;
      // Ordinary node levels stay linear. Only pathological states hit a knee.
      if(Math.abs(value)>1.4)value=Math.sign(value)*(1.4+.25*Math.tanh((Math.abs(value)-1.4)/.25));
      if(!Number.isFinite(value)){faults++;ended=true;return 0;}
      output[i]=value;final+=value*p.pickup;
    }
    cursor=(cursor+1)%ringSize;
    if(hx){
      // Return the processed body signal, not the dry excitation. Note/voice
      // state owns this loop; it cannot continue after the Carrier release.
      hxReturn+=(final/pickupNorm-hxReturn)*returnPole;
      const v3=final-rootNotch2,v1=rootA1*rootNotch1+rootA2*v3,v2=rootNotch2+rootA2*rootNotch1+rootA3*v3;
      rootNotch1=2*v1-rootNotch1;rootNotch2=2*v2-rootNotch2;
      final-=v1*rootK*hx.rootReject;
    }
    final*=gain*velocity*envelope*curveAt(volume,age/Math.max(1,gateFrames),1)*.58/pickupNorm;
    peakInternal=Math.max(peakInternal,Math.abs(final));
    const dc=final-dcX+dcPole*dcY;dcX=final;dcY=dc;lp1+=lp*(dc-lp1);lp2+=lp*(lp1-lp2);age++;
    if(hx){lp3+=lp*(lp2-lp3);lp4+=lp*(lp3-lp4);}
    const result=hx?lp4:lp2;
    return Math.abs(result)<=.88?result:Math.sign(result)*(.88+.10*Math.tanh((Math.abs(result)-.88)/.10));
  }
  function process(left,right,start=0,frames=left.length-start,accumulate=false){for(let i=start;i<start+frames;i++){let value=0;for(let k=0;k<oversampling;k++)value=sample();if(accumulate){left[i]+=value;if(right&&right!==left)right[i]+=value;}else{left[i]=value;if(right&&right!==left)right[i]=value;}}return !ended;}
  return {process,noteOff,setFrequency,setExcitation,get ended(){return ended;},snapshot:()=>({ageFrames:Math.floor(age/oversampling),frequency:root,targetFrequency:target,released,ended,faults,peakInternal,expression,engine:hx?'hx-reciprocal-v4':'timbre-body-v3'})};
}

/* Embedded in the serializable Nodal factory at build time. Emilia owns this
   opt-in kernel; the original Nodal V1 branch remains byte-for-byte unchanged. */
function createEmiliaMaterialVoice(plan, options = {}, sampleRate = 48000) {
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)), PI2=Math.PI*2;
  const frequency=options.frequency??220, velocity=options.velocity??.7, gain=options.gain??.7;
  if(!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000)throw Error('Invalid sample rate');
  if(!Number.isFinite(frequency)||frequency<5||frequency>12000)throw Error('Invalid note frequency');
  if(!Number.isFinite(velocity)||velocity<0||velocity>1||!Number.isFinite(gain)||gain<0||gain>1)throw Error('Invalid note level');
  const duration=options.durationSec??plan.articulation.durationSec;
  if(!Number.isFinite(duration)||duration<.02||duration>30)throw Error('Invalid note duration');
  for(const k of ['attackSec','releaseSec'])if(options[k]!=null&&(!Number.isFinite(options[k])||options[k]<0||options[k]>3))throw Error('Invalid note fade');
  for(const c of [options.volumeCurve,options.pitchCurve])if(c&&(!Array.isArray(c)||c.length>512||!c.every(Number.isFinite)))throw Error('Invalid note contour');
  const n=plan.nodes.length, bands=plan.bands.length, modes=n*bands, sr=sampleRate*2, partials=12;
  const real=new Float64Array(modes),imag=new Float64Array(modes),cos=new Float64Array(modes),sin=new Float64Array(modes),damp=new Float64Array(modes),mask=new Float64Array(modes);
  const modalR=new Float64Array(modes),modalI=new Float64Array(modes);
  const oscR=new Float64Array(n),oscI=new Float64Array(n),stepR=new Float64Array(n),stepI=new Float64Array(n),harmonicMask=new Float64Array(n*partials);
  const harmonic=new Float64Array(n),impulse=new Float64Array(n),friction=new Float64Array(n),excitation=new Float64Array(n),contact=new Float64Array(n);
  const random=new Uint32Array(n),noiseLow=new Float64Array(n),noiseSlow=new Float64Array(n),transient=new Float64Array(n);
  const memory=new Float64Array(n),highMemory=new Float64Array(n),load=new Float64Array(n),loadHigh=new Float64Array(n);
  const feedback=new Float64Array(n),textureStep=new Float64Array(n),transientStep=new Float64Array(n);
  const material=plan.emiliaMaterial, held=options.held===true;
  const attack=Math.max(1,Math.round((options.attackSec??.004)*sr)),release=Math.max(1,Math.round((options.releaseSec??.12)*sr));
  const gateFrames=Math.round(duration*sr),lease=options.offlineDurationSec;
  const watchdog=Math.round((Number.isFinite(lease)&&lease>0&&lease<=601?lease:30)*sr);
  const contour=options.volumeCurve??plan.articulation.volumeCurve,pitch=options.pitchCurve??plan.articulation.pitchCurve;
  let root=frequency,target=frequency,age=0,ended=plan.silent,released=false,releaseAge=0,releaseLevel=1,envelope=0,faults=0;
  let expression=clamp(options.expression??velocity,0,1),expressionTarget=expression,dcX=0,dcY=0,lp1=0,lp2=0,peakState=0;
  const smooth=1-Math.exp(-1/(sr*.006)),memorySmooth=1-Math.exp(-16/(sr*.012));
  const lp=1-Math.exp(-PI2*sampleRate*.30/sr),dcPole=Math.exp(-PI2*8/sr),slowStep=1-Math.exp(-PI2*75/sr);
  function curveAt(c,pos,fallback){if(!c?.length)return fallback;const p=clamp(pos,0,1)*(c.length-1),a=Math.floor(p);return c[a]+(c[Math.min(a+1,c.length-1)]-c[a])*(p-a);}
  for(let i=0;i<n;i++){
    let h=(options.seed??plan.seed)>>>0;
    for(let j=0;j<plan.nodes[i].id.length;j++){h^=plan.nodes[i].id.charCodeAt(j);h=Math.imul(h,16777619);}
    textureStep[i]=1-Math.exp(-PI2*material.sources[i].textureHz/sr);
    transientStep[i]=Math.exp(-1/(sr*material.sources[i].transientSec));
    random[i]=h>>>0||1;const phase=(random[i]%4096)/4096*PI2;
    oscR[i]=Math.cos(phase);oscI[i]=Math.sin(phase);transient[i]=1;
  }
  for(let k=0;k<modes;k++){modalR[k]=Math.cos(k*2.3999632297);modalI[k]=Math.sin(k*2.3999632297);damp[k]=Math.exp(-plan.bands[Math.floor(k/n)].decayRates[k%n]/sr);}
  function coefficients(){
    const hzRoot=root*Math.pow(2,curveAt(pitch,age/Math.max(1,gateFrames),0)/12);
    for(let b=0;b<bands;b++)for(let j=0;j<n;j++){
      const k=b*n+j,hz=hzRoot*plan.bands[b].frequencies[j],a=PI2*hz/sr;
      cos[k]=Math.cos(a);sin[k]=Math.sin(a);mask[k]=clamp((sampleRate*.46-hz)/(sampleRate*.08),0,1);
    }
    for(let i=0;i<n;i++){
      const hz=hzRoot*plan.nodes[i].ratio*plan.nodes[i].partials[0],a=PI2*hz/sr;
      stepR[i]=Math.cos(a);stepI[i]=Math.sin(a);
      for(let h=1;h<=partials;h++)harmonicMask[i*partials+h-1]=clamp((sampleRate*.46-hz*h)/(sampleRate*.08),0,1);
    }
  }
  coefficients();
  function noteOff(){if(!released){released=true;releaseAge=0;releaseLevel=envelope;}}
  function setFrequency(hz){if(!Number.isFinite(hz)||hz<5||hz>12000)return false;target=hz;return true;}
  function setExcitation(value){if(!Number.isFinite(value)||value<0||value>1)return false;expressionTarget=value;return true;}
  const bounded=x=>x/(1+Math.abs(x));
  function sample(){
    if(ended)return 0;
    if(!released&&(age>=watchdog||(!held&&age>=gateFrames)))noteOff();
    expression+=(expressionTarget-expression)*smooth;
    if((age&15)===0){
      if(pitch||Math.abs(root-target)>1e-8){root*=Math.pow(target/root,1-Math.exp(-16/(sr*.006)));coefficients();}
      // Delayed, bounded material load. It modulates supplied excitation only;
      // it never injects a raw feedback signal or a second musical oscillator.
      for(let i=0;i<n;i++){
        memory[i]+=(bounded(load[i]*8)-memory[i])*memorySmooth;
        highMemory[i]+=(bounded(loadHigh[i]*8)-highMemory[i])*memorySmooth;
        feedback[i]=material.feedback*clamp((highMemory[i]/(memory[i]+.05)-.45)*1.8+memory[i]*.55,-1,1);
      }
    }
    envelope=Math.min(1,age/attack);
    if(released){envelope=releaseLevel*Math.max(0,1-releaseAge/release);if(releaseAge++>=release){ended=true;return 0;}}
    const driven=!released;
    if(driven)for(let i=0;i<n;i++){
      const p=material.sources[i],r=oscR[i],q=oscI[i];
      oscR[i]=r*stepR[i]-q*stepI[i];oscI[i]=r*stepI[i]+q*stepR[i];
      let prev=1,now=oscR[i],sum=0;
      const response=feedback[i],force=.72+.56*expression;
      for(let h=1;h<=partials;h++){
        if(h>1){const next=2*oscR[i]*now-prev;prev=now;now=next;}
        // State changes spectral distribution without changing Carrier pitch.
        const shaped=p.partials[h-1]*(1+response*(h/partials-.35))*(1+p.hardness*(expression-.5)*(h/partials));
        sum+=now*shaped*harmonicMask[i*partials+h-1];
      }
      let z=random[i];z^=z<<13;z^=z>>>17;z^=z<<5;random[i]=z>>>0;
      const rnd=random[i]/2147483648-1;
      noiseLow[i]+=textureStep[i]*(rnd-noiseLow[i]);
      noiseSlow[i]+=slowStep*(noiseLow[i]-noiseSlow[i]);
      const noise=noiseLow[i]-noiseSlow[i];
      transient[i]*=transientStep[i];
      const level=plan.nodes[i].excitation*plan.excitation.level*velocity;
      const sustained=p.sustain+(1-p.sustain)*transient[i];
      harmonic[i]=sum*p.harmonic*force*sustained*level;
      impulse[i]=noise*p.impulse*transient[i]*(.55+expression)*level;
      // Bow/slip resistance follows the modal load; no free-running pulse clock.
      const slip=clamp(1-memory[i]*p.resistance+response*.45,.25,1.35);
      friction[i]=noise*p.friction*slip*(.3+expression*.8)*level;
      excitation[i]=level*force*sustained*p.harmonic;
      // Coherent rubbing feeds collective motion as well as broadband texture.
      // Without this transfer, narrow modes reduce every source to tonal sustain.
      contact[i]=p.friction*slip*(.3+expression*.8)*level*(1+noiseSlow[i]*.5);
    }
    const measure=(age&15)===0;
    let out=0;if(measure){load.fill(0);loadHigh.fill(0);}
    for(let b=0;b<bands;b++){
      const body=plan.bands[b],ports=material.ports[b];
      for(let j=0;j<n;j++){
        const k=b*n+j;let input=0,feed=0;
        if(driven)for(let i=0;i<n;i++){
          const ij=i*n+j;
          input+=ports.harmonic[ij]*harmonic[i]+ports.impulse[ij]*impulse[i]+ports.friction[ij]*friction[i];
          const intensity=1+material.sources[i].hardness*(expression-.5)*(b*.42-.4);
          feed+=ports.sustain[ij]*excitation[i]*(1+feedback[i]*ports.response[ij])*intensity;
          feed+=ports.friction[ij]*contact[i]*(b===0?.005:.065)*(1-feedback[i]*.5);
        }
        const r=modalR[k],q=modalI[k];modalR[k]=r*cos[k]-q*sin[k];modalI[k]=r*sin[k]+q*cos[k];
        // Collective modal sustain is fed by the source/body transfer matrix.
        // It shares the mode state and stops as soon as Carrier excitation stops.
        input=(input*.0032+modalR[k]*feed*.0014)*48000/sr;
        const a=real[k]*damp[k]+input,c=imag[k]*damp[k];
        real[k]=(a*cos[k]-c*sin[k])*mask[k];imag[k]=(a*sin[k]+c*cos[k])*mask[k];
        out+=real[k]*body.pickup[j];
      }
      if(measure)for(let i=0;i<n;i++){
        let r=0,q=0;for(let j=0;j<n;j++){const v=body.vectors[i*n+j];r+=v*real[b*n+j];q+=v*imag[b*n+j];}
        const energy=Math.sqrt(r*r+q*q);
        load[i]+=energy/bands;if(b>=2)loadHigh[i]+=energy/(bands-2);
      }
    }
    out*=gain*envelope*curveAt(contour,age/Math.max(1,gateFrames),1)*.16/Math.max(1,Math.sqrt(n));
    if(!Number.isFinite(out)){faults++;ended=true;return 0;}
    peakState=Math.max(peakState,Math.abs(out));
    // Safety affects only outliers, leaving ordinary timbre unsaturated.
    if(Math.abs(out)>.8)out=Math.sign(out)*(.8+.16*Math.tanh((Math.abs(out)-.8)/.16));
    const dc=out-dcX+dcPole*dcY;dcX=out;dcY=dc;
    lp1+=lp*(dc-lp1);lp2+=lp*(lp1-lp2);age++;
    // DC removal can transiently overshoot the preceding guard. This last
    // bounded knee is dormant at the calibrated operating level.
    return Math.abs(lp2)<=.9?lp2:Math.sign(lp2)*(.9+.08*Math.tanh((Math.abs(lp2)-.9)/.08));
  }
  function process(left,right,start=0,frames=left.length-start,accumulate=false){
    for(let i=start;i<start+frames;i++){sample();const value=sample();if(accumulate){left[i]+=value;if(right&&right!==left)right[i]+=value;}else{left[i]=value;if(right&&right!==left)right[i]=value;}}
    return !ended;
  }
  return {process,noteOff,setFrequency,setExcitation,get ended(){return ended;},snapshot:()=>({ageFrames:Math.floor(age/2),frequency:root,targetFrequency:target,released,ended,faults,peakInternal:peakState,materialLoad:Array.from(memory),expression})};
}

// Open modal body: the source, resonant lifetime and two pickup perspectives
// share one immutable graph. Only oscillator/filter state is owned per voice.
function createOpenNodalVoice(plan,options={},sampleRate=48000) {
  const limit=(v,a,b)=>Math.max(a,Math.min(b,v)),tau=Math.PI*2;
  let hz,velocity,gain,duration,volume,pitch,attack,release,gate,held;
  if(!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000)throw Error('Invalid sample rate');
  const n=plan.nodes.length,size=n*3,sr=sampleRate,m=plan.material;
  const real=new Float64Array(size),imag=new Float64Array(size),oscR=new Float64Array(size),oscI=new Float64Array(size),cs=new Float64Array(size),sn=new Float64Array(size),damp=new Float64Array(size),mask=new Float64Array(size);
  const sourcePhase=new Float64Array(n),sourceStep=new Float64Array(n),mips=new Int8Array(n),mipMix=new Float64Array(n),noise=new Uint32Array(size),noiseLow=new Float64Array(size),dryLow=new Float64Array(n),dryMask=new Float64Array(n);
  const levels=[1,2,4,8,16,32],tableSize=1024;
  // Packed immutable modal coefficients: no band/node object traversal inside
  // the sample recurrence. Preserve the original accumulation order exactly.
  const toneDrive=new Float64Array(size),impulseDrive=new Float64Array(size),breathDrive=new Float64Array(size),pickup=new Float64Array(size),sidePickup=new Float64Array(size),bandWeight=new Float64Array(size),oneMinusDamp=new Float64Array(size);
  for(let b=0;b<3;b++)for(let j=0;j<n;j++){
    const k=b*n+j,band=plan.bands[b];toneDrive[k]=band.drives[0][j];impulseDrive[k]=band.drives[1][j];breathDrive[k]=band.drives[2][j];
    pickup[k]=band.pickup[j];sidePickup[k]=band.side[j];bandWeight[k]=plan.bandWeights[b];
  }
  const initialNoise=new Uint32Array(size),initialR=new Float64Array(size),initialI=new Float64Array(size),initialPhase=new Float64Array(n);
  for(let k=0;k<size;k++){damp[k]=Math.exp(-plan.bands[Math.floor(k/n)].decayRates[k%n]/sr);oneMinusDamp[k]=1-damp[k];}
  for(let i=0;i<n;i++)initialPhase[i]=(plan.nodes[i].excitationSeed%4096)/4096;
  function seedState(seed,outNoise,outR,outI){
    for(let k=0;k<size;k++){
      outNoise[k]=(Math.imul((plan.nodes[k%n]?.excitationSeed??913)^seed^(k+1),2654435761)>>>0)||1;
      const a=(outNoise[k]%65536)/65536*tau;outR[k]=Math.cos(a);outI[k]=Math.sin(a);
    }
  }
  seedState(plan.seed>>>0,initialNoise,initialR,initialI);
  const tail=Math.round(plan.tailSec*sr);
  let root=0,target=0,age=0,released=false,releaseAge=0,lastEnvelope=0,releaseLevel=0,ended=plan.silent,faults=0,peakInternal=0,lastL=0,lastR=0;
  let dcXL=0,dcYL=0,dcXR=0,dcYR=0,lpL=0,lpR=0;
  const lp=1-Math.exp(-tau*sampleRate*.38/sr);
  function curve(c,t,fallback){if(!c?.length)return fallback;const x=limit(t,0,1)*(c.length-1),i=Math.floor(x);return c[i]+(c[Math.min(i+1,c.length-1)]-c[i])*(x-i);}
  function coefficients(){
    const fundamental=root*Math.pow(2,curve(pitch,age/Math.max(1,gate),0)/12);
    for(let b=0;b<3;b++)for(let j=0;j<n;j++){
      const k=b*n+j,relative=fundamental*plan.bands[b].frequencies[j];
      const f=b===0?relative:Math.exp(Math.log(relative)*m.follow+Math.log(plan.referenceHz*plan.bands[b].frequencies[j])*(1-m.follow))*Math.pow(2,m.register??0);
      cs[k]=Math.cos(tau*f/sr);sn[k]=Math.sin(tau*f/sr);mask[k]=limit((sr*.47-f)/(sr*.06),0,1);
    }
    for(let i=0;i<n;i++){
      const f=fundamental*plan.nodes[i].ratio*plan.nodes[i].partials[0];sourceStep[i]=f/sr;dryMask[i]=limit((sr*.47-f)/(sr*.06),0,1);
      const budget=Math.max(1,sr*.41/Math.max(1,f));let idx=0;while(idx<5&&levels[idx+1]<=budget)idx++;
      mips[i]=Math.max(0,idx-1);mipMix[i]=0;
      // Crossfade only between banks whose largest partial stays below Nyquist.
      if(idx>0)mipMix[i]=limit((budget-levels[idx])/levels[idx],0,1);
    }
  }
  function reset(next={}) {
    const f=next.frequency??plan.referenceHz,v=next.velocity??.7,g=next.gain??.7,d=next.durationSec??plan.articulation.durationSec;
    if(!Number.isFinite(f)||f<5||f>12000||!Number.isFinite(v)||v<0||v>1||!Number.isFinite(g)||g<0||g>1||!Number.isFinite(d)||d<.02||d>30)throw Error('Invalid Nodal note');
    for(const k of ['attackSec','releaseSec'])if(next[k]!=null&&(!Number.isFinite(next[k])||next[k]<0||next[k]>3))throw Error('Invalid note fade');
    const vol=next.volumeCurve??plan.articulation.volumeCurve,pit=next.pitchCurve??plan.articulation.pitchCurve;
    for(const c of [vol,pit])if(c&&(!Array.isArray(c)||c.length>512||!c.every(Number.isFinite)))throw Error('Invalid note contour');
    hz=f;velocity=v;gain=g;duration=d;volume=vol;pitch=pit;
    attack=Math.max(1,Math.round((next.attackSec??plan.articulation.attackSec)*sr));
    release=Math.max(1,Math.round((next.releaseSec??plan.articulation.releaseSec)*sr));
    gate=Math.round(duration*sr);held=next.held===true;
    real.fill(0);imag.fill(0);noiseLow.fill(0);dryLow.fill(0);sourcePhase.set(initialPhase);
    const seed=(next.seed??plan.seed)>>>0;
    if(seed===(plan.seed>>>0)){noise.set(initialNoise);oscR.set(initialR);oscI.set(initialI);}
    else seedState(seed,noise,oscR,oscI);
    root=target=hz;age=0;released=false;releaseAge=0;lastEnvelope=0;releaseLevel=0;ended=plan.silent;faults=0;peakInternal=0;lastL=lastR=0;
    dcXL=dcYL=dcXR=dcYR=lpL=lpR=0;
    coefficients();return true;
  }
  reset(options);
  function noteOff(){if(!released){released=true;releaseAge=0;releaseLevel=lastEnvelope;}}
  function setFrequency(f){if(!Number.isFinite(f)||f<5||f>12000)return false;target=f;return true;}
  function random(k){let z=noise[k];z^=z<<13;z^=z>>>17;z^=z<<5;noise[k]=z>>>0;return noise[k]/2147483648-1;}
  function sample(){
    if(ended){lastL=lastR=0;return;}
    if(!released&&(age>=sr*30||(!held&&age>=gate)))noteOff();
    if((age&15)===0&&(pitch||Math.abs(target-root)>1e-8)){root*=Math.pow(target/root,1-Math.exp(-16/(sr*.006)));coefficients();}
    const on=Math.min(1,age/attack),releaseGain=released?Math.max(0,1-releaseAge/release):1;
    const tailGain=released&&tail>0?Math.min(1,Math.max(0,(tail-releaseAge)/(sr*.035))):0;
    const bodyEnvelope=released?releaseLevel*((1-m.natural)*releaseGain+m.natural*tailGain):on;
    const dryEnvelope=released?releaseLevel*releaseGain:on;
    lastEnvelope=on;
    if(released&&releaseAge>=Math.max(release,tail)){ended=true;lastL=lastR=0;return;}
    let body=0,side=0,dry=0,drySide=0;
    const level=plan.excitation.level*velocity;
    for(let k=0;k<size;k++){
      let input=0;
      if(!released){
        const r=oscR[k],im=oscI[k];oscR[k]=r*cs[k]-im*sn[k];oscI[k]=r*sn[k]+im*cs[k];
        input=toneDrive[k]*oscR[k]*oneMinusDamp[k]*1.6;
        if(age<sr*.004)input+=impulseDrive[k]*Math.exp(-age/(sr*.0008))*.035;
        if(breathDrive[k]){noiseLow[k]+=.16*(random(k)-noiseLow[k]);input+=breathDrive[k]*noiseLow[k]*.012;}
        input*=level*bandWeight[k];
      }
      const a=real[k]*damp[k]+input,q=imag[k]*damp[k];real[k]=(a*cs[k]-q*sn[k])*mask[k];imag[k]=(a*sn[k]+q*cs[k])*mask[k];
      peakInternal=Math.max(peakInternal,Math.abs(real[k]));
      body+=real[k]*pickup[k];side+=real[k]*sidePickup[k];
    }
    if(dryEnvelope>0)for(let i=0;i<n;i++){
      const p=plan.nodes[i];let value=0;
      if(p.kind==='tone'){
        sourcePhase[i]=(sourcePhase[i]+sourceStep[i])%1;
        const x=sourcePhase[i]*tableSize,k=Math.floor(x),fraction=x-k,idx=mips[i];
        const a=p.bank[idx],b=p.bank[Math.min(5,idx+1)],v=a[k]+(a[k+1]-a[k])*fraction,w=b[k]+(b[k+1]-b[k])*fraction;
        value=(v+(w-v)*mipMix[i])*dryMask[i];
      } else if(!released){
        const r=random(i);dryLow[i]+=(.03+p.brightness*.2)*(r-dryLow[i]);
        value=p.kind==='breath'?dryLow[i]*1.8:dryLow[i]*Math.exp(-age/(sr*.002))*5;
      }
      const local=value*p.excitation*p.pickup*level*.4;
      dry+=local;drySide+=local*(p.x-.5)*m.width*1.6;
    }
    const amplitude=gain*curve(volume,Math.min(1,age/Math.max(1,gate)),1)/Math.max(1,Math.sqrt(n));
    const mid=(body*m.body*bodyEnvelope+dry*(1-m.body)*dryEnvelope)*amplitude;
    const spread=(side*m.body*bodyEnvelope+drySide*(1-m.body)*dryEnvelope)*amplitude;
    let l=mid-spread,r=mid+spread;
    if(!Number.isFinite(l)||!Number.isFinite(r)){faults++;ended=true;lastL=lastR=0;return;}
    l=Math.tanh(l);r=Math.tanh(r);
    const dl=l-dcXL+.9995*dcYL,dr=r-dcXR+.9995*dcYR;dcXL=l;dcXR=r;dcYL=dl;dcYR=dr;
    lpL+=lp*(dl-lpL);lpR+=lp*(dr-lpR);lastL=lpL;lastR=lpR;
    if(released)releaseAge++;age++;
  }
  function process(left,right,start=0,frames=left.length-start,accumulate=false){
    for(let i=start;i<start+frames;i++){sample();const mono=(lastL+lastR)*.5;
      if(right&&right!==left){if(accumulate){left[i]+=lastL;right[i]+=lastR;}else{left[i]=lastL;right[i]=lastR;}}
      else if(accumulate)left[i]+=mono;else left[i]=mono;
    }return !ended;
  }
  return {process,reset,noteOff,setFrequency,get ended(){return ended;},get released(){return released;},snapshot:()=>({ageFrames:age,frequency:root,targetFrequency:target,released,ended,faults,peakInternal,engine:'coupled-modal-v2'})};
}

  const TWO_PI = Math.PI * 2;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  function hash(text, seed) { let h = seed >>> 0; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0 || 1; }
  // Original coupled-modal synthesis from Emilia 1/2; a bounded offline lease
  // is the only opt-in extension needed by the Carrier renderer.
  function voice(plan, options = {}, sampleRate = 48000) {
    if (plan?.kernelVersion === 'coupled-modal-v2') return createOpenNodalVoice(plan, options, sampleRate);
    if ([2,3,4].includes(plan?.emiliaWeave?.version)) return createEmiliaWeaveVoice(plan, options, sampleRate);
    if (plan?.emiliaMaterial?.version === 1) return createEmiliaMaterialVoice(plan, options, sampleRate);
    if (plan?.schema !== 'xensonar.nodal-plan' || plan.kernelVersion !== 'coupled-modal-v1') throw new Error('Invalid Nodal plan');
    if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new Error('Invalid sample rate');
    let frequency,velocity,held,duration,gain,attack,volumeCurve,pitchCurve,release,gateFrames,watchdogFrames;
    const n = plan.nodes.length, size = n * 3, oversampling = plan.nonlinearNodes.length ? 2 : 1, sr = sampleRate * oversampling;
    const real = new Float64Array(size), imag = new Float64Array(size), deltas = new Float64Array(n), sources = new Float64Array(n);
    const cos = new Float64Array(size), sin = new Float64Array(size), mask = new Float64Array(size), damping = new Float64Array(size);
    const timbreEnv=new Float64Array(n),timbreStep=new Float64Array(n);
    const harmonicMasks=new Float64Array(n*6),modeOscR=new Float64Array(size),modeOscI=new Float64Array(size);
    const phase = new Float64Array(n), noise = new Uint32Array(n), noiseLow = new Float64Array(n), phaseCos = new Float64Array(n), phaseSin = new Float64Array(n);
    const oscReal = new Float64Array(n), oscImag = new Float64Array(n);
    let root = 0, targetRoot = 0, age = 0, released = false, releaseAge = 0, releaseLevel = 1, ended = plan.silent;
    let lastEnvelope = 0, dcX = 0, dcY = 0, lp1 = 0, lp2 = 0, controlCounter = 0, faults = 0;
    // Two cascaded one-pole filters at the oversampled rate precede decimation.
    const lp = 1 - Math.exp(-TWO_PI * sampleRate * .34 / sr);
    const initialNoise=new Uint32Array(n),initialPhase=new Float64Array(n),initialR=new Float64Array(n),initialI=new Float64Array(n);
    const initialModeR=new Float64Array(size),initialModeI=new Float64Array(size);
    for(let k=0;k<size;k++){initialModeR[k]=Math.cos(k*2.3999632297);initialModeI[k]=Math.sin(k*2.3999632297);}
    for(let i=0;i<n;i++){
      initialNoise[i]=hash(plan.nodes[i].id,plan.seed>>>0);initialPhase[i]=(initialNoise[i]%4096)/4096*TWO_PI;
      initialR[i]=Math.cos(initialPhase[i]);initialI[i]=Math.sin(initialPhase[i]);
      const profile=plan.emiliaExcitation?.[i];timbreStep[i]=profile?.transientSec?Math.exp(-1/(sr*profile.transientSec)):1;
    }
    for(let band=0;band<3;band++)for(let j=0;j<n;j++)damping[band*n+j]=Math.exp(-plan.bands[band].decayRates[j]/sr);
    function coefficients() {
      const pitchedRoot = root * Math.pow(2, curveAt(pitchCurve, Math.min(1, age / Math.max(1, gateFrames)), 0) / 12);
      for (let band = 0; band < 3; band++) for (let i = 0; i < n; i++) {
        const k = band * n + i, pitchedHz = pitchedRoot * plan.bands[band].frequencies[i];
        const fixed=plan.emiliaFixedModes?.[band]?.[i];
        const hz=fixed&&fixed.mix>0?Math.exp(Math.log(pitchedHz)*(1-fixed.mix)+Math.log(fixed.hz)*fixed.mix):pitchedHz;
        const a = TWO_PI * hz / sr; cos[k] = Math.cos(a); sin[k] = Math.sin(a);
        mask[k] = clamp((sampleRate * .47 - hz) / (sampleRate * .08), 0, 1);
      }
      for (let i = 0; i < n; i++) { const baseHz=pitchedRoot * plan.nodes[i].ratio * plan.nodes[i].partials[0]; const a=TWO_PI*baseHz/sr; phaseCos[i]=Math.cos(a); phaseSin[i]=Math.sin(a);
        if(plan.emiliaExcitation?.[i])for(let harmonic=1;harmonic<=6;harmonic++){
          harmonicMasks[i*6+harmonic-1]=clamp((sr*.45-baseHz*harmonic)/(sr*.09),0,1);
        }
      }
    }
    function curveAt(curve, position, fallback) {
      if (!curve?.length) return fallback;
      const point = clamp(position, 0, 1) * (curve.length - 1), index = Math.floor(point), next = Math.min(index + 1, curve.length - 1);
      return curve[index] + (curve[next] - curve[index]) * (point - index);
    }
    function reset(next={}) {
      const f=next.frequency??220,v=next.velocity??.7;
      if(!Number.isFinite(f)||f<5||f>12000)throw new Error('Invalid note frequency');
      if(!Number.isFinite(v)||v<0||v>1)throw new Error('Invalid velocity');
      if(next.durationSec!=null&&(!Number.isFinite(next.durationSec)||next.durationSec<.02||next.durationSec>30))throw new Error('Invalid note duration');
      if(next.gain!=null&&(!Number.isFinite(next.gain)||next.gain<0||next.gain>1))throw new Error('Invalid note gain');
      for(const key of ['attackSec','releaseSec'])if(next[key]!=null&&(!Number.isFinite(next[key])||next[key]<0||next[key]>3))throw new Error('Invalid note fade');
      const vol=next.volumeCurve??plan.articulation.volumeCurve,pit=next.pitchCurve??plan.articulation.pitchCurve;
      for(const c of [vol,pit])if(c&&(!Array.isArray(c)||c.length>512||!c.every(Number.isFinite)))throw new Error('Invalid note contour');
      frequency=f;velocity=v;held=next.held===true;duration=clamp(next.durationSec??plan.articulation.durationSec,.02,30);
      gain=clamp(next.gain??.7,0,1);attack=Math.max(1,Math.round(clamp(next.attackSec??plan.articulation.attackSec,.001,2)*sr));
      release=Math.max(1,Math.round(clamp(next.releaseSec??plan.articulation.releaseSec,.001,3)*sr));
      volumeCurve=vol;pitchCurve=pit;gateFrames=Math.round(duration*sr);
      const lease=next.offlineDurationSec;watchdogFrames=Math.round((Number.isFinite(lease)&&lease>0&&lease<=601?lease:30)*sr);
      real.fill(0);imag.fill(0);deltas.fill(0);sources.fill(0);noiseLow.fill(0);timbreEnv.fill(1);
      modeOscR.set(initialModeR);modeOscI.set(initialModeI);
      const seed=(next.seed??plan.seed)>>>0;
      if(seed===(plan.seed>>>0)){noise.set(initialNoise);phase.set(initialPhase);oscReal.set(initialR);oscImag.set(initialI);}
      else for(let i=0;i<n;i++){
        noise[i]=hash(plan.nodes[i].id,seed);phase[i]=(noise[i]%4096)/4096*TWO_PI;oscReal[i]=Math.cos(phase[i]);oscImag[i]=Math.sin(phase[i]);
      }
      root=targetRoot=frequency;age=0;released=false;releaseAge=0;releaseLevel=1;ended=plan.silent;
      lastEnvelope=dcX=dcY=lp1=lp2=controlCounter=faults=0;
      coefficients();return true;
    }
    reset(options);
    function noteOff() { if (!released) { released = true; releaseAge = 0; releaseLevel = lastEnvelope; } }
    function setFrequency(hz) { if (!Number.isFinite(hz) || hz < 5 || hz > 12000) return false; targetRoot = hz; return true; }
    function sample() {
      if (ended) return 0;
      if (!released && (age >= watchdogFrames || (!held && age >= gateFrames))) noteOff();
      if ((controlCounter++ & 15) === 0 && (pitchCurve || Math.abs(targetRoot - root) > 1e-8)) {
        if (Math.abs(targetRoot - root) > 1e-8) root *= Math.pow(targetRoot / root, 1 - Math.exp(-16 / (sr * .006))); coefficients();
      }
      let envelope = Math.min(1, age / attack);
      if (released) { envelope = releaseLevel * Math.max(0, 1 - releaseAge / release); if (releaseAge++ >= release) { ended = true; return 0; } }
      lastEnvelope = envelope;
      const driven = !released && (plan.excitation.kind !== 'impulse' || age < sr * .004);
      if (driven) for (let i = 0; i < n; i++) {
        const program = plan.nodes[i]; let source = 0;
        if (plan.excitation.kind === 'tone') {
          const r = oscReal[i], q = oscImag[i]; oscReal[i] = r * phaseCos[i] - q * phaseSin[i]; oscImag[i] = r * phaseSin[i] + q * phaseCos[i];
          // Emilia-only material excitation. Relationship-shaped harmonic drive
          // feeds the SAME modal eigenmodes as the original source, rather than
          // piling a parallel oscillator/effect on the output.
          const color = plan.emiliaExcitation?.[i];
          if (color?.partials) {
            // Six bandlimited Chebyshev partials excite the existing modal
            // body. Their strengths come from geometry, not the played pitch.
            const c=oscReal[i],partials=color.partials;
            let prev=1,now=c,excited=partials[0]*c*harmonicMasks[i*6];
            for(let h=2;h<=partials.length;h++){
              const next=2*c*now-prev;prev=now;now=next;
              excited+=partials[h-1]*next*harmonicMasks[i*6+h-1];
            }
            const sustain=color.sustain+(1-color.sustain)*timbreEnv[i];
            timbreEnv[i]*=timbreStep[i];
            source=excited*color.scale*sustain*.0018*48000/sr;
          } else if (color) {
            const c1=oscReal[i],c2=2*c1*c1-1,c3=(4*c1*c1-3)*c1;
            source = (c1+color.second*c2+color.third*c3)*color.scale*.0018*48000/sr;
          } else source = oscReal[i] * .0018 * 48000 / sr;
          if (age < sr * .002) source += Math.cos(phase[i]) * .04 * 48000 / sr * Math.exp(-age / (sr * .0006));
        } else {
          let z = noise[i]; z ^= z << 13; z ^= z >>> 17; z ^= z << 5; noise[i] = z >>> 0;
          const rnd = noise[i] / 2147483648 - 1;
          noiseLow[i] += (.03 + program.brightness * .25) * (rnd - noiseLow[i]);
          source = plan.excitation.kind === 'breath' ? noiseLow[i] * .008 * 48000 / sr : noiseLow[i] * .24 * 48000 / sr * Math.exp(-age / (sr * .001));
        }
        sources[i] = source * program.excitation * plan.excitation.level * velocity;
      }
      let out = 0;
      for (let band = 0; band < 3; band++) {
        const basis = plan.bands[band].vectors, offset = band * n, level = band === 0 ? 1 : band === 1 ? .22 : .08;
        for (let j = 0; j < n; j++) {
          let input = 0;
          if (driven) for (let i = 0; i < n; i++) input += basis[i * n + j] * sources[i] * level;
          const k = offset + j;
          if (plan.emiliaModeDrive?.[band]?.[j]) {
            // Excite the graph's *collective* eigenmode directly; this is still
            // the same physical modal body, not an added post-FX oscillator.
            const r=modeOscR[k],im=modeOscI[k];
            modeOscR[k]=r*cos[k]-im*sin[k];modeOscI[k]=r*sin[k]+im*cos[k];
            if(driven)input+=modeOscR[k]*plan.emiliaModeDrive[band][j]*.0018*48000/sr;
          }
          const r = real[k] * damping[k] + input, q = imag[k] * damping[k];
          real[k] = (r * cos[k] - q * sin[k]) * mask[k]; imag[k] = (r * sin[k] + q * cos[k]) * mask[k];
        }
        // Only nonlinear organs need a local projection. All read the same step state.
        for (const i of plan.nonlinearNodes) {
          let local = 0; for (let j = 0; j < n; j++) local += basis[i * n + j] * real[offset + j];
          const program = plan.nodes[i], drive = 1 + program.strength * 18;
          const shaped = program.role === 'fold' ? Math.sin(local * drive) / drive : Math.tanh(local * drive) / drive;
          deltas[i] = .8 * (shaped - local);
        }
        for (let j = 0; j < n; j++) {
          let correction = 0; for (const i of plan.nonlinearNodes) correction += basis[i * n + j] * deltas[i];
          real[offset + j] += correction;
          out += real[offset + j] * plan.bands[band].pickup[j];
        }
      }
      out *= gain * envelope * curveAt(volumeCurve, Math.min(1, age / Math.max(1, gateFrames)), 1) * 1.8 / Math.max(1, Math.sqrt(n));
      if (!Number.isFinite(out)) { faults++; ended = true; return 0; }
      // Fixed bounded output, DC blocker, anti-alias filtering. No adaptive loudness pumping.
      if(plan.emiliaInputDrive!=null)out *= plan.emiliaInputDrive;
      out = Math.tanh(out);
      const dc = out - dcX + .9995 * dcY; dcX = out; dcY = dc;
      lp1 += lp * (dc - lp1); lp2 += lp * (lp1 - lp2);
      age++;
      return lp2;
    }
    function process(left, right, start = 0, frames = left.length - start, accumulate = false) {
      for (let i = start; i < start + frames; i++) {
        let value = sample(); if (oversampling === 2) value = sample();
        if (accumulate) { left[i] += value; if (right && right !== left) right[i] += value; }
        else { left[i] = value; if (right && right !== left) right[i] = value; }
      }
      return !ended;
    }
    return {process, reset, noteOff, setFrequency, get ended() { return ended; }, snapshot: () => ({ageFrames: Math.floor(age / oversampling), frequency: root, targetFrequency: targetRoot, released, ended, faults})};
  }
  function render(plan, options = {}, sampleRate = 48000) {
    const duration = options.durationSec ?? plan.articulation.durationSec;
    if (!Number.isFinite(duration) || duration < .02 || duration > 30 || !Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new Error('Invalid Nodal render bounds');
    const frames = Math.ceil((duration + Math.max(clamp(options.releaseSec ?? plan.articulation.releaseSec, .001, 3), plan.tailSec ?? 0) + .01) * sampleRate);
    if (frames > sampleRate * 34) throw new Error('Nodal render duration exceeds limit');
    const left = new Float32Array(frames), v = voice(plan, {...options, held: false}, sampleRate);
    if (plan.kernelVersion === 'coupled-modal-v2') { const right = new Float32Array(frames), mono = new Float32Array(frames); v.process(left,right); for(let i=0;i<frames;i++)mono[i]=(left[i]+right[i])*.5; return {pcm:mono,left,right,sampleRate,snapshot:v.snapshot()}; }
    v.process(left); return {pcm: left, sampleRate, snapshot: v.snapshot()};
  }
  return {voice, render};
}
const __XenNodalDSP = createNodalSynthesisKernel();
