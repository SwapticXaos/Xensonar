import * as React from 'react';
import type { CarrierIntegralPinkVariant } from './loopDrumDomain';
import type { CarrierIntegralPinkExportDetail } from '../contracts/carrierIntegralPinkExportContract';
import type { MaterialImportEntrySummary } from './materialImportChannel';
import { listenXensonarEvent } from '../../xensonar/runtime/xensonarEventChannels';
import {
  CARRIER_INTEGRAL_PENDING_PINK_MELODIC_SESSION_KEY,
  CARRIER_INTEGRAL_PENDING_RAW_MATERIAL_MELODIC_SESSION_KEY,
  type CarrierIntegralRawMaterialMelodicExportDetail,
} from '../contracts/carrierIntegralMelodicHandoffContract';

export type PendingRawCarrierMaterialHandoff = {
  detail: CarrierIntegralRawMaterialMelodicExportDetail;
  source: 'event' | 'session';
};

export function useCarrierMelodicImportHandoffRuntime(args: {
  materialEntries: MaterialImportEntrySummary[];
  pendingRawCarrierMaterialHandoff: PendingRawCarrierMaterialHandoff | null;
  queueCarrierPinkExportForImportDialog: (detail: CarrierIntegralPinkExportDetail, source: 'event' | 'session') => void;
  queueRawCarrierMaterialForDirectImport: (detail?: CarrierIntegralRawMaterialMelodicExportDetail | null, source?: 'event' | 'session') => void;
  setSelectedMaterialImportId: React.Dispatch<React.SetStateAction<string>>;
  setCarrierPinkVariant: React.Dispatch<React.SetStateAction<CarrierIntegralPinkVariant>>;
  setShowMaterialImportMenu: React.Dispatch<React.SetStateAction<boolean>>;
  setMaterialImportActionMessage: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  React.useEffect(() => {
    const receiveCarrierPinkExport = (detail?: CarrierIntegralPinkExportDetail | null, source: 'event' | 'session' = 'event') => {
      if (!detail?.entryId) return;
      args.queueCarrierPinkExportForImportDialog(detail, source);
    };
    try {
      const raw = window.sessionStorage.getItem(CARRIER_INTEGRAL_PENDING_PINK_MELODIC_SESSION_KEY);
      if (raw) receiveCarrierPinkExport(JSON.parse(raw) as CarrierIntegralPinkExportDetail, 'session');
    } catch {}
    return listenXensonarEvent('carrierIntegralMelodicPinkExport', (detail) => receiveCarrierPinkExport(detail, 'event'));
  }, [args.queueCarrierPinkExportForImportDialog]);

  React.useEffect(() => {
    const pendingKey = CARRIER_INTEGRAL_PENDING_RAW_MATERIAL_MELODIC_SESSION_KEY;
    try {
      const raw = window.sessionStorage.getItem(pendingKey);
      if (raw) args.queueRawCarrierMaterialForDirectImport(JSON.parse(raw) as CarrierIntegralRawMaterialMelodicExportDetail, 'session');
    } catch {}
    return listenXensonarEvent('carrierIntegralRawMaterialMelodicExport', (detail) => args.queueRawCarrierMaterialForDirectImport(detail, 'event'));
  }, [args.queueRawCarrierMaterialForDirectImport]);

  React.useEffect(() => {
    const pending = args.pendingRawCarrierMaterialHandoff;
    const entryId = pending?.detail.entryId;
    if (!pending || !entryId) return;
    const entry = args.materialEntries.find((candidate) => candidate.id === entryId) ?? null;
    if (!entry) {
      args.setShowMaterialImportMenu(true);
      args.setMaterialImportActionMessage('Raw-Audio-Carrier empfangen · warte auf Materialbibliothek, dann bleibt der Importdialog zur Auswahl offen.');
      return;
    }
    if (!entry.transferReady) {
      args.setShowMaterialImportMenu(true);
      args.setMaterialImportActionMessage(entry.disabledReason ?? 'Raw-Audio-Carrier empfangen, aber der Materialkörper ist noch nicht übertragbar.');
      return;
    }
    args.setSelectedMaterialImportId(entryId);
    args.setCarrierPinkVariant('grained');
    args.setShowMaterialImportMenu(true);
    args.setMaterialImportActionMessage(pending.source === 'session'
      ? `Raw-Audio-Carrier aus Zwischenspeicher bereit · ${entry.name}`
      : `Raw-Audio-Carrier bereit · ${entry.name}`);
  }, [
    args.materialEntries,
    args.pendingRawCarrierMaterialHandoff,
    args.setCarrierPinkVariant,
    args.setMaterialImportActionMessage,
    args.setSelectedMaterialImportId,
    args.setShowMaterialImportMenu,
  ]);
}
