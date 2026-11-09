import type { SpectralData } from '../audio/SpectralData';
import { buildCarrierPresenceInterpretationBridge } from '../interpretation/carrierPresenceInterpretationField';
import type { EmbodimentField } from '../types/embodimentFieldTypes';
import type { CarrierAnchor, CarrierSpectralSkeleton } from '../types/carrierDonorV2Types';
import type { MaterialAllocationPreview, MaterialCell, MaterialField } from '../types/gestaltMaterialField';

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function add(field: Float32Array, width: number, height: number, x: number, y: number, radius: number, amount: number) {
  const safeX = Math.max(0, Math.min(width - 1, Math.round(x)));
  const safeY = Math.max(0, Math.min(height - 1, Math.round(y)));
  const safeRadius = Math.max(0, Math.min(height, Math.round(radius)));
  const safeAmount = Math.max(0, amount);
  if (safeAmount <= 0) return;

  for (let yy = Math.max(0, safeY - safeRadius); yy <= Math.min(height - 1, safeY + safeRadius); yy += 1) {
    const distance = Math.abs(yy - safeY);
    const falloff = safeRadius <= 0 ? 1 : 1 - distance / Math.max(1, safeRadius + 1);
    const idx = yy * width + safeX;
    field[idx] = clamp01((field[idx] ?? 0) + safeAmount * falloff);
  }
}

function normalize(field: Float32Array) {
  let max = 0;
  for (let i = 0; i < field.length; i += 1) max = Math.max(max, field[i] ?? 0);
  if (max <= 1e-6) return field;
  for (let i = 0; i < field.length; i += 1) field[i] = clamp01((field[i] ?? 0) / max);
  return field;
}

function contributionFromCell(cell: MaterialCell | undefined, weight: number) {
  if (!cell) {
    return { ordered: weight * 0.2, body: weight * 0.28, residual: weight * 0.22, transient: weight * 0.12 };
  }

  const ordered = Math.max(
    cell.kind === 'ordered' ? 0.72 : 0,
    cell.orderedStrength ?? 0,
    cell.regime === 'tonal' ? 0.42 : 0,
  );
  const body = Math.max(
    cell.kind === 'resonant' ? 0.72 : 0,
    cell.resonanceStrength ?? 0,
    cell.resonanceSharpness ? cell.resonanceSharpness * 0.55 : 0,
  );
  const residual = Math.max(
    cell.kind === 'residual' ? 0.78 : 0,
    cell.residualStrength ?? 0,
    cell.regime === 'noise' ? 0.52 : 0,
  );
  const transient = Math.max(
    cell.kind === 'transient' ? 0.82 : 0,
    cell.transientStrength ?? 0,
    cell.regime === 'transient' ? 0.56 : 0,
  );

  const mixed = cell.kind === 'mixed' ? 0.24 : 0;
  return {
    ordered: weight * clamp01(ordered + mixed),
    body: weight * clamp01(body + mixed),
    residual: weight * clamp01(residual + mixed),
    transient: weight * clamp01(transient + mixed),
  };
}

function anchorFallback(anchor: CarrierAnchor) {
  switch (anchor.regime) {
    case 'tonal': return { ordered: 0.74, body: 0.28, residual: 0.08, transient: 0.08 };
    case 'cluster': return { ordered: 0.22, body: 0.48, residual: 0.36, transient: 0.16 };
    case 'noise': return { ordered: 0.08, body: 0.22, residual: 0.72, transient: 0.18 };
    case 'transient': return { ordered: 0.12, body: 0.18, residual: 0.24, transient: 0.78 };
    default: return { ordered: 0.25, body: 0.3, residual: 0.25, transient: 0.15 };
  }
}

export function buildV2EmbodimentField(args: {
  spectralData: SpectralData;
  skeleton: CarrierSpectralSkeleton;
  materialField: MaterialField | null;
  materialAllocationPreview: MaterialAllocationPreview | null;
  durationSec: number;
  sourceSignature: string;
}): EmbodimentField {
  const width = Math.max(1, args.skeleton.width || args.spectralData.width || 1);
  const height = Math.max(1, args.skeleton.height || args.spectralData.height || 1);
  const size = width * height;
  const presence = buildCarrierPresenceInterpretationBridge(args.spectralData).presence;

  const carrierTrace = new Float32Array(size);
  const orderedField = new Float32Array(size);
  const bodyField = new Float32Array(size);
  const residualField = new Float32Array(size);
  const transientField = new Float32Array(size);
  const compositeField = new Float32Array(size);

  for (let i = 0; i < Math.min(size, presence.energy.length); i += 1) {
    carrierTrace[i] = clamp01(presence.energy[i] ?? 0);
  }

  const cellById = new Map((args.materialField?.cells ?? []).map((cell) => [cell.id, cell]));
  const allocationByTime = new Map((args.materialAllocationPreview?.allocations ?? []).map((allocation) => [allocation.timeIndex, allocation]));

  const anchors: CarrierAnchor[] = [];
  for (const bucket of args.skeleton.anchorsByTime) {
    for (const anchor of bucket) anchors.push(anchor);
  }
  for (const anchor of anchors) {
    const allocation = allocationByTime.get(anchor.timeIndex);
    const radius = Math.max(1, Math.min(height / 4, Math.ceil(anchor.bandwidthBins * 0.75 + 1)));
    const energy = clamp01(anchor.energy);
    let ordered = 0;
    let body = 0;
    let residual = 0;
    let transient = 0;

    if (allocation && allocation.cellIds.length) {
      for (let i = 0; i < allocation.cellIds.length; i += 1) {
        const cell = cellById.get(allocation.cellIds[i]!);
        const weight = allocation.weights[i] ?? 0;
        const c = contributionFromCell(cell, weight);
        ordered += c.ordered;
        body += c.body;
        residual += c.residual;
        transient += c.transient;
      }
    } else {
      const fallback = anchorFallback(anchor);
      ordered = fallback.ordered;
      body = fallback.body;
      residual = fallback.residual;
      transient = fallback.transient;
    }

    const densityBoost = allocation ? 0.78 + allocation.confidence * 0.34 : 0.72;
    add(orderedField, width, height, anchor.timeIndex, anchor.centerBin, radius, energy * ordered * densityBoost);
    add(bodyField, width, height, anchor.timeIndex, anchor.centerBin, radius + 1, energy * body * densityBoost);
    add(residualField, width, height, anchor.timeIndex, anchor.centerBin, radius + 2, energy * residual * (0.72 + (allocation?.leakRisk ?? 0) * 0.18));
    add(transientField, width, height, anchor.timeIndex, anchor.centerBin, Math.max(1, Math.floor(radius * 0.6)), energy * transient * densityBoost);
  }

  normalize(carrierTrace);
  normalize(orderedField);
  normalize(bodyField);
  normalize(residualField);
  normalize(transientField);

  for (let i = 0; i < size; i += 1) {
    compositeField[i] = clamp01(
      carrierTrace[i]! * 0.28 +
      orderedField[i]! * 0.28 +
      bodyField[i]! * 0.26 +
      residualField[i]! * 0.2 +
      transientField[i]! * 0.24,
    );
  }
  normalize(compositeField);

  return {
    width,
    height,
    durationSec: args.durationSec,
    carrierTrace,
    orderedField,
    bodyField,
    residualField,
    transientField,
    compositeField,
    builtFromSignature: `carrier-donor-v2:${args.sourceSignature}`,
  };
}
