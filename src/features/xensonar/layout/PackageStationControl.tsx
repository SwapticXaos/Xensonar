import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { BROWSER_SAFE_FILE_INPUT_CLASSNAME, clickBrowserSafeFileInput } from '../../../core/browser/browserSafeFileInput';
import { WorkspacePackageImportModeDialog } from '../../../components/systemMemory/PackageActionRow';
import {
  buildPreparedJsonPackageDownloadAliasFilename,
  revokePreparedJsonPackageDownload,
  type PreparedJsonPackageDownload,
  type WorkspacePackageImportMode,
} from '../../../core/systemMemory/packageCore';
import {
  WORKSPACE_PACKAGE_DEFAULT_EMPTY_IMPORT_MODE,
  importXensonarPackageStationFile,
  prepareXensonarPackageStationDownload,
  readXensonarPackageStationHasContent,
} from '../../../core/systemMemory/xensonarPackageStationBridge';
import {
  WORKSPACE_PACKAGE_DEFAULT_TITLE,
  normalizeWorkspacePackageTitle,
} from '../../../core/systemMemory/workspacePackageTitle';

type PackageStationControlProps = {
  open: boolean;
  onToggleOpen: () => void;
  onOpenMaterialschmiede?: () => void;
};

function PackageStationBracket({ side }: { side: 'left' | 'right' }) {
  return (
    <svg
      width="20"
      height="28"
      viewBox="0 0 20 28"
      fill="none"
      aria-hidden="true"
      className="text-sky-300"
      style={{ transform: side === 'left' ? 'scaleX(-1)' : undefined }}
    >
      <path d="M5 4 C8.5 8.5, 8.5 19.5, 5 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M9.5 2.5 C14.5 8, 14.5 20, 9.5 25.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function PackageUploadIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true" className="drop-shadow-sm">
      <path d="M7 23.5h18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M9.5 20.5v4.2c0 1.2.9 2.1 2.1 2.1h8.8c1.2 0 2.1-.9 2.1-2.1v-4.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 20.5V5.8" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M10.9 10.9 16 5.8l5.1 5.1" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="11.6" stroke="currentColor" strokeWidth="1.2" opacity="0.22" />
    </svg>
  );
}

function PackageDownloadIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true" className="drop-shadow-sm">
      <path d="M7 23.5h18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M9.5 20.5v4.2c0 1.2.9 2.1 2.1 2.1h8.8c1.2 0 2.1-.9 2.1-2.1v-4.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 5.8v14.7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M21.1 15.4 16 20.5l-5.1-5.1" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="11.6" stroke="currentColor" strokeWidth="1.2" opacity="0.22" />
    </svg>
  );
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function PackageStationControl({ open, onToggleOpen, onOpenMaterialschmiede }: PackageStationControlProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingImportModeRef = useRef<WorkspacePackageImportMode>(WORKSPACE_PACKAGE_DEFAULT_EMPTY_IMPORT_MODE);
  const [importModePickerOpen, setImportModePickerOpen] = useState(false);
  const [preparedDownload, setPreparedDownload] = useState<PreparedJsonPackageDownload | null>(null);
  const [packageTitle, setPackageTitle] = useState(WORKSPACE_PACKAGE_DEFAULT_TITLE);
  const [exportPreparing, setExportPreparing] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    return () => revokePreparedJsonPackageDownload(preparedDownload);
  }, [preparedDownload]);

  const clearPreparedDownload = () => {
    setPreparedDownload((current) => {
      revokePreparedJsonPackageDownload(current);
      return null;
    });
  };

  const startVisiblePackageUpload = (mode: WorkspacePackageImportMode) => {
    pendingImportModeRef.current = mode;
    clickBrowserSafeFileInput(fileInputRef.current);
  };

  const requestUpload = () => {
    const hasContent = readXensonarPackageStationHasContent();
    if (!hasContent) {
      startVisiblePackageUpload(WORKSPACE_PACKAGE_DEFAULT_EMPTY_IMPORT_MODE);
      return;
    }
    setImportModePickerOpen(true);
  };

  const chooseImportMode = (mode: WorkspacePackageImportMode) => {
    setImportModePickerOpen(false);
    startVisiblePackageUpload(mode);
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;
    const handledNow = importXensonarPackageStationFile(file, pendingImportModeRef.current);
    if (!handledNow) onOpenMaterialschmiede?.();
  };

  const requestDownloadPreparation = async () => {
    clearPreparedDownload();
    setExportError(null);
    setExportPreparing(true);
    try {
      const result = await prepareXensonarPackageStationDownload({
        waitForHandlerMs: 2500,
      });
      if (!result?.download) {
        setExportError('Paket konnte nicht vorbereitet werden.');
        return;
      }
      setPreparedDownload(result.download);
    } catch (error) {
      console.error('[xensonar][package-station][prepare-download]', error);
      setExportError(error instanceof Error ? error.message : 'Paket konnte nicht vorbereitet werden.');
    } finally {
      setExportPreparing(false);
    }
  };

  const buildDownloadAliasFilename = (download: PreparedJsonPackageDownload) => buildPreparedJsonPackageDownloadAliasFilename(
    download,
    normalizeWorkspacePackageTitle(packageTitle),
  );

  const handlePreparedDownloadClick = () => {
    window.setTimeout(() => clearPreparedDownload(), 4000);
  };

  return (
    <div className="flex items-center gap-1 pl-1" aria-label="Paketstation Bereich">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className={BROWSER_SAFE_FILE_INPUT_CLASSNAME}
        onChange={handleFileInputChange}
      />
      <WorkspacePackageImportModeDialog
        open={importModePickerOpen}
        onClose={() => setImportModePickerOpen(false)}
        onChoose={chooseImportMode}
      />
      <PackageStationBracket side="left" />
      <div className="relative">
        <button
          type="button"
          onClick={onToggleOpen}
          className="rounded-full border border-cyan-700/70 bg-cyan-950/25 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-cyan-100 hover:bg-cyan-900/35"
          aria-expanded={open}
          aria-label="Paketstation öffnen"
        >
          Paketstation
        </button>
        {open ? (
          <div className="absolute left-1/2 top-[calc(100%+0.5rem)] z-[1100] w-72 -translate-x-1/2 rounded-2xl border border-cyan-800/70 bg-neutral-950/95 p-2 shadow-2xl shadow-black/60 backdrop-blur">
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={requestUpload}
                className="flex h-14 w-14 items-center justify-center rounded-xl border border-amber-600/80 bg-amber-950/25 text-amber-100 hover:bg-amber-900/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70"
                title="Workspace-Paket laden"
                aria-label="Workspace-Paket laden"
              >
                <PackageUploadIcon />
              </button>
              <button
                type="button"
                onClick={() => void requestDownloadPreparation()}
                disabled={exportPreparing}
                className="flex h-14 w-14 items-center justify-center rounded-xl border border-cyan-600/80 bg-cyan-950/30 text-cyan-100 hover:bg-cyan-900/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:cursor-wait disabled:opacity-60"
                title="Workspace-Paket vorbereiten"
                aria-label="Workspace-Paket vorbereiten"
              >
                <PackageDownloadIcon />
              </button>
            </div>
            {exportPreparing ? (
              <div className="mt-2 rounded-lg border border-cyan-800/50 bg-cyan-950/20 px-2 py-1.5 text-center text-[10px] uppercase tracking-[0.16em] text-cyan-100/80">
                Paket wird vorbereitet …
              </div>
            ) : null}
            {preparedDownload ? (
              <div className="mt-2 rounded-xl border border-emerald-700/70 bg-emerald-950/20 p-2 text-[11px] text-emerald-100">
                <div className="truncate text-[10px] uppercase tracking-[0.15em] text-emerald-200/80">Paket fertig · {formatBytes(preparedDownload.byteLength)}</div>
                <label className="mt-1 block text-[10px] uppercase tracking-[0.14em] text-emerald-100/60">
                  Download-Alias
                  <input
                    type="text"
                    value={packageTitle}
                    onChange={(event) => setPackageTitle(event.target.value)}
                    placeholder={WORKSPACE_PACKAGE_DEFAULT_TITLE}
                    className="mt-1 w-full rounded border border-emerald-600/50 bg-neutral-950/70 px-2 py-1 text-[11px] normal-case tracking-normal text-emerald-50 outline-none focus:border-emerald-300"
                  />
                </label>
                <a
                  href={preparedDownload.url}
                  download={buildDownloadAliasFilename(preparedDownload)}
                  onClick={handlePreparedDownloadClick}
                  className="mt-1 block rounded border border-emerald-500/70 bg-emerald-900/35 px-2 py-1.5 text-center font-semibold text-emerald-50 hover:bg-emerald-800/45"
                >
                  Jetzt speichern
                </a>
                <div className="mt-1 truncate text-[10px] text-emerald-100/60">
                  {buildDownloadAliasFilename(preparedDownload)}
                </div>
              </div>
            ) : null}
            {exportError ? (
              <div className="mt-2 rounded-lg border border-rose-800/70 bg-rose-950/25 px-2 py-1.5 text-[10px] leading-relaxed text-rose-100/85">
                {exportError}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <PackageStationBracket side="right" />
    </div>
  );
}
