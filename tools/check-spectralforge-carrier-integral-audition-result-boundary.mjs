#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'src/features/l3lab/spectralForge/integral');
const resultPath = path.join(srcDir, 'carrierIntegralAuditionResult.ts');
const auditionPath = path.join(srcDir, 'carrierIntegralAudition.ts');
const contextPath = path.join(srcDir, 'carrierIntegralAuditionContext.ts');
const indexPath = path.join(srcDir, 'index.ts');
const routesPath = path.join(srcDir, 'carrierIntegralAuditionRoutes.ts');

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

const result = read(resultPath);
const audition = read(auditionPath);
const context = read(contextPath);
const index = read(indexPath);
const routes = read(routesPath);

requireIncludes(result, 'export type CarrierIntegralAuditionResult', 'audition result boundary');
requireIncludes(result, 'export type CarrierIntegralAuditionTarget', 'audition result boundary');
requireIncludes(result, 'export type CarrierIntegralAuditionSummaryLike', 'audition result boundary');
requireIncludes(result, 'buildCarrierIntegralAuditionResultBase', 'audition result boundary');
requireIncludes(result, 'export function buildCarrierIntegralRootFollowAuditionResult', 'audition result boundary');
requireIncludes(result, 'export function buildCarrierIntegralRawRenderedAuditionResult', 'audition result boundary');
requireIncludes(result, 'export function buildCarrierIntegralDonatelloAuditionResult', 'audition result boundary');
requireIncludes(result, 'formatCarrierIntegralAuditionValueSourceLabel(args.valueSource)', 'audition result boundary');
requireIncludes(result, "target: 'root-follow-preview'", 'audition result boundary');
requireNotIncludes(result, 'audioEngine', 'audition result boundary');
requireNotIncludes(result, 'AudioEngine', 'audition result boundary');
requireNotIncludes(result, 'playRenderedAudioBufferPreview', 'audition result boundary');
requireNotIncludes(result, 'renderToBuffer', 'audition result boundary');
requireNotIncludes(result, 'buildSpectralForgeV2RootFollowEntryConfig', 'audition result boundary');
requireNotIncludes(result, 'console.', 'audition result boundary');

requireIncludes(routes, 'buildCarrierIntegralRootFollowAuditionResult', 'carrierIntegralAudition routes');
requireIncludes(routes, 'buildCarrierIntegralRawRenderedAuditionResult', 'carrierIntegralAudition routes');
requireIncludes(routes, 'buildCarrierIntegralDonatelloAuditionResult', 'carrierIntegralAudition routes');
requireIncludes(audition, "export type {", 'carrierIntegralAudition facade');
requireIncludes(audition, "CarrierIntegralAuditionResult,", 'carrierIntegralAudition facade');
requireIncludes(audition, "CarrierIntegralAuditionTarget,", 'carrierIntegralAudition facade');
requireNotIncludes(audition, 'function buildAuditionResult', 'carrierIntegralAudition facade');
requireNotIncludes(audition, 'function buildRawDarkpsyAuditionResult', 'carrierIntegralAudition facade');
requireNotIncludes(audition, 'function buildDonatelloAuditionResult', 'carrierIntegralAudition facade');
requireNotIncludes(audition, 'target: \'root-follow-preview\'', 'carrierIntegralAudition facade should not assemble target directly');

requireIncludes(context, 'formatCarrierIntegralAuditionValueSourceLabel', 'audition context still owns value-source labels');
requireIncludes(index, 'carrierIntegralAuditionResult', 'integral index');

console.log('OK spectralforge carrier integral audition result boundary');
