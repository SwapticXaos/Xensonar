#!/usr/bin/env python3
"""One-time migration (Stufe 2a): re-cut src/ blocks along the Oct-28 source tree's file
boundaries. Content always comes from the CURRENT build; Oct-28 supplies only boundaries and
names. Usage: python3 tools/carve_oct28.py <plan.json>   (plan from the Oct-28 analysis)
Result: src/** and styles/** at Oct-28 paths, src/post-oct/** for code added after Oct-28,
source-manifest.json (ordered sections). Build: python3 tools/build.py (byte-identical)."""
import json,re,sys,shutil
from pathlib import Path
R=Path(__file__).resolve().parent.parent
plan=json.load(open(sys.argv[1]))
tpl=(R/'src/index.template.html').read_text('utf-8')
sections=[];written=set()
def put(rel,text):
    assert rel not in written,rel;written.add(rel)
    p=R/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(text.encode('utf-8'))
def snap(cur,x,lo,hi):
    # move an approximate boundary to the nearest line start within +-400 chars, staying inside (lo,hi)
    best=None
    for d in range(0,401):
        for y in (x-d,x+d):
            if lo<y<hi and cur[y-1]=='\n':return y
    return x
stage={}
for b in plan:
    cur=(R/'src'/b['block']).read_text('utf-8');ext=b['block'].rsplit('.',1)[1];stem=b['block'].split('/',1)[1].rsplit('.',1)[0]
    root='src' if ext=='js' else 'styles'
    if not b['section']:
        rel=f'{root}/post-oct/{stem}.{ext}';stage[b['block']]=[(rel,cur)];continue
    regs=b['regions'];segs=[];pos=0;prevname='start'
    # boundaries: exact ones stay, anchored ones snap to line starts
    cuts=[]
    for k,(path,s,e,kind) in enumerate(regs):
        cuts.append([s,kind=='exact',path,'start']);cuts.append([e,kind=='exact',path,'end'])
    for i,c in enumerate(cuts):
        if not c[1]:
            lo=cuts[i-1][0] if i>0 else 0;hi=cuts[i+1][0] if i+1<len(cuts) else len(cur)
            c[0]=snap(cur,c[0],lo,hi) if lo<c[0]<hi else c[0]
    pieces=[];last=0;gapn=0;prev='start'
    for k,(path,s,e,kind) in enumerate(regs):
        s2=cuts[2*k][0];e2=cuts[2*k+1][0]
        if s2>last:
            gapn+=1;base=Path(prev).stem;pieces.append((f"{root}/post-oct/gaps/{stem}__{gapn:02d}_after_{base}.{ext}",cur[last:s2]))
        rel=path if path.startswith(('src/','styles/')) else f'{root}/{path}'
        pieces.append((rel,cur[s2:e2]));last=e2;prev=path
    if last<len(cur):
        gapn+=1;pieces.append((f"{root}/post-oct/gaps/{stem}__{gapn:02d}_after_{Path(prev).stem}.{ext}",cur[last:]))
    assert ''.join(t for _,t in pieces)==cur,b['block']
    stage[b['block']]=pieces
# write files, manifest; template tokens become section tokens
for b in plan:
    files=[]
    for rel,text in stage[b['block']]:
        put(rel,text);files.append(rel)
    tok=f"⁣XEN-BLOCK:{b['block']}⁣";assert tpl.count(tok)==1
    sid=b['block'].rsplit('.',1)[0].replace('/','-')
    tpl=tpl.replace(tok,f"⁣XEN-SECTION:{sid}⁣");sections.append({'id':sid,'oct28_section':b['section'],'files':files})
(R/'src/index.template.html').write_text(tpl,'utf-8')
(R/'source-manifest.json').write_text(json.dumps({'format':'xensonar-concat-v2','template':'src/index.template.html','output':'index.html',
 'note':'Ordered concat build. Content = current main; file boundaries/names from Oct-28 source tree where they still match (Stufe 2a).','sections':sections},indent=1,ensure_ascii=False)+'\n','utf-8')
shutil.rmtree(R/'src/js');shutil.rmtree(R/'src/css');(R/'src/blocks.json').unlink()
print('sections',len(sections),'files',len(written))
