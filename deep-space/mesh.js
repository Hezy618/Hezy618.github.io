import * as T from './vendor/three.module.min.js';

export function mesh(group, geometry, material, x = 0, y = 0, z = 0) {
  const object = new T.Mesh(geometry, material);
  object.position.set(x, y, z);
  group.add(object);
  return object;
}

export function block(group, material, x, y, z, w, h, d) {
  return mesh(group, new T.BoxGeometry(w, h, d), material, x, y, z);
}

export function bevel(w, h, d, r) {
  const shape = new T.Shape();
  const x = w / 2 - r, y = h / 2 - r;
  shape.moveTo(-x, -y);
  shape.lineTo(x, -y);
  shape.lineTo(x, y);
  shape.lineTo(-x, y);
  shape.closePath();
  return new T.ExtrudeGeometry(shape, {
    depth: d - 2 * r, bevelEnabled: true, bevelSegments: 3,
    bevelSize: r, bevelThickness: r, curveSegments: 1,
  }).translate(0, 0, -d / 2 + r);
}

export function tube(group, material, points, radius, smooth = false) {
  const nodes = points.map(point => new T.Vector3(...point));
  const path = smooth ? new T.CatmullRomCurve3(nodes) : new T.CurvePath();
  if (!smooth) for (let i = 1; i < nodes.length; i++) path.add(new T.LineCurve3(nodes[i - 1], nodes[i]));
  return mesh(group, new T.TubeGeometry(path, smooth ? 32 : Math.max(1, (nodes.length - 1) * 2), radius, 8), material);
}

export function seeded(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function canvasTexture(w, h, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  paint(canvas.getContext('2d'));
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  return texture;
}
