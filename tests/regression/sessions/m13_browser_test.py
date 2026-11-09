from pathlib import Path
from playwright.sync_api import sync_playwright
import json,sys
s=Path(sys.argv[1]).read_text()
count=140
rows=[{'id':f'archive-{i}','name':f'Archive {i}','items':[],'colors':{},'roomSettings':None} for i in range(count)]
payload={'version':2,'name':'Current draft','items':[],'colors':{},'roomSettings':None,'saved':rows,'loadedId':None,'activePalette':{'id':'archive-4','name':'Archive 4','items':[],'colors':{}},'dirty':False}
source=json.dumps(payload,ensure_ascii=False)
seed={'version':1,'archiveRows':6,'count':count,'activePalette':payload['activePalette'],'name':'Archive 4'}
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
 page=b.new_page(viewport={'width':1360,'height':850});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.evaluate('''([source,seed])=>{const map=new Map([['xensonar.meta-sessions.v2',source],['xensonar.meta-sessions.m13.boot.v1',JSON.stringify(seed)]]);window.__M13StoreMap=map;window.__M13Reads=[];const storage={getItem:k=>(window.__M13Reads.push(k),map.has(k)?map.get(k):null),setItem:(k,v)=>map.set(k,''+v),removeItem:k=>map.delete(k),get length(){return map.size},key:i=>[...map.keys()][i]};Object.defineProperty(window,'localStorage',{configurable:true,value:storage});Object.defineProperty(window,'sessionStorage',{configurable:true,value:storage});Object.defineProperty(window,'indexedDB',{configurable:true,value:{open(){throw Error('synthetic IndexedDB unavailable')}}})}''',[source,seed])
 page.set_content(s,wait_until='domcontentloaded',timeout=85000)
 page.wait_for_function('window.__XenBoot?.state().ready===true',timeout=65000)
 status=page.evaluate('window.__XenM13BootStatus()')
 assert status['fastBootEnabled'] is True and status['archiveDormant'] is True and status['loadedCount']==0,status
 v2_before=page.evaluate('window.__M13Reads.filter(k=>k===\'xensonar.meta-sessions.v2\').length')
 assert v2_before==0,('startup scanned V2',v2_before)
 assert page.evaluate('window.__XenM13BootStatus().loadedCount')==0
 # An OLD html modifying V2 while our archive is dormant is always picked up
 page.evaluate('''()=>{const raw=JSON.parse(window.__M13StoreMap.get('xensonar.meta-sessions.v2'));raw.saved.push({id:'legacy-new',name:'Legacy Added',items:[],colors:{},roomSettings:null});window.__M13StoreMap.set('xensonar.meta-sessions.v2',JSON.stringify(raw))}''')
 page.get_by_role('button',name='Meta-Menu',exact=True).click(timeout=15000)
 page.locator('.xen-meta-editor').wait_for(timeout=12000)
 page.get_by_role('button',name='🎧 Sessions manager').click(timeout=12000)
 assert page.locator('.xen-meta-session-row').count()==64
 assert page.evaluate('window.__XenM13BootStatus().loadedCount')==count+1
 page.get_by_role('searchbox',name='Search saved sessions').fill('Legacy Added')
 page.locator('.xen-meta-session-row').first.wait_for()
 assert page.get_by_text('Legacy Added',exact=False).count()>=1
 assert page.get_by_role('button',name='Fast Boot',exact=False).count()>=1
 assert page.evaluate('window.__XenM13BootStatus().archiveDormant') is False
 assert not errors,errors[:5]
 print('M13_BROWSER_PASS',{'initialV2Reads':v2_before,'sessionsOnDemand':count+1,'bootStatus':status,'errors':len(errors)})
 b.close()
