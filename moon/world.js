import * as T from './vendor/three.module.min.js';
import { createLander } from './lander.js?v=3';
import { seeded, canvasTexture } from './mesh.js?v=2';

export const groundStations = [
  { x: 11, z: -48, label: '月岩阵列', result: '月岩谱线已记录。样本中含有钛铁矿。' },
  { x: -44, z: -83, label: '微震计', result: '微震波形已记录。震源位于静海边缘。' },
  { x: 53, z: -119, label: '光学塔', result: '地球边缘的反照光已记录。' },
];
export const home = { x: 9, z: -13, label: '起降点' };

const rng = seeded(1969);
const lightChecks = [4, 11, 22];
const craters = [
  [-23, -49, 16, 3], [29, -78, 13, 2], [-70, -123, 29, 6],
  [23, -168, 35, 7], [58, -41, 20, 4], [-95, -48, 25, 5],
  [94, -145, 26, 5], [-130, -189, 43, 8],
];

export function height(x, z) {
  const radius = Math.hypot(x, z + 25);
  const near = 1 - T.MathUtils.smoothstep(radius, 72, 222);
  let y = (.48 + .52 * near) * (
    .56 * Math.sin(x * .085 + z * .052) + .47 * Math.cos(z * .09 + .4 * Math.cos(x * .052)))
    + .105 * near * Math.sin(x * .48 + z * .39) * Math.cos(x * .31 - z * .34);
  for (const [cx, cz, radius, depth] of craters) {
    const r = Math.hypot(x - cx, z - cz) / radius;
    if (r < 1.55) y += depth * (.26 * Math.exp(-((r - 1) ** 2) * 49) - Math.max(0, 1 - r * r) ** 2);
  }
  const ridge = Math.sin(x * .021 + z * .012 + .63 * Math.sin(z * .008))
    + .51 * Math.sin(z * .028 - x * .017) + .25 * Math.cos(x * .068 + z * .046);
  const shoulders = T.MathUtils.smoothstep(radius, 127, 420);
  y += shoulders * (4 + 37 * Math.max(0, .31 + ridge * .52) ** 1.58);
  y += T.MathUtils.smoothstep(radius, 470, 2300) * (
    23 * Math.sin(x * .011 + z * .004) + 33 * Math.cos(z * .005 - x * .003));
  return y - radius * radius / 105000;
}

function regolith() {
  const map = canvasTexture(512, 512, ctx => {
    const pixels = ctx.createImageData(512, 512);
    for (let y = 0; y < 512; y++) {
      for (let x = 0; x < 512; x++) {
        const grain = 144 + 67 * (rng() ** 1.65) + 12 * Math.sin(x * .123 + y * .069)
          * Math.cos(x * .052 - y * .11);
        pixels.data.set([grain, grain * .98, grain * .96, 255], (y * 512 + x) * 4);
      }
    }
    ctx.putImageData(pixels, 0, 0);
    for (let i = 0; i < 4400; i++) {
      const size = .3 + rng() ** 4 * 4.2;
      ctx.fillStyle = rng() > .48 ? '#130e0b55' : '#dcd6c34f';
      ctx.beginPath();
      ctx.ellipse(rng() * 512, rng() * 512, size, size * .55, rng() * 6, 0, 7);
      ctx.fill();
    }
  });
  map.wrapS = map.wrapT = T.RepeatWrapping;
  map.anisotropy = 8;
  return map;
}

function planet(scene, earthMap) {
  earthMap.colorSpace = T.SRGBColorSpace;
  earthMap.anisotropy = 4;
  const earth = new T.Mesh(new T.SphereGeometry(49, 64, 36),
    new T.MeshStandardMaterial({ map: earthMap, roughness: .86 }));
  earth.position.set(1008, 1032, -3450);
  earth.scale.setScalar(6);
  earth.rotation.set(.17, -.3, -.23);
  scene.add(earth);
  const halo = new T.Mesh(new T.SphereGeometry(50.4, 64, 36), new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    vertexShader: `varying vec3 n; varying vec3 v;
      void main() { vec4 p = modelViewMatrix * vec4(position, 1.); n = normalize(normalMatrix * normal);
      v = -p.xyz; gl_Position = projectionMatrix * p; }`,
    fragmentShader: `varying vec3 n; varying vec3 v;
      void main() { float edge = pow(1. - max(0., dot(normalize(n), normalize(v))), 4.);
      gl_FragColor = vec4(.19, .48, .91, edge * .68); }`,
  }));
  halo.position.copy(earth.position);
  halo.scale.copy(earth.scale);
  scene.add(halo);
}

function stars(scene) {
  const positions = [];
  const colors = [];
  for (let i = 0; i < 2700; i++) {
    const angle = rng() * 2 * Math.PI;
    const up = rng();
    const r = Math.sqrt(1 - up * up) * 5600;
    positions.push(Math.sin(angle) * r, up * 5600, Math.cos(angle) * r);
    const l = .17 + rng() ** 4 * .74;
    colors.push(l * .83, l * .9, l);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  scene.add(new T.Points(geometry, new T.PointsMaterial({
    size: 6.5, vertexColors: true, transparent: true, opacity: .88, toneMapped: false,
  })));
}

function surface(scene, lunarMap, fines) {
  const geometry = new T.PlaneGeometry(570, 570, 420, 420).rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const colors = [];
  const expand = coord => coord + Math.sign(coord) * 5650 * Math.max(0, (Math.abs(coord) - 248) / 37) ** 1.92;
  for (let i = 0; i < pos.count; i++) {
    const x = expand(pos.getX(i));
    const z = expand(pos.getZ(i)) - 25;
    const y = height(x, z);
    pos.setXYZ(i, x, y, z);
    uv.setXY(i, x / 3.7, z / 3.7);
    let shade = 1;
    if (Math.hypot(x, z + 25) < 300) {
      for (const sample of lightChecks) {
        const lip = height(x - sample * .95, z - sample * .3) - y - sample * .29;
        shade = Math.min(shade, 1 - .42 * T.MathUtils.smoothstep(lip, -.2, 1.3));
      }
    }
    const gray = (.83 + .085 * Math.sin(x * .061 + z * .051) * Math.cos(z * .075)
      + .035 * Math.sin(x * .28 - z * .35)) * shade;
    colors.push(gray, gray * .989, gray * .969);
  }
  geometry.computeVertexNormals();
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  const ground = new T.Mesh(geometry, new T.MeshStandardMaterial({
    map: fines, bumpMap: fines, bumpScale: .012, vertexColors: true, roughness: .99,
  }));
  ground.material.onBeforeCompile = shader => {
    shader.uniforms.lunarSurvey = { value: lunarMap };
    shader.fragmentShader = 'uniform sampler2D lunarSurvey;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      vec2 grainUV = vMapUv;
      vec3 fines = texture2D(map, grainUV).rgb;
      vec3 aggregates = texture2D(map, mat2(.78, .62, -.62, .78) * grainUV * .19).rgb;
      vec3 survey = texture2D(lunarSurvey, grainUV * .00036 + vec2(.52, .44)).rgb;
      float rangeFade = smoothstep(20., 180., length(vViewPosition));
      diffuseColor.rgb *= mix(mix(fines, aggregates, .47), vec3(.39), rangeFade * .85) * (0.95 + survey * .66);`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `
      float relief = 1.0 - smoothstep(5., 42., length(vViewPosition));
      normal = perturbNormalArb(-vViewPosition, normal, dHdxy_fwd() * relief, faceDirection);`);
  };
  ground.receiveShadow = true;
  scene.add(ground);
}

function rocks(scene, detail) {
  const geometry = new T.IcosahedronGeometry(1, 3);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const size = .88 + .085 * Math.sin(7 * x + 4 * y + z * 11)
      + .13 * Math.cos(4 * z + 3 * x) + .08 * Math.cos(19 * y + 13 * z);
    positions.setXYZ(i, x * size, y * size, z * size);
  }
  geometry.computeVertexNormals();
  const normals = geometry.attributes.normal;
  const radial = new T.Vector3(), normal = new T.Vector3();
  for (let i = 0; i < positions.count; i++) {
    radial.fromBufferAttribute(positions, i).normalize();
    normal.fromBufferAttribute(normals, i).lerp(radial, .32).normalize();
    normals.setXYZ(i, normal.x, normal.y, normal.z);
  }
  const material = new T.MeshStandardMaterial({ map: detail, bumpMap: detail, bumpScale: .095, roughness: .96 });
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      vec3 stone = texture2D(map, vMapUv * vec2(4., 3.)).rgb;
      float seam = smoothstep(.58, .89, texture2D(map, vMapUv * vec2(2.8, 11.)).r);
      diffuseColor.rgb *= (.55 + stone * .79) * (1. - .42 * seam);`);
  };
  const mesh = new T.InstancedMesh(geometry, material, 1850);
  const transform = new T.Object3D();
  for (let i = 0; i < mesh.count; i++) {
    const x = (rng() - .5) * 298, z = (rng() - .58) * 302;
    const nearEquipment = [...groundStations, home].some(point => Math.hypot(x - point.x, z - point.z) < 4.4);
    const size = nearEquipment ? .055 : .041 + 1.75 * rng() ** 8;
    transform.position.set(x, height(x, z) - size * .11, z);
    transform.rotation.set(rng() * .65, rng() * 6, rng() * .4);
    transform.scale.set(size, size * (.38 + rng() * .42), size * (1 + rng() * .55));
    transform.updateMatrix();
    mesh.setMatrixAt(i, transform.matrix);
    const shade = .18 + rng() * .35;
    mesh.setColorAt(i, new T.Color(shade, shade, shade * .97));
  }
  mesh.castShadow = mesh.receiveShadow = true;
  scene.add(mesh);
}

const alloy = new T.MeshStandardMaterial({ color: 0xaab2bf, metalness: .54, roughness: .66 });
const dark = new T.MeshStandardMaterial({ color: 0x171c26, metalness: .38, roughness: .68 });
const gold = new T.MeshStandardMaterial({ color: 0xc18a31, metalness: .62, roughness: .54 });
const blue = new T.MeshStandardMaterial({ color: 0x6389be, metalness: .6, roughness: .48 });
const lamp = new T.MeshBasicMaterial({ color: 0xa1e5ff });

function part(group, shape, material, x, y, z) {
  const object = new T.Mesh(shape, material);
  object.position.set(x, y, z);
  object.castShadow = object.receiveShadow = true;
  group.add(object);
  return object;
}

function box(g, m, x, y, z, w, h, d) {
  return part(g, new T.BoxGeometry(w, h, d), m, x, y, z);
}

function bar(group, from, to, radius, material) {
  const a = new T.Vector3(...from), b = new T.Vector3(...to);
  const center = a.clone().lerp(b, .5);
  const mesh = part(group, new T.CylinderGeometry(radius, radius, a.distanceTo(b), 7),
    material, center.x, center.y, center.z);
  mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.sub(a).normalize());
}

function solar(group, x, y, z, width) {
  const panel = new T.Group();
  panel.position.set(x, y, z);
  panel.rotation.x = -.31;
  group.add(panel);
  box(panel, alloy, 0, 0, 0, width + .1, .08, 1.42);
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 3; j++) {
      box(panel, blue, width * ((i + .5) / 8 - .5), .058, (j - 1) * .45, width / 8 - .025, .035, .42);
    }
  }
}

function hardware(scene) {
  const ship = new T.Group();
  ship.position.set(home.x, height(home.x, home.z), home.z);
  createLander(ship);
  scene.add(ship);
  for (const [index, point] of groundStations.entries()) {
    const group = new T.Group();
    group.position.set(point.x, height(point.x, point.z), point.z);
    scene.add(group);
    const top = index === 2 ? 2.75 : 1.65;
    box(group, dark, 0, .18, 0, 1.36, .28, 1.21);
    box(group, alloy, 0, .51, 0, 1.07, .44, .95);
    box(group, gold, 0, .57, .49, .99, .12, .034);
    bar(group, [0, .68, 0], [0, top, 0], .047, alloy);
    for (const x of [-1, 1]) bar(group, [0, top * .73, 0], [x * .87, .12, .45], .033, alloy);
    part(group, new T.SphereGeometry(.08, 9, 7), lamp, 0, top, 0);
    if (index === 2) part(group, new T.SphereGeometry(.72, 20, 12, 0, Math.PI * 2, 0, 1.12), alloy, 0, 2.1, 0).rotation.z = .7;
    solar(group, 1.45, .61, .12, 1.15);
  }
  return ship;
}

export async function createWorld() {
  const loader = new T.TextureLoader();
  const [earthMap, lunarMap] = await Promise.all([
    loader.loadAsync(new URL('earth.jpg', import.meta.url).href),
    loader.loadAsync(new URL('lunar-albedo.jpg', import.meta.url).href),
  ]);
  lunarMap.colorSpace = T.SRGBColorSpace;
  const scene = new T.Scene();
  scene.background = new T.Color(0x05070e);
  scene.add(new T.HemisphereLight(0xc4dbff, 0x77706a, .51));
  const sun = new T.DirectionalLight(0xfff3e2, 3.40);
  sun.position.set(-96, 38, -83);
  sun.target.position.set(0, 0, -52);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -96, right: 96, top: 90, bottom: -90, near: 1, far: 240 });
  sun.shadow.normalBias = .064;
  sun.shadow.bias = -.00027;
  scene.add(sun, sun.target);
  const detail = regolith();
  surface(scene, lunarMap, detail);
  stars(scene);
  planet(scene, earthMap);
  rocks(scene, detail);
  const ship = hardware(scene);
  return { scene, ship, sun };
}
