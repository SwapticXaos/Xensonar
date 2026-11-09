import { audioEngine } from '../spectralForge/audio/AudioEngine';
import type { SpectralData } from '../spectralForge/audio/SpectralData';
import { cloneLoopComposerState, composerTrackById, syncLoopNoteToState, type DrumComputerState, type GrooveMachineConfig, type LoopComposerState } from './loopDrumDomain';
import { startLoopComposerPreview, stopLoopComposerPreview } from './loopPreview';
import type { SynthMode, WaveformMix } from './selectionAudioTransfer';

export type ForgePlaybackStateActions = {
  stopPreviewAudio: () => void;
  stopSelectionLoopPreview: () => void;
  setIsPlaying: (value: boolean) => void;
  setPlayheadPosition: (value: number) => void;
  setClipPreviewStep: (value: number | null) => void;
  setStatus: (value: string) => void;
};

export function stopAllForge2Preview(params: {
  actions: ForgePlaybackStateActions;
  statusMessage?: string;
}) {
  const { actions, statusMessage = 'Vorschau gestoppt.' } = params;
  audioEngine.stop();
  actions.stopPreviewAudio();
  stopLoopComposerPreview();
  actions.stopSelectionLoopPreview();
  actions.setIsPlaying(false);
  actions.setPlayheadPosition(0);
  actions.setClipPreviewStep(null);
  actions.setStatus(statusMessage);
}

export async function startMaterialGroovePreview(params: {
  withDrums: boolean;
  trackMode?: 'visible' | 'enabled';
  spectralData: SpectralData;
  synthMode: SynthMode;
  waveformMix: WaveformMix;
  loopDurationSec: number;
  materialExport: {
    beatGuideAudible: boolean;
    beatGuideVolume: number;
    bars: number;
    guideSegments: number;
    guideMarkers: number[];
    loopPreview: boolean;
    bpm: number;
  };
  loopComposer: LoopComposerState;
  grooveMachine: GrooveMachineConfig;
  drumComputer: DrumComputerState;
  actions: ForgePlaybackStateActions;
}) {
  const {
    withDrums,
    trackMode = 'visible',
    spectralData,
    synthMode,
    waveformMix,
    loopDurationSec,
    materialExport,
    loopComposer,
    grooveMachine,
    drumComputer,
    actions,
  } = params;
  try {
    stopAllForge2Preview({ actions, statusMessage: 'Starte Materialspur mit Groove ...' });
    const trackIds = (trackMode === 'visible'
      ? loopComposer.activeTrackIds
      : loopComposer.tracks.filter((track) => track.enabled).map((track) => track.id)
    ).filter((trackId) => composerTrackById(loopComposer, trackId)?.enabled);
    actions.setIsPlaying(true);
    const finish = () => {
      actions.setIsPlaying(false);
      actions.setPlayheadPosition(0);
      stopLoopComposerPreview();
      actions.setClipPreviewStep(null);
      actions.setStatus(withDrums ? 'Materialspur + Groove beendet.' : 'Materialspur + Clip-Spuren beendet.');
    };
    const previewPlaybackRate = 10 / Math.max(0.05, loopDurationSec);
    await audioEngine.play(
      spectralData,
      synthMode,
      waveformMix,
      0,
      actions.setPlayheadPosition,
      finish,
      undefined,
      {
        beatGuideAudible: materialExport.beatGuideAudible,
        beatGuideVolume: materialExport.beatGuideVolume,
        bars: materialExport.bars,
        guideSegments: materialExport.guideSegments,
        guideMarkers: materialExport.guideMarkers,
        loopPreview: materialExport.loopPreview,
        loopDurationSec,
        playbackRate: previewPlaybackRate,
      },
    );
    await startLoopComposerPreview({
      composer: loopComposer,
      bpm: materialExport.bpm,
      bars: loopComposer.bars,
      trackIds,
      drumPattern: withDrums && !drumComputer.useCustom ? grooveMachine.drumPattern as any : undefined,
      drumKit: withDrums ? grooveMachine.drumKit as any : undefined,
      drumLevel: withDrums ? 0.9 : undefined,
      customDrumPattern: withDrums && drumComputer.useCustom ? drumComputer : null,
      drumLaneKitOverrides: withDrums ? grooveMachine.drumLaneKitOverrides as any : undefined,
      drumLaneSettings: withDrums ? grooveMachine.drumLaneSettings as any : undefined,
      onPlayhead: (stepFloat) => actions.setClipPreviewStep(stepFloat),
      onEnded: () => {
        actions.setClipPreviewStep(null);
      },
    });
    actions.setStatus(withDrums ? 'Materialspur mit Drums + Clip-Spuren vorgehört.' : 'Materialspur mit Clip-Spuren vorgehört.');
  } catch (error) {
    console.error('[xensonar][forge2][material-groove-preview]', error);
    stopAllForge2Preview({ actions, statusMessage: `Material-/Groove-Vorschau fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}` });
  }
}

export async function startDrumPreview(params: {
  withTracks?: 'none' | 'visible' | 'enabled';
  loopComposer: LoopComposerState;
  materialExport: { bpm: number };
  grooveMachine: GrooveMachineConfig;
  drumComputer: DrumComputerState;
  actions: ForgePlaybackStateActions;
}) {
  const {
    withTracks = 'none',
    loopComposer,
    materialExport,
    grooveMachine,
    drumComputer,
    actions,
  } = params;
  try {
    stopAllForge2Preview({ actions, statusMessage: 'Starte Drum-Vorschau ...' });
    const trackIds = withTracks === 'visible'
      ? loopComposer.activeTrackIds.filter((trackId) => composerTrackById(loopComposer, trackId)?.enabled)
      : withTracks === 'enabled'
        ? loopComposer.tracks.filter((track) => track.enabled).map((track) => track.id)
        : [];
    await startLoopComposerPreview({
      composer: loopComposer,
      bpm: materialExport.bpm,
      bars: loopComposer.bars,
      trackIds,
      drumPattern: !drumComputer.useCustom ? grooveMachine.drumPattern as any : undefined,
      drumKit: grooveMachine.drumKit as any,
      drumLevel: 0.92,
      customDrumPattern: drumComputer.useCustom ? drumComputer : null,
      drumLaneKitOverrides: grooveMachine.drumLaneKitOverrides as any,
      drumLaneSettings: grooveMachine.drumLaneSettings as any,
      loop: true,
      onPlayhead: (stepFloat) => actions.setClipPreviewStep(stepFloat),
      onEnded: () => {
        actions.setClipPreviewStep(null);
        actions.setStatus(withTracks === 'none' ? 'Drum-Vorschau beendet.' : 'Groove-Vorschau beendet.');
      },
    });
    actions.setStatus(withTracks === 'none' ? 'Drum-Pattern läuft in der Vorschau-Schleife.' : 'Drums mit Clip-Spuren laufen in der Vorschau-Schleife.');
  } catch (error) {
    console.error('[xensonar][forge2][drum-preview]', error);
    actions.setClipPreviewStep(null);
    actions.setStatus(`Drum-Vorschau fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function startEnabledTracksPreview(params: {
  loopComposer: LoopComposerState;
  materialExport: { bpm: number };
  actions: ForgePlaybackStateActions;
}) {
  const { loopComposer, materialExport, actions } = params;
  try {
    stopAllForge2Preview({ actions, statusMessage: 'Starte Loop-Vorschau der aktiven Instrumente ...' });
    const trackIds = loopComposer.tracks.filter((track) => track.enabled).map((track) => track.id);
    await startLoopComposerPreview({
      composer: loopComposer,
      bpm: materialExport.bpm,
      bars: loopComposer.bars,
      trackIds,
      loop: true,
      onPlayhead: (stepFloat) => actions.setClipPreviewStep(stepFloat),
    });
    actions.setStatus('Aktive Instrumente laufen in der Vorschau-Schleife.');
  } catch (error) {
    console.error('[xensonar][forge2][enabled-track-preview]', error);
    actions.setClipPreviewStep(null);
    actions.setStatus(`Vorschau der aktiven Instrumente fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
  }
}


export async function previewTrackInstrumentSelection(params: {
  trackId: string;
  presetId: string;
  loopComposer: LoopComposerState;
  materialExport: { bpm: number };
  actions: ForgePlaybackStateActions;
}) {
  const { trackId, presetId, loopComposer, materialExport, actions } = params;
  try {
    stopAllForge2Preview({ actions, statusMessage: 'Höre Instrumentwahl vor ...' });
    const previewComposer = cloneLoopComposerState(loopComposer);
    const track = previewComposer.tracks.find((entry) => entry.id === trackId);
    if (!track) throw new Error('Spur nicht gefunden');
    track.instrumentPreset = presetId;
    track.enabled = true;
    previewComposer.selectedTrackId = trackId;
    previewComposer.activeTrackIds = Array.from(new Set([...previewComposer.activeTrackIds, trackId]));
    const sourceNote = previewComposer.notes.find((note) => note.trackId === trackId);
    const previewNote = syncLoopNoteToState(previewComposer, sourceNote ? { ...sourceNote, id: `audition-${trackId}` } : {
      id: `audition-${trackId}`,
      trackId,
      channelIndex: Math.max(0, Math.min(previewComposer.pitchSteps.length - 1, Math.floor(previewComposer.pitchSteps.length * 0.45))),
      lineId: previewComposer.pitchLines[Math.max(0, Math.min(previewComposer.pitchLines.length - 1, Math.floor(previewComposer.pitchLines.length * 0.45)))]?.id,
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
      bpm: materialExport.bpm,
      bars: previewComposer.bars,
      trackIds: [trackId],
      noteId: previewNote.id,
      onPlayhead: (stepFloat) => actions.setClipPreviewStep(stepFloat),
      onEnded: () => {
        actions.setClipPreviewStep(null);
        actions.setStatus('Instrumentwahl vorgehört.');
      },
    });
    actions.setStatus('Instrumentwahl läuft.');
  } catch (error) {
    console.error('[xensonar][forge2][instrument-audition]', error);
    actions.setClipPreviewStep(null);
    actions.setStatus(`Instrument-Vorhören fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function startSpecificTrackPreview(params: {
  trackId: string;
  loopComposer: LoopComposerState;
  materialExport: { bpm: number };
  actions: ForgePlaybackStateActions;
}) {
  const { trackId, loopComposer, materialExport, actions } = params;
  try {
    stopAllForge2Preview({ actions, statusMessage: 'Starte Spur-Vorschau ...' });
    await startLoopComposerPreview({
      composer: loopComposer,
      bpm: materialExport.bpm,
      bars: loopComposer.bars,
      trackIds: [trackId],
      onPlayhead: (stepFloat) => actions.setClipPreviewStep(stepFloat),
      onEnded: () => {
        actions.setClipPreviewStep(null);
        actions.setStatus('Spurvorschau beendet.');
      },
    });
    actions.setStatus('Spur vorgehört.');
  } catch (error) {
    console.error('[xensonar][forge2][track-preview]', error);
    actions.setClipPreviewStep(null);
    actions.setStatus(`Spurvorschau fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
  }
}
