#!/usr/bin/env python3
"""Build and open the declared 399 PCM experiment. Never installs system packages."""
from pathlib import Path
import json, os, shutil, subprocess, sys, webbrowser
ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / 'reports' / '399-local-launch'
REPORT.mkdir(parents=True, exist_ok=True)
os.chdir(ROOT)

def run(command, name):
    print(name, flush=True)
    with (REPORT / (name + '.log')).open('w') as log:
        result = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
    if result.returncode:
        raise RuntimeError(f'{name} fehlgeschlagen. Details: {REPORT / (name + ".log")}')

def main():
    if sys.platform != 'linux':
        raise RuntimeError('Dieser Ausgang verwendet den vorhandenen Linux/PipeWire-Host.')
    for command in ('node', 'npm', 'cc', 'pkg-config'):
        if not shutil.which(command):
            raise RuntimeError(f'Build-Voraussetzung fehlt: {command}. Es wurde nichts am System installiert.')
    if subprocess.run(['pkg-config', '--exists', 'libpipewire-0.3']).returncode:
        raise RuntimeError('Die PipeWire-Entwicklungsdateien fehlen. Der normale Browser-Ausgang bleibt verfügbar.')
    html = ROOT / 'dist' / 'index.html'
    # Never serve the old 398 artifact as if it contained this patch.
    if not html.exists() or 'exclusive-post-master-host-v2-required' not in html.read_text():
        run(['npm', 'run', 'patch:setup'], 'html-toolchain')
        env_dir = ROOT / 'artifacts' / '399'
        env_dir.mkdir(parents=True, exist_ok=True)
        os.environ['XENSONAR_ARTIFACT_DIR'] = str(env_dir)
        run(['node', 'tools/build-vite-html-portable.mjs', '--profile', 'full', '--slug', '399_master_output'], 'html-full-build')
    # Dedicated PCM output uses no Genesis renderer. Compile the existing driver
    # without editing or replacing the installed native service.
    output = REPORT / 'xensonar-master-output'
    cflags = subprocess.check_output(['pkg-config', '--cflags', 'libpipewire-0.3'], text=True).split()
    libs = subprocess.check_output(['pkg-config', '--libs', 'libpipewire-0.3'], text=True).split()
    native = ROOT / 'tools/realtime-p0/native-p0/src'
    run(['cc', '-O3', '-fno-builtin', '-std=c11', '-Wall', '-Wextra', '-Werror', '-pthread', '-DP0N_HAVE_PIPEWIRE', *cflags,
         str(native/'p0_native_host.c'), str(native/'p0_native_null_driver.c'), str(native/'p0_native_pipewire_driver.c'),
         '-lm', *libs, '-o', str(output)], 'native-pcm-build')
    env = dict(os.environ)
    env.pop('XENSONAR_NATIVE_FIXED_PORT', None)
    env.pop('XENSONAR_STANDALONE_FILE_CORS', None)
    with (REPORT/'host.log').open('w') as log:
        process = subprocess.Popen([str(output), '--post-master-app', str(html)], env=env, stdout=subprocess.PIPE,
                                   stderr=log, text=True, bufsize=1)
        try:
            for line in process.stdout:
                log.write(line); log.flush()
                if '"type":"sidecar-ready"' not in line:
                    continue
                ready = json.loads(line)
                origin = ready['origin']
                query = '?postMasterPcm=1&browserWaveStarter=1&nativeWaveStarter=0&nativeRflMaterial=0'
                print('Instrument wird geöffnet. Audio einschalten und vor dem Spielen auf NATIVE OWNER warten.', flush=True)
                print('Browser-Vergleich im selben Fenster: ' + origin + query.replace('postMasterPcm=1', 'postMasterPcm=0'), flush=True)
                webbrowser.open(origin + query)
            if process.wait() != 0:
                raise RuntimeError(f'Audiohost beendet. Details: {REPORT / "host.log"}')
        finally:
            if process.poll() is None:
                process.terminate()
                process.wait(timeout=5)
try:
    main()
except (Exception, KeyboardInterrupt) as error:
    print(str(error) or 'Beendet.', file=sys.stderr)
    if sys.stdin.isatty():
        input('Enter zum Schließen.')
    sys.exit(1)
