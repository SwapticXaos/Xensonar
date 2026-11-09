#!/usr/bin/env node
import fs from 'node:fs';
const read = (p) => fs.readFileSync(p, 'utf8');
const fail = (m) => { console.error(`[melodic-import-anchor-calibration-299] FAIL: ${m}`); process.exit(1); };
const must = (src, needle, label) => { if (!src.includes(needle)) fail(`${label}: ${needle}`); };
const mustNot = (src, needle, label) => { if (src.includes(needle)) fail(`${label}: ${needle}`); };

const interactions = read('src/features/l3lab/canonicalForge/useCanonicalLoopComposerInteractions.ts');
const pitch = read('src/features/l3lab/canonicalForge/materialBasePitchDisplay.ts');
const preview = read('src/features/l3lab/canonicalForge/loopPreview.ts');
const dialog = read('src/features/l3lab/canonicalForge/MaterialImportDialog.tsx');
const fragment = read('src/features/l3lab/canonicalForge/MaterialBaseFragmentActionCard.tsx');

must(pitch, 'export function resolveMaterialGridHz', 'anchor must resolve the actual selected grid/grip frequency');
must(interactions, 'entry.anchorHz = resolveMaterialGridHz(draft, entry)', 'first anchor gesture must write the selected grid frequency as raw anchor');
must(interactions, 'entry.pendingPitchAnchor = false', 'first gesture must leave calibration mode');
must(interactions, 'Normales Dragging bleibt aktiv', 'anchor completion must not imply movement lock');
must(interactions, 'candidate.anchorHz = resolveMaterialGridHz(args.loopComposer, candidate)', 'first drag must preview candidate raw anchor frequency');
must(interactions, 'Raw-Ankergriffstufe vorgehört', 'first drag must audition its raw reference level');
must(preview, 'const rawMaterialAnchorPosition', 'preview must explicitly distinguish the raw anchor position');
must(preview, '&& !rawMaterialAnchorPosition', 'granular elasticity must be bypassed at raw anchor');
must(preview, 'const directPlaybackRate = rawMaterialAnchorPosition ? 1 : playbackProfile.playbackRate', 'raw anchor must play the source at native rate');
must(dialog, '>Vorläufige Startlage</div>', 'import dialog must distinguish initial placement from anchor');
must(dialog, 'danach bleibt normales Dragging vollständig aktiv', 'dialog must explain post-anchor normal dragging');
must(fragment, 'legt nur die Roh-Audio-Referenz fest', 'cut UI must not describe anchor as a positional lock');
mustNot(dialog, '>Start-/Quellanker</div>', 'provisional import location must not be mislabeled as final anchor');
console.log('[melodic-import-anchor-calibration-299] PASS: first gesture calibrates raw/native anchor; later drag remains ordinary and granular movement is relative to that anchor.');
