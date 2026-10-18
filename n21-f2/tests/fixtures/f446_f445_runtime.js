function nodalWorkletProcessorFactory(createKernel, register, Base, rate, frameNow) {
  const dsp = createKernel();
  class NodalProcessor extends Base {
    constructor(options={}) {
      super();const policy=options.processorOptions??{};
      this.maxCost=policy.maxCost??8;this.maxVoices=policy.maxVoices??8;this.tailScale=policy.tailCostScale??1;
      this.plans = new Map(); this.slots = Array(this.maxVoices).fill(null); this.slotEnd=0;this.hasRetired=false;this.cost = 0; this.running = true;
      this.records = Array.from({length:this.maxVoices},()=>({id:null,voice:null,plan:null,start:0,pooled:null,cost:0}));
      this.retireL = new Float32Array(128); this.retireR = new Float32Array(128); this.fadeL = new Float32Array(128); this.fadeR = new Float32Array(128);
      this.port.onmessage = ({data}) => {
        try {
          if (data.type === 'plan') {
            if (this.plans.size >= 16 && !this.plans.has(data.id)) throw new Error('Nodal plan bank full');
            const plan=data.plan,pool=[];
            // Saved Nodal V1/V2 voices own fixed state. Prepare it BEFORE readiness,
            // never construct a DSP voice from a secondary note message.
            const reusable=plan.kernelVersion==='coupled-modal-v2'||(!plan.emiliaWeave&&!plan.emiliaMaterial);
            const tailScale=plan.kernelVersion==='coupled-modal-v2'&&plan.tailSec>0?this.tailScale:1;
            if(reusable&&!plan.silent)for(let i=0;i<Math.min(this.maxVoices,Math.floor(this.maxCost/(plan.cost*tailScale)));i++){
              const voice=dsp.voice(plan,{},rate);
              if(typeof voice.reset!=='function')throw new Error('Nodal reusable voice unavailable');
              pool.push({voice,busy:false});
            }
            this.plans.set(data.id,{plan,pool,reusable});if(reusable&&!plan.silent)dsp.preparePitches?.(plan,[plan.referenceHz??220],rate);this.port.postMessage({type:'ready',id:data.id});
          } else if(data.type==='pitches'){const bank=this.plans.get(data.id);if(bank&&bank.reusable)dsp.preparePitches?.(bank.plan,data.frequencies,rate);
          } else if (data.type === 'forget') { this.plans.delete(data.id); }
          else if (data.type === 'note') {
            const bank=this.plans.get(data.planId),plan=bank?.plan,slot=this.slots.indexOf(null);
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
            const record=this.records[slot];record.id=data.id;record.voice=voice;record.plan=plan;record.start=Math.max(now,start);record.pooled=pooled;record.cost=plan.cost;
            this.slots[slot]=record;this.slotEnd=Math.max(this.slotEnd,slot+1);this.cost+=plan.cost;
            this.port.postMessage({type: 'started', id: data.id});
          } else if (data.type === 'release' || data.type === 'frequency') {
            for (const s of this.slots) if (s && s.id === data.id) data.type === 'release' ? s.voice.noteOff() : s.voice.setFrequency(data.frequency);
          } else if (data.type === 'stop') { for(let i=0;i<this.slots.length;i++){const s=this.slots[i];if(!s)continue;if(s.plan.kernelVersion==='coupled-modal-v2')this.retire(i);else s.voice.noteOff();} }
          else if (data.type === 'retire') { const index=this.slots.findIndex(s=>s&&s.id===data.id&&s.plan.kernelVersion==='coupled-modal-v2'&&s.voice.released); if(index>=0)this.retire(index); }
          else if (data.type === 'dispose') { this.running = false; this.slots.fill(null);this.slotEnd=0; this.plans.clear(); this.cost = 0; }
        } catch (error) { this.port.postMessage({type: 'error', id: data.id, message: String(error.message)}); }
      };
    }
    process(inputs, outputs) {
      const output = outputs[0]; if (!output?.[0]) return this.running;
      const left = output[0], right = output[1] ?? left; left.fill(0); if (right !== left) right.fill(0);
      // Retire buffers are exceptional control-path fades. Empty blocks never
      // mix/clear 256 zero samples or traverse all 32 prepared voice slots.
      if(this.hasRetired){const count=Math.min(128,left.length);for(let i=0;i<count;i++){left[i]+=this.retireL[i];if(right!==left)right[i]+=this.retireR[i];}this.retireL.fill(0);this.retireR.fill(0);this.hasRetired=false;}
      if(this.slotEnd===0)return this.running;
      const now = frameNow();
      for (let i = 0; i < this.slotEnd; i++) {
        const s = this.slots[i]; if (!s || s.start >= now + left.length) continue;
        const offset = Math.max(0, s.start - now);
        try { s.voice.process(left, right, offset, left.length - offset, true); }
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
      for(let i=0;i<128;i++){const gain=(1-i/127);this.retireL[i]+=this.fadeL[i]*gain;this.retireR[i]+=this.fadeR[i]*gain;}this.hasRetired=true;this.finish(index);
    }
    finish(index) { const s = this.slots[index]; if (!s) return; this.cost -= s.cost; if(s.pooled)s.pooled.busy=false; this.slots[index] = null;if(index===this.slotEnd-1)while(this.slotEnd>0&&this.slots[this.slotEnd-1]===null)this.slotEnd--; this.port.postMessage({type: 'ended', id: s.id}); s.voice=null;s.plan=null;s.pooled=null; }
  }
  register('xensonar-nodal-instrument-v1', NodalProcessor);
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
    const node = new AudioWorkletNode(context, 'xensonar-nodal-instrument-v1', {numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2],processorOptions:{maxCost:policy.maxCost??8,maxVoices:policy.maxVoices??8,tailCostScale:policy.tailCostScale??1}});
    node.connect(destination);
    const maxCost=policy.maxCost??8,maxVoices=policy.maxVoices??8;
    const plans = new Map(), pending = new Map(), active = new Map(), preparedReferences = new WeakMap(), pendingStarts = new Map(); let sequence = 0, disposed = false, activeCost = 0;
    function confirmStart(id, error) {
      const entry = pendingStarts.get(id); if (!entry) return;
      pendingStarts.delete(id); clearTimeout(entry.timer);
      if (error) entry.reject(error); else entry.resolve();
    }
    function release(id) { const record = active.get(id); if (!record) return; active.delete(id); activeCost -= record.cost; record.ticket.release(); }
    function failAll() {
      for (const id of Array.from(active.keys())) release(id);
      for (const id of Array.from(pendingStarts.keys())) confirmStart(id, new Error('Nodal processor unavailable'));
      for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(new Error('Nodal processor unavailable')); } pending.clear();
    }
    node.onprocessorerror = () => { dispose(); admission.onError?.(new Error('Nodal-Audioprozessor ausgefallen. Bitte Wiedergabe neu starten.')); };
    node.port.onmessage = ({data}) => {
      if (data.type === 'ready') { const entry = pending.get(data.id); if (entry) { clearTimeout(entry.timer); pending.delete(data.id); entry.resolve(); } }
      else if (data.type === 'started') confirmStart(data.id);
      else if(data.type==='cost'){const record=active.get(data.id);if(record&&Number.isFinite(data.cost)&&data.cost>0&&data.cost<=record.cost){activeCost+=data.cost-record.cost;record.cost=data.cost;}}
      else if(data.type==='ended'){confirmStart(data.id);release(data.id);}
      else if (data.type === 'rejected' || data.type === 'error') {
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
      if (plans.has(key)) { preparedReferences.set(instrument, plans.get(key)); return plans.get(key).promise; }
      if (plans.size >= 16) {
        const removable = Array.from(plans.entries()).find(([, record]) => record.ready && !Array.from(active.values()).some(v => v.planId === record.id));
        if (!removable) throw new Error('Nodal live plan bank full');
        plans.delete(removable[0]); node.port.postMessage({type: 'forget', id: removable[1].id});
      }
      const compiled=model.compile(instrument),cost=typeof policy.costForPlan==='function'?policy.costForPlan(compiled,context.sampleRate):compiled.cost;
      if(!Number.isFinite(cost)||cost<compiled.cost)throw new Error('Nodal plan exceeds live budget');
      const plan=cost===compiled.cost?compiled:{...compiled,cost}, id = 'plan-' + (++sequence), record = {id, plan, ready: false};
      record.promise = new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); plans.delete(key); reject(new Error('Nodal plan preparation timed out')); }, 3000);
        pending.set(id, {key, timer, resolve: () => { record.ready = true; resolve(record); }, reject});
        node.port.postMessage({type: 'plan', id, plan});
      });
      plans.set(key, record); preparedReferences.set(instrument, record); return record.promise;
    }
    function noteOn(instrument, options = {}, startSec = context.currentTime) {
      if (disposed || context.state !== 'running') return null;
      const prepared = instrument && preparedReferences.get(instrument);
      if (!prepared?.ready || prepared.plan.silent || !Number.isFinite(startSec) || startSec < context.currentTime - .008 || startSec > context.currentTime + 2) return null;
      const frequency = options.frequency ?? instrument.referenceHz, velocity = options.velocity ?? .7;
      if (!Number.isFinite(frequency) || frequency < 5 || frequency > 12000 || !Number.isFinite(velocity) || velocity < 0 || velocity > 1) return null;
      const gain=options.gain??.7,duration=options.durationSec??instrument.articulation.durationSec;
      if(!Number.isFinite(gain)||gain<0||gain>1||!Number.isFinite(duration)||duration<.02||duration>30)return null;
      for(const key of ['attackSec','releaseSec'])if(options[key]!=null&&(!Number.isFinite(options[key])||options[key]<0||options[key]>3))return null;
      if (plans.get(prepared.plan.key) !== prepared) return null;
      const limit=maxCost;
      if (policy.preserveTails!==true && (active.size >= maxVoices || prepared.plan.cost + activeCost > limit)) {
        // Release only spent natural tails. Fresh/held attacks retain ownership.
        for(const [id,record] of active){
          if(!record.natural || (!record.releasing && record.gateEnd > context.currentTime - .008))continue;
          node.port.postMessage({type:'retire',id});release(id);
          if(active.size<maxVoices && prepared.plan.cost+activeCost<=limit)break;
        }
      }
      if (active.size >= maxVoices || prepared.plan.cost + activeCost > limit) return null;

      const ticket = admission.acquire(prepared.plan.cost,options.admissionLane); if (!ticket) return null;
      const id = 'voice-' + (++sequence); active.set(id, {ticket, planId: prepared.id, cost: prepared.plan.cost, natural:prepared.plan.kernelVersion==='coupled-modal-v2'&&prepared.plan.tailSec>0, gateEnd:options.held===true?Infinity:startSec+(options.durationSec??instrument.articulation.durationSec), releasing:false}); activeCost += prepared.plan.cost;
      let started = null;
      if (options.confirmStart === true) {
        started = new Promise((resolve, reject) => {
          const timer = setTimeout(() => { confirmStart(id, new Error('Nodal: audio worklet did not confirm note start')); dispose(); }, 1200);
          pendingStarts.set(id, {timer, resolve, reject});
        });
        // Other callers may release the note before awaiting acknowledgement.
        started.catch(() => {});
      }
      try { node.port.postMessage({type: 'note', id, planId: prepared.id, startSec, options: {frequency, velocity, gain,
        durationSec:duration, held: options.held === true, seed: options.seed ?? instrument.seed,
        volumeCurve: options.volumeCurve, pitchCurve: options.pitchCurve, attackSec: options.attackSec, releaseSec: options.releaseSec}}); }
      catch (error) { confirmStart(id, error); release(id); throw error; }
      return Object.freeze({id, started, noteOff: () => { const record=active.get(id);if(record){record.releasing=true;node.port.postMessage({type: 'release', id});} },
        setFrequency: hz => { if (!active.has(id) || !Number.isFinite(hz) || hz < 5 || hz > 12000) return false; node.port.postMessage({type: 'frequency', id, frequency: hz}); return true; }});
    }
    function prepareFrequencies(instrument,frequencies,family='particle'){
      const record=preparedReferences.get(instrument);
      if(disposed||!record?.ready||plans.get(record.plan.key)!==record||!Array.isArray(frequencies)||frequencies.length>32||!['wave','particle'].includes(family))return false;
      // Preserve both current families when they share a timbre. A moving wave
      // cursor must not evict the unchanged particle roots from the bounded cache.
      const families=record.frequencyFamilies??(record.frequencyFamilies=new Map());families.set(family,frequencies.slice());
      const combined=new Set();for(const values of families.values())for(const hz of values)combined.add(hz);
      node.port.postMessage({type:'pitches',id:record.id,frequencies:[...combined]});return true;
    }
    function stop() { if (!disposed) node.port.postMessage({type: 'stop'}); }
    function dispose() { if (disposed) return; disposed = true; failAll(); node.port.postMessage({type: 'dispose'}); node.disconnect(); node.port.close(); context.removeEventListener('statechange', onState); }
    function onState() { if (context.state === 'closed') dispose(); }
    context.addEventListener('statechange', onState);
    return Object.freeze({prepare,prepareFrequencies,noteOn,stop,dispose, snapshot: () => ({readyPlans: plans.size, activeVoices: active.size, activeCost, maxCost,maxVoices,disposed})});
  }
  return Object.freeze({createPlayer});
}
const __XenNodalLive = createNodalLiveRuntime({model: __XenNodalModel, kernelFactory: createNodalSynthesisKernel});
