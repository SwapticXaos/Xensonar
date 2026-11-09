import { useEffect, useRef } from 'react';
import { SpectralForgeRoom } from '../../l3lab/spectralForge/SpectralForgeRoom';
import {
  createDefaultToolProfiles,
  hydrateToolProfiles,
  mergeToolSettings,
  useStore,
  type ForgeProjectSnapshot,
  type SourcePreviewMode,
  type ToolProfiles,
  type ToolType,
} from '../../l3lab/spectralForge/state/store';
import type { AudioSourceAsset } from '../../l3lab/spectralForge/audio/AudioImporter';
import type { StampData } from '../../l3lab/spectralForge/audio/SpectralData';
import { getForge3BodyField } from '../../l3lab/forge3/bodyField';
import type { SpectralForgeEntryScrollIntent, SpectralForgeExternalAudioOrigin } from '../../l3lab/contracts/spectralForgeEntryIntent';

let workshopMemory: BackupState | null = null;

type BackupState = {
  snapshot: ForgeProjectSnapshot;
  sourceAsset: AudioSourceAsset | null;
  sourcePreviewMode: SourcePreviewMode;
  stampData: StampData | null;
  stampPhase: 'idle' | 'selecting' | 'stamping';
  stampSelStart: { x: number; y: number } | null;
  lineStart: { x: number; y: number } | null;
};

function buildForge3Profiles(): ToolProfiles {
  const base = createDefaultToolProfiles();
  return hydrateToolProfiles({
    ...base,
    brush: { ...base.brush, brushSize: 7, intensity: 0.42, hardness: 0.46, grainSize: 0.56 },
    hardBrush: { ...base.hardBrush, brushSize: 4, intensity: 0.52, hardness: 1, grainSize: 0.55 },
    stamp: { ...base.stamp, brushSize: 22, intensity: 0.62, hardness: 0.52, grainSize: 0.58 },
    morph: { ...base.morph, brushSize: 34, intensity: 0.34, hardness: 0.46, grainSize: 0.6, morphMode: 'push' },
    smudge: { ...base.smudge, brushSize: 14, intensity: 0.31, hardness: 0.54, grainSize: 0.6 },
    sourceTrace: { ...base.sourceTrace, brushSize: 18, intensity: 0.4, hardness: 0.62, grainSize: 0.62 },
    threshold: { ...base.threshold, brushSize: 14, intensity: 0.34, hardness: 0.74, grainSize: 0.56 },
  });
}

function buildBaselineSnapshot(): ForgeProjectSnapshot {
  const toolProfiles = buildForge3Profiles();
  return {
    version: 'spectral-forge-project-v1',
    activeTool: 'brush',
    toolProfiles,
    spectralSnapshot: useStore.getState().spectralData.cloneData(),
    materialExport: {
      name: 'forge3-workshop',
      role: 'loop',
      bpm: 108,
      bars: 4,
      guideSegments: 4,
      guideMarkers: [0.25, 0.5, 0.75],
      beatGuideAudible: false,
      beatGuideVolume: 0.35,
      loopPreview: true,
    },
    viewPort: { offsetX: 0, offsetY: 0, zoomX: 1, zoomY: 1 },
    synthMode: 'granular',
    waveformMix: { sine: 1, sawtooth: 0, square: 0, triangle: 0 },
    colorMapName: 'magma',
    showGrainLayer: true,
    logScale: true,
    stampTransform: { scaleX: 1, scaleY: 1, rotation: 0, flipX: false, flipY: false },
    sourceMeta: null,
  };
}

function captureWorkshopState(): BackupState {
  const store = useStore.getState();
  return {
    snapshot: store.createProjectSnapshot(),
    sourceAsset: store.sourceAsset,
    sourcePreviewMode: store.sourcePreviewMode,
    stampData: store.stampData,
    stampPhase: store.stampPhase,
    stampSelStart: store.stampSelStart,
    lineStart: store.lineStart,
  };
}

function restoreWorkshopState(saved: BackupState) {
  const store = useStore.getState();
  store.loadProjectSnapshot(saved.snapshot);
  useStore.setState((state) => ({
    toolProfiles: buildForge3Profiles(),
    toolSettings: mergeToolSettings(saved.snapshot.activeTool, buildForge3Profiles()[saved.snapshot.activeTool]),
    sourceAsset: saved.sourceAsset,
    sourcePreviewMode: saved.sourcePreviewMode,
    stampData: saved.stampData,
    stampPhase: saved.stampPhase,
    stampSelStart: saved.stampSelStart,
    lineStart: saved.lineStart,
    renderVersion: state.renderVersion + 1,
    audioBufferDirty: true,
  }));
}

function activateForge3Profiles(nextTool: ToolType, patch?: Partial<ToolProfiles>) {
  useStore.setState((state) => {
    const toolProfiles = hydrateToolProfiles({
      ...buildForge3Profiles(),
      ...(patch ?? {}),
    });
    return {
      activeTool: nextTool,
      toolProfiles,
      toolSettings: mergeToolSettings(nextTool, toolProfiles[nextTool]),
      showGrainLayer: true,
      synthMode: 'granular',
      renderVersion: state.renderVersion + 1,
      audioBufferDirty: true,
    };
  });
}

function applyMacro(kind: 'forge1' | 'steinmetz' | 'knetmasse' | 'transplant' | 'trace') {
  if (kind === 'forge1') {
    activateForge3Profiles('brush');
    return;
  }
  if (kind === 'steinmetz') {
    activateForge3Profiles('hardBrush', {
      hardBrush: { ...buildForge3Profiles().hardBrush, eraseMode: true, brushSize: 5, intensity: 0.58 },
    });
    return;
  }
  if (kind === 'knetmasse') {
    activateForge3Profiles('morph', {
      morph: { ...buildForge3Profiles().morph, brushSize: 30, intensity: 0.3, hardness: 0.5, morphMode: 'push' },
      smudge: { ...buildForge3Profiles().smudge, brushSize: 12, intensity: 0.28, hardness: 0.56 },
    });
    return;
  }
  if (kind === 'transplant') {
    activateForge3Profiles('stamp', {
      stamp: { ...buildForge3Profiles().stamp, brushSize: 26, intensity: 0.66, hardness: 0.56 },
    });
    return;
  }
  activateForge3Profiles('sourceTrace');
}

function resetWorkshopWorkspace() {
  getForge3BodyField().clear();
  const baseline = buildBaselineSnapshot();
  baseline.spectralSnapshot.fill(0);
  const state = useStore.getState();
  state.loadProjectSnapshot(baseline);
  useStore.setState((current) => ({
    undoStack: [],
    redoStack: [],
    sourceAsset: null,
    sourcePreviewMode: 'forge',
    stampData: null,
    stampPhase: 'idle',
    stampSelStart: null,
    lineStart: null,
    toolProfiles: buildForge3Profiles(),
    toolSettings: mergeToolSettings('brush', buildForge3Profiles().brush),
    renderVersion: current.renderVersion + 1,
    audioBufferDirty: true,
  }));
}

export function ExperimentalForgeWorkshopRoom({
  onBack,
  externalAudioUploadFile = null,
  externalAudioUploadOrigin = null,
  entryScrollIntent = null,
  onExternalAudioUploadConsumed,
  onEntryScrollIntentConsumed,
}: {
  onBack: () => void;
  externalAudioUploadFile?: File | null;
  externalAudioUploadOrigin?: SpectralForgeExternalAudioOrigin | null;
  entryScrollIntent?: SpectralForgeEntryScrollIntent | null;
  onExternalAudioUploadConsumed?: () => void;
  onEntryScrollIntentConsumed?: (token: string) => void;
}) {
  const backupRef = useRef<BackupState | null>(null);

  useEffect(() => {
    backupRef.current = captureWorkshopState();

    if (workshopMemory) {
      restoreWorkshopState(workshopMemory);
    } else {
      resetWorkshopWorkspace();
      activateForge3Profiles('brush');
    }

    return () => {
      workshopMemory = captureWorkshopState();
      const backup = backupRef.current;
      if (!backup) return;
      const current = useStore.getState();
      current.loadProjectSnapshot(backup.snapshot);
      useStore.setState((state) => ({
        sourceAsset: backup.sourceAsset,
        sourcePreviewMode: backup.sourcePreviewMode,
        stampData: backup.stampData,
        stampPhase: backup.stampPhase,
        stampSelStart: backup.stampSelStart,
        lineStart: backup.lineStart,
        renderVersion: state.renderVersion + 1,
        audioBufferDirty: true,
      }));
    };
  }, []);

  return (
    <SpectralForgeRoom
      onBack={onBack}
      variant="forge3"
      externalAudioUploadFile={externalAudioUploadFile}
      externalAudioUploadOrigin={externalAudioUploadOrigin}
      entryScrollIntent={entryScrollIntent}
      onExternalAudioUploadConsumed={onExternalAudioUploadConsumed}
      onEntryScrollIntentConsumed={onEntryScrollIntentConsumed}
      footerContent={(
        <div className="space-y-3 rounded border border-neutral-800 bg-neutral-950/70 p-3 text-xs text-neutral-300">
          <div className="flex flex-wrap items-center gap-2">
            <span className="uppercase tracking-[0.22em] text-neutral-500">Schnellprofile</span>
            <button type="button" onClick={() => applyMacro('forge1')} className="rounded border border-neutral-700 px-3 py-1.5 hover:bg-neutral-900">Direkt-Grundstellung</button>
            <button type="button" onClick={() => applyMacro('steinmetz')} className="rounded border border-neutral-700 px-3 py-1.5 hover:bg-neutral-900">Steinmetz</button>
            <button type="button" onClick={() => applyMacro('knetmasse')} className="rounded border border-neutral-700 px-3 py-1.5 hover:bg-neutral-900">Knetmasse</button>
            <button type="button" onClick={() => applyMacro('transplant')} className="rounded border border-neutral-700 px-3 py-1.5 hover:bg-neutral-900">Transplantation</button>
            <button type="button" onClick={() => applyMacro('trace')} className="rounded border border-neutral-700 px-3 py-1.5 hover:bg-neutral-900">Spurenlesen</button>
            <button type="button" onClick={resetWorkshopWorkspace} className="rounded border border-red-900/70 px-3 py-1.5 text-red-200 hover:bg-red-950/30">Neutral-Reset</button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded border border-neutral-800 bg-neutral-950/60 p-3 leading-relaxed text-neutral-400">
              Unten wird Audio importiert, grob gewählt, unten fein gesetzt und vorgehört. Erst nach <span className="text-neutral-200">Übernehmen</span> landet der Loop oben als Werkstoff in der Spektralfläche. Bilder können direkt über den neuen Bild-importieren-Button in SpectralForge in die Arbeitsfläche geladen werden.
            </div>
            <div className="rounded border border-neutral-800 bg-neutral-950/60 p-3 leading-relaxed text-neutral-400">
              SpectralForge ist die Körperwerkbank für bereits gewähltes Material: morphen, stampen, schneiden, Spuren lesen. Für Leute, die weiter daran bauen wollen, ist die Regel schlicht: erst die Bedienung lesbar machen, dann die Theorie nachziehen.
            </div>
          </div>
        </div>
      )}
    />
  );
}
