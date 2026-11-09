#!/usr/bin/env node
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}
function fail(message) {
  console.error(`[level3lab-cut-upload-route-boundary] ${message}`);
  process.exitCode = 1;
}
function expect(condition, message) {
  if (!condition) fail(message);
}

const roomFile = 'src/features/xensonar/rooms/Level3LabRoom.tsx';
const cutUploadBridgeFile = 'src/features/xensonar/rooms/useSpectralForgeCutUploadBridge.ts';
const contractsFile = 'src/features/l3lab/contracts/spectralForgeEntryIntent.ts';
const room = read(roomFile);
const cutUploadBridge = read(cutUploadBridgeFile);
const contracts = read(contractsFile);

expect(
  room.includes('isMaterialIntakeGatewayIntent'),
  'Level3LabRoom must validate the material-intake gateway intent instead of treating any remembered canonical view as authoritative.',
);
expect(
  /useEffect\(\(\) => \{[\s\S]*externalAudioUploadFile[\s\S]*isMaterialIntakeGatewayIntent\(entryScrollIntent\)[\s\S]*setMode\(\(current\) => \(current === 'experimental' \? current : 'experimental'\)\)[\s\S]*\}, \[entryScrollIntent, externalAudioUploadFile\]\);/.test(room),
  'Level3LabRoom must force the experimental/SpectralForge workspace when cut-upload file or material-intake scroll intent arrives.',
);
expect(
  cutUploadBridge.includes("writeLevel3LabMode('experimental')") && cutUploadBridge.includes("setRoom('L3LAB')"),
  'cut-upload bridge should still prime persisted Level3Lab mode and move the app to L3LAB.',
);
expect(
  contracts.includes('isMaterialIntakeGatewayIntent'),
  'shared spectral forge entry contract must still expose the material-intake intent guard.',
);
expect(
  !room.includes("setCanonicalLogicView('melodic')") || room.indexOf("setCanonicalLogicView('melodic')") < room.indexOf("listenXensonarEvent('openCanonicalMelodicLoop'"),
  'cut-upload route fix must not solve the problem by forcing the canonical melodic view.',
);

if (process.exitCode) process.exit(process.exitCode);
console.log('[level3lab-cut-upload-route-boundary] ok');
