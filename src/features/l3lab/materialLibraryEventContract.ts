import type { MaterialRole } from './materialLibraryTypes';

// Stable browser integration surface. `updated` and `reordered` currently have no
// internal listener, but remain public compatibility notifications for external integrations.
export const MATERIAL_LIBRARY_EVENT_NAMES = {
  registered: 'xensonar:material-registered',
  updated: 'xensonar:material-updated',
  reordered: 'xensonar:material-reordered',
  deleted: 'xensonar:material-deleted',
} as const;

export type MaterialLibraryRegisteredDetail = {
  id: string;
  role: MaterialRole;
  name: string;
};

export type MaterialLibraryUpdatedDetail = MaterialLibraryRegisteredDetail;

export type MaterialLibraryReorderedDetail = {
  id: string;
  swapWith?: string;
  orderedIds?: readonly string[];
};

export type MaterialLibraryDeletedDetail = {
  id: string;
};

export type MaterialLibraryEventMap = {
  registered: MaterialLibraryRegisteredDetail;
  updated: MaterialLibraryUpdatedDetail;
  reordered: MaterialLibraryReorderedDetail;
  deleted: MaterialLibraryDeletedDetail;
};

export type MaterialLibraryEventKey = keyof MaterialLibraryEventMap;
export type MaterialLibraryEventHandler<K extends MaterialLibraryEventKey> = (
  detail: MaterialLibraryEventMap[K],
  event: CustomEvent<MaterialLibraryEventMap[K]>,
) => void;

export function dispatchMaterialLibraryEvent<K extends MaterialLibraryEventKey>(
  key: K,
  detail: MaterialLibraryEventMap[K],
): boolean {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return false;
  window.dispatchEvent(new CustomEvent<MaterialLibraryEventMap[K]>(MATERIAL_LIBRARY_EVENT_NAMES[key], { detail }));
  return true;
}

export function listenMaterialLibraryEvent<K extends MaterialLibraryEventKey>(
  key: K,
  handler: MaterialLibraryEventHandler<K>,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (event: Event) => {
    const typedEvent = event as CustomEvent<MaterialLibraryEventMap[K]>;
    handler(typedEvent.detail, typedEvent);
  };
  window.addEventListener(MATERIAL_LIBRARY_EVENT_NAMES[key], listener as EventListener);
  return () => window.removeEventListener(MATERIAL_LIBRARY_EVENT_NAMES[key], listener as EventListener);
}
