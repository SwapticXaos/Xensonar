#!/usr/bin/env node
import { createServer } from 'vite';

const server = await createServer({
  appType: 'custom',
  server: { middlewareMode: true },
  optimizeDeps: { entries: [] },
  logLevel: 'error',
});
try {
  const mod = await server.ssrLoadModule('/src/features/l3lab/spectralForge/integral/carrierStrangeAttractorPlan.ts');
  const input = {
    sourceCarrierId: 'deterministic-test-carrier',
    durationSec: 6,
    rootHz: 220,
    windows: Array.from({ length: 18 }, (_, index) => {
      const ratio = index / 17;
      return {
        t0: ratio * 6,
        t1: Math.min(6, ratio * 6 + 0.22),
        centerHz: 120 * Math.pow(2, ratio * 2.4),
        energy: 0.2 + 0.55 * Math.abs(Math.sin(ratio * Math.PI * 2)),
        density: 0.15 + 0.5 * Math.abs(Math.sin(ratio * Math.PI * 5)),
        bandwidth: 0.08 + 0.35 * Math.abs(Math.cos(ratio * Math.PI * 3)),
        roughness: 0.1 + 0.65 * Math.max(0, Math.sin(ratio * Math.PI * 4 + 0.4)),
        presence: 0.25 + 0.4 * ratio,
        continuity: 0.8 - 0.45 * Math.abs(Math.sin(ratio * Math.PI * 4)),
      };
    }),
  };
  const options = { seed: 'same-seed', maxSwarmEvents: 160, maxAttractors: 12, tuning: 'free' };
  const a = mod.buildStrangeAttractorCarrierPlan(input, options);
  const b = mod.buildStrangeAttractorCarrierPlan(input, options);
  const c = mod.buildStrangeAttractorCarrierPlan(input, { ...options, seed: 'different-seed' });
  const stableA = JSON.stringify(a);
  const stableB = JSON.stringify(b);
  const stableC = JSON.stringify(c);
  if (stableA !== stableB) {
    throw new Error('same input + same seed did not produce identical plan JSON');
  }
  if (stableA === stableC) {
    throw new Error('different seed produced identical plan JSON; mutation seed is not influencing the swarm');
  }
  if (a.machineId !== 'strange-attractor-schwarmkoerper') throw new Error('wrong machineId');
  if (a.swarmEvents.length <= 0) throw new Error('fixture input produced no swarm events');
  console.log(JSON.stringify({
    ok: true,
    machineId: a.machineId,
    attractors: a.attractors.length,
    events: a.swarmEvents.length,
    seed: a.debug.seed,
    message: 'same seed deterministic; different seed changes swarm event realization',
  }, null, 2));
} finally {
  await server.close();
}
