import type { CanonicalMicrotonalWorkspaceConfigArgs } from './useCanonicalMicrotonalWorkspaceConfig';
import type {
  CanonicalForgeHeaderProps,
  WaveMaterialArchivePanelsProps,
} from './workspaceScaffoldPanels';

export type CanonicalForgeHeaderRuntimeArgs = CanonicalForgeHeaderProps;

export function buildCanonicalForgeHeaderRuntimeArgs(
  args: CanonicalForgeHeaderRuntimeArgs,
): CanonicalForgeHeaderRuntimeArgs {
  return args;
}

export type CanonicalForgeMicrotonalViewPanelRuntimeArgs = CanonicalMicrotonalWorkspaceConfigArgs;

export function buildCanonicalForgeMicrotonalViewPanelRuntimeArgs(
  args: CanonicalForgeMicrotonalViewPanelRuntimeArgs,
): CanonicalForgeMicrotonalViewPanelRuntimeArgs {
  return args;
}

export type CanonicalForgeArchivePanelRuntimeArgs = WaveMaterialArchivePanelsProps;

export function buildCanonicalForgeArchivePanelRuntimeArgs(
  args: CanonicalForgeArchivePanelRuntimeArgs,
): CanonicalForgeArchivePanelRuntimeArgs {
  return args;
}
