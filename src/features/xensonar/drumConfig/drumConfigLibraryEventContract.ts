export const DRUM_CONFIG_LIBRARY_EVENT_NAMES = {
  registered: 'xensonar:drum-config-registered',
  updated: 'xensonar:drum-config-updated',
  deleted: 'xensonar:drum-config-deleted',
} as const;

export type DrumConfigRegisteredDetail = {
  id: string;
  name: string;
  presetSource: string;
};

export type DrumConfigUpdatedDetail = {
  id: string;
  name: string;
};

export type DrumConfigDeletedDetail = {
  id: string;
};

export type DrumConfigLibraryEventMap = {
  registered: DrumConfigRegisteredDetail;
  updated: DrumConfigUpdatedDetail;
  deleted: DrumConfigDeletedDetail;
};

export type DrumConfigLibraryEventKey = keyof DrumConfigLibraryEventMap;
export type DrumConfigLibraryEventHandler<K extends DrumConfigLibraryEventKey> = (
  detail: DrumConfigLibraryEventMap[K],
  event: CustomEvent<DrumConfigLibraryEventMap[K]>,
) => void;

export function dispatchDrumConfigLibraryEvent<K extends DrumConfigLibraryEventKey>(
  key: K,
  detail: DrumConfigLibraryEventMap[K],
): boolean {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return false;
  window.dispatchEvent(new CustomEvent<DrumConfigLibraryEventMap[K]>(DRUM_CONFIG_LIBRARY_EVENT_NAMES[key], { detail }));
  return true;
}

export function listenDrumConfigLibraryEvent<K extends DrumConfigLibraryEventKey>(
  key: K,
  handler: DrumConfigLibraryEventHandler<K>,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (event: Event) => {
    const typedEvent = event as CustomEvent<DrumConfigLibraryEventMap[K]>;
    handler(typedEvent.detail, typedEvent);
  };
  window.addEventListener(DRUM_CONFIG_LIBRARY_EVENT_NAMES[key], listener as EventListener);
  return () => window.removeEventListener(DRUM_CONFIG_LIBRARY_EVENT_NAMES[key], listener as EventListener);
}
