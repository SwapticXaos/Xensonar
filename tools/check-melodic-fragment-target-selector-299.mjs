import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const fail = (message) => { console.error(`[melodic-fragment-target-selector-299] FAIL: ${message}`); process.exit(1); };
const must = (text, needle, message) => { if (!text.includes(needle)) fail(message); };

const card = read('src/features/l3lab/canonicalForge/MaterialBaseFragmentActionCard.tsx');
const panel = read('src/features/l3lab/canonicalForge/melodicLoopPanel.tsx');

must(card, 'fragmentTargetOptions: FragmentTargetOption[]', 'cut card must receive explicit target choices');
must(card, 'onSelectFragmentTarget: (noteId: string) => void', 'cut card must expose explicit target selection');
must(card, 'aria-label="Schnittziel"', 'cut card must render an accessible target selector');
must(card, '<span className="shrink-0 text-neutral-400">Ziel:</span>', 'target selector must retain the visible Ziel label');
must(card, 'onChange={(event) => onSelectFragmentTarget(event.target.value)}', 'target selector must actively change the selected import body');
must(panel, 'const fragmentTargetOptions = React.useMemo(() => loopComposer.notes', 'panel must derive targets from live import bodies');
must(panel, '.filter((note) => isFragmentableLoopImportBody(note))', 'only fragmentable import bodies may become cut targets');
must(panel, 'draft.selectedNoteId = liveTarget.id', 'target selection must update the live selected body');
must(panel, 'draft.selectedTrackId = liveTarget.trackId', 'target selection must update the live selected lane');
must(panel, 'fragmentTargetOptions={fragmentTargetOptions}', 'target choices must be wired into the cut card');
must(panel, 'onSelectFragmentTarget={handleFragmentTargetSelect}', 'target selector callback must be wired into the cut card');

console.log('[melodic-fragment-target-selector-299] PASS: So-schneiden target is explicitly selectable from live import bodies, without relying on canvas retargeting.');
