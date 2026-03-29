const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export type EnterHoldPsyFxOptions = {
  enabled: boolean;
  bpm: number;
  depth: number;
  color: number;
  flicker: number;
  mix: number;
  bassMotion: number;
  outputGain: number;
};

export type EnterHoldPsyFxDevice = {
  waveInput: GainNode;
  bassInput: GainNode;
  output: GainNode;
  setOptions: (options: EnterHoldPsyFxOptions, now?: number) => void;
  disconnect: () => void;
};

export const createEnterHoldPsyFxDevice = (
  ctx: AudioContext,
  options: EnterHoldPsyFxOptions & { destination: AudioNode },
): EnterHoldPsyFxDevice => {
  const waveInput = ctx.createGain();
  const bassInput = ctx.createGain();
  const output = ctx.createGain();

  const wavePre = ctx.createBiquadFilter();
  const waveTone = ctx.createBiquadFilter();
  const bassPre = ctx.createBiquadFilter();
  const bassTone = ctx.createBiquadFilter();
  const bassDrive = ctx.createWaveShaper();

  const waveAp1 = ctx.createBiquadFilter();
  const waveAp2 = ctx.createBiquadFilter();
  const waveAp3 = ctx.createBiquadFilter();
  const bassAp1 = ctx.createBiquadFilter();
  const bassAp2 = ctx.createBiquadFilter();

  const waveWet = ctx.createGain();
  const bassWet = ctx.createGain();
  const waveFeedback = ctx.createGain();
  const bassFeedback = ctx.createGain();

  const phaseLfo = ctx.createOscillator();
  const phaseDepthWaveA = ctx.createGain();
  const phaseDepthWaveB = ctx.createGain();
  const phaseDepthWaveC = ctx.createGain();
  const phaseDepthBassA = ctx.createGain();
  const phaseDepthBassB = ctx.createGain();

  const flickerLfo = ctx.createOscillator();
  const flickerWaveDepth = ctx.createGain();
  const flickerBassDepth = ctx.createGain();

  output.gain.value = 0.85;
  waveInput.gain.value = 0;
  bassInput.gain.value = 0;

  wavePre.type = "highpass";
  wavePre.frequency.value = 180;
  wavePre.Q.value = 0.6;
  waveTone.type = "bandpass";
  waveTone.frequency.value = 1200;
  waveTone.Q.value = 0.75;

  bassPre.type = "lowpass";
  bassPre.frequency.value = 980;
  bassPre.Q.value = 0.7;
  bassTone.type = "bandpass";
  bassTone.frequency.value = 420;
  bassTone.Q.value = 1.2;

  [waveAp1, waveAp2, waveAp3, bassAp1, bassAp2].forEach((node) => {
    node.type = "allpass";
    node.Q.value = 0.75;
  });
  waveAp1.frequency.value = 480;
  waveAp2.frequency.value = 860;
  waveAp3.frequency.value = 1420;
  bassAp1.frequency.value = 170;
  bassAp2.frequency.value = 320;

  waveWet.gain.value = 0.0001;
  bassWet.gain.value = 0.0001;
  waveFeedback.gain.value = 0.14;
  bassFeedback.gain.value = 0.08;

  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i += 1) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * 1.8);
  }
  bassDrive.curve = curve;
  bassDrive.oversample = "4x";

  waveInput.connect(wavePre);
  wavePre.connect(waveTone);
  waveTone.connect(waveAp1);
  waveAp1.connect(waveAp2);
  waveAp2.connect(waveAp3);
  waveAp3.connect(waveWet);
  waveWet.connect(output);
  waveAp3.connect(waveFeedback);
  waveFeedback.connect(waveAp1);

  bassInput.connect(bassPre);
  bassPre.connect(bassDrive);
  bassDrive.connect(bassTone);
  bassTone.connect(bassAp1);
  bassAp1.connect(bassAp2);
  bassAp2.connect(bassWet);
  bassWet.connect(output);
  bassAp2.connect(bassFeedback);
  bassFeedback.connect(bassAp1);

  phaseLfo.type = "triangle";
  flickerLfo.type = "sine";

  phaseLfo.connect(phaseDepthWaveA);
  phaseLfo.connect(phaseDepthWaveB);
  phaseLfo.connect(phaseDepthWaveC);
  phaseLfo.connect(phaseDepthBassA);
  phaseLfo.connect(phaseDepthBassB);
  phaseDepthWaveA.connect(waveAp1.frequency);
  phaseDepthWaveB.connect(waveAp2.frequency);
  phaseDepthWaveC.connect(waveAp3.frequency);
  phaseDepthBassA.connect(bassAp1.frequency);
  phaseDepthBassB.connect(bassAp2.frequency);

  flickerLfo.connect(flickerWaveDepth);
  flickerLfo.connect(flickerBassDepth);
  flickerWaveDepth.connect(waveWet.gain);
  flickerBassDepth.connect(bassWet.gain);

  output.connect(options.destination);
  phaseLfo.start();
  flickerLfo.start();

  const setOptions = (next: EnterHoldPsyFxOptions, now = ctx.currentTime) => {
    const enabled = !!next.enabled;
    const bpm = clamp(next.bpm, 60, 220);
    const depth = clamp(next.depth, 0, 1);
    const color = clamp(next.color, 0, 1);
    const flicker = clamp(next.flicker, 0, 1);
    const mix = clamp(next.mix, 0, 1);
    const bassMotion = clamp(next.bassMotion, 0, 1);
    const outputGain = clamp(next.outputGain, 0, 1.5);

    const rate = (bpm / 60) * 4 * (0.9 + flicker * 0.3);
    phaseLfo.frequency.setTargetAtTime(enabled ? rate * 0.5 : 0.001, now, 0.08);
    flickerLfo.frequency.setTargetAtTime(enabled ? rate : 0.001, now, 0.08);

    waveTone.frequency.setTargetAtTime(700 + color * 2100, now, 0.1);
    waveTone.Q.setTargetAtTime(0.6 + depth * 1.8, now, 0.1);
    bassPre.frequency.setTargetAtTime(520 + bassMotion * 1200, now, 0.1);
    bassTone.frequency.setTargetAtTime(180 + color * 680 + bassMotion * 120, now, 0.1);
    bassTone.Q.setTargetAtTime(0.9 + bassMotion * 1.8, now, 0.1);

    phaseDepthWaveA.gain.setTargetAtTime(enabled ? 160 + depth * 420 : 0, now, 0.1);
    phaseDepthWaveB.gain.setTargetAtTime(enabled ? 220 + depth * 680 : 0, now, 0.1);
    phaseDepthWaveC.gain.setTargetAtTime(enabled ? 340 + depth * 920 : 0, now, 0.1);
    phaseDepthBassA.gain.setTargetAtTime(enabled ? 90 + bassMotion * 180 : 0, now, 0.1);
    phaseDepthBassB.gain.setTargetAtTime(enabled ? 120 + bassMotion * 240 : 0, now, 0.1);

    const waveBaseWet = enabled ? 0.18 + mix * 0.34 : 0.0001;
    const bassBaseWet = enabled ? 0.08 + mix * 0.18 : 0.0001;
    waveWet.gain.setTargetAtTime(waveBaseWet, now, 0.08);
    bassWet.gain.setTargetAtTime(bassBaseWet, now, 0.08);
    flickerWaveDepth.gain.setTargetAtTime(enabled ? waveBaseWet * (0.35 + flicker * 0.4) : 0, now, 0.08);
    flickerBassDepth.gain.setTargetAtTime(enabled ? bassBaseWet * (0.18 + bassMotion * 0.24) : 0, now, 0.08);

    waveFeedback.gain.setTargetAtTime(enabled ? 0.08 + depth * 0.2 : 0, now, 0.1);
    bassFeedback.gain.setTargetAtTime(enabled ? 0.04 + bassMotion * 0.1 : 0, now, 0.1);
    output.gain.setTargetAtTime(outputGain, now, 0.1);
  };

  setOptions(options, ctx.currentTime);

  return {
    waveInput,
    bassInput,
    output,
    setOptions,
    disconnect() {
      try { phaseLfo.stop(); } catch {}
      try { flickerLfo.stop(); } catch {}
      [
        waveInput, bassInput, output, wavePre, waveTone, bassPre, bassTone, bassDrive,
        waveAp1, waveAp2, waveAp3, bassAp1, bassAp2, waveWet, bassWet,
        waveFeedback, bassFeedback, phaseLfo, flickerLfo, phaseDepthWaveA, phaseDepthWaveB,
        phaseDepthWaveC, phaseDepthBassA, phaseDepthBassB, flickerWaveDepth, flickerBassDepth,
      ].forEach((node) => {
        try { node.disconnect(); } catch {}
      });
    },
  };
};
