import * as T from './vendor/three.module.min.js';
import { mesh, block, bevel, canvasTexture, seeded, tube } from './mesh.js';

const random = seeded(51);

function materials() {
  const weave = canvasTexture(128, 128, ctx => {
    const image = ctx.createImageData(128, 128);
    for (let i = 0; i < 128 * 128; i++) {
      const x = i % 128, y = Math.floor(i / 128);
      const v = 184 + (x % 3 === y % 3 ? 32 : 0) + random() * 25;
      image.data.set([v, v, v, 255], i * 4);
    }
    ctx.putImageData(image, 0, 0);
  });
  weave.wrapS = weave.wrapT = T.RepeatWrapping;
  weave.repeat.set(3, 3);
  return {
    suit: new T.MeshStandardMaterial({ color: 0xb9b8ae, map: weave, bumpMap: weave, bumpScale: .019, roughness: .99 }),
    inset: new T.MeshStandardMaterial({ color: 0x383e4b, map: weave, roughness: .87 }),
    joint: new T.MeshStandardMaterial({ color: 0x444b55, roughness: .67, metalness: .18 }),
    metal: new T.MeshStandardMaterial({ color: 0xb9c4d2, metalness: .53, roughness: .42 }),
    stripe: new T.MeshStandardMaterial({ color: 0xb07143, roughness: .88 }),
    lit: new T.MeshBasicMaterial({ color: 0x81e2ff }),
  };
}

function capsule(group, material, radius, length, x, y, z) {
  return mesh(group, new T.CapsuleGeometry(radius, length, 6, 12), material, x, y, z);
}

function glove(side, m) {
  const arm = new T.Group();
  const sleeve = mesh(arm, new T.LatheGeometry([
    new T.Vector2(.09, -.36), new T.Vector2(.139, -.31), new T.Vector2(.137, -.13),
    new T.Vector2(.115, .01), new T.Vector2(.090, .13), new T.Vector2(.084, .24),
    new T.Vector2(.079, .29), new T.Vector2(.06, .3),
  ], 24), m.suit, 0, -.2, 0);
  sleeve.scale.z = .87;
  for (let n = 0; n < 9; n++) {
    const size = .101 + .0035 * n;
    const seam = mesh(arm, new T.TorusGeometry(size, .008, 6, 24), m.inset, 0, .06 - n * .037, 0);
    seam.rotation.x = Math.PI / 2;
    seam.scale.y = .85;
  }
  for (const [y, radius, width, material] of [[.083, .095, .042, m.stripe], [.107, .087, .012, m.metal], [.129, .085, .018, m.joint]]) {
    const ring = mesh(arm, new T.CylinderGeometry(radius, radius, width, 24), material, 0, y, 0);
    ring.scale.z = .88;
  }
  const hand = new T.Group();
  hand.position.y = .145;
  arm.add(hand);
  mesh(hand, bevel(.154, .16, .102, .036), m.suit, 0, .048, 0);
  mesh(hand, bevel(.124, .095, .021, .009), m.joint, 0, .071, .053);
  mesh(hand, bevel(.112, .051, .024, .009), m.suit, 0, .084, .067);
  for (let n = 0; n < 3; n++) block(hand, m.stripe, side * (.014 + n * .013), .086, .081, .006, .025, .003);
  const fingers = [];
  for (const [n, length] of [.075, .092, .086, .066].entries()) {
    const finger = new T.Group();
    finger.position.set(side * (n - 1.5) * .034, .116, .001);
    finger.rotation.z = side * (.09 - n * .05);
    hand.add(finger);
    capsule(finger, m.suit, .017, length * .51, 0, length * .24, 0);
    const tip = new T.Group();
    tip.position.y = length * .55;
    tip.rotation.x = -.58;
    finger.add(tip);
    capsule(tip, m.joint, .016, length * .24, 0, .014, 0);
    capsule(tip, m.suit, .014, length * .15, 0, .027, .006);
    fingers.push({finger,tip});
  }
  const thumb = capsule(hand, m.inset, .022, .067, -side * .071, .041, -.013);
  thumb.rotation.set(-.45, 0, side * -.68);
  const thumbPad = capsule(hand, m.suit, .019, .043, -side * .092, .073, -.026);
  thumbPad.rotation.set(-.59, 0, side * -.5);
  if (side < 0) {
    mesh(arm, bevel(.127, .112, .036, .013), m.joint, .014, -.085, .097);
    mesh(arm, bevel(.088, .077, .013, .006), m.lit, .014, -.085, .119);
    for (let i = 0; i < 4; i++) block(arm, m.inset, .014, -.111 + i * .016, .127, .068 - i * .009, .004, .002);
  }
  tube(arm, m.metal, [[side * .083, -.14, .07], [side * .105, -.06, .084], [side * .072, .042, .06]], .011, true);
  for(const x of [-.048,.048]){
    const stitch=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([
      new T.Vector3(x,.01,.055),new T.Vector3(x,.046,.07),new T.Vector3(x,.101,.063),
    ]),8,.003,5,false),m.inset);
    hand.add(stitch);
  }
  return { arm, fingers, hand, thumb, thumbPad };
}

export function createSuit(reducedMotion) {
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(52, 1, .055, 12);
  scene.add(new T.HemisphereLight(0xe9f3ff, 0x687786, 1.9));
  const key = new T.DirectionalLight(0xffe7cc, 2.1);
  key.position.set(-2, 3, 2);
  scene.add(key);
  const m = materials();
  const hands = [-1, 1].map(side => {
    const hand = glove(side, m);
    scene.add(hand.arm);
    return hand;
  });
  let phase=0, effort=0, airborne=0, impact=0, action='', age=0, breath=0, lateral=0, weight=0;
  const duration={mine:.54,scan:.88,observe:.77,build:.50};
  const light=new T.Vector3();
  return {
    scene,camera,
    reset(){phase=effort=airborne=impact=age=breath=lateral=weight=0;action='';},
    gesture(name='mine'){action=name;age=0;},
    light(sun,toView,incidence){
      light.copy(sun).applyQuaternion(toView);
      key.position.copy(light).multiplyScalar(4);
      key.intensity=.15+2.15*incidence;
    },
    update(dt,speed,motion){
      const scale=reducedMotion?.27:1;
      const running=T.MathUtils.smoothstep(speed,4.5,8.8);
      const moving=T.MathUtils.smoothstep(speed,.06,6.3);
      effort=T.MathUtils.damp(effort,moving,moving>effort?8.2:10.8,dt);
      airborne=T.MathUtils.damp(airborne,motion.air?1:0,7.5,dt);
      if(motion.landed)impact=Math.min(1,.30+motion.landed*.14);
      impact=T.MathUtils.damp(impact,0,10,dt);
      weight=T.MathUtils.damp(weight,motion.vertical*.048,8,dt);
      lateral=T.MathUtils.damp(lateral,motion.strafe*.38+motion.turn*.24,9,dt);
      phase+=speed*dt*(1.76+running*.29);
      breath+=dt*1.92;
      age+=dt;
      const time=action?Math.min(1,age/duration[action]):1;
      const reach=time<1?T.MathUtils.smoothstep(time,0,.27)*(1-T.MathUtils.smoothstep(time,.57,1)):0;
      if(time>=1)action='';
      for(const [index,{arm,fingers,hand,thumb,thumbPad}] of hands.entries()){
        const side=index===0?-1:1;
        const angle=phase+index*Math.PI;
        const gait=(Math.sin(angle)+.19*Math.sin(2*angle-.6))*effort*(1-airborne)*scale;
        const prep=action==='scan'||action==='observe';
        const express=reach*(prep?(index===0?1:.17):(index===1?1:.20));
        const reachSide=express*(prep?.21:.18);
        const aspect=T.MathUtils.clamp(camera.aspect*.265,.221,.465);
        const portrait=camera.aspect<1?.045:0;
        const oscillation=Math.sin(breath+index*.19)*.009*scale;
        arm.position.set(side*(aspect-reachSide)+lateral*.039*scale,
          -.497+portrait+gait*(.062+running*.026)+express*.159+airborne*.073-impact*.061*scale-weight*.061+oscillation,
          -.95+gait*(.101+running*.038)-express*.18-airborne*.09);
        arm.rotation.set(-.87-gait*.33-express*(prep?.38:.58)+motion.pitch*.078+airborne*.2-impact*.25*scale,
          side*-.244+express*side*.30+lateral*.13*scale,side*.129+gait*.091+express*side*.20);
        hand.rotation.set(.094+gait*.19-express*.42+impact*.15*scale,side*express*.11,-lateral*.14*scale);
        thumb.rotation.x=-.45-.20*effort+express*.32;
        thumbPad.rotation.x=-.59-.17*effort+express*.45;
        for(const [n,{finger,tip}] of fingers.entries()){
          const curl=.34+.30*effort+.035*n+(airborne*.14);
          finger.rotation.x=-curl+express*(prep?.48:.37)*(1-n*.058);
          tip.rotation.x=-.43-.27*effort+express*.42;
        }
      }
    },
  };
}
