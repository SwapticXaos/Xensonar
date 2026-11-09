import * as React from 'react';
import type { CarrierIntegralPinkVariant, LoopComposerState } from './loopDrumDomain';
import type { CarrierIntegralPinkExportDetail } from '../contracts/carrierIntegralPinkExportContract';
import {
  OPEN_MATERIAL_IMPORT_DIALOG_EVENT,
  resolveCarrierMelodicImportModeAvailability,
  type MaterialImportEntrySummary,
} from './materialImportChannel';
import { pickPreferredMaterialImportEntry, resolveSelectedMaterialImportEntry } from './materialImportSelection';
import { createAudioPaintEditorIntentForEntry } from './audioPaintImportRepair';
import { commitMelodicImportSelectionTransaction, rebuildAndImportAudioPaintTransaction } from './melodicImportTransactions';
import { useForgeProjectLibrary } from '../spectralForge/projectLibrary';
import { dispatchCarrierIntegralEditorIntent } from '../contracts/carrierIntegralEditorIntent';
import {
  CARRIER_INTEGRAL_PENDING_PINK_MELODIC_SESSION_KEY,
  CARRIER_INTEGRAL_PENDING_RAW_MATERIAL_MELODIC_SESSION_KEY,
  type CarrierIntegralRawMaterialMelodicExportDetail,
} from '../contracts/carrierIntegralMelodicHandoffContract';
import { useCarrierMelodicImportHandoffRuntime } from './useCarrierMelodicImportHandoffRuntime';
import { useMelodicImportRackFocusRuntime } from './useMelodicImportRackFocusRuntime';
import { useMaterialIntakeRawMelodicHandoffRuntime } from './useMaterialIntakeRawMelodicHandoffRuntime';
import type { MelodicImportLanePlacement } from './melodicImportLanePolicy';
import { useMelodicImportLanePolicyRuntime } from './useMelodicImportLanePolicyRuntime';

export function useMelodicMaterialImportGateway(args: {
  materialEntries: MaterialImportEntrySummary[];
  materialImportRequestNonce: number;
  loopComposer: LoopComposerState;
  onMutateLoopComposer: (
    updater: (draft: LoopComposerState) => void,
    statusMessage?: string,
    options?: { history?: boolean },
  ) => void;
  onImportMaterialToMelodicLoop: (materialId: string, anchorHz: number, lanePlacement?: MelodicImportLanePlacement | null) => Promise<void> | void;
}) {
  const importBodyRackRef = React.useRef<HTMLDivElement | null>(null);
  const [showMaterialImportMenu, setShowMaterialImportMenu] = React.useState(false);
  const [selectedMaterialImportId, setSelectedMaterialImportId] = React.useState('');
  const [materialAnchorHzDraft, setMaterialAnchorHzDraft] = React.useState('55');
  const [materialImportBusy, setMaterialImportBusy] = React.useState(false);
  const [materialImportActionMessage, setMaterialImportActionMessage] = React.useState<string | null>(null);
  const [melodicImportRackFocusNonce, setMelodicImportRackFocusNonce] = React.useState(0);
  const melodicImportRackUserScrollCancelRef = React.useRef(0);
  const [pendingRawCarrierMaterialHandoff, setPendingRawCarrierMaterialHandoff] = React.useState<{
    detail: CarrierIntegralRawMaterialMelodicExportDetail;
    source: 'event' | 'session';
  } | null>(null);
  const [carrierPinkVariant, setCarrierPinkVariant] = React.useState<CarrierIntegralPinkVariant>('last-hearing');
  const forgeProjectEntries = useForgeProjectLibrary((state) => state.entries);

  const isPendingCarrierIntegralMaterialSelection = React.useCallback((id: string) => {
    const lower = id.toLowerCase();
    return lower.startsWith('carrier-integral-') || lower.includes('spectralforge-raw-oscillator-material');
  }, []);

  React.useEffect(() => {
    if (!args.materialEntries.length) {
      if (!isPendingCarrierIntegralMaterialSelection(selectedMaterialImportId)) setSelectedMaterialImportId('');
      return;
    }
    if (!selectedMaterialImportId) {
      setSelectedMaterialImportId(pickPreferredMaterialImportEntry(args.materialEntries)?.id ?? '');
      return;
    }
    if (!args.materialEntries.some((entry) => entry.id === selectedMaterialImportId) && !isPendingCarrierIntegralMaterialSelection(selectedMaterialImportId)) {
      setSelectedMaterialImportId(pickPreferredMaterialImportEntry(args.materialEntries)?.id ?? '');
    }
  }, [args.materialEntries, isPendingCarrierIntegralMaterialSelection, selectedMaterialImportId]);

  const emitMaterialImportStatus = React.useCallback((message: string) => {
    args.onMutateLoopComposer(() => {}, message, { history: false });
  }, [args.onMutateLoopComposer]);

  const {
    pendingColoredImport, importLaneColorDraft, setImportLaneColorDraft,
    requestImportLane, confirmColoredImport, cancelColoredImport,
  } = useMelodicImportLanePolicyRuntime({
    loopComposer: args.loopComposer,
    setActionMessage: setMaterialImportActionMessage,
    setBusy: setMaterialImportBusy,
  });

  const selectedMaterialImportEntry = React.useMemo(
    () => resolveSelectedMaterialImportEntry(args.materialEntries, selectedMaterialImportId),
    [args.materialEntries, selectedMaterialImportId],
  );

  useMaterialIntakeRawMelodicHandoffRuntime({
    materialEntries: args.materialEntries,
    onReadyToImport: async (entry, anchorHz) => {
      await requestImportLane({
        family: 'material',
        importLabel: entry.name,
        run: async (placement) => {
          await args.onImportMaterialToMelodicLoop(entry.id, anchorHz, placement);
          emitMaterialImportStatus(`Raw Audio als eigene Importspur eingesetzt · ${entry.name}`);
        },
      });
    },
    emitStatus: emitMaterialImportStatus,
  });


  React.useEffect(() => {
    if (!showMaterialImportMenu || !selectedMaterialImportEntry) return;
    const selectedAvailability = resolveCarrierMelodicImportModeAvailability(selectedMaterialImportEntry, carrierPinkVariant);
    const structuredAvailability = resolveCarrierMelodicImportModeAvailability(selectedMaterialImportEntry, 'last-hearing');
    const rawAvailability = resolveCarrierMelodicImportModeAvailability(selectedMaterialImportEntry, 'grained');
    if (!selectedAvailability.ready && rawAvailability.ready) {
      setCarrierPinkVariant('grained');
      return;
    }
    if (!selectedAvailability.ready && structuredAvailability.ready) {
      setCarrierPinkVariant('last-hearing');
    }
  }, [carrierPinkVariant, selectedMaterialImportEntry, showMaterialImportMenu]);

  const parsedMaterialAnchorHz = React.useMemo(() => {
    const parsed = Number(materialAnchorHzDraft.trim().replace(',', '.'));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [materialAnchorHzDraft]);

  const roundedAnchorPreview = React.useMemo(() => {
    if (!args.loopComposer.pitchLines.length) return null;
    const requested = parsedMaterialAnchorHz ?? 55;
    let best = args.loopComposer.pitchLines[0];
    let bestDelta = Number.POSITIVE_INFINITY;
    for (const line of args.loopComposer.pitchLines) {
      const hz = line.hz * Math.pow(2, (line.offsetCents ?? 0) / 1200);
      const delta = Math.abs(hz - requested);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = line;
      }
    }
    return {
      lineId: best.id,
      label: best.label,
      hz: best.hz * Math.pow(2, (best.offsetCents ?? 0) / 1200),
    };
  }, [args.loopComposer.pitchLines, parsedMaterialAnchorHz]);

  const clearCarrierMelodicImportPendingHandoff = React.useCallback(() => {
    try {
      window.sessionStorage.removeItem(CARRIER_INTEGRAL_PENDING_PINK_MELODIC_SESSION_KEY);
      window.sessionStorage.removeItem(CARRIER_INTEGRAL_PENDING_RAW_MATERIAL_MELODIC_SESSION_KEY);
    } catch {}
    setPendingRawCarrierMaterialHandoff(null);
  }, []);

  const commitMaterialImportSelection = React.useCallback(() => commitMelodicImportSelectionTransaction({
    entry: selectedMaterialImportEntry, variant: carrierPinkVariant, anchorHz: parsedMaterialAnchorHz ?? 55,
    loopComposer: args.loopComposer, mutate: args.onMutateLoopComposer, importMaterial: args.onImportMaterialToMelodicLoop,
    requestImportLane, setBusy: setMaterialImportBusy, emitStatus: emitMaterialImportStatus,
    clearPendingHandoff: clearCarrierMelodicImportPendingHandoff, closeDialog: () => setShowMaterialImportMenu(false),
  }), [args.loopComposer, args.onImportMaterialToMelodicLoop, args.onMutateLoopComposer, carrierPinkVariant, clearCarrierMelodicImportPendingHandoff, emitMaterialImportStatus, parsedMaterialAnchorHz, requestImportLane, selectedMaterialImportEntry]);

  const rebuildAndImportAudioPaintEntry = React.useCallback((entryId: string) => rebuildAndImportAudioPaintTransaction({
    entryId, materialEntries: args.materialEntries, projects: forgeProjectEntries, variant: carrierPinkVariant,
    anchorHz: parsedMaterialAnchorHz ?? 55, loopComposer: args.loopComposer, mutate: args.onMutateLoopComposer,
    requestImportLane, setBusy: setMaterialImportBusy, setActionMessage: setMaterialImportActionMessage,
    closeDialog: () => setShowMaterialImportMenu(false),
  }), [args.loopComposer, args.materialEntries, args.onMutateLoopComposer, carrierPinkVariant, forgeProjectEntries, parsedMaterialAnchorHz, requestImportLane]);

  const editAudioPaintEntryInSpectralForge = React.useCallback((entryId: string) => {
    const entry = args.materialEntries.find((candidate) => candidate.id === entryId) ?? null;
    if (!entry || entry.lane !== 'audio-paint') return;
    const intent = createAudioPaintEditorIntentForEntry(entry, forgeProjectEntries);
    setShowMaterialImportMenu(false);
    setMaterialImportActionMessage(null);
    dispatchCarrierIntegralEditorIntent(intent);
  }, [args.materialEntries, forgeProjectEntries]);

  React.useEffect(() => {
    const handleOpenMaterialImport = () => {
      setMaterialImportActionMessage(null);
      setShowMaterialImportMenu(true);
    };
    window.addEventListener(OPEN_MATERIAL_IMPORT_DIALOG_EVENT, handleOpenMaterialImport as EventListener);
    return () => window.removeEventListener(OPEN_MATERIAL_IMPORT_DIALOG_EVENT, handleOpenMaterialImport as EventListener);
  }, []);

  React.useEffect(() => {
    if (args.materialImportRequestNonce <= 0) return;
    setMaterialImportActionMessage(null);
    setShowMaterialImportMenu(true);
  }, [args.materialImportRequestNonce]);

  const queueCarrierPinkExportForImportDialog = React.useCallback((detail: CarrierIntegralPinkExportDetail, source: 'event' | 'session') => {
    if (!detail.entryId) return;
    const anchorHz = Number.isFinite(detail.rootHz ?? NaN) ? Number(detail.rootHz) : 55;
    const variant = detail.projectionMode === 'grained' || detail.projectionMode === 'scattered' || detail.projectionMode === 'monotone' ? detail.projectionMode : 'last-hearing';
    setMaterialAnchorHzDraft(anchorHz.toFixed(2));
    setSelectedMaterialImportId(detail.entryId);
    setCarrierPinkVariant(variant);
    setShowMaterialImportMenu(true);
    setMaterialImportActionMessage(source === 'session'
      ? 'Carrier-Hörweise aus Zwischenspeicher gewählt · wähle Fretless-Feld, zerstreut, Raw Audio oder monoton.'
      : 'Carrier-Hörweise gewählt · wähle Fretless-Feld, zerstreut, Raw Audio oder monoton.');
    setMelodicImportRackFocusNonce((value) => value + 1);
  }, []);

  const queueRawCarrierMaterialForDirectImport = React.useCallback((detail?: CarrierIntegralRawMaterialMelodicExportDetail | null, source: 'event' | 'session' = 'event') => {
    const entryId = detail?.entryId;
    if (!entryId) return;
    const anchorHz = Number.isFinite(detail?.rootHz ?? NaN) ? Number(detail?.rootHz) : (parsedMaterialAnchorHz ?? 55);
    const normalizedDetail: CarrierIntegralRawMaterialMelodicExportDetail = { ...detail, entryId, rootHz: anchorHz };
    setMaterialAnchorHzDraft(anchorHz.toFixed(2));
    setSelectedMaterialImportId(entryId);
    setCarrierPinkVariant('grained');
    setShowMaterialImportMenu(true);
    setPendingRawCarrierMaterialHandoff({ detail: normalizedDetail, source });
    setMaterialImportActionMessage(source === 'session'
      ? 'Raw-Audio-Carrier aus Zwischenspeicher gewählt · bestätige Raw Audio oder wähle einen anderen pinke-Spur-Modus.'
      : 'Raw-Audio-Carrier gewählt · bestätige Raw Audio oder wähle einen anderen pinke-Spur-Modus.');
    setMelodicImportRackFocusNonce((value) => value + 1);
  }, [parsedMaterialAnchorHz]);

  useCarrierMelodicImportHandoffRuntime({
    materialEntries: args.materialEntries,
    pendingRawCarrierMaterialHandoff,
    queueCarrierPinkExportForImportDialog,
    queueRawCarrierMaterialForDirectImport,
    setSelectedMaterialImportId,
    setCarrierPinkVariant,
    setShowMaterialImportMenu,
    setMaterialImportActionMessage,
  });

  useMelodicImportRackFocusRuntime({
    importBodyRackRef,
    melodicImportRackFocusNonce,
    melodicImportRackUserScrollCancelRef,
    showMaterialImportMenu,
  });

  return {
    importBodyRackRef,
    showMaterialImportMenu,
    setShowMaterialImportMenu,
    selectedMaterialImportId,
    setSelectedMaterialImportId,
    materialAnchorHzDraft,
    setMaterialAnchorHzDraft,
    materialImportBusy,
    materialImportActionMessage,
    setMaterialImportActionMessage,
    carrierPinkVariant,
    setCarrierPinkVariant,
    roundedAnchorPreview,
    pendingColoredImport,
    importLaneColorDraft,
    setImportLaneColorDraft,
    confirmColoredImport,
    cancelColoredImport,
    commitMaterialImportSelection,
    rebuildAndImportAudioPaintEntry,
    editAudioPaintEntryInSpectralForge,
  };
}
