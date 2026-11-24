import * as T from './vendor/three.module.min.js';
import { canvasTexture, seeded } from './mesh.js';
import { worlds } from './catalog.js?v=2';

const sphereDir = (face, u, v, out) => {
  if (face===0) out.set(1,v,u);
  else if (face===1) out.set(-1,v,-u);
  else if (face===2) out.set(u,1,v);
  else if (face===3) out.set(u,-1,-v);
  else if (face===4) out.set(-u,v,1);
  else out.set(u,v,-1);
  return out.normalize();
};
function faceCoordinates(dir){
  const {x,y,z}=dir, ax=Math.abs(x), ay=Math.abs(y), az=Math.abs(z);
  if(ax>=ay&&ax>=az)return [x>=0?0:1,z/x,y/ax];
  if(ay>=az)return [y>=0?2:3,x/ay,z/y];
  return [z>=0?4:5,-x/z,y/az];
}
function hash(x,y,z,seed) {
  let n = Math.imul(x,374761393) + Math.imul(y,668265263) + Math.imul(z,1446648777) + Math.imul(seed,1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
function noise(x,y,z,seed) {
  const ix=Math.floor(x), iy=Math.floor(y), iz=Math.floor(z);
  let a=x-ix,b=y-iy,c=z-iz;
  a*=a*(3-2*a); b*=b*(3-2*b); c*=c*(3-2*c);
  const p = T.MathUtils.lerp(hash(ix,iy,iz,seed), hash(ix+1,iy,iz,seed), a);
  const q = T.MathUtils.lerp(hash(ix,iy+1,iz,seed), hash(ix+1,iy+1,iz,seed), a);
  const r = T.MathUtils.lerp(hash(ix,iy,iz+1,seed), hash(ix+1,iy,iz+1,seed), a);
  const s = T.MathUtils.lerp(hash(ix,iy+1,iz+1,seed), hash(ix+1,iy+1,iz+1,seed), a);
  return T.MathUtils.lerp(T.MathUtils.lerp(p,q,b),T.MathUtils.lerp(r,s,b),c);
}
const datum = new T.Vector3(0,1,0);
export function relief(world, d) {
  const {x,y,z}=d, seed=world.seed;
  const broad=noise(x*4.8,y*4.8,z*4.8,seed);
  const massif = noise(x*13,y*13,z*13,seed);
  const r = 1 - Math.abs(noise(x*34,y*34,z*34,seed)*2-1);
  const erosion = noise(x*76,y*76,z*76,seed);
  const fine = noise(x*202,y*202,z*202,seed);
  const scale = world.id==='rime' ? .76 : world.id==='veil' ? 1.32 : 1;
  const peak = (broad-.48)*114 + (massif-.43)*56 + r*r*32 + erosion*11 + (fine-.5)*3.4;
  const landingShelf = T.MathUtils.smoothstep(Math.sqrt(d.distanceToSquared(datum))*world.radius, 32, 104);
  return peak*scale*landingShelf;
}
export function surfaceRadius(world, radial) { return world.radius+relief(world,radial); }
export function surfaceAt(world, radial, offset=0) {
  return radial.clone().multiplyScalar(surfaceRadius(world,radial)+offset).add(world.position);
}
export function tangentBasis(up) {
  const reference = Math.abs(up.z) < .96 ? new T.Vector3(0,0,-1) : new T.Vector3(0,1,0);
  const right = reference.clone().cross(up).normalize();
  return { right, forward:up.clone().cross(right).normalize() };
}
export function localSite(world, direction, dx, dz) {
  const {right,forward} = tangentBasis(direction);
  return direction.clone().multiplyScalar(world.radius).addScaledVector(right,dx).addScaledVector(forward,dz).normalize();
}

function makeGrain() {
  const grain = seeded(21604);
  const map = canvasTexture(256,256, ctx=>{
    const data=ctx.createImageData(256,256);
    for(let y=0;y<256;y++) for(let x=0;x<256;x++){
      const c = 111 + grain()*73 + 27*Math.sin(x*.17+y*.062)*Math.cos(y*.21-x*.04);
      data.data.set([c,c,c,255],(x+y*256)*4);
    }
    ctx.putImageData(data,0,0);
    for(let i=0;i<1300;i++){
      const x=grain()*256,y=grain()*256,r=grain()**4*3.7+.35;
      ctx.fillStyle=grain()>.49?'#1d1d1d64':'#f1f1f17c';
      ctx.beginPath();ctx.ellipse(x,y,r,r*.54,grain()*6,0,Math.PI*2);ctx.fill();
    }
  });
  map.wrapS=map.wrapT=T.RepeatWrapping;
  map.colorSpace=T.NoColorSpace;
  map.anisotropy=8;
  return map;
}
function groundMaterial(world, grain, scan) {
  const mat = new T.MeshStandardMaterial({roughness:.92,metalness:.045,vertexColors:true});
  mat.defines={ ROCK_SCALE: world.id==='veil' ? '0.154' : '0.28' };
  mat.onBeforeCompile = shader=>{
    Object.assign(shader.uniforms,{
      grit:{value:grain}, surveyColor:scan.color, surveyRelief:scan.relief, rockTint:{value:new T.Color(world.rock)}, dustTint:{value:new T.Color(world.dust)},
      frostTint:{value:new T.Color(world.frost)}, horizonTint:{value:new T.Color(world.air)},
      groundCenter:{value:world.position},
    });
    shader.vertexShader = 'varying vec3 vSurface; varying vec3 vWorldN;\n' + shader.vertexShader
      .replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
        vSurface=(modelMatrix*vec4(transformed,1.0)).xyz;
        vWorldN=normalize(mat3(modelMatrix)*objectNormal);`);
    shader.fragmentShader = `uniform sampler2D grit,surveyColor,surveyRelief;
      uniform vec3 rockTint,dustTint,frostTint,horizonTint,groundCenter;
      varying vec3 vSurface,vWorldN;
    ` + shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 local=vSurface-groundCenter;
      vec3 n=normalize(vWorldN);
      vec3 w=pow(abs(n),vec3(6.0)); w/=max(.0001,w.x+w.y+w.z);
      float viewRange=length(vViewPosition);
      vec2 macroUV=mix(local.xz,local.xy,step(abs(n.y),abs(n.z)));
      if(abs(n.x)>max(abs(n.y),abs(n.z)))macroUV=local.yz;
      float macro=texture2D(grit,macroUV*.006).r;
      float steep=smoothstep(.91,.998,dot(n,normalize(local)));
      float dust=clamp(steep*.72+(macro-.46)*.9,0.,1.);
      vec3 stone=mix(rockTint,dustTint,dust);
      stone=mix(stone,frostTint,smoothstep(.62,.87,macro)*.28);
      float scanHeight=.5;
      float fine=1.;
      if(viewRange<510.){
        vec3 texPos=local*ROCK_SCALE;
        vec3 scanned=texture2D(surveyColor,texPos.yz).rgb*w.x+
          texture2D(surveyColor,texPos.xz).rgb*w.y+texture2D(surveyColor,texPos.xy).rgb*w.z;
        float limestone=dot(scanned,vec3(.2126,.7152,.0722));
        fine=mix(1.,clamp(.76+limestone*1.48,.66,1.38),1.-smoothstep(90.,500.,viewRange));
        if(viewRange<65.)scanHeight=dot(vec3(texture2D(surveyRelief,texPos.yz).r,
          texture2D(surveyRelief,texPos.xz).r,texture2D(surveyRelief,texPos.xy).r),w);
      }
      float strata=cos((length(local)+macro*12.0)*1.8+sin(local.z*.036)*1.2)*.5+.5;
      diffuseColor.rgb*=stone*(.94+(macro-.47)*.16+strata*(1.-steep)*.17)*fine;
    `).replace('#include <normal_fragment_maps>',`
      float roughRelief=scanHeight*.055*(1.-smoothstep(10.,62.,viewRange));
      vec2 slope=vec2(dFdx(roughRelief),dFdy(roughRelief));
      if(viewRange<65.){
        vec3 sigmaX=dFdx(-vViewPosition),sigmaY=dFdy(-vViewPosition);
        vec3 r1=cross(sigmaY,normal),r2=cross(normal,sigmaX);
        float determinant=dot(sigmaX,r1);
        if(abs(determinant)>1e-10)normal=normalize(abs(determinant)*normal-sign(determinant)*(slope.x*r1+slope.y*r2));
      }
    `).replace('#include <opaque_fragment>',`
      float air=1.-exp(-length(vViewPosition)*.00021);
      float nearGround=1.-smoothstep(60.,1250.,length(cameraPosition-groundCenter)-length(local));
      outgoingLight=mix(outgoingLight,horizonTint*.42,air*nearGround*.31);
      #include <opaque_fragment>`);
  };
  return mat;
}
const d=new T.Vector3(), dx=new T.Vector3(), dy=new T.Vector3(), n=new T.Vector3(), point=new T.Vector3();
function patchGeometry(world,face,u,v,size,lod) {
  const div=lod<4?12:16;
  const positions=[], normals=[], colors=[], indices=[];
  const step=size/div;
  for(let j=0;j<=div;j++) for(let i=0;i<=div;i++){
    const uu=u+i*step,vv=v+j*step;
    sphereDir(face,uu,vv,d);
    const r=surfaceRadius(world,d);
    point.copy(d).multiplyScalar(r);
    sphereDir(face,uu+.0004,vv,dx); dx.multiplyScalar(surfaceRadius(world,dx)).sub(point);
    sphereDir(face,uu,vv+.0004,dy); dy.multiplyScalar(surfaceRadius(world,dy)).sub(point);
    n.crossVectors(dx,dy).normalize();if(n.dot(d)<0)n.negate();
    positions.push(point.x,point.y,point.z);normals.push(n.x,n.y,n.z);
    const shadow=.83+noise(d.x*39,d.y*39,d.z*39,world.seed+7)*.22;
    colors.push(shadow,shadow,shadow);
  }
  for(let j=0;j<div;j++) for(let i=0;i<div;i++){
    const a=j*(div+1)+i,b=a+1,c=a+div+1,e=c+1;
    indices.push(a,c,b,b,c,e);
  }
  const sides=[[],[],[],[]];
  for(let i=0;i<=div;i++){
    sides[0].push(i);sides[1].push(i*(div+1)+div);
    sides[2].push(div*(div+1)+div-i);sides[3].push((div-i)*(div+1));
  }
  for(const edge of sides){
    const start=positions.length/3;
    for(const index of edge){
      point.fromArray(positions,index*3);
      point.addScaledVector(d.copy(point).normalize(),-Math.min(9,Math.max(.60,size*world.radius*.024)));
      positions.push(...point.toArray());
      normals.push(...normals.slice(index*3,index*3+3));
      colors.push(...colors.slice(index*3,index*3+3));
    }
    for(let i=0;i<div;i++){
      const a=edge[i], b=edge[i+1], c=start+i, e=c+1;
      indices.push(a,b,c,b,e,c);
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

function terrain(world, scene, grain, scan) {
  const parent = new T.Group();
  parent.position.copy(world.position);
  scene.add(parent);
  const mat = groundMaterial(world,grain,scan);
  const cache=new Map(), visible=new Set(), pending=[];
  const target=new T.Vector3(), center=new T.Vector3();
  let epoch=0, maxDetail=0;
  const roots=Array.from({length:6},(_,face)=>({face,u:-1,v:-1,size:2,lod:0,path:String(face)}));
  function build(tile) {
    const {face,u,v,size,lod,path}=tile;
    const mesh=new T.Mesh(patchGeometry(world,face,u,v,size,lod),mat);
    mesh.receiveShadow=true;
    mesh.visible=false;
    parent.add(mesh);
    cache.set(path,{mesh,epoch});
  }
  for(const root of roots)build(root);
  function select(tile,chosen) {
    const {face,u,v,size,lod,path}=tile;
    const ready=cache.get(path);
    ready.epoch=epoch;
    sphereDir(face,u+size/2,v+size/2,center).multiplyScalar(world.radius);
    const distance=center.distanceTo(target);
    if(lod<maxDetail&&distance<size*world.radius*1.72){
      const half=size/2;
      const children=Array.from({length:4},(_,i)=>({
        face,u:u+(i%2)*half,v:v+Math.floor(i/2)*half,size:half,lod:lod+1,path:path+i,
      }));
      if(children.every(child=>cache.has(child.path))){
        for(const child of children)select(child,chosen);
        return;
      }
      for(const child of children){
        const cached=cache.get(child.path);
        if(cached)cached.epoch=epoch;
        else pending.push({tile:child,distance});
      }
    }
    ready.mesh.visible=true;
    chosen.add(path);
  }
  function reconcile(){
    pending.length=0;
    const chosen=new Set();
    for(const root of roots)select(root,chosen);
    for(const key of visible)if(!chosen.has(key))cache.get(key).mesh.visible=false;
    visible.clear();
    for(const id of chosen)visible.add(id);
    pending.sort((a,b)=>a.tile.lod-b.tile.lod||a.distance-b.distance);
    if(cache.size>220)for(const [key,tile] of cache){
      if(key.length>1&&tile.epoch<epoch-4){
        parent.remove(tile.mesh);tile.mesh.geometry.dispose();cache.delete(key);
      }
    }
  }
  return {
    update(position,focus){
      target.copy(position).sub(world.position);
      maxDetail=focus ? 8 : 2;
      epoch++;
      reconcile();
    },
    stream(limit=2){
      if(!pending.length)return false;
      const deadline=performance.now()+2.2;
      let built=0;
      for(const {tile} of pending){
        build(tile);
        if(++built>=limit||performance.now()>=deadline)break;
      }
      reconcile();
      return true;
    },
    hasPending(){return pending.length>0;},
    readyAround(position){
      const direction=position.clone().sub(world.position).normalize();
      const {right,forward}=tangentBasis(direction);
      const offsets=[[0,0],[-35,-35],[35,-35],[-35,35],[35,35]];
      return offsets.every(([x,z])=>{
        const [face,u,v]=faceCoordinates(direction.clone().multiplyScalar(world.radius).addScaledVector(right,x).addScaledVector(forward,z));
        let id=String(face), s=(u+1)/2, t=(v+1)/2;
        for(let level=0;level<5;level++){
          if(visible.has(id))return false;
          const i=s>.5?1:0,j=t>.5?1:0;
          id+=i+2*j;s=s*2-i;t=t*2-j;
        }
        return true;
      });
    },
  };
}
function atmosphere(world, scene, sun) {
  const material=new T.ShaderMaterial({
    transparent:true,depthWrite:false,side:T.BackSide,blending:T.AdditiveBlending,
    uniforms:{origin:{value:world.position},tint:{value:new T.Color(world.air)},sun:{value:sun},radius:{value:world.radius},pressure:{value:world.pressure}},
    vertexShader:`varying vec3 p;
      #include <common>
      #include <logdepthbuf_pars_vertex>
      void main(){p=(modelMatrix*vec4(position,1.)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);
      #include <logdepthbuf_vertex>
      }`,
    fragmentShader:`varying vec3 p; uniform vec3 origin,tint,sun; uniform float radius,pressure;
      #include <common>
      #include <logdepthbuf_pars_fragment>
      void main(){
      #include <logdepthbuf_fragment>
      vec3 v=normalize(p-cameraPosition);
      vec3 n=normalize(p-origin);
      vec3 local=cameraPosition-origin;
      float h=length(local)/radius;
      float limb=pow(1.-abs(dot(n,v)),3.);
      float light=.07+.93*smoothstep(-.20,.72,dot(n,sun));
      float halo=pow(max(0.,dot(v,sun)),14.);
      float visibility=pressure*(.32+halo*.37);
      if(h<1.036){
        vec3 zenith=normalize(local);
        float daylight=smoothstep(-.20,.20,dot(zenith,sun));
        float altitude=1.-smoothstep(1.004,1.036,h);
        float horizon=pow(1.-clamp(dot(zenith,v),0.,1.),3.);
        float opacity=(.03+.16*halo+.39*horizon)*altitude*visibility*daylight;
        gl_FragColor=vec4(tint, opacity);
      } else {
        gl_FragColor=vec4(tint*(.74+halo*.45),limb*light*visibility);
      }
      }`,
  });
  const mesh=new T.Mesh(new T.SphereGeometry(world.radius*1.036,64,34),material);
  mesh.position.copy(world.position);scene.add(mesh);
}
function sky(scene,sun) {
  const map=canvasTexture(512,256,ctx=>{
    const image=ctx.createImageData(512,256);
    for(let y=0;y<256;y++)for(let x=0;x<512;x++){
      const u=x/512, v=y/256;
      const c=1-Math.min(1,Math.abs(v-.48-.16*Math.sin(u*6.283))/.28);
      const fog=noise(u*18,v*23,.5,17)*.7+noise(u*76,v*64,9,39)*.3;
      const radiance=c**2* Math.max(0,fog-.26);
      image.data.set([6+radiance*45,9+radiance*36,14+radiance*56,255],(x+y*512)*4);
    }
    ctx.putImageData(image,0,0);

  });
  map.mapping=T.EquirectangularReflectionMapping;
  scene.background=map;
  const rng=seeded(671);
  const positions=[],colors=[];
  for(let i=0;i<6700;i++){
    const y=rng()*2-1, angle=rng()*6.2831853, r=Math.sqrt(1-y*y);
    positions.push(66000*r*Math.cos(angle),66000*y,66000*r*Math.sin(angle));
    const shade=.15+.78*rng()**4;
    colors.push(shade,shade*(.83+.14*rng()),shade*(.83+.15*rng()));
  }
  const stars=new T.BufferGeometry();
  stars.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  stars.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  scene.add(new T.Points(stars,new T.PointsMaterial({vertexColors:true,size:1,sizeAttenuation:false,toneMapped:false})));
  const starMat=new T.MeshBasicMaterial({color:0xffe3a9,toneMapped:false});
  const star=new T.Mesh(new T.SphereGeometry(340,24,16),starMat);
  star.position.copy(sun).multiplyScalar(45500);scene.add(star);
  const flare=canvasTexture(128,128,ctx=>{
    const g=ctx.createRadialGradient(64,64,0,64,64,64);
    g.addColorStop(0,'#fff4caff');g.addColorStop(.105,'#fff2b4e0');g.addColorStop(.26,'#ffd58354');g.addColorStop(1,'#ffd68d00');
    ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
  });
  const sprite=new T.Sprite(new T.SpriteMaterial({map:flare,transparent:true,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));
  sprite.position.copy(star.position).multiplyScalar(.993);sprite.scale.set(3550,3550,1);scene.add(sprite);
}
function rings(scene,world) {
  const geometry=new T.RingGeometry(world.radius*1.40,world.radius*2.06,160,16);
  const positions=geometry.attributes.position, uv=geometry.attributes.uv;
  for(let i=0;i<positions.count;i++)uv.setXY(i,(Math.hypot(positions.getX(i),positions.getY(i))/world.radius-1.4)/.66,.5);
  const bands=canvasTexture(512,8,ctx=>{
    const random=seeded(79);
    for(let i=0;i<512;i++){
      ctx.fillStyle=`rgba(218,218,178,${Math.sin(i*.03)**2*.25+random()*.22})`;
      ctx.fillRect(i,0,1,8);
    }
  });
  const ring=new T.Mesh(geometry,new T.MeshBasicMaterial({map:bands,transparent:true,side:T.DoubleSide,depthWrite:false,toneMapped:false}));
  ring.rotation.set(1.11,.44,-.16);ring.position.copy(world.position);scene.add(ring);
}
export function createSystem(scene, onSurfaceReady) {
  const loader=new T.TextureLoader();
  const sun=new T.Vector3(-.63,.48,.44).normalize();
  sky(scene,sun);
  const grain=makeGrain();
  const planets=worlds.map(entry=>{
    const world={...entry,position:new T.Vector3(...entry.center),up:new T.Vector3(0,1,0)};
    const scan={color:{value:grain},relief:{value:grain}};
    let requested=false;
    world.loadSurface=()=>{
      if(requested)return;
      requested=true;
      Promise.all(['color','relief'].map(kind=>
        loader.loadAsync(new URL(`textures/${world.id}-${kind}.webp`, import.meta.url).href)
          .then(texture=>({kind,texture})).catch(()=>null)))
        .then(results=>{
          for(const result of results){
            if(!result)continue;
            const {kind,texture}=result;
            if(kind==='color')texture.colorSpace=T.SRGBColorSpace;
            texture.wrapS=texture.wrapT=T.RepeatWrapping;
            texture.anisotropy=6;
            scan[kind].value=texture;
          }
          if(results.some(Boolean))onSurfaceReady(world);
        });
    };
    Object.assign(world,terrain(world,scene,grain,scan));
    atmosphere(world,scene,sun);
    if(world.id==='veil')rings(scene,world);
    return world;
  });
  const light=new T.DirectionalLight(0xffe5c0,3.1);
  light.position.copy(sun).multiplyScalar(180);
  light.castShadow=true;light.shadow.mapSize.set(1536,1536);
  Object.assign(light.shadow.camera,{left:-55,right:55,top:55,bottom:-55,near:20,far:285});
  light.shadow.normalBias=.10;
  scene.add(light,light.target,new T.HemisphereLight(0xc5dcea,0x796e5d,.94));
  return {planets,sun,light};
}
export function nearestPlanet(planets,position) {
  return planets.reduce((nearest,world)=> !nearest || position.distanceTo(world.position)-world.radius
    < position.distanceTo(nearest.position)-nearest.radius ? world : nearest,null);
}
