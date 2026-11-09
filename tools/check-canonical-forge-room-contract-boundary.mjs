#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const roomPath = 'src/features/l3lab/canonicalForge/CanonicalForgeRoom.tsx';
const contractsPath = 'src/features/l3lab/canonicalForge/canonicalForgeRoomContracts.ts';
const room = read(roomPath);
const contracts = read(contractsPath);

function requireText(label, content, needle) {
  if (!content.includes(needle)) failures.push(`${label} missing ${needle}`);
}
function forbidText(label, content, needle) {
  if (content.includes(needle)) failures.push(`${label} still contains ${needle}`);
}

if (!fs.existsSync(contractsPath)) failures.push(`missing ${contractsPath}`);
requireText('CanonicalForgeRoom imports room contracts boundary', room, './canonicalForgeRoomContracts');
forbidText('CanonicalForgeRoom', room, 'const CANONICAL_PRODUCER = {');
forbidText('CanonicalForgeRoom', room, 'type MaterialExportConfig = {');
forbidText('CanonicalForgeRoom', room, 'const DEFAULT_EXPORT: MaterialExportConfig');
forbidText('CanonicalForgeRoom', room, 'const DEFAULT_WAVEFORM_MIX');
forbidText('CanonicalForgeRoom', room, 'const DRUM_PATTERN_OPTIONS');
forbidText('CanonicalForgeRoom', room, 'const BASS_PATTERN_OPTIONS');
forbidText('CanonicalForgeRoom', room, 'function estimateLoopAutocorrect(');
forbidText('CanonicalForgeRoom', room, 'function createTransferMetadata(');

requireText('CanonicalForgeRoom contracts boundary', contracts, 'export const CANONICAL_PRODUCER');
requireText('CanonicalForgeRoom contracts boundary', contracts, 'export type MaterialExportConfig');
requireText('CanonicalForgeRoom contracts boundary', contracts, 'export const XENSONAR_LOOP_REFERENCE_BPM = 108');
requireText('CanonicalForgeRoom contracts boundary', contracts, 'export const DEFAULT_EXPORT');
requireText('CanonicalForgeRoom contracts boundary', contracts, "adapterId: 'canonical-forge-bridge'");
requireText('CanonicalForgeRoom contracts boundary', contracts, 'export const DEFAULT_WAVEFORM_MIX');
requireText('CanonicalForgeRoom contracts boundary', contracts, 'export const DRUM_PATTERN_OPTIONS');
requireText('CanonicalForgeRoom contracts boundary', contracts, 'export const BASS_PATTERN_OPTIONS');
requireText('CanonicalForgeRoom contracts boundary', contracts, 'export function estimateLoopAutocorrect');
requireText('CanonicalForgeRoom contracts boundary', contracts, 'export function createTransferMetadata');
requireText('CanonicalForgeRoom contracts boundary', contracts, 'buildProducerRoadmapNotes');
requireText('CanonicalForgeRoom contracts boundary', contracts, 'buildDefaultGuideMarkers(4)');
requireText('CanonicalForgeRoom contracts boundary', contracts, 'Der gewählte Quellloop darf unverzerrt nach Xensonar wandern');
requireText('CanonicalForgeRoom contracts boundary', contracts, 'stabilizeBy: activeHandoffProfile.stabilizeBy');
requireText('CanonicalForgeRoom contracts boundary', contracts, '...DRUM_PATTERNS');
requireText('CanonicalForgeRoom contracts boundary', contracts, '...BASS_PATTERNS');

const roomLines = room.split(/\r?\n/).length;
if (roomLines > 1790) failures.push(`CanonicalForgeRoom should stay below 1790 lines after contract boundary split; saw ${roomLines}`);

if (failures.length) {
  console.error('[canonical-forge-room-contract-boundary] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  roomLines,
  extractedBoundary: contractsPath,
}, null, 2));
