import type { AudioSourceAsset } from '../audio/AudioImporterTypes';
import { DEFAULT_CARRIER_DONOR_V2_DONOR_USE_MODE } from '../types/carrierDonorV2RenderPolicy';
import { DEFAULT_TRANSFER_MACRO_AXES } from '../types/transferProfile';
import { deriveTransferProfile } from '../transfer/deriveTransferProfile';
import type { CarrierDonorV2FreshnessState, CarrierDonorV2State, V2Fingerprint, V2StageMeta } from './storeCarrierDonorV2Types';

function createInitialV2StageMeta(reason = ''): V2StageMeta {
  return {
    status: 'missing',
    fingerprint: null,
    reason,
    lastError: null,
  };
}

export function createInitialCarrierDonorV2Freshness(): CarrierDonorV2FreshnessState {
  return {
    carrierInput: null,
    donorInput: null,
    skeletonMeta: createInitialV2StageMeta('Noch kein Carrier-Skelett vorhanden.'),
    continuityMeta: createInitialV2StageMeta('Noch keine Kontinuitätsanalyse vorhanden.'),
    donorAnalysisMeta: createInitialV2StageMeta('Noch keine Donor-Analyse vorhanden.'),
    donorAtlasMeta: createInitialV2StageMeta('Noch kein Donor-Atlas vorhanden.'),
    bindingMeta: createInitialV2StageMeta('Noch keine Binding-Vorschau vorhanden.'),
    gestaltFieldMeta: createInitialV2StageMeta('Noch kein Gestaltfeld vorhanden.'),
    materialFieldMeta: createInitialV2StageMeta('Noch kein Materialfeld vorhanden.'),
    materialAllocationMeta: createInitialV2StageMeta('Noch keine Materialallokation vorhanden.'),
    renderEligibility: {
      canPreviewV2: false,
      reason: 'v2-Vorschau noch nicht bereit.',
    },
  };
}

export function buildCarrierInputFingerprint(renderVersion: number, bars: number): V2Fingerprint {
  return {
    key: `carrier:${renderVersion}:${bars}`,
    updatedAt: Date.now(),
  };
}

export function buildDonorInputFingerprint(asset: AudioSourceAsset | null): V2Fingerprint | null {
  if (!asset) return null;
  const analysisPart = asset.analysisCache
    ? `${asset.analysisCache.width}:${asset.analysisCache.height}:${asset.sampleRate}:${asset.importDurationSec}`
    : 'raw';
  return {
    key: `donor:${asset.fileName}:${analysisPart}`,
    updatedAt: Date.now(),
  };
}

function describeNonReadyStage(meta: V2StageMeta, fallback: string): string {
  if (meta.status === 'building') return 'v2-Ableitungen werden gerade aktualisiert.';
  if (meta.status === 'dirty') return 'v2-Ableitungen werden automatisch aktualisiert.';
  if (meta.status === 'error') return meta.lastError || meta.reason || 'v2-Ableitung ist fehlgeschlagen.';
  return meta.reason || fallback;
}

export function deriveCarrierDonorV2Eligibility(v2: CarrierDonorV2State): { canPreviewV2: boolean; reason: string } {
  const f = v2.freshness;
  const needsRawTextureOverlay = v2.donorUseMode === 'raw_texture_overlay';

  const hasError = [
    f.skeletonMeta,
    f.continuityMeta,
    f.gestaltFieldMeta,
    f.donorAnalysisMeta,
    f.donorAtlasMeta,
    needsRawTextureOverlay ? f.materialFieldMeta : null,
    needsRawTextureOverlay ? f.materialAllocationMeta : null,
    f.bindingMeta,
  ].find((meta) => meta?.status === 'error') ?? null;

  if (hasError) {
    return {
      canPreviewV2: false,
      reason: hasError.lastError || hasError.reason || 'v2-Ableitung ist fehlgeschlagen.',
    };
  }

  if (v2.busy !== 'none') {
    return { canPreviewV2: false, reason: 'v2-Ableitungen werden gerade aktualisiert.' };
  }

  if (f.continuityMeta.status === 'dirty' || f.continuityMeta.status === 'building') {
    return { canPreviewV2: false, reason: describeNonReadyStage(f.continuityMeta, 'Kontinuitätsanalyse wird aktualisiert.') };
  }

  const requiredStages: Array<{ meta: V2StageMeta; fallback: string }> = [
    { meta: f.skeletonMeta, fallback: 'Carrier-Lesung fehlt noch.' },
    { meta: f.gestaltFieldMeta, fallback: 'Carrier-Lesung fehlt noch.' },
    { meta: f.donorAnalysisMeta, fallback: 'Donor-Atlas fehlt noch.' },
    { meta: f.donorAtlasMeta, fallback: 'Donor-Atlas fehlt noch.' },
    { meta: f.bindingMeta, fallback: 'Synthetische Zuordnung fehlt noch.' },
  ];

  if (needsRawTextureOverlay) {
    requiredStages.push(
      { meta: f.materialFieldMeta, fallback: 'Rohtextur-Layer braucht zusätzlich das Donor-Materialfeld.' },
      { meta: f.materialAllocationMeta, fallback: 'Rohtextur-Layer braucht zusätzlich Materialallokation.' }
    );
  }

  const nonReady = requiredStages.find(({ meta }) => meta.status !== 'ready');
  if (nonReady) {
    return { canPreviewV2: false, reason: describeNonReadyStage(nonReady.meta, nonReady.fallback) };
  }

  return {
    canPreviewV2: true,
    reason: needsRawTextureOverlay
      ? 'v2-Vorschau bereit · Rohtextur-Layer ist explizit aktiv.'
      : v2.donorUseMode === 'timbre_projection'
        ? 'Donor-Projektion bereit.'
        : 'v2-Vorschau bereit · synthetisches Pigment ohne Rohtextur-Layer.',
  };
}

export function createInitialCarrierDonorV2State(): CarrierDonorV2State {
  return {
    skeleton: null,
    summary: null,
    continuityGraph: null,
    continuitySummary: null,
    donorAnchors: [],
    donorTensor: null,
    donorSummary: null,
    donorAtlas: null,
    donorAtlasSummary: null,
    gestaltField: null,
    gestaltFieldSummary: null,
    materialField: null,
    materialFieldSummary: null,
    materialAllocationPreview: null,
    materialAllocationSummary: null,
    bindingPreview: [],
    bindingSummary: null,
    overlayVisible: false,
    continuityOverlayVisible: false,
    bindingOverlayVisible: false,
    busy: 'none',
    transferPresetId: 'carrier_strict',
    transferMacroAxes: { ...DEFAULT_TRANSFER_MACRO_AXES },
    transferProfile: deriveTransferProfile({ presetId: 'carrier_strict', macro: DEFAULT_TRANSFER_MACRO_AXES }),
    donorUseMode: DEFAULT_CARRIER_DONOR_V2_DONOR_USE_MODE,
    freshness: createInitialCarrierDonorV2Freshness(),
  };
}
