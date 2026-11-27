import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  FolderKanban,
  Kanban,
  Paperclip,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import {
  computeDashboardMetrics,
  formatDateID,
  getPesoAccentClass,
} from '../lib/prflowLogic';
import type {
  ContentItem,
  NavView,
  PhaseNumber,
  PRFlowDatabase,
  ScheduleConflict,
} from '../types/prflow';
import { PHASE_META } from '../types/prflow';
import { UserAvatar, type AvatarUserInfo } from './UserAvatar';

interface DashboardViewProps {
  db: PRFlowDatabase;
  filteredContents: ContentItem[];
  conflicts: ScheduleConflict[];
  conflictedContentIds: Set<string>;
  onNavigate: (view: NavView) => void;
  onOpenDrawer: (contentId: string, phase: PhaseNumber) => void;
  onOpenNewContent: () => void;
  onOpenNewCampaign: () => void;
  onOpenNewUser: () => void;
  showOnboardingGuide?: boolean;
  autoConflictAlerts?: boolean;
  resolveAvatarInfo?: (user: { id: string; name: string; email?: string; color?: string }) => AvatarUserInfo;
  nowMs?: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  db,
  filteredContents,
  conflicts,
  conflictedContentIds,
  onNavigate,
  onOpenDrawer,
  onOpenNewContent,
  onOpenNewCampaign,
  onOpenNewUser,
  showOnboardingGuide = true,
  autoConflictAlerts = true,
  resolveAvatarInfo,
  nowMs,
}) => {
  const needsOnboarding =
    showOnboardingGuide &&
    (db.contents.length === 0 || db.campaigns.length === 0 || db.users.length === 0);
  const visibleConflicts = autoConflictAlerts ? conflicts : [];
  const metrics = computeDashboardMetrics(filteredContents);
  const campaignMap = new Map(db.campaigns.map((c) => [c.id, c]));
  const userMap = new Map(db.users.map((u) => [u.id, u]));

  const phaseAccentMap: Record<PhaseNumber, { count: string; bar: string; hoverTitle: string }> = {
    1: {
      count: 'text-[#0284C7] dark:text-[#38BDF8]',
      bar: 'from-[#0284C7] to-[#17B5E8]',
      hoverTitle: 'group-hover:text-[#0284C7] dark:group-hover:text-[#38BDF8]',
    },
    2: {
      count: 'text-[#059669] dark:text-[#2CE59B]',
      bar: 'from-[#17B5E8] to-[#2CE59B]',
      hoverTitle: 'group-hover:text-[#059669] dark:group-hover:text-[#2CE59B]',
    },
    3: {
      count: 'text-[#C2410C] dark:text-[#FF8A47]',
      bar: 'from-[#F37021] to-[#FB923C]',
      hoverTitle: 'group-hover:text-[#C2410C] dark:group-hover:text-[#FF8A47]',
    },
    4: {
      count: 'text-[#0369A1] dark:text-[#38BDF8]',
      bar: 'from-[#0284C7] to-[#2CE59B]',
      hoverTitle: 'group-hover:text-[#0369A1] dark:group-hover:text-[#38BDF8]',
    },
    5: {
      count: 'text-[#047857] dark:text-[#34D399]',
      bar: 'from-[#059669] to-[#2CE59B]',
      hoverTitle: 'group-hover:text-[#047857] dark:group-hover:text-[#34D399]',
    },
  };

  return (
    <div className="space-y-6 animate-view">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 dark:text-white">
            Dashboard &amp; Pipeline PR
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Pusat kendali relasional 5 fase: jadwal kru, aset digital, publikasi PESO, dan arsip pembelajaran.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('phase2')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full glass-card text-slate-700 dark:text-slate-200 hover:border-[#17B5E8]/50 hover:-translate-y-0.5 transition-all whitespace-nowrap"
          >
            <CalendarDays className="w-3.5 h-3.5 text-[#059669] dark:text-[#2CE59B]" aria-hidden="true" />
            Kalender Take
          </button>
          <button
            type="button"
            onClick={() => onNavigate('phase3')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full glass-card text-slate-700 dark:text-slate-200 hover:border-[#F37021]/50 hover:-translate-y-0.5 transition-all whitespace-nowrap"
          >
            <Kanban className="w-3.5 h-3.5 text-[#C2410C] dark:text-[#FF8A47]" aria-hidden="true" />
            Kanban QC
          </button>
          <button
            type="button"
            onClick={() => onNavigate('assets')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full glass-card text-slate-700 dark:text-slate-200 hover:border-[#17B5E8]/50 hover:-translate-y-0.5 transition-all whitespace-nowrap"
          >
            <FolderKanban className="w-3.5 h-3.5 text-[#0284C7] dark:text-[#38BDF8]" aria-hidden="true" />
            Aset ({db.assets.length})
          </button>
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full glass-card text-slate-700 dark:text-slate-200 hover:border-[#17B5E8]/50 hover:-translate-y-0.5 transition-all whitespace-nowrap"
          >
            <Settings className="w-3.5 h-3.5 text-[#0284C7] dark:text-[#2CE59B]" aria-hidden="true" />
            Pengaturan
          </button>
        </div>
      </div>

      {/* Priority Alerts */}
      {(visibleConflicts.length > 0 || metrics.crisisItems.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visibleConflicts.length > 0 && (
            <div className="p-4 sm:p-5 rounded-[24px] bg-[#F37021]/10 dark:bg-[#F37021]/15 backdrop-blur-xl border border-[#F37021]/30 dark:border-[#F37021]/35 shadow-lg shadow-[#F37021]/10 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#C2410C] dark:text-[#FF8A47] shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                  Detektor Bentrok: {visibleConflicts.length} Jadwal Kru Bertabrakan
                </h2>
                <p className="text-xs text-amber-900/85 dark:text-amber-200/85 mt-1 leading-relaxed">
                  {visibleConflicts.map((c, idx) => (
                    <React.Fragment key={`${c.date}-${c.user.id}`}>
                      {idx > 0 && ' · '}
                      <strong className="font-semibold">{c.user.name}</strong> pada{' '}
                      <span className="font-semibold tabular-nums">{formatDateID(c.date)}</span> ({c.items.length} take)
                    </React.Fragment>
                  ))}
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('phase2')}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#C2410C] dark:text-[#FF8A47] hover:underline"
                >
                  Selesaikan di Kalender Fase 2
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {metrics.crisisItems.length > 0 && (
            <div className="p-4 sm:p-5 rounded-[24px] bg-rose-500/10 dark:bg-rose-500/15 backdrop-blur-xl border border-rose-400/35 dark:border-rose-500/35 shadow-lg shadow-rose-500/10 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-rose-950 dark:text-rose-200">
                  Prioritas PR: {metrics.crisisItems.length} Konten Butuh Audit / Respon Krisis
                </h2>
                <p className="text-xs text-rose-900/85 dark:text-rose-200/85 mt-1 leading-relaxed">
                  {metrics.crisisItems.map((item) => `"${item.title}"`).join(', ')}
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('phase5')}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:underline"
                >
                  Tindaklanjuti di Evaluasi Fase 5
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI Strip — Structured single-elevation frosted glass stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 glass-card rounded-[28px] overflow-hidden">
        <div className="p-5 border-b border-r lg:border-b-0 border-slate-200/65 dark:border-white/10 hover:bg-white/35 dark:hover:bg-white/[0.03] transition-colors">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Konten Aktif</div>
          <div className="font-display text-3xl font-extrabold tabular-nums text-slate-900 dark:text-white mt-1.5">
            {metrics.totalContents}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 tabular-nums">
            {db.campaigns.length} kampanye · {db.users.length} kru
          </div>
        </div>

        <div className="p-5 border-b lg:border-b-0 lg:border-r border-slate-200/65 dark:border-white/10 hover:bg-white/35 dark:hover:bg-white/[0.03] transition-colors">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Live Multi-Kanal</div>
          <div className="font-display text-3xl font-extrabold tabular-nums text-slate-900 dark:text-white mt-1.5">
            {metrics.publishedCount}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 tabular-nums">
            Sentimen positif rata-rata:{' '}
            <strong className="text-[#059669] dark:text-[#2CE59B]">
              {metrics.avgPositiveSentiment}%
            </strong>
          </div>
        </div>

        <div className="p-5 border-r border-slate-200/65 dark:border-white/10 hover:bg-white/35 dark:hover:bg-white/[0.03] transition-colors">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Aset Digital (DAM)</div>
          <div className="font-display text-3xl font-extrabold tabular-nums text-slate-900 dark:text-white mt-1.5">
            {db.assets.length}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Tersinkron ke folder konten
          </div>
        </div>

        <div className="p-5 hover:bg-white/35 dark:hover:bg-white/[0.03] transition-colors">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Arsip Pembelajaran</div>
          <div className="font-display text-3xl font-extrabold tabular-nums text-slate-900 dark:text-white mt-1.5">
            {db.archives.length}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Dokumentasi best practice
          </div>
        </div>
      </div>

      {/* Fresh Workspace Quick-Start Guide */}
      {needsOnboarding && (
        <section className="p-6 rounded-[28px] glass-card space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#0284C7] dark:text-[#2CE59B]">
                Workspace Fresh Siap Digunakan
              </p>
              <h2 className="font-display font-bold text-lg sm:text-xl text-slate-900 dark:text-white mt-0.5">
                Mulai Siapkan Data Agensi PR Anda
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Seluruh daftar anggota tim, kampanye klien, konten, aset digital, dan arsip dimulai dalam keadaan kosong tanpa data demo.
              </p>
            </div>
            <div className="text-xs font-mono font-semibold text-[#0284C7] dark:text-[#2CE59B] tabular-nums shrink-0">
              {[db.users.length > 0, db.campaigns.length > 0, db.contents.length > 0].filter(Boolean).length}/3 langkah selesai
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl glass-subtle glass-card-hover flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-xs font-bold text-[#0284C7] dark:text-[#38BDF8]">
                    01.
                  </div>
                  {db.users.length > 0 && (
                    <span className="text-[11px] font-semibold text-[#059669] dark:text-[#2CE59B]">
                      ✓ {db.users.length} kru terdaftar
                    </span>
                  )}
                </div>
                <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white mt-1.5">
                  Tambah Anggota Tim &amp; Kru
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                  Daftarkan PR strategist, produser, videografer, editor, atau talent agar detektor bentrok jadwal aktif.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenNewUser}
                className="self-start px-4 py-2 rounded-full glass-card hover:border-[#17B5E8]/60 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:-translate-y-0.5 transition-all"
              >
                + Tambah Anggota Tim
              </button>
            </div>

            <div className="p-5 rounded-3xl glass-subtle glass-card-hover flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-xs font-bold text-[#059669] dark:text-[#2CE59B]">
                    02.
                  </div>
                  {db.campaigns.length > 0 && (
                    <span className="text-[11px] font-semibold text-[#059669] dark:text-[#2CE59B]">
                      ✓ {db.campaigns.length} kampanye dibuat
                    </span>
                  )}
                </div>
                <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white mt-1.5">
                  Buat Kampanye Klien
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                  Kelompokkan proyek berdasarkan nama kampanye, klien, status aktif, serta anggaran operasional.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenNewCampaign}
                className="self-start px-4 py-2 rounded-full glass-card hover:border-[#2CE59B]/60 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:-translate-y-0.5 transition-all"
              >
                + Buat Kampanye Klien
              </button>
            </div>

            <div className="p-5 rounded-3xl glass-subtle glass-card-hover flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-xs font-bold text-[#C2410C] dark:text-[#FF8A47]">
                    03.
                  </div>
                  {db.contents.length > 0 && (
                    <span className="text-[11px] font-semibold text-[#059669] dark:text-[#2CE59B]">
                      ✓ {db.contents.length} konten aktif
                    </span>
                  )}
                </div>
                <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white mt-1.5">
                  Buat Item Konten PR Pertama
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                  Mulai dari Fase 1 Riset &amp; PESO, jadwalkan produksi, lalu pantau distribusi hingga evaluasi KPI.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenNewContent}
                className="self-start px-4 py-2 rounded-full bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] hover:brightness-105 text-white text-xs font-semibold shadow-md shadow-[#17B5E8]/25 hover:-translate-y-0.5 transition-all"
              >
                + Buat Konten Baru
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 5-Phase Interactive Pipeline */}
      <section className="glass-card rounded-[28px] p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">
              Pipeline 5 Fase Alur Kerja PR
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Pilih fase untuk mengelola item konten secara langsung.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {([1, 2, 3, 4, 5] as PhaseNumber[]).map((phase) => {
            const count = filteredContents.filter((i) => i.phase === phase).length;
            const pct = filteredContents.length
              ? Math.round((count / filteredContents.length) * 100)
              : 0;
            const accent = phaseAccentMap[phase];
            return (
              <button
                key={phase}
                type="button"
                onClick={() => onNavigate(`phase${phase}` as NavView)}
                className="group text-left p-4 rounded-2xl glass-subtle glass-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17B5E8]"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-medium">Fase {phase}</span>
                  <span className={`font-mono font-bold tabular-nums ${accent.count}`}>
                    {count}
                  </span>
                </div>
                <div
                  className={`font-display font-bold text-sm text-slate-900 dark:text-white mt-1.5 transition-colors ${accent.hoverTitle}`}
                >
                  {PHASE_META[phase].name}
                </div>
                <div className="mt-3 w-full bg-slate-200/75 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`bg-gradient-to-r ${accent.bar} h-full rounded-full transition-all duration-300`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Master Content Table */}
      <section className="glass-card rounded-[28px] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/70 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">
            Master Konten Relasional ({filteredContents.length})
          </h2>
          <span className="text-xs text-slate-600 dark:text-slate-400">
            Pilih tombol Kelola untuk membuka editor 5 fase
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/55 dark:bg-slate-900/45 text-xs font-semibold text-slate-600 dark:text-slate-300 border-b border-white/70 dark:border-white/10">
                <th className="px-6 py-3.5">Judul Konten &amp; Kampanye</th>
                <th className="px-4 py-3.5">Kru</th>
                <th className="px-4 py-3.5">Fase Aktif</th>
                <th className="px-4 py-3.5">PESO &amp; Aset</th>
                <th className="px-4 py-3.5">Jadwal Take / Tayang</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/10 text-sm">
              {filteredContents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      {db.contents.length === 0
                        ? 'Belum ada item konten di workspace ini. Mulai dengan membuat konten PR pertama Anda.'
                        : 'Tidak ada konten yang cocok dengan filter pencarian saat ini.'}
                    </p>
                    <button
                      type="button"
                      onClick={onOpenNewContent}
                      className="mt-4 px-5 py-2.5 text-xs font-semibold rounded-full bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] hover:brightness-105 text-white shadow-lg shadow-[#17B5E8]/25 hover:-translate-y-0.5 transition-all"
                    >
                      Buat Konten Baru
                    </button>
                  </td>
                </tr>
              ) : (
                filteredContents.map((item) => {
                  const cmp = campaignMap.get(item.campaignId);
                  const crew = (item.planning.crewIds || [])
                    .map((id) => userMap.get(id))
                    .filter((u): u is NonNullable<typeof u> => Boolean(u));
                  const assetCount = db.assets.filter((a) => a.contentId === item.id).length;
                  const isConflict = conflictedContentIds.has(item.id);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[#17B5E8]/[0.06] dark:hover:bg-[#2CE59B]/[0.06] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => onOpenDrawer(item.id, item.phase)}
                          className="text-left font-semibold text-slate-900 dark:text-white hover:text-[#0284C7] dark:hover:text-[#2CE59B] transition-colors"
                        >
                          {item.title}
                        </button>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span>{cmp?.name || 'Tanpa Kampanye'}</span>
                          <span aria-hidden="true">·</span>
                          <span>{cmp?.client || '-'}</span>
                          {isConflict && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-[#C2410C] dark:text-[#FF8A47]">
                                Bentrok Jadwal Kru
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex -space-x-1.5">
                          {crew.length === 0 ? (
                            <span className="text-xs text-slate-400">-</span>
                          ) : (
                            <>
                              {crew.slice(0, 3).map((u) => (
                                <UserAvatar
                                  key={u.id}
                                  user={
                                    resolveAvatarInfo
                                      ? resolveAvatarInfo(u)
                                      : { name: u.name, email: u.email, colorClass: u.color, isOnline: false }
                                  }
                                  size="xs"
                                  showStatus
                                  nowMs={nowMs}
                                  className="ring-2 ring-white/90 dark:ring-slate-900 rounded-full"
                                />
                              ))}
                              {crew.length > 3 && (
                                <span className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-mono font-bold flex items-center justify-center ring-2 ring-white/90 dark:ring-slate-900">
                                  +{crew.length - 3}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {PHASE_META[item.phase].short}
                      </td>

                      <td className="px-4 py-4 text-xs whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${getPesoAccentClass(item.research.peso)}`}>
                            {item.research.peso}
                          </span>
                          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                            ·
                          </span>
                          <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                            <Paperclip className="w-3 h-3" aria-hidden="true" />
                            {assetCount}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-xs tabular-nums whitespace-nowrap">
                        <div className="text-slate-800 dark:text-slate-200 font-medium">
                          Take: {formatDateID(item.planning.takeDate)}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400">
                          Tayang: {formatDateID(item.planning.publishDate)}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onOpenDrawer(item.id, item.phase)}
                          aria-label={`Kelola ${item.title}`}
                          className="px-4 py-1.5 text-xs font-semibold rounded-full glass-subtle text-slate-800 dark:text-slate-100 hover:bg-gradient-to-r hover:from-[#0284C7] hover:to-[#17B5E8] hover:text-white hover:border-transparent transition-all"
                        >
                          Kelola
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
