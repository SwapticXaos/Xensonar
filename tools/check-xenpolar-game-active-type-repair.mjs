import fs from 'node:fs';

const core = fs.readFileSync('src/features/xensonar/rooms/useAppXenpolarGameArenaRuntimeBoundary.core.ts', 'utf8');
const state = fs.readFileSync('src/features/xenpolar/rooms/irrlichtArenaState.ts', 'utf8');

function fail(message) {
  console.error(`[xensonar][xenpolar-game-active-type-repair] ${message}`);
  process.exit(1);
}

if (core.includes('state.gameActive')) {
  fail('Core runtime boundary must not write gameActive into IrrlichtArenaRuntimeState; gameActive is a React runtime flag.');
}

if (!core.includes('args.setGameActive(false);')) {
  fail('Core runtime boundary must still reset the React gameActive flag.');
}

if (state.includes('gameActive:')) {
  fail('IrrlichtArenaRuntimeState should not grow a duplicate gameActive field for this repair.');
}

console.log('[xensonar][xenpolar-game-active-type-repair] ok');
