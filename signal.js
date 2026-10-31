/* A local, deterministic dot field; no remote graphics or WebGL required. */
(() => {
  const canvas = document.getElementById('signalCanvas');
  const ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0, height = 0, dots = [], frame = 0, visible = false;
  let pointer = null, pulse = 0;
  const mask = document.createElement('canvas');
  const ink = mask.getContext('2d', { willReadFrequently: true });
  function resize() {
    width = Math.round(canvas.clientWidth); height = Math.round(canvas.clientHeight);
    const scale = Math.min(devicePixelRatio || 1, 2);
    canvas.width = width * scale; canvas.height = height * scale;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    mask.width = width; mask.height = height;
    ink.font = `900 ${Math.min(width / 8.5, 108)}px monospace`;
    ink.textAlign = 'center'; ink.textBaseline = 'middle';
    ink.fillText('ZHONGYU HE', width / 2, height / 2);
    const pixels = ink.getImageData(0, 0, width, height).data;
    dots = [];
    for (let y = 2; y < height; y += 4) for (let x = 2; x < width; x += 4) {
      const word = pixels[(y * width + x) * 4 + 3] > 100;
      const dx = (x - width * .5) / (width * .43), dy = (y - height * .5) / (height * .42);
      const orbit = Math.abs(dx * dx + dy * dy - 1) < .18;
      const hash = ((x * 137 + y * 79) % 101) / 101;
      if (word || (orbit && hash > .38)) dots.push({x,y,word,a: word ? .8 : .1 + hash * .18});
    }
    draw();
  }
  function draw() {
    ctx.clearRect(0,0,width,height);
    const day = document.documentElement.classList.contains('day');
    ctx.fillStyle = day ? '#354f4a' : '#c7d6cf';
    for (const dot of dots) {
      let x = dot.x, y = dot.y, light = dot.a;
      if (pointer && !reduced.matches) {
        const dx = x - pointer.x, dy = y - pointer.y, distance = Math.hypot(dx,dy);
        const force = Math.max(0, 1 - distance / 90);
        x += dx * force * .3; y += dy * force * .45;
        light = Math.min(1, light + force * .5);
      }
      ctx.globalAlpha = light;
      ctx.fillRect(x,y, dot.word ? 2.6 : 2, dot.word ? 2.6 : 2);
    }
    ctx.globalAlpha = 1;
    if (pointer && !reduced.matches) {
      ctx.strokeStyle = day ? '#7a9185' : '#aac7be';
      ctx.lineWidth = .7; ctx.beginPath();
      ctx.arc(pointer.x,pointer.y,30 + pulse * 18,0,Math.PI * 2); ctx.stroke();
    }
  }
  function animate() {
    frame = 0; if (!visible || document.hidden || reduced.matches) return;
    pulse *= .93; draw();
    if (pulse > .01) frame = requestAnimationFrame(animate);
  }
  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect(); pointer = {x:e.clientX-r.left,y:e.clientY-r.top}; draw();
  });
  canvas.addEventListener('pointerleave', () => { pointer = null; draw(); });
  canvas.addEventListener('pointerdown', e => {
    const r = canvas.getBoundingClientRect(); pointer = {x:e.clientX-r.left,y:e.clientY-r.top}; pulse = 1;
    if (!frame) frame = requestAnimationFrame(animate);
  });
  canvas.addEventListener('pointerup', e => { if(e.pointerType !== 'mouse') { pointer=null; draw(); } });
  new ResizeObserver(resize).observe(canvas);
  new MutationObserver(draw).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  new IntersectionObserver(entries => { visible=entries[0].isIntersecting; if(visible) draw(); }).observe(canvas);
  reduced.addEventListener('change', draw);
  document.fonts.ready.then(resize);
})();
