import type { NavView } from '../types/prflow';

export type WorkspaceDensity = 'comfortable' | 'compact';

export type WorkspaceStartView =
  | 'dashboard'
  | 'phase1'
  | 'phase2'
  | 'phase3'
  | 'phase4'
  | 'phase5';

export interface WorkspacePreferences {
  density: WorkspaceDensity;
  defaultView: WorkspaceStartView;
  ambientBlobs: boolean;
  showPhaseCounters: boolean;
  showOnboardingGuide: boolean;
  autoConflictAlerts: boolean;
  toastNotifications: boolean;
  hideOnlineStatus: boolean;
}

export const WORKSPACE_PREFS_STORAGE_KEY = 'prflow_workspace_prefs_v1';

export const ALLOWED_START_VIEWS: readonly WorkspaceStartView[] = [
  'dashboard',
  'phase1',
  'phase2',
  'phase3',
  'phase4',
  'phase5',
] as const;

export const START_VIEW_OPTIONS: Array<{ value: WorkspaceStartView; label: string }> = [
  { value: 'dashboard', label: 'Dashboard & Pipeline PR' },
  { value: 'phase1', label: '1. Riset & Strategi PESO' },
  { value: 'phase2', label: '2. Planner & Kalender Kru' },
  { value: 'phase3', label: '3. Produksi & Kanban QC' },
  { value: 'phase4', label: '4. Distribusi & Monitor Sentimen' },
  { value: 'phase5', label: '5. Evaluasi KPI & Krisis' },
];

export const DEFAULT_WORKSPACE_PREFERENCES: WorkspacePreferences = {
  density: 'comfortable',
  defaultView: 'dashboard',
  ambientBlobs: true,
  showPhaseCounters: true,
  showOnboardingGuide: true,
  autoConflictAlerts: true,
  toastNotifications: true,
  hideOnlineStatus: false,
};

export const APP_ABOUT_INFO = {
  appName: 'PRFlow Workspace Pro',
  version: '1.0',
  releaseStage: 'Versi Alpha',
  versionLabel: 'Versi 1.0 (Versi Alpha)',
  builtWith: 'Google AI Studio',
  developer: 'A. Farisy',
  buildYear: '2026',
  summary:
    'Platform manajemen konten PR 5-fase dan repositori aset digital (DAM) untuk agensi PR serta tim komunikasi korporasi. Dirancang untuk menyatukan riset audiens dan PESO, kalender produksi dengan detektor bentrok jadwal kru otomatis, papan Kanban QC Brand Safety, distribusi multi-kanal, hingga evaluasi KPI dalam satu ruang kerja terpadu.',
  releaseNote:
    'Rilis Alpha v1.0 beroperasi sebagai ruang kerja bersih (tanpa data demo) dengan penyimpanan lokal browser, dukungan backup/restore JSON & CSV, menu aksesibilitas inklusif, serta preferensi tampilan yang dapat disesuaikan dengan kebiasaan kerja tim Anda.',
  techStack: 'React 19 · TypeScript · Tailwind CSS',
  storageMode: 'Lokal Browser (LocalStorage · Backup JSON/CSV)',
} as const;

export function isWorkspaceStartView(value: unknown): value is WorkspaceStartView {
  return (
    typeof value === 'string' &&
    (ALLOWED_START_VIEWS as readonly string[]).includes(value)
  );
}

export function sanitizeWorkspacePreferences(raw: unknown): WorkspacePreferences {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_WORKSPACE_PREFERENCES };
  }
  const obj = raw as Record<string, unknown>;
  return {
    density: obj.density === 'compact' ? 'compact' : 'comfortable',
    defaultView: isWorkspaceStartView(obj.defaultView)
      ? obj.defaultView
      : DEFAULT_WORKSPACE_PREFERENCES.defaultView,
    ambientBlobs:
      typeof obj.ambientBlobs === 'boolean'
        ? obj.ambientBlobs
        : DEFAULT_WORKSPACE_PREFERENCES.ambientBlobs,
    showPhaseCounters:
      typeof obj.showPhaseCounters === 'boolean'
        ? obj.showPhaseCounters
        : DEFAULT_WORKSPACE_PREFERENCES.showPhaseCounters,
    showOnboardingGuide:
      typeof obj.showOnboardingGuide === 'boolean'
        ? obj.showOnboardingGuide
        : DEFAULT_WORKSPACE_PREFERENCES.showOnboardingGuide,
    autoConflictAlerts:
      typeof obj.autoConflictAlerts === 'boolean'
        ? obj.autoConflictAlerts
        : DEFAULT_WORKSPACE_PREFERENCES.autoConflictAlerts,
    toastNotifications:
      typeof obj.toastNotifications === 'boolean'
        ? obj.toastNotifications
        : DEFAULT_WORKSPACE_PREFERENCES.toastNotifications,
    hideOnlineStatus:
      typeof obj.hideOnlineStatus === 'boolean'
        ? obj.hideOnlineStatus
        : DEFAULT_WORKSPACE_PREFERENCES.hideOnlineStatus,
  };
}

export function resolveInitialWorkspaceView(prefs: WorkspacePreferences): NavView {
  return isWorkspaceStartView(prefs.defaultView) ? prefs.defaultView : 'dashboard';
}

export function countCustomizedWorkspacePreferences(
  prefs: WorkspacePreferences
): number {
  let count = 0;
  if (prefs.density !== DEFAULT_WORKSPACE_PREFERENCES.density) count += 1;
  if (prefs.defaultView !== DEFAULT_WORKSPACE_PREFERENCES.defaultView) count += 1;
  if (prefs.ambientBlobs !== DEFAULT_WORKSPACE_PREFERENCES.ambientBlobs) count += 1;
  if (prefs.showPhaseCounters !== DEFAULT_WORKSPACE_PREFERENCES.showPhaseCounters) count += 1;
  if (prefs.showOnboardingGuide !== DEFAULT_WORKSPACE_PREFERENCES.showOnboardingGuide) count += 1;
  if (prefs.autoConflictAlerts !== DEFAULT_WORKSPACE_PREFERENCES.autoConflictAlerts) count += 1;
  if (prefs.toastNotifications !== DEFAULT_WORKSPACE_PREFERENCES.toastNotifications) count += 1;
  if (prefs.hideOnlineStatus !== DEFAULT_WORKSPACE_PREFERENCES.hideOnlineStatus) count += 1;
  return count;
}
