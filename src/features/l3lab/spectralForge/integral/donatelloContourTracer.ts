import type { CarrierAnchor, CarrierSpectralSkeleton } from '../types/carrierDonorV2Types';
import type { DonatelloBandRole } from './donatelloFormantTypes';
import { DONATELLO_FORMANT_PLAN_DEFAULT_MAX_BANDS, DONATELLO_FORMANT_PLAN_DEFAULT_RESOLUTION } from './donatelloFormantDefaults';
import { clampNumber, makeFilledCurve } from '../../../../core/math/curveMath';

export type DonatelloContourCandidate = {
  id: string;
  sliceIndex: number;
  timeIndex: number;
  centerBin: number;
  centerHz: number;
  widthBins: number;
  widthHz: number;
  energy: number;
  sharpness: number;
  regime: CarrierAnchor['regime'];
};

export type DonatelloContourPoint = {
  sliceIndex: number;
  centerBin: number;
  centerHz: number;
  widthBins: number;
  widthHz: number;
  energy: number;
  confidence: number;
  roughness: number;
  sharedCrossing: boolean;
};

export type DonatelloContourDirection = 'ascending' | 'descending' | 'flat';

export type DonatelloContourTrack = {
  id: string;
  role: DonatelloBandRole;
  points: DonatelloContourPoint[];
  startSlice: number;
  endSlice: number;
  meanEnergy: number;
  meanWidthBins: number;
  meanSharpness: number;
  meanConfidence: number;
  slopeBinsPerSlice: number;
  direction: DonatelloContourDirection;
  crossingHintCount: number;
};

export type DonatelloContourTraceSummary = {
  candidateCount: number;
  trackCount: number;
  activeCrossingCount: number;
  opposingTrackPairCount: number;
  capturedLineEnergy: number;
  residualEnergy: number;
  transientEnergy: number;
  roughnessEnergy: number;
  maxResidualSlice: number;
  maxRoughnessSlice: number;
  maxTransientDustSlice: number;
  meanTrackSpan: number;
  meanTrackConfidence: number;
  maxTracks: number;
  curveResolution: number;
};

export type DonatelloContourTraceResult = {
  schemaVersion: 'donatello-contour-trace-v1';
  curveResolution: number;
  maxTracks: number;
  tracks: DonatelloContourTrack[];
  roughnessCurve: number[];
  transientDustCurve: number[];
  residualEnergyCurve: number[];
  summary: DonatelloContourTraceSummary;
};

export type DonatelloContourTraceOptions = {
  curveResolution?: number;
  maxTracks?: number;
  minEnergy?: number;
  maxMissingSlices?: number;
};

type MutableTrack = {
  id: string;
  role: DonatelloBandRole;
  points: DonatelloContourPoint[];
  lastSlice: number;
  lastBin: number;
  momentumBinsPerSlice: number;
  missingSlices: number;
  crossingHintCount: number;
};

function resolveTimeIndex(skeleton: CarrierSpectralSkeleton, sliceIndex: number, curveResolution: number) {
  const ratio = sliceIndex / Math.max(1, curveResolution - 1);
  return Math.max(0, Math.min(skeleton.width - 1, Math.round(ratio * Math.max(0, skeleton.width - 1))));
}

function candidateRole(candidate: DonatelloContourCandidate): DonatelloBandRole {
  if (candidate.regime === 'transient') return 'transient-dust';
  if (candidate.regime === 'noise') return 'residual-band';
  if (candidate.regime === 'cluster') return candidate.widthBins >= 9 || candidate.sharpness < 0.34 ? 'body-band' : 'surface-band';
  return candidate.widthBins >= 7 ? 'surface-band' : 'core-line';
}

function anchorSharpness(anchor: CarrierAnchor) {
  const ridge = clampNumber(anchor.ridgeness * 4.8, 0, 1);
  const widthPenalty = clampNumber(anchor.bandwidthBins / 14, 0, 0.8);
  return clampNumber(ridge * (1 - widthPenalty * 0.55), 0, 1);
}

function candidatePriority(candidate: DonatelloContourCandidate) {
  const regimeBoost = candidate.regime === 'tonal' ? 1.25 : candidate.regime === 'cluster' ? 0.72 : candidate.regime === 'transient' ? 0.38 : 0.18;
  return Math.max(0, candidate.energy) * (0.25 + candidate.sharpness * 1.85) * regimeBoost;
}

function selectCandidates(
  skeleton: CarrierSpectralSkeleton,
  sliceIndex: number,
  curveResolution: number,
  minEnergy: number,
): DonatelloContourCandidate[] {
  const timeIndex = resolveTimeIndex(skeleton, sliceIndex, curveResolution);
  const indices = [timeIndex - 1, timeIndex, timeIndex + 1].filter((index) => index >= 0 && index < skeleton.width);
  const byId = new Map<string, CarrierAnchor>();
  for (const index of indices) {
    for (const anchor of skeleton.anchorsByTime[index] ?? []) {
      if (anchor.energy < minEnergy * 0.55) continue;
      const existing = byId.get(anchor.id);
      if (!existing || anchor.energy > existing.energy) byId.set(anchor.id, anchor);
    }
  }
  return [...byId.values()]
    .map((anchor) => ({
      id: anchor.id,
      sliceIndex,
      timeIndex: anchor.timeIndex,
      centerBin: anchor.centerBin,
      centerHz: anchor.centerHz,
      widthBins: Math.max(1, anchor.bandwidthBins),
      widthHz: Math.max(1, anchor.bandwidthHz),
      energy: clampNumber(anchor.energy, 0, 1),
      sharpness: anchorSharpness(anchor),
      regime: anchor.regime,
    }))
    .sort((a, b) => candidatePriority(b) - candidatePriority(a));
}

function pointFromCandidate(
  candidate: DonatelloContourCandidate,
  confidence: number,
  sharedCrossing: boolean,
): DonatelloContourPoint {
  return {
    sliceIndex: candidate.sliceIndex,
    centerBin: candidate.centerBin,
    centerHz: candidate.centerHz,
    widthBins: candidate.widthBins,
    widthHz: candidate.widthHz,
    energy: candidate.energy,
    confidence: clampNumber(confidence, 0, 1),
    roughness: clampNumber((1 - candidate.sharpness) * 0.55 + Math.max(0, candidate.widthBins - 6) * 0.025, 0, 1),
    sharedCrossing,
  };
}

function createTrack(candidate: DonatelloContourCandidate, index: number): MutableTrack {
  const role = candidateRole(candidate);
  return {
    id: `donatello-contour-track-${index + 1}`,
    role: role === 'residual-band' || role === 'transient-dust' ? 'surface-band' : role,
    points: [pointFromCandidate(candidate, candidatePriority(candidate), false)],
    lastSlice: candidate.sliceIndex,
    lastBin: candidate.centerBin,
    momentumBinsPerSlice: 0,
    missingSlices: 0,
    crossingHintCount: 0,
  };
}

function trackScore(track: MutableTrack, candidate: DonatelloContourCandidate, skeletonHeight: number) {
  const missing = Math.max(0, candidate.sliceIndex - track.lastSlice - 1);
  const prediction = track.lastBin + track.momentumBinsPerSlice * Math.max(1, candidate.sliceIndex - track.lastSlice);
  const distanceNorm = Math.abs(candidate.centerBin - prediction) / Math.max(4, skeletonHeight * 0.22);
  const directDistance = Math.abs(candidate.centerBin - track.lastBin) / Math.max(4, skeletonHeight * 0.28);
  const candidateSharpness = candidate.sharpness;
  const inertiaBonus = clampNumber(1 - Math.abs(candidate.centerBin - prediction) / Math.max(2, candidate.widthBins * 2.4 + 2), 0, 1) * 0.58;
  const energyTerm = Math.sqrt(Math.max(0, candidate.energy)) * 0.72;
  const sharpnessTerm = candidateSharpness * 0.42;
  const continuityPenalty = missing * 0.22;
  return energyTerm + sharpnessTerm + inertiaBonus - distanceNorm * 0.85 - directDistance * 0.22 - continuityPenalty;
}

function updateTrack(track: MutableTrack, candidate: DonatelloContourCandidate, sharedCrossing: boolean, score: number) {
  const sliceDelta = Math.max(1, candidate.sliceIndex - track.lastSlice);
  const measuredMomentum = (candidate.centerBin - track.lastBin) / sliceDelta;
  track.momentumBinsPerSlice = track.momentumBinsPerSlice * 0.62 + measuredMomentum * 0.38;
  track.lastBin = candidate.centerBin;
  track.lastSlice = candidate.sliceIndex;
  track.missingSlices = 0;
  track.points.push(pointFromCandidate(candidate, score, sharedCrossing));
  if (sharedCrossing) track.crossingHintCount += 1;
  const nextRole = candidateRole(candidate);
  if (nextRole === 'core-line' && track.role !== 'core-line') track.role = 'core-line';
  else if (nextRole === 'body-band' && track.role === 'surface-band') track.role = 'body-band';
}

function isShareableCrossing(candidate: DonatelloContourCandidate, tracks: MutableTrack[], skeletonHeight: number) {
  if (tracks.length < 2 || candidate.energy < 0.08) return false;
  const predictedTracks = tracks.filter((track) => {
    const prediction = track.lastBin + track.momentumBinsPerSlice * Math.max(1, candidate.sliceIndex - track.lastSlice);
    return Math.abs(prediction - candidate.centerBin) <= Math.max(3, candidate.widthBins * 1.15 + skeletonHeight * 0.035)
      && Math.abs(track.momentumBinsPerSlice) > 0.3;
  });
  const hasOpposingMomentum = predictedTracks.some((a) => predictedTracks.some((b) => a !== b && a.momentumBinsPerSlice * b.momentumBinsPerSlice < -0.05));
  return hasOpposingMomentum;
}

function resolveDirection(slopeBinsPerSlice: number): DonatelloContourDirection {
  if (slopeBinsPerSlice > 0.18) return 'ascending';
  if (slopeBinsPerSlice < -0.18) return 'descending';
  return 'flat';
}

function finishTrack(track: MutableTrack): DonatelloContourTrack {
  const points = track.points.slice().sort((a, b) => a.sliceIndex - b.sliceIndex);
  const meanEnergy = points.reduce((sum, point) => sum + point.energy, 0) / Math.max(1, points.length);
  const meanWidthBins = points.reduce((sum, point) => sum + point.widthBins, 0) / Math.max(1, points.length);
  const meanSharpness = points.reduce((sum, point) => sum + Math.max(0, 1 - point.roughness), 0) / Math.max(1, points.length);
  const meanConfidence = points.reduce((sum, point) => sum + point.confidence, 0) / Math.max(1, points.length);
  const first = points[0];
  const last = points[points.length - 1] ?? first;
  const slopeBinsPerSlice = first && last ? (last.centerBin - first.centerBin) / Math.max(1, last.sliceIndex - first.sliceIndex) : 0;
  return {
    id: track.id,
    role: track.role,
    points,
    startSlice: first?.sliceIndex ?? 0,
    endSlice: last?.sliceIndex ?? 0,
    meanEnergy,
    meanWidthBins,
    meanSharpness,
    meanConfidence,
    slopeBinsPerSlice,
    direction: resolveDirection(slopeBinsPerSlice),
    crossingHintCount: track.crossingHintCount,
  };
}

function countOpposingTrackPairs(tracks: DonatelloContourTrack[]) {
  let count = 0;
  for (let a = 0; a < tracks.length; a += 1) {
    for (let b = a + 1; b < tracks.length; b += 1) {
      if (tracks[a].direction === 'ascending' && tracks[b].direction === 'descending') count += 1;
      if (tracks[a].direction === 'descending' && tracks[b].direction === 'ascending') count += 1;
    }
  }
  return count;
}

export function traceDonatelloContours(
  skeleton: CarrierSpectralSkeleton,
  options: DonatelloContourTraceOptions = {},
): DonatelloContourTraceResult {
  const curveResolution = Math.max(8, Math.round(options.curveResolution ?? DONATELLO_FORMANT_PLAN_DEFAULT_RESOLUTION));
  const maxTracks = Math.max(1, Math.round(options.maxTracks ?? DONATELLO_FORMANT_PLAN_DEFAULT_MAX_BANDS));
  const minEnergy = Math.max(0, options.minEnergy ?? 0.035);
  const maxMissingSlices = Math.max(1, Math.round(options.maxMissingSlices ?? 4));
  const roughnessCurve = makeFilledCurve(curveResolution);
  const transientDustCurve = makeFilledCurve(curveResolution);
  const residualEnergyCurve = makeFilledCurve(curveResolution);
  const activeTracks: MutableTrack[] = [];
  const finishedTracks: MutableTrack[] = [];
  let candidateCount = 0;
  let capturedLineEnergy = 0;
  let residualEnergy = 0;
  let transientEnergy = 0;
  let roughnessEnergy = 0;

  for (let sliceIndex = 0; sliceIndex < curveResolution; sliceIndex += 1) {
    const candidates = selectCandidates(skeleton, sliceIndex, curveResolution, minEnergy);
    candidateCount += candidates.length;
    const tonalCandidates = candidates.filter((candidate) => candidate.regime === 'tonal' || candidate.regime === 'cluster');
    const assignedCandidateIds = new Set<string>();
    let capturedThisSlice = 0;

    for (const track of activeTracks) {
      let bestCandidate: DonatelloContourCandidate | null = null;
      let bestScore = Number.NEGATIVE_INFINITY;
      for (const candidate of tonalCandidates) {
        if (assignedCandidateIds.has(candidate.id) && !isShareableCrossing(candidate, activeTracks, skeleton.height)) continue;
        const score = trackScore(track, candidate, skeleton.height);
        if (score > bestScore) {
          bestCandidate = candidate;
          bestScore = score;
        }
      }
      if (bestCandidate && bestScore > -0.42) {
        const sharedCrossing = assignedCandidateIds.has(bestCandidate.id) || isShareableCrossing(bestCandidate, activeTracks, skeleton.height);
        updateTrack(track, bestCandidate, sharedCrossing, bestScore);
        assignedCandidateIds.add(bestCandidate.id);
        capturedThisSlice += bestCandidate.energy;
      } else {
        track.missingSlices += 1;
      }
    }

    for (const candidate of tonalCandidates) {
      if (assignedCandidateIds.has(candidate.id)) continue;
      if (activeTracks.length >= maxTracks) break;
      if (candidatePriority(candidate) < minEnergy * 1.25) continue;
      const covered = activeTracks.some((track) => Math.abs(track.lastBin - candidate.centerBin) <= Math.max(2, candidate.widthBins * 0.7));
      if (covered) continue;
      activeTracks.push(createTrack(candidate, activeTracks.length + finishedTracks.length));
      assignedCandidateIds.add(candidate.id);
      capturedThisSlice += candidate.energy;
    }

    for (let index = activeTracks.length - 1; index >= 0; index -= 1) {
      if (activeTracks[index].missingSlices > maxMissingSlices) {
        finishedTracks.push(activeTracks.splice(index, 1)[0]);
      }
    }

    const columnEnergy = candidates.reduce((sum, candidate) => sum + Math.max(0, candidate.energy), 0);
    const noiseEnergy = candidates
      .filter((candidate) => candidate.regime === 'noise')
      .reduce((sum, candidate) => sum + candidate.energy, 0);
    const diffuseEnergy = tonalCandidates
      .filter((candidate) => candidate.sharpness < 0.38 || candidate.widthBins >= 9)
      .reduce((sum, candidate) => sum + candidate.energy * (1 - candidate.sharpness), 0);
    const transientColumnEnergy = candidates
      .filter((candidate) => candidate.regime === 'transient')
      .reduce((sum, candidate) => sum + candidate.energy, 0);
    const residual = clampNumber(Math.max(0, columnEnergy - capturedThisSlice) + noiseEnergy * 0.78 + diffuseEnergy * 0.42, 0, 1);
    const roughness = clampNumber(noiseEnergy * 0.8 + diffuseEnergy * 0.55, 0, 1);
    const dust = clampNumber(transientColumnEnergy, 0, 1);
    residualEnergyCurve[sliceIndex] = residual;
    roughnessCurve[sliceIndex] = roughness;
    transientDustCurve[sliceIndex] = dust;
    capturedLineEnergy += capturedThisSlice;
    residualEnergy += residual;
    transientEnergy += dust;
    roughnessEnergy += roughness;
  }

  finishedTracks.push(...activeTracks);
  const tracks = finishedTracks
    .map(finishTrack)
    .filter((track) => track.points.length >= 2 && track.meanEnergy > minEnergy * 0.5)
    .sort((a, b) => b.meanEnergy * b.points.length - a.meanEnergy * a.points.length)
    .slice(0, maxTracks);
  const opposingTrackPairCount = countOpposingTrackPairs(tracks);
  const meanTrackSpan = tracks.reduce((sum, track) => sum + Math.max(0, track.endSlice - track.startSlice + 1), 0) / Math.max(1, tracks.length);
  const meanTrackConfidence = tracks.reduce((sum, track) => sum + track.meanConfidence, 0) / Math.max(1, tracks.length);
  const maxResidualSlice = Math.max(0, ...residualEnergyCurve);
  const maxRoughnessSlice = Math.max(0, ...roughnessCurve);
  const maxTransientDustSlice = Math.max(0, ...transientDustCurve);

  return {
    schemaVersion: 'donatello-contour-trace-v1',
    curveResolution,
    maxTracks,
    tracks,
    roughnessCurve: roughnessCurve.map((value) => clampNumber(value, 0, 1)),
    transientDustCurve: transientDustCurve.map((value) => clampNumber(value, 0, 1)),
    residualEnergyCurve: residualEnergyCurve.map((value) => clampNumber(value, 0, 1)),
    summary: {
      candidateCount,
      trackCount: tracks.length,
      activeCrossingCount: tracks.reduce((sum, track) => sum + track.crossingHintCount, 0),
      opposingTrackPairCount,
      capturedLineEnergy,
      residualEnergy,
      transientEnergy,
      roughnessEnergy,
      maxResidualSlice,
      maxRoughnessSlice,
      maxTransientDustSlice,
      meanTrackSpan,
      meanTrackConfidence,
      maxTracks,
      curveResolution,
    },
  };
}
