/**
 * Pure configuration, state sanitization, and speech text helpers
 * for the floating Accessibility Menu (font scale, narrator mode, high contrast).
 */

export const FONT_SCALE_STEPS = [90, 100, 112, 125] as const;

export type FontScalePercent = (typeof FONT_SCALE_STEPS)[number];

export const FONT_SCALE_LABELS: Record<FontScalePercent, string> = {
  90: 'Kecil',
  100: 'Normal',
  112: 'Besar',
  125: 'Ekstra Besar',
};

export interface AccessibilitySettings {
  fontScale: FontScalePercent;
  narratorEnabled: boolean;
  highContrast: boolean;
}

export const DEFAULT_A11Y_SETTINGS: AccessibilitySettings = {
  fontScale: 100,
  narratorEnabled: false,
  highContrast: false,
};

export const A11Y_STORAGE_KEY = 'prflow_a11y_settings_v1';

export function isValidFontScale(value: unknown): value is FontScalePercent {
  return (
    typeof value === 'number' &&
    (FONT_SCALE_STEPS as readonly number[]).includes(value)
  );
}

export function stepFontScale(
  current: FontScalePercent,
  direction: 'increase' | 'decrease'
): FontScalePercent {
  const index = FONT_SCALE_STEPS.indexOf(current);
  const safeIndex = index === -1 ? 1 : index;
  if (direction === 'increase') {
    return FONT_SCALE_STEPS[Math.min(FONT_SCALE_STEPS.length - 1, safeIndex + 1)];
  }
  return FONT_SCALE_STEPS[Math.max(0, safeIndex - 1)];
}

export function fontScaleToRootPx(scale: FontScalePercent): number {
  return Number(((16 * scale) / 100).toFixed(2));
}

export function sanitizeA11ySettings(raw: unknown): AccessibilitySettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_A11Y_SETTINGS };
  }
  const obj = raw as Record<string, unknown>;
  return {
    fontScale: isValidFontScale(obj.fontScale)
      ? obj.fontScale
      : DEFAULT_A11Y_SETTINGS.fontScale,
    narratorEnabled: Boolean(obj.narratorEnabled),
    highContrast: Boolean(obj.highContrast),
  };
}

export function countActiveA11yFeatures(settings: AccessibilitySettings): number {
  let count = 0;
  if (settings.fontScale !== DEFAULT_A11Y_SETTINGS.fontScale) count += 1;
  if (settings.narratorEnabled) count += 1;
  if (settings.highContrast) count += 1;
  return count;
}

export function extractReadableSpeechText(
  ariaLabel?: string | null,
  textContent?: string | null,
  placeholder?: string | null,
  maxLength = 320
): string {
  const candidate =
    (ariaLabel && ariaLabel.trim()) ||
    (textContent && textContent.trim()) ||
    (placeholder && placeholder.trim()) ||
    '';

  const normalized = candidate.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}
