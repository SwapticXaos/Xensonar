import { P0_PROTOCOL } from '../web/p0-client.js';
const integer=(v,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
class XensonarP0Processor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const o=options.processorOptions;
    if(!(o?.wasmModule instanceof WebAssembly.Module))throw new Error('P0 requires a module compiled before node construction');
    if(typeof o.sessionId!=='string'||typeof o.engineEpoch!=='string'||!integer(o.ownerEpoch,1,0xffffffff))throw new Error('P0 missing scope');
    this.scope={sessionId:o.sessionId,engineEpoch:o.engineEpoch,ownerEpoch:o.ownerEpoch};
    this.e=new WebAssembly.Instance(o.wasmModule,{}).exports;
    this.e.p0_init(sampleRate);
    const table=new Float32Array(this.e.memory.buffer,this.e.p0_sine_table_ptr(),4096);
    for(let i=0;i<table.length;i++)table[i]=Math.sin(2*Math.PI*i/table.length);
    this.e.p0_set_frame(BigInt(currentFrame));
    this.samples=new Float32Array(this.e.memory.buffer,this.e.p0_output_ptr(),this.e.p0_max_block()*2);
    this.reportEvery=Math.ceil(sampleRate/10);this.nextReportFrame=currentFrame+this.reportEvery;
    this.windowStart=currentFrame;this.windowPeak=0;this.faulted=false;
    this.packetHigh={normal:0,state:0,safety:0};this.safetyRevision=0;
    this.safetyState=null;this.epochClosed=false;this.programClosed=false;
    this.port.onmessage=ev=>this.onMessage(ev.data);
    this.post({kind:'ready',frame:currentFrame,sampleRate});
  }
  post(m){this.port.postMessage({...m,...this.scope});}
  fault(message){this.epochClosed=true;if(!this.faulted){this.faulted=true;this.post({kind:'fault',message,frame:Number(this.e.p0_frame())});}}
  applySafety(s){
    const e=this.e,owner=this.scope.ownerEpoch;
    if(s.ownerEpochClosed){
      this.epochClosed=true;
      return e.p0_owner_epoch()===owner?e.p0_panic(owner,Math.ceil(sampleRate*.005)):1;
    }
    if(s.stopProgram)this.programClosed=true;
    // Safety can precede Arm. Retain the full image across the core's epoch reset.
    if(e.p0_owner_epoch()!==owner)return 1;
    for(let i=0;i<128;i++)e.p0_set_closed_generation(i,s.closedThroughGenerationBySlot[i]);
    const g=s.reconcileGates;
    if(g&&e.p0_reconcile_begin(BigInt(g.observedInputSequence))===1){
      for(const n of g.held)e.p0_reconcile_hold(n.logicalSlot,n.generation);
      e.p0_reconcile_apply(owner);
    }else e.p0_apply_closed(owner);
    if(this.programClosed)e.p0_program_stop(owner,0);
    return 1;
  }
  validNote(n){return n&&integer(n.tokenSlot,0,127)&&integer(n.tokenGeneration,1,0xffffffff)&&integer(n.kind,1,2)
    &&finite(n.frequencyHz,1,sampleRate*.45)&&finite(n.peak,0.000001,1)
    &&['b0','b1','b2','a1','a2'].every(k=>finite(n[k],-4,4))
    &&integer(n.attackFrames,1,sampleRate)&&integer(n.releaseStartFrames,0,0xffffffff)
    &&integer(n.stopFrames,n.attackFrames+1,0xffffffff)&&finite(n.releaseCoef,0,1);}
  onMessage(m){
    if(!m||m.protocol!==P0_PROTOCOL||m.sessionId!==this.scope.sessionId||m.engineEpoch!==this.scope.engineEpoch
       ||m.ownerEpoch!==this.scope.ownerEpoch||!Object.hasOwn(this.packetHigh,m.channel)||!integer(m.packetSequence,1))return;
    const receipt=result=>this.post({kind:'receipt',channel:m.channel,packetSequence:m.packetSequence,op:m.kind,result,frame:Number(this.e.p0_frame())});
    if(m.packetSequence<=this.packetHigh[m.channel]){receipt(-1);return;}
    this.packetHigh[m.channel]=m.packetSequence;
    const e=this.e;let result=-1;
    if(this.epochClosed&&m.channel!=='safety'){receipt(-3);return;}
    try {
      if(m.channel==='safety'&&m.kind==='safety-state') {
        const s=m.state;
        if(!s||!integer(s.revision,1)||s.revision<=this.safetyRevision||!Array.isArray(s.closedThroughGenerationBySlot)
          ||s.closedThroughGenerationBySlot.length!==128||!s.closedThroughGenerationBySlot.every(v=>integer(v,0,0xffffffff))
          ||typeof s.ownerEpochClosed!=='boolean'||typeof s.stopProgram!=='boolean') {receipt(-1);return;}
        const g=s.reconcileGates;
        if(g&&(!integer(g.observedInputSequence)||!Array.isArray(g.held)||g.held.length>16
          ||!g.held.every(n=>integer(n.logicalSlot,0,127)&&integer(n.generation,1,0xffffffff)))){receipt(-1);return;}
        this.safetyRevision=s.revision;this.safetyState=s;
        result=this.applySafety(s);
      } else if(m.channel==='state'&&m.kind==='state') {
        if(integer(m.revision,1)&&finite(m.rootHz,1,sampleRate*.45)&&finite(m.programGain,0,1)
          &&integer(m.leaseValidThroughFrame,Number(e.p0_frame())+1,Number(e.p0_frame())+sampleRate*2)) {
          const r=e.p0_set_state(m.ownerEpoch,BigInt(m.revision),m.rootHz,m.programGain);
          // An old state is not a new lease. Absolute expiry is never rebased on receipt.
          result=r===1?e.p0_renew_lease(m.ownerEpoch,BigInt(m.leaseValidThroughFrame)):r;
        }
      } else if(m.channel==='normal') switch(m.kind) {
        case 'arm':
          if(integer(m.leaseValidThroughFrame))result=e.p0_arm(m.ownerEpoch,BigInt(m.leaseValidThroughFrame));
          if(result===1&&this.safetyState)this.applySafety(this.safetyState);
          break;
        case 'attack-group': {
          if(!integer(m.groupId,1)||!integer(m.inputSequence??m.groupId,1)||!integer(m.intendedFrame)||!integer(m.latestAdmissionFrame)
            ||!Array.isArray(m.notes)||m.notes.length<1||m.notes.length>3||!m.notes.every(n=>this.validNote(n)))break;
          result=e.p0_begin_attack_group(m.ownerEpoch,BigInt(m.groupId),m.notes.length,BigInt(m.intendedFrame),BigInt(m.latestAdmissionFrame));
          if(result!==1)break;
          e.p0_group_input_sequence(BigInt(m.inputSequence??m.groupId));
          for(let i=0;i<m.notes.length;i++){
            const n=m.notes[i];result=e.p0_set_attack_note(i,n.tokenSlot,n.tokenGeneration,n.kind,n.frequencyHz,n.peak,n.b0,n.b1,n.b2,n.a1,n.a2,n.attackFrames,n.releaseStartFrames,n.stopFrames,n.releaseCoef);
            if(result!==1)break;
          }
          if(result===1)result=e.p0_commit_attack_group();
          break;
        }
        case 'program-config': {
          const h=m.header;
          if(!h||!integer(h.revision,1,0xffffffff)||!integer(h.tempoMilli,10000,400000)
            ||!Array.isArray(m.steps)||m.steps.length<1||m.steps.length>64||!['b0','b1','b2','a1','a2'].every(k=>finite(h[k],-4,4))
            ||!integer(h.attackFrames,1,sampleRate)||!integer(h.releaseStartFrames)||!integer(h.stopFrames,h.attackFrames+1,0xffffffff)||!finite(h.releaseCoef,0,1)
            ||!m.steps.every(s=>Array.isArray(s)&&s.length<=3&&s.every(n=>Array.isArray(n)&&n.length===2&&finite(n[0],0.001,16)&&finite(n[1],0,1))))break;
          result=e.p0_program_set_header(m.ownerEpoch,h.revision,m.steps.length,h.tempoMilli,h.b0,h.b1,h.b2,h.a1,h.a2,h.attackFrames,h.releaseStartFrames,h.stopFrames,h.releaseCoef);
          if(result!==1)break;
          for(let i=0;i<m.steps.length;i++){
            const s=m.steps[i],a=s[0]??[1,0],b=s[1]??[1,0],c=s[2]??[1,0];
            result=e.p0_program_set_step(m.ownerEpoch,i,s.length,a[0],a[1],b[0],b[1],c[0],c[1]);
            if(result!==1)break;
          }
          break;
        }
        case 'program-start': if(!this.programClosed&&integer(m.startFrame))result=e.p0_program_start(m.ownerEpoch,BigInt(m.startFrame));break;
      }
      receipt(result);
    } catch(error){receipt(-1);this.fault(String(error?.message??error));e.p0_panic(this.scope.ownerEpoch,Math.ceil(sampleRate*.005));}
  }
  process(_inputs,outputs){
    const out=outputs[0];if(!out?.length)return true;
    const frames=out[0].length;
    if(frames>this.e.p0_max_block()){for(const ch of out)ch.fill(0);this.fault('unsupported block size');return false;}
    if(Number(this.e.p0_frame())!==currentFrame){
      if(this.e.p0_owner_epoch()===0&&!this.epochClosed&&!this.faulted){
        // Construction/connection may precede the first render callback. Only
        // the silent, never-armed preparation phase may adopt its first frame.
        this.e.p0_set_frame(BigInt(currentFrame));this.windowStart=currentFrame;this.windowPeak=0;this.nextReportFrame=currentFrame+this.reportEvery;
      }else{this.e.p0_panic(this.scope.ownerEpoch,Math.ceil(sampleRate*.005));this.fault('frame discontinuity; re-arm requires a new session');}
    }
    this.e.p0_render(frames);
    for(let i=0;i<frames;i++){
      let l=this.samples[i*2],r=this.samples[i*2+1];
      if(!Number.isFinite(l)||!Number.isFinite(r)){l=r=0;this.fault('nonfinite DSP sample');this.e.p0_panic(this.scope.ownerEpoch,Math.ceil(sampleRate*.005));}
      for(let c=0;c<out.length;c++)out[c][i]=c===0?l:r;
      this.windowPeak=Math.max(this.windowPeak,Math.abs(l),Math.abs(r));
    }
    if(currentFrame+frames>=this.nextReportFrame){
      this.post({kind:'render-proof',firstFrame:this.windowStart,frame:Number(this.e.p0_frame()),activeVoices:this.e.p0_active_voices(),
        pendingGroups:this.e.p0_pending_groups(),pendingNotes:this.e.p0_pending_notes(),programRunning:this.e.p0_program_running(),peak:this.windowPeak,
        startedExternal:Number(this.e.p0_started_external()),startedProgram:Number(this.e.p0_started_program()),expired:Number(this.e.p0_expired()),
        cancelled:Number(this.e.p0_cancelled()),ownerClosed:this.e.p0_owner_closed(),armedOwnerEpoch:this.e.p0_owner_epoch(),stateRevision:Number(this.e.p0_state_revision()),fault:this.faulted});
      this.windowPeak=0;this.windowStart=currentFrame+frames;this.nextReportFrame=this.windowStart+this.reportEvery;
    }
    return true;
  }
}
registerProcessor('xensonar-p0-w',XensonarP0Processor);
