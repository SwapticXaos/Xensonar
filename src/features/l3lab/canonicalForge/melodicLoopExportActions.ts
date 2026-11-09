import { clearForgeAudioHandoff,queueForgeAudioHandoff } from '../forgeAudioHandoff';
import { buildForgeExportContext,exportThroughForgeAdapter } from '../forgeBridge';
import { registerExternalMaterialPackage } from '../materialLibrary';
import { prepareAudioSourceAsset,type AudioSourceAsset } from '../spectralForge/audio/AudioImporter';
import { clampBars } from '../spectralForge/state/storeMaterialExport';
import type { CanonicalSourceView } from './analysis';
import type { LoopComposerState } from './loopDrumDomain';
import { buildMelodicLoopRenderPayload,buildMelodicLoopSyntheticForgeViewState,buildMelodicLoopXensonarMetadata } from './melodicLoopTransferPrep';
import { buildSynthRootFollowEntryConfig } from './rootFollowSynthSnapshot';
import { dispatchXensonarEvent } from '../../xensonar/runtime/xensonarEventChannels';

type MaterialExportConfigLike = {
  name: string;
  role: string;
  adapterId: string;
  bpm: number;
  bars: number;
  rootFollowPreferred?: boolean;
};

type HandoffProfileLike = {
  preferredMyzelGroup: string;
  transitionGuard: string;
  balanceCarrier: string;
};


export async function getMelodicLoopRenderPayloadAction(args: {
  loopComposer: LoopComposerState;
  materialExport: MaterialExportConfigLike;
}) {
  return buildMelodicLoopRenderPayload({
    loopComposer: args.loopComposer,
    material: {
      name: args.materialExport.name,
      bpm: args.materialExport.bpm,
    },
  });
}

export async function exportMelodicLoopToXensonarAction(args: {
  loopComposer: LoopComposerState;
  materialExport: MaterialExportConfigLike;
  activeHandoffProfile: HandoffProfileLike;
  referenceBpm: number;
  selectedAdapterName: string;
  canonicalProducer: any;
  setStatus: (status: string) => void;
}) {
  clearForgeAudioHandoff('legacy');
  const rendered = await getMelodicLoopRenderPayloadAction(args);
  const metadata = buildMelodicLoopXensonarMetadata({
    material: {
      name: args.materialExport.name,
      role: args.materialExport.role,
      bpm: args.materialExport.bpm,
    },
    loopComposer: args.loopComposer,
    rendered,
    handoff: args.activeHandoffProfile,
    referenceBpm: args.referenceBpm,
  });
  const pkg = exportThroughForgeAdapter(args.materialExport.adapterId, buildForgeExportContext(metadata as any, rendered.blob, args.canonicalProducer));
  const entry = registerExternalMaterialPackage(pkg);
  if (args.materialExport.rootFollowPreferred) {
    dispatchXensonarEvent('rootFollowBankMembership', {
      entryId: entry.id,
      enabled: true,
      config: buildSynthRootFollowEntryConfig({ loopComposer: args.loopComposer }),
    });
  }
  args.setStatus(args.materialExport.rootFollowPreferred
    ? `Melodic Loop an Xensonar über ${args.selectedAdapterName} gesendet · als Root-Follow-Loop markiert.`
    : `Melodic Loop an Xensonar über ${args.selectedAdapterName} gesendet.`);
}

export async function exportMelodicLoopToForge1Action(args: {
  loopComposer: LoopComposerState;
  materialExport: MaterialExportConfigLike;
  onRequestModeChange?: ((mode: any) => void) | undefined;
  setStatus: (status: string) => void;
}) {
  const rendered = await getMelodicLoopRenderPayloadAction(args);
  queueForgeAudioHandoff({
    target: 'legacy',
    name: args.materialExport.name || rendered.safeName,
    fileName: rendered.fileName,
    blob: rendered.blob,
    bars: rendered.bars,
    bpm: Math.max(40, args.materialExport.bpm),
    role: 'loop',
    origin: 'melodic-loop',
  });
  args.onRequestModeChange?.('experimental');
  args.setStatus('Melodic Loop an SpectralForge übergeben.');
}

export async function exportMelodicLoopToForge2Action(args: {
  loopComposer: LoopComposerState;
  materialExport: MaterialExportConfigLike;
  stopAllForge2Preview: (status?: string) => void;
  setPendingImageImport: (value: any) => void;
  setRawSourceAsset: (value: AudioSourceAsset) => void;
  setSelectionStartSec: (value: number) => void;
  setSelectionDurationSec: (value: number) => void;
  setMaterialExport: (updater: (state: MaterialExportConfigLike) => MaterialExportConfigLike) => void;
  setLastAutoCorrect: (value: any) => void;
  setSourceView: (value: CanonicalSourceView) => void;
  setSecondaryView: (value: CanonicalSourceView) => void;
  setViewBlend: (value: number) => void;
  applySelection: (source: AudioSourceAsset, startSec: number, durationSec: number, status?: string, options?: { preserveDetailSelection?: boolean; resetDetailViewport?: boolean }) => Promise<void>;
  setActiveWorkspace: (value: any) => void;
  setStatus: (status: string) => void;
}) {
  const rendered = await getMelodicLoopRenderPayloadAction(args);
  args.stopAllForge2Preview('Melodic Loop wird in die Wave-/Material-Fläche überführt ...');
  const file = new File([rendered.blob], rendered.fileName, { type: rendered.blob.type || 'audio/wav' });
  const prepared = await prepareAudioSourceAsset(file, (progress) => args.setStatus(`Quelle dekodieren ${(progress * 100).toFixed(0)}%`));
  const defaultDuration = Math.min(Math.max(1, prepared.importDurationSec), prepared.originalDuration);
  args.setPendingImageImport(null);
  args.setRawSourceAsset(prepared);
  args.setSelectionStartSec(0);
  args.setSelectionDurationSec(defaultDuration);
  const nextForgeState = buildMelodicLoopSyntheticForgeViewState({
    materialName: args.materialExport.name,
    rendered,
  });
  args.setMaterialExport((state) => ({
    ...state,
    name: nextForgeState.nextMaterialName,
    role: nextForgeState.nextRole,
    bars: clampBars(nextForgeState.nextBars),
  }));
  args.setLastAutoCorrect(null);
  args.setSourceView(nextForgeState.nextSourceView);
  args.setSecondaryView(nextForgeState.nextSecondaryView);
  args.setViewBlend(nextForgeState.nextViewBlend);
  await args.applySelection(prepared, 0, defaultDuration);
  args.setActiveWorkspace('wave-material');
  args.setStatus('Melodic Loop liegt jetzt in SyntheticForge bereit.');
}
