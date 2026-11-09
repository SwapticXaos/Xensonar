import { XENSONAR_MATERIAL_SCHEMA_VERSION } from '../materialSchema';
import type { XensonarMaterialPackageV1 } from '../materialSchemaTypes';

export interface ExampleExternalLoopAdapterInput {
  name: string;
  blob: Blob;
  bpm?: number;
  bars: number;
  loopStartSec?: number;
  loopEndSec: number;
  intendedLoopDurationSec?: number;
  segmentsPerBar?: number;
  markers16?: number[];
  sourceDevice?: string;
  sourceVersion?: string;
  renderMode?: string;
  rootHz?: number | null;
  notes?: string;
  preferredMyzelGroup?: string;
  workspaceOrigin?: string;
  transitionGuard?: string;
  balanceCarrier?: string;
  routeSummary?: string;
  stabilizeBy?: string;
}

export function createExampleExternalLoopPackage(input: ExampleExternalLoopAdapterInput): XensonarMaterialPackageV1 {
  const durationSec = input.loopEndSec;
  return {
    schemaVersion: XENSONAR_MATERIAL_SCHEMA_VERSION,
    id: `external-${input.name.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, '-') || 'material'}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name,
    role: 'loop',
    audio: {
      kind: 'wav',
      blob: input.blob,
      mimeType: input.blob.type || 'audio/wav',
      durationSec,
    },
    timing: {
      bpm: Number.isFinite(input.bpm) && (input.bpm ?? 0) > 0 ? (input.bpm as number) : 108,
      bars: Math.max(1, Math.round(input.bars)),
      loopStartSec: Math.max(0, input.loopStartSec ?? 0),
      loopEndSec: Math.max(0, input.loopEndSec),
      intendedLoopDurationSec: Math.max(0, input.intendedLoopDurationSec ?? input.loopEndSec),
    },
    guide: {
      segmentsPerBar: input.segmentsPerBar,
      markers16: input.markers16,
    },
    pitch: {
      rootHz: input.rootHz ?? null,
    },
    renderInfo: {
      sourceDevice: input.sourceDevice ?? 'ExternalForgeExample',
      sourceVersion: input.sourceVersion ?? '0.1.0',
      renderMode: input.renderMode ?? 'unknown',
      notes: input.notes,
      preferredMyzelGroup: input.preferredMyzelGroup,
      workspaceOrigin: input.workspaceOrigin,
      transitionGuard: input.transitionGuard,
      balanceCarrier: input.balanceCarrier,
      routeSummary: input.routeSummary,
      stabilizeBy: input.stabilizeBy,
    },
    provenance: {
      createdAt: new Date().toISOString(),
    },
  };
}
