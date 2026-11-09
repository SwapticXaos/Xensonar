import type { Platform } from "./platformerState";

export type PlatformerPuzzleToken = "major" | "minor" | "npc" | "mode";

export type PlatformerPuzzlePedestal = {
  id: string;
  gateId: string;
  x: number;
  y: number;
  target: PlatformerPuzzleToken;
  order: number;
  activated: boolean;
  lastTouchedAt: number;
};

export type PlatformerResonanceGate = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  open: boolean;
};

type PuzzleAnchor = {
  platformId: string;
  target: PlatformerPuzzleToken;
  gateId: string;
  side?: "left" | "center" | "right";
  yLift?: number;
};

const PUZZLE_ANCHORS: PuzzleAnchor[] = [
  { platformId: "plateau-2", target: "major", gateId: "finish-resonance", side: "right", yLift: 22 },
  { platformId: "merge-1", target: "minor", gateId: "finish-resonance", side: "center", yLift: 22 },
  { platformId: "mid-2", target: "npc", gateId: "finish-resonance", side: "left", yLift: 22 },
];

const tokenLabelMap: Record<PlatformerPuzzleToken, string> = {
  major: "Dur",
  minor: "Moll",
  npc: "NPC",
  mode: "Modus",
};

const findPlatform = (platforms: Platform[], id: string) => {
  const platform = platforms.find((entry) => entry.id === id);
  if (!platform) {
    throw new Error(`Missing platform ${id}`);
  }
  return platform;
};

export function describePlatformerPuzzleToken(token: PlatformerPuzzleToken): string {
  return tokenLabelMap[token];
}

export function createPlatformerPuzzlePedestals(platforms: Platform[]): PlatformerPuzzlePedestal[] {
  return PUZZLE_ANCHORS.map((anchor, index) => {
    const platform = findPlatform(platforms, anchor.platformId);
    const x =
      anchor.side === "left"
        ? platform.x + 34
        : anchor.side === "right"
          ? platform.x + platform.w - 38
          : platform.x + platform.w * 0.5;
    return {
      id: `pedestal-${anchor.target}-${index}`,
      gateId: anchor.gateId,
      x,
      y: platform.y - (anchor.yLift ?? 20),
      target: anchor.target,
      order: index,
      activated: false,
      lastTouchedAt: -999,
    };
  });
}

export function createPlatformerResonanceGates(platforms: Platform[]): PlatformerResonanceGate[] {
  const finishPlatform = findPlatform(platforms, "finish-platform");
  return [{
    id: "finish-resonance",
    label: "Echo Gate",
    x: finishPlatform.x - 78,
    y: finishPlatform.y - 170,
    w: 28,
    h: 170,
    open: false,
  }];
}

export function getNextPlatformerPuzzlePedestal(
  pedestals: PlatformerPuzzlePedestal[],
  gateId: string,
): PlatformerPuzzlePedestal | null {
  const ordered = pedestals
    .filter((pedestal) => pedestal.gateId === gateId)
    .sort((a, b) => a.order - b.order);
  return ordered.find((pedestal) => !pedestal.activated) ?? null;
}

export function arePlatformerGatePedestalsSolved(
  pedestals: PlatformerPuzzlePedestal[],
  gateId: string,
): boolean {
  const gatePedestals = pedestals.filter((pedestal) => pedestal.gateId === gateId);
  return gatePedestals.length > 0 && gatePedestals.every((pedestal) => pedestal.activated);
}

export function resetPlatformerGatePedestals(
  pedestals: PlatformerPuzzlePedestal[],
  gateId: string,
): void {
  pedestals.forEach((pedestal) => {
    if (pedestal.gateId !== gateId) return;
    pedestal.activated = false;
  });
}
