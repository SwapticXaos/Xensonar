import * as React from 'react';
import type { WorkspacePackageImportMode } from '../../core/systemMemory/packageCore';

type PackageActionRowProps = {
  exportLabel: string;
  replaceLabel?: string;
  compact?: boolean;
  title?: string;
  description?: string;
  onExport: () => void;
  onImport: (mode: WorkspacePackageImportMode) => void;
  hasWorkspacePackageContent?: boolean;
  className?: string;
};

type WorkspacePackageImportModeDialogProps = {
  open: boolean;
  onClose: () => void;
  onChoose: (mode: WorkspacePackageImportMode) => void;
};

function joinClasses(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export function WorkspacePackageImportModeDialog({ open, onClose, onChoose }: WorkspacePackageImportModeDialogProps) {
  if (!open) return null;
  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Workspace-Paket als Arbeitskopie laden"
        className="w-full max-w-xl rounded-2xl border border-amber-700/50 bg-neutral-950 p-4 text-xs text-neutral-300 shadow-2xl shadow-black/60"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="uppercase tracking-[0.18em] text-amber-300/90">Arbeitskopie laden</div>
            <div className="mt-1 text-sm font-semibold text-neutral-100">Wie soll das Workspace-Paket eingebunden werden?</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-neutral-700 px-2 py-1 text-neutral-300 hover:bg-neutral-900"
            aria-label="Dialog schließen"
          >
            Schließen
          </button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => onChoose('replace')}
            className="rounded-xl border border-rose-700/70 bg-rose-950/15 p-3 text-left text-rose-100 hover:bg-rose-950/30"
          >
            <div className="font-semibold">Ersetzend</div>
            <div className="mt-1 text-[11px] leading-relaxed text-rose-100/70">Bestehende Arbeitskopie wird durch das Paket ersetzt.</div>
          </button>
          <button
            type="button"
            onClick={() => onChoose('merge')}
            className="rounded-xl border border-cyan-700/70 bg-cyan-950/15 p-3 text-left text-cyan-100 hover:bg-cyan-950/30"
          >
            <div className="font-semibold">Additiv</div>
            <div className="mt-1 text-[11px] leading-relaxed text-cyan-100/70">Paket-Inhalte werden zur aktuellen Arbeitskopie ergänzt.</div>
          </button>
          <button
            type="button"
            onClick={() => onChoose('differential')}
            className="rounded-xl border border-amber-600/80 bg-amber-950/20 p-3 text-left text-amber-100 hover:bg-amber-950/35"
          >
            <div className="font-semibold">Differenzial</div>
            <div className="mt-1 text-[11px] leading-relaxed text-amber-100/72">Gleiche Namen und Signaturen werden ersetzt, Neues wird ergänzt.</div>
          </button>
        </div>
        <div className="mt-3 text-[11px] leading-relaxed text-neutral-500">
          Differenzial ist für Arbeitskopien gedacht, die denselben Ursprung haben, aber seitdem auseinander gelaufen sind.
        </div>
      </div>
    </div>
  );
}

export function PackageActionRow({
  exportLabel,
  replaceLabel = 'Paket als Arbeitskopie laden',
  compact = false,
  title,
  description,
  onExport,
  onImport,
  hasWorkspacePackageContent = true,
  className,
}: PackageActionRowProps) {
  const rowClassName = compact
    ? 'flex max-w-full flex-wrap justify-end gap-1.5'
    : 'mt-2 flex flex-wrap gap-2';
  const baseButtonClassName = compact
    ? 'rounded border px-2 py-1 text-[9px] uppercase tracking-[0.14em]'
    : 'rounded border px-3 py-2';
  const [importModePickerOpen, setImportModePickerOpen] = React.useState(false);

  React.useEffect(() => {
    if (!importModePickerOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setImportModePickerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [importModePickerOpen]);

  const chooseImportMode = (mode: WorkspacePackageImportMode) => {
    setImportModePickerOpen(false);
    onImport(mode);
  };

  const requestImport = () => {
    if (!hasWorkspacePackageContent) {
      onImport('replace');
      return;
    }
    setImportModePickerOpen(true);
  };

  const content = (
    <>
      <div className={joinClasses(rowClassName, className)}>
        <button
          type="button"
          onClick={onExport}
          className={joinClasses(baseButtonClassName, 'border-cyan-700/70 text-cyan-100 hover:bg-cyan-950/30')}
        >
          {exportLabel}
        </button>
        <button
          type="button"
          onClick={requestImport}
          className={joinClasses(baseButtonClassName, 'border-amber-700/70 text-amber-100 hover:bg-amber-950/30')}
          title={hasWorkspacePackageContent ? 'Öffnet die Auswahl für ersetzend, additiv oder differenzial/kombinierend.' : 'Keine lokale Arbeitskopie erkannt: öffnet direkt die Paket-Dateiauswahl.'}
        >
          {replaceLabel}
        </button>
      </div>
      <WorkspacePackageImportModeDialog
        open={importModePickerOpen}
        onClose={() => setImportModePickerOpen(false)}
        onChoose={chooseImportMode}
      />
    </>
  );

  if (!title && !description) return content;

  return (
    <div className="rounded border border-neutral-800 bg-neutral-950/40 p-2 text-[11px] text-neutral-400">
      {title ? <div className="uppercase tracking-[0.16em] text-neutral-500">{title}</div> : null}
      {description ? <div className="mt-1 text-neutral-500">{description}</div> : null}
      {content}
    </div>
  );
}
