import type { AnchorBindingPreview, CarrierAnchor, CarrierSpectralSkeleton } from '../types/carrierDonorV2Types';
import type { CarrierPresenceField } from './carrierPresenceInterpretationField';

export type CarrierFieldCoverageContract = {
  width: number;
  presenceActiveColumnRatio: number;
  skeletonActiveColumnRatio: number;
  bindingActiveColumnRatio: number;
  presenceToSkeletonLossRatio: number;
  skeletonToBindingLossRatio: number;
  earlyLatePresenceSkew: number;
  earlyLateSkeletonSkew: number;
  earlyLateBindingSkew: number;
  firstPresenceColumn: number | null;
  lastPresenceColumn: number | null;
  firstSkeletonColumn: number | null;
  lastSkeletonColumn: number | null;
  firstBindingColumn: number | null;
  lastBindingColumn: number | null;
  activePresenceColumnCount: number;
  activeSkeletonColumnCount: number;
  activeBindingColumnCount: number;
  fieldCellCount: number;
  paintedEnergyDurationRatio: number;
  maxColumnEnergy: number;
  meanActiveColumnEnergy: number;
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function safeRatio(numerator: number, denominator: number) {
  if (denominator <= 1e-9) return 0;
  return clamp01(numerator / denominator);
}

function earlyLateSkew(early: number, late: number) {
  return (early - late) / Math.max(1e-6, early + late);
}

function columnWindowFromBoolean(activeColumns: boolean[]) {
  let first: number | null = null;
  let last: number | null = null;
  let count = 0;
  for (let i = 0; i < activeColumns.length; i += 1) {
    if (!activeColumns[i]) continue;
    count += 1;
    if (first === null) first = i;
    last = i;
  }
  return { first, last, count };
}

function summarizeAnchorColumns(skeleton: CarrierSpectralSkeleton | null | undefined) {
  const width = Math.max(0, skeleton?.width ?? 0);
  const activeColumns = Array.from({ length: width }, () => false);
  let earlyEnergy = 0;
  let lateEnergy = 0;
  const split = Math.max(1, Math.floor(width / 2));

  if (skeleton) {
    for (let x = 0; x < width; x += 1) {
      const anchors = skeleton.anchorsByTime[x] ?? [];
      if (anchors.length > 0) activeColumns[x] = true;
      const columnEnergy = anchors.reduce((sum, anchor) => sum + Math.max(0, anchor.energy), 0);
      if (x < split) earlyEnergy += columnEnergy;
      else lateEnergy += columnEnergy;
    }
  }

  const window = columnWindowFromBoolean(activeColumns);
  return {
    ...window,
    ratio: width > 0 ? window.count / width : 0,
    skew: window.count > 0 ? earlyLateSkew(earlyEnergy, lateEnergy) : 0,
  };
}

function summarizeBindingColumns(
  skeleton: CarrierSpectralSkeleton | null | undefined,
  bindingPreview: AnchorBindingPreview[] | null | undefined,
) {
  const width = Math.max(0, skeleton?.width ?? 0);
  const activeColumns = Array.from({ length: width }, () => false);
  let earlyEnergy = 0;
  let lateEnergy = 0;
  const split = Math.max(1, Math.floor(width / 2));
  const anchorById = new Map<string, CarrierAnchor>();

  if (skeleton) {
    for (const anchors of skeleton.anchorsByTime) {
      for (const anchor of anchors) anchorById.set(anchor.id, anchor);
    }
  }

  for (const binding of bindingPreview ?? []) {
    const anchor = anchorById.get(binding.carrierAnchorId);
    if (!anchor) continue;
    const x = anchor.timeIndex;
    if (x < 0 || x >= width) continue;
    activeColumns[x] = true;
    const weightedEnergy = Math.max(0, anchor.energy) * Math.max(0, binding.confidence || 0);
    if (x < split) earlyEnergy += weightedEnergy;
    else lateEnergy += weightedEnergy;
  }

  const window = columnWindowFromBoolean(activeColumns);
  return {
    ...window,
    ratio: width > 0 ? window.count / width : 0,
    skew: window.count > 0 ? earlyLateSkew(earlyEnergy, lateEnergy) : 0,
  };
}

export function buildCarrierFieldCoverageContract(
  presence: CarrierPresenceField,
  skeleton?: CarrierSpectralSkeleton | null,
  bindingPreview?: AnchorBindingPreview[] | null,
): CarrierFieldCoverageContract {
  const width = Math.max(1, presence.width || skeleton?.width || 1);
  const skeletonCoverage = summarizeAnchorColumns(skeleton);
  const bindingCoverage = summarizeBindingColumns(skeleton, bindingPreview);
  const presenceRatio = clamp01(presence.stats.activeDurationRatio);
  const skeletonRatio = clamp01(skeletonCoverage.ratio);
  const bindingRatio = clamp01(bindingCoverage.ratio);

  return {
    width,
    presenceActiveColumnRatio: presenceRatio,
    skeletonActiveColumnRatio: skeletonRatio,
    bindingActiveColumnRatio: bindingRatio,
    presenceToSkeletonLossRatio: safeRatio(Math.max(0, presenceRatio - skeletonRatio), Math.max(1e-6, presenceRatio)),
    skeletonToBindingLossRatio: safeRatio(Math.max(0, skeletonRatio - bindingRatio), Math.max(1e-6, skeletonRatio)),
    earlyLatePresenceSkew: presence.stats.earlyLateEnergySkew,
    earlyLateSkeletonSkew: skeletonCoverage.skew,
    earlyLateBindingSkew: bindingCoverage.skew,
    firstPresenceColumn: presence.stats.firstActiveColumn,
    lastPresenceColumn: presence.stats.lastActiveColumn,
    firstSkeletonColumn: skeletonCoverage.first,
    lastSkeletonColumn: skeletonCoverage.last,
    firstBindingColumn: bindingCoverage.first,
    lastBindingColumn: bindingCoverage.last,
    activePresenceColumnCount: presence.stats.activeColumnCount,
    activeSkeletonColumnCount: skeletonCoverage.count,
    activeBindingColumnCount: bindingCoverage.count,
    fieldCellCount: presence.stats.activeCellCount,
    paintedEnergyDurationRatio: presenceRatio,
    maxColumnEnergy: presence.stats.maxColumnEnergy,
    meanActiveColumnEnergy: presence.stats.meanActiveColumnEnergy,
  };
}
