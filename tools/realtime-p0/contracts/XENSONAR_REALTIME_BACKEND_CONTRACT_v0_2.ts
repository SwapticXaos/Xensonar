/**
 * Xensonar realtime backend contract v0.2 — DESIGN ONLY, 2026-09-20.
 * No product adapter, runtime validator, DSP implementation or audio approval.
 * Normative companion: ASTRA_ERSTER_HOERBARER_PILOT_P0.md and Constitution v2.
 * P0 is a narrow poly-sine/program lane. Unsupported bodies remain browser-owned.
 * No AudioContext/AudioNode facade and no untyped generic live payloads.
 *
 * Every array/string/byte payload needs a checked bound before RT admission.
 * All numeric inputs must be finite; counters/frames must be safe integers >= 0.
 * P0 uses numbers within that range; a wire extension must define larger counters.
 */

export type Id = string; // Validated nonempty ASCII, <= 64 bytes; hashes are hex.
export type Revision = number;
export type Sequence = number;
export type Frame = number;
export type Generation = number;

export interface LaneScope {
  readonly sessionId: Id;
  readonly engineEpoch: Id;
  readonly ownerEpoch: Id;
  readonly laneId: Id;
}

/** These epochs MUST NOT be inferred from arrival order or current wall time. */
export type TimelineInstant =
  | { readonly basis: "browser-monotonic"; readonly clockId: Id; readonly ms: number }
  | { readonly basis: "engine-frame"; readonly clockEpoch: Id; readonly frame: Frame };

export interface SourceEventStamp {
  readonly clockId: Id;
  readonly inputSequence: Sequence;
  readonly eventAtMs: number; // Original normalized input time, not handler time.
  readonly dispatchedAtMs: number;
  readonly sentAtMs: number;
}

export interface AttackTiming {
  readonly source: SourceEventStamp;
  readonly intendedStart: TimelineInstant;
  /** Original intent + existing musical allowance; never recomputed from arrival.
   * Final admission deadline, NOT a tightened deadline for the first audible sample.
   * The existing safe-start lead after successful admission does not consume it again.
   */
  readonly validAdmissionThrough: TimelineInstant;
}

/** Internal adapter result; retain the original AttackTiming for decisions/traces. */
export interface ResolvedAttackTiming {
  readonly original: AttackTiming;
  readonly mappingRevision: Revision;
  readonly clockEpoch: Id;
  readonly uncertaintyFrames: number;
  readonly intendedFrame: Frame;
  readonly latestAdmissionFrame: Frame;
  readonly actualStartFrame: Frame; // Earliest available frame only AFTER validity.
}

/** Logical identity is independent of the reusable oscillator/DSP slot. */
export interface NoteToken {
  readonly logicalSlot: number; // P0: 0..127; scoped by LaneScope.
  readonly generation: Generation; // >=1; zero in a fence table means never closed.
}

export interface SineBody {
  readonly waveform: "sine";
  readonly frequencyHz: number;
  readonly peakGain: number;
  readonly cutoffHz: number;
  readonly lowpassQDb: number; // WebAudio lowpass Q convention, NOT linear Q.
}

export interface LegacyOtherOneShot {
  readonly kind: "323-other-one-shot-v1";
  readonly body: SineBody;
  readonly durationSeconds: number;
  readonly heldLong: boolean;
  readonly overloadSoftening: 1; // P0 parity fixture, no new product pressure policy.
  readonly gainScale: 1;
}

export interface PilotGatedTone {
  readonly kind: "pilot-gated-sine-v1";
  readonly body: SineBody;
  readonly attackSeconds: 0.032;
  readonly releaseSeconds: 0.03;
}

export interface AttackNote {
  readonly token: NoteToken;
  readonly articulation: LegacyOtherOneShot | PilotGatedTone;
}

/** P0 arrays: 1..3 notes. All-or-none admission; simultaneous starts for a chord. */
export interface AttackGroup {
  readonly kind: "attack-group";
  readonly eventId: Id;
  readonly inputSequence: Sequence;
  readonly timing: AttackTiming;
  readonly notes: readonly AttackNote[];
}

/** Full snapshot. Producer merges partial UI edits before replacement/posting. */
export interface LaneState {
  readonly kind: "state";
  readonly revision: Revision;
  readonly source: SourceEventStamp;
  readonly rootFrequencyHz: number; // For future program notes, not old one-shots.
  readonly programGain: number; // 0 is valid; not falsy-defaulted to audible gain.
  readonly continuousRampSeconds: 0.01;
}

export interface ProgramNote {
  readonly rootRatio: number;
  readonly peakGain: number;
  readonly durationSeconds: number;
}

export interface ProgramStep {
  readonly notes: readonly ProgramNote[]; // 0..3, bounded at compile time.
}

/** Prepared off-RT, immutable after validation; no JS callback per step. */
export interface PolySineProgram {
  readonly schema: "poly-sine-program-v1";
  readonly programId: Id;
  readonly revision: Revision;
  readonly tempoBpm: number;
  readonly quarterNotesPerBar: 4;
  readonly stepsPerBar: 16;
  readonly steps: readonly ProgramStep[]; // P0 <=64, length multiple of 16.
  readonly cutoffHz: number;
  readonly lowpassQDb: number;
  readonly envelope: "323-other-one-shot-v1";
}

export interface PreparedProgramHandle {
  readonly engineEpoch: Id;
  readonly slot: number;
  readonly generation: Generation;
  readonly contentSha256: string;
  readonly programId: Id;
  readonly revision: Revision;
}

export type ProgramCommand =
  | { readonly kind: "program-start"; readonly handle: PreparedProgramHandle;
      readonly clockEpoch: Id; readonly startFrame: Frame }
  | { readonly kind: "program-replace"; readonly handle: PreparedProgramHandle;
      readonly boundary: "next-bar" };

export interface ProgramStopFence {
  readonly programId: Id; // P0: one logical program identity per lane epoch.
  readonly closedThroughRevision: Revision;
  readonly mode: "drain-existing-notes" | "panic-fade";
}

/** Safety is carried separately from droppable attack capacity. */
export type SafetyCommand =
  | { readonly kind: "release"; readonly safetySequence: Sequence;
      readonly token: NoteToken; readonly observedInputSequence: Sequence }
  | { readonly kind: "gate-reconcile"; readonly safetySequence: Sequence;
      readonly observedInputSequence: Sequence; readonly held: readonly NoteToken[] }
  | { readonly kind: "program-stop"; readonly safetySequence: Sequence;
      readonly stop: ProgramStopFence }
  | { readonly kind: "panic"; readonly safetySequence: Sequence;
      readonly closesOwnerEpoch: Id; readonly reason: "user" | "fault" | "disconnect" };

/**
 * Local SafetyCommands merge into this full wire image before posting.
 * A busy safety channel retains ONE latest image; no unbounded release queue.
 * Watermarks only increase. A closed owner epoch never becomes armed by a snapshot.
 */
export interface SafetyState {
  readonly revision: Sequence;
  readonly closedThroughGenerationBySlot: readonly Generation[]; // Exactly 128.
  readonly reconcileGates: null | {
    readonly observedInputSequence: Sequence;
    readonly held: readonly NoteToken[]; // <=16 gated notes in this P0 profile.
  };
  readonly stopProgram: ProgramStopFence | null;
  readonly ownerEpochClosed: boolean; // Sticky true: panic/fault/close.
}

/**
 * Gate reconciliation is only for gated notes at/below observedInputSequence.
 * Release cancels pending starts AND releases active notes for this exact token.
 * Panic terminally fences the owner epoch, clears pending, stops programs, fades.
 * A safety ACK distinguishes accepted, applied, and rendered-silent completion.
 * Logical-slot closed-generation watermarks are bounded; no ever-growing map.
 */
export interface SafetyCompletion {
  readonly scope: LaneScope;
  readonly safetySequence: Sequence;
  readonly stage: "accepted" | "applied" | "rendered-silent";
  readonly clockEpoch: Id;
  readonly frame: Frame;
  readonly outputDrainedThrough?: Frame; // Only if actually established, not assumed.
}

export interface LeaseRenewal {
  readonly kind: "lease-renew";
  readonly revision: Revision;
  readonly issuedAt: TimelineInstant;
  readonly validThrough: TimelineInstant; // P0 <= issuedAt + 1500 ms.
}

export interface CommandEnvelope<T> {
  readonly protocol: "xensonar-rt/0.2";
  readonly scope: LaneScope;
  readonly packetSequence: Sequence;
  readonly payload: T;
}

export type NormalCommand = AttackGroup | ProgramCommand;
export type ControlPacket =
  | CommandEnvelope<{ readonly channel: "normal"; readonly commands: readonly NormalCommand[] }>
  | CommandEnvelope<{ readonly channel: "state"; readonly state: LaneState; readonly lease: LeaseRenewal }>
  | CommandEnvelope<{ readonly channel: "safety"; readonly state: SafetyState }>;

/** Real credits count physical outstanding packets, not the most recently sent id. */
export interface PacketReceipt {
  readonly sessionId: Id;
  readonly engineEpoch: Id;
  readonly ownerEpoch: Id;
  readonly laneId: Id;
  readonly channel: "normal" | "state" | "safety";
  readonly packetSequence: Sequence;
  readonly outcome: "ingress-accepted" | "rejected";
  readonly rejectedBecause?: "scope" | "schema" | "capacity" | "closed";
}

/** Packet receipt does NOT imply attack admission, render progress or audibility. */
export interface MusicalReceipt {
  readonly scope: LaneScope;
  readonly eventId: Id;
  readonly result: "admitted" | "expired" | "cancelled" | "capacity" | "clock-invalid";
  readonly resolved?: ResolvedAttackTiming;
}

export interface ClockEstimate {
  readonly sourceClockId: Id;
  readonly engineClockEpoch: Id;
  readonly revision: Revision;
  readonly framesPerBrowserMillisecond: number;
  readonly frameIntercept: number;
  readonly errorBoundFrames: number;
  readonly validThroughBrowserMs: number;
  readonly outputTimeQualified: boolean;
}

export interface RenderProof {
  readonly scope: LaneScope;
  readonly clockEpoch: Id;
  readonly firstFrame: Frame;
  readonly throughFrame: Frame;
  readonly appliedStateRevision: Revision;
  readonly appliedProgramRevision: Revision | null;
  readonly activeVoices: number;
  readonly pendingAttacks: number;
  readonly signal: "expected-silent" | "expected-signal" | "fault";
  readonly peak: number; // Not, by itself, a loudspeaker or musical-parity proof.
  readonly finiteSamples: boolean;
  readonly errorCount: number;
}

export interface BackendCapabilities {
  readonly protocol: "xensonar-rt/0.2";
  readonly backend: "worklet-wasm" | "native-cpal";
  readonly engineEpoch: Id;
  readonly clockEpoch: Id;
  readonly sampleRate: number;
  readonly maximumBlockFrames: number;
  readonly channels: 2;
  readonly voiceSlots: 16;
  readonly tailSlots: 4;
  readonly tokenSlots: 128;
  readonly pendingAttacks: 64;
  readonly supportsAssets: false; // P0 explicitly excludes samples/material.
}

/** Future asset seam only; P0 MUST reject asset use, not supply a fallback sine. */
export interface PreparedAssetIdentity {
  readonly contentSha256: string;
  readonly generation: Generation;
  readonly channels: number;
  readonly frames: Frame;
  readonly sampleRate: number;
  readonly decodedFormat: "f32-planar";
}

/** Adapter surface; methods run in the control plane, never as RT promises. */
export interface PilotBackend {
  prepare(): Promise<BackendCapabilities>;
  prepareProgram(program: PolySineProgram): Promise<PreparedProgramHandle>;
  arm(scope: LaneScope, initialState: LaneState, lease: LeaseRenewal): Promise<RenderProof>;
  submit(packet: ControlPacket): "queued-locally" | "rejected-local-capacity" | "closed";
  close(): Promise<void>; // Fence/drain and await known output completion, or report fault.
}

/**
 * Implementation gates absent from this declaration:
 * - parser/range checks, fixed RT layouts, full-state merge and credit implementation;
 * - source -> host -> stream/DAC mapping with a bounded error and expiry;
 * - sample-accurate offset execution, 323 envelope/Q parity, persistent DSP state;
 * - stale/duplicate/session rejection, terminal token/epoch lifecycle, safety reserve;
 * - single audible owner and lease enforcement independent of the browser UI;
 * - off-RT retirement/recording, bounded telemetry and physical output validation.
 * Do not infer these properties merely because the types compile.
 */
