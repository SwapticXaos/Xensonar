#!/usr/bin/env python3
"""Stufe 2b-Vorbereitung: Dateigrenzen nachschärfen, ohne Bytes der HTML zu ändern.
Für jede JS-Datei, die im Oktober allein kompilierte und jetzt nicht, wird das Dateiende auf das
echte Oktober-Dateiende verschoben (Suche der letzten Oktober-Zeichen im Folgetext) bzw. der Anfang
auf den Oktober-Anfang. Text wandert nur zwischen benachbarten Dateien derselben Sektion.
Usage: python3 tools/migrations/03_refine_boundaries.py <oct28-root>"""
import json,subprocess,sys
from pathlib import Path
R=Path(__file__).resolve().parents[2];O=Path(sys.argv[1])
man=json.loads((R/'source-manifest.json').read_text('utf-8'))
def compiles(text):
    r=subprocess.run(['node','-e','const vm=require("vm");let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{new vm.Script(s);process.exit(0)}catch(e){process.exit(1)}})'],input=text.encode(),capture_output=True)
    return r.returncode==0
def read(f):return (R/f).read_text('utf-8')
changed=[]
for sec in man['sources']:
    fs=sec['files']
    for i,f in enumerate(fs):
        if not f.endswith('.js') or not (O/f).exists():continue
        old=(O/f).read_text('utf-8')
        if not compiles(old):continue
        cur=read(f)
        if compiles(cur):continue
        fixed=False
        # 1) end too early: pull text from following files up to the Oct tail
        if i+1<len(fs):
            nxt=read(fs[i+1])
            for k in (200,120,80,60,40,30):
                tail=old[-k:]
                j=nxt.find(tail)
                if j>=0 and nxt.count(tail)==1:
                    cand=cur+nxt[:j+len(tail)]
                    if compiles(cand):
                        (R/f).write_text(cand,'utf-8');(R/fs[i+1]).write_text(nxt[j+len(tail):],'utf-8');changed.append((f,'end+',j+len(tail)));fixed=True
                    break
        # 2) start too early: push leading text to the previous file up to the Oct head
        if not fixed and i>0:
            cur=read(f);prev=read(fs[i-1])
            for k in (200,120,80,60,40,30):
                head=old[:k];j=cur.find(head)
                if j>0 and cur.count(head)==1:
                    cand=cur[j:]
                    if compiles(cand):
                        (R/fs[i-1]).write_text(prev+cur[:j],'utf-8');(R/f).write_text(cand,'utf-8');changed.append((f,'start>',j));fixed=True
                    break
        if not fixed:changed.append((f,'unfixed',0))
# drop files that became empty
for sec in man['sources']:
    keep=[]
    for f in sec['files']:
        if (R/f).stat().st_size==0:(R/f).unlink();changed.append((f,'removed-empty',0))
        else:keep.append(f)
    sec['files']=keep
(R/'source-manifest.json').write_text(json.dumps(man,indent=1,ensure_ascii=False)+'\n','utf-8')
for c in changed:print(*c)
