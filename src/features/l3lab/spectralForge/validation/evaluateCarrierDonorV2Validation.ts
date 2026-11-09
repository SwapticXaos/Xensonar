import type {
  AnchorBindingPreviewSummary,
  CarrierAnchorContinuitySummary,
  CarrierSpectralSkeletonSummary,
  DonorTimbreAnalysisSummary,
  DonorTimbreAtlasSummary,
} from '../types/carrierDonorV2Types';
import type {
  GestaltFieldSummary,
  MaterialAllocationSummary,
  MaterialFieldSummary,
} from '../types/gestaltMaterialField';
import type { TransferProfile } from '../types/transferProfile';
import type { CarrierDonorV2DonorUseMode } from '../types/carrierDonorV2RenderPolicy';
import type { CarrierFieldCoverageContract } from '../interpretation/carrierFieldCoverageContract';
import type { SpectralForgeV2RootFollowPlanSummary } from '../rootFollow/buildV2RootFollowEvent';

export type CarrierDonorV2LoopMetadata = {
  renderMode: 'carrier_donor_v2';
  bars: number;
  bpm: number;
  beatsPerBar: number;
  durationSec: number;
  donorUseMode: CarrierDonorV2DonorUseMode;
  rootFollowEligibility: {
    canSend: boolean;
    mode: 'synthetic' | 'granular_audio' | 'none';
    reason: string;
  };
  materialspurEligibility: {
    canSend: boolean;
    mode: 'synthetic_render' | 'raw_granular_render';
    reason: string;
  };
};

export type CarrierDonorV2AudioStats = {
  durationSec: number;
  peak: number;
  rms: number;
  meanAbs: number;
  zeroCrossingRate: number;
  envelopePeak: number;
};

export type CarrierDonorV2ValidationCheck = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  severity: 'info' | 'warn' | 'fail';
};

export type CarrierDonorV2ValidationReport = {
  createdAt: number;
  validationMode: 'carrier_donor_v2';
  sourceSignature: string;
  loopMetadata: CarrierDonorV2LoopMetadata;
  checks: CarrierDonorV2ValidationCheck[];
  metrics: {
    timeMasterPass: boolean;
    renderVsLoopDeltaSec: number;
    presenceActiveColumnRatio: number;
    skeletonActiveColumnRatio: number;
    bindingActiveColumnRatio: number;
    presenceToSkeletonLossRatio: number;
    skeletonToBindingLossRatio: number;
    earlyLatePresenceSkew: number;
    earlyLateSkeletonSkew: number;
    earlyLateBindingSkew: number;
    anchorCount: number;
    donorAtlasCellCount: number;
    bindingCount: number;
    materialAllocationCount: number;
    meanBindingConfidence: number;
    meanMaterialLeakRisk: number;
    renderRms: number;
    renderPeak: number;
    renderZeroCrossingRate: number;
    rootFollowLineCount: number;
    rootFollowTrackCount: number;
    rootFollowCoveredDurationBeats: number;
    rootFollowActiveDurationRatio: number;
    rootFollowMaxLineDurationBeats: number;
    rootFollowUsesGranularPlayback: boolean;
    rootFollowUsesSamplePresets: boolean;
  };
  rootFollowPlan: SpectralForgeV2RootFollowPlanSummary | null;
  v2: {
    carrierSummary: CarrierSpectralSkeletonSummary | null;
    continuitySummary: CarrierAnchorContinuitySummary | null;
    donorSummary: DonorTimbreAnalysisSummary | null;
    donorAtlasSummary: DonorTimbreAtlasSummary | null;
    gestaltFieldSummary: GestaltFieldSummary | null;
    materialFieldSummary: MaterialFieldSummary | null;
    bindingSummary: AnchorBindingPreviewSummary | null;
    materialAllocationSummary: MaterialAllocationSummary | null;
    transferProfile: TransferProfile;
    fieldCoverageContract: CarrierFieldCoverageContract;
  };
  conditions: {
    v2_combined: CarrierDonorV2AudioStats;
  };
  warnings: string[];
  summaryLine: string;
};

function safeNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function formatRatio(value: number) {
  return safeNumber(value).toFixed(2);
}

export function analyzeCarrierDonorV2AudioBuffer(buffer: AudioBuffer): CarrierDonorV2AudioStats {
  const channel = buffer.getChannelData(0);
  let peak = 0;
  let sumSquares = 0;
  let sumAbs = 0;
  let zeroCrossings = 0;
  let envelopePeak = 0;
  const envelopeWindow = Math.max(64, Math.floor(buffer.sampleRate * 0.018));
  let runningAbs = 0;

  for (let i = 0; i < channel.length; i += 1) {
    const sample = channel[i] ?? 0;
    const abs = Math.abs(sample);
    peak = Math.max(peak, abs);
    sumSquares += sample * sample;
    sumAbs += abs;
    runningAbs += abs;
    if (i >= envelopeWindow) runningAbs -= Math.abs(channel[i - envelopeWindow] ?? 0);
    envelopePeak = Math.max(envelopePeak, runningAbs / Math.min(envelopeWindow, i + 1));
    if (i > 0) {
      const prev = channel[i - 1] ?? 0;
      if ((prev < 0 && sample >= 0) || (prev > 0 && sample <= 0)) zeroCrossings += 1;
    }
  }

  const length = Math.max(1, channel.length);
  return {
    durationSec: buffer.length / Math.max(1, buffer.sampleRate),
    peak,
    rms: Math.sqrt(sumSquares / length),
    meanAbs: sumAbs / length,
    zeroCrossingRate: zeroCrossings / length,
    envelopePeak,
  };
}

export function buildCarrierDonorV2LoopMetadata(args: {
  bars: number;
  bpm: number;
  durationSec: number;
  donorUseMode: CarrierDonorV2DonorUseMode;
}): CarrierDonorV2LoopMetadata {
  const rootFollowSynthetic = args.donorUseMode === 'synthetic_pigment';
  return {
    renderMode: 'carrier_donor_v2',
    bars: args.bars,
    bpm: args.bpm,
    beatsPerBar: 4,
    durationSec: args.durationSec,
    donorUseMode: args.donorUseMode,
    rootFollowEligibility: {
      canSend: rootFollowSynthetic,
      mode: rootFollowSynthetic ? 'synthetic' : 'granular_audio',
      reason: rootFollowSynthetic
        ? 'Synthetisches Pigment kann später als modulierbarer V2-Plan an Root Follow angeschlossen werden.'
        : args.donorUseMode === 'timbre_projection'
          ? 'Donor-Projektion wird als fertiger Audiokörper exportiert; kein austauschbarer Syntheseplan.'
          : 'Rohtextur-Layer ist sample/granular geprägt und braucht einen getrennten Root-Follow-Audio-Modus.',
    },
    materialspurEligibility: {
      canSend: true,
      mode: args.donorUseMode !== 'raw_texture_overlay' ? 'synthetic_render' : 'raw_granular_render',
      reason: 'Taktzahl, BPM und Renderdauer sind im V2-Metadatenvertrag enthalten.',
    },
  };
}

export function buildCarrierDonorV2ValidationReport(args: {
  sourceSignature: string;
  loopMetadata: CarrierDonorV2LoopMetadata;
  audioStats: CarrierDonorV2AudioStats;
  carrierSummary: CarrierSpectralSkeletonSummary | null;
  continuitySummary: CarrierAnchorContinuitySummary | null;
  donorSummary: DonorTimbreAnalysisSummary | null;
  donorAtlasSummary: DonorTimbreAtlasSummary | null;
  gestaltFieldSummary: GestaltFieldSummary | null;
  materialFieldSummary: MaterialFieldSummary | null;
  bindingSummary: AnchorBindingPreviewSummary | null;
  materialAllocationSummary: MaterialAllocationSummary | null;
  transferProfile: TransferProfile;
  fieldCoverageContract: CarrierFieldCoverageContract;
  rootFollowPlan?: SpectralForgeV2RootFollowPlanSummary | null;
}): CarrierDonorV2ValidationReport {
  const durationDelta = Math.abs(args.audioStats.durationSec - args.loopMetadata.durationSec);
  const timeMasterPass = durationDelta <= 0.025;
  const bindingRatio = args.fieldCoverageContract.bindingActiveColumnRatio;
  const skeletonRatio = args.fieldCoverageContract.skeletonActiveColumnRatio;
  const presenceRatio = args.fieldCoverageContract.presenceActiveColumnRatio;
  const renderHasEnergy = args.audioStats.rms > 0.0005 && args.audioStats.peak > 0.01;
  const rootFollowPlan = args.rootFollowPlan ?? null;
  const rootFollowSyntheticPass = !!rootFollowPlan
    && rootFollowPlan.eligible
    && rootFollowPlan.sourceKind === 'synth'
    && rootFollowPlan.renderMode === 'direct'
    && !rootFollowPlan.usesAudioBuffer
    && !rootFollowPlan.usesGranularPlayback
    && !rootFollowPlan.usesSamplePresets
    && rootFollowPlan.lineCount > 0
    && (rootFollowPlan.activeDurationRatio >= 0.55 || rootFollowPlan.coveredDurationBeats >= Math.max(1, rootFollowPlan.totalBeats * 0.55));
  const warnings: string[] = [];

  if (!timeMasterPass) warnings.push(`V2-Zeitvertrag abweichend: Δ ${durationDelta.toFixed(3)}s.`);
  if (presenceRatio > 0.02 && skeletonRatio < presenceRatio * 0.45) warnings.push(`Skeleton deckt das Presence-Feld schwach ab: ${formatRatio(skeletonRatio)} von ${formatRatio(presenceRatio)}.`);
  if (skeletonRatio > 0.02 && bindingRatio < skeletonRatio * 0.5) warnings.push(`Binding verliert viele Skeleton-Zeitspalten: ${formatRatio(bindingRatio)} von ${formatRatio(skeletonRatio)}.`);
  if (!renderHasEnergy) warnings.push('V2-Render hat kaum messbare Energie.');
  if (args.loopMetadata.rootFollowEligibility.mode === 'synthetic' && !rootFollowSyntheticPass) warnings.push('V2-Root-Follow-Plan ist noch nicht taktlang und rein synthetisch vorbereitet.');

  const checks: CarrierDonorV2ValidationCheck[] = [
    {
      id: 'v2_time_master',
      label: 'V2 folgt Takt- und Tempo-Zeit',
      passed: timeMasterPass,
      detail: `Render ${args.audioStats.durationSec.toFixed(2)}s · Ziel ${args.loopMetadata.durationSec.toFixed(2)}s · Δ ${durationDelta.toFixed(3)}s.`,
      severity: timeMasterPass ? 'info' : 'fail',
    },
    {
      id: 'v2_presence_field',
      label: 'Gemalte Präsenz ist als Feld vorhanden',
      passed: presenceRatio > 0.002,
      detail: `Presence-Spalten ${formatRatio(presenceRatio)} · Feldzellen ${args.fieldCoverageContract.fieldCellCount}.`,
      severity: presenceRatio > 0.002 ? 'info' : 'fail',
    },
    {
      id: 'v2_skeleton_coverage',
      label: 'Carrier-Skelett liest das Feld ausreichend',
      passed: presenceRatio <= 0.002 || skeletonRatio >= presenceRatio * 0.45,
      detail: `Presence ${formatRatio(presenceRatio)} → Skeleton ${formatRatio(skeletonRatio)} · Verlust ${formatRatio(args.fieldCoverageContract.presenceToSkeletonLossRatio)}.`,
      severity: presenceRatio <= 0.002 || skeletonRatio >= presenceRatio * 0.45 ? 'info' : 'warn',
    },
    {
      id: 'v2_binding_coverage',
      label: 'Binding erreicht die gelesene Gestalt',
      passed: skeletonRatio <= 0.002 || bindingRatio >= skeletonRatio * 0.5,
      detail: `Skeleton ${formatRatio(skeletonRatio)} → Binding ${formatRatio(bindingRatio)} · Verlust ${formatRatio(args.fieldCoverageContract.skeletonToBindingLossRatio)}.`,
      severity: skeletonRatio <= 0.002 || bindingRatio >= skeletonRatio * 0.5 ? 'info' : 'warn',
    },
    {
      id: 'v2_render_energy',
      label: 'V2-Render erzeugt messbaren Klangkörper',
      passed: renderHasEnergy,
      detail: `RMS ${args.audioStats.rms.toFixed(4)} · Peak ${args.audioStats.peak.toFixed(3)} · ZCR ${args.audioStats.zeroCrossingRate.toFixed(3)}.`,
      severity: renderHasEnergy ? 'info' : 'fail',
    },
    {
      id: 'v2_material_metadata',
      label: 'Materialspur-Metadaten sind vollständig',
      passed: args.loopMetadata.materialspurEligibility.canSend && args.loopMetadata.bars > 0 && args.loopMetadata.bpm > 0,
      detail: `${args.loopMetadata.bars} Takte · ${args.loopMetadata.bpm} BPM · ${args.loopMetadata.durationSec.toFixed(2)}s · ${args.loopMetadata.materialspurEligibility.mode}.`,
      severity: 'info',
    },
    {
      id: 'v2_root_follow_synthetic_event',
      label: 'Root Follow bekommt einen synthetischen V2-Mehrlinien-Plan',
      passed: rootFollowSyntheticPass || args.loopMetadata.rootFollowEligibility.mode !== 'synthetic',
      detail: rootFollowPlan
        ? `${rootFollowPlan.mode} · Linien ${rootFollowPlan.lineCount} · Tracks ${rootFollowPlan.trackCount} · Abdeckung ${rootFollowPlan.coveredDurationBeats.toFixed(2)}/${rootFollowPlan.totalBeats.toFixed(2)} Beats (${formatRatio(rootFollowPlan.activeDurationRatio)}) · AudioBuffer ${rootFollowPlan.usesAudioBuffer ? 'ja' : 'nein'} · Granular ${rootFollowPlan.usesGranularPlayback ? 'ja' : 'nein'} · Samples ${rootFollowPlan.usesSamplePresets ? 'ja' : 'nein'}.`
        : 'Kein Root-Follow-Plan im V2-Report.',
      severity: rootFollowSyntheticPass || args.loopMetadata.rootFollowEligibility.mode !== 'synthetic' ? 'info' : 'warn',
    },
  ];

  const metrics = {
    timeMasterPass,
    renderVsLoopDeltaSec: durationDelta,
    presenceActiveColumnRatio: presenceRatio,
    skeletonActiveColumnRatio: skeletonRatio,
    bindingActiveColumnRatio: bindingRatio,
    presenceToSkeletonLossRatio: args.fieldCoverageContract.presenceToSkeletonLossRatio,
    skeletonToBindingLossRatio: args.fieldCoverageContract.skeletonToBindingLossRatio,
    earlyLatePresenceSkew: args.fieldCoverageContract.earlyLatePresenceSkew,
    earlyLateSkeletonSkew: args.fieldCoverageContract.earlyLateSkeletonSkew,
    earlyLateBindingSkew: args.fieldCoverageContract.earlyLateBindingSkew,
    anchorCount: args.carrierSummary?.anchorCount ?? 0,
    donorAtlasCellCount: args.donorAtlasSummary?.cellCount ?? 0,
    bindingCount: args.bindingSummary?.bindingCount ?? 0,
    materialAllocationCount: args.materialAllocationSummary?.allocationCount ?? 0,
    meanBindingConfidence: args.bindingSummary?.meanConfidence ?? 0,
    meanMaterialLeakRisk: args.materialAllocationSummary?.meanLeakRisk ?? 0,
    renderRms: args.audioStats.rms,
    renderPeak: args.audioStats.peak,
    renderZeroCrossingRate: args.audioStats.zeroCrossingRate,
    rootFollowLineCount: rootFollowPlan?.lineCount ?? 0,
    rootFollowTrackCount: rootFollowPlan?.trackCount ?? 0,
    rootFollowCoveredDurationBeats: rootFollowPlan?.coveredDurationBeats ?? 0,
    rootFollowActiveDurationRatio: rootFollowPlan?.activeDurationRatio ?? 0,
    rootFollowMaxLineDurationBeats: rootFollowPlan?.maxLineDurationBeats ?? 0,
    rootFollowUsesGranularPlayback: rootFollowPlan?.usesGranularPlayback ?? false,
    rootFollowUsesSamplePresets: rootFollowPlan?.usesSamplePresets ?? false,
  };

  const rootFollowSummary = rootFollowPlan
    ? rootFollowPlan.lineCount + ' Linien · ' + rootFollowPlan.coveredDurationBeats.toFixed(1) + '/' + rootFollowPlan.totalBeats.toFixed(1) + ' Beats'
    : '—';
  const summaryLine = `V2 · ${args.loopMetadata.bars} Takte @ ${Math.round(args.loopMetadata.bpm)} BPM · ${args.loopMetadata.durationSec.toFixed(2)}s · Presence ${formatRatio(presenceRatio)} → Skeleton ${formatRatio(skeletonRatio)} → Binding ${formatRatio(bindingRatio)} · RMS ${args.audioStats.rms.toFixed(3)} · ${args.loopMetadata.donorUseMode} · RootFollow ${rootFollowSummary}`;

  return {
    createdAt: Date.now(),
    validationMode: 'carrier_donor_v2',
    sourceSignature: args.sourceSignature,
    loopMetadata: args.loopMetadata,
    checks,
    metrics,
    rootFollowPlan,
    v2: {
      carrierSummary: args.carrierSummary,
      continuitySummary: args.continuitySummary,
      donorSummary: args.donorSummary,
      donorAtlasSummary: args.donorAtlasSummary,
      gestaltFieldSummary: args.gestaltFieldSummary,
      materialFieldSummary: args.materialFieldSummary,
      bindingSummary: args.bindingSummary,
      materialAllocationSummary: args.materialAllocationSummary,
      transferProfile: args.transferProfile,
      fieldCoverageContract: args.fieldCoverageContract,
    },
    conditions: {
      v2_combined: args.audioStats,
    },
    warnings,
    summaryLine,
  };
}
