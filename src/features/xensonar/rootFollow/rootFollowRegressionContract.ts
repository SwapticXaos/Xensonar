export const ROOT_FOLLOW_LIVE_ANCHOR_REFERENCE = {
  referenceVersion: '3.2.91.4.63_root_follow_live_anchor_fix',
  currentContractVersion: '3.2.91.4.114.15',
  flowingMaterialWindow: {
    lookaheadSec: 0.075,
    sliceStepSec: 0.028,
    sliceDurSec: 0.056,
    minimumLeadInSec: 0.022,
  },
  invariants: [
    'loop-phase-continues-during-retune',
    'cursor-root-hz-is-sampled-live',
    'retune-is-not-trigger',
    'retune-is-not-restart',
    'flowing-is-not-whole-loop-pitch-stepping',
    'package-activation-does-not-change-root-follow-semantics',
  ],
} as const;
