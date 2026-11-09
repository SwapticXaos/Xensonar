/**
 * Shared harmonic node data (vision §6: "shared tuning/math modules").
 *
 * JI_NODES is tuning/math data used by topology (manifold nodes), arena (anchor nodes),
 * and resonance (canvas draw, mapping, particles, drone overtones). Lives in shared
 * so topology and arena do not depend on resonance domain.
 */

export const JI_NODES = [
  { ratio: 1 / 1, cents: 0, label: "Root" },
  { ratio: 9 / 8, cents: 203.9, label: "9/8" },
  { ratio: 6 / 5, cents: 315.6, label: "6/5" },
  { ratio: 5 / 4, cents: 386.3, label: "5/4" },
  { ratio: 4 / 3, cents: 498.0, label: "4/3" },
  { ratio: 11 / 8, cents: 551.3, label: "11/8" },
  { ratio: 3 / 2, cents: 701.9, label: "3/2" },
  { ratio: 8 / 5, cents: 813.7, label: "8/5" },
  { ratio: 13 / 8, cents: 840.5, label: "13/8" },
  { ratio: 5 / 3, cents: 884.3, label: "5/3" },
  { ratio: 7 / 4, cents: 968.8, label: "7/4" },
  { ratio: 15 / 8, cents: 1088.3, label: "15/8" },
];
