export type LoopEnginePitchLine = {
  id: string;
  label: string;
  ratio: number;
  cents: number;
  muted: boolean;
  offsetCents?: number;
};

export type LoopEngineCell = {
  id: string;
  segmentIndex: number;
  pitchLineId: string;
  enabled: boolean;
  accent?: number;
  velocity?: number;
};

export type LoopEngineTimeGuideMarker = {
  id: string;
  beat: number;
  kind: 'bar' | 'guide';
  repeatPerBar: boolean;
  locked: boolean;
  muted?: boolean;
};

export type LoopEngineInstance = {
  id: string;
  bars: number;
  beatsPerBar: number;
  stepsPerBar: number;
  segmentsPerBar: number;
  pitchLines: LoopEnginePitchLine[];
  cells: LoopEngineCell[];
  voicePresetId?: string | null;
};
