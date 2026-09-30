import { BALL, CONFIGS, OPENING_WIDTH, SCENE, evaluate, nextConfig, pointAt, prepareSwipe } from './model.js';

const $ = id => document.getElementById(id);
const canvas = $('scene');
const ctx = canvas.getContext?.('2d');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const ui = { ready: $('ready'), result: $('result'), repeat: $('repeat'), feedback: $('feedback'),
  hint: $('stage-hint'), round: $('round-label'), title: $('result-title'), copy: $('result-copy'),
  kicker: $('result-kicker'), streak: $('streak'), best: $('best'),
  sound: $('sound'), bookmark: $('bookmark'), dialog: $('bookmark-dialog') };

let best = 0;
try { best = Number(localStorage.getItem('paper-toss-best')) || 0; } catch { /* Almacenamiento opcional. */ }
let streak = 0, round = 0, configIndex = 0;
let phase = 'ready', gesture = null, result = null, launchTime = 0, frame = 0;
let soundEnabled = false, audioContext = null;
let view = { scale: 1, left: 0, top: 0, width: 0, height: 0 };

const config = () => CONFIGS[configIndex];
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function resize() {
  if (!ctx) return;
  const bounds = canvas.getBoundingClientRect();
  const pixelRatio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(bounds.width * pixelRatio);
  canvas.height = Math.round(bounds.height * pixelRatio);
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  const scale = Math.min(bounds.width / SCENE.width, bounds.height / SCENE.height);
  view = { scale, left: (bounds.width - SCENE.width * scale) / 2,
    top: (bounds.height - SCENE.height * scale) / 2, width: bounds.width, height: bounds.height };
  render(performance.now());
}

function logical(clientX, clientY) {
  const b = canvas.getBoundingClientRect();
  return { x: (clientX - b.left - view.left) / view.scale,
    y: (clientY - b.top - view.top) / view.scale };
}

function rounded(x, y, w, h, r) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, SCENE.height);
  grad.addColorStop(0, '#e7e9df'); grad.addColorStop(.7, '#f3efe3'); grad.addColorStop(1, '#d5b695');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, SCENE.width, SCENE.height);
  ctx.fillStyle = '#cda989'; ctx.fillRect(0, SCENE.floor, SCENE.width, SCENE.height - SCENE.floor);
  const desk = ctx.createLinearGradient(0, SCENE.floor, 0, SCENE.height);
  desk.addColorStop(0, '#e1c5a7'); desk.addColorStop(1, '#c99e7d');
  ctx.fillStyle = desk; ctx.fillRect(0, SCENE.floor + 6, SCENE.width, SCENE.height - SCENE.floor - 6);
  ctx.fillStyle = 'rgba(94,64,45,.15)'; ctx.fillRect(0, SCENE.floor + 4, SCENE.width, 3);
  ctx.fillStyle = 'rgba(113,76,53,.08)'; ctx.fillRect(0, SCENE.floor + 50, SCENE.width, 2);
  // Una nota tenue sitúa la escena en una oficina sin competir con el lanzamiento.
  ctx.save(); ctx.translate(68, 175); ctx.rotate(-.04);
  ctx.fillStyle = 'rgba(102,118,102,.09)'; rounded(0, 0, 125, 87, 5); ctx.fill();
  ctx.strokeStyle = 'rgba(73,98,84,.11)'; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(18, 25 + i * 19); ctx.lineTo(101, 25 + i * 19); ctx.stroke(); }
  ctx.restore();
}

function binBodyPath(x, y, half) {
  ctx.beginPath(); ctx.moveTo(x - half + 5, y + 6);
  ctx.bezierCurveTo(x - half + 9, y + 64, x - 72, SCENE.floor - 36, x - 64, SCENE.floor - 7);
  ctx.quadraticCurveTo(x, SCENE.floor + 2, x + 64, SCENE.floor - 7);
  ctx.bezierCurveTo(x + 72, SCENE.floor - 36, x + half - 9, y + 64, x + half - 5, y + 6);
  ctx.closePath();
}

function drawBinBack() {
  const { x, y } = config();
  const half = OPENING_WIDTH / 2;
  ctx.save();
  ctx.fillStyle = 'rgba(38,52,45,.18)';
  ctx.beginPath(); ctx.ellipse(x + 21, SCENE.floor + 13, 110, 14, 0, 0, Math.PI * 2); ctx.fill();
  const side = ctx.createLinearGradient(x - half, y, x + half, y);
  side.addColorStop(0, '#3d6c68'); side.addColorStop(.28, '#78a29b');
  side.addColorStop(.72, '#588a83'); side.addColorStop(1, '#315f5b');
  binBodyPath(x, y, half); ctx.fillStyle = side; ctx.fill();
  ctx.strokeStyle = 'rgba(21,69,65,.46)'; ctx.lineWidth = 3; ctx.stroke();
  // El interior oscuro y la cara posterior del borde aportan profundidad.
  ctx.fillStyle = '#a8c0af';
  ctx.beginPath(); ctx.ellipse(x, y + 1, half, 22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#244c47';
  ctx.beginPath(); ctx.ellipse(x, y + 5, half - 7, 15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#193b38';
  ctx.beginPath(); ctx.ellipse(x, y + 12, half - 15, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#d4ddd0'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.ellipse(x, y, half, 21, 0, Math.PI, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawBinFront() {
  const { x, y } = config();
  const half = OPENING_WIDTH / 2;
  ctx.save();
  // El papel que cruza la boca queda oculto por el frente del recipiente.
  const face = ctx.createLinearGradient(x - half, 0, x + half, 0);
  face.addColorStop(0, '#426f6a'); face.addColorStop(.27, '#85aaa1');
  face.addColorStop(.72, '#64928a'); face.addColorStop(1, '#386660');
  ctx.beginPath();
  ctx.moveTo(x - half + 5, y + 7);
  ctx.bezierCurveTo(x - half + 9, y + 66, x - 72, SCENE.floor - 36, x - 64, SCENE.floor - 7);
  ctx.quadraticCurveTo(x, SCENE.floor + 2, x + 64, SCENE.floor - 7);
  ctx.bezierCurveTo(x + 72, SCENE.floor - 36, x + half - 9, y + 66, x + half - 5, y + 7);
  ctx.quadraticCurveTo(x, y + 39, x - half + 5, y + 7);
  ctx.closePath(); ctx.fillStyle = face; ctx.fill();
  ctx.strokeStyle = 'rgba(231,242,229,.16)'; ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i++) {
    const x0 = x + i * 26;
    ctx.beginPath(); ctx.moveTo(x0 - 12, y + 45); ctx.lineTo(x0 - 9, SCENE.floor - 24); ctx.stroke();
  }
  ctx.strokeStyle = '#dce5d7'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.ellipse(x, y + 2, half - 2, 20, 0, 0, Math.PI); ctx.stroke();
  ctx.strokeStyle = 'rgba(29,75,69,.42)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y + 6, half - 7, 15, 0, 0, Math.PI); ctx.stroke();
  ctx.restore();
}

function drawPaper(x, y, flying = false) {
  ctx.save(); ctx.translate(x, y);
  ctx.rotate(flying ? -.23 : .12);
  ctx.shadowColor = 'rgba(29,44,38,.28)'; ctx.shadowBlur = flying ? 9 : 16;
  ctx.shadowOffsetY = flying ? 3 : 8;
  const paper = ctx.createRadialGradient(-9, -11, 3, 2, 4, 34);
  paper.addColorStop(0, '#ffffff'); paper.addColorStop(.56, '#f7f5ea'); paper.addColorStop(1, '#bdc5b9');
  ctx.fillStyle = paper; ctx.strokeStyle = '#98a99e'; ctx.lineWidth = 2;
  ctx.beginPath();
  const radii = [1.06,.94,1.1,.9,1.03,.88,1.12,.95,1.04,.89,1.09,.94,1.06,.87,1.05,.93,1.11,.89];
  radii.forEach((radius, i) => {
    const a = i / radii.length * Math.PI * 2;
    const px = Math.cos(a) * BALL.radius * radius;
    const py = Math.sin(a) * BALL.radius * radius;
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  });
  ctx.closePath(); ctx.fill(); ctx.shadowColor = 'transparent'; ctx.stroke();
  const folds = [
    [[-22,-5],[-10,-14],[-4,-3],[7,-14]],
    [[-17,12],[-7,4],[1,12],[16,7]],
    [[4,-24],[12,-11],[5,-3],[21,2]],
    [[-3,19],[2,7],[14,16],[20,10]],
    [[-22,-5],[-11,1],[-17,12],[-3,19]],
  ];
  ctx.strokeStyle = '#9eaca2'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
  for (const fold of folds) {
    ctx.beginPath(); ctx.moveTo(...fold[0]);
    for (const p of fold.slice(1)) ctx.lineTo(...p);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.beginPath(); ctx.moveTo(-11,-15); ctx.lineTo(-3,-7); ctx.lineTo(-7,2); ctx.lineTo(-20,-3); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawTrajectory(shot, limit, faint = false) {
  if (!shot) return;
  ctx.save(); ctx.strokeStyle = faint ? 'rgba(185,79,57,.25)' : '#bd5e46';
  ctx.lineWidth = 3; ctx.setLineDash([6, 10]); ctx.beginPath();
  const segments = Math.max(2, Math.ceil(limit * 45));
  for (let i = 0; i <= segments; i++) {
    const p = pointAt(shot, limit * i / segments);
    if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke(); ctx.restore();
}

function drawGesture() {
  if (!gesture || phase !== 'aiming') return;
  const shot = prepareSwipe(gesture.dx, gesture.dy);
  const length = Math.hypot(gesture.dx, gesture.dy);
  const scale = Math.min(1, 750 / Math.max(1, length));
  const end = { x: BALL.x + gesture.dx * scale, y: BALL.y + gesture.dy * scale };
  ctx.strokeStyle = shot.valid ? '#b95541' : '#927e69'; ctx.lineWidth = 7;
  ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(BALL.x, BALL.y); ctx.lineTo(end.x, end.y); ctx.stroke();
  const angle = Math.atan2(end.y - BALL.y, end.x - BALL.x);
  ctx.fillStyle = shot.valid ? '#b95541' : '#927e69';
  ctx.beginPath(); ctx.moveTo(end.x, end.y);
  ctx.lineTo(end.x - 24 * Math.cos(angle - .45), end.y - 24 * Math.sin(angle - .45));
  ctx.lineTo(end.x - 24 * Math.cos(angle + .45), end.y - 24 * Math.sin(angle + .45));
  ctx.closePath(); ctx.fill();
}

function drawSuccess() {
  const { x, y } = config();
  ctx.save(); ctx.strokeStyle = '#d59659'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (const [dx, dy, angle] of [[-115,-30,-.5],[-102,-64,-.8],[0,-72,-1.57],[104,-64,-2.3],[117,-30,-2.6]]) {
    ctx.beginPath(); ctx.moveTo(x + dx, y + dy);
    ctx.lineTo(x + dx + Math.cos(angle) * 13, y + dy + Math.sin(angle) * 13); ctx.stroke();
  }
  ctx.restore();
}

function render(now) {
  if (!ctx) return;
  ctx.clearRect(0, 0, view.width, view.height);
  ctx.fillStyle = '#efece4'; ctx.fillRect(0, 0, view.width, view.height);
  ctx.save(); ctx.translate(view.left, view.top); ctx.scale(view.scale, view.scale);
  drawBackground(); drawBinBack();
  let p = BALL;
  if (phase === 'flying') {
    const enterDuration = result.success ? .32 : 0;
    const elapsed = reducedMotion.matches ? result.eventTime + enterDuration : (now - launchTime) / 1000;
    const time = Math.min(result.eventTime, elapsed);
    p = pointAt(result.shot, time);
    if (result.success && elapsed > result.eventTime) {
      const progress = clamp((elapsed - result.eventTime) / enterDuration, 0, 1);
      p = { x: p.x, y: p.y + (config().y + 74 - p.y) * (1 - (1 - progress) ** 2) };
    }
    drawTrajectory(result.shot, time);
    if (elapsed >= result.eventTime + enterDuration) finish();
    else frame = requestAnimationFrame(render);
  } else if (phase === 'result') {
    drawTrajectory(result.shot, result.eventTime, true);
    p = result.success ? { x: result.eventPoint.x, y: config().y + 74 } : result.eventPoint;
    if (!result.success) {
      ctx.strokeStyle = '#b95541'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, 39, 0, Math.PI * 2); ctx.stroke();
    }
  }
  drawPaper(p.x, p.y, phase === 'flying'); drawBinFront();
  if (phase === 'result' && result.success) drawSuccess();
  drawGesture();
  ctx.restore();
}

function trackRound() {
  const send = () => {
    try { window.goatcounter?.count?.({ path: 'ronda-completada', title: 'Ronda completada', event: true, no_session: true }); }
    catch { /* La analítica no cambia la partida. */ }
  };
  if (window.goatcounter?.count) send();
  else document.querySelector('script[data-goatcounter]')?.addEventListener('load', send, { once: true });
}

function beep(hz, duration = .09) {
  if (!soundEnabled || !audioContext) return;
  audioContext.resume().then(() => {
    const oscillator = audioContext.createOscillator(), volume = audioContext.createGain();
    const at = audioContext.currentTime;
    oscillator.type = 'sine'; oscillator.frequency.value = hz;
    volume.gain.setValueAtTime(.0001, at);
    volume.gain.exponentialRampToValueAtTime(.07, at + .01);
    volume.gain.exponentialRampToValueAtTime(.0001, at + duration);
    oscillator.connect(volume).connect(audioContext.destination);
    oscillator.start(at); oscillator.stop(at + duration + .01);
  }).catch(() => {});
}

function finish() {
  if (phase !== 'flying') return;
  phase = 'result';
  if (result.success) {
    streak++;
    if (streak > best) {
      best = streak;
      try { localStorage.setItem('paper-toss-best', String(best)); } catch { /* Modo privado. */ }
    }
    beep(result.clean ? 700 : 550, .16);
  } else streak = 0;
  ui.streak.textContent = String(streak); ui.best.textContent = String(best);
  const messages = {
    inside: ['¡Dentro!', 'La bola entró en la papelera. ¿Encadenas otro tiro?'],
    wall: ['Se quedó corta', 'La bola golpeó el lateral. Prueba con más altura o fuerza.'],
    rim: ['¡Rozó el borde!', 'Estuviste muy cerca. Ajusta ligeramente la dirección.'],
    low: ['Faltó altura', 'La bola no superó la boca de la papelera. Apunta más arriba.'],
    short: ['Faltó fuerza', 'La bola descendió antes de llegar. Alarga un poco el gesto.'],
    long: ['Te pasaste', 'La bola cruzó más allá de la papelera. Reduce la fuerza horizontal.'],
  };
  const [title, copy] = result.clean ? ['¡Tiro limpio!', 'Entró cerca del centro. ¿Puedes repetirlo?'] : messages[result.reason];
  ui.title.textContent = title; ui.copy.textContent = copy;
  ui.kicker.textContent = result.success ? 'ENCESTASTE' : 'OTRO INTENTO';
  ui.ready.hidden = true; ui.result.hidden = false;
  ui.hint.textContent = result.success ? 'LA BOLA ENTRÓ' : 'MIRA LA TRAYECTORIA Y AJUSTA';
  trackRound();
}

function launch(dx, dy) {
  if (phase !== 'ready' && phase !== 'aiming') return;
  const evaluation = evaluate(config(), { dx, dy });
  if (!evaluation.valid) {
    phase = 'ready'; gesture = null;
    ui.feedback.textContent = 'Desliza desde la bola hacia arriba y a la derecha un poco más.';
    render(performance.now()); return;
  }
  gesture = null; result = evaluation; phase = 'flying';
  launchTime = performance.now(); ui.feedback.textContent = 'La bola está volando…';
  ui.hint.textContent = 'UN SOLO TIRO · OBSERVA LA TRAYECTORIA';
  beep(300);
  cancelAnimationFrame(frame); frame = requestAnimationFrame(render);
}

function nextRound() {
  cancelAnimationFrame(frame);
  configIndex = nextConfig(configIndex, round);
  round++; phase = 'ready'; gesture = null; result = null;
  ui.round.textContent = `TIRO ${String(round).padStart(2,'0')}`;
  ui.ready.hidden = false; ui.result.hidden = true;
  ui.feedback.textContent = 'Apunta con un solo gesto.';
  ui.hint.textContent = 'DESLIZA LA BOLA HACIA LA PAPELERA';
  render(performance.now());
}

if (!ctx) {
  $('canvas-error').hidden = false; canvas.hidden = true;
  ui.feedback.textContent = 'No es posible iniciar una ronda en este navegador.';
} else {
  ui.best.textContent = String(best);
  canvas.addEventListener('pointerdown', event => {
    if (phase !== 'ready') return;
    const p = logical(event.clientX, event.clientY);
    if (Math.hypot(p.x - BALL.x, p.y - BALL.y) > 90) {
      ui.feedback.textContent = 'Comienza el gesto sobre la bola de papel.'; return;
    }
    canvas.setPointerCapture(event.pointerId);
    gesture = { start: p, dx: 0, dy: 0, pointerId: event.pointerId };
    phase = 'aiming'; ui.feedback.textContent = 'Suelta para lanzar. La flecha indica fuerza y dirección.';
  });
  canvas.addEventListener('pointermove', event => {
    if (phase !== 'aiming' || event.pointerId !== gesture?.pointerId) return;
    const p = logical(event.clientX, event.clientY);
    gesture.dx = p.x - gesture.start.x; gesture.dy = p.y - gesture.start.y;
    render(performance.now());
  });
  canvas.addEventListener('pointerup', event => {
    if (phase !== 'aiming' || event.pointerId !== gesture?.pointerId) return;
    const p = logical(event.clientX, event.clientY);
    launch(p.x - gesture.start.x, p.y - gesture.start.y);
  });
  canvas.addEventListener('pointercancel', () => {
    if (phase !== 'aiming') return;
    phase = 'ready'; gesture = null; ui.feedback.textContent = 'Tiro cancelado. Puedes volver a apuntar.';
    render(performance.now());
  });
  ui.repeat.addEventListener('click', nextRound);
  window.addEventListener('resize', resize);
  nextRound(); resize();
}

ui.sound.addEventListener('click', async () => {
  soundEnabled = !soundEnabled;
  if (soundEnabled) {
    try { audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); await audioContext.resume(); }
    catch { soundEnabled = false; }
  } else if (audioContext) await audioContext.suspend().catch(() => {});
  $('sound-label').textContent = soundEnabled ? 'ON' : 'OFF';
  ui.sound.setAttribute('aria-pressed', String(soundEnabled));
  ui.sound.setAttribute('aria-label', soundEnabled ? 'Desactivar sonido' : 'Activar sonido');
});

ui.bookmark.addEventListener('click', () => {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const mobile = /Android|iPad|iPhone|iPod/i.test(navigator.userAgent);
  $('bookmark-help').textContent = ios
    ? 'En Safari, toca Compartir y elige Añadir a favoritos o Añadir a pantalla de inicio.'
    : mobile ? 'En el menú del navegador, elige Añadir a marcadores o Añadir a pantalla de inicio.'
      : `Pulsa ${/Mac/i.test(navigator.platform) ? '⌘D' : 'Ctrl+D'} para guardar esta página.`;
  if (ui.dialog.showModal) ui.dialog.showModal();
  else alert($('bookmark-help').textContent);
});
