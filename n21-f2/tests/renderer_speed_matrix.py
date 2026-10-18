import os
#!/usr/bin/env python3
"""Offline DSP matrix: bit-identical PCM and per-render wall time; no application patch or browser network."""
import argparse, hashlib, json, pathlib, statistics, time
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[1]

SCRIPT = r"""
async ({cases, repeats}) => {
 const wb=window.__SPEED__.wb, modes=window.__SPEED__.modes;
 const sr=16000,duration=1.20;
 const source=Float32Array.from({length:sr*2},(_,i)=>.17*Math.sin(i*2*Math.PI*173/sr)+.055*Math.sin(i*2*Math.PI*347/sr)+.024*Math.sin(i*2*Math.PI*977/sr));
 const atlas={hop:200,nodes:Array.from({length:160},(_,i)=>({center:i*200,rms:.13,level:.72,relativeLevel:.72,aperiodicity:.22,pitchConfidence:.88,f0Hz:173,centroidHz:620+i*3,formantEnvelope:Array.from({length:24},(_,j)=>Math.exp(-j*.08)),spectralPeaks:[{hz:173,magnitude:.17},{hz:347,magnitude:.055}]})),attacks:[{start:200,end:500,strength:.7}]};
 const model={samples:source,sampleRate:sr,version:'speed-matrix-v1',atlas};
 const gains=Float32Array.from({length:121},(_,i)=>i>=5&&i<=112?(i<12?(i-4)/8:i>101?(113-i)/12:.88):0);
 const carrier={rootReferenceHz:220,bands:[{gainCurve:gains,centerRatioCurve:Float32Array.from({length:121},(_,i)=>1.04+.48*Math.sin(i*.020)),supportSigmaCurve:Float32Array.from({length:121},(_,i)=>.05+.02*Math.sin(i*.15))}]};
 const hash=pcm=>{let h=2166136261;for(const x of new Uint8Array(pcm.buffer,pcm.byteOffset,pcm.byteLength))h=Math.imul(h^x,16777619)>>>0;return h.toString(16).padStart(8,'0')};
 const results=[];
 for(const key of cases){
  const preset=wb.getPresets().find(p=>p.id===key);
  if(!preset)throw Error('Unknown preset '+key+' known '+wb.getPresets().map(p=>p.id));
  const cfg=wb.make({preset:key,params:preset.values});
  const dsp=cfg.params.gestaltPilot?(cfg.params.variantRevision==='original'?modes.originalGestalt:modes.gestalt):(cfg.params.variantRevision==='original'?modes.originalMaterial:modes.material);
  const times=[];let first;
  for(let rep=0;rep<repeats;rep++){
   const t0=performance.now();const pcm=await dsp.render(carrier,model,sr,duration,{workbench:cfg});times.push(performance.now()-t0);
   const r={n:pcm.length,hash:hash(pcm),peak:pcm.reduce((m,v)=>Math.max(m,Math.abs(v)),0),frames:pcm.donorMaterialPlan?.materialTransform?.frames??null};
   if(first&&JSON.stringify(r)!==JSON.stringify(first))throw Error('Nondeterministic render '+key); first=r;
  }
  results.push({key,signature:first,times});
 }
 return results;
}
"""

def run_page(browser, target, cases, repeats):
    page=browser.new_page()
    errors=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.evaluate('''(() => {const m=new Map();for(const name of ['localStorage','sessionStorage']) Object.defineProperty(window,name,{configurable:true,value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()}})})()''')
    source=target.read_text()
    expose='window.__SPEED__={wb:__F341Workbench,modes:{material:__F356Material,originalMaterial:__F356MaterialOriginal,gestalt:__F356Gestalt,originalGestalt:__F356GestaltOriginal}};'
    source=source.replace('</script>',expose+'</script>',1)
    page.set_content(source,wait_until='domcontentloaded',timeout=60000)
    page.wait_for_function('!!window.__SPEED__', timeout=30000)
    result=page.evaluate(SCRIPT,{'cases':cases,'repeats':repeats})
    assert not errors, errors[:4]
    page.close()
    return result

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('html',type=pathlib.Path)
    p.add_argument('--capture',action='store_true');p.add_argument('--runs',type=int,default=2)
    p.add_argument('--reference',type=pathlib.Path,default=ROOT/'tests/fixtures/speed_matrix_reference.json')
    a=p.parse_args()
    cases=['material-flow-original','material-flow','gestalt-imprint-original','gestalt-imprint', 'film','gestalt-motion','air','signature-pilot']
    with sync_playwright() as pw:
      browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('XENSONAR_CHROMIUM_PATH'),args=['--no-sandbox'])
      result=run_page(browser,a.html,cases,a.runs)
      browser.close()
    signature={r['key']:r['signature'] for r in result}
    if a.capture:a.reference.write_text(json.dumps(signature,indent=2)+'\n')
    else: assert signature==json.loads(a.reference.read_text()), 'PCM or metadata signature drift: '+str([(k,v,signature.get(k)) for k,v in json.loads(a.reference.read_text()).items() if signature.get(k)!=v])
    for r in result:print('%-28s %.1fms %s'%(r['key'],statistics.median(r['times']),r['signature']['hash']))
    print('signatures matched:',len(signature),'runs:',a.runs)
