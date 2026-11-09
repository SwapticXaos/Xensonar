import type { RefactorTopologyLegacyAudioState } from "./refactorTopologyLegacyAudio";
import { createMyzelNodeColorDriveCurve, createMyzelNoiseBuffer } from "./refactorTopologyNodeAura";

export const ensureRefactorTopologyLegacyAudio = (
  ctx: AudioContext,
  state: RefactorTopologyLegacyAudioState,
  destination: AudioNode,
) => {
  if (!state.nodeMasterGain) {
    const nodeOsc = ctx.createOscillator();
    nodeOsc.type = "sine";
    const nodeOvertoneOsc = ctx.createOscillator();
    nodeOvertoneOsc.type = "triangle";
    const nodeColorOsc = ctx.createOscillator();
    nodeColorOsc.type = "sawtooth";
    const nodeNoiseSource = ctx.createBufferSource();
    nodeNoiseSource.buffer = createMyzelNoiseBuffer(ctx);
    nodeNoiseSource.loop = true;

    const holdGain = ctx.createGain();
    holdGain.gain.value = 0.0001;
    const accentGain = ctx.createGain();
    accentGain.gain.value = 0.0001;
    const colorGain = ctx.createGain();
    colorGain.gain.value = 0.0001;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.0001;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 660;
    filter.Q.value = 3.2;
    const driveGain = ctx.createGain();
    driveGain.gain.value = 1;
    const driveShaper = ctx.createWaveShaper();
    driveShaper.curve = createMyzelNodeColorDriveCurve();
    driveShaper.oversample = "2x";
    const pan = ctx.createStereoPanner();
    const master = ctx.createGain();
    master.gain.value = 0.0001;

    nodeOsc.connect(holdGain);
    nodeOvertoneOsc.connect(accentGain);
    nodeColorOsc.connect(colorGain);
    nodeNoiseSource.connect(noiseGain);
    holdGain.connect(filter);
    accentGain.connect(filter);
    colorGain.connect(filter);
    noiseGain.connect(filter);
    filter.connect(driveGain);
    driveGain.connect(driveShaper);
    driveShaper.connect(pan);
    pan.connect(master);
    master.connect(destination);

    nodeOsc.start();
    nodeOvertoneOsc.start();
    nodeColorOsc.start();
    nodeNoiseSource.start();

    state.nodeOsc = nodeOsc;
    state.nodeOvertoneOsc = nodeOvertoneOsc;
    state.nodeColorOsc = nodeColorOsc;
    state.nodeNoiseSource = nodeNoiseSource;
    state.nodeHoldGain = holdGain;
    state.nodeAccentGain = accentGain;
    state.nodeColorGain = colorGain;
    state.nodeNoiseGain = noiseGain;
    state.nodeDriveGain = driveGain;
    state.nodeDriveShaper = driveShaper;
    state.nodeFilter = filter;
    state.nodePan = pan;
    state.nodeMasterGain = master;
  }

  if (!state.demoRootMasterGain) {
    const rootOsc = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const rootGain = ctx.createGain();
    const subGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const pan = ctx.createStereoPanner();
    const master = ctx.createGain();

    rootOsc.type = "triangle";
    subOsc.type = "sine";
    rootGain.gain.value = 0.0001;
    subGain.gain.value = 0.0001;
    filter.type = "lowpass";
    filter.frequency.value = 190;
    filter.Q.value = 0.35;
    master.gain.value = 0.0001;

    rootOsc.connect(rootGain);
    subOsc.connect(subGain);
    rootGain.connect(filter);
    subGain.connect(filter);
    filter.connect(pan);
    pan.connect(master);
    master.connect(destination);

    rootOsc.start();
    subOsc.start();

    state.demoRootOsc = rootOsc;
    state.demoRootSubOsc = subOsc;
    state.demoRootGain = rootGain;
    state.demoRootSubGain = subGain;
    state.demoRootFilter = filter;
    state.demoRootPan = pan;
    state.demoRootMasterGain = master;
  }

  return state;
};

