export type EnsureParticleFxRoutesArgs = {
  ctx: AudioContext;
  ensureCollectiveMemoryFx: (ctx: AudioContext) => void;
  ensurePsychedelicSpiralDevice: (ctx: AudioContext) => void;
  ensureTransientDriveDevice: (ctx: AudioContext) => void;
  ensureEnterHoldPsyFxDevice: (ctx: AudioContext) => void;
  ensureSchwarmdeuterDevice: (ctx: AudioContext) => void;
  ensureMyzelPostFxRouter: (ctx: AudioContext) => void;
};

export function ensureParticleFxRoutes(args: EnsureParticleFxRoutesArgs): void {
  args.ensureCollectiveMemoryFx(args.ctx);
  args.ensurePsychedelicSpiralDevice(args.ctx);
  args.ensureTransientDriveDevice(args.ctx);
  args.ensureEnterHoldPsyFxDevice(args.ctx);
  args.ensureSchwarmdeuterDevice(args.ctx);
  args.ensureMyzelPostFxRouter(args.ctx);
}

export type BuildParticleAuxTargetsArgs = {
  targetDestination?: AudioNode | null;
  transientDriveParticles: AudioNode | null | undefined;
  psychedelicSpiralParticles: AudioNode | null | undefined;
  collectiveMemoryParticles: AudioNode | null | undefined;
  schwarmdeuterParticles: AudioNode | null | undefined;
  myzelPostFxParticles: AudioNode | null | undefined;
};

export function buildParticleAuxTargets(args: BuildParticleAuxTargetsArgs): Array<AudioNode | null | undefined> {
  return [
    args.targetDestination,
    args.transientDriveParticles,
    args.psychedelicSpiralParticles,
    args.collectiveMemoryParticles,
    args.schwarmdeuterParticles,
    args.myzelPostFxParticles,
  ];
}
