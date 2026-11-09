import fs from 'node:fs';

const file = 'src/features/xensonar/rooms/ResonanceGrooveBassPanel.tsx';
const src = fs.readFileSync(file, 'utf8');
const importLine = src.split('\n').find((line) => line.includes("from 'react'")) || '';
const requiredHooks = ['useEffect', 'useMemo', 'useRef', 'useState'];
for (const hook of requiredHooks) {
  if (src.includes(`${hook}(`) && !importLine.includes(hook)) {
    throw new Error(`${file}: ${hook} is used but not imported from react`);
  }
}
if (!src.includes('function BassPatternManagerDialog')) {
  throw new Error(`${file}: BassPatternManagerDialog missing`);
}
if (!src.includes('function BassPatternBodyPreview')) {
  throw new Error(`${file}: BassPatternBodyPreview missing`);
}
console.log('[check-bass-workbench-runtime-imports] OK');
