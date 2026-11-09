import { assertAppStableRhythmLaneRunnerCallPlanParityProbe } from './appStableRhythmLaneRunnerCallPlanParityProbe';
import { buildAppStableRhythmLaneRunnerCallPlanStepFromContractProbe } from './appStableRhythmLaneRunnerCallPlanContractRegistryProbe';
import type { AppStableRhythmLaneRunnerCallPlanProbe } from './appStableRhythmLaneRunnerCallPlanProbe';

export type AppStableRhythmLaneRunnerCallPlanFixtureName =
  | 'drum-inactive-bass-inactive'
  | 'drum-exported-bass-clip'
  | 'drum-rhythmforge-bass-rhythmforge'
  | 'drum-classic-bass-psybass'
  | 'drum-rhythmforge-bass-classic';

export type AppStableRhythmLaneRunnerCallPlanFixture = {
  readonly fixtureName: AppStableRhythmLaneRunnerCallPlanFixtureName;
  readonly callPlan: AppStableRhythmLaneRunnerCallPlanProbe;
  readonly fixtureBuiltWithoutScheduling: true;
  readonly noCacheMutation: true;
  readonly noQuantizeRead: true;
  readonly noAudioAction: true;
  readonly transportStillAppOwned: true;
  readonly nextAbsoluteStepStillAppOwned: true;
};

export type AppStableRhythmLaneRunnerCallPlanFixtureProbeResult = {
  readonly probeKind: 'app-stable-rhythm-lane-runner-call-plan-fixture-probe';
  readonly ok: boolean;
  readonly fixtureCount: number;
  readonly coveredBranchKeys: readonly string[];
  readonly failures: readonly string[];
  readonly fixtureBuiltWithoutScheduling: true;
  readonly noCacheMutation: true;
  readonly noQuantizeRead: true;
  readonly noAudioAction: true;
  readonly transportStillAppOwned: true;
  readonly nextAbsoluteStepStillAppOwned: true;
};

const makeCallPlanFixture = (
  fixtureName: AppStableRhythmLaneRunnerCallPlanFixtureName,
  drumBranchKind: 'inactive' | 'exported' | 'rhythmforge' | 'classic',
  bassBranchKind: 'inactive' | 'clip' | 'rhythmforge' | 'psybass' | 'classic',
  index: number,
): AppStableRhythmLaneRunnerCallPlanFixture => ({
  fixtureName,
  callPlan: {
    probeKind: 'app-stable-rhythm-lane-runner-call-plan-probe',
    step16: index % 16,
    barIndex: index,
    calls: [
      buildAppStableRhythmLaneRunnerCallPlanStepFromContractProbe('metronome', 'always'),
      buildAppStableRhythmLaneRunnerCallPlanStepFromContractProbe('drum', drumBranchKind),
      buildAppStableRhythmLaneRunnerCallPlanStepFromContractProbe('bass', bassBranchKind),
      buildAppStableRhythmLaneRunnerCallPlanStepFromContractProbe('myzel', 'always'),
    ],
    planBuiltWithoutScheduling: true,
    noCacheMutation: true,
    transportStillAppOwned: true,
    nextAbsoluteStepStillAppOwned: true,
    runtimeOwned: false,
    audioOwned: false,
  },
  fixtureBuiltWithoutScheduling: true,
  noCacheMutation: true,
  noQuantizeRead: true,
  noAudioAction: true,
  transportStillAppOwned: true,
  nextAbsoluteStepStillAppOwned: true,
});

export const APP_STABLE_RHYTHM_LANE_RUNNER_CALL_PLAN_FIXTURE_PROBES = [
  makeCallPlanFixture('drum-inactive-bass-inactive', 'inactive', 'inactive', 0),
  makeCallPlanFixture('drum-exported-bass-clip', 'exported', 'clip', 1),
  makeCallPlanFixture('drum-rhythmforge-bass-rhythmforge', 'rhythmforge', 'rhythmforge', 2),
  makeCallPlanFixture('drum-classic-bass-psybass', 'classic', 'psybass', 3),
  makeCallPlanFixture('drum-rhythmforge-bass-classic', 'rhythmforge', 'classic', 4),
] as const satisfies readonly AppStableRhythmLaneRunnerCallPlanFixture[];

export const runAppStableRhythmLaneRunnerCallPlanFixtureProbe = (): AppStableRhythmLaneRunnerCallPlanFixtureProbeResult => {
  const failures: string[] = [];
  const coveredBranchKeys = new Set<string>();

  for (const fixture of APP_STABLE_RHYTHM_LANE_RUNNER_CALL_PLAN_FIXTURE_PROBES) {
    const parity = assertAppStableRhythmLaneRunnerCallPlanParityProbe(fixture.callPlan);
    for (const call of fixture.callPlan.calls) {
      coveredBranchKeys.add(`${call.domain}:${call.branchKind}`);
    }
    if (!parity.ok) {
      failures.push(`${fixture.fixtureName}: ${parity.failures.join('; ')}`);
    }
  }

  return {
    probeKind: 'app-stable-rhythm-lane-runner-call-plan-fixture-probe',
    ok: failures.length === 0,
    fixtureCount: APP_STABLE_RHYTHM_LANE_RUNNER_CALL_PLAN_FIXTURE_PROBES.length,
    coveredBranchKeys: [...coveredBranchKeys].sort(),
    failures,
    fixtureBuiltWithoutScheduling: true,
    noCacheMutation: true,
    noQuantizeRead: true,
    noAudioAction: true,
    transportStillAppOwned: true,
    nextAbsoluteStepStillAppOwned: true,
  };
};
