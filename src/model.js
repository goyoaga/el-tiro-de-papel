// Coordenadas lógicas independientes del tamaño físico del lienzo.
export const SCENE = Object.freeze({ width: 1000, height: 700, floor: 620 });
export const BALL = Object.freeze({ x: 180, y: 550, radius: 24 });
export const GRAVITY = 650;
export const OPENING_WIDTH = 170;
export const CONFIGS = Object.freeze([
  Object.freeze({ x: 650, y: 460 }),
  Object.freeze({ x: 620, y: 490 }),
  Object.freeze({ x: 710, y: 445 }),
  Object.freeze({ x: 730, y: 420 }),
  Object.freeze({ x: 770, y: 475 }),
]);

export function nextConfig(previousIndex, round, random = Math.random) {
  if (round === 0) return 0;
  const choices = CONFIGS.map((_, index) => index).filter(index => index !== previousIndex);
  return choices[Math.floor(Math.max(0, Math.min(0.999999, random())) * choices.length)];
}

export function prepareSwipe(dx, dy) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return { valid: false, reason: 'invalid' };
  const length = Math.hypot(dx, dy);
  if (dx <= 0 || dy >= 0 || length < 120) return { valid: false, reason: 'short' };
  const factor = Math.min(1, 750 / length);
  return { valid: true, dx: dx * factor, dy: dy * factor,
    vx: 1.4 * dx * factor, vy: 1.4 * dy * factor, capped: factor < 1 };
}

export function pointAt(shot, time) {
  return { x: BALL.x + shot.vx * time,
    y: BALL.y + shot.vy * time + 0.5 * GRAVITY * time * time };
}

function descendingTime(y) {
  return shot => {
    const discriminant = shot.vy ** 2 + 2 * GRAVITY * (y - BALL.y);
    return discriminant < 0 ? Infinity : (-shot.vy + Math.sqrt(discriminant)) / GRAVITY;
  };
}

export function evaluate(config, gesture) {
  const shot = prepareSwipe(gesture.dx, gesture.dy);
  if (!shot.valid) return { valid: false, reason: shot.reason };
  const left = config.x - OPENING_WIDTH / 2;
  const right = config.x + OPENING_WIDTH / 2;
  const safeLeft = left + BALL.radius;
  const safeRight = right - BALL.radius;
  const rimPlane = config.y - BALL.radius;
  const groundTime = descendingTime(SCENE.floor - BALL.radius)(shot);
  const rimTime = descendingTime(rimPlane)(shot);
  const rimPoint = Number.isFinite(rimTime) ? pointAt(shot, rimTime) : null;
  const candidates = [{ type: 'ground', time: groundTime }];

  // La pared izquierda se comprueba cuando el centro entra en su zona de contacto.
  const wallTime = (left - BALL.radius - BALL.x) / shot.vx;
  if (wallTime > 0 && wallTime < groundTime) {
    const wallY = pointAt(shot, wallTime).y;
    if (wallY > rimPlane && wallY < SCENE.floor + BALL.radius) {
      candidates.push({ type: 'wall', time: wallTime });
    }
  }
  if (rimPoint && rimTime < groundTime) {
    if (rimPoint.x >= safeLeft && rimPoint.x <= safeRight) {
      candidates.push({ type: 'inside', time: rimTime });
    } else if ((rimPoint.x >= left - BALL.radius && rimPoint.x < safeLeft)
      || (rimPoint.x > safeRight && rimPoint.x <= right + BALL.radius)) {
      candidates.push({ type: 'rim', time: rimTime });
    }
  }
  candidates.sort((a, b) => a.time - b.time);
  const event = candidates[0];
  const hit = pointAt(shot, event.time);
  const success = event.type === 'inside';
  const clean = success && Math.abs(rimPoint.x - config.x) <= (safeRight - config.x) * 0.25;
  const reason = success ? 'inside' : event.type === 'wall' ? 'wall'
    : event.type === 'rim' ? 'rim'
      : !rimPoint ? 'low'
        : rimPoint.x < safeLeft ? 'short' : 'long';
  return { valid: true, shot, success, clean, reason, eventTime: event.time,
    eventPoint: hit, crossingX: rimPoint?.x ?? null, eventType: event.type };
}
