#!/usr/bin/env node
import {
  boolChecksToFailures,
  createGuardContext,
} from './xensonar-refactor-guard-utils.mjs';

const ctx = createGuardContext();
const { exists, readIfExists, readJson, lineCount } = ctx;

const utilPath = 'tools/xensonar-refactor-guard-utils.mjs';
const globalGuardPath = 'tools/check-app-global-event-monitor-dependency-audit.mjs';
const inputGuardPath = 'tools/check-app-input-metronome-dependency-audit.mjs';
const roomScreenMountGuardPath = 'tools/check-app-room-screen-mount-dependency-audit.mjs';
const appPath = 'src/App.tsx';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const util = readIfExists(utilPath);
const globalGuard = readIfExists(globalGuardPath);
const inputGuard = readIfExists(inputGuardPath);
const roomScreenMountGuard = readIfExists(roomScreenMountGuardPath);
const app = readIfExists(appPath);
const pkg = readJson(pkgPath, { version: '', scripts: {} });
const suite = readIfExists(suitePath);
const suiteContract = readIfExists(suiteContractPath);

const requiredUtilityExports = [
  'export function createGuardContext',
  'export const importRegex',
  'export function extractImports',
  'export function extractExportSources',
  'export function extractDynamicImports',
  'export function collectDependencyFindings',
  'export function dependencyFindingsClean',
  'export function assertAllMarkers',
  'export function assertRequiredTokensByKey',
  'export function boolChecksToFailures',
];

const convertedGuards = {
  globalEventMonitorDependencyAudit: globalGuardPath,
  inputMetronomeDependencyAudit: inputGuardPath,
  roomScreenMountDependencyAudit: roomScreenMountGuardPath,
};

const convertedGuardSources = {
  globalEventMonitorDependencyAudit: globalGuard,
  inputMetronomeDependencyAudit: inputGuard,
  roomScreenMountDependencyAudit: roomScreenMountGuard,
};

const checks = {
  expectedFilesExist: [utilPath, globalGuardPath, inputGuardPath, roomScreenMountGuardPath, appPath, pkgPath, suitePath, suiteContractPath].every(exists),
  packageVersionAtLeast127: /^3\.2\.91\.6\.9\.(12[7-9]|1[3-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-refactor-guard-utils-extract'] ===
    'node tools/check-refactor-guard-utils-extract.mjs',
  utilityExportsSharedScannerFunctions: requiredUtilityExports.every((needle) => util.includes(needle)),
  utilityDoesNotImportProjectRuntime:
    !util.includes('AudioEngine') &&
    !util.includes('rootFollow') &&
    !util.includes('packageStation') &&
    !util.includes('recordingRuntime') &&
    !util.includes('src/App.tsx'),
  convertedGuardsImportSharedUtils: Object.values(convertedGuardSources).every((source) =>
    source.includes("from './xensonar-refactor-guard-utils.mjs'") &&
    source.includes('collectDependencyFindings') &&
    source.includes('dependencyFindingsClean')
  ),
  convertedGuardsNoLongerDeclareLocalImportRegex: Object.values(convertedGuardSources).every((source) =>
    !source.includes('const importRegex =') &&
    !source.includes('const exportFromRegex =') &&
    !source.includes('const dynamicImportRegex =') &&
    !source.includes('const extractImports =')
  ),
  convertedGuardsStillKeepDomainSpecificAllowlists:
    globalGuard.includes('const allowedHookTokens =') &&
    globalGuard.includes('const forbiddenMutationTokens =') &&
    inputGuard.includes('const requiredAllowedTokens =') &&
    inputGuard.includes('const forbiddenMutationTokens =') &&
    roomScreenMountGuard.includes('const forbiddenRuntimeTokens ='),
  convertedGuardsStillProtectAppOwnership:
    globalGuard.includes('appStillOwnsHookInvocation') &&
    globalGuard.includes('appStillOwnsArrowMotionRaf') &&
    inputGuard.includes('appStillOwnsHookInvocation') &&
    inputGuard.includes('appStillOwnsStableRhythmPlanning') &&
    roomScreenMountGuard.includes('appCallsiteStillOwnsFinalSurfaceFrameComposition'),
  sourceGuardsStillRegistered:
    suite.includes('xensonar:check-app-global-event-monitor-dependency-audit') &&
    suite.includes('xensonar:check-app-input-metronome-dependency-audit') &&
    suiteContract.includes('xensonar:check-app-global-event-monitor-dependency-audit') &&
    suiteContract.includes('xensonar:check-app-input-metronome-dependency-audit'),
  newGuardListedInSanitySuiteContract:
    suiteContract.includes('xensonar:check-refactor-guard-utils-extract'),
  newGuardListedInRefactorSuiteRunner:
    suite.includes('Refactor guard utils extract') &&
    suite.includes('xensonar:check-refactor-guard-utils-extract'),
  appLineCountUnchangedByToolingPatch: lineCount(app) <= 5590,
  noProductionSourceFilesTouchedByUtilityGuard: !exists('src/features/xensonar/input/xensonarRefactorGuardUtils.ts'),
};

const failures = boolChecksToFailures(checks);
const report = {
  ok: failures.length === 0,
  version: pkg.version,
  appLines: lineCount(app),
  utilityPath: utilPath,
  convertedGuards,
  movedScope: [
    'Added shared guard utilities for file IO, import/export/dynamic-import scanning, marker checks, token checks, and boolean-check failure collection',
    'Converted the Global Event Monitor dependency audit to use shared guard utilities',
    'Converted the Input Metronome dependency audit to use shared guard utilities',
    'Converted the Room/Screen Mount dependency audit to use shared guard utilities',
  ],
  explicitlyNotMoved: [
    'No production source logic changed',
    'No App.tsx callsite changed',
    'No audio, runtime, package, recording, input, scroll, arrow, hotkey, Room III, or visible UI behavior changed',
    'No full guard-system rewrite was attempted',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
