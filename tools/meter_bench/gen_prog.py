# Progressive test pieces as GM MIDI with known truth: meter (segments per bar + grouping), segment BPM, sections.
import mido,json,random,sys,os
OUT=sys.argv[1];TPB=480
def piece(name,sections,seg_bpm,seed=1,swing=0.0):
    """sections: list of dict(label, bars, S, groups, chords(list of root midi per bar cycle), kit, inst, bassinst, style)"""
    R=random.Random(seed);mid=mido.MidiFile(ticks_per_beat=TPB);tr=[mido.MidiTrack() for _ in range(4)];[mid.tracks.append(t) for t in tr]
    seg_ticks=TPB//2  # one segment = an eighth in MIDI time; the tempo makes it seg_bpm segments per minute
    tr[0].append(mido.MetaMessage('set_tempo',tempo=int(60e6/seg_bpm*2)))  # quarter = 2 segments
    ev=[[] for _ in range(4)];t=0;truth=[]
    for sec in sections:
        S=sec['S'];g=sec['groups'];assert sum(g)==S
        for ch,prog in ((1,sec['inst']),(2,sec['bassinst']),(3,sec.get('pad',48))):ev[ch].append((t,mido.Message('program_change',channel=ch,program=prog)))
        truth.append({'label':sec['label'],'startSeg':t//seg_ticks,'bars':sec['bars'],'S':S,'groups':g})
        for b in range(sec['bars']):
            root=sec['chords'][b%len(sec['chords'])];starts=[sum(g[:i]) for i in range(len(g))]
            for k in range(S):
                tt=t+k*seg_ticks+int(R.gauss(0,8));tt=max(0,tt)
                if k in starts:
                    acc=k==0
                    ev[0].append((tt,mido.Message('note_on',channel=9,note=36 if (acc or (sec['style']=='rock' and starts.index(k)%2==0)) else (38 if sec['style']=='rock' else 42),velocity=110 if acc else 85)))
                    if sec['style']=='rock' and starts.index(k)%2==1:ev[0].append((tt,mido.Message('note_on',channel=9,note=38,velocity=100)))
                    if sec['style']=='jazz' and starts.index(k)>0:ev[0].append((tt,mido.Message('note_on',channel=9,note=38,velocity=55)))
                    # bass on every group start
                    ev[2].append((tt,mido.Message('note_on',channel=2,note=root-24+(7 if (starts.index(k)%2==1 and sec['style']!='jazz') else 0),velocity=100)))
                    ev[2].append((tt+seg_ticks*g[starts.index(k)]-20,mido.Message('note_off',channel=2,note=root-24+(7 if (starts.index(k)%2==1 and sec['style']!='jazz') else 0))))
                    # chord stab on group starts (comping)
                    for iv in sec.get('voicing',[0,3,7,10]):
                        n=root+iv;ev[1].append((tt,mido.Message('note_on',channel=1,note=n,velocity=78 if acc else 62)));ev[1].append((tt+int(seg_ticks*g[starts.index(k)]*.8),mido.Message('note_off',channel=1,note=n)))
                # hats / ride every segment
                ev[0].append((tt,mido.Message('note_on',channel=9,note=51 if sec['style']=='jazz' else 42,velocity=60 if k%2 else 72)))
                # melody: one note per segment, random from scale, pad sustain on bar start
            if sec.get('lead'):
                for k in range(0,S,2):
                    n=root+12+R.choice([0,2,3,5,7,10,12]);tt=t+k*seg_ticks
                    ev[3].append((tt,mido.Message('note_on',channel=3,note=n,velocity=70)));ev[3].append((tt+seg_ticks*2-30,mido.Message('note_off',channel=3,note=n)))
            t+=S*seg_ticks
    for i in range(4):
        evs=sorted(ev[i],key=lambda e:e[0]);last=0
        for tt,m in evs:tr[i].append(m.copy(time=tt-last));last=tt
    tr[0].append(mido.MetaMessage('end_of_track',time=TPB*4))
    mid.save(os.path.join(OUT,name+'.mid'))
    return {'name':name,'segBpm':seg_bpm,'sections':truth,'segSec':60/seg_bpm}
P=[]
Em=[52,52,55,57];Am=[57,55,53,52];Dm=[50,53,55,50]
P.append(piece('p5_4_jazz',[dict(label='A',bars=8,S=5,groups=[3,2],chords=[51,46],inst=0,bassinst=32,style='jazz',voicing=[0,3,7,10]),
  dict(label='B',bars=8,S=5,groups=[3,2],chords=[56,51,49,46],inst=0,bassinst=32,style='jazz',voicing=[0,4,7,11],lead=1,pad=65),
  dict(label='A',bars=8,S=5,groups=[3,2],chords=[51,46],inst=0,bassinst=32,style='jazz',voicing=[0,3,7,10])],seg_bpm=170,seed=2))
P.append(piece('p7_8_rock',[dict(label='A',bars=10,S=7,groups=[2,2,3],chords=Em,inst=30,bassinst=33,style='rock',voicing=[0,7,12]),
  dict(label='B',bars=8,S=7,groups=[2,2,3],chords=Am,inst=81,bassinst=33,style='rock',voicing=[0,3,7],lead=1,pad=81),
  dict(label='A',bars=10,S=7,groups=[2,2,3],chords=Em,inst=30,bassinst=33,style='rock',voicing=[0,7,12]),
  dict(label='C',bars=8,S=7,groups=[2,2,3],chords=[48,50],inst=19,bassinst=33,style='rock',voicing=[0,4,7,11])],seg_bpm=300,seed=3))
P.append(piece('p7_4_rock',[dict(label='A',bars=6,S=7,groups=[2,2,3],chords=[47,47,54,52],inst=29,bassinst=34,style='rock',voicing=[0,7,12]),
  dict(label='B',bars=6,S=7,groups=[2,2,3],chords=[50,52],inst=16,bassinst=34,style='rock',voicing=[0,4,7],lead=1),
  dict(label='A',bars=6,S=7,groups=[2,2,3],chords=[47,47,54,52],inst=29,bassinst=34,style='rock',voicing=[0,7,12])],seg_bpm=124,seed=4))
P.append(piece('p9_8_balkan',[dict(label='A',bars=12,S=9,groups=[2,2,2,3],chords=Dm,inst=21,bassinst=32,style='rock',voicing=[0,3,7]),
  dict(label='B',bars=12,S=9,groups=[2,2,2,3],chords=[55,53],inst=40,bassinst=32,style='rock',voicing=[0,4,7],lead=1),
  dict(label='A',bars=12,S=9,groups=[2,2,2,3],chords=Dm,inst=21,bassinst=32,style='rock',voicing=[0,3,7])],seg_bpm=330,seed=5))
P.append(piece('p11_8_prog',[dict(label='A',bars=8,S=11,groups=[3,3,3,2],chords=[52,48,50,47],inst=30,bassinst=33,style='rock',voicing=[0,7,12]),
  dict(label='B',bars=8,S=11,groups=[3,3,3,2],chords=[45,53],inst=18,bassinst=33,style='rock',voicing=[0,3,7,10],lead=1),
  dict(label='A',bars=8,S=11,groups=[3,3,3,2],chords=[52,48,50,47],inst=30,bassinst=33,style='rock',voicing=[0,7,12]),
  dict(label='B',bars=8,S=11,groups=[3,3,3,2],chords=[45,53],inst=18,bassinst=33,style='rock',voicing=[0,3,7,10],lead=1)],seg_bpm=290,seed=6))
P.append(piece('p13_8_prog',[dict(label='A',bars=8,S=13,groups=[3,3,3,2,2],chords=[50,46],inst=27,bassinst=34,style='rock',voicing=[0,7,12]),
  dict(label='B',bars=8,S=13,groups=[3,3,3,2,2],chords=[53,48],inst=4,bassinst=34,style='rock',voicing=[0,4,7,11],lead=1),
  dict(label='A',bars=8,S=13,groups=[3,3,3,2,2],chords=[50,46],inst=27,bassinst=34,style='rock',voicing=[0,7,12])],seg_bpm=310,seed=7))
P.append(piece('p6_8_ref',[dict(label='A',bars=12,S=6,groups=[3,3],chords=[48,53,55,48],inst=24,bassinst=32,style='rock',voicing=[0,4,7]),
  dict(label='B',bars=12,S=6,groups=[3,3],chords=[57,53],inst=0,bassinst=32,style='rock',voicing=[0,3,7],lead=1),
  dict(label='A',bars=12,S=6,groups=[3,3],chords=[48,53,55,48],inst=24,bassinst=32,style='rock',voicing=[0,4,7])],seg_bpm=270,seed=8))
P.append(piece('pmix_4_7_4',[dict(label='A',bars=8,S=8,groups=[2,2,2,2],chords=[52,55,57,52],inst=30,bassinst=33,style='rock',voicing=[0,7,12]),
  dict(label='B',bars=10,S=7,groups=[2,2,3],chords=[45,48],inst=81,bassinst=33,style='rock',voicing=[0,3,7],lead=1),
  dict(label='A',bars=8,S=8,groups=[2,2,2,2],chords=[52,55,57,52],inst=30,bassinst=33,style='rock',voicing=[0,7,12])],seg_bpm=280,seed=9))
json.dump(P,open(os.path.join(OUT,'truth.json'),'w'),indent=1)
print('\n'.join(p['name']+' segBpm '+str(p['segBpm'])+' '+' '.join(s['label']+str(s['bars'])+'x'+str(s['S']) for s in p['sections']) for p in P))
