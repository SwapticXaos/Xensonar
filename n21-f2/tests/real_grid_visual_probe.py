import os
from playwright.sync_api import sync_playwright
from pathlib import Path
import json,os
root=Path(__file__).resolve().parents[1]
html=(root/'Xensonar_F3_56_55_CLEAN4_SPEED3_NESTED_HOLD_FIX3.html').read_text()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('XENSONAR_CHROMIUM_PATH'),args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1500,'height':1060},device_scale_factor=1)
 page.evaluate('''() => {const db=new Map(),api={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,String(v)),removeItem:k=>db.delete(k)};Object.defineProperty(window,'localStorage',{value:api,configurable:true});Object.defineProperty(window,'sessionStorage',{value:api,configurable:true});}''')
 page.evaluate('''() => {window.__gridprobe={trace:[],enable:false};const pr=CanvasRenderingContext2D.prototype;for(let key of ['moveTo','lineTo']){const old=pr[key];pr[key]=function(x,y){if(window.__gridprobe.enable){this['__gp'+key]=[x,y];}return old.apply(this,arguments)}};const old=pr.stroke;pr.stroke=function(){const a=this.__gpmoveTo,z=this.__gplineTo;if(window.__gridprobe.enable&&a&&z&&a[1]===z[1]&&a[0]===0&&z[0]>500){window.__gridprobe.trace.push({y:Math.round(a[1]*100)/100,s:String(this.strokeStyle),w:this.lineWidth});if(window.__gridprobe.trace.length>300) window.__gridprobe.trace.splice(0,150)}return old.apply(this,arguments)};}''')
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded')
 page.get_by_role('button',name='Power',exact=True).click();page.wait_for_timeout(600)
 print('errors',errors[:2]);print('selects',page.locator('select').evaluate_all('(ss)=>ss.map(s=>({v:s.value,options:[...s.options].length})).slice(0,5)'))
 canvas=page.locator('canvas').first
 print('canvases',page.locator('canvas').evaluate_all('(ss)=>ss.map(s=>[s.width,s.height,s.getBoundingClientRect().width,s.getBoundingClientRect().top]).slice(0,6)'))
 results=[]
 for key in ['base','n','n','m','-','n','m']:
  if key!='base':page.keyboard.press(key)
  page.wait_for_timeout(220)
  page.evaluate('''()=>{window.__gridprobe.trace=[];window.__gridprobe.enable=true;}''');page.wait_for_timeout(95)
  trace=page.evaluate('''()=>{window.__gridprobe.enable=false;return window.__gridprobe.trace.slice()}''')
  mode=page.locator('select').evaluate_all('(ss)=>ss.slice(0,4).map(s=>s.value)')
  print(key,mode,'rasterLineWidths',sorted({x['w'] for x in trace}),'strokeSamples',len(trace))
  results.append({'key':key,'mode':mode,'strokeCount':len(trace),'lineWidths':sorted({x['w'] for x in trace})})
  assert trace and all(x['w']==3 for x in trace), f'Raster width changed on {key}: {[x["w"] for x in trace[-12:]]}'
  if os.getenv('XENSONAR_CAPTURE_VISUAL')=='1': canvas.screenshot(path=str(root/'results'/f'fix3_{key}_canvas.png'))
 (root/'results/fix3_grid_visual.json').write_text(json.dumps({'status':'PASS','cases':results},indent=2)+'\n')
 b.close()
