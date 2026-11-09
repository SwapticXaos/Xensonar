import { composerTrackById, getLoopTimeGuides, type LoopComposerState } from './loopDrumDomain';
import { renderLoopComposerToWavBlob } from './loopPreview';
import { sanitizeName } from './spectralWorkspaceUtils';

export type MelodicLoopRenderPayload = {
  blob: Blob;
  durationSec: number;
  bars: number;
  guideMarkers: number[];
  fileName: string;
  safeName: string;
};

export type MelodicLoopMaterialSnapshot = {
  name: string;
  role: string;
  bpm: number;
};

export type MelodicLoopHandoffSnapshot = {
  preferredMyzelGroup: string;
  transitionGuard: string;
  balanceCarrier: string;
};

export async function buildMelodicLoopRenderPayload(args: {
  loopComposer: LoopComposerState;
  material: Pick<MelodicLoopMaterialSnapshot, 'name' | 'bpm'>;
}): Promise<MelodicLoopRenderPayload> {
  const { loopComposer, material } = args;
  const enabledTrackIds = loopComposer.activeTrackIds.filter((trackId) => composerTrackById(loopComposer, trackId)?.enabled);
  const trackIds = enabledTrackIds.length > 0
    ? enabledTrackIds
    : loopComposer.tracks.filter((track) => track.enabled).map((track) => track.id);
  if (trackIds.length === 0) throw new Error('Keine aktive Melodic-Loop-Spur zum Senden.');

  const blob = await renderLoopComposerToWavBlob({
    composer: loopComposer,
    bpm: material.bpm,
    bars: loopComposer.bars,
    trackIds,
  });

  const durationSec = Math.max(
    0.25,
    (Math.max(1, loopComposer.bars) * Math.max(1, loopComposer.beatsPerBar || 4) * 60) / Math.max(40, material.bpm),
  );
  const guideMarkers = getLoopTimeGuides(loopComposer)
    .filter((marker) => marker.kind === 'guide' && marker.repeatPerBar)
    .map((marker) => marker.beat / Math.max(1, loopComposer.beatsPerBar || 4));
  const safeName = sanitizeName(material.name || 'melodic-loop');

  return {
    blob,
    durationSec,
    bars: Math.max(1, loopComposer.bars),
    guideMarkers,
    fileName: `${safeName}.wav`,
    safeName,
  };
}

export function buildMelodicLoopXensonarMetadata(args: {
  material: MelodicLoopMaterialSnapshot;
  loopComposer: Pick<LoopComposerState, 'segmentCount' | 'baseHz'>;
  rendered: MelodicLoopRenderPayload;
  handoff: MelodicLoopHandoffSnapshot;
  referenceBpm: number;
}) {
  const { material, loopComposer, rendered, handoff, referenceBpm } = args;
  return {
    name: material.name,
    role: material.role,
    bpm: referenceBpm,
    bars: rendered.bars,
    guideSegments: Math.max(1, loopComposer.segmentCount),
    guideMarkers: rendered.guideMarkers,
    loopStartSec: 0,
    loopEndSec: rendered.durationSec,
    rootHz: Math.max(30, Math.min(1200, Number.isFinite(loopComposer.baseHz) ? loopComposer.baseHz : 220)),
    sourceVersion: 'loop-composer-v1',
    renderMode: 'microtonal-logic:loop-composer',
    durationSec: rendered.durationSec,
    intendedLoopDurationSec: rendered.durationSec,
    preferredMyzelGroup: handoff.preferredMyzelGroup,
    workspaceOrigin: 'microtonal-logic',
    transitionGuard: handoff.transitionGuard,
    balanceCarrier: handoff.balanceCarrier,
    routeSummary:
      'Melodic-Loop-Synth wird als eigener Microtonal-Logic-Loop nach Xensonar geschickt; die Materialspur erhält den gerenderten Loop und keine alten Forge-2-Glyph/Synesthetic-Renderpfade.',
    stabilizeBy:
      'Tuning-Linien und Timing-Guide des Melodic Loop werden vor dem Handoff direkt aus dem Loop-Composer gerendert.',
  };
}

export function buildMelodicLoopSyntheticForgeViewState(args: {
  materialName: string;
  rendered: Pick<MelodicLoopRenderPayload, 'bars' | 'safeName'>;
}) {
  const { materialName, rendered } = args;
  return {
    nextMaterialName: materialName || rendered.safeName,
    nextRole: 'loop' as const,
    nextBars: rendered.bars,
    nextSourceView: 'synesthetic' as const,
    nextSecondaryView: 'harmonic' as const,
    nextViewBlend: 0.26,
  };
}
