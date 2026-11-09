import { audioEngine } from '../audio/AudioEngine';
import { donorHearingRuntime } from '../donorV2/donorHearingRuntime';
import { buildDonorProjectionArtifacts } from '../donorV2/donorProjectionArtifacts';
import { computeLoopDurationSec, useStore } from '../state/store';
import { encodeAudioBufferToWav } from '../../canonicalForge/selectionAudioTransfer';
import { registerMaterialExport, type MaterialEntry } from '../../materialLibrary';
import { dispatchXensonarEvent } from '../../../xensonar/runtime/xensonarEventChannels';
import {
  buildSpectralEmbodimentArtifacts,
  buildSpectralEmbodimentMaterialExportMeta,
  buildSpectralEmbodimentSourceSignature,
} from './buildSpectralEmbodimentArtifacts';
import type { CarrierDonorV2ValidationReport } from '../validation/evaluateCarrierDonorV2Validation';
import {
  markSpectralForgeDownloadObjectUrlReleased,
  registerSpectralForgeDownloadObjectUrl,
} from '../lifecycle/spectralForgePreviewLifecycleRegistry';

type SpectralForgeState = ReturnType<typeof useStore.getState>;
type MaterialExportState = SpectralForgeState['materialExport'];

type CarrierDonorV2FrontActionsArgs = {
  spectralData: SpectralForgeState['spectralData'];
  synthMode: SpectralForgeState['synthMode'];
  waveformMix: SpectralForgeState['waveformMix'];
  sourceAsset: SpectralForgeState['sourceAsset'];
  spectralEmbodimentSourceAsset: SpectralForgeState['spectralEmbodimentSourceAsset'];
  embodimentField: SpectralForgeState['embodimentField'];
  embodimentStatus: SpectralForgeState['embodimentStatus'];
  donorReady: boolean;
  carrierIntegralSelection: SpectralForgeState['carrierIntegralSelection'];
  carrierIntegralSynthLab: SpectralForgeState['carrierIntegralSynthLab'];
  materialExport: MaterialExportState;
  intendedLoopDuration: number;
  validationReport: CarrierDonorV2ValidationReport | null;
  setValidationBusy: (busy: boolean) => void;
  setValidationReport: (report: CarrierDonorV2ValidationReport | null) => void;
  setMaterialSendBusy: (busy: boolean) => void;
  setLastMaterialEntry: (entry: MaterialEntry | null) => void;
  setEmbodimentStatus: SpectralForgeState['setEmbodimentStatus'];
};

function sanitizeSampleName(label: string, fallback: string) {
  const base = label.trim().replace(/\.[^.]+$/, '').replace(/[^a-z0-9äöüß _-]+/gi, '-').replace(/\s+/g, ' ');
  return (base || fallback).trim();
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  if (typeof window === 'undefined') return;
  const url = window.URL.createObjectURL(blob);
  registerSpectralForgeDownloadObjectUrl(
    url,
    blob,
    fileName,
    'spectralForge/carrierDonorV2FrontActions.triggerBlobDownload',
  );
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
    markSpectralForgeDownloadObjectUrlReleased(url, 'spectral-forge-room-download-url-revoked');
  }, 5000);
}

export function createCarrierDonorV2FrontActions(args: CarrierDonorV2FrontActionsArgs) {
  const isFrontV2Field = () =>
    args.donorReady || (args.embodimentField?.builtFromSignature?.startsWith('carrier-donor-v2:') ?? false);

  const frontV2SourceSignature = (
    source = args.spectralEmbodimentSourceAsset ?? args.sourceAsset,
  ) => buildSpectralEmbodimentSourceSignature({
    source,
    bars: args.materialExport.bars,
    bpm: args.materialExport.bpm,
    fallback: 'carrier-donor-v2-front',
  });

  const buildValidationArtifacts = async () => {
    const projection = donorHearingRuntime.getSnapshot();
    const state = useStore.getState();
    if (projection.selected || state.carrierDonorV2.donorUseMode === 'timbre_projection') {
      if (!projection.source || !projection.model) throw new Error('Bitte zuerst Timbre extrahieren.');
      const duration = computeLoopDurationSec(state.materialExport.bars, state.materialExport.bpm);
      const buffer = await audioEngine.renderDonorBodyToBuffer(state.spectralData, projection.source, duration);
      if (
        donorHearingRuntime.getSnapshot().source !== projection.source ||
        donorHearingRuntime.getSnapshot().model !== projection.model ||
        useStore.getState().renderVersion !== state.renderVersion ||
        computeLoopDurationSec(useStore.getState().materialExport.bars, useStore.getState().materialExport.bpm) !== duration
      ) {
        throw new Error('Figur oder Donor wurde geändert. Bitte erneut ausgeben.');
      }
      return buildDonorProjectionArtifacts({
        spectralData: state.spectralData,
        current: state.carrierDonorV2,
        donorSource: projection.source,
        renderedBuffer: buffer,
        sourceSignature: frontV2SourceSignature(projection.source),
        meter: { ...state.materialExport, intendedLoopDurationSec: duration },
      });
    }

    const current = useStore.getState().carrierDonorV2;
    const donorSource = useStore.getState().spectralEmbodimentSourceAsset ?? args.sourceAsset;
    if (!current.freshness.renderEligibility.canPreviewV2) throw new Error(current.freshness.renderEligibility.reason);
    if (!current.skeleton || !current.donorAtlas || (current.donorUseMode !== 'timbre_projection' && !current.bindingPreview.length)) {
      throw new Error('V2 braucht Carrier-Skelett, Donor-Atlas und Binding.');
    }
    if (current.donorUseMode === 'raw_texture_overlay' && (!current.materialField || !current.materialAllocationPreview)) {
      throw new Error('Rohtextur-V2 braucht Materialfeld und Materialallokation.');
    }
    const buffer = await audioEngine.renderCarrierDonorV2CompositeToBuffer(
      args.spectralData,
      args.synthMode,
      args.waveformMix,
      current.skeleton,
      current.bindingPreview,
      current.donorAtlas,
      current.materialField,
      current.materialAllocationPreview,
      donorSource,
      current.transferProfile,
      args.intendedLoopDuration,
      current.donorUseMode,
    );
    return buildSpectralEmbodimentArtifacts({
      spectralData: args.spectralData,
      current,
      donorSource,
      renderedBuffer: buffer,
      sourceSignature: frontV2SourceSignature(donorSource),
      meter: {
        bars: args.materialExport.bars,
        bpm: args.materialExport.bpm,
        guideSegments: args.materialExport.guideSegments,
        guideMarkers: args.materialExport.guideMarkers,
        intendedLoopDurationSec: args.intendedLoopDuration,
      },
      carrierIntegralSelection: args.carrierIntegralSelection,
      carrierIntegralSynthLab: args.carrierIntegralSynthLab,
    });
  };

  const runValidation = async () => {
    if (!isFrontV2Field()) return;
    args.setValidationBusy(true);
    try {
      const artifacts = await buildValidationArtifacts();
      args.setValidationReport(artifacts.report);
      args.setEmbodimentStatus(args.embodimentStatus, 'V2-Validation: ' + artifacts.report.summaryLine);
    } catch (error) {
      args.setEmbodimentStatus('error', error instanceof Error ? error.message : 'V2-Validierung konnte nicht berechnet werden.');
    } finally {
      args.setValidationBusy(false);
    }
  };

  const downloadValidationReport = async () => {
    if (!isFrontV2Field()) return;
    const artifacts = args.validationReport ? null : await buildValidationArtifacts();
    const report = args.validationReport ?? artifacts?.report;
    if (!report) return;
    if (artifacts) args.setValidationReport(report);
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    triggerBlobDownload(blob, sanitizeSampleName(report.sourceSignature, 'carrier-donor-v2') + '.v2.validation.json');
  };

  const sendToMaterialspur = async () => {
    if (!isFrontV2Field()) return;
    args.setMaterialSendBusy(true);
    try {
      const artifacts = await buildValidationArtifacts();
      args.setValidationReport(artifacts.report);
      const blob = encodeAudioBufferToWav(artifacts.buffer);
      const syntheticRootFollow = artifacts.syntheticRootFollow;
      const entry = registerMaterialExport(buildSpectralEmbodimentMaterialExportMeta({
        artifacts,
        meter: {
          guideSegments: args.materialExport.guideSegments,
          guideMarkers: args.materialExport.guideMarkers,
        },
        materialName: args.materialExport.name,
        stableId: 'spectralforge-v2-' + Date.now().toString(36),
      }), blob);
      if (syntheticRootFollow && artifacts.rootFollowConfig) {
        dispatchXensonarEvent('rootFollowBankMembership', {
          entryId: entry.id,
          enabled: true,
          config: artifacts.rootFollowConfig,
        });
      }
      args.setLastMaterialEntry(entry);
      const rootFollowSuffix = syntheticRootFollow && artifacts.rootFollowPlan
        ? ' · Root Follow synthetisch vorbereitet: ' + artifacts.rootFollowPlan.lineCount + ' Linien.'
        : syntheticRootFollow
          ? ' · Root Follow vorgemerkt.'
          : '.';
      args.setEmbodimentStatus(
        'ready',
        'V2 an Materialspur gesendet: ' + entry.name + ' · ' + entry.bars + ' Takte · ' +
          (entry.intendedLoopDurationSec ?? entry.durationSec).toFixed(2) + 's' + rootFollowSuffix,
      );
    } catch (error) {
      console.error('Front V2 material handoff failed', error);
      args.setEmbodimentStatus('error', error instanceof Error ? error.message : 'V2 konnte nicht an die Materialspur gesendet werden.');
    } finally {
      args.setMaterialSendBusy(false);
    }
  };

  const downloadValidationBundle = async () => {
    if (!isFrontV2Field()) return;
    args.setValidationBusy(true);
    try {
      const artifacts = await buildValidationArtifacts();
      args.setValidationReport(artifacts.report);
      const base = sanitizeSampleName(artifacts.report.sourceSignature, 'carrier-donor-v2');
      triggerBlobDownload(encodeAudioBufferToWav(artifacts.buffer), base + '__v2.wav');
      const reportBlob = new Blob([JSON.stringify(artifacts.report, null, 2)], { type: 'application/json' });
      triggerBlobDownload(reportBlob, base + '__v2.validation.json');
    } catch (error) {
      args.setEmbodimentStatus('error', error instanceof Error ? error.message : 'V2-Validierungs-Bundle konnte nicht erzeugt werden.');
    } finally {
      args.setValidationBusy(false);
    }
  };

  return {
    isFrontV2Field,
    buildValidationArtifacts,
    runValidation,
    downloadValidationReport,
    sendToMaterialspur,
    downloadValidationBundle,
  };
}
