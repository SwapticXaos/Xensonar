import { dispatchXensonarEvent, XENSONAR_EVENT_NAMES } from '../runtime/xensonarEventChannels';
import {
  DEFAULT_MATERIAL_ROOT_FOLLOW_ENTRY_CONFIG,
  createEmptyRootFollowBankRecord,
  normalizeRootFollowBankEntryConfig,
  type RootFollowBankRecord,
} from '../rootFollow/rootFollowTypes';

export const ROOT_FOLLOW_BANK_STORAGE_KEY = 'xensonar-root-follow-loop-bank-v1';
export const ROOT_FOLLOW_BANK_SYNC_EVENT = XENSONAR_EVENT_NAMES.rootFollowBankSync;

export type PersistedRootFollowBank = RootFollowBankRecord;

const EMPTY_BANK: PersistedRootFollowBank = createEmptyRootFollowBankRecord();

function filterStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

export function normalizePersistedRootFollowBank(raw: unknown): PersistedRootFollowBank {
  const parsed = raw && typeof raw === 'object' ? raw as Partial<PersistedRootFollowBank> & {
    aliases?: unknown;
    entryConfigs?: unknown;
    schemaVersion?: unknown;
  } : {};
  const orderedIds = filterStringArray(parsed.orderedIds);
  const memberIds = filterStringArray(parsed.memberIds);
  const normalizedMembers = memberIds.length ? memberIds : orderedIds;
  const normalizedOrderedIds = Array.from(new Set(orderedIds.filter((id) => normalizedMembers.includes(id))));
  const normalizedMemberIds = Array.from(new Set(normalizedMembers));
  const aliases = parsed.aliases && typeof parsed.aliases === 'object'
    ? Object.fromEntries(Object.entries(parsed.aliases).filter(([key, value]) => typeof key === 'string' && typeof value === 'string'))
    : {};
  const rawEntryConfigs = parsed.entryConfigs && typeof parsed.entryConfigs === 'object'
    ? parsed.entryConfigs as Record<string, unknown>
    : {};
  const entryConfigs = Object.fromEntries(
    normalizedMemberIds.map((id) => [id, normalizeRootFollowBankEntryConfig(rawEntryConfigs[id] ?? DEFAULT_MATERIAL_ROOT_FOLLOW_ENTRY_CONFIG)] as const),
  );
  return {
    schemaVersion: 3,
    memberIds: normalizedMemberIds,
    orderedIds: normalizedOrderedIds,
    aliases,
    entryConfigs,
  };
}

export function createPersistedRootFollowBankPatch(bank: Partial<PersistedRootFollowBank>): PersistedRootFollowBank {
  return normalizePersistedRootFollowBank({
    ...createEmptyRootFollowBankRecord(),
    ...bank,
  });
}

export function readPersistedRootFollowBank(): PersistedRootFollowBank {
  if (typeof window === 'undefined') return EMPTY_BANK;
  try {
    const raw = window.localStorage.getItem(ROOT_FOLLOW_BANK_STORAGE_KEY);
    return raw ? normalizePersistedRootFollowBank(JSON.parse(raw)) : EMPTY_BANK;
  } catch {
    return EMPTY_BANK;
  }
}

export function writePersistedRootFollowBank(state: PersistedRootFollowBank) {
  if (typeof window === 'undefined') return;
  try {
    const normalized = normalizePersistedRootFollowBank(state);
    window.localStorage.setItem(ROOT_FOLLOW_BANK_STORAGE_KEY, JSON.stringify(normalized));
    dispatchXensonarEvent('rootFollowBankSync', normalized);
  } catch {}
}

export function clearPersistedRootFollowBank() {
  if (typeof window === 'undefined') return;
  const empty = createEmptyRootFollowBankRecord();
  try {
    window.localStorage.removeItem(ROOT_FOLLOW_BANK_STORAGE_KEY);
  } catch {}
  try {
    dispatchXensonarEvent('rootFollowBankSync', empty);
  } catch {}
}

export function remapPersistedRootFollowBankIds(args: {
  bank: PersistedRootFollowBank;
  idMap: Map<string, string>;
  validIds?: Iterable<string>;
}): PersistedRootFollowBank {
  const validIdSet = args.validIds ? new Set(args.validIds) : null;
  const mapId = (id: string) => args.idMap.get(id) ?? id;
  const memberIds = Array.from(new Set(args.bank.memberIds.map(mapId).filter((id) => !validIdSet || validIdSet.has(id))));
  const orderedIds = Array.from(new Set(args.bank.orderedIds.map(mapId).filter((id) => memberIds.includes(id) && (!validIdSet || validIdSet.has(id)))));
  const aliases = Object.fromEntries(
    Object.entries(args.bank.aliases)
      .map(([id, value]) => [mapId(id), value] as const)
      .filter(([id, value]) => typeof id === 'string' && typeof value === 'string' && memberIds.includes(id) && (!validIdSet || validIdSet.has(id))),
  );
  const entryConfigs = Object.fromEntries(
    Object.entries(args.bank.entryConfigs)
      .map(([id, value]) => [mapId(id), normalizeRootFollowBankEntryConfig(value)] as const)
      .filter(([id]) => memberIds.includes(id) && (!validIdSet || validIdSet.has(id))),
  );
  return {
    schemaVersion: 3,
    memberIds,
    orderedIds,
    aliases,
    entryConfigs,
  };
}
