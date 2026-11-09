export type AppXenpolarGameKeyState = {
  left: boolean;
  right: boolean;
  shoot: boolean;
};

export type AppXenpolarGamePlayScheduledTone = (
  freq: number,
  offset: number,
  dur: number,
  type: OscillatorType,
  volume: number,
  q?: number,
  cutoff?: number,
) => boolean;
