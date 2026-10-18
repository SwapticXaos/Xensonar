// N20: common currency for the N7 full renderer, not a change to the sound.
// N7's >=3-node attack/hold/gliss matrix saved at least 20.8% against N6.
// Spend 15% for 3 nodes, 20% for 7/12 nodes; only these measured complexity
// classes opt in. Other/V1 plans keep their old price. Tails retain the N5 price
// against the ORIGINAL cost, so the two discounts can never compound.
function nodalLivePlanCosts(plan, sampleRate=48000) {
  const modal=['coupled-modal-v1','coupled-modal-v2'].includes(plan.kernelVersion);
  const nodes=plan.nodes?.length??0, scale=Math.max(1,sampleRate/48000);
  const baseline=(modal?Math.max(plan.cost,Math.ceil(nodes/2)):plan.cost)*scale;
  const v2=plan.kernelVersion==='coupled-modal-v2';
  const discount=nodes===3?.85:nodes===7||nodes===12?.8:1;
  const attack=v2?Math.max(plan.cost*scale,baseline*discount):baseline;
  const tail=v2&&plan.tailSec>0?Math.min(attack,baseline*.75):attack;
  return {attack,tail,baseline,model:'n7-full-v1'};
}
// One cost ledger per AudioContext across explicitly participating Nodal
// players. Physical voice tickets remain owned by the established governor.
// Registration reserves room for the primary transport, never steals tails.
function createNodalCapacityLedger({maxCost=16,maxVoices=32,primaryReserve=2}={}) {
  let cost=0,voices=0,primaryOwners=0,rejected=0;
  const owners=new Set(), epsilon=1e-9;
  function reserve(){let units=primaryOwners?primaryReserve:0;for(const owner of owners)if(owner.primary)units=Math.max(units,owner.demand);return units;}
  function register(priority='secondary') {
    const tickets=new Set();let disposed=false;
    const primary=priority==='primary';if(primary)primaryOwners++;
    const owner={
      primary,demand:0,
      require(units){if(!disposed&&primary&&Number.isFinite(units)&&units>0)this.demand=Math.min(maxCost,Math.max(this.demand,units));},
      acquire(units){
        const ceiling=primary?maxCost:maxCost-reserve();
        if(disposed||!Number.isFinite(units)||units<=0||voices>=maxVoices||cost+units>ceiling+epsilon){rejected++;return null;}
        let current=units,released=false;cost+=units;voices++;
        const ticket={
          reduce(next){if(released||!Number.isFinite(next)||next<=0||next>current)return false;cost=Math.max(0,cost+next-current);current=next;return true;},
          release(){if(released)return;released=true;tickets.delete(ticket);cost=Math.max(0,cost-current);if(--voices===0)cost=0;}
        };
        tickets.add(ticket);return ticket;
      },
      dispose(){if(disposed)return;disposed=true;for(const ticket of tickets)ticket.release();if(primary)primaryOwners--;owners.delete(owner);}
    };
    owners.add(owner);return owner;
  }
  return Object.freeze({register,snapshot:()=>({activeCost:cost,activeVoices:voices,maxCost,maxVoices,primaryOwners,primaryReserve:reserve(),players:owners.size,rejected})});
}
function nodalWorkletProcessorFactory(createKernel, register, Base, rate, frameNow) {
  const dsp = createKernel();
  class NodalProcessor extends Base {
    constructor(options={}) {
      super();const policy=options.processorOptions??{};
      this.maxCost=policy.maxCost??8;this.maxVoices=policy.maxVoices??8;this.tailScale=policy.tailCostScale??1;this.separateLanes=!!policy.separateLanes;
      this.plans = new Map(); this.slots = Array(this.maxVoices).fill(null); this.slotEnd=0;this.hasRetired=false;this.cost = 0; this.running = true;
      this.records = Array.from({length:this.maxVoices},()=>({id:null,voice:null,plan:null,start:0,pooled:null,cost:0}));
      this.metrics={accepted:0,renderStarted:0,ended:0,rejected:0,processBlocks:0,activeBlocks:0,renderedVoiceFrames:0,peakVoices:0};
      this.rejectReasons=Object.create(null);
      this.retireL = new Float32Array(128); this.retireR = new Float32Array(128); this.fadeL = new Float32Array(128); this.fadeR = new Float32Array(128);
      this.placementState={};this.panL=new Float32Array(128);this.panR=new Float32Array(128);
      this.particleRetireL=new Float32Array(128);this.particleRetireR=new Float32Array(128);this.hasParticleRetired=false;
      this.port.onmessage = ({data}) => {
        try {
          if(data.type==='diagnostic'){
            // Cold request only: no periodic port traffic or per-sample clock.
            this.port.postMessage({type:'diagnostic',requestId:data.requestId,
              snapshot:{...this.metrics,rejectReasons:{...this.rejectReasons},activeCost:this.cost,
                activeVoices:this.slots.reduce((n,s)=>n+Number(!!s),0),maxCost:this.maxCost,maxVoices:this.maxVoices,
                frame:frameNow(),sampleRate:rate,plans:this.plans.size,
                note:'renderStarted counts DSP invocations, not audible output or measured XRUNs'}});
          } else if (data.type === 'plan') {
            if (this.plans.size >= 16 && !this.plans.has(data.id)) throw new Error('Nodal plan bank full');
            const plan=data.plan,pool=[];
            if(data.prepared)dsp.installPrepared(plan,data.prepared,rate);
            const reusable=plan.kernelVersion==='coupled-modal-v2'||(!plan.emiliaWeave&&!plan.emiliaMaterial);
            const tailCost=plan.kernelVersion==='coupled-modal-v2'&&plan.tailSec>0?(plan.tailCost??plan.cost*this.tailScale):plan.cost;
            const target=reusable&&!plan.silent?Math.min(this.maxVoices,Math.floor((this.maxCost+1e-9)/Math.min(plan.cost,tailCost))):0;
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
            if (!plan || slot < 0 || this.cost + plan.cost > this.maxCost+1e-9 || !Number.isFinite(start) || start < now - Math.round(rate * .008) || start > now + rate * 2) {
              const reason = !plan ? 'plan missing' : slot < 0 || this.cost + plan.cost > this.maxCost+1e-9 ? 'voice capacity' : !Number.isFinite(start) ? 'invalid start' : start < now - Math.round(rate * .008) ? 'late' : 'too far ahead';
              this.reject(data.id,reason); return;
            }
            let pooled=null,voice;
            if(bank.reusable){
              for(let i=0;i<bank.pool.length;i++)if(!bank.pool[i].busy){pooled=bank.pool[i];break;}
              if(!pooled){this.reject(data.id,'voice capacity');return;}
              voice=pooled.voice;voice.reset(data.options);pooled.busy=true;
            }else voice=dsp.voice(plan,data.options,rate);
            const record=this.records[slot];record.id=data.id;record.voice=voice;record.plan=plan;record.start=Math.max(now,start);record.rendered=false;record.pooled=pooled;record.cost=plan.cost;record.lane=data.lane==='particle'?1:0;record.mixLane=['particle','wave','keyboard','resident'].includes(data.mixLane)?data.mixLane:data.lane;record.agentIndex=Number.isInteger(data.agentIndex)&&data.agentIndex>=0&&data.agentIndex<32?data.agentIndex:null;this.place(record,true);
            this.slots[slot]=record;this.slotEnd=Math.max(this.slotEnd,slot+1);this.cost+=plan.cost;
            this.metrics.accepted++;this.metrics.peakVoices=Math.max(this.metrics.peakVoices,this.slots.reduce((n,s)=>n+Number(!!s),0));
            this.port.postMessage({type: 'started', id: data.id});
          } else if(data.type==='placement'){this.placementState=data.state??{};for(let i=0;i<this.slotEnd;i++){const s=this.slots[i];if(s)this.place(s,false)}} else if (data.type === 'release' || data.type === 'frequency') {
            for (const s of this.slots) if (s && s.id === data.id) data.type === 'release' ? s.voice.noteOff() : s.voice.setFrequency(data.frequency);
          } else if(data.type==='cut'){
            const index=this.slots.findIndex(s=>s&&s.id===data.id);
            if(index>=0){if(this.slots[index].rendered)this.retire(index);else this.finish(index);}
          } else if (data.type === 'stop') { for(let i=0;i<this.slots.length;i++){const s=this.slots[i];if(!s)continue;
            // A scheduled note which has never rendered owns no audible tail.
            // Rendering a retire fade here would create a phantom early attack.
            if(!s.rendered)this.finish(i);else if(s.plan.kernelVersion==='coupled-modal-v2')this.retire(i);else s.voice.noteOff();} }
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
      this.metrics.processBlocks++;
      const output = outputs[0]; if (!output?.[0]) return this.running;
      if(outputs[1]?.[0]){outputs[1][0].fill(0);outputs[1][1]?.fill(0);}
      const left = output[0], right = output[1] ?? left; left.fill(0); if (right !== left) right.fill(0);
      // Retire buffers are exceptional control-path fades. Empty blocks never
      // mix/clear 256 zero samples or traverse all 32 prepared voice slots.
      if(this.hasRetired){const count=Math.min(128,left.length);for(let i=0;i<count;i++){left[i]+=this.retireL[i];if(right!==left)right[i]+=this.retireR[i];}this.retireL.fill(0);this.retireR.fill(0);this.hasRetired=false;}
      if(this.hasParticleRetired){const lane=outputs[1]??output,l=lane[0],r=lane[1]??l;for(let i=0;i<Math.min(128,l.length);i++){l[i]+=this.particleRetireL[i];if(r!==l)r[i]+=this.particleRetireR[i];}this.particleRetireL.fill(0);this.particleRetireR.fill(0);this.hasParticleRetired=false;}
      if(this.slotEnd===0)return this.running;
      this.metrics.activeBlocks++;
      const now = frameNow();
      for (let i = 0; i < this.slotEnd; i++) {
        const s = this.slots[i]; if (!s || s.start >= now + left.length) continue;
        const offset = Math.max(0, s.start - now),laneOutput=s.lane===1&&outputs[1]?.[0]?outputs[1]:output;
        try { this.renderPlaced(s,laneOutput[0],laneOutput[1]??laneOutput[0],offset,left.length-offset,true);
          if(!s.rendered){s.rendered=true;this.metrics.renderStarted++;}this.metrics.renderedVoiceFrames+=left.length-offset;
        }
        catch (error) { s.voice.noteOff(); this.port.postMessage({type: 'error', id: s.id, message: String(error.message)}); this.finish(i); continue; }
        if(s.voice.ended)this.finish(i);
        else if(s.plan.kernelVersion==='coupled-modal-v2'&&s.voice.dryEnded&&s.plan.tailSec>0&&s.cost===s.plan.cost&&(s.plan.tailCost??s.plan.cost*this.tailScale)<s.cost){
          const cost=s.plan.tailCost??s.plan.cost*this.tailScale;this.cost+=cost-s.cost;s.cost=cost;
          this.port.postMessage({type:'cost',id:s.id,cost});
        }
      }
      return this.running;
    }
    place(s,initial){
      const clean=x=>Number.isFinite(x)?Math.max(-1,Math.min(1,x)):0;
      const state=this.placementState;
      const pan=clean(clean(state[s.mixLane])+((s.mixLane==='particle'&&s.agentIndex!==null)?clean(state['particle:'+s.agentIndex]):0));
      // WebAudio stereo-to-stereo equal-power law. Centre is an exact bypass.
      const angle=(pan<=0?pan+1:pan)*Math.PI*.5;
      const a=pan===0?1:pan<=0?1:Math.cos(angle),b=pan===0?0:pan<=0?Math.cos(angle):0;
      const c=pan===0?0:pan<=0?0:Math.sin(angle),d=pan===0?1:pan<=0?Math.sin(angle):1;
      s.panA=a;s.panB=b;s.panC=c;s.panD=d;
      if(initial){s.curA=a;s.curB=b;s.curC=c;s.curD=d;s.panRamp=0}else s.panRamp=128;
    }
    renderPlaced(s,left,right,offset=0,count=128,add=false){
      if(!s.panRamp&&s.panA===1&&s.panB===0&&s.panC===0&&s.panD===1){s.voice.process(left,right,offset,count,add);return}
      // One pair per processor, reused serially by all voices; no per-note nodes
      // or render-block allocation. Full DSP model and prepared banks unchanged.
      const l=this.panL,r=this.panR;l.fill(0);r.fill(0);s.voice.process(l,r,offset,count,false);
      for(let i=offset;i<offset+count;i++){
        if(s.panRamp>0){const n=s.panRamp--;s.curA+=(s.panA-s.curA)/n;s.curB+=(s.panB-s.curB)/n;s.curC+=(s.panC-s.curC)/n;s.curD+=(s.panD-s.curD)/n}
        const a=l[i]*s.curA+r[i]*s.curB,b=l[i]*s.curC+r[i]*s.curD;
        if(add){left[i]+=a;right[i]+=b}else{left[i]=a;right[i]=b}
      }
    }
    retire(index) {
      const s=this.slots[index];if(!s)return;this.fadeL.fill(0);this.fadeR.fill(0);this.renderPlaced(s,this.fadeL,this.fadeR,0,128,false);
      const particle=this.separateLanes&&s.lane===1,l=particle?this.particleRetireL:this.retireL,r=particle?this.particleRetireR:this.retireR;
      for(let i=0;i<128;i++){const gain=(1-i/127);l[i]+=this.fadeL[i]*gain;r[i]+=this.fadeR[i]*gain;}if(particle)this.hasParticleRetired=true;else this.hasRetired=true;this.finish(index);
    }
    reject(id,reason){this.metrics.rejected++;this.rejectReasons[reason]=(this.rejectReasons[reason]??0)+1;this.port.postMessage({type:'rejected',id,reason});}
    finish(index) { const s = this.slots[index]; if (!s) return; this.cost -= s.cost;this.metrics.ended++; if(s.pooled)s.pooled.busy=false; this.slots[index] = null;if(index===this.slotEnd-1)while(this.slotEnd>0&&this.slots[this.slotEnd-1]===null)this.slotEnd--;if(this.slotEnd===0)this.cost=0; this.port.postMessage({type: 'ended', id: s.id}); s.voice=null;s.plan=null;s.pooled=null; }
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
      if(!Number.isFinite(cost)||cost<=0||!Number.isFinite(activeVoices)||activeVoices<0||!Number.isFinite(activeCost)||activeCost<0||activeVoices>=maxVoices||activeCost+cost>maxCost+1e-9){reason='dsp-budget';return null;}
      const ticket=acquire(cost,lane);
      if(!ticket){reason='global-ticket';return null;}
      let released=false;
      return {reduce:next=>!released&&ticket.reduce?.(next),release(){if(!released){released=true;ticket.release();}}};
    }
  };
}

function createNodalLiveRuntime({model, kernelFactory}) {
  const modules = new WeakMap(), capacities=new WeakMap(), readers=new Set();let playerSequence=0;
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
    let capacity=null,capacityOwner=null,capacityRejected=false;
    if(policy.sharedCapacity){capacity=capacities.get(context);if(!capacity){capacity=createNodalCapacityLedger();capacities.set(context,capacity);}capacityOwner=capacity.register(policy.priority);}
    const admissionGate=createNodalAdmissionGate({maxVoices,maxCost,acquire:(cost,lane)=>{
      capacityRejected=false;
      const local=capacityOwner?.acquire(cost);if(capacityOwner&&!local){capacityRejected=true;return null;}
      let ticket;try{ticket=admission.acquire(cost,lane);}catch(error){local?.release();throw error;}
      if(!ticket){local?.release();return null;}
      return {reduce:next=>local?.reduce(next),release(){local?.release();ticket.release();}};
    }});
    const plans = new Map(), pending = new Map(), active = new Map(), preparedReferences = new WeakMap(), pendingStarts = new Map(), pins = new Map(), preparing = new Map(); let sequence = 0, disposed = false, activeCost = 0;
    let diagnosticSequence=0,diagnosticPending=null;
    const counters={submitted:0,accepted:0,ended:0,rejected:0},rejectReasons=Object.create(null);
    const diagnosticId='nodal-'+(++playerSequence);
    function requestDiagnostics(){
      if(disposed)return Promise.resolve({status:'disposed'});
      if(diagnosticPending)return diagnosticPending.promise;
      let resolve;const promise=new Promise(r=>resolve=r),requestId=++diagnosticSequence;
      const timer=setTimeout(()=>{diagnosticPending=null;resolve({status:'timeout',host:snapshot()});},750);
      diagnosticPending={promise,resolve,timer};
      try{node.port.postMessage({type:'diagnostic',requestId});}catch{clearTimeout(timer);diagnosticPending=null;resolve({status:'unavailable',host:snapshot()});}
      return promise;
    }
    readers.add(requestDiagnostics);
    const unregisterDiagnostic=typeof b6==='function'?b6(diagnosticId,requestDiagnostics):null;
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
      if(data.type==='diagnostic'){if(diagnosticPending&&data.requestId===diagnosticSequence){const entry=diagnosticPending;diagnosticPending=null;clearTimeout(entry.timer);entry.resolve({status:'received',id:diagnosticId,host:snapshot(),consumer:data.snapshot});}return;}
      if (data.type === 'stage-needed') {requestStage(data.id);} else if (data.type === 'ready') { const entry = pending.get(data.id); if (entry) { clearTimeout(entry.timer); pending.delete(data.id); entry.resolve(); } }
      // 'started' is the existing receipt acknowledgement, which can precede
      // a scheduled note. Trace it as accepted, never as measured audio output.
      else if (data.type === 'started') { counters.accepted++;const record=active.get(data.id);if(record?.traceId&&typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('worklet',record.lane,'accepted',record.startSec,record.traceId,{voiceId:data.id,programId:record.planId});confirmStart(data.id); }
      else if(data.type==='cost'){const record=active.get(data.id);if(record&&Number.isFinite(data.cost)&&data.cost>0&&data.cost<=record.cost){record.ticket.reduce(data.cost);activeCost+=data.cost-record.cost;record.cost=data.cost;}}
      else if(data.type==='ended'){counters.ended++;const record=active.get(data.id);if(record?.traceId&&typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('worklet',record.lane,'ended',void 0,record.traceId,{voiceId:data.id,programId:record.planId});confirmStart(data.id);release(data.id);}
      else if (data.type === 'rejected' || data.type === 'error') {
        if(data.type==='rejected'){counters.rejected++;const reason='worklet:'+(data.reason??'unknown');rejectReasons[reason]=(rejectReasons[reason]??0)+1;}
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
          removable[1].gridPreparation?.dispose();if(removable[1].frequencyState?.timer!=null)clearTimeout(removable[1].frequencyState.timer);plans.delete(removable[0]);pins.delete(removable[1]);background?.forget?.(removable[1].workerPlanId);node.port.postMessage({type:'forget',id:removable[1].id});
        }
        const tailCost=typeof policy.tailCostForPlan==='function'?policy.tailCostForPlan(compiled,context.sampleRate):undefined;
        if(tailCost!=null&&(!Number.isFinite(tailCost)||tailCost<=0||tailCost>cost))throw new Error('Invalid Nodal tail cost');
        capacityOwner?.require(cost);
        const plan=cost===compiled.cost&&tailCost==null?compiled:{...compiled,cost,...(tailCost==null?{}:{tailCost})},id='plan-'+(++sequence),record={id,plan,ready:false,workerPlanId,dynamicInstalled:new Map((prepared?.pitches??[]).map(item=>[item.hz,true]))};
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
      if(count<=1){
        pins.delete(record);
        // A retained old program may still sound, but needs no speculative
        // grid jobs once its last selection owner has left. Existing DSP and
        // installed coefficients remain valid for its natural tails.
        if(count===1){record.gridPreparation?.dispose();record.gridPreparation=null;if(record.frequencyState){record.frequencyState.latest=null;record.frequencyState.generation++;if(record.frequencyState.timer!==null)clearTimeout(record.frequencyState.timer);record.frequencyState.timer=null;}}
      }else pins.set(record,count-1);
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
      if (!ticket) {const reason=admissionGate.reason==='global-ticket'&&capacityRejected?'context-dsp-budget':admissionGate.reason;counters.rejected++;rejectReasons[reason]=(rejectReasons[reason]??0)+1; if(typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('nodal-player',options.admissionLane??'nodal',reason,startSec,traceId);return null; }
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
      try { node.port.postMessage({type: 'note', id, planId: prepared.id, startSec,lane:options.admissionLane,mixLane:options.mixLane,agentIndex:options.agentIndex, options: {frequency, velocity, gain,
        durationSec:duration, held: options.held === true, seed: options.seed ?? instrument.seed,
        volumeCurve: options.volumeCurve, pitchCurve: options.pitchCurve, attackSec: options.attackSec, releaseSec: options.releaseSec}}); }
      catch (error) { if(typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('nodal-player',options.admissionLane??'nodal','submit-error',startSec,traceId,{voiceId:id,programId:prepared.id});confirmStart(id, error); release(id); throw error; }
      counters.submitted++;
      if(typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('nodal-player',options.admissionLane??'nodal','submitted',startSec,traceId,{voiceId:id,programId:prepared.id});
      return Object.freeze({id, started, noteOff: () => { const record=active.get(id);if(record&&!record.cutRequested){record.releasing=true;node.port.postMessage({type: 'release', id});} },
        cut:()=>{const record=active.get(id);if(!record||record.cutRequested)return false;record.cutRequested=true;node.port.postMessage({type:'cut',id});return true;},
        setFrequency: hz => { if (!active.has(id) || !Number.isFinite(hz) || hz < 5 || hz > 12000) return false; node.port.postMessage({type: 'frequency', id, frequency: hz}); return true; }});
    }
    // At most one frequency job per preset is in flight. When moving roots
    // change faster than worker throughput, keep only the latest snapshot;
    // no stale coefficients or catch-up stream may reach the AudioWorklet.
    function dispatchFrequencyJob(record){
      const state=record.frequencyState;
      if(disposed||state.inflight||state.timer!==null||!state.latest||state.failedGeneration===state.generation||plans.get(record.plan.key)!==record)return;
      const current=state.latest.filter(hz=>!state.installed.has(hz)).slice(0,8),generation=state.generation;
      if(!current.length)return;
      state.inflight=true;
      background.prepareFrequencies(record.workerPlanId,current,context.sampleRate).then(prepared=>{
        if(!disposed&&state.generation===generation&&plans.get(record.plan.key)===record){
          node.port.postMessage({type:'pitches',id:record.id,prepared});
          for(const hz of current){state.installed.delete(hz);state.installed.set(hz,true);if(state.installed.size>64)state.installed.delete(state.installed.keys().next().value);}
        }
      }).catch(()=>{
        // Do not run a synchronous main-thread fallback on worker failure.
        // Uncached tones remain playable through the Worklet's own coefficients.
        if(state.generation===generation)state.failedGeneration=generation;
      }).finally(()=>{
        state.inflight=false;
        if(!disposed&&state.generation!==generation)dispatchFrequencyJob(record);
        else if(!disposed&&state.latest?.some(hz=>!state.installed.has(hz))&&state.failedGeneration!==generation){
          state.timer=setTimeout(()=>{state.timer=null;dispatchFrequencyJob(record);},12);
        }
      });
    }
    function prepareFrequencies(instrument,frequencies,family='particle'){
      const record=preparedReferences.get(instrument);
      if(disposed||!record?.ready||plans.get(record.plan.key)!==record||!Array.isArray(frequencies)||frequencies.length>32||!['wave','particle'].includes(family))return false;
      // Preserve both current families when they share a timbre.
      const families=record.frequencyFamilies??(record.frequencyFamilies=new Map());families.set(family,frequencies.slice());
      const combined=new Set();for(const values of families.values())for(const hz of values)combined.add(hz);
      // Promote imminent exact Hz within the existing grid job. No second
      // coefficient calculation/packet is needed for frequencies it covers.
      record.gridPreparation?.prioritize?.([...combined]);
      const current=[...combined].filter(hz=>!record.gridPreparation?.covers?.(hz));
      if(background&&record.workerPlanId!=null&&typeof background.prepareFrequencies==='function'){
        const state=record.frequencyState??(record.frequencyState={generation:0,inflight:false,latest:null,installed:record.dynamicInstalled,timer:null,failedGeneration:-1});
        // Avoid reposting identical root sets (the same order is preserved).
        if(state.latest?.length===current.length&&state.latest.every((hz,i)=>hz===current[i]))return true;
        // A changed approach changes priority, not the acoustic identity of a
        // valid in-flight exact-Hz packet. Keep it, reorder only future work.
        if(state.latest?.length===current.length){
          const previous=new Set(state.latest);
          if(current.every(hz=>previous.has(hz))){state.latest=current;dispatchFrequencyJob(record);return true;}
        }
        state.latest=current;state.generation++;
        if(state.timer!==null){clearTimeout(state.timer);state.timer=null;}dispatchFrequencyJob(record);
      }else{
        // Workerless compatibility only; supported browser runtimes never
        // invoke the synchronous controller for moving pitch families.
        node.port.postMessage({type:'pitches',id:record.id,frequencies:control?undefined:current,prepared:control?.preparePacket(record.plan,current,context.sampleRate)});
      }
      return true;
    }
    function prepareGridFrequencies(instrument,frequencies){
      const record=preparedReferences.get(instrument);
      if(disposed||!record?.ready||plans.get(record.plan.key)!==record||!Array.isArray(frequencies)||frequencies.length>2048||frequencies.some(hz=>!Number.isFinite(hz)||hz<5||hz>12000)||!control)return false;
      if(!record.gridPreparation)record.gridPreparation=createInstrumentPitchPreparation({
        capacity:2048,batchSize:16,pauseMs:12,
        isCurrent:()=>!disposed&&plans.get(record.plan.key)===record,
        prune:removeFrequencies=>node.port.postMessage({type:'pitches',id:record.id,prepared:{bank:'grid',pitches:[],removeFrequencies}}),
        prepare:batch=>{
          if(background){
            if(typeof background.prepareGridFrequencies!=='function')throw new Error('Nodal grid worker adapter unavailable');
            return background.prepareGridFrequencies(record.workerPlanId,batch,context.sampleRate);
          }
          return control.preparePacket(record.plan,batch,context.sampleRate,false,'grid');
        },
        install:(prepared,batch)=>{
          if(!prepared||prepared.bank!=='grid'||!Array.isArray(prepared.pitches)||prepared.pitches.length!==batch.length||prepared.pitches.some((item,i)=>item.hz!==batch[i]))throw new Error('Invalid Nodal grid handoff');
          node.port.postMessage({type:'pitches',id:record.id,prepared});return true;
        }
      });
      return record.gridPreparation.update(frequencies);
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
    function dispose() { if (disposed) return; disposed = true;readers.delete(requestDiagnostics);unregisterDiagnostic?.();if(diagnosticPending){clearTimeout(diagnosticPending.timer);diagnosticPending.resolve({status:'disposed'});diagnosticPending=null;}for(const record of plans.values()){record.gridPreparation?.dispose();if(record.frequencyState?.timer!=null)clearTimeout(record.frequencyState.timer);} background?.dispose();preparing.clear(); if(stageTimer!==null)clearTimeout(stageTimer);stageTimer=null;stageQueue.length=0;staged.clear();pins.clear();failAll();capacityOwner?.dispose(); node.port.postMessage({type: 'dispose'}); node.disconnect(); node.port.close(); context.removeEventListener('statechange', onState); }
    function onState() { if (context.state === 'closed') dispose(); }
    context.addEventListener('statechange', onState);
    async function warmFrequencies(instrument,frequencies){
      if(!prepareGridFrequencies(instrument,frequencies))throw new Error('Invalid Nodal pitch preparation request');
      const record=preparedReferences.get(instrument);await record.gridPreparation.whenReady();
      if(disposed||plans.get(record.plan.key)!==record)throw new Error('Nodal pitch preparation cancelled');
    }
    function snapshot(){return {readyPlans: plans.size, activeVoices: active.size, activeCost, maxCost,maxVoices,disposed,controlPrepared:!!control,separateLanes:!!laneRoutes,
      ...counters,rejectReasons:{...rejectReasons},sharedCapacity:capacity?.snapshot()??null,
      gridPreparation:[...plans.values()].filter(record=>record.gridPreparation).map(record=>({planId:record.id,...record.gridPreparation.snapshot()}))};}
    return Object.freeze({placement:state=>{if(!disposed)node.port.postMessage({type:"placement",state})},prepare,prepareFrequencies,prepareGridFrequencies,warmFrequencies,route,noteOn,pin,unpin,stop,dispose,requestDiagnostics,
      hasPreparedFrequencies:(instrument,frequencies)=>{const record=instrument&&preparedReferences.get(instrument);return !disposed&&record?.ready&&plans.get(record.plan.key)===record&&Array.isArray(frequencies)&&frequencies.every(hz=>record.gridPreparation?.has?.(hz)||record.dynamicInstalled.has(hz));},
      preparedProgramId:instrument=>{const record=preparedReferences.get(instrument);return !disposed&&record?.ready&&plans.get(record.plan.key)===record?record.id:null},
      isPrepared:instrument=>{const record=preparedReferences.get(instrument);return !disposed&&!!record?.ready&&plans.get(record.plan.key)===record},snapshot});
  }
  return Object.freeze({createPlayer,diagnostics:()=>Promise.all([...readers].map(read=>read()))});
}
const __XenNodalLive = createNodalLiveRuntime({model: __XenNodalModel, kernelFactory: createNodalSynthesisKernel});
