import type { MutableRefObject } from "react";
import type { AppDroneGraphRoutingBoundaryDeps } from "./useAppDroneGraphRoutingBoundary";
import type {
  ResonanceNexusRuntimeRefObject,
  ResonanceNexusRuntimeRefs,
} from "../rooms/resonanceNexusRuntimeRefs";

type AppMyzelDroneGraphPortArgs = {
  readonly nexusRefs: ResonanceNexusRuntimeRefObject;
  readonly getDroneVolume: () => number;
  readonly getLiveMasterBus: (
    ctx: AudioContext,
    role?: "main" | "drone" | "rhythm" | "space",
  ) => GainNode;
  readonly ensureCollectiveMemoryFx: (ctx: AudioContext) => any;
  readonly ensurePsychedelicSpiralDevice: (ctx: AudioContext) => any;
  readonly myzelPostFxSendsRef: MutableRefObject<any>;
  readonly myzelPostFxConnectionsRef: MutableRefObject<any>;
  readonly psychedelicSpiralSendsRef: MutableRefObject<any>;
  readonly transientDriveSendsRef: MutableRefObject<any>;
  readonly schwarmdeuterSendsRef: MutableRefObject<any>;
};

export type AppMyzelSynthGraphPorts = {
  readonly nexusRefs: ResonanceNexusRuntimeRefObject;
  readonly getLiveMasterBus: AppMyzelDroneGraphPortArgs["getLiveMasterBus"];
  readonly ensureCollectiveMemoryFx: AppMyzelDroneGraphPortArgs["ensureCollectiveMemoryFx"];
  readonly ensurePsychedelicSpiralDevice: AppMyzelDroneGraphPortArgs["ensurePsychedelicSpiralDevice"];
  readonly myzelPostFxSendsRef: MutableRefObject<any>;
  readonly myzelPostFxConnectionsRef: MutableRefObject<any>;
  readonly psychedelicSpiralSendsRef: MutableRefObject<any>;
  readonly schwarmdeuterSendsRef: MutableRefObject<any>;
  readonly noWaveStarterPolicyOwnedHere: true;
  readonly noRootFollowPolicyOwnedHere: true;
  readonly doesNotCreateAudioNodesHere: true;
  readonly keepsEnsureMyzelSynthInAppTsx: true;
};

export type AppMyzelDroneGraphPorts = {
  readonly droneGraphRouting: AppDroneGraphRoutingBoundaryDeps;
  readonly myzelSynthGraph: AppMyzelSynthGraphPorts;
  readonly portMapOnlyNoAudioNodeFactoryMoved: true;
};

export function buildAppMyzelDroneGraphPorts(
  args: AppMyzelDroneGraphPortArgs,
): AppMyzelDroneGraphPorts {
  return {
    droneGraphRouting: {
      nexusRefs: args.nexusRefs,
      getDroneVolume: args.getDroneVolume,
      getLiveMasterBus: args.getLiveMasterBus,
      ensureCollectiveMemoryFx: args.ensureCollectiveMemoryFx,
      ensurePsychedelicSpiralDevice: args.ensurePsychedelicSpiralDevice,
      myzelPostFxSendsRef: args.myzelPostFxSendsRef,
      myzelPostFxConnectionsRef: args.myzelPostFxConnectionsRef,
      psychedelicSpiralSendsRef: args.psychedelicSpiralSendsRef,
      transientDriveSendsRef: args.transientDriveSendsRef,
      schwarmdeuterSendsRef: args.schwarmdeuterSendsRef,
      noWaveStarterPolicyOwnedHere: true,
      noRootFollowPolicyOwnedHere: true,
    },
    myzelSynthGraph: {
      nexusRefs: args.nexusRefs,
      getLiveMasterBus: args.getLiveMasterBus,
      ensureCollectiveMemoryFx: args.ensureCollectiveMemoryFx,
      ensurePsychedelicSpiralDevice: args.ensurePsychedelicSpiralDevice,
      myzelPostFxSendsRef: args.myzelPostFxSendsRef,
      myzelPostFxConnectionsRef: args.myzelPostFxConnectionsRef,
      psychedelicSpiralSendsRef: args.psychedelicSpiralSendsRef,
      schwarmdeuterSendsRef: args.schwarmdeuterSendsRef,
      noWaveStarterPolicyOwnedHere: true,
      noRootFollowPolicyOwnedHere: true,
      doesNotCreateAudioNodesHere: true,
      keepsEnsureMyzelSynthInAppTsx: true,
    },
    portMapOnlyNoAudioNodeFactoryMoved: true,
  };
}

export type AppMyzelSynthGraphNodeSet = {
  readonly carrierOsc: OscillatorNode;
  readonly subOsc: OscillatorNode;
  readonly carrierGain: GainNode;
  readonly subGain: GainNode;
  readonly bodyGain: GainNode;
  readonly lowpass: BiquadFilterNode;
  readonly pan: StereoPannerNode;
  readonly driveGain: GainNode;
  readonly driveShaper: WaveShaperNode;
  readonly colorPostGain: GainNode;
  readonly airSend: GainNode;
  readonly airWetGain: GainNode;
  readonly airDelay: DelayNode;
  readonly airFeedback: GainNode;
  readonly airHighpass: BiquadFilterNode;
  readonly master: GainNode;
  readonly formantFilters: BiquadFilterNode[];
  readonly formantGains: GainNode[];
  readonly overtoneOscs: OscillatorNode[];
  readonly overtoneGains: GainNode[];
  readonly constellationFilter: BiquadFilterNode;
  readonly constellationOscs: OscillatorNode[];
  readonly constellationGains: GainNode[];
};

export type AppMyzelSynthDriveDefaults = {
  readonly driveEnabled: boolean;
  readonly driveAmount: number;
  readonly createDriveCurve: (amount: number) => WaveShaperNode["curve"];
};

export function createAppMyzelSynthGraphNodeSet(
  ctx: AudioContext,
): AppMyzelSynthGraphNodeSet {
  const carrierOsc = ctx.createOscillator();
  const subOsc = ctx.createOscillator();
  const carrierGain = ctx.createGain();
  const subGain = ctx.createGain();
  const lowpass = ctx.createBiquadFilter();
  const bodyGain = ctx.createGain();
  const pan = ctx.createStereoPanner();
  const driveGain = ctx.createGain();
  const driveShaper = ctx.createWaveShaper();
  const colorPostGain = ctx.createGain();
  const airSend = ctx.createGain();
  const airWetGain = ctx.createGain();
  const airDelay = ctx.createDelay(2.4);
  const airFeedback = ctx.createGain();
  const airHighpass = ctx.createBiquadFilter();
  const master = ctx.createGain();

  const formantFilters: BiquadFilterNode[] = [];
  const formantGains: GainNode[] = [];
  for (let i = 0; i < 3; i += 1) {
    formantFilters.push(ctx.createBiquadFilter());
    formantGains.push(ctx.createGain());
  }

  const overtoneOscs: OscillatorNode[] = [];
  const overtoneGains: GainNode[] = [];
  for (let i = 0; i < 3; i += 1) {
    overtoneOscs.push(ctx.createOscillator());
    overtoneGains.push(ctx.createGain());
  }

  const constellationFilter = ctx.createBiquadFilter();
  const constellationOscs: OscillatorNode[] = [];
  const constellationGains: GainNode[] = [];
  for (let i = 0; i < 3; i += 1) {
    constellationOscs.push(ctx.createOscillator());
    constellationGains.push(ctx.createGain());
  }

  return {
    carrierOsc,
    subOsc,
    carrierGain,
    subGain,
    bodyGain,
    lowpass,
    pan,
    driveGain,
    driveShaper,
    colorPostGain,
    airSend,
    airWetGain,
    airDelay,
    airFeedback,
    airHighpass,
    master,
    formantFilters,
    formantGains,
    overtoneOscs,
    overtoneGains,
    constellationFilter,
    constellationOscs,
    constellationGains,
  };
}

export function configureAppMyzelSynthGraphDefaults(
  nodes: AppMyzelSynthGraphNodeSet,
  driveDefaults: AppMyzelSynthDriveDefaults,
) {
  configureAppMyzelSynthCoreNodeDefaults(nodes, driveDefaults);
  nodes.formantFilters.forEach((filter, index) => {
    configureAppMyzelSynthFormantNodeDefaults(
      index,
      filter,
      nodes.formantGains[index],
    );
  });
  nodes.overtoneOscs.forEach((osc, index) => {
    configureAppMyzelSynthOvertoneNodeDefaults(
      index,
      osc,
      nodes.overtoneGains[index],
    );
  });
  configureAppMyzelSynthConstellationFilterDefaults(nodes.constellationFilter);
  nodes.constellationOscs.forEach((osc, index) => {
    configureAppMyzelSynthConstellationNodeDefaults(
      index,
      osc,
      nodes.constellationGains[index],
    );
  });
}

export function connectAppMyzelSynthCoreRouting(
  nodes: AppMyzelSynthGraphNodeSet,
) {
  nodes.carrierOsc.connect(nodes.carrierGain);
  nodes.subOsc.connect(nodes.subGain);
  nodes.carrierGain.connect(nodes.lowpass);
  nodes.subGain.connect(nodes.lowpass);
  nodes.lowpass.connect(nodes.bodyGain);
  nodes.bodyGain.connect(nodes.pan);
}

export function connectAppMyzelSynthFormantRouting(
  nodes: AppMyzelSynthGraphNodeSet,
) {
  nodes.formantFilters.forEach((filter, index) => {
    const gain = nodes.formantGains[index];
    nodes.lowpass.connect(filter);
    filter.connect(gain);
    gain.connect(nodes.pan);
  });
}

export function connectAppMyzelSynthOvertoneRouting(
  nodes: AppMyzelSynthGraphNodeSet,
) {
  nodes.overtoneOscs.forEach((osc, index) => {
    const gain = nodes.overtoneGains[index];
    osc.connect(gain);
    gain.connect(nodes.pan);
  });
}

export function startAppMyzelSynthOvertoneOscillators(
  nodes: AppMyzelSynthGraphNodeSet,
) {
  nodes.overtoneOscs.forEach((osc) => osc.start());
}

export function connectAppMyzelSynthConstellationRouting(
  nodes: AppMyzelSynthGraphNodeSet,
) {
  nodes.constellationOscs.forEach((osc, index) => {
    const gain = nodes.constellationGains[index];
    osc.connect(gain);
    gain.connect(nodes.constellationFilter);
  });
  nodes.constellationFilter.connect(nodes.pan);
}

export function startAppMyzelSynthConstellationOscillators(
  nodes: AppMyzelSynthGraphNodeSet,
) {
  nodes.constellationOscs.forEach((osc) => osc.start());
}

export function connectAppMyzelSynthOutputRouting(
  nodes: AppMyzelSynthGraphNodeSet,
  outputBus: GainNode,
) {
  nodes.pan.connect(nodes.driveGain);
  nodes.driveGain.connect(nodes.driveShaper);
  nodes.driveShaper.connect(nodes.colorPostGain);
  nodes.colorPostGain.connect(nodes.master);
  nodes.master.connect(outputBus);
}

export function connectAppMyzelSynthAirRouting(
  nodes: AppMyzelSynthGraphNodeSet,
  outputBus: GainNode,
) {
  nodes.colorPostGain.connect(nodes.airSend);
  nodes.airSend.connect(nodes.airHighpass);
  nodes.airHighpass.connect(nodes.airDelay);
  nodes.airDelay.connect(nodes.airFeedback);
  nodes.airFeedback.connect(nodes.airHighpass);
  nodes.airDelay.connect(nodes.airWetGain);
  nodes.airWetGain.connect(outputBus);
}

export function connectAppMyzelSynthAuxFxSends(
  nodes: AppMyzelSynthGraphNodeSet,
  ports: AppMyzelSynthGraphPorts,
  ctx: AudioContext,
) {
  const collectiveFx = ports.ensureCollectiveMemoryFx(ctx);
  const spiralDevice = ports.ensurePsychedelicSpiralDevice(ctx);
  if (collectiveFx.myzel) {
    nodes.master.connect(collectiveFx.myzel.input);
  }
  if (spiralDevice && ports.psychedelicSpiralSendsRef.current.myzel) {
    nodes.master.connect(ports.psychedelicSpiralSendsRef.current.myzel);
  }
  if (ports.schwarmdeuterSendsRef.current.myzel) {
    nodes.master.connect(ports.schwarmdeuterSendsRef.current.myzel);
  }
}

export function startAppMyzelSynthCoreOscillators(
  nodes: AppMyzelSynthGraphNodeSet,
) {
  nodes.carrierOsc.start();
  nodes.subOsc.start();
}

export function connectAppMyzelSynthPostFxSend(
  nodes: AppMyzelSynthGraphNodeSet,
  ports: AppMyzelSynthGraphPorts,
) {
  if (
    ports.myzelPostFxSendsRef.current.myzel &&
    !ports.myzelPostFxConnectionsRef.current.myzel
  ) {
    nodes.master.connect(ports.myzelPostFxSendsRef.current.myzel);
    ports.myzelPostFxConnectionsRef.current.myzel = true;
  }
}

export function configureAppMyzelSynthCoreNodeDefaults(
  nodes: Pick<
    AppMyzelSynthGraphNodeSet,
    | "carrierOsc"
    | "subOsc"
    | "carrierGain"
    | "subGain"
    | "bodyGain"
    | "lowpass"
    | "driveGain"
    | "driveShaper"
    | "colorPostGain"
    | "airSend"
    | "airWetGain"
    | "airDelay"
    | "airFeedback"
    | "airHighpass"
    | "master"
  >,
  driveDefaults: AppMyzelSynthDriveDefaults,
) {
  nodes.carrierOsc.type = "sawtooth";
  nodes.subOsc.type = "triangle";
  nodes.carrierGain.gain.value = 0.0001;
  nodes.subGain.gain.value = 0.0001;
  nodes.bodyGain.gain.value = 0.0001;
  nodes.lowpass.type = "lowpass";
  nodes.lowpass.frequency.value = 900;
  nodes.lowpass.Q.value = 0.85;
  nodes.driveGain.gain.value = 1;
  nodes.driveShaper.curve = driveDefaults.driveEnabled
    ? driveDefaults.createDriveCurve(driveDefaults.driveAmount)
    : null;
  nodes.driveShaper.oversample = driveDefaults.driveEnabled ? "4x" : "none";
  nodes.colorPostGain.gain.value = 1;
  nodes.airSend.gain.value = 0.0001;
  nodes.airWetGain.gain.value = 0.0001;
  nodes.airDelay.delayTime.value = 0.34;
  nodes.airFeedback.gain.value = 0.35;
  nodes.airHighpass.type = "highpass";
  nodes.airHighpass.frequency.value = 1450;
  nodes.master.gain.value = 0.0001;
}

export function configureAppMyzelSynthFormantNodeDefaults(
  index: number,
  filter: BiquadFilterNode,
  gain: GainNode,
) {
  filter.type = "bandpass";
  filter.frequency.value = 420 + index * 320;
  filter.Q.value = 4;
  gain.gain.value = 0.0001;
}

export function configureAppMyzelSynthOvertoneNodeDefaults(
  index: number,
  osc: OscillatorNode,
  gain: GainNode,
) {
  osc.type = index === 0 ? "triangle" : "sine";
  gain.gain.value = 0.0001;
}

export function configureAppMyzelSynthConstellationFilterDefaults(
  filter: BiquadFilterNode,
) {
  filter.type = "bandpass";
  filter.frequency.value = 1100;
  filter.Q.value = 2.2;
}

export function configureAppMyzelSynthConstellationNodeDefaults(
  index: number,
  osc: OscillatorNode,
  gain: GainNode,
) {
  osc.type = index === 0 ? "triangle" : index === 1 ? "sine" : "sawtooth";
  gain.gain.value = 0.0001;
}

export function registerAppMyzelSynthGraphNodes(
  refs: ResonanceNexusRuntimeRefs,
  nodes: AppMyzelSynthGraphNodeSet,
) {
  refs.myzelCarrierOsc = nodes.carrierOsc;
  refs.myzelSubOsc = nodes.subOsc;
  refs.myzelCarrierGain = nodes.carrierGain;
  refs.myzelSubGain = nodes.subGain;
  refs.myzelBodyGain = nodes.bodyGain;
  refs.myzelLowpass = nodes.lowpass;
  refs.myzelPan = nodes.pan;
  refs.myzelDriveGain = nodes.driveGain;
  refs.myzelDriveShaper = nodes.driveShaper;
  refs.myzelColorPostGain = nodes.colorPostGain;
  refs.myzelAirSend = nodes.airSend;
  refs.myzelAirWetGain = nodes.airWetGain;
  refs.myzelAirDelay = nodes.airDelay;
  refs.myzelAirFeedback = nodes.airFeedback;
  refs.myzelAirHighpass = nodes.airHighpass;
  refs.myzelMasterGain = nodes.master;
  refs.myzelFormantFilters = nodes.formantFilters;
  refs.myzelFormantGains = nodes.formantGains;
  refs.myzelOvertoneOscs = nodes.overtoneOscs;
  refs.myzelOvertoneGains = nodes.overtoneGains;
  refs.myzelConstellationFilter = nodes.constellationFilter;
  refs.myzelConstellationOscs = nodes.constellationOscs;
  refs.myzelConstellationGains = nodes.constellationGains;
}
