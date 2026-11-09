import * as React from 'react';
import {
  MATERIAL_INTAKE_PENDING_RAW_MELODIC_SESSION_KEY,
  type MaterialIntakeRawMelodicImportDetail,
} from '../contracts/materialIntakeMelodicHandoffContract';
import { listenXensonarEvent } from '../../xensonar/runtime/xensonarEventChannels';
import type { MaterialImportEntrySummary } from './materialImportChannel';

function normalizeDetail(detail: MaterialIntakeRawMelodicImportDetail | null | undefined) {
  const entryId = detail?.entryId?.trim();
  if (!entryId) return null;
  const anchorHz = Number(detail?.anchorHz);
  return {
    entryId,
    anchorHz: Number.isFinite(anchorHz) && anchorHz > 0 ? anchorHz : 55,
    source: detail?.source ?? 'spectral-forge-raw-audio',
  } satisfies Required<Pick<MaterialIntakeRawMelodicImportDetail, 'entryId' | 'anchorHz' | 'source'>>;
}

export function useMaterialIntakeRawMelodicHandoffRuntime(args: {
  materialEntries: MaterialImportEntrySummary[];
  onReadyToImport: (entry: MaterialImportEntrySummary, anchorHz: number) => Promise<void> | void;
  emitStatus: (message: string) => void;
}) {
  const [pending, setPending] = React.useState<ReturnType<typeof normalizeDetail>>(null);
  const inFlightEntryIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const receive = (detail?: MaterialIntakeRawMelodicImportDetail | null) => {
      const normalized = normalizeDetail(detail);
      if (normalized) setPending(normalized);
    };

    try {
      const raw = window.sessionStorage.getItem(MATERIAL_INTAKE_PENDING_RAW_MELODIC_SESSION_KEY);
      if (raw) receive(JSON.parse(raw) as MaterialIntakeRawMelodicImportDetail);
    } catch {}

    return listenXensonarEvent('materialIntakeRawMelodicImport', (detail) => receive(detail));
  }, []);

  React.useEffect(() => {
    if (!pending?.entryId || inFlightEntryIdRef.current === pending.entryId) return;
    const entry = args.materialEntries.find((candidate) => candidate.id === pending.entryId) ?? null;
    if (!entry) return;
    if (!entry.transferReady || !entry.rawAudioReady) {
      args.emitStatus(entry.disabledReason ?? 'Raw Audio wurde empfangen, ist aber noch nicht als pinke Melodic-Loop-Spur übertragbar.');
      return;
    }

    const current = pending;
    inFlightEntryIdRef.current = current.entryId;
    setPending(null);
    try {
      window.sessionStorage.removeItem(MATERIAL_INTAKE_PENDING_RAW_MELODIC_SESSION_KEY);
    } catch {}

    void Promise.resolve(args.onReadyToImport(entry, current.anchorHz)).catch((error) => {
      inFlightEntryIdRef.current = null;
      setPending(current);
      try {
        window.sessionStorage.setItem(MATERIAL_INTAKE_PENDING_RAW_MELODIC_SESSION_KEY, JSON.stringify(current));
      } catch {}
      args.emitStatus(`Raw Audio konnte nicht direkt als pinke Spur eingesetzt werden: ${error instanceof Error ? error.message : String(error)}`);
    }).finally(() => {
      if (inFlightEntryIdRef.current === current.entryId) inFlightEntryIdRef.current = null;
    });

  }, [args.materialEntries, args.onReadyToImport, args.emitStatus, pending]);
}
