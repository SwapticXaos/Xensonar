"""P2.8 focused real Chromium IndexedDB read-only key inventory check.
Not a complete native workspace-import / multi-tab transaction test.
"""
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.end_headers()
        self.wfile.write(b'<!doctype html><html><body>P2.8 IndexedDB fixture</body></html>')
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  page=browser.new_page()
  page.goto('http://127.0.0.1:'+str(server.server_port)+'/index.html')
  page.add_script_tag(content=(root/'src/contracts/09_reference_graph_extensions.js').read_text())
  page.add_script_tag(content=(root/'src/contracts/10_library_inventory_ports.js').read_text())
  result=page.evaluate('''async()=>{
    async function createStore(name,store,items){
      const db=await new Promise((resolve,reject)=>{
        const req=indexedDB.open(name,1);
        req.onupgradeneeded=()=>req.result.createObjectStore(store,{keyPath:'id'});
        req.onerror=()=>reject(req.error);req.onsuccess=()=>resolve(req.result);
      });
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(store,'readwrite');
        tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);
        for(const item of items)tx.objectStore(store).put(item);
      });db.close();
    }
    // >48 keys: UI cache may hide the old RFL target, the IDB key inventory must not.
    const material=Array.from({length:70},(_,i)=>({id:'mat-'+i,blob:new Blob(['audio'+i])}));
    const drum=[{id:'kit-1',payload:{lanes:[]}}];
    await createStore('xensonar-material-library','materials',material);
    await createStore('xensonar-drum-config-library','drumConfigs',drum);
    localStorage.setItem('xensonar.nodal.instruments.v1',JSON.stringify({schema:'xensonar.nodal-library',schemaVersion:1,entries:[{id:'local',revision:3,instrument:{}}]}));
    async function getKeys(dbName,store){
      const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(dbName,1);r.onerror=()=>reject(r.error);r.onsuccess=()=>resolve(r.result)});
      try{return await new Promise((resolve,reject)=>{
        const tx=db.transaction(store,'readonly');let keys;
        tx.oncomplete=()=>resolve(keys);tx.onabort=()=>reject(tx.error);
        const r=tx.objectStore(store).getAllKeys();r.onsuccess=()=>{keys=r.result};r.onerror=()=>reject(r.error);
      })}finally{db.close()}
    }
    const archive={samples:[],projects:[{composer:{tracks:[{instrumentPreset:'nodal:local@3'}]}}],
      materialLibrary:{entries:[]},rootFollowBank:{memberIds:['mat-69']},
      drumConfigLibrary:{entries:[],playlist:{orderedIds:['exported:kit-1'],hiddenIds:[]}}};
    const graph=__XenReferenceGraphP27.inspect({archive,mode:'merge'});
    const report=await __XenLibraryInventoryP28.inspect({graph,mode:'merge',ports:{
      material:()=>getKeys('xensonar-material-library','materials'),
      drum:()=>getKeys('xensonar-drum-config-library','drumConfigs'),
      nodal:()=>JSON.parse(localStorage.getItem('xensonar.nodal.instruments.v1')).entries
    }});
    return {statuses:report.edges.map(e=>[e.targetId,e.status]),material:report.inventories['material-library'],
      counts:report.counts};
  }''')
  assert all(st=='local-present-now' for _,st in result['statuses']),result
  assert result['material']['count']==70,result
  print('P2.8 CHROMIUM IDB PASS:',result)
  browser.close()
finally:server.shutdown();server.server_close()
