import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArchiveView } from './components/ArchiveView';
import { AssetsView } from './components/AssetsView';
import { CampaignsTeamView } from './components/CampaignsTeamView';
import { ContentDetailDrawer } from './components/ContentDetailDrawer';
import { DashboardView } from './components/DashboardView';
import { LandingPage } from './components/LandingPage';
import {
  AssetModal,
  CampaignModal,
  ConfirmModal,
  NewContentModal,
  RevisionModal,
  ToastStack,
  UserModal,
} from './components/Modals';
import { Phase1View } from './components/Phase1View';
import { Phase2View } from './components/Phase2View';
import { Phase3View } from './components/Phase3View';
import { Phase4View } from './components/Phase4View';
import { Phase5View } from './components/Phase5View';
import { SettingsView } from './components/SettingsView';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import {
  AUTH_SESSION_KEY,
  authenticateAgencyAccount,
  detectScheduleConflicts,
  filterContents,
  REGISTERED_ACCOUNTS_KEY,
  registerAgencyAccount,
  THEME_STORAGE_KEY,
} from './lib/prflowLogic';
import { runWithViewTransition } from './lib/loginTransition';
import { usePRFlowStore } from './store/usePRFlowStore';
import type {
  AgencySession,
  ContentItem,
  KanbanStageId,
  NavView,
  PhaseNumber,
  RegisteredAgencyAccount,
} from './types/prflow';
import { KANBAN_STAGES } from './types/prflow';

interface ConfirmState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

function getInitialDarkTheme(): boolean {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
  } catch {
    // Ignore storage read failure
  }
  return false;
}

function loadRegisteredAccounts(): RegisteredAgencyAccount[] {
  try {
    const raw = localStorage.getItem(REGISTERED_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (acc): acc is RegisteredAgencyAccount =>
          Boolean(acc && typeof acc === 'object' && acc.email && acc.workspaceId && acc.password)
      );
    }
  } catch {
    // Ignore storage parse error
  }
  return [];
}

function loadInitialSession(): AgencySession | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY) || sessionStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.email && parsed.workspaceId) {
      return parsed as AgencySession;
    }
  } catch {
    // Ignore storage parse error
  }
  return null;
}

export default function App() {
  const store = usePRFlowStore();
  const [registeredAccounts, setRegisteredAccounts] =
    useState<RegisteredAgencyAccount[]>(loadRegisteredAccounts);
  const [session, setSession] = useState<AgencySession | null>(loadInitialSession);
  const [surfaceView, setSurfaceView] = useState<'landing' | 'workspace'>(() =>
    loadInitialSession() ? 'workspace' : 'landing'
  );

  const [currentView, setCurrentView] = useState<NavView>('dashboard');
  const [workspaceJustEntered, setWorkspaceJustEntered] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('ALL');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(getInitialDarkTheme);

  // Drawer state
  const [drawerContentId, setDrawerContentId] = useState<string | null>(null);
  const [drawerInitialTab, setDrawerInitialTab] = useState<number>(1);

  // Modals state
  const [newContentOpen, setNewContentOpen] = useState(false);
  const [newContentPhase, setNewContentPhase] = useState<PhaseNumber>(1);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [assetDefaultContentId, setAssetDefaultContentId] = useState('');
  const [revisionContentId, setRevisionContentId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync Tailwind v4 dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.classList.toggle('light', !isDark);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {
      // Ignore storage error
    }
  }, [isDark]);

  // Persist registered agency accounts
  useEffect(() => {
    try {
      localStorage.setItem(REGISTERED_ACCOUNTS_KEY, JSON.stringify(registeredAccounts));
    } catch {
      // Ignore storage error
    }
  }, [registeredAccounts]);

  // Global keyboard shortcuts (Ctrl/Cmd+K & Escape)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        if (session && surfaceView === 'workspace') {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
      if (e.key === 'Escape') {
        setNotifOpen(false);
        setConfirmState((prev) => ({ ...prev, open: false }));
        setRevisionContentId(null);
        setAssetModalOpen(false);
        setUserModalOpen(false);
        setCampaignModalOpen(false);
        setNewContentOpen(false);
        setDrawerContentId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [session, surfaceView]);

  const filteredContents = useMemo(
    () =>
      filterContents(
        store.db.contents,
        store.db.campaigns,
        store.db.users,
        searchQuery,
        campaignFilter
      ),
    [store.db.contents, store.db.campaigns, store.db.users, searchQuery, campaignFilter]
  );

  const { conflicts, conflictedContentIds } = useMemo(
    () => detectScheduleConflicts(store.db.contents, store.db.users),
    [store.db.contents, store.db.users]
  );

  const openConfirm = (
    title: string,
    description: string,
    onConfirm: () => void,
    confirmLabel = 'Ya, Hapus'
  ) => {
    setConfirmState({ open: true, title, description, confirmLabel, onConfirm });
  };

  const writeSessionStorage = (nextSession: AgencySession, remember: boolean) => {
    try {
      if (remember) {
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(nextSession));
        sessionStorage.removeItem(AUTH_SESSION_KEY);
      } else {
        sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(nextSession));
        localStorage.removeItem(AUTH_SESSION_KEY);
      }
    } catch {
      // Ignore storage error
    }
  };

  const persistSession = (nextSession: AgencySession, remember: boolean) => {
    setSession(nextSession);
    writeSessionStorage(nextSession, remember);
  };

  const handleRegisterAgency = (input: {
    name: string;
    workspaceId: string;
    role: string;
    email: string;
    password: string;
  }): { error?: string } => {
    const result = registerAgencyAccount(registeredAccounts, input);
    if (result.error || !result.account) {
      return { error: result.error || 'Gagal mendaftarkan akun agensi.' };
    }
    const created = result.account;
    setRegisteredAccounts((prev) => [...prev, created]);
    const nextSession: AgencySession = {
      workspaceId: created.workspaceId,
      email: created.email,
      name: created.name,
      role: created.role,
      loginAt: new Date().toISOString(),
    };
    persistSession(nextSession, true);
    setCurrentView('dashboard');
    setSurfaceView('workspace');
    store.pushToast(
      'success',
      'Workspace Agensi Siap',
      `Selamat datang, ${created.name} (${created.workspaceId}). Mulai tambahkan tim, kampanye, dan konten PR Anda.`
    );
    return {};
  };

  // Validasi kredensial & simpan sesi ke storage terlebih dahulu (menghormati opsi "Ingat sesi saya")
  // tanpa langsung pindah halaman agar animasi sukses 3 tahap dapat diputar penuh.
  const handleLoginAgency = (input: {
    workspaceId: string;
    email: string;
    password: string;
    roleOverride?: string;
    remember: boolean;
  }): { error?: string; session?: AgencySession } => {
    const result = authenticateAgencyAccount(registeredAccounts, {
      workspaceId: input.workspaceId,
      email: input.email,
      password: input.password,
      roleOverride: input.roleOverride,
    });
    if (result.error || !result.session) {
      return { error: result.error || 'Kredensial tidak valid.' };
    }
    writeSessionStorage(result.session, input.remember);
    return { session: result.session };
  };

  // Dipanggil tepat di akhir Tahap 3 animasi login untuk berpindah ke dashboard via View Transitions API
  const handleCompleteLoginTransition = (validatedSession: AgencySession) => {
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    runWithViewTransition(() => {
      setSession(validatedSession);
      setCurrentView('dashboard');
      setSurfaceView('workspace');
      setWorkspaceJustEntered(true);
    }, reducedMotion);

    window.setTimeout(() => {
      setWorkspaceJustEntered(false);
    }, 950);

    store.pushToast(
      'success',
      'Berhasil Masuk Workspace',
      `Sesi aktif sebagai ${validatedSession.name} (${validatedSession.role}) pada ${validatedSession.workspaceId}.`
    );
  };

  const handleRequestLogout = () => {
    openConfirm(
      'Keluar dari Workspace?',
      'Sesi akun agensi Anda akan diakhiri dan Anda akan kembali ke Halaman Depan. Data workspace lokal Anda tetap aman tersimpan di browser.',
      () => {
        setSession(null);
        setSurfaceView('landing');
        setDrawerContentId(null);
        setMobileSidebarOpen(false);
        setNotifOpen(false);
        try {
          localStorage.removeItem(AUTH_SESSION_KEY);
          sessionStorage.removeItem(AUTH_SESSION_KEY);
        } catch {
          // Ignore storage error
        }
        setConfirmState((prev) => ({ ...prev, open: false }));
        store.pushToast(
          'info',
          'Sesi Diakhiri',
          'Anda telah keluar dari PRFlow Workspace.'
        );
      },
      'Ya, Keluar'
    );
  };

  const handleEnterWorkspace = () => {
    if (!session) return;
    setSurfaceView('workspace');
  };

  const handleOpenLanding = () => {
    setMobileSidebarOpen(false);
    setDrawerContentId(null);
    setSurfaceView('landing');
  };

  const handleNavigate = (view: NavView) => {
    setCurrentView(view);
    setMobileSidebarOpen(false);
  };

  const handleOpenDrawer = (contentId: string, phase: PhaseNumber = 1) => {
    setDrawerContentId(contentId);
    setDrawerInitialTab(phase);
  };

  const handleOpenNewContent = (phase: PhaseNumber = 1) => {
    setNewContentPhase(phase);
    setNewContentOpen(true);
  };

  const handleCreateContent = (payload: Omit<ContentItem, 'id'>) => {
    const created = store.createContent(payload);
    setNewContentOpen(false);
    handleOpenDrawer(created.id, created.phase);
  };

  const handleSaveDrawerDraft = (updated: ContentItem, showToast: boolean) => {
    store.updateContent(updated.id, () => updated);
    if (showToast) {
      store.pushToast(
        'success',
        'Perubahan Disimpan',
        'Seluruh modul (kalender, dashboard, grafik) telah diperbarui.'
      );
    }
  };

  const handleMoveKanbanStage = (contentId: string, stage: KanbanStageId) => {
    const item = store.db.contents.find((c) => c.id === contentId);
    if (!item) return;
    const stageMeta = KANBAN_STAGES.find((s) => s.id === stage);
    store.updateContent(contentId, (c) => ({
      ...c,
      phase: 3,
      production: { ...c.production, stage },
    }));
    store.pushToast(
      'info',
      'Status Kanban Diperbarui',
      `"${item.title}" dipindahkan ke ${stageMeta?.label || stage}.`
    );
  };

  const handleCloneToNextCycle = (contentId: string) => {
    const created = store.cloneToNextCycle(contentId);
    if (created) {
      setCurrentView('phase1');
      handleOpenDrawer(created.id, 1);
    }
  };

  const showLanding = !session || surfaceView === 'landing';

  return (
    <>
      {showLanding ? (
        <LandingPage
          session={session}
          registeredAccounts={registeredAccounts}
          isDark={isDark}
          onToggleTheme={() => setIsDark((prev) => !prev)}
          onRegister={handleRegisterAgency}
          onLogin={handleLoginAgency}
          onCompleteLoginTransition={handleCompleteLoginTransition}
          onEnterWorkspace={handleEnterWorkspace}
          onRequestLogout={handleRequestLogout}
          onNotify={store.pushToast}
        />
      ) : (
        <div
          className={`workspace-shell relative flex h-screen overflow-hidden bg-gradient-to-br from-[#9EC7DA] via-[#B1CEE0] to-[#C6D0DC] dark:from-[#040B14] dark:via-[#071422] dark:to-[#0C1320] text-slate-900 dark:text-slate-100 ${
            workspaceJustEntered ? 'ws-entering' : ''
          }`}
        >
          {/* Subtle Ambient Brand Color Blobs (Tosca, Cyan, Warm Orange) matching Landing Page */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden z-0"
          >
            <div
              className="absolute -top-28 -left-20 w-[440px] h-[440px] rounded-full blur-[115px] opacity-38 dark:opacity-18"
              style={{ background: 'radial-gradient(circle, #2CE59B 0%, rgba(44,229,155,0) 70%)' }}
            />
            <div
              className="absolute top-[16%] -right-24 w-[520px] h-[520px] rounded-full blur-[125px] opacity-38 dark:opacity-20"
              style={{ background: 'radial-gradient(circle, #17B5E8 0%, rgba(23,181,232,0) 70%)' }}
            />
            <div
              className="absolute -bottom-32 left-[28%] w-[480px] h-[480px] rounded-full blur-[130px] opacity-30 dark:opacity-14"
              style={{ background: 'radial-gradient(circle, #F37021 0%, rgba(243,112,33,0) 70%)' }}
            />
          </div>

          <Sidebar
            db={store.db}
            session={session}
            currentView={currentView}
            mobileOpen={mobileSidebarOpen}
            lastSavedTime={store.lastSavedTime}
            onNavigate={handleNavigate}
            onCloseMobile={() => setMobileSidebarOpen(false)}
            onExportCSV={store.exportCSV}
            onExportJSON={store.exportJSON}
            onOpenLanding={handleOpenLanding}
            onRequestLogout={handleRequestLogout}
          />

          <div className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden">
            <TopBar
              searchQuery={searchQuery}
              campaignFilter={campaignFilter}
              campaigns={store.db.campaigns}
              totalContentCount={store.db.contents.length}
              notifications={store.db.notifications}
              notifOpen={notifOpen}
              isDark={isDark}
              searchInputRef={searchInputRef}
              onSearchChange={setSearchQuery}
              onCampaignFilterChange={setCampaignFilter}
              onToggleNotif={() => setNotifOpen((prev) => !prev)}
              onCloseNotif={() => setNotifOpen(false)}
              onMarkAllRead={store.markAllNotificationsRead}
              onToggleTheme={() => setIsDark((prev) => !prev)}
              onOpenNewContent={() => handleOpenNewContent(1)}
              onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
            />

            <main className="flex-1 overflow-y-auto p-4 lg:p-6">
              <div className="max-w-[1400px] mx-auto">
                {currentView === 'dashboard' && (
                  <DashboardView
                    db={store.db}
                    filteredContents={filteredContents}
                    conflicts={conflicts}
                    conflictedContentIds={conflictedContentIds}
                    onNavigate={handleNavigate}
                    onOpenDrawer={handleOpenDrawer}
                    onOpenNewContent={() => handleOpenNewContent(1)}
                    onOpenNewCampaign={() => setCampaignModalOpen(true)}
                    onOpenNewUser={() => setUserModalOpen(true)}
                  />
                )}

                {currentView === 'phase1' && (
                  <Phase1View
                    db={store.db}
                    filteredContents={filteredContents}
                    onOpenNewContent={handleOpenNewContent}
                    onOpenDrawer={handleOpenDrawer}
                    onAdvancePhase={store.advancePhase}
                  />
                )}

                {currentView === 'phase2' && (
                  <Phase2View
                    db={store.db}
                    filteredContents={filteredContents}
                    conflicts={conflicts}
                    conflictedContentIds={conflictedContentIds}
                    onOpenDrawer={handleOpenDrawer}
                    onAdvancePhase={store.advancePhase}
                    onMarkGcalSynced={store.markGcalSynced}
                    onDownloadICS={store.downloadICS}
                    onGenerateDriveFolders={store.generateDriveFolders}
                  />
                )}

                {currentView === 'phase3' && (
                  <Phase3View
                    db={store.db}
                    filteredContents={filteredContents}
                    onOpenNewContent={handleOpenNewContent}
                    onOpenDrawer={handleOpenDrawer}
                    onMoveStage={handleMoveKanbanStage}
                    onApproveItem={store.approveKanbanItem}
                    onOpenRevisionModal={(id) => setRevisionContentId(id)}
                    onAdvancePhase={store.advancePhase}
                  />
                )}

                {currentView === 'phase4' && (
                  <Phase4View
                    filteredContents={filteredContents}
                    onOpenDrawer={handleOpenDrawer}
                    onPublishNow={store.publishContentNow}
                    onUpdateResponseStatus={(id, status) => {
                      store.updateContent(id, (c) => ({
                        ...c,
                        distribution: { ...c.distribution, responseStatus: status },
                      }));
                      store.pushToast(
                        'info',
                        'Status Respon Diperbarui',
                        `Community management: "${status}".`
                      );
                    }}
                    onAdvancePhase={store.advancePhase}
                  />
                )}

                {currentView === 'phase5' && (
                  <Phase5View
                    filteredContents={filteredContents}
                    isDark={isDark}
                    onExportCSV={store.exportCSV}
                    onUpdateAuditCause={(id, cause) => {
                      store.updateContent(id, (c) => ({
                        ...c,
                        evaluation: { ...c.evaluation, auditCause: cause },
                      }));
                    }}
                    onTriggerOptimization={store.triggerOptimizationAction}
                    onArchiveLearning={store.archiveLearning}
                    onCloneToNextCycle={handleCloneToNextCycle}
                  />
                )}

                {currentView === 'campaigns' && (
                  <CampaignsTeamView
                    db={store.db}
                    conflicts={conflicts}
                    onOpenCampaignModal={() => setCampaignModalOpen(true)}
                    onOpenUserModal={() => setUserModalOpen(true)}
                    onConfirmDeleteCampaign={(id, name) =>
                      openConfirm(
                        'Hapus Kampanye?',
                        `Proyek kampanye "${name}" akan dihapus dari daftar kampanye aktif.`,
                        () => {
                          store.deleteCampaign(id);
                          if (campaignFilter === id) setCampaignFilter('ALL');
                          setConfirmState((p) => ({ ...p, open: false }));
                        }
                      )
                    }
                    onConfirmDeleteUser={(id, name) =>
                      openConfirm(
                        'Hapus Anggota Tim?',
                        `${name} akan dihapus dari direktori tim serta seluruh penugasan jadwal take.`,
                        () => {
                          store.deleteUser(id);
                          setConfirmState((p) => ({ ...p, open: false }));
                        }
                      )
                    }
                  />
                )}

                {currentView === 'assets' && (
                  <AssetsView
                    db={store.db}
                    searchQuery={searchQuery}
                    onOpenAssetModal={(cid) => {
                      setAssetDefaultContentId(cid || '');
                      setAssetModalOpen(true);
                    }}
                    onOpenDrawer={handleOpenDrawer}
                    onDeleteAsset={store.deleteAsset}
                  />
                )}

                {currentView === 'archive' && (
                  <ArchiveView archives={store.db.archives} searchQuery={searchQuery} />
                )}

                {currentView === 'settings' && (
                  <SettingsView
                    integrations={store.db.integrations}
                    onSaveIntegrations={store.updateIntegrations}
                    onTestWebhook={store.testWebhook}
                    onExportJSON={store.exportJSON}
                    onImportJSONText={store.importJSONText}
                    onExportCSV={store.exportCSV}
                    onConfirmResetSeed={() =>
                      openConfirm(
                        'Kosongkan Workspace?',
                        'Seluruh data kampanye, anggota tim, konten PR, aset digital, dan arsip pembelajaran lokal akan dihapus menjadi workspace kosong baru.',
                        () => {
                          store.resetWorkspaceToEmpty();
                          setDrawerContentId(null);
                          setCampaignFilter('ALL');
                          setSearchQuery('');
                          setConfirmState((p) => ({ ...p, open: false }));
                        },
                        'Ya, Kosongkan'
                      )
                    }
                  />
                )}
              </div>
            </main>
          </div>

          {/* Slide-Over Detail Drawer */}
          <ContentDetailDrawer
            db={store.db}
            contentId={drawerContentId}
            initialTab={drawerInitialTab}
            onClose={() => setDrawerContentId(null)}
            onSaveDraft={handleSaveDrawerDraft}
            onAdvancePhase={store.advancePhase}
            onApproveKanban={store.approveKanbanItem}
            onOpenRevisionModal={(id) => setRevisionContentId(id)}
            onOpenAssetModal={(cid) => {
              setAssetDefaultContentId(cid);
              setAssetModalOpen(true);
            }}
            onDeleteAsset={store.deleteAsset}
            onConfirmDeleteContent={(id, title) =>
              openConfirm(
                'Hapus Konten PR?',
                `Konten "${title}" beserta tautan aset digitalnya akan dihapus permanen.`,
                () => {
                  store.deleteContent(id);
                  setDrawerContentId(null);
                  setConfirmState((p) => ({ ...p, open: false }));
                }
              )
            }
            onMarkGcalSynced={store.markGcalSynced}
            onDownloadICS={store.downloadICS}
            onGenerateDriveFolders={store.generateDriveFolders}
          />

          {/* Modals */}
          <NewContentModal
            open={newContentOpen}
            defaultPhase={newContentPhase}
            campaigns={store.db.campaigns}
            users={store.db.users}
            onClose={() => setNewContentOpen(false)}
            onSubmit={handleCreateContent}
          />

          <CampaignModal
            open={campaignModalOpen}
            onClose={() => setCampaignModalOpen(false)}
            onSubmit={store.createCampaign}
          />

          <UserModal
            open={userModalOpen}
            onClose={() => setUserModalOpen(false)}
            onSubmit={store.createUser}
          />

          <AssetModal
            open={assetModalOpen}
            defaultContentId={assetDefaultContentId}
            contents={store.db.contents}
            users={store.db.users}
            defaultDriveUrl={store.db.integrations.gdriveRootUrl}
            onClose={() => setAssetModalOpen(false)}
            onSubmit={store.createAsset}
          />

          <RevisionModal
            open={revisionContentId !== null}
            onClose={() => setRevisionContentId(null)}
            onSubmit={(note) => {
              if (revisionContentId) {
                store.requestRevision(revisionContentId, note);
              }
            }}
          />
        </div>
      )}

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        onCancel={() => setConfirmState((prev) => ({ ...prev, open: false }))}
        onConfirm={confirmState.onConfirm}
      />

      <ToastStack toasts={store.toasts} onDismiss={store.dismissToast} />
    </>
  );
}
