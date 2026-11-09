import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const serverPath = path.join(root, 'tools/serve-xensonar-coop-coep-html.mjs');
const packagePath = path.join(root, 'package.json');
const readinessPath = path.join(root, 'src/features/xensonar/rootFollow/rootFollowSharedArrayBufferReadiness.ts');
const patchNotesPath = path.join(root, 'docs/PATCH_NOTES_3.2.91.6.9.131_stable_lane_coop_coep_testserver_harness.md');

const missing = [];

if (!fs.existsSync(serverPath)) missing.push('missing tools/serve-xensonar-coop-coep-html.mjs');
if (!fs.existsSync(patchNotesPath)) missing.push('missing patch notes for 9.131');

const server = fs.existsSync(serverPath) ? fs.readFileSync(serverPath, 'utf8') : '';
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const readiness = fs.readFileSync(readinessPath, 'utf8');
const notes = fs.existsSync(patchNotesPath) ? fs.readFileSync(patchNotesPath, 'utf8') : '';

const requiredServerMarkers = [
  "Cross-Origin-Opener-Policy', 'same-origin'",
  "Cross-Origin-Embedder-Policy', 'require-corp'",
  "Cross-Origin-Resource-Policy', 'same-origin'",
  "Origin-Agent-Cluster', '?1'",
  'no-store',
  '__xensonar_coop_coep_probe.json',
  'localhost as secure',
  'safeResolveRequestPath',
  'fs.createReadStream',
  'mimeTypes',
];

const requiredPackageScripts = [
  'xensonar:serve-sab-readiness-html',
  'patch:serve:sab-readiness',
  'xensonar:check-stable-lane-coop-coep-testserver-harness',
];

const requiredReadinessMarkers = [
  'detectStableLaneSabTransportReadiness',
  'stableLaneSabTransportCrossOriginIsolated',
  'stableLaneSabTransportSecureContext',
  'stableLaneSabTransportSingleFileHtmlLikelyBlocked',
];

const requiredNotesMarkers = [
  '3.2.91.6.9.131_stable_lane_coop_coep_testserver_harness',
  'patch:serve:sab-readiness',
  'Cross-Origin-Opener-Policy: same-origin',
  'Cross-Origin-Embedder-Policy: require-corp',
  'message-port bleibt aktives Backend',
];

for (const marker of requiredServerMarkers) {
  if (!server.includes(marker)) missing.push(`server missing ${marker}`);
}
for (const scriptName of requiredPackageScripts) {
  if (!pkg.scripts?.[scriptName]) missing.push(`package.json missing script ${scriptName}`);
}
for (const marker of requiredReadinessMarkers) {
  if (!readiness.includes(marker)) missing.push(`readiness contract missing ${marker}`);
}
for (const marker of requiredNotesMarkers) {
  if (!notes.includes(marker)) missing.push(`patch notes missing ${marker}`);
}

const forbiddenMarkers = [
  "STABLE_LANE_PLAN_TRANSPORT_ACTIVE_BACKEND_KIND: StableLanePlanTransportBackendKind = 'sab-ringbuffer'",
  "preferredBackendKind: 'sab-ringbuffer'",
];
for (const marker of forbiddenMarkers) {
  if (server.includes(marker) || readiness.includes(marker)) missing.push(`forbidden SAB activation marker present ${marker}`);
}

if (missing.length) {
  console.error('[check-stable-lane-coop-coep-testserver-harness] FAIL');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('[check-stable-lane-coop-coep-testserver-harness] OK: local COOP/COEP SAB-readiness server harness exists, scripts are wired, and sab-ringbuffer remains inactive.');
