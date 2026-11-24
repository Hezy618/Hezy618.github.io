import * as T from './vendor/three.module.min.js';
import { habitat } from './catalog.js?v=2';
import { localSite, surfaceAt, tangentBasis } from './terrain.js?v=4';
import { mesh, seeded, tube } from './mesh.js';
import { frame } from './flight.js?v=2';

const axis=new T.Vector3(0,1,0);
const cellSize=78;

function leafGeometry(width, length, lift){
  const positions=[], indices=[];
  for(let i=0;i<=8;i++){
    const t=i/8, breadth=width*Math.sin(t*Math.PI)**.81;
    const y=length*t, curl=lift*t*t;
    positions.push(-breadth,y,curl,0,y,curl+.09*Math.sin(t*Math.PI),breadth,y,curl);
    if(i<8)for(let j=0;j<2;j++){const a=i*3+j;indices.push(a,a+1,a+3,a+1,a+4,a+3);}
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
function mergePlant(model) {
  const positions=[], normals=[], colors=[];
  const p=new T.Vector3(), n=new T.Vector3(), transform=new T.Matrix3();
  model.updateMatrixWorld(true);
  model.traverse(part=>{
    if(!part.isMesh)return;
    const geo=part.geometry.index?part.geometry.toNonIndexed():part.geometry;
    transform.getNormalMatrix(part.matrixWorld);
    const source=geo.attributes.position, direction=geo.attributes.normal;
    for(let i=0;i<source.count;i++){
      p.fromBufferAttribute(source,i).applyMatrix4(part.matrixWorld);
      n.fromBufferAttribute(direction,i).applyMatrix3(transform).normalize();
      positions.push(p.x,p.y,p.z);normals.push(n.x,n.y,n.z);
      const shade=.78+.21*T.MathUtils.smoothstep(p.y,0,1.8);
      const c=part.material.color;colors.push(c.r*shade,c.g*shade,c.b*shade);
    }
    if(geo!==part.geometry)geo.dispose();
  });
  model.traverse(part=>{if(part.isMesh)part.geometry.dispose();});
  const geometry=new T.BufferGeometry();
  for(const [name,values] of [['position',positions],['normal',normals],['color',colors]])
    geometry.setAttribute(name,new T.Float32BufferAttribute(values,3));
  geometry.computeBoundingSphere();return geometry;
}
function plantGeometry(body,index){
  const group=new T.Group(), profile=habitat[body.id];
  const leaf=new T.MeshBasicMaterial({color:profile.leaf});
  const bloom=new T.MeshBasicMaterial({color:profile.shoot});
  const stem=new T.MeshBasicMaterial({color:0x4b4832});
  const length=body.id==='veil'?1.27:body.id==='ember'?1:.72;
  for(let i=0;i<6;i++){
    const f=i*2.39996+index, height=length*(.53+(i%4)*.16);
    const x=Math.sin(f)*.28,z=Math.cos(f)*.28;
    tube(group,stem,[[0,.02,0],[x*.56,height*.41,z*.45],[x,height,z]],.021,true);
    for(let j=0;j<2;j++){
      const frond=mesh(group,leafGeometry((body.id==='veil'?.21:.13)*(1-j*.23),height*.68,height*.39),leaf,
        x*(.48+j*.23),height*(.27+j*.30),z*(.48+j*.23));
      frond.rotation.set(.47+j*.55,f+Math.PI+j*2.2,-.19);
    }
    const cone=mesh(group,new T.SphereGeometry(.097,9,7),bloom,x,height-.02,z);
    cone.scale.set(body.id==='rime'?1.36:.68,body.id==='ember'?2.10:.72,1);
    if(body.id==='veil'){
      const rim=mesh(group,new T.TorusGeometry(.106,.016,5,12),leaf,x,height+.022,z);
      rim.rotation.x=Math.PI/2;
    }
  }
  const geometry=mergePlant(group);
  leaf.dispose();bloom.dispose();stem.dispose();
  return geometry;
}
function plantMaterial(body,wind){
  const material=new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.83,metalness:.035});
  material.onBeforeCompile=shader=>{
    shader.uniforms.breeze=wind;
    shader.uniforms.exposure={value:.024+body.pressure*.078};
    shader.vertexShader='uniform float breeze,exposure;\n'+shader.vertexShader.replace('#include <begin_vertex>',`
      #include <begin_vertex>
      vec3 anchor=(instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
      float travel=sin(breeze*1.72+dot(anchor,vec3(.071,.025,.053)));
      transformed.xz+=vec2(travel,cos(breeze*1.09+anchor.z*.045))*exposure*position.y*position.y;`);
  };
  return material;
}

function creature(body){
  const profile=habitat[body.id];
  const skin=new T.MeshStandardMaterial({color:profile.skin,roughness:.65});
  const plates=new T.MeshStandardMaterial({color:profile.trim,roughness:.51,metalness:.055});
  const foot=new T.MeshStandardMaterial({color:0x243235,roughness:.84});
  const eye=new T.MeshPhysicalMaterial({color:0x061414,roughness:.16,clearcoat:1});
  const glint=new T.MeshBasicMaterial({color:0xbce5b7});
  const root=new T.Group(), torso=new T.Group(), tail=new T.Group(), head=new T.Group(), legs=[];
  root.add(torso);torso.add(head,tail);
  const oval=(parent,material,x,y,z,sx,sy,sz,detail=14)=>{
    const part=mesh(parent,new T.SphereGeometry(1,detail,10),material,x,y,z);
    part.scale.set(sx,sy,sz);return part;
  };
  const long=body.id==='rime'?1.4:1;
  oval(torso,skin,0,0,.04,.36,.32,.67*long,22);
  oval(torso,skin,0,-.045,-.31,.32,.30,.34);
  oval(torso,plates,0,.14,.21,.294,.14,.44);
  for(let i=0;i<7;i++){
    const z=.5-i*.13;
    oval(torso,i%3===0?foot:plates,0,.22+Math.sin(i*.5)*.09,z,.275-i*.012,.065,.078);
  }
  head.position.set(0,.15,-.59*long);
  oval(head,skin,0,.035,-.19,.24,.22,.33,18);
  oval(head,plates,0,-.045,-.37,.167,.112,.173);
  for(const side of [-1,1]){
    oval(head,eye,side*.191,.061,-.294,.056,.057,.061);
    oval(head,glint,side*.216,.074,-.321,.017,.018,.021);
    const crest=oval(head,plates,side*.14,.21,-.095,.055,.23,body.id==='veil'?.19:.09);
    crest.rotation.set(.52,0,-side*.48);
  }
  tail.position.z=.56*long;
  tube(tail,skin,[[0,0,0],[0,-.05,.22],[.085,-.14,.51],[.13,-.03,.78],[.16,.03,.93]],.073,true);
  oval(tail,plates,.16,.027,.91,.083,.047,.132);
  for(const side of [-1,1])for(const end of [-1,1]){
    const hip=new T.Group(), shin=new T.Group(), ankle=new T.Group();
    hip.position.set(side*.273,-.076,end*.44*long);
    torso.add(hip);hip.add(shin);shin.position.y=-.28;shin.add(ankle);ankle.position.y=-.30;
    oval(hip,skin,0,-.13,0,.106,.195,.109);
    oval(shin,plates,0,-.012,0,.086,.095,.095);
    oval(shin,skin,0,-.148,0,.057,.184,.065);
    oval(ankle,foot,0,-.02,-.038,.090,.063,.118);
    for(let toe=-1;toe<=1;toe++)oval(ankle,plates,toe*.042,-.041,-.126,.021,.028,.058,8);
    legs.push({hip,shin,ankle,phase:side===end?0:Math.PI});
  }
  // Merge each rigid segment once, keeping the joints separate for animation.
  const shell=new T.MeshStandardMaterial({vertexColors:true,roughness:.74});
  const geometries=[];
  for(const pivot of [torso,head,tail,...legs.flatMap(({hip,shin,ankle})=>[hip,shin,ankle])]){
    const rigid=new T.Group();
    for(const part of [...pivot.children])if(part.isMesh)rigid.add(part);
    if(!rigid.children.length)continue;
    const geometry=mergePlant(rigid);
    geometries.push(geometry);mesh(pivot,geometry,shell);
  }
  for(const m of [skin,plates,foot,eye,glint])m.dispose();
  return {root,torso,head,tail,legs,release(){for(const geometry of geometries)geometry.dispose();shell.dispose();}};
}
function cellCandidates(world,position) {
  const local=position.clone().sub(world.position), grid=local.clone().divideScalar(cellSize).round(), nearby=[];
  for(let x=-2;x<=2;x++)for(let y=-2;y<=2;y++)for(let z=-2;z<=2;z++){
    const cx=grid.x+x, cy=grid.y+y, cz=grid.z+z;
    const center=new T.Vector3(cx,cy,cz).multiplyScalar(cellSize);
    const d=center.length();
    if(Math.abs(d-world.radius)>132)continue;
    const here=surfaceAt(world,center.clone().normalize());
    const distance=here.distanceToSquared(position);
    if(distance>162**2)continue;
    nearby.push({id:`${cx},${cy},${cz}`,center,distance,seed:(cx*73856093^cy*19349663^cz*83492791^world.seed)>>>0});
  }
  const start=surfaceAt(world,axis).distanceToSquared(position);
  if(start<166**2)nearby.push({id:'shelf',distance:start*.4,seed:world.seed*107});
  return nearby.sort((a,b)=>a.distance-b.distance);
}

export function createEcology(scene,{mobile,reduced,blocked}) {
  const root=new T.Group();root.name='Streamed surface ecology';scene.add(root);
  let active=null, assets=null, animationTime=0, pending=[], queryAt=0, motionAt=0, elapsed=0;
  const cells=new Map();
  const wind={value:0}, matrix=new T.Object3D();
  const targets=[];
  function releasePatch(patch){
    root.remove(patch.group);
    for(const plants of patch.instances)plants.dispose();
    for(const animal of patch.animals)animal.rig.release();
  }
  function reset(){
    for(const patch of cells.values())releasePatch(patch);
    cells.clear();targets.length=0;pending=[];queryAt=motionAt=0;elapsed=0;
    if(assets){for(const g of assets.shapes)g.dispose();assets.material.dispose();assets=null;}
    active=null;
  }
  function chooseWorld(body) {
    if(body===active)return;
    reset();
    active=body;
    assets={shapes:[plantGeometry(body,0),plantGeometry(body,1)],material:plantMaterial(body,wind)};
  }
  function makeAnimal(group,body,id,site,rand) {
    const d=site.clone().sub(body.position).normalize();
    const {forward}=tangentBasis(d);
    const rig=creature(body);
    const scale=.78+rand()*.28;
    rig.root.scale.setScalar(scale);
    rig.root.position.copy(site);
    rig.root.quaternion.copy(frame(forward,d));
    rig.torso.position.y=.72;
    group.add(rig.root);
    return {rig,d,dir:forward,origin:d.clone(),phase:rand()*Math.PI*2,speed:0,scale,id,
      pos:rig.root.position,type:'fauna',kind:'wildlife',name:habitat[body.id].animal,world:body.id};
  }
  function build(body,cell) {
    const rand=seeded(cell.seed), group=new T.Group(), points=[[],[]], samples=[], animals=[];
    const shelf=cell.id==='shelf', total=shelf?(mobile?28:46):(mobile?13:24);
    for(let i=0;i<total;i++){
      let d;
      if(shelf){
        const angle=rand()*Math.PI*2, radius=19+rand()**1.43*61;
        d=localSite(body,axis,Math.sin(angle)*radius,Math.cos(angle)*radius);
      }else{
        d=cell.center.clone().add(new T.Vector3(rand()-.5,rand()-.5,rand()-.5).multiplyScalar(cellSize*.94)).normalize();
      }
      const ground=surfaceAt(body,d,.007);
      if((!shelf&&ground.clone().sub(body.position).distanceToSquared(cell.center)>cellSize**2*.65)||blocked(ground,body))continue;
      const scale=.61+rand()**2*1.57;
      points[i%2].push({d,ground,scale,angle:rand()*Math.PI*2});
      if(samples.length<(shelf?3:1)){
        samples.push({id:`${body.id}:${cell.id}:flora:${i}`,kind:'wildlife',type:'flora',
          pos:ground,name:habitat[body.id].plant,world:body.id});
      }
    }
    const instances=[];
    points.forEach((entries,index)=>{
      if(!entries.length)return;
      const batch=new T.InstancedMesh(assets.shapes[index],assets.material,entries.length);
      batch.receiveShadow=true;
      entries.forEach(({d,ground,scale,angle},i)=>{
        matrix.position.copy(ground);
        matrix.quaternion.setFromUnitVectors(axis,d);matrix.rotateY(angle);
        matrix.scale.setScalar(scale);matrix.updateMatrix();batch.setMatrixAt(i,matrix.matrix);
      });
      group.add(batch);instances.push(batch);
    });
    if(shelf||rand()>.61){
      const count=shelf?(mobile?1:2):1;
      for(let i=0;i<count;i++){
        const site=surfaceAt(body,shelf?localSite(body,axis,-12+i*27,28+i*19):cell.center.clone().normalize());
        if(blocked(site,body))continue;
        animals.push(makeAnimal(group,body,`${body.id}:${cell.id}:fauna:${i}`,site,rand));
      }
    }
    root.add(group);
    cells.set(cell.id,{group,instances,animals,samples});
  }
  function animate(animal,body,position,playerSpeed,dt) {
    const {rig,d,dir,origin}=animal;
    const distance=animal.pos.distanceTo(position);
    const startled=distance<6 || distance<16&&playerSpeed>6;
    const alert=distance<18&&!startled;
    const gait=startled?3.65:alert?0:1.05+.70*Math.sin(animationTime*.72+animal.phase);
    animal.speed=T.MathUtils.damp(animal.speed,gait,5,dt);
    let forward;
    if(startled)forward=animal.pos.clone().sub(position);
    else if(origin.distanceTo(d)*body.radius>28) forward=origin.clone().sub(d);
    else forward=dir.clone().applyAxisAngle(d,Math.sin(animationTime*.57+animal.phase)*dt*.62);
    forward.addScaledVector(d,-forward.dot(d)).normalize();
    dir.lerp(forward,1-Math.exp(-dt*5)).normalize();
    const next=d.clone().multiplyScalar(body.radius).addScaledVector(dir,animal.speed*dt).normalize();
    const goal=surfaceAt(body,next);
    if(!blocked(goal,body)){
      d.copy(next);animal.pos.copy(goal);
    }else dir.applyAxisAngle(d,dt*2.7);
    dir.addScaledVector(d,-dir.dot(d)).normalize();
    rig.root.quaternion.copy(frame(dir,d));
    animal.phase+=animal.speed*dt*5.3;
    const step=Math.min(1,animal.speed/2.4), wave=reduced?.30:1;
    rig.torso.position.y=.72+Math.cos(animal.phase*2)*.053*step*wave;
    rig.torso.rotation.z=Math.sin(animal.phase)*.068*step*wave;
    rig.head.rotation.x=alert?-.18:Math.sin(animationTime*.83+animal.phase)*.13+.22*(1-step);
    rig.head.rotation.y=alert?.23*Math.sin(animationTime*2):Math.sin(animal.phase)*.08*step;
    rig.tail.rotation.y=Math.sin(animationTime*3+animal.phase)*(.13+.24*step)*wave;
    for(const leg of rig.legs){
      const swing=Math.sin(animal.phase+leg.phase)*step*wave;
      leg.hip.rotation.x=.43*swing;leg.shin.rotation.x=-.24-.53*Math.max(0,swing);
      leg.ankle.rotation.x=-.65*(leg.hip.rotation.x+leg.shin.rotation.x);
    }
  }
  return {
    targets,reset,
    invalidate(body,position){
      if(active!==body)return;
      for(const [id,patch] of cells){
        if(patch.samples.some(item=>item.pos.distanceToSquared(position)<85**2)||
           patch.animals.some(item=>item.pos.distanceToSquared(position)<36**2)){
          releasePatch(patch);cells.delete(id);
        }
      }
      targets.length=0;
      queryAt=0;
    },
    update(body,position,altitude,playerSpeed,dt,now) {
      if(altitude>74||altitude>48&&active!==body){if(active)reset();return;}
      chooseWorld(body);
      animationTime=now;wind.value=reduced?0:now;
      if(now>=queryAt){
        const selected=cellCandidates(body,position).slice(0,mobile?6:9);
        const ids=new Set(selected.map(cell=>cell.id));
        for(const [id,patch] of cells)if(!ids.has(id)){
          releasePatch(patch);cells.delete(id);
        }
        pending=selected.filter(cell=>!cells.has(cell.id));
        queryAt=now+.38;
      }
      if(pending.length)build(body,pending.shift());
      elapsed+=dt;
      if(now>=motionAt){
        targets.length=0;
        for(const patch of cells.values()){
          for(const animal of patch.animals){
            if(animal.pos.distanceToSquared(position)<102**2)animate(animal,body,position,playerSpeed,elapsed);
            targets.push(animal);
          }
          targets.push(...patch.samples);
        }
        motionAt=now+1/(mobile?18:24);elapsed=0;
      }
    },
  };
}
