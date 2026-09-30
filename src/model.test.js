import test from 'node:test';
import assert from 'node:assert/strict';
import { BALL, CONFIGS, evaluate, nextConfig, pointAt, prepareSwipe } from './model.js';

test('el tiro de referencia encesta y el gesto corto no consume una ronda', () => {
  const result = evaluate(CONFIGS[0], { dx: 330, dy: -300 });
  assert.equal(result.valid, true);
  assert.equal(result.success, true);
  assert.equal(evaluate(CONFIGS[0], { dx: 12, dy: -20 }).valid, false);
});

test('todas las configuraciones tienen varios gestos alcanzables', () => {
  for (const config of CONFIGS) {
    let successes = 0;
    let failures = 0;
    for (let dx = 160; dx <= 600; dx += 20) {
      for (let dy = -500; dy <= -160; dy += 20) {
        const hit = evaluate(config, { dx, dy });
        if (hit.success) successes++; else failures++;
      }
    }
    assert.ok(successes > 15, `${JSON.stringify(config)} no es alcanzable`);
    assert.ok(failures > successes, `${JSON.stringify(config)} es trivial`);
  }
});

test('la animación y el resultado comparten el mismo punto de contacto', () => {
  const result = evaluate(CONFIGS[0], { dx: 330, dy: -300 });
  assert.deepEqual(pointAt(result.shot, result.eventTime), result.eventPoint);
  assert.ok(result.eventPoint.y <= CONFIGS[0].y - BALL.radius + 1e-6);
});

test('la fuerza no depende de la rapidez del dedo y cada ronda cambia de posición', () => {
  assert.deepEqual(prepareSwipe(330, -300), prepareSwipe(330, -300));
  assert.equal(nextConfig(3, 0), 0);
  for (let n = 0; n < 10; n++) assert.notEqual(nextConfig(3, 2, () => n / 10), 3);
});
