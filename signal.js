/* The name remains an accessible h1; the canvas adds a local optical field. */
(() => {
  const canvas = document.getElementById('signalCanvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const holder = canvas.parentElement;
  const title = document.getElementById('profile-name');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mask = document.createElement('canvas');
  const ink = mask.getContext('2d', {willReadFrequently: true});
  let w = 0, h = 0, dots = [], pointer = null, target = null, raf = 0, visible = true;
  let lastTime = 0, strength = 0, pulse = 0;
  const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
  function resize() {
    w = Math.round(canvas.clientWidth); h = Math.round(canvas.clientHeight);
    if (!w || !h) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = w*dpr; canvas.height = h*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
    mask.width = w; mask.height = h;
    const name = title.textContent;
    let size = Math.min(44, w/(name.length*.98));
    ink.font = `${size}px "Press Start 2P", monospace`;
    const measured = ink.measureText(name).width;
    if (measured > w-12) { size *= (w-12)/measured; ink.font = `${size}px "Press Start 2P", monospace`; }
    ink.textBaseline = 'middle'; ink.fillStyle = '#fff';
    ink.fillText(name, 1, h*.52);
    const pixels = ink.getImageData(0,0,w,h).data;
    dots = [];
    // Fine screen-door sampling preserves the solid silhouette at reading distance.
    const step = w < 400 ? 1.75 : 2.2;
    for(let y=0;y<h;y+=step) for(let x=0;x<w;x+=step) {
      if(pixels[(Math.floor(y)*w+Math.floor(x))*4+3]>90) dots.push({x,y,a:.83+((Math.floor(x)*13+Math.floor(y)*7)%17)/100});
    }
    holder.classList.add('ready'); draw();
  }
  function draw() {
    ctx.clearRect(0,0,w,h);
    const day = document.documentElement.classList.contains('day');
    const nameInk=ctx.createLinearGradient(0,0,w,0);
    nameInk.addColorStop(0,day?'#286e7c':'#f0d9a7');
    nameInk.addColorStop(1,day?'#456e65':'#8dd9d2');
    ctx.fillStyle=nameInk;
    for(const dot of dots) {
      let x=dot.x,y=dot.y,alpha=dot.a;
      if(pointer && strength>0 && !reduced.matches) {
        const dx=x-pointer.x,dy=y-pointer.y,r=Math.hypot(dx,dy),radius=43+pulse*13;
        const influence=Math.exp(-Math.pow(r/radius,2)*1.5)*strength;
        // A continuous radial refraction, with horizontal scan-line displacement.
        x+=dx*influence*.55 + Math.sin(y*.25)*influence*1.2;
        y+=dy*influence*.26; alpha=clamp(alpha+influence*.16,0,1);
      }
      ctx.globalAlpha=alpha; ctx.fillRect(x,y,1.65,1.65);
    }
    ctx.globalAlpha=1;
  }

  function tick(time) {
    raf=0;
    if(!visible || document.hidden || reduced.matches) { strength=0; draw(); return; }
    const dt=Math.min((time-lastTime)||16,40);lastTime=time;
    const blend=1-Math.exp(-dt/65);
    if(target) { if(!pointer) pointer={...target}; pointer.x+=(target.x-pointer.x)*blend;pointer.y+=(target.y-pointer.y)*blend; }
    strength+=((target?1:0)-strength)*blend; pulse*=Math.exp(-dt/180);
    draw();
    const moving=target && (Math.abs(pointer.x-target.x)+Math.abs(pointer.y-target.y)>.1);
    if(moving || Math.abs(strength-(target?1:0))>.005 || pulse>.005) raf=requestAnimationFrame(tick);
    else if(!target) {strength=0;pointer=null;draw();}
  }
  function wake() { if(!raf) {lastTime=0;raf=requestAnimationFrame(tick);} }
  function locate(e) { const r=canvas.getBoundingClientRect(); target={x:e.clientX-r.left,y:e.clientY-r.top};wake(); }
  canvas.addEventListener('pointermove',locate);
  canvas.addEventListener('pointerleave',()=>{target=null;wake();});
  canvas.addEventListener('pointerdown',e=>{locate(e);pulse=1;wake();});
  canvas.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse'){target=null;wake();}});
  canvas.addEventListener('pointercancel',()=>{target=null;wake();});
  new ResizeObserver(resize).observe(canvas);
  new MutationObserver(draw).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  new MutationObserver(resize).observe(title,{childList:true,characterData:true,subtree:true});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)wake();}).observe(canvas);
  reduced.addEventListener('change',()=>{strength=0;draw();});
  document.fonts.ready.then(resize);
})();
