import { useState } from 'react';
import type { CanonicalForgeInitialState } from './canonicalForgeInitialState';

type CanonicalForgeStampWorkflowInitialState = Pick<
  CanonicalForgeInitialState,
  | 'stampPresetId'
  | 'stampData'
  | 'stampScaleX'
  | 'stampScaleY'
  | 'stampRotation'
  | 'stampFlipX'
  | 'stampFlipY'
  | 'stampPhase'
>;

export function useCanonicalForgeStampWorkflowState(initialState: CanonicalForgeStampWorkflowInitialState) {
  const [stampPresetId, setStampPresetId] = useState(() => initialState.stampPresetId);
  const [stampData, setStampData] = useState(() => initialState.stampData);
  const [stampScaleX, setStampScaleX] = useState(() => initialState.stampScaleX);
  const [stampScaleY, setStampScaleY] = useState(() => initialState.stampScaleY);
  const [stampRotation, setStampRotation] = useState(() => initialState.stampRotation);
  const [stampFlipX, setStampFlipX] = useState(() => initialState.stampFlipX);
  const [stampFlipY, setStampFlipY] = useState(() => initialState.stampFlipY);
  const [stampPhase, setStampPhase] = useState(() => initialState.stampPhase);
  const [stampSelStart, setStampSelStart] = useState<{ x: number; y: number } | null>(null);

  return {
    stampPresetId,
    setStampPresetId,
    stampData,
    setStampData,
    stampScaleX,
    setStampScaleX,
    stampScaleY,
    setStampScaleY,
    stampRotation,
    setStampRotation,
    stampFlipX,
    setStampFlipX,
    stampFlipY,
    setStampFlipY,
    stampPhase,
    setStampPhase,
    stampSelStart,
    setStampSelStart,
  };
}
