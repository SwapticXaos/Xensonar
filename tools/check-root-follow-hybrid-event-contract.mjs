// Behavioural replacement for the previous marker-only hybrid contract.
import { spawnSync } from 'node:child_process';
const result = spawnSync(process.execPath, ['scripts/test-runtime.mjs', 'root-follow-129'], {stdio:'inherit'});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
