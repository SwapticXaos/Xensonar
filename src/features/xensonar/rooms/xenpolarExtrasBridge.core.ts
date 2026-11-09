import { useRef, useState } from 'react';
import type { Room } from '../domain/runtimeTypes';

type XenpolarView = 'launcher' | 'melodicQuest' | 'resonanzwanderer' | 'xenpolar3' | 'arena';

type ArenaBody = { [key: string]: any; x: number; y: number; vx?: any; vy?: any; r?: any; life?: any; color?: string; spin?: any; hue?: any };

export type IrrlichtArenaRuntimeState = {
  [key: string]: any;
  elapsed: number;
  enemyTimer: number;
  laserTimer: number;
  invuln: number;
  score: number;
  totalScore: number;
  hp: number;
  hits: number;
  over: boolean;
  won: boolean;
  anchors: any[];
  lasers: ArenaBody[];
  bolts: ArenaBody[];
  hearts: ArenaBody[];
  particles: ArenaBody[];
};

export type IrrlichtArenaHudState = {
  score: number;
  goal: number;
  total: number;
  hp: number;
  phase: string;
  time: number;
  level: number;
  anchor: string;
  message: string;
};

export type IrrlichtArenaInterpreterSnapshot = {
  t: number;
  playerX: number;
  orbX: number;
  orbY: number;
  orbVx: number;
  orbVy: number;
  fieldWidth: number;
  fieldHeight: number;
  anchorRatio: number;
  anchorLabel: string;
  level: number;
  hp: number;
  totalScore: number;
  phaseIndex: number;
  won: boolean;
  over: boolean;
};

export type IrrlichtArenaInterpreter = {
  [key: string]: any;
  capture: { events: unknown[]; finished: boolean; durationSec: number; won: boolean };
};

export type UseXenpolarControllerArgs = {
  room: Room;
  setRoom: (room: Room) => void;
  clampValue: (value: number, min: number, max: number) => number;
};

const CORE_MESSAGE = 'Extras nicht im Core-Build.';
const EMPTY_ARENA: IrrlichtArenaRuntimeState = {
  elapsed: 0,
  enemyTimer: 0,
  laserTimer: 0,
  invuln: 0,
  score: 0,
  totalScore: 0,
  hp: 6,
  hits: 0,
  over: false,
  won: false,
  anchors: [],
  lasers: [],
  bolts: [],
  hearts: [],
  particles: [],
};

function createCoreHud(): IrrlichtArenaHudState {
  return { score: 0, goal: 0, total: 0, hp: 0, phase: 'Core', time: 0, level: 0, anchor: '—', message: CORE_MESSAGE };
}


export function clampFreq(value: number, min = 20, max = 20000): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

export function advanceGameChaos(_state?: unknown, a = Math.random(), b = Math.random()): number {
  return ((Number.isFinite(a) ? a : 0.5) + (Number.isFinite(b) ? b : 0.5)) * 0.5;
}

export function hybridGameFreq(args: Record<string, any> = {}): number {
  const base = Number.isFinite(args.base ?? NaN) ? Number(args.base) : 110;
  const anchorRatio = Number.isFinite(args.anchorRatio ?? NaN) ? Number(args.anchorRatio) : 1;
  const register = Number.isFinite(args.register ?? NaN) ? Number(args.register) : 0;
  const chaos = Number.isFinite(args.chaos ?? NaN) ? Number(args.chaos) : 0.5;
  return clampFreq(base * anchorRatio * Math.pow(2, register + (chaos - 0.5) * 0.04));
}

export function createActiveIrrlichtArenaState(): IrrlichtArenaRuntimeState {
  return {
    ...EMPTY_ARENA,
    playerX: 0,
    playerY: 0,
    orb: { x: 0, y: 0, vx: 0, vy: 0, r: 10 },
    level: 1,
    levelUpTimer: 0,
    levelUpFrom: 1,
    levelUpTo: 1,
    commonsClock: 0,
    commonsStep: 0,
    commonsStepDur: 0.5,
    phaseA: 0,
    phaseB: 0,
    shotCount: 0,
    activeAnchorRatio: 1,
    activeAnchorLabel: 'Core',
    phaseC: 0,
  };
}

export function createDormantIrrlichtArenaState(): IrrlichtArenaRuntimeState {
  return { ...createActiveIrrlichtArenaState(), over: true };
}

export function createActiveIrrlichtArenaHud(): IrrlichtArenaHudState {
  return createCoreHud();
}

export function createDormantIrrlichtArenaHud(): IrrlichtArenaHudState {
  return createCoreHud();
}

export function createIrrlichtArenaInterpreter(): IrrlichtArenaInterpreter {
  return { capture: { events: [], finished: false, durationSec: 0, won: false } };
}

export function captureIrrlichtArenaEvent(interpreter: IrrlichtArenaInterpreter, snapshot: unknown, kind: string, detail?: unknown): void {
  interpreter.capture.events.push({ snapshot, kind, detail });
}

export function finalizeIrrlichtArenaRun(interpreter: IrrlichtArenaInterpreter, _snapshot?: unknown): void {
  interpreter.capture.finished = true;
}

export function buildIrrlichtArenaSeed(_interpreter: IrrlichtArenaInterpreter, meta: Record<string, unknown> = {}) {
  return { summary: { eventCount: 0, durationSec: 0, ...meta }, seed: meta };
}

export function formatIrrlichtArenaSeedStatus(summary: Record<string, unknown>): string {
  const name = typeof summary.name === 'string' ? summary.name : 'Core-Seed';
  return `${name} · Core-Extras deaktiviert`;
}

export function resolveArenaAnchorRatios(_state?: unknown): any[] {
  return [1];
}

const noopAudio = (..._args: any[]) => undefined;
export const playHeartPickupChord = noopAudio;
export const playOrbHitSound = noopAudio;
export const playOrbShotSound = noopAudio;
export const playPlayerHitSound = noopAudio;
export const playPlayerShotMotif = noopAudio;

export function useXenpolarController(_args: UseXenpolarControllerArgs) {
  const gameCanvasRef = useRef<HTMLCanvasElement>(null);
  const gameRefs = useRef<IrrlichtArenaRuntimeState>({ ...EMPTY_ARENA });
  const [gameActive, setGameActive] = useState(false);
  const [gameHud, setGameHud] = useState(createCoreHud);
  const [xenpolarView, setXenpolarView] = useState<XenpolarView>('launcher');
  const [arenaSeedStatus, setArenaSeedStatus] = useState(CORE_MESSAGE);
  const arenaInterpreterRef = useRef<IrrlichtArenaInterpreter>({ capture: { events: [], finished: false, durationSec: 0, won: false } });

  return {
    gameCanvasRef,
    gameRefs,
    gameActive,
    setGameActive,
    gameHud,
    setGameHud,
    xenpolarView,
    setXenpolarView,
    arenaSeedStatus,
    setArenaSeedStatus,
    arenaInterpreterRef,
    getArenaInterpreterSnapshot: (): IrrlichtArenaInterpreterSnapshot => ({
      t: 0,
      playerX: 0,
      orbX: 0,
      orbY: 0,
      orbVx: 0,
      orbVy: 0,
      fieldWidth: 0,
      fieldHeight: 0,
      anchorRatio: 1,
      anchorLabel: 'Core',
      level: 0,
      hp: 0,
      totalScore: 0,
      phaseIndex: 0,
      won: false,
      over: false,
    }),
    handleArenaSeedExport: () => setArenaSeedStatus(CORE_MESSAGE),
    resonanzwandererStatus: CORE_MESSAGE,
    resonanzwandererBusy: false,
    resonanzwandererCanExport: false,
    handleResonanzwandererExportToXensonar: async () => undefined,
    handleResonanzwandererExportToSpectralForge: async () => undefined,
    handleResonanzwandererExportToSyntheticForge: async () => undefined,
  };
}
