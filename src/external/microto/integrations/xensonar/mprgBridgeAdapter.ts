import type { MovementEvent, MovementEventKind, PlatformerArrangementForm, PlatformerArrangementMode, PlatformerTuningMode } from '../../game/jumpRunSoundtrack/platformerArrangement';
import type { PlatformerSectionBias } from '../../game/jumpRunSoundtrack/platformerSectionBias';
import type { MicrotoMelodicLoopSeedExport, MicrotoMprgBridgeMetadata } from './types';

export type MprgXensonarHeadBridgeProtocolVersion = 'mprg-xensonar-head-bridge/v1';

export type MprgXensonarBridgeDirection =
  | 'mprg-to-xensonar-head'
  | 'xensonar-head-to-mprg';

export type MprgXensonarPayloadKind =
  | 'headless-runtime-snapshot'
  | 'material-seed-export'
  | 'resonance-wanderer-trail'
  | 'resonance-wanderer-topology'
  | 'trail-loop-body'
  | 'resonance-gate-decision'
  | 'whole-head-install-handshake'
  | 'whole-head-install-guide'
  | 'zip-autoinstall-request'
  | 'dynamic-quality-pulse'
  | 'audio-proof-report'
  | 'unknown';

export type MprgXensonarTruthClaim = {
  headlessTruth?: boolean;
  audioTruth?: boolean;
  uiTruth?: boolean;
  gameplayTruth?: boolean;
  dynamicCandidateOnly?: boolean;
};

export type MprgXensonarQualitySignal = {
  sourceModule: string;
  level: 'inorganic' | 'biological' | 'social' | 'intellectual' | 'dynamic';
  realityMode: 'actual' | 'simulated' | 'projected' | 'claimed' | 'unknown';
  kind: string;
  magnitude: number;
  concerns: string[];
  allowedAuthority: 'observe-only' | 'advisory' | 'may-modulate' | 'may-block';
  evidence: string;
};

export type MprgXensonarHeadEnvelope = {
  protocol?: MprgXensonarHeadBridgeProtocolVersion;
  direction: MprgXensonarBridgeDirection;
  sequence?: number;
  tick?: number;
  sourceModule?: string;
  payloadKind: MprgXensonarPayloadKind | string;
  payload: unknown;
  truthClaim?: MprgXensonarTruthClaim;
  qualitySignals?: MprgXensonarQualitySignal[];
  requestedAuthority?: string[];
  envelopeKey?: string;
};

export type MprgTrailLoopLanePoint = {
  tick?: number;
  beat?: number;
  phraseIndex?: number;
  degree?: number | null;
  lineHz?: number | null;
  resolvedLineHz?: number | null;
  projectedHz?: number | null;
  externalRootRatio?: number | null;
  direction?: string;
  energy?: number;
  velocity?: number;
  lane?: number;
  noteCount?: number;
  detail?: number;
};

export type MprgTrailLoopBodyLike = {
  version?: 1;
  bodyKind?: 'xensonaric-trail-loop-body' | string;
  sourceTopologyKey?: string;
  sourceTrailKey?: string;
  carrierRootLane?: MprgTrailLoopLanePoint[];
  impulseLane?: MprgTrailLoopLanePoint[];
  anchorLane?: MprgTrailLoopLanePoint[];
  thresholdLane?: MprgTrailLoopLanePoint[];
  loopBars?: number;
  beatsPerBar?: number;
  internalTuningId?: string;
  externalRootId?: string;
  antiWhoopPolicy?: Record<string, unknown>;
  nestedTuning?: {
    formula?: string;
    hostRasterDoesNotOverwriteInternalLines?: boolean;
    [key: string]: unknown;
  };
  loopBodyKey?: string;
  determinismKey?: string;
  [key: string]: unknown;
};

export type XensonarMprgBridgeFit = {
  verdict:
    | 'microto-is-seed-body-adapter'
    | 'microto-needs-whole-head-overlay'
    | 'mprg-direct-bridge-required';
  microtoStrengths: string[];
  microtoGaps: string[];
  xensonarSideRequirements: string[];
  recommendation: string;
};

export type MprgBridgeAdapterDiagnostics = {
  accepted: boolean;
  reason: string;
  sourceKind: 'envelope' | 'trail-loop-body' | 'unknown';
  adaptedEventCount: number;
  carrierPointCount: number;
  impulseCount: number;
  anchorCount: number;
  thresholdCount: number;
  antiWhoopProtected: boolean;
  nestedTuningProtected: boolean;
  truthBoundary: {
    headlessTruthAccepted: boolean;
    audioTruthClaimRejected: boolean;
    dynamicCandidateOnly: boolean;
  };
  warnings: string[];
};

export type MprgToMicrotoSeedAdapterResult = {
  seed: MicrotoMelodicLoopSeedExport | null;
  diagnostics: MprgBridgeAdapterDiagnostics;
};

export type AdaptMprgTrailLoopBodyOptions = {
  name?: string;
  defaultBars?: number;
  defaultRootHz?: number | null;
  arrangementMode?: PlatformerArrangementMode;
  formMode?: PlatformerArrangementForm;
  sectionBias?: PlatformerSectionBias;
  tuningMode?: PlatformerTuningMode;
  evolutionDepth?: number;
  sourceVersion?: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}

function stableKey(prefix: string, value: unknown): string {
  const text = `${prefix}:${stableStringify(value)}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${prefix}_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toArray(value: unknown): MprgTrailLoopLanePoint[] {
  return Array.isArray(value) ? value.filter(isRecord).map((entry) => ({ ...entry })) : [];
}

export function surveyMicrotoAsMprgAdapterSurface(): XensonarMprgBridgeFit {
  const microtoStrengths = [
    'Microto already carries Jump Run Jam / platformer movement into Xensonar as movementEvents + fallbackPhrase.',
    'Microto already has an offline loop render path and a cold Melodic Loop seed handoff.',
    'Microto already understands platformer motifs, section bias, arrangement form, tuning mode and rootHz.',
    'The existing Microto seed is therefore a good seed-body adapter, not an obstacle.',
  ];
  const microtoGaps = [
    'Microto seed does not yet carry whole-head bridge envelopes, truth claims or MoQ quality signals.',
    'Microto seed does not distinguish headless truth from audio truth.',
    'Microto movementEvents flatten mPRG lane semantics unless carrier/impulse/anchor/threshold lanes are translated deliberately.',
    'Microto cannot by itself be the full mPRG bridge because mPRG has module host / whole-head / quality-constitution surfaces beyond Jump Run Jam.',
  ];
  const xensonarSideRequirements = [
    'Keep Microto as the first ingest membrane for musical loop seeds.',
    'Add a Xensonar-side mPRG bridge overlay that can accept mPRG Whole-Head envelopes and TrailLoopBody packets.',
    'Translate TrailLoopBody lanes into Microto movementEvents only as a cold seed adapter; do not claim audio truth.',
    'Preserve anti-whoop and nested tuning contracts during conversion.',
  ];
  return {
    verdict: 'microto-needs-whole-head-overlay',
    microtoStrengths,
    microtoGaps,
    xensonarSideRequirements,
    recommendation: 'Use Microto as the seed-body adapter, but add a thin Xensonar-side mPRG Whole-Head overlay for truth boundaries, MoQ signals and lane-preserving TrailLoopBody conversion.',
  };
}

export function isMprgTrailLoopBodyLike(value: unknown): value is MprgTrailLoopBodyLike {
  if (!isRecord(value)) return false;
  if (value.bodyKind === 'xensonaric-trail-loop-body') return true;
  return Array.isArray(value.carrierRootLane) || Array.isArray(value.impulseLane) || Array.isArray(value.anchorLane) || Array.isArray(value.thresholdLane);
}

function extractTrailLoopBodyPayload(input: unknown): { body: MprgTrailLoopBodyLike | null; truthClaim?: MprgXensonarTruthClaim; sourceKind: MprgBridgeAdapterDiagnostics['sourceKind'] } {
  if (isMprgTrailLoopBodyLike(input)) return { body: input, sourceKind: 'trail-loop-body' };
  if (isRecord(input) && input.payloadKind === 'trail-loop-body' && isMprgTrailLoopBodyLike(input.payload)) {
    return { body: input.payload, truthClaim: input.truthClaim as MprgXensonarTruthClaim | undefined, sourceKind: 'envelope' };
  }
  if (isRecord(input) && isRecord(input.payload)) {
    const payload = input.payload as Record<string, unknown>;
    if (isMprgTrailLoopBodyLike(payload.trailLoopBody)) return { body: payload.trailLoopBody, truthClaim: input.truthClaim as MprgXensonarTruthClaim | undefined, sourceKind: 'envelope' };
    if (isMprgTrailLoopBodyLike(payload.loopBody)) return { body: payload.loopBody, truthClaim: input.truthClaim as MprgXensonarTruthClaim | undefined, sourceKind: 'envelope' };
  }
  return { body: null, sourceKind: 'unknown' };
}

function timeForPoint(point: MprgTrailLoopLanePoint, ordinal: number): number {
  if (Number.isFinite(point.beat)) return Number(point.beat);
  if (Number.isFinite(point.tick)) return Number(point.tick) / 24;
  if (Number.isFinite(point.phraseIndex)) return Number(point.phraseIndex);
  return ordinal;
}

function degreeForPoint(point: MprgTrailLoopLanePoint, fallback = 0): number {
  if (Number.isFinite(point.degree)) return Math.round(Number(point.degree));
  if (Number.isFinite(point.resolvedLineHz) && Number(point.resolvedLineHz) > 0) return Math.round(12 * Math.log2(Number(point.resolvedLineHz) / 110));
  if (Number.isFinite(point.lineHz) && Number(point.lineHz) > 0) return Math.round(12 * Math.log2(Number(point.lineHz) / 110));
  return fallback;
}

function laneForPoint(point: MprgTrailLoopLanePoint, fallback = 0): number {
  if (Number.isFinite(point.lane)) return clamp(Math.round(Number(point.lane)), 0, 7);
  if (point.direction === 'left') return 1;
  if (point.direction === 'right') return 5;
  if (point.direction === 'vertical') return 4;
  return fallback;
}

function energyForPoint(point: MprgTrailLoopLanePoint, fallback = 0.62): number {
  const raw = Number.isFinite(point.energy) ? Number(point.energy) : Number.isFinite(point.velocity) ? Number(point.velocity) : fallback;
  return clamp(raw, 0.05, 1);
}

function eventFromPoint(
  point: MprgTrailLoopLanePoint,
  kind: MovementEventKind,
  ordinal: number,
  fallbackSemi: number,
  airborne = false,
): MovementEvent {
  return {
    kind,
    semi: clamp(Math.round(degreeForPoint(point, fallbackSemi)), -24, 36),
    energy: energyForPoint(point),
    t: timeForPoint(point, ordinal),
    lane: laneForPoint(point, ordinal % 6),
    airborne,
    ordinal,
    detail: Number.isFinite(point.detail) ? Number(point.detail) : undefined,
  };
}

function rootHzForBody(body: MprgTrailLoopBodyLike, fallback: number | null | undefined): number | null {
  const candidates = [
    body.impulseLane?.find((point) => Number.isFinite(point.projectedHz))?.projectedHz,
    body.impulseLane?.find((point) => Number.isFinite(point.resolvedLineHz))?.resolvedLineHz,
    body.carrierRootLane?.find((point) => Number.isFinite(point.projectedHz))?.projectedHz,
    body.carrierRootLane?.find((point) => Number.isFinite(point.lineHz))?.lineHz,
  ];
  const numeric = candidates.find((value) => Number.isFinite(value) && Number(value) > 0);
  return numeric != null ? clamp(Number(numeric), 40, 880) : fallback ?? null;
}

function tuningModeForBody(body: MprgTrailLoopBodyLike, fallback: PlatformerTuningMode): PlatformerTuningMode {
  const text = `${body.internalTuningId ?? ''} ${body.nestedTuning?.formula ?? ''}`.toLowerCase();
  if (text.includes('22')) return '22edo';
  if (text.includes('19')) return '19edo';
  if (text.includes('pure') || text.includes('ji')) return 'ji';
  // Microto does not currently expose 17edo as a native PlatformerTuningMode.
  // The Xensonar/mPRG overlay below preserves the original internal tuning id
  // so this fallback is a safe adapter approximation, not a truth claim.
  return fallback;
}

function diagnosticsForFailure(reason: string): MprgBridgeAdapterDiagnostics {
  return {
    accepted: false,
    reason,
    sourceKind: 'unknown',
    adaptedEventCount: 0,
    carrierPointCount: 0,
    impulseCount: 0,
    anchorCount: 0,
    thresholdCount: 0,
    antiWhoopProtected: false,
    nestedTuningProtected: false,
    truthBoundary: {
      headlessTruthAccepted: false,
      audioTruthClaimRejected: false,
      dynamicCandidateOnly: false,
    },
    warnings: [reason],
  };
}

export function adaptMprgBridgePayloadToMicrotoMelodicLoopSeed(
  input: unknown,
  options: AdaptMprgTrailLoopBodyOptions = {},
): MprgToMicrotoSeedAdapterResult {
  const { body, truthClaim, sourceKind } = extractTrailLoopBodyPayload(input);
  if (!body) return { seed: null, diagnostics: diagnosticsForFailure('no-trail-loop-body-found') };

  const carrierRootLane = toArray(body.carrierRootLane);
  const impulseLane = toArray(body.impulseLane);
  const anchorLane = toArray(body.anchorLane);
  const thresholdLane = toArray(body.thresholdLane);
  const warnings: string[] = [];
  const antiWhoopProtected = Boolean(
    body.antiWhoopPolicy?.rootMotionIsControlLaneNotAttackGlide === true
    && body.antiWhoopPolicy?.impulseStartsAtResolvedLineHz === true,
  );
  const nestedTuningProtected = Boolean(
    body.nestedTuning?.formula === 'outHz = lineHz * externalRootRatio'
    && body.nestedTuning?.hostRasterDoesNotOverwriteInternalLines === true,
  );
  if (!antiWhoopProtected) warnings.push('anti-whoop-contract-missing-or-weak');
  if (!nestedTuningProtected) warnings.push('nested-tuning-contract-missing-or-weak');
  if (truthClaim?.audioTruth) warnings.push('audio-truth-claim-ignored-by-xensonar-seed-adapter');

  const events: MovementEvent[] = [];
  let ordinal = 0;
  for (const point of carrierRootLane) events.push(eventFromPoint(point, 'motion', ordinal++, 0, false));
  for (const point of impulseLane) events.push(eventFromPoint(point, 'jump', ordinal++, 7, true));
  for (const point of anchorLane) events.push(eventFromPoint(point, 'checkpoint', ordinal++, 0, false));
  for (const point of thresholdLane) events.push(eventFromPoint(point, 'phase_gate', ordinal++, 11, false));
  events.sort((a, b) => (a.t - b.t) || ((a.ordinal ?? 0) - (b.ordinal ?? 0)));
  events.forEach((event, index) => { event.ordinal = index; });

  const fallbackPhraseSource = impulseLane.length > 0 ? impulseLane : carrierRootLane.length > 0 ? carrierRootLane : [...anchorLane, ...thresholdLane];
  const fallbackPhrase = fallbackPhraseSource
    .map((point, index) => clamp(degreeForPoint(point, index === 0 ? 0 : 7), -24, 36))
    .slice(0, 16);
  const mprgBridge: MicrotoMprgBridgeMetadata = {
    protocol: 'mprg-xensonar-head-bridge/v1',
    sourceKind,
    loopBodyKey: body.loopBodyKey ?? null,
    determinismKey: body.determinismKey ?? null,
    internalTuningId: body.internalTuningId ?? null,
    externalRootId: body.externalRootId ?? null,
    antiWhoopProtected,
    nestedTuningProtected,
    truthBoundary: {
      headlessTruthAccepted: Boolean(truthClaim?.headlessTruth),
      audioTruthClaimRejected: Boolean(truthClaim?.audioTruth),
      dynamicCandidateOnly: Boolean(truthClaim?.dynamicCandidateOnly),
    },
  };

  const seed: MicrotoMelodicLoopSeedExport = {
    name: options.name ?? `mPRG Resonanzwanderer ${body.loopBodyKey?.slice(0, 8) ?? stableKey('body', body).slice(-8)}`,
    bars: Math.max(1, Math.min(16, Math.round(body.loopBars ?? options.defaultBars ?? 4))),
    rootHz: rootHzForBody(body, options.defaultRootHz),
    movementEvents: events,
    fallbackPhrase: fallbackPhrase.length > 0 ? fallbackPhrase : [0, 3, 7, 10],
    arrangementMode: options.arrangementMode ?? 'balanced',
    formMode: options.formMode ?? 'auto',
    sectionBias: options.sectionBias ?? 'auto',
    tuningMode: tuningModeForBody(body, options.tuningMode ?? '12edo'),
    evolutionDepth: clamp(options.evolutionDepth ?? 0.62, 0, 1),
    sourceDevice: 'Resonanzwanderer',
    sourceVersion: options.sourceVersion ?? `mprg-head-bridge:${body.loopBodyKey ?? body.determinismKey ?? 'unkeyed'}`,
    mprgBridge,
    notes: [
      'mPRG TrailLoopBody → Microto seed adapter',
      `carrier=${carrierRootLane.length}`,
      `impulse=${impulseLane.length}`,
      `anchor=${anchorLane.length}`,
      `threshold=${thresholdLane.length}`,
      antiWhoopProtected ? 'anti-whoop=protected' : 'anti-whoop=weak',
      nestedTuningProtected ? 'nested-tuning=protected' : 'nested-tuning=weak',
    ].join(' · '),
  };

  return {
    seed,
    diagnostics: {
      accepted: true,
      reason: 'trail-loop-body-adapted-to-microto-melodic-loop-seed',
      sourceKind,
      adaptedEventCount: events.length,
      carrierPointCount: carrierRootLane.length,
      impulseCount: impulseLane.length,
      anchorCount: anchorLane.length,
      thresholdCount: thresholdLane.length,
      antiWhoopProtected,
      nestedTuningProtected,
      truthBoundary: {
        headlessTruthAccepted: mprgBridge.truthBoundary.headlessTruthAccepted,
        audioTruthClaimRejected: mprgBridge.truthBoundary.audioTruthClaimRejected,
        dynamicCandidateOnly: mprgBridge.truthBoundary.dynamicCandidateOnly,
      },
      warnings,
    },
  };
}

export function summarizeMprgBridgeAdapterResult(result: MprgToMicrotoSeedAdapterResult): string {
  if (!result.seed) return `mPRG→Xensonar adapter rejected · ${result.diagnostics.reason}`;
  return [
    'mPRG→Xensonar adapter accepted',
    `events=${result.diagnostics.adaptedEventCount}`,
    `carrier=${result.diagnostics.carrierPointCount}`,
    `impulse=${result.diagnostics.impulseCount}`,
    `anchor=${result.diagnostics.anchorCount}`,
    `threshold=${result.diagnostics.thresholdCount}`,
    `antiWhoop=${result.diagnostics.antiWhoopProtected ? 'ok' : 'weak'}`,
    `nested=${result.diagnostics.nestedTuningProtected ? 'ok' : 'weak'}`,
    `warnings=${result.diagnostics.warnings.length === 0 ? 'none' : result.diagnostics.warnings.join('|')}`,
  ].join(' · ');
}
