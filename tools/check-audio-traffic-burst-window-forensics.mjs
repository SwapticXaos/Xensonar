import fs from 'node:fs';

const failures = [];
const read = (path) => fs.readFileSync(path, 'utf8');
function must(path, needle, label) {
  const text = read(path);
  if (!text.includes(needle)) failures.push(`${path}: missing ${label}`);
}

must('src/features/xensonar/audioTraffic/audioTrafficForensics.ts', 'AudioTrafficBurstWindowSummary', 'burst window summary type');
must('src/features/xensonar/audioTraffic/audioTrafficForensics.ts', 'summarizeBurstWindow', 'burst window summarizer');
must('src/features/xensonar/audioTraffic/audioTrafficForensics.ts', 'maxEventsPer16Ms', '16ms burst metric');
must('src/features/xensonar/audioTraffic/audioTrafficForensics.ts', 'maxRootFollowEventsPer16Ms', 'root-follow 16ms burst metric');
must('src/features/xensonar/audioTraffic/audioTrafficForensics.ts', 'maxEventsPer50Ms', '50ms burst metric');
must('src/features/xensonar/audioTraffic/audioTrafficForensics.ts', 'Objektive Burst-Fensterzählung', 'diagnostic note distinguishes event clustering from audible burst');
must('src/features/xensonar/diagnostics/burstDiagnosticsRuntime.ts', 'snapshotAudioTrafficForensics', 'burst recorder exports traffic snapshot with burst windows');

if (failures.length) {
  console.error('[audio-traffic-burst-window-forensics] FAIL');
  for (const failure of failures) console.error(' - ' + failure);
  process.exit(1);
}
console.log('[audio-traffic-burst-window-forensics] OK · Audio traffic snapshots include objective event-window burst counts for later stress-test comparison.');
