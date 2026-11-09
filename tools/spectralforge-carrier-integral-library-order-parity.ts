import {
  createCarrierIntegralManualLibraryOrder,
  resolveCarrierIntegralLibraryDropOrder,
  sortCarrierIntegralLibraryEntries,
} from '../src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralLibraryOrder';

type Entry = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  bpm: number;
  bars: number;
  activeTool: string;
};

type SortMode = 'updated-desc' | 'created-desc' | 'name-asc' | 'manual';
type DropOperation = 'swap' | 'insert-before' | 'insert-after';

const entries: Entry[] = [
  { id: 'beta', name: 'Beta', createdAt: 20, updatedAt: 60, bpm: 120, bars: 4, activeTool: 'brush' },
  { id: 'alpha', name: 'alpha', createdAt: 40, updatedAt: 40, bpm: 120, bars: 4, activeTool: 'brush' },
  { id: 'gamma', name: 'Gamma', createdAt: 10, updatedAt: 90, bpm: 120, bars: 4, activeTool: 'brush' },
  { id: 'delta', name: 'delta', createdAt: 80, updatedAt: 30, bpm: 120, bars: 4, activeTool: 'brush' },
];

function oldSort(entries: Entry[], sortMode: SortMode, manualOrder: string[]): Entry[] {
  const next = [...entries];
  switch (sortMode) {
    case 'manual': {
      const order = new Map(manualOrder.map((id, index) => [id, index]));
      next.sort((a, b) => {
        const ai = order.get(a.id);
        const bi = order.get(b.id);
        if (ai !== undefined && bi !== undefined) return ai - bi;
        if (ai !== undefined) return -1;
        if (bi !== undefined) return 1;
        return b.updatedAt - a.updatedAt;
      });
      break;
    }
    case 'name-asc':
      next.sort((a, b) =>
        a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }),
      );
      break;
    case 'created-desc':
      next.sort((a, b) => b.createdAt - a.createdAt);
      break;
    case 'updated-desc':
    default:
      next.sort((a, b) => b.updatedAt - a.updatedAt);
      break;
  }
  return next;
}

function oldDrop(args: {
  entries: Entry[];
  manualOrder: string[];
  dragId: string;
  targetId: string;
  operation: DropOperation;
}): string[] | null {
  const { entries, manualOrder, dragId, targetId, operation } = args;
  if (!dragId || dragId === targetId) return null;
  const ids = (manualOrder.length ? manualOrder : entries.map((entry) => entry.id))
    .filter((id) => entries.some((entry) => entry.id === id));
  if (!ids.includes(dragId)) ids.push(dragId);
  if (!ids.includes(targetId)) ids.push(targetId);
  const withoutDrag = ids.filter((id) => id !== dragId);
  const targetIndex = withoutDrag.indexOf(targetId);
  if (targetIndex < 0) return null;
  if (operation === 'swap') {
    const dragIndex = ids.indexOf(dragId);
    const next = [...ids];
    const targetOriginalIndex = ids.indexOf(targetId);
    next[dragIndex] = targetId;
    next[targetOriginalIndex] = dragId;
    return next;
  }
  const insertAt = operation === 'insert-after' ? targetIndex + 1 : targetIndex;
  const next = [...withoutDrag];
  next.splice(insertAt, 0, dragId);
  return next;
}

function ids(values: Entry[]): string[] {
  return values.map((entry) => entry.id);
}

function assertEqual(label: string, actual: unknown, expected: unknown): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${label} mismatch\nactual:   ${actualJson}\nexpected: ${expectedJson}`);
  }
}

const checked: string[] = [];
function check(label: string, actual: unknown, expected: unknown): void {
  assertEqual(label, actual, expected);
  checked.push(label);
}

for (const sortMode of ['updated-desc', 'created-desc', 'name-asc'] as const) {
  check(`sort ${sortMode}`, ids(sortCarrierIntegralLibraryEntries(entries, sortMode, [])), ids(oldSort(entries, sortMode, [])));
}
check(
  'manual sort preserves explicit order then updated fallback',
  ids(sortCarrierIntegralLibraryEntries(entries, 'manual', ['delta', 'beta'])),
  ids(oldSort(entries, 'manual', ['delta', 'beta'])),
);
check(
  'manual order from visible entries',
  createCarrierIntegralManualLibraryOrder(entries),
  entries.map((entry) => entry.id),
);

const dropScenarios = [
  { label: 'drop no-op same entry', manualOrder: [], dragId: 'alpha', targetId: 'alpha', operation: 'swap' as const },
  { label: 'drop swap with implicit order', manualOrder: [], dragId: 'alpha', targetId: 'gamma', operation: 'swap' as const },
  { label: 'drop insert before implicit order', manualOrder: [], dragId: 'delta', targetId: 'alpha', operation: 'insert-before' as const },
  { label: 'drop insert after implicit order', manualOrder: [], dragId: 'delta', targetId: 'alpha', operation: 'insert-after' as const },
  { label: 'drop swap with stale manual id filtered', manualOrder: ['ghost', 'gamma', 'alpha', 'beta'], dragId: 'gamma', targetId: 'beta', operation: 'swap' as const },
  { label: 'drop insert before with missing drag appended', manualOrder: ['gamma', 'alpha'], dragId: 'delta', targetId: 'gamma', operation: 'insert-before' as const },
  { label: 'drop insert after with missing target appended', manualOrder: ['gamma', 'alpha'], dragId: 'alpha', targetId: 'delta', operation: 'insert-after' as const },
];
for (const scenario of dropScenarios) {
  const { label, ...args } = scenario;
  check(
    label,
    resolveCarrierIntegralLibraryDropOrder({ entries, ...args }),
    oldDrop({ entries, ...args }),
  );
}

console.log(JSON.stringify({ ok: true, checkedScenarios: checked.length, checked }, null, 2));
