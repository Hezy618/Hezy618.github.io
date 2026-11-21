import * as T from './vendor/three.module.min.js';
import { mesh, block, bevel, canvasTexture, seeded, tube } from './mesh.js?v=2';

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
    suit: new T.MeshStandardMaterial({ color: 0xc4cbd5, map: weave, bumpMap: weave, bumpScale: .013, roughness: .88 }),
    inset: new T.MeshStandardMaterial({ color: 0x383e4b, map: weave, roughness: .87 }),
    joint: new T.MeshStandardMaterial({ color: 0x444b55, roughness: .67, metalness: .18 }),
    metal: new T.MeshStandardMaterial({ color: 0xb9c4d2, metalness: .53, roughness: .42 }),
    stripe: new T.MeshStandardMaterial({ color: 0xd87b42, roughness: .72 }),
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
    fingers.push(finger);
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
  return { arm, fingers, hand };
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
  let phase = 0, effort = 0, reach = 0;
  return {
    scene,
    camera,
    reset() { phase = effort = reach = 0; },
    gesture() { reach = 1; },
    update(dt, speed, airborne, lookPitch) {
      effort = T.MathUtils.damp(effort, airborne ? .12 : Math.min(speed / 8.7, 1), 9, dt);
      phase += speed * dt * 2.1;
      reach = Math.max(0, reach - dt * 1.65);
      const extend = Math.sin(Math.PI * reach);
      for (const [index, { arm, fingers, hand }] of hands.entries()) {
        const side = index === 0 ? -1 : 1;
        const swing = Math.sin(phase + index * Math.PI) * effort * (reducedMotion ? .28 : 1);
        const gesture = index === 1 ? extend : 0;
        const horizontal = T.MathUtils.clamp(camera.aspect * .27, .23, .47);
        const horizon = camera.aspect < 1 ? .05 : 0;
        arm.position.set(side * (horizontal - gesture * .15),
          -.49 + horizon + swing * .084 + gesture * .145 + (airborne ? .033 : 0),
          -.94 + swing * .13 - gesture * .19);
        arm.rotation.set(-.84 - swing * .40 - gesture * .52 + lookPitch * .08,
          side * -.24 + gesture * .16, side * .14 + swing * .08);
        hand.rotation.x = .11 + swing * .14 - gesture * .35;
        for (const finger of fingers) finger.rotation.x = -.47 - .19 * effort + gesture * .48;
      }
    },
  };
}
