import { ENTROPHON_AUX_MAX } from "../protocol/entrophonVoiceRecord";
import { detectBrowserAudioCapabilities } from "../transport/capabilities";
import { MessagePortTonePlanPool } from "../transport/messagePortPool";
import { allocateTonePlanRing, RingbufTonePlanWriter } from "../transport/ringbufTonePlan";
import type { TonePlanWriter } from "../transport/tonePlanTransport";
import { recordBrowserImplantDiagnostic, registerBrowserImplantSnapshotProvider } from "../runtimeDiagnostics";
import { RenderReservations, renderUnitLimit, recordRenderUnits, recordVoiceCount, MAX_RECORDS_PER_QUANTUM } from "../protocol/renderAdmission";

import { FixedCounters, FixedHistogram, ProducerReject, PRODUCER_REJECT_NAMES, SubmitReject, SUBMIT_REJECT_NAMES, ReleaseReason, RELEASE_REASON_NAMES, INPUT_AGE_BOUNDS_MS, TARGET_SLACK_BOUNDS_FRAMES } from "../protocol/admissionDiagnostics";

export class XensonarBrowserC11Host {
  private node: AudioWorkletNode | null = null;
  private writer: TonePlanWriter | null = null;
  private messagePool: MessagePortTonePlanPool | null = null;
  private epochValue = 0;
  private sessionActive = false;
  private submitted = 0;
  private kernelAccepted = 0;
  private kernelRejected = 0;
  private renderWindowsStarted = 0;
  private ended = 0;
  private admissionRejected = 0;
  private readonly reservations: RenderReservations;
  private admissionQuantum = -1;
  private quantumBuilds = 0;
  private building = 0;
  private readonly finishCallbacks: (((() => void)) | null)[] = Array(64).fill(null);
  private readonly producerReasons = new FixedCounters(PRODUCER_REJECT_NAMES);
  private readonly submitReasons = new FixedCounters(SUBMIT_REJECT_NAMES);
  private readonly releases = new FixedCounters(RELEASE_REASON_NAMES);
  private readonly inputAge = new FixedHistogram(INPUT_AGE_BOUNDS_MS);
  private readonly targetSlack = new FixedHistogram(TARGET_SLACK_BOUNDS_FRAMES);
  private readonly acceptedSlack = new FixedHistogram(TARGET_SLACK_BOUNDS_FRAMES);
  private sessionStateMessages = 0;
  private sessionStateChanges = 0;
  private recordResultIgnoredEpochMismatch = 0;
  private startedIgnoredEpochMismatch = 0;
  private endedIgnoredEpochMismatch = 0;
  private allResultAccepted = 0;
  private allResultRejected = 0;
  private diagnosticSequence = 0;
  private pendingDiagnostic: { id: number; resolve: (value: unknown) => void; timer: ReturnType<typeof setTimeout> } | null = null;
  private unregisterDiagnostic: (() => void) | null = null;
  private readonly caps;
  private readonly auxRoutes = new Map<AudioNode, number>();
  onFault: ((reason: string) => void) | null = null;

  constructor(readonly context: AudioContext, readonly destination: AudioNode, readonly profile = 0) {
    this.caps = detectBrowserAudioCapabilities(context);
    this.reservations = new RenderReservations(renderUnitLimit(profile, context.sampleRate), profile === 1 ? 32 : 512);
    recordBrowserImplantDiagnostic("host", "constructed", { profile, capabilities: this.caps, contextState: context.state, sampleRate: context.sampleRate });
  }
  get epoch(): number { return this.epochValue; }
  get transportKind(): string | null { return this.writer?.kind ?? null; }
  get capabilities() { return this.caps; }

  diagnosticSnapshot() {
    return { nodePresent:!!this.node, writerKind:this.writer?.kind??null, messagePoolPresent:!!this.messagePool,
      epoch:this.epochValue, sessionActive:this.sessionActive, submitted:this.submitted,
      kernelAccepted:this.kernelAccepted, kernelRejected:this.kernelRejected, renderWindowsStarted:this.renderWindowsStarted,
      ended:this.ended, admissionRejected:this.admissionRejected,
      producerRejectReasons: this.producerReasons.snapshot(), submitRejectReasons: this.submitReasons.snapshot(),
      reservationReleases: this.releases.snapshot(), inputAgeBasis: this.profile === 1 ? 'context-minus-intended-start' : 'performance-minus-requestedAtMs', inputAgeMs: this.inputAge.snapshot(),
      reservationTargetSlackFrames: this.targetSlack.snapshot(), acceptedTargetSlackFrames: this.acceptedSlack.snapshot(),
      sessionStateMessages: this.sessionStateMessages, sessionStateChanges: this.sessionStateChanges,
      recordResultIgnoredEpochMismatch: this.recordResultIgnoredEpochMismatch,
      startedIgnoredEpochMismatch: this.startedIgnoredEpochMismatch, endedIgnoredEpochMismatch: this.endedIgnoredEpochMismatch,
      allEpochResultAccepted: this.allResultAccepted, allEpochResultRejected: this.allResultRejected,
      reservedRenderUnits:this.reservations.usedUnits, renderUnitLimit:this.reservations.unitLimit,
      reservedVoices:this.reservations.usedVoices, reservations:this.reservations.count,
      profile:this.profile, auxRouteCount:this.auxRoutes.size,
      contextState:this.context.state, sampleRate:this.context.sampleRate, capabilities:this.caps };
  }

  /** Browser records carry absolute AudioContext frames, never a READY-relative guess. */
  currentContextFrame(): number { return Math.round(this.context.currentTime*this.context.sampleRate); }
  get canSubmit(): boolean { return this.sessionActive && this.context.state === 'running'; }

  /** Synchronous decision BEFORE resolving a voice/plan. No queue, timer or retry. */
  tryReserveAttack(token: number, targetFrame: number, units: number, voices: number): boolean {
    const now = this.currentContextFrame(), quantum = Math.floor(now / 128);
    if (quantum !== this.admissionQuantum) { this.admissionQuantum = quantum; this.quantumBuilds = 0; }
    this.targetSlack.observe(targetFrame - now);
    let reason: ProducerReject | null = null;
    if (!this.canSubmit) reason = ProducerReject.Inactive;
    else if (!Number.isSafeInteger(targetFrame)) reason = ProducerReject.InvalidTarget;
    else if (targetFrame < now) reason = ProducerReject.TargetPast;
    else if (!this.writer || this.writer.availableRecords <= this.building) reason = ProducerReject.Transport;
    else if (this.quantumBuilds >= MAX_RECORDS_PER_QUANTUM) reason = ProducerReject.QuantumCap;
    else if (!token || !Number.isInteger(units) || units <= 0 || !Number.isInteger(voices) || voices <= 0) reason = ProducerReject.InvalidDemand;
    else if (this.reservations.find(token) >= 0) reason = ProducerReject.DuplicateToken;
    else if (this.reservations.usedUnits + units > this.reservations.unitLimit) reason = ProducerReject.Units;
    else if (this.reservations.usedVoices + voices > this.reservations.voiceLimit) reason = ProducerReject.Voices;
    else if (this.reservations.reserve(token, units, voices, targetFrame) < 0) reason = ProducerReject.Capacity;
    if (reason !== null) { this.producerReasons.add(reason); this.admissionRejected++; return false; }
    this.acceptedSlack.observe(targetFrame - now);
    this.building++; this.quantumBuilds++; return true;
  }
  observeInputAge(ageMs: number): void { this.inputAge.observe(ageMs); }
  reservedFrame(token: number): number {
    const slot=this.reservations.find(token);
    return slot<0 ? NaN : this.reservations.frames[slot];
  }
  cancelUnsubmitted(token: number): void {
    const slot=this.reservations.find(token);
    if(slot>=0 && this.reservations.states[slot]===1){this.building--;this.releaseReservation(slot, ReleaseReason.Cancel);}
  }
  onFinished(token: number, callback: () => void): void {
    const slot=this.reservations.find(token);
    if(slot<0){callback();return;}
    this.finishCallbacks[slot]=callback;
  }
  private releaseReservation(slot: number, reason: ReleaseReason): void {
    if(slot<0 || !this.reservations.states[slot])return;
    this.releases.add(reason);
    const callback=this.finishCallbacks[slot];this.finishCallbacks[slot]=null;
    this.reservations.release(slot);callback?.();
  }
  private acceptSession(epoch: number, active: boolean): void {
    this.sessionStateMessages++;
    if (epoch !== this.epochValue || active !== this.sessionActive) this.sessionStateChanges++;
    if(epoch!==this.epochValue || !active){
      for(let i=0;i<this.reservations.states.length;i++)this.releaseReservation(i, ReleaseReason.Fence);
      this.building=0;
    }
    this.epochValue=epoch;this.sessionActive=active;
  }

  /** Stable per-context mapping: one fixed Worklet output per unique FX destination. */
  resolveAuxRouteMask(targets: Array<AudioNode | null | undefined>): number {
    if (this.profile !== 1 || !this.node) return targets.some(t => t && t !== this.destination) ? -1 : 0;
    let mask=0;
    for (const target of targets) {
      if (!target || target === this.destination) continue;
      let route=this.auxRoutes.get(target);
      if (route === undefined) {
        route=this.auxRoutes.size;
        if (route >= ENTROPHON_AUX_MAX) return -1;
        this.node.connect(target, route+1, 0);
        this.auxRoutes.set(target, route);
        recordBrowserImplantDiagnostic("host", "aux-route-connected", { profile:this.profile, route, target:target.constructor?.name??"AudioNode" });
      }
      mask |= 1 << route;
    }
    return mask >>> 0;
  }

  async createNode(initPayload:{compiledModule?:WebAssembly.Module;wasmBytes?:ArrayBuffer}):Promise<boolean>{
    if(!this.caps.audioWorklet||!this.caps.webAssembly)return false;
    const tonePlanSAB=this.caps.sabFastPath?allocateTonePlanRing():undefined;
    const outputs=this.profile===1?1+ENTROPHON_AUX_MAX:1;
    const channelCounts=this.profile===1 ? [2, ...Array.from({length:ENTROPHON_AUX_MAX},()=>1)] : [2];
    const node=new AudioWorkletNode(this.context,"xensonar-c11-host",{
      numberOfInputs:0, numberOfOutputs:outputs, outputChannelCount:channelCounts,
      processorOptions:tonePlanSAB?{tonePlanSAB}:{},
    });
    this.node=node;
    this.unregisterDiagnostic = registerBrowserImplantSnapshotProvider(this.profile === 1 ? 'entrophon' : 'direct', () => this.requestDiagnosticSnapshot());
    node.connect(this.destination,0,0);

    let gotInitAck=false;
    const ready=new Promise<boolean>((resolve)=>{
      let settled=false;
      const finish=(value:boolean)=>{if(settled)return;settled=true;clearTimeout(timer);resolve(value);};
      const timer=window.setTimeout(()=>{recordBrowserImplantDiagnostic("host","ready-timeout",{gotInitAck,snapshot:this.diagnosticSnapshot()});finish(false);},5000);
      node.onprocessorerror=()=>{this.acceptSession(this.epochValue,false);this.onFault?.("AudioWorklet processor error");finish(false);};
      node.port.onmessage=(ev)=>{
        const m=ev.data;
        if(m?.type==="INIT_ACK")gotInitAck=true;
        else if(m?.type==="READY"){this.epochValue=m.epoch>>>0;finish(true);}
        else if(m?.type==="SESSION_STATE")this.acceptSession(m.epoch>>>0,!!m.active);
        else if(m?.type==="HOT_BUFFER_RETURN"&&this.messagePool)this.messagePool.reclaim(m.buffer);
        else if(m?.type==="DIAGNOSTIC_SNAPSHOT" && this.pendingDiagnostic && this.pendingDiagnostic.id===m.requestId) {
          const pending = this.pendingDiagnostic; this.pendingDiagnostic = null; clearTimeout(pending.timer);
          pending.resolve({host: this.diagnosticSnapshot(), consumer: m.snapshot, consumerSnapshotStatus: 'received'});
        }
        else if(m?.type==="RECORD_RESULT") {
          if (m.result === 0) this.allResultAccepted++; else this.allResultRejected++;
          if (m.epoch !== this.epochValue) this.recordResultIgnoredEpochMismatch++;
          else if(m.result===0)this.kernelAccepted++;
          else{this.kernelRejected++;this.releaseReservation(this.reservations.find(m.token), ReleaseReason.Rejection);}
        }
        else if(m?.type==="RENDER_STARTED") {
          if(m.epoch===this.epochValue)this.renderWindowsStarted++; else this.startedIgnoredEpochMismatch++;
        }
        else if(m?.type==="RECORD_ENDED") {
          if(m.epoch===this.epochValue){this.ended++;this.releaseReservation(this.reservations.find(m.token), ReleaseReason.End);}
          else this.endedIgnoredEpochMismatch++;
        }
        else if(m?.type==="PANIC_DONE")this.acceptSession(m.epoch>>>0,!!m.active);
        else if(m?.type==="FAULT"){this.acceptSession(this.epochValue,false);this.onFault?.(String(m.reason??"AudioWorklet fault"));finish(false);}
      };
      try{node.port.start();}catch{/* already active */}
    });

    if(tonePlanSAB)this.writer=new RingbufTonePlanWriter(tonePlanSAB);
    else{this.messagePool=new MessagePortTonePlanPool(node.port,32);this.writer=this.messagePool;}
    const bytes=initPayload.wasmBytes;
    if(bytes instanceof ArrayBuffer)node.port.postMessage({type:"INIT",attemptId:1,wasmBytes:bytes,profile:this.profile});
    else if(initPayload.compiledModule instanceof WebAssembly.Module)node.port.postMessage({type:"INIT",attemptId:1,compiledModule:initPayload.compiledModule,profile:this.profile});
    else throw new Error("C11 browser host requires wasmBytes or compiledModule");
    return await ready;
  }

  /** Explicit diagnostic download only: no periodic audio-thread messages. */
  requestDiagnosticSnapshot(): Promise<unknown> {
    if (!this.node || this.pendingDiagnostic) return Promise.resolve({host: this.diagnosticSnapshot(), consumer: null, consumerSnapshotStatus: this.node ? 'request-in-flight' : 'no-node'});
    return new Promise(resolve => {
      const id = ++this.diagnosticSequence;
      const timer = setTimeout(() => {
        this.pendingDiagnostic = null;
        resolve({host: this.diagnosticSnapshot(), consumer: null, consumerSnapshotStatus: 'timeout'});
      }, 750);
      this.pendingDiagnostic = {id, resolve, timer};
      this.node!.port.postMessage({type: 'DIAGNOSTIC_REQUEST', requestId: id});
    });
  }

  trySubmitRecord(record:Uint32Array):boolean{
    const token=record[1], slot=this.reservations.find(token);
    if(slot<0 || this.reservations.states[slot]!==1){this.submitReasons.add(SubmitReject.MissingReservation);return false;}
    let reason: SubmitReject | null = null;
    if(!this.canSubmit) reason = SubmitReject.Inactive;
    else if(record[2]!==this.epochValue) reason = SubmitReject.Epoch;
    else if(record[3]+record[4]*0x100000000!==this.reservations.frames[slot]) reason = SubmitReject.TargetMismatch;
    else if(this.reservations.frames[slot]<this.currentContextFrame()) reason = SubmitReject.TargetPast;
    else if(!this.reservations.reduce(slot,recordRenderUnits(record),recordVoiceCount(record))) reason = SubmitReject.Underestimated;
    if(reason !== null){this.submitReasons.add(reason);this.cancelUnsubmitted(token);return false;}
    let sent=false;
    try{sent=this.writer?.trySend(record)??false;}catch{this.submitReasons.add(SubmitReject.TransportException);this.cancelUnsubmitted(token);return false;}
    if(!sent){this.submitReasons.add(SubmitReject.Transport);this.cancelUnsubmitted(token);return false;}
    this.reservations.states[slot]=2;this.building--;this.submitted++;
    return true;
  }
  trySubmitTonePlan(record:Uint32Array):boolean{return this.trySubmitRecord(record);}
  unmute():void{this.node?.port.postMessage({type:"SET_MUTED",muted:false});}
  mute():void{this.sessionActive=false;this.node?.port.postMessage({type:"SET_MUTED",muted:true});}
  panic():void{this.sessionActive=false;this.node?.port.postMessage({type:"PANIC"});}
  destroy():void{
    this.unregisterDiagnostic?.(); this.unregisterDiagnostic=null;
    if (this.pendingDiagnostic) {
      clearTimeout(this.pendingDiagnostic.timer);
      this.pendingDiagnostic.resolve({host: this.diagnosticSnapshot(), consumer: null, consumerSnapshotStatus: 'destroyed'});
      this.pendingDiagnostic=null;
    }
    try{this.node?.port.postMessage({type:"STOP"});}catch{}
    try{this.node?.disconnect();}catch{}
    this.acceptSession(this.epochValue,false);this.node=null;this.writer?.destroy();this.writer=null;this.messagePool=null;this.auxRoutes.clear();
  }
}
