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
  const durationSec = 24;
  const windows = Array.from({ length: 960 }, (_, index) => {
    const ratio = index / 959;
    return {
      t0: ratio * durationSec,
      t1: Math.min(durationSec, ratio * durationSec + 0.035),
      centerHz: 70 * Math.pow(2, ratio * 3.5),
      energy: 1,
      density: 1,
      bandwidth: 1,
      roughness: index % 2 === 0 ? 1 : 0.65,
      presence: 1,
      continuity: 0.12,
    };
  });
  const maxSwarmEvents = 96;
  const maxAttractors = 20;
  const plan = mod.buildStrangeAttractorCarrierPlan({
    sourceCarrierId: 'dense-carrier-stress-fixture',
    durationSec,
    rootHz: 110,
    windows,
  }, { seed: 'dense-fixture', maxSwarmEvents, maxAttractors });
  if (plan.attractors.length > maxAttractors) {
    throw new Error(`attractor limit failed: ${plan.attractors.length} > ${maxAttractors}`);
  }
  if (plan.swarmEvents.length > maxSwarmEvents) {
    throw new Error(`swarm event limit failed: ${plan.swarmEvents.length} > ${maxSwarmEvents}`);
  }
  if (plan.debug.rejectedEventCount <= 0) {
    throw new Error('dense fixture should record rejectedEventCount when event limit is hit');
  }
  console.log(JSON.stringify({
    ok: true,
    maxAttractors,
    attractors: plan.attractors.length,
    maxSwarmEvents,
    swarmEvents: plan.swarmEvents.length,
    rejectedEventCount: plan.debug.rejectedEventCount,
    message: 'Schwarmdichte-Grenze wird respektiert; Eventlawine ist begrenzt.',
  }, null, 2));
} finally {
  await server.close();
}
