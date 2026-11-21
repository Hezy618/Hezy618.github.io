import * as T from './vendor/three.module.min.js';
import { mesh, block, bevel, canvasTexture, seeded, tube } from './mesh.js?v=2';

const standard = (color, metalness = .25, roughness = .65) => new T.MeshStandardMaterial({ color, metalness, roughness });

export function createLander(group) {
  const rng = seeded(712);
  const finish = (base, light, dark, foil) => canvasTexture(512, 512, ctx => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 13600; i++) {
      const x = rng() * 512, y = rng() * 512;
      const length = 1 + rng() ** 4 * (foil ? 42 : 14);
      ctx.fillStyle = rng() > (foil ? .55 : .77) ? light : dark;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + length, y + .4 + rng() * 7);
      ctx.lineTo(x + rng() * 5, y + length * .58);
      ctx.fill();
    }
    for (let i = 0; i < 260; i++) {
      ctx.strokeStyle = i % 4 === 0 ? light : dark;
      ctx.lineWidth = .4 + rng() * 1.2;
      const x = rng() * 512, y = rng() * 512, extent = 1 + rng() ** 3 * 56;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + rng() * extent, y + extent);
      ctx.stroke();
    }
    const weather = ctx.createLinearGradient(0, 390, 0, 512);
    weather.addColorStop(0, '#201d1800');
    weather.addColorStop(1, foil ? '#2b2011a8' : '#322f28b2');
    ctx.fillStyle = weather;
    ctx.fillRect(0, 390, 512, 122);
  });
  const foilMap = finish('#a78249', '#ffdb9a33', '#39271142', true);
  const paintMap = finish('#c8c6ba', '#fff8ea45', '#403a302c', false);
  const bone = new T.MeshStandardMaterial({
    map: paintMap, roughnessMap: paintMap, bumpMap: paintMap, bumpScale: .027, metalness: .15, roughness: 1,
  });
  const frame = standard(0x43464a, .5, .76);
  const metal = standard(0x929795, .50, .58);
  const black = standard(0x18212b, .27);
  const ceramics = standard(0x2d3341, .1, .83);
  const gold = new T.MeshStandardMaterial({
    map: foilMap, roughnessMap: foilMap, bumpMap: foilMap, bumpScale: .065, metalness: .33, roughness: .95,
  });
  const orange = standard(0xab582f, .12);
  const glass = new T.MeshPhysicalMaterial({
    color: 0x15232d, metalness: .44, roughness: .28, clearcoat: .72, emissive: 0x101c25, emissiveIntensity: .28,
  });
  const light = new T.MeshBasicMaterial({ color: 0xa5e9ff });
  const white = new T.MeshBasicMaterial({ color: 0xf1e6d6 });
  const round = (x, y, z, w, h, d, radius, material) => mesh(group, bevel(w, h, d, radius), material, x, y, z);
  const cylinder = (x, y, z, top, bottom, length, material, sides = 24) =>
    mesh(group, new T.CylinderGeometry(top, bottom, length, sides), material, x, y, z);

  cylinder(0, 1.05, 0, 1.47, 1.62, .19, frame, 12);
  cylinder(0, 1.47, 0, 1.6, 1.56, .72, gold, 12);
  cylinder(0, 1.88, 0, 1.36, 1.62, .22, frame, 12);
  cylinder(0, 2.64, 0, 1.09, 1.36, 1.4, bone, 12);
  cylinder(0, 3.48, 0, .72, 1.08, .28, metal, 12);
  cylinder(0, 3.64, 0, .62, .72, .08, ceramics, 12);
  cylinder(0, .71, 0, .43, .62, .55, black);
  cylinder(0, .43, 0, .63, .63, .09, metal);

  for (let i = 0; i < 12; i++) {
    const azimuth = (i + .5) * Math.PI / 6;
    const x = Math.sin(azimuth), z = Math.cos(azimuth);
    const rib = round(x * 1.58, 1.46, z * 1.58, .055, .68, .055, .014, frame);
    rib.rotation.y = azimuth;
    const upperSeam = round(x * 1.204, 2.66, z * 1.204, .034, 1.12, .035, .009, metal);
    upperSeam.rotation.set(.18 * z, azimuth, -.18 * x);
    for (const y of [1.22, 1.7, 1.92]) {
      const bolt = cylinder(x * 1.59, y, z * 1.59, .037, .037, .025, metal, 6);
      bolt.rotation.set(Math.PI / 2, 0, -azimuth);
    }
  }

  round(0, 2.3, 1.23, .8, .81, .24, .095, frame);
  round(0, 2.33, 1.355, .6, .63, .062, .057, bone);
  round(0, 2.33, 1.394, .51, .53, .036, .02, metal);
  for (const x of [-.19, .19]) {
    block(group, orange, x, 2.32, 1.418, .055, .31, .025);
  }
  tube(group, black, [[-.094, 2.32, 1.42], [-.094, 2.32, 1.49], [.094, 2.32, 1.49], [.094, 2.32, 1.42]], .023);
  for (const x of [-.64, .64]) {
    const window = new T.Group();
    window.position.set(x * .99, 2.93, 1.02);
    window.rotation.y = x * .86;
    group.add(window);
    mesh(window, bevel(.57, .43, .14, .056), black);
    mesh(window, bevel(.48, .34, .06, .046), glass, 0, 0, .078);
    block(window, light, 0, -.108, .112, .31, .014, .002);
    block(window, metal, 0, .185, .065, .44, .026, .1);
  }
  block(group, frame, 0, 2.81, 1.17, .29, .115, .12);
  block(group, white, 0, 2.811, 1.235, .21, .052, .015);
  for (const x of [-1, 1]) {
    const tank = mesh(group, new T.CapsuleGeometry(.213, .55, 7, 16), ceramics, x * 1.48, 1.5, .59);
    tank.rotation.z = x * -.10;
    for (const y of [1.22, 1.65]) cylinder(x * 1.48, y, .59, .222, .222, .045, frame);
    round(x * 1.39, 2.08, .34, .38, .28, .53, .048, frame);
    const jet = cylinder(x * 1.56, 2.08, .43, .087, .143, .16, metal, 16);
    jet.rotation.z = x * Math.PI / 2;
    tube(group, orange, [[x * 1.21, 1.91, .8], [x * 1.42, 1.78, .88], [x * 1.45, 1.56, .81]], .027, true);
    for (const z of [-1, 1]) {
      tube(group, frame, [[x * .88, 1.84, z * .81], [x * 1.63, 1.01, z * 1.55], [x * 2.43, .16, z * 2.27]], .108);
      tube(group, metal, [[x * 1.11, 1.62, z * .99], [x * 1.94, .66, z * 1.81]], .067);
      tube(group, metal, [[x * 1.09, 1.03, z * .98], [x * 2.07, .49, z * 2.01]], .052);
      cylinder(x * 2.42, .1, z * 2.27, .28, .44, .16, frame);
      cylinder(x * 2.42, .036, z * 2.27, .45, .47, .08, ceramics);
      cylinder(x * 2.42, .218, z * 2.27, .16, .22, .13, gold);
    }
    tube(group, metal, [[x * .36, .25, 2.43], [x * .36, .45, 2.32], [x * .36, 1.95, 1.40], [x * .36, 2.17, 1.44]], .034);
  }
  for (let i = 0; i < 10; i++) round(0, .33 + i * .163, 2.39 - i * .101, .71, .055, .174, .015, metal);

  const label = canvasTexture(256, 128, ctx => {
    ctx.fillStyle = '#171d24';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#e1e7ed';
    ctx.font = 'bold 63px monospace';
    ctx.fillText('AL-07', 14, 70);
    ctx.fillStyle = '#87cfec';
    ctx.font = '19px monospace';
    ctx.fillText('AFTERLIGHT   /   EVA', 15, 104);
  });
  mesh(group, new T.PlaneGeometry(.55, .275), new T.MeshBasicMaterial({ map: label }), .92, 1.47, 1.294).rotation.y = .56;

  for (const x of [-.57, .55]) tube(group, metal, [[x, 3.52, -.02], [x + .03, 4.04, .01], [x + .08, 4.47, .06]], .019);
  tube(group, frame, [[.31, 3.38, -.41], [.35, 4.10, -.4], [.5, 4.26, -.39]], .042);
  const reflector = mesh(group, new T.SphereGeometry(.65, 32, 18, 0, Math.PI * 2, 0, .91), bone, .5, 4.04, -.39);
  reflector.material = bone.clone();
  reflector.material.side = T.DoubleSide;
  reflector.rotation.set(.38, 0, -.70);
  tube(group, frame, [[.48, 4.29, -.38], [.35, 4.65, -.32], [.64, 4.65, -.36]], .017);
  mesh(group, new T.SphereGeometry(.045, 12, 8), light, .62, 4.65, -.36);
  group.traverse(object => {
    if (object.isMesh) object.castShadow = object.receiveShadow = !object.material.isMeshBasicMaterial;
  });
}
