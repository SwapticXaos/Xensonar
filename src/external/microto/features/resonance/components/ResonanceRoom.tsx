import * as React from 'react';
import { useEffect, type Dispatch, type RefObject, type SetStateAction } from "react";
import { type DronePreset, type ParticleSystem } from "../config/types";
import { type ChurchMode } from "../../../shared/tuning/modes";
import { type ResonanceState } from "../config/state";
import type { NexusRuntimeRefsRef } from "../resonanceRefs";
import type { HyperCalib2UIState, HyperCalibUIState } from "../useHyperCalibUI";
import { useRoomFirstRunHint } from "../../runtime/useRoomFirstRunHint";
import type { EnsureAudio } from "../../../shared/audio/audioInit";
import type { PulseDirection } from "../resonanceKeymap";
import { RoomQuickStartCard } from "../../../app/components/RoomQuickStartCard";
import { HarmonicContextHud } from "../../../app/components/HarmonicContextHud";
import type { QuantizeSliceLike } from "../../../shared/tuning/quantizeLabel";
import { formatGridTuningLabel } from "../../../shared/tuning/tuningLabels";
import { findResonanceSceneForState } from "../config/scenes";
import { getResonanceUiSliceFromState } from "../config/stateSlices";
import { ResonanceNexusBlock } from "./ResonanceNexusBlock";
import { ResonanceSynthControls } from "./ResonanceSynthControls";
import { ResonanceGrooveControls } from "./ResonanceGrooveControls";
import { ResonanceHyperCalibBlock } from "./ResonanceHyperCalibBlock";
import { ResonanceAgentsBlock } from "./ResonanceAgentsBlock";
import { ResonanceWaveStatusBlock } from "./ResonanceWaveStatusBlock";
import { ResonanceSceneSelector } from "./ResonanceSceneSelector";
import { ResonanceSignatureIntervalsRow } from "./ResonanceSignatureIntervalsRow";
import { describeHarmonicWorld, type HarmonicWorld } from "../../../domain/harmonicWorld";
import { getSignatureIntervals } from "../../../domain/signatureIntervals";

type ResonanceRoomProps = {
  nexusCanvasRef: RefObject<HTMLCanvasElement | null>;
  nParamsUI: ResonanceState;
  setDronePreset: (preset: DronePreset) => void;
  updateNParams: (partial: Partial<ResonanceState>) => void;
  nexusActive: boolean;
  setNexusActive: Dispatch<SetStateAction<boolean>>;
  initAudio: EnsureAudio;
  nexusRefs: NexusRuntimeRefsRef;
  droneVolume: number;
  setDroneVolume: Dispatch<SetStateAction<number>>;
  enterArenaWorkspace: (startLevel: number) => void;
  triggerSectorPulse: (direction: PulseDirection, mode?: "one_shot" | "persistent") => void;
  toggleNexusAgent: (index: number) => void;
  setNexusAgentVolume: (index: number, value: number) => void;
  hyperCalibUI: HyperCalibUIState;
  hyperCalib2UI: HyperCalib2UIState;
  handleHyperCalibrateButton: () => void;
  handleHyperCali2Button: () => void;
  registerHyperCali2Move: (x: number, y: number) => void;
  registerHyperCali2Click: (x: number, y: number) => void;
  setSwarmProfile: (profile: "tight_groove" | "wild_orbit") => void;
  setSwarmCount: (count: number) => void;
  setParticleSystem: (system: ParticleSystem) => void;
  setChurchMode: (mode: ChurchMode) => void;
  savePreset: () => void;
  loadPreset: () => void;
  /** Set global root (gridBase) from current cursor pitch — harmonic center follows cursor. */
  setGlobalRootFromCursor?: () => void;
  /** Move cursor to a frequency (for signature-interval recall). */
  moveCursorToFreq?: (freq: number) => void;
  /** Current cursor frequency (for pin-as-signature). */
  getCurrentCursorFreq?: () => number;
  /** When provided, install goToSignatureIndex and goToRatio so shell/global shortcuts work (vision §3 §5). */
  signatureShortcutRef?: React.MutableRefObject<{ goToSignatureIndex: (i: number) => void; goToRatio?: (ratio: number) => void } | null>;
  /** When shell "Go to interval" was clicked before opening Synth, consume on mount and run goToSignatureIndex. */
  pendingSignatureRef?: React.MutableRefObject<number | null>;
  /** When shell "Surprise interval" was clicked before opening Synth, consume on mount and move cursor to ratio. */
  pendingSurpriseRatioRef?: React.MutableRefObject<number | null>;
  /** Pointer ownership entry point: resolves exact X plus grid-corrected Y in one place. */
  syncPointerCursor: (x: number, y: number) => { x: number; y: number };
  /** Active harmonic world (from App); when present, main room HUD shows which world the performer is in. */
  harmonicWorld?: HarmonicWorld | null;
};

export function ResonanceRoom({
  nexusCanvasRef,
  nParamsUI,
  setDronePreset,
  updateNParams,
  nexusActive,
  setNexusActive,
  initAudio,
  nexusRefs,
  droneVolume,
  setDroneVolume,
  enterArenaWorkspace,
  triggerSectorPulse,
  toggleNexusAgent,
  setNexusAgentVolume,
  hyperCalibUI,
  hyperCalib2UI,
  handleHyperCalibrateButton,
  handleHyperCali2Button,
  registerHyperCali2Move,
  registerHyperCali2Click,
  setSwarmProfile,
  setSwarmCount,
  setParticleSystem,
  setChurchMode,
  savePreset,
  loadPreset,
  setGlobalRootFromCursor,
  moveCursorToFreq,
  getCurrentCursorFreq,
  signatureShortcutRef,
  pendingSignatureRef,
  pendingSurpriseRatioRef,
  syncPointerCursor,
  harmonicWorld,
}: ResonanceRoomProps) {
  const { firstRunHint, showFirstRunHint, dismissHint } = useRoomFirstRunHint("RESONANCE");

  useEffect(() => {
    if (!signatureShortcutRef || !moveCursorToFreq) return;
    const gridBase = nParamsUI.gridBase;
    signatureShortcutRef.current = {
      goToSignatureIndex: (i: number) => {
        const intervals = getSignatureIntervals();
        const interval = intervals[i];
        if (interval == null) return;
        if (!Number.isFinite(gridBase) || gridBase <= 0) return;
        moveCursorToFreq(gridBase * interval.ratio);
      },
      goToRatio: (ratio: number) => {
        if (!Number.isFinite(gridBase) || gridBase <= 0) return;
        moveCursorToFreq(gridBase * ratio);
      },
    };
    const pendingSignatureQueueRef = pendingSignatureRef;
    const pending = pendingSignatureQueueRef?.current;
    if (pendingSignatureQueueRef && pending != null) {
      pendingSignatureQueueRef.current = null;
      queueMicrotask(() => signatureShortcutRef.current?.goToSignatureIndex(pending));
    }
    const pendingRatioQueueRef = pendingSurpriseRatioRef;
    const pendingRatio = pendingRatioQueueRef?.current;
    if (pendingRatioQueueRef && pendingRatio != null && Number.isFinite(gridBase) && gridBase > 0) {
      pendingRatioQueueRef.current = null;
      queueMicrotask(() => moveCursorToFreq(gridBase * pendingRatio));
    }
    return () => {
      signatureShortcutRef.current = null;
    };
  }, [signatureShortcutRef, pendingSignatureRef, pendingSurpriseRatioRef, moveCursorToFreq, nParamsUI.gridBase]);
  const toggleEcho = () => updateNParams({ echoOn: !nParamsUI.echoOn });
  const ui = getResonanceUiSliceFromState(nParamsUI);

  const quantizeSlice: QuantizeSliceLike = {
    quantizeOn: nParamsUI.quantizeOn,
    quantizeBpm: nParamsUI.quantizeBpm,
    quantizeSubdivision: nParamsUI.quantizeSubdivision,
  };

  const activeScene = findResonanceSceneForState(nParamsUI);
  const gridTuningLabel = formatGridTuningLabel(nParamsUI.gridTuning);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <ResonanceNexusBlock
        nexusCanvasRef={nexusCanvasRef}
        nexusRefs={nexusRefs}
        echoOn={nParamsUI.echoOn}
        toggleEcho={toggleEcho}
        nexusActive={nexusActive}
        setNexusActive={setNexusActive}
        initAudio={initAudio}
        enterArenaWorkspace={enterArenaWorkspace}
        triggerSectorPulse={triggerSectorPulse}
        savePreset={savePreset}
        loadPreset={loadPreset}
        firstRunHint={firstRunHint}
        showFirstRunHint={showFirstRunHint}
        dismissHint={dismissHint}
        registerHyperCali2Move={registerHyperCali2Move}
        registerHyperCali2Click={registerHyperCali2Click}
        hyperCalibUI={hyperCalibUI}
        handleHyperCalibrateButton={handleHyperCalibrateButton}
        syncPointerCursor={syncPointerCursor}
      />

      <RoomQuickStartCard>
        <span className="font-semibold text-neutral-200 mr-1">Quick start:</span>
        Move the cursor over the canvas to explore the microtonal grid, left-click to pull note-NPCs into short constellations, press{" "}
        <span className="text-neutral-200">1–0 / Q–P</span> for pitched keys, and use{" "}
        <span className="text-neutral-200">Y X C V</span> or the arrow pulse buttons above the canvas for sector waves.{" "}
        Use <span className="text-neutral-200">right click</span> to toggle echo, toggle agent voices with{" "}
        <span className="text-neutral-200">A–L</span>, and shape the groove using the Grid / Quantize controls to the
        right — pick a preset or tap{" "}
        <span className="text-neutral-200">Surprise groove</span> to jump to a new rhythm family. When you like a
        sound, use <span className="text-neutral-200">Save / Load preset</span> above the canvas to store it.
      </RoomQuickStartCard>

      <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] mb-3">
        <div className="space-y-1.5">
          {harmonicWorld != null && (harmonicWorld.label != null || harmonicWorld.id != null) && (
            <div
              className="text-xs text-neutral-400 font-medium tracking-wide uppercase"
              title={describeHarmonicWorld(harmonicWorld)}
            >
              <span className="text-neutral-500">World</span>
              <span className="ml-1.5 text-amber-200/90">
                {harmonicWorld.label ?? harmonicWorld.id ?? "—"}
              </span>
              {harmonicWorld.profile?.intensity != null && (
                <span className="ml-1.5 text-neutral-500">· {harmonicWorld.profile.intensity}</span>
              )}
              {harmonicWorld.mood && (
                <span className="ml-1.5 rounded border border-neutral-600 bg-neutral-800/90 px-1.5 py-0.5 text-[9px] text-neutral-300">
                  {harmonicWorld.mood}
                </span>
              )}
            </div>
          )}
          <HarmonicContextHud
            title="Harmonischer Kontext (Resonance)"
            modeLabel={activeScene ? activeScene.label : gridTuningLabel}
            slice={quantizeSlice}
            rootHz={nParamsUI.gridBase}
            tuningLabel={gridTuningLabel}
            intensity={harmonicWorld?.profile?.intensity}
          />
        </div>
        <ResonanceSceneSelector nParamsUI={nParamsUI} updateNParams={updateNParams} setDronePreset={setDronePreset} />
      </div>

      <ResonanceSynthControls
        nParamsUI={nParamsUI}
        updateNParams={updateNParams}
        setDronePreset={setDronePreset}
        droneVolume={droneVolume}
        setDroneVolume={setDroneVolume}
        setParticleSystem={setParticleSystem}
        setChurchMode={setChurchMode}
        setGlobalRootFromCursor={setGlobalRootFromCursor}
      />

      <ResonanceWaveStatusBlock
        nParamsUI={nParamsUI}
        nexusRefs={nexusRefs}
        onToggleEcho={toggleEcho}
      />

      <ResonanceGrooveControls
        ui={ui}
        updateNParams={updateNParams}
        setSwarmProfile={setSwarmProfile}
        setSwarmCount={setSwarmCount}
      />

      {moveCursorToFreq && getCurrentCursorFreq && (
        <ResonanceSignatureIntervalsRow
          gridBase={nParamsUI.gridBase}
          getCurrentCursorFreq={getCurrentCursorFreq}
          moveCursorToFreq={moveCursorToFreq}
        />
      )}

      <ResonanceHyperCalibBlock
        hyperCalibUI={hyperCalibUI}
        hyperCalib2UI={hyperCalib2UI}
        hyperCalibrateOn={nParamsUI.hyperCalibrateOn}
        hyperCalibratedReady={nParamsUI.hyperCalibratedReady}
        hyperCali2On={nParamsUI.hyperCali2On}
        hyperCali2Ready={nParamsUI.hyperCali2Ready}
        onHyperCalibrate={handleHyperCalibrateButton}
        onHyperCali2={handleHyperCali2Button}
      />

      <ResonanceAgentsBlock
        agentEnabled={nParamsUI.agentEnabled}
        agentVolumes={nParamsUI.agentVolumes}
        swarmCount={nParamsUI.swarmCount}
        onToggleAgent={toggleNexusAgent}
        onAgentVolume={setNexusAgentVolume}
      />
    </div>
  );
}
