from pathlib import Path
from playwright.sync_api import sync_playwright
import sys,json
html=Path(sys.argv[1]).read_text()
anchor='const __XenMetaSessions=__createXenMetaSessionStore(localStorage,__XenQuick);'
assert html.count(anchor)==1
html=html.replace(anchor,anchor+'\nwindow.__XenAudit={session:__XenMetaSessions,quick:__XenQuick,eq:__XenEQ};')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.evaluate('''()=>{const map=new Map([['xensonar.meta-sessions.v2',JSON.stringify({version:2,name:'Audit',items:[],colors:{},roomSettings:null,saved:[],loadedId:null,activePalette:null,dirty:true})]]);Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}});Object.defineProperty(window,'sessionStorage',{configurable:true,value:window.localStorage})}''')
 page.set_content(html,wait_until='domcontentloaded',timeout=85000)
 page.wait_for_function('window.__XenBoot?.state().ready===true',timeout=65000)
 r=page.evaluate('''()=>{const q=window.__XenAudit.quick,s=window.__XenAudit.session,e=window.__XenAudit.eq;
  q.replaceItems([{kind:'material',id:'x-test',name:'Test'}]);const key='material:x-test';
  e.set(key,{a:Array(360).fill(.2),b:Array(360).fill(-.1),morph:.25,manualCenters:[311,642,1210]});
  const original=e.get(key).manualCenters;
  if(!s.saveFromQuickAsNew('Manual Center Session'))throw Error(s.snapshot().error);
  const row=s.snapshot().saved.at(-1),stored=row.songPerformance.entries.find(x=>x.id==='x-test').eq.manualCenters;
  e.set(key,{manualCenters:[450,850,1650]});if(!s.activateSaved(row.id))throw Error(s.snapshot().error);
  return {original,stored,restored:e.get(key).manualCenters}; }''')
 print(json.dumps(r));print('errors',errors)
 assert r['original']==[311,642,1210]
 assert r['stored']==r['original'] and r['restored']==r['original'],'manually shifted filter frequencies lost in save/restore'
 assert not errors,errors
 print('BROWSER_MANUAL_CENTERS_ROUNDTRIP_PASS')
 b.close()
