/**
 * Pure L3 field canvas drawing. No state mutation or audio.
 * Aligns with arenaDraw, commonsDraw, resonanceCanvasDraw pattern (STRUCTURE optimization).
 */

import type { Level3State } from "./level3State";

export function drawLevel3Frame(
  ctx: CanvasRenderingContext2D,
  state: Level3State,
  width: number,
  height: number,
): void {
  const s = state;
  const w = width;
  const h = height;

  ctx.fillStyle = "#07080f";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(123,113,255,0.17)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i += 1) {
    const t = s.t * 0.22 + i * 0.8;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 40) {
      const y = h * 0.42 + Math.sin(x * 0.008 + t) * (16 + i * 2);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  s.pulses.forEach((p) => {
    ctx.strokeStyle = `rgba(246,94,255,${0.16 + p.life * 0.5})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    let start = 0;
    let end = 0;
    if (p.direction === "right") {
      start = -Math.PI / 4;
      end = Math.PI / 4;
    } else if (p.direction === "left") {
      start = (3 * Math.PI) / 4;
      end = (5 * Math.PI) / 4;
    } else if (p.direction === "up") {
      start = (-3 * Math.PI) / 4;
      end = -Math.PI / 4;
    } else {
      start = Math.PI / 4;
      end = (3 * Math.PI) / 4;
    }
    ctx.arc(p.x, p.y, p.radius, start, end);
    ctx.stroke();
  });

  s.wisps.forEach((w) => {
    const active = w.phase > 0.62 && w.phase < 0.78;
    ctx.beginPath();
    ctx.fillStyle = active ? "rgba(122,226,255,0.94)" : `hsla(${w.hue},90%,60%,0.55)`;
    ctx.shadowBlur = active ? 26 : 12;
    ctx.shadowColor = active ? "rgba(112,242,255,0.85)" : "rgba(180,120,255,0.4)";
    ctx.arc(w.x, w.y, active ? 16 : 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  s.bolts.forEach((b) => {
    ctx.beginPath();
    ctx.fillStyle = "rgba(255,160,90,0.9)";
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.beginPath();
  ctx.fillStyle = "rgba(120,255,210,0.95)";
  ctx.arc(s.cursorX, s.cursorY, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(120,255,210,0.5)";
  ctx.beginPath();
  ctx.arc(s.cursorX, s.cursorY, 18, 0, Math.PI * 2);
  ctx.stroke();
}
