import * as React from 'react';
import type { LoopComposerState } from './loopDrumDomain';
import {
  MELODIC_IMPORT_PRIMARY_PINK,
  createMelodicImportLanePlacement,
  hasPrimaryPinkImportLane,
  suggestNextImportLaneColor,
  type MelodicImportLaneFamily,
  type MelodicImportLanePlacement,
} from './melodicImportLanePolicy';

export type MelodicImportLaneRequest = {
  family: MelodicImportLaneFamily;
  importLabel: string;
  run: (placement: MelodicImportLanePlacement) => Promise<void> | void;
};

export function useMelodicImportLanePolicyRuntime(args: {
  loopComposer: LoopComposerState;
  setActionMessage: (message: string | null) => void;
  setBusy: (busy: boolean) => void;
}) {
  const [pendingColoredImport, setPendingColoredImport] = React.useState<MelodicImportLaneRequest | null>(null);
  const [importLaneColorDraft, setImportLaneColorDraft] = React.useState('#22d3ee');

  const requestImportLane = React.useCallback(async (request: MelodicImportLaneRequest) => {
    if (hasPrimaryPinkImportLane(args.loopComposer)) {
      setImportLaneColorDraft(suggestNextImportLaneColor(args.loopComposer));
      setPendingColoredImport(request);
      args.setActionMessage('Es liegt bereits eine pinke Spur im Melodic Loop. Farbe wählen.');
      return false;
    }
    await request.run(createMelodicImportLanePlacement(request.family, MELODIC_IMPORT_PRIMARY_PINK));
    return true;
  }, [args.loopComposer, args.setActionMessage]);

  const confirmColoredImport = React.useCallback(async () => {
    if (!pendingColoredImport) return;
    args.setBusy(true);
    try {
      await pendingColoredImport.run(createMelodicImportLanePlacement(pendingColoredImport.family, importLaneColorDraft));
      setPendingColoredImport(null);
      args.setActionMessage(null);
    } catch (error) {
      args.setActionMessage(error instanceof Error ? error.message : 'Mehrfach-Import konnte nicht ausgeführt werden.');
    } finally {
      args.setBusy(false);
    }
  }, [args, importLaneColorDraft, pendingColoredImport]);

  const cancelColoredImport = React.useCallback(() => {
    setPendingColoredImport(null);
    args.setActionMessage('Mehrfach-Import abgebrochen.');
  }, [args.setActionMessage]);

  return {
    pendingColoredImport,
    importLaneColorDraft,
    setImportLaneColorDraft,
    requestImportLane,
    confirmColoredImport,
    cancelColoredImport,
  };
}
