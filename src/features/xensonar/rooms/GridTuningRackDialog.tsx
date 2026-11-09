import { useEffect, useState, type DragEvent as ReactDragEvent } from 'react';
import {
  getOptionLabel,
  getRasterDefinition,
  type GridTuning,
} from '../domain/instrumentData';
import { PackageActionRow } from '../../../components/systemMemory/PackageActionRow';
import { decodePlaylistDropTarget } from '../material/playlistDropOperation';
import { PlaylistDragActionHud } from './PlaylistDragActionHud';
import {
  JI_WORKBENCH_INTERVALS,
  PERIOD_CANONICAL_CENTS,
  WORKBENCH_HEIGHT,
  clamp,
  formatStepLabel,
  isCustomGridTuningId,
  roundTenth,
} from './gridTuningRack/gridTuningEditorDomain';
import { useGridTuningEditorSession } from './gridTuningRack/useGridTuningEditorSession';
import { useGridTuningRackLibraryWorkspace } from './gridTuningRack/useGridTuningRackLibraryWorkspace';

type Props = {
  open: boolean;
  currentTuning: GridTuning;
  activeRack: GridTuning[];
  onClose: () => void;
  onRackChange: (nextRack: GridTuning[]) => void;
  onActivateTuning: (tuning: GridTuning) => void;
  onResetRack: () => void;
  onUseInMelodicLoop?: (tuning: GridTuning) => void;
};

export function GridTuningRackDialog({
  open,
  currentTuning,
  activeRack,
  onClose,
  onRackChange,
  onActivateTuning,
  onResetRack,
  onUseInMelodicLoop,
}: Props) {
  const [uiMessage, setUiMessage] = useState('');
  const editorSession = useGridTuningEditorSession({ open, currentTuning, onMessage: setUiMessage });
  const {
    editor, setEditor, selectedMarkerIndex, setSelectedMarkerIndex, centInput, setCentInput, jiMenuOpen, setJiMenuOpen,
    workbenchRef, draftClassification, workbenchMarkers, jiMenuStates, trackedJiCount, rebuildEqualDraft,
    updateSelectedMarker, toggleJiInterval, beginMarkerDrag, markSaved, loadTuning,
  } = editorSession;

  useEffect(() => {
    if (!open) return;
    setUiMessage('');
  }, [open, currentTuning]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) {
        event.preventDefault();
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleWindowKeyDown, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleWindowKeyDown, true);
    };
  }, [open]);



  const rackLibrary = useGridTuningRackLibraryWorkspace({
    open,
    currentTuning,
    activeRack,
    editor,
    draftClassification,
    onRackChange,
    onActivateTuning,
    onMessage: setUiMessage,
    loadTuning,
    markSaved,
  });
  const {
    selectedTuning, setSelectedTuning, dragPayload, rackDropTarget, dragHud, libraryOptions, activeRackSlots, selectedLibraryEntryRef,
    gridLibraryImportInputRef, rackDropPreview, rackInsertNeighborIds, registerRackRow, handleRackDragOver, handleRackDrop,
    beginRackDrag, beginLibraryDrag, endDrag, handleRemoveFromRack, handleMoveRackEntry, selectRackTuning, selectLibraryTuning,
    handleSaveDraft, handleDeleteCustom, requestGridLibraryImport, handleGridLibraryImportInput, handleExportGridLibraryArchive,
  } = rackLibrary;

  if (!open) return null;

  const rackDragLabel = rackDropPreview?.label ?? '';
  const rackDragTargetLine = rackDropPreview?.targetLine ?? '';
  const rackDragTitle = dragPayload ? getOptionLabel(libraryOptions, dragPayload.tuning) : '';
  const rackDragSubtitle = dragPayload?.source === 'rack' ? `Slot ${dragPayload.fromIndex + 1}` : dragPayload ? 'aus Bibliothek' : '';

  return (
    <div
      className="fixed inset-0 z-[160] flex items-start justify-center overflow-hidden bg-black/70 px-4 pb-4 pt-4 sm:pt-6"
      onClick={onClose}
      onKeyDownCapture={(event) => {
        event.stopPropagation();
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
          return;
        }
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) {
          event.preventDefault();
        }
      }}
    >
      <PlaylistDragActionHud state={dragHud} label={rackDragLabel} title={rackDragTargetLine} sourceTitle={rackDragTitle} sourceSubtitle={rackDragSubtitle} tone="fuchsia" />
      <div
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-fuchsia-800/70 bg-neutral-950 p-4 text-[11px] shadow-2xl shadow-black/60"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-fuchsia-300/80">🪜 Raster-Werkbank</div>
            <div className="mt-1 text-base font-semibold text-fuchsia-50">Aktives Durchschalt-Rack, Tuning-Bibliothek und Perioden-Werkbank</div>
            <div className="mt-1 text-fuchsia-100/75">Kompaktes Verwaltungsfenster. Bibliothek scrollt intern; Rack und Werkbank bleiben fest im Fenster.</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-fuchsia-800/70 px-3 py-1 text-base font-bold leading-none text-fuchsia-100 hover:bg-fuchsia-950/40">×</button>
        </div>

        <input
          ref={gridLibraryImportInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => { void handleGridLibraryImportInput(event); }}
        />

        <div className="mt-4 grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[minmax(17rem,0.9fr)_minmax(18rem,1fr)_minmax(23rem,1.05fr)]">
          <div className="space-y-3 min-h-0">
            <div className="rounded border border-fuchsia-900/50 bg-fuchsia-950/20 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-fuchsia-200/70">Aktive Auswahl</div>
                  <div className="text-[10px] leading-relaxed text-fuchsia-100/75">Bis zu 11 Slots. Default sind 9 gefüllt. Nur diese Liste wird durchgeschaltet.</div>
                </div>
                <div className="flex items-center gap-2">
                  {onUseInMelodicLoop ? (
                    <button
                      type="button"
                      onClick={() => {
                        onUseInMelodicLoop(selectedTuning);
                        setUiMessage(`${getOptionLabel(libraryOptions, selectedTuning)} wird jetzt im Melodic Loop genutzt.`);
                      }}
                      className="rounded border border-violet-700/70 bg-violet-950/25 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-violet-100 hover:bg-violet-900/30"
                    >
                      Im Melodic Loop nutzen
                    </button>
                  ) : null}
                  <button type="button" onClick={onResetRack} className="rounded border border-fuchsia-800/70 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-fuchsia-100 hover:bg-fuchsia-950/40">Defaults</button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2" onDragOver={handleRackDragOver} onDrop={handleRackDrop}>
                {activeRackSlots.map((entry, index) => {
                  const isCurrent = entry === currentTuning;
                  const isSelected = entry === selectedTuning;
                  const decodedDrop = decodePlaylistDropTarget(rackDropTarget);
                  const isSwapTarget = decodedDrop?.operation === 'swap' && decodedDrop.entryId === String(index) && dragPayload !== null;
                  const isInsertTarget = rackInsertNeighborIds.has(String(index)) && dragPayload !== null;
                  return (
                    <div
                      key={`slot-${index}`}
                      ref={(element) => {
                        registerRackRow(String(index), element);
                      }}
                      className="relative"
                    >
                      <div
                        className={`rounded-xl border px-3 py-2 ${entry ? 'bg-black/25' : 'bg-black/10'} ${isSwapTarget ? 'border-amber-400/80' : isInsertTarget ? 'border-cyan-400/80' : dragPayload ? 'border-fuchsia-700/70' : 'border-neutral-800'}`}
                      >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (!entry) return;
                            selectRackTuning(entry);
                          }}
                          draggable={!!entry}
                          onDragStart={(event: ReactDragEvent<HTMLElement>) => {
                            if (!entry) return;
                            beginRackDrag(event, entry, index);
                          }}
                          onDragEnd={endDrag}
                          className={`min-w-0 flex-1 rounded-lg px-2 py-1 text-left ${entry ? (isSelected ? 'bg-fuchsia-950/40 text-fuchsia-50' : 'text-neutral-200 hover:bg-neutral-900/80') : 'text-neutral-600'}`}
                        >
                          <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Slot {index + 1}</div>
                          <div className={`truncate font-semibold ${isCurrent ? 'text-cyan-200' : ''}`}>{entry ? getOptionLabel(libraryOptions, entry) : 'leer'}</div>
                        </button>
                        {entry ? (
                          <div className="flex shrink-0 items-center gap-1">
                            <button type="button" onClick={() => handleMoveRackEntry(index, -1)} className="rounded border border-fuchsia-900/70 px-2 py-1 text-[10px] text-fuchsia-100 hover:bg-fuchsia-950/40">↑</button>
                            <button type="button" onClick={() => handleMoveRackEntry(index, 1)} className="rounded border border-fuchsia-900/70 px-2 py-1 text-[10px] text-fuchsia-100 hover:bg-fuchsia-950/40">↓</button>
                            <button type="button" onClick={() => handleRemoveFromRack(index)} className="rounded border border-fuchsia-900/70 px-2 py-1 text-[10px] text-fuchsia-100 hover:bg-fuchsia-950/40">−</button>
                          </div>
                        ) : (
                          <div className="shrink-0 rounded border border-dashed border-fuchsia-900/40 px-2 py-1 text-[10px] text-fuchsia-100/55">Drop</div>
                        )}
                      </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col">
            <div className="flex min-h-0 flex-1 flex-col rounded border border-fuchsia-900/50 bg-fuchsia-950/20 p-3">
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-fuchsia-200/70">Tuning-Bibliothek</div>
                  <div className="text-[10px] leading-relaxed text-fuchsia-100/75">Custom-Raster bleiben hier erhalten. Von hier aus per Drag & Drop ins aktive Rack ziehen.</div>
                </div>
                <PackageActionRow
                  compact
                  exportLabel="Bibliothekspaket exportieren"
                  replaceLabel="Arbeitskopie laden"
                  onExport={() => { void handleExportGridLibraryArchive(); }}
                  onImport={requestGridLibraryImport}
                />
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1" onWheelCapture={(event) => event.stopPropagation()}>
                {libraryOptions.map((option) => {
                  const definition = getRasterDefinition(option.value);
                  const isSelected = selectedTuning === option.value;
                  const customEntry = isCustomGridTuningId(option.value);
                  return (
                    <div
                      key={option.value}
                      ref={isSelected ? selectedLibraryEntryRef : null}
                      draggable
                      onDragStart={(event: ReactDragEvent<HTMLElement>) => {
                        beginLibraryDrag(event, option.value);
                      }}
                      onDragEnd={endDrag}
                      className={`rounded-xl border px-3 py-2 ${isSelected ? 'border-fuchsia-500 bg-fuchsia-950/40 text-fuchsia-50' : 'border-neutral-800 bg-black/20 text-neutral-200 hover:bg-neutral-900/80'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            selectLibraryTuning(option.value);
                          }}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="truncate font-semibold">{option.label}</div>
                          <div className="text-[10px] text-neutral-500">{definition ? `${definition.family.toUpperCase()} · ${definition.periodFamily === 'tritave' ? 'Tritave' : 'Oktave'} · ${definition.steps} Schritte` : 'Raster'}</div>
                        </button>
                        <div className="flex shrink-0 items-center gap-1">
                          {customEntry ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteCustom(option.value)}
                              className="rounded border border-rose-900/70 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-rose-100 hover:bg-rose-950/40"
                            >
                              löschen
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-3 min-h-0">
            <div className="rounded border border-fuchsia-900/50 bg-fuchsia-950/20 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-fuchsia-200/70">Perioden-Werkbank</div>
                  <div className="mt-1 text-[10px] leading-relaxed text-fuchsia-100/75">Eine Periode bearbeiten, Marker ziehen, in Cent feinjustieren, dann in der Bibliothek speichern.</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    loadTuning('12edo');
                    setSelectedTuning('12edo');
                  }}
                  className="rounded border border-fuchsia-800/70 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-fuchsia-100 hover:bg-fuchsia-950/40"
                >
                  Neu
                </button>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1 text-[10px] text-fuchsia-100/80">
                      <span className="uppercase tracking-[0.18em] text-fuchsia-200/70">Periode</span>
                      <button type="button" onClick={() => rebuildEqualDraft('octave', editor.steps, PERIOD_CANONICAL_CENTS.octave)} className={`w-full rounded border px-3 py-2 ${editor.periodFamily === 'octave' ? 'border-fuchsia-500 bg-fuchsia-950/40 text-fuchsia-50' : 'border-fuchsia-900/50 text-fuchsia-100 hover:bg-fuchsia-950/30'}`}>Oktave</button>
                    </label>
                    <label className="space-y-1 text-[10px] text-fuchsia-100/80">
                      <span className="uppercase tracking-[0.18em] text-fuchsia-200/70">&nbsp;</span>
                      <button type="button" onClick={() => rebuildEqualDraft('tritave', editor.steps, PERIOD_CANONICAL_CENTS.tritave)} className={`w-full rounded border px-3 py-2 ${editor.periodFamily === 'tritave' ? 'border-fuchsia-500 bg-fuchsia-950/40 text-fuchsia-50' : 'border-fuchsia-900/50 text-fuchsia-100 hover:bg-fuchsia-950/30'}`}>Tritave</button>
                    </label>
                    <label className="space-y-1 text-[10px] text-fuchsia-100/80">
                      <span className="uppercase tracking-[0.18em] text-fuchsia-200/70">Cent total</span>
                      <input
                        type="number"
                        min={400}
                        max={4000}
                        step={0.1}
                        value={editor.periodCents}
                        onChange={(event) => setEditor((previous) => ({ ...previous, periodCents: roundTenth(clamp(Number(event.target.value) || previous.periodCents, 400, 4000)) }))}
                        onBlur={() => setEditor((previous) => ({ ...previous, periodCents: roundTenth(clamp(previous.periodCents, 400, 4000)) }))}
                        className="w-full rounded border border-fuchsia-900/50 bg-black/25 px-3 py-1.5 text-sm text-fuchsia-50"
                      />
                    </label>
                    <div className="relative space-y-1 text-[10px] text-fuchsia-100/80">
                      <span className="uppercase tracking-[0.18em] text-fuchsia-200/70">&nbsp;</span>
                      <button
                        type="button"
                        onClick={() => setJiMenuOpen((value) => !value)}
                        className={`w-full rounded border px-3 py-1.5 ${jiMenuOpen || trackedJiCount > 0 ? 'border-emerald-500/60 bg-fuchsia-950/40 text-fuchsia-50' : 'border-fuchsia-900/50 text-fuchsia-100 hover:bg-fuchsia-950/30'}`}
                      >
                        JI
                      </button>
                      {jiMenuOpen ? (
                        <div className="absolute left-0 top-full z-10 mt-1 w-[9.5rem] rounded border border-fuchsia-800/70 bg-[#12061f] p-2 shadow-xl shadow-black/50">
                          <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
                            {JI_WORKBENCH_INTERVALS.map((node) => {
                              const state = jiMenuStates[node.label] ?? 'idle';
                              return (
                                <button
                                  key={node.label}
                                  type="button"
                                  onClick={() => toggleJiInterval(node.label, node.cents)}
                                  className={`block w-full rounded border px-2 py-1 text-left text-[10px] hover:bg-fuchsia-950/30 ${state === 'exact' ? 'border-emerald-500/50 text-emerald-300' : state === 'shifted' ? 'border-amber-500/50 text-amber-300' : 'border-fuchsia-900/50 text-fuchsia-100'}`}
                                >
                                  <div className="font-medium">{node.label}</div>
                                  <div className="text-[9px] opacity-75">{node.cents.toFixed(1)}c</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="space-y-1 text-[10px] text-fuchsia-100/80">
                    <span className="uppercase tracking-[0.18em] text-fuchsia-200/70">Tonschritte</span>
                    <input
                      type="number"
                      min={2}
                      max={64}
                      step={1}
                      value={editor.steps}
                      onChange={(event) => rebuildEqualDraft(editor.periodFamily, Number(event.target.value) || 12, editor.periodCents)}
                      className="w-full rounded border border-fuchsia-900/50 bg-black/25 px-3 py-2 text-sm text-fuchsia-50"
                    />
                  </label>
                  <div className="space-y-1 text-[10px] text-fuchsia-100/80">
                    <span className="uppercase tracking-[0.18em] text-fuchsia-200/70">Basis</span>
                    <button type="button" onClick={() => rebuildEqualDraft(editor.periodFamily, editor.steps, editor.periodCents, true)} className="w-full rounded border border-fuchsia-700/70 px-3 py-2 text-sm font-semibold text-fuchsia-50 hover:bg-fuchsia-950/40">Als Equal-Tuning neu setzen</button>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex gap-4">
                <div className="w-16 shrink-0 text-[10px] text-fuchsia-100/60">
                  <div className="mb-2 uppercase tracking-[0.25em]">Y</div>
                  <div>{editor.periodFamily === 'tritave' ? 'Tritave' : 'Oktave'}</div>
                  <div>{editor.steps} Schritte</div>
                  <div>{draftClassification.label}</div>
                </div>
                <div className="flex-1">
                  <div ref={workbenchRef} className="relative overflow-hidden rounded-xl border border-fuchsia-900/50 bg-[#090611]" style={{ height: WORKBENCH_HEIGHT }}>
                    <div className="absolute inset-x-8 top-[16px] border-t border-fuchsia-400/40" />
                    <div className="absolute inset-x-8 bottom-[16px] border-t border-fuchsia-400/40" />
                    <div className="absolute left-8 top-[16px] bottom-[16px] w-px bg-fuchsia-800/50" />
                    <div className="absolute right-3 top-1 text-[10px] text-fuchsia-300/80">{editor.periodCents.toFixed(1)}c</div>
                    <div className="absolute right-3 bottom-1 text-[10px] text-fuchsia-300/80">0.0c</div>
                    {workbenchMarkers.map((marker) => {
                      const selected = marker.index === selectedMarkerIndex;
                      const draggable = marker.index > 0;
                      return (
                        <div key={marker.id} className="absolute inset-x-0" style={{ top: marker.y - 8 }}>
                          <div className="relative flex items-center gap-2 px-3">
                            <div className={`h-px flex-1 ${selected ? 'bg-fuchsia-300/70' : 'bg-fuchsia-700/35'}`} />
                            <button
                              type="button"
                              disabled={!draggable}
                              onPointerDown={(event) => {
                                if (!draggable) return;
                                event.preventDefault();
                                setSelectedMarkerIndex(marker.index);
                                beginMarkerDrag(marker.index);
                              }}
                              onClick={() => setSelectedMarkerIndex(marker.index)}
                              className={`flex h-4 min-w-0 items-center gap-2 ${draggable ? 'cursor-ns-resize' : 'cursor-default'}`}
                            >
                              <div className={`h-0 w-0 border-y-[6px] border-y-transparent border-l-0 border-r-[10px] ${selected ? 'border-r-fuchsia-200' : 'border-r-sky-300/90'}`} />
                              <div className="whitespace-nowrap text-[10px] text-fuchsia-100/85">{marker.index} ({formatStepLabel(marker.cents)})</div>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-[10px] leading-relaxed text-fuchsia-100/75">Marker 0 bleibt der Anker.</div>
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto]">
                <label className="space-y-1 text-[10px] text-fuchsia-100/80">
                  <span className="uppercase tracking-[0.18em] text-fuchsia-200/70">Definiere Cent für Marker {selectedMarkerIndex}</span>
                  <input
                    type="number"
                    step={0.1}
                    value={centInput}
                    onChange={(event) => setCentInput(event.target.value)}
                    onBlur={() => updateSelectedMarker(Number(centInput.replace(',', '.')) || 0)}
                    className="w-full rounded border border-fuchsia-900/50 bg-black/25 px-3 py-2 text-sm text-fuchsia-50"
                  />
                </label>
                <button type="button" onClick={() => updateSelectedMarker((editor.stepCents[selectedMarkerIndex] ?? 0) - 1)} className="self-end rounded border border-fuchsia-700/70 px-3 py-2 text-sm font-semibold text-fuchsia-50 hover:bg-fuchsia-950/40">− 1c</button>
                <button type="button" onClick={() => updateSelectedMarker((editor.stepCents[selectedMarkerIndex] ?? 0) + 1)} className="self-end rounded border border-fuchsia-700/70 px-3 py-2 text-sm font-semibold text-fuchsia-50 hover:bg-fuchsia-950/40">+ 1c</button>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                <label className="space-y-1 text-[10px] text-fuchsia-100/80">
                  <span className="uppercase tracking-[0.18em] text-fuchsia-200/70">Speichertitel</span>
                  <input
                    type="text"
                    value={editor.name}
                    onChange={(event) => setEditor((previous) => ({ ...previous, name: event.target.value, nameTouched: true }))}
                    className="w-full rounded border border-fuchsia-900/50 bg-black/25 px-3 py-2 text-sm text-fuchsia-50"
                  />
                </label>
                <button type="button" onClick={handleSaveDraft} className="self-end rounded border border-fuchsia-500 bg-fuchsia-950/35 px-4 py-2 text-sm font-semibold text-fuchsia-50 hover:bg-fuchsia-900/40">Speichern</button>
              </div>

              <div className="mt-2 rounded border border-fuchsia-900/40 bg-black/20 px-3 py-2 text-[10px] leading-relaxed text-fuchsia-100/75">
                {editor.editingCustomId ? 'Du bearbeitest ein gespeichertes Custom-Raster. Speichern aktualisiert nur den Bibliothekseintrag.' : 'Neue Raster starten hier als EDO/EDT-Basis und werden erst nach dem Speichern als Bibliothekseintrag verfügbar.'}
              </div>
            </div>
            <div className="min-h-[2.75rem]">{uiMessage ? <div className="rounded border border-fuchsia-900/40 bg-black/20 px-3 py-2 text-[10px] text-fuchsia-100/80">{uiMessage}</div> : null}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
