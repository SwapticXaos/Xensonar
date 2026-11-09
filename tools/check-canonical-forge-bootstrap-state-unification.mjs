#!/usr/bin/env node
import fs from 'node:fs';

const roomPath = 'src/features/l3lab/canonicalForge/CanonicalForgeRoom.tsx';
const initialStatePath = 'src/features/l3lab/canonicalForge/canonicalForgeInitialState.ts';
const contractsPath = 'src/features/l3lab/canonicalForge/canonicalForgeContracts.ts';

const fail = (message) => {
  console.error(`[canonical-forge-bootstrap-state-unification] ${message}`);
  process.exit(1);
};

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : fail(`missing ${path}`);
const room = read(roomPath);
const initialState = read(initialStatePath);
const contracts = read(contractsPath);

if (!room.includes('buildCanonicalForgeInitialState({ initialSession, externalLogicView })')) {
  fail('CanonicalForgeRoom must route initial session plus externalLogicView through the unified initial-state builder.');
}

for (const forbidden of [
  'buildCanonicalForgeBootstrapContracts',
  'CanonicalForgeBootstrapContracts',
  'bootstrapContracts.',
]) {
  if (room.includes(forbidden) || contracts.includes(forbidden)) {
    fail(`parallel bootstrap contract path still present: ${forbidden}`);
  }
}

for (const required of [
  'activeTool: buildInitialActiveTool(initialSession)',
  'sourcePreviewMode: buildInitialSourcePreviewMode(initialSession)',
  'activeWorkspace: buildInitialActiveWorkspace()',
  'logicView: buildInitialLogicView({ initialSession, externalLogicView })',
  'status: buildInitialRoomStatus(initialSession)',
]) {
  if (!initialState.includes(required)) {
    fail(`unified initial state is missing ${required}`);
  }
}

for (const required of [
  'DEFAULT_CANONICAL_TOOL',
  'DEFAULT_CANONICAL_SOURCE_PREVIEW_MODE',
  'DEFAULT_CANONICAL_WORKSPACE',
  'DEFAULT_CANONICAL_LOGIC_VIEW',
  'DEFAULT_CANONICAL_ROOM_STATUS',
]) {
  if (!contracts.includes(required)) {
    fail(`canonical contracts must still own exported default/validator constant ${required}`);
  }
}

console.log(JSON.stringify({
  ok: true,
  roomLines: room.split(/\r?\n/).length,
  initialStateLines: initialState.split(/\r?\n/).length,
}, null, 2));
