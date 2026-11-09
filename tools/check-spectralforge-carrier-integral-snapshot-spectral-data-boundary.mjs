#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'src/features/l3lab/spectralForge/integral');
const snapshotPath = path.join(srcDir, 'carrierIntegralSnapshotSpectralData.ts');
const auditionPath = path.join(srcDir, 'carrierIntegralAudition.ts');
const transferPath = path.join(srcDir, 'executeCarrierIntegralTransfer.ts');
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

const snapshot = read(snapshotPath);
const audition = read(auditionPath);
const transfer = read(transferPath);
const index = read(indexPath);

requireIncludes(snapshot, "export type CarrierIntegralProjectSnapshotSpectralWidthMode", 'snapshot spectral data boundary');
requireIncludes(snapshot, "| 'inferred-width'", 'snapshot spectral data boundary');
requireIncludes(snapshot, "| 'legacy-fixed-width'", 'snapshot spectral data boundary');
requireIncludes(snapshot, "export const CARRIER_INTEGRAL_PROJECT_SNAPSHOT_SPECTRAL_HEIGHT", 'snapshot spectral data boundary');
requireIncludes(snapshot, "export const CARRIER_INTEGRAL_PROJECT_SNAPSHOT_LEGACY_WIDTH", 'snapshot spectral data boundary');
requireIncludes(snapshot, "export function toCarrierIntegralFloat32Array", 'snapshot spectral data boundary');
requireIncludes(snapshot, "export function inferCarrierIntegralSpectralSnapshotWidth", 'snapshot spectral data boundary');
requireIncludes(snapshot, "export function resolveCarrierIntegralProjectSnapshotSpectralDimensions", 'snapshot spectral data boundary');
requireIncludes(snapshot, "export function buildSpectralDataFromProjectSnapshot", 'snapshot spectral data boundary');
requireIncludes(snapshot, "widthMode === 'legacy-fixed-width'", 'snapshot spectral data boundary');
requireIncludes(snapshot, "new SpectralData(dimensions.width, dimensions.height)", 'snapshot spectral data boundary');
requireNotIncludes(snapshot, 'audioEngine', 'snapshot spectral data boundary');
requireNotIncludes(snapshot, 'executeCarrierIntegralTransfer', 'snapshot spectral data boundary');
requireNotIncludes(snapshot, 'console.', 'snapshot spectral data boundary');

requireIncludes(audition, 'buildSpectralDataFromProjectSnapshot(request.snapshot)', 'audition path');
requireNotIncludes(audition, "widthMode: \"legacy-fixed-width\"", 'audition path must keep inferred-width default');
requireNotIncludes(audition, 'function toFloat32Array', 'audition path');

requireIncludes(transfer, 'buildSpectralDataFromProjectSnapshot(args.snapshot, {', 'transfer path');
requireIncludes(transfer, 'widthMode: "legacy-fixed-width"', 'transfer path must preserve legacy fixed-width mode');
requireNotIncludes(transfer, 'function toFloat32Array', 'transfer path');
requireNotIncludes(transfer, 'function spectralDataFromProjectSnapshot', 'transfer path');
requireNotIncludes(transfer, 'DEFAULT_PROJECT_SNAPSHOT_WIDTH', 'transfer path');
requireNotIncludes(transfer, 'DEFAULT_PROJECT_SNAPSHOT_HEIGHT', 'transfer path');
requireNotIncludes(transfer, 'new SpectralData(', 'transfer path');

requireIncludes(index, 'carrierIntegralSnapshotSpectralData', 'integral index');

console.log('OK spectralforge carrier integral snapshot spectral data boundary');
