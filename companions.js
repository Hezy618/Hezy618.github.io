/* Original cat companions: shared, interruption-safe spring motion. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const personalities = {
    catAbout: {symbol:'♥',label:'Pet the cat',mode:'love'},
    catType: {symbol:'</>',label:'Say hello to the coding cat',mode:'code'},
    catPatrol: {symbol:'✦',label:'Greet the reading cat',mode:'curious'},
    catFirework: {symbol:'✧',label:'Celebrate with the cat',mode:'celebrate'},
    catSit: {symbol:'↗',label:'Cheer on the active cat',mode:'sport'},
  };
  // Eye height, gaze, brows and mouth are numbers, so every expression can morph.
  const baseFace={left:1,right:1,gx:0,gy:0,brow:0,tilt:0,brows:.55,smile:0,oh:0,blush:0,spark:0};
  const faceKeys=Object.keys(baseFace);
  const expression=(parts)=>({...baseFace,...parts});
  const faces={
    love:{
      idle:[{left:.28,right:.28,brows:.08,smile:.42},{left:.68,right:.42,gx:1.4,smile:.64,blush:.12},{left:.38,right:.65,gx:-1.1,smile:.38}],
      react:[{left:1.2,right:1.2,brow:-1.6,smile:.55,blush:.45},{left:.24,right:.24,brows:.08,smile:1,blush:1}],
    },
    code:{
      idle:[{left:.8,right:.8,brow:1,tilt:1.1,brows:.95,smile:-.08},{left:.55,right:.72,gx:1.5,gy:-1.3,brow:-.3,smile:.1},{left:1.05,right:.66,gx:-1.1,brow:-1.2,tilt:-.6,smile:.16}],
      react:[{left:1.4,right:1.4,brow:-2.1,oh:.95},{left:1.15,right:1.15,brow:-1.1,smile:.85,blush:.2}],
    },
    curious:{
      idle:[{left:1.05,right:.65,gx:-.6,gy:1,brow:-1.3,tilt:-.7,smile:.08,oh:.15},{left:.66,right:1.18,gx:1.2,gy:-.6,brow:-1.7,smile:.13},{left:.88,right:.88,gx:-1.4,gy:.8,brow:.5,smile:.05}],
      react:[{left:1.5,right:1.5,brow:-2.7,oh:1},{left:1.08,right:1.3,gx:1.3,brow:-1.7,smile:.62,oh:.15}],
    },
    celebrate:{
      idle:[{left:.15,right:.92,brows:.28,smile:.56},{left:.9,right:.9,gx:1.1,brow:-1.1,smile:.35},{left:.8,right:.2,gx:-1,brows:.3,smile:.68}],
      react:[{left:1.4,right:1.4,brow:-2.5,smile:.65,blush:.25,spark:.45},{left:1.1,right:1.1,brow:-1.2,smile:1.15,blush:.65,spark:1}],
    },
    sport:{
      idle:[{left:.86,right:.86,brow:1.2,tilt:1.5,brows:1,smile:.25},{left:1,right:.7,gx:1.6,brow:.3,tilt:.6,smile:.36},{left:.7,right:1,gx:-1.3,brow:.8,tilt:1,smile:.3}],
      react:[{left:1.25,right:1.25,brow:-1.5,smile:.68},{left:.42,right:.42,brows:.28,smile:1.2,blush:.3}],
    },
  };
  const reactions = {
    love: {rise:-2, tilt:-7, tail:-30, paw:-3},
    code: {rise:1, tilt:3, tail:-11, paw:-6},
    curious: {rise:-1, tilt:7, tail:14, paw:-1},
    celebrate: {rise:-6, tilt:-4, tail:-34, paw:-7},
    sport: {rise:-4, tilt:5, tail:24, paw:-4},
  };
  const states=[];
  let raf=0,last=0;
  function wake(){if(!raf){last=0;raf=requestAnimationFrame(tick);}}
  const spring=(s,key,target,dt)=>{
    const velocity=key+'V';
    // Analytic critically damped spring: stable under interruptions and frame drops.
    const omega=key==='joy'?9:12,offset=s[key]-target,decay=Math.exp(-omega*dt);
    const c=s[velocity]+omega*offset;
    s[key]=target+(offset+c*dt)*decay;
    s[velocity]=(s[velocity]-omega*c*dt)*decay;
    return Math.abs(s[key]-target)+Math.abs(s[velocity])>.003;
  };
  function springFace(s,target,dt){
    let moving=false;
    for(const key of faceKeys){
      const omega=key==='gx'||key==='gy'?8:11;
      const offset=s.face[key]-target[key],decay=Math.exp(-omega*dt);
      const c=s.faceV[key]+omega*offset;
      s.face[key]=target[key]+(offset+c*dt)*decay;
      s.faceV[key]=(s.faceV[key]-omega*c*dt)*decay;
      if(Math.abs(s.face[key]-target[key])+Math.abs(s.faceV[key])>.005)moving=true;
    }
    return moving;
  }
  function paintFace(s){
    const f=s.face, n=(v)=>v.toFixed(2);
    for(const [side,cx] of [['left',34],['right',53]]){
      const eye=s.eyes[side],open=f[side],x=cx+f.gx,y=45+f.gy;
      eye.shape.setAttribute('cx',n(x));eye.shape.setAttribute('cy',n(y));
      eye.shape.setAttribute('rx',n(2.1+Math.max(0,open-.6)*.55));
      eye.shape.setAttribute('ry',n(.35+open*3.05));
      eye.glint.setAttribute('cx',n(x-.55));eye.glint.setAttribute('cy',n(y-1));
      eye.glint.style.opacity=n(Math.max(0,Math.min(1,(open-.3)*1.6)));
    }
    s.brows[0].setAttribute('d',`M29 41 Q34 ${n(40+f.brow)} 39 ${n(41+f.tilt)}`);
    s.brows[1].setAttribute('d',`M48 ${n(41-f.tilt)} Q53 ${n(40+f.brow)} 58 41`);
    s.browGroup.style.opacity=n(f.brows);
    s.smile.setAttribute('d',`M38 55 Q43 ${n(55+f.smile*7)} 48 55`);
    s.smile.style.opacity=n(1-f.oh);
    s.oh.style.opacity=n(f.oh);
    s.oh.setAttribute('ry',n(1.1+f.oh*2.3));
    s.blush.style.opacity=n(f.blush*.55);
    s.starEyes.style.opacity=n(f.spark);
    s.normalEyes.style.opacity=n(1-f.spark);
  }
  function paint(s){
    const joy=s.joy;
    const motion=reactions[s.p.mode];
    const eased=joy*joy*(3-2*joy);
    s.gaze.style.transform=`translate(${s.x}px,${s.y}px)`;
    s.head.style.transform=`translateY(${eased*motion.rise}px) rotate(${s.x*.5+eased*motion.tilt}deg) scale(${1+eased*.025},${1-eased*.012})`;
    s.node.style.setProperty('--joy',joy.toFixed(4));
    s.bubble.style.opacity=eased;
    s.bubble.style.transform=`translateY(${(1-eased)*7}px) scale(${.85+eased*.15})`;
    s.tail.style.transform=`rotate(${eased*motion.tail+s.x*1.5}deg)`;
    s.hands.style.transform=`translateY(${eased*motion.paw}px) rotate(${-eased*motion.tilt*.55}deg)`;
    paintFace(s);
  }
  function tick(time){
    raf=0;
    if(document.hidden)return;
    const dt=Math.min((time-last)/1000||1/60,.05);last=time;
    let moving=false;
    for(const s of states){
      if(!s.visible)continue;
      if(reduced.matches)continue;
      moving=spring(s,'x',s.tx,dt)||moving;
      moving=spring(s,'y',s.ty,dt)||moving;
      moving=spring(s,'joy',time<s.happyUntil?1:0,dt)||moving;
      const staged=time<s.happyUntil;
      const target=expression(staged
        ?faces[s.p.mode].react[time-s.reactStart<480?0:1]
        :faces[s.p.mode].idle[s.idleIndex]);
      moving=springFace(s,target,dt)||moving;
      paint(s);
      if(time<s.happyUntil)moving=true;
    }
    if(moving)raf=requestAnimationFrame(tick);
  }
  function scheduleIdle(s){
    clearTimeout(s.idleTimer);
    if(!s.visible||reduced.matches)return;
    s.idleTimer=setTimeout(()=>{
      s.idleIndex=(s.idleIndex+1)%faces[s.p.mode].idle.length;
      wake();scheduleIdle(s);
    },2500+s.index*340);
  }
  const observer=new IntersectionObserver(entries=>{
    for(const e of entries){const s=states.find(s=>s.node===e.target);s.visible=e.isIntersecting;s.node.classList.toggle('is-visible',s.visible);scheduleIdle(s);}
    wake();
  },{rootMargin:'40px'});
  for(const [id,p] of Object.entries(personalities)){
    const node=document.getElementById(id);if(!node)continue;
    node.className=`cat companion companion-${p.mode}`;
    node.setAttribute('aria-label',p.label);node.title=p.label;
    const prop=p.mode==='code'
      ? '<g class="cat-prop"><path d="M23 60H63L59 74H27Z" fill="var(--cat-prop)" stroke="var(--cat-line)" stroke-width="1"/><path d="M19 75H66" stroke="var(--cat-line)" stroke-linecap="round"/><path d="M40 65L37 67L40 69M47 65L50 67L47 69" fill="none" stroke="var(--cat-accent)" stroke-width="1"/></g>'
      : p.mode==='curious'
      ? '<g class="cat-prop" fill="var(--cat-prop)" stroke="var(--cat-line)" stroke-width="1"><path d="M22 61Q33 58 43 63V76Q32 71 22 74ZM43 63Q54 58 65 61V74Q54 71 43 76Z"/><path d="M27 65L37 66M49 66L59 65M27 69L37 70M49 70L59 69" opacity=".5"/></g>'
      : p.mode==='sport'
      ? '<g class="cat-ball"><circle cx="73" cy="72" r="8" fill="var(--cat-accent)"/><path d="M65 72H81M73 64Q67 72 73 80M73 64Q79 72 73 80" stroke="var(--cat-line)" fill="none" stroke-width=".8"/></g>'
      : p.mode==='celebrate'
      ? '<path class="cat-star" d="M70 7L72 12L77 14L72 16L70 21L68 16L63 14L68 12Z" fill="var(--cat-accent)"/>' : '';
    node.innerHTML=`<svg viewBox="0 0 84 84" aria-hidden="true" focusable="false">
      <ellipse class="companion-shadow" cx="43" cy="76" rx="23" ry="2"/>
      <g class="companion-breathe">
        <path class="companion-tail" d="M62 67C80 74 80 53 73 56" fill="none" stroke-width="5" stroke-linecap="round"/>
        <g class="companion-head">
          <path class="companion-shell" d="M18 37Q17 31 21 25Q23 22 26 25L34 30Q43 27 52 30L60 25Q64 22 66 26Q69 32 68 38C79 56 69 75 43 75C17 75 7 56 18 37Z"/>
          ${p.mode==='sport' ? '<g class="cat-headband"><path d="M19 36Q43 30 68 36L67 41Q43 35 19 41Z" fill="var(--cat-band)"/><path d="M21 38Q43 33 65 38" fill="none" stroke="var(--cat-fur)" stroke-width=".8" opacity=".7"/><g class="cat-band-ribbons" fill="var(--cat-band)"><path d="M66 36Q74 30 79 34L75 38Q70 35 66 38ZM66 37Q73 37 77 43L72 44Q70 39 66 39Z"/><circle cx="66" cy="37" r="2.5"/></g></g>' : ''}
          <g class="companion-gaze">
            <g class="cat-brows" fill="none" stroke="var(--cat-face)" stroke-width="1.15" stroke-linecap="round"><path class="cat-brow-left"/><path class="cat-brow-right"/></g>
            <g class="cat-normal-eyes" fill="var(--cat-face)">
              <g class="cat-eye-left"><ellipse class="cat-eye-shape"/><ellipse class="cat-eye-glint" rx=".55" ry=".7" fill="var(--cat-fur)"/></g>
              <g class="cat-eye-right"><ellipse class="cat-eye-shape"/><ellipse class="cat-eye-glint" rx=".55" ry=".7" fill="var(--cat-fur)"/></g>
            </g>
            <g class="cat-star-eyes" fill="var(--cat-face)" opacity="0"><path d="M34 39L35 43L39 45L35 47L34 51L33 47L29 45L33 43ZM53 39L54 43L58 45L54 47L53 51L52 47L48 45L52 43Z"/></g>
            <path class="cat-nose" d="M41 51L45 51L43 53Z"/>
            <path class="cat-smile" fill="none" stroke="var(--cat-face)" stroke-width="1.35" stroke-linecap="round"/>
            <ellipse class="cat-oh" cx="43" cy="56" rx="2.2" fill="none" stroke="var(--cat-face)" stroke-width="1.2" opacity="0"/>
            <g class="cat-blush" fill="var(--cat-accent)" opacity="0"><ellipse cx="27" cy="53" rx="3" ry="1.5"/><ellipse cx="59" cy="53" rx="3" ry="1.5"/></g>
          </g>
          ${prop}
          <g class="companion-hands"><g class="cat-paw-left"><ellipse class="companion-paw" cx="29" cy="${p.mode==='code'?61:69}" rx="6" ry="4"/></g><g class="cat-paw-right"><ellipse class="companion-paw" cx="58" cy="${p.mode==='code'?61:69}" rx="6" ry="4"/></g></g>
        </g>
      </g>
    </svg><span class="companion-bubble" aria-hidden="true">${p.symbol}</span>`;
    const get=(selector)=>node.querySelector(selector);
    const s={node,p,index:states.length,visible:false,x:0,y:0,joy:0,xV:0,yV:0,joyV:0,tx:0,ty:0,happyUntil:0,reactStart:0,idleIndex:0,
      face:expression(faces[p.mode].idle[0]),faceV:Object.fromEntries(faceKeys.map(key=>[key,0])),
      gaze:node.querySelector('.companion-gaze'),head:node.querySelector('.companion-head'),
      eyes:{left:{shape:get('.cat-eye-left .cat-eye-shape'),glint:get('.cat-eye-left .cat-eye-glint')},right:{shape:get('.cat-eye-right .cat-eye-shape'),glint:get('.cat-eye-right .cat-eye-glint')}},
      brows:[get('.cat-brow-left'),get('.cat-brow-right')],browGroup:get('.cat-brows'),
      normalEyes:get('.cat-normal-eyes'),starEyes:get('.cat-star-eyes'),smile:get('.cat-smile'),oh:get('.cat-oh'),blush:get('.cat-blush'),
      bubble:get('.companion-bubble'),tail:get('.companion-tail'),hands:get('.companion-hands')};
    s.bubble.textContent=p.symbol;
    paint(s);
    states.push(s);observer.observe(node);
    node.style.setProperty('--idle-delay',`${-states.length*.71}s`);
    const react=()=>{
      s.reactStart=performance.now();s.happyUntil=s.reactStart+1800;
      if(reduced.matches){
        s.face=expression(faces[p.mode].react[1]);s.joy=1;paint(s);
        clearTimeout(s.timer);s.timer=setTimeout(()=>{s.face=expression(faces[p.mode].idle[s.idleIndex]);s.joy=0;paint(s);},1800);
      }else wake();
    };
    node.addEventListener('click',react);
    node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();react();}});
  }
  const look=(e)=>{
    if(reduced.matches||e.pointerType==='touch')return;
    for(const s of states){
      if(!s.visible)continue;
      const r=s.node.getBoundingClientRect();
      s.tx=Math.atan((e.clientX-r.x-r.width/2)/95)*2.6;
      s.ty=Math.atan((e.clientY-r.y-r.height/2)/120)*1.7;
    }
    wake();
  };
  document.addEventListener('pointermove',look,{passive:true});
  const reset=()=>{for(const s of states)s.tx=s.ty=0;wake();};
  document.addEventListener('pointerout',e=>{if(!e.relatedTarget)reset();});
  window.addEventListener('blur',reset);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)wake();});
  reduced.addEventListener('change',wake);
})();
