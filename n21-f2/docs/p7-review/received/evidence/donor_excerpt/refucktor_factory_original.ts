function createDroneVoice(ctx: AudioContext, destination: AudioNode, frequency: number, preset: DronePreset) {
  const root = ctx.createOscillator();
  const upper = ctx.createOscillator();
  const gain = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  filter.type = "lowpass";
  filter.frequency.value = 1800;
  filter.Q.value = 0.7;

  root.frequency.value = frequency;
  upper.frequency.value = frequency * 1.5;
  lfo.frequency.value = 0.11;
  lfoGain.gain.value = 14;
  lfo.connect(lfoGain);
  lfoGain.connect(root.detune);
  lfoGain.connect(upper.detune);

  switch (preset) {
    case "warm_pad":
      root.type = "triangle";
      upper.type = "sine";
      gain.gain.value = 0.08;
      break;
    case "reed_drone":
      root.type = "sawtooth";
      upper.type = "triangle";
      gain.gain.value = 0.055;
      filter.frequency.value = 1400;
      break;
    case "pulse_matrix":
      root.type = "square";
      upper.type = "square";
      gain.gain.value = 0.03;
      lfo.frequency.value = 1.4;
      lfoGain.gain.value = 22;
      break;
    case "dark_sub":
      root.type = "sine";
      upper.type = "triangle";
      gain.gain.value = 0.11;
      filter.frequency.value = 700;
      break;
    case "ethereal_halo":
      root.type = "sine";
      upper.type = "sine";
      gain.gain.value = 0.06;
      filter.frequency.value = 2200;
      break;
  }

  const targetGain = Math.max(gain.gain.value, 0.0001);
  gain.gain.value = 0.0001;

  root.connect(filter);
  upper.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  const startAt = ctx.currentTime + 0.01;
  gain.gain.cancelScheduledValues(startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(targetGain, startAt + 0.28);

  root.start(startAt);
  upper.start(startAt);
  lfo.start(startAt);

  return {
    gain,
    stop: () => {
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      root.stop(t + 0.7);
      upper.stop(t + 0.7);
      lfo.stop(t + 0.7);
    },
  };
}

function drawInstallationField(
  ctx: CanvasRenderingContext2D,
