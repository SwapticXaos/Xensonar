import { createAsymmetricDriveCurve } from './droneDrive';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export interface TransientDriveDeviceRefs {
  input: GainNode;
  output: GainNode;
  tightHP: BiquadFilterNode;
  preGain: GainNode;
  shaper: WaveShaperNode;
  dcBlock: BiquadFilterNode;
  tone: BiquadFilterNode;
  presence: BiquadFilterNode;
  outputGain: GainNode;
  curveAmount: number;
  curveAsymmetry: number;
}

export interface TransientDriveDeviceParams {
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

export const createTransientDriveDevice = (
  ctx: AudioContext,
  destination: AudioNode,
): TransientDriveDeviceRefs => {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const tightHP = ctx.createBiquadFilter();
  const preGain = ctx.createGain();
  const shaper = ctx.createWaveShaper();
  const dcBlock = ctx.createBiquadFilter();
  const tone = ctx.createBiquadFilter();
  const presence = ctx.createBiquadFilter();
  const outputGain = ctx.createGain();

  tightHP.type = 'highpass';
  tightHP.frequency.value = 58;
  tightHP.Q.value = 0.65;
  preGain.gain.value = 1;
  dcBlock.type = 'highpass';
  dcBlock.frequency.value = 28;
  dcBlock.Q.value = 0.22;
  tone.type = 'lowpass';
  tone.frequency.value = 3200;
  tone.Q.value = 0.44;
  presence.type = 'peaking';
  presence.frequency.value = 2100;
  presence.Q.value = 0.92;
  presence.gain.value = 0;
  outputGain.gain.value = 0;
  shaper.curve = createAsymmetricDriveCurve(2.1, 0.08);
  shaper.oversample = '4x';

  input.connect(tightHP);
  tightHP.connect(preGain);
  preGain.connect(shaper);
  shaper.connect(dcBlock);
  dcBlock.connect(tone);
  tone.connect(presence);
  presence.connect(outputGain);
  outputGain.connect(output);
  output.connect(destination);

  return {
    input,
    output,
    tightHP,
    preGain,
    shaper,
    dcBlock,
    tone,
    presence,
    outputGain,
    curveAmount: 2.1,
    curveAsymmetry: 0.08,
  };
};

export const updateTransientDriveDevice = (refs: TransientDriveDeviceRefs, now: number, params: TransientDriveDeviceParams) => {
  const driveEnabled = !!params.enabled;
  const bodyCoupling = clamp(params.bodyCoupling, 0, 1);
  const bodyMotion = params.bodyFlux * 0.65 + params.bodyTension * 0.35;
  const weaveDrive = params.shimmer * 0.16 + params.myzelGate * 0.1;
  const bodyDrive = bodyMotion * (0.06 + bodyCoupling * 0.1) + params.bodyRoughness * (0.08 + bodyCoupling * 0.1);
  const driveAmt = driveEnabled ? clamp(params.amount + weaveDrive + bodyDrive, 0, 1) : 0;
  const driveMix = driveEnabled ? clamp(params.mix + bodyCoupling * params.bodyFlux * 0.06, 0, 1) : 0;
  const driveTone = clamp(
    params.tone + params.shimmer * 0.06 + params.bodyRoughness * 0.08 + params.resonanceFocus * 0.04 - params.bodyTension * 0.03,
    0,
    1,
  );
  const driveOutput = clamp(params.output, 0.15, 1.4);
  const curveAmount = 1.2 + driveAmt * 5.8 + bodyCoupling * params.bodyTension * 1.0;
  const curveAsymmetry = 0.03 + driveAmt * 0.22 + params.myzelGate * 0.03 + bodyCoupling * params.bodyRoughness * 0.08;

  const wetGain = driveMix * (0.68 + driveAmt * 0.48 + bodyCoupling * params.bodyFlux * 0.12);
  const tightHz = 36 + Math.pow(driveAmt, 1.3) * 220 + Math.pow(1 - driveTone, 1.15) * 55 + params.bodyRoughness * 44;
  const toneHz = 880 + Math.pow(driveTone, 1.6) * 7600 + params.resonanceFocus * 360;
  const presenceHz = 1250 + driveTone * 2700 + params.bodyFlux * 360;
  const presenceGain = -1.4 + driveTone * 4.6 + driveAmt * 3.6 + bodyCoupling * params.bodyTension * 1.6;
  const autoTrim = 1 - driveAmt * 0.12 - driveMix * 0.04 - bodyCoupling * params.bodyFlux * 0.02;

  refs.tightHP.frequency.setTargetAtTime(tightHz, now, 0.04);
  refs.tightHP.Q.setTargetAtTime(0.55 + driveAmt * 0.95, now, 0.04);
  refs.preGain.gain.setTargetAtTime(1 + driveAmt * 10.5, now, 0.03);
  refs.dcBlock.frequency.setTargetAtTime(24 + driveAmt * 20 + params.bodyTension * 10, now, 0.04);
  refs.tone.frequency.setTargetAtTime(toneHz, now, 0.04);
  refs.tone.Q.setTargetAtTime(0.36 + driveAmt * 0.92 + params.resonanceFocus * 0.14, now, 0.04);
  refs.presence.frequency.setTargetAtTime(presenceHz, now, 0.04);
  refs.presence.Q.setTargetAtTime(0.7 + driveAmt * 0.82, now, 0.04);
  refs.presence.gain.setTargetAtTime(presenceGain, now, 0.04);
  refs.outputGain.gain.setTargetAtTime(driveEnabled ? driveOutput * wetGain * autoTrim : 0.0001, now, 0.04);

  if (Math.abs(refs.curveAmount - curveAmount) > 0.08 || Math.abs(refs.curveAsymmetry - curveAsymmetry) > 0.015) {
    refs.shaper.curve = createAsymmetricDriveCurve(curveAmount, curveAsymmetry);
    refs.curveAmount = curveAmount;
    refs.curveAsymmetry = curveAsymmetry;
  }
};
