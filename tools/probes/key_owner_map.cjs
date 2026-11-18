'use strict';
/* KEY-ROUTER stage 1 (measurement only, never part of index.html): which window/document key listener claims which key, per room and focus.
   Builds the uncompacted page in memory (tools/slim/page.cjs), records the source file of every key listener at registration (stack position
   -> source file), presses a fixed key set in every room with focus on the page body and in a text field, and writes the claims
   (preventDefault / stopPropagation / stopImmediatePropagation by that listener) as JSON + a Markdown table.
   Usage: node tools/probes/key_owner_map.cjs [out-dir]   (default dist/key_owner_map) */
const fs=require('fs'),path=require('path'),os=require('os');const {chromium}=require('playwright');
const {load}=require('../slim/page.cjs');
const outDir=path.resolve(process.argv[2]||'dist/key_owner_map');fs.mkdirSync(outDir,{recursive:true});
const page=load();const htmlPath=path.join(os.tmpdir(),'xen_key_owner_plain.html');fs.writeFileSync(htmlPath,page.out);
const lineStarts=[0];for(let i=0;i<page.out.length;i++)if(page.out.charCodeAt(i)===10)lineStarts.push(i+1);
const where=(line,col)=>{const pos=(lineStarts[line-1]??0)+col-1;const pc=page.fileAt(pos);if(!pc||!pc.file)return 'template';
  const before=page.out.slice(pc.start,pos);const ls=before.split('\n');return pc.file+':'+ls.length+':'+(ls[ls.length-1].length+1)};
const KEYS=['Backspace','Delete','Space','Enter','Escape','Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyQ','Digit1','KeyB','KeyM','Comma','Period','Control+KeyZ','Control+KeyX','Control+KeyC','Control+KeyV','Shift+KeyA'];
const ROOMS=['LIVE ROOM','MATERIAL FORGE','NODAL CENTER','PSY LAB','MULTITRACK'];
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1600,height:1000}});
  await p.addInitScript(()=>{
    const reg=window.__keyReg=[];const A=EventTarget.prototype.addEventListener,R=EventTarget.prototype.removeEventListener;const wrapped=new WeakMap();
    const isKey=t=>t==='keydown'||t==='keyup'||t==='keypress';
    EventTarget.prototype.addEventListener=function(type,fn,opt){
      if(isKey(type)&&(this===window||this===document)&&fn){const stack=(new Error().stack||'').split('\n').slice(2).map(s=>(s.match(/:(\d+):(\d+)\)?$/)||[]).slice(1).map(Number)).filter(x=>x.length===2);
        const entry={id:reg.length,fn:String(typeof fn==='function'?fn:fn.handleEvent).replace(/\s+/g,' ').slice(0,160),target:this===window?'window':'document',type,capture:typeof opt==='boolean'?opt:!!(opt&&opt.capture),stack,active:true};reg.push(entry);
        const w=function(ev){const s0=ev.defaultPrevented;let stopped=false;const sp=ev.stopPropagation,si=ev.stopImmediatePropagation;
          ev.stopPropagation=function(){stopped=true;return sp.call(this)};ev.stopImmediatePropagation=function(){stopped=true;return si.call(this)};
          try{return typeof fn==='function'?fn.call(this,ev):fn.handleEvent(ev)}finally{ev.stopPropagation=sp;ev.stopImmediatePropagation=si;
            if((!s0&&ev.defaultPrevented)||stopped)(window.__keyClaims||(window.__keyClaims=[])).push({id:entry.id,key:ev.key,code:ev.code,type:ev.type,prevented:!s0&&ev.defaultPrevented,stopped})}};
        let m=wrapped.get(fn);if(!m)wrapped.set(fn,m=new Map());m.set(this===window?'w'+type:'d'+type,{w,entry});return A.call(this,type,w,opt)}
      return A.call(this,type,fn,opt)};
    EventTarget.prototype.removeEventListener=function(type,fn,opt){if(isKey(type)&&(this===window||this===document)&&fn){const m=wrapped.get(fn),k=(this===window?'w':'d')+type,x=m&&m.get(k);if(x){x.entry.active=false;m.delete(k);return R.call(this,type,x.w,opt)}}return R.call(this,type,fn,opt)};
  });
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+htmlPath);await p.waitForTimeout(4000);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
  const room=t=>p.evaluate(t=>{const b=[...document.querySelectorAll('header button, button')].find(b=>b.innerText.replace(/\s+/g,' ').includes(t)&&b.offsetParent);if(!b)throw Error('no '+t);b.click()},t);
  const result={};
  for(const r of ROOMS){
    await room(r);await p.waitForTimeout(2500);result[r]={};
    for(const focus of ['body','text field']){
      const setFocus=()=>p.evaluate(f=>{document.activeElement?.blur?.();document.getElementById('__kofield')?.remove();if(f==='text field'){const i=document.createElement('input');i.id='__kofield';i.style.cssText='position:fixed;left:2px;top:2px;width:40px;z-index:99999';document.body.appendChild(i);i.focus()}else document.body.focus()},focus);
      for(const k of KEYS){await setFocus();await p.evaluate(()=>{window.__keyClaims=[]});const combo=k.replace('Space','Space');await p.keyboard.press(combo);await p.waitForTimeout(60);
        const claims=await p.evaluate(()=>window.__keyClaims.splice(0));
        result[r][focus+' | '+k]=claims;}
      await p.keyboard.press('Escape');
    }
  }
  const reg=await p.evaluate(()=>window.__keyReg.map(e=>({id:e.id,fn:e.fn,target:e.target,type:e.type,capture:e.capture,active:e.active,stack:e.stack})));
  const src=e=>{for(const [l,c] of e.stack){const w=where(l,c);if(!/tools\/|template/.test(w))return w}return 'unmapped (eval/room payload)'};
  const listeners=reg.map(e=>({...e,source:src(e)}));
  const byId=new Map(listeners.map(e=>[e.id,e]));
  let md='# Tasten-Zuständigkeit (KEY-ROUTER Stufe 1, Messung)\n\nWerkzeug: `tools/probes/key_owner_map.cjs` (unverdichteter Build, Chromium, Power an). „Beansprucht“ = der Listener ruft `preventDefault` oder `stopPropagation` für diese Taste auf. Handler, die ohne diese Aufrufe handeln, sind hier nicht sichtbar.\n\n';
  md+=`Angemeldete Tasten-Listener an window/document: ${listeners.length} (am Ende noch aktiv: ${listeners.filter(l=>l.active).length}).\n\n`;
  for(const r of ROOMS){md+='## '+r+'\n\n| Fokus · Taste | beansprucht von |\n|---|---|\n';
    for(const [k,cl] of Object.entries(result[r])){const owners=[...new Set(cl.filter(c=>c.type==='keydown').map(c=>{const l=byId.get(c.id);return l.source+(c.stopped?' (stop)':'')}))];md+=`| ${k} | ${owners.length?owners.join('<br>'):'–'} |\n`}
    md+='\n'}
  const conflicts=[];for(const r of ROOMS)for(const [k,cl] of Object.entries(result[r])){const o=new Set(cl.filter(c=>c.type==='keydown').map(c=>byId.get(c.id).source));if(o.size>1)conflicts.push(r+' · '+k+': '+[...o].join(' + '))}
  md+='## Mehrfach beansprucht (gleiche Taste, mehrere Listener)\n\n'+(conflicts.length?conflicts.map(c=>'- '+c).join('\n'):'keine')+'\n\n## Listener nach Quelldatei\n\n';
  for(const l of listeners)md+=`- \`${l.source}\` ${l.target} ${l.type}${l.capture?' (capture)':''}${l.active?'':' (removed)'} · \`${l.fn.slice(0,110).replace(/`/g,"'")}\`\n`;
  fs.writeFileSync(path.join(outDir,'key_owner_map.json'),JSON.stringify({listeners,result,errors},null,1));fs.writeFileSync(path.join(outDir,'key_owner_map.md'),md);
  console.log('listeners',listeners.length,'conflicts',conflicts.length,'pageerrors',errors.length,'->',outDir);await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
