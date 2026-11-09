"""Chromium: compact seeds avoid full V2 IO, legacy seeds recover correct saved sound owner."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import sys, json

html=Path(sys.argv[1]).read_text()
needle="return sources?__XenMainRoomSessionBridge.applySongSources(sources):false;"
assert html.count(needle)==1, 'real boot source handoff must be uniquely hookable'
html=html.replace(needle,"window.__bootSourceAudit=JSON.parse(JSON.stringify(sources||null));"+needle)
record={'id':'old','name':'Old','items':[],'colors':{},'roomSettings':None,
        'songPerformance':{'version':1,'entries':[], 'sources':{'keyboard':{'keyboardSoundPreset':'saved-record'}}}}
archive={'version':2,'name':'Old','items':[],'colors':{},'roomSettings':None,
        'saved':[record], 'loadedId':'old', 'activePalette':{'id':'old','name':'Old','items':[],'colors':{}},'dirty':False}
base_seed={'version':1,'archiveRows':6,'count':1,'activePalette':archive['activePalette'],'name':'Old'}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for kind in ['legacy','compact']:
  page=browser.new_page()
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  seed=dict(base_seed)
  if kind=='compact':seed['songSources']={'keyboard':{'keyboardSoundPreset':'compact-snapshot'}}
  page.evaluate('''([archive,seed])=>{
   const values=new Map([['xensonar.meta-sessions.v2',JSON.stringify(archive)],['xensonar.meta-sessions.m13.boot.v1',JSON.stringify(seed)]]);
   window.__reads=[];
   const storage={getItem:k=>(window.__reads.push(k),values.get(k)??null),setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k),get length(){return values.size},key:i=>[...values.keys()][i]};
   Object.defineProperty(window,'localStorage',{configurable:true,value:storage});
   Object.defineProperty(window,'sessionStorage',{configurable:true,value:storage});
  }''',[archive,seed])
  page.set_content(html,wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function('window.__XenBoot?.state().ready===true',timeout=65000)
  data=page.evaluate("()=>({sources:window.__bootSourceAudit??null,v2Reads:window.__reads.filter(x=>x==='xensonar.meta-sessions.v2').length,status:window.__XenM13BootStatus()})")
  print(kind.upper(),json.dumps(data))
  expected='saved-record' if kind=='legacy' else 'compact-snapshot'
  assert data['sources']['keyboard']['keyboardSoundPreset']==expected,(kind,data)
  assert (data['v2Reads']>=1 and not data['status']['archiveDormant']) if kind=='legacy' else (data['v2Reads']==0 and data['status']['archiveDormant'])
  assert not errors,(kind,errors)
  page.close()
 browser.close()
print('BOOT_SOUND_OWNER_LEGACY_COMPACT_PASS')
