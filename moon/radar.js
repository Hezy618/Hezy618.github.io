import { height } from './world.js?v=3';

const size = 192;
const center = size / 2;
const extent = 300;
const pointsPerMeter = 1.15;

export function createRadar(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.height = size * 2;
  const terrain = document.createElement('canvas');
  terrain.width = terrain.height = extent * 2;
  const map = terrain.getContext('2d');
  const image = map.createImageData(terrain.width, terrain.height);
  for (let z = 0; z < terrain.height; z++) {
    for (let x = 0; x < terrain.width; x++) {
      const wx = x - extent, wz = z - extent - 35;
      const y = height(wx, wz);
      const contour = ((y % .43) + .43) % .43 < .064;
      const slope = (y - height(wx - .55, wz - .55)) * 34;
      const val = 17 + Math.max(0, Math.min(16, 4 + slope)) + Number(contour) * 12;
      image.data.set([val, val + 11, val + 21, 255], (z * terrain.width + x) * 4);
    }
  }
  map.putImageData(image, 0, 0);
  ctx.scale(2, 2);

  return (pos, yaw, points, airborne) => {
    const scale = airborne ? .32 : pointsPerMeter;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, center - 1, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#101b29';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(terrain, center - (pos.x + extent) * scale,
      center - (pos.z + extent + 35) * scale, terrain.width * scale, terrain.height * scale);
    ctx.strokeStyle = '#9cd5ef3a';
    ctx.lineWidth = .8;
    for (const r of [27, 52, 77, 92]) {
      ctx.beginPath();
      ctx.arc(center, center, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(center, 0);
    ctx.lineTo(center, size);
    ctx.moveTo(0, center);
    ctx.lineTo(size, center);
    ctx.stroke();
    for (const point of points) {
      const dx = (point.x - pos.x) * scale, dz = (point.z - pos.z) * scale;
      const clamp = Math.min(1, 77 / (Math.hypot(dx, dz) || 1));
      const x = center + dx * clamp, z = center + dz * clamp;
      ctx.fillStyle = point.color;
      ctx.strokeStyle = '#08141c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, z - 5);
      ctx.lineTo(x + 5, z);
      ctx.lineTo(x, z + 5);
      ctx.lineTo(x - 5, z);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
    }
    ctx.translate(center, center);
    ctx.rotate(-yaw);
    ctx.beginPath();
    ctx.moveTo(0,-11);
    ctx.lineTo(7,7);
    ctx.lineTo(0,4);
    ctx.lineTo(-7,7);
    ctx.closePath();
    ctx.strokeStyle = '#0b1520';
    ctx.stroke();
    ctx.fillStyle = '#fff1d2';
    ctx.fill();
    ctx.restore();
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ebf7ff';
    ctx.fillText('N', center, 15);
  };
}
