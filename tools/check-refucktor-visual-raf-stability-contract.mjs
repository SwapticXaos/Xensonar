import { readFileSync } from 'node:fs';

const room = readFileSync('src/features/xensonar/family/refactor/XensonarRefactorRoom.tsx', 'utf8');
const simulation = readFileSync('src/features/xensonar/family/refactor/xensonarRefactorSimulationFrame.ts', 'utf8');
const frameRuntime = readFileSync('src/features/xensonar/family/refactor/useXensonarRefactorFrameRuntime.ts', 'utf8');
const failures = [];

const transportStateDecl = 'const [transportBeat, setTransportBeat] = useState(0);';
const beatRefDecl = 'const transportBeatRef = useRef(0);';
const throttleRefDecl = 'const lastTransportBeatUiCommitRef = useRef(0);';
if (!room.includes(transportStateDecl) || !room.includes(beatRefDecl) || !room.includes(throttleRefDecl)) {
  failures.push('Refucktor must keep transportBeat UI state throttled behind refs, not as the only frame clock.');
}

const frameBeatUpdate = /const beat = audioRef\.current \? \(audioRef\.current\.currentTime \* paramsRef\.current\.quantizeBpm\) \/ 60 : 0;[\s\S]*?transportBeatRef\.current = beat;[\s\S]*?nowMs - lastTransportBeatUiCommitRef\.current >= 160[\s\S]*?setTransportBeat\(beat\);/;
if (!frameBeatUpdate.test(simulation)) {
  failures.push('simulation frame must update transportBeatRef every frame but commit React UI state only on a throttled interval.');
}

const drawDependencyMatch = room.match(/const draw = useCallback\([\s\S]*?\}, \[([^\]]*)\]\);/);
if (!drawDependencyMatch) {
  failures.push('Could not locate Refucktor draw callback dependency list.');
} else if (drawDependencyMatch[1].includes('transportBeat')) {
  failures.push('draw callback must not depend on transportBeat state, otherwise recording-duration UI churn can rebind the RAF loop.');
}

if (!room.includes('ctx.fillText(`Beat: ${transportBeatRef.current.toFixed(2)}`, 18, 60);')) {
  failures.push('Canvas beat label should read the frame-local transportBeatRef, not transportBeat React state.');
}
if (room.includes('requestAnimationFrame(')) failures.push('Room must not own requestAnimationFrame after the frame-runtime boundary.');
if (!frameRuntime.includes('syncSharedField();\n      if (powered) stepSimulation(dt, now);\n      draw();')) {
  failures.push('frame runtime must preserve syncSharedField -> simulation -> draw order.');
}
if (!frameRuntime.includes('animationRef.current = requestAnimationFrame(loop);')) {
  failures.push('frame runtime must own RAF continuation.');
}

if (failures.length) {
  console.error('[check-refucktor-visual-raf-stability-contract] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[check-refucktor-visual-raf-stability-contract] OK');
