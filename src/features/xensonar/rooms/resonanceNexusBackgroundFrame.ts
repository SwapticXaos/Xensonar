import { GAME_HEIGHT, GAME_WIDTH } from "../domain/instrumentData";
import type { ResonanceNexusRuntimeRefs } from "./resonanceNexusRuntimeRefs";

export function renderResonanceNexusBackgroundFrame(
  ctx: CanvasRenderingContext2D,
  state: ResonanceNexusRuntimeRefs,
  t: number,
): void {
  const bg = ctx.createRadialGradient(state.cursorX, state.cursorY, 0, GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH);
  bg.addColorStop(0, "#1a1525");
  bg.addColorStop(1, "#050508");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.strokeStyle = "rgba(120, 90, 160, 0.06)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    for (let x = 0; x < GAME_WIDTH; x += 50) {
      const y = GAME_HEIGHT / 2 + Math.sin(x * 0.005 + t + i) * 150 * Math.sin(t * 0.2 + i * 0.5);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}
