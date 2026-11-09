export type SharedFieldVec2 = { x: number; y: number };

export type SharedFieldNode = {
  id: string;
  label: string;
  kind: "ji-node";
  position: SharedFieldVec2;
  energy: number;
  ratio?: number;
  muted?: boolean;
};

export type SharedFieldBall = {
  id: "oscillator-ball";
  kind: "oscillator-ball";
  position: SharedFieldVec2;
  velocity: SharedFieldVec2;
};

export type SharedFieldParticle = {
  id: string;
  kind: "refactor-particle";
  position: SharedFieldVec2;
  home?: SharedFieldVec2;
  speed?: number;
};

export type SharedFieldEntity = SharedFieldNode | SharedFieldBall | SharedFieldParticle;

export type SharedFieldSnapshot = {
  width: number;
  height: number;
  entities: SharedFieldEntity[];
};
