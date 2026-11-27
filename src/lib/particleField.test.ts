import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PARTICLE_CONFIG,
  computeEffectiveDpr,
  computeParticleCount,
  createParticleField,
  normalizeDeltaFrames,
  stepParticleField,
} from './particleField.ts';

test('particleField engine invariants', async (t) => {
  await t.test('scales particle count by screen area and caps at MAX_PARTICLES (160)', () => {
    const mobileCount = computeParticleCount(390, 844);
    const desktopCount = computeParticleCount(1440, 900);
    const uhdCount = computeParticleCount(3840, 2160);

    assert.ok(mobileCount > 0 && mobileCount < desktopCount);
    assert.ok(desktopCount <= PARTICLE_CONFIG.maxParticles);
    assert.equal(uhdCount, 160);
    assert.equal(computeParticleCount(0, 900), 0);
  });

  await t.test('caps devicePixelRatio at 2 for retina displays', () => {
    assert.equal(computeEffectiveDpr(1), 1);
    assert.equal(computeEffectiveDpr(1.5), 1.5);
    assert.equal(computeEffectiveDpr(2), 2);
    assert.equal(computeEffectiveDpr(3), 2);
    assert.equal(computeEffectiveDpr(NaN), 1);
  });

  await t.test('keeps movement speed consistent between 60Hz and 120Hz via delta time', () => {
    const dt60 = normalizeDeltaFrames(16.6667);
    const dt120 = normalizeDeltaFrames(8.33335);

    const field60 = createParticleField(1000, 600, 3, { maxParticles: 10, density: 1, random: () => 0.4 });
    const field120 = createParticleField(1000, 600, 3, { maxParticles: 10, density: 1, random: () => 0.4 });

    stepParticleField(field60, dt60);
    stepParticleField(field120, dt120);
    stepParticleField(field120, dt120);

    for (let i = 0; i < field60.count; i++) {
      assert.ok(Math.abs(field60.x[i] - field120.x[i]) < 1e-4);
      assert.ok(Math.abs(field60.y[i] - field120.y[i]) < 1e-4);
    }

    // Clamps extreme frame spikes (e.g. tab resume)
    assert.equal(normalizeDeltaFrames(5000), PARTICLE_CONFIG.maxDeltaFrames);
  });

  await t.test('wraps particles seamlessly around all four viewport edges', () => {
    const field = createParticleField(100, 100, 3, { maxParticles: 4, density: 1, random: () => 0.5 });
    const pad = 4;

    // 0: exit left, 1: exit right, 2: exit top, 3: exit bottom
    field.x.set([-3.5, 103.5, 50, 50]);
    field.y.set([50, 50, -3.5, 103.5]);
    field.vx.set([-2, 2, 0, 0]);
    field.vy.set([0, 0, -2, 2]);

    stepParticleField(field, 1, pad);

    assert.equal(field.x[0], 100 + pad);
    assert.equal(field.x[1], -pad);
    assert.equal(field.y[2], 100 + pad);
    assert.equal(field.y[3], -pad);
  });

  await t.test('partitions particles contiguously across opacity groups with exact total count', () => {
    const field = createParticleField(1280, 720, 3);
    assert.equal(field.groupOffsets.length, 4);
    assert.equal(field.groupOffsets[0], 0);
    assert.equal(field.groupOffsets[3], field.count);
    for (let k = 0; k < 3; k++) {
      assert.ok(field.groupOffsets[k + 1] >= field.groupOffsets[k]);
    }
  });
});
