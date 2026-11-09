import { buildForgeExportContext, createExampleExternalPackageFromContext, exportThroughForgeAdapter } from '../forgeBridge';
import type { ForgeProducerDescriptor } from '../forgeBridge';
import type { CanonicalForgeWorkspace } from './sessionTypes';
import { buildTransferBlob, type DestructiveAudioProfile, type SynthMode, type TransferMode, type WarpAudioProfile, type WaveformMix } from './selectionAudioTransfer';
import type { SpectralData } from '../spectralForge/audio/SpectralData';
import type { ExportedMaterialMeta } from '../materialLibrary';
import type { AudioSourceAsset } from '../spectralForge/audio/AudioImporter';
import type { CanonicalSourceView } from './analysis';
import { hasPlayableSource } from './spectralWorkspaceUtils';

export function createCanonicalMaterialTransferController(args: {
  producer: ForgeProducerDescriptor | undefined;
  materialExport: {
    name: string;
    role: 'loop' | 'waveMaterial' | 'particleExciter' | 'droneTexture';
    adapterId: string;
    transferMode: TransferMode;
  };
  spectralData: SpectralData;
  synthMode: SynthMode;
  waveformMix: WaveformMix;
  rawSourceAsset: AudioSourceAsset | null;
  selectionStartSec: number;
  selectionDurationSec: number;
  sourceView: CanonicalSourceView;
  activeWorkspace: CanonicalForgeWorkspace;
  destructiveAudioProfile: DestructiveAudioProfile | null;
  warpAudioProfile: WarpAudioProfile | null;
  activeHandoffProfile: unknown;
  selectedAdapterName: string;
  invalidateAudioBuffer: () => void;
  registerExternalMaterialPackage: (pkg: unknown) => void;
  createTransferMetadata: (args: {
    materialExport: {
      name: string;
      role: 'loop' | 'waveMaterial' | 'particleExciter' | 'droneTexture';
      adapterId: string;
      transferMode: TransferMode;
    };
    transfer: Awaited<ReturnType<typeof buildTransferBlob>>;
    selectionDurationSec: number;
    activeWorkspace: CanonicalForgeWorkspace;
    activeHandoffProfile: unknown;
    effectiveTransferMode: TransferMode;
    stableId?: string;
    projectLabel?: string;
  }) => ExportedMaterialMeta;
  setBusy: (busy: boolean) => void;
  setStatus: (status: string) => void;
}) {
  async function buildTransfer(effectiveTransferMode: TransferMode) {
    args.invalidateAudioBuffer();
    return buildTransferBlob({
      transferMode: effectiveTransferMode,
      spectralData: args.spectralData,
      synthMode: args.synthMode,
      waveformMix: args.waveformMix,
      rawSourceAsset: args.rawSourceAsset,
      selectionStartSec: args.selectionStartSec,
      selectionDurationSec: args.selectionDurationSec,
      sourceView: args.sourceView,
      activeWorkspace: args.activeWorkspace,
      destructiveProfile: args.destructiveAudioProfile,
      warpProfile: args.warpAudioProfile,
    });
  }

  async function handleExport(transferModeOverride?: TransferMode) {
    const effectiveTransferMode = transferModeOverride ?? args.materialExport.transferMode;
    args.setBusy(true);
    args.setStatus(effectiveTransferMode === 'source-direct' ? 'Bereite Direktquelle für Xensonar vor ...' : 'Rendere SyntheticForge-Material ...');
    try {
      const transfer = await buildTransfer(effectiveTransferMode);
      const metadata = args.createTransferMetadata({
        materialExport: args.materialExport,
        transfer,
        selectionDurationSec: args.selectionDurationSec,
        activeWorkspace: args.activeWorkspace,
        activeHandoffProfile: args.activeHandoffProfile,
        effectiveTransferMode,
      });
      const pkg = exportThroughForgeAdapter(args.materialExport.adapterId, buildForgeExportContext(metadata, transfer.blob, args.producer));
      args.registerExternalMaterialPackage(pkg);
      args.setStatus(`${args.materialExport.role === 'loop' ? 'Loop' : 'Material'} an Xensonar über ${args.selectedAdapterName} gesendet${effectiveTransferMode === 'source-direct' ? ' (Direktquelle)' : ''}.`);
    } catch (error) {
      console.error(error);
      args.setStatus('Export fehlgeschlagen.');
    } finally {
      args.setBusy(false);
    }
  }

  async function handleProbe() {
    args.setBusy(true);
    args.setStatus(args.materialExport.transferMode === 'source-direct' ? 'Registriere externe Direktquellen-Probe ...' : 'Registriere externe Probe über dieselbe Brücke ...');
    try {
      const transfer = await buildTransfer(args.materialExport.transferMode);
      const metadata = args.createTransferMetadata({
        materialExport: { ...args.materialExport, name: `${args.materialExport.name}-probe` },
        transfer,
        selectionDurationSec: args.selectionDurationSec,
        activeWorkspace: args.activeWorkspace,
        activeHandoffProfile: args.activeHandoffProfile,
        effectiveTransferMode: args.materialExport.transferMode,
      });
      const context = buildForgeExportContext(metadata, transfer.blob, args.producer);
      args.registerExternalMaterialPackage(createExampleExternalPackageFromContext(context));
      args.setStatus(`Externe Probe registriert${args.materialExport.transferMode === 'source-direct' ? ' (Direktquelle)' : ''}. So kann später auch die App deines Kumpels andocken.`);
    } catch (error) {
      console.error(error);
      args.setStatus('Probe fehlgeschlagen.');
    } finally {
      args.setBusy(false);
    }
  }

  async function syncProjectMaterialToXensonar(projectId: string, projectLabel: string) {
    const effectiveTransferMode: TransferMode = args.rawSourceAsset && hasPlayableSource(args.rawSourceAsset)
      ? 'source-direct'
      : args.materialExport.transferMode;
    const transfer = await buildTransfer(effectiveTransferMode);
    const metadata = args.createTransferMetadata({
      materialExport: args.materialExport,
      transfer,
      selectionDurationSec: args.selectionDurationSec,
      activeWorkspace: args.activeWorkspace,
      activeHandoffProfile: args.activeHandoffProfile,
      effectiveTransferMode,
      stableId: `canonical-forge-project-${projectId}`,
      projectLabel,
    });
    const pkg = exportThroughForgeAdapter(args.materialExport.adapterId, buildForgeExportContext(metadata, transfer.blob, args.producer));
    args.registerExternalMaterialPackage(pkg);
  }

  return {
    handleExport,
    handleProbe,
    syncProjectMaterialToXensonar,
  };
}
