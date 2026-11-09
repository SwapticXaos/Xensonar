import type { ChangeEvent, RefObject } from "react";
import type {
  MaterialExportConfig,
  SourcePreviewMode,
} from "../../state/store";
import type { Forge3AudioMode } from "../../types/spectralForgeUiTypes";
import { TransportAudioImportDialog } from "./TransportAudioImportDialog";
import { TransportImageImportDialog } from "./TransportImageImportDialog";
import type {
  PendingAudioImport,
  PendingImageImport,
} from "./transportBarTypes";
import {
  TRANSPORT_PLAY_BUTTON_STYLE,
  TRANSPORT_PREVIEW_MODE_BUTTONS,
  type TransportBadgeViewModel,
  type TransportPlayButtonViewModel,
} from "./transportBarUiModel";

type Props = {
  variant: "legacy" | "forge3";
  forge3AudioMode: Forge3AudioMode;
  onChangeForge3AudioMode?: (mode: Forge3AudioMode) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleImportFile: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  handlePlay: () => void | Promise<void>;
  handleStop: () => void;
  rendering: boolean;
  renderFillActive: boolean;
  renderFillPercent: number;
  donorHearingPhase: string;
  donorHearingSelected: boolean;
  playButtonView: TransportPlayButtonViewModel;
  forge3TransportBadges: TransportBadgeViewModel[];
  handleSendCurrentPreviewToXensonar: () => void | Promise<void>;
  handleDownloadCurrentPreview: () => void | Promise<void>;
  playheadPosition: number;
  setPlayheadPosition: (value: number) => void;
  setShowPlayheadMarker: (value: boolean) => void;
  previewBpmInputValue: number;
  previewBpmDisabled: boolean;
  updateMaterialExport: (patch: Partial<MaterialExportConfig>) => void;
  previewLoopToggleDisabled: boolean;
  previewLoopEnabled: boolean;
  sourceAssetPresent: boolean;
  sourcePreviewMode: SourcePreviewMode;
  setSourcePreviewMode: (mode: SourcePreviewMode) => void;
  transportDurationLabel: string;
  formatActivePreviewTime: (position: number) => string;
  statusMessage: string;
  handleExport: () => void | Promise<void>;
  pendingAudioImport: PendingAudioImport | null;
  audioPreviewCanvasRef: RefObject<HTMLCanvasElement | null>;
  closeAudioImport: () => void;
  updatePendingAudioImport: (patch: Partial<PendingAudioImport>) => void;
  handleConfirmAudioImport: () => void | Promise<void>;
  pendingImageImport: PendingImageImport | null;
  imagePreviewCanvasRef: RefObject<HTMLCanvasElement | null>;
  spectralWidth: number;
  spectralHeight: number;
  closeImageImport: () => void;
  updatePendingImageImport: (patch: Partial<PendingImageImport>) => void;
  handleConfirmImageImport: () => void | Promise<void>;
};

export function TransportBarPresentation(props: Props) {
  return (
    <>
      <div className="bg-gray-900 border-t border-gray-700 px-4 py-2 flex items-center gap-3">
        <input
          ref={props.fileInputRef}
          type="file"
          accept={
            props.variant === "forge3"
              ? "image/*,.png,.jpg,.jpeg,.webp,.bmp,.gif"
              : "audio/*,image/*,.wav,.mp3,.ogg,.m4a,.aac,.flac,.png,.jpg,.jpeg,.webp,.bmp,.gif"
          }
          className="hidden"
          onChange={props.handleImportFile}
        />

        <button
          onClick={props.handlePlay}
          disabled={props.rendering}
          aria-busy={props.renderFillActive || props.donorHearingPhase === "rendering"}
          data-xensonar-spectralforge-render-fill-button="true"
          data-xensonar-spectralforge-render-fill-layered="true"
          data-xensonar-spectralforge-render-fill-percent={props.renderFillActive ? props.renderFillPercent : undefined}
          style={TRANSPORT_PLAY_BUTTON_STYLE}
          className={props.playButtonView.className}
          title={props.playButtonView.title}
        >
          {props.renderFillActive && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 z-0 bg-emerald-500/90 transition-[height] duration-75 ease-linear"
              style={{ height: `${props.renderFillPercent}%` }}
            />
          )}
          <span
            className="pointer-events-none relative z-10 flex h-full w-full items-center justify-center text-[18px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
            aria-hidden="true"
          >
            {props.playButtonView.symbol}
          </span>
          <span className="sr-only">{props.playButtonView.screenReaderLabel}</span>
        </button>
        <button
          onClick={props.handleStop}
          className="w-10 h-8 rounded bg-gray-700 hover:bg-gray-600 text-lg flex items-center justify-center"
          title="Vorschau stoppen"
        >
          ⏹
        </button>

        {props.variant === "forge3" && (
          <>
            <div
              className="flex items-center gap-1 rounded border border-neutral-700 bg-neutral-950/80 p-1 text-[10px]"
              title="Wähle, ob du nur die Werkbank oder den vermittelten Körper hören willst."
            >
              <button
                type="button"
                onClick={() => props.onChangeForge3AudioMode?.("classic")}
                className={`rounded px-2 py-1 ${props.forge3AudioMode === "classic" ? "bg-cyan-700 text-white" : "text-neutral-300 hover:bg-neutral-800"}`}
              >
                Werkbank
              </button>
              <button
                type="button"
                onClick={() => props.onChangeForge3AudioMode?.("body")}
                className={`rounded px-2 py-1 ${props.forge3AudioMode === "body" ? "bg-emerald-700 text-white" : "text-neutral-300 hover:bg-neutral-800"}`}
              >
                Körper
              </button>
            </div>
            {props.forge3TransportBadges.map((badge) => (
              <span key={badge.key} className={badge.className} title={badge.title}>
                {badge.label}
              </span>
            ))}
          </>
        )}

        {(props.variant === "forge3" || props.donorHearingSelected) && (
          <>
            <button
              onClick={props.handleSendCurrentPreviewToXensonar}
              disabled={props.rendering}
              className="h-8 px-3 rounded bg-cyan-700 hover:bg-cyan-600 text-xs font-medium disabled:opacity-50"
              title="Genau die aktuelle Forge-3-Hörweise an Xensonar senden"
            >
              ↗ Hörweise senden
            </button>
            <button
              onClick={props.handleDownloadCurrentPreview}
              disabled={props.rendering}
              className="h-8 px-3 rounded bg-emerald-700 hover:bg-emerald-600 text-xs font-medium disabled:opacity-50"
              title="Genau die aktuelle Forge-3-Hörweise als WAV herunterladen"
            >
              ⬇ Hörweise WAV
            </button>
          </>
        )}

        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={props.playheadPosition}
          onChange={(event) => {
            props.setPlayheadPosition(Number(event.target.value));
            props.setShowPlayheadMarker(true);
          }}
          onPointerUp={(event) => (event.currentTarget as HTMLInputElement).blur()}
          onMouseUp={(event) => (event.currentTarget as HTMLInputElement).blur()}
          tabIndex={-1}
          className="flex-1 accent-green-500"
        />

        <label
          className="flex items-center gap-1 text-[11px] text-neutral-300"
          title="Tempo der Vorschau. Die Zahl bestimmt die Zeitbasis; ob die Hauptvorschau wiederholt wird, entscheidet das Loop-Häkchen daneben."
        >
          <span className="whitespace-nowrap">Tempo</span>
          <input
            type="number"
            min={20}
            max={320}
            step={1}
            value={props.previewBpmInputValue}
            disabled={props.previewBpmDisabled}
            onChange={(event) => {
              const next = Number(event.currentTarget.value);
              if (!Number.isFinite(next)) return;
              props.updateMaterialExport({ bpm: Math.max(20, Math.min(320, Math.round(next))) });
            }}
            onPointerUp={(event) => (event.currentTarget as HTMLInputElement).blur()}
            className="h-7 w-16 rounded border border-neutral-700 bg-neutral-950 px-2 text-right font-mono text-[11px] text-emerald-100 disabled:opacity-50"
          />
          <span>BPM</span>
        </label>

        <label
          className={`flex items-center gap-1 rounded border border-neutral-700 bg-neutral-950/70 px-2 py-1 text-[11px] ${props.previewLoopToggleDisabled ? "text-neutral-500" : "text-neutral-200"}`}
          title={props.previewLoopToggleDisabled ? "Loop gilt für Hauptvorschau und Hörweisen; diese Quelle verwendet einen eigenen Abspielweg." : "Aktuelle Vorschau wiederholen oder einmalig abspielen."}
        >
          <input
            type="checkbox"
            checked={props.previewLoopEnabled}
            disabled={props.previewLoopToggleDisabled}
            onChange={(event) => props.updateMaterialExport({ loopPreview: event.currentTarget.checked })}
            onPointerUp={(event) => (event.currentTarget as HTMLInputElement).blur()}
            className="accent-emerald-500 disabled:opacity-40"
          />
          <span>Loop</span>
        </label>

        {props.sourceAssetPresent && (
          <div className="flex items-center gap-1 rounded border border-neutral-700 bg-neutral-950/70 p-1 text-[10px] text-neutral-300">
            {TRANSPORT_PREVIEW_MODE_BUTTONS.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => props.setSourcePreviewMode(mode.id)}
                className={`rounded px-2 py-1 ${props.sourcePreviewMode === mode.id ? "bg-cyan-700 text-white" : "hover:bg-neutral-800"}`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        )}

        <span className="text-[10px] text-neutral-500 w-28 text-right">
          {props.transportDurationLabel}
        </span>
        <span className="text-xs font-mono text-gray-400 w-24 text-right">
          {props.formatActivePreviewTime(props.playheadPosition)} / {props.formatActivePreviewTime(1)}
        </span>

        {props.statusMessage && (
          <div
            className="max-w-64 truncate text-[10px] text-cyan-300"
            title={props.statusMessage}
          >
            {props.statusMessage}
          </div>
        )}

        <button
          onClick={props.handleExport}
          disabled={props.rendering}
          className="h-8 px-3 rounded bg-blue-700 hover:bg-blue-600 text-xs font-medium disabled:opacity-50"
          title={
            props.variant === "forge3"
              ? "Die bearbeitete Forge-Fläche plus JSON exportieren. Das ist etwas anderes als der Rohloop im Material-Intake."
              : "Als WAV und JSON-Metadaten exportieren und in die Materialdatenbank schreiben"
          }
        >
          {props.variant === "forge3" ? "💾 Fläche + JSON" : "💾 Material exportieren"}
        </button>
      </div>

      {props.pendingAudioImport && (
        <TransportAudioImportDialog
          pendingAudioImport={props.pendingAudioImport}
          audioPreviewCanvasRef={props.audioPreviewCanvasRef}
          rendering={props.rendering}
          closeAudioImport={props.closeAudioImport}
          updatePendingAudioImport={props.updatePendingAudioImport}
          handleConfirmAudioImport={props.handleConfirmAudioImport}
        />
      )}

      {props.pendingImageImport && (
        <TransportImageImportDialog
          pendingImageImport={props.pendingImageImport}
          imagePreviewCanvasRef={props.imagePreviewCanvasRef}
          spectralWidth={props.spectralWidth}
          spectralHeight={props.spectralHeight}
          rendering={props.rendering}
          closeImageImport={props.closeImageImport}
          updatePendingImageImport={props.updatePendingImageImport}
          handleConfirmImageImport={props.handleConfirmImageImport}
        />
      )}
    </>
  );
}
