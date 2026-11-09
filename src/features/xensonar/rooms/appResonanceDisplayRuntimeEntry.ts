import { buildAppResonanceDisplayCoordinator } from './appResonanceDisplayCoordinator';
import { buildAppResonanceDisplayBindings } from './appResonanceDisplayBindings';
import { buildAppResonanceDisplayRuntimeArgs } from './appResonanceDisplayRuntimeArgs';

type BuildAppResonanceDisplayRuntimeEntryArgs = Parameters<
  typeof buildAppResonanceDisplayRuntimeArgs
>[0];

export function buildAppResonanceDisplayRuntimeEntry(
  args: BuildAppResonanceDisplayRuntimeEntryArgs,
) {
  return buildAppResonanceDisplayCoordinator(
    buildAppResonanceDisplayBindings(buildAppResonanceDisplayRuntimeArgs(args)),
  );
}
