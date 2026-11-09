import type { MutableRefObject } from 'react';
import { buildCarrierInputFingerprint, buildDonorInputFingerprint, useStore } from '../state/store';
import type { SpectralData } from '../audio/SpectralData';
import { retargetAudioSourceAsset, attachAnalysisCacheToSourceAsset } from '../audio/AudioImporter';
import { donorHearingRuntime } from '../donorV2/donorHearingRuntime';
import { prepareDonorProjection } from '../donorV2/donorProjection';
import { buildDonorCarrierField } from '../donorV2/donorProjectionArtifacts';
import { extractSpectralSkeleton } from '../carrierV2/extractSpectralSkeleton';
import { buildAnchorContinuityGraph } from '../carrierV2/buildAnchorContinuityGraph';
import { summarizeCarrierAnchorContinuityGraph, summarizeCarrierSpectralSkeleton } from '../carrierV2/carrierDiagnostics';
import { buildGestaltField, summarizeGestaltField } from '../carrierV2/buildGestaltField';
import { extractDonorAnchors } from '../donorV2/extractDonorAnchors';
import { buildAnchorRelativeTimbreTensor } from '../donorV2/buildAnchorRelativeTimbreTensor';
import { summarizeDonorTimbreAnalysis, summarizeDonorTimbreAtlas } from '../donorV2/donorDiagnostics';
import { buildDonorTimbreAtlas } from '../donorV2/buildDonorTimbreAtlas';
import { buildMaterialField, summarizeMaterialField } from '../donorV2/buildMaterialField';
import { buildAnchorBindingPreview, summarizeAnchorBindingPreview } from '../bindingV2/buildAnchorBindingPreview';
import { buildMaterialAllocationPreview, summarizeMaterialAllocationPreview } from '../bindingV2/buildMaterialAllocationPreview';
import { buildV2EmbodimentField } from './buildV2EmbodimentField';
import { buildSpectralEmbodimentSourceSignature } from './buildSpectralEmbodimentArtifacts';
import type { CommittedLoopPayload } from '../../materialIntake/types';
import type { TransferProfile } from '../types/transferProfile';
import type { Forge3AudioMode } from '../types/spectralForgeUiTypes';

export type CarrierDonorV2EmbodimentWorkflowArgs = {
  payload: CommittedLoopPayload;
  extractionGeneration: MutableRefObject<number>;
  stopDonorAudition: () => void;
  clearLocalValidationState: () => void;
  setForge3AudioMode: (mode: Forge3AudioMode) => void;
  renderVersion: number;
  spectralData: SpectralData;
  materialExport: {
    bars: number;
    bpm: number;
  };
  transferProfile: TransferProfile;
  intendedLoopDuration: number;
};

export async function runCarrierDonorV2EmbodimentWorkflow(
  args: CarrierDonorV2EmbodimentWorkflowArgs,
): Promise<boolean> {
  const extraction = ++args.extractionGeneration.current;
  args.stopDonorAudition();
  args.clearLocalValidationState();

  const state = useStore.getState();
  const {
    setEmbodimentStatus,
    setEmbodimentPipelineState,
    setSpectralEmbodimentSourceAsset,
    setCarrierDonorV2Patch,
    setEmbodimentField: setEmbodimentFieldState,
    beginCarrierSkeletonBuild,
    finishCarrierSkeletonBuild,
    failCarrierSkeletonBuild,
    beginDonorAnalysisBuild,
    finishDonorAnalysisBuild,
    failDonorAnalysisBuild,
    beginDonorAtlasBuild,
    finishDonorAtlasBuild,
    failDonorAtlasBuild,
    beginGestaltFieldBuild,
    finishGestaltFieldBuild,
    failGestaltFieldBuild,
    beginMaterialFieldBuild,
    finishMaterialFieldBuild,
    failMaterialFieldBuild,
    beginMaterialAllocationBuild,
    finishMaterialAllocationBuild,
    failMaterialAllocationBuild,
    beginBindingBuild,
    finishBindingBuild,
    failBindingBuild,
  } = state;

  setEmbodimentStatus('building', 'V2-Verkörperung liest Carrier und Donor-Auswahl …');
  setEmbodimentPipelineState({
    stage: 'preview_ready',
    freshness: 'dirty',
    message: 'V2-Verkörperung wird aus der lila Auswahlmaske und der aktuellen Werkbank-Gestalt berechnet.',
    lastUpdatedAt: Date.now(),
  });

  try {
    const selectedRange = args.payload.selection.fineLoopRange;
    const selectedDonorSource = retargetAudioSourceAsset(args.payload.source.sourceAsset, {
      startSec: selectedRange.startSec,
      durationSec: selectedRange.durationSec,
    });
    setSpectralEmbodimentSourceAsset(selectedDonorSource);

    const token = donorHearingRuntime.beginExtraction(selectedDonorSource);
    try {
      const model = await prepareDonorProjection(selectedDonorSource);
      if (
        args.extractionGeneration.current !== extraction ||
        !donorHearingRuntime.commitExtraction(token, selectedDonorSource, model)
      ) {
        return false;
      }
    } catch (error) {
      donorHearingRuntime.failExtraction(token, error);
      throw error;
    }

    if (useStore.getState().carrierDonorV2.donorUseMode === 'timbre_projection') {
      setEmbodimentFieldState(
        buildDonorCarrierField(args.spectralData, args.intendedLoopDuration),
        'ready',
        'Klangmaterial bereit. Donor wählen und die Figur hören.',
      );
      setEmbodimentPipelineState({
        stage: 'preview_ready',
        freshness: 'clean',
        message: 'Donor-Klangmaterial bereit.',
        lastUpdatedAt: Date.now(),
      });
      args.setForge3AudioMode('body');
      setCarrierDonorV2Patch({ busy: 'none' });
      return true;
    }

    const carrierFp = buildCarrierInputFingerprint(args.renderVersion, args.materialExport.bars);
    beginCarrierSkeletonBuild(carrierFp);
    const skeleton = extractSpectralSkeleton(args.spectralData);
    const carrierSummary = summarizeCarrierSpectralSkeleton(skeleton);
    const continuityGraph = buildAnchorContinuityGraph(skeleton);
    const continuitySummary = summarizeCarrierAnchorContinuityGraph(continuityGraph);
    finishCarrierSkeletonBuild(carrierFp, skeleton, carrierSummary, continuityGraph, continuitySummary);

    beginGestaltFieldBuild();
    const gestaltField = buildGestaltField(skeleton, continuityGraph);
    const gestaltFieldSummary = summarizeGestaltField(gestaltField);
    finishGestaltFieldBuild(gestaltField, gestaltFieldSummary);

    const analyzedSource = await attachAnalysisCacheToSourceAsset(selectedDonorSource);
    if (args.extractionGeneration.current !== extraction) return false;
    setSpectralEmbodimentSourceAsset(analyzedSource);
    const donorFp = buildDonorInputFingerprint(analyzedSource);
    if (!donorFp) throw new Error('V2-Donor-Fingerprint konnte nicht gebildet werden.');

    beginDonorAnalysisBuild(donorFp);
    const donorAnchors = extractDonorAnchors(analyzedSource);
    const donorTensor = buildAnchorRelativeTimbreTensor(analyzedSource, donorAnchors);
    const donorSummary = summarizeDonorTimbreAnalysis(donorAnchors, donorTensor);
    finishDonorAnalysisBuild(donorFp, donorAnchors, donorTensor, donorSummary);

    beginDonorAtlasBuild();
    const donorAtlas = buildDonorTimbreAtlas(donorTensor);
    const donorAtlasSummary = summarizeDonorTimbreAtlas(donorAtlas);
    finishDonorAtlasBuild(donorAtlas, donorAtlasSummary);

    // Material extraction is independent of the currently selected instrument.
    await prepareDonorProjection(analyzedSource);
    if (args.extractionGeneration.current !== extraction) return false;

    beginMaterialFieldBuild();
    const materialField = buildMaterialField(donorAtlas);
    const materialFieldSummary = summarizeMaterialField(materialField);
    finishMaterialFieldBuild(materialField, materialFieldSummary);

    beginBindingBuild();
    beginMaterialAllocationBuild();
    const bindingPreview = buildAnchorBindingPreview(skeleton, donorAtlas);
    const bindingSummary = summarizeAnchorBindingPreview(skeleton, bindingPreview);
    const materialAllocationPreview = buildMaterialAllocationPreview(
      gestaltField,
      materialField,
      args.transferProfile,
    );
    const materialAllocationSummary = summarizeMaterialAllocationPreview(materialAllocationPreview);
    finishBindingBuild(bindingPreview, bindingSummary);
    finishMaterialAllocationBuild(materialAllocationPreview, materialAllocationSummary);

    const sourceSignature = buildSpectralEmbodimentSourceSignature({
      source: analyzedSource,
      bars: args.materialExport.bars,
      bpm: args.materialExport.bpm,
      fallback: 'carrier-donor-v2-front',
    });
    const v2Field = buildV2EmbodimentField({
      spectralData: args.spectralData,
      skeleton,
      materialField,
      materialAllocationPreview,
      durationSec: args.intendedLoopDuration,
      sourceSignature,
    });
    setEmbodimentFieldState(
      v2Field,
      'ready',
      'V2-Verkörperung bereit · ' + carrierSummary.anchorCount + ' Anker · ' + donorAtlasSummary.cellCount +
        ' Donor-Zellen · ' + bindingSummary.bindingCount + ' Bindings · ' + args.materialExport.bars +
        ' Takte @ ' + Math.round(args.materialExport.bpm) + ' BPM = ' + args.intendedLoopDuration.toFixed(2) + 's.',
    );
    setEmbodimentPipelineState({
      stage: 'preview_ready',
      freshness: 'clean',
      message:
        'V2-Verkörperung bereit: Presence → Skeleton → Binding · Materialallokation ' +
        materialAllocationSummary.allocationCount + ' Zonen · Leak ' + materialAllocationSummary.meanLeakRisk.toFixed(2) +
        ' · Modus ' + useStore.getState().carrierDonorV2.donorUseMode + '.',
      lastUpdatedAt: Date.now(),
    });
    args.setForge3AudioMode('body');
    return true;
  } catch (error) {
    if (args.extractionGeneration.current !== extraction) return false;

    const message = error instanceof Error ? error.message : 'V2-Verkörperung konnte nicht berechnet werden.';
    console.error('Front V2 embodiment workflow failed', error);
    setCarrierDonorV2Patch({ busy: 'none' });
    failCarrierSkeletonBuild(message);
    failDonorAnalysisBuild(message);
    failDonorAtlasBuild(message);
    failGestaltFieldBuild(message);
    failMaterialFieldBuild(message);
    failBindingBuild(message);
    failMaterialAllocationBuild(message);
    setEmbodimentStatus('error', message);
    return false;
  }
}
