/* A shared optical halo. Native pointers and hit targets remain intact. */
(() => {
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const fine=matchMedia('(any-pointer: fine)');
  const ring=document.createElement('div');ring.className='cursor-lens';ring.setAttribute('aria-hidden','true');document.body.append(ring);
  let x=0,y=0,tx=0,ty=0,scale=1,targetScale=1,frame=0,last=0,shown=false;
  const hide=()=>{shown=false;ring.classList.remove('visible');};
  function tick(time){
    frame=0;if(!shown||motion.matches||!fine.matches)return;
    const blend=1-Math.exp(-Math.min(time-last||16,40)/42);last=time;
    x+=(tx-x)*blend;y+=(ty-y)*blend;scale+=(targetScale-scale)*blend;
    ring.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-50%) scale(${scale})`;
    if(Math.abs(tx-x)+Math.abs(ty-y)+Math.abs(targetScale-scale)>.03)frame=requestAnimationFrame(tick);
  }
  function wake(){if(!frame){last=0;frame=requestAnimationFrame(tick);}}
  document.addEventListener('pointermove',e=>{
    if(e.pointerType!=='mouse'||motion.matches||!fine.matches){hide();return;}
    tx=e.clientX;ty=e.clientY;if(!shown){x=tx;y=ty;shown=true;ring.classList.add('visible');}
    targetScale=e.target.closest('a,button,[role="button"]') ? .76 : 1;wake();
  },{passive:true});
  document.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&shown){targetScale=1.25;wake();}});
  document.addEventListener('pointerup',()=>{targetScale=1;wake();});
  document.addEventListener('pointerout',e=>{if(!e.relatedTarget)hide();});
  window.addEventListener('blur',hide);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)hide();});
  motion.addEventListener('change',hide);fine.addEventListener('change',hide);
})();
