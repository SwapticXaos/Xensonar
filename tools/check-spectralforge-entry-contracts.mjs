#!/usr/bin/env node
import fs from 'node:fs';
function read(path) { return fs.readFileSync(path, 'utf8'); }
function expect(condition, message) { if (!condition) { console.error(`[spectralforge-entry-contracts] FAIL: ${message}`); process.exitCode = 1; } }
const contracts = read('src/features/l3lab/contracts/spectralForgeEntryIntent.ts');
const app = read('src/App.tsx');
const entryScroll = read('src/features/l3lab/materialIntake/entryScroll.ts');
const intake = read('src/features/l3lab/materialIntake/MaterialIntakePanel.tsx');
expect(contracts.includes('SPECTRAL_FORGE_ENTRY_REASONS'), 'entry reasons should be centralized in the contract file');
expect(contracts.includes("CUT_UPLOAD: 'cut-upload'"), 'cut-upload literal should live in the reason map');
expect(contracts.includes('SPECTRAL_FORGE_ENTRY_TARGETS'), 'entry targets should be centralized in the contract file');
expect(contracts.includes("MATERIAL_INTAKE_GATEWAY: 'material-intake-gateway'"), 'material-intake-gateway literal should live in the target map');
expect(contracts.includes('createdAt: number'), 'entry intent should carry creation time for stale-token/bfcache hardening');
expect(contracts.includes('isSpectralForgeEntryScrollIntent'), 'contract should expose a strict runtime guard');
expect(contracts.includes('isCutUploadMaterialIntakeIntent'), 'contract should expose a semantic cut-upload gateway guard');
expect(app.includes('createCutUploadEntryScrollIntent(sequence)'), 'App should still create the intent through the factory');
expect(intake.includes('isMaterialIntakeGatewayIntent(entryScrollIntent)'), 'MaterialIntakePanel should still validate entry intent before scrolling');
expect(entryScroll.includes('SPECTRAL_FORGE_MATERIAL_INTAKE_GATEWAY_TARGET'), 'entryScroll should use the shared target constant for diagnostic events');
if (process.exitCode) process.exit(process.exitCode);
console.log('[spectralforge-entry-contracts] ok');
