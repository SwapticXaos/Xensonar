import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const fail = (message) => {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
};
const pass = (message) => console.log(`PASS: ${message}`);

const graph = read("src/features/xensonar/audio/waveStarterGradientToneGraph.ts");
const playback = read("src/features/xensonar/audio/waveStarterGradientTonePlayback.ts");
const attack = read("src/features/xensonar/audio/waveStarterEmitAttackBoundary.ts");
const engine = read("src/core/audio/xensonarMicrotonalSoundEngine.ts");

if (/resolveXensonarMicrotonalVoice|estimateEntrophonWaveVoiceDemand|getEntrophonSurfaceSoundConfig/.test(graph)) {
  fail("Classic gradient graph must not resolve or clone Entrophon state.");
} else pass("Classic gradient graph contains no Entrophon resolver/config work.");

for (const needle of [
  "osc.type = waveform",
  "osc.frequency.setValueAtTime(toneFreq, now)",
  "dryFilter.frequency.setValueAtTime(shapedCutoff, now)",
  "dryFilter.Q.setValueAtTime(shapedResonance, now)",
  "dryMaster.gain.linearRampToValueAtTime(coreLevel, corePeakAt)",
]) {
  if (!graph.includes(needle)) fail(`Classic graph is missing 90.61/6.8.7 anchor: ${needle}`);
}
if (!process.exitCode) pass("Classic graph keeps the 90.61/6.8.7 direct parameter anchors.");

if (
  !playback.includes("const entrophonWaveActive = args.entrophonWaveActive ?? isEntrophonWaveVoiceActive()") ||
  !playback.includes("gradientShape.useScheduledTonePath || entrophonWaveActive")
) {
  fail("Entrophon-active voices must still leave the classic graph for the scheduled live voice path.");
} else pass("Entrophon-active routing remains on the live scheduled voice path.");

const directStart = attack.indexOf("function emitWaveStarter9061DirectAttack");
const directEnd = attack.indexOf("export function emitWaveStarterAttack", directStart);
const direct = attack.slice(directStart, directEnd > directStart ? directEnd : attack.length);
const sampleStart = direct.indexOf("if (isSampleSelection)");
const sampleEnd = direct.indexOf("const resolvedWavePreset", sampleStart);
const sampleBranch = direct.slice(sampleStart, sampleEnd);
if (/acquireWaveStarterSampleVoice|acquireTransientPlaybackLease|beginTransientEvent|acquireVoice\s*:/.test(sampleBranch)) {
  fail("90.61 direct sample branch must not allocate generic transient voice leases.");
} else pass("90.61 direct sample branch has no generic transient lease.");

const activePos = direct.indexOf("const entrophonWaveActive = isEntrophonWaveVoiceActive()");
const demandPos = direct.indexOf("? estimateEntrophonWaveVoiceDemand()")
if (activePos < sampleEnd || demandPos < sampleEnd) {
  fail("Entrophon state/demand is still resolved before the direct sample early-return.");
} else pass("Direct sample early-return happens before Entrophon state/demand work.");
if (!direct.includes("entrophonWaveActive,")) {
  fail("Direct partials must reuse the once-per-attack Entrophon active flag.");
} else pass("Direct partials reuse one Entrophon active flag per attack.");

if (!engine.includes("const cfg = readEntrophonSurfaceSoundConfig('wave');")) {
  fail("Entrophon hot checks must use the non-cloning internal config read.");
} else pass("Entrophon wave hot checks use non-cloning config reads.");
if (!engine.includes("if (!active) return ENTROPHON_WAVE_INACTIVE_DEMAND;")) {
  fail("Entrophon OFF demand should return the shared inactive object without per-hit allocation.");
} else pass("Entrophon OFF demand uses a shared allocation-free result.");

if (!process.exitCode) console.log("PASS: 317 Wellenstarter classic hotpath budget contract satisfied.");
