export type BasisHearingAuditionPhase = 'idle' | 'preparing' | 'playing' | 'ready' | 'error';

export type BasisHearingAuditionUiState = {
  optionId: string | null;
  phase: BasisHearingAuditionPhase;
  progress: number;
  cacheHit: boolean | null;
};

export function resolveBasisHearingAuditionUi(args: {
  optionId: string;
  activeBySelection: boolean;
  chosenOptionId: string | null;
  audition: BasisHearingAuditionUiState;
}): { visuallyActive: boolean; pending: boolean; statusLabel: string; progressPercent: string; phase: BasisHearingAuditionPhase } {
  const auditionForOption = args.audition.optionId === args.optionId ? args.audition : null;
  const visuallyActive = args.chosenOptionId ? args.chosenOptionId === args.optionId : args.activeBySelection;
  const pending = auditionForOption?.phase === 'preparing';
  const statusLabel = pending
    ? 'lädt'
    : auditionForOption?.phase === 'playing'
      ? 'spielt'
      : auditionForOption?.phase === 'ready'
        ? 'bereit'
        : auditionForOption?.phase === 'error'
          ? 'Fehler'
          : visuallyActive
            ? 'gewählt'
            : 'Play';
  return {
    visuallyActive,
    pending,
    statusLabel,
    progressPercent: auditionForOption ? String(Math.round(auditionForOption.progress * 100)) : '',
    phase: auditionForOption?.phase ?? 'idle',
  };
}
