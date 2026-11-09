import type { SharedFieldSnapshot } from "./sharedFieldTypes";

export function drawSharedFieldOverlay(
  ctx: CanvasRenderingContext2D,
  snapshot: SharedFieldSnapshot,
) {
  ctx.clearRect(0, 0, snapshot.width, snapshot.height);

  const nodeEntities = snapshot.entities.filter((entity) => entity.kind === "ji-node");
  const ball = snapshot.entities.find((entity) => entity.kind === "oscillator-ball");

  for (const entity of nodeEntities) {
    const energy = Math.min(1, Math.max(0, entity.energy));
    const radius = 6 + energy * 16;
    const auraRadius = radius + 8 + energy * 12;

    ctx.beginPath();
    ctx.arc(entity.position.x, entity.position.y, auraRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(251, 191, 36, ${0.08 + energy * 0.18})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(entity.position.x, entity.position.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(251, 191, 36, ${0.48 + energy * 0.36})`;
    ctx.fill();

    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(255, 245, 200, ${0.3 + energy * 0.45})`;
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 248, 220, 0.85)";
    ctx.font = "10px monospace";
    ctx.fillText(entity.label, entity.position.x + 10, entity.position.y - 8);
  }

  if (ball && ball.kind === "oscillator-ball") {
    const tailX = ball.position.x - ball.velocity.x * 8;
    const tailY = ball.position.y - ball.velocity.y * 8;

    ctx.beginPath();
    ctx.moveTo(ball.position.x, ball.position.y);
    ctx.lineTo(tailX, tailY);
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(ball.position.x, ball.position.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(ball.position.x, ball.position.y, 13, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
