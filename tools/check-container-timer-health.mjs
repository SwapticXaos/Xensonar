#!/usr/bin/env node
const fail = (message) => {
  console.error(`[container-timer-health] ${message}`);
  process.exit(1);
};

const startDate = Date.now();
const startHr = typeof process.hrtime?.bigint === 'function' ? process.hrtime.bigint() : null;
let sink = 0;
for (let i = 0; i < 8_000_000; i += 1) sink ^= (i * 31) & 0xff;
const elapsedDate = Date.now() - startDate;
const elapsedHrMs = startHr ? Number(process.hrtime.bigint() - startHr) / 1_000_000 : elapsedDate;

if (elapsedDate <= 0 && elapsedHrMs <= 0) {
  fail('Date.now() and process.hrtime did not advance during a bounded CPU loop. Node timers, npm, Vite and TypeScript watchdog timeouts are not trustworthy in this container session.');
}
if (!Number.isFinite(elapsedHrMs) || elapsedHrMs < 0) {
  fail(`process.hrtime returned an invalid elapsed value: ${elapsedHrMs}`);
}
console.log(`[container-timer-health] PASS: elapsedDateMs=${elapsedDate.toFixed(3)} elapsedHrMs=${elapsedHrMs.toFixed(3)} sink=${sink}`);
