import type { MaterialEntry } from '../materialLibrary';
import { CARRIER_INTEGRAL_PINK_VARIANTS, normalizeCarrierIntegralPinkVariant, type CarrierIntegralPinkExportDetail } from './carrierIntegralPinkLaneBridge';
import type { CarrierIntegralPinkVariant } from './loopDrumDomain';
import { CARRIER_INTEGRAL_PENDING_PINK_MELODIC_SESSION_KEY } from '../contracts/carrierIntegralMelodicHandoffContract';

export const OPEN_MATERIAL_IMPORT_DIALOG_EVENT = 'xensonar:open-material-import';
export const REQUEST_MATERIAL_IMPORT_DIALOG_EVENT = 'xensonar:request-material-import';

export type MaterialImportLane = 'audio-paint' | 'raw-audio';

export type MaterialImportEntrySummary = {
  id: string;
  name: string;
  bars: number;
  bpm: number;
  renderMode: string;
  role: MaterialEntry['role'];
  lane: MaterialImportLane;
  laneLabel: string;
  transferReady: boolean;
  rawAudioReady: boolean;
  structuredCarrierModesReady: boolean;
  structuredCarrierModesReason?: string;
  disabledReason?: string;
  audioPaintDetail?: CarrierIntegralPinkExportDetail | null;
  audioPaintRepairDetail?: CarrierIntegralPinkExportDetail | null;
  audioPaintValidation?: CarrierIntegralAudioPaintValidation;
  canRebuildAudioPaint?: boolean;
  canEditAudioPaint?: boolean;
};

export type CarrierMelodicImportModeAvailability = {
  mode: CarrierIntegralPinkVariant;
  kind: 'structured-carrier' | 'raw-audio';
  ready: boolean;
  reason?: string;
};

export const CARRIER_MELODIC_IMPORT_MODES: ReadonlyArray<CarrierIntegralPinkVariant> = ['last-hearing', 'grained', 'scattered', 'monotone'];
export const CARRIER_MELODIC_RAW_AUDIO_MODE: CarrierIntegralPinkVariant = 'grained';
export const CARRIER_MELODIC_STRUCTURED_MODES: ReadonlyArray<CarrierIntegralPinkVariant> = CARRIER_MELODIC_IMPORT_MODES.filter((mode) => mode !== CARRIER_MELODIC_RAW_AUDIO_MODE);

export function isCarrierMelodicRawAudioMode(mode: CarrierIntegralPinkVariant): boolean {
  return mode === CARRIER_MELODIC_RAW_AUDIO_MODE;
}

export function materialImportEntryUsesCarrierModeMenu(entry: MaterialImportEntrySummary | null | undefined): boolean {
  return Boolean(entry?.audioPaintDetail || entry?.audioPaintRepairDetail);
}

export function resolveCarrierMelodicImportModeAvailability(
  entry: MaterialImportEntrySummary | null | undefined,
  mode: CarrierIntegralPinkVariant,
): CarrierMelodicImportModeAvailability {
  if (isCarrierMelodicRawAudioMode(mode)) {
    const ready = Boolean(entry?.rawAudioReady);
    return {
      mode,
      kind: 'raw-audio',
      ready,
      reason: ready ? undefined : 'Raw Audio ist für diesen Eintrag nicht verfügbar, weil kein gerenderter Audiokörper bereitliegt.',
    };
  }
  const ready = Boolean(entry?.structuredCarrierModesReady && entry?.audioPaintDetail);
  return {
    mode,
    kind: 'structured-carrier',
    ready,
    reason: ready ? undefined : entry?.structuredCarrierModesReason ?? 'Fretless-Feld, zerstreut und monoton brauchen einen gültigen Carrier-Feldvertrag mit Pattern-Stimmen.',
  };
}

export function resolveCarrierMelodicImportModeAvailabilityMap(
  entry: MaterialImportEntrySummary | null | undefined,
): Record<CarrierIntegralPinkVariant, CarrierMelodicImportModeAvailability> {
  return Object.fromEntries(CARRIER_MELODIC_IMPORT_MODES.map((mode) => [mode, resolveCarrierMelodicImportModeAvailability(entry, mode)])) as Record<CarrierIntegralPinkVariant, CarrierMelodicImportModeAvailability>;
}

const AUDIO_PAINT_REGISTRY_KEY = 'xensonar:carrier-integral-audio-paint-registry-v1';
const LEGACY_PENDING_KEY = CARRIER_INTEGRAL_PENDING_PINK_MELODIC_SESSION_KEY;

type CarrierIntegralPinkExportRegistry = Record<string, CarrierIntegralPinkExportDetail>;

export type CarrierIntegralAudioPaintValidation = {
  ok: boolean;
  reason?: string;
  normalized?: CarrierIntegralPinkExportDetail;
};


export function serializeCarrierIntegralAudioPaintImportDetail(detail: CarrierIntegralPinkExportDetail): string {
  return JSON.stringify(detail);
}

function normalizeCarrierIntegralAudioPaintDetail(value: unknown): CarrierIntegralPinkExportDetail | null {
  if (!value || typeof value !== 'object') return null;
  const detail = value as CarrierIntegralPinkExportDetail;
  if (!detail.entryId) return null;
  return detail;
}

export function validateCarrierIntegralAudioPaintImportDetail(detail: CarrierIntegralPinkExportDetail | null | undefined): CarrierIntegralAudioPaintValidation {
  if (!detail) {
    return { ok: false, reason: 'Audio-Paint-Vertrag fehlt. Aus Gestalt-Projekte neu senden.' };
  }
  if (!detail.entryId) {
    return { ok: false, reason: 'Audio-Paint-Vertrag ohne Material-ID.' };
  }
  if (!detail.config) {
    return { ok: false, reason: 'Audio-Paint-Vertrag ohne Labor-Konfiguration.' };
  }
  const pattern = detail.config.synthPattern ?? null;
  if (!pattern || !Array.isArray(pattern.notes)) {
    return { ok: false, reason: 'Audio-Paint-Vertrag ohne synthetischen Pattern-Plan.' };
  }
  const usableNotes = pattern.notes.filter((note) => Number.isFinite(note?.durationBeats ?? NaN) && Number(note.durationBeats) > 0);
  if (!usableNotes.length) {
    return { ok: false, reason: 'Audio-Paint-Pattern enthält keine klingenden Stimmen.' };
  }
  const bars = Number(detail.bars ?? pattern.bars ?? 1);
  if (!Number.isFinite(bars) || bars <= 0) {
    return { ok: false, reason: 'Audio-Paint-Vertrag hat keine gültige Taktlänge.' };
  }
  const bpm = Number(detail.bpm ?? 0);
  if (detail.bpm !== undefined && (!Number.isFinite(bpm) || bpm <= 0)) {
    return { ok: false, reason: 'Audio-Paint-Vertrag hat kein gültiges Tempo.' };
  }
  const rootHz = detail.rootHz;
  if (rootHz !== null && rootHz !== undefined && (!Number.isFinite(Number(rootHz)) || Number(rootHz) <= 0)) {
    return { ok: false, reason: 'Audio-Paint-Vertrag hat keinen gültigen Pitch-Anker.' };
  }
  const projectionMode = normalizeCarrierIntegralPinkVariant(detail.projectionMode);
  const variant = CARRIER_INTEGRAL_PINK_VARIANTS.find((entry) => entry.id === projectionMode);
  if (!variant?.enabled) {
    return { ok: false, reason: variant ? `${variant.label} ist vorbereitet, aber noch nicht gerendert.` : 'Audio-Paint-Variante ist nicht verfügbar.' };
  }
  return {
    ok: true,
    normalized: {
      ...detail,
      bars: Math.max(1, Math.round(bars)),
      bpm: Number.isFinite(bpm) && bpm > 0 ? bpm : detail.bpm,
      projectionMode,
    },
  };
}


export function isCarrierIntegralMelodicPinkDetailReady(detail: CarrierIntegralPinkExportDetail | null | undefined): boolean {
  return validateCarrierIntegralAudioPaintImportDetail(detail).ok;
}

export function readCarrierIntegralAudioPaintImportDetailFromEntry(entry: MaterialEntry | null | undefined): CarrierIntegralPinkExportDetail | null {
  if (!entry?.audioPaintImportDetailJson) return null;
  try {
    const parsed = JSON.parse(entry.audioPaintImportDetailJson) as unknown;
    const detail = normalizeCarrierIntegralAudioPaintDetail(parsed);
    if (!detail) return null;
    return { ...detail, entryId: entry.id, materialName: detail.materialName || entry.name };
  } catch {
    return null;
  }
}

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function readCarrierIntegralAudioPaintRegistry(): CarrierIntegralPinkExportRegistry {
  if (!canUseSessionStorage()) return {};
  try {
    const raw = window.sessionStorage.getItem(AUDIO_PAINT_REGISTRY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? parsed as CarrierIntegralPinkExportRegistry : {};
  } catch {
    return {};
  }
}

function writeCarrierIntegralAudioPaintRegistry(registry: CarrierIntegralPinkExportRegistry) {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.setItem(AUDIO_PAINT_REGISTRY_KEY, JSON.stringify(registry));
  } catch {}
}

export function storeCarrierIntegralAudioPaintImportDetail(detail: CarrierIntegralPinkExportDetail) {
  if (!detail?.entryId) return;
  const registry = readCarrierIntegralAudioPaintRegistry();
  registry[detail.entryId] = detail;
  writeCarrierIntegralAudioPaintRegistry(registry);
  if (canUseSessionStorage()) {
    try {
      window.sessionStorage.setItem(LEGACY_PENDING_KEY, JSON.stringify(detail));
    } catch {}
  }
}

export function readCarrierIntegralAudioPaintImportDetail(entryId: string): CarrierIntegralPinkExportDetail | null {
  const registry = readCarrierIntegralAudioPaintRegistry();
  const direct = normalizeCarrierIntegralAudioPaintDetail(registry[entryId]);
  if (direct?.entryId) return direct;
  if (canUseSessionStorage()) {
    try {
      const raw = window.sessionStorage.getItem(LEGACY_PENDING_KEY);
      if (raw) {
        const parsed = normalizeCarrierIntegralAudioPaintDetail(JSON.parse(raw) as unknown);
        if (parsed?.entryId === entryId) return parsed;
      }
    } catch {}
  }
  return null;
}

type MaterialEntrySignals = {
  renderMode: string;
  workspaceOrigin: string;
  sourceVersion: string;
  routeSummary: string;
};

const lowerText = (value: unknown): string => String(value || '').toLowerCase();
const includesAny = (value: string, needles: ReadonlyArray<string>): boolean => needles.some((needle) => value.includes(needle));
const readMaterialEntrySignals = (entry: MaterialEntry): MaterialEntrySignals => ({
  renderMode: lowerText(entry.renderMode),
  workspaceOrigin: lowerText(entry.workspaceOrigin),
  sourceVersion: lowerText(entry.sourceVersion),
  routeSummary: lowerText(entry.routeSummary),
});

export function isCarrierIntegralRenderedMaterialEntry(entry: MaterialEntry | null | undefined): boolean {
  if (!entry) return false;
  const signal = readMaterialEntrySignals(entry);
  return signal.workspaceOrigin.includes('spectralforge-carrier-integral-rendered-material')
    || signal.renderMode.startsWith('carrier-integral-rendered-material')
    || signal.sourceVersion.includes('spectralforge-carrier-integral-rendered-material');
}

export function isCarrierIntegralGranularMaterialEntry(entry: MaterialEntry | null | undefined): boolean {
  if (!entry) return false;
  const signal = readMaterialEntrySignals(entry);
  return signal.workspaceOrigin.includes('spectralforge-carrier-integral-granular-material')
    || signal.renderMode.startsWith('carrier-integral-granular-material')
    || signal.sourceVersion.includes('spectralforge-carrier-integral-granular-material')
    || signal.routeSummary.includes('granularer carrier-materialkörper');
}

export function isCarrierIntegralAudioPaintEntry(entry: MaterialEntry | null | undefined): boolean {
  if (!entry) return false;
  if (isCarrierIntegralRenderedMaterialEntry(entry) || isCarrierIntegralGranularMaterialEntry(entry)) return false;
  const signal = readMaterialEntrySignals(entry);
  return signal.workspaceOrigin.includes('spectralforge-carrier-integral')
    || signal.renderMode.startsWith('carrier-integral-')
    || includesAny(signal.routeSummary, ['carrier-integral', 'carrier integral']);
}

export function isRawCarrierMaterialEntry(entry: MaterialEntry | null | undefined): boolean {
  if (!entry) return false;
  const signal = readMaterialEntrySignals(entry);
  return signal.workspaceOrigin.includes('spectralforge-raw-oscillator-material')
    || signal.renderMode.startsWith('spectralforge-raw-oscillator-material')
    || includesAny(signal.sourceVersion, ['spectralforge-raw-oscillator', 'spectralforge-raw-carrier-material'])
    || includesAny(signal.routeSummary, ['pure dieter', 'roh-oszillator']);
}

export function isRawAudioLoopMaterialEntry(entry: MaterialEntry | null | undefined): entry is MaterialEntry {
  if (!entry) return false;
  if (isCarrierIntegralAudioPaintEntry(entry)) return false;
  if (!(entry.blob instanceof Blob)) return false;
  if (typeof entry.blob.size === 'number' && entry.blob.size <= 0) return false;
  return ['loop', 'waveMaterial', 'particleExciter', 'droneTexture'].includes(entry.role);
}

export function classifyMaterialImportLane(entry: MaterialEntry): MaterialImportLane {
  return isCarrierIntegralAudioPaintEntry(entry) ? 'audio-paint' : 'raw-audio';
}

export function isMelodicLoopImportableMaterialEntry(entry: MaterialEntry | null | undefined): entry is MaterialEntry {
  if (!entry) return false;
  return isCarrierIntegralAudioPaintEntry(entry) || isRawAudioLoopMaterialEntry(entry);
}

export function toMaterialImportEntrySummary(entry: MaterialEntry, bpm: number): MaterialImportEntrySummary {
  const lane = classifyMaterialImportLane(entry);
  const carrierRawMaterial = isRawCarrierMaterialEntry(entry) || isCarrierIntegralGranularMaterialEntry(entry);
  const carrierModeCandidate = lane === 'audio-paint' || carrierRawMaterial;
  const audioPaintRepairDetail = carrierModeCandidate
    ? readCarrierIntegralAudioPaintImportDetailFromEntry(entry) ?? readCarrierIntegralAudioPaintImportDetail(entry.id)
    : null;
  const audioPaintValidation = carrierModeCandidate
    ? validateCarrierIntegralAudioPaintImportDetail(audioPaintRepairDetail)
    : undefined;
  const audioPaintDetail = audioPaintValidation?.ok ? audioPaintValidation.normalized ?? audioPaintRepairDetail : null;
  const canRebuildAudioPaint = carrierModeCandidate
    ? Boolean(audioPaintRepairDetail?.carrierProjectId && audioPaintRepairDetail?.machineId)
    : false;
  const canEditAudioPaint = carrierModeCandidate
    ? Boolean(audioPaintRepairDetail?.carrierProjectId || audioPaintRepairDetail?.materialName || entry.name)
    : false;
  const rawBlobReady = entry.blob instanceof Blob && (typeof entry.blob.size !== 'number' || entry.blob.size > 0);
  const structuredCarrierModesReady = Boolean(audioPaintValidation?.ok);
  const transferReady = rawBlobReady || structuredCarrierModesReady;
  const audioPaintBpm = audioPaintValidation?.normalized?.bpm ?? audioPaintRepairDetail?.bpm;
  return {
    id: entry.id,
    name: entry.name,
    bars: Math.max(1, Math.round(audioPaintValidation?.normalized?.bars ?? audioPaintRepairDetail?.bars ?? entry.bars ?? 1)),
    bpm: lane === 'audio-paint' && Number.isFinite(Number(audioPaintBpm)) && Number(audioPaintBpm) > 0 ? Number(audioPaintBpm) : bpm,
    renderMode: entry.renderMode,
    role: entry.role,
    lane,
    laneLabel: lane === 'audio-paint' ? 'Carrier-Feld / Hörfeld (Spectral Forge)' : isRawCarrierMaterialEntry(entry) ? 'Raw Audio (Pure Dieter)' : isCarrierIntegralGranularMaterialEntry(entry) ? 'Raw Audio (Carrier-Körper)' : 'Raw Audio Loops (Materialspur)',
    transferReady,
    rawAudioReady: rawBlobReady,
    structuredCarrierModesReady,
    structuredCarrierModesReason: audioPaintValidation?.reason,
    audioPaintDetail,
    audioPaintRepairDetail,
    audioPaintValidation,
    canRebuildAudioPaint,
    canEditAudioPaint,
    disabledReason: transferReady
      ? undefined
      : lane === 'audio-paint'
        ? audioPaintValidation?.reason ?? 'Labor-Hörweise ist nicht importierbar; aus Gestalt-Projekte neu senden.'
        : 'Kein Raw-Audio-Blob für den Materialspur-Import vorhanden.',
  };
}
export function requestMaterialImportDialog() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(REQUEST_MATERIAL_IMPORT_DIALOG_EVENT));
}

export function openMaterialImportDialog() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_MATERIAL_IMPORT_DIALOG_EVENT));
}
