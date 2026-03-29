const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export interface DroneDriveInsertRefs {
  driveIn: GainNode;
  driveOut: GainNode;
  driveDry: GainNode;
  driveWet: GainNode;
  driveTightHP: BiquadFilterNode;
  drivePreGain: GainNode;
  driveShaper: WaveShaperNode;
  driveDCBlock: BiquadFilterNode;
  driveTone: BiquadFilterNode;
  drivePresence: BiquadFilterNode;
  driveOutputGain: GainNode;
  curveAmount: number;
  curveAsymmetry: number;
}

export interface DroneDriveInsertParams {
  enabled: boolean;
  amount: number;
  tone: number;
  mix: number;
  output: number;
  myzelGate: number;
  shimmer: number;
  bodyCoupling: number;
  bodyFlux: number;
  bodyTension: number;
  bodyRoughness: number;
  resonanceFocus: number;
}

export const createAsymmetricDriveCurve = (amount = 2.4, asymmetry = 0.12) => {
  const n = 8192;
  const curve = new Float32Array(n);
  const drive = 1 + amount * 1.45;
  const bias = asymmetry * 0.62;
  let maxAbs = 0.0001;

  for (let i = 0; i < n; i += 1) {
    const x = (i / (n - 1)) * 2 - 1;
    const biased = x + bias * (1 - Math.abs(x) * 0.58);
    const soft = Math.tanh(drive * biased);
    const cubic = biased - 0.18 * Math.pow(biased, 3);
    const even = Math.sin((biased + bias * 0.25) * Math.PI * 1.5) * 0.06 * (1 - Math.abs(x));
    const y = soft * 0.84 + cubic * 0.16 + even;
    curve[i] = y;
    maxAbs = Math.max(maxAbs, Math.abs(y));
  }

  for (let i = 0; i < n; i += 1) {
    curve[i] = clamp(curve[i] / maxAbs, -1, 1);
  }

  return curve;
};

export const createDroneDriveInsert = (
  ctx: AudioContext,
  groupBus: GainNode,
  volBus: GainNode,
  flangerDelay: DelayNode,
): DroneDriveInsertRefs => {
  const driveIn = ctx.createGain();
  const driveOut = ctx.createGain();
  const driveDry = ctx.createGain();
  const driveWet = ctx.createGain();
  const driveTightHP = ctx.createBiquadFilter();
  const drivePreGain = ctx.createGain();
  const driveShaper = ctx.createWaveShaper();
  const driveDCBlock = ctx.createBiquadFilter();
  const driveTone = ctx.createBiquadFilter();
  const drivePresence = ctx.createBiquadFilter();
  const driveOutputGain = ctx.createGain();

  driveDry.gain.value = 1;
  driveWet.gain.value = 0;
  driveTightHP.type = 'highpass';
  driveTightHP.frequency.value = 48;
  driveTightHP.Q.value = 0.55;
  drivePreGain.gain.value = 1;
  driveDCBlock.type = 'highpass';
  driveDCBlock.frequency.value = 24;
  driveDCBlock.Q.value = 0.18;
  driveTone.type = 'lowpass';
  driveTone.frequency.value = 2800;
  driveTone.Q.value = 0.52;
  drivePresence.type = 'peaking';
  drivePresence.frequency.value = 1800;
  drivePresence.Q.value = 0.85;
  drivePresence.gain.value = 0;
  driveOutputGain.gain.value = 0.9;
  driveShaper.curve = createAsymmetricDriveCurve(2.2, 0.08);
  driveShaper.oversample = '4x';

  groupBus.connect(driveIn);
  driveIn.connect(driveDry);
  driveDry.connect(driveOut);
  driveIn.connect(driveTightHP);
  driveTightHP.connect(drivePreGain);
  drivePreGain.connect(driveShaper);
  driveShaper.connect(driveDCBlock);
  driveDCBlock.connect(driveTone);
  driveTone.connect(drivePresence);
  drivePresence.connect(driveWet);
  driveWet.connect(driveOutputGain);
  driveOutputGain.connect(driveOut);
  driveOut.connect(volBus);
  driveOut.connect(flangerDelay);

  return {
    driveIn,
    driveOut,
    driveDry,
    driveWet,
    driveTightHP,
    drivePreGain,
    driveShaper,
    driveDCBlock,
    driveTone,
    drivePresence,
    driveOutputGain,
    curveAmount: 2.2,
    curveAsymmetry: 0.08,
  };
};

export const updateDroneDriveInsert = (refs: DroneDriveInsertRefs, now: number, params: DroneDriveInsertParams) => {
  const driveEnabled = !!params.enabled;
  const bodyCoupling = clamp(params.bodyCoupling, 0, 1);
  const bodyMotion = params.bodyFlux * 0.65 + params.bodyTension * 0.35;
  const weaveDrive = params.shimmer * 0.18 + params.myzelGate * 0.12;
  const bodyDrive = bodyMotion * (0.08 + bodyCoupling * 0.12) + params.bodyRoughness * (0.06 + bodyCoupling * 0.08);
  const driveAmt = driveEnabled ? clamp(params.amount + weaveDrive + bodyDrive, 0, 1) : 0;
  const driveMix = driveEnabled ? clamp(params.mix + bodyCoupling * params.bodyFlux * 0.08, 0, 1) : 0;
  const driveTone = clamp(
    params.tone + params.shimmer * 0.08 + params.bodyRoughness * 0.07 + params.resonanceFocus * 0.05 - params.bodyTension * 0.03,
    0,
    1,
  );
  const driveOutput = clamp(params.output, 0.3, 1.2);
  const curveAmount = 1.4 + driveAmt * 5.4 + bodyCoupling * params.bodyTension * 0.9;
  const curveAsymmetry = 0.04 + driveAmt * 0.24 + params.myzelGate * 0.04 + bodyCoupling * params.bodyRoughness * 0.07;

  const dryGain = Math.cos(driveMix * Math.PI * 0.5);
  const wetGain = Math.sin(driveMix * Math.PI * 0.5) * (0.88 + driveAmt * 0.28 + bodyCoupling * params.bodyFlux * 0.08);
  const tightHz = 28 + Math.pow(driveAmt, 1.35) * 160 + Math.pow(1 - driveTone, 1.2) * 40 + params.bodyRoughness * 28;
  const toneHz = 760 + Math.pow(driveTone, 1.7) * 7200 + params.resonanceFocus * 420;
  const presenceHz = 1150 + driveTone * 2400 + params.bodyFlux * 320;
  const presenceGain = -1.2 + driveTone * 4.2 + driveAmt * 3.4 + bodyCoupling * params.bodyTension * 1.8;
  const autoTrim = 1 - driveAmt * 0.16 - driveMix * 0.05 - bodyCoupling * params.bodyFlux * 0.03;

  refs.driveDry.gain.setTargetAtTime(dryGain, now, 0.03);
  refs.driveWet.gain.setTargetAtTime(wetGain, now, 0.03);
  refs.driveTightHP.frequency.setTargetAtTime(tightHz, now, 0.04);
  refs.driveTightHP.Q.setTargetAtTime(0.45 + driveAmt * 0.9, now, 0.04);
  refs.drivePreGain.gain.setTargetAtTime(1 + driveAmt * 8.6, now, 0.03);
  refs.driveDCBlock.frequency.setTargetAtTime(22 + driveAmt * 18 + params.bodyTension * 8, now, 0.04);
  refs.driveTone.frequency.setTargetAtTime(toneHz, now, 0.04);
  refs.driveTone.Q.setTargetAtTime(0.4 + driveAmt * 0.9 + params.resonanceFocus * 0.12, now, 0.04);
  refs.drivePresence.frequency.setTargetAtTime(presenceHz, now, 0.04);
  refs.drivePresence.Q.setTargetAtTime(0.65 + driveAmt * 0.8, now, 0.04);
  refs.drivePresence.gain.setTargetAtTime(presenceGain, now, 0.04);
  refs.driveOutputGain.gain.setTargetAtTime(driveOutput * autoTrim, now, 0.04);

  if (Math.abs(refs.curveAmount - curveAmount) > 0.08 || Math.abs(refs.curveAsymmetry - curveAsymmetry) > 0.015) {
    refs.driveShaper.curve = createAsymmetricDriveCurve(curveAmount, curveAsymmetry);
    refs.curveAmount = curveAmount;
    refs.curveAsymmetry = curveAsymmetry;
  }
};
