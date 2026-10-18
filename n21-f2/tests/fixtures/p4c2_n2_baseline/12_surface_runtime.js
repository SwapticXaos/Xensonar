/* Direct Nodal V1/V2 synthesis. Selection owns all preparation. Wave and particle
   share ONE processor and ONE bounded budget; attacks never queue or steal tails. */
function createNodalSurfaceRuntime({library,live,model}) {
  const lanes=new Map(),heldVoices=new Map(), routeOwners=new Map();
  // Keyboard owns a selection, while rendering through the existing Wave bus.
  const audioLane=slot=>slot==='keyboard'?'wave':slot;
  let config=null,disposed=false,owner=null,preparedGrid=null;
  const isNodal=id=>typeof id==='string'&&id.startsWith('nodal:');
  // DSP units and global voice occupancy have different owners. One actual
  // voice consumes one global ticket; this processor accounts its real DSP class.
  // P3B5: coupled-modal voices render every 128-frame block even after their dry attack ends.
  // The former 1-unit three-node plan plus half-cost tail could admit 16-32 costly voices.
  // Charge at least one unit per two active modal nodes; the shared 16-unit cap then protects
  // Wave + Keyboard + Particle together. This is capacity accounting, NOT DSP or new scheduling.
  function surfaceCost(plan,rate=48000){const n=plan?.nodes?.length??0,modal=plan?.kernelVersion==='coupled-modal-v2'||plan?.kernelVersion==='coupled-modal-v1',units=modal?Math.max(plan.cost,Math.ceil(n/2)):plan.cost;return units*Math.max(1,rate/48000);}
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
  function configure(next){config=next;disposed=false;preparedGrid=null;}

  function playerFor(context){
    if(owner?.context===context&&!owner.player?.snapshot?.().disposed)return owner.promise;
    owner?.player?.dispose();
    const current={context,player:null,promise:null};owner=current;
    current.promise=live.createPlayer(context,config.getOutput(context),{
      acquire:(cost,lane)=>!disposed&&owner===current&&(lane==='wave'||lane==='particle')?config.acquire(lane,1,context):null,
      onError:error=>config?.onError?.(error),onEnded:id=>heldVoices.delete(id)
    },{costForPlan:surfaceCost,maxCost:16,maxVoices:32,tailCostScale:1,preserveTails:true,prepareOnControl:true,separateLanes:true}).then(player=>{
      if(disposed||owner!==current){player.dispose();return null;}
      current.player=player;return player;
    }).catch(error=>{if(owner===current)owner=null;throw error;});
    return current.promise;
  }
  function releaseSelection(slot){
    if(slot?.ready){slot.ready.player.unpin?.(slot.ready.instrument);slot.ready=null;}
    if(slot){slot.context=null;slot.family=null;slot.gridPrepared=null;}
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
        slot.context=context;slot.ready={id,instrument,context,player};slot.family=null;slot.gridPrepared=null;
        slot.phase='ready';slot.error=null;
        if(previous)previous.player.unpin?.(previous.instrument);
        if(lane==='wave'||lane==='keyboard')warmWaveField(context);
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
    return player.noteOn(instrument,{frequency:hz,velocity:.8,gain:Math.max(0,Math.min(1,options.gain??.18)),admissionLane:audioLane(lane),held:false,
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
    const voice=ready.player.noteOn(ready.instrument,{frequency:hz,velocity:.8,gain,admissionLane:audioLane(lane),traceId:options.traceId,held:options.held===true,
      durationSec:Number.isFinite(options.durationSec)?Math.max(.02,Math.min(30,options.durationSec)):ready.instrument.articulation.durationSec,
      seed:ready.instrument.seed},start);
    if(voice&&options.held===true)heldVoices.set(voice.id,{lane,voice});return voice;
  }
  function warmParticleField(agents,root,context){
    const slot=lanes.get('particle'),ready=slot?.ready;
    if(disposed||!ready||ready.context!==context||owner?.player!==ready.player||!Array.isArray(agents)||!config.resolveParticleFrequency)return false;
    const count=Math.min(32,agents.length),previous=slot.family;
    let same=previous?.ready===ready&&previous.root===root&&previous.ratios.length===count;
    if(same)for(let i=0;i<count;i++)if(previous.ratios[i]!==agents[i].ratio){same=false;break;}
    if(same)return true;
    // Hint rate limits constrain preparation only. A changed real note always
    // uses its exact incoming Hz, even when no prediction could be prepared.
    const now=context.currentTime;if(previous?.ready===ready&&now-previous.at<.04)return false;
    const ratios=[],frequencies=[];
    for(let i=0;i<count;i++){ratios.push(agents[i].ratio);const hz=config.resolveParticleFrequency(root,agents[i].ratio);if(Number.isFinite(hz)&&hz>=5&&hz<=12000)frequencies.push(hz);}
    if(!ready.player.prepareFrequencies?.(ready.instrument,frequencies,'particle'))return false;
    slot.family={ready,root,ratios,at:now};
    return true;
  }
  function warmWaveField(context){
    warmGridField(context);
    const slot=lanes.get('wave'),ready=slot?.ready;
    if(disposed||!ready||ready.context!==context||owner?.player!==ready.player||!config.readWaveBaseFrequency||!config.resolveWaveFrequency)return false;
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
  function submitGrid(slot,context){
    if(acceptsGrid(slot,context)&&slot.gridPrepared!==preparedGrid&&slot.ready.player.prepareGridFrequencies(slot.ready.instrument,preparedGrid.frequencies))slot.gridPrepared=preparedGrid;
  }
  function warmGridField(context){
    if(disposed||!config?.readWaveGridLines||!config.gridFrequencyToWaveBase||!config.resolveWaveFrequency)return false;
    const wave=lanes.get('wave'),keys=lanes.get('keyboard');
    if(!acceptsGrid(wave,context)&&!acceptsGrid(keys,context))return false;
    const state=config.readWaveGridParams?.(),top=config.readWaveGridTopFrequency?.();
    // Production params are immutable; compare only the four grid inputs.
    // An unchanged frame does not rebuild even the source lists' cache keys.
    if(state&&preparedGrid&&preparedGrid.base===state.gridBase&&preparedGrid.tuning===state.gridTuning&&preparedGrid.mutes===state.manualGridMutedSteps&&preparedGrid.offsets===state.manualGridStepOffsets&&preparedGrid.top===top){
      submitGrid(wave,context);submitGrid(keys,context);return true;
    }
    const lines=config.readWaveGridLines(),snap=config.readWaveGridFrequencies?.()??null,keyboard=config.readKeyboardGridFrequencies?.()??null;
    if(!Array.isArray(lines))return false;
    if(!preparedGrid||preparedGrid.lines!==lines||preparedGrid.snap!==snap||preparedGrid.keyboard!==keyboard||preparedGrid.top!==top){
      const unique=new Set();
      // Keyboard's canonical list uses its own rounding and anchor rules.
      // Union both owners' actual values instead of approximating one list.
      const sources=lines.filter(line=>!line.manualMuted&&!line.modeMuted).map(line=>line.freq);
      if(Array.isArray(snap))sources.push(...snap);
      if(Array.isArray(keyboard))sources.push(...keyboard);
      for(const frequency of sources){
        if(!Number.isFinite(frequency))continue;
        // The same Hz -> cursor -> Hz roundtrip is used by actual Snap/Keyboard.
        const base=config.gridFrequencyToWaveBase(frequency);
        for(const octaveHeld of [false,true])for(const isSector of [false,true]){
          const hz=config.resolveWaveFrequency(base,isSector,octaveHeld);
          if(Number.isFinite(hz)&&hz>=5&&hz<=12000)unique.add(hz);
        }
      }
      const all=[...unique];preparedGrid={lines,snap,keyboard,top,frequencies:all.slice(0,2048),total:all.length};
    }
    preparedGrid.base=state?.gridBase;preparedGrid.tuning=state?.gridTuning;preparedGrid.mutes=state?.manualGridMutedSteps;preparedGrid.offsets=state?.manualGridStepOffsets;
    submitGrid(wave,context);submitGrid(keys,context);
    return true;
  }
  function dispose(){
    disposed=true;owner?.player?.dispose();owner=null;
    for(const slot of lanes.values()){slot.stamp++;slot.id=null;releaseSelection(slot);}
    lanes.clear();heldVoices.clear();routeOwners.clear();preparedGrid=null;
  }
  function releaseHeld(){for(const {voice}of heldVoices.values())voice.noteOff();heldVoices.clear();}
  return Object.freeze({configure,publishRoute,select,note,preview,selectionStatus,options,warmParticleField,warmWaveField,releaseHeld,dispose,snapshot:()=>{
    const status=owner?.player?.snapshot();return status?{...status,gridCoverage:preparedGrid?{total:preparedGrid.total,requested:preparedGrid.frequencies.length,limited:preparedGrid.total>preparedGrid.frequencies.length}:null}:null;
  }});
}
const __XenNodalSurfaces=createNodalSurfaceRuntime({library:__XenNodalLibrary,live:__XenNodalLive,model:__XenNodalModel});
// On-demand diagnostic inspection only; no permanent UI polling or new audio work.
if(typeof globalThis!=='undefined')globalThis.XenSonarSourceSlots=()=>({
  wave:__XenNodalSurfaces.selectionStatus('wave'),
  keyboard:__XenNodalSurfaces.selectionStatus('keyboard'),
  particle:__XenNodalSurfaces.selectionStatus('particle')
});
