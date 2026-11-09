#!/usr/bin/env node
import fs from 'node:fs';

const hook = fs.readFileSync('src/features/l3lab/spectralForge/components/previewSession/useSpectralForgePreviewSession.ts', 'utf8');
const transport = fs.readFileSync('src/features/l3lab/spectralForge/components/TransportBar.tsx', 'utf8');

function must(source, needle, label) {
  if (!source.includes(needle)) throw new Error(`missing ${label}: ${needle}`);
}
function mustNot(source, needle, label) {
  if (source.includes(needle)) throw new Error(`forbidden ${label}: ${needle}`);
}

if (!/import \{[^}]*useMemo[^}]*\} from ['\"]react['\"];/.test(hook)) { throw new Error('missing useMemo import in preview session hook'); }
must(hook, 'const getCurrentRequest = useCallback(() => currentRequestRef.current, []);', 'stable getCurrentRequest callback');
if (!/const\s+previewSessionDriver\s*=\s*useMemo<SpectralForgePreviewSessionDriver>\(\s*\(\)\s*=>\s*\(\{/.test(hook)) { throw new Error('missing memoized driver object'); }
must(hook, 'getCurrentRequest,', 'driver dependency includes stable getCurrentRequest');
must(hook, 'scheduleRequest,', 'driver dependency includes scheduleRequest');
mustNot(hook, 'const previewSessionDriver = {', 'unmemoized driver object literal');

must(transport, 'previewSessionDriver,', 'TransportBar consumes driver identity');
must(transport, 'runSerialAfterPaintPreviewRender', 'TransportBar has serial prewarm callback protected by stable deps');

console.log('[check-preview-session-driver-identity-stability] OK');
