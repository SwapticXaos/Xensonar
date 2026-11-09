import type { CarrierIntegralPinkExportDetail } from '../../l3lab/contracts/carrierIntegralPinkExportContract';
import type { CarrierIntegralRawMaterialMelodicExportDetail } from '../../l3lab/contracts/carrierIntegralMelodicHandoffContract';
import type { MaterialIntakeRawMelodicImportDetail } from '../../l3lab/contracts/materialIntakeMelodicHandoffContract';
export type { CarrierIntegralRawMaterialMelodicExportDetail } from '../../l3lab/contracts/carrierIntegralMelodicHandoffContract';
import type { RootFollowBankEntryConfig, RootFollowBankRecord } from '../rootFollow/rootFollowTypes';

export const XENSONAR_EVENT_NAMES = {
  rootFollowBankMembership: 'xensonar:root-follow-bank-membership',
  rootFollowBankSync: 'xensonar:root-follow-bank-sync',
  carrierIntegralMelodicPinkExport: 'xensonar:carrier-integral-melodic-pink-export',
  carrierIntegralRawMaterialMelodicExport: 'xensonar:carrier-integral-raw-material-melodic-export',
  materialIntakeRawMelodicImport: 'xensonar:material-intake-raw-melodic-import',
  openSyntheticForgeMelodicLoop: 'xensonar:open-canonical-melodic-loop',
  /** @deprecated Legacy event key; wire name retained for compatibility. */
  openCanonicalMelodicLoop: 'xensonar:open-canonical-melodic-loop',
  drumConfigSendRequest: 'xensonar:drum-config-send-request',
  spectralForgeAudioCutUpload: 'xensonar:spectral-forge-audio-cut-upload',
} as const;

export type RootFollowBankMembershipDetail = {
  entryId?: string;
  enabled?: boolean;
  activate?: boolean;
  config?: Partial<RootFollowBankEntryConfig> | null;
};

export type RootFollowBankSyncDetail = RootFollowBankRecord;

export type OpenSyntheticForgeMelodicLoopDetail = {
  reason?: string;
  entryId?: string;
};
/** @deprecated Use OpenSyntheticForgeMelodicLoopDetail. */
export type OpenCanonicalMelodicLoopDetail = OpenSyntheticForgeMelodicLoopDetail;

export type DrumConfigSendRequestDetail = {
  id?: string;
};

export type SpectralForgeAudioCutUploadDetail = {
  file?: File | null;
  source?: string;
  requestedAt?: number;
};

export type XensonarEventMap = {
  rootFollowBankMembership: RootFollowBankMembershipDetail;
  rootFollowBankSync: RootFollowBankSyncDetail;
  carrierIntegralMelodicPinkExport: CarrierIntegralPinkExportDetail;
  carrierIntegralRawMaterialMelodicExport: CarrierIntegralRawMaterialMelodicExportDetail;
  materialIntakeRawMelodicImport: MaterialIntakeRawMelodicImportDetail;
  openSyntheticForgeMelodicLoop: OpenSyntheticForgeMelodicLoopDetail;
  openCanonicalMelodicLoop: OpenSyntheticForgeMelodicLoopDetail;
  drumConfigSendRequest: DrumConfigSendRequestDetail;
  spectralForgeAudioCutUpload: SpectralForgeAudioCutUploadDetail;
};

export type XensonarEventKey = keyof XensonarEventMap;

export type XensonarEventName<K extends XensonarEventKey = XensonarEventKey> = typeof XENSONAR_EVENT_NAMES[K];

export type XensonarEventHandler<K extends XensonarEventKey> = (detail: XensonarEventMap[K], event: CustomEvent<XensonarEventMap[K]>) => void;

function hasWindowDispatch(): boolean {
  return typeof window !== 'undefined' && typeof window.dispatchEvent === 'function';
}

export function createXensonarEvent<K extends XensonarEventKey>(
  key: K,
  detail: XensonarEventMap[K],
): CustomEvent<XensonarEventMap[K]> {
  return new CustomEvent<XensonarEventMap[K]>(XENSONAR_EVENT_NAMES[key], { detail });
}

export function dispatchXensonarEvent<K extends XensonarEventKey>(
  key: K,
  detail: XensonarEventMap[K],
): boolean {
  if (!hasWindowDispatch()) return false;
  window.dispatchEvent(createXensonarEvent(key, detail));
  return true;
}

export function listenXensonarEvent<K extends XensonarEventKey>(
  key: K,
  handler: XensonarEventHandler<K>,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (event: Event) => {
    const typedEvent = event as CustomEvent<XensonarEventMap[K]>;
    handler(typedEvent.detail, typedEvent);
  };
  window.addEventListener(XENSONAR_EVENT_NAMES[key], listener as EventListener);
  return () => {
    window.removeEventListener(XENSONAR_EVENT_NAMES[key], listener as EventListener);
  };
}
