export const MASTER_RECORDING_RACK_ATTR = 'data-xensonar-master-recording-rack';
export const MASTER_RECORDING_RACK_SELECTOR = `[${MASTER_RECORDING_RACK_ATTR}="true"]`;

export function scrollMasterRecordingRackIntoView(behavior: ScrollBehavior = 'smooth'): boolean {
  if (typeof document === 'undefined') return false;
  const target = document.querySelector<HTMLElement>(MASTER_RECORDING_RACK_SELECTOR);
  if (!target) return false;
  target.scrollIntoView({ behavior, block: 'start', inline: 'nearest' });
  return true;
}

export function scheduleMasterRecordingRackScroll(behavior: ScrollBehavior = 'smooth') {
  if (typeof window === 'undefined') return;
  const run = () => scrollMasterRecordingRackIntoView(behavior);
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(run);
  });
  window.setTimeout(run, 180);
}
