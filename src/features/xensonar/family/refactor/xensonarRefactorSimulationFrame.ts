import type { MutableRefObject } from "react";
import type { SharedFieldController } from "./sharedFieldController";
import { HEIGHT, WIDTH, clamp, falloffValue, lerp, pitchColor, stepFromY, yFromStep } from "./music";
import type { Agent, DirectedPulse, Params, Ripple, TrailPoint } from "./types";
import type { InstallationNode } from "./useXensonarSharedFieldRuntime";
import type { XensonarRefactorAstralCursor } from "./useXensonarRefactorKeyboardScope";

type Cursor = { x: number; y: number; active: boolean };
type SharedFieldSnapshot = { ball: { position: { x: number; y: number } } | null };

export type XensonarRefactorSimulationFrameArgs = {
  dt: number;
  nowMs: number;
  paramsRef: MutableRefObject<Params>;
  astralCursorRef: MutableRefObject<XensonarRefactorAstralCursor>;
  cursorRef: MutableRefObject<Cursor>;
  ripplesRef: MutableRefObject<Ripple[]>;
  pulsesRef: MutableRefObject<DirectedPulse[]>;
  trailsRef: MutableRefObject<Map<number, TrailPoint[]>>;
  startupSilenceUntilRef: MutableRefObject<number>;
  agentsRef: MutableRefObject<Agent[]>;
  sharedField: SharedFieldController | null;
  sharedFieldSnapshotRef: MutableRefObject<SharedFieldSnapshot>;
  installationNodesRef: MutableRefObject<Map<string, InstallationNode>>;
  installationDragNodeIdRef: MutableRefObject<string | null>;
  triggerInstallationNodeVoice: (ratio: number, velocity?: number, panHint?: number, forceTime?: number) => Promise<void>;
  triggerVoice: (step: number, velocity?: number, panHint?: number, forceTime?: number) => Promise<void>;
  updateTrails: (agent: Agent) => void;
  audioRef: MutableRefObject<AudioContext | null>;
  transportBeatRef: MutableRefObject<number>;
  lastTransportBeatUiCommitRef: MutableRefObject<number>;
  setTransportBeat: (beat: number) => void;
};

export function runXensonarRefactorSimulationFrame({
  dt,
  nowMs,
  paramsRef,
  astralCursorRef,
  cursorRef,
  ripplesRef,
  pulsesRef,
  trailsRef,
  startupSilenceUntilRef,
  agentsRef,
  sharedField,
  sharedFieldSnapshotRef,
  installationNodesRef,
  installationDragNodeIdRef,
  triggerInstallationNodeVoice,
  triggerVoice,
  updateTrails,
  audioRef,
  transportBeatRef,
  lastTransportBeatUiCommitRef,
  setTransportBeat,
}: XensonarRefactorSimulationFrameArgs) {
  const p = paramsRef.current;
  const cursor = astralCursorRef.current.active
    ? { x: astralCursorRef.current.x, y: yFromStep(astralCursorRef.current.step, p.tuning, p.gridPerspective, p.tonicHz), active: true }
    : cursorRef.current;

  ripplesRef.current = ripplesRef.current
    .map((r) => ({ ...r, radius: r.radius + r.speed * dt, energy: r.energy * (1 - dt * 0.5) }))
    .filter((r) => r.radius < r.maxRadius && r.energy > 0.03);

  pulsesRef.current = pulsesRef.current
    .map((pulse) => {
      const delta = pulse.speed * dt;
      if (pulse.direction === "left") return { ...pulse, pos: pulse.pos - delta, energy: pulse.energy * (1 - dt * 0.34) };
      if (pulse.direction === "right") return { ...pulse, pos: pulse.pos + delta, energy: pulse.energy * (1 - dt * 0.34) };
      if (pulse.direction === "up") return { ...pulse, pos: pulse.pos - delta, energy: pulse.energy * (1 - dt * 0.34) };
      return { ...pulse, pos: pulse.pos + delta, energy: pulse.energy * (1 - dt * 0.34) };
    })
    .filter((pulse) => pulse.energy > 0.04 && pulse.pos > -30 && pulse.pos < Math.max(WIDTH, HEIGHT) + 30);

  trailsRef.current.forEach((arr) => {
    arr.forEach((pt) => {
      pt.age += dt * 60;
    });
    while (arr.length && arr[0].age > paramsRef.current.trailLength * 2) arr.shift();
  });

  const allowAudioEvents = nowMs >= startupSilenceUntilRef.current;

  const agents = agentsRef.current;
  for (const a of agents) {
    const baseSpring = 0.028;
    const dxBase = a.baseX - a.x;
    const dyBase = a.baseY - a.y;
    a.vx += dxBase * baseSpring * dt * 60;
    a.vy += dyBase * baseSpring * dt * 60;

    const dxCursor = cursor.x - a.x;
    const dyCursor = cursor.y - a.y;
    const cursorDist = Math.hypot(dxCursor, dyCursor) + 0.0001;
    const cursorForce = p.cursorAttraction * (a.enabled ? 1 : 0.2) * Math.pow(1 - clamp(cursorDist / 360, 0, 1), 1.5);
    a.vx += (dxCursor / cursorDist) * cursorForce * dt * 60 * 34;
    a.vy += (dyCursor / cursorDist) * cursorForce * dt * 60 * 34;

    const tangentX = -dyCursor / cursorDist;
    const tangentY = dxCursor / cursorDist;
    const orbitStrength = p.drift * (a.enabled ? 1 : 0.35) * Math.pow(1 - clamp(cursorDist / 400, 0, 1), 1.25);
    a.vx += tangentX * orbitStrength * dt * 60 * 16;
    a.vy += tangentY * orbitStrength * dt * 60 * 16;

    for (const ripple of ripplesRef.current) {
      const dx = a.x - ripple.x;
      const dy = a.y - ripple.y;
      const dist = Math.hypot(dx, dy);
      const edge = Math.abs(dist - ripple.radius);
      if (edge < ripple.width) {
        const edgeHit = 1 - edge / ripple.width;
        const radialProgress = 1 - clamp(dist / Math.max(1, ripple.maxRadius), 0, 1);
        const shaped = falloffValue(ripple.falloff, radialProgress);
        const impulse = edgeHit * shaped * p.rippleStrength * ripple.energy * (a.enabled ? 1 : 0.25);
        const nx = dx / (dist || 1);
        const ny = dy / (dist || 1);
        a.vx += nx * impulse * dt * 60 * 96;
        a.vy += ny * impulse * dt * 60 * 96;

        if (allowAudioEvents && a.enabled && nowMs - a.lastTrigger > 140) {
          a.lastTrigger = nowMs;
          a.energy = clamp(a.energy + edgeHit * 0.45, 0, 1.6);
          void triggerVoice(ripple.rootStep + a.step, clamp(0.3 + edgeHit * 0.8, 0.2, 1), (a.x / WIDTH) * 2 - 1);
        }
      }
    }

    for (const pulse of pulsesRef.current) {
      let edge = Infinity;
      let nx = 0;
      let ny = 0;
      let hit = 0;

      if (paramsRef.current.pulseMode === "sector") {
        const originX = astralCursorRef.current.active ? astralCursorRef.current.x : cursorRef.current.x;
        const originY = astralCursorRef.current.active
          ? yFromStep(astralCursorRef.current.step, paramsRef.current.tuning, paramsRef.current.gridPerspective, paramsRef.current.tonicHz)
          : cursorRef.current.y;
        const dx = a.x - originX;
        const dy = a.y - originY;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const target = pulse.direction === "left" ? Math.PI : pulse.direction === "right" ? 0 : pulse.direction === "up" ? -Math.PI / 2 : Math.PI / 2;
        const diff = Math.abs(Math.atan2(Math.sin(angle - target), Math.cos(angle - target)));
        edge = Math.abs(dist - pulse.pos);
        if (diff < Math.PI / 4 && edge < 22) {
          hit = (1 - edge / 22) * (1 - diff / (Math.PI / 4));
          nx = dx / (dist || 1);
          ny = dy / (dist || 1);
        }
      } else {
        if (pulse.direction === "left" || pulse.direction === "right") {
          edge = Math.abs(a.x - pulse.pos);
          nx = pulse.direction === "left" ? -1 : 1;
        } else {
          edge = Math.abs(a.y - pulse.pos);
          ny = pulse.direction === "up" ? -1 : 1;
        }
        if (edge < 18) hit = 1 - edge / 18;
      }

      if (hit > 0) {
        a.vx += nx * hit * pulse.energy * 18;
        a.vy += ny * hit * pulse.energy * 18;
        if (allowAudioEvents && a.enabled && nowMs - a.lastTrigger > 120) {
          a.lastTrigger = nowMs;
          a.energy = clamp(a.energy + 0.25 + hit * 0.4, 0, 1.8);
          const rootOffset = astralCursorRef.current.active
            ? astralCursorRef.current.step
            : stepFromY(cursorRef.current.y, paramsRef.current.tuning, paramsRef.current.gridPerspective, paramsRef.current.tonicHz);
          void triggerVoice(rootOffset + a.step, clamp(0.4 + hit * 0.7, 0.2, 1), (a.x / WIDTH) * 2 - 1);
        }
      }
    }

    if (!a.enabled) {
      a.vx *= lerp(0.92, 0.8, p.modeMaskStrength);
      a.vy *= lerp(0.92, 0.8, p.modeMaskStrength);
    }

    a.vx += Math.sin(a.phase + nowMs * 0.001) * p.drift * 0.05;
    a.vy += Math.cos(a.phase * 1.3 + nowMs * 0.0012) * p.drift * 0.05;
    a.vx *= 0.968;
    a.vy *= 0.968;

    a.x += a.vx * dt * 60;
    a.y += a.vy * dt * 60;

    if (a.x < 26 || a.x > WIDTH - 26) a.vx *= -0.82;
    if (a.y < 26 || a.y > HEIGHT - 26) a.vy *= -0.82;
    a.x = clamp(a.x, 26, WIDTH - 26);
    a.y = clamp(a.y, 26, HEIGHT - 26);
    a.phase += dt * (0.8 + a.energy * 0.3);
    a.energy = lerp(a.energy, a.enabled ? 0.42 : 0.14, dt * 1.8);
    a.hue = pitchColor(a.cents);
    updateTrails(a);
  }

  if (sharedField?.active) {
    const externalBall = sharedFieldSnapshotRef.current.ball;
    for (const node of installationNodesRef.current.values()) {
      if (installationDragNodeIdRef.current === node.id) {
        node.x = node.homeX;
        node.y = node.homeY;
        node.vx = 0;
        node.vy = 0;
        continue;
      }

      node.vx += (node.homeX - node.x) * 0.032 * dt * 60;
      node.vy += (node.homeY - node.y) * 0.032 * dt * 60;

      if (node.muted) {
        node.vx *= 0.92;
        node.vy *= 0.92;
      }

      if (sharedField.attractCursor) {
        const dx = cursor.x - node.x;
        const dy = cursor.y - node.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const force = Math.pow(1 - clamp(dist / 360, 0, 1), 1.35) * 0.09;
        node.vx += (dx / dist) * force * dt * 60 * 28;
        node.vy += (dy / dist) * force * dt * 60 * 28;
      }

      if (sharedField.attractOscillatorBall && externalBall) {
        const dx = externalBall.position.x - node.x;
        const dy = externalBall.position.y - node.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const force = Math.pow(1 - clamp(dist / 320, 0, 1), 1.4) * 0.11;
        node.vx += (dx / dist) * force * dt * 60 * 30;
        node.vy += (dy / dist) * force * dt * 60 * 30;
      }

      if (!node.muted && sharedField.residentBallCouplingEnabled && externalBall) {
        const dx = externalBall.position.x - node.x;
        const dy = externalBall.position.y - node.y;
        const dist = Math.hypot(dx, dy);
        const proximity = clamp(1 - dist / 88, 0, 1);
        if (proximity > 0.04) {
          node.energy = clamp(Math.max(node.energy, 0.14 + proximity * 0.8), 0, 1.8);
        }
      }

      if (!node.muted && sharedField.residentWaveExcitationEnabled) {
        for (const ripple of ripplesRef.current) {
          const dx = node.x - ripple.x;
          const dy = node.y - ripple.y;
          const dist = Math.hypot(dx, dy);
          const edge = Math.abs(dist - ripple.radius);
          const width = ripple.width * 1.15;
          if (edge < width) {
            const edgeHit = 1 - edge / width;
            const radialProgress = 1 - clamp(dist / Math.max(1, ripple.maxRadius), 0, 1);
            const shaped = falloffValue(ripple.falloff, radialProgress);
            const impulse = edgeHit * shaped * p.rippleStrength * ripple.energy * 0.72;
            const nx = dx / (dist || 1);
            const ny = dy / (dist || 1);
            node.vx += nx * impulse * dt * 60 * 82;
            node.vy += ny * impulse * dt * 60 * 82;
            if (allowAudioEvents && nowMs - node.lastTrigger > 150) {
              node.lastTrigger = nowMs;
              node.energy = clamp(node.energy + edgeHit * 0.45, 0, 1.8);
              void triggerInstallationNodeVoice(node.ratio, clamp(0.3 + edgeHit * 0.6, 0.2, 1), (node.x / WIDTH) * 2 - 1);
            }
          }
        }

        for (const pulse of pulsesRef.current) {
          let edge = Infinity;
          let nx = 0;
          let ny = 0;
          let hit = 0;

          if (paramsRef.current.pulseMode === "sector") {
            const originX = astralCursorRef.current.active ? astralCursorRef.current.x : cursorRef.current.x;
            const originY = astralCursorRef.current.active
              ? yFromStep(astralCursorRef.current.step, paramsRef.current.tuning, paramsRef.current.gridPerspective, paramsRef.current.tonicHz)
              : cursorRef.current.y;
            const dx = node.x - originX;
            const dy = node.y - originY;
            const dist = Math.hypot(dx, dy);
            const angle = Math.atan2(dy, dx);
            const target = pulse.direction === "left" ? Math.PI : pulse.direction === "right" ? 0 : pulse.direction === "up" ? -Math.PI / 2 : Math.PI / 2;
            const diff = Math.abs(Math.atan2(Math.sin(angle - target), Math.cos(angle - target)));
            edge = Math.abs(dist - pulse.pos);
            if (diff < Math.PI / 4 && edge < 24) {
              hit = (1 - edge / 24) * (1 - diff / (Math.PI / 4));
              nx = dx / (dist || 1);
              ny = dy / (dist || 1);
            }
          } else {
            if (pulse.direction === "left" || pulse.direction === "right") {
              edge = Math.abs(node.x - pulse.pos);
              nx = pulse.direction === "left" ? -1 : 1;
            } else {
              edge = Math.abs(node.y - pulse.pos);
              ny = pulse.direction === "up" ? -1 : 1;
            }
            if (edge < 18) hit = 1 - edge / 18;
          }

          if (hit > 0) {
            node.vx += nx * hit * pulse.energy * 17;
            node.vy += ny * hit * pulse.energy * 17;
            if (allowAudioEvents && nowMs - node.lastTrigger > 130) {
              node.lastTrigger = nowMs;
              node.energy = clamp(node.energy + 0.2 + hit * 0.45, 0, 1.8);
              void triggerInstallationNodeVoice(node.ratio, clamp(0.35 + hit * 0.55, 0.2, 1), (node.x / WIDTH) * 2 - 1);
            }
          }
        }
      }

      node.vx *= 0.964;
      node.vy *= 0.964;
      node.x += node.vx * dt * 60;
      node.y += node.vy * dt * 60;
      node.x = clamp(node.x, 18, WIDTH - 18);
      node.y = clamp(node.y, 18, HEIGHT - 18);
      node.energy = lerp(node.energy, node.muted ? 0.04 : 0.16, dt * 2.2);
    }
  }

  const beat = audioRef.current ? (audioRef.current.currentTime * paramsRef.current.quantizeBpm) / 60 : 0;
  transportBeatRef.current = beat;
  if (nowMs - lastTransportBeatUiCommitRef.current >= 160) {
    lastTransportBeatUiCommitRef.current = nowMs;
    setTransportBeat(beat);
  }
}
