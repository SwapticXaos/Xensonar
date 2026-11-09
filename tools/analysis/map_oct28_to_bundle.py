import json,re
from pathlib import Path
O=Path('oct28/XenSonar');m=json.load(open(O/'source-manifest.json'))
sec=[s for s in m['sources'] if s['marker']=='@@XENSONAR_COMPONENT_005@@'][0]
cur=Path('/home/user/xensonar/src/js/010-main-bundle.js').read_text('utf-8')
files=[(p,(O/p).read_text('utf-8')) for p in sec['files']]
def anchors(t,k=160):
    # candidate anchors: start, end, plus a few interior unique-ish slices
    n=len(t);c=[]
    for off in [0,n//7,2*n//7,3*n//7,4*n//7,5*n//7,6*n//7,max(0,n-k)]:
        s=t[off:off+k]
        if len(s)>=60:c.append((off,s))
    return c
pos=0;out=[]
for p,t in files:
    i=cur.find(t,pos)
    if i>=0: out.append(dict(file=p,old=len(t),kind='exact',start=i,end=i+len(t)));pos=i+len(t);continue
    hits=[]
    for off,a in anchors(t):
        j=cur.find(a,pos)
        if j>=0 and cur.count(a)==1: hits.append((off,j))
    if len(hits)>=2:
        hits.sort(key=lambda x:x[1]); s=hits[0][1]-hits[0][0]; e=hits[-1][1]+(len(t)-hits[-1][0])
        s=max(s,pos); out.append(dict(file=p,old=len(t),kind='anchored',start=s,end=e,anchors=f'{len(hits)}/8',new=e-s));pos=max(pos,e)
    elif len(hits)==1: out.append(dict(file=p,old=len(t),kind='weak',start=hits[0][1],anchors='1/8'))
    else: out.append(dict(file=p,old=len(t),kind='lost'))
from collections import Counter
c=Counter(r['kind'] for r in out);print(c)
cov=sum(r['end']-r['start'] for r in out if r['kind'] in('exact','anchored'));print('covered chars',cov,'of',len(cur),round(cov/len(cur)*100,1),'%')
print('old chars by kind:',{k:sum(r['old'] for r in out if r['kind']==k) for k in c})
json.dump(out,open('bundle_map2.json','w'),indent=0)
print('--- anchored with biggest growth'); [print(f"{r['old']:8} -> {r['new']:8} {r['anchors']} {r['file']}") for r in sorted([r for r in out if r['kind']=='anchored'],key=lambda r:-(r['new']-r['old']))[:10]]
print('--- weak/lost'); [print(f"{r['old']:8} {r['kind']} {r['file']}") for r in out if r['kind'] in('weak','lost')][:40]
