export const RESONANCE_CURSOR_HUD_HZ_EVENT = 'xensonar:resonance-cursor-hud-hz';

export type ResonanceCursorHudHzEvent = CustomEvent<{ hz: number }>;

export function publishResonanceCursorHudHz(hz: number): void {
  if (typeof window === 'undefined' || !Number.isFinite(hz)) return;
  window.dispatchEvent(new CustomEvent(RESONANCE_CURSOR_HUD_HZ_EVENT, { detail: { hz } }));
}
