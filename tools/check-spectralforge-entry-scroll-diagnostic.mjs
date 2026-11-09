#!/usr/bin/env node
import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function expect(condition, message) {
  if (!condition) {
    console.error(`[spectralforge-entry-scroll-diagnostic] FAIL: ${message}`);
    process.exitCode = 1;
  }
}
function includes(file, needle, label = needle) {
  const content = read(file);
  expect(content.includes(needle), `${file} should include ${label}`);
}

const entryScrollFile = 'src/features/l3lab/materialIntake/entryScroll.ts';
const intakeFile = 'src/features/l3lab/materialIntake/MaterialIntakePanel.tsx';
const entryGatewayFile = 'src/features/l3lab/materialIntake/useMaterialIntakeEntryGateway.ts';
const appFile = 'src/App.tsx';

const entryScroll = read(entryScrollFile);
const intake = read(intakeFile);
const entryGateway = read(entryGatewayFile);
const app = read(appFile);

includes(entryScrollFile, 'SpectralForgeEntryScrollDiagnosticState', 'typed diagnostic state');
expect(/version:\s*'3\.2\.91\.5\.\d+'/.test(entryScroll), `${entryScrollFile} should include a current diagnostic version marker`);
expect(!entryScroll.includes("version: '3.2.91.5.18'"), `${entryScrollFile} should not be pinned to the stale 3.2.91.5.18 diagnostic version`);
includes(entryScrollFile, 'events: SpectralForgeEntryScrollDiagnosticEntry[]', 'bounded diagnostic event timeline');
includes(entryScrollFile, 'latestByToken', 'latest diagnostic event keyed by token');
includes(entryScrollFile, 'MAX_DIAGNOSTIC_EVENTS = 80', 'bounded timeline size');
includes(entryScrollFile, 'recordSpectralForgeEntryScrollDiagnostic', 'central diagnostic recorder');
includes(entryScrollFile, 'lastOutcome', 'last scroll outcome retained');
includes(entryScrollFile, 'visibleRatio', 'visibility ratio in scroll outcome');
includes(entryScrollFile, 'scrollTopBefore', 'pre-scroll metric');
includes(entryScrollFile, 'scrollTopAfter', 'post-scroll metric');
includes(entryScrollFile, 'targetTopInWindowBefore', 'pre-scroll target window metric');
includes(entryScrollFile, 'targetTopInWindowAfter', 'post-scroll target window metric');
includes(entryScrollFile, 'scrollerOverflowY', 'scroll layer overflow diagnostic');
includes(entryScrollFile, 'scrollerScrollHeight', 'scroll height diagnostic');
includes(entryScrollFile, 'scrollerClientHeight', 'client height diagnostic');
includes(entryScrollFile, "phase: 'target-found'", 'target-found diagnostic event');
includes(entryScrollFile, "phase: 'target-missing'", 'target-missing diagnostic event');
includes(entryScrollFile, "phase: 'scroll-attempt'", 'scroll-attempt diagnostic event');
includes(entryScrollFile, "phase: 'scroll-applied'", 'scroll-applied diagnostic event');

includes(entryGatewayFile, 'entryScrollAttemptRef', 'scroll attempt counter');
includes(entryGatewayFile, "phase: 'intent-seen'", 'intent-seen diagnostic event');
includes(entryGatewayFile, "phase: 'intent-pending'", 'intent-pending diagnostic event');
includes(entryGatewayFile, "phase: 'intent-scheduled'", 'intent-scheduled diagnostic event');
includes(entryGatewayFile, "phase: 'load-started'", 'load-started diagnostic event');
includes(entryGatewayFile, "phase: 'load-finished'", 'load-finished diagnostic event');
includes(entryGatewayFile, "phase: 'external-load-consumed'", 'external-load-consumed diagnostic event');
includes(entryGatewayFile, "phase: 'load-cancelled'", 'load-cancelled diagnostic event');
includes(entryGatewayFile, "phase: 'intent-consumed'", 'intent-consumed diagnostic event');
includes(entryGatewayFile, "phase: 'intent-still-pending'", 'intent-still-pending diagnostic event');
includes(entryGatewayFile, 'file/origin cleanup acknowledged separately from entry-scroll intent consumption', 'separate file cleanup note');

const externalConsumedIndex = entryGateway.indexOf('onExternalLoadConsumedRef.current?.()');
const entryConsumedIndex = entryGateway.indexOf('onEntryScrollIntentConsumedRef.current?.(intent.token)');
expect(externalConsumedIndex >= 0, 'external file/origin consumed callback should still exist');
expect(entryConsumedIndex >= 0, 'entry scroll intent consumed callback should still exist');
expect(Math.abs(entryConsumedIndex - externalConsumedIndex) > 300, 'file/origin consumption and scroll-intent consumption should remain separate code paths');

const cutUploadBridge = read('src/features/xensonar/rooms/useSpectralForgeCutUploadBridge.ts');
expect(cutUploadBridge.includes('setSpectralForgeExternalAudioFile(null)') && cutUploadBridge.includes('setSpectralForgeEntryScrollIntent(null)'), 'cut-upload bridge should explicitly reset file/origin and scroll intent when creating a new cut-upload delivery');
expect(app.includes('onEntryScrollIntentConsumed: (token) =>'), 'App should clear entry intent only by matching consumed token');

if (process.exitCode) process.exit(process.exitCode);
console.log('[spectralforge-entry-scroll-diagnostic] ok');
