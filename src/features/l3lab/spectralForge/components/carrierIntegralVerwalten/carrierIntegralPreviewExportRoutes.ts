// Core Carrier Integral preview/export route boundary.
// Archived standalone preview machines stay in source archaeology, but the Core
// HTML gesture-sample export keeps a raw SpectralForge buffer fallback only.

import { audioEngine } from '../../audio/AudioEngine';
import type { ForgeProjectSnapshot } from '../../state/store';
import type { CarrierIntegralMachineId } from '../../integral';
import type { CarrierIntegralGestureSampleExportRequest } from './carrierIntegralGestureSampleExport';

export type CarrierIntegralPreviewExportRouteId = 'spectral-raw-fallback';

export type CarrierIntegralPreviewExportRenderMachineId =
  | CarrierIntegralMachineId
  | 'spectral-raw-fallback';

export type CarrierIntegralPreviewExportControls = {
  previewBpm: number;
  previewPitchSemitones: number;
  previewVolume: number;
};

export type CarrierIntegralRenderedSampleRouteResult = {
  buffer: AudioBuffer;
  renderMachineId: CarrierIntegralPreviewExportRenderMachineId;
  renderMachineLabel: string;
  renderPath: CarrierIntegralPreviewExportRouteId;
  sampleName: string;
};

export function resolveCarrierIntegralGestureSampleRenderMachine(args: {
  lastPreviewMachineId: CarrierIntegralMachineId | null;
  selectedMachine: CarrierIntegralMachineId | null | undefined;
}): CarrierIntegralMachineId | null {
  return args.lastPreviewMachineId ?? args.selectedMachine ?? null;
}

export function isCarrierIntegralStandalonePreviewRoute(
  _machineId: CarrierIntegralMachineId,
): boolean {
  return false;
}

export async function renderCarrierIntegralGestureSampleExportRoute(args: {
  sampleRequest: CarrierIntegralGestureSampleExportRequest;
  snapshot: ForgeProjectSnapshot;
  renderMachineId: CarrierIntegralMachineId | null;
  controls: CarrierIntegralPreviewExportControls;
  selectionTotalDurationSec: number;
  probeSource: 'carrier-integral-verwalten-panel';
}): Promise<CarrierIntegralRenderedSampleRouteResult> {
  const { sampleRequest, snapshot } = args;
  const buffer = await audioEngine.renderToBuffer(
    sampleRequest.spectralSelection,
    snapshot.synthMode,
    snapshot.waveformMix,
  );
  return {
    buffer: buffer as AudioBuffer,
    renderMachineId: 'spectral-raw-fallback',
    renderMachineLabel: 'Spectral Forge Rohbuffer',
    renderPath: 'spectral-raw-fallback',
    sampleName: sampleRequest.sampleName,
  };
}

export function assertCarrierIntegralPreviewExportBoundary(): true {
  return true;
}
