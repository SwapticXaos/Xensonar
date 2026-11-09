import * as React from 'react';
import type { SavedMelodicSampleMeta } from './melodicSampleLibrary';
import { MaterialImportDialog } from './MaterialImportDialog';
import { SampleInspectorMenu } from './SampleInspectorMenu';
import { MelodicSampleCard } from './MelodicSampleCard';
import { MelodicSampleLibraryHeader } from './MelodicSampleLibraryHeader';
import type { LocalFieldModuleState } from './localField';
import type { SampleTempoModeDraft } from './sampleInspectorMenuActions';
import type { SampleContextMenuState } from './useMelodicSampleInspectorState';

import type { CarrierIntegralPinkVariant } from './loopDrumDomain';
import type { MaterialImportEntrySummary } from './materialImportChannel';
type RoundedAnchorPreview = { lineId: string; label: string; hz: number } | null;

export type MelodicSampleLibraryPanelProps = {
  melodicSampleEntries: SavedMelodicSampleMeta[];
  showSpectralSampleHelp: boolean;
  onToggleSpectralSampleHelp: () => void;
  spectralSamplePathAvailable: boolean;
  onUploadMelodicSamples: (files: File[]) => void;
  onDeleteMelodicSample: (sampleId: string) => void;
  onRenameMelodicSample: (sampleId: string, name: string) => void;
  onUpdateMelodicSampleBaseHz: (sampleId: string, baseHz: number | null) => void;
  onPreviewMelodicSampleReferencePitch: (sampleId: string, overrideBaseHz?: number | null) => Promise<void> | void;
  onSetMelodicSampleTempoProfile: (sampleId: string, options: { tempoPitchLinked: boolean; playbackDurationSec: number | null }) => void;
  onUpdateMelodicSampleEnvelope: (sampleId: string, target: 'volumeEnvelope' | 'pitchEnvelope', field: LocalFieldModuleState | null) => void;
  onPreviewMelodicSampleTempoProfile: (sampleId: string, playbackDurationSec: number) => Promise<void> | void;
  sampleContextMenuRef: React.RefObject<HTMLDivElement | null>;
  sampleContextMenu: SampleContextMenuState;
  onOpenSampleContextMenu: (sampleId: string, x: number, y: number) => void;
  onCloseSampleContextMenu: () => void;
  selectedContextSample: SavedMelodicSampleMeta | null;
  sampleBaseHzDraft: string;
  onSampleBaseHzDraftChange: (value: string) => void;
  sampleDurationDraft: string;
  onSampleDurationDraftChange: (value: string) => void;
  sampleTempoModeDraft: SampleTempoModeDraft;
  onSampleTempoModeDraftChange: (value: SampleTempoModeDraft) => void;
  showMaterialImportMenu: boolean;
  onOpenMaterialImportMenu: () => void;
  onCloseMaterialImportMenu: () => void;
  materialEntries: MaterialImportEntrySummary[];
  selectedMaterialImportId: string;
  onSelectMaterialImportId: (value: string) => void;
  materialAnchorHzDraft: string;
  onMaterialAnchorHzDraftChange: (value: string) => void;
  roundedAnchorPreview: RoundedAnchorPreview;
  materialImportBusy: boolean;
  audioPaintVariant: CarrierIntegralPinkVariant;
  onAudioPaintVariantChange: (value: CarrierIntegralPinkVariant) => void;
  onConfirmMaterialImport: () => Promise<void> | void;
  onRepairAudioPaintEntry?: (id: string) => Promise<void> | void;
  onEditAudioPaintEntry?: (id: string) => Promise<void> | void;
  materialImportActionMessage?: string | null;
  onSampleCardDragStart?: (sampleId: string) => void;
  onSampleCardDragEnd?: () => void;
};

export function MelodicSampleLibraryPanel({
  melodicSampleEntries,
  showSpectralSampleHelp,
  onToggleSpectralSampleHelp,
  spectralSamplePathAvailable,
  onUploadMelodicSamples,
  onDeleteMelodicSample,
  onRenameMelodicSample,
  onUpdateMelodicSampleBaseHz,
  onPreviewMelodicSampleReferencePitch,
  onSetMelodicSampleTempoProfile,
  onPreviewMelodicSampleTempoProfile,
  onUpdateMelodicSampleEnvelope,
  sampleContextMenuRef,
  sampleContextMenu,
  onOpenSampleContextMenu,
  onCloseSampleContextMenu,
  selectedContextSample,
  sampleBaseHzDraft,
  onSampleBaseHzDraftChange,
  sampleDurationDraft,
  onSampleDurationDraftChange,
  sampleTempoModeDraft,
  onSampleTempoModeDraftChange,
  showMaterialImportMenu,
  onOpenMaterialImportMenu,
  onCloseMaterialImportMenu,
  materialEntries,
  selectedMaterialImportId,
  onSelectMaterialImportId,
  materialAnchorHzDraft,
  onMaterialAnchorHzDraftChange,
  roundedAnchorPreview,
  materialImportBusy,
  audioPaintVariant,
  onAudioPaintVariantChange,
  onConfirmMaterialImport,
  onRepairAudioPaintEntry,
  onEditAudioPaintEntry,
  materialImportActionMessage,
  onSampleCardDragStart,
  onSampleCardDragEnd,
}: MelodicSampleLibraryPanelProps) {
  const [sampleDeleteMode, setSampleDeleteMode] = React.useState(false);
  const [sampleLibraryOpen, setSampleLibraryOpen] = React.useState(false);

  React.useEffect(() => {
    if (showMaterialImportMenu) setSampleLibraryOpen(true);
  }, [showMaterialImportMenu]);

  return (
    <div className="rounded border border-neutral-800 bg-neutral-950/60 px-3 py-3 text-xs text-neutral-300">
      <MelodicSampleLibraryHeader
        sampleCount={melodicSampleEntries.length}
        open={sampleLibraryOpen}
        deleteMode={sampleDeleteMode}
        onToggleOpen={() => setSampleLibraryOpen((value) => !value)}
        onOpenMaterialImportMenu={onOpenMaterialImportMenu}
        onToggleSpectralSampleHelp={onToggleSpectralSampleHelp}
        onToggleDeleteMode={() => setSampleDeleteMode((value) => !value)}
        onUploadMelodicSamples={onUploadMelodicSamples}
      />

      <MaterialImportDialog
        open={showMaterialImportMenu}
        busy={materialImportBusy}
        entries={materialEntries}
        selectedId={selectedMaterialImportId}
        anchorDraft={materialAnchorHzDraft}
        roundedAnchorPreview={roundedAnchorPreview}
        audioPaintVariant={audioPaintVariant}
        onAudioPaintVariantChange={onAudioPaintVariantChange}
        onClose={onCloseMaterialImportMenu}
        onSelect={onSelectMaterialImportId}
        onAnchorDraftChange={onMaterialAnchorHzDraftChange}
        onConfirm={onConfirmMaterialImport}
        onRepairAudioPaintEntry={onRepairAudioPaintEntry}
        onEditAudioPaintEntry={onEditAudioPaintEntry}
        actionMessage={materialImportActionMessage}
      />

      {sampleLibraryOpen ? (<>
      {showSpectralSampleHelp ? (
        <div className="mt-3 rounded border border-violet-800/70 bg-violet-950/20 px-3 py-3 text-[11px] text-violet-100">
          <div className="font-semibold">So schickst du Samples aus SpectralForge hierher</div>
          <div className="mt-2 space-y-1 text-violet-100/90">
            <div>1. Im Audio-Importbereich gibt es rechts neben <span className="font-medium">Als Loop roh an die Materialspur (Hauptraum) senden</span> den Weg <span className="font-medium">Als Sample speichern</span>. Der wird nur für Ausschnitte bis 5,0s klickbar.</div>
            <div>2. In der Stempel-Bibliothek gibt es den Weg <span className="font-medium">Stempel als Sample an Melodic Loop senden</span>.</div>
          </div>
          <div className="mt-2 text-violet-200/80">{spectralSamplePathAvailable ? 'SpectralForge ist gerade grundsätzlich erreichbar.' : 'Der Hinweis bleibt sichtbar, auch wenn gerade keine Quelle vorbereitet ist.'}</div>
        </div>
      ) : null}
      {sampleDeleteMode ? (
        <div className="mt-3 rounded border border-red-900/70 bg-red-950/20 px-3 py-2 text-[11px] text-red-100">
          Löschmodus aktiv: Ein Klick auf ein Sample entfernt es direkt aus der Sample-Datenbank. Noch einmal auf „Löschen“ schaltet den Modus aus.
        </div>
      ) : null}
      <div className="relative mt-3 flex flex-wrap gap-2">
        {melodicSampleEntries.length ? melodicSampleEntries.map((sample) => (
          <MelodicSampleCard
            key={sample.id}
            sample={sample}
            deleteMode={sampleDeleteMode}
            onDelete={onDeleteMelodicSample}
            onOpenContextMenu={onOpenSampleContextMenu}
            onDragStart={onSampleCardDragStart}
            onDragEnd={onSampleCardDragEnd}
          />
        )) : <div className="text-[11px] text-neutral-500">Noch keine Samples hochgeladen.</div>}
        {sampleContextMenu && selectedContextSample ? (
          <SampleInspectorMenu
            sample={selectedContextSample}
            menuRef={sampleContextMenuRef}
            x={sampleContextMenu.x}
            y={sampleContextMenu.y}
            sampleBaseHzDraft={sampleBaseHzDraft}
            sampleDurationDraft={sampleDurationDraft}
            sampleTempoModeDraft={sampleTempoModeDraft}
            onClose={onCloseSampleContextMenu}
            onSampleBaseHzDraftChange={onSampleBaseHzDraftChange}
            onSampleDurationDraftChange={onSampleDurationDraftChange}
            onSampleTempoModeDraftChange={onSampleTempoModeDraftChange}
            onDeleteSample={onDeleteMelodicSample}
            onRenameSample={onRenameMelodicSample}
            onUpdateMelodicSampleBaseHz={onUpdateMelodicSampleBaseHz}
            onPreviewMelodicSampleReferencePitch={onPreviewMelodicSampleReferencePitch}
            onSetMelodicSampleTempoProfile={onSetMelodicSampleTempoProfile}
            onPreviewMelodicSampleTempoProfile={onPreviewMelodicSampleTempoProfile}
            onUpdateMelodicSampleEnvelope={onUpdateMelodicSampleEnvelope}
          />
        ) : null}
      </div>
      </>) : (
        <div className="mt-3 rounded border border-neutral-800 bg-black/20 px-3 py-2 text-[11px] text-neutral-500">
          Sample-Datenbank eingeklappt. Ausklappen zeigt Upload, Materialspur-Import, Sample-Karten und Rechtsklick-Bearbeitung.
        </div>
      )}
    </div>
  );
}
