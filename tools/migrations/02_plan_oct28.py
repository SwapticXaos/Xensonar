"""Plan the carve of current src/ blocks along Oct-28 file boundaries (dry run, writes plan.json)."""
import json,re
from pathlib import Path
REPO=Path('/home/user/xensonar');O=Path('/tmp/claude-0/-home-user-xensonar/6556a3f7-e4e9-5ad9-9a41-e75f29b1ac2e/scratchpad/nachtrag/oct28/XenSonar')
man=json.load(open(O/'source-manifest.json'));blocks=json.load(open(REPO/'src/blocks.json'))
octsec=[(s['marker'],[(p,(O/p).read_text('utf-8')) for p in s['files']]) for s in man['sources']]
def anchors(t,k=160):
    n=len(t);return [(off,t[off:off+k]) for off in sorted(set([0,n//7,2*n//7,3*n//7,4*n//7,5*n//7,6*n//7,max(0,n-k)])) if len(t[off:off+k])>=40]
def carve(cur,files):
    pos=0;out=[]
    for p,t in files:
        i=cur.find(t,pos)
        if i>=0:out.append((p,i,i+len(t),'exact'));pos=i+len(t);continue
        hits=[]
        for off,a in anchors(t):
            j=cur.find(a,pos)
            if j>=0 and cur.count(a)==1:hits.append((off,j))
        if len(hits)>=2:
            hits.sort(key=lambda x:x[1]);s=max(pos,hits[0][1]-hits[0][0]);e=min(len(cur),hits[-1][1]+len(t)-hits[-1][0])
            if e>s:out.append((p,s,e,'anchored'));pos=e
    return out
plan=[];used=set()
for b in blocks:
    cur=(REPO/'src'/b['file']).read_text('utf-8');best=None
    for mk,files in octsec:
        if mk in used:continue
        if not any(t[:200] in cur for _,t in files) and not any(a in cur for _,t in files for _,a in anchors(t)[:3]):continue
        r=carve(cur,files);cov=sum(e-s for _,s,e,_ in r)
        if r and (best is None or cov>best[0]):best=(cov,mk,r)
    if best and best[0]>=0.5*len(cur):
        used.add(best[1]);plan.append({'block':b['file'],'len':len(cur),'section':best[1],'regions':best[2],'coverage':best[0]/len(cur)})
    else:plan.append({'block':b['file'],'len':len(cur),'section':None,'regions':[],'coverage':0})
json.dump(plan,open('plan.json','w'),indent=0)
mapped=[p for p in plan if p['section']];print('blocks',len(plan),'mapped to Oct sections',len(mapped),'unmapped (post-oct)',len(plan)-len(mapped))
print('chars covered',sum(p['coverage']*p['len'] for p in plan)/sum(p['len'] for p in plan)*100,'%')
for p in plan:
    if not p['section']:print('  post-oct:',p['block'],p['len'])
    elif p['coverage']<.97:print('  partial:',p['block'],f"{p['coverage']*100:.1f}%",p['section'],len(p['regions']),'files')
