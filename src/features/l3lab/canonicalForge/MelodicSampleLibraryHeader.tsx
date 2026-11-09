import * as React from 'react';

export type MelodicSampleLibraryHeaderProps = {
  sampleCount: number;
  open: boolean;
  deleteMode: boolean;
  onToggleOpen: () => void;
  onOpenMaterialImportMenu: () => void;
  onToggleSpectralSampleHelp: () => void;
  onToggleDeleteMode: () => void;
  onUploadMelodicSamples: (files: File[]) => void;
};

export function MelodicSampleLibraryHeader({
  sampleCount,
  open,
  deleteMode,
  onToggleOpen,
  onOpenMaterialImportMenu,
  onToggleSpectralSampleHelp,
  onToggleDeleteMode,
  onUploadMelodicSamples,
}: MelodicSampleLibraryHeaderProps) {
  const sampleInputRef = React.useRef<HTMLInputElement | null>(null);

  const uploadSamplesFromInput = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length) onUploadMelodicSamples(files);
    event.currentTarget.value = '';
  }, [onUploadMelodicSamples]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="uppercase tracking-[0.18em] text-neutral-500">Sample-Datenbank</div>
        <div className="mt-1 text-[11px] text-neutral-500">Uploads werden analysiert, als einzelne Sample-Objekte gespeichert und tauchen dann im Klang-Menü unter Samples auf.</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="rounded border border-neutral-800 px-2 py-1 text-[11px] text-neutral-400">{sampleCount} Samples</div>
        <button
          type="button"
          onClick={onToggleOpen}
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-200 hover:bg-neutral-800"
        >
          {open ? 'Einklappen' : 'Ausklappen'}
        </button>
        {open ? (
          <>
            <button
              type="button"
              onClick={onOpenMaterialImportMenu}
              className="rounded border border-fuchsia-700/70 bg-fuchsia-950/25 px-3 py-2 text-fuchsia-100 hover:bg-fuchsia-900/30"
            >
              Materialspur importieren
            </button>
            <button
              type="button"
              onClick={onToggleSpectralSampleHelp}
              className="rounded border border-violet-700/70 bg-violet-950/25 px-3 py-2 text-violet-100 hover:bg-violet-900/30"
            >
              Aus SpectralForge übernehmen
            </button>
            <button
              type="button"
              onClick={onToggleDeleteMode}
              className={`rounded border px-3 py-2 ${deleteMode ? 'border-red-500 bg-red-950/35 text-red-100' : 'border-red-900/60 bg-red-950/10 text-red-200/80 hover:bg-red-950/25'}`}
            >
              Löschen
            </button>
            <button
              type="button"
              onClick={() => sampleInputRef.current?.click()}
              className="rounded border border-cyan-700/70 bg-cyan-950/25 px-3 py-2 text-cyan-100 hover:bg-cyan-900/30"
            >
              Samples hochladen
            </button>
          </>
        ) : null}
        <input
          ref={sampleInputRef}
          type="file"
          accept="audio/*"
          multiple
          className="hidden"
          onChange={uploadSamplesFromInput}
        />
      </div>
    </div>
  );
}
