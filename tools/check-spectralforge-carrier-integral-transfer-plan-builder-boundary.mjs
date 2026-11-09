#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'src/features/l3lab/spectralForge/integral');
const builderPath = path.join(srcDir, 'carrierIntegralTransferPlanBuilder.ts');
const matrixPath = path.join(srcDir, 'carrierIntegralTransferPolicyMatrix.ts');
const sendTargetsPath = path.join(srcDir, 'carrierIntegralSendTargets.ts');
const legacyPlanPath = path.join(srcDir, 'carrierIntegralTransferLegacyPlan.ts');

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

const builder = read(builderPath);
const matrix = read(matrixPath);
const sendTargets = read(sendTargetsPath);
const legacyPlan = read(legacyPlanPath);

requireIncludes(builder, 'export type CarrierIntegralTransferPlanBuildContext', 'transfer plan builder');
requireIncludes(builder, 'export type CarrierIntegralTransferPlanBody', 'transfer plan builder');
requireIncludes(builder, 'export function buildCarrierIntegralTransferPlan', 'transfer plan builder');
requireIncludes(builder, "'machineId' | 'targetId' | 'destination' | 'contract'", 'transfer plan builder');
requireIncludes(builder, 'machineId: context.machine.id', 'transfer plan builder');
requireIncludes(builder, 'targetId: context.targetId', 'transfer plan builder');
requireIncludes(builder, 'destination: context.destination', 'transfer plan builder');
requireIncludes(builder, 'contract: context.contract', 'transfer plan builder');
requireNotIncludes(builder, 'console.', 'transfer plan builder');
requireNotIncludes(builder, 'AudioEngine', 'transfer plan builder');
requireNotIncludes(builder, 'executeCarrierIntegralTransfer', 'transfer plan builder');

requireIncludes(matrix, 'from "./carrierIntegralTransferPlanBuilder"', 'transfer policy matrix');
requireIncludes(matrix, 'buildCarrierIntegralTransferPlan(context, {', 'transfer policy matrix');
requireIncludes(legacyPlan, "from './carrierIntegralTransferPlanBuilder'", 'legacy transfer plan');
requireIncludes(legacyPlan, 'const legacyPlanContext = {', 'legacy transfer plan');
requireIncludes(legacyPlan, 'buildCarrierIntegralTransferPlan(legacyPlanContext, {', 'legacy transfer plan');
requireNotIncludes(sendTargets, 'buildCarrierIntegralTransferPlan(', 'carrier integral send targets facade');

const matrixDirectPlanBaseCount = (matrix.match(/machineId:\s*machine\.id/g) ?? []).length;
const sendTargetsDirectPlanBaseCount = (sendTargets.match(/machineId:\s*machine\.id/g) ?? []).length;
const legacyPlanDirectPlanBaseCount = (legacyPlan.match(/machineId:\s*machine\.id/g) ?? []).length;
if (matrixDirectPlanBaseCount !== 0) {
  throw new Error(`transfer policy matrix still assembles machineId directly ${matrixDirectPlanBaseCount} time(s)`);
}
if (sendTargetsDirectPlanBaseCount !== 0) {
  throw new Error(`send targets still assembles machineId directly ${sendTargetsDirectPlanBaseCount} time(s)`);
}
if (legacyPlanDirectPlanBaseCount !== 0) {
  throw new Error(`legacy transfer plan still assembles machineId directly ${legacyPlanDirectPlanBaseCount} time(s)`);
}

console.log('OK spectralforge carrier integral transfer plan builder boundary');
