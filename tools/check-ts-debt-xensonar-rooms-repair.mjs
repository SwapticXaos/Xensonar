#!/usr/bin/env node
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(p, 'utf8');
const checks = [];
const add = (name, ok, detail='') => checks.push({ name, ok, detail });
const canonical = read('src/features/l3lab/canonicalForge/CanonicalForgeRoom.tsx');
const config = read('src/features/l3lab/canonicalForge/useCanonicalMicrotonalWorkspaceConfig.ts');
const history = read('src/features/l3lab/canonicalForge/canonicalHistoryController.ts');
const microtoRoom = read('src/external/microto/game/jumpRunSoundtrack/JumpRunSoundtrackRoom.tsx');
add('canonical room dead-return-surface acknowledged', canonical.includes('void [') && canonical.includes('handleLoopComposerExportToForge2') && canonical.includes('removeSelectedMaterial'));
add('microtonal workspace config has compat membrane', config.includes('Record<string, unknown>') && config.includes('composeMicrotonalLogicWorkspaceProps'));
add('history controller uses Float32Array warp refs', history.includes('MutableRefObject<Float32Array | null>') && history.includes('args.applyWarpSnapshot({ time, pitch })'));
add('platformer preview setter is typed-adapted', microtoRoom.includes('setComposerPreview: (preview: unknown) => setComposerPreview(preview as PlatformerComposerPreview)'));
const failed = checks.filter((c) => !c.ok);
console.log(JSON.stringify({ ok: failed.length === 0, checks }, null, 2));
if (failed.length) process.exit(1);
