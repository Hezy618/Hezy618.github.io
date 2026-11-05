/* A shared optical halo. Native pointers and hit targets remain intact. */
(() => {
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const fine=matchMedia('(any-pointer: fine)');
  // A radial displacement field refracts the actual compositor backdrop, including
  // text, images, SVG and live canvases. No mirrored DOM or captured screenshots.
  const ns='http://www.w3.org/2000/svg';
  const defs=document.createElementNS(ns,'svg');
  defs.setAttribute('aria-hidden','true');defs.setAttribute('width','0');defs.setAttribute('height','0');
  defs.style.cssText='position:absolute;pointer-events:none;overflow:hidden';
  const map=document.createElement('canvas');map.width=map.height=128;
  const context=map.getContext('2d'),pixels=context.createImageData(128,128);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const dx=(x-63.5)/64,dy=(y-63.5)/64,r=Math.hypot(dx,dy);
    const falloff=Math.max(0,1-r*r)**1.6;
    const i=(y*128+x)*4;
    pixels.data[i]=128-dx*falloff*108;
    pixels.data[i+1]=128-dy*falloff*108;
    pixels.data[i+2]=128;pixels.data[i+3]=255;
  }
  context.putImageData(pixels,0,0);
  defs.innerHTML='<defs><filter id="page-liquid-optics" filterUnits="userSpaceOnUse" x="0" y="0" width="128" height="128" color-interpolation-filters="sRGB"><feImage x="0" y="0" width="128" height="128" preserveAspectRatio="none" result="radial-field"/><feDisplacementMap in="SourceGraphic" in2="radial-field" scale="48" xChannelSelector="R" yChannelSelector="G"/></filter></defs>';
  defs.querySelector('feImage').setAttribute('href',map.toDataURL());document.body.append(defs);
  const ring=document.createElement('div');ring.className='cursor-lens';ring.setAttribute('aria-hidden','true');document.body.append(ring);
  let x=0,y=0,tx=0,ty=0,scale=1,targetScale=1,frame=0,last=0,shown=false;
  const hide=()=>{shown=false;window.liquidBackdropActive=false;ring.classList.remove('visible');};
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
    window.liquidBackdropActive=true;
    targetScale=e.target.closest('a,button,[role="button"]') ? .9 : 1;wake();
  },{passive:true});
  document.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&shown){targetScale=1.25;wake();}});
  document.addEventListener('pointerup',e=>{targetScale=e.target.closest('a,button,[role="button"]') ? .9 : 1;wake();});
  document.addEventListener('pointerout',e=>{if(!e.relatedTarget)hide();});
  window.addEventListener('blur',hide);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)hide();});
  window.addEventListener('cosmic-transition-start',hide);
  document.addEventListener('scroll',hide,{passive:true});
  motion.addEventListener('change',hide);fine.addEventListener('change',hide);
})();
