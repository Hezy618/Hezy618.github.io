/* Original cat companions: shared, interruption-safe spring motion. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const personalities = {
    catAbout: {symbol:'♥',label:'Pet the cat',mode:'love'},
    catType: {symbol:'</>',label:'Say hello to the coding cat',mode:'code'},
    catPatrol: {symbol:'✦',label:'Greet the reading cat',mode:'curious'},
    catFirework: {symbol:'✧',label:'Celebrate with the cat',mode:'celebrate'},
    catSit: {symbol:'♪',label:'Wake the resting cat',mode:'music'},
  };
  const states=[];
  let raf=0,last=0;
  function wake(){if(!raf){last=0;raf=requestAnimationFrame(tick);}}
  const spring=(s,key,target,dt)=>{
    const velocity=key+'V';
    // Analytic critically damped spring: stable under interruptions and frame drops.
    const omega=key==='joy'?11:15,offset=s[key]-target,decay=Math.exp(-omega*dt);
    const c=s[velocity]+omega*offset;
    s[key]=target+(offset+c*dt)*decay;
    s[velocity]=(s[velocity]-omega*c*dt)*decay;
    return Math.abs(s[key]-target)+Math.abs(s[velocity])>.003;
  };
  function paint(s){
    const joy=s.joy;
    s.gaze.style.transform=`translate(${s.x}px,${s.y}px)`;
    s.head.style.transform=`translateY(${-joy*3}px) rotate(${s.x*.5+joy*2}deg) scale(${1+joy*.035},${1-joy*.02})`;
    s.node.style.setProperty('--joy',joy.toFixed(4));
    s.closed.style.opacity=joy;
    s.open.style.opacity=1-joy;
    s.bubble.style.opacity=joy;
    s.bubble.style.transform=`translateY(${(1-joy)*8}px) scale(${.8+joy*.2})`;
    s.tail.style.transform=`rotate(${-joy*24+s.x*1.5}deg)`;
    s.hands.style.transform=`translateY(${-joy*4}px) rotate(${-joy*8}deg)`;
  }
  function tick(time){
    raf=0;
    if(document.hidden)return;
    const dt=Math.min((time-last)/1000||1/60,.05);last=time;
    let moving=false;
    for(const s of states){
      if(!s.visible)continue;
      if(reduced.matches){s.x=s.y=s.joy=s.xV=s.yV=s.joyV=0;paint(s);continue;}
      moving=spring(s,'x',s.tx,dt)||moving;
      moving=spring(s,'y',s.ty,dt)||moving;
      moving=spring(s,'joy',time<s.happyUntil?1:0,dt)||moving;
      paint(s);
      if(time<s.happyUntil)moving=true;
    }
    if(moving)raf=requestAnimationFrame(tick);
  }
  const observer=new IntersectionObserver(entries=>{
    for(const e of entries){const s=states.find(s=>s.node===e.target);s.visible=e.isIntersecting;s.node.classList.toggle('is-visible',s.visible);}
    wake();
  },{rootMargin:'40px'});
  for(const [id,p] of Object.entries(personalities)){
    const node=document.getElementById(id);if(!node)continue;
    node.className=`cat companion companion-${p.mode}`;
    node.setAttribute('aria-label',p.label);node.title=p.label;
    const eyes=p.mode==='music'
      ? '<path d="M30 46 Q34 49 38 46 M49 46 Q53 49 57 46" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
      : '<ellipse cx="34" cy="45" rx="2" ry="3.3"/><ellipse cx="53" cy="45" rx="2" ry="3.3"/>';
    const prop=p.mode==='code'
      ? '<g class="cat-prop"><path d="M23 60H63L59 74H27Z" fill="var(--cat-prop)" stroke="var(--cat-line)" stroke-width="1"/><path d="M19 75H66" stroke="var(--cat-line)" stroke-linecap="round"/><path d="M40 65L37 67L40 69M47 65L50 67L47 69" fill="none" stroke="var(--cat-accent)" stroke-width="1"/></g>'
      : p.mode==='curious'
      ? '<g class="cat-prop" fill="var(--cat-prop)" stroke="var(--cat-line)" stroke-width="1"><path d="M22 61Q33 58 43 63V76Q32 71 22 74ZM43 63Q54 58 65 61V74Q54 71 43 76Z"/><path d="M27 65L37 66M49 66L59 65M27 69L37 70M49 70L59 69" opacity=".5"/></g>'
      : p.mode==='celebrate'
      ? '<path class="cat-star" d="M70 7L72 12L77 14L72 16L70 21L68 16L63 14L68 12Z" fill="var(--cat-accent)"/>' : '';
    node.innerHTML=`<svg viewBox="0 0 84 84" aria-hidden="true" focusable="false">
      <ellipse class="companion-shadow" cx="43" cy="76" rx="23" ry="2"/>
      <g class="companion-breathe">
        <path class="companion-tail" d="M62 67C80 74 80 53 73 56" fill="none" stroke-width="5" stroke-linecap="round"/>
        <g class="companion-head">
          <path class="companion-shell" d="M17 35L18 16Q18 12 22 16L33 25Q43 22 53 25L64 16Q68 12 68 17L68 36C80 55 69 75 43 75C17 75 6 55 17 35Z"/>
          <g class="companion-gaze">
            <g class="companion-open"><g class="companion-blink">${eyes}</g></g>
            <g class="companion-happy" opacity="0" fill="none" stroke-width="1.8" stroke-linecap="round"><path d="M30 46Q34 41 38 46M49 46Q53 41 57 46"/></g>
            <path class="cat-nose" d="M41 51L45 51L43 53Z"/>
            <path class="cat-mouth" d="M43 53V55Q40 59 38 55M43 55Q46 59 48 55" fill="none" stroke-width="1" stroke-linecap="round"/>
          </g>
          <g class="companion-hands"><ellipse class="companion-paw" cx="29" cy="69" rx="6" ry="4"/><ellipse class="companion-paw" cx="58" cy="69" rx="6" ry="4"/></g>
          ${prop}
        </g>
      </g>
    </svg><span class="companion-bubble" aria-hidden="true">${p.symbol}</span>`;
    const s={node,p,visible:false,x:0,y:0,joy:0,xV:0,yV:0,joyV:0,tx:0,ty:0,happyUntil:0,
      gaze:node.querySelector('.companion-gaze'),head:node.querySelector('.companion-head'),
      open:node.querySelector('.companion-open'),closed:node.querySelector('.companion-happy'),
      bubble:node.querySelector('.companion-bubble'),tail:node.querySelector('.companion-tail'),hands:node.querySelector('.companion-hands')};
    states.push(s);observer.observe(node);
    node.style.setProperty('--idle-delay',`${-states.length*.71}s`);
    const react=()=>{s.happyUntil=performance.now()+1450;if(reduced.matches){node.classList.add('static-happy');clearTimeout(s.timer);s.timer=setTimeout(()=>node.classList.remove('static-happy'),1450);}else wake();};
    node.addEventListener('click',react);
    node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();react();}});
    node.closest('.panel').addEventListener('pointermove',e=>{
      if(reduced.matches||e.pointerType==='touch')return;
      const r=node.getBoundingClientRect();
      s.tx=Math.max(-3.2,Math.min(3.2,(e.clientX-r.x-r.width/2)/65));
      s.ty=Math.max(-1.8,Math.min(1.8,(e.clientY-r.y-r.height/2)/85));wake();
    });
    node.closest('.panel').addEventListener('pointerleave',()=>{s.tx=s.ty=0;wake();});
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)wake();});
  reduced.addEventListener('change',wake);
})();
