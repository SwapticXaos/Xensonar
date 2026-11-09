#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'src/features/l3lab/spectralForge/integral');
const legacyPath = path.join(srcDir, 'carrierIntegralTransferLegacyPlan.ts');
const resolverPath = path.join(srcDir, 'carrierIntegralSendContractResolver.ts');
const sendTargetsPath = path.join(srcDir, 'carrierIntegralSendTargets.ts');
const indexPath = path.join(srcDir, 'index.ts');

function read(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing expected file: ${path.relative(root, file)}`);
  return fs.readFileSync(file, 'utf8');
}
function requireIncludes(text, needle, label) {
  if (!text.includes(needle)) throw new Error(`${label} must include: ${needle}`);
}
function requireNotIncludes(text, needle, label) {
  if (text.includes(needle)) throw new Error(`${label} must not include: ${needle}`);
}

const legacy = read(legacyPath);
const resolver = read(resolverPath);
const sendTargets = read(sendTargetsPath);
const index = read(indexPath);

requireIncludes(resolver, 'export function resolveCarrierIntegralSendContractFromDestination', 'send contract resolver');
requireIncludes(resolver, 'export function resolveCarrierIntegralDestinationSupportFromContracts', 'send contract resolver');
requireIncludes(resolver, 'export function listCarrierIntegralSendContractsFromDestinationSupport', 'send contract resolver');
requireIncludes(resolver, 'resolveCarrierIntegralMachine(args.machineId)', 'send contract resolver');
requireIncludes(resolver, 'buildRootFollowLoopContract', 'send contract resolver');
requireIncludes(resolver, 'buildMelodicPinkLaneContract', 'send contract resolver');
requireNotIncludes(resolver, 'buildCarrierIntegralTransferPlan', 'send contract resolver');
requireNotIncludes(resolver, 'AudioEngine', 'send contract resolver');
requireNotIncludes(resolver, 'executeCarrierIntegralTransfer', 'send contract resolver');
requireNotIncludes(resolver, 'console.', 'send contract resolver');

requireIncludes(legacy, 'export function resolveCarrierIntegralTransferPlanLegacyFromBoundary', 'legacy transfer plan');
requireIncludes(legacy, 'resolveCarrierIntegralSendContractFromDestination', 'legacy transfer plan');
requireIncludes(legacy, 'buildCarrierIntegralTransferPlan(legacyPlanContext, {', 'legacy transfer plan');
requireIncludes(legacy, 'donatello-formant-window-body', 'legacy transfer plan');
requireIncludes(legacy, 'raw-darkpsy-oscillator', 'legacy transfer plan');
requireIncludes(legacy, 'material-render-body', 'legacy transfer plan');
requireNotIncludes(legacy, 'from \'./carrierIntegralSendTargets\'', 'legacy transfer plan');
requireNotIncludes(legacy, 'console.', 'legacy transfer plan');
requireNotIncludes(legacy, 'AudioEngine', 'legacy transfer plan');
requireNotIncludes(legacy, 'executeCarrierIntegralTransfer', 'legacy transfer plan');

requireIncludes(sendTargets, 'resolveCarrierIntegralTransferPlanLegacyFromBoundary', 'send targets facade');
requireIncludes(sendTargets, 'return resolveCarrierIntegralTransferPlanLegacyFromBoundary(args);', 'send targets facade');
requireIncludes(sendTargets, 'resolveCarrierIntegralSendContractFromDestination(args)', 'send targets facade');
requireNotIncludes(sendTargets, 'const legacyPlanContext = {', 'send targets facade');
requireNotIncludes(sendTargets, 'buildCarrierIntegralTransferPlan(legacyPlanContext, {', 'send targets facade');
requireNotIncludes(sendTargets, 'resolveCarrierIntegralMachine(args.machineId)', 'send targets facade');

requireIncludes(index, "carrierIntegralSendContractResolver", 'integral index');
requireIncludes(index, "carrierIntegralTransferLegacyPlan", 'integral index');

console.log('OK spectralforge carrier integral transfer legacy plan boundary');
