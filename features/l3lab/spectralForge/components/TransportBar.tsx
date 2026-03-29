import { useState, useCallback, useRef, useEffect } from 'react';
import { useStore, DURATION, computeLoopDurationSec, type SourcePreviewMode } from '../state/store';
import { audioEngine } from '../audio/AudioEngine';
import {
  prepareAudioSourceAsset,
  importAudioSourceToSpectralData,
  retargetAudioSourceAsset,
  renderAudioImportPreview,
  attachAnalysisCacheToSourceAsset,
  type AudioSourceAsset,
  type AudioImportReadMode,
} from '../audio/AudioImporter';
import {
  importImageElementToSpectralData,
  loadImageElementFromFile,
  renderImageImportPreview,
  type ImageImportFitMode,
  type ImageImportReadMode,
} from '../audio/ImageImporter';
import { registerExternalMaterialPackage } from '../../materialLibrary';
import { createMaterialManifest, createMaterialPackageFromExport } from '../../materialAdapter';

function sanitizeName(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') || 'spectral-material';
}

interface PendingImageImport {
  file: File;
  image: HTMLImageElement;
  fitMode: ImageImportFitMode;
  shiftX: number;
  shiftY: number;
  contrast: number;
  readMode: ImageImportReadMode;
}

interface PendingAudioImport {
  file: File;
  source: AudioSourceAsset;
  startSec: number;
  readMode: AudioImportReadMode;
}


export default function TransportBar() {
  const spectralData = useStore((s) => s.spectralData);
  const synthMode = useStore((s) => s.synthMode);
  const waveformMix = useStore((s) => s.waveformMix);
  const isPlaying = useStore((s) => s.isPlaying);
  const setIsPlaying = useStore((s) => s.setIsPlaying);
  const playheadPosition = useStore((s) => s.playheadPosition);
  const setPlayheadPosition = useStore((s) => s.setPlayheadPosition);
  const setShowPlayheadMarker = useStore((s) => s.setShowPlayheadMarker);
  const pushUndo = useStore((s) => s.pushUndo);
  const triggerRender = useStore((s) => s.triggerRender);
  const materialExport = useStore((s) => s.materialExport);
  const updateMaterialExport = useStore((s) => s.updateMaterialExport);
  const sourceAsset = useStore((s) => s.sourceAsset);
  const setSourceAsset = useStore((s) => s.setSourceAsset);
  const sourcePreviewMode = useStore((s) => s.sourcePreviewMode);
  const setSourcePreviewMode = useStore((s) => s.setSourcePreviewMode);

  const previewDurationSec = computeLoopDurationSec(materialExport.bars, materialExport.bpm);
  const previewPlaybackRate = DURATION / Math.max(0.05, previewDurationSec);

  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [pendingImageImport, setPendingImageImport] = useState<PendingImageImport | null>(null);
  const [pendingAudioImport, setPendingAudioImport] = useState<PendingAudioImport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagePreviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioPreviewCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const pending = pendingImageImport;
    const canvas = imagePreviewCanvasRef.current;
    if (!pending || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderImageImportPreview(ctx, pending.image, pending.image.naturalWidth, pending.image.naturalHeight, {
      fitMode: pending.fitMode,
      shiftX: pending.shiftX,
      shiftY: pending.shiftY,
      contrast: pending.contrast,
      readMode: pending.readMode,
    }, canvas.width, canvas.height);
  }, [pendingImageImport]);

  useEffect(() => {
    const pending = pendingAudioImport;
    const canvas = audioPreviewCanvasRef.current;
    if (!pending || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const retargeted = retargetAudioSourceAsset(pending.source, { startSec: pending.startSec });
    renderAudioImportPreview(ctx, retargeted, canvas.width, canvas.height, 'window');
  }, [pendingAudioImport]);

  const closeImageImport = useCallback(() => {
    setPendingImageImport(null);
    setRenderProgress(0);
  }, []);

  const closeAudioImport = useCallback(() => {
    setPendingAudioImport(null);
    setRenderProgress(0);
  }, []);

  const getActivePreviewDuration = useCallback(() => {
    if (sourceAsset && sourcePreviewMode === 'sourceFull') return Math.max(0.05, sourceAsset.originalDuration);
    if (sourceAsset && sourcePreviewMode === 'sourceWindow') return Math.max(0.05, sourceAsset.importDurationSec);
    return previewDurationSec;
  }, [previewDurationSec, sourceAsset, sourcePreviewMode]);

  const handlePlay = useCallback(async () => {
    if (isPlaying) {
      audioEngine.stop();
      setIsPlaying(false);
      return;
    }

    setRendering(true);
    setIsPlaying(true);
    setShowPlayheadMarker(true);

    const finish = () => {
      setIsPlaying(false);
      setPlayheadPosition(0);
      setShowPlayheadMarker(false);
    };

    try {
      if (sourceAsset && sourcePreviewMode !== 'forge') {
        await audioEngine.playSourceAsset(
          sourceAsset,
          sourcePreviewMode === 'sourceFull' ? 'full' : 'window',
          playheadPosition,
          (pos: number) => setPlayheadPosition(pos),
          finish,
        );
      } else {
        await audioEngine.play(
          spectralData,
          synthMode,
          waveformMix,
          playheadPosition,
          (pos: number) => setPlayheadPosition(pos),
          finish,
          (progress: number) => setRenderProgress(progress),
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
    } catch (err) {
      console.error('Playback error:', err);
      setIsPlaying(false);
    } finally {
      setRendering(false);
    }
  }, [
    isPlaying,
    materialExport.bars,
    materialExport.beatGuideAudible,
    materialExport.beatGuideVolume,
    materialExport.guideMarkers,
    materialExport.guideSegments,
    materialExport.loopPreview,
    playheadPosition,
    previewDurationSec,
    previewPlaybackRate,
    setIsPlaying,
    setPlayheadPosition,
    setShowPlayheadMarker,
    sourceAsset,
    sourcePreviewMode,
    spectralData,
    synthMode,
    waveformMix,
  ]);

  const handleStop = useCallback(() => {
    audioEngine.stop();
    setIsPlaying(false);
    setPlayheadPosition(0);
    setShowPlayheadMarker(false);
  }, [setIsPlaying, setPlayheadPosition, setShowPlayheadMarker]);

  const handleExport = useCallback(async () => {
    setRendering(true);
    setStatusMessage('Exportiere Material (WAV + JSON)...');
    try {
      const safeName = sanitizeName(materialExport.name);
      const blob = await audioEngine.exportWAV(spectralData, synthMode, waveformMix, (p: number) => setRenderProgress(p));
      const audioUrl = URL.createObjectURL(blob);
      const audioAnchor = document.createElement('a');
      audioAnchor.href = audioUrl;
      audioAnchor.download = `${safeName}.wav`;
      audioAnchor.click();
      URL.revokeObjectURL(audioUrl);

      const metadata = {
        name: materialExport.name,
        role: materialExport.role,
        bpm: materialExport.bpm,
        bars: materialExport.bars,
        guideSegments: materialExport.guideSegments,
        guideMarkers: materialExport.guideMarkers,
        loopStartSec: 0,
        loopEndSec: DURATION,
        rootHz: null,
        sourceVersion: 'xensonar-l3lab-v1',
        renderMode: synthMode,
        durationSec: DURATION,
        intendedLoopDurationSec: previewDurationSec,
      };
      const pkg = createMaterialPackageFromExport(metadata, blob);
      registerExternalMaterialPackage(pkg);
      const manifest = createMaterialManifest(pkg, `${safeName}.wav`);

      const jsonBlob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonAnchor = document.createElement('a');
      jsonAnchor.href = jsonUrl;
      jsonAnchor.download = `${safeName}.json`;
      jsonAnchor.click();
      URL.revokeObjectURL(jsonUrl);

      setStatusMessage(materialExport.role === 'loop' ? 'Loop exportiert, in die Materialdatenbank geschrieben und für Room V vorgemerkt' : 'Material exportiert und in der Forge-Datenbank gesichert (nicht als Loop in Room V)');
      window.setTimeout(() => setStatusMessage(''), 1800);
    } catch (err) {
      console.error('Export error:', err);
      setStatusMessage('Export fehlgeschlagen');
      window.setTimeout(() => setStatusMessage(''), 2200);
    } finally {
      setRendering(false);
    }
  }, [materialExport, previewDurationSec, spectralData, synthMode, waveformMix]);

  const handleOpenImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const beginAudioImport = useCallback(async (file: File) => {
    setRendering(true);
    setRenderProgress(0.05);
    setStatusMessage(`Dekodiere Audio ${file.name}...`);
    try {
      const source = await prepareAudioSourceAsset(file, (p) => setRenderProgress(p));
      setPendingAudioImport({
        file,
        source,
        startSec: 0,
        readMode: 'legacy',
      });
      setStatusMessage(`Audio bereit: ${source.originalDuration.toFixed(2)}s · ${source.channelCount} Kanäle`);
      window.setTimeout(() => setStatusMessage(''), 1800);
    } catch (err) {
      console.error('Audio preload error:', err);
      setStatusMessage('Audio konnte nicht dekodiert werden');
      window.setTimeout(() => setStatusMessage(''), 2600);
    } finally {
      setRendering(false);
      setRenderProgress(0);
    }
  }, []);

  const beginImageImport = useCallback(async (file: File) => {
    setRendering(true);
    setRenderProgress(0.08);
    setStatusMessage(`Lade Bild ${file.name}...`);
    try {
      const image = await loadImageElementFromFile(file);
      setPendingImageImport({
        file,
        image,
        fitMode: 'crop',
        shiftX: 0,
        shiftY: 0,
        contrast: 0.22,
        readMode: 'legacy',
      });
      setStatusMessage(`Bild bereit: ${image.naturalWidth}×${image.naturalHeight}`);
      window.setTimeout(() => setStatusMessage(''), 1800);
    } catch (err) {
      console.error('Image preload error:', err);
      setStatusMessage('Bild konnte nicht geladen werden');
      window.setTimeout(() => setStatusMessage(''), 2600);
    } finally {
      setRendering(false);
      setRenderProgress(0);
    }
  }, []);

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.type.startsWith('image/')) {
        await beginImageImport(file);
      } else {
        await beginAudioImport(file);
      }
    } finally {
      e.target.value = '';
    }
  }, [beginAudioImport, beginImageImport]);

  const handleConfirmAudioImport = useCallback(async () => {
    const pending = pendingAudioImport;
    if (!pending) return;

    setRendering(true);
    setRenderProgress(0);
    setStatusMessage(`Importiere Audio ${pending.file.name}...`);
    try {
      if (isPlaying) {
        audioEngine.stop();
        setIsPlaying(false);
      }
      pushUndo();
      const sourceWindow = retargetAudioSourceAsset(pending.source, { startSec: pending.startSec });
      const info = await importAudioSourceToSpectralData(sourceWindow, spectralData, { readMode: pending.readMode }, (p) => setRenderProgress(p * 0.62));
      const enrichedSource = await attachAnalysisCacheToSourceAsset(sourceWindow, (p) => setRenderProgress(0.62 + p * 0.38));
      setSourceAsset(enrichedSource);
      audioEngine.invalidateBuffer();
      triggerRender();
      setPlayheadPosition(0);
      setSourcePreviewMode('forge');
      setStatusMessage(
        info.originalDuration > DURATION
          ? `Audio importiert: Fenster ${info.importStartSec.toFixed(2)}s → ${(info.importStartSec + info.importedDuration).toFixed(2)}s · ${pending.readMode === 'legacy' ? 'Legacy' : pending.readMode === 'transient' ? 'Transient' : 'Hybrid'} · Quelle bleibt vorhörbar`
          : `Audio importiert: ${info.importedDuration.toFixed(2)}s · ${pending.readMode === 'legacy' ? 'Legacy' : pending.readMode === 'transient' ? 'Transient' : 'Hybrid'} · Quelle bleibt vorhörbar`
      );
      window.setTimeout(() => setStatusMessage(''), 3200);
      closeAudioImport();
    } catch (err) {
      console.error('Audio import error:', err);
      setStatusMessage('Audio-Import fehlgeschlagen');
      window.setTimeout(() => setStatusMessage(''), 2600);
    } finally {
      setRendering(false);
    }
  }, [closeAudioImport, isPlaying, pendingAudioImport, pushUndo, setIsPlaying, setPlayheadPosition, setSourceAsset, setSourcePreviewMode, spectralData, triggerRender]);

  const handleConfirmImageImport = useCallback(async () => {
    const pending = pendingImageImport;
    if (!pending) return;

    setRendering(true);
    setRenderProgress(0);
    setStatusMessage(`Importiere Bild ${pending.file.name}...`);
    try {
      if (isPlaying) {
        audioEngine.stop();
        setIsPlaying(false);
      }
      pushUndo();
      const info = await importImageElementToSpectralData(
        pending.image,
        spectralData,
        {
          fitMode: pending.fitMode,
          shiftX: pending.shiftX,
          shiftY: pending.shiftY,
          contrast: pending.contrast,
          readMode: pending.readMode,
        },
        (p) => setRenderProgress(p),
      );
      setSourceAsset(null);
      setSourcePreviewMode('forge');
      audioEngine.invalidateBuffer();
      triggerRender();
      setPlayheadPosition(0);
      setStatusMessage(`Bild importiert: ${info.imageWidth}×${info.imageHeight} → ${pending.readMode === 'legacy' ? 'Legacy' : pending.readMode === 'contour' ? 'Kontur' : 'Hybrid'} · ${pending.fitMode === 'crop' ? 'Crop' : pending.fitMode === 'stretch' ? 'Stauchen' : pending.fitMode === 'containLeft' ? 'linksbündig' : 'rechtsbündig'}`);
      window.setTimeout(() => setStatusMessage(''), 2600);
      closeImageImport();
    } catch (err) {
      console.error('Image import error:', err);
      setStatusMessage('Bild-Import fehlgeschlagen');
      window.setTimeout(() => setStatusMessage(''), 2600);
    } finally {
      setRendering(false);
    }
  }, [closeImageImport, isPlaying, pendingImageImport, pushUndo, setIsPlaying, setPlayheadPosition, setSourceAsset, setSourcePreviewMode, spectralData, triggerRender]);

  const updatePendingImageImport = useCallback((patch: Partial<PendingImageImport>) => {
    setPendingImageImport((current) => current ? { ...current, ...patch } : current);
  }, []);

  const updatePendingAudioImport = useCallback((patch: Partial<PendingAudioImport>) => {
    setPendingAudioImport((current) => current ? { ...current, ...patch } : current);
  }, []);

  const timeStr = (pos: number, durationSec: number = getActivePreviewDuration()) => {
    const t = pos * durationSec;
    const min = Math.floor(t / 60);
    const sec = t % 60;
    return `${min}:${sec.toFixed(2).padStart(5, '0')}`;
  };

  const previewModeButtons: Array<{ id: SourcePreviewMode; label: string }> = [
    { id: 'forge', label: 'Forge' },
    { id: 'sourceWindow', label: 'Quelle-Fenster' },
    { id: 'sourceFull', label: 'Quelle komplett' },
  ];

  return (
    <>
      <div className="bg-gray-900 border-t border-gray-700 px-4 py-2 flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,image/*,.wav,.mp3,.ogg,.m4a,.aac,.flac,.png,.jpg,.jpeg,.webp,.bmp,.gif"
          className="hidden"
          onChange={handleImportFile}
        />

        <button
          onClick={handlePlay}
          disabled={rendering}
          className={`w-10 h-8 rounded font-bold text-lg flex items-center justify-center transition-colors
            ${isPlaying ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'} disabled:opacity-50`}
          title={isPlaying ? 'Vorschau pausieren' : 'Vorschau starten'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button
          onClick={handleStop}
          className="w-10 h-8 rounded bg-gray-700 hover:bg-gray-600 text-lg flex items-center justify-center"
          title="Vorschau stoppen"
        >
          ⏹
        </button>

        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={playheadPosition}
          onChange={(e) => { setPlayheadPosition(Number(e.target.value)); setShowPlayheadMarker(true); }}
          onPointerUp={(e) => (e.currentTarget as HTMLInputElement).blur()}
          onMouseUp={(e) => (e.currentTarget as HTMLInputElement).blur()}
          tabIndex={-1}
          className="flex-1 accent-green-500"
        />

        <label className="flex items-center gap-2 text-[11px] text-neutral-400">
          <input
            type="checkbox"
            checked={materialExport.loopPreview}
            onChange={(e) => updateMaterialExport({ loopPreview: e.target.checked })}
            disabled={sourcePreviewMode !== 'forge'}
          />
          Loop vorhören
        </label>

        {sourceAsset && (
          <div className="flex items-center gap-1 rounded border border-neutral-700 bg-neutral-950/70 p-1 text-[10px] text-neutral-300">
            {previewModeButtons.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setSourcePreviewMode(mode.id)}
                className={`rounded px-2 py-1 ${sourcePreviewMode === mode.id ? 'bg-cyan-700 text-white' : 'hover:bg-neutral-800'}`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        )}

        <span className="text-[10px] text-neutral-500 w-28 text-right">
          {sourceAsset && sourcePreviewMode !== 'forge'
            ? sourcePreviewMode === 'sourceFull'
              ? `Quelle ${sourceAsset.originalDuration.toFixed(2)}s`
              : `Fenster ${sourceAsset.importStartSec.toFixed(2)}–${(sourceAsset.importStartSec + sourceAsset.importDurationSec).toFixed(2)}s`
            : `@ ${materialExport.bpm} BPM → ${previewDurationSec.toFixed(2)}s`}
        </span>
        <span className="text-xs font-mono text-gray-400 w-24 text-right">
          {timeStr(playheadPosition)} / {timeStr(1)}
        </span>

        {rendering && (
          <div className="w-24 h-2 bg-gray-800 rounded overflow-hidden">
            <div className="h-full bg-green-500 transition-all" style={{ width: `${renderProgress * 100}%` }} />
          </div>
        )}

        {statusMessage && (
          <div className="max-w-64 truncate text-[10px] text-cyan-300" title={statusMessage}>
            {statusMessage}
          </div>
        )}

        <button
          onClick={handleOpenImport}
          disabled={rendering}
          className="h-8 px-3 rounded bg-violet-700 hover:bg-violet-600 text-xs font-medium disabled:opacity-50"
          title="Audio- oder Bilddatei in die Materialfläche importieren"
        >
          📥 Material importieren
        </button>

        <button
          onClick={handleExport}
          disabled={rendering}
          className="h-8 px-3 rounded bg-blue-700 hover:bg-blue-600 text-xs font-medium disabled:opacity-50"
          title="Als WAV und JSON-Metadaten exportieren und in die Materialdatenbank schreiben"
        >
          💾 Material exportieren
        </button>
      </div>

      {pendingAudioImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-5xl rounded-2xl border border-neutral-700 bg-neutral-950 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-800 px-5 py-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-300">Audio → Spectral Forge</div>
                <h3 className="text-lg font-semibold text-neutral-100">Quelle behalten, Fenster projizieren, Original weiter abhören</h3>
                <p className="mt-1 max-w-3xl text-xs leading-relaxed text-neutral-400">
                  Die Forge bekommt jetzt nicht nur die 10s-Projektion, sondern behält die Originalquelle als eigenes Asset. So lassen sich Forge-Resynthese und Originalfenster direkt gegeneinander hören, ohne die Herkunft zu verlieren.
                </p>
              </div>
              <button
                type="button"
                onClick={closeAudioImport}
                className="rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-900"
              >
                Schließen
              </button>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="space-y-3">
                <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
                  <canvas
                    ref={audioPreviewCanvasRef}
                    width={800}
                    height={220}
                    className="h-auto w-full rounded-lg border border-neutral-700 bg-[#060913]"
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 text-xs text-neutral-300">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Quelle</div>
                    <div className="mt-2 break-all font-medium text-neutral-100">{pendingAudioImport.file.name}</div>
                    <div className="mt-1 text-neutral-400">{pendingAudioImport.source.originalDuration.toFixed(2)}s · {pendingAudioImport.source.channelCount} Kanäle · {pendingAudioImport.source.sampleRate} Hz</div>
                  </div>
                  <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 text-xs text-neutral-300">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Forge-Fenster</div>
                    <div className="mt-2 font-medium text-neutral-100">{Math.min(DURATION, pendingAudioImport.source.originalDuration).toFixed(2)}s</div>
                    <div className="mt-1 text-neutral-400">sichtbare Panorama-Fläche bleibt 2048 × 512</div>
                  </div>
                  <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 text-xs text-neutral-300">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Zukunft</div>
                    <div className="mt-2 text-neutral-100">Original bleibt erhalten</div>
                    <div className="mt-1 text-neutral-400">spätere source-aware Tools können daran andocken</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900/70 p-4">
                <label className="block space-y-1 text-xs text-neutral-300">
                  <span className="uppercase tracking-[0.2em] text-neutral-500">Fensterstart im Original</span>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, pendingAudioImport.source.originalDuration - Math.min(DURATION, pendingAudioImport.source.originalDuration))}
                    step={0.01}
                    value={pendingAudioImport.startSec}
                    disabled={pendingAudioImport.source.originalDuration <= DURATION}
                    onChange={(e) => updatePendingAudioImport({ startSec: Number(e.target.value) })}
                    className="w-full accent-cyan-400 disabled:opacity-40"
                  />
                  <div className="flex justify-between text-[11px] text-neutral-500">
                    <span>Anfang</span>
                    <span>{pendingAudioImport.startSec.toFixed(2)}s</span>
                    <span>Ende</span>
                  </div>
                </label>

                <label className="block space-y-1 text-xs text-neutral-300">
                  <span className="uppercase tracking-[0.2em] text-neutral-500">Audio-Lesart / Projection</span>
                  <select
                    value={pendingAudioImport.readMode}
                    onChange={(e) => updatePendingAudioImport({ readMode: e.target.value as AudioImportReadMode })}
                    className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-neutral-100"
                  >
                    <option value="legacy">Legacy · rohe spektrale Masse / darkpsy</option>
                    <option value="transient">Transient · Konturen / Anschläge / Rillen</option>
                    <option value="hybrid">Hybrid · Masse + Kontur mischen</option>
                  </select>
                </label>

                <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3 text-[11px] leading-relaxed text-neutral-400">
                  Erst wird ein explizites Zeitfenster gewählt, dann die Forge-Projektion erzeugt. Die Originalquelle bleibt daneben erhalten und kann später für source-aware Pinsel, lokale Effekte oder A/B-Vergleiche herangezogen werden.
                </div>

                <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3 text-[11px] leading-relaxed text-neutral-400">
                  Legacy bleibt der bisherige rohe, darkpsy-nahe Pfad. Transient hebt eher Anschläge, spektrale Konturen und Rillen hervor; Hybrid sitzt dazwischen. Das ist bewusst experimentell und soll hörbar verschiedene Eingangsmaterialien provozieren.
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeAudioImport}
                    className="rounded border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-900"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAudioImport}
                    disabled={rendering}
                    className="rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
                  >
                    Audio in Forge einlesen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {pendingImageImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-5xl rounded-2xl border border-neutral-700 bg-neutral-950 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-800 px-5 py-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-300">Image → Spectral Forge</div>
                <h3 className="text-lg font-semibold text-neutral-100">Asemic / grafische Notation in Klangfläche einlesen</h3>
                <p className="mt-1 max-w-3xl text-xs leading-relaxed text-neutral-400">
                  Links → rechts wird Zeit, oben → unten wird Pitch. Dunkle Spuren werden Klang, helle Flächen bleiben still. Crop füllt die Fläche, links/rechtsbündig lassen Luft für späteres Weiterbauen.
                </p>
              </div>
              <button
                type="button"
                onClick={closeImageImport}
                className="rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-900"
              >
                Schließen
              </button>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="space-y-3">
                <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
                  <canvas
                    ref={imagePreviewCanvasRef}
                    width={800}
                    height={200}
                    className="h-auto w-full rounded-lg border border-neutral-700 bg-white"
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 text-xs text-neutral-300">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Quelle</div>
                    <div className="mt-2 break-all font-medium text-neutral-100">{pendingImageImport.file.name}</div>
                    <div className="mt-1 text-neutral-400">{pendingImageImport.image.naturalWidth} × {pendingImageImport.image.naturalHeight}px</div>
                  </div>
                  <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 text-xs text-neutral-300">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Ziel</div>
                    <div className="mt-2 font-medium text-neutral-100">{spectralData.width} × {spectralData.height}</div>
                    <div className="mt-1 text-neutral-400">Panorama-Spektrum der Forge</div>
                  </div>
                  <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 text-xs text-neutral-300">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Lesart</div>
                    <div className="mt-2 text-neutral-100">Zeit = X · Pitch = Y</div>
                    <div className="mt-1 text-neutral-400">Legacy, Kontur oder Hybrid als Lesart</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900/70 p-4">
                <label className="block space-y-1 text-xs text-neutral-300">
                  <span className="uppercase tracking-[0.2em] text-neutral-500">Lesart / Mapping</span>
                  <select
                    value={pendingImageImport.readMode}
                    onChange={(e) => updatePendingImageImport({ readMode: e.target.value as ImageImportReadMode })}
                    className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-neutral-100"
                  >
                    <option value="legacy">Legacy · dunkle Masse direkt lesen</option>
                    <option value="contour">Kontur · Kanten / Linien priorisieren</option>
                    <option value="hybrid">Hybrid · Masse + Kontur mischen</option>
                  </select>
                </label>

                <label className="block space-y-1 text-xs text-neutral-300">
                  <span className="uppercase tracking-[0.2em] text-neutral-500">Einpassung</span>
                  <select
                    value={pendingImageImport.fitMode}
                    onChange={(e) => updatePendingImageImport({ fitMode: e.target.value as ImageImportFitMode })}
                    className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-neutral-100"
                  >
                    <option value="crop">Crop / Fläche füllen</option>
                    <option value="stretch">Stauchen / Vollfläche</option>
                    <option value="containLeft">Linksbündig / Rest frei</option>
                    <option value="containRight">Rechtsbündig / Rest frei</option>
                  </select>
                </label>

                <label className="block space-y-1 text-xs text-neutral-300">
                  <span className="uppercase tracking-[0.2em] text-neutral-500">Stillefilter / Kontrast</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={pendingImageImport.contrast}
                    onChange={(e) => updatePendingImageImport({ contrast: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                  <div className="flex justify-between text-[11px] text-neutral-500">
                    <span>weich / mehr Grauwert</span>
                    <span>{pendingImageImport.contrast.toFixed(2)}</span>
                    <span>hart / mehr Stille</span>
                  </div>
                </label>

                <label className={`block space-y-1 text-xs ${pendingImageImport.fitMode === 'crop' ? 'text-neutral-300' : 'text-neutral-600'}`}>
                  <span className="uppercase tracking-[0.2em] text-neutral-500">Crop-Verschiebung horizontal</span>
                  <input
                    type="range"
                    min={-1}
                    max={1}
                    step={0.01}
                    value={pendingImageImport.shiftX}
                    disabled={pendingImageImport.fitMode !== 'crop'}
                    onChange={(e) => updatePendingImageImport({ shiftX: Number(e.target.value) })}
                    className="w-full accent-violet-400 disabled:opacity-40"
                  />
                  <div className="flex justify-between text-[11px] text-neutral-500">
                    <span>links</span>
                    <span>{pendingImageImport.shiftX.toFixed(2)}</span>
                    <span>rechts</span>
                  </div>
                </label>

                <label className={`block space-y-1 text-xs ${pendingImageImport.fitMode === 'crop' ? 'text-neutral-300' : 'text-neutral-600'}`}>
                  <span className="uppercase tracking-[0.2em] text-neutral-500">Crop-Verschiebung vertikal</span>
                  <input
                    type="range"
                    min={-1}
                    max={1}
                    step={0.01}
                    value={pendingImageImport.shiftY}
                    disabled={pendingImageImport.fitMode !== 'crop'}
                    onChange={(e) => updatePendingImageImport({ shiftY: Number(e.target.value) })}
                    className="w-full accent-emerald-400 disabled:opacity-40"
                  />
                  <div className="flex justify-between text-[11px] text-neutral-500">
                    <span>oben</span>
                    <span>{pendingImageImport.shiftY.toFixed(2)}</span>
                    <span>unten</span>
                  </div>
                </label>

                <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3 text-[11px] leading-relaxed text-neutral-400">
                  Legacy bleibt bewusst roh und darkpsy-tauglich. Kontur liest eher Schrift, Linien und eingeritzte Zeichen; Hybrid mischt Fläche und Kontur, damit Asemic Writing sowohl Masse als auch Kanten behalten kann.
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeImageImport}
                    className="rounded border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-900"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImageImport}
                    disabled={rendering}
                    className="rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
                  >
                    Bild in Forge einlesen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
