import { captureIrrlichtArenaEvent } from "@/features/xensonar/rooms/xenpolarExtrasBridge";
import type { IrrlichtArenaInterpreter, IrrlichtArenaInterpreterSnapshot, IrrlichtArenaRuntimeState } from "@/features/xensonar/rooms/xenpolarExtrasBridge";
import { GAME_HEIGHT, GAME_WIDTH } from "../domain/instrumentData";
import type { AppXenpolarGameKeyState } from "./irrlichtArenaRuntimeBoundaryTypes";

export type IrrlichtArenaGameplayFramePorts = {
  state: IrrlichtArenaRuntimeState;
  dt: number;
  keys: AppXenpolarGameKeyState;
  arenaInterpreter: IrrlichtArenaInterpreter;
  getArenaInterpreterSnapshot: (phase: string) => IrrlichtArenaInterpreterSnapshot;
  clampValue: (value: number, min: number, max: number) => number;
  nextGameChaos: () => number;
  playPlayerShotMotif: (anchorRatio: number) => void;
  playOrbShotSound: (anchorRatio: number, phase: string) => void;
  playOrbHitSound: (anchorRatio: number) => void;
  playPlayerHitSound: (anchorRatio: number) => void;
  playHeartPickupChord: (anchorRatio: number) => void;
};

function spawnBurst(state: IrrlichtArenaRuntimeState, x: number, y: number, hue: number) {
  for (let i = 0; i < 10; i += 1) {
    state.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      life: 0.4 + Math.random() * 0.5,
      hue,
    });
  }
}

export function runIrrlichtArenaGameplayFrame(ports: IrrlichtArenaGameplayFramePorts): { phase: string } {
  const {
    state, dt, keys, arenaInterpreter, getArenaInterpreterSnapshot, clampValue, nextGameChaos,
    playPlayerShotMotif, playOrbShotSound, playOrbHitSound, playPlayerHitSound, playHeartPickupChord,
  } = ports;

  state.elapsed += dt;
  state.invuln = Math.max(0, state.invuln - dt);
  state.levelUpTimer = Math.max(0, state.levelUpTimer - dt);
  
  const levelGoal = 34 + state.level * 12;
  const phase = state.score >= levelGoal * 0.72 ? "Radiant" : state.score >= levelGoal * 0.38 ? "Unstable" : "Dormant";
  const levelBoost = 1 + (state.level - 1) * 0.24;
  const enemyRateBase = phase === "Radiant" ? 0.32 : phase === "Unstable" ? 0.5 : 0.76;
  const enemyRate = enemyRateBase / levelBoost;
  const playerSpeed = 510;
  
  if (!state.over) {
    if (keys.left) state.playerX -= playerSpeed * dt;
    if (keys.right) state.playerX += playerSpeed * dt;
    state.playerX = Math.max(28, Math.min(GAME_WIDTH - 28, state.playerX));
  
    state.laserTimer -= dt;
  
    const hiddenTension = 0.48 + Math.sin(state.elapsed * 0.21 + state.phaseA) * 0.28;
    const hiddenSlim = 0.56 + Math.sin(state.elapsed * 0.17 + state.phaseB) * 0.32;
    const hiddenRaw = 0.5 + Math.sin(state.elapsed * 0.13 + state.phaseC) * 0.36;
    const centerX = GAME_WIDTH * 0.5;
    const centerY = GAME_HEIGHT * 0.46;
  
    let pullX = 0;
    let pullY = 0;
    state.anchorDist = Number.POSITIVE_INFINITY;
    state.anchors.forEach((anchor, idx) => {
      const orbitPhase = state.elapsed * (0.18 + anchor.orbit * 0.16) + anchor.jitter;
      const radialBreath = anchor.radius * (0.72 + hiddenSlim * 0.45) + Math.sin(state.elapsed * (0.7 + idx * 0.08) + anchor.jitter) * (15 + hiddenRaw * 18);
      const theta = anchor.angle + orbitPhase;
      anchor.x = centerX + Math.cos(theta) * radialBreath;
      anchor.y = centerY + Math.sin(theta) * radialBreath * (0.67 + hiddenTension * 0.26);
  
      const dx = anchor.x - state.orb.x;
      const dy = anchor.y - state.orb.y;
      const dist = Math.max(24, Math.hypot(dx, dy));
      const influence = (anchor.weight * (0.5 + hiddenTension)) / (dist * dist + 1000);
      pullX += dx * influence;
      pullY += dy * influence;
      if (dist < state.anchorDist) {
        state.anchorDist = dist;
        state.activeAnchorRatio = anchor.ratio;
        state.activeAnchorLabel = anchor.label;
      }
    });
  
    const arenaDirection = keys.left ? -1 : keys.right ? 1 : 0;
    const arenaSnapshot = getArenaInterpreterSnapshot(phase);
    if (arenaDirection !== 0 && arenaDirection !== arenaInterpreter.lastDirection) {
      captureIrrlichtArenaEvent(arenaInterpreter, arenaSnapshot, "turn", {
        energy: 0.38 + Math.abs(state.playerX - arenaInterpreter.lastPlayerX) / GAME_WIDTH,
        lane: clampValue(Math.round((state.playerX / GAME_WIDTH) * 7), 0, 7),
        airborne: false,
      });
    }
    if (state.activeAnchorLabel !== arenaInterpreter.lastAnchorLabel) {
      captureIrrlichtArenaEvent(arenaInterpreter, arenaSnapshot, "tuning_crystal", {
        energy: 0.42 + hiddenTension * 0.32,
        detail: phase === "Radiant" ? 2 : phase === "Unstable" ? 1 : 0,
      });
      arenaInterpreter.lastAnchorLabel = state.activeAnchorLabel;
    }
    if (
      state.elapsed - arenaInterpreter.lastSampleAt > 0.24
      && (Math.abs(state.playerX - arenaInterpreter.lastPlayerX) > 18 || Math.abs(state.orb.x - arenaInterpreter.lastOrbX) > 24 || Math.abs(state.orb.y - arenaInterpreter.lastOrbY) > 24)
    ) {
      captureIrrlichtArenaEvent(arenaInterpreter, arenaSnapshot, "motion", {
        energy: 0.22 + Math.hypot(state.orb.vx, state.orb.vy) / 460,
        lane: clampValue(Math.round((state.playerX / GAME_WIDTH) * 3 + (state.orb.x / GAME_WIDTH) * 4), 0, 7),
        airborne: state.orb.y < GAME_HEIGHT * 0.34,
        detail: phase === "Radiant" ? 2 : phase === "Unstable" ? 1 : 0,
      });
      arenaInterpreter.lastSampleAt = state.elapsed;
      arenaInterpreter.lastPlayerX = state.playerX;
      arenaInterpreter.lastOrbX = state.orb.x;
      arenaInterpreter.lastOrbY = state.orb.y;
    }
    arenaInterpreter.lastDirection = arenaDirection;
  
    if (keys.shoot && state.laserTimer <= 0) {
      state.lasers.push({ x: state.playerX, y: state.playerY - 14, vx: 0, vy: -880, r: 5 });
      state.laserTimer = 0.13;
      captureIrrlichtArenaEvent(arenaInterpreter, arenaSnapshot, "sync_gate", {
        energy: 0.44 + hiddenRaw * 0.28,
        lane: clampValue(Math.round((state.playerX / GAME_WIDTH) * 7), 0, 7),
        airborne: false,
        detail: phase === "Radiant" ? 2 : phase === "Unstable" ? 1 : 0,
      });
      playPlayerShotMotif(state.activeAnchorRatio);
    }
  
    const wander = (95 + hiddenRaw * 235) * levelBoost;
    const jerk = (210 + hiddenTension * 360) * levelBoost;
    state.orb.vx += pullX * (4100 + hiddenTension * 4300) * dt * (1 + (state.level - 1) * 0.18) + (Math.random() - 0.5) * (wander + jerk * Math.random()) * dt;
    state.orb.vy += pullY * (4100 + hiddenTension * 4300) * dt * (1 + (state.level - 1) * 0.18) + (Math.random() - 0.5) * (wander + jerk * Math.random()) * dt;
  
    const damping = Math.min(0.985, 0.89 + hiddenSlim * 0.07 + (state.level - 1) * 0.012);
    state.orb.vx *= damping;
    state.orb.vy *= damping;
    const maxSpeed = 250 + hiddenRaw * 260 + (phase === "Radiant" ? 120 : phase === "Unstable" ? 60 : 0) + (state.level - 1) * 120;
    const speed = Math.hypot(state.orb.vx, state.orb.vy);
    if (speed > maxSpeed) {
      state.orb.vx = (state.orb.vx / speed) * maxSpeed;
      state.orb.vy = (state.orb.vy / speed) * maxSpeed;
    }
    state.orb.x += state.orb.vx * dt;
    state.orb.y += state.orb.vy * dt;
  
    const pad = 48;
    if (state.orb.x < pad) {
      state.orb.x = pad;
      state.orb.vx = Math.abs(state.orb.vx) * 0.8;
    }
    if (state.orb.x > GAME_WIDTH - pad) {
      state.orb.x = GAME_WIDTH - pad;
      state.orb.vx = -Math.abs(state.orb.vx) * 0.8;
    }
    if (state.orb.y < pad) {
      state.orb.y = pad;
      state.orb.vy = Math.abs(state.orb.vy) * 0.8;
    }
    if (state.orb.y > GAME_HEIGHT * 0.72) {
      state.orb.y = GAME_HEIGHT * 0.72;
      state.orb.vy = -Math.abs(state.orb.vy) * 0.8;
    }
  
    state.orb.r = 29 + hiddenTension * 4 + Math.sin(state.elapsed * (2.6 + hiddenRaw)) * 3;
  
    state.enemyTimer -= dt;
    if (state.enemyTimer <= 0) {
      const chaosPulse = nextGameChaos();
      const isLevelOne = state.level === 1;
      const isLevelTwo = state.level === 2;
      const projectileSpeedScale = isLevelOne ? 0.72 : isLevelTwo ? 0.84 : 1;
      const projectileSize = isLevelOne ? 6 : isLevelTwo ? 6.6 : 7.5;
      const pattern = chaosPulse < 0.33 ? "fan" : chaosPulse < 0.66 ? "spiral" : "aim";
      if (pattern === "fan") {
        const spread = isLevelOne ? 1 : isLevelTwo ? (phase === "Radiant" ? 2 : 1) : phase === "Radiant" ? 4 : phase === "Unstable" ? 3 : 2;
        for (let i = -spread; i <= spread; i += 1) {
          const angle = Math.PI / 2 + i * (0.12 + chaosPulse * 0.12);
          const speed = (230 + Math.random() * 170) * projectileSpeedScale;
          state.bolts.push({ x: state.orb.x, y: state.orb.y + 20, vx: Math.cos(angle) * speed * 0.48, vy: Math.sin(angle) * speed, r: projectileSize + Math.random() * (isLevelOne ? 1.1 : 2) });
        }
      } else if (pattern === "spiral") {
        const burst = isLevelOne ? 3 : isLevelTwo ? (phase === "Radiant" ? 4 : 3) : phase === "Radiant" ? 6 : 4;
        const spinBase = state.elapsed * 4.6 + chaosPulse * Math.PI * 2;
        for (let i = 0; i < burst; i += 1) {
          const angle = spinBase + i * ((Math.PI * 2) / burst);
          const speed = (210 + i * 24 + Math.random() * 70) * projectileSpeedScale;
          state.bolts.push({ x: state.orb.x, y: state.orb.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: isLevelOne ? 5.8 : 6.5 });
        }
      } else {
        const aimDx = state.playerX - state.orb.x;
        const aimDy = state.playerY - state.orb.y;
        const aimNorm = Math.max(1, Math.hypot(aimDx, aimDy));
        const aimed = isLevelOne ? 2 : isLevelTwo ? (phase === "Radiant" ? 3 : 2) : phase === "Radiant" ? 4 : 3;
        for (let i = 0; i < aimed; i += 1) {
          const jitter = (Math.random() - 0.5) * (isLevelOne ? 0.62 : isLevelTwo ? 0.58 : 0.46);
          const cs = Math.cos(jitter);
          const sn = Math.sin(jitter);
          const ux = aimDx / aimNorm;
          const uy = aimDy / aimNorm;
          const rx = ux * cs - uy * sn;
          const ry = ux * sn + uy * cs;
          const speed = (290 + Math.random() * 120 + i * 24) * projectileSpeedScale;
          state.bolts.push({ x: state.orb.x, y: state.orb.y, vx: rx * speed, vy: ry * speed, r: projectileSize });
        }
      }
      const cadenceJitter = isLevelOne ? 0.92 + nextGameChaos() * 1.25 : isLevelTwo ? 0.72 + nextGameChaos() * 1.14 : 0.44 + nextGameChaos() * (0.98 + state.level * 0.06);
      state.enemyTimer = enemyRate * cadenceJitter;
      if (!isLevelOne && !isLevelTwo && phase !== "Dormant" && nextGameChaos() > 0.74) state.enemyTimer *= 0.56;
      captureIrrlichtArenaEvent(arenaInterpreter, getArenaInterpreterSnapshot(phase), "phase_gate", {
        energy: 0.4 + (phase === "Radiant" ? 0.32 : phase === "Unstable" ? 0.18 : 0.08),
        lane: clampValue(Math.round((state.orb.x / GAME_WIDTH) * 7), 0, 7),
        airborne: true,
        detail: phase === "Radiant" ? 2 : phase === "Unstable" ? 1 : 0,
      });
      playOrbShotSound(state.activeAnchorRatio, phase);
    }
  }
  
  state.lasers = state.lasers.filter((laser) => {
    laser.x += laser.vx * dt;
    laser.y += laser.vy * dt;
    return laser.y > -30;
  });
  
  state.bolts = state.bolts.filter((bolt) => {
    bolt.x += bolt.vx * dt;
    bolt.y += bolt.vy * dt;
    return bolt.y < GAME_HEIGHT + 35 && bolt.x > -40 && bolt.x < GAME_WIDTH + 40;
  });
  
  for (let i = state.lasers.length - 1; i >= 0; i -= 1) {
    const laser = state.lasers[i];
    const dx = laser.x - state.orb.x;
    const dy = laser.y - state.orb.y;
    if (Math.hypot(dx, dy) < state.orb.r + laser.r) {
      state.lasers.splice(i, 1);
      state.score += 1;
      state.totalScore += 1;
      state.hits += 1;
      captureIrrlichtArenaEvent(arenaInterpreter, getArenaInterpreterSnapshot(phase), "npc_orb", {
        energy: 0.52 + state.level * 0.05,
        lane: clampValue(Math.round((state.orb.x / GAME_WIDTH) * 7), 0, 7),
        airborne: true,
      });
      spawnBurst(state, state.orb.x, state.orb.y, 38);
      playOrbHitSound(state.activeAnchorRatio);
      const heartChance = state.level === 1 ? 0.08 : state.level === 2 ? 0.06 : 0.04;
      if (Math.random() < heartChance && state.hearts.length < 1 && state.heartDropCooldown <= 0) {
        state.hearts.push({ x: state.orb.x + (Math.random() - 0.5) * 20, y: state.orb.y + 10, vx: (Math.random() - 0.5) * 90, vy: 68 + Math.random() * 55, r: 10, spin: Math.random() * Math.PI * 2, life: 8 });
        state.heartDropCooldown = 6 + Math.random() * 5;
      }
      if (state.score >= levelGoal) {
        const previousLevel = state.level;
        state.level += 1;
        state.score = 0;
        state.levelUpFrom = previousLevel;
        state.levelUpTo = state.level;
        state.levelUpTimer = 1.8;
        state.enemyTimer = 0.5;
        state.orb.x = GAME_WIDTH * (0.25 + Math.random() * 0.5);
        state.orb.y = 120 + Math.random() * 120;
        state.orb.vx = (120 + Math.random() * 130) * (Math.random() > 0.5 ? 1 : -1) * (1 + (state.level - 1) * 0.2);
        state.orb.vy = (-40 + Math.random() * 120) * (1 + (state.level - 1) * 0.2);
        state.bolts.length = 0;
        state.lasers.length = 0;
        state.hearts.length = 0;
        state.heartDropCooldown = 2.5;
        state.hp = 6;
        captureIrrlichtArenaEvent(arenaInterpreter, getArenaInterpreterSnapshot(phase), "mode_shift", {
          energy: 0.7,
          lane: clampValue(Math.round((state.orb.x / GAME_WIDTH) * 7), 0, 7),
          airborne: true,
          detail: Math.min(2, state.level - 1),
        });
        spawnBurst(state, state.orb.x, state.orb.y, 56);
      }
    }
  }
  
  for (let i = state.bolts.length - 1; i >= 0; i -= 1) {
    const bolt = state.bolts[i];
    const dx = bolt.x - state.playerX;
    const dy = bolt.y - state.playerY;
    if (Math.hypot(dx, dy) < state.playerRadius + bolt.r && state.invuln <= 0) {
      state.bolts.splice(i, 1);
      state.hp -= 1;
      state.invuln = 0.8;
      captureIrrlichtArenaEvent(arenaInterpreter, getArenaInterpreterSnapshot(phase), "fall", {
        energy: 0.58,
        lane: clampValue(Math.round((state.playerX / GAME_WIDTH) * 7), 0, 7),
        airborne: false,
        detail: phase === "Radiant" ? 2 : phase === "Unstable" ? 1 : 0,
      });
      spawnBurst(state, state.playerX, state.playerY, 195);
      playPlayerHitSound(state.activeAnchorRatio);
      if (state.hp <= 0) {
        state.over = true;
        state.won = false;
      }
    }
  }
  
  state.particles = state.particles.filter((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.life -= dt;
    return p.life > 0;
  });
  
  state.hearts = state.hearts.filter((heart) => {
    heart.x += heart.vx * dt;
    heart.y += heart.vy * dt;
    heart.vx *= 0.985;
    heart.vy += 18 * dt;
    heart.spin += dt * 1.7;
    heart.life -= dt;
    if (heart.life <= 0 || heart.y > GAME_HEIGHT + 30 || heart.x < -40 || heart.x > GAME_WIDTH + 40) return false;
    const dx = heart.x - state.playerX;
    const dy = heart.y - state.playerY;
    if (Math.hypot(dx, dy) < state.playerRadius + heart.r + 2) {
      state.hp = Math.min(6, state.hp + 1);
      captureIrrlichtArenaEvent(arenaInterpreter, getArenaInterpreterSnapshot(phase), "checkpoint", {
        energy: 0.46,
        lane: clampValue(Math.round((heart.x / GAME_WIDTH) * 7), 0, 7),
        airborne: false,
      });
      spawnBurst(state, heart.x, heart.y, 118);
      playHeartPickupChord(state.activeAnchorRatio);
      return false;
    }
    return true;
  });
  
  state.heartDropCooldown = Math.max(0, state.heartDropCooldown - dt);

  return { phase };
}
