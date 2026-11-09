import { audioEngine } from "../audio/AudioEngine";
import { recordCarrierIntegralTransferDescriptorShadowReport } from "./carrierIntegralTransferDebugBoundary";
import { buildSpectralDataFromProjectSnapshot } from "./carrierIntegralSnapshotSpectralData";
import {
  buildCarrierIntegralRootFollowArtifact,
} from "./carrierIntegralAudition";
import type { CarrierIntegralRootFollowBuildArtifact } from "./carrierIntegralRootFollowBuildArtifact";
import {
  analyzeAudioBufferPeak,
  renderCarrierIntegralConfigToAudioBuffer,
} from "./carrierIntegralRenderedMaterial";
import {
  normalizeCarrierIntegralHarmonicXploreSelection,
  migrateLegacySynthLabPresetToHarmonicXploreSelection,
  type CarrierIntegralHarmonicXploreSelection,
} from "./carrierIntegralHarmonicXploreRenderConfig";
import {
  renderCarrierIntegralHarmonicXploreDirectPreviewBuffer,
  resolveCarrierIntegralHarmonicXploreDirectSynthLab,
} from "./carrierIntegralHarmonicXploreDirectEngine";
import { renderCarrierIntegralSpektralSynthesePreviewBuffer } from "./carrierIntegralSpektralSyntheseEngine";
import {
  getCachedMaterialBodyPreviewBuffer,
  storeCachedMaterialBodyPreviewBuffer,
} from "./materialBodyPreviewCache";
import {
  buildCarrierLoopBodyAudioPaintImportDetail,
  type CarrierLoopBodyTransferExecutionPlan,
} from "./carrierLoopBodyTransferExecutionPlan";
import type { CarrierIntegralTransferPlan } from "./carrierIntegralSendTargets";
import { encodeAudioBufferToWav } from "../../canonicalForge/selectionAudioTransfer";
import { carrierIntegralHash31 } from "./carrierIntegralStableIdentity";
import {
  serializeCarrierIntegralAudioPaintImportDetail,
  storeCarrierIntegralAudioPaintImportDetail,
} from "../../canonicalForge/materialImportChannel";
import type { CarrierIntegralPinkExportDetail } from "../../contracts/carrierIntegralPinkExportContract";
import {
  CARRIER_INTEGRAL_PENDING_PINK_MELODIC_SESSION_KEY,
  CARRIER_INTEGRAL_PENDING_RAW_MATERIAL_MELODIC_SESSION_KEY,
} from "../../contracts/carrierIntegralMelodicHandoffContract";
import {
  registerMaterialExport,
  type MaterialEntry,
} from "../../materialLibrary";
import type { RootFollowBankEntryConfig } from "../../../xensonar/rootFollow/rootFollowTypes";
import { dispatchXensonarEvent } from "../../../xensonar/runtime/xensonarEventChannels";
import type { CarrierIntegralTransferExecutionRequest } from "./carrierIntegralTransferExecutionTypes";

const PENDING_RAW_CARRIER_TO_MELODIC_KEY =
  CARRIER_INTEGRAL_PENDING_RAW_MATERIAL_MELODIC_SESSION_KEY;
const PENDING_CARRIER_PINK_TO_MELODIC_KEY =
  CARRIER_INTEGRAL_PENDING_PINK_MELODIC_SESSION_KEY;

type CarrierIntegralTransferSpectralData = ReturnType<typeof buildSpectralDataFromProjectSnapshot>;
type CarrierIntegralRenderedStats = ReturnType<typeof analyzeAudioBufferPeak>;

export type CarrierIntegralTransferExecutionContext = {
  executionPlan: CarrierLoopBodyTransferExecutionPlan;
  activeHarmonicXplore: CarrierIntegralHarmonicXploreSelection;
  artifact: CarrierIntegralRootFollowBuildArtifact;
  spectralData: CarrierIntegralTransferSpectralData;
};

export type CarrierIntegralRenderedTransferBody = {
  renderedBuffer: AudioBuffer;
  renderedStats: CarrierIntegralRenderedStats;
  renderedBlob: Blob;
  renderedDurationSec: number;
  audioIdentityKey: string;
  audioIdentitySource: string;
};

type CarrierIntegralTransferBufferArtifact = {
  buffer: AudioBuffer;
  audioIdentityKey: string;
  audioIdentitySource: string;
};

export type CarrierIntegralRegisteredTransferMaterial = {
  materialEntry: MaterialEntry;
  audioPaintImportDetail: CarrierIntegralPinkExportDetail;
};

export function resolveCarrierIntegralTransferExecutionContext(
  args: CarrierIntegralTransferExecutionRequest,
  executionPlan: CarrierLoopBodyTransferExecutionPlan,
): CarrierIntegralTransferExecutionContext {
  const activeHarmonicXplore = args.valueSource === "right-override"
    ? normalizeCarrierIntegralHarmonicXploreSelection(
        args.harmonicXploreOverride ?? args.currentHarmonicXplore,
        args.currentHarmonicXplore,
      )
    : normalizeCarrierIntegralHarmonicXploreSelection(
        args.storedHarmonicXplore ?? args.snapshot.carrierIntegralHarmonicXplore ?? null,
        migrateLegacySynthLabPresetToHarmonicXploreSelection(
          args.storedSynthLab ?? args.snapshot.carrierIntegralSynthLab ?? null,
          args.currentHarmonicXplore,
        ),
      );

  const artifact = buildCarrierIntegralRootFollowArtifact({
    projectName: args.entry.name,
    snapshot: args.snapshot,
    machineId: args.machineId,
    maxPreviewDurationSec: 6,
    previewPitchSemitones: args.previewPitchSemitones,
    previewGain: executionPlan.previewGain,
    previewBpm: args.previewBpm,
    valueSource: args.valueSource,
    selectionOverride: args.selectionOverride,
    synthLabOverride: args.synthLabOverride,
    harmonicXploreOverride: activeHarmonicXplore,
  });

  const spectralData = buildSpectralDataFromProjectSnapshot(args.snapshot, {
    widthMode: "legacy-fixed-width",
  });

  recordCarrierIntegralTransferDescriptorShadowReport({
    spectralData,
    projectName: args.entry.name,
    machineId: args.machineId,
    targetId: args.targetId,
    targetLabel: args.targetLabel,
    renderSource: executionPlan.transferPlan.renderSource,
    melodicHandoffKind: executionPlan.transferPlan.melodicHandoffKind,
  });

  return {
    executionPlan,
    activeHarmonicXplore,
    artifact,
    spectralData,
  };
}

export async function renderCarrierIntegralTransferBody(
  args: CarrierIntegralTransferExecutionRequest,
  context: CarrierIntegralTransferExecutionContext,
): Promise<CarrierIntegralRenderedTransferBody> {
  const { executionPlan } = context;
  const {
    materialBodyPreviewCacheKey,
    transferPlan,
  } = executionPlan;

  const shouldBypassMaterialCache = args.machineId === "harmonic-xplore-direct-carrier"
    || args.machineId === "spektral-synthese-body";
  const cachedBuffer = shouldBypassMaterialCache
    ? null
    : getCachedMaterialBodyPreviewBuffer(materialBodyPreviewCacheKey);

  const renderedArtifact: CarrierIntegralTransferBufferArtifact = cachedBuffer
    ? {
        buffer: cachedBuffer,
        audioIdentityKey: carrierIntegralHash31([
          'carrier-integral-transfer-audio-identity-v1',
          'material-body-cache',
          materialBodyPreviewCacheKey ?? 'no-material-cache-key',
          transferPlan.renderSource,
          args.machineId,
          args.targetId,
        ].join('|')),
        audioIdentitySource: 'material-body-cache',
      }
    : await renderCarrierIntegralTransferBufferArtifactWithoutCache(args, context);

  const renderedBuffer = renderedArtifact.buffer;
  if (!cachedBuffer && !shouldBypassMaterialCache) {
    storeCachedMaterialBodyPreviewBuffer(materialBodyPreviewCacheKey, renderedBuffer);
  }

  const renderedStats = analyzeAudioBufferPeak(renderedBuffer);
  assertCarrierIntegralRenderedBodyIsUsable({
    machineLabel: executionPlan.machineLabel,
    transferPlan,
    renderedStats,
  });

  const renderedBlob = encodeAudioBufferToWav(renderedBuffer);
  assertCarrierIntegralRenderedBlobIsUsable({
    machineLabel: executionPlan.machineLabel,
    transferPlan,
    renderedBlob,
  });

  return {
    renderedBuffer,
    renderedStats,
    renderedBlob,
    renderedDurationSec: Math.max(
      0.25,
      renderedBuffer.length / Math.max(1, renderedBuffer.sampleRate),
    ),
    audioIdentityKey: renderedArtifact.audioIdentityKey,
    audioIdentitySource: renderedArtifact.audioIdentitySource,
  };
}

async function renderCarrierIntegralTransferBufferArtifactWithoutCache(
  args: CarrierIntegralTransferExecutionRequest,
  context: CarrierIntegralTransferExecutionContext,
): Promise<CarrierIntegralTransferBufferArtifact> {
  const {
    artifact,
    executionPlan,
    spectralData,
  } = context;
  const {
    durationSec,
    transferPlan,
  } = executionPlan;

  switch (transferPlan.renderSource) {
    case "raw-spectral-buffer":
      if (args.machineId === "harmonic-xplore-direct-carrier") {
        return renderHarmonicXploreLastHeardRawMaterialArtifact(context);
      }
      if (args.machineId === "spektral-synthese-body") {
        return renderSpektralSyntheseLastHeardRawMaterialArtifact(context);
      }
      return wrapCarrierIntegralTransferBufferArtifact(
        audioEngine.renderToBuffer(
          spectralData,
          args.snapshot.synthMode,
          args.snapshot.waveformMix,
        ),
        args,
        context,
        'audio-engine-fallback',
      );
    case "root-follow-config-buffer":
      if (args.machineId === "harmonic-xplore-direct-carrier") {
        return renderHarmonicXploreLastHeardRawMaterialArtifact(context);
      }
      if (args.machineId === "spektral-synthese-body") {
        return renderSpektralSyntheseLastHeardRawMaterialArtifact(context);
      }
      if (artifact.config) {
        return wrapCarrierIntegralTransferBufferArtifact(
          renderCarrierIntegralConfigToAudioBuffer({
            config: artifact.config,
            durationSec,
            bpm: args.previewBpm,
          }),
          args,
          context,
          'root-follow-config-buffer',
        );
      }
      return wrapCarrierIntegralTransferBufferArtifact(
        audioEngine.renderToBuffer(
          spectralData,
          args.snapshot.synthMode,
          args.snapshot.waveformMix,
        ),
        args,
        context,
        'audio-engine-fallback',
      );
    default:
      return wrapCarrierIntegralTransferBufferArtifact(
        audioEngine.renderToBuffer(
          spectralData,
          args.snapshot.synthMode,
          args.snapshot.waveformMix,
        ),
        args,
        context,
        'audio-engine-fallback',
      );
  }
}


function buildCarrierIntegralFallbackTransferAudioIdentity(args: {
  request: CarrierIntegralTransferExecutionRequest;
  context: CarrierIntegralTransferExecutionContext;
  source: string;
}): string {
  return carrierIntegralHash31([
    'carrier-integral-transfer-audio-identity-v1',
    args.source,
    args.request.machineId,
    args.request.targetId,
    args.context.executionPlan.transferPlan.renderSource,
    args.context.executionPlan.durationSec,
    args.request.previewBpm,
    args.request.previewPitchSemitones,
    args.context.executionPlan.sourceBars,
  ].join('|'));
}

async function wrapCarrierIntegralTransferBufferArtifact(
  buffer: AudioBuffer | Promise<AudioBuffer>,
  request: CarrierIntegralTransferExecutionRequest,
  context: CarrierIntegralTransferExecutionContext,
  source: string,
): Promise<CarrierIntegralTransferBufferArtifact> {
  return {
    buffer: await buffer,
    audioIdentityKey: buildCarrierIntegralFallbackTransferAudioIdentity({ request, context, source }),
    audioIdentitySource: source,
  };
}

async function renderHarmonicXploreLastHeardRawMaterialArtifact(
  context: CarrierIntegralTransferExecutionContext,
): Promise<CarrierIntegralTransferBufferArtifact> {
  const {
    activeHarmonicXplore,
    artifact,
    executionPlan,
    spectralData,
  } = context;
  const { activeSynthLab, durationSec, previewGain } = executionPlan;
  const rendered = await renderCarrierIntegralHarmonicXploreDirectPreviewBuffer({
    spectralData,
    synthLab: resolveCarrierIntegralHarmonicXploreDirectSynthLab(activeSynthLab),
    harmonicXplore: activeHarmonicXplore,
    durationSec,
    previewDurationSec: durationSec,
    rootHz: artifact.baseHz ?? 110,
    gain: previewGain,
  });
  return {
    buffer: rendered.buffer,
    audioIdentityKey: rendered.summary.directEngineKey,
    audioIdentitySource: 'harmonic-xplore-direct-summary',
  };
}

async function renderSpektralSyntheseLastHeardRawMaterialArtifact(
  context: CarrierIntegralTransferExecutionContext,
): Promise<CarrierIntegralTransferBufferArtifact> {
  const {
    activeHarmonicXplore,
    artifact,
    executionPlan,
    spectralData,
  } = context;
  const { activeSynthLab, durationSec, previewGain } = executionPlan;
  const rendered = await renderCarrierIntegralSpektralSynthesePreviewBuffer({
    spectralData,
    synthLab: resolveCarrierIntegralHarmonicXploreDirectSynthLab(activeSynthLab),
    harmonicXplore: activeHarmonicXplore,
    durationSec,
    previewDurationSec: durationSec,
    rootHz: artifact.baseHz ?? 110,
    gain: previewGain,
  });
  return {
    buffer: rendered.buffer,
    audioIdentityKey: rendered.summary.directEngineKey,
    audioIdentitySource: 'spektral-synthese-summary',
  };
}

function assertCarrierIntegralRenderedBodyIsUsable(args: {
  machineLabel: string;
  transferPlan: CarrierIntegralTransferPlan;
  renderedStats: CarrierIntegralRenderedStats;
}) {
  if (
    args.transferPlan.requiresAudibleRenderedBody &&
    args.renderedStats.peak <= 0.0005
  ) {
    throw new Error(
      `${args.machineLabel} erzeugte keinen hörbaren Materialkörper; Materialspur-Eintrag wurde nicht angelegt.`,
    );
  }
}

function assertCarrierIntegralRenderedBlobIsUsable(args: {
  machineLabel: string;
  transferPlan: CarrierIntegralTransferPlan;
  renderedBlob: Blob;
}) {
  if (
    args.transferPlan.requiresAudibleRenderedBody &&
    typeof args.renderedBlob.size === "number" &&
    args.renderedBlob.size <= 44
  ) {
    throw new Error(
      `${args.machineLabel} erzeugte keinen gültigen WAV-Körper; Materialspur-Eintrag wurde nicht angelegt.`,
    );
  }
}

export function registerCarrierIntegralTransferMaterial(
  args: CarrierIntegralTransferExecutionRequest,
  context: CarrierIntegralTransferExecutionContext,
  renderedBody: CarrierIntegralRenderedTransferBody,
): CarrierIntegralRegisteredTransferMaterial {
  const {
    artifact,
    executionPlan,
  } = context;
  const {
    durationSec,
    machineLabel,
    materialEntryStableId,
    sourceBars,
    targetName,
    transferPlan,
  } = executionPlan;

  const audioPaintImportDetail = buildCarrierLoopBodyAudioPaintImportDetail({
    materialEntryStableId,
    targetName,
    entryId: args.entry.id,
    machineId: args.machineId,
    machineLabel,
    sourceBars,
    previewBpm: args.previewBpm,
    durationSec,
    targetId: args.targetId,
    transferPlan,
    artifact,
    renderAudioIdentityKey: renderedBody.audioIdentityKey,
    renderAudioIdentitySource: renderedBody.audioIdentitySource,
  });

  const materialEntry = registerMaterialExport(
    {
      name: targetName,
      role: "loop",
      bpm: args.previewBpm,
      bars: sourceBars,
      guideSegments: args.snapshot.materialExport.guideSegments,
      guideMarkers: args.snapshot.materialExport.guideMarkers,
      loopStartSec: 0,
      loopEndSec: Math.min(renderedBody.renderedDurationSec, durationSec),
      rootHz: artifact.baseHz,
      sourceVersion: transferPlan.sourceVersion,
      renderMode: `${transferPlan.renderModePrefix}-${args.targetId}`,
      durationSec: renderedBody.renderedDurationSec,
      intendedLoopDurationSec: durationSec,
      stableId: materialEntryStableId,
      workspaceOrigin: transferPlan.workspaceOrigin,
      routeSummary: transferPlan.summary,
      rootFollowPreferred: args.targetId === "root-follow-export",
      audioPaintImportDetailJson: transferPlan.usesAudioPaintImportDetail
        ? serializeCarrierIntegralAudioPaintImportDetail(audioPaintImportDetail)
        : undefined,
      audioIdentityKey: renderedBody.audioIdentityKey,
      audioIdentitySource: renderedBody.audioIdentitySource,
    },
    renderedBody.renderedBlob,
  );

  return {
    materialEntry,
    audioPaintImportDetail,
  };
}

export function dispatchCarrierIntegralTransferSideEffects(
  args: CarrierIntegralTransferExecutionRequest,
  context: CarrierIntegralTransferExecutionContext,
  registeredMaterial: CarrierIntegralRegisteredTransferMaterial,
) {
  const { artifact, executionPlan } = context;
  const { transferPlan } = executionPlan;

  if (transferPlan.usesAudioPaintImportDetail) {
    storeCarrierIntegralAudioPaintImportDetail(registeredMaterial.audioPaintImportDetail);
  }
  if (args.targetId === "root-follow-export") {
    dispatchRootFollowMembership({
      materialEntryId: registeredMaterial.materialEntry.id,
      transferPlan,
      rootFollowConfig: artifact.config,
    });
  }
  if (args.targetId === "melodic-pink-export") {
    dispatchMelodicHandoff({
      materialEntry: registeredMaterial.materialEntry,
      transferPlan,
      audioPaintImportDetail: registeredMaterial.audioPaintImportDetail,
      baseHz: artifact.baseHz,
      machineId: args.machineId,
    });
  }
}

function buildFallbackMaterialFlowingRootFollowConfig(): RootFollowBankEntryConfig {
  return {
    sourceKind: "material",
    renderMode: "flowing",
    anchorGridStep: null,
    synthPattern: null,
    synthPatch: null,
    formantWindowPlan: null,
  };
}

function dispatchRootFollowMembership(args: {
  materialEntryId: string;
  transferPlan: CarrierIntegralTransferPlan;
  rootFollowConfig: RootFollowBankEntryConfig | null;
}) {
  if (typeof window === "undefined") return;
  if (args.transferPlan.rootFollowMembershipConfig === "none") return;
  dispatchXensonarEvent("rootFollowBankMembership", {
    entryId: args.materialEntryId,
    enabled: true,
    activate: true,
    config:
      args.transferPlan.rootFollowMembershipConfig === "material-flowing"
        ? buildFallbackMaterialFlowingRootFollowConfig()
        : args.transferPlan.rootFollowMembershipConfig === "artifact-config"
          ? (args.rootFollowConfig ?? null)
          : null,
  });
}

function dispatchMelodicHandoff(args: {
  materialEntry: MaterialEntry;
  transferPlan: CarrierIntegralTransferPlan;
  audioPaintImportDetail: CarrierIntegralPinkExportDetail;
  baseHz: number | null;
  machineId: string;
}) {
  if (typeof window === "undefined") return;
  if (args.transferPlan.melodicHandoffKind === "raw-material") {
    const detail = {
      entryId: args.materialEntry.id,
      rootHz: args.baseHz ?? 55,
      machineId: args.machineId,
      granular: true,
    };
    try {
      if (args.transferPlan.clearsAudioPaintPendingHandoff) {
        window.sessionStorage.removeItem(PENDING_CARRIER_PINK_TO_MELODIC_KEY);
      }
      window.sessionStorage.setItem(
        PENDING_RAW_CARRIER_TO_MELODIC_KEY,
        JSON.stringify(detail),
      );
    } catch {}
    dispatchXensonarEvent("carrierIntegralRawMaterialMelodicExport", detail);
  } else if (args.transferPlan.melodicHandoffKind === "audio-paint-field") {
    try {
      if (args.transferPlan.clearsRawMaterialPendingHandoff) {
        window.sessionStorage.removeItem(PENDING_RAW_CARRIER_TO_MELODIC_KEY);
      }
    } catch {}
    dispatchXensonarEvent("carrierIntegralMelodicPinkExport", args.audioPaintImportDetail);
  }
  dispatchXensonarEvent("openCanonicalMelodicLoop", {
    reason:
      args.transferPlan.melodicHandoffKind === "raw-material"
        ? "carrier-integral-raw-material-export"
        : "carrier-integral-pink-export",
    entryId: args.materialEntry.id,
  });
}
