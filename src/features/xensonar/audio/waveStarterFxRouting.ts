export type EnsureWaveStarterFxRoutesArgs = {
  ctx: AudioContext;
  essentialWaveOnly: boolean;
  ensureCollectiveMemoryFx: (ctx: AudioContext) => void;
  ensurePsychedelicSpiralDevice: (ctx: AudioContext) => void;
  ensureTransientDriveDevice: (ctx: AudioContext) => void;
  ensureEnterHoldPsyFxDevice: (ctx: AudioContext) => void;
  ensureSchwarmdeuterDevice: (ctx: AudioContext) => void;
  ensureMyzelPostFxRouter: (ctx: AudioContext) => void;
};

export function ensureWaveStarterFxRoutes(args: EnsureWaveStarterFxRoutesArgs): void {
  if (args.essentialWaveOnly) return;
  args.ensureCollectiveMemoryFx(args.ctx);
  args.ensurePsychedelicSpiralDevice(args.ctx);
  args.ensureTransientDriveDevice(args.ctx);
  args.ensureEnterHoldPsyFxDevice(args.ctx);
  args.ensureSchwarmdeuterDevice(args.ctx);
  args.ensureMyzelPostFxRouter(args.ctx);
}

export type BuildWaveStarterAuxTargetsArgs = {
  essentialWaveOnly: boolean;
  transientDriveWaves: AudioNode | null | undefined;
  psychedelicSpiralWaves: AudioNode | null | undefined;
  collectiveMemoryWaves: AudioNode | null | undefined;
  enterHoldPsyFxWaves: AudioNode | null | undefined;
  enterHoldPsyFxEnabled: boolean;
  enterHoldActive: boolean;
  schwarmdeuterWaves: AudioNode | null | undefined;
  myzelPostFxWaves: AudioNode | null | undefined;
};

export function buildWaveStarterAuxTargets(args: BuildWaveStarterAuxTargetsArgs): Array<AudioNode | null | undefined> {
  if (args.essentialWaveOnly) return [];
  return [
    args.transientDriveWaves,
    args.psychedelicSpiralWaves,
    args.collectiveMemoryWaves,
    args.enterHoldPsyFxEnabled && args.enterHoldActive ? args.enterHoldPsyFxWaves : null,
    args.schwarmdeuterWaves,
    args.myzelPostFxWaves,
  ];
}
