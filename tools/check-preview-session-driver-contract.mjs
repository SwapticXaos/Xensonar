import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const typePath = path.join(root, 'src/features/l3lab/spectralForge/components/previewSession/spectralForgePreviewSessionTypes.ts');
const hookPath = path.join(root, 'src/features/l3lab/spectralForge/components/previewSession/useSpectralForgePreviewSession.ts');
const types = fs.readFileSync(typePath, 'utf8');
const hook = fs.readFileSync(hookPath, 'utf8');

const requiredTypeNeedles = [
  'export type SpectralForgePreviewRequest =',
  'identity: SpectralForgePreviewRequestIdentity',
  'reason: string',
  'loopPreview: boolean',
  'createdAt: number',
  'export function createSpectralForgePreviewRequest',
];

const requiredHookNeedles = [
  'export type SpectralForgePreviewSessionDriver =',
  'getCurrentRequest:',
  'schedule: (request: SpectralForgePreviewRequest)',
  'beginPrewarm: (request: SpectralForgePreviewRequest)',
  'markReady: (request: SpectralForgePreviewRequest, cacheHit: boolean)',
  'canPlay: (request: SpectralForgePreviewRequest)',
  'const currentRequestRef = useRef<SpectralForgePreviewRequest | null>(null)',
  'useMemo<SpectralForgePreviewSessionDriver>',
  'previewSessionDriver,',
];

const missing = [];
for (const needle of requiredTypeNeedles) {
  if (!types.includes(needle)) missing.push(`types: ${needle}`);
}
for (const needle of requiredHookNeedles) {
  if (!hook.includes(needle)) missing.push(`hook: ${needle}`);
}
if (!/reportProgress:\s*\(\s*request:\s*SpectralForgePreviewRequest,\s*progress:\s*number,?\s*\)\s*=>/.test(hook)) {
  missing.push('hook: typed reportProgress driver method');
}
if (!/const\s+previewSessionDriver\s*=\s*useMemo<SpectralForgePreviewSessionDriver>\(\s*\(\)\s*=>\s*\(\{/.test(hook)) {
  missing.push('hook: memoized previewSessionDriver object');
}

if (hook.includes('schedule: (requestKey: string') || hook.includes('beginPrewarm: (requestKey: string')) {
  missing.push('driver API must not expose loose requestKey-only schedule/beginPrewarm methods');
}

if (missing.length) {
  console.error('[check-preview-session-driver-contract] FAILED');
  for (const item of missing) console.error(` - ${item}`);
  process.exit(1);
}

console.log('[check-preview-session-driver-contract] OK');
