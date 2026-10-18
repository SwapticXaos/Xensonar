import os
#!/usr/bin/env python3
"""Run CLEAN2's full 22 preset, 4 downsample and 4 actual-Worker characterization through Python's Playwright driver."""
from pathlib import Path
import sys
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
TARGET=Path(sys.argv[1]) if len(sys.argv)>1 else root/'Xensonar_F3_56_55_CLEAN4_SPEED1.html'
source=(root/'tests/refactor_characterization.cjs').read_text()
start='const result=await page.evaluate(async()=>{'
end='\n  });\n  assert.deepEqual(errors,[]);'
assert source.count(start)==1 and source.count(end)==1
js='async()=>{' + source.split(start,1)[1].split(end,1)[0] + '\n}'
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('XENSONAR_CHROMIUM_PATH'),args=['--no-sandbox'])
 page=browser.new_page()
 page.evaluate('''(() => {const m=new Map;const s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s})})()''')
 expose='window.__refactor={wb:__F341Workbench,material:__F356Material,originalMaterial:__F356MaterialOriginal,gestalt:__F356Gestalt,originalGestalt:__F356GestaltOriginal,workers:[__F356WorkerOriginal,__F356GestaltWorkerOriginal,__F356Worker,__F356GestaltWorker]};'
 source=TARGET.read_text().replace('</script>',expose+'</script>',1)
 page.set_content(source,wait_until='domcontentloaded')
 result=page.evaluate(js)
 expected=json.loads((root/'tests/fixtures/clean2_refactor_characterization.json').read_text())
 assert result==expected, 'PCM/worker/workbench behavior differs from frozen CLEAN2 fixture'
 print('PASS: 22 presets, 4 downsample/marking cases, 4 actual Workers, recipe/storage state, byte-identical PCM')
 browser.close()
