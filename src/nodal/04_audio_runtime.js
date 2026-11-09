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
  // G1: one explicitly prepared PCM template, no adaptive cache and no new mixer.
  function pcmPocVoice(template) {
    let frame=0,ended=false;
    return {
      process(left,right,start=0,count=left.length-start,add=false){
        const a=template.left,b=template.right??a;
        for(let i=start,end=start+count;i<end;i++){
          const l=frame<a.length?a[frame]:0,r=frame<a.length?b[frame]:0;
          if(add){left[i]+=l;if(right&&right!==left)right[i]+=r;}
          else{left[i]=l;if(right&&right!==left)right[i]=r;}
          if(frame<a.length)frame++;
        }
        if(frame>=a.length)ended=true;
        return !ended;
      },
      // Fixed-duration proof only; never certify held notes or live pitch bends.
      noteOff(){},setFrequency(){return false;},get ended(){return ended;},
      get released(){return false;},get dryEnded(){return false;}
    };
  }
  // C1: prepared, original-kernel PCM. It is a renderer behind the same Nodal
  // Worklet owner (never another scheduler, AudioNode, route or admission gate).
  function pcmHoldVoice(template,initial={}){
    const l=template.left,r=template.right??l;
    let pos=0,ended=false,released=false,releasePos=0,releaseSamples=1,releaseFromSilentGap=false,playbackRatio=1;
    const handoverFrames=initial.nodalPcmHandoverFrames===128?128:0;
    const stepFrames=Number.isFinite(initial.nodalHoldIntervalMs)&&initial.nodalHoldIntervalMs>=15&&initial.nodalHoldIntervalMs<=5000
      ?Math.round(rate*initial.nodalHoldIntervalMs/1000):Infinity;
    const gateFrames=Number.isFinite(stepFrames)?Math.min(Math.round(rate*.006),Math.floor(stepFrames*.35)):0;
    function reset(options){playbackRatio=Number.isFinite(options?.holdPitchRatio)?options.holdPitchRatio:1;pos=0;ended=false;released=false;releasePos=0;releaseFromSilentGap=false;}
    function noteOff(){if(!released){released=true;releasePos=0;releaseFromSilentGap=Number.isFinite(stepFrames)&&pos>=stepFrames;
      releaseSamples=Math.max(64,Math.min(Math.round(rate*3),Math.round(rate*(initial.releaseSec??.18))));}}
    return {reset,noteOff,setFrequency(){return false;},get released(){return released;},
      get ended(){return ended;},get dryEnded(){return ended;},
      process(left,right,start=0,count=left.length-start,add=false){
        // Neutral PCM preserves the exact original integer-indexed path.
        if(playbackRatio!==1){
          for(let i=start;i<start+count;i++){
            const j=Math.floor(pos),frac=pos-j;
            let vl=j<l.length?l[j]*(1-frac)+(j+1<l.length?l[j+1]:0)*frac:0;
            let vr=j<r.length?r[j]*(1-frac)+(j+1<r.length?r[j+1]:0)*frac:0;
            if(released){const t=releaseFromSilentGap?0:Math.max(0,1-releasePos/releaseSamples);vl*=t*t;vr*=t*t;releasePos++;}
            else if(Number.isFinite(stepFrames)){
              const t=pos<stepFrames-gateFrames?1:gateFrames>0?Math.max(0,Math.min(1,(stepFrames-pos)/gateFrames)):0;
              vl*=t;vr*=t;
            }
            if(handoverFrames&&pos<handoverFrames){const t=pos/(handoverFrames-1);vl*=t;vr*=t;}
            if(add){left[i]+=vl;if(right!==left)right[i]+=vr;}
            else{left[i]=vl;if(right!==left)right[i]=vr;}
            pos+=playbackRatio;
            if(pos>=l.length||(released&&releasePos>=releaseSamples))ended=true;
          }
          return !ended;
        }
        for(let i=start;i<start+count;i++){
          let vl=pos<l.length?l[pos]:0,vr=pos<r.length?r[pos]:0;
          // Key-up: bounded, sample-accurate decay of the last reader. The
          // original physical modal release is NOT asserted by this envelope.
          if(released){const t=releaseFromSilentGap?0:Math.max(0,1-releasePos/releaseSamples);vl*=t*t;vr*=t*t;releasePos++;}
          else if(Number.isFinite(stepFrames)){
            // Shared Hold period: fade the dry reader BEFORE the next tick;
            // a muted next step becomes a true gap without a second clock.
            const t=pos<stepFrames-gateFrames?1:gateFrames>0?
              Math.max(0,Math.min(1,(stepFrames-pos)/gateFrames)):0;
            vl*=t;vr*=t;
          }
          if(handoverFrames&&pos<handoverFrames){const t=pos/(handoverFrames-1);vl*=t;vr*=t;}
          if(add){left[i]+=vl;if(right!==left)right[i]+=vr;}
          else{left[i]=vl;if(right!==left)right[i]=vr;}
          pos++;
          if(pos>=l.length||(released&&releasePos>=releaseSamples))ended=true;
        }
        return !ended;
      }};
  }
  // C2-1C: a prepared PCM's acoustic identity is verified at its Worklet
  // consumer, not merely implied by a Host cache key or a successful ACK.
  function pcmHoldMatches(template,options){
    const a=template?.renderIdentity;
    return !!a&&!!options&&a.frequency===options.frequency&&
      a.velocity===options.velocity&&a.gain===options.gain&&a.seed===options.seed&&
      (a.durationSec==null||a.durationSec===options.durationSec)&&
      (a.held==null||a.held===options.held);
  }
  class NodalProcessor extends Base {
    constructor(options={}) {
      super();const policy=options.processorOptions??{};
      this.maxCost=policy.maxCost??8;this.maxVoices=policy.maxVoices??8;this.tailScale=policy.tailCostScale??1;this.separateLanes=!!policy.separateLanes;this.separateKeyboard=!!policy.separateKeyboard;
      this.pcmPoc=null;this.pcmPocPlayed=0;this.dspPocPlayed=0;
      this.pcmHoldBank=new Map();this.pcmHoldBytes=0;this.pcmHoldPlayed=0;this.pcmHoldRetriggers=0;
      this.pcmG2=new Map();this.g2CacheBytes=0;this.g2PcmPlayed=0;this.g2DspPlayed=0;this.pcmAwareStarts=0;this.pcmAdmissionSavedUnits=0;
      // G3: at most one pre-armed passive capture. Buffers originate on main thread.
      this.g3Arm=null;this.g3Captures=0;this.g3Aborts=0;this.holdRetriggers=0;this.holdRestartDrops=0;
      // NODAL-PHASER01: four 1-pole allpass stages per channel, coefficient
      // table prepared once per processor (not per step / not in the hot path).
      // Dry/Wet interference produces moving phase notches, NOT a second EQ.
      this.nodalColorSmoothing=1-Math.exp(-1/(rate*.012));
      this.nodalPhaseBlockDecay=Math.pow(1-this.nodalColorSmoothing,128);
      // RTCOMPACT04: precompute exact partial-quantum decay factors once.
      // Off-grid Hold splits no longer call Math.pow on the audio thread.
      this.nodalPhasePartialDecay=new Float64Array(129);
      this.nodalPhasePartialDecay[0]=1;
      for(let n=1;n<128;n++)this.nodalPhasePartialDecay[n]=Math.pow(1-this.nodalColorSmoothing,n);
      this.nodalPhaseCoefficients=new Float32Array(129*4);
      for(let j=0;j<=128;j++){
        const f=180*Math.pow(14,j/128);
        for(let k=0;k<4;k++){
          const hz=Math.min(rate*.43,f*[1,1.5,2.2,3.2][k]);
          const t=Math.tan(Math.PI*hz/rate);
          this.nodalPhaseCoefficients[j*4+k]=(t-1)/(t+1);
        }
      }
      this.plans = new Map(); this.slots = Array(this.maxVoices).fill(null); this.slotEnd=0;this.hasRetired=false;this.cost = 0; this.running = true;this.reclaimNeed=0;this.reclaimUntil=0;this.quietTailMinimumBlocks=Math.max(8,Math.ceil(rate*.020/128));
      // Two quantum-sized buffers per slot are allocated at startup, never during
      // an audio callback. The second quantum is needed only for off-grid holds.
      this.records = Array.from({length:this.maxVoices},()=>({id:null,voice:null,plan:null,start:0,pooled:null,cost:0,
        holdOldL:new Float32Array(256),holdOldR:new Float32Array(256),holdFadeActive:false,holdFadeOrigin:0,holdFadeAt:0,holdFadeFrames:0,
        // Four stages x two channels x previous-in/out; one-time slot memory.
        nodalPhaseState:new Float32Array(16),nodalPhaseClean:true}));
      this.metrics={accepted:0,renderStarted:0,ended:0,rejected:0,processBlocks:0,activeBlocks:0,renderedVoiceFrames:0,peakVoices:0,holdDirectFrames:0,holdGatedFrames:0,holdReaderSwaps:0};
      this.rejectReasons=Object.create(null);
      this.retireL = new Float32Array(128); this.retireR = new Float32Array(128); this.fadeL = new Float32Array(128); this.fadeR = new Float32Array(128);
      this.placementState={};this.panL=new Float32Array(128);this.panR=new Float32Array(128);
      this.particleRetireL=new Float32Array(128);this.particleRetireR=new Float32Array(128);this.hasParticleRetired=false;
      this.keyboardRetireL=new Float32Array(128);this.keyboardRetireR=new Float32Array(128);this.hasKeyboardRetired=false;
      this.port.onmessage = ({data}) => {
        try {
          /* C2-0C TEST-ONLY control: never changes Nodal note admission. */
          if(data.type==='c2-capture-control'){
            if(data.enabled){this.__c20c={enabled:true,pos:0,frame:0,frames:0,
              limit:Math.round(rate*Math.min(32,Number(data.maxSeconds)||32)),
              l:new Float32Array(2048),r:new Float32Array(2048)};
              this.port.postMessage({type:'c2-capture-status',status:'started'});
            }else{
              const c=this.__c20c;
              if(c?.pos){this.port.postMessage({type:'c2-nodal-audio',frame:c.frame,rate,
                left:c.l.slice(0,c.pos),right:c.r.slice(0,c.pos)});}
              this.port.postMessage({type:'c2-capture-status',status:'stopped',frames:c?.frames??0});
              this.__c20c=null;
            }
            return;
          }
          if(data.type==='diagnostic'){
            // Cold request only: no periodic port traffic or per-sample clock.
            this.port.postMessage({type:'diagnostic',requestId:data.requestId,
              snapshot:{...this.metrics,rejectReasons:{...this.rejectReasons},activeCost:this.cost,
                activeVoices:this.slots.reduce((n,s)=>n+Number(!!s),0),maxCost:this.maxCost,maxVoices:this.maxVoices,
                frame:frameNow(),sampleRate:rate,plans:this.plans.size,pcmPocPlayed:this.pcmPocPlayed,dspPocPlayed:this.dspPocPlayed,pcmPocResident:!!this.pcmPoc,g2CacheEntries:this.pcmG2.size,g2CacheBytes:this.g2CacheBytes,
                pcmHoldEntries:this.pcmHoldBank.size,pcmHoldBytes:this.pcmHoldBytes,
                pcmHoldPlayed:this.pcmHoldPlayed,pcmHoldRetriggers:this.pcmHoldRetriggers,g2PcmPlayed:this.g2PcmPlayed,g2DspPlayed:this.g2DspPlayed,pcmAwareStarts:this.pcmAwareStarts,pcmAdmissionSavedUnits:this.pcmAdmissionSavedUnits,
                g3Captures:this.g3Captures,g3Aborts:this.g3Aborts,g3Armed:!!this.g3Arm,holdRetriggers:this.holdRetriggers,holdRestartDrops:this.holdRestartDrops,
                note:'renderStarted counts first render of DSP or PCM voices, not audible output or measured XRUNs'}});
          } else if (data.type === 'pcm-poc-install') {
            // Control-message only; never allocate/validate large buffers in process().
            const a=data.left,b=data.right;
            if(!this.plans.has(data.planId)||this.plans.get(data.planId).building||
               !(a instanceof Float32Array)||a.length<1||a.length>rate*6||
               (b!=null&&(!(b instanceof Float32Array)||b.length!==a.length))||
               !Number.isSafeInteger(data.pcmId)||data.pcmId<1)
              throw new Error('Invalid Nodal PCM POC template');
            this.pcmPoc={pcmId:data.pcmId,planId:data.planId,left:a,right:b??null};
            this.port.postMessage({type:'pcm-poc-ready',pcmId:data.pcmId});
          } else if(data.type==='pcm-g3-arm'){
            const a=data.left,b=data.right;
            if(this.g3Arm||!Number.isSafeInteger(data.token)||data.token<1||
               !this.plans.has(data.planId)||this.plans.get(data.planId).building||
               !(a instanceof Float32Array)||!(b instanceof Float32Array)||
               a.length!==b.length||a.length<128||a.length>rate*2||
               a.byteLength+b.byteLength>2097152) {
              this.port.postMessage({type:'pcm-g3-failed',token:data.token,reason:'Capture arm rejected'});
            }else{
              this.g3Arm={token:data.token,planId:data.planId,left:a,right:b,frames:0,invalid:false};
              this.port.postMessage({type:'pcm-g3-armed',token:data.token});
            }
          } else if(data.type==='pcm-g3-disarm'){
            if(this.g3Arm?.token===data.token)this.g3Arm=null;
          } else if(data.type==='pcm-hold-install'){
            const a=data.left,b=data.right,id=data.pcmId,bytes=a?.byteLength+(b?.byteLength||0),identity=data.renderIdentity;
            if(!identity||!Number.isFinite(identity.frequency)||identity.frequency<5||identity.frequency>12000||
              !Number.isFinite(identity.velocity)||identity.velocity<0||identity.velocity>1||
              !Number.isFinite(identity.gain)||identity.gain<0||identity.gain>1||
              !Number.isSafeInteger(identity.seed)||identity.seed<0||identity.seed>4294967295||
              !Number.isSafeInteger(id)||id<1||!this.plans.has(data.planId)||
              this.plans.get(data.planId).building||!(a instanceof Float32Array)||
              a.length<128||a.length>Math.ceil(rate*1.65)||
              (b!=null&&(!(b instanceof Float32Array)||b.length!==a.length))||
              bytes>12000000||this.pcmHoldBank.has(id)||this.pcmHoldBank.size>=24||
              this.pcmHoldBytes+bytes>12000000){
              this.port.postMessage({type:'pcm-hold-error',pcmId:id,message:'Hold bank install rejected'});return;
            }
            for(let i=0;i<a.length;i++)if(!Number.isFinite(a[i])||(b&&!Number.isFinite(b[i]))){
              this.port.postMessage({type:'pcm-hold-error',pcmId:id,message:'Hold PCM contains nonfinite sample'});return;
            }
            this.pcmHoldBank.set(id,{pcmId:id,planId:data.planId,left:a,right:b??null,bytes,renderIdentity:Object.freeze({...identity})});
            this.pcmHoldBytes+=bytes;
            this.port.postMessage({type:'pcm-hold-ready',pcmId:id});
          } else if(data.type==='pcm-hold-remove'){
            const entry=this.pcmHoldBank.get(data.pcmId);
            if(entry){this.pcmHoldBytes-=entry.bytes;this.pcmHoldBank.delete(data.pcmId);}
          } else if(data.type==='pcm-g2-install'){
            // Port-control only. Host has validated all finite samples before transfer.
            const a=data.left,b=data.right,id=data.pcmId;
            const bytes=a?.byteLength+(b?.byteLength||0);
            if(!Number.isSafeInteger(id)||id<1||!this.plans.has(data.planId)||
              this.plans.get(data.planId).building||!(a instanceof Float32Array)||
              !a.length||a.length>rate*6||(b!=null&&(!(b instanceof Float32Array)||b.length!==a.length))||
              bytes>2097152||this.pcmG2.has(id)||this.pcmG2.size>=6||
              this.g2CacheBytes+bytes>2097152){
              this.port.postMessage({type:'pcm-g2-error',pcmId:id,message:'G2 cache install rejected'});return;
            }
            this.pcmG2.set(id,{pcmId:id,planId:data.planId,left:a,right:b??null,bytes});
            this.g2CacheBytes+=bytes;
            this.port.postMessage({type:'pcm-g2-ready',pcmId:id,bytes});
          } else if(data.type==='pcm-g2-remove'){
            const entry=this.pcmG2.get(data.pcmId);
            if(entry){this.g2CacheBytes-=entry.bytes;this.pcmG2.delete(data.pcmId);}
          } else if(data.type==='pcm-g2-clear'){
            this.pcmG2.clear();this.g2CacheBytes=0;
          } else if (data.type === 'pcm-poc-clear') {
            this.pcmPoc=null;
          } else if (data.type === 'plan') {
            if (this.plans.size >= 16 && !this.plans.has(data.id)) throw new Error('Nodal plan bank full');
            const plan=data.plan,pool=[];
            if(data.prepared)dsp.installPrepared(plan,data.prepared,rate);
            if(plan.emiliaWeave)dsp.prepareEmiliaFixed(plan,rate);
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
          } else if (data.type === 'reclaim-pressure') {
            if(Number.isFinite(data.cost)&&data.cost>0&&data.cost<=this.maxCost){
              this.reclaimNeed=Math.max(this.reclaimNeed,data.cost);this.reclaimUntil=frameNow()+Math.round(rate*.5);
            }
          } else if (data.type === 'forget') { this.plans.delete(data.id);if(this.pcmPoc?.planId===data.id)this.pcmPoc=null;
            for(const [id,entry] of this.pcmG2)if(entry.planId===data.id){this.g2CacheBytes-=entry.bytes;this.pcmG2.delete(id);}
            for(const [id,entry] of this.pcmHoldBank)if(entry.planId===data.id){this.pcmHoldBytes-=entry.bytes;this.pcmHoldBank.delete(id);} }
          else if (data.type === 'note') {
            const bank=this.plans.get(data.planId),plan=bank?.building?null:bank?.plan,slot=this.slots.indexOf(null);
            const now = frameNow(), start = Math.round(data.startSec * rate);
            if (!plan || slot < 0 || !Number.isFinite(start) || start < now - Math.round(rate * .008) || start > now + rate * 2) {
              const reason = !plan ? 'plan missing' : slot < 0 ? 'voice capacity' : !Number.isFinite(start) ? 'invalid start' : start < now - Math.round(rate * .008) ? 'late' : 'too far ahead';
              this.reject(data.id,reason); return;
            }
            const holdPcm=Number.isSafeInteger(data.pcmHoldId)&&data.pcmHoldId>0;
            const holdTemplate=holdPcm?this.pcmHoldBank.get(data.pcmHoldId):null;
            if(holdPcm&&(!holdTemplate||holdTemplate.planId!==data.planId||
              !Number.isFinite(data.holdEpoch)||data.options?.held!==true||!pcmHoldMatches(holdTemplate,data.options))){
              this.reject(data.id,'pcm-hold-missing');return;
            }
            const g2Pcm=Number.isSafeInteger(data.pcmG2Id)&&data.pcmG2Id>0;
            const g2Template=g2Pcm?this.pcmG2.get(data.pcmG2Id):null;
            if(g2Pcm&&(!g2Template||g2Template.planId!==data.planId)){
              this.reject(data.id,'pcm-g2-missing');return;
            }
            const usePcm=g2Pcm||(Number.isSafeInteger(data.pcmPocId)&&data.pcmPocId>0);
            if(usePcm&&!g2Pcm&&(!this.pcmPoc||this.pcmPoc.pcmId!==data.pcmPocId||this.pcmPoc.planId!==data.planId)){
              this.reject(data.id,'pcm-poc-missing');return;
            }
            // Recompute rather than trust a cost supplied by the host. Only G2 PCM
            // resident under the exact plan can receive the lower voice cost.
            const admissionCost=holdPcm&&holdTemplate?.planId===data.planId
              ?Math.min(plan.cost,1):g2Pcm&&g2Template?.planId===data.planId&&data.pcmAdmissionPolicy==='pcm-aware'
              ?Math.min(plan.cost,1):plan.cost;
            if(this.cost+admissionCost>this.maxCost+1e-9){this.reject(data.id,'voice capacity');return;}
            let pooled=null,voice;
            if(holdPcm){voice=pcmHoldVoice(holdTemplate,{...data.options,nodalHoldIntervalMs:data.holdClock?undefined:data.options?.nodalHoldIntervalMs,releaseSec:data.options?.releaseSec??plan.articulation?.releaseSec});this.pcmHoldPlayed++;}
            else if(usePcm){voice=pcmPocVoice(g2Pcm?g2Template:this.pcmPoc);
              if(g2Pcm)this.g2PcmPlayed++;else this.pcmPocPlayed++;}
            else if(bank.reusable){
              for(let i=0;i<bank.pool.length;i++)if(!bank.pool[i].busy){pooled=bank.pool[i];break;}
              if(!pooled){this.reject(data.id,'voice capacity');return;}
              voice=pooled.voice;voice.reset(data.options);pooled.busy=true;
            }else voice=dsp.voice(plan,data.options,rate);
            if(!usePcm&&!holdPcm){this.dspPocPlayed++;if(data.pcmG2Candidate===true)this.g2DspPlayed++;}
            const record=this.records[slot];
            const capture=this.g3Arm?.token===data.pcmG3CaptureToken&&
              this.g3Arm?.planId===data.planId&&!usePcm?this.g3Arm:null;
            if(capture)this.g3Arm=null;
            record.holdClock=null;record.holdPCMId=holdTemplate?.pcmId??null;record.g3=capture;record.holdEpoch=Number.isFinite(data.holdEpoch)?data.holdEpoch:null;record.holdRetrigger=null;record.holdFadeActive=false;
            record.id=data.id;record.voice=voice;record.plan=plan;record.planId=data.planId;
            // Inactive means exact DSP/PCM bypass: no extra sample operations.
            record.nodalColorEnabled=data.options?.nodalTimbreEnabled===true&&data.options?.held===true;
            record.nodalColorTarget=record.nodalColorEnabled&&Number.isFinite(data.options.nodalTimbreX)?Math.max(0,Math.min(1,data.options.nodalTimbreX)):.5;
            // Start dry and ramp into the chosen X colour; no attack latency.
            record.nodalColorCurrent=.5;
            record.nodalPhaseState.fill(0);record.nodalPhaseClean=true;record.start=Math.max(now,start);record.rendered=false;record.pooled=pooled;record.cost=admissionCost;record.quietTailBlocks=0;record.pcmPoc=usePcm||holdPcm;record.holdPCM=holdPcm;record.holdPCMFrequency=holdPcm?data.options?.frequency:null;record.lane=data.lane==='particle'?1:this.separateKeyboard&&data.routeLane==='keyboard'?2:0;record.mixLane=['particle','wave','keyboard','resident'].includes(data.mixLane)?data.mixLane:data.lane;record.agentIndex=Number.isInteger(data.agentIndex)&&data.agentIndex>=0&&data.agentIndex<32?data.agentIndex:null;this.place(record,true);
            if(data.holdClock&&data.options?.held===true&&['coupled-modal-v1','coupled-modal-v2'].includes(plan.kernelVersion))
              this.setHoldClock(record,data.holdClock,data.options,holdTemplate?.pcmId??null,true);
            this.slots[slot]=record;this.slotEnd=Math.max(this.slotEnd,slot+1);this.cost+=admissionCost;
            if(g2Pcm&&admissionCost<plan.cost){this.pcmAwareStarts++;this.pcmAdmissionSavedUnits+=plan.cost-admissionCost;}
            this.metrics.accepted++;this.metrics.peakVoices=Math.max(this.metrics.peakVoices,this.slots.reduce((n,s)=>n+Number(!!s),0));
            this.port.postMessage({type: 'started', id: data.id, backend:usePcm||holdPcm?'pcm':'dsp'});
          } else if(data.type==='hold-clock-update'){
            const s=this.slots.find(v=>v&&v.id===data.id);
            const t=data.pcmHoldId!=null?this.pcmHoldBank.get(data.pcmHoldId):null;
            if(!s||!s.holdClock||s.voice.released||s.holdEpoch!==data.holdEpoch||
              (data.pcmHoldId!=null&&(!t||t.planId!==s.planId||!pcmHoldMatches(t,data.options))))return;
            this.setHoldClock(s,data.holdClock,data.options,data.pcmHoldId??null);
          } else if(data.type==='hold-retrigger'){
            const s=this.slots.find(v=>v&&v.id===data.id&&v.plan&&(v.plan.kernelVersion==='coupled-modal-v1'||v.plan.kernelVersion==='coupled-modal-v2')&&(!v.pcmPoc||v.holdPCM)&&v.voice&&typeof v.voice.reset==='function');
            const template=Number.isSafeInteger(data.pcmHoldId)?this.pcmHoldBank.get(data.pcmHoldId):null;
            if(data.pcmHoldId!=null&&(!template||template.planId!==s?.planId)){
              this.holdRestartDrops++;this.port.postMessage({type:'hold-retrigger-rejected',id:data.id,reason:'stale-pcm'});return;
            }
            const at=Math.round(data.startSec*rate),now=frameNow();
            if(!s||s.voice.released||s.holdEpoch!==data.holdEpoch||!Number.isFinite(at)||at<now-Math.round(rate*.008)||at>now+rate*2){this.holdRestartDrops++;this.port.postMessage({type:'hold-retrigger-rejected',id:data.id,reason:'stale-or-ineligible'});return;}
            // Last scheduled pulse wins. No second physical ticket or voice slot.
            s.holdRetrigger={at,options:data.options,pcmHoldId:template?.pcmId??null};
            this.port.postMessage({type:'hold-retrigger-queued',id:data.id});
          } else if(data.type==='nodal-hold-x'){
            const voice=this.slots.find(v=>v&&v.id===data.id);
            if(voice?.nodalColorEnabled&&voice.holdEpoch===data.holdEpoch&&Number.isFinite(data.x))
              voice.nodalColorTarget=Math.max(0,Math.min(1,data.x));
          } else if(data.type==='placement'){this.placementState=data.state??{};for(let i=0;i<this.slotEnd;i++){const s=this.slots[i];if(s)this.place(s,false)}} else if (data.type === 'release' || data.type === 'frequency') {
            for (const s of this.slots) if (s && s.id === data.id){
              if(s.g3)s.g3.invalid=true; // Dynamic modulation/key-up is not certified PCM.
              if(data.type==='release'){s.holdRetrigger=null;if(s.holdClock&&!s.holdClock.sounding){this.finish(this.slots.indexOf(s));continue;}s.holdClock=null;} // Never reopen a released Hold key.
              data.type === 'release' ? s.voice.noteOff() : s.voice.setFrequency(data.frequency);
            }
          } else if(data.type==='cut'){
            const index=this.slots.findIndex(s=>s&&s.id===data.id);
            if(index>=0){if(this.slots[index].rendered)this.retire(index);else this.finish(index);}
          } else if (data.type === 'stop') { for(let i=0;i<this.slots.length;i++){const s=this.slots[i];if(!s)continue;
            // A scheduled note which has never rendered owns no audible tail.
            // Rendering a retire fade here would create a phantom early attack.
            s.holdClock=null;s.holdRetrigger=null;if(!s.rendered)this.finish(i);else if(s.pcmPoc||s.plan.kernelVersion==='coupled-modal-v2')this.retire(i);else s.voice.noteOff();} }
          else if (data.type === 'retire') { const index=this.slots.findIndex(s=>s&&s.id===data.id&&s.plan.kernelVersion==='coupled-modal-v2'&&s.voice.released); if(index>=0)this.retire(index); }
          else if (data.type === 'dispose') { this.g3Arm=null;this.pcmG2.clear();this.g2CacheBytes=0;this.pcmHoldBank.clear();this.pcmHoldBytes=0;this.pcmPoc=null;this.running = false; this.slots.fill(null);this.slotEnd=0; this.plans.clear(); this.cost = 0; }
        } catch (error) {
          // A failed partial pool must not reserve one of the 16 plan slots.
          if(data.type==='plan'||data.type==='stage')this.plans.delete(data.id);
          this.port.postMessage({type: 'error', id: data.id, message: String(error.message)});
        }
      };
    }
    // PRECISION02: only the audio frame counter clocks a native Nodal roll.
    setHoldClock(s, config, options, pcmId, initial=false){
      if(!config||!Number.isFinite(config.startSec)||!Number.isFinite(config.intervalMs)||
        config.intervalMs<4||config.intervalMs>16000||!Array.isArray(config.pattern)||
        config.pattern.length<1||config.pattern.length>256||config.pattern.some(x=>x!==0&&x!==1)||
        (config.pitchRatios!=null&&(!Array.isArray(config.pitchRatios)||config.pitchRatios.length!==config.pattern.length||
        config.pitchRatios.some(x=>!Number.isFinite(x)||x<.5||x>2))))return false;
      const pitched=config.pitchRatios?.some(r=>r!==1)??false;
      const stepOptions=pitched?config.pitchRatios.map(r=>r===1?options:{...options,frequency:options.frequency*r,holdPitchRatio:r}):null;
      const interval=config.intervalMs*rate/1000;
      if(interval<128)return false;
      const now=frameNow(),old=s.holdClock;
      if(old){
        // Do not move the timeline or replay a tick on ordinary control updates.
        // Tempo edits preserve the next not-yet-rendered step number.
        if(old.interval!==interval){
          const next=Math.max(now,Math.round(old.start+old.index*old.interval));
          old.start=next-old.index*interval;old.interval=interval;
        }
        old.pattern=config.pattern.slice();old.options=options;old.pcmId=pcmId;old.stepOptions=stepOptions;
        if(pcmId!=null&&pcmId!==s.holdPCMId&&old.nextPcmId!==pcmId){
          const template=this.pcmHoldBank.get(pcmId);
          old.nextPcmVoice=template?pcmHoldVoice(template,{...options,nodalHoldIntervalMs:undefined,
            releaseSec:options.releaseSec??s.plan.articulation?.releaseSec}):null;
          old.nextPcmId=pcmId;
        }else if(pcmId==null){old.nextPcmVoice=null;old.nextPcmId=null;}
      }else{
        const start=config.startSec*rate;
        const index=Math.max(0,Math.ceil((s.start-start-.5)/interval));
        s.holdClock={start,interval,index,pattern:config.pattern.slice(),options,pcmId,stepOptions,
          sounding:false,attackFrame:0,endFrame:0};
        // Initial admission may arrive late. Align the first actual attack to
        // the next future grid point rather than inserting an off-grid pulse.
        s.start=Math.max(s.start,Math.round(start+index*interval));
      }
      return true;
    }
    renderHoldClock(s,left,right,now,frames){
      const c=s.holdClock;let cursor=0;
      while(cursor<frames){
        const absolute=now+cursor;
        let next=Math.round(c.start+c.index*c.interval);
        if(next<absolute){c.index=Math.max(c.index,Math.ceil((absolute-c.start)/c.interval));next=Math.round(c.start+c.index*c.interval);}
        if(next===absolute){
          const slotIndex=c.index%c.pattern.length,active=c.pattern[slotIndex]===1;
          c.index++;c.sounding=false;
          if(active){
            const t=c.pcmId!=null?this.pcmHoldBank.get(c.pcmId):null;
            if(c.pcmId!=null&&(!t||t.planId!==s.planId||!pcmHoldMatches(t,c.options))){
              this.holdRestartDrops++;
            }else if(s.holdPCM&&!t&&c.options.frequency!==s.holdPCMFrequency){
              this.holdRestartDrops++;
            }else{
              if(t&&(!s.holdPCM||s.holdPCMId!==c.pcmId)){
                if(!c.nextPcmVoice||c.nextPcmId!==c.pcmId)throw new Error('Hold PCM reader not control-prepared');
                if(s.pooled){s.pooled.busy=false;s.pooled=null;}
                s.voice=c.nextPcmVoice;c.nextPcmVoice=null;c.nextPcmId=null;
                s.voice.reset(c.stepOptions?c.stepOptions[slotIndex]:c.options);
                s.holdPCM=true;s.pcmPoc=true;s.holdPCMId=c.pcmId;
                this.metrics.holdReaderSwaps++;
                if(s.cost>1){const old=s.cost;s.cost=1;this.cost-=old-1;this.port.postMessage({type:'cost',id:s.id,cost:1});}
              }else s.voice.reset(c.stepOptions?c.stepOptions[slotIndex]:c.options);
              s.holdPCMFrequency=c.options.frequency;
              c.sounding=true;c.attackFrame=absolute;c.endFrame=Math.round(c.start+c.index*c.interval);
              this.holdRetriggers++;if(s.holdPCM)this.pcmHoldRetriggers++;
              // Test capture is opt-in; normal rolls send no per-step messages.
              if(this.__c20c?.enabled)this.port.postMessage({type:'c2-hold-clock-tick',id:s.id,frame:absolute,index:c.index-1});
            }
          }
          next=Math.round(c.start+c.index*c.interval);
        }
        let end=Math.min(frames,next-now);
        if(c.sounding)end=Math.min(end,c.endFrame-now);
        if(end<=cursor){c.sounding=false;continue;}
        if(c.sounding&&!s.voice.ended){
          const gate=Math.max(1,Math.min(64,Math.floor(c.interval*.1)));
          // Unity-gain spans need neither scratch clearing nor a second mix.
          // The bounded final gate retains the established waveform/timeline.
          if(now+end<=c.endFrame-1-gate){
            this.renderPlaced(s,left,right,cursor,end-cursor,true);
            this.metrics.holdDirectFrames+=end-cursor;
          }else{
            this.fadeL.fill(0);this.fadeR.fill(0);
            this.renderPlaced(s,this.fadeL,this.fadeR,cursor,end-cursor,false);
            for(let k=cursor;k<end;k++){
              const gain=Math.min(1,Math.max(0,(c.endFrame-1-now-k)/gate));
              left[k]+=this.fadeL[k]*gain;if(right!==left)right[k]+=this.fadeR[k]*gain;
            }
            this.metrics.holdGatedFrames+=end-cursor;
          }
          this.metrics.renderedVoiceFrames+=end-cursor;
          if(!s.rendered){s.rendered=true;this.metrics.renderStarted++;}
        }
        cursor=end;
        if(now+cursor>=c.endFrame)c.sounding=false;
      }
    }
    process(inputs, outputs) {
      this.metrics.processBlocks++;
      const output = outputs[0]; if (!output?.[0]) return this.running;
      for(let lane=1;lane<outputs.length;lane++){outputs[lane]?.[0]?.fill(0);outputs[lane]?.[1]?.fill(0);}
      const left = output[0], right = output[1] ?? left; left.fill(0); if (right !== left) right.fill(0);
      // Hold repeats reuse their existing voice and admission. The old signal is
      // rendered until the actual attack frame, then crossfaded in AUDIO time;
      // no fade is allowed to begin before its scheduled onset. Never allocate
      // extra voices/tickets or timer-based repeats in this worklet.
      const holdNow=frameNow();
      for(let holdIndex=0;holdIndex<this.slotEnd;holdIndex++){
        const v=this.slots[holdIndex],r=v?.holdRetrigger;
        if(!r||r.at>=holdNow+left.length)continue;
        v.holdRetrigger=null;
        try{
          // C2-3A: an invalid Hold command must have zero audio side effects.
          // Validate before advancing the retiring reader or adding fade energy.
          if(r.pcmHoldId!=null){
            const nextTemplate=this.pcmHoldBank.get(r.pcmHoldId);
            if(!nextTemplate||nextTemplate.planId!==v.planId||!pcmHoldMatches(nextTemplate,r.options))
              throw new Error('PCM hold template invalid or mismatched before fade');
          }else if(v.holdPCM&&r.options?.frequency!==v.holdPCMFrequency){
            throw new Error('Changed pitch requires a separately prepared PCM attack');
          }
          if(v.rendered){
            const onset=Math.max(holdNow,r.at),extra=Math.max(0,onset-holdNow);
            // A restart can arrive while the previous fade is still finishing.
            // Fold the old composite into the next resident buffer; do not cut
            // the prior old voice abruptly or allocate another physical voice.
            const prior=v.holdFadeActive,priorOrigin=v.holdFadeOrigin,
              priorAt=v.holdFadeAt,priorFrames=v.holdFadeFrames;
            // First chunk is always the current quantum; only `extra` samples
            // from the following quantum are computed to finish the 128-frame
            // transition, so on-grid retriggers have no additional DSP render.
            for(let chunk=0;chunk<2;chunk++){
              const count=chunk===0?128:extra;
              if(!count)continue;
              this.fadeL.fill(0);this.fadeR.fill(0);
              this.renderPlaced(v,this.fadeL,this.fadeR,0,count,false);
              const base=chunk*128;
              for(let k=0;k<count;k++){
                const frame=holdNow+base+k,ix=frame-priorOrigin;
                const f=prior?Math.max(0,Math.min(1,(frame-priorAt)/127)):1;
                const oldGain=prior?(frame<priorAt?1:1-f):0;
                const newGain=prior?(frame<priorAt?0:f):1;
                const oldL=prior&&ix>=0&&ix<priorFrames?v.holdOldL[ix]:0;
                const oldR=prior&&ix>=0&&ix<priorFrames?v.holdOldR[ix]:0;
                v.holdOldL[base+k]=oldL*oldGain+this.fadeL[k]*newGain;
                v.holdOldR[base+k]=oldR*oldGain+this.fadeR[k]*newGain;
              }
            }
            v.holdFadeOrigin=holdNow;v.holdFadeAt=onset;
            v.holdFadeFrames=128+extra;v.holdFadeActive=true;
          }else v.holdFadeActive=false;
          if(r.pcmHoldId!=null){
            const template=this.pcmHoldBank.get(r.pcmHoldId);
            if(!template||template.planId!==v.planId)throw new Error('PCM hold template invalidated');
            if(!pcmHoldMatches(template,r.options))throw new Error('PCM parameters do not match prepared template');
            if(v.pooled){v.pooled.busy=false;v.pooled=null;}
            v.voice=pcmHoldVoice(template,{...r.options,nodalPcmHandoverFrames:0,releaseSec:r.options?.releaseSec??v.plan.articulation?.releaseSec});v.pcmPoc=true;v.holdPCM=true;
            if(v.cost>1){const old=v.cost;v.cost=1;this.cost-=old-1;
              this.port.postMessage({type:'cost',id:v.id,cost:1});}
            this.pcmHoldRetriggers++;
          }else{
            if(v.holdPCM&&r.options?.frequency!==v.holdPCMFrequency)
              throw new Error('Changed pitch requires a separately prepared PCM attack');
            v.voice.reset(r.options);
          }
          v.holdPCMFrequency=r.options?.frequency;
          v.start=Math.max(holdNow,r.at);v.rendered=false;v.quietTailBlocks=0;
          this.holdRetriggers++;
          if(this.__c20c?.enabled)this.port.postMessage({type:'c2-hold-reset-executed',id:v.id,frame:holdNow,scheduledFrame:r.at});
        }catch(error){this.holdRestartDrops++;this.port.postMessage({type:'hold-retrigger-rejected',id:v.id,reason:String(error.message||error)});}
      }
      // Retire buffers are exceptional control-path fades. Empty blocks never
      // mix/clear 256 zero samples or traverse all 32 prepared voice slots.
      if(this.hasRetired){const count=Math.min(128,left.length);for(let i=0;i<count;i++){left[i]+=this.retireL[i];if(right!==left)right[i]+=this.retireR[i];}this.retireL.fill(0);this.retireR.fill(0);this.hasRetired=false;}
      if(this.hasParticleRetired){const lane=outputs[1]??output,l=lane[0],r=lane[1]??l;for(let i=0;i<Math.min(128,l.length);i++){l[i]+=this.particleRetireL[i];if(r!==l)r[i]+=this.particleRetireR[i];}this.particleRetireL.fill(0);this.particleRetireR.fill(0);this.hasParticleRetired=false;}
      if(this.hasKeyboardRetired){const lane=outputs[2]??output,l=lane[0],r=lane[1]??l;for(let i=0;i<Math.min(128,l.length);i++){l[i]+=this.keyboardRetireL[i];if(r!==l)r[i]+=this.keyboardRetireR[i];}this.keyboardRetireL.fill(0);this.keyboardRetireR.fill(0);this.hasKeyboardRetired=false;}
      if(this.slotEnd===0)return this.running;
      this.metrics.activeBlocks++;
      const now = frameNow();
      for (let i = 0; i < this.slotEnd; i++) {
        const s = this.slots[i]; if (!s || s.start >= now + left.length) continue;
        const offset = Math.max(0, s.start - now),laneOutput=s.lane>0&&outputs[s.lane]?.[0]?outputs[s.lane]:output;
        try {
          if(s.holdClock){
            this.renderHoldClock(s,laneOutput[0],laneOutput[1]??laneOutput[0],now,left.length);
            continue; // a muted/ended reader still owns its one admitted Hold slot
          }
          if(s.holdFadeActive){
            // Apply the exact same frame-domain envelope to old and new.
            // Pre-onset old samples remain FULL amplitude; a second quantum
            // carries the remaining fade only if the attack began off-grid.
            this.fadeL.fill(0);this.fadeR.fill(0);
            this.renderPlaced(s,this.fadeL,this.fadeR,offset,left.length-offset,false);
            const dstL=laneOutput[0],dstR=laneOutput[1]??dstL;
            for(let k=0;k<left.length;k++){
              const frame=now+k,ix=frame-s.holdFadeOrigin;
              const f=Math.max(0,Math.min(1,(frame-s.holdFadeAt)/127));
              const oldGain=frame<s.holdFadeAt?1:1-f;
              const newGain=frame<s.holdFadeAt?0:f;
              const priorL=ix>=0&&ix<s.holdFadeFrames?s.holdOldL[ix]:0;
              const priorR=ix>=0&&ix<s.holdFadeFrames?s.holdOldR[ix]:0;
              dstL[k]+=priorL*oldGain+this.fadeL[k]*newGain;
              if(dstR!==dstL)dstR[k]+=priorR*oldGain+this.fadeR[k]*newGain;
            }
            if(now+left.length>s.holdFadeAt+127)s.holdFadeActive=false;
          }else this.renderPlaced(s,laneOutput[0],laneOutput[1]??laneOutput[0],offset,left.length-offset,true);
          if(!s.rendered){s.rendered=true;this.metrics.renderStarted++;}this.metrics.renderedVoiceFrames+=left.length-offset;
        }
        catch (error) { s.voice.noteOff(); this.port.postMessage({type: 'error', id: s.id, message: String(error.message)}); this.finish(i); continue; }
        // LCR-3A recovery: finish() clears s.voice and s.plan. A naturally
        // completed voice must not enter the post-render tail-reclaim checks.
        // Otherwise s.plan.kernelVersion throws inside process() and can
        // permanently terminate the Nodal AudioWorklet processor.
        if(s.voice.ended){this.finish(i);continue;}
        if(!s.pcmPoc&&s.plan.kernelVersion==='coupled-modal-v2'&&s.voice.dryEnded&&s.plan.tailSec>0&&s.cost===s.plan.cost&&(s.plan.tailCost??s.plan.cost*this.tailScale)<s.cost){
          const cost=s.plan.tailCost??s.plan.cost*this.tailScale;this.cost+=cost-s.cost;s.cost=cost;
          this.port.postMessage({type:'cost',id:s.id,cost});
        }
        // LCR-3A: a real, released, dry-ended v2 modal tail may surrender its
        // physical slot ONLY at hard local capacity pressure. The measurement
        // is the actual post-filter per-voice PCM peak, never abstract cost.
        // At least 20ms (never fewer than 8 render quanta) + -90dBFS peak.
        // Worklet finish emits 'ended'; host ticket is released only on receipt.
        if(!s.pcmPoc&&s.plan.kernelVersion==='coupled-modal-v2' && s.plan.tailSec>0 &&
           s.voice.released && s.voice.dryEnded && Number.isFinite(s.voice.tailPeak) &&
           s.voice.tailPeak <= 0.0000316227766016838) {
          s.quietTailBlocks=(s.quietTailBlocks||0)+1;
        } else s.quietTailBlocks=0;
        if(s.quietTailBlocks>=this.quietTailMinimumBlocks && (this.cost>=this.maxCost-1e-9 || this.slots.every(Boolean) ||
           (this.reclaimUntil>=frameNow() && this.reclaimNeed>0 && this.cost+this.reclaimNeed>this.maxCost+1e-9))){
          this.retire(i);
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
      const centered=!s.panRamp&&s.panA===1&&s.panB===0&&s.panC===0&&s.panD===1;
      if(!s.g3&&centered&&(!s.nodalColorEnabled||
          (Math.abs(s.nodalColorTarget-.5)<1e-5&&Math.abs(s.nodalColorCurrent-.5)<1e-5))){
        // Full neutral and disabled remain byte-for-byte dry DSP/PCM bypass.
        // Clean the 16-state phase memory only on an active→dry transition.
        if(!s.nodalPhaseClean){s.nodalPhaseState.fill(0);s.nodalPhaseClean=true;}
        s.voice.process(left,right,offset,count,add);return}
      // One shared scratch pair per processor, reused serially by all voices.
      // For G3, capture the genuine per-voice DSP signal BEFORE pan and FX.
      // Offset-aware recording excludes pre-onset zeros from mid-quantum starts.
      const l=this.panL,r=this.panR;s.voice.process(l,r,offset,count,false);
      if(s.nodalColorEnabled){
        // PHASER01: four phase-only AP stages per stereo channel. X sweeps
        // spectral nulls by dry/wet phase interference, not an EQ shelf.
        // Frequency lookup only twice per audio block; coefficients interpolate
        // through each quantum. No trig, allocations, PCM renders or routing.
        const smooth=this.nodalColorSmoothing,table=this.nodalPhaseCoefficients;
        const m=s.nodalPhaseState,target=s.nodalColorTarget;
        let cur=s.nodalColorCurrent;
        const next=target+(cur-target)*(count===128?this.nodalPhaseBlockDecay:this.nodalPhasePartialDecay[count]);
        const a=Math.max(0,Math.min(128,cur*128)),b=Math.max(0,Math.min(128,next*128));
        const ja=Math.min(127,a|0),jb=Math.min(127,b|0),fa=a-ja,fb=b-jb,ia=ja*4,ib=jb*4;
        let c0=table[ia]+(table[ia+4]-table[ia])*fa,
            c1=table[ia+1]+(table[ia+5]-table[ia+1])*fa,
            c2=table[ia+2]+(table[ia+6]-table[ia+2])*fa,
            c3=table[ia+3]+(table[ia+7]-table[ia+3])*fa;
        const d0=(table[ib]+(table[ib+4]-table[ib])*fb-c0)/count,
              d1=(table[ib+1]+(table[ib+5]-table[ib+1])*fb-c1)/count,
              d2=(table[ib+2]+(table[ib+6]-table[ib+2])*fb-c2)/count,
              d3=(table[ib+3]+(table[ib+7]-table[ib+3])*fb-c3)/count;
        let xl0=m[0],xl1=m[1],xl2=m[2],xl3=m[3],yl0=m[4],yl1=m[5],yl2=m[6],yl3=m[7];
        let xr0=m[8],xr1=m[9],xr2=m[10],xr3=m[11],yr0=m[12],yr1=m[13],yr2=m[14],yr3=m[15];
        for(let i=offset,end=offset+count;i<end;i++){
          cur+=(target-cur)*smooth;
          c0+=d0;c1+=d1;c2+=d2;c3+=d3;
          let wl=l[i],wr=r[i];const dryL=wl,dryR=wr;
          let v=c0*wl+xl0-c0*yl0;xl0=wl;yl0=v;wl=v;
          v=c1*wl+xl1-c1*yl1;xl1=wl;yl1=v;wl=v;
          v=c2*wl+xl2-c2*yl2;xl2=wl;yl2=v;wl=v;
          v=c3*wl+xl3-c3*yl3;xl3=wl;yl3=v;wl=v;
          v=c0*wr+xr0-c0*yr0;xr0=wr;yr0=v;wr=v;
          v=c1*wr+xr1-c1*yr1;xr1=wr;yr1=v;wr=v;
          v=c2*wr+xr2-c2*yr2;xr2=wr;yr2=v;wr=v;
          v=c3*wr+xr3-c3*yr3;xr3=wr;yr3=v;wr=v;
          const q=cur-.5,wet=q<0?-q:q;
          l[i]=dryL+(wl-dryL)*wet;r[i]=dryR+(wr-dryR)*wet;
        }
        m[0]=xl0;m[1]=xl1;m[2]=xl2;m[3]=xl3;m[4]=yl0;m[5]=yl1;m[6]=yl2;m[7]=yl3;
        m[8]=xr0;m[9]=xr1;m[10]=xr2;m[11]=xr3;m[12]=yr0;m[13]=yr1;m[14]=yr2;m[15]=yr3;
        s.nodalColorCurrent=cur;s.nodalPhaseClean=false;
        if(target===.5&&Math.abs(cur-.5)<1e-5){s.nodalColorCurrent=.5;m.fill(0);s.nodalPhaseClean=true;}
      }
      if(s.g3&&!s.g3.invalid){
        const c=s.g3,next=c.frames+count;
        if(next>c.left.length)c.invalid=true;
        else{
          for(let i=offset,j=c.frames;i<offset+count;i++,j++){
            const vl=l[i],vr=r[i];if(!Number.isFinite(vl)||!Number.isFinite(vr)){c.invalid=true;break;}
            c.left[j]=vl;c.right[j]=vr;
          }
          if(!c.invalid)c.frames=next;
        }
      }
      if(centered){
        for(let i=offset;i<offset+count;i++){
          if(add){left[i]+=l[i];if(right!==left)right[i]+=r[i];}
          else{left[i]=l[i];if(right!==left)right[i]=r[i];}
        }
        return;
      }
      // The slot is a plain record; no control message interleaves this loop.
      // Preserve each coefficient operation, committing the same final state.
      let panRamp=s.panRamp,curA=s.curA,curB=s.curB,curC=s.curC,curD=s.curD;
      const ramping=panRamp>0,panA=s.panA,panB=s.panB,panC=s.panC,panD=s.panD;
      for(let i=offset;i<offset+count;i++){
        if(panRamp>0){const n=panRamp--;curA+=(panA-curA)/n;curB+=(panB-curB)/n;curC+=(panC-curC)/n;curD+=(panD-curD)/n}
        const a=l[i]*curA+r[i]*curB,b=l[i]*curC+r[i]*curD;
        if(add){left[i]+=a;right[i]+=b}else{left[i]=a;right[i]=b}
      }
      if(ramping){s.curA=curA;s.curB=curB;s.curC=curC;s.curD=curD;s.panRamp=panRamp;}
    }
    retire(index) {
      const s=this.slots[index];if(!s)return;if(s.g3)s.g3.invalid=true;this.fadeL.fill(0);this.fadeR.fill(0);this.renderPlaced(s,this.fadeL,this.fadeR,0,128,false);
      const particle=this.separateLanes&&s.lane===1,keyboard=this.separateKeyboard&&s.lane===2,l=particle?this.particleRetireL:keyboard?this.keyboardRetireL:this.retireL,r=particle?this.particleRetireR:keyboard?this.keyboardRetireR:this.retireR;
      for(let i=0;i<128;i++){const gain=(1-i/127);l[i]+=this.fadeL[i]*gain;r[i]+=this.fadeR[i]*gain;}if(particle)this.hasParticleRetired=true;else if(keyboard)this.hasKeyboardRetired=true;else this.hasRetired=true;this.finish(index);
    }
    reject(id,reason){this.metrics.rejected++;this.rejectReasons[reason]=(this.rejectReasons[reason]??0)+1;this.port.postMessage({type:'rejected',id,reason});}
    finish(index) { const s = this.slots[index]; if (!s) return;
      // Final bounded transfer, never a copy or allocation per audio quantum.
      if(s.g3){const c=s.g3;s.g3=null;
        if(!c.invalid&&c.frames>=128){
          this.g3Captures++;
          this.port.postMessage({type:'pcm-g3-captured',token:c.token,planId:c.planId,
            frames:c.frames,sampleRate:rate,left:c.left,right:c.right},[c.left.buffer,c.right.buffer]);
        }else{this.g3Aborts++;this.port.postMessage({type:'pcm-g3-failed',token:c.token,reason:'Incomplete or invalid live DSP capture'});}
      }
      this.cost -= s.cost;this.metrics.ended++;s.holdClock=null;s.holdFadeActive=false; if(s.pooled)s.pooled.busy=false; this.slots[index] = null;if(index===this.slotEnd-1)while(this.slotEnd>0&&this.slots[this.slotEnd-1]===null)this.slotEnd--;if(this.slotEnd===0)this.cost=0; this.port.postMessage({type: 'ended', id: s.id}); s.voice=null;s.plan=null;s.pooled=null; }
  }
  /* C2-0C TEST-ONLY: raw post-render keyboard lane PCM, per audio frame. */
  const __c20cNativeProcess=NodalProcessor.prototype.process;
  NodalProcessor.prototype.process=function(inputs,outputs,parameters){
    const alive=__c20cNativeProcess.call(this,inputs,outputs,parameters);
    const c=this.__c20c;
    if(!c?.enabled||!outputs?.length)return alive;
    const lane=outputs[2]??outputs[0],left=lane?.[0],right=lane?.[1]??left;
    if(!left)return alive;
    let now=frameNow();
    for(let i=0;i<left.length&&c.frames<c.limit;i++){
      if(c.pos===0)c.frame=now+i;
      c.l[c.pos]=left[i];c.r[c.pos]=right[i];c.pos++;c.frames++;
      if(c.pos===c.l.length){
        const l=c.l,r=c.r;
        this.port.postMessage({type:'c2-nodal-audio',frame:c.frame,rate,left:l,right:r},[l.buffer,r.buffer]);
        c.l=new Float32Array(2048);c.r=new Float32Array(2048);c.pos=0;
      }
    }
    return alive;
  };
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

// Cold diagnostics only: describe the prepared renderer, never estimate CPU %
// or change admission from an abstract operation count.
function nodalPreparedWorkload(plan,sampleRate){
  const weave=plan.emiliaWeave,hx=weave?.hxSource,v2=plan.kernelVersion==='coupled-modal-v2';
  const nonlinear=plan.nonlinearNodes?.length??0,nodes=plan.nodes.length;
  return {kernel:weave?(hx?'emilia-hx-weave':'emilia-weave'):plan.emiliaMaterial?'emilia-material':plan.kernelVersion,
    nodes,modalStates:weave||plan.emiliaMaterial?null:nodes*3,
    oversampling:weave?(hx?4:2):plan.emiliaMaterial?2:v2?1:nonlinear?2:1,
    hxOperators:hx?.operators?.length??0,iterativeNonlinearNodes:weave||plan.emiliaMaterial||v2?0:nonlinear,
    physicalVoicesPerNote:1,sampleRate,attackCost:plan.cost,tailCost:plan.tailCost??plan.cost,
    costUnit:'admission units, not CPU time'};
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
    const outputCount=policy.separateLanes?(policy.separateKeyboard?3:2):1;
    const node = new AudioWorkletNode(context, 'xensonar-nodal-instrument-v1', {numberOfInputs: 0, numberOfOutputs:outputCount, outputChannelCount:Array(outputCount).fill(2),processorOptions:{maxCost:policy.maxCost??8,maxVoices:policy.maxVoices??8,tailCostScale:policy.tailCostScale??1,separateLanes:!!policy.separateLanes,separateKeyboard:!!policy.separateKeyboard}});
    globalThis.__XenC20C?.attachNodal(context,node); // TEST-ONLY observer
    const laneRoutes=policy.separateLanes?Array.from({length:outputCount},()=>new Set()):null;
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
    const pocEnabled=true; // G1 UI test page, no URL flag or console required
    let pcmPoc=null,pocSequence=0,pocPending=null,pocWorker=null;
    const holdPcmEntries=new Map(),holdPcmQueue=[],holdPcmWaiting=new Set(),
      holdPcmHints=[],holdPcmHintWaiting=new Set();
    let holdPcmHintPlanId=null;
    let holdPcmBytes=0,holdPcmSerial=0,holdPcmWorker=null,holdPcmWorkerUrl=null,holdPcmBusy=null;
    const holdPcmStats={requests:0,prepared:0,errors:0,evicted:0,hits:0,clockUpdatesSent:0,clockUpdatesSuppressed:0};
    function holdPcmCandidate(prepared,instrument,options,frequency,velocity,gain){
      if(!options.nodalHoldKeyId||options.held!==true||!['coupled-modal-v1','coupled-modal-v2'].includes(prepared.plan.kernelVersion)||
        options.volumeCurve||options.pitchCurve||options.attackSec!=null||options.releaseSec!=null||
        options.forceLiveDSP||!Number.isSafeInteger(options.seed??instrument.seed)||
        !Number.isFinite(options.nodalHoldIntervalMs)||options.nodalHoldIntervalMs<15||
        options.nodalHoldIntervalMs>1200)return null;
      const seed=options.seed??instrument.seed,durationSec=options.durationSec??instrument.articulation.durationSec;
      if(!Number.isFinite(durationSec)||durationSec<.02||durationSec>30)return null;
      return {key:JSON.stringify([prepared.id,context.sampleRate,frequency,velocity,gain,seed,durationSec,'held-attack-v1']),
        planId:prepared.id,planKey:prepared.plan.key,plan:prepared.plan,frequency,velocity,gain,seed,durationSec};
    }
    function holdPcmMakeRoom(bytes){
      while(holdPcmEntries.size>=24||holdPcmBytes+bytes>12000000){
        const victim=[...holdPcmEntries.values()].filter(e=>e.uses===0).sort((a,b)=>a.touched-b.touched)[0];
        if(!victim)return false;
        holdPcmEntries.delete(victim.key);holdPcmBytes-=victim.bytes;holdPcmStats.evicted++;
        node.port.postMessage({type:'pcm-hold-remove',pcmId:victim.id});
      }return true;
    }
    function holdPcmNext(){
      if(disposed||holdPcmBusy||context.state!=='running')return;
      // Live gestures always outrank speculative grid preparations. The same
      // original Nodal worker remains the sole producer of PCM templates.
      const job=holdPcmQueue.pop()??(active.size===0?holdPcmHints.pop():null);if(!job)return;
      holdPcmWaiting.delete(job.key);holdPcmHintWaiting.delete(job.key);
      if(plans.get(job.planKey)?.id!==job.planId||holdPcmEntries.has(job.key)){
        setTimeout(holdPcmNext,0);return;
      }
      if(typeof Worker!=='function'||typeof Blob!=='function'||typeof URL?.createObjectURL!=='function')return;
      try{
        if(!holdPcmWorker){
          holdPcmWorkerUrl=URL.createObjectURL(new Blob(['('+nodalPreviewWorkerEntry.toString()+')('+kernelFactory.toString()+');'],{type:'text/javascript'}));
          holdPcmWorker=new Worker(holdPcmWorkerUrl,{name:'xensonar-nodal-hold-attack'});
        }
        const worker=holdPcmWorker;
        let completed=false;
        const done=(error,data)=>{
          if(completed||job.abandoned)return;completed=true;clearTimeout(timer);holdPcmBusy=null;
          if(error){holdPcmStats.errors++;
            if(holdPcmWorker){holdPcmWorker.terminate();holdPcmWorker=null;}
            if(holdPcmWorkerUrl){URL.revokeObjectURL(holdPcmWorkerUrl);holdPcmWorkerUrl=null;}
            setTimeout(holdPcmNext,0);return;}
          if(disposed||plans.get(job.planKey)?.id!==job.planId){setTimeout(holdPcmNext,0);return;}
          const a=data.left??data.pcm,b=data.right??null;
          const frames=Math.min(a?.length||0,Math.round(context.sampleRate*1.6));
          if(!(a instanceof Float32Array)||frames<128||
            (b!=null&&(!(b instanceof Float32Array)||b.length!==a.length))){
            holdPcmStats.errors++;setTimeout(holdPcmNext,0);return;
          }
          const left=a.slice(0,frames),right=b?b.slice(0,frames):null;
          let audible=false;
          for(let i=0;i<frames;i++){
            if(!Number.isFinite(left[i])||(right&&!Number.isFinite(right[i]))){
              holdPcmStats.errors++;setTimeout(holdPcmNext,0);return;
            }
            if(Math.abs(left[i])>1e-7||right&&Math.abs(right[i])>1e-7)audible=true;
          }
          const bytes=left.byteLength+(right?.byteLength||0);
          if(!audible||!holdPcmMakeRoom(bytes)){holdPcmStats.errors++;setTimeout(holdPcmNext,0);return;}
          const id=++holdPcmSerial;
          const installTimer=setTimeout(()=>{if(holdPcmBusy?.installId===id){
            holdPcmBusy=null;holdPcmStats.errors++;node.port.postMessage({type:'pcm-hold-remove',pcmId:id});holdPcmWorker?.terminate();holdPcmWorker=null;
            if(holdPcmWorkerUrl)URL.revokeObjectURL(holdPcmWorkerUrl);holdPcmWorkerUrl=null;
            setTimeout(holdPcmNext,0);
          }},2000);
          holdPcmBusy={installId:id,timer:installTimer,job,bytes};
          try{node.port.postMessage({type:'pcm-hold-install',pcmId:id,planId:job.planId,renderIdentity:{frequency:job.frequency,velocity:job.velocity,gain:job.gain,seed:job.seed,durationSec:job.durationSec,held:true},left,right},
            right?[left.buffer,right.buffer]:[left.buffer]);}
          catch{clearTimeout(installTimer);holdPcmBusy=null;holdPcmStats.errors++;setTimeout(holdPcmNext,0);}
        };
        const timer=setTimeout(()=>done(new Error('PCM render timeout')),18000);
        holdPcmBusy={job,renderTimer:timer};
        worker.onmessage=({data})=>data?.type==='rendered'?done(null,data):done(new Error(data?.message||'PCM render error'));
        worker.onerror=event=>{event.preventDefault?.();done(new Error('PCM worker error'));};
        worker.postMessage({plan:job.plan,options:{frequency:job.frequency,velocity:job.velocity,gain:job.gain,
          seed:job.seed,durationSec:job.durationSec,held:true},holdAttackFrames:Math.ceil(context.sampleRate*1.25),sampleRate:context.sampleRate});
      }catch{holdPcmBusy=null;holdPcmStats.errors++;setTimeout(holdPcmNext,0);}
    }
    function holdPcmRequest(job,priority='live'){
      if(!job||disposed||holdPcmEntries.has(job.key)||holdPcmBusy?.job?.key===job.key)return;
      if(priority==='hint'){
        job.priority='hint';
        if(holdPcmWaiting.has(job.key)||holdPcmHintWaiting.has(job.key))return;
        if(holdPcmHints.length>=16){const stale=holdPcmHints.shift();holdPcmHintWaiting.delete(stale.key);}
        holdPcmHints.push(job);holdPcmHintWaiting.add(job.key);
      }else{
        if(holdPcmWaiting.has(job.key))return;
        // A played tone promotes an existing background hint instead of
        // creating two renders of the same original-Nodal acoustic identity.
        if(holdPcmHintWaiting.has(job.key)){
          holdPcmHintWaiting.delete(job.key);
          const i=holdPcmHints.findIndex(x=>x.key===job.key);if(i>=0)holdPcmHints.splice(i,1);
        }
        if(holdPcmQueue.length>=10){const stale=holdPcmQueue.shift();holdPcmWaiting.delete(stale.key);}
        holdPcmQueue.push(job);holdPcmWaiting.add(job.key);
      }
      holdPcmStats.requests++;setTimeout(holdPcmNext,0);
    }
    // C2-2A: Prepare *exact* note frequencies from the already authoritative
    // keyboard tuning/grid, never invent 12-EDO semitones or transpose PCM.
    // No additional scheduler, synthesizer or AudioWorklet owner is introduced.
    function prioritizeHoldAttack(candidate){
      const state=holdPcmBusy,job=state?.job;
      if(!job||job.priority!=='hint')return;
      if(candidate?.key===job.key){job.priority='live';return;}
      job.abandoned=true;
      if(state.renderTimer!=null)clearTimeout(state.renderTimer);
      if(state.timer!=null)clearTimeout(state.timer);
      if(state.installId!=null)node.port.postMessage({type:'pcm-hold-remove',pcmId:state.installId});
      holdPcmBusy=null;holdPcmWorker?.terminate();holdPcmWorker=null;
      if(holdPcmWorkerUrl)URL.revokeObjectURL(holdPcmWorkerUrl);holdPcmWorkerUrl=null;
      // Requeue only the descriptor, never old partial PCM or an audible note.
      holdPcmRequest({...job,abandoned:false},'hint');
    }
    function warmHoldPitches(instrument,frequencies,{anchor,velocity=.8,gain=.5,seed=instrument?.seed}={}){
      const record=preparedReferences.get(instrument);
      if(disposed||!record?.ready||plans.get(record.plan.key)!==record||
         !Array.isArray(frequencies)||frequencies.length>2048||
         !Number.isFinite(anchor)||anchor<5||anchor>12000||
         !Number.isFinite(gain)||gain<0||gain>1||
         !Number.isFinite(velocity)||velocity<0||velocity>1||
         !Number.isSafeInteger(seed)||seed<0||seed>4294967295)return 0;
      // The keyboard changes a SOUND OWNER here; stop preparing old speculative
      // notes so a newly selected instrument never waits for an obsolete render.
      // Existing live-note preparations and audible tails are not cancelled.
      if(holdPcmHintPlanId!==record.id){
        holdPcmHintPlanId=record.id;
        for(const stale of holdPcmHints)holdPcmHintWaiting.delete(stale.key);
        holdPcmHints.length=0;
        const stale=holdPcmBusy;
        if(stale?.job?.priority==='hint'&&stale.job.planId!==record.id){
          stale.job.abandoned=true;
          if(stale.renderTimer!=null)clearTimeout(stale.renderTimer);
          if(stale.timer!=null)clearTimeout(stale.timer);
          if(stale.installId!=null)try{node.port.postMessage({type:'pcm-hold-remove',pcmId:stale.installId});}catch{}
          holdPcmBusy=null;
          try{holdPcmWorker?.terminate();}catch{}
          holdPcmWorker=null;
          if(holdPcmWorkerUrl){try{URL.revokeObjectURL(holdPcmWorkerUrl);}catch{}holdPcmWorkerUrl=null;}
        }
      }
      const unique=[...new Set(frequencies.filter(hz=>Number.isFinite(hz)&&hz>=5&&hz<=12000))];
      unique.sort((a,b)=>Math.abs(Math.log2(a/anchor))-Math.abs(Math.log2(b/anchor)));
      const nearest=unique.slice(0,16);let eligible=0;
      // Worklet-ready exact frequency first; queue pops from the end.
      for(let i=nearest.length-1;i>=0;i--){
        const hz=nearest[i],candidate=holdPcmCandidate(record,instrument,
          {nodalHoldKeyId:'__grid_hint',held:true,nodalHoldIntervalMs:85,seed},hz,velocity,gain);
        if(candidate){holdPcmRequest(candidate,'hint');eligible++;}
      }
      return eligible;
    }
    const g2Entries=new Map(),g2CacheMaxBytes=2097152,g2MaxEntries=6;
    let g2CacheBytes=0,g2Sequence=0,g2Pending=null,g2Worker=null,g2WorkerUrl=null,g2Delay=null,g2Generation=0,g2Cancel=null,g2Cancelled=0;
    let g2Hits=0,g2Misses=0,g2Fallbacks=0,g2Bypasses=0,g2Renders=0,g2Failures=0,g2Evictions=0;
    const g2Problems=[];
    let g3Serial=0,g3Pending=null,g3Captured=0,g3Failures=0,g3LastFrames=0,g3LastSampleRate=null;
    const g3Problems=[];
    function pcmG3Status(){return {captured:g3Captured,pending:!!g3Pending,failures:g3Failures,
      lastFrames:g3LastFrames,lastSampleRate:g3LastSampleRate,source:'live-nodal-worklet-pre-pan-pre-fx'};}
    function g3RecordError(reason){g3Failures++;g3Problems.push(String(reason));if(g3Problems.length>8)g3Problems.shift();}
    function g3CancelPending(){if(!g3Pending)return;const p=g3Pending;g3Pending=null;
      clearTimeout(p.timer);try{node.port.postMessage({type:'pcm-g3-disarm',token:p.token});}catch{}}
    function g3InstallCaptured(data){
      const capture=g3Pending;
      if(!capture||capture.token!==data.token)return;
      g3CancelPending();
      if(disposed||g2Pending||g2Worker||data.planId!==capture.planId||data.sampleRate!==context.sampleRate||
         plans.get(capture.planKey)?.id!==capture.planId||g2Entries.has(capture.key)||
         !Number.isSafeInteger(data.frames)||data.frames<128||data.frames>context.sampleRate*1.5||
         !(data.left instanceof Float32Array)||!(data.right instanceof Float32Array)||
         data.frames>data.left.length||data.left.length!==data.right.length){
        g3RecordError('Capture invalid, stale or already cached');return;
      }
      const n=data.frames,rawL=data.left,rawR=data.right;
      // Trim on the host (never in AudioWorklet.process) and validate every sample.
      const left=rawL.slice(0,n),right=rawR.slice(0,n);
      let audible=false;
      for(let i=0;i<n;i++){
        if(!Number.isFinite(left[i])||!Number.isFinite(right[i])){g3RecordError('Nonfinite capture');return;}
        if(Math.abs(left[i])>0.000001||Math.abs(right[i])>0.000001)audible=true;
      }
      if(!audible){g3RecordError('Capture is silent');return;}
      const bytes=left.byteLength+right.byteLength;
      if(bytes>g2CacheMaxBytes||!g2MakeRoom(bytes)){g3RecordError('No PCM budget; DSP unaffected');return;}
      const id=++g2Sequence,generation=g2Generation;
      let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});
      const timer=setTimeout(()=>{if(g2Pending?.id===id){g2Pending=null;reject(new Error('G3 install ACK timeout'));}},2000);
      g2Pending={id,timer,resolve,reject};
      try{node.port.postMessage({type:'pcm-g2-install',pcmId:id,planId:capture.planId,left,right},[left.buffer,right.buffer]);}
      catch(error){clearTimeout(timer);g2Pending=null;reject(error);}
      promise.then(()=>{
        if(disposed||g2Generation!==generation||plans.get(capture.planKey)?.id!==capture.planId){
          node.port.postMessage({type:'pcm-g2-remove',pcmId:id});return;
        }
        g2Entries.set(capture.key,{id,key:capture.key,planId:capture.planId,frequency:capture.frequency,
          frames:n,bytes,uses:0,touched:Date.now(),origin:'live-dsp-capture'});
        g2CacheBytes+=bytes;g3Captured++;g3LastFrames=n;g3LastSampleRate=data.sampleRate;
      }).catch(e=>g3RecordError(e?.message||e));
    }
    function pocSpec(instrument,options={}){
      return JSON.stringify([options.frequency??instrument.referenceHz,options.velocity??.7,
        options.gain??.7,options.durationSec??instrument.articulation.durationSec,
        options.seed??instrument.seed,options.attackSec??null,options.releaseSec??null]);
    }
    function pocExactFixed(options){return options.held!==true&&!options.volumeCurve&&!options.pitchCurve&&
      options.attackSec==null&&options.releaseSec==null;}
    function g2Eligible(options){
      return pocExactFixed(options)&&options.pcmG2===true&&
        Number.isFinite(options.frequency)&&options.frequency>=5&&options.frequency<=12000&&
        Number.isFinite(options.velocity)&&options.velocity>=0&&options.velocity<=1&&
        Number.isFinite(options.gain)&&options.gain>=0&&options.gain<=1&&
        Number.isFinite(options.durationSec)&&options.durationSec>=.02&&options.durationSec<=1.5&&
        Number.isSafeInteger(options.seed)&&options.seed>=0&&options.seed<=2147483647&&
        ['auto','dsp','pcm',undefined].includes(options.pcmG2Mode);
    }
    function g2CacheKey(prepared,instrument,options){
      return JSON.stringify([prepared.plan.key,prepared.id,context.sampleRate,pocSpec(instrument,options)]);
    }
    function pcmG2Available(instrument,options){
      if(disposed||!g2Eligible(options))return false;
      const prepared=preparedReferences.get(instrument);
      if(!prepared?.ready||plans.get(prepared.plan.key)!==prepared)return false;
      return g2Entries.has(g2CacheKey(prepared,instrument,options));
    }
    function pcmG2Status(){
      return {enabled:!disposed,entries:g2Entries.size,bytes:g2CacheBytes,
        budgetBytes:g2CacheMaxBytes,maxEntries:g2MaxEntries,rendering:!!g2Worker,
        hits:g2Hits,misses:g2Misses,fallBackDsp:g2Fallbacks,bypasses:g2Bypasses,renders:g2Renders,
        failures:g2Failures,cancelled:g2Cancelled,evictions:g2Evictions,
        items:[...g2Entries.values()].map(e=>({id:e.id,frequency:e.frequency,frames:e.frames,bytes:e.bytes,active:e.uses}))};
    }
    function g2RemoveEntry(entry){
      if(entry.uses>0)return false; // Never evict a currently sounding reader.
      if(!g2Entries.delete(entry.key))return false;
      g2CacheBytes-=entry.bytes;g2Evictions++;
      node.port.postMessage({type:'pcm-g2-remove',pcmId:entry.id});
      return true;
    }
    function g2MakeRoom(bytes){
      while(g2Entries.size>=g2MaxEntries||g2CacheBytes+bytes>g2CacheMaxBytes){
        const victim=[...g2Entries.values()].filter(e=>e.uses===0).sort((a,b)=>a.touched-b.touched)[0];
        if(!victim)return false;
        g2RemoveEntry(victim);
      }
      return true;
    }
    function pcmG2Clear(){
      if(g3Pending)g3CancelPending();
      if(disposed||[...g2Entries.values()].some(e=>e.uses>0)||g2Worker||g2Pending)return false;
      if(g2Delay!==null){clearTimeout(g2Delay);g2Delay=null;}
      g2Entries.clear();g2CacheBytes=0;g2Generation++;
      node.port.postMessage({type:'pcm-g2-clear'});return true;
    }
    function startG2Render(candidate){
      if(disposed||context.state!=='running'||active.size>0||g2Worker||pocWorker||
         !candidate||plans.get(candidate.planKey)?.id!==candidate.planId||g2Entries.has(candidate.key))return;
      if(typeof Worker!=='function'||typeof Blob!=='function'||typeof URL?.createObjectURL!=='function')return;
      const generation=g2Generation;
      let worker,url;
      try{
        const code='('+nodalPreviewWorkerEntry.toString()+')('+kernelFactory.toString()+');';
        url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));
        worker=new Worker(url,{name:'xensonar-nodal-g2-pcm-cache'});
        g2Worker=worker;g2WorkerUrl=url;
        let done=false;
        const finish=(error,result)=>{
          if(done)return;done=true;clearTimeout(timer);
          if(g2Worker===worker)g2Worker=null;
          if(g2Cancel===cancelThis)g2Cancel=null;
          worker.terminate();URL.revokeObjectURL(url);if(g2WorkerUrl===url)g2WorkerUrl=null;
          if(error==='cancelled'){g2Cancelled++;return;}
          if(error){g2Failures++;g2Problems.push(String(error.message||error));if(g2Problems.length>10)g2Problems.shift();return;}
          if(disposed||generation!==g2Generation||context.state!=='running'||
             plans.get(candidate.planKey)?.id!==candidate.planId||g2Entries.has(candidate.key))return;
          const left=result.left??result.pcm,right=result.right??null;
          if(result.sampleRate!==context.sampleRate||!(left instanceof Float32Array)||
            left.length<1||left.length>context.sampleRate*6||
            (right!=null&&(!(right instanceof Float32Array)||right.length!==left.length))){
            g2Failures++;g2Problems.push('Invalid G2 PCM');return;
          }
          for(let i=0;i<left.length;i++)if(!Number.isFinite(left[i])||
            (right!=null&&!Number.isFinite(right[i]))){g2Failures++;g2Problems.push('Nonfinite G2 PCM');return;}
          const frames=left.length,bytes=left.byteLength+(right?.byteLength??0);
          if(bytes>g2CacheMaxBytes||!g2MakeRoom(bytes)){
            g2Failures++;g2Problems.push('PCM budget in use; keeping Live DSP');return;
          }
          const id=++g2Sequence;
          let resolve,reject;
          const promise=new Promise((r,j)=>{resolve=r;reject=j});
          const ackTimer=setTimeout(()=>{
            if(g2Pending?.id===id){g2Pending=null;reject(new Error('G2 Worklet ACK timeout'));}
          },2000);
          g2Pending={id,resolve,reject,timer:ackTimer};
          try{node.port.postMessage({type:'pcm-g2-install',pcmId:id,planId:candidate.planId,left,right},
            right?[left.buffer,right.buffer]:[left.buffer]);}
          catch(e){clearTimeout(ackTimer);g2Pending=null;reject(e);}
          promise.then(()=>{
            if(disposed||generation!==g2Generation||plans.get(candidate.planKey)?.id!==candidate.planId){
              node.port.postMessage({type:'pcm-g2-remove',pcmId:id});return;
            }
            const entry={id,key:candidate.key,planId:candidate.planId,
              frequency:candidate.frequency,frames,bytes,uses:0,touched:Date.now()};
            g2Entries.set(candidate.key,entry);g2CacheBytes+=bytes;g2Renders++;
          }).catch(e=>{g2Failures++;g2Problems.push(String(e.message||e));});
        };
        const timer=setTimeout(()=>finish(new Error('G2 worker timeout')),14000);
        const cancelThis=()=>finish('cancelled');g2Cancel=cancelThis;
        worker.onerror=e=>{e.preventDefault?.();finish(new Error('G2 worker failed'));};
        worker.onmessage=({data})=>data?.type==='rendered'?finish(null,data):finish(new Error(data?.message||'G2 render failed'));
        worker.postMessage({plan:candidate.plan,options:candidate.options,sampleRate:context.sampleRate});
      }catch(e){
        if(worker){worker.terminate();if(g2Worker===worker)g2Worker=null;g2Cancel=null;}
        if(url){URL.revokeObjectURL(url);if(g2WorkerUrl===url)g2WorkerUrl=null;}
        g2Failures++;g2Problems.push(String(e.message||e));
      }
    }
    function scheduleG2(candidate){
      if(disposed||!candidate||g2Worker||g2Pending||g2Entries.has(candidate.key)||g2Delay!==null)return;
      // G2: prepare a note AFTER its live voice ends. Never synthesize twice
      // while the note sounds. Global idle-prewarm remains a separate G4 gate.
      g2Delay=setTimeout(()=>{g2Delay=null;startG2Render(candidate);},100);
    }

    let diagnosticSequence=0,diagnosticPending=null;
    const counters={submitted:0,accepted:0,ended:0,rejected:0},rejectReasons=Object.create(null);
    // NODAL-ROUTE-WITNESS02: diagnostic only, on main thread. Retain weak
    // identity of actual WebAudio destinations; no Worklet/PCM/clock changes.
    const routeWitness={requests:0,noops:0,changes:0,disconnects:0,connects:0,
      disconnectErrors:0,mainChanges:0,auxOnlyChanges:0,byLane:{}};
    const routeWitnessIds=new WeakMap();let routeWitnessNextId=0;
    function routeWitnessId(target){if(!target)return null;let id=routeWitnessIds.get(target);
      if(!id){id=++routeWitnessNextId;routeWitnessIds.set(target,id);}return id;}

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
    function release(id) { const record = active.get(id); if (!record) return;
      if(record.holdPcmEntry){record.holdPcmEntry.uses=Math.max(0,record.holdPcmEntry.uses-1);record.holdPcmEntry=null;}
      for(const [key,v]of holdHandles)if(v.id===id)holdHandles.delete(key); active.delete(id); activeCost = active.size ? Math.max(0,activeCost-record.cost) : 0;if(!disposed&&active.size===0&&holdPcmHints.length)setTimeout(holdPcmNext,0); record.ticket.release();admission.onEnded?.(id); }
    function failAll() {
      for (const id of Array.from(active.keys())) release(id);
      for (const id of Array.from(pendingStarts.keys())) confirmStart(id, new Error('Nodal processor unavailable'));
      for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(new Error('Nodal processor unavailable')); } pending.clear();
    }
    node.onprocessorerror = () => { dispose(); admission.onError?.(new Error('Nodal audio processor failed. Please restart playback.')); };
    node.port.onmessage = ({data}) => {
      if(data.type==='pcm-hold-ready'||data.type==='pcm-hold-error'){
        const p=holdPcmBusy;
        if(p?.installId===data.pcmId){clearTimeout(p.timer);holdPcmBusy=null;
          if(data.type==='pcm-hold-ready'&&!disposed&&plans.get(p.job.planKey)?.id===p.job.planId){
            holdPcmEntries.set(p.job.key,{id:data.pcmId,...p.job,bytes:p.bytes,uses:0,touched:Date.now()});
            holdPcmBytes+=p.bytes;holdPcmStats.prepared++;
          }else{holdPcmStats.errors++;if(data.type==='pcm-hold-ready')node.port.postMessage({type:'pcm-hold-remove',pcmId:data.pcmId});}
          setTimeout(holdPcmNext,0);
        }return;
      }
      if(data.type==='pcm-g3-captured'){g3InstallCaptured(data);return;}
      if(data.type==='pcm-g3-failed'){
        if(g3Pending?.token===data.token){g3CancelPending();g3RecordError(data.reason||'Worklet capture rejected');}return;
      }
      if(data.type==='pcm-g2-ready'||data.type==='pcm-g2-error'){
        if(g2Pending?.id===data.pcmId){const p=g2Pending;g2Pending=null;clearTimeout(p.timer);
          if(data.type==='pcm-g2-ready')p.resolve();else p.reject(new Error(data.message||'G2 rejected'));}
        return;
      }
      if(data.type==='pcm-poc-ready'||data.type==='pcm-poc-error'){
        if(pocPending?.id===data.pcmId){
          const p=pocPending;pocPending=null;clearTimeout(p.timer);
          if(data.type==='pcm-poc-ready')p.resolve();
          else p.reject(new Error(data.message??'PCM template rejected'));
        }return;
      }
      if(data.type==='diagnostic'){if(diagnosticPending&&data.requestId===diagnosticSequence){const entry=diagnosticPending;diagnosticPending=null;clearTimeout(entry.timer);entry.resolve({status:'received',id:diagnosticId,host:snapshot(),consumer:data.snapshot});}return;}
      if (data.type === 'stage-needed') {requestStage(data.id);} else if (data.type === 'ready') { const entry = pending.get(data.id); if (entry) { clearTimeout(entry.timer); pending.delete(data.id); entry.resolve(); } }
      // 'started' is the existing receipt acknowledgement, which can precede
      // a scheduled note. Trace it as accepted, never as measured audio output.
      else if (data.type === 'started') { counters.accepted++;const record=active.get(data.id);
        if(record&&globalThis.__XenNodalPcmCostLab?.stats){const stats=globalThis.__XenNodalPcmCostLab.stats;
          if(record.pcmCostMode==='pcm-aware'){stats.pcmAwareAdmitted++;stats.pcmUnitsSaved+=record.pcmAdmissionSavings;}
          else if(record.g2Chosen)stats.pcmLegacyAdmitted++;else stats.dspAdmitted++;}
        if(record?.g2Hit)g2Hits++;if(record?.g2Missed){g2Misses++;g2Fallbacks++;}if(record?.g2Bypassed)g2Bypasses++;
        if(record?.traceId&&typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('worklet',record.lane,'accepted',record.startSec,record.traceId,{voiceId:data.id,programId:record.planId});confirmStart(data.id); }
      else if(data.type==='cost'){const record=active.get(data.id);if(record&&Number.isFinite(data.cost)&&data.cost>0&&data.cost<=record.cost){record.ticket.reduce(data.cost);activeCost+=data.cost-record.cost;record.cost=data.cost;}}
      else if(data.type==='ended'){counters.ended++;const record=active.get(data.id);if(record?.traceId&&typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('worklet',record.lane,'ended',void 0,record.traceId,{voiceId:data.id,programId:record.planId});confirmStart(data.id);
        const completed=record?.g2Candidate??null;
        if(record?.g2Entry)record.g2Entry.uses=Math.max(0,record.g2Entry.uses-1);
        release(data.id);
        if(completed&&!record.cutRequested)scheduleG2(completed);
      }
      else if (data.type === 'rejected' || data.type === 'error') {
        if(data.type==='rejected'){counters.rejected++;const reason='worklet:'+(data.reason??'unknown');rejectReasons[reason]=(rejectReasons[reason]??0)+1;}
        const record=active.get(data.id);
        if(record&&globalThis.__XenNodalPcmCostLab?.stats)globalThis.__XenNodalPcmCostLab.stats.workletRejected++;
        if(record?.traceId&&typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('worklet',record.lane,data.type+':'+(data.reason??data.message??'unknown'),record.startSec,record.traceId,{voiceId:data.id,programId:record.planId});
        const error = new Error('Nodal: ' + (data.message ?? data.reason ?? 'Worklet rejected note'));
        error.reason = data.reason; confirmStart(data.id, error);
        if(record?.g2Entry)record.g2Entry.uses=Math.max(0,record.g2Entry.uses-1);
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
    async function preparePcmPoc(instrument,options={}){
      if(!pocEnabled||disposed)throw new Error('Nodal PCM PoC is disabled');
      if(pocPending||pocWorker)throw new Error('Nodal PCM PoC already preparing');
      const record=instrument&&preparedReferences.get(instrument);
      if(!record?.ready||plans.get(record.plan.key)!==record)throw new Error('Nodal program not prepared');
      if(!pocExactFixed(options))throw new Error('G1 only supports fixed duration without live modulation');
      const frequency=options.frequency??instrument.referenceHz,velocity=options.velocity??.7,
        gain=options.gain??.7,durationSec=options.durationSec??instrument.articulation.durationSec,
        seed=options.seed??instrument.seed;
      if(!Number.isFinite(frequency)||frequency<5||frequency>12000||
         !Number.isFinite(velocity)||velocity<0||velocity>1||
         !Number.isFinite(gain)||gain<0||gain>1||
         !Number.isFinite(durationSec)||durationSec<.02||durationSec>1.5)
        throw new Error('G1 PCM note outside bounded render contract');
      if(typeof Worker!=='function'||typeof Blob!=='function'||typeof URL?.createObjectURL!=='function')
        throw new Error('G1 requires an offline worker (no main-thread rendering)');
      const plan=record.plan,id=++pocSequence,spec=pocSpec(instrument,options),planId=record.id;
      const code='('+nodalPreviewWorkerEntry.toString()+')('+kernelFactory.toString()+');';
      let worker,url;
      try {
        url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));
        worker=new Worker(url,{name:'xensonar-nodal-pcm-poc'});pocWorker=worker;
        const result=await new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>reject(new Error('Nodal PCM PoC render timed out')),15000);
          worker.onmessage=({data})=>{clearTimeout(timer);data.type==='rendered'?resolve(data):reject(new Error(data.message||'PCM render failed'));};
          worker.onerror=event=>{event.preventDefault?.();clearTimeout(timer);reject(new Error('PCM worker failed'));};
          worker.postMessage({plan,options:{frequency,velocity,gain,durationSec,seed},sampleRate:context.sampleRate});
        });
        if(disposed||plans.get(record.plan.key)!==record||pocSequence!==id)throw new Error('PCM PoC state changed during render');
        const left=result.left??result.pcm,right=result.right??null;
        if(result.sampleRate!==context.sampleRate||!(left instanceof Float32Array)||
           left.length<1||left.length>context.sampleRate*6||
           (right!=null&&(!(right instanceof Float32Array)||right.length!==left.length)))
          throw new Error('Invalid PCM render result');
        for(let i=0;i<left.length;i++)if(!Number.isFinite(left[i])||
           (right!=null&&!Number.isFinite(right[i])))throw new Error('Non-finite PCM output');
        // G1 install is explicit. No PCM note may start before Worklet ACK.
        const frames=left.length;
        await new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>{pocPending=null;reject(new Error('PCM install ACK timeout'));},2000);
          pocPending={id,timer,resolve,reject};
          try{node.port.postMessage({type:'pcm-poc-install',pcmId:id,planId,left,right},right?[left.buffer,right.buffer]:[left.buffer]);}
          catch(error){clearTimeout(timer);pocPending=null;reject(error);}
        });
        if(disposed||plans.get(record.plan.key)!==record||pocSequence!==id)throw new Error('PCM PoC changed after ACK');
        pcmPoc={id,planId,spec,frames,rate:context.sampleRate};
        return {...pcmPoc};
      } finally {
        if(worker)worker.terminate();if(url)URL.revokeObjectURL(url);
        if(pocWorker===worker)pocWorker=null;
      }
    }
    const holdHandles=new Map();
    // Remember terminated gestures independently of live voice allocation. Bounded
    // by keyboard/lane identities; a Mute CUT never marks a gesture as released.
    const terminalHoldEpochs=new Map(), terminalHoldEpochLimit=128;
    function endHoldGesture(lane,keyId,epoch){
      if(disposed||typeof keyId!=='string'||!keyId||!Number.isFinite(epoch)||!lane)return false;
      const key=String(lane)+':'+keyId;
      const current=holdHandles.get(key);
      if(current&&current.epoch>epoch)return false; // a stale key-up cannot end a new gesture
      const previous=terminalHoldEpochs.get(key);
      if(previous!==undefined&&epoch<=previous)return true;
      terminalHoldEpochs.delete(key);terminalHoldEpochs.set(key,epoch);
      if(terminalHoldEpochs.size>terminalHoldEpochLimit)terminalHoldEpochs.delete(terminalHoldEpochs.keys().next().value);
      return true;
    }
    function sameClockControl(c,clock,options,frequency,velocity,gain,duration,seed,pcmId){
      if(!c||c.interval!==clock.intervalMs||c.frequency!==frequency||c.velocity!==velocity||c.gain!==gain||
        c.duration!==duration||c.seed!==seed||c.pcmId!==pcmId||c.volumeCurve!==options.volumeCurve||
        c.pitchCurve!==options.pitchCurve||c.attackSec!==options.attackSec||c.releaseSec!==options.releaseSec||
        !Array.isArray(clock.pattern)||c.pattern.length!==clock.pattern.length||
        (!!c.pitchRatios)!==(!!clock.pitchRatios)||
        (clock.pitchRatios&&(c.pitchRatios.length!==clock.pitchRatios.length||c.pitchRatios.some((r,i)=>r!==clock.pitchRatios[i]))))return false;
      for(let i=0;i<c.pattern.length;i++)if(c.pattern[i]!==clock.pattern[i])return false;
      return true;
    }
    function rememberClockControl(clock,options,frequency,velocity,gain,duration,seed,pcmId){
      return {interval:clock.intervalMs,pattern:clock.pattern.slice(),pitchRatios:clock.pitchRatios?.slice()??null,frequency,velocity,gain,duration,seed,pcmId,
        volumeCurve:options.volumeCurve,pitchCurve:options.pitchCurve,attackSec:options.attackSec,releaseSec:options.releaseSec};
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
      // G5: a repeated Hold pulse owns the SAME admitted physical voice/ticket.
      // Dynamic Hold is deliberately DSP; it is not the fixed-note PCM cache.
      const holdKey=typeof options.nodalHoldKeyId==='string'&&options.nodalHoldKeyId
        ?String(options.routeLane??options.admissionLane)+':'+options.nodalHoldKeyId:null;
      const holdEpoch=Number.isFinite(options.nodalHoldGestureEpochMs)?options.nodalHoldGestureEpochMs:0;
      const holdCandidate=holdKey?holdPcmCandidate(prepared,instrument,options,frequency,velocity,gain):null;
      prioritizeHoldAttack(holdCandidate);
      const holdTemplate=holdCandidate?holdPcmEntries.get(holdCandidate.key):null;
      if(holdCandidate&&!holdTemplate)holdPcmRequest(holdCandidate);
      const oldHold=holdKey?holdHandles.get(holdKey):null;
      if(holdKey&&(terminalHoldEpochs.get(holdKey)??-Infinity)>=holdEpoch)return null;
      if(oldHold&&oldHold.epoch===holdEpoch&&oldHold.planId===prepared.id&&active.has(oldHold.id)){
        const record=active.get(oldHold.id);
        if(record.holdPcmEntry&&!holdTemplate&&record.holdPcmEntry.frequency!==frequency){
          // Never reuse the wrong PCM pitch. Retire first, then pass through
          // normal DSP admission; this is an intentionally bounded cold miss.
          oldHold.handle.cut();
        }
        if(!record.cutRequested&&!record.releasing){
          if(options.nodalHoldClock&&sameClockControl(record.lastClockControl,options.nodalHoldClock,options,
            frequency,velocity,gain,duration,options.seed??instrument.seed,holdTemplate?.id??null)){
            holdPcmStats.clockUpdatesSuppressed++;return oldHold.handle;
          }
          try{
            if(holdTemplate&&record.holdPcmEntry!==holdTemplate){
              if(record.holdPcmEntry)record.holdPcmEntry.uses=Math.max(0,record.holdPcmEntry.uses-1);
              record.holdPcmEntry=holdTemplate;holdTemplate.uses++;holdTemplate.touched=Date.now();holdPcmStats.hits++;
            }
            node.port.postMessage({type:options.nodalHoldClock?'hold-clock-update':'hold-retrigger',holdClock:options.nodalHoldClock,id:oldHold.id,startSec,holdEpoch,
            pcmHoldId:holdTemplate?.id??null,
            options:{frequency,velocity,gain,durationSec:duration,held:true,seed:options.seed??instrument.seed,
              nodalHoldIntervalMs: options.nodalHoldIntervalMs,volumeCurve:options.volumeCurve,pitchCurve:options.pitchCurve,attackSec:options.attackSec,releaseSec:options.releaseSec}});
            if(options.nodalHoldClock){
              record.lastClockControl=rememberClockControl(options.nodalHoldClock,options,frequency,velocity,gain,duration,options.seed??instrument.seed,holdTemplate?.id??null);
              holdPcmStats.clockUpdatesSent++;
            }
            return oldHold.handle;
          }catch{return null;}
        }
      }
      if(oldHold&&holdEpoch<oldHold.epoch)return null; // late pulse from released gesture
      // Real note-ons outrank a speculative cache render; cancel before admission.
      if(g2Worker&&g2Cancel)g2Cancel();
      // G2 is opt-in for certified fixed-event voices; normal/held voices remain Live.
      const g2Requested=options.pcmG2===true&&g2Eligible(options);
      // Unsupported dynamic notes never become PCM, even when marked G2.
      const g2Key=g2Requested?g2CacheKey(prepared,instrument,options):null;
      const g2Entry=g2Key?g2Entries.get(g2Key):null;
      const g2Mode=options.pcmG2Mode??'auto';
      if(g2Requested&&g2Mode==='pcm'&&!g2Entry)return null;
      const useG2=!!g2Entry&&g2Mode!=='dsp';
      // CostGate-01: only a verified resident G2 hit can use the cheaper admission.
      // One admission unit is an EXPERIMENTAL cap (not a measured CPU percentage).
      const pcmCostMode=useG2&&globalThis.__XenNodalPcmCostLab?.mode==='pcm-aware'?'pcm-aware':'legacy';
      const admissionCost=holdTemplate?Math.min(prepared.plan.cost,1):
        pcmCostMode==='pcm-aware'?Math.min(prepared.plan.cost,1):prepared.plan.cost;
      const wantsG3=options.pcmG3Capture===true&&g2Requested&&!useG2&&g2Mode==='auto';
      const g3Requested=wantsG3&&!g3Pending&&!g2Worker&&!g2Pending;
      const usePcm=options.pcmPoc===true;
      if(usePcm&&(!pocEnabled||!pocExactFixed(options)||!pcmPoc||
         pcmPoc.planId!==prepared.id||pcmPoc.spec!==pocSpec(instrument,options)))return null;
      const limit=maxCost;
      if (policy.preserveTails!==true && (active.size >= maxVoices || admissionCost + activeCost > limit)) {
        // Release only spent natural tails. Fresh/held attacks retain ownership.
        for(const [id,record] of active){
          if(!record.natural || (!record.releasing && record.gateEnd > context.currentTime - .008))continue;
          node.port.postMessage({type:'retire',id});release(id);
          if(active.size<maxVoices && admissionCost+activeCost<=limit)break;
        }
      }
      const ticket = admissionGate.tryAcquire(active.size,activeCost,admissionCost,options.admissionLane);
      if (!ticket) {const reason=admissionGate.reason==='global-ticket'&&capacityRejected?'context-dsp-budget':admissionGate.reason;
        if(globalThis.__XenNodalPcmCostLab?.stats){const stats=globalThis.__XenNodalPcmCostLab.stats;
          if(pcmCostMode==='pcm-aware')stats.pcmAwareRejected++;else if(useG2)stats.pcmLegacyRejected++;else stats.dspRejected++;}
        if(admissionGate.reason==='dsp-budget')try{node.port.postMessage({type:'reclaim-pressure',cost:admissionCost});}catch{}
        counters.rejected++;rejectReasons[reason]=(rejectReasons[reason]??0)+1; if(typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('nodal-player',options.admissionLane??'nodal',reason,startSec,traceId);return null; }
      const id = 'voice-' + (++sequence); active.set(id, {ticket, lane:options.admissionLane??'nodal', traceId:traceId??null,startSec,planId: prepared.id, cost: admissionCost, natural:prepared.plan.kernelVersion==='coupled-modal-v2'&&prepared.plan.tailSec>0, gateEnd:options.held===true?Infinity:startSec+(options.durationSec??instrument.articulation.durationSec), releasing:false}); activeCost += admissionCost;
      // Count final Worklet-confirmed admissions, not merely submitted host tickets.
      // A lease is tied to the same existing voice ticket, never a parallel owner.
      const activeRecord=active.get(id);
      activeRecord.pcmCostMode=pcmCostMode;activeRecord.pcmAdmissionSavings=prepared.plan.cost-admissionCost;
      if(holdTemplate){activeRecord.holdPcmEntry=holdTemplate;holdTemplate.uses++;holdTemplate.touched=Date.now();holdPcmStats.hits++;}
      activeRecord.g2Chosen=useG2;
      if(g2Requested){
        if(useG2){g2Entry.uses++;g2Entry.touched=Date.now();activeRecord.g2Entry=g2Entry;activeRecord.g2Hit=true;}
        else if(g2Mode==='dsp')activeRecord.g2Bypassed=true;
        else{
          activeRecord.g2Missed=true;
          if(g2Mode==='auto'&&!wantsG3)activeRecord.g2Candidate={key:g2Key,planKey:prepared.plan.key,planId:prepared.id,
            plan:prepared.plan,frequency,options:{frequency,velocity,gain,durationSec:duration,seed:options.seed}};
        }
      }
      let g3Token=null;
      if(g3Requested){
        // Allocate bounded buffers on the main thread and transfer before note-on.
        // Worklet does not allocate these in the render callback.
        const frames=Math.floor(Math.min(1.5,2097152/(2*4*context.sampleRate))*context.sampleRate);
        if(frames>=128){
          const token=++g3Serial;
          const timer=setTimeout(()=>{
            if(g3Pending?.token===token){g3CancelPending();g3RecordError('Capture timeout');}
          },6000);
          g3Pending={token,timer,planId:prepared.id,planKey:prepared.plan.key,key:g2Key,frequency};
          try{
            const left=new Float32Array(frames),right=new Float32Array(frames);
            node.port.postMessage({type:'pcm-g3-arm',token,planId:prepared.id,left,right},[left.buffer,right.buffer]);
            g3Token=token;
          }catch(e){g3CancelPending();g3RecordError(e?.message||e);}
        }
      }
      let started = null;
      if (options.confirmStart === true) {
        started = new Promise((resolve, reject) => {
          const timer = setTimeout(() => { confirmStart(id, new Error('Nodal: audio worklet did not confirm note start')); dispose(); }, 1200);
          pendingStarts.set(id, {timer, resolve, reject});
        });
        // Other callers may release the note before awaiting acknowledgement.
        started.catch(() => {});
      }
      try { node.port.postMessage({type: 'note', id, planId: prepared.id, startSec,pcmPocId:usePcm?pcmPoc.id:null,pcmG2Id:useG2?g2Entry.id:null,pcmHoldId:holdTemplate?.id??null,pcmAdmissionPolicy:pcmCostMode,pcmG2Candidate:g2Requested&&!useG2,pcmG3CaptureToken:g3Token,lane:options.admissionLane,routeLane:options.routeLane,mixLane:options.mixLane,agentIndex:options.agentIndex, holdEpoch:holdKey?holdEpoch:null,holdClock:options.nodalHoldClock,options: {frequency, velocity, gain,
        durationSec:duration, held: options.held === true, seed: options.seed ?? instrument.seed,
        nodalHoldIntervalMs: options.nodalHoldIntervalMs,
        volumeCurve: options.volumeCurve, pitchCurve: options.pitchCurve, attackSec: options.attackSec, releaseSec: options.releaseSec,
        nodalTimbreEnabled:options.nodalTimbreEnabled===true&&!!holdKey,
        nodalTimbreX:Number.isFinite(options.nodalTimbreX)?Math.max(0,Math.min(1,options.nodalTimbreX)):.5}}); }
      catch (error) { if(typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('nodal-player',options.admissionLane??'nodal','submit-error',startSec,traceId,{voiceId:id,programId:prepared.id});confirmStart(id, error);if(g3Token)g3CancelPending();if(activeRecord.g2Entry)activeRecord.g2Entry.uses=Math.max(0,activeRecord.g2Entry.uses-1);
        release(id); throw error; }
      if(options.nodalHoldClock)activeRecord.lastClockControl=rememberClockControl(options.nodalHoldClock,options,
        frequency,velocity,gain,duration,options.seed??instrument.seed,holdTemplate?.id??null);
      counters.submitted++;
      if(typeof __XenAudioProbe!=='undefined'&&__XenAudioProbe.enabled)__XenAudioProbe.record('nodal-player',options.admissionLane??'nodal','submitted',startSec,traceId,{voiceId:id,programId:prepared.id});
      const holdVoice=Object.freeze({id,isHoldClock:!!options.nodalHoldClock, backend:usePcm||useG2||holdTemplate?'pcm':'dsp', runtimeBackend:()=>{const r=active.get(id);return r?(r.holdPcmEntry?'hold-pcm':r.g2Entry?'g2-pcm':usePcm?'poc-pcm':'live-dsp'):null;}, started, noteOff: () => { const record=active.get(id);if(record&&!record.cutRequested){if(record.holdPcmEntry||(!usePcm&&!useG2)){record.releasing=true;node.port.postMessage({type: 'release', id});}if(holdKey&&holdHandles.get(holdKey)?.id===id){endHoldGesture(options.routeLane??options.admissionLane,options.nodalHoldKeyId,holdEpoch);holdHandles.delete(holdKey);}} },
        cut:()=>{const record=active.get(id);if(!record||record.cutRequested)return false;record.cutRequested=true;if(holdKey&&holdHandles.get(holdKey)?.id===id)holdHandles.delete(holdKey);node.port.postMessage({type:'cut',id});return true;},
        setFrequency: hz => { if (usePcm||useG2||!!active.get(id)?.holdPcmEntry||!active.has(id) || !Number.isFinite(hz) || hz < 5 || hz > 12000) return false; node.port.postMessage({type: 'frequency', id, frequency: hz}); return true; },
        setTimbreX:x=>{if(!holdKey||!active.has(id)||!Number.isFinite(x)||options.nodalTimbreEnabled!==true)return false;
          node.port.postMessage({type:'nodal-hold-x',id,holdEpoch,x:Math.max(0,Math.min(1,x))});return true;}});
      if(holdKey)holdHandles.set(holdKey,{id,epoch:holdEpoch,planId:prepared.id,handle:holdVoice});
      return holdVoice;
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
      if(disposed||!laneRoutes||!main)return false;main=typeof __XenLoopRec!=='undefined'?__XenLoopRec.route(context,lane,main):main;const index=lane==='particle'?1:lane==='keyboard'&&laneRoutes.length>2?2:0,owned=laneRoutes[index];
      // NODAL-ROUTE-WITNESS02: record requests separately from real graph edits.
      const audit=typeof routeWitness!=='undefined'?routeWitness:null;
      if(audit)audit.requests++;
      let same=owned.has(main);for(const target of aux)if(target&&!owned.has(target))same=false;for(const target of owned)if(target!==main&&!aux.includes(target))same=false;
      if(same){if(audit)audit.noops++;return true;}
      const next=new Set([main,...aux].filter(Boolean));
      const before=audit?[...owned].map(routeWitnessId):[],after=audit?[...next].map(routeWitnessId):[];
      const physicalMainChanged=owned.size>0&&!owned.has(main);
      if(audit){audit.changes++;if(physicalMainChanged)audit.mainChanges++;
        else if(owned.size>0)audit.auxOnlyChanges++;}
      const laneStats=audit?(audit.byLane[lane]??(audit.byLane[lane]={changes:0,connects:0,disconnects:0})):null;
      if(laneStats)laneStats.changes++;
      // Original connection algorithm retained byte-for-byte in its DSP effects.
      for(const target of owned)try{node.disconnect(target,index,0);if(audit){audit.disconnects++;laneStats.disconnects++;}}catch{if(audit)audit.disconnectErrors++;}
      owned.clear();for(const target of next){node.connect(target,index,0);owned.add(target);if(audit){audit.connects++;laneStats.connects++;}}
      if(audit&&typeof __XenSoundTrace!=='undefined')__XenSoundTrace.mark('nodal-physical-route-rewire',lane,
        {index,before,after,physicalMainChanged,removed:before.length,added:after.length,
          audioTimeSec:context.currentTime,changes:audit.changes},context);
      return true;
    }
    // Reuse the existing admitted-voice ledger; no second per-note registry.
    // Physical tickets remain held until the consumer confirms each cut.
    function stopLane(lane){
      if(disposed||!['particle','wave'].includes(lane))return 0;
      let count=0;for(const [id,record]of active){if(record.lane!==lane||record.cutRequested)continue;
        record.cutRequested=true;node.port.postMessage({type:'cut',id});count++;}
      return count;
    }
    function stop() { if (!disposed) node.port.postMessage({type: 'stop'}); }
    function dispose() { if (disposed) return;g3CancelPending(); disposed = true;
      holdPcmQueue.length=0;holdPcmWaiting.clear();holdPcmHints.length=0;holdPcmHintWaiting.clear();holdPcmHintPlanId=null;
      if(holdPcmBusy?.timer)clearTimeout(holdPcmBusy.timer);
      if(holdPcmBusy?.renderTimer)clearTimeout(holdPcmBusy.renderTimer);
      if(holdPcmBusy?.job)holdPcmBusy.job.abandoned=true;
      holdPcmBusy=null;
      if(holdPcmWorker)holdPcmWorker.terminate();if(holdPcmWorkerUrl)URL.revokeObjectURL(holdPcmWorkerUrl);
      holdPcmWorker=null;holdPcmWorkerUrl=null;holdPcmEntries.clear();holdPcmBytes=0;
      g2Generation++;if(g2Delay!==null)clearTimeout(g2Delay);g2Delay=null;
      if(g2Cancel)g2Cancel();g2Cancel=null;
      if(g2Worker)g2Worker.terminate();if(g2WorkerUrl)URL.revokeObjectURL(g2WorkerUrl);
      g2Worker=null;g2WorkerUrl=null;
      if(g2Pending){const p=g2Pending;g2Pending=null;clearTimeout(p.timer);p.reject(new Error('G2 disposed'));}
      g2Entries.clear();g2CacheBytes=0;
      pcmPoc=null;pocSequence++;if(pocWorker)pocWorker.terminate();pocWorker=null;if(pocPending){const p=pocPending;pocPending=null;clearTimeout(p.timer);p.reject(new Error('PCM PoC disposed'));}readers.delete(requestDiagnostics);unregisterDiagnostic?.();if(diagnosticPending){clearTimeout(diagnosticPending.timer);diagnosticPending.resolve({status:'disposed'});diagnosticPending=null;}for(const record of plans.values()){record.gridPreparation?.dispose();if(record.frequencyState?.timer!=null)clearTimeout(record.frequencyState.timer);} background?.dispose();preparing.clear(); if(stageTimer!==null)clearTimeout(stageTimer);stageTimer=null;stageQueue.length=0;staged.clear();pins.clear();failAll();capacityOwner?.dispose(); node.port.postMessage({type: 'dispose'}); node.disconnect(); node.port.close(); context.removeEventListener('statechange', onState); }
    function onState() { if (context.state === 'closed') dispose(); }
    context.addEventListener('statechange', onState);
    async function warmFrequencies(instrument,frequencies){
      if(!prepareGridFrequencies(instrument,frequencies))throw new Error('Invalid Nodal pitch preparation request');
      const record=preparedReferences.get(instrument);await record.gridPreparation.whenReady();
      if(disposed||plans.get(record.plan.key)!==record)throw new Error('Nodal pitch preparation cancelled');
    }
    function snapshot(){return {outputLanes:laneRoutes?.length??1,preparedWorkloads:[...plans.values()].map(record=>({planId:record.id,...nodalPreparedWorkload(record.plan,context.sampleRate)})),readyPlans: plans.size, activeVoices: active.size, activeCost, maxCost,maxVoices,disposed,controlPrepared:!!control,separateLanes:!!laneRoutes,
      ...counters,rejectReasons:{...rejectReasons},routeWitness:{...routeWitness,
        byLane:Object.fromEntries(Object.entries(routeWitness.byLane).map(([lane,v])=>[lane,{...v}]))},sharedCapacity:capacity?.snapshot()??null,
      gridPreparation:[...plans.values()].filter(record=>record.gridPreparation).map(record=>({planId:record.id,...record.gridPreparation.snapshot()}))};}
    return Object.freeze({holdPcmStatus:()=>({...holdPcmStats,entries:holdPcmEntries.size,bytes:holdPcmBytes,
      queued:holdPcmQueue.length,hintQueued:holdPcmHints.length,busy:!!holdPcmBusy}),warmHoldPitches,preparePcmPoc,pcmPocStatus:()=>({enabled:pocEnabled,ready:!!pcmPoc,...(pcmPoc??{})}),
      pcmG2Status,pcmG2Available,pcmG2Clear,pcmG2Problems:()=>g2Problems.slice(),
      pcmG3Status,pcmG3Problems:()=>g3Problems.slice(),placement:state=>{if(!disposed)node.port.postMessage({type:"placement",state})},prepare,prepareFrequencies,prepareGridFrequencies,warmFrequencies,route,noteOn,endHoldGesture,pin,unpin,stopLane,stop,dispose,requestDiagnostics,
      hasPreparedFrequencies:(instrument,frequencies)=>{const record=instrument&&preparedReferences.get(instrument);return !disposed&&record?.ready&&plans.get(record.plan.key)===record&&Array.isArray(frequencies)&&frequencies.every(hz=>record.gridPreparation?.has?.(hz)||record.dynamicInstalled.has(hz));},
      preparedProgramId:instrument=>{const record=preparedReferences.get(instrument);return !disposed&&record?.ready&&plans.get(record.plan.key)===record?record.id:null},
      isPrepared:instrument=>{const record=preparedReferences.get(instrument);return !disposed&&!!record?.ready&&plans.get(record.plan.key)===record},snapshot});
  }
  return Object.freeze({createPlayer,diagnostics:()=>Promise.all([...readers].map(read=>read()))});
}
const __XenNodalLive = createNodalLiveRuntime({model: __XenNodalModel, kernelFactory: createNodalSynthesisKernel});
