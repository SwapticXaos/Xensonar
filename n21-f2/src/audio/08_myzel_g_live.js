/* MYZEL G live bridge: the twelve ORIGINAL resident organ names drive a
   history of at most three serial processors; later residents remain pitches.
   No ball events allocate AudioNodes, schedule struck voices or queue notes. */
function myzelGClamp(x,lo=0,hi=1){return Math.max(lo,Math.min(hi,Number.isFinite(x)?x:lo));}
const MYZEL_G_ORGANS=Object.freeze({resonator:'resonator',formant_filter:'formant_filter',spectral_tilt:'spectral_tilt',
  wavefolder:'wavefolder',sub_harmonic:'sub_harmonic',shimmer_delay:'shimmer_delay',comb_filter:'comb_filter',
  grain_blur:'grain_blur',drive:'drive',chorus:'chorus',bitcrusher:'bitcrusher'});
const MYZEL_G_TAILS=Object.freeze({resonator:2.2,formant_filter:1.35,spectral_tilt:1.15,wavefolder:1.2,
  sub_harmonic:1.7,shimmer_delay:2.45,comb_filter:2.0,grain_blur:1.65,drive:1.35,chorus:2.1,bitcrusher:1.1});
function myzelGCreate(ctx,refs,destination){
  if(refs.__myzelG?.ctx===ctx)return refs;
  refs.__myzelG?.dispose();
  const nodes=[],sources=[];
  const own=n=>(nodes.push(n),n);
  const gain=v=>{let n=own(ctx.createGain());n.gain.value=v;return n;};
  const osc=(type)=>{let n=own(ctx.createOscillator());n.type=type;sources.push(n);return n;};
  const output=gain(0), hp=own(ctx.createBiquadFilter()), compressor=own(ctx.createDynamicsCompressor());
  hp.type='highpass';hp.frequency.value=32;compressor.threshold.value=-12;compressor.knee.value=12;
  compressor.ratio.value=3.1;compressor.attack.value=.008;compressor.release.value=.18;
  output.connect(hp);hp.connect(compressor);compressor.connect(destination);
  // Fixed audible fallback for browsers where loading any AudioWorklet fails.
  const fallbackGain=gain(.54),fallFilter=own(ctx.createBiquadFilter());
  fallFilter.type='lowpass';fallFilter.frequency.value=1900;fallFilter.Q.value=.64;
  fallbackGain.connect(fallFilter);fallFilter.connect(output);
  const voices=[['triangle',1,0],['triangle',1,0],['triangle',1,0],['sine',1,0]].map(([type,ratio,level])=>{
    const oscillator=osc(type),amp=gain(level);oscillator.connect(amp);amp.connect(fallbackGain);return {oscillator,amp,ratio};
  });
  const engine={ctx,output,fallFilter,fallbackGain,voices,nodes,sources,disposed:false,
    history:[],candidate:null,candidateSince:0,lastUpdate:ctx.currentTime,lastMessage:-Infinity,
    worklet:null,lastControls:null,error:null,active:false,
    dispose(){this.disposed=true;try{this.worklet?.port.close()}catch{}for(const x of sources)try{x.stop()}catch{}for(const n of nodes)try{n.disconnect()}catch{}}};
  refs.__myzelG=engine;
  for(const v of voices)v.oscillator.start();
  engine.ready=myzelGPrepareWorklet(engine).catch(err=>{
    engine.error=String(err?.message??err);console.warn('[myzel-g2] AudioWorklet fallback:',engine.error);return false;
  });
  return refs;
}
function myzelGGesture(engine, s, now, dt, couplingEnabled, frame, decay=.72) {
  const c=myzelGClamp, memoryScale=.3+c(decay)*1.2;
  frame=frame||myzelGSpatialFrame(s,220);
  const fallbackType=s.myzelNearestIsCustomResident?null:(s.myzelNearestModuleTypes||[]).find(t=>MYZEL_G_ORGANS[t]);
  const fallback={id:s.nearestNodeId??s.nearestNodeLabel,type:fallbackType,frequency:s.nearestNodeFreq,
    weight:c(1-(s.ballToNearestNodeNormDist??1))*.72+c(s.myzelNearestAuraStrength)*.28,amount:.85,x:.5,y:.5,memory:1.7,coupling:0};
  const hasSpatial=Array.isArray(s.myzelAudioNodes);
  const candidates=hasSpatial?frame.organs:(fallbackType?[fallback]:[]);
  const newest=engine.history.at(-1),best=candidates[0];
  const current=candidates.find(n=>n.id===newest?.key);
  const candidate=current&&best?.id!==current.id&&best.weight<current.weight*1.16?current:best;
  const contact=couplingEnabled?c(candidate?.weight??(hasSpatial?0:fallback.weight)):0;
  if(!couplingEnabled){engine.history.length=0;engine.candidate=null;return {stages:[],contact:0};}
  if(candidate?.id&&MYZEL_G_ORGANS[candidate.type]&&contact>.12){
    if(newest?.key===candidate.id){Object.assign(newest,candidate,{key:candidate.id,touched:now,power:contact});engine.candidate=null;}
    else if(engine.candidate!==candidate.id){engine.candidate=candidate.id;engine.candidateSince=now;}
    else if(now-engine.candidateSince>=(engine.history.length?.105:0)){
      engine.history=engine.history.filter(n=>n.key!==candidate.id);
      engine.history.push({...candidate,key:candidate.id,touched:now,power:contact});
      engine.history=engine.history.slice(-3);engine.candidate=null;
    }
  }else engine.candidate=null;
  // Deleted or muted original organs leave the audible route by the same crossfade.
  if(hasSpatial)engine.history=engine.history.filter(h=>{const node=s.myzelAudioNodes.find(n=>String(n.id)===h.key);return node&&!node.muted&&!node.isCustomResident;});
  // Old organs follow live node edits as well; drag does not recreate their DSP state.
  for(const h of engine.history){const node=(s.myzelAudioNodes||[]).find(n=>String(n.id)===h.key);
    if(node){h.type=node.config?.modules?.[0]?.type??h.type;h.frequency=node.frequency;h.x=c(node.x/(s.myzelAudioWidth||1000));h.y=c(node.y/(s.myzelAudioHeight||600));
      h.memory=.28+h.y*2.8;h.amount=c(node.config?.modules?.[0]?.intensity??h.amount);}}
  engine.history=engine.history.filter(n=>now-n.touched<Math.max(.9,(n.memory??1.7)*memoryScale*2.5)).slice(-3);
  const stages=engine.history.map(n=>{
    const age=Math.max(0,now-n.touched),tail=(n.memory??1.7)*memoryScale;
    const weight=Math.exp(-age/tail)*c(n.power);
    return {id:n.key,type:n.type,frequency:c(n.frequency,35,8000),strength:c(weight*(.45+c(n.amount)*.5)),
      x:n.x,y:n.y,memory:tail,coupling:frame.density};
  });
  return {stages,contact};
}
function myzelGUpdate(ctx,refs,request){
  const g=refs.__myzelG;if(!g||g.ctx!==ctx||g.disposed)return;
  const now=ctx.currentTime,c=myzelGClamp,dt=c(now-g.lastUpdate,0,.25);g.lastUpdate=now;
  const active=!!(request.enabled&&request.mode==='installation'&&request.audible!==false);
  const set=(param,value,seconds=.08)=>param.setTargetAtTime(value,now,seconds);
  if(!active){
    if(g.active){g.active=false;set(g.output.gain,0,.06);g.history.length=0;g.candidate=null;g.gestureEnergy=0;
      g.lastControls={active:0,rootLevel:0,ballLevel:0,nodeLevel:0,stages:[]};g.worklet?.port.postMessage(g.lastControls);}
    refs.activeNodeKey=null;refs.activeNodeLabel=null;refs.activeNodeFreq=0;return;
  }
  // Gate before spatial work. Only the freshest snapshot is used; no catch-up queue.
  if(now-g.lastMessage<.03&&g.active)return;
  const reset=!g.active;if(reset){g.active=true;g.previousContact=0;g.gestureEnergy=0;}
  const s=request.snapshot||{},mix=request.mix||{},root=c(request.rootHz,35,8000),frame=myzelGSpatialFrame(s,root);
  const rootLevel=c(mix.rootLevel??.62),ballLevel=c(mix.ballLevel??.34),nodeLevel=c(mix.nodeLevel??.78);
  const {stages,contact}=myzelGGesture(g,s,now,dt,request.couplingEnabled,frame,c(mix.decay??.72));
  const motion=c((s.myceliumBallSpeed??0)/13),delta=Math.max(0,contact-(g.previousContact??0));g.previousContact=contact;
  const step=Math.max(.03,now-(g.lastMessage>0?g.lastMessage:now-.03));
  const gestureGoal=c(motion*.85+delta*3.5);
  g.gestureEnergy=gestureGoal+(g.gestureEnergy-gestureGoal)*Math.exp(-step/(.18+frame.retention*.8));
  const tone=frame.tone,neighbour=frame.neighbour;
  const hasSpatial=Array.isArray(s.myzelAudioNodes);
  const presence=request.couplingEnabled?c(tone?.weight??(hasSpatial?0:contact)):0;
  const frequency=c(tone?.frequency??(hasSpatial?root:s.nearestNodeFreq??root),35,8000);
  const neighbourFrequency=c(neighbour?.frequency??frequency,35,8000);
  const level=(rootLevel+ballLevel+nodeLevel)>0?.72:0;
  const controls={active:1,reset,root,frequency,neighbourFrequency,presence,
    neighbour:request.couplingEnabled?c(neighbour?.weight??0):0,motion,
    brightness:c(s.myzelLocalBrightness??.5),tension:c(s.myzelRelationTension??s.constellationTension??0),
    body:c(s.myzelLocalBody??.6),roughness:c(s.myzelLocalRoughness??0),pan:c((s.cursorNormalizedX??.5)*2-1,-.8,.8),
    rootLevel,ballLevel,nodeLevel,level,gesture:c(g.gestureEnergy),stages,
    density:frame.density,spread:frame.spread,hollow:frame.hollow,bloom:frame.bloom,
    openness:frame.openness,retention:frame.retention};
  set(g.output.gain,.85,.075);set(g.fallFilter.frequency,c(frequency*(2+frame.openness*5),150,8500),.1);
  const pitches=[root,root,frequency,neighbourFrequency],levels=[rootLevel*.05,ballLevel*(.006+g.gestureEnergy*.08),nodeLevel*presence*.08,nodeLevel*c(neighbour?.weight??0)*.04];
  g.voices.forEach((v,i)=>{set(v.oscillator.frequency,pitches[i],.065);set(v.amp.gain,levels[i],.065);});
  g.lastControls=controls;g.worklet?.port.postMessage(controls);g.lastMessage=now;
  refs.activeNodeLabel=s.nearestNodeLabel??null;refs.activeNodeKey=s.nearestNodeId??null;refs.activeNodeFreq=frequency;
}
