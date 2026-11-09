#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`[carrier-integral-audition-route-classification-boundary] ${message}`);
    process.exit(1);
  }
};

const classificationPath = 'src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRouteClassification.ts';
const auditionPath = 'src/features/l3lab/spectralForge/integral/carrierIntegralAudition.ts';
const indexPath = 'src/features/l3lab/spectralForge/integral/index.ts';
for (const relative of [classificationPath, auditionPath, indexPath]) {
  assert(fs.existsSync(path.join(root, relative)), `Missing ${relative}`);
}
const classification = read(classificationPath);
const audition = read(auditionPath);
const index = read(indexPath);

assert(classification.includes('export type CarrierIntegralAuditionRouteKind'), 'Classification must export route kind type.');
assert(classification.includes('resolveCarrierIntegralMachineCapability'), 'Classification must read machine capability boundary.');
assert(classification.includes('resolveCarrierIntegralAuditionRouteKind'), 'Classification must export route resolver.');
assert(classification.includes('assertCarrierIntegralAuditionRouteClassification'), 'Classification must include invariant assertion.');
assert(classification.includes("'donatello-formant'"), 'Classification must keep Donatello route kind.');
assert(classification.includes("'pure-dieter-raw-rendered'"), 'Classification must keep Pure Dieter route kind.');
assert(classification.includes("'dieter-v2-rendered-material'"), 'Classification must keep Dieter V2 route kind.');
assert(classification.includes("'synthetic-root-follow'"), 'Classification must keep synthetic route kind.');

assert(audition.includes('resolveCarrierIntegralAuditionRouteKind'), 'Audition facade must use route classification resolver.');
assert(!audition.includes('request.machineId === "donatello-formant-window-body"'), 'Audition facade must not route Donatello by raw machine-id if-chain.');
assert(!audition.includes('request.machineId === "raw-darkpsy-oscillator"'), 'Audition facade must not route Pure Dieter by raw machine-id if-chain.');
assert(!audition.includes('request.machineId === "material-render-body"'), 'Audition facade must not route Dieter V2 by raw machine-id if-chain.');
assert(index.includes("export * from './carrierIntegralAuditionRouteClassification';"), 'index.ts must export route classification boundary.');

console.log('[carrier-integral-audition-route-classification-boundary] ok');
