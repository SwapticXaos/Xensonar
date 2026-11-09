#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const pkg = JSON.parse(read('package.json'));
const files = {
  vite: read('vite.config.ts'),
  profile: read('src/features/xensonar/rooms/coreBuildProfile.ts'),
  main: read('src/features/xensonar/layout/AppMainContent.tsx'),
};
const checks = {
  scriptRegistered:
    pkg.scripts?.['xensonar:check-diagnostic-surfaces-build-gate'] ===
    'node tools/check-diagnostic-surfaces-build-gate.mjs',
  viteDefinesBuildFlag:
    files.vite.includes('const diagnosticSurfacesRequested = process.env.XENSONAR_DIAGNOSTIC_SURFACES') &&
    files.vite.includes('? !coreTestBuildEnabled') &&
    files.vite.includes('__XENSONAR_DIAGNOSTIC_SURFACES_ENABLED__'),
  profileExportsBuildFlag:
    files.profile.includes('declare const __XENSONAR_DIAGNOSTIC_SURFACES_ENABLED__') &&
    files.profile.includes('export const XENSONAR_DIAGNOSTIC_SURFACES_ENABLED = __XENSONAR_DIAGNOSTIC_SURFACES_ENABLED__'),
  mainContentUsesTypeOnlyPanelProps:
    files.main.includes("import type { PerformanceCrisisPanelProps } from '../performanceCrisis/performanceCrisisPanelProps'") &&
    !files.main.includes("import { PerformanceCrisisManagementPanel } from '../performanceCrisis/ui/PerformanceCrisisManagementPanel'"),
  mainContentLazyLoadsDiagnosticPanel:
    files.main.includes('const PerformanceCrisisManagementPanelLazy = XENSONAR_DIAGNOSTIC_SURFACES_ENABLED') &&
    files.main.includes("import('../performanceCrisis/ui/PerformanceCrisisManagementPanel')") &&
    files.main.includes('<PerformanceCrisisManagementPanelLazy {...props.performanceCrisisPanelProps} />'),
  mainContentLazyLoadsBurstDiagnosticsPanel:
    files.main.includes('const ResonanceBurstDiagnosticsPanelLazy = XENSONAR_DIAGNOSTIC_SURFACES_ENABLED') &&
    files.main.includes("import('../rooms/ResonanceBurstDiagnosticsPanel')") &&
    files.main.includes('<ResonanceBurstDiagnosticsPanelLazy {...props.resonanceBurstDiagnosticsPanelProps} />'),
  diagnosticPanelsAreNotStaticValueImports:
    !files.main.includes("import { PerformanceCrisisManagementPanel }") &&
    !files.main.includes("import { ResonanceBurstDiagnosticsPanel }"),
  runtimePropsRemainUngated:
    files.main.includes('performanceCrisisPanelProps: PerformanceCrisisPanelProps') &&
    files.main.includes('resonanceBurstDiagnosticsPanelProps: ComponentProps<ResonanceBurstDiagnosticsPanelComponent>') &&
    files.main.includes('shouldRenderResonancePanels(props.room)'),
};
const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  intent: 'Diagnostic/manager surfaces and burst dashboards may be build-gated, while their runtime props and policies remain part of the core instrument path.',
  checks,
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
