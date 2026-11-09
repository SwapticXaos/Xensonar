#!/usr/bin/env node
import fs from 'node:fs';
const read = (p) => fs.readFileSync(p, 'utf8');
const fail = (m) => { console.error(`[melodic-import-lane-policy-298] FAIL: ${m}`); process.exit(1); };
const must = (src, needle, label) => { if (!src.includes(needle)) fail(`${label}: ${needle}`); };
const mustNot = (src, needle, label) => { if (src.includes(needle)) fail(`${label}: ${needle}`); };

const policy = read('src/features/l3lab/canonicalForge/melodicImportLanePolicy.ts');
const policyRuntime = read('src/features/l3lab/canonicalForge/useMelodicImportLanePolicyRuntime.ts');
const workflow = read('src/features/l3lab/canonicalForge/materialBaseWorkflow.ts');
const carrier = read('src/features/l3lab/canonicalForge/carrierIntegralPinkLaneBridge.ts');
const gateway = read('src/features/l3lab/canonicalForge/useMelodicMaterialImportGateway.ts');
const dialog = read('src/features/l3lab/canonicalForge/SpectralImportColorDialog.tsx');
const interactions = read('src/features/l3lab/canonicalForge/useCanonicalLoopComposerInteractions.ts');
const render = read('src/features/l3lab/canonicalForge/loopComposerRendering.ts');
const effects = read('src/features/l3lab/canonicalForge/useCanonicalForgeRenderEffects.ts');
const fragment = read('src/features/l3lab/canonicalForge/MaterialBaseFragmentActionCard.tsx');
const importDialog = read('src/features/l3lab/canonicalForge/MaterialImportDialog.tsx');

must(policy, "trackId: `${prefix}:${randomLaneSuffix()}`", 'every new import must receive a unique dynamic lane id');
must(policy, "MELODIC_IMPORT_PRIMARY_PINK = '#ec4899'", 'first import pink must be explicit policy');
must(policyRuntime, 'hasPrimaryPinkImportLane(args.loopComposer)', 'multi-import must detect an existing pink lane');
must(policyRuntime, 'Es liegt bereits eine pinke Spur im Melodic Loop. Farbe wählen.', 'second import must show the required notice');
must(dialog, '>Farbe wählen</span>', 'spectral editor must expose Farbe wählen');
must(dialog, "background: 'linear-gradient(90deg,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)'", 'color editor must provide a spectral hue axis');
must(dialog, 'Pink bleibt der ersten Importspur vorbehalten', 'secondary import must not silently reuse reserved pink');
must(workflow, 'note.pendingPitchAnchor = lanePlacement?.pendingPitchAnchor === true', 'raw/material bodies must enter pending anchor state');
must(carrier, 'note.pendingPitchAnchor = pendingPitchAnchor === true', 'carrier import paths must enter pending anchor state');
must(interactions, 'MELODIC_IMPORT_PENDING_ANCHOR_HINT', 'hover/anchor interaction must use shared hint');
must(policy, "'draggen oder klicken um auf Rasterstufe zu ankern.'", 'shared hover copy must match product wording');
must(interactions, 'pitchAnchorTrackId', 'anchoring must operate on the whole imported lane');
must(interactions, 'entry.pendingPitchAnchor = false', 'click/drag must commit the anchor');
must(interactions, 'So schneiden? bleibt auf dem vorbereiteten Importkörper verriegelt.', 'cut preparation must lock its selected import body');
must(render, 'Math.sin((options.animationTimeMs ?? 0) / 170)', 'pending lane must visibly pulse');
must(effects, 'hasPendingPitchAnchor', 'render RAF must run only while an anchor is pending');
must(fragment, 'aria-label="Schnittziel"', 'cut tool must expose explicit multi-import target selection');
must(fragment, 'pendingAnchor', 'cut tool must block unanchored lanes');
must(importDialog, '>Vorläufige Startlage</div>', 'import dialog must not claim the provisional line is already the raw anchor');
must(gateway, 'useMelodicImportLanePolicyRuntime({', 'all gateway imports must share one lane policy runtime');
mustNot(workflow, "draft.notes = draft.notes.filter((note) => note.trackId !== MATERIAL_BASE_TRACK_ID)", 'material import must not replace the fixed legacy slot');
mustNot(carrier, "draft.notes = draft.notes.filter((note) => note.trackId !== CARRIER_INTEGRAL_PINK_TRACK_ID)", 'carrier import must not replace the fixed legacy slot');

console.log('[melodic-import-lane-policy-298] PASS: multi-import, color, pending anchor, blink and cut-tool policy are explicit.');
