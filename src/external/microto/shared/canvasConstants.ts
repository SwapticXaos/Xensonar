/**
 * Shared canvas dimensions for consistency across rooms.
 * Single source of truth; aligns with STRUCTURE-optimization (simplify, reduce duplication).
 */

export const CANVAS_WIDTH = 1100;
export const CANVAS_HEIGHT = 580;
/** Commons uses slightly shorter canvas for layout. */
export const CANVAS_HEIGHT_COMMONS = 560;
/** Topology room uses a shorter fixed-height canvas. */
export const CANVAS_HEIGHT_TOPOLOGY = 400;
/** Sandbox (minimal demo) uses smaller canvas. */
export const CANVAS_WIDTH_SANDBOX = 800;
export const CANVAS_HEIGHT_SANDBOX = 480;
