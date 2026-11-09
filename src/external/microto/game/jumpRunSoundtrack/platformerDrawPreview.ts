/**
 * Platformer live suite preview overlay drawing.
 * Pure draw: (ctx, preview) → overlay panel.
 * Extracted from platformerDraw for LOC discipline (STRUCTURE soft target ≤250).
 */

import type { PlatformerComposerPreview } from "./platformerComposerPreview";
import { VIEW_W } from "./platformerState";
import { clamp } from "../../shared/tuning/grid";

const previewLabelColor = (label: "A" | "B" | "C") => {
  if (label === "A") return "#67e8f9";
  if (label === "B") return "#86efac";
  return "#f9a8d4";
};

export function drawComposerPreviewOverlay(
  ctx: CanvasRenderingContext2D,
  preview: PlatformerComposerPreview | null | undefined,
): void {
  const panelW = 252;
  const panelH = preview?.ready ? 182 : 88;
  const panelX = VIEW_W - panelW - 16;
  const panelY = 16;

  ctx.save();
  ctx.fillStyle = "rgba(3, 9, 15, 0.78)";
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = "rgba(103, 232, 249, 0.22)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(panelX + 0.5, panelY + 0.5, panelW - 1, panelH - 1);

  ctx.textAlign = "left";
  ctx.fillStyle = "#dbeafe";
  ctx.font = "700 12px monospace";
  ctx.fillText("LIVE SUITE PREVIEW", panelX + 12, panelY + 18);

  if (!preview?.ready) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "500 11px monospace";
    ctx.fillText("Move, jump, and hit green nodes", panelX + 12, panelY + 44);
    ctx.fillText("to sketch the FINISH arrangement.", panelX + 12, panelY + 60);
    ctx.restore();
    return;
  }

  ctx.fillStyle = "#a7f3d0";
  ctx.font = "600 11px monospace";
  ctx.fillText(`${preview.formLabel}  ${preview.targetBpm} BPM  ${preview.phaseFocus}  ${preview.sectionBias.toUpperCase()}`, panelX + 12, panelY + 38);
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(
    `${preview.routeSignature} ${preview.routeMode.toUpperCase()}  rest ${Math.round(preview.restDensity * 100)}%`,
    panelX + 12,
    panelY + 54,
  );
  ctx.fillText(
    `tuning ${preview.tuningTilt >= 0 ? "+" : ""}${preview.tuningTilt.toFixed(2)}`,
    panelX + 132,
    panelY + 54,
  );
  ctx.fillText(
    `lean ${preview.routeBias >= 0 ? "+" : ""}${preview.routeBias.toFixed(2)}  shift ${preview.routeTravel >= 0 ? "+" : ""}${preview.routeTravel.toFixed(2)}`,
    panelX + 12,
    panelY + 67,
  );
  ctx.fillText(
    `${preview.routeColor}  ${preview.routeGroove}`,
    panelX + 12,
    panelY + 80,
  );
  ctx.fillText(
    `lead ${preview.routeLeadVoice}`,
    panelX + 12,
    panelY + 93,
  );

  const slotCount = Math.max(1, preview.timeline.length);
  const innerX = panelX + 12;
  const innerY = panelY + 106;
  const innerW = panelW - 24;
  const slotGap = 6;
  const slotW = Math.max(28, (innerW - slotGap * (slotCount - 1)) / slotCount);
  const chartH = 48;

  preview.timeline.forEach((slot, index) => {
    const x = innerX + index * (slotW + slotGap);
    const densityH = chartH * clamp(slot.density, 0, 1.35) / 1.35;
    const restH = chartH * clamp(slot.restSteps / 64, 0, 1);
    const accentH = chartH * clamp(slot.accentPeak, 0, 1);
    const tone = previewLabelColor(slot.label);

    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    ctx.fillRect(x, innerY, slotW, chartH + 22);
    ctx.fillStyle = tone;
    ctx.globalAlpha = 0.26;
    ctx.fillRect(x + 3, innerY + chartH - densityH, slotW - 6, densityH);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(248, 250, 252, 0.8)";
    ctx.fillRect(x + 6, innerY + chartH - accentH, Math.max(4, slotW - 12), 3);
    ctx.fillStyle = "rgba(248, 113, 113, 0.66)";
    ctx.fillRect(x + slotW - 8, innerY + chartH - restH, 4, restH);
    ctx.strokeStyle = tone;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, innerY + 0.5, slotW - 1, chartH + 21);
    ctx.fillStyle = tone;
    ctx.font = "700 11px monospace";
    ctx.fillText(slot.label, x + 6, innerY + chartH + 14);
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "500 9px monospace";
    ctx.fillText(`${slot.leadSteps}/${slot.restSteps}`, x + 20, innerY + chartH + 14);
    ctx.fillText(`r${slot.root >= 0 ? "+" : ""}${slot.root}`, x + 6, innerY + chartH + 24);
  });

  ctx.restore();
}
