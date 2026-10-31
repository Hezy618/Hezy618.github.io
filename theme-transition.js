/* One dithered horizon shared by the theme reveal and its ASCII dust. */
(() => {
  let running=false;
  const hash=(x,y)=>{let n=Math.imul(x+73,374761393)^Math.imul(y+31,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967296;};
  window.runPixelTransition=changeTheme=>{
    if(running)return Promise.resolve();
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){changeTheme();return Promise.resolve();}
    running=true;
    return new Promise(resolve=>{
      const canvas=document.createElement('canvas');canvas.className='theme-wipe';canvas.setAttribute('aria-hidden','true');canvas.setAttribute('popover','manual');
      const w=innerWidth,h=innerHeight,dpr=Math.min(devicePixelRatio||1,1.5);
      canvas.width=w*dpr;canvas.height=h*dpr;
      const ctx=canvas.getContext('2d');
      let changed=false,done=false,raf=0,timer,transition=null;
      const root=document.documentElement,toNight=root.classList.contains('day');
      const swap=()=>{if(!changed){changed=true;changeTheme();}};
      const finish=async()=>{
        if(done)return;done=true;clearTimeout(timer);cancelAnimationFrame(raf);
        root.style.setProperty('--theme-mask','inset(0)');
        // Keep the reveal rules alive until the browser has released both snapshots.
        if(transition){await transition.ready.catch(()=>{});await transition.finished.catch(()=>{});}
        canvas.remove();root.classList.remove('pixel-transition-active');root.style.removeProperty('--theme-mask');
        window.dispatchEvent(new Event('cosmic-transition-end'));running=false;resolve();
      };
      if(!ctx){swap();finish();return;}
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.font=`${w<700?11:12}px monospace`;ctx.textBaseline='top';
      document.body.append(canvas);try{canvas.showPopover?.();}catch{}
      const stepX=w<700?9:10,stepY=14;
      const sample=document.createElement('canvas');sample.width=Math.ceil(w/stepX);sample.height=Math.ceil(h/stepY);
      const sc=sample.getContext('2d',{willReadFrequently:true});
      const space=document.getElementById('cosmicCanvas');
      if(space)sc.drawImage(space,0,0,sample.width,sample.height);
      const rgba=sc.getImageData(0,0,sample.width,sample.height).data;
      const glyphs='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$*+:/';
      const cells=[];
      for(let y=0;y<h;y+=stepY)for(let x=0;x<w;x+=stepX){
        const seed=hash(x,y),index=(Math.floor(y/stepY)*sample.width+Math.floor(x/stepX))*4;
        const luminance=(rgba[index]*.2126+rgba[index+1]*.7152+rgba[index+2]*.0722)/255;
        cells.push({x,y,seed,luminance,char:glyphs[Math.floor(seed*glyphs.length)]});
      }
      root.classList.add('pixel-transition-active');
      window.dispatchEvent(new Event('cosmic-transition-start'));
      const start=performance.now(),duration=1550;
      timer=setTimeout(()=>{swap();transition?.skipTransition();finish();},2300);
      const ridge=(x,p)=>Math.sin(x/w*5.8+p*2.1)*h*.045+Math.sin(x*.018+p)*12;
      const render=now=>{
        if(done)return;
        const p=Math.min(1,(now-start)/duration),front=h+170-p*(h+350);
        const envelope=Math.min(1,p*7,(1-p)*7);
        ctx.clearRect(0,0,w,h);
        // Stair-step boundary rather than a smooth geometric curtain.
        const points=[],maskStep=18;
        for(let x=0;x<=w+maskStep;x+=maskStep){
          const y=Math.max(0,Math.min(h,Math.round((front+ridge(x,p))/maskStep)*maskStep));
          points.push(`${Math.min(x,w)}px ${y}px`,`${Math.min(x+maskStep,w)}px ${y}px`);
        }
        root.style.setProperty('--theme-mask',`polygon(${points.join(',')},100% 100%,0 100%)`);
        for(const c of cells){
          const distance=c.y-front-ridge(c.x,p),width=h*.105+46;
          const core=Math.exp(-Math.pow(distance/width,2));
          const ash=Math.exp(-Math.pow((distance+width*.85)/(width*1.7),2))*.22;
          const density=Math.max(core,ash);
          const texture=toNight?1-c.luminance:c.luminance;
          if(density<.025||c.seed>density*(.72+texture*.24))continue;
          const onNew=c.y>front+ridge(c.x,p);
          const dark=onNew?toNight:!toNight;
          ctx.fillStyle=dark?(c.seed>.85?'#ead7aa':'#b0d0cf'):(c.seed>.85?'#927049':'#3d7279');
          ctx.globalAlpha=envelope*density*(.3+c.seed*.66);
          const drift=(1-core)*(1-c.seed)*32;
          if(core>.18&&core<.65&&c.seed>.65){
            ctx.globalAlpha*=.5;const size=3+Math.floor(c.seed*3);ctx.fillRect(c.x,c.y-drift,size,size);
          }else{
            const char=core>.55?c.char:glyphs[(Math.floor(c.seed*glyphs.length)+Math.floor(p*9))%glyphs.length];
            ctx.fillText(char,c.x,c.y-drift);
          }
        }
        ctx.globalAlpha=1;
        if(p>=.22&&!changed){
          if(document.startViewTransition){try{transition=document.startViewTransition(swap);transition.finished.catch(()=>{});}catch{swap();}}else swap();
        }
        if(p<1)raf=requestAnimationFrame(render);else{swap();finish();}
      };
      raf=requestAnimationFrame(render);
    });
  };
})();
