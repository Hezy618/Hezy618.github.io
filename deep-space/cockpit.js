import * as T from './vendor/three.module.min.js';
import { bevel, block, canvasTexture, mesh, tube } from './mesh.js';

function trim(group, material, x, y, z, w, h, d, radius) {
  return mesh(group, bevel(w,h,d,radius), material, x,y,z);
}

function instruments(ctx, data, axes) {
  ctx.fillStyle='#081718';ctx.fillRect(0,0,1024,240);
  ctx.strokeStyle='#46716b';ctx.lineWidth=2;
  ctx.strokeRect(12,13,1000,214);
  for (const x of [226,567,814]) {
    ctx.beginPath();ctx.moveTo(x,57);ctx.lineTo(x,209);ctx.stroke();
  }
  ctx.fillStyle='#132c2c';ctx.fillRect(14,15,996,36);
  ctx.font='bold 19px monospace';ctx.fillStyle='#9cbcb2';
  ctx.fillText('WM-04  /  FLIGHT SYSTEMS',29,40);
  ctx.fillStyle=data.landed?'#accb9f':data.braking?'#ffd39a':'#a4e0d2';
  ctx.textAlign='right';ctx.fillText(data.landed?'GEAR DOWN':data.braking?'BRAKING':data.cruise?'CRUISE':'MANUAL',989,40);
  ctx.textAlign='left';
  const metric=(x,name,value,unit)=>{
    ctx.font='bold 18px monospace';ctx.fillStyle='#9cbcb2';ctx.fillText(name,x,84);
    ctx.font='bold 42px monospace';ctx.fillStyle='#edfff0';ctx.fillText(value,x,141);
    ctx.font='17px monospace';ctx.fillStyle='#9cbcb2';ctx.fillText(unit,x,168);
  };
  metric(34,'VELOCITY',data.speed.toFixed(0),'m/s');
  metric(243,'TERRAIN CLEARANCE',data.altitude.toFixed(0),'m AGL');
  metric(586,'VERTICAL',`${data.vertical>.04?'+':''}${data.vertical.toFixed(1)}`,'m/s');
  metric(832,'FUEL',`${Math.round(data.fuel)}%`,'RESERVE');
  ctx.fillStyle='#2d4842';ctx.fillRect(832,185,146,13);
  ctx.fillStyle=data.fuel>20?'#91d1b1':'#ffaf71';ctx.fillRect(832,185,146*data.fuel/100,13);
  ctx.strokeStyle='#7dbcac';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(293,198);ctx.lineTo(513,198);ctx.moveTo(403,187);ctx.lineTo(403,209);ctx.stroke();
  ctx.fillStyle='#bcf4dc';ctx.fillRect(400+axes.side*84,188,7,20);
}

export function makeCockpit(paint) {
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(57,1,.05,22);
  const soft=new T.DirectionalLight(0xffdfb5,1.6);
  soft.position.set(-2.4,3,1.4);
  scene.add(soft,new T.HemisphereLight(0xa9cbd3,0x555d56,1.88));
  const charcoal=new T.MeshStandardMaterial({color:0x252e31,roughness:.81,metalness:.3});
  const shell=new T.MeshStandardMaterial({color:0x4c5a59,roughness:.66,metalness:.41});
  const grip=new T.MeshStandardMaterial({color:0x192223,roughness:.94,metalness:.055});
  const line=new T.MeshBasicMaterial({color:0x588a7c});
  const keyLight=new T.MeshBasicMaterial({color:0xe1a778});
  const dashboard=new T.Group(), canopy=new T.Group();
  scene.add(dashboard,canopy);
  trim(dashboard,charcoal,0,-.87,-1.53,4.1,.54,.79,.10);
  const monitor=new T.Group();
  monitor.position.set(-.04,-.44,-1.75);monitor.rotation.x=-.19;
  dashboard.add(monitor);
  trim(monitor,shell,0,0,0,1.64,.44,.18,.045);
  trim(monitor,grip,0,0,.095,1.56,.372,.035,.014);

  let ctx;
  const screen=canvasTexture(1024,240,context=>{ctx=context;});
  mesh(monitor,new T.PlaneGeometry(1.49,.348),new T.MeshBasicMaterial({map:screen,toneMapped:false}),0,0,.116);
  for(const sign of [-1,1]){
    trim(dashboard,shell,sign*.95,-.65,-1.46,.25,.13,.49,.04).rotation.z=sign*-.10;
    for(let i=0;i<5;i++)block(dashboard,i===3?keyLight:line,sign*(.86+(i%2)*.083),-.623+Math.floor(i/2)*.027,-1.196,.034,.017,.011);
    const strut=[[sign*.68,-.89,-1.46],[sign*.87,-.44,-1.74],[sign*.91,.47,-1.81],[sign*.66,.91,-1.75]];
    tube(canopy,charcoal,strut,.096);
    tube(canopy,shell,[[sign*.635,-.81,-1.43],[sign*.817,-.426,-1.701],[sign*.859,.442,-1.773],[sign*.625,.856,-1.71]],.023);
    tube(canopy,line,[[sign*.78,-.542,-1.63],[sign*.841,-.341,-1.71],[sign*.853,-.19,-1.724]],.008);
  }
  const yoke=new T.Group();yoke.name='Flight yoke';yoke.position.set(.25,-.714,-1.32);dashboard.add(yoke);
  tube(yoke,shell,[[0,-.02,.12],[0,.18,.02],[0,.235,-.03]],.042);
  tube(yoke,shell,[[-.255,.21,.027],[-.23,.125,.012],[0,.10,-.024],[.23,.125,.012],[.255,.21,.027]],.038);
  for(const side of [-1,1]){
    trim(yoke,grip,side*.251,.222,.023,.083,.228,.084,.034).rotation.z=-side*.17;
    for(let i=0;i<3;i++)block(yoke,shell,side*.249,.17+i*.031,.07,.055,.009,.005);
    block(yoke,side<0?keyLight:line,side*.24,.326,.06,.032,.016,.023);
  }
  trim(yoke,grip,0,.143,.038,.147,.075,.073,.022);
  block(yoke,line,0,.145,.078,.060,.012,.006);

  trim(dashboard,shell,-.63,-.70,-1.11,.226,.125,.335,.052);
  trim(dashboard,grip,-.63,-.635,-1.11,.11,.025,.26,.010);
  const throttle=new T.Group();throttle.name='Throttle lever';throttle.position.set(-.63,-.636,-1.11);dashboard.add(throttle);
  tube(throttle,paint.alloy,[[0,0,0],[0,.14,0],[.024,.225,-.026]],.025);
  trim(throttle,grip,.026,.234,-.023,.154,.081,.108,.033);
  block(throttle,keyLight,.031,.272,-.017,.081,.011,.025);

  const axes={forward:0,side:0,lift:0};
  let old='',displayAt=0;
  return {
    scene,camera,
    resize(aspect){
      camera.aspect=aspect;camera.updateProjectionMatrix();
      canopy.scale.x=Math.max(.53,aspect);
      dashboard.scale.x=Math.min(1.05,Math.max(.52,aspect*1.27));
    },
    update(dt, now, controls, telemetry) {
      axes.forward=T.MathUtils.damp(axes.forward,controls.forward,14,dt);
      axes.side=T.MathUtils.damp(axes.side,controls.side,14,dt);
      axes.lift=T.MathUtils.damp(axes.lift,controls.lift,14,dt);
      throttle.rotation.x=axes.forward*.48;
      yoke.rotation.z=-axes.side*.35;
      yoke.rotation.x=axes.lift*.14;
      if(now<displayAt)return;
      displayAt=now+.095;
      const signature=[Math.round(telemetry.speed),Math.round(telemetry.altitude),telemetry.vertical.toFixed(1),
        Math.round(telemetry.fuel),telemetry.landed,telemetry.cruise,telemetry.braking,axes.side.toFixed(1)].join(',');
      if(signature!==old){old=signature;instruments(ctx,telemetry,axes);screen.needsUpdate=true;}
    },
  };
}
