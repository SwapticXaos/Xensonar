export const OPEN_CARRIER_INTEGRAL_EDITOR_EVENT = 'xensonar:open-carrier-integral-editor';
export const CARRIER_INTEGRAL_EDITOR_INTENT_SESSION_KEY = 'xensonar:carrier-integral-editor-intent';

export type CarrierIntegralEditorFocusTarget = 'melodic-pink-send' | 'library';

export type CarrierIntegralEditorIntent = {
  token: string;
  createdAt: number;
  reason: 'missing-pink-plan' | 'edit-audio-paint-entry';
  materialEntryId?: string;
  materialName?: string;
  carrierProjectId?: string;
  carrierProjectName?: string;
  machineId?: string;
  prism?: string;
  focusTarget: CarrierIntegralEditorFocusTarget;
};

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

export function normalizeCarrierIntegralEditorIntent(value: unknown): CarrierIntegralEditorIntent | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<CarrierIntegralEditorIntent>;
  const token = nonEmptyString(candidate.token) ?? `carrier-editor:${Date.now().toString(36)}`;
  const createdAt = typeof candidate.createdAt === 'number' && Number.isFinite(candidate.createdAt)
    ? candidate.createdAt
    : Date.now();
  const reason = candidate.reason === 'missing-pink-plan' || candidate.reason === 'edit-audio-paint-entry'
    ? candidate.reason
    : 'edit-audio-paint-entry';
  const focusTarget = candidate.focusTarget === 'library' ? 'library' : 'melodic-pink-send';
  return {
    token,
    createdAt,
    reason,
    materialEntryId: nonEmptyString(candidate.materialEntryId),
    materialName: nonEmptyString(candidate.materialName),
    carrierProjectId: nonEmptyString(candidate.carrierProjectId),
    carrierProjectName: nonEmptyString(candidate.carrierProjectName),
    machineId: nonEmptyString(candidate.machineId),
    prism: nonEmptyString(candidate.prism),
    focusTarget,
  };
}

export function createCarrierIntegralEditorIntent(args: Omit<CarrierIntegralEditorIntent, 'token' | 'createdAt' | 'reason' | 'focusTarget'> & {
  reason?: CarrierIntegralEditorIntent['reason'];
  focusTarget?: CarrierIntegralEditorFocusTarget;
}): CarrierIntegralEditorIntent {
  return normalizeCarrierIntegralEditorIntent({
    ...args,
    reason: args.reason ?? 'edit-audio-paint-entry',
    focusTarget: args.focusTarget ?? 'melodic-pink-send',
    token: `carrier-editor:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  })!;
}

export function stashCarrierIntegralEditorIntent(intent: CarrierIntegralEditorIntent) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(CARRIER_INTEGRAL_EDITOR_INTENT_SESSION_KEY, JSON.stringify(intent));
  } catch {}
}

export function readStashedCarrierIntegralEditorIntent(): CarrierIntegralEditorIntent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(CARRIER_INTEGRAL_EDITOR_INTENT_SESSION_KEY);
    return raw ? normalizeCarrierIntegralEditorIntent(JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

export function clearStashedCarrierIntegralEditorIntent(token?: string) {
  if (typeof window === 'undefined') return;
  try {
    if (!token) {
      window.sessionStorage.removeItem(CARRIER_INTEGRAL_EDITOR_INTENT_SESSION_KEY);
      return;
    }
    const current = readStashedCarrierIntegralEditorIntent();
    if (!current || current.token === token) {
      window.sessionStorage.removeItem(CARRIER_INTEGRAL_EDITOR_INTENT_SESSION_KEY);
    }
  } catch {}
}

export function dispatchCarrierIntegralEditorIntent(intent: CarrierIntegralEditorIntent) {
  if (typeof window === 'undefined') return;
  stashCarrierIntegralEditorIntent(intent);
  window.dispatchEvent(new CustomEvent(OPEN_CARRIER_INTEGRAL_EDITOR_EVENT, { detail: intent }));
}
