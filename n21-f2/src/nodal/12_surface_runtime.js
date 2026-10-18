// Read-only arrival estimates in nominal simulation frames. Geometry is only
// a preparation hint; actual collision detection, sound timing and motion stay
// with the field. Linear prediction may be overtaken by drift or another hit.
function nodalImpactPreparationOrder(agents,prediction,baseSpeed,sectorAngle){
  if(!prediction?.state||!Number.isFinite(baseSpeed)||baseSpeed<=0)return agents;
  const field=prediction.state,now=prediction.frameNowMs,enabled=prediction.params?.agentEnabled;
  const rows=agents.slice(0,32).map((agent,index)=>({agent,index,arrival:Infinity}));
  function arrival(agent,wave){
    const x=agent.x-wave.x,y=agent.y-wave.y,r=wave.radius;
    if(![x,y,r,wave.maxRadius].every(Number.isFinite)||wave.life<=0||r>wave.maxRadius+8)return Infinity;
    const vx=Number.isFinite(agent.vx)?agent.vx:0,vy=Number.isFinite(agent.vy)?agent.vy:0;
    const distance=Math.hypot(x,y);if(distance<r-8)return Infinity;
    if(distance<=r+8)return 0;
    const radius=r+8,A=vx*vx+vy*vy-baseSpeed*baseSpeed,B=2*(x*vx+y*vy-radius*baseSpeed),C=x*x+y*y-radius*radius;
    let t=Infinity;
    if(Math.abs(A)<1e-12){if(B<0)t=-C/B;}
    else{
      const discriminant=B*B-4*A*C;
      if(discriminant>=0){
        const q=-.5*(B+(B<0?-1:1)*Math.sqrt(discriminant)),a=q/A,b=q===0?Infinity:C/q;
        if(a>=0)t=a;if(b>=0)t=Math.min(t,b);
      }
    }
    return t<=Math.max(0,(wave.maxRadius+8-r)/baseSpeed)?t:Infinity;
  }
  for(const row of rows){
    const {agent,index}=row;
    if(enabled?.[index]===false||agent.lastHit===Infinity)continue;
    for(const [waves,sector]of [[field.ripples??[],false],[field.sectorPulses??[],true]]){
      // Bound speculative geometry, never the number of actual sounding hits.
      for(let j=Math.max(0,waves.length-16);j<waves.length;j++){
        const wave=waves[j];if(sector&&wave.hitAgents?.includes(index))continue;
        const t=arrival(agent,wave);if(!Number.isFinite(t)||t>=row.arrival)continue;
        if(!sector&&Number.isFinite(now)&&Number.isFinite(agent.lastHit)&&now+t*(1000/60)-agent.lastHit<=400)continue;
        if(sector){
          if(typeof sectorAngle!=='function')continue;
          const angle=Math.atan2(agent.y-wave.y+(agent.vy??0)*t,agent.x-wave.x+(agent.vx??0)*t),direction=sectorAngle(wave.direction);
          const delta=Math.atan2(Math.sin(angle-direction),Math.cos(angle-direction));
          if(!Number.isFinite(delta)||Math.abs(delta)>Math.PI/4)continue;
        }
        row.arrival=t;
      }
    }
  }
  rows.sort((a,b)=>a.arrival-b.arrival||a.index-b.index);
  return rows.map(row=>row.agent);
}
/* Direct Nodal V1/V2 synthesis. Selection owns all preparation. Wave and particle
   share ONE processor and ONE bounded budget; attacks never queue or steal tails. */
function createNodalSurfaceRuntime({library,live,model}) {
  const lanes=new Map(),heldVoices=new Map(),liveVoices=new Map(), routeOwners=new Map();
  // Keyboard owns a selection, while rendering through the existing Wave bus.
  const audioLane=slot=>slot==='keyboard'?'wave':slot;
  let config=null,disposed=false,owner=null,preparedGrid=null,preparedParticleGrid=null,placementState={};
  const isNodal=id=>typeof id==='string'&&id.startsWith('nodal:');
  // DSP units and global voice occupancy have different owners. One actual
  // voice consumes one global ticket; this processor accounts its real DSP class.
  // N20 uses the common measured N7 full-voice price. Natural tails retain
  // their ORIGINAL N5 price; neither running DSP nor physical tickets change.
  function surfaceCost(plan,rate=48000){return nodalLivePlanCosts(plan,rate).attack;}
  function find(id){
    if(!isNodal(id))return null;
    try{return library.list().find(entry=>'nodal:'+entry.id+'@'+entry.revision===id)?.instrument??null;}
    catch{return null;}
  }
  function options(existing=[]){
    // Do not compile every library instrument on React render. The compiler
    // belongs to P2B's asynchronous preparation, not the dropdown.
    let entries=[];try{entries=library.list();}catch{}
    return [...existing,...entries.filter(entry=>entry.instrument?.nodes?.some(n=>!n.muted))
      .map(entry=>({value:'nodal:'+entry.id+'@'+entry.revision,label:'Nodal · '+entry.instrument.name,
        hint:'Direkte Synthese · '+entry.instrument.nodes.length+' Nodes',originLabel:'Nodal Sounddesign'}))];
  }
  // P3C: route/FX graph ownership is staged on the control side. Repeated
  // live notes may compare intent, but must not reconnect an unchanged graph.
  function sameRoute(route,main,aux,context){
    if(!route||route.context!==context||route.main!==main||route.aux.length!==aux.length)return false;
    for(let i=0;i<aux.length;i++)if(route.aux[i]!==aux[i])return false;
    return true;
  }
  function publishRoute(lane,main,aux=[],context=config?.getContext()){
    const key=audioLane(lane);
    if(disposed||!['wave','particle'].includes(key)||!context||!main||!Array.isArray(aux))return false;
    const targets=[];for(const target of aux)if(target&&target!==main&&!targets.includes(target))targets.push(target);
    const previous=routeOwners.get(key);
    const same=sameRoute(previous,main,targets,context);
    if(!same){routeOwners.set(key,{main,aux:targets,context});if(typeof __XenSoundTrace!=='undefined')__XenSoundTrace.mark('fx-route-republished',key,{auxCount:targets.length,mainChanged:previous?.main!==main,contextChanged:previous?.context!==context},context);}
    const route=routeOwners.get(key),player=owner?.context===context?owner.player:null;
    if(player&&(!same||previous?.player!==player)){
      player.route?.(key,route.main,route.aux);
      route.player=player;
    }
    return true;
  }
  function configure(next){config=next;disposed=false;preparedGrid=null;preparedParticleGrid=null;}

  function playerFor(context){
    if(owner?.context===context&&!owner.player?.snapshot?.().disposed)return owner.promise;
    owner?.player?.dispose();
    const current={context,player:null,promise:null};owner=current;
    current.promise=live.createPlayer(context,config.getOutput(context),{
      acquire:(cost,lane)=>!disposed&&owner===current&&(lane==='wave'||lane==='particle')?config.acquire(lane,1,context):null,
      onError:error=>config?.onError?.(error),onEnded:id=>{heldVoices.delete(id);liveVoices.delete(id);}
    },{costForPlan:surfaceCost,tailCostForPlan:(plan,rate)=>nodalLivePlanCosts(plan,rate).tail,maxCost:16,maxVoices:32,tailCostScale:.75,preserveTails:true,prepareOnControl:true,separateLanes:true,sharedCapacity:true,priority:'secondary'}).then(player=>{
      if(disposed||owner!==current){player.dispose();return null;}
      current.player=player;player.placement?.(placementState);return player;
    }).catch(error=>{if(owner===current)owner=null;throw error;});
    return current.promise;
  }
  function releaseSelection(slot){
    const previous=slot?.ready;
    if(previous){previous.player.unpin?.(previous.instrument);slot.ready=null;}
    if(slot){slot.context=null;slot.family=null;slot.gridPrepared=null;}
    if(previous&&!disposed)warmWaveField(previous.context);
  }
  function selectionStatus(lane){
    const slot=lanes.get(lane);
    return slot?{desired:slot.id,active:slot.ready?.id??null,phase:slot.phase??'idle',error:slot.error??null,
      contextReady:!!slot.ready&&slot.context===config?.getContext()&&owner?.player===slot.ready.player}
      :{desired:null,active:null,phase:'idle',error:null,contextReady:false};
  }
  async function select(lane,id){
    if(!['wave','particle','keyboard'].includes(lane))return null;
    let slot=lanes.get(lane);
    if(!slot){slot={id:null,stamp:0,context:null,pending:null,ready:null,phase:'idle',error:null};lanes.set(lane,slot);}
    if(!isNodal(id)){
      slot.id=id;slot.stamp++;slot.pending=null;slot.error=null;slot.phase='idle';releaseSelection(slot);return null;
    }
    const contextAtRequest=config?.getContext(),instrument=find(id);
    if(slot.id===id&&slot.ready?.id===id&&slot.ready.instrument===instrument&&slot.context===contextAtRequest&&owner?.player===slot.ready.player&&!slot.ready.player.snapshot?.().disposed&&(!slot.ready.player.isPrepared||slot.ready.player.isPrepared(instrument)))return slot.ready;
    if(slot.id===id&&slot.pending&&slot.pendingInstrument===instrument&&slot.pendingContext===contextAtRequest)return slot.pending;
    // A previous context cannot keep a playable pin in a newly created processor.
    if(slot.ready&&(slot.ready.context!==contextAtRequest||slot.ready.player.snapshot?.().disposed))releaseSelection(slot);
    slot.id=id;slot.pendingInstrument=instrument;slot.pendingContext=contextAtRequest;
    slot.phase='preparing';slot.error=null;const stamp=++slot.stamp;
    if(!instrument||!config){if(slot.ready?.id===id)releaseSelection(slot);slot.phase='error';slot.error='Nodal instrument unavailable';return null;}
    // Heavy compile + DSP costs are validated when the async player is ready.
    // An earlier menu render must not compile the instrument synchronously.
    const work=(async()=>{
      try{
        await config.ensureReady();
        if(disposed||slot.stamp!==stamp)return null;
        const context=config.getContext();if(!context||context.state!=='running'||context!==contextAtRequest)throw new Error('Audio context not ready');
        const player=await playerFor(context);
        if(!player||disposed||slot.stamp!==stamp||config.getContext()!==context)return null;
        await player.prepare(instrument);
        if(disposed||slot.id!==id||slot.stamp!==stamp||owner?.player!==player||config.getContext()!==context)return null;
        // Pin the new plan BEFORE relinquishing the old plan. A silent active
        // instrument is still selected and must never be evicted by previews.
        player.pin?.(instrument);
        try{
          const route=routeOwners.get(audioLane(lane))??config.prepareRoute?.(audioLane(lane),context);
          publishRoute(lane,route?.main??config.getOutput(context),route?.aux??[],context);
        }catch(error){player.unpin?.(instrument);throw error;}
        const previous=slot.ready;
        slot.context=context;slot.ready={id,instrument,context,player,programKey:player.preparedProgramId?.(instrument)??model.semanticKey?.(instrument)??instrument};slot.family=null;slot.gridPrepared=null;
        slot.phase='ready';slot.error=null;
        if(previous)previous.player.unpin?.(previous.instrument);
        warmWaveField(context);
        return slot.ready;
      }catch(error){
        if(!disposed&&slot.stamp===stamp){slot.phase='error';slot.error=String(error.message??error);}
        return null;
      }
    })();
    slot.pending=work;
    try{return await work;}finally{if(slot.pending===work){slot.pending=null;slot.pendingInstrument=null;slot.pendingContext=null;}}
  }
  async function preview(lane,id,options={},context){
    if(disposed||!config||!['wave','particle','keyboard'].includes(lane)||!isNodal(id)||!context||context.state!=='running'||config.getContext()!==context)return null;
    const instrument=find(id);if(!instrument)return null;
    // The player validates silence/cost after asynchronous preparation. A
    // preview must use that same worker boundary instead of compiling twice.
    const player=await playerFor(context);if(!player||disposed||owner?.player!==player)return null;
    await player.prepare(instrument);
    if(disposed||owner?.player!==player||config.getContext()!==context||typeof options.isCurrent==='function'&&!options.isCurrent())return null;
    const hz=options.frequency;
    if(!Number.isFinite(hz)||hz<5||hz>12000){if(typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('nodal-surface',lane,'invalid-frequency');return null;}
    const route=routeOwners.get(audioLane(lane))??config.prepareRoute?.(audioLane(lane),context);
    publishRoute(lane,route?.main??config.getOutput(context),route?.aux??[],context);
    return player.noteOn(instrument,{frequency:hz,velocity:.8,gain:Math.max(0,Math.min(1,options.gain??.18)),admissionLane:audioLane(lane),mixLane:options.placementLane??lane,agentIndex:options.agentIndex,held:false,
      durationSec:Math.max(.02,Math.min(2,options.durationSec??.25)),seed:instrument.seed},context.currentTime+.008);
  }
  function note(lane,id,options={},context){
    const slot=lanes.get(lane),ready=slot?.ready;
    if(disposed||!isNodal(id)||!ready||slot.id!==id||slot.phase==='idle'||slot.context!==context||context?.state!=='running'||owner?.player!==ready.player){
      if(typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('nodal-surface',lane,!ready?'not-ready':'selection-context',options.startSec,options.traceId);return null;
    }
    const now=context.currentTime;
    if(Number.isFinite(options.requestedAtMs)&&typeof performance!=='undefined'&&performance.now()-options.requestedAtMs>24){if(typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('nodal-surface',lane,'late-request',options.startSec,options.traceId);return null;}
    const start=Number.isFinite(options.startSec)?options.startSec:now+.008;
    if(!Number.isFinite(start)||start<now-.008||start>now+2){if(typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('nodal-surface',lane,'invalid-start',start,options.traceId);return null;}
    const hz=options.frequency;if(!Number.isFinite(hz)||hz<5||hz>12000){if(typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('nodal-surface',lane,'invalid-frequency',start,options.traceId);return null;}
    const gain=Math.max(0,Math.min(1,Number.isFinite(options.gain)?options.gain:.5));
    // The control owner normally published this route during FX/selection changes.
    // Preserve rare event-specific destinations without touching the common graph.
    if(options.output){
      const route=routeOwners.get(audioLane(lane)),aux=(options.auxTargets??[]).filter(Boolean);
      if(!sameRoute(route,options.output,[...new Set(aux.filter(target=>target!==options.output))],context))
        publishRoute(lane,options.output,aux,context);
    }
    if(typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('nodal-surface',lane,'bound',start,options.traceId,{desired:id,active:ready.id});
    const voice=ready.player.noteOn(ready.instrument,{frequency:hz,velocity:.8,gain,admissionLane:audioLane(lane),mixLane:options.placementLane??lane,agentIndex:options.agentIndex,traceId:options.traceId,held:options.held===true,
      durationSec:Number.isFinite(options.durationSec)?Math.max(.02,Math.min(30,options.durationSec)):ready.instrument.articulation.durationSec,
      seed:ready.instrument.seed},start);
    if(voice){if(lane!=='particle'||options.held===true)liveVoices.set(voice.id,voice);if(options.held===true)heldVoices.set(voice.id,{lane,voice});}return voice;
  }
  function warmParticleField(agents,root,context,prediction,baseSpeed,sectorAngle){
    const slot=lanes.get('particle'),ready=slot?.ready;
    if(disposed||!ready||ready.context!==context||owner?.player!==ready.player||!Array.isArray(agents)||!config.resolveParticleFrequency)return false;
    const count=Math.min(32,agents.length),previous=slot.family;
    let same=previous?.ready===ready&&previous.root===root&&previous.ratios.length===count;
    if(same)for(let i=0;i<count;i++)if(previous.ratios[i]!==agents[i].ratio){same=false;break;}
    const newestRipple=prediction?.state?.ripples?.at(-1),newestSector=prediction?.state?.sectorPulses?.at(-1);
    if(same&&(!prediction||ready.player.hasPreparedFrequencies?.(ready.instrument,previous.frequencies)===true))return true;
    // Hint rate limits constrain preparation only. A changed real note always
    // uses its exact incoming Hz, even when no prediction could be prepared.
    const now=context.currentTime;
    if(previous?.ready===ready){
      if(!same&&now-previous.at<.04)return false;
      if(same&&newestRipple===previous.newestRipple&&newestSector===previous.newestSector&&now-previous.at<.12)return true;
    }
    const ratios=[],frequencies=[],resolved=same?previous.resolved:[],byAgent=new Map();
    for(let i=0;i<count;i++){
      ratios.push(agents[i].ratio);
      if(!same)resolved[i]=config.resolveParticleFrequency(root,agents[i].ratio);
      byAgent.set(agents[i],resolved[i]);
    }
    const ordered=nodalImpactPreparationOrder(agents,prediction,baseSpeed,sectorAngle);
    for(let i=0;i<count;i++){const hz=byAgent.get(ordered[i]);if(Number.isFinite(hz)&&hz>=5&&hz<=12000)frequencies.push(hz);}
    if(!ready.player.prepareFrequencies?.(ready.instrument,frequencies,'particle'))return false;
    slot.family={ready,root,ratios,resolved,frequencies,newestRipple,newestSector,at:now};
    return true;
  }
  function warmWaveField(context){
    warmGridField(context);
    const slot=lanes.get('wave'),ready=slot?.ready;
    if(disposed||!ready||ready.context!==context||owner?.player!==ready.player||!config.readWaveBaseFrequency||!config.resolveWaveFrequency)return false;
    // With an active complete raster, free cursor motion changes no playable
    // grid tone. Its exact four launch variants are already in the grid job.
    // A continuous/no-grid mode or an oversized raster keeps dynamic hints.
    const gridParams=config.readWaveGridParams?.();
    if(gridParams?.gridOn===true&&gridParams.lockCursorToGrid===true&&preparedGrid&&preparedGrid.total<=2048)return true;
    const root=config.readWaveBaseFrequency(),previous=slot.family;
    if(previous?.ready===ready&&previous.root===root)return true;
    const now=context.currentTime;if(previous?.ready===ready&&now-previous.at<.04)return false;
    // The cursor pitch has four known launch variants: normal/sector, each
    // with/without octave hold. Preparation emits no note or global ticket.
    const frequencies=[];
    for(const octaveHeld of [false,true])for(const isSector of [false,true]){
      const hz=config.resolveWaveFrequency(root,isSector,octaveHeld);
      if(Number.isFinite(hz)&&hz>=5&&hz<=12000)frequencies.push(hz);
    }
    if(!ready.player.prepareFrequencies?.(ready.instrument,frequencies,'wave'))return false;
    slot.family={ready,root,at:now};return true;
  }
  function acceptsGrid(slot,context){return slot?.ready&&slot.ready.context===context&&owner?.player===slot.ready.player&&typeof slot.ready.player.prepareGridFrequencies==='function';}
  function sameGridProgram(slot,ready,context){return acceptsGrid(slot,context)&&slot.ready.programKey===ready.programKey;}
  function submitGrid(slot,context){
    if(!acceptsGrid(slot,context))return;
    const ready=slot.ready,wave=lanes.get('wave'),keys=lanes.get('keyboard'),particle=lanes.get('particle');
    const waveGrid=sameGridProgram(wave,ready,context)||sameGridProgram(keys,ready,context)?preparedGrid:null;
    const particleGrid=sameGridProgram(particle,ready,context)?preparedParticleGrid:null;
    if(slot.gridPrepared?.wave===waveGrid&&slot.gridPrepared?.particle===particleGrid)return;
    // One desired set per actual program, even if several slots or differently
    // named identical recipes share it. Wave gets its existing coverage first.
    const unique=new Set(waveGrid?.frequencies??[]);
    if(particleGrid)for(const hz of particleGrid.frequencies)unique.add(hz);
    const frequencies=[...unique].slice(0,2048);
    if(!ready.player.prepareGridFrequencies(ready.instrument,frequencies))return;
    const revision={wave:waveGrid,particle:particleGrid,total:unique.size,requested:frequencies.length};
    if(sameGridProgram(wave,ready,context))wave.gridPrepared=revision;
    if(sameGridProgram(keys,ready,context))keys.gridPrepared=revision;
    if(sameGridProgram(particle,ready,context))particle.gridPrepared=revision;
  }
  function warmParticleGrid(context){
    const slot=lanes.get('particle');
    if(!acceptsGrid(slot,context)||!config.readParticleGridAgents||!config.resolveParticleFrequency){preparedParticleGrid=null;return;}
    const agents=config.readParticleGridAgents();
    if(!Array.isArray(agents)){preparedParticleGrid=null;return;}
    const count=Math.min(32,agents.length),previous=preparedParticleGrid;
    let sameRatios=previous?.ratios.length===count;
    if(sameRatios)for(let i=0;i<count;i++)if(!Object.is(previous.ratios[i],agents[i].ratio)){sameRatios=false;break;}
    if(sameRatios&&previous.grid===preparedGrid)return;
    const ratios=[],unique=new Set(),projections=new Map();
    for(let i=0;i<count;i++)ratios.push(agents[i].ratio);
    // Use actual live agent ratios and the actual particle resolver. Particle
    // roots are cursor Hz, NOT the Wave launch's octave/sector playback Hz.
    for(const root of preparedGrid.roots){
      const old=previous?.projections?.get(root);
      const values=sameRatios&&old?old:new Float64Array(ratios.length);
      for(let i=0;i<ratios.length;i++){
        const ratio=ratios[i];if(!Number.isFinite(ratio)||ratio<=0)continue;
        if(values!==old){
          const index=previous?.ratioIndex?.get(ratio);
          values[i]=old&&index!==undefined?old[index]:config.resolveParticleFrequency(root,ratio);
        }
        const hz=values[i];if(Number.isFinite(hz)&&hz>=5&&hz<=12000)unique.add(hz);
      }
      projections.set(root,values);
    }
    preparedParticleGrid={grid:preparedGrid,ratios,ratioIndex:new Map(ratios.map((ratio,i)=>[ratio,i])),projections,frequencies:[...unique]};
  }
  function submitGridPrograms(context){
    warmParticleGrid(context);
    submitGrid(lanes.get('wave'),context);submitGrid(lanes.get('keyboard'),context);submitGrid(lanes.get('particle'),context);
  }
  let octaveState=null;
  function warmGridField(context){
    const nextOctaves=config?.readSourceOctaves?.()??null;
    if(octaveState!==nextOctaves){octaveState=nextOctaves;preparedGrid=null;preparedParticleGrid=null;for(const slot of lanes.values()){slot.family=null;slot.gridPrepared=null;}}
    if(disposed||!config?.readWaveGridLines||!config.gridFrequencyToWaveBase||!config.resolveWaveFrequency)return false;
    if(!acceptsGrid(lanes.get('wave'),context)&&!acceptsGrid(lanes.get('keyboard'),context)&&!acceptsGrid(lanes.get('particle'),context)){preparedParticleGrid=null;return false;}
    const state=config.readWaveGridParams?.(),top=config.readWaveGridTopFrequency?.();
    // Production params are immutable; compare only the four grid inputs.
    // An unchanged frame does not rebuild even the source lists' cache keys.
    if(state&&preparedGrid&&preparedGrid.base===state.gridBase&&preparedGrid.tuning===state.gridTuning&&preparedGrid.mutes===state.manualGridMutedSteps&&preparedGrid.offsets===state.manualGridStepOffsets&&preparedGrid.top===top){
      submitGridPrograms(context);return true;
    }
    const lines=config.readWaveGridLines(),snap=config.readWaveGridFrequencies?.()??null,keyboard=config.readKeyboardGridFrequencies?.()??null;
    if(!Array.isArray(lines))return false;
    if(!preparedGrid||preparedGrid.lines!==lines||preparedGrid.snap!==snap||preparedGrid.keyboard!==keyboard||preparedGrid.top!==top){
      const unique=new Set(),roots=new Set(),projections=new Map();
      const previous=preparedGrid&&preparedGrid.top===top?preparedGrid.projections:null;
      // Keyboard's canonical list uses its own rounding and anchor rules.
      // Union both owners' actual values instead of approximating one list.
      const sources=lines.filter(line=>!line.manualMuted&&!line.modeMuted).map(line=>line.freq);
      if(Array.isArray(snap))sources.push(...snap);
      if(Array.isArray(keyboard))sources.push(...keyboard);
      for(const frequency of new Set(sources)){
        if(!Number.isFinite(frequency))continue;
        let projection=previous?.get(frequency);
        if(!projection){
          const base=config.gridFrequencyToWaveBase(frequency),variants=[];
          for(const sourceLane of (nextOctaves&&nextOctaves.keyboard!==nextOctaves.wave?['wave','keyboard']:['wave']))for(const octaveHeld of [false,true])for(const isSector of [false,true]){
            const hz=config.resolveWaveFrequency(base,isSector,octaveHeld,sourceLane);
            if(Number.isFinite(hz)&&hz>=5&&hz<=12000)variants.push(hz);
          }
          projection={base,variants};
        }
        projections.set(frequency,projection);
        const base=projection.base;
        if(Number.isFinite(base)&&base>0)roots.add(base);
        for(const hz of projection.variants)unique.add(hz);
      }
      preparedGrid={lines,snap,keyboard,top,projections,frequencies:[...unique],roots:[...roots],total:unique.size};
    }
    preparedGrid.base=state?.gridBase;preparedGrid.tuning=state?.gridTuning;preparedGrid.mutes=state?.manualGridMutedSteps;preparedGrid.offsets=state?.manualGridStepOffsets;
    submitGridPrograms(context);return true;
  }
  function dispose(){
    disposed=true;owner?.player?.dispose();owner=null;
    for(const slot of lanes.values()){slot.stamp++;slot.id=null;releaseSelection(slot);}
    lanes.clear();heldVoices.clear();liveVoices.clear();routeOwners.clear();preparedGrid=null;preparedParticleGrid=null;
  }
  function releaseHeld(){for(const {voice}of heldVoices.values())voice.noteOff();heldVoices.clear();}
  function releaseLive(){for(const voice of liveVoices.values())voice.cut();heldVoices.clear();}
  return Object.freeze({refreshPitch:()=>{const ctx=config?.getContext?.();if(ctx)warmWaveField(ctx)},placement:state=>{placementState=state??{};owner?.player?.placement?.(placementState)},configure,publishRoute,select,note,preview,selectionStatus,options,warmParticleField,warmWaveField,releaseHeld,releaseLive,dispose,snapshot:()=>{
    const status=owner?.player?.snapshot();if(!status)return null;
    const programs=new Set();for(const slot of lanes.values())if(acceptsGrid(slot,owner?.context)&&slot.gridPrepared)programs.add(slot.gridPrepared);
    return {...status,gridCoverage:preparedGrid?{total:preparedGrid.total,requested:Math.min(2048,preparedGrid.total),limited:preparedGrid.total>2048}:null,
      particleGridCoverage:preparedParticleGrid?{roots:preparedParticleGrid.grid.roots.length,ratios:preparedParticleGrid.ratios.length,total:preparedParticleGrid.frequencies.length}:null,
      gridPrograms:[...programs].map(p=>({wave:!!p.wave,particle:!!p.particle,total:p.total,requested:p.requested,limited:p.total>p.requested}))};
  }});
}
const __XenNodalSurfaces=createNodalSurfaceRuntime({library:__XenNodalLibrary,live:__XenNodalLive,model:__XenNodalModel});
// On-demand diagnostic inspection only; no permanent UI polling or new audio work.
if(typeof globalThis!=='undefined')globalThis.XenSonarSourceSlots=()=>({
  wave:__XenNodalSurfaces.selectionStatus('wave'),
  keyboard:__XenNodalSurfaces.selectionStatus('keyboard'),
  particle:__XenNodalSurfaces.selectionStatus('particle')
});
