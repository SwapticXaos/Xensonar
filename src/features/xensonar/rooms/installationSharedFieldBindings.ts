import { buildInstallationSharedFieldController } from '../../topology/topologyInteractionHelpers';

type BuildInstallationSharedFieldControllerArgs = Parameters<typeof buildInstallationSharedFieldController>[0];

type BuildInstallationSharedFieldBindingsArgs = {
  topologyRefs: BuildInstallationSharedFieldControllerArgs['topologyRefs'];
  topologyDragRef: BuildInstallationSharedFieldControllerArgs['topologyDragRef'];
  sourceWidth: BuildInstallationSharedFieldControllerArgs['sourceWidth'];
  sourceHeight: BuildInstallationSharedFieldControllerArgs['sourceHeight'];
  targetWidth: BuildInstallationSharedFieldControllerArgs['targetWidth'];
  targetHeight: BuildInstallationSharedFieldControllerArgs['targetHeight'];
  installationSharedFieldActive: boolean;
  installAttractCursor: boolean;
  installAttractOscillatorBall: boolean;
  installResidentsEnabled: boolean;
  installResidentWaveExcitationEnabled: boolean;
  installResidentBallCouplingEnabled: boolean;
  particleSoundsMuted: boolean;
};

export function buildInstallationSharedFieldBindings(args: BuildInstallationSharedFieldBindingsArgs): BuildInstallationSharedFieldControllerArgs {
  return {
    topologyRefs: args.topologyRefs,
    topologyDragRef: args.topologyDragRef,
    sourceWidth: args.sourceWidth,
    sourceHeight: args.sourceHeight,
    targetWidth: args.targetWidth,
    targetHeight: args.targetHeight,
    active: args.installationSharedFieldActive,
    attractCursor: args.installAttractCursor,
    attractOscillatorBall: args.installAttractOscillatorBall,
    residentWaveExcitationEnabled: args.installResidentsEnabled && args.installResidentWaveExcitationEnabled,
    residentBallCouplingEnabled: args.installResidentsEnabled && args.installResidentBallCouplingEnabled,
    particleSoundsMuted: args.particleSoundsMuted,
  };
}
