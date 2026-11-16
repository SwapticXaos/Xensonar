import type { SharedFieldBall } from "../../../../external/microto/features/refactorField/sharedFieldTypes";
import { CENTER_X, CENTER_Y, HEIGHT, WIDTH, clamp, hsl } from "./music";
import type { Agent, DirectedPulse, Params, Ripple, TrailPoint } from "./types";

type InstallationDrawNode = {
  label: string;
  muted: boolean;
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  energy: number;
};

const TWO_PI = Math.PI * 2;

export function drawGrid(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.fillStyle = "#030308";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const vertical = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  vertical.addColorStop(0, "rgba(46, 34, 96, 0.18)");
  vertical.addColorStop(0.35, "rgba(22, 30, 76, 0.1)");
  vertical.addColorStop(1, "rgba(8, 10, 18, 0.04)");
  ctx.fillStyle = vertical;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const radial = ctx.createRadialGradient(CENTER_X, CENTER_Y, 20, CENTER_X, CENTER_Y, WIDTH * 0.52);
  radial.addColorStop(0, "rgba(110, 74, 255, 0.08)");
  radial.addColorStop(0.35, "rgba(40, 80, 180, 0.04)");
  radial.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.restore();
}


export function drawRipples(ctx: CanvasRenderingContext2D, ripples: Ripple[]) {
  ctx.save();
  ripples.forEach((r) => {
    const alpha = clamp(r.energy, 0, 1) * 0.55;
    ctx.strokeStyle = hsl(260 + r.radius * 0.07, 90, 72, alpha);
    ctx.lineWidth = Math.max(1.5, r.width * 0.08);
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, TWO_PI);
    ctx.stroke();

    ctx.strokeStyle = hsl(285 + r.radius * 0.05, 100, 75, alpha * 0.28);
    ctx.lineWidth = Math.max(4, r.width * 0.45);
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, TWO_PI);
    ctx.stroke();
  });
  ctx.restore();
}


export function drawPulses(ctx: CanvasRenderingContext2D, pulses: DirectedPulse[]) {
  ctx.save();
  pulses.forEach((p) => {
    ctx.strokeStyle = hsl(30 + p.pos * 0.12, 100, 70, p.energy * 0.7);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (p.direction === "left" || p.direction === "right") {
      ctx.moveTo(p.pos, 0);
      ctx.lineTo(p.pos, HEIGHT);
    } else {
      ctx.moveTo(0, p.pos);
      ctx.lineTo(WIDTH, p.pos);
    }
    ctx.stroke();
  });
  ctx.restore();
}


export function drawTrails(ctx: CanvasRenderingContext2D, trails: Map<number, TrailPoint[]>) {
  ctx.save();
  trails.forEach((points) => {
    if (points.length < 2) return;
    ctx.beginPath();
    points.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    const meanAge = points.reduce((a, p) => a + p.age, 0) / points.length;
    ctx.strokeStyle = `rgba(180, 200, 255, ${clamp(0.16 - meanAge * 0.003, 0.02, 0.18)})`;
    ctx.lineWidth = 1.1;
    ctx.stroke();
  });
  ctx.restore();
}


export function drawAgents(
  ctx: CanvasRenderingContext2D,
  agents: Agent[],
  showLabels: boolean,
  cursor: { x: number; y: number },
  params: Params,
) {
  ctx.save();
  agents.forEach((a) => {
    const radius = a.enabled ? 7 + a.energy * 7 : 4 + a.energy * 3;
    const dist = Math.hypot(cursor.x - a.x, cursor.y - a.y);
    const proximity = 1 - clamp(dist / 280, 0, 1);
    const glow = a.energy * 0.7 + proximity * 0.65;
    const hue = (a.hue + params.shimmer * 100 * Math.sin(a.phase)) % 360;
    const disabledFade = a.enabled ? 1 : 1 - params.modeMaskStrength * 0.72;

    ctx.beginPath();
    ctx.fillStyle = hsl(hue, a.enabled ? 90 : 22, a.enabled ? 72 : 30, (a.enabled ? 0.85 : 0.42) * disabledFade);
    ctx.shadowBlur = (18 + glow * 18) * disabledFade;
    ctx.shadowColor = hsl(hue, 100, 70, 0.9 * disabledFade);
    ctx.arc(a.x, a.y, radius, 0, TWO_PI);
    ctx.fill();

    // Recording-visible fallback: some browsers drop or heavily thin Canvas shadow/blur
    // layers while MediaRecorder is active. The agent must still have a solid body,
    // not only a glow halo, otherwise only its trail remains visible.
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = "source-over";
    ctx.beginPath();
    ctx.fillStyle = hsl(hue, a.enabled ? 96 : 28, a.enabled ? 78 : 36, (a.enabled ? 0.92 : 0.46) * disabledFade);
    ctx.arc(a.x, a.y, Math.max(3.8, radius * 0.52), 0, TWO_PI);
    ctx.fill();
    ctx.lineWidth = a.enabled ? 1.4 : 0.8;
    ctx.strokeStyle = hsl(hue, a.enabled ? 100 : 36, a.enabled ? 88 : 50, (a.enabled ? 0.72 : 0.32) * disabledFade);
    ctx.stroke();

    if (showLabels && a.enabled) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(235,235,255,0.75)";
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(a.label, a.x + 10, a.y - 8);
    }
  });

  ctx.shadowBlur = 0;
  if (params.inputIndicator) {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.arc(cursor.x, cursor.y, 12, 0, TWO_PI);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = "rgba(180,190,255,0.14)";
    ctx.arc(cursor.x, cursor.y, 24, 0, TWO_PI);
    ctx.stroke();
  }
  ctx.restore();
}



export function drawAgentCoreOverlay(
  ctx: CanvasRenderingContext2D,
  agents: Agent[],
  cursor: { x: number; y: number },
  params: Params,
) {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.shadowBlur = 0;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  agents.forEach((a) => {
    const dist = Math.hypot(cursor.x - a.x, cursor.y - a.y);
    const proximity = 1 - clamp(dist / 280, 0, 1);
    const radius = a.enabled ? 5.6 + a.energy * 4.2 + proximity * 1.8 : 3.2 + a.energy * 2.2;
    const hue = (a.hue + params.shimmer * 80 * Math.sin(a.phase)) % 360;
    const disabledFade = a.enabled ? 1 : 1 - params.modeMaskStrength * 0.62;

    ctx.beginPath();
    ctx.fillStyle = hsl(hue, a.enabled ? 96 : 32, a.enabled ? 82 : 42, (a.enabled ? 0.94 : 0.42) * disabledFade);
    ctx.arc(a.x, a.y, radius, 0, TWO_PI);
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = `rgba(255,255,255,${(a.enabled ? 0.66 : 0.24) * disabledFade})`;
    ctx.lineWidth = a.enabled ? 1.35 : 0.85;
    ctx.arc(a.x, a.y, radius + 1.4, 0, TWO_PI);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = hsl(hue, 100, 92, (a.enabled ? 0.42 : 0.18) * disabledFade);
    ctx.lineWidth = a.enabled ? 1.05 : 0.65;
    ctx.moveTo(a.x - radius * 0.82, a.y);
    ctx.lineTo(a.x + radius * 0.82, a.y);
    ctx.moveTo(a.x, a.y - radius * 0.82);
    ctx.lineTo(a.x, a.y + radius * 0.82);
    ctx.stroke();
  });
  ctx.restore();
}


export function drawInstallationField(
  ctx: CanvasRenderingContext2D,
  nodes: InstallationDrawNode[],
  ball: SharedFieldBall | null,
) {
  ctx.save();
  for (const node of nodes) {
    ctx.beginPath();
    ctx.moveTo(node.homeX, node.homeY);
    ctx.lineTo(node.x, node.y);
    ctx.strokeStyle = node.muted ? `rgba(160, 150, 120, ${0.05 + node.energy * 0.08})` : `rgba(255, 225, 150, ${0.12 + node.energy * 0.18})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    const auraRadius = 12 + node.energy * 18;
    const coreRadius = 5 + node.energy * 8;
    ctx.beginPath();
    ctx.arc(node.x, node.y, auraRadius, 0, TWO_PI);
    ctx.fillStyle = node.muted ? `rgba(160, 150, 120, ${0.03 + node.energy * 0.06})` : `rgba(251, 191, 36, ${0.05 + node.energy * 0.15})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(node.x, node.y, coreRadius, 0, TWO_PI);
    ctx.fillStyle = node.muted ? `rgba(170, 165, 150, ${0.26 + node.energy * 0.12})` : `rgba(255, 215, 110, ${0.55 + node.energy * 0.25})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(node.x, node.y, coreRadius, 0, TWO_PI);
    ctx.lineWidth = 1;
    ctx.strokeStyle = node.muted ? `rgba(210, 210, 210, ${0.14 + node.energy * 0.16})` : `rgba(255, 248, 220, ${0.28 + node.energy * 0.4})`;
    ctx.stroke();

    ctx.fillStyle = node.muted ? 'rgba(220, 220, 220, 0.42)' : 'rgba(255, 248, 220, 0.88)';
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(node.label, node.x + 10, node.y - 8);
  }

  if (ball) {
    const tailX = ball.position.x - ball.velocity.x * 8;
    const tailY = ball.position.y - ball.velocity.y * 8;

    ctx.beginPath();
    ctx.moveTo(ball.position.x, ball.position.y);
    ctx.lineTo(tailX, tailY);
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(ball.position.x, ball.position.y, 5, 0, TWO_PI);
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(ball.position.x, ball.position.y, 13, 0, TWO_PI);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

