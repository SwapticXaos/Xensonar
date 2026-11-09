import {
  APP_STABLE_RHYTHM_LANE_RUNNER_CALL_PLAN_CONTRACT_CASES,
  buildAppStableRhythmLaneRunnerCallPlanContractKeyProbe,
  type AppStableRhythmLaneRunnerCallPlanContractCase,
  type AppStableRhythmLaneRunnerCallPlanContractDomain,
  type AppStableRhythmLaneRunnerCallPlanStep,
} from './appStableRhythmLaneRunnerCallPlanContractRegistryProbe';
import type { AppStableRhythmLaneRunnerCallPlanProbe } from './appStableRhythmLaneRunnerCallPlanProbe';

export type AppStableRhythmLaneRunnerCallPlanParityDomain = AppStableRhythmLaneRunnerCallPlanContractDomain;
export type AppStableRhythmLaneRunnerCallPlanParityCase = AppStableRhythmLaneRunnerCallPlanContractCase;

export const APP_STABLE_RHYTHM_LANE_RUNNER_CALL_PLAN_PARITY_CASES =
  APP_STABLE_RHYTHM_LANE_RUNNER_CALL_PLAN_CONTRACT_CASES;

export type AppStableRhythmLaneRunnerCallPlanParityProbeResult = {
  readonly probeKind: 'app-stable-rhythm-lane-runner-call-plan-parity-probe';
  readonly ok: boolean;
  readonly failures: readonly string[];
  readonly checkedDomains: readonly AppStableRhythmLaneRunnerCallPlanParityDomain[];
  readonly planBuiltWithoutScheduling: true;
  readonly noCacheMutation: true;
  readonly noQuantizeRead: true;
  readonly noAudioAction: true;
  readonly transportStillAppOwned: true;
  readonly nextAbsoluteStepStillAppOwned: true;
};

const domainKey = (step: Pick<AppStableRhythmLaneRunnerCallPlanStep, 'domain' | 'branchKind'>): string =>
  buildAppStableRhythmLaneRunnerCallPlanContractKeyProbe(step);

export const assertAppStableRhythmLaneRunnerCallPlanParityProbe = (
  callPlan: AppStableRhythmLaneRunnerCallPlanProbe,
): AppStableRhythmLaneRunnerCallPlanParityProbeResult => {
  const failures: string[] = [];
  const expectedByKey = new Map<string, AppStableRhythmLaneRunnerCallPlanParityCase>();
  for (const parityCase of APP_STABLE_RHYTHM_LANE_RUNNER_CALL_PLAN_PARITY_CASES) {
    expectedByKey.set(domainKey(parityCase), parityCase);
  }

  for (const call of callPlan.calls) {
    const expected = expectedByKey.get(domainKey(call));
    if (!expected) {
      failures.push(`unexpected call-plan branch ${call.domain}:${call.branchKind}`);
      continue;
    }
    if (call.schedulerCall !== expected.schedulerCall) {
      failures.push(`${domainKey(call)} scheduler ${call.schedulerCall} !== ${expected.schedulerCall}`);
    }
    if (call.cacheContract !== expected.cacheContract) {
      failures.push(`${domainKey(call)} cache ${call.cacheContract} !== ${expected.cacheContract}`);
    }
    if (call.branchLocalQuantizeRead !== expected.branchLocalQuantizeRead) {
      failures.push(`${domainKey(call)} quantize-read ${String(call.branchLocalQuantizeRead)} !== ${String(expected.branchLocalQuantizeRead)}`);
    }
  }

  for (const requiredDomain of ['metronome', 'drum', 'bass', 'myzel'] as const) {
    if (!callPlan.calls.some((call) => call.domain === requiredDomain)) {
      failures.push(`missing call-plan domain ${requiredDomain}`);
    }
  }

  return {
    probeKind: 'app-stable-rhythm-lane-runner-call-plan-parity-probe',
    ok: failures.length === 0,
    failures,
    checkedDomains: ['metronome', 'drum', 'bass', 'myzel'],
    planBuiltWithoutScheduling: true,
    noCacheMutation: true,
    noQuantizeRead: true,
    noAudioAction: true,
    transportStillAppOwned: true,
    nextAbsoluteStepStillAppOwned: true,
  };
};
