import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_ABOUT_INFO,
  DEFAULT_WORKSPACE_PREFERENCES,
  countCustomizedWorkspacePreferences,
  resolveInitialWorkspaceView,
  sanitizeWorkspacePreferences,
} from './workspaceSettings';

describe('workspaceSettings pure helpers & About metadata', () => {
  it('returns default preferences for null or invalid stored payloads', () => {
    assert.deepEqual(sanitizeWorkspacePreferences(null), DEFAULT_WORKSPACE_PREFERENCES);
    assert.deepEqual(
      sanitizeWorkspacePreferences({
        density: 'giant',
        defaultView: 'unknown_view',
        ambientBlobs: 'yes',
      }),
      DEFAULT_WORKSPACE_PREFERENCES
    );
  });

  it('preserves valid custom preferences and resolves initial workspace view', () => {
    const custom = sanitizeWorkspacePreferences({
      density: 'compact',
      defaultView: 'phase3',
      ambientBlobs: false,
      showPhaseCounters: false,
      showOnboardingGuide: false,
      autoConflictAlerts: true,
      toastNotifications: false,
    });
    assert.equal(custom.density, 'compact');
    assert.equal(custom.defaultView, 'phase3');
    assert.equal(custom.ambientBlobs, false);
    assert.equal(custom.showPhaseCounters, false);
    assert.equal(custom.toastNotifications, false);
    assert.equal(resolveInitialWorkspaceView(custom), 'phase3');
    assert.equal(countCustomizedWorkspacePreferences(custom), 6);
  });

  it('exposes accurate About metadata for v1.0 Alpha by A. Farisy built with Google AI Studio', () => {
    assert.equal(APP_ABOUT_INFO.version, '1.0');
    assert.equal(APP_ABOUT_INFO.releaseStage, 'Versi Alpha');
    assert.equal(APP_ABOUT_INFO.builtWith, 'Google AI Studio');
    assert.equal(APP_ABOUT_INFO.developer, 'A. Farisy');
  });
});
