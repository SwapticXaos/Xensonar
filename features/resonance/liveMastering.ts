export type LiveMasterBusRole = "main" | "drone" | "rhythm" | "space";
export const LIVE_MASTER_BUS_ROLES: LiveMasterBusRole[] = ["main", "drone", "rhythm", "space"];

export type LiveMasterTelemetry = {
  main: number;
  drone: number;
  rhythm: number;
  space: number;
  density: number;
  trim: number;
};

export type LiveMasteringSystem = {
  inputs: Record<LiveMasterBusRole, GainNode | null>;
  analyzers: Record<LiveMasterBusRole, AnalyserNode | null>;
  lowShelves: Record<LiveMasterBusRole, BiquadFilterNode | null>;
  midPeaks: Record<LiveMasterBusRole, BiquadFilterNode | null>;
  highShelves: Record<LiveMasterBusRole, BiquadFilterNode | null>;
  roleGains: Record<LiveMasterBusRole, GainNode | null>;
  glue: DynamicsCompressorNode | null;
  musicPremaster: GainNode | null;
  premaster: GainNode | null;
  telemetry: LiveMasterTelemetry;
  scratch: Record<LiveMasterBusRole, Uint8Array | null>;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const analyseRms = (analyser: AnalyserNode, scratch: Uint8Array) => {
  analyser.getByteTimeDomainData(scratch as Uint8Array<ArrayBuffer>);
  let sum = 0;
  let peak = 0;
  for (let i = 0; i < scratch.length; i += 1) {
    const sample = (scratch[i] - 128) / 128;
    sum += sample * sample;
    peak = Math.max(peak, Math.abs(sample));
  }
  return {
    rms: Math.sqrt(sum / Math.max(1, scratch.length)),
    peak,
  };
};

export const createLiveMasteringSystem = (ctx: AudioContext): LiveMasteringSystem => {
  const musicPremaster = ctx.createGain();
  const premaster = ctx.createGain();
  const glue = ctx.createDynamicsCompressor();

  musicPremaster.gain.value = 1;
  premaster.gain.value = 1;
  musicPremaster.connect(premaster);
  premaster.connect(glue);

  const system: LiveMasteringSystem = {
    inputs: { main: null, drone: null, rhythm: null, space: null },
    analyzers: { main: null, drone: null, rhythm: null, space: null },
    lowShelves: { main: null, drone: null, rhythm: null, space: null },
    midPeaks: { main: null, drone: null, rhythm: null, space: null },
    highShelves: { main: null, drone: null, rhythm: null, space: null },
    roleGains: { main: null, drone: null, rhythm: null, space: null },
    glue,
    musicPremaster,
    premaster,
    telemetry: { main: 0, drone: 0, rhythm: 0, space: 0, density: 0, trim: 0.92 },
    scratch: { main: null, drone: null, rhythm: null, space: null },
  };

  const roleConfigs: Record<LiveMasterBusRole, { low: number; mid: number; high: number; midFreq: number }> = {
    main: { low: 180, mid: 1400, high: 4800, midFreq: 1400 },
    drone: { low: 120, mid: 260, high: 3200, midFreq: 260 },
    rhythm: { low: 90, mid: 1900, high: 6200, midFreq: 1900 },
    space: { low: 260, mid: 2400, high: 5600, midFreq: 2400 },
  };

  for (const role of LIVE_MASTER_BUS_ROLES) {
    const input = ctx.createGain();
    const analyser = ctx.createAnalyser();
    const lowShelf = ctx.createBiquadFilter();
    const midPeak = ctx.createBiquadFilter();
    const highShelf = ctx.createBiquadFilter();
    const roleGain = ctx.createGain();
    const cfg = roleConfigs[role];

    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.74;
    system.scratch[role] = new Uint8Array(analyser.fftSize);

    lowShelf.type = "lowshelf";
    lowShelf.frequency.value = cfg.low;
    lowShelf.gain.value = 0;

    midPeak.type = "peaking";
    midPeak.frequency.value = cfg.midFreq;
    midPeak.Q.value = role === "drone" ? 0.78 : role === "space" ? 0.92 : 0.85;
    midPeak.gain.value = 0;

    highShelf.type = "highshelf";
    highShelf.frequency.value = cfg.high;
    highShelf.gain.value = 0;

    roleGain.gain.value = 1;

    input.connect(analyser);
    analyser.connect(lowShelf);
    lowShelf.connect(midPeak);
    midPeak.connect(highShelf);
    highShelf.connect(roleGain);
    roleGain.connect(premaster);
    if (role !== "rhythm") {
      roleGain.connect(musicPremaster);
    }

    system.inputs[role] = input;
    system.analyzers[role] = analyser;
    system.lowShelves[role] = lowShelf;
    system.midPeaks[role] = midPeak;
    system.highShelves[role] = highShelf;
    system.roleGains[role] = roleGain;
  }

  glue.threshold.setValueAtTime(0, ctx.currentTime);
  glue.knee.setValueAtTime(0, ctx.currentTime);
  glue.ratio.setValueAtTime(1, ctx.currentTime);
  glue.attack.setValueAtTime(0.02, ctx.currentTime);
  glue.release.setValueAtTime(0.12, ctx.currentTime);

  return system;
};

export const updateLiveMasteringSystem = (
  system: LiveMasteringSystem,
  params: { enabled: boolean; strength: number; glue: number; air: number },
  now: number,
) => {
  const readRole = (role: LiveMasterBusRole) => {
    const analyser = system.analyzers[role];
    const scratch = system.scratch[role];
    if (!analyser || !scratch) return 0;
    return analyseRms(analyser, scratch).rms;
  };

  const mainLevel = readRole("main");
  const droneLevel = readRole("drone");
  const rhythmLevel = readRole("rhythm");
  const spaceLevel = readRole("space");
  const total = mainLevel + droneLevel + rhythmLevel + spaceLevel + 0.0001;
  const density = clamp(total * 10.5, 0, 1);
  const mainShare = mainLevel / total;
  const droneShare = droneLevel / total;
  const rhythmShare = rhythmLevel / total;
  const spaceShare = spaceLevel / total;
  const strength = params.enabled ? clamp(params.strength, 0, 1) : 0;
  const glueAmt = params.enabled ? clamp(params.glue, 0, 1) : 0;
  const airAmt = params.enabled ? clamp(params.air, 0, 1) : 0;

  const roleTargets = {
    drone: clamp(1 - Math.max(0, droneShare - 0.42) * (0.3 + strength * 0.48) + Math.max(0, 0.22 - droneShare) * 0.12, 0.72, 1.06),
    rhythm: clamp(1 - Math.max(0, rhythmShare - 0.34) * (0.26 + strength * 0.42) + Math.max(0, droneShare - 0.44) * 0.06, 0.78, 1.08),
    space: clamp(1 - Math.max(0, spaceShare - 0.18) * (0.4 + strength * 0.56) - density * 0.08 + airAmt * 0.04, 0.56, 1.02),
    main: clamp(1 - Math.max(0, mainShare - 0.34) * (0.18 + strength * 0.32) + Math.max(0, 0.18 - mainShare) * 0.08, 0.82, 1.08),
  } as const;

  system.roleGains.drone?.gain.setTargetAtTime(roleTargets.drone, now, 0.12);
  system.roleGains.rhythm?.gain.setTargetAtTime(roleTargets.rhythm, now, 0.12);
  system.roleGains.space?.gain.setTargetAtTime(roleTargets.space, now, 0.12);
  system.roleGains.main?.gain.setTargetAtTime(roleTargets.main, now, 0.12);

  const droneLow = clamp((0.26 - rhythmShare) * 4.5 + (0.18 - spaceShare) * 3.2, -2.5, 2.4);
  const droneMid = -clamp((rhythmShare * 0.8 + mainShare * 0.62 + spaceShare * 0.35 - 0.5) * (5.2 + strength * 7.5), 0, 6.8);
  const droneAir = -clamp((spaceShare + density * 0.38 - 0.44) * (2.8 + strength * 3.6), 0, 4.2);

  const rhythmLow = -clamp((droneShare - 0.32) * (5.8 + strength * 6.4), 0, 6.4);
  const rhythmMid = clamp((droneShare * 0.8 + mainShare * 0.5 - 0.38) * (2.4 + strength * 2.8), -1.5, 4.5);
  const rhythmAir = clamp((airAmt - density * 0.6) * 3.4, -2.2, 2.8);

  const spaceLow = -clamp((droneShare * 0.75 + rhythmShare * 0.4 - 0.34) * (7.0 + strength * 8.2), 0, 8.5);
  const spaceMid = clamp((airAmt * 0.9 - density * 0.78) * 4.2, -4.2, 2.8);
  const spaceAir = clamp((airAmt - density * 0.82) * 6.0, -5.2, 3.2);

  const mainLow = -clamp((droneShare - 0.38) * (3.2 + strength * 3.8), 0, 3.8);
  const mainMid = clamp((rhythmShare * 0.45 + droneShare * 0.3 - 0.26) * (1.8 + strength * 2.4), -1.2, 2.6);
  const mainAir = clamp((airAmt * 0.65 - density * 0.42) * 2.8, -2.2, 2.4);

  system.lowShelves.drone?.gain.setTargetAtTime(droneLow * strength, now, 0.14);
  system.midPeaks.drone?.gain.setTargetAtTime(droneMid * strength, now, 0.14);
  system.highShelves.drone?.gain.setTargetAtTime(droneAir * strength, now, 0.14);

  system.lowShelves.rhythm?.gain.setTargetAtTime(rhythmLow * strength, now, 0.14);
  system.midPeaks.rhythm?.gain.setTargetAtTime(rhythmMid * strength, now, 0.14);
  system.highShelves.rhythm?.gain.setTargetAtTime(rhythmAir * strength, now, 0.14);

  system.lowShelves.space?.gain.setTargetAtTime(spaceLow * strength, now, 0.14);
  system.midPeaks.space?.gain.setTargetAtTime(spaceMid * strength, now, 0.14);
  system.highShelves.space?.gain.setTargetAtTime(spaceAir * strength, now, 0.14);

  system.lowShelves.main?.gain.setTargetAtTime(mainLow * strength, now, 0.14);
  system.midPeaks.main?.gain.setTargetAtTime(mainMid * strength, now, 0.14);
  system.highShelves.main?.gain.setTargetAtTime(mainAir * strength, now, 0.14);

  if (system.glue) {
    if (params.enabled) {
      system.glue.threshold.setTargetAtTime(-12 - glueAmt * 8 + density * 2.2, now, 0.18);
      system.glue.knee.setTargetAtTime(8 + glueAmt * 8, now, 0.18);
      system.glue.ratio.setTargetAtTime(1.6 + glueAmt * 4.2, now, 0.18);
      system.glue.attack.setTargetAtTime(0.02 - glueAmt * 0.014, now, 0.18);
      system.glue.release.setTargetAtTime(0.12 + density * 0.18 + glueAmt * 0.08, now, 0.18);
    } else {
      system.glue.threshold.setTargetAtTime(0, now, 0.18);
      system.glue.knee.setTargetAtTime(0, now, 0.18);
      system.glue.ratio.setTargetAtTime(1, now, 0.18);
      system.glue.attack.setTargetAtTime(0.02, now, 0.18);
      system.glue.release.setTargetAtTime(0.12, now, 0.18);
    }
  }

  const trim = clamp(0.96 - density * 0.11 + airAmt * 0.04, 0.82, 1.02);
  system.telemetry = { main: mainShare, drone: droneShare, rhythm: rhythmShare, space: spaceShare, density, trim };
  return system.telemetry;
};
