import * as React from 'react';
/**
 * Log preview and import/export panel for DiagnosticsHUD.
 * Single responsibility: input log replay, clear, load, paste, copy, save.
 */
import { useRef, useState, useEffect } from "react";
import { getPerformanceRecorder } from "../../features/runtime/performanceRecorder";
import type { StoredInputLogEntry } from "../../features/runtime/performanceRecorder";
import { EXPORT_LOG_COPY, EXPORT_LOG_DOWNLOAD, IMPORT_LOG_LOAD, IMPORT_LOG_PASTE } from "../copy";

const LOG_PREVIEW_SIZE = 18;

function formatLogEntry(entry: StoredInputLogEntry, baseT: number): string {
  const rel = ((entry.t - baseT) / 1000).toFixed(1);
  const roomShort = entry.room.slice(0, 4);
  const typeShort = entry.type.replace("pointer", "ptr").slice(0, 5);
  if (entry.key) return `${rel}s ${roomShort} ${typeShort} ${entry.key}`;
  if (entry.pointer) return `${rel}s ${roomShort} ${typeShort} ${entry.pointer.x}|${entry.pointer.y}`;
  return `${rel}s ${roomShort} ${typeShort}`;
}

export type DiagnosticsLogPanelProps = {
  inputLogCount: number;
  onClear: () => void;
  /** Called when log changes (clear or import); parent should refresh count. */
  onLogChange?: () => void;
};

export function DiagnosticsLogPanel({ inputLogCount, onClear, onLogChange }: DiagnosticsLogPanelProps) {
  const [logPreviewOpen, setLogPreviewOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState<null | "copied" | "failed" | "loaded">(null);
  const exportTimerRef = useRef<number | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (exportStatus == null) return;
    if (exportTimerRef.current != null) window.clearTimeout(exportTimerRef.current);
    exportTimerRef.current = window.setTimeout(() => setExportStatus(null), 1200);
    return () => {
      if (exportTimerRef.current != null) window.clearTimeout(exportTimerRef.current);
      exportTimerRef.current = null;
    };
  }, [exportStatus]);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const result = getPerformanceRecorder().importJson(text);
      setExportStatus(result.ok ? "loaded" : "failed");
      if (result.ok) onLogChange?.();
    } catch {
      setExportStatus("failed");
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const result = getPerformanceRecorder().importJson(text);
      setExportStatus(result.ok ? "loaded" : "failed");
      if (result.ok) onLogChange?.();
    } catch {
      setExportStatus("failed");
    }
  };

  const handleCopy = async () => {
    try {
      const json = getPerformanceRecorder().exportJson(true);
      await navigator.clipboard.writeText(json);
      setExportStatus("copied");
    } catch {
      setExportStatus("failed");
    }
  };

  const handleDownload = () => {
    try {
      const json = getPerformanceRecorder().exportJson(true);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `xensonar-log-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setExportStatus("failed");
    }
  };

  const handleClear = () => {
    getPerformanceRecorder().clear();
    onClear();
    onLogChange?.();
  };

  const log = getPerformanceRecorder().getLog();
  const slice = log.length > 0 ? log.slice(-LOG_PREVIEW_SIZE) : [];
  const baseT = slice.length > 0 ? slice[0].t : 0;

  return (
    <>
      <div className="flex justify-between items-center gap-2 pt-1 border-t border-neutral-800 mt-1">
        <span className="text-neutral-500">Log:</span>
        <span className="text-amber-300/90">{inputLogCount}</span>
        <button
          type="button"
          onClick={() => setLogPreviewOpen((p) => !p)}
          className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-300"
        >
          {logPreviewOpen ? "Hide" : "Replay"}
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-300"
        >
          Clear
        </button>
      </div>
      {logPreviewOpen && (
        <div className="pt-1 mt-1 border-t border-neutral-800 max-h-32 overflow-y-auto">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="text-[10px] text-neutral-500">Last {LOG_PREVIEW_SIZE} input events (Replay view)</div>
            <div className="flex items-center gap-1">
              <input
                ref={importFileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleImportFile}
              />
              <button
                type="button"
                onClick={() => importFileRef.current?.click()}
                className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-200"
                title={IMPORT_LOG_LOAD}
              >
                Load
              </button>
              <button
                type="button"
                onClick={handlePaste}
                className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-200"
                title={IMPORT_LOG_PASTE}
              >
                Paste
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-200"
                title={EXPORT_LOG_COPY}
              >
                Copy
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-200"
                title={EXPORT_LOG_DOWNLOAD}
              >
                Save
              </button>
              {exportStatus === "copied" && <span className="text-[10px] text-emerald-300">OK</span>}
              {exportStatus === "loaded" && <span className="text-[10px] text-sky-300">Loaded</span>}
              {exportStatus === "failed" && <span className="text-[10px] text-amber-300">Fail</span>}
            </div>
          </div>
          <div className="font-mono text-[10px] text-neutral-400 space-y-0.5">
            {slice.length === 0 ? (
              <div className="text-neutral-600">No events yet</div>
            ) : (
              slice.map((entry, i) => (
                <div key={`${entry.t}-${i}`} className="truncate">
                  {formatLogEntry(entry, baseT)}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
