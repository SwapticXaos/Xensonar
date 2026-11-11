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
/* XenSonar NH-01C EXPERIMENTAL: audio-frame PCM hold reader, NOT a release-fidelity certification.
 * There is one AudioWorkletProcessor per AudioContext; trigger events share it.
 * No per-step AudioNodes; 1 reader per held key; key-up changes the sole reader's release envelope.
 */
function xenNodalHoldProcessorFactory(){
  class XenNodalHoldPCMProcessor extends AudioWorkletProcessor{
    constructor(){
      super();this.templates=new Map();this.voices=new Map();this.queue=[];this.totalBytes=0;
      this.counts={triggers:0,retired:0,missed:0,missing:0,peakReaders:0,mutedSampleFrames:0,late:0,expired:0,released:0};
      this.port.onmessage=ev=>this.message(ev.data);
    }
    message(d){
      if(!d||typeof d.type!=='string')return;
      if(d.type==='template'){
        if(typeof d.id!=='string'||d.id.length>256||!Number.isFinite(d.frames)||d.frames<=0||d.frames>sampleRate*16||!(d.left instanceof Float32Array)||d.left.length!==d.frames||!(d.right instanceof Float32Array)||d.right.length!==d.frames)return;
        const bytes=d.frames*8;
        if(bytes>16*1024*1024)return;
        const old=this.templates.get(d.id);if(old){this.totalBytes-=old.bytes;this.templates.delete(d.id);}
        // LRU eviction only impacts future triggers, never a currently playing reader.
        while(this.totalBytes+bytes>16*1024*1024||this.templates.size>=8){
          const id=this.templates.keys().next().value;if(id===undefined)break;
          this.totalBytes-=this.templates.get(id).bytes;this.templates.delete(id);this.port.postMessage({type:'template-evicted',id});
        }
        this.templates.set(d.id,{left:d.left,right:d.right,bytes,frames:d.frames});this.totalBytes+=bytes;
        this.port.postMessage({type:'template-ready',id:d.id});return;
      }
      if(d.type==='trigger'){
        if(typeof d.key!=='string'||d.key.length>128||!Number.isSafeInteger(d.frame)||!Number.isFinite(d.interval)||d.interval<64||d.interval>sampleRate*16)return;
        if(!this.templates.has(d.id)){this.counts.missing++;this.port.postMessage({type:'no-template',id:d.id});return;}
        if(!this.voices.has(d.key)&&!this.queue.some(x=>x.key===d.key)&&this.voices.size+this.queue.length>=8){this.counts.missed++;this.port.postMessage({type:'voice-limit',key:d.key});return;}
        this.queue.push({type:'trigger',key:d.key,id:d.id,frame:d.frame,interval:d.interval});
        this.queue.sort((a,b)=>a.frame-b.frame);return;
      }
      if(d.type==='release'){
        if(typeof d.key!=='string'||!Number.isSafeInteger(d.frame))return;
        this.queue=this.queue.filter(x=>!(x.type==='trigger'&&x.key===d.key&&x.frame>=d.frame));
        this.queue.push({type:'release',key:d.key,frame:d.frame,releaseFrames:Math.max(64,Math.min(sampleRate*3,Math.round(d.releaseFrames||sampleRate*.2)))});
        this.queue.sort((a,b)=>a.frame-b.frame);return;
      }
      if(d.type==='release-all'){
        this.queue=this.queue.filter(x=>x.type!=='trigger');
        for(const [key] of this.voices)this.queue.push({type:'release',key,frame:Math.max(currentFrame,Math.round(d.frame||currentFrame)),releaseFrames:Math.max(64,Math.min(sampleRate*3,Math.round(d.releaseFrames||sampleRate*.2)))});
        this.queue.sort((a,b)=>a.frame-b.frame);return;
      }
      if(d.type==='stop'){
        if(typeof d.key==='string'){this.voices.delete(d.key);this.queue=this.queue.filter(x=>x.key!==d.key);}
        else {this.voices.clear();this.queue.length=0;}
        return;
      }
      if(d.type==='stats')this.port.postMessage({type:'stats',counts:{...this.counts},voices:this.voices.size,templates:this.templates.size,bytes:this.totalBytes});
    }
    advance(frame){
      while(this.queue.length&&this.queue[0].frame<=frame){
        const ev=this.queue.shift();
        if(ev.type==='release'){
          const v=this.voices.get(ev.key);if(v&&v.releaseFrame===Infinity){
            // Anchor key-up to its original AudioContext frame even when the
            // control-port message arrives late. Do not revive the level of a
            // reader that has already entered its rhythmic gate fade.
            const age=Math.max(0,frame-ev.frame);
            const releaseGain=age>=ev.releaseFrames?0:Math.pow(1-age/ev.releaseFrames,2);
            const atKeyUp=Math.max(0,Math.min(1,(v.gateFrame-ev.frame)/v.fade));
            const atDelivery=Math.max(0,Math.min(1,(v.gateFrame-frame)/v.fade));
            v.releaseFrame=ev.frame;v.releaseLength=ev.releaseFrames;
            v.releaseLevel=releaseGain>0?Math.min(atKeyUp,atDelivery/releaseGain):0;
            v.gateFrame=Infinity;this.counts.released++;}
          continue;
        }
        const tpl=this.templates.get(ev.id);if(!tpl){this.counts.missing++;continue;}
        // Never replay an expired attack in a later (potentially muted) step.
        const gateFrame=ev.frame+Math.round(ev.interval),lateFrames=frame-ev.frame;
        if(lateFrames>=ev.interval||lateFrames>=tpl.frames){this.counts.expired++;continue;}
        // A delayed port delivery retains the original timeline; catch up the PCM
        // read head rather than pushing the attack beyond its musical slot.
        if(this.voices.has(ev.key))this.counts.retired++;
        const fade=Math.min(Math.floor(ev.interval/3),Math.max(32,Math.round(sampleRate*.006)));
        this.voices.set(ev.key,{tpl,pos:Math.max(0,lateFrames),gateFrame,fade,
          releaseFrame:Infinity,releaseLength:0,releaseLevel:1});
        this.counts.triggers++;if(lateFrames>0)this.counts.late++;
        this.counts.peakReaders=Math.max(this.counts.peakReaders,this.voices.size);
      }
    }
    process(inputs,outputs){
      const keyboard=outputs[0],wave=outputs[1],left=keyboard?.[0],right=keyboard?.[1];if(!left)return true;
      const wLeft=wave?.[0],wRight=wave?.[1];const n=left.length;
      // Use the AudioWorklet's authoritative frame clock, never an invented bar clock.
      for(let i=0;i<n;i++){
        const at=currentFrame+i;this.advance(at);
        let l=0,r=0,wl=0,wr=0;
        for(const [key,v]of this.voices){
          if(v.pos>=v.tpl.frames){this.voices.delete(key);this.counts.retired++;continue;}
          let gain=1;
          if(v.releaseFrame!==Infinity){const age=at-v.releaseFrame;
            if(age>=v.releaseLength){this.voices.delete(key);this.counts.retired++;continue;}
            gain=v.releaseLevel*Math.pow(Math.max(0,1-age/v.releaseLength),2);
          }else{
            const leftFrames=v.gateFrame-at;
            if(leftFrames<=0){this.voices.delete(key);this.counts.retired++;continue;}
            if(leftFrames<v.fade)gain=Math.max(0,leftFrames/v.fade);
          }
          const a=v.tpl.left[v.pos]*gain,b=v.tpl.right[v.pos]*gain;v.pos++;
          if(key.startsWith('wave:')){wl+=a;wr+=b;}else{l+=a;r+=b;}
        }
        left[i]=l;if(right)right[i]=r;
        if(wLeft)wLeft[i]=wl;if(wRight)wRight[i]=wr;
        if(l===0&&r===0&&wl===0&&wr===0)this.counts.mutedSampleFrames++;
      }
      return true;
    }
  }
  registerProcessor('xen-nodal-hold-pcm-nh01',XenNodalHoldPCMProcessor);
}

/* NH-01 opt-in host. Render original Nodal DSP in Worker; NO full synthesis per prepared hold step.
 * An incomplete preparation MUST fall back to the original note path (visible in stats).
 * Release waveform is approximated with the instrument's release duration, not exact arbitrary-keyup physical resonator state.
 */
const __XenNodalHoldPCM=(()=>{
 const active=new WeakMap(),devices=new Set();const ENABLED=(()=>{try{return new URLSearchParams(location.search).get('xenNodalHoldPCM')==='1'}catch{return false}})();
 // Optional rhythm-first comparison: NO new shared FX energy from prepared PCM.
 // Default preserves the full historic sends. Not applicable to cold legacy fallback.
 const DRY_PATTERN=ENABLED&&(()=>{try{return new URLSearchParams(location.search).get('xenNodalHoldDry')==='1'}catch{return false}})();
 const stats={prepared:0,pending:0,triggers:0,fallback:0,failed:0,releases:0,routeChanges:0,queueSuperseded:0,staleSuppressed:0};
 const frame=(ctx,s)=>Math.round(s*ctx.sampleRate);
 const sec=(ctx,atMs)=>ctx.currentTime+(atMs-performance.now())/1000;
 const valid=(ctx)=>ctx&&ctx.state==='running'&&ctx.audioWorklet&&typeof Worker==='function';
 function device(ctx){let d=active.get(ctx);if(d)return d;
   d={ctx,node:null,promise:null,moduleLoaded:false,worker:null,workerURL:null,moduleURL:null,entries:new Map(),renders:new Map(),queue:new Map(),inflight:null,routes:{keyboard:[],wave:[]},heldKeys:new Map(),seenEpochs:new Map(),releasedEpochs:new Map(),generation:0,disposed:false};active.set(ctx,d);devices.add(d);
   const close=()=>{if(ctx.state!=='closed')return;d.disposed=true;d.generation++;try{d.worker?.terminate()}catch{}try{d.node?.disconnect()}catch{}
      if(d.workerURL)URL.revokeObjectURL(d.workerURL);if(d.moduleURL)URL.revokeObjectURL(d.moduleURL);d.entries.clear();d.queue.clear();d.heldKeys.clear();d.seenEpochs.clear();d.releasedEpochs.clear();devices.delete(d);ctx.removeEventListener('statechange',close);};
   ctx.addEventListener?.('statechange',close);return d;
 }
 function drain(d){
   if(!d.worker||d.inflight||d.disposed)return;
   while(d.queue.size){
     const [key,job]=d.queue.entries().next().value;d.queue.delete(key);
     if(d.entries.get(job.id)!==job.item||job.generation!==d.generation)continue;
     d.inflight=job.id;
     try{d.worker.postMessage({id:job.id,instrument:job.instrument,options:job.options,sampleRate:d.ctx.sampleRate});}
     catch(error){d.inflight=null;d.entries.delete(job.id);stats.failed++;continue;}
     return;
   }
 }
 async function ensure(d){if(d.promise)return d.promise;const gen=d.generation;
   d.promise=(async()=>{
     if(!d.moduleLoaded){
       const code='('+xenNodalHoldProcessorFactory.toString()+')()';
       d.moduleURL=URL.createObjectURL(new Blob([code],{type:'application/javascript'}));
       await d.ctx.audioWorklet.addModule(d.moduleURL);d.moduleLoaded=true;
     }
     if(d.disposed)return false;
     if(gen!==d.generation){d.promise=null;if(d.queue.size)queueMicrotask(()=>{if(!d.disposed)void ensure(d)});return false;}
     d.node=new AudioWorkletNode(d.ctx,'xen-nodal-hold-pcm-nh01',{numberOfInputs:0,numberOfOutputs:2,outputChannelCount:[2,2]});
     d.node.port.onmessage=ev=>{const msg=ev.data;if(msg?.type==='template-ready'){const item=d.entries.get(msg.id);if(item)item.ready=true;}if(msg?.type==='template-evicted')d.entries.delete(msg.id);};
     const worker='('+function(modelFn,kernelFn){
       const model=modelFn(),dsp=kernelFn();
       self.onmessage=ev=>{const m=ev.data;try{const plan=model.compile(m.instrument);
         const pcm=dsp.render(plan,m.options,m.sampleRate);const left=pcm.left??pcm.pcm,right=pcm.right??pcm.pcm;
         self.postMessage({id:m.id,left,right,releaseSec:plan.articulation.releaseSec},[left.buffer,...(left===right?[]:[right.buffer])]);
       }catch(error){self.postMessage({id:m.id,error:String(error)})}};
     }.toString()+')('+createNodalInstrumentModel.toString()+','+createNodalSynthesisKernel.toString()+');';
     d.workerURL=URL.createObjectURL(new Blob([worker],{type:'application/javascript'}));d.worker=new Worker(d.workerURL);
     d.worker.onmessage=ev=>{const m=ev.data,item=d.entries.get(m?.id);d.inflight=null;drain(d);if(!item||item.generation!==d.generation)return;
       if(m.error){d.entries.delete(m.id);stats.failed++;return;}
       const bytes=m.left.length*4+m.right.length*4;
       if(bytes>16*1024*1024){d.entries.delete(m.id);stats.failed++;return;}
       item.releaseSec=m.releaseSec;item.bytes=bytes;item.phase='transferring';
       // Transfer once into the AudioWorklet. PCM is not copied every step.
       d.node.port.postMessage({type:'template',id:m.id,left:m.left,right:m.right,frames:m.left.length},
         m.left.buffer===m.right.buffer?[m.left.buffer]:[m.left.buffer,m.right.buffer]);
       stats.prepared++;
     };
     d.worker.onerror=()=>{const failedId=d.inflight;d.inflight=null;if(failedId!==null&&failedId!==undefined){const item=d.entries.get(failedId);if(item&&item.generation===d.generation)d.entries.delete(failedId);}stats.failed++;drain(d);};drain(d);return true;
   })().catch(error=>{stats.failed++;d.promise=null;if(gen===d.generation&&!d.disposed){for(const job of d.queue.values())if(job.generation===gen&&d.entries.get(job.id)===job.item)d.entries.delete(job.id);d.queue.clear();}return false});return d.promise;
 }
 function route(d,lane,main,aux){
   // Two stereo outputs on ONE reader Worklet; no shared-route rewire when
   // keyboard and Wellenstarter use different main/FX destinations.
   const index=lane==='wave'?1:0;
   const targets=[main,...(Array.isArray(aux)?aux:[])].filter((x,i,a)=>!!x&&a.indexOf(x)===i);
   const prior=d.routes[lane];
   if(targets.length===prior.length&&targets.every((x,i)=>x===prior[i]))return;
   try{d.node.disconnect(index)}catch{}
   for(const target of targets)try{d.node.connect(target,index)}catch{}
   d.routes[lane]=targets;stats.routeChanges++;
 }
 function play(lane,id,instrument,opt,ctx){
   if(!ENABLED||!valid(ctx)||!instrument||!Number.isFinite(opt.nodalHoldIntervalMs)||!opt.nodalHoldKeyId||!['keyboard','wave'].includes(lane))return false;
   const hz=opt.frequency,interval=opt.nodalHoldIntervalMs;
   if(!Number.isFinite(hz)||hz<5||hz>12000||interval<4||interval>16000)return false;
   const d=device(ctx),key=lane+':'+opt.nodalHoldKeyId;
   const epoch=Number.isFinite(opt.nodalHoldGestureEpochMs)?opt.nodalHoldGestureEpochMs:0;
   const seen=d.seenEpochs.get(key);if(seen===undefined||epoch>seen)d.seenEpochs.set(key,epoch);
   if(d.releasedEpochs.has(key)&&epoch<=d.releasedEpochs.get(key)){stats.staleSuppressed++;return {id:'nh01-stale:'+key,isHoldPCM:true,isSuppressed:true,noteOff:()=>{}};}
   // Distinct gain/Hz/revision/sample rate/duration are distinct authentic Nodal render contracts.
   const duration=Math.max(.15,Math.min(12,interval/1000+Math.max(.1,instrument.articulation?.releaseSec||.2)));
   const cacheId=[id,hz,opt.gain??.5,ctx.sampleRate,duration,Number(instrument.seed)||0,instrument.articulation?.attackSec??0,instrument.articulation?.releaseSec??0].join('|');
   let item=d.entries.get(cacheId);
   if(!item){
     // One newest unstarted render request per held key. Stale glissandi cannot
     // produce an unbounded background backlog or a stream of obsolete PCM.
     const prior=d.queue.get(key);
     if(prior){d.queue.delete(key);d.entries.delete(prior.id);stats.queueSuperseded++;}
     if(d.entries.size>=8){
       for(const [oldId,old] of d.entries){
         if(oldId===d.inflight||oldId===cacheId)continue;
         d.entries.delete(oldId);break;
       }
     }
     if(d.entries.size>=8){stats.fallback++;return false;}
     item={id:cacheId,generation:d.generation,ready:false,phase:'rendering',bytes:0};d.entries.set(cacheId,item);stats.pending++;
     d.queue.set(key,{id:cacheId,item,generation:d.generation,instrument,
       options:{frequency:hz,velocity:.8,gain:opt.gain??.5,seed:instrument.seed,durationSec:duration}});
     void ensure(d).then(ok=>{if(ok&&item.generation===d.generation)drain(d)});
   }
   if(!item.ready||!d.node){stats.fallback++;return false;}
   if(!d.heldKeys.has(key)&&d.heldKeys.size>=8){stats.fallback++;return false;}
   if(d.entries.size>8){for(const [k,v]of d.entries){if(k===cacheId)continue;d.entries.delete(k);if(d.entries.size<=8)break;}}
   route(d,lane,opt.output,DRY_PATTERN?[]:opt.auxTargets);
   // Use the already validated Nodal AudioContext startSec, not a fresh DOM timestamp.
   const target=Number.isFinite(opt.startSec)?opt.startSec:(Number.isFinite(opt.nodalHoldStartAtMs)?sec(ctx,opt.nodalHoldStartAtMs):ctx.currentTime+.008);
   const start=Math.max(ctx.currentTime,target);
   d.heldKeys.set(key,{epoch,releaseSec:Math.max(.001,Math.min(3,instrument.articulation?.releaseSec??.18))});
   d.node.port.postMessage({type:'trigger',key,id:cacheId,frame:frame(ctx,start),interval:Math.round(ctx.sampleRate*interval/1000)});
   stats.triggers++;
   return {id:'nh01:'+key,isHoldPCM:true,noteOff:()=>release(lane,opt.nodalHoldKeyId)};
 }
 function release(lane,keyId){if(!ENABLED)return;
   for(const d of devices){if(d.disposed)continue;
     if(!keyId){for(const [key,epoch] of d.seenEpochs)d.releasedEpochs.set(key,epoch);d.heldKeys.clear();if(d.node)d.node.port.postMessage({type:'release-all',frame:frame(d.ctx,d.ctx.currentTime),releaseFrames:Math.round(d.ctx.sampleRate*.18)});continue;}
     const key=lane+':'+keyId,held=d.heldKeys.get(key),releaseSec=held?.releaseSec??.18;d.heldKeys.delete(key);
     if(d.seenEpochs.has(key))d.releasedEpochs.set(key,d.seenEpochs.get(key));
     if(d.releasedEpochs.size>64)d.releasedEpochs.delete(d.releasedEpochs.keys().next().value);
     if(d.node)d.node.port.postMessage({type:'release',key,frame:frame(d.ctx,d.ctx.currentTime),releaseFrames:Math.round(d.ctx.sampleRate*releaseSec)});
   }stats.releases++;
 }
 function stopAll(){for(const d of devices){d.generation++;d.entries.clear();d.queue.clear();d.heldKeys.clear();d.seenEpochs.clear();d.releasedEpochs.clear();d.node?.port.postMessage({type:'stop'});}}
 if(typeof window!=='undefined')window.__XenNodalHoldPCM=Object.freeze({status:()=>({enabled:ENABLED,dryPattern:DRY_PATTERN,...stats,contexts:devices.size}),stopAll});
 return Object.freeze({enabled:ENABLED,play,release,stopAll,status:()=>({...stats})});
})();

function createNodalSurfaceRuntime({library,live,model}) {
  const lanes=new Map(),heldVoices=new Map(),liveVoices=new Map(), routeOwners=new Map(),fallbackHoldVoices=new Map(),holdClockControls=new Map(),holdReady=new Map();
  // Explicitly opt-in, bounded main-thread note-dispatch witness; no per-sample work.
  let noteTraceEnabled=false;
  const noteTraceEvents=[];
  function traceNodalNote(lane,id,opt,ready,voice,path,reason){
    if(!noteTraceEnabled)return;
    const sound=ready?.instrument??null;
    let identity=null;
    try{if(sound){const n=model.normalize(sound);identity={name:n.name,kernelVersion:n.kernelVersion,
      material:{stretch:n.material?.stretch??null,balance:n.material?.balance??null},
      semanticKey:model.semanticKey(n),nodes:n.nodes.length};}}catch(e){identity={error:String(e?.message??e)}}
    const slot=lanes.get(lane);
    const event={timestampMs:performance.now(),lane,playType:opt?.nodalHoldClock?'thunder-clock':opt?.nodalHoldKeyId?'hold-direct':'single-note',
      requestedId:id,selectedId:slot?.id??null,selectedReadyId:slot?.ready?.id??null,
      preparedId:ready?.id??null,programKey:ready?.programKey==null?null:String(ready.programKey),
      identity,path,voiceId:voice?.id??null,backend:voice?.runtimeBackend?.()??voice?.backend??null,
      holdClock:!!opt?.nodalHoldClock,pcmReader:voice?.isHoldPCM===true,
      frequency:opt?.frequency??null,durationSec:opt?.durationSec??null,intervalMs:opt?.nodalHoldIntervalMs??null,
      reason:reason??null};
    noteTraceEvents.push(event);
    if(noteTraceEvents.length>96)noteTraceEvents.splice(0,noteTraceEvents.length-96);
  }
  function traceSnapshot(){return {enabled:noteTraceEnabled,events:noteTraceEvents.slice()};}
  function traceControl(command){if(command==='start'){noteTraceEvents.length=0;noteTraceEnabled=true;return true;}
    if(command==='stop'){noteTraceEnabled=false;return true;}
    if(command==='clear'){noteTraceEvents.length=0;return true;}return false;}

  function retireFallbackHold(key){const voice=fallbackHoldVoices.get(key);if(!voice)return false;fallbackHoldVoices.delete(key);holdClockControls.delete(key);liveVoices.delete(voice.id);__xenCutOwnedVoice(voice);return true;}
   function muteFallbackHold(lane,keyId){if(keyId&&!fallbackHoldVoices.get(lane+':'+keyId)?.isHoldClock)retireFallbackHold(lane+':'+keyId);}
   function endFallbackHoldGesture(lane,keyId,epoch){
     if(!disposed&&keyId&&Number.isFinite(epoch))owner?.player?.endHoldGesture?.(routeLane(lane),keyId,epoch);
   }
   function releaseFallbackHold(lane,keyId){const prefix=lane+':';for(const [key,voice]of fallbackHoldVoices)if(key.startsWith(prefix)&&(!keyId||key===prefix+keyId)){fallbackHoldVoices.delete(key);holdClockControls.delete(key);liveVoices.delete(voice.id);voice.noteOff();}}
  // Keyboard owns a selection, while rendering through the existing Wave bus.
  const audioLane=slot=>slot==='keyboard'?'wave':slot;
  // Physical routing is independent from admission: Keyboard shares Wave
  // headroom, never the destination of an already sounding Wave voice.
  const routeLane=slot=>slot;
  let config=null,disposed=false,owner=null,preparedGrid=null,preparedParticleGrid=null,placementState={};
  const isNodal=id=>typeof id==='string'&&id.startsWith('nodal:');
  // DSP units and global voice occupancy have different owners. One actual
  // voice consumes one global ticket; this processor accounts its real DSP class.
  // N20 uses the common measured N7 full-voice price. Natural tails retain
  // their ORIGINAL N5 price; neither running DSP nor physical tickets change.
  function surfaceCost(plan,rate=48000){return nodalLivePlanCosts(plan,rate).attack;}
  function find(id){
    if(!isNodal(id))return null;
    if(id===__XenNodalFactoryTroodleKey)return __XenNodalBuiltinTroodle;
    const owned=typeof __XenSongInstrumentDefinitions!=='undefined'?__XenSongInstrumentDefinitions.find(id):null;if(owned)return owned;
    try{return library.list().find(entry=>'nodal:'+entry.id+'@'+entry.revision===id)?.instrument??null;}
    catch{return null;}
  }
  function options(existing=[]){
    // Do not compile every library instrument on React render. The compiler
    // belongs to P2B's asynchronous preparation, not the dropdown.
    let entries=[];try{entries=library.list();}catch{}
    const owned=typeof __XenSongInstrumentDefinitions!=='undefined'?__XenSongInstrumentDefinitions.options('nodal'):[];
    const factoryChoice = {value:__XenNodalFactoryTroodleKey,label:'troodle · Nodal + EQ (Factory)',hint:'7-node coupled-modal sound with original factory EQ · built in',originLabel:'Nodal'};
    return [...existing,...owned,factoryChoice,...entries.filter(entry=>!owned.some(option=>option.value==='nodal:'+entry.id+'@'+entry.revision)&&entry.instrument?.nodes?.some(n=>!n.muted))
      .map(entry=>({value:'nodal:'+entry.id+'@'+entry.revision,label:entry.instrument.name+' · Nodal',
        hint:'Direkte Synthese · '+entry.instrument.nodes.length+' Nodes',originLabel:'Nodal Sounddesign'}))];
  }
  // P3C: route/FX graph ownership is staged on the control side. Repeated
  // live notes may compare intent, but must not reconnect an unchanged graph.
  function sameRoute(route,main,aux,context){
    if(!route||route.context!==context||route.main!==main||route.aux.length!==aux.length)return false;
    for(let i=0;i<aux.length;i++)if(route.aux[i]!==aux[i])return false;
    return true;
  }
  // Compare event destinations without normalization/allocations per attack.
  // Publication owns deduplication; the stable route is already prepared.
  const emptyAux=Object.freeze([]);
  function sameEventRoute(route,main,aux,context){
    if(!route||route.context!==context)return false;
    // Compare the same destination that the player actually connects.
    const requestedMain=main;
    main=typeof __XenLoopRec!=='undefined'?__XenLoopRec.route(context,routeLane(route.lane),main):main;
    if(route.main!==main)return false;
    let count=0;
    for(let i=0;i<aux.length;i++){
      const target=aux[i];if(!target||target===main||target===requestedMain)continue;
      let duplicate=false;for(let j=0;j<i;j++)if(aux[j]===target){duplicate=true;break;}
      if(duplicate)continue;
      if(!route.aux.includes(target))return false;count++;
    }
    return count===route.aux.length;
  }
  function publishRoute(lane,main,aux=[],context=config?.getContext()){
    const key=routeLane(lane);
    if(disposed||!['wave','particle','keyboard'].includes(key)||!context||!main||!Array.isArray(aux))return false;
    // The control owner supplies a bus; note dispatch may already supply its
    // LoopRec/EQ input. Normalize before comparison, as player.route does.
    const requestedMain=main;
    main=typeof __XenLoopRec!=='undefined'?__XenLoopRec.route(context,key,main):main;
    const targets=[];for(const target of aux)if(target&&target!==main&&target!==requestedMain&&!targets.includes(target))targets.push(target);
    const previous=routeOwners.get(key);
    const same=sameRoute(previous,main,targets,context);
    if(!same){routeOwners.set(key,{lane:key,main,aux:targets,context});if(typeof __XenSoundTrace!=='undefined')__XenSoundTrace.mark('fx-route-republished',key,{auxCount:targets.length,mainChanged:previous?.main!==main,contextChanged:previous?.context!==context},context);}
    const route=routeOwners.get(key),player=owner?.context===context?owner.player:null;
    if(player&&(!same||previous?.player!==player)){
      player.route?.(key,route.main,route.aux);
      route.player=player;
    }
    return true;
  }
  let observingDefinitions=false;
  function definitionsChanged(){
    if(disposed)return;__XenNodalHoldPCM.stopAll();clearHoldPreparations();preparedGrid=null;preparedParticleGrid=null;
    for(const [lane,slot]of lanes){const id=slot.id;slot.stamp++;slot.pending=null;releaseSelection(slot);if(isNodal(id))void select(lane,id);}
  }
  function observeDefinitions(){
    if(!observingDefinitions&&typeof window!=='undefined'){window.addEventListener('xensonar:song-instrument-definitions-changed',definitionsChanged);observingDefinitions=true;}
  }
  observeDefinitions();
  function configure(next){config=next;disposed=false;preparedGrid=null;preparedParticleGrid=null;observeDefinitions();}

  function playerFor(context){
    if(owner?.context===context&&!owner.player?.snapshot?.().disposed)return owner.promise;
    // One player generation owns its voice handles. Retire its handles before
    // creating another player (whose local voice IDs may start at voice-1).
    if(owner){clearHoldPreparations();releaseLive();owner.player?.dispose();}
    const current={context,player:null,promise:null};owner=current;
    current.promise=live.createPlayer(context,config.getOutput(context),{
      acquire:(cost,lane)=>!disposed&&owner===current&&(lane==='wave'||lane==='particle')?config.acquire(lane,1,context):null,
      onError:error=>{if(owner===current&&!disposed)config?.onError?.(error);},onEnded:id=>{if(owner===current){heldVoices.delete(id);liveVoices.delete(id);}}
    },{costForPlan:surfaceCost,tailCostForPlan:(plan,rate)=>nodalLivePlanCosts(plan,rate).tail,maxCost:16,maxVoices:32,tailCostScale:.75,preserveTails:true,prepareOnControl:true,separateLanes:true,separateKeyboard:true,sharedCapacity:true,priority:'secondary'}).then(player=>{
      if(disposed||owner!==current){player.dispose();return null;}
      current.player=player;player.placement?.(placementState);return player;
    }).catch(error=>{if(owner===current)owner=null;throw error;});
    return current.promise;
  }
  async function prepareHold(lane,id){
    if(!['wave','keyboard'].includes(lane)||!isNodal(id)||disposed||!config)return null;
    const instrument=find(id),ctx=config.getContext();
    if(!instrument||!ctx||ctx.state!=='running')return null;
    const previous=holdReady.get(lane);
    if(previous?.id===id&&previous.instrument===instrument&&previous.context===ctx&&(previous.player===owner?.player||previous.promise&&!previous.player))
      return previous.promise??previous;
    const stamp=(previous?.stamp??0)+1;
    if(previous?.pinned)previous.player.unpin?.(previous.instrument);
    const entry={id,instrument,context:ctx,stamp,player:null,pinned:false,promise:null};
    holdReady.set(lane,entry);
    entry.promise=(async()=>{
      try{const player=await playerFor(ctx);if(!player||disposed||holdReady.get(lane)!==entry)return null;
        await player.prepare(instrument);
        if(disposed||holdReady.get(lane)!==entry||owner?.player!==player||ctx!==config.getContext())return null;
        if(player.pin?.(instrument)!==true)return null;
        entry.player=player;entry.pinned=true;entry.promise=null;
        const route=routeOwners.get(routeLane(lane))??config.prepareRoute?.(routeLane(lane),ctx);
        publishRoute(lane,route?.main??config.getOutput(ctx),route?.aux??[],ctx);
        return entry;
      }catch{return null;}
    })();
    return entry.promise;
  }
  function clearHoldPreparations(){for(const entry of holdReady.values())if(entry.pinned)entry.player.unpin?.(entry.instrument);holdReady.clear();}
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
      __XenNodalHoldPCM.stopAll();slot.id=id;slot.stamp++;slot.pending=null;slot.error=null;slot.phase='idle';releaseSelection(slot);return null;
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
        if(player.pin?.(instrument)!==true)throw new Error('Nodal prepared plan cannot be pinned');
        try{
          const route=routeOwners.get(routeLane(lane))??config.prepareRoute?.(routeLane(lane),context);
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
    const route=routeOwners.get(routeLane(lane))??config.prepareRoute?.(routeLane(lane),context);
    publishRoute(lane,route?.main??config.getOutput(context),route?.aux??[],context);
    return player.noteOn(instrument,{frequency:hz,velocity:.8,gain:Math.max(0,Math.min(1,options.gain??.18)),admissionLane:audioLane(lane),routeLane:routeLane(lane),mixLane:options.placementLane??lane,agentIndex:options.agentIndex,held:false,
      durationSec:Math.max(.02,Math.min(2,options.durationSec??.25)),seed:instrument.seed},context.currentTime+.008);
  }
  function note(lane,id,options={},context){
    const slot=lanes.get(lane),hold=(options.nodalHoldKeyId||options.nodalExpressiveHoldOneShot===true)?holdReady.get(lane):null;
    const preparedHold=hold?.id===id&&hold.context===context&&hold.pinned?hold:null;
    const ready=slot?.ready?.id===id?slot.ready:preparedHold;
    if(disposed||!isNodal(id)||!ready||ready.id!==id||(!preparedHold&&(slot.id!==id||slot.phase!=='ready'))||ready.context!==context||context?.state!=='running'||owner?.player!==ready.player){
      if((options.nodalHoldKeyId||options.nodalExpressiveHoldOneShot===true)&&isNodal(id)&&!disposed)void prepareHold(lane,id);
      traceNodalNote(lane,id,options,ready,null,'pre-dispatch-rejected',!ready?'not-ready':'selection-context');if(typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('nodal-surface',lane,!ready?'not-ready':'selection-context',options.startSec,options.traceId);return null;
    }
    const now=context.currentTime;
    if(Number.isFinite(options.requestedAtMs)&&typeof performance!=='undefined'&&performance.now()-options.requestedAtMs>24){if(typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('nodal-surface',lane,'late-request',options.startSec,options.traceId);return null;}
    const clock=options.nodalHoldClock;
    let start=Number.isFinite(options.startSec)?options.startSec:now+.008;
    if(clock&&Number.isFinite(clock.startSec)&&clock.intervalMs>=4){
      const period=clock.intervalMs/1000;
      start=clock.startSec+Math.max(0,Math.ceil((now+.004-clock.startSec)/period-1e-9))*period;
    }
    if(!Number.isFinite(start)||start<now-.008||start>now+2){if(typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('nodal-surface',lane,'invalid-start',start,options.traceId);return null;}
    const hz=options.frequency;if(!Number.isFinite(hz)||hz<5||hz>12000){if(typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('nodal-surface',lane,'invalid-frequency',start,options.traceId);return null;}
    const gain=Math.max(0,Math.min(1,Number.isFinite(options.gain)?options.gain:.5));
    // The control owner normally published this route during FX/selection changes.
    // Preserve rare event-specific destinations without touching the common graph.
    if(options.output){
      const route=routeOwners.get(routeLane(lane)),aux=options.auxTargets??emptyAux;
      if(!sameEventRoute(route,options.output,aux,context))
        publishRoute(lane,options.output,aux,context);
    }
    if(typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('nodal-surface',lane,'bound',start,options.traceId,{desired:id,active:ready.id});
    const holdKey=options.nodalHoldKeyId&&(lane==='keyboard'||lane==='wave')?lane+':'+options.nodalHoldKeyId:null;
    if(holdKey&&clock)holdClockControls.set(holdKey,{id,options:{...options,gain},signature:[id,options.nodalHoldGestureEpochMs,clock.intervalMs,clock.pattern.join(''),hz].join('|')+(clock.pitchSignature?'|'+clock.pitchSignature:'')+'|v:'+JSON.stringify(clock.slotVolumes??null)+'|m:'+JSON.stringify(clock.slotMicrotiming??null)});
    const resident=__XenNodalHoldPCM.play(lane,String(ready.programKey),ready.instrument,{...options,startSec:start,frequency:hz,gain},context);
    if(resident){traceNodalNote(lane,id,options,ready,resident,'nh01-resident');if(holdKey)retireFallbackHold(holdKey);return resident;}
    // Nodal PCM integration, limited to actually selected native Wave Starter presets.
    // No shadow instruments: source identity and revisions are owned by the existing library.
    // Keyboard Hold, particles, pitch/expression gestures and other dynamic voices stay DSP.
    const fixedDuration=Number.isFinite(options.durationSec)?Math.max(.02,Math.min(30,options.durationSec)):ready.instrument.articulation.durationSec;
    const pcmEligible=lane==='wave'&&options.held!==true&&!options.nodalHoldKeyId&&!options.nodalExpressiveHoldOneShot&&
      !options.pitchCurve&&!options.volumeCurve&&!options.forceLiveDSP&&
      Number.isFinite(fixedDuration)&&fixedDuration>=.02&&fixedDuration<=1.5&&
      Number.isSafeInteger(ready.instrument.seed)&&ready.instrument.seed>=0&&ready.instrument.seed<=2147483647;
    // Capture is passive and bounded. Failed or unsupported capture never prevents DSP notes.
    // Cache key is compiled semantic instrument identity + exact event parameters.
    // Even if DSP admission fails, a previously cold gesture must still
    // initiate exact-pitch preparation. Never tie readiness to an ACK.
    if(holdKey&&lane==='keyboard'){
      const playable=config.readKeyboardGridFrequencies?.();
      if(Array.isArray(playable)&&playable.length)ready.player.warmHoldPitches?.(
        ready.instrument,playable,{anchor:hz,velocity:.8,gain,seed:ready.instrument.seed});
    }
    const voice=ready.player.noteOn(ready.instrument,{frequency:hz,velocity:.8,gain,admissionLane:audioLane(lane),routeLane:routeLane(lane),mixLane:options.placementLane??lane,agentIndex:options.agentIndex,traceId:options.traceId,held:options.held===true||!!options.nodalHoldKeyId,
      durationSec:fixedDuration,seed:ready.instrument.seed,
      pcmG2:pcmEligible,pcmG2Mode:'auto',pcmG3Capture:pcmEligible,
      nodalHoldKeyId:options.nodalHoldKeyId,nodalHoldGestureEpochMs:options.nodalHoldGestureEpochMs,nodalHoldIntervalMs:options.nodalHoldIntervalMs,nodalHoldClock:clock,
      nodalTimbreEnabled:options.nodalTimbreEnabled===true,nodalTimbreX:options.nodalTimbreX},start);
    traceNodalNote(lane,id,options,ready,voice,voice?'player-submitted':'player-rejected');if(voice){if(lane!=='particle'||options.held===true)liveVoices.set(voice.id,voice);if(options.held===true)heldVoices.set(voice.id,{lane,voice});if(holdKey)fallbackHoldVoices.set(holdKey,voice);}return voice;
  }
  // NODAL-X01: Each active keyboard/Enter Hold retains its own gesture/epoch.
  // No polyphony restart, no plan rebuild and no audio routing change.
  function setHoldX(name,u){
    if(!Number.isFinite(u))return 0;
    const lane=name==='klaviatur'?'keyboard':name==='wellenstart'?'wave':null;
    if(!lane)return 0;
    const x=Math.max(0,Math.min(1,u));let count=0;
    for(const [key,voice] of fallbackHoldVoices)if(key.startsWith(lane+':')&&voice?.setTimbreX?.(x))count++;
    return count;
  }
  function stopHoldClocks(){for(const [key,voice]of fallbackHoldVoices)if(voice.isHoldClock){voice.noteOff();fallbackHoldVoices.delete(key);holdClockControls.delete(key);liveVoices.delete(voice.id);}}
  function syncHoldClock(lane,gesture,pattern,id,ctx,hz,pitchState,slotVolumes,slotMicrotiming){
    const key=lane+':'+gesture.keyId,voice=fallbackHoldVoices.get(key);
    if(!voice?.isHoldClock)return;
    // Key-up/blur uses the existing release path. Sustain/preset changes retire
    // this clock so the existing non-clock gesture path can take ownership.
    if(gesture.hpm02Expressive||gesture.sustainExtendActive||gesture.sustainExtendLatched||!gesture.active){retireFallbackHold(key);return;}
    const slot=lanes.get(lane),hold=holdReady.get(lane),ready=slot?.ready?.id===id?slot.ready:hold?.id===id?hold:null;
    if(!ready||ready.context!==ctx){retireFallbackHold(key);return;}
    const control=holdClockControls.get(key);if(!control||control.id!==id){retireFallbackHold(key);return;}
    // PRECISION03: gesture Hz is BEFORE zhe's octave/sector transform. Only
    // the normal note path owns resolved playback Hz (and live retargeting).
    // A rhythm update preserves that exact Hz, gain, lane and render identity.
    const signature=[id,gesture.startedAtMs,gesture.intervalMs,pattern.join(''),control.options.frequency].join('|')+(pitchState?'|'+pitchState.signature:'')+'|v:'+JSON.stringify(slotVolumes??null)+'|m:'+JSON.stringify(slotMicrotiming??null);
    if(control.signature===signature)return;
    note(lane,id,{...control.options,requestedAtMs:undefined,traceId:undefined,nodalHoldKeyId:gesture.keyId,nodalHoldGestureEpochMs:gesture.startedAtMs,
      nodalHoldIntervalMs:gesture.intervalMs,held:true,
      nodalHoldClock:{startSec:ctx.currentTime+(gesture.startedAtMs-performance.now())/1000+.008,
        intervalMs:gesture.intervalMs,pattern,slotVolumes,slotMicrotiming,...(pitchState?{pitchRatios:pitchState.ratios,pitchSignature:pitchState.signature}: {})}},ctx);
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
    __XenNodalHoldPCM.stopAll();
    if(observingDefinitions){window.removeEventListener('xensonar:song-instrument-definitions-changed',definitionsChanged);observingDefinitions=false;}
    disposed=true;clearHoldPreparations();releaseLive();owner?.player?.dispose();owner=null;
    for(const slot of lanes.values()){slot.stamp++;slot.id=null;releaseSelection(slot);}
    lanes.clear();heldVoices.clear();liveVoices.clear();routeOwners.clear();preparedGrid=null;preparedParticleGrid=null;fallbackHoldVoices.clear();holdClockControls.clear();
  }
  function releaseHeld(){for(const {voice}of heldVoices.values())voice.noteOff();heldVoices.clear();}
  function releaseParticles(){
    const count=owner?.player?.stopLane?.('particle')??0;
    for(const [id,held]of heldVoices)if(held.lane==='particle'){heldVoices.delete(id);liveVoices.delete(id);}
    return count;
  }
  function releaseLive(){
    fallbackHoldVoices.clear();holdClockControls.clear();
    // Cut each owned handle at most once. Invalidation precedes callbacks,
    // and the Worklet retains its own physical lifetime until acknowledgement.
    try{for(const voice of liveVoices.values())__xenCutOwnedVoice(voice);}
    finally{liveVoices.clear();heldVoices.clear();}
  }
  return Object.freeze({prepareHold,setHoldX,refreshPitch:()=>{const ctx=config?.getContext?.();if(ctx)warmWaveField(ctx)},placement:state=>{placementState=state??{};owner?.player?.placement?.(placementState)},configure,publishRoute,select,note,preview,selectionStatus,traceControl,traceSnapshot,recipeForLane:lane=>{const slot=lanes.get(lane);if(!slot||!isNodal(slot.id))return null;const instrument=slot.ready?.instrument??find(slot.id);return instrument?{id:slot.id,instrument:model.normalize(instrument)}:null;},debugRecipeFlow:lane=>{
    // Read-only, on-demand source-of-truth inspection. No PCM render, timer,
    // acoustic processing or mutation of the instrument library.
    const slot=lanes.get(lane),hold=holdReady.get(lane),selected=slot?.id?find(slot.id):null;
    const describe=(id,instrument,programKey)=>{
      if(!instrument)return null;
      const n=model.normalize(instrument);
      return {id:id??null,name:n.name,schemaVersion:n.schemaVersion,kernelVersion:n.kernelVersion,
        material:n.material??null,nodeCount:n.nodes.length,acousticKey:model.semanticKey(n),
        programToken:programKey==null?null:String(programKey)};
    };
    const requested=describe(slot?.id,selected,null);
    const prepared=describe(slot?.ready?.id,slot?.ready?.instrument,slot?.ready?.programKey);
    const holdPrepared=describe(hold?.id,hold?.instrument,null);
    return {lane,desiredId:slot?.id??null,phase:slot?.phase??'idle',error:slot?.error??null,
      requested,prepared,holdPrepared,
      requestedMatchesPrepared:requested&&prepared?requested.acousticKey===prepared.acousticKey:null,
      requestedMatchesHoldPrepared:requested&&holdPrepared?requested.acousticKey===holdPrepared.acousticKey:null,
      preparedProgramReady:!!slot?.ready&&slot?.context===config?.getContext()&&owner?.player===slot.ready.player,
      holdProgramReady:!!hold?.pinned&&hold?.context===config?.getContext()&&owner?.player===hold.player,
      fallbackHeldVoices:[...fallbackHoldVoices.keys()].filter(key=>key.startsWith(lane+':')).length};
  },pcmDiagnostics:()=>({cache:owner?.player?.pcmG2Status?.()??null,capture:owner?.player?.pcmG3Status?.()??null}),options,warmParticleField,warmWaveField,releaseHeld,releaseParticles,releaseLive,releaseFallbackHold,muteFallbackHold,syncHoldClock,stopHoldClocks,endFallbackHoldGesture,dispose,snapshot:()=>{
    const status=owner?.player?.snapshot();if(!status)return null;
    const programs=new Set();for(const slot of lanes.values())if(acceptsGrid(slot,owner?.context)&&slot.gridPrepared)programs.add(slot.gridPrepared);
    return {...status,gridCoverage:preparedGrid?{total:preparedGrid.total,requested:Math.min(2048,preparedGrid.total),limited:preparedGrid.total>2048}:null,
      particleGridCoverage:preparedParticleGrid?{roots:preparedParticleGrid.grid.roots.length,ratios:preparedParticleGrid.ratios.length,total:preparedParticleGrid.frequencies.length}:null,
      gridPrograms:[...programs].map(p=>({wave:!!p.wave,particle:!!p.particle,total:p.total,requested:p.requested,limited:p.total>p.requested}))};
  }});
}
