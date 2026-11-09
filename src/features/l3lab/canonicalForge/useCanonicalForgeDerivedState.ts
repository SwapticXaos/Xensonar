import { useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import {
  buildChordGhostNotes,
  buildBassPatternNotes,
  cloneLoopComposerState,
  composerTrackById,
  noteChannelIndex,
  noteStartUnit,
  syncLoopNoteToState,
  type ChordVoicing,
  type GrooveMachineConfig,
  type LoopComposerState,
  type LoopNoteEvent,
} from './loopDrumDomain';
import { startLoopComposerPreview } from './loopPreview';
import { clampSelectionBounds } from './spectralWorkspaceUtils';
import { buildDestructiveColumnGainProfile, buildSelectionLoopSeamScore, buildWarpAudioProfile, type DestructiveAudioProfile, type WarpAudioProfile } from './selectionAudioTransfer';
import type { AudioSourceAsset } from '../spectralForge/audio/AudioImporter';
import type { SpectralData, StampData } from '../spectralForge/audio/SpectralData';

export function useCanonicalForgeDerivedState(args: {
  loopComposer: LoopComposerState;
  grooveMachine: GrooveMachineConfig;
  materialEntries: readonly any[];
  selectedMaterialId: string;
  customStampEntries: readonly any[];
  selectedStampId: string;
  composerHover: { stepIndex: number | null; gridStep: number | null };
  showChordGhost: boolean;
  lockTrackEditing: boolean;
  chordVoicing: ChordVoicing;
  chordStrumSteps: number;
  detailSelectionDirty: boolean;
  detailSelectionStartSec: number;
  detailSelectionDurationSec: number;
  selectionStartSec: number;
  selectionDurationSec: number;
  rawSourceAsset: AudioSourceAsset | null;
  sourceAsset: AudioSourceAsset | null;
  selectionDirty: boolean;
  spectralData: SpectralData;
  revision: number;
  proxyBaselineSnapshotRef: MutableRefObject<Float32Array | null>;
  warpTimeColumnsRef: MutableRefObject<Float32Array | null>;
  warpPitchColumnsRef: MutableRefObject<Float32Array | null>;
  warpVersion: number;
  stampSelStart: { x: number; y: number } | null;
  stampSelEndRef: MutableRefObject<{ x: number; y: number } | null>;
  hoveredCell: { x: number; y: number } | null;
  activeTool: string;
  stampPhase: string;
  stampData: StampData | null;
  stampScaleX: number;
  stampScaleY: number;
  stampRotation: number;
  stampFlipX: boolean;
  stampFlipY: boolean;
  materialExport: { bpm: number; bars: number };
  DRUM_PATTERN_OPTIONS: ReadonlyArray<{ value: string; label: string }>;
  DRUM_KITS: ReadonlyArray<{ value: string; label: string }>;
  BASS_PATTERN_OPTIONS: ReadonlyArray<{ value: string; label: string }>;
  setClipPreviewStep: (value: number | null) => void;
  setStatus: (value: string) => void;
}) {
  const melodicPreviewNotes = useMemo(() => {
    const bassNotes = args.loopComposer.notes.filter((note) => note.trackId === 'bass');
    if (bassNotes.length > 0) return bassNotes.slice().sort((a, b) => noteStartUnit(args.loopComposer, a) - noteStartUnit(args.loopComposer, b));
    const seeded = cloneLoopComposerState(args.loopComposer);
    seeded.notes = [];
    return buildBassPatternNotes(args.grooveMachine.bassPattern, seeded).sort((a, b) => noteStartUnit(seeded, a) - noteStartUnit(seeded, b));
  }, [args.loopComposer, args.grooveMachine.bassPattern]);

  const selectedMaterial = useMemo(() => args.materialEntries.find((entry) => entry.id === args.selectedMaterialId) ?? null, [args.materialEntries, args.selectedMaterialId]);
  const currentDrumPatternLabel = useMemo(() => args.DRUM_PATTERN_OPTIONS.find((entry) => entry.value === args.grooveMachine.drumPattern)?.label ?? args.grooveMachine.drumPattern, [args.DRUM_PATTERN_OPTIONS, args.grooveMachine.drumPattern]);
  const currentDrumKitLabel = useMemo(() => args.DRUM_KITS.find((entry) => entry.value === args.grooveMachine.drumKit)?.label ?? args.grooveMachine.drumKit, [args.DRUM_KITS, args.grooveMachine.drumKit]);
  const currentMelodicPresetLabel = useMemo(() => args.BASS_PATTERN_OPTIONS.find((entry) => entry.value === args.grooveMachine.bassPattern)?.label ?? args.grooveMachine.bassPattern, [args.BASS_PATTERN_OPTIONS, args.grooveMachine.bassPattern]);
  const selectedCustomStamp = useMemo(() => args.customStampEntries.find((entry) => entry.id === args.selectedStampId) ?? null, [args.customStampEntries, args.selectedStampId]);
  const selectedLoopNote = useMemo(() => args.loopComposer.notes.find((note) => note.id === args.loopComposer.selectedNoteId) ?? null, [args.loopComposer]);
  const selectedLoopTrack = useMemo(() => composerTrackById(args.loopComposer, args.loopComposer.selectedTrackId), [args.loopComposer]);

  const activeLoopPitchIndex = useMemo(() => {
    if (selectedLoopNote) {
      const idx = noteChannelIndex(args.loopComposer, selectedLoopNote);
      if (idx >= 0) return idx;
    }
    if (args.composerHover.stepIndex != null && args.composerHover.stepIndex >= 0) return args.composerHover.stepIndex;
    return Math.max(0, Math.floor(args.loopComposer.pitchSteps.length / 2));
  }, [selectedLoopNote, args.composerHover.stepIndex, args.loopComposer]);

  const activeLoopPitchStep = args.loopComposer.pitchSteps[activeLoopPitchIndex] ?? args.loopComposer.pitchSteps[0] ?? null;

  const composerGestureAuditionRef = useRef<{ signature: string; at: number }>({ signature: '', at: 0 });
  const previewComposerGesture = async (gesture: { trackId: string; channelIndex: number; note?: LoopNoteEvent | null; statusLabel?: string }) => {
    const signature = `${gesture.trackId}:${gesture.channelIndex}:${gesture.note?.id ?? 'grid'}:${Math.round(args.materialExport.bpm)}`;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (composerGestureAuditionRef.current.signature === signature && now - composerGestureAuditionRef.current.at < 80) return;
    composerGestureAuditionRef.current = { signature, at: now };
    try {
      const previewComposer = cloneLoopComposerState(args.loopComposer);
      const track = previewComposer.tracks.find((entry) => entry.id === gesture.trackId);
      if (!track) return;
      track.enabled = true;
      previewComposer.selectedTrackId = gesture.trackId;
      previewComposer.activeTrackIds = Array.from(new Set([...previewComposer.activeTrackIds, gesture.trackId]));
      const sourceNote = gesture.note ?? previewComposer.notes.find((entry) => entry.trackId === gesture.trackId) ?? null;
      const previewLineId = previewComposer.pitchLines[Math.max(0, Math.min(previewComposer.pitchLines.length - 1, gesture.channelIndex))]?.id;
      const previewNote = syncLoopNoteToState(previewComposer, sourceNote ? {
        ...sourceNote,
        id: `gesture-${gesture.trackId}`,
        channelIndex: gesture.channelIndex,
        lineId: previewLineId ?? sourceNote.lineId,
        startUnit: 0,
      } : {
        id: `gesture-${gesture.trackId}`,
        trackId: gesture.trackId,
        channelIndex: gesture.channelIndex,
        lineId: previewLineId,
        octaveOffset: 0,
        startUnit: 0,
        durationUnits: Math.max(1.5, previewComposer.stepsPerBar / 2),
        fadeInUnits: 0,
        fadeOutUnits: Math.max(0.5, previewComposer.stepsPerBar / 6),
        velocity: 0.92,
      });
      previewComposer.notes = [previewNote];
      previewComposer.selectedNoteId = previewNote.id;
      await startLoopComposerPreview({
        composer: previewComposer,
        bpm: args.materialExport.bpm,
        bars: previewComposer.bars,
        trackIds: [gesture.trackId],
        noteId: previewNote.id,
        onPlayhead: (stepFloat) => args.setClipPreviewStep(stepFloat),
        onEnded: () => args.setClipPreviewStep(null),
      });
      if (gesture.statusLabel) args.setStatus(gesture.statusLabel);
    } catch (error) {
      console.warn('[xensonar][loop-composer][gesture-audition]', error);
    }
  };

  const chordGhostNotes = useMemo(() => {
    if (!args.showChordGhost || args.composerHover.stepIndex == null || args.composerHover.gridStep == null) return [];
    if (args.lockTrackEditing && selectedLoopTrack.id !== args.loopComposer.selectedTrackId) return [];
    return buildChordGhostNotes(args.loopComposer, {
      trackId: selectedLoopTrack.id,
      rootChannelIndex: args.composerHover.stepIndex,
      startUnit: args.composerHover.gridStep,
      durationUnits: 2,
      voicing: args.chordVoicing,
      strumUnits: args.chordStrumSteps,
    });
  }, [args.showChordGhost, args.composerHover, selectedLoopTrack, args.lockTrackEditing, args.loopComposer, args.chordVoicing, args.chordStrumSteps]);

  const effectiveLoopPreviewSelection = useMemo(() => ({
    startSec: args.detailSelectionDirty ? args.detailSelectionStartSec : args.selectionStartSec,
    durationSec: args.detailSelectionDirty ? args.detailSelectionDurationSec : args.selectionDurationSec,
    isDetail: args.detailSelectionDirty,
  }), [args.detailSelectionDirty, args.detailSelectionStartSec, args.detailSelectionDurationSec, args.selectionStartSec, args.selectionDurationSec]);

  const detailViewportRange = useMemo(
    () => clampSelectionBounds(args.selectionStartSec, args.selectionDurationSec, Math.max(0.05, args.rawSourceAsset?.originalDuration ?? args.selectionDurationSec), 0.15),
    [args.selectionStartSec, args.selectionDurationSec, args.rawSourceAsset],
  );

  const detailSelectionVisibility = useMemo(() => {
    if (!args.detailSelectionDirty) return { state: 'none' as const, leftOverflow: false, rightOverflow: false };
    const viewportStart = detailViewportRange.startSec;
    const viewportEnd = detailViewportRange.startSec + detailViewportRange.durationSec;
    const detailStart = args.detailSelectionStartSec;
    const detailEnd = args.detailSelectionStartSec + args.detailSelectionDurationSec;
    const leftOverflow = detailStart < viewportStart;
    const rightOverflow = detailEnd > viewportEnd;
    if (detailEnd <= viewportStart || detailStart >= viewportEnd) {
      return { state: 'outside' as const, leftOverflow, rightOverflow };
    }
    if (leftOverflow || rightOverflow) {
      return { state: 'partial' as const, leftOverflow, rightOverflow };
    }
    return { state: 'inside' as const, leftOverflow, rightOverflow };
  }, [args.detailSelectionDirty, args.detailSelectionStartSec, args.detailSelectionDurationSec, detailViewportRange]);

  const destructiveAudioProfile = useMemo<DestructiveAudioProfile | null>(() => {
    if (!args.sourceAsset || args.selectionDirty) return null;
    const rangeDurationSec = Math.max(0.05, args.sourceAsset.importDurationSec);
    if (Math.abs(args.sourceAsset.importStartSec - args.selectionStartSec) > 0.02 || Math.abs(rangeDurationSec - Math.max(0.05, args.selectionDurationSec)) > 0.02) return null;
    const gains = buildDestructiveColumnGainProfile(args.spectralData, args.proxyBaselineSnapshotRef.current);
    if (!gains) return null;
    return {
      gains,
      rangeStartSec: args.sourceAsset.importStartSec,
      rangeDurationSec,
    };
  }, [args.sourceAsset, args.selectionDirty, args.selectionStartSec, args.selectionDurationSec, args.spectralData, args.revision]);

  const warpAudioProfile = useMemo<WarpAudioProfile | null>(() => {
    if (!args.sourceAsset || args.selectionDirty) return null;
    const rangeDurationSec = Math.max(0.05, args.sourceAsset.importDurationSec);
    if (Math.abs(args.sourceAsset.importStartSec - args.selectionStartSec) > 0.02 || Math.abs(rangeDurationSec - Math.max(0.05, args.selectionDurationSec)) > 0.02) return null;
    return buildWarpAudioProfile(args.warpTimeColumnsRef.current, args.warpPitchColumnsRef.current, args.sourceAsset.importStartSec, rangeDurationSec);
  }, [args.sourceAsset, args.selectionDirty, args.selectionStartSec, args.selectionDurationSec, args.warpVersion]);

  const selectionSeamScore = useMemo(() => args.rawSourceAsset ? buildSelectionLoopSeamScore(args.rawSourceAsset, effectiveLoopPreviewSelection.startSec, effectiveLoopPreviewSelection.durationSec) : 0, [args.rawSourceAsset, effectiveLoopPreviewSelection]);
  const stampSelectionOverlay = useMemo(() => {
    if (!args.stampSelStart || !args.stampSelEndRef.current) return null;
    return { x0: args.stampSelStart.x, y0: args.stampSelStart.y, x1: args.stampSelEndRef.current.x, y1: args.stampSelEndRef.current.y };
  }, [args.stampSelStart, args.revision, args.hoveredCell]);
  const stampPreviewOverlay = useMemo(() => {
    if (args.activeTool !== 'stamp' || args.stampPhase !== 'stamping' || !args.stampData || !args.hoveredCell) return null;
    const transform = {
      scaleX: args.stampScaleX,
      scaleY: args.stampScaleY,
      rotation: args.stampRotation,
      flipX: args.stampFlipX,
      flipY: args.stampFlipY,
    };
    const bounds = args.spectralData.getStampBounds(args.stampData, transform);
    return { centerX: args.hoveredCell.x, centerY: args.hoveredCell.y, halfW: bounds.halfW, halfH: bounds.halfH, outW: bounds.outW, outH: bounds.outH, stampData: args.stampData, transform };
  }, [args.activeTool, args.stampPhase, args.stampData, args.hoveredCell, args.spectralData, args.stampScaleX, args.stampScaleY, args.stampRotation, args.stampFlipX, args.stampFlipY]);

  return {
    melodicPreviewNotes,
    selectedMaterial,
    currentDrumPatternLabel,
    currentDrumKitLabel,
    currentMelodicPresetLabel,
    selectedCustomStamp,
    selectedLoopNote,
    selectedLoopTrack,
    activeLoopPitchIndex,
    activeLoopPitchStep,
    previewComposerGesture,
    chordGhostNotes,
    effectiveLoopPreviewSelection,
    detailViewportRange,
    detailSelectionVisibility,
    destructiveAudioProfile,
    warpAudioProfile,
    selectionSeamScore,
    stampSelectionOverlay,
    stampPreviewOverlay,
  };
}
