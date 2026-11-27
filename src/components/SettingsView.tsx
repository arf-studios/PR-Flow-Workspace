import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  HardDriveDownload,
  RotateCcw,
  Send,
  Upload,
  Webhook,
} from 'lucide-react';
import type { IntegrationSettings } from '../types/prflow';

interface SettingsViewProps {
  integrations: IntegrationSettings;
  onSaveIntegrations: (patch: Partial<IntegrationSettings>) => void;
  onTestWebhook: () => Promise<void>;
  onExportJSON: () => void;
  onImportJSONText: (text: string) => void;
  onExportCSV: () => void;
  onConfirmResetSeed: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  integrations,
  onSaveIntegrations,
  onTestWebhook,
  onExportJSON,
  onImportJSONText,
  onExportCSV,
  onConfirmResetSeed,
}) => {
  const [gdriveRootUrl, setGdriveRootUrl] = useState(integrations.gdriveRootUrl);
  const [webhookUrl, setWebhookUrl] = useState(integrations.webhookUrl);
  const [webhookAutoTrigger, setWebhookAutoTrigger] = useState(integrations.webhookAutoTrigger);
  const [testing, setTesting] = useState(false);

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

  return (
    <div className="space-y-6 animate-view">
      <div>
        <div className="text-xs font-semibold text-violet-600 dark:text-violet-400">
          Ekosistem &amp; Backup Database
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
          Integrasi Workspace, Webhook &amp; Backup JSON
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Atur tautan Google Drive agensi, webhook notifikasi (Slack, Discord, n8n), serta ekspor atau pulihkan database workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Integration Form */}
        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
        >
          <h2 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Webhook className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            Google Drive &amp; Webhook Notifikasi
          </h2>

          <div>
            <label
              htmlFor="cfg-gdrive-url"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              URL Root Folder Google Drive Agensi
            </label>
            <input
              id="cfg-gdrive-url"
              type="url"
              value={gdriveRootUrl}
              onChange={(e) => setGdriveRootUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="cfg-webhook-url"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              URL Webhook Otomatis (Slack / Discord / n8n / Make)
            </label>
            <input
              id="cfg-webhook-url"
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
            />
          </div>

          <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={webhookAutoTrigger}
              onChange={(e) => setWebhookAutoTrigger(e.target.checked)}
              className="w-4 h-4 accent-indigo-600 rounded"
            />
            Kirim webhook otomatis setiap ada notifikasi revisi atau publikasi
          </label>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
            >
              Simpan Konfigurasi
            </button>
            <button
              type="button"
              disabled={testing}
              onClick={handleTest}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold transition-colors disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
              {testing ? 'Mengirim...' : 'Uji Kirim Webhook'}
            </button>
          </div>
        </form>

        {/* Backup & Restore Card */}
        <section className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <h2 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <HardDriveDownload
                className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
              Backup &amp; Restore Database (JSON / CSV)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Ekspor seluruh database relasional (Pengguna, Kampanye, Konten 5 Fase, Aset Digital, Arsip, dan Log) sebagai file JSON untuk dipindahkan antar perangkat atau disimpan sebagai arsip agensi.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onExportJSON}
                className="p-4 rounded-lg border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-left transition-colors"
              >
                <div className="font-semibold text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                  <Download className="w-4 h-4" aria-hidden="true" />
                  Export Backup JSON
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Unduh snapshot database utuh
                </div>
              </button>

              <label className="p-4 rounded-lg border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-left transition-colors cursor-pointer">
                <div className="font-semibold text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
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
              className="w-full py-2.5 px-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              Export Laporan Tabel Konten ke CSV (Google Sheets)
            </button>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onConfirmResetSeed}
              className="w-full py-2.5 px-4 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Kosongkan Workspace (Reset Fresh)
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
