import type { GridTuning } from '../../xensonar/domain/instrumentData';
import type { LoopComposerState } from './loopDrumDomain';
import { getDefaultRepetitionModelForTuning, rebuildLoopComposerPitchField } from './loopDrumDomain';
import type { LoopTrackInstrumentPreset } from './melodicSoundRegistry';
import { type MelodicSoundOptionGroup } from './melodicSoundRegistry';
import type { WorkspacePackageImportMode } from '../../../core/systemMemory/packageCore';
import { PackageActionRow } from '../../../components/systemMemory/PackageActionRow';
import type { CanonicalLoopComposerRepetitionModel, CanonicalLoopComposerTuning } from './sessionTypes';
import type { MelodicProjectChoice } from './melodicProjectLibrary';

type MelodicWorkspaceHeaderProps = {
  selectedMelodicProjectId: string;
  melodicProjectChoices: MelodicProjectChoice[];
  canDeleteMelodicProject: boolean;
  onLoadMelodicProject: (projectId: string) => void;
  onComposeFromScratch: () => void;
  onSaveMelodicProject: () => void;
  onDeleteMelodicProject: () => void;
  onExportWorkspaceArchive: () => void;
  onImportWorkspaceArchive: (mode: WorkspacePackageImportMode) => void;
  hasWorkspacePackageContent: boolean;
  loopComposer: LoopComposerState;
  onMutateLoopComposer: (updater: (draft: LoopComposerState) => void, statusMessage?: string) => void;
  melodicInstrumentOptionGroups: MelodicSoundOptionGroup[];
  onSetLoopTrackInstrumentPreset: (trackId: string, preset: LoopTrackInstrumentPreset) => void;
  onPreviewTrackInstrumentSelection: (trackId: string, preset: LoopTrackInstrumentPreset) => Promise<void> | void;
  gridTuningOptions: Array<{ value: GridTuning; label: string }>;
};

const TRACK_INSTRUMENT_ROWS: Array<{ trackId: string; label: string; fallback: LoopTrackInstrumentPreset }> = [
  { trackId: 'bass', label: 'Instrument 1 Klang', fallback: 'subPulse' },
  { trackId: 'companion', label: 'Instrument 2 Klang', fallback: 'reedTone' },
  { trackId: 'aux', label: 'Instrument 3 Klang', fallback: 'airPluck' },
  { trackId: 'texture', label: 'Instrument 4 Klang', fallback: 'glassPad' },
];

export function MelodicWorkspaceHeader({
  selectedMelodicProjectId,
  melodicProjectChoices,
  canDeleteMelodicProject,
  onLoadMelodicProject,
  onComposeFromScratch,
  onSaveMelodicProject,
  onDeleteMelodicProject,
  onExportWorkspaceArchive,
  onImportWorkspaceArchive,
  hasWorkspacePackageContent,
  loopComposer,
  onMutateLoopComposer,
  melodicInstrumentOptionGroups,
  onSetLoopTrackInstrumentPreset,
  onPreviewTrackInstrumentSelection,
  gridTuningOptions,
}: MelodicWorkspaceHeaderProps) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label className="min-w-[18rem] flex-1 space-y-1 text-xs text-neutral-400">
          <span className="uppercase tracking-[0.18em] text-neutral-500">Presets &amp; Projekte</span>
          <select
            value={selectedMelodicProjectId}
            onChange={(e) => onLoadMelodicProject(e.target.value)}
            className="w-full border border-neutral-700 bg-neutral-900 px-2 py-2 text-neutral-100"
          >
            <option value="">Presets &amp; Projekte</option>
            {melodicProjectChoices.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={onComposeFromScratch} className="rounded border border-neutral-700 px-3 py-2 text-neutral-100 hover:bg-neutral-900">Compose From Scratch</button>
        <button type="button" onClick={onSaveMelodicProject} className="rounded border border-cyan-700/70 bg-cyan-950/25 px-3 py-2 text-cyan-100 hover:bg-cyan-900/30">Als Projekt Datei speichern</button>
        <button type="button" onClick={onDeleteMelodicProject} disabled={!canDeleteMelodicProject} className="rounded border border-neutral-700 px-3 py-2 text-neutral-200 hover:bg-neutral-900 disabled:opacity-40">Projekt löschen</button>
      </div>
      <PackageActionRow
        title="Browser-Gedächtnis ↔ Workspace-Paket"
        description="Die lokale Arbeitskopie bleibt bequem im Browser. Das Workspace-Paket ist die tragbare Fassung für anderen Browser, Backup oder bewusstes Überschreiben."
        exportLabel="Workspace-Paket exportieren"
        replaceLabel="Paket als Arbeitskopie laden"
        onExport={onExportWorkspaceArchive}
        onImport={onImportWorkspaceArchive}
        hasWorkspacePackageContent={hasWorkspacePackageContent}
      />
      <div className="grid gap-3 md:grid-cols-8">
        <label className="space-y-1 text-xs text-neutral-400">
          <span className="uppercase tracking-[0.18em] text-neutral-500">Raster-Preset</span>
          <select
            value={loopComposer.tuning}
            onChange={(e) => onMutateLoopComposer((draft) => {
              draft.tuning = e.target.value as CanonicalLoopComposerTuning;
              draft.repetitionModel = getDefaultRepetitionModelForTuning(draft.tuning);
              const rebuilt = rebuildLoopComposerPitchField(draft);
              draft.pitchLines = rebuilt.nextPitchLines;
              draft.pitchSteps = rebuilt.nextPitchSteps;
              draft.notes = rebuilt.nextNotes;
              draft.selectedNoteId = rebuilt.validSelectedNoteId;
            })}
            className="w-full border border-neutral-700 bg-neutral-900 px-2 py-2 text-neutral-100"
          >
            {gridTuningOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-neutral-400">
          <span className="uppercase tracking-[0.18em] text-neutral-500">Hz-Grundfeld</span>
          <input
            type="number"
            min={30}
            max={1200}
            step={0.1}
            value={loopComposer.baseHz}
            onChange={(e) => onMutateLoopComposer((draft) => {
              draft.baseHz = Math.max(30, Math.min(1200, Number(e.target.value) || 220));
              const rebuilt = rebuildLoopComposerPitchField(draft);
              draft.pitchLines = rebuilt.nextPitchLines;
              draft.pitchSteps = rebuilt.nextPitchSteps;
              draft.notes = rebuilt.nextNotes;
              draft.selectedNoteId = rebuilt.validSelectedNoteId;
            })}
            className="w-full border border-neutral-700 bg-neutral-900 px-2 py-2 text-neutral-100"
          />
          <div className="text-[10px] leading-relaxed text-neutral-500">Raster-Preset und seine Stufen lesen dieses Hz-Grundfeld als tonalen Anker.</div>
        </label>
        <label className="space-y-1 text-xs text-neutral-400">
          <span className="uppercase tracking-[0.18em] text-neutral-500">Wiederholung</span>
          <select
            value={loopComposer.repetitionModel}
            onChange={(e) => onMutateLoopComposer((draft) => {
              draft.repetitionModel = e.target.value as CanonicalLoopComposerRepetitionModel;
            })}
            className="w-full border border-neutral-700 bg-neutral-900 px-2 py-2 text-neutral-100"
          >
            <option value="octave">Oktave</option>
            <option value="tritave">Tritave</option>
          </select>
        </label>

        {TRACK_INSTRUMENT_ROWS.map(({ trackId, label, fallback }) => {
          const currentPreset = loopComposer.tracks.find((track) => track.id === trackId)?.instrumentPreset ?? fallback;
          return (
            <label key={trackId} className="space-y-1 text-xs text-neutral-400">
              <span className="uppercase tracking-[0.18em] text-neutral-500">{label}</span>
              <div className="flex gap-2">
                <select
                  value={currentPreset}
                  onChange={(e) => onSetLoopTrackInstrumentPreset(trackId, e.target.value as LoopTrackInstrumentPreset)}
                  className="w-full border border-neutral-700 bg-neutral-900 px-2 py-2 text-neutral-100"
                >
                  {melodicInstrumentOptionGroups.map((group) => (
                    <optgroup key={group.id} label={group.label}>
                      {group.options.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
                    </optgroup>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void onPreviewTrackInstrumentSelection(trackId, currentPreset as LoopTrackInstrumentPreset)}
                  className="shrink-0 rounded border border-violet-700/70 bg-violet-950/25 px-3 py-2 text-violet-100 hover:bg-violet-900/30"
                >
                  Vorhören
                </button>
              </div>
            </label>
          );
        })}
      </div>
    </>
  );
}
