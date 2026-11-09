export type AppStableRhythmLaneRunnerCallPlanContractDomain = 'metronome' | 'drum' | 'bass' | 'myzel';

export type AppStableRhythmLaneRunnerCallPlanSchedulerCall =
  | 'none'
  | 'schedule-metronome-pulse'
  | 'schedule-exported-drum-config-step'
  | 'schedule-rhythmforge-drum-step-if-pattern-available'
  | 'schedule-classic-drum-pattern'
  | 'schedule-bass-clip-step-if-clip-resolved'
  | 'schedule-rhythmforge-bass-step-if-pattern-available'
  | 'schedule-psy-bass-step-if-pattern-available'
  | 'schedule-classic-bass-pattern'
  | 'apply-myzel-layer-step';

export type AppStableRhythmLaneRunnerCallPlanCacheContract =
  | 'none'
  | 'rhythmforge-drum-pattern-cache'
  | 'bass-clip-root-binding-cache'
  | 'rhythmforge-bass-pattern-cache'
  | 'psybass-pattern-cache';

export type AppStableRhythmLaneRunnerCallPlanStep = {
  readonly domain: AppStableRhythmLaneRunnerCallPlanContractDomain;
  readonly branchKind: string;
  readonly schedulerCall: AppStableRhythmLaneRunnerCallPlanSchedulerCall;
  readonly cacheContract: AppStableRhythmLaneRunnerCallPlanCacheContract;
  readonly branchLocalQuantizeRead: boolean;
  readonly scheduleCallStillRunnerOwned: true;
};


export type AppStableRhythmLaneRunnerCallPlanContractCase = {
  readonly domain: AppStableRhythmLaneRunnerCallPlanContractDomain;
  readonly branchKind: string;
  readonly schedulerCall: AppStableRhythmLaneRunnerCallPlanSchedulerCall;
  readonly cacheContract: AppStableRhythmLaneRunnerCallPlanCacheContract;
  readonly branchLocalQuantizeRead: boolean;
  readonly runnerSwitchStillRealExecutor: true;
  readonly callPlanStillShadowOnly: true;
};

export const APP_STABLE_RHYTHM_LANE_RUNNER_CALL_PLAN_CONTRACT_CASES = [
  {
    domain: 'metronome',
    branchKind: 'always',
    schedulerCall: 'schedule-metronome-pulse',
    cacheContract: 'none',
    branchLocalQuantizeRead: false,
    runnerSwitchStillRealExecutor: true,
    callPlanStillShadowOnly: true,
  },
  {
    domain: 'drum',
    branchKind: 'inactive',
    schedulerCall: 'none',
    cacheContract: 'none',
    branchLocalQuantizeRead: false,
    runnerSwitchStillRealExecutor: true,
    callPlanStillShadowOnly: true,
  },
  {
    domain: 'drum',
    branchKind: 'exported',
    schedulerCall: 'schedule-exported-drum-config-step',
    cacheContract: 'none',
    branchLocalQuantizeRead: false,
    runnerSwitchStillRealExecutor: true,
    callPlanStillShadowOnly: true,
  },
  {
    domain: 'drum',
    branchKind: 'rhythmforge',
    schedulerCall: 'schedule-rhythmforge-drum-step-if-pattern-available',
    cacheContract: 'rhythmforge-drum-pattern-cache',
    branchLocalQuantizeRead: false,
    runnerSwitchStillRealExecutor: true,
    callPlanStillShadowOnly: true,
  },
  {
    domain: 'drum',
    branchKind: 'classic',
    schedulerCall: 'schedule-classic-drum-pattern',
    cacheContract: 'none',
    branchLocalQuantizeRead: false,
    runnerSwitchStillRealExecutor: true,
    callPlanStillShadowOnly: true,
  },
  {
    domain: 'bass',
    branchKind: 'inactive',
    schedulerCall: 'none',
    cacheContract: 'none',
    branchLocalQuantizeRead: false,
    runnerSwitchStillRealExecutor: true,
    callPlanStillShadowOnly: true,
  },
  {
    domain: 'bass',
    branchKind: 'clip',
    schedulerCall: 'schedule-bass-clip-step-if-clip-resolved',
    cacheContract: 'bass-clip-root-binding-cache',
    branchLocalQuantizeRead: true,
    runnerSwitchStillRealExecutor: true,
    callPlanStillShadowOnly: true,
  },
  {
    domain: 'bass',
    branchKind: 'rhythmforge',
    schedulerCall: 'schedule-rhythmforge-bass-step-if-pattern-available',
    cacheContract: 'rhythmforge-bass-pattern-cache',
    branchLocalQuantizeRead: true,
    runnerSwitchStillRealExecutor: true,
    callPlanStillShadowOnly: true,
  },
  {
    domain: 'bass',
    branchKind: 'psybass',
    schedulerCall: 'schedule-psy-bass-step-if-pattern-available',
    cacheContract: 'psybass-pattern-cache',
    branchLocalQuantizeRead: true,
    runnerSwitchStillRealExecutor: true,
    callPlanStillShadowOnly: true,
  },
  {
    domain: 'bass',
    branchKind: 'classic',
    schedulerCall: 'schedule-classic-bass-pattern',
    cacheContract: 'none',
    branchLocalQuantizeRead: false,
    runnerSwitchStillRealExecutor: true,
    callPlanStillShadowOnly: true,
  },
  {
    domain: 'myzel',
    branchKind: 'always',
    schedulerCall: 'apply-myzel-layer-step',
    cacheContract: 'none',
    branchLocalQuantizeRead: false,
    runnerSwitchStillRealExecutor: true,
    callPlanStillShadowOnly: true,
  },
] as const satisfies readonly AppStableRhythmLaneRunnerCallPlanContractCase[];

export const buildAppStableRhythmLaneRunnerCallPlanContractKeyProbe = (
  step: Pick<AppStableRhythmLaneRunnerCallPlanContractCase, 'domain' | 'branchKind'>,
): string => `${step.domain}:${step.branchKind}`;

export const resolveAppStableRhythmLaneRunnerCallPlanContractProbe = (
  domain: AppStableRhythmLaneRunnerCallPlanContractDomain,
  branchKind: string,
): AppStableRhythmLaneRunnerCallPlanContractCase | null =>
  APP_STABLE_RHYTHM_LANE_RUNNER_CALL_PLAN_CONTRACT_CASES.find(
    (candidate) => candidate.domain === domain && candidate.branchKind === branchKind,
  ) ?? null;

export const buildAppStableRhythmLaneRunnerCallPlanStepFromContractProbe = (
  domain: AppStableRhythmLaneRunnerCallPlanContractDomain,
  branchKind: string,
): AppStableRhythmLaneRunnerCallPlanStep => {
  const contract = resolveAppStableRhythmLaneRunnerCallPlanContractProbe(domain, branchKind);
  if (!contract) {
    throw new Error(`Missing stable rhythm lane call-plan contract for ${domain}:${branchKind}`);
  }
  return {
    domain: contract.domain,
    branchKind: contract.branchKind,
    schedulerCall: contract.schedulerCall,
    cacheContract: contract.cacheContract,
    branchLocalQuantizeRead: contract.branchLocalQuantizeRead,
    scheduleCallStillRunnerOwned: true,
  };
};
