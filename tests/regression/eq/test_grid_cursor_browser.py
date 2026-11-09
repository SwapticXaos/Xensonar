from playwright.sync_api import sync_playwright
from pathlib import Path
import sys,json
P=Path(sys.argv[1]);out=Path(sys.argv[2]) if len(sys.argv)>2 else None
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 pg=b.new_page(viewport={'width':1674,'height':896});err=[];pg.on('pageerror',lambda e:err.append(str(e)))
 pg.evaluate("""()=>{let s={};Object.defineProperty(window,'localStorage',{configurable:true,get:()=>({getItem:k=>s[k]||null,setItem:(k,v)=>s[k]=v,removeItem:k=>delete s[k]})});Object.defineProperty(window,'sessionStorage',{configurable:true,get:()=>({getItem:k=>null,setItem:()=>{}})});} """)
 pg.set_content(P.read_text(),wait_until='load',timeout=45000);pg.wait_for_timeout(600)
 canvas=pg.locator('canvas').first; box=canvas.bounding_box();sz=canvas.evaluate('el=>[el.width,el.height]');print('canvas',box,'natural',sz)
 assert box and box['width']>100
 x=box['x']+min(15,25/sz[0]*box['width']); found=[];probes=[]
 for y in range(int(box['y']+8),int(min(box['y']+box['height']-8,885)),4):
  pg.mouse.move(x,y);c=canvas.evaluate('el=>el.style.cursor');
  if c=='ns-resize':found.append(y)
  probes.append((y,c))
 print('found ns-resize',len(found),found[:25]);assert found, 'No vertical drag cursor on grid triangles'
 # Moving away from the left tuning triangles must remove the override.
 pg.mouse.move(box['x']+box['width']*.5,found[len(found)//2]);print('center cursor',canvas.evaluate('el=>el.style.cursor'))
 assert canvas.evaluate('el=>el.style.cursor')==''
 pg.mouse.move(x,found[0]);pg.mouse.move(5,5);assert canvas.evaluate('el=>el.style.cursor')=='','No leave reset'
 assert not err,err
 print('PASS grid cursor: triangle hover -> ns-resize, away/leave -> previous cursor');
 if out:out.write_text(json.dumps({'hit_y_count':len(found),'hit_y_sample':found[:25],'cursor_far':'','errors':err},indent=2))
 b.close()
