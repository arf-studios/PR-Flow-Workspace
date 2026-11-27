import React, { useEffect, useState } from 'react';
import {
  CalendarCheck,
  CalendarPlus,
  ExternalLink,
  FolderPlus,
  MapPin,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import {
  buildGoogleCalendarUrl,
  buildGoogleMapsUrl,
  getInitials,
  getPesoAccentClass,
} from '../lib/prflowLogic';
import type {
  ContentItem,
  FunnelStage,
  IssueRisk,
  KanbanStageId,
  PesoModel,
  PhaseNumber,
  PRFlowDatabase,
  ResponseStatus,
} from '../types/prflow';
import {
  ALL_CHANNELS,
  AUDIT_CAUSES,
  KANBAN_STAGES,
  OPTIMIZATION_ACTIONS,
  PHASE_META,
} from '../types/prflow';

interface ContentDetailDrawerProps {
  db: PRFlowDatabase;
  contentId: string | null;
  initialTab: number;
  onClose: () => void;
  onSaveDraft: (updated: ContentItem, showToast: boolean) => void;
  onAdvancePhase: (contentId: string, targetPhase: PhaseNumber) => void;
  onApproveKanban: (contentId: string) => void;
  onOpenRevisionModal: (contentId: string) => void;
  onOpenAssetModal: (contentId: string) => void;
  onDeleteAsset: (assetId: string) => void;
  onConfirmDeleteContent: (contentId: string, title: string) => void;
  onMarkGcalSynced: (contentId: string) => void;
  onDownloadICS: (contentId: string) => void;
  onGenerateDriveFolders: (contentId: string) => void;
}

export const ContentDetailDrawer: React.FC<ContentDetailDrawerProps> = ({
  db,
  contentId,
  initialTab,
  onClose,
  onSaveDraft,
  onAdvancePhase,
  onApproveKanban,
  onOpenRevisionModal,
  onOpenAssetModal,
  onDeleteAsset,
  onConfirmDeleteContent,
  onMarkGcalSynced,
  onDownloadICS,
  onGenerateDriveFolders,
}) => {
  const sourceItem = contentId ? db.contents.find((c) => c.id === contentId) || null : null;
  const [activeTab, setActiveTab] = useState<number>(initialTab);
  const [draft, setDraft] = useState<ContentItem | null>(sourceItem);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, contentId]);

  useEffect(() => {
    setDraft(sourceItem ? structuredClone(sourceItem) : null);
  }, [sourceItem]);

  if (!sourceItem || !draft) return null;

  const cmp = db.campaigns.find((c) => c.id === draft.campaignId);
  const linkedAssets = db.assets.filter((a) => a.contentId === draft.id);
  const crew = (draft.planning.crewIds || [])
    .map((id) => db.users.find((u) => u.id === id))
    .filter((u): u is NonNullable<typeof u> => Boolean(u));

  const gcalUrl = buildGoogleCalendarUrl(draft, cmp, crew);
  const mapsUrl = buildGoogleMapsUrl(draft.planning.location);
  const mapQuery = encodeURIComponent(draft.planning.location || 'Jakarta');

  const handleSwitchTab = (nextTab: number) => {
    onSaveDraft(draft, false);
    setActiveTab(nextTab);
  };

  const handleStepClick = (phase: PhaseNumber) => {
    const nextDraft: ContentItem = { ...draft, phase };
    setDraft(nextDraft);
    onSaveDraft(nextDraft, false);
    onAdvancePhase(draft.id, phase);
    setActiveTab(phase);
  };

  const toggleCrewId = (userId: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const exists = prev.planning.crewIds.includes(userId);
      return {
        ...prev,
        planning: {
          ...prev.planning,
          crewIds: exists
            ? prev.planning.crewIds.filter((id) => id !== userId)
            : [...prev.planning.crewIds, userId],
        },
      };
    });
  };

  const toggleChannel = (channel: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const exists = prev.distribution.channels.includes(channel);
      return {
        ...prev,
        distribution: {
          ...prev.distribution,
          channels: exists
            ? prev.distribution.channels.filter((ch) => ch !== channel)
            : [...prev.distribution.channels, channel],
        },
      };
    });
  };

  const tabs = [
    { id: 1, label: '1. Riset & PESO' },
    { id: 2, label: '2. Jadwal & Peta' },
    { id: 3, label: '3. Produksi & QC' },
    { id: 4, label: '4. Distribusi' },
    { id: 5, label: '5. Evaluasi' },
    { id: 6, label: `Aset (${linkedAssets.length})` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Editor konten ${draft.title}`}>
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/55 backdrop-blur-md"
        aria-hidden="true"
      />

      <aside className="relative z-10 w-full max-w-3xl glass-panel flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className={`font-semibold ${getPesoAccentClass(draft.research.peso)}`}>
                {draft.research.peso}
              </span>
              <span aria-hidden="true">·</span>
              <span className="truncate">
                {cmp?.name || 'Tanpa Kampanye'} · {cmp?.client || '-'}
              </span>
            </div>
            <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white truncate mt-0.5">
              {draft.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup editor konten"
            className="p-2 rounded-2xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-white/75 dark:hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* 5-Phase Stepper */}
        <div className="px-6 py-3 bg-white/40 dark:bg-slate-950/40 border-b border-slate-200/70 dark:border-white/10 shrink-0 overflow-x-auto">
          <div className="flex items-center justify-between gap-2 min-w-[520px]">
            {([1, 2, 3, 4, 5] as PhaseNumber[]).map((p) => {
              const done = draft.phase > p;
              const current = draft.phase === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleStepClick(p)}
                  className={`flex-1 flex items-center gap-2 p-2 rounded-2xl border text-left transition-all ${
                    current
                      ? 'bg-[#17B5E8]/14 border-[#17B5E8]/45 dark:bg-[#2CE59B]/14 dark:border-[#2CE59B]/45'
                      : done
                        ? 'bg-[#2CE59B]/12 border-[#2CE59B]/35 dark:bg-[#2CE59B]/10 dark:border-[#2CE59B]/30'
                        : 'glass-subtle opacity-80 hover:opacity-100'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                      current
                        ? 'bg-gradient-to-br from-[#0284C7] to-[#17B5E8] text-white'
                        : done
                          ? 'bg-gradient-to-br from-[#059669] to-[#2CE59B] text-white'
                          : 'bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {done ? '✓' : p}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      Fase {p}
                    </span>
                    <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {PHASE_META[p].stepLabel}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Bagian detail konten"
          className="px-6 border-b border-slate-200/70 dark:border-white/10 flex items-center gap-1 overflow-x-auto shrink-0 bg-white/50 dark:bg-slate-900/40"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => handleSwitchTab(tab.id)}
              className={`px-3.5 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-[#17B5E8] text-[#0284C7] dark:border-[#2CE59B] dark:text-[#2CE59B]'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 1 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="ed-title" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Konten PR
                </label>
                <input
                  id="ed-title"
                  type="text"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ed-campaign" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kampanye (Relasional)
                  </label>
                  <select
                    id="ed-campaign"
                    value={draft.campaignId}
                    onChange={(e) => setDraft({ ...draft, campaignId: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Tanpa Kampanye --</option>
                    {db.campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="ed-owner" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    PIC / Owner
                  </label>
                  <select
                    id="ed-owner"
                    value={draft.ownerId}
                    onChange={(e) => setDraft({ ...draft, ownerId: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Belum Ditentukan --</option>
                    {db.users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} — {u.role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="ed-peso" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    PESO Model
                  </label>
                  <select
                    id="ed-peso"
                    value={draft.research.peso}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        research: { ...draft.research, peso: e.target.value as PesoModel },
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  >
                    {(['Paid', 'Earned', 'Shared', 'Owned'] as PesoModel[]).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="ed-funnel" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tujuan Funnel
                  </label>
                  <select
                    id="ed-funnel"
                    value={draft.research.funnel}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        research: { ...draft.research, funnel: e.target.value as FunnelStage },
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  >
                    {(['Awareness', 'Engagement', 'Conversion'] as FunnelStage[]).map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="ed-risk" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Risiko Isu
                  </label>
                  <select
                    id="ed-risk"
                    value={draft.research.issueRisk}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        research: { ...draft.research, issueRisk: e.target.value as IssueRisk },
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  >
                    {(['Rendah', 'Sedang', 'Tinggi'] as IssueRisk[]).map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ed-kpimetric" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Metrik KPI
                  </label>
                  <input
                    id="ed-kpimetric"
                    type="text"
                    value={draft.research.kpiMetric}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        research: { ...draft.research, kpiMetric: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="ed-kpitarget" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target KPI
                  </label>
                  <input
                    id="ed-kpitarget"
                    type="number"
                    min={0}
                    value={draft.research.kpiTarget}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        research: { ...draft.research, kpiTarget: Number(e.target.value) || 0 },
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ed-pillar" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Content Pillar
                  </label>
                  <input
                    id="ed-pillar"
                    type="text"
                    value={draft.research.pillar}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        research: { ...draft.research, pillar: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="ed-format" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Format Konten
                  </label>
                  <input
                    id="ed-format"
                    type="text"
                    value={draft.research.format}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        research: { ...draft.research, format: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="ed-audience" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Audiens &amp; Tren
                </label>
                <textarea
                  id="ed-audience"
                  rows={2}
                  value={draft.research.audience}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      research: { ...draft.research, audience: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="ed-issue" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Audit Isu &amp; Sensitivitas PR
                </label>
                <textarea
                  id="ed-issue"
                  rows={2}
                  value={draft.research.issueAudit}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      research: { ...draft.research, issueAudit: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {activeTab === 2 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="ed-brief" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Creative Brief
                </label>
                <textarea
                  id="ed-brief"
                  rows={2}
                  value={draft.planning.brief}
                  onChange={(e) =>
                    setDraft({ ...draft, planning: { ...draft.planning, brief: e.target.value } })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="ed-outline" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Outline &amp; Script
                </label>
                <textarea
                  id="ed-outline"
                  rows={3}
                  value={draft.planning.outline}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      planning: { ...draft.planning, outline: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.planning.needsBriefRevision}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        planning: { ...draft.planning, needsBriefRevision: e.target.checked },
                      })
                    }
                    className="w-4 h-4 accent-rose-600 rounded"
                  />
                  Tandai Perlu Revisi Konsep
                </label>
                <input
                  type="text"
                  aria-label="Catatan revisi konsep"
                  value={draft.planning.briefRevisionNote}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      planning: { ...draft.planning, briefRevisionNote: e.target.value },
                    })
                  }
                  placeholder="Catatan revisi konsep..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="ed-takedate" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Take
                  </label>
                  <input
                    id="ed-takedate"
                    type="date"
                    value={draft.planning.takeDate}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        planning: { ...draft.planning, takeDate: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="ed-pubdate" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Tayang
                  </label>
                  <input
                    id="ed-pubdate"
                    type="date"
                    value={draft.planning.publishDate}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        planning: { ...draft.planning, publishDate: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="ed-pubtime" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Jam Prime Time
                  </label>
                  <input
                    id="ed-pubtime"
                    type="time"
                    value={draft.planning.publishTime || '19:00'}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        planning: { ...draft.planning, publishTime: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Assign Kru &amp; Talent (Dicek Otomatis oleh Detektor Bentrok)
                </div>
                {db.users.length === 0 ? (
                  <div className="p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                    Belum ada anggota tim terdaftar. Tambahkan kru atau talent terlebih dahulu di menu Kampanye &amp; Tim.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {db.users.map((u) => {
                      const checked = draft.planning.crewIds.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                            checked
                              ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                              : 'border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCrewId(u.id)}
                            className="w-4 h-4 accent-indigo-600 rounded"
                          />
                          <span
                            className={`w-6 h-6 rounded-full ${u.color} text-white text-[10px] font-bold flex items-center justify-center shrink-0`}
                          >
                            {getInitials(u.name)}
                          </span>
                          <span className="min-w-0">
                            <span className="block font-semibold text-slate-800 dark:text-slate-100 truncate">
                              {u.name}
                            </span>
                            <span className="block text-[11px] text-slate-400 truncate">
                              {u.role}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ed-location" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lokasi Take (Google Maps)
                  </label>
                  <input
                    id="ed-location"
                    type="text"
                    value={draft.planning.location}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        planning: { ...draft.planning, location: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="ed-travel" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Estimasi Waktu Tempuh
                  </label>
                  <input
                    id="ed-travel"
                    type="text"
                    value={draft.planning.travelEstimate}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        planning: { ...draft.planning, travelEstimate: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      Pratinjau Lokasi: {draft.planning.location || 'Jakarta'}
                    </span>
                  </span>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline whitespace-nowrap shrink-0"
                  >
                    Buka Rute Maps
                  </a>
                </div>
                <iframe
                  title="Pratinjau Google Maps Lokasi Take"
                  className="w-full h-44 border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://maps.google.com/maps?q=${mapQuery}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href={gcalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onMarkGcalSynced(draft.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
                >
                  <CalendarCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  Google Calendar
                </a>
                <button
                  type="button"
                  onClick={() => onDownloadICS(draft.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                >
                  <CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" />
                  Unduh .ICS
                </button>
                <button
                  type="button"
                  onClick={() => onGenerateDriveFolders(draft.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300"
                >
                  <FolderPlus className="w-3.5 h-3.5" aria-hidden="true" />
                  Sync Folder Drive
                </button>
              </div>
            </div>
          )}

          {activeTab === 3 && (
            <div className="space-y-5">
              <div>
                <label htmlFor="ed-stage" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tahap Kanban Produksi
                </label>
                <select
                  id="ed-stage"
                  value={draft.production.stage}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      production: {
                        ...draft.production,
                        stage: e.target.value as KanbanStageId,
                      },
                    })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                >
                  {KANBAN_STAGES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Checklist Pra-Produksi &amp; Peralatan
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700 dark:text-slate-200">
                  {(
                    [
                      ['kamera', 'Kamera & Baterai'],
                      ['audio', 'Mic / Audio Clip-on'],
                      ['lighting', 'Lighting & Tripod'],
                      ['briefingMeet', 'Briefing Google Meet'],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.production.preProdChecklist[key]}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            production: {
                              ...draft.production,
                              preProdChecklist: {
                                ...draft.production.preProdChecklist,
                                [key]: e.target.checked,
                              },
                            },
                          })
                        }
                        className="w-4 h-4 accent-indigo-600 rounded"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2.5">
                <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Gerbang QC Teknis &amp; PR Brand Safety
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-800 dark:text-slate-200">
                  {(
                    [
                      ['visualAudio', 'Kualitas Visual & Audio'],
                      ['tonePR', 'Tone of Voice PR'],
                      ['brandSafety', 'Brand Safety / Isu'],
                      ['akurasiData', 'Akurasi Data & Fakta'],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.production.qcChecklist[key]}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            production: {
                              ...draft.production,
                              qcChecklist: {
                                ...draft.production.qcChecklist,
                                [key]: e.target.checked,
                              },
                            },
                          })
                        }
                        className="w-4 h-4 accent-amber-600 rounded"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSaveDraft(draft, false);
                    onApproveKanban(draft.id);
                  }}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                >
                  Setujui (Lolos QC / Final)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSaveDraft(draft, false);
                    onOpenRevisionModal(draft.id);
                  }}
                  className="px-4 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 dark:text-rose-300 text-xs font-semibold transition-colors"
                >
                  Tolak / Minta Revisi
                </button>
              </div>

              {draft.production.revisions.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Riwayat Catatan Revisi ({draft.production.revisions.length})
                  </div>
                  {draft.production.revisions.map((r, idx) => (
                    <div
                      key={`${r.date}-${idx}`}
                      className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900 text-xs"
                    >
                      <div className="font-semibold text-rose-700 dark:text-rose-300">
                        {r.by} · {r.date}
                      </div>
                      <div className="mt-0.5 text-slate-700 dark:text-slate-300">{r.note}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 4 && (
            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Kanal Publikasi Multi-Kanal (PESO)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {ALL_CHANNELS.map((ch) => (
                    <label
                      key={ch}
                      className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer text-slate-700 dark:text-slate-200"
                    >
                      <input
                        type="checkbox"
                        checked={draft.distribution.channels.includes(ch)}
                        onChange={() => toggleChannel(ch)}
                        className="w-4 h-4 accent-indigo-600 rounded"
                      />
                      {ch}
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-xs font-semibold text-sky-950 dark:text-sky-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.distribution.published}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      distribution: { ...draft.distribution, published: e.target.checked },
                    })
                  }
                  className="w-4 h-4 accent-sky-600 rounded"
                />
                Konten Sudah Dipublikasikan (Live)
              </label>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="ed-pos" className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                    Positif (%)
                  </label>
                  <input
                    id="ed-pos"
                    type="number"
                    min={0}
                    max={100}
                    value={draft.distribution.sentiment.positive}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        distribution: {
                          ...draft.distribution,
                          sentiment: {
                            ...draft.distribution.sentiment,
                            positive: Number(e.target.value) || 0,
                          },
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="ed-neu" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Netral (%)
                  </label>
                  <input
                    id="ed-neu"
                    type="number"
                    min={0}
                    max={100}
                    value={draft.distribution.sentiment.neutral}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        distribution: {
                          ...draft.distribution,
                          sentiment: {
                            ...draft.distribution.sentiment,
                            neutral: Number(e.target.value) || 0,
                          },
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="ed-neg" className="block text-xs font-semibold text-rose-700 dark:text-rose-400 mb-1">
                    Negatif (%)
                  </label>
                  <input
                    id="ed-neg"
                    type="number"
                    min={0}
                    max={100}
                    value={draft.distribution.sentiment.negative}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        distribution: {
                          ...draft.distribution,
                          sentiment: {
                            ...draft.distribution.sentiment,
                            negative: Number(e.target.value) || 0,
                          },
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ed-mentions" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Jumlah Mention / Komentar
                  </label>
                  <input
                    id="ed-mentions"
                    type="number"
                    min={0}
                    value={draft.distribution.mentions}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        distribution: {
                          ...draft.distribution,
                          mentions: Number(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="ed-resp" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status Respon Audiens
                  </label>
                  <select
                    id="ed-resp"
                    value={draft.distribution.responseStatus}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        distribution: {
                          ...draft.distribution,
                          responseStatus: e.target.value as ResponseStatus,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  >
                    {(['Belum Direspon', 'Sedang Ditangani', 'Selesai'] as ResponseStatus[]).map(
                      (st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 5 && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  Target KPI ({draft.research.kpiMetric}):{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {Number(draft.research.kpiTarget).toLocaleString('id-ID')}
                  </strong>
                </div>
                <div className="mt-2">
                  <label htmlFor="ed-kpiactual" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Capaian KPI Aktual
                  </label>
                  <input
                    id="ed-kpiactual"
                    type="number"
                    min={0}
                    value={draft.evaluation.kpiActual}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        evaluation: {
                          ...draft.evaluation,
                          kpiActual: Number(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ed-auditcause" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Audit Penyebab
                  </label>
                  <select
                    id="ed-auditcause"
                    value={draft.evaluation.auditCause}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        evaluation: { ...draft.evaluation, auditCause: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Sesuai Target --</option>
                    {AUDIT_CAUSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="ed-actiontaken" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tindakan Optimasi
                  </label>
                  <select
                    id="ed-actiontaken"
                    value={draft.evaluation.actionTaken}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        evaluation: { ...draft.evaluation, actionTaken: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Pilih Tindakan --</option>
                    {OPTIMIZATION_ACTIONS.map((act) => (
                      <option key={act} value={act}>
                        {act}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="ed-auditnotes" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Evaluasi &amp; Pembelajaran
                </label>
                <textarea
                  id="ed-auditnotes"
                  rows={3}
                  value={draft.evaluation.auditNotes}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      evaluation: { ...draft.evaluation, auditNotes: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {activeTab === 6 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">
                    Aset Digital Tertaut ({linkedAssets.length})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    File tersinkronisasi langsung dengan halaman Repositori Aset (DAM).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenAssetModal(draft.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  Tambah File
                </button>
              </div>

              {linkedAssets.length === 0 ? (
                <div className="p-8 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500">
                  Belum ada aset tertaut pada konten ini.
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                  {linkedAssets.map((a) => (
                    <div
                      key={a.id}
                      className="p-3.5 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          {a.name}{' '}
                          <span className="font-mono text-[11px] text-slate-400">
                            · {a.version}
                          </span>
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                          {a.folder} · {a.type}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-indigo-600 hover:text-white font-semibold transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                          Buka
                        </a>
                        <button
                          type="button"
                          onClick={() => onDeleteAsset(a.id)}
                          aria-label={`Hapus aset ${a.name}`}
                          className="p-1.5 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200/70 dark:border-white/10 bg-white/45 dark:bg-slate-950/45 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onConfirmDeleteContent(draft.id, draft.title)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            Hapus Konten
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-semibold glass-subtle text-slate-800 dark:text-slate-200 hover:bg-white/85 dark:hover:bg-white/10 transition-colors"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={() => onSaveDraft(draft, true)}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] hover:brightness-105 text-white shadow-md shadow-[#17B5E8]/25 transition-all"
            >
              <Save className="w-3.5 h-3.5" aria-hidden="true" />
              Simpan Perubahan
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};
