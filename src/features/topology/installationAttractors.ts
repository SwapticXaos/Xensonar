import type { InstallationFieldConfig } from "./installationFieldConfig";

type Vec2 = { x: number; y: number };
export type WeightedPoint = Vec2 & { weight: number };

export function buildInstallationAttractors(args: {
  active: boolean;
  config: InstallationFieldConfig;
  cursor: Vec2;
  oscillatorBall: Vec2 | null;
}): WeightedPoint[] {
  const { active, config, cursor, oscillatorBall } = args;
  if (!active) return [{ x: cursor.x, y: cursor.y, weight: 1 }];

  const attractors: WeightedPoint[] = [];
  if (config.nomadAttractors.cursor) {
    attractors.push({ x: cursor.x, y: cursor.y, weight: 1 });
  }
  if (config.nomadAttractors.oscillatorBall && oscillatorBall) {
    attractors.push({ x: oscillatorBall.x, y: oscillatorBall.y, weight: 1.2 });
  }
  return attractors;
}
