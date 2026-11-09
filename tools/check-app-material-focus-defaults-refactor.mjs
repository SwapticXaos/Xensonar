#!/usr/bin/env node
import fs from 'node:fs';

const app = fs.readFileSync('src/App.tsx', 'utf8');
const hook = fs.readFileSync('src/features/xensonar/rooms/useResonanceMaterialFocusDefaults.ts', 'utf8');

const checks = {
  hookExists: hook.includes('useResonanceMaterialFocusDefaults'),
  hookAppliesMaterialFocusPatch: hook.includes('buildMaterialFocusNexusPatch()'),
  appUsesHook: app.includes('useResonanceMaterialFocusDefaults({'),
  appDoesNotImportMaterialFocusBuilder: !app.includes('buildMaterialFocusNexusPatch'),
  appDoesNotInlineMaterialFocusEffect: !app.includes('setDronePreset("fjord_tape");\n    updateNParams('),
};

const failed = Object.entries(checks).filter(([, ok]) => !ok);
console.log(JSON.stringify({ ok: failed.length === 0, checks }, null, 2));
if (failed.length) process.exit(1);
