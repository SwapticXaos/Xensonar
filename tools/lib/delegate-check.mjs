import { spawnSync } from 'node:child_process';

export function delegateCheck(checkId, runner = 'tools/run-spectralforge-carrier-integral-sanity.mjs') {
  const proc = spawnSync(process.execPath, [runner, '--only', checkId, ...process.argv.slice(2)], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  process.exit(proc.status ?? 1);
}
