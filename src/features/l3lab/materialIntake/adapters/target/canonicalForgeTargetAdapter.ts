import type { CommittedLoopPayload, MaterialTargetAdapter } from '../../types';

export const CANONICAL_INTAKE_COMMIT_EVENT = 'xensonar:canonical-intake-commit';
export const CANONICAL_INTAKE_RAW_SEND_EVENT = 'xensonar:canonical-intake-raw-send';

function dispatch(name: string, payload: CommittedLoopPayload) {
  window.dispatchEvent(new CustomEvent<CommittedLoopPayload>(name, { detail: payload }));
}

export const canonicalForgeTargetAdapter: MaterialTargetAdapter = {
  id: 'canonical-forge-workbench',
  label: 'SyntheticForge · Melodic Loop',
  acceptsRawLoop: false,
  acceptsAnalysisMeta: true,
  acceptsSpectralProjection: true,
  async commitLoop(payload) {
    dispatch(CANONICAL_INTAKE_COMMIT_EVENT, payload);
  },
};

export const canonicalForgeRawTargetAdapter: MaterialTargetAdapter = {
  id: 'canonical-forge-raw-send',
  label: 'Roh an Xensonar',
  acceptsRawLoop: true,
  acceptsAnalysisMeta: true,
  acceptsSpectralProjection: false,
  async commitLoop(payload) {
    dispatch(CANONICAL_INTAKE_RAW_SEND_EVENT, payload);
  },
};
