import type { ForgeProjectMeta } from '../src/features/l3lab/spectralForge/projectLibrary';
import type { SpectralData } from '../src/features/l3lab/spectralForge/audio/SpectralData';
import type { GestureStripSelection, GestureStripSnapshot } from '../src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/CarrierGestureStrip';
import {
  createCarrierIntegralGestureSampleErrorMessage,
  createCarrierIntegralGestureSampleExportRequest,
  createCarrierIntegralGestureSampleSuccessMessage,
} from '../src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralGestureSampleExport';

type Case = { name: string; actual: unknown; expected: unknown };
const checked: Case[] = [];

function check(name: string, actual: unknown, expected: unknown) {
  checked.push({ name, actual, expected });
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${name}: expected ${e}, got ${a}`);
}

function project(name = 'Dieter Spirale'): Pick<ForgeProjectMeta, 'id' | 'name'> {
  return { id: 'project-1', name };
}

function strip(): GestureStripSnapshot {
  return { projectId: 'project-1', spectralSnapshot: new Float32Array([0.1, 0.2, 0.3, 0.4]) };
}

function normalizeSelection(selection: GestureStripSelection): GestureStripSelection {
  const clampRatio = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const start = clampRatio(Math.min(selection.start, selection.end));
  const end = clampRatio(Math.max(selection.start, selection.end));
  return { start: Math.min(0.995, start), end: Math.max(start + 0.005, end) };
}

function createSpectralSelection(snapshot: GestureStripSnapshot, selection: GestureStripSelection): SpectralData {
  const normalized = normalizeSelection(selection);
  return {
    width: 4,
    height: 1,
    data: new Float32Array([
      snapshot.spectralSnapshot[0] ?? 0,
      normalized.start,
      normalized.end,
      snapshot.spectralSnapshot[snapshot.spectralSnapshot.length - 1] ?? 0,
    ]),
    grainData: new Float32Array([0.5, 0.5, 0.5, 0.5]),
  } as SpectralData;
}

function oldInlineRequest(args: {
  selectedProject: Pick<ForgeProjectMeta, 'id' | 'name'> | null;
  gestureStrip: GestureStripSnapshot | null;
  gestureSelection: GestureStripSelection;
}) {
  if (!args.selectedProject || !args.gestureStrip) return null;
  const spectralSelection = createSpectralSelection(args.gestureStrip, args.gestureSelection);
  const normalized = normalizeSelection(args.gestureSelection);
  const startLabel = Math.round(normalized.start * 100).toString().padStart(2, '0');
  const endLabel = Math.round(normalized.end * 100).toString().padStart(2, '0');
  return {
    projectId: args.selectedProject.id,
    projectName: args.selectedProject.name,
    spectralSelection,
    normalizedSelection: normalized,
    startLabel,
    endLabel,
    sampleName: `${args.selectedProject.name} ${startLabel}-${endLabel}.wav`,
  };
}

function summarizeRequest(value: ReturnType<typeof createCarrierIntegralGestureSampleExportRequest>) {
  if (!value) return null;
  return {
    projectId: value.projectId,
    projectName: value.projectName,
    sampleName: value.sampleName,
    normalizedSelection: value.normalizedSelection,
    startLabel: value.startLabel,
    endLabel: value.endLabel,
    spectralSignature: Array.from(value.spectralSelection.data).map((n) => Number(n.toFixed(6))),
  };
}

const scenarios = [
  {
    name: 'normal selection names and copies spectral slice',
    selectedProject: project(),
    gestureStrip: strip(),
    gestureSelection: { start: 0.12, end: 0.38 },
  },
  {
    name: 'reversed selection normalizes before labels',
    selectedProject: project('Umkehr Figur'),
    gestureStrip: strip(),
    gestureSelection: { start: 0.72, end: 0.27 },
  },
  {
    name: 'tiny selection keeps minimum span',
    selectedProject: project('Mini Segment'),
    gestureStrip: strip(),
    gestureSelection: { start: 0.51, end: 0.511 },
  },
  {
    name: 'out of range selection clamps to exportable label range',
    selectedProject: project('Rand Segment'),
    gestureStrip: strip(),
    gestureSelection: { start: -0.4, end: 1.6 },
  },
  {
    name: 'missing selected project returns null',
    selectedProject: null,
    gestureStrip: strip(),
    gestureSelection: { start: 0.12, end: 0.38 },
  },
  {
    name: 'missing gesture strip returns null',
    selectedProject: project(),
    gestureStrip: null,
    gestureSelection: { start: 0.12, end: 0.38 },
  },
];

for (const scenario of scenarios) {
  const next = createCarrierIntegralGestureSampleExportRequest({
    ...scenario,
    createSpectralSelection,
    normalizeSelection,
  });
  check(scenario.name, summarizeRequest(next), summarizeRequest(oldInlineRequest(scenario)));
}

check(
  'success message parity',
  createCarrierIntegralGestureSampleSuccessMessage('Dieter Spirale'),
  'Sample gespeichert · Dieter Spirale',
);
check(
  'error message keeps Error.message',
  createCarrierIntegralGestureSampleErrorMessage(new Error('render failed')),
  'render failed',
);
check(
  'error message fallback for non Error',
  createCarrierIntegralGestureSampleErrorMessage('bad'),
  'Sample konnte nicht gespeichert werden',
);

console.log(JSON.stringify({ ok: true, checkedScenarios: checked.length }, null, 2));
