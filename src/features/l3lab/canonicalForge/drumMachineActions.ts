import { dispatchXensonarEvent } from '../../xensonar/runtime/xensonarEventChannels';
import type { Dispatch, SetStateAction } from 'react';
import { clampBars } from '../spectralForge/state/storeMaterialExport';
import { clampDrumSegmentsPerBar } from '../../xensonar/drumGrid';
import { registerDrumConfigFromMatrix } from '../../xensonar/drumConfigLibrary';
import type { DrumViewportState } from './loopDrumDomain';
import type { DrumLaneKitOverrides } from '../../xensonar/groove/drumKitRoutingTypes';
import type { DrumLaneSettingsMap } from '../../xensonar/groove/drumLaneSettings';
import type { DrumComputerState, GrooveMachineConfig } from './loopDrumDomain';
import {
  buildClearedDrumComputer,
  buildDrumExportMatrix,
  buildPresetBackedDrumComputer,
  buildRandomizedDrumComputer,
  buildResetDrumComputerToPreset,
  resizeDrumComputerBars,
  resizeDrumComputerSegments,
} from './drumMachineState';
import { sanitizeDrumViewport } from './viewportMath';

type StateSetter<T> = Dispatch<SetStateAction<T>>;

type GrooveSetter = StateSetter<GrooveMachineConfig>;
type DrumSetter = StateSetter<DrumComputerState>;
type DrumViewportSetter = StateSetter<DrumViewportState>;

export function applyPresetDrumPatternAction(params: {
  pattern: string;
  barsInterpretation: number;
  setGrooveMachine: GrooveSetter;
  setDrumComputer: DrumSetter;
}) {
  const { pattern, barsInterpretation, setGrooveMachine, setDrumComputer } = params;
  setGrooveMachine((state) => ({ ...state, drumPattern: pattern }));
  setDrumComputer((state) => buildPresetBackedDrumComputer(pattern, barsInterpretation, state.segmentsPerBar, state.segmentMarkers));
}

export function applyDrumBarsChangeAction(params: {
  bars: number;
  fallbackBars: number;
  drumPattern: string;
  setGrooveMachine: GrooveSetter;
  setDrumComputer: DrumSetter;
}) {
  const { bars, fallbackBars, drumPattern, setGrooveMachine, setDrumComputer } = params;
  const nextBars = clampBars(bars || fallbackBars);
  setGrooveMachine((state) => ({ ...state, barsInterpretation: nextBars }));
  setDrumComputer((state) => resizeDrumComputerBars(state, drumPattern, nextBars));
}

export function applyDrumSegmentsChangeAction(params: {
  segmentsPerBar: number;
  fallbackSegmentsPerBar: number;
  visibleDrumComputer: DrumComputerState;
  drumPattern: string;
  barsInterpretation: number;
  setDrumComputer: DrumSetter;
  setDrumViewport: DrumViewportSetter;
}) {
  const {
    segmentsPerBar,
    fallbackSegmentsPerBar,
    visibleDrumComputer,
    drumPattern,
    barsInterpretation,
    setDrumComputer,
    setDrumViewport,
  } = params;
  const nextSegments = clampDrumSegmentsPerBar(segmentsPerBar || fallbackSegmentsPerBar);
  setDrumComputer((state) => resizeDrumComputerSegments(state, visibleDrumComputer, drumPattern, barsInterpretation, nextSegments));
  setDrumViewport((state) => sanitizeDrumViewport(state, barsInterpretation * nextSegments));
}

export function resetDrumComputerToPresetAction(params: {
  drumPattern: string;
  barsInterpretation: number;
  segmentsPerBar: number;
  setDrumComputer: DrumSetter;
  setStatus: (message: string) => void;
}) {
  const { drumPattern, barsInterpretation, segmentsPerBar, setDrumComputer, setStatus } = params;
  setDrumComputer(() => buildResetDrumComputerToPreset(drumPattern, barsInterpretation, segmentsPerBar));
  setStatus('Preset und Segmentmarker auf die Preset-Grundform zurückgesetzt.');
}

export function randomizeDrumComputerAction(params: {
  visibleDrumComputer: DrumComputerState;
  drumPattern: string;
  barsInterpretation: number;
  setDrumComputer: DrumSetter;
  setStatus: (message: string) => void;
}) {
  const { visibleDrumComputer, drumPattern, barsInterpretation, setDrumComputer, setStatus } = params;
  setDrumComputer((state) => buildRandomizedDrumComputer(state, visibleDrumComputer, drumPattern, barsInterpretation));
  setStatus('Neuer Drum-Beat erzeugt. Prüfe ihn gegen den Loop und forme weiter.');
}

export function clearDrumComputerAction(params: {
  drumPattern: string;
  barsInterpretation: number;
  setDrumComputer: DrumSetter;
  setStatus: (message: string) => void;
}) {
  const { drumPattern, barsInterpretation, setDrumComputer, setStatus } = params;
  setDrumComputer((state) => buildClearedDrumComputer(state, drumPattern, barsInterpretation));
  setStatus('Drum Computer geleert.');
}

export async function exportDrumComputerToXensonarAction(params: {
  visibleDrumComputer: DrumComputerState;
  drumPattern: string;
  drumKit: string;
  materialName: string;
  drumLaneKitOverrides?: DrumLaneKitOverrides;
  drumLaneSettings?: DrumLaneSettingsMap;
  setStatus: (message: string) => void;
}) {
  const { visibleDrumComputer, drumPattern, drumKit, materialName, drumLaneKitOverrides, drumLaneSettings, setStatus } = params;
  try {
    const matrix = buildDrumExportMatrix(visibleDrumComputer, drumPattern);
    const entry = await registerDrumConfigFromMatrix({
      name: `${materialName || 'SyntheticForge'}-drums`,
      drumKit,
      matrix: matrix as any,
      sourceWorkspace: 'microtonal-logic',
      laneKitOverrides: drumLaneKitOverrides,
      laneSettings: drumLaneSettings,
      stepPrograms: visibleDrumComputer.stepPrograms,
    });
    dispatchXensonarEvent('drumConfigSendRequest', { id: entry.id });
    setStatus(`Drum-Konfiguration exportiert und an Xensonar übergeben: ${entry.name}.`);
  } catch (error) {
    console.error('[xensonar][forge2][drum-export]', error);
    setStatus(`Drum-Export fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
  }
}
