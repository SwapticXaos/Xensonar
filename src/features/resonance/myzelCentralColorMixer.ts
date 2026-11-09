export type MyzelCentralColorMixer = {
  enabled: boolean;
  volume: number;
  carrier: number;
  sub: number;
  formant: number;
  overtone: number;
  drive: number;
  air: number;
};

export const DEFAULT_MYZEL_CENTRAL_COLOR_MIXER: MyzelCentralColorMixer = {
  enabled: true,
  volume: 0.72,
  carrier: 0.78,
  sub: 0.55,
  formant: 0.7,
  overtone: 0.62,
  drive: 0.58,
  air: 0.5,
};

export const clampMyzelCentralColorMixerValue = (value: number, max = 1.5): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, value));
};

export const normalizeMyzelCentralColorMixer = (mixer: Partial<MyzelCentralColorMixer> | null | undefined): MyzelCentralColorMixer => ({
  enabled: mixer?.enabled ?? DEFAULT_MYZEL_CENTRAL_COLOR_MIXER.enabled,
  volume: clampMyzelCentralColorMixerValue(mixer?.volume ?? DEFAULT_MYZEL_CENTRAL_COLOR_MIXER.volume, 1.5),
  carrier: clampMyzelCentralColorMixerValue(mixer?.carrier ?? DEFAULT_MYZEL_CENTRAL_COLOR_MIXER.carrier),
  sub: clampMyzelCentralColorMixerValue(mixer?.sub ?? DEFAULT_MYZEL_CENTRAL_COLOR_MIXER.sub),
  formant: clampMyzelCentralColorMixerValue(mixer?.formant ?? DEFAULT_MYZEL_CENTRAL_COLOR_MIXER.formant),
  overtone: clampMyzelCentralColorMixerValue(mixer?.overtone ?? DEFAULT_MYZEL_CENTRAL_COLOR_MIXER.overtone),
  drive: clampMyzelCentralColorMixerValue(mixer?.drive ?? DEFAULT_MYZEL_CENTRAL_COLOR_MIXER.drive),
  air: clampMyzelCentralColorMixerValue(mixer?.air ?? DEFAULT_MYZEL_CENTRAL_COLOR_MIXER.air),
});
