/**
 * Platformer canvas drawing for Jump Run Soundtrack.
 * Pure draw function: (ctx, state, platforms) → frame.
 * NPC/field drawing delegated to platformerDrawNpc.ts.
 */

import type { Platform, SimState } from "./platformerState";
import type { PlatformerComposerPreview } from "./platformerComposerPreview";
import {
  isPlatformActiveForRoute,
  VIEW_W,
  VIEW_H,
  WORLD_W,
  PLAYER_W,
  PLAYER_H,
} from "./platformerState";
import { clamp } from "../../shared/tuning/grid";
import { drawComposerPreviewOverlay } from "./platformerDrawPreview";
import { buildPlatformerNpcFieldState } from "./platformerNpcField";
import {
  drawMusicNpc,
  drawNpcOrb,
  drawPuzzlePedestal,
  drawResonanceGate,
  drawNpcFieldAura,
  drawNpcFieldPlatform,
} from "./platformerDrawNpc";

export function drawPlatformerFrame(
  ctx: CanvasRenderingContext2D,
  s: SimState,
  platforms: Platform[],
  composerPreview?: PlatformerComposerPreview | null,
): void {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, "#101a2f");
  sky.addColorStop(0.5, "#1b2e3f");
  sky.addColorStop(1, "#203545");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const cam = s.cameraX;

  ctx.fillStyle = "rgba(134, 169, 198, 0.22)";
  for (let i = -1; i < 8; i += 1) {
    const x = i * 260 - (cam * 0.2) % 260;
    const h = 70 + ((i % 3) + 1) * 30;
    ctx.beginPath();
    ctx.moveTo(x, VIEW_H);
    ctx.lineTo(x + 140, VIEW_H - h);
    ctx.lineTo(x + 280, VIEW_H);
    ctx.closePath();
    ctx.fill();
  }

  ctx.save();
  ctx.translate(-cam, 0);
  const npcField = buildPlatformerNpcFieldState({
    playerX: s.player.x + PLAYER_W * 0.5,
    playerY: s.player.y + PLAYER_H * 0.5,
    playerVx: s.player.vx,
    playerOnGround: s.player.onGround,
    t: s.t,
    lastProgressAt: s.lastProgressAt,
    lastMelodyToken: s.lastMelodyToken,
    routeSelections: s.routeSelections,
    platforms,
    musicNpcs: s.musicNpcs,
    puzzlePedestals: s.puzzlePedestals,
    resonanceGates: s.resonanceGates,
  });

  for (const p of platforms) {
    const routeActive = isPlatformActiveForRoute(p, s.routeSelections);
    const routeSelection = p.routeGroupId ? (s.routeSelections[p.routeGroupId] ?? 0) : 0;
    const routeHinted =
      p.routeGroupId
      && routeSelection === 0
      && npcField.routeFocusGroupId === p.routeGroupId
      && npcField.routeFocusChoice !== 0;
    const hintedBranch = routeHinted && p.routeDirection === npcField.routeFocusChoice;
    const lockedBranch =
      p.routeGroupId
      && npcField.routeLockGroupId === p.routeGroupId
      && npcField.routeLockChoice !== 0
      && p.routeDirection === npcField.routeLockChoice;
    const decoyBranch =
      p.routeGroupId
      && npcField.routeLockGroupId === p.routeGroupId
      && npcField.decoyRouteChoice !== 0
      && p.routeDirection === npcField.decoyRouteChoice;
    if (p.routeGroupId) {
      const branchTone = p.routeDirection === 1
        ? (routeActive ? "rgba(34, 211, 238, 0.82)" : "rgba(34, 211, 238, 0.14)")
        : (routeActive ? "rgba(74, 222, 128, 0.8)" : "rgba(74, 222, 128, 0.14)");
      ctx.fillStyle = branchTone;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = p.routeDirection === 1
        ? (routeSelection === 0 ? "rgba(103, 232, 249, 0.55)" : "rgba(103, 232, 249, 0.82)")
        : (routeSelection === 0 ? "rgba(187, 247, 208, 0.48)" : "rgba(187, 247, 208, 0.78)");
      ctx.lineWidth = routeActive ? 2 : 1;
      ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.fillRect(p.x, p.y, p.w, 3);
      if (hintedBranch) {
        ctx.fillStyle =
          npcField.routeHintDisposition === "guide"
            ? `rgba(253, 224, 71, ${0.14 + npcField.routeFocusStrength * 0.14})`
            : npcField.routeHintDisposition === "trickster"
              ? `rgba(251, 113, 133, ${0.12 + npcField.routeFocusStrength * 0.16})`
              : `rgba(196, 181, 253, ${0.14 + npcField.routeFocusStrength * 0.14})`;
        ctx.fillRect(p.x, p.y - 6, p.w, 6);
      }
      if (lockedBranch) {
        ctx.fillStyle = `rgba(15, 23, 42, ${0.18 + npcField.routeLockStrength * 0.24})`;
        ctx.fillRect(p.x, p.y - 10, p.w, 10);
      }
      if (decoyBranch) {
        ctx.strokeStyle = "rgba(250, 204, 21, 0.8)";
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x + 4, p.y - 14, p.w - 8, 8);
        ctx.setLineDash([]);
      }
      ctx.fillStyle = routeActive ? "rgba(224, 242, 254, 0.78)" : "rgba(148, 163, 184, 0.28)";
      ctx.font = "600 10px monospace";
      ctx.fillText(p.routeDirection === 1 ? "HIGH" : "LOW", p.x + 8, p.y - 8);
      if (hintedBranch && npcField.routeHintLabel) {
        ctx.fillStyle =
          npcField.routeHintDisposition === "guide"
            ? "rgba(254, 240, 138, 0.9)"
            : npcField.routeHintDisposition === "trickster"
              ? "rgba(254, 205, 211, 0.9)"
              : "rgba(221, 214, 254, 0.9)";
        ctx.font = "700 8px monospace";
        ctx.fillText(npcField.routeHintLabel, p.x + 8, p.y - 18);
      }
      if (lockedBranch && npcField.routeLockLabel) {
        ctx.fillStyle = "rgba(254, 202, 202, 0.92)";
        ctx.font = "700 8px monospace";
        ctx.fillText(npcField.routeLockLabel, p.x + 8, p.y - 28);
      }
      if (decoyBranch && npcField.decoyRouteLabel) {
        ctx.fillStyle = "rgba(254, 240, 138, 0.88)";
        ctx.font = "700 8px monospace";
        ctx.fillText(npcField.decoyRouteLabel, p.x + 8, p.y - 18);
      }
      continue;
    }

    if (p.kind === "one_way") {
      if (npcField.oneWaySnapBonus > 0 && Math.abs((p.x + p.w * 0.5) - (s.player.x + PLAYER_W * 0.5)) < 260) {
        ctx.fillStyle = `rgba(186, 230, 253, ${0.08 + npcField.oneWaySnapBonus * 0.012})`;
        ctx.fillRect(p.x, p.y - 6, p.w, 6);
      }
      ctx.fillStyle = "rgba(125, 211, 252, 0.36)";
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = "rgba(186, 230, 253, 0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + p.h * 0.5);
      ctx.lineTo(p.x + p.w, p.y + p.h * 0.5);
      ctx.stroke();
      continue;
    }

    const color = p.kind === "bounce" ? "#4d7c0f" : "#334155";
    ctx.fillStyle = color;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(p.x, p.y, p.w, 4);
  }

  for (const fieldPlatform of npcField.manifestPlatforms) {
    drawNpcFieldPlatform(ctx, fieldPlatform, s.t);
  }

  for (const gate of s.resonanceGates) {
    drawResonanceGate(ctx, gate, s.t, npcField.draftGateWindow);
  }

  for (const obstacle of s.composerObstacles) {
    const pulse = 0.45 + 0.55 * Math.sin(s.t * obstacle.pulseRate * Math.PI * 2 + obstacle.pulseOffset * Math.PI * 2);
    const activeGlow = obstacle.activated ? 0.18 : 0.34 + pulse * 0.26;
    if (obstacle.kind === "sync_gate") {
      ctx.strokeStyle = `rgba(74, 222, 128, ${0.4 + activeGlow})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.fillStyle = `rgba(34, 197, 94, ${0.08 + pulse * 0.12})`;
      ctx.fillRect(obstacle.x + 5, obstacle.y + 6, obstacle.w - 10, obstacle.h - 12);
      for (let ring = 0; ring < 3; ring += 1) {
        const y = obstacle.y + 16 + ring * 24 + pulse * 8;
        ctx.fillStyle = `rgba(187, 247, 208, ${0.18 + pulse * 0.12})`;
        ctx.fillRect(obstacle.x + 7, y, obstacle.w - 14, 4);
      }
    } else if (obstacle.kind === "phase_gate") {
      ctx.strokeStyle = `rgba(110, 231, 183, ${0.28 + activeGlow})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(obstacle.x + obstacle.w * 0.5, obstacle.y - 22);
      ctx.lineTo(obstacle.x + obstacle.w * 0.5, obstacle.y + obstacle.h);
      ctx.stroke();
      ctx.fillStyle = `rgba(21, 128, 61, ${0.12 + pulse * 0.14})`;
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.fillStyle = "rgba(220, 252, 231, 0.92)";
      ctx.font = "700 14px monospace";
      ctx.fillText(obstacle.phase ?? "P", obstacle.x + 12, obstacle.y + 20);
    } else if (obstacle.kind === "chord_fork") {
      const dir = (obstacle.detail ?? 0) >= 0 ? 1 : -1;
      const midX = obstacle.x + obstacle.w * 0.5;
      const baseY = obstacle.y + obstacle.h;
      ctx.strokeStyle = `rgba(74, 222, 128, ${0.34 + activeGlow})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(midX, baseY);
      ctx.lineTo(midX, obstacle.y + obstacle.h * 0.52);
      ctx.lineTo(midX + dir * obstacle.w * 0.34, obstacle.y + obstacle.h * 0.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(midX + dir * obstacle.w * 0.34, obstacle.y + obstacle.h * 0.2);
      ctx.lineTo(midX + dir * obstacle.w * 0.26, obstacle.y + obstacle.h * 0.34);
      ctx.lineTo(midX + dir * obstacle.w * 0.44, obstacle.y + obstacle.h * 0.34);
      ctx.closePath();
      ctx.fillStyle = `rgba(187, 247, 208, ${0.28 + pulse * 0.26})`;
      ctx.fill();
      ctx.fillStyle = `rgba(34, 197, 94, ${0.1 + pulse * 0.12})`;
      ctx.fillRect(obstacle.x + 4, obstacle.y + obstacle.h - 10, obstacle.w - 8, 6);
    } else if (obstacle.kind === "silence_field") {
      ctx.fillStyle = `rgba(16, 185, 129, ${0.08 + pulse * 0.08})`;
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.strokeStyle = `rgba(209, 250, 229, ${0.22 + activeGlow})`;
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 2;
      ctx.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.setLineDash([]);
      for (let stripe = 0; stripe < 5; stripe += 1) {
        const sx = obstacle.x + 10 + stripe * ((obstacle.w - 20) / 4);
        ctx.strokeStyle = `rgba(220, 252, 231, ${0.14 + pulse * 0.12})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx - 10, obstacle.y + obstacle.h - 6);
        ctx.lineTo(sx + 14, obstacle.y + 6);
        ctx.stroke();
      }
    } else {
      const cx = obstacle.x + obstacle.w * 0.5;
      const cy = obstacle.y + obstacle.h * 0.5 + Math.sin(s.t * 3.6 + obstacle.pulseOffset * Math.PI) * 4;
      const r = obstacle.w * (0.52 + pulse * 0.12);
      ctx.fillStyle = `rgba(16, 185, 129, ${0.18 + activeGlow})`;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.8, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r * 0.8, cy);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = `rgba(209, 250, 229, ${0.45 + pulse * 0.3})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  for (const coin of s.coins) {
    if (coin.taken) continue;
    const bob = Math.sin(s.t * 4.5 + coin.spin) * 4;
    if (coin.kind === "mushroom") {
      ctx.fillStyle = "rgba(251, 191, 36, 0.95)";
      ctx.fillRect(coin.x - 2.5, coin.y + bob - 2, 5, 11);
      ctx.beginPath();
      ctx.arc(coin.x, coin.y + bob - 5, 10, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = "rgba(244, 114, 182, 0.92)";
      ctx.fill();
      ctx.fillStyle = "rgba(255, 244, 214, 0.9)";
      ctx.beginPath();
      ctx.arc(coin.x - 4, coin.y + bob - 9, 1.6, 0, Math.PI * 2);
      ctx.arc(coin.x + 3, coin.y + bob - 8, 1.8, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    const r = 7 + Math.sin(s.t * 10 + coin.spin) * 1.4;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y + bob, r, 0, Math.PI * 2);
    ctx.fillStyle =
      coin.kind === "coin_red"
        ? "rgba(251, 113, 133, 0.95)"
        : "rgba(96, 165, 250, 0.95)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(coin.x - 1.5, coin.y + bob - 1, r * 0.4, 0, Math.PI * 2);
    ctx.fillStyle =
      coin.kind === "coin_red"
        ? "rgba(255, 228, 230, 0.88)"
        : "rgba(219, 234, 254, 0.88)";
    ctx.fill();
  }

  for (const aura of npcField.auras) {
    drawNpcFieldAura(ctx, aura, s.puzzlePedestals);
  }

  for (const pedestal of s.puzzlePedestals) {
    let overlayLineY = pedestal.y - 52;
    if (
      npcField.echoPuzzleToken
      && npcField.focusPedestalId === pedestal.id
      && npcField.echoPuzzleToken === pedestal.target
    ) {
      ctx.save();
      ctx.fillStyle = `rgba(250, 204, 21, ${0.12 + npcField.echoPuzzleStrength * 0.16})`;
      ctx.fillRect(pedestal.x - 18, pedestal.y - 46, 36, 34);
      ctx.fillStyle = "rgba(254, 240, 138, 0.92)";
      ctx.font = "700 8px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`ECHO ${npcField.echoPuzzleLabel?.toUpperCase() ?? ""}`, pedestal.x, overlayLineY);
      ctx.restore();
      overlayLineY -= 12;
    }
    if (
      npcField.shadowPuzzleToken
      && npcField.focusPedestalId === pedestal.id
      && !pedestal.activated
    ) {
      ctx.save();
      ctx.fillStyle = `rgba(217, 70, 239, ${0.1 + npcField.shadowPuzzleStrength * 0.16})`;
      ctx.fillRect(pedestal.x - 20, pedestal.y - 58, 40, 44);
      ctx.strokeStyle = "rgba(251, 113, 133, 0.82)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(pedestal.x - 20, pedestal.y - 58, 40, 44);
      ctx.fillStyle = "rgba(253, 242, 248, 0.92)";
      ctx.font = "700 8px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`SHADOW ${npcField.shadowPuzzleLabel?.toUpperCase() ?? ""}`, pedestal.x, overlayLineY);
      ctx.restore();
    }
    drawPuzzlePedestal(ctx, pedestal, s.t);
  }

  const sortedNpcs = [...s.musicNpcs].sort((a, b) => a.y - b.y);
  for (const npc of sortedNpcs) {
    drawMusicNpc(ctx, npc, s.t);
  }

  for (const orb of s.noteOrbs) {
    drawNpcOrb(ctx, orb);
  }

  const player = s.player;
  const px = player.x;
  const py = player.y;
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(px, py, PLAYER_W, PLAYER_H);
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(px + 7, py + 9, 7, 7);
  ctx.fillRect(px + 20, py + 9, 7, 7);
  ctx.fillStyle = "#22d3ee";
  const trail = clamp(Math.abs(player.vx) / 380, 0, 1);
  ctx.fillRect(px - trail * 14, py + PLAYER_H - 10, trail * 14, 6);

  const finishX = WORLD_W - 90;
  ctx.strokeStyle = "rgba(251, 191, 36, 0.85)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(finishX, 180);
  ctx.lineTo(finishX, 520);
  ctx.stroke();
  ctx.fillStyle = "rgba(251, 191, 36, 0.95)";
  ctx.font = "700 14px monospace";
  ctx.fillText("FINISH", finishX - 28, 165);

  ctx.restore();

  if (s.win) {
    ctx.fillStyle = "rgba(4, 12, 20, 0.65)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = "#fde68a";
    ctx.font = "700 38px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Run Complete", VIEW_W / 2, VIEW_H / 2 - 18);
    ctx.font = "500 16px monospace";
    ctx.fillStyle = "#dbeafe";
    ctx.fillText("Dein Movement hat den Soundtrack gebaut.", VIEW_W / 2, VIEW_H / 2 + 20);
  }

  drawComposerPreviewOverlay(ctx, composerPreview);
}
