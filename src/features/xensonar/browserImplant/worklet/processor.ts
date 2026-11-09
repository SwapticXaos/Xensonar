import { BROWSER_C11_RECORD_BYTES, validateBrowserC11Record } from "../protocol/browserC11Record";
import { ENTROPHON_AUX_MAX } from "../protocol/entrophonVoiceRecord";
import { RingbufTonePlanReader } from "../transport/ringbufTonePlan";
import type { RealKernelBridge } from "./kernelBridgeContract";
import { createRealKernelBridge } from "./realKernelBridge";
import { RenderReservations, renderUnitLimit, recordRenderUnits, recordVoiceCount, recordDuration, MAX_RECORDS_PER_QUANTUM } from "../protocol/renderAdmission";

import { FixedCounters, FixedHistogram, ConsumerReject, CONSUMER_REJECT_NAMES, FenceReason, FENCE_REASON_NAMES, TARGET_SLACK_BOUNDS_FRAMES } from "../protocol/admissionDiagnostics";

declare const sampleRate: number;
declare const currentFrame: number;
declare class AudioWorkletProcessor { readonly port: MessagePort; constructor(options?: AudioWorkletNodeOptions); }
declare function registerProcessor(name: string, ctor: typeof AudioWorkletProcessor): void;

const MAX_RECORDS_PER_CALLBACK = MAX_RECORDS_PER_QUANTUM;
const PORT_CAPACITY = 32;
const INACTIVE = -10, STALE = -3, BAD_RECORD = -1, OLD_EPOCH = -4, INGRESS_FULL = -2;

/** One consumer boundary for SAB and MessagePort. READY is not a clock origin.
 * Browser records retain absolute AudioContext timestamps up to this boundary.
 * Only here are they mapped onto the number of frames actually rendered by C11.
 */
class XensonarC11Processor extends AudioWorkletProcessor {
  private bridge: RealKernelBridge | null = null;
  private ring: RingbufTonePlanReader | null = null;
  private ready = false;
  private muted = true;
  private initializing = false;
  private stopped = false;
  private profile = 0;
  private reservations: RenderReservations | null = null;
  private lastContextEnd: number | null = null;
  private readonly portQueue: (Uint32Array | null)[] = Array(PORT_CAPACITY).fill(null);
  private portRead = 0;
  private portWrite = 0;
  private portCount = 0;

  private readonly fenceReasons = new FixedCounters(FENCE_REASON_NAMES);
  private readonly rejectReasons = new FixedCounters(CONSUMER_REJECT_NAMES);
  private readonly kernelReturns = new FixedCounters(['arg', 'capacity', 'stale', 'epoch', 'state', 'other']);
  private readonly contextGaps = new FixedHistogram([-1024, -128, -1, 0, 1, 127, 128, 256, 512, 1024, 4096]);
  private readonly targetSlack = new FixedHistogram(TARGET_SLACK_BOUNDS_FRAMES);
  private readonly quantumFrames = new FixedHistogram([0, 64, 128, 256, 512, 1024]);
  private callbacks = 0;
  private lastContextGapFrames = 0;
  private maxAbsContextGapFrames = 0;
  private lastQuantumFrames = 0;
  private fencedReservations = 0;
  private fencedStartedReservations = 0;
  private fencedQueuedRecords = 0;
  private consumed = 0;
  private submittedToKernel = 0;
  private kernelAccepted = 0;
  private normalEnds = 0;
  private started = 0;

  private diagnosticSnapshot() {
    return {profile: this.profile, epoch: this.bridge?.epoch ?? 0, active: this.ready && !this.muted,
      contextFrame: currentFrame, renderedFrames: this.bridge?.renderedFrames ?? 0, callbacks: this.callbacks,
      fenceReasons: this.fenceReasons.snapshot(), contextGaps: this.contextGaps.snapshot(),
      lastContextGapFrames: this.lastContextGapFrames, maxAbsContextGapFrames: this.maxAbsContextGapFrames,
      lastQuantumFrames: this.lastQuantumFrames, quantumFrames: this.quantumFrames.snapshot(),
      fencedReservations: this.fencedReservations, fencedStartedReservations: this.fencedStartedReservations,
      fencedQueuedRecords: this.fencedQueuedRecords, consumed: this.consumed,
      rejectReasons: this.rejectReasons.snapshot(), kernelReturns: this.kernelReturns.snapshot(),
      submittedToKernel: this.submittedToKernel, kernelAccepted: this.kernelAccepted,
      normalEnds: this.normalEnds, started: this.started, targetSlackFrames: this.targetSlack.snapshot(),
      pendingPortRecords: this.portCount, reservations: this.reservations?.count ?? 0};
  }
  private reject(reason: ConsumerReject, code: number): number { this.rejectReasons.add(reason); return code; }

  constructor(options: AudioWorkletNodeOptions) {
    super(options);
    const sab = (options.processorOptions as any)?.tonePlanSAB;
    if (typeof SharedArrayBuffer !== "undefined" && sab instanceof SharedArrayBuffer) this.ring = new RingbufTonePlanReader(sab);
    this.port.onmessage = (ev) => { void this.onMessage(ev.data); };
    try { this.port.start(); } catch { /* already active */ }
  }

  private sessionState(): void {
    this.port.postMessage({ type: "SESSION_STATE", epoch: this.bridge?.epoch ?? 0, active: this.ready && !this.muted });
  }
  private finishRecord(words: Uint32Array, result: number, returnBuffer: boolean): void {
    // Transport recycling and kernel acceptance are deliberately different facts.
    this.port.postMessage({ type: "RECORD_RESULT", token: words[1], epoch: words[2], result });
    if (returnBuffer) this.port.postMessage({ type: "HOT_BUFFER_RETURN", buffer: words.buffer }, [words.buffer]);
  }
  private drainPort(result: number): void {
    while (this.portCount) {
      const words = this.popPort()!;
      this.rejectReasons.add(ConsumerReject.OldEpoch);
      this.finishRecord(words, result, true);
    }
  }
  private popPort(): Uint32Array | null {
    if (!this.portCount) return null;
    const words = this.portQueue[this.portRead];
    this.portQueue[this.portRead] = null;
    this.portRead = (this.portRead + 1) % PORT_CAPACITY;
    this.portCount--;
    return words;
  }
  private fence(reason: FenceReason): void {
    this.fenceReasons.add(reason);
    this.fencedQueuedRecords += this.portCount;
    if (this.reservations) for (const state of this.reservations.states) {
      if (state) this.fencedReservations++;
      if (state === 2) this.fencedStartedReservations++;
    }
    this.bridge?.panic();
    this.reservations?.clear();
    this.drainPort(OLD_EPOCH);
  }
  private clearOutputs(outputs: Float32Array[][]): void {
    for (const out of outputs) for (const channel of out ?? []) channel?.fill(0);
  }

  private async onMessage(msg: any): Promise<void> {
    if (!msg || typeof msg !== "object") return;
    if (msg.type === "DIAGNOSTIC_REQUEST") {
      this.port.postMessage({type: "DIAGNOSTIC_SNAPSHOT", requestId: msg.requestId, snapshot: this.diagnosticSnapshot()});
      return;
    }
    if (msg.type === "STOP") {
      this.stopped = true; this.muted = true; this.ready = false;
      this.fence(FenceReason.Stop); this.bridge?.destroy(); this.bridge = null;
      return;
    }
    if (this.stopped) return;
    if (msg.type === "INIT") {
      const attemptId = Number(msg.attemptId) || 0;
      this.port.postMessage({ type: "INIT_ACK", attemptId, state: this.ready ? "ready" : this.initializing ? "initializing" : "idle" });
      if (this.ready || this.initializing) return;
      this.initializing = true;
      try {
        this.profile = Number(msg.profile) >>> 0;
        const bridge = await createRealKernelBridge({ ...msg, profile: this.profile }, sampleRate);
        if (this.stopped) { bridge.destroy(); return; }
        this.bridge = bridge;
        this.reservations = new RenderReservations(renderUnitLimit(this.profile, sampleRate), this.profile === 1 ? 32 : 512);
        this.ready = true; this.muted = true;
        this.port.postMessage({ type: "READY", sampleRate, epoch: bridge.epoch,
          transport: this.ring ? "ringbuf-sab" : "message-port-pool", profile: this.profile });
      } catch (error) {
        this.port.postMessage({ type: "FAULT", reason: error instanceof Error ? error.message : String(error), stage: "kernel-bridge-create" });
      } finally { this.initializing = false; }
      return;
    }
    if (!this.bridge) return;
    if (msg.type === "HOT_TONE_PLAN") {
      const buffer = msg.buffer as ArrayBuffer;
      if (buffer?.byteLength !== BROWSER_C11_RECORD_BYTES) { this.rejectReasons.add(ConsumerReject.BadBuffer); return; }
      const words = new Uint32Array(buffer);
      if (!this.ready || this.muted) { this.finishRecord(words, this.reject(ConsumerReject.Inactive, INACTIVE), true); return; }
      if (this.portCount === PORT_CAPACITY) { this.finishRecord(words, this.reject(ConsumerReject.PortFull, INGRESS_FULL), true); return; }
      this.portQueue[this.portWrite] = words;
      this.portWrite = (this.portWrite + 1) % PORT_CAPACITY;
      this.portCount++;
    } else if (msg.type === "PANIC") {
      this.fence(FenceReason.Panic);
      this.port.postMessage({ type: "PANIC_DONE", epoch: this.bridge.epoch, active: !this.muted });
    } else if (msg.type === "SET_MUTED") {
      const muted = !!msg.muted;
      // Explicit mute ends the current audible session. No queued attack/tail
      // from that session is paused and replayed by a later unmute.
      if (muted && !this.muted) this.fence(FenceReason.Mute);
      this.muted = muted;
      this.sessionState();
    }
  }

  private consume(words: Uint32Array): number {
    this.consumed++;
    const bridge = this.bridge;
    if (!bridge || !this.ready || this.muted) return this.reject(ConsumerReject.Inactive, INACTIVE);
    if (!validateBrowserC11Record(words)) return this.reject(ConsumerReject.BadRecord, BAD_RECORD);
    if ((words[0] & 255) !== (this.profile === 1 ? 2 : 1)) return this.reject(ConsumerReject.BadRecord, BAD_RECORD);
    if (words[2] !== bridge.epoch) return this.reject(ConsumerReject.OldEpoch, OLD_EPOCH);
    const contextTarget = words[3] + words[4] * 0x100000000;
    this.targetSlack.observe(contextTarget - currentFrame);
    if (!Number.isSafeInteger(contextTarget) || contextTarget < currentFrame) return this.reject(ConsumerReject.Stale, STALE);
    const kernelTarget = bridge.renderedFrames + contextTarget - currentFrame;
    const reservations = this.reservations!;
    const slot = reservations.reserve(words[1], recordRenderUnits(words), recordVoiceCount(words), kernelTarget, kernelTarget + recordDuration(words));
    // Reject BEFORE coefficient preparation or kernel queue insertion. Keeping
    // every promised voice reserved also makes later no-slot refusal impossible.
    if (slot < 0) return this.reject(ConsumerReject.Reservation, INGRESS_FULL);
    const lo = words[3], hi = words[4];
    words[3] = kernelTarget >>> 0;
    words[4] = Math.floor(kernelTarget / 0x100000000);
    this.submittedToKernel++;
    const result = bridge.submitRecord(words);
    words[3] = lo; words[4] = hi;
    if (result !== 0) {
      reservations.release(slot); this.rejectReasons.add(ConsumerReject.Kernel);
      this.kernelReturns.add(result <= -1 && result >= -5 ? -result - 1 : 5);
    } else this.kernelAccepted++;
    return result;
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const main = outputs[0];
    if (!main?.[0]) return !this.stopped;
    const L = main[0], R = main[1] ?? main[0];
    this.callbacks++; this.lastQuantumFrames = L.length; this.quantumFrames.observe(L.length);
    this.clearOutputs(outputs);
    if (!this.ready || !this.bridge) return !this.stopped;
    // Normal AudioContext suspend freezes its clock. A true discontinuity is a
    // new session: cancel stale kernel work rather than render catch-up blocks.
    if (this.lastContextEnd !== null && currentFrame !== this.lastContextEnd) {
      const gap = currentFrame - this.lastContextEnd;
      this.lastContextGapFrames = gap; this.maxAbsContextGapFrames = Math.max(this.maxAbsContextGapFrames, Math.abs(gap));
      this.contextGaps.observe(gap);
      this.fence(FenceReason.Context); this.sessionState();
    }
    this.lastContextEnd = currentFrame + L.length;
    for (let i = 0; i < MAX_RECORDS_PER_CALLBACK; i++) {
      const words = this.ring ? this.ring.tryPop() : this.popPort();
      if (!words) break;
      this.finishRecord(words, this.consume(words), !this.ring);
    }
    if (this.muted) return true;
    let off = 0;
    while (off < L.length) {
      const n = Math.min(L.length - off, this.bridge.maxRenderFrames);
      this.bridge.render(n);
      const l = this.bridge.outputLeft(), r = this.bridge.outputRight();
      for (let i = 0; i < n; i++) { L[off+i] = l[i]; R[off+i] = r[i]; }
      if (this.profile === 1) {
        for (let route = 0; route < ENTROPHON_AUX_MAX; route++) {
          const out = outputs[route+1]; if (!out?.[0]) continue;
          const aux = this.bridge.outputAux(route); const aL = out[0], aR = out[1] ?? out[0];
          for (let i = 0; i < n; i++) { aL[off+i] = aux[i]; aR[off+i] = aux[i]; }
        }
      }
      off += n;
    }
    const reservations=this.reservations!;
    for(let i=0;i<reservations.states.length;i++) {
      if(!reservations.states[i])continue;
      if(reservations.states[i]===1 && this.bridge.renderedFrames>reservations.frames[i]) {
        reservations.states[i]=2; this.started++;
        this.port.postMessage({type:"RENDER_STARTED",token:reservations.tokens[i],epoch:this.bridge.epoch});
      }
      if(this.bridge.renderedFrames>=reservations.ends[i]) {
        this.normalEnds++;
        this.port.postMessage({type:"RECORD_ENDED",token:reservations.tokens[i],epoch:this.bridge.epoch});
        reservations.release(i);
      }
    }
    return true;
  }
}
registerProcessor("xensonar-c11-host", XensonarC11Processor);
