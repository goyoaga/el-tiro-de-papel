import { BALL, CONFIGS, OPENING_WIDTH, SCENE, evaluate, nextConfig, pointAt, prepareSwipe } from './model.js';

const $ = id => document.getElementById(id);
const canvas = $('scene');
const ctx = canvas.getContext?.('2d');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const ui = { ready: $('ready'), result: $('result'), repeat: $('repeat'), feedback: $('feedback'),
  hint: $('stage-hint'), round: $('round-label'), title: $('result-title'), copy: $('result-copy'),
  kicker: $('result-kicker'), streak: $('streak'), best: $('best'), angle: $('angle'), force: $('force'),
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
  grad.addColorStop(0, '#ebe9dc'); grad.addColorStop(.65, '#f2efe4'); grad.addColorStop(1, '#bb9878');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, SCENE.width, SCENE.height);
  ctx.fillStyle = '#d5b596'; ctx.fillRect(0, SCENE.floor, SCENE.width, SCENE.height - SCENE.floor);
  ctx.fillStyle = 'rgba(90,65,48,.13)';
  for (const y of [SCENE.floor + 5, SCENE.floor + 49]) ctx.fillRect(0, y, SCENE.width, 2);
  ctx.strokeStyle = 'rgba(70,80,72,.11)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, 90); ctx.lineTo(SCENE.width, 90); ctx.stroke();
  // Pequeñas referencias de oficina; la papelera y la bola siguen siendo el foco.
  ctx.fillStyle = 'rgba(117,135,121,.13)';
  rounded(45, 182, 145, 90, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(105,108,94,.12)';
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(62, 207 + i * 21); ctx.lineTo(170, 207 + i * 21); ctx.stroke(); }
}

function drawBin() {
  const { x, y } = config();
  const half = OPENING_WIDTH / 2;
  ctx.fillStyle = 'rgba(43,56,50,.17)';
  ctx.beginPath(); ctx.ellipse(x + 19, SCENE.floor + 14, 122, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6f948d';
  ctx.beginPath(); ctx.moveTo(x - half + 6, y + 5); ctx.lineTo(x + half - 6, y + 5);
  ctx.lineTo(x + 68, SCENE.floor); ctx.lineTo(x - 68, SCENE.floor); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#346c68';
  ctx.beginPath(); ctx.ellipse(x, y + 5, half, 22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#214542';
  ctx.beginPath(); ctx.ellipse(x, y + 1, half - 7, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#f2e9d9'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.ellipse(x, y, half, 20, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#f8f4e9'; ctx.font = '700 20px "DM Sans", sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('PAPEL', x, y + 94);
  ctx.fillStyle = '#3e6c65'; ctx.font = '700 14px "DM Sans", sans-serif';
  ctx.fillText('META', x, y - 41);
}

function drawPaper(x, y, flying = false) {
  ctx.save(); ctx.translate(x, y);
  ctx.shadowColor = 'rgba(35,41,34,.28)'; ctx.shadowBlur = flying ? 10 : 17;
  ctx.shadowOffsetY = flying ? 3 : 8;
  ctx.fillStyle = '#fffefa'; ctx.strokeStyle = '#a7aaa1'; ctx.lineWidth = 2.4;
  ctx.beginPath();
  for (let i = 0; i <= 12; i++) {
    const a = i / 12 * Math.PI * 2;
    const radius = BALL.radius * (i % 3 === 0 ? 1.07 : i % 2 ? .94 : 1);
    const px = Math.cos(a) * radius, py = Math.sin(a) * radius;
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath(); ctx.fill(); ctx.shadowColor = 'transparent'; ctx.stroke();
  ctx.strokeStyle = '#b9b9af'; ctx.lineWidth = 1.5;
  for (const [a, b, c, d] of [[-12,-7,3,-2],[-4,-15,12,-9],[-8,9,5,6],[2,3,11,14]]) {
    ctx.beginPath(); ctx.moveTo(a,b); ctx.quadraticCurveTo(c, b+6, d, d); ctx.stroke();
  }
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

function render(now) {
  if (!ctx) return;
  ctx.clearRect(0, 0, view.width, view.height);
  ctx.fillStyle = '#efece4'; ctx.fillRect(0, 0, view.width, view.height);
  ctx.save(); ctx.translate(view.left, view.top); ctx.scale(view.scale, view.scale);
  drawBackground(); drawBin();
  let p = BALL;
  if (phase === 'flying') {
    const elapsed = reducedMotion.matches ? result.eventTime : (now - launchTime) / 1000;
    const time = Math.min(result.eventTime, elapsed);
    p = pointAt(result.shot, time);
    drawTrajectory(result.shot, time);
    if (elapsed >= result.eventTime) finish();
    else frame = requestAnimationFrame(render);
  } else if (phase === 'result') {
    drawTrajectory(result.shot, result.eventTime, true);
    p = result.eventPoint;
    ctx.strokeStyle = result.success ? '#277b65' : '#b95541'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, 39, 0, Math.PI * 2); ctx.stroke();
  }
  drawPaper(p.x, p.y, phase === 'flying'); drawGesture();
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
  ui.feedback.textContent = 'La papelera se queda quieta durante el tiro.';
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
  for (const name of ['angle', 'force']) {
    ui[name].addEventListener('input', () => { $(name + '-value').textContent = ui[name].value + (name === 'angle' ? '°' : ''); });
  }
  $('keyboard-launch').addEventListener('click', () => {
    const angle = Number(ui.angle.value) * Math.PI / 180;
    const force = Number(ui.force.value);
    launch(force * Math.cos(angle), -force * Math.sin(angle));
  });
  window.addEventListener('resize', resize);
  nextRound(); resize();
}

ui.sound.addEventListener('click', async () => {
  soundEnabled = !soundEnabled;
  if (soundEnabled) {
    try { audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); await audioContext.resume(); }
    catch { soundEnabled = false; }
  } else if (audioContext) await audioContext.suspend().catch(() => {});
  ui.sound.innerHTML = `${soundEnabled ? '🔊' : '🔇'} <span>${soundEnabled ? 'ON' : 'OFF'}</span>`;
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
