import type { ChordVoicing, LoopComposerState, LoopNoteEvent, LoopPitchStep } from './loopDrumDomain';
import { loopUnitToLabel, noteChannelIndex, noteDurationUnits, noteStartUnit } from './loopDrumDomain';
import type { SavedMelodicSampleMeta } from './melodicSampleLibrary';
import { SelectedLoopBlockInspector } from './SelectedLoopBlockInspector';
import { describeMaterialPitchDisplay } from './materialBasePitchDisplay';
import { isFragmentableLoopImportBody, loopImportBodyLabel } from './loopImportExportContracts';
import type { SelectedNotePreviewOptions } from './selectedNotePreviewContract';

type MelodicLoopSidebarProps = {
  loopComposer: LoopComposerState;
  activeLoopPitchStep: LoopPitchStep | null;
  selectedLoopNote: LoopNoteEvent | null;
  selectedLoopTrackLabel: string;
  selectedLoopStepLabel: string;
  selectedLoopSample: SavedMelodicSampleMeta | null;
  melodicPreviewNotes: LoopNoteEvent[];
  autoZoomOnDenseOverlap: boolean;
  lockTrackEditing: boolean;
  chordVoicing: ChordVoicing;
  chordStrumSteps: number;
  chordVelocitySlope: number;
  onMutateLoopComposer: (updater: (draft: LoopComposerState) => void, statusMessage?: string) => void;
  onOpenSampleDetails: (sampleId: string) => void;
  onPreviewSelectedNote: (options?: SelectedNotePreviewOptions) => Promise<void> | void;
  onStopEnabledTracksPreview: (statusMessage?: string) => void;
  onActivePitchOffsetChange: (cents: number) => void;
  onResetActivePitchOffset: () => void;
  onZoomXChange: (value: number) => void;
  onScrollXChange: (value: number) => void;
  onZoomYChange: (value: number) => void;
  onScrollYChange: (value: number) => void;
  onBeatsPerBarChange: (value: number) => void;
  onSegmentCountChange: (count: number) => void;
  onResetZoom: () => void;
  onAutoZoomChange: (value: boolean) => void;
  onLockTrackEditingChange: (value: boolean) => void;
  onChordVoicingChange: (value: ChordVoicing) => void;
  onChordStrumStepsChange: (value: number) => void;
  onChordVelocitySlopeChange: (value: number) => void;
  onFreezeSelectedNoteToSample: () => Promise<void> | void;
  onScrollToWorkspace?: () => void;
};

export function MelodicLoopSidebar({
  loopComposer,
  activeLoopPitchStep,
  selectedLoopNote,
  selectedLoopTrackLabel,
  selectedLoopStepLabel,
  selectedLoopSample,
  melodicPreviewNotes,
  autoZoomOnDenseOverlap,
  lockTrackEditing,
  chordVoicing,
  chordStrumSteps,
  chordVelocitySlope,
  onMutateLoopComposer,
  onOpenSampleDetails,
  onPreviewSelectedNote,
  onStopEnabledTracksPreview,
  onActivePitchOffsetChange,
  onResetActivePitchOffset,
  onZoomXChange,
  onScrollXChange,
  onZoomYChange,
  onScrollYChange,
  onBeatsPerBarChange,
  onSegmentCountChange,
  onResetZoom,
  onAutoZoomChange,
  onLockTrackEditingChange,
  onChordVoicingChange,
  onChordStrumStepsChange,
  onChordVelocitySlopeChange,
  onFreezeSelectedNoteToSample,
  onScrollToWorkspace,
}: MelodicLoopSidebarProps) {
  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(15rem,22rem)_minmax(0,1fr)_minmax(18rem,24rem)]">
      <div className="space-y-2 rounded border border-neutral-800 bg-neutral-950/60 p-3 text-xs text-neutral-400">
        <div className="uppercase tracking-[0.2em] text-neutral-500">Aktive Tonlinie</div>
        <div><span className="text-neutral-200">{activeLoopPitchStep?.label ?? '—'}</span> · {loopComposer.repetitionModel === 'tritave' ? 'Tritavisch' : 'Oktavisch'} · {loopComposer.tuning}</div>
        <div className="text-[11px] text-neutral-500">Greife oder wähle eine Tonlinie, dann lässt sie sich hier verstimmen.</div>
        <label className="block space-y-1">
          <span>Abweichung {activeLoopPitchStep?.offsetCents.toFixed(0) ?? '0'} ct</span>
          <input type="range" min={-120} max={120} step={1} value={activeLoopPitchStep?.offsetCents ?? 0} onChange={(e) => onActivePitchOffsetChange(Number(e.target.value))} className="w-full" />
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={onResetActivePitchOffset} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-900">Offset reset</button>
        </div>
      </div>
      <div className="space-y-3">
        <SelectedLoopBlockInspector
          loopComposer={loopComposer}
          selectedLoopNote={selectedLoopNote}
          selectedLoopTrackLabel={selectedLoopTrackLabel}
          selectedLoopStepLabel={selectedLoopStepLabel}
          selectedLoopSample={selectedLoopSample}
          onMutateLoopComposer={onMutateLoopComposer}
          onOpenSampleDetails={onOpenSampleDetails}
          onPreviewSelectedNote={onPreviewSelectedNote}
          onStopPreview={onStopEnabledTracksPreview}
          onFreezeSelectedNoteToSample={onFreezeSelectedNoteToSample}
          onScrollToWorkspace={onScrollToWorkspace}
        />
        <div className="rounded border border-neutral-800 bg-neutral-950/60 p-3">
          <div className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">Kanalansicht / aktive Ereignisse</div>
          <div className="space-y-2 text-xs text-neutral-400">
            {melodicPreviewNotes.slice(0, 18).map((note) => {
              const channelIndex = noteChannelIndex(loopComposer, note);
              const stepLabel = loopComposer.pitchSteps[channelIndex]?.label ?? `Kanal ${channelIndex + 1}`;
              const pos = loopUnitToLabel(loopComposer, noteStartUnit(loopComposer, note));
              const materialPitch = describeMaterialPitchDisplay(loopComposer, note);
              return (
                <div key={note.id} className="rounded border border-neutral-800 bg-neutral-950/60 px-2 py-1.5">
                  <span className="text-neutral-200">{pos}</span> · <span className="text-cyan-200">{stepLabel}</span> · Len {noteDurationUnits(loopComposer, note).toFixed(2)}{isFragmentableLoopImportBody(note) ? ` · ${loopImportBodyLabel(note)}${note.fragmentCount ? ` ${note.fragmentIndex ?? 1}/${note.fragmentCount}` : ''}` : ''}{materialPitch ? ` · ≈ ${materialPitch.effectiveHz.toFixed(1)} Hz${materialPitch.rawAnchorPosition ? ' · RAW' : ''}` : ''}
                </div>
              );
            })}
            {melodicPreviewNotes.length === 0 && <div className="rounded border border-dashed border-neutral-800 px-2 py-2 text-neutral-500">Noch keine Ereignisse im aktiven Raster sichtbar.</div>}
          </div>
        </div>
      </div>
      <details className="rounded border border-neutral-800 bg-neutral-950/60 p-3 text-xs text-neutral-400">
        <summary className="cursor-pointer list-none text-neutral-200">Advanced</summary>
        <div className="mt-3 space-y-3">
          <label className="block space-y-1"><span>Zoom X {loopComposer.zoom.toFixed(2)}</span><input type="range" min={1} max={8} step={0.1} value={loopComposer.zoom} onChange={(e) => onZoomXChange(Number(e.target.value))} className="w-full" /></label>
          <label className="block space-y-1"><span>Scroll X {loopComposer.scrollX.toFixed(2)}</span><input type="range" min={0} max={1} step={0.01} value={loopComposer.scrollX} onChange={(e) => onScrollXChange(Number(e.target.value))} className="w-full" /></label>
          <label className="block space-y-1"><span>Zoom Y {loopComposer.zoomY.toFixed(2)}</span><input type="range" min={1} max={12} step={0.1} value={loopComposer.zoomY} onChange={(e) => onZoomYChange(Number(e.target.value))} className="w-full" /></label>
          <label className="block space-y-1"><span>Scroll Y {loopComposer.scrollY.toFixed(2)}</span><input type="range" min={0} max={1} step={0.01} value={loopComposer.scrollY} onChange={(e) => onScrollYChange(Number(e.target.value))} className="w-full" /></label>
          <label className="block space-y-1">
            <span>Beats / Takt {loopComposer.beatsPerBar}</span>
            <input
              type="range"
              min={2}
              max={12}
              step={1}
              value={loopComposer.beatsPerBar}
              onChange={(e) => {
                const nextValue = Number(e.target.value);
                onBeatsPerBarChange(nextValue);
              }}
              className="w-full"
            />
          </label>
          <label className="block space-y-2"><span>Taktsegmente (Orientierungsmarker) {loopComposer.segmentCount}</span><div className="flex items-center gap-2"><button type="button" onClick={() => onSegmentCountChange(loopComposer.segmentCount - 1)} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-900">−</button><input type="number" min={1} max={16} step={1} value={loopComposer.segmentCount} onChange={(e) => onSegmentCountChange(Number(e.target.value))} className="w-20 border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100" /><button type="button" onClick={() => onSegmentCountChange(loopComposer.segmentCount + 1)} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-900">+</button></div><input type="range" min={1} max={16} step={1} value={loopComposer.segmentCount} onChange={(e) => onSegmentCountChange(Number(e.target.value))} className="w-full" /></label>
          <div className="flex gap-2"><button type="button" onClick={onResetZoom} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-900">Zoom reset</button><label className="inline-flex items-center gap-2"><input type="checkbox" checked={autoZoomOnDenseOverlap} onChange={(e) => onAutoZoomChange(e.target.checked)} /> Auto-Zoom bei dichter Überlagerung</label></div>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={lockTrackEditing} onChange={(e) => onLockTrackEditingChange(e.target.checked)} /> Nur aktive Spur editieren</label>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="space-y-1"><span>Voicing</span><select value={chordVoicing} onChange={(e) => onChordVoicingChange(e.target.value as ChordVoicing)} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100"><option value="triad">Triad</option><option value="quartal">Quartal</option><option value="cluster">Cluster</option><option value="open5">Open5</option></select></label>
            <label className="space-y-1"><span>Strum {chordStrumSteps}</span><input type="range" min={0} max={3} step={1} value={chordStrumSteps} onChange={(e) => onChordStrumStepsChange(Number(e.target.value))} className="w-full" /></label>
            <label className="space-y-1"><span>Vel-Slope {chordVelocitySlope.toFixed(2)}</span><input type="range" min={0} max={0.2} step={0.01} value={chordVelocitySlope} onChange={(e) => onChordVelocitySlopeChange(Number(e.target.value))} className="w-full" /></label>
          </div>
        </div>
      </details>
    </div>
  );
}
