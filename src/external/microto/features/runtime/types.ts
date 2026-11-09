export type SemanticNode = {
  x: number;
  y: number;
  freq: number;
  energy: number;
  label: string;
};

export type NexusAgent = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ratio: number;
  label: string;
  phase: number;
  lastHit: number;
  history: { x: number; y: number }[];
};

export type NexusRipple = {
  x: number;
  y: number;
  radius: number;
  prevRadius?: number;
  life: number;
  direction?: "left" | "right" | "up" | "down";
  hitAgents?: number[];
  lastImpactAt?: number;
};

export type DirectedPulse = {
  x: number;
  y: number;
  radius: number;
  prevRadius?: number;
  life: number;
  direction: "left" | "right" | "up" | "down";
  hitAgents: number[];
  persistent?: boolean;
  speed?: number;
  lastImpactAt?: number;
};
