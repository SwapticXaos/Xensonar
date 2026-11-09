import * as React from "react";
import { DURATION } from "../../state/store";
import { audioEngine } from "../../audio/AudioEngine";
import {
  prepareAudioSourceAsset,
  importAudioSourceToSpectralData,
  retargetAudioSourceAsset,
  renderAudioImportPreview,
  attachAnalysisCacheToSourceAsset,
} from "../../audio/AudioImporter";
import {
  importImageElementToSpectralData,
  loadImageElementFromFile,
  renderImageImportPreview,
} from "../../audio/ImageImporter";
import {
  HARD_IMAGE_CONTRAST,
  type PendingAudioImport,
  type PendingImageImport,
} from "./transportBarTypes";

export function useTransportImportWorkflow(args: {
  variant: "legacy" | "forge3";
  spectralData: any;
  isPlaying: boolean;
  setIsPlaying: (value: boolean) => void;
  pushUndo: () => void;
  setSourceAsset: (asset: any, context?: any) => void;
  setSourcePreviewMode: (mode: any) => void;
  setPlayheadPosition: (value: number) => void;
  setShowPlayheadMarker: (value: boolean) => void;
  triggerRender: () => void;
  setWorkflowBusy: (value: boolean) => void;
  setWorkflowProgress: (value: number) => void;
  setStatusMessage: (value: string) => void;
}) {
  const [pendingImageImport, setPendingImageImport] =
    React.useState<PendingImageImport | null>(null);
  const [pendingAudioImport, setPendingAudioImport] =
    React.useState<PendingAudioImport | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const imagePreviewCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const audioPreviewCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const imageImportInFlightRef = React.useRef(false);

  React.useEffect(() => {
    const pending = pendingImageImport;
    const canvas = imagePreviewCanvasRef.current;
    if (!pending || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderImageImportPreview(
      ctx,
      pending.image,
      pending.image.naturalWidth,
      pending.image.naturalHeight,
      {
        fitMode: pending.fitMode,
        shiftX: pending.shiftX,
        shiftY: pending.shiftY,
        contrast: pending.hardContrast ? HARD_IMAGE_CONTRAST : pending.contrast,
        readMode: pending.readMode,
      },
      canvas.width,
      canvas.height,
    );
  }, [pendingImageImport]);

  React.useEffect(() => {
    const pending = pendingAudioImport;
    const canvas = audioPreviewCanvasRef.current;
    if (!pending || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const retargeted = retargetAudioSourceAsset(pending.source, {
      startSec: pending.startSec,
    });
    renderAudioImportPreview(ctx, retargeted, canvas.width, canvas.height, "window");
  }, [pendingAudioImport]);

  const closeImageImport = React.useCallback(() => {
    setPendingImageImport(null);
    args.setWorkflowProgress(0);
  }, [args.setWorkflowProgress]);

  const closeAudioImport = React.useCallback(() => {
    setPendingAudioImport(null);
    args.setWorkflowProgress(0);
  }, [args.setWorkflowProgress]);

  const beginAudioImport = React.useCallback(async (file: File) => {
    args.setWorkflowBusy(true);
    args.setWorkflowProgress(0.05);
    args.setStatusMessage(`Dekodiere Audio ${file.name}...`);
    try {
      const source = await prepareAudioSourceAsset(file, (progress) =>
        args.setWorkflowProgress(progress),
      );
      setPendingAudioImport({ file, source, startSec: 0, readMode: "legacy" });
      args.setStatusMessage(
        `Audio bereit: ${source.originalDuration.toFixed(2)}s · ${source.channelCount} Kanäle`,
      );
      window.setTimeout(() => args.setStatusMessage(""), 1800);
    } catch (error) {
      console.error("Audio preload error:", error);
      args.setStatusMessage("Audio konnte nicht dekodiert werden");
      window.setTimeout(() => args.setStatusMessage(""), 2600);
    } finally {
      args.setWorkflowBusy(false);
      args.setWorkflowProgress(0);
    }
  }, [args.setWorkflowProgress, args.setWorkflowBusy, args.setStatusMessage]);

  const beginImageImport = React.useCallback(async (file: File) => {
    if (imageImportInFlightRef.current) {
      args.setStatusMessage("Bild-Import läuft bereits ...");
      window.setTimeout(() => args.setStatusMessage(""), 1600);
      return;
    }
    imageImportInFlightRef.current = true;
    args.setWorkflowBusy(true);
    args.setWorkflowProgress(0.08);
    args.setStatusMessage(`Lade Bild ${file.name} defensiv vor...`);
    try {
      const image = await loadImageElementFromFile(file, {
        maxPixels: 4_200_000,
        maxDimension: 2304,
      });
      setPendingImageImport({
        file,
        image,
        fitMode: "crop",
        shiftX: 0,
        shiftY: 0,
        contrast: 0.22,
        hardContrast: true,
        readMode: "legacy",
      });
      args.setStatusMessage(
        `Bild bereit: ${image.naturalWidth}×${image.naturalHeight}`,
      );
      window.setTimeout(() => args.setStatusMessage(""), 1800);
    } catch (error) {
      console.error("Image preload error:", error);
      args.setStatusMessage("Bild konnte nicht geladen werden");
      window.setTimeout(() => args.setStatusMessage(""), 2600);
    } finally {
      imageImportInFlightRef.current = false;
      args.setWorkflowBusy(false);
      args.setWorkflowProgress(0);
    }
  }, [args.setWorkflowProgress, args.setWorkflowBusy, args.setStatusMessage]);

  const handleImportFile = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        if (file.type.startsWith("image/")) {
          await beginImageImport(file);
        } else if (args.variant !== "forge3") {
          await beginAudioImport(file);
        } else {
          args.setStatusMessage(
            "Audio läuft in SpectralForge über den Material-Intake direkt unter der spektralen Werkbank.",
          );
          window.setTimeout(() => args.setStatusMessage(""), 2600);
        }
      } finally {
        event.target.value = "";
      }
    },
    [args.setStatusMessage, args.variant, beginAudioImport, beginImageImport],
  );

  const handleConfirmAudioImport = React.useCallback(async () => {
    const pending = pendingAudioImport;
    if (!pending) return;
    args.setWorkflowBusy(true);
    args.setWorkflowProgress(0);
    args.setStatusMessage(`Importiere Audio ${pending.file.name}...`);
    try {
      if (args.isPlaying) {
        audioEngine.stop();
        args.setIsPlaying(false);
      }
      args.pushUndo();
      const sourceWindow = retargetAudioSourceAsset(pending.source, {
        startSec: pending.startSec,
      });
      const info = await importAudioSourceToSpectralData(
        sourceWindow,
        args.spectralData,
        { readMode: pending.readMode },
        (progress) => args.setWorkflowProgress(progress * 0.62),
      );
      const enrichedSource = await attachAnalysisCacheToSourceAsset(
        sourceWindow,
        (progress) => args.setWorkflowProgress(0.62 + progress * 0.38),
      );
      args.setSourceAsset(enrichedSource, "forge3_main");
      audioEngine.invalidateBuffer();
      args.triggerRender();
      args.setPlayheadPosition(0);
      args.setSourcePreviewMode("forge");
      args.setStatusMessage(
        info.originalDuration > DURATION
          ? `Audio importiert: Fenster ${info.importStartSec.toFixed(2)}s → ${(info.importStartSec + info.importedDuration).toFixed(2)}s · ${pending.readMode === "legacy" ? "Legacy" : pending.readMode === "transient" ? "Transient" : "Hybrid"} · Quelle bleibt vorhörbar`
          : `Audio importiert: ${info.importedDuration.toFixed(2)}s · ${pending.readMode === "legacy" ? "Legacy" : pending.readMode === "transient" ? "Transient" : "Hybrid"} · Quelle bleibt vorhörbar`,
      );
      window.setTimeout(() => args.setStatusMessage(""), 3200);
      closeAudioImport();
    } catch (error) {
      console.error("Audio import error:", error);
      args.setStatusMessage("Audio-Import fehlgeschlagen");
      window.setTimeout(() => args.setStatusMessage(""), 2600);
    } finally {
      args.setWorkflowBusy(false);
    }
  }, [
    args.isPlaying,
    args.pushUndo,
    args.setIsPlaying,
    args.setPlayheadPosition,
    args.setWorkflowProgress,
    args.setWorkflowBusy,
    args.setSourceAsset,
    args.setSourcePreviewMode,
    args.setStatusMessage,
    args.spectralData,
    args.triggerRender,
    closeAudioImport,
    pendingAudioImport,
  ]);

  const handleConfirmImageImport = React.useCallback(async () => {
    const pending = pendingImageImport;
    if (!pending) return;
    args.setWorkflowBusy(true);
    args.setWorkflowProgress(0);
    args.setStatusMessage(`Importiere Bild ${pending.file.name}...`);
    try {
      if (args.isPlaying) {
        audioEngine.stop();
        args.setIsPlaying(false);
      }
      args.pushUndo();
      const info = await importImageElementToSpectralData(
        pending.image,
        args.spectralData,
        {
          fitMode: pending.fitMode,
          shiftX: pending.shiftX,
          shiftY: pending.shiftY,
          contrast: pending.hardContrast ? HARD_IMAGE_CONTRAST : pending.contrast,
          readMode: pending.readMode,
        },
        (progress) => args.setWorkflowProgress(progress),
      );
      args.setSourceAsset(null);
      args.setSourcePreviewMode("forge");
      audioEngine.invalidateBuffer();
      args.triggerRender();
      args.setPlayheadPosition(0);
      args.setShowPlayheadMarker(false);
      args.setStatusMessage(
        `Bild importiert: ${info.imageWidth}×${info.imageHeight} → ${pending.readMode === "legacy" ? "Legacy" : pending.readMode === "contour" ? "Kontur" : "Hybrid"} · ${pending.fitMode === "crop" ? "Crop" : pending.fitMode === "stretch" ? "Stauchen" : pending.fitMode === "containLeft" ? "linksbündig" : "rechtsbündig"} · ${pending.hardContrast ? "Hartkontrast" : `Kontrast ${pending.contrast.toFixed(2)}`}`,
      );
      window.setTimeout(() => args.setStatusMessage(""), 2600);
      closeImageImport();
    } catch (error) {
      console.error("Image import error:", error);
      args.setStatusMessage("Bild-Import fehlgeschlagen");
      window.setTimeout(() => args.setStatusMessage(""), 2600);
    } finally {
      args.setWorkflowBusy(false);
    }
  }, [
    args.isPlaying,
    args.pushUndo,
    args.setIsPlaying,
    args.setPlayheadPosition,
    args.setWorkflowProgress,
    args.setWorkflowBusy,
    args.setShowPlayheadMarker,
    args.setSourceAsset,
    args.setSourcePreviewMode,
    args.setStatusMessage,
    args.spectralData,
    args.triggerRender,
    closeImageImport,
    pendingImageImport,
  ]);

  const updatePendingImageImport = React.useCallback(
    (patch: Partial<PendingImageImport>) => {
      setPendingImageImport((current) =>
        current ? { ...current, ...patch } : current,
      );
    },
    [],
  );
  const updatePendingAudioImport = React.useCallback(
    (patch: Partial<PendingAudioImport>) => {
      setPendingAudioImport((current) =>
        current ? { ...current, ...patch } : current,
      );
    },
    [],
  );

  return {
    pendingImageImport,
    pendingAudioImport,
    fileInputRef,
    imagePreviewCanvasRef,
    audioPreviewCanvasRef,
    closeImageImport,
    closeAudioImport,
    handleImportFile,
    handleConfirmAudioImport,
    handleConfirmImageImport,
    updatePendingImageImport,
    updatePendingAudioImport,
  };
}
