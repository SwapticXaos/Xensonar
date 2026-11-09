#!/usr/bin/env node
// Current portable Material-Import sanity: Vite SSR scenarios that do not need the optional jsdom dev dependency.
const scenarios = [
  './material-import-sanity/audioPaintDialogBridgeScenario.mjs',
  './material-import-sanity/audioPaintImportTruthScenario.mjs',
];
for (const scenario of scenarios) {
  console.log(`[material-import-current-sanity] RUN ${scenario}`);
  await import(scenario);
}
console.log(`[material-import-current-sanity] PASS: ${scenarios.length}/${scenarios.length} portable SSR scenarios green`);
