import type { SemanticNode } from '../domain/runtimeTypes';
import {
  advanceMyzelRoom3Frame,
  renderMyzelRoom3Canvas,
  type MyzelRoom3ConstellationState,
  type MyzelRoom3Cursor,
  type MyzelRoom3Frame,
  type MyzelRoom3Params,
} from '../../topology/myzelRoom3Frame';
import {
  buildResidentFieldFrame,
  collectResidentFieldWaveCollisionEvents,
  type ResidentFieldFrame,
} from '../../topology/residentFieldFrame';
import type { InstallationFieldConfig } from '../../topology/installationFieldConfig';
import type { MyzelSpatialFieldProbe } from '../../topology/myzelSpatialFieldTypes';
import type { NexusRipple, DirectedPulse } from '../domain/runtimeTypes';

export type MyzelRoom3RuntimeBoundaryArgs = {
  nodes: SemanticNode[];
  cursor: MyzelRoom3Cursor;
  params: MyzelRoom3Params;
  baseFreq: number;
  width: number;
  height: number;
  targetGameHeight: number;
  previousConstellation: MyzelRoom3ConstellationState;
};

export type MyzelRoom3CanvasRuntimeArgs = {
  ctx: CanvasRenderingContext2D;
  nodes: SemanticNode[];
  cursor: MyzelRoom3Cursor;
  width: number;
  height: number;
  spatialFieldProbe: MyzelSpatialFieldProbe;
  selectedResidentId: string | null;
};

export type MyzelResidentFieldBoundaryArgs = {
  active: boolean;
  config: InstallationFieldConfig;
  nodes: SemanticNode[];
  oscillatorBall: { x: number; y: number } | null;
  sourceWidth: number;
  sourceHeight: number;
  targetWidth: number;
  targetHeight: number;
};

export type MyzelResidentFieldWaveEventsArgs = {
  frame: ResidentFieldFrame;
  active: boolean;
  config: InstallationFieldConfig;
  ripples: NexusRipple[];
  sectorPulses: DirectedPulse[];
  nowMs: number;
  targetFreq: number;
};

export function advanceMyzelSynthRoom3Runtime(args: MyzelRoom3RuntimeBoundaryArgs): MyzelRoom3Frame {
  return advanceMyzelRoom3Frame(args);
}

export function renderMyzelSynthRoom3RuntimeCanvas(args: MyzelRoom3CanvasRuntimeArgs): void {
  renderMyzelRoom3Canvas(args);
}

export function buildMyzelResidentFieldRuntimeFrame(args: MyzelResidentFieldBoundaryArgs): ResidentFieldFrame {
  return buildResidentFieldFrame(args);
}

export function collectMyzelResidentFieldRuntimeWaveEvents(args: MyzelResidentFieldWaveEventsArgs) {
  return collectResidentFieldWaveCollisionEvents(args);
}
