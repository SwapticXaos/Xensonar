#!/usr/bin/env node
import http from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const args = process.argv.slice(2);
const getArg = (name, fallback = undefined) => {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : fallback;
};
const hasFlag = (name) => args.includes(name);

const root = resolve(new URL('..', import.meta.url).pathname);
const outDir = resolve(getArg('--out', process.env.XENSONAR_BURST_DIAGNOSIS_METER_OUT_DIR || '/mnt/data/xensonar_9106_burst_diagnosis_log_meter'));
const htmlPath = getArg('--html', process.env.XENSONAR_BURST_METER_HTML || '');
const candidates = (getArg('--candidates', process.env.XENSONAR_BURST_METER_CANDIDATES || 'C1_balanced_shadow_default_candidate,C2_pressure_safe_shadow_browser_safe,C4_studio_density_shadow_musical_outlier,W1_balanced_worklet_granular_pilot') || '').split(',').map((v) => v.trim()).filter(Boolean);
const durationMs = Number(getArg('--duration-ms', process.env.XENSONAR_SIMPLE_BURST_MS || '7000'));
const port = Number(getArg('--port', process.env.XENSONAR_BURST_METER_PORT || '8786'));
const analyzeOnly = hasFlag('--analyze-only');
const inputPath = getArg('--input', null);

mkdirSync(outDir, { recursive: true });

function log(message) {
  console.log(`[burst-diagnosis-log-meter] ${message}`);
}

function run(cmd, opts = {}) {
  return new Promise((resolveRun) => {
    const proc = spawn(cmd[0], cmd.slice(1), {
      cwd: opts.cwd ?? root,
      env: { ...process.env, ...(opts.env ?? {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timeoutMs = opts.timeoutMs ?? 120000;
    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      setTimeout(() => proc.kill('SIGKILL'), 2500).unref();
    }, timeoutMs);
    proc.stdout.on('data', (d) => { const s = d.toString(); stdout += s; process.stdout.write(s); });
    proc.stderr.on('data', (d) => { const s = d.toString(); stderr += s; process.stderr.write(s); });
    proc.on('close', (code, signal) => {
      clearTimeout(timer);
      resolveRun({ code, signal, stdout, stderr, timedOut: signal === 'SIGTERM' || signal === 'SIGKILL' });
    });
  });
}

function startServer(serverRoot) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    const filePath = url.pathname === '/' ? join(serverRoot, 'index.html') : join(serverRoot, url.pathname.replace(/^\/+/, ''));
    if (!existsSync(filePath)) {
      res.writeHead(404); res.end('not found'); return;
    }
    res.writeHead(200, { 'content-type': filePath.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' });
    res.end(readFileSync(filePath));
  });
  return new Promise((resolveServer) => {
    server.listen(port, '127.0.0.1', () => resolveServer(server));
  });
}

async function main() {
  const inputForAnalysis = inputPath ? resolve(inputPath) : outDir;
  const commandLedger = [];
  let server = null;
  if (!analyzeOnly) {
    if (!htmlPath || !existsSync(resolve(htmlPath))) {
      throw new Error('Pass --html /path/to/singlefile.html for browser runs, or use --analyze-only --input /path/to/logs.');
    }
    const serverRoot = join(outDir, 'served_html');
    mkdirSync(serverRoot, { recursive: true });
    copyFileSync(resolve(htmlPath), join(serverRoot, 'index.html'));
    server = await startServer(serverRoot);
    const url = `http://127.0.0.1:${port}/index.html`;
    log(`serving ${resolve(htmlPath)} as ${url}`);
    for (const candidate of candidates) {
      log(`running hard burst meter for ${candidate}`);
      const candidateOut = join(outDir, 'raw_runs', candidate);
      mkdirSync(candidateOut, { recursive: true });
      const result = await run(['node', 'tools/run-simple-hard-burst-meter.mjs', url, candidate, candidateOut], {
        cwd: root,
        timeoutMs: Number(process.env.XENSONAR_BURST_METER_CANDIDATE_TIMEOUT_MS || 95000),
        env: {
          XENSONAR_SIMPLE_BURST_MS: String(durationMs),
          XENSONAR_CDP_PORT: String(11600 + Math.floor(Math.random() * 500)),
        },
      });
      const ledgerPath = join(candidateOut, 'run_result.json');
      writeFileSync(ledgerPath, JSON.stringify({ candidate, result: { code: result.code, signal: result.signal, timedOut: result.timedOut }, stdoutTail: result.stdout.slice(-8000), stderrTail: result.stderr.slice(-8000) }, null, 2) + '\n');
      commandLedger.push({ candidate, code: result.code, signal: result.signal, timedOut: result.timedOut, ledgerPath });
    }
  }

  const analyzerOut = join(outDir, 'analysis');
  mkdirSync(analyzerOut, { recursive: true });
  log(`analyzing ${inputForAnalysis}`);
  const analysis = await run(['node', 'tools/analyze-burst-diagnosis-log-meter.mjs', '--out', analyzerOut, '--quiet', inputForAnalysis], { cwd: root, timeoutMs: 45000 });
  writeFileSync(join(outDir, 'burst_diagnosis_log_meter_run_ledger.json'), JSON.stringify({ version: '3.2.91.6.9.106-burst-diagnosis-log-meter', generatedAtIso: new Date().toISOString(), analyzeOnly, htmlPath: htmlPath ? resolve(htmlPath) : null, outDir, candidates, durationMs, commandLedger, analysis: { code: analysis.code, signal: analysis.signal, timedOut: analysis.timedOut, stdoutTail: analysis.stdout.slice(-4000), stderrTail: analysis.stderr.slice(-4000) } }, null, 2) + '\n');
  if (server) await new Promise((resolveClose) => server.close(resolveClose));
  log(`done: ${analyzerOut}`);
}

main().catch((error) => {
  console.error(error);
  writeFileSync(join(outDir, `FAILED_${new Date().toISOString().replace(/[:.]/g, '-')}.log`), String(error?.stack || error) + '\n');
  process.exit(1);
});
