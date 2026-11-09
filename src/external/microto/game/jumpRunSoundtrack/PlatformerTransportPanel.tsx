/**
 * Transport, preset I/O, and library transfer for Jump Run Soundtrack.
 * Extracted from PlatformerControlPanel for LOC discipline and single responsibility.
 */

import type { PlatformerCompositionPresetItem, PlatformerPresetImportMode } from "./platformerPresetPersistence";

export type PlatformerTransportPanelProps = {
  running: boolean;
  onStartRun: () => Promise<void>;
  onPause: () => void;
  onResetRun: () => Promise<void>;
  presetName: string;
  onPresetNameChange: (name: string) => void;
  selectedPresetId: string;
  onSelectedPresetIdChange: (id: string) => void;
  presetItems: PlatformerCompositionPresetItem[];
  onSavePreset: (overwrite?: boolean) => void;
  onLoadPreset: (presetId?: string) => Promise<void>;
  onDeletePreset: () => void;
  onClearLibrary: () => void;
  libraryTransfer: string;
  onLibraryTransferChange: (value: string) => void;
  onExportLibrary: () => void;
  onCopyLibraryToClipboard: () => Promise<void>;
  onImportLibrary: (mode: PlatformerPresetImportMode) => void;
  xensonarExportBars: number;
  onXensonarExportBarsChange: (bars: number) => void;
  xensonarExportBusy: boolean;
  xensonarExportStatus: string;
  onExportLoopToXensonar: () => Promise<void>;
  onExportLoopToForge1?: () => Promise<void>;
  onExportLoopToForge2?: () => Promise<void>;
  onExportSeedToMelodicLoop?: () => Promise<void>;
  onDownloadAudio?: () => Promise<void>;
};

const btn = "px-2 py-1 text-[11px] border";
const btnCyan = `${btn} border-cyan-700 text-cyan-100 hover:bg-cyan-950/40`;
const btnTeal = `${btn} border-teal-700 text-teal-100 hover:bg-teal-950/40`;
const btnSky = `${btn} border-sky-700 text-sky-100 hover:bg-sky-950/40`;
const btnAmber = `${btn} border-amber-700 text-amber-100 hover:bg-amber-950/40`;
const btnNeutral = `${btn} border-neutral-700 text-neutral-300 hover:bg-neutral-900`;
const btnViolet = `${btn} border-violet-700 text-violet-100 hover:bg-violet-950/40`;
const btnIndigo = `${btn} border-indigo-700 text-indigo-100 hover:bg-indigo-950/40`;
const btnEmerald = `${btn} border-emerald-700 text-emerald-100 hover:bg-emerald-950/40`;
const btnRose = `${btn} border-rose-700 text-rose-100 hover:bg-rose-950/40`;

export function PlatformerTransportPanel({
  running,
  onStartRun,
  onPause,
  onResetRun,
  presetName,
  onPresetNameChange,
  selectedPresetId,
  onSelectedPresetIdChange,
  presetItems,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  onClearLibrary,
  libraryTransfer,
  onLibraryTransferChange,
  onExportLibrary,
  onCopyLibraryToClipboard,
  onImportLibrary,
  xensonarExportBars,
  onXensonarExportBarsChange,
  xensonarExportBusy,
  xensonarExportStatus,
  onExportLoopToXensonar,
  onExportLoopToForge1,
  onExportLoopToForge2,
  onExportSeedToMelodicLoop,
  onDownloadAudio,
}: PlatformerTransportPanelProps) {
  return (
    <div>
      <label className="block text-xs text-neutral-400 mb-1">Transport</label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void onStartRun()}
          className="px-3 py-1 text-xs border border-emerald-700 text-emerald-100 hover:bg-emerald-950/40"
        >
          {running ? "Running" : "Start Game"}
        </button>
        <button
          type="button"
          onClick={onPause}
          className="px-3 py-1 text-xs border border-amber-700 text-amber-100 hover:bg-amber-950/40"
        >
          Pause
        </button>
        <button
          type="button"
          onClick={() => void onResetRun()}
          className="px-3 py-1 text-xs border border-neutral-700 text-neutral-200 hover:bg-neutral-900"
        >
          Reset
        </button>
      </div>
      <div className="mt-2 space-y-2">
        <input
          type="text"
          value={presetName}
          onChange={(e) => onPresetNameChange(e.target.value)}
          placeholder="Preset name"
          className="w-full bg-neutral-900 border border-neutral-700 px-2 py-1 text-[11px] text-neutral-100"
        />
        <select
          value={selectedPresetId}
          onChange={(e) => {
            const id = e.target.value;
            onSelectedPresetIdChange(id);
            const item = presetItems.find((entry) => entry.id === id);
            if (item) onPresetNameChange(item.name);
          }}
          className="w-full bg-neutral-900 border border-neutral-700 px-2 py-1 text-[11px] text-neutral-100"
        >
          <option value="">-- Select Saved Loop --</option>
          {presetItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.preset.movementEvents.length} ev)
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        <button type="button" onClick={() => onSavePreset(false)} className={btnCyan}>
          Save New
        </button>
        <button type="button" onClick={() => onSavePreset(true)} className={btnTeal}>
          Overwrite
        </button>
        <button type="button" onClick={() => void onLoadPreset(selectedPresetId || undefined)} className={btnSky}>
          Load Loop
        </button>
        <button type="button" onClick={onDeletePreset} className={btnAmber}>
          Delete Slot
        </button>
        <button type="button" onClick={onClearLibrary} className={btnNeutral}>
          Clear Library
        </button>
      </div>

      <div className="mt-3 border border-cyan-900/60 bg-cyan-950/20 p-2 space-y-2">
        <label className="block text-[11px] text-cyan-200/80">Loop / Seed Export</label>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block text-[10px] text-cyan-100/80">
            <span className="mb-1 block">Host-Takte</span>
            <input
              type="number"
              min={1}
              max={16}
              step={1}
              value={xensonarExportBars}
              onChange={(e) => onXensonarExportBarsChange(Math.max(1, Math.min(16, Math.round(Number(e.target.value) || 4))))}
              className="w-20 bg-neutral-900 border border-cyan-900/70 px-2 py-1 text-[11px] text-cyan-50"
            />
          </label>
          <button
            type="button"
            onClick={() => void onExportLoopToXensonar()}
            disabled={xensonarExportBusy}
            className={`${btnCyan} disabled:opacity-60 disabled:cursor-wait`}
          >
            {xensonarExportBusy ? "Bouncing…" : "Send to Xensonar"}
          </button>
          {onExportLoopToForge1 ? (
            <button
              type="button"
              onClick={() => void onExportLoopToForge1()}
              disabled={xensonarExportBusy}
              className={`${btnSky} disabled:opacity-60 disabled:cursor-wait`}
            >
              {xensonarExportBusy ? "Öffne…" : "Zu SpectralForge"}
            </button>
          ) : null}
          {onExportLoopToForge2 ? (
            <button
              type="button"
              onClick={() => void onExportLoopToForge2()}
              disabled={xensonarExportBusy}
              className={`${btnIndigo} disabled:opacity-60 disabled:cursor-wait`}
            >
              {xensonarExportBusy ? "Öffne…" : "Zu SyntheticForge · Audio"}
            </button>
          ) : null}
          {onExportSeedToMelodicLoop ? (
            <button
              type="button"
              onClick={() => void onExportSeedToMelodicLoop()}
              disabled={xensonarExportBusy}
              className={`${btnViolet} disabled:opacity-60 disabled:cursor-wait`}
            >
              {xensonarExportBusy ? "Öffne…" : "Zu SyntheticForge · Synth Loop"}
            </button>
          ) : null}
          {onDownloadAudio ? (
            <button
              type="button"
              onClick={() => void onDownloadAudio()}
              disabled={xensonarExportBusy}
              className={`${btnEmerald} disabled:opacity-60 disabled:cursor-wait`}
            >
              {xensonarExportBusy ? "Bouncing…" : "Audio download"}
            </button>
          ) : null}
        </div>
        <div className="text-[10px] leading-snug text-cyan-100/75">
          {xensonarExportStatus}
        </div>
      </div>

      <div className="mt-3 border border-neutral-800 bg-black/30 p-2 space-y-2">
        <label className="block text-[11px] text-neutral-400">Library Transfer JSON</label>
        <textarea
          value={libraryTransfer}
          onChange={(e) => onLibraryTransferChange(e.target.value)}
          rows={5}
          spellCheck={false}
          placeholder="Export JSON to share or paste JSON to import"
          className="w-full bg-neutral-900 border border-neutral-700 px-2 py-1 text-[10px] text-neutral-100 font-mono"
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onExportLibrary} className={btnViolet}>
            Export JSON
          </button>
          <button type="button" onClick={() => void onCopyLibraryToClipboard()} className={btnIndigo}>
            Copy JSON
          </button>
          <button type="button" onClick={() => onImportLibrary("merge")} className={btnEmerald}>
            Import Merge
          </button>
          <button type="button" onClick={() => onImportLibrary("replace")} className={btnRose}>
            Import Replace
          </button>
        </div>
      </div>
    </div>
  );
}
