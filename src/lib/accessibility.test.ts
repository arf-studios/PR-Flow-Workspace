import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_A11Y_SETTINGS,
  countActiveA11yFeatures,
  extractReadableSpeechText,
  fontScaleToRootPx,
  sanitizeA11ySettings,
  stepFontScale,
} from './accessibility';

describe('accessibility pure helpers', () => {
  it('steps font scale cleanly and clamps at minimum (90%) and maximum (125%)', () => {
    assert.equal(stepFontScale(100, 'decrease'), 90);
    assert.equal(stepFontScale(90, 'decrease'), 90);
    assert.equal(stepFontScale(100, 'increase'), 112);
    assert.equal(stepFontScale(112, 'increase'), 125);
    assert.equal(stepFontScale(125, 'increase'), 125);
  });

  it('converts font scale percentage to accurate root pixel sizes', () => {
    assert.equal(fontScaleToRootPx(90), 14.4);
    assert.equal(fontScaleToRootPx(100), 16);
    assert.equal(fontScaleToRootPx(112), 17.92);
    assert.equal(fontScaleToRootPx(125), 20);
  });

  it('sanitizes corrupt or partial stored settings safely', () => {
    assert.deepEqual(sanitizeA11ySettings(null), DEFAULT_A11Y_SETTINGS);
    assert.deepEqual(sanitizeA11ySettings({ fontScale: 999, narratorEnabled: 1 }), {
      fontScale: 100,
      narratorEnabled: true,
      highContrast: false,
    });
    assert.deepEqual(
      sanitizeA11ySettings({ fontScale: 125, narratorEnabled: true, highContrast: true }),
      {
        fontScale: 125,
        narratorEnabled: true,
        highContrast: true,
      }
    );
  });

  it('counts active accessibility adjustments accurately', () => {
    assert.equal(countActiveA11yFeatures(DEFAULT_A11Y_SETTINGS), 0);
    assert.equal(
      countActiveA11yFeatures({ fontScale: 112, narratorEnabled: false, highContrast: false }),
      1
    );
    assert.equal(
      countActiveA11yFeatures({ fontScale: 125, narratorEnabled: true, highContrast: true }),
      3
    );
  });

  it('extracts and normalizes readable speech text with safe truncation', () => {
    assert.equal(
      extractReadableSpeechText('  Tutup menu  ', 'X'),
      'Tutup menu'
    );
    assert.equal(
      extractReadableSpeechText('', '  Kendalikan   Siklus\nKonten PR  '),
      'Kendalikan Siklus Konten PR'
    );
    assert.equal(
      extractReadableSpeechText('', '', 'Masukkan email agensi'),
      'Masukkan email agensi'
    );
    const longText = 'A'.repeat(400);
    const spoken = extractReadableSpeechText('', longText, '', 120);
    assert.equal(spoken.length, 120);
    assert.ok(spoken.endsWith('…'));
  });
});
