#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'src/features/l3lab/spectralForge/integral');
const commonPath = path.join(srcDir, 'carrierIntegralAuditionCommonFields.ts');
const artifactPath = path.join(srcDir, 'carrierIntegralRootFollowBuildArtifact.ts');
const resultPath = path.join(srcDir, 'carrierIntegralAuditionResult.ts');
const auditionPath = path.join(srcDir, 'carrierIntegralAudition.ts');
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

const common = read(commonPath);
const artifact = read(artifactPath);
const result = read(resultPath);
const audition = read(auditionPath);
const index = read(indexPath);

requireIncludes(common, 'export type CarrierIntegralAuditionCommonFields', 'audition common fields boundary');
requireIncludes(common, 'export function buildCarrierIntegralAuditionCommonFields', 'audition common fields boundary');
requireNotIncludes(common, 'audioEngine', 'audition common fields boundary');
requireNotIncludes(common, 'AudioEngine', 'audition common fields boundary');
requireNotIncludes(common, 'console.', 'audition common fields boundary');

requireIncludes(artifact, 'export type CarrierIntegralRootFollowBuildArtifact', 'root follow build artifact boundary');
requireIncludes(artifact, 'buildCarrierIntegralRootFollowBuildArtifactBase', 'root follow build artifact boundary');
requireIncludes(artifact, 'export function buildCarrierIntegralDonatelloRootFollowBuildArtifact', 'root follow build artifact boundary');
requireIncludes(artifact, 'export function buildCarrierIntegralRawRootFollowBuildArtifact', 'root follow build artifact boundary');
requireIncludes(artifact, 'export function buildCarrierIntegralDieterV2RootFollowBuildArtifact', 'root follow build artifact boundary');
requireIncludes(artifact, 'export function buildCarrierIntegralSyntheticRootFollowBuildArtifact', 'root follow build artifact boundary');
requireIncludes(artifact, 'CarrierIntegralAuditionCommonFields', 'root follow build artifact boundary');
requireNotIncludes(artifact, 'audioEngine', 'root follow build artifact boundary');
requireNotIncludes(artifact, 'AudioEngine', 'root follow build artifact boundary');
requireNotIncludes(artifact, 'buildSpectralForgeV2RootFollowEntryConfig', 'root follow build artifact boundary');
requireNotIncludes(artifact, 'console.', 'root follow build artifact boundary');

requireIncludes(result, 'CarrierIntegralAuditionCommonFields', 'audition result boundary should recycle common fields');
requireIncludes(audition, 'buildCarrierIntegralAuditionCommonFields', 'carrierIntegralAudition facade');
requireIncludes(audition, 'buildCarrierIntegralDonatelloRootFollowBuildArtifact', 'carrierIntegralAudition facade');
requireIncludes(audition, 'buildCarrierIntegralSyntheticRootFollowBuildArtifact', 'carrierIntegralAudition facade');
requireNotIncludes(audition, 'export type CarrierIntegralRootFollowBuildArtifact = {', 'carrierIntegralAudition facade');
requireNotIncludes(audition, 'noteCount: 0,\n      trackCount: 0,\n      branchALineTrafficCount: 0,', 'carrierIntegralAudition facade should not inline raw artifact counts');
requireIncludes(index, 'carrierIntegralAuditionCommonFields', 'integral index');
requireIncludes(index, 'carrierIntegralRootFollowBuildArtifact', 'integral index');

console.log('OK spectralforge carrier integral audition common artifact boundary');
