import { useEffect, useMemo, useRef } from "react";
import type {
  EmbodimentField,
  EmbodimentLayerKey,
  EmbodimentLayerVisibility,
  EmbodimentStatus,
} from "../types/embodimentFieldTypes";
import type { CarrierDonorV2ValidationReport } from "../validation/evaluateCarrierDonorV2Validation";

interface EmbodimentFieldPanelProps {
  embodimentField: EmbodimentField | null;
  embodimentStatus: EmbodimentStatus;
  embodimentMessage: string;
  embodimentLayersVisibility: EmbodimentLayerVisibility;
  v2ValidationReport?: CarrierDonorV2ValidationReport | null;
  fieldMode?: "legacy" | "carrier_donor_v2";
  previewAvailable?: boolean;
  previewPhase?: "idle" | "rendering" | "playing" | "error";
  previewError?: string | null;
  validationBusy: boolean;
  onToggleLayer: (layer: EmbodimentLayerKey) => void;
  onPlayPreview: () => void;
  onRunValidation: () => void;
  onDownloadValidationReport: () => void;
  onDownloadValidationBundle: () => void;
  onSendToMaterialspur?: () => void;
  materialspurSendBusy?: boolean;
  materialspurEntryLabel?: string | null;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function mixIntoImage(
  image: ImageData,
  field: Float32Array,
  width: number,
  height: number,
  rgb: [number, number, number],
  alphaScale: number,
) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const source = clamp01(field[y * width + x] ?? 0);
      if (source <= 0.0001) continue;
      const idx = (y * width + x) * 4;
      const alpha = source * alphaScale;
      image.data[idx] = Math.min(255, image.data[idx] + rgb[0] * alpha);
      image.data[idx + 1] = Math.min(255, image.data[idx + 1] + rgb[1] * alpha);
      image.data[idx + 2] = Math.min(255, image.data[idx + 2] + rgb[2] * alpha);
      image.data[idx + 3] = 255;
    }
  }
}

function layerButtonLabel(layer: EmbodimentLayerKey): string {
  switch (layer) {
    case "carrierTrace":
      return "Figur";
    case "ordered":
      return "Obertöne";
    case "body":
      return "Resonanz";
    case "residual":
      return "Geräusch";
    case "transient":
      return "Anschlag";
    case "composite":
      return "Gesamt";
  }
}

function statusLabel(status: EmbodimentStatus): string {
  switch (status) {
    case "ready":
      return "bereit";
    case "building":
      return "wird aufgebaut";
    case "error":
      return "Fehler";
    case "missing":
    default:
      return "fehlt";
  }
}

function fmt(value: number | null | undefined, digits = 2): string {
  return Number.isFinite(value) ? (value as number).toFixed(digits) : "—";
}

export default function EmbodimentFieldPanel({
  embodimentField,
  embodimentStatus,
  embodimentMessage,
  embodimentLayersVisibility,
  v2ValidationReport = null,
  fieldMode = "legacy",
  previewAvailable,
  previewPhase = "idle",
  previewError,
  validationBusy,
  onToggleLayer,
  onPlayPreview,
  onRunValidation,
  onDownloadValidationReport,
  onDownloadValidationBundle,
  onSendToMaterialspur,
  materialspurSendBusy = false,
  materialspurEntryLabel = null,
}: EmbodimentFieldPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isV2Field = fieldMode === "carrier_donor_v2";
  const canUseV2Actions = isV2Field && !!(previewAvailable ?? embodimentField);
  const previewActive =
    previewPhase === "rendering" || previewPhase === "playing";
  const previewLabel =
    previewPhase === "rendering"
      ? "Berechnung abbrechen"
      : previewPhase === "playing"
        ? "Stop"
        : previewPhase === "error"
          ? "Erneut hören"
          : "Körper hören";
  const canSendV2ToMaterialspur = canUseV2Actions && !!onSendToMaterialspur;

  const layerEntries = useMemo(() => {
    if (!embodimentField)
      return [] as Array<{
        key: EmbodimentLayerKey;
        field: Float32Array;
        color: [number, number, number];
        scale: number;
      }>;
    const entries: Array<{
      key: EmbodimentLayerKey;
      field: Float32Array;
      color: [number, number, number];
      scale: number;
    }> = [
      {
        key: "carrierTrace",
        field: embodimentField.carrierTrace,
        color: [180, 210, 255],
        scale: 0.85,
      },
      {
        key: "ordered",
        field: embodimentField.orderedField,
        color: [86, 243, 255],
        scale: 0.9,
      },
      {
        key: "body",
        field: embodimentField.bodyField,
        color: [162, 92, 255],
        scale: 0.8,
      },
      {
        key: "residual",
        field: embodimentField.residualField,
        color: [255, 177, 71],
        scale: 0.7,
      },
      {
        key: "transient",
        field: embodimentField.transientField,
        color: [255, 245, 112],
        scale: 0.95,
      },
    ];
    if (embodimentLayersVisibility.composite) {
      entries.unshift({
        key: "composite",
        field: embodimentField.compositeField,
        color: [245, 245, 255],
        scale: 0.35,
      });
    }
    return entries.filter((entry) => embodimentLayersVisibility[entry.key]);
  }, [embodimentField, embodimentLayersVisibility]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!embodimentField) {
      ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
      ctx.font = "13px monospace";
      ctx.fillText("Noch kein Verkörperungsraum aufgebaut.", 18, 26);
      return;
    }

    const image = ctx.createImageData(
      embodimentField.width,
      embodimentField.height,
    );
    for (const layer of layerEntries) {
      mixIntoImage(
        image,
        layer.field,
        embodimentField.width,
        embodimentField.height,
        layer.color,
        layer.scale,
      );
    }
    ctx.putImageData(image, 0, 0);
  }, [embodimentField, layerEntries]);

  return (
    <section
      className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-3 text-xs text-neutral-300 [&_button:focus-visible]:outline [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-cyan-300"
      aria-label="Klangkörper"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="font-mono uppercase tracking-[0.2em] text-neutral-500">
            Klangkörper
          </div>
          <div className="text-sm text-neutral-100">
            Klangfarbe folgt deiner Figur.
          </div>
          <div className="max-w-4xl text-neutral-400">
            Die Ebenen zeigen die vorbereitete Materialverteilung. Zum
            Klangvergleich vorhören.
          </div>
        </div>
        <div className="rounded border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-[11px] text-neutral-300">
          <div role="status">{statusLabel(embodimentStatus)}</div>
          <div className="mt-1 text-neutral-500">{embodimentMessage}</div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="space-y-2">
          <canvas
            ref={canvasRef}
            width={embodimentField?.width ?? 640}
            height={embodimentField?.height ?? 192}
            className="w-full rounded border border-neutral-800 bg-black"
            role="img"
            aria-label="Materialverteilung entlang der gemalten Figur"
          />
          <div className="flex flex-wrap gap-2 text-[11px]">
            {(
              [
                "carrierTrace",
                "ordered",
                "body",
                "residual",
                "transient",
                "composite",
              ] as EmbodimentLayerKey[]
            ).map((layer) => (
              <button
                key={layer}
                type="button"
                onClick={() => onToggleLayer(layer)}
                aria-pressed={embodimentLayersVisibility[layer]}
                className={`rounded border px-2 py-1 ${embodimentLayersVisibility[layer] ? "border-cyan-700 bg-cyan-950/25 text-cyan-100" : "border-neutral-700 text-neutral-400 hover:bg-neutral-900"}`}
              >
                {layerButtonLabel(layer)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <button
              type="button"
              disabled={!canUseV2Actions && !previewActive}
              aria-pressed={previewActive}
              onClick={onPlayPreview}
              className={`rounded border px-3 py-2 text-left ${canUseV2Actions ? "border-cyan-600/70 bg-cyan-950/30 text-cyan-100 hover:bg-cyan-950/45" : "border-neutral-700 text-neutral-400 opacity-50"}`}
            >
              {previewLabel}
            </button>
            {previewError && (
              <div role="alert" className="text-amber-200">
                {previewError}
              </div>
            )}
            <button
              type="button"
              disabled={!canSendV2ToMaterialspur || materialspurSendBusy}
              onClick={onSendToMaterialspur}
              className={`rounded border px-3 py-2 text-left ${canSendV2ToMaterialspur ? "border-violet-600/70 bg-violet-950/30 text-violet-100 hover:bg-violet-950/45" : "border-neutral-700 text-neutral-400 opacity-50"}`}
            >
              {materialspurSendBusy
                ? "Materialspur wird gebaut …"
                : "An Materialspur senden"}
            </button>
            {materialspurEntryLabel ? (
              <div className="rounded border border-violet-800/50 bg-violet-950/20 px-3 py-2 text-[11px] text-violet-100">
                Gesendet: {materialspurEntryLabel}
              </div>
            ) : null}
          </div>
          <details className="rounded border border-neutral-800 p-2">
            <summary className="cursor-pointer py-1 text-neutral-300">
              Analyse und Vergleich
            </summary>
            <button
              type="button"
              disabled={!canUseV2Actions || validationBusy}
              onClick={onRunValidation}
              className={`rounded border px-3 py-2 text-left ${canUseV2Actions ? "border-amber-600/70 bg-amber-950/30 text-amber-100 hover:bg-amber-950/45" : "border-neutral-700 text-neutral-400 opacity-50"}`}
            >
              {validationBusy ? "Prüfung läuft …" : "Klangkörper prüfen"}
            </button>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={!canUseV2Actions}
                onClick={onDownloadValidationReport}
                className={`rounded border px-3 py-2 text-left ${canUseV2Actions ? "border-sky-700/70 bg-sky-950/30 text-sky-100 hover:bg-sky-950/45" : "border-neutral-700 text-neutral-400 opacity-50"}`}
              >
                Prüfbericht laden
              </button>
              <button
                type="button"
                disabled={!canUseV2Actions || validationBusy}
                onClick={onDownloadValidationBundle}
                className={`rounded border px-3 py-2 text-left ${canUseV2Actions ? "border-indigo-700/70 bg-indigo-950/30 text-indigo-100 hover:bg-indigo-950/45" : "border-neutral-700 text-neutral-400 opacity-50"}`}
              >
                Vergleichs-WAV laden
              </button>
            </div>

            <div className="rounded border border-neutral-800 bg-neutral-900/40 px-3 py-2 text-[11px] text-neutral-400">
              <div className="uppercase tracking-[0.2em] text-neutral-500">
                Materialbild
              </div>
              {isV2Field && embodimentField ? (
                <>
                  <div className="mt-1 text-neutral-100">
                    {embodimentField.width} × {embodimentField.height} ·{" "}
                    {embodimentField.durationSec.toFixed(2)}s
                  </div>
                  <div className="mt-1">
                    Signatur {embodimentField.builtFromSignature}
                  </div>
                </>
              ) : (
                <div className="mt-1">Noch kein Materialbild vorbereitet.</div>
              )}
            </div>

            <div className="rounded border border-neutral-800 bg-neutral-900/40 px-3 py-2 text-[11px] text-neutral-400">
              <div className="uppercase tracking-[0.2em] text-neutral-500">
                Messwerte
              </div>
              {v2ValidationReport ? (
                <>
                  <div className="mt-1 text-neutral-100">
                    {v2ValidationReport.summaryLine}
                  </div>
                  <div className="mt-1">
                    Energie {fmt(v2ValidationReport.metrics.renderRms, 4)} RMS ·
                    Peak {fmt(v2ValidationReport.metrics.renderPeak, 3)}
                  </div>
                  <div className="mt-1">
                    Presence{" "}
                    {fmt(v2ValidationReport.metrics.presenceActiveColumnRatio)}{" "}
                    → Skeleton{" "}
                    {fmt(v2ValidationReport.metrics.skeletonActiveColumnRatio)}{" "}
                    → Binding{" "}
                    {fmt(v2ValidationReport.metrics.bindingActiveColumnRatio)}
                  </div>
                  <div className="mt-1">
                    Anker {v2ValidationReport.metrics.anchorCount} ·
                    Atlas-Zellen{" "}
                    {v2ValidationReport.metrics.donorAtlasCellCount} · Bindings{" "}
                    {v2ValidationReport.metrics.bindingCount} · Allokation{" "}
                    {v2ValidationReport.metrics.materialAllocationCount}
                  </div>
                  <div className="mt-1">
                    Modus {v2ValidationReport.loopMetadata.donorUseMode} ·
                    Materialspur{" "}
                    {
                      v2ValidationReport.loopMetadata.materialspurEligibility
                        .mode
                    }{" "}
                    · Root Follow{" "}
                    {v2ValidationReport.loopMetadata.rootFollowEligibility.mode}
                  </div>
                  <div className="mt-2 space-y-1">
                    {v2ValidationReport.checks.map((entry) => (
                      <div
                        key={entry.id}
                        className={`rounded border px-2 py-1 ${entry.passed ? "border-emerald-800/70 bg-emerald-950/25 text-emerald-100" : entry.severity === "fail" ? "border-rose-800/70 bg-rose-950/25 text-rose-100" : "border-amber-800/70 bg-amber-950/25 text-amber-100"}`}
                      >
                        <div className="font-medium">{entry.label}</div>
                        <div className="mt-0.5 text-[10px]">{entry.detail}</div>
                      </div>
                    ))}
                  </div>
                  {v2ValidationReport.warnings.length ? (
                    <div className="mt-2 rounded border border-amber-800/70 bg-amber-950/25 px-2 py-1 text-amber-100">
                      <div className="font-medium">Warnungen</div>
                      <div className="mt-0.5 space-y-0.5 text-[10px]">
                        {v2ValidationReport.warnings.map((warning, index) => (
                          <div key={index}>• {warning}</div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="mt-1">
                  Noch keine Prüfung. Messwerte helfen bei der Fehlersuche; sie
                  bewerten nicht die musikalische Qualität.
                </div>
              )}
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
