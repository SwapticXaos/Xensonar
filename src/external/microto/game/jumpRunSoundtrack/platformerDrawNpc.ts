/**
 * Platformer NPC and field drawing helpers. Pure draw functions for music NPCs,
 * orbs, puzzle pedestals, resonance gates, NPC field auras and platforms.
 * Used by drawPlatformerFrame in platformerDraw.ts.
 */

import type { SimState } from "./platformerState";
import { clamp } from "../../shared/tuning/grid";
import { describePlatformerPuzzleToken } from "./platformerAdventure";
import { getPlatformerScaleProfile } from "./platformerNpcMusic";
import { buildPlatformerNpcFieldState } from "./platformerNpcField";

export function drawMusicNpc(
  ctx: CanvasRenderingContext2D,
  npc: SimState["musicNpcs"][number],
  simTime: number,
): void {
  ctx.save();
  const hover = Math.sin(simTime * 2.4 + npc.phase * Math.PI * 2) * 4;
  const x = npc.x;
  const y = npc.y + hover;
  const scaleLabel = getPlatformerScaleProfile(npc.scaleId).label;
  const disposition = npc.disposition ?? "mirror";
  const tarotTitle = npc.tarotTitle ?? "Arcana";
  const tarotOrientation = npc.tarotOrientation ?? "upright";
  const modernRole = npc.modernRole ?? "Archetype";
  const moodLabel = npc.moodLabel ?? disposition.toUpperCase();
  const loomActiveLabel = npc.loomActiveLabel ?? "DRAFT";
  const mirrorLabel = npc.mirrorLabel ?? "telemetry echo";
  const auraColor =
    disposition === "guide"
      ? "rgba(134, 239, 172, 0.22)"
      : disposition === "trickster"
        ? "rgba(251, 113, 133, 0.2)"
        : "rgba(196, 181, 253, 0.22)";
  ctx.fillStyle = "rgba(15, 23, 42, 0.28)";
  ctx.beginPath();
  ctx.ellipse(x, y + 20, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = auraColor;
  ctx.beginPath();
  ctx.arc(x, y + 2, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = npc.color;
  ctx.beginPath();
  ctx.arc(x, y + 2, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(15, 23, 42, 0.9)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 255, 255, 0.24)";
  ctx.beginPath();
  ctx.arc(x - 4, y - 2, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(226, 232, 240, 0.88)";
  ctx.lineWidth = 2;
  if (npc.throwStyle === "arc") {
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 8);
    ctx.quadraticCurveTo(x - 3, y - 18, x + 1, y - 8);
    ctx.quadraticCurveTo(x + 6, y - 18, x + 10, y - 8);
    ctx.stroke();
  } else if (npc.throwStyle === "fan") {
    ctx.beginPath();
    ctx.moveTo(x - 12, y - 2);
    ctx.lineTo(x - 20, y - 16);
    ctx.lineTo(x - 2, y - 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 12, y - 2);
    ctx.lineTo(x + 20, y - 16);
    ctx.lineTo(x + 2, y - 8);
    ctx.stroke();
  } else if (npc.throwStyle === "drift") {
    ctx.beginPath();
    ctx.ellipse(x, y - 8, 14, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 4);
    ctx.quadraticCurveTo(x + 24, y - 6, x + 18, y - 14);
    ctx.stroke();
  }

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(x - 6, y, 3, 3);
  ctx.fillRect(x + 3, y, 3, 3);

  ctx.fillStyle = "rgba(226, 232, 240, 0.92)";
  ctx.font = "700 9px monospace";
  ctx.textAlign = "center";
  ctx.fillText(npc.label.toUpperCase(), x, y - 20);
  ctx.font = "600 8px monospace";
  ctx.fillStyle = "rgba(191, 219, 254, 0.82)";
  ctx.fillText(scaleLabel.toUpperCase(), x, y - 10);
  ctx.font = "600 7px monospace";
  ctx.fillStyle = "rgba(226, 232, 240, 0.75)";
  ctx.fillText(`${tarotTitle.toUpperCase()} ${tarotOrientation === "upright" ? "UPR" : "REV"}`, x, y + 30);
  ctx.fillStyle = "rgba(191, 219, 254, 0.78)";
  ctx.fillText(modernRole.toUpperCase(), x, y + 40);
  ctx.fillStyle = "rgba(250, 204, 21, 0.82)";
  ctx.fillText(loomActiveLabel.toUpperCase(), x, y + 50);
  ctx.fillStyle =
    disposition === "guide"
      ? "rgba(187, 247, 208, 0.84)"
      : disposition === "trickster"
        ? "rgba(254, 205, 211, 0.84)"
        : "rgba(221, 214, 254, 0.84)";
  ctx.fillText(moodLabel.toUpperCase(), x, y + 60);
  ctx.fillStyle = "rgba(226, 232, 240, 0.72)";
  ctx.fillText(mirrorLabel.toUpperCase(), x, y + 70);
  ctx.restore();
}

export function drawNpcOrb(
  ctx: CanvasRenderingContext2D,
  orb: SimState["noteOrbs"][number],
): void {
  const radius = 6 + Math.sin(orb.age * 10 + orb.noteIndex) * 1.2;
  ctx.save();
  ctx.globalAlpha = clamp(orb.life / 1.6, 0.22, 0.94);
  ctx.fillStyle = orb.color;
  ctx.beginPath();
  ctx.arc(orb.x, orb.y, radius + 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = clamp(orb.life / 1.4, 0.3, 1);
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.beginPath();
  ctx.arc(orb.x, orb.y, Math.max(2.4, radius * 0.48), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawPuzzlePedestal(
  ctx: CanvasRenderingContext2D,
  pedestal: SimState["puzzlePedestals"][number],
  simTime: number,
): void {
  ctx.save();
  const pulse = 0.42 + 0.58 * Math.sin(simTime * 4 + pedestal.order);
  ctx.fillStyle = pedestal.activated
    ? `rgba(34, 197, 94, ${0.22 + pulse * 0.2})`
    : `rgba(59, 130, 246, ${0.12 + pulse * 0.14})`;
  ctx.fillRect(pedestal.x - 10, pedestal.y - 24, 20, 24);
  ctx.fillStyle = pedestal.activated ? "rgba(187, 247, 208, 0.95)" : "rgba(219, 234, 254, 0.92)";
  ctx.font = "700 8px monospace";
  ctx.textAlign = "center";
  ctx.fillText(describePlatformerPuzzleToken(pedestal.target).toUpperCase(), pedestal.x, pedestal.y - 30);
  ctx.fillStyle = pedestal.activated ? "rgba(74, 222, 128, 0.95)" : "rgba(96, 165, 250, 0.9)";
  ctx.beginPath();
  ctx.arc(pedestal.x, pedestal.y - 12, pedestal.activated ? 7 : 6 + pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawResonanceGate(
  ctx: CanvasRenderingContext2D,
  gate: SimState["resonanceGates"][number],
  simTime: number,
  gateWindow?: ReturnType<typeof buildPlatformerNpcFieldState>["draftGateWindow"] | null,
): void {
  ctx.save();
  if (gate.open) {
    ctx.strokeStyle = "rgba(74, 222, 128, 0.45)";
    ctx.setLineDash([8, 8]);
    ctx.lineWidth = 2;
    ctx.strokeRect(gate.x, gate.y, gate.w, gate.h);
    ctx.setLineDash([]);
    ctx.restore();
    return;
  }
  const pulse = 0.45 + 0.55 * Math.sin(simTime * 4.2);
  ctx.fillStyle = `rgba(34, 211, 238, ${0.14 + pulse * 0.12})`;
  ctx.fillRect(gate.x, gate.y, gate.w, gate.h);
  ctx.strokeStyle = `rgba(125, 211, 252, ${0.45 + pulse * 0.28})`;
  ctx.lineWidth = 3;
  ctx.strokeRect(gate.x, gate.y, gate.w, gate.h);
  for (let stripe = 0; stripe < 6; stripe += 1) {
    const y = gate.y + 12 + stripe * 24 + pulse * 4;
    if (gateWindow && gateWindow.gateId === gate.id && y >= gateWindow.y - 2 && y <= gateWindow.y + gateWindow.h) {
      continue;
    }
    ctx.fillStyle = `rgba(186, 230, 253, ${0.14 + pulse * 0.1})`;
    ctx.fillRect(gate.x + 4, y, gate.w - 8, 4);
  }
  if (gateWindow && gateWindow.gateId === gate.id) {
    ctx.fillStyle = "rgba(8, 18, 32, 0.9)";
    ctx.fillRect(gateWindow.x, gateWindow.y, gateWindow.w, gateWindow.h);
    ctx.strokeStyle = gateWindow.color;
    ctx.lineWidth = 2;
    if (gateWindow.tarotOrientation === "reversed") {
      ctx.setLineDash([6, 4]);
    }
    ctx.strokeRect(gateWindow.x, gateWindow.y, gateWindow.w, gateWindow.h);
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(226, 232, 240, 0.9)";
    ctx.font = "700 8px monospace";
    ctx.textAlign = "center";
    ctx.fillText(gateWindow.label, gateWindow.x + gateWindow.w * 0.5, gateWindow.y - 6);
  }
  ctx.restore();
}

export function drawNpcFieldAura(
  ctx: CanvasRenderingContext2D,
  aura: ReturnType<typeof buildPlatformerNpcFieldState>["auras"][number],
  pedestals: SimState["puzzlePedestals"],
): void {
  ctx.save();
  if (aura.tarotOrientation === "reversed") {
    ctx.setLineDash([6, 6]);
  }
  ctx.strokeStyle = aura.color;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.28 + aura.strength * 0.24;
  ctx.beginPath();
  ctx.arc(aura.x, aura.y, aura.radius * (0.22 + aura.strength * 0.18), 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  if (aura.focusPedestalId) {
    const pedestal = pedestals.find((entry) => entry.id === aura.focusPedestalId);
    if (pedestal) {
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = "rgba(196, 181, 253, 0.56)";
      ctx.beginPath();
      ctx.moveTo(aura.x, aura.y);
      ctx.lineTo(pedestal.x, pedestal.y - 12);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.restore();
}

export function drawNpcFieldPlatform(
  ctx: CanvasRenderingContext2D,
  platform: ReturnType<typeof buildPlatformerNpcFieldState>["manifestPlatforms"][number],
  simTime: number,
): void {
  const pulse = 0.42 + 0.58 * Math.sin(simTime * 4.2 + platform.strength * Math.PI * 2);
  ctx.save();
  ctx.fillStyle = platform.color;
  ctx.globalAlpha = 0.34 + pulse * 0.18;
  ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
  ctx.strokeStyle = "rgba(226, 232, 240, 0.82)";
  ctx.lineWidth = 2;
  if (platform.fieldKind === "route_seal") {
    ctx.beginPath();
    ctx.moveTo(platform.x + platform.w * 0.5, platform.y);
    ctx.lineTo(platform.x + platform.w * 0.5, platform.y + platform.h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(platform.x + 2, platform.y + 8);
    ctx.lineTo(platform.x + platform.w - 2, platform.y + platform.h - 8);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(platform.x, platform.y + platform.h * 0.5);
    ctx.lineTo(platform.x + platform.w, platform.y + platform.h * 0.5);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(226, 232, 240, 0.84)";
  ctx.font = "700 8px monospace";
  ctx.textAlign = "center";
  ctx.fillText(platform.label, platform.x + platform.w * 0.5, platform.y - 6);
  ctx.restore();
}
