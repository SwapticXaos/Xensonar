import type { QuantizeGrid } from '../domain/instrumentData';

export const PARTICLE_QUANTIZE_GRID_OPTIONS = [16, 24, 27, 32, 64] as const;

export function getNextQuantizeGrid(grid: QuantizeGrid): QuantizeGrid {
  const safeGrid = Number.isFinite(grid) ? Math.round(grid) : 16;
  const index = PARTICLE_QUANTIZE_GRID_OPTIONS.findIndex((candidate) => candidate === safeGrid);
  return PARTICLE_QUANTIZE_GRID_OPTIONS[(index + 1 + PARTICLE_QUANTIZE_GRID_OPTIONS.length) % PARTICLE_QUANTIZE_GRID_OPTIONS.length];
}

export function isDefaultParticleQuantizeGrid(grid: QuantizeGrid): grid is (typeof PARTICLE_QUANTIZE_GRID_OPTIONS)[number] {
  return PARTICLE_QUANTIZE_GRID_OPTIONS.includes(Math.round(grid) as (typeof PARTICLE_QUANTIZE_GRID_OPTIONS)[number]);
}

export function normalizeParticleQuantizeGrid(grid: QuantizeGrid, fallback: QuantizeGrid = 16): QuantizeGrid {
  const value = Number.isFinite(grid) ? Math.round(grid) : Math.round(fallback);
  return Math.max(1, Math.min(256, value));
}
