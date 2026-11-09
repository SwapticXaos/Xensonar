import { dispatchXensonarEvent } from '../runtime/xensonarEventChannels';
import { useRef } from 'react';
import type { MaterialEntry } from '../../l3lab/materialLibrary';
import { updateRootFollowTrafficState } from '../audioTraffic/audioTrafficForensics';
import { clearPersistedRootFollowBank, ROOT_FOLLOW_BANK_STORAGE_KEY } from '../material/rootFollowBankStorage';
import type { RootFollowBankEntryConfig } from './rootFollowTypes';
import type { RootFollowActiveSynthVoice, RootFollowPlaybackRefs } from './rootFollowRendererTypes';
import { readRootFollowPlaybackTruthProbe, type RootFollowPlaybackStopReason } from './rootFollowPlaybackTruthProbe';
import { disposeAllDirtyRootFollowWalzen } from './rootFollowDirtyMaschine';
import { stopNativeRootFollowMaterialBridge } from './nativeRootFollowMaterialBridge';
import { disposeAllNativeRootFollowMaterialForgeAux } from './nativeRootFollowMaterialForgeAux';

export type RootFollowRuntimeHealth = {
  audioContextState: string;
  selectedLoopName: string | null;
  selectedLoopId: string | null;
  rootFollowLoopActive: boolean;
  rootFollowPreviewActive: boolean;
  rootFollowPlayfieldInside: boolean;
  rootFollowEntries: number;
  packagePreferredEntries: number;
  materialLoopEntries: number;
  runtimeNodes: number;
  synthVoices: number;
  cacheSize: number;
  timerActive: boolean;
  gainConnected: boolean;
  browserState: string;
  effectivePlaybackGate: boolean;
  selectedEntryExists: boolean;
  lastPlaybackStage: string | null;
  lastStopReason: RootFollowPlaybackStopReason | null;
  latestColdStartRisk: boolean;
  latestColdStartLeadMs: number | null;
};

export type RootFollowRuntimeBoundaryRefs = Pick<
  RootFollowPlaybackRefs,
  'cacheRef' | 'gainRef' | 'tokenRef' | 'timerRef' | 'activeNodesRef' | 'activeSynthVoicesRef'
>;

export type RootFollowRuntimeBoundaryNParamsPatch = {
  rootFollowLoopActive?: boolean;
  rootFollowLoopId?: string;
  resonanceHotkeyMode?: 'material' | 'root-follow' | 'particle-classic';
  materialLoopActive?: boolean;
};

export function useRootFollowRuntimeBoundaryRefs(): RootFollowRuntimeBoundaryRefs {
  const cacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const gainRef = useRef<GainNode | null>(null);
  const tokenRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const activeNodesRef = useRef<Set<AudioNode>>(new Set());
  const activeSynthVoicesRef = useRef<Map<string, RootFollowActiveSynthVoice>>(new Map());
  return { cacheRef, gainRef, tokenRef, timerRef, activeNodesRef, activeSynthVoicesRef };
}

export function stopRootFollowPlaybackNodesBoundary(refs: RootFollowRuntimeBoundaryRefs) {
  if (refs.timerRef.current !== null) {
    window.clearTimeout(refs.timerRef.current);
    refs.timerRef.current = null;
  }
  refs.activeNodesRef.current.forEach((node) => {
    try {
      if (node instanceof AudioScheduledSourceNode) node.stop();
    } catch {}
    try { node.disconnect(); } catch {}
  });
  refs.activeNodesRef.current.clear();
  refs.activeSynthVoicesRef.current.clear();
  stopNativeRootFollowMaterialBridge();
  disposeAllNativeRootFollowMaterialForgeAux();
  disposeAllDirtyRootFollowWalzen();
  try { refs.gainRef.current?.disconnect(); } catch {}
  refs.gainRef.current = null;
}

export function stopRootFollowRuntimeBoundary(refs: RootFollowRuntimeBoundaryRefs) {
  refs.tokenRef.current += 1;
  stopRootFollowPlaybackNodesBoundary(refs);
  refs.cacheRef.current.clear();
}

function readRootFollowBrowserState(rootFollowUiStorageKey: string) {
  if (typeof window === 'undefined') return 'nicht verfügbar';
  let ui = 'UI leer';
  let bank = 'Bank leer';
  try { ui = window.localStorage.getItem(rootFollowUiStorageKey) ? 'UI gespeichert' : 'UI leer'; } catch { ui = 'UI unlesbar'; }
  try { bank = window.localStorage.getItem(ROOT_FOLLOW_BANK_STORAGE_KEY) ? 'Bank gespeichert' : 'Bank leer'; } catch { bank = 'Bank unlesbar'; }
  return ui + ' · ' + bank;
}

export function readRootFollowRuntimeHealth(args: {
  audioContextState: string;
  selectedRootFollowLoop: MaterialEntry | null;
  fallbackSelectedLoopId: string | null;
  rootFollowLoopActive: boolean;
  rootFollowPreviewActive: boolean;
  rootFollowPlayfieldInside: boolean;
  rootFollowEntries: number;
  packagePreferredEntries: number;
  materialLoopEntries: number;
  rootFollowUiStorageKey: string;
  refs: RootFollowRuntimeBoundaryRefs;
}): RootFollowRuntimeHealth {
  const truthProbe = readRootFollowPlaybackTruthProbe();
  const latest = truthProbe.latest;
  return {
    audioContextState: args.audioContextState,
    selectedLoopName: args.selectedRootFollowLoop?.name ?? null,
    selectedLoopId: args.selectedRootFollowLoop?.id ?? args.fallbackSelectedLoopId ?? null,
    rootFollowLoopActive: !!args.rootFollowLoopActive,
    rootFollowPreviewActive: !!args.rootFollowPreviewActive,
    rootFollowPlayfieldInside: !!args.rootFollowPlayfieldInside,
    effectivePlaybackGate: !!(args.rootFollowPreviewActive || args.rootFollowPlayfieldInside),
    selectedEntryExists: !!args.selectedRootFollowLoop,
    rootFollowEntries: args.rootFollowEntries,
    packagePreferredEntries: args.packagePreferredEntries,
    materialLoopEntries: args.materialLoopEntries,
    runtimeNodes: args.refs.activeNodesRef.current.size,
    synthVoices: args.refs.activeSynthVoicesRef.current.size,
    cacheSize: args.refs.cacheRef.current.size,
    timerActive: args.refs.timerRef.current !== null,
    gainConnected: args.refs.gainRef.current !== null,
    browserState: readRootFollowBrowserState(args.rootFollowUiStorageKey),
    lastPlaybackStage: latest?.stage ?? null,
    lastStopReason: truthProbe.latestStopReason,
    latestColdStartRisk: truthProbe.latestColdStartRisk,
    latestColdStartLeadMs: latest?.coldStartLeadMs ?? null,
  };
}

export function publishRootFollowRuntimeTraffic(args: {
  refs: RootFollowPlaybackRefs;
  activeRequested: boolean;
  gateOpen: boolean;
  selectedRootFollowLoop: MaterialEntry | null;
  selectedRootFollowLoopConfig: RootFollowBankEntryConfig | null;
  granulationMode: 'flowing' | 'grainy';
  volume: number;
  currentRootHz: number | null;
  stage: string;
}) {
  const traffic = args.refs.trafficRef?.current;
  if (!traffic) return;
  updateRootFollowTrafficState(traffic, {
    activeRequested: args.activeRequested,
    gateOpen: args.gateOpen,
    selectedLoopId: args.selectedRootFollowLoop?.id ?? null,
    selectedLoopName: args.selectedRootFollowLoop?.name ?? null,
    sourceKind: args.selectedRootFollowLoopConfig?.sourceKind ?? null,
    renderMode: args.selectedRootFollowLoopConfig?.renderMode ?? null,
    granulationMode: args.granulationMode,
    volume: args.volume,
    currentRootHz: args.currentRootHz,
    timerActive: args.refs.timerRef.current !== null,
    gainConnected: args.refs.gainRef.current !== null,
    activeNodes: args.refs.activeNodesRef.current.size,
    activeSynthVoices: args.refs.activeSynthVoicesRef.current.size,
    cacheSize: args.refs.cacheRef.current.size,
    token: args.refs.tokenRef.current,
    lastStage: args.stage,
  });
}

export function clearRootFollowBrowserStateBoundary(args: {
  refs: RootFollowRuntimeBoundaryRefs;
  rootFollowUiStorageKey: string;
  updateNParams: (patch: RootFollowRuntimeBoundaryNParamsPatch) => void;
  setStatus: (message: string) => void;
}) {
  stopRootFollowRuntimeBoundary(args.refs);
  clearPersistedRootFollowBank();
  try { window.localStorage.removeItem(args.rootFollowUiStorageKey); } catch {}
  try { window.sessionStorage.removeItem(args.rootFollowUiStorageKey); } catch {}
  args.updateNParams({ rootFollowLoopActive: false, rootFollowLoopId: '' });
  args.setStatus('Root-Follow-Browserzustand gelöscht: Bank, Auswahl, Laufzeit und Cache sind leer. Materialspur/Samples wurden nicht gelöscht.');
}

export function reactivateRootFollowFromLoadedPackageBoundary(args: {
  materialEntries: MaterialEntry[];
  selectedLoopMaterial: MaterialEntry | null;
  updateNParams: (patch: RootFollowRuntimeBoundaryNParamsPatch) => void;
  setStatus: (message: string) => void;
}) {
  const preferredEntries = args.materialEntries.filter((entry) => entry.rootFollowPreferred);
  const fallbackEntries = preferredEntries.length
    ? preferredEntries
    : (args.selectedLoopMaterial ? [args.selectedLoopMaterial] : args.materialEntries.filter((entry) => entry.role === 'loop').slice(0, 1));
  if (!fallbackEntries.length) {
    args.setStatus('Keine geladenen Materialspur-Einträge gefunden, aus denen Root Follow reaktiviert werden kann.');
    return;
  }
  fallbackEntries.forEach((entry) => {
    dispatchXensonarEvent('rootFollowBankMembership', { entryId: entry.id, enabled: true });
  });
  const target = fallbackEntries[0];
  args.updateNParams({ rootFollowLoopId: target.id, rootFollowLoopActive: true, resonanceHotkeyMode: 'root-follow' });
  args.setStatus(preferredEntries.length
    ? 'Root Follow aus Paketdaten reaktiviert: ' + fallbackEntries.length + ' markierte Einträge; aktiv ist ' + target.name + '.'
    : 'Keine Root-Follow-Markierung im Paket gefunden; ersatzweise wurde ' + target.name + ' aus der Materialspur in Root Follow gesetzt.');
}
