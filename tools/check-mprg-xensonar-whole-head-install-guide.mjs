import fs from 'node:fs';

const required = [
  ['MPRG_XENSONAR_WHOLE_HEAD_INSTALL_README.md', [
    'Upload the **source ZIP**',
    'Do **not** upload',
    'does not prove Xensonar audio truth',
    'TrailLoopBody',
    'Microto is a seed-body adapter',
  ]],
  ['public/mprg-xensonar-whole-head-bridge.json', [
    'mprg-xensonar-whole-head-install-manifest',
    'mprg-xensonar-head-bridge/v1',
    'mprgWholeHeadInstallGuide.ts',
    'microtoIsSeedBodyAdapterNotWholeEngine',
  ]],
  ['src/external/microto/integrations/xensonar/mprgWholeHeadInstallGuide.ts', [
    'buildXensonarWholeHeadInstallGuide',
    'summarizeMprgWholeHeadInstallRecord',
    'buildXensonarWholeHeadInstallHandshakeEnvelope',
    'buildXensonarWholeHeadInstallReadme',
    'htmlBuildIsNotTheInstallArtifact',
    'audioTruthStillUnproven',
    "payloadKind: 'whole-head-install-handshake'",
  ]],
  ['src/external/microto/integrations/xensonar/mprgBridgeAdapter.ts', [
    "| 'whole-head-install-handshake'",
    "| 'zip-autoinstall-request'",
  ]],
];

let ok = true;
for (const [file, needles] of required) {
  if (!fs.existsSync(file)) {
    console.error(`[mprg-xensonar-whole-head-install-guide] missing file ${file}`);
    ok = false;
    continue;
  }
  const text = fs.readFileSync(file, 'utf8');
  for (const needle of needles) {
    if (!text.includes(needle)) {
      console.error(`[mprg-xensonar-whole-head-install-guide] missing ${needle} in ${file}`);
      ok = false;
    }
  }
}
if (!ok) process.exit(1);
console.log('[mprg-xensonar-whole-head-install-guide] OK: Xensonar source ZIP install guide + cold handshake receiver contract present.');
