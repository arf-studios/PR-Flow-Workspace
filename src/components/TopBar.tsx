import React, { useEffect, useRef } from 'react';
import { Bell, Menu, Moon, Plus, Search, Settings, Sun } from 'lucide-react';
import type { Campaign, NotificationItem } from '../types/prflow';
import { UserAvatar, type AvatarUserInfo } from './UserAvatar';

interface TopBarProps {
  searchQuery: string;
  campaignFilter: string;
  campaigns: Campaign[];
  totalContentCount: number;
  notifications: NotificationItem[];
  notifOpen: boolean;
  isDark: boolean;
  selfAvatar?: AvatarUserInfo | null;
  nowMs?: number;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onSearchChange: (value: string) => void;
  onCampaignFilterChange: (campaignId: string) => void;
  onToggleNotif: () => void;
  onCloseNotif: () => void;
  onMarkAllRead: () => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  isSettingsActive?: boolean;
  onOpenCrew?: () => void;
  onOpenNewContent: () => void;
  onOpenMobileSidebar: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  searchQuery,
  campaignFilter,
  campaigns,
  totalContentCount,
  notifications,
  notifOpen,
  isDark,
  selfAvatar = null,
  nowMs,
  searchInputRef,
  onSearchChange,
  onCampaignFilterChange,
  onToggleNotif,
  onCloseNotif,
  onMarkAllRead,
  onToggleTheme,
  onOpenSettings,
  isSettingsActive = false,
  onOpenCrew,
  onOpenNewContent,
  onOpenMobileSidebar,
}) => {
  const notifContainerRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!notifOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (notifContainerRef.current && !notifContainerRef.current.contains(e.target as Node)) {
        onCloseNotif();
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [notifOpen, onCloseNotif]);

  return (
    <header className="h-16 glass-nav px-4 lg:px-6 flex items-center justify-between gap-3 shrink-0 z-30">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="Buka menu navigasi"
          className="lg:hidden p-2 rounded-2xl glass-subtle text-slate-600 dark:text-slate-300 hover:bg-white/85 dark:hover:bg-white/10 transition-colors"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="relative flex-1 max-w-md">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <label htmlFor="global-search-input" className="sr-only">
            Cari konten, kampanye, kru, atau aset
          </label>
          <input
            id="global-search-input"
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari konten, kampanye, kru, aset..."
            className="w-full pl-10 pr-3 sm:pr-12 py-2 text-sm glass-input text-slate-900 dark:text-slate-100 rounded-2xl outline-none placeholder:text-slate-400"
          />
          <kbd className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-lg">
            ⌘K
          </kbd>
        </div>

        <div className="hidden md:block">
          <label htmlFor="campaign-filter-select" className="sr-only">
            Filter berdasarkan kampanye
          </label>
          <select
            id="campaign-filter-select"
            value={campaignFilter}
            onChange={(e) => onCampaignFilterChange(e.target.value)}
            className="text-sm glass-input rounded-2xl px-3.5 py-2 outline-none cursor-pointer text-slate-700 dark:text-slate-200 max-w-[230px]"
          >
            <option value="ALL">Semua Kampanye ({totalContentCount})</option>
            {campaigns.map((cmp) => (
              <option key={cmp.id} value={cmp.id}>
                {cmp.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="relative" ref={notifContainerRef}>
          <button
            type="button"
            onClick={onToggleNotif}
            aria-label={`Notifikasi (${unreadCount} belum dibaca)`}
            aria-expanded={notifOpen}
            className="relative p-2.5 rounded-2xl glass-subtle text-slate-600 dark:text-slate-300 hover:bg-white/85 dark:hover:bg-white/10 hover:-translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17B5E8]"
          >
            <Bell className="w-4 h-4" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-gradient-to-r from-[#F37021] to-rose-500 text-white text-[10px] font-mono font-bold flex items-center justify-center shadow-sm">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2.5 w-80 sm:w-96 glass-panel rounded-3xl z-50 overflow-hidden">
              <div className="px-4 py-3.5 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between">
                <span className="font-display font-bold text-sm text-slate-900 dark:text-white">
                  Notifikasi &amp; Log Aktivitas
                </span>
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="text-xs text-[#0284C7] dark:text-[#2CE59B] hover:underline font-semibold"
                >
                  Tandai dibaca
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-200/60 dark:divide-white/10">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Belum ada notifikasi aktivitas.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3.5 text-xs ${
                        n.read ? 'opacity-70' : 'bg-[#17B5E8]/[0.07] dark:bg-[#2CE59B]/[0.07]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-slate-900 dark:text-white">{n.title}</strong>
                        <span className="text-[11px] font-mono text-slate-400 shrink-0">
                          {n.time}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
          className="p-2.5 rounded-2xl glass-subtle text-slate-600 dark:text-slate-300 hover:bg-white/85 dark:hover:bg-white/10 hover:-translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17B5E8]"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-[#F37021]" aria-hidden="true" />
          ) : (
            <Moon className="w-4 h-4 text-[#0284C7]" aria-hidden="true" />
          )}
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Buka pengaturan workspace"
          aria-current={isSettingsActive ? 'page' : undefined}
          title="Pengaturan & About"
          className={`p-2.5 rounded-2xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17B5E8] ${
            isSettingsActive
              ? 'bg-[#17B5E8]/15 dark:bg-[#2CE59B]/15 text-[#0284C7] dark:text-[#2CE59B] border border-[#17B5E8]/40 dark:border-[#2CE59B]/35'
              : 'glass-subtle text-slate-600 dark:text-slate-300 hover:bg-white/85 dark:hover:bg-white/10 hover:-translate-y-0.5'
          }`}
        >
          <Settings className="w-4 h-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onOpenNewContent}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] hover:brightness-105 text-white text-sm font-semibold shadow-lg shadow-[#17B5E8]/25 hover:-translate-y-0.5 transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17B5E8] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Konten Baru</span>
        </button>

        {selfAvatar && (
          <button
            type="button"
            onClick={onOpenCrew}
            aria-label={`Status profil ${selfAvatar.name}: ${selfAvatar.isOnline ? 'Online' : 'Offline'}. Buka Anggota Kru`}
            title={`${selfAvatar.name} (${selfAvatar.isOnline ? 'Online' : 'Offline'}) — Klik untuk buka Anggota Kru`}
            className="p-0.5 rounded-full hover:scale-105 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17B5E8] shrink-0"
          >
            <UserAvatar user={selfAvatar} size="sm" showStatus nowMs={nowMs} />
          </button>
        )}
      </div>
    </header>
  );
};
