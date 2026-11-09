import fs from 'node:fs';

const activeRuntimePath = 'src/features/xensonar/rootFollow/rootFollowActiveVoiceRuntime.ts';
const directBodyPath = 'src/features/xensonar/rootFollow/rootFollowDirectNoteRenderBody.ts';

const activeRuntime = fs.readFileSync(activeRuntimePath, 'utf8');
const directBody = fs.readFileSync(directBodyPath, 'utf8');

const required = [
  {
    label: 'pre-start guard constant',
    ok: activeRuntime.includes('ROOT_FOLLOW_RETUNE_PRESTART_GUARD_SEC'),
  },
  {
    label: 'retune skips voices before their noteStart',
    ok: /now\s*<\s*Number\(voice\.noteStart\)\s*-\s*ROOT_FOLLOW_RETUNE_PRESTART_GUARD_SEC/.test(activeRuntime),
  },
  {
    label: 'direct voices register noteStart',
    ok: /noteStart:\s*oscStart/.test(directBody),
  },
  {
    label: 'direct voices register noteEnd',
    ok: /noteEnd:\s*oscStop/.test(directBody),
  },
  {
    label: 'direct voices seed lastAppliedRatio from initial root-follow ratio',
    ok: /lastAppliedRatio:\s*initialRootFollowRatio/.test(directBody),
  },
];

const failed = required.filter((entry) => !entry.ok);
if (failed.length) {
  console.error('[root-follow-future-voice-retune-guard] FAIL');
  for (const entry of failed) console.error(`- missing: ${entry.label}`);
  process.exit(1);
}

console.log('[root-follow-future-voice-retune-guard] OK');
console.log(JSON.stringify({
  activeRuntimePath,
  directBodyPath,
  checked: required.map((entry) => entry.label),
}, null, 2));
