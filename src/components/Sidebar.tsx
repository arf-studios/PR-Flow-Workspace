import React from 'react';
import {
  Archive,
  BarChart3,
  Briefcase,
  CalendarDays,
  Clapperboard,
  Compass,
  Download,
  FileSpreadsheet,
  FolderKanban,
  Globe,
  Layers,
  LayoutDashboard,
  LogOut,
  Radio,
  Settings,
  Users,
  X,
} from 'lucide-react';
import type { AgencySession, NavView, PRFlowDatabase } from '../types/prflow';
import { UserAvatar, type AvatarUserInfo } from './UserAvatar';

interface SidebarProps {
  db: PRFlowDatabase;
  session: AgencySession | null;
  currentView: NavView;
  mobileOpen: boolean;
  lastSavedTime: string;
  showPhaseCounters?: boolean;
  selfAvatar?: AvatarUserInfo | null;
  onlineCrewCount?: number;
  nowMs?: number;
  onNavigate: (view: NavView) => void;
  onCloseMobile: () => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
  onOpenLanding: () => void;
  onRequestLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  db,
  session,
  currentView,
  mobileOpen,
  lastSavedTime,
  showPhaseCounters = true,
  selfAvatar = null,
  onlineCrewCount = 0,
  nowMs,
  onNavigate,
  onCloseMobile,
  onExportCSV,
  onExportJSON,
  onOpenLanding,
  onRequestLogout,
}) => {
  const phaseCounts = [1, 2, 3, 4, 5].map(
    (p) => db.contents.filter((item) => item.phase === p).length
  );

  const navClass = (view: NavView) =>
    `w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl text-[13px] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17B5E8] ${
      currentView === view
        ? 'bg-[#17B5E8]/14 text-[#0284C7] dark:bg-[#2CE59B]/14 dark:text-[#2CE59B] border border-[#17B5E8]/30 dark:border-[#2CE59B]/30 font-semibold shadow-sm shadow-[#17B5E8]/10'
        : 'border border-transparent text-slate-600 dark:text-slate-300 hover:bg-white/65 dark:hover:bg-white/8 hover:border-white/70 dark:hover:border-white/10 hover:text-slate-900 dark:hover:text-white font-medium'
    }`;

  return (
    <>
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-md z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Navigasi utama"
        className={`fixed lg:static inset-y-0 left-0 z-50 lg:z-20 w-64 glass-sidebar flex flex-col transform transition-transform duration-200 ease-out shrink-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/60 dark:border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17B5E8] rounded-2xl group"
          >
            <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#0284C7] via-[#17B5E8] to-[#2CE59B] flex items-center justify-center text-white shrink-0 shadow-md shadow-[#17B5E8]/25 group-hover:scale-105 transition-transform">
              <Layers className="w-4 h-4" aria-hidden="true" />
            </span>
            <span className="font-display font-bold text-[15px] tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
              PR
              <span className="bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#059669] dark:from-[#38BDF8] dark:to-[#2CE59B] bg-clip-text text-transparent">
                Flow
              </span>{' '}
              Pro
            </span>
          </button>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Tutup menu navigasi"
            className="lg:hidden p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/70 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-1.5 text-[11px] font-semibold tracking-wide text-slate-500/85 dark:text-slate-400">
            Ringkasan
          </div>

          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className={navClass('dashboard')}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <LayoutDashboard className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="truncate">Dashboard &amp; Pipeline</span>
            </span>
          </button>

          <div className="px-3 pt-4 pb-1.5 text-[11px] font-semibold tracking-wide text-slate-500/85 dark:text-slate-400">
            5 Fase Alur Kerja PR
          </div>

          <button
            type="button"
            onClick={() => onNavigate('phase1')}
            className={navClass('phase1')}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <Compass className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8] shrink-0" aria-hidden="true" />
              <span className="truncate">1. Riset &amp; PESO</span>
            </span>
            {showPhaseCounters && (
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                {phaseCounts[0]}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('phase2')}
            className={navClass('phase2')}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <CalendarDays className="w-4 h-4 text-[#059669] dark:text-[#2CE59B] shrink-0" aria-hidden="true" />
              <span className="truncate">2. Planner &amp; Kalender</span>
            </span>
            {showPhaseCounters && (
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                {phaseCounts[1]}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('phase3')}
            className={navClass('phase3')}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <Clapperboard className="w-4 h-4 text-[#C2410C] dark:text-[#FF8A47] shrink-0" aria-hidden="true" />
              <span className="truncate">3. Produksi &amp; QC</span>
            </span>
            {showPhaseCounters && (
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                {phaseCounts[2]}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('phase4')}
            className={navClass('phase4')}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <Radio className="w-4 h-4 text-[#0369A1] dark:text-[#38BDF8] shrink-0" aria-hidden="true" />
              <span className="truncate">4. Distribusi &amp; Monitor</span>
            </span>
            {showPhaseCounters && (
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                {phaseCounts[3]}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('phase5')}
            className={navClass('phase5')}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <BarChart3 className="w-4 h-4 text-[#047857] dark:text-[#34D399] shrink-0" aria-hidden="true" />
              <span className="truncate">5. Evaluasi &amp; Krisis</span>
            </span>
            {showPhaseCounters && (
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                {phaseCounts[4]}
              </span>
            )}
          </button>

          <div className="px-3 pt-4 pb-1.5 text-[11px] font-semibold tracking-wide text-slate-500/85 dark:text-slate-400">
            Manajemen &amp; Repositori
          </div>

          <button
            type="button"
            onClick={() => onNavigate('crew')}
            className={navClass('crew')}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <Users className="w-4 h-4 text-[#059669] dark:text-[#2CE59B] shrink-0" aria-hidden="true" />
              <span className="truncate">Anggota Kru</span>
            </span>
            {showPhaseCounters && (
              <span
                title={`${onlineCrewCount} anggota online`}
                className="inline-flex items-center gap-1 text-[11px] font-mono tabular-nums text-emerald-700 dark:text-emerald-400 shrink-0"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                {onlineCrewCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('campaigns')}
            className={navClass('campaigns')}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <Briefcase className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8] shrink-0" aria-hidden="true" />
              <span className="truncate">Kampanye &amp; Tim Kru</span>
            </span>
            {showPhaseCounters && (
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                {db.campaigns.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('assets')}
            className={navClass('assets')}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <FolderKanban className="w-4 h-4 text-[#059669] dark:text-[#2CE59B] shrink-0" aria-hidden="true" />
              <span className="truncate">Aset Digital (DAM)</span>
            </span>
            {showPhaseCounters && (
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                {db.assets.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('archive')}
            className={navClass('archive')}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <Archive className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" aria-hidden="true" />
              <span className="truncate">Arsip Pembelajaran</span>
            </span>
            {showPhaseCounters && (
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                {db.archives.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className={navClass('settings')}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <Settings className="w-4 h-4 text-[#0284C7] dark:text-[#2CE59B] shrink-0" aria-hidden="true" />
              <span className="truncate">Pengaturan &amp; About</span>
            </span>
          </button>
        </nav>

        {session && (
          <div className="mx-3 mb-2 p-3 rounded-2xl glass-subtle space-y-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <UserAvatar
                user={
                  selfAvatar || {
                    name: session.name,
                    email: session.email,
                    isOnline: true,
                    lastSeenMs: nowMs,
                  }
                }
                size="sm"
                showStatus
                nowMs={nowMs}
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {selfAvatar?.name || session.name}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {session.role}
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-mono font-semibold text-[#0284C7] dark:text-[#2CE59B] truncate">
                {session.workspaceId}
              </span>
              <span className="font-mono tabular-nums shrink-0">{lastSavedTime}</span>
            </div>
          </div>
        )}

        <div className="p-3 border-t border-white/60 dark:border-white/10 space-y-2 shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onExportCSV}
              className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-2xl text-[11px] font-semibold glass-subtle text-slate-700 hover:bg-white/85 dark:text-slate-200 dark:hover:bg-white/10 hover:-translate-y-0.5 transition-all whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0 text-[#059669] dark:text-[#2CE59B]" aria-hidden="true" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={onExportJSON}
              className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-2xl text-[11px] font-semibold glass-subtle text-slate-700 hover:bg-white/85 dark:text-slate-200 dark:hover:bg-white/10 hover:-translate-y-0.5 transition-all whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 shrink-0 text-[#0284C7] dark:text-[#38BDF8]" aria-hidden="true" />
              Backup JSON
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onOpenLanding}
              className="flex items-center justify-center gap-1 px-2 py-2 rounded-2xl text-[11px] font-semibold glass-subtle text-slate-700 dark:text-slate-300 hover:bg-white/85 dark:hover:bg-white/10 hover:-translate-y-0.5 transition-all whitespace-nowrap"
            >
              <Globe className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
              Halaman Depan
            </button>
            <button
              type="button"
              onClick={onRequestLogout}
              className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-2xl text-[11px] font-semibold bg-rose-500/10 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 hover:bg-rose-500/18 dark:hover:bg-rose-500/25 border border-rose-300/60 dark:border-rose-500/25 hover:-translate-y-0.5 transition-all whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              Keluar
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
