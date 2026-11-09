import type { CanonicalLogicView } from './sessionTypes';
import type {
  CanonicalMicrotonalWorkspaceDrumActions,
  CanonicalMicrotonalWorkspaceMelodicActions,
  CanonicalMicrotonalWorkspaceMaterialActions,
} from './useCanonicalMicrotonalWorkspaceConfig';

export type CanonicalForgeHeaderActions = {
  onSelectLogicView: (view: CanonicalLogicView) => void;
  onBack: () => void;
  onImportFile: (file: File) => void | Promise<void>;
};

export function buildCanonicalForgeHeaderActions(args: CanonicalForgeHeaderActions): CanonicalForgeHeaderActions {
  return args;
}

export type CanonicalForgeMicrotonalActionBoundaries = {
  drumActions: CanonicalMicrotonalWorkspaceDrumActions;
  melodicActions: CanonicalMicrotonalWorkspaceMelodicActions;
  materialActions: CanonicalMicrotonalWorkspaceMaterialActions;
};

export function buildCanonicalForgeMicrotonalActionBoundaries(
  args: CanonicalForgeMicrotonalActionBoundaries,
): CanonicalForgeMicrotonalActionBoundaries {
  return args;
}
