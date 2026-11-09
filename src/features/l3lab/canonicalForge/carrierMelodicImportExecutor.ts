import { cloneLoopComposerState, type CarrierIntegralPinkVariant, type LoopComposerState } from './loopDrumDomain';
import { applyAudioPaintDetailToLoopDraft } from './audioPaintLoopImport';
import { resolveCarrierMelodicImportModeAvailability, type MaterialImportEntrySummary } from './materialImportChannel';
import type { MelodicImportLanePlacement } from './melodicImportLanePolicy';

export type CarrierMelodicImportExecutionKind = 'structured-carrier' | 'raw-audio';

export type CarrierMelodicImportExecutionResult = {
  ok: boolean;
  kind: CarrierMelodicImportExecutionKind | 'none';
  message: string;
  shouldCloseDialog: boolean;
  shouldClearPendingHandoff: boolean;
};

export type ExecuteCarrierMelodicImportArgs = {
  entry: MaterialImportEntrySummary | null | undefined;
  mode: CarrierIntegralPinkVariant;
  anchorHz: number;
  loopComposer: LoopComposerState;
  onMutateLoopComposer: (updater: (draft: LoopComposerState) => void, statusMessage?: string, options?: { history?: boolean }) => void;
  onImportMaterialToMelodicLoop: (materialId: string, anchorHz: number, lanePlacement?: MelodicImportLanePlacement | null) => Promise<void> | void;
  lanePlacement?: MelodicImportLanePlacement | null;
};

export async function executeCarrierMelodicImport(args: ExecuteCarrierMelodicImportArgs): Promise<CarrierMelodicImportExecutionResult> {
  const entry = args.entry ?? null;
  if (!entry) {
    return {
      ok: false,
      kind: 'none',
      message: 'Wähle zuerst einen Importkörper aus.',
      shouldCloseDialog: false,
      shouldClearPendingHandoff: false,
    };
  }
  if (!entry.transferReady) {
    return {
      ok: false,
      kind: 'none',
      message: entry.disabledReason ?? 'Dieser Importkörper ist noch nicht übertragbar.',
      shouldCloseDialog: false,
      shouldClearPendingHandoff: false,
    };
  }

  const availability = resolveCarrierMelodicImportModeAvailability(entry, args.mode);
  if (!availability.ready) {
    return {
      ok: false,
      kind: availability.kind,
      message: availability.reason ?? 'Dieser pinke-Spur-Modus ist für den gewählten Carrier-/Materialkörper nicht verfügbar.',
      shouldCloseDialog: false,
      shouldClearPendingHandoff: false,
    };
  }

  if (availability.kind === 'structured-carrier') {
    const detail = entry.audioPaintDetail ?? null;
    const previewDraft = cloneLoopComposerState(args.loopComposer);
    const previewResult = applyAudioPaintDetailToLoopDraft(previewDraft, detail, args.mode, args.anchorHz, args.lanePlacement);
    if (!previewResult.applied) {
      return {
        ok: false,
        kind: 'structured-carrier',
        message: previewResult.reason || 'Carrier-Feld konnte nicht eingesetzt werden.',
        shouldCloseDialog: false,
        shouldClearPendingHandoff: false,
      };
    }

    args.onMutateLoopComposer((draft) => {
      applyAudioPaintDetailToLoopDraft(draft, detail, args.mode, args.anchorHz, args.lanePlacement);
    }, `Carrier-Feld eingesetzt · ${detail?.prism ?? entry.name}`);

    return {
      ok: true,
      kind: 'structured-carrier',
      message: previewResult.reason || 'Carrier-Feld eingesetzt.',
      shouldCloseDialog: true,
      shouldClearPendingHandoff: true,
    };
  }

  await args.onImportMaterialToMelodicLoop(entry.id, args.anchorHz, args.lanePlacement);
  return {
    ok: true,
    kind: 'raw-audio',
    message: `Raw Audio eingesetzt · ${entry.name}`,
    shouldCloseDialog: true,
    shouldClearPendingHandoff: true,
  };
}
