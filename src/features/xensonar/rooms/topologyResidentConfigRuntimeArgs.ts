import { buildTopologyResidentConfigBindings } from './topologyRuntimeBindings';

type BuildTopologyResidentConfigRuntimeArgs = Parameters<
  typeof buildTopologyResidentConfigBindings
>[0];

export function buildTopologyResidentConfigRuntimeArgs(
  args: BuildTopologyResidentConfigRuntimeArgs,
): BuildTopologyResidentConfigRuntimeArgs {
  return args;
}
