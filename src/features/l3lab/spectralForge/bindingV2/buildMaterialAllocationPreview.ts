import type {
  GestaltField,
  GestaltRegime,
  MaterialAllocation,
  MaterialAllocationPreview,
  MaterialAllocationSummary,
  MaterialCell,
  MaterialField,
} from '../types/gestaltMaterialField';
import type { TransferProfile } from '../types/transferProfile';
import { deriveTransferProfile } from '../transfer/deriveTransferProfile';

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function dominantRegimeForSlot(slot: GestaltField['slots'][number]): GestaltRegime {
  if (!slot.anchors.length) return 'noise';

  const counts: Record<GestaltRegime, number> = {
    tonal: 0,
    cluster: 0,
    noise: 0,
    transient: 0,
  };

  for (const anchor of slot.anchors) counts[anchor.regime] += anchor.energy || 1;

  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    'noise') as GestaltRegime;
}

function regimeCompatibility(slotRegime: GestaltRegime, cell: MaterialCell, profile: TransferProfile): number {
  const anchorFocus = profile.detail.anchorFocus;
  const inharmonicFreedom = profile.detail.inharmonicFreedom;
  if (slotRegime === cell.regime) return 0.85 + anchorFocus * 0.15;
  if (
    (slotRegime === 'cluster' && cell.regime === 'noise') ||
    (slotRegime === 'noise' && cell.regime === 'cluster')
  ) {
    return 0.55 + inharmonicFreedom * 0.25;
  }
  if (
    (slotRegime === 'tonal' && cell.kind === 'ordered') ||
    (slotRegime === 'transient' && cell.kind === 'transient')
  ) {
    return 0.65 + anchorFocus * 0.2;
  }
  return 0.2 + inharmonicFreedom * 0.2;
}

function densityCompatibility(density: number, cell: MaterialCell, profile: TransferProfile): number {
  switch (cell.kind) {
    case 'transient':
      return density < (0.3 + profile.detail.bandwidthSpread * 0.3) ? 1 : 0.45 + profile.detail.transientLoad * 0.2;
    case 'residual':
      return density > 0.25 ? 0.65 + profile.detail.residualLoad * 0.3 : 0.45 + profile.detail.bandwidthSpread * 0.2;
    case 'resonant':
      return density > 0.15 ? 0.55 + profile.detail.resonanceLoad * 0.35 : 0.45 + profile.detail.anchorFocus * 0.15;
    case 'ordered':
      return density < 0.75 ? 0.45 + (1 - profile.detail.orderednessPenalty) * 0.4 : 0.35 + profile.detail.zoneCoupling * 0.15;
    case 'mixed':
    default:
      return 0.4 + profile.detail.zoneCoupling * 0.2 + profile.detail.inharmonicFreedom * 0.15;
  }
}

function leakPenalty(cell: MaterialCell, profile: TransferProfile): number {
  const legacyWeighted =
    cell.sequenceRecoverability * (0.25 + profile.detail.sequenceDecoupling * 0.55) +
    cell.prosodicTrace * (0.2 + profile.detail.prosodySuppression * 0.65) +
    cell.cellEntanglement * (0.1 + profile.detail.cellDisentanglement * 0.55);
  const auditWeighted =
    (cell.overallLeakRisk ?? 0) * (0.45 + profile.detail.orderednessPenalty * 0.35) +
    (cell.recommendedSuppression ?? 0) * (0.25 + profile.detail.prosodySuppression * 0.35);
  return clamp01((legacyWeighted / 1.75) * 0.45 + auditWeighted * 0.55);
}

function scoreCellForSlot(
  slot: GestaltField['slots'][number],
  slotRegime: GestaltRegime,
  cell: MaterialCell,
  profile: TransferProfile,
): number {
  const regimeScore = regimeCompatibility(slotRegime, cell, profile);
  const densityScore = densityCompatibility(slot.density, cell, profile);
  const energyBias = clamp01(slot.totalEnergy / Math.max(1, slot.anchors.length));
  const continuityBias = clamp01(slot.continuityStrength);

  const raw =
    regimeScore * 0.35 +
    densityScore * 0.25 +
    energyBias * 0.2 +
    continuityBias * (0.08 + profile.detail.continuityFidelity * 0.08) +
    clamp01(slot.anchors.length / 6) * (0.06 + profile.detail.polyAnchorBlend * 0.12) -
    leakPenalty(cell, profile) * (0.18 + profile.detail.orderednessPenalty * 0.32);

  return Math.max(0, raw);
}

function normalizeWeights(weights: number[]): Float32Array {
  const sum = weights.reduce((acc, value) => acc + value, 0);
  if (sum <= 0) {
    return new Float32Array(weights.map(() => 0));
  }
  return new Float32Array(weights.map((value) => value / sum));
}

export function buildMaterialAllocationPreview(
  gestalt: GestaltField,
  material: MaterialField,
  transferProfile: TransferProfile = deriveTransferProfile(),
): MaterialAllocationPreview {
  const allocations: MaterialAllocation[] = [];

  for (const slot of gestalt.slots) {
    if (!slot.anchors.length || !material.cells.length) continue;

    const slotRegime = dominantRegimeForSlot(slot);

    const ranked = material.cells
      .map((cell) => ({
        cell,
        score: scoreCellForSlot(slot, slotRegime, cell, transferProfile),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (!ranked.length) continue;

    const weights = normalizeWeights(ranked.map((entry) => entry.score));
    const leakRisk = mean(ranked.map((entry) => leakPenalty(entry.cell, transferProfile)));
    const confidence = mean(ranked.map((entry) => entry.score));

    allocations.push({
      timeIndex: slot.timeIndex,
      anchorIds: slot.anchors.map((anchor) => anchor.id),
      cellIds: ranked.map((entry) => entry.cell.id),
      weights,
      confidence,
      leakRisk,
    });
  }

  return { allocations };
}

export function summarizeMaterialAllocationPreview(
  preview: MaterialAllocationPreview,
): MaterialAllocationSummary {
  if (!preview.allocations.length) {
    return {
      allocationCount: 0,
      meanConfidence: 0,
      meanLeakRisk: 0,
      meanCellsPerAllocation: 0,
    };
  }

  const allocationCount = preview.allocations.length;
  const meanConfidence =
    preview.allocations.reduce((sum, item) => sum + item.confidence, 0) / allocationCount;
  const meanLeakRisk =
    preview.allocations.reduce((sum, item) => sum + item.leakRisk, 0) / allocationCount;
  const meanCellsPerAllocation =
    preview.allocations.reduce((sum, item) => sum + item.cellIds.length, 0) / allocationCount;

  return {
    allocationCount,
    meanConfidence,
    meanLeakRisk,
    meanCellsPerAllocation,
  };
}
