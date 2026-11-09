import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const browserProbePath = path.join(root, 'tools/check-stable-lane-browser-sab-readiness.mjs');
const perfPanelPath = path.join(root, 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx');
const readinessPath = path.join(root, 'src/features/xensonar/rootFollow/rootFollowSharedArrayBufferReadiness.ts');
const packagePath = path.join(root, 'package.json');

const missing = [];
if (!fs.existsSync(browserProbePath)) missing.push('missing tools/check-stable-lane-browser-sab-readiness.mjs');

const browserProbe = fs.existsSync(browserProbePath) ? fs.readFileSync(browserProbePath, 'utf8') : '';
const perfPanel = fs.readFileSync(perfPanelPath, 'utf8');
const readiness = fs.readFileSync(readinessPath, 'utf8');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

const requiredProbeMarkers = [
  'remote-debugging-port',
  'Cross-Origin-Opener-Policy',
  'Cross-Origin-Embedder-Policy',
  'Target.createTarget',
  'Runtime.evaluate',
  'Management anzeigen',
  'SAB-Readiness',
  'stable-lane-browser-sab-readiness.json',
  'not-in-browser-runtime',
  'Browser UI SAB-Readiness',
  'browser-navigation-blocked-by-policy',
  'strict-ui',
];
const requiredUiMarkers = [
  'WindowWithXensonarStableLaneSabReadiness',
  '__XENSONAR_STABLE_LANE_SAB_READINESS__',
  'detectStableLaneSabTransportReadiness()',
  'data-root-follow-live-sab-readiness',
];
const requiredReadinessMarkers = [
  "reason = 'cross-origin-isolation-missing'",
  "reason = 'shared-array-buffer-missing'",
];

for (const marker of requiredProbeMarkers) if (!browserProbe.includes(marker)) missing.push(`browser probe missing ${marker}`);
for (const marker of requiredUiMarkers) if (!perfPanel.includes(marker)) missing.push(`ui missing ${marker}`);
for (const marker of requiredReadinessMarkers) if (!readiness.includes(marker)) missing.push(`readiness missing ${marker}`);

if (!pkg.scripts?.['xensonar:check-stable-lane-browser-sab-readiness']) missing.push('package script xensonar:check-stable-lane-browser-sab-readiness missing');

const crossOriginIndex = readiness.indexOf("reason = 'cross-origin-isolation-missing'");
const sharedArrayBufferIndex = readiness.indexOf("reason = 'shared-array-buffer-missing'");
if (crossOriginIndex < 0 || sharedArrayBufferIndex < 0 || crossOriginIndex > sharedArrayBufferIndex) {
  missing.push('readiness reason order should prefer cross-origin-isolation-missing before shared-array-buffer-missing');
}

if (browserProbe.includes('playwright') || browserProbe.includes('puppeteer')) {
  missing.push('browser probe should use installed Chromium/CDP directly, not add Playwright/Puppeteer dependency');
}

if (missing.length) {
  console.error('[check-stable-lane-browser-sab-readiness-contract] FAIL');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('[check-stable-lane-browser-sab-readiness-contract] OK: browser-visible SAB-readiness probe is wired and guards against unknown/not-in-browser-runtime UI results.');
