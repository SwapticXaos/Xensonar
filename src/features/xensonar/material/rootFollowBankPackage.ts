import { isRecord, type WorkspacePackageImportMode } from '../../../core/systemMemory/packageCore';
import {
  normalizePersistedRootFollowBank,
  readPersistedRootFollowBank,
  remapPersistedRootFollowBankIds,
  type PersistedRootFollowBank,
} from './rootFollowBankStorage';
import { normalizeRootFollowBankEntryConfig } from '../rootFollow/rootFollowTypes';

export type RootFollowBankArchivePayload = PersistedRootFollowBank;

export function exportRootFollowBankArchivePayload(): RootFollowBankArchivePayload {
  return readPersistedRootFollowBank();
}

export function parseRootFollowBankArchivePayload(raw: unknown): RootFollowBankArchivePayload | null {
  if (!isRecord(raw)) return null;
  return normalizePersistedRootFollowBank(raw);
}

export function remapRootFollowBankArchivePayload(args: {
  payload: RootFollowBankArchivePayload;
  idMap: Map<string, string>;
  validIds?: Iterable<string>;
}): RootFollowBankArchivePayload {
  return remapPersistedRootFollowBankIds({
    bank: args.payload,
    idMap: args.idMap,
    validIds: args.validIds,
  });
}

export function combineRootFollowBankArchivePayload(args: {
  current: PersistedRootFollowBank;
  imported: PersistedRootFollowBank;
  mode: WorkspacePackageImportMode;
}): PersistedRootFollowBank {
  const current = normalizePersistedRootFollowBank(args.current);
  const imported = normalizePersistedRootFollowBank(args.imported);
  if (args.mode === 'replace') return imported;

  const memberIds = [...current.memberIds];
  for (const id of imported.memberIds) {
    if (!memberIds.includes(id)) memberIds.push(id);
  }
  const orderedIds = [...current.orderedIds.filter((id) => memberIds.includes(id))];
  for (const id of imported.orderedIds) {
    if (memberIds.includes(id) && !orderedIds.includes(id)) orderedIds.push(id);
  }

  const aliases = { ...current.aliases };
  const entryConfigs = { ...current.entryConfigs };
  for (const id of imported.memberIds) {
    if (args.mode === 'differential' || !(id in aliases)) {
      if (typeof imported.aliases[id] === 'string') aliases[id] = imported.aliases[id];
    }
    if (args.mode === 'differential' || !(id in entryConfigs)) {
      entryConfigs[id] = normalizeRootFollowBankEntryConfig(imported.entryConfigs[id]);
    }
  }

  return normalizePersistedRootFollowBank({
    schemaVersion: 3,
    memberIds,
    orderedIds,
    aliases,
    entryConfigs,
  });
}
