import type {
  RootFollowBankEntryConfig,
  RootFollowCarrierTimbreSnapshot,
} from '../../xensonar/rootFollow/rootFollowTypes';

export type CarrierIntegralPinkVariant = 'last-hearing' | 'grained' | 'scattered' | 'monotone';

export type CarrierIntegralPinkExportDetail = {
  entryId: string;
  materialName?: string;
  carrierProjectId?: string;
  machineId?: string;
  prism?: string;
  bars?: number;
  bpm?: number;
  durationSec?: number;
  rootHz?: number | null;
  config?: RootFollowBankEntryConfig | null;
  carrierIntegralTimbre?: RootFollowCarrierTimbreSnapshot | null;
  projectionMode?: CarrierIntegralPinkVariant | 'anchor-body' | 'experimental-frequency-projection';
  targetId?: string;
  planReason?: string;
  noteCount?: number;
  trackCount?: number;
  branchALineTrafficCount?: number;
  b573WindowCount?: number;
  intervalWindowCount?: number;
  renderAudioIdentityKey?: string;
  renderAudioIdentitySource?: string;
};
