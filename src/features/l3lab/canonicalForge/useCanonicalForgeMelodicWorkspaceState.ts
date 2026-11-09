import { useState } from 'react';
import type { CanonicalForgeInitialState } from './canonicalForgeInitialState';
import type { LoopTimeGuideMarker, PendingImageImport } from './loopDrumDomain';
import type { SavedMelodicProject } from './melodicProjectLibrary';
import { loadSavedMelodicProjects } from './melodicProjectLibrary';
import type { SavedMelodicSampleMeta } from './melodicSampleLibrary';
import type { MelodicPatternLinkMap, MelodicPatternVariantMap } from './melodicPatternStoreContract';

type CanonicalForgeMelodicWorkspaceInitialState = Pick<
  CanonicalForgeInitialState,
  | 'loopComposer'
  | 'loopPatternVariants'
  | 'loopPatternLinks'
  | 'selectedMelodicProjectId'
  | 'autoZoomOnDenseOverlap'
  | 'lockTrackEditing'
  | 'chordVoicing'
  | 'chordStrumSteps'
  | 'chordVelocitySlope'
>;

export function useCanonicalForgeMelodicWorkspaceState(
  initialState: CanonicalForgeMelodicWorkspaceInitialState,
) {
  const [loopComposer, setLoopComposer] = useState(() => initialState.loopComposer);
  const [loopPatternVariants, setLoopPatternVariants] = useState<MelodicPatternVariantMap>(() => initialState.loopPatternVariants);
  const [loopPatternLinks, setLoopPatternLinks] = useState<MelodicPatternLinkMap>(() => initialState.loopPatternLinks);
  const [savedMelodicProjects, setSavedMelodicProjects] = useState<SavedMelodicProject[]>(() => loadSavedMelodicProjects());
  const [selectedMelodicProjectId, setSelectedMelodicProjectId] = useState(() => initialState.selectedMelodicProjectId);
  const [melodicSampleEntries, setMelodicSampleEntries] = useState<SavedMelodicSampleMeta[]>([]);
  const [autoZoomOnDenseOverlap, setAutoZoomOnDenseOverlap] = useState(() => initialState.autoZoomOnDenseOverlap);
  const [lockTrackEditing, setLockTrackEditing] = useState(() => initialState.lockTrackEditing);
  const [chordVoicing, setChordVoicing] = useState(() => initialState.chordVoicing);
  const [chordStrumSteps, setChordStrumSteps] = useState(() => initialState.chordStrumSteps);
  const [chordVelocitySlope, setChordVelocitySlope] = useState(() => initialState.chordVelocitySlope);
  const [pendingImageImport, setPendingImageImport] = useState<PendingImageImport | null>(null);
  const [materialFragmentGuideSnapshot, setMaterialFragmentGuideSnapshot] = useState<LoopTimeGuideMarker[] | null>(null);
  const [clipPreviewStep, setClipPreviewStep] = useState<number | null>(null);
  const [selectionLoopPreviewPlaying, setSelectionLoopPreviewPlaying] = useState(false);
  const [, setSelectionLoopPreviewPlayheadSec] = useState<number | null>(null);

  return {
    loopComposer,
    setLoopComposer,
    loopPatternVariants,
    setLoopPatternVariants,
    loopPatternLinks,
    setLoopPatternLinks,
    savedMelodicProjects,
    setSavedMelodicProjects,
    selectedMelodicProjectId,
    setSelectedMelodicProjectId,
    melodicSampleEntries,
    setMelodicSampleEntries,
    autoZoomOnDenseOverlap,
    setAutoZoomOnDenseOverlap,
    lockTrackEditing,
    setLockTrackEditing,
    chordVoicing,
    setChordVoicing,
    chordStrumSteps,
    setChordStrumSteps,
    chordVelocitySlope,
    setChordVelocitySlope,
    pendingImageImport,
    setPendingImageImport,
    materialFragmentGuideSnapshot,
    setMaterialFragmentGuideSnapshot,
    clipPreviewStep,
    setClipPreviewStep,
    selectionLoopPreviewPlaying,
    setSelectionLoopPreviewPlaying,
    setSelectionLoopPreviewPlayheadSec,
  };
}
