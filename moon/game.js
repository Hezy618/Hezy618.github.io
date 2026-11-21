import * as T from './vendor/three.module.min.js';
import { createWorld, height, stations } from './world.js?v=2';
import { createSuit } from './suit.js?v=2';
import { createCockpit, createFlight, returnRange, scanSpeed } from './flight.js?v=2';
import { createRadar } from './radar.js?v=2';

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
const projected = new T.Vector3();

let scene, renderer, audio, canvas, drag, suit, cockpit, flight, drawRadar;
let state = 'intro';
let yaw = 0, pitch = 0, lift = 0, verticalSpeed = 0;
let signalUntil = 0, time = 0, footDistance = 0, distance = 0;
let muted = true;
let mode = 'eva', phaseTime = 0, bank = 0, radarAt = -1;
const lander = stations[3];
const boardRadius = 4.4;
const door = new T.Vector3(lander.x, 0, lander.z + 3.05);
const viewSpace = new T.Vector3();
const surfaceColors = ['#a1e5ff', '#a1e5ff', '#a1e5ff', '#ffd5a5'];
const keyDifference = (positive, negative) => Number(keys.has(positive)) - Number(keys.has(negative));

function setText(id, value) {
  if ($(id).textContent !== value) $(id).textContent = value;
}

function hint(...actions) {
  const prompt = $('prompt');
  const markup = actions.map(([key, label]) => `<span><kbd>${key}</kbd> ${label}</span>`).join('');
  if (prompt.innerHTML !== markup) prompt.innerHTML = markup;
  prompt.hidden = actions.length === 0;
}

function setMode(next) {
  mode = next;
  phaseTime = 0;
  bank = 0;
  radarAt = -1;
  keys.clear();
  $('game').dataset.mode = next;
  $('flight-panel').hidden = next === 'eva';
  $('hop').textContent = next === 'eva' ? '跳跃' : '制动';
  $('hop').hidden = next !== 'eva' && next !== 'orbit';
  $('use').hidden = next === 'ascent' || next === 'descent';
  $('use').textContent = next === 'docked' ? '离舱' : next === 'orbit' ? '校准' : '采样';
  $('board').textContent = next === 'docked' ? '起飞' : next === 'orbit' ? '返航' : '登船';
  $('board').hidden = next === 'ascent' || next === 'descent';
  setText('mode-label', { eva: '月面外勤', docked: '登陆舱待命', ascent: '起飞中', orbit: '月球轨道', descent: '返航中' }[next]);
  setText('controls', next === 'eva' ? '鼠标或拖动观察 · Shift 加速 · 空格跳跃 · E 采样 · F 登船'
    : '鼠标或拖动调整航向 · W / S 推进与反推 · A / D 侧推 · Shift 增推 · 空格制动');
  refreshObjectives();
}

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
  const inSpace = mode !== 'eva';
  setText('objective-title', inSpace ? '轨道校准' : '月面采样');
  setText('count', inSpace ? `${flight.scanned.size} / 2` : `${collected.size} / 3`);
  stations.slice(0, 3).forEach((point, index) => {
    const target = inSpace ? flight.points[index] : point;
    const checked = inSpace ? flight.scanned.has(target) : collected.has(point);
    markers[index].row.hidden = inSpace && !target.result;
    markers[index].row.textContent = `${checked ? '✓' : '◇'} ${target.label}`;
    markers[index].row.classList.toggle('done', checked);
  });
}

function setState(next) {
  state = next;
  $('intro').hidden = next !== 'intro';
  $('hud').hidden = next !== 'play';
  $('pause-screen').hidden = next !== 'pause';
  $('complete').hidden = next !== 'complete';
  if (next !== 'play') {
    $('controls').hidden = true;
    $('help').setAttribute('aria-expanded', 'false');
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
  flight.reset();
  suit.reset();
  setMode('eva');
  setState('play');
  capture();
  announce('前往采样点，或靠近登陆舱开启轨道任务。');
}

function targets() {
  const remaining = stations.slice(0, 3).filter(point => !collected.has(point));
  if (remaining.length === 0 || range(lander) < 34) remaining.push(lander);
  return remaining;
}

function range(point) {
  return Math.hypot(point.x - position.x, point.z - position.z);
}

function nearby() {
  return targets().find(point => range(point) < 3.4 && (point.result || collected.size === 3));
}

function interact() {
  if (state !== 'play') return;
  if (mode === 'docked') { disembark(); return; }
  if (mode === 'orbit') {
    const target = flight.target();
    if (!target) return;
    if (flight.speed > scanSpeed) {
      announce('减速至 1.3 km/s 以下，再开始校准。');
      return;
    }
    flight.scanned.add(target);
    sound('signal');
    refreshObjectives();
    announce(target.result + (flight.scanned.size === 2 ? ' 可前往返航信标。' : ''));
    return;
  }
  if (mode !== 'eva') return;
  const point = nearby();
  if (!point) return;
  sound('signal');
  suit.gesture();
  if (point.result) {
    collected.add(point);
    refreshObjectives();
    announce(collected.size === 3 ? point.result + ' 请返回登陆舱。' : point.result);
    return;
  }
  const seconds = Math.floor(time);
  $('summary').textContent = `外勤 ${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒 · 徒步 ${Math.round(distance)} 米 · 轨道校准 ${flight.scanned.size} / 2`;
  setState('complete');
}

function disembark() {
  position.copy(door);
  yaw = Math.PI;
  pitch = lift = verticalSpeed = 0;
  suit.reset();
  setMode('eva');
  sound('signal');
  announce(flight.scanned.size === 2 ? '轨道数据已入库。可继续月面外勤。' : '已离开登陆舱。');
}

function board() {
  if (state !== 'play') return;
  if (mode === 'eva' && range(lander) <= boardRadius) {
    yaw = pitch = lift = verticalSpeed = 0;
    setMode('docked');
    sound('signal');
    announce('舱门锁定。可点火起飞。');
  } else if (mode === 'docked') {
    yaw = pitch = 0;
    setMode('ascent');
    sound('signal');
    announce('主引擎点火。正在升入月球轨道。');
  } else if (mode === 'orbit') {
    if (flight.position.length() > returnRange) {
      announce('请飞到返航信标 35 km 以内。');
    } else if (flight.speed > scanSpeed) {
      announce('减速至 1.3 km/s 以下，再启动返航。');
    } else {
      yaw = pitch = 0;
      setMode('descent');
      sound('signal');
      announce('返航程序已接管。');
    }
  }
}

function jump() {
  if (state === 'play' && mode === 'eva' && lift === 0) verticalSpeed = 3.45;
}

function look(dx, dy) {
  if (mode !== 'eva' && mode !== 'orbit') return;
  yaw = (yaw - dx * .0026) % (Math.PI * 2);
  pitch = T.MathUtils.clamp(pitch - dy * .0026, -1.34, 1.34);
}

function updateEVA(dt) {
  motion.set(keyDifference('KeyD', 'KeyA'), keyDifference('KeyS', 'KeyW'));
  if (motion.lengthSq() > 1) motion.normalize();
  const pace = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 8.7 : 5.5;
  motion.multiplyScalar(pace * dt);
  const oldX = position.x, oldZ = position.z;
  const x = position.x + motion.x * Math.cos(yaw) + motion.y * Math.sin(yaw);
  const z = position.z - motion.x * Math.sin(yaw) + motion.y * Math.cos(yaw);
  const radial = Math.hypot(x, z + 25);
  if (radial <= 156 && Math.hypot(x - lander.x, z - lander.z) > 2.15) {
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

  suit.update(dt, traveled / Math.max(dt, .001), lift > 0, pitch);
  setText('range-label', '距登陆舱');
  setText('range', `${Math.round(range(lander))} m`);
  const actions = [];
  if (nearby()) actions.push([coarse ? '采样' : 'E', collected.size === 3 && nearby() === lander ? '提交月面记录' : '记录观测']);
  if (range(lander) <= boardRadius) actions.push([coarse ? '登船' : 'F', '进入登陆舱']);
  hint(...actions);
  const active = targets();
  updateMarkers(stations.map((point, i) => ({
    active: active.includes(point), label: point.label, color: surfaceColors[i], range: range(point),
    position: new T.Vector3(point.x, height(point.x, point.z) + (point === lander ? 5.3 : 3.1), point.z),
  })), 'm');
}

function updateFlight(dt) {
  const duration = 3.2;
  phaseTime += dt;
  const phase = T.MathUtils.smoothstep(phaseTime, 0, duration);
  const altitude = mode === 'ascent' ? phase : mode === 'descent' ? 1 - phase : 0;

  if (mode === 'orbit') {
    bank = flight.step(dt, keys, yaw, pitch);
    camera.position.copy(flight.position);
    camera.rotation.set(pitch, yaw, reducedMotion ? 0 : bank);
    setText('flight-phase', keys.has('Space') ? '制动' : '手动驾驶');
    setText('speed', (flight.speed / 10).toFixed(1));
    setText('altitude', Math.round(flight.altitude).toString());
    setText('range-label', '距返航信标');
    setText('range', `${Math.round(flight.position.length())} km`);
    const target = flight.target();
    const actions = [];
    if (target) actions.push([coarse ? '校准' : 'E', flight.speed > scanSpeed ? '先减速再校准' : `校准${target.label}`]);
    if (flight.position.length() <= returnRange) actions.push([coarse ? '返航' : 'F', '自动返航']);
    hint(...actions);
    updateMarkers(flight.points.map(point => ({
      ...point, range: flight.position.distanceTo(point.position), active: !flight.scanned.has(point)
        && (Boolean(point.result) || flight.position.length() > 28),
    })), 'km');
    return;
  }

  const ground = height(lander.x, lander.z);
  camera.position.set(lander.x, ground + 2.9 + altitude * 186, lander.z + altitude * -76);
  camera.rotation.set(-.09 - altitude * .48, 0, 0);
  for (const { marker } of markers) marker.hidden = true;
  const docked = mode === 'docked';
  setText('flight-phase', docked ? '停泊' : mode === 'ascent' ? '爬升' : '自动降落');
  setText('speed', docked ? '0.0' : (phase * 2.5 + .1).toFixed(1));
  setText('altitude', Math.round(altitude * 148).toString());
  setText('range-label', '登陆舱');
  setText('range', 'AL-07');
  if (docked) {
    hint([coarse ? '起飞' : 'F', '点火起飞'], [coarse ? '离舱' : 'E', '返回月面']);
  } else {
    hint();
    if (phaseTime >= duration) {
      if (mode === 'ascent') {
        flight.launch();
        setMode('orbit');
        camera.position.copy(flight.position);
        camera.rotation.set(0, 0, 0);
        announce('手动驾驶已接管。飞近卫星并减速校准。');
      } else {
        setMode('docked');
        announce('已降落在静海。可离舱或再次起飞。');
      }
    }
  }
}

function update(dt) {
  time += dt;
  look(keyDifference('ArrowRight', 'ArrowLeft') * dt * 660, keyDifference('ArrowDown', 'ArrowUp') * dt * 540);
  if (mode === 'eva') updateEVA(dt);
  else updateFlight(dt);
  const heading = Math.round((360 - yaw * 180 / Math.PI) % 360 + 360) % 360;
  setText('heading', String(heading).padStart(3, '0') + '°');
  if (time > signalUntil) setText('notice', '');
  if (time >= radarAt) {
    radarAt = time + .09;
    const orbit = mode === 'orbit';
    const points = orbit ? flight.points.filter(point => !flight.scanned.has(point)).map(point => ({
      x: point.position.x, z: point.position.z, color: point.color,
    })) : stations.map((point, i) => ({ ...point, color: collected.has(point) ? '#657b85' : surfaceColors[i] }));
    drawRadar(orbit ? flight.position : mode === 'eva' ? position : lander, yaw, points, orbit);
  }
}

function updateMarkers(points, unit) {
  const w = view.clientWidth, h = view.clientHeight;
  const edgeCounts = [0, 0];
  camera.updateMatrixWorld();
  for (const { marker } of markers) marker.hidden = true;
  for (const [index, point] of points.entries()) {
    if (!point.active) continue;
    const { marker } = markers[index];
    marker.hidden = false;
    viewSpace.copy(point.position).applyMatrix4(camera.matrixWorldInverse);
    projected.copy(point.position).project(camera);
    let px = (projected.x + 1) * .5 * w;
    let py = (1 - projected.y) * .5 * h;
    let hint = '';
    if (viewSpace.z >= 0 || px < 70 || px > w - 70) {
      const left = viewSpace.x < 0;
      px = left ? 71 : w - 71;
      const panelBottom = left ? $('radar').closest('.navigation').getBoundingClientRect().bottom : 0;
      py = Math.max(h * .51, panelBottom + 18) + 36 * edgeCounts[Number(left)]++;
      hint = left ? '‹ ' : '› ';
    } else if (unit === 'km' && (py < h * .25 || py > h * .73)) {
      hint = py < h * .25 ? '↑ ' : '↓ ';
    }
    marker.style.left = `${px}px`;
    marker.style.top = `${T.MathUtils.clamp(py, h * .25, h * .73)}px`;
    marker.style.color = point.color;
    marker.textContent = `${hint}${point.label} · ${Math.round(point.range)} ${unit}`;
  }
}

function render() {
  renderer.render(mode === 'orbit' ? flight.scene : scene, camera);
  if (state === 'intro') return;
  const overlay = mode === 'eva' ? suit : cockpit;
  if (mode !== 'eva') cockpit.animate(bank);
  renderer.autoClear = false;
  renderer.clearDepth();
  renderer.render(overlay.scene, overlay.camera);
  renderer.autoClear = true;
}

function resize() {
  const width = view.clientWidth;
  const height = view.clientHeight;
  camera.aspect = width / Math.max(1, height);
  camera.fov = width < 650 ? 69 : 58;
  camera.updateProjectionMatrix();
  suit.camera.aspect = camera.aspect;
  suit.camera.updateProjectionMatrix();
  cockpit.layout(camera.aspect);
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
  $('hop').addEventListener('pointerdown', event => {
    if (mode !== 'orbit') return;
    $('hop').setPointerCapture(event.pointerId);
    keys.add('Space');
  });
  $('hop').addEventListener('lostpointercapture', () => keys.delete('Space'));
  $('board').addEventListener('click', board);
  $('help').addEventListener('click', () => {
    $('controls').hidden = !$('controls').hidden;
    $('help').setAttribute('aria-expanded', !$('controls').hidden);
  });
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
    if (!event.repeat && event.code === 'KeyF') { board(); return; }
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
  const [world, lunarMap] = await Promise.all([
    createWorld(),
    new T.TextureLoader().loadAsync(new URL('lunar-albedo.jpg', import.meta.url).href),
  ]);
  scene = world.scene;
  flight = createFlight(world.earthMap, lunarMap);
  cockpit = createCockpit();
  suit = createSuit(reducedMotion);
  drawRadar = createRadar($('radar'));
  resize();
  introView();
  bindInput();
  window.addEventListener('resize', () => {
    resize();
    if (state === 'intro') introView();
    else render();
  });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    if (state === 'play') setState('pause');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    renderer.shadowMap.needsUpdate = true;
    render();
  });
  $('start').disabled = false;
  $('start').textContent = '开始月面探索';
  let previous = performance.now();
  renderer.setAnimationLoop(now => {
    const dt = Math.min(Math.max((now - previous) / 1000, 0), .055);
    previous = now;
    if (state !== 'play') return;
    update(dt);
    render();
  });
} catch (error) {
  console.error(error);
  $('start').textContent = '月面视图不可用';
  $('boot-error').textContent = '请使用支持 WebGL 3D 加速的浏览器打开。';
  $('boot-error').hidden = false;
}
