import type { LoopNoteEvent } from './loopDrumDomain';
import { loopImportBodyLabel } from './loopImportExportContracts';

type FragmentTargetOption = {
  noteId: string;
  label: string;
  color: string;
  pendingAnchor: boolean;
};

type Props = {
  materialFragmentPrepActive: boolean;
  materialBaseFragmentCount: string;
  selectedMaterialBaseNote: LoopNoteEvent | null;
  selectedImportTrackLabel?: string | null;
  selectedImportTrackColor?: string | null;
  fragmentTargetOptions: FragmentTargetOption[];
  onSelectFragmentTarget: (noteId: string) => void;
  onFragmentMaterialBaseSelection: () => void;
};

export function MaterialBaseFragmentActionCard({
  materialFragmentPrepActive,
  materialBaseFragmentCount,
  selectedMaterialBaseNote,
  selectedImportTrackLabel,
  selectedImportTrackColor,
  fragmentTargetOptions,
  onSelectFragmentTarget,
  onFragmentMaterialBaseSelection,
}: Props) {
  const pendingAnchor = selectedMaterialBaseNote?.pendingPitchAnchor === true;
  const bodyLabel = loopImportBodyLabel(selectedMaterialBaseNote);
  const targetLabel = selectedMaterialBaseNote
    ? `${selectedImportTrackLabel || bodyLabel} · ${bodyLabel}`
    : null;
  return (
    <div className="rounded border border-fuchsia-900/40 bg-fuchsia-950/20 px-3 py-2 text-[11px] text-fuchsia-100/80 xl:min-w-[19rem]">
      <div className="flex items-center justify-between gap-3">
        <div className="uppercase tracking-[0.16em] text-fuchsia-300/80">Importkörper schneiden</div>
        <div className="text-[10px] text-neutral-500">{materialBaseFragmentCount}</div>
      </div>
      {fragmentTargetOptions.length ? (
        <label className="mt-2 flex items-center gap-2 rounded border border-neutral-800 bg-black/25 px-2 py-1.5 text-neutral-200">
          <span className="h-3 w-3 shrink-0 rounded-full border border-white/25" style={{ backgroundColor: selectedImportTrackColor ?? '#ec4899' }} />
          <span className="shrink-0 text-neutral-400">Ziel:</span>
          <select
            aria-label="Schnittziel"
            value={selectedMaterialBaseNote?.id ?? ''}
            onChange={(event) => onSelectFragmentTarget(event.target.value)}
            className="min-w-0 flex-1 rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100 outline-none focus:border-fuchsia-500"
          >
            <option value="" disabled>Importspur wählen …</option>
            {fragmentTargetOptions.map((option) => (
              <option key={option.noteId} value={option.noteId}>
                {option.label}{option.pendingAnchor ? ' · Raw-Anker fehlt' : ''}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="mt-2 leading-relaxed text-neutral-400">Noch kein schneidbarer Importkörper vorhanden.</div>
      )}
      {targetLabel ? (
        <div className="mt-1 text-[10px] text-neutral-500">Aktuell: {targetLabel}</div>
      ) : fragmentTargetOptions.length ? (
        <div className="mt-1 text-[10px] text-neutral-500">Wähle das Schnittziel hier ausdrücklich aus. Rasterklicks wechseln ein vorbereitetes Ziel nicht unbeabsichtigt.</div>
      ) : null}
      <div className="mt-2 leading-relaxed">
        {pendingAnchor
          ? 'Diese Importspur hat ihre Raw-Ankergriffstufe noch nicht. Erst klicken oder vertikal draggen; das legt nur die Roh-Audio-Referenz fest. Normales Dragging bleibt danach aktiv, anschließend kann geschnitten werden.'
          : 'Lege die Segmentmarker für den ausgewählten Importkörper fest. Der erste Klick entkoppelt ihre Periodik; der zweite Klick friert die aktuelle Lage als Fragmentgrenzen ein.'}
      </div>
      <button
        type="button"
        disabled={!selectedMaterialBaseNote || pendingAnchor}
        onClick={onFragmentMaterialBaseSelection}
        className={`mt-3 flex w-full items-center justify-center gap-2 rounded border px-3 py-2 font-semibold transition disabled:opacity-40 ${
          materialFragmentPrepActive
            ? 'border-pink-400 bg-pink-600/90 text-white shadow-[0_0_0_1px_rgba(251,113,133,0.35),0_8px_24px_rgba(190,24,93,0.28)] hover:bg-pink-500/95'
            : 'border-fuchsia-700/80 bg-fuchsia-950/35 text-fuchsia-50 hover:bg-fuchsia-900/35'
        }`}
      >
        {materialFragmentPrepActive
          ? (<><span className="inline-flex h-2.5 w-2.5 rounded-full bg-white/95 shadow-[0_0_0_4px_rgba(255,255,255,0.14)]" />So schneiden? · {bodyLabel}</>)
          : 'Schnitt für Auswahl vorbereiten'}
      </button>
    </div>
  );
}
