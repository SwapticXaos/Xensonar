#!/usr/bin/env node
// Astra 400 intentionally replaces the historical 3 -> 2 latest-slot contract.
// Keep this entry point, but verify the current immediate, bounded contract.
await import('./audio/test-live-admission-400.mjs');
