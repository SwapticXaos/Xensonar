import { useSyncExternalStore } from 'react';
import { buildMachineRoomHandoffProfile, buildProducerRoadmapNotes, describeMaterialRoleHandoff, getMachineRoomDefinition, getTransitionGuidingSentence } from '../xensonar/architecture/machineRooms';
import { createMaterialPackageFromExport } from './materialAdapter';
import type { ExportedMaterialMeta } from './materialLibrary';
import type { XensonarMaterialPackageV1, XensonarMaterialRole } from './materialSchemaTypes';
import { createExampleExternalLoopPackage } from './adapters/exampleExternalLoopAdapter';

export interface ForgeProducerDescriptor {
  producerId: string;
  producerName: string;
  version: string;
  family: 'legacy' | 'canonical' | 'external';
  notes?: string;
}

export interface ForgeExportContext {
  producer: ForgeProducerDescriptor;
  meta: ExportedMaterialMeta;
  blob: Blob;
}

export interface ForgeMaterialAdapter {
  adapterId: string;
  adapterName: string;
  description: string;
  supportedRoles: XensonarMaterialRole[];
  buildPackage(context: ForgeExportContext): XensonarMaterialPackageV1;
}

const DEFAULT_ADAPTER_ID = 'spectralforge-legacy-bridge';
export const LEGACY_SPECTRAL_FORGE_PRODUCER: ForgeProducerDescriptor = {
  producerId: 'spectralforge-legacy',
  producerName: 'Spectral Forge Legacy',
  version: 'v2',
  family: 'legacy',
  notes: buildProducerRoadmapNotes('legacy', 'Spectral Forge Legacy'),
};


function getProducerMachineRoom(family: ForgeProducerDescriptor['family']) {
  switch (family) {
    case 'legacy':
      return getMachineRoomDefinition('forgeLegacy');
    case 'canonical':
      return getMachineRoomDefinition('forgeCanonical');
    case 'external':
      return getMachineRoomDefinition('externalSlot');
  }
}

function mergeBridgeNotes(...parts: Array<string | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join(' · ');
}

const listeners = new Set<() => void>();
let adapterRegistry = new Map<string, ForgeMaterialAdapter>();
let adapterSnapshot: ForgeMaterialAdapter[] = [];

function refreshAdapterSnapshot() {
  adapterSnapshot = Array.from(adapterRegistry.values());
}

function emit() {
  listeners.forEach((listener) => listener());
}

function upsertAdapter(adapter: ForgeMaterialAdapter) {
  adapterRegistry.set(adapter.adapterId, adapter);
  refreshAdapterSnapshot();
}

function ensureBuiltinAdapters() {
  if (adapterRegistry.size) return;
  upsertAdapter({
    adapterId: DEFAULT_ADAPTER_ID,
    adapterName: 'Legacy-Bridge',
    description: 'Direkte Adapterbrücke der bisherigen Spectral Forge in das offizielle Xensonar-Materialpaket.',
    supportedRoles: ['loop', 'waveMaterial', 'particleExciter', 'droneTexture'],
    buildPackage(context) {
      const pkg = createMaterialPackageFromExport(context.meta, context.blob);
      const room = getProducerMachineRoom(context.producer.family);
      const handoffProfile = buildMachineRoomHandoffProfile({
        role: context.meta.role,
        workspaceOrigin: (context.meta.workspaceOrigin as any) ?? (context.producer.family === 'legacy' ? 'legacy-forge' : context.producer.family === 'external' ? 'external' : undefined),
      });
      return {
        ...pkg,
        renderInfo: {
          ...pkg.renderInfo,
          sourceDevice: context.producer.producerName,
          sourceVersion: context.producer.version,
          renderMode: context.meta.renderMode,
          machineRoomId: room.id,
          machineRoomRole: room.shortLabel,
          handoffTarget: 'xensonarPerformance',
          transitionIntent: getTransitionGuidingSentence(),
          preferredMyzelGroup: context.meta.preferredMyzelGroup ?? handoffProfile.preferredMyzelGroup,
          workspaceOrigin: context.meta.workspaceOrigin,
          transitionGuard: context.meta.transitionGuard ?? handoffProfile.transitionGuard,
          balanceCarrier: context.meta.balanceCarrier ?? handoffProfile.balanceCarrier,
          routeSummary: context.meta.routeSummary ?? handoffProfile.routeSummary,
          stabilizeBy: context.meta.stabilizeBy ?? handoffProfile.stabilizeBy,
          notes: mergeBridgeNotes(context.producer.notes, describeMaterialRoleHandoff(context.meta.role), room.summary),
        },
      };
    },
  });
  upsertAdapter({
    adapterId: 'canonical-forge-bridge',
    adapterName: 'Canonical-Bridge',
    description: 'Neutralere Brücke für kommende datenreichere Forge-Varianten; gleiche Außenform, andere Innenarchitektur erlaubt.',
    supportedRoles: ['loop', 'waveMaterial', 'particleExciter', 'droneTexture'],
    buildPackage(context) {
      const pkg = createMaterialPackageFromExport(context.meta, context.blob);
      const room = getProducerMachineRoom(context.producer.family);
      const handoffProfile = buildMachineRoomHandoffProfile({
        role: context.meta.role,
        workspaceOrigin: (context.meta.workspaceOrigin as any) ?? (context.producer.family === 'legacy' ? 'legacy-forge' : context.producer.family === 'external' ? 'external' : undefined),
      });
      return {
        ...pkg,
        renderInfo: {
          ...pkg.renderInfo,
          sourceDevice: context.producer.producerName,
          sourceVersion: context.producer.version,
          renderMode: context.meta.renderMode,
          machineRoomId: room.id,
          machineRoomRole: room.shortLabel,
          handoffTarget: 'xensonarPerformance',
          transitionIntent: getTransitionGuidingSentence(),
          preferredMyzelGroup: context.meta.preferredMyzelGroup ?? handoffProfile.preferredMyzelGroup,
          workspaceOrigin: context.meta.workspaceOrigin,
          transitionGuard: context.meta.transitionGuard ?? handoffProfile.transitionGuard,
          balanceCarrier: context.meta.balanceCarrier ?? handoffProfile.balanceCarrier,
          routeSummary: context.meta.routeSummary ?? handoffProfile.routeSummary,
          stabilizeBy: context.meta.stabilizeBy ?? handoffProfile.stabilizeBy,
          notes: mergeBridgeNotes(context.producer.notes ?? 'Canonical forge bridge', describeMaterialRoleHandoff(context.meta.role), room.summary),
        },
        provenance: {
          ...pkg.provenance,
          parentId: context.producer.producerId,
        },
      };
    },
  });
}

ensureBuiltinAdapters();

export function getDefaultForgeAdapterId() {
  return DEFAULT_ADAPTER_ID;
}

export function listForgeMaterialAdapters() {
  ensureBuiltinAdapters();
  return adapterSnapshot;
}

export function getForgeMaterialAdapter(adapterId: string) {
  ensureBuiltinAdapters();
  const adapter = adapterRegistry.get(adapterId) ?? adapterRegistry.get(DEFAULT_ADAPTER_ID);
  if (!adapter) {
    throw new Error(`Forge material adapter registry is missing default adapter "${DEFAULT_ADAPTER_ID}".`);
  }
  return adapter;
}

export function registerForgeMaterialAdapter(adapter: ForgeMaterialAdapter) {
  ensureBuiltinAdapters();
  upsertAdapter(adapter);
  emit();
}

export function subscribeForgeMaterialAdapters(listener: () => void) {
  ensureBuiltinAdapters();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useForgeMaterialAdapters() {
  ensureBuiltinAdapters();
  return useSyncExternalStore(subscribeForgeMaterialAdapters, listForgeMaterialAdapters, listForgeMaterialAdapters);
}

export function buildForgeExportContext(meta: ExportedMaterialMeta, blob: Blob, producer: ForgeProducerDescriptor = LEGACY_SPECTRAL_FORGE_PRODUCER): ForgeExportContext {
  return { meta, blob, producer };
}

export function exportThroughForgeAdapter(adapterId: string, context: ForgeExportContext) {
  const adapter = getForgeMaterialAdapter(adapterId);
  return adapter.buildPackage(context);
}

export function createExampleExternalPackageFromContext(context: ForgeExportContext): XensonarMaterialPackageV1 {
  return createExampleExternalLoopPackage({
    name: `${context.meta.name}-external`,
    blob: context.blob,
    bpm: context.meta.bpm,
    bars: context.meta.bars,
    loopStartSec: context.meta.loopStartSec,
    loopEndSec: context.meta.loopEndSec,
    intendedLoopDurationSec: context.meta.intendedLoopDurationSec,
    segmentsPerBar: context.meta.guideSegments,
    markers16: context.meta.guideMarkers,
    sourceDevice: context.producer.producerName,
    sourceVersion: context.producer.version,
    renderMode: `${context.meta.renderMode}:external-probe`,
    rootHz: context.meta.rootHz,
  });
}
