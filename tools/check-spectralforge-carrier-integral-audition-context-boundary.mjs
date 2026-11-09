#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'src/features/l3lab/spectralForge/integral');
const contextPath = path.join(srcDir, 'carrierIntegralAuditionContext.ts');
const snapshotPath = path.join(srcDir, 'carrierIntegralSnapshotSpectralData.ts');
const auditionPath = path.join(srcDir, 'carrierIntegralAudition.ts');
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

const context = read(contextPath);
const snapshot = read(snapshotPath);
const audition = read(auditionPath);
const index = read(indexPath);
const routes = read(routesPath);

requireIncludes(context, 'export type CarrierIntegralAuditionValueSource', 'audition context');
requireIncludes(context, 'export function buildCarrierIntegralAuditionContext', 'audition context');
requireIncludes(context, 'export function buildCarrierIntegralAuditionSelectionForMachine', 'audition context');
requireIncludes(context, 'export function resolveCarrierIntegralAuditionBodySource', 'audition context');
requireIncludes(context, 'export function computeCarrierIntegralAuditionLoopDurationSec', 'audition context');
requireIncludes(context, 'export function formatCarrierIntegralAuditionValueSourceLabel', 'audition context');
requireIncludes(context, 'buildCarrierIntegralRouteSignature', 'audition context');
requireIncludes(context, 'normalizeCarrierIntegralSynthLabSelection', 'audition context');
requireIncludes(context, 'resolveCarrierIntegralSelectionParams', 'audition context');
requireNotIncludes(context, 'audioEngine', 'audition context');
requireNotIncludes(context, 'AudioEngine', 'audition context');
requireNotIncludes(context, 'playRenderedAudioBufferPreview', 'audition context');
requireNotIncludes(context, 'console.', 'audition context');

requireIncludes(snapshot, 'export function toCarrierIntegralFloat32Array', 'snapshot spectral data');
requireIncludes(snapshot, 'export function inferCarrierIntegralSpectralSnapshotWidth', 'snapshot spectral data');
requireIncludes(snapshot, 'export function buildSpectralDataFromProjectSnapshot', 'snapshot spectral data');
requireIncludes(snapshot, 'new SpectralData', 'snapshot spectral data');
requireNotIncludes(snapshot, 'audioEngine', 'snapshot spectral data');
requireNotIncludes(snapshot, 'console.', 'snapshot spectral data');

requireIncludes(audition, 'buildCarrierIntegralAuditionContext(request)', 'carrierIntegralAudition facade');
requireIncludes(routes, 'context.valueSourceLabel', 'carrierIntegralAudition routes');
requireIncludes(audition, 'buildSpectralDataFromProjectSnapshot(request.snapshot)', 'carrierIntegralAudition facade');
requireNotIncludes(audition, 'function resolveAuditionBodySource', 'carrierIntegralAudition facade');
requireNotIncludes(audition, 'function buildAuditionSelectionForMachine', 'carrierIntegralAudition facade');
requireNotIncludes(audition, 'function computeLoopDurationSec', 'carrierIntegralAudition facade');
requireNotIncludes(audition, 'function toFloat32Array', 'carrierIntegralAudition facade');
requireNotIncludes(audition, 'DEFAULT_PROJECT_SNAPSHOT_WIDTH', 'carrierIntegralAudition facade');
requireNotIncludes(audition, 'PREVIEW_MAX_SECONDS', 'carrierIntegralAudition facade');

requireIncludes(index, 'carrierIntegralAuditionContext', 'integral index');
requireIncludes(index, 'carrierIntegralSnapshotSpectralData', 'integral index');

console.log('OK spectralforge carrier integral audition context boundary');
