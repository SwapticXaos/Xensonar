#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const contractPath = 'src/features/xensonar/rooms/resonanceNexusRuntimeRefs.ts';
const app = read(appPath);
const contract = exists(contractPath) ? read(contractPath) : '';
const emitBoundaryPath = 'src/features/xensonar/audio/waveStarterEmitAttackBoundary.ts';
const emitBoundary = exists(emitBoundaryPath) ? read(emitBoundaryPath) : '';
const appLines = app.split(/\r?\n/).length;
const contractLines = contract ? contract.split(/\r?\n/).length : 0;

const checks = {
  contractFileExists: exists(contractPath),
  appImportsContract: app.includes('createResonanceNexusRuntimeRefs')
    && app.includes('readResonanceCursorSnapshot')
    && app.includes('writeResonanceCursorY')
    && app.includes('clearResonanceTransientQueues'),
  appUsesFactoryInsteadOfInlineObject: app.includes('const nexusRefs = useRef(createResonanceNexusRuntimeRefs({')
    && app.includes('gameWidth: GAME_WIDTH')
    && app.includes('gameHeight: GAME_HEIGHT')
    && !app.includes('const nexusRefs = useRef({'),
  contractOwnsRuntimeShapeTypes: [
    'NexusAgent',
    'NexusRipple',
    'DirectedPulse',
    'AgentImpactRipple',
    'DroneDriveInsertRefs',
    'SemanticInteractionDevice',
    'TopologicalResonatorDevice',
  ].every((needle) => contract.includes(needle)),
  appNoLongerOwnsRuntimeShapeTypeImports: !/import\s+type\s+\{[^}]*\b(AgentImpactRipple|DirectedPulse|NexusAgent|NexusRipple)\b[^}]*\}\s+from\s+["']\.\/features\/xensonar\/domain\/runtimeTypes["']/.test(app)
    && !/type\s+DroneDriveInsertRefs/.test(app)
    && !/SemanticInteractionDevice|TopologicalResonatorDevice/.test(app),
  contractExposesSnapshotAndMutationHelpers: [
    'export const readResonanceCursorSnapshot',
    'export const writeResonanceCursorY',
    'export const clearResonanceTransientQueues',
    'export type ResonanceNexusRuntimeRefs',
  ].every((needle) => contract.includes(needle)),
  appUsesSnapshotForWaveStarterCursorRead: app.includes('const waveCursor = readResonanceCursorSnapshot(nexusRefs)')
    && emitBoundary.includes("args.primeMyzelFromY(args.cursor.cursorY, 'wave')")
    && emitBoundary.includes('cursorX: args.cursor.cursorX'),
  appUsesMutationHelperForCursorCommit: app.includes('writeResonanceCursorY(nexusRefs, nextY);'),
  appUsesTransientClearHelper: app.includes('clearResonanceTransientQueues(nexusRefs);'),
  contractIsRefOnlyNoAudioScheduling: !/\.connect\(|\.start\(|\.stop\(|setTargetAtTime|linearRampToValueAtTime|exponentialRampToValueAtTime|safeApplyAttack|safeApplyExponentialRelease/.test(contract),
  appStillOwnsLiveBehaviorBodies: [
    'const emitWaveStartSound = (',
    'const ensureAudioReady = async () =>',
    'const triggerRoom3BodyExciter = (',
    'const playScheduledTone = (',
  ].every((needle) => app.includes(needle)),
  appLineCountDidNotGrow: appLines < 6588,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  contractLines,
  movedScope: [
    'nexusRefs runtime shape factory',
    'nexus cursor snapshot/mutation seam',
    'transient queue clear seam',
    'runtime-shape type imports that formerly lived in App.tsx',
  ],
  explicitlyNotMoved: [
    'Wellenstarter emission body now behind emit-attack boundary',
    'Audio-ready/warmup behavior',
    'Room III body exciter behavior',
    'scheduled tone oscillator graph',
    'nexus agent behavior and collision/render loops',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
