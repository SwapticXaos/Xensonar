import type { SharedFieldSnapshot } from "./sharedFieldTypes";

export type SharedFieldController = {
  active: boolean;
  interactive?: boolean;
  attractCursor?: boolean;
  attractOscillatorBall?: boolean;
  residentWaveExcitationEnabled?: boolean;
  residentBallCouplingEnabled?: boolean;
  particleSoundsMuted?: boolean;
  getSnapshot: (width: number, height: number) => SharedFieldSnapshot;
  onNodeDragStart?: (nodeId: string, clientX: number, clientY: number, rect: DOMRect) => void;
  onNodeDragMove?: (nodeId: string, clientX: number, clientY: number, rect: DOMRect) => void;
  onNodeDragEnd?: () => void;
};
