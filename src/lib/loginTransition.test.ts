import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LOGIN_CONFETTI_SPECS,
  LOGIN_TRANSITION_TIMING,
  getTotalLoginSequenceMs,
  loginFlowReducer,
  runWithViewTransition,
} from './loginTransition.ts';

test('loginTransition state machine & configuration invariants', async (t) => {
  await t.test('follows strict idle -> loading -> success -> redirecting flow', () => {
    let state = loginFlowReducer('idle', { type: 'SUBMIT' });
    assert.equal(state, 'loading');

    // Duplicate submit while loading is ignored (prevents double submission)
    state = loginFlowReducer(state, { type: 'SUBMIT' });
    assert.equal(state, 'loading');

    state = loginFlowReducer(state, { type: 'AUTH_VALID' });
    assert.equal(state, 'success');

    // Duplicate submit while in success is ignored
    state = loginFlowReducer(state, { type: 'SUBMIT' });
    assert.equal(state, 'success');

    state = loginFlowReducer(state, { type: 'BEGIN_REDIRECT' });
    assert.equal(state, 'redirecting');

    state = loginFlowReducer(state, { type: 'RESET' });
    assert.equal(state, 'idle');
  });

  await t.test('returns cleanly from loading to idle on AUTH_FAILED and never enters success', () => {
    const loading = loginFlowReducer('idle', { type: 'SUBMIT' });
    assert.equal(loading, 'loading');

    const failed = loginFlowReducer(loading, { type: 'AUTH_FAILED' });
    assert.equal(failed, 'idle');

    // AUTH_VALID from idle is a no-op
    assert.equal(loginFlowReducer('idle', { type: 'AUTH_VALID' }), 'idle');
  });

  await t.test('keeps total animation duration within 2.5s–3.0s and confetti count <= 12', () => {
    const totalMs = getTotalLoginSequenceMs();
    assert.ok(totalMs >= 2500 && totalMs <= 3000, `Expected 2500..3000ms, got ${totalMs}ms`);
    assert.equal(LOGIN_TRANSITION_TIMING.loadingMs, 800);
    assert.ok(LOGIN_CONFETTI_SPECS.length <= 12 && LOGIN_CONFETTI_SPECS.length > 0);
  });

  await t.test('falls back safely when View Transitions API is unavailable or reducedMotion is active', () => {
    let called = 0;
    runWithViewTransition(() => {
      called += 1;
    }, true);
    runWithViewTransition(() => {
      called += 1;
    }, false);
    assert.equal(called, 2);
  });
});
