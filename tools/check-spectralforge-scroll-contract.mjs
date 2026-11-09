#!/usr/bin/env node
import fs from 'node:fs';
function read(path) { return fs.readFileSync(path, 'utf8'); }
function assertIncludes(text, needle, label) {
  if (!text.includes(needle)) {
    console.error(`[spectralforge-scroll-contract] missing ${label}: ${needle}`);
    process.exit(1);
  }
}
function assertExcludes(text, needle, label) {
  if (text.includes(needle)) {
    console.error(`[spectralforge-scroll-contract] unexpected ${label}: ${needle}`);
    process.exit(1);
  }
}
const intake = read('src/features/l3lab/materialIntake/MaterialIntakePanel.tsx');
const entryGateway = read('src/features/l3lab/materialIntake/useMaterialIntakeEntryGateway.ts');
const forge = read('src/features/l3lab/spectralForge/SpectralForgeRoom.tsx');
const entryScroll = read('src/features/l3lab/materialIntake/entryScroll.ts');
const intent = read('src/features/l3lab/contracts/spectralForgeEntryIntent.ts');
assertIncludes(intent, "CUT_UPLOAD: 'cut-upload'", 'shared cut-upload origin');
assertIncludes(intent, "MATERIAL_INTAKE_GATEWAY: 'material-intake-gateway'", 'shared target');
assertIncludes(entryGateway, 'pendingEntryScrollIntentRef', 'persisted entry scroll intent');
assertIncludes(entryGateway, 'scheduleEntryScrollConvergence', 'layout-stability scroll convergence');
assertIncludes(intake, 'useMaterialIntakeEntryGateway({', 'material intake gateway hook binding');
assertIncludes(intake, 'data-cut-upload-entry-target="true"', 'explicit cut-upload target marker');
assertIncludes(entryScroll, 'scrollSpectralForgeToIntakeGateway', 'central scroll function');
assertIncludes(entryScroll, 'findScrollableParent', 'actual scroll container resolver');
assertIncludes(entryScroll, 'window.__xensonarSpectralForgeEntryScrollDiag', 'internal diagnostic');
assertIncludes(forge, 'data-xensonar-scroll-island="spectralforge-page"', 'page-level forge scroll marker');
assertIncludes(forge, 'data-wheel-allow-scroll="true"', 'page-level wheel allowance');
assertIncludes(forge, "overscrollBehavior: 'auto'", 'default overscroll behavior on the workbench column');
assertExcludes(forge, 'data-spectralforge-scroll-root="true"', 'inner spectral forge scroll root marker');
assertExcludes(forge, "scrollbarGutter: 'stable'", 'forced inner scrollbar gutter style');
console.log('[spectralforge-scroll-contract] ok');
