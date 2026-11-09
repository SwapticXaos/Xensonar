#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const pkg = JSON.parse(read('package.json'));
const files = {
  vite: read('vite.config.ts'),
  app: read('src/App.tsx'),
  fullBoundary: read('src/features/xensonar/rooms/useAppXenpolarGameArenaRuntimeBoundary.ts'),
  coreRuntimeBoundary: read('src/features/xensonar/rooms/useAppXenpolarGameArenaRuntimeBoundary.core.ts'),
  coreExtrasBridge: read('src/features/xensonar/rooms/xenpolarExtrasBridge.core.ts'),
  profile: read('src/features/xensonar/rooms/coreBuildProfile.ts'),
};

const checks = {
  scriptRegistered:
    pkg.scripts?.['xensonar:check-xenpolar-extras-runtime-build-gate'] ===
    'node tools/check-xenpolar-extras-runtime-build-gate.mjs',
  viteDefinesProfileBoundary:
    files.vite.includes('const xenpolarGameArenaRuntimeBoundary = coreTestBuildEnabled') &&
    files.vite.includes('useAppXenpolarGameArenaRuntimeBoundary.core.ts') &&
    files.vite.includes('useAppXenpolarGameArenaRuntimeBoundary.ts'),
  viteAliasesAppRelativeImport:
    files.vite.includes('/^\\.\\/features\\/xensonar\\/rooms\\/useAppXenpolarGameArenaRuntimeBoundary$/') &&
    files.vite.includes('replacement: xenpolarGameArenaRuntimeBoundary'),
  appKeepsSingleCanonicalImport:
    files.app.includes('from "./features/xensonar/rooms/useAppXenpolarGameArenaRuntimeBoundary"') &&
    !files.app.includes('useAppXenpolarGameArenaRuntimeBoundary.core'),
  coreRuntimeBoundaryIsNoOpSurface:
    files.coreRuntimeBoundary.includes("const CORE_STATUS = 'Extras nicht im Core-Build.'") &&
    files.coreRuntimeBoundary.includes('keepCoreArenaDormant') &&
    files.coreRuntimeBoundary.includes("args.setRoom(startLevel >= 3 ? 'L3LAB' : 'XENPOLAR')"),
  coreExtrasBridgeIsDormantController:
    files.coreExtrasBridge.includes('CORE_MESSAGE') &&
    files.coreExtrasBridge.includes('createDormantIrrlichtArenaState') &&
    files.coreExtrasBridge.includes('useXenpolarController') &&
    files.coreExtrasBridge.includes('handleArenaSeedExport'),
  coreBoundaryDoesNotOwnGameAudioOrLoop:
    !files.coreRuntimeBoundary.includes('requestAnimationFrame(') &&
    !files.coreRuntimeBoundary.includes('createOscillator(') &&
    !files.coreRuntimeBoundary.includes('playScheduledTone(') &&
    !files.coreRuntimeBoundary.includes('advanceGameChaos') &&
    !files.coreRuntimeBoundary.includes('captureIrrlichtArenaEvent') &&
    !files.coreExtrasBridge.includes('requestAnimationFrame(') &&
    !files.coreExtrasBridge.includes('createOscillator(') &&
    !files.coreExtrasBridge.includes('playScheduledTone(') &&
    !files.coreExtrasBridge.includes('@/features/xenpolar/') &&
    !files.coreExtrasBridge.includes("../../xenpolar/"),
  fullBoundaryStillOwnsExtrasRuntime:
    files.fullBoundary.includes('advanceGameChaos') &&
    files.fullBoundary.includes('captureIrrlichtArenaEvent') &&
    files.fullBoundary.includes('useIrrlichtArenaFrameRuntime({') &&
    files.fullBoundary.includes('playPlayerShotMotifAction'),
  buildProfileStillExposesExtrasFlag:
    files.profile.includes('XENSONAR_EXTRAS_ENABLED'),
};

const failures = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

const report = {
  ok: failures.length === 0,
  intent:
    'Core-test builds replace the large Xenpolar/Irrlicht runtime boundary with a dormant no-op bridge, while full builds keep the complete extras runtime.',
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
