import { useEffect, useMemo, useState } from "react";
import { resolvePerformanceCrisisRuntimePolicy } from "./performanceCrisisRuntimePolicies";
import { publishWaveStarterSpecialPathIsolationToBrowser } from "./waveStarterSpecialPathIsolationContract";
import {
  XENSONAR_AUDIO_WORKLET_BRANCH_TEST_ROOT_FOLLOW_VOICE_ENGINE_MODE,
} from "./performanceCrisisTypes";
import type {
  CrisisQuantizationGridSelection,
  CrisisQuantizationModeSelection,
  ParticleAmbientMotionSelection,
  ParticleCrisisModeSelection,
  ParticleLoadReductionSelection,
  PerformanceCrisisPresetId,
  RootFollowVoiceEngineMode,
} from "./performanceCrisisTypes";

type CanonicalParticleQuantizeGrid = number;

type PerformanceCrisisHarnessCandidate = {
  id?: string;
  stylePreset?: PerformanceCrisisPresetId;
  particlePreset?: PerformanceCrisisPresetId;
  waveStarterPreset?: PerformanceCrisisPresetId;
  rootFollowVoiceEngineMode?: RootFollowVoiceEngineMode;
  rootFollowQuantizationMode?: CrisisQuantizationModeSelection;
  rootFollowQuantizationGrid?: CrisisQuantizationGridSelection;
  particleCrisisMode?: ParticleCrisisModeSelection;
  particleAmbientMotionMode?: ParticleAmbientMotionSelection;
  particleLoadReductionMode?: ParticleLoadReductionSelection;
  particleQuantizationMode?: CrisisQuantizationModeSelection;
  particleQuantizationGrid?: CrisisQuantizationGridSelection;
};

declare global {
  interface Window {
    __xensonarPerformanceCrisisHarness?: {
      version: 1;
      getState: () => Record<string, unknown>;
      applyCandidate: (candidate: PerformanceCrisisHarnessCandidate) => void;
    };
  }
}

export function usePerformanceCrisisUiPolicyState(args: {
  particleQuantizeGrid?: CanonicalParticleQuantizeGrid;
} = {}) {
  const [performanceCrisisPresetId, setPerformanceCrisisPresetId] =
    useState<PerformanceCrisisPresetId>("balanced");
  const [particleCrisisPresetId, setParticleCrisisPresetId] =
    useState<PerformanceCrisisPresetId>("balanced");
  const [waveStarterCrisisPresetId, setWaveStarterCrisisPresetId] =
    useState<PerformanceCrisisPresetId>("balanced");
  const [particleCrisisMode, setParticleCrisisMode] =
    useState<ParticleCrisisModeSelection>("preset");
  const [particleAmbientMotionMode, setParticleAmbientMotionMode] =
    useState<ParticleAmbientMotionSelection>("preset");
  const [particleLoadReductionMode, setParticleLoadReductionMode] =
    useState<ParticleLoadReductionSelection>("preset");
  const [rootFollowQuantizationMode, setRootFollowQuantizationMode] =
    useState<CrisisQuantizationModeSelection>("fallback");
  const [rootFollowQuantizationGrid, setRootFollowQuantizationGrid] =
    useState<CrisisQuantizationGridSelection>("32");
  const [
    rootFollowQuantizationCustomSegments,
    setRootFollowQuantizationCustomSegments,
  ] = useState(32);
  const [rootFollowVoiceEngineMode, setRootFollowVoiceEngineMode] =
    useState<RootFollowVoiceEngineMode>(
      XENSONAR_AUDIO_WORKLET_BRANCH_TEST_ROOT_FOLLOW_VOICE_ENGINE_MODE,
    );
  const [particleQuantizationMode, setParticleQuantizationMode] =
    useState<CrisisQuantizationModeSelection>("fallback");
  const [particleQuantizationGrid, setParticleQuantizationGrid] =
    useState<CrisisQuantizationGridSelection>("16");
  const [
    particleQuantizationCustomSegments,
    setParticleQuantizationCustomSegments,
  ] = useState(16);

  const effectiveParticleQuantizationGrid = (
    args.particleQuantizeGrid
      ? String(args.particleQuantizeGrid)
      : particleQuantizationGrid
  ) as CrisisQuantizationGridSelection;
  const effectiveParticleQuantizationCustomSegments =
    args.particleQuantizeGrid ?? particleQuantizationCustomSegments;

  const performanceCrisisRuntimePolicy = useMemo(
    () =>
      resolvePerformanceCrisisRuntimePolicy({
        stylePresetId: performanceCrisisPresetId,
        particlePresetId: particleCrisisPresetId,
        waveStarterPresetId: waveStarterCrisisPresetId,
        particleCrisisMode,
        particleAmbientMotionMode,
        particleLoadReductionMode,
        rootFollowQuantizationMode,
        rootFollowQuantizationGrid,
        rootFollowQuantizationCustomSegments,
        particleQuantizationMode,
        particleQuantizationGrid: effectiveParticleQuantizationGrid,
        particleQuantizationCustomSegments:
          effectiveParticleQuantizationCustomSegments,
        rootFollowVoiceEngineMode,
      }),
    [
      performanceCrisisPresetId,
      particleCrisisPresetId,
      waveStarterCrisisPresetId,
      particleCrisisMode,
      particleAmbientMotionMode,
      particleLoadReductionMode,
      rootFollowQuantizationMode,
      rootFollowQuantizationGrid,
      rootFollowQuantizationCustomSegments,
      particleQuantizationMode,
      effectiveParticleQuantizationGrid,
      effectiveParticleQuantizationCustomSegments,
      rootFollowVoiceEngineMode,
    ],
  );

  useEffect(() => {
    publishWaveStarterSpecialPathIsolationToBrowser(
      performanceCrisisRuntimePolicy.waveStarter,
    );
  }, [performanceCrisisRuntimePolicy.waveStarter]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const harness = {
      version: 1 as const,
      getState: () => ({
        performanceCrisisPresetId,
        particleCrisisPresetId,
        waveStarterCrisisPresetId,
        particleCrisisMode,
        particleAmbientMotionMode,
        particleLoadReductionMode,
        rootFollowQuantizationMode,
        rootFollowQuantizationGrid,
        rootFollowQuantizationCustomSegments,
        rootFollowVoiceEngineMode,
        particleQuantizationMode,
        particleQuantizationGrid: effectiveParticleQuantizationGrid,
        particleQuantizationCustomSegments: effectiveParticleQuantizationCustomSegments,
      }),
      applyCandidate: (candidate: PerformanceCrisisHarnessCandidate) => {
        if (candidate.stylePreset) setPerformanceCrisisPresetId(candidate.stylePreset);
        if (candidate.particlePreset) setParticleCrisisPresetId(candidate.particlePreset);
        if (candidate.waveStarterPreset) setWaveStarterCrisisPresetId(candidate.waveStarterPreset);
        if (candidate.particleCrisisMode) setParticleCrisisMode(candidate.particleCrisisMode);
        if (candidate.particleAmbientMotionMode) setParticleAmbientMotionMode(candidate.particleAmbientMotionMode);
        if (candidate.particleLoadReductionMode) setParticleLoadReductionMode(candidate.particleLoadReductionMode);
        if (candidate.rootFollowQuantizationMode) setRootFollowQuantizationMode(candidate.rootFollowQuantizationMode);
        if (candidate.rootFollowQuantizationGrid) setRootFollowQuantizationGrid(candidate.rootFollowQuantizationGrid);
        if (candidate.rootFollowVoiceEngineMode) setRootFollowVoiceEngineMode(candidate.rootFollowVoiceEngineMode);
        if (candidate.particleQuantizationMode) setParticleQuantizationMode(candidate.particleQuantizationMode);
        if (candidate.particleQuantizationGrid) setParticleQuantizationGrid(candidate.particleQuantizationGrid);
      },
    };
    window.__xensonarPerformanceCrisisHarness = harness;
    return () => {
      if (window.__xensonarPerformanceCrisisHarness === harness) {
        delete window.__xensonarPerformanceCrisisHarness;
      }
    };
  }, [
    effectiveParticleQuantizationCustomSegments,
    effectiveParticleQuantizationGrid,
    particleAmbientMotionMode,
    particleCrisisMode,
    particleCrisisPresetId,
    particleLoadReductionMode,
    particleQuantizationMode,
    performanceCrisisPresetId,
    rootFollowQuantizationCustomSegments,
    rootFollowQuantizationGrid,
    rootFollowQuantizationMode,
    rootFollowVoiceEngineMode,
    waveStarterCrisisPresetId,
  ]);

  return {
    performanceCrisisPresetId,
    setPerformanceCrisisPresetId,
    particleCrisisPresetId,
    setParticleCrisisPresetId,
    waveStarterCrisisPresetId,
    setWaveStarterCrisisPresetId,
    particleCrisisMode,
    setParticleCrisisMode,
    particleAmbientMotionMode,
    setParticleAmbientMotionMode,
    particleLoadReductionMode,
    setParticleLoadReductionMode,
    rootFollowQuantizationMode,
    setRootFollowQuantizationMode,
    rootFollowQuantizationGrid,
    setRootFollowQuantizationGrid,
    rootFollowQuantizationCustomSegments,
    setRootFollowQuantizationCustomSegments,
    rootFollowVoiceEngineMode,
    setRootFollowVoiceEngineMode,
    particleQuantizationMode,
    setParticleQuantizationMode,
    particleQuantizationGrid: effectiveParticleQuantizationGrid,
    setParticleQuantizationGrid,
    particleQuantizationCustomSegments:
      effectiveParticleQuantizationCustomSegments,
    setParticleQuantizationCustomSegments,
    performanceCrisisRuntimePolicy,
  };
}
