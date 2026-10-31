/* Deterministic, low-resolution astronomy: projected rotating spheres, ordered dither. */
(() => {
  const canvas=document.getElementById('cosmicCanvas'),ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const plate=document.createElement('canvas'),sky=plate.getContext('2d',{alpha:false});
  const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  const hash=(x,y)=>{let s=Math.imul(x+73,374761393)^Math.imul(y+31,668265263);s=Math.imul(s^(s>>>13),1274126177);return((s^(s>>>16))>>>0)/4294967296;};
  const craters=[[-.35,-.40,.85,.20],[.40,-.15,.90,.25],[-.12,.45,.88,.16],[.24,-.65,.72,.13],[-.65,.1,.75,.18],[.52,.48,.70,.11]].map(([x,y,z,r])=>{const n=Math.hypot(x,y,z);return{x:x/n,y:y/n,z:z/n,inner:Math.cos(r),outer:Math.cos(r+.035)};});
  let w=0,h=0,day=true,stars=[],planets=[],frame=0,last=0,time=0,then=0,small=false;
  const palettes={night:['#171b2c','#26364b','#3b5368','#587787','#8aa5ac','#c2c3ad'],day:['#dce6e1','#cbdad4','#b4c9c0','#9bb6ac','#82a399','#6c9086']};
  function sphere(cx,cy,r,variant){
    const points=[],step=small?5:5;
    for(let y=-r;y<=r;y+=step)for(let x=-r;x<=r;x+=step){
      const nx=x/r,ny=y/r,rr=nx*nx+ny*ny;if(rr>1)continue;
      const nz=Math.sqrt(1-rr),lat=Math.asin(ny),lon=Math.atan2(nx,nz);
      const light=Math.max(0,-nx*.52-ny*.4+nz*.75);
      points.push({x:cx+x,y:cy+y,nx,ny,nz,lat,lon,light,edge:Math.min(1,nz*7),dither:bayer[((Math.floor(x/step)&3)+((Math.floor(y/step)&3)*4))]/16});
    }
    return{points,step,variant};
  }
  function bake(){
    day=document.documentElement.classList.contains('day');
    sky.fillStyle=day?'#f2f6f0':'#101426';sky.fillRect(0,0,w,h);
    // A long galactic dust lane, with low-frequency folds and ordered screening.
    const cell=small?6:5,angle=-.43,co=Math.cos(angle),si=Math.sin(angle);
    const colors=day?['#e8f0e7','#dce9df','#cfdfd5','#c0d5cb']:['#171e34','#202943','#2e3b55','#405269'];
    for(let y=0;y<h;y+=cell)for(let x=0;x<w;x+=cell){
      const dx=x-w*.64,dy=y-h*.32,u=dx*co+dy*si,v=-dx*si+dy*co;
      const fold=v+Math.sin(u*.006)*38+Math.sin(u*.014)*12;
      const band=Math.exp(-Math.pow(fold/(small?72:105),2));
      const clouds=.52+.24*Math.sin(u*.008+v*.011)+.17*Math.sin(u*.023-v*.016);
      const luminosity=band*clouds;
      const threshold=bayer[(Math.floor(x/cell)&3)+(Math.floor(y/cell)&3)*4]/16;
      if(luminosity>.08+threshold*.8){
        const quiet=1-.65*Math.exp(-Math.pow((x-w*.5)/(w*.28),4))*Math.exp(-Math.pow((y-h*.3)/(h*.3),4));
        sky.globalAlpha=(day?.36:.52)*quiet;
        sky.fillStyle=colors[Math.min(3,Math.floor(luminosity*4))];sky.fillRect(x,y,cell-1,cell-1);
      }
    }
    sky.globalAlpha=1;
    for(const s of stars){sky.globalAlpha=day?s.a*.36:s.a;sky.fillStyle=s.warm?(day?'#b99b6b':'#d4bf94'):(day?'#709e99':'#92b7c4');sky.fillRect(s.x,s.y,s.size,s.size);}
    sky.globalAlpha=1;
  }
  function resize(){
    w=innerWidth;h=innerHeight;small=w<700;
    canvas.width=plate.width=w;canvas.height=plate.height=h;ctx.imageSmoothingEnabled=false;
    stars=Array.from({length:Math.min(200,Math.floor(w*h/6500))},(_,i)=>({x:hash(i,1)*w,y:hash(i,2)*h,size:i%11===0?3:1.5,a:.18+hash(i,3)*.5,warm:i%5===0}));
    // Keep the principal disk partially offscreen, leaving the reading column quiet.
    planets=[sphere(w*.035,h*1.05,Math.min(w*(small?.57:.25),330),0),sphere(w*1.005,h*.30,Math.min(w*.13,155),1)];
    bake();draw();
  }
  function draw(){
    ctx.save();
    ctx.translate(w/2,h/2);
    if(!reduced.matches)ctx.rotate(Math.sin(time*.012)*.012);
    ctx.scale(1.035,1.035);
    ctx.drawImage(plate,-w/2,-h/2);
    ctx.restore();
    for(const p of planets){
      const angle=time*(p.variant?.035:.055),co=Math.cos(angle),si=Math.sin(angle);
      const palette=palettes[day?'day':'night'];
      for(const a of p.points){
        const lon=a.lon+time*(p.variant?.035:.055);
        const terrain=.5+.18*Math.sin(lon*4+Math.sin(a.lat*5)*1.4)+.14*Math.sin(lon*9-a.lat*7)+.09*Math.sin(lon*17+a.lat*13);
        const rx=a.nx*co+a.nz*si,rz=a.nz*co-a.nx*si;
        let impact=0;
        for(const crater of craters){
          const d=rx*crater.x+a.ny*crater.y+rz*crater.z;
          if(d>crater.inner)impact+=.16;
          else if(d>crater.outer)impact-=.08;
        }
        const lum=Math.max(0,Math.min(.999,(.14+terrain*.48-impact)*(.28+a.light*.92)));
        const scaled=lum*7,level=Math.max(0,Math.min(5,Math.floor(scaled)+(scaled%1>a.dither?1:0)));
        if(a.edge<a.dither*.55)continue;
        ctx.globalAlpha=day?(p.variant?.25:(small?.20:.48)):(p.variant?.62:(small?.38:.86));
        ctx.fillStyle=palette[level];ctx.fillRect(a.x,a.y,p.step,p.step);
      }
    }
    ctx.globalAlpha=1;
    // Very slow dust parallax; sparse twinkles, no full-screen flashing.
    if(!reduced.matches)for(let i=0;i<stars.length;i+=13){const s=stars[i];ctx.globalAlpha=(day?.12:.25)*(.5+.5*Math.sin(time*.65+i));ctx.fillStyle=day?'#78a29a':'#d4e5de';ctx.fillRect(s.x,s.y,3,3);}
    ctx.globalAlpha=1;
  }
  function tick(now){
    frame=0;if(document.hidden||reduced.matches)return;
    const interval=small?83:50;
    if(now-last>=interval){time+=Math.min((now-then)/1000||0,.12);then=now;last=now;draw();}
    frame=requestAnimationFrame(tick);
  }
  function start(){if(!frame&&!document.hidden&&!reduced.matches){then=performance.now();frame=requestAnimationFrame(tick);}}
  let resizeFrame=0;
  window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(resize);});
  new MutationObserver(()=>{const next=document.documentElement.classList.contains('day');if(next!==day){bake();draw();}}).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else start();});
  reduced.addEventListener('change',()=>{cancelAnimationFrame(frame);frame=0;draw();start();});
  resize();document.documentElement.classList.add('cosmic-ready');start();
})();
