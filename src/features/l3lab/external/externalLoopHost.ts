import { createExampleExternalLoopPackage } from '../adapters/exampleExternalLoopAdapter';
import { registerExternalMaterialPackage, type MaterialEntry } from '../materialLibrary';
import { buildMachineRoomHandoffProfile } from '../../xensonar/architecture/machineRooms';
import { sanitizeExternalBars, sanitizeExternalGuideSegments, type ExternalLoopOffer } from './externalLoopContract';

export type { ExternalLoopOffer } from './externalLoopContract';

export function acceptExternalLoopOffer(offer: ExternalLoopOffer): MaterialEntry {
  const durationSec = Math.max(0.001, Number.isFinite(offer.durationSec) ? offer.durationSec : 0);
  const bars = sanitizeExternalBars(offer.bars);
  const handoffProfile = buildMachineRoomHandoffProfile({
    role: 'loop',
    workspaceOrigin: (offer.workspaceOrigin as 'external' | 'legacy-forge' | 'forge-workshop' | 'wave-material' | 'microtonal-logic' | undefined) ?? 'external',
  });
  const pkg = createExampleExternalLoopPackage({
    name: offer.name,
    blob: offer.blob,
    bpm: offer.bpm,
    bars,
    loopStartSec: Math.max(0, offer.loopStartSec ?? 0),
    loopEndSec: Math.max(0, offer.loopEndSec ?? durationSec),
    intendedLoopDurationSec: durationSec,
    segmentsPerBar: sanitizeExternalGuideSegments(offer.guideSegments),
    markers16: Array.isArray(offer.guideMarkers) ? offer.guideMarkers.slice() : undefined,
    sourceDevice: offer.sourceDevice ?? 'ExternalLoopHost',
    sourceVersion: offer.sourceVersion ?? 'phase-a',
    renderMode: offer.renderMode ?? 'external-loop-offer',
    rootHz: offer.rootHz ?? null,
    notes: offer.notes,
    preferredMyzelGroup: offer.preferredMyzelGroup ?? handoffProfile.preferredMyzelGroup,
    workspaceOrigin: offer.workspaceOrigin ?? handoffProfile.workspaceOrigin,
    transitionGuard: offer.transitionGuard ?? handoffProfile.transitionGuard,
    balanceCarrier: offer.balanceCarrier ?? handoffProfile.balanceCarrier,
    routeSummary: offer.routeSummary ?? handoffProfile.routeSummary,
    stabilizeBy: offer.stabilizeBy ?? handoffProfile.stabilizeBy,
  });
  return registerExternalMaterialPackage(pkg);
}
