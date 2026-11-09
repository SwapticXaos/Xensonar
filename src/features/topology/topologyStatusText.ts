export type TopologyStatusSnapshot = {
  activeNodeLabel: string | null;
  maxEnergy: number;
  myceliumBallSpeed: number;
  constellationRatios: number[];
  constellationTension: number;
  constellationFlux: number;
};

export function buildTopologyStatusLine(args: {
  snapshot: TopologyStatusSnapshot;
  room3BodyEnabled: boolean;
  materialLabel: string;
  primedY: number | null;
  primedSource: string;
  freqFromY: (y: number) => number;
}) {
  const { snapshot, room3BodyEnabled, materialLabel, primedY, primedSource, freqFromY } = args;
  return `Myzel: ${snapshot.activeNodeLabel ?? '-'} · Energy ${snapshot.maxEnergy.toFixed(2)} · Drift ${snapshot.myceliumBallSpeed.toFixed(2)} · Sternbild ${snapshot.constellationRatios.map((ratio) => ratio.toFixed(2)).join('/')} · Zug ${snapshot.constellationTension.toFixed(2)} · Flux ${snapshot.constellationFlux.toFixed(2)} · Körper ${room3BodyEnabled ? materialLabel : 'Bypass'} · Prime ${primedY !== null ? `${Math.round(freqFromY(primedY))}Hz/${primedSource}` : '-'}`;
}
