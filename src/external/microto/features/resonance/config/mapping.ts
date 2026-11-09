import { BP_13TET_RATIOS, DRONE_FREQ_SPAN, DRONE_MAX_FREQ, DRONE_MIN_FREQ } from "./constants";
import { JI_NODES } from "./overtones";

export const droneFreqFromY = (y: number, height: number) =>
  DRONE_MIN_FREQ + (1 - y / height) * DRONE_FREQ_SPAN;

export const yFromDroneFreq = (freq: number, height: number) =>
  height * (1 - (freq - DRONE_MIN_FREQ) / DRONE_FREQ_SPAN);

export const createTuningGridConfig = (height: number) => ({
  minFreq: DRONE_MIN_FREQ,
  maxFreq: DRONE_MAX_FREQ,
  height,
  jiRatios: JI_NODES.map((node) => node.ratio),
  bpRatios: BP_13TET_RATIOS,
});

