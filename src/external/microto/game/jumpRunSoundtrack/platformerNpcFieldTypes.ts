/**
 * Types for NPC field state: auras, manifest platforms, gate windows, input/state.
 * Extracted from platformerNpcField to keep main module under soft LOC target and clarify boundaries.
 */

import type {
  PlatformerPuzzlePedestal,
  PlatformerPuzzleToken,
  PlatformerResonanceGate,
} from "./platformerAdventure";
import type {
  PlatformerMusicNpc,
  PlatformerNpcDisposition,
  PlatformerNpcTarotOrientation,
} from "./platformerNpcMusic";
import type { Platform, RouteSelection } from "./platformerState";

export type PlatformerNpcFieldAura = {
  npcId: string;
  animal: PlatformerMusicNpc["animal"];
  disposition: PlatformerNpcDisposition;
  tarotTitle: string;
  tarotOrientation: NonNullable<PlatformerMusicNpc["tarotOrientation"]>;
  modernRole: string;
  aspectLabel: string;
  x: number;
  y: number;
  radius: number;
  strength: number;
  color: string;
  focusPedestalId: string | null;
};

export type PlatformerNpcFieldPlatform = Pick<
  Platform,
  "id" | "x" | "y" | "w" | "h" | "kind" | "routeGroupId" | "routeDirection"
> & {
  fieldKind: "route_bridge" | "lift_echo" | "pedestal_echo" | "route_seal";
  label: string;
  color: string;
  disposition: PlatformerNpcDisposition;
  tarotOrientation: PlatformerNpcTarotOrientation;
  strength: number;
};

export type PlatformerNpcFieldGateWindow = {
  gateId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  color: string;
  disposition: PlatformerNpcDisposition;
  tarotOrientation: PlatformerNpcTarotOrientation;
  strength: number;
};

export type PlatformerNpcFieldState = {
  landingSnapBonus: number;
  oneWaySnapBonus: number;
  pedestalTouchBonus: number;
  puzzleTokenWindowBonus: number;
  pickupRadiusBonus: number;
  gravityScale: number;
  tractionScale: number;
  actionDriveBias: number;
  noteMagnetism: number;
  routeFocusGroupId: string | null;
  routeFocusChoice: RouteSelection;
  routeFocusStrength: number;
  routeHintLabel: string | null;
  routeHintDisposition: PlatformerNpcDisposition | null;
  routeHintOrientation: PlatformerNpcTarotOrientation | null;
  routeLockGroupId: string | null;
  routeLockChoice: RouteSelection;
  routeLockStrength: number;
  routeLockLabel: string | null;
  decoyRouteChoice: RouteSelection;
  decoyRouteLabel: string | null;
  focusPedestalId: string | null;
  focusLabel: string | null;
  echoPuzzleToken: PlatformerPuzzleToken | null;
  echoPuzzleLabel: string | null;
  echoPuzzleStrength: number;
  shadowPuzzleToken: PlatformerPuzzleToken | null;
  shadowPuzzleLabel: string | null;
  shadowPuzzleStrength: number;
  draftGateWindow: PlatformerNpcFieldGateWindow | null;
  statusLabel: string | null;
  auras: PlatformerNpcFieldAura[];
  manifestPlatforms: PlatformerNpcFieldPlatform[];
};

export type PlatformerNpcFieldInput = {
  playerX: number;
  playerY: number;
  playerVx: number;
  playerOnGround: boolean;
  t: number;
  lastProgressAt: number;
  lastMelodyToken: PlatformerPuzzleToken | null;
  routeSelections: Record<string, RouteSelection>;
  platforms: Platform[];
  musicNpcs: PlatformerMusicNpc[];
  puzzlePedestals: PlatformerPuzzlePedestal[];
  resonanceGates: PlatformerResonanceGate[];
};
