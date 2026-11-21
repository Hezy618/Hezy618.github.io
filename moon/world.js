import * as T from './vendor/three.module.min.js';
import { createLander } from './lander.js?v=2';
import { seeded, canvasTexture } from './mesh.js?v=2';

export const stations = [
  { x: 11, z: -48, label: '月岩阵列', result: '月岩谱线已记录。样本中含有钛铁矿。' },
  { x: -44, z: -83, label: '微震计', result: '微震波形已记录。震源位于静海边缘。' },
  { x: 53, z: -119, label: '光学塔', result: '地球边缘的反照光已记录。' },
  { x: 9, z: -13, label: '登陆舱' },
];

const rng = seeded(1969);
const craters = [
  [-23, -49, 16, 3], [29, -78, 13, 2], [-70, -123, 29, 6],
  [23, -168, 35, 7], [58, -41, 20, 4], [-95, -48, 25, 5],
  [94, -145, 26, 5], [-130, -189, 43, 8],
];

export function height(x, z) {
  let y = .56 * Math.sin(x * .085 + z * .052) + .47 * Math.cos(z * .09)
    + .17 * Math.sin(x * .79 + z * .91) * Math.cos(x * .36 - z * .63);
  for (const [cx, cz, radius, depth] of craters) {
    const r = Math.hypot(x - cx, z - cz) / radius;
    if (r < 1.55) y += depth * (.26 * Math.exp(-((r - 1) ** 2) * 49) - Math.max(0, 1 - r * r) ** 2);
  }
  return y;
}

function regolith() {
  const map = canvasTexture(512, 512, ctx => {
    const pixels = ctx.createImageData(512, 512);
    for (let y = 0; y < 512; y++) {
      for (let x = 0; x < 512; x++) {
        const grain = 163 + 54 * rng();
        pixels.data.set([grain, grain * .98, grain * .96, 255], (y * 512 + x) * 4);
      }
    }
    ctx.putImageData(pixels, 0, 0);
    for (let i = 0; i < 1750; i++) {
      const size = .5 + rng() ** 3 * 6;
      ctx.fillStyle = rng() > .48 ? '#2b29252e' : '#e9e5db56';
      ctx.beginPath();
      ctx.ellipse(rng() * 512, rng() * 512, size, size * .55, rng() * 6, 0, 7);
      ctx.fill();
    }
  });
  map.wrapS = map.wrapT = T.RepeatWrapping;
  map.repeat.set(115, 115);
  map.anisotropy = 8;
  return map;
}

export function planet(scene, earthMap) {
  earthMap.colorSpace = T.SRGBColorSpace;
  earthMap.anisotropy = 4;
  const earth = new T.Mesh(new T.SphereGeometry(49, 64, 36),
    new T.MeshStandardMaterial({ map: earthMap, roughness: .86 }));
  earth.position.set(168, 172, -575);
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
  scene.add(halo);
  return [earth, halo];
}

export function stars(scene, fullSphere = false) {
  const positions = [];
  const colors = [];
  for (let i = 0; i < 2700; i++) {
    const angle = rng() * 2 * Math.PI;
    const up = fullSphere ? rng() * 2 - 1 : rng();
    const r = Math.sqrt(1 - up * up) * 1300;
    positions.push(Math.sin(angle) * r, up * 1300, Math.cos(angle) * r);
    const l = .17 + rng() ** 4 * .74;
    colors.push(l * .83, l * .9, l);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  scene.add(new T.Points(geometry, new T.PointsMaterial({
    size: 1.55, vertexColors: true, transparent: true, opacity: .88, toneMapped: false,
  })));
}

function surface(scene) {
  const geometry = new T.PlaneGeometry(510, 510, 410, 410).rotateX(-Math.PI / 2).translate(0, 0, -70);
  const pos = geometry.attributes.position;
  const colors = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const distance = Math.hypot(x, z + 30);
    const ridge = Math.sin(x * .044 + z * .027) + .48 * Math.sin(z * .049 - x * .028)
      + .17 * Math.cos(x * .103 + z * .076);
    const mountains = T.MathUtils.smoothstep(distance, 140, 238)
      * (3 + 24 * Math.max(0, .36 + ridge * .64) ** 1.65);
    pos.setY(i, height(x, z) + mountains);
    const shadows = craters.reduce((sum, [cx, cz, radius]) => {
      const r = Math.hypot(x - cx, z - cz) / radius;
      return sum + .12 * Math.exp(-((r - .47) ** 2) * 4.5);
    }, 0);
    const gray = .82 + .09 * Math.sin(x * .17 + z * .065) * Math.cos(z * .12)
      + .055 * Math.sin(x * .45 - z * .34) - shadows + .035 * rng();
    colors.push(gray, gray * .99, gray * .97);
  }
  geometry.computeVertexNormals();
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  const map = regolith();
  const ground = new T.Mesh(geometry, new T.MeshStandardMaterial({
    map, vertexColors: true, roughness: .99,
  }));
  ground.material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      vec2 grainUV = vMapUv;
      vec3 fines = texture2D(map, grainUV).rgb;
      vec3 dust = texture2D(map, mat2(.78, .62, -.62, .78) * grainUV * .237).rgb;
      diffuseColor.rgb *= mix(fines, dust, .42) * 1.12;`);
  };
  ground.receiveShadow = true;
  scene.add(ground);
}

function rocks(scene) {
  const geometry = new T.IcosahedronGeometry(1, 2);
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
    normal.fromBufferAttribute(normals, i).lerp(radial, .43).normalize();
    normals.setXYZ(i, normal.x, normal.y, normal.z);
  }
  const mesh = new T.InstancedMesh(geometry, new T.MeshStandardMaterial({ roughness: .97 }), 1350);
  const transform = new T.Object3D();
  for (let i = 0; i < mesh.count; i++) {
    const x = (rng() - .5) * 298, z = (rng() - .58) * 302;
    const nearEquipment = stations.some(point => Math.hypot(x - point.x, z - point.z) < 4.4);
    const size = nearEquipment ? .07 : .065 + 2.2 * rng() ** 8;
    transform.position.set(x, height(x, z) - size * .11, z);
    transform.rotation.set(rng() * .65, rng() * 6, rng() * .4);
    transform.scale.set(size, size * (.38 + rng() * .42), size * (1 + rng() * .55));
    transform.updateMatrix();
    mesh.setMatrixAt(i, transform.matrix);
    const shade = .16 + rng() * .23;
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
  for (const [index, point] of stations.entries()) {
    const group = new T.Group();
    group.position.set(point.x, height(point.x, point.z), point.z);
    scene.add(group);
    if (index === 3) {
      createLander(group);
    } else {
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
  }
}

export async function createWorld() {
  const earthMap = await new T.TextureLoader().loadAsync(new URL('earth.jpg', import.meta.url).href);
  const scene = new T.Scene();
  scene.background = new T.Color(0x05070e);
  scene.add(new T.HemisphereLight(0xc4dbff, 0x75645a, .78));
  const sun = new T.DirectionalLight(0xffe6ca, 3.2);
  sun.position.set(-72, 36, -30);
  sun.target.position.set(0, 0, -52);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -96, right: 96, top: 90, bottom: -90, near: 1, far: 240 });
  sun.shadow.normalBias = .043;
  sun.shadow.bias = -.00027;
  scene.add(sun, sun.target);
  surface(scene);
  stars(scene);
  planet(scene, earthMap);
  rocks(scene);
  hardware(scene);
  return { scene, earthMap };
}
