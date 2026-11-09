export function resolveKeyboardWindowBounds(offset: number, gridLength: number, windowSize: number) {
  const safeLength = Math.max(0, gridLength);
  const start = Math.max(0, Math.min(Math.round(offset), Math.max(0, safeLength - 1)));
  const end = Math.max(start, Math.min(safeLength - 1, start + windowSize - 1));
  return { start, end };
}

export function readKeyboardWindowEdgeFrequencies(grid: number[], start: number, end: number) {
  return {
    firstHz: grid[start] ?? null,
    lastHz: grid[end] ?? null,
  };
}
