import { describe, expect, it } from 'vitest';
import {
  adaptMprgBridgePayloadToMicrotoMelodicLoopSeed,
  surveyMicrotoAsMprgAdapterSurface,
  summarizeMprgBridgeAdapterResult,
} from './mprgBridgeAdapter';

function loopBody() {
  return {
    version: 1,
    bodyKind: 'xensonaric-trail-loop-body',
    loopBars: 4,
    internalTuningId: 'trail-internal-17edo',
    externalRootId: 'host-12edo-root',
    loopBodyKey: 'loop-abc',
    determinismKey: 'det-abc',
    carrierRootLane: [
      { beat: 0, degree: 0, lineHz: 110, projectedHz: 220, direction: 'right', energy: 0.45 },
      { beat: 0.5, degree: 5, lineHz: 134.95, projectedHz: 269.9, direction: 'left', energy: 0.55 },
    ],
    impulseLane: [
      { beat: 1, degree: 7, resolvedLineHz: 146.83, projectedHz: 293.66, velocity: 0.92 },
    ],
    anchorLane: [
      { beat: 2, degree: 0, lineHz: 110, energy: 0.58 },
    ],
    thresholdLane: [
      { beat: 3, degree: 11, lineHz: 172.3, detail: 2, energy: 0.76 },
    ],
    antiWhoopPolicy: {
      rootMotionIsControlLaneNotAttackGlide: true,
      impulseStartsAtResolvedLineHz: true,
    },
    nestedTuning: {
      formula: 'outHz = lineHz * externalRootRatio',
      hostRasterDoesNotOverwriteInternalLines: true,
    },
  };
}

describe('mPRG → Xensonar Microto bridge adapter', () => {
  it('classifies Microto as seed-body adapter, not whole mPRG bridge', () => {
    const survey = surveyMicrotoAsMprgAdapterSurface();
    expect(survey.verdict).toBe('microto-needs-whole-head-overlay');
    expect(survey.microtoStrengths.join(' ')).toContain('movementEvents');
    expect(survey.microtoGaps.join(' ')).toContain('truth');
  });

  it('adapts mPRG TrailLoopBody lanes into Microto movement events without flattening roles', () => {
    const result = adaptMprgBridgePayloadToMicrotoMelodicLoopSeed({
      direction: 'mprg-to-xensonar-head',
      payloadKind: 'trail-loop-body',
      payload: loopBody(),
      truthClaim: { headlessTruth: true, audioTruth: false },
    });

    expect(result.seed).not.toBeNull();
    expect(result.diagnostics.accepted).toBe(true);
    expect(result.diagnostics.carrierPointCount).toBe(2);
    expect(result.diagnostics.impulseCount).toBe(1);
    expect(result.diagnostics.anchorCount).toBe(1);
    expect(result.diagnostics.thresholdCount).toBe(1);
    expect(result.diagnostics.antiWhoopProtected).toBe(true);
    expect(result.diagnostics.nestedTuningProtected).toBe(true);
    expect(result.seed?.movementEvents.map((event) => event.kind)).toEqual(['motion', 'motion', 'jump', 'checkpoint', 'phase_gate']);
    expect(result.seed?.fallbackPhrase).toEqual([7]);
    expect(result.seed?.tuningMode).toBe('12edo');
    expect(result.seed?.mprgBridge?.internalTuningId).toBe('trail-internal-17edo');
    expect(summarizeMprgBridgeAdapterResult(result)).toContain('antiWhoop=ok');
  });

  it('keeps audio truth out of cold seed adaptation', () => {
    const result = adaptMprgBridgePayloadToMicrotoMelodicLoopSeed({
      direction: 'mprg-to-xensonar-head',
      payloadKind: 'trail-loop-body',
      payload: loopBody(),
      truthClaim: { headlessTruth: true, audioTruth: true },
    });

    expect(result.seed?.sourceDevice).toBe('Resonanzwanderer');
    expect(result.diagnostics.truthBoundary.audioTruthClaimRejected).toBe(true);
    expect(result.diagnostics.warnings).toContain('audio-truth-claim-ignored-by-xensonar-seed-adapter');
  });
});
