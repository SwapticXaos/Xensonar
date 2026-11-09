import type { Dispatch, SetStateAction } from 'react';
import type { MaterialEntry } from '../materialLibrary';
type MaterialExportConfigLike = { bpm: number };
import { listSavedMelodicSamples, saveGeneratedMelodicSample, updateSavedMelodicSampleMeta, type SavedMelodicSampleMeta } from './melodicSampleLibrary';
import type { LoopComposerState, LoopTimeGuideMarker } from './loopDrumDomain';
import {
  applyMaterialBaseImportToDraft,
  beginLoopImportFragmentGuideEdit,
  commitLoopImportFragmentationInDraft,
  computeMaterialSourceLoopDurationSec,
  inferMaterialEntrySourceBpm,
  resolveFragmentableLoopImportBody,
  resolveMaterialAnchor,
} from './materialBaseWorkflow';
import { loopImportBodyLabel } from './loopImportExportContracts';
import type { MelodicImportLanePlacement } from './melodicImportLanePolicy';
import { isCarrierIntegralAudioPaintEntry, isCarrierIntegralGranularMaterialEntry, isRawCarrierMaterialEntry } from './materialImportChannel';

export async function importMaterialEntryIntoMelodicLoopAction(args: {
  materialEntries: MaterialEntry[];
  materialId: string;
  anchorHz: number;
  lanePlacement?: MelodicImportLanePlacement | null;
  loopComposer: LoopComposerState;
  setMelodicSampleEntries: Dispatch<SetStateAction<SavedMelodicSampleMeta[]>>;
  setMaterialExport: Dispatch<SetStateAction<MaterialExportConfigLike>>;
  setMaterialFragmentGuideSnapshot: Dispatch<SetStateAction<LoopTimeGuideMarker[] | null>>;
  mutateLoopComposer: (updater: (draft: LoopComposerState) => void, statusMessage?: string, options?: { history?: boolean }) => void;
  setStatus: (status: string) => void;
}) {
  const entry = args.materialEntries.find((candidate) => candidate.id === args.materialId);
  if (!entry) {
    args.setStatus('Materialspur-Eintrag nicht gefunden.');
    return;
  }
  const { anchorIndex, roundedAnchorHz, roundedAnchorLabel } = resolveMaterialAnchor(args.loopComposer, args.anchorHz);
  const rawCarrierMaterial = isRawCarrierMaterialEntry(entry) || isCarrierIntegralGranularMaterialEntry(entry) || isCarrierIntegralAudioPaintEntry(entry);
  const importAnchorHz = rawCarrierMaterial && Number.isFinite(args.anchorHz) && args.anchorHz > 0 ? args.anchorHz : roundedAnchorHz;
  const sourceBpm = inferMaterialEntrySourceBpm(entry, args.loopComposer.beatsPerBar || 4);
  const sourceLoopDurationSec = computeMaterialSourceLoopDurationSec(entry, sourceBpm, args.loopComposer.beatsPerBar || 4);
  const sampleName = `${entry.name} [${Math.round(sourceBpm)} BPM] [${Math.max(1, entry.bars)} Takte]`;
  const saved = await saveGeneratedMelodicSample(sampleName, entry.blob);
  await updateSavedMelodicSampleMeta(saved.id, { baseHz: importAnchorHz });
  const nextEntries = await listSavedMelodicSamples();
  args.setMelodicSampleEntries(nextEntries);
  args.setMaterialExport((state) => ({ ...state, bpm: sourceBpm }));
  args.setMaterialFragmentGuideSnapshot(null);

  const statusMessage = rawCarrierMaterial
    ? `Roh-/Carrier-Material "${entry.name}" als eigene Importspur eingesetzt · Quellreferenz ${importAnchorHz.toFixed(2)} Hz · Startlage ${roundedAnchorLabel} · erster Drag/Klick wählt die Raw-Ankergriffstufe; danach bleibt normales Dragging aktiv · ${Math.max(1, entry.bars)} Takte · Referenz ${Math.round(sourceBpm)} BPM.`
    : `Materialspur "${entry.name}" als eigene Importspur eingesetzt · Startlage ${roundedAnchorLabel} (${roundedAnchorHz.toFixed(2)} Hz) · erster Drag/Klick wählt die Raw-Ankergriffstufe; danach bleibt normales Dragging aktiv · ${Math.max(1, entry.bars)} Takte · Referenz ${Math.round(sourceBpm)} BPM.`;
  args.mutateLoopComposer((draft) => {
    applyMaterialBaseImportToDraft(draft, {
      sampleId: saved.id,
      entry,
      anchorIndex,
      roundedAnchorHz: importAnchorHz,
      sourceBpm,
      sourceLoopDurationSec,
      materialPitchMode: rawCarrierMaterial ? 'source-granular' : 'grid-elastic',
      lanePlacement: args.lanePlacement ?? null,
    });
  }, statusMessage);
}


export function fragmentSelectedMaterialBaseNoteAction(args: {
  loopComposer: LoopComposerState;
  materialFragmentGuideSnapshot: LoopTimeGuideMarker[] | null;
  setMaterialFragmentGuideSnapshot: Dispatch<SetStateAction<LoopTimeGuideMarker[] | null>>;
  setSelectedLoopNoteIds: Dispatch<SetStateAction<string[]>>;
  mutateLoopComposer: (updater: (draft: LoopComposerState) => void, statusMessage?: string, options?: { history?: boolean }) => void;
  setStatus: (status: string) => void;
}) {
  const explicitSelected = args.loopComposer.notes.find((entry) => entry.id === args.loopComposer.selectedNoteId) ?? null;
  if (explicitSelected?.pendingPitchAnchor) {
    args.setStatus('Diese Importspur ist noch nicht auf einer Rasterstufe verankert. Erst klicken oder vertikal draggen, dann schneiden.');
    return;
  }
  const selected = resolveFragmentableLoopImportBody(args.loopComposer);
  if (!selected) {
    args.setStatus('Wähle zuerst genau den Importkörper aus, den du schneiden möchtest.');
    return;
  }
  if (!args.materialFragmentGuideSnapshot) {
    args.setMaterialFragmentGuideSnapshot(args.loopComposer.timeGuideMarkers.map((marker) => ({ ...marker })));
    args.mutateLoopComposer((draft) => {
      beginLoopImportFragmentGuideEdit(draft, selected);
    }, `Segmentmarker für ${loopImportBodyLabel(selected)} entkoppelt. Richte sie frei aus; der nächste Klick fragmentiert und stellt die periodische Kopplung wieder her.`, { history: false });
    args.setSelectedLoopNoteIds([selected.id]);
    return;
  }
  const snapshot = args.materialFragmentGuideSnapshot.map((marker) => ({ ...marker }));
  let commitResult = { selectedIds: [] as string[], spanCount: 0, bodyLabel: loopImportBodyLabel(selected), restoredOnly: true };
  args.mutateLoopComposer((draft) => {
    commitResult = commitLoopImportFragmentationInDraft(draft, selected.id, snapshot);
  });
  args.setMaterialFragmentGuideSnapshot(null);
  args.setSelectedLoopNoteIds(commitResult.selectedIds.length ? commitResult.selectedIds : [selected.id]);
  if (commitResult.restoredOnly) {
    args.setStatus(commitResult.spanCount <= 1
      ? 'Die aktuellen Segmentmarker erzeugen innerhalb dieses Blocks noch keine zusätzlichen Fragmente; die periodische Marker-Kopplung wurde wiederhergestellt.'
      : 'Importkörper nicht mehr gefunden; die periodische Marker-Kopplung wurde wiederhergestellt.');
    return;
  }
  args.setStatus(`${commitResult.bodyLabel} entlang der aktuellen Taktsegmente in ${commitResult.spanCount} Fragmente zerlegt.`);
}
