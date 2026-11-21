import * as T from './vendor/three.module.min.js';
import { createWorld, height, stations } from './world.js?v=1';

const $ = id => document.getElementById(id);
const view = $('view');
const camera = new T.PerspectiveCamera(58, 1, .065, 1600);
camera.rotation.order = 'YXZ';
const spawn = new T.Vector3(2, 0, 3);
const position = spawn.clone();
const motion = new T.Vector2();
const keys = new Set();
const collected = new Set();
const coarse = matchMedia('(pointer: coarse)').matches;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const direction = new T.Vector3();
const projected = new T.Vector3();
const up = new T.Vector3(0, 1, 0);

let scene, renderer, audio, canvas, drag;
let state = 'intro';
let yaw = 0, pitch = 0, lift = 0, verticalSpeed = 0;
let signalUntil = 0, time = 0, footDistance = 0, distance = 0;
let muted = true;

const markers = stations.map(point => {
  const marker = document.createElement('div');
  marker.className = 'waypoint';
  $('waypoints').append(marker);
  const row = document.createElement('div');
  if (point.result) $('sample-list').append(row);
  return { marker, row };
});

function sound(type) {
  if (muted || !audio || audio.state !== 'running') return;
  const t = audio.currentTime;
  const gain = audio.createGain();
  gain.connect(audio.destination);
  if (type === 'step') {
    const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * .12), audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 410;
    gain.gain.value = .19;
    source.buffer = buffer;
    source.connect(filter).connect(gain);
    source.start();
    return;
  }
  const oscillator = audio.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(520, t);
  oscillator.frequency.setValueAtTime(783, t + .13);
  gain.gain.setValueAtTime(.001, t);
  gain.gain.exponentialRampToValueAtTime(.12, t + .035);
  gain.gain.exponentialRampToValueAtTime(.001, t + .42);
  oscillator.connect(gain);
  oscillator.start(t);
  oscillator.stop(t + .44);
}

function announce(message) {
  $('notice').textContent = message;
  signalUntil = time + 5.5;
}

function refreshObjectives() {
  $('count').textContent = `${collected.size} / 3`;
  stations.slice(0, 3).forEach((point, index) => {
    markers[index].row.textContent = `${collected.has(point) ? '✓' : '◇'} ${point.label}`;
    markers[index].row.classList.toggle('done', collected.has(point));
  });
}

function setState(next) {
  state = next;
  $('intro').hidden = next !== 'intro';
  $('hud').hidden = next !== 'play';
  $('pause-screen').hidden = next !== 'pause';
  $('complete').hidden = next !== 'complete';
  if (next !== 'play') {
    keys.clear();
    motion.set(0, 0);
    drag = null;
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    if (next === 'pause') $('resume').focus();
    if (next === 'complete') $('restart').focus();
  }
}

function capture() {
  canvas.focus({ preventScroll: true });
  if (!coarse && canvas.requestPointerLock) {
    try { canvas.requestPointerLock()?.catch(() => {}); } catch { /* Drag remains available. */ }
  }
}

function start() {
  if (!renderer) return;
  position.copy(spawn);
  yaw = pitch = lift = verticalSpeed = time = distance = footDistance = 0;
  collected.clear();
  refreshObjectives();
  setState('play');
  capture();
  announce('循着菱形标记前往采样点。');
}

function targets() {
  return collected.size === 3 ? [stations[3]] : stations.slice(0, 3).filter(point => !collected.has(point));
}

function range(point) {
  return Math.hypot(point.x - position.x, point.z - position.z);
}

function nearby() {
  return targets().find(point => range(point) < 3.4);
}

function interact() {
  if (state !== 'play') return;
  const point = nearby();
  if (!point) return;
  sound('signal');
  if (point.result) {
    collected.add(point);
    refreshObjectives();
    announce(collected.size === 3 ? point.result + ' 请返回登陆舱。' : point.result);
    return;
  }
  const seconds = Math.floor(time);
  $('summary').textContent = `探索用时 ${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒 · 行进 ${Math.round(distance)} 米`;
  setState('complete');
}

function jump() {
  if (state === 'play' && lift === 0) verticalSpeed = 3.45;
}

function look(dx, dy) {
  yaw = (yaw - dx * .0026) % (Math.PI * 2);
  pitch = T.MathUtils.clamp(pitch - dy * .0026, -1.34, 1.34);
}

function update(dt) {
  time += dt;
  look(((keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0)) * dt * 660,
    ((keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0)) * dt * 540);
  motion.set(Number(keys.has('KeyD')) - Number(keys.has('KeyA')),
    Number(keys.has('KeyS')) - Number(keys.has('KeyW')));
  if (motion.lengthSq() > 1) motion.normalize();
  const pace = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 8.7 : 5.5;
  motion.multiplyScalar(pace * dt);
  const oldX = position.x, oldZ = position.z;
  const x = position.x + motion.x * Math.cos(yaw) + motion.y * Math.sin(yaw);
  const z = position.z - motion.x * Math.sin(yaw) + motion.y * Math.cos(yaw);
  const radial = Math.hypot(x, z + 25);
  const lander = stations[3];
  if (radial <= 156 && Math.hypot(x - lander.x, z - lander.z) > 1.55) {
    position.x = x;
    position.z = z;
  }
  if (radial > 156 && time > signalUntil) announce('已到观测区边缘，请返回信标方向。');
  const traveled = Math.hypot(position.x - oldX, position.z - oldZ);
  distance += traveled;
  if (lift === 0) {
    footDistance += traveled;
    if (footDistance > 1.75) {
      footDistance = 0;
      sound('step');
    }
  }
  if (lift > 0 || verticalSpeed > 0) {
    verticalSpeed -= 5.4 * dt;
    lift += verticalSpeed * dt;
    if (lift <= 0) lift = verticalSpeed = 0;
  }
  const bob = traveled > .001 && lift === 0 && !reducedMotion ? Math.sin(distance * 3.6) * .028 : 0;
  position.y = height(position.x, position.z) + 1.77 + lift + bob;
  camera.position.copy(position);
  camera.rotation.set(pitch, yaw, 0);
  camera.updateMatrixWorld();

  const heading = Math.round((360 - yaw * 180 / Math.PI) % 360 + 360) % 360;
  $('heading').textContent = String(heading).padStart(3, '0') + '°';
  $('range').textContent = Math.round(range(lander)) + ' m';
  $('prompt').hidden = !nearby();
  if (!$('prompt').hidden) {
    const action = collected.size === 3 ? '返回登陆舱' : '记录观测';
    $('prompt').textContent = coarse ? `触碰「交互」 · ${action}` : `E · ${action}`;
  }
  if (time > signalUntil) $('notice').textContent = '';
  updateMarkers();
}

function updateMarkers() {
  const active = targets();
  const w = view.clientWidth, h = view.clientHeight;
  const edgeCounts = [0, 0];
  for (const [index, point] of stations.entries()) {
    const { marker } = markers[index];
    marker.hidden = !active.includes(point);
    if (marker.hidden) continue;
    projected.set(point.x, height(point.x, point.z) + (index === 3 ? 5.2 : 3.1), point.z);
    direction.copy(projected).sub(camera.position).applyAxisAngle(up, -yaw);
    projected.project(camera);
    let px = (projected.x + 1) * .5 * w;
    let py = (1 - projected.y) * .5 * h;
    let hint = '';
    if (direction.z >= 0 || px < 70 || px > w - 70) {
      const left = direction.x < 0;
      px = left ? 71 : w - 71;
      py = h * .55 + 40 * edgeCounts[Number(left)]++;
      hint = left ? '‹ ' : '› ';
    }
    marker.style.left = `${px}px`;
    marker.style.top = `${T.MathUtils.clamp(py, h * .32, h * .72)}px`;
    marker.textContent = `${hint}${point.label} · ${Math.round(range(point))} m`;
  }
}

function resize() {
  const width = view.clientWidth;
  const height = view.clientHeight;
  camera.aspect = width / Math.max(1, height);
  camera.fov = width < 650 ? 69 : 58;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function introView() {
  if (view.clientWidth < 700) {
    camera.position.set(-5, 2.4, 12);
    camera.lookAt(6, 3.7, -27);
  } else {
    camera.position.set(2.3, 2.45, 3);
    camera.lookAt(-1, 3.05, -26);
  }
  renderer.render(scene, camera);
}

function bindInput() {
  $('start').addEventListener('click', start);
  $('restart').addEventListener('click', start);
  $('pause').addEventListener('click', () => setState('pause'));
  $('resume').addEventListener('click', () => { setState('play'); capture(); });
  $('hop').addEventListener('click', jump);
  $('use').addEventListener('click', interact);
  $('sound').addEventListener('click', async () => {
    try {
      if (muted) {
        audio ??= new AudioContext();
        await audio.resume();
      }
      muted = !muted;
      $('sound').textContent = muted ? '声音关' : '声音开';
      $('sound').setAttribute('aria-pressed', !muted);
      sound('signal');
    } catch {
      $('sound').textContent = '声音不可用';
    }
  });

  document.addEventListener('keydown', event => {
    if (state !== 'play') return;
    if (event.code === 'Escape') { setState('pause'); return; }
    if (event.target instanceof HTMLButtonElement && event.code === 'Space') return;
    if (event.code.startsWith('Arrow') || event.code === 'Space') event.preventDefault();
    if (!event.repeat && event.code === 'KeyE') interact();
    if (!event.repeat && event.code === 'Space') jump();
    if (state === 'play') keys.add(event.code);
  });
  document.addEventListener('keyup', event => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'play') setState('pause');
  });
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) canvas.dataset.locked = 'true';
    else if (canvas.dataset.locked) {
      delete canvas.dataset.locked;
      if (state === 'play') setState('pause');
    }
  });
  document.addEventListener('mousemove', event => {
    if (state === 'play' && document.pointerLockElement === canvas) look(event.movementX, event.movementY);
  });
  canvas.addEventListener('pointerdown', event => {
    if (state !== 'play' || document.pointerLockElement === canvas || drag) return;
    canvas.setPointerCapture(event.pointerId);
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
  });
  canvas.addEventListener('pointermove', event => {
    if (drag?.id !== event.pointerId || state !== 'play') return;
    look((event.clientX - drag.x) * 1.7, (event.clientY - drag.y) * 1.7);
    drag.x = event.clientX;
    drag.y = event.clientY;
  });
  canvas.addEventListener('lostpointercapture', event => {
    if (drag?.id === event.pointerId) drag = null;
  });

  for (const button of document.querySelectorAll('[data-key]')) {
    button.addEventListener('pointerdown', event => {
      button.setPointerCapture(event.pointerId);
      keys.add(button.dataset.key);
    });
    button.addEventListener('lostpointercapture', () => keys.delete(button.dataset.key));
  }
}

try {
  renderer = new T.WebGLRenderer({ antialias: !coarse, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.15 : 1.55));
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  canvas = renderer.domElement;
  canvas.tabIndex = -1;
  canvas.setAttribute('aria-label', '月面第一人称视图');
  view.append(canvas);
  scene = await createWorld();
  resize();
  introView();
  bindInput();
  window.addEventListener('resize', () => {
    resize();
    if (state === 'intro') introView();
    else renderer.render(scene, camera);
  });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    if (state === 'play') setState('pause');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);
  });
  $('start').disabled = false;
  $('start').textContent = '开始月面探索';
  let previous = performance.now();
  renderer.setAnimationLoop(now => {
    const dt = Math.min(Math.max((now - previous) / 1000, 0), .055);
    previous = now;
    if (state !== 'play') return;
    update(dt);
    renderer.render(scene, camera);
  });
} catch (error) {
  console.error(error);
  $('start').textContent = '月面视图不可用';
  $('boot-error').textContent = '请使用支持 WebGL 3D 加速的浏览器打开。';
  $('boot-error').hidden = false;
}
