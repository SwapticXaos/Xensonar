import {
  BP_13TET_RATIOS,
  JI_NODES,
  deriveModeMask,
  getModesForSystem,
  getOptionLabel,
  getRasterPeriodRatio,
  getRasterStepCents,
  GRID_TUNING_OPTIONS,
  type ChurchMode,
  type GridTuning,
} from "../xensonar/domain/instrumentData";
import type { SemanticNode } from "../xensonar/domain/runtimeTypes";

export type ResidentSystem = GridTuning;
export type ResidentMode = ChurchMode;

export type ResidentPitch = {
  ratio: number;
  label: string;
  step: number;
  systemStep: number;
  cents: number;
};

export const RESIDENT_HZ_MIN = 55;
export const RESIDENT_HZ_MAX = 1760;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const periodRatioForSystem = (system: ResidentSystem) => getRasterPeriodRatio(system);
const foldRatioIntoPeriod = (ratio: number, system: ResidentSystem) => {
  const period = periodRatioForSystem(system);
  let next = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
  while (next < 1) next *= period;
  while (next >= period) next /= period;
  return next;
};

const systemCentsFor = (system: ResidentSystem): number[] => getRasterStepCents(system);

const residentStepLabel = (system: ResidentSystem, systemStep: number, jiLabel?: string) => {
  if (system === "ji") return jiLabel ?? (systemStep === 0 ? "1/1" : `JI ${systemStep}`);
  return systemStep === 0 ? "Root" : `${systemStep}`;
};

export function formatCustomResidentLabel(hz: number) {
  return `${clampResidentHz(hz).toFixed(1)} Hz`;
}

export function clampResidentHz(hz: number) {
  return clamp(Number.isFinite(hz) ? hz : RESIDENT_HZ_MIN, RESIDENT_HZ_MIN, RESIDENT_HZ_MAX);
}

export function residentHzFromSlider(sliderValue: number) {
  const t = clamp(Number.isFinite(sliderValue) ? sliderValue : 0, 0, 1);
  return RESIDENT_HZ_MIN * Math.pow(RESIDENT_HZ_MAX / RESIDENT_HZ_MIN, t);
}

export function residentSliderFromHz(hz: number) {
  const safeHz = clampResidentHz(hz);
  return Math.log(safeHz / RESIDENT_HZ_MIN) / Math.log(RESIDENT_HZ_MAX / RESIDENT_HZ_MIN);
}

export const getResidentSystemLabel = (system: ResidentSystem) => getOptionLabel(GRID_TUNING_OPTIONS, system);

export function formatResidentPitchOptionLabel(pitch: ResidentPitch, baseFreq: number) {
  const hz = Math.max(20, baseFreq * pitch.ratio);
  return `${pitch.label} · ${hz.toFixed(1)} Hz`;
}

export function normalizeResidentMode(system: ResidentSystem, mode: ResidentMode): ResidentMode {
  const allowed = getModesForSystem(system).map((entry) => entry.value);
  return (allowed.includes(mode) ? mode : allowed[0] ?? "chromatic") as ResidentMode;
}

export function buildResidentPitchPool(system: ResidentSystem): ResidentPitch[] {
  if (system === "ji") {
    return JI_NODES.map((node, index) => ({ ratio: node.ratio, label: residentStepLabel(system, index, node.label), step: index, systemStep: index, cents: node.cents }));
  }
  if (system === "bp") {
    return BP_13TET_RATIOS.map((ratio, index) => ({ ratio, label: residentStepLabel(system, index), step: index, systemStep: index, cents: 1200 * Math.log2(ratio) }));
  }
  const systemCents = systemCentsFor(system);
  return systemCents.map((cents, index) => ({
    ratio: Math.pow(2, cents / 1200),
    label: residentStepLabel(system, index),
    step: index,
    systemStep: index,
    cents,
  }));
}

export function buildResidentModeMask(system: ResidentSystem, mode: ResidentMode, length: number) {
  const normalizedMode = normalizeResidentMode(system, mode);
  const systemMask = deriveModeMask(normalizedMode, system);
  if (!systemMask.length) return Array.from({ length }, () => false);
  return Array.from({ length }, (_, index) => !!systemMask[index % systemMask.length]);
}

export function ensureResidentIdentity(node: SemanticNode, fallbackPrefix = "resident") {
  if (!node.residentId) node.residentId = `${fallbackPrefix}-${Math.random().toString(36).slice(2, 10)}`;
  return node;
}

export function refreshCustomResidentNode(node: SemanticNode, baseFreq: number, system: ResidentSystem, mode: ResidentMode) {
  ensureResidentIdentity(node);
  node.isCustomResident = true;
  node.freq = clampResidentHz(node.freq);
  node.label = formatCustomResidentLabel(node.freq);
  node.ratio = node.freq / Math.max(1e-6, baseFreq);
  node.residentSystem = system;
  node.residentMode = mode;
  node.residentStepIndex = undefined;
  node.residentMuted = false;
  node.tuningCents = 0;
  return node;
}

export function findNearestResidentPitch(system: ResidentSystem, freq: number, baseFreq: number) {
  const pool = buildResidentPitchPool(system);
  if (!pool.length) {
    return {
      pitch: { ratio: 1, label: "Root", step: 0, systemStep: 0, cents: 0 },
      index: 0,
      foldedRatio: 1,
      detuneCents: 0,
    };
  }
  const safeBase = Math.max(1e-6, baseFreq);
  const foldedRatio = foldRatioIntoPeriod(freq / safeBase, system);
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  pool.forEach((pitch, index) => {
    const distance = Math.abs(Math.log(foldedRatio / Math.max(1e-6, pitch.ratio)));
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  const pitch = pool[bestIndex] ?? pool[0];
  return {
    pitch,
    index: bestIndex,
    foldedRatio,
    detuneCents: 1200 * Math.log2(foldedRatio / Math.max(1e-6, pitch.ratio)),
  };
}

export function describeResidentSystemReading(freq: number, baseFreq: number, system: ResidentSystem) {
  const nearest = findNearestResidentPitch(system, freq, baseFreq);
  return nearest.pitch.label;
}

export function applyResidentPitch(node: SemanticNode, pitch: ResidentPitch, baseFreq: number, system: ResidentSystem, mode: ResidentMode) {
  ensureResidentIdentity(node);
  node.isCustomResident = false;
  node.ratio = pitch.ratio;
  node.label = pitch.label;
  node.residentSystem = system;
  node.residentMode = mode;
  node.residentStepIndex = pitch.systemStep;
  const detuneFactor = Math.pow(2, (node.tuningCents ?? 0) / 1200);
  node.freq = Math.max(20, baseFreq * pitch.ratio * detuneFactor);
  return node;
}

export function syncResidentNodeToSystem(node: SemanticNode, baseFreq: number, system: ResidentSystem, mode: ResidentMode) {
  ensureResidentIdentity(node);
  if (node.isCustomResident) return refreshCustomResidentNode(node, baseFreq, system, mode);
  const nearest = findNearestResidentPitch(system, node.freq, baseFreq);
  node.residentSystem = system;
  node.residentMode = mode;
  node.residentStepIndex = nearest.index;
  node.label = nearest.pitch.label;
  node.ratio = node.freq / Math.max(1e-6, baseFreq);
  return node;
}

export function applyResidentModeMask(nodes: SemanticNode[], baseFreq: number, system: ResidentSystem, mode: ResidentMode) {
  const fullPool = buildResidentPitchPool(system);
  const mask = buildResidentModeMask(system, mode, Math.max(fullPool.length, 1));
  nodes.forEach((node, index) => {
    if (node.isCustomResident) {
      refreshCustomResidentNode(node, baseFreq, system, mode);
      return;
    }
    const stepIndex = node.residentStepIndex ?? (index % Math.max(fullPool.length, 1));
    node.residentMuted = !mask[stepIndex % mask.length];
    node.residentMode = mode;
    node.residentSystem = system;
  });
  return nodes;
}

export function retuneResidentNodes(nodes: SemanticNode[], baseFreq: number, system: ResidentSystem, mode: ResidentMode) {
  const pool = buildResidentPitchPool(system);
  if (!pool.length) return nodes;
  let systemIndex = 0;
  nodes.forEach((node) => {
    if (node.isCustomResident) {
      refreshCustomResidentNode(node, baseFreq, system, mode);
      return;
    }
    const stepIndex = systemIndex % pool.length;
    applyResidentPitch(node, pool[stepIndex], baseFreq, system, mode);
    systemIndex += 1;
  });
  return applyResidentModeMask(nodes, baseFreq, system, mode);
}

const canPlaceResident = (nodes: SemanticNode[], x: number, y: number, minDistance = 28) => (
  nodes.every((node) => Math.hypot(node.x - x, node.y - y) >= minDistance)
);

const findResidentPlacement = (nodes: SemanticNode[], width: number, height: number) => {
  const customCount = nodes.filter((node) => node.isCustomResident).length;
  const perRow = Math.max(4, Math.floor((width - 40) / 44));
  for (let attempt = 0; attempt < 48; attempt += 1) {
    const slot = customCount + attempt;
    const row = Math.floor(slot / perRow);
    const col = slot % perRow;
    const x = clamp(width - 32 - col * 40, 20, width - 20);
    const y = clamp(28 + row * 36, 20, height - 20);
    if (canPlaceResident(nodes, x, y, 26)) return { x, y };
  }
  return { x: clamp(width - 32, 20, width - 20), y: clamp(28, 20, height - 20) };
};

export function addCustomResidentNode(args: {
  nodes: SemanticNode[];
  baseFreq: number;
  width: number;
  height: number;
  system: ResidentSystem;
  mode: ResidentMode;
  frequencyHz: number;
}) {
  const { nodes, baseFreq, width, height, system, mode, frequencyHz } = args;
  const freq = clampResidentHz(frequencyHz);
  const placement = findResidentPlacement(nodes, width, height);
  const node: SemanticNode = {
    x: placement.x,
    y: placement.y,
    freq,
    energy: 0,
    label: formatCustomResidentLabel(freq),
    ratio: freq / Math.max(1e-6, baseFreq),
    tuningCents: 0,
    residentId: `resident-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    residentSystem: system,
    residentMode: mode,
    residentStepIndex: undefined,
    residentMuted: false,
    isCustomResident: true,
  };
  refreshCustomResidentNode(node, baseFreq, system, mode);
  nodes.push(node);
  applyResidentModeMask(nodes, baseFreq, system, mode);
  return node;
}
