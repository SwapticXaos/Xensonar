#!/usr/bin/env node
import fs from 'node:fs';

const file = 'src/features/l3lab/spectralForge/components/SpectralCanvas.tsx';
const source = fs.readFileSync(file, 'utf8');
const failures = [];

function requireText(label, needle) {
  if (!source.includes(needle)) failures.push(`${label} missing ${needle}`);
}
function forbidText(label, needle) {
  if (source.includes(needle)) failures.push(`${label} must not contain ${needle}`);
}

requireText('stable overlay latest ref', 'const renderOverlayLatestRef = useRef<() => void>(() => undefined);');
requireText('latest renderOverlay ref update', 'renderOverlayLatestRef.current = renderOverlay;');
requireText('RAF calls latest overlay renderer', 'renderOverlayLatestRef.current();');
requireText('RAF loop has active guard', 'let active = true;');
requireText('RAF cleanup stops active loop', 'active = false;');
requireText('RAF cleanup clears cursor ref', 'cursorRafRef.current = null;');
requireText('large spectral playhead paint retained', 'Playhead / scan indicator directly over the spectral image');
requireText('navigator playhead paint retained', 'const playX = playheadPosition * cw;');

forbidText(
  'playhead overlay RAF owner',
  `cursorRafRef.current = requestAnimationFrame(animate);\n    return () => {\n      if (cursorRafRef.current) cancelAnimationFrame(cursorRafRef.current);\n    };\n  }, [renderOverlay]);`,
);

if (/useEffect\(\(\) => \{\s*const animate = \(\) => \{\s*renderOverlay\(\);/s.test(source)) {
  failures.push('RAF loop must not close over renderOverlay directly; use renderOverlayLatestRef.current() instead.');
}

if (failures.length) {
  console.error('[xensonar] spectralforge playhead overlay RAF stability check: FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[xensonar] spectralforge playhead overlay RAF stability check: green');
