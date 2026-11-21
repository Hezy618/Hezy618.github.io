import * as T from '../moon/vendor/three.module.min.js';
import { block, mesh, bevel, tube, canvasTexture, seeded } from '../moon/mesh.js';
import { localSite, surfaceAt } from './terrain.js?v=2';
import { materials } from './catalog.js';

export function paintSet() {
  const rnd=seeded(783);
  const scuffs=canvasTexture(384,384,ctx=>{
    ctx.fillStyle='#c2beb0';ctx.fillRect(0,0,384,384);
    for(let i=0;i<7800;i++){
      const x=rnd()*384,y=rnd()*384,s=rnd()**4*25+.55;
      ctx.fillStyle=rnd()>.6?'#fffaf246':'#3b2d2036';
      ctx.fillRect(x,y,s,.5+rnd()*1.7);
    }
    for(let i=0;i<7;i++){
      ctx.fillStyle='#51392238';ctx.fillRect(0,i*62,384,1+rnd()*2);
    }
  });
  scuffs.wrapS=scuffs.wrapT=T.RepeatWrapping;
  scuffs.anisotropy=6;
  const surface=(color,metalness,roughness)=>new T.MeshStandardMaterial({
    color, metalness, roughness, map:scuffs, roughnessMap:scuffs, bumpMap:scuffs,bumpScale:.035,
  });
  return {
    armor:surface(0xd8cfb4,.22,.97),
    alloy:surface(0x848d8a,.55,.84),
    dark:surface(0x354047,.43,.92),
    rubber:surface(0x202729,.06,1),
    stripe:surface(0xd8793c,.28,.9),
    gold:surface(0xb99353,.57,.86),
    cell:new T.MeshPhysicalMaterial({color:0x233c61,metalness:.60,roughness:.47,clearcoat:.4}),
    glass:new T.MeshPhysicalMaterial({color:0x42818b,metalness:.46,roughness:.3,clearcoat:.95,emissive:0x10303a,emissiveIntensity:.36}),
    lit:new T.MeshBasicMaterial({color:0xc7ebb0}),
    orange:new T.MeshBasicMaterial({color:0xf3b96f}),
    rock:surface(0xa58976,.08,1),
  };
}
function round(root,m,x,y,z,w,h,d,r) {return mesh(root,bevel(w,h,d,r),m,x,y,z);}
function cylinder(root,m,x,y,z,top,bottom,depth,sides=20) {
  return mesh(root,new T.CylinderGeometry(top,bottom,depth,sides),m,x,y,z);
}
function label(root,font,color,text,x,y,z,w,h) {
  const tex=canvasTexture(256,96,ctx=>{
    ctx.fillStyle='#111a1d';ctx.fillRect(0,0,256,96);
    ctx.strokeStyle=color;ctx.strokeRect(5,5,246,86);
    ctx.fillStyle=color;ctx.font=`bold ${font}px monospace`;
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,128,50);
  });
  return mesh(root,new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex}),x,y,z);
}
function shadows(root) {
  root.traverse(n=>{if(n.isMesh&&!n.material.isMeshBasicMaterial)n.castShadow=n.receiveShadow=true;});
  return root;
}
function chassis(root,m,side) {
  const polygon=new T.Shape();
  polygon.moveTo(side*1.52,-2.54);
  polygon.lineTo(side*2.42,-1.64);
  polygon.lineTo(side*3.45,.72);
  polygon.lineTo(side*3.14,2.18);
  polygon.lineTo(side*1.49,2.44);
  polygon.closePath();
  const geometry=new T.ExtrudeGeometry(polygon,{
    depth:.16,bevelEnabled:true,bevelSize:.10,bevelThickness:.08,bevelSegments:3,
  }).rotateX(Math.PI/2);
  mesh(root,geometry,m.alloy,0,1.49,0);
  tube(root,m.rubber,[[side*1.64,1.65,-2.3],[side*2.58,1.62,-1.91],[side*3.4,1.52,-.73]],.052);
  tube(root,m.stripe,[[side*3.39,1.52,-.74],[side*3.22,1.51,-.98],[side*2.66,1.5,-1.55]],.063);
  for(let i=0;i<5;i++){
    const vent=round(root,m.dark,side*(2.51+i*.135),1.534,-.35+i*.092,.17,.049,.48,.019);
    vent.rotation.y=side*-.35;
  }
  round(root,m.lit,side*3.33,1.53,-.72,.12,.048,.19,.018);
}
export function makeShip(m) {
  const root=new T.Group();
  round(root,m.dark,0,1.25,.25,4.6,1.28,6.2,.32);
  round(root,m.armor,0,2.03,-.4,3.13,1.45,5.1,.46);
  round(root,m.alloy,0,1.6,-2.93,2.55,.52,1.42,.24).rotation.x=-.19;
  round(root,m.dark,0,1.47,-3.57,1.59,.29,.2,.076);
  round(root,m.glass,0,2.42,-2.94,2.23,.68,.47,.18).rotation.x=-.19;
  round(root,m.dark,0,2.48,-2.69,2.55,.145,.61,.057);
  for(const side of [-1,1]){
    chassis(root,m,side);
    const x=side*2.05;
    const pod=round(root,m.armor,x,1.58,.43,1.36,1.37,5.55,.38);
    pod.rotation.y=side*.075;
    round(root,m.stripe,x,1.59,-2.08,1.29,.52,.76,.19);
    round(root,m.dark,x,2.19,.42,1.07,.09,2.83,.043);
    for(let i=0;i<8;i++)block(root,m.alloy,x,2.236,-.63+i*.29,.76,.045,.035);
    const window=round(root,m.glass,side*1.53,2.44,-1.54,.13,.44,1.55,.061);
    window.rotation.z=side*.11;
    const engine = cylinder(root,m.alloy,x,1.46,3.43,.59,.53,.85,24);
    engine.rotation.x=Math.PI/2;
    cylinder(root,m.dark,x,1.46,3.89,.46,.39,.19,24).rotation.x=Math.PI/2;
    cylinder(root,m.orange,x,1.46,3.995,.30,.30,.04,24).rotation.x=Math.PI/2;
    for(let i=0;i<10;i++){
      const a=i*Math.PI/5;
      round(root,m.rubber,x+Math.cos(a)*.47,1.46+Math.sin(a)*.47,3.83,.095,.095,.29,.037);
    }
    tube(root,m.alloy,[[x,1.92,1.9],[x+side*.54,1.73,2.42],[x+side*.48,1.23,2.99]],.081,true);
    for(const dz of [-1.95,2.38]){
      tube(root,m.dark,[[side*1.73,1.1,dz],[side*2.24,.65,dz],[side*2.65,.14,dz+.25]],.13);
      tube(root,m.alloy,[[side*1.52,.93,dz+.38],[side*2.60,.22,dz+.25]],.064);
      cylinder(root,m.alloy,side*2.65,.09,dz+.25,.35,.47,.17);
    }
    round(root,m.armor,side*1.73,2.62,1.34,.12,.82,1.65,.054).rotation.z=side*-.21;
    tube(root,m.rubber,[[side*.65,2.55,1.83],[side*.8,2.91,1.54],[side*.88,3.94,1.72]],.026);
    mesh(root,new T.SphereGeometry(.053,8,6),m.orange,side*.88,3.94,1.72);
  }
  round(root,m.armor,0,1.73,3.33,1.36,.94,.3,.12);
  round(root,m.dark,0,1.78,3.5,1.07,.72,.14,.089);
  round(root,m.lit,0,2.03,3.59,.57,.04,.035,.014);
  for(let i=0;i<6;i++)round(root,m.alloy,0,.21+i*.17,3.99-i*.07,.78,.056,.18,.02);
  label(root,36,'#dce9bd','WM–04',0,2.47,3.148,.92,.345);
  const engineLight = new T.PointLight(0xffb573,0,11,2);
  engineLight.position.set(0,.6,2.5);root.add(engineLight);
  return {root:shadows(root), engineLight};
}
export function makeCockpit(m) {
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(57,1,.05,25);
  const dash=new T.Group();scene.add(dash,new T.HemisphereLight(0xd7e4e8,0x494942,1.47));
  const key=new T.DirectionalLight(0xffd8a1,1.8);key.position.set(-3,4,2);scene.add(key);
  round(dash,m.dark,0,-.82,-1.53,4.8,.42,.81,.10).rotation.x=-.12;
  round(dash,m.rubber,0,-.655,-1.62,.8,.32,.42,.052).rotation.x=-.15;
  round(dash,m.glass,0,-.608,-1.392,.65,.19,.05,.021).rotation.x=-.15;
  for(let i=0;i<14;i++)block(dash,i<10?m.lit:m.orange,(i-6.5)*.038,-.588,-1.359,.021,.038,.007);
  for(const side of [-1,1]){
    round(dash,m.alloy,side*.77,-.67,-1.48,.49,.17,.44,.07).rotation.z=side*-.13;
    for(let i=0;i<6;i++)block(dash,i%3===0?m.orange:m.dark,side*(.56+i*.076),-.60,-1.29,.036,.039,.035);
    const yoke=round(dash,m.rubber,side*.51,-.72,-1.08,.13,.26,.19,.058);
    yoke.rotation.x=-.55;
  }
  const ribs=new T.Group();scene.add(ribs);
  for(const side of [-1,1]){
    tube(ribs,m.dark,[[side*.70,-.86,-1.45],[side*.89,-.42,-1.7],[side*.91,.41,-1.75],[side*.68,.8,-1.69]],.097);
    tube(ribs,m.alloy,[[side*.646,-.80,-1.43],[side*.845,-.41,-1.655],[side*.865,.394,-1.71],[side*.64,.77,-1.66]],.024);
    tube(ribs,m.orange,[[side*.827,-.45,-1.63],[side*.849,-.33,-1.66]],.007);
  }
  return {scene,camera,resize(aspect){camera.aspect=aspect;camera.updateProjectionMatrix();ribs.scale.x=Math.max(.5,aspect);}};
}

function solar(root,m) {
  cylinder(root,m.dark,0,.28,0,.42,.69,.56);
  tube(root,m.alloy,[[0,.35,0],[0,1.5,0]],.17);
  const rack=new T.Group(); rack.position.y=1.7;rack.rotation.x=.33;root.add(rack);
  block(rack,m.alloy,0,0,0,5.55,.12,3);
  for(let x=0;x<10;x++)for(let z=0;z<5;z++){
    const a=(x-4.5)*.55,b=(z-2)*.59;
    block(rack,m.cell,a,.075,b,.51,.06,.55);
    block(rack,m.alloy,a,.112,b-.14,.48,.012,.014);
  }
}
export function makeStructure(id,m) {
  const root=new T.Group();
  if(id==='solar') solar(root,m);
  else if(id==='core'){
    cylinder(root,m.dark,0,.18,0,1.29,1.52,.34,8);
    cylinder(root,m.armor,0,.61,0,.77,1.05,.62,8);
    cylinder(root,m.stripe,0,1.02,0,.48,.76,.25,8);
    tube(root,m.alloy,[[0,1,0],[0,3.65,0]],.085);
    cylinder(root,m.lit,0,2.54,0,.14,.14,.33,10);
    for(const side of [-1,1])tube(root,m.alloy,[[side*.1,2.28,0],[side*.83,2.1,0],[side*1.38,2.3,0]],.042);
  } else if(id==='pad'){
    cylinder(root,m.dark,0,.165,0,5,5.34,.32,12);
    cylinder(root,m.alloy,0,.346,0,4.93,4.93,.056,12);
    const ring=mesh(root,new T.TorusGeometry(3.61,.045,7,48),m.orange,0,.382,0);ring.rotation.x=Math.PI/2;
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6;
      cylinder(root,m.lit,Math.sin(a)*4.66,.383,Math.cos(a)*4.66,.096,.096,.07,10);
    }
    for(const x of [-.64,.64])block(root,m.orange,x,.388,0,.13,.026,1.63);
    block(root,m.orange,0,.389,0,1.24,.026,.13);
  } else {
    const hab=id==='hab', length=hab?6.4:3.9;
    round(root,m.dark,0,.38,0,4.9,.53,length,.2);
    round(root,m.armor,0,1.82,0,4.65,2.61,length-.15,.59);
    round(root,m.stripe,0,2.81,0,4.59,.44,length-.28,.15);
    for(const side of [-1,1]){
      for(const z of [-length*.34,0,length*.34]){
        round(root,m.alloy,side*2.21,1.53,z,.25,2.32,.15,.069);
      }
      round(root,m.glass,side*2.31,1.91,0,.089,.51,1.48,.039);
      tube(root,m.dark,[[side*2.11,.48,-length*.4],[side*2.48,.62,-length*.28],[side*2.45,.74,length*.32]],.047);
    }
    round(root,m.dark,0,1.42,length/2,1.54,1.98,.19,.089);
    round(root,m.alloy,0,1.43,length/2+.12,1.29,1.79,.1,.049);
    round(root,m.lit,0,2.412,length/2+.19,.64,.052,.039,.014);
    label(root,32,'#e2e9c3',hab?'HAB':'FAB LAB',0,2.71,length/2-.032,1.02,.36);
    for(let i=0;i<5;i++)round(root,m.alloy,0,.15+i*.104,length/2+.86-i*.156,1.55,.093,.24,.03);
    round(root,m.alloy,1.1,3.22,-.45,1.02,.28,1.1,.10);
    for(let i=0;i<5;i++)block(root,m.dark,1.1,3.365,-.77+i*.16,.78,.035,.035);
  }
  return shadows(root);
}
export function makeRuin(m, world) {
  const root=new T.Group();
  const material=m.alloy.clone();material.color.set(world.accent).multiplyScalar(.66);
  cylinder(root,m.dark,0,.22,0,2.55,2.88,.42,8);
  cylinder(root,material,0,.58,0,1.93,2.23,.43,8);
  for(let i=0;i<5;i++){
    const angle=i*Math.PI*2/5;
    const monolith=round(root,material,Math.sin(angle)*1.42,2.2,Math.cos(angle)*1.42,.47,3.05,.54,.12);
    monolith.rotation.y=angle;monolith.rotation.z=.14*Math.cos(angle);
  }
  const light=mesh(root,new T.IcosahedronGeometry(.52,0),m.lit,0,2.4,0);
  light.rotation.set(.4,.2,-.3);
  return shadows(root);
}
const oreMats={};
export function makeDeposit(m,type,size) {
  const root=new T.Group();
  const base=mesh(root,new T.IcosahedronGeometry(1,2),m.rock,0,.2,0);
  base.scale.set(1.05,.52,.84);
  oreMats[type]??=new T.MeshPhysicalMaterial({
    color:materials[type].color,metalness:type==='iron'?.58:.16,roughness:.55,
    clearcoat:type==='crystal'?.6:.13,emissive:materials[type].color,emissiveIntensity:.11,
  });
  for(let i=0;i<7;i++){
    const a=i*2.39996;
    const shard=mesh(root,new T.CylinderGeometry(.02,.21+(i%3)*.04,.8+(i%4)*.21,type==='iron'?5:6),
      oreMats[type],Math.sin(a)*.53,.43+Math.sin(i*3)*.13,Math.cos(a)*.55);
    shard.rotation.set(.21*Math.sin(a),a,.34*Math.cos(a));
  }
  root.scale.setScalar(size);
  return shadows(root);
}
export function alignSurface(root,world,up,offset=0) {
  root.position.copy(surfaceAt(world,up,offset));
  root.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),up);
  return root;
}
export function boulders(scene,m,world,axis) {
  const random=seeded(world.seed*517);
  const geo=new T.IcosahedronGeometry(1,2);
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const wave=.90+.15*Math.sin(6*x+7*z)*Math.cos(3*z+8*y)+.09*Math.sin(y*19+x*12);
    p.setXYZ(i,x*wave,y*wave,z*wave);
  }
  geo.computeVertexNormals();
  const rock=new T.InstancedMesh(geo,m.rock,580);
  const tr=new T.Object3D();
  for(let i=0;i<rock.count;i++){
    const theta=random()*Math.PI*2, r=18+random()**1.2*470;
    const dx=Math.cos(theta)*r,dz=Math.sin(theta)*r;
    const dir=localSite(world,axis,dx,dz), size=.35+random()**6*(r>52?8.7:1.6);
    tr.position.copy(surfaceAt(world,dir,size*.04));
    tr.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir);tr.rotateY(theta);
    tr.scale.set(size*(.7+random()*.75),size*(.37+random()*.64),size*(.68+random()*.64));
    tr.updateMatrix();rock.setMatrixAt(i,tr.matrix);
    rock.setColorAt(i,new T.Color(world.dust).lerp(new T.Color(0xc4b8a8),random()*.5));
  }
  rock.castShadow=rock.receiveShadow=true;
  scene.add(rock);
  return rock;
}
