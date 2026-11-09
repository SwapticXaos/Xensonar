import type { CarrierIntegralPinkVariant, LoopComposerState } from './loopDrumDomain';
import { cloneLoopComposerState } from './loopDrumDomain';
import { applyAudioPaintDetailToLoopDraft } from './audioPaintLoopImport';
import { executeCarrierMelodicImport } from './carrierMelodicImportExecutor';
import { buildAudioPaintRepairDetailForEntry } from './audioPaintImportRepair';
import { resolveCarrierMelodicImportModeAvailability, storeCarrierIntegralAudioPaintImportDetail, type MaterialImportEntrySummary } from './materialImportChannel';
import type { MelodicImportLaneFamily, MelodicImportLanePlacement } from './melodicImportLanePolicy';
import type { MelodicImportLaneRequest } from './useMelodicImportLanePolicyRuntime';

type MutateLoopComposer = (updater: (draft: LoopComposerState) => void, statusMessage?: string, options?: { history?: boolean }) => void;
type RequestImportLane = (request: MelodicImportLaneRequest) => Promise<boolean>;
type ProjectEntries = Parameters<typeof buildAudioPaintRepairDetailForEntry>[0]['projects'];

export async function commitMelodicImportSelectionTransaction(args: {
  entry: MaterialImportEntrySummary | null;
  variant: CarrierIntegralPinkVariant;
  anchorHz: number;
  loopComposer: LoopComposerState;
  mutate: MutateLoopComposer;
  importMaterial: (materialId: string, anchorHz: number, lanePlacement?: MelodicImportLanePlacement | null) => Promise<void> | void;
  requestImportLane: RequestImportLane;
  setBusy: (value: boolean) => void;
  emitStatus: (message: string) => void;
  clearPendingHandoff: () => void;
  closeDialog: () => void;
}) {
  if (!args.entry) return args.emitStatus('Wähle zuerst einen Importkörper aus.');
  const availability = resolveCarrierMelodicImportModeAvailability(args.entry, args.variant);
  const family: MelodicImportLaneFamily = availability.kind === 'structured-carrier' ? 'carrier-field' : 'material';
  try {
    await args.requestImportLane({ family, importLabel: args.entry.name, run: async (placement) => {
      args.setBusy(true);
      try {
        const result = await executeCarrierMelodicImport({
          entry: args.entry, mode: args.variant, anchorHz: args.anchorHz, loopComposer: args.loopComposer,
          onMutateLoopComposer: args.mutate, onImportMaterialToMelodicLoop: args.importMaterial, lanePlacement: placement,
        });
        if (!result.ok) throw new Error(result.message);
        if (result.shouldClearPendingHandoff) args.clearPendingHandoff();
        if (result.shouldCloseDialog) args.closeDialog();
      } finally { args.setBusy(false); }
    }});
  } catch (error) {
    args.emitStatus(error instanceof Error ? error.message : 'Carrier-Melodic-Import konnte nicht ausgeführt werden.');
  }
}

export async function rebuildAndImportAudioPaintTransaction(args: {
  entryId: string;
  materialEntries: MaterialImportEntrySummary[];
  projects: ProjectEntries;
  variant: CarrierIntegralPinkVariant;
  anchorHz: number;
  loopComposer: LoopComposerState;
  mutate: MutateLoopComposer;
  requestImportLane: RequestImportLane;
  setBusy: (value: boolean) => void;
  setActionMessage: (message: string | null) => void;
  closeDialog: () => void;
}) {
  const entry = args.materialEntries.find((candidate) => candidate.id === args.entryId) ?? null;
  if (!entry || entry.lane !== 'audio-paint') return;
  args.setBusy(true);
  args.setActionMessage(`Berechne Fretless-Pinkspurplan · ${entry.name}`);
  try {
    const rebuild = await buildAudioPaintRepairDetailForEntry({ entry, projects: args.projects, variant: args.variant });
    if (!rebuild.ok || !rebuild.detail) return args.setActionMessage(rebuild.reason);
    const detail = rebuild.detail;
    storeCarrierIntegralAudioPaintImportDetail(detail);
    await args.requestImportLane({ family: 'carrier-field', importLabel: detail.prism ?? entry.name, run: (placement) => {
      const previewDraft = cloneLoopComposerState(args.loopComposer);
      const preview = applyAudioPaintDetailToLoopDraft(previewDraft, detail, args.variant, args.anchorHz, placement);
      if (!preview.applied) throw new Error(preview.reason || 'Carrier-Feld konnte nicht eingesetzt werden.');
      args.mutate((draft) => applyAudioPaintDetailToLoopDraft(draft, detail, args.variant, args.anchorHz, placement), `Audio-Paint neu berechnet · ${detail.prism ?? entry.name}`);
      args.closeDialog();
      args.setActionMessage(null);
    }});
  } catch (error) {
    args.setActionMessage(`Fretless-Pinkspur-Neuberechnung fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
  } finally { args.setBusy(false); }
}
