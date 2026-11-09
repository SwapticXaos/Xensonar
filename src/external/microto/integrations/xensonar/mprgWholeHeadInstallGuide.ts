import type {
  MprgXensonarHeadBridgeProtocolVersion,
  MprgXensonarHeadEnvelope,
  MprgXensonarQualitySignal,
  MprgXensonarTruthClaim,
} from './mprgBridgeAdapter';

export type XensonarWholeHeadInstallArtifactKind =
  | 'xensonar-source-zip'
  | 'xensonar-core-test-html'
  | 'xensonar-full-html'
  | 'mprg-install-result-json'
  | 'unknown';

export type XensonarWholeHeadInstallCapability =
  | 'xensonar-source-tree'
  | 'vite-react-app'
  | 'microto-bridge-adapter'
  | 'material-track-domain'
  | 'root-follow-domain'
  | 'spectralforge-domain'
  | 'syntheticforge-domain'
  | 'xenpolar-domain'
  | 'audio-worklet-aware'
  | 'patch-docs-present';

export type MprgWholeHeadInstallFindingLike = {
  severity?: 'info' | 'warning' | 'error' | string;
  code?: string;
  message?: string;
  path?: string;
};

export type MprgWholeHeadInstalledPackageLike = {
  installKind?: 'xensonar-whole-head-installed-package' | string;
  installId?: string;
  status?: 'installed' | 'rejected' | string;
  archiveName?: string;
  byteLength?: number;
  entryCount?: number;
  fileCount?: number;
  directoryCount?: number;
  packageSummary?: {
    packageName?: string;
    version?: string;
    privatePackage?: boolean;
    scriptNames?: string[];
  } | null;
  detectedCapabilities?: string[];
  bridgeContract?: {
    contractKind?: string;
    version?: number;
    headRole?: string;
    executionPolicy?: string;
    truthClaims?: Record<string, unknown>;
    invariants?: Record<string, unknown>;
  };
  findings?: MprgWholeHeadInstallFindingLike[];
  archiveKey?: string;
};

export type XensonarWholeHeadInstallGuide = {
  guideKind: 'xensonar-whole-head-install-guide';
  version: 1;
  protocol: MprgXensonarHeadBridgeProtocolVersion;
  xensonarRole: 'source-zip-provider-and-cold-head-bridge';
  mprgRole: 'zip-installer-and-headless-contract-validator';
  acceptedUploadArtifacts: XensonarWholeHeadInstallArtifactKind[];
  rejectedUploadArtifacts: XensonarWholeHeadInstallArtifactKind[];
  userSteps: string[];
  expectedMprgCapabilities: XensonarWholeHeadInstallCapability[];
  safetyContracts: {
    uploadDoesNotExecuteXensonarCode: true;
    mprgInstallDoesNotProveAudioTruth: true;
    htmlBuildIsNotTheInstallArtifact: true;
    sourceZipMustContainPackageJson: true;
    sourceZipMustContainSrcTree: true;
    microtoAdapterIsSeedBodyNotWholeEngine: true;
  };
  followupPayloads: readonly ('trail-loop-body' | 'material-seed-export' | 'resonance-gate-decision' | 'dynamic-quality-pulse')[];
  guideKey: string;
};

export type XensonarWholeHeadInstallRecordSummary = {
  accepted: boolean;
  status: 'installed' | 'rejected' | 'unknown';
  installId: string | null;
  archiveName: string | null;
  packageVersion: string | null;
  capabilityCount: number;
  detectedCapabilities: string[];
  errorCodes: string[];
  warningCodes: string[];
  bridgeContractAcknowledged: boolean;
  audioTruthStillUnproven: true;
  nextUserAction: 'send-trail-loop-body' | 'fix-source-zip' | 'inspect-install-findings';
};

export type XensonarWholeHeadInstallHandshakePayload = {
  payloadKind: 'xensonar-whole-head-install-handshake';
  guide: XensonarWholeHeadInstallGuide;
  installRecord: XensonarWholeHeadInstallRecordSummary;
  readmePath: 'MPRG_XENSONAR_WHOLE_HEAD_INSTALL_README.md';
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}

function stableKey(prefix: string, value: unknown): string {
  const text = `${prefix}:${stableStringify(value)}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${prefix}_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function normalizeStatus(status: unknown): XensonarWholeHeadInstallRecordSummary['status'] {
  if (status === 'installed' || status === 'rejected') return status;
  return 'unknown';
}

function findingCodes(record: MprgWholeHeadInstalledPackageLike, severity: 'error' | 'warning'): string[] {
  return (record.findings ?? [])
    .filter((finding) => finding?.severity === severity)
    .map((finding) => finding.code ?? 'unknown-finding')
    .sort();
}

export function buildXensonarWholeHeadInstallGuide(): XensonarWholeHeadInstallGuide {
  const guideWithoutKey = {
    guideKind: 'xensonar-whole-head-install-guide' as const,
    version: 1 as const,
    protocol: 'mprg-xensonar-head-bridge/v1' as const,
    xensonarRole: 'source-zip-provider-and-cold-head-bridge' as const,
    mprgRole: 'zip-installer-and-headless-contract-validator' as const,
    acceptedUploadArtifacts: ['xensonar-source-zip'] as XensonarWholeHeadInstallArtifactKind[],
    rejectedUploadArtifacts: ['xensonar-core-test-html', 'xensonar-full-html', 'unknown'] as XensonarWholeHeadInstallArtifactKind[],
    userSteps: [
      'Use the Xensonar source ZIP artifact, not the generated HTML file.',
      'Upload that source ZIP into the mPRG Whole-Head ZIP installer.',
      'Check that mPRG reports status=installed and detects xensonar-source-tree plus microto-bridge-adapter.',
      'Treat the install as a cold bridge registration: it does not execute Xensonar code and does not prove audio truth.',
      'After install, send mPRG TrailLoopBody or Whole-Head bridge envelopes back into Xensonar via the existing mPRG→Microto seed adapter.',
    ],
    expectedMprgCapabilities: [
      'xensonar-source-tree',
      'vite-react-app',
      'microto-bridge-adapter',
      'material-track-domain',
      'root-follow-domain',
      'spectralforge-domain',
      'syntheticforge-domain',
      'audio-worklet-aware',
      'patch-docs-present',
    ] as XensonarWholeHeadInstallCapability[],
    safetyContracts: {
      uploadDoesNotExecuteXensonarCode: true as const,
      mprgInstallDoesNotProveAudioTruth: true as const,
      htmlBuildIsNotTheInstallArtifact: true as const,
      sourceZipMustContainPackageJson: true as const,
      sourceZipMustContainSrcTree: true as const,
      microtoAdapterIsSeedBodyNotWholeEngine: true as const,
    },
    followupPayloads: ['trail-loop-body', 'material-seed-export', 'resonance-gate-decision', 'dynamic-quality-pulse'] as const,
  };
  return {
    ...guideWithoutKey,
    guideKey: stableKey('xensonar_whole_head_install_guide', guideWithoutKey),
  };
}

export function summarizeMprgWholeHeadInstallRecord(
  record: MprgWholeHeadInstalledPackageLike | null | undefined,
): XensonarWholeHeadInstallRecordSummary {
  if (!record) {
    return {
      accepted: false,
      status: 'unknown',
      installId: null,
      archiveName: null,
      packageVersion: null,
      capabilityCount: 0,
      detectedCapabilities: [],
      errorCodes: ['missing-install-record'],
      warningCodes: [],
      bridgeContractAcknowledged: false,
      audioTruthStillUnproven: true,
      nextUserAction: 'inspect-install-findings',
    };
  }
  const status = normalizeStatus(record.status);
  const detectedCapabilities = [...(record.detectedCapabilities ?? [])].sort();
  const errorCodes = findingCodes(record, 'error');
  const warningCodes = findingCodes(record, 'warning');
  const bridgeContractAcknowledged = record.bridgeContract?.contractKind === 'xensonar-whole-head-bridge-contract'
    && record.bridgeContract?.executionPolicy === 'no-code-execution-during-install';
  const accepted = status === 'installed' && errorCodes.length === 0 && bridgeContractAcknowledged;
  return {
    accepted,
    status,
    installId: typeof record.installId === 'string' ? record.installId : null,
    archiveName: typeof record.archiveName === 'string' ? record.archiveName : null,
    packageVersion: record.packageSummary?.version ?? null,
    capabilityCount: detectedCapabilities.length,
    detectedCapabilities,
    errorCodes,
    warningCodes,
    bridgeContractAcknowledged,
    audioTruthStillUnproven: true,
    nextUserAction: accepted ? 'send-trail-loop-body' : errorCodes.length > 0 ? 'fix-source-zip' : 'inspect-install-findings',
  };
}

export function buildXensonarWholeHeadInstallHandshakeEnvelope(
  record: MprgWholeHeadInstalledPackageLike | null | undefined,
  options: { sequence?: number; tick?: number; sourceModule?: string } = {},
): MprgXensonarHeadEnvelope {
  const guide = buildXensonarWholeHeadInstallGuide();
  const installRecord = summarizeMprgWholeHeadInstallRecord(record);
  const payload: XensonarWholeHeadInstallHandshakePayload = {
    payloadKind: 'xensonar-whole-head-install-handshake',
    guide,
    installRecord,
    readmePath: 'MPRG_XENSONAR_WHOLE_HEAD_INSTALL_README.md',
  };
  const truthClaim: MprgXensonarTruthClaim = {
    headlessTruth: false,
    audioTruth: false,
    uiTruth: false,
    gameplayTruth: false,
    dynamicCandidateOnly: false,
  };
  const qualitySignals: MprgXensonarQualitySignal[] = [
    {
      sourceModule: options.sourceModule ?? 'xensonar/microto/mprgWholeHeadInstallGuide',
      level: 'social',
      realityMode: 'projected',
      kind: installRecord.accepted ? 'install-contract-accepted' : 'install-contract-needs-attention',
      magnitude: installRecord.accepted ? 0.82 : 0.38,
      concerns: ['whole-head-install', 'truth-boundary', 'user-next-step'],
      allowedAuthority: 'advisory',
      evidence: 'mPRG-install-record',
    },
    {
      sourceModule: options.sourceModule ?? 'xensonar/microto/mprgWholeHeadInstallGuide',
      level: 'intellectual',
      realityMode: 'simulated',
      kind: 'no-audio-truth-claim',
      magnitude: 1,
      concerns: ['headless-vs-audio-truth', 'bridge-contract'],
      allowedAuthority: 'observe-only',
      evidence: 'static-bridge-contract',
    },
  ];
  return {
    protocol: 'mprg-xensonar-head-bridge/v1',
    direction: 'xensonar-head-to-mprg',
    sequence: options.sequence,
    tick: options.tick,
    sourceModule: options.sourceModule ?? 'xensonar/microto/mprgWholeHeadInstallGuide',
    payloadKind: 'whole-head-install-handshake',
    payload,
    truthClaim,
    qualitySignals,
    requestedAuthority: ['observe-only', 'advisory'],
    envelopeKey: stableKey('xensonar_whole_head_install_handshake', payload),
  };
}

export function buildXensonarWholeHeadInstallReadme(): string {
  return `# mPRG ⇄ Xensonar Whole-Head ZIP Installation\n\nThis Xensonar build is prepared as a cold Whole-Head bridge target for mPRG.\n\n## What to upload\n\nUpload the **source ZIP** artifact into the mPRG Whole-Head ZIP installer. Do not upload the generated HTML file.\n\nUse a file named like:\n\n\`Xensonar_3.2.91.7.5.50_mprg_whole_head_install_receiver_source.zip\`\n\nDo **not** use:\n\n- \`*_core_test.html\`\n- a full single-file HTML build\n- an arbitrary exported workspace package\n\n## What mPRG should report\n\nThe mPRG installer should show \`status: installed\` and should detect at least:\n\n- \`xensonar-source-tree\`\n- \`vite-react-app\`\n- \`microto-bridge-adapter\`\n\nAdditional capabilities such as Root Follow, Materialspur, SpectralForge, SyntheticForge, Worklet-awareness and patch docs are useful, but they are not an audio proof.\n\n## What this does not mean\n\nInstallation is only a cold registration and contract handshake. It does not execute Xensonar code inside mPRG. It does not prove that Xensonar audio works inside mPRG. It does not activate Root Follow, Wellenstarter or SpectralForge.\n\n## What to do after install\n\nAfter mPRG accepts the ZIP, send TrailLoopBody or Whole-Head bridge envelopes into Xensonar's existing mPRG→Microto seed adapter. Xensonar can then translate carrier, impulse, anchor and threshold lanes into a Microto/Melodic-Loop seed while keeping the anti-whoop and nested-tuning contracts visible.\n\n## Truth boundary\n\n- Headless mPRG install = structural/install truth.\n- Xensonar audio truth = must still be tested in Xensonar.\n- Microto = seed-body adapter, not the whole mPRG engine.\n- Motion/Carrier movement does not automatically mean sound attack.\n`;
}
