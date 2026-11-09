#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`[carrier-integral-donatello-formant-body-model-boundary] ${message}`);
    process.exit(1);
  }
};

const modelPath = 'src/features/l3lab/spectralForge/integral/carrierIntegralDonatelloFormantBodyModel.ts';
const auditionPath = 'src/features/l3lab/spectralForge/integral/carrierIntegralAudition.ts';
const routesPath = 'src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts';
const indexPath = 'src/features/l3lab/spectralForge/integral/index.ts';
for (const relative of [modelPath, auditionPath, routesPath, indexPath]) {
  assert(fs.existsSync(path.join(root, relative)), `Missing ${relative}`);
}
const model = read(modelPath);
const audition = read(auditionPath);
const routes = read(routesPath);
const index = read(indexPath);

assert(model.includes('export type CarrierIntegralDonatelloFormantBodyModel'), 'Model must export Donatello FormantBody model type.');
assert(model.includes('export function buildCarrierIntegralDonatelloFormantBodyModel'), 'Model must export Donatello FormantBody builder.');
assert(model.includes("bodyKind: 'formant-window-body'"), 'Model must keep Donatello formant-window-body identity.');
assert(model.includes("sourceKind: 'donatello-formant-plan'"), 'Model must keep Donatello formant-plan source.');
assert(model.includes('liveFormantRendererReady: false'), 'Model must not claim a live Formant renderer.');
assert(model.includes('requiresFormantPlan: true'), 'Model must require a formant plan.');
assert(model.includes('describeCarrierIntegralDonatelloFormantBodyModel'), 'Model must expose a shared description helper.');
assert(model.includes('assertCarrierIntegralDonatelloFormantBodyModel'), 'Model must expose invariant assertion.');

assert(audition.includes('buildCarrierIntegralDonatelloFormantBodyModel'), 'Root-Follow artifact path must use Donatello FormantBody model.');
assert(routes.includes('buildCarrierIntegralDonatelloFormantBodyModel'), 'Audition route must use Donatello FormantBody model.');
assert(index.includes("export * from './carrierIntegralDonatelloFormantBodyModel';"), 'index.ts must export Donatello FormantBody model.');

console.log('[carrier-integral-donatello-formant-body-model-boundary] ok');
