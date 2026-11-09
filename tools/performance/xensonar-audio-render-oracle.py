#!/usr/bin/env python3
"""Capture and compare Xensonar's rendered WebAudio output in headless Chromium.

This is a *secondary* performance oracle: it mirrors every connection to the
AudioDestinationNode into a MediaStreamDestination, records an identical
keyboard stress gesture, converts it to mono WAV with ffmpeg, and reports
simple discontinuity/dropout metrics. It cannot reproduce a physical device's
underruns, but it catches many graph/render regressions before a human live
smoke test.

Requires: Python Playwright, Chromium, ffmpeg.
"""
from __future__ import annotations

from array import array
from pathlib import Path
from playwright.sync_api import sync_playwright
import argparse
import base64
import json
import math
import shutil
import subprocess
import wave

PRELUDE = r'''() => {
  const mk=()=>{const m=new Map();return{getItem:k=>m.has(String(k))?m.get(String(k)):null,setItem:(k,v)=>m.set(String(k),String(v)),removeItem:k=>m.delete(String(k)),clear:()=>m.clear(),key:i=>Array.from(m.keys())[i]??null,get length(){return m.size}}};
  Object.defineProperty(window,'localStorage',{configurable:true,value:mk()});
  Object.defineProperty(window,'sessionStorage',{configurable:true,value:mk()});
  if(!crypto.randomUUID)Object.defineProperty(crypto,'randomUUID',{configurable:true,value:()=>`00000000-0000-4000-8000-${Math.random().toString(16).slice(2,14).padEnd(12,'0')}`});

  const originalConnect=AudioNode.prototype.connect;
  const captureByContext=new WeakMap();
  window.__xensonarCaptureDestinations=[];
  AudioNode.prototype.connect=function(destination,...args){
    const result=Reflect.apply(originalConnect,this,[destination,...args]);
    try {
      if(destination instanceof AudioDestinationNode){
        const context=this.context;
        let capture=captureByContext.get(context);
        if(!capture){
          capture=context.createMediaStreamDestination();
          captureByContext.set(context,capture);
          window.__xensonarCaptureDestinations.push(capture);
        }
        Reflect.apply(originalConnect,this,[capture]);
      }
    } catch (_) {}
    return result;
  };

  window.__xensonarStartCapture=()=>{
    const capture=window.__xensonarCaptureDestinations.at(-1);
    if(!capture) throw new Error('No WebAudio capture destination was created');
    window.__xensonarCaptureChunks=[];
    const mime=MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
    const recorder=new MediaRecorder(capture.stream,{mimeType:mime});
    recorder.ondataavailable=event=>{ if(event.data.size) window.__xensonarCaptureChunks.push(event.data); };
    recorder.start(100);
    window.__xensonarRecorder=recorder;
  };

  window.__xensonarStopCapture=async()=>{
    const recorder=window.__xensonarRecorder;
    if(!recorder) throw new Error('Capture was not started');
    await new Promise(resolve=>{ recorder.onstop=resolve; recorder.stop(); });
    const blob=new Blob(window.__xensonarCaptureChunks,{type:recorder.mimeType});
    const bytes=new Uint8Array(await blob.arrayBuffer());
    let binary='';
    for(let i=0;i<bytes.length;i+=32768) binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
    return {mime:blob.type,b64:btoa(binary),bytes:bytes.length};
  };
}'''


def force_classic(page) -> None:
    labels = page.locator('label')
    for i in range(labels.count()):
        try:
            label = labels.nth(i)
            if label.inner_text().strip() != 'aktiv':
                continue
            parent_text = label.evaluate("e=>e.parentElement?.parentElement?.innerText||''")
            if 'ENTROPHON KLANGKÖRPER' not in parent_text:
                continue
            checkbox = label.locator('input[type=checkbox]')
            if checkbox.count() and checkbox.is_checked():
                checkbox.uncheck()
        except Exception:
            pass


def stress_gesture(page) -> None:
    page.wait_for_timeout(250)
    for key in ('1', '4', '7'):
        page.keyboard.down(key)
    page.wait_for_timeout(130)
    for key in ('1', '4', '7'):
        page.keyboard.up(key)
    page.wait_for_timeout(220)
    for key in list('1234567890qwertzuiop'):
        page.keyboard.down(key)
        page.wait_for_timeout(5)
        page.keyboard.up(key)
    page.wait_for_timeout(700)


def capture_build(browser, path: Path, webm_path: Path) -> list[str]:
    page = browser.new_page(viewport={'width': 1600, 'height': 1200})
    errors: list[str] = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.evaluate(PRELUDE)
    page.set_content(path.read_text(), wait_until='load', timeout=60000)
    page.wait_for_timeout(700)
    force_classic(page)
    page.get_by_role('button', name='Power').click()
    page.wait_for_timeout(700)
    if page.evaluate('__xensonarCaptureDestinations.length') < 1:
        raise RuntimeError(f'{path}: no WebAudio destination was captured')
    page.evaluate('__xensonarStartCapture()')
    stress_gesture(page)
    result = page.evaluate('__xensonarStopCapture()')
    webm_path.write_bytes(base64.b64decode(result['b64']))
    page.close()
    return errors


def convert_to_wav(webm: Path, wav: Path) -> None:
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(webm),
        '-ac', '1', '-ar', '48000', '-c:a', 'pcm_s16le', str(wav),
    ], check=True)


def percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    values = sorted(values)
    position = (len(values) - 1) * p
    lo = int(math.floor(position))
    hi = int(math.ceil(position))
    if lo == hi:
        return values[lo]
    weight = position - lo
    return values[lo] * (1 - weight) + values[hi] * weight


def analyze_wav(path: Path, silence_window: int = 128, silence_eps: float = 1e-5) -> dict:
    with wave.open(str(path), 'rb') as wav:
        if wav.getsampwidth() != 2 or wav.getnchannels() != 1:
            raise RuntimeError(f'{path}: expected mono 16-bit PCM')
        rate = wav.getframerate()
        samples = array('h', wav.readframes(wav.getnframes()))
    if not samples:
        raise RuntimeError(f'{path}: empty capture')
    scale = 32768.0
    xs = [sample / scale for sample in samples]
    diffs = [abs(xs[i] - xs[i - 1]) for i in range(1, len(xs))]
    window_rms = []
    silent_windows = 0
    for start in range(0, len(xs) - silence_window + 1, silence_window):
        window = xs[start:start + silence_window]
        rms = math.sqrt(sum(value * value for value in window) / len(window))
        window_rms.append(rms)
        if rms < silence_eps:
            silent_windows += 1
    return {
        'duration_s': len(xs) / rate,
        'sample_rate': rate,
        'sample_count': len(xs),
        'peak': max(abs(value) for value in xs),
        'rms': math.sqrt(sum(value * value for value in xs) / len(xs)),
        'diff_p99_9': percentile(diffs, 0.999),
        'max_diff': max(diffs, default=0.0),
        'silent_windows_128': silent_windows,
        'median_window_rms': percentile(window_rms, 0.5),
    }


def compare(oracle: dict, candidate: dict, errors: list[str]) -> dict:
    # Deliberately forgiving: this catches gross render regressions, not timbral
    # differences. The browser workload oracle remains the primary performance gate.
    max_diff_limit = max(oracle['max_diff'] * 1.35, oracle['max_diff'] + 0.03)
    silent_limit = oracle['silent_windows_128'] + 3
    checks = [
        {'metric': 'page_errors', 'value': len(errors), 'limit': 0, 'pass': not errors},
        {'metric': 'max_diff', 'value': candidate['max_diff'], 'limit': max_diff_limit, 'pass': candidate['max_diff'] <= max_diff_limit},
        {'metric': 'silent_windows_128', 'value': candidate['silent_windows_128'], 'limit': silent_limit, 'pass': candidate['silent_windows_128'] <= silent_limit},
        {'metric': 'nonempty_rms', 'value': candidate['rms'], 'limit': 1e-4, 'pass': candidate['rms'] > 1e-4},
    ]
    return {'pass': all(item['pass'] for item in checks), 'checks': checks}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--oracle', required=True)
    parser.add_argument('--candidate', required=True)
    parser.add_argument('--oracle-label', default='oracle')
    parser.add_argument('--candidate-label', default='candidate')
    parser.add_argument('--chromium', default='/usr/bin/chromium')
    parser.add_argument('--out-dir', default='xensonar-audio-render-oracle')
    parser.add_argument('--out', default='xensonar-audio-render-oracle.json')
    parser.add_argument('--keep-webm', action='store_true')
    args = parser.parse_args()

    if not shutil.which('ffmpeg'):
        raise SystemExit('ffmpeg is required')
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    oracle_html = Path(args.oracle)
    candidate_html = Path(args.candidate)
    oracle_webm = out_dir / f'{args.oracle_label}.webm'
    candidate_webm = out_dir / f'{args.candidate_label}.webm'
    oracle_wav = out_dir / f'{args.oracle_label}.wav'
    candidate_wav = out_dir / f'{args.candidate_label}.wav'

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            executable_path=args.chromium,
            args=['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required',
                  '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
                  '--disable-backgrounding-occluded-windows'],
        )
        oracle_errors = capture_build(browser, oracle_html, oracle_webm)
        candidate_errors = capture_build(browser, candidate_html, candidate_webm)
        browser.close()

    convert_to_wav(oracle_webm, oracle_wav)
    convert_to_wav(candidate_webm, candidate_wav)
    oracle_metrics = analyze_wav(oracle_wav)
    candidate_metrics = analyze_wav(candidate_wav)
    errors = oracle_errors + candidate_errors
    verdict = compare(oracle_metrics, candidate_metrics, errors)
    report = {
        'oracle': {'label': args.oracle_label, 'path': str(oracle_html), 'metrics': oracle_metrics},
        'candidate': {'label': args.candidate_label, 'path': str(candidate_html), 'metrics': candidate_metrics},
        'verdict': verdict,
        'errors': errors,
        'note': 'Secondary render oracle; does not emulate physical audio-device underruns.',
    }
    Path(args.out).write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))
    if not args.keep_webm:
        oracle_webm.unlink(missing_ok=True)
        candidate_webm.unlink(missing_ok=True)
    raise SystemExit(0 if verdict['pass'] else 2)


if __name__ == '__main__':
    main()
