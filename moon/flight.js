import * as T from './vendor/three.module.min.js';
import { block, mesh, bevel, tube } from './mesh.js?v=2';
import { height, groundStations, home } from './world.js?v=3';

export const areaRadius = 245;
export const areaCenterZ = -25;
export const scanSpeed = 7;
const scanRange = 16;
const ceiling = 360;
const feet = [[-2.42, -2.27], [-2.42, 2.27], [2.42, -2.27], [2.42, 2.27]];

function landingSurface(x, z, yaw) {
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  let floor = height(x, z), low = floor;
  for (const [px, pz] of feet) {
    const y = height(x + px * cos + pz * sin, z - px * sin + pz * cos);
    floor = Math.max(y, floor);
    low = Math.min(y, low);
  }
  return { floor, level: floor - low < .95 };
}

function navigationRing(parent, color, radius) {
  const material = new T.MeshBasicMaterial({ color, transparent: true, opacity: .67 });
  const ring = mesh(parent, new T.TorusGeometry(radius, .09, 5, 72, Math.PI * 1.62), material);
  const braces = new T.Group();
  for (let i = 0; i < 3; i++) {
    const fixture = new T.Group();
    fixture.rotation.z = i * Math.PI * 2 / 3;
    block(fixture, material, 0, radius, 0, .25, 1.05, .24);
    braces.add(fixture);
  }
  parent.add(braces);
  return ring;
}

function satellite(group, color, relay) {
  const foil = new T.MeshStandardMaterial({ color: relay ? 0xeee8d9 : 0xd89a47, metalness: .48, roughness: .59 });
  const frame = new T.MeshStandardMaterial({ color: 0x576675, metalness: .55, roughness: .47 });
  const solar = new T.MeshStandardMaterial({ color: 0x3f68ab, metalness: .54, roughness: .3 });
  const aim = new T.MeshBasicMaterial({ color });
  mesh(group, new T.CylinderGeometry(2.45, 2.63, 4.3, 12), foil).rotation.x = Math.PI / 2;
  mesh(group, new T.CylinderGeometry(2.53, 2.53, .41, 12), frame, 0, 0, 1.54).rotation.x = Math.PI / 2;
  mesh(group, bevel(3, 2.4, .52, .15), frame, 0, 0, 2.19);
  block(group, aim, 0, .34, 2.49, .95, .31, .08);
  const dishMat = foil.clone();
  dishMat.side = T.DoubleSide;
  mesh(group, new T.SphereGeometry(2.46, 32, 16, 0, Math.PI * 2, 0, 1.04), dishMat, 0, 3.81, .2).rotation.z = -.55;
  tube(group, frame, [[0, 1.77, 0], [0, 4.43, .2], [.68, 5.95, .23]], .14);
  mesh(group, new T.SphereGeometry(.25, 12, 8), aim, .68, 5.95, .23);
  for (const side of [-1, 1]) {
    block(group, frame, side * 4.5, 0, 0, 7, .36, .34);
    const wing = new T.Group();
    wing.position.x = side * 7.4;
    wing.rotation.x = .22;
    group.add(wing);
    block(wing, frame, 0, 0, 0, 8.7, 3.22, .24);
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 3; y++) {
        block(wing, solar, (x - 3.5) * 1.04, (y - 1) * 1.02, .13, 1, .95, .09);
      }
    }
  }
}

export function createFlight(scene, ship) {
  const points = [
    { label: '静海一号', color: '#a1e5ff', position: new T.Vector3(-24, 68, -94), result: '静海一号数据已同步。' },
    { label: '静海中继', color: '#ffd1a1', position: new T.Vector3(103, 146, -157), result: '静海中继已校准。' },
  ];
  const relays = points.map((point, index) => {
    const group = new T.Group();
    group.position.copy(point.position);
    group.scale.setScalar(.54);
    scene.add(group);
    const ring = navigationRing(group, point.color, 16);
    const body = new T.Group();
    satellite(body, point.color, index === 1);
    body.rotation.set(.12 + index * .35, -.2, .16);
    group.add(body);
    return { ring, body };
  });

  const position = ship.position;
  const velocity = new T.Vector3();
  const thrust = new T.Vector3();
  const up = new T.Vector3(0, 1, 0);
  let targetHeight = null, bank = 0, clearance = 0;
  const scanned = new Set();

  return {
    points, position, scanned,
    get speed() { return velocity.length(); },
    get verticalSpeed() { return velocity.y; },
    get altitude() { return clearance; },
    get heading() { return ship.rotation.y; },
    get rising() { return targetHeight !== null; },
    reset() {
      position.set(home.x, landingSurface(home.x, home.z, 0).floor, home.z);
      ship.rotation.y = 0;
      velocity.set(0, 0, 0);
      clearance = bank = 0;
      targetHeight = null;
      scanned.clear();
    },
    launch() {
      targetHeight = position.y + 10;
      velocity.set(0, 0, 0);
    },
    step(dt, keys, yaw) {
      const strafe = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
      const forward = Number(keys.has('KeyS')) - Number(keys.has('KeyW'));
      const vertical = Number(keys.has('KeyR')) - Number(keys.has('KeyC'));
      const brake = keys.has('Space');
      const boost = keys.has('ShiftLeft') || keys.has('ShiftRight');
      thrust.set(strafe, 0, forward).clampLength(0, 1).applyAxisAngle(up, yaw);
      const horizontalSpeed = boost ? 44 : 25;
      const response = 1 - Math.exp(-dt * (brake ? 6 : 1.75));
      velocity.x = T.MathUtils.lerp(velocity.x, brake ? 0 : thrust.x * horizontalSpeed, response);
      velocity.z = T.MathUtils.lerp(velocity.z, brake ? 0 : thrust.z * horizontalSpeed, response);

      if (vertical !== 0 || brake) targetHeight = null;
      if (targetHeight !== null && position.y >= targetHeight) targetHeight = null;
      let climb = targetHeight !== null ? 7 : vertical * (vertical < 0 && clearance < 7 ? 3.2 : boost ? 25 : 17);
      if (brake) climb = 0;
      velocity.y = T.MathUtils.damp(velocity.y, climb, brake ? 6 : 3.6, dt);
      position.addScaledVector(velocity, dt);
      const radial = Math.hypot(position.x, position.z - areaCenterZ);
      if (radial > areaRadius) {
        const scale = areaRadius / radial;
        position.x *= scale;
        position.z = areaCenterZ + (position.z - areaCenterZ) * scale;
        velocity.x = velocity.z = 0;
      }

      const { floor, level } = landingSurface(position.x, position.z, yaw);
      const horizontal = Math.hypot(velocity.x, velocity.z);
      const nearInstrument = groundStations.some(point => Math.hypot(position.x - point.x, position.z - point.z) < 4);
      const safe = level && !nearInstrument && horizontal < 4;
      const contact = position.y <= floor && vertical < 0 && safe;
      const minimum = safe ? floor : floor + .8;
      if (position.y < minimum) {
        position.y = minimum;
        velocity.y = 0;
      }
      if (position.y > ceiling) {
        position.y = ceiling;
        velocity.y = Math.min(0, velocity.y);
      }
      ship.rotation.y = yaw;
      clearance = Math.max(0, position.y - floor);
      bank = T.MathUtils.damp(bank, -.12 * strafe, 3.4, dt);
      for (const { ring, body } of relays) {
        ring.rotation.z += dt * .15;
        body.rotation.y += dt * .18;
      }
      if (contact) {
        velocity.set(0, 0, 0);
        bank = 0;
        targetHeight = null;
      }
      return { bank, contact, blocked: vertical < 0 && !safe && clearance < 2 };
    },
    target() {
      return points.find(point => !scanned.has(point) && point.position.distanceTo(position) <= scanRange);
    },
  };
}

export function createCockpit() {
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(57, 1, .05, 10);
  scene.add(new T.HemisphereLight(0xb9d7f8, 0x39424c, 1.65));
  const key = new T.DirectionalLight(0xa1caff, 1.2);
  key.position.set(1, 3, 3);
  scene.add(key);
  const base = new T.MeshStandardMaterial({ color: 0x162231, metalness: .37, roughness: .62 });
  const armor = new T.MeshStandardMaterial({ color: 0x354859, metalness: .52, roughness: .48 });
  const pale = new T.MeshStandardMaterial({ color: 0x8198a9, metalness: .23, roughness: .61 });
  const cyan = new T.MeshBasicMaterial({ color: 0x83cadd });
  const amber = new T.MeshBasicMaterial({ color: 0xeb9c5f });
  const dash = new T.Group();
  scene.add(dash);
  mesh(dash, bevel(3.9, .29, .62, .071), base, 0, -.77, -1.53).rotation.x = -.16;
  mesh(dash, bevel(1.05, .28, .33, .061), armor, 0, -.655, -1.7).rotation.x = -.24;
  mesh(dash, bevel(.76, .13, .031, .012), base, 0, -.616, -1.522);
  for (let i = 0; i < 15; i++) block(dash, i < 11 ? cyan : amber, (i - 7) * .044, -.616, -1.50, .024, .039, .003);
  const canopy = mesh(scene, bevel(2.1, .082, .18, .029), base, 0, .52, -1.73);
  const ribs = [-1, 1].map(side => {
    const rib = new T.Group();
    scene.add(rib);
    tube(rib, base, [[side * .72, -.84, -1.5], [side * .93, -.42, -1.68], [side * .98, .52, -1.73], [side * .83, .85, -1.69]], .104);
    tube(rib, armor, [[side * .68, -.82, -1.48], [side * .891, -.41, -1.66], [side * .939, .5, -1.69], [side * .79, .84, -1.65]], .037);
    tube(rib, cyan, [[side * .79, -.58, -1.54], [side * .883, -.41, -1.61], [side * .911, -.18, -1.66]], .007);
    mesh(rib, bevel(.35, .12, .24, .033), armor, side * .58, -.61, -1.51).rotation.z = side * -.12;
    for (let i = 0; i < 4; i++) block(rib, i === 2 ? amber : pale, side * (.49 + i * .062), -.586, -1.38, .025, .025, .017);
    return rib;
  });
  return {
    scene, camera,
    layout(aspect) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      const width = Math.max(.52, aspect * .96);
      for (const rib of ribs) rib.scale.x = width;
      canopy.scale.x = width;
      canopy.visible = aspect > .73;
    },
    animate(bank) {
      dash.rotation.z = bank * .1;
    },
  };
}
