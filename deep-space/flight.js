import * as T from '../moon/vendor/three.module.min.js';
import { nearestPlanet, surfaceRadius, tangentBasis } from './terrain.js?v=2';

const ease = (dt, rate) => 1 - Math.exp(-dt*rate);
const v = new T.Vector3(), w = new T.Vector3(), target = new T.Vector3();
export function approachPoint(body) { return body.position.clone().add(new T.Vector3(0,body.radius+315,0)); }
const rotation = new T.Matrix4();
const feet = [[-2.65,-1.7],[2.65,-1.7],[-2.65,2.63],[2.65,2.63]];
export function frame(forward,up) {
  const right = forward.clone().cross(up).normalize();
  const sky = right.clone().cross(forward).normalize();
  return new T.Quaternion().setFromRotationMatrix(rotation.makeBasis(right,sky,forward.clone().negate()));
}
export function makeFlight(planets,position,heading,fuel=100) {
  return {
    position, heading, fuel, velocity:new T.Vector3(), up:new T.Vector3(0,1,0),
    landingWorld:null, world:null, altitude:0, vertical:0, speed:0, auto:false, hop:null, status:'停泊',
    step(dt, keys, view, route, denied) {
      const world=nearestPlanet(planets,position);
      const radial=position.clone().sub(world.position).normalize();
      const clearance=position.distanceTo(world.position)-surfaceRadius(world,radial);
      this.world=world;
      this.up.copy(radial);
      const near=clearance<660;
      const thrust=key(keys,'KeyW','KeyS'),side=key(keys,'KeyD','KeyA'),lift=key(keys,'KeyR','KeyC');
      const braking=keys.has('Space');
      const boosted=keys.has('ShiftLeft')||keys.has('ShiftRight');
      const fuelScale=this.fuel>0?1:.55;
      const flightDir=new T.Vector3(0,0,-1).applyQuaternion(view);
      const cameraUp=new T.Vector3(0,1,0).applyQuaternion(view);
      const right=new T.Vector3(1,0,0).applyQuaternion(view);
      const forward=near ? flightDir.clone().addScaledVector(radial,-flightDir.dot(radial)).normalize() : flightDir;
      if(forward.lengthSq()<.01)forward.copy(tangentBasis(radial).forward);
      if(near)right.crossVectors(forward,radial).normalize();
      if(lift||braking) this.hop=null;
      if(this.hop!==null && clearance>this.hop)this.hop=null;
      this.heading.copy(forward);
      const signedLift=this.hop!==null ? 1 : lift;
      const altitudeSpeed=near?(signedLift<0&&clearance<16?4.5:boosted?115:42):(boosted?370:120);
      const lateralRate=near?(boosted?185:49):(boosted?2900:415);
      target.set(0,0,0).addScaledVector(forward,thrust*lateralRate*fuelScale)
        .addScaledVector(right,side*lateralRate*fuelScale)
        .addScaledVector(near?radial:cameraUp,signedLift*altitudeSpeed*fuelScale);
      if(this.hop!==null)target.set(0,0,0).addScaledVector(radial,14);
      if(braking)this.auto=false;
      if(this.auto&&route) {
        const to=approachPoint(route).sub(position);
        const remaining=to.length();
        if(remaining<21&&this.velocity.length()<29) {
          this.auto=false;
          this.velocity.multiplyScalar(.16);
          target.set(0,0,0);
        } else if(route!==world&&clearance<1130){
          // Climb out of the departure world's terrain before lining up the transfer.
          target.copy(radial).multiplyScalar(265);
        } else {
          to.normalize();
          target.copy(to).multiplyScalar(Math.min(3430*fuelScale,Math.max(10,remaining*.67)));
          if(route===world&&clearance<410){
            const inward=target.dot(radial);
            const radialRate=(315-clearance)*.8;
            target.addScaledVector(radial,Math.max(inward,radialRate)-inward);
          }
        }
      }
      if(braking)target.set(0,0,0);
      this.velocity.lerp(target,ease(dt,braking?8:near?3.1:1.95));
      this.fuel=Math.max(0,this.fuel-dt*(target.length()>1?(this.auto?.46:boosted?.36:.155):0));
      // Substeps avoid crossing the local surface during a fast approach.
      const move = this.velocity.length()*dt;
      const steps=Math.min(18,Math.max(1,Math.ceil(move/19)));
      let blocked=false;
      for(let i=0;i<steps;i++){
        position.addScaledVector(this.velocity,dt/steps);
        const here=nearestPlanet(planets,position);
        const up=position.clone().sub(here.position).normalize();
        const d=position.distanceTo(here.position), base=surfaceRadius(here,up);
        if(d>base+15)continue;
        const {right,forward}=tangentBasis(up);
        right.crossVectors(this.heading,up).normalize();
        if(right.lengthSq()<.01)right.copy(tangentBasis(up).right);
        forward.crossVectors(up,right).normalize();
        let high=base,low=base;
        for(const [x,z] of feet){
          v.copy(up).multiplyScalar(here.radius).addScaledVector(right,x).addScaledVector(forward,z).normalize();
          const r=surfaceRadius(here,v);
          high=Math.max(high,r);low=Math.min(low,r);
        }
        const pad=denied(here,position,true);
        const floor=Math.max(high,pad?.radius||0);
        if(d>floor+.08)continue;
        const down=this.velocity.dot(up);
        w.copy(this.velocity).addScaledVector(up,-down);
        if(signedLift<0 && w.length()<6 && (high-low<1.50 || pad) && !denied(here,position,false)){
          position.copy(here.position).addScaledVector(up,floor+.08);
          this.velocity.set(0,0,0);
          this.auto=false;this.hop=null;this.landingWorld=here;this.altitude=0;
          this.speed=this.vertical=0;this.up.copy(up);
          this.status='已着陆';
          return 'landed';
        }
        position.copy(here.position).addScaledVector(up,floor+.62);
        if(down<0)this.velocity.addScaledVector(up,-down);
        blocked=signedLift<0;
      }
      this.landingWorld=null;
      this.altitude=Math.max(0,position.distanceTo(world.position)-surfaceRadius(world,radial));
      this.vertical=this.velocity.dot(radial);this.speed=this.velocity.length();
      this.status=blocked?'寻找平地并减速':this.auto?'巡航中':braking?'惯性制动':this.hop!==null?'升空':'手动驾驶';
      return blocked?'blocked':'flying';
    },
  };
}
export function key(keys,a,b) { return Number(keys.has(a))-Number(keys.has(b)); }
