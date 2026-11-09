import { GAME_HEIGHT, GAME_WIDTH } from "../domain/instrumentData";
import type { IrrlichtArenaRuntimeState } from "@/features/xensonar/rooms/xenpolarExtrasBridge";

function drawSurrealLandscape(ctx: CanvasRenderingContext2D, t: number, level: number) {
  const levelTwoPalette = level >= 2;
  const bg = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  if (levelTwoPalette) {
    bg.addColorStop(0, "#dce2d6");
    bg.addColorStop(0.44, "#c5c99f");
    bg.addColorStop(1, "#b3a177");
  } else {
    bg.addColorStop(0, "#d9d7d0");
    bg.addColorStop(0.5, "#c7c2b5");
    bg.addColorStop(1, "#b7ab98");
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  for (let i = 0; i < 14; i += 1) {
    const alpha = 0.08 + (i % 3) * 0.03;
    const stroke = levelTwoPalette ? "125, 170, 98" : "130, 140, 145";
    ctx.strokeStyle = `rgba(${stroke}, ${alpha})`;
    ctx.lineWidth = 8 + (i % 4) * 5;
    ctx.beginPath();
    ctx.moveTo(-60, 80 + i * 28);
    for (let x = 0; x <= GAME_WIDTH + 60; x += 70) {
      const y = 140 + i * 20 + Math.sin((x + t * 0.09 + i * 70) * 0.011) * (26 + i * 1.3);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(GAME_WIDTH / 2, GAME_HEIGHT * 0.58);
  ctx.rotate(Math.sin(t * 0.00012) * 0.22);
  ctx.strokeStyle = levelTwoPalette ? "rgba(145, 132, 84, 0.35)" : "rgba(120, 98, 80, 0.32)";
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.ellipse(0, 0, 220, 140, 0, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 7; i += 1) {
    const ring = levelTwoPalette ? "188, 205, 139" : "180, 168, 144";
    ctx.strokeStyle = `rgba(${ring}, ${0.09 + i * 0.015})`;
    ctx.lineWidth = 12 - i;
    ctx.beginPath();
    ctx.ellipse(0, 0, 200 - i * 18, 125 - i * 13, Math.sin(t * 0.00016 + i) * 0.35, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  if (levelTwoPalette) {
    ctx.save();
    ctx.translate(GAME_WIDTH / 2, GAME_HEIGHT * 0.44);
    ctx.strokeStyle = "rgba(118, 155, 72, 0.24)";
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(-300, -20);
    ctx.bezierCurveTo(-180, -140, -40, -140, 40, -10);
    ctx.bezierCurveTo(120, 100, 210, 80, 300, -5);
    ctx.stroke();

    ctx.strokeStyle = "rgba(200, 182, 116, 0.25)";
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(-260, 70);
    ctx.bezierCurveTo(-120, 145, 10, 150, 130, 95);
    ctx.bezierCurveTo(210, 58, 240, 10, 278, 0);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(GAME_WIDTH / 2, GAME_HEIGHT - 95);
  ctx.fillStyle = levelTwoPalette ? "rgba(84, 86, 44, 0.6)" : "rgba(64, 58, 52, 0.72)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 38, 48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = levelTwoPalette ? "rgba(224, 219, 170, 0.52)" : "rgba(180, 166, 148, 0.62)";
  ctx.beginPath();
  ctx.arc(-11, -8, 7, 0, Math.PI * 2);
  ctx.arc(11, -8, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawIrrlichtArenaFrame(ctx: CanvasRenderingContext2D, state: IrrlichtArenaRuntimeState, now: number) {
  drawSurrealLandscape(ctx, now, state.level);
  
  const aura = ctx.createRadialGradient(state.orb.x, state.orb.y, 10, state.orb.x, state.orb.y, 90);
  aura.addColorStop(0, "rgba(238, 255, 220, 0.85)");
  aura.addColorStop(0.45, "rgba(160, 248, 245, 0.35)");
  aura.addColorStop(1, "rgba(80, 110, 130, 0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(state.orb.x, state.orb.y, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,240,0.96)";
  ctx.beginPath();
  ctx.arc(state.orb.x, state.orb.y, state.orb.r, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.strokeStyle = "rgba(255, 180, 90, 0.9)";
  ctx.lineWidth = 2.5;
  state.lasers.forEach((laser) => {
    ctx.beginPath();
    ctx.moveTo(laser.x, laser.y + 20);
    ctx.lineTo(laser.x, laser.y - 12);
    ctx.stroke();
  });
  
  ctx.fillStyle = "rgba(130, 220, 255, 0.78)";
  state.bolts.forEach((bolt) => {
    ctx.beginPath();
    ctx.arc(bolt.x, bolt.y, bolt.r, 0, Math.PI * 2);
    ctx.fill();
  });
  
  state.hearts.forEach((heart) => {
    ctx.save();
    ctx.translate(heart.x, heart.y);
    ctx.rotate(Math.sin(heart.spin) * 0.22);
    const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 24);
    glow.addColorStop(0, "rgba(245, 122, 162, 0.56)");
    glow.addColorStop(1, "rgba(245, 122, 162, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 119, 156, 0.96)";
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.bezierCurveTo(-12, -2, -13, -15, -3.2, -16);
    ctx.bezierCurveTo(0, -15, 0.6, -11, 0, -8);
    ctx.bezierCurveTo(-0.6, -11, 0, -15, 3.2, -16);
    ctx.bezierCurveTo(13, -15, 12, -2, 0, 8);
    ctx.fill();
    ctx.restore();
  });
  
  const turretGlow = ctx.createRadialGradient(state.playerX, state.playerY - 6, 4, state.playerX, state.playerY - 6, 30);
  turretGlow.addColorStop(0, "rgba(255, 244, 196, 0.45)");
  turretGlow.addColorStop(1, "rgba(255, 244, 196, 0)");
  ctx.fillStyle = turretGlow;
  ctx.beginPath();
  ctx.arc(state.playerX, state.playerY - 6, 32, 0, Math.PI * 2);
  ctx.fill();
  
  const hull = ctx.createLinearGradient(state.playerX, state.playerY - 16, state.playerX, state.playerY + 16);
  hull.addColorStop(0, state.invuln > 0 ? "rgba(255, 232, 170, 0.98)" : "rgba(68, 66, 59, 0.98)");
  hull.addColorStop(1, state.invuln > 0 ? "rgba(188, 146, 85, 0.98)" : "rgba(26, 25, 23, 0.98)");
  ctx.fillStyle = hull;
  ctx.beginPath();
  ctx.moveTo(state.playerX - 28, state.playerY + 12);
  ctx.lineTo(state.playerX - 18, state.playerY - 10);
  ctx.lineTo(state.playerX + 18, state.playerY - 10);
  ctx.lineTo(state.playerX + 28, state.playerY + 12);
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle = "rgba(214, 192, 143, 0.9)";
  ctx.fillRect(state.playerX - 8, state.playerY - 26, 16, 16);
  ctx.fillStyle = "rgba(188, 148, 92, 0.96)";
  ctx.fillRect(state.playerX - 4, state.playerY - 40, 8, 16);
  
  ctx.strokeStyle = "rgba(255, 219, 156, 0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(state.playerX - 18, state.playerY - 1);
  ctx.lineTo(state.playerX + 18, state.playerY - 1);
  ctx.stroke();
  
  state.particles.forEach((p) => {
    ctx.fillStyle = `hsla(${p.hue}, 80%, 72%, ${Math.max(0, p.life)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.8, 0, Math.PI * 2);
    ctx.fill();
  });
  
  if (state.levelUpTimer > 0 && !state.over) {
    const alpha = Math.min(0.85, state.levelUpTimer / 1.8);
    ctx.fillStyle = `rgba(7, 8, 10, ${0.24 + alpha * 0.32})`;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(255, 228, 164, ${0.65 + alpha * 0.35})`;
    ctx.font = "700 36px Space Grotesk";
    ctx.fillText(`LEVEL ${state.levelUpTo}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 18);
    ctx.font = "500 16px Space Grotesk";
    ctx.fillStyle = `rgba(226, 219, 196, ${0.7 + alpha * 0.25})`;
    ctx.fillText(`Uebergang von Level ${state.levelUpFrom} zu ${state.levelUpTo} - Irrlicht beschleunigt.`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 18);
  }
  
  if (state.over) {
    ctx.fillStyle = "rgba(0,0,0,0.48)";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.fillStyle = "#f4ecd9";
    ctx.font = "700 36px Space Grotesk";
    ctx.textAlign = "center";
    ctx.fillText(state.won ? "Irrlicht gebunden" : "Das Irrlicht entkommt", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 22);
    ctx.font = "500 18px Space Grotesk";
    ctx.fillText("Druecke Restart fuer einen neuen Run.", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 18);
  }
}
