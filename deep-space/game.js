import * as T from './vendor/three.module.min.js';
import { createSuit } from './suit.js?v=2';
import { seeded } from './mesh.js';
import { blueprints, materials, recipes, costLabel, habitat, airDensity } from './catalog.js?v=2';
import { createSystem, localSite, nearestPlanet, surfaceAt, surfaceRadius, tangentBasis } from './terrain.js?v=4';
import { alignSurface, boulders, makeDeposit, makeRuin, makeShip, makeStructure, paintSet } from './models.js?v=2';
import { makeCockpit } from './cockpit.js';
import { approachPoint, frame, key, makeFlight } from './flight.js?v=2';

const $ = id=>document.getElementById(id);
const game=$('app'), viewport=$('viewport');
const mobile=matchMedia('(pointer: coarse)').matches;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const eye=new T.PerspectiveCamera(61,1,.09,95000);
const keys=new Set(), scene=new T.Scene();
const upVector=new T.Vector3(0,1,0), rightAxis=new T.Vector3(1,0,0), bankAxis=new T.Vector3(0,0,1);
const q=new T.Quaternion(), pilot=new T.Quaternion();
const player=new T.Vector3(), heading=new T.Vector3(0,0,-1);
const relative=new T.Vector3(), projected=new T.Vector3(), sight=new T.Vector3();
const shadowPosition=new T.Vector3();
const scanRadius=145;
let renderer, system, paint, suit, cockpit, vehicle, flight, world, ecology, engine, footBuffer;
let ecologyRequested=false;
let mode='intro', dialog=null, drag=null, started=false;
let pitch=0, jump=0, jumpSpeed=0, stride=0, time=0, energy=100, footDistance=0, landedImpact=0, stepPhase=0, aimSway=0;
const moveSpeed=new T.Vector3(), walk=new T.Vector3(), reverseView=new T.Quaternion();
const startStep=new T.Vector3(), surfaceUp=new T.Vector3();
const layerMotion={pitch:0,vertical:0,landed:0,strafe:0,air:false,turn:0};
let chosen=null, placing=null, ghost=null, scanUntil=0, noticeUntil=0, hintKey='', hudAt=0, refreshAt=0, saveAt=0;
let loadedSector='', visualsFrozen=false, sceneTimer=0, clock=0, context, soundOn=false, dirtyShadow=true;
let data, previousPosition, renderHold=0, introFrame=0;
let pixelRatio=1, maxRatio=1, averageFrame=0, sampleCount=0, tuneAt=0, cameraBank=0;
const cockpitControls={forward:0,side:0,lift:0};
const cockpitTelemetry={speed:0,altitude:0,vertical:0,fuel:100,landed:true,cruise:false,braking:false};
const objects=new Map(), scenic=[], markerNodes=[], effects=[], offscreen=[0,0];
const storageKey='wild-meridian-save-1';

function initialData() {
  return {cargo:{iron:4,silica:3,crystal:0,alloy:0,fuel:2}, built:[], mined:[], discovered:[], specimens:[], landed:['ember'], visited:['ember'], made:0};
}
function readSave() {
  try {
    const parsed=JSON.parse(localStorage.getItem(storageKey));
    if(!parsed || parsed.version!==1 || !parsed.data || !Array.isArray(parsed.ship)||!Array.isArray(parsed.player))return null;
    return parsed;
  } catch {return null;}
}
function save() {
  if(!started)return;
  try {localStorage.setItem(storageKey,JSON.stringify({
    version:1,data,player:player.toArray(),ship:flight.position.toArray(),shipHeading:flight.heading.toArray(),
    playerHeading:heading.toArray(),world:world.id,fuel:flight.fuel,energy,mode,
    view:pilot.toArray(),shipWorld:flight.landingWorld?.id, chosen:chosen?.id,
  }));} catch { /* The expedition remains playable with storage disabled. */ }
}
const count = id=>data.cargo[id]||0;
const canAfford = cost=>Object.entries(cost).every(([id,n])=>count(id)>=n);
function exchange(cost, result={}) {
  if(!canAfford(cost))return false;
  for(const [id,n] of Object.entries(cost))data.cargo[id]-=n;
  for(const [id,n] of Object.entries(result))data.cargo[id]=count(id)+n;
  return true;
}
function set(id,value){const node=$(id);if(node.textContent!==value)node.textContent=value;}
function announce(message,duration=4.4){
  set('notice',message);noticeUntil=time+duration;
}
function blip(kind) {
  if(!soundOn||!context||context.state!=='running')return;
  const osc=context.createOscillator(), gain=context.createGain(), t=context.currentTime;
  const low=kind==='mine'?78:kind==='flight'?91:354, high=kind==='mine'?47:kind==='flight'?154:591;
  osc.type=kind==='mine'?'triangle':'sine';osc.frequency.setValueAtTime(low,t);
  osc.frequency.exponentialRampToValueAtTime(high,t+.24);
  gain.gain.setValueAtTime(.001,t);gain.gain.exponentialRampToValueAtTime(.14,t+.03);
  gain.gain.exponentialRampToValueAtTime(.001,t+.32);
  osc.connect(gain).connect(context.destination);osc.start(t);osc.stop(t+.34);
  osc.onended=()=>{osc.disconnect();gain.disconnect();};
}
function placeOnSurface(model, body, radial, offset=0){
  alignSurface(model,body,radial,offset);
  scene.add(model);
  return model.position;
}
function addObject(object){
  if(objects.has(object.id))return objects.get(object.id);
  objects.set(object.id,object);return object;
}
function registerStructure(entry) {
  const body=system.planets.find(p=>p.id===entry.world);
  const blueprint=blueprints.find(b=>b.id===entry.type);
  if(!body||!blueprint)return;
  const model=makeStructure(entry.type,paint);
  const radial=new T.Vector3(...entry.dir);
  placeOnSurface(model,body,radial);
  model.rotateY(entry.angle||0);
  return addObject({...entry,kind:'structure',name:blueprint.name,model,pos:model.position,radius:blueprint.radius});
}
function addDeposit(body, id, dir, type, amount, fixed=false) {
  if(data.mined.includes(id)||objects.has(id))return;
  const model=makeDeposit(paint,type,1.05+(amount%3)*.19);
  placeOnSurface(model,body,dir,.07);
  addObject({id,world:body.id,kind:'deposit',type,amount,name:materials[type].name,model,pos:model.position,fixed});
}
function populatePlanets() {
  const deposits=[[-8,10,'iron',7],[4,17,'silica',7],[-3,28,'crystal',6],[-21,19,'iron',6],[23,20,'silica',6],[33,37,'crystal',5],[-13,58,'iron',7]];
  for(const p of system.planets){
    for(const [i,[x,z,type,amount]] of deposits.entries())addDeposit(p,`${p.id}-starter-${i}`,localSite(p,upVector,x,z),type,amount,true);
    const ruin=makeRuin(paint,p);
    placeOnSurface(ruin,p,localSite(p,upVector,37,77));
    addObject({id:`${p.id}-archive`,kind:'archive',world:p.id,name:'古代记录站',model:ruin,pos:ruin.position});

  }
  data.built.forEach(registerStructure);
}
function removeDeposit(object){
  scene.remove(object.model);objects.delete(object.id);
  object.model.traverse(item=>{if(item.isMesh)item.geometry.dispose();});
}
function updateDeposits() {
  if(mode!=='eva')return;
  const local=player.clone().sub(world.position);
  const size=51, grid=local.clone().divideScalar(size).round();
  const sector=`${world.id}:${grid.toArray().join(',')}`;
  if(sector===loadedSector)return;
  loadedSector=sector;
  for(const object of objects.values())if(object.kind==='deposit'&&!object.fixed&&
    (object.world!==world.id||object.pos.distanceTo(player)>265))removeDeposit(object);
  if(Math.hypot(local.x,local.z)<72&&local.y>0)return;
  for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++)for(let c=-2;c<=2;c++){
    const x=grid.x+a,y=grid.y+b,z=grid.z+c;
    const cell=new T.Vector3(x,y,z).multiplyScalar(size);
    const id=`${world.id}:${x},${y},${z}`;
    const rand=seeded((x*73856093^y*19349663^z*83492791^world.seed)>>>0);
    const direction=cell.clone().add(new T.Vector3(rand()-.5,rand()-.5,rand()-.5).multiplyScalar(size*.76)).normalize();
    const site=direction.clone().multiplyScalar(surfaceRadius(world,direction));
    if(site.distanceToSquared(cell)>size*size*.56 || site.distanceToSquared(local)>175**2)continue;
    const type=['iron','silica','crystal'][Math.floor(rand()*3)];
    addDeposit(world,id,direction,type,4+Math.floor(rand()*5));
  }
}
function setMode(next) {
  mode=next;game.dataset.mode=next;cameraBank=0;
  if(next!=='flight')silenceCabin();
  if(next==='eva'&&!suit)suit=createSuit(reduced);
  if(next!=='eva'&&next!=='intro'&&!cockpit)cockpit=makeCockpit(paint);
  moveSpeed.set(0,0,0);footDistance=0;
  sizeOverlays();
  $('attitude').hidden=next!=='flight';
  $('intro').hidden=next!=='intro';$('hud').hidden=next==='intro';
  for(const button of document.querySelectorAll('.lift'))button.hidden=next!=='flight';
  $('build').hidden=next!=='eva';
  clearMarkers();keys.clear();dirtyShadow=true;hudAt=0;
}
function begin() {
  if(!system||started)return;
  const snapshot=readSave();
  data={...initialData(),...snapshot?.data};
  world=system.planets.find(p=>p.id===snapshot?.world)||system.planets[0];
  const home=system.planets[0];
  const pos=snapshot?new T.Vector3(...snapshot.ship):surfaceAt(home,localSite(home,upVector,8,15),.06);
  flight=makeFlight(system.planets,pos,new T.Vector3(...(snapshot?.shipHeading||[0,0,-1])),snapshot?.fuel??100);
  flight.landingWorld=system.planets.find(p=>p.id===snapshot?.shipWorld)||(snapshot?.mode==='flight'?null:home);
  if(snapshot)player.fromArray(snapshot.player);else player.copy(surfaceAt(home,localSite(home,upVector,0,-4)));
  heading.fromArray(snapshot?.playerHeading||[0,0,-1]);
  if(snapshot?.view)pilot.fromArray(snapshot.view);else pilot.copy(frame(heading,upVector));
  energy=snapshot?.energy??100;
  chosen=system.planets.find(p=>p.id===snapshot?.chosen)||null;
  started=true;cancelAnimationFrame(introFrame);introFrame=0;populatePlanets();
  setMode(snapshot?.mode==='flight'?'flight':snapshot?.mode==='seat'?'seat':'eva');
  refreshWindow();
  capture();
  announce(snapshot?'远征记录已恢复。':'按 Q 扫描附近矿藏，按 B 打开基地蓝图。');
  resumeLoop();
}
function currentUp(position=player) { return position.clone().sub(world.position).normalize(); }
function viewOnSurface(localUp) {
  heading.addScaledVector(localUp,-heading.dot(localUp)).normalize();
  if(heading.lengthSq()<.001)heading.copy(tangentBasis(localUp).forward);
  eye.quaternion.copy(frame(heading,localUp)).multiply(q.setFromAxisAngle(rightAxis,pitch));
}
function surfacePosition() {
  if(mode==='eva') {
    const sway=reduced?0:Math.cos(stepPhase*2)*.031*T.MathUtils.smoothstep(stride,0,7)*(jump>0?0:1)-landedImpact*.012;
    const up=currentUp();
    eye.position.copy(player).addScaledVector(up,1.72+jump+sway);viewOnSurface(up);
  }
  else if(mode==='seat') {
    const up=currentUp(flight.position);
    eye.position.copy(flight.position).addScaledVector(up,2.39).addScaledVector(flight.heading,1.5);
    eye.quaternion.copy(frame(flight.heading,up));
  } else {
    eye.position.copy(flight.position).addScaledVector(flight.up,2.39).addScaledVector(flight.heading,1.5);
    eye.quaternion.copy(pilot).multiply(q.setFromAxisAngle(bankAxis,cameraBank));
  }
}
function surfaceAudio(strength){
  if(!soundOn||context?.state!=='running')return;
  if(!footBuffer){
    footBuffer=context.createBuffer(1,Math.ceil(context.sampleRate*.13),context.sampleRate);
    const noise=footBuffer.getChannelData(0);
    const random=seeded(27);
    for(let i=0;i<noise.length;i++)noise[i]=(random()*2-1)*(1-i/noise.length)**2;
  }
  const node=context.createBufferSource(), filter=context.createBiquadFilter(), level=context.createGain();
  node.buffer=footBuffer;
  node.playbackRate.value=1.15-strength*.30;
  filter.type='lowpass';filter.frequency.value=395+170*world.pressure;
  level.gain.value=.04+strength*.066;
  node.connect(filter).connect(level).connect(context.destination);
  node.start();
  node.onended=()=>{node.disconnect();filter.disconnect();level.disconnect();};
}
function cabinAudio(){
  if(!soundOn||context?.state!=='running'||mode!=='flight')return;
  if(!engine){
    const tone=context.createOscillator(), trim=context.createBiquadFilter(), gain=context.createGain();
    tone.type='triangle';trim.type='lowpass';trim.frequency.value=160;gain.gain.value=0;
    tone.connect(trim).connect(gain).connect(context.destination);tone.start();
    engine={tone,gain,trim,updateAt:0};
  }
  const drive=flight.auto?1:Math.min(1,Math.abs(cockpitControls.forward)+Math.abs(cockpitControls.side)+Math.abs(cockpitControls.lift));
  const t=context.currentTime;
  if(t<engine.updateAt)return;
  engine.updateAt=t+.071;
  engine.tone.frequency.setTargetAtTime(37+drive*36+flight.density*14,t,.10);
  engine.gain.gain.setTargetAtTime(.013+drive*.049,t,.14);
}
function silenceCabin(){
  if(!engine)return;
  const {tone,trim,gain}=engine;engine=null;
  tone.onended=()=>{tone.disconnect();trim.disconnect();gain.disconnect();};
  gain.gain.setTargetAtTime(0,context.currentTime,.075);
  tone.stop(context.currentTime+.35);
}
function updateEcology(dt){
  const airborne=mode==='flight', altitude=airborne?flight.altitude:0;
  if(!ecologyRequested&&altitude<48){
    ecologyRequested=true;
    import('./ecology.js').then(({createEcology})=>{
      ecology=createEcology(scene,{mobile,reduced,blocked:bioBlocked});
    }).catch(error=>console.error(error));
  }
  ecology?.update(world,mode==='eva'?player:flight.position,altitude,mode==='eva'?stride:0,dt,time);
}
function bioBlocked(p,body) {
  if(flight?.landingWorld===body&&p.distanceToSquared(flight.position)<34)return true;
  for(const item of objects.values())
    if(item.world===body.id&&p.distanceToSquared(item.pos)<(item.kind==='structure'?item.radius+1:2.4)**2)return true;
  return false;
}
function updateEVA(dt) {
  const up=surfaceUp.copy(player).sub(world.position).normalize();
  viewOnSurface(up);
  const right=heading.clone().cross(up).normalize();
  const strafe=key(keys,'KeyD','KeyA');
  const speed=energy>0 ? keys.has('ShiftLeft')||keys.has('ShiftRight')?8.8:5.15 : 2.55;
  walk.set(0,0,0).addScaledVector(heading,key(keys,'KeyW','KeyS')).addScaledVector(right,strafe).clampLength(0,1).multiplyScalar(speed);
  moveSpeed.addScaledVector(up,-moveSpeed.dot(up)).lerp(walk,1-Math.exp(-dt*(jump>0?2.7:walk.lengthSq()>0?9.2:14.2)));
  startStep.copy(player);
  if(moveSpeed.lengthSq()>.001){
    const radial=player.clone().addScaledVector(moveSpeed,dt).sub(world.position).normalize();
    const next=surfaceAt(world,radial);
    let blocked=false;
    for(const o of objects.values())if(o.kind==='structure'&&o.type!=='pad'&&o.world===world.id&&o.pos.distanceToSquared(next)<(o.radius*.69)**2){
      blocked=true;break;
    }
    if(!blocked&&next.distanceTo(flight.position)>2.1)player.copy(next);
    else moveSpeed.multiplyScalar(.35);
  }
  const meters=startStep.distanceTo(player);
  stride=meters/Math.max(.001,dt);stepPhase+=meters*1.73;
  energy=Math.max(0,energy-meters*.0085);
  let impact=0;
  if(jump>0||jumpSpeed>0){
    jumpSpeed-=world.gravity*dt;jump+=jumpSpeed*dt;
    if(jump<0){impact=-jumpSpeed;jump=jumpSpeed=0;surfaceAudio(.66);}
  } else if(meters>.001){
    footDistance+=meters;
    if(footDistance>(speed>7?2.24:1.75)){footDistance=0;surfaceAudio(speed>7?.46:.19);}
  }
  aimSway=T.MathUtils.damp(aimSway,0,10,dt);landedImpact=T.MathUtils.damp(landedImpact,impact,10,dt);
  Object.assign(layerMotion,{pitch,vertical:jumpSpeed,landed:impact,strafe,air:jump>0,turn:aimSway});
  suit.update(dt,stride,layerMotion);
  suit.light(system.sun,reverseView.copy(eye.quaternion).invert(),T.MathUtils.smoothstep(up.dot(system.sun),-.09,.39));
  if(player.distanceTo(flight.position)<8)energy=Math.min(100,energy+dt*9);
  updateDeposits();
}
function landingCheck(body, location, pads) {
  const local=[...objects.values()].filter(item=>item.world===body.id&&item.kind==='structure');
  if(pads){
    const marker=local.find(item=>item.type==='pad'&&item.pos.clone().sub(body.position).normalize()
      .distanceTo(location.clone().sub(body.position).normalize())*body.radius<3.7);
    return marker?{radius:marker.pos.distanceTo(body.position)+.43}:null;
  }
  const radial=location.clone().sub(body.position).normalize();
  return local.some(item=>item.type!=='pad'&&item.pos.clone().sub(body.position).normalize().distanceTo(radial)*body.radius<item.radius+3);
}
function updateFlight(dt) {
  const wasCruising=flight.auto;
  const result=flight.step(dt,keys,pilot,chosen,landingCheck);
  if(wasCruising&&!flight.auto&&!keys.has('Space')&&result!=='landed'){
    const tangent=flight.heading.clone().addScaledVector(flight.up,-flight.heading.dot(flight.up)).normalize();
    const approach=tangent.lengthSq()>.1?tangent:tangentBasis(flight.up).forward;
    pilot.copy(frame(approach.addScaledVector(flight.up,-.51).normalize(),flight.up));
    announce('已进入勘察区上空。按 C 下降，自选地点着陆。');
  }
  const next=flight.world;
  if(next!==world){world=next;dirtyShadow=true;loadedSector='';}
  if(!data.visited.includes(world.id)&&flight.altitude<700){data.visited.push(world.id);save();}
  if(result==='landed'){
    world=flight.landingWorld;
    if(!data.landed.includes(world.id)){data.landed.push(world.id);announce(`已登记 ${world.name} 的首次着陆。`);}
    else announce('起落架触地。可离舱或再起飞。');
    setMode('seat');blip('flight');save();
  }
}
function look(dx,dy) {
  if(dialog||mode==='intro'||mode==='seat')return;
  if(mode==='eva'){
    aimSway=T.MathUtils.clamp(aimSway+dx*.012,-1,1);
    heading.applyAxisAngle(currentUp(),-dx*.0025);
    pitch=T.MathUtils.clamp(pitch-dy*.0025,-1.31,1.31);
  } else {
    const localUp=flight.altitude<660?flight.up:upVector.clone().applyQuaternion(pilot);
    pilot.premultiply(q.setFromAxisAngle(localUp,-dx*.0024));
    const right=rightAxis.clone().applyQuaternion(pilot);
    pilot.premultiply(q.setFromAxisAngle(right,-dy*.0024)).normalize();
  }
}
function capture(){
  const canvas=renderer.domElement;canvas.focus({preventScroll:true});
  if(!mobile && canvas.requestPointerLock)try{canvas.requestPointerLock()?.catch(()=>{});}catch{}
}
function scanEffect() {
  const pulse=new T.Mesh(new T.RingGeometry(.965,1,92),new T.MeshBasicMaterial({
    color:0xd4f8a4,transparent:true,opacity:.7,depthWrite:false,side:T.DoubleSide,
    toneMapped:false,blending:T.AdditiveBlending,
  }));
  const up=currentUp();
  pulse.position.copy(player).addScaledVector(up,.33);
  pulse.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),up);
  scene.add(pulse);effects.push({mesh:pulse,start:time,duration:1.2,pulse:true});
}
function miningEffect(point,color) {
  const random=seeded(Math.floor(time*1000)), verts=[], velocities=[];
  const up=currentUp(point), {right,forward}=tangentBasis(up);
  for(let n=0;n<38;n++){
    verts.push(0,0,0);
    velocities.push(up.clone().multiplyScalar(1.3+random()*3)
      .addScaledVector(right,(random()-.5)*4.3).addScaledVector(forward,(random()-.5)*4.3));
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(verts,3));
  const sparks=new T.Points(geometry,new T.PointsMaterial({size:.075,color,transparent:true,depthWrite:false,
    blending:T.AdditiveBlending,toneMapped:false}));
  sparks.position.copy(point).addScaledVector(up,.62);scene.add(sparks);
  effects.push({mesh:sparks,velocities,up,start:time,duration:.74});
}
function updateEffects(){
  for(let index=effects.length-1;index>=0;index--){
    const effect=effects[index], age=time-effect.start,fraction=age/effect.duration;
    if(fraction>=1){
      scene.remove(effect.mesh);effect.mesh.geometry.dispose();effect.mesh.material.dispose();effects.splice(index,1);continue;
    }
    effect.mesh.material.opacity=(1-fraction)*.72;
    if(effect.pulse)effect.mesh.scale.setScalar(1+fraction*77);
    else{
      const buffer=effect.mesh.geometry.attributes.position;
      for(const [i,velocity] of effect.velocities.entries()){
        relative.copy(velocity).multiplyScalar(age).addScaledVector(effect.up,-age*age*2.7);
        buffer.setXYZ(i,relative.x,relative.y,relative.z);
      }
      buffer.needsUpdate=true;
    }
  }
}
function scan() {
  if(mode==='intro')return;
  scanUntil=time+17;
  blip('scan');
  if(mode==='eva'){suit.gesture('scan');scanEffect();announce('扫描完成。矿藏、记录站与附近生物已标注。',2.5);}
  else announce('航线数据已标注。可在星图选择目的地。',2.5);
}
function foundTarget() {
  if(mode!=='eva')return null;
  eye.getWorldDirection(sight);
  let best=null,score=-Infinity;
  const candidates=[...objects.values(),...(time<scanUntil?(ecology?.targets||[]):[])];
  for(const item of candidates){
    if(item.world!==world.id || item.kind==='wildlife'&&data.specimens.includes(`${item.world}:${item.type}`))continue;
    relative.copy(item.pos).addScaledVector(currentUp(item.pos),item.kind==='archive'?1.8:item.kind==='wildlife'?.7:1).sub(eye.position);
    const d=relative.length();
    const threshold=item.kind==='wildlife'?15:item.kind==='structure'?item.radius+3.6:item.kind==='archive'?8:7;
    if(d>threshold)continue;
    const alignment=relative.dot(sight)/Math.max(1,d);
    if(alignment<.43&&d>3)continue;
    const weight=alignment*2.2-d*.13-(item.kind==='wildlife'?.48:0);
    if(weight>score){best=item;score=weight;}
  }
  return best;
}
function use() {
  if(dialog)return;
  if(mode==='seat'){leaveShip();return;}
  if(mode!=='eva')return;
  if(placing){construct();return;}
  const selected=foundTarget();
  if(!selected)return;
  if(selected.kind==='wildlife'){
    const id=`${selected.world}:${selected.type}`;
    if(!data.specimens.includes(id)){
      data.specimens.push(id);suit.gesture('observe');blip('scan');
      announce(`已录入图鉴 · ${selected.name}`);save();
    }
  } else if(selected.kind==='deposit'){
    data.cargo[selected.type]=count(selected.type)+selected.amount;
    data.mined.push(selected.id);
    announce(`已采集 ${selected.name} ×${selected.amount}`);
    suit.gesture();blip('mine');miningEffect(selected.pos,materials[selected.type].color);removeDeposit(selected);dirtyShadow=true;save();
  } else if(selected.kind==='archive'){
    if(!data.discovered.includes(selected.id)){
      data.discovered.push(selected.id);data.cargo.crystal=count('crystal')+5;energy=Math.min(100,energy+22);
      announce(`已解译 ${world.name} 的记录，获得辉晶 ×5。`);
      blip('scan');save();
    } else announce('这座记录站已经录入航行档案。');
  } else if(selected.type==='bench')open('cargo');
  else if(selected.type==='hab'){
    if(powered(selected)){energy=100;announce('宇航服能源已补满。');save();}
    else announce('居住舱需要附近的太阳能阵列。');
  } else if(selected.type==='core')open('build');
  else announce(selected.type==='solar'?'太阳能阵列供电中。':'着陆平台已标记，可以在这里降落。');
}
function leaveShip() {
  world=flight.landingWorld||world;
  const up=currentUp(flight.position);
  const exit=flight.position.clone().addScaledVector(flight.heading,-4.8).sub(world.position).normalize();
  player.copy(surfaceAt(world,exit));
  heading.copy(flight.heading).negate();heading.addScaledVector(up,-heading.dot(up)).normalize();
  pitch=jump=jumpSpeed=0;setMode('eva');suit.reset();save();announce('已离舱。');
}
function board() {
  if(dialog)return;
  if(mode==='eva' && distShip()<7.1 && !placing) {
    setMode('seat');announce('舱门锁定。F 起飞，E 离舱。');
  } else if(mode==='seat') {
    pilot.copy(frame(flight.heading,currentUp(flight.position)));
    flight.up.copy(currentUp(flight.position)); flight.hop=9; flight.velocity.set(0,0,0);
    flight.auto=false;flight.landingWorld=null;
    setMode('flight');blip('flight');announce('起飞。R 上升，C 下降，空格制动。');
  } else if(mode==='flight'){
    if(!chosen){open('map');return;}
    toggleCruise();
  }
  save();
}
function distShip(){return flight.position.distanceTo(player);}
function toggleCruise(){
  flight.auto=!flight.auto;
  if(flight.auto&&chosen){alignCourse(chosen);announce(`巡航前往 ${chosen.name}。V 或空格退出巡航。`);}
  else announce('手动驾驶。');
}
function alignCourse(destination){
  const to=approachPoint(destination).sub(flight.position).normalize();
  const up=Math.abs(to.dot(flight.up))>.95?tangentBasis(flight.up).right:flight.up;
  pilot.copy(frame(to,up));
}
function baseNear(location) {
  return [...objects.values()].find(o=>o.kind==='structure'&&o.type==='core'&&o.world===world.id&&location.distanceTo(o.pos)<70);
}
function powered(structure) {
  return [...objects.values()].some(o=>o.kind==='structure'&&o.world===structure.world&&o.type==='solar'&&o.pos.distanceTo(structure.pos)<70);
}
function poweredWorkshop() {
  if(mode!=='eva')return false;
  const item=[...objects.values()].find(o=>o.type==='bench'&&o.world===world.id&&o.pos.distanceTo(player)<11);
  return item&&powered(item);
}
function previewPosition() {
  const destination=player.clone().addScaledVector(heading,placing.radius+4.8).sub(world.position).normalize();
  const root=surfaceAt(world,destination);
  const {right,forward}=tangentBasis(destination);
  for(const [x,z] of [[1,1],[-1,1],[-1,-1],[1,-1]]){
    const radial=localSite(world,destination,x*placing.radius*.68,z*placing.radius*.68);
    if(Math.abs(surfaceRadius(world,radial)-surfaceRadius(world,destination))>1.55)
      return {root,destination,error:'坡度过大'};
  }
  if(placing.id!=='core'&&!baseNear(root))return {root,destination,error:'需要在基地信标 70 米内'};
  if(root.distanceTo(flight.position)<placing.radius+4.2)return {root,destination,error:'距离飞船太近'};
  for(const item of objects.values())if(item.kind==='structure'&&item.world===world.id&&item.pos.distanceTo(root)<item.radius+placing.radius+.8)
    return {root,destination,error:'与已有建筑重叠'};
  return {root,destination,error:canAfford(placing.cost)?'':'材料不足'};
}
const ghostMaterial=new T.MeshBasicMaterial({color:0xb8ea98,transparent:true,opacity:.43,depthWrite:false});
function selectBlueprint(blueprint){
  cancelBuild();
  placing=blueprint;ghost=makeStructure(blueprint.id,paint);
  ghost.traverse(o=>{if(o.isMesh){o.material=ghostMaterial;o.castShadow=false;o.receiveShadow=false;}});
  scene.add(ghost);$('touch-place').hidden=false;
  close();
  announce(`${blueprint.name}预览。移动来选择位置，E 放置，Esc 取消。`);
}
function cancelBuild(){
  if(ghost){scene.remove(ghost);ghost.traverse(o=>{if(o.isMesh)o.geometry.dispose();});ghost=null;}
  placing=null;$('touch-place').hidden=true;
}
function structureAngle(up,root){
  const local=player.clone().sub(root).applyQuaternion(q.setFromUnitVectors(upVector,up).invert());
  return Math.atan2(local.x,local.z);
}
function construct() {
  if(!placing)return;
  const {destination,error,root}=previewPosition();
  if(error){announce(error);return;}
  const id=`build-${data.built.length}`;
  if(!exchange(placing.cost))return;
  const entry={id,type:placing.id,world:world.id,dir:destination.toArray(),angle:structureAngle(destination,root)};
  data.built.push(entry);registerStructure(entry);
  ecology?.invalidate(world,root);suit.gesture('build');
  announce(`已建成 ${placing.name}。`);cancelBuild();dirtyShadow=true;blip('scan');save();
}
function setPrompt(message){
  if(message===hintKey)return;
  hintKey=message;$('prompt').hidden=!message;
  const key=message.match(/^([BCEFJQRV]|空格)(?= )/);
  if(!key){set('prompt',message);return;}
  const cap=document.createElement('kbd');cap.textContent=key[0];
  $('prompt').replaceChildren(cap,message.slice(key[0].length));
}
function objective() {
  const built=id=>data.built.some(b=>b.type===id);
  if(!built('core'))return ['建立第一座基地','Q 扫描，E 采矿。按 B 选择基地信标。'];
  if(!built('solar'))return ['为基地供电','在信标附近放置太阳能阵列。'];
  if(!built('bench'))return ['建造制造工坊','工坊靠近阵列即可供电。'];
  if(data.made<1)return ['加工第一份材料','在工坊旁按 E，合成燃料或冶炼合金。'];
  if(data.landed.length<2)return ['前往另一颗星球','登船起飞，M 打开星图，巡航后降落。'];
  if(data.discovered.length<system.planets.length)return ['解译星系记录站',`已解译 ${data.discovered.length} / ${system.planets.length}。星球标记可引导落在记录站附近。`];
  return ['远征日志已完成','继续建造、航行，或回到自己的基地补给。'];
}
function clearMarkers(){for(const node of markerNodes)if(node)node.hidden=true;}
function marker(i,label,location,color) {
  if(!markerNodes[i]){
    const node=document.createElement('div');node.className='marker';$('markers').append(node);markerNodes[i]=node;
  }
  const item=markerNodes[i], view=relative.copy(location).applyMatrix4(eye.matrixWorldInverse);
  projected.copy(location).project(eye);
  let x=(projected.x+1)*.5*viewport.clientWidth,y=(1-projected.y)*.5*viewport.clientHeight;
  let arrow='';
  if(view.z>0||!Number.isFinite(x)||x<61||x>viewport.clientWidth-61){
    const left=view.x<0, side=left?0:1, slot=offscreen[side]++;
    if(slot>=(mobile?2:3))return;
    const inset=Math.max(65,label.replace(/[^\x00-\x7f]/g,'MM').length*4.1+12);
    x=left?inset:viewport.clientWidth-inset;
    y=viewport.clientHeight*.52+slot*32;arrow=left?'‹ ':'› ';
  }
  item.hidden=false;
  item.style.left=`${x}px`;item.style.top=`${T.MathUtils.clamp(y,viewport.clientHeight*.31,viewport.clientHeight*.74)}px`;
  item.style.color=color;
  if(item.textContent!==arrow+label)item.textContent=arrow+label;
}
function updateHUD() {
  if(time<hudAt)return;
  hudAt=time+.09;
  set('world-name',world.name);set('mode',mode==='eva'?world.biome:mode==='seat'?'座舱待命':flight.status);
  const [task,detail]=objective();set('objective',task);set('objective-detail',detail);
  set('navigation',mode==='eva'?`飞船 ${Math.round(distShip())} m`:chosen?`航向 ${chosen.name}`:'M 打开星图');
  const density=mode==='flight'?flight.density:airDensity(world,0);
  const panels=mode==='eva'?`<span>宇航服 <b>${Math.round(energy)}%</b></span><span>货舱 <b>${Object.values(data.cargo).reduce((a,b)=>a+b,0)}</b></span><span>地表 <b>${world.temperature} °C</b></span>`
    :`<span>燃料 <b>${Math.round(flight.fuel)}%</b></span><span>速度 <b>${Math.round(mode==='flight'?flight.speed:0)} m/s</b></span><span>离地 <b>${Math.round(mode==='flight'?flight.altitude:0)} m</b></span><span class="air-state">${density<.011?'真空':'近地'}</span>`;
  if($('readouts').innerHTML!==panels)$('readouts').innerHTML=panels;
  const items=[];
  delete game.dataset.target;
  if(mode==='eva'){
    items.push({name:'远征船',position:flight.position.clone().addScaledVector(currentUp(flight.position),4.3),color:'#f4b783'});
    const target=foundTarget();
    if(placing){
      const preview=previewPosition();
      alignSurface(ghost,world,preview.destination);
      ghost.rotateY(structureAngle(preview.destination,preview.root));
      ghostMaterial.color.set(preview.error?'#e48b77':'#b8ea98');
      setPrompt(preview.error||`E 放置${placing.name} · Esc 取消`);
    } else if(target){
      game.dataset.target=target.kind;
      const action=target.kind==='deposit'?`E 采集 ${target.name}`:target.kind==='wildlife'?`E 记录 ${target.name}`:`E 交互 · ${target.name}`;
      setPrompt(distShip()<7.1?`${action} · F 登船`:action);
    } else setPrompt(distShip()<7.1?'F 登船':'');
    if(time<scanUntil)for(const item of [...objects.values(),...(ecology?.targets||[])].filter(o=>
      o.world===world.id&&o.pos.distanceTo(player)<scanRadius&&
      (o.kind!=='wildlife'||!data.specimens.includes(`${o.world}:${o.type}`)))
      .sort((a,b)=>a.pos.distanceToSquared(player)-b.pos.distanceToSquared(player)).slice(0,7)){
      items.push({name:item.name,position:item.pos.clone().addScaledVector(currentUp(item.pos),item.kind==='archive'?5:2.5),color:item.kind==='wildlife'?'#b2f4dc':materials[item.type]?.color||'#d7edb3'});
    }
  } else if(mode==='seat')setPrompt('F 起飞 · E 离舱');
  else {
    updateAttitude();
    setPrompt(flight.altitude<35?'C 下降 · 空格减速 · 选择平坦着陆点': flight.auto?'V 或空格退出巡航':'');
    if(flight.altitude>200||time<scanUntil)for(const body of system.planets){
      if(body===world&&flight.altitude<650)continue;
      items.push({name:body.name,position:body.position.clone(),color:body.accent});
    }
    if(chosen&&(flight.altitude<720&&chosen===world)){
      const site=surfaceAt(chosen,upVector,8);
      items.push({name:'勘察区',position:site,color:'#e4e7bd'});
    }
    for(const pad of objects.values())if(pad.type==='pad'&&pad.pos.distanceTo(flight.position)<1400){
      items.push({name:'着陆平台',position:pad.pos.clone(),color:'#f4b783'});
    }
  }
  eye.updateMatrixWorld();
  clearMarkers();offscreen.fill(0);
  for(const [index,item] of items.entries()){
    const distance=item.position.distanceTo(eye.position);
    if(distance>3)marker(index,`${item.name} · ${distance>=1000?(distance/1000).toFixed(1)+' km':Math.round(distance)+' m'}`,item.position,item.color);
  }
  drawRadar(items);
}
function updateAttitude(){
  const forward=eye.getWorldDirection(sight);
  const {right,forward:north}=tangentBasis(flight.up);
  const bearing=(Math.round(-Math.atan2(forward.dot(right),forward.dot(north))*180/Math.PI)+360)%360;
  const pitchDeg=Math.round(Math.asin(T.MathUtils.clamp(forward.dot(flight.up),-1,1))*180/Math.PI);
  const sign=pitchDeg>0?'+':'';
  set('bearing',`${String(bearing).padStart(3,'0')}°  ·  ${sign}${pitchDeg}°`);
  $('flight-ladder-ticks').style.transform=`translateY(${T.MathUtils.clamp(pitchDeg*2.4,-57,57)}px) rotate(${-cameraBank*180/Math.PI}deg)`;
}
function drawRadar(items) {
  const canvas=$('radar'),ctx=canvas.getContext('2d'),center=canvas.width/2;
  const span = mode==='flight' ? Math.max(280,flight.altitude*3) : 95;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const radarFill=ctx.createRadialGradient(center,center,0,center,center,center);
  radarFill.addColorStop(0,'#173f3fe8');radarFill.addColorStop(1,'#071b20f3');
  ctx.fillStyle=radarFill;ctx.beginPath();ctx.arc(center,center,center-1,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#a2dacf55';ctx.lineWidth=1;
  for(const r of [.32,.61,.94]){ctx.beginPath();ctx.arc(center,center,center*r,0,Math.PI*2);ctx.stroke();}
  ctx.beginPath();ctx.moveTo(center,8);ctx.lineTo(center,canvas.height-8);ctx.moveTo(8,center);ctx.lineTo(canvas.width-8,center);ctx.stroke();
  const up=mode==='eva'?currentUp():flight.up, facing=new T.Vector3(0,0,-1).applyQuaternion(eye.quaternion);
  facing.addScaledVector(up,-facing.dot(up)).normalize();
  const right=facing.clone().cross(up).normalize();
  for(const item of items){
    const delta=item.position.clone().sub(eye.position);
    let x=delta.dot(right)*center/span,y=-delta.dot(facing)*center/span;
    const clamp=Math.min(1,center*.83/(Math.hypot(x,y)||1));x*=clamp;y*=clamp;
    ctx.fillStyle=item.color;ctx.fillRect(center+x-3,center+y-3,6,6);
  }
  ctx.fillStyle='#f5f0d3';ctx.beginPath();ctx.moveTo(center,center-7);ctx.lineTo(center+5,center+5);ctx.lineTo(center-5,center+5);ctx.closePath();ctx.fill();
}

function option(title, description, detail, action, label, enabled=true) {
  const node=document.createElement('article');node.className='option';
  const heading=document.createElement('h3');heading.textContent=title;
  const copy=document.createElement('p');copy.textContent=description;
  node.append(heading,copy);
  if(detail){const meta=document.createElement('small');meta.textContent=detail;node.append(meta);}
  if(action){const button=document.createElement('button');button.textContent=label;button.disabled=!enabled;button.addEventListener('click',action);node.append(button);}
  return node;
}
function dialogGrid(parent){
  const wrap=document.createElement('div');wrap.className='option-grid';parent.append(wrap);return wrap;
}
function mapDrawing(node) {
  const canvas=document.createElement('canvas');canvas.width=800;canvas.height=170;canvas.className='starmap';
  canvas.setAttribute('role','img');canvas.setAttribute('aria-label','星系图，标出三颗星球和远征船');
  node.append(canvas);
  const ctx=canvas.getContext('2d'), bounds={x0:-19900,x1:15800,z0:-21400,z1:5200};
  const sample=(x,z)=>[32+(x-bounds.x0)/(bounds.x1-bounds.x0)*736,20+(z-bounds.z0)/(bounds.z1-bounds.z0)*130];
  ctx.strokeStyle='#90b9b232';ctx.lineWidth=1;
  for(let x=40;x<800;x+=48){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,170);ctx.stroke();}
  for(let y=15;y<170;y+=26){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(800,y);ctx.stroke();}
  const [x,y]=sample(flight.position.x,flight.position.z);
  ctx.fillStyle='#fdf4d4';ctx.fillRect(T.MathUtils.clamp(x,4,790),T.MathUtils.clamp(y,4,160),7,7);
  for(const p of system.planets){
    const [sx,sy]=sample(p.position.x,p.position.z);
    if(chosen===p){
      ctx.setLineDash([6,4]);ctx.strokeStyle=p.accent;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(sx,sy);ctx.stroke();ctx.setLineDash([]);
    }
    ctx.fillStyle=p.accent;ctx.beginPath();ctx.arc(sx,sy,7+p.radius*.001,0,Math.PI*2);ctx.fill();
    ctx.font='15px system-ui';ctx.fillText(p.name,sx+18,sy+5);
  }
}
function drawPanel() {
  set('dialog-kind',{build:'CONSTRUCTION',cargo:'CARGO & FABRICATION',map:'SYSTEM CHART',help:'FLIGHT MANUAL',survey:'BIOSPHERE LOG',pause:'EXPEDITION PAUSED'}[dialog]);
  set('dialog-title',{build:'基地蓝图',cargo:'远征货舱',map:'子午线星系',help:'操控与任务',survey:'生物图鉴',pause:'远征暂停'}[dialog]);
  const content=$('dialog-content');content.replaceChildren();
  if(dialog==='build'){
    const grid=dialogGrid(content);
    for(const bp of blueprints)grid.append(option(bp.name,bp.detail,costLabel(bp.cost),()=>selectBlueprint(bp),'放置预览',mode==='eva'));
  } else if(dialog==='cargo'){
    const cargo=document.createElement('ul');cargo.className='inventory';content.append(cargo);
    for(const id of Object.keys(materials)){
      const row=document.createElement('li');row.textContent=`${materials[id].name} ${count(id)}`;cargo.append(row);
    }
    const grid=dialogGrid(content), ready=poweredWorkshop();
    for(const recipe of recipes)grid.append(option(recipe.name,ready?`产出 ${costLabel(recipe.result)}`:'需要靠近已供电的制造工坊。',
      costLabel(recipe.cost),()=>{
        if(poweredWorkshop()&&exchange(recipe.cost,recipe.result)){data.made++;save();drawPanel();blip('scan');}
      },'制造',Boolean(ready&&canAfford(recipe.cost))));
    grid.append(option('为飞船加注燃料','每单元燃料补充 30%。可在座舱内或靠近飞船时使用。',
      `当前 ${Math.round(flight.fuel)}%`,()=>{
        if((mode!=='eva'||distShip()<12)&&flight.fuel<100&&exchange({fuel:1})){flight.fuel=Math.min(100,flight.fuel+30);save();drawPanel();}
      },'加注',count('fuel')>0&&flight.fuel<100&&(mode!=='eva'||distShip()<12)));
  } else if(dialog==='map'){
    mapDrawing(content);
    const grid=dialogGrid(content);
    for(const planet of system.planets){
      const distance=Math.max(0,planet.position.distanceTo(flight.position)-planet.radius);
      grid.append(option(planet.name,planet.biome,`${(distance/1000).toFixed(1)} km${data.landed.includes(planet.id)?' · 已着陆':''}`,
        ()=>{chosen=planet;save();drawPanel();},chosen===planet?'已选定':'设为目的地',chosen!==planet));
    }
    if(chosen&&mode==='flight'){
      const engage=document.createElement('button');engage.className='primary';engage.textContent=`巡航前往${chosen.name}`;
      engage.addEventListener('click',()=>{flight.auto=false;toggleCruise();close();});
      engage.style.marginTop='14px';content.append(engage);
    }
  } else if(dialog==='survey'){
    const grid=dialogGrid(content);
    for(const body of system.planets){
      const entries=['flora','fauna'].map(type=>data.specimens.includes(`${body.id}:${type}`)
        ?habitat[body.id][type==='flora'?'plant':'animal']
        :type==='flora'?'植物待记录':'动物待记录');
      grid.append(option(body.name,entries.join(' · '),body.biome));
    }
  } else if(dialog==='help') {
    const grid=dialogGrid(content);
    grid.append(option('星球外勤','WASD 移动，鼠标锁定或按住画面拖动观察，Shift 奔跑，空格跳跃。Q 扫描，E 采矿、互动或记录物种，J 打开图鉴。靠近飞船后 F 登船。'));
    grid.append(option('驾驶飞船','F 起飞，W/S 推进和反推，A/D 横移，R 上升，C 下降，空格制动，Shift 增推。低速按住 C 在平地着陆，停稳后 E 离舱。'));
    grid.append(option('航线与基地','M 选星球，V 或星图按钮开启巡航，到达后手动下降。B 选择蓝图，E 放置，Esc 取消。I 查看货舱。'));
    grid.append(option('触屏','拖动画面改变视角，长按方向键或升降按钮，点击交互、扫描及飞船按钮。进度保存在当前浏览器。'));
  } else {
    const button=document.createElement('button');button.className='primary';button.textContent='继续探索';
    button.addEventListener('click',close);content.append(button);
  }
}
function open(which) {
  if(!started&&which!=='help')return;
  if(dialog===which){close();return;}
  dialog=which;keys.clear();drag=null;
  $('dialog').hidden=false;drawPanel();$('close').focus();
  if(document.pointerLockElement===renderer?.domElement)document.exitPointerLock();
  pauseLoop();
}
function close() {
  dialog=null;$('dialog').hidden=true;
  if(started)capture();
  resumeLoop();
}
let locked=false;
function bindInput() {
  $('start').onclick=begin;
  $('help').onclick=()=>open('help');
  $('pause').onclick=()=>open('pause');
  $('build').onclick=()=>open('build');
  $('cargo').onclick=()=>open('cargo');
  $('map').onclick=()=>open('map');
  $('survey').onclick=()=>open('survey');
  $('close').onclick=close;
  $('touch-use').onclick=use;$('touch-place').onclick=construct;$('touch-board').onclick=board;$('touch-scan').onclick=scan;
  $('audio').onclick=async()=>{
    try{
      if(!soundOn){context??=new AudioContext();await context.resume();}
      soundOn=!soundOn;if(!soundOn)silenceCabin();$('audio').setAttribute('aria-pressed',soundOn);
      set('audio',soundOn?'音效开':'音效关');blip('scan');
    }catch{set('audio','音效不可用');}
  };
  document.addEventListener('keydown',event=>{
    if(event.code==='Escape'){
      if(dialog)close();else if(placing)cancelBuild();else if(started)open('pause');
      return;
    }
    if(!started||dialog||event.target instanceof HTMLButtonElement&&event.code==='Space')return;
    if(event.code==='Space'||event.code.startsWith('Arrow'))event.preventDefault();
    keys.add(event.code);
    if(event.repeat)return;
    if(event.code==='Space'&&mode==='eva'&&!jump)jumpSpeed=3.65;
    if(event.code==='KeyE')use();
    if(event.code==='KeyF')board();
    if(event.code==='KeyQ')scan();
    if(event.code==='KeyB'&&mode==='eva')open('build');
    if(event.code==='KeyI')open('cargo');
    if(event.code==='KeyM')open('map');
    if(event.code==='KeyJ')open('survey');
    if(event.code==='KeyV'&&mode==='flight')board();
  });
  document.addEventListener('keyup',event=>keys.delete(event.code));
  window.addEventListener('blur',()=>keys.clear());
  const canvas=renderer.domElement;
  document.addEventListener('pointerlockchange',()=>{
    const nowLocked=document.pointerLockElement===canvas;
    if(locked&&!nowLocked&&started&&!dialog&&!document.hidden&&!placing)open('pause');
    locked=nowLocked;
  });
  document.addEventListener('mousemove',event=>{if(locked)look(event.movementX,event.movementY);});
  canvas.addEventListener('pointerdown',event=>{
    if(!started||dialog||locked||drag)return;
    canvas.setPointerCapture(event.pointerId);drag={id:event.pointerId,x:event.clientX,y:event.clientY};
  });
  canvas.addEventListener('pointermove',event=>{
    if(drag?.id!==event.pointerId)return;
    look((event.clientX-drag.x)*1.55,(event.clientY-drag.y)*1.55);
    drag.x=event.clientX;drag.y=event.clientY;
  });
  canvas.addEventListener('lostpointercapture',event=>{if(drag?.id===event.pointerId)drag=null;});
  for(const button of document.querySelectorAll('[data-key]')){
    button.addEventListener('pointerdown',event=>{
      button.setPointerCapture(event.pointerId);keys.add(button.dataset.key);
      if(button.dataset.key==='Space'&&mode==='eva'&&!jump)jumpSpeed=3.65;
    });
    button.addEventListener('lostpointercapture',()=>keys.delete(button.dataset.key));
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){keys.clear();save();pauseLoop();}else resumeLoop();
  });
  window.addEventListener('pagehide',()=>{save();pauseLoop();});
  window.addEventListener('pageshow',()=>resumeLoop());
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();visualsFrozen=true;save();pauseLoop();});
  canvas.addEventListener('webglcontextrestored',()=>{visualsFrozen=false;dirtyShadow=true;resize();resumeLoop();});
}
function refreshWindow() {
  const anchor=mode==='eva'?player:flight.position;
  for(const body of system.planets)body.update(anchor,body===world);
  world.loadSurface();
  for(const object of objects.values())object.model.visible=object.world===world.id&&object.pos.distanceTo(anchor)<1250;
  for(const row of scenic)row.mesh.visible=row.world===world.id;
  if(shadowPosition.distanceToSquared(anchor)>14**2)dirtyShadow=true;
}
function render() {
  const exterior=mode==='eva'||mode==='intro';
  vehicle.root.visible=exterior;
  if(started&&exterior){
    const up=flight.position.clone().sub((flight.landingWorld||world).position).normalize();
    vehicle.root.position.copy(flight.position);
    const forward=flight.heading.clone().addScaledVector(up,-flight.heading.dot(up)).normalize();
    vehicle.root.quaternion.copy(frame(forward.lengthSq()>.01?forward:tangentBasis(up).forward,up));
  }
  if(dirtyShadow){
    const surface=mode==='flight'?player:eye.position;
    shadowPosition.copy(surface);
    system.light.target.position.copy(shadowPosition);
    system.light.position.copy(shadowPosition).addScaledVector(system.sun,180);
    renderer.shadowMap.needsUpdate=true;dirtyShadow=false;
  }
  renderer.render(scene,eye);
  if(exterior&&mode==='intro')return;
  const overlay=exterior?suit:cockpit;
  renderer.autoClear=false;renderer.clearDepth();
  renderer.render(overlay.scene,overlay.camera);
  renderer.autoClear=true;
}
function stepCockpit(dt) {
  if(!cockpit||mode==='eva')return;
  const flying=mode==='flight';
  cockpitControls.forward=flying?key(keys,'KeyW','KeyS'):0;
  cockpitControls.side=flying?key(keys,'KeyD','KeyA'):0;
  cockpitControls.lift=flying?key(keys,'KeyR','KeyC'):0;
  cameraBank=T.MathUtils.damp(cameraBank,reduced?0:-cockpitControls.side*.067,5.8,dt);
  cockpitTelemetry.speed=flying?flight.speed:0;
  cockpitTelemetry.altitude=flying?flight.altitude:0;
  cockpitTelemetry.vertical=flying?flight.vertical:0;
  cockpitTelemetry.fuel=flight.fuel;cockpitTelemetry.landed=!flying;
  cockpitTelemetry.cruise=flying&&flight.auto;cockpitTelemetry.braking=flying&&keys.has('Space');
  cockpit.update(dt,time,cockpitControls,cockpitTelemetry);
  cabinAudio();
}
function tuneResolution(ms) {
  if(ms<4||ms>200)return;
  averageFrame=sampleCount?averageFrame*.93+ms*.07:ms;
  sampleCount++;
  if(time<tuneAt||sampleCount<42)return;
  tuneAt=time+1.25;
  const next=averageFrame>29?Math.max(.70,pixelRatio*.87):averageFrame<18?Math.min(maxRatio,pixelRatio+.09):pixelRatio;
  if(Math.abs(next-pixelRatio)>.025){
    pixelRatio=next;renderer.setPixelRatio(pixelRatio);
  }
}
function addScenery(body) {
  if(body.hasPending()||scenic.some(item=>item.world===body.id))return;
  scenic.push({world:body.id,mesh:boulders(scene,paint,body,upVector)});
  dirtyShadow=true;
}
function streamTerrain(body) {
  if(body?.stream())return true;
  return system.planets.some(planet=>planet!==body&&planet.stream(1));
}
function frameTick(now) {
  if(!started||dialog||document.hidden||visualsFrozen)return;
  const ms=now-clock;const dt=Math.min(ms/1000,.064);clock=now;if(dt<=0)return;
  tuneResolution(ms);
  time+=dt;
  renderHold+=dt;
  look(key(keys,'ArrowRight','ArrowLeft')*dt*640,key(keys,'ArrowDown','ArrowUp')*dt*550);
  if(mode==='eva')updateEVA(dt);else if(mode==='flight')updateFlight(dt);
  surfacePosition();
  stepCockpit(dt);
  if(time>refreshAt){
    const pos=mode==='eva'?player:flight.position;
    const movement=previousPosition.distanceTo(pos);
    if(movement>Math.max(9,flight.altitude*.13)||time-sceneTimer>4&&movement>1.5){
      refreshWindow();previousPosition.copy(pos);sceneTimer=time;
    }
    refreshAt=time+.34;
  }
  streamTerrain(world);
  if(mode!=='flight')addScenery(world);
  updateEcology(dt);
  if(time>saveAt){save();saveAt=time+5;}
  if(time>noticeUntil)set('notice','');
  updateEffects();
  updateHUD();
  const interval=1/(mobile?30:45);
  if(renderHold>=interval){renderHold%=interval;render();}
}
function pauseLoop(){
  renderer?.setAnimationLoop(null);
  silenceCabin();
  cancelAnimationFrame(introFrame);introFrame=0;
  if(context?.state==='running'&&document.hidden)context.suspend().catch(()=>{});
}
function resumeLoop(){
  if(!renderer||document.hidden||dialog||visualsFrozen)return;
  if(soundOn&&context?.state==='suspended')context.resume().catch(()=>{});
  if(!started){scheduleIntro();return;}
  clock=performance.now();averageFrame=0;sampleCount=0;
  renderer.setAnimationLoop(frameTick);
}
function sizeOverlays(){
  if(suit){suit.camera.aspect=eye.aspect;suit.camera.updateProjectionMatrix();}
  cockpit?.resize(eye.aspect);
}
function scheduleIntro(){
  if(introFrame||started||document.hidden||dialog||visualsFrozen)return;
  introFrame=requestAnimationFrame(()=>{
    introFrame=0;
    const home=system.planets[0];
    streamTerrain(home);
    addScenery(home);
    render();
    if(system.planets.some(body=>body.hasPending()))scheduleIntro();
  });
}
function resize(){
  if(!renderer)return;
  const width=viewport.clientWidth,height=Math.max(1,viewport.clientHeight);
  eye.aspect=width/height;eye.fov=width<580?68:61;eye.updateProjectionMatrix();
  sizeOverlays();
  renderer.setSize(width,height,false);
  if(mode==='intro')introView();
  if(!visualsFrozen&&!document.hidden)render();
}
function introView() {
  const home=system.planets[0];
  const narrow=viewport.clientWidth<630;
  eye.position.copy(surfaceAt(home,localSite(home,upVector,narrow?-4:-7,narrow?-11:-5),narrow?3.1:2.65));
  eye.lookAt(surfaceAt(home,localSite(home,upVector,narrow?7:-2,24),narrow?3:2.72));
}
try {
  renderer=new T.WebGLRenderer({antialias:!mobile,logarithmicDepthBuffer:true,powerPreference:'high-performance'});
  maxRatio=Math.min(devicePixelRatio,mobile?1.10:1.35);pixelRatio=maxRatio;
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.14;
  renderer.shadowMap.enabled=!mobile;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
  renderer.domElement.tabIndex=-1;
  renderer.domElement.setAttribute('aria-label','星系第一视角');
  viewport.append(renderer.domElement);
  system=createSystem(scene,()=>scheduleIntro());
  paint=paintSet();vehicle=makeShip(paint);scene.add(vehicle.root);
  const home=system.planets[0];
  alignSurface(vehicle.root,home,localSite(home,upVector,8,15),.06);
  previousPosition=new T.Vector3();
  introView();
  for(const body of system.planets)body.update(eye.position,body===home);
  resize();bindInput();
  scheduleIntro();home.loadSurface();
  window.addEventListener('resize',resize);
  $('start').disabled=false;set('start',readSave()?'继续远征':'开始远征');
}catch(error){
  console.error(error);set('start','星系载入失败');$('boot').hidden=false;
  set('boot','请重新加载，或使用支持 WebGL 3D 加速的浏览器。');
}
