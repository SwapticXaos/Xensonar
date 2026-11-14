#!/usr/bin/env python3
"""Statically unused CSS rules (analysis only). A rule is reported when one of its selectors' class/id names can never be produced:
the name does not occur anywhere in the JS/HTML text, and no string in the JS ends with a prefix of it (dynamic `'xen-foo-'+x`).
  python3 tools/slim/css_unused.py            report
A rule with several selectors is only dead when ALL selectors are dead."""
import json,re,sys,os
R=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
man=json.load(open(os.path.join(R,'source-manifest.json')))
css=[f for s in man['sources'] for f in s['files'] if f.endswith('.css')]
js=[f for s in man['sources'] for f in s['files'] if f.endswith('.js')]
hay=open(os.path.join(R,man['template']),encoding='utf-8').read()+''.join(open(os.path.join(R,f),encoding='utf-8').read() for f in js)
words=set(re.findall(r'[A-Za-z_][\w-]*',hay))
# dynamic prefixes: a string fragment that ends with - or _ right before a quote, backtick, ${ or +
dyn=set(m for m in re.findall(r'([A-Za-z_][\w-]*[-_])(?=["\'`]|\$\{)',hay) if len(m)>=4)
esc=lambda n:re.sub(r'\\(.)',r'\1',n)
def name_possible(n):
    n=esc(n)
    if n in words:return True
    # tailwind-like names with special characters: check literal occurrence
    if n in hay:return True
    for i in range(len(n)-1,3,-1):
        if n[i-1] in '-_' and n[:i] in dyn:return True
    return False
def selector_dead(sel):
    names=re.findall(r'[.#]((?:\\.|[\w-])+)',re.sub(r'\[[^\]]*\]','',sel))
    return any(not name_possible(n) for n in names)
def split_rules(t):
    """yield (start,end,prelude,is_at) for top-level and nested (inside @media/@supports/@layer) style rules"""
    out=[];i=0;n=len(t)
    def walk(a,b):
        i=a
        while i<b:
            # skip whitespace/comments
            m=re.compile(r'\s*(/\*.*?\*/\s*)*',re.S).match(t,i);i=m.end()
            if i>=b:break
            j=i;depth=0;instr=None
            while j<b:
                c=t[j]
                if instr:
                    if c=='\\':j+=1
                    elif c==instr:instr=None
                elif c in '"\'':instr=c
                elif c=='{' or c==';':break
                j+=1
            if j>=b:break
            if t[j]==';':i=j+1;continue
            prelude=t[i:j].strip();k=j;depth=0;instr=None
            while k<b:
                c=t[k]
                if instr:
                    if c=='\\':k+=1
                    elif c==instr:instr=None
                elif c in '"\'':instr=c
                elif c=='{':depth+=1
                elif c=='}':
                    depth-=1
                    if depth==0:break
                k+=1
            if prelude.startswith('@'):
                if re.match(r'@(media|supports|layer|container)\b',prelude):walk(j+1,k)
            else:out.append((i,k+1,prelude))
            i=k+1
    walk(0,n);return out
tot=0;dead=0;rows=[];per={}
for f in css:
    t=open(os.path.join(R,f),encoding='utf-8').read();tot+=len(t)
    for a,b,pre in split_rules(t):
        sels=[s for s in re.split(r',(?![^(\[]*[)\]])',pre) if s.strip()]
        if sels and all(selector_dead(s) for s in sels):
            dead+=b-a;per[f]=per.get(f,0)+b-a;rows.append((b-a,f,pre[:90]))
print('css characters',tot,'in statically unreachable rules',dead,'(%.1f%%)'%(100*dead/tot),'rules',len(rows))
for f,v in sorted(per.items(),key=lambda x:-x[1])[:25]:print(f'{v:>8} / {os.path.getsize(os.path.join(R,f)):>8} {f}')
print()
for r in sorted(rows,reverse=True)[:25]:print(f'{r[0]:>6} {r[1][-40:]:40} {r[2]}')
if '--json' in sys.argv:json.dump(rows,open(sys.argv[sys.argv.index('--json')+1],'w'))
