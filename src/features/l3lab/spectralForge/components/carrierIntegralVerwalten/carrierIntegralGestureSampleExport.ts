import type { ForgeProjectMeta } from '../../projectLibrary';
import type { SpectralData } from '../../audio/SpectralData';
import type { GestureStripSelection, GestureStripSnapshot } from './CarrierGestureStrip';

export type CarrierIntegralGestureSampleExportRequest = {
  projectId: string;
  projectName: string;
  spectralSelection: SpectralData;
  normalizedSelection: GestureStripSelection;
  startLabel: string;
  endLabel: string;
  sampleName: string;
};

export function createCarrierIntegralGestureSampleLabel(value: number): string {
  return Math.round(value * 100).toString().padStart(2, '0');
}

export function createCarrierIntegralGestureSampleName(args: {
  projectName: string;
  normalizedSelection: GestureStripSelection;
}): string {
  const startLabel = createCarrierIntegralGestureSampleLabel(args.normalizedSelection.start);
  const endLabel = createCarrierIntegralGestureSampleLabel(args.normalizedSelection.end);
  return `${args.projectName} ${startLabel}-${endLabel}.wav`;
}

export function createCarrierIntegralGestureSampleExportRequest(args: {
  selectedProject: Pick<ForgeProjectMeta, 'id' | 'name'> | null;
  gestureStrip: GestureStripSnapshot | null;
  gestureSelection: GestureStripSelection;
  createSpectralSelection: (snapshot: GestureStripSnapshot, selection: GestureStripSelection) => SpectralData;
  normalizeSelection: (selection: GestureStripSelection) => GestureStripSelection;
}): CarrierIntegralGestureSampleExportRequest | null {
  if (!args.selectedProject || !args.gestureStrip) return null;
  const normalizedSelection = args.normalizeSelection(args.gestureSelection);
  const startLabel = createCarrierIntegralGestureSampleLabel(normalizedSelection.start);
  const endLabel = createCarrierIntegralGestureSampleLabel(normalizedSelection.end);
  return {
    projectId: args.selectedProject.id,
    projectName: args.selectedProject.name,
    spectralSelection: args.createSpectralSelection(args.gestureStrip, args.gestureSelection),
    normalizedSelection,
    startLabel,
    endLabel,
    sampleName: `${args.selectedProject.name} ${startLabel}-${endLabel}.wav`,
  };
}

export function createCarrierIntegralGestureSampleSuccessMessage(args: {
  sampleName: string;
  renderMachineLabel: string;
  durationSec: number;
  dbVerified: boolean;
}): string {
  const dbText = args.dbVerified ? 'DB bestätigt' : 'DB nicht bestätigt';
  return `Sample gespeichert · ${args.renderMachineLabel} · ${args.sampleName} · ${dbText} · ${args.durationSec.toFixed(2)}s`;
}

export function createCarrierIntegralGestureSampleErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Sample konnte nicht gespeichert werden';
}
