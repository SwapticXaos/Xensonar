import {
  createCarrierIntegralLibraryActionErrorMessage,
  removeCarrierIntegralLibraryManualOrderId,
  resolveCarrierIntegralApplyStoredValuesSuccessFlow,
  resolveCarrierIntegralDeleteSuccessFlow,
  resolveCarrierIntegralLoadEntrySuccessFlow,
  resolveCarrierIntegralSaveSuccessFlow,
  resolveCarrierIntegralSelectEntryFlow,
} from '../src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralLibraryActionFlow';

type Case = { name: string; actual: unknown; expected: unknown };
type Entry = { id: string; name: string };

const entry: Entry = { id: 'entry-alpha', name: 'Alpha Figur' };
const entryB: Entry = { id: 'entry-beta', name: 'Beta Figur' };

function oldErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Bibliotheksaktion fehlgeschlagen';
}
function oldSave(meta: Entry) {
  return { selectedProjectId: meta.id, projectName: meta.name, libraryMessage: 'gesichert · ' + meta.name };
}
function oldDelete(args: { selectedProjectName?: string | null; projectName: string }) {
  const deletedName = args.selectedProjectName ?? args.projectName;
  return { selectedProjectId: null, deletedName, libraryMessage: 'gelöscht · ' + deletedName };
}
function oldSelect(item: Entry) {
  return { selectedProjectId: item.id, projectName: item.name, auditionValueSource: 'right-override', auditionError: null, libraryMessage: 'aufgelegt · ' + item.name };
}
function oldLoad(item: Entry) {
  return { selectedProjectId: item.id, projectName: item.name, libraryMessage: 'geladen · ' + item.name };
}
function oldApply(item: Entry) {
  return { selectedProjectId: item.id, projectName: item.name, auditionValueSource: 'right-override', libraryMessage: 'Werte übernommen · ' + item.name };
}
function toComparable(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

const checked: Case[] = [];
function check(name: string, actual: unknown, expected: unknown) {
  checked.push({ name, actual: toComparable(actual), expected: toComparable(expected) });
}

check('save success selects new meta and message', resolveCarrierIntegralSaveSuccessFlow(entry), oldSave(entry));
check('delete success uses selected project name', resolveCarrierIntegralDeleteSuccessFlow({ selectedProjectId: entry.id, selectedProjectName: entry.name, projectName: 'Fallback' }), oldDelete({ selectedProjectName: entry.name, projectName: 'Fallback' }));
check('delete success falls back to current project name', resolveCarrierIntegralDeleteSuccessFlow({ selectedProjectId: entry.id, selectedProjectName: null, projectName: 'Fallback Name' }), oldDelete({ selectedProjectName: null, projectName: 'Fallback Name' }));
check('manual order removes deleted id only', removeCarrierIntegralLibraryManualOrderId(['x', entry.id, 'y', entryB.id], entry.id), ['x', 'y', entryB.id]);
check('manual order no-op for missing id', removeCarrierIntegralLibraryManualOrderId(['x', 'y'], entry.id), ['x', 'y']);
check('select entry sets right override and clears audition error', resolveCarrierIntegralSelectEntryFlow(entry), oldSelect(entry));
check('load entry success selects and labels loaded entry', resolveCarrierIntegralLoadEntrySuccessFlow(entryB), oldLoad(entryB));
check('apply stored values success selects right override and message', resolveCarrierIntegralApplyStoredValuesSuccessFlow(entryB), oldApply(entryB));
check('error message preserves Error message', createCarrierIntegralLibraryActionErrorMessage(new Error('Kaputt')), oldErrorMessage(new Error('Kaputt')));
check('error message falls back for unknown thrown value', createCarrierIntegralLibraryActionErrorMessage('bad'), oldErrorMessage('bad'));

const mismatches = checked.filter((item) => JSON.stringify(item.actual) !== JSON.stringify(item.expected));
if (mismatches.length) {
  console.error(JSON.stringify({ ok: false, mismatches }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, checkedScenarios: checked.length }, null, 2));
