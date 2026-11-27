import { useCallback, useEffect, useState } from 'react';
import {
  createEmptyDatabase,
  DB_STORAGE_KEY,
  generateCSVContent,
  generateICSContent,
  uid,
  validateImportDatabase,
} from '../lib/prflowLogic';
import type {
  ArchiveEntry,
  Campaign,
  ContentItem,
  DigitalAsset,
  IntegrationSettings,
  NotificationKind,
  PhaseNumber,
  PRFlowDatabase,
  TeamUser,
  ToastMessage,
} from '../types/prflow';
import { PHASE_META } from '../types/prflow';

function loadInitialDatabase(): PRFlowDatabase {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return validateImportDatabase(parsed);
    }
  } catch (err) {
    console.warn('Database load fallback to seed:', err);
  }
  const fresh = createEmptyDatabase();
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(fresh));
  } catch {
    // Ignore quota error in restricted environments
  }
  return fresh;
}

function triggerFileDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function dispatchWebhook(
  eventName: string,
  detail: Record<string, unknown>,
  integrations: IntegrationSettings
) {
  if (!integrations.webhookUrl) return;
  try {
    await fetch(integrations.webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'PRFlow Workspace Pro',
        event: eventName,
        timestamp: new Date().toISOString(),
        data: detail,
      }),
    });
  } catch {
    // Non-blocking best-effort webhook
  }
}

export function usePRFlowStore() {
  const [db, setDb] = useState<PRFlowDatabase>(loadInitialDatabase);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [lastSavedTime, setLastSavedTime] = useState<string>(() =>
    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  );

  const pushToast = useCallback((type: NotificationKind, title: string, message: string) => {
    const id = uid('toast');
    setToasts((prev) => [...prev, { id, type, title, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
      setLastSavedTime(
        new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      );
    } catch (err) {
      console.error('Failed to persist PRFlow database:', err);
    }
  }, [db]);

  const appendNotification = (
    state: PRFlowDatabase,
    type: NotificationKind,
    title: string,
    message: string
  ): PRFlowDatabase => {
    const nextNotification = {
      id: uid('ntf'),
      type,
      title,
      message,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };
    if (state.integrations.webhookAutoTrigger && state.integrations.webhookUrl) {
      void dispatchWebhook(title, { type, message }, state.integrations);
    }
    return {
      ...state,
      notifications: [nextNotification, ...state.notifications].slice(0, 30),
    };
  };

  const createContent = useCallback(
    (payload: Omit<ContentItem, 'id'>): ContentItem => {
      const created: ContentItem = { id: uid('cnt'), ...payload };
      setDb((prev) => {
        const next: PRFlowDatabase = {
          ...prev,
          meta: { version: 2, updatedAt: new Date().toISOString() },
          contents: [created, ...prev.contents],
        };
        return appendNotification(
          next,
          'info',
          'Konten Baru Dibuat',
          `"${created.title}" ditambahkan ke ${PHASE_META[created.phase].short}.`
        );
      });
      pushToast('success', 'Konten Baru Dibuat', `"${created.title}" siap dikelola.`);
      return created;
    },
    [pushToast]
  );

  const updateContent = useCallback((id: string, updater: (item: ContentItem) => ContentItem) => {
    setDb((prev) => ({
      ...prev,
      meta: { version: 2, updatedAt: new Date().toISOString() },
      contents: prev.contents.map((item) => (item.id === id ? updater(item) : item)),
    }));
  }, []);

  const deleteContent = useCallback(
    (id: string) => {
      setDb((prev) => ({
        ...prev,
        meta: { version: 2, updatedAt: new Date().toISOString() },
        contents: prev.contents.filter((c) => c.id !== id),
        assets: prev.assets.filter((a) => a.contentId !== id),
      }));
      pushToast('info', 'Konten Dihapus', 'Item konten beserta tautan asetnya telah dihapus.');
    },
    [pushToast]
  );

  const advancePhase = useCallback(
    (id: string, targetPhase: PhaseNumber) => {
      let targetTitle = '';
      setDb((prev) => {
        const found = prev.contents.find((c) => c.id === id);
        if (!found) return prev;
        targetTitle = found.title;
        return {
          ...prev,
          meta: { version: 2, updatedAt: new Date().toISOString() },
          contents: prev.contents.map((c) => (c.id === id ? { ...c, phase: targetPhase } : c)),
        };
      });
      if (targetTitle) {
        pushToast(
          'success',
          `Berpindah ke Fase ${targetPhase}`,
          `"${targetTitle}" masuk ke ${PHASE_META[targetPhase].name}.`
        );
      }
    },
    [pushToast]
  );

  const approveKanbanItem = useCallback(
    (id: string) => {
      setDb((prev) => {
        const item = prev.contents.find((c) => c.id === id);
        if (!item) return prev;
        if (item.production.stage === 'qc_safety') {
          const updated: PRFlowDatabase = {
            ...prev,
            meta: { version: 2, updatedAt: new Date().toISOString() },
            contents: prev.contents.map((c) =>
              c.id === id
                ? {
                    ...c,
                    production: {
                      ...c.production,
                      stage: 'approval',
                      qcChecklist: {
                        visualAudio: true,
                        tonePR: true,
                        brandSafety: true,
                        akurasiData: true,
                      },
                    },
                  }
                : c
            ),
          };
          return appendNotification(
            updated,
            'info',
            'Lolos QC Brand Safety',
            `"${item.title}" masuk Final Approval Klien.`
          );
        }
        const updated: PRFlowDatabase = {
          ...prev,
          meta: { version: 2, updatedAt: new Date().toISOString() },
          contents: prev.contents.map((c) =>
            c.id === id
              ? { ...c, production: { ...c.production, stage: 'siap_tayang' } }
              : c
          ),
        };
        return appendNotification(
          updated,
          'success',
          'Final Approval Disetujui',
          `"${item.title}" siap tayang ke Fase 4 Distribusi.`
        );
      });
      pushToast('success', 'Tahap Disetujui', 'Progres produksi telah diperbarui.');
    },
    [pushToast]
  );

  const requestRevision = useCallback(
    (id: string, note: string) => {
      const nowStr = new Date().toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
      setDb((prev) => {
        const item = prev.contents.find((c) => c.id === id);
        if (!item) return prev;
        const updated: PRFlowDatabase = {
          ...prev,
          meta: { version: 2, updatedAt: new Date().toISOString() },
          contents: prev.contents.map((c) =>
            c.id === id
              ? {
                  ...c,
                  production: {
                    ...c.production,
                    stage: 'editing',
                    revisions: [
                      { date: nowStr, by: 'PR Manager / Klien', note },
                      ...c.production.revisions,
                    ],
                  },
                }
              : c
          ),
        };
        return appendNotification(
          updated,
          'warning',
          'Revisi Diminta',
          `"${item.title}" dikembalikan ke Editing. Catatan: ${note}`
        );
      });
      pushToast('warning', 'Revisi Dikirim', 'Kartu dikembalikan ke kolom Editing & Copywriting.');
    },
    [pushToast]
  );

  const publishContentNow = useCallback(
    (id: string) => {
      setDb((prev) => {
        const item = prev.contents.find((c) => c.id === id);
        if (!item) return prev;
        const hasSentiment =
          item.distribution.sentiment.positive > 0 || item.distribution.sentiment.negative > 0;
        const updated: PRFlowDatabase = {
          ...prev,
          meta: { version: 2, updatedAt: new Date().toISOString() },
          contents: prev.contents.map((c) =>
            c.id === id
              ? {
                  ...c,
                  phase: 4,
                  distribution: {
                    ...c.distribution,
                    published: true,
                    sentiment: hasSentiment
                      ? c.distribution.sentiment
                      : { positive: 74, neutral: 20, negative: 6 },
                    mentions: hasSentiment ? c.distribution.mentions : 95,
                    responseStatus: 'Sedang Ditangani',
                  },
                }
              : c
          ),
        };
        return appendNotification(
          updated,
          'success',
          'Konten Live Multi-Kanal',
          `"${item.title}" resmi dipublikasikan.`
        );
      });
      pushToast('success', 'Publikasi Berhasil Live', 'Monitoring sentimen mulai berjalan.');
    },
    [pushToast]
  );

  const triggerOptimizationAction = useCallback(
    (id: string, actionName: string) => {
      setDb((prev) => {
        const item = prev.contents.find((c) => c.id === id);
        if (!item) return prev;
        const updated: PRFlowDatabase = {
          ...prev,
          meta: { version: 2, updatedAt: new Date().toISOString() },
          contents: prev.contents.map((c) =>
            c.id === id ? { ...c, evaluation: { ...c.evaluation, actionTaken: actionName } } : c
          ),
        };
        return appendNotification(
          updated,
          'info',
          `Aksi Optimasi: ${actionName}`,
          `Diterapkan pada "${item.title}".`
        );
      });
      pushToast('success', `Aksi ${actionName} Aktif`, 'Tersimpan di rencana evaluasi & audit.');
    },
    [pushToast]
  );

  const archiveLearning = useCallback(
    (id: string) => {
      setDb((prev) => {
        const item = prev.contents.find((c) => c.id === id);
        if (!item || item.evaluation.archived) return prev;
        const cmp = prev.campaigns.find((c) => c.id === item.campaignId);
        const pct = Math.round(
          ((Number(item.evaluation.kpiActual) || 0) / (Number(item.research.kpiTarget) || 1)) * 100
        );
        const keyLearning =
          item.evaluation.auditNotes || item.evaluation.actionTaken
            ? `Audit: ${item.evaluation.auditCause || '-'} | Tindakan: ${item.evaluation.actionTaken || '-'} | Catatan: ${item.evaluation.auditNotes || 'Tersimpan sebagai studi kasus.'}`
            : `Strategi ${item.research.peso} (${item.research.funnel}) mencapai KPI optimal dengan sentimen positif ${item.distribution.sentiment.positive}%.`;

        const entry: ArchiveEntry = {
          id: uid('arc'),
          contentId: item.id,
          campaignId: item.campaignId,
          title: item.title,
          campaignName: cmp?.name || 'Tanpa Kampanye',
          peso: item.research.peso,
          funnel: item.research.funnel,
          kpiSummary: `Tercapai ${pct}% (${Number(item.evaluation.kpiActual).toLocaleString('id-ID')} / ${Number(item.research.kpiTarget).toLocaleString('id-ID')})`,
          sentimentPositive: item.distribution.sentiment.positive,
          keyLearning,
          archivedAt: new Date().toISOString().slice(0, 10),
        };

        return {
          ...prev,
          meta: { version: 2, updatedAt: new Date().toISOString() },
          archives: [entry, ...prev.archives],
          contents: prev.contents.map((c) =>
            c.id === id ? { ...c, evaluation: { ...c.evaluation, archived: true } } : c
          ),
        };
      });
      pushToast('success', 'Diarsipkan ke Repositori', 'Insight berhasil disimpan ke Arsip Pembelajaran.');
    },
    [pushToast]
  );

  const cloneToNextCycle = useCallback(
    (id: string): ContentItem | null => {
      const src = db.contents.find((c) => c.id === id);
      if (!src) return null;
      const created = createContent({
        campaignId: src.campaignId,
        ownerId: src.ownerId,
        title: `[Siklus Lanjutan] ${src.title}`,
        phase: 1,
        research: { ...src.research },
        planning: {
          ...src.planning,
          gcalSynced: false,
          gdriveGenerated: false,
          crewIds: [...src.planning.crewIds],
        },
        production: {
          stage: 'pra_produksi',
          preProdChecklist: { kamera: false, audio: false, lighting: false, briefingMeet: false },
          qcChecklist: { visualAudio: false, tonePR: false, brandSafety: false, akurasiData: false },
          revisions: [],
        },
        distribution: {
          channels: [...src.distribution.channels],
          published: false,
          sentiment: { positive: 0, neutral: 0, negative: 0 },
          mentions: 0,
          responseStatus: 'Belum Direspon',
        },
        evaluation: { kpiActual: 0, auditCause: '', auditNotes: '', actionTaken: '', archived: false },
      });
      return created;
    },
    [db.contents, createContent]
  );

  const createCampaign = useCallback(
    (data: Omit<Campaign, 'id'>) => {
      const cmp: Campaign = { id: uid('cmp'), ...data };
      setDb((prev) => {
        const next: PRFlowDatabase = {
          ...prev,
          meta: { version: 2, updatedAt: new Date().toISOString() },
          campaigns: [cmp, ...prev.campaigns],
        };
        return appendNotification(
          next,
          'info',
          'Kampanye Baru',
          `Proyek "${cmp.name}" (${cmp.client}) telah dibuat.`
        );
      });
      pushToast('success', 'Kampanye Ditambahkan', `"${cmp.name}" siap dihubungkan ke konten PR.`);
    },
    [pushToast]
  );

  const deleteCampaign = useCallback(
    (id: string) => {
      setDb((prev) => ({
        ...prev,
        meta: { version: 2, updatedAt: new Date().toISOString() },
        campaigns: prev.campaigns.filter((c) => c.id !== id),
      }));
      pushToast('info', 'Kampanye Dihapus', 'Proyek kampanye telah dihapus dari daftar.');
    },
    [pushToast]
  );

  const createUser = useCallback(
    (data: Omit<TeamUser, 'id'>) => {
      const user: TeamUser = { id: uid('usr'), ...data };
      setDb((prev) => {
        const next: PRFlowDatabase = {
          ...prev,
          meta: { version: 2, updatedAt: new Date().toISOString() },
          users: [...prev.users, user],
        };
        return appendNotification(
          next,
          'info',
          'Anggota Tim Ditambahkan',
          `${user.name} (${user.role}) bergabung ke workspace.`
        );
      });
      pushToast('success', 'Kru Ditambahkan', `${user.name} kini dapat ditugaskan di jadwal take.`);
    },
    [pushToast]
  );

  const deleteUser = useCallback(
    (id: string) => {
      setDb((prev) => ({
        ...prev,
        meta: { version: 2, updatedAt: new Date().toISOString() },
        users: prev.users.filter((u) => u.id !== id),
        contents: prev.contents.map((c) => ({
          ...c,
          planning: {
            ...c.planning,
            crewIds: c.planning.crewIds.filter((uidVal) => uidVal !== id),
          },
        })),
      }));
      pushToast('info', 'Anggota Tim Dihapus', 'Kru telah dihapus dari direktori & jadwal.');
    },
    [pushToast]
  );

  const createAsset = useCallback(
    (data: Omit<DigitalAsset, 'id' | 'createdAt'>) => {
      const asset: DigitalAsset = {
        id: uid('ast'),
        createdAt: new Date().toISOString().slice(0, 10),
        ...data,
      };
      setDb((prev) => ({
        ...prev,
        meta: { version: 2, updatedAt: new Date().toISOString() },
        assets: [asset, ...prev.assets],
      }));
      pushToast('success', 'Aset Ditambahkan', `"${asset.name}" tersimpan di ${asset.folder}.`);
    },
    [pushToast]
  );

  const deleteAsset = useCallback(
    (id: string) => {
      setDb((prev) => ({
        ...prev,
        meta: { version: 2, updatedAt: new Date().toISOString() },
        assets: prev.assets.filter((a) => a.id !== id),
      }));
      pushToast('info', 'Aset Dihapus', 'File dihapus dari repositori DAM.');
    },
    [pushToast]
  );

  const generateDriveFolders = useCallback(
    (contentId: string) => {
      setDb((prev) => {
        const item = prev.contents.find((c) => c.id === contentId);
        if (!item) return prev;
        const hasAssets = prev.assets.some((a) => a.contentId === contentId);
        const newAssets = hasAssets
          ? prev.assets
          : [
              {
                id: uid('ast'),
                contentId,
                folder: '01_Brief' as const,
                name: `Creative_Brief_${item.id}.docx`,
                type: 'Doc' as const,
                url: prev.integrations.gdriveRootUrl || 'https://drive.google.com',
                version: 'v1.0',
                uploadedBy: item.ownerId || 'usr-1',
                createdAt: new Date().toISOString().slice(0, 10),
              },
              ...prev.assets,
            ];
        const next: PRFlowDatabase = {
          ...prev,
          meta: { version: 2, updatedAt: new Date().toISOString() },
          assets: newAssets,
          contents: prev.contents.map((c) =>
            c.id === contentId
              ? { ...c, planning: { ...c.planning, gdriveGenerated: true } }
              : c
          ),
        };
        return appendNotification(
          next,
          'info',
          'Folder Drive & DAM Siap',
          `Struktur folder aset (01_Brief, 02_Raw_Footage, 03_Final_Asset) untuk "${item.title}" aktif.`
        );
      });
      pushToast(
        'success',
        'Google Drive & DAM Tersinkronisasi',
        'Struktur 3 folder aset berhasil diinisialisasi.'
      );
    },
    [pushToast]
  );

  const markGcalSynced = useCallback(
    (contentId: string) => {
      const item = db.contents.find((c) => c.id === contentId);
      updateContent(contentId, (c) => ({
        ...c,
        planning: { ...c.planning, gcalSynced: true },
      }));
      if (item) {
        pushToast(
          'success',
          'Google Calendar Ditautkan',
          `Jadwal take "${item.title}" ditandai tersinkron dengan Google Calendar.`
        );
      }
    },
    [db.contents, updateContent, pushToast]
  );

  const downloadICS = useCallback(
    (contentId: string) => {
      const item = db.contents.find((c) => c.id === contentId);
      if (!item) return;
      const cmp = db.campaigns.find((c) => c.id === item.campaignId);
      const ics = generateICSContent(item, cmp);
      triggerFileDownload(ics, `PRFlow_${item.id}.ics`, 'text/calendar;charset=utf-8;');
      updateContent(contentId, (c) => ({
        ...c,
        planning: { ...c.planning, gcalSynced: true },
      }));
      pushToast(
        'success',
        'File .ICS Diunduh',
        'Buka file .ics untuk impor instan ke Outlook, Apple, atau Google Calendar.'
      );
    },
    [db.contents, db.campaigns, updateContent, pushToast]
  );

  const exportCSV = useCallback(() => {
    const csv = generateCSVContent(db);
    triggerFileDownload(
      csv,
      `PRFlow_Report_${new Date().toISOString().slice(0, 10)}.csv`,
      'text/csv;charset=utf-8;'
    );
    pushToast('success', 'Laporan CSV Diunduh', 'Siap dibuka di Google Sheets atau Microsoft Excel.');
  }, [db, pushToast]);

  const exportJSON = useCallback(() => {
    const json = JSON.stringify(db, null, 2);
    triggerFileDownload(
      json,
      `PRFlow_Backup_DB_${new Date().toISOString().slice(0, 10)}.json`,
      'application/json;charset=utf-8;'
    );
    pushToast(
      'success',
      'Backup JSON Berhasil',
      'Seluruh database relasional telah diunduh.'
    );
  }, [db, pushToast]);

  const importJSONText = useCallback(
    (rawText: string) => {
      try {
        const parsed = JSON.parse(rawText);
        const validated = validateImportDatabase(parsed);
        setDb(validated);
        pushToast(
          'success',
          'Impor Database Berhasil',
          'Seluruh data workspace berhasil dipulihkan dari file JSON.'
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'File rusak atau format tidak sesuai.';
        pushToast('danger', 'Gagal Impor JSON', msg);
      }
    },
    [pushToast]
  );

  const markAllNotificationsRead = useCallback(() => {
    setDb((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  }, []);

  const updateIntegrations = useCallback(
    (patch: Partial<IntegrationSettings>) => {
      setDb((prev) => ({
        ...prev,
        meta: { version: 2, updatedAt: new Date().toISOString() },
        integrations: { ...prev.integrations, ...patch },
      }));
      pushToast('success', 'Pengaturan Disimpan', 'Konfigurasi integrasi berhasil diperbarui.');
    },
    [pushToast]
  );

  const testWebhook = useCallback(async () => {
    if (!db.integrations.webhookUrl) {
      pushToast(
        'warning',
        'Webhook Belum Diisi',
        'Masukkan URL Webhook (Slack, Discord, n8n, atau Make) terlebih dahulu.'
      );
      return;
    }
    await dispatchWebhook(
      'Tes Koneksi PRFlow',
      { message: 'Webhook dari PRFlow Workspace Pro aktif dan terhubung.' },
      db.integrations
    );
    pushToast('success', 'Payload Webhook Dikirim', 'Periksa kanal tujuan Anda untuk verifikasi.');
  }, [db.integrations, pushToast]);

  const resetWorkspaceToEmpty = useCallback(() => {
    const fresh = createEmptyDatabase();
    setDb(fresh);
    pushToast(
      'info',
      'Workspace Dikosongkan',
      'Seluruh data kampanye, anggota tim, konten, dan aset kembali fresh.'
    );
  }, [pushToast]);

  return {
    db,
    toasts,
    lastSavedTime,
    pushToast,
    dismissToast,
    createContent,
    updateContent,
    deleteContent,
    advancePhase,
    approveKanbanItem,
    requestRevision,
    publishContentNow,
    triggerOptimizationAction,
    archiveLearning,
    cloneToNextCycle,
    createCampaign,
    deleteCampaign,
    createUser,
    deleteUser,
    createAsset,
    deleteAsset,
    generateDriveFolders,
    markGcalSynced,
    downloadICS,
    exportCSV,
    exportJSON,
    importJSONText,
    markAllNotificationsRead,
    updateIntegrations,
    testWebhook,
    resetWorkspaceToEmpty,
  };
}

export type PRFlowStoreApi = ReturnType<typeof usePRFlowStore>;
