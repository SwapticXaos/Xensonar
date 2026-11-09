import * as React from 'react';
import type { CanonicalSourceView } from './analysis';
import type { MorphMode, StampData } from '../spectralForge/audio/SpectralData';
import type { AudioSourceAsset } from '../spectralForge/audio/AudioImporter';
import { audioEngine } from '../spectralForge/audio/AudioEngine';
import {
  applyCanonicalMorphWarpField,
  applyCanonicalNoiseGate,
  applyCanonicalSourceAwareBrush,
} from './canonicalSourceToolController';

export type CanonicalRoomTool =
  | 'brush'
  | 'smudge'
  | 'morph'
  | 'sourceTrace'
  | 'harmonicLift'
  | 'transientLift'
  | 'noiseGate'
  | 'dodgeBurn'
  | 'blurSharpen'
  | 'delaySmear'
  | 'threshold'
  | 'stamp';

type CanonicalSourceToolApplyControllerArgs = {
  activeTool: CanonicalRoomTool;
  bundle: ReturnType<typeof import('./analysis').buildCanonicalAnalysisBundle> | null;
  sourceView: CanonicalSourceView;
  spectralData: import('../spectralForge/audio/SpectralData').SpectralData;
  brushSize: number;
  intensity: number;
  hardness: number;
  eraseMode: boolean;
  morphMode: MorphMode;
  stampData: StampData | null;
  stampScaleX: number;
  stampScaleY: number;
  stampRotation: number;
  stampFlipX: boolean;
  stampFlipY: boolean;
  lastCellRef: React.MutableRefObject<{ x: number; y: number } | null>;
  ensureWarpFields: () => { time: Float32Array; pitch: Float32Array };
  setWarpVersion: React.Dispatch<React.SetStateAction<number>>;
  setRevision: React.Dispatch<React.SetStateAction<number>>;
  sampleActiveSource: (
    source: AudioSourceAsset,
    offsetSec?: number,
    durationSec?: number,
  ) => Promise<AudioSourceAsset | null>;
  getEffectiveStampIntensity: () => number;
};

export function createCanonicalSourceToolApplyController({
  activeTool,
  bundle,
  sourceView,
  spectralData,
  brushSize,
  intensity,
  hardness,
  eraseMode,
  morphMode,
  stampData,
  stampScaleX,
  stampScaleY,
  stampRotation,
  stampFlipX,
  stampFlipY,
  lastCellRef,
  ensureWarpFields,
  setWarpVersion,
  setRevision,
  sampleActiveSource,
  getEffectiveStampIntensity,
}: CanonicalSourceToolApplyControllerArgs) {
  const applySourceAwareBrush = (cellX: number, cellY: number, bundleView: CanonicalSourceView, gain = 1, erase = false) => {
    applyCanonicalSourceAwareBrush({
      cellX,
      cellY,
      bundle,
      bundleView,
      sourceView,
      spectralData,
      brushSize,
      hardness,
      intensity,
      sampleActiveSource: sampleActiveSource as any,
      gain,
      erase,
    });
  };

  const applyNoiseGate = (cellX: number, cellY: number) => {
    applyCanonicalNoiseGate({
      cellX,
      cellY,
      spectralData,
      brushSize,
      intensity,
      eraseMode,
    });
  };

  const applyMorphWarpField = (cellX: number, dragDX: number, dragDY: number) => {
    const changed = applyCanonicalMorphWarpField({
      cellX,
      spectralData,
      brushSize,
      intensity,
      morphMode,
      dragDX,
      dragDY,
      ensureWarpFields: ensureWarpFields as any,
    });
    if (changed) setWarpVersion((v) => v + 1);
  };

  const applyTool = (cellX: number, cellY: number) => {
    switch (activeTool) {
      case 'brush':
        spectralData.applyBrush(cellX, cellY, brushSize, intensity, hardness, eraseMode, 0.5);
        break;
      case 'smudge': {
        const last = lastCellRef.current ?? { x: cellX, y: cellY };
        spectralData.applySmudge(cellX, cellY, brushSize, intensity, cellX - last.x, cellY - last.y, 0.5);
        break;
      }
      case 'morph': {
        const last = lastCellRef.current ?? { x: cellX, y: cellY };
        const dragDX = cellX - last.x;
        const dragDY = cellY - last.y;
        spectralData.applyMorph(cellX, cellY, brushSize, intensity, morphMode, dragDX, dragDY);
        applyMorphWarpField(cellX, dragDX, dragDY);
        break;
      }
      case 'sourceTrace':
        applySourceAwareBrush(cellX, cellY, sourceView, 1.12, eraseMode);
        break;
      case 'harmonicLift':
        applySourceAwareBrush(cellX, cellY, 'harmonic', 1.3, eraseMode);
        break;
      case 'transientLift':
        applySourceAwareBrush(cellX, cellY, 'transient', 1.35, eraseMode);
        break;
      case 'noiseGate':
        applyNoiseGate(cellX, cellY);
        break;
      case 'dodgeBurn':
        spectralData.applyDodgeBurn(cellX, cellY, brushSize, intensity, hardness, eraseMode, 0.58);
        break;
      case 'blurSharpen':
        spectralData.applyBlurSharpen(cellX, cellY, brushSize, intensity, hardness, eraseMode);
        break;
      case 'delaySmear':
        spectralData.applyDelaySmear(cellX, cellY, brushSize, intensity, hardness, eraseMode, 0.42);
        break;
      case 'threshold':
        spectralData.applyThresholdBrush(cellX, cellY, brushSize, Math.max(0.03, intensity * 0.95), hardness, eraseMode, 0.46);
        break;
      case 'stamp':
        if (!stampData) break;
        spectralData.pasteStamp(cellX, cellY, stampData, getEffectiveStampIntensity(), eraseMode, {
          scaleX: stampScaleX,
          scaleY: stampScaleY,
          rotation: stampRotation,
          flipX: stampFlipX,
          flipY: stampFlipY,
        });
        break;
    }
    audioEngine.invalidateBuffer();
    setRevision((v) => v + 1);
  };

  return {
    applySourceAwareBrush,
    applyNoiseGate,
    applyMorphWarpField,
    applyTool,
  };
}
