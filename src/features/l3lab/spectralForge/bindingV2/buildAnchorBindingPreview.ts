import type {
  AnchorBindingPreview,
  AnchorBindingPreviewSummary,
  CarrierAnchor,
  CarrierAnchorRegime,
  CarrierSpectralSkeleton,
  DonorAnchorPhase,
  DonorRegisterLabel,
  DonorTimbreAtlas,
  DonorTimbreCell,
} from '../types/carrierDonorV2Types';

export type BuildAnchorBindingPreviewOptions = {
  maxCellsPerAnchor?: number;
  minScore?: number;
};

const DEFAULT_OPTIONS: Required<BuildAnchorBindingPreviewOptions> = {
  maxCellsPerAnchor: 3,
  minScore: 0.24,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function classifyRegister(centerHz: number): DonorRegisterLabel {
  if (centerHz < 220) return 'low';
  if (centerHz < 1760) return 'mid';
  return 'high';
}

function preferredPhasesForAnchor(anchor: CarrierAnchor): DonorAnchorPhase[] {
  switch (anchor.regime) {
    case 'transient': return ['attack', 'sustain', 'release'];
    case 'noise': return ['release', 'sustain', 'attack'];
    case 'cluster': return ['sustain', 'attack', 'release'];
    case 'tonal':
    default: return ['sustain', 'release', 'attack'];
  }
}

function regimeCompatibility(carrierRegime: CarrierAnchorRegime, donorRegime: CarrierAnchorRegime): number {
  if (carrierRegime === donorRegime) return 1;
  if ((carrierRegime === 'tonal' && donorRegime === 'cluster') || (carrierRegime === 'cluster' && donorRegime === 'tonal')) return 0.78;
  if ((carrierRegime === 'noise' && donorRegime === 'cluster') || (carrierRegime === 'cluster' && donorRegime === 'noise')) return 0.62;
  if ((carrierRegime === 'transient' && donorRegime === 'tonal') || (carrierRegime === 'tonal' && donorRegime === 'transient')) return 0.58;
  return 0.42;
}

function phaseCompatibility(preferred: DonorAnchorPhase[], phase: DonorAnchorPhase): number {
  const index = preferred.indexOf(phase);
  if (index < 0) return 0.3;
  return index === 0 ? 1 : index === 1 ? 0.78 : 0.56;
}

function registerCompatibility(anchorHz: number, register: DonorRegisterLabel): number {
  const desired = classifyRegister(anchorHz);
  if (desired === register) return 1;
  if ((desired === 'mid' && register === 'low') || (desired === 'mid' && register === 'high')) return 0.74;
  return 0.46;
}

function bandwidthCompatibility(anchor: CarrierAnchor, cell: DonorTimbreCell): number {
  const normalized = Math.max(0, Math.min(1, anchor.bandwidthBins / 24));
  const cellBody = cell.meanResidualBands.length > 0 ? (cell.meanResidualBands[0] ?? 0) : 0.5;
  const roughRegime = cell.regime === 'cluster' || cell.regime === 'noise' ? 1 : 0;
  return 1 - Math.min(1, Math.abs(normalized - (0.5 * cellBody + 0.5 * roughRegime)));
}

function scoreCellForAnchor(anchor: CarrierAnchor, cell: DonorTimbreCell): number {
  const preferredPhases = preferredPhasesForAnchor(anchor);
  const registerScore = registerCompatibility(anchor.centerHz, cell.register);
  const phaseScore = phaseCompatibility(preferredPhases, cell.phase);
  const regimeScore = regimeCompatibility(anchor.regime, cell.regime);
  const energyScore = 0.45 + anchor.energy * 0.55;
  const bandwidthScore = bandwidthCompatibility(anchor, cell);
  const atlasPurity = 1 - cell.pitchLeakRisk;
  const deSequencedPurity = 1 - clamp((cell.sequenceRecoverability * 0.46) + (cell.prosodicTrace * 0.34) + (cell.cellEntanglement * 0.20), 0, 1);
  return (
    registerScore * 0.20 +
    phaseScore * 0.16 +
    regimeScore * 0.20 +
    energyScore * 0.08 +
    bandwidthScore * 0.10 +
    cell.stability * 0.10 +
    atlasPurity * 0.08 +
    deSequencedPurity * 0.08
  ) * cell.quality;
}

export function buildAnchorBindingPreview(skeleton: CarrierSpectralSkeleton, donorAtlas: DonorTimbreAtlas, options?: BuildAnchorBindingPreviewOptions): AnchorBindingPreview[] {
  const cfg = { ...DEFAULT_OPTIONS, ...(options ?? {}) };
  const previews: AnchorBindingPreview[] = [];
  for (const anchors of skeleton.anchorsByTime) {
    for (const anchor of anchors) {
      const scored = donorAtlas.cells.map((cell) => ({ cell, score: scoreCellForAnchor(anchor, cell) }))
        .filter((entry) => entry.score >= cfg.minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, cfg.maxCellsPerAnchor);
      if (!scored.length) continue;
      const total = scored.reduce((sum, entry) => sum + entry.score, 0) || 1;
      const dominant = scored[0].cell;
      previews.push({
        carrierAnchorId: anchor.id,
        donorCellIds: scored.map((entry) => entry.cell.id),
        weights: new Float32Array(scored.map((entry) => entry.score / total)),
        confidence: Math.min(1, total / Math.max(1, scored.length)),
        dominantRegister: dominant.register,
        dominantPhase: dominant.phase,
        dominantRegime: dominant.regime,
      });
    }
  }
  return previews;
}

export function summarizeAnchorBindingPreview(skeleton: CarrierSpectralSkeleton, previews: AnchorBindingPreview[]): AnchorBindingPreviewSummary {
  const bindingCount = previews.length;
  const meanConfidence = bindingCount > 0 ? previews.reduce((sum, preview) => sum + preview.confidence, 0) / bindingCount : 0;
  const meanCellsPerBinding = bindingCount > 0 ? previews.reduce((sum, preview) => sum + preview.donorCellIds.length, 0) / bindingCount : 0;
  const anchorById = new Map<string, CarrierAnchor>();
  for (const anchors of skeleton.anchorsByTime) for (const anchor of anchors) anchorById.set(anchor.id, anchor);
  let strongestCarrierHz: number | null = null;
  let strongestConfidence = -1;
  const dominantRegisterCounts: Record<DonorRegisterLabel, number> = { low: 0, mid: 0, high: 0 };
  const dominantPhaseCounts: Record<DonorAnchorPhase, number> = { attack: 0, sustain: 0, release: 0 };
  const dominantRegimeCounts: Record<CarrierAnchorRegime, number> = { tonal: 0, cluster: 0, noise: 0, transient: 0 };
  for (const preview of previews) {
    dominantRegisterCounts[preview.dominantRegister] += 1;
    dominantPhaseCounts[preview.dominantPhase] += 1;
    dominantRegimeCounts[preview.dominantRegime] += 1;
    if (preview.confidence > strongestConfidence) {
      strongestConfidence = preview.confidence;
      strongestCarrierHz = anchorById.get(preview.carrierAnchorId)?.centerHz ?? null;
    }
  }
  return { bindingCount, meanConfidence, meanCellsPerBinding, strongestCarrierHz, dominantRegisterCounts, dominantPhaseCounts, dominantRegimeCounts };
}
