from pathlib import Path
from playwright.sync_api import sync_playwright
import json,sys
s=Path(sys.argv[1]).read_text()
rows=[{'id':f'x-{i}','name':f'Original {i}','items':[],'colors':{},'roomSettings':None} for i in range(30)]
raw=json.dumps(dict(version=2,name='Untitled Session',items=[],colors={},roomSettings=None,saved=rows,loadedId=None,activePalette=None,dirty=False))
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
 pg=b.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.on('dialog',lambda d:d.accept())
 pg.evaluate('''raw=>{const map=new Map([['xensonar.meta-sessions.v2',raw]]);window.__M13StoreMap=map;const store={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,''+v),removeItem:k=>map.delete(k)};Object.defineProperty(window,'localStorage',{configurable:true,value:store});Object.defineProperty(window,'sessionStorage',{configurable:true,value:store});Object.defineProperty(window,'indexedDB',{configurable:true,value:{open(){throw Error('synthetic denied')}}})}''',raw)
 pg.set_content(s,wait_until='domcontentloaded',timeout=85000)
 pg.wait_for_function('window.__XenBoot?.state().ready===true',timeout=65000)
 assert not pg.evaluate('window.__XenM13BootStatus().fastBootEnabled')
 pg.get_by_role('button',name='Meta-Menu',exact=True).click()
 pg.get_by_role('button',name='🎧 Sessions manager').click()
 pg.get_by_role('button',name='○ Fast Boot').click()
 assert pg.evaluate('window.__XenM13BootStatus().fastBootEnabled')
 seed=pg.evaluate('JSON.parse(window.__M13StoreMap.get("xensonar.meta-sessions.m13.boot.v1"))')
 assert seed['count']==30 and 'saved' not in seed
 assert pg.evaluate('window.__M13StoreMap.get("xensonar.meta-sessions.v2")')==raw
 pg.get_by_role('button',name='✓ Fast Boot').click()
 assert not pg.evaluate('window.__XenM13BootStatus().fastBootEnabled')
 assert pg.evaluate('window.__M13StoreMap.get("xensonar.meta-sessions.v2")')==raw
 assert not errors, errors
 print('M13_TOGGLE_UI_PASS',{'count':seed['count'],'v2Unchanged':True,'errors':len(errors)})
 b.close()
