import { useSpectralForgeDonorWorkspace } from './donorV2/useSpectralForgeDonorWorkspace';
import { buildDonorCarrierField } from './donorV2/donorProjectionArtifacts';
import { CARRIER_DONOR_V2_DONOR_USE_MODE_LABELS, type CarrierDonorV2DonorUseMode } from './types/carrierDonorV2RenderPolicy';
import { donorProjectionUsesBodyV3 } from './donorV2/donorProjection';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { SpectralForgeEntryScrollIntent, SpectralForgeExternalAudioOrigin } from '../contracts/spectralForgeEntryIntent';
import SpectralCanvas from './components/SpectralCanvas';
import Toolbar from './components/Toolbar';
import ToolSettings from './components/ToolSettings';
import TransportBar, { type TransportBarHandle } from './components/TransportBar';
import MaterialIntakePanel from '../materialIntake/MaterialIntakePanel';
import HarmonizerPanel from './components/HarmonizerPanel';
import EmbodimentFieldPanel from './components/EmbodimentFieldPanel';
import SpectralForgeFunctionalHeader from './components/SpectralForgeFunctionalHeader';
import SpectralForgeWorkbenchSidebar from './components/SpectralForgeWorkbenchSidebar';
import { computeLoopDurationSec, useStore } from './state/store';
import { audioEngine } from './audio/AudioEngine';
import { fileSourceAdapter } from '../materialIntake/adapters/source/fileSourceAdapter';
import { externalDeviceSourceAdapter } from '../materialIntake/adapters/source/externalDeviceSourceAdapter';
import { forge3TargetAdapter } from '../materialIntake/adapters/target/forge3TargetAdapter';
import { rawXensonarTargetAdapter } from '../materialIntake/adapters/target/rawXensonarTargetAdapter';
import { rawRootFollowTargetAdapter } from '../materialIntake/adapters/target/rawRootFollowTargetAdapter';
import { rawMelodicPinkLaneTargetAdapter } from '../materialIntake/adapters/target/rawMelodicPinkLaneTargetAdapter';
import { createRawMelodicSampleTargetAdapter } from '../materialIntake/adapters/target/melodicSampleTargetAdapter';
import { SpectralData, type StampData } from './audio/SpectralData';
import { encodeAudioBufferToWav } from '../canonicalForge/selectionAudioTransfer';
import { runCarrierDonorV2EmbodimentWorkflow } from './embodiment/carrierDonorV2EmbodimentWorkflow';
import { createCarrierDonorV2FrontActions } from './embodiment/carrierDonorV2FrontActions';
import { saveBlobAsMelodicSample } from '../melodicSamples/melodicSampleIntake';
import type { CommittedLoopPayload } from '../materialIntake/types';
import type { MaterialEntry } from '../materialLibrary';
import type { CarrierDonorV2ValidationReport } from './validation/evaluateCarrierDonorV2Validation';
import { registerSpectralForgeSourceAsset } from './lifecycle/spectralForgePreviewLifecycleRegistry';
import type { Forge3AudioMode, SpectralForgeRoomVariant } from './types/spectralForgeUiTypes';
import { useSpectralForgeKeyboardScope } from './useSpectralForgeKeyboardScope';



function sanitizeSampleName(label: string, fallback: string) {
  const base = label.trim().replace(/\.[^.]+$/, '').replace(/[^a-z0-9äöüß _-]+/gi, '-').replace(/\s+/g, ' ');
  return (base || fallback).trim();
}

function spectralDataFromStamp(stampData: StampData) {
  const spectral = new SpectralData(Math.max(8, stampData.width), Math.max(8, stampData.height));
  spectral.data.set(stampData.data);
  spectral.grainData.set(stampData.grainData);
  return spectral;
}

export type { Forge3AudioMode } from './types/spectralForgeUiTypes';

export type Forge3Lens = 'body' | 'source' | 'hear';

interface SpectralForgeRoomProps {
  onBack: () => void;
  variant?: SpectralForgeRoomVariant;
  sidebarTop?: ReactNode;
  forge3Lens?: Forge3Lens;
  footerContent?: ReactNode;
  externalAudioUploadFile?: File | null;
  externalAudioUploadOrigin?: SpectralForgeExternalAudioOrigin | null;
  entryScrollIntent?: SpectralForgeEntryScrollIntent | null;
  onExternalAudioUploadConsumed?: () => void;
  onEntryScrollIntentConsumed?: (token: string) => void;
}

export function SpectralForgeRoom({ onBack, variant = 'legacy', sidebarTop, forge3Lens = 'body', footerContent, externalAudioUploadFile = null, externalAudioUploadOrigin = null, entryScrollIntent = null, onExternalAudioUploadConsumed, onEntryScrollIntentConsumed }: SpectralForgeRoomProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const workModeHeaderRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(true);
  const [showTraceLayer] = useState(false);
  const [forge3AudioMode, setForge3AudioMode] = useState<Forge3AudioMode>('classic');
  const [v2ValidationReport, setV2ValidationReport] = useState<CarrierDonorV2ValidationReport | null>(null);
  const [validationBusy, setValidationBusy] = useState(false);
  const [v2MaterialSendBusy, setV2MaterialSendBusy] = useState(false);
  const [lastV2MaterialEntry, setLastV2MaterialEntry] = useState<MaterialEntry | null>(null);
  const audioBufferDirty = useStore((s) => s.audioBufferDirty);
  const setAudioBufferDirty = useStore((s) => s.setAudioBufferDirty);
  const materialExport = useStore((s) => s.materialExport);
  const updateMaterialExport = useStore((s) => s.updateMaterialExport);
  const renderVersion = useStore((s) => s.renderVersion);
  const spectralData = useStore((s) => s.spectralData);
  const sourceAsset = useStore((s) => s.sourceAsset);
  const synthMode = useStore((s) => s.synthMode);
  const waveformMix = useStore((s) => s.waveformMix);
  const embodimentField = useStore((s) => s.embodimentField);
  const embodimentStatus = useStore((s) => s.embodimentStatus);
  const embodimentMessage = useStore((s) => s.embodimentMessage);
  const embodimentLayersVisibility = useStore((s) => s.embodimentLayersVisibility);
  const setEmbodimentFieldState = useStore((s) => s.setEmbodimentField);
  const setEmbodimentStatus = useStore((s) => s.setEmbodimentStatus);
  const setEmbodimentLayersVisibility = useStore((s) => s.setEmbodimentLayersVisibility);
  const carrierDonorV2 = useStore((s) => s.carrierDonorV2);
  const carrierIntegralSelection = useStore((s) => s.carrierIntegralSelection);
  const carrierIntegralSynthLab = useStore((s) => s.carrierIntegralSynthLab);
  const spectralEmbodimentSourceAsset = useStore((s) => s.spectralEmbodimentSourceAsset);
  const {
    donorState,
    donorReady,
    donorPhase,
    donorError,
    extractionGeneration,
    donorProofActive,
    stopDonorAudition,
    handleDonorInputChange,
    handleDonorPreview,
    handleDonorProof,
    selectOtherHearing,
  } = useSpectralForgeDonorWorkspace();

  const transportBarRef = useRef<TransportBarHandle>(null);

  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (audioBufferDirty) {
      audioEngine.invalidateBuffer();
      setAudioBufferDirty(false);
    }
  }, [audioBufferDirty, setAudioBufferDirty]);

  useEffect(() => {
    const handle = registerSpectralForgeSourceAsset(sourceAsset, 'main');
    return () => { handle?.markReleased('spectral-forge-main-source-asset-context-replaced'); };
  }, [sourceAsset]);

  useEffect(() => {
    const handle = registerSpectralForgeSourceAsset(spectralEmbodimentSourceAsset, 'embodiment');
    return () => { handle?.markReleased('spectral-forge-embodiment-source-asset-context-replaced'); };
  }, [spectralEmbodimentSourceAsset]);


  useSpectralForgeKeyboardScope(focused, materialExport, variant, forge3AudioMode);

  const scrollToWorkModeHeader = () => {
    window.setTimeout(() => {
      workModeHeaderRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 80);
  };


  const intendedLoopDuration = useMemo(() => computeLoopDurationSec(materialExport.bars, materialExport.bpm), [materialExport.bars, materialExport.bpm]);
  const donorCarrierRevision = `${renderVersion}:${intendedLoopDuration}`;
  const previousDonorCarrierRevision = useRef(donorCarrierRevision);
  useEffect(() => {
    if (previousDonorCarrierRevision.current === donorCarrierRevision) return;
    previousDonorCarrierRevision.current = donorCarrierRevision;
    if (donorPhase === 'rendering' || donorPhase === 'playing') stopDonorAudition();
  }, [donorCarrierRevision, donorPhase]);
  useEffect(() => {
    if (!donorReady || (carrierDonorV2.donorUseMode !== 'timbre_projection' && !donorState.selected)) return;
    // Coalesce painting updates; field copying never runs in the pointer hot path.
    const timer = window.setTimeout(() => {
      const now = useStore.getState();
      setEmbodimentFieldState(buildDonorCarrierField(now.spectralData, intendedLoopDuration), 'ready', 'Carrier-Gestalt · Klangmaterial bereit');
    }, 150);
    return () => window.clearTimeout(timer);
  }, [donorCarrierRevision, donorReady, donorState.model, donorState.selected, carrierDonorV2.donorUseMode, intendedLoopDuration, setEmbodimentFieldState]);
  const backLabel = variant === 'forge3' ? '← Zurück zu III.2' : '← Zurück zu V';


  const rawMelodicSampleTargetAdapter = useMemo(() => createRawMelodicSampleTargetAdapter({
    spectralData,
    synthMode,
    waveformMix,
    sourceView: 'energy',
    activeWorkspace: 'wave-material',
  }), [spectralData, synthMode, waveformMix]);

  const sendStampAsMelodicSample = async ({ name, stampData }: { name: string; stampData: StampData }) => {
    const renderedBuffer = await audioEngine.renderToBuffer(spectralDataFromStamp(stampData), synthMode, waveformMix);
    const blob = encodeAudioBufferToWav(renderedBuffer);
    await saveBlobAsMelodicSample({
      blob,
      name: `${sanitizeSampleName(name, 'stempel-sample')}.wav`,
    });
  };

  const {
    isFrontV2Field,
    runValidation: handleRunValidation,
    downloadValidationReport: handleDownloadValidationReport,
    sendToMaterialspur: handleSendV2ToMaterialspur,
    downloadValidationBundle: handleDownloadValidationBundle,
  } = createCarrierDonorV2FrontActions({
    spectralData,
    synthMode,
    waveformMix,
    sourceAsset,
    spectralEmbodimentSourceAsset,
    embodimentField,
    embodimentStatus,
    donorReady,
    carrierIntegralSelection,
    carrierIntegralSynthLab,
    materialExport,
    intendedLoopDuration,
    validationReport: v2ValidationReport,
    setValidationBusy,
    setValidationReport: setV2ValidationReport,
    setMaterialSendBusy: setV2MaterialSendBusy,
    setLastMaterialEntry: setLastV2MaterialEntry,
    setEmbodimentStatus,
  });

  const handleEmbodyTimbreV2 = (payload: CommittedLoopPayload) =>
    runCarrierDonorV2EmbodimentWorkflow({
      payload,
      extractionGeneration,
      stopDonorAudition,
      clearLocalValidationState: () => {
        setV2ValidationReport(null);
        setLastV2MaterialEntry(null);
      },
      setForge3AudioMode,
      renderVersion,
      spectralData,
      materialExport: { bars: materialExport.bars, bpm: materialExport.bpm },
      transferProfile: carrierDonorV2.transferProfile,
      intendedLoopDuration,
    });


  const handleToggleEmbodimentLayer = (layer: 'carrierTrace' | 'ordered' | 'body' | 'residual' | 'transient' | 'composite') => {
    setEmbodimentLayersVisibility({ [layer]: !embodimentLayersVisibility[layer] });
  };

  const handlePlayEmbodimentPreview = async () => {
    if (useStore.getState().carrierDonorV2.donorUseMode === 'timbre_projection') {
      await handleDonorPreview();
      return;
    }
    if (!isFrontV2Field()) return;
    const current = useStore.getState().carrierDonorV2;
    const donorSource = useStore.getState().spectralEmbodimentSourceAsset ?? sourceAsset;
    if (!current.skeleton || !current.donorAtlas || (current.donorUseMode !== 'timbre_projection' && !current.bindingPreview.length)) return;
    await audioEngine.playCarrierDonorV2Preview(
      spectralData,
      synthMode,
      waveformMix,
      current.skeleton,
      current.bindingPreview,
      current.donorAtlas,
      current.materialField,
      current.materialAllocationPreview,
      donorSource,
      current.transferProfile,
      intendedLoopDuration,
      current.donorUseMode,
      0,
    );
  };

  const frontFieldMode = donorReady || embodimentField?.builtFromSignature?.startsWith('carrier-donor-v2:') ? 'carrier_donor_v2' : 'legacy';
  const frontV2Ready = carrierDonorV2.donorUseMode === 'timbre_projection' || donorState.selected ? donorReady : frontFieldMode === 'carrier_donor_v2' && carrierDonorV2.freshness.renderEligibility.canPreviewV2;
  const timbreStatusLabel = frontV2Ready
    ? donorReady ? 'Klangmaterial bereit' : 'V2 bereit'
    : 'fehlt';
  const embodimentStatusLabel = frontV2Ready
    ? 'V2 bereit · ' + materialExport.bars + ' Takte · ' + intendedLoopDuration.toFixed(2) + 's'
    : embodimentStatus === 'ready' ? 'bereit' : embodimentStatus === 'building' ? 'wird aufgebaut' : embodimentStatus === 'error' ? 'Fehler' : 'fehlt';

  const mainWorkbenchStack = (
    <div className="space-y-3">
      <div className="flex min-h-[720px] overflow-hidden border border-neutral-800 bg-gray-950 text-white select-none">
        <Toolbar />
        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col"
          style={{ overscrollBehavior: 'auto' }}
        >
          <div className="flex min-h-[440px] shrink-0 flex-col md:min-h-[520px] lg:min-h-[600px]">
            <SpectralCanvas variant={variant} forge3Lens={forge3Lens} showTraceLayer={showTraceLayer} />
          </div>
          <TransportBar
            ref={transportBarRef}
            variant={variant}
            forge3AudioMode={forge3AudioMode}
            onChangeForge3AudioMode={setForge3AudioMode}
          />
          <ToolSettings />
          <MaterialIntakePanel
            sourceAdapters={[fileSourceAdapter, externalDeviceSourceAdapter]}
            targetAdapter={forge3TargetAdapter}
            rawTargetAdapter={rawXensonarTargetAdapter}
            rawRootFollowTargetAdapter={rawRootFollowTargetAdapter}
            rawMelodicPinkLaneTargetAdapter={rawMelodicPinkLaneTargetAdapter}
            rawMelodicSampleTargetAdapter={rawMelodicSampleTargetAdapter}
            onMetaPatch={(patch) => updateMaterialExport(patch)}
            meter={{
              bpm: materialExport.bpm,
              bars: materialExport.bars,
              guideSegments: materialExport.guideSegments,
              guideMarkers: materialExport.guideMarkers,
            }}
            persistenceKey={`spectral-${variant}`}
            externalLoadFile={externalAudioUploadFile}
            externalLoadOrigin={externalAudioUploadOrigin}
            entryScrollIntent={entryScrollIntent}
            onExternalLoadConsumed={onExternalAudioUploadConsumed}
            onEntryScrollIntentConsumed={onEntryScrollIntentConsumed}
            loadButtonLabel="Audio importieren"
            onDonorInputChange={handleDonorInputChange}
            onEmbodyTimbre={handleEmbodyTimbreV2}
            exportMeta={{
              name: materialExport.name,
              role: materialExport.role,
              bpm: materialExport.bpm,
              bars: materialExport.bars,
              guideSegments: materialExport.guideSegments,
            }}
            timbreStatusLabel={timbreStatusLabel}
            embodimentStatusLabel={embodimentStatusLabel}
          />
          <label className="flex items-center gap-3 px-3 py-2 text-xs text-neutral-300">
            Klangübertragung
            <select
              className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1"
              value={carrierDonorV2.donorUseMode}
              disabled={carrierDonorV2.busy !== 'none'}
              onChange={event => {
                audioEngine.stop();
                useStore.getState().setCarrierDonorV2DonorUseMode(event.target.value as CarrierDonorV2DonorUseMode);
                setV2ValidationReport(null);
                setLastV2MaterialEntry(null);
              }}
            >
              {Object.entries(CARRIER_DONOR_V2_DONOR_USE_MODE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <EmbodimentFieldPanel
            embodimentField={embodimentField}
            embodimentStatus={embodimentStatus}
            embodimentMessage={embodimentMessage}
            embodimentLayersVisibility={embodimentLayersVisibility}
            v2ValidationReport={v2ValidationReport}
            fieldMode={frontFieldMode}
            previewAvailable={frontV2Ready}
            previewPhase={donorPhase}
            previewError={donorError}
            validationBusy={validationBusy}
            onToggleLayer={handleToggleEmbodimentLayer}
            onPlayPreview={handlePlayEmbodimentPreview}
            onRunValidation={handleRunValidation}
            onDownloadValidationReport={handleDownloadValidationReport}
            onDownloadValidationBundle={handleDownloadValidationBundle}
            onSendToMaterialspur={handleSendV2ToMaterialspur}
            materialspurSendBusy={v2MaterialSendBusy}
            materialspurEntryLabel={lastV2MaterialEntry ? lastV2MaterialEntry.name + ' · ' + lastV2MaterialEntry.bars + ' Takte' : null}
          />
        </div>
        <HarmonizerPanel
          donorReady={donorReady}
          donorProofReady={!!donorState.model && donorProjectionUsesBodyV3(donorState.model)}
          donorSelected={donorState.selected}
          donorPhase={donorPhase}
          donorError={donorError}
          onDonorPreview={() => { void handleDonorPreview(); }}
          onOtherHearing={selectOtherHearing}
          donorProofActive={donorProofActive}
          donorSimilarity={donorState.model?.bodyV3?.reconstructionSimilarity}
          donorEventCount={donorState.model?.bodyV3?.detectedEventCount}
          onDonorProof={(kind) => { void handleDonorProof(kind); }}
        />
      </div>
    </div>
  );

  const workModeGuidance = 'Male eine Melodie / Klangskulptur und höre sie dir durch verschiedene Interpretationsweisen an. Sende die besten Ergebnisse entweder direkt an die Loop Station (Materialspur / Root Follow Loop) oder zunächst als Pinke Spur in den Melodic Loop, um dort noch mit Pitch-Raster, Schneidewerkzeug und zusätzlichen Notenblöcken (Samples/Synth) weiter zu basteln.';

  return (
    <section
      ref={rootRef}
      tabIndex={0}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
      onMouseDown={() => setFocused(true)}
      data-wheel-allow-scroll="true"
      data-xensonar-scroll-island="spectralforge-page"
      className="space-y-4 outline-none"
    >
      <SpectralForgeFunctionalHeader
        bars={materialExport.bars}
        guideSegments={materialExport.guideSegments}
        backLabel={backLabel}
        showImageImport={variant === 'forge3'}
        onBarsChange={(bars) => updateMaterialExport({ bars })}
        onGuideSegmentsChange={(guideSegments) => updateMaterialExport({ guideSegments })}
        onBack={onBack}
        onOpenImageImport={() => transportBarRef.current?.openImageImportDialog()}
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="space-y-3">
          <div
            ref={workModeHeaderRef}
            data-xensonar-spectralforge-workmode-header="true"
            className="border border-neutral-800 bg-neutral-950/70 px-4 py-3 text-xs text-neutral-300"
          >
            <div className="max-w-5xl leading-relaxed">{workModeGuidance}</div>
          </div>

          <div className="space-y-3">
            {mainWorkbenchStack}
          </div>
          {footerContent}
        </div>

        <SpectralForgeWorkbenchSidebar
          variant={variant}
          sidebarTop={sidebarTop}
          onOpenGestureProjectsInSpectralForge={scrollToWorkModeHeader}
          onSendStampAsMelodicSample={sendStampAsMelodicSample}
        />
      </div>
    </section>
  );
}
