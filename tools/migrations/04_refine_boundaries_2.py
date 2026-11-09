#!/usr/bin/env python3
"""Zweiter Nachschärf-Durchgang (byte-neutral). Für JS-Dateien, die im Oktober allein kompilierten:
 a) Ende zu spät: Oktober-Ende liegt im Dateiinneren -> Rest an die Folgedatei abgeben
 b) Anfang zu spät: Oktober-Anfang liegt in der Vordatei -> von dort herüberholen
 c) Ende verändert: Folgetext zeilenweise anhängen (max. 60 kB), bis die Datei kompiliert
Usage: python3 tools/migrations/04_refine_boundaries_2.py <oct28-root>"""
import json,subprocess,sys
from pathlib import Path
R=Path(__file__).resolve().parents[2];O=Path(sys.argv[1])
man=json.loads((R/'source-manifest.json').read_text('utf-8'))
NODE='const vm=require("vm");let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{new vm.Script(s);process.exit(0)}catch(e){process.exit(1)}})'
def ok(t):return subprocess.run(['node','-e',NODE],input=t.encode(),capture_output=True).returncode==0
rd=lambda f:(R/f).read_text('utf-8');wr=lambda f,t:(R/f).write_text(t,'utf-8')
log=[]
for sec in man['sources']:
    fs=sec['files']
    for i,f in enumerate(fs):
        if not f.endswith('.js') or not (O/f).exists():continue
        old=(O/f).read_text('utf-8');cur=rd(f)
        if ok(cur) or not ok(old):continue
        done=None
        # a) end too late
        for k in (120,80,50,30):
            t=old[-k:];j=cur.rfind(t)
            if j>0 and cur.count(t)==1 and j+k<len(cur) and i+1<len(fs) and ok(cur[:j+k]):
                wr(fs[i+1],cur[j+k:]+rd(fs[i+1]));wr(f,cur[:j+k]);done='a';break
        # b) start too late: old head inside previous file
        if not done and i>0:
            prev=rd(fs[i-1])
            for k in (120,80,50,30):
                h=old[:k];j=prev.rfind(h)
                if j>=0 and prev.count(h)==1 and ok(prev[j:]+cur):
                    wr(f,prev[j:]+cur);wr(fs[i-1],prev[:j]);done='b';break
        # c) changed end: append following text line by line
        if not done and i+1<len(fs):
            nxt=rd(fs[i+1]);p=0
            while p<min(len(nxt),60000):
                q=nxt.find('\n',p)
                if q<0:q=len(nxt)-1
                if ok(cur+nxt[:q+1]):
                    wr(f,cur+nxt[:q+1]);wr(fs[i+1],nxt[q+1:]);done='c';break
                p=q+1
        log.append((f,done or 'unfixed'))
for sec in man['sources']:
    keep=[]
    for f in sec['files']:
        if (R/f).stat().st_size==0:(R/f).unlink();log.append((f,'removed-empty'))
        else:keep.append(f)
    sec['files']=keep
(R/'source-manifest.json').write_text(json.dumps(man,indent=1,ensure_ascii=False)+'\n','utf-8')
for l in log:print(*l)
