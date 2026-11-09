import * as React from 'react';
/**
 * Export/Import row for harmonic world (copy, download, paste, load file).
 * Single responsibility: serialize/parse world as JSON (vision §8: clearer modules).
 * Extracted from AppShellHarmonicWorldHud for LOC discipline.
 */

import { useEffect, useRef, useState } from "react";
import {
  EXPORT_WORLD_COPY,
  EXPORT_WORLD_COPIED,
  EXPORT_WORLD_DOWNLOAD,
  EXPORT_WORLD_COPY_LINK,
  EXPORT_WORLD_LINK_COPIED,
  EXPORT_WORLD_LINK_FAILED,
  IMPORT_WORLD_PASTE,
  IMPORT_WORLD_LOAD_FILE,
  IMPORT_WORLD_LOADED,
  IMPORT_WORLD_FAILED,
} from "../copy";
import {
  exportHarmonicWorld,
  parseAndValidateHarmonicWorldExport,
  serializeHarmonicWorldExport,
  type HarmonicWorld,
  type HarmonicWorldExport,
} from "../../domain/harmonicWorld";
import { buildWorldShareUrl, consumeWorldShareHash } from "../../domain/harmonicWorldShareLink";

export type CopyWorldRef = { copyWorld: () => void; copyLink?: () => void } | null;

export type WorldExportImportRowProps = {
  harmonicWorld: HarmonicWorld | null;
  onImportWorld?: (data: HarmonicWorldExport) => void;
  /** When provided, parent can trigger copy from global shortcut (vision §5). */
  copyWorldRef?: React.MutableRefObject<CopyWorldRef>;
  /** Optional: show a short-lived toast for copy/link feedback (visible when using shortcut or when row is off-screen). */
  onShowToast?: (message: string, kind?: "success" | "error") => void;
};

export function WorldExportImportRow({
  harmonicWorld,
  onImportWorld,
  copyWorldRef,
  onShowToast,
}: WorldExportImportRowProps) {
  const [worldCopyFeedback, setWorldCopyFeedback] = useState(false);
  const [worldLinkFeedback, setWorldLinkFeedback] = useState<null | "copied" | "error">(null);
  const [importFeedback, setImportFeedback] = useState<null | "loaded" | "error">(null);
  const loadWorldFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!copyWorldRef) return;
    copyWorldRef.current = { copyWorld: handleCopyWorld, copyLink: handleCopyWorldLink };
    return () => {
      copyWorldRef.current = null;
    };
  });

  const handleCopyWorld = () => {
    if (!harmonicWorld) return;
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return;
    const data = exportHarmonicWorld(harmonicWorld);
    const json = serializeHarmonicWorldExport(data, false);
    navigator.clipboard.writeText(json).then(
      () => {
        setWorldCopyFeedback(true);
        setTimeout(() => setWorldCopyFeedback(false), 1500);
        onShowToast?.("World copied to clipboard", "success");
      },
      () => {},
    );
  };

  const handleDownloadWorld = () => {
    if (!harmonicWorld) return;
    const data = exportHarmonicWorld(harmonicWorld);
    const json = serializeHarmonicWorldExport(data, true);
    const label = harmonicWorld.label ?? harmonicWorld.id ?? "export";
    const safe = label.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 48);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `xensonar-world-${safe}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyWorldLink = () => {
    if (!harmonicWorld) return;
    if (typeof window === "undefined") return;
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return;
    const data = exportHarmonicWorld(harmonicWorld);
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    const url = buildWorldShareUrl(data, baseUrl);
    // Conservative: avoid generating massive links.
    if (url.length > 8000) {
      setWorldLinkFeedback("error");
      setTimeout(() => setWorldLinkFeedback(null), 1800);
      onShowToast?.("Share link too long", "error");
      return;
    }
    navigator.clipboard.writeText(url).then(
      () => {
        setWorldLinkFeedback("copied");
        setTimeout(() => setWorldLinkFeedback(null), 1800);
        onShowToast?.("Link copied to clipboard", "success");
      },
      () => {
        setWorldLinkFeedback("error");
        setTimeout(() => setWorldLinkFeedback(null), 1800);
        onShowToast?.("Failed to copy link", "error");
      },
    );
  };

  const handlePasteWorld = async () => {
    if (!onImportWorld) return;
    if (typeof navigator === "undefined" || !navigator.clipboard?.readText) return;
    try {
      const raw = (await navigator.clipboard.readText()).trim();
      // Accept either raw JSON export or a share-link URL containing #world=...
      if (raw.startsWith("http://") || raw.startsWith("https://")) {
        try {
          const url = new URL(raw);
          const shared = consumeWorldShareHash(url.hash);
          if (shared.ok) {
            onImportWorld(shared.data);
            setImportFeedback("loaded");
            onShowToast?.("World loaded from link", "success");
          } else {
            setImportFeedback("error");
            onShowToast?.("Invalid share link", "error");
          }
        } catch {
          setImportFeedback("error");
          onShowToast?.("Invalid share link", "error");
        }
      } else {
        const result = parseAndValidateHarmonicWorldExport(raw);
        if (result.ok) {
          onImportWorld(result.data);
          setImportFeedback("loaded");
          onShowToast?.("World loaded from clipboard", "success");
        } else {
          setImportFeedback("error");
          onShowToast?.("Invalid paste", "error");
        }
      }
    } catch {
      setImportFeedback("error");
      onShowToast?.("Invalid paste", "error");
    }
    setTimeout(() => setImportFeedback(null), 2000);
  };

  const handleLoadWorldFile = () => {
    if (!onImportWorld) return;
    loadWorldFileInputRef.current?.click();
  };

  const handleLoadWorldFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onImportWorld) return;
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const result = parseAndValidateHarmonicWorldExport(text);
      if (result.ok) {
        onImportWorld(result.data);
        setImportFeedback("loaded");
        onShowToast?.("World loaded from file", "success");
      } else {
        setImportFeedback("error");
        onShowToast?.("Invalid file", "error");
      }
      setTimeout(() => setImportFeedback(null), 2000);
    };
    reader.onerror = () => {
      setImportFeedback("error");
      onShowToast?.("Failed to read file", "error");
      setTimeout(() => setImportFeedback(null), 2000);
    };
    reader.readAsText(file, "utf-8");
  };

  if (!harmonicWorld) return null;

  return (
    <div className="flex gap-2 flex-wrap items-center">
      <span className="text-[9px] text-neutral-500 uppercase tracking-widest mr-1">Export</span>
      <button
        type="button"
        onClick={handleCopyWorld}
        className="px-2 py-0.5 border border-neutral-700 text-[10px] text-neutral-300 hover:border-neutral-500 hover:bg-neutral-900"
        title="Copy world as JSON to clipboard"
      >
        {worldCopyFeedback ? EXPORT_WORLD_COPIED : EXPORT_WORLD_COPY}
      </button>
      <button
        type="button"
        onClick={handleCopyWorldLink}
        className="px-2 py-0.5 border border-neutral-700 text-[10px] text-neutral-300 hover:border-neutral-500 hover:bg-neutral-900"
        title="Copy a shareable URL that loads this world"
      >
        {worldLinkFeedback === "copied"
          ? EXPORT_WORLD_LINK_COPIED
          : worldLinkFeedback === "error"
            ? EXPORT_WORLD_LINK_FAILED
            : EXPORT_WORLD_COPY_LINK}
      </button>
      <button
        type="button"
        onClick={handleDownloadWorld}
        className="px-2 py-0.5 border border-neutral-700 text-[10px] text-neutral-300 hover:border-neutral-500 hover:bg-neutral-900"
        title="Download world as JSON file"
      >
        {EXPORT_WORLD_DOWNLOAD}
      </button>
      {onImportWorld && (
        <>
          <button
            type="button"
            onClick={() => void handlePasteWorld()}
            className="px-2 py-0.5 border border-neutral-700 text-[10px] text-neutral-300 hover:border-neutral-500 hover:bg-neutral-900"
            title="Paste world from clipboard (JSON)"
          >
            {importFeedback === "loaded"
              ? IMPORT_WORLD_LOADED
              : importFeedback === "error"
                ? IMPORT_WORLD_FAILED
                : IMPORT_WORLD_PASTE}
          </button>
          <input
            ref={loadWorldFileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            aria-hidden
            onChange={handleLoadWorldFileChange}
          />
          <button
            type="button"
            onClick={handleLoadWorldFile}
            className="px-2 py-0.5 border border-neutral-700 text-[10px] text-neutral-300 hover:border-neutral-500 hover:bg-neutral-900"
            title="Load world from JSON file"
          >
            {IMPORT_WORLD_LOAD_FILE}
          </button>
        </>
      )}
    </div>
  );
}
