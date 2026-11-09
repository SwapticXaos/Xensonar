#!/usr/bin/env python3
import argparse, json, os, shutil, subprocess, sys, tempfile, time, urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
ap=argparse.ArgumentParser()
ap.add_argument('--physical', action='store_true')
ap.add_argument('--browser', default='auto')
ap.add_argument('--timeout', type=float, default=20.0)
args=ap.parse_args()
BIN=ROOT/'artifacts'/('p0_native_pipewire_sidecar' if args.physical else 'p0_native_null_host')
MODE='--pipewire-sidecar' if args.physical else '--sidecar-null'
OUT=ROOT/'artifacts'/('P0N_BROWSER_LAB_PHYSICAL_SELFTEST.json' if args.physical else 'P0N_BROWSER_LAB_NULL_SELFTEST.json')


def discover_candidates():
    if args.browser != 'auto':
        p=shutil.which(args.browser) or args.browser
        return [(p,Path(p).name.lower(),'auto')]
    names=('chromium','chromium-browser','google-chrome-stable','google-chrome','opera','opera-stable','firefox')
    found=[]; seen=set()
    for name in names:
        p=shutil.which(name)
        if not p: continue
        rp=str(Path(p).resolve()) if Path(p).exists() else p
        key=(rp,name)
        if key in seen: continue
        seen.add(key)
        if 'opera' in name:
            found.append((p,name,'headless'))
            if os.environ.get('DISPLAY') or os.environ.get('WAYLAND_DISPLAY'):
                found.append((p,name,'gui'))
        elif 'firefox' in name:
            mode='gui' if args.physical and (os.environ.get('DISPLAY') or os.environ.get('WAYLAND_DISPLAY')) else 'headless'
            found.append((p,name,mode))
        else:
            found.append((p,name,'headless'))
    return found


def fetch_status(ready):
    try:
        req=urllib.request.Request(ready['origin']+'/v1/status',method='POST',headers={
            'Origin': ready['origin'],
            'X-Xensonar-Token': ready['token'],
            'Content-Type': 'application/x-www-form-urlencoded'
        },data=b'')
        with urllib.request.urlopen(req,timeout=2) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as exc:
        return {'diagnosticError':str(exc)}


def launch_command(browser,kind,mode,url,profile):
    env=dict(os.environ)
    if 'firefox' in kind:
        prefs=[
            'user_pref("browser.shell.checkDefaultBrowser", false);',
            'user_pref("browser.aboutwelcome.enabled", false);',
            'user_pref("browser.startup.homepage_override.mstone", "ignore");',
            'user_pref("browser.startup.homepage_welcome_url", "");',
            'user_pref("browser.startup.homepage_welcome_url.additional", "");',
            'user_pref("toolkit.telemetry.reportingpolicy.firstRun", false);',
            'user_pref("datareporting.policy.dataSubmissionEnabled", false);'
        ]
        Path(profile,'user.js').write_text('\n'.join(prefs)+'\n')
        if mode=='gui':
            env.pop('MOZ_HEADLESS',None)
            cmd=[browser,'--no-remote','--new-instance','-profile',profile,'--width','900','--height','650',url]
        else:
            env['MOZ_HEADLESS']='1'
            cmd=[browser,'--headless','--no-remote','--new-instance','-profile',profile,url]
        return cmd,env
    # Chromium family, including Opera. Keep the profile under HOME so Snap packages can see it.
    cmd=[browser,'--no-first-run','--no-default-browser-check','--disable-background-networking',
         '--disable-component-update','--disable-sync','--disable-extensions','--disable-features=Translate,MediaRouter',
         '--user-data-dir='+profile]
    if mode!='gui': cmd += ['--headless=new','--disable-gpu']
    if os.geteuid()==0: cmd.append('--no-sandbox')
    cmd.append(url)
    return cmd,env


def attempt(browser,kind,mode,index):
    p=subprocess.Popen([str(BIN),MODE],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
    ready_line=p.stdout.readline().strip()
    try: ready=json.loads(ready_line)
    except Exception:
        try:p.kill()
        except Exception:pass
        return {'pass':False,'browser':kind,'mode':mode,'reason':'bad-sidecar-ready','readyLine':ready_line}
    if ready.get('type')!='sidecar-ready':
        try:p.kill()
        except Exception:pass
        return {'pass':False,'browser':kind,'mode':mode,'reason':'sidecar-readiness-failed','ready':ready}
    url=ready['origin']+'/lab'
    profile=tempfile.mkdtemp(prefix=f'xensonar-browser-lab-{index}-',dir=str(Path.home()))
    cmd,env=launch_command(browser,kind,mode,url,profile)
    try:
        b=subprocess.Popen(cmd,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env=env)
    except Exception as exc:
        if p.poll() is None:p.kill()
        shutil.rmtree(profile,ignore_errors=True)
        return {'pass':False,'browser':kind,'mode':mode,'reason':'browser-launch-failed','error':str(exc),'ready':{k:v for k,v in ready.items() if k!='token'}}
    deadline=time.time()+args.timeout
    browser_exited_early=False
    while time.time()<deadline and p.poll() is None:
        if b.poll() is not None:
            browser_exited_early=True
            break
        time.sleep(0.05)
    diagnostic_status=None
    if browser_exited_early and p.poll() is None:
        diagnostic_status=fetch_status(ready); p.kill(); timed_out=False
    elif p.poll() is None:
        diagnostic_status=fetch_status(ready); p.kill(); timed_out=True
    else:
        timed_out=False
    try:b.terminate();b.wait(timeout=2)
    except Exception:
        try:b.kill()
        except Exception:pass
    stdout_rest=p.stdout.read() if p.stdout else ''
    stderr=p.stderr.read() if p.stderr else ''
    bout=b.stdout.read() if b.stdout else ''
    berr=b.stderr.read() if b.stderr else ''
    final=None
    for line in stdout_rest.splitlines():
        try:
            obj=json.loads(line)
            if obj.get('type')=='sidecar-final': final=obj.get('status')
        except Exception: pass
    checks={}
    checks['browserLaunched']=bool(getattr(b,'pid',None))
    checks['sidecarExited']=not timed_out and p.returncode==0
    checks['browserReportSeen']=bool(final and int(final.get('browserReportSeen',0))==1)
    checks['browserReportPass']=bool(final and int(final.get('browserReportPass',0))==1)
    checks['browserReportNoFailures']=bool(final and int(final.get('browserReportFailed',1))==0)
    checks['browserCheckCount']=bool(final and int(final.get('browserReportChecks',0))>=12)
    checks['browserProgressComplete']=bool(final and int(final.get('browserProgressStage',0))>=10)
    checks['clockRoundTripBounded']=bool(final and 0<int(final.get('browserClockRttUs',0))<250000)
    checks['latestRevisionReached']=bool(final and int(final.get('browserFinalRevision',0))==116 and int(final.get('mailboxRevision',0))>=116)
    checks['freshAttackReachedRT']=bool(final and int(final.get('transportStarted',0))>=1)
    checks['staleAttackDroppedRT']=bool(final and int(final.get('transportStale',0))>=1)
    checks['panicTerminal']=bool(final and int(final.get('ownerClosed',0))==1)
    checks['queueDrained']=bool(final and int(final.get('queueDepth',-1))==0)
    checks['noProcessErrors']=bool(final and int(final.get('processErrors',-1))==0)
    if args.physical:
        checks['physicalBackend']=bool(ready.get('physicalAudio') is True)
        checks['deviceQuantumNegotiated']=int(ready.get('deviceQuantumFrames',0))>0
        checks['noXRuns']=bool(final and int(final.get('xrunCount',-1))==0)
    passed=all(checks.values())
    result={'pass':passed,'claim':('physical-browser-localhost-sidecar-native-rt' if args.physical else 'browser-localhost-sidecar-native-rt-null'),
            'browser':kind,'browserPath':browser,'browserMode':mode,'url':url,'checks':checks,
            'ready':{k:v for k,v in ready.items() if k!='token'},'finalStatus':final,
            'sidecarExit':p.returncode,'timedOut':timed_out,'browserExitedEarly':browser_exited_early,
            'profileScope':'home','diagnosticStatus':diagnostic_status,'sidecarStderr':stderr[-2000:],
            'browserStdoutTail':bout[-1000:],'browserStderrTail':berr[-3000:]}
    shutil.rmtree(profile,ignore_errors=True)
    return result

candidates=discover_candidates()
if not candidates:
    result={'pass':False,'blocked':True,'reason':'supported-browser-not-found','attempts':[]}
    OUT.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,separators=(',',':')));sys.exit(5)

attempts=[]; winner=None
for idx,(browser,kind,mode) in enumerate(candidates,1):
    r=attempt(browser,kind,mode,idx); attempts.append(r)
    safe=''.join(ch if ch.isalnum() else '_' for ch in f'{idx}_{kind}_{mode}')
    (ROOT/'artifacts'/f'P0N_BROWSER_LAB_ATTEMPT_{safe}.json').write_text(json.dumps(r,indent=2,sort_keys=True)+'\n')
    if r.get('pass'):
        winner=r;break

if winner is None:
    final=dict(attempts[-1])
    final['attempts']=[{'browser':x.get('browser'),'mode':x.get('browserMode'),'pass':x.get('pass'),
                        'timedOut':x.get('timedOut'),'browserExitedEarly':x.get('browserExitedEarly'),
                        'progressStage':int((x.get('diagnosticStatus') or {}).get('browserProgressStage',0)),
                        'progressCount':int((x.get('diagnosticStatus') or {}).get('browserProgressCount',0)),
                        'stderrTail':x.get('browserStderrTail','')[-600:]} for x in attempts]
    OUT.write_text(json.dumps(final,indent=2,sort_keys=True)+'\n');print(json.dumps(final,separators=(',',':')));sys.exit(4)
winner['attempts']=[{'browser':x.get('browser'),'mode':x.get('browserMode'),'pass':x.get('pass')} for x in attempts]
OUT.write_text(json.dumps(winner,indent=2,sort_keys=True)+'\n');print(json.dumps(winner,separators=(',',':')));sys.exit(0)
