import fs from 'node:fs';

const targetPath = 'src/features/l3lab/canonicalForge/canonicalPreviewMaterialElastic.ts';
const source = fs.readFileSync(targetPath, 'utf8');

const required = [
  {
    label: 'local field sampler holds left edge before range start',
    ok: /safeProgress\s*<=\s*start\)\s*return\s+resolvedCurve\[0\]\s*\?\?\s*0/.test(source),
  },
  {
    label: 'local field sampler holds right edge after range end',
    ok: /safeProgress\s*>=\s*end\)\s*return\s+resolvedCurve\[resolvedCurve\.length\s*-\s*1\]\s*\?\?\s*0/.test(source),
  },
  {
    label: 'local field sampler no longer returns neutral outside active range',
    ok: !/safeProgress\s*<\s*start\s*\|\|\s*safeProgress\s*>\s*end\)\s*return\s+0/.test(source),
  },
  {
    label: 'dynamic field stores final curve gain',
    ok: /const\s+finalGain\s*=\s*mapped\[mapped\.length\s*-\s*1\]\s*\?\?\s*firstGain/.test(source),
  },
  {
    label: 'dynamic field holds final curve gain at note end',
    ok: /gainNode\.gain\.setValueAtTime\(finalGain,\s*noteEnd\)/.test(source),
  },
  {
    label: 'dynamic field no longer ramps back to unity during note tail',
    ok: !/linearRampToValueAtTime\(1,\s*Math\.min\(noteEnd/.test(source),
  },
  {
    label: 'dynamic field no longer forces unity at note end',
    ok: !/setValueAtTime\(1,\s*noteEnd\)/.test(source),
  },
];

const failed = required.filter((entry) => !entry.ok);
if (failed.length) {
  console.error('[melodic-loop-dynamic-field-tail-contract] FAIL');
  for (const entry of failed) console.error(`- ${entry.label}`);
  process.exit(1);
}

console.log('[melodic-loop-dynamic-field-tail-contract] OK');
console.log(JSON.stringify({ targetPath, checked: required.map((entry) => entry.label) }, null, 2));
