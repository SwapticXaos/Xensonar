/* TS-MOD-03: Resident node frequency clamping, logarithmic Hz mapping, scale-step assignment,
   mode mute synchronization, and non-overlapping custom resident placement — brought back from
   src/runtime/instrument/07_interpreters_and_installation.js into strict TypeScript.
   Built by tools/ts_module.cjs into __XenTs_residentNodeTuning.
   Zone: WARM (Nodal / Variant Resident Workbench & constellation state). No audio thread work. */

export interface ResidentJiStepInput {
  readonly ratio: number;
  readonly cents: number;
  readonly label?: string;
}

export interface ResidentModeOption {
  readonly value: string;
}

export interface ResidentScaleStep {
  readonly ratio: number;
  readonly label: string;
  readonly step: number;
  readonly systemStep: number;
  readonly cents: number;
}

export interface ResidentNode {
  x: number;
  y: number;
  freq: number;
  energy?: number;
  label: string;
  ratio: number;
  tuningCents?: number;
  residentId?: string;
  residentSystem?: string;
  residentMode?: string;
  residentStepIndex?: number;
  residentMuted?: boolean;
  isCustomResident?: boolean;
}

export interface ResidentPlacement {
  readonly x: number;
  readonly y: number;
}

export interface ResidentTuningDeps {
  getStepCents: (system: string) => readonly number[];
  getModeOptions: (system: string) => readonly ResidentModeOption[];
  getModeMask: (mode: string, system: string) => readonly unknown[];
  getJiSteps: () => readonly ResidentJiStepInput[];
  getBpRatios: () => readonly number[];
}

export interface CreateCustomResidentInput {
  nodes: ResidentNode[];
  baseFreq: number;
  width: number;
  height: number;
  system: string;
  mode: string;
  frequencyHz: number;
}

export const RESIDENT_MIN_FREQ_HZ = 55;
export const RESIDENT_MAX_FREQ_HZ = 1760;

export function clampResident(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function maskMutedStates(muted: boolean[], clearAll: boolean): boolean[] {
  return clearAll ? muted.map(() => false) : muted;
}

export function isParticleWithOverlay<T>(kind: string, overlay: T): false | T {
  return kind === 'particle' && overlay;
}

export function formatResidentStepLabel(system: string, step: number, explicitLabel?: string): string {
  return system === 'ji'
    ? (explicitLabel ?? (step === 0 ? '1/1' : `JI ${step}`))
    : (step === 0 ? 'Root' : `${step}`);
}

export function clampResidentFreq(freq: unknown): number {
  const safe = typeof freq === 'number' && Number.isFinite(freq) ? freq : RESIDENT_MIN_FREQ_HZ;
  return clampResident(safe, RESIDENT_MIN_FREQ_HZ, RESIDENT_MAX_FREQ_HZ);
}

export function formatResidentFreqHz(freq: unknown): string {
  return `${clampResidentFreq(freq).toFixed(1)} Hz`;
}

export function normToResidentFreq(norm: unknown): number {
  const safe = typeof norm === 'number' && Number.isFinite(norm) ? norm : 0;
  const clamped = clampResident(safe, 0, 1);
  return RESIDENT_MIN_FREQ_HZ * Math.pow(RESIDENT_MAX_FREQ_HZ / RESIDENT_MIN_FREQ_HZ, clamped);
}

export function residentFreqToNorm(freq: unknown): number {
  const clamped = clampResidentFreq(freq);
  return Math.log(clamped / RESIDENT_MIN_FREQ_HZ) / Math.log(RESIDENT_MAX_FREQ_HZ / RESIDENT_MIN_FREQ_HZ);
}

export function resolveResidentMode(
  system: string,
  mode: string,
  deps: Pick<ResidentTuningDeps, 'getModeOptions'>,
): string {
  const values = deps.getModeOptions(system).map((opt) => opt.value);
  return values.includes(mode) ? mode : (values[0] ?? 'chromatic');
}

export function buildResidentScaleSteps(
  system: string,
  deps: Pick<ResidentTuningDeps, 'getStepCents' | 'getJiSteps' | 'getBpRatios'>,
): ResidentScaleStep[] {
  if (system === 'ji') {
    return deps.getJiSteps().map((item, idx) => ({
      ratio: item.ratio,
      label: formatResidentStepLabel(system, idx, item.label),
      step: idx,
      systemStep: idx,
      cents: item.cents,
    }));
  }
  if (system === 'bp') {
    return deps.getBpRatios().map((ratio, idx) => ({
      ratio,
      label: formatResidentStepLabel(system, idx),
      step: idx,
      systemStep: idx,
      cents: 1200 * Math.log2(ratio),
    }));
  }
  return deps.getStepCents(system).map((cents, idx) => ({
    ratio: Math.pow(2, cents / 1200),
    label: formatResidentStepLabel(system, idx),
    step: idx,
    systemStep: idx,
    cents,
  }));
}

export function buildResidentActiveMask(
  system: string,
  mode: string,
  count: number,
  deps: Pick<ResidentTuningDeps, 'getModeOptions' | 'getModeMask'>,
): boolean[] {
  const resolved = resolveResidentMode(system, mode, deps);
  const mask = deps.getModeMask(resolved, system);
  return mask.length
    ? Array.from({ length: count }, (_unused, idx) => Boolean(mask[idx % mask.length]))
    : Array.from({ length: count }, () => false);
}

export function ensureResidentId<T extends Pick<ResidentNode, 'residentId'>>(
  node: T,
  prefix = 'resident',
): T {
  if (!node.residentId) {
    node.residentId = `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  }
  return node;
}

export function configureCustomResident<T extends ResidentNode>(
  node: T,
  baseFreq: number,
  system: string,
  mode: string,
): T {
  ensureResidentId(node);
  node.isCustomResident = true;
  node.freq = clampResidentFreq(node.freq);
  node.label = formatResidentFreqHz(node.freq);
  node.ratio = node.freq / Math.max(1e-6, baseFreq);
  node.residentSystem = system;
  node.residentMode = mode;
  node.residentStepIndex = undefined;
  node.residentMuted = false;
  node.tuningCents = 0;
  return node;
}

export function configureScaleResident<T extends ResidentNode>(
  node: T,
  step: ResidentScaleStep,
  baseFreq: number,
  system: string,
  mode: string,
): T {
  ensureResidentId(node);
  node.isCustomResident = false;
  node.ratio = step.ratio;
  node.label = step.label;
  node.residentSystem = system;
  node.residentMode = mode;
  node.residentStepIndex = step.systemStep;
  const detune = Math.pow(2, (node.tuningCents ?? 0) / 1200);
  node.freq = Math.max(20, baseFreq * step.ratio * detune);
  return node;
}

export function syncResidentMutes<T extends ResidentNode>(
  nodes: T[],
  baseFreq: number,
  system: string,
  mode: string,
  deps: ResidentTuningDeps,
): T[] {
  const steps = buildResidentScaleSteps(system, deps);
  const activeMask = buildResidentActiveMask(system, mode, Math.max(steps.length, 1), deps);
  nodes.forEach((node, idx) => {
    if (node.isCustomResident) {
      configureCustomResident(node, baseFreq, system, mode);
      return;
    }
    const stepIdx = node.residentStepIndex ?? idx % Math.max(steps.length, 1);
    node.residentMuted = !activeMask[stepIdx % activeMask.length];
    node.residentMode = mode;
    node.residentSystem = system;
  });
  return nodes;
}

export function retuneResidentNodes<T extends ResidentNode>(
  nodes: T[],
  baseFreq: number,
  system: string,
  mode: string,
  deps: ResidentTuningDeps,
): T[] {
  const steps = buildResidentScaleSteps(system, deps);
  if (!steps.length) return nodes;
  let scaleIndex = 0;
  nodes.forEach((node) => {
    if (node.isCustomResident) {
      configureCustomResident(node, baseFreq, system, mode);
      return;
    }
    const slot = scaleIndex % steps.length;
    configureScaleResident(node, steps[slot], baseFreq, system, mode);
    scaleIndex += 1;
  });
  return syncResidentMutes(nodes, baseFreq, system, mode, deps);
}

export function isPlacementClear(
  nodes: readonly Pick<ResidentNode, 'x' | 'y'>[],
  x: number,
  y: number,
  minDistance = 28,
): boolean {
  return nodes.every((node) => Math.hypot(node.x - x, node.y - y) >= minDistance);
}

export function findCustomResidentPlacement(
  nodes: readonly Pick<ResidentNode, 'x' | 'y' | 'isCustomResident'>[],
  width: number,
  height: number,
): ResidentPlacement {
  const customCount = nodes.filter((node) => node.isCustomResident).length;
  const cols = Math.max(4, Math.floor((width - 40) / 44));
  for (let attempt = 0; attempt < 48; attempt += 1) {
    const slot = customCount + attempt;
    const row = Math.floor(slot / cols);
    const col = slot % cols;
    const x = clampResident(width - 32 - col * 40, 20, width - 20);
    const y = clampResident(28 + row * 36, 20, height - 20);
    if (isPlacementClear(nodes, x, y, 26)) return { x, y };
  }
  return {
    x: clampResident(width - 32, 20, width - 20),
    y: clampResident(28, 20, height - 20),
  };
}

export function createCustomResidentNode(
  input: CreateCustomResidentInput,
  deps: ResidentTuningDeps,
): ResidentNode {
  const { nodes, baseFreq, width, height, system, mode, frequencyHz } = input;
  const freq = clampResidentFreq(frequencyHz);
  const pos = findCustomResidentPlacement(nodes, width, height);
  const node: ResidentNode = {
    x: pos.x,
    y: pos.y,
    freq,
    energy: 0,
    label: formatResidentFreqHz(freq),
    ratio: freq / Math.max(1e-6, baseFreq),
    tuningCents: 0,
    residentId: `resident-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    residentSystem: system,
    residentMode: mode,
    residentStepIndex: undefined,
    residentMuted: false,
    isCustomResident: true,
  };
  configureCustomResident(node, baseFreq, system, mode);
  nodes.push(node);
  syncResidentMutes(nodes, baseFreq, system, mode, deps);
  return node;
}

export function bindResidentTuningRuntime(deps: ResidentTuningDeps) {
  return {
    resolveMode: (system: string, mode: string) => resolveResidentMode(system, mode, deps),
    buildScaleSteps: (system: string) => buildResidentScaleSteps(system, deps),
    buildActiveMask: (system: string, mode: string, count: number) =>
      buildResidentActiveMask(system, mode, count, deps),
    syncMutes: <T extends ResidentNode>(nodes: T[], baseFreq: number, system: string, mode: string) =>
      syncResidentMutes(nodes, baseFreq, system, mode, deps),
    retuneNodes: <T extends ResidentNode>(nodes: T[], baseFreq: number, system: string, mode: string) =>
      retuneResidentNodes(nodes, baseFreq, system, mode, deps),
    createCustomNode: (input: CreateCustomResidentInput) => createCustomResidentNode(input, deps),
  };
}
