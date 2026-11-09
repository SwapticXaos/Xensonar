#!/usr/bin/env python3
"""Run a candidate against the user-confirmed Xensonar 320 live-performance baseline.

This is a release gate, not a benchmark leaderboard. It compares the candidate and
frozen 320 HTML in the same Chromium process, applies tighter ratios than the generic
6.8.7 oracle, and can also run the rendered-audio oracle.
"""
from __future__ import annotations

from pathlib import Path
import argparse
import gzip
import hashlib
import json
import subprocess
import sys
import tempfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
MANIFEST = HERE / 'XENSONAR_320_CONFIRMED_LIVE_BASELINE.json'
REFERENCE_GZ = HERE / 'reference' / 'Xensonar_320_confirmed_live.html.gz'
BROWSER_ORACLE = HERE / 'xensonar-browser-perf-oracle.py'
AUDIO_ORACLE = HERE / 'xensonar-audio-render-oracle.py'


def ratio(candidate: float, baseline: float) -> float:
    if baseline == 0:
        return 1.0 if candidate == 0 else float('inf')
    return candidate / baseline


def load_manifest() -> dict:
    manifest = json.loads(MANIFEST.read_text())
    gz_bytes = REFERENCE_GZ.read_bytes()
    gz_sha = hashlib.sha256(gz_bytes).hexdigest()
    if gz_sha != manifest['compressed_reference_sha256']:
        raise SystemExit(f'320 baseline archive SHA mismatch: {gz_sha}')
    html = gzip.decompress(gz_bytes)
    html_sha = hashlib.sha256(html).hexdigest()
    if html_sha != manifest['core_html_sha256']:
        raise SystemExit(f'320 baseline HTML SHA mismatch: {html_sha}')
    if len(html) != manifest['core_html_bytes']:
        raise SystemExit(f'320 baseline HTML size mismatch: {len(html)}')
    return manifest


def run(cmd: list[str]) -> int:
    print('+', ' '.join(cmd), flush=True)
    return subprocess.run(cmd, check=False).returncode


def strict_workload_checks(report: dict, policy: dict[str, float]) -> list[dict]:
    base = report['oracle']['summary']
    cand = report['candidate']['summary']
    checks: list[dict] = []
    for spec, limit in policy.items():
        scenario, metric = spec.split('.', 1)
        value = ratio(float(cand[scenario][metric]), float(base[scenario][metric]))
        checks.append({
            'metric': spec,
            'baseline': base[scenario][metric],
            'candidate': cand[scenario][metric],
            'ratio': value,
            'limit': limit,
            'pass': value <= limit,
        })
    errors = report.get('errors') or []
    checks.append({
        'metric': 'page_errors',
        'baseline': 0,
        'candidate': len(errors),
        'ratio': 0 if not errors else float('inf'),
        'limit': 0,
        'pass': not errors,
    })
    return checks


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--candidate', required=True, help='Built candidate singlefile HTML')
    ap.add_argument('--candidate-label', default='candidate')
    ap.add_argument('--reps', type=int, default=2)
    ap.add_argument('--chromium', default='/usr/bin/chromium')
    ap.add_argument('--out', default='XENSONAR_320_PERFORMANCE_LOCK.json')
    ap.add_argument('--audio', action='store_true', help='Also run rendered-audio continuity oracle (requires ffmpeg)')
    args = ap.parse_args()

    manifest = load_manifest()
    candidate = Path(args.candidate).resolve()
    if not candidate.is_file():
        raise SystemExit(f'candidate does not exist: {candidate}')

    with tempfile.TemporaryDirectory(prefix='xensonar-320-perf-lock-') as td_raw:
        td = Path(td_raw)
        baseline_html = td / 'Xensonar_320_confirmed_live.html'
        baseline_html.write_bytes(gzip.decompress(REFERENCE_GZ.read_bytes()))
        browser_report = td / 'browser.json'

        browser_rc = run([
            sys.executable, str(BROWSER_ORACLE),
            '--oracle', str(baseline_html),
            '--candidate', str(candidate),
            '--oracle-label', '320-confirmed-live',
            '--candidate-label', args.candidate_label,
            '--reps', str(args.reps),
            '--chromium', args.chromium,
            '--out', str(browser_report),
        ])
        if not browser_report.exists():
            raise SystemExit(f'browser oracle did not produce a report (exit {browser_rc})')
        browser = json.loads(browser_report.read_text())
        workload_checks = strict_workload_checks(browser, manifest['gate_policy'])
        workload_pass = all(item['pass'] for item in workload_checks)

        audio = None
        audio_pass = True
        audio_rc = None
        if args.audio:
            audio_report = td / 'audio.json'
            audio_dir = td / 'audio-artifacts'
            audio_rc = run([
                sys.executable, str(AUDIO_ORACLE),
                '--oracle', str(baseline_html),
                '--candidate', str(candidate),
                '--oracle-label', '320-confirmed-live',
                '--candidate-label', args.candidate_label,
                '--chromium', args.chromium,
                '--out-dir', str(audio_dir),
                '--out', str(audio_report),
            ])
            if not audio_report.exists():
                raise SystemExit(f'audio oracle did not produce a report (exit {audio_rc})')
            audio = json.loads(audio_report.read_text())
            audio_pass = bool(audio.get('verdict', {}).get('pass'))

        result = {
            'baseline': manifest,
            'candidate': str(candidate),
            'candidate_label': args.candidate_label,
            'browser_oracle_exit': browser_rc,
            'workload_pass': workload_pass,
            'workload_checks': workload_checks,
            'browser_report': browser,
            'audio_enabled': args.audio,
            'audio_oracle_exit': audio_rc,
            'audio_pass': audio_pass,
            'audio_report': audio,
            'pass': workload_pass and audio_pass,
            'rebaseline_rule': 'Do not move the 320 baseline merely to make a patch pass. New baseline requires external browser gate + rendered-audio gate + human live confirmation.',
        }
        Path(args.out).write_text(json.dumps(result, indent=2) + '\n')

        print('\nXensonar 320 performance lock:', 'PASS' if result['pass'] else 'FAIL')
        for item in workload_checks:
            if item['metric'] == 'page_errors':
                print(f"  {item['metric']}: {item['candidate']} (limit {item['limit']}) {'PASS' if item['pass'] else 'FAIL'}")
            else:
                print(f"  {item['metric']}: {item['ratio']:.3f}x <= {item['limit']:.3f}x {'PASS' if item['pass'] else 'FAIL'}")
        if args.audio:
            print('  rendered_audio:', 'PASS' if audio_pass else 'FAIL')
        print(' report:', Path(args.out).resolve())
        raise SystemExit(0 if result['pass'] else 2)


if __name__ == '__main__':
    main()
