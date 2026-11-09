#!/usr/bin/env python3
"""External Xensonar browser performance oracle.

Compares two already-built singlefile HTML artifacts in the same headless Chromium
process. It deliberately instruments the WebAudio/browser surface from outside the
application so production code does not pay for the measurement.

Requires: Python Playwright and a Chromium executable.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import argparse, json, math, statistics, time

PRELUDE=r'''() => {
  const mk=()=>{const m=new Map();return{getItem:k=>m.has(String(k))?m.get(String(k)):null,setItem:(k,v)=>m.set(String(k),String(v)),removeItem:k=>m.delete(String(k)),clear:()=>m.clear(),key:i=>Array.from(m.keys())[i]??null,get length(){return m.size}}};
  Object.defineProperty(window,'localStorage',{configurable:true,value:mk()});
  Object.defineProperty(window,'sessionStorage',{configurable:true,value:mk()});
  if (!crypto.randomUUID) Object.defineProperty(crypto,'randomUUID',{configurable:true,value:()=>`00000000-0000-4000-8000-${Math.random().toString(16).slice(2,14).padEnd(12,'0')}`});
  const P={counts:{}, keyDelays:[], intervalLags:[], contexts:[]};
  const inc=k=>P.counts[k]=(P.counts[k]||0)+1;
  const patch=(proto,name,label=name)=>{ if(!proto || typeof proto[name]!=='function') return; const orig=proto[name]; if(orig.__xpatched)return; function w(...a){inc(label); return Reflect.apply(orig,this,a)}; w.__xpatched=true; proto[name]=w; };
  const B=window.BaseAudioContext?.prototype;
  for(const n of ['createOscillator','createGain','createBiquadFilter','createBufferSource','createDynamicsCompressor','createDelay','createWaveShaper','createAnalyser','createConvolver','createConstantSource','createStereoPanner','createChannelMerger','createChannelSplitter']) patch(B,n,n);
  patch(window.AudioNode?.prototype,'connect','connect'); patch(window.AudioNode?.prototype,'disconnect','disconnect');
  for(const [obj,n,label] of [[window.OscillatorNode?.prototype,'start','oscStart'],[window.AudioBufferSourceNode?.prototype,'start','bufferStart'],[window.ConstantSourceNode?.prototype,'start','constantStart']]){
    if(obj && typeof obj[n]==='function'){const orig=obj[n]; obj[n]=function(...a){inc(label); return Reflect.apply(orig,this,a)}}
  }
  for(const n of ['setValueAtTime','linearRampToValueAtTime','exponentialRampToValueAtTime','setTargetAtTime','cancelScheduledValues','cancelAndHoldAtTime']) patch(window.AudioParam?.prototype,n,'param:'+n);
  const oTO=window.setTimeout, oSI=window.setInterval;
  window.setTimeout=function(fn,ms,...a){inc('setTimeout'); if((+ms||0)<=25)inc('setTimeout<=25'); return Reflect.apply(oTO,this,[fn,ms,...a])};
  let exp=performance.now()+10; oSI(()=>{const now=performance.now(), lag=now-exp; if(lag>4)P.intervalLags.push(lag); exp=now+10},10);
  P.installKeys=()=>{if(P.keysInstalled)return;P.keysInstalled=true;const ch=new MessageChannel(),q=[];ch.port1.onmessage=()=>{const r=q.shift();if(r)P.keyDelays.push(performance.now()-r)};window.addEventListener('keydown',()=>{q.push(performance.now());ch.port2.postMessage(0)},true);window.addEventListener('keyup',()=>{q.push(performance.now());ch.port2.postMessage(0)},true)};
  P.reset=()=>{P.counts={};P.keyDelays=[];P.intervalLags=[];};
  P.snap=()=>({counts:{...P.counts},keyDelays:P.keyDelays.slice(),intervalLags:P.intervalLags.slice()});
  window.__xperf=P;
}'''

def pct(vals,p):
    if not vals: return 0.0
    s=sorted(vals); q=(len(s)-1)*p; lo=math.floor(q); hi=math.ceil(q)
    return s[lo] if lo==hi else s[lo]*(hi-q)+s[hi]*(q-lo)

def metrics(cdp):
    return {x['name']:x['value'] for x in cdp.send('Performance.getMetrics')['metrics']}

def delta(a,b,k): return (b.get(k,0)-a.get(k,0))*1000 if k in ('TaskDuration','ScriptDuration') else b.get(k,0)-a.get(k,0)

def force_classic(page):
    labels=page.locator('label')
    for i in range(labels.count()):
        try:
            lab=labels.nth(i)
            if lab.inner_text().strip()!='aktiv': continue
            parent=lab.evaluate("e=>e.parentElement?.parentElement?.innerText||''")
            if 'ENTROPHON KLANGKÖRPER' not in parent: continue
            inp=lab.locator('input[type=checkbox]')
            if inp.count() and inp.is_checked(): inp.uncheck()
        except Exception:
            pass

def setup(page):
    page.wait_for_timeout(700)
    force_classic(page)
    page.get_by_role('button',name='Power').click()
    page.wait_for_timeout(900)
    page.evaluate('__xperf.installKeys()')

def stimulate(page,name):
    if name=='idle': page.wait_for_timeout(650)
    elif name=='chord3':
        for k in ('1','3','5'): page.keyboard.down(k)
        page.wait_for_timeout(18)
        for k in ('1','3','5'): page.keyboard.up(k)
        page.wait_for_timeout(620)
    elif name=='gliss20':
        for k in list('1234567890qwertzuiop'):
            page.keyboard.down(k); page.wait_for_timeout(5); page.keyboard.up(k)
        page.wait_for_timeout(500)
    elif name=='mouse20':
        c=page.locator('canvas').nth(0); bb=c.bounding_box()
        if not bb: raise RuntimeError('main canvas has no bounding box')
        for i in range(20):
            page.mouse.click(bb['x']+bb['width']*(.2+.6*((i%10)/9)), bb['y']+bb['height']*(.4+.15*((i%3)/2)))
            page.wait_for_timeout(30)
        page.wait_for_timeout(500)
    else: raise ValueError(name)

def run_build(browser,label,path,reps):
    page=browser.new_page(viewport={'width':1600,'height':1200})
    errors=[]; page.on('pageerror',lambda e: errors.append(str(e)))
    page.evaluate(PRELUDE)
    page.set_content(Path(path).read_text(),wait_until='load',timeout=60000)
    setup(page)
    cdp=page.context.new_cdp_session(page); cdp.send('Performance.enable')
    rows=[]
    for sc in ('idle','chord3','gliss20','mouse20'):
        for rep in range(reps):
            page.wait_for_timeout(500)
            page.evaluate('__xperf.reset()')
            m0=metrics(cdp); t0=time.perf_counter(); stimulate(page,sc); wall=time.perf_counter()-t0; m1=metrics(cdp)
            snap=page.evaluate('__xperf.snap()'); c=snap['counts']; kd=snap['keyDelays']
            rows.append({
                'label':label,'scenario':sc,'rep':rep+1,'wall_s':wall,
                'task_ms':delta(m0,m1,'TaskDuration'),'script_ms':delta(m0,m1,'ScriptDuration'),
                'gain':c.get('createGain',0),'filter':c.get('createBiquadFilter',0),'osc':c.get('createOscillator',0),
                'buffer':c.get('createBufferSource',0),'connect':c.get('connect',0),
                'starts':c.get('oscStart',0)+c.get('bufferStart',0)+c.get('constantStart',0),
                'param_target':c.get('param:setTargetAtTime',0),'timeouts25':c.get('setTimeout<=25',0),
                'key_delay_max':max(kd,default=0),'key_delay_p95':pct(kd,.95),
                'lag_max':max(snap['intervalLags'],default=0),'page_errors':len(errors),
            })
    page.close(); return rows,errors

def summarize(rows):
    keys=('task_ms','script_ms','gain','filter','osc','buffer','connect','starts','param_target','timeouts25','key_delay_max','key_delay_p95','lag_max')
    out={}
    for sc in ('idle','chord3','gliss20','mouse20'):
        g=[r for r in rows if r['scenario']==sc]
        out[sc]={k:statistics.median(r[k] for r in g) for k in keys}
        out[sc]['n']=len(g)
    return out

def ratio(c,o): return 1.0 if o==0 and c==0 else (float('inf') if o==0 else c/o)

def verdict(oracle,cand,errors):
    rules=[
      ('idle.task_ms',1.25),('idle.script_ms',1.35),
      ('chord3.task_ms',1.35),('chord3.script_ms',1.40),('chord3.gain',1.15),('chord3.filter',1.15),('chord3.connect',1.15),
      ('gliss20.task_ms',1.35),('gliss20.script_ms',1.40),('gliss20.gain',1.15),('gliss20.filter',1.15),('gliss20.connect',1.15),
      ('mouse20.task_ms',1.20),('mouse20.script_ms',1.25),
    ]
    checks=[]
    for spec,limit in rules:
        sc,k=spec.split('.'); r=ratio(cand[sc][k],oracle[sc][k]); checks.append({'metric':spec,'ratio':r,'limit':limit,'pass':r<=limit})
    checks.append({'metric':'page_errors','ratio':0 if not errors else float('inf'),'limit':0,'pass':not errors})
    return {'pass':all(x['pass'] for x in checks),'checks':checks}

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--oracle',required=True); ap.add_argument('--candidate',required=True); ap.add_argument('--oracle-label',default='oracle'); ap.add_argument('--candidate-label',default='candidate'); ap.add_argument('--reps',type=int,default=2); ap.add_argument('--chromium',default='/usr/bin/chromium'); ap.add_argument('--out',default='xensonar-perf-oracle.json'); args=ap.parse_args()
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path=args.chromium,args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'])
        orows,oerr=run_build(browser,args.oracle_label,args.oracle,args.reps)
        crows,cerr=run_build(browser,args.candidate_label,args.candidate,args.reps)
        browser.close()
    osum,csum=summarize(orows),summarize(crows); v=verdict(osum,csum,oerr+cerr)
    report={'oracle':{'label':args.oracle_label,'path':args.oracle,'summary':osum},'candidate':{'label':args.candidate_label,'path':args.candidate,'summary':csum},'verdict':v,'raw':orows+crows,'errors':oerr+cerr}
    Path(args.out).write_text(json.dumps(report,indent=2))
    print(json.dumps({'verdict':v,'oracle':osum,'candidate':csum},indent=2))
    raise SystemExit(0 if v['pass'] else 2)
if __name__=='__main__': main()
