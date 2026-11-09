/**
 * Pure commons-field canvas drawing. No state mutation or audio.
 * Aligns with arenaDraw, resonanceCanvasDraw, platformerDraw pattern (STRUCTURE optimization).
 */

import type { CommonsSimState } from "./commonsField";
import { COMMONS_AGENT_KEYS } from "./commonsKeymap";

export function drawCommonsFrame(
  ctx2d: CanvasRenderingContext2D,
  sim: CommonsSimState,
  width: number,
  height: number,
): void {
  ctx2d.fillStyle = "#060711";
  ctx2d.fillRect(0, 0, width, height);

  for (let i = 0; i < 18; i += 1) {
    const phase = sim.t * 0.06 + i * 0.43;
    const rx = 140 + i * 26;
    const ry = 100 + i * 20;
    ctx2d.strokeStyle = `rgba(108, 92, 255, ${0.018 + i * 0.0026})`;
    ctx2d.beginPath();
    ctx2d.ellipse(width * 0.5, height * 0.45, rx, ry, phase, 0, Math.PI * 2);
    ctx2d.stroke();
  }

  sim.pulses.forEach((p) => {
    ctx2d.strokeStyle = `rgba(246, 114, 255, ${p.life * 0.65})`;
    ctx2d.lineWidth = 1.8;
    ctx2d.beginPath();
    ctx2d.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx2d.stroke();
  });

  sim.bolts.forEach((b) => {
    ctx2d.fillStyle = "rgba(122, 156, 255, 0.92)";
    ctx2d.beginPath();
    ctx2d.arc(b.x, b.y, 4.2, 0, Math.PI * 2);
    ctx2d.fill();
  });

  sim.agents.forEach((a, idx) => {
    ctx2d.fillStyle = a.enabled
      ? `rgba(255, 155, 242, ${0.24 + a.glow * 0.75})`
      : `rgba(122, 122, 146, ${0.12 + a.glow * 0.3})`;
    ctx2d.beginPath();
    ctx2d.arc(a.x, a.y, 7 + a.glow * 2, 0, Math.PI * 2);
    ctx2d.fill();
    if (a.enabled) {
      ctx2d.fillStyle = "rgba(210,210,235,0.7)";
      ctx2d.font = "10px IBM Plex Mono";
      ctx2d.fillText(COMMONS_AGENT_KEYS[idx] ?? "", a.x + 8, a.y - 8);
    }
  });

  ctx2d.fillStyle = "rgba(90, 255, 230, 0.96)";
  ctx2d.beginPath();
  ctx2d.arc(sim.wispX, sim.wispY, 13, 0, Math.PI * 2);
  ctx2d.fill();

  ctx2d.strokeStyle = "rgba(250,250,255,0.84)";
  ctx2d.lineWidth = 1.6;
  ctx2d.beginPath();
  ctx2d.arc(sim.cursorX, sim.cursorY, 11, 0, Math.PI * 2);
  ctx2d.stroke();
  ctx2d.beginPath();
  ctx2d.moveTo(sim.cursorX - 16, sim.cursorY);
  ctx2d.lineTo(sim.cursorX + 16, sim.cursorY);
  ctx2d.moveTo(sim.cursorX, sim.cursorY - 16);
  ctx2d.lineTo(sim.cursorX, sim.cursorY + 16);
  ctx2d.stroke();
}
