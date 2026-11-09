#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const src = readFileSync('src/features/xensonar/family/refactor/XensonarRefactorRoom.tsx', 'utf8');
const fail = (message) => {
  console.error(`[check-refucktor-agent-visible-core-contract] FAIL: ${message}`);
  process.exit(1);
};

if (!src.includes('Recording-visible fallback')) fail('drawAgents must document the recorder-load visual fallback');
if (!src.includes('ctx.globalCompositeOperation = "source-over"')) fail('fallback core must force source-over drawing');
if (!src.includes('Math.max(3.8, radius * 0.52)')) fail('fallback core must draw a minimum-size solid agent body');
if (!src.includes('drawAgentCoreOverlay')) fail('final overlay must redraw agent cores after all soft Canvas layers');
if (!src.includes('AgentDomOverlayPoint')) fail('Refucktor must expose a DOM-level agent overlay type for recorder-load visibility');
if (!src.includes('data-refucktor-agent-dom-overlay="recording-visible"')) fail('Refucktor canvas must include a non-canvas DOM overlay for visible agent cores');
if (!src.includes('publishAgentDomOverlaySnapshot')) fail('Refucktor must publish throttled agent positions into the DOM overlay');
if (!src.includes('ctx.moveTo(a.x - radius * 0.82, a.y)')) fail('final overlay must include a non-blur crosshair core for recorder-load visibility');
if (!src.includes('ctx.strokeStyle = hsl(hue')) fail('fallback core must stroke agent bodies, not only fill glow');
if ((src.match(/setTransportBeat\(beat\)/g) ?? []).length !== 1) fail('transportBeat UI state should remain throttled to one commit site');

console.log('[check-refucktor-agent-visible-core-contract] PASS');
