import * as React from 'react';
import { loopUnitToLabel, noteDurationUnits, noteStartUnit, type LoopComposerState, type LoopNoteEvent } from './loopDrumDomain';
import { resolveLoopNoteRenderSourceKind } from './loopGridKernel';
import type { SavedMelodicSampleMeta } from './melodicSampleLibrary';
import { SelectedSampleEffectStrip } from './SelectedSampleEffectStrip';
import { LocalFieldWorkbench } from './LocalFieldWorkbench';
import { isFragmentableLoopImportBody, isMaterialImportBody, loopImportBodyLabel } from './loopImportExportContracts';
import type { SelectedNotePreviewOptions } from './selectedNotePreviewContract';

type Props = {
  loopComposer: LoopComposerState;
  selectedLoopNote: LoopNoteEvent | null;
  selectedLoopTrackLabel: string;
  selectedLoopStepLabel: string;
  selectedLoopSample: SavedMelodicSampleMeta | null;
  onMutateLoopComposer: (updater: (draft: LoopComposerState) => void, statusMessage?: string) => void;
  onOpenSampleDetails: (sampleId: string) => void;
  onPreviewSelectedNote: (options?: SelectedNotePreviewOptions) => Promise<void> | void;
  onStopPreview: (statusMessage?: string) => void;
  onFreezeSelectedNoteToSample: () => Promise<void> | void;
  onScrollToWorkspace?: () => void;
};

export function SelectedLoopBlockInspector({
  loopComposer,
  selectedLoopNote,
  selectedLoopTrackLabel,
  selectedLoopStepLabel,
  selectedLoopSample,
  onMutateLoopComposer,
  onOpenSampleDetails,
  onPreviewSelectedNote,
  onStopPreview,
  onFreezeSelectedNoteToSample,
  onScrollToWorkspace,
}: Props) {
  const selectedRenderSourceKind = selectedLoopNote ? resolveLoopNoteRenderSourceKind(loopComposer, selectedLoopNote) : null;
  const selectedSourceLabel = !selectedLoopNote
    ? null
    : isFragmentableLoopImportBody(selectedLoopNote)
      ? loopImportBodyLabel(selectedLoopNote)
      : selectedRenderSourceKind === 'material-import' || isMaterialImportBody(selectedLoopNote)
        ? loopImportBodyLabel(selectedLoopNote)
        : selectedRenderSourceKind === 'synth-frozen-sample'
          ? 'Synth-Sample-Block'
          : selectedRenderSourceKind === 'sample-block'
            ? 'Sample-Block'
            : 'Synth-Block';
  const [editorLoadedNoteId, setEditorLoadedNoteId] = React.useState<string | null>(null);
  const synthEditorVisible = !!selectedLoopNote && selectedRenderSourceKind === 'synth-live' && editorLoadedNoteId === selectedLoopNote.id;

  React.useEffect(() => {
    if (!selectedLoopNote || selectedRenderSourceKind !== 'synth-live') {
      setEditorLoadedNoteId(null);
    }
  }, [selectedLoopNote?.id, selectedRenderSourceKind]);

  return (
    <div className="rounded border border-neutral-800 bg-neutral-950/60 p-3 text-xs text-neutral-400">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="uppercase tracking-[0.2em] text-neutral-500">Block-Menü</div>
        {selectedLoopNote && selectedSourceLabel ? <span className="rounded border border-cyan-900/60 bg-cyan-950/30 px-2 py-0.5 text-[10px] text-cyan-100">{selectedSourceLabel}</span> : null}
      </div>
      {selectedLoopNote ? (
        <>
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Position</div>
              <div className="text-neutral-200">{loopUnitToLabel(loopComposer, noteStartUnit(loopComposer, selectedLoopNote))}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Ton / Raster</div>
              <div className="text-neutral-200">{selectedLoopStepLabel}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Spur</div>
              <div className="text-neutral-200">{selectedLoopTrackLabel}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Länge</div>
              <div className="text-neutral-200">{noteDurationUnits(loopComposer, selectedLoopNote).toFixed(2)}</div>
            </div>
          </div>
          <label className="mt-3 block space-y-1">
            <div className="flex items-center justify-between gap-3">
              <span className="uppercase tracking-[0.16em] text-neutral-500">Einzellautstärke</span>
              <span className="text-cyan-100">{Math.round(selectedLoopNote.velocity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1.2}
              step={0.01}
              value={selectedLoopNote.velocity}
              onChange={(e) => {
                const nextVelocity = Math.max(0, Math.min(1.2, Number(e.target.value)));
                onMutateLoopComposer((draft) => {
                  const note = draft.notes.find((entry) => entry.id === selectedLoopNote.id);
                  if (!note) return;
                  note.velocity = nextVelocity;
                }, `Block-Lautstärke ${Math.round(nextVelocity * 100)}%.`);
              }}
              className="w-full"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {[0.5, 0.75, 1, 1.15].map((factor) => (
              <button
                key={factor}
                type="button"
                className="rounded border border-neutral-700 px-2 py-1 text-[11px] text-neutral-200 hover:bg-neutral-900"
                onClick={() => onMutateLoopComposer((draft) => {
                  const note = draft.notes.find((entry) => entry.id === selectedLoopNote.id);
                  if (!note) return;
                  note.velocity = Math.max(0, Math.min(1.2, factor));
                }, `Block-Lautstärke ${Math.round(factor * 100)}%.`)}
              >
                {Math.round(factor * 100)}%
              </button>
            ))}
          </div>

          {selectedRenderSourceKind === 'synth-live' ? (
            <div className="mt-3 rounded border border-fuchsia-900/45 bg-fuchsia-950/15 p-3 text-[11px] text-fuchsia-100/82">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold text-fuchsia-100">Block-Editor</div>
                  <div className="mt-1 text-fuchsia-100/74">Dieser Synth-Block kann direkt im Projekt bearbeitet werden. Erst nach der Bearbeitung entscheidest du, ob derselbe Stand im Block bleibt oder als Sample festgeschrieben wird.</div>
                </div>
                <button
                  type="button"
                  className={`rounded border px-2 py-1 text-xs ${synthEditorVisible ? 'border-fuchsia-700/60 bg-fuchsia-700/20 text-fuchsia-50' : 'border-fuchsia-700/70 text-fuchsia-100 hover:bg-fuchsia-950/30'}`}
                  onClick={() => setEditorLoadedNoteId((current) => current === selectedLoopNote.id ? null : selectedLoopNote.id)}
                >
                  {synthEditorVisible ? 'Editor schließen' : 'In Editor laden'}
                </button>
              </div>
              {synthEditorVisible ? (
                <div className="mt-3 space-y-3">
                  <LocalFieldWorkbench
                    selectedNote={selectedLoopNote}
                    onMutateLoopComposer={onMutateLoopComposer}
                    title="Block-Editor"
                    description="Die Kurve gehört zunächst nur diesem Synth-Block. Tonhöhe und Lautstärke lassen sich direkt hier lesen, ohne dass der Block schon als Sample gilt."
                    statusDescription="Malen schreibt direkt in die vorhandene Linie. Morph / Warp verformt dieselbe Linie lokal nach oben, unten, links und rechts. Erst beim späteren Speichern als Sample entsteht ein eigener Material-Ast."
                  />
                  <div className="flex flex-wrap gap-2 rounded border border-fuchsia-900/40 bg-black/20 p-2">
                    <button
                      type="button"
                      className="rounded border border-cyan-700/70 bg-cyan-950/20 px-2 py-1 text-[11px] text-cyan-100 hover:bg-cyan-900/30"
                      onClick={() => { void onPreviewSelectedNote(); }}
                    >
                      Vorhören
                    </button>
                    <button
                      type="button"
                      className="rounded border border-emerald-700/70 bg-emerald-950/20 px-2 py-1 text-[11px] text-emerald-100 hover:bg-emerald-900/30"
                      onClick={() => {
                        onMutateLoopComposer((draft) => draft, 'Block-Kurve bleibt direkt im Projekt.');
                        setEditorLoadedNoteId(null);
                        onScrollToWorkspace?.();
                      }}
                    >
                      Übernehmen
                    </button>
                    <button
                      type="button"
                      className="rounded border border-fuchsia-700/70 bg-fuchsia-950/20 px-2 py-1 text-[11px] text-fuchsia-100 hover:bg-fuchsia-900/30"
                      onClick={() => { void onFreezeSelectedNoteToSample(); }}
                    >
                      Als Sample speichern
                    </button>
                    <button
                      type="button"
                      className="rounded border border-neutral-700 px-2 py-1 text-[11px] text-neutral-500"
                      disabled
                      title="Eigene Synth-Instrumente folgen als eigener Speicherschritt."
                    >
                      Als eigenes Synth-Instrument speichern
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {selectedLoopSample ? (
            <SelectedSampleEffectStrip
              sample={selectedLoopSample}
              selectedNote={selectedLoopNote}
              onOpenSampleDetails={onOpenSampleDetails}
              onPreviewSelectedNote={onPreviewSelectedNote}
              onStopPreview={onStopPreview}
              onFreezeSelectedNoteToSample={onFreezeSelectedNoteToSample}
              onMutateLoopComposer={onMutateLoopComposer}
              onScrollToWorkspace={onScrollToWorkspace}
            />
          ) : null}
        </>
      ) : (
        <div className="rounded border border-dashed border-neutral-800 px-2 py-3 text-neutral-500">Linksklick auf einen Noten- oder Sample-Block öffnet hier das kleine Block-Menü. Der Editor startet künftig direkt vom ausgewählten Block aus.</div>
      )}
    </div>
  );
}
