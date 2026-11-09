import fs from 'node:fs';

const failures = [];
const read = (path) => fs.readFileSync(path, 'utf8');
function must(path, needle, label) {
  const text = read(path);
  if (!text.includes(needle)) failures.push(`${path}: missing ${label}`);
}

must('src/features/xensonar/audioTraffic/audioTrafficForensics.ts', 'AudioStressComparisonSnapshot', 'stress comparison snapshot type');
must('src/features/xensonar/audioTraffic/audioTrafficForensics.ts', 'summarizeAudioStressComparison', 'stress comparison summarizer');
must('src/features/xensonar/audioTraffic/audioTrafficForensics.ts', 'burstRiskScore', 'risk score metric');
must('src/features/xensonar/audioTraffic/audioTrafficForensics.ts', 'rootFollowVoiceEngineMode', 'voice engine mode extraction');
must('src/features/xensonar/audioTraffic/audioTrafficForensics.ts', 'workletPilotHealth', 'worklet health extraction');
must('src/features/xensonar/audioTraffic/audioTrafficForensics.ts', 'primaryCandidateMuteEvents', 'primary candidate fallback metric');
must('src/features/xensonar/audioTraffic/audioTrafficForensics.ts', 'Stress-Vergleichszeile', 'truth note distinguishing objective comparison from subjective audio');
must('src/features/xensonar/rooms/ResonanceBurstDiagnosticsPanel.tsx', 'data-audio-stress-comparison-harness="burst-window-dashboard"', 'visible stress dashboard hook');
must('src/features/xensonar/rooms/ResonanceBurstDiagnosticsPanel.tsx', 'Burstfenster 16 ms', '16ms burst display');
must('src/features/xensonar/rooms/ResonanceBurstDiagnosticsPanel.tsx', 'Primary-Mutes', 'primary candidate mute display');
must('tools/analyze-xensonar-burst-log.mjs', 'analyze-xensonar-burst-log', 'offline burst log analyzer');
must('tools/analyze-xensonar-burst-log.mjs', 'byEngine', 'engine-grouped comparison output');
must('package.json', 'xensonar:analyze-burst-log', 'package script for offline analyzer');
must('package.json', 'xensonar:check-audio-stress-comparison-harness', 'package script for harness guard');

if (failures.length) {
  console.error('[audio-stress-comparison-harness] FAIL');
  for (const failure of failures) console.error(' - ' + failure);
  process.exit(1);
}
console.log('[audio-stress-comparison-harness] OK · Burst logs now expose objective stress comparison rows for Legacy/Pilot/Primary-Candidate runs.');
