#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const src = readFileSync('src/features/xensonar/rooms/appRoomViewportProps.ts', 'utf8');
const fail = (message) => {
  console.error(`[check-irrlicht-arena-launch-route-contract] FAIL: ${message}`);
  process.exit(1);
};
if (!src.includes("if (view === 'arena')")) fail('Xenpolar launcher must special-case Irrlicht Arena');
if (!src.includes("setRoom('GAME')")) fail('Irrlicht Arena must route to GAME so its existing runtime room gate starts');
if (!src.includes("setXenpolarView('launcher')")) fail('Irrlicht route must keep Xenpolar launcher as the return target');
if (!src.includes("return;\n  }\n  if (view === 'xenpolar3')")) fail('Irrlicht Arena route must return before the generic XENPOLAR iframe/arcade path');
console.log('[check-irrlicht-arena-launch-route-contract] PASS');
