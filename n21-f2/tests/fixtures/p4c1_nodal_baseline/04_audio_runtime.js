function nodalWorkletProcessorFactory(createKernel, register, Base, rate, frameNow) {
  const dsp = createKernel();
  class NodalProcessor extends Base {
    constructor(options={}) {
      super();const policy=options.processorOptions??{};
      this.maxCost=policy.maxCost??8;this.maxVoices=policy.maxVoices??8;this.tailScale=policy.tailCostScale??1;this.separateLanes=!!policy.separateLanes;
      this.plans = new Map(); this.slots = Array(this.maxVoices).fill(null); this.slotEnd=0;this.hasRetired=false;this.cost = 0; this.running = true;
      this.records = Array.from({length:this.maxVoices},()=>({id:null,voice:null,plan:null,start:0,pooled:null,cost:0}));
      this.retireL = new Float32Array(128); this.retireR = new Float32Array(128); this.fadeL = new Float32Array(128); this.fadeR = new Float32Array(128);
      this.particleRetireL=new Float32Array(128);this.particleRetireR=new Float32Array(128);this.hasParticleRetired=false;
      this.port.onmessage = ({data}) => {
        try {
          if (data.type === 'plan') {
            if (this.plans.size >= 16 && !this.plans.has(data.id)) throw new Error('Nodal plan bank full');
            const plan=data.plan,pool=[];
            if(data.prepared)dsp.installPrepared(plan,data.prepared,rate);
            const reusable=plan.kernelVersion==='coupled-modal-v2'||(!plan.emiliaWeave&&!plan.emiliaMaterial);
            const tailScale=plan.kernelVersion==='coupled-modal-v2'&&plan.tailSec>0?this.tailScale:1;
            const target=reusable&&!plan.silent?Math.min(this.maxVoices,Math.floor(this.maxCost/(plan.cost*tailScale))):0;
            // P2: live players opt into a CONTROL-MESSAGE-PACED pool install.
            // Nothing heavy is built in process(), and no incomplete bank is ready.
            // Unmodified direct/Composer clients retain the original eager protocol.
            if(data.paced===true&&reusable&&!plan.silent&&!data.prepared)throw new Error('P2 paced Nodal pool requires control-prepared coefficients');
            const bank={plan,pool,reusable,building:data.paced===true&&target>0,target,prepared:!!data.prepared};
            if(bank.building){
              this.plans.set(data.id,bank);
              this.port.postMessage({type:'stage-needed',id:data.id});
            }else{
              for(let i=0;i<target;i++){
                const voice=dsp.voice(plan,{},rate);
                if(typeof voice.reset!=='function')throw new Error('Nodal reusable voice unavailable');
                pool.push({voice,busy:false});
              }
              this.plans.set(data.id,bank);
              if(reusable&&!plan.silent&&!data.prepared)dsp.preparePitches?.(plan,[plan.referenceHz??220],rate);
              this.port.postMessage({type:'ready',id:data.id});
            }
          } else if(data.type==='stage'){
            const bank=this.plans.get(data.id);
            if(!bank?.building)return;
            // One state construction per port message; later requests are paced
            // by the host and never scheduled from the audio render callback.
            const voice=dsp.voice(bank.plan,{},rate);
            if(typeof voice.reset!=='function')throw new Error('Nodal reusable voice unavailable');
            bank.pool.push({voice,busy:false});
            if(bank.pool.length<bank.target)this.port.postMessage({type:'stage-needed',id:data.id});
            else{
              bank.building=false;
              this.port.postMessage({type:'ready',id:data.id});
            }
          } else if(data.type==='pitches'){const bank=this.plans.get(data.id);if(bank&&bank.reusable){if(data.prepared)dsp.installPrepared(bank.plan,data.prepared,rate);else dsp.preparePitches?.(bank.plan,data.frequencies,rate);}
          } else if (data.type === 'forget') { this.plans.delete(data.id); }
          else if (data.type === 'note') {
            const bank=this.plans.get(data.planId),plan=bank?.building?null:bank?.plan,slot=this.slots.indexOf(null);
            const now = frameNow(), start = Math.round(data.startSec * rate);
            if (!plan || slot < 0 || this.cost + plan.cost > this.maxCost || !Number.isFinite(start) || start < now - Math.round(rate * .008) || start > now + rate * 2) {
              const reason = !plan ? 'plan missing' : slot < 0 || this.cost + plan.cost > this.maxCost ? 'voice capacity' : !Number.isFinite(start) ? 'invalid start' : start < now - Math.round(rate * .008) ? 'late' : 'too far ahead';
              this.port.postMessage({type: 'rejected', id: data.id, reason}); return;
            }
            let pooled=null,voice;
            if(bank.reusable){
              for(let i=0;i<bank.pool.length;i++)if(!bank.pool[i].busy){pooled=bank.pool[i];break;}
              if(!pooled){this.port.postMessage({type:'rejected',id:data.id,reason:'voice capacity'});return;}
              voice=pooled.voice;voice.reset(data.options);pooled.busy=true;
            }else voice=dsp.voice(plan,data.options,rate);
            const record=this.records[slot];record.id=data.id;record.voice=voice;record.plan=plan;record.start=Math.max(now,start);record.pooled=pooled;record.cost=plan.cost;record.lane=data.lane==='particle'?1:0;
            this.slots[slot]=record;this.slotEnd=Math.max(this.slotEnd,slot+1);this.cost+=plan.cost;
            this.port.postMessage({type: 'started', id: data.id});
          } else if (data.type === 'release' || data.type === 'frequency') {
            for (const s of this.slots) if (s && s.id === data.id) data.type === 'release' ? s.voice.noteOff() : s.voice.setFrequency(data.frequency);
          } else if (data.type === 'stop') { for(let i=0;i<this.slots.length;i++){const s=this.slots[i];if(!s)continue;if(s.plan.kernelVersion==='coupled-modal-v2')this.retire(i);else s.voice.noteOff();} }
          else if (data.type === 'retire') { const index=this.slots.findIndex(s=>s&&s.id===data.id&&s.plan.kernelVersion==='coupled-modal-v2'&&s.voice.released); if(index>=0)this.retire(index); }
          else if (data.type === 'dispose') { this.running = false; this.slots.fill(null);this.slotEnd=0; this.plans.clear(); this.cost = 0; }
        } catch (error) {
          // A failed partial pool must not reserve one of the 16 plan slots.
          if(data.type==='plan'||data.type==='stage')this.plans.delete(data.id);
          this.port.postMessage({type: 'error', id: data.id, message: String(error.message)});
        }
      };
    }
    process(inputs, outputs) {
      const output = outputs[0]; if (!output?.[0]) return this.running;
      if(outputs[1]?.[0]){outputs[1][0].fill(0);outputs[1][1]?.fill(0);}
      const left = output[0], right = output[1] ?? left; left.fill(0); if (right !== left) right.fill(0);
      // Retire buffers are exceptional control-path fades. Empty blocks never
      // mix/clear 256 zero samples or traverse all 32 prepared voice slots.
      if(this.hasRetired){const count=Math.min(128,left.length);for(let i=0;i<count;i++){left[i]+=this.retireL[i];if(right!==left)right[i]+=this.retireR[i];}this.retireL.fill(0);this.retireR.fill(0);this.hasRetired=false;}
      if(this.hasParticleRetired){const lane=outputs[1]??output,l=lane[0],r=lane[1]??l;for(let i=0;i<Math.min(128,l.length);i++){l[i]+=this.particleRetireL[i];if(r!==l)r[i]+=this.particleRetireR[i];}this.particleRetireL.fill(0);this.particleRetireR.fill(0);this.hasParticleRetired=false;}
      if(this.slotEnd===0)return this.running;
      const now = frameNow();
      for (let i = 0; i < this.slotEnd; i++) {
        const s = this.slots[i]; if (!s || s.start >= now + left.length) continue;
        const offset = Math.max(0, s.start - now),laneOutput=s.lane===1&&outputs[1]?.[0]?outputs[1]:output;
        try { s.voice.process(laneOutput[0],laneOutput[1]??laneOutput[0],offset,left.length-offset,true); }
        catch (error) { s.voice.noteOff(); this.port.postMessage({type: 'error', id: s.id, message: String(error.message)}); this.finish(i); continue; }
        if(s.voice.ended)this.finish(i);
        else if(this.tailScale<1&&s.voice.dryEnded&&s.plan.tailSec>0&&s.cost===s.plan.cost){
          const cost=s.plan.cost*this.tailScale;this.cost+=cost-s.cost;s.cost=cost;
          this.port.postMessage({type:'cost',id:s.id,cost});
        }
      }
      return this.running;
    }
    retire(index) {
      const s=this.slots[index];if(!s)return;this.fadeL.fill(0);this.fadeR.fill(0);s.voice.process(this.fadeL,this.fadeR);
      const particle=this.separateLanes&&s.lane===1,l=particle?this.particleRetireL:this.retireL,r=particle?this.particleRetireR:this.retireR;
      for(let i=0;i<128;i++){const gain=(1-i/127);l[i]+=this.fadeL[i]*gain;r[i]+=this.fadeR[i]*gain;}if(particle)this.hasParticleRetired=true;else this.hasRetired=true;this.finish(index);
    }
    finish(index) { const s = this.slots[index]; if (!s) return; this.cost -= s.cost; if(s.pooled)s.pooled.busy=false; this.slots[index] = null;if(index===this.slotEnd-1)while(this.slotEnd>0&&this.slots[this.slotEnd-1]===null)this.slotEnd--; this.port.postMessage({type: 'ended', id: s.id}); s.voice=null;s.plan=null;s.pooled=null; }
  }
  register('xensonar-nodal-instrument-v1', NodalProcessor);
}
// One main-side decision owns local DSP headroom and one physical ticket.
// The processor retains its independent final cap. No retry or tail eviction.
function createNodalAdmissionGate({maxVoices,maxCost,acquire}) {
  let reason=null;
  return {
    get reason(){return reason;},
    tryAcquire(activeVoices,activeCost,cost,lane){
      reason=null;
      if(!Number.isFinite(cost)||cost<=0||!Number.isFinite(activeVoices)||activeVoices<0||!Number.isFinite(activeCost)||activeCost<0||activeVoices>=maxVoices||activeCost+cost>maxCost){reason='dsp-budget';return null;}
      const ticket=acquire(cost,lane);
      if(!ticket){reason='global-ticket';return null;}
      let released=false;
      return {release(){if(!released){released=true;ticket.release();}}};
    }
  };
}

function createNodalLiveRuntime({model, kernelFactory}) {
  const modules = new WeakMap();
  async function createPlayer(context, destination, admission, policy = {}) {
    if (!context || context.state === 'closed' || !context.audioWorklet || !destination || typeof admission?.acquire !== 'function') throw new Error('Nodal audio adapter unavailable');
    let load = modules.get(context);
    if (!load) {
      const source = '(' + nodalWorkletProcessorFactory.toString() + ')(' + kernelFactory.toString() + ',registerProcessor,AudioWorkletProcessor,sampleRate,()=>currentFrame);';
      // Share the established file:/HTTP loader instead of maintaining a copy.
      load = jF(context, source, 'Nodal instrument');
      modules.set(context, load); load.catch(() => modules.delete(context));
    }
    await load;
    const node = new AudioWorkletNode(context, 'xensonar-nodal-instrument-v1', {numberOfInputs: 0, numberOfOutputs:policy.separateLanes?2:1, outputChannelCount:policy.separateLanes?[2,2]:[2],processorOptions:{maxCost:policy.maxCost??8,maxVoices:policy.maxVoices??8,tailCostScale:policy.tailCostScale??1,separateLanes:!!policy.separateLanes}});
    const laneRoutes=policy.separateLanes?[new Set(),new Set()]:null;
    if(!laneRoutes)node.connect(destination);
    const control=policy.prepareOnControl?kernelFactory():null;
    const maxCost=policy.maxCost??8,maxVoices=policy.maxVoices??8;
    const admissionGate=createNodalAdmissionGate({maxVoices,maxCost,acquire:(cost,lane)=>admission.acquire(cost,lane)});
    const plans = new Map(), pending = new Map(), active = new Map(), preparedReferences = new WeakMap(), pendingStarts = new Map(), pins = new Map(), preparing = new Map(); let sequence = 0, disposed = false, activeCost = 0;
    // Browser live surfaces: the eigenmodes, spectral banks and initial
    // coefficients are generated off the main/audio threads. Fake/legacy Node
    // harnesses without Web Workers retain the previous control path.
    const background = policy.prepareOnControl && typeof Worker === 'function' && typeof createNodalPreparationCoordinator === 'function'
      ? createNodalPreparationCoordinator({modelFactory:createNodalInstrumentModel,kernelFactory}) : null;
    // One scheduled installation step across all pending banks per host tick.
    const stageQueue=[],staged=new Set();let stageTimer=null;
    function flushStage(){
      stageTimer=null;if(disposed)return;
      const id=stageQueue.shift();if(id!=null){staged.delete(id);if(pending.has(id))node.port.postMessage({type:'stage',id});}
      if(stageQueue.length)stageTimer=setTimeout(flushStage,12);
    }
    function requestStage(id){
      if(disposed||!pending.has(id)||staged.has(id))return;
      staged.add(id);stageQueue.push(id);
      if(stageTimer===null)stageTimer=setTimeout(flushStage,12);
    }
    function confirmStart(id, error) {
      const entry = pendingStarts.get(id); if (!entry) return;
      pendingStarts.delete(id); clearTimeout(entry.timer);
      if (error) entry.reject(error); else entry.resolve();
    }
    function release(id) { const record = active.get(id); if (!record) return; active.delete(id); activeCost = active.size ? Math.max(0,activeCost-record.cost) : 0; record.ticket.release();admission.onEnded?.(id); }
    function failAll() {
      for (const id of Array.from(active.keys())) release(id);
      for (const id of Array.from(pendingStarts.keys())) confirmStart(id, new Error('Nodal processor unavailable'));
      for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(new Error('Nodal processor unavailable')); } pending.clear();
    }
    node.onprocessorerror = () => { dispose(); admission.onError?.(new Error('Nodal-Audioprozessor ausgefallen. Bitte Wiedergabe neu starten.')); };
    node.port.onmessage = ({data}) => {
      if (data.type === 'stage-needed') {requestStage(data.id);} else if (data.type === 'ready') { const entry = pending.get(data.id); if (entry) { clearTimeout(entry.timer); pending.delete(data.id); entry.resolve(); } }
      // 'started' is the existing receipt acknowledgement, which can precede
      // a scheduled note. Trace it as accepted, never as measured audio output.
      else if (data.type === 'started') { const record=active.get(data.id);if(record?.traceId&&typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('worklet',record.lane,'accepted',record.startSec,record.traceId,{voiceId:data.id,programId:record.planId});confirmStart(data.id); }
      else if(data.type==='cost'){const record=active.get(data.id);if(record&&Number.isFinite(data.cost)&&data.cost>0&&data.cost<=record.cost){activeCost+=data.cost-record.cost;record.cost=data.cost;}}
      else if(data.type==='ended'){const record=active.get(data.id);if(record?.traceId&&typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('worklet',record.lane,'ended',void 0,record.traceId,{voiceId:data.id,programId:record.planId});confirmStart(data.id);release(data.id);}
      else if (data.type === 'rejected' || data.type === 'error') {
        const record=active.get(data.id);
        if(record?.traceId&&typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('worklet',record.lane,data.type+':'+(data.reason??data.message??'unknown'),record.startSec,record.traceId,{voiceId:data.id,programId:record.planId});
        const error = new Error('Nodal: ' + (data.message ?? data.reason ?? 'Worklet rejected note'));
        error.reason = data.reason; confirmStart(data.id, error);
        if (data.type === 'error' && !pending.has(data.id)) admission.onError?.(error);
        release(data.id);
        const entry = pending.get(data.id); if (entry) { clearTimeout(entry.timer); pending.delete(data.id); plans.delete(entry.key); entry.reject(new Error(data.message ?? data.reason ?? 'Nodal plan rejected')); }
      }
    };
    async function prepare(instrument) {
      if (disposed) throw new Error('Nodal player disposed');
      if (!Object.isFrozen(instrument)) throw new Error('Prepare a normalized immutable Nodal instrument');
      const key = model.semanticKey(instrument);
      if (plans.has(key)) {preparedReferences.set(instrument,plans.get(key));return plans.get(key).promise;}
      // The same timbre can be selected by Wave and Particle concurrently.
      // A single background job owns its compile and later Worklet install.
      if (preparing.has(key)) {
        const record=await preparing.get(key);preparedReferences.set(instrument,record);return record;
      }
      const work=(async()=>{
        let compiled,prepared,workerPlanId;
        if(background){
          // Shared envelope interpretation is currently owned by the Melodic
          // editor. The bounded curve resolution stays on the host; acoustic
          // plan, tables and prepared coefficients run only in the worker.
          const contours=typeof resolveNodalArticulationFields==='function'
            ?resolveNodalArticulationFields(instrument.articulation)
            :{volumeCurve:null,pitchCurve:null};
          if(typeof resolveNodalArticulationFields!=='function' && (instrument.articulation.volumeEnvelope||instrument.articulation.pitchEnvelope))throw new Error('Shared envelope resolver unavailable');
          const result=await background.prepare(instrument,context.sampleRate,contours);
          compiled=result.plan;prepared=result.prepared;workerPlanId=result.workerPlanId;
        }else{
          // Compatibility only: runtimes without a Web Worker use P2A's
          // pre-onset control preparation. No synchronous fallback is
          // attempted after a worker fails in a supported browser.
          compiled=model.compile(instrument);
          prepared=control?.preparePacket(compiled,[compiled.referenceHz??220],context.sampleRate,true);
        }
        if(disposed)throw new Error('Nodal player disposed');
        const cost=typeof policy.costForPlan==='function'?policy.costForPlan(compiled,context.sampleRate):compiled.cost;
        if(compiled.silent||!Number.isFinite(cost)||cost<compiled.cost||cost>maxCost)throw new Error('Nodal plan exceeds live budget');
        if(plans.size>=16){
          const removable=Array.from(plans.entries()).find(([,record])=>record.ready&&!pins.get(record)&&!Array.from(active.values()).some(v=>v.planId===record.id));
          if(!removable)throw new Error('Nodal live plan bank full');
          plans.delete(removable[0]);pins.delete(removable[1]);background?.forget?.(removable[1].workerPlanId);node.port.postMessage({type:'forget',id:removable[1].id});
        }
        const plan=cost===compiled.cost?compiled:{...compiled,cost},id='plan-'+(++sequence),record={id,plan,ready:false,workerPlanId};
        record.promise=new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>{
            pending.delete(id);plans.delete(key);
            background?.forget?.(workerPlanId);
            if(!disposed)node.port.postMessage({type:'forget',id});
            reject(new Error('Nodal plan preparation timed out'));
          },5000);
          pending.set(id,{key,timer,resolve:()=>{record.ready=true;resolve(record);},reject});
        });
        plans.set(key,record);
        try{node.port.postMessage({type:'plan',id,plan,paced:!!control,prepared});}
        catch(error){const entry=pending.get(id);if(entry){clearTimeout(entry.timer);pending.delete(id);plans.delete(key);entry.reject(error);}}
        return record.promise;
      })();
      preparing.set(key,work);
      try{const record=await work;preparedReferences.set(instrument,record);return record;}
      finally{if(preparing.get(key)===work)preparing.delete(key);}
    }
    function pin(instrument) {
      const record=instrument&&preparedReferences.get(instrument);
      if(disposed||!record?.ready||plans.get(record.plan.key)!==record)return false;
      pins.set(record,(pins.get(record)??0)+1);return true;
    }
    function unpin(instrument) {
      const record=instrument&&preparedReferences.get(instrument);if(!record)return false;
      const count=pins.get(record)??0;
      if(count<=1)pins.delete(record);else pins.set(record,count-1);
      return count>0;
    }
    function noteOn(instrument, options = {}, startSec = context.currentTime) {
      const traceId=options.traceId??(typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled?__XenAudioProbe.begin(options.admissionLane??'nodal',startSec,'renderer-direct'):null);
      if (disposed || context.state !== 'running') { if(typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('nodal-player',options.admissionLane??'nodal','context',startSec,traceId);return null; }
      const prepared = instrument && preparedReferences.get(instrument);
      if (!prepared?.ready || prepared.plan.silent || !Number.isFinite(startSec) || startSec < context.currentTime - .008 || startSec > context.currentTime + 2) { if(typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('nodal-player',options.admissionLane??'nodal',!prepared?.ready?'not-prepared':startSec<context.currentTime-.008?'late':'invalid-start',startSec,traceId);return null; }
      const frequency = options.frequency ?? instrument.referenceHz, velocity = options.velocity ?? .7;
      if (!Number.isFinite(frequency) || frequency < 5 || frequency > 12000 || !Number.isFinite(velocity) || velocity < 0 || velocity > 1) return null;
      const gain=options.gain??.7,duration=options.durationSec??instrument.articulation.durationSec;
      if(!Number.isFinite(gain)||gain<0||gain>1||!Number.isFinite(duration)||duration<.02||duration>30)return null;
      for(const key of ['attackSec','releaseSec'])if(options[key]!=null&&(!Number.isFinite(options[key])||options[key]<0||options[key]>3))return null;
      if (plans.get(prepared.plan.key) !== prepared) {if(typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('nodal-player',options.admissionLane??'nodal','plan-evicted',startSec,traceId);return null;}
      const limit=maxCost;
      if (policy.preserveTails!==true && (active.size >= maxVoices || prepared.plan.cost + activeCost > limit)) {
        // Release only spent natural tails. Fresh/held attacks retain ownership.
        for(const [id,record] of active){
          if(!record.natural || (!record.releasing && record.gateEnd > context.currentTime - .008))continue;
          node.port.postMessage({type:'retire',id});release(id);
          if(active.size<maxVoices && prepared.plan.cost+activeCost<=limit)break;
        }
      }
      const ticket = admissionGate.tryAcquire(active.size,activeCost,prepared.plan.cost,options.admissionLane);
      if (!ticket) { if(typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('nodal-player',options.admissionLane??'nodal',admissionGate.reason,startSec,traceId);return null; }
      const id = 'voice-' + (++sequence); active.set(id, {ticket, lane:options.admissionLane??'nodal', traceId:traceId??null,startSec,planId: prepared.id, cost: prepared.plan.cost, natural:prepared.plan.kernelVersion==='coupled-modal-v2'&&prepared.plan.tailSec>0, gateEnd:options.held===true?Infinity:startSec+(options.durationSec??instrument.articulation.durationSec), releasing:false}); activeCost += prepared.plan.cost;
      let started = null;
      if (options.confirmStart === true) {
        started = new Promise((resolve, reject) => {
          const timer = setTimeout(() => { confirmStart(id, new Error('Nodal: audio worklet did not confirm note start')); dispose(); }, 1200);
          pendingStarts.set(id, {timer, resolve, reject});
        });
        // Other callers may release the note before awaiting acknowledgement.
        started.catch(() => {});
      }
      try { node.port.postMessage({type: 'note', id, planId: prepared.id, startSec,lane:options.admissionLane, options: {frequency, velocity, gain,
        durationSec:duration, held: options.held === true, seed: options.seed ?? instrument.seed,
        volumeCurve: options.volumeCurve, pitchCurve: options.pitchCurve, attackSec: options.attackSec, releaseSec: options.releaseSec}}); }
      catch (error) { if(typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('nodal-player',options.admissionLane??'nodal','submit-error',startSec,traceId,{voiceId:id,programId:prepared.id});confirmStart(id, error); release(id); throw error; }
      if(typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('nodal-player',options.admissionLane??'nodal','submitted',startSec,traceId,{voiceId:id,programId:prepared.id});
      return Object.freeze({id, started, noteOff: () => { const record=active.get(id);if(record){record.releasing=true;node.port.postMessage({type: 'release', id});} },
        setFrequency: hz => { if (!active.has(id) || !Number.isFinite(hz) || hz < 5 || hz > 12000) return false; node.port.postMessage({type: 'frequency', id, frequency: hz}); return true; }});
    }
    // At most one frequency job per preset is in flight. When moving roots
    // change faster than worker throughput, keep only the latest snapshot;
    // no stale coefficients or catch-up stream may reach the AudioWorklet.
    function dispatchFrequencyJob(record){
      const state=record.frequencyState;
      if(disposed||state.inflight||!state.latest||plans.get(record.plan.key)!==record)return;
      const current=state.latest,generation=state.generation;
      state.inflight=true;
      background.prepareFrequencies(record.workerPlanId,current,context.sampleRate).then(prepared=>{
        if(!disposed&&state.generation===generation&&plans.get(record.plan.key)===record){
          node.port.postMessage({type:'pitches',id:record.id,prepared});
        }
      }).catch(()=>{
        // Do not run a synchronous main-thread fallback on worker failure.
        // Uncached tones remain playable through the Worklet's own coefficients.
      }).finally(()=>{
        state.inflight=false;
        if(!disposed&&state.generation!==generation)dispatchFrequencyJob(record);
      });
    }
    function prepareFrequencies(instrument,frequencies,family='particle'){
      const record=preparedReferences.get(instrument);
      if(disposed||!record?.ready||plans.get(record.plan.key)!==record||!Array.isArray(frequencies)||frequencies.length>32||!['wave','particle'].includes(family))return false;
      // Preserve both current families when they share a timbre.
      const families=record.frequencyFamilies??(record.frequencyFamilies=new Map());families.set(family,frequencies.slice());
      const combined=new Set();for(const values of families.values())for(const hz of values)combined.add(hz);
      const current=[...combined];
      if(background&&record.workerPlanId!=null&&typeof background.prepareFrequencies==='function'){
        const state=record.frequencyState??(record.frequencyState={generation:0,inflight:false,latest:null});
        // Avoid reposting identical root sets (the same order is preserved).
        if(state.latest?.length===current.length&&state.latest.every((hz,i)=>hz===current[i]))return true;
        state.latest=current;state.generation++;dispatchFrequencyJob(record);
      }else{
        // Workerless compatibility only; supported browser runtimes never
        // invoke the synchronous controller for moving pitch families.
        node.port.postMessage({type:'pitches',id:record.id,frequencies:control?undefined:current,prepared:control?.preparePacket(record.plan,current,context.sampleRate)});
      }
      return true;
    }
    function route(lane,main,aux=[]){
      if(disposed||!laneRoutes||!main)return false;const index=lane==='particle'?1:0,owned=laneRoutes[index];
      let same=owned.has(main);for(const target of aux)if(target&&!owned.has(target))same=false;for(const target of owned)if(target!==main&&!aux.includes(target))same=false;
      // Reconcile by destination: connections only change when the route changes.
      if(same)return true;const next=new Set([main,...aux].filter(Boolean));
      for(const target of owned)try{node.disconnect(target,index,0);}catch{}
      owned.clear();for(const target of next){node.connect(target,index,0);owned.add(target);}return true;
    }
    function stop() { if (!disposed) node.port.postMessage({type: 'stop'}); }
    function dispose() { if (disposed) return; disposed = true; background?.dispose();preparing.clear(); if(stageTimer!==null)clearTimeout(stageTimer);stageTimer=null;stageQueue.length=0;staged.clear();pins.clear();failAll(); node.port.postMessage({type: 'dispose'}); node.disconnect(); node.port.close(); context.removeEventListener('statechange', onState); }
    function onState() { if (context.state === 'closed') dispose(); }
    context.addEventListener('statechange', onState);
    return Object.freeze({prepare,prepareFrequencies,route,noteOn,pin,unpin,stop,dispose,isPrepared:instrument=>{const record=preparedReferences.get(instrument);return !disposed&&!!record?.ready&&plans.get(record.plan.key)===record}, snapshot: () => ({readyPlans: plans.size, activeVoices: active.size, activeCost, maxCost,maxVoices,disposed,controlPrepared:!!control,separateLanes:!!laneRoutes})});
  }
  return Object.freeze({createPlayer});
}
const __XenNodalLive = createNodalLiveRuntime({model: __XenNodalModel, kernelFactory: createNodalSynthesisKernel});
