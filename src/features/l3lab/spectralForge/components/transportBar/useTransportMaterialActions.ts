import * as React from "react";
import { donorHearingRuntime } from "../../donorV2/donorHearingRuntime";
import { renderSelectedDonorHearing } from "../../donorV2/donorHearingPlayback";
import { audioEngine } from "../../audio/AudioEngine";
import { getForge3BodyField } from "../../../forge3/bodyField";
import { buildBodyFromForgeMainPath } from "../../body/mediatedAudioBodyFactory";
import { DURATION } from "../../state/store";
import { registerExternalMaterialPackage } from "../../../materialLibrary";
import {
  createMaterialManifest,
  createMaterialPackageFromExport,
} from "../../../materialAdapter";
import {
  sanitizeName,
  triggerSpectralForgeDownloadUrl,
} from "./transportBarDownload";
import { resolveCurrentPreviewLabel } from "./transportBarUiModel";

export function useTransportMaterialActions(args: {
  variant: "legacy" | "forge3";
  forge3AudioMode: any;
  activeMediatedBody: any;
  previewDurationSec: number;
  sourceAsset: any;
  sourcePreviewMode: any;
  spectralData: any;
  synthMode: any;
  waveformMix: any;
  materialExport: any;
  getActivePreviewDuration: () => number;
  setWorkflowBusy: (value: boolean) => void;
  setWorkflowProgress: (value: number) => void;
  setStatusMessage: (value: string) => void;
}) {
  const buildCurrentPreviewBlob = React.useCallback(async () => {
    if (donorHearingRuntime.getSnapshot().selected) {
      return renderSelectedDonorHearing(args.spectralData, args.previewDurationSec);
    }
    if (
      args.variant === "forge3" &&
      args.sourceAsset &&
      args.sourcePreviewMode === "forge"
    ) {
      if (args.forge3AudioMode === "body") {
        const body =
          args.activeMediatedBody ??
          buildBodyFromForgeMainPath(
            args.spectralData,
            getForge3BodyField(),
            args.sourceAsset,
          );
        return audioEngine.exportMediatedAudioBodyWAV(body, {
          sourceAsset: args.sourceAsset,
          loopDurationSec: args.previewDurationSec,
          renderMode: "body_contract_preview",
        });
      }
      return audioEngine.exportForge3BodyPreviewWAV(
        args.sourceAsset,
        args.spectralData,
        getForge3BodyField(),
        args.previewDurationSec,
      );
    }
    if (args.sourceAsset && args.sourcePreviewMode !== "forge") {
      const startSec =
        args.sourcePreviewMode === "sourceFull" ? 0 : args.sourceAsset.importStartSec;
      const durationSec =
        args.sourcePreviewMode === "sourceFull"
          ? args.sourceAsset.originalDuration
          : args.sourceAsset.importDurationSec;
      const sampleRate = args.sourceAsset.sampleRate;
      const startSample = Math.max(0, Math.floor(startSec * sampleRate));
      const sampleLength = Math.max(
        1,
        Math.min(
          args.sourceAsset.monoSamples.length - startSample,
          Math.floor(Math.max(0.05, durationSec) * sampleRate),
        ),
      );
      const slice = Float32Array.from(
        args.sourceAsset.monoSamples.subarray(
          startSample,
          startSample + sampleLength,
        ),
      );
      return audioEngine.encodeSamplesToWAV(slice, sampleRate);
    }
    return audioEngine.exportWAV(
      args.spectralData,
      args.synthMode,
      args.waveformMix,
      (progress: number) => args.setWorkflowProgress(progress),
    );
  }, [
    args.activeMediatedBody,
    args.forge3AudioMode,
    args.previewDurationSec,
    args.sourceAsset,
    args.sourcePreviewMode,
    args.spectralData,
    args.synthMode,
    args.variant,
    args.waveformMix,
    args.setWorkflowProgress,
  ]);

  const currentPreviewLabel = React.useCallback(
    () =>
      donorHearingRuntime.getSnapshot().selected
        ? "Donor"
        : resolveCurrentPreviewLabel({
            variant: args.variant,
            hasSourceAsset: !!args.sourceAsset,
            sourcePreviewMode: args.sourcePreviewMode,
            forge3AudioMode: args.forge3AudioMode,
          }),
    [args.forge3AudioMode, args.sourceAsset, args.sourcePreviewMode, args.variant],
  );

  const handleDownloadCurrentPreview = React.useCallback(async () => {
    args.setWorkflowBusy(true);
    args.setStatusMessage(`${currentPreviewLabel()} als WAV herunterladen ...`);
    try {
      const safeName = sanitizeName(args.materialExport.name);
      const blob = await buildCurrentPreviewBlob();
      triggerSpectralForgeDownloadUrl(
        blob,
        `${safeName}-${sanitizeName(currentPreviewLabel())}.wav`,
        "spectralForge/TransportBar.handleDownloadCurrentPreview",
      );
      args.setStatusMessage(`${currentPreviewLabel()} als WAV heruntergeladen`);
      window.setTimeout(() => args.setStatusMessage(""), 2000);
    } catch (error) {
      console.error("Current preview download error:", error);
      args.setStatusMessage(`${currentPreviewLabel()}-Download fehlgeschlagen`);
      window.setTimeout(() => args.setStatusMessage(""), 2200);
    } finally {
      args.setWorkflowBusy(false);
      args.setWorkflowProgress(0);
    }
  }, [args.materialExport.name, args.setWorkflowProgress, args.setWorkflowBusy, args.setStatusMessage, buildCurrentPreviewBlob, currentPreviewLabel]);

  const handleSendCurrentPreviewToXensonar = React.useCallback(async () => {
    args.setWorkflowBusy(true);
    args.setStatusMessage(`${currentPreviewLabel()} an Xensonar senden ...`);
    try {
      const blob = await buildCurrentPreviewBlob();
      const activeDurationSec = args.getActivePreviewDuration();
      const metadata = {
        name: args.materialExport.name,
        role: args.materialExport.role,
        bpm: args.materialExport.bpm,
        bars: args.materialExport.bars,
        guideSegments: args.materialExport.guideSegments,
        guideMarkers: args.materialExport.guideMarkers,
        loopStartSec: 0,
        loopEndSec: activeDurationSec,
        rootHz: null,
        sourceVersion:
          args.variant === "forge3"
            ? "xensonar-forge3-preview-v1"
            : "xensonar-l3lab-v1",
        renderMode: donorHearingRuntime.getSnapshot().selected
          ? "donor-projection"
          : args.variant === "forge3" && args.sourceAsset && args.sourcePreviewMode === "forge"
            ? args.forge3AudioMode === "body"
              ? "forge3-body-driven-preview"
              : "forge3-body-preview"
            : args.sourceAsset && args.sourcePreviewMode === "sourceWindow"
              ? "source-window-preview"
              : args.sourceAsset && args.sourcePreviewMode === "sourceFull"
                ? "source-full-preview"
                : args.synthMode,
        durationSec: activeDurationSec,
        intendedLoopDurationSec: activeDurationSec,
      };
      const pkg = createMaterialPackageFromExport(metadata, blob);
      registerExternalMaterialPackage(pkg);
      args.setStatusMessage(`${currentPreviewLabel()} wurde an Xensonar gesendet`);
      window.setTimeout(() => args.setStatusMessage(""), 2000);
    } catch (error) {
      console.error("Current preview send error:", error);
      args.setStatusMessage(
        `${currentPreviewLabel()} konnte nicht an Xensonar gesendet werden`,
      );
      window.setTimeout(() => args.setStatusMessage(""), 2200);
    } finally {
      args.setWorkflowBusy(false);
      args.setWorkflowProgress(0);
    }
  }, [
    args.forge3AudioMode,
    args.getActivePreviewDuration,
    args.materialExport,
    args.setWorkflowProgress,
    args.setWorkflowBusy,
    args.setStatusMessage,
    args.sourceAsset,
    args.sourcePreviewMode,
    args.synthMode,
    args.variant,
    buildCurrentPreviewBlob,
    currentPreviewLabel,
  ]);

  const handleExport = React.useCallback(async () => {
    args.setWorkflowBusy(true);
    args.setStatusMessage("Exportiere Material (WAV + JSON)...");
    try {
      const safeName = sanitizeName(args.materialExport.name);
      const exportingDonor = donorHearingRuntime.getSnapshot().selected;
      const blob = exportingDonor
        ? await renderSelectedDonorHearing(args.spectralData, args.previewDurationSec)
        : await audioEngine.exportWAV(
            args.spectralData,
            args.synthMode,
            args.waveformMix,
            (progress: number) => args.setWorkflowProgress(progress),
          );
      triggerSpectralForgeDownloadUrl(
        blob,
        `${safeName}.wav`,
        "spectralForge/TransportBar.handleExport.audio",
      );
      const metadata = {
        name: args.materialExport.name,
        role: args.materialExport.role,
        bpm: args.materialExport.bpm,
        bars: args.materialExport.bars,
        guideSegments: args.materialExport.guideSegments,
        guideMarkers: args.materialExport.guideMarkers,
        loopStartSec: 0,
        loopEndSec: exportingDonor ? args.previewDurationSec : DURATION,
        rootHz: null,
        sourceVersion: "xensonar-l3lab-v1",
        renderMode: exportingDonor ? "donor-projection" : args.synthMode,
        durationSec: exportingDonor ? args.previewDurationSec : DURATION,
        intendedLoopDurationSec: args.previewDurationSec,
      };
      const pkg = createMaterialPackageFromExport(metadata, blob);
      registerExternalMaterialPackage(pkg);
      const manifest = createMaterialManifest(pkg, `${safeName}.wav`);
      const jsonBlob = new Blob([JSON.stringify(manifest, null, 2)], {
        type: "application/json",
      });
      triggerSpectralForgeDownloadUrl(
        jsonBlob,
        `${safeName}.json`,
        "spectralForge/TransportBar.handleExport.json",
      );
      args.setStatusMessage(
        args.materialExport.role === "loop"
          ? "Loop exportiert, in die Materialdatenbank geschrieben und für Room V vorgemerkt"
          : "Material exportiert und in der Forge-Datenbank gesichert (nicht als Loop in Room V)",
      );
      window.setTimeout(() => args.setStatusMessage(""), 1800);
    } catch (error) {
      console.error("Export error:", error);
      args.setStatusMessage("Export fehlgeschlagen");
      window.setTimeout(() => args.setStatusMessage(""), 2200);
    } finally {
      args.setWorkflowBusy(false);
    }
  }, [
    args.materialExport,
    args.previewDurationSec,
    args.setWorkflowProgress,
    args.setWorkflowBusy,
    args.setStatusMessage,
    args.spectralData,
    args.synthMode,
    args.waveformMix,
  ]);

  return {
    currentPreviewLabel,
    handleDownloadCurrentPreview,
    handleSendCurrentPreviewToXensonar,
    handleExport,
  };
}
