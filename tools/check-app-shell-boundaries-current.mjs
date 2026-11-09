#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appPath = 'src/App.tsx';
const app = fs.readFileSync(path.join(root, appPath), 'utf8');

const sharedForbiddenImports = [
  /from ["'].*AudioEngine/i,
  /from ["'].*carrier/i,
  /from ["'].*pitch/i,
  /from ["'].*packageStation/i,
  /from ["'].*waveStarter/i,
];

const boundaries = [
  {
    id: 'room-shell',
    path: 'src/features/xensonar/layout/useAppRoomShellBoundary.ts',
    appRequired: [
      'useAppRoomShellBoundary',
      'import { useAppRoomShellBoundary } from "./features/xensonar/layout/useAppRoomShellBoundary";',
    ],
    appForbidden: ['useSpectralForgeEntryUploadState', 'isXenpolarShortcutActive'],
    boundaryRequired: [
      'useState<Room>("RESONANCE")',
      'AppFamilyRequest',
      'useSpectralForgeEntryUploadState()',
      'isXenpolarShortcutActive(room)',
    ],
    boundaryForbidden: ['AudioContext', 'audioEngine', 'window.', 'document.'],
    forbiddenImports: [],
  },
  {
    id: 'stationary-rhythm-probe',
    path: 'src/features/xensonar/audio/useAppStationaryRhythmProbeBoundary.ts',
    appRequired: ['useAppStationaryRhythmProbeBoundary'],
    appForbidden: ['useStationaryRhythmPatternSnapshotInput', 'useStationaryRhythmWorkletProbeController'],
    boundaryRequired: [
      'useStationaryRhythmPatternSnapshotInput',
      'useStationaryRhythmWorkletProbeController',
      'resolveDestination',
      'patternSnapshotInput',
    ],
    boundaryForbidden: ['useState(', 'useEffect(', 'new Audio(', 'window.', 'document.'],
    forbiddenImports: sharedForbiddenImports,
  },
  {
    id: 'resonance-input-shell',
    path: 'src/features/xensonar/input/useAppResonanceInputShellBoundary.ts',
    appRequired: [
      'useAppResonanceInputShellBoundary({ room, nexusActive })',
      'import { useAppResonanceInputShellBoundary } from "./features/xensonar/input/useAppResonanceInputShellBoundary";',
    ],
    appForbidden: [
      'useResonanceActionHoldState(',
      'useResonanceInputIndicator(',
      'const keyRef = useRef({ left: false, right: false, shoot: false })',
      'const resonanceInputActive = room === "RESONANCE" && nexusActive',
      'const gameInputActive = room === "GAME"',
    ],
    boundaryRequired: [
      'useRef<AppKeyboardInputRefState>({ left: false, right: false, shoot: false })',
      "const resonanceInputActive = room === 'RESONANCE' && nexusActive",
      "const gameInputActive = room === 'GAME'",
      'useResonanceInputIndicator(resonanceInputActive)',
      'useResonanceActionHoldState(resonanceInputActive)',
      'type { Room }',
    ],
    boundaryForbidden: ['AudioContext', 'new Audio(', 'getLiveMasterBus', 'setRoom('],
    forbiddenImports: [...sharedForbiddenImports, /from ["'].*rootFollow/i],
  },
  {
    id: 'meta-preset-session',
    path: 'src/features/xensonar/meta/useAppMetaPresetSessionBoundary.ts',
    appRequired: [
      'useAppMetaPresetSessionBoundary()',
      'import { useAppMetaPresetSessionBoundary } from "./features/xensonar/meta/useAppMetaPresetSessionBoundary";',
    ],
    appForbidden: [
      'useMetaPresetRouletteState()',
      'useState<MetaPresetId | null>',
      'useState<MetaPresetSessionOverrides>',
      'useState<"drone" | "waves">("drone")',
    ],
    boundaryRequired: [
      'useState<"drone" | "waves">("drone")',
      'useState<MetaPresetId | null>(null)',
      'useState<MetaPresetSessionOverrides>({})',
      'useMetaPresetRouletteState()',
      'type { MetaPresetId }',
      'type { MetaPresetSessionOverrides }',
    ],
    boundaryForbidden: ['AudioContext', 'new Audio(', 'getLiveMasterBus', 'setRoom(', 'apply'],
    forbiddenImports: [...sharedForbiddenImports, /from ["'].*rootFollow/i, /from ["'].*materialLoop/i],
  },
  {
    id: 'surface-frame-shell',
    path: 'src/features/xensonar/layout/useAppSurfaceFrameShellBoundary.ts',
    appRequired: [
      'import { useAppSurfaceFrameShellBoundary } from "./features/xensonar/layout/useAppSurfaceFrameShellBoundary";',
      'useAppSurfaceFrameShellBoundary({',
      'resonanceScreen: resonanceScreenRuntime',
      'roomScenes: appRoomScenes',
    ],
    appForbidden: [
      'buildAppSurfaceFrameMountSource({',
      'useAppSurfaceFrameRuntimeBoundary(appSurfaceFrameMountSource)',
      'appSurfaceFrameMountSource =',
    ],
    boundaryRequired: [
      'buildAppSurfaceFrameMountSource',
      'useAppSurfaceFrameRuntimeBoundary(appSurfaceFrameMountSource)',
      'roomGate: { room }',
      'resonanceScreenMount: { resonanceScreen }',
      'roomSceneMount: { roomScenes }',
      'performanceCrisisPanelMount: { performanceCrisisPanelProps }',
      "import type { AppSurfaceFrameRuntimeBoundary, UseAppSurfaceFrameRuntimeBoundaryArgs } from './useAppSurfaceFrameRuntimeBoundaryTypes';",
      'export type UseAppSurfaceFrameShellBoundaryArgs = UseAppSurfaceFrameRuntimeBoundaryArgs;',
    ],
    boundaryForbidden: ['AudioContext', 'new Audio(', 'setRoom(', 'useState(', 'useEffect('],
    forbiddenImports: [...sharedForbiddenImports, /from ["'].*rootFollow/i],
  },
];

const failures = [];
const results = [];
for (const spec of boundaries) {
  const fullPath = path.join(root, spec.path);
  if (!fs.existsSync(fullPath)) {
    failures.push(`${spec.id}: missing ${spec.path}`);
    results.push({ id: spec.id, ok: false, failures: [`missing ${spec.path}`] });
    continue;
  }
  const source = fs.readFileSync(fullPath, 'utf8');
  const local = [];
  for (const marker of spec.appRequired) if (!app.includes(marker)) local.push(`App.tsx missing ${marker}`);
  for (const marker of spec.appForbidden) if (app.includes(marker)) local.push(`App.tsx must not contain ${marker}`);
  for (const marker of spec.boundaryRequired) if (!source.includes(marker)) local.push(`${spec.path} missing ${marker}`);
  for (const marker of spec.boundaryForbidden) if (source.includes(marker)) local.push(`${spec.path} must not contain ${marker}`);
  for (const regex of spec.forbiddenImports) if (regex.test(source)) local.push(`${spec.path} forbidden import ${regex}`);
  if (local.length) failures.push(...local.map((item) => `${spec.id}: ${item}`));
  results.push({ id: spec.id, path: spec.path, ok: local.length === 0, failures: local });
}

const report = {
  ok: failures.length === 0,
  reportKind: 'app-shell-boundaries-current',
  proofClass: 'source-shape/static-boundary',
  generatedAt: new Date().toISOString(),
  boundaries: results,
  failures,
  claimBoundary: {
    canClaim: [
      'App.tsx delegates the five registered shell concerns to their dedicated boundaries.',
      'The shell boundaries retain their intended state/adapter ownership and reject listed audio/routing/browser-global couplings.',
      'Surface-frame shell type ownership follows the current dedicated runtime-boundary types module.',
    ],
    cannotClaim: [
      'Browser interaction behaviour.',
      'Audio timing or sound quality.',
      'Room/game navigation correctness beyond source ownership.',
      'Meta-preset audible application semantics.',
    ],
  },
};

fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports/app-shell-boundaries-current.json'), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'reports/app-shell-boundaries-current.md'), [
  '# App Shell Boundaries — Current Sanity',
  '',
  `- ok: ${report.ok}`,
  `- boundaries: ${results.length}`,
  `- passed: ${results.filter((item) => item.ok).length}`,
  `- failed: ${results.filter((item) => !item.ok).length}`,
  `- proofClass: ${report.proofClass}`,
  '',
  '## Boundaries',
  '',
  ...results.map((item) => `- ${item.ok ? 'PASS' : 'FAIL'} ${item.id} — ${item.path}`),
  '',
  '## Claim boundary',
  '',
  ...report.claimBoundary.canClaim.map((item) => `- CAN: ${item}`),
  ...report.claimBoundary.cannotClaim.map((item) => `- CANNOT: ${item}`),
  '',
  '## Failures',
  '',
  ...(failures.length ? failures.map((item) => `- ${item}`) : ['- none']),
  '',
].join('\n'));

if (!report.ok) {
  console.error('[app-shell-boundaries-current] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`[app-shell-boundaries-current] PASS: ${results.length}/${results.length} shell boundaries current`);
