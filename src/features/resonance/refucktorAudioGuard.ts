const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export type RefucktorVoiceKind = "preview" | "particle" | "resident";

export type RefucktorAudioGuardState = {
  windowStartSec: number;
  totalCount: number;
  particleCount: number;
  residentCount: number;
};

const WINDOW_SEC = 0.16;
const TOTAL_LIMIT = 8;
const PARTICLE_LIMIT = 5;
const RESIDENT_LIMIT = 3;

export const createRefucktorAudioGuardState = (): RefucktorAudioGuardState => ({
  windowStartSec: -1,
  totalCount: 0,
  particleCount: 0,
  residentCount: 0,
});

export const resetRefucktorAudioGuardState = (state: RefucktorAudioGuardState) => {
  state.windowStartSec = -1;
  state.totalCount = 0;
  state.particleCount = 0;
  state.residentCount = 0;
};

const ensureWindow = (state: RefucktorAudioGuardState, nowSec: number) => {
  if (state.windowStartSec < 0 || nowSec - state.windowStartSec >= WINDOW_SEC) {
    state.windowStartSec = nowSec;
    state.totalCount = 0;
    state.particleCount = 0;
    state.residentCount = 0;
  }
};

export const getRefucktorVoiceAdmission = (
  state: RefucktorAudioGuardState,
  nowSec: number,
  kind: RefucktorVoiceKind,
  amp: number,
): { allowed: boolean; volumeScale: number } => {
  if (kind === "preview") return { allowed: true, volumeScale: 1 };

  ensureWindow(state, nowSec);

  const nextTotal = state.totalCount + 1;
  const nextParticle = state.particleCount + (kind === "particle" ? 1 : 0);
  const nextResident = state.residentCount + (kind === "resident" ? 1 : 0);

  if (nextTotal > TOTAL_LIMIT) return { allowed: false, volumeScale: 0 };
  if (kind === "particle" && nextParticle > PARTICLE_LIMIT) return { allowed: false, volumeScale: 0 };
  if (kind === "resident" && nextResident > RESIDENT_LIMIT) return { allowed: false, volumeScale: 0 };

  state.totalCount = nextTotal;
  state.particleCount = nextParticle;
  state.residentCount = nextResident;

  const density = Math.max(
    state.totalCount / TOTAL_LIMIT,
    kind === "particle" ? state.particleCount / PARTICLE_LIMIT : state.residentCount / RESIDENT_LIMIT,
  );
  const loudnessBrake = clamp(1 - Math.max(0, density - 0.45) * 0.8, 0.42, 1);
  const ampBrake = clamp(1 - Math.max(0, amp - 0.22) * 0.7, 0.6, 1);

  return {
    allowed: true,
    volumeScale: loudnessBrake * ampBrake,
  };
};
