import { describe, expect, it } from 'vitest';
import {
  buildXensonarWholeHeadInstallGuide,
  buildXensonarWholeHeadInstallHandshakeEnvelope,
  buildXensonarWholeHeadInstallReadme,
  summarizeMprgWholeHeadInstallRecord,
} from './mprgWholeHeadInstallGuide';

function installedRecord() {
  return {
    installKind: 'xensonar-whole-head-installed-package',
    installId: 'xen-install-1',
    status: 'installed',
    archiveName: 'Xensonar_3.2.91.7.5.50_source.zip',
    packageSummary: { packageName: 'react-vite-tailwind', version: '3.2.91.7.5.50', privatePackage: true, scriptNames: ['build'] },
    detectedCapabilities: ['vite-react-app', 'xensonar-source-tree', 'microto-bridge-adapter'],
    bridgeContract: { contractKind: 'xensonar-whole-head-bridge-contract', executionPolicy: 'no-code-execution-during-install' },
    findings: [],
  };
}

describe('mPRG Whole-Head install guide for Xensonar', () => {
  it('explains that the source ZIP is the install artifact, not the HTML', () => {
    const guide = buildXensonarWholeHeadInstallGuide();
    expect(guide.acceptedUploadArtifacts).toEqual(['xensonar-source-zip']);
    expect(guide.rejectedUploadArtifacts).toContain('xensonar-core-test-html');
    expect(guide.safetyContracts.htmlBuildIsNotTheInstallArtifact).toBe(true);
    expect(guide.safetyContracts.mprgInstallDoesNotProveAudioTruth).toBe(true);
    expect(guide.expectedMprgCapabilities).toContain('microto-bridge-adapter');
    expect(guide.guideKey).toMatch(/^xensonar_whole_head_install_guide_/);
  });

  it('summarizes an accepted mPRG install record without promoting it to audio truth', () => {
    const summary = summarizeMprgWholeHeadInstallRecord(installedRecord());
    expect(summary.accepted).toBe(true);
    expect(summary.packageVersion).toBe('3.2.91.7.5.50');
    expect(summary.bridgeContractAcknowledged).toBe(true);
    expect(summary.audioTruthStillUnproven).toBe(true);
    expect(summary.nextUserAction).toBe('send-trail-loop-body');
  });

  it('builds a cold handshake envelope for mPRG after ZIP install', () => {
    const envelope = buildXensonarWholeHeadInstallHandshakeEnvelope(installedRecord(), { sequence: 7, tick: 12 });
    expect(envelope.protocol).toBe('mprg-xensonar-head-bridge/v1');
    expect(envelope.direction).toBe('xensonar-head-to-mprg');
    expect(envelope.payloadKind).toBe('whole-head-install-handshake');
    expect(envelope.truthClaim?.audioTruth).toBe(false);
    expect(envelope.qualitySignals?.some((signal) => signal.kind === 'no-audio-truth-claim')).toBe(true);
  });

  it('marks rejected installs as user-fixable source ZIP problems', () => {
    const summary = summarizeMprgWholeHeadInstallRecord({
      status: 'rejected',
      findings: [{ severity: 'error', code: 'missing-xensonar-source-tree', message: 'no src tree' }],
    });
    expect(summary.accepted).toBe(false);
    expect(summary.errorCodes).toContain('missing-xensonar-source-tree');
    expect(summary.nextUserAction).toBe('fix-source-zip');
  });

  it('contains the user-facing install instructions as markdown', () => {
    const readme = buildXensonarWholeHeadInstallReadme();
    expect(readme).toContain('Upload the **source ZIP**');
    expect(readme).toContain('Do not upload the generated HTML file');
    expect(readme).toContain('does not prove that Xensonar audio works inside mPRG');
  });
});
