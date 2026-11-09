import {
  adjustStampScaleState,
  clampStampScale,
  createStampDataState,
  createStampToolStoreActions,
  resetStampTransformState,
  rotateStampState,
  setStampRotationState,
  setStampScaleState,
  wrapStampRotation,
  type StampPhase,
} from '../src/features/l3lab/spectralForge/state/storeStampToolActions';
import type { StampData } from '../src/features/l3lab/spectralForge/audio/SpectralData';

type StampState = {
  stampData: StampData | null;
  stampScaleX: number;
  stampScaleY: number;
  stampRotation: number;
  stampFlipX: boolean;
  stampFlipY: boolean;
  stampPhase: StampPhase;
  stampSelStart: { x: number; y: number } | null;
};

const sampleStamp: StampData = {
  data: new Float32Array([0.25, 0.5]),
  grainData: new Float32Array([0.1, 0.2]),
  width: 2,
  height: 1,
};

const baseState = (): StampState => ({
  stampData: null,
  stampScaleX: 1.5,
  stampScaleY: 2.5,
  stampRotation: Math.PI * 2 - 0.25,
  stampFlipX: true,
  stampFlipY: true,
  stampPhase: 'idle',
  stampSelStart: null,
});

function oldClampStampScale(scale: number): number {
  return Math.max(0.1, Math.min(8, scale));
}

function oldWrapStampRotation(rotationRadians: number): number {
  const twoPi = Math.PI * 2;
  return ((rotationRadians % twoPi) + twoPi) % twoPi;
}

function oldCreateStampDataState(data: StampData | null): Partial<StampState> {
  return {
    stampData: data,
    stampScaleX: 1,
    stampScaleY: 1,
    stampRotation: 0,
    stampFlipX: false,
    stampFlipY: false,
  };
}

function oldSetStampScaleState(state: StampState, scaleX: number, scaleY?: number): Partial<StampState> {
  return {
    stampScaleX: Math.max(0.1, Math.min(8, scaleX)),
    stampScaleY: Math.max(0.1, Math.min(8, scaleY ?? state.stampScaleY)),
  };
}

function oldAdjustStampScaleState(state: StampState, dx: number, dy: number): Partial<StampState> {
  return {
    stampScaleX: Math.max(0.1, Math.min(8, state.stampScaleX + dx)),
    stampScaleY: Math.max(0.1, Math.min(8, state.stampScaleY + dy)),
  };
}

function oldRotateStampState(state: StampState, deltaRadians: number): Partial<StampState> {
  const next = state.stampRotation + deltaRadians;
  const twoPi = Math.PI * 2;
  const wrapped = ((next % twoPi) + twoPi) % twoPi;
  return { stampRotation: wrapped };
}

function oldSetStampRotationState(rotationRadians: number): Partial<StampState> {
  const twoPi = Math.PI * 2;
  const wrapped = ((rotationRadians % twoPi) + twoPi) % twoPi;
  return { stampRotation: wrapped };
}

function oldResetStampTransformState(): Partial<StampState> {
  return {
    stampScaleX: 1,
    stampScaleY: 1,
    stampRotation: 0,
    stampFlipX: false,
    stampFlipY: false,
  };
}

function normalize(value: unknown): unknown {
  if (value instanceof Float32Array) return Array.from(value);
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, normalize(child)]));
  }
  if (typeof value === 'number') return Math.abs(value) < 1e-12 ? 0 : Number(value.toFixed(12));
  return value;
}

function assertEqual(label: string, actual: unknown, expected: unknown): void {
  const actualJson = JSON.stringify(normalize(actual));
  const expectedJson = JSON.stringify(normalize(expected));
  if (actualJson !== expectedJson) {
    throw new Error(`${label} mismatch\nactual:   ${actualJson}\nexpected: ${expectedJson}`);
  }
}

function applyPatch(state: StampState, patch: Partial<StampState>): StampState {
  return { ...state, ...patch };
}

function runStoreActionScenario(label: string, run: (actions: ReturnType<typeof createStampToolStoreActions<StampState>>) => void, expected: Partial<StampState>): void {
  let state = baseState();
  const set = (partial: Partial<StampState> | ((state: StampState) => Partial<StampState>)) => {
    const patch = typeof partial === 'function' ? partial(state) : partial;
    state = applyPatch(state, patch);
  };
  const actions = createStampToolStoreActions<StampState>(set);
  run(actions);
  assertEqual(label, state, applyPatch(baseState(), expected));
}

const checked: string[] = [];
function check(label: string, actual: unknown, expected: unknown): void {
  assertEqual(label, actual, expected);
  checked.push(label);
}

check('clamp lower bound', clampStampScale(-12), oldClampStampScale(-12));
check('clamp upper bound', clampStampScale(22), oldClampStampScale(22));
check('wrap negative rotation', wrapStampRotation(-0.5), oldWrapStampRotation(-0.5));
check('wrap overfull rotation', wrapStampRotation(Math.PI * 4 + 0.25), oldWrapStampRotation(Math.PI * 4 + 0.25));
check('setStampData resets transform', createStampDataState<StampState>(sampleStamp), oldCreateStampDataState(sampleStamp));
check('setStampScale clamps and preserves y fallback', setStampScaleState(baseState(), 0.01), oldSetStampScaleState(baseState(), 0.01));
check('setStampScale clamps provided y', setStampScaleState(baseState(), 9, -1), oldSetStampScaleState(baseState(), 9, -1));
check('adjustStampScale clamps both axes', adjustStampScaleState(baseState(), 12, -12), oldAdjustStampScaleState(baseState(), 12, -12));
check('rotateStamp wraps by delta', rotateStampState(baseState(), 0.75), oldRotateStampState(baseState(), 0.75));
check('setStampRotation wraps absolute value', setStampRotationState<StampState>(-Math.PI / 2), oldSetStampRotationState(-Math.PI / 2));
check('resetStampTransform resets only transform', resetStampTransformState<StampState>(), oldResetStampTransformState());

runStoreActionScenario('toggleStampFlipX inverts x only', (actions) => actions.toggleStampFlipX(), { stampFlipX: false });
checked.push('toggleStampFlipX inverts x only');
runStoreActionScenario('toggleStampFlipY inverts y only', (actions) => actions.toggleStampFlipY(), { stampFlipY: false });
checked.push('toggleStampFlipY inverts y only');
runStoreActionScenario('setStampPhase updates phase only', (actions) => actions.setStampPhase('stamping'), { stampPhase: 'stamping' });
checked.push('setStampPhase updates phase only');
runStoreActionScenario('setStampSelStart updates selection start only', (actions) => actions.setStampSelStart({ x: 4, y: 9 }), { stampSelStart: { x: 4, y: 9 } });
checked.push('setStampSelStart updates selection start only');

console.log(JSON.stringify({ ok: true, checkedScenarios: checked.length, checked }, null, 2));
