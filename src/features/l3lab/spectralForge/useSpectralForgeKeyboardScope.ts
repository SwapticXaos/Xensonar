import { useEffect } from 'react';
import { audioEngine } from './audio/AudioEngine';
import { buildBodyFromForgeMainPath } from './body/mediatedAudioBodyFactory';
import { playSpectralForgeBasisHearingPreview } from './components/transportBar/spectralForgeBasisHearingPreview';
import { getForge3BodyField } from '../forge3/bodyField';
import { computeLoopDurationSec, DURATION, useStore } from './state/store';
import type { Forge3AudioMode, SpectralForgeRoomVariant } from './types/spectralForgeUiTypes';

export function useSpectralForgeKeyboardScope(
  active: boolean,
  materialExport: ReturnType<typeof useStore.getState>['materialExport'],
  variant: SpectralForgeRoomVariant = 'legacy',
  forge3AudioMode: Forge3AudioMode = 'classic',
) {
  const setActiveTool = useStore((s) => s.setActiveTool);
  const toggleEraseMode = useStore((s) => s.toggleEraseMode);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const isPlaying = useStore((s) => s.isPlaying);
  const setIsPlaying = useStore((s) => s.setIsPlaying);
  const setPlayheadPosition = useStore((s) => s.setPlayheadPosition);
  const spectralData = useStore((s) => s.spectralData);
  const synthMode = useStore((s) => s.synthMode);
  const waveformMix = useStore((s) => s.waveformMix);
  const sourceAsset = useStore((s) => s.sourceAsset);
  const sourcePreviewMode = useStore((s) => s.sourcePreviewMode);

  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (!active) return;
      const state = useStore.getState();
      const keyLower = e.key.toLowerCase();
      const target = e.target as HTMLElement | null;
      const editableTarget = !!target && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target.isContentEditable);
      const rangeTarget = target instanceof HTMLInputElement && target.type === 'range';
      if (editableTarget && !rangeTarget) return;
      const isStampScalingHotkey = state.activeTool === 'stamp' && state.stampPhase === 'stamping' && !!state.stampData && ['arrowright', 'arrowleft', 'arrowup', 'arrowdown', 'q', 'e'].includes(keyLower);
      if (isStampScalingHotkey) {
        if (rangeTarget) target.blur();
        e.preventDefault();
        switch (keyLower) {
          case 'arrowright': state.adjustStampScale(0.08, 0); return;
          case 'arrowleft': state.adjustStampScale(-0.08, 0); return;
          case 'arrowup': state.adjustStampScale(0, 0.08); return;
          case 'arrowdown': state.adjustStampScale(0, -0.08); return;
          case 'q': state.rotateStamp(-Math.PI / 32); return;
          case 'e': state.rotateStamp(Math.PI / 32); return;
        }
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); undo(); return; }
        if (e.key === 'y') { e.preventDefault(); redo(); return; }
      }

      switch (e.key.toLowerCase()) {
        case 'b': setActiveTool('brush'); break;
        case 'h': setActiveTool('hardBrush'); break;
        case 'l': setActiveTool('line'); break;
        case 'a': setActiveTool('harmonicBrush'); break;
        case 'n': setActiveTool('noiseBrush'); break;
        case 's': setActiveTool('spray'); break;
        case 'f': setActiveTool('formant'); break;
        case 't': setActiveTool('stamp'); break;
        case 'm': setActiveTool('morph'); break;
        case 'j': setActiveTool('smudge'); break;
        case 'd': setActiveTool('dodgeBurn'); break;
        case 'k': setActiveTool('blurSharpen'); break;
        case 'y': setActiveTool('delaySmear'); break;
        case 'r': setActiveTool('threshold'); break;
        case 'u': setActiveTool('sourceTrace'); break;
        case 'x': toggleEraseMode(); break;
        case 'arrowright': {
          const state = useStore.getState();
          if (state.activeTool === 'stamp' && state.stampPhase === 'stamping' && state.stampData) {
            e.preventDefault();
            state.adjustStampScale(0.08, 0);
          }
          break;
        }
        case 'arrowleft': {
          const state = useStore.getState();
          if (state.activeTool === 'stamp' && state.stampPhase === 'stamping' && state.stampData) {
            e.preventDefault();
            state.adjustStampScale(-0.08, 0);
          }
          break;
        }
        case 'arrowup': {
          const state = useStore.getState();
          if (state.activeTool === 'stamp' && state.stampPhase === 'stamping' && state.stampData) {
            e.preventDefault();
            state.adjustStampScale(0, 0.08);
          }
          break;
        }
        case 'arrowdown': {
          const state = useStore.getState();
          if (state.activeTool === 'stamp' && state.stampPhase === 'stamping' && state.stampData) {
            e.preventDefault();
            state.adjustStampScale(0, -0.08);
          }
          break;
        }
        case 'q': {
          const state = useStore.getState();
          if (state.activeTool === 'stamp' && state.stampPhase === 'stamping') state.rotateStamp(-Math.PI / 32);
          break;
        }
        case 'e': {
          const state = useStore.getState();
          if (state.activeTool === 'stamp' && state.stampPhase === 'stamping') state.rotateStamp(Math.PI / 32);
          break;
        }
        case 'g': {
          const state = useStore.getState();
          state.setShowGrainLayer(!state.showGrainLayer);
          break;
        }
        case ' ':
          e.preventDefault();
          if (isPlaying) {
            audioEngine.stop();
            setIsPlaying(false);
            setPlayheadPosition(0);
          } else {
            const pos = useStore.getState().playheadPosition;
            setIsPlaying(true);
            const previewDurationSec = computeLoopDurationSec(materialExport.bars, materialExport.bpm);
            const previewPlaybackRate = DURATION / Math.max(0.05, previewDurationSec);
            const finish = () => { setIsPlaying(false); setPlayheadPosition(0); };
            if (variant === 'forge3' && sourceAsset && sourcePreviewMode === 'forge') {
              if (forge3AudioMode === 'body') {
                const body = buildBodyFromForgeMainPath(spectralData, getForge3BodyField(), sourceAsset);
                void audioEngine.playFromMediatedAudioBody(body, {
                  sourceAsset,
                  loopDurationSec: previewDurationSec,
                  fromPosition: pos,
                  onPosition: (p: number) => setPlayheadPosition(p),
                  onEnd: finish,
                  renderMode: 'body_contract_preview',
                });
              } else {
                void audioEngine.playForge3BodyPreview(
                  sourceAsset,
                  spectralData,
                  getForge3BodyField(),
                  previewDurationSec,
                  pos,
                  (p: number) => setPlayheadPosition(p),
                  finish,
                );
              }
            } else if (sourceAsset && sourcePreviewMode !== 'forge') {
              const sourceMode = sourcePreviewMode === 'sourceFull' ? 'full' : 'window';
              void audioEngine.playSourceAsset(
                sourceAsset,
                sourceMode,
                pos,
                (p: number) => setPlayheadPosition(p),
                finish,
              );
            } else if (state.carrierIntegralSelection.source !== 'default') {
              void playSpectralForgeBasisHearingPreview({
                snapshot: state.createProjectSnapshot(),
                machineId: state.carrierIntegralSelection.machineId,
                selection: state.carrierIntegralSelection,
                synthLab: state.carrierIntegralSynthLab,
                harmonicXplore: state.carrierIntegralHarmonicXplore,
                previewBpm: materialExport.bpm,
                previewGain: 1,
                previewPitchSemitones: 0,
                onAudioPosition: (p: number) => setPlayheadPosition(p),
                onAudioEnd: finish,
              }).then((result) => {
                if (!result.played) finish();
              }).catch((error) => {
                console.error('[xensonar][spectralforge][basis-hearing-hotkey]', error);
                finish();
              });
            } else {
              void audioEngine.play(
                spectralData,
                synthMode,
                waveformMix,
                pos,
                (p: number) => setPlayheadPosition(p),
                finish,
                undefined,
                {
                  beatGuideAudible: materialExport.beatGuideAudible,
                  beatGuideVolume: materialExport.beatGuideVolume,
                  bars: materialExport.bars,
                  guideSegments: materialExport.guideSegments,
                  guideMarkers: materialExport.guideMarkers,
                  loopPreview: materialExport.loopPreview,
                  loopDurationSec: previewDurationSec,
                  playbackRate: previewPlaybackRate,
                },
              );
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, forge3AudioMode, isPlaying, materialExport, redo, setActiveTool, setIsPlaying, setPlayheadPosition, sourceAsset, sourcePreviewMode, spectralData, synthMode, toggleEraseMode, undo, variant, waveformMix]);
}
