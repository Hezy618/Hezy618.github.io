/* Original cat companions: shared, interruption-safe spring motion. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const personalities = {
    catAbout: {color:'rose',symbol:'♥',label:'Pet the cat',mode:'love'},
    catType: {color:'blue',symbol:'</>',label:'Say hello to the coding cat',mode:'code'},
    catPatrol: {color:'mint',symbol:'✦',label:'Greet the curious research cat',mode:'curious'},
    catFirework: {color:'gold',symbol:'✧',label:'Celebrate with the cat',mode:'celebrate'},
    catSit: {color:'lilac',symbol:'♪',label:'Play with the music cat',mode:'music'},
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
    node.className=`cat companion companion-${p.color}`;
    node.setAttribute('aria-label',p.label);node.title=p.label;
    node.innerHTML=`<svg viewBox="0 0 84 84" aria-hidden="true" focusable="false">
      <ellipse class="companion-shadow" cx="43" cy="75" rx="23" ry="3"/>
      <g class="companion-breathe">
        <path class="companion-tail" d="M63 65 Q82 66 76 49" fill="none" stroke-width="6" stroke-linecap="round"/>
        <g class="companion-head">
          <path class="companion-shell" d="M18 32 L18 16 Q18 11 23 15 L34 23 Q42 21 50 23 L61 15 Q66 11 66 17 L66 32 C80 51 70 73 43 73 C15 73 5 52 18 32Z"/>
          <path class="companion-ear" d="M22 20 L22 31 L31 26Z M62 20 L54 26 L62 31Z"/>
          <path class="companion-highlight" d="M22 36 Q28 27 40 28" fill="none" stroke-width="2" stroke-linecap="round"/>
          <rect class="companion-visor" x="20" y="36" width="47" height="23" rx="11.5"/>
          <g class="companion-gaze">
            <g class="companion-open"><g class="companion-blink"><rect x="31" y="42" width="4" height="10" rx="2"/><rect x="51" y="42" width="4" height="10" rx="2"/></g></g>
            <g class="companion-happy" opacity="0" fill="none" stroke-width="2.5" stroke-linecap="round"><path d="M29 48 Q33 42 37 48 M49 48 Q53 42 57 48"/></g>
          </g>
          <circle class="companion-cheek" cx="26" cy="54" r="2"/><circle class="companion-cheek" cx="61" cy="54" r="2"/>
          <g class="companion-hands"><ellipse class="companion-paw" cx="27" cy="68" rx="7" ry="4"/><ellipse class="companion-paw" cx="59" cy="68" rx="7" ry="4"/></g>
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
