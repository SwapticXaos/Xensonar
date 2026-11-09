#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const failures = [];
const must = (rel, needle, label) => {
  if (!read(rel).includes(needle)) failures.push(`${rel}: missing ${label}`);
};
const mustNot = (rel, needle, label) => {
  if (read(rel).includes(needle)) failures.push(`${rel}: forbidden ${label}`);
};

const bridge = 'src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts';
const report = 'src/features/xensonar/rootFollow/rootFollowWorkletShadowReport.ts';
const message = 'src/features/xensonar/rootFollow/rootFollowWorkletShadowProcessorMessage.ts';
const processor = 'src/features/xensonar/rootFollow/rootFollowWorkletShadowProcessorSource.ts';

must(report, 'export type RootFollowWorkletShadowBridgeSnapshot', 'snapshot type lives in report boundary');
must(report, 'export function createRootFollowWorkletShadowBridgeSnapshot', 'snapshot factory lives in report boundary');
must(report, 'export function publishRootFollowWorkletShadowSnapshot', 'snapshot browser publisher lives in report boundary');
must(report, 'export function readRootFollowWorkletShadowSnapshotFromBrowser', 'snapshot browser reader lives in report boundary');
must(report, 'export function summarizeRootFollowWorkletPilotHealth', 'pilot health summary lives in report boundary');
must(report, 'export function summarizeRootFollowWorkletThroughput', 'throughput summary lives in report boundary');
must(report, 'ROOT_FOLLOW_WORKLET_SHADOW_BRIDGE_GLOBAL', 'browser-global key is centralized in report boundary');

must(message, 'export function applyRootFollowWorkletShadowProcessorMessage', 'processor message reducer lives outside bridge');
must(message, 'RootFollowWorkletShadowProcessorMessageResult', 'processor message reducer returns bridge result');
must(message, 'resolveRootFollowWorkletPilotHealth', 'message reducer owns pilot-health derivation');
must(message, 'stableLaneAckPlanSequence', 'message reducer exposes stable-lane ack sequence to bridge');

must(bridge, 'from "./rootFollowWorkletShadowReport"', 'bridge imports report boundary');
must(bridge, 'from "./rootFollowWorkletShadowProcessorMessage"', 'bridge imports processor message reducer');
must(bridge, 'applyRootFollowWorkletShadowProcessorMessage', 'bridge delegates processor message reduction');
must(bridge, 'publishRootFollowWorkletShadowSnapshot', 'bridge publishes through report boundary');
must(bridge, 'readRootFollowWorkletShadowSnapshotFromBrowser', 'bridge delegates browser read to report boundary');
must(bridge, 'ROOT_FOLLOW_WORKLET_SHADOW_BRIDGE_CODE', 'bridge still owns processor loading');
must(bridge, 'new AudioWorkletNode(ctx, PROCESSOR_NAME', 'bridge still owns node creation');
must(bridge, 'node.port.postMessage', 'bridge still owns message posting');
must(processor, 'registerProcessor', 'processor source still owns AudioWorkletProcessor registration');

mustNot(bridge, 'export type RootFollowWorkletShadowBridgeSnapshot', 'snapshot type must not live in bridge');
mustNot(bridge, 'function baseSnapshot', 'base snapshot factory must not live in bridge');
mustNot(bridge, '__XENSONAR_ROOT_FOLLOW_WORKLET_SHADOW__?:', 'browser-global typing must not be hand-written in bridge');
mustNot(bridge, 'debugWindow.__XENSONAR_ROOT_FOLLOW_WORKLET_SHADOW__', 'bridge must not directly read/write debug global');
mustNot(bridge, 'const nextProcessQuantumCount', 'processor throughput reduction must not live in bridge');
mustNot(bridge, 'const nextStableLaneSyntheticSilentProbeAckCount', 'synthetic silent probe ack reduction must not live in bridge');

if (failures.length) {
  console.error('[root-follow-worklet-shadow-report-boundary] FAIL');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('[root-follow-worklet-shadow-report-boundary] OK · Root-Follow Worklet Shadow bridge owns node/message runtime; report boundary owns snapshot/global/UI summaries.');
