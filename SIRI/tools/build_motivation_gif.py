"""Build the transparent SIRI motivation GIF from a compact animated mascot.

Run: python3 SIRI/tools/build_motivation_gif.py
Requires Pillow. A contact sheet is written to /tmp for visual inspection.
"""

from __future__ import annotations
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W,H,S,N=240,164,4,96
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'static/images/motivation-agent.gif'
SHEET=Path('/tmp/siri-motivation-v2-contact.png')
STILL=ROOT/'static/images/motivation-agent-still.png'
NAVY=(53,82,100); BLUE=(230,247,249); EAR=(150,195,211)
INK=(68,77,78); PAPER=(255,252,245); CORAL=(219,130,112)
GOLD=(239,178,68); GREEN=(101,157,129); PALE=(237,242,229)

def smooth(a,b,t):
    q=max(0,min(1,(t-a)/(b-a)))
    return q*q*(3-2*q)
def win(t,a,b,c,d): return smooth(a,b,t)*(1-smooth(c,d,t))
def mix(a,b,t): return a+(b-a)*t
def bez(p,n=16):
    a,b,c,d=p; out=[]
    for i in range(n+1):
        t=i/n; u=1-t
        out.append((u**3*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t**3*d[0],u**3*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t**3*d[1]))
    return out
def rgba(c,a=1): return (*c,round(255*max(0,min(1,a))))

def frame(t):
    im=Image.new('RGBA',(W*S,H*S),(0,0,0,0)); d=ImageDraw.Draw(im,'RGBA')
    def pts(p): return [(round(x*S),round(y*S)) for x,y in p]
    def line(p,c=INK,w=2,a=1):
        if a<.01:return
        q=pts(p); d.line(q,fill=rgba(c,a),width=max(1,round(w*S)),joint='curve')
        r=max(1,round(w*S/2))
        for x,y in (q[0],q[-1]): d.ellipse((x-r,y-r,x+r,y+r),fill=rgba(c,a))
    def curve(p,c=INK,w=2,a=1): line(bez(p),c,w,a)
    def ellipse(box,fill=None,outline=None,w=2,a=1):
        d.ellipse(tuple(round(v*S) for v in box),fill=rgba(fill,a) if fill else None,outline=rgba(outline,a) if outline else None,width=round(w*S))
    def rect(box,r,fill=None,outline=None,w=2,a=1):
        d.rounded_rectangle(tuple(round(v*S) for v in box),radius=round(r*S),fill=rgba(fill,a) if fill else None,outline=rgba(outline,a) if outline else None,width=round(w*S))
    def text(x,y,label,size,c=INK,a=1):
        try: font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Comic Sans MS.ttf',size*S)
        except OSError: font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',size*S)
        d.text((round(x*S),round(y*S)),label,font=font,fill=rgba(c,a))

    explore=1-smooth(.23,.32,t)+smooth(.93,1,t)
    eureka=win(t,.22,.28,.38,.45)
    record=win(t,.37,.43,.55,.63)
    absorb=win(t,.57,.63,.72,.78)
    recall=win(t,.70,.77,.91,.98)
    think=win(t,.68,.75,.85,.92)
    answer=win(t,.81,.86,.94,.98)
    breath=math.sin(2*math.pi*t*3)*1.3

    # A practice sheet never becomes an external skill bank. It is an environment task.
    sheet=1-max(record*.65,absorb*.75)
    rect((170,105,225,157),5,PAPER,INK,1.7,sheet)
    line([(177,116),(216,116)],EAR,1.4,sheet)
    text(178,117,'2 + 3 = ?',13,INK,sheet)
    line([(179,143),(207,143)],EAR,1.4,sheet)
    if explore>.01:
        line([(179,136),(187+4*math.sin(2*math.pi*t*12),136)],CORAL,2,explore*.9)
    if answer>.01:
        text(179,132,'5',17,GREEN,answer)
        line([(199,136),(204,141),(216,127)],GREEN,2.4,answer)

    # The notebook is first physical, then its marked pages feed an inner trace.
    nx=168-24*absorb; ny=50+17*absorb; scale=1-.62*absorb
    def np(x,y):return(nx+(x-168)*scale,ny+(y-50)*scale)
    note=win(t,.38,.45,.67,.76)
    if note>.01:
        line([np(164,53),np(164,106),np(216,106),np(216,51),np(164,53)],INK,2,note)
        rect((nx-7*scale,ny-2*scale,nx+45*scale,ny+56*scale),3,PAPER,None,1,note)
        line([np(164,53),np(164,106),np(216,106),np(216,51),np(164,53)],INK,1.8,note)
        for yy in (62,73,84,95): line([np(174,yy),np(207 if yy!=95 else 195,yy-1)],EAR,1.5,note)
        for yy in (59,70,81,92,103):ellipse((np(161,yy)[0]-2*scale,np(161,yy)[1]-2*scale,np(161,yy)[0]+2*scale,np(161,yy)[1]+2*scale),fill=CORAL,a=note)
        scribble=smooth(.45,.56,t)*record
        curve([np(177,84),np(187,80),np(189,94),np(201,80)],CORAL,2,scribble)
    if absorb>.01:
        curve([(mix(163,143,absorb),mix(72,67,absorb)),(150,60),(142,49),(119,56)],GREEN,2.5,absorb)

    # Recall is drawn as a transparent thought bubble with a visibly turning page.
    if think>.01:
        ellipse((158,5,224,68),PAPER,INK,1.7,think)
        ellipse((152,70,157,75),PAPER,INK,1.3,think)
        ellipse((146,77,149,80),PAPER,INK,1.1,think)
        line([(168,29),(182,26),(191,29),(191,53),(178,50),(168,53),(168,29)],NAVY,1.8,think)
        flip=math.sin(2*math.pi*(t-.75)*14)*5
        line([(191,29),(204+flip,26),(214,29),(214,52),(201,50),(191,53)],NAVY,1.8,think)
        line([(191,29),(191,53)],NAVY,1.2,think)
        for yy in (35,41,47):
            line([(173,yy),(185,yy-1)],EAR,1.2,think)
            line([(199,yy),(209+flip*.5,yy-1)],EAR,1.2,think)
    # Small bulb answers the agent's own discovery, not an external generator.
    if eureka>.01:
        ellipse((177,18,207,48),GOLD,INK,1.7,eureka)
        line([(186,48),(198,48),(197,54),(187,54)],INK,1.7,eureka)
        line([(188,56),(196,56)],INK,1.5,eureka)
        for a,b in [((192,10),(192,4)),((173,19),(168,15)),((211,19),(216,15)),((216,39),(222,40))]:line([a,b],GOLD,2,eureka)

    # One compact mascot: the original round-square head and antenna, with
    # only a writing hand added for the story. The face carries each phase.
    bob=breath+1.5*eureka-1.2*record
    tilt=-.055*eureka+.025*record-.02*think
    def hp(x,y):
        x0=x-103;y0=y-74
        return(103+x0*math.cos(tilt)-y0*math.sin(tilt),74+x0*math.sin(tilt)+y0*math.cos(tilt)+bob)
    # A single flexible arm reaches the exercise and the notebook.
    handx=mix(174,180,record); handy=mix(149,95,record)
    handx=mix(handx,147,eureka); handy=mix(handy,69,eureka)
    handx=mix(handx,147,absorb); handy=mix(handy,96,absorb)
    handx=mix(handx,176,recall); handy=mix(handy,149,recall)
    handx+=1.5*math.sin(2*math.pi*t*14)*(explore+record+answer)
    line([(133,104+bob),(143,112+bob),(handx-3,handy+4)],NAVY,3.2)
    ellipse((handx-5,handy+1,handx+4,handy+9),BLUE,NAVY,1.6)
    if explore+record+answer>.05:
        line([(handx,handy+5),(handx+5,handy-10)],CORAL,3,min(1,explore+record+answer))
        line([(handx+5,handy-10),(handx+6,handy-13)],GOLD,2,min(1,explore+record+answer))

    # Ears and rounded, asymmetrical head keep the original favicon lineage.
    sx=1+.08*eureka+.025*absorb; sy=1-.045*record+.055*eureka
    def f(x,y):
        x=103+(x-103)*sx; y=76+(y-76)*sy
        return hp(x,y)
    line([f(69,61),f(61,60),f(60,72),f(61,91),f(69,92)],NAVY,2.6)
    line([f(136,61),f(143,60),f(145,72),f(144,91),f(136,92)],NAVY,2.6)
    headpath=[]
    segments=[[(81,43),(93,40),(117,41),(128,45)],[(128,45),(136,48),(138,55),(138,64)],[(138,64),(139,77),(138,95),(137,103)],[(137,103),(135,112),(128,116),(119,117)],[(119,117),(107,119),(88,118),(80,116)],[(80,116),(72,114),(69,108),(69,101)],[(69,101),(68,87),(69,65),(69,58)],[(69,58),(70,49),(74,45),(81,43)]]
    for seg in segments:headpath.extend(bez([f(*p) for p in seg],9)[1:] if headpath else bez([f(*p) for p in seg],9))
    d.polygon(pts(headpath),fill=rgba(BLUE,1))
    line(headpath,NAVY,2.7)
    curve([f(77,47),f(86,44),f(100,44),f(106,45)],EAR,1.2,.65)
    # Antenna's copper tip springs up with the idea.
    tipx=103+5*eureka;tipy=24-7*eureka
    line([f(103,42),(tipx,tipy+10+bob)],NAVY,2.4)
    ellipse((tipx-6,tipy+bob,tipx+6,tipy+12+bob),GOLD if eureka>.15 else EAR,NAVY,2)

    # Eyes look down at the exercise, glow when insight arrives, then look up
    # into the remembered notebook before the confident final answer.
    eyeup=-2*eureka-3*think; pupilx=3*explore-2*think
    for x in (88,118):
        center=f(x,76+eyeup)
        ellipse((center[0]-5.5,center[1]-6,center[0]+5.5,center[1]+6),PAPER,NAVY,1.8)
        ellipse((center[0]-1.5+pupilx,center[1]-2,center[0]+2.5+pupilx,center[1]+2.5),fill=NAVY)
        if eureka>.05:
            line([(center[0]-8,center[1]-8),(center[0]-11,center[1]-11)],GOLD,1.8,eureka)
            line([(center[0]+8,center[1]-8),(center[0]+11,center[1]-11)],GOLD,1.8,eureka)
    if eureka>.2:
        ellipse((f(99,96)[0]-5,f(99,96)[1]-4,f(99,96)[0]+5,f(99,96)[1]+5),PAPER,NAVY,2,eureka)
    smile=max(record,absorb,recall)
    curve([f(91,100),f(98,103+4*smile),f(108,103+4*smile),f(116,99)],NAVY,2.1,1-eureka*.8)
    if absorb+recall>.02:
        curve([f(91,55),f(97,48),f(110,49),f(115,56)],GREEN,2.3,max(absorb,recall))
        line([f(100,55),f(105,51),f(110,56)],GREEN,1.6,max(absorb,recall))
    return im.resize((W,H),Image.Resampling.LANCZOS)

def save(frames):
    cols=12; rows=(len(frames)+cols-1)//cols
    montage=Image.new('RGB',(W*cols,H*rows),'white')
    for i,fr in enumerate(frames):
        white=Image.new('RGB',(W,H),'white');white.paste(fr,mask=fr.getchannel('A'))
        montage.paste(white,((i%cols)*W,(i//cols)*H))
    pal=montage.quantize(colors=120,method=Image.Quantize.MEDIANCUT)
    colors=pal.getpalette()[:360];full=[0,0,0]+colors+[255,255,255]*(255-120)
    indexed=[]
    for fr in frames:
        white=Image.new('RGB',(W,H),'white');white.paste(fr,mask=fr.getchannel('A'))
        q=white.quantize(palette=pal,dither=Image.Dither.NONE);values=bytearray(q.tobytes())
        mask=fr.getchannel('A').tobytes()
        for j,a in enumerate(mask):values[j]=values[j]+1 if a>=12 else 0
        out=Image.frombytes('P',(W,H),bytes(values));out.putpalette(full);out.info['transparency']=0;indexed.append(out)
    indexed[0].save(OUT,save_all=True,append_images=indexed[1:],duration=83,loop=0,disposal=2,transparency=0,optimize=False)
    frames[86].save(STILL)
    ids=[0,16,31,42,55,66,76,87]
    sheet=Image.new('RGB',(W*4,H*2),'#f3f1eb')
    for i,n in enumerate(ids):sheet.paste(frames[n],((i%4)*W,(i//4)*H),frames[n])
    sheet.save(SHEET)
    print(OUT,OUT.stat().st_size,SHEET)

if __name__=='__main__':save([frame(i/(N-1)) for i in range(N)])
