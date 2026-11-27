import React from 'react';
import { ExternalLink, FileText, Folder, Trash2, UploadCloud } from 'lucide-react';
import { formatDateID } from '../lib/prflowLogic';
import type { PhaseNumber, PRFlowDatabase } from '../types/prflow';
import { DRIVE_FOLDERS } from '../types/prflow';

interface AssetsViewProps {
  db: PRFlowDatabase;
  searchQuery: string;
  onOpenAssetModal: (contentId?: string) => void;
  onOpenDrawer: (contentId: string, phase: PhaseNumber) => void;
  onDeleteAsset: (assetId: string) => void;
}

export const AssetsView: React.FC<AssetsViewProps> = ({
  db,
  searchQuery,
  onOpenAssetModal,
  onOpenDrawer,
  onDeleteAsset,
}) => {
  const q = searchQuery.toLowerCase().trim();
  const contentMap = new Map(db.contents.map((c) => [c.id, c]));
  const userMap = new Map(db.users.map((u) => [u.id, u]));

  const filteredAssets = db.assets.filter((asset) => {
    if (!q) return true;
    const cnt = contentMap.get(asset.contentId);
    return [asset.name, asset.folder, asset.type, cnt?.title || '']
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  const driveRoot = db.integrations.gdriveRootUrl || 'https://drive.google.com';

  return (
    <div className="space-y-6 animate-view">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            Digital Asset Management (DAM)
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
            Repositori Aset Digital &amp; Google Drive
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Seluruh file brief, raw footage, dan aset final yang tertaut langsung ke konten PR Anda.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenAssetModal()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors whitespace-nowrap self-start"
        >
          <UploadCloud className="w-4 h-4" aria-hidden="true" />
          Tambah Tautan Aset
        </button>
      </div>

      {/* Folder Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {DRIVE_FOLDERS.map((folder) => {
          const count = db.assets.filter((a) => a.folder === folder).length;
          return (
            <div
              key={folder}
              className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Folder className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="font-mono text-xs font-bold text-slate-900 dark:text-white truncate">
                    {folder}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {count} file tersimpan
                  </div>
                </div>
              </div>
              <a
                href={driveRoot}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap shrink-0"
              >
                Buka Drive
              </a>
            </div>
          );
        })}
      </div>

      {/* Assets Table */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/60 text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <th className="px-5 py-3">Nama File &amp; Versi</th>
                <th className="px-4 py-3">Folder Drive</th>
                <th className="px-4 py-3">Terkait Konten PR</th>
                <th className="px-4 py-3">Diunggah Oleh</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800 text-sm">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500">
                    Belum ada aset digital yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => {
                  const cnt = contentMap.get(asset.contentId);
                  const uploader = userMap.get(asset.uploadedBy);

                  return (
                    <tr
                      key={asset.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <FileText
                            className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0"
                            aria-hidden="true"
                          />
                          <span>{asset.name}</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
                          {asset.type} · {asset.version} · {formatDateID(asset.createdAt)}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-xs text-blue-700 dark:text-blue-300 whitespace-nowrap">
                        {asset.folder}
                      </td>

                      <td className="px-4 py-3.5 text-xs">
                        {cnt ? (
                          <button
                            type="button"
                            onClick={() => onOpenDrawer(cnt.id, 2)}
                            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline text-left"
                          >
                            {cnt.title}
                          </button>
                        ) : (
                          <span className="text-slate-400">Umum</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {uploader?.name || 'Tim PR'}
                      </td>

                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <a
                            href={asset.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-indigo-600 hover:text-white text-xs font-semibold transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" aria-hidden="true" />
                            Buka
                          </a>
                          <button
                            type="button"
                            onClick={() => onDeleteAsset(asset.id)}
                            aria-label={`Hapus aset ${asset.name}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
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
