import React from 'react';
import { FolderPlus, Trash2, UserPlus } from 'lucide-react';
import { formatCurrencyID } from '../lib/prflowLogic';
import type { PRFlowDatabase, ScheduleConflict } from '../types/prflow';
import { UserAvatar, type AvatarUserInfo } from './UserAvatar';

interface CampaignsTeamViewProps {
  db: PRFlowDatabase;
  conflicts: ScheduleConflict[];
  resolveAvatarInfo?: (user: { id: string; name: string; email?: string; color?: string }) => AvatarUserInfo;
  nowMs?: number;
  onOpenCampaignModal: () => void;
  onOpenUserModal: () => void;
  onConfirmDeleteCampaign: (id: string, name: string) => void;
  onConfirmDeleteUser: (id: string, name: string) => void;
}

export const CampaignsTeamView: React.FC<CampaignsTeamViewProps> = ({
  db,
  conflicts,
  resolveAvatarInfo,
  nowMs,
  onOpenCampaignModal,
  onOpenUserModal,
  onConfirmDeleteCampaign,
  onConfirmDeleteUser,
}) => {
  const busyUserIds = new Set(conflicts.map((c) => c.user.id));

  return (
    <div className="space-y-6 animate-view">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            Master Data Relasional
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
            Manajemen Kampanye &amp; Beban Kerja Kru
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola proyek klien dan direktori tim PR yang terhubung otomatis ke seluruh konten dan jadwal.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenCampaignModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <FolderPlus className="w-3.5 h-3.5" aria-hidden="true" />
            Kampanye Baru
          </button>
          <button
            type="button"
            onClick={onOpenUserModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-500 text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            Tambah Kru Tim
          </button>
        </div>
      </div>

      {/* Campaigns Grid */}
      <section className="space-y-3">
        <h2 className="font-display font-bold text-sm text-slate-800 dark:text-slate-200">
          Proyek &amp; Kampanye Klien ({db.campaigns.length})
        </h2>

        {db.campaigns.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-sm text-slate-500">
            Belum ada kampanye klien. Tambahkan kampanye pertama Anda.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {db.campaigns.map((cmp) => {
              const relContents = db.contents.filter((c) => c.campaignId === cmp.id);
              const liveCount = relContents.filter((c) => c.distribution.published).length;
              const isCrisis = cmp.status === 'Krisis Monitor';

              return (
                <article
                  key={cmp.id}
                  className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`text-xs font-semibold ${
                        isCrisis
                          ? 'text-rose-700 dark:text-rose-400'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {cmp.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => onConfirmDeleteCampaign(cmp.id, cmp.name)}
                      aria-label={`Hapus kampanye ${cmp.name}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  <div>
                    <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                      {cmp.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {cmp.client}
                    </p>
                  </div>

                  <dl className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs tabular-nums">
                    <div>
                      <dt className="text-slate-400">Anggaran</dt>
                      <dd className="font-mono font-semibold text-slate-900 dark:text-white mt-0.5">
                        {formatCurrencyID(cmp.budget)}
                      </dd>
                    </div>
                    <div className="text-right">
                      <dt className="text-slate-400">Konten</dt>
                      <dd className="font-semibold text-slate-900 dark:text-white mt-0.5">
                        {relContents.length} ({liveCount} live)
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Crew & Team Directory */}
      <section className="space-y-3 pt-1">
        <h2 className="font-display font-bold text-sm text-slate-800 dark:text-slate-200">
          Direktori Tim Humas &amp; Kru Produksi ({db.users.length})
        </h2>

        {db.users.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-sm text-slate-500">
            Belum ada anggota tim terdaftar.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {db.users.map((u) => {
              const assigned = db.contents.filter((c) =>
                (c.planning.crewIds || []).includes(u.id)
              );
              const hasConflict = busyUserIds.has(u.id);

              return (
                <article
                  key={u.id}
                  className={`p-4 rounded-xl bg-white dark:bg-slate-900 border ${
                    hasConflict
                      ? 'border-amber-400 dark:border-amber-600'
                      : 'border-slate-200 dark:border-slate-800'
                  } flex items-start justify-between gap-3`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <UserAvatar
                      user={
                        resolveAvatarInfo
                          ? resolveAvatarInfo(u)
                          : { name: u.name, email: u.email, colorClass: u.color, isOnline: false }
                      }
                      size="md"
                      showStatus
                      nowMs={nowMs}
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                        {u.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {u.role}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">{u.email}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs tabular-nums">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          Terjadwal di {assigned.length} konten
                        </span>
                        {hasConflict && (
                          <>
                            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                              ·
                            </span>
                            <span className="font-semibold text-amber-700 dark:text-amber-400">
                              Jadwal Bentrok
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onConfirmDeleteUser(u.id, u.name)}
                    aria-label={`Hapus anggota tim ${u.name}`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
