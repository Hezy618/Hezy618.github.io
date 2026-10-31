/* A coherent ASCII wavefront: no opaque curtain and no detached DOM columns. */
(() => {
  let running = false;
  window.runPixelTransition = function(changeTheme) {
    if(running) return Promise.resolve();
    if(matchMedia('(prefers-reduced-motion: reduce)').matches) {changeTheme();return Promise.resolve();}
    running=true;
    return new Promise(resolve => {
      const canvas=document.createElement('canvas');
      canvas.className='theme-wipe';canvas.setAttribute('aria-hidden','true');canvas.setAttribute('popover','manual');
      const w=innerWidth,h=innerHeight,dpr=Math.min(devicePixelRatio||1,1.5);
      canvas.width=w*dpr;canvas.height=h*dpr;
      const ctx=canvas.getContext('2d');
      let changed=false,done=false,raf=0;
      const finish=()=>{if(done)return;done=true;cancelAnimationFrame(raf);canvas.remove();document.documentElement.classList.remove('pixel-transition-active');document.documentElement.style.removeProperty('--theme-mask');running=false;resolve();};
      const swap=()=>{if(changed)return;changed=true;changeTheme();};
      if(!ctx){swap();finish();return;}
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.font='10px monospace';ctx.textBaseline='top';
      document.body.append(canvas);
      try {if(canvas.showPopover)canvas.showPopover();}catch { /* fixed positioning remains available */ }
      const chars='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ:+/<>*';
      const cells=[];
      for(let y=0;y<h+14;y+=13) for(let x=0;x<w;x+=9) {
        let seed=Math.imul(x+31,374761393)^Math.imul(y+17,668265263);
        seed=Math.imul(seed^(seed>>>13),1274126177);
        const hash=((seed^(seed>>>16))>>>0)/4294967296;
        cells.push({x,y,hash,char:chars[Math.floor(hash*chars.length)]});
      }
      const toNight=document.documentElement.classList.contains('day');
      document.documentElement.classList.add('pixel-transition-active');
      const start=performance.now(),duration=1250;
      // The timeout guarantees cleanup in hidden tabs, where rAF can be suspended.
      const timer=setTimeout(()=>{swap();finish();},1800);
      const render=now=>{
        if(done)return;
        const p=Math.min(1,(now-start)/duration);
        ctx.clearRect(0,0,w,h);
        const front=h+140-p*(h+340);
        const envelope=Math.sin(Math.PI*p)**.7;
        const points=[];
        for(let i=0;i<=20;i++){
          const x=i/20*w;
          const wave=Math.sin(x/w*5.2+p*2.5)*32+Math.sin(x*.013)*9;
          points.push(`${i*5}% ${Math.max(0,Math.min(h,front+wave))}px`);
        }
        document.documentElement.style.setProperty('--theme-mask',`polygon(${points.join(',')},100% 100%,0 100%)`);
        ctx.fillStyle=toNight?'#9acfd6':'#628b8c';
        for(const c of cells){
          const wave=Math.sin(c.x/w*5.2+p*2.5)*32+Math.sin(c.x*.013)*9;
          const distance=c.y-front-wave;
          const density=Math.exp(-Math.pow(distance/(h*.13+45),2));
          if(density<.025 || c.hash>density*.92)continue;
          ctx.globalAlpha=envelope*density*(.18+c.hash*.7);
          ctx.fillText(c.char,c.x,c.y+(1-density)*18);
        }
        ctx.globalAlpha=1;
        if(p>=.44 && !changed){
          if(document.startViewTransition){
            try {const t=document.startViewTransition(swap);t.finished.catch(()=>{});}catch{swap();}
          }else swap();
        }
        if(p<1)raf=requestAnimationFrame(render);else{clearTimeout(timer);swap();finish();}
      };
      raf=requestAnimationFrame(render);
    });
  };
})();
