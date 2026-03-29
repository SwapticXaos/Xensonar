import { useEffect, useMemo, useRef, useState } from 'react';
import SpectralCanvas from './components/SpectralCanvas';
import Toolbar from './components/Toolbar';
import ToolSettings from './components/ToolSettings';
import TransportBar from './components/TransportBar';
import HarmonizerPanel from './components/HarmonizerPanel';
import BeatRuler from './components/BeatRuler';
import ProjectLibraryPanel from './components/ProjectLibraryPanel';
import MaterialLibraryPanel from './components/MaterialLibraryPanel';
import CustomStampLibraryPanel from './components/CustomStampLibraryPanel';
import { computeLoopDurationSec, DURATION, useStore } from './state/store';
import { audioEngine } from './audio/AudioEngine';
import { getMachineRoomDefinition, getTransitionGuidingSentence } from '../../xensonar/architecture/machineRooms';

function useForgeKeyboardScope(active: boolean, materialExport: ReturnType<typeof useStore.getState>['materialExport']) {
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
            if (sourceAsset && sourcePreviewMode !== 'forge') {
              const sourceMode = sourcePreviewMode === 'sourceFull' ? 'full' : 'window';
              void audioEngine.playSourceAsset(
                sourceAsset,
                sourceMode,
                pos,
                (p: number) => setPlayheadPosition(p),
                finish,
              );
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
                }
              );
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, isPlaying, materialExport, redo, setActiveTool, setIsPlaying, setPlayheadPosition, sourceAsset, sourcePreviewMode, spectralData, synthMode, toggleEraseMode, undo, waveformMix]);
}


export function SpectralForgeRoom({ onBack }: { onBack: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(true);
  const audioBufferDirty = useStore((s) => s.audioBufferDirty);
  const setAudioBufferDirty = useStore((s) => s.setAudioBufferDirty);
  const materialExport = useStore((s) => s.materialExport);
  const updateMaterialExport = useStore((s) => s.updateMaterialExport);

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  useEffect(() => {
    if (audioBufferDirty) {
      audioEngine.invalidateBuffer();
      setAudioBufferDirty(false);
    }
  }, [audioBufferDirty, setAudioBufferDirty]);

  useForgeKeyboardScope(focused, materialExport);

  const focusHint = useMemo(() => {
    return focused ? 'Tastatur aktiv für III.2' : 'Klicke in III.2, um die Werkbank-Shortcuts zu aktivieren';
  }, [focused]);

  const intendedLoopDuration = useMemo(() => computeLoopDurationSec(materialExport.bars, materialExport.bpm), [materialExport.bars, materialExport.bpm]);
  const legacyRoom = getMachineRoomDefinition('forgeLegacy');

  return (
    <section
      ref={rootRef}
      tabIndex={0}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
      onMouseDown={() => setFocused(true)}
      className="space-y-4 outline-none"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border border-neutral-800 bg-neutral-950/70 p-4">
        <div className="space-y-1">
          <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-300">III.2 Materialschmiede</div>
          <h2 className="text-lg font-semibold text-neutral-100">Spectral Forge · Malen, Rechnen, Importieren, Spielen</h2>
          <p className="max-w-3xl text-xs leading-relaxed text-neutral-400">
            Kein Live-Instrument, sondern Werkbankraum: Spektrales Material wird hier gezeichnet, verformt, importiert und als Stoff vorbereitet. Die Vorschau bleibt lokal; spätere Kopplung an Xensonar läuft über Export- und Materialpfade.
          </p>
          <div className="rounded border border-cyan-900/40 bg-cyan-950/15 px-3 py-2 text-[11px] leading-relaxed text-neutral-400">
            <span className="mr-2 uppercase tracking-[0.2em] text-cyan-300">{legacyRoom.stageLabel}</span>
            {legacyRoom.summary} {getTransitionGuidingSentence()}
          </div>
          <div className="text-[11px] text-neutral-500">Aktuelle Loop-Länge bei {materialExport.bpm}  BPM: {intendedLoopDuration.toFixed(2)}s · {materialExport.bars} Takte</div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button type="button" onClick={onBack} className="border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:bg-neutral-900">← Zurück zu V</button>
          <span className={`rounded border px-2 py-1 ${focused ? 'border-cyan-500/70 text-cyan-300' : 'border-neutral-700 text-neutral-500'}`}>{focusHint}</span>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="space-y-3">
          <div className="grid gap-3 border border-neutral-800 bg-neutral-950/70 p-3 md:grid-cols-6">
            <label className="space-y-1 text-xs text-neutral-400 md:col-span-2">
              <span className="block uppercase tracking-[0.2em] text-neutral-500">Materialname</span>
              <input
                value={materialExport.name}
                onChange={(e) => updateMaterialExport({ name: e.target.value })}
                className="w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100"
              />
            </label>
            <label className="space-y-1 text-xs text-neutral-400">
              <span className="block uppercase tracking-[0.2em] text-neutral-500">Rolle</span>
              <select
                value={materialExport.role}
                onChange={(e) => updateMaterialExport({ role: e.target.value as typeof materialExport.role })}
                className="w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100"
              >
                <option value="loop">Loop</option>
                <option value="waveMaterial">Wellenstarter-Material</option>
                <option value="particleExciter">Partikel-Exciter</option>
                <option value="droneTexture">Drone-Textur</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-neutral-400">
              <span className="block uppercase tracking-[0.2em] text-neutral-500">Tempo</span>
              <input
                type="number"
                min={40}
                max={320}
                value={materialExport.bpm}
                onChange={(e) => updateMaterialExport({ bpm: Math.max(40, Math.min(320, Number(e.target.value) || 0)) })}
                className="w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100"
              />
            </label>
            <label className="space-y-1 text-xs text-neutral-400">
              <span className="block uppercase tracking-[0.2em] text-neutral-500">Anzahl Takte</span>
              <input
                type="number"
                min={1}
                max={16}
                value={materialExport.bars}
                onChange={(e) => updateMaterialExport({ bars: Math.max(1, Math.min(16, Number(e.target.value) || 1)) })}
                className="w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100"
              />
            </label>
            <label className="space-y-1 text-xs text-neutral-400 md:col-span-2">
              <span className="block uppercase tracking-[0.2em] text-neutral-500">Taktsegmente (Orientierungsmarker)</span>
              <input
                type="number"
                min={1}
                max={16}
                value={materialExport.guideSegments}
                onChange={(e) => updateMaterialExport({ guideSegments: Math.max(1, Math.min(16, Number(e.target.value) || 1)) })}
                className="w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100"
              />
            </label>
          </div>
          <BeatRuler />

          <div className="flex min-h-[720px] overflow-hidden border border-neutral-800 bg-gray-950 text-white select-none">
            <Toolbar />
            <div className="flex min-w-0 flex-1 flex-col">
              <SpectralCanvas />
              <TransportBar />
              <ToolSettings />
            </div>
            <HarmonizerPanel />
          </div>
        </div>

        <aside className="space-y-3 border border-neutral-800 bg-neutral-950/70 p-3 text-xs text-neutral-400">
          <div>
            <div className="mb-1 uppercase tracking-[0.2em] text-neutral-500">Integrationsstatus</div>
            <p>III.2 ist eingebettet, lokal fokussiert und exportiert Material bereits adapterfähig. Neu getrennt sind jetzt die Bibliothek für Custom-Stempel und die Materialdatenbank für Loops/Materialien.</p>
          </div>
          <div>
            <div className="mb-1 uppercase tracking-[0.2em] text-neutral-500">Werkzeugbegriffe</div>
            <ul className="space-y-1">
              <li>Material-Operatoren statt Harmonizer</li>
              <li>Körnung statt Grain</li>
              <li>Verformen statt Morph</li>
              <li>Vorschau statt globalem Transport</li>
            </ul>
          </div>
          <div>
            <div className="mb-1 uppercase tracking-[0.2em] text-neutral-500">Zwei Ebenen</div>
            <p>Custom-Stempel sind editierbare Bausteine des visuellen Samplers und bleiben in III.2. Material-/Loop-Exporte sind die zweite Ebene; nur Einträge mit Rolle „Loop“ erscheinen später in Room V.</p>
          </div>
          <div>
            <div className="mb-1 uppercase tracking-[0.2em] text-neutral-500">Leitplanke</div>
            <p>III.2 darf direktes Spielen in Room V nicht belasten. Deshalb bleibt die Vorschau lokal und die spätere Stoffkopplung läuft zuerst über Material-Loops, nicht über Wellenstarter- oder Partikel-Attacks.</p>
          </div>
          <ProjectLibraryPanel />
          <CustomStampLibraryPanel />
          <MaterialLibraryPanel />
        </aside>
      </div>
    </section>
  );
}
