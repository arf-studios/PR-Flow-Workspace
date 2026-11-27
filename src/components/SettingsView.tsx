import React, { useState } from 'react';
import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  Code2,
  Download,
  EyeOff,
  FileSpreadsheet,
  HardDriveDownload,
  Info,
  Layers,
  LayoutGrid,
  Moon,
  PlugZap,
  RotateCcw,
  Send,
  Sliders,
  Sparkles,
  Sun,
  Upload,
  UserCheck,
  Webhook,
} from 'lucide-react';
import {
  APP_ABOUT_INFO,
  START_VIEW_OPTIONS,
  countCustomizedWorkspacePreferences,
  type WorkspacePreferences,
  type WorkspaceStartView,
} from '../lib/workspaceSettings';
import type { AgencySession, IntegrationSettings } from '../types/prflow';

type SettingsTab = 'preferences' | 'integrations' | 'about';

interface SettingsViewProps {
  session: AgencySession | null;
  isDark: boolean;
  preferences: WorkspacePreferences;
  integrations: IntegrationSettings;
  stats: {
    campaigns: number;
    users: number;
    contents: number;
    assets: number;
  };
  onSetTheme: (dark: boolean) => void;
  onUpdatePreferences: (patch: Partial<WorkspacePreferences>) => void;
  onResetPreferences: () => void;
  onSaveIntegrations: (patch: Partial<IntegrationSettings>) => void;
  onTestWebhook: () => Promise<void>;
  onExportJSON: () => void;
  onImportJSONText: (text: string) => void;
  onExportCSV: () => void;
  onConfirmResetSeed: () => void;
}

interface SettingToggleRowProps {
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
}

const SettingToggleRow: React.FC<SettingToggleRowProps> = ({
  title,
  description,
  checked,
  onToggle,
  icon,
}) => (
  <div className="flex items-start justify-between gap-4 p-3.5 rounded-2xl glass-subtle">
    <div className="flex items-start gap-3 min-w-0">
      <div className="w-9 h-9 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-white/80 dark:border-white/10 flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
          {title}
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
          {description}
        </p>
      </div>
    </div>

    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={title}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17B5E8] ${
        checked
          ? 'bg-gradient-to-r from-[#0284C7] to-[#0EA5A4]'
          : 'bg-slate-300/90 dark:bg-slate-700'
      }`}
    >
      <span
        className={`inline-block h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-5.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  </div>
);

export const SettingsView: React.FC<SettingsViewProps> = ({
  session,
  isDark,
  preferences,
  integrations,
  stats,
  onSetTheme,
  onUpdatePreferences,
  onResetPreferences,
  onSaveIntegrations,
  onTestWebhook,
  onExportJSON,
  onImportJSONText,
  onExportCSV,
  onConfirmResetSeed,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('preferences');
  const [gdriveRootUrl, setGdriveRootUrl] = useState(integrations.gdriveRootUrl);
  const [webhookUrl, setWebhookUrl] = useState(integrations.webhookUrl);
  const [webhookAutoTrigger, setWebhookAutoTrigger] = useState(integrations.webhookAutoTrigger);
  const [testing, setTesting] = useState(false);

  const customizedCount = countCustomizedWorkspacePreferences(preferences);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveIntegrations({
      gdriveRootUrl: gdriveRootUrl.trim() || 'https://drive.google.com/drive/my-drive',
      webhookUrl: webhookUrl.trim(),
      webhookAutoTrigger,
    });
  };

  const handleTest = async () => {
    onSaveIntegrations({
      gdriveRootUrl: gdriveRootUrl.trim() || 'https://drive.google.com/drive/my-drive',
      webhookUrl: webhookUrl.trim(),
      webhookAutoTrigger,
    });
    setTesting(true);
    try {
      await onTestWebhook();
    } finally {
      setTesting(false);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = typeof ev.target?.result === 'string' ? ev.target.result : '';
      onImportJSONText(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
    {
      id: 'preferences',
      label: 'Preferensi & Tampilan',
      icon: <Sliders className="w-4 h-4 shrink-0" aria-hidden="true" />,
    },
    {
      id: 'integrations',
      label: 'Integrasi & Backup',
      icon: <PlugZap className="w-4 h-4 shrink-0" aria-hidden="true" />,
    },
    {
      id: 'about',
      label: 'About',
      icon: <Info className="w-4 h-4 shrink-0" aria-hidden="true" />,
    },
  ];

  return (
    <div className="space-y-6 animate-view">
      {/* Header + Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#0284C7] dark:text-[#2CE59B]">
            Konfigurasi Workspace &amp; Informasi Aplikasi
          </div>
          <h1 className="font-display text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
            Pengaturan Workspace
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Sesuaikan tampilan, alur kerja, integrasi, backup data, serta lihat informasi versi aplikasi yang digunakan.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Kategori pengaturan workspace"
          className="inline-flex flex-wrap items-center gap-1 p-1.5 rounded-2xl glass-subtle self-start md:self-auto"
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17B5E8] ${
                  active
                    ? 'bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] text-white shadow-sm shadow-[#17B5E8]/25'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: PREFERENSI & TAMPILAN */}
      {activeTab === 'preferences' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-view">
          {/* Card 1: Tampilan & Kenyamanan Visual */}
          <section className="p-6 rounded-[28px] glass-card space-y-5">
            <div>
              <h2 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8]" aria-hidden="true" />
                Tampilan &amp; Kenyamanan Visual
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Atur tema, kerapatan tata letak, dan detail visual ruang kerja sesuai preferensi Anda.
              </p>
            </div>

            {/* Theme Selector */}
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                Mode Tema Workspace
              </span>
              <div
                role="group"
                aria-label="Mode tema workspace"
                className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-900/[0.05] dark:bg-white/[0.06]"
              >
                <button
                  type="button"
                  aria-pressed={!isDark}
                  onClick={() => onSetTheme(false)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                    !isDark
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sun className="w-4 h-4 text-[#F37021]" aria-hidden="true" />
                  Mode Terang
                </button>
                <button
                  type="button"
                  aria-pressed={isDark}
                  onClick={() => onSetTheme(true)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                    isDark
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Moon className="w-4 h-4 text-[#17B5E8]" aria-hidden="true" />
                  Mode Gelap
                </button>
              </div>
            </div>

            {/* Density Selector */}
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                Kerapatan Tata Letak (Layout Density)
              </span>
              <div
                role="group"
                aria-label="Kerapatan tata letak workspace"
                className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-900/[0.05] dark:bg-white/[0.06]"
              >
                <button
                  type="button"
                  aria-pressed={preferences.density === 'comfortable'}
                  onClick={() => onUpdatePreferences({ density: 'comfortable' })}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                    preferences.density === 'comfortable'
                      ? 'bg-white dark:bg-slate-800 text-[#0284C7] dark:text-[#2CE59B] shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Nyaman (Standar)
                </button>
                <button
                  type="button"
                  aria-pressed={preferences.density === 'compact'}
                  onClick={() => onUpdatePreferences({ density: 'compact' })}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                    preferences.density === 'compact'
                      ? 'bg-white dark:bg-slate-800 text-[#0284C7] dark:text-[#2CE59B] shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Ringkas (Padat Data)
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <SettingToggleRow
                title="Efek Cahaya Latar Glassmorphism"
                description="Tampilkan gradasi warna halus di latar belakang workspace. Matikan untuk tampilan lebih tenang."
                checked={preferences.ambientBlobs}
                onToggle={() => onUpdatePreferences({ ambientBlobs: !preferences.ambientBlobs })}
                icon={<Sparkles className="w-4 h-4 text-[#17B5E8]" aria-hidden="true" />}
              />
              <SettingToggleRow
                title="Tampilkan Angka Counter di Sidebar"
                description="Perlihatkan jumlah item aktif di samping setiap fase alur kerja dan repositori."
                checked={preferences.showPhaseCounters}
                onToggle={() =>
                  onUpdatePreferences({ showPhaseCounters: !preferences.showPhaseCounters })
                }
                icon={<Layers className="w-4 h-4 text-[#059669] dark:text-[#2CE59B]" aria-hidden="true" />}
              />
            </div>
          </section>

          {/* Card 2: Alur Kerja, Beranda & Notifikasi */}
          <section className="p-6 rounded-[28px] glass-card flex flex-col justify-between gap-5">
            <div className="space-y-5">
              <div>
                <h2 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#059669] dark:text-[#2CE59B]" aria-hidden="true" />
                  Alur Kerja &amp; Notifikasi
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Tentukan modul awal saat login, panduan setup, deteksi konflik jadwal, dan preferensi notifikasi.
                </p>
              </div>

              <div>
                <label
                  htmlFor="cfg-default-view"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                >
                  Halaman Awal Saat Masuk Workspace
                </label>
                <select
                  id="cfg-default-view"
                  value={preferences.defaultView}
                  onChange={(e) =>
                    onUpdatePreferences({
                      defaultView: e.target.value as WorkspaceStartView,
                    })
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-2xl glass-input text-slate-900 dark:text-white outline-none cursor-pointer"
                >
                  {START_VIEW_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <SettingToggleRow
                  title="Panduan Setup Workspace Fresh"
                  description="Tampilkan kartu langkah awal 3 tahap di Dashboard selama data tim/kampanye masih kosong."
                  checked={preferences.showOnboardingGuide}
                  onToggle={() =>
                    onUpdatePreferences({
                      showOnboardingGuide: !preferences.showOnboardingGuide,
                    })
                  }
                  icon={<CheckCircle2 className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8]" aria-hidden="true" />}
                />
                <SettingToggleRow
                  title="Peringatan Bentrok Jadwal Kru Otomatis"
                  description="Soroti peringatan bentrok jadwal kru secara langsung pada ringkasan Dashboard."
                  checked={preferences.autoConflictAlerts}
                  onToggle={() =>
                    onUpdatePreferences({
                      autoConflictAlerts: !preferences.autoConflictAlerts,
                    })
                  }
                  icon={<CalendarClock className="w-4 h-4 text-[#C2410C] dark:text-[#FF8A47]" aria-hidden="true" />}
                />
                <SettingToggleRow
                  title="Notifikasi Toast Pop-up"
                  description="Munculkan pesan konfirmasi singkat di pojok layar setiap kali data disimpan atau diperbarui."
                  checked={preferences.toastNotifications}
                  onToggle={() =>
                    onUpdatePreferences({
                      toastNotifications: !preferences.toastNotifications,
                    })
                  }
                  icon={<BellRing className="w-4 h-4 text-[#059669] dark:text-[#2CE59B]" aria-hidden="true" />}
                />
                <SettingToggleRow
                  title="Sembunyikan Status Online Saya (Mode Privasi)"
                  description="Tampilkan status Anda sebagai Offline di avatar dan daftar Anggota Kru meskipun Anda sedang aktif bekerja."
                  checked={preferences.hideOnlineStatus}
                  onToggle={() =>
                    onUpdatePreferences({
                      hideOnlineStatus: !preferences.hideOnlineStatus,
                    })
                  }
                  icon={<EyeOff className="w-4 h-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-900/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Perubahan tersimpan otomatis di perangkat ini
                {customizedCount > 0 ? ` · ${customizedCount} penyesuaian aktif` : ''}.
              </span>
              <button
                type="button"
                disabled={customizedCount === 0}
                onClick={onResetPreferences}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl glass-subtle hover:bg-white/90 dark:hover:bg-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Reset Default
              </button>
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: INTEGRASI & BACKUP */}
      {activeTab === 'integrations' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-view">
          {/* Integration Form */}
          <form onSubmit={handleSubmit} className="p-6 rounded-[28px] glass-card space-y-4">
            <h2 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Webhook className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8]" aria-hidden="true" />
              Google Drive &amp; Webhook Notifikasi
            </h2>

            <div>
              <label
                htmlFor="cfg-gdrive-url"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
              >
                URL Root Folder Google Drive Agensi
              </label>
              <input
                id="cfg-gdrive-url"
                type="url"
                value={gdriveRootUrl}
                onChange={(e) => setGdriveRootUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="w-full px-3.5 py-2.5 text-sm rounded-2xl glass-input text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="cfg-webhook-url"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
              >
                URL Webhook Otomatis (Slack / Discord / n8n / Make)
              </label>
              <input
                id="cfg-webhook-url"
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full px-3.5 py-2.5 text-sm rounded-2xl glass-input text-slate-900 dark:text-white outline-none"
              />
            </div>

            <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={webhookAutoTrigger}
                onChange={(e) => setWebhookAutoTrigger(e.target.checked)}
                className="w-4 h-4 accent-[#17B5E8] rounded"
              />
              Kirim webhook otomatis setiap ada notifikasi revisi atau publikasi
            </label>

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] hover:brightness-105 text-white text-xs font-semibold shadow-md shadow-[#17B5E8]/25 transition-all whitespace-nowrap"
              >
                Simpan Konfigurasi
              </button>
              <button
                type="button"
                disabled={testing}
                onClick={handleTest}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full glass-subtle text-slate-700 dark:text-slate-200 hover:bg-white/90 dark:hover:bg-white/10 text-xs font-semibold transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
                {testing ? 'Mengirim...' : 'Uji Kirim Webhook'}
              </button>
            </div>
          </form>

          {/* Backup & Restore Card */}
          <section className="p-6 rounded-[28px] glass-card flex flex-col justify-between gap-5">
            <div className="space-y-4">
              <h2 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <HardDriveDownload
                  className="w-4 h-4 text-[#059669] dark:text-[#2CE59B]"
                  aria-hidden="true"
                />
                Backup &amp; Restore Database (JSON / CSV)
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Ekspor seluruh database relasional (Pengguna, Kampanye, Konten 5 Fase, Aset Digital, Arsip, dan Log) sebagai file JSON untuk dipindahkan antar perangkat atau disimpan sebagai arsip agensi.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={onExportJSON}
                  className="p-4 rounded-2xl glass-subtle hover:border-[#17B5E8]/50 hover:-translate-y-0.5 text-left transition-all"
                >
                  <div className="font-semibold text-xs text-[#0284C7] dark:text-[#38BDF8] flex items-center gap-1.5">
                    <Download className="w-4 h-4" aria-hidden="true" />
                    Export Backup JSON
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Unduh snapshot database utuh
                  </div>
                </button>

                <label className="p-4 rounded-2xl glass-subtle hover:border-[#2CE59B]/50 hover:-translate-y-0.5 text-left transition-all cursor-pointer">
                  <div className="font-semibold text-xs text-[#059669] dark:text-[#2CE59B] flex items-center gap-1.5">
                    <Upload className="w-4 h-4" aria-hidden="true" />
                    Import Restore JSON
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Pulihkan dari file backup .json
                  </div>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileImport}
                    className="hidden"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={onExportCSV}
                className="w-full py-2.5 px-4 rounded-2xl glass-subtle hover:border-[#2CE59B]/50 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#059669] dark:text-[#2CE59B]" aria-hidden="true" />
                Export Laporan Tabel Konten ke CSV (Google Sheets)
              </button>
            </div>

            <div className="pt-4 border-t border-slate-900/10 dark:border-white/10">
              <button
                type="button"
                onClick={onConfirmResetSeed}
                className="w-full py-2.5 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/18 text-rose-700 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 dark:text-rose-300 border border-rose-300/60 dark:border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Kosongkan Workspace (Reset Fresh)
              </button>
            </div>
          </section>
        </div>
      )}

      {/* TAB 3: ABOUT */}
      {activeTab === 'about' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-view">
          {/* Primary Identity & Version Overview */}
          <section className="lg:col-span-7 p-6 sm:p-7 rounded-[28px] glass-card space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#0284C7] via-[#17B5E8] to-[#2CE59B] text-white flex items-center justify-center shrink-0 shadow-lg shadow-[#17B5E8]/25">
                <Layers className="w-6 h-6" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#0284C7] dark:text-[#2CE59B]">
                  {APP_ABOUT_INFO.versionLabel} · {APP_ABOUT_INFO.buildYear}
                </div>
                <h2 className="font-display font-extrabold text-xl sm:text-2xl tracking-tight text-slate-900 dark:text-white mt-0.5">
                  {APP_ABOUT_INFO.appName}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Dikembangkan oleh <strong className="text-slate-800 dark:text-slate-100">{APP_ABOUT_INFO.developer}</strong> · Dibuat dengan {APP_ABOUT_INFO.builtWith}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {APP_ABOUT_INFO.summary}
            </p>

            <div className="p-4 rounded-2xl glass-subtle space-y-1.5">
              <div className="text-xs font-semibold text-slate-900 dark:text-white">
                Catatan Rilis {APP_ABOUT_INFO.versionLabel}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {APP_ABOUT_INFO.releaseNote}
              </p>
            </div>

            {/* Active Workspace Footprint */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl glass-subtle">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Kampanye
                </div>
                <div className="font-display text-xl font-bold tabular-nums text-slate-900 dark:text-white mt-0.5">
                  {stats.campaigns}
                </div>
              </div>
              <div className="p-3.5 rounded-2xl glass-subtle">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Tim &amp; Kru
                </div>
                <div className="font-display text-xl font-bold tabular-nums text-slate-900 dark:text-white mt-0.5">
                  {stats.users}
                </div>
              </div>
              <div className="p-3.5 rounded-2xl glass-subtle">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Konten PR
                </div>
                <div className="font-display text-xl font-bold tabular-nums text-slate-900 dark:text-white mt-0.5">
                  {stats.contents}
                </div>
              </div>
              <div className="p-3.5 rounded-2xl glass-subtle">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Aset DAM
                </div>
                <div className="font-display text-xl font-bold tabular-nums text-slate-900 dark:text-white mt-0.5">
                  {stats.assets}
                </div>
              </div>
            </div>
          </section>

          {/* Specification & Developer Card */}
          <section className="lg:col-span-5 p-6 sm:p-7 rounded-[28px] glass-card flex flex-col justify-between gap-5">
            <div className="space-y-4">
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[#0284C7] dark:text-[#2CE59B]" aria-hidden="true" />
                Detail Versi &amp; Pengembang
              </h3>

              <dl className="divide-y divide-slate-900/10 dark:divide-white/10 text-xs">
                <div className="py-3 flex items-center justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400">Versi Web</dt>
                  <dd className="font-semibold font-mono tabular-nums text-slate-900 dark:text-white text-right">
                    {APP_ABOUT_INFO.version} ({APP_ABOUT_INFO.releaseStage})
                  </dd>
                </div>
                <div className="py-3 flex items-center justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400">Pengembang</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white text-right">
                    {APP_ABOUT_INFO.developer}
                  </dd>
                </div>
                <div className="py-3 flex items-center justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400">Dibuat Dengan</dt>
                  <dd className="font-semibold text-[#0284C7] dark:text-[#2CE59B] text-right">
                    {APP_ABOUT_INFO.builtWith}
                  </dd>
                </div>
                <div className="py-3 flex items-center justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400">Teknologi Inti</dt>
                  <dd className="font-medium text-slate-800 dark:text-slate-200 text-right">
                    {APP_ABOUT_INFO.techStack}
                  </dd>
                </div>
                <div className="py-3 flex items-center justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400">Penyimpanan</dt>
                  <dd className="font-medium text-slate-800 dark:text-slate-200 text-right">
                    {APP_ABOUT_INFO.storageMode}
                  </dd>
                </div>
              </dl>
            </div>

            {session && (
              <div className="p-4 rounded-2xl glass-subtle flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#17B5E8]/15 dark:bg-[#2CE59B]/15 text-[#0284C7] dark:text-[#2CE59B] flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    Sesi Aktif: {session.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {session.role} ·{' '}
                    <span className="font-mono font-semibold text-[#0284C7] dark:text-[#2CE59B]">
                      {session.workspaceId}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
