#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const integralDir = path.join(root, 'src/features/l3lab/spectralForge/integral');
const destinationsPath = path.join(integralDir, 'carrierIntegralTransferDestinations.ts');
const descriptionsPath = path.join(integralDir, 'carrierIntegralTransferDescriptions.ts');
const sendTargetsPath = path.join(integralDir, 'carrierIntegralSendTargets.ts');
const sendContractResolverPath = path.join(integralDir, 'carrierIntegralSendContractResolver.ts');
const indexPath = path.join(integralDir, 'index.ts');

function read(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing expected file: ${path.relative(root, file)}`);
  }
  return fs.readFileSync(file, 'utf8');
}

function requireIncludes(text, needle, label) {
  if (!text.includes(needle)) {
    throw new Error(`${label} must include: ${needle}`);
  }
}

function requireNotIncludes(text, needle, label) {
  if (text.includes(needle)) {
    throw new Error(`${label} must not include: ${needle}`);
  }
}

const destinations = read(destinationsPath);
const descriptions = read(descriptionsPath);
const sendTargets = read(sendTargetsPath);
const sendContractResolver = read(sendContractResolverPath);
const index = read(indexPath);

requireIncludes(destinations, 'CARRIER_INTEGRAL_SEND_DESTINATIONS', 'transfer destinations boundary');
requireIncludes(destinations, 'carrierIntegralTargetToDestination', 'transfer destinations boundary');
requireIncludes(destinations, 'carrierIntegralDestinationToTarget', 'transfer destinations boundary');
requireIncludes(destinations, 'listCarrierIntegralSendDestinations', 'transfer destinations boundary');
requireIncludes(destinations, 'listCarrierIntegralTransferTargetIds', 'transfer destinations boundary');
requireIncludes(destinations, 'TARGET_TO_DESTINATION', 'transfer destinations boundary');
requireIncludes(destinations, 'DESTINATION_TO_TARGET', 'transfer destinations boundary');
requireNotIncludes(destinations, 'AudioEngine', 'transfer destinations boundary');
requireNotIncludes(destinations, 'executeCarrierIntegralTransfer', 'transfer destinations boundary');
requireNotIncludes(destinations, 'console.', 'transfer destinations boundary');

requireIncludes(descriptions, 'describeCarrierIntegralElasticity', 'transfer descriptions boundary');
requireIncludes(descriptions, 'describeCarrierIntegralTransferPlanSummary', 'transfer descriptions boundary');
requireIncludes(descriptions, 'describeCarrierIntegralTransferPlanGuardrail', 'transfer descriptions boundary');
for (const mode of [
  'synthetic-time-elastic',
  'raw-granular-elastic',
  'raw-tape-coupled',
  'fixed-rendered-audio',
]) {
  requireIncludes(descriptions, mode, 'transfer descriptions boundary');
}
requireNotIncludes(descriptions, 'AudioEngine', 'transfer descriptions boundary');
requireNotIncludes(descriptions, 'executeCarrierIntegralTransfer', 'transfer descriptions boundary');
requireNotIncludes(descriptions, 'console.', 'transfer descriptions boundary');

requireIncludes(sendTargets, 'carrierIntegralTransferDestinations', 'send targets facade');
requireIncludes(sendTargets, 'carrierIntegralTransferDescriptions', 'send targets facade');
requireIncludes(sendContractResolver, 'carrierIntegralDestinationToTarget(args.destination)', 'send contract resolver');
requireIncludes(sendTargets, 'return resolveCarrierIntegralTargetToDestination(targetId);', 'send targets facade');
requireIncludes(sendTargets, 'return describeCarrierIntegralElasticityFromBoundary(mode);', 'send targets facade');
requireNotIncludes(sendTargets, '  DESTINATION_TO_TARGET,', 'send targets facade');
requireNotIncludes(sendTargets, '  TARGET_TO_DESTINATION,', 'send targets facade');
requireNotIncludes(sendTargets, 'case "synthetic-time-elastic"', 'send targets facade');
requireNotIncludes(sendTargets, 'case "raw-granular-elastic"', 'send targets facade');

requireIncludes(index, "carrierIntegralTransferDestinations", 'integral index');
requireIncludes(index, "carrierIntegralTransferDescriptions", 'integral index');

console.log('OK spectralforge carrier integral transfer destination/description boundary');
